import { PrismaClient } from '@prisma/client';

export async function seedRethBuildingJA(prisma: PrismaClient) {
  const tags = ['reth', 'revm', 'alloy', 'rust', 'mev', 'building', 'application', 'capstone'];

  await prisma.course.create({
    data: {
      slug: 'reth-building-ja',
      title: 'Building with the Stack — 実アプリを作る',
      description:
        'ソースを読めるのは前提条件、このティアはその payoff です — Rust + Alloy + Revm の動くアプリ 10 本: 最小 MEV searcher、reorg-aware Postgres indexer (ExEx)、カスタム RPC エンドポイント、wallet backend、EIP-7702 sponsor、Foundry スタイル cheatcode、swap aggregator、すべてを統合する frontrun-resistant order router の capstone、cross-client validation harness、そして HTTP 402 + MPP による agent 向け machine-payments エンドポイント。',
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
                  title: 'Test gate — この tier では全アプリがテスト green で初めて完了',
                  slug: 'building-test-gate-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 18,
                  xpReward: 35,
                  content: `# Test gate — この tier では全アプリがテスト green で初めて完了

> 🧭 **systems engineering スタックでの位置:** インフラ企業が共通して採用する **品質保証 (QA) の規律**。TigerBeetle、Cloudflare、PostgreSQL — 本気のインフラを ship しているチームで「読んでみたら正しそうだった」が答えになる組織はひとつもありません。このティアはあなたのアプリにも同じ基準を適用します。

ここまでの 4 ティアではソースを **読んで** きました。ここから先は **作る**。読み続けたあとに陥りがちなのは、コードを書いて、自分で読み返して、「正しそうだ」と納得して次に進むことです。**この tier はその失敗モードを構造的に潰すために設計されています。**

ここから先のルール：**テストスイートが green になるまでレッスンは完了ではない。** 「読んだ、作った、たぶん動く」では駄目。green か、未完了か、そのどちらか。

> 🛑 **予測。** なぜこのルールは Building (Expert) では厳しく、Foundations / Intermediate では適用されないのか? 先を読む前に仮説を立てる。

---

理由：Foundations と Intermediate では、**他人がすでに正しさを証明したコード**（Reth/Revm/Alloy のメンテナが自分でテストスイートを回している）を読んでいた。読むことは設計判断に触れる行為で、何も自分で defend する必要がない。**自分で MEV searcher・インデクサ・ウォレットバックエンドを書いた瞬間、そのコードの「正しさの証明」はあなたになる。** テストが無ければ、その証明は存在しない — 意見しかない。

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

各行が最低ライン。実際の本番システムはこの上に fuzz、invariant、chaos テストを積みます。

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

Revm ベースのシミュレータ（cheatcode・swap aggregator・validation app）を作るとき、正しさは **「自分の出力が正しそうに見える」ではなく**「同じ入力に対して信頼できる参照実装と出力が一致する」**こと。その参照実装は Revm 以外のプロバイダ（Geth、Erigon、Alchemy の \`debug_trace\`）です。

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

## 「テストは後で書く」について

ここで一番よく出る読者の反論：「先にプロトタイプを作って、設計が固まったらテストを足す」。一見もっともらしい。違う。

本番 EVM 工学で、テストはコードの検証ではない — **コードがどう振る舞うべきかの実行可能な仕様** だ。プロトタイプ後にテストを書くと、仕様をコードから派生させることになる。つまり仕様は「コードがたまたまやっていること」になる、バグも含めて。先に（あるいは並行して）テストを書けば、仕様をコードから独立して articulate することになり、それに合わせてコードを曲げることになる。バグの発見はその非対称性から自然に生まれる。

Reth・Revm・Foundry のメンテナは全員、test-first か test-alongside で働く。「コードを先に書いてテストを後で足す」工程から「本番品質の EVM コード」が生まれるバージョンは存在しない。**このティアはあなたを同じ基準に立たせる。**

## 準備完了

次のレッスン — *最小限の MEV Searcher を Rust で作る* — を一度通読する。次に、searcher のコードを書く前に、上の表の 1 行目のテストを先に書く。実装無しで fail させる。それから pass するまで作る。

その順序 — テストが先、コードが後 — が gate。

> **🧭 ここまでで進んだ場所:** 品質保証規律を tier の入口に据えた。TigerBeetle・Cloudflare・PostgreSQL が共通して採用している『テストで証明してから ship する』を、本 tier の 10 アプリすべてに一律で適用する。次のレッスンから建設開始 — MEV searcher が最初、test gate を実装の前に置く。
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

> 🧭 **systems engineering スタックでの位置:** **ネットワーク層 + 並行性層** の組み合わせ。searcher は複数のソース（mempool・新ブロック）から pull してアクションを dispatch する event-driven パイプライン — Kafka Streams のトポロジ、Flink ジョブ、HFT のオーダーハンドリングシステムと同じ形。\`artemis\` はその発想を MEV に当てはめたもの。

「あなたなら bot をこう組み立てる」という greenfield のウォークスルーは、production の本当の形を誤魔化してしまう。本物の searcher は \`main.rs\` から始めない。**フレームワーク** から始める — そして読むべきは Paradigm の [\`artemis\`](https://github.com/paradigmxyz/artemis)、Paradigm がオープンソース化し自社でも使い続けている Rust 製 MEV bot フレームワークです。

repo を開く。読む。本レッスンはそれを案内します。

> 📌 **なぜこれが正しい出発点か。** public mempool の監視、swap のデコード、Revm でのフォークシミュレーション、Flashbots bundle の構築 — どの searcher もやっていること。面白い問いは「これらを1回書けるか?」ではない。「次の strategy を ship するときに書き直しにならないように、これらをどう組織化するか?」です。それこそ artemis が答える問い。MEV ロジックはあなたのもの; オーケストレーションは借り物。

## 受け入れ条件

次のテストが pass したらレッスン完了（フルコードは末尾の §Test gate）:

1. **\`finds_known_arb_at_pinned_block\`** — 既知の arb があった pin した mainnet ブロックで、strategy が正の期待 P&L を持つ \`Action\` を吐く。
2. **\`retracts_action_on_reorg\`** — 合成 \`ChainReorged\` 通知に対し、reorg されたブロックに依存した pending \`Action\` を strategy が取り下げる。

**Test-first 読法。** ここで一覧を眺めておく。下の walkthrough は、テストを書くために必要な型（\`Strategy<E, A>\`、\`Action::SubmitBundle\`）とパターン（forked Revm、mempool collector）を説明します。

## artemis アーキテクチャを一文で

searcher は **イベント処理パイプライン** です: 外部シグナルが入り、MEV ロジックが何をするか決め、アクションが出ていく。artemis はそのパイプラインを 3 つの trait と、それらを配線する engine に分割しています。

| コンポーネント | trait | 役割 |
| :--- | :--- | :--- |
| **Collector** | \`Collector<E>\` | 外部世界 → 内部イベント \`E\`。pending tx、新ブロック、marketplace order、MEV-Share ヒント — それぞれが独自の collector を持つ |
| **Strategy** | \`Strategy<E, A>\` | イベント \`E\` → 0 個以上のアクション \`A\`。MEV の脳。opportunity ごとに自分が書く唯一のファイル |
| **Executor** | \`Executor<A>\` | アクション \`A\` → 副作用。Flashbots bundle 送信、public mempool 送信、オフチェーン注文 post |

> 🛑 **スクロール前に予測。** なぜ Executor trait は Strategy trait と分離されているのか? *両者を融合させたら何が壊れるか* について一文で答えてください。答えを Step 5 まで保留。

## Step 1: trait を開く

中核の抽象は 1 ファイル、~120 行: [\`crates/artemis-core/src/types.rs\`](https://github.com/paradigmxyz/artemis/blob/main/crates/artemis-core/src/types.rs)。今すぐ開いてください。

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

これがフレームワークの契約のすべて。3 つのメソッド。2 つの generic パラメータ (\`E\` がイベント、\`A\` がアクション)。残り全部 — engine、channel、mapper — この 3 つの周りの配管にすぎない。

> 🔍 **リポで探す。** 同じファイル内で \`CollectorMap\` と \`ExecutorMap\` を探す。30 秒読む。**自分の言葉で:** \`CollectorMap\` は、新しい Collector を書かないと解けない問題を、何を解いてくれているか?

## Step 2: イベントの流れ — engine を読む

[\`crates/artemis-core/src/engine.rs\`](https://github.com/paradigmxyz/artemis/blob/main/crates/artemis-core/src/engine.rs) を開く。\`Engine<E, A>\` 構造体は 3 本の \`Vec<Box<dyn …>>\` を持つ — collector、strategy、executor それぞれ 1 本ずつ。\`run\` メソッドはコンポーネント 1 つにつき Tokio task を 1 つ spawn し、2 本の \`tokio::sync::broadcast\` channel で繋ぐ:

\`\`\`
collectors -- events --> [event channel] -- events --> strategies
                                                          |
                                                         actions
                                                          v
executors <-- actions <-- [action channel] <-- actions <--+
\`\`\`

broadcast — つまり全 strategy が全イベントを見、全 executor が全アクションを見る。あるイベントに興味がない strategy は \`vec![]\` を返す。あるアクションに興味がない executor は \`ExecutorMap\` でフィルタする。

**要点:** 新しい strategy を ship するには \`impl Strategy\` を 1 つ書いて \`engine.add_strategy(...)\` を呼ぶだけ。collector と executor は再利用される。

> 🛑 **リコールチェックポイント。** スクロールせずに: strategy 間の調整ロジックはどこにあるか? (答え: ない。engine は strategy を調整しない — 各 strategy は同じイベントストリームの独立した consumer。調整が必要なら、複数の collector を組み合わせて単一 strategy 内に持つ。)

## Step 3: 実物の Collector と Executor を探す

具体の実装体を見るまで抽象を信用しない。以下を開いて目を通すこと:

- [\`crates/artemis-core/src/collectors/\`](https://github.com/paradigmxyz/artemis/tree/main/crates/artemis-core/src/collectors): \`mempool_collector.rs\` (pending tx を subscribe)、\`block_collector.rs\` (新 head)、\`mevshare_collector.rs\` (private hint stream)、\`opensea_order_collector.rs\` (NFT marketplace)、\`log_collector.rs\` (フィルタ済みログ subscription)。
- [\`crates/artemis-core/src/executors/\`](https://github.com/paradigmxyz/artemis/tree/main/crates/artemis-core/src/executors): \`mempool_executor.rs\` (public 送信)、\`flashbots_executor.rs\` (Flashbots relay へ bundle)、\`mev_share_executor.rs\` (MEV-Share 提出)。

各ファイルは小さい — ~50〜100 行。特に \`mempool_collector.rs\` を開く:

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

これが mempool collector の全部。\`subscribe_pending_txs().transactions_unordered(256)\` パターンは、1 つずつではなく並列に — 並行数 256 — tx 本体をマテリアライズする。このファイルに **ない** ものに注目: MEV ロジックなし、デコードなし、strategy の関心事なし。collector の仕事は、型付きストリームを上流に push して黙ること。

## Step 4: 実物の Strategy — opensea-sudo-arb

ここから本題。[\`crates/strategies/opensea-sudo-arb/\`](https://github.com/paradigmxyz/artemis/tree/main/crates/strategies/opensea-sudo-arb) を開く。これは artemis ツリーに同梱されている唯一の strategy — OpenSea (Seaport) と Sudoswap (LSSVM プール) の間でアトミックにクロスマーケット NFT アービを取る。

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

この strategy には 2 つの collector が入力を供給する: block collector と OpenSea order collector。それだけ。

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

\`process_order_event\`: 新しい NFT 出品が OpenSea に届いた — その NFT に対して出品価格より高く払う気のある Sudoswap プールはあるか? あれば、OpenSea で買って Sudo プールに売り抜ける 1 tx を出すアトミックな arb コントラクトへの \`Action::SubmitTx\` を返す。

\`process_new_block_event\`: 新ブロックのログをスキャンして Sudo プールの state 変化 (buy / sell / spot price 更新) を拾い、内部の \`pool_bids\` マップを更新。アクションは出さない; state のメンテだけ。

> 🔍 **リポで探す。** 同じ \`strategy.rs\` 内で \`sync_state\` を探す。読む。**予測:** なぜこの strategy は開始前に「これまでに deploy された全 Sudo プール」を列挙する必要があるのか? 飛ばすと何が壊れる?

アービコントラクト自体は別の Solidity ファイル ([\`contracts/src/SudoOpenseaArb.sol\`](https://github.com/paradigmxyz/artemis/blob/main/crates/strategies/opensea-sudo-arb/contracts/src/SudoOpenseaArb.sol)) — strategy の仕事は機会を検出して calldata を整えること; アトミックな buy-sell はオンチェーンコントラクトが担う。

## Step 5: Step 1 の予測に答える

**なぜ Executor は Strategy と分離されているのか?** 同じ MEV opportunity を、その時点のチェーン状況に応じて 3 通りに提出しうるから: public mempool (安いが見える)、Flashbots bundle (private、アトミック)、MEV-Share (準 private、部分開示)。型付き \`Action\` を出して、engine がその日健康な executor へルーティングしてくれる strategy は **resilient**。\`flashbots_relay.send_bundle(...)\` をハードコードした strategy は Flashbots が degrade した日に死ぬ。

trait の分割は理論的な綺麗さではない — **MEV ロジックを触らずに提出経路を入れ替えるため** の構造。

> 🛑 **予測。** opensea-sudo-arb strategy に対して private mempool collector (例: Chainbound の Fiber、bloXroute) を足すなら、どこに足す? *具体的に:* どの trait を実装し、何を emit し、\`strategy.rs\` の何を (もしあれば) 変えるか?

(答え: \`Collector<OpenseaOrder>\` を実装する — または \`CollectorMap\` 経由で \`Collector<Event>\` を直接実装 — engine に register する。\`strategy.rs\` への変更はゼロ。これが「アーキテクチャが効いている」状態。)

## Step 6: 読みから出荷へ — 自分の bot

artemis を使って Tempo や MegaETH 上で 2-hop Uniswap アービ searcher (古典) を ship したいとしたら:

1. **再利用:** pending swap に \`MempoolCollector\`、新 head に \`BlockCollector\`、\`FlashbotsExecutor\` (または対象 L1 の bundle エンドポイント相当)。全部そのまま。
2. **書く:** \`Event = { NewBlock, PendingTx }\` / \`Action = { SubmitBundle }\` を持つ \`UniArbStrategy\` を 1 つ。\`process_event\` の \`PendingTx\` 分岐: swap をデコード、Revm で fork シミュレート、クロスプール spread を検出、bundle を構築。\`NewBlock\` 分岐: reserve cache をリフレッシュ、古くなった opportunity を捨てる。
3. **配線:** \`engine.add_collector(...)\` ×2、\`engine.add_strategy(UniArbStrategy::new(...))\`、\`engine.add_executor(...)\`、\`engine.run().await\`。

MEV ロジックの面積はファイル 1 つ。残り全部は借り物。

## 正直な比較 — artemis vs subway

artemis は自分の系譜を認めている。README の [Acknowledgements](https://github.com/paradigmxyz/artemis/blob/main/README.md#acknowledgements) を読む: [\`subway\`](https://github.com/libevm/subway)、\`subway-rs\`、\`rusty-sando\`。これらは **完成品** の MEV bot — 特に subway は TypeScript のサンドイッチ bot で、end to end で出荷済み、*何の MEV をやるか* について意見を持っている。

artemis はその逆: **フレームワーク** + 例として 1 つの strategy。subway は何を走らせるか教えてくれる。artemis はあなたが選んだものをどう組織化するかを教えてくれる。

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
5. 提出を public mempool から Flashbots に切り替えるとき、Strategy 実装の何を変えるか? (答え: 何も — 登録する Executor を入れ替える。)

2 と 4 で詰まったら、次のレッスンに行く前に Step 2 と Step 4 を読み直し。

## Drill

1. **新しい strategy を紙の上で設計する。** 本物の MEV opportunity を 1 つ選ぶ (Uniswap V3 JIT liquidity、Curve クロスプールアービ、perp funding-rate アービ)。紙の上で: どんな \`Event\` バリアントが必要か? どんな \`Action\` バリアントか? どの既存 collector / executor を再利用できるか? (30 分)
2. **1 イベントを end-to-end で追う。** mainnet の pending tx が \`MempoolCollector::get_event_stream\` に届いてから、仮想の \`SubmitTxToMempool\` アクションが実行されるまで、artemis のコードベース内の \`.await\` ポイントを全部列挙する。思っているより少ない。(45 分)
3. **collector を移植する。** [\`crates/artemis-core/src/collectors/\`](https://github.com/paradigmxyz/artemis/tree/main/crates/artemis-core/src/collectors) から 1 つ選び、\`ethers-rs\` から Alloy 1.x に翻訳する。trait シグネチャは変わらない; 下回りの provider だけが変わる。(2 時間)
4. **run loop を読む。** \`engine.rs\` をもう一度開く。\`run\` メソッドは \`collectors.len() + strategies.len() + executors.len()\` 個の task を spawn する。メッセージ経路を辿る: collector \`A\` からのイベントは、どうやって strategy \`B\` の \`process_event\` に届く? channel の型と receiver を答える。(30 分)
5. **スタブ strategy を載せる。** artemis を clone し、\`crates/strategies/\` 配下に新モジュールを足し、\`Strategy<Event, Action>\` を実装。\`process_event\` はイベントを log するだけでよい。\`MempoolCollector\` + スタブ + no-op executor を走らせる最小バイナリに配線する。無料の WS エンドポイントに対して \`cargo run\`。(3 時間)

Drill 5 まで終えれば、好きな MEV ロジックを流し込める artemis-based searcher の骨組みが手元にある。

> 🛑 **最終チェック。** 一文で: 一発書きの \`main.rs\` ではなく artemis を選ぶことで何が手に入るか? 答えに *strategy 間の再利用* または *提出経路の差し替え可能性* が入っていないなら、Step 5 を読み直し — その抽象が存在する理由の全部はそこ。

## Test gate

*Test gate — この tier では全アプリがテスト green で初めて完了* に従い、本レッスンの最低 gate は drill 5 のスタブ strategy に対するテスト 2 本：

1. **Forked-state 機会再現。** 既知の arb があったブロックを pin する（Etherscan + EigenPhi で候補が見つかる）。そのブロックの \`AlloyDB\` バック Revm に対して strategy を走らせる。strategy が正の期待 P&L を持つ \`Action\` を吐くことを assert。
2. **Reorg 整合性。** 合成 \`ChainReorged\` 通知を collector に流し込み、reorg されたブロックに依存する pending \`Action\` を strategy が正しく取り下げることを assert。(reorg 無視は MEV システムで最も多い本番障害モード — bundle を出す、チェーンが reorg する、会計はまだ「勝った」と主張している。)

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

両方が green になるまでレッスンは **未完了**。mainnet に対して \`cargo run\` できても \`cargo test\` できないなら、それはデモであって deliverable ではない。

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

各々が自己完結した ~200〜300 行の build、同じ predict / find-in-repo / anti-fluency スタイル。ターゲットユースケースに合うものから選ぶ。

> **🧭 ここまでで進んだ場所:** **ネットワーク層 × 並行性層** のアプリケーションを ship した — event-driven pipeline（artemis の collector → strategy → executor）を MEV に当てはめ、test gate（forked-state arb 再現 + reorg 整合性）で正しさを担保。Kafka Streams や HFT order handler が ship しているのと同じ形。次のレッスンで **DB 層** へ移る: ExEx 駆動の reorg-aware インデクサ。
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

> 🧭 **systems engineering スタックでの位置:** **データベース層**、特に OLTP + OLAP のデュアルストレージ問題。本気の分析プラットフォーム — Snowflake の分離型エンジン、ClickHouse + PostgreSQL の組み合わせ、リアルタイムデータウェアハウス — はどれも「point lookup と range scan を別々の場所に置く」設計を選んできた。\`tidx\` はその発想をチェーンデータに当てはめたもの。

Etherscan も Dune も indexer です。そのアーキテクチャは公開されていません。[\`tidx\`](https://github.com/tempoxyz/tidx) は公開されている — Tempo の EVM L1 向け production indexer で、オープンソース、実運用中。本レッスンではこのコードを読み解きます。何を選び、何が当たっていて、ソースを読まないと見えないトレードオフはどこか — それを見る。

リポを開く。読む。本レッスンはそのガイド。

> 📌 **これが正しい出発点である理由。** あらゆる「indexer を作る」チュートリアルは、データベース 1 つで足りるフリをする。production が現実に壁にぶつかるのは、2 種類のクエリ形が共存する瞬間: *「アドレス X から最新 10 件の transfer」* (point lookup — PostgreSQL の勝ち) と *「過去 1 年の日次 transfer 量」* (range scan — ClickHouse の勝ち)。tidx は両方のバックエンドに並列で書き込み、クエリを適合する方に振り分ける。**この dual-storage の決断こそがレッスン全体のテーマ。**

## 受け入れ条件

次のテストが pass したらレッスン完了（フルコードは末尾の §Test gate）:

1. **\`replays_committed_then_reverted\`** — N..N+5 を適用後 N+3..N+5 を reorg。各 height で PG の導出状態が golden reference と一致する。
2. **\`idempotent_under_replay\`** — 同じ通知を 2 回流しても no-op になる（クラッシュ復旧シナリオ）。

**Test-first 読法。** 下の walkthrough は、これらテストの fixture 入力を構築するために必要な dual-sink アーキテクチャと \`Notification::ChainCommitted\` / \`ChainReverted\` の形を説明します。

## OLTP vs OLAP の設計テンション、具体に

PostgreSQL のような row store は、各 transfer の全カラムをディスク上で隣接させる。「0xAlice からの最新 10 件」を答えるには、planner が \`from\` の index で 10 ページほどジャンプして返す。マイクロ秒。

ClickHouse のような column store は、**カラム単位**で隣接させる。「過去 1 年の日次 volume」を答えるには、何百万行に渡って \`value\` と \`block_timestamp\` の **2 カラムだけ** をスキャンして集計。これもマイクロ秒。各行の残り 12 カラムには触れていないから。

それぞれに相手の質問をすると死ぬ:

- PostgreSQL に *「過去 1 年の日次 volume」*: その範囲に Transfer を含む全ページの全行を read。ディスク律速。実データセットで数十秒〜数分。
- ClickHouse に *「0xAlice からの最新 10 件」*: ClickHouse には point-lookup index がない; スキャンする。答えが 10 行のためのムダ IO。

> 🛑 **スクロール前に予測。** もし PostgreSQL しかなかったら、indexer を殺すクエリクラスを 1 つ挙げよ。ClickHouse だけならどうか。両方の答えを頭に入れる — 残りのレッスンはこの両方の死を tidx がどう回避するかの話。

tidx の解: **両方に書き、read で振り分ける。** 同じチェーンデータが両エンジンに着地し、HTTP API はクエリに応じて (または明示的な \`?engine=\` で) エンジンを選ぶ。

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

Walk:

- **\`tokio::try_join!\`** — PG と CH の書き込みは sequential ではなく concurrent。Wall-clock コストは \`pg + ch\` ではなく \`max(pg, ch)\`。健全なノードなら両方とも 1 桁 ms。
- **PG は 1 トランザクション、CH は 4 つの直接 insert。** PostgreSQL の \`write_batch\` は 4 テーブル (blocks/txs/logs/receipts) を 1 トランザクションに入れる — クラッシュで部分書き込みが残らない。ClickHouse はマルチテーブルトランザクションをサポートしない — append-only なので、クラッシュ時の部分バッチは chunk-retry の仕事 ([\`src/sync/ch_sink.rs\`](https://github.com/tempoxyz/tidx/blob/main/src/sync/ch_sink.rs) の \`CH_MAX_RETRIES\` ループ)。
- **CH は \`Option\` 型。** ClickHouse を設定しなければ、tidx はクリーンに PG-only にデグレードする。OLAP クエリが使えなくなるだけ。

> 🛑 **予測。** 素朴な dual-sink だと、1 回のチェーン read が必ず 2 回の write になる。\`write_all\` が reader に与える順序保証は? 具体に: ブロック N について CH には未到達なのに PG にはあるという状況は起き得るか? \`try_join!\` の semantics を読んで答えよ。

(答え: 起き得る、ただし一瞬。\`try_join!\` は両方が成功した時点で return するが、その間 CH を先に叩いた reader は古い状態を見る。tidx はこれを受容する; ClickHouse の backfill cursor — \`sync_state\` の \`ch_backfill_block\` — はまさにこのギャップを事後修復するために存在する。)

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

RPC client が 1 つではなく 2 つ。なぜ? Realtime sync (チェーン head 追跡) は厳しいレイテンシ予算; backfill (古い gap 埋め) は帯域貪欲。両者が 1 つのコネクション制限付き pool を共有すると、遅い backfill が realtime を starve させて、ノードが目に見えて lag する。**別 client = 別 concurrency 予算。** ファイル冒頭の定数: \`REALTIME_RPC_CONCURRENCY = 4\`、\`BACKFILL_RPC_CONCURRENCY = 8\`。

> 🔍 **リポで探す。** 同じファイルで \`backfill_first\` と \`trust_rpc\` を見つける。それぞれ 30 秒ずつ読む。**自分の言葉で:** \`backfill_first\` はノード起動の何を変えるか? \`trust_rpc\` は何をオプトアウトするか?

## Step 3: スキーマ — 同じデータ、2 つの形

ここで OLTP/OLAP の二重性が抽象でなくなる。両方を並べて開く:

- PostgreSQL: [\`db/blocks.sql\`](https://github.com/tempoxyz/tidx/blob/main/db/blocks.sql), [\`txs.sql\`](https://github.com/tempoxyz/tidx/blob/main/db/txs.sql), [\`logs.sql\`](https://github.com/tempoxyz/tidx/blob/main/db/logs.sql), [\`receipts.sql\`](https://github.com/tempoxyz/tidx/blob/main/db/receipts.sql)
- ClickHouse: [\`db/clickhouse/blocks.sql\`](https://github.com/tempoxyz/tidx/blob/main/db/clickhouse/blocks.sql), [\`txs.sql\`](https://github.com/tempoxyz/tidx/blob/main/db/clickhouse/txs.sql), [\`logs.sql\`](https://github.com/tempoxyz/tidx/blob/main/db/clickhouse/logs.sql), [\`receipts.sql\`](https://github.com/tempoxyz/tidx/blob/main/db/clickhouse/receipts.sql)

カラムは同じ。テーブルエンジン、ordering key、index が違う。PG は \`(tx_hash)\`、\`(block_num)\`、\`(from)\`、\`(to)\` に btree index — point lookup したい全カラム。CH は MergeTree 系エンジンで \`(block_num, ...)\` ソート — time-range スキャンに自然な物理レイアウト。

カラムの選択自体も **よくある質問では JOIN 不要** になるよう作られている。\`txs\` テーブルは \`block_timestamp\` を非正規化で持つ。\`logs\` も同様。\`receipts\` も同様。関係正規化主義者なら正規化するところを、本物の production indexer は「analytics クエリには毎回 timestamp が必要」という経験を積んでバイトを払う。

> 🔍 **リポで探す。** [\`db/logs.sql\`](https://github.com/tempoxyz/tidx/blob/main/db/logs.sql) と [\`db/clickhouse/logs.sql\`](https://github.com/tempoxyz/tidx/blob/main/db/clickhouse/logs.sql) を両方開く。片方にあり片方にないカラムまたは index を 1 つ特定。**自分の言葉で:** それぞれが最適化しているクエリクラスは何か?

## Step 4: Lazy event decoding — キモの設計判断

ほとんどの indexer (Subgraph、Goldsky、OpenZeppelin Defender) は index したい event すべての **事前登録** を要求する。ABI を前もって宣言し、indexer は event ごとに型付きテーブルを作り、書き込み時にその event だけをデコードする。

tidx はそれをしない。\`logs\` スキーマを見る — 格納されているのは **生バイト**: \`selector BYTEA, topics BYTEA[], data BYTEA\`。Event 単位のテーブルなし。事前登録なし。デコードは **クエリ時** に、ABI signature を CTE generator として渡す形で行われる。

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

代償: 永遠に全コントラクトの全ログを保存する。Subgraph 方式の「これらのコントラクトだけ index する」と比べて生バイトで ~5〜10 倍。

得るもの: **事前登録していない質問に答えられる。** 新トークンが launch — 1 分目からクエリできる。新しい event signature が出現 — backfill なしでデコードできる。トレードオフは「質問空間を開いたままにする代価としてディスクを払う」 — ディスクは安い。

> 🛑 **理解度チェック。** スクロール戻しなしで自分の言葉で: なぜ tidx は Subgraph が要求する事前登録をスキップできるのか? デコードが起きる **場所** が両者でどう違う? ヒント: ABI が両システムでどこに住むかを考えよ。

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

正直な版: 振り分けルールは魔法ではなくヒューリスティック。プロダクションユーザは \`?engine=clickhouse\` で明示的にオーバーライドする (用途がわかっているとき)。エンジン分離が **アーキテクチャ的なコミット**; auto-routing は上に乗ったコンビニエンス。

## Step 6: Materialized views — CH 上の事前計算 analytics

[\`src/api/views.rs\`](https://github.com/tempoxyz/tidx/blob/main/src/api/views.rs) を開く。ClickHouse は「materialized view」を持つ — read 時ではなく insert 時に計算する自動更新の aggregation。tidx はそれを管理する HTTP API を ship している:

\`\`\`bash
curl -X POST "https://tidx.example.com/views" -d '{
  "chainId": 4217,
  "name": "top_holders",
  "sql": "SELECT token, holder, sum(balance) AS balance
          FROM token_balances GROUP BY token, holder HAVING balance > 0",
  "orderBy": ["token", "holder"]
}'
\`\`\`

\`POST /views\` で CH がやること: 推定スキーマでターゲットテーブル \`analytics_4217.top_holders\` を作成、ソースへの insert で自動 populate される materialized view \`top_holders_mv\` を作成、そして **既存データを backfill** (ソースクエリから)。以降、ソースへの新規 insert ごとに view が増分更新される。\`SELECT * FROM top_holders\` はもうスキャンではなく index lookup。

認可に注目: \`POST\` と \`DELETE\` は **trusted IP** (\`trusted_cidrs\` で設定、典型は Tailscale) からの接続を要求する。パターン: read API は public、write/admin API は CIDR ゲート。

> 🔍 **リポで探す。** [\`views.rs\`](https://github.com/tempoxyz/tidx/blob/main/src/api/views.rs) で \`require_admin_mutation\` を見つける。trusted IP *かつ* \`x-tidx-admin: 1\` ヘッダの両方を要求していることに注意。**なぜ両方?** (Defense in depth — IP は誤設定されたネットワーク内ではスプーフできる; ヘッダは安価な 2 段目のチェック。)

## Step 7: Sync アーキテクチャ — Realtime + Gap Sync

README の [Sync Architecture](https://github.com/tempoxyz/tidx/blob/main/README.md#sync-architecture) セクションは concurrent な 2 ループを図示している:

- **Realtime** はチェーン head を追って ~0 lag を維持。
- **Gap Sync** は不連続を検出し、最新から最古に向かって埋める。

Gap sync が最新優先なのは設計上の判断: ユーザが query する最近のデータが先に落ちるべきで、古い履歴は下で backfill する。\`sync_state\` テーブルは 4 つのブロック番号 — \`head_num\`、\`tip_num\`、\`synced_num\`、\`backfill_num\` — を tracking し、それぞれが異なる条件下で動く。[\`db/sync_state.sql\`](https://github.com/tempoxyz/tidx/blob/main/db/sync_state.sql) を開いてカラムコメントを読む; この 4-cursor 設計が 2 つのループを互いに踏まずに共存させている。

## Step 8: 読みから書きへ — 自分の indexer

MegaETH 用、独自 OP-stack rollup 用、または自前チェーン用の indexer を ship したいとして、tidx を adopt するとどうなる? 2 つの道:

**そのまま採用。** チェーンが Ethereum JSON-RPC を喋るなら、\`config.toml\` の 1 フィールド — \`rpc_url\` — を変えて \`tidx up\` を走らせるだけ。tidx のテーブルはチェーン非依存; \`chain_id\` はカラムであってスキーマ決定ではない。

**Fork。** チェーンに tidx のスキーマがモデル化していない feature があるなら (Tempo 系の fee payer、独自 precompile trace、sponsored-tx フィールドなど) 3 箇所を fork:

1. \`db/*.sql\` と \`db/clickhouse/*.sql\` — チェーン固有の追加カラム
2. \`src/sync/decoder.rs\` — 各 block / tx / receipt から追加フィールドを抽出
3. \`src/types.rs\` — decoder から sink に流れる \`*Row\` struct を拡張

ほぼ fork しない部分: sync engine、dual sink、query router、views API。これらがアーキテクチャ; その他はすべてデータ定義。

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

Drill 5 を終わらせれば、両エンジン稼働中の本物のチェーンを index する稼働中の tidx インスタンスを手に入れる。

> 🛑 **最終チェック。** 一文で: tidx の dual-storage 設計が単一 DB indexer に買えない何を買ってくれるか? 答えに「point lookup レイテンシ」と「analytics スキャンスループット」の **両方** が登場しないなら、冒頭を読み直し — その緊張関係こそがアーキテクチャ全体。

## Test gate

*Test gate — この tier では全アプリがテスト green で初めて完了* に従い、本レッスンの最低 gate は **fixture chain replay**: 既知の \`Notification::ChainCommitted\` と \`Notification::ChainReverted\` の列を indexer の処理関数に流し込み、PG（および CH を配線したなら CH も）の導出状態が golden reference と完全一致することを assert。

reorg ケースは譲れない: \`ChainCommitted\` だけ扱う sink-into-PG indexer は reorg のたびに導出状態を破壊する。\`ChainReverted\` パスが書き込みを実際に巻き戻すことを gate で証明する必要がある。

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

fixture は \`tests/fixtures/\` 配下に \`ExExNotification\` をシリアライズして置く（\`reth\` のテストヘルパを使うか、本物のノードから 1 回キャプチャして pin する）。両方が green になり CI が push のたびに走るまで、レッスンは **未完了**。

## 📺 関連動画

\`\`\`youtube
GhEhzE9SFqY | Alexey Shekhirin — Using Reth Execution Extensions for next generation indexing (Devcon 2024)
\`\`\`

> **🧭 ここまでで進んだ場所:** **DB 層** のアプリケーションを ship した — tidx のソースから OLTP + OLAP デュアルストレージ設計を読み解き、fixture chain replay の test gate で reorg ハンドリングまで担保。Snowflake や ClickHouse + Postgres の組み合わせが解いてきた問題の chain data 版。次のレッスンで **ネットワーク層** へ移る: \`extend_rpc_modules\` 経由のサーバサイド RPC 拡張。
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

> 🧭 **systems engineering スタックでの位置:** **ネットワーク層のサーバサイド拡張**。RPC を公開しているデータベース・サービスが共通して直面する問題 — 「クライアントに raw データをラウンドトリップさせる代わりに、サーバ側で走るカスタムクエリを足せるようにする」。PostgreSQL のストアドプロシージャ、GraphQL のカスタムリゾルバ、gRPC のサービス拡張 — どれも同種の問題。Reth のカスタム RPC はそれを Ethereum execution client に当てはめたもの。

fee-bidding bot のために、pending tx の gas price ヒストグラムを 1 回の API 呼び出しで返してほしい。標準の \`txpool_content\` は *pending tx を全部フルで* 返す — 結局 10 個の数字にまとめるのに、数百 KB を転送することになる。正解の動きは、**ノード内で**集計してヒストグラムだけ返す独自メソッドを追加すること。Rust ~50 行。Reth fork なし。ネイティブネームスペース (\`eth_*\`、\`net_*\`、\`debug_*\`、\`txpool_*\` ...) と同じ HTTP / WebSocket / IPC エンドポイントで動き出す。

> 📌 **スコープの正直な開示。** 読み取り専用メソッド 1 つ (\`txpoolPlus_pendingByGasBucket\`) を追加する — ローカル mempool を 10 個の gas-price バケットに集計するもの。認証、レート制限、書き込みメソッドは扱わない — それらは同じパターンの上に重ねるレイヤー。アーキテクチャ的に学ぶのは「trait をどう組み込むか」。

> 📚 **参考。** [QuickNode の *How to Build Custom RPC Methods with Reth*](https://www.quicknode.com/guides/infrastructure/build-custom-rpc-methods-with-reth) はカスタム RPC trait 登録の基礎をカバー。ここではそれを土台に、サーバーサイド集計、subscription バリアント、本物のカスタム RPC が埋めるべき production gap まで構築する。

## 受け入れ条件

次のテストが pass したらレッスン完了（フルコードは末尾の §Test gate）:

1. **\`returns_buckets_for_known_state\`** — ノードをインプロセス起動、fixture tx で mempool を seed、\`txpoolPlus_pendingByGasBucket\` を HTTP で呼び出し、bucket 数と合計 tx 数を assert。
2. **\`rejects_invalid_bucket_count\`** — 不正パラメータは正しい JSON-RPC エラーコード（\`-32602\` Invalid params、\`-32603\` Internal error ではない）を返す。
3. **\`subscription_does_not_leak_on_disconnect\`** — subscription を開く → クライアントを drop → spawn したタスクが終了することを assert。

**Test-first 読法。** 下の walkthrough は、これらテストで実行する trait 登録、パラメータ処理、subscription パターンを示します。

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

> Reth の RPC スタックは \`jsonrpsee\` で構築されている。あなたのカスタムメソッドは同一プロセス内に同居し、同じリスナを共有し、ネイティブと同じ認証を使う。並行 \`jsonrpsee\` サーバを立てようとしないこと — \`extend_rpc_modules\` で Reth の既存サーバに登録させる。

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

Walk:

- **\`#[rpc(server, namespace = "txpoolPlus")]\`** — マクロが \`TxpoolPlusApiServer\` trait を生成し、それを実装する。\`namespace\` が JSON-RPC メソッドプレフィックスになり、\`#[method(name = "pendingByGasBucket")]\` と組み合わさって、wire 上のメソッド名は \`txpoolPlus_pendingByGasBucket\` となる。
- **\`RpcResult<T>\`** — \`jsonrpsee\` の \`Result<T, ErrorObjectOwned>\` エイリアス。エラーは正しい JSON-RPC エラーオブジェクト (コード付き) として返るので、シリアライズは自分で書かない。
- **戻り値型に \`Serialize\`** — それだけで OK。\`GasBucket\` は \`min_gwei\`、\`max_gwei\`、\`count\` フィールドを持つ JSON オブジェクトになる。snake → camel ケースマッピングは設定可能だが、ここでは明瞭性のため snake のまま。

> 🔍 **リポで探す。** [\`reth-rpc-api\`](https://github.com/paradigmxyz/reth/tree/main/crates/rpc/rpc-api) を開く — 全ネイティブネームスペース (\`EthApi\`、\`DebugApi\`、\`TraceApi\`、\`TxpoolApi\`、…) がこの正確な \`#[rpc(...)]\` パターンで宣言された trait。**あなたのカスタム trait は構造的にネイティブと同一。** 偶然ではなく、それが約束された形。

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

- **\`Pool: TransactionPool\`** — trait バウンド。\`TransactionPool\` は Reth がどこでも使う抽象で、具体型はノードビルダーが決める。**\`EthPool\` や \`BasicPool\` をハードコードしない** — ジェネリックなので、vanilla mainnet ノード、op-reth L2 ノード、カスタム App-chain で同じコードが動く。
- **\`pool.pending()\`** — pending tx のスナップショットを返し、新規 insert に対してプールをロックしない。プロダクション級。
- **\`max_priority_fee_per_gas\`** — バケット対象。(本物の searcher は base fee も考慮するが、明瞭性のため priority fee のみ)
- **内側ループは \`O(buckets * pending)\`** — 典型的なプールサイズ (~10K) には十分。100K+ pending では bucket 配列での二分探索に切り替える。

> 🛑 **理解度チェック。** スクロールを戻さずに: なぜ \`pool.pending()\` はここで安価で、本物の \`txpool_content\` RPC は重いのか? ヒント: \`pending()\` が返すもの vs \`txpool_content\` が wire 用に組み立てるものを考えてみる。

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

Walk:

- **\`Cli<...>::parse()\`** — Reth の CLI 機構。第 2 ジェネリックパラメータがあなたのカスタム args struct で、標準 Reth CLI フラグにマージされる。\`reth node --enable-txpool-plus --http\` で動く。
- **\`extend_rpc_modules(|ctx| { ... })\`** — クロージャは起動時に 1 回、ノード構築後 + RPC サーバ起動前に走る。\`ctx\` は \`pool()\`、\`provider()\`、\`network()\`、\`tasks()\` を公開している — RPC ハンドラが必要とする全コンポーネント。
- **\`ctx.modules.merge_configured(ext.into_rpc())\`** — \`into_rpc()\` は \`#[rpc]\` マクロが生成するメソッドで、\`RpcModule\` を作る。\`merge_configured\` がそれを Reth の既存ディスパッチテーブルに **設定された全トランスポートに対して** はめ込む (\`--http\` なら HTTP、\`--ws\` なら WS、\`--ipc\` なら IPC)。1 行で 3 トランスポート。

> 🔍 **リポで探す。** [\`reth/examples/node-custom-rpc\`](https://github.com/paradigmxyz/reth/tree/main/examples/node-custom-rpc) を開く — Paradigm 公式 example で、同じ形を使っている。**自分の書いたものと並べて比較する。** 構造的スケルトンは同一で、違うのは namespace、メソッド名、ハンドラ内で何をするかだけ。

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

Walk:

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

> **🧭 ここまでで進んだ場所:** **ネットワーク層のサーバサイド拡張** を ship した — jsonrpsee による集約 + subscription を Reth の pool ストリームに配線し、in-process integration + エラーコード + subscription リーク検出テストで担保。GraphQL カスタムリゾルバや Postgres ストアドプロシージャと同じ問題を Reth RPC に当てはめた形。次のレッスンで **並行性 + 状態管理層** へ移る: wallet backend。

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

> 🧭 **systems engineering スタックでの位置:** **並行性層 + 状態管理層** の応用。決済ゲートウェイ・メッセージキュー・データベース書き込みコーディネータが共通して解いてきた問題 — 「多数の並行投入、テナント単位の単調増加シーケンス番号、詰まったものへの retry / replace」。Stripe の payment intent、Kafka producer の冪等性、銀行の振込キュー — どれも同じ形と格闘している。wallet backend はそれを EVM トランザクションに当てはめたもの。

ユーザーが 1 分間に「Send」を 50 回押す。あなたの wallet がやること: 次の *nonce* (アカウントごとのトランザクション順序を決めるカウンタ) を衝突なしに選び、正しい鍵で署名し、ブロードキャストし、mempool を監視し、そして — ガス価格が 5 gwei から 80 gwei へ急騰した時 — **詰まった tx の fee を引き上げて置換する**。これでユーザーのセッションが「捨て値で送ったたった 1 件」の後ろでデッドロックしない。Wallet UI が世間に知られている部分。背後の send service こそチームが実際に格闘する部分。以下、Rust ~250 行 — signer pool、nonce manager、send queue、replace-on-stuck、confirm watcher。

> 📌 **スコープの正直な開示。** **サービス**を作る — signer pool + nonce manager + send queue + replace-on-stuck + confirm watcher を小さな HTTP API で公開する。鍵カストディ (HSM, MPC, KMS)、フィアットオンランプ、JS SDK は扱わない。これらのレイヤーは全部、動く send service の *上に* 乗るもの。本レッスンでは動かなければならない部分を作る。

## 受け入れ条件

次のテストが pass したらレッスン完了（フルコードは末尾の §Test gate）:

1. **\`signed_tx_roundtrips\`** — サービスが生成した署名済み tx は、元の \`TransactionRequest\` に正確に decode で戻る（送信者・to・value・nonce・gas パラメタ・data）。
2. **\`no_nonce_gaps_under_concurrent_send\`** — 同じ \`from\` に 50 件並行で \`/send\` を投げ、結果の nonce が \`base..base+50\` で欠損も重複もない。

**Test-first 読法。** 下の walkthrough は、これらテストが行使する signer pool、nonce manager、\`TransactionRequest\` フローを示します。

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

その 1 つの POST の裏で起きること: from-address による signer ルックアップ、nonce 予約、ガス価格計算、tx 署名、Alloy 経由でのブロードキャスト、**そして 30 秒以内に着地しなければ fee を引き上げるバックグラウンド watcher**。

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

> 🛑 **スクロール前に予測。** ナイーブな方法は「nonce を RPC から取得、署名、送信」。同じ from-address で 100 ms 以内に POST /send を 2 回叩いた時に何が壊れるか順を追って考える。**何が具体的に間違うか一文で答えてください。** 答えを書き留めてから先へ。

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

Walk:

- **nonce 状態に \`Arc<Mutex<HashMap>>\`** — そう、グローバル mutex 1 つ。送信スループットは *署名速度* で律速されているのであって、ロック競合ではない。ここのクリティカルセクションは数マイクロ秒。計測前に sharded lock で先回り最適化しないこと。
- **\`provider.get_transaction_count(addr).pending()\`** — \`pending\` が要のキーワード。デフォルトの \`get_transaction_count\` は confirmed-only 数を返すのに対し、\`pending\` は mempool に居座っている tx も含む。**pending の方が欲しい** — confirmed-only だと既に in-flight の nonce を再利用してしまう。
- **\`reserve\` が \`async\` なのは *初回* が RPC を打つから。** 以降は純粋なローカル状態。slow path (cold start) は 1 RPC、hot path (継続送信) はゼロ。
- **\`forget\` は安全弁。** submission が "nonce too low" 等で失敗したら、in-memory 状態がチェーンから乖離している — 破棄して次回コールで RPC から再初期化させる。

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

Walk:

- **\`provider.estimate_eip1559_fees()\`** — Alloy のヘルパで、内部で \`eth_feeHistory\` を呼んで直近数ブロックから妥当な \`(max_fee, priority_fee)\` を返す。**簡単なケースで fee の数式を手書きしない**。ヘルパを使う。
- **\`bump\` は 25% であって 10% ではない。** mempool の最小置換 bump は大半のクライアント (geth, Reth, Erigon) で 10%。ちょうど 10% で送ると、ノードの \`>\` vs \`>=\` チェックが浮動小数で誤判定しないことに賭けることになる。**25% なら必ず通る安全マージン。**
- **見積もりは *再試行しない*。** \`estimate_eip1559_fees\` が失敗したなら provider が不調なので、今すぐ送信するのは安全ではない。

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

- **nonce 予約は署名の前に行う、後ではない。** 並行下で順序が重要。署名後に予約すると、並行する 2 つの送信が同じ nonce で署名されてしまい、片方だけが勝つ。
- **\`build(&signer.clone().into())\`** — Alloy の \`TransactionBuilder\` が裏で \`sign_transaction_sync\` を呼ぶ。\`PrivateKeySigner\` は同期型。remote signer (KMS, HSM) に切り替えると async になり signature が変わる — でも関数の残りは変わらない。
- **\`send_raw_transaction\` は \`PendingTransactionBuilder\` を返す。** ここでは \`.await.confirmations(N)\` しない。**watcher** (Step 4) が confirmation を担当する。送信パスは即座に return して、API が早く応答できる。

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

Walk:

- **スナップショットを取ってから iterate。** \`get_transaction_receipt\` 中にロックを保持すると、queue 全体が 1 つの RPC の後ろに直列化されてしまう。スナップショットで Vec のアロケーションと並列性をトレードする。
- **\`get_transaction_receipt\` が \`Some\` を返すのが inclusion シグナル。** これは *eventual* consistency — tx がブロック N に含まれても receipt が N+1 で見えるのは RPC キャッシュの遅延で、5 秒 poll がその遅延を吸収する。
- **引き上げ戦略は 25%、繰り返し。** deadline を逃すサイクルごとに重ねていく。3 回 bump 後、5 gwei で始まった tx は \`5 × 1.25³ ≈ 9.77\` gwei。Production ではネットワーク全体の急騰で予算を吹き飛ばさないよう、設定可能な上限で打ち止める。
- **\`expect("signer missing")\`** — 構造上、queue に入っているものは pool 内の鍵で署名されたもの。ここでの panic は不変条件が破れている合図で、静かに破棄するより良い。

> 🛑 **理解度チェック。** スクロールを戻さずに: なぜ watcher は stuck tx を *もっと長く待つ* のではなく *同じ nonce + 高い fee で置換* するのか? ヒント: 前の nonce が stuck のとき **次の nonce が何でブロックされるか** を考えてみる。

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

> 🔍 **リポで探す。** [\`alloy-rpc-types\`](https://github.com/alloy-rs/alloy/tree/main/crates/rpc-types-eth) を開く。\`TransactionRequest\` を見つける。全 \`with_*\` builder メソッドが拡張するのは *同じ* 型。**あなたの wallet backend、arb bot、デプロイスクリプト — すべてこの同じ型から tx を組み立てる。** それが Alloy のレバレッジ。

## Production に足りないもの

| ギャップ | 本物の wallet backend が何をしているか |
| :--- | :--- |
| **鍵カストディ** | KMS / HSM / MPC (例: Fireblocks、ZenGo、Privy)。\`PrivateKeySigner\` は自己保管 / hot ops 用には十分だが、ユーザ資金には不適 |
| **冪等性** | \`/send\` エンドポイントは \`request_id\` を受けて重複排除すべき。ナイーブな POST/再送はユーザに二重送金させかねない |
| **鍵単位レート制限** | API アクセスを持つ 1 つの悪意ある主体が鍵の nonce レンジを使い切れる。from-address 単位で並行送信に上限を設ける |
| **永続キュー** | プロセス再起動でメモリ内が全滅する。Production では \`PendingTx\` を Postgres / Redis に永続化し、起動時に復元する |
| **マルチ RPC ファンアウト** | 2-3 provider に同時 submit して、1 つの停止した provider で tx が孤立しないようにする。同じ署名済み bytes はどこでも動く |
| **Nonce ギャップ検出** | nonce 5、6、7 を予約して 5 + 7 だけが着地したら、nonce 6 が *欠落*している — それを埋めるまでチェーンは停止する。検出して no-op tx を注入する |
| **Observability** | from 単位の \`pending_count\`、\`oldest_pending_age\`、\`bumps_per_hour\`。oldest_pending が閾値を超えたらアラートする |

ここで書いたアーキテクチャ — signer pool、nonce manager、送信パス、replace-on-stuck 付きバックグラウンド watcher — **すべての production wallet backend の背骨**。商用 wallet のドキュメントを開けば、マーケティングの下に同じ形が見える。

## Drill

1. **冪等性。** \`SendRequest\` に \`request_id: String\` フィールドを追加し、\`request_id → tx_hash\` を 1 時間キャッシュする。重複 POST にはキャッシュした hash を返す。(30分)
2. **鍵単位レート制限。** \`/send\` を per-from semaphore (max 4 並行) でラップする。超過は 429 で拒否。(30分)
3. **永続キュー。** \`PendingTx\` を insert 時に Redis に書き、着地時に削除する。起動時に復元。(1.5時間)
4. **マルチ RPC ファンアウト。** 2 つの provider をラップして \`send_raw_transaction\` を両方にブロードキャストし、最初の \`Ok\` を返す \`MultiProvider\` を作る。(1時間)
5. **キャンセル endpoint。** \`POST /cancel { from, nonce }\` を追加 — 同じ nonce で 50% 引き上げた 0-value 自送を提出する (stuck tx を確実にキャンセル)。(1時間)

Drill 5 を完成させれば、鍵カストディを除いて本物のユーザが信頼できる wallet backend ができる。HSM 署名を組み込めば wallet チームが出荷しているのと同等水準。

> 🛑 **最終チェック。** 一文で: なぜ **ローカル nonce 状態** がこの設計の核となる部分なのか (他のレイヤー (署名、ガス、watcher) の方が目立つとしても)? 答えに「nonce ごとの RPC ラウンドトリップなしでの並行送信」がないなら、Step 1 を読み直す — そこが nonce 管理が難しい理由。

## Test gate

*Test gate — この tier では全アプリがテスト green で初めて完了* に従い、本レッスンの最低 gate は **production wallet backend で必ず成立すべき不変条件 2 つ**:

1. **Tx エンコードのラウンドトリップ** — サービスが生成した署名済みトランザクションは、元の \`TransactionRequest\` に **正確に** decode で戻ること（送信者・to・value・nonce・ガスパラメタ・data）。「正しそうに見える」が encoding が間違っている tx を署名する wallet は、ユーザの tx が EVM 層で revert することで静かにユーザを破壊する。
2. **並行下での nonce 単調性** — 同一 \`from\` に対して N 件並行で \`/send\` を投げ、結果の tx hash の nonce が \`base\`、\`base+1\`、...、\`base+N-1\` で **欠損も重複もない** ことを assert。ローカル nonce 状態の存在理由全部（上の最終チェック参照）がこれで、テストはその防御を実体化する。

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

両方 pass するまでレッスンは **未完了**。(1) で fail する wallet は資金を失う。(2) で fail する wallet は単一の詰まった nonce の後ろでユーザをデッドロックさせる。

## 📺 関連動画

\`\`\`youtube
wJnywGB33O4 | Georgios Konstantopoulos — Foundry, a portable, fast and modular toolkit (Foundry の tx パイプライン内で使われている同じ Alloy + Rust signer 機構)
\`\`\`

> **🧭 ここまでで進んだ場所:** **並行性 + 状態管理層の wallet backend** を ship した — signer pool、単調増加 nonce manager、send queue、replace-on-stuck、reorg を意識した watcher。Stripe payment intent や Kafka producer の冪等性と同じパターンを EVM tx に当てはめた形。次のレッスンで **認証層** へ移る: EIP-7702 による委任認可。
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

> 🧭 **systems engineering スタックでの位置:** **認証層**、特に委任認可（delegated authorization）。OAuth 2 の「あるエンティティが別のエンティティに代わって action を認可する」、DocuSign の署名委任、任意の meta-transaction relayer と同じ概念。EIP-7702 + sponsor サービスはそれを Ethereum 上で表現したもの — Alice が intent に署名し、sponsor がガスを払い、チェーンが委任を暗号的に強制する。

Alice は EOA (Externally Owned Account — スマートコントラクトではない、ただの鍵ペアのウォレット) を持っている。ETH を事前に保有せず、smart-contract アカウントへの移行もせずに、1 クリックで 2 つのトークンを swap したい。EIP-7702 (Pectra フォーク以降、2025 年 3 月から mainnet で稼働) がその手段: 「この tx の間、私の EOA をこのコントラクトのコードを持つかのように扱え」と命じる *authorization* に、彼女がオフチェーンで署名する。**Sponsor** — あなたのサービス — がその authorization を Type 4 トランザクションに包んでガスを払う。Alice は atomic な batched call、custom validation、session key を得る。同じアドレス、同じ鍵、移行なし。以下、Rust ~200 行。

> 📌 **スコープの正直な開示。** **単一ユーザ** の EIP-7702 トランザクションを sponsor する: ユーザがオフチェーンで authorization に署名し、それと意図する call をサービスに POST、サービスがそれを Type 4 トランザクション (ガス支払い) で包んで submit、hash を返す。**マルチユーザバッチング** ("bundler" パターン、N ユーザを 1 つのチェーン tx に詰める) は drill で 1 ループの拡張として扱う。Account abstraction ポリシーロジック — 支出制限、セッションキー、リカバリ — は delegate コントラクトが決めることで、sponsor はリレーするだけ。

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

**Test-first 読法。** 下の walkthrough は、これらテストが行使する Type 4 tx 構築、署名 authorization 処理、ガス会計パスを示します。

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

- **\`Authorization { chain_id, address, nonce }\`** — 3 フィールド。\`address\` は **delegate** コントラクトで、Alice が EOA に対して認可するコード。
- **\`auth.signature_hash()\`** — 署名されるハッシュ。仕様: \`keccak256(MAGIC || rlp([chain_id, address, nonce]))\`、\`MAGIC\` は \`0x05\`。**自分で計算しない** — Alloy が代わりにやってくれる。keccak に手を出した時点でミスしている。
- **\`user_nonce\`** — Alice の *現在の EOA nonce*。authorization は含まれる tx がマイニングされた瞬間に消費される。再送には Alice の nonce が一致する必要がある。**ワンショットの再送防止** が組み込まれている。

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

- **\`SignedAuthorization::decode_2718\`** — ユーザが送った \`encoded_2718\` の逆操作。**1 往復、手動の byte いじりなし。**
- **\`from = sponsor、to = user\`** — これがデザインの心臓部。tx は *sponsor から* 出る (ガス支払い、外側の envelope に署名) が、*user の EOA に向かう* (今や delegate であるかのように実行する)。tx を観察する誰もが Bob を発信者、Alice のアドレスを call ターゲットと見る — そして **ログは Alice のアドレスから出る**。delegate のコードを走らせているのがそのアドレスだからだ。
- **\`with_authorization_list(vec![signed_auth])\`** — これを Type 4 にする 1 行。複数の \`SignedAuthorization\` をここに足せば、複数ユーザを 1 つの tx にバッチしていることになる (drill 3)。
- **delegate の \`executeBatch\` は慣例であってプロトコル必須ではない。** 実運用される EIP-7702 delegate コントラクトの大半が似たようなメソッドを公開する ([Soneium](https://github.com/coinbase/sponsored-erc20) のパターン、OpenZeppelin の参照実装等を参照)。あなたの delegate が使う慣例を選ぶ。

> 🛑 **理解度チェック。** スクロールを戻さずに: Bob (sponsor) がこの tx を提出する時、**誰の nonce が増える** か? Bob、Alice、両方? ヒント: 外側の tx envelope に入るのはどの nonce か、authorization の \`nonce\` フィールドは何のためかを考えてみる。

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

- **\`provider.send_transaction(req)\`** — Alloy が provider に attach された wallet (sponsor 鍵) で署名 + ブロードキャストする。\`req\` は既に \`from = sponsor.address()\` を持つので、wallet 機構が正しい鍵を選ぶ。
- **wallet-backend lesson の watcher パターンがここでも適用できる。** 30 秒 deadline + stuck tx での fee 引き上げで production 級になる。明瞭性のため省略しているが、欲しければ [lesson 4](/courses/reth-building-ja/lessons/build-wallet-backend-ja) の watcher をそのままコピペすればよい。

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

サービス全体: ~200 LOC、import + ヘルパモジュールを含めて。フロントエンドが \`user_authorization\` の hex を生成し (Step 1 のコード、ただしユーザ wallet 内で動く)、サービスが残りを全部扱う。

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

ここで書いたアーキテクチャ — 署名済み authorization + intent を受け取り、Type 4 で包み、ガスを sponsor し、submit する — **すべての production EIP-7702 paymaster がやっていること**。Privy、Dynamic、Coinbase Smart Wallet 等の会社が、この正確なコードパスのバリエーションを動かしている。

## Drill

1. **Authority 検証。** 健全性チェックを追加: \`signed_auth.recover_authority()? == body.user\`。不一致は 400 で拒否。(15分)
2. **Nonce 鮮度チェック。** 提出前に現在のユーザ nonce を取得し、authorization の \`nonce\` と一致するか検証する。(15分)
3. **マルチユーザバッチング。** \`/sponsor\` を \`(user, user_authorization, calls)\` トリプルのリストを受け取るよう変更。全 authorization + multicall スタイルの delegate call を持つ 1 tx を構築。**1 ユーザの auth がバッチ中で無効だったら最悪何が起きる?** (1.5時間)
4. **支出上限。** \`HashMap<Address, U256>\` でユーザ単位のガス支出を追跡。設定可能な日次上限を超えるリクエストは拒否。(45分)
5. **Replace-on-stuck。** [Lesson 4](/courses/reth-building-ja/lessons/build-wallet-backend-ja) の watcher を持ってきて統合する。(30分 — パターンを理解していれば大半コピペ)

Drill 5 を完成させれば内部アプリ向けの sponsor サービスとして使える状態になる。SDK + 支出ポリシー + observability を足せば Privy スタイルの開発者体験を出荷していることになる。

> 🛑 **最終チェック。** 一文で: なぜ EIP-7702 が *特に* (vs EIP-4337) sponsorship をはるかに *安く* 運用させるのか? 答えに「entry-point コントラクトオーバーヘッドなし」と「単一 tx vs UserOp ラッピング」がないなら、90 秒リフレッシャを読み直す — それが 7702 が存在する全理由。

## Test gate

*Test gate — この tier では全アプリがテスト green で初めて完了* に従い、本レッスンの最低 gate は production で sponsor を焼くことになる失敗モード 2 つを潰す:

1. **Replay 防止** — 同じ \`SignedAuthorization\` は 2 回 sponsor できない。（ユーザは nonce N で 1 回署名する; 1 つ目が着地した後あなたの sponsor が同じ署名済み authorization を 2 回目も受け入れたら、replay 防止の働きで EVM 層で revert はするが、サービスは「試す」ためのガスをすでに払っている。）2 回目の \`/sponsor\` 呼び出しが、submission 前にサービス境界で拒否されることを assert。
2. **ガス会計の正直さ** — sponsor された tx が成功した後、sponsor の残高は払ったガス分だけ減る（tip ばらつきの ε 以内）、ユーザの残高は変わらない。会計が狂うと、支出上限ドリル（drill 4）が静かに壊れる。

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

両方 pass するまでレッスンは **未完了**。(1) で fail する sponsor は replay 試行のたびに金を焼く。(2) で fail する sponsor はユーザ単位の支出上限を強制できない。

## 📺 関連動画

\`\`\`youtube
_k5fKlKBWV4 | EIP-7702: a technical deep dive — lightclient (Devcon SEA 2024)
\`\`\`

\`\`\`youtube
K2Tm1f8MIwg | Full code walkthrough of EIP-7702 in Revm — sponsor された tx を走らせるエンジン
\`\`\`

> **🧭 ここまでで進んだ場所:** **認証層** のアプリケーションを ship した — 7702 で委任認可を実装し、replay 防止とガス会計の正直さを test gate で担保。OAuth 2 や DocuSign の電子署名委任と同じ概念を、Ethereum 上でネイティブに表現した形。次のレッスンで **VM 層** へ移る: カスタム precompile による Foundry スタイル cheatcode。
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

> 🧭 **systems engineering スタックでの位置:** **コンパイラ / VM 層の拡張機構**。JNI (Java Native Interface)、Python の C extension、V8 のネイティブバインディングと同じパターン — 「VM が安定した ABI を通じてネイティブコードを呼び出せるようにする」。Foundry の cheatcode はそれを EVM 風味で実装したもの — マジックアドレスに置いたカスタム precompile が VM から Rust 関数に dispatch する。

Foundry テストで \`vm.deal(alice, 100 ether)\` と書く時、**それは EVM opcode ではない**。Rust の関数 — *precompile* (EVM エンジンに組み込まれた「コードがチェーン上に存在しない」コントラクト) — を Foundry がマジックアドレス \`0x7109709E...\` にインストールし、\`Vm.sol\` インターフェース経由で Solidity から見えるようにしている。\`vm.warp()\`、\`vm.expectRevert()\` も全部同じ。**あなたも自前で出荷できる。** 本レッスンでは \`cheats.measureGas(target, data)\` を作る — Foundry が内部で使っているのと同じパターンで、テスト作者がサブコールのガスを手動でラップせずに測れる precompile を、だ。

> 📌 **スコープの正直な開示。** Foundry を **fork しない**。precompile + それをロードする最小 Revm ベースのテストハーネスを作る。パターン (高アドレス precompile + Solidity ABI の表面 + それを組み込むテストランナー) **は同一** — Foundry が cheatcode を追加するのと同じパターン。ただし不透明なフレームワークを継承するのではなく全部見える形で。

## 受け入れ条件

次のテストが pass したらレッスン完了（フルコードは末尾の §Test gate）:

1. **\`testMatches_referenceForKnownInput\`** — 1 つの固定入力で、Rust precompile と Solidity-only \`gasleft()\` リファレンスが ε 以内（数 gas）で一致する。
2. **\`testFuzz_alwaysAgreesWithReference\`** — Foundry デフォルト 256 fuzz iteration で、precompile とリファレンスが全入力で一致する。

**Test-first 読法。** 下の walkthrough は precompile の登録方法と出力の算出方法を示します — 両テストが Solidity リファレンスとの一致を測る部分。

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

Walk:

- **\`CHEATS_ADDRESS\`** — \`0x7110...\`、Foundry の \`0x7109\` のすぐ上、衝突回避のため意図的にこの位置に置いた。**cheatcode アドレスはあくまで慣例なので、mainnet precompile や他の dev ツールと衝突しないものを選ぶ。**
- **セレクタディスパッチ** — Solidity contract と同じ 4-byte ABI セレクタ機構。\`sol!\` マクロが \`measureGasCall::SELECTOR\` (定数 \`[u8; 4]\`) と \`abi_decode_raw\` を生成する。**端から端まで型安全** — 手動の byte slice いじりは不要。
- **2 つの戻り値経路** — \`Ok(EthPrecompileOutput)\` は gas-used + abi エンコード済み結果 bytes を運ぶ。\`Err(PrecompileHalt::*)\` は呼び出しフレームを停止させる。Production の cheatcode は specific halt variant を使う (Foundry には自前のものがある) が、ここではシンプルに保つ。

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

Walk:

- **\`Context::mainnet().with_db(&mut db).build_mainnet()\`** — [Lesson 1 (MEV searcher)](/courses/reth-building-ja/lessons/build-mev-searcher-ja) で使った同じ builder。cheatcode は EVM-on-EVM の小型版。**Revm を 1 回走らせれば、全部走らせたことになる。**
- **3 つの結果バリアント全部が \`gas_used\` を返す** — Success、Revert、Halt。revert した tx もガスを消費している。実数を返し、テスト作者が何をカウントするかを決める。
- **\`db = EmptyDB\` は本レッスン用の簡略化。** 本物の Foundry cheatcode は custom Inspector hook 経由で親テスト EVM と state を共有する (\`vm.deal()\` は親テストが見る balance を変更する必要があるから)。Drill 3 で扱う。

> 🛑 **理解度チェック。** スクロールを戻さずに自分の言葉で答える: ここで返される **\`gas_used\`** はなぜ *target contract* が消費したガスを含むのに、cheatcode 呼び出し自体が払ったガスは含まないのか? ヒント: precompile の \`21_000\` flat コストは *外側*のフレームに乗っていて、内側にはない。

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

Walk:

- **\`Precompiles::new(PrecompileSpecId::OSAKA).clone()\`** — 標準 mainnet セット (ECRECOVER、SHA256、RIPEMD160、IDENTITY、modexp、BN254、KZG、BLS) から開始してこちらを拡張する。標準 precompile はそのまま利用可能で、新 precompile は *追加*される。
- **\`with_precompiles(...)\`** — Revm 38 のカスタム precompile registry インストール用 API。**同じ 1 行で任意数の cheatcode を組み込める。**
- **ハーネスは ~30 行。** Foundry が足しているもの: Solidity コンパイラ統合 (\`forge\` が solc 経由でやる)、テスト発見 (\`test_\` で始まる関数を見つける)、構造化された失敗レポート、並列実行。**カーネルはあなたが書いたもの。**

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

\`solc\` でコンパイルし、bytecode + \`test_increment_gas_under_25k()\` セレクタを \`run_test_contract\` に渡せば、Solidity テストがあなたのカスタム Rust cheatcode を end-to-end で呼んだことになる。

## Production レベルテストフレームワークに足りないもの

| ギャップ | Foundry が何をしているか |
| :--- | :--- |
| **Solidity コンパイル** | \`forge\` が solc を呼び出し、artifact をキャッシュし、import を扱う。本当に必要な時だけ再現すればよい — ユーザに事前コンパイルさせる方が普通 |
| **親 state の共有** | \`vm.deal()\` は *テスト* が見る balance を変更する。それには親 EVM への custom Inspector フックが必要 — 独立ハーネスからの非自明な拡張 |
| **並列性** | Foundry はテストごとに独立 DB を持つスレッドで実行する。簡単に追加できる (テスト contract 1 つにつき 1 tokio タスク) |
| **より良い失敗レポート** | スタックトレース、デコード済み revert reason、fuzz shrink。すべて上記カーネルの上に磨きを掛けたもの |
| **呼び出し間の cheatcode 永続化** | 例: \`vm.expectRevert\` は *次の* call にだけ state を設定する。inspector state に保存され、precompile 自体に持たせるわけではない |
| **パーミッションレスな cheatcode 発見** | 本物のプラグインシステムなら cheatcode を動的ライブラリとしてロードできるが、Foundry はそれをしない — コンパイル時統合。私たちもしない |

ここで書いたアーキテクチャ — 高アドレス precompile + selector dispatch + ABI デコードされた引数 + 入れ子 EVM 実行 + 登録するハーネス — **Foundry cheatcode システムが動くカーネル**。Foundry は Rust レベルの糊と Solidity レベルの使い勝手を足すが、基礎は同じ。

## Drill

1. **\`balanceOf(address)\` を追加。** \`evm.db.basic(addr).balance\` 経由で任意アドレスの残高を返す 2 つ目のセレクタを追加する。(15分)
2. **呼び出しを \`payable\` にする。** \`measureGas\` に \`value\` 引数を追加し、内側の tx へ受け渡す。**cheatcode が payable になると Solidity 側で何が変わるか?** (30分)
3. **共有 state cheatcode。** 親テストの state を *変更*する \`cheats.deal(address, uint256)\` を実装する。ヒント: 独立した入れ子 EVM ではなく custom Revm \`Inspector\` が必要。(3時間)
4. **Solidity テスト発見。** ディレクトリを受け取って全 \`.sol\` を solc でコンパイルし、\`test_\` で始まる全関数を見つけ、各々を実行し、pass/fail を出力する最小テストランナーを作る。(4時間)
5. **性能比較。** 同じテスト (Counter increment × 1000) を (a) 自前ハーネス、(b) \`forge test\` で実行する。**レイテンシギャップはどれだけか? どこから来ているか?** (プロファイリングに 1 時間)

Drill 4 を完成させれば、構造的に Foundry の fork が完成する。fuzz testing + invariant testing を上に足せば、実運用されているものと同等水準。

> 🛑 **最終チェック。** 一文で: なぜ **セレクタディスパッチ + ABI デコードされた引数** が、テスト作者から見て precompile を Solidity contract のように感じさせるのか? 答えに「Solidity はアドレスへの呼び出しをエンコードする方法を既に知っている」が含まれていないなら、Step 1 を読み直す — その ABI 互換性が "騙し" を可能にしている。

## Test gate

*Test gate — この tier では全アプリがテスト green で初めて完了* に従い、本レッスンの最低 gate は **同じプリミティブの参照実装に対する differential テスト**。

カスタム cheatcode は dual-use コード: 速度のための Rust precompile と、信頼のための Solidity-only リファレンス。\`cheats.measureGas(target, data)\` が plain Solidity の \`gasleft() - gasleft()\` パターンと違う数値を返したら、**この cheatcode を使う全テストが静かに嘘をついている**。Differential テストだけがそれを知る方法。

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

\`forge test --match-test testFuzz_ -vvv\` をデフォルト 256 fuzz iteration で実行。precompile とリファレンスが 256 入力すべてで一致する（数 gas の計測ウィンドウ内で）まで、レッスンは **未完了**。1 入力でも食い違ったら、その入力に対して cheatcode は全員のガス会計を静かに破壊する。

## 📺 関連動画

\`\`\`youtube
sJpL21yJpgs | Horsefacts — Invariant Testing WETH with Foundry (本レッスンが reverse-engineer した cheatcode パターン)
\`\`\`

> **🧭 ここまでで進んだ場所:** **VM 層の拡張機構** を ship した — 高アドレスに登録したカスタム precompile が VM から Rust 関数を呼ぶ形を、Solidity リファレンスとの differential fuzz で固めた。JNI や V8 native binding と同じパターンを Revm に当てはめた形。次のレッスンで **DB 層の consistent snapshot read** へ移る: fork した DEX 状態に対する swap aggregator。
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

> 🧭 **systems engineering スタックでの位置:** **データベース層の consistent snapshot read** を DEX 状態に当てはめたもの。MVCC データベースが解いてきた問題と同じ — 「N 個の値を atomic に、同じ時点から read する」。mainnet を pin したブロックで fork すれば、全 quote が同じデータベーススナップショットを参照できる。残りは、その整合性のある view の上で DEX ごとに数学を回すだけ。

ユーザが 10,000 USDC を ETH に swap したい。Uniswap V2 なら 2.948 WETH もらえる。Sushi なら 2.946。Uniswap V3 なら 2.951。Aggregator の仕事は: **同じクオートを全 venue に同じ瞬間にファンアウトし、比較し、勝者を選ぶこと。** これが 1inch、Paraswap、0x が裏でやっていること。以下、Rust ~250 行: Revm で mainnet をローカル fork し (全クオートが *同じ* atomic state を読むため)、Uniswap V2 + Sushi + Uniswap V3 から reserve を引き、出力を計算し、ベストを選ぶ。

> 📌 **スコープの正直な開示。** **2 つの V2 系 pool (Uniswap V2 + Sushi) と 1 つの V3 pool (Uniswap V3)** に対して 1-hop のクオートを計算する。本物の aggregator はさらに: split routing (30% を Uniswap、70% を Curve に送る)、multi-hop (A → WETH → B)、独自数式の CFMM (Curve の stableswap、Balancer の重み付き pool)、ガスを考慮したルーティング、を加える。それぞれは本レッスンのカーネルの 1 ループ拡張に相当する。

## 受け入れ条件

次のテストが pass したらレッスン完了（フルコードは末尾の §Test gate）:

1. **\`matches_quoter_for_known_input\`** — pin した mainnet ブロックの 1 つの固定入力で、計算した V3 クオートが Uniswap 公式 QuoterV2 と 5 bps 以内で一致する。
2. **\`picks_best_when_v3_dominates\`** — V3 が最良価格となるブロックで \`pick_best\` が V3 クオートを返す。

**Test-first 読法。** 下の walkthrough は mainnet を fork する方法、pool reserve の読み取り、venue 別クオート計算、勝者選択を示します — これらテストが測る部分そのもの。

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

> 🛑 **スクロール前に予測。** なぜ各 pool に対して直接 **chain RPC** で \`getReserves\` を呼ぶのではなく、**fork**してオンチェーン state を読むのか? *直接 RPC では買えないものを fork が買ってくれる* というポイントを一文で答える。答えを書き留めてから先へ。

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

Walk:

- **[Lesson 1 (MEV searcher)](/courses/reth-building-ja/lessons/build-mev-searcher-ja) の \`read_reserves\` で行ったのと同じ EVM call** — 任意の \`SolCall\` で動く \`call_view\` ヘルパに一般化した。**構築が進むに連れて再利用が積み重なる。**
- **\`token0\` の lookup が必要なのは、どちらがどちらかわからないから。** Pool はアドレスでソートされるので、トークンによって "reserve_in" は reserve0 にも reserve1 にもマップしうる。**スキップするとクオート計算が半分の確率で逆さまになる。**
- **\`fee_bps\` が V2 ファミリーをパラメタ化する。** Uniswap V2: 30 bps (0.3%)。Sushi: 同じく 30 bps。古い Mooniswap や独自 fork: 5〜100 bps のどれもありうる。**同じコードに違うパラメータ。**

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

Walk:

- **9 行の数式 = V2 系 pool の AMM 全体。** Constant product (\`x · y = k\`) を fee discount のもとで適用しているだけ。
- **整数のみ** — 浮動小数なし、panic なし。\`U256\` 算術が EVM のオンチェーンと同じ精度を持つ。**クオートは on-chain swap と wei レベルで一致する。**
- **basis points での fee 表現により、Uniswap、Sushi、独自 fee fork を同じコードでサポートできる。**

> 🛑 **理解度チェック。** スクロールを戻さずに: なぜ \`amount_in_with_fee * pool.reserve_out\` が **分子** に来て、分母ではないのか? ヒント: 次元的に何を意味するか考える — \`[in_with_fee] * [reserve_out]\` はどんな単位を作るか?

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

Walk:

- **\`UNI_V3_QUOTER\` はデプロイ済み contract。** その仕事はまさにこれ — 「いくらもらえるか?」を実 swap せずに答える。**呼び出しは無料**で、Revm 内で呼んでいるからオンチェーンではない。
- **\`sqrtPriceLimitX96 = 0\`** が価格上限を無効化する (つまり「どんな価格でも OK」)。実ルーティングなら slippage を抑えるために設定する。
- **fee パラメータが pool tier を選ぶ。** V3 は 1bp (stable pair)、5bp (stable pool)、30bp (大半のペア)、100bp (エキゾチックペア)。Production aggregator は 4 つ全部をクエリして best を選ぶ。

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

> **🧭 ここまでで進んだ場所:** **DB 層の consistent snapshot read** を DEX 状態に当てはめた aggregator を ship した — 全クオートが pin されたブロックで Revm fork した同じスナップショットを読み、QuoterV2 differential で 5 bps まで精度を担保。MVCC データベースの atomic な複数キー read と同じ形。次のレッスンは **capstone**: ネットワーク層 + コンパイラ層 + 認証層を統合する frontrun-resistant order router。

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

> 🧭 **systems engineering スタックでの位置:** **ネットワーク層 + コンパイラ層 + 認証層の統合**。HFT のオーダールータ、CDN のエッジルータ、適応的ルーティングを持つ API ゲートウェイと同じ形 — 「複数ソースから入力を受け、結果をシミュレートし、経路を選び、適切な投入チャネルへ dispatch する」。本 router はその発想を MEV 敵対者下の EVM トランザクションルーティングに当てはめたもの。

キャップストーン。本ティアのあちこちのパターンを 1 つのサービスに統合する。ユーザが swap intent (JSON) を POST。Router がやることは: DEX 全体で quote する (Lesson 7)、mempool を監視して swap を sandwich する敵対 tx を探す (Lesson 1 の反転)、Revm で **その脅威をシミュレートしてユーザがどれだけ output を失うかを測る**、EIP-7702 でガスを sponsor する (Lesson 5)、そして — 脅威スコアが高ければ — Flashbots Protect 経由で submit する (注文は public mempool に一切現れない)。脅威が低ければ public submission で OK で、bundler のマージンも節約できる。**1 つのサービスで過去 4 レッスン (L1 / L4 / L5 / L7) を縫い合わせ、新規部分は決定レイヤー 1 つだけ。**

> 📌 **スコープの正直な開示。** このキャップストーンは本ティアの L1 / L4 / L5 / L7 のパターンを統合する。新規に作る部分は **frontrun 検出ロジック** と **public mempool をバイパスする submission パス**。Private RPC として Flashbots Protect を使うが、同じ形が MEV-Share、Beaverbuild の private endpoint、その他任意の private orderflow オークションでも動く。

## 受け入れ条件

次のテストが pass したらレッスン完了（フルコードは末尾の §Test gate）:

1. **\`benign_path_uses_public_mempool\`** — mempool に敵対 tx 無し。router が PUBLIC を選び、swap が着地、出力 ≥ \`min_out\`。
2. **\`detected_threat_routes_through_private_mempool\`** — sandwich 設定 tx が mempool に存在。router が PRIVATE を選び Flashbots Protect 経由で submit。
3. **\`respects_min_out\`** — スリッページシナリオ。router が submit を拒否し \`SlippageExceeded\` を返す。

**Test-first 読法。** 下の walkthrough は、これらテストが直接行使する決定レイヤー（新規部分。残りは L1/L4/L5/L7 の縫い合わせ）を示します。

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

> 🛑 **スクロール前に予測。** Lesson 1 の MEV searcher は、この router が防御する **脅威そのもの**。**一文で**: その searcher が何をやっていて、この router は何を打ち破る必要があるのか? Step 3 まで答えを書き留めてから先へ。

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

Walk:

- **3 つの終端状態。** private 送信、public 送信、拒否。**拒否は機能**: best public venue のスリッページが private で提供できる範囲を超えるなら、ユーザに伝えるのが正解。
- **\`expected_out\` は aggregator 由来** (Lesson 7)。\`min_out\` と比較して、何かを送る *前* にユーザのスリッページ許容度を満たすかチェックする。
- **\`submission\` フィールドはユーザに tx がどこに行ったかを伝える。** 透明性に有用 — Flashbots Protect エンドポイントが自分の bundle を受信したかを検証できる。

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

Walk:

- **\`subscribe_pending_transactions\`** — Lesson 1 と同じ Alloy subscription。**searcher の mempool 入力を一字一句そのまま再利用している。**
- **ヒューリスティックは意図的に緩い。** 本物の production は router ABI をデコードして swap *path* を推論する。緩いヒューリスティックは過剰検出する (false positive = 必要なくても private にルートする) が、これは安全側に倒れる失敗モード。
- **\`duration\` は look-ahead ウィンドウ。** ~2 秒が妥当なデフォルト — 遅めの人間を捕まえるには十分長く、ユーザが感じるほどの遅延にはならない短さ。

> 🛑 **理解度チェック。** スクロールを戻さずに: 候補 swap の **方向** がなぜ sandwich の脅威判定で重要なのか? ヒント: frontrunner が victim と *同じ* 方向で取引する利益と、*逆* 方向で取引する利益を比べる。

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

Walk:

- **Quote-before vs quote-after が実際の指標。** ヒューリスティック検出 (Step 3) は *候補* を見つけるだけで、シミュレーションが *本当に傷つけるか* を教えてくれる。後者だけが private ルーティングを正当化する。
- **逐次適用は簡略化したもの。** 本物の実装は各敵を独立にシミュレートし、worst case を取って結合する。Drill 2 を参照。
- **basis points での閾値** はプロトコル単位で調整可能。USDC/USDT の stable swap なら 1bp までしか許容しないかもしれず、エキゾチックなペアの swap なら 50bp まで受け入れるかもしれない。

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

> 🛑 **最終チェック (本レッスンの最終チェック)。** 一文で: このティアのレッスンのうち、なぜ *capstone* が他のどのコンポーネントよりも **シミュレーション** (L1) に依存するのか? 答えに「ユーザの損失と同じ単位で脅威を測らずに、防御するかを決められない」が含まれていないなら、capstone はまだ完全には届いていない — Step 4 を読み直す。

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
8. **Frontrun-resistant order router (本レッスン)** — L1 / L4 / L5 / L7 を統合

この先: L9 (validate-revm クロスクライアントハーネス) と L10 (HTTP 402 / MPP machine-payments エンドポイント)。swap-router の弧の外側に立つが、同じティアで ship される。

> **🧭 ここまでで進んだ場所:** **ネットワーク層 + コンパイラ層 + 認証層の統合** を ship した — マルチソース入力 → simulation → 経路判断 → 適切な submission チャネル、これを benign / threat / slippage の E2E テスト群で固めた。HFT order router や CDN edge router と同じ形を、MEV 下の EVM トランザクションルーティングに当てはめたもの。次のレッスンで **VM 層の正しさ検証** へ移る: production provider に対する Revm の differential testing。
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

> 🧭 **systems engineering スタックでの位置:** **コンパイラ / VM 層の正しさ検証** — 特にリファレンス実装に対する *differential testing*。IEEE 754 浮動小数点の準拠検証、TLS 実装の interop、POSIX 認証 — どれも同じ規律に依拠している: 代表入力集合で自分の実装が信頼できるリファレンスと一致することを証明する。本レッスンはその技法を「Revm vs 本番 EVM クライアント」に当てはめたもの。

あなたの arb bot の Revm fork は「この swap で 2.95 WETH 取れる」と言う。実際にチェーン (大半が Geth と Nethermind で、Reth は依然として execution client シェアの ~7-12% に過ぎない) で実行されると 2.93 しか届かない。**bot は自分のシミュレーションのバグで損を出した**。本ティアで作った Revm ベースのシステム全部に同じリスクがある: L1 の MEV searcher は Revm で arb を予測し、L7 の aggregator は Revm で quote を出し、L8 の capstone は Revm で frontrun リスクをスコアする。Revm が mainnet を実際に動かしている Geth/Nethermind の多数派と食い違えば、全部のシステムがサイレントに誤った答えを出荷することになる。以下の ~200 行でクロスチェックを作る。

> 📌 **スコープの正直な開示。** Revm を JSON-RPC provider に対して、単一トランザクションのガス + 戻り data で diff する。production の検証ハーネスはこれを拡張する: \`debug_traceTransaction\` の prestate による完全な state-diff 比較、数千の歴史的 tx に対する統計的サンプリング、ハードフォーク境界の回帰テスト、CI 統合。カーネル — *「一致する」とはどういう意味で、それを安価にどう確認するか?* — は同じ。

## 受け入れ条件

次のテストが pass したらレッスン完了（フルコードは末尾の §Test gate）:

1. **\`matches_provider_for_recent_blocks\`** — 直近 10 ブロックで、各 tx の Revm トレースが reference provider の \`debug_traceTransaction\` 出力と一致する。
2. **\`coverage_includes_create_and_call_paths\`** — CREATE / CREATE2 / CALL / DELEGATECALL / STATICCALL を行使する既知 tx が、それぞれ個別に reference と一致する。

**Test-first 読法。** 下の walkthrough は Revm トレースの構築方法と \`debug_traceTransaction\` の呼び出し方を示します — 両テストが比較する入力。

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

> 🛑 **スクロール前に予測。** カスタム Revm のセットアップが、非 mainnet ハードフォーク (例: mainnet が Osaka なのにチェーンはまだ Cancun ルール) で追加された opcode を実行する。それは **走らせている spec に対しては技術的に正しい** 結果を計算するが、mainnet とは一致しない。この不一致が検証ハーネスでどう見えるか順を追って考える。答えを書き留めてから先へ。

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

Walk:

- **\`eth_call\` はトランザクションを送らずに関数の return bytes を返す** — contract が使うのと正確に同じ実行パスを通るが、state は永続化しない。
- **\`eth_estimateGas\` は call が消費するガス単位を返す。** 実オンチェーンガスより少し高い (safety buffer 込み)。view 呼び出し (\`balanceOf\` など) では buffer は小さい。
- **両方とも特定の \`block\` にピン留め** — Revm を同じブロックの state に対して走らせれば、同じ条件で比較できる。

> 🔍 **リポで探す。** [\`alloy_provider::Provider\`](https://github.com/alloy-rs/alloy/blob/main/crates/provider/src/provider/trait.rs) を開く。\`call\` と \`estimate_gas\` が同じ trait に属している — provider を切り替えても (Infura → QuickNode → 自前 Reth ノード) 、検証コードには何の変更も要らない。**それが抽象化の見返り。**

## Step 3: 同じ call をローカルで Revm 経由で走らせる

L1 / L7 と同じ fork パターン。Step 2 と同じブロックにピン留めする:

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

- **\`AlloyDB::new(provider, BlockId::number(block))\`** で fork を provider が答えた正確なブロックにピン留めする。**同じ入力、同じ世界。**
- **\`Context::mainnet()\`** が mainnet ハードフォークルールを使う。検証対象のチェーンが mainnet *ではない* なら (例: カスタム L2)、それに合致する spec を使う — Revm の \`Context\` builder で選択できる。
- **caller を \`Address::ZERO\` に**。view 系 call には署名不要で、一般的なアドレスからの \`eth_call\` と同じ扱い。

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

- **出力 bytes は完全一致で比較する。** byte レベル diff が正しい約束 — Revm 版が provider と 1 byte でも違う bytes を返せば、レスポンスをデコードする下流コードが違う値を生み出す。
- **ガス比較は spread を許容する。** \`eth_estimateGas\` には Revm の正確なガス計算が加えない buffer (大抵 10-20%) が含まれるから。完全等価ではなく order of magnitude を比較する。
- **\`println!\` でカーネルとしては十分。** Production のラッパーは \`tracing::error!\` + 構造化 diff でログから query できるようにする。

> 🛑 **理解度チェック。** スクロールを戻さずに、なぜ **byte レベル出力比較は完全一致** なのに **ガス比較は近似** なのかを一文で。ヒント: \`eth_estimateGas\` が \`evm.transact_one\` の測定する範囲を超えて何を *すべき* か考えてみる。

## Step 5: 一致しないとき — デバッグ分類

実際の validation を走らせると不一致が見つかる。診断ツリー:

| 症状 | 想定原因 | 修正 |
| :--- | :--- | :--- |
| **本来非ゼロのはずの出力が一貫して 0x もしくは空** | Revm の spec が違う (例: \`Context::mainnet()\` で構築したがチェーンは op-mainnet) | チェーン spec に合わせる: \`OpEvm\`、\`Context::op_mainnet()\` など |
| **ハードフォーク境界でだけ出力が違う** | Revm のハードフォーク有効化ブロックがチェーンと不一致 | Revm の spec をそのブロックでアクティブな実ハードフォークにピン留めする — \`SpecId\` 参照 |
| **contract が precompile を呼ぶときだけ出力が違う** | Revm にないカスタム precompile (例: 一部の L2 でアクティブな RIP-7212 secp256r1) | precompile を Revm の precompile registry に追加する (L6 参照) |
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

> 🛑 **最終チェック。** 一文で: なぜこのティアで L1-L8 を作ることが、**同時に**この validation lesson を作ることを要求するのか? 答えに「Reth が ~7-12% のクライアントシェア」と「シミュレーションの正しさは Reth ではない 88-93% との一致に依存する」が繋がっていないなら、冒頭を読み直す — それがこのレッスンがティアの最後にいる全理由。

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

両方が実 recent-block 範囲で pass するまで — 延いてはあなたが L1–L8 で作ったもの全部への信頼まで — レッスンは **未完了**。1 件でも乖離したら、シミュレーションは何かについて嘘をついていて、L1–L8 の sim 依存判断のどれが間違いだったかを、それを最初に見つけずには知ることができない。

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

> **🧭 ここまでで進んだ場所:** **コンパイラ / VM 層の正しさ検証** を ship した — Revm fork と production JSON-RPC provider の differential trace 比較を、ガス + 戻り data の一致と CREATE/CALL カバレッジを test gate として固めた。IEEE 754 準拠検証や TLS interop と同じ規律を Revm に当てはめた形。本 tier の他のアプリ (L1、L7、L8) はすべてこの検証層に依存している。次のレッスンで **ネットワーク層の支払いプロトコル** — HTTP 402 + MPP — を、本 tier 全体の上に乗せる有料化エッジとして見る。
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

> 🧭 **systems engineering スタックでの位置:** **ネットワーク層の支払いプロトコル** — HTTP セマンティクスを暗号的な決済で拡張したもの。TLS が HTTP を暗号で拡張したのと同じ、OAuth が HTTP を委任認可で拡張したのと同じ、rate-limit ヘッダがコスト信号で拡張したのと同じパターン。MPP は「HTTP + リクエスト単位の決済」を表現するプロトコル層で、アカウントや API キーなしで pay-per-call を必要とする自律 agent のために設計されている。

2026 年の有料 API はどれも同じ手順を要求してきます。サインアップ、メール認証、API キー発行、請求アカウントの紐付け、プランの事前コミット。*そこまでやって初めて* 有料リソースを 1 つ取得できる。SaaS を提供する側にとっては問題ありません。しかしフライト状況を *1 回だけ* 取得したい自律 agent にとっては、その摩擦自体が製品体験 — そして体験は壊れています。

**Machine Payments Protocol (MPP)** — Tempo Labs と Stripe が共同で開発する IETF ドラフト — はこの前提を変えます。クライアントが HTTP リクエストを送る。サーバが \`402 Payment Required\` を challenge とともに返す。クライアントが支払う。クライアントが証明を付けて再試行する。サーバが \`200 OK\` を返す。アカウント不要、API キー不要、チェックアウトフロー不要。1 リクエストごとに、同じラウンドトリップ内で、サーバが受け付けるあらゆる payment rail で支払える — Tempo、Stripe、ACH、Lightning、カード、独自の rail まで。

本レッスンでは、3 つのソースを並行して読んでいきます: 仕様 ([\`tempoxyz/mpp-specs\`](https://github.com/tempoxyz/mpp-specs))、Rust SDK ([\`tempoxyz/mpp-rs\`](https://github.com/tempoxyz/mpp-rs))、そしてエンドツーエンドで動く CLI ([\`tempoxyz/wallet\`](https://github.com/tempoxyz/wallet))。

> 📌 **仕様ステータス — 期待値を正しく持つ。** MPP は *IETF ドラフト* ([draft-ryan-httpauth-payment-00](https://datatracker.ietf.org/doc/draft-ryan-httpauth-payment/)) であり、批准済みの標準ではありません。ワイヤフォーマットの細部はまだ変わる可能性があります。今すぐ実装に使える程度に安定しているのは *全体像* — HTTP 402 + \`Payment\` 認証スキーム — と Tempo / Stripe のリファレンス実装です。細部はドラフト扱い、アーキテクチャ全体を学習対象として扱ってください。

## 受け入れ条件

次のテストが pass したらレッスン完了（フルコードは末尾の §Test gate）:

1. **\`returns_402_without_payment\`** — \`X-PAYMENT\` 無しのリクエストは \`402\` を返し、コストと受取アドレスを含める。
2. **\`returns_resource_with_valid_payment\`** — 同じリクエストに有効な micropayment を *付ければ* \`200\` + リソース本文を返す。
3. **\`rejects_replayed_payment\`** — 同じ payment 受領は 2 リクエストを満たせない。2 回目は \`402\` または \`409\` を返す。

**Test-first 読法。** 下の walkthrough は 402 challenge フォーマット、payment 受領の構造、replay 防止メカニズムを示します — これらテストが釘付ける契約。

## 誰も使わなかったステータスコード

HTTP 402 は 30 年前に「将来の用途のため」予約されました。誰も使わないまま、web は API キー、OAuth、Stripe Checkout など「ネイティブな支払いステータスコードを *持たない* ことを補う回避策」によって成長してきた。MPP はこの 402 を本気で活用しようとした最初の仕様です。

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

設計の中立性を担保している箇所: ステップ 3 は *HTTP ラウンドトリップの外側* にあります。プロトコルは *ハンドシェイク* (ステップ 1, 2, 4, 5) のみを規定し、*決済そのもの* は challenge で示された rail に委譲する。この分離が肝です。

> 🛑 **スクロール前に予測。** \`WWW-Authenticate: Payment\` の challenge フォーマットは拡張可能 — どの rail でもプラグインできる設計になっている。Tempo を埋め込んでしまう設計と比べて、なぜこちらが正解か? *プロトコルを 1 つの rail に縛り付けたら何が壊れるか* について一文で答えてみてください。アーキテクチャの章まで答えを保留。

## 3 層 — Core / Intents / Methods

仕様 repo がモジュール化されているのには明確な理由があります。[\`tempoxyz/mpp-specs/specs/\`](https://github.com/tempoxyz/mpp-specs/tree/main/specs) を開いてください。重要な 3 つのサブディレクトリ:

| 層 | パス | 何を定義するか |
| :--- | :--- | :--- |
| **Core** | [\`specs/core/\`](https://github.com/tempoxyz/mpp-specs/tree/main/specs/core) | HTTP 402 のセマンティクス、\`Payment\` 認証スキーム、ヘッダ文法、IANA レジストリ。payment-rail 非依存 |
| **Intents** | [\`specs/intents/\`](https://github.com/tempoxyz/mpp-specs/tree/main/specs/intents) | 抽象パターン: charge、authorize、subscription。*どんな種類* の支払いかを規定するが、*どう* やるかは規定しない |
| **Methods** | [\`specs/methods/\`](https://github.com/tempoxyz/mpp-specs/tree/main/specs/methods) | rail 別の具体実装: \`tempo/\`、\`stripe/\`、\`evm/\`、\`solana/\`、\`stellar/\`、\`lightning/\`、\`card/\` |

この分割が解いている設計問題: **Tempo にも Stripe にも ACH にも Lightning にも対応する 1 つのクライアントライブラリをどう書くか?** 答えは [artemis レッスン](./build-mev-searcher-ja) で読んだ Collector / Strategy / Executor の分割と同じ構造です。HTTP のメカニクス (Core)、payment の意図 (Intents)、rail 固有の具体実装 (Methods) を分離する。Core 層はブロックチェーンが何かを知らない。Methods 層は HTTP 402 がどう振る舞うかを知らない。Intents 層が両者をつなぐインターフェースになる。

もし Core に Tempo 固有の仮定を埋め込んでいたら、Stripe が共同 maintainer に加わった瞬間 — *これは実際に起きました* — Core のあらゆる部分を再検討せざるを得なかったはずです。モジュラ分割のおかげで、Stripe の追加は \`specs/methods/stripe/\` 配下に新ディレクトリを置くだけで済み、プロトコル本体に手を入れずに完了しています。

> 🔍 **リポで探す。** [\`specs/core/draft-httpauth-payment-00.md\`](https://github.com/tempoxyz/mpp-specs/blob/main/specs/core/draft-httpauth-payment-00.md) を開き、IANA レジストリのセクションに目を通す。**自分の言葉で答えてください:** 新しい payment method を追加するのに実際何が必要か? 答えは「Core への PR」か、それとも「\`specs/methods/\` 配下に 1 ファイル追加する PR」か? (この答えこそが本プロトコルを将来の変化に耐えられる設計にしている部分であり、\`WWW-Authenticate: Payment\` を拡張可能にしている部分です。)

## Rust SDK を 30 秒で

[\`tempoxyz/mpp-rs\`](https://github.com/tempoxyz/mpp-rs) を開いてください。SDK は仕様と同じ断層で分かれています — マーチャント側は [\`src/server/\`](https://github.com/tempoxyz/mpp-rs/tree/main/src/server)、購入側は [\`src/client/\`](https://github.com/tempoxyz/mpp-rs/tree/main/src/client)。

**サーバ側** — challenge を発行し、credential を検証する:

\`\`\`rust
use mpp::server::{Mpp, tempo, TempoConfig};

let mpp = Mpp::create(tempo(TempoConfig {
    recipient: "0x742d35Cc6634C0532925a3b844Bc9e7595f1B0F2",
}))?;

let challenge = mpp.charge("1")?;             // WWW-Authenticate の値を返す
let receipt = mpp.verify_credential(&credential).await?;
\`\`\`

\`Mpp::create\` は *payment provider* を引数に取ります — \`tempo(...)\`、\`stripe(...)\`、または自前のもの。返ってくる \`Mpp\` は challenge を発行し、credential を *rail に依存しない形で* 検証します。provider を差し替えるだけでよく、サーバの他のコードは変更不要です。

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

\`PaymentMiddleware\` は reqwest クライアントをラップします。ミドルウェアが 402 レスポンスを受け取り、challenge をパースし、provider を呼び出して支払いを履行し、\`Authorization: Payment\` ヘッダを付けて再試行する。呼び出し側から見れば、MPP 対応エンドポイントに対して \`.get(...).send()\` がそのまま機能します。

> 🔍 **リポで探す。** [\`src/client/middleware.rs\`](https://github.com/tempoxyz/mpp-rs/blob/main/src/client/middleware.rs) を開いて再試行を処理する関数を探す。次に [\`src/server/mpp.rs\`](https://github.com/tempoxyz/mpp-rs/blob/main/src/server/mpp.rs) を開いて challenge が発行される箇所を探す。**予測してください:** 新しい payment provider を追加する — たとえば独自 L2 のネイティブ資産で支払えるようにする — のに必要な最小限の変更は? (答え: クライアント側で \`PaymentProvider\` trait を、サーバ側で \`ChargeMethod\` trait を実装する。ミドルウェアやプロトコルパーサには手を入れません。)

## なぜ Intents が必要か — agent スケール問題

> 🛑 **予測。** ある agent が 1 分間に 1000 件の有料 API リクエストを送るとします。これを 1000 件のオンチェーン Tempo トランザクションで処理しようとすると、何が壊れるか? プロトコルの *Intents* 層は、これを解決するために何を提供しているか?

(答え: 1000 件のオンチェーン charge は遅く、手数料がかさみ、agent がブロック時間に直列化されてしまう。Intents 層は *charge* — 1 リクエストごとに個別決済 — と、*authorize* / *subscription* パターン — チャネルやセッションを 1 度開いてあとでまとめて決済 — を分離します。後述するウォレットの「Session Payment (Channel)」モードがまさにこれで、オンチェーンチャネルを 1 度だけ開き、オフチェーン voucher を 1 リクエストごとに交換し、終わったらチャネルを閉じる、という仕組み。Core 層はチャネルの存在を知らない、challenge と credential しか知らない。Intents 層こそが「1 セッションあたり 1000 件の安価なリクエスト」というパターンに名前を与える場所です。)

該当ディレクトリ: [\`specs/intents/draft-payment-intent-charge-00.md\`](https://github.com/tempoxyz/mpp-specs/blob/main/specs/intents/draft-payment-intent-charge-00.md) が現時点で公開されている唯一の intent ドラフト。authorize と subscription は README によればロードマップに記載されています。

## プロトコルから production へ — \`tempo wallet\`

[\`tempoxyz/wallet\`](https://github.com/tempoxyz/wallet) は MPP の正規の動作統合例です。MPP がビルトインされた CLI ウォレットで、3 つのコマンドで全フローが実行できます:

\`\`\`bash
tempo wallet login                        # passkey ログイン、ブラウザが開く
tempo wallet fund                         # 残高をトップアップ
tempo request https://aviationstack.mpp.tempo.xyz/v1/flights?flight_iata=AA100
\`\`\`

3 番目がレッスンの中核です。\`tempo request <url>\` が 402 のやりとり全体 — challenge、署名、支払い、再試行 — を実行し、レスポンス本体を表示する。API キー不要、請求アカウント不要、*ウォレットがあって資金が入っているだけ* で済みます。

ウォレットがサポートする支払い形態は 2 つ、[README](https://github.com/tempoxyz/wallet/blob/main/README.md) のとおり:

| 形態 | トレードオフ | 使うとき |
| :--- | :--- | :--- |
| **One-shot (charge)** | リクエストごとに独立してオンチェーン決済。セッション状態なし | 単発の有料コール、低頻度のアクセス |
| **Session (channel)** | オンチェーンチャネルを 1 度開く。オフチェーン voucher をリクエストごとに交換。close 時に決済 | ストリーミング (SSE のトークン単位課金など)、同一エンドポイントへの反復コール |

セッションモードは、先ほどの「1 分あたり 1000 リクエスト」予測に対する Intents 層からの答えを具体化したものです。

もう一歩踏み込んだ設計ポイント: ログインフローは **passkey** (Touch ID / Face ID / ハードウェアキー) を使って **スコープ付きセッションキー** — 時限・上限金額・チェーンバウンド — を認可し、CLI はそれを使って署名する。passkey 自体はブラウザの外に出ません。CLI が保持しているのは制限付きクレデンシャルであり、root キーではない。これは agent に権限を渡すときに採用すべきパターンと同じです — 全権の鍵は渡さず、期限と権限を絞ったキーを渡す。

> 🔍 **リポで探す。** ウォレットの [\`ARCHITECTURE.md\`](https://github.com/tempoxyz/wallet/blob/main/ARCHITECTURE.md) を開く (またはトップレベルの Rust crate に目を通す)。**自分の言葉で答えてください:** ウォレットは passkey 派生のセッションキーをどの層に保持しているか? どの層で \`PaymentProvider\` を MPP ミドルウェアに渡しているか? この答えが、本仕組みの上に agent を構築するときのデプロイ形を教えてくれます。

## 冒頭の予測に答える

**なぜ \`WWW-Authenticate: Payment\` は Tempo に固定されず、拡張可能なのか?** 1 つの rail を埋め込んだ瞬間、別の rail を使いたい人すべてからプロトコルを fork されることになるからです。Stripe が MPP を共同 maintain できているのは、Core が rail 中立だからこそ — Stripe は \`methods/stripe/\` ディレクトリを寄贈しているのであり、Core を編集しているわけではない。Lightning、ACH、将来登場するあらゆる rail も同じ形で追加されていきます。

これは [artemis](./build-mev-searcher-ja) (Collector / Strategy / Executor) や [validate-revm](./build-validate-revm-ja) のクロスチェック (Alloy \`Provider\` trait による provider 非依存) でも見たのと同じ trait 分割の規律です。本気のプロトコル/フレームワークは毎回これを繰り返す: *メカニクス* と *ポリシー* と *具体実装* を分離する、そうすれば将来の変更コストが下がる。

## なぜこれが「自分で作るもの」にとって重要か

2 つの角度、どちらも実用的です:

- **有料サービスを提供する側として。** エンドポイントを \`Mpp::create(tempo(...))\` (または Stripe、または両方) でラップします。agent もアプリも 1 リクエストごとに支払える。請求インフラ不要、API キー発行不要、レートリミットダッシュボード不要、Stripe ポータルの統合も不要。各リクエストに見合う金額を charge すれば、プロトコルが決済まで済ませてくれる。L7 のアグリゲータ、L3 のカスタム RPC エンドポイント、L6 の cheatcode harness — どれもこの形で有料化できます。

- **有料サービスを利用する側として。** \`PaymentMiddleware\` を reqwest クライアントに足すだけ。agent — もしくはインデクサ、バリデータの監視スタック — がベンダごとの統合なしに、MPP 対応エンドポイントに支払える。L1 の MEV searcher が有料 mempool feed を欲しい? MPP を差し込む。L4 の wallet backend が有料 data oracle を欲しい? MPP を差し込む。L8 capstone のルータが有料 private order flow を欲しい? MPP を差し込む。

追いかける価値のある実プロダクトのアイデア: *この粒度では agent しか欲しがらない* 有料サービス — 単発のフライト状況、単発のプライシング oracle、トークン単位課金の単発 LLM 補完など。人間向け API はこの粒度では小さすぎて値付けできない、しかし agent 向け API ならできる。MPP がリクエスト単位の決済を安価にしているからです。

## リコールチェックリスト

次に進む前に、スクロールせずに次の問いに答えられることを確認してください:

1. MPP が活用する HTTP ステータスコードは? サーバの \`WWW-Authenticate\` ヘッダはどう見えるか?
2. 仕様の 3 層を挙げ、各層が何を定義しているか述べる。
3. SDK サーバ側で \`Mpp::create(tempo(...))\` は何を提供してくれるか? クライアント側で \`PaymentMiddleware\` は何をするか?
4. Intents 層が Core から分離されているのはなぜか? 具体的なシナリオを 1 つ挙げる。
5. \`tempo request\` の one-shot モードとセッションモードのトレードオフは?

2 か 4 でつまずいたら、次のレッスンに進む前に Core / Intents / Methods の章を読み直してください。

## ドリル

1. **IETF ドラフトを読む。** [\`specs/core/draft-httpauth-payment-00.md\`](https://github.com/tempoxyz/mpp-specs/blob/main/specs/core/draft-httpauth-payment-00.md) を開く。\`Payment\` スキームが定義するヘッダフィールド 3 つと、各々が何を運ぶかを自分の言葉で言えるまで読む。(45 分)
2. **有料エンドポイントを立てる。** [\`mpp-rs\`](https://github.com/tempoxyz/mpp-rs) を clone し、[\`examples/\`](https://github.com/tempoxyz/mpp-rs/tree/main/examples) を参考に、1 ルートで 0.01 を charge する axum サーバを動かす。curl で叩いて 402 を観察、\`tempo request\` で叩いて 200 を観察する。(2 時間)
3. **既存サービスをラップする。** これまでのレッスンで作った成果物のうち 1 つを選ぶ — たとえば L3 のカスタム RPC エンドポイント。\`mpp\` の axum 統合を追加し、コールごとに charge する。ウォレットで検証。(3 時間)
4. **セッションをトレースする。** 有料 SSE エンドポイントに対してセッションモードで \`tempo request\` を実行し、ネットワークをトレースする: チャネルはいつ open するか? voucher はいつ交換されるか? いつ決済されるか? \`tempo wallet sessions list\` と \`close\` で状態を確認する。(1.5 時間)
5. **カスタム provider を実装する。** SDK にない payment rail を 1 つ選ぶ (好きな L2 のネイティブ資産など)。\`PaymentProvider\` (クライアント側) と \`ChargeMethod\` (サーバ側) を実装。自分の有料エンドポイントに対してテストする。*抽象が本当に役に立つかどうかのテスト* です。(4 時間)

ドリル 3 まで進めば、本物のインフラにデプロイ可能な有料エンドポイントを持っていることになる。ドリル 5 まで進めば、プロトコルを自分で拡張できるレベルまで内在化できたと言えます。

> 🛑 **最終チェック。** 一文で答えてください: API キーと Stripe Checkout の組み合わせでは agent に提供できないもののうち、MPP が提供してくれるものは何か? 答えに *リクエスト単位決済、アカウント不要、rail ロックイン不要* が入っていなければ、冒頭を読み直してください — その 3 点こそが本プロトコルが存在する理由のすべてです。

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

3 つすべてがエンドポイントをローカル起動した状態で pass するまで（payment leg は forked Tempo testnet か anvil で）、レッスンは **未完了**。replay テストで fail する 402 エンドポイントは、URL を見つけた誰かが来るのを待っている wallet drainer です。

> **🧭 ここまでで進んだ場所:** **ネットワーク層の支払いプロトコル** を ship した — HTTP 402 challenge、micropayment receipt、replay 防止。TLS が HTTP を暗号で拡張したのと同じ抽象パターンを、決済に当てはめた形。これで本 tier 11 レッスンが完了 — systems-engineering スタックの各層（ネットワーク、DB、VM、認証、並行性）に対して、エンドツーエンドで構築され test gate で動作が証明されたアプリケーションが、それぞれ少なくともひとつ揃った。**本 tier の約束がここで履行された。**
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
