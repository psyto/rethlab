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

---

## このティアの今後

**Building with the Stack** の次のレッスンは本レッスンが止まった所から続く: in-process な indexer がチェーンをクエリ可能な Postgres データセットに変換、フル reorg 正確性、もう ~250 行で。それ以降の予定: Reth カスタム RPC エンドポイント、Rust wallet backend、最小限の EIP-7702 bundler。

新レッスンの通知は [GitHub repo](https://github.com/psyto/rethlab) を watch してください。
`,
                },
                {
                  title: 'Reorg-Aware Indexer を ExEx で作る',
                  slug: 'build-exex-indexer-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 45,
                  xpReward: 80,
                  content: `# Reorg-Aware Indexer を ExEx で作る

すべてのブロックエクスプローラ、アナリティクスパイプライン、リクイデーションモニタは同じプリミティブを必要とします: **チェーンを自分のデータストアに読み込み、reorg が起きても壊さない。** ExEx は Reth のこの部分を、2,000 行のサイドプロジェクトから 250 行の単一ファイルに変える機構です。本レッスンはその完全なコードを walk through します。

> 📌 **スコープの正直な開示。** ERC-20 Transfer イベントを Postgres にインデックスする (フル reorg 対応 — \`ChainCommitted\` で commit、\`ChainReverted\` で undo、\`ChainReorged\` で swap)。データの上に public API を載せる部分は構築しない。それは indexer の後半で、本レッスンが答える問いとは直交: *「ノード速度で正しいチェーンデータをデータストアに入れるには?」*

## 何を作るか

\`\`\`mermaid
flowchart LR
    Reth["Reth node<br/>(in-process)"] -->|ExExNotification| Loop["ExEx loop"]
    Loop -->|ChainCommitted| Decode["Decode Transfer logs<br/>from receipts"]
    Decode -->|rows| Insert["INSERT into Postgres"]
    Loop -->|ChainReverted| Delete["DELETE WHERE<br/>block IN range"]
    Loop -->|ChainReorged| Swap["DELETE old +<br/>INSERT new"]
    Insert --> Signal["Send FinishedHeight<br/>(let Reth prune)"]
    Delete --> Signal
    Swap --> Signal
\`\`\`

単一の \`main.rs\` が **Reth のプロセス内で** 動く。JSON-RPC ラウンドトリップなし、別ノードなし、WebSocket 再接続ロジックなし。ExEx は Reth 自身が生成するチェーンイベントを型付きストリームで受け取る。

> 🛑 **スクロール前に予測。** なぜ「in-process」がここでのアーキテクチャ的な勝ちか? ノード外で動くことが indexer に強いる作業のうち、内側に住むことでスキップできるものを、一文で答えてください。Step 2 まで答えを保持。

## なぜ ExEx か (\`eth_getLogs\` ポーリング vs 直接 DB read との比較)

| 方式 | レイテンシ | reorg 正確性 | Reth 結合度 |
| :--- | :--- | :--- | :--- |
| **\`eth_getLogs\` ポーリング** | 秒 (poll 間隔 + RPC) | 手動 — 自分で再取得 + reconcile | なし、ただしレイテンシ + 負荷で代償 |
| **直接 MDBX read** | µs | なし — MDBX は committed state を見せる、チェーン履歴は見えない | 密、しかし reorg シグナルが一切ない |
| **ExEx** | µs (in-process channel) | **型付き reorg event が届く** | Reth crate への Cargo dep |

ExEx は 3 つのうち **正確性 (reorg event)** と **レイテンシ (in-process)** の両方を提供する唯一の選択肢。代償は indexer が **Reth バイナリの一部として shipping** されること — コードが同一プロセスに住む。単一目的の indexer にとって、これは features: 1 バイナリ、1 データストア、glue 不要。

## Cargo.toml

\`\`\`toml
[package]
name = "transfer-indexer"
version = "0.1.0"
edition = "2021"

[dependencies]
# Reth crate — production では特定タグにピン留め
reth                = { git = "https://github.com/paradigmxyz/reth", tag = "v1.5.0" }
reth-exex           = { git = "https://github.com/paradigmxyz/reth", tag = "v1.5.0" }
reth-node-ethereum  = { git = "https://github.com/paradigmxyz/reth", tag = "v1.5.0" }
reth-tracing        = { git = "https://github.com/paradigmxyz/reth", tag = "v1.5.0" }
reth-primitives     = { git = "https://github.com/paradigmxyz/reth", tag = "v1.5.0" }

# Alloy (event デコード用)
alloy-primitives    = "1.5"
alloy-sol-types     = "1.5"

# Postgres
sqlx                = { version = "0.8", features = ["runtime-tokio", "postgres", "macros", "migrate"] }

# 配管
futures-util        = "0.3"
tokio               = { version = "1", features = ["macros", "rt-multi-thread"] }
eyre                = "0.6"
\`\`\`

> Reth は ExEx crate を crates.io に安定的なペースで publish しない — Git タグから引くのが標準パターン。特定タグ (ここでは \`v1.5.0\`) にピン留めし、新 Reth でテストする準備ができたら意図的に bump する。

## Step 1: ExEx スケルトン

すべての ExEx の形は同じ。これを読めば、これから世界に存在するすべての ExEx の 80% を読んだことになる:

\`\`\`rust
use futures_util::TryStreamExt;
use reth::{api::FullNodeComponents, builder::NodeTypes, primitives::EthPrimitives};
use reth_exex::{ExExContext, ExExEvent, ExExNotification};
use reth_node_ethereum::EthereumNode;
use reth_tracing::tracing::info;

async fn indexer<Node>(mut ctx: ExExContext<Node>, db: sqlx::PgPool) -> eyre::Result<()>
where
    Node: FullNodeComponents<Types: NodeTypes<Primitives = EthPrimitives>>,
{
    while let Some(notification) = ctx.notifications.try_next().await? {
        match &notification {
            ExExNotification::ChainCommitted { new } => {
                handle_commit(&db, new).await?;
            }
            ExExNotification::ChainReverted { old } => {
                handle_revert(&db, old).await?;
            }
            ExExNotification::ChainReorged { old, new } => {
                handle_revert(&db, old).await?;
                handle_commit(&db, new).await?;
            }
        }

        if let Some(committed) = notification.committed_chain() {
            ctx.events.send(ExExEvent::FinishedHeight(committed.tip().num_hash()))?;
        }
    }
    Ok(())
}

fn main() -> eyre::Result<()> {
    reth::cli::Cli::parse_args().run(async move |builder, _| {
        let db = sqlx::PgPool::connect(&std::env::var("DATABASE_URL")?).await?;
        sqlx::migrate!().run(&db).await?;

        let handle = builder
            .node(EthereumNode::default())
            .install_exex("transfer-indexer", async move |ctx| Ok(indexer(ctx, db.clone())))
            .launch_with_debug_capabilities()
            .await?;

        handle.wait_for_node_exit().await
    })
}
\`\`\`

Walk:

- **\`ctx.notifications\`** — \`ExExNotification\` の型付きストリーム。3 バリアント: \`ChainCommitted\` (新ブロック追加)、\`ChainReverted\` (ローカルチェーンが背後で fork されたためブロック削除)、\`ChainReorged\` (チェーンが別チェーンに丸ごと swap)。**reorg はファーストクラス。** ポーリングなし、推測なし — Reth が教えてくれる。
- **\`ctx.events.send(FinishedHeight(...))\`** — Reth に「ブロック N までは durably にデータストアに書いた」と伝える。Reth はこれを使って、あなたのパイプラインを壊さずに state をどこまで prune できるかを知る。**送らないと Reth は安全側に倒して state を永久保持する**; 送ればディスク使用量は Reth 通常の prune 方針内に収まる。
- **\`main\` の \`install_exex\`** — ExEx を名前付きで登録。Builder が channel 配線とプロセス統合を引き受ける。

> 🔍 **リポで探す。** [\`reth-exex-examples\`](https://github.com/paradigmxyz/reth-exex-examples) を開いて、好きなプロジェクトを 1 つ選ぶ。\`install_exex\` 呼び出しを見つける。その \`indexer\` (またはそれっぽい名前の) 関数を上記と比較せよ — **全部この同じ形。** これがパターン。一度見えれば、世の中の ExEx 全部読める。

## Step 2: receipt から Transfer event をデコード

\`handle_commit\` を埋めていきます。コミットされたチェーン内のすべてのブロック、すべての tx、その receipt のすべての log を walk して、ERC-20 Transfer event をデコード:

\`\`\`rust
use alloy_primitives::{Address, B256, U256};
use alloy_sol_types::{sol, SolEvent};
use reth::providers::Chain;

sol! {
    event Transfer(address indexed from, address indexed to, uint256 value);
}

#[derive(Debug)]
struct TransferRow {
    block_number: u64,
    tx_hash: B256,
    log_index: u32,
    token: Address,
    from_addr: Address,
    to_addr: Address,
    value: U256,
}

fn extract_transfers(chain: &Chain) -> Vec<TransferRow> {
    let mut rows = Vec::new();

    for (block, receipts) in chain.blocks_and_receipts() {
        let block_number = block.number;

        for (tx, receipt) in block.body.transactions.iter().zip(receipts.iter()) {
            let tx_hash = tx.hash();

            for (log_index, log) in receipt.logs.iter().enumerate() {
                // topic[0] が event signature; abi_decode_log が検証する
                let Ok(decoded) = Transfer::decode_log(log, true) else { continue };

                rows.push(TransferRow {
                    block_number,
                    tx_hash,
                    log_index: log_index as u32,
                    token: log.address,
                    from_addr: decoded.from,
                    to_addr: decoded.to,
                    value: decoded.value,
                });
            }
        }
    }
    rows
}
\`\`\`

Walk:

- **\`chain.blocks_and_receipts()\`** — Chain 型はブロックと receipt をすでにアラインされた形で対にしてくれる。**これが in-process で動くことの対価。** ポーリング型 indexer はこのアラインを 2 つの別 RPC コールから再構築 + race condition を reconcile する必要がある。
- **\`Transfer::decode_log\`** — \`sol!\` マクロが生成。\`true\` は \`topic[0]\` が Transfer signature と一致するかを検証; Transfer 以外の log は綺麗に \`Err\` を返してスキップされる。
- **ここでは token フィルタしない。** すべての ERC-20 がこの正確な event を emit する。indexer はそれら全部を取得し、consumer が気になる token を query する設計。(token アドレスでフィルタするなら、下流で 1 行 WHERE 句を足すだけ)

> 🛑 **予測。** あるトークンコントラクトが malformed な Transfer event (topic 数が違う、ABI が変) を emit する。\`decode_log\` がどう振る舞うか walk through。**なぜ silently skip (\`Err → continue\`) が indexer にとって正解か?** ヒント: 代替 (panic する) がパイプラインに何をするかを考えて。

## Step 3: Postgres スキーマと insert

スキーマ (\`migrations/0001_init.sql\`):

\`\`\`sql
CREATE TABLE IF NOT EXISTS transfers (
    block_number   BIGINT       NOT NULL,
    tx_hash        BYTEA        NOT NULL,
    log_index      INTEGER      NOT NULL,
    token          BYTEA        NOT NULL,
    from_addr      BYTEA        NOT NULL,
    to_addr        BYTEA        NOT NULL,
    value          NUMERIC(78)  NOT NULL,  -- U256 を入れる
    PRIMARY KEY (tx_hash, log_index)
);

CREATE INDEX transfers_block_number_idx ON transfers (block_number);
CREATE INDEX transfers_token_idx        ON transfers (token);
CREATE INDEX transfers_from_addr_idx    ON transfers (from_addr);
CREATE INDEX transfers_to_addr_idx      ON transfers (to_addr);
\`\`\`

Insert (Transfer 1 件 = 1 row):

\`\`\`rust
async fn handle_commit(db: &sqlx::PgPool, chain: &Chain) -> eyre::Result<()> {
    let rows = extract_transfers(chain);
    if rows.is_empty() { return Ok(()); }

    let mut tx = db.begin().await?;
    for r in &rows {
        sqlx::query!(
            "INSERT INTO transfers (block_number, tx_hash, log_index, token, from_addr, to_addr, value)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (tx_hash, log_index) DO NOTHING",
            r.block_number as i64,
            r.tx_hash.as_slice(),
            r.log_index as i32,
            r.token.as_slice(),
            r.from_addr.as_slice(),
            r.to_addr.as_slice(),
            r.value.to_string().parse::<sqlx::types::BigDecimal>()?,
        )
        .execute(&mut *tx)
        .await?;
    }
    tx.commit().await?;
    Ok(())
}
\`\`\`

Walk:

- **\`(tx_hash, log_index)\` を主キーに** — Ethereum log の正規 ID。reorg をきれいに生き残る: 再 inclusion された tx は同じ hash を保つので、\`ON CONFLICT DO NOTHING\` で正しく no-op になる。
- **chain commit ごとに 1 トランザクション、row ごとではない。** Reth は通常 1 ノーティフィケーションあたり 1〜8 ブロックを届ける; 書き込みを 1 つの Postgres トランザクションにバッチすることが、忙しい committer で 50ms と 5s の違いを生む。
- **\`NUMERIC(78)\`** — U256 max は 2²⁵⁶ ≈ 1.16 × 10⁷⁷、78 桁の十進数に収まる。\`BigDecimal\` が sqlx の Rust マッピング。

## Step 4: reorg ハンドリング

これこそが indexing で ExEx を使う最大の理由。canonical chain が足元で変わったら、orphan になったブロックに対して書いたものを undo する必要がある:

\`\`\`rust
async fn handle_revert(db: &sqlx::PgPool, chain: &Chain) -> eyre::Result<()> {
    let range = chain.range();
    let from = *range.start() as i64;
    let to   = *range.end() as i64;

    sqlx::query!(
        "DELETE FROM transfers WHERE block_number BETWEEN $1 AND $2",
        from,
        to,
    )
    .execute(db)
    .await?;

    Ok(())
}
\`\`\`

それだけ。みんなが最初の挑戦で間違える部分が 3 行。なぜこんなにシンプルか?

- **冪等な schema。** \`(tx_hash, log_index)\` が主キーなので、同じ row が 2 回存在できない。block 範囲で削除すれば commit 時に書いた row を正確に消せる。
- **Reth が正確な範囲を教えてくれる。** 「reorg はブロック N から始まったか N-1 か?」の推測なし。reverted Chain の range *が* 答え。
- **\`ChainReorged\` は revert + commit の合成。** Step 1 のディスパッチでそう扱う。**1 つのパターンで 3 つの notification 型をカバー。**

> 🔍 **リポで探す。** [reth-execution-types の \`Chain\`](https://github.com/paradigmxyz/reth/blob/main/crates/evm/execution-types/src/chain.rs) を開く。\`range()\` メソッドを見つける。\`RangeInclusive<BlockNumber>\` を返す — 両端点が有効なブロック。\`*range.start()\` と \`*range.end()\` で取り出す; iterator から \`.first()\` を使うのは違う (range 全体を materialize して useful には使わない)。

## Step 5: FinishedHeight — Reth に prune させる

Step 1 ですでに書いたこの 1 行:

\`\`\`rust
ctx.events.send(ExExEvent::FinishedHeight(committed.tip().num_hash()))?;
\`\`\`

しかし立ち止まる価値がある。あなたが送る信号は Reth に伝える: *「このブロックまで durably に書きました。これより前の state と履歴は私を壊さずに prune できる」*。これを送らないと:

- Reth は あなたの ExEx が任意の歴史的ブロックの state をまだ読みたいかもしれないと仮定する必要がある
- ディスク使用量が無限に線形成長
- ExEx を 6 ヶ月走らせたノードは普通のノードの 6 倍のストレージ

送れば:

- Reth の pruner はあなたの一番遅い ExEx と同じ速さで進む
- ディスク使用量は Reth 通常の prune ポリシー内に収まる
- 複数の ExEx が共存する場合、Reth は全 ExEx の中で最低の \`FinishedHeight\` を tracking する

> 🛑 **アンチフルエンシーチェック。** スクロール戻しなしで: なぜ Reth はあなたの一番遅い ExEx の \`FinishedHeight\` より先のブロックを prune したがらないのか? 自分の言葉で答えてください。ヒント: ノード再起動時に、ExEx がまだ処理していないブロックを Reth がすでに prune してしまっていたら何が起きるか考えて。(ネタバレ: あなたの indexer がそのブロックを永久にスキップ、データが間違う、誰かが query するまで気づかない)

## Production に足りないもの

| ギャップ | 本物の indexer が何をしているか |
| :--- | :--- |
| **Backpressure** | Postgres が遅いと ExEx が stall して Reth の notification channel が back up する。Production は writer を bounded queue で wrap + 溢れたら disk-buffer に dump |
| **スキーママイグレーション** | sqlx migrations を使う (ここでも最低限使った)。Production は起動時に lock 取って running する (replica レース防止) |
| **レプリカ / シャーディング** | 1 ExEx → 1 Postgres。読み取りレプリカ、\`block_number\` でのパーティショニング、archive vs hot 階層 — 全て標準の DBA 仕事 |
| **より多い event のデコード** | ここでは \`Transfer\` だけ。\`Approval\`、\`Swap\`、\`Sync\`、独自プロトコル event を足す。パターン (event 1 つにつき \`sol! { event ... }\` 1 ブロック、フィルタ 1 つにつき \`decode_log\` 1 つ) はスケールする |
| **トークン単位のエンリッチメント** | Transfer row を token メタデータ (name, symbol, decimals) に書き込み時 vs query 時で join。トレードオフ: 書き込み時は RPC コスト、query 時は JOIN コスト |
| **Liveness モニタリング** | indexer の \`FinishedHeight\` を Reth の tip と毎分比較。閾値超えたら page |

あなたが書いたアーキテクチャ — ExEx loop、notification 型でディスパッチ、Postgres write、FinishedHeight シグナル — **このレイヤーより上のすべての production indexer が同じことをしている**。彼らは features と運用を足す; 背骨は同一。

## Drill

1. **Approval を足す。** ERC-20 \`Approval(address,address,uint256)\` は Transfer と同じ形。2 番目の \`sol!\` event、2 番目の \`extract_*\` ヘルパ、2 番目のテーブルを足す。**ExEx loop 自体は何も変わらない** ことを確認。(15分)
2. **単一トークンに絞る。** \`if log.address != USDC { continue; }\` を入れる。同期済みノードで 1 分間動かす — フィルタ前後で row 数はどれくらい? **なぜフィルタリングがそんなに効くのか?** (20分)
3. **レイテンシ計測。** 各 \`handle_commit\` を \`Instant::now()\` で囲んでログ: *chain 受信 → N row 書込 → FinishedHeight emit*。予算は? どこが食う? (30分)
4. **Reorg テスト。** Hoodi または Holesky テストネットで Reth を走らせる (mainnet より頻繁に reorg)。1 時間動かす。\`ChainReorged\` パスが発火したかを DB で確認 — 過去に \`max(block_number) > committed_chain_max\` だったブロックを query して確認。(1時間)
5. **Backpressure を追加。** Postgres プールを bounded \`mpsc::channel\` + 別 writer task で wrap。溢れたら ExEx を block するのではなく drop か disk-buffer。**indexer が FinishedHeight を emit しなくなったら Reth の振る舞いは何が変わるか?** (3時間)

Drill 5 を完成させると、Postgres outage で Reth を巻き添えにしない indexer ができる。query API を足せば ~500 行の単一バイナリで Etherscan のデータレイヤー相当が手に入る。

> 🛑 **最終チェック。** 一文で: なぜ \`FinishedHeight\` が本レッスンで最も重要な行なのか (1 メソッド呼び出しに過ぎないが)? 答えに「Reth の pruning」と「あなたの indexer の再起動時の正確性」の繋がりがないなら、Step 5 を読み直し — その相互作用が ExEx を production-grade にしている。

## 📺 関連動画

\`\`\`youtube
GhEhzE9SFqY | Alexey Shekhirin — Using Reth Execution Extensions for next generation indexing (Devcon 2024)
\`\`\`
`,
                },
                {
                  title: 'Reth にカスタム RPC エンドポイントを足す',
                  slug: 'build-custom-rpc-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 40,
                  xpReward: 70,
                  content: `# Reth にカスタム RPC エンドポイントを足す

Reth には標準 JSON-RPC ネームスペース (\`eth_*\`、\`net_*\`、\`web3_*\`、\`debug_*\`、\`trace_*\`、\`txpool_*\`) が同梱されています。そのリストに *無いもの* が欲しい時 — ドメイン固有の集計、独自デバッグヘルパ、自分のプロトコルに合わせたリアルタイム subscription — Reth を fork する必要はない。trait を 1 つ書き、実装し、node builder に渡す。Rust ~50 行で、ネイティブと同じ HTTP / WebSocket / IPC エンドポイントから新メソッドが live になる。

> 📌 **スコープの正直な開示。** 読み取り専用メソッド 1 つ (\`txpoolPlus_pendingByGasBucket\`) を追加する — ローカル mempool を 10 個の gas-price バケットに集計するもの。認証、レート制限、書き込みメソッドは扱わない — それらは同じパターンの上に重ねるレイヤー。アーキテクチャ的レッスンは「trait はどう wire される?」。

## 何を作るか

新 RPC メソッド、ネイティブと同じように呼べる:

\`\`\`bash
$ cast rpc txpoolPlus_pendingByGasBucket
[
  {"min_gwei": 0,   "max_gwei": 1,   "count": 12},
  {"min_gwei": 1,   "max_gwei": 5,   "count": 47},
  {"min_gwei": 5,   "max_gwei": 10,  "count": 89},
  {"min_gwei": 10,  "max_gwei": 20,  "count": 134},
  {"min_gwei": 20,  "max_gwei": 30,  "count": 56},
  {"min_gwei": 30,  "max_gwei": 50,  "count": 21},
  {"min_gwei": 50,  "max_gwei": 100, "count": 8},
  {"min_gwei": 100, "max_gwei": 250, "count": 2},
  {"min_gwei": 250, "max_gwei": 500, "count": 0},
  {"min_gwei": 500, "max_gwei": 0,   "count": 1}
]
\`\`\`

用途: gas-price oracle、ダッシュボード、料金入札戦略、MEV searcher (pending priority fee の 90 パーセンタイル超えで入札)。

\`\`\`mermaid
flowchart LR
    Client["RPC client<br/>(cast / dapp / dashboard)"] -->|JSON-RPC POST| Handler["jsonrpsee handler"]
    Handler -->|read snapshot| Pool["TransactionPool<br/>(in-process)"]
    Pool -->|all_transactions| Bucket["Bucket math<br/>(10 ranges)"]
    Bucket -->|JSON| Client
\`\`\`

> 🛑 **スクロール前に予測。** なぜ *サーバーサイド集計* が勝ちか? \`txpool_content\` が返すもの vs ダッシュボードが実際に必要とするもの — ペイロードサイズについて一文で答えてください。答えを保持。

## なぜカスタム RPC か (workaround との比較)

| 方式 | レイテンシ | ペイロード | 労力 |
| :--- | :--- | :--- | :--- |
| **\`txpool_content\` を呼んでクライアント側で集計** | RPC ラウンドトリップ + 全 tx 転送 | 数百 KB | 簡単 |
| **mempool を subscribe する外部 indexer** | µs/query (in-mem) | 小 | glue + 運用に数日 |
| **カスタム RPC メソッド** | µs (in-process スナップショット) | bytes | 1 回 ~50 行 |

カスタム RPC はスイートスポットに座る: indexer のレイテンシ、集計のペイロード、Rust 数ページの労力。**そしてノードの一部として shipping** — 別サービスなし、別デプロイなし、ポート開放なし。

## Cargo.toml

\`\`\`toml
[package]
name = "txpool-plus"
version = "0.1.0"
edition = "2021"

[dependencies]
# Reth — production ではタグにピン
reth                = { git = "https://github.com/paradigmxyz/reth", tag = "v1.5.0" }
reth-ethereum       = { git = "https://github.com/paradigmxyz/reth", tag = "v1.5.0" }

# jsonrpsee — Reth が end-to-end で使っている RPC フレームワーク
jsonrpsee           = { version = "0.24", features = ["server", "macros"] }

# CLI フラグ
clap                = { version = "4", features = ["derive"] }

# 配管
serde               = { version = "1", features = ["derive"] }
tokio               = { version = "1", features = ["macros", "rt-multi-thread"] }
\`\`\`

> Reth の RPC スタックは \`jsonrpsee\` で構築されている。あなたのカスタムメソッドは同一プロセスに住み、同じリスナを共有し、ネイティブと同じ認証を使う。並行 \`jsonrpsee\` サーバを立てようとしないこと — \`extend_rpc_modules\` で Reth の既存サーバに登録させる。

## Step 1: RPC trait を定義

\`jsonrpsee\` は trait から RPC plumbing を生成する手続きマクロを使う。trait の形を書く; マクロが server stub、client stub、JSON シリアライズを派生させる:

\`\`\`rust
use jsonrpsee::{core::RpcResult, proc_macros::rpc};
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct GasBucket {
    pub min_gwei: u64,
    pub max_gwei: u64,  // 0 = 上限なし (最上位バケット用)
    pub count: usize,
}

#[rpc(server, namespace = "txpoolPlus")]
pub trait TxpoolPlusApi {
    #[method(name = "pendingByGasBucket")]
    fn pending_by_gas_bucket(&self) -> RpcResult<Vec<GasBucket>>;
}
\`\`\`

Walk:

- **\`#[rpc(server, namespace = "txpoolPlus")]\`** — マクロが \`TxpoolPlusApiServer\` trait を生成、それを実装する。\`namespace\` が JSON-RPC メソッドプレフィックスになる; \`#[method(name = "pendingByGasBucket")]\` と組み合わせて、wire 上のメソッド名は \`txpoolPlus_pendingByGasBucket\`。
- **\`RpcResult<T>\`** — \`jsonrpsee\` の \`Result<T, ErrorObjectOwned>\` エイリアス。エラーは proper JSON-RPC エラーオブジェクト (コード付き) として返る; シリアライズは自分で書かない。
- **戻り値型に \`Serialize\`** — それだけで OK。\`GasBucket\` は \`min_gwei\`、\`max_gwei\`、\`count\` フィールドを持つ JSON オブジェクトになる。snake → camel ケースマッピングは設定可能; ここでは明瞭性のため snake のまま。

> 🔍 **リポで探す。** [\`reth-rpc-api\`](https://github.com/paradigmxyz/reth/tree/main/crates/rpc/rpc-api) を開く — 全ネイティブネームスペース (\`EthApi\`、\`DebugApi\`、\`TraceApi\`、\`TxpoolApi\`、…) がこの正確な \`#[rpc(...)]\` パターンで宣言された trait。**あなたのカスタム trait は構造的にネイティブと同一。** 偶然ではなく、それが contract。

## Step 2: pool アクセス付きで実装

trait は \`TxpoolPlusApiServer\` を派生させた。トランザクションプールへのハンドルを持つ struct に実装する:

\`\`\`rust
use reth_ethereum::pool::{PoolTransaction, TransactionPool};

pub struct TxpoolPlus<Pool> {
    pool: Pool,
}

const BUCKETS: &[(u64, u64)] = &[
    (0, 1), (1, 5), (5, 10), (10, 20), (20, 30),
    (30, 50), (50, 100), (100, 250), (250, 500), (500, 0),
];

impl<Pool> TxpoolPlusApiServer for TxpoolPlus<Pool>
where
    Pool: TransactionPool + Clone + 'static,
{
    fn pending_by_gas_bucket(&self) -> RpcResult<Vec<GasBucket>> {
        let mut counts = vec![0usize; BUCKETS.len()];

        // pending() はスナップショット iterator を返す; 呼び出しは安価
        for tx in self.pool.pending() {
            let max_priority_fee_wei = tx.max_priority_fee_per_gas().unwrap_or(0);
            let gwei = (max_priority_fee_wei / 1_000_000_000) as u64;

            for (i, &(min, max)) in BUCKETS.iter().enumerate() {
                let upper_match = max == 0 || gwei < max;
                if gwei >= min && upper_match {
                    counts[i] += 1;
                    break;
                }
            }
        }

        Ok(BUCKETS
            .iter()
            .zip(counts)
            .map(|(&(min, max), count)| GasBucket { min_gwei: min, max_gwei: max, count })
            .collect())
    }
}
\`\`\`

Walk:

- **\`Pool: TransactionPool\`** — trait バウンド。\`TransactionPool\` は Reth がどこでも使う抽象; 具体型はノードビルダーが決める。**\`EthPool\` や \`BasicPool\` を hardcode しない** — ジェネリックなので、vanilla mainnet ノード、op-reth L2 ノード、カスタム App-chain で同じコードが動く。
- **\`pool.pending()\`** — pending tx のスナップショットを返す; 新規 insert に対してプールをロックしない。プロダクション級。
- **\`max_priority_fee_per_gas\`** — バケット対象。(本物の searcher は base fee も考慮; 明瞭性のため priority fee のみ)
- **内側ループは \`O(buckets * pending)\`** — 典型的なプールサイズ (~10K) には十分。100K+ pending には bucket 配列での二分探索に切り替える。

> 🛑 **アンチフルエンシーチェック。** スクロール戻しなしで: なぜ \`pool.pending()\` がここでは安価で、本物の \`txpool_content\` RPC は重いか? ヒント: \`pending()\` が返すもの vs \`txpool_content\` が wire のためにマテリアライズするものを考えて。

## Step 3: NodeBuilder に wire

ここが統合点。ノードビルダーは \`extend_rpc_modules\` を公開している; context (pool, provider, network handle, ...) とモジュールレジストリへの mut handle を渡してくれる:

\`\`\`rust
use clap::Parser;
use reth_ethereum::{
    cli::{chainspec::EthereumChainSpecParser, interface::Cli},
    node::EthereumNode,
};

#[derive(Debug, Clone, Copy, Default, clap::Args)]
struct Args {
    /// txpoolPlus 拡張を有効化
    #[arg(long)]
    enable_txpool_plus: bool,
}

fn main() {
    Cli::<EthereumChainSpecParser, Args>::parse()
        .run(async move |builder, args| {
            let handle = builder
                .node(EthereumNode::default())
                .extend_rpc_modules(move |ctx| {
                    if !args.enable_txpool_plus {
                        return Ok(());
                    }
                    let ext = TxpoolPlus { pool: ctx.pool().clone() };
                    ctx.modules.merge_configured(ext.into_rpc())?;
                    println!("txpoolPlus_pendingByGasBucket enabled");
                    Ok(())
                })
                .launch_with_debug_capabilities()
                .await?;
            handle.wait_for_node_exit().await
        })
        .unwrap();
}
\`\`\`

Walk:

- **\`Cli<...>::parse()\`** — Reth の CLI 機構。第 2 ジェネリックパラメータがあなたのカスタム args struct、標準 Reth CLI フラグにマージされる。\`reth node --enable-txpool-plus --http\` で動く。
- **\`extend_rpc_modules(|ctx| { ... })\`** — クロージャは起動時に 1 回走る、ノード構築後 + RPC サーバ起動前。\`ctx\` は \`pool()\`、\`provider()\`、\`network()\`、\`tasks()\` を公開 — RPC ハンドラが必要とする全コンポーネント。
- **\`ctx.modules.merge_configured(ext.into_rpc())\`** — \`into_rpc()\` は \`#[rpc]\` マクロが生成したメソッド; \`RpcModule\` を作る。\`merge_configured\` がそれを Reth の既存ディスパッチテーブルに **設定された全トランスポートに対して** はめ込む (\`--http\` なら HTTP、\`--ws\` なら WS、\`--ipc\` なら IPC)。1 行、3 トランスポート。

> 🔍 **リポで探す。** [\`reth/examples/node-custom-rpc\`](https://github.com/paradigmxyz/reth/tree/main/examples/node-custom-rpc) を開く — Paradigm 公式 example。同じ形を使っている。**書いたものと並べて比較。** 構造的スケルトンは同一; 違うのは namespace、メソッド名、ハンドラ内で何をするか。

## Step 4: cast でテスト

ビルド、走らせる、query:

\`\`\`bash
# 1 つのターミナル: ノード起動
$ cargo run --release -- node --http --enable-txpool-plus

# 別のターミナル: 新メソッドを叩く
$ cast rpc txpoolPlus_pendingByGasBucket --rpc-url http://localhost:8545
[{"min_gwei":0,"max_gwei":1,"count":12}, ...]

# 生 curl
$ curl -X POST http://localhost:8545 \\
    -H "Content-Type: application/json" \\
    -d '{"jsonrpc":"2.0","method":"txpoolPlus_pendingByGasBucket","params":[],"id":1}'
{"jsonrpc":"2.0","result":[{"min_gwei":0,"max_gwei":1,"count":12}, ...],"id":1}
\`\`\`

メソッドはどの RPC クライアントから見てもネイティブと区別がつかない。**同じ認証、同じレート制限 (設定していれば)、同じロギング。** それが \`extend_rpc_modules\` の contract。

## Step 5 (おまけ): subscription バリアント

WebSocket subscription は同じパターン、\`#[subscription(...)]\` 属性付き:

\`\`\`rust
use jsonrpsee::{core::SubscriptionResult, PendingSubscriptionSink, SubscriptionMessage};
use std::time::Duration;
use tokio::time::sleep;

#[rpc(server, namespace = "txpoolPlus")]
pub trait TxpoolPlusApi {
    #[method(name = "pendingByGasBucket")]
    fn pending_by_gas_bucket(&self) -> RpcResult<Vec<GasBucket>>;

    #[subscription(name = "subscribeBuckets", item = Vec<GasBucket>)]
    fn subscribe_buckets(&self, interval_secs: Option<u64>) -> SubscriptionResult;
}

// impl 内:
fn subscribe_buckets(
    &self,
    pending: PendingSubscriptionSink,
    interval_secs: Option<u64>,
) -> SubscriptionResult {
    let pool = self.pool.clone();
    let interval = Duration::from_secs(interval_secs.unwrap_or(5));

    tokio::spawn(async move {
        let Ok(sink) = pending.accept().await else { return };
        loop {
            sleep(interval).await;
            let buckets = compute_buckets(&pool); // Step 2 から factor out
            let Ok(raw) = serde_json::value::to_raw_value(&buckets) else { continue };
            if sink.send(SubscriptionMessage::from(raw)).await.is_err() { return; }
        }
    });
    Ok(())
}
\`\`\`

Walk:

- **\`PendingSubscriptionSink\` → \`accept().await\` → \`sink.send(...)\`** — \`jsonrpsee\` 標準 subscription handshake。
- **クロージャは \`tokio::spawn\` で走る** — RPC ハンドラは即 return; 実際のストリーミングはバックグラウンドタスク。**ここでブロックしたら RPC サーバスレッドが stall する。**
- **\`sink.send(...).is_err()\`** — クライアント切断 or channel フル; clean に return してタスクが exit。**subscription leak なし。**

これでダッシュボードが \`eth_subscribe("txpoolPlus_subscribeBuckets", [10])\` で 10 秒ごとの live ヒストグラムを受け取れる、サーバ側集計済みで。

## Production に足りないもの

| ギャップ | 本物のカスタム RPC が何をしているか |
| :--- | :--- |
| **認証** | engine API と同じ \`AUTH_SECRET\` 機構; Reth が \`extend_rpc_modules\` 経由で自動 wire する、ただしメソッドが respect しているかは確認すべき (大半の \`ctx\` accessor は respect する) |
| **レート制限** | Reth はメソッド単位レート制限を ship しない; production は \`tower\` ミドルウェアで wrap、または impl 内で閾値超えを reject |
| **クライアント単位の状態** | subscription はデフォルトで接続単位。クライアント間調整 (例: 共有キャッシュ無効化) には impl struct 内で \`Arc<RwLock<...>>\` |
| **バージョニング** | レスポンス形が変わったら namespace を bump (\`txpoolPlus_v2_*\`); 古いクライアントは動き続けるべき |
| **メトリクス** | Reth の RPC レイヤーはメソッド単位 latency/count を metrics endpoint で公開、ただしネイティブのみ。ハンドラ内に自分の \`metrics::counter!(...)\` を追加 |
| **引数バリデーション** | \`RpcResult\` で \`ErrorObjectOwned::owned(code, message, data)\` を clean に返せる。安定したコードを選ぶ; 標準 JSON-RPC エラーコードを reuse しない (-32603 = "internal error" は予約済み) |

書いたアーキテクチャ — trait 定義、コンポーネントアクセス付き impl、\`extend_rpc_modules\` 経由で登録 — **production の Reth カスタム RPC が全部こう見える**。50 行スケルトンは同じ; impl 本体に各プロジェクトの価値が宿る。

## Drill

1. **\`pendingByNonce(address)\` を追加。** 指定アドレスから現在 pending の tx 数を nonce ごとに返す 2 つ目のメソッド。パターン: 同じ trait、2 つ目の \`#[method]\`、2 つ目のハンドラ。(15分)
2. **gas price (post-EIP-1559) でバケット化。** priority-fee バケット化を effective-gas-price バケット化に置き換える (\`base_fee + priority_fee\`、\`max_fee_per_gas\` で cap)。base fee を provider から取得する必要あり。**\`ctx\` は何を公開している?** (30分)
3. **メソッドを auth-gate。** \`txpoolPlus_pendingByGasBucket\` を engine \`AUTH_SECRET\` を提示しない呼び出しは reject する。(ヒント: Reth の debug メソッドがどうやってるか見る) (45分)
4. **スナップショットの新鮮さ。** レスポンスにスナップショットごとのタイムスタンプ + monotonic ブロック高を追加。\`ctx.provider().best_block_number()\` が 2 つ目の真の source。(30分)
5. **クロスティア統合。** このティアの lesson 1 の MEV searcher が \`txpoolPlus_pendingByGasBucket\` を query して 90 パーセンタイル超えで自分の入札を設定できる。\`jsonrpsee::http_client\` を使ってこれをやる Rust クライアントを追加。(2時間)

Drill 5 を完成させればループが閉じる: ノード固有の insight を typed RPC として公開するノード、その insight を mempool で勝つために使う別 Rust プロセスが consume する。**そのラウンドトリップ — カスタム RPC 経由の observability、別 consumer 経由の挙動 — は本物の searcher / market-maker スタックがどう組織されているか。**

> 🛑 **最終チェック。** 一文で: なぜ \`extend_rpc_modules\` は、Reth の標準 RPC を呼ぶ sidecar サービスを動かすより厳密に強力か? 答えに「ノードコンポーネントへの in-process アクセス」がないなら、Step 3 を読み直し — そのアクセスがレバレッジ。

## 📺 関連動画

\`\`\`youtube
GhEhzE9SFqY | Alexey Shekhirin — Using Reth Execution Extensions for next generation indexing (Devcon 2024) — 別の拡張点 (ExEx)、同じノード拡張哲学
\`\`\`
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
