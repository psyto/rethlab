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
                  title: 'テストゲート — このティアでは全アプリがテスト green で初めて完了',
                  slug: 'building-test-gate-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 18,
                  xpReward: 35,
                  content: `# Test gate — この tier では全アプリがテスト green で初めて完了

> 🧭 **systems engineering スタックでの位置:** 本気のインフラを動かしているチームが共通して採用している **品質保証 (QA) の規律**。TigerBeetle、Cloudflare、PostgreSQL — 「読んだら正しそうだった」を答えとしている組織はひとつもない。本ティアは、あなたのアプリにも同じ基準を要求しる。

ここまでの 4 ティアは、主にソースを **読む** フェーズだった。ここからは **作る** フェーズである。

先に結論を書くと、このティアのルールは 1 つである。

- **テストスイートが green になるまで、レッスンは完了ではない。**

「読んだ」「作った」「たぶん動く」は完了条件にならない。判定は次の2択だけである。

- green
- 未完了

> 🛑 **予測。** なぜこのルールは Building (Expert) では厳しく、Foundations / Intermediate では適用されないのか? 先を読む前に仮説を立てる。

---

理由はシンプルである。

- Foundations / Intermediate は、**すでに検証済みのコードを読む** フェーズだった。
- Building は、**自分でコードを書く** フェーズになる。
- 書いたコードの正しさは、作者であるあなたが証明するしかない。

つまり、テストがなければ「正しさ」は主張にしかならない。

このレッスンが gate を設定する。続く 10 レッスンは全部、その gate を越えさせる作りになっている。

## アプリ種別ごとに「テスト済み」の最低ライン

このティアの各アプリは形が違うので、テストの形も違う。種類別の最低ラインは次の通り：

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

各行が最低ライン。実際の本番システムはこの上に fuzz、invariant、chaos テストを積みる。

## scaffold

このティアの全アプリが従う scaffold：

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

純 Rust アプリ（MEV searcher・インデクサ・ウォレットバックエンド・sponsor）は \`Cargo.toml\` + \`src\` + \`tests\` だけ。

Solidity サーフェスを持つアプリ（カスタム cheatcode・swap aggregator・capstone）は Rust と Foundry の両方のテストスイート。Solidity 側は *Foundry でテストを書く*（Fundamentals tier）で学んだもの全て — \`vm.expectRevert\`、\`vm.expectEmit\`、fork test、fuzz — をそのまま使う。

## このティア全体で再帰する 2 パターン

### パターン 1 — pin した mainnet fork

このティアのほぼ全アプリは、本物のチェーン状態に対してテストする必要がある。パターン：

\`\`\`rust
// Cargo.toml
[dev-dependencies]
alloy = { version = "...", features = ["providers"] }
revm = "..."
\`\`\`

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

pin が規律：\`PINNED_BLOCK\` はリポジトリ内の定数。変えれば全テストが新ブロックに対して再現される。pin しなければテストは非決定的になり、CI は意味を失う。

### パターン 2 — differential testing

Revm ベースのシミュレータで重視すべき正しさは、**見た目の妥当性**ではない。**同じ入力で参照実装と一致すること**である。参照は Revm 以外の provider（Geth / Erigon / Alchemy の \`debug_trace\`）を使う。

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

Differential testing はコンセンサスで定義された挙動を再実装するコードに対する gold standard。「本当に正しい?」への唯一の誠実な答えがこれ。

## 各レッスン終了時に ship するもの

Building レッスン全てについて、完了とは **公開可能な artifact** が次を備えている状態：

1. リポジトリ（Git でも local でも好きに）
2. アプリの説明を書いた \`README\`
3. 全依存を pin した \`Cargo.toml\`（適用可能なら \`foundry.toml\` も）
4. 実装が入った \`src/\`
5. 上の表の gate スイートが入った \`tests/\`
6. ローカルで再現可能に通る \`cargo test\`（適用可能なら \`forge test\`）
7. pin した mainnet fork ブロック（または fixture chain）がテストファイルに記録されている

どれか欠ければ、レッスンは未完了。**artifact と証明はセットで ship、もしくは ship しない。**

> 🛑 **1 行ゲートチェック。** Building レッスンを「完了」と主張する前に答える：*「このアプリが正しいことを示すコマンドは何で、現在の終了コードは何か?」* 1 文で答えられないなら、まだ作っていない。

## 「テストは後で書く」はなぜ危険か

よくある反論は「先にプロトタイプを作り、設計が固まってからテストを書く」である。一見合理的だが、このティアでは採用しない。

本番 EVM 工学でテストは、単なる検証手段ではない。**期待挙動を固定する実行可能仕様** である。実装後にテストを書くと、仕様が「今の実装の追認」になりやすい。逆に先にテストを書くと、仕様を実装から独立して定義できるため、実装を仕様へ合わせる設計になる。バグはこの差分から見つかる。

Reth・Revm・Foundry の開発現場では、test-first か test-alongside が前提である。実装先行で後からテストを足す流れでは、本番品質に届きにくい。**このティアはその現場基準をそのまま採用する。**

## 準備完了

次のレッスン *最小限の MEV Searcher を Rust で作る* では、まず受け入れテストを書く。実装なしで fail を確認し、その後 pass するまで実装を進める。

順序は固定である。**テストが先、コードが後。** これが gate だ。

> **🧭 ここまでで積み上げたもの:** 品質保証の規律を、本ティアの入口に据えた。TigerBeetle・Cloudflare・PostgreSQL が共通して採用している「テストで証明してから出荷する」を、本ティアの 10 アプリすべてに一律で適用する。次のレッスンから建設開始 — MEV searcher が最初、テストゲートを実装の前に置く。
`,
                },
                {
                  title: '最小限の MEV Searcher を Rust で作る',
                  slug: 'build-mev-searcher-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 45,
                  xpReward: 80,
                  content: `# 最小限の MEV Searcher を Rust で作る

> 🧭 **systems engineering スタックでの位置:** **ネットワーク層 + 並行性層** の組み合わせ。searcher は、複数のソース（mempool、新ブロック）から pull してアクションを dispatch する event-driven なパイプライン — Kafka Streams のトポロジ、Flink のジョブ、HFT のオーダーハンドリングと同じ構造。\`artemis\` は、その発想を MEV に持ち込んだもの。

「1 本の \`main.rs\` を書く」型のウォークスルーは、本番構造を隠しやすい。本物の searcher は **フレームワーク** から始める。読む対象は Paradigm の [\`artemis\`](https://github.com/paradigmxyz/artemis) である。

repo を開く。読む。本レッスンはそれを案内しる。

> 📌 **なぜこれが出発点か。** mempool 監視、swap デコード、fork シミュレーション、bundle 構築はどの searcher でも必要になる。問いは「1 回書けるか」ではなく「次の strategy 追加時に再利用できるか」である。artemis はこの再利用性に答える。MEV ロジックは自作し、オーケストレーションは借りる。

## 受け入れ条件

次のテストが pass したらレッスン完了（フルコードは末尾の §Test gate）:

1. **\`finds_known_arb_at_pinned_block\`** — 既知の arb があった pin した mainnet ブロックで、strategy が正の期待 P&L を持つ \`Action\` を吐く。
2. **\`retracts_action_on_reorg\`** — 合成 \`ChainReorged\` 通知に対し、reorg されたブロックに依存した pending \`Action\` を strategy が取り下げる。

**Test-first 読法。** 先に受け入れ条件だけ確認する。以下の walkthrough は、テスト実装に必要な型（\`Strategy<E, A>\`、\`Action::SubmitBundle\`）とパターン（forked Revm、mempool collector）を説明する。

## artemis アーキテクチャを一文で

searcher は **イベント処理パイプライン** です: 外部シグナルが入り、MEV ロジックが何をするか決め、アクションが出ていく。artemis はそのパイプラインを 3 つの trait と、それらを配線する engine に分割している。

| コンポーネント | trait | 役割 |
| :--- | :--- | :--- |
| **Collector** | \`Collector<E>\` | 外部世界 → 内部イベント \`E\`。pending tx、新ブロック、marketplace order、MEV-Share ヒント — それぞれが独自の collector を持つ |
| **Strategy** | \`Strategy<E, A>\` | イベント \`E\` → 0 個以上のアクション \`A\`。MEV の脳。opportunity ごとに自分が書く唯一のファイル |
| **Executor** | \`Executor<A>\` | アクション \`A\` → 副作用。Flashbots bundle 送信、public mempool 送信、オフチェーン注文 post |

> 🛑 **予測。** なぜ Executor と Strategy は分離されているのか。統合した場合に壊れる点を一文で答える。答えは Step 5 で確認する。

## Step 1: trait を開く

中核の抽象は 1 ファイル、~120 行: [\`crates/artemis-core/src/types.rs\`](https://github.com/paradigmxyz/artemis/blob/main/crates/artemis-core/src/types.rs)。今すぐ開いてしてほしい。

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

これが契約の全体である。メソッドは 3 つ、型パラメータは 2 つ（\`E\` がイベント、\`A\` がアクション）。engine / channel / mapper は、この契約をつなぐ配管である。

> 🔍 **リポで探す。** 同じファイル内で \`CollectorMap\` と \`ExecutorMap\` を探す。30 秒読む。**自分の言葉で:** \`CollectorMap\` は、新しい Collector を書かないと解けない問題を、何を解いてくれているか?

## Step 2: イベントの流れ — engine を読む

[\`crates/artemis-core/src/engine.rs\`](https://github.com/paradigmxyz/artemis/blob/main/crates/artemis-core/src/engine.rs) を開く。\`Engine<E, A>\` は collector / strategy / executor の 3 系統を保持する。\`run\` は各コンポーネントを Tokio task として起動し、2 本の \`broadcast\` channel で接続する。

\`\`\`
collectors -- events --> [event channel] -- events --> strategies
                                                          |
                                                         actions
                                                          v
executors <-- actions <-- [action channel] <-- actions <--+
\`\`\`

broadcast なので、全 strategy が全イベントを受け取り、全 executor が全アクションを受け取る。不要なものは strategy 側で \`vec![]\`、executor 側で \`ExecutorMap\` により捨てる。

**要点:** 新しい strategy を ship するには \`impl Strategy\` を 1 つ書いて \`engine.add_strategy(...)\` を呼ぶだけ。collector と executor は再利用される。

> 🛑 **リコールチェックポイント。** スクロールせずに: strategy 間の調整ロジックはどこにあるか? (答え: ない。engine は調整しない。必要なら collector を組み合わせ、単一 strategy 内で調整する。)

## Step 3: 実物の Collector と Executor を探す

抽象を確認したら実装を読む。以下を開いて目を通す。

- [\`crates/artemis-core/src/collectors/\`](https://github.com/paradigmxyz/artemis/tree/main/crates/artemis-core/src/collectors): \`mempool_collector.rs\` (pending tx を subscribe)、\`block_collector.rs\` (新 head)、\`mevshare_collector.rs\` (private hint stream)、\`opensea_order_collector.rs\` (NFT marketplace)、\`log_collector.rs\` (フィルタ済みログ subscription)。
- [\`crates/artemis-core/src/executors/\`](https://github.com/paradigmxyz/artemis/tree/main/crates/artemis-core/src/executors): \`mempool_executor.rs\` (public 送信)、\`flashbots_executor.rs\` (Flashbots relay へ bundle)、\`mev_share_executor.rs\` (MEV-Share 提出)。

各ファイルは小さい — 約 50〜100 行。特に \`mempool_collector.rs\` を開く:

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

これが mempool collector の全体である。\`transactions_unordered(256)\` で tx 本体を並列取得する。重要なのは「書かれていないもの」で、MEV ロジック、デコード、strategy 固有処理は含まれない。collector の役割は型付きストリーム供給に限定される。

## Step 4: 実物の Strategy — opensea-sudo-arb

ここから strategy 本体を見る。[\`crates/strategies/opensea-sudo-arb/\`](https://github.com/paradigmxyz/artemis/tree/main/crates/strategies/opensea-sudo-arb) は同梱唯一の strategy で、OpenSea と Sudoswap の間の NFT アービトラージを扱う。

重要なファイルは 2 つ:

- [\`src/types.rs\`](https://github.com/paradigmxyz/artemis/blob/main/crates/strategies/opensea-sudo-arb/src/types.rs) — この strategy 固有の \`Event\` / \`Action\` enum を定義。
- [\`src/strategy.rs\`](https://github.com/paradigmxyz/artemis/blob/main/crates/strategies/opensea-sudo-arb/src/strategy.rs) — \`impl Strategy<Event, Action> for OpenseaSudoArb\`。

\`Event\` はこれだけ:

\`\`\`rust
pub enum Event {
    NewBlock(NewBlock),
    OpenseaOrder(Box<OpenseaOrder>),
}
\`\`\`

入力源は 2 つだけで、block collector と OpenSea order collector である。

\`process_event\` の本体が **MEV 判断のすべて**:

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

\`process_order_event\` は、新規出品に対して Sudoswap 側の有利価格を探索し、成立するなら \`Action::SubmitTx\` を返す。

\`process_new_block_event\` は、ブロックログから Sudo プール状態を更新する。ここではアクションを出さず、内部 state を保守する。

> 🔍 **リポで探す。** 同じ \`strategy.rs\` 内で \`sync_state\` を探す。読む。**予測:** なぜこの strategy は開始前に「これまでに deploy された全 Sudo プール」を列挙する必要があるのか? 飛ばすと何が壊れる?

アービ本体は別の Solidity ファイル（[\`contracts/src/SudoOpenseaArb.sol\`](https://github.com/paradigmxyz/artemis/blob/main/crates/strategies/opensea-sudo-arb/contracts/src/SudoOpenseaArb.sol)）にある。strategy は機会検出と calldata 構築を担い、原子的な売買実行はコントラクト側が担う。

## Step 5: Step 1 の予測に答える

**なぜ Executor を Strategy から分離するのか。** 同じ opportunity でも提出先は複数ある（public mempool / Flashbots / MEV-Share）。\`Action\` を出して executor を差し替えられる設計なら耐障害性が上がる。提出処理を strategy に直書きすると、提出先障害で全体が止まる。

trait の分割は理論的な綺麗さではない — **MEV ロジックを触らずに提出経路を入れ替えるため** の構造。

> 🛑 **予測。** opensea-sudo-arb strategy に対して private mempool collector (例: Chainbound の Fiber、bloXroute) を足すなら、どこに足す? *具体的に:* どの trait を実装し、何を emit し、\`strategy.rs\` の何を (もしあれば) 変えるか?

(答え: \`Collector<OpenseaOrder>\` か \`CollectorMap\` 経由の \`Collector<Event>\` を実装して engine に登録する。 \`strategy.rs\` の変更は不要。これが分離設計の効果である。)

## Step 6: 読みから出荷へ — 自分の bot

artemis で 2-hop Uniswap アービ searcher を出す場合の最小手順:

1. **再利用:** pending swap に \`MempoolCollector\`、新 head に \`BlockCollector\`、\`FlashbotsExecutor\` (または対象 レッスン1の bundle エンドポイント相当)。全部そのまま。
2. **書く:** \`Event = { NewBlock, PendingTx }\` / \`Action = { SubmitBundle }\` を持つ \`UniArbStrategy\` を 1 つ。\`process_event\` の \`PendingTx\` 分岐: swap をデコード、Revm で fork シミュレート、クロスプール spread を検出、bundle を構築。\`NewBlock\` 分岐: reserve cache をリフレッシュ、古くなった opportunity を捨てる。
3. **配線:** \`engine.add_collector(...)\` ×2、\`engine.add_strategy(UniArbStrategy::new(...))\`、\`engine.add_executor(...)\`、\`engine.run().await\`。

MEV ロジックの実装面積は 1 ファイルに集中し、周辺は再利用できる。

## 正直な比較 — artemis vs subway

artemis は README の [Acknowledgements](https://github.com/paradigmxyz/artemis/blob/main/README.md#acknowledgements) で系譜を明示している（[\`subway\`](https://github.com/libevm/subway)、\`subway-rs\`、\`rusty-sando\`）。これらは完成品寄りの MEV bot で、対象戦略が明確である。

一方 artemis は **フレームワーク** で、例 strategy は 1 つだけである。subway が「何を走らせるか」を示すのに対し、artemis は「どう構成するか」を示す。

| | subway | artemis |
| :--- | :--- | :--- |
| **形** | turnkey サンドイッチ bot | フレームワーク + 例 strategy 1 つ |
| **言語** | TypeScript | Rust |
| **カスタマイズ** | fork して書き換え | trait を実装 |
| **自分が用意するもの** | API キー、資本 | MEV ロジック、資本 |
| **正解な状況** | サンドイッチを今日、学習素材として欲しい | まだ世にない strategy を ship したい |

このレッスンを読んでいるあなたは後者を ship する側。artemis はあなたの足場。

## リコールチェックリスト

次のレッスンに進む前に、スクロールせずに以下に答えられることを確認:

1. artemis の 3 つの trait の名前と、それぞれが何を入力 / 出力するか。
2. strategy 間の調整ロジックはコードベースのどこにあるか? (引っ掛け — Step 2 参照。)
3. なぜ Action enum はフレームワーク全体ではなく strategy 単位なのか?
4. \`opensea-sudo-arb\` で \`process_new_block_event\` は \`process_order_event\` がやらないことを何をするか?
5. 提出を public mempool から Flashbots に切り替えるとき、Strategy 実装の何を変えるか? (答え: 何も変えない。登録する Executor だけを切り替える。)

2 と 4 で詰まったら、次のレッスンに行く前に Step 2 と Step 4 を読み直し。

## Drill

1. **新しい strategy を紙で設計する。** 実在の MEV opportunity を 1 つ選び、必要な \`Event\` / \`Action\` と再利用する collector / executor を列挙する。(30 分)
2. **1 イベントを end-to-end で追う。** pending tx 受信から \`SubmitTxToMempool\` 実行までの \`.await\` ポイントを列挙する。(45 分)
3. **collector を移植する。** [\`crates/artemis-core/src/collectors/\`](https://github.com/paradigmxyz/artemis/tree/main/crates/artemis-core/src/collectors) から 1 つ選び、\`ethers-rs\` 版を Alloy 1.x へ置き換える。trait シグネチャは維持する。(2 時間)
4. **run loop を読む。** \`engine.rs\` の \`run\` を再読し、collector \`A\` のイベントが strategy \`B\` に届く経路（channel 型と receiver）を答える。(30 分)
5. **スタブ strategy を載せる。** \`Strategy<Event, Action>\` を実装した最小モジュールを追加し、\`MempoolCollector\` + no-op executor で起動するバイナリに配線して \`cargo run\` する。(3 時間)

Drill 5 まで終えれば、任意の MEV ロジックを差し込める artemis ベース searcher の骨組みが手元に残る。

> 🛑 **最終チェック。** 一文で答える: なぜ一発書きの \`main.rs\` ではなく artemis を使うのか。答えに *strategy 再利用* か *提出経路の差し替え* が入らない場合は Step 5 を再読する。

## Test gate

*Test gate* に従い、本レッスンの最低ラインは drill 5 のスタブ strategy に対する次の 2 テストである。

1. **Forked-state 機会再現。** 既知の arb ブロックを pin し、\`AlloyDB\` バック Revm 上で strategy を実行する。正の期待 P&L を持つ \`Action\` が出ることを assert する。
2. **Reorg 整合性。** 合成 \`ChainReorged\` 通知を流し、reorg 対象ブロックに依存する pending \`Action\` が取り下げられることを assert。（reorg 無視は典型的な本番障害である。）

スケッチ：

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

両方が green になるまでレッスンは **未完了**。mainnet で \`cargo run\` できても \`cargo test\` が通らなければ、まだ deliverable ではない。

## 📺 関連動画

\`\`\`youtube
vCCYFSAdCFo | Understanding MEV — Georgios Konstantopoulos, Dan Robinson, Hasu (Paradigm)
\`\`\`


---

## このティアの先

**Building with the Stack** ティアは 10 lesson 全部 ship 済み。ここから:

- **L2** — Reorg-aware Postgres indexer (ExEx 駆動、in-process)
- **L3** — \`extend_rpc_modules\` 経由のカスタム RPC エンドポイント
- **L4** — Wallet backend (signer pool + nonce manager + replace-on-stuck)
- **L5** — EIP-7702 sponsor service (Type 4 tx + paymaster パターン)
- **L6** — Foundry スタイル cheatcode (custom precompile + 最小ハーネス)
- **L7** — Swap aggregator (Revm fork + 横断 venue クオート)
- **L8 (Capstone)** — 上記すべてを統合する frontrun-resistant order router
- **L9** — Validate-revm クロスクライアントハーネス (production provider と比較)
- **L10** — HTTP 402 / MPP machine-payments エンドポイント (Tempo の payments スタック)

各々が自己完結した 約 200〜300 行の build、同じ predict / find-in-repo / anti-fluency スタイル。ターゲットユースケースに合うものから選ぶ。

> **🧭 ここまでで積み上げたもの:** **ネットワーク層 × 並行性層** のアプリケーションを出荷した — event-driven なパイプライン（artemis の collector → strategy → executor）を MEV に当てはめ、テストゲート（forked-state arb の再現 + reorg 整合性）で正しさを担保。Kafka Streams や HFT の order handler が動かしているのと同じ構造。次のレッスンでは **DB 層** に移る: ExEx 駆動の reorg-aware なインデクサ。
`,
                },
                {
                  title: '本物の Production Indexer を読む — Tempo の tidx',
                  slug: 'build-exex-indexer-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 45,
                  xpReward: 80,
                  content: `# 本物の Production Indexer を読む — Tempo の tidx

> 🧭 **systems engineering スタックでの位置:** **DB 層**、とくに OLTP + OLAP のデュアルストレージ設計。要点は、point lookup と range scan を同じエンジンに無理に載せないこと。 \`tidx\` はこの発想をチェーンデータへ適用した実例である。

Etherscan や Dune も indexer だが、内部設計は公開されない。[\`tidx\`](https://github.com/tempoxyz/tidx) は公開実装で、Tempo の EVM レッスン1で実運用されている。本レッスンでは、このコードから設計判断とトレードオフを読む。

リポを開く。読む。本レッスンはそのガイド。

> 📌 **なぜこの出発点か。** 本番で壊れるのは、異なるクエリ形が同時に来る瞬間である。  
> 例: 「アドレス X の最新 10 件」（point lookup）と「過去 1 年の日次集計」（range scan）。  
> \`tidx\` は両バックエンドへ並列書き込みし、読み取り時に振り分ける。ここが本レッスンの主題である。

## 受け入れ条件

次のテストが pass したらレッスン完了（フルコードは末尾の §Test gate）:

1. **\`replays_committed_then_reverted\`** — N..N+5 を適用後 N+3..N+5 を reorg。各 height で PG の導出状態が golden reference と一致する。
2. **\`idempotent_under_replay\`** — 同じ通知を 2 回流しても no-op になる（クラッシュ復旧シナリオ）。

**Test-first 読法。** 先に受け入れ条件を確認する。以下では、テストに必要な fixture 入力、dual-sink アーキテクチャ、\`Notification::ChainCommitted\` / \`ChainReverted\` の形を整理する。

## OLTP vs OLAP の設計テンション、具体に

PostgreSQL の row store は、point lookup に強い。  
ClickHouse の column store は、広い期間集計に強い。  
\`tidx\` は両者を併用し、クエリ特性に合わせて使い分ける。

それぞれに相手の質問をすると死ぬ:

- PostgreSQL に *「過去 1 年の日次 volume」*: その範囲に Transfer を含む全ページの全行を read。ディスク律速。実データセットで数十秒〜数分。
- ClickHouse に *「0xAlice からの最新 10 件」*: ClickHouse には point-lookup index がない; スキャンする。答えが 10 行のためのムダ IO。

> 🛑 **予測。** PostgreSQL だけの場合と ClickHouse だけの場合で、indexer を壊すクエリを 1 つずつ挙げる。後続ではこの弱点を tidx がどう回避するかを見る。

tidx の解は単純で、**両方に書き、read で振り分ける**。API は自動選択か \`?engine=\` 指定でエンジンを決める。

## Step 1: Dual Sink — 1 つの reader、2 つの write

[\`src/sync/sink.rs\`](https://github.com/tempoxyz/tidx/blob/main/src/sync/sink.rs) を開く。「2 回書く」抽象が ~120 行で全部入っている:

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

ポイント:

- **\`tokio::try_join!\`** — PG と CH へ同時書き込みする。待ち時間は概ね \`max(pg, ch)\` になる。
- **整合性モデルが違う。** PG は 4 テーブルを 1 トランザクションで書く。CH は append-only のため、部分失敗時は retry（[\`src/sync/ch_sink.rs\`](https://github.com/tempoxyz/tidx/blob/main/src/sync/ch_sink.rs)）で回復する。
- **CH は任意。** 未設定なら PG-only で動作し、OLAP だけが無効になる。

> 🛑 **予測。** dual-sink で \`write_all\` はどこまで順序を保証するか。ブロック N が PG にだけあり CH にない状態は起こり得るか。 \`try_join!\` の意味を前提に答える。

(答え: 起き得るが短時間である。 \`try_join!\` は両成功時に return するため、途中で CH を先に読むと古い値を見うる。tidx はこれを許容し、\`ch_backfill_block\` で後から埋める。)

## Step 2: Sync Engine — 1 つの fetcher、ファンアウト

[\`src/sync/engine.rs\`](https://github.com/tempoxyz/tidx/blob/main/src/sync/engine.rs) を開く。Engine はチェーンを *1 回* 読んで、結果を \`SinkSet::write_all\` に渡す。構造体フィールドを読む:

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

RPC client を 2 本に分ける理由は、realtime と backfill の性質が違うためである。前者は低遅延重視、後者は帯域消費型。共有すると backfill が realtime を詰まらせる。分離により並行度予算を個別に管理できる（\`REALTIME_RPC_CONCURRENCY\` と \`BACKFILL_RPC_CONCURRENCY\`）。

> 🔍 **リポで探す。** 同じファイルで \`backfill_first\` と \`trust_rpc\` を見つける。それぞれ 30 秒ずつ読む。**自分の言葉で:** \`backfill_first\` はノード起動の何を変えるか? \`trust_rpc\` は何をオプトアウトするか?

## Step 3: スキーマ — 同じデータ、2 つの形

ここで OLTP/OLAP の二重性が抽象でなくなる。両方を並べて開く:

- PostgreSQL: [\`db/blocks.sql\`](https://github.com/tempoxyz/tidx/blob/main/db/blocks.sql), [\`txs.sql\`](https://github.com/tempoxyz/tidx/blob/main/db/txs.sql), [\`logs.sql\`](https://github.com/tempoxyz/tidx/blob/main/db/logs.sql), [\`receipts.sql\`](https://github.com/tempoxyz/tidx/blob/main/db/receipts.sql)
- ClickHouse: [\`db/clickhouse/blocks.sql\`](https://github.com/tempoxyz/tidx/blob/main/db/clickhouse/blocks.sql), [\`txs.sql\`](https://github.com/tempoxyz/tidx/blob/main/db/clickhouse/txs.sql), [\`logs.sql\`](https://github.com/tempoxyz/tidx/blob/main/db/clickhouse/logs.sql), [\`receipts.sql\`](https://github.com/tempoxyz/tidx/blob/main/db/clickhouse/receipts.sql)

カラムは同じだが、エンジンと索引戦略が異なる。PG は point lookup 向け、CH は時系列スキャン向けに最適化される。

また、\`txs\` / \`logs\` / \`receipts\` は \`block_timestamp\` を非正規化で持つ。狙いは JOIN 削減で、分析クエリの実行コストを下げることにある。

> 🔍 **リポで探す。** [\`db/logs.sql\`](https://github.com/tempoxyz/tidx/blob/main/db/logs.sql) と [\`db/clickhouse/logs.sql\`](https://github.com/tempoxyz/tidx/blob/main/db/clickhouse/logs.sql) を両方開く。片方にあり片方にないカラムまたは index を 1 つ特定。**自分の言葉で:** それぞれが最適化しているクエリクラスは何か?

## Step 4: Lazy event decoding — キモの設計判断

多くの indexer は event の事前登録を要求する。tidx は要求しない。\`logs\` には生バイト（\`selector/topics/data\`）を保持し、デコードはクエリ時に行う。

[\`src/query/parser.rs\`](https://github.com/tempoxyz/tidx/blob/main/src/query/parser.rs) を開く。\`EventSignature::parse\` は \`Transfer(address indexed from, address indexed to, uint256 value)\` のような文字列を受け取って:

1. ABI param 型をパース
2. \`topic0 = keccak256("Transfer(address,address,uint256)")\` を計算
3. \`logs\` を \`selector = topic0\` でフィルタしデコード済みフィールドを名前付きカラムとして射影する CTE を router が **合成** するための \`EventSignature\` を返す

ユーザの SQL はその event 名をテーブルとして参照できる:

\`\`\`bash
tidx query \\
  --signature "Transfer(address indexed from, address indexed to, uint256 value)" \\
  "SELECT * FROM Transfer WHERE from = '\\\\xAlice...' LIMIT 10"
\`\`\`

代償: 永遠に全コントラクトの全ログを保存する。Subgraph 方式の「これらのコントラクトだけ index する」と比べて生バイトで 約 5〜10 倍。

得るものは、事前登録なしで新しい質問へ即応できること。代償は保存量増加だが、tidx はこの交換を採用する。

> 🛑 **理解度チェック。** なぜ tidx は Subgraph の事前登録を不要にできるのか。両者で ABI デコードが起きる場所の違いを説明する。

## Step 5: Query routing — engine 選択

[\`src/query/router.rs\`](https://github.com/tempoxyz/tidx/blob/main/src/query/router.rs) を開く。エンジン選択の契約はこれだけ:

\`\`\`rust
pub enum QueryEngine {
    ClickHouse,  // OLAP
    Postgres,    // OLTP
}
\`\`\`

エンジン 2 つ。HTTP API ([\`/query\`](https://github.com/tempoxyz/tidx/tree/main/src/api)) はオプションの \`?engine=\` パラメータを受け取る; 省略すれば router が選ぶ。README の例:

- \`SELECT * FROM blocks WHERE num = 12345\` → point lookup → PG。
- \`SELECT type, COUNT(*) FROM txs GROUP BY type\` → 集計 → CH。

振り分けは魔法ではなくヒューリスティックである。用途が明確な場合、実運用では \`?engine=\` で明示指定する。エンジン分離が本質で、自動振り分けは利便機能にすぎない。

## Step 6: Materialized views — CH 上の事前計算 analytics

[\`src/api/views.rs\`](https://github.com/tempoxyz/tidx/blob/main/src/api/views.rs) を開く。ClickHouse の materialized view は、read 時ではなく insert 時に集計を更新する。tidx はこれを HTTP API で管理する。

\`\`\`bash
curl -X POST "https://tidx.example.com/views" -d '{
  "chainId": 4217,
  "name": "top_holders",
  "sql": "SELECT token, holder, sum(balance) AS balance
          FROM token_balances GROUP BY token, holder HAVING balance > 0",
  "orderBy": ["token", "holder"]
}'
\`\`\`

\`POST /views\` で CH は 3 つ行う。ターゲットテーブル作成、materialized view 作成、既存データの backfill。以後は新規 insert ごとに増分更新され、\`SELECT *\` は重い再集計を避けられる。

認可は \`POST/DELETE\` のみ制限する。\`trusted_cidrs\`（例: Tailscale）からの接続を要求し、read は公開、write/admin は閉じる。

> 🔍 **リポで探す。** [\`views.rs\`](https://github.com/tempoxyz/tidx/blob/main/src/api/views.rs) で \`require_admin_mutation\` を見つける。trusted IP *かつ* \`x-tidx-admin: 1\` ヘッダの両方を要求していることに注意。**なぜ両方?** (Defense in depth — IP は誤設定されたネットワーク内ではスプーフできる; ヘッダは安価な 2 段目のチェック。)

## Step 7: Sync アーキテクチャ — Realtime + Gap Sync

README の [Sync Architecture](https://github.com/tempoxyz/tidx/blob/main/README.md#sync-architecture) は 2 つの並行ループを示す:

- **Realtime** はチェーン head を追って ~0 lag を維持。
- **Gap Sync** は不連続を検出し、最新から最古に向かって埋める。

Gap sync が最新優先なのは、利用頻度の高い新しいデータを先に整えるためである。\`sync_state\` は \`head_num / tip_num / synced_num / backfill_num\` の 4 カーソルを管理し、2 ループの干渉を防ぐ。

## Step 8: 読みから書きへ — 自分の indexer

独自チェーン向けに tidx を採用する道は 2 つある。

**そのまま採用。** Ethereum JSON-RPC を話すなら、\`rpc_url\` を変えて \`tidx up\` で動く。テーブルはチェーン非依存で、\`chain_id\` はデータ列として扱う。

**Fork。** 独自フィールド（fee payer、独自 trace など）が必要なら、次の 3 箇所を拡張する:

1. \`db/*.sql\` と \`db/clickhouse/*.sql\` — チェーン固有の追加カラム
2. \`src/sync/decoder.rs\` — 各 block / tx / receipt から追加フィールドを抽出
3. \`src/types.rs\` — decoder から sink に流れる \`*Row\` struct を拡張

通常は sync engine、dual sink、query router、views API はそのまま使える。主な変更点はデータ定義側に寄る。

## tidx vs Subgraph / Goldsky — 正直な比較

| | tidx | Subgraph / Goldsky |
| :--- | :--- | :--- |
| **ホスティング** | セルフホスト (PG + CH を自分で運用) | マネージドサービス |
| **定義** | SQL schema + on-the-fly ABI | Subgraph manifest + AssemblyScript handler |
| **事前登録** | なし — どの event でも signature で query | 必須 — manifest で全 event 宣言 |
| **ストレージコスト** | 高い (生 log を永続保存) | 低い (宣言された event のみ) |
| **クエリ I/F** | SQL + REST | GraphQL |
| **OLAP クエリ** | ネイティブ (ClickHouse) | 一般に弱い / export 必要 |
| **正しい選択になるとき** | データを所有し、SQL を使い、熱い OLAP クエリを走らせる | zero-ops、GraphQL-native、event スコープが宣言済み |

どちらが厳密に良いというわけではない。tidx は indexed chain data を **自分のデータベース** として扱う場合 (OLAP scan が重要なとき) の選択; マネージドサービスは「チェーンデータの上の API」で十分で運用キャパが制約のときの選択。

## Recall チェックリスト

次に進む前に、スクロールせずに以下に答えられるか確認:

1. PostgreSQL が殺すクエリクラスを 1 つ; ClickHouse が殺すクエリクラスを 1 つ挙げよ。
2. PG と CH の書き込みが単一の sync ステップからファンアウトするのはコードのどこか? (ファイル + 関数)
3. なぜ tidx は sync engine で別々の RPC client を 2 つ使うのか?
4. なぜ tidx は Subgraph が要求する event 事前登録をスキップできるのか? (ABI デコードはどこで起きる?)
5. Materialized view が ad-hoc な \`GROUP BY\` query にない何を買ってくれるのか?
6. 新チェーンのカスタム tx フィールド向けに tidx を fork するとして、触る 3 ファイルを挙げよ。

3、4、6 でつまずいたら、次のレッスンに進む前に Step 2、4、8 を読み直し。

## Drill

1. **Dual sink をマップ。** [\`sink.rs\`](https://github.com/tempoxyz/tidx/blob/main/src/sync/sink.rs) を開く。\`try_join!\` 内で \`writer::write_batch\` (PG) が成功して \`ch.write_blocks\` が失敗したら何が起きるかをトレース。PG トランザクションは roll back する? 次の sync iteration は何をする? (30分)
2. **Routing rule を見つける。** [\`src/query/router.rs\`](https://github.com/tempoxyz/tidx/blob/main/src/query/router.rs) と周囲の \`mod.rs\` を開く。\`?engine=\` パラメータなしのクエリがどう振り分けられるかを正確に特定。常に PG? 常に CH? ヒューリスティック? 1 文でルールを書け。(45分)
3. **両方のスキーマにカラム追加。** 1 つ選ぶ — 例えば L2 用途の per-tx \`l1_origin\` フィールド。\`db/txs.sql\`、\`db/clickhouse/txs.sql\`、\`src/types.rs\` の \`TxRow\` struct、そして decoder に追加。\`cargo build\` を通す。(2時間)
4. **Materialized view を定義。** 実 analytics 質問を 1 つ選ぶ (送信数 top 100、日次アクティブアドレス、出来高 top トークンなど)。\`POST /views\` ボディを書く。CH が推定するスキーマを確認。(1時間)
5. **公開チェーンに対して走らせる。** \`tidx init\`、\`rpc_url\` を free な Tempo または testnet エンドポイントに向ける、\`tidx up\`、\`tidx status --watch\` で realtime が追いつくのを見る。Query する。(1時間)

Drill 5 を終えると、両エンジンで実チェーンを index する稼働中の tidx を得られる。

> 🛑 **最終チェック。** 一文で答える: tidx の dual-storage は単一 DB に対して何を増やすか。答えに *point lookup レイテンシ* と *analytics スキャンスループット* の両方が入らなければ冒頭を再読する。

## Test gate

*Test gate* に従い、本レッスンの最低ラインは **fixture chain replay** である。既知の \`ChainCommitted\` / \`ChainReverted\` 列を流し、PG（CH を使う場合は CH も）の導出状態が golden reference と一致することを assert する。

reorg ケースは必須である。\`ChainCommitted\` だけ処理する indexer は reorg で状態を壊す。\`ChainReverted\` が実際に巻き戻すことをテストで証明する。

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

fixture は \`tests/fixtures/\` に \`ExExNotification\` をシリアライズして置く（\`reth\` ヘルパか実ノードキャプチャを利用）。2 テストが green で CI が常時回るまで、レッスンは **未完了**。

## 📺 関連動画

\`\`\`youtube
GhEhzE9SFqY | Alexey Shekhirin — Using Reth Execution Extensions for next generation indexing (Devcon 2024)
\`\`\`

> **🧭 ここまでで積み上げたもの:** **DB 層** のアプリを出荷した。tidx の dual-storage 設計を読み、fixture replay で reorg 安全性まで確認した。次は **ネットワーク層** に移り、\`extend_rpc_modules\` でサーバサイド RPC を拡張する。
`,
                },
                {
                  title: 'Reth にカスタム RPC エンドポイントを足す',
                  slug: 'build-custom-rpc-ja',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 40,
                  xpReward: 70,
                  content: `# Reth にカスタム RPC エンドポイントを足す

> 🧭 **systems engineering スタックでの位置:** **ネットワーク層のサーバサイド拡張**。RPC を公開しているデータベースやサービスが共通して直面する問題 — 「クライアントに生のデータをラウンドトリップさせる代わりに、サーバ側で走るカスタムクエリを足せるようにする」。PostgreSQL のストアドプロシージャ、GraphQL のカスタムリゾルバ、gRPC のサービス拡張 — いずれも同種の問題。Reth のカスタム RPC は、その解法を Ethereum の execution client に持ち込んだもの。

fee-bidding bot のために、pending tx の gas price ヒストグラムを 1 回の API 呼び出しで返してほしい。標準の \`txpool_content\` は *pending tx を全部フルで* 返す — 結局 10 個の数字にまとめるのに、数百 KB を転送することになる。正解の動きは、**ノード内で**集計してヒストグラムだけ返す独自メソッドを追加すること。Rust ~50 行。Reth fork なし。ネイティブネームスペース (\`eth_*\`、\`net_*\`、\`debug_*\`、\`txpool_*\` ...) と同じ HTTP / WebSocket / IPC エンドポイントで動き出す。

> 📌 **スコープ。** 読み取り専用メソッド \`txpoolPlus_pendingByGasBucket\` を 1 つ追加する。認証、レート制限、書き込み系は対象外。学習対象は trait 組み込みの骨格である。

> 📚 **参考。** [QuickNode の *How to Build Custom RPC Methods with Reth*](https://www.quicknode.com/guides/infrastructure/build-custom-rpc-methods-with-reth) はカスタム RPC trait 登録の基礎をカバー。ここではそれを土台に、サーバーサイド集計、subscription バリアント、本物のカスタム RPC が埋めるべき production gap まで構築する。

## 受け入れ条件

次のテストが pass したらレッスン完了（フルコードは末尾の §Test gate）:

1. **\`returns_buckets_for_known_state\`** — ノードをインプロセス起動、fixture tx で mempool を seed、\`txpoolPlus_pendingByGasBucket\` を HTTP で呼び出し、bucket 数と合計 tx 数を assert。
2. **\`rejects_invalid_bucket_count\`** — 不正パラメータは正しい JSON-RPC エラーコード（\`-32602\` Invalid params、\`-32603\` Internal error ではない）を返す。
3. **\`subscription_does_not_leak_on_disconnect\`** — subscription を開く → クライアントを drop → spawn したタスクが終了することを assert。

**Test-first 読法。** 先に受け入れ条件を確認する。以下では、テストが使う trait 登録、パラメータ処理、subscription パターンを示す。

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

> 🛑 **予測。** なぜサーバーサイド集計が有利か。 \`txpool_content\` の返却内容とダッシュボードの必要データを、ペイロードサイズの観点で一文で答える。

## なぜカスタム RPC か (workaround との比較)

| 方式 | レイテンシ | ペイロード | 労力 |
| :--- | :--- | :--- | :--- |
| **\`txpool_content\` を呼んでクライアント側で集計** | RPC ラウンドトリップ + 全 tx 転送 | 数百 KB | 簡単 |
| **mempool を subscribe する外部 indexer** | µs/query (in-mem) | 小 | glue + 運用に数日 |
| **カスタム RPC メソッド** | µs (in-process スナップショット) | bytes | 1 回 ~50 行 |

カスタム RPC はスイートスポットに位置する: indexer 並みのレイテンシ、集計後のペイロード、Rust 数ページの労力。**しかもノードの一部として出荷される** — 別サービスなし、別デプロイなし、ポート開放なし。

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

> Reth の RPC は \`jsonrpsee\` で構成される。カスタムメソッドは別サーバを立てず、\`extend_rpc_modules\` で既存サーバへ登録する。

## Step 1: RPC trait を定義

\`jsonrpsee\` は trait から RPC 配管を生成する手続きマクロを使う。trait の形を書けば、マクロが server stub、client stub、JSON シリアライズを派生させる:

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

ポイント:

- **\`#[rpc(server, namespace = "txpoolPlus")]\`** — \`TxpoolPlusApiServer\` を生成する。\`#[method]\` と合わせて wire 名は \`txpoolPlus_pendingByGasBucket\` になる。
- **\`RpcResult<T>\`** — JSON-RPC エラー形式を保ったまま返せる。
- **\`Serialize\`** — 戻り値構造体に付ければ JSON 化できる。

> 🔍 **リポで探す。** [\`reth-rpc-api\`](https://github.com/paradigmxyz/reth/tree/main/crates/rpc/rpc-api) を開き、ネイティブ API trait の \`#[rpc(...)]\` 宣言を確認する。自作 trait と同じ構造であることを比較する。

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

ポイント:

- **\`Pool: TransactionPool\`** — 具体プール型を固定せずに使える。
- **\`pool.pending()\`** — pending tx のスナップショットを読む。
- **\`max_priority_fee_per_gas\`** — 今回は priority fee のみで集計する。
- **計算量** — \`O(buckets * pending)\`。通常サイズでは十分高速。

> 🛑 **理解度チェック。** なぜ \`pool.pending()\` は軽く、\`txpool_content\` RPC は重いのか。返却データと wire 変換の差で説明する。

## Step 3: NodeBuilder に組み込む

ここが統合点。ノードビルダーは \`extend_rpc_modules\` を公開していて、context (pool, provider, network handle, ...) とモジュールレジストリへの mut handle を渡してくれる:

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

ポイント:

- **\`Cli<...>::parse()\`** — 標準 CLI に独自フラグを追加できる。
- **\`extend_rpc_modules\`** — 起動時に 1 回実行され、pool などのコンテキストを受け取る。
- **\`merge_configured(ext.into_rpc())\`** — 生成した RPC モジュールを既存トランスポート（HTTP/WS/IPC）へ登録する。

> 🔍 **リポで探す。** [\`reth/examples/node-custom-rpc\`](https://github.com/paradigmxyz/reth/tree/main/examples/node-custom-rpc) を開き、自作実装と並べて比較する。差分は namespace / メソッド名 / ハンドラ内部に限られる。

## Step 4: cast でテスト

ビルド、起動、クエリ:

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

メソッドはどの RPC クライアントから見てもネイティブと区別がつかない。**同じ認証、同じレート制限 (設定していれば)、同じロギング。** それが \`extend_rpc_modules\` の約束。

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

ポイント:

- **\`PendingSubscriptionSink\` → \`accept().await\` → \`sink.send(...)\`** — \`jsonrpsee\` 標準の subscription handshake。
- **クロージャは \`tokio::spawn\` で走る** — RPC ハンドラは即 return し、実際のストリーミングはバックグラウンドタスクが担当。**ここでブロックすると RPC サーバスレッドが停止する。**
- **\`sink.send(...).is_err()\`** — クライアント切断もしくは channel フル。クリーンに return してタスクを終了させる。**subscription のリークなし。**

これでダッシュボードが \`eth_subscribe("txpoolPlus_subscribeBuckets", [10])\` で 10 秒ごとのライブヒストグラムをサーバ側集計済みで受け取れる。

## Production に足りないもの

| ギャップ | 本物のカスタム RPC が何をしているか |
| :--- | :--- |
| **認証** | engine API と同じ \`AUTH_SECRET\` 機構。Reth が \`extend_rpc_modules\` 経由で自動的に組み込むが、メソッドが尊重しているかは確認すべき (大半の \`ctx\` accessor は尊重する) |
| **レート制限** | Reth はメソッド単位のレート制限を同梱しない。production では \`tower\` ミドルウェアでラップするか、impl 内で閾値超過を拒否する |
| **クライアント単位の状態** | subscription はデフォルトで接続単位。クライアント間調整 (例: 共有キャッシュ無効化) には impl struct 内で \`Arc<RwLock<...>>\` |
| **Self-hosted Reth 運用** | Reth を自分で動かしたくない場合、[QuickNode Dedicated Clusters](https://www.quicknode.com/guides/infrastructure/node-setup/how-to-run-a-reth-node) で Reth を execution client として選択し、自前のカスタム RPC バイナリを付加価値として提供できる |
| **バージョニング** | レスポンス形が変わったら namespace を上げる (\`txpoolPlus_v2_*\`)。古いクライアントは動き続けるべき |
| **メトリクス** | Reth の RPC レイヤーはメソッド単位の latency/count を metrics endpoint で公開するが、ネイティブメソッドのみ。ハンドラ内に自分で \`metrics::counter!(...)\` を追加する |
| **引数バリデーション** | \`RpcResult\` で \`ErrorObjectOwned::owned(code, message, data)\` をクリーンに返せる。安定したコードを選ぶこと。標準 JSON-RPC エラーコードを使い回さない (-32603 = "internal error" は予約済み) |

ここで書いたアーキテクチャ — trait 定義、コンポーネントアクセス付き impl、\`extend_rpc_modules\` 経由の登録 — **production の Reth カスタム RPC は全部こういう形をしている**。50 行のスケルトンは共通で、impl 本体に各プロジェクトの価値が宿る。

## Drill

1. **\`pendingByNonce(address)\` を追加。** 指定アドレスから現在 pending の tx 数を nonce ごとに返す 2 つ目のメソッド。パターン: 同じ trait、2 つ目の \`#[method]\`、2 つ目のハンドラ。(15分)
2. **gas price (post-EIP-1559) でバケット化。** priority-fee バケット化を effective-gas-price バケット化に置き換える (\`base_fee + priority_fee\`、\`max_fee_per_gas\` で上限)。base fee を provider から取得する必要あり。**\`ctx\` は何を公開している?** (30分)
3. **メソッドを認証ゲートで保護。** engine \`AUTH_SECRET\` を提示しない \`txpoolPlus_pendingByGasBucket\` 呼び出しは拒否する。(ヒント: Reth の debug メソッドがどうやっているか見る) (45分)
4. **スナップショットの新鮮さ。** レスポンスにスナップショットごとのタイムスタンプ + monotonic ブロック高を追加。\`ctx.provider().best_block_number()\` が 2 つ目の真の出所。(30分)
5. **クロスティア統合。** このティアの [lesson 1](/courses/reth-building-ja/lessons/build-mev-searcher-ja) の MEV searcher が \`txpoolPlus_pendingByGasBucket\` をクエリして 90 パーセンタイル超えで自分の入札を設定できる。\`jsonrpsee::http_client\` を使ってこれをやる Rust クライアントを追加。(2時間)

Drill 5 を完成させればループが閉じる: ノード固有の insight を typed RPC として公開するノードと、その insight を mempool で勝つために使う別 Rust プロセスが消費する側。**そのラウンドトリップ — カスタム RPC 経由の observability、別 consumer 経由の挙動 — は本物の searcher / market-maker スタックの組織のされ方そのもの。**

> 🛑 **最終チェック。** 一文で: なぜ \`extend_rpc_modules\` は、Reth の標準 RPC を呼ぶ sidecar サービスを動かすより厳密に強力なのか? 答えに「ノードコンポーネントへのインプロセスアクセス」が含まれていないなら、Step 3 を読み直す — そのアクセスがレバレッジ。

## Test gate

*Test gate — この tier では全アプリがテスト green で初めて完了* に従い、本レッスンの最低 gate は **インプロセス integration テスト**: ノードを自前 RPC 登録済みで起動し、HTTP で新メソッドを叩き、JSON 形を assert する — エラーパス込みで。

「dev で正しそう」なカスタム RPC が production で壊れる定番は 3 つ: 不正パラメータで間違ったエラーコードを返す、subscription が disconnect でタスクをリークする、認証ゲートが必要なメソッドに無い。それぞれ秒で testable。

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

レッスン完了の条件: (1) success path が pass、(2) 少なくとも 1 つのエラーコードテストが pass（型不正・範囲外・必須欠落のいずれか）、(3) subscription cleanup テストが pass。mainnet に対する \`cargo run\` ではこのどれの代替にもならない。

> **🧭 ここまでで積み上げたもの:** **ネットワーク層のサーバサイド拡張** を出荷した — jsonrpsee による集約 + subscription を Reth の pool ストリームに配線し、in-process integration + エラーコード + subscription リーク検出のテストで担保。GraphQL のカスタムリゾルバや Postgres のストアドプロシージャが解いてきた問題を、Reth RPC に持ち込んだかたち。次のレッスンでは **並行性 + 状態管理層** に移る: wallet backend。

`,
                },
                {
                  title: 'Wallet Backend を Rust で作る',
                  slug: 'build-wallet-backend-ja',
                  type: 'CONTENT',
                  sortOrder: 4,
                  duration: 45,
                  xpReward: 80,
                  content: `# Wallet Backend を Rust で作る

> 🧭 **systems engineering スタックでの位置:** **並行性層 + 状態管理層**。問題は共通で、並行送信、単調増加番号（nonce）、stuck 処理を同時に扱うこと。wallet backend はこの古典問題を EVM で解く実装である。

ユーザーが 1 分で 50 回送信しても、nonce を衝突させずに署名・送信し続ける必要がある。さらにガス急騰時には stuck tx を置換し、セッションの詰まりを防ぐ。ここでは Rust 約 250 行で signer pool、nonce manager、send queue、replace-on-stuck、confirm watcher を組み立てる。

> 📌 **スコープ。** signer pool / nonce manager / send queue / replace-on-stuck / confirm watcher を持つ最小 send service を作る。鍵カストディ、フィアット導線、JS SDK は対象外。

## 受け入れ条件

次のテストが pass したらレッスン完了（フルコードは末尾の §Test gate）:

1. **\`signed_tx_roundtrips\`** — サービスが生成した署名済み tx は、元の \`TransactionRequest\` に正確に decode で戻る（送信者・to・value・nonce・gas パラメタ・data）。
2. **\`no_nonce_gaps_under_concurrent_send\`** — 同じ \`from\` に 50 件並行で \`/send\` を投げ、結果の nonce が \`base..base+50\` で欠損も重複もない。

**Test-first 読法。** 先に受け入れ条件を確認する。以下では、テストが使う signer pool、nonce manager、\`TransactionRequest\` フローを示す。

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

1 回の POST で行う処理は、signer 取得、nonce 予約、ガス見積もり、署名、送信、監視である。30 秒以内に着地しなければ watcher が fee を引き上げて再送する。

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

> 🛑 **予測。** 「nonce 取得→署名→送信」を同一アドレスで 100ms 以内に 2 回実行すると何が壊れるか。一文で答える。

## なぜこれが難しいか

| 問題 | ナイーブな方式 | 何が間違うか |
| :--- | :--- | :--- |
| **Nonce 競合** | 送信ごとに \`provider.get_transaction_count(from).await\` | 並行する 2 つの送信が両方 nonce N を読み、両方 N で署名し、1 つしか着地しない。もう 1 つは mempool で拒否される。 |
| **Stuck tx** | gas price が十分高いことを祈る | mainnet ガスは数秒で 5 → 80 gwei に急騰する。あなたの tx は何時間も mempool に居座る。 |
| **置換ロジック** | 「同じ nonce で再送信するだけ」 | 大半のノードは fee を ≥10% 引き上げない置換を拒否する。ナイーブな再送はサイレントに失敗する。 |
| **Confirmation 喪失** | \`eth_sendRawTransaction\` の戻り値を信じる | tx hash は「受け付けた」を意味し、「着地した」を意味しない。Network reorg と peer drop は起きる。 |

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

ポイント:

- **\`Arc<Mutex<HashMap>>\`** — nonce 管理を 1 箇所に集中させる。ここは短いクリティカルセクションなので、まずは単純実装でよい。
- **\`pending()\` を使う。** confirmed-only だと in-flight nonce と衝突しやすい。
- **初回だけ RPC。** 以降の予約はローカル状態で進む。
- **\`forget\` は回復手段。** nonce 不整合時にキャッシュを破棄し、次回 RPC で再同期する。

> 🔍 **リポで探す。** [\`alloy-signer-local\`](https://github.com/alloy-rs/alloy/tree/main/crates/signer-local) を開く。hex 文字列から parse した \`PrivateKeySigner\` は、keystore ファイル (\`PrivateKeySigner::decrypt_keystore\`) や mnemonic からも得られる同じ型。**send service はどれから来たかを気にしない。**

## Step 2: ガス見積もり (EIP-1559)

EIP-1559 ガス: \`max_priority_fee_per_gas\` (validator への tip) + \`base_fee\` (バーンされる、プロトコルがブロックごとに設定する)。\`max_fee_per_gas\` がその合計の上限。

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

ポイント:

- **\`estimate_eip1559_fees()\` を使う。** fee 式を手書きせず、プロバイダ推定を使う。
- **bump は 25%。** 最低置換幅（10%）より十分に上げ、置換拒否を減らす。
- **見積もり失敗時は送信しない。** provider 不調時の強行送信を避ける。

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

ポイント:

- **nonce は署名前に予約する。** 並行送信時の競合を避けるためである。
- **署名層は差し替え可能。** local signer でも remote signer でも、送信フロー本体は保てる。
- **送信と確認を分離する。** \`send_raw_transaction\` 後は即 return し、確認は watcher に任せる。

## Step 4: replace-on-stuck 付きの confirm watcher

バックグラウンドループ。1 つの tokio タスクが全 queued tx を監視し、deadline 超過は fee を引き上げる:

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

ポイント:

- **先にスナップショット。** RPC 中にロックを保持しないため、キュー全体の直列化を避けられる。
- **\`receipt = Some\` で着地判定。** RPC 反映遅延は 5 秒ポーリングで吸収する。
- **25% bump を繰り返す。** 置換失敗を減らせるが、実運用では上限設定が必要。
- **\`expect(\"signer missing\")\` は不変条件チェック。** キュー内 tx は pool の signer を持つ前提である。

> 🛑 **理解度チェック。** なぜ watcher は待機ではなく、同一 nonce + 高 fee で置換するのか。先行 nonce が詰まると後続がどうなるかで説明する。

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

これで最小サービスは完成である（インポート込みで約 250 行）。

> 🔍 **リポで探す。** [\`alloy-rpc-types\`](https://github.com/alloy-rs/alloy/tree/main/crates/rpc-types-eth) を開く。\`TransactionRequest\` を見つける。全 \`with_*\` builder メソッドが拡張するのは *同じ* 型。**あなたの wallet backend、arb bot、デプロイスクリプト — すべてこの同じ型から tx を組み立てる。** それが Alloy のレバレッジ。

## Production に足りないもの

| ギャップ | 本物の wallet backend が何をしているか |
| :--- | :--- |
| **鍵カストディ** | KMS / HSM / MPC へ移行する。\`PrivateKeySigner\` 直持ちは本番資金に不向き |
| **冪等性** | \`/send\` に \`request_id\` を入れて重複送信を防ぐ |
| **鍵単位レート制限** | from 単位で並行送信上限を設定する |
| **永続キュー** | \`PendingTx\` を DB/Redis に保存し、再起動後に復元する |
| **マルチ RPC ファンアウト** | 複数 provider へ同時送信し、単一障害点を減らす |
| **Nonce ギャップ検出** | 欠落 nonce を検知し、必要なら no-op tx で埋める |
| **Observability** | \`pending_count\` / \`oldest_pending_age\` / \`bumps_per_hour\` を監視する |

ここで作った構成（signer pool、nonce manager、送信パス、watcher）は、production wallet backend の共通骨格である。

## Drill

1. **冪等性。** \`SendRequest\` に \`request_id: String\` フィールドを追加し、\`request_id → tx_hash\` を 1 時間キャッシュする。重複 POST にはキャッシュした hash を返す。(30分)
2. **鍵単位レート制限。** \`/send\` を per-from semaphore (max 4 並行) でラップする。超過は 429 で拒否。(30分)
3. **永続キュー。** \`PendingTx\` を insert 時に Redis に書き、着地時に削除する。起動時に復元。(1.5時間)
4. **マルチ RPC ファンアウト。** 2 つの provider をラップして \`send_raw_transaction\` を両方にブロードキャストし、最初の \`Ok\` を返す \`MultiProvider\` を作る。(1時間)
5. **キャンセル endpoint。** \`POST /cancel { from, nonce }\` を追加 — 同じ nonce で 50% 引き上げた 0-value 自送を提出する (stuck tx を確実にキャンセル)。(1時間)

Drill 5 まで終えれば、鍵カストディを除く中核機能は揃う。HSM 連携を加えれば本番水準に近づく。

> 🛑 **最終チェック。** なぜ **ローカル nonce 状態** が核なのかを一文で答える。答えに「nonce ごとの RPC 往復なしで並行送信する」が入らない場合は Step 1 を再読する。

## Test gate

*Test gate* に従い、本レッスンの最低ラインは **wallet backend で必須の不変条件 2 つ**:

1. **Tx エンコードのラウンドトリップ** — 署名済み tx が元の \`TransactionRequest\` に正確に decode できること。
2. **並行下での nonce 単調性** — 同一 \`from\` の並行送信で nonce に欠損・重複がないこと。

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

両方 pass するまでレッスンは **未完了**。前者が崩れると不正 tx を作り、後者が崩れると nonce 詰まりで送信が停止する。

## 📺 関連動画

\`\`\`youtube
wJnywGB33O4 | Georgios Konstantopoulos — Foundry, a portable, fast and modular toolkit (Foundry の tx パイプライン内で使われている同じ Alloy + Rust signer 機構)
\`\`\`

> **🧭 ここまでで積み上げたもの:** **並行性 + 状態管理層の wallet backend** を出荷した — signer pool、単調増加 nonce manager、send queue、replace-on-stuck、reorg を意識した watcher。Stripe の payment intent や Kafka producer の冪等性と同じパターンを、EVM tx に持ち込んだかたち。次のレッスンでは **認証層** に移る: EIP-7702 による委任認可。
`,
                },
                {
                  title: '最小限の EIP-7702 Sponsor サービスを Rust で作る',
                  slug: 'build-7702-sponsor-ja',
                  type: 'CONTENT',
                  sortOrder: 5,
                  duration: 45,
                  xpReward: 80,
                  content: `# 最小限の EIP-7702 Sponsor サービスを Rust で作る

> 🧭 **systems engineering スタックでの位置:** **認証層**、特に委任認可 (delegated authorization)。OAuth 2 の「あるエンティティが別のエンティティに代わって action を認可する」、DocuSign の署名委任、各種の meta-transaction relayer と同じ概念。EIP-7702 と sponsor サービスは、それを Ethereum 上で表現したもの — Alice が intent に署名し、sponsor がガスを払い、チェーンが委任を暗号的に強制する。

Alice は EOA (Externally Owned Account — スマートコントラクトではない、ただの鍵ペアのウォレット) を持っている。ETH を事前に保有せず、smart-contract アカウントへの移行もせずに、1 クリックで 2 つのトークンを swap したい。EIP-7702 (Pectra フォーク以降、2025 年 3 月から mainnet で稼働) がその手段: 「この tx の間、私の EOA をこのコントラクトのコードを持つかのように扱え」と命じる *authorization* に、彼女がオフチェーンで署名する。**Sponsor** — あなたのサービス — がその authorization を Type 4 トランザクションに包んでガスを払う。Alice は atomic な batched call、custom validation、session key を得る。同じアドレス、同じ鍵、移行なし。以下、Rust ~200 行。

> 📌 **スコープ。** 単一ユーザの EIP-7702 sponsor フローを実装する。入力はユーザ署名 authorization と call intent、出力は submit 後の tx hash。マルチユーザ bundling と AA ポリシー実装は対象外。

## EIP-7702 を 90 秒で

\`\`\`
7702 なし: Alice の EOA → CALL → Contract
7702 あり: Alice の EOA = (delegate された) → Contract code → Alice のアドレスとして実行
\`\`\`

メカニクス:

- **Tx type 4** が新フィールドを運ぶ: \`authorization_list: Vec<SignedAuthorization>\`
- \`Authorization { chain_id, address (delegate), nonce }\` がコードを設定される EOA によって署名される
- tx 実行時、リスト内の各 authorization は **その EOA のアカウントコードを書き換える** — 23 byte の delegation pointer (\`0xef0100 || delegate_address\`) に、**その tx の残りの間**だけ
- EOA のストレージ、残高、アドレスはそのまま。Delegate のコードが EOA 自身のコードであるかのように走る

それだけ。プロトコル本体は 3 文で、残りは配管。

## 受け入れ条件

次のテストが pass したらレッスン完了（フルコードは末尾の §Test gate）:

1. **\`rejects_duplicate_authorization\`** — 同じ \`SignedAuthorization\` は 2 回 sponsor できない。2 回目の \`/sponsor\` は submission 前にサービス境界で拒否される。
2. **\`gas_accounting_matches_actual_cost\`** — 成功 sponsor 後、sponsor の残高は実払いガス分だけ減り、ユーザの残高は変わらない。

**Test-first 読法。** 先に受け入れ条件を確認する。以下では、テストが使う Type 4 tx 構築、署名 authorization 処理、ガス会計パスを示す。

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

> 🛑 **予測。** なぜ Type 4 tx の \`from\` は Alice ではなく sponsor（Bob）でなければならないか。EIP-1559 の \`from\` の意味と authorization の役割を分けて一文で答える。

## なぜ sponsor サービスか (vs ネイティブ smart-account)

| 方式 | UX | コスト | 移行 |
| :--- | :--- | :--- | :--- |
| **ネイティブ smart account (4337)** | 最高 — フル custom validation | 高 — 全 tx で bundler マークアップ | ユーザ資金 → 新アカウント |
| **純 7702 (ユーザが自分のガスを払う)** | OK — batching は得られるが ETH は必要 | 低 — 単一 tx | なし — 同じ EOA |
| **7702 + sponsor (本レッスン)** | onboarding に強い — ETH 不要 | sponsor がガス負担（サブスク/手数料で回収） | なし — 同じ EOA |

プロダクト実装の現実解はここにある。既存 EOA を維持しつつ smart-account 機能を使い、UX 投資として backend がガスを負担する。

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

ユーザ（Alice）はオフチェーンで \`Authorization\` に署名し、その結果をサービスへ送る。ここでは、サービスが受け取る形式を示すため署名処理を再現する。

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

ポイント:

- **\`Authorization { chain_id, address, nonce }\`** — \`address\` は delegate コントラクトである。
- **\`auth.signature_hash()\`** — 署名対象ハッシュ。手計算せず Alloy に任せる。
- **\`user_nonce\`** — authorization の再利用防止に効く。

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

ポイント:

- **\`decode_2718\`** — 受信した wire 形式をそのまま復元する。
- **\`from = sponsor\`、\`to = user\`** — 外側 tx は sponsor が払い、実行主体は delegate 化された user 側に立つ。
- **\`with_authorization_list(...)\`** — Type 4 化の要点。複数 auth を入れればバッチにも拡張できる。
- **\`executeBatch\`** — 慣例実装であり、プロトコル必須ではない。

> 🛑 **理解度チェック。** Bob（sponsor）が提出する場合、増える nonce は誰のものか。外側 tx の nonce と authorization nonce の役割を分けて答える。

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

ポイント:

- **\`send_transaction(req)\`** — sponsor 鍵で署名・送信する。
- **確認処理は分離可能。** 必要なら wallet-backend の watcher をそのまま流用できる。

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

全体は約 200 LOC。フロントエンドが \`user_authorization\` を作り、サービスが構築・送信・追跡を担当する。

> 🔍 **リポで探す。** [\`alloy/examples/transactions/send_eip7702_transaction.rs\`](https://github.com/alloy-rs/examples/blob/main/examples/transactions/examples/send_eip7702_transaction.rs) を開く。公式 example が Bob 送信 + Alice 認可 — **作ったものと同じ分離**。公式 example は main() に全部ハードコードしているが、私たちはサービスとして包んだ。**同じパターンを production 化しただけ。**

## Production に足りないもの

| ギャップ | 本物の sponsor サービスが何をしているか |
| :--- | :--- |
| **Authorization 検証** | \`signed_auth.recover_authority()\` で復号して、申告された user と一致するかを (ガス支払い前に) 検証する。本サービスは入力を信頼するが、production ではチェックする |
| **再送防止** | tx 後にユーザの nonce が変わる。提出 *前* に authorization の nonce が現在の EOA nonce と一致するかチェックし、古い authorization は同期的に拒否すべき |
| **支出制限** | ユーザ単位の日次上限、call ごとの value 上限、delegate アドレスの allowlist。(あなたがガスを払うので、誰のために sponsor するかはあなたが決める) |
| **Watcher** | [Lesson 4](/courses/reth-building-ja/lessons/build-wallet-backend-ja) の replace-on-stuck ロジック。EIP-7702 tx は同じ mempool を通るので、引き上げパターンは同一 |
| **マルチユーザバッチング** | 1 つの tx で \`auth_list = [Alice's auth, Bob's auth, Carol's auth]\` + \`multicall\` スタイルの delegate call。ユーザ単位のガス償却が下がる |
| **ガス sponsor 会計** | ユーザごとの支出量を追跡、\`/balance\` エンドポイントを公開、Stripe / オンチェーン入金 / アプリ subscription で補充 |
| **Delegate バージョンピン留め** | 特定の delegate アドレス (監査済みセット) のみ許可する。未知の delegate への authorization は拒否 — 悪意の可能性 |
| **フロントエンド SDK** | \`(provider, calls)\` を受けて \`user_authorization\` の hex を返す TypeScript / Swift / Kotlin クライアント。アプリ開発者から署名フローを抽象化する |

ここで作った流れ（authorization 受領 → Type 4 構築 → sponsor 送信）は、production の 7702 paymaster が共通して持つ骨格である。

## Drill

1. **Authority 検証。** 健全性チェックを追加: \`signed_auth.recover_authority()? == body.user\`。不一致は 400 で拒否。(15分)
2. **Nonce 鮮度チェック。** 提出前に現在のユーザ nonce を取得し、authorization の \`nonce\` と一致するか検証する。(15分)
3. **マルチユーザバッチング。** \`/sponsor\` を \`(user, user_authorization, calls)\` トリプルのリストを受け取るよう変更。全 authorization + multicall スタイルの delegate call を持つ 1 tx を構築。**1 ユーザの auth がバッチ中で無効だったら最悪何が起きる?** (1.5時間)
4. **支出上限。** \`HashMap<Address, U256>\` でユーザ単位のガス支出を追跡。設定可能な日次上限を超えるリクエストは拒否。(45分)
5. **Replace-on-stuck。** [Lesson 4](/courses/reth-building-ja/lessons/build-wallet-backend-ja) の watcher を持ってきて統合する。(30分 — パターンを理解していれば大半コピペ)

Drill 5 まで終えれば、内部アプリ向け sponsor サービスとしては実用水準に到達する。SDK、支出ポリシー、観測基盤を加えれば外部提供レベルへ進める。

> 🛑 **最終チェック。** なぜ 7702 は 4337 より sponsorship を安くしやすいか。一文で答える。\`entry-point オーバーヘッドなし\` と \`単一 tx\` が出なければ 90 秒リフレッシャを再読する。

## Test gate

*Test gate* に従い、本レッスンの最低ラインは sponsor 損失につながる失敗モード 2 つを潰すこと:

1. **Replay 防止** — 同じ \`SignedAuthorization\` を 2 回 sponsor しない。2 回目は submission 前に拒否する。
2. **ガス会計の正直さ** — 成功後、sponsor 残高だけがガス分減り、ユーザ残高は変わらない。

\`anvil --hardfork prague\` インスタンス（または Pectra 後ブロックの forked mainnet）に対して両方走らせる:

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

両方 pass するまでレッスンは **未完了**。前者が崩れると replay 試行でガスを焼き、後者が崩れると支出制御が壊れる。

## 📺 関連動画

\`\`\`youtube
_k5fKlKBWV4 | EIP-7702: a technical deep dive — lightclient (Devcon SEA 2024)
\`\`\`

\`\`\`youtube
K2Tm1f8MIwg | Full code walkthrough of EIP-7702 in Revm — sponsor された tx を走らせるエンジン
\`\`\`

> **🧭 ここまでで積み上げたもの:** **認証層** のアプリケーションを出荷した — 7702 で委任認可を実装し、replay 防止とガス会計の正直さをテストゲートで担保。OAuth 2 や DocuSign の電子署名委任と同じ概念を、Ethereum 上でネイティブに表現したかたち。次のレッスンでは **VM 層** に移る: カスタム precompile による Foundry スタイルの cheatcode。
`,
                },
                {
                  title: 'Foundry スタイルのカスタム cheatcode を Rust で作る',
                  slug: 'build-foundry-cheatcode-ja',
                  type: 'CONTENT',
                  sortOrder: 6,
                  duration: 45,
                  xpReward: 80,
                  content: `# Foundry スタイルのカスタム cheatcode を Rust で作る

> 🧭 **systems engineering スタックでの位置:** **コンパイラ / VM 層の拡張機構**。JNI (Java Native Interface)、Python の C extension、V8 のネイティブバインディングと同じパターン — 「VM が安定した ABI を通じてネイティブコードを呼び出せるようにする」。Foundry の cheatcode は、それを EVM 流に実装したもの — マジックアドレスに置いたカスタム precompile が、VM から Rust 関数へ dispatch する。

Foundry テストで \`vm.deal(alice, 100 ether)\` と書く時、**それは EVM opcode ではない**。Rust の関数 — *precompile* (EVM エンジンに組み込まれた「コードがチェーン上に存在しない」コントラクト) — を Foundry がマジックアドレス \`0x7109709E...\` にインストールし、\`Vm.sol\` インターフェース経由で Solidity から見えるようにしている。\`vm.warp()\`、\`vm.expectRevert()\` も全部同じ。**あなたも自前で出荷できる。** 本レッスンでは \`cheats.measureGas(target, data)\` を作る — Foundry が内部で使っているのと同じパターンで、テスト作者がサブコールのガスを手動でラップせずに測れる precompile を、だ。

> 📌 **スコープ。** Foundry 本体は fork せず、precompile と最小 Revm テストハーネスを作る。狙いは cheatcode パターン（高アドレス precompile + Solidity ABI）を透明な形で再現すること。

## 受け入れ条件

次のテストが pass したらレッスン完了（フルコードは末尾の §Test gate）:

1. **\`testMatches_referenceForKnownInput\`** — 1 つの固定入力で、Rust precompile と Solidity-only \`gasleft()\` リファレンスが ε 以内（数 gas）で一致する。
2. **\`testFuzz_alwaysAgreesWithReference\`** — Foundry デフォルト 256 fuzz iteration で、precompile とリファレンスが全入力で一致する。

**Test-first 読法。** 先に受け入れ条件を確認する。以下では、precompile の登録方法と出力算出を示す。ここが Solidity リファレンスとの一致を測る対象になる。

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

> 🛑 **予測。** なぜ通常の Solidity contract ではなく precompile で実装するのか。precompile でしかできない点を一文で答える。

## なぜ precompile か (contract でも opcode でもなく)

| 方式 | Revm 内部を呼べる? | コンセンサス影響 | 労力 |
| :--- | :--- | :--- | :--- |
| **普通の Solidity contract** | NO — EVM op のみ | なし | 簡単 |
| **新 EVM opcode** | YES — フル制御 | **即コンセンサスを fork する** (中級レッスン) | 莫大 |
| **Precompile (Foundry の選択)** | YES — フル Rust アクセス | **あなたの** Revm ビルドにのみ存在、mainnet にはなし | ~50 行 |

precompile は *executor* に組み込まれ、プロトコル本体には入らない。Mainnet Revm はあなたの precompile を持たない。あなたのテストランナー Revm だけが持つ。**コンセンサスは壊れず、Rust のフルパワー。** だから Foundry の cheatcode は precompile であって opcode ではない。

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

Revm precompile は \`fn(input: &[u8], gas_limit: u64) -> PrecompileResult\` というシグネチャの Rust 関数。その中に cheatcode dispatch を積み上げる:

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

ポイント:

- **\`CHEATS_ADDRESS\`** — \`0x7110...\` を使う。Foundry の \`0x7109\` 近傍だが、衝突回避を優先する。
- **セレクタディスパッチ** — Solidity と同じ 4-byte セレクタで分岐し、\`sol!\` 生成コードで型安全に decode する。
- **戻り値経路** — \`Ok(EthPrecompileOutput)\` は結果 bytes、\`Err(PrecompileHalt::*)\` は呼び出し停止を表す。

## Step 2: cheatcode ロジック

面白い部分: \`measureGas\` は同じ world state に対して *入れ子*の EVM 実行を走らせ、ガスを測り、その数を返す。鍵となる API は、既存 journal に対する fresh \`Context\` を立ち上げて (state を共有するため) ワンショット tx を走らせる、というものだ:

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

ポイント:

- **内側 EVM** — [Lesson 1 (MEV searcher)](/courses/reth-building-ja/lessons/build-mev-searcher-ja) と同じ builder で、入れ子実行の最小形を作る。
- **\`gas_used\` の扱い** — Success / Revert / Halt すべてで消費ガスを返す。revert でもガスは減る。
- **\`EmptyDB\` は簡略化** — 本番は Inspector で親 EVM と state を共有する。Drill 3 で扱う。

> 🛑 **理解度チェック。** ここでの **\`gas_used\`** はなぜ target contract 分だけを含むのか。precompile の固定コストが内側ではなく外側フレームに乗る点で説明する。

## Step 3: Revm テストハーネスに組み込む

precompile を登録し、Solidity テスト contract をそれに対して実行するテストランナーが必要。最小限のハーネス:

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

ポイント:

- **標準集合から拡張** — \`Precompiles::new(PrecompileSpecId::OSAKA)\` を起点に custom precompile を追加する。
- **登録 API** — \`with_precompiles(...)\` で cheatcode 群を一括注入できる。
- **役割分担** — このハーネスは実行カーネル。Foundry は compile、検出、レポート、並列化を上に積む。

> 🔍 **リポで探す。** [\`forge-std/src/Vm.sol\`](https://github.com/foundry-rs/forge-std/blob/master/src/Vm.sol) を開いて cheatcode インターフェースをざっと眺める。そこの全関数が [Foundry の cheatcode crate](https://github.com/foundry-rs/foundry/tree/master/crates/cheatcodes) の Rust precompile への Solidity ABI の表面となっている。**Rust だと知らなかった cheatcode を 3 つ挙げられるまでスクロールする。**

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

\`solc\` でコンパイルし、bytecode と \`test_increment_gas_under_25k()\` のセレクタを \`run_test_contract\` に渡せば、Rust cheatcode を end-to-end で実行できる。

## Production レベルテストフレームワークに足りないもの

| ギャップ | Foundry が何をしているか |
| :--- | :--- |
| **Solidity コンパイル** | \`forge\` が solc を呼び出し、artifact をキャッシュし、import を扱う。本当に必要な時だけ再現すればよい — ユーザに事前コンパイルさせる方が普通 |
| **親 state の共有** | \`vm.deal()\` は *テスト* が見る balance を変更する。それには親 EVM への custom Inspector フックが必要 — 独立ハーネスからの非自明な拡張 |
| **並列性** | Foundry はテストごとに独立 DB を持つスレッドで実行する。簡単に追加できる (テスト contract 1 つにつき 1 tokio タスク) |
| **より良い失敗レポート** | スタックトレース、デコード済み revert reason、fuzz shrink。すべて上記カーネルの上に磨きを掛けたもの |
| **呼び出し間の cheatcode 永続化** | 例: \`vm.expectRevert\` は *次の* call にだけ state を設定する。inspector state に保存され、precompile 自体に持たせるわけではない |
| **パーミッションレスな cheatcode 発見** | 本物のプラグインシステムなら cheatcode を動的ライブラリとしてロードできるが、Foundry はそれをしない — コンパイル時統合。私たちもしない |

ここで作った「高アドレス precompile + セレクタ分岐 + ABI decode + 入れ子 EVM + ハーネス登録」が、Foundry cheatcode の中核である。Foundry はこの上に運用機能を重ねている。

## Drill

1. **\`balanceOf(address)\` を追加。** \`evm.db.basic(addr).balance\` 経由で任意アドレスの残高を返す 2 つ目のセレクタを追加する。(15分)
2. **呼び出しを \`payable\` にする。** \`measureGas\` に \`value\` 引数を追加し、内側の tx へ受け渡す。**cheatcode が payable になると Solidity 側で何が変わるか?** (30分)
3. **共有 state cheatcode。** 親テストの state を *変更*する \`cheats.deal(address, uint256)\` を実装する。ヒント: 独立した入れ子 EVM ではなく custom Revm \`Inspector\` が必要。(3時間)
4. **Solidity テスト発見。** ディレクトリを受け取って全 \`.sol\` を solc でコンパイルし、\`test_\` で始まる全関数を見つけ、各々を実行し、pass/fail を出力する最小テストランナーを作る。(4時間)
5. **性能比較。** 同じテスト (Counter increment × 1000) を (a) 自前ハーネス、(b) \`forge test\` で実行する。**レイテンシギャップはどれだけか? どこから来ているか?** (プロファイリングに 1 時間)

Drill 4 を完成させれば、構造的に Foundry の fork が完成する。fuzz testing + invariant testing を上に足せば、実運用されているものと同等水準。

> 🛑 **最終チェック。** 一文で: なぜ **セレクタディスパッチ + ABI デコードされた引数** が、テスト作者から見て precompile を Solidity contract のように感じさせるのか? 答えに「Solidity はアドレスへの呼び出しをエンコードする方法を既に知っている」が含まれていないなら、Step 1 を読み直す — その ABI 互換性が "騙し" を可能にしている。

## Test gate

*Test gate — この tier では全アプリがテスト green で初めて完了* に従い、本レッスンの最低 gate は **参照実装との differential テスト**。

カスタム cheatcode は dual-use である。Rust precompile で速度を取り、Solidity リファレンスで正しさを担保する。\`cheats.measureGas(target, data)\` が参照実装とずれたら、関連テストのガス会計は壊れている。

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

\`forge test --match-test testFuzz_ -vvv\` を既定 256 fuzz iteration で実行する。256 入力すべてで一致する（数 gas の許容差内）までレッスンは未完了とする。1 件でも差分が出たら、その入力で cheatcode は誤計測する。

## 📺 関連動画

\`\`\`youtube
sJpL21yJpgs | Horsefacts — Invariant Testing WETH with Foundry (本レッスンが reverse-engineer した cheatcode パターン)
\`\`\`

> **🧭 ここまでで積み上げたもの:** **VM 層の拡張機構** を出荷した — 高アドレスに登録したカスタム precompile が、VM から Rust 関数を呼ぶかたちを、Solidity リファレンスとの differential fuzz で固めた。JNI や V8 のネイティブバインディングと同じパターンを、Revm に持ち込んだかたち。次のレッスンでは **DB 層の consistent snapshot read** に移る: fork した DEX 状態に対する swap aggregator。
`,
                },
                {
                  title: 'Swap Aggregator を作る — DEX state を fork して',
                  slug: 'build-swap-aggregator-ja',
                  type: 'CONTENT',
                  sortOrder: 7,
                  duration: 45,
                  xpReward: 80,
                  content: `# Swap Aggregator を作る: DEX state を fork して、Rust で

> 🧭 **systems engineering スタックでの位置:** **DB 層の consistent snapshot read** を、DEX の状態に持ち込んだもの。MVCC データベースが解いてきた問題と同じ — 「N 個の値を atomic に、同じ時点から read する」。mainnet を pin したブロックで fork すれば、すべての quote が同じデータベーススナップショットを参照できる。あとは、その整合性のあるビューの上で、DEX ごとに計算を回すだけ。

ユーザが 10,000 USDC を ETH に swap したい。Uniswap V2 なら 2.948 WETH もらえる。Sushi なら 2.946。Uniswap V3 なら 2.951。Aggregator の仕事は: **同じクオートを全 venue に同じ瞬間にファンアウトし、比較し、勝者を選ぶこと。** これが 1inch、Paraswap、0x が裏でやっていること。以下、Rust ~250 行: Revm で mainnet をローカル fork し (全クオートが *同じ* atomic state を読むため)、Uniswap V2 + Sushi + Uniswap V3 から reserve を引き、出力を計算し、ベストを選ぶ。

> 📌 **スコープ。** 2 つの V2 pool（Uniswap V2 / Sushi）と 1 つの V3 pool（Uniswap V3）の 1-hop クオートを扱う。split routing、multi-hop、独自 CFMM、ガス最適化は拡張項目とする。

## 受け入れ条件

次のテストが pass したらレッスン完了（フルコードは末尾の §Test gate）:

1. **\`matches_quoter_for_known_input\`** — pin した mainnet ブロックの 1 つの固定入力で、計算した V3 クオートが Uniswap 公式 QuoterV2 と 5 bps 以内で一致する。
2. **\`picks_best_when_v3_dominates\`** — V3 が最良価格となるブロックで \`pick_best\` が V3 クオートを返す。

**Test-first 読法。** 先に受け入れ条件を確認する。以下では、mainnet fork、reserve 読み取り、venue 別クオート計算、勝者選択を示す。いずれもテスト対象そのものだ。

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

> 🛑 **予測。** 各 pool を直接 RPC で叩かず、fork で state を読む理由は何か。RPC では得られず fork で得られる価値を一文で答える。

## なぜ fork か (vs 直接 RPC)

| 方式 | N 個のクオートのレイテンシ | ガスコストシミュレーション? | マルチプールの atomic ビュー? |
| :--- | :--- | :--- | :--- |
| **N 回の RPC \`eth_call\`** | N × ~50ms = 10 pool で数秒 | NO (別途 \`eth_estimateGas\` が必要) | NO — 各 call は別々の state read で、pool A と pool B が微妙に違うブロックから来る可能性がある |
| **1 回 fork して N 回 read** | 初回 ~50ms (block fetch)、以降 ~200µs/pool | **YES — 同じ Revm fork で仮想的な swap のガスを測れる** | **YES** — 全 read が同じ atomic snapshot から得られる |

aggregation では特に atomicity が重要。pool A の reserve があなたの pool A read と pool B read の間に動いてしまえば、「ベストルート」の計算はリンゴと梨を比較していることになる。**Fork が世界の単一ビューを与えてくれる。**

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

[Lesson 1 (MEV searcher)](/courses/reth-building-ja/lessons/build-mev-searcher-ja) と同じで、それが要点。**同じ fork パターンがあちこちで現れる。1 つ作れれば、全部作れる。**

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

ポイント:

- **再利用** — [Lesson 1 (MEV searcher)](/courses/reth-building-ja/lessons/build-mev-searcher-ja) の EVM call を、任意 \`SolCall\` を扱える \`call_view\` に一般化した。
- **\`token0\` 判定** — pool はアドレス順で並ぶため、\`reserve_in\` が \`reserve0\` と \`reserve1\` のどちらかは都度判定が必要である。
- **\`fee_bps\`** — V2 系は同じ式で扱え、fee だけを差し替える。

> 🔍 **リポで探す。** [Uniswap V2 router のソース](https://github.com/Uniswap/v2-periphery/blob/master/contracts/libraries/UniswapV2Library.sol) を開く。\`getAmountOut\` を見つける。それが次のステップで実装する数式。**Rust と参照 Solidity を行単位で比較する。**

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

ポイント:

- **式の本体** — V2 は constant product を fee 調整付きで評価するだけである。
- **整数演算** — \`U256\` のみで計算し、オンチェーンと同じ桁で一致させる。
- **汎用性** — bps fee を差し替えるだけで V2 系 fork を共通実装で扱える。

> 🛑 **理解度チェック。** なぜ \`amount_in_with_fee * pool.reserve_out\` は分子に来るのか。単位（次元）で説明する。

## Step 4: V3 quote (より複雑な数式、よりシンプルなアプローチ)

Uniswap V3 は流動性を *tick* と *concentrated range* で価格付けする。クオート公式は非自明だ。**近道**: V3 数式を再実装せず、on-chain Quoter に答えを聞く。ただし RPC のラウンドトリップを払わなくて済むよう Revm 経由で行う:

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

ポイント:

- **Quoter 利用** — V3 数式を再実装せず、デプロイ済み Quoter で出力を取得する。
- **\`sqrtPriceLimitX96 = 0\`** — 価格制限を無効化する設定である。実運用ではスリッページ制御値を入れる。
- **fee tier** — fee 指定で pool tier を選ぶ。実運用は複数 tier を比較する。

ここでも同じ \`call_view\` パターンで書けるが、V3 call の細部が見えるよう、ここでは inline で書いた。

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
| **マルチホップルーティング** | pool 横断で A → WETH → B 経由のルーティング。グラフを構築し、output 量で重み付けされた Bellman-Ford |
| **Split routing** | 合計 output が単独より大きくなるなら、40% を V3 経由、60% を V2 経由といった配分にする。重みに対する凸最適化 |
| **Curve / Balancer / etc.** | 各 CFMM が独自の quote 関数を持つ。Curve は stableswap (Newton 法)、Balancer は weighted pool。**同じ fork、venue ごとに違う数式。** |
| **ガス考慮** | 各 quote から推定ガスコスト (out-token 単位) を引く。$100 の swap で 50¢ の追加ガスを払うなら 0.1% の価格差は無価値 |
| **Price-impact 閾値** | pool を X% 超えて動かすルートは却下 — 低流動性 venue における MEV sandwich 対策 |
| **submission 時の再 quote** | Fork はブロック N での state、swap はブロック N+k で着地する。state drift を捕まえるために submission 直前に再 quote する |
| **MEV 保護** | Flashbots Protect / MEV-Share 経由で submit して、frontrunner にルートを事前に見せない ([Lesson 8 — Capstone](/courses/reth-building-ja/lessons/build-capstone-router-ja) がこれをやる) |

ここで書いたアーキテクチャ — 1 回 fork、reserve を atomic に読む、venue ごとに quote を計算、勝者を選ぶ — **1inch と Paraswap が内部 pricing 層を組み立てている形そのもの**。彼らはスケール、より多くの venue、より良いルーティング最適化を加える。カーネルは同一。

## Drill

1. **Curve を追加。** Curve pool (例: 3pool) を選ぶ。state を読み、quote (stableswap) を実装し、\`get_dy(int128 i, int128 j, uint256 dx)\` を同じ \`call_view\` パターンで呼ぶ。(1.5時間)
2. **ガス会計。** 各 quote から推定ガスコストを引く (\`evm.estimate_gas\` を仮想的な swap に対して使う)。「best」ルートは今や \`amount_out − gas_cost_in_out_token\` を最大化するルートのはず。(2時間)
3. **マルチホップ探索。** 2-hop 探索を構築: A → WETH → B。WETH 経由の各候補に対して連鎖 quote を計算し、直接ルートと比較する。(3時間)
4. **Split routing。** トップ 2 venue の 50/50 split を実装し、合計 output が単独より大きいかチェックする。(2時間)
5. **クロスティア:** aggregator を wallet backend ([Lesson 4](/courses/reth-building-ja/lessons/build-wallet-backend-ja)) に \`POST /quote-and-swap\` として組み込み、submission 用の署名済み tx を返す。(3時間)

Drill 5 を完成させれば、構造的に aggregator-as-a-service ができる。MEV 保護 ([Lesson 8](/courses/reth-building-ja/lessons/build-capstone-router-ja)) を組み込めば、2023 年に出荷されたものと同等水準。

> 🛑 **最終チェック。** 一文で: なぜ aggregator にとって **fork** が **N 並列の \`eth_call\`** より厳密に優れているのか? 答えに「全 read を貫く atomic state」が含まれていないなら、Step 1 を読み直す — その atomicity こそが比較を健全にする。

## Test gate

*Test gate — この tier では全アプリがテスト green で初めて完了* に従い、本レッスンの最低 gate は **pin した mainnet ブロックで、既知の正答 quote に対する forked-state テスト**。

aggregator の正しさは二値: 同じ入力に対して \`Quoter\`（Uniswap 公式のオフチェーン quoter コントラクト、\`0x...3258\` にデプロイ済み）が同じブロックで返す出力と一致するか、しないか。Reserves を正しく読むのは必要条件で、CFMM 数学を正しく実行することがテストが強制する部分。

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

QuoterV2 differential が pass するまでレッスンは **未完了**。数学が 50 bps 狂っていれば、全ユーザに静かに最適でないルートを推薦している。

> **🧭 ここまでで積み上げたもの:** **DB 層の consistent snapshot read** を DEX 状態に持ち込んだ aggregator を出荷した — 全クオートが、pin したブロックで Revm fork した同じスナップショットを参照し、QuoterV2 differential で 5 bps まで精度を担保。MVCC データベースの atomic な複数キー read と同じ構造。次のレッスンは **capstone**: ネットワーク層 + コンパイラ層 + 認証層を統合する、frontrun-resistant な order router。

`,
                },
                {
                  title: 'Capstone — Frontrun-Resistant Order Router を作る',
                  slug: 'build-capstone-router-ja',
                  type: 'CONTENT',
                  sortOrder: 8,
                  duration: 60,
                  xpReward: 100,
                  content: `# Capstone — Frontrun-Resistant Order Router を作る

> 🧭 **systems engineering スタックでの位置:** **ネットワーク層 + コンパイラ層 + 認証層の統合**。HFT のオーダールータ、CDN のエッジルータ、適応的ルーティングを持つ API ゲートウェイと同じ構造 — 「複数ソースから入力を受け、結果をシミュレートし、経路を選び、適切な投入チャネルへ dispatch する」。本 router は、その発想を MEV 敵対者下の EVM トランザクションルーティングに持ち込んだもの。

この capstone は、既存レッスンの実装を 1 サービスに統合する。入力は swap intent（JSON）である。

Router は次を順に行う。レッスン7のクオート、レッスン1の mempool 監視、Revm での脅威シミュレーション、レッスン5の sponsor。脅威が高ければ Flashbots Protect へ、低ければ public mempool へ送る。要するに L1 / L4 / L5 / レッスン7を束ね、追加実装は決定レイヤーに集中させる。

> 📌 **スコープ。** 本キャップストーンは L1 / L4 / L5 / レッスン7の統合が主眼である。新規実装は **frontrun 検出** と **private submission パス**。実装先は Flashbots Protect だが、同型の private RPC に横展開できる。

## 受け入れ条件

次のテストが pass したらレッスン完了（フルコードは末尾の §Test gate）:

1. **\`benign_path_uses_public_mempool\`** — mempool に敵対 tx 無し。router が PUBLIC を選び、swap が着地、出力 ≥ \`min_out\`。
2. **\`detected_threat_routes_through_private_mempool\`** — sandwich 設定 tx が mempool に存在。router が PRIVATE を選び Flashbots Protect 経由で submit。
3. **\`respects_min_out\`** — スリッページシナリオ。router が submit を拒否し \`SlippageExceeded\` を返す。

**Test-first 読法。** 先に受け入れ条件を確認する。以下では、テストが直接行使する決定レイヤー（新規部分）を示す。残りは レッスン1/レッスン4/レッスン5/レッスン7 の再利用である。

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
    Router -->|fork mainnet| Aggregator["Aggregator (レッスン7)<br/>quotes + best venue"]
    Router -->|scan pending txs| Detector["Frontrun detector<br/>(L1 mempool watch +<br/>L7 simulation)"]
    Detector -->|adversarial tx found?| Decide{"Risk?"}
    Aggregator --> Decide
    Decide -->|HIGH| PrivPath["Private mempool<br/>(Flashbots Protect)"]
    Decide -->|LOW| PubPath["Public mempool"]
    PrivPath --> Sponsor["EIP-7702 sponsor (レッスン5)"]
    PubPath --> Sponsor
    Sponsor --> Wallet["Wallet backend (レッスン4)<br/>nonce/gas/replace"]
    Wallet --> Chain
\`\`\`

> 🛑 **予測。** Lesson 1 の MEV searcherは、この router の脅威モデルそのものである。searcher の行動と router が防ぐ対象を一文で答える。

## どの lesson が入るか (そして新規部分)

| コンポーネント | 出典 | ここで新規なもの |
| :--- | :--- | :--- |
| **DEX 横断クオート** | [L7](/courses/reth-building-ja/lessons/build-swap-aggregator-ja) | そのまま再利用 |
| **Mempool 監視** | [L1](/courses/reth-building-ja/lessons/build-mev-searcher-ja) (searcher の入力!) | 防御として再利用 — 機会ではなく敵候補を見つける |
| **Revm fork シミュレーション** | [L1](/courses/reth-building-ja/lessons/build-mev-searcher-ja) | 「この敵 tx はユーザを傷つけるか?」のスコアリングに使う |
| **EIP-7702 sponsor** | [L5](/courses/reth-building-ja/lessons/build-7702-sponsor-ja) | パスに統合してユーザがガスを払わないようにする |
| **Wallet backend submission + replace** | [L4](/courses/reth-building-ja/lessons/build-wallet-backend-ja) | public-mempool パスに使う |
| **Private orderflow submission** | NEW | Flashbots Protect / MEV-Share 統合 |
| **決定ロジック (route + risk → submission パス)** | NEW | Capstone の貢献部分 |

新規性は **決定レイヤー**。その下はすべて、既に作ったパターン。

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

ポイント:

- **終端状態は 3 つ** — private 送信、public 送信、拒否。拒否も安全機能である。
- **\`expected_out\`** — Lesson 7 の見積もりを \`min_out\` と事前比較し、許容外なら送信しない。
- **\`submission\`** — 提出先（public/private）を明示し、実行経路の可観測性を確保する。

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

実装は見もしない — Lesson 7 のもの。**過去のレッスンコードをインポートすること自体も Capstone の読みの一部。** モジュール化を保つ。

## Step 3: Frontrun 検出 — 新しい部分

Lesson 1 の MEV searcher は mempool で *機会* を監視する。視点を反転させれば、同じスキャンがユーザに対する *脅威* を見つける。具体的には: router が使おうとしているのと同じ pool を、router が価格を動かすのと同じ方向でターゲットにする pending tx だ。

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

ポイント:

- **入力源** — \`subscribe_pending_transactions\` を使い、Lesson 1 と同じ mempool ストリームを防御側に転用する。
- **緩い判定** — ここは false positive を許容し、安全側（private へ逃がす）に倒す設計である。
- **\`duration\`** — 数秒の look-ahead で候補を拾い、待ち時間を抑える。

> 🛑 **理解度チェック。** なぜ swap の方向が sandwich 判定で重要なのか。同方向と逆方向での利益差で説明する。

## Step 4: Revm シミュレーションで脅威をスコアリング

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

ポイント:

- **実指標** — quote-before と quote-after の差分で被害を測る。候補検出だけでは判定できない。
- **逐次適用は簡略版** — 本番では敵 tx を独立評価し、worst case を合成する。
- **閾値調整** — bps 閾値はペア特性に合わせて運用側で設定する。

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

**2 つの provider** がこの設計の核となる部分。\`public_provider\` は普通の RPC (Infura、自前 Reth) に接続し、\`private_provider\` は https://rpc.flashbots.net/protect に接続する。**同じ Alloy コードに違うエンドポイント** — それが sandwich 攻撃を打ち破る非対称性。

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

本レッスンの新規コード合計: ~250 LOC。**router** 全体のコード: この 250 + 持ち込まれる lesson — 1 つのリポに収まる、動く frontrun-resistant order router。

## Production に足りないもの

| ギャップ | 本物の production router が何をしているか |
| :--- | :--- |
| **MEV-Share / OFA 統合** | Orderflow を最高入札の searcher にプライベートオークションし、リベートをユーザに戻す。(Flashbots Protect は単純化版) |
| **ユーザ単位スリッページ予算** | 5% スリッページを超えて quote を出さない。ユーザに \`amount_in\` を減らすよう伝える |
| **キャンセル + 返金フロー** | private bundle が 2 ブロックで着地しなければ、EIP-7702 authorization は無駄になる。ユーザ向け UI + 返金ロジックが必要 |
| **マルチリージョン private RPC** | Flashbots、Beaverbuild、Titan、Rsync に同時 submit し、最初に着地したものが勝つ |
| **ユーザ単位レート制限** | API アクセスを持つ悪意ある主体は quote をスパムできる (安価) が、各 quote は fork を消費するので上限を設ける |
| **Observability** | 全 (venue, risk, submission) 決定をログに残す。1000 ルート後に評価する: private にルートしたとき、シミュレートされた drop は実オンチェーン結果と一致したか? 実データで閾値を調整する |

ここで書いたアーキテクチャ — quote → 敵検出 → シミュレーションでスコア → private vs public の決定 → 適切なパスで submit — **すべての defensive routing サービスの背骨**。CowSwap、MEV-Share consumer、リテール wallet backend — すべてこのバリエーションをやっている。**今やあなたも作った。**

## Drill (カリキュラム最長、意図的に)

1. **本物の router ABI デコード。** \`looks_like_swap_on\` の緩い substring ヒューリスティックを UniV2 / V3 / Sushi router calldata の正規の \`sol!\` デコードに置き換える。path に \`(in_token, out_token)\` がどちらかの方向で含まれるかチェックする。(3時間)
2. **独立シミュレーション。** 各敵を独立にスコアする (各敵間で fork を snapshot + rollback)。worst-case の drop を取る。(2時間)
3. **キャンセルフロー。** \`POST /cancel { tx_hash }\` を追加 — ユーザの authorization を払い戻す (具体的には、元のものを無効化する no-op tx を同じ nonce で署名する)。UI に組み込む。(3時間)
4. **マルチ RPC の private submission。** 2 つの private エンドポイント (Flashbots Protect + Beaverbuild) に同時 submit する。最初に着地した方の hash を返す。(1.5時間)
5. **閾値の自動チューニング。** 各 router 決定 + 実オンチェーン結果 (drop は予測より大きかったか小さかったか?) をログに残す。historical data に対して bps 閾値を fit する小さなオフラインスクリプトを書く。(5時間)

Drill 5 後、チューニング済みで観察可能、正しく動く frontrun-resistant router が手に入る。**これがユーザの信頼を真剣に受け取る wallet チームに対して production に出すもの。**

> 🛑 **最終チェック (本レッスンの最終チェック)。** 一文で: このティアのレッスンのうち、なぜ *capstone* が他のどのコンポーネントよりも **シミュレーション** (レッスン1) に依存するのか? 答えに「ユーザの損失と同じ単位で脅威を測らずに、防御するかを決められない」が含まれていないなら、capstone はまだ完全には届いていない — Step 4 を読み直す。

## Test gate

*Test gate — この tier では全アプリがテスト green で初めて完了* に従い、capstone の gate は **forked mainnet 上での end-to-end**: 本物の swap intent が入り、router がシミュレートした脅威に基づき PUBLIC vs PRIVATE を判定し、正しい submission パスが取られ、ユーザは少なくとも \`min_out\` を受け取る。決定レイヤーが新規部分で、テストが先行レッスンから持ち越せない唯一のもの。

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

3 つすべて forked-mainnet の \`anvil\` で pass するまで capstone は **未完了**。1 つ目は public パスが end-to-end で動くこと、2 つ目は決定レイヤーが脅威下でパスを切り替えること、3 つ目はスリッページ悪化時にユーザ資金を失わないことを証明する。

---

## Capstone 完了 — 残り 2 レッスン

ここまでに作ってきたものの総まとめ:

1. 最小 MEV searcher (mempool → fork-sim → arb)
2. Reorg-aware Postgres indexer (ExEx + reorg ディスパッチ)
3. カスタム RPC エンドポイント (jsonrpsee + extend_rpc_modules)
4. Wallet backend (signer pool + nonce mgr + replace-on-stuck)
5. EIP-7702 sponsor (Type 4 tx + paymaster パターン)
6. Foundry スタイル cheatcode (custom precompile + ハーネス)
7. Swap aggregator (Revm fork + venue 横断 quote)
8. **Frontrun-resistant order router (本レッスン)** — L1 / L4 / L5 / レッスン7を統合

この先: L9 (validate-revm クロスクライアントハーネス) と L10 (HTTP 402 / MPP machine-payments エンドポイント)。swap-router の弧の外側に立つが、同じティアで ship される。

> **🧭 ここまでで積み上げたもの:** **ネットワーク層 + コンパイラ層 + 認証層の統合** を出荷した — マルチソース入力 → simulation → 経路判断 → 適切な submission チャネル、これを benign / threat / slippage の E2E テスト群で固めた。HFT の order router や CDN の edge router と同じ構造を、MEV 下の EVM トランザクションルーティングに持ち込んだかたち。次のレッスンでは **VM 層の正しさ検証** に移る: production provider に対する Revm の differential testing。
`,
                },
                {
                  title: 'Revm シミュレーションを Production Provider で検証する',
                  slug: 'build-validate-revm-ja',
                  type: 'CONTENT',
                  sortOrder: 9,
                  duration: 50,
                  xpReward: 90,
                  content: `# Revm シミュレーションを Production Provider で検証する

> 🧭 **systems engineering スタックでの位置:** **コンパイラ / VM 層の正しさ検証** — 特にリファレンス実装に対する *differential testing*。IEEE 754 浮動小数点の準拠検証、TLS 実装の interop、POSIX 認証 — いずれも同じ規律に依拠している: 代表的な入力集合に対して、自分の実装が信頼できるリファレンスと一致することを証明する。本レッスンでは、その技法を「Revm vs 本番 EVM クライアント」に持ち込む。

例を 1 つ置く。Revm fork は「2.95 WETH 取れる」と予測したのに、実チェーンでは 2.93 しか取れない。この差は、そのまま損失になる。

同じリスクは本ティアの Revm 利用箇所すべてにある。レッスン1の searcher、レッスン7の aggregator、レッスン8の router が対象だ。Revm と mainnet 多数派クライアント（Geth / Nethermind）の挙動がずれると、誤差は静かに本番へ出る。ここでは約 200 行で差分検証ハーネスを作る。

> 📌 **スコープ。** ここでは単一 tx の \`gas + return data\` を JSON-RPC provider と照合する。実運用では state-diff、大量サンプル、fork 境界回帰、CI まで拡張する。学ぶ核は同じで、「一致の定義」と「低コスト検証の作法」である。

## 受け入れ条件

次のテストが pass したらレッスン完了（フルコードは末尾の §Test gate）:

1. **\`matches_provider_for_recent_blocks\`** — 直近 10 ブロックで、各 tx の Revm トレースが reference provider の \`debug_traceTransaction\` 出力と一致する。
2. **\`coverage_includes_create_and_call_paths\`** — CREATE / CREATE2 / CALL / DELEGATECALL / STATICCALL を行使する既知 tx が、それぞれ個別に reference と一致する。

**Test-first 読法。** 先に受け入れ条件を確認する。以下では、Revm トレースの構築と \`debug_traceTransaction\` 呼び出しを示す。ここが両テストの比較入力になる。

## なぜこれが重要か (本当の理由)

規律自体は安価。スキップした時のコストは現実 — bot の P&L、aggregator がユーザに見せる quote、router の脅威スコア、すべてがサイレントにズレる。[Reth チームのベンチマーキング哲学](https://www.paradigm.xyz/2024/04/reth-perf) より: 「mainnet 挙動からの逸脱はどれもバグ」。それが基準。

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

> 🛑 **予測。** Revm の spec が mainnet とずれている場合、検証ハーネスにはどのような不一致として現れるか。答えを書いてから先へ進む。

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

1. **歴史的 mainnet トランザクション** — 既にマイニングされた tx を parent block でリプレイする。receipt が gas_used の正解で、provider の \`eth_call\` が parent block での return data の正解。
2. **現状 state に対する仮想的な call** — contract + メソッド (例: \`USDC.balanceOf(some_holder)\`) を選び、provider の \`eth_call\` と Revm fork で同じブロックで実行する。provider のレスポンスが正解。

種類 2 の方が始めるのが簡単 (歴史的 RPC が不要) なので、それを構築する。種類 1 は drill で扱う。

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

ポイント:

- **\`eth_call\`** — state を永続化せず、実行結果 bytes を返す。
- **\`eth_estimateGas\`** — 実行に必要なガス見積もりを返す（安全バッファ込み）。
- **同一ブロック固定** — provider と Revm を同じ block に pin して比較条件をそろえる。

> 🔍 **リポで探す。** [\`alloy_provider::Provider\`](https://github.com/alloy-rs/alloy/blob/main/crates/provider/src/provider/trait.rs) を開く。\`call\` と \`estimate_gas\` が同じ trait に属している — provider を切り替えても (Infura → QuickNode → 自前 Reth ノード) 、検証コードには何の変更も要らない。**それが抽象化の見返り。**

## Step 3: 同じ call をローカルで Revm 経由で走らせる

L1 / レッスン7と同じ fork パターン。Step 2 と同じブロックにピン留めする:

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

ポイント:

- **fork の固定** — \`AlloyDB::new(..., BlockId::number(block))\` で比較対象と同じ世界状態にする。
- **spec の一致** — \`Context::mainnet()\` は mainnet 用。L2 検証時は対応 spec に切り替える。
- **caller** — view call なので \`Address::ZERO\` で十分である。

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

ポイント:

- **bytes は完全一致** — 1 byte でも違えば下流 decode が変わるため、厳密比較する。
- **gas は近似比較** — \`eth_estimateGas\` は安全バッファを含むため、許容幅付きで比較する。
- **ログ拡張** — 最小実装は \`println!\` で十分。本番は構造化ログへ拡張する。

> 🛑 **理解度チェック。** なぜ byte 出力は完全一致比較で、ガスは近似比較なのか。 \`eth_estimateGas\` が \`evm.transact_one\` より広い範囲を扱う点で一文で答える。

## Step 5: 一致しないとき — デバッグ分類

実際の validation を走らせると不一致が見つかる。診断ツリー:

| 症状 | 想定原因 | 修正 |
| :--- | :--- | :--- |
| **本来非ゼロのはずの出力が一貫して 0x もしくは空** | Revm の spec が違う (例: \`Context::mainnet()\` で構築したがチェーンは op-mainnet) | チェーン spec に合わせる: \`OpEvm\`、\`Context::op_mainnet()\` など |
| **ハードフォーク境界でだけ出力が違う** | Revm のハードフォーク有効化ブロックがチェーンと不一致 | Revm の spec をそのブロックでアクティブな実ハードフォークにピン留めする — \`SpecId\` 参照 |
| **contract が precompile を呼ぶときだけ出力が違う** | Revm にないカスタム precompile (例: 一部の レッスン2でアクティブな RIP-7212 secp256r1) | precompile を Revm の precompile registry に追加する (L6 参照) |
| **出力がぶれる — 同じ入力で時々一致、時々違う** | RPC キャッシング。provider が違うブロックの古い state を返した | 確定ブロック (latest から ~32 引いた値) にピン留めして再実行する |
| **ガスが固定オフセットでずれる** | intrinsic gas の会計が違う (21,000 base をスキップした、あるいは逆) | 整合性確認: 測っているのは call のガスだけか、tx 全体のガスか? |
| **ガスがランダムにばらつく** | hot vs cold ストレージアクセス。provider が直近 call で warm state を持っている | クリーンなサイクル後に再実行するか、warm/cold を制御可能な合成 state で fork する |

実用上、上位 3 行に大半が落ちる — チェーン spec / ハードフォーク / precompile の不一致。

## Production レベル validation に足りないもの

| ギャップ | 実 validation ハーネスが何をしているか |
| :--- | :--- |
| **サンプリング戦略** | 直近 7 日のランダムな歴史的 tx を 1000 件、全部 validate する。系統的なドリフトを見つける |
| **State-diff 比較** | \`debug_traceTransaction\` の prestate + statediff モードで byte レベルの state 変化を取得し、Revm の journal entry と比較する (高コスト RPC なのでサンプリングは疎にする) |
| **ハードフォーク回帰** | Revm 更新後、直近 5 個のハードフォークブロック周辺で再 validate する。新 Revm バージョンは spec の有効化を変えることがある |
| **カスタム precompile への対応** | Revm のセットアップは対象チェーンの全 precompile を含む必要がある。RIP-7212、EIP-2537、カスタム op-stack precompile、MEV-Share ヘルパ precompile など |
| **CI 統合** | validation を CI パイプラインに含める。diff の許容範囲を超えたら merge を失敗させる |
| **マルチ provider クロスチェック** | 同じ validation を 2-3 個の provider (QuickNode、Infura、Alchemy) に対して走らせる。provider 同士が同意しないなら validation の前提が崩れているので、どれかを正解として選ぶ |
| **Performance** | provider の答えをキャッシュし、変更されたレッスンのみ再 validation する。RPC 料金を削減 |

上記のカーネルを作り、production グレードな習慣はニーズに合わせて足していく。大半のチームは少数の手選びのテストケースから始めて育てていく。

## Drill

1. **歴史的 tx の再実行。** 実 mainnet tx hash を選ぶ。receipt を取得 → parent block を fork ポイントに → receipt.gas_used を Revm 再実行時の gas_used と diff する。(1 時間)
2. **カスタム precompile のケース。** op-stack チェーン (Base、Optimism) を選ぶ。op-stack にはあるが mainnet にはない precompile を使う tx (例: L1 block info precompile) の validation を試みる。失敗モードを観察する。**diff は何を示すか?** (1 時間)
3. **サンプリングハーネス。** validate 関数を、単一 contract (Uniswap V3 router はトラフィックが多い) の直近 100 個の成功 tx を辿るループで包む。pass/fail を集計する。**失敗率は? 失敗パターンは系統的かランダムか?** (2 時間)
4. **マルチ provider クロスチェック。** 同じ validation を QuickNode + Alchemy に対して走らせる。両者が同じブロックの同じ call で同意しないなら、validation ハーネスの前提について何が言えるか? (1.5 時間)
5. **CI への組み込み。** 任意の失敗で exit-code 1 になるよう validation スクリプトを修正する。GitHub Action に組み込んで mainnet に対し nightly 実行する。baseline 比 >0.1% の不一致率を持ち込む PR は失敗扱いにする。(3 時間)

Drill 5 を完成させれば、本気の Revm ベース searcher / wallet / aggregator チームが出荷している継続検証の規律と構造的に同じものができる。**「ラップトップで動く Revm コード」と「production で信頼できる Revm コード」を分ける規律。**

> 🛑 **最終チェック。** 一文で: なぜこのティアで レッスン1〜8 を作ることが、**同時に**この validation lesson を作ることを要求するのか? 答えに「Reth が ~7-12% のクライアントシェア」と「シミュレーションの正しさは Reth ではない 88-93% との一致に依存する」が繋がっていないなら、冒頭を読み直す — それがこのレッスンがティアの最後にいる全理由。

## Test gate

*Test gate — この tier では全アプリがテスト green で初めて完了* に従い、**本レッスンはティアの残り全部の test gate そのもの** — だがそれ自身にも gate がある: **Revm 以外のプロバイダに対する、最近の小範囲ブロックでの differential トレーステスト**。

レッスン全体の前提は「Revm のトレースが Geth/Erigon の \`debug_traceTransaction\` 出力と一致する」というもの。テストはその主張を機械的にチェック可能にする。

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

両方が実 recent-block 範囲で pass するまで — 延いてはあなたが L1–レッスン8で作ったもの全部への信頼まで — レッスンは **未完了**。1 件でも乖離したら、シミュレーションは何かについて嘘をついていて、L1–レッスン8の sim 依存判断のどれが間違いだったかを、それを最初に見つけずには知ることができない。

## 📺 関連動画

\`\`\`youtube
Nh19f_2fWLc | Dragan Rakita — EVM Technical walkthrough — Revm が production と一致するために従う必要のある spec
\`\`\`

---

## Building tier 完走 (今度こそ本当に)

「arb のアイデアがある」から「Revm が production の Geth と一致することを保証できる」まで網羅する 10 lesson:

1. 最小 MEV searcher (mempool → fork-sim → arb)
2. Reorg-aware Postgres indexer (ExEx + reorg ディスパッチ)
3. カスタム RPC エンドポイント (jsonrpsee + extend_rpc_modules)
4. Wallet backend (signer pool + nonce mgr + replace-on-stuck)
5. EIP-7702 sponsor (Type 4 tx + paymaster パターン)
6. Foundry スタイル cheatcode (custom precompile + ハーネス)
7. Swap aggregator (Revm fork + venue 横断 quote)
8. Frontrun-resistant order router (capstone — 1-7 統合)
9. **Cross-client validation harness (本レッスン)** — 上記 8 本を「デモ」から「production-trusted」へ
10. Machine-payments エンドポイント (HTTP 402 + MPP) — 上記の有料化レイヤ

ターゲットの雇用主 / プロジェクトに最も近い build を選ぶ。Production ギャップを埋める。小さな public リポとして公開する。**それが会話に持っていく成果物。**

> **🧭 ここまでで積み上げたもの:** **コンパイラ / VM 層の正しさ検証** を出荷した — Revm fork と production JSON-RPC provider の differential trace 比較を、ガス + 戻り値の一致と CREATE / CALL のカバレッジでテストゲートとして固めた。IEEE 754 準拠検証や TLS interop と同じ規律を、Revm に持ち込んだかたち。本ティアの他のアプリ (L1、L7、L8) はすべて、この検証層に依存している。次のレッスンでは **ネットワーク層の支払いプロトコル** — HTTP 402 + MPP — を、本ティア全体の上に乗せる有料化エッジとして見る。
`,
                },
                {
                  title: 'Machine Payments — HTTP 402 と Tempo MPP スタック',
                  slug: 'build-mpp-payments-ja',
                  type: 'CONTENT',
                  sortOrder: 10,
                  duration: 16,
                  xpReward: 40,
                  content: `# Machine Payments — HTTP 402 と Tempo MPP スタック

> 🧭 **systems engineering スタックでの位置:** **ネットワーク層の支払いプロトコル** — HTTP のセマンティクスを、暗号的な決済で拡張したもの。TLS が HTTP を暗号で拡張したのと同じ、OAuth が HTTP を委任認可で拡張したのと同じ、rate-limit ヘッダがコスト信号で拡張したのと同じパターン。MPP は「HTTP + リクエスト単位の決済」を表現するプロトコル層で、アカウントも API キーも持たずに pay-per-call を必要とする自律エージェントのために設計されている。

2026 年の有料 API には同じ摩擦がある。サインアップ、メール認証、API キー、請求設定、プラン契約を経て、ようやく 1 回呼べる。

SaaS 利用者には許容できても、単発呼び出しの自律エージェントには重すぎる。この摩擦自体が UX を壊している。

**Machine Payments Protocol (MPP)** はこの前提を変える。流れは単純で、\`402 challenge\` → 支払い → \`Authorization: Payment\` 付き再試行 → \`200 OK\` である。

アカウント登録や API キー発行は不要。サーバが受け付ける rail（Tempo / Stripe / ACH / Lightning / card など）で、リクエスト単位の支払いを行える。

本レッスンでは、3 つのソースを並行して読んでいきます: 仕様 ([\`tempoxyz/mpp-specs\`](https://github.com/tempoxyz/mpp-specs))、Rust SDK ([\`tempoxyz/mpp-rs\`](https://github.com/tempoxyz/mpp-rs))、そしてエンドツーエンドで動く CLI ([\`tempoxyz/wallet\`](https://github.com/tempoxyz/wallet))。

> 📌 **仕様ステータス — 期待値を正しく持つ。** MPP は *IETF ドラフト* ([draft-ryan-httpauth-payment-00](https://datatracker.ietf.org/doc/draft-ryan-httpauth-payment/)) であり、批准済みの標準ではない。ワイヤフォーマットの細部はまだ変わる可能性がありる。今すぐ実装に使える程度に安定しているのは *全体像* — HTTP 402 + \`Payment\` 認証スキーム — と Tempo / Stripe のリファレンス実装である。細部はドラフト扱い、アーキテクチャ全体を学習対象として扱ってしてほしい。

## 受け入れ条件

次のテストが pass したらレッスン完了（フルコードは末尾の §Test gate）:

1. **\`returns_402_without_payment\`** — \`X-PAYMENT\` 無しのリクエストは \`402\` を返し、コストと受取アドレスを含める。
2. **\`returns_resource_with_valid_payment\`** — 同じリクエストに有効な micropayment を *付ければ* \`200\` + リソース本文を返す。
3. **\`rejects_replayed_payment\`** — 同じ payment 受領は 2 リクエストを満たせない。2 回目は \`402\` または \`409\` を返す。

**Test-first 読法。** 先に受け入れ条件を確認する。以下では、402 challenge 形式、payment 受領構造、replay 防止メカニズムを示す。これがテストで固定する契約である。

## 誰も使わなかったステータスコード

HTTP 402 は 30 年前に「将来の用途のため」予約されました。誰も使わないまま、web は API キー、OAuth、Stripe Checkout など「ネイティブな支払いステータスコードを *持たない* ことを補う回避策」によって成長してきた。MPP はこの 402 を本気で活用しようとした最初の仕様である。

完全なフロー — [\`mpp-specs/README.md\`](https://github.com/tempoxyz/mpp-specs/blob/main/README.md) のとおり:

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

5 ステップ。各ステップの担当を読み解いてください:

1. クライアントが \`GET /resource\` — キャッシュなし・未認証の通常の GET と同じ形。
2. サーバが \`402 Payment Required\` + \`WWW-Authenticate: Payment <challenge>\` を返す — challenge には *何の* 支払いが必要か、*どの rail* が受け付けられるかがエンコードされている。
3. クライアントが **HTTP の外で**(out-of-band で)支払いを履行する — Tempo のオンチェーン charge、Stripe Shared Payment Token、Lightning invoice など。プロトコルはどの rail を使うかを問わない。
4. クライアントが \`Authorization: Payment <credential>\` を付けて \`GET /resource\` を再試行。credential が支払い済みの証明になる。
5. サーバが検証して \`200 OK\` を返す。

設計の中立性はステップ 3 にある。支払い処理は HTTP ラウンドトリップ外に置き、プロトコル本体はハンドシェイク（1,2,4,5）のみを規定する。決済 rail は challenge で委譲する。この分離が拡張性を作る。

> 🛑 **予測。** \`WWW-Authenticate: Payment\` を rail 非依存にする理由は何か。1 つの rail に固定したときに壊れる点を一文で答える。答え合わせは後半で行う。

## 3 層 — Core / Intents / Methods

仕様 repo がモジュール化されているのには明確な理由がありる。[\`tempoxyz/mpp-specs/specs/\`](https://github.com/tempoxyz/mpp-specs/tree/main/specs) を開いてしてほしい。重要な 3 つのサブディレクトリ:

| 層 | パス | 何を定義するか |
| :--- | :--- | :--- |
| **Core** | [\`specs/core/\`](https://github.com/tempoxyz/mpp-specs/tree/main/specs/core) | HTTP 402 のセマンティクス、\`Payment\` 認証スキーム、ヘッダ文法、IANA レジストリ。payment-rail 非依存 |
| **Intents** | [\`specs/intents/\`](https://github.com/tempoxyz/mpp-specs/tree/main/specs/intents) | 抽象パターン: charge、authorize、subscription。*どんな種類* の支払いかを規定するが、*どう* やるかは規定しない |
| **Methods** | [\`specs/methods/\`](https://github.com/tempoxyz/mpp-specs/tree/main/specs/methods) | rail 別の具体実装: \`tempo/\`、\`stripe/\`、\`evm/\`、\`solana/\`、\`stellar/\`、\`lightning/\`、\`card/\` |

この分割が解く問いは 1 つである。**複数 rail に対応する 1 つのクライアントをどう保つか。** 解は Core / Intents / Methods の分離だ。Core は HTTP メカニクス、Methods は rail 固有実装、Intents は両者の接続を担う。

もし Core に Tempo 固有の前提を埋め込んでいたら、Stripe 追加時に Core 全体の再設計が必要だった。実際は Methods 層への追加で済むため、プロトコル本体を壊さずに拡張できる。

> 🔍 **リポで探す。** [\`specs/core/draft-httpauth-payment-00.md\`](https://github.com/tempoxyz/mpp-specs/blob/main/specs/core/draft-httpauth-payment-00.md) の IANA セクションを確認する。新しい payment method 追加が Core 変更か、\`specs/methods/\` 追加かを答える。

## Rust SDK を 30 秒で

[\`tempoxyz/mpp-rs\`](https://github.com/tempoxyz/mpp-rs) を開いてしてほしい。SDK は仕様と同じ断層で分かれています — マーチャント側は [\`src/server/\`](https://github.com/tempoxyz/mpp-rs/tree/main/src/server)、購入側は [\`src/client/\`](https://github.com/tempoxyz/mpp-rs/tree/main/src/client)。

**サーバ側** — challenge を発行し、credential を検証する:

\`\`\`rust
use mpp::server::{Mpp, tempo, TempoConfig};

let mpp = Mpp::create(tempo(TempoConfig {
    recipient: "0x742d35Cc6634C0532925a3b844Bc9e7595f1B0F2",
}))?;

let challenge = mpp.charge("1")?;             // WWW-Authenticate の値を返す
let receipt = mpp.verify_credential(&credential).await?;
\`\`\`

\`Mpp::create\` は *payment provider* を引数に取ります — \`tempo(...)\`、\`stripe(...)\`、または自前のもの。返ってくる \`Mpp\` は challenge を発行し、credential を *rail に依存しない形で* 検証しる。provider を差し替えるだけでよく、サーバの他のコードは変更不要である。

**クライアント側** — 402 を透過的に扱う:

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

\`PaymentMiddleware\` は reqwest クライアントをラップしる。ミドルウェアが 402 レスポンスを受け取り、challenge をパースし、provider を呼び出して支払いを履行し、\`Authorization: Payment\` ヘッダを付けて再試行する。呼び出し側から見れば、MPP 対応エンドポイントに対して \`.get(...).send()\` がそのまま機能しる。

> 🔍 **リポで探す。** [\`src/client/middleware.rs\`](https://github.com/tempoxyz/mpp-rs/blob/main/src/client/middleware.rs) の再試行処理と、[\`src/server/mpp.rs\`](https://github.com/tempoxyz/mpp-rs/blob/main/src/server/mpp.rs) の challenge 発行箇所を確認する。新しい provider 追加時の最小変更（\`PaymentProvider\` / \`ChargeMethod\` 実装）を説明する。

## なぜ Intents が必要か — agent スケール問題

> 🛑 **予測。** ある agent が 1 分間に 1000 件の有料 API リクエストを送るとしる。これを 1000 件のオンチェーン Tempo トランザクションで処理しようとすると、何が壊れるか? プロトコルの *Intents* 層は、これを解決するために何を提供しているか?

(答え: 1000 件を都度オンチェーン決済すると遅延と手数料で破綻する。Intents は \`charge\` と \`authorize/subscription\` を分離し、セッション単位のまとめ払いを可能にする。Core は challenge/credential のみを扱い、チャネル詳細は Intents が担う。)

該当ディレクトリ: [\`specs/intents/draft-payment-intent-charge-00.md\`](https://github.com/tempoxyz/mpp-specs/blob/main/specs/intents/draft-payment-intent-charge-00.md) が現時点で公開されている唯一の intent ドラフト。authorize と subscription は README によればロードマップに記載されている。

## プロトコルから production へ — \`tempo wallet\`

[\`tempoxyz/wallet\`](https://github.com/tempoxyz/wallet) は MPP の正規の動作統合例である。MPP がビルトインされた CLI ウォレットで、3 つのコマンドで全フローが実行できます:

\`\`\`bash
tempo wallet login                        # passkey ログイン、ブラウザが開く
tempo wallet fund                         # 残高をトップアップ
tempo request https://aviationstack.mpp.tempo.xyz/v1/flights?flight_iata=AA100
\`\`\`

3 番目がレッスンの中核である。\`tempo request <url>\` が 402 のやりとり全体 — challenge、署名、支払い、再試行 — を実行し、レスポンス本体を表示する。API キー不要、請求アカウント不要、*ウォレットがあって資金が入っているだけ* で済みる。

ウォレットがサポートする支払い形態は 2 つ、[README](https://github.com/tempoxyz/wallet/blob/main/README.md) のとおり:

| 形態 | トレードオフ | 使うとき |
| :--- | :--- | :--- |
| **One-shot (charge)** | リクエストごとに独立してオンチェーン決済。セッション状態なし | 単発の有料コール、低頻度のアクセス |
| **Session (channel)** | オンチェーンチャネルを 1 度開く。オフチェーン voucher をリクエストごとに交換。close 時に決済 | ストリーミング (SSE のトークン単位課金など)、同一エンドポイントへの反復コール |

セッションモードは、先ほどの「1 分あたり 1000 リクエスト」予測に対する Intents 層からの答えを具体化したものである。

もう一歩踏み込んだ設計ポイント: ログインフローは **passkey** (Touch ID / Face ID / ハードウェアキー) を使って **スコープ付きセッションキー** — 時限・上限金額・チェーンバウンド — を認可し、CLI はそれを使って署名する。passkey 自体はブラウザの外に出ません。CLI が保持しているのは制限付きクレデンシャルであり、root キーではない。これは agent に権限を渡すときに採用すべきパターンと同じです — 全権の鍵は渡さず、期限と権限を絞ったキーを渡す。

> 🔍 **リポで探す。** [\`ARCHITECTURE.md\`](https://github.com/tempoxyz/wallet/blob/main/ARCHITECTURE.md) を確認し、(1) passkey 由来セッションキーの保持層、(2) \`PaymentProvider\` を MPP ミドルウェアへ渡す層、の 2 点を答える。

## 冒頭の予測に答える

**なぜ \`WWW-Authenticate: Payment\` は Tempo に固定されず、拡張可能なのか?** 1 つの rail を埋め込んだ瞬間、別の rail を使いたい人すべてからプロトコルを fork されることになるからである。Stripe が MPP を共同 maintain できているのは、Core が rail 中立だからこそ — Stripe は \`methods/stripe/\` ディレクトリを寄贈しているのであり、Core を編集しているわけではない。Lightning、ACH、将来登場するあらゆる rail も同じ形で追加されていきる。

これは [artemis](./build-mev-searcher-ja) (Collector / Strategy / Executor) や [validate-revm](./build-validate-revm-ja) のクロスチェック (Alloy \`Provider\` trait による provider 非依存) でも見たのと同じ trait 分割の規律である。本気のプロトコル/フレームワークは毎回これを繰り返す: *メカニクス* と *ポリシー* と *具体実装* を分離する、そうすれば将来の変更コストが下がる。

## なぜこれが「自分で作るもの」にとって重要か

2 つの角度、どちらも実用的です:

- **有料サービスを提供する側として。** エンドポイントを \`Mpp::create(tempo(...))\` (または Stripe、または両方) でラップしる。agent もアプリも 1 リクエストごとに支払える。請求インフラ不要、API キー発行不要、レートリミットダッシュボード不要、Stripe ポータルの統合も不要。各リクエストに見合う金額を charge すれば、プロトコルが決済まで済ませてくれる。レッスン7のアグリゲータ、レッスン3のカスタム RPC エンドポイント、レッスン6の cheatcode harness — どれもこの形で有料化できる。

- **有料サービスを利用する側として。** \`PaymentMiddleware\` を reqwest クライアントに足すだけ。agent — もしくはインデクサ、バリデータの監視スタック — がベンダごとの統合なしに、MPP 対応エンドポイントに支払える。レッスン1の MEV searcher が有料 mempool feed を欲しい? MPP を差し込む。レッスン4の wallet backend が有料 data oracle を欲しい? MPP を差し込む。L8 capstone のルータが有料 private order flow を欲しい? MPP を差し込む。

追いかける価値のある実プロダクトのアイデア: *この粒度では agent しか欲しがらない* 有料サービス — 単発のフライト状況、単発のプライシング oracle、トークン単位課金の単発 LLM 補完など。人間向け API はこの粒度では小さすぎて値付けできない、しかし agent 向け API ならできる。MPP がリクエスト単位の決済を安価にしているからである。

## リコールチェックリスト

次に進む前に、スクロールせずに次の問いに答えられることを確認してほしい:

1. MPP が活用する HTTP ステータスコードは? サーバの \`WWW-Authenticate\` ヘッダはどう見えるか?
2. 仕様の 3 層を挙げ、各層が何を定義しているか述べる。
3. SDK サーバ側で \`Mpp::create(tempo(...))\` は何を提供してくれるか? クライアント側で \`PaymentMiddleware\` は何をするか?
4. Intents 層が Core から分離されているのはなぜか? 具体的なシナリオを 1 つ挙げる。
5. \`tempo request\` の one-shot モードとセッションモードのトレードオフは?

2 か 4 でつまずいたら、次のレッスンに進む前に Core / Intents / Methods の章を読み直してしてほしい。

## ドリル

1. **IETF ドラフトを読む。** [\`specs/core/draft-httpauth-payment-00.md\`](https://github.com/tempoxyz/mpp-specs/blob/main/specs/core/draft-httpauth-payment-00.md) を開く。\`Payment\` スキームが定義するヘッダフィールド 3 つと、各々が何を運ぶかを自分の言葉で言えるまで読む。(45 分)
2. **有料エンドポイントを立てる。** [\`mpp-rs\`](https://github.com/tempoxyz/mpp-rs) を clone し、[\`examples/\`](https://github.com/tempoxyz/mpp-rs/tree/main/examples) を参考に、1 ルートで 0.01 を charge する axum サーバを動かす。curl で叩いて 402 を観察、\`tempo request\` で叩いて 200 を観察する。(2 時間)
3. **既存サービスをラップする。** これまでのレッスンで作った成果物のうち 1 つを選ぶ — たとえば レッスン3のカスタム RPC エンドポイント。\`mpp\` の axum 統合を追加し、コールごとに charge する。ウォレットで検証。(3 時間)
4. **セッションをトレースする。** 有料 SSE エンドポイントに対してセッションモードで \`tempo request\` を実行し、ネットワークをトレースする: チャネルはいつ open するか? voucher はいつ交換されるか? いつ決済されるか? \`tempo wallet sessions list\` と \`close\` で状態を確認する。(1.5 時間)
5. **カスタム provider を実装する。** SDK にない payment rail を 1 つ選ぶ (好きな レッスン2のネイティブ資産など)。\`PaymentProvider\` (クライアント側) と \`ChargeMethod\` (サーバ側) を実装。自分の有料エンドポイントに対してテストする。*抽象が本当に役に立つかどうかのテスト* である。(4 時間)

ドリル 3 まで進めば、本物のインフラにデプロイ可能な有料エンドポイントを持っていることになる。ドリル 5 まで進めば、プロトコルを自分で拡張できるレベルまで内在化できたと言える。

> 🛑 **最終チェック。** 一文で答えてほしい: API キーと Stripe Checkout の組み合わせでは agent に提供できないもののうち、MPP が提供してくれるものは何か? 答えに *リクエスト単位決済、アカウント不要、rail ロックイン不要* が入っていなければ、冒頭を読み直してほしい — その 3 点こそが本プロトコルが存在する理由のすべてである。

## Test gate

*Test gate — この tier では全アプリがテスト green で初めて完了* に従い、本レッスンの最低 gate は、有料ユーザを締め出すか攻撃者にダブルスペンドさせるかの失敗モード 2 つを潰す:

1. **支払い無しで 402、有効な支払いで 200** — プロトコルの本契約。\`X-PAYMENT\` ヘッダ無しのリクエストは 402 を返し、コストと受取アドレスを含める。同じリクエストに有効な micropayment を *付ければ* 200 + リソースを返す。
2. **Replay 防止** — 同じ micropayment 受領は 2 リクエストを満たせない。（これがないと、攻撃者が 1 つの有効な \`X-PAYMENT\` ヘッダを捕捉して、無制限にあなたのエンドポイントを drain できる。）使用済み受領を使った 2 回目のリクエストは 402 を（または設計次第で 409 \`Conflict\` を）返す。

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

3 つすべてがエンドポイントをローカル起動した状態で pass するまで（payment leg は forked Tempo testnet か anvil で）、レッスンは **未完了**。replay テストで fail する 402 エンドポイントは、URL を見つけた誰かが来るのを待っている wallet drainer である。

> **🧭 ここまでで積み上げたもの:** **ネットワーク層の支払いプロトコル** を出荷した — HTTP 402 の challenge、micropayment receipt、replay 防止。TLS が HTTP を暗号で拡張したのと同じ抽象パターンを、決済に持ち込んだかたち。これで本ティア 11 レッスンが完了 — systems engineering スタックの各層（ネットワーク、DB、VM、認証、並行性）に対して、エンドツーエンドで構築されテストゲートで動作が証明されたアプリケーションが、それぞれ少なくともひとつ揃った。**本ティアの約束が、ここで履行された。**
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
