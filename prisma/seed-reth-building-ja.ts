import { PrismaClient } from '@prisma/client';

export async function seedRethBuildingJA(prisma: PrismaClient) {
  const tags = ['reth', 'revm', 'alloy', 'rust', 'mev', 'building', 'application', 'capstone'];

  await prisma.course.create({
    data: {
      slug: 'reth-building-ja',
      title: 'Building with the Stack — 実アプリを作る',
      description:
        'ソースを読むのは前提条件、このティアはその対価です。Rust + Alloy + Revm で動くアプリケーションを実装します。第1回は ~200行 の最小限 MEV searcher (mempool → fork-simulate → arb 検出 → bundle 構築) を完成させます。今後追加予定: indexer・カスタム RPC・wallet backend・EIP-7702 bundler。',
      difficulty: 'ADVANCED',
      duration: 60,
      xpReward: 100,
      track: 'reth-building',
      tags,
      isPublished: true,
      sortOrder: 500,
      locale: 'ja',
      instructorName: 'RethLab',
      modules: {
        create: [
          {
            title: 'アプリケーションパターン',
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: '最小限の MEV Searcher を Rust で作る',
                  slug: 'build-mev-searcher-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 45,
                  xpReward: 80,
                  content: `# 最小限の MEV Searcher を Rust で作る

\`add\` を読み、\`Stage\` トレイトを読み、\`identity_run\` を読みました。次は何かを **作る** 番です。本レッスンでは、最小限の MEV searcher の **完全なコード** を walk through します — Rust ~200 行で、public mempool を監視 → 候補トランザクションを fork した Revm でシミュレート → 2-hop アービトラージ機会を検出 → Flashbots スタイルの bundle を構築するまで。

> 📌 **スコープの正直な開示。** 本レッスンは「bundle 構築」で止まります。実際に relay へ提出するには認証、ガスオークション、MEV-Boost 統合、そして ~~あなたのお金~~ 本物のリスク管理が必要 — それらは本質とは別のプロダクション複雑度です。本レッスンが答える問いは: *「自分のラップトップで、ネットワーク全体と同じタイミングで arb 機会を見られるか?」*

## 何を作るか

\`\`\`mermaid
flowchart LR
    Mempool["WS mempool subscribe"] -->|tx hash| Decode["Decode<br/>swapExactTokensForTokens"]
    Decode -->|valid swap| Fork["Revm fork<br/>at latest block"]
    Fork -->|apply tx| Sim["Simulate<br/>observe state delta"]
    Sim -->|new pool reserves| Detect["Detect 2-hop<br/>arb opportunity"]
    Detect -->|profitable| Bundle["Build bundle:<br/>frontrun + tx + backrun"]
\`\`\`

単一の \`main.rs\`。フレームワークなし。Alloy と Revm を直接呼ぶだけ。**起きていることのバイト単位を全部見える** ようにすることが目的です。

> 🛑 **スクロール前に予測。** なぜ provider に \`eth_call\` で問い合わせる代わりに、ローカルで fork してシミュレートするのか? *\`eth_call\` が返すもの vs. 自分が必要とするもの* について、一文で答えてください。答えを保持してから先へ。

## なぜ Rust + Alloy + Revm か

- **Rust** — 決定論的レイテンシ。GC pause なし。エッジが「このブロックに乗るか、次か」のマイクロ秒の差にかかっている時、これが効く。
- **Revm** — **RPC ラウンドトリップなしで** ローカルシミュレーション。Infura への \`eth_call\` は wire 越しに ~30〜80 ms。Revm をインメモリキャッシュで叩くと **~200 µs**。2 桁速い。(さらに \`eth_call\` は *結果のみ* 返す — Revm は **state delta** を返してくれる。アービ検出に必要なのはまさに後者)
- **Alloy** — \`sol!\` による型付きコントラクトバインディング、型付き Provider、手書き ABI エンコード不要。Solidity 一辺倒の開発者が払う配管税が消える。

Flashbots / Frontier / お気に入りのブロックビルダー全員が production で使っているのと同じスタックです。**おもちゃではなく、本番品質**を学んでいます。

## Cargo.toml

\`\`\`toml
[package]
name = "minimal-searcher"
version = "0.1.0"
edition = "2021"

[dependencies]
alloy-eips         = "1.0"
alloy-primitives   = "1.5"
alloy-provider     = { version = "1.0", features = ["ws"] }
alloy-rpc-types    = "1.0"
alloy-sol-types    = "1.5"
alloy-network      = "1.0"
alloy-signer       = "1.0"
alloy-signer-local = "1.0"
revm               = { version = "38", features = ["alloydb"] }
tokio              = { version = "1", features = ["rt-multi-thread", "macros", "sync"] }
futures            = "0.3"
eyre               = "0.6"
\`\`\`

> 2026年5月時点でピン留め。Alloy 1.x と Revm 38 が執筆時点での該当メジャー。両方とも変化が早いので、コピーしたら \`cargo update\` を実行し、breaking rename をリリースノートで確認すること。

## Step 1: mempool に subscribe

\`\`\`rust
use alloy_provider::{Provider, ProviderBuilder, WsConnect};
use futures::StreamExt;

#[tokio::main]
async fn main() -> eyre::Result<()> {
    let ws_url = std::env::var("ETH_WS_URL")?;
    let provider = ProviderBuilder::new()
        .connect_ws(WsConnect::new(ws_url))
        .await?;

    let mut sub = provider
        .subscribe_pending_transactions()
        .await?
        .into_stream();

    while let Some(tx_hash) = sub.next().await {
        let Some(tx) = provider.get_transaction_by_hash(tx_hash).await? else {
            continue;
        };
        // ... handle tx
    }
    Ok(())
}
\`\`\`

Walk:

- \`WsConnect\` — WebSocket トランスポート。**なぜ HTTP ポーリングではないか?** HTTP は 1 回のポーリングごとにラウンドトリップが必要 (~50ms)。WS なら provider が見た瞬間に hash がプッシュされる。このレイヤーでは、ポーリングは負け。
- \`subscribe_pending_transactions()\` は **tx hash** のストリームを返す、tx 本体ではない。なぜ? mempool トラフィックは多い — provider は秒速 500KB の生 tx データを全 subscriber に押し付けたくない。気になる tx だけ本体を取得する設計。
- \`get_transaction_by_hash\` — body をマテリアライズする 2 回目のラウンドトリップ。**ここがあなたの最初のレイテンシ予算項目。** 本物の searcher は body をインラインでプッシュする private mempool stream を使う。本レッスンは public path を使う — 無料で教育的だから。

> 🔍 **リポで探す。** Alloy の \`subscribe_pending_transactions\` は [\`Provider\`](https://github.com/alloy-rs/alloy/blob/main/crates/provider/src/provider/trait.rs) trait にある。開いて確認。このメソッドには provider に \`pubsub\` feature が必要 — HTTP only の Infura key は使えない。WS endpoint 必須。

## Step 2: swap call をデコード

Uniswap V2 router の swap で絞り込みます。router は mainnet で \`0x7a25...488D\`:

\`\`\`rust
use alloy_primitives::{address, Address, U256};
use alloy_sol_types::{sol, SolCall};

const UNI_V2_ROUTER: Address = address!("7a250d5630B4cF539739dF2C5dAcb4c659F2488D");

sol! {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}
\`\`\`

メインループ内:

\`\`\`rust
if tx.to() != Some(UNI_V2_ROUTER) { continue; }

let Ok(call) = swapExactTokensForTokensCall::abi_decode(tx.input(), true) else {
    continue; // 違うセレクタ、または不正な input
};

// 簡素版では 2-hop swap だけを対象
if call.path.len() != 2 { continue; }
let token_in  = call.path[0];
let token_out = call.path[1];
let amount_in = call.amountIn;
\`\`\`

Walk:

- \`sol!\` マクロは Solidity シグネチャを Rust 構造体 \`swapExactTokensForTokensCall\` + \`abi_decode\` メソッドに展開する。**手書き ABI 配管が一切ない。** これは Foundry が cheatcode dispatch に使っているのと同じ機構 (Fundamentals で \`Vm.sol\` を見たもの)。
- \`abi_decode(input, true)\` — \`true\` でセレクタが一致するかを検証。router の別関数への呼び出しなら綺麗に \`Err\` を返す。
- \`call.path.len() != 2\` — production はもっと長いルートも扱う。本レッスンは明瞭性のためスコープを絞る。

> 🛑 **アンチフルエンシーチェック。** スクロール戻しなしで: なぜ \`sol!\` が手書きセレクタより優れているか? 「便利」と言わずに、\`sol!\` が防いでくれる失敗モードを2つ挙げてください。(ヒント: 上流の Solidity ABI 変更、セレクタハッシュ計算ミス、を考えて)

## Step 3: Revm + AlloyDB で mainnet を fork

fork セットアップは本レッスンで最も「本番らしい」コードです。慎重に読むこと:

\`\`\`rust
use alloy_eips::BlockId;
use alloy_provider::{network::Ethereum, DynProvider};
use revm::{
    context::TxEnv,
    context_interface::result::{ExecutionResult, Output},
    database::{AlloyDB, CacheDB},
    database_interface::WrapDatabaseAsync,
    primitives::TxKind,
    Context, ExecuteEvm, MainBuilder, MainContext,
};

type ForkedDB = CacheDB<WrapDatabaseAsync<AlloyDB<Ethereum, DynProvider>>>;

async fn build_fork(provider: DynProvider) -> eyre::Result<ForkedDB> {
    let alloy_db = WrapDatabaseAsync::new(
        AlloyDB::new(provider, BlockId::latest())
    ).ok_or_else(|| eyre::eyre!("AlloyDB init failed"))?;
    Ok(CacheDB::new(alloy_db))
}
\`\`\`

3 層構造:

| レイヤー | 役割 |
| :--- | :--- |
| \`AlloyDB\` | 遅延 state ローダー。Revm がアドレス \`Y\` のスロット \`X\` を要求すると、AlloyDB が裏で \`eth_getStorageAt\` を provider に発行する |
| \`WrapDatabaseAsync\` | AlloyDB の async API を Revm の同期 \`Database\` trait にブリッジする。Revm は同期を要求する; ラッパが \`block_on\` を肩代わり |
| \`CacheDB\` | 前段に座るインメモリキャッシュ。slot への **初回** アクセスは provider に到達; **2回目以降** は瞬時。シミュレーションを安価にする魔法はここ |

> 🔍 **リポで探す。** \`AlloyDB\` と \`WrapDatabaseAsync\` は [\`revm/crates/database\`](https://github.com/bluealloy/revm/tree/main/crates/database) にある。開いて確認。**Advanced** で読んだ素の \`Database\` trait と比較せよ。同じ trait が、インメモリテスト DB と本番 fork DB の両方を駆動している。**これがあなたが行単位で読んだ trait 抽象化の対価。**

## Step 4: 候補 tx を適用、state を観察

\`\`\`rust
async fn simulate_candidate(
    provider: DynProvider,
    tx: &alloy_rpc_types::Transaction,
) -> eyre::Result<Option<ForkedDB>> {
    let mut db = build_fork(provider).await?;

    let mut evm = Context::mainnet().with_db(&mut db).build_mainnet();

    let tx_env = TxEnv::builder()
        .caller(tx.from())
        .kind(TxKind::Call(UNI_V2_ROUTER))
        .data(tx.input().clone())
        .value(tx.value())
        .gas_limit(tx.gas_limit())
        .build()?;

    let result = evm.transact_one(tx_env)?;

    match result.result {
        ExecutionResult::Success { .. } => Ok(Some(db)),
        _ => Ok(None), // 失敗する tx — arb エッジなし
    }
}
\`\`\`

Walk:

- \`Context::mainnet().with_db(&mut db).build_mainnet()\` — **mainnet** EVM を組み立てる (現行ハードフォーク規則、mainnet precompile)、state ソースは fork した DB。
- \`TxEnv::builder()\` — トランザクション単位の不変環境。\`caller\`, \`kind\` (Call vs Create), \`data\`, \`value\`, \`gas_limit\`。実行に影響する全フィールド。
- \`evm.transact_one(tx_env)?\` — **キャッシュに対して** tx を実行。state 変更は \`db\` に書き戻される。**重要:** 「もし候補 tx が実行されたら、世界はこうなる」を表す DB が手元にある。これが必要だったもの。
- \`Ok(None)\` 分岐は searcher 最初のフィルタ: revert する tx に arb エッジはない — pool の reserve が動かなかったから。

> 🛑 **予測。** ユーザーが pool の reserve の 100% を消費する swap を出した (drain 攻撃)。\`transact_one\` 後、DB 内の pool reserve は何になる? 頭の中で答えてから、Step 5 の 2-hop arb 数学に対する意味を考えてください。

## Step 5: アービトラージを検出

知りたいこと: 候補 tx が pool A の価格を十分動かして、(同じペアの) 別 pool B に exploitable な spread が生まれたか?

\`\`\`rust
sol! {
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
}

fn read_reserves(db: &mut ForkedDB, pool: Address) -> eyre::Result<(U256, U256)> {
    let mut evm = Context::mainnet().with_db(db).build_mainnet();
    let call = getReservesCall {}.abi_encode();

    let result = evm.transact_one(
        TxEnv::builder()
            .caller(address!("0000000000000000000000000000000000000001"))
            .kind(TxKind::Call(pool))
            .data(call.into())
            .gas_limit(1_000_000)
            .build()?,
    )?;

    let ExecutionResult::Success { output: Output::Call(out), .. } = result.result else {
        eyre::bail!("getReserves failed");
    };

    let decoded = getReservesCall::abi_decode_returns(&out, true)?;
    Ok((U256::from(decoded.reserve0), U256::from(decoded.reserve1)))
}

fn detect_arb(
    pool_a: (U256, U256),  // ユーザが触った pool の post-候補 reserves
    pool_b: (U256, U256),  // 並行 pool (別 DEX、同ペア) の現在 reserves
) -> Option<U256> {
    // Constant-product 不変式: x * y = k。pool A が今 (xA, yA) で
    // pool B が (xB, yB) にある時、(yA / xA) != (yB / xB) なら
    // 価格差は exploitable。最適 in-amount は Angeris ら (2020) の閉形式解。
    // 安い pool の価格を高い pool の価格に合うまで押し上げる。
    //
    // レッスンでは簡素化: spread が 30 bps (Uniswap fee 0.3% × 2 + headroom)
    // を超えるかだけチェック。
    let price_a = pool_a.1 * U256::from(10_000) / pool_a.0;
    let price_b = pool_b.1 * U256::from(10_000) / pool_b.0;
    let spread = if price_a > price_b { price_a - price_b } else { price_b - price_a };

    if spread < U256::from(30) { return None; }

    // 本物のコードはここで最適 arb サイズを計算する。
    // レッスンは固定 1 ETH probe を返す — デモには十分、エッジ捕獲には不足。
    Some(U256::from(10).pow(U256::from(18)))
}
\`\`\`

Walk:

- **同じ** \`db\` を使って Revm Context を再構築する — reserve は post-候補 state から読む。\`getReserves\` は純粋 view (書き込まない) なのでシミュレーションを汚染しない。
- spread の数学: basis points にスケール (10,000 = 100%)。30 bps ≈ 0.30% — Uniswap の往復手数料。これより小さい spread は手数料後に実質エッジなし。
- 固定 1 ETH return は **意図的に production では誤り**。Angeris–Chitra–Evans の閉形式最適サイズは ~30 行の数学; 本レッスンは build の *形* を教えるためにスキップ。下の Drill 5 で実装してもらう。

> 🔍 **リポで探す。** [Uniswap V2 pair](https://github.com/Uniswap/v2-core/blob/master/contracts/UniswapV2Pair.sol) ソースを開く。\`getReserves\` を見つける。3 値返すが、本レッスンでは 2 つしか使わない — タイムスタンプは TWAP 用 (Uniswap V2 の price-oracle ハック)。**何十もの fork でこの正確なパターンを目にする。**

## Step 6: bundle を構築 (送らない)

\`\`\`rust
use alloy_signer_local::PrivateKeySigner;
use alloy_network::TransactionBuilder;
use alloy_rpc_types::TransactionRequest;
use serde_json::json;

async fn build_bundle(
    signer: &PrivateKeySigner,
    nonce: u64,
    base_fee: u128,
    candidate_tx_raw: &[u8],
    arb_amount: U256,
) -> eyre::Result<serde_json::Value> {
    // Backrun: 安い pool で逆方向の swap
    let backrun_request = TransactionRequest::default()
        .with_from(signer.address())
        .with_to(UNI_V2_ROUTER)
        .with_value(arb_amount)
        .with_nonce(nonce)
        .with_gas_limit(300_000)
        .with_max_fee_per_gas(base_fee * 3)
        .with_max_priority_fee_per_gas(base_fee);
    // (backrun swap call の input data は省略 — Drill 1 を見よ)

    let backrun_signed = backrun_request
        .build(&signer.clone().into())
        .await?
        .encoded_2718();

    Ok(json!({
        "txs": [
            format!("0x{}", hex::encode(candidate_tx_raw)),
            format!("0x{}", hex::encode(backrun_signed)),
        ],
        "blockNumber": "pending",
    }))
}
\`\`\`

Walk:

- \`PrivateKeySigner\` — Alloy ローカルサイナ。hex 文字列か keystore ファイルからロード。本物の鍵をコミットしないこと。
- \`TransactionBuilder\` 拡張メソッド (\`with_from\`, \`with_to\` 等) — \`TransactionRequest\` への流れる API。\`build()\` 呼び出しがハッシュ + 署名を行う。
- \`encoded_2718()\` — EIP-2718 エンベロープエンコーディング。Flashbots 系 relay が全て要求する。
- bundle JSON の形は **\`eth_sendBundle\` が受け取るそのもの**。送るのは1 行の POST。送らない理由: (a) relay endpoint と \`X-Flashbots-Signature\` 認証が要る; (b) searcher の世界には本物のお金が動いていて、送る前に考えてほしいから。

## Production に足りないもの

このレッスンと、実際に MEV ゲームに勝つもののギャップに正直であれ:

| ギャップ | 本物の searcher が何をしているか |
| :--- | :--- |
| **マルチ DEX 対応** | V3, Curve, Balancer, カスタム AMM, CEX/DEX 脚 |
| **最適サイジング** | Angeris–Chitra–Evans の閉形式; 非 CFMM では三分探索フォールバック |
| **Bundle 提出** | \`eth_sendBundle\` を Flashbots / Beaverbuild / Titan / Rsync へ — relay ごとの inclusion rate を監視 |
| **ガスオークション** | Coinbase tip エスカレーション; 条件付き bundle; private orderflow auction (PBS) |
| **レイテンシ** | private mempool 購読; ビルダーとの colocation; スタック上位での FPGA / kernel-bypass ネットワーク |
| **リスク管理** | sim 精度 vs オンチェーン現実; revert 保護 (条件付き builder では非 inclusion でも inclusion fee が発生); ポジション制限 |

あなたが組んだアーキテクチャ — mempool → fork-sim → detect → bundle — **はトップで使われているそのものです**。本物の searcher はスケール、最適化、エッジを足す — 構造を変えはしない。

## Drill

1. **Sushi に対応する。** Sushiswap V2 は同じ router ABI、アドレスは \`0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F\`。候補フィルタを両方の router を受け入れるように拡張せよ。(5分)
2. **dust を弾く。** \`if amount_in < parse_units("1", "ether") { continue; }\` を入れて、1 ETH 未満の swap を無視する。前後で CPU 使用率を計測 — dust にどれだけ計算を費やしていたか? (15分)
3. **利益閾値。** 各検出機会の期待利益 (ETH) を計算。ガス控除後の期待利益が 0.01 ETH を超える時のみ「送ったとする」処理を行う。(30分)
4. **レイテンシ予算。** 各 step を \`Instant::now()\` で囲む。\`tx_received_at → simulation_done_at → bundle_built_at\` をログ。end-to-end レイテンシは何 ms か? どこが一番食ってる? (1時間)
5. **最適サイジング。** 固定 1 ETH probe を [Angeris–Chitra–Evans 2020](https://arxiv.org/abs/2003.10001) の閉形式最適 arb サイズに置き換える。U256 で押し通せば数式は ~20 行の Rust。(3〜6時間)

Drill 5 を完成させれば、本物の searcher のアルゴリズム的核を持つ。提出 + マルチ DEX を加えれば 2022 年に出荷されたものと同等水準。

> 🛑 **最終チェック。** 一文で: なぜこの設計の中で **Step 3 の fork** が searcher を可能にする部分なのか? 答えに「候補が乗ったかのように世界を観察する」という意味の一節がないなら、Step 3 を読み直し — その再アンカリングがゲーム全体。

## 📺 関連動画

\`\`\`youtube
vCCYFSAdCFo | Understanding MEV — Georgios Konstantopoulos, Dan Robinson, Hasu (Paradigm)
\`\`\`

\`\`\`youtube
xRuDWTWuxKA | Dragan Rakita — Revm Endgame (Devcon SEA 2024) — 上で fork したエンジン
\`\`\`

---

## このティアの今後

本レッスンは **Building with the Stack** の最初の 1 本。今後の予定 (無料、source-first、同じ active-learning スタイル):

- **Reorg-Aware Indexer を ExEx で作る** — etherscan.io を駆動するのと同種のもの、ただし 300 行で、Reth と同一プロセスで動く
- **Reth にカスタム RPC エンドポイントを足す** — \`eth_myThing\` を Rust 拡張として shipping
- **Wallet Backend を Rust で作る** — Alloy signer + nonce/gas 管理、wallet チームが実際に格闘している部分
- **最小限の EIP-7702 Bundler を作る** — Pectra 時代の EIP-4337 bundler 同等品、想像より単純

新レッスンの通知は [GitHub repo](https://github.com/psyto/rethlab) を watch してください。
`,
                },
              ],
            },
          },
        ],
      },
    },
  });

  console.log('  Building (JA) seeded');
}
