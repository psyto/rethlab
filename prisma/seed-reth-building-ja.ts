import { PrismaClient } from '@prisma/client';

export async function seedRethBuildingJA(prisma: PrismaClient) {
  const tags = ['reth', 'revm', 'alloy', 'rust', 'mev', 'building', 'application', 'capstone'];

  await prisma.course.create({
    data: {
      slug: 'reth-building-ja',
      title: 'Building with the Stack — 実アプリを作る',
      description:
        'ソース読解は前提条件であり、このティアはその実装編である。Rust + Alloy + Revm で 10 本のアプリを作り、systems engineering スタックの各層を少なくとも 1 度ずつ通る。対象は MEV searcher、ExEx インデクサ、カスタム RPC、wallet backend、EIP-7702 sponsor、Foundry スタイル cheatcode、swap aggregator、frontrun-resistant router、cross-client validation、HTTP 402 + MPP endpoint。',
      difficulty: 'EXPERT',
      duration: 420,
      xpReward: 100,
      track: 'reth-building',
      tags,
      isPublished: true,
      sortOrder: 1460,
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
                  title: 'レッスン0 — テストゲート — このティアでは全アプリがテスト green で初めて完了',
                  slug: 'building-test-gate-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 18,
                  xpReward: 35,
                  content: `# レッスン0 — テストゲート — この tier では全アプリがテスト green で初めて完了

## 問い

ここまでの 4 ティアはソースを *読む* フェーズだった。ここからは *作る* フェーズに入る。だが「読んだ」「作った」「たぶん動く」を、どうやって「正しい」と区別するのか？ 自分で書いたコードの正しさは、誰がどうやって証明するのか？

> 注: この Building コースのコードブロックは「実行可能な最小例」と「概念説明の抜粋」が混在する。各レッスンの指示（抜粋/実行）に従うこと。

## 原理（最小モデル）

- **テストスイートが green になるまで、レッスンは完了でない。** 判定は green か未完了の 2 択だけ。「読んだ」「作った」「たぶん動く」は完了条件にならない。本気のインフラを動かすチーム（TigerBeetle / Cloudflare / PostgreSQL）に「読んだら正しそうだった」を答えとする組織はひとつもない。
- **なぜ Building だけ厳しいか。** Foundations / Intermediate は検証済みコードを *読む* フェーズだった。Building は自分でコードを *書く* フェーズ。書いたコードの正しさは作者が証明するしかなく、テストがなければ「正しさ」は主張にしかならない。
- **2 つの再帰パターン。** ① pin した mainnet fork（\`PINNED_BLOCK\` を repo 内定数に — pin しないとテストが非決定的になり CI が意味を失う）② differential testing（参照実装 = Revm 以外の provider の \`debug_trace\` と一致を assert — 「見た目の妥当性」でなく「同じ入力で参照と一致」）。
- **テストは検証手段でなく実行可能仕様。** 実装後に書くと仕様が「今の実装の追認」になる。先に書けば仕様を実装から独立に定義でき、実装を仕様へ合わせる設計になる。バグはこの差分から見つかる。

## 具体例

全アプリが従う scaffold:

\`\`\`
my-app/
├── Cargo.toml          # workspace
├── src/
│   └── lib.rs          # アプリ本体
├── tests/
│   ├── integration.rs  # async / RPC / DB の境界をまたぐ
│   └── fixtures/       # golden テスト入力（tx ハッシュ・ブロック番号・期待出力）
├── foundry.toml        # Solidity サーフェスがある場合
└── test/
    └── *.t.sol         # Solidity 側の forge テスト
\`\`\`

パターン 1 — pin した mainnet fork:

\`\`\`rust
// tests/integration.rs
use alloy::providers::ProviderBuilder;

const PINNED_BLOCK: u64 = 18_500_000;
const FORK_RPC: &str = "https://eth.merkle.io";

#[tokio::test]
async fn searcher_finds_known_opportunity() {
    let provider = ProviderBuilder::new()
        .connect_http(FORK_RPC.parse().unwrap());

    // PINNED_BLOCK で AlloyDB-backed Revm を構築
    // searcher を走らせる
    // 期待される機会が見つかることを assert
    // P&L が史実と一致することを assert
}
\`\`\`

パターン 2 — differential testing:

\`\`\`rust
#[tokio::test]
async fn simulator_matches_geth_debug_trace() {
    for tx_hash in HISTORICAL_TX_HASHES {
        let our_trace = our_simulator.trace(tx_hash).await;
        let geth_trace = alchemy_provider.debug_trace_transaction(tx_hash).await;
        assert_traces_equivalent(&our_trace, &geth_trace);
    }
}
\`\`\`

differential testing は、コンセンサスで定義された挙動を再実装するコードに対する gold standard。「本当に正しい?」への唯一の誠実な答えがこれだ。

## 失敗例（誤解）

「先にプロトタイプを作り、設計が固まってからテストを書く」は誤り — 一見合理的だが、実装先行だと仕様が実装の追認になり本番品質に届かない。Reth / Revm / Foundry の開発現場は test-first か test-alongside が前提。このティアはその現場基準をそのまま採用する。

---

ここまでで「green か未完了の 2 択」「テストは実行可能仕様」は着地した。ここから 10 本のアプリを作る。各レッスンはこの gate を越えさせる作りになっている。

> 🛑 **予測。** なぜこのルールは Building (Expert) では厳しく、Foundations / Intermediate では適用されないのか？（答え: 前者は検証済みコードを *読む* フェーズ、後者は自分で *書く* フェーズ。書いたコードの正しさは、テストでしか「主張」を「証明」に変えられない。だから書くフェーズでだけ gate が要る。）

## アプリ種別ごとの「テスト済み」最低ライン

| アプリ | 最低テスト gate |
| :--- | :--- |
| **MEV searcher** | Forked-state テスト — 過去の実機会を再現し P&L が正であることを assert。Reorg テスト — 1 ブロック reorg を bundle が生き残るか正しく巻き戻る |
| **ExEx インデクサ**（\`tidx\` walk-through） | Fixture chain replay — 既知の \`Notification::ChainCommitted\` / \`ChainReverted\` を流し込んで、導出状態が golden reference と一致することを assert |
| **Custom RPC エンドポイント** | Integration テスト — ノードを in-process で起動、新メソッドを HTTP で叩いて JSON レスポンスを assert。エラーパス（不正パラメータ、欠損ブロック）も網羅 |
| **ウォレットバックエンド** | Roundtrip テスト — 署名済み tx が元に decode で戻る。Nonce invariant — 連続呼び出しが連続 nonce を返し、欠損も重複も無い |
| **EIP-7702 sponsor** | Replay 防止テスト — 同じ auth tuple は 2 度 sponsor できない。ガス会計テスト — sponsor が正しい額を払い、ユーザは 0 を払う |
| **カスタム cheatcode** | Differential テスト — Rust precompile と参照実装の Solidity が、1000 件の fuzz 入力で同じ出力を返す |
| **Swap aggregator** | Forked-state テスト — pin したブロックの実 Uniswap V3 pool に対して quote を取り、既知の正答との差が ε 以内 |
| **Capstone（order router）** | End-to-end fork テスト — order を投入し、router が分割 / ルーティング / 着地 / fill 報告するまでを観察 |
| **Revm validation** | Differential テスト — mainnet の小範囲の各ブロックで、Revm のトレースが Revm 以外のプロバイダの \`debug_traceTransaction\` 出力と一致 |
| **Machine payments (HTTP 402)** | Integration テスト — 支払い無しのリクエストは 402、有効な micropayment 付きはリソースを返す。Replay 防止テスト — 同じ payment が 2 リクエストを満たせない |

各行が最低ライン。実際の本番システムはこの上に fuzz、invariant、chaos テストを積む。純 Rust アプリ（MEV searcher・インデクサ・ウォレットバックエンド・sponsor）は \`Cargo.toml\` + \`src\` + \`tests\` だけ。Solidity サーフェスを持つアプリ（cheatcode・aggregator・capstone）は Rust と Foundry の両スイート。

## 各レッスン終了時に ship するもの

完了 = **公開可能な artifact** が次を備えた状態:

1. リポジトリ（Git でも local でも）
2. アプリの説明を書いた \`README\`
3. 全依存を pin した \`Cargo.toml\`（適用可能なら \`foundry.toml\` も）
4. 実装が入った \`src/\`
5. 上の表の gate スイートが入った \`tests/\`
6. ローカルで再現可能に通る \`cargo test\`（適用可能なら \`forge test\`）
7. pin した mainnet fork ブロック（または fixture chain）がテストファイルに記録されている

どれか欠ければ未完了。**artifact と証明はセットで ship、もしくは ship しない。**

## 合格基準

> **1 行ゲートチェック。** Building レッスンを「完了」と主張する前に答える: *「このアプリが正しいことを示すコマンドは何で、現在の終了コードは何か?」* 1 文で答えられないなら、まだ作っていない。

## まとめ（3行）

- このティアの完了条件は 1 つ — テストスイートが green になること。green か未完了の 2 択で、「たぶん動く」は完了でない（読むフェーズと違い、書いたコードの正しさは作者がテストで証明する）。
- 2 つの再帰パターン: pin した mainnet fork（\`PINNED_BLOCK\` 定数で決定的に）と differential testing（参照 provider の \`debug_trace\` と一致 = 再実装コードの gold standard）。
- テストは実行可能仕様 — test-first / test-alongside で書き、実装を仕様に合わせる。次レッスンの MEV searcher から、受け入れテストを実装より先に置く。

## 次のレッスン（レッスン1）

*最小限の MEV Searcher を Rust で作る*。まず受け入れテストを書き、実装なしで fail を確認し、pass するまで実装を進める。順序は固定 — **テストが先、コードが後**。`,
                },
                {
                  title: 'レッスン1 — 最小限の MEV Searcher を Rust で作る',
                  slug: 'build-mev-searcher-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 45,
                  xpReward: 80,
                  content: `# レッスン1 — 最小限の MEV Searcher を Rust で作る

## 問い

mempool 監視・swap デコード・fork シミュレーション・bundle 構築は、どの searcher でも必要になる。問いは「1 回書けるか」ではなく「次の strategy 追加時に再利用できるか」だ。本番の searcher はどう構成するのか？（読む対象は Paradigm の [\`artemis\`](https://github.com/paradigmxyz/artemis)。）

## 原理（最小モデル）

- **searcher = イベント処理パイプライン。** 外部シグナルが入り、MEV ロジックが何をするか決め、アクションが出ていく。artemis はこれを 3 trait + engine に分割する: \`Collector<E>\`（外部→イベント）/ \`Strategy<E,A>\`（イベント→0 個以上のアクション、MEV の脳、opportunity ごとに書く唯一のファイル）/ \`Executor<A>\`（アクション→副作用）。
- **broadcast channel で全 strategy が全イベント・全 executor が全アクションを受ける。** 不要なものは strategy で \`vec![]\`、executor で \`ExecutorMap\` が捨てる。新 strategy の ship = \`impl Strategy\` を 1 つ書いて \`engine.add_strategy(...)\` だけ（collector/executor は再利用）。
- **Executor を Strategy から分離する理由。** 同じ opportunity でも提出先は複数ある（public mempool / Flashbots / MEV-Share）。\`Action\` を出して executor を差し替えられれば耐障害性が上がる。提出処理を strategy に直書きすると、提出先障害で全体が止まる。
- **strategy 間の調整ロジックは存在しない。** engine は調整しない。必要なら collector を組み合わせ、単一 strategy 内で調整する。

## 具体例

中核の抽象は 1 ファイル ~120 行（\`crates/artemis-core/src/types.rs\`）:

\`\`\`rust
#[async_trait]
pub trait Collector<E>: Send + Sync {
    async fn get_event_stream(&self) -> Result<CollectorStream<'_, E>>;
}

#[async_trait]
pub trait Strategy<E, A>: Send + Sync {
    async fn sync_state(&mut self) -> Result<()>;
    async fn process_event(&mut self, event: E) -> Vec<A>;
}

#[async_trait]
pub trait Executor<A>: Send + Sync {
    async fn execute(&self, action: A) -> Result<()>;
}
\`\`\`

engine がこの 3 系統を Tokio task として起動し、2 本の broadcast channel で接続する:

\`\`\`
collectors -- events --> [event channel] -- events --> strategies
                                                          |
                                                         actions
                                                          v
executors <-- actions <-- [action channel] <-- actions <--+
\`\`\`

\`mempool_collector.rs\` の全体（MEV ロジックを含まない — 型付きストリーム供給に限定）:

\`\`\`rust
#[async_trait]
impl<M> Collector<Transaction> for MempoolCollector<M>
where
    M: Middleware,
    M::Provider: PubsubClient,
{
    async fn get_event_stream(&self) -> Result<CollectorStream<'_, Transaction>> {
        let stream = self.provider.subscribe_pending_txs().await?;
        let stream = stream.transactions_unordered(256);
        let stream = stream.filter_map(|res| async move { res.ok() });
        Ok(Box::pin(stream))
    }
}
\`\`\`

同梱唯一の strategy \`opensea-sudo-arb\` の \`process_event\` が **MEV 判断のすべて**:

\`\`\`rust
async fn process_event(&mut self, event: Event) -> Vec<Action> {
    match event {
        Event::OpenseaOrder(order) => self
            .process_order_event(*order).await
            .map_or(vec![], |a| vec![a]),
        Event::NewBlock(block) => match self.process_new_block_event(block).await {
            Ok(_) => vec![],
            Err(e) => { panic!("Strategy is out of sync {}", e); }
        },
    }
}
\`\`\`

\`process_order_event\` は新規出品に Sudoswap の有利価格を探し、成立すれば \`Action::SubmitTx\` を返す。\`process_new_block_event\` はブロックログから Sudo プール状態を更新する（アクションを出さず内部 state を保守）。アービ本体は別 Solidity（\`SudoOpenseaArb.sol\`）— strategy は機会検出と calldata 構築、原子的実行はコントラクト側。

## 失敗例（誤解）

「1 本の \`main.rs\` で書けばいい」は誤り — 一発書きは本番構造を隠し、次の strategy 追加で再利用できない。artemis（framework）は再利用性に答える: MEV ロジックは自作し、オーケストレーションは借りる。turnkey bot の subway が「何を走らせるか」を示すのに対し、artemis は「どう構成するか」を示す（subway=fork して書き換え、artemis=trait を実装）。世にない strategy を ship したいなら後者。

---

ここまでで「searcher = collector → strategy → executor のパイプライン」は着地した。ここから artemis を読み、自分の bot に落とす。コードは抜粋（実行時は repo 全体を参照）。

> 🛑 **予測。** Executor と Strategy を統合した場合に壊れる点を一文で。（答え: 提出を strategy に直書きすると、提出先（Flashbots relay 等）の障害で strategy 全体が止まる。分離していれば同じ \`Action\` を別 executor に流せ、提出経路を MEV ロジックに触れず入れ替えられる — trait の分割は理論的綺麗さでなく耐障害性のため。）

## ステップで組み立てる

### Step 1-5: artemis を読む

1. **trait を開く**（\`types.rs\`、上の 3 trait）。同ファイルの \`CollectorMap\`/\`ExecutorMap\` を 30 秒読む — *新しい Collector を書かずに型変換で解ける問題* を解いてくれる。
2. **engine を読む**（\`engine.rs\`、上の broadcast 図）。要点: 新 strategy の ship は \`impl Strategy\` 1 つ + \`add_strategy\` だけ。
3. **実物の collector/executor を読む**（\`collectors/\`: mempool / block / mevshare / opensea / log、\`executors/\`: mempool / flashbots / mev_share）。各 ~50-100 行。
4. **実物の strategy を読む**（\`opensea-sudo-arb\`、\`Event = { NewBlock, OpenseaOrder }\` の 2 入力源）。\`sync_state\` がなぜ「deploy 済み全 Sudo プール」を列挙するか考える。
5. **分離の効果を確認**（private mempool collector を足すなら \`Collector\` を実装して engine 登録、\`strategy.rs\` の変更は不要）。

### Step 6: 読みから出荷へ — 自分の bot

2-hop Uniswap アービ searcher の最小手順:

1. **再利用:** pending swap に \`MempoolCollector\`、新 head に \`BlockCollector\`、\`FlashbotsExecutor\`。全部そのまま。
2. **書く:** \`Event = { NewBlock, PendingTx }\` / \`Action = { SubmitBundle }\` を持つ \`UniArbStrategy\` を 1 つ。\`PendingTx\` 分岐: swap をデコード → Revm で fork シミュレート → クロスプール spread を検出 → bundle 構築。\`NewBlock\` 分岐: reserve cache をリフレッシュ、古い opportunity を捨てる。
3. **配線:** \`add_collector\` ×2、\`add_strategy(UniArbStrategy::new(...))\`、\`add_executor\`、\`run().await\`。

## 答え合わせ（Test gate）

最低ラインは 2 テスト:

\`\`\`rust
// tests/integration.rs
const PINNED_BLOCK: u64 = 18_500_000;  // 既知の Uniswap V3 / Curve arb があったブロック
const FORK_RPC: &str = "https://eth.merkle.io";

#[tokio::test]
async fn finds_known_arb_at_pinned_block() {
    let provider = forked_provider_at(FORK_RPC, PINNED_BLOCK).await;
    let strategy = MyArbStrategy::new(provider);
    let event = Event::NewBlock { number: PINNED_BLOCK };
    let actions = strategy.process_event(event).await;
    let arb = actions.iter().find(|a| matches!(a, Action::SubmitBundle { .. }));
    assert!(arb.is_some(), "既知の arb を検出するはず");
    assert_pnl_positive(arb.unwrap());
}

#[tokio::test]
async fn retracts_action_on_reorg() {
    // 合成ブロック N を提出、N を reorg、action queue が空になることを assert
}
\`\`\`

\`finds_known_arb_at_pinned_block\`（forked-state で実機会を再現し正の期待 P&L を assert）+ \`retracts_action_on_reorg\`（合成 \`ChainReorged\` で reorg 依存の pending \`Action\` を取り下げ — reorg 無視は典型的本番障害）。両方 green まで未完了。mainnet で \`cargo run\` できても \`cargo test\` が通らなければ deliverable でない。

## 合格基準

- 上記 2 テストが green。
- artemis の 3 trait の名前と各入出力を言える。
- 提出を public mempool→Flashbots に切り替えるとき Strategy 実装の何を変えるか即答できる（答え: 何も変えない、登録する Executor を切り替える）。

## Drill

1. 実在の MEV opportunity を 1 つ選び、必要な \`Event\`/\`Action\` と再利用する collector/executor を列挙（30 分）。
2. pending tx 受信から \`SubmitTxToMempool\` 実行までの \`.await\` ポイントを列挙（45 分）。
3. \`collectors/\` から 1 つ選び \`ethers-rs\` 版を Alloy 1.x へ置換（trait シグネチャは維持）（2 時間）。
4. \`engine.rs\` の \`run\` を再読し、collector のイベントが strategy に届く経路（channel 型と receiver）を答える（30 分）。
5. \`Strategy<Event, Action>\` を実装した最小モジュールを \`MempoolCollector\` + no-op executor に配線して \`cargo run\`（3 時間）。

## 📺 関連動画

\`\`\`youtube
vCCYFSAdCFo | Understanding MEV — Georgios Konstantopoulos, Dan Robinson, Hasu (Paradigm)
\`\`\`

## まとめ（3行）

- searcher = イベント処理パイプライン。artemis が collector（外部→イベント）/ strategy（イベント→アクション、MEV の脳）/ executor（アクション→副作用）の 3 trait + engine に分割する。
- 新 strategy の ship は \`impl Strategy\` 1 つ + \`add_strategy\` だけ。collector/executor は再利用、strategy 間調整は engine になく単一 strategy 内で。Executor 分離が提出経路の差し替えと耐障害性を生む。
- Test gate: forked-state での既知 arb 再現（正の P&L）+ reorg 整合性。\`cargo test\` green まで未完了。次は DB 層の reorg-aware インデクサ。

## 次のレッスン（レッスン2）

ExEx 駆動の reorg-aware な Postgres インデクサ（Tempo の \`tidx\` を読む）。\`Notification::ChainCommitted\`/\`ChainReverted\` を fixture replay で流し、導出状態が golden reference と一致することを assert する。`,
                },
                {
                  title: 'レッスン2 — 本物の Production Indexer を読む — Tempo の tidx',
                  slug: 'build-exex-indexer-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 45,
                  xpReward: 80,
                  content: `# レッスン2 — 本物の Production Indexer を読む — Tempo の tidx

## 問い

本番 indexer が壊れるのは、異なるクエリ形が同時に来る瞬間だ — 「アドレス X の最新 10 件」（point lookup）と「過去 1 年の日次集計」（range scan）。1 つのストレージエンジンに両方を無理に載せると片方が死ぬ。どう設計するか？（読む対象は公開実装 [\`tidx\`](https://github.com/tempoxyz/tidx)、Tempo の EVM L1 で実運用。）

## 原理（最小モデル）

- **OLTP + OLAP のデュアルストレージ。** PostgreSQL の row store は point lookup に強い、ClickHouse の column store は広い期間集計に強い。互いに相手の質問をすると死ぬ（PG に日次 volume = 全ページ read で数十秒〜数分、CH に最新 10 件 = point index がなくスキャン）。tidx は両方に書き、read で振り分ける。
- **dual sink: 1 reader、2 write。** \`SinkSet { pool, ch: Option<...> }\`、\`write_all\` が \`tokio::try_join!\` で PG/CH に同時書き込み（待ち時間 ≈ \`max(pg, ch)\`）。PG は 4 テーブルを 1 トランザクション、CH は append-only で部分失敗は retry 回復、CH は任意（未設定なら PG-only で OLAP だけ無効）。
- **lazy event decoding。** event の事前登録を要求しない。\`logs\` に生バイト（selector/topics/data）を保持し、デコードはクエリ時に \`EventSignature::parse\` が行う（signature 文字列 → topic0 計算 → フィルタ + 射影 CTE 合成）。代償は保存量 5-10 倍、得るものは事前登録なしで新しい質問に即応（Subgraph は manifest で事前デコード、tidx は query 時）。
- **realtime + gap sync の 2 ループ + 別 RPC client 2 本。** realtime は低遅延重視、backfill は帯域消費型 — 共有すると backfill が realtime を詰まらせる。\`sync_state\` の 4 カーソル（head/tip/synced/backfill）で 2 ループの干渉を防ぐ。

## 具体例

「2 回書く」抽象（\`src/sync/sink.rs\`）:

\`\`\`rust
#[derive(Clone)]
pub struct SinkSet {
    pool: Pool,                 // PostgreSQL (常に存在)
    ch: Option<ClickHouseSink>, // ClickHouse (オプショナル)
}

impl SinkSet {
    pub async fn write_all(
        &self,
        blocks: &[BlockRow], txs: &[TxRow],
        logs: &[LogRow], receipts: &[ReceiptRow],
    ) -> Result<()> {
        if let Some(ch) = &self.ch {
            tokio::try_join!(
                writer::write_batch(&self.pool, blocks, txs, logs, receipts),
                ch.write_blocks(blocks),
                ch.write_txs(txs),
                ch.write_logs(logs),
                ch.write_receipts(receipts),
            )?;
        } else {
            writer::write_batch(&self.pool, blocks, txs, logs, receipts).await?;
        }
        Ok(())
    }
}
\`\`\`

sync engine はチェーンを *1 回* 読んで結果を \`write_all\` に渡す（\`src/sync/engine.rs\`）:

\`\`\`rust
pub struct SyncEngine {
    throttled_pool: ThrottledPool,
    sinks: SinkSet,             // ← ファンアウトはここ
    realtime_rpc: RpcClient,    // ← tip 追跡用の別 RPC client
    backfill_rpc: RpcClient,    // ← gap 埋め用の別 RPC client
    chain_id: u64,
    ...
}
\`\`\`

query routing の契約（\`src/query/router.rs\`）— エンジン 2 つ、HTTP API は \`?engine=\` 省略時に router が選ぶ:

\`\`\`rust
pub enum QueryEngine {
    ClickHouse,  // OLAP
    Postgres,    // OLTP
}
\`\`\`

\`SELECT * FROM blocks WHERE num = 12345\` → point lookup → PG。\`SELECT type, COUNT(*) FROM txs GROUP BY type\` → 集計 → CH。振り分けはヒューリスティック（用途明確なら \`?engine=\` で明示）。CH の materialized view は insert 時に集計更新（read 時の重い再集計を避ける）。

## 失敗例（誤解）

「PostgreSQL だけ / ClickHouse だけで十分」は誤り — PG only は「過去 1 年の日次 volume」で死に（ディスク律速）、CH only は「最新 10 件」で死ぬ（point index なしでスキャン、答え 10 行のためのムダ IO）。それぞれが相手の得意クエリで律速する。tidx は両方に書き read で振り分ける — エンジン分離が本質、自動振り分けは利便機能にすぎない。

---

ここまでで「OLTP/OLAP デュアルストレージ + dual sink」は着地した。ここから tidx を読み、自分の indexer に落とす。コードは抜粋（実行時は repo 全体を参照）。

> 🛑 **予測。** dual-sink で \`write_all\` はどこまで順序を保証するか。ブロック N が PG にだけあり CH にない状態は起こり得るか。（答え: 起き得るが短時間。\`try_join!\` は両成功時に return するため、途中で CH を先に読むと古い値を見うる。tidx はこれを許容し \`ch_backfill_block\` で後から埋める。整合性モデルが PG=トランザクション・CH=append-only retry で違うのが前提。）

## ステップで組み立てる

### Step 1-7: tidx を読む

1. **Dual Sink**（\`sink.rs\`、上の \`SinkSet\`）— \`try_join!\` で PG/CH 同時書き込み。
2. **Sync Engine**（\`engine.rs\`、上の struct）— RPC client 2 本の理由（realtime 低遅延 vs backfill 帯域消費、並行度予算を個別管理）。\`backfill_first\`/\`trust_rpc\` を読む。
3. **スキーマ**（\`db/*.sql\` と \`db/clickhouse/*.sql\`）— 同じカラム、別のエンジン/索引戦略。\`txs/logs/receipts\` は \`block_timestamp\` を非正規化（JOIN 削減）。
4. **Lazy event decoding**（\`query/parser.rs\` の \`EventSignature::parse\`）— 生バイト保持、query 時デコード。CLI から signature を渡せば event 名がテーブルとして見える:

   \`\`\`bash
   tidx query \\
     --signature "Transfer(address indexed from, address indexed to, uint256 value)" \\
     "SELECT * FROM Transfer WHERE from = '\\\\xAlice...' LIMIT 10"
   \`\`\`

5. **Query routing**（\`router.rs\`、上の \`QueryEngine\`）— point lookup→PG / 集計→CH。
6. **Materialized views**（\`api/views.rs\`）— insert 時集計。認可は \`require_admin_mutation\`（trusted IP **かつ** \`x-tidx-admin: 1\` ヘッダ = defense in depth）。HTTP で view を作る:

   \`\`\`bash
   curl -X POST "https://tidx.example.com/views" -d '{
     "chainId": 4217,
     "name": "top_holders",
     "sql": "SELECT token, holder, sum(balance) AS balance
             FROM token_balances GROUP BY token, holder HAVING balance > 0",
     "orderBy": ["token", "holder"]
   }'
   \`\`\`

7. **Sync アーキ** — realtime（~0 lag）+ gap sync（最新→最古に埋める、利用頻度の高い新データを先に）。

### Step 8: 読みから書きへ — 自分の indexer

- **そのまま採用:** Ethereum JSON-RPC を話すなら \`rpc_url\` を変えて \`tidx up\`（テーブルはチェーン非依存、\`chain_id\` はデータ列）。
- **Fork:** 独自フィールド（fee payer 等）が要るなら 3 箇所を拡張 — ① \`db/*.sql\` + \`db/clickhouse/*.sql\`（追加カラム）② \`src/sync/decoder.rs\`（追加フィールド抽出）③ \`src/types.rs\`（\`*Row\` struct 拡張）。sync engine / dual sink / query router / views API はそのまま。

## 答え合わせ（Test gate）

最低ラインは **fixture chain replay**。reorg ケースは必須（\`ChainCommitted\` だけ処理する indexer は reorg で状態を壊す）:

\`\`\`rust
// tests/fixture_replay.rs
use reth_exex::ExExNotification;

#[tokio::test]
async fn replays_committed_then_reverted() {
    let pg = test_pg_pool().await;            // テストごとに ephemeral schema
    let mut indexer = Indexer::new(pg.clone());

    // ブロック N..N+5 を適用
    for n in N..N+5 {
        indexer.handle(committed_fixture(n)).await.unwrap();
    }
    assert_eq!(pg.tx_count_at_block(N+4).await, GOLDEN_TX_COUNT);

    // N+3..N+5 を reorg
    indexer.handle(reverted_fixture(N+3..=N+5)).await.unwrap();
    assert_eq!(pg.tx_count_at_block(N+2).await, GOLDEN_TX_COUNT_AT_N2);
    assert_eq!(pg.tx_count_at_block(N+5).await, 0, "reorg されたブロックは消えるはず");
}

#[tokio::test]
async fn idempotent_under_replay() {
    // 同じ通知を 2 回流しても no-op になる必要がある（クラッシュ復旧シナリオ）
}
\`\`\`

fixture は \`tests/fixtures/\` に \`ExExNotification\` をシリアライズして置く。2 テスト green まで未完了。

## 合格基準

- 上記 2 テスト（reorg 巻き戻し + idempotent replay）が green。
- PG が殺すクエリクラスと CH が殺すクエリクラスを 1 つずつ言える。
- tidx を fork するとき触る 3 ファイル（schema / decoder / types）を即答できる。

## Drill

1. \`sink.rs\` で PG 成功・CH 失敗時に何が起きるかトレース（PG はロールバックする? 次の iteration は?）（30 分）。
2. \`router.rs\` で \`?engine=\` なしの振り分けルールを 1 文で特定（45 分）。
3. 両スキーマ + \`TxRow\` + decoder に L2 用 \`l1_origin\` カラムを追加して \`cargo build\`（2 時間）。
4. 実 analytics 質問を 1 つ選び \`POST /views\` ボディを書く（1 時間）。
5. \`tidx init\` → \`rpc_url\` を testnet に → \`tidx up\` → \`tidx status --watch\` で realtime が追いつくのを見る（1 時間）。

## 📺 関連動画

\`\`\`youtube
GhEhzE9SFqY | Alexey Shekhirin — Using Reth Execution Extensions for next generation indexing (Devcon 2024)
\`\`\`

## まとめ（3行）

- 本番 indexer は OLTP（PG、point lookup）+ OLAP（ClickHouse、期間集計）のデュアルストレージ — 片方だけだと相手の得意クエリで律速する。tidx は両方に書き read で振り分ける。
- dual sink が \`tokio::try_join!\` で同時書き込み（一時的に PG/CH がずれるのは許容し後埋め）。lazy event decoding で事前登録不要（保存量 5-10 倍と引き換え）。RPC client を realtime/backfill で分離。
- Test gate: fixture chain replay で reorg 巻き戻し + idempotent replay。\`ChainReverted\` が実際に巻き戻すことを証明する（reorg 無視は典型的本番障害）。

## 次のレッスン（レッスン3）

Reth にカスタム RPC エンドポイントを足す（\`extend_rpc_modules\`）。ノードを in-process で起動し、新メソッドを HTTP で叩いて JSON レスポンスを assert、エラーパス（不正パラメータ・欠損ブロック）も網羅する。`,
                },
                {
                  title: 'レッスン3 — Reth にカスタム RPC エンドポイントを足す',
                  slug: 'build-custom-rpc-ja',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 40,
                  xpReward: 70,
                  content: `# レッスン3 — Reth にカスタム RPC エンドポイントを足す

## 問い

fee-bidding bot が pending tx の gas price ヒストグラムを 1 回の API 呼び出しで欲しい。標準の \`txpool_content\` は pending tx を *全部フルで* 返す — 結局 10 個の数字にまとめるのに数百 KB を転送する。どうやって **ノード内で** 集計してヒストグラムだけ返すか？（読み取り専用メソッド 1 つ、Rust ~50 行、Reth fork なし。）

## 原理（最小モデル）

- **カスタム RPC = ノード内集計、Reth fork なし。** \`jsonrpsee\` の \`#[rpc(server, namespace=...)]\` が trait から server/client stub + JSON シリアライズを生成。impl は pool ハンドルを持つ struct に書き、\`extend_rpc_modules\` で既存サーバ（HTTP/WS/IPC）へ登録 — ネイティブ namespace と同じトランスポート・認証・ロギング。
- **server-side 集計のスイートスポット。** client 側集計（RPC ラウンドトリップ + 全 tx 転送、数百 KB）vs 外部 indexer（µs だが glue + 運用に数日）vs カスタム RPC（µs の in-process スナップショット + 集計後ペイロード + 1 回 ~50 行）。しかもノードの一部として出荷される（別サービス・別デプロイ・ポート開放なし）。
- **\`pool.pending()\` はスナップショット iterator で安価。** 具体プール型を固定せず \`Pool: TransactionPool\` で書く。集計は \`O(buckets × pending)\`。
- **subscription は \`tokio::spawn\` で。** RPC ハンドラは即 return し、ストリーミングはバックグラウンドタスク（ここでブロックすると RPC サーバスレッドが止まる）。\`sink.send(...).is_err()\` で切断を検知してクリーンに return（subscription リークなし）。

データ経路を 1 枚で:

\`\`\`mermaid
flowchart LR
    Client["RPC client<br/>(cast / dapp / dashboard)"] -->|JSON-RPC POST| Handler["jsonrpsee handler"]
    Handler -->|read snapshot| Pool["TransactionPool<br/>(in-process)"]
    Pool -->|all_transactions| Bucket["Bucket math<br/>(10 ranges)"]
    Bucket -->|JSON| Client
\`\`\`

## 具体例

RPC trait（\`#[rpc]\` マクロが配管を生成）:

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

pool アクセス付きの実装（wire 名は \`txpoolPlus_pendingByGasBucket\`）:

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

NodeBuilder への統合点 \`extend_rpc_modules\`（起動時 1 回、pool 等のコンテキストを受け取る）:

\`\`\`rust
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

メソッドはどの RPC クライアントから見てもネイティブと区別がつかない（\`cast rpc txpoolPlus_pendingByGasBucket\` や生 curl で叩ける）。これが \`extend_rpc_modules\` の約束。

## 失敗例（誤解）

「\`txpool_content\` を呼んで client 側で集計すればいい」は誤り — RPC ラウンドトリップ + 全 tx 転送（数百 KB）を、結局 10 個の数字のために払う。カスタム RPC は in-process スナップショットで µs + 集計後の bytes。もう 1 つの罠: 引数バリデーションで標準 JSON-RPC エラーコードを使い回す — \`-32603\`（internal error）は予約済み、不正パラメータは \`-32602\`（Invalid params）を返す。

---

ここまでで「カスタム RPC = ノード内集計を既存サーバに登録」は着地した。ここから trait → impl → 統合 → test の順で組み立てる。コードは抜粋（実行時は補助コードが必要）。

> 🛑 **予測。** なぜ \`pool.pending()\` は軽く、\`txpool_content\` RPC は重いのか。（答え: \`pool.pending()\` は in-process のスナップショット iterator を読むだけ — wire 変換なし。\`txpool_content\` は全 pending tx をフルで JSON 化して wire 転送する。差は「返却データ量」と「wire 変換コスト」。）

## ステップで組み立てる

### Step 1-3: trait → impl → 統合

上の 3 ブロック。\`#[rpc(server, namespace="txpoolPlus")]\` が \`TxpoolPlusApiServer\` を生成 → pool ハンドルを持つ struct に impl → \`extend_rpc_modules\` で \`merge_configured(ext.into_rpc())\`。\`reth/examples/node-custom-rpc\` と並べると差分は namespace / メソッド名 / ハンドラ内部だけ。

### Step 4: cast でテスト

\`\`\`bash
$ cargo run --release -- node --http --enable-txpool-plus
$ cast rpc txpoolPlus_pendingByGasBucket --rpc-url http://localhost:8545
[{"min_gwei":0,"max_gwei":1,"count":12}, ...]
\`\`\`

### Step 5 (おまけ): subscription バリアント

\`#[subscription(...)]\` 属性 + \`tokio::spawn\` のバックグラウンドタスク:

\`\`\`rust
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

production gap: 認証（engine と同じ \`AUTH_SECRET\`、メソッドが尊重するか確認）/ レート制限（Reth はメソッド単位を同梱しない、\`tower\` で）/ バージョニング（形が変われば \`txpoolPlus_v2_*\`）/ メトリクス（ネイティブのみ自動、自分で \`metrics::counter!\`）/ 引数バリデーション（\`ErrorObjectOwned::owned\` で安定コード）。

## 答え合わせ（Test gate）

最低 gate は **インプロセス integration テスト**（success + エラーコード + subscription リーク）:

\`\`\`rust
// tests/rpc_integration.rs
use jsonrpsee::{core::client::ClientT, http_client::HttpClientBuilder};
use jsonrpsee::rpc_params;

#[tokio::test]
async fn returns_buckets_for_known_state() {
    let node = boot_node_with_extension().await;       // Reth をインプロセス起動
    let client = HttpClientBuilder::default().build(node.http_url()).unwrap();

    seed_mempool(&node, &TEST_TX_FIXTURES).await;
    let buckets: Vec<Bucket> = client
        .request("txpoolPlus_pendingByGasBucket", rpc_params![10u32])
        .await.unwrap();

    assert_eq!(buckets.len(), 10);
    assert_eq!(buckets.iter().map(|b| b.count).sum::<u64>(), TEST_TX_FIXTURES.len() as u64);
}

#[tokio::test]
async fn rejects_invalid_bucket_count() {
    let node = boot_node_with_extension().await;
    let client = HttpClientBuilder::default().build(node.http_url()).unwrap();

    let err = client.request::<Vec<Bucket>, _>("txpoolPlus_pendingByGasBucket", rpc_params![0u32])
        .await.unwrap_err();
    assert_jsonrpc_error_code(&err, -32602);            // Invalid params (-32603 = internal ではない)
}

#[tokio::test]
async fn subscription_does_not_leak_on_disconnect() {
    // subscription を開く → クライアントを drop → spawn したタスクが終了することを assert
    // (クロージャ内に Drop probe を仕込んで検証)
}
\`\`\`

完了条件: (1) success path pass、(2) 少なくとも 1 つのエラーコードテスト pass、(3) subscription cleanup テスト pass。mainnet に対する \`cargo run\` はこのどれの代替にもならない。

## 合格基準

- 上記 3 テスト（success / 不正パラメータの \`-32602\` / subscription cleanup）が green。
- なぜ server-side 集計が client 側集計より有利か（ペイロードサイズ）を 1 文で言える。
- 不正パラメータに使うべきエラーコード（\`-32602\`、\`-32603\` でない）を即答できる。

## Drill

1. \`pendingByNonce(address)\` を 2 つ目の \`#[method]\` として追加（15 分）。
2. priority-fee バケット化を effective-gas-price（\`base_fee + priority_fee\`）に置換 — base fee を provider から（\`ctx\` は何を公開している?）（30 分）。
3. engine \`AUTH_SECRET\` を提示しない呼び出しを拒否（Reth の debug メソッドを参考に）（45 分）。
4. レスポンスにスナップショットの timestamp + \`ctx.provider().best_block_number()\` を追加（30 分）。
5. レッスン1 の MEV searcher が \`txpoolPlus_pendingByGasBucket\` をクエリして 90 パーセンタイル超えで入札するクライアント（\`jsonrpsee::http_client\`）を書く（2 時間）。

## まとめ（3行）

- カスタム RPC = \`jsonrpsee\` の \`#[rpc]\` trait + pool ハンドルを持つ impl + \`extend_rpc_modules\` 登録。ノード内で集計して bytes だけ返す（client 側集計の数百 KB 転送を避ける）、Reth fork なし。
- ネイティブと同じトランスポート・認証・ロギングで出荷される（別サービスなし）。subscription は \`tokio::spawn\` で（ハンドラをブロックしない、切断時クリーンに return）。
- Test gate: in-process integration で success + エラーコード（\`-32602\`）+ subscription リーク検出。次は並行性 + 状態管理層の wallet backend。

## 次のレッスン（レッスン4）

Wallet Backend を Rust で作る（signer pool + nonce manager + replace-on-stuck）。roundtrip テスト（署名済み tx が decode で戻る）と nonce invariant（連続呼び出しが連続 nonce、欠損も重複もなし）で担保する。`,
                },
                {
                  title: 'レッスン4 — Wallet Backend を Rust で作る',
                  slug: 'build-wallet-backend-ja',
                  type: 'CONTENT',
                  sortOrder: 4,
                  duration: 45,
                  xpReward: 80,
                  content: `# レッスン4 — Wallet Backend を Rust で作る

## 問い

ユーザーが 1 分で 50 回送信しても、nonce を衝突させずに署名・送信し続けたい。さらにガス急騰時には stuck tx を置換してセッションの詰まりを防ぐ。並行送信・単調増加 nonce・stuck 処理を同時に扱うバックエンドをどう組むか？（Rust ~250 行: signer pool + nonce manager + send queue + replace-on-stuck + confirm watcher。）

公開する HTTP API はこの形:

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

1 回の POST で signer 取得 → nonce 予約 → ガス見積もり → 署名 → 送信 → 監視まで行う。30 秒で着地しなければ watcher が fee を引き上げて再送する。

## 原理（最小モデル）

- **各アドレスは next nonce の真の source を 1 つだけ持つ — in-process 状態であって新しい RPC コールではない。** 初回だけ \`provider.get_transaction_count(addr).pending()\` で初期化し、以降の予約はローカル \`Arc<Mutex<HashMap<Address, u64>>>\` で進む。\`forget\` でキャッシュ破棄 → 次回 RPC で再同期（回復手段）。
- **送信と確認を分離する。** \`send_raw_transaction\` 後は即 return し、確認は別タスクの watcher に任せる。tx hash は「受け付けた」であって「着地した」ではない。
- **stuck は同一 nonce + 高 fee で置換する（待機でない）。** 先行 nonce が詰まると後続が全部止まる。大半のノードは fee を ≥10% 上げない置換を拒否するので、bump は 25%（最低置換幅 10% より余裕）。
- **RPC 中はロックを保持しない。** watcher はキューをスナップショットしてから RPC を回す（キュー全体の直列化を避ける）。

データ経路を 1 枚で:

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

## 具体例

signer pool + nonce manager（コア不変条件: 各アドレスの next nonce はローカル 1 source）:

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

ガス見積もり（EIP-1559、推定を手書きせず provider に）+ bump:

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
    // 25% 引き上げ — 大半のクライアントの mempool 最低値 10% より余裕を持たせる
    GasParams {
        max_fee_per_gas: params.max_fee_per_gas * 125 / 100,
        max_priority_fee_per_gas: params.max_priority_fee_per_gas * 125 / 100,
    }
}
\`\`\`

送信パス（nonce は署名前に予約、送信後は即 return）:

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

replace-on-stuck 付き confirm watcher（1 タスクが全 queued tx を監視、deadline 超過は bump + resubmit）:

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

HTTP API スケルトン（axum）— watcher を spawn して \`/send\` を配線:

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

    // Provider 例: QuickNode、Alchemy、Infura、または自前 Reth ノード。
    let provider = alloy_provider::ProviderBuilder::new()
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

これで最小サービスは完成（インポート込みで約 250 行）。

## 失敗例（誤解）

「送信ごとに \`provider.get_transaction_count(from).await\` で nonce を取ればいい」は誤り — 並行する 2 つの送信が両方 nonce N を読み、両方 N で署名し、1 つしか着地しない（もう 1 つは mempool で拒否）。同様に「同じ nonce で再送信するだけ」も誤り（fee を ≥10% 上げない置換はノードが拒否、サイレントに失敗）。「\`eth_sendRawTransaction\` の戻り値を信じる」も誤り（tx hash は受け付けで、着地でない）。

---

ここまでで「ローカル nonce 1 source + 送信/確認の分離 + 同一 nonce 高 fee 置換」は着地した。ここから 5 ステップで組み立てる。コードは抜粋（実行時は補助コードが必要）。

> 🛑 **予測。** 「nonce 取得→署名→送信」を同一アドレスで 100ms 以内に 2 回実行すると何が壊れるか。（答え: 両方が同じ nonce N を読んで N で署名し、1 つだけ着地する。もう 1 つは「nonce too low / already known」で拒否され、ユーザの 2 件目の送信がサイレントに消える。ローカル nonce 予約はこの競合を mutex 下の \`nonce + 1\` で潰す。）

## ステップで組み立てる

### Step 0: プロジェクトと依存

\`\`\`toml
# Cargo.toml
[package]
name = "wallet-backend"
version = "0.1.0"
edition = "2021"

[dependencies]
alloy-primitives    = "1.5"
alloy-provider      = "1.0"
alloy-rpc-types     = "1.0"
alloy-network       = "1.0"
alloy-signer        = "1.0"
alloy-signer-local  = "1.0"
alloy-consensus     = "2.0"
alloy-eips          = "1.0"
axum                = "0.7"
tokio               = { version = "1", features = ["full"] }
serde               = { version = "1", features = ["derive"] }
serde_json          = "1"
eyre                = "0.6"
tracing             = "0.1"
tracing-subscriber  = "0.3"
\`\`\`

秘密鍵は環境変数 \`SIGNERS\` にカンマ区切りで渡す（\`SIGNERS=0xabc...,0xdef...\`）。RPC エンドポイントは \`RPC_URL\` で渡す。

### Step 1-5

上の 5 ブロック: ① signer pool + nonce manager（\`pending()\` を使う、初回だけ RPC、\`forget\` は回復手段）→ ② ガス見積もり（\`estimate_eip1559_fees()\`、bump 25%）→ ③ 送信パス（nonce を署名前に予約、送信と確認を分離）→ ④ watcher（先にスナップショット、receipt=Some で着地判定、deadline 超過で bump+resubmit）→ ⑤ axum API（watcher を \`tokio::spawn\`）。署名層は差し替え可能（local / keystore / mnemonic / KMS、send フロー本体は保てる）。

production gap: 鍵カストディ（KMS/HSM/MPC へ）/ 冪等性（\`request_id\`）/ 鍵単位レート制限 / 永続キュー（DB/Redis）/ マルチ RPC ファンアウト / nonce ギャップ検出 / observability（\`pending_count\` 等）。

### Step 6: 起動と疎通

\`\`\`bash
$ RPC_URL=https://sepolia.infura.io/v3/$KEY \\
  SIGNERS=0xabc...,0xdef... \\
  cargo run --release

# 別ターミナルで送信テスト
$ curl -s -X POST http://localhost:7000/send \\
    -H "Content-Type: application/json" \\
    -d '{"from":"0xAlice...","to":"0xBob...","value":"0x16345785d8a0000","data":"0x"}'
{ "tx_hash": "0x...", "queued_at": "..." }
\`\`\`

## 答え合わせ（Test gate）

最低ラインは不変条件 2 つ（roundtrip + 並行 nonce 単調性）:

\`\`\`rust
// tests/wallet_invariants.rs
use alloy::consensus::TxEnvelope;
use alloy::eips::Decodable2718;

#[tokio::test]
async fn signed_tx_roundtrips() {
    let svc = test_service().await;
    let req = SendRequest { from: ALICE, to: BOB, value: U256::from(1), data: vec![] };

    let signed_bytes = svc.sign_only(&req).await.unwrap();
    let decoded = TxEnvelope::decode_2718(&mut signed_bytes.as_slice()).unwrap();

    assert_eq!(decoded.recover_signer().unwrap(), ALICE);
    assert_eq!(decoded.tx().to(), Some(BOB));
    assert_eq!(decoded.tx().value(), U256::from(1));
}

#[tokio::test]
async fn no_nonce_gaps_under_concurrent_send() {
    let svc = test_service().await;
    let base = svc.next_nonce(ALICE).await;

    let handles: Vec<_> = (0..50)
        .map(|_| {
            let svc = svc.clone();
            tokio::spawn(async move { svc.send(stub_request(ALICE)).await.unwrap() })
        })
        .collect();
    let mut nonces: Vec<u64> = futures::future::try_join_all(handles).await.unwrap()
        .into_iter().map(|r| r.nonce).collect();
    nonces.sort();

    let expected: Vec<u64> = (base..base + 50).collect();
    assert_eq!(nonces, expected, "nonce は連続かつユニークである必要がある");
}
\`\`\`

両方 pass まで未完了。前者が崩れると不正 tx を作り、後者が崩れると nonce 詰まりで送信が停止する。

## 合格基準

- 上記 2 テスト（roundtrip + 50 並行送信で nonce \`base..base+50\` に欠損/重複なし）が green。
- なぜローカル nonce 状態が核か（nonce ごとの RPC 往復なしで並行送信）を 1 文で言える。
- bump 幅を 25% にする理由（最低置換幅 10% より余裕）を即答できる。

## Drill

1. \`SendRequest\` に \`request_id\` を足し \`request_id → tx_hash\` を 1 時間キャッシュ（重複 POST にキャッシュ hash を返す）（30 分）。
2. \`/send\` を per-from semaphore（max 4 並行）でラップ、超過は 429（30 分）。
3. \`PendingTx\` を insert 時に Redis、着地時に削除、起動時に復元（1.5 時間）。
4. 2 provider に \`send_raw_transaction\` をブロードキャストし最初の \`Ok\` を返す \`MultiProvider\`（1 時間）。
5. \`POST /cancel { from, nonce }\` を追加（同 nonce で 50% 引き上げた 0-value 自送）（1 時間）。

## 📺 関連動画

\`\`\`youtube
wJnywGB33O4 | Georgios Konstantopoulos — Foundry, a portable, fast and modular toolkit (Foundry の tx パイプライン内で使われている同じ Alloy + Rust signer 機構)
\`\`\`

## まとめ（3行）

- wallet backend の核はローカル nonce 状態 — 各アドレスの next nonce を in-process 1 source に置き、mutex 下の \`nonce + 1\` で並行送信の競合を潰す（送信ごとの RPC 往復なし）。
- 送信と確認を分離: \`send_one\` は即 return、別タスクの watcher が receipt をポーリングし deadline 超過で同一 nonce + 25% bump で置換（待機でなく置換 — 先行詰まりが後続を止めるから）。
- Test gate: tx エンコード roundtrip + 並行下の nonce 単調性。次は認証層の EIP-7702 sponsor。

## 次のレッスン（レッスン5）

最小限の EIP-7702 Sponsor サービス（Type 4 tx + paymaster パターン）。replay 防止（同じ auth tuple は 2 度 sponsor できない）と gas 会計（sponsor が払い、ユーザは 0）で担保する。`,
                },
                {
                  title: 'レッスン5 — 最小限の EIP-7702 Sponsor サービスを Rust で作る',
                  slug: 'build-7702-sponsor-ja',
                  type: 'CONTENT',
                  sortOrder: 5,
                  duration: 45,
                  xpReward: 80,
                  content: `# レッスン5 — 最小限の EIP-7702 Sponsor サービスを Rust で作る

## 問い

Alice は EOA（ただの鍵ペア）を持ち、ETH を持たずに 1 クリックで 2 トークン swap したい。EIP-7702（Pectra 以降、2025-03 から mainnet）の手段:「この tx の間、私の EOA をこのコントラクトのコードを持つかのように扱え」という authorization に Alice がオフチェーン署名。**Sponsor** がそれを Type 4 tx に包んでガスを払う。Alice は atomic な batched call を得る。同じアドレス・同じ鍵・移行なし — どう組むか？

公開する HTTP API はこの形:

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

## 原理（最小モデル）

- **EIP-7702 のメカニクス（3 文）。** ① Tx type 4 が新フィールド \`authorization_list: Vec<SignedAuthorization>\` を運ぶ。② \`Authorization { chain_id, address (delegate), nonce }\` が EOA によって署名される。③ tx 実行時、各 authorization は **その EOA のアカウントコード** を 23 byte の delegation pointer（\`0xef0100 || delegate_address\`）に **その tx の残りの間だけ** 書き換える。EOA のストレージ・残高・アドレスはそのまま。
- **\`from = sponsor\`、\`to = user\`。** 外側 tx は sponsor が払い、実行主体は delegate 化された user 側に立つ。authorization の nonce はユーザの EOA nonce、外側 tx の nonce は sponsor の nonce — 役割が分かれる。
- **MAGIC プレフィクスでドメイン分離。** \`Authorization::signature_hash\` が EIP-7702 専用 MAGIC を含む（同じ RLP が他の署名済みメッセージとして誤読されるのを防ぐ）。
- **replay 防止は authorization の nonce が担う。** tx 後にユーザの EOA nonce が変わるので、古い authorization は無効化される。提出 *前* に nonce 鮮度をチェックすれば、submission 前の同期拒否で sponsor がガスを焼かずに済む。
- **4337 より sponsorship が安い。** entry-point オーバーヘッドなし + 単一 tx（bundler マークアップなし）。

データ経路を 1 枚で:

\`\`\`mermaid
flowchart TB
    User["Alice (EOA)"] -->|オフチェーンで Authorization 署名| AuthPayload["Authorization<br/>chain_id, delegate, nonce"]
    User -->|POST /sponsor| API
    AuthPayload -->|HTTP body| API["axum handler"]
    API -->|Type 4 tx を構築 user_auth 付き| Sponsor["Sponsor signer<br/>(ガス支払い)"]
    Sponsor -->|broadcast| Chain
    Chain -->|delegated code が<br/>Alice のアドレスとして走る| Effects["Token transfer +<br/>Router swap atomically"]
\`\`\`

## 具体例

ユーザ側で authorization に署名（フロントエンド/wallet）:

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

シリアライズ（EIP-2718 envelope）— サービスに届く wire 形式:

\`\`\`rust
let bytes = signed_auth.encoded_2718();
let hex = format!("0x{}", hex::encode(bytes));
// この hex 文字列を JSON ボディで送る
\`\`\`

サービスが受領 → Type 4 tx 構築（\`from=sponsor\`, \`to=user\`, \`authorization_list\` 入り）:

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

提出（sponsor 鍵で署名・送信、確認は分離可能）:

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

HTTP サービス（axum）— 全体 ~200 LOC:

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
    // Provider 例: QuickNode、Alchemy、Infura、または自前 Reth ノード。
    let provider = ProviderBuilder::new()
        .wallet(sponsor.clone())
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

## 失敗例（誤解）

「サービスは入力 authorization を信頼してよい」は誤り — production では \`signed_auth.recover_authority()? == body.user\` を **ガス支払い前に** 検証する。さらに nonce 鮮度を確認しない sponsor は古い authorization で焼かれる（提出前に現ユーザ nonce と比較し、不一致は同期拒否）。delegate アドレスも allowlist 化する（未知 delegate への authorization = 悪意の可能性）。

---

ここまでで「7702 = type 4 + auth_list、sponsor は外側 tx + ガス、authorization が delegation pointer を一時的に書き換える」は着地した。ここから 4 ステップで組み立てる。コードは抜粋（実行時は補助コードが必要）。

> 🛑 **予測。** なぜ Type 4 tx の \`from\` は Alice ではなく sponsor（Bob）でなければならないか。（答え: EIP-1559 の \`from\` は「この tx に nonce を使い、gas を payer として課金される人」を意味する。Bob がガスを払うので Bob が \`from\`。Alice の役割は authorization の署名者 — 「私の EOA に delegate コードを認可する」を表明するだけ。外側 tx の nonce と authorization の nonce は別物。）

## ステップで組み立てる

### Step 0: プロジェクトと依存

\`\`\`toml
# Cargo.toml
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

sponsor の秘密鍵は \`SPONSOR_KEY\` に、RPC は \`RPC_URL\` に。

### Step 1-4

上の 4 ブロック: ① user が \`Authorization { chain_id, delegate, nonce }\` に署名（\`signature_hash\` は MAGIC でドメイン分離）→ \`encoded_2718\` で wire 形式に → ② サービスが \`decode_2718\` で復元、\`executeBatch\` 形式でバッチ call を ABI エンコード、\`with_authorization_list(vec![signed_auth])\` で Type 4 化 → ③ \`send_transaction\` で sponsor 鍵で送信、即 hash 返却 → ④ axum で \`/sponsor\` を配線。\`alloy/examples/transactions/send_eip7702_transaction.rs\` の Bob+Alice 分離をサービス化したのと同じパターン。

production gap: authority 検証（\`recover_authority\`）/ nonce 鮮度 / 支出制限（ユーザ単位日次・call value 上限）/ delegate allowlist / watcher（L4 の replace-on-stuck をそのまま流用、同じ mempool）/ マルチユーザバッチング（\`auth_list = [Alice, Bob, Carol]\` + multicall delegate）/ フロントエンド SDK。

### Step 5: 起動と疎通

\`\`\`bash
$ RPC_URL=https://sepolia.infura.io/v3/$KEY \\
  SPONSOR_KEY=0x... \\
  cargo run --release

# 別ターミナルで sponsor リクエスト
$ curl -s -X POST http://localhost:8080/sponsor \\
    -H "Content-Type: application/json" \\
    -d @sample-sponsor-body.json
{ "tx_hash": "0x..." }
\`\`\`

## 答え合わせ（Test gate）

sponsor 損失につながる失敗モード 2 つを潰す（\`anvil --hardfork prague\` か Pectra 後の forked mainnet で）:

\`\`\`rust
// tests/sponsor_invariants.rs
#[tokio::test]
async fn rejects_duplicate_authorization() {
    let svc = test_sponsor().await;
    let user = anvil_account(0);
    let auth = sign_authorization(&user, DELEGATE, 0).await;
    let calls = vec![simple_transfer(BOB, U256::from(1))];

    // 1 回目は着地
    let h1 = svc.sponsor(&auth, calls.clone()).await.unwrap();
    wait_for_inclusion(h1).await;

    // 同じ auth で 2 回目は、チェーンではなくサービスで拒否されるべき
    let err = svc.sponsor(&auth, calls).await.unwrap_err();
    assert!(matches!(err, SponsorError::ReplayedAuthorization));
}

#[tokio::test]
async fn gas_accounting_matches_actual_cost() {
    let svc = test_sponsor().await;
    let user = anvil_account(0);
    let sponsor_before = balance(svc.sponsor_address()).await;
    let user_before = balance(user.address()).await;

    let h = svc.sponsor(&fresh_auth(&user).await, vec![simple_transfer(BOB, U256::from(1))])
        .await.unwrap();
    let receipt = wait_for_receipt(h).await;
    let actual_cost = U256::from(receipt.gas_used) * receipt.effective_gas_price;

    let sponsor_after = balance(svc.sponsor_address()).await;
    assert_eq!(sponsor_before - sponsor_after, actual_cost);
    assert_eq!(balance(user.address()).await, user_before, "ユーザはガスを払わない");
}
\`\`\`

両方 pass まで未完了。前者が崩れると replay 試行でガスを焼き、後者が崩れると支出制御が壊れる。

## 合格基準

- 上記 2 テスト（replay 拒否 + sponsor 残高だけがガス分減る）が green。
- なぜ 7702 が 4337 より sponsorship が安いか（entry-point オーバーヘッドなし + 単一 tx）を 1 文で言える。
- 外側 tx の nonce と authorization の nonce の役割の違いを即答できる。

## Drill

1. \`signed_auth.recover_authority()? == body.user\` の検証を追加（15 分）。
2. 提出前に現ユーザ nonce と auth の nonce 一致を検証（15 分）。
3. \`/sponsor\` を \`(user, user_authorization, calls)\` トリプルのリストに変更、全 auth + multicall で 1 tx（1.5 時間）。
4. \`HashMap<Address, U256>\` でユーザ単位日次ガス上限（45 分）。
5. L4 の watcher を持ってきて統合（30 分）。

## 📺 関連動画

\`\`\`youtube
_k5fKlKBWV4 | EIP-7702: a technical deep dive — lightclient (Devcon SEA 2024)
\`\`\`

\`\`\`youtube
K2Tm1f8MIwg | Full code walkthrough of EIP-7702 in Revm — sponsor された tx を走らせるエンジン
\`\`\`

## まとめ（3行）

- EIP-7702 は Type 4 tx + \`authorization_list\` で EOA のコードを *その tx の残りの間だけ* delegate に書き換える。\`from=sponsor\`(ガス払い)、\`to=user\`(実行主体)、auth の nonce はユーザの EOA nonce、外側 tx の nonce は sponsor の nonce。
- サービスは authorization を decode → \`executeBatch\` で ABI エンコード → \`with_authorization_list\` で Type 4 化 → sponsor 鍵で送信。production では \`recover_authority\` 検証と nonce 鮮度を *ガス支払い前* に。
- Test gate: replay 防止（service 境界で同期拒否）+ ガス会計（sponsor 残高だけがガス分減る、ユーザ残高は変わらない）。次は VM 層のカスタム cheatcode。

## 次のレッスン（レッスン6）

Foundry スタイルのカスタム cheatcode を Rust で作る（custom precompile + 最小ハーネス）。differential テストで Rust precompile と参照実装 Solidity が 1000 件の fuzz 入力で同じ出力を返すことを assert する。`,
                },
                {
                  title: 'レッスン6 — Foundry スタイルのカスタム cheatcode を Rust で作る',
                  slug: 'build-foundry-cheatcode-ja',
                  type: 'CONTENT',
                  sortOrder: 6,
                  duration: 45,
                  xpReward: 80,
                  content: `# レッスン6 — Foundry スタイルのカスタム cheatcode を Rust で作る

## 問い

\`vm.deal(alice, 100 ether)\` は EVM opcode でも Solidity contract でもない。Foundry がマジックアドレス \`0x7109709E...\` に precompile（EVM エンジンに組み込まれた「コードがチェーン上にない」コントラクト）をインストールし、\`Vm.sol\` インターフェースで Solidity から見えるようにしている。自前 cheatcode（例: \`cheats.measureGas(target, data)\`）をどう出荷するか？

## 原理（最小モデル）

- **precompile は executor に組み込まれ、プロトコル本体には入らない。** mainnet Revm はあなたの precompile を持たない、テストランナー Revm だけが持つ。コンセンサスを壊さず Rust のフルパワーを使える（普通の Solidity contract は EVM op しか呼べない、新 opcode はコンセンサス fork）。
- **セレクタ dispatch + ABI decode で Solidity と同じ呼び出し感。** Solidity は「アドレスへの呼び出しを ABI エンコードする方法」を既に知っているので、precompile が \`input[..4]\` をセレクタとして分岐し \`sol!\` 生成コードで型安全に decode すれば、テスト作者から見て普通の contract と区別がつかない。
- **入れ子 EVM 実行でガスを測る。** 同じ world state（または独立 DB）に対して fresh \`Context\` を立ち上げ、ワンショット tx を走らせ \`gas_used\` を返す。Success/Revert/Halt 全部で消費ガスは取れる。
- **戻り値は \`Ok(EthPrecompileOutput)\` か \`Err(PrecompileHalt::*)\`。** 前者は結果 bytes、後者は呼び出し停止。

データ経路を 1 枚で（cheatcode の呼び出しから測定まで）:

\`\`\`mermaid
flowchart TB
    Test["Solidity test"] -->|call| Cheats["0x7110... precompile"]
    Cheats -->|nested EVM call| Inner["Revm sub-EVM<br/>target.data を実行"]
    Inner -->|gas_used| Cheats
    Cheats -->|abi-encoded uint256| Test
\`\`\`

## 具体例

precompile エントリーポイント（セレクタ dispatch）:

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

cheatcode ロジック（入れ子 EVM で測る、demo は独立 DB、本物は Inspector で親 state を共有）:

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

ハーネスに登録（標準集合から拡張）:

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

Solidity 側からは \`vm.deal\` と同じ呼び方:

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

## 失敗例（誤解）

「\`vm.deal\` 系の機能は普通の Solidity contract で実装できる」は誤り — Solidity contract は EVM op しか呼べず、Revm 内部（同じ world state での入れ子実行など）にアクセスできない。「新 EVM opcode を足せばいい」も誤り — opcode は **即コンセンサスを fork する**（mainnet が拒否）。precompile は **あなたの** Revm ビルドにだけ存在し、mainnet には影響しない（~50 行で全 Rust パワー）。

---

ここまでで「precompile = executor 拡張、セレクタ dispatch で Solidity contract に見える」は着地した。ここから 4 ステップで組み立てる。コードは抜粋（実行時は補助コードが必要）。

> 🛑 **予測。** なぜ precompile で実装するのか、precompile でしかできない点は？（答え: Revm 内部（fresh \`Context\`、入れ子 EVM 実行、Inspector 経由の親 state 共有）にフル Rust でアクセスできる。普通の Solidity contract は EVM op しか持たず、新 opcode はコンセンサスを fork する。precompile は mainnet 影響なしで Rust 関数を VM から呼び出せる唯一の道。）

## ステップで組み立てる

### Step 0: プロジェクトと依存

\`\`\`toml
# Cargo.toml
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

### Step 1-4

上の 4 ブロック: ① precompile エントリ（セレクタ dispatch + ABI decode）→ ② cheatcode ロジック（入れ子 EVM、Success/Revert/Halt 全部で \`gas_used\` を返す、demo は \`EmptyDB\`、本物は Inspector で親 state 共有）→ ③ ハーネス登録（\`Precompiles::new(OSAKA).extend([CHEATS_PRECOMPILE])\`、\`Context::mainnet().with_precompiles(...)\`）→ ④ Solidity テスト（普通の interface call、\`solc\` でコンパイルし bytecode + selector を \`run_test_contract\` に渡す）。

production gap: Solidity コンパイル（\`forge\` が solc を呼ぶ、ユーザに事前コンパイルさせる方が普通）/ 親 state 共有（custom Inspector）/ 並列性（テストごと独立 DB の tokio タスク）/ 失敗レポート（stack trace、decoded revert、fuzz shrink）/ 呼び出し間 state 永続化（\`vm.expectRevert\` は次の call にだけ状態を設定、Inspector に保存）。

### Step 5: 実行

\`\`\`bash
$ cargo test --release -- --nocapture
running 2 tests
test tests::measures_gas_for_simple_call ... ok
test tests::reports_zero_on_revert ... ok
\`\`\`

参照実装との **differential テスト**（dual-use: Rust で速度、Solidity で正しさ担保）:

\`\`\`solidity
// test/MeasureGasDifferential.t.sol
import "forge-std/Test.sol";
import {Cheats} from "src/Cheats.sol";

contract MeasureGasDifferential is Test {
    Cheats cheats = Cheats(0x7109709ECfa91a80626fF3989D68f67F5b1DD12E);  // 自前のアドレス
    Target target = new Target();

    function testMatches_referenceForKnownInput() public {
        bytes memory data = abi.encodeCall(target.work, (42));

        // (a) Rust precompile
        uint256 viaPrecompile = cheats.measureGas(address(target), data);

        // (b) Solidity-only リファレンス
        uint256 before = gasleft();
        (bool ok,) = address(target).call(data);
        uint256 referenceGas = before - gasleft();
        require(ok);

        assertApproxEqAbs(viaPrecompile, referenceGas, 5);  // 計測オーバーヘッド分の小さな ε
    }

    function testFuzz_alwaysAgreesWithReference(uint256 input) public {
        input = bound(input, 0, 10_000);
        bytes memory data = abi.encodeCall(target.work, (input));

        uint256 viaPrecompile = cheats.measureGas(address(target), data);
        uint256 before = gasleft();
        (bool ok,) = address(target).call(data);
        uint256 referenceGas = before - gasleft();
        require(ok);

        assertApproxEqAbs(viaPrecompile, referenceGas, 5);
    }
}
\`\`\`

\`forge test --match-test testFuzz_ -vvv\` を既定 256 fuzz iteration で実行。256 入力すべてで一致（数 gas の ε 内）まで未完了。1 件でも差分が出たら、その入力で cheatcode は誤計測する。

## 合格基準

- 上記 2 テスト（固定入力 + 256 fuzz）が green（参照と数 gas 以内）。
- なぜ precompile が contract/opcode より優れているか（コンセンサス壊さず Rust フルアクセス）を 1 文で言える。
- セレクタ dispatch + ABI decode が「Solidity 既知の呼び出し規約」とどう噛むかを即答できる。

## Drill

1. \`balanceOf(address)\` セレクタを追加（\`evm.db.basic(addr).balance\`）（15 分）。
2. \`measureGas\` に \`value\` 引数を足し payable 化（30 分）。
3. \`cheats.deal(address, uint256)\` を custom \`Inspector\` で親 state mutate（3 時間）。
4. ディレクトリの \`.sol\` を solc でコンパイル → \`test_\` 関数を発見・実行・pass/fail 出力する最小ランナー（4 時間）。
5. Counter increment × 1000 で自前 vs \`forge test\` のレイテンシ差を測る（1 時間）。

## まとめ（3行）

- cheatcode = executor に登録した precompile = mainnet コンセンサスに影響なし + フル Rust パワー（contract は EVM op のみ、新 opcode は fork を招く — precompile が唯一の道）。
- セレクタ dispatch + \`sol!\` 生成 ABI decode + 入れ子 EVM で \`gas_used\` 計測。Solidity からは普通の interface call にしか見えない（ABI 互換性が「騙し」を可能にする）。
- Test gate: 256 fuzz iteration で Rust precompile と Solidity-only \`gasleft()\` リファレンスが数 gas 以内で一致。次は DB 層 consistent snapshot の swap aggregator。

## 次のレッスン（レッスン7）

Swap Aggregator を作る（DEX state を fork して Rust で）。Revm fork で全 quote が同じ atomic state を読み、Uniswap V2 + Sushi + V3 から reserve を引いて出力を計算しベストを選ぶ。QuoterV2 differential で 5 bps まで担保。`,
                },
                {
                  title: 'レッスン7 — Swap Aggregator を作る — DEX state を fork して',
                  slug: 'build-swap-aggregator-ja',
                  type: 'CONTENT',
                  sortOrder: 7,
                  duration: 45,
                  xpReward: 80,
                  content: `# レッスン7 — Swap Aggregator を作る — DEX state を fork して、Rust で

## 問い

ユーザが 10K USDC を ETH に swap したい。Uniswap V2 / Sushi / Uniswap V3 のどれがベスト？ 各 pool を直接 RPC で叩くと、pool A の reserve がリードと pool B のリードの間に動いてしまい、「リンゴと梨」を比較することになる。**全 quote が同じ瞬間の state を読む** atomic な aggregation はどう組むか？

CLI 出力イメージ:

\`\`\`bash
$ cargo run -- quote \\
    --in-token  0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48 \\
    --out-token 0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2 \\
    --amount-in 10000000000

Quotes (10000 USDC -> WETH):
  Uniswap V2:    2.94821 WETH  (price 3393.08 USDC/WETH)
  Sushi V2:      2.94619 WETH  (price 3395.41 USDC/WETH)
  Uniswap V3:    2.95104 WETH  (price 3389.84 USDC/WETH)  ← BEST
\`\`\`

## 原理（最小モデル）

- **1 回 fork = N quote の atomic snapshot。** N 並列 \`eth_call\` は各 read が別 state（pool A と pool B が微妙に違うブロック）から来うる。fork は MVCC データベースが「N 個の値を atomic に同じ時点から read する」を解いてきたのと同じ構造を DEX に持ち込む。初回 ~50ms（block fetch）、以降 ~200µs/pool、ガスコストも fork 内で測れる。
- **V2 系は constant product + fee 調整、共通実装。** \`amount_in_with_fee = amount_in × (10000 - fee_bps)\`、\`amount_out = (amount_in_with_fee × reserve_out) / (reserve_in × 10000 + amount_in_with_fee)\`。bps を差し替えるだけで Uniswap V2 / Sushi 等の V2 fork を共通実装で扱える。
- **V3 数式は非自明 → on-chain Quoter を fork 内で呼ぶ。** tick + concentrated range の数式を再実装せず、デプロイ済み \`IQuoterV2\` を Revm 経由で叩く（RPC ラウンドトリップなし）。
- **\`token0\` 判定が要る。** pool はアドレス順で並ぶので、\`reserve_in\` が \`reserve0\` か \`reserve1\` かは都度判定。

データ経路を 1 枚で:

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

## 具体例

mainnet を fork（レッスン1 の MEV searcher と同じパターン）:

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
    // Provider 例: QuickNode、Alchemy、Infura、または自前 Reth ノード。
    let provider = ProviderBuilder::new()
        .connect(&std::env::var("ETH_RPC_URL")?)
        .await?
        .erased();
    let alloy_db = WrapDatabaseAsync::new(AlloyDB::new(provider, BlockId::latest()))
        .ok_or_else(|| eyre::eyre!("AlloyDB init failed"))?;
    Ok(CacheDB::new(alloy_db))
}
\`\`\`

V2 reserve を読む（汎用 \`call_view\` パターン）:

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

V2 quote 数学（constant product + fee）— Uniswap V2 router の \`getAmountOut\` と行単位で同じ:

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

V3 quote（on-chain Quoter を fork 内で呼ぶ、数式を再実装しない）:

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

aggregate + best 選択（~250 LOC バイナリ全体）:

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

## 失敗例（誤解）

「各 pool を直接 RPC で叩けばいい」は誤り — N 並列 \`eth_call\` では各 read が別 state（pool A read と pool B read の間に reserve が動く）から来うる。「ベストルート」の計算がリンゴと梨の比較になる。fork は世界の単一ビューを与え、aggregation を健全にする — atomicity こそが本質。

---

ここまでで「1 fork = atomic snapshot、V2 = constant product、V3 = Quoter 呼び」は着地した。ここから 5 ステップで組み立てる。コードは抜粋（実行時は補助コードが必要）。

> 🛑 **予測。** 各 pool を直接 RPC で叩かず fork で state を読む理由は？（答え: 全 read が同じ atomic snapshot から得られる + 仮想 swap のガスも fork 内で測れる + 初回 fetch 後は ~200µs/pool で N 並列 RPC より遥かに速い。atomicity は「ベストルート」を健全にする最低条件 — pool 間 state drift を抑える唯一の道。）

## ステップで組み立てる

### Step 0: プロジェクトと依存

\`\`\`toml
# Cargo.toml
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

\`ETH_RPC_URL\` を env に設定（QuickNode / Alchemy / Infura / 自前 Reth）。

### Step 1-5

上の 5 ブロック: ① \`build_fork\`（\`AlloyDB\` + \`CacheDB\`、最新ブロック）→ ② \`read_v2_pool\`（\`token0\` 判定 + \`getReserves\` の \`call_view\`）→ ③ \`quote_v2\`（constant product + fee、\`U256\` のみ）→ ④ \`quote_v3\`（\`IQuoterV2\` を Revm 経由で呼ぶ、\`sqrtPriceLimitX96=0\` で価格制限無効）→ ⑤ \`aggregate\` + \`pick_best\`。

production gap: マルチホップ（A → WETH → B のグラフ + 重み付き Bellman-Ford）/ split routing（40% V3、60% V2 の凸最適化）/ Curve（stableswap Newton 法）/ Balancer（weighted pool）/ ガス考慮（推定ガスを out-token で引く）/ price-impact 閾値（X% 超え動かすルートを却下、MEV sandwich 対策）/ submission 時の再 quote（state drift）/ MEV 保護（Flashbots Protect / MEV-Share、L8 capstone）。

### Step 6: 実行

\`\`\`bash
$ ETH_RPC_URL=https://mainnet.infura.io/v3/$KEY cargo run --release -- quote \\
    --in-token  0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48 \\
    --out-token 0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2 \\
    --amount-in 10000000000
Quotes (10000 USDC -> WETH):
  Uniswap V2:    ... WETH
  Sushi V2:      ... WETH
  Uniswap V3:    ... WETH  ← BEST
\`\`\`

## 答え合わせ（Test gate）

pin した mainnet で QuoterV2 differential（aggregator の正しさは「\`Quoter\` と同じ出力を返すか」の二値）:

\`\`\`rust
// tests/aggregator_quote_diff.rs
use alloy::primitives::{address, U256};

const PINNED_BLOCK: u64 = 18_500_000;
const FORK_RPC: &str = "https://eth.merkle.io";
const QUOTER_V2: Address = address!("61fFE014bA17989E743c5F6cB21bF9697530B21e");

#[tokio::test]
async fn matches_quoter_for_known_input() {
    let mut db = build_fork_at(FORK_RPC, PINNED_BLOCK).await;

    // 10,000 USDC -> WETH (Uniswap V3 0.3% pool)
    let amount_in = U256::from(10_000) * U256::from(10).pow(U256::from(6));

    // 自前 aggregator のパス（V3 のみ、シングルホップ）
    let our_quote = quote_v3(&mut db, USDC, WETH, 3000, amount_in).await.unwrap();

    // 参照: 同じ forked state での Uniswap QuoterV2
    let reference_quote = call_quoter_v2(&mut db, QUOTER_V2, USDC, WETH, 3000, amount_in).await.unwrap();

    // fee 会計の精度のため ε を許容（basis-point 級）
    let diff_bps = (our_quote.abs_diff(reference_quote) * U256::from(10_000)) / reference_quote;
    assert!(diff_bps < U256::from(5), "QuoterV2 と 5 bps 以内で一致するはず; got {} bps", diff_bps);
}

#[tokio::test]
async fn picks_best_when_v3_dominates() {
    // V3 が最良価格となる状況を構築し、pick_best が V3 を返すことを assert
    // ブロックエクスプローラで実際に成立するブロックを引いて使う
}
\`\`\`

QuoterV2 differential が pass まで未完了。数学が 50 bps 狂っていれば、全ユーザに静かに最適でないルートを推薦している。

## 合格基準

- 上記 2 テスト（QuoterV2 と 5 bps 以内 + V3 が dominant な block で \`pick_best\` が V3 を返す）が green。
- なぜ fork が N 並列 RPC より厳密に優れているか（atomic state を貫く + ガス測れる）を 1 文で言える。
- V2 の \`amount_in_with_fee × reserve_out\` が分子に来る理由（次元）を即答できる。

## Drill

1. Curve 3pool を追加（stableswap \`get_dy\`）（1.5 時間）。
2. ガス会計（推定ガスを out-token で引く）（2 時間）。
3. 2-hop 探索（A → WETH → B、直接と比較）（3 時間）。
4. Split routing（top 2 venue 50/50、合計 > 単独 をチェック）（2 時間）。
5. L4 wallet backend に \`POST /quote-and-swap\` として組み込み、署名済み tx を返す（3 時間）。

## まとめ（3行）

- 1 fork = 全 quote が同じ atomic state を読む（MVCC の N キー atomic read と同じ）— N 並列 RPC では pool 間 state drift で「リンゴと梨」になる。
- V2 = constant product + fee の共通実装で fork 横断（bps を差し替えるだけ）、V3 = on-chain \`IQuoterV2\` を fork 内で呼んで数式の再実装を避ける（\`sqrtPriceLimitX96=0\`）。
- Test gate: pin block で QuoterV2 differential を 5 bps 以内、V3 dominant な block で \`pick_best\` 検証。次は capstone の frontrun-resistant order router。

## 次のレッスン（レッスン8）

Capstone — Frontrun-Resistant Order Router を作る。L1/L2/L3 / L4-7 で築いた pattern を統合（searcher pipeline + custom RPC + wallet backend + 7702 sponsor + aggregator）し、end-to-end fork テストで order 投入から split routing → 着地 → fill 報告までを観察する。`,
                },
                {
                  title: 'レッスン8 — Capstone — Frontrun-Resistant Order Router を作る',
                  slug: 'build-capstone-router-ja',
                  type: 'CONTENT',
                  sortOrder: 8,
                  duration: 60,
                  xpReward: 100,
                  content: `# レッスン8 — Capstone — Frontrun-Resistant Order Router を作る

## 問い

ユーザの swap intent（JSON）を受け、ベスト venue を選び、mempool に sandwich 仕掛けの敵 tx がいるか検出し、シミュレーションで脅威スコアを出し、脅威が高ければ private mempool（Flashbots Protect）へ、低ければ public mempool へ送る。L1（searcher pipeline）+ L4（wallet）+ L5（sponsor）+ L7（aggregator）を統合し、追加実装は **決定レイヤー** だけに絞る — どう組むか？

公開する HTTP API はこの形:

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

## 原理（最小モデル）

- **決定レイヤーが本キャップストーンの新規。** 下のすべては L1/L4/L5/L7 を再利用（quote → 敵検出 → simulation でスコア → private vs public）。RouteRequest → RouteDecision の関数として書き、終端状態は 3 つ（EXECUTE_PRIVATE / EXECUTE_PUBLIC / REJECT_TOO_RISKY）。
- **L1 mempool 監視を防御に転用。** searcher の入力（pending tx の購読）を「ユーザが使う pool を同じ方向に動かそうとする tx」の検出に転用する。緩い判定（substring or 既知 router へのターゲット）で false positive を許容 → 安全側（private へ逃がす）に倒す。
- **「敵が先に着地したら出力はどれだけ落ちる?」を fork で測る。** 候補検出だけでは判定できない。敵 tx を fork に適用してから re-quote、差分 bps（\`(before - after) × 10000 / before\`）が脅威スコア。0-10 bps = Low、11-50 = Medium、51+ = High。
- **2 つの provider（public + private）が設計の核。** 同じ Alloy コードに違うエンドポイント（\`rpc.flashbots.net/protect\` vs Infura/自前 Reth）— sandwich を打ち破る非対称性。

データ経路を 1 枚で（前レッスンの再利用部 + 新規部）:

\`\`\`mermaid
flowchart TB
    User["POST /route"] --> Router["Router service"]
    Router -->|fork mainnet| Aggregator["Aggregator (レッスン7)<br/>quotes + best venue"]
    Router -->|scan pending txs| Detector["Frontrun detector<br/>(レッスン 1 mempool watch +<br/>レッスン 7 simulation)"]
    Detector -->|adversarial tx found?| Decide{"Risk?"}
    Aggregator --> Decide
    Decide -->|HIGH| PrivPath["Private mempool<br/>(Flashbots Protect)"]
    Decide -->|LOW| PubPath["Public mempool"]
    PrivPath --> Sponsor["EIP-7702 sponsor (レッスン5)"]
    PubPath --> Sponsor
    Sponsor --> Wallet["Wallet backend (レッスン4)<br/>nonce/gas/replace"]
    Wallet --> Chain
\`\`\`

## 具体例

決定 struct（アーキテクチャを 1 つの型で）:

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
    pub frontrun_risk:   String,
    pub tx_hash:         Option<B256>,
    pub submission:      Option<&'static str>,  // "flashbots-protect" | "public" | null
    pub reason:          Option<String>,
}
\`\`\`

Frontrun 検出（L1 を視点反転、searcher の機会監視を脅威監視に）:

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

Revm シミュレーションで脅威をスコアリング:

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

決定木 + 提出（2 provider の切り替え）:

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

    // EIP-7702 sponsored tx を構築 (L5 持ち込み)
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

統合（4 ステップ: quote → adversary scan → risk score → execute）:

\`\`\`rust
async fn route_handler(
    State(state): State<Arc<AppState>>,
    Json(req): Json<RouteRequest>,
) -> Result<Json<RouteDecision>, (axum::http::StatusCode, String)> {
    // 1. venue 横断 quote (レッスン7 持ち込み)
    let mut db = build_fork().await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let (best, venue) = best_quote(&mut db, &req).await
        .map_err(|e| (axum::http::StatusCode::BAD_GATEWAY, e.to_string()))?;

    // 2. ~2 秒間 mempool で adversarial tx を監視 (レッスン1 反転)
    let pool_for_route = address_for_venue(venue, req.in_token, req.out_token);
    let adversaries = scan_for_adversaries(&state.public_provider, pool_for_route, req.in_token, Duration::from_secs(2)).await
        .unwrap_or_default();

    // 3. シミュレーションでリスクをスコア (レッスン1 + レッスン7 結合)
    let mut risk_db = build_fork().await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let risk = score_risk(&mut risk_db, &adversaries, best.amount_out, &req).await
        .unwrap_or(FrontrunRisk::Low);

    // 4. 一致する submission パスで実行 (レッスン4 + レッスン5 持ち込み)
    let decision = execute_decision(&state, &req, venue, best.amount_out, risk).await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(decision))
}
\`\`\`

新規コード合計 ~250 LOC（持ち込み込みで動く router 全体）。

## 失敗例（誤解）

「sandwich 検出は候補 tx を見つければ十分」は誤り — 「ユーザの output がどれだけ落ちるか」を fork で測らなければ防御するか決められない（候補ありで Low、候補なしで High もある）。「private mempool は常に安いから常に使う」も誤り — Flashbots は bundler markup を払う。Low risk は public で十分。risk-aware な切り替えが本筋。

---

ここまでで「decision layer + 2 provider 非対称」は着地した。ここから 6 ステップで組み立てる。コードは抜粋（実行時は補助コードが必要）。

> 🛑 **予測。** L1 の MEV searcher は、この router の脅威モデルそのもの。searcher の行動と router が防ぐ対象を一文で。（答え: searcher は pending tx に sandwich を仕掛けて利益を得る。router はその検出器を *防御側に転用* し、敵が先に着地したらユーザの output がどれだけ落ちるかを fork で測り、Medium/High なら private（Flashbots Protect）に逃がす。同じ mempool 監視・同じ fork simulation、視点だけが反転する。）

## ステップで組み立てる

### Step 0: プロジェクトと依存

\`\`\`toml
# Cargo.toml
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

env: \`PUBLIC_RPC=...\`、\`PRIVATE_RPC=https://rpc.flashbots.net/protect\`、\`SPONSOR_KEY=0x...\`。

### Step 1-6

上の 6 ブロック: ① 型 sketch（RouteRequest/Decision、3 終端状態）→ ② best quote（L7 \`aggregate\` + \`pick_best\` を再利用）→ ③ adversary scan（L1 の pending tx 購読を防御側に）→ ④ Revm simulation で risk score（敵 tx を fork に適用 → re-quote → 差分 bps）→ ⑤ execute decision（min_out チェック → L5 sponsored tx → risk で public/private 切り替え）→ ⑥ route_handler で統合。

### Step 7: 起動と疎通

\`\`\`bash
$ PUBLIC_RPC=... PRIVATE_RPC=https://rpc.flashbots.net/protect \\
  SPONSOR_KEY=0x... cargo run --release

# 別ターミナル
$ curl -s -X POST http://localhost:9000/route -d @sample-route-body.json
{ "decision": "EXECUTE_PRIVATE", "venue": "Uniswap V3", ... }
\`\`\`

production gap: MEV-Share/OFA（private auction + リベート）/ user 単位スリッページ予算 / キャンセル + 返金 / マルチリージョン private RPC（Flashbots + Beaverbuild + Titan）/ 観測・閾値自動チューニング（drop の実測 vs 予測）。

## 答え合わせ（Test gate — E2E）

forked mainnet で benign / threat / slippage の 3 ケース:

\`\`\`rust
// tests/router_e2e.rs
#[tokio::test]
async fn benign_path_uses_public_mempool() {
    // anvil --fork-url <RPC> --fork-block-number <PINNED>
    // mempool に敵対的 tx なし
    let svc = test_router().await;
    let resp = svc.route(stub_intent(ALICE)).await.unwrap();
    assert_eq!(resp.decision, Decision::ExecutePublic);
    let receipt = wait_for_receipt(resp.tx_hash).await;
    assert!(out_amount(&receipt) >= MIN_OUT);
}

#[tokio::test]
async fn detected_threat_routes_through_private_mempool() {
    let svc = test_router().await;
    seed_mempool_with_sandwich_setup(&svc).await;       // 敵対者をシミュレート
    let resp = svc.route(stub_intent(ALICE)).await.unwrap();
    assert_eq!(resp.decision, Decision::ExecutePrivate);
    assert!(resp.submission_url.contains("flashbots") || resp.submission_url.contains("protect"));
}

#[tokio::test]
async fn respects_min_out() {
    // スリッページシナリオを強制し、router が submit を拒否し 422 を返すことを assert
    let svc = test_router().await;
    let resp = svc.route(intent_with_unrealistic_min_out(ALICE)).await;
    assert!(matches!(resp, Err(RouteError::SlippageExceeded)));
}
\`\`\`

3 つすべて forked-mainnet の \`anvil\` で pass まで未完了。

## 合格基準

- 上記 3 E2E テスト（public パス end-to-end / 脅威下の private 切り替え / slippage 拒否）が green。
- なぜ capstone が他のどのコンポーネントよりも simulation（L1）に依存するか（ユーザ損失と同じ単位で脅威を測らずに防御を決められない）を 1 文で言える。
- 2 provider 非対称（同じ Alloy code に違うエンドポイント）の効果を即答できる。

## Drill

1. \`looks_like_swap_on\` の substring を UniV2/V3/Sushi router の正規 \`sol!\` デコードに置換（3 時間）。
2. 各敵を独立に snapshot+rollback でスコア、worst-case を取る（2 時間）。
3. \`POST /cancel { tx_hash }\` を追加（authorization 払い戻し）（3 時間）。
4. Flashbots Protect + Beaverbuild に同時 submit、最初の着地を採用（1.5 時間）。
5. 決定 + 実 drop をログ、historical data に bps 閾値を fit するオフラインスクリプト（5 時間）。

## まとめ（3行）

- decision layer が capstone の新規 — quote (L7) → adversary scan (L1 反転) → fork simulation で risk score → public/private 切り替え (L4+L5)。3 終端状態（EXECUTE_PRIVATE / PUBLIC / REJECT_TOO_RISKY）。
- 脅威スコアは「敵が先に着地したら output bps drop」— 候補検出だけでは判定不能、fork で測る。0-10/11-50/51+ で Low/Medium/High。
- 2 provider 非対称（public + Flashbots Protect、同じ Alloy code に違う URL）が sandwich を打ち破る。E2E test gate: benign/threat/slippage の 3 シナリオを forked mainnet で。

## 次のレッスン（レッスン9）

Revm シミュレーションを Production Provider で検証する（differential testing）。L1/L7/L8 すべてが Revm に依存しているので、Revm と mainnet 多数派 client（Geth/Erigon）の挙動がずれると全部に伝播する。\`debug_traceTransaction\` と一致を assert する。`,
                },
                {
                  title: 'レッスン9 — Revm シミュレーションを Production Provider で検証する',
                  slug: 'build-validate-revm-ja',
                  type: 'CONTENT',
                  sortOrder: 9,
                  duration: 50,
                  xpReward: 90,
                  content: `# レッスン9 — Revm シミュレーションを Production Provider で検証する

## 問い

Revm fork が「2.95 WETH 取れる」と予測したのに、実チェーンでは 2.93 しか取れない。この差はそのまま損失になる。同じリスクは L1 searcher / L7 aggregator / L8 router すべてにある（Reth のクライアントシェア ~7-12%、Revm の正しさは Reth でない 88-93% との一致に依存）。Revm vs 本番 EVM クライアントを継続的に検証するハーネスをどう作る？

## 原理（最小モデル）

- **differential testing が gold standard。** IEEE 754 準拠検証 / TLS interop / POSIX 認証と同じ規律 — 「代表入力で自分の実装が信頼できるリファレンスと一致することを証明」。ここでは Revm vs \`debug_traceTransaction\`（Geth/Erigon/Alchemy 等）。
- **2 種のテストケース。** ① 歴史的 mainnet tx を parent block でリプレイ（receipt が gas_used の正解、provider の \`eth_call\` が return data の正解）② 現状 state に対する仮想 call（\`USDC.balanceOf(holder)\` を provider \`eth_call\` と Revm fork で同 block 実行、provider が正解）。後者の方が始めやすい。
- **同一ブロックに pin。** provider と Revm を同じ block に固定（\`BlockId::number(block)\`）して比較条件を揃える。
- **bytes は完全一致、gas は近似比較。** 1 byte 違えば下流 decode が変わる（厳密）。\`eth_estimateGas\` は安全バッファ含み（許容幅: \`max(prod_gas/10, 5000)\`）。
- **不一致の上位 3 原因はチェーン spec / ハードフォーク / precompile。** symptom→原因マッピングを覚える。

データ経路を 1 枚で（同じ tx を 2 経路で実行 → diff）:

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

## 具体例

テストケース（USDC.balanceOf を pin block で）:

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

Production provider の答え（\`eth_call\` + \`eth_estimateGas\`、同 block 固定）:

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

Revm の答え（同じ block を fork）:

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

Diff（bytes 完全一致 / gas 許容幅付き）:

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

## 失敗例（誤解）

「Revm をローカルで走らせば検証になる」は誤り — Revm を Revm でテストするだけ。検証は **Revm 以外の provider**（Geth/Erigon の \`debug_traceTransaction\`）との一致で行う。「直近 block の latest を使えばいい」も誤り — RPC キャッシングで違う block の古い state を返すことがある（確定 block = latest - 32 にピン留めして再現性を確保）。

---

ここまでで「differential vs production provider」は着地した。ここから 5 ステップで組み立てる。コードは抜粋（実行時は補助コードが必要）。

> 🛑 **予測。** Revm の spec が mainnet とずれている場合、検証ハーネスにはどんな不一致として現れるか？（答え: ① 出力が一貫して \`0x\`/空（spec 違い、例: mainnet 用に作ったが op-mainnet を見ている）② ハードフォーク境界でだけ出力が違う（Revm の有効化 block が実チェーンと不一致）③ 特定 precompile を呼ぶ tx だけ違う（Revm に未実装、例: RIP-7212 secp256r1）。上位 3 原因がチェーン spec / ハードフォーク / precompile の不一致。）

## ステップで組み立てる

### Step 0: プロジェクトと依存

\`\`\`toml
# Cargo.toml
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

### Step 1-5

上の 4 ブロック: ① テストケース選定（仮想 call が始めやすい、歴史的 tx は drill）→ ② provider answer（\`eth_call\` + \`eth_estimateGas\`、block pin）→ ③ Revm answer（\`AlloyDB\` + \`CacheDB\`、\`Context::mainnet\`、同 block pin）→ ④ diff（bytes 厳密、gas 許容幅）→ ⑤ 不一致デバッグ分類（spec / hardfork / precompile / RPC cache / intrinsic gas / hot vs cold）。

production gap: サンプリング（直近 7 日のランダム 1000 件 historical tx）/ state-diff 比較（\`prestate + statediff\` モード）/ ハードフォーク回帰（Revm 更新後に直近 5 hardfork block 周辺で再 validate）/ カスタム precompile 対応（op-stack 等）/ CI 統合（diff 許容超過で merge fail）/ マルチ provider クロスチェック（QuickNode + Infura + Alchemy）/ キャッシング（変更レッスンだけ再 validate）。

### Step 6: 実行

\`\`\`bash
$ ETH_RPC_URL=https://mainnet.infura.io/v3/$KEY \\
  cargo run --release
provider: gas=21000  output=0x
revm:     gas=21000  output=0x
✅ match
\`\`\`

## 答え合わせ（Test gate）

最近の小範囲 block での Revm vs Geth/Erigon \`debug_traceTransaction\` 一致:

\`\`\`rust
// tests/revm_vs_provider.rs
#[tokio::test]
async fn matches_provider_for_recent_blocks() {
    // debug_traceTransaction を公開しているプロバイダなら何でも:
    //   - Erigon: 組み込み
    //   - Geth: --gcmode=archive --http.api debug
    //   - Alchemy: 有料プラン、レート制限あり
    let reference = ProviderBuilder::new().connect_http(REFERENCE_RPC.parse().unwrap());

    for block_num in (LATEST - 10)..=LATEST {
        let block = reference.get_block_by_number(block_num.into(), true).await.unwrap().unwrap();

        for tx in block.transactions.into_transactions() {
            let our_trace = our_revm_trace(tx.hash).await.unwrap();
            let reference_trace = reference.debug_trace_transaction(tx.hash).await.unwrap();

            assert_traces_equivalent(&our_trace, &reference_trace,
                "tx {:?} がブロック {} で reference と乖離", tx.hash, block_num);
        }
    }
}

#[tokio::test]
async fn coverage_includes_create_and_call_paths() {
    // CREATE、CREATE2、CALL、DELEGATECALL、STATICCALL を行使する既知 tx を選ぶ
    // それぞれが個別に reference と一致する必要がある
}
\`\`\`

両方が実 recent-block 範囲で pass まで未完了（延いては L1-L8 で作ったもの全部への信頼も）。1 件でも乖離したら simulation が嘘をついていて、L1-L8 の sim 依存判断のどれが間違いか先に見つけずに知ることができない。

## 合格基準

- 上記 2 テスト（直近 10 block × 全 tx の \`debug_traceTransaction\` 一致 + CREATE/CALL/DELEGATECALL/STATICCALL カバレッジ）が green。
- なぜ bytes は厳密で gas は近似か（\`eth_estimateGas\` の安全バッファ）を 1 文で言える。
- 不一致の上位 3 原因（spec / hardfork / precompile）を即答できる。

## Drill

1. 歴史的 tx を receipt.gas_used と Revm 再実行 gas_used で diff（1 時間）。
2. op-stack precompile（Base/Optimism、L1 block info）を使う tx で validation を試み失敗モード観察（1 時間）。
3. Uniswap V3 router の直近 100 成功 tx をループ validate、失敗率と pattern を集計（2 時間）。
4. QuickNode + Alchemy の同 block 同 call で provider 同士の不一致を観察（1.5 時間）。
5. CI 統合（exit-code 1、GitHub Action で nightly、baseline 比 >0.1% 不一致で fail）（3 時間）。

## 📺 関連動画

\`\`\`youtube
Nh19f_2fWLc | Dragan Rakita — EVM Technical walkthrough — Revm が production と一致するために従う必要のある spec
\`\`\`

## まとめ（3行）

- Revm の正しさは Reth でない 88-93% との一致に依存（Reth クライアントシェア ~7-12%）— L1/L7/L8 の sim はすべてこの仮定の上。\`debug_traceTransaction\` を gold standard に differential testing。
- bytes 厳密一致 + gas 許容幅（\`max(prod_gas/10, 5000)\`、\`eth_estimateGas\` の安全バッファぶん）。同 block 固定、確定 block（latest-32）で RPC cache 回避。
- 不一致の上位 3 原因 = チェーン spec / hardfork 有効化 block / 未実装 precompile。Test gate: 直近 10 block 全 tx の trace 一致 + CREATE/CALL paths カバレッジ。

## 次のレッスン（レッスン10）

Machine Payments — HTTP 402 と Tempo MPP スタック。本ティアのアプリ（L3 カスタム RPC、L6 cheatcode harness、L7 aggregator、L8 router）を pay-per-call で有料化する protocol layer。replay 防止と支払いなし 402 / 有効支払いで 200 のテストゲートで担保する。`,
                },
                {
                  title: 'レッスン10 — Machine Payments — HTTP 402 と Tempo MPP スタック',
                  slug: 'build-mpp-payments-ja',
                  type: 'CONTENT',
                  sortOrder: 10,
                  duration: 16,
                  xpReward: 40,
                  content: `# レッスン10 — Machine Payments — HTTP 402 と Tempo MPP スタック

## 問い

2026 年の有料 API はサインアップ → メール認証 → API キー → 請求設定 → プラン契約を経て、ようやく 1 回呼べる。SaaS 利用者には許容できるが、単発呼び出しの自律エージェントには重すぎる。アカウントも API キーも持たずに pay-per-call できる protocol はどう作るか？

## 原理（最小モデル）

- **HTTP 402 + \`Payment\` 認証スキーム（30 年前から予約されたコードを本気で使う）。** フロー: \`GET /resource\` → \`402 Payment Required\` + \`WWW-Authenticate: Payment <challenge>\` → クライアントが **HTTP の外で** 支払い履行 → \`Authorization: Payment <credential>\` 付き再試行 → \`200 OK\`。アカウント登録不要、API キー不要、rail（Tempo / Stripe / Lightning 等）はサーバが受け付けるものなら何でも。
- **rail 非依存（Core）+ rail 別 Methods + 抽象 Intents の 3 層。** Core が HTTP メカニクスと \`Payment\` ヘッダ文法（rail に依存しない）/ Methods が rail 固有実装（\`tempo/\`/\`stripe/\`/\`evm/\`/\`solana/\`/\`lightning/\`/\`card/\`）/ Intents が抽象パターン（charge / authorize / subscription）。1 つの rail を Core に埋め込むと別 rail 追加時に Core 再設計、分離すると Methods への追加だけで済む。
- **支払い処理は HTTP ラウンドトリップ外。** プロトコル本体はハンドシェイク（402 challenge → credential → 200）のみを規定し、決済 rail は challenge で委譲する。この分離が拡張性を作る（artemis の Collector/Strategy/Executor 分割と同じ規律）。
- **agent スケール問題に Intents が答える。** 1 分 1000 リクエストを都度オンチェーン決済すると遅延・手数料で破綻。Intents の \`authorize/subscription\` がオフチェーン voucher の交換（セッション、close 時に決済）でこれを解く。

ハンドシェイクを 1 枚で（[\`mpp-specs/README.md\`](https://github.com/tempoxyz/mpp-specs/blob/main/README.md) 準拠）:

\`\`\`mermaid
sequenceDiagram
    participant Client
    participant Server

    Client->>Server: GET /resource
    Server-->>Client: 402 Payment Required<br/>WWW-Authenticate: Payment ...

    Note over Client: Client fulfills payment challenge

    Client->>Server: GET /resource<br/>Authorization: Payment credential
    Server-->>Client: 200 OK
\`\`\`

## 具体例

サーバ側（challenge 発行 + credential 検証、rail 非依存）:

\`\`\`rust
use mpp::server::{Mpp, tempo, TempoConfig};

let mpp = Mpp::create(tempo(TempoConfig {
    recipient: "0x742d35Cc6634C0532925a3b844Bc9e7595f1B0F2",
}))?;

let challenge = mpp.charge("1")?;             // WWW-Authenticate の値を返す
let receipt = mpp.verify_credential(&credential).await?;
\`\`\`

\`Mpp::create\` は payment provider（\`tempo(...)\`/\`stripe(...)\`/自前）を引数に取り、challenge 発行と credential 検証を rail 非依存で提供する。サーバの他コードは provider 差し替えで影響を受けない。

クライアント側（402 を透過処理）:

\`\`\`rust
use mpp::client::{PaymentMiddleware, TempoProvider};
use reqwest_middleware::ClientBuilder;

let provider = TempoProvider::new(signer, "https://rpc.moderato.tempo.xyz")?;
let client = ClientBuilder::new(reqwest::Client::new())
    .with(PaymentMiddleware::new(provider))
    .build();

// 以降のリクエストは 402 が自動でハンドリングされる
let resp = client.get("https://mpp.dev/api/ping/paid").send().await?;
\`\`\`

\`PaymentMiddleware\` が reqwest クライアントをラップ、402 を受けたら challenge をパース → provider で支払い履行 → \`Authorization: Payment\` を付けて再試行。呼び出し側からは普通の \`.get().send()\` に見える。

\`tempo wallet\` CLI（3 コマンドで全フロー）:

\`\`\`bash
tempo wallet login                        # passkey ログイン、ブラウザが開く
tempo wallet fund                         # 残高をトップアップ
tempo request https://aviationstack.mpp.tempo.xyz/v1/flights?flight_iata=AA100
\`\`\`

3 番目が本丸 — 402 challenge / 署名 / 支払い / 再試行を全部実行。passkey は **スコープ付きセッションキー**（時限・上限金額・チェーンバウンド）を認可し、CLI は制限付きクレデンシャルだけを保持（root key は外に出ない）。

支払い形態:
- **One-shot（charge）** — リクエストごとに独立オンチェーン決済、セッション状態なし。単発・低頻度向け。
- **Session（channel）** — オンチェーンチャネルを 1 度開き、オフチェーン voucher をリクエストごとに交換、close 時決済。ストリーミング・反復向け（agent スケールへの解）。

## 失敗例（誤解）

「\`WWW-Authenticate: Payment\` に Tempo を埋め込めば simple」は誤り — 1 rail を Core に埋め込んだ瞬間、別 rail を使いたい人すべてからプロトコルを fork される。Stripe が MPP を共同 maintain できるのは Core が rail 中立だから（Stripe は \`methods/stripe/\` を寄贈、Core は触らない）。Lightning / ACH / 将来の rail も同形で追加。**メカニクス / ポリシー / 具体実装** の分離が rail ロックインを防ぐ。

---

ここまでで「HTTP 402 + Core/Intents/Methods 3 層 + rail 中立」は着地した。仕様は IETF ドラフト（\`draft-ryan-httpauth-payment-00\`）で、ワイヤ細部はまだ変わりうる — 全体像（402 + Payment スキーム）と Tempo/Stripe リファレンス実装を学習対象に。コードは抜粋（実行時は公式実装参照）。

> 🛑 **予測。** agent が 1 分 1000 件の有料 API リクエストを送る。都度オンチェーン Tempo tx で処理すると何が壊れるか、Intents 層はこれをどう解決するか？（答え: 都度決済は遅延・手数料で破綻（オンチェーン finality 待ち + gas）。Intents が \`charge\` と \`authorize/subscription\` を分離し、authorize はチャネルを 1 度開いてオフチェーン voucher を交換、close 時に決済。セッション単位のまとめ払いで agent スケールに対応。）

## ステップで組み立てる

### Step 1-4: 仕様 → SDK → ウォレット

1. **Core/Intents/Methods を読む**（\`tempoxyz/mpp-specs\`）— Core は HTTP メカニクスのみ、Methods が rail 固有、Intents が両者の接続。新 method 追加は Core 変更でなく \`specs/methods/\` 追加だけ。
2. **mpp-rs SDK**（\`tempoxyz/mpp-rs\`）— サーバ側 \`Mpp::create(tempo(...))\` / クライアント側 \`PaymentMiddleware\`。両者とも payment provider を差し替えるだけで rail 切り替え可能。
3. **tempo wallet CLI**（\`tempoxyz/wallet\`）— passkey ログイン → fund → \`tempo request <url>\`。one-shot vs session の使い分け、passkey 由来セッションキーの保持層と PaymentProvider を MPP middleware に渡す層の 2 つを \`ARCHITECTURE.md\` で確認。
4. **既存サービスを MPP でラップ** — L3 カスタム RPC、L6 cheatcode harness、L7 aggregator、L8 router を \`Mpp::create(tempo(...))\` で包めば、agent も人も 1 リクエストごとに支払える（請求インフラ・API キー・Stripe ポータル統合 すべて不要）。

agent 向けプロダクトの伸びしろ: 単発のフライト状況 / プライシング oracle / token 単位課金の LLM 補完 — 人間向けには小さすぎて値付けできない粒度を、agent 向け API で開く（MPP がリクエスト単位決済を安価にしているから）。

## 答え合わせ（Test gate）

ユーザを締め出すか攻撃者にダブルスペンドさせる失敗モード 2 つを潰す:

\`\`\`rust
// tests/mpp_gate.rs
use reqwest::StatusCode;

#[tokio::test]
async fn returns_402_without_payment() {
    let svc = test_endpoint().await;
    let resp = reqwest::get(svc.url("/resource")).await.unwrap();
    assert_eq!(resp.status(), StatusCode::PAYMENT_REQUIRED);

    let body: PaymentRequired = resp.json().await.unwrap();
    assert!(body.amount > U256::ZERO);
    assert_eq!(body.recipient, svc.recipient_address());
}

#[tokio::test]
async fn returns_resource_with_valid_payment() {
    let svc = test_endpoint().await;
    let receipt = make_micropayment(&svc).await;

    let resp = reqwest::Client::new()
        .get(svc.url("/resource"))
        .header("X-PAYMENT", receipt.encode())
        .send().await.unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    assert_eq!(resp.text().await.unwrap(), EXPECTED_RESOURCE_BODY);
}

#[tokio::test]
async fn rejects_replayed_payment() {
    let svc = test_endpoint().await;
    let receipt = make_micropayment(&svc).await;
    let header_value = receipt.encode();

    // 1 回目は通る
    let r1 = reqwest::Client::new()
        .get(svc.url("/resource"))
        .header("X-PAYMENT", &header_value)
        .send().await.unwrap();
    assert_eq!(r1.status(), StatusCode::OK);

    // 2 回目は失敗するはず
    let r2 = reqwest::Client::new()
        .get(svc.url("/resource"))
        .header("X-PAYMENT", &header_value)
        .send().await.unwrap();
    assert!(matches!(r2.status(), StatusCode::PAYMENT_REQUIRED | StatusCode::CONFLICT));
}
\`\`\`

3 つすべてエンドポイント local 起動で pass まで未完了（payment leg は forked Tempo testnet か anvil で）。replay テストで fail する 402 エンドポイントは URL を見つけた誰かが来るのを待っている wallet drainer。

## 合格基準

- 上記 3 テスト（402 なし / 有効支払い 200 / replay 拒否）が green。
- MPP の 3 層（Core / Intents / Methods）と各層の責務を即答できる。
- 「Stripe Checkout + API キー」では agent に提供できないもの（リクエスト単位決済 + アカウント不要 + rail ロックイン不要）を 1 文で言える。

## Drill

1. \`specs/core/draft-httpauth-payment-00.md\` の \`Payment\` スキーム 3 ヘッダフィールドを言える（45 分）。
2. \`mpp-rs\` の examples を参考に 0.01 charge する axum サーバを動かす（curl で 402、\`tempo request\` で 200）（2 時間）。
3. レッスン3 のカスタム RPC を MPP でラップ、コールごとに charge（3 時間）。
4. 有料 SSE エンドポイントに session モードで \`tempo request\`、チャネル open / voucher 交換 / 決済をトレース（1.5 時間）。
5. SDK にない rail（好きな L1 のネイティブ資産）の \`PaymentProvider\` + \`ChargeMethod\` を実装してテスト（4 時間）。

## まとめ（3行）

- MPP = HTTP 402 + \`WWW-Authenticate: Payment\` challenge + \`Authorization: Payment\` credential。アカウント不要・API キー不要・rail 非依存で、agent が pay-per-call できる protocol。
- Core（HTTP メカニクス、rail 中立）/ Intents（抽象 charge/authorize/subscription）/ Methods（rail 別実装）の 3 層分離が rail ロックインを防ぎ、新 rail は Methods 追加で済む。Stripe が共同 maintain できるのはこの構造ゆえ。
- Test gate: 402 なし / 有効支払い 200 / replay 拒否。replay 拒否のない 402 は wallet drainer。L3/L6/L7/L8 を MPP で有料化できる。

## ティア完走

「arb のアイデアがある」から「Revm が production と一致することを保証できる」+「pay-per-call で API を ship する」まで、systems engineering スタックの各層（ネットワーク / DB / VM / 認証 / 並行性）に対してエンドツーエンドで構築されテストゲートで動作証明されたアプリが少なくとも 1 つずつ揃った。**本ティアの約束が、ここで履行された。**

雇用主・プロジェクトに最も近い build を選び、production gap を埋め、小さな public リポとして公開する — それが会話に持っていく成果物。`,
                },
              ],
            },
          },
        ],
      },
    },
  });
}
