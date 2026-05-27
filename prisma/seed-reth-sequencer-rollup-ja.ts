import { PrismaClient } from '@prisma/client';

export async function seedRethSequencerRollupJA(prisma: PrismaClient) {
  const tags = ['reth', 'sequencer', 'rollup', 'fraud-proofs', 'validity-proofs', 'mev-boost', 'shared-sequencer', 'l2', 'expert'];

  await prisma.course.create({
    data: {
      slug: 'reth-sequencer-rollup-ja',
      title: 'Sequencer & Rollup アーキテクチャ — 中央集権ブロック生成から共有 sequencer まで',
      description:
        '現代の L2 が実際どう動くか: sequencer の役割、batch 投稿と data availability、fraud proof vs validity (ZK) proof、op-rbuilder と op-batcher を読み、Reth 上で最小 sequencer を作り、単一オペレータから共有 sequencer までの分散化パス。Tempo Moderato 級の L2を architect、OP Stack chain を出荷、次の共有 sequencer を作る準備ができる。',
      difficulty: 'ADVANCED',
      duration: 165,
      xpReward: 500,
      track: 'reth-l1-architect',
      tags,
      isPublished: true,
      sortOrder: 320,
      locale: 'ja',
      instructorName: 'RethLab',
      modules: {
        create: [
          {
            title: 'Sequencer の基礎',
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: 'Sequencer とは何か? Rollup モデルを 15 分で',
                  slug: 'sequencer-fundamentals-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 16,
                  xpReward: 40,
                  content: `# Sequencer とは何か? Rollup モデルを 15 分で

Base で swap を送る。1 秒未満で confirm。Wallet に tx が表示される。その順序を決め、自社サーバで実行し、**いずれ** Ethereum に投稿するのは **1 企業** — Coinbase。慣習的な定義に従えばこれは中央集権システム。それなのになぜ Base は「分散化された rollup」と呼ばれるのか?

本レッスンがその答え。**Sequencer**(rollup 上で transaction を順序付ける主体)は Base、Optimism、Arbitrum、Mantle、ほぼ全ての本番 L2 で中央集権。分散化はどこでも「ロードマップ上」、しかも何年もロードマップ上のまま。これは恥ではなく — 設計の選択である。

> 🛑 **スクロール前に予測。** Optimism は OP Labs チームが運用する **sequencer を 1 つだけ持つ**。**なぜこれが許容可能なのか?** Single sequencer であっても、rollup アーキテクチャがなければ可能になる攻撃のうち、緩和できるものは何か?

## 1. Rollup モデル

Rollup は 2 つの要素の組み合わせ:

1. **L2 実行環境** — 独自 EVM、独自 state、独自のブロック生成
2. **L1 へのコミットメント** — Ethereum(または別の base chain)への定期的な data + state root 提出

Sequencer が担うのは part 1。具体的には:
- ユーザ tx を受信する
- 順序付ける
- L2で実行する
- L2 ブロックを生成する
- L1に batch を提出する

\`\`\`mermaid
flowchart TB
    Users["L2 Users"] -->|submit tx| Seq["Sequencer<br/>(centralized)"]
    Seq -->|execute| L2["L2 chain<br/>(Reth-based execution)"]
    L2 -->|batch| Batcher["Batcher<br/>(off-chain)"]
    Batcher -->|post calldata + state root| L1["L1 (Ethereum)"]
    L1 -->|finalize after challenge| L2
\`\`\`

アーキテクチャ上の見返り: **中央集権 sequencer であってもユーザ資金は危険にさらされない**。検閲されたら、ユーザは L1の force-inclusion contract に直接 tx を提出できる — プロトコルが期限付きで sequencer に含めることを強制する。State について嘘をついたら、L1 contract が withdrawal を拒否する。

これが rollup モデルの売り: **sequencer を UX については信頼する、資金については信頼しない**。

## 2. Sequencer の 3 つの役割

すべての sequencer が以下の 3 つを担う:

| 役割 | 内容 | 場所 |
| :--- | :--- | :--- |
| **Ordering** | 各 L2 ブロックの tx 順序を選ぶ | L2 上 |
| **Execution** | revm で実行し post-state を生成する | L2 上 |
| **Batching** | L2 ブロックをまとめて L1に投稿する | Off-chain → L1 |

OP Stack chain では、これらは 3 つの repo に対応する:
- **op-rbuilder**(または op-geth): 実行 + 順序付け
- **op-batcher**: batch サービス
- **op-proposer**: state root 提出サービス

Reth ベースの L2 もこの構造を踏襲する。Sequencer は実行層として Reth を走らせ、batcher と proposer は別サービスとして動かす。

> 🛑 **理解度チェック。** ユーザが sequencer に tx を提出する。Sequencer はそれを無視する(検閲)。**ユーザに何ができるかを追跡せよ**。答えに「L1 force-inclusion contract」が出てこなければ、rollup のセキュリティモデルをまだ自分のものにできていない。

ユーザは **L1 inbox contract**(例: OptimismPortal)に tx を提出する。Sequencer はプロトコルルールにより、期限内(OP Stack ではおよそ 1 時間)にその tx を含めることを強制される。期限を過ぎれば、誰でも inclusion を強制できる。つまり **検閲のコストは有限** — 最大 1 時間の遅延 + L1 ガス手数料で済む。

## 3. 中央集権パラドックス

分散化こそが眼目のはずなのに、なぜ中央集権 sequencer を出荷するのか? 中央集権をデフォルトとして残し続ける 5 つの実用的な理由:

1. **性能**: 中央集権 sequencer は予測可能な順序付けができる。分散化 = コンセンサスのオーバーヘッド = レイテンシ。
2. **MEV**(maximal extractable value — tx の再順序付けでブロックビルダが取り込める価値): 中央集権 sequencer が MEV 抽出を制御する。分散化すると MEV を諦めるか auction で調整するかの二択になる。
3. **Liveness**: 1 オペレータを online に保つほうが、複数バリデータを協調させるよりも容易。
4. **Pre-confirmation**: 単一 sequencer なら「あなたの tx は含まれる」と即時に約束できる。複数当事者では投票が必要。
5. **運用のシンプルさ**: monitoring、on-call、deploy — 1 オペレータならどれも容易。

トレードオフは **UX(中央集権 sequencer)vs 検閲耐性(分散化)**。大半の L2 は UX を選ぶ。

Tempo Moderato(Tempo の testnet)は現時点で中央集権。Hyperliquid も中央集権。両方とも最終的には分散化を目指すが、**launch 時点では違う**。

## 4. L1↔L2 通信層

任意の rollup について、L1 上で 3 つの contract が役割を担う:

| Contract | 役割 |
| :--- | :--- |
| **Inbox**(OptimismPortal) | Deposit と強制 include tx を受信する |
| **Outbox / OutputOracle** | Sequencer から state root の commitment を受信する |
| **Bridge** | ユーザ向けインタフェース — Inbox を asset 転送用に wrap する |

Sequencer は L1 ブロックごとに Inbox を **読み続けなければならない**。Deposit や強制 include tx を期限(およそ 1 時間)より長く無視すれば、sequencer は **遅延状態** としてチャレンジ可能になる。

逆方向では、sequencer が state root を OutputOracle に **提出する**。これがチャレンジ期間の起点となる(optimistic rollup で 7 日、ZK rollup では即時)。

> 🛑 **予測。** Sequencer が 2 時間 offline になる。**L2 chain に何が起こるか?** ユーザ資金はどうなるか? 慎重に追跡せよ。

L2 chain は **停止する**(新ブロックが生成されない)。ユーザ資金は **安全**(state 変更が一切起きていない)。2 時間後: Inbox 経由で提出した depositor は、何らかの「escape hatch」機構が動けば tx を強制実行できる。正確な回復経路は rollup ごとの具体的な contract に依存する。

## 5. Reth が収まる場所

Reth は sequencer の **実行層** として動く。Sequencer は EL として Reth を走らせ、Engine API を呼ぶ:
- 新しい L2 head に対して \`forkchoiceUpdated\`
- 構築済みの L2 ブロックを \`getPayload\` で取得
- \`newPayload\` で検証(sequencer 自身が構築したブロックなので通常は no-op)

OP Stack については、reth の \`crates/optimism/\` が OP を理解する実行層を提供する。Sequencer は Engine API 経由で Reth を駆動する別プロセスとして動く。

Tempo についても同じパターン。Reth が実行を担い、Paradigm 製の sequencer がそれを駆動する。

## 6. 分散化スペクトラム

Rollup はスペクトラム上のどこかに位置する:

| 位置 | 例 | Trust モデル |
| :--- | :--- | :--- |
| **Single sequencer** | Optimism、Arbitrum(launch 時)、Base | Liveness は 1 オペレータを信頼、safety は escape hatch |
| **Multi-sequencer**(whitelist) | 一部 L3、validium chain | N オペレータを信頼(M-of-N) |
| **分散化 sequencer**(共有なし) | Polygon zkEVM(近年) | PoS 系の sequencer 選出 |
| **共有 sequencer** | Espresso、Astria、Radius | 1 つの sequencer セットが複数 rollup にサービス提供 |

大半の chain は位置 1 にいる。位置 4 がアーキテクチャ上のフロンティア — Lesson 6 で扱う。

## 7. 自分のプロジェクトに引き寄せる

### Tempo Moderato → Tempo mainnet

- 今日: 中央集権 sequencer(Paradigm が運用)
- 分散化パス: マルチオペレータ → PoS → 最終的には共有 sequencer も
- Soltempo / mppsol のコードは **sequencer の RPC** とやり取りし、chain の source of truth として扱う

### Tempo Zones — アンカー型の confidential パターン

Sequencer アーキテクチャのバリエーションとして押さえておく価値がある。[\`tempoxyz/zones\`](https://github.com/tempoxyz/zones) は **Tempo にアンカーされた** プライベートブロックチェーン。各 Zone は自前の sequencer を **250ms のブロック時間** で運用し、confidential な tx(暗号化された残高と受取人)を処理し、**Tempo のブロックごと(約 500ms)に、バッチ化された withdrawal を Tempo へ提出する**。コンプライアンスポリシー(TIP-403)は Tempo L1から継承され、Zone 内で強制される。アーキテクチャ上の学び: 自分が同時に運用する L1の上に乗る「ロールアップ的」なプライバシー chain、アンカー型の finality と継承された compliance を伴う — 大半の L2 設計がまだ名前を持っていないパターンである。

### 仮想「自分の L2」

OP Stack で chain を立ち上げる:
- Sequencer を運用する(cargo run op-rbuilder)
- Batcher を運用する
- Proposer を運用する
- ユーザは liveness について自分を信頼し、safety については L1 contract を信頼する

これをゼロから構築するのが次の 4 レッスン。

## 8. 読み物

- [Optimism docs - Sequencer architecture](https://docs.optimism.io/op-stack/protocol/getting-started)
- [Vitalik on rollups](https://vitalik.eth.limo/general/2021/01/05/rollup.html) — 基礎エッセイ
- [Astria docs — shared sequencer intro](https://docs.astria.org/overview/introduction) — 未来方向

## 9. 練習

各 chain について(a)スペクトラム上の sequencer の位置、(b)sequencer downtime からユーザがどう回復できるか、を特定せよ:

1. Optimism mainnet
2. Arbitrum One
3. Polygon zkEVM
4. Tempo Moderato(公開情報の範囲で)
5. Hyperliquid

> 最終チェック: 一文で、なぜ「中央集権 sequencer」が「中央集権 rollup」を意味しないのか説明せよ。**答えに「UX は信頼、資金は信頼しない」が出てこなければ §1 を再読**。`,
                },
                {
                  title: 'Batch 投稿と data availability',
                  slug: 'sequencer-batch-da-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 16,
                  xpReward: 40,
                  content: `# Batch 投稿と data availability

2024 年 3 月以前、Ethereum に rollup data を 1MB 投稿するコストは **batch あたり約 $300** だった。EIP-4844 後、同じ 1MB が **$3〜$30** に下がった。10 倍のコスト低下は rollup 史上最大のコスト改善で、Base の tx 手数料がドル単位ではなくセント単位で済むようになった理由でもある。

この改善はより深い問いの上に成り立つ: **そもそもなぜ rollup は L1に data を投稿しなければならないのか?** 答えが **data availability**(DA — sequencer 以外でも誰もが transaction data を取得できる、という性質)である。これがなければ sequencer の state root は検証不可能になり、1 企業を信頼するという話に逆戻りしてしまう。本レッスンでは DA とは何か、4 つの DA モデル、それを安くした EIP-4844 blob の仕掛け、そして op-batcher が実際にどう投稿するかを扱う。

> 🛑 **スクロール前に予測。** Rollup が 12 分ごとに L1に 1MB の transaction data を投稿するとする。**Ethereum mainnet のガス価格で 1 日あたりいくらかかるか?** EIP-4844 の前と後ではコスト差はどれだけになるか?

## 1. なぜ data availability が重要か

Rollup は **state root** を介して L1にコミットする。だが state root は 32 byte だけで、L2 state が *何* なのかは教えてくれない。L2 state を再構築するには次の 2 つが必要:

1. **State root**(安価 — batch あたり 32 byte)
2. State root を生成した **transaction data**(高価 — 各 tx の各 byte)

(1)だけが L1 上にあるなら、sequencer は (2) について嘘をつけて、誰にも検知できない。
両方が L1 上にあるなら、誰でも tx を再実行して同じ state root が出るかを検証できる。

**Data availability** = 「transaction data が皆の読める場所に公開されている」という性質。

## 2. 4 つの DA モデル

| モデル | Data の場所 | Trust | 例 |
| :--- | :--- | :--- | :--- |
| **Rollup** | L1 calldata または blob に投稿 | L1 コンセンサス | Optimism、Arbitrum、すべての「真の」rollup |
| **Validium** | 別の DA 委員会に投稿 | Multisig / PoS | StarkEx、dYdX v3 |
| **Volition** | ユーザが tx ごとに選ぶ(rollup か validium か) | 混合 | dYdX v4 系のハイブリッド |
| **Optimium** | Fraud proof 付きの DA 委員会 | DA 委員会 + fraud proof | より新しい設計 |

Tempo、Hyperliquid、関心のある大半の chain は **rollup** モデルを採る。Data は何らかの形で L1に流れる。

## 3. EIP-4844 — blob 革命

2024 年 3 月以前、rollup は **calldata**(通常の Ethereum transaction の input bytes)として L1に data を投稿していた。Calldata は byte あたりおよそ 16 gas で、50 gwei では byte あたり約 $0.02、1MB の batch で約 $300 になっていた。

EIP-4844 はまったく新しい transaction type — **blob transaction** — を導入し、独自の fee market を持たせ、たった 1 つのユースケース、すなわち rollup の DA に向けて価格付けした。

| 性質 | Calldata | Blob(4844) |
| :--- | :--- | :--- |
| byte あたりコスト | 約 16 gas | 可変、典型的には 0.1〜1 gas |
| L1 上の寿命 | 永久 | 約 18 日(その後 prune) |
| 検証 | 誰でも読める | 18 日間は誰でも読める |
| ブロックあたり最大 | 実用 ~125KB | 128KB × 6 = 768KB |

トレードオフ: blob は **安価** だが **prune 可能**。18 日後には blob data は L1 ノードから消える。長期保存が必要なら別途アーカイブが要る(例: IPFS、専用アーカイブノード)。

18 日の proof window については、fraud proof を提出するには十分な時間。その後は rollup の state は最終確定し、data が L1 上に残っている必要はない。

> 🛑 **理解度チェック。** 「Blob は安価で rollup は今や 10 倍安くなった」**部分的には正しい**。**落とし穴は何か?** なぜ 10 倍の削減はすべての rollup に均等には適用されないのか?

落とし穴: blob は **利用可能** だが **ブロックスペースを巡って競合する**。Blob を投稿する rollup が増えれば blob のガス価格は上がる。現状の均衡では 10 倍の削減になっているが、すべての rollup が blob に移行すれば 3〜5 倍まで圧縮されうる。さらに、すべての chain が Ethereum を DA に使うわけではない — Celestia、EigenDA、Avail が代替として存在する。

## 4. Batch 投稿フロー

Ethereum に投稿する OP Stack rollup 向け:

\`\`\`mermaid
sequenceDiagram
    participant Seq as Sequencer
    participant Batcher
    participant L1 as Ethereum
    participant Proposer

    Note over Seq: 多くの L2 ブロック構築
    Seq->>Batcher: L2 ブロック生成済
    Note over Batcher: 圧縮 + batch
    Batcher->>L1: Batch data 付き blob tx 提出
    Note over L1: Blob が L1 ブロックに含まれる
    Note over Seq: Batch の新 state root 計算
    Seq->>Proposer: 最新 state root
    Proposer->>L1: State root を OutputOracle に提出
    Note over L1: チャレンジ期間開始 (7 日)
\`\`\`

3 つの別々のサービスが、それぞれ別の頻度で動く:

| サービス | 頻度 | 目的 |
| :--- | :--- | :--- |
| Sequencer | L2 ブロックごと(約 2 秒) | ブロック構築 |
| Batcher | 約 60 秒ごと | 圧縮した batch を L1に提出 |
| Proposer | 約 1 時間ごと | State root の commitment を提出 |

L1 コストの大半を占めるのは **batcher**(データ量が多い)と **proposer**(データは少ないが commitment ごとに gas がかかる)。

## 5. op-batcher を読み解く

OP Stack の batcher は [\`ethereum-optimism/optimism/op-batcher\`](https://github.com/ethereum-optimism/optimism/tree/develop/op-batcher)(Go)にある。Reth ベース chain 向けの Rust 等価物は開発中。

コアループ:

\`\`\`go
// 明確さのため擬似 Go
for {
    // 1. 最後 batch 以降の新 L2 ブロック取得
    blocks := fetchL2BlocksSince(lastBatchEnd)

    // 2. zlib で圧縮
    compressed := zlib.Compress(blocks)

    // 3. blob サイズチャンクに分割 (~128KB each)
    chunks := chunk(compressed, BLOB_SIZE)

    // 4. L1に blob tx 提出
    for _, chunk := range chunks {
        submitBlobTx(chunk)
    }

    // 5. ローカル状態更新
    lastBatchEnd = blocks.LastBlock
}
\`\`\`

要点はこれだけ。本番では以下のような複雑さが加わる:
- **Reorg 処理**(L2 reorg があれば batch を再送する)
- **ガス価格**(より高い料金でいつ再試行するか)
- **スループット調整**(どれだけ積極的に blob を埋めるか)

> 🔍 **リポで探す。** [op-batcher の main.go](https://github.com/ethereum-optimism/optimism/blob/develop/op-batcher/batcher/driver.go) を開いてメインループを追え。**どこで提出を決定しているか?** トリガーは何か?

## 6. 圧縮 — 静かなる勝者

Rollup の batch は高度に圧縮できる。典型的な圧縮率:

| Data | 圧縮率 |
| :--- | :--- |
| 生の transaction | 1.0x |
| RLP エンコード | 1.0x |
| Batch 単位での zlib | 3〜5x |
| カスタム(zlib + アドレス圧縮など) | 5〜10x |

圧縮率が上がるごとに、同じ blob コストでスループットが倍になる。本番 rollup は vanilla zlib を 2〜3 倍上回るカスタム圧縮を使っている。

Tempo(決済特化)の場合: 決済 tx は非常に反復的(同じ merchant、同じパターン)で、汎用 rollup より高い圧縮率を出せる可能性が高い。**これが Tempo の具体的ユースケースに隠れたコスト優位**。

## 7. DA の代替

Rollup は必ずしも Ethereum に投稿する必要はない:

### 7.1 Celestia

[\`celestia\`](https://github.com/celestiaorg/celestia-app) は専用の DA 層。Rollup は Celestia に data を投稿し、DA の証明を取得し、その証明だけを L1に投稿する。

コスト: Ethereum blob より安い(byte あたり約 $0.0001、blob では約 $0.001)。

トレードオフ: セキュリティが Ethereum ではなく Celestia のものに依存する。Validator set は小さく、エコシステムもまだ若い。

### 7.2 EigenDA

[\`eigenda\`](https://github.com/Layr-Labs/eigenda) は EigenLayer をベースにした DA。EigenLayer 上の ETH restaker が DA サービスを提供する。Ethereum の経済的セキュリティを部分的に継承する。

### 7.3 Avail

[\`avail\`](https://github.com/availproject/avail) は Polygon の DA 層で、構造的には Celestia と似ている。

Tempo の場合: Paradigm 製の L1として、Tempo は当初は Ethereum DA を使う可能性が高い。Celestia/EigenDA への切り替えはコストを下げる一方で、分散化の度合いは下がる(DA validator set が小さくなるため)。

## 8. 練習

1. 計算せよ: 1 分あたり 1MB の batch、blob コスト約 $0.1/MB として、rollup の日次 DA コストはいくらか?
2. Rollup が 100 tx/s を処理し、各 tx が 200 byte だとする。ユーザ tx あたり DA コストはいくらか?
3. op-batcher の source を開き、圧縮を呼び出している箇所を見つけよ。
4. 特定せよ: chain が Ethereum blob ではなく Celestia を選ぶのはどんなときか?

## 9. 読み物

- [EIP-4844 spec](https://eips.ethereum.org/EIPS/eip-4844) — blob の標準仕様
- [op-batcher](https://github.com/ethereum-optimism/optimism/tree/develop/op-batcher) — 本番 batcher
- [Celestia docs](https://docs.celestia.org/) — DA 層の代替

> 最終チェック: 一文で、なぜ **data availability** が rollup のセキュリティの大半を支える前提なのか、そして DA が失敗したらユーザ資金に何が起きるかを説明せよ。**答えに「誰でも L1 data から L2 state を再構築できる」が出てこなければ §1 を再読**。`,
                },
              ],
            },
          },
          {
            title: '実 Sequencer コードを読む',
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: 'op-rbuilder を読む — Reth ベースの OP Stack sequencer',
                  slug: 'sequencer-op-rbuilder-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 18,
                  xpReward: 45,
                  content: `# op-rbuilder を読む — Reth ベースの OP Stack sequencer

今日 OP Stack chain を立ち上げると、ブロック生成を担うバイナリはほぼ確実に [\`flashbots/op-rbuilder\`](https://github.com/flashbots/op-rbuilder) — OP 派生 rollup 向けに Paradigm が書いた Rust block builder になる。Reth ベースの L2 はそれをそのまま走らせるか、そこから fork する。「Reth 上の sequencer」の本番参照実装であり、マーケティング図解では見えない、実際の sequencer が何をしているのかを理解したければここを読むことになる。

> 🛑 **スクロール前に予測。** Sequencer はおよそ 2 秒ごとにブロックを生成する必要がある。**ボトルネックはどちらか — 実行速度(revm)か、ブロック構築(選択 + 順序付け)か?** 答えがどこに最適化を集中させるべきかを決める。

## 1. op-rbuilder のアーキテクチャ

\`\`\`mermaid
flowchart TB
    EngineAPI["Engine API<br/>(rollup consensus から)"] -->|forkchoiceUpdated| Builder["Block Builder"]
    Mempool["L2 Mempool"] -->|pending txs| Builder
    L1Inbox["L1 Inbox<br/>(deposit + force-include)"] -->|deposit イベント| Builder
    Builder -->|ブロック構築| EVM["revm<br/>(実行)"]
    EVM -->|state 変更| State["State DB"]
    Builder -->|署名ブロック| EngineAPI2["Engine API<br/>(getPayload レスポンス)"]
    Builder -->|broadcast| P2P["P2P network<br/>(ノードに伝播)"]
\`\`\`

3 つの入力ストリーム:
1. **Engine API** — コンセンサス側が「何の上にブロックを構築すべきか」を伝える
2. **Mempool** — 含めるのを待つユーザ tx
3. **L1 Inbox** — 必ず含めなければならない deposit tx

Builder はこれらを受け取り、**OP Stack のルール** を順序付けに適用してブロックを生成する。

## 2. OP Stack の順序付けルール

OP ブロックを構築する sequencer が必ず遵守すべき具体ルール:

1. **Deposit を先頭に**: L1 inbox からの deposit tx はブロックの先頭に配置する
2. **L1 epoch への帰属**: ブロックは L1 ブロック(「L1 origin」)を参照する必要がある
3. **Sequencer 署名**: ブロックは現役 sequencer の鍵で署名されなければならない
4. **Gas limit**: OP 固有の上下限の範囲内に収める(mainnet とは異なる)
5. **Force inclusion**: L1 inbox 内の tx が期限を過ぎたら、必ず含める必要がある

これらが OP 固有のブロック validity ルールであり、**op-rbuilder がそのすべてを強制する**。

> 🛑 **理解度チェック。** 「Sequencer は何でもできる」**半分は正しい**。言い直すと、sequencer が実際に制御できる面は何で、コンセンサスが強制する制約はどこにあるか?

Sequencer が選べるもの:
- どのユーザ tx を含めるか
- ユーザ tx の順序
- 帰属させる L1 epoch
- ブロック timestamp(範囲内で)

Sequencer が **選べない** もの:
- Deposit を含めるかどうか(必須)
- Force-included tx をスキップするかどうか(必ず含める)
- ブロック validity ルール(gas limit、base fee の計算)

「選べない」を違反すれば、L1 側の検証が失敗し、ブロックが reorg される。

## 3. op-rbuilder の source を読む

主要なファイル(パスはバージョン間で変動するので、検索で辿る):

| パス | 役割 |
| :--- | :--- |
| \`crates/builder/src/payload.rs\` | コアのブロック構築ループ |
| \`crates/builder/src/ordering.rs\` | Tx の順序付け戦略 |
| \`crates/builder/src/deposit.rs\` | Deposit tx の処理 |
| \`crates/builder/src/seal.rs\` | ブロックの sealing と署名 |

メインの構築関数のおおよその形:

\`\`\`rust
async fn build_payload(
    attributes: PayloadAttributes,
    parent: BlockHash,
    state: StateProvider,
    pool: TxPool,
) -> eyre::Result<ExecutionPayload> {
    let mut block_env = BlockEnv::from(parent, attributes);
    let mut executor = Executor::new(state, &block_env);
    let mut included_txs = Vec::new();

    // 1. Deposit tx を強制 include
    for deposit_tx in attributes.l1_deposits {
        executor.execute(&deposit_tx)?;
        included_txs.push(deposit_tx);
    }

    // 2. Force-inclusion tx を include (期限超過 inbox)
    for force_tx in attributes.force_included {
        executor.execute(&force_tx)?;
        included_txs.push(force_tx);
    }

    // 3. Gas limit までの mempool から pull
    let pending = pool.best_pending();
    for tx in pending {
        if executor.gas_used() + tx.gas_limit() > block_env.gas_limit {
            break;
        }
        match executor.execute(&tx) {
            Ok(_) => included_txs.push(tx),
            Err(_) => continue, // 失敗 tx スキップ
        }
    }

    // 4. ブロック seal (root 計算、署名)
    let payload = ExecutionPayload {
        header: build_header(&block_env, &executor, &included_txs),
        transactions: included_txs,
    };

    Ok(payload)
}
\`\`\`

これが sequencer ループのおよそ 30 行分。本番の op-rbuilder にはさらに次の複雑さが加わる:
- 非同期実行(構築中にも tx を受け付ける)
- Reorg 処理(構築中に parent が変わる)
- MEV を意識した順序付け(高 fee tx を優先、sandwich 耐性のある順序)
- ガス推定の精度

> 🔍 **リポで探す。** [op-rbuilder の payload builder source](https://github.com/flashbots/op-rbuilder) を開いて、実際の \`build_payload\`(または相当する関数)を見つけよ。**構築中に parent ブロックが変わるケースをどう処理しているか?**

## 4. MEV の問題 — Sequencer は何を抽出するか

Tx の順序を選ぶ者が、誰が利益を得るかを選ぶ。OP Stack chain では、その権力をどこまで積極的に sequencer が収益化するかについて 3 つの立場がある:

| 立場 | Sequencer がすること | 例 |
| :--- | :--- | :--- |
| **Vanilla FIFO** | 提出時刻順 | naive な実装 |
| **Priority-fee 順序付け** | ガスチップ順(Ethereum mainnet 系) | OP Stack のデフォルト |
| **MEV 認識 builder market** | ブロック構築のための外部入札を受け入れる | OP Stack + op-rbuilder + bundle market |

op-rbuilder は 3 つ目をサポートしており、chain ごとに **builder/searcher(最も価値の高いブロックを構築しようと競い合う第三者のブロック構築者)からの外部 bundle を受け入れるかどうか** を設定できる。Bundle market が sequencer にブロックスペース代を支払う構図になる。

ここに **Flashbots 系の PBS**(proposer-builder separation — ブロックを *選ぶ* 者と *構築する* 者を分離する)が L2に降りてくる: builder が最も収益的なブロックの構築を競い、sequencer が勝った入札を受け入れる。

## 5. Pre-confirmation のゲーム

単一 sequencer のキラー UX 機能が **pre-confirmation** だ。tx を提出した瞬間、sequencer が「はい、これは block N の位置 M に含めます」と署名付きで返す。L1 finality を待つよりずっと早く、100ms でユーザに「confirmed」を表示できる。

この芸当は **sequencer が 1 つのときしか成立しない**。複数当事者では投票が必要になり、投票には round trip がかかる。

op-rbuilder の場合、mempool 受け入れのステップが pre-confirmation を発行する場所。Sequencer が「この tx を含めることをコミットする」と署名すれば、ユーザは L1 finality を待たずに最終扱いにできる。

> 🛑 **理解度チェック。** 「Pre-confirmation はタダ」**ノー**。Pre-conf を発行するときに sequencer が負うリスクは何か? 答えに「reorg」または「L1 challenge」が出てこなければ、このコミットメントを理解できていない。

Sequencer は inclusion をコミットする。L2 reorg(起こりうる)があれば、tx は canonical chain から外れる可能性がある。設計によっては、pre-conf に違反した sequencer が slash されることもある。

## 6. Tempo の sequencer に当てはめる

Tempo の sequencer(Paradigm が運用)はほぼ確実に次のような構成になっている:

- op-rbuilder か類似の Rust block builder を使う
- OP Stack 系の順序付けルールを実装する(deposit 優先、force inclusion、署名)
- Merchant 向けに pre-confirmation を発行する(秒未満の UX)
- Merchant 優先の bump 付き priority-fee 順序付けをサポートする
- 不正検知用の緊急停止権限を備える

アーキテクチャ・パターン自体はどの OP Stack L2とも同じで、その上に乗るビジネスロジック(merchant 優先、不正検知)が特化部分になる。

## 7. 練習

1. op-rbuilder を clone する(またはオンラインで眺める)
2. Deposit tx を処理しているコードを見つける
3. ユーザが sequencer の RPC 経由で tx を提出したときに何が起きるかを追跡する
4. 特定する: op-rbuilder は、priority fee は支払うが実行で revert する mempool 内の tx をどう扱うか?

## 8. 読み物

- [op-rbuilder repo](https://github.com/flashbots/op-rbuilder)
- [Optimism sequencer spec](https://specs.optimism.io/protocol/derivation.html) — L2 chain がどう導出されるか
- [Paradigm rbuilder talk](https://www.youtube.com/watch?v=N6c0LE4Sgis) — 設計哲学

> 最終チェック: 一文で、sequencer が恒久的に好きなように順序を変えたり exclude したりするのを防ぐ、コンセンサスが強制する制約の核は何か? **答えに「L1 force-inclusion + 期限」が出てこなければ §2 を再読**。`,
                },
                {
                  title: 'Fraud proof vs validity (ZK) proof',
                  slug: 'sequencer-fraud-zk-proofs-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 16,
                  xpReward: 45,
                  content: `# Fraud proof vs validity (ZK) proof

Optimism から withdraw する。**7 日**待つ。zkSync から withdraw する。**およそ 1 時間**待つ。どちらも Ethereum に投稿する EVM rollup である。この 170 倍の差は Optimism のチームが遅いからではなく、Optimism が **fraud proof** を、zkSync が **validity proof** を選んだからで、その単一の選択が下流の UX の決定をすべて引き連れていく。

Rollup の L1 contract は、sequencer の state root クレームを **一定期間**(チャレンジ window)信頼する。Window が閉じた後、state root は最終確定する。その window の中で何が起きるかの 2 つのパラダイムが、**fraud proof**(チャレンジ・ベース — 「誤りが証明されない限り信頼する」)と **validity / ZK proof**(暗号的アプローチ — 「常に正確性の proof を要求する」)である。Optimistic か ZK、一方を選ぶと、残りはすべてそれに従う。

> 🛑 **スクロール前に予測。** Optimism の withdrawal は 7 日、zkSync の withdrawal はおよそ 1 時間。**170 倍の差を生む構造的な理由は何か?**(ヒント: 技術が優れているからではない、proof のパラダイムが違うからである。)

## 1. State root commitment の問題

Sequencer が約 1 時間ごとに L1に state root を提出する。L1 contract は次を判断する必要がある: **この state root は正しいのか?**

選択肢は 3 つ:
1. **常に信頼する** — 純粋な信頼、proof なし(validium / sidechain)
2. **信頼するが、チャレンジャが誤りを証明できるようにする** — fraud proof(optimistic)
3. **正確性の proof を必須にする** — validity proof(ZK)

それぞれ別のトレードオフを持つ。

## 2. Fraud proof — optimistic モデル

流れ:
1. Sequencer が L1に state root S を投稿する
2. チャレンジ window が開く(OP Stack では 7 日)
3. Window の間、**誰でも** S が誤りだと示す **fraud proof** を提出できる
4. 有効な fraud proof が提出されれば、S は拒否され chain は reorg される
5. 7 日後、S が最終確定する

Fraud proof 自体は **不正実行の証明** である: 「sequencer は tx T が state S を生むと主張したが、実際には state S' を生む」。L1 contract が検証者ゲームで disputed step を再実行して決着をつける。

\`\`\`mermaid
sequenceDiagram
    participant Seq as Sequencer
    participant L1 as L1 Output Oracle
    participant Challenger
    participant Verifier as Fraud Proof Verifier

    Seq->>L1: State root S 提出 (claim)
    Note over L1: 7 日チャレンジ window 開
    Challenger->>Challenger: S が間違いと検知
    Challenger->>Verifier: Fraud proof 提出
    Verifier->>Verifier: Disputed step を再実行
    Verifier->>L1: S は invalid
    L1->>L1: State root 拒否、chain reorg
\`\`\`

トレードオフ: **誰でもチャレンジできるが、finality までに 7 日待たされる**。

## 3. Validity(ZK)proof — 暗号的モデル

流れ:
1. Sequencer が L2 ブロックを生成する
2. Sequencer(または別の prover)が L2 実行が正しい旨の **ZK proof** を生成する
3. Proof を新しい state root と一緒に L1に提出する
4. L1 contract が **proof を検証する**(安価 — およそ 100k gas)
5. Proof が検証されれば、state root は **即時最終確定**

チャレンジ期間はなく、待ち時間もない。

\`\`\`mermaid
sequenceDiagram
    participant Seq as Sequencer
    participant Prover
    participant L1 as L1 Verifier
    participant User

    Seq->>Seq: L2 ブロック構築
    Seq->>Prover: 実行 trace 送信
    Prover->>Prover: ZK proof 生成 (~分/時間)
    Prover->>L1: Proof + 新 state root 提出
    L1->>L1: Proof 検証 (~ms on-chain)
    L1->>L1: State root 即時最終
    User->>L1: 待たずに withdrawal 可能
\`\`\`

トレードオフ: **proving のコストが高い**(compute、時間、gas)、しかし **withdrawal は即時** になる。

## 4. コスト比較

| 性質 | Optimistic | ZK |
| :--- | :--- | :--- |
| **Batch あたり L1 コスト** | 約 $1〜5(data + state root) | 約 $50〜500(proof の検証) |
| **Withdrawal の遅延** | 7 日 | 数時間(proving 時間) |
| **L2 コスト** | Ethereum と同程度 | Ethereum と同程度 |
| **Proof 生成** | 無料(チャレンジ時のみ) | 常時、batch あたり $1〜100 |
| **代表的実装** | OP Stack、Arbitrum | Polygon zkEVM、zkSync、Scroll |

高頻度の batch(1 時間未満)では、**ZK のほうが batch あたりの費用が高い**。低頻度の batch では、**optimistic のほうが安いが finalize が遅い**。

> 🛑 **理解度チェック。** 「ZK rollup は optimistic rollup より優れている」**フレーミングが間違っている**。違うトレードオフを選んでいるだけだ。言い直すと、いつ optimistic が勝ち、いつ ZK が勝つのか?

Optimistic が勝つ場面:
- L1 コストが低い
- ツーリングが成熟している
- 汎用 EVM 互換が取りやすい

ZK が勝つ場面:
- 即時 finality(7 日の待ちがない)
- クロスチェーン相互運用に向く(他 chain が proof を信頼できる)
- コンプライアンス用途に向く(監査可能な proof)

## 5. Fraud proof のコードを読み解く — OP Stack Cannon

OP Stack の fraud proof システムは **Cannon** だ。自明でない設計上のひねりとして、L2 全体を L1で再実行する(コストが高すぎて不可能)のではなく、Cannon は L1 上で動く制約付き MIPS VM の中で **disputed な 1 つの MIPS 命令だけ** を再実行する。

流れ:
1. Challenger が「step X が間違っている」と主張する
2. Bisection ゲーム: 両当事者が単一 MIPS 命令まで二分探索で絞り込む
3. L1 contract がその 1 命令を実行する
4. 命令の正誤を正しく主張した側が勝つ

[\`ethereum-optimism/optimism/cannon\`](https://github.com/ethereum-optimism/optimism/tree/develop/cannon) がコードベース。

1 命令まで絞り込むこのパターンこそが、fraud proof を *そもそも実現可能にしている* — これがなければ L1に何年分もの L2 履歴を再実行させることになる。

## 6. ZK proof のコードを読み解く — SP1 + Reth

[\`succinctlabs/sp1\`](https://github.com/succinctlabs/sp1) は revm 経由で EVM 実行を証明できる zkVM。流れ:

1. Reth が L2 ブロックを実行する(通常の実行)
2. SP1 の「guest program」が revm 実行をラップする
3. SP1 が、revm が主張する state 変更を確かに生成したという proof を出す
4. Proof を on-chain に提出する

Reth ベースの ZK rollup では、**同じ revm のコードが実行と proving の両方で走る**。これが Rust EVM スタックが ZK rollup にとって重要である理由でもある。

## 7. 未来 — RISC Zero、SP1、Reth 上の ZK rollup

2025〜2026 のトレンド: ZK proving のコストが急速に下落している。SP1、RISC Zero、Polyhedra のいずれも Ethereum ブロックあたり proof 1 本につき $1〜10 のレンジに到達している。このコスト水準なら、**ZK rollup が汎用決済の領域でも競合可能** になる。

Tempo は(もし ZK 方向に進むなら)これらの proving システムのどれかを使う可能性が高い。Hyperliquid は当面 optimistic を維持する可能性がある(MEV 抽出モデルが ZK の利点とかみ合わないため)。

## 8. Tempo の分散化パスに当てはめる

Tempo Moderato が現時点で中央集権だとすると、分散化のパスは恐らく次のようになる:

1. **今日**: 中央集権 sequencer、fraud/validity proof なし(Paradigm を信頼)
2. **Phase 2**: optimistic fraud proof を追加(誰でもチャレンジ可能に)
3. **Phase 3**: ZK proof(即時 finality)
4. **Phase 4**: 分散化された sequencer セット + ZK proof

各ステップは、複雑さと運用オーバーヘッドの代償と引き換えに、信頼の最小化を一段ずつ進めるものだ。

## 9. 練習

1. Optimism の [fraud proof spec](https://specs.optimism.io/fault-proof/index.html) を読む
2. SP1 の [EVM proving guide](https://docs.succinct.xyz/) を読む
3. 計算せよ: ZK proof が batch あたり $5、fraud proof の検証が $1 のとき、高スループットの chain にとって ZK が optimistic より安くなるのはいつか?
4. 特定せよ: 安価でも chain が ZK proof を採らない場合はどんなときか?

## 10. 読み物

- [Vitalik の fraud proof intro](https://vitalik.eth.limo/general/2021/01/05/rollup.html)
- [Cannon(OP Stack の fraud proof)](https://github.com/ethereum-optimism/optimism/tree/develop/cannon)
- [SP1(ZK proving)](https://github.com/succinctlabs/sp1)

> 最終チェック: 一文で、なぜ fraud proof と validity proof の選択が rollup の **他のあらゆる** UX 側面を規定してしまうのか説明せよ。**答えに「withdrawal 遅延」や「trust window」が出てこなければ §2〜§4 を再読**。`,
                },
              ],
            },
          },
          {
            title: '構築と分散化',
            sortOrder: 2,
            lessons: {
              create: [
                {
                  title: 'Reth 上で最小 sequencer を作る',
                  slug: 'sequencer-build-minimal-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 20,
                  xpReward: 55,
                  content: `# Reth 上で最小 sequencer を作る

動く L2 sequencer は **Rust 約 270 行** で書ける。これがオーケストレーション層のすべて: ブロック生成ループ、mempool、L1 inbox watcher、batcher。それがこれほど小さく収まる理由は、**本当に難しいところを Reth がすべて引き受けてくれる** からだ — revm の実行、MDBX のストレージ、state 管理、P2P。Sequencer の仕事は Engine API 経由で Reth を駆動し、結果を L1に投稿することだけ。

この約 270 行という数字は、大半の本番 L2 が launch するときの実際のアーキテクチャに近い。本レッスンはその全体像をなぞる。

> 🛑 **スクロール前に予測。** Sequencer はおよそ 2 秒ごとに L2 ブロックを構築する。**本番で最初に起きやすい失敗モードは何か?**(ヒント: コンセンサスでも暗号でもない。)

## 1. アーキテクチャ

\`\`\`mermaid
flowchart TB
    Users["L2 Users (HTTP RPC)"] -->|tx| Mempool["Mempool"]
    L1Sub["L1 Inbox サブスクリプション"] -->|deposit イベント| Mempool
    Mempool -->|pending txs| Loop["Sequencer Loop<br/>(2s ごとにブロック生成)"]
    Loop -->|forkchoiceUpdated + getPayload| Reth["Reth EL"]
    Loop -->|ブロック署名| Signer
    Loop -->|new payload| Reth
    Loop -->|broadcast| P2P["P2P Network"]
    Loop -->|60s ごと| Batcher["Batcher"]
    Batcher -->|blob tx| L1["L1 (Ethereum)"]
\`\`\`

1 プロセスに 4 つのコンポーネント:
1. **Sequencer loop** — Engine API 経由でブロック生成を駆動する
2. **Mempool** — ユーザ tx を受け入れ、fee で優先順位を付ける
3. **L1 inbox watcher** — L1の deposit イベントを subscribe し、force-include 用 tx として mempool に流し込む
4. **Batcher** — 定期的に L1に投稿する

最小 MVP では、これらを 1 つのバイナリで走らせる。本番では分割してスケールさせる。

## 2. Sequencer loop

コアの生成ループ:

\`\`\`rust
use alloy_provider::{Provider, ProviderBuilder};
use alloy_signer_local::PrivateKeySigner;
use reth_rpc_engine_api::EngineApiClient;
use std::time::Duration;
use tokio::time::interval;

pub struct MinimalSequencer {
    signer: PrivateKeySigner,
    engine: EngineApiClient,
    mempool: Arc<Mempool>,
    chain_id: u64,
    block_period: Duration,
}

impl MinimalSequencer {
    pub async fn run(self) -> eyre::Result<()> {
        let mut ticker = interval(self.block_period);
        loop {
            ticker.tick().await;
            if let Err(e) = self.produce_block().await {
                tracing::error!(?e, "block production failed");
            }
        }
    }

    async fn produce_block(&self) -> eyre::Result<()> {
        // 1. Reth から現 head 取得
        let parent_hash = self.current_head().await?;

        // 2. Payload 属性計算
        let attrs = PayloadAttributes {
            timestamp: now_seconds(),
            prev_randao: B256::random(),
            suggested_fee_recipient: self.signer.address(),
            withdrawals: vec![],
            parent_beacon_block_root: None,
        };

        // 3. Reth に構築開始を伝える
        let forkchoice = ForkchoiceState {
            head_block_hash: parent_hash,
            safe_block_hash: parent_hash,
            finalized_block_hash: parent_hash,
        };
        let resp = self.engine
            .fork_choice_updated_v4(forkchoice, Some(attrs))
            .await?;
        let payload_id = resp.payload_id.ok_or_else(|| eyre!("no payload id"))?;

        // 4. Reth が構築する時間を少し待つ
        tokio::time::sleep(Duration::from_millis(500)).await;

        // 5. 構築済 payload 取得
        let payload = self.engine
            .get_payload_v4(payload_id)
            .await?;

        // 6. Payload hash 署名
        let signature = self.signer
            .sign_hash(&payload.execution_payload.block_hash())
            .await?;

        // 7. 署名済 payload を Reth に提出
        self.engine
            .new_payload_v4(payload.execution_payload.clone())
            .await?;

        // 8. Forkchoice 更新 (新 head を最終としてマーク)
        let new_head = payload.execution_payload.block_hash();
        self.engine
            .fork_choice_updated_v4(
                ForkchoiceState {
                    head_block_hash: new_head,
                    safe_block_hash: new_head,
                    finalized_block_hash: new_head,
                },
                None,
            )
            .await?;

        // 9. Peer に broadcast (P2P、省略)

        tracing::info!(
            block = new_head.to_string(),
            "produced block"
        );
        Ok(())
    }

    async fn current_head(&self) -> eyre::Result<B256> {
        // ローカル追跡 or EL クエリ
        todo!()
    }
}
\`\`\`

およそ 80 行。これで **2 秒ごとに sequencer の権限で署名されたブロックを生成する** ことになる。

## 3. Mempool

こちらはさらにシンプル:

\`\`\`rust
use alloy_consensus::TxEnvelope;
use std::sync::{Arc, RwLock};

pub struct Mempool {
    pending: Arc<RwLock<Vec<TxEnvelope>>>,
}

impl Mempool {
    pub fn submit(&self, tx: TxEnvelope) -> eyre::Result<TxHash> {
        // 署名、nonce、gas など検証
        validate_tx(&tx)?;

        let hash = tx.hash();
        self.pending.write().unwrap().push(tx);

        Ok(hash)
    }

    pub fn drain_pending(&self, limit: usize) -> Vec<TxEnvelope> {
        let mut pending = self.pending.write().unwrap();
        let len = pending.len().min(limit);
        pending.drain(..len).collect()
    }
}
\`\`\`

実用上、mempool には以下が必要になる:
- 優先キュー(gas tip でソート)
- Eviction(timeout、mempool フル時)
- Reorg 処理(reorg 時に tx を pool に戻す)
- Sanity 検証

それでもデータ構造自体はシンプルなままだ。

## 4. L1 inbox watcher

L1から L2 への deposit のために、L1 inbox contract を watch する:

\`\`\`rust
pub struct L1InboxWatcher {
    l1_provider: Box<dyn Provider>,
    inbox_address: Address,
    mempool: Arc<Mempool>,
}

impl L1InboxWatcher {
    pub async fn run(self) -> eyre::Result<()> {
        let mut stream = self.l1_provider
            .subscribe_logs(&Filter::new()
                .address(self.inbox_address)
                .event("DepositInitiated(...)"))
            .await?;

        while let Some(log) = stream.next().await {
            let deposit_tx = self.encode_l2_deposit_tx(&log)?;
            self.mempool.submit_deposit(deposit_tx)?;
        }
        Ok(())
    }
}
\`\`\`

L1で deposit イベントが発火されたら、それに対応する L2 transaction をエンコードし、mempool 経由で force-include する。Mempool 側はブロック構築時に deposit を優先する。

## 5. Batcher

L2 ブロックを定期的に L1に投稿する:

\`\`\`rust
pub struct Batcher {
    l1_provider: Box<dyn Provider>,
    l2_provider: Box<dyn Provider>,
    batcher_signer: PrivateKeySigner,
    last_batch_block: AtomicU64,
}

impl Batcher {
    pub async fn run(self) -> eyre::Result<()> {
        let mut ticker = interval(Duration::from_secs(60));
        loop {
            ticker.tick().await;
            if let Err(e) = self.post_batch().await {
                tracing::error!(?e, "batch posting failed");
            }
        }
    }

    async fn post_batch(&self) -> eyre::Result<()> {
        let from = self.last_batch_block.load(Ordering::SeqCst);
        let to = self.l2_provider.get_block_number().await?;

        // 1. \`from\` から \`to\` の全 L2 ブロック取得
        let blocks = self.fetch_blocks(from, to).await?;

        // 2. 圧縮
        let data = zlib_compress(rlp_encode(&blocks))?;

        // 3. Blob サイズチャンクに分割
        let chunks = chunk(data, MAX_BLOB_SIZE);

        // 4. 各々を blob tx として提出
        for chunk in chunks {
            let blob_tx = build_blob_tx(chunk, self.batcher_signer.address());
            self.l1_provider.send_raw_transaction(blob_tx).await?;
        }

        // 5. Last batch 更新
        self.last_batch_block.store(to, Ordering::SeqCst);
        Ok(())
    }
}
\`\`\`

およそ 50 行。60 秒ごとに、前回の batch 以降のすべての L2 ブロックが圧縮されて blob として L1に提出される。

## 6. システム全体

\`\`\`
~/my-sequencer/
├── src/
│   ├── main.rs           ← 20 行 (全部配線)
│   ├── sequencer.rs      ← 80 行
│   ├── mempool.rs        ← 50 行
│   ├── l1_watcher.rs     ← 40 行
│   ├── batcher.rs        ← 50 行
│   └── rpc.rs            ← 30 行 (ユーザ提出用 HTTP server)
├── Cargo.toml
└── README.md
\`\`\`

**Rust およそ 270 行** で、ブロック生成、tx の受け入れ、L1 deposit の監視、L1 への batch 投稿までを行う動く sequencer ができあがる。これが大半の chain が launch 時に使う、実際の MVP アーキテクチャだ。

## 7. 本番での落とし穴

この最小版が省いているもの:

| 落とし穴 | 現実 |
| :--- | :--- |
| **Liveness alarm** | Monitoring と自動 failover が必要(ops チームへの heartbeat も) |
| **L1 reorg 処理** | L1 が reorg したら、orphan された tx を再 batch する必要がある |
| **L2 reorg 処理** | 稀なはず(単一 sequencer = 決定論的)だが起こりうる |
| **Pre-confirmation** | Sequencer が L1 finality 前にコミットする; 嘘をついたら contract 側で処理する |
| **Mempool DOS** | 攻撃者が mempool に spam を送る; rate limit と fee escalation が必要 |
| **Database の成長** | 全ブロックを追跡する; 最終的に pruning が必要 |

それぞれが独立したエンジニアリング上の課題になる。270 行の MVP から始めて、必要に応じて足していけばよい。

## 8. Tempo Moderato に当てはめる

Tempo の sequencer(Paradigm が運用)はおそらく:
- Reth 上に Rust 300〜500 行で書かれている
- ここで示したのと同じアーキテクチャを採る
- そこに上乗せして: merchant 認可、規制 monitoring、payment 優先順序付けが入る

新規性はアプリケーションロジック側にあり、コンセンサスメカニクス側にはない。

## 9. 練習

1. \`fetch_blocks\` 関数を書く — 指定範囲の L2 ブロックを Reth に問い合わせる
2. Blob tx の構築をスケッチする(EIP-4844 type 3)
3. 特定する: batcher が投稿に失敗するのはどんなときか? 再試行戦略はどう取るか?
4. 計算する: ブロック時間 2 秒、batch あたり圧縮後 1MB のときの日次 L1 コストは?

## 10. 読み物

- [op-rbuilder](https://github.com/flashbots/op-rbuilder)
- [op-batcher](https://github.com/ethereum-optimism/optimism/tree/develop/op-batcher)
- [Astria sequencer](https://github.com/astriaorg/astria) — 共有 sequencer の参照実装

> 最終チェック: 一文で、なぜ Rust 約 300 行で動く L2 sequencer として十分なのか説明せよ。**答えに「Reth が難しい部分を引き受けている」が出てこなければ、アーキテクチャ上の分離をまだ自分のものにできていない**。`,
                },
                {
                  title: '分散化パス — 共有 sequencer と MEV 認識 auction',
                  slug: 'sequencer-decentralization-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 16,
                  xpReward: 45,
                  content: `# 分散化パス — 共有 sequencer と MEV 認識 auction

Optimism が「sequencer を分散化する」と発表したのは 2023 年。3 年経った今でも、sequencer は OP Labs の 1 つの箱の中にある。Arbitrum も同じことを言っている。Base も同様。分散化のロードマップは本物だが、**L2のライフサイクルの後半に来る話** なのだ。最終地点として競合する 2 つのアーキテクチャパターンがある: **分散化された sequencer セット**(chain が自分のバリデータを走らせる)と **共有 sequencer**(複数の rollup が順序付けを共通のセットに外部委託する)。

本レッスンはその地図。なぜ分散化が進まないのか? 各パスは実際どう見えるのか? Espresso、Astria、Polygon zkEVM、Linea はどちらに賭けていて、それはなぜか?

> 🛑 **スクロール前に予測。** Optimism は 3 年間「sequencer を分散化中」のままだ。**何がそれを妨げているのか?** なぜそんなに難しいのか?

## 1. 分散化のステージ

| ステージ | 内容 | 例(2026) |
| :--- | :--- | :--- |
| **1: Single sequencer** | 1 オペレータ | 現在の大半の L2(Optimism、Base、Arbitrum) |
| **2: Multi-sig sequencer** | M-of-N の信頼できるオペレータ | 一部の L3 |
| **3: PoS sequencer セット** | Bonded な validator が回転 | Polygon zkEVM、Linea(近年) |
| **4: 共有 sequencer** | 1 つの sequencer セットが複数 rollup にサービス | Espresso、Astria、Radius |
| **5: MEV 認識の分散化** | 入札付きの sequencer market | 未来形 — 完全な deploy はまだない |

このパスは **厳密に線形ではない**。途中のステージをスキップする chain もあれば、中央集権から直接共有 sequencer に移る chain もあるし、無期限に中央集権を維持する chain もある。

## 2. なぜ分散化が難しいのか

実問題は 5 つある:

### 2.1 レイテンシ

中央集権なら: 100ms でブロックを生成できる。
分散化すると: コンセンサスで最低 2〜3 回の round trip が必要 → 最良でも 200〜500ms。

ユーザはこれを体感する。中央集権 sequencer は 100ms 未満で pre-confirmation を返せるが、分散化ではこれが難しい。

### 2.2 MEV のコーディネーション

中央集権なら: MEV 戦略は 1 つで済む。
分散化すると: 誰が MEV を取るのか? ランダム回転? 入札? 各設計にトレードオフがある。

### 2.3 Liveness

中央集権なら: 1 オペレータ = 単一障害点だが、監視はしやすい。
分散化すると: N 個のオペレータ = 単一障害点はなくなるが、調整のオーバーヘッドが増える。**ネットワーク不調下の liveness が本当に難しい**。

### 2.4 コスト

中央集権なら: サーバが 1 台で済む。
分散化すると: N 台のサーバ + コンセンサスプロトコル + slashing インフラが必要。

### 2.5 経済的セキュリティ

中央集権なら: オペレータを信頼すれば済む。
分散化すると: staking、slashing、紛争解決が必要になる。

各障壁は個別には解かれているが、**5 つすべてを統合する** ところがシステム上の難所だ。

## 3. PoS sequencer セット — 自然な延長

分散化の最初のステップは、Ethereum 系の PoS を L2で再現することだ。

\`\`\`mermaid
flowchart TB
    Stake["バリデータが L2 トークン stake"] --> Set["アクティブ validator set (M-of-N)"]
    Set -->|各ブロック| Leader["指定リーダー (回転)"]
    Leader -->|ブロック構築| Reth["Reth EL"]
    Reth -->|署名ブロック| Others["他バリデータ"]
    Others -->|2f+1 票| Final["ブロック確定"]
    Final -->|定期 batch| L1["L1"]
\`\`\`

これが **Polygon zkEVM** が向かっている方向(Hermez 系の validator set)、**Linea** が近づいている方向(Consensys が調整)で、大半の「Stage 3」rollup が辿り着く先である。

トレードオフ: 1 オペレータが 10〜30 オペレータになる。信頼の最小化は少し進む一方、運用上の複雑さは大きく増す。

## 4. 共有 sequencer — アーキテクチャ上の賭け

N 個の rollup がそれぞれ独自の分散化 sequencer セットを持つ必要がなく、全員で 1 つを *共有* したらどうなるか? それが **共有 sequencer** の賭けだ: 単一の sequencer セットが複数の rollup にサービスを提供する。各 L2 は自前の Reth 実行層を保つが、順序付けは共有の validator set 上で行われる。

\`\`\`mermaid
flowchart TB
    Rollup1["L2 A<br/>(Reth ベース)"] -.->|順序付けを outsource| Shared["共有 Sequencer<br/>(Espresso / Astria)"]
    Rollup2["L2 B<br/>(別 OP Stack)"] -.->|順序付けを outsource| Shared
    Rollup3["L2 C<br/>(別の別)"] -.->|順序付けを outsource| Shared
    Shared -->|署名ブロック| Reth1["Reth EL A"]
    Shared -->|署名ブロック| Reth2["Reth EL B"]
    Shared -->|署名ブロック| Reth3["Reth EL C"]
\`\`\`

なぜこれが重要なのか:
1. **クロス rollup の atomic 性**: 同じ sequencer が両方を順序付けるので、L2 A の tx が L2 B の tx に atomic に依存できる
2. **分散化コストの低減**: N 個の validator セットの代わりに、1 つの validator セットが N 個の rollup にサービスを提供する
3. **MEV の統合**: クロス rollup MEV を捕捉できる(rollup 側の利になる一方、トレーダの不利になる)
4. **より速い分散化**: rollup が難しい問題を外部に委託できる

本番での試み:

| プロジェクト | タイプ | ステータス(2026) |
| :--- | :--- | :--- |
| **Espresso** | HotStuff 派生の共有 sequencer | Mainnet beta、複数 L2 が採用 |
| **Astria** | CometBFT ベースの共有 sequencer | Reth 統合とともに稼働中 |
| **Radius** | PoS の共有 sequencer | Testnet |
| **Anoma** | Intent 中心(厳密には sequencer ではない) | 黎明期 |

> 🛑 **理解度チェック。** 「共有 sequencer は明らかに単一 sequencer より優れている」**フレーミングが違う**。これはトレードオフだ。共有 sequencer が単一 sequencer に対して犠牲にしているものを挙げよ。

共有 sequencer が犠牲にするもの:
- **主権**: chain が順序付けを外部に依存することになる
- **アップグレード速度**: 共有 sequencer 側が chain のニーズに対応する必要がある
- **カスタム MEV 戦略**: chain 固有の MEV 抽出が難しくなる
- **運用上の独立性**: 共有 sequencer が落ちれば chain も止まる

単一 sequencer はこれらを保持できる。トレードは、より多くを制御する代わりに、より多くを自分自身に賭けるかどうか、になる。

## 5. MEV を意識した分散化の未来

エンドゲームは **MEV auction を備えた分散化 sequencer**。

考えられる動作:
1. 複数の sequencer が次ブロックの構築を巡って競う
2. Builder が抽出した MEV 込みで候補ブロックを構築する
3. Sequencer セットが最良のブロックに投票/auction する
4. 勝者が sequencer セットにブロックスペース代を支払い、sequencer セットが MEV を分配する

これがいわば **L2 版 MEV-Boost** だ。2026 時点ではまだ本番 deploy はないが、Flashbots、Espresso、他の設計がここを狙っている。

Tempo の場合: 分散化を進めるなら MEV の問題は興味深い。**merchant 決済では MEV の機会が少ない**(主に genuine な tx で、arbitrage ではない)からだ。Tempo は MEV 抽出の複雑さを過度に抱え込まずに分散化できる。

Hyperliquid の場合: orderbook 自体が本質的に MEV — 中央集権 sequencer を無期限に維持する可能性が高い。

## 6. Astria を読み解く — 本番の共有 sequencer

[\`astriaorg/astria\`](https://github.com/astriaorg/astria) は Reth 統合を備えた本番の共有 sequencer。主要コンポーネント:

- **Sequencer network**: CometBFT ベースの validator set
- **Composer**: rollup の tx を inclusion のために集約する
- **Rollup nodes**: Reth ベースで、sequencer の出力を消費する

流れ:
1. ユーザが L2 A の RPC に tx を提出する
2. RPC が tx を Astria sequencer に転送する
3. Astria が(L2 B、C などの tx と一緒に)順序付ける
4. Astria が ordering を発火し、各 Reth rollup が自身の tx を選び取る

これが本番で **最もテストされている共有 sequencer アーキテクチャ** で、パターンとして読む価値がある。

> 🔍 **リポで探す。** Astria の [docs.astria.org](https://docs.astria.org/) を開いて、L2 が Astria の sequencing に「subscribe」するために何が必要かを追跡せよ。

## 7. Pre-confirmation のレース

新しい方向(2025〜2026): **sequencer からの pre-confirmation**。full sequencing が走り切る前でも即時の UX を可能にしようという動き。

複数 sequencer の pre-conf モデル:
- **TACo(Threshold)**: sequencer の過半数のコミットが必要
- **Lighthouse 系**: 1 sequencer がコミットし、他は finality 前に検証する
- **Speculative**: sequencer がコミットし、違反があれば fraud proof で処理する

これが 2026 時点でアクティブな R&D 領域 — 「分散化しつつ速い」の両立を狙う問題だ。

## 8. 自分のプロジェクトに当てはめる

### Tempo Moderato → Tempo mainnet

パス:
- 今日: 中央集権
- 1 年後: PoS の sequencer セット(20〜30 バリデータ程度)
- 2〜3 年後: 経済性が合えば共有 sequencer
- 全体を通じて: 最終的に高速 withdrawal のための ZK proof

### mppsol / soltempo

Tempo の sequencer とのやり取りがインタフェース上の接点になる。Tempo が分散化すると:
- Pre-confirmation が難しくなる(複数当事者が絡む)
- Liveness alarm がより微妙になる
- コードに「sequencer 切り替え」イベントを処理する仕組みが必要になる

### Hyperliquid

予見可能な将来は中央集権を維持する可能性が高い。MEV モデルが分散化と相性が悪い。Bridge のほうが sequencer より先に分散化する可能性もある。

## 9. 練習

1. Astria の sequencer ドキュメントを読む
2. Espresso の設計と比較せよ — 何が違うか?
3. 特定せよ: カスタム MEV モデルを持つ chain にとって共有 sequencer が難しい理由は?
4. スケッチせよ: Tempo は最終的にどのように分散化していくか?

## 10. 読み物

- [Astria docs — shared sequencer intro](https://docs.astria.org/overview/introduction) — 設計哲学
- [Espresso docs](https://docs.espressosys.com/)
- [Astria](https://github.com/astriaorg/astria)

> 最終チェック: 一文で、分散化 sequencer セット(chain が自前で持つ)と共有 sequencer(外部委託)の **根本的なアーキテクチャ上の選択** は何か? **答えに「主権 vs 効率」が出てこなければ §4 を再読**。`,
                },
                {
                  title: 'ファイナルクイズ: sequencer & rollup アーキテクチャ',
                  slug: 'sequencer-final-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 2,
                  duration: 12,
                  xpReward: 50,
                  content: `# ファイナルクイズ: sequencer & rollup アーキテクチャ

L2 アーキテクトとしての最終チェック。Rollup の出荷、Tempo の sequencer との統合、新規L2の設計のいずれにも必要になる。`,
                  quizQuestions: [
                    {
                      question: 'なぜ **中央集権 sequencer** は rollup には許容できても、**permissionless L1には許容できない** のか?',
                      options: [
                        'Rollup のユーザは期待値が低いから。',
                        'Rollup は safety のフォールバックとして L1の contract を使う: sequencer が検閲しても、ユーザは L1の force-include contract 経由で tx を提出できるし、sequencer が state について嘘をついても、L1 contract が withdrawal を拒否する。Sequencer は UX(速度、順序付け)については信頼するが、資金については信頼しない。Permissionless L1にはそのフォールバックがない — コンセンサスがセキュリティそのものだからだ。',
                        '中央集権 rollup は実は permissioned ではないから。',
                        'L2 transaction は可逆だから。',
                      ],
                      correctIndex: 1,
                      explanation: 'Rollup のセキュリティモデルは、sequencer は UX について信頼し、safety については L1のコンセンサスを信頼する、というもの。根本的な洞察は、ユーザが L1 経由の escape hatch を持つため、sequencer が中央集権でも chain 自体が中央集権になるわけではない、ということ。これがまさに本番 L2 が単一 sequencer のまま出荷している理由 — UX を最大化しつつ、escape hatch が資金を守る。',
                    },
                    {
                      question: 'Rollup が calldata ではなく **EIP-4844 blob** として data を投稿するようになった。**なぜ 10 倍安いのか、そして落とし穴は何か?**',
                      options: [
                        'Blob は Ethereum ではなく Bitcoin に保存されるから。',
                        "Blob のガスは calldata のガスとは別建てで価格が決まり、はるかに安い(byte あたり 0.1〜1 gas に対し、calldata は 16 gas)。落とし穴は、blob はおよそ 18 日で prune される点 — 長期 data が必要なら別途アーカイブが要る。18 日という window は fraud proof の window と一致しており、safety を保つには十分長く、コストを抑えるには十分短い。",
                        'Blob は Layer 2 のノードしか検証しないから。',
                        'Blob のコストは同じで、EIP-4844 は calldata を名前を変えただけだから。',
                      ],
                      correctIndex: 1,
                      explanation: "EIP-4844 は rollup の DA 専用に、別の fee market を持つ blob 運搬用の transaction を導入した。コストが下がる理由は blob が prune 可能だから — Ethereum のノードは proof window 経過後に blob を捨てられる。長期アーカイブは外部サービス(IPFS、専用アーカイブ)を使う。価格と可用性のトレードオフが成立するのは、セキュリティ上 DA が必要なのは fraud proof の window 中だけだからだ。",
                    },
                    {
                      question: 'OP Stack では、**deposit transaction** は L1から来て L2 ブロックの **先頭** に含まれなければならない。**なぜこれが sequencer のポリシーではなくプロトコル強制なのか?**',
                      options: [
                        'Top-of-block が最も MEV を取れるから。',
                        'Deposit は L1から L2に移動するユーザ資金。Sequencer が優先度を下げられるなら、deposit は無期限に遅延されうる — それでは「sequencer が検閲しても資金は安全」という rollup のセキュリティモデルが崩れる。Top-of-block を強制することで、deposit が明確に定義されたタイミングで処理されることを保証する。',
                        'Top of block では低い transaction fee が適用されるから。',
                        'Top of block では gas コストが下がるから。',
                      ],
                      correctIndex: 1,
                      explanation: 'Deposit はユーザが L1 経由でコミットした資金であり、必ず処理されなければならない。プロトコルは最強の inclusion 保証を与える。Sequencer が優先度を下げられるなら、資金の safety 保証は丸ごと崩れる。これが「Deposit が先頭」が sequencer のポリシーではなく L1 contract 経由でコンセンサスから強制される理由だ。',
                    },
                    {
                      question: '**Fraud proof** と **validity(ZK)proof** の選択が withdrawal の遅延を決める。**構造的な違いは何か?**',
                      options: [
                        "Fraud proof のほうが速い。",
                        'Fraud proof: デフォルトで sequencer の state root クレームを信頼し、window の間(OP Stack では 7 日)誰でもチャレンジできる; チャレンジャが現れなければ state は最終確定する。Validity proof: sequencer が正確性の暗号的 proof を提供する必要があり、proof は L1で即時に検証される。Validity → チャレンジ window なし → 即時 finality だが proof のコストが高い。',
                        "ZK proof は fraud proof より単純だから。",
                        '両者とも同じ withdrawal 遅延を生むから。',
                      ],
                      correctIndex: 1,
                      explanation: 'Fraud proof は「誰かが誤りを証明しない限り信頼する」+ 7 日の window。Validity proof は「常に暗号的正確性を要求する」+ 即時。トレードオフ: fraud proof は正常時には安価(proof 不要)だが finality が遅い。Validity proof は batch ごとに高価だが finality が即時。違う rollup は違うところを最適化している。',
                    },
                    {
                      question: 'Reth 上の最小 sequencer は **Rust 約 270 行** で足りる。**なぜそれだけで済むのか?**',
                      options: [
                        'Rust が異常に簡潔だから。',
                        "Reth が難しい実行まわり(revm、MDBX、state 管理、P2P)をすべて引き受けるため。Sequencer がやるべきなのは、(1)Engine API でブロック生成を駆動する、(2)mempool を維持する、(3)L1 inbox を deposit のために監視する、(4)L2 ブロックを L1 投稿用に batch する、の 4 つだけ。それぞれおよそ 50〜80 行のオーケストレーションコードに収まる。",
                        "Rollup が L1 より単純だから。",
                        '大半の rollup ロジックが JavaScript で書かれているから。',
                      ],
                      correctIndex: 1,
                      explanation: 'アーキテクチャ上の分離の恩恵: Reth = 実行、sequencer = オーケストレーション。Sequencer は Engine API 経由で Reth を駆動する薄い調整層で、難しい部分(EVM、ストレージ、state)は Reth 側に寄せている。これが多くの本番 sequencer が Reth 上の Rust 300〜500 行に収まる理由だ。',
                    },
                    {
                      question: 'なぜ **Optimism、Arbitrum、Base** はどれも分散化ロードマップを掲げていながら、何年も中央集権 sequencer を維持しているのか?',
                      options: [
                        '分散化が優先事項ではないから。',
                        '実問題が 5 つあるから:(1)コンセンサスでレイテンシが 2〜5 倍悪化する、(2)MEV のコーディネーションが複雑になる、(3)N オペレータでは liveness の確保が難しくなる、(4)運用コストが上昇する、(5)経済的セキュリティのインフラ(staking、slashing)が自明ではない。最初の 1 つ — ユーザ体験 — だけでも中央集権を実用上のデフォルトとして残すのに十分。大半のユーザにとって UX は分散化より上にくる。',
                        'コードベースが汚すぎて分散化できないから。',
                        '分散化には法的な再構築が必要だから。',
                      ],
                      correctIndex: 1,
                      explanation: '分散化が難しいのはコードの問題ではなくシステムエンジニアリングの問題: レイテンシ、liveness、MEV のコーディネーション、運用コスト、セキュリティ・インフラ。個別には解けても、本番で 5 つを同時に組み合わせるのが本当の難所。大半の L2 は UX を優先する(中央集権)し、ユーザも分散化より速さと安さを好む。',
                    },
                    {
                      question: 'Espresso や Astria のような **共有 sequencer** の **アーキテクチャ上の賭け** は何か?',
                      options: [
                        '個別に sequencer を走らせるより安いから。',
                        "1 つの sequencer セットが N 個の rollup にサービスを提供することで、次が可能になる:(1)クロス rollup の atomic transaction(同じ sequencer が両方を順序付ける)、(2)rollup ごとの分散化コストが下がる、(3)クロス rollup MEV を捕捉できる。トレードオフは、rollup が順序付けの主権を諦める — 難しい問題を外部委託する点にある。",
                        'Rollup が data availability をスキップできるから。',
                        'State root commitment の必要性を排除できるから。',
                      ],
                      correctIndex: 1,
                      explanation: "共有 sequencer は、**マルチ rollup の composability が十分に重要** で、rollup が主権的な sequencer 制御を諦める価値がある、という賭け。Espresso、Astria、Radius が本番での試み。賭けの帰趨は未確定で、多くの L2 は運用独立性と MEV 戦略のために sequencer を自前で持つことを好む。今後 2〜3 年でどちらが勝つかが見えてくる。",
                    },
                    {
                      question: 'Tempo Moderato(Tempo の testnet)について、**中央集権 → 分散化の軌跡** はどう描けるか?',
                      options: [
                        'Day 1 から完全に分散化された validator set にいきなりジャンプする。',
                        "ありうるシナリオ:(1)今日: 中央集権 sequencer(Paradigm が運用)、(2)1 年後: PoS の validator set(20〜30 オペレータ程度)、(3)2〜3 年後: 経済性が合えば共有 sequencer、(4)全期間を通じて: 最終的に高速 withdrawal 用の ZK proof。各ステップは運用コストと引き換えに信頼の最小化を段階的に進めるものだ。",
                        '無期限に中央集権を維持する。',
                        "Tempo は sequencer を持たない — 純粋に on-chain で動く。",
                      ],
                      correctIndex: 1,
                      explanation: '標準的な L2の軌跡。Paradigm が launch をコントロールし、bonded バリデータが sequencing を分散化し、最終的に ZK proof が withdrawal の遅延を圧縮する。各ステップが 1〜2 年がかりで出荷される。大半の L2 がまさにこのパスを辿っており、Tempo も同じ流れになる。Soltempo と mppsol はこの軌跡を前提に組んでおく必要がある。',
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
    },
  });
}
