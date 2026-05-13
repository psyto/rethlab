import { PrismaClient } from '@prisma/client';

export async function seedRethBuildingJA(prisma: PrismaClient) {
  const tags = ['reth', 'revm', 'alloy', 'rust', 'mev', 'building', 'application', 'capstone'];

  await prisma.course.create({
    data: {
      slug: 'reth-building-ja',
      title: 'Building with the Stack — 実アプリを作る',
      description:
        'ソースを読めるのは前提条件、このティアはその payoff です — Rust + Alloy + Revm の動くアプリ 9 本: 最小 MEV searcher、reorg-aware Postgres indexer (ExEx)、カスタム RPC エンドポイント、wallet backend、EIP-7702 sponsor、Foundry スタイル cheatcode、swap aggregator、すべてを統合する frontrun-resistant order router の capstone、そして cross-client validation harness。',
      difficulty: 'EXPERT',
      duration: 420,
      xpReward: 100,
      track: 'reth-building',
      tags,
      isPublished: true,
      sortOrder: 410,
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

mempool (public な未確定トランザクションキュー) に、Uniswap プールの価格を動かしそうな swap が現れる。**そのトランザクションが取り込まれる前に、自分のラップトップで — ネットワーク上のプロの searcher と同じタイミングで — その swap が生む arb を検知できるか?** これが本レッスンで作るものです。Rust ~200 行: public mempool を監視 → 候補トランザクションを fork した Revm (Reth の EVM エンジン、ローカルで mainnet 状態に対して動かす) でシミュレート → 2-hop アービトラージ機会を検出 → Flashbots スタイルの bundle を構築。

\`add\`、\`Stage\` トレイト、\`identity_run\` を読んできました。次はその機械で組み立てる番です。

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

> 🛑 **スクロール前に予測。** なぜ provider に \`eth_call\` で問い合わせる代わりに、ローカルで fork してシミュレートするのか? *\`eth_call\` が返すもの vs. 自分が必要とするもの* について、一文で答えてください。答えを書き留めてから先へ。

## なぜ Rust + Alloy + Revm か

- **Rust** — 決定論的レイテンシ。GC (ガーベジコレクタ) pause なし。エッジが「このブロックに乗るか、次か」のマイクロ秒の差にかかっている時、これが効く。
- **Revm** — **RPC ラウンドトリップなしで** ローカルシミュレーション。Infura への \`eth_call\` (chain 上で read-only に実行する標準 RPC) は wire 越しに ~30〜80 ms。Revm をインメモリキャッシュで叩くと **~200 µs**。2 桁速い。さらに \`eth_call\` は *結果のみ* 返す — Revm は **state delta** (どのスロットがいくら変わったか) を返す。アービ検出に必要なのはまさに後者。
- **Alloy** — \`sol!\` (Solidity シグネチャを Rust 構造体に展開するマクロ) による型付きコントラクトバインディング、型付き Provider、手書き ABI エンコード不要。Solidity 一辺倒の開発者が払う配管税が消える。

Flashbots / Frontier / お気に入りのブロックビルダー全員が production で使っているのと同じスタック。おもちゃではない。

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
    // Provider 例: QuickNode、Alchemy、Infura、または自前 Reth ノード。
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

> 🛑 **理解度チェック。** スクロール戻しなしで: なぜ \`sol!\` が手書きセレクタより優れているか? 「便利」と言わずに、\`sol!\` が防いでくれる失敗モードを2つ挙げてください。(ヒント: 上流の Solidity ABI 変更、セレクタハッシュ計算ミス、を考えて)

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

## このティアの先

**Building with the Stack** ティアは 8 lesson 全部 ship 済み。ここから:

- **L2** — Reorg-aware Postgres indexer (ExEx 駆動、in-process)
- **L3** — \`extend_rpc_modules\` 経由のカスタム RPC エンドポイント
- **L4** — Wallet backend (signer pool + nonce manager + replace-on-stuck)
- **L5** — EIP-7702 sponsor service (Type 4 tx + paymaster パターン)
- **L6** — Foundry スタイル cheatcode (custom precompile + 最小ハーネス)
- **L7** — Swap aggregator (Revm fork + 横断 venue クオート)
- **L8 (Capstone)** — 上記すべてを統合する frontrun-resistant order router

各々が自己完結した ~200〜300 行の build、同じ predict / find-in-repo / anti-fluency スタイル。ターゲットユースケースに合うものから選ぶ。
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

Etherscan、Dune、すべてのリクイデーション bot — どれも同じ問題を解いている: **チェーンを自分のデータストアに読み込み、reorg が起きても壊さない** (*reorg* とは、一時的にノードがチェーンの先端で食い違い、別ブロックが勝つこと — 結果、自分の DB には「もう存在しないブロック」の行が残る)。ExEx (Reth の Execution Extension API — Reth プロセス内で動くカスタムコードのフック) は、これを 2,000 行のサイドプロジェクトから ~250 行の単一ファイルに変える機構です。それを作ります。

> 📌 **スコープの正直な開示。** ERC-20 Transfer イベントを Postgres にインデックスする (フル reorg 対応 — \`ChainCommitted\` で commit、\`ChainReverted\` で undo、\`ChainReorged\` で swap)。データの上に public API を載せる部分は構築しない。それは indexer の後半で、本レッスンが答える問いとは直交: *「ノード速度で正しいチェーンデータをデータストアに入れるには?」*

> 📚 **参考。** [QuickNode の *How to Build and Deploy Reth ExExs*](https://www.quicknode.com/guides/infrastructure/how-to-use-reth-exex) は本レッスンが乗る ExEx 機構の良い primer。ここではそれを土台に、Postgres 書き込み・FinishedHeight シグナル・production gaps まで含む完全な reorg-aware indexer を組み上げる。

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

> 🛑 **スクロール前に予測。** なぜ「in-process」がここでのアーキテクチャ的な勝ちか? ノード外で動くことが indexer に強いる作業のうち、内側に住むことでスキップできるものを、一文で答えてください。Step 2 まで答えを書き留めてから先へ。

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

> 🛑 **理解度チェック。** スクロール戻しなしで: なぜ Reth はあなたの一番遅い ExEx の \`FinishedHeight\` より先のブロックを prune したがらないのか? 自分の言葉で答えてください。ヒント: ノード再起動時に、ExEx がまだ処理していないブロックを Reth がすでに prune してしまっていたら何が起きるか考えて。(ネタバレ: あなたの indexer がそのブロックを永久にスキップ、データが間違う、誰かが query するまで気づかない)

## Production に足りないもの

| ギャップ | 本物の indexer が何をしているか |
| :--- | :--- |
| **Backpressure** | Postgres が遅いと ExEx が stall して Reth の notification channel が back up する。Production は writer を bounded queue で wrap + 溢れたら disk-buffer に dump |
| **スキーママイグレーション** | sqlx migrations を使う (ここでも最低限使った)。Production は起動時に lock 取って running する (replica レース防止) |
| **Self-hosted Reth 運用** | クラスタ運用、ピア管理、snapshot リカバリ。代替: [QuickNode Dedicated Clusters](https://www.quicknode.com/guides/infrastructure/node-setup/how-to-run-a-reth-node) でマネージド Reth を選択可能 — ExEx が value-add でノード運用が本業ではない場合に有用 |
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

fee-bidding bot のために、pending tx の gas price ヒストグラムを 1 回の API 呼び出しで返してほしい。標準の \`txpool_content\` は *pending tx を全部フルで* 返す — 結局 10 個の数字にまとめるのに、数百 KB を転送することになる。正解の動きは、**ノード内で**集計してヒストグラムだけ返す独自メソッドを追加すること。Rust ~50 行。Reth fork なし。ネイティブネームスペース (\`eth_*\`、\`net_*\`、\`debug_*\`、\`txpool_*\` ...) と同じ HTTP / WebSocket / IPC エンドポイントで live になる。

> 📌 **スコープの正直な開示。** 読み取り専用メソッド 1 つ (\`txpoolPlus_pendingByGasBucket\`) を追加する — ローカル mempool を 10 個の gas-price バケットに集計するもの。認証、レート制限、書き込みメソッドは扱わない — それらは同じパターンの上に重ねるレイヤー。アーキテクチャ的レッスンは「trait はどう wire される?」。

> 📚 **参考。** [QuickNode の *How to Build Custom RPC Methods with Reth*](https://www.quicknode.com/guides/infrastructure/build-custom-rpc-methods-with-reth) は custom RPC trait 登録の基礎をカバー。ここではそれを土台に、サーバーサイド集計・subscription バリアント・本物のカスタム RPC が閉じる必要のある production gaps まで構築する。

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

> 🛑 **スクロール前に予測。** なぜ *サーバーサイド集計* が勝ちか? \`txpool_content\` が返すもの vs ダッシュボードが実際に必要とするもの — ペイロードサイズについて一文で答えてください。答えを書き留めてから先へ。

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

> 🛑 **理解度チェック。** スクロール戻しなしで: なぜ \`pool.pending()\` がここでは安価で、本物の \`txpool_content\` RPC は重いか? ヒント: \`pending()\` が返すもの vs \`txpool_content\` が wire のためにマテリアライズするものを考えて。

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
| **Self-hosted Reth 運用** | Reth を自分で動かしたくない場合、[QuickNode Dedicated Clusters](https://www.quicknode.com/guides/infrastructure/node-setup/how-to-run-a-reth-node) で Reth を execution client として選択、自前のカスタム RPC バイナリを value-add として shipping できる |
| **バージョニング** | レスポンス形が変わったら namespace を bump (\`txpoolPlus_v2_*\`); 古いクライアントは動き続けるべき |
| **メトリクス** | Reth の RPC レイヤーはメソッド単位 latency/count を metrics endpoint で公開、ただしネイティブのみ。ハンドラ内に自分の \`metrics::counter!(...)\` を追加 |
| **引数バリデーション** | \`RpcResult\` で \`ErrorObjectOwned::owned(code, message, data)\` を clean に返せる。安定したコードを選ぶ; 標準 JSON-RPC エラーコードを reuse しない (-32603 = "internal error" は予約済み) |

書いたアーキテクチャ — trait 定義、コンポーネントアクセス付き impl、\`extend_rpc_modules\` 経由で登録 — **production の Reth カスタム RPC が全部こう見える**。50 行スケルトンは同じ; impl 本体に各プロジェクトの価値が宿る。

## Drill

1. **\`pendingByNonce(address)\` を追加。** 指定アドレスから現在 pending の tx 数を nonce ごとに返す 2 つ目のメソッド。パターン: 同じ trait、2 つ目の \`#[method]\`、2 つ目のハンドラ。(15分)
2. **gas price (post-EIP-1559) でバケット化。** priority-fee バケット化を effective-gas-price バケット化に置き換える (\`base_fee + priority_fee\`、\`max_fee_per_gas\` で cap)。base fee を provider から取得する必要あり。**\`ctx\` は何を公開している?** (30分)
3. **メソッドを auth-gate。** \`txpoolPlus_pendingByGasBucket\` を engine \`AUTH_SECRET\` を提示しない呼び出しは reject する。(ヒント: Reth の debug メソッドがどうやってるか見る) (45分)
4. **スナップショットの新鮮さ。** レスポンスにスナップショットごとのタイムスタンプ + monotonic ブロック高を追加。\`ctx.provider().best_block_number()\` が 2 つ目の真の source。(30分)
5. **クロスティア統合。** このティアの [lesson 1](/courses/reth-building-ja/lessons/build-mev-searcher-ja) の MEV searcher が \`txpoolPlus_pendingByGasBucket\` を query して 90 パーセンタイル超えで自分の入札を設定できる。\`jsonrpsee::http_client\` を使ってこれをやる Rust クライアントを追加。(2時間)

Drill 5 を完成させればループが閉じる: ノード固有の insight を typed RPC として公開するノード、その insight を mempool で勝つために使う別 Rust プロセスが consume する。**そのラウンドトリップ — カスタム RPC 経由の observability、別 consumer 経由の挙動 — は本物の searcher / market-maker スタックがどう組織されているか。**

> 🛑 **最終チェック。** 一文で: なぜ \`extend_rpc_modules\` は、Reth の標準 RPC を呼ぶ sidecar サービスを動かすより厳密に強力か? 答えに「ノードコンポーネントへの in-process アクセス」がないなら、Step 3 を読み直し — そのアクセスがレバレッジ。

`,
                },
                {
                  title: 'Wallet Backend を Rust で作る',
                  slug: 'build-wallet-backend-ja',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 45,
                  xpReward: 80,
                  content: `# Wallet Backend を Rust で作る

ユーザーが 1 分間に「Send」を 50 回押す。あなたの wallet は: 次の *nonce* (アカウントごとのトランザクション順序を決めるカウンタ) を衝突なしに選び、正しい鍵で署名し、broadcast し、mempool を監視し、そして — ガス価格が 5 gwei から 80 gwei へ急騰した時 — **詰まった tx の fee を bump して置換する**。これでユーザーのセッションが「捨て値で送ったたった 1 件」の後ろでデッドロックしない。Wallet UI が有名な部分。背後の send service こそチームが実際に格闘する部分。以下、Rust ~250 行 — signer pool、nonce manager、send queue、replace-on-stuck、confirm watcher。

> 📌 **スコープの正直な開示。** **サービス** を作る — signer pool + nonce manager + send queue + replace-on-stuck + confirm watcher — 小さな HTTP API で公開。鍵カストディ (HSM, MPC, KMS)、フィアットオンランプ、JS SDK は扱わない。これらのレイヤーは全部、動く send service の *上に* 乗る; 本レッスンは動かなければならない部分を作る。

## 何を作るか

公開するバックエンドサービス:

\`\`\`bash
$ curl -X POST http://localhost:7000/send \\
    -H "Content-Type: application/json" \\
    -d '{
      "from":  "0xAlice...",
      "to":    "0xBob...",
      "value": "0x16345785d8a0000",
      "data":  "0x"
    }'
{ "tx_hash": "0xabc...", "queued_at": "2026-05-04T12:34:56Z" }
\`\`\`

その 1 つの POST の裏で: from-address による signer ルックアップ、nonce 予約、ガス価格計算、tx 署名、Alloy 経由でブロードキャスト、**そして 30 秒以内に着地しなければ fee を bump するバックグラウンド watcher**。

\`\`\`mermaid
flowchart TB
    Client["HTTP client"] -->|POST /send| API["axum handler"]
    API -->|reserve nonce| NM["NonceManager<br/>(per-address)"]
    API -->|build & sign| Signer["PrivateKeySigner<br/>(env からロード)"]
    API -->|broadcast| Provider["Alloy Provider"]
    API -->|track| Q["pending queue<br/>(tx_hash, deadline, fee)"]
    Q -->|every 5s| Watcher["confirm watcher"]
    Watcher -->|landed?| Provider
    Watcher -->|stuck > 30s| Bump["bump fee 1.25x<br/>+ resubmit"]
    Bump --> Q
\`\`\`

> 🛑 **スクロール前に予測。** ナイーブな方法は「nonce を RPC から取得、署名、送信」。同じ from-address で 100 ms 以内に POST /send を 2 回叩いた時に何が壊れるか walk through。**何が具体的に間違うか一文で答えてください。** 答えを書き留めてから先へ。

## なぜこれが難しいか

| 問題 | ナイーブな方式 | 何が間違うか |
| :--- | :--- | :--- |
| **Nonce 競合** | 送信ごとに \`provider.get_transaction_count(from).await\` | 並行する 2 つの送信が両方 nonce N を読み、両方 N で署名、1 つしか着地しない。もう 1 つは mempool で reject される。 |
| **Stuck tx** | gas price が十分高いことを祈る | mainnet ガスは数秒で 5 → 80 gwei に急騰する。あなたの tx は何時間も mempool に座る。 |
| **置換ロジック** | 「同じ nonce で再送信するだけ」 | 大半のノードは fee を ≥10% bump しない置換を reject する。ナイーブ再送は silently 失敗する。 |
| **Confirmation 喪失** | \`eth_sendRawTransaction\` の return を信じる | tx hash は「受け付けた」; 「着地した」ではない。Network reorg と peer drop は起きる。 |

本物の wallet backend は各々を解決する。4 つ全部やる。

## Cargo.toml

\`\`\`toml
[package]
name = "wallet-backend"
version = "0.1.0"
edition = "2021"

[dependencies]
# Alloy
alloy-primitives    = "1.5"
alloy-provider      = "1.0"
alloy-rpc-types     = "1.0"
alloy-network       = "1.0"
alloy-signer        = "1.0"
alloy-signer-local  = "1.0"
alloy-consensus     = "2.0"
alloy-eips          = "1.0"

# HTTP サーバ
axum                = "0.7"

# 配管
tokio               = { version = "1", features = ["full"] }
serde               = { version = "1", features = ["derive"] }
serde_json          = "1"
eyre                = "0.6"
tracing             = "0.1"
tracing-subscriber  = "0.3"
\`\`\`

## Step 1: Signer pool + nonce manager

コア不変条件: **各アドレスは next nonce の真の source を 1 つだけ持つ**、その source は in-process 状態であって新しい RPC コールではない:

\`\`\`rust
use alloy_primitives::Address;
use alloy_signer_local::PrivateKeySigner;
use std::{collections::HashMap, sync::Arc};
use tokio::sync::Mutex;

pub struct SignerPool {
    inner: HashMap<Address, PrivateKeySigner>,
}

impl SignerPool {
    pub fn from_env() -> eyre::Result<Self> {
        // SIGNERS env 変数: comma 区切りの 0x プレフィクス付き秘密鍵
        let mut inner = HashMap::new();
        for hex in std::env::var("SIGNERS")?.split(',') {
            let signer: PrivateKeySigner = hex.trim().parse()?;
            inner.insert(signer.address(), signer);
        }
        Ok(Self { inner })
    }

    pub fn get(&self, addr: &Address) -> Option<&PrivateKeySigner> {
        self.inner.get(addr)
    }
}

#[derive(Clone)]
pub struct NonceManager {
    state: Arc<Mutex<HashMap<Address, u64>>>,
}

impl NonceManager {
    pub fn new() -> Self {
        Self { state: Arc::new(Mutex::new(HashMap::new())) }
    }

    /// \`addr\` の next nonce を予約、初回は RPC で初期化
    pub async fn reserve<P: alloy_provider::Provider>(
        &self,
        addr: Address,
        provider: &P,
    ) -> eyre::Result<u64> {
        let mut state = self.state.lock().await;
        let nonce = match state.get(&addr) {
            Some(&n) => n,
            None => provider.get_transaction_count(addr).pending().await?,
        };
        state.insert(addr, nonce + 1);
        Ok(nonce)
    }

    /// \`addr\` のキャッシュ nonce をリセット (回復不能な submission 失敗後に呼ぶ)
    pub async fn forget(&self, addr: Address) {
        self.state.lock().await.remove(&addr);
    }
}
\`\`\`

Walk:

- **nonce 状態に \`Arc<Mutex<HashMap>>\`** — そう、グローバル mutex 1 つ。送信スループットは *署名速度* で律速されている、ロック競合ではない; ここの critical section は数マイクロ秒。計測前に sharded lock で先回り最適化しないこと。
- **\`provider.get_transaction_count(addr).pending()\`** — \`pending\` がキー単語。デフォルトの \`get_transaction_count\` は confirmed-only 数を返す; \`pending\` は mempool に座っている tx を含む。**pending が欲しい** — confirmed-only だと既に in-flight の nonce を再利用してしまう。
- **\`reserve\` が \`async\` なのは *初回* が RPC を打つから。** 以降は純粋なローカル状態。slow path (cold start) は 1 RPC、hot path (継続送信) はゼロ。
- **\`forget\` は安全弁。** submission が "nonce too low" 等で失敗したら、in-memory 状態がチェーンから drift している — drop して次回コールで RPC から再初期化させる。

> 🔍 **リポで探す。** [\`alloy-signer-local\`](https://github.com/alloy-rs/alloy/tree/main/crates/signer-local) を開く。hex 文字列から parse した \`PrivateKeySigner\` は、keystore ファイル (\`PrivateKeySigner::decrypt_keystore\`) や mnemonic からも得られる同じ型。**send service はどれかを気にしない。**

## Step 2: ガス見積もり (EIP-1559)

EIP-1559 ガス: \`max_priority_fee_per_gas\` (validator への tip) + \`base_fee\` (バーンされる、プロトコルがブロックごとに設定)。あなたの \`max_fee_per_gas\` は合計の上限。

\`\`\`rust
use alloy_eips::eip1559::Eip1559Estimation;

#[derive(Clone, Copy, Debug)]
pub struct GasParams {
    pub max_fee_per_gas: u128,
    pub max_priority_fee_per_gas: u128,
}

pub async fn estimate_gas<P: alloy_provider::Provider>(provider: &P) -> eyre::Result<GasParams> {
    let est: Eip1559Estimation = provider.estimate_eip1559_fees().await?;
    Ok(GasParams {
        max_fee_per_gas: est.max_fee_per_gas,
        max_priority_fee_per_gas: est.max_priority_fee_per_gas,
    })
}

pub fn bump(params: GasParams) -> GasParams {
    // 25% bump — 大半のクライアントの mempool 最低値 10% より余裕を持たせる
    GasParams {
        max_fee_per_gas: params.max_fee_per_gas * 125 / 100,
        max_priority_fee_per_gas: params.max_priority_fee_per_gas * 125 / 100,
    }
}
\`\`\`

Walk:

- **\`provider.estimate_eip1559_fees()\`** — Alloy のヘルパで、内部で \`eth_feeHistory\` を呼んで直近数ブロックから sane な \`(max_fee, priority_fee)\` を返す。**簡単なケースで fee 数学を手書きしない**; ヘルパを使う。
- **\`bump\` は 25% であって 10% ではない。** mempool の最小置換 bump は大半のクライアント (geth, Reth, Erigon) で 10%。ちょうど 10% で送ると、ノードの \`>\` vs \`>=\` チェックが浮動小数で trip しないことを賭けることになる。**25% は常に動く安全マージン。**
- **見積もりに *リトライしない*。** \`estimate_eip1559_fees\` が失敗したら provider が不調; 今すぐ送信するのは安全じゃない。

## Step 3: 送信 + 確認用キュー

\`\`\`rust
use alloy_consensus::{TxEip1559, SignableTransaction};
use alloy_network::{TxSignerSync, TransactionBuilder};
use alloy_primitives::{Bytes, U256};
use alloy_rpc_types::TransactionRequest;
use std::time::{Duration, Instant};

#[derive(Clone)]
pub struct PendingTx {
    pub from: Address,
    pub nonce: u64,
    pub current_hash: alloy_primitives::B256,
    pub gas_params: GasParams,
    pub deadline: Instant,
    pub original_request: TransactionRequest,
}

pub async fn send_one<P: alloy_provider::Provider>(
    provider: &P,
    pool: &SignerPool,
    nm: &NonceManager,
    req: TransactionRequest,
) -> eyre::Result<PendingTx> {
    let from = req.from.ok_or_else(|| eyre::eyre!("from required"))?;
    let signer = pool.get(&from).ok_or_else(|| eyre::eyre!("unknown signer: {from}"))?;

    let nonce = nm.reserve(from, provider).await?;
    let gas = estimate_gas(provider).await?;
    let chain_id = provider.get_chain_id().await?;

    let req = req
        .with_nonce(nonce)
        .with_chain_id(chain_id)
        .with_gas_limit(req.gas.unwrap_or(100_000))
        .with_max_fee_per_gas(gas.max_fee_per_gas)
        .with_max_priority_fee_per_gas(gas.max_priority_fee_per_gas);

    let tx = req.clone().build(&signer.clone().into()).await?;
    let raw = tx.encoded_2718();
    let pending = provider.send_raw_transaction(&raw).await?;

    Ok(PendingTx {
        from,
        nonce,
        current_hash: *pending.tx_hash(),
        gas_params: gas,
        deadline: Instant::now() + Duration::from_secs(30),
        original_request: req,
    })
}
\`\`\`

Walk:

- **署名前に nonce 予約、後ではない** — 並行下で順序が重要。署名後に予約すると、並行する 2 つの送信が同じ nonce で署名でき、片方だけが勝つ。
- **\`build(&signer.clone().into())\`** — Alloy の \`TransactionBuilder\` が裏で \`sign_transaction_sync\` を呼ぶ。\`PrivateKeySigner\` は sync; remote signer (KMS, HSM) に切り替えたら async になり signature が変わる — でも関数の残りは変わらない。
- **\`send_raw_transaction\` は \`PendingTransactionBuilder\` を返す。** ここでは \`.await.confirmations(N)\` しない; **watcher** (Step 4) が confirmation を所有する。送信パスは即時 return して API が早く応答できる。

## Step 4: replace-on-stuck 付きの confirm watcher

バックグラウンドループ。1 つの tokio タスクが全 queued tx を監視; deadline 超過は fee bump する:

\`\`\`rust
use std::collections::HashMap;
use tokio::sync::RwLock;
use tokio::time::sleep;

#[derive(Clone)]
pub struct PendingQueue {
    inner: Arc<RwLock<HashMap<alloy_primitives::B256, PendingTx>>>,
}

impl PendingQueue {
    pub fn new() -> Self { Self { inner: Arc::new(RwLock::new(HashMap::new())) } }

    pub async fn insert(&self, ptx: PendingTx) {
        self.inner.write().await.insert(ptx.current_hash, ptx);
    }
}

pub async fn watcher<P: alloy_provider::Provider + Clone>(
    provider: P,
    pool: SignerPool,
    queue: PendingQueue,
) {
    loop {
        sleep(Duration::from_secs(5)).await;

        // RPC 中に read lock を持たないようスナップショット
        let snapshot: Vec<PendingTx> = queue.inner.read().await.values().cloned().collect();

        for mut ptx in snapshot {
            // Inclusion チェック
            if let Ok(Some(_receipt)) = provider.get_transaction_receipt(ptx.current_hash).await {
                queue.inner.write().await.remove(&ptx.current_hash);
                tracing::info!(hash = ?ptx.current_hash, "landed");
                continue;
            }

            // Stuck? bump して resubmit
            if Instant::now() >= ptx.deadline {
                let bumped = bump(ptx.gas_params);
                let signer = pool.get(&ptx.from).expect("signer missing");
                let req = ptx.original_request
                    .clone()
                    .with_max_fee_per_gas(bumped.max_fee_per_gas)
                    .with_max_priority_fee_per_gas(bumped.max_priority_fee_per_gas);

                match req.build(&signer.clone().into()).await {
                    Ok(tx) => {
                        let raw = tx.encoded_2718();
                        if let Ok(p) = provider.send_raw_transaction(&raw).await {
                            let new_hash = *p.tx_hash();
                            let mut w = queue.inner.write().await;
                            w.remove(&ptx.current_hash);
                            ptx.current_hash = new_hash;
                            ptx.gas_params = bumped;
                            ptx.deadline = Instant::now() + Duration::from_secs(30);
                            w.insert(new_hash, ptx);
                            tracing::warn!("bumped + resubmitted");
                        }
                    }
                    Err(e) => tracing::error!(?e, "rebuild failed"),
                }
            }
        }
    }
}
\`\`\`

Walk:

- **スナップショット、それから iterate。** \`get_transaction_receipt\` 中ロックを保持すると、queue 全体が 1 つの RPC の後ろに直列化される。スナップショットで Vec アロケーションと並列性をトレード。
- **\`get_transaction_receipt\` が \`Some\` を返すのが inclusion シグナル。** これは *eventual* consistency — tx がブロック N に含まれても receipt が N+1 で見えるのは RPC キャッシュの遅延; 5 秒 poll がその遅延を吸収する。
- **bump 戦略は 25%、繰り返し。** deadline を逃すサイクルごとに重ねる。3 回 bump 後、5 gwei で始まった tx は \`5 × 1.25³ ≈ 9.77\` gwei。Production は network 全体の急騰で予算を吹き飛ばさないよう設定可能 max で cap する。
- **\`expect("signer missing")\`** — 構造上、queue に入っているものは pool 内の鍵で署名されたもの。ここで panic は不変条件が破れている合図; 静かに drop するより良い。

> 🛑 **理解度チェック。** スクロール戻しなしで: なぜ watcher は stuck tx を *もっと長く待つ* のではなく *同じ nonce + 高い fee で置換* するのか? ヒント: 前の nonce が stuck の時 **次の nonce が何でブロックされる** か考えて。

## Step 5: HTTP API スケルトン (axum)

\`\`\`rust
use axum::{extract::State, routing::post, Json, Router};
use serde::{Deserialize, Serialize};

#[derive(Clone)]
pub struct AppState<P: alloy_provider::Provider + Clone + 'static> {
    pub provider: P,
    pub signers: Arc<SignerPool>,
    pub nonces: NonceManager,
    pub queue: PendingQueue,
}

#[derive(Deserialize)]
pub struct SendRequest {
    from: Address,
    to: Address,
    value: U256,
    data: Option<Bytes>,
    gas: Option<u64>,
}

#[derive(Serialize)]
pub struct SendResponse {
    tx_hash: alloy_primitives::B256,
}

async fn handle_send<P: alloy_provider::Provider + Clone + 'static>(
    State(state): State<AppState<P>>,
    Json(req): Json<SendRequest>,
) -> Result<Json<SendResponse>, (axum::http::StatusCode, String)> {
    let tx_req = TransactionRequest::default()
        .with_from(req.from)
        .with_to(req.to)
        .with_value(req.value)
        .with_input(req.data.unwrap_or_default())
        .with_gas_limit(req.gas.unwrap_or(100_000));

    let pending = send_one(&state.provider, &state.signers, &state.nonces, tx_req)
        .await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let hash = pending.current_hash;
    state.queue.insert(pending).await;
    Ok(Json(SendResponse { tx_hash: hash }))
}

#[tokio::main]
async fn main() -> eyre::Result<()> {
    tracing_subscriber::fmt::init();

    let provider = alloy_provider::ProviderBuilder::new()
            // Provider 例: QuickNode、Alchemy、Infura、または自前 Reth ノード。
.connect(&std::env::var("RPC_URL")?)
        .await?;

    let state = AppState {
        provider: provider.clone(),
        signers: Arc::new(SignerPool::from_env()?),
        nonces: NonceManager::new(),
        queue: PendingQueue::new(),
    };

    // Watcher を spawn
    {
        let p = provider.clone();
        let s = (*state.signers).clone();  // Note: SignerPool に Clone が必要
        let q = state.queue.clone();
        tokio::spawn(async move { watcher(p, s, q).await });
    }

    let app = Router::new()
        .route("/send", post(handle_send))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:7000").await?;
    axum::serve(listener, app).await?;
    Ok(())
}
\`\`\`

これで全サービス完成。インポートを含めて ~250 行。

> 🔍 **リポで探す。** [\`alloy-rpc-types\`](https://github.com/alloy-rs/alloy/tree/main/crates/rpc-types-eth) を開く。\`TransactionRequest\` を見つける。全 \`with_*\` builder メソッドが拡張する *同じ* 型。**あなたの wallet backend、arb bot、deployment スクリプト — すべてこの同じ型から tx を組み立てる。** それが Alloy のレバレッジ。

## Production に足りないもの

| ギャップ | 本物の wallet backend が何をしているか |
| :--- | :--- |
| **鍵カストディ** | KMS / HSM / MPC (例: Fireblocks、ZenGo、Privy)。\`PrivateKeySigner\` は自己保管 / hot ops には OK; ユーザ資金には NG |
| **冪等性** | \`/send\` endpoint は \`request_id\` を受けて dedupe すべき。ナイーブな POST/retry はユーザを double-spend させかねない |
| **鍵単位レート制限** | API access を持つ 1 つの bad actor が鍵の nonce range を drain できる。from-address 単位で並行送信を cap |
| **永続キュー** | プロセス再起動でメモリ内が全滅する。Production は \`PendingTx\` を Postgres / Redis に永続化 + 起動時に rehydrate |
| **マルチ RPC fanout** | 2-3 provider に同時 submit して 1 つの dead provider で tx が孤立しないように。同じ署名済み bytes はどこでも動く |
| **Nonce ギャップ検出** | nonce 5、6、7 を予約して 5 + 7 だけが着地したら、nonce 6 が *missing* — それを埋めるまで chain は stall。検出して no-op tx を注入 |
| **Observability** | from 単位 \`pending_count\`、\`oldest_pending_age\`、\`bumps_per_hour\`。oldest_pending が閾値超えたら page |

書いたアーキテクチャ — signer pool、nonce manager、send path、replace-on-stuck 付きバックグラウンド watcher — **すべての production wallet backend の背骨**。商用 wallet のドキュメントを開けば、マーケティングの下に同じ形が見える。

## Drill

1. **冪等性。** \`SendRequest\` に \`request_id: String\` フィールドを追加; \`request_id → tx_hash\` を 1 時間キャッシュ。重複 POST にキャッシュした hash を返す。(30分)
2. **鍵単位レート制限。** \`/send\` を per-from semaphore (max 4 並行) で wrap。超過は 429 で reject。(30分)
3. **永続キュー。** \`PendingTx\` を insert 時 Redis に書く、land 時に削除。起動時 rehydrate。(1.5時間)
4. **マルチ RPC fanout。** 2 つの provider を wrap して \`send_raw_transaction\` を両方に broadcast、最初の \`Ok\` を返す \`MultiProvider\` を作る。(1時間)
5. **Cancel endpoint。** \`POST /cancel { from, nonce }\` を追加 — 同じ nonce で 50% bump した 0-value 自送を提出する (stuck tx を確実にキャンセル)。(1時間)

Drill 5 を完成させれば、鍵カストディを除いて本物のユーザが信頼できる wallet backend ができる。HSM 署名を wire-in すれば wallet チームが ship しているのと同等水準。

> 🛑 **最終チェック。** 一文で: なぜ **ローカル nonce 状態** がこの設計の load-bearing piece なのか (他のレイヤー (signing, gas, watcher) がもっと注目されるとしても)? 答えに「nonce ごとの RPC ラウンドトリップなしでの並行送信」がないなら、Step 1 を読み直し — そこが nonce 管理が難しい理由。

## 📺 関連動画

\`\`\`youtube
wJnywGB33O4 | Georgios Konstantopoulos — Foundry, a portable, fast and modular toolkit (Foundry の tx パイプライン内で使われている同じ Alloy + Rust signer 機構)
\`\`\`
`,
                },
                {
                  title: '最小限の EIP-7702 Sponsor サービスを Rust で作る',
                  slug: 'build-7702-sponsor-ja',
                  type: 'CONTENT',
                  sortOrder: 4,
                  duration: 45,
                  xpReward: 80,
                  content: `# 最小限の EIP-7702 Sponsor サービスを Rust で作る

Alice は EOA (Externally Owned Account — スマートコントラクトではない、ただの鍵ペアのウォレット) を持っている。ETH を事前に保有せず、smart-contract アカウントへの移行もせずに、1 クリックで 2 つのトークンを swap したい。EIP-7702 (Pectra フォーク以降、2025 年 3 月から mainnet で稼働) がその手段: 「この tx の間、私の EOA をこのコントラクトのコードを持つかのように扱え」と言う *authorization* に、彼女がオフチェーンで署名する。**Sponsor** — あなたのサービス — がその authorization を Type 4 トランザクションに wrap してガスを払う。Alice は atomic な batched call、custom validation、session key を得る。同じアドレス、同じ鍵、移行なし。以下、Rust ~200 行。

> 📌 **スコープの正直な開示。** **単一ユーザ** EIP-7702 トランザクションを sponsor する: ユーザがオフチェーンで authorization に署名、それと意図する call をサービスに POST、サービスがそれを Type 4 トランザクション (ガス支払い) で wrap、submit、hash を返す。**マルチユーザバッチング** ("bundler" パターン、N ユーザを 1 つのチェーン tx に詰める) は drill で 1 ループの拡張として扱う。Account abstraction ポリシーロジック — 支出制限、セッションキー、リカバリ — は delegate コントラクトが決めること; sponsor は relay するだけ。

## EIP-7702 を 90 秒で

\`\`\`
7702 なし: Alice の EOA → CALL → Contract
7702 あり: Alice の EOA = (delegate された) → Contract code → Alice のアドレスとして実行
\`\`\`

メカニクス:

- **Tx type 4** が新フィールドを運ぶ: \`authorization_list: Vec<SignedAuthorization>\`
- \`Authorization { chain_id, address (delegate), nonce }\` がコードを設定される EOA によって署名される
- tx 実行時、リスト内の各 authorization は **その EOA のアカウントコードを書き換える** — 23 byte の delegation pointer (\`0xef0100 || delegate_address\`) に **その tx の残りの間**
- EOA のストレージ、残高、アドレスはそのまま。Delegate のコードが EOA 自身のコードかのように走る

それだけ。プロトコルの 3 文; 残りは配管。

## 何を作るか

\`\`\`bash
$ curl -X POST http://localhost:8080/sponsor \\
    -H "Content-Type: application/json" \\
    -d '{
      "user":              "0xAlice...",
      "delegate":          "0xMyAccountImpl...",
      "user_authorization": "0x04f8...",
      "calls": [
        { "target": "0xToken...", "value": "0x0", "data": "0xa9059cbb..." },
        { "target": "0xRouter...", "value": "0x0", "data": "0x38ed1739..." }
      ]
    }'
{ "tx_hash": "0xabc..." }
\`\`\`

\`\`\`mermaid
flowchart TB
    User["Alice (EOA)"] -->|オフチェーンで Authorization 署名| AuthPayload["Authorization<br/>chain_id, delegate, nonce"]
    User -->|POST /sponsor| API
    AuthPayload -->|HTTP body| API["axum handler"]
    API -->|Type 4 tx を構築 user_auth 付き| Sponsor["Sponsor signer<br/>(ガス支払い)"]
    Sponsor -->|broadcast| Chain
    Chain -->|delegated code が<br/>Alice のアドレスとして走る| Effects["Token transfer +<br/>Router swap atomically"]
\`\`\`

> 🛑 **スクロール前に予測。** なぜ sponsor (Bob) が Type 4 tx の \`from\` である必要があるか、Alice ではなく? EIP-1559 で **\`from\` が何を意味するか** vs *authorization* が誰のためのものか、一文で答えてください。答えを書き留めてから先へ。

## なぜ sponsor サービスか (vs ネイティブ smart-account)

| 方式 | UX | コスト | 移行 |
| :--- | :--- | :--- | :--- |
| **ネイティブ smart account (4337)** | 最高 — フル custom validation | 高 — 全 tx で bundler マークアップ | ユーザ資金 → 新アカウント |
| **純 7702 (ユーザが自分のガスを払う)** | OK — batching は得られるが ETH は必要 | 低 — 単一 tx | なし — 同じ EOA |
| **7702 + sponsor (本レッスン)** | onboarding に最高 — ETH 不要 | sponsor がガスを食う (アプリ subscription、手数料、等で課金) | なし — 同じ EOA |

アプリチームのプロダクト作業のスイートスポット: 既存 EOA、smart-account 機能、UX 投資としてバックエンドがガスを賄う。

## Cargo.toml

\`\`\`toml
[package]
name = "eip7702-sponsor"
version = "0.1.0"
edition = "2021"

[dependencies]
alloy = { version = "1.0", features = [
  "providers", "signer-local", "rpc-types", "network",
  "consensus", "eips", "sol-types"
] }
axum                = "0.7"
serde               = { version = "1", features = ["derive"] }
serde_json          = "1"
tokio               = { version = "1", features = ["full"] }
hex                 = "0.4"
eyre                = "0.6"
\`\`\`

## Step 1: Authorization ペイロード (ユーザが署名するもの)

ユーザ (Alice) はオフチェーンで \`Authorization\` に署名する — フロントエンドや wallet が行う。彼女がサービスに送る bytes はその結果。サービスが何を期待するか見せるために署名ロジックをここで再現:

\`\`\`rust
// FRONTEND / wallet コード — ユーザのブラウザ / MetaMask で走る、サーバではない。
use alloy::{
    eips::eip7702::Authorization,
    primitives::{Address, U256},
    signers::{local::PrivateKeySigner, SignerSync},
};

fn sign_authorization_for_user(
    user: &PrivateKeySigner,
    delegate: Address,
    chain_id: u64,
    user_nonce: u64,
) -> eyre::Result<alloy::eips::eip7702::SignedAuthorization> {
    let auth = Authorization {
        chain_id: U256::from(chain_id),
        address: delegate,
        nonce: user_nonce,
    };
    let sig = user.sign_hash_sync(&auth.signature_hash())?;
    Ok(auth.into_signed(sig))
}
\`\`\`

Walk:

- **\`Authorization { chain_id, address, nonce }\`** — 3 フィールド。\`address\` は **delegate** コントラクト、Alice が EOA に対して認可するコード。
- **\`auth.signature_hash()\`** — 署名されるハッシュ。仕様: \`keccak256(MAGIC || rlp([chain_id, address, nonce]))\`、\`MAGIC\` は \`0x05\`。**自分で計算しない** — Alloy がやる; keccak に手を出した時点でミスしている。
- **\`user_nonce\`** — Alice の *現在の EOA nonce*。authorization は含まれる tx が mine された瞬間に消費される; 再生には Alice の nonce が一致する必要がある。**ワンショットの replay 防止** が組み込まれている。

シリアライズされた \`SignedAuthorization\` がサービスに届くもの。EIP-2718 envelope エンコーディングが正規 wire 形式:

\`\`\`rust
let bytes = signed_auth.encoded_2718();
let hex = format!("0x{}", hex::encode(bytes));
// この hex 文字列を JSON ボディで送る
\`\`\`

> 🔍 **リポで探す。** [\`alloy-eips/src/eip7702\`](https://github.com/alloy-rs/eips/tree/main/crates/eip7702/src) を開く。\`Authorization::signature_hash\` を見つける。\`MAGIC\` 定数 — それが EIP-7702 プレフィクスで、同じ RLP が他の署名済みメッセージとして誤読されるのを防ぐ。**ドメイン分離、1 byte で。**

## Step 2: サービスが受け取って Type 4 tx を構築

\`\`\`rust
use alloy::{
    consensus::SignableTransaction,
    eips::eip2718::Decodable2718,
    eips::eip7702::SignedAuthorization,
    network::{TransactionBuilder, TransactionBuilder7702},
    primitives::{Address, B256, Bytes, U256},
    providers::{Provider, ProviderBuilder},
    rpc::types::TransactionRequest,
    signers::local::PrivateKeySigner,
    sol,
};

sol! {
    // 標準的な「複数 call を実行」インターフェース — delegate がこれを実装する
    function executeBatch(
        (address target, uint256 value, bytes data)[] calls
    ) external;
}

#[derive(Clone, serde::Deserialize)]
pub struct CallSpec {
    pub target: Address,
    pub value: U256,
    pub data: Bytes,
}

pub async fn build_sponsored_tx<P: Provider>(
    provider: &P,
    sponsor: &PrivateKeySigner,
    user: Address,
    user_authorization_hex: &str,
    calls: Vec<CallSpec>,
) -> eyre::Result<TransactionRequest> {
    // 1. ユーザの signed authorization を wire 形式から parse
    let auth_bytes = hex::decode(user_authorization_hex.trim_start_matches("0x"))?;
    let signed_auth = SignedAuthorization::decode_2718(&mut auth_bytes.as_slice())?;

    // 2. バッチ call を ABI エンコード
    let batch = executeBatchCall {
        calls: calls.into_iter().map(|c| (c.target, c.value, c.data)).collect(),
    };
    let calldata = batch.abi_encode();

    // 3. Type 4 tx を構築: from = sponsor、to = user (delegate される EOA)、
    //    auth_list はユーザの signed auth、calldata は delegate を呼ぶ
    let chain_id = provider.get_chain_id().await?;
    let nonce = provider.get_transaction_count(sponsor.address()).await?;
    let fee = provider.estimate_eip1559_fees().await?;

    let req = TransactionRequest::default()
        .with_from(sponsor.address())
        .with_to(user)
        .with_chain_id(chain_id)
        .with_nonce(nonce)
        .with_max_fee_per_gas(fee.max_fee_per_gas)
        .with_max_priority_fee_per_gas(fee.max_priority_fee_per_gas)
        .with_gas_limit(500_000)  // batch tx には余裕が必要; production は estimate
        .with_input(Bytes::from(calldata))
        .with_authorization_list(vec![signed_auth]);

    Ok(req)
}
\`\`\`

Walk:

- **\`SignedAuthorization::decode_2718\`** — ユーザが送った \`encoded_2718\` の逆。**1 ラウンドトリップ、手動 byte いじりなし。**
- **\`from = sponsor、to = user\`** — これがデザインの心臓部。tx は *sponsor から* (ガス支払い、外側の envelope に署名) であって *user の EOA に向かう* (今や delegate であるかのように実行する)。tx を観察する誰もが Bob を initiator、Alice のアドレスを call ターゲットと見る — そして **ログは Alice のアドレスから出る**、なぜなら delegate のコードを走らせているのはそのアドレスだから。
- **\`with_authorization_list(vec![signed_auth])\`** — これを Type 4 にする 1 行。複数の \`SignedAuthorization\` をここに足せば、複数ユーザを 1 つの tx にバッチしている (drill 3)。
- **delegate の \`executeBatch\` は慣例であってプロトコル必須ではない。** 野生の大半の EIP-7702 delegate コントラクトが似たようなメソッドを公開する ([Soneium](https://github.com/coinbase/sponsored-erc20) のパターン、OpenZeppelin の参照実装等を見よ)。あなたの delegate が使う慣例を選ぶ。

> 🛑 **理解度チェック。** スクロール戻しなしで: Bob (sponsor) がこの tx を提出する時、**誰の nonce が増える** か? Bob、Alice、両方? ヒント: 外側の tx envelope にあるのはどの nonce vs authorization の \`nonce\` フィールドが何のためか考えて。

## Step 3: 提出 + inclusion 待ち

\`\`\`rust
use alloy::providers::WalletProvider;

pub async fn submit_and_track<P: WalletProvider + Provider>(
    provider: P,
    req: TransactionRequest,
) -> eyre::Result<B256> {
    let pending = provider.send_transaction(req).await?;
    let hash = *pending.tx_hash();

    // sponsor サービスでは、即時に hash を返すのが普通正しい —
    // ユーザ UI が poll できる。サーバ側 confirmation が欲しいなら:
    // let receipt = pending.with_required_confirmations(1).get_receipt().await?;

    Ok(hash)
}
\`\`\`

Walk:

- **\`provider.send_transaction(req)\`** — Alloy が provider に attach された wallet (sponsor 鍵) で署名 + broadcast。\`req\` は既に \`from = sponsor.address()\` を持つので wallet 機構が正しい鍵を選ぶ。
- **wallet-backend lesson の watcher パターンがここでも適用できる。** 30 秒 deadline + stuck tx の bumped fee で production 級になる。明瞭性のため省略; ほしければ [lesson 4](/courses/reth-building-ja/lessons/build-wallet-backend-ja) の watcher をコピペで。

## Step 4: HTTP サービスとして組み立て

\`\`\`rust
use axum::{extract::State, routing::post, Json, Router};
use std::sync::Arc;

#[derive(serde::Deserialize)]
struct SponsorRequest {
    user: Address,
    user_authorization: String,
    calls: Vec<CallSpec>,
}

#[derive(serde::Serialize)]
struct SponsorResponse {
    tx_hash: B256,
}

#[derive(Clone)]
struct AppState<P: Provider + WalletProvider + Clone + 'static> {
    provider: P,
    sponsor: Arc<PrivateKeySigner>,
}

async fn sponsor_handler<P: Provider + WalletProvider + Clone + 'static>(
    State(state): State<AppState<P>>,
    Json(body): Json<SponsorRequest>,
) -> Result<Json<SponsorResponse>, (axum::http::StatusCode, String)> {
    let req = build_sponsored_tx(
        &state.provider,
        &state.sponsor,
        body.user,
        &body.user_authorization,
        body.calls,
    )
    .await
    .map_err(|e| (axum::http::StatusCode::BAD_REQUEST, e.to_string()))?;

    let hash = submit_and_track(state.provider.clone(), req)
        .await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(SponsorResponse { tx_hash: hash }))
}

#[tokio::main]
async fn main() -> eyre::Result<()> {
    let sponsor: PrivateKeySigner = std::env::var("SPONSOR_KEY")?.parse()?;
    let provider = ProviderBuilder::new()
        .wallet(sponsor.clone())
            // Provider 例: QuickNode、Alchemy、Infura、または自前 Reth ノード。
.connect(&std::env::var("RPC_URL")?)
        .await?;

    let state = AppState {
        provider,
        sponsor: Arc::new(sponsor),
    };

    let app = Router::new()
        .route("/sponsor", post(sponsor_handler))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await?;
    axum::serve(listener, app).await?;
    Ok(())
}
\`\`\`

サービス全体: ~200 LOC、import + ヘルパモジュールを含めて。フロントエンドが \`user_authorization\` hex を生成 (Step 1 のコード、ただしユーザ wallet 内); サービスが残り全部を扱う。

> 🔍 **リポで探す。** [\`alloy/examples/transactions/send_eip7702_transaction.rs\`](https://github.com/alloy-rs/examples/blob/main/examples/transactions/examples/send_eip7702_transaction.rs) を開く。公式 example が Bob 送信 + Alice 認可 — **作ったのと同じ分離**。公式 example は main() に全部 hardcode、私たちはサービスとして wrap した。**同じパターン、production 化しただけ。**

## Production に足りないもの

| ギャップ | 本物の sponsor サービスが何をしているか |
| :--- | :--- |
| **Authorization 検証** | \`signed_auth.recover_authority()\` が claim された user と一致するかを decode + 検証する (ガス支払い前に)。本サービスは入力を信頼; production はチェックする |
| **Replay 保護** | tx 後にユーザの nonce が変わる; 提出 *前* に authorization の nonce が現在の EOA nonce と一致するかチェック。古い authorization は同期的に reject すべき |
| **支出制限** | ユーザ単位日次 cap。Call ごとの value cap。Delegate アドレスの allowlist。(あなたがガスを払う; 誰のために sponsor するかはあなたが決める) |
| **Watcher** | [Lesson 4](/courses/reth-building-ja/lessons/build-wallet-backend-ja) の replace-on-stuck ロジック。EIP-7702 tx は同じ mempool を通る; bump パターンは同一 |
| **マルチユーザバッチング** | 1 つの tx で \`auth_list = [Alice's auth, Bob's auth, Carol's auth]\` + \`multicall\` スタイルの delegate call。ユーザ単位ガス償却が低くなる |
| **ガス sponsor 会計** | ユーザごとの支出量を track; \`/balance\` endpoint を公開; Stripe / オンチェーン入金 / アプリ subscription で refill |
| **Delegate バージョンピン留め** | 特定の delegate アドレス (audit 済みセット) のみ許可。未知の delegate への authorization は reject — 悪意の可能性 |
| **フロントエンド SDK** | \`(provider, calls)\` を取って \`user_authorization\` hex を返す TypeScript / Swift / Kotlin クライアント。アプリ開発者から署名フローを抽象化 |

書いたアーキテクチャ — signed authorization + intent を受け取り、Type 4 で wrap、ガス sponsor、submit — **すべての production EIP-7702 paymaster がやっていること**。Privy、Dynamic、Coinbase Smart Wallet 等の会社が、この正確なコードパスのバリエーションを動かしている。

## Drill

1. **Authority 検証。** 健全性チェックを追加: \`signed_auth.recover_authority()? == body.user\`。不一致は 400 で reject。(15分)
2. **Nonce 新鮮度チェック。** 提出前に現在のユーザ nonce を fetch、authorization の \`nonce\` と一致するか検証。(15分)
3. **マルチユーザバッチング。** \`/sponsor\` を \`(user, user_authorization, calls)\` トリプルのリストを受け取るよう変更。全 authorization + multicall delegate call を持つ 1 tx を構築。**1 ユーザの auth が batch 中で invalid だったら最悪何が起きる?** (1.5時間)
4. **支出 cap。** \`HashMap<Address, U256>\` でユーザ単位ガス支出を track。設定可能な日次上限を超えるリクエストは reject。(45分)
5. **Replace-on-stuck。** [Lesson 4](/courses/reth-building-ja/lessons/build-wallet-backend-ja) の watcher を持ってきて統合する。(30分 — パターンを理解していれば大半コピペ)

Drill 5 を完成させれば内部アプリ用の sponsor サービスが ready。SDK + 支出ポリシー + observability を足せば Privy スタイルの開発者体験を ship している。

> 🛑 **最終チェック。** 一文で: なぜ EIP-7702 が *特に* (vs EIP-4337) sponsorship をはるかに *安く* 運用させるのか? 答えに「entry-point コントラクトオーバーヘッドなし」と「単一 tx vs UserOp wrapping」がないなら、90 秒リフレッシャを読み直し — それが 7702 が存在する全理由。

## 📺 関連動画

\`\`\`youtube
_k5fKlKBWV4 | EIP-7702: a technical deep dive — lightclient (Devcon SEA 2024)
\`\`\`

\`\`\`youtube
K2Tm1f8MIwg | Full code walkthrough of EIP-7702 in Revm — sponsor された tx を走らせるエンジン
\`\`\`
`,
                },
                {
                  title: 'Foundry スタイルのカスタム cheatcode を Rust で作る',
                  slug: 'build-foundry-cheatcode-ja',
                  type: 'CONTENT',
                  sortOrder: 5,
                  duration: 45,
                  xpReward: 80,
                  content: `# Foundry スタイルのカスタム cheatcode を Rust で作る

Foundry テストで \`vm.deal(alice, 100 ether)\` と書く時、**それは EVM opcode ではない**。Rust の関数 — *precompile* (EVM エンジンに組み込まれた「コードがチェーン上に存在しない」コントラクト) — を Foundry がマジックアドレス \`0x7109709E...\` にインストールし、\`Vm.sol\` インターフェース経由で Solidity から見えるようにしている。\`vm.warp()\`、\`vm.expectRevert()\` も全部同じ。**あなたも自前で出荷できる。** 本レッスンは \`cheats.measureGas(target, data)\` を作る — Foundry が内部で使っているのと同じパターンで、テスト作者がサブコールのガスを手動 wrap せずに測れる precompile を。

> 📌 **スコープの正直な開示。** Foundry を **fork しない**。precompile + それをロードする最小 Revm ベースのテストハーネスを作る。パターン (高アドレス precompile + Solidity ABI 表面 + それを wire するテストランナー) **は同一** — Foundry が cheatcode を追加するのと同じパターン、ただし不透明なフレームワークを継承するのではなく全部見える形で。

## 何を作るか

Solidity から呼べる新 cheatcode:

\`\`\`solidity
interface Cheats {
    function measureGas(address target, bytes calldata data) external returns (uint256 gasUsed);
}

contract MyTest {
    Cheats constant cheats = Cheats(0x7110000000000000000000000000000000000000);

    function test_swap_gas() public {
        uint256 gas = cheats.measureGas(
            address(uniswapRouter),
            abi.encodeWithSignature("swapExactTokensForTokens(...)", ...)
        );
        assertLt(gas, 200_000, "swap exceeded gas budget");
    }
}
\`\`\`

\`\`\`mermaid
flowchart TB
    Test["Solidity test"] -->|call| Cheats["0x7110... precompile"]
    Cheats -->|nested EVM call| Inner["Revm sub-EVM<br/>target.data を実行"]
    Inner -->|gas_used| Cheats
    Cheats -->|abi-encoded uint256| Test
\`\`\`

> 🛑 **スクロール前に予測。** なぜこれを **precompile** として実装するのが正解か? 普通の Solidity contract ではなく? **precompile が普通の contract にできないこと** について一文で答えてください。答えを書き留めてから先へ。

## なぜ precompile か (contract でも opcode でもなく)

| 方式 | Revm 内部を呼べる? | コンセンサス影響 | 労力 |
| :--- | :--- | :--- | :--- |
| **普通の Solidity contract** | NO — EVM op のみ | なし | 簡単 |
| **新 EVM opcode** | YES — フル制御 | **即コンセンサスを fork する** (Advanced lesson) | 莫大 |
| **Precompile (Foundry の選択)** | YES — フル Rust アクセス | **あなたの** Revm ビルドにのみ存在、mainnet にはなし | ~50 行 |

precompile は *executor* に座る、プロトコルではない。Mainnet Revm はあなたの precompile を持たない; あなたのテストランナー Revm が持つ。**コンセンサスは壊れず、フル Rust パワー。** だから Foundry の cheatcode は precompile であって opcode ではない。

## Cargo.toml

\`\`\`toml
[package]
name = "rust-cheatcode"
version = "0.1.0"
edition = "2021"

[dependencies]
revm                = { version = "38" }
revm-precompile     = { version = "34" }
alloy-primitives    = "1.5"
alloy-sol-types     = "1.5"
eyre                = "0.6"
\`\`\`

## Step 1: precompile 関数

Revm precompile は \`fn(input: &[u8], gas_limit: u64) -> PrecompileResult\` シグネチャの Rust 関数。中で cheatcode dispatch をレイヤリング:

\`\`\`rust
use alloy_primitives::{Address, U256};
use alloy_sol_types::{sol, SolValue};
use revm::{
    context::TxEnv,
    context_interface::result::ExecutionResult,
    primitives::TxKind,
    Context, ExecuteEvm, MainBuilder, MainContext,
};
use revm_precompile::{
    EthPrecompileOutput, EthPrecompileResult, Precompile, PrecompileHalt, PrecompileId,
};

pub const CHEATS_ADDRESS: Address = alloy_primitives::address!("7110000000000000000000000000000000000000");

sol! {
    function measureGas(address target, bytes calldata data) external returns (uint256 gasUsed);
}

/// precompile エントリーポイント
pub fn cheats_run(input: &[u8], gas_limit: u64) -> EthPrecompileResult {
    // 最初の 4 byte が関数セレクタ — Solidity contract と同じディスパッチモデル
    if input.len() < 4 {
        return Err(PrecompileHalt::OutOfGas); // 本当は "bad input"; production は適切なエラーへマップ
    }

    let selector = &input[..4];
    let calldata = &input[4..];

    if selector == measureGasCall::SELECTOR {
        let decoded = measureGasCall::abi_decode_raw(calldata, true)
            .map_err(|_| PrecompileHalt::OutOfGas)?;

        let gas_used = run_measure_gas(decoded.target, decoded.data, gas_limit)?;
        return Ok(EthPrecompileOutput::new(
            21_000, // cheatcode 自体の呼び出しの flat コスト
            U256::from(gas_used).abi_encode().into(),
        ));
    }

    Err(PrecompileHalt::OutOfGas)
}
\`\`\`

Walk:

- **\`CHEATS_ADDRESS\`** — \`0x7110...\`、Foundry の \`0x7109\` の真上、衝突回避のため意図的に。**cheatcode アドレスは慣例だけ; mainnet precompile や他の dev tool と衝突しない何かを選ぶ。**
- **セレクタ dispatch** — Solidity contract と同じ 4-byte ABI セレクタ機構。\`sol!\` マクロが \`measureGasCall::SELECTOR\` (定数 \`[u8; 4]\`) と \`abi_decode_raw\` を生成。**端から端まで型安全** — 手動 byte slice 不要。
- **2 つの戻り値経路** — \`Ok(EthPrecompileOutput)\` は gas-used + abi-encode された結果 bytes を運ぶ; \`Err(PrecompileHalt::*)\` は呼び出しフレームを停止。Production の cheatcode は specific halt variants を使う (Foundry には自前のものがある); ここではシンプルに保つ。

## Step 2: cheatcode ロジック

面白い部分: \`measureGas\` は同じ world state に対して *nested* EVM 実行を走らせ、ガスを測り、その数を返す。キー API: 既存 journal に対する fresh \`Context\` を立ち上げて (state 共有のため) ワンショット tx を走らせる:

\`\`\`rust
fn run_measure_gas(target: Address, data: Vec<u8>, gas_limit: u64) -> Result<u64, PrecompileHalt> {
    // 本物の cheatcode では、custom Inspector 経由で親 EVM の state にアクセスする。
    // レッスン明瞭化のため、ここでは empty in-memory DB に対する独立 EVM を立ち上げる —
    // gas 数学のデモには十分。
    let mut db = revm::database::CacheDB::new(revm::database::EmptyDB::default());

    let mut evm = Context::mainnet().with_db(&mut db).build_mainnet();

    let tx = TxEnv::builder()
        .caller(Address::ZERO)
        .kind(TxKind::Call(target))
        .data(data.into())
        .gas_limit(gas_limit)
        .build()
        .map_err(|_| PrecompileHalt::OutOfGas)?;

    let result = evm.transact_one(tx).map_err(|_| PrecompileHalt::OutOfGas)?;

    match result.result {
        ExecutionResult::Success { gas_used, .. } => Ok(gas_used),
        ExecutionResult::Revert { gas_used, .. } => Ok(gas_used),
        ExecutionResult::Halt { gas_used, .. } => Ok(gas_used),
    }
}
\`\`\`

Walk:

- **\`Context::mainnet().with_db(&mut db).build_mainnet()\`** — [Lesson 1 (MEV searcher)](/courses/reth-building-ja/lessons/build-mev-searcher-ja) で使った同じ builder。cheatcode は EVM-on-EVM な小型版。**Revm を 1 回走らせれば、全部走らせたことになる。**
- **3 つの結果バリアント全部が \`gas_used\` を返す** — Success、Revert、Halt。revert した tx もガスを消費した。実数を返し、テスト作者が何をカウントするかを決める。
- **\`db = EmptyDB\` は本レッスンの簡素化。** 本物の Foundry cheatcode は custom Inspector hook 経由で親テスト EVM と state を共有する (\`vm.deal()\` は親テストが見る balance を mutate する必要があるから)。Drill 3 で扱う。

> 🛑 **理解度チェック。** スクロール戻しなしで、自分の言葉で: ここで返される **\`gas_used\`** はなぜ *target contract* が消費したガスを含むが、cheatcode 呼び出し自体が払ったガスは含まない? ヒント: precompile の \`21_000\` flat コストは *outer* フレーム上にある、inner ではない。

## Step 3: Revm テストハーネスに wire

precompile を register + Solidity テスト contract をそれに対して実行するテストランナーが必要。最小限のハーネス:

\`\`\`rust
use revm::Context;
use revm_precompile::{Precompiles, PrecompileSpecId};

// (標準 precompile インターフェースから)
revm_precompile::eth_precompile_fn!(cheats_precompile_fn, cheats_run);

const CHEATS_PRECOMPILE: Precompile = Precompile::new(
    PrecompileId::Custom(std::borrow::Cow::Borrowed("cheats")),
    CHEATS_ADDRESS,
    cheats_precompile_fn,
);

fn build_test_evm_context<'db, DB>(db: &'db mut DB) -> impl ExecuteEvm + 'db
where
    DB: revm::Database<Error: std::fmt::Debug>,
{
    // mainnet precompile から開始、こちらを extend
    let mut precompiles = Precompiles::new(PrecompileSpecId::OSAKA).clone();
    precompiles.extend([CHEATS_PRECOMPILE]);

    Context::mainnet()
        .with_db(db)
        .with_precompiles(precompiles)
        .build_mainnet()
}

fn run_test_contract<DB>(db: &mut DB, test_contract_bytecode: Vec<u8>, test_calldata: Vec<u8>)
    -> eyre::Result<bool>
where
    DB: revm::Database<Error: std::fmt::Debug>,
{
    // 1. テスト contract をデプロイ
    let mut evm = build_test_evm_context(db);
    let deploy_tx = TxEnv::builder()
        .caller(Address::from([0xAB; 20]))
        .kind(TxKind::Create)
        .data(test_contract_bytecode.into())
        .gas_limit(10_000_000)
        .build()?;
    let deploy_result = evm.transact_one(deploy_tx)?;

    let test_addr = match deploy_result.result {
        ExecutionResult::Success { output: revm::context_interface::result::Output::Create(_, Some(a)), .. } => a,
        _ => eyre::bail!("test contract deploy failed"),
    };

    // 2. テストメソッドを呼ぶ
    let test_tx = TxEnv::builder()
        .caller(Address::from([0xAB; 20]))
        .kind(TxKind::Call(test_addr))
        .data(test_calldata.into())
        .gas_limit(10_000_000)
        .build()?;
    let test_result = evm.transact_one(test_tx)?;

    Ok(matches!(test_result.result, ExecutionResult::Success { .. }))
}
\`\`\`

Walk:

- **\`Precompiles::new(PrecompileSpecId::OSAKA).clone()\`** — 標準 mainnet セット (ECRECOVER、SHA256、RIPEMD160、IDENTITY、modexp、BN254、KZG、BLS) から開始、こちらを extend。標準 precompile は依然利用可能; 新 precompile は *additive*。
- **\`with_precompiles(...)\`** — Revm 38 のカスタム precompile registry インストール API。**同じ 1 行で任意数の cheatcode を wire。**
- **ハーネスは ~30 行。** Foundry が足すもの: Solidity コンパイラ統合 (\`forge\` が solc 経由で行う)、テスト発見 (\`test_\` で始まる関数を見つける)、構造化失敗レポート、並列実行。**カーネルはあなたが書いたもの。**

> 🔍 **リポで探す。** [\`forge-std/src/Vm.sol\`](https://github.com/foundry-rs/forge-std/blob/master/src/Vm.sol) を開いて cheatcode インターフェースをスキム。そこの全関数が [Foundry の cheatcode crate](https://github.com/foundry-rs/foundry/tree/master/crates/cheatcodes) の Rust precompile への Solidity ABI 表面。**Rust だと知らなかった cheatcode を 3 つ言えるまでスクロール。**

## Step 4: テストを書く

Solidity 側からは、cheatcode を呼ぶのは \`vm.deal\` その他と同一:

\`\`\`solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface Cheats {
    function measureGas(address target, bytes calldata data) external returns (uint256);
}

contract Counter {
    uint256 public count;
    function increment() public { count++; }
}

contract CounterTest {
    Cheats constant cheats = Cheats(0x7110000000000000000000000000000000000000);

    function test_increment_gas_under_25k() public {
        Counter c = new Counter();
        bytes memory data = abi.encodeWithSignature("increment()");
        uint256 gas = cheats.measureGas(address(c), data);
        require(gas < 25_000, "increment too expensive");
    }
}
\`\`\`

\`solc\` でコンパイル、bytecode + \`test_increment_gas_under_25k()\` セレクタを \`run_test_contract\` に渡せば、Solidity テストがあなたのカスタム Rust cheatcode を end-to-end で呼んだことになる。

## Production レベルテストフレームワークに足りないもの

| ギャップ | Foundry が何をしているか |
| :--- | :--- |
| **Solidity コンパイル** | \`forge\` が solc を shell out、artifact をキャッシュ、import を扱う。本当に必要な時だけ再現; ユーザに事前コンパイルさせる方が普通 |
| **親 state 共有** | \`vm.deal()\` は *テスト* が見る balance を mutate する。それは親 EVM への custom Inspector hook が必要 — 独立ハーネスへの非自明な拡張 |
| **並列性** | Foundry は test ごとに独立 DB を持つスレッドで実行。簡単に追加 (test contract 1 つにつき 1 tokio タスク) |
| **より良い失敗レポート** | スタックトレース、デコード済み revert reason、fuzz shrink。すべて上記カーネルの上のポリッシュ |
| **コール間 cheatcode 永続化** | 例: \`vm.expectRevert\` は *次の* call にだけ state を設定。inspector state に保存、precompile 自体ではない |
| **パーミッションレス cheatcode 発見** | 本物のプラグインシステムなら cheatcode を動的ライブラリとしてロードできる。Foundry はやらない — コンパイル時統合。私たちもしない |

書いたアーキテクチャ — 高アドレス precompile + selector dispatch + ABI デコード arg + nested EVM 実行 + register するハーネス — **Foundry cheatcode システムが動くカーネル**。Foundry は Rust レベル glue と Solidity レベル ergonomics を足す; 基礎は同じ。

## Drill

1. **\`balanceOf(address)\` を追加。** \`evm.db.basic(addr).balance\` 経由で任意アドレスの残高を返す 2 つ目のセレクタ。(15分)
2. **call を \`payable\` に。** \`measureGas\` に \`value\` 引数を追加、内側 tx へ pass through。**cheatcode が payable になると Solidity 側で何が変わる?** (30分)
3. **共有 state cheatcode。** 親テストの state を *mutate* する \`cheats.deal(address, uint256)\` を実装。ヒント: 独立 nested EVM ではなく custom Revm \`Inspector\` が必要。(3時間)
4. **Solidity テスト発見。** ディレクトリを取って、全 \`.sol\` を solc でコンパイル、\`test_\` で始まる全関数を見つけ、各々を実行、pass/fail を出力する最小テストランナー。(4時間)
5. **性能比較。** 同じテスト (Counter increment × 1000) を (a) 自前ハーネス、(b) \`forge test\` で実行。**レイテンシギャップは? どこから来ている?** (1時間プロファイリング)

Drill 4 を完成させれば、構造的に Foundry の fork が完成。fuzz testing + invariant testing を上に足せば、野生のものと同等水準。

> 🛑 **最終チェック。** 一文で: なぜ **selector ディスパッチ + ABI デコード arg** がテスト作者側から見て precompile を Solidity contract に感じさせるのか? 答えに「Solidity はアドレスへの呼び出しをエンコードする方法を既に知っている」がないなら、Step 1 を読み直し — その ABI 互換性が "騙し" を可能にする。

## 📺 関連動画

\`\`\`youtube
sJpL21yJpgs | Horsefacts — Invariant Testing WETH with Foundry (本レッスンが reverse-engineer した cheatcode パターン)
\`\`\`
`,
                },
                {
                  title: 'Swap Aggregator を作る — DEX state を fork して',
                  slug: 'build-swap-aggregator-ja',
                  type: 'CONTENT',
                  sortOrder: 6,
                  duration: 45,
                  xpReward: 80,
                  content: `# Swap Aggregator を作る: DEX state を fork して、Rust で

ユーザが 10,000 USDC を ETH に swap したい。Uniswap V2 なら 2.948 WETH もらえる。Sushi なら 2.946。Uniswap V3 なら 2.951。Aggregator の仕事: **同じクオートを全 venue に同じ瞬間にファンアウト、比較、勝者を選ぶ。** これが 1inch、Paraswap、0x が裏でやっていること。以下、Rust ~250 行: Revm で mainnet をローカル fork (全クオートが *同じ* atomic state を読むため)、Uniswap V2 + Sushi + Uniswap V3 から reserve を引き、出力を計算、ベストを選ぶ。

> 📌 **スコープの正直な開示。** **3 つの V2 系 pool と 1 つの V3 pool** に対して 1-hop のクオートを計算する。本物の aggregator は: split routing (30% を Uniswap、70% を Curve に送る)、multi-hop (A → WETH → B)、独自数学の CFMM (Curve の stableswap、Balancer の重み付き pool)、ガスを考慮したルーティング、を加える。それぞれは本レッスンのカーネルの 1 ループ拡張。

## 何を作るか

\`\`\`bash
$ cargo run -- quote \\
    --in-token  0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48 \\  # USDC
    --out-token 0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2 \\  # WETH
    --amount-in 10000000000                                       # 10,000 USDC

Quotes (10000 USDC -> WETH):
  Uniswap V2:    2.94821 WETH  (price 3393.08 USDC/WETH)
  Sushi V2:      2.94619 WETH  (price 3395.41 USDC/WETH)
  Uniswap V3:    2.95104 WETH  (price 3389.84 USDC/WETH)  ← BEST
\`\`\`

\`\`\`mermaid
flowchart TB
    User["CLI: in/out token, amount"] --> Fork["Revm fork<br/>at latest block"]
    Fork -->|getReserves| V2A["Uniswap V2 pool"]
    Fork -->|getReserves| V2B["Sushi V2 pool"]
    Fork -->|simulate swap| V3["Uniswap V3 pool<br/>(より複雑な数学)"]
    V2A --> Quote["Quote calculator"]
    V2B --> Quote
    V3 --> Quote
    Quote --> Pick["Pick best (post-fee, post-gas)"]
\`\`\`

> 🛑 **スクロール前に予測。** なぜ各 pool に対して直接 **chain RPC** で \`getReserves\` を呼ぶのではなく **fork** してオンチェーン state を読むのか? *直接 RPC が買えないものを fork が買ってくれる* について一文で答えて。答えを書き留めてから先へ。

## なぜ fork か (vs 直接 RPC)

| 方式 | N 個のクオートのレイテンシ | ガスコストシミュレーション? | マルチプール atomic ビュー? |
| :--- | :--- | :--- | :--- |
| **N 回の RPC \`eth_call\`** | N × ~50ms = 10 pool で数秒 | NO (別途 \`eth_estimateGas\` 必要) | NO — 各 call は別々の state read; pool A と pool B が微妙に違うブロック由来の可能性 |
| **1 回 fork、N 回 read** | 初回 ~50ms (block fetch)、以降 ~200µs/pool | **YES — 同じ Revm fork でハイポセティカル swap のガスを測れる** | **YES** — 全 read が同じ atomic snapshot から |

aggregation 特に atomicity が重要: pool A の reserve があなたの pool A read と pool B read の間に動いたら、「ベストルート」数学はリンゴと梨を比較している。**Fork が世界の単一ビューを与えてくれる。**

## Cargo.toml

\`\`\`toml
[package]
name = "swap-aggregator"
version = "0.1.0"
edition = "2021"

[dependencies]
alloy-eips         = "1.0"
alloy-primitives   = "1.5"
alloy-provider     = "1.0"
alloy-network      = "1.0"
alloy-sol-types    = "1.5"
revm               = { version = "38", features = ["alloydb"] }
clap               = { version = "4", features = ["derive"] }
tokio              = { version = "1", features = ["full"] }
eyre               = "0.6"
\`\`\`

## Step 1: mainnet を fork (Lesson 1 と同じパターン)

\`\`\`rust
use alloy_eips::BlockId;
use alloy_provider::{network::Ethereum, DynProvider, ProviderBuilder};
use revm::{
    context::TxEnv,
    context_interface::result::{ExecutionResult, Output},
    database::{AlloyDB, CacheDB},
    database_interface::WrapDatabaseAsync,
    primitives::{Address, TxKind, U256},
    Context, ExecuteEvm, MainBuilder, MainContext,
};

type ForkedDB = CacheDB<WrapDatabaseAsync<AlloyDB<Ethereum, DynProvider>>>;

async fn build_fork() -> eyre::Result<ForkedDB> {
    let provider = ProviderBuilder::new()
            // Provider 例: QuickNode、Alchemy、Infura、または自前 Reth ノード。
.connect(&std::env::var("ETH_RPC_URL")?)
        .await?
        .erased();
    let alloy_db = WrapDatabaseAsync::new(AlloyDB::new(provider, BlockId::latest()))
        .ok_or_else(|| eyre::eyre!("AlloyDB init failed"))?;
    Ok(CacheDB::new(alloy_db))
}
\`\`\`

[Lesson 1 (MEV searcher)](/courses/reth-building-ja/lessons/build-mev-searcher-ja) と同じ — それが要点。**同じ fork パターンがあちこちで現れる; 1 つ作れたら、全部作れる。**

## Step 2: V2 pool reserve を読む

Uniswap V2 / Sushi / 任意の V2 fork: 同じ ABI、同じ constant-product 数学。

\`\`\`rust
use alloy_sol_types::{sol, SolCall};

sol! {
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function token0() external view returns (address);
    function token1() external view returns (address);
}

#[derive(Debug, Clone, Copy)]
pub struct V2Pool {
    pub address: Address,
    pub reserve_in: U256,
    pub reserve_out: U256,
    pub fee_bps: u32, // Uniswap V2: 30 (= 0.3%)
}

async fn read_v2_pool(
    db: &mut ForkedDB,
    pool: Address,
    in_token: Address,
    fee_bps: u32,
) -> eyre::Result<V2Pool> {
    let mut evm = Context::mainnet().with_db(db).build_mainnet();

    // 1. pool のどちら側が in_token か (token0 or token1) を見つける
    let token0 = call_view::<token0Call>(&mut evm, pool, token0Call {})?;
    let in_is_zero = token0._0 == in_token;

    // 2. reserve を読む
    let r = call_view::<getReservesCall>(&mut evm, pool, getReservesCall {})?;

    let (reserve_in, reserve_out) = if in_is_zero {
        (U256::from(r.reserve0), U256::from(r.reserve1))
    } else {
        (U256::from(r.reserve1), U256::from(r.reserve0))
    };

    Ok(V2Pool { address: pool, reserve_in, reserve_out, fee_bps })
}

fn call_view<C: SolCall>(
    evm: &mut impl ExecuteEvm<Tx = TxEnv>,
    target: Address,
    call: C,
) -> eyre::Result<C::Return> {
    let result = evm.transact_one(
        TxEnv::builder()
            .caller(Address::ZERO)
            .kind(TxKind::Call(target))
            .data(call.abi_encode().into())
            .gas_limit(1_000_000)
            .build()?,
    )?;

    match result.result {
        ExecutionResult::Success { output: Output::Call(out), .. } => {
            Ok(C::abi_decode_returns(&out, true)?)
        }
        _ => eyre::bail!("view call failed"),
    }
}
\`\`\`

Walk:

- **[Lesson 1 (MEV searcher)](/courses/reth-building-ja/lessons/build-mev-searcher-ja) の \`read_reserves\` で行ったのと同じ EVM call** — 任意の \`SolCall\` で動く \`call_view\` ヘルパに一般化。**再利用が積み重なる**、構築が進むに連れて。
- **\`token0\` lookup が必要なのはどちらがどちらかわからないから。** Pool は address でソートされる; トークンによって、"reserve_in" は reserve0 か reserve1 のどちらにマップする。**スキップするとクオート数学が半分の時間で逆さま。**
- **\`fee_bps\` が V2 ファミリーをパラメタ化する。** Uniswap V2: 30 bps (0.3%)。Sushi: 同じく 30 bps。古い Mooniswap、独自 fork: 5〜100 bps のどこでも。**同じコード、違うパラメータ。**

> 🔍 **リポで探す。** [Uniswap V2 router source](https://github.com/Uniswap/v2-periphery/blob/master/contracts/libraries/UniswapV2Library.sol) を開く。\`getAmountOut\` を見つける。それが次 step が実装する数学。**Rust と参照 Solidity を行単位で比較せよ。**

## Step 3: V2 quote 数学 (constant product)

\`\`\`rust
fn quote_v2(pool: V2Pool, amount_in: U256) -> U256 {
    // Uniswap V2 公式: amount_in_with_fee = amount_in * (10000 - fee_bps)
    //                  numerator   = amount_in_with_fee * reserve_out
    //                  denominator = reserve_in * 10000 + amount_in_with_fee
    //                  amount_out  = numerator / denominator
    let amount_in_with_fee = amount_in * U256::from(10_000 - pool.fee_bps);
    let numerator   = amount_in_with_fee * pool.reserve_out;
    let denominator = pool.reserve_in * U256::from(10_000) + amount_in_with_fee;
    numerator / denominator
}
\`\`\`

Walk:

- **9 行の数学 = V2 系 pool の AMM 全体。** Constant product (\`x · y = k\`)、fee discount のもとで。
- **整数のみ** — float なし、panic なし。\`U256\` 算術が EVM がオンチェーンで使う精度を持つ。**クオートは on-chain swap と wei レベルで一致する。**
- **basis points での fee で Uniswap、Sushi、独自 fee fork を同じコードでサポート。**

> 🛑 **理解度チェック。** スクロール戻しなしで: なぜ \`amount_in_with_fee * pool.reserve_out\` が **分子** に行き、分母ではないのか? ヒント: 次元的に何を意味するか考えて — \`[in_with_fee] * [reserve_out]\` はどんな単位を作る?

## Step 4: V3 quote (より複雑な数学、よりシンプルなアプローチ)

Uniswap V3 は流動性を *tick* と *concentrated range* で価格付けする。クオート公式は非自明。**ショートカット**: V3 数学を再実装しない; on-chain Quoter に答えを聞く、ただし RPC ラウンドトリップを払わないように Revm 経由で:

\`\`\`rust
sol! {
    interface IQuoterV2 {
        function quoteExactInputSingle(
            address tokenIn,
            address tokenOut,
            uint24  fee,
            uint256 amountIn,
            uint160 sqrtPriceLimitX96
        ) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate);
    }
}

const UNI_V3_QUOTER: Address = alloy_primitives::address!("61fFE014bA17989E743c5F6cB21bF9697530B21e");

fn quote_v3(
    db: &mut ForkedDB,
    in_token: Address,
    out_token: Address,
    fee: u32,  // 100 / 500 / 3000 / 10000
    amount_in: U256,
) -> eyre::Result<U256> {
    let mut evm = Context::mainnet().with_db(db).build_mainnet();
    let call = IQuoterV2::quoteExactInputSingleCall {
        tokenIn:               in_token,
        tokenOut:              out_token,
        fee:                   fee.into(),
        amountIn:              amount_in,
        sqrtPriceLimitX96:     U256::ZERO,
    };

    let result = evm.transact_one(
        TxEnv::builder()
            .caller(Address::ZERO)
            .kind(TxKind::Call(UNI_V3_QUOTER))
            .data(call.abi_encode().into())
            .gas_limit(10_000_000)
            .build()?,
    )?;

    match result.result {
        ExecutionResult::Success { output: Output::Call(out), .. } => {
            let decoded = IQuoterV2::quoteExactInputSingleCall::abi_decode_returns(&out, true)?;
            Ok(decoded.amountOut)
        }
        _ => eyre::bail!("V3 quote failed"),
    }
}
\`\`\`

Walk:

- **\`UNI_V3_QUOTER\` はデプロイ済み contract。** その仕事はまさにこれ — 「いくらもらえるか?」を実 swap せずに答える。**呼び出しは無料**、in-Revm で呼んでいるから、on-chain ではない。
- **\`sqrtPriceLimitX96 = 0\`** が price limit を無効化する (つまり「どんな価格でも OK」)。実ルーティングなら slippage を bound するために設定する。
- **fee パラメータが pool tier を選ぶ。** V3 は 1bp (stable pair)、5bp (stable pool)、30bp (大半のペア)、100bp (エキゾチックペア)。Production aggregator は 4 つ全部を query して best を選ぶ。

同じ \`call_view\` パターンも動く — V3 call の specific が見えるよう、ここでは inline で書いた。

## Step 5: aggregate + best を選ぶ

\`\`\`rust
#[derive(Debug)]
struct Quote {
    venue: &'static str,
    amount_out: U256,
}

async fn aggregate(
    db: &mut ForkedDB,
    in_token: Address,
    out_token: Address,
    amount_in: U256,
) -> eyre::Result<Vec<Quote>> {
    let uni_v2_pool   = address!("0d4a11d5EEaaC28EC3F61d100daF4d40471f1852"); // USDC/WETH on Uniswap V2 (例)
    let sushi_pool    = address!("397FF1542f962076d0BFE58eA045FfA2d347ACa0"); // USDC/WETH on Sushi (例)

    let v2 = read_v2_pool(db, uni_v2_pool, in_token, 30).await?;
    let sushi = read_v2_pool(db, sushi_pool, in_token, 30).await?;
    let v3 = quote_v3(db, in_token, out_token, 500, amount_in)?;

    Ok(vec![
        Quote { venue: "Uniswap V2", amount_out: quote_v2(v2, amount_in) },
        Quote { venue: "Sushi V2",   amount_out: quote_v2(sushi, amount_in) },
        Quote { venue: "Uniswap V3", amount_out: v3 },
    ])
}

fn pick_best(quotes: &[Quote]) -> &Quote {
    quotes.iter().max_by_key(|q| q.amount_out).expect("non-empty quotes")
}

#[tokio::main]
async fn main() -> eyre::Result<()> {
    let args = Args::parse();
    let mut db = build_fork().await?;
    let quotes = aggregate(&mut db, args.in_token, args.out_token, args.amount_in).await?;
    let best = pick_best(&quotes);

    println!("Quotes ({} {} -> {}):", args.amount_in, args.in_token, args.out_token);
    for q in &quotes {
        let marker = if std::ptr::eq(q, best) { "  ← BEST" } else { "" };
        println!("  {:<14} {:>20}{}", q.venue, q.amount_out, marker);
    }
    Ok(())
}
\`\`\`

バイナリ全体: ~250 LOC、import + CLI parse 込み。

## Production に足りないもの

| ギャップ | 本物の aggregator が何をしているか |
| :--- | :--- |
| **マルチホップルーティング** | A → WETH → B 経由のルーティング、pool 横断。グラフを構築、output 量で重み付けされた Bellman-Ford |
| **Split routing** | 40% を V3 経由、60% を V2 経由、合計 output が単独より大きいなら。重みに対する凸最適化 |
| **Curve / Balancer / etc.** | 各 CFMM が独自の quote 関数。Curve は stableswap (Newton's method)、Balancer は weighted pool。**同じ fork、venue ごとに違う数学。** |
| **ガス考慮** | 各 quote から推定ガスコスト (out-token 単位) を引く。$100 swap で 50¢ 追加ガスを払うなら 0.1% 良い価格は無価値 |
| **Price-impact 閾値** | pool を X% 超え動かすルートは reject — 低流動性 venue の MEV sandwich 対策 |
| **submission 時 re-quote** | Fork はブロック N での state、swap はブロック N+k で着地。state drift を捕まえるために submission 直前に re-quote |
| **MEV 保護** | Flashbots Protect / MEV-Share 経由で submit して frontrunner にルートを事前に見せない ([Lesson 8 — Capstone](/courses/reth-building-ja/lessons/build-capstone-router-ja) がこれをやる) |

書いたアーキテクチャ — 1 回 fork、reserve を atomic に読む、venue ごとに quote 計算、勝者を選ぶ — **1inch と Paraswap が内部 pricing layer をどう shape するか正確そのもの**。彼らはスケール、より多い venue、より良いルーティング最適化を加える。カーネルは同一。

## Drill

1. **Curve を追加。** Curve pool (例: 3pool) を選ぶ。state を read、quote を実装 (stableswap)、\`get_dy(int128 i, int128 j, uint256 dx)\` を同じ \`call_view\` パターンで。(1.5時間)
2. **ガス会計。** 各 quote から推定ガスコストを引く (\`evm.estimate_gas\` をハイポセティカル swap に使う)。「best」ルートはいま \`amount_out − gas_cost_in_out_token\` を最大化するルートのはず。(2時間)
3. **マルチホップ探索。** 2-hop 探索を構築: A → WETH → B。WETH 経由の各候補に対して、連鎖 quote を計算、直接ルートと比較。(3時間)
4. **Split routing。** トップ 2 venue の 50/50 split を実装、合計 output が単独より大きいかチェック。(2時間)
5. **クロスティア:** aggregator を wallet backend ([Lesson 4](/courses/reth-building-ja/lessons/build-wallet-backend-ja)) に \`POST /quote-and-swap\` として wire、submission 用 signed tx を返す。(3時間)

Drill 5 を完成させれば、構造的に aggregator-as-a-service ができる。MEV 保護 ([Lesson 8](/courses/reth-building-ja/lessons/build-capstone-router-ja)) を plug in すれば、2023 年に出荷されたものと同等水準。

> 🛑 **最終チェック。** 一文で: なぜ aggregator にとって **forking** が **N 並列 \`eth_call\`** より厳密に優れているか? 答えに「全 read 横断の atomic state」がないなら、Step 1 を読み直し — その atomicity が比較を健全にする。

`,
                },
                {
                  title: 'Capstone — Frontrun-Resistant Order Router を作る',
                  slug: 'build-capstone-router-ja',
                  type: 'CONTENT',
                  sortOrder: 7,
                  duration: 60,
                  xpReward: 100,
                  content: `# Capstone — Frontrun-Resistant Order Router を作る

キャップストーン。本ティアのすべてを 1 つのサービスに統合する。ユーザが swap intent (JSON) を POST。Router は: DEX 全体で quote (Lesson 7)、mempool を監視して swap を sandwich する敵対 tx を探し (Lesson 1 を反転)、Revm で **その脅威をシミュレートしてユーザがどれだけ output を失うか測定**、EIP-7702 でガスを sponsor (Lesson 5)、そして — 脅威スコアが高ければ — Flashbots Protect 経由で submit (注文は public mempool に一切現れない)。脅威が低ければ public submission で OK、bundler のマージンも節約できる。**1 サービス、過去 6 レッスンを縫合、新規は決定レイヤー 1 つ。**

> 📌 **スコープの正直な開示。** このキャップストーンは本ティアの lesson 1〜7 のパターンを統合する。新規 build は **frontrun 検出ロジック** + **public mempool を bypass する submission パス**。Private RPC として Flashbots Protect を使う; 同じ形が MEV-Share、Beaverbuild の private endpoint、その他任意の private orderflow オークションでも動く。

## 何を作るか

\`\`\`bash
$ curl -X POST http://localhost:9000/route \\
    -d '{
      "user":      "0xAlice...",
      "in_token":  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      "out_token": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
      "amount_in": "10000000000",
      "min_out":   "2900000000000000000",
      "user_authorization": "0x04f8..."
    }'

{
  "decision": "EXECUTE_PRIVATE",
  "venue": "Uniswap V3",
  "expected_out": "2951042818093142817",
  "frontrun_risk": "LOW",
  "tx_hash": "0xabc...",
  "submission": "flashbots-protect"
}
\`\`\`

\`\`\`mermaid
flowchart TB
    User["POST /route"] --> Router["Router service"]
    Router -->|fork mainnet| Aggregator["Aggregator (L7)<br/>quotes + best venue"]
    Router -->|scan pending txs| Detector["Frontrun detector<br/>(L1 mempool watch +<br/>L7 simulation)"]
    Detector -->|adversarial tx found?| Decide{"Risk?"}
    Aggregator --> Decide
    Decide -->|HIGH| PrivPath["Private mempool<br/>(Flashbots Protect)"]
    Decide -->|LOW| PubPath["Public mempool"]
    PrivPath --> Sponsor["EIP-7702 sponsor (L5)"]
    PubPath --> Sponsor
    Sponsor --> Wallet["Wallet backend (L4)<br/>nonce/gas/replace"]
    Wallet --> Chain
\`\`\`

> 🛑 **スクロール前に予測。** Lesson 1 の MEV searcher は、この router が防御する **脅威そのもの**。**一文で**: その searcher が何をやって、この router が何を defeat する必要があるのか? Step 3 まで答えを書き留めてから先へ。

## どの lesson が入るか (そして新規部分)

| コンポーネント | 出典 | ここで新規なもの |
| :--- | :--- | :--- |
| **DEX 横断クオート** | [L7](/courses/reth-building-ja/lessons/build-swap-aggregator-ja) | そのまま再利用 |
| **Mempool 監視** | [L1](/courses/reth-building-ja/lessons/build-mev-searcher-ja) (searcher の入力!) | 防御として再利用 — opportunity ではなく敵候補を見つける |
| **Revm fork シミュレーション** | [L1](/courses/reth-building-ja/lessons/build-mev-searcher-ja) | 「この敵 tx はユーザを傷つけるか?」をスコアするのに使用 |
| **EIP-7702 sponsor** | [L5](/courses/reth-building-ja/lessons/build-7702-sponsor-ja) | パスに統合してユーザがガスを払わないよう |
| **Wallet backend submission + replace** | [L4](/courses/reth-building-ja/lessons/build-wallet-backend-ja) | public-mempool パスに使用 |
| **Private orderflow submission** | NEW | Flashbots Protect / MEV-Share 統合 |
| **決定ロジック (route + risk → submission パス)** | NEW | Capstone の貢献部分 |

新規性は **decision layer**。その下は全部、既に作ったパターン。

## Cargo.toml

\`\`\`toml
[package]
name = "frontrun-resistant-router"
version = "0.1.0"
edition = "2021"

[dependencies]
alloy = { version = "1.0", features = [
  "providers", "signer-local", "rpc-types", "network",
  "consensus", "eips", "sol-types"
] }
revm     = { version = "38", features = ["alloydb"] }
axum     = "0.7"
tokio    = { version = "1", features = ["full"] }
serde    = { version = "1", features = ["derive"] }
serde_json = "1"
futures  = "0.3"
eyre     = "0.6"
\`\`\`

## Step 1: 決定 struct (アーキテクチャを 1 つの型で)

router 全体は \`RouteRequest\` から \`RouteDecision\` への関数。型を先にスケッチ; 残りは自分で書ける。

\`\`\`rust
use alloy::primitives::{Address, B256, U256};

#[derive(serde::Deserialize)]
pub struct RouteRequest {
    pub user: Address,
    pub in_token: Address,
    pub out_token: Address,
    pub amount_in: U256,
    pub min_out: U256,
    pub user_authorization: String,  // EIP-7702 SignedAuthorization、hex エンコード
}

#[derive(Debug, Clone, Copy)]
pub enum FrontrunRisk { Low, Medium, High }

#[derive(serde::Serialize)]
pub struct RouteDecision {
    pub decision:        &'static str,    // "EXECUTE_PRIVATE" | "EXECUTE_PUBLIC" | "REJECT_TOO_RISKY"
    pub venue:           Option<&'static str>,
    pub expected_out:    Option<U256>,
    pub frontrun_risk:   String,          // serializable な FrontrunRisk
    pub tx_hash:         Option<B256>,
    pub submission:      Option<&'static str>,  // "flashbots-protect" | "public" | null
    pub reason:          Option<String>,
}
\`\`\`

Walk:

- **3 つの終端状態。** private 送信、public 送信、拒否。**拒否は機能**: best public venue のスリッページが private で提供できる範囲を超えるなら、ユーザに伝えるのが正解。
- **\`expected_out\` は aggregator 由来** (Lesson 7)。\`min_out\` と比較して、何かを送る *前* にユーザのスリッページ許容度を満たすかチェック。
- **\`submission\` フィールドはユーザに tx がどこに行ったかを伝える。** 透明性に有用 — Flashbots Protect endpoint が彼らの bundle を受信したか検証できる。

## Step 2: best quote を取る (Lesson 7 を再利用)

\`\`\`rust
// Lesson 7 から直接取り込み — 同じコード、変更なし
use crate::aggregator::{aggregate, pick_best, Quote};

async fn best_quote(
    db: &mut ForkedDB,
    req: &RouteRequest,
) -> eyre::Result<(Quote, &'static str)> {
    let quotes = aggregate(db, req.in_token, req.out_token, req.amount_in).await?;
    let best   = pick_best(&quotes).clone();
    Ok((best.clone(), best.venue))
}
\`\`\`

実装は見もしない — Lesson 7 のもの。**過去のレッスンコードをインポートするのも Capstone の reading の一部。** モジュラーに保つ。

## Step 3: Frontrun 検出 — 新しい部分

Lesson 1 の MEV searcher は mempool で *機会* を監視する。逆転すると、同じスキャンがユーザに対する *脅威* を見つける。具体的には: router が使おうとしているのと同じ pool を、router が価格を動かすのと同じ方向でターゲットにする pending tx。

\`\`\`rust
use alloy::providers::{Provider, ProviderBuilder, WsConnect};
use futures::StreamExt;
use std::time::Duration;

async fn scan_for_adversaries(
    provider: &(impl Provider + Clone),
    target_pool: Address,  // ユーザがこれから使う pool
    in_token:    Address,  // 方向が重要: 同じ方向 = sandwich リスク
    duration:    Duration,
) -> eyre::Result<Vec<alloy::rpc::types::Transaction>> {
    let mut sub = provider.subscribe_pending_transactions().await?.into_stream();
    let mut findings = Vec::new();
    let deadline = tokio::time::Instant::now() + duration;

    loop {
        tokio::select! {
            _ = tokio::time::sleep_until(deadline) => break,
            tx_hash = sub.next() => {
                let Some(tx_hash) = tx_hash else { break; };
                let Ok(Some(tx)) = provider.get_transaction_by_hash(tx_hash).await else { continue };

                if !looks_like_swap_on(&tx, target_pool, in_token) { continue }
                findings.push(tx);
                if findings.len() >= 5 { break }  // 5 候補でスコアには十分
            }
        }
    }
    Ok(findings)
}

fn looks_like_swap_on(tx: &alloy::rpc::types::Transaction, pool: Address, in_token: Address) -> bool {
    // ヒューリスティック: tx が known router をターゲット、かつ calldata に pool トークンが言及される。
    // Production router は router ABI でデコードして path をチェックする。
    // 明瞭性のためヒューリスティックを保つ。
    use alloy::primitives::address;
    const KNOWN_ROUTERS: &[Address] = &[
        address!("7a250d5630B4cF539739dF2C5dAcb4c659F2488D"), // UniV2
        address!("d9e1cE17f2641f24aE83637ab66a2cca9C378B9F"), // Sushi V2
        address!("E592427A0AEce92De3Edee1F18E0157C05861564"), // UniV3
    ];
    if !KNOWN_ROUTERS.contains(&tx.to().unwrap_or_default()) { return false; }
    let input = tx.input();
    let pool_bytes = pool.as_slice();
    let in_token_bytes = in_token.as_slice();
    // 簡易 substring check — 安価、このレイヤーでは false positive OK
    has_subseq(input, pool_bytes) || has_subseq(input, in_token_bytes)
}

fn has_subseq(haystack: &[u8], needle: &[u8]) -> bool {
    haystack.windows(needle.len()).any(|w| w == needle)
}
\`\`\`

Walk:

- **\`subscribe_pending_transactions\`** — Lesson 1 の同じ Alloy subscription。**searcher の mempool 入力を逐語的に再利用。**
- **ヒューリスティックは意図的に緩い。** 本物の production は router ABI をデコードして swap *path* を推論する。緩いヒューリスティックは過剰検出する (false positive = 必要なくても private にルート) が、これは安全な失敗モード。
- **\`duration\` が look-ahead window。** ~2 秒が sensible なデフォルト — 遅い人間を捕まえるには十分長く、ユーザが感じるほどの遅延ではない短さ。

> 🛑 **理解度チェック。** スクロール戻しなしで: 候補 swap の **方向** がなぜ sandwich 脅威かを判定するのに重要か? ヒント: frontrunner が victim と *同じ* 方向で取引する利益 vs *逆* 方向で取引する利益を考えて。

## Step 4: Revm シミュレーションで脅威をスコア

怪しい tx のリストだけでは不十分。**もしこれらがユーザより先に着地したら、ユーザの期待 output はどれだけ落ちるか?** を知る必要がある。

\`\`\`rust
async fn score_risk(
    db: &mut ForkedDB,                            // fresh fork、mutate される
    adversary_txs: &[alloy::rpc::types::Transaction],
    quote_before: U256,                           // 敵がいない場合のユーザの output
    req: &RouteRequest,
) -> eyre::Result<FrontrunRisk> {
    if adversary_txs.is_empty() { return Ok(FrontrunRisk::Low); }

    // 各敵 tx を fork に適用
    // (本物の router はシナリオごとに snapshot+rollback。ここでは sequential)
    for adv in adversary_txs {
        apply_tx_to_fork(db, adv).await?;
    }

    // post-敵 state で re-quote
    let quote_after = aggregate(db, req.in_token, req.out_token, req.amount_in).await?;
    let after_amount = pick_best(&quote_after).amount_out;

    // ユーザは期待 output の何分の何を失うか?
    let lost_bps = if quote_before > after_amount {
        ((quote_before - after_amount) * U256::from(10_000) / quote_before)
            .to_string().parse::<u64>().unwrap_or(0)
    } else { 0 };

    Ok(match lost_bps {
        0..=10   => FrontrunRisk::Low,    // <0.10% drop — ノイズ
        11..=50  => FrontrunRisk::Medium, // 0.10%〜0.50% drop — 防御の価値あり
        _        => FrontrunRisk::High,   // >0.50% drop — 必ず private にルート
    })
}

async fn apply_tx_to_fork(
    db: &mut ForkedDB,
    tx: &alloy::rpc::types::Transaction,
) -> eyre::Result<()> {
    use revm::context::TxEnv;
    use revm::primitives::TxKind;
    let mut evm = revm::Context::mainnet().with_db(db).build_mainnet();
    let tx_env = TxEnv::builder()
        .caller(tx.from())
        .kind(if let Some(to) = tx.to() { TxKind::Call(to) } else { TxKind::Create })
        .data(tx.input().clone())
        .value(tx.value())
        .gas_limit(tx.gas_limit())
        .build()?;
    let _ = evm.transact_one(tx_env)?;
    Ok(())
}
\`\`\`

Walk:

- **Quote-before vs quote-after が実際の measure。** ヒューリスティック検出 (Step 3) は *候補* を見つける; シミュレーションが *傷つけるか* を教える。後者だけが private ルーティングを正当化する。
- **Sequential application は簡素化。** 本物の実装は各敵を独立にシミュレート、worst case を取り、結合する。Drill 2。
- **basis points での閾値** はプロトコル単位で調整可能。USDC/USDT の stable swap は 1bp 許容するかも; エキゾチックペアの swap は 50bp 受け入れるかも。

## Step 5: 提出

決定木:

\`\`\`rust
async fn execute_decision(
    state: &AppState,
    req: &RouteRequest,
    venue: &'static str,
    expected_out: U256,
    risk: FrontrunRisk,
) -> eyre::Result<RouteDecision> {
    if expected_out < req.min_out {
        return Ok(RouteDecision {
            decision:      "REJECT_TOO_RISKY",
            venue:         Some(venue),
            expected_out:  Some(expected_out),
            frontrun_risk: format!("{risk:?}"),
            tx_hash:       None,
            submission:    None,
            reason:        Some(format!("expected_out {} < min_out {}", expected_out, req.min_out)),
        });
    }

    // EIP-7702 sponsored tx を構築 (Lesson 5、直接持ち込み)
    let tx_request = build_sponsored_tx(
        &state.public_provider,
        &state.sponsor,
        req.user,
        &req.user_authorization,
        vec![/* 選んだ venue の router への swap call */],
    ).await?;

    let (submission, hash) = match risk {
        FrontrunRisk::High | FrontrunRisk::Medium => {
            // Flashbots Protect (or 任意の private RPC) 経由で提出
            let private = &state.private_provider;
            let h = private.send_transaction(tx_request).await?;
            ("flashbots-protect", *h.tx_hash())
        }
        FrontrunRisk::Low => {
            // public mempool で OK — bundler markup を節約
            let h = state.public_provider.send_transaction(tx_request).await?;
            ("public", *h.tx_hash())
        }
    };

    Ok(RouteDecision {
        decision:      if submission == "flashbots-protect" { "EXECUTE_PRIVATE" } else { "EXECUTE_PUBLIC" },
        venue:         Some(venue),
        expected_out:  Some(expected_out),
        frontrun_risk: format!("{risk:?}"),
        tx_hash:       Some(hash),
        submission:    Some(submission),
        reason:        None,
    })
}
\`\`\`

**2 つの provider** が load-bearing piece。\`public_provider\` は普通の RPC (Infura、自前 Reth) に接続; \`private_provider\` は https://rpc.flashbots.net/protect に接続。**同じ Alloy コード、違う endpoint** — それが sandwich 攻撃を defeat する非対称性。

## Step 6: 統合

\`\`\`rust
async fn route_handler(
    State(state): State<Arc<AppState>>,
    Json(req): Json<RouteRequest>,
) -> Result<Json<RouteDecision>, (axum::http::StatusCode, String)> {
    // 1. venue 横断 quote (L7 持ち込み)
    let mut db = build_fork().await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let (best, venue) = best_quote(&mut db, &req).await
        .map_err(|e| (axum::http::StatusCode::BAD_GATEWAY, e.to_string()))?;

    // 2. ~2 秒間 mempool で adversarial tx を監視 (L1 反転)
    let pool_for_route = address_for_venue(venue, req.in_token, req.out_token);
    let adversaries = scan_for_adversaries(&state.public_provider, pool_for_route, req.in_token, Duration::from_secs(2)).await
        .unwrap_or_default();

    // 3. シミュレーションでリスクをスコア (L1 + L7 結合)
    let mut risk_db = build_fork().await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let risk = score_risk(&mut risk_db, &adversaries, best.amount_out, &req).await
        .unwrap_or(FrontrunRisk::Low);

    // 4. 一致する submission パスで実行 (L4 + L5 持ち込み)
    let decision = execute_decision(&state, &req, venue, best.amount_out, risk).await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(decision))
}
\`\`\`

本レッスンの新規コード合計: ~250 LOC。**router** 全体コード: この 250 + 持ち込まれる lesson — 1 つのリポに収まる動く frontrun-resistant order router。

## Production に足りないもの

| ギャップ | 本物の production router が何をしているか |
| :--- | :--- |
| **MEV-Share / OFA 統合** | Orderflow を最高 searcher 入札に private auction; rebate をユーザに戻す。(Flashbots Protect は単純版) |
| **ユーザ単位スリッページ予算** | 5% スリッページを超えて quote しない; ユーザに \`amount_in\` を減らすよう伝える |
| **キャンセル + 返金フロー** | private bundle が 2 ブロックで着地しないなら、EIP-7702 authorization は無駄。ユーザ向け UI + 返金ロジックが必要 |
| **マルチリージョン private RPC** | Flashbots、Beaverbuild、Titan、Rsync に同時 submit; 最初に着地したものが勝つ |
| **ユーザ単位レート制限** | API access を持つ bad actor は quote を spam できる (安価)、しかし各 quote は fork を消費する; cap |
| **Observability** | 全 (venue, risk, submission) 決定をログ。1000 ルート後に評価: private にルートしたとき、シミュレートされた drop は実 on-chain 結果と一致したか? 実データで閾値をチューニング |

書いたアーキテクチャ — quote → 敵検出 → sim でスコア → private vs public 決定 → 適切なパス経由で submit — **すべての defensive routing service の背骨**。CowSwap、MEV-Share consumer、retail wallet backend — すべてこのバリエーションをやっている。**今あなたは作った。**

## Drill (カリキュラム最長、意図的に)

1. **本物の router ABI デコード。** \`looks_like_swap_on\` の緩い substring ヒューリスティックを UniV2 / V3 / Sushi router calldata の proper \`sol!\` デコードに置き換え。path に \`(in_token, out_token)\` がどちらかの方向で含まれるかチェック。(3時間)
2. **独立シミュレーション。** 各敵を独立にスコア (各敵間で fork を snapshot + rollback)。worst-case drop を取る。(2時間)
3. **キャンセルフロー。** \`POST /cancel { tx_hash }\` を追加 — ユーザの authorization を refund (即ち、original を invalidate する no-op tx を同じ nonce で署名)。UI に wire。(3時間)
4. **マルチ RPC private submission。** 2 つの private endpoint (Flashbots Protect + Beaverbuild) に同時 submit。最初に着地した方の hash を返す。(1.5時間)
5. **閾値オートチューニング。** 各 router 決定 + 実 on-chain 結果 (drop は予測より大きいか小さいか?) をログ。historical data に対して bps 閾値を fit する小さい offline スクリプトを構築。(5時間)

Drill 5 後、チューニング済み・観察可能に正しい frontrun-resistant router が手に入る。**これがユーザ trust を真剣に受け取る wallet チームに対して production に出すもの。**

> 🛑 **最終チェック (カリキュラム最終チェック)。** 一文で: このティアの 8 lesson のうち、なぜ *capstone* が他のどのコンポーネントより **simulation** (L1) に依存するのか? 答えに「ユーザの損失と同じ単位で脅威を測らずに、防御するか決められない」がないなら、capstone はまだ完全には届いていない — Step 4 を読み直し。


---

## Building tier 完走

8 lesson の総まとめ:

1. 最小 MEV searcher (mempool → fork-sim → arb)
2. Reorg-aware Postgres indexer (ExEx + reorg ディスパッチ)
3. カスタム RPC エンドポイント (jsonrpsee + extend_rpc_modules)
4. Wallet backend (signer pool + nonce mgr + replace-on-stuck)
5. EIP-7702 sponsor (Type 4 tx + paymaster パターン)
6. Foundry スタイル cheatcode (custom precompile + ハーネス)
7. Swap aggregator (Revm fork + venue 横断 quote)
8. **Frontrun-resistant order router (本レッスン)** — 上記すべて統合

ターゲット雇用主 / プロジェクトに最も興味のあるものを選ぶ。Production ギャップを開く。小さな public リポとして ship。**それが Paradigm / Tempo / 真剣チーム との会話に持っていく artifact。**
`,
                },
                {
                  title: 'Revm シミュレーションを Production Provider で検証する',
                  slug: 'build-validate-revm-ja',
                  type: 'CONTENT',
                  sortOrder: 8,
                  duration: 50,
                  xpReward: 90,
                  content: `# Revm シミュレーションを Production Provider で検証する

あなたの arb bot の Revm fork は「この swap で 2.95 WETH 取れる」と言う。実際にチェーン (大半が Geth と Nethermind — Reth は依然として execution client シェアの ~7-12% に過ぎない) で実行されると 2.93 しか届かない。**bot は自分のシミュレーションのバグで損を出した**。本ティアで作った Revm ベースのシステム全部に同じリスクがある: L1 の MEV searcher は Revm で arb を予測、L7 の aggregator は Revm で quote、L8 の capstone は Revm で frontrun リスクをスコアする。Revm が mainnet を実際に動かしている Geth/Nethermind の多数派と食い違えば、全部のシステムが silently に誤った答えを出荷する。以下の ~200 行がクロスチェックを作る。

> 📌 **スコープの正直な開示。** Revm を JSON-RPC provider に対して、単一トランザクションのガス + 戻り data で diff する。production 検証ハーネスはこれを拡張する: \`debug_traceTransaction\` の prestate による完全 state-diff 比較、数千の歴史的 tx に対する統計的サンプリング、ハードフォーク境界の回帰テスト、CI 統合。カーネル — *「一致する」とはどういう意味か、それを安価にどう確認するか?* — は同じ。

## なぜこれが重要か (本当の理由)

規律は安価。スキップのコストは現実 — bot の P&L、aggregator がユーザに見せる quote、router の脅威スコア、すべてが silently にズレる。[Reth team のベンチマーキング哲学](https://www.paradigm.xyz/2024/04/reth-perf) より: 「mainnet 挙動からの逸脱はどれもバグ」。それが基準。

\`\`\`mermaid
flowchart LR
    Tx["テストトランザクション<br/>(実 mainnet tx hash<br/>または fabricated call)"] --> Revm["Revm fork<br/>at parent block"]
    Tx --> Prov["Provider<br/>(Infura / QuickNode<br/>= Geth or Reth backend)"]
    Revm --> R1["gas_used + output"]
    Prov --> R2["gas_used + output"]
    R1 --> Diff["Diff"]
    R2 --> Diff
    Diff --> Pass["✅ identical"]
    Diff --> Fail["❌ debug<br/>(hardfork? precompile?<br/>RPC caching?)"]
\`\`\`

> 🛑 **スクロール前に予測。** カスタム Revm セットアップが、非 mainnet ハードフォーク (例: mainnet が Osaka なのにチェーンがまだ Cancun ルール) で追加された opcode を実行する。それは **走らせている spec に対しては技術的に正しい** 結果を計算するが、mainnet と一致しない。この不一致が検証ハーネスでどう見えるか walk through。答えを書き留めてから先へ。

## Cargo.toml

\`\`\`toml
[package]
name = "revm-cross-validation"
version = "0.1.0"
edition = "2021"

[dependencies]
alloy-eips         = "1.0"
alloy-primitives   = "1.5"
alloy-provider     = "1.0"
alloy-network      = "1.0"
alloy-rpc-types    = "1.0"
alloy-sol-types    = "1.5"
revm               = { version = "38", features = ["alloydb"] }
tokio              = { version = "1", features = ["full"] }
eyre               = "0.6"
\`\`\`

## Step 1: テストケースを選ぶ

テストターゲットは 2 種類。両方使う:

1. **歴史的 mainnet トランザクション** — 既に mine された tx を parent block でリプレイ。receipt が gas_used の ground truth、provider の \`eth_call\` が parent block での return data の ground truth。
2. **現状 state に対する fabricated call** — contract + メソッド (例: \`USDC.balanceOf(some_holder)\`) を選び、provider \`eth_call\` と Revm fork で同じブロックで実行。provider のレスポンスが ground truth。

Flavor 2 が始めるのに簡単 (歴史的 RPC 不要) なので、それを構築。Flavor 1 は drill で。

\`\`\`rust
use alloy_primitives::{address, Address, Bytes, U256};
use alloy_sol_types::{sol, SolCall};

sol! {
    function balanceOf(address account) external view returns (uint256);
}

const USDC: Address = address!("a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
const HOLDER: Address = address!("47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503"); // known whale

fn build_calldata() -> Bytes {
    balanceOfCall { account: HOLDER }.abi_encode().into()
}
\`\`\`

## Step 2: Production provider の答えを取る

\`\`\`rust
use alloy_eips::BlockId;
use alloy_provider::{Provider, ProviderBuilder};
use alloy_rpc_types::TransactionRequest;
use alloy_network::TransactionBuilder;

async fn provider_answer(
    rpc_url: &str,
    block: u64,
    to: Address,
    data: Bytes,
) -> eyre::Result<(u64, Bytes)> {
    let provider = ProviderBuilder::new().connect(rpc_url).await?;

    let tx = TransactionRequest::default()
        .with_to(to)
        .with_input(data);

    // 選んだブロックでの eth_call による出力 ground truth
    let output = provider.call(&tx).block(BlockId::number(block)).await?;

    // 同ブロックでの eth_estimateGas によるガス ground truth
    let gas = provider.estimate_gas(&tx).block(BlockId::number(block)).await?;

    Ok((gas, output))
}
\`\`\`

Walk:

- **\`eth_call\` は関数の return bytes を返す**、トランザクションを送らずに — contract が使うのと正確に同じ実行パス、ただし state を永続化しない。
- **\`eth_estimateGas\` は call が消費するガス単位を返す。** 実 on-chain ガスより少し高い (safety buffer 含む); view 呼び出し (\`balanceOf\` 等) では buffer は小さい。
- **両方とも特定の \`block\` にピン留め** — Revm を同じブロックの state に対して走らせれば、apple to apple で比較できる。

> 🔍 **リポで探す。** [\`alloy_provider::Provider\`](https://github.com/alloy-rs/alloy/blob/main/crates/provider/src/provider/trait.rs) を開く。\`call\` と \`estimate_gas\` が同じ trait の一部 — provider を切り替えると (Infura → QuickNode → 自前 Reth ノード) 、検証コードに何も変更がいらない。**それが抽象化が稼いでる対価。**

## Step 3: 同じ call をローカルで Revm 経由で走らせる

L1 / L7 と同じ fork パターン。Step 2 と同じブロックにピン:

\`\`\`rust
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

async fn revm_answer(
    rpc_url: &str,
    block: u64,
    to: Address,
    data: Bytes,
) -> eyre::Result<(u64, Bytes)> {
    let provider = ProviderBuilder::new().connect(rpc_url).await?.erased();
    let alloy_db = WrapDatabaseAsync::new(AlloyDB::new(provider, BlockId::number(block)))
        .ok_or_else(|| eyre::eyre!("AlloyDB init"))?;
    let mut db = CacheDB::new(alloy_db);

    let mut evm = Context::mainnet().with_db(&mut db).build_mainnet();

    let tx = TxEnv::builder()
        .caller(Address::ZERO)
        .kind(TxKind::Call(to))
        .data(data)
        .gas_limit(10_000_000)
        .build()?;

    let result = evm.transact_one(tx)?;
    match result.result {
        ExecutionResult::Success { gas_used, output: Output::Call(out), .. } => {
            Ok((gas_used, out.into()))
        }
        other => eyre::bail!("Revm execution did not succeed: {other:?}"),
    }
}
\`\`\`

Walk:

- **\`AlloyDB::new(provider, BlockId::number(block))\`** が fork を provider が答えた正確なブロックにピン。**同じ入力、同じ世界。**
- **\`Context::mainnet()\`** が mainnet ハードフォークルールを使う。検証対象のチェーンが mainnet *ではない* なら (例: カスタム L2)、それに合致する spec を使う — Revm の \`Context\` builder は選択可能。
- **caller を \`Address::ZERO\`** view-style call には署名不要、generic アドレスからの \`eth_call\` と同じ。

## Step 4: Diff

\`\`\`rust
async fn validate(rpc_url: &str, block: u64, to: Address, data: Bytes) -> eyre::Result<()> {
    let (prod_gas, prod_out) = provider_answer(rpc_url, block, to, data.clone()).await?;
    let (revm_gas, revm_out) = revm_answer(rpc_url, block, to, data).await?;

    println!("== Output bytes ==");
    println!("  provider: 0x{}", hex::encode(&prod_out));
    println!("  revm:     0x{}", hex::encode(&revm_out));
    if prod_out != revm_out {
        eyre::bail!("OUTPUT MISMATCH");
    }
    println!("  ✅ match");

    println!("== Gas ==");
    println!("  provider: {prod_gas}");
    println!("  revm:     {revm_gas}");
    // eth_estimateGas に buffer (~10%) があるので少しの spread を許容
    let diff = prod_gas.abs_diff(revm_gas);
    let allowance = (prod_gas / 10).max(5_000);
    if diff > allowance {
        eyre::bail!("GAS MISMATCH: diff {diff} > allowance {allowance}");
    }
    println!("  ✅ within allowance");

    Ok(())
}
\`\`\`

Walk:

- **出力 bytes は完全一致で比較。** byte レベル diff が正しい契約 — Revm 版が provider と 1 byte でも違う bytes を返したら、レスポンスを decode する下流コードが違う値を生む。
- **ガス比較は spread を許容**、\`eth_estimateGas\` には Revm の正確なガス計算が加えない buffer (大抵 10-20%) が含まれるから。完全 equality ではなく order of magnitude を比較。
- **\`println!\` でカーネルとしては OK。** Production wrapper は \`tracing::error!\` + 構造化 diff でログから query 可能にする。

> 🛑 **理解度チェック。** スクロール戻しなしで、なぜ **byte レベル出力比較は完全** で、**ガス比較は近似** か一文で。ヒント: \`eth_estimateGas\` が \`evm.transact_one\` が測ること以上に何を *すべき* かを考えて。

## Step 5: 一致しないとき — debug 分類

実 validation 実行は不一致を見つける。診断ツリー:

| 症状 | 想定原因 | 修正 |
| :--- | :--- | :--- |
| **本来非ゼロのはずの出力が一貫して 0x or 空** | Revm の spec が違う (例: \`Context::mainnet()\` で構築したがチェーンは op-mainnet) | チェーン spec に合わせる: \`OpEvm\`、\`Context::op_mainnet()\` 等 |
| **ハードフォーク境界でだけ出力が違う** | Revm のハードフォーク有効化ブロックがチェーンと不一致 | Revm の spec をそのブロックでアクティブな実ハードフォークにピン留め — \`SpecId\` 参照 |
| **contract が precompile を呼ぶときだけ出力が違う** | Revm にないカスタム precompile (例: いくつかの L2 でアクティブな RIP-7212 secp256r1) | precompile を Revm precompile registry に追加 (L6 参照) |
| **出力がフリッカーする — 同じ入力で時々一致、時々違う** | RPC キャッシング。provider が違うブロックの古い state を返した | 確定ブロック (latest から ~32 引いた) にピン、再実行 |
| **ガスが固定オフセットでずれる** | intrinsic gas accounting が違う (21,000 base をスキップした、あるいは逆) | 整合: 測ってるのは call のガスだけか、tx 全体のガスか? |
| **ガスがランダムにばらつく** | hot vs cold ストレージアクセス。provider が直近 call で warm state を持っている | clean サイクル後に再実行、または warm/cold 制御可能な合成 state で fork |

実用上、上位 3 行に大半が落ちる — チェーン spec / ハードフォーク / precompile mismatch。

## Production レベル validation に足りないもの

| ギャップ | 実 validation ハーネスが何をしているか |
| :--- | :--- |
| **サンプリング戦略** | 直近 7 日のランダム歴史的 tx を 1000 件; 全部 validate。系統的 drift を見つける |
| **State-diff 比較** | \`debug_traceTransaction\` の prestate + statediff モードで byte レベル state 変化を取得。Revm の journal entry と比較 (高コスト RPC、サンプリング sparse に) |
| **ハードフォーク regression** | Revm 更新後、直近 5 ハードフォークブロック周辺で再 validate。新 Revm version は spec activation を変えることがある |
| **カスタム precompile awareness** | Revm セットアップは対象チェーンの全 precompile を含む必要がある。RIP-7212、EIP-2537、カスタム op-stack precompile、MEV-Share helper precompile 等 |
| **CI 統合** | validation を CI パイプラインに含める。diff allowance 超過なら merge を fail |
| **Multi-provider クロスチェック** | 同じ validation を 2-3 provider (QuickNode、Infura、Alchemy) に対して走らせる。provider 同士が同意しないなら、validation の前提が崩れる — どれかを source of truth に選ぶ |
| **Performance** | provider の答えをキャッシュ + 変更 lesson のみ再 validation。RPC bill 削減 |

上記カーネルを作って、production-grade な習慣はニーズに合わせて足す。大半のチームは少数の手選びテストケースから始めて成長させる。

## Drill

1. **歴史的 tx replay。** 実 mainnet tx hash を選ぶ。receipt 取得 → parent block を fork point に → receipt.gas_used を Revm replay の gas_used と diff。(1 時間)
2. **カスタム precompile ケース。** op-stack チェーン (Base、Optimism) を選ぶ。op-stack にあるが mainnet にない precompile を使う tx (例: L1 block info precompile) の validation を試みる。失敗モードを観察。**diff は何を示す?** (1 時間)
3. **サンプリングハーネス。** validate 関数を、単一 contract (Uniswap V3 router は trafficが多い) の直近 100 個の成功 tx を walk するループで wrap。pass/fail を track。**失敗率は? 失敗パターンは系統的かランダムか?** (2 時間)
4. **Multi-provider クロスチェック。** 同じ validation を QuickNode + Alchemy に対して走らせる。両者が同じブロックの同じ call で同意しないなら、validation ハーネスの前提について何が言えるか? (1.5 時間)
5. **CI wire-up。** 任意の失敗で exit-code 1 になるよう validation スクリプトを修正。GitHub Action に組み込んで mainnet に対し nightly 実行。baseline vs >0.1% 不一致率を導入する PR を fail に。(3 時間)

Drill 5 を完成させれば、構造的に全 serious Revm-based searcher / wallet / aggregator チームが ship する継続検証規律と同じものができる。**「ラップトップで動く Revm コード」と「production で信頼する Revm コード」を分ける規律。**

> 🛑 **最終チェック。** 一文で: なぜこのティアで L1-L8 を build することは、**同時に** この validation lesson を build することを要求するのか? 答えに「Reth が ~7-12% のクライアントシェア」と「sim の正しさは Reth ではない 88-93% との一致に依存する」が繋がってないなら、冒頭を読み直し — それがこの lesson が tier 最後にいる全理由。

## 📺 関連動画

\`\`\`youtube
Nh19f_2fWLc | Dragan Rakita — EVM Technical walkthrough — Revm が production と一致するために従う必要のある spec
\`\`\`

---

## Building tier 完走 (今度こそ本当に)

「arb のアイデアがある」から「Revm が production の Geth と一致することを保証できる」まで網羅する 9 lesson:

1. 最小 MEV searcher (mempool → fork-sim → arb)
2. Reorg-aware Postgres indexer (ExEx + reorg ディスパッチ)
3. カスタム RPC エンドポイント (jsonrpsee + extend_rpc_modules)
4. Wallet backend (signer pool + nonce mgr + replace-on-stuck)
5. EIP-7702 sponsor (Type 4 tx + paymaster パターン)
6. Foundry スタイル cheatcode (custom precompile + ハーネス)
7. Swap aggregator (Revm fork + venue 横断 quote)
8. Frontrun-resistant order router (capstone — 1-7 統合)
9. **Cross-client validation harness (本レッスン)** — 上記 8 本を「デモ」から「production-trusted」へ

ターゲット雇用主 / プロジェクトに最も近い build を選ぶ。Production gaps を開ける。小さな public リポとして ship。**それが会話に持っていく artifact。**
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
