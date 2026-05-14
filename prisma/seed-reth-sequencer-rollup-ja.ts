import { PrismaClient } from '@prisma/client';

export async function seedRethSequencerRollupJA(prisma: PrismaClient) {
  const tags = ['reth', 'sequencer', 'rollup', 'fraud-proofs', 'validity-proofs', 'mev-boost', 'shared-sequencer', 'l2', 'expert'];

  await prisma.course.create({
    data: {
      slug: 'reth-sequencer-rollup-ja',
      title: 'Sequencer & Rollup アーキテクチャ — 中央集権ブロック生成から共有 sequencer まで',
      description:
        '現代の L2 が実際どう動くか: sequencer の役割、batch 投稿と data availability、fraud proof vs validity (ZK) proof、op-rbuilder と op-batcher を読み、Reth 上で最小 sequencer を作り、単一オペレータから共有 sequencer までの分散化パス。Tempo Moderato 級の L2 を architect、OP Stack chain を出荷、次の共有 sequencer を作る準備ができる。',
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

Base で swap を送る。1 秒未満で confirm。Wallet に tx が出てくる。その順序を決め、自社サーバで実行し、**いずれ** Ethereum に投稿するのは **1 企業** — Coinbase。慣習的定義ではこれは中央集権システム。なのになぜ Base は「分散化された rollup」と呼ばれるのか?

本レッスンがその答え。**Sequencer** (rollup 上で transaction を順序付ける主体) は Base、Optimism、Arbitrum、Mantle、ほぼ全本番 L2 で中央集権。分散化はどこでも「ロードマップ上」、しかも何年もロードマップ上。これは恥ではなく — 設計。

> 🛑 **スクロール前に予測。** Optimism は OP Labs チームが運用する **sequencer を 1 つ持つ**。**なぜこれが許容可能?** Single sequencer でも mitigate される、rollup アーキテクチャなしでは可能な攻撃は?

## 1. Rollup モデル

Rollup は 2 つの組み合わせ:

1. **L2 実行環境** — 独自 EVM、独自 state、独自ブロック生成
2. **L1 へのコミットメント** — Ethereum (or 別 base chain) への定期的 data + state root 提出

Sequencer の仕事は part 1。仕事:
- ユーザ tx を受信
- 順序付け
- L2 で実行
- L2 ブロック生成
- L1 に batch 提出

\`\`\`mermaid
flowchart TB
    Users["L2 Users"] -->|submit tx| Seq["Sequencer<br/>(centralized)"]
    Seq -->|execute| L2["L2 chain<br/>(Reth-based execution)"]
    L2 -->|batch| Batcher["Batcher<br/>(off-chain)"]
    Batcher -->|post calldata + state root| L1["L1 (Ethereum)"]
    L1 -->|finalize after challenge| L2
\`\`\`

アーキテクチャ的見返り: **中央集権 sequencer でもユーザ資金は危険にさらされない**。検閲したら、L1 の force-inclusion contract に直接 tx 提出 — プロトコルが期限付きで sequencer に含めることを強制。State について嘘ついたら、L1 contract が withdrawal 拒否。

これが rollup モデルの売り: **sequencer を UX には信頼、資金には信頼しない**。

## 2. Sequencer の 3 仕事

すべての sequencer が 3 つする:

| 仕事 | 内容 | 場所 |
| :--- | :--- | :--- |
| **Ordering** | 各 L2 ブロックの tx 順序を選ぶ | L2 上 |
| **Execution** | revm で走らせ post-state 生成 | L2 上 |
| **Batching** | L2 ブロックを bundle して L1 投稿 | Off-chain → L1 |

OP Stack chain で、これらは 3 つの repo に対応:
- **op-rbuilder** (or op-geth): 実行 + 順序付け
- **op-batcher**: batch サービス
- **op-proposer**: state root 提出サービス

Reth ベース L2 はこの構造をミラー。Sequencer は実行層として Reth を走らせる; batcher と proposer は別サービス。

> 🛑 **理解度チェック。** ユーザが sequencer に tx 提出。Sequencer が無視 (検閲)。**ユーザが何できるか追跡**。答えに「L1 force-inclusion contract」がなければ、rollup セキュリティモデルを完全に内面化していない。

ユーザは **L1 inbox contract** (e.g., OptimismPortal) に tx 提出。Sequencer はプロトコルルールにより期限内 (~1 時間 for OP Stack) にその tx を含めることが強制。期限後、誰でも inclusion を強制可能。つまり **検閲には有限コスト** — 最大 1 時間遅延 + L1 ガス手数料。

## 3. 中央集権パラドックス

分散化が全ポイントなのに、なぜ中央集権 sequencer を出荷? 中央集権デフォルトを粘らせる 5 つの実用的理由:

1. **性能**: 中央集権 sequencer は予測可能な順序付け。分散化 = コンセンサスオーバーヘッド = レイテンシ。
2. **MEV** (maximal extractable value — tx 再順序付けでブロックビルダがキャプチャ可能な価値): 中央集権 sequencer が MEV 抽出を制御。分散化 = MEV を諦めるか auction で coordinate。
3. **Liveness**: 1 オペレータを online に保つほうが coordinated バリデータより容易。
4. **Pre-confirmation**: 単一 sequencer が「あなたの tx は含まれる」を即時約束可能。複数当事者は投票が必要。
5. **運用シンプルさ**: monitoring、on-call、deploy — 1 オペレータで容易。

トレードオフは **UX (中央集権 sequencer) vs 検閲耐性 (分散化)**。大半の L2 は UX を選ぶ。

Tempo Moderato (Tempo の testnet) は今日中央集権。Hyperliquid も中央集権。両方とも最終的には分散化するが **launch では違う**。

## 4. L1↔L2 通信層

任意の rollup の L1 で 3 contract が仕事する:

| Contract | 役割 |
| :--- | :--- |
| **Inbox** (OptimismPortal) | Deposit + 強制 include tx を受信 |
| **Outbox / OutputOracle** | Sequencer から state root commitment 受信 |
| **Bridge** | ユーザ向け — Inbox を asset 転送用に wrap |

Sequencer は L1 ブロックごとに Inbox を **読まねばならない**。Deposit や 強制 include tx を期限 (~1 時間) より長く無視したら、sequencer は **遅延中** でチャレンジ可能。

逆方向に、sequencer は state root を OutputOracle に **提出**。これらがチャレンジ期間を始める (optimistic rollup で 7 日、ZK rollup で即時)。

> 🛑 **予測。** Sequencer が 2 時間 offline。**L2 chain に何が起こる?** ユーザ資金は? 慎重に追跡。

L2 chain は **停止** (新ブロックなし)。ユーザ資金は **安全** (state 変更が起きていない)。2 時間後: Inbox 経由で提出した depositor は何らかの「escape hatch」機構が動けば tx を強制可能。正確な回復は rollup の具体的 contract に依存。

## 5. Reth がフィットする場所

Reth は sequencer の **実行層**。Sequencer は EL として Reth を走らせ、Engine API を呼ぶ:
- 新 L2 head で \`forkchoiceUpdated\`
- 構築済 L2 ブロックを \`getPayload\` で取得
- \`newPayload\` で検証 (sequencer が構築したので通常 no-op)

OP Stack 向けに特に: reth の \`crates/optimism/\` が OP 認識実行層を提供。Sequencer は Engine API 経由で Reth を駆動する別プロセス。

Tempo 向け: 同じパターン。Reth が実行として動き、Paradigm 製 sequencer がそれを駆動。

## 6. 分散化スペクトラム

Rollup はスペクトラム上に存在:

| 位置 | 例 | Trust モデル |
| :--- | :--- | :--- |
| **Single sequencer** | Optimism、Arbitrum (launch)、Base | Liveness は 1 オペレータ信頼、safety は escape hatch |
| **Multi-sequencer** (whitelist) | 一部 L3、validium chain | N オペレータ信頼 (M-of-N) |
| **分散化 sequencer** (共有なし) | Polygon zkEVM (recent) | PoS 系 sequencer 選出 |
| **共有 sequencer** | Espresso、Astria、Radius | 1 sequencer セットが多 rollup にサービス |

大半の chain は位置 1。位置 4 はアーキテクチャ的フロンティア — Lesson 6 でカバー。

## 7. 自分のプロジェクト向け

### Tempo Moderato → Tempo mainnet

- 今日: 中央集権 sequencer (Paradigm 運用)
- 分散化パス: マルチオペレータ → PoS → 最終的に共有も
- Soltempo / mppsol コードは **sequencer の RPC** とやり取り、chain の source of truth として扱う

### Tempo Zones — アンカードな confidential パターン

Sequencer アーキテクチャのバリエーションとして知っておく価値あり。[\`tempoxyz/zones\`](https://github.com/tempoxyz/zones) は **Tempo にアンカーされた** プライベートブロックチェーン。各 Zone は自前の sequencer を **250ms ブロック時間** で運用、confidential な tx (暗号化された残高と受取人) を処理し、**Tempo ブロックごと (約 500ms) にバッチ化された withdrawal を Tempo へ提出** する。コンプライアンスポリシー (TIP-403) は Tempo L1 から継承され Zone 内で強制される。アーキテクチャ上の学び: 自分が同時に運用する L1 の上に乗る "ロールアップ的" なプライバシー chain、アンカードな finality と継承された compliance を伴う — 大半の L2 設計がまだ名前を持たないパターン。

### 仮想「自分の L2」

OP Stack で chain を spin up:
- Sequencer 運用 (cargo run op-rbuilder)
- Batcher 運用
- Proposer 運用
- ユーザは liveness にあなたを信頼、safety に L1 contract を信頼

ゼロからこれを構築するのが次の 4 レッスン。

## 8. 読み物

- [Optimism docs - Sequencer architecture](https://docs.optimism.io/builders/chain-operators/architecture)
- [Vitalik on rollups](https://vitalik.ca/general/2021/01/05/rollup.html) — 基礎エッセイ
- [Paradigm on shared sequencing](https://www.paradigm.xyz/2023/11/shared-sequencer) — 未来方向

## 9. 練習

各 chain について (a) スペクトラム上の sequencer 位置、(b) sequencer downtime からユーザがどう回復できるか特定:

1. Optimism mainnet
2. Arbitrum One
3. Polygon zkEVM
4. Tempo Moderato (公開情報による)
5. Hyperliquid

> 最終チェック: 一文で、なぜ「中央集権 sequencer」が「中央集権 rollup」を意味しないか? **答えに「UX は信頼、資金は信頼しない」がなければ §1 を再読**。`,
                },
                {
                  title: 'Batch 投稿と data availability',
                  slug: 'sequencer-batch-da-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 16,
                  xpReward: 40,
                  content: `# Batch 投稿と data availability

2024 年 3 月前、Ethereum に rollup data 1MB 投稿は **batch あたり ~$300**。EIP-4844 後、同じ 1MB が **~$3-$30**。10× 低下は rollup 史上最大のコスト改善 — そして Base tx がドルでなくセントで済む理由。

その改善はもっと深い疑問の上に乗る: **そもそもなぜ rollup が L1 に data 投稿する必要があるのか?** 答えが **data availability** (DA — sequencer だけでなく誰でも transaction data を取得可能、という性質)。これなしでは sequencer の state root は検証不可能で、1 企業を信頼する話に戻る。本レッスンが扱うのは DA とは何か、4 つの DA モデル、それを安くした EIP-4844 blob のトリック、そして op-batcher が実際にどう投稿するか。

> 🛑 **スクロール前に予測。** Rollup が 12 分ごとに L1 に 1MB の transaction data 投稿。**Ethereum mainnet のガス価格で 1 日あたりいくら?** EIP-4844 前後でコスト差はどれだけ?

## 1. なぜ data availability が重要か

Rollup は **state root** を経由して L1 にコミット。だが state root は 32 byte だけ — L2 state が *何* かは教えない。L2 state を再構築するには:

1. **State root** (安価 — batch あたり 32 byte)
2. State root を生成した **transaction data** (高価 — 各 tx の各 byte)

(1) だけ L1 上なら、sequencer は (2) について嘘つけて検知方法なし。
両方 L1 上なら、誰でも tx を再実行して state root が出るか検証可能。

**Data availability** = 「transaction data が皆読める場所に公開されている」。

## 2. 4 つの DA モデル

| モデル | Data の場所 | Trust | 例 |
| :--- | :--- | :--- | :--- |
| **Rollup** | L1 calldata or blob に投稿 | L1 コンセンサス | Optimism、Arbitrum、全「真」rollup |
| **Validium** | 別 DA 委員会に投稿 | Multisig / PoS | StarkEx、dYdX v3 |
| **Volition** | ユーザが tx ごとに選ぶ (rollup or validium) | ミックス | dYdX v4 系ハイブリッド |
| **Optimium** | Fraud proof 付き DA 委員会 | DA 委員会 + fraud proof | より新しい設計 |

Tempo、Hyperliquid、関心ある大半の chain 向け: **rollup** モデル。Data が何らかの形で L1 に行く。

## 3. EIP-4844 — blob 革命

2024 年 3 月前、rollup は **calldata** (通常 Ethereum transaction の input bytes) として L1 に data 投稿。Calldata は byte あたり ~16 gas (50 gwei で ~$0.02/byte)。1MB per batch で ~$300。

EIP-4844 が真新しい transaction type — **blob transaction** — を導入、独自 fee market 付き、1 ユースケースに価格付け: rollup DA。

| 性質 | Calldata | Blob (4844) |
| :--- | :--- | :--- |
| byte あたりコスト | ~16 gas | 可変、典型 ~0.1-1 gas |
| L1 上の寿命 | 永久 | ~18 日 (その後 prune) |
| 検証 | 誰でも読める | 18 日間誰でも読める |
| ブロックあたり最大 | ~125KB 実用 | 128KB × 6 = 768KB |

トレードオフ: blob は **安価** だが **prune 可能**。18 日後、blob data は L1 ノードから drop。長期に必要な場合は別途アーカイブ (e.g., IPFS、専用アーカイブノード)。

18 日 proof window 向け: fraud proof 提出に十分な時間。その後: rollup state は最終、data は L1 上に存在不要。

> 🛑 **理解度チェック。** 「Blob は安価で rollup は今 10x 安い」**部分的に正しい**。**Catch は?** なぜ 10x 削減が全 rollup に等しく適用されないのか?

Catch: blob は **利用可能** だが **ブロックスペースを競合**。Blob を投稿する rollup が増えると blob ガス価格上昇。現在の equilibrium で 10x 削減; 全 rollup が blob に移行したら 3-5x まで圧縮しうる。さらに: 全 chain が Ethereum を DA に使うわけではない。Celestia、EigenDA、Avail が代替。

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

3 つの別サービス、3 つの別頻度:

| サービス | 頻度 | 目的 |
| :--- | :--- | :--- |
| Sequencer | 各 L2 ブロック (~2s) | ブロック構築 |
| Batcher | 各 ~60s | 圧縮 batch を L1 提出 |
| Proposer | 各 ~1 時間 | State root commitment 提出 |

L1 コストドライバは **batcher** (多 data) と **proposer** (data 少だが各 commitment がガスコスト)。

## 5. op-batcher を読む

OP Stack の batcher は [\`ethereum-optimism/optimism/op-batcher\`](https://github.com/ethereum-optimism/optimism/tree/develop/op-batcher) (Go) に。Reth ベース chain 向けの Rust 等価物は開発中。

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

    // 4. L1 に blob tx 提出
    for _, chunk := range chunks {
        submitBlobTx(chunk)
    }

    // 5. ローカル状態更新
    lastBatchEnd = blocks.LastBlock
}
\`\`\`

これが要点。本番の複雑さは:
- **Reorg 処理** (L2 reorg = batch 再送)
- **ガス価格** (より高料金でいつ再試行)
- **スループットチューニング** (どれだけ積極的に blob を埋める)

> 🔍 **リポで探す。** [op-batcher の main.go](https://github.com/ethereum-optimism/optimism/blob/develop/op-batcher/batcher/driver.go) を開きメインループ追跡。**どこで提出を決定?** トリガーは?

## 6. 圧縮 — 静かなる勝者

Rollup batch は高度に圧縮可能。典型的圧縮率:

| Data | 圧縮 |
| :--- | :--- |
| 生 transaction | 1.0x |
| RLP エンコード | 1.0x |
| Batch 上の zlib | 3-5x |
| カスタム (zlib + アドレス等圧縮) | 5-10x |

各圧縮率が同じ blob コストでスループットを倍。本番 rollup は vanilla zlib を 2-3x 上回るカスタム圧縮使用。

Tempo 向け (決済特化): 決済 tx は非常に反復的 (同じ merchant、同じパターン)。汎用 rollup より圧縮率良い可能性。**これが Tempo の具体的ユースケースの隠れたコスト優位**。

## 7. DA 代替

Rollup は Ethereum に投稿する必要なし:

### 7.1 Celestia

[\`celestia\`](https://github.com/celestiaorg/celestia-app) は専用 DA 層。Rollup は Celestia に data 投稿、DA 認証取得、その後認証を L1 投稿。

コスト: Ethereum blob より安い (~$0.0001/byte vs blob は ~$0.001)。

トレードオフ: Celestia のセキュリティに依存 (Ethereum のではなく)。Validator set 小。エコシステム若い。

### 7.2 EigenDA

[\`eigenda\`](https://github.com/Layr-Labs/eigenda) は EigenLayer ベース DA。EigenLayer 上の ETH restaker が DA サービス提供。Ethereum の経済セキュリティを部分継承。

### 7.3 Avail

[\`avail\`](https://github.com/availproject/avail) は Polygon の DA 層。Celestia と構造的類似。

Tempo 向け: Paradigm 製 L1 として、Tempo は最初 Ethereum DA 使用の可能性。Celestia/EigenDA への切り替えはコスト下げるが分散化減 (DA validator set 小)。

## 8. 練習

1. 計算: 1MB/分 batch、blob コスト ~$0.1/MB、rollup の日次 DA コスト?
2. Rollup が 100 tx/s 処理、各 tx 200 byte: ユーザ tx あたり DA コスト?
3. op-batcher source 開く — 圧縮呼び出し見つける
4. 特定: chain が Ethereum blob より Celestia 選ぶのはいつ?

## 9. 読み物

- [EIP-4844 spec](https://eips.ethereum.org/EIPS/eip-4844) — blob 標準
- [op-batcher](https://github.com/ethereum-optimism/optimism/tree/develop/op-batcher) — 本番 batcher
- [Celestia docs](https://docs.celestia.org/) — DA 層代替

> 最終チェック: 一文で、なぜ **data availability** が rollup の荷重を担うセキュリティ仮定で、DA が失敗したらユーザ資金に何が起こるか? **答えに「誰でも L1 data から L2 state 再構築可能」がなければ §1 を再読**。`,
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

今日自分の OP Stack chain を spin up すると、ブロック生成するバイナリはほぼ確実に [\`paradigmxyz/op-rbuilder\`](https://github.com/paradigmxyz/op-rbuilder) — OP 派生 rollup 向け Paradigm の Rust block builder。全 Reth ベース L2 が直接走らせるか、それから fork する。「Reth 上の sequencer」の本番参照、マーケティング図解が止まった後に実 sequencer が何をしているかを理解したいなら読むコード。

> 🛑 **スクロール前に予測。** Sequencer は ~2s ごとにブロック生成必要。**ボトルネックは — 実行速度 (revm) かブロック構築 (選択 + 順序付け) か?** 答えがどこに最適化を集中させるべきか教える。

## 1. op-rbuilder アーキテクチャ

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
1. **Engine API** — コンセンサスが何の上に構築するか教える
2. **Mempool** — 含まれ待ちのユーザ tx
3. **L1 Inbox** — 含まれねばならない deposit tx

Builder がこれらを取り、**OP Stack ルール** を順序付けに適用、ブロック生成。

## 2. OP Stack 順序付けルール

OP ブロック構築する sequencer が遵守必要な具体ルール:

1. **Deposit 先**: L1 inbox からの deposit tx はブロック先頭
2. **L1 epoch 帰属**: ブロックは L1 ブロック ("L1 origin") を参照必要
3. **Sequencer 署名**: ブロックはアクティブ sequencer 鍵で署名必要
4. **Gas limit**: OP 固有境界内 (mainnet と異なる)
5. **Force inclusion**: L1 inbox 内の tx が期限超過したら、含めねばならない

これらが OP 固有ブロック validity ルール。**op-rbuilder が全部強制**。

> 🛑 **理解度チェック。** 「Sequencer は何でもできる」**半分正しい**。言い直す: sequencer の実制御面は? コンセンサス強制制約はどこ?

Sequencer は選べる:
- どのユーザ tx を含めるか
- ユーザ tx の順序
- 帰属する L1 epoch
- ブロック timestamp (境界内)

Sequencer は **選べない**:
- Deposit を含めるか (必須)
- Force-included tx をスキップするか (含めねばならない)
- ブロック validity ルール (gas limit、base fee 数学)

「選べない」を違反 = L1 検証失敗 = ブロックが reorg。

## 3. op-rbuilder source を読む

主要ファイル (パスはバージョン間で変動する; 検索で navigate):

| パス | 役割 |
| :--- | :--- |
| \`crates/builder/src/payload.rs\` | コアブロック構築ループ |
| \`crates/builder/src/ordering.rs\` | Tx 順序付け戦略 |
| \`crates/builder/src/deposit.rs\` | Deposit tx 処理 |
| \`crates/builder/src/seal.rs\` | ブロック sealing + 署名 |

メイン構築関数のおおよその形:

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

これが sequencer ループ ~30 行。本番 op-rbuilder の複雑さ:
- 非同期実行 (構築中に tx 受け入れ)
- Reorg 処理 (構築中に parent 変更)
- MEV 認識順序付け (高 fee tx 優先、sandwich 耐性順序)
- ガス推定精度

> 🔍 **リポで探す。** [op-rbuilder の payload builder source](https://github.com/paradigmxyz/op-rbuilder) を開いて実 \`build_payload\` (or 等価物) を見つける。**構築中に parent ブロックが変わるケースをどう処理?**

## 4. MEV 問題 — Sequencer は何を抽出?

Tx 順序を選ぶ者が、誰が利益を得るかを選ぶ。OP Stack chain で、その権力をどれだけ積極的に sequencer が収益化するかについて 3 立場:

| 立場 | Sequencer が何をするか | 例 |
| :--- | :--- | :--- |
| **Vanilla FIFO** | 提出時間順 | naive 実装 |
| **Priority-fee 順序付け** | ガスチップ順 (Ethereum mainnet 系) | OP Stack デフォルト |
| **MEV 認識 builder market** | 外部入札をブロック構築に受け入れ | OP Stack + op-rbuilder + bundle market |

op-rbuilder は 3 つ目をサポート — chain は **builder/searcher (最も価値あるブロック構築を競合する第三者ブロック構築者) から外部 bundle を受け入れるか** 設定可能。Bundle market が sequencer にブロックスペース支払い。

これが **Flashbots 系 PBS** (proposer-builder separation — ブロックを *選ぶ* 者と *構築する* 者を分離) が L2 に来る場所: builder が最も収益的ブロック構築を競合、sequencer が勝ち入札受け入れ。

## 5. Pre-confirmation ゲーム

単一 sequencer のキラー UX 機能は **pre-confirmation**: tx を提出した瞬間、sequencer が「yes、これは block N の位置 M に含まれる」と署名で返す。100 ms でユーザに「confirmed」表示可能 — L1 finality よりずっと前。

このトリックは **1 sequencer でのみ動く**。複数当事者は投票必要、投票は round trip を要する。

op-rbuilder で: mempool 受け入れステップが pre-confirmation 発行場所。Sequencer が「tx 含めることを commit」と署名すれば、ユーザは L1 finality 待たずに最終扱い可能。

> 🛑 **理解度チェック。** 「Pre-confirmation は無料」**いいえ**。Pre-conf 発行時の sequencer リスクは? 答えに「reorg」or「L1 challenge」がなければコミットメント理解していない。

Sequencer は inclusion をコミット。L2 reorg (起こりうる) があれば、tx は canonical chain になくなる可能性。Sequencer は一部設計で pre-conf 違反時に slash されうる。

## 6. Tempo の sequencer 向け

Tempo の sequencer (Paradigm 運用) はほぼ確実に:

- op-rbuilder or 類似 Rust block builder 使用
- OP-Stack 系順序付けルール実装 (deposit 先、force inclusion、署名)
- Merchant に pre-confirmation 発行 (秒未満 UX)
- Merchant 優先 bump 付き priority-fee 順序付けサポート
- 不正検知用緊急停止権限

アーキテクチャパターンは任意 OP Stack L2 と同じ; 上のビジネスロジック (merchant 優先、不正検知) は特化。

## 7. 練習

1. op-rbuilder clone (or オンラインブラウズ)
2. Deposit tx 処理コードを見つける
3. ユーザが sequencer の RPC 経由提出した時に何が起きるか追跡
4. 特定: op-rbuilder は priority fee 支払うが実行で revert する mempool tx をどう処理?

## 8. 読み物

- [op-rbuilder repo](https://github.com/paradigmxyz/op-rbuilder)
- [Optimism sequencer spec](https://specs.optimism.io/protocol/derivation.html) — L2 chain がどう導出されるか
- [Paradigm rbuilder talk](https://www.youtube.com/watch?v=N6c0LE4Sgis) — 設計哲学

> 最終チェック: 一文で、sequencer が永久に任意に順序変更や exclude するのを防ぐ、コンセンサス強制制約のコアは? **答えに「L1 force-inclusion + 期限」がなければ §2 を再読**。`,
                },
                {
                  title: 'Fraud proof vs validity (ZK) proof',
                  slug: 'sequencer-fraud-zk-proofs-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 16,
                  xpReward: 45,
                  content: `# Fraud proof vs validity (ZK) proof

Optimism から withdraw。**7 日**待つ。zkSync から withdraw。**約 1 時間**待つ。両方とも Ethereum に投稿する EVM rollup。170× 差は Optimism のチームが遅いからではない — Optimism が **fraud proof** を、zkSync が **validity proof** を選んだから、そしてその単一選択が下流 UX 決定すべてを強制する。

Rollup の L1 contract は sequencer の state root クレームを **固定期間** (チャレンジ window) 信頼。Window が閉じた後、state root は最終。Window 中に何が起こるかの 2 パラダイムが **fraud proof** (チャレンジベース — 「間違いが証明されない限り信頼」) と **validity / ZK proof** (暗号的 — 「常に正確性 proof 要求」)。Optimistic か ZK: 1 つ選ぶ。他はすべて従う。

> 🛑 **スクロール前に予測。** Optimism の withdrawal は 7 日。zkSync の withdrawal は ~1 時間。**10x 差の構造的理由は?** (ヒント: より良いテクではない、違う proof パラダイム。)

## 1. State root commitment 問題

Sequencer が ~1 時間ごとに L1 に state root 提出。L1 contract は決定必要: **この state root は正しい?**

選択肢:
1. **常に信頼** — 純粋信頼、proof なし (validium / sidechain)
2. **信頼するがチャレンジャが間違いを証明可能** — fraud proof (optimistic)
3. **正確性 proof 要求** — validity proof (ZK)

各々違うトレードオフ。

## 2. Fraud proof — optimistic モデル

シーケンス:
1. Sequencer が L1 に state root S 投稿
2. チャレンジ window 開く (OP Stack で 7 日)
3. Window 中、**誰でも** S が間違いだと示す **fraud proof** 提出可能
4. Valid fraud proof 提出されれば、S 拒否、chain reorg
5. 7 日後、S 最終

Fraud proof 自体が **不正実行の証明**: 「sequencer が tx T が state S をもたらすと主張したが、実際は state S' をもたらす」。L1 contract が検証者ゲームで disputed step を再実行。

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

トレードオフ: **誰でもチャレンジ可能、しかし finality まで 7 日待つ**。

## 3. Validity (ZK) proof — 暗号的モデル

シーケンス:
1. Sequencer が L2 ブロック生成
2. Sequencer (or 別 prover) が L2 実行が正しい **ZK proof** 生成
3. Proof が新 state root と一緒に L1 提出
4. L1 contract が **proof 検証** (安価 — ~100k gas)
5. Proof 検証されれば、state root **即時最終**

チャレンジ期間なし。待ちなし。

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

トレードオフ: **proving が高い** (compute、時間、gas)、しかし **withdrawal が即時**。

## 4. コスト比較

| 性質 | Optimistic | ZK |
| :--- | :--- | :--- |
| **Batch あたり L1 コスト** | ~$1-5 (data + state root) | ~$50-500 (proof 検証) |
| **Withdrawal 遅延** | 7 日 | ~時間 (proving 時間) |
| **L2 コスト** | Ethereum と同じ | Ethereum と同じ |
| **Proof 生成** | 無料 (チャレンジ時のみ) | 常時、batch あたり ~$1-100 |
| **State of art** | OP Stack、Arbitrum | Polygon zkEVM、zkSync、Scroll |

高頻度 batch (1 時間未満) 向け、**ZK が batch あたり高い**。低頻度向け、**optimistic が安いが finalize 遅い**。

> 🛑 **理解度チェック。** 「ZK rollup は optimistic rollup より良い」**間違ったフレーミング**。違うトレードオフ。言い直し: いつ optimistic 勝ち、いつ ZK 勝ち?

Optimistic 勝つもの:
- 低 L1 コスト
- 成熟ツーリング
- 汎用 EVM 互換性

ZK 勝つもの:
- 即時 finality (7 日待ちなし)
- クロスチェーン相互運用に良い (他 chain が proof 信頼可能)
- コンプライアンスに良い (監査可能 proof)

## 5. Fraud proof コードを読む — OP Stack Cannon

OP Stack の fraud proof システムは **Cannon**。非自明な動き: L2 全体を L1 で再実行 (不可能 — コストが高すぎる) するのでなく、Cannon は L1 上で動く制約 MIPS VM 内で **1 つの disputed MIPS 命令** を再実行。

フロー:
1. Challenger が「step X 間違い」と主張
2. Bisection ゲーム: 両当事者が単一 MIPS 命令まで絞り込み
3. L1 contract がその単一命令実行
4. 命令の正/誤結果を証明した方が勝つ

[\`ethereum-optimism/optimism/cannon\`](https://github.com/ethereum-optimism/optimism/tree/develop/cannon) がコードベース。

1 命令まで絞り込むパターンが fraud proof を *そもそも実現可能にする* — これなしでは、L1 に潜在的に数年分の L2 履歴を再実行させることになる。

## 6. ZK proof コードを読む — SP1 + Reth

[\`succinctlabs/sp1\`](https://github.com/succinctlabs/sp1) は revm 経由で EVM 実行を証明可能な zkVM。フロー:

1. Reth が L2 ブロック実行 (通常実行)
2. SP1 の「guest program」が revm 実行をラップ
3. SP1 が revm が主張する state 変更生成したと proof 生成
4. Proof on-chain 提出

Reth ベース ZK rollup 向け: **同じ revm コードが実行と proving で走る**。これが Rust EVM スタックが ZK rollup に重要な理由。

## 7. 未来 — RISC Zero、SP1、Reth 上の ZK rollup

2025-2026 トレンド: ZK proving コスト急速下落。SP1、RISC Zero、Polyhedra すべて Ethereum ブロックあたり ~$1-10 per proof に到達。このコストで、**ZK rollup が汎用決済に競合可能**。

Tempo (ZK 行くなら) はこれら proving システムの 1 つ使う可能性。Hyperliquid は今のところ optimistic 維持の可能性 (MEV 抽出モデルが ZK の利益にならない)。

## 8. Tempo の分散化パス向け

Tempo Moderato が今日中央集権なら、分散化パスは likely:

1. **今日**: 中央集権 sequencer、fraud/validity proof なし (Paradigm 信頼)
2. **Phase 2**: optimistic fraud proof 追加 (誰でもチャレンジ可能)
3. **Phase 3**: ZK proof (即時 finality)
4. **Phase 4**: 分散化 sequencer セット + ZK proof

各ステップが複雑さと運用オーバーヘッドのコストで trust 最小化追加。

## 9. 練習

1. Optimism の [fraud proof spec](https://specs.optimism.io/fault-proof/index.html) 読む
2. SP1 の [EVM proving guide](https://docs.succinct.xyz/) 読む
3. 計算: 1 batch の ZK proof $5、fraud proof 検証 $1 で、高スループット chain にとって ZK が optimistic より安くなるのはいつ?
4. 特定: chain が ZK proof を望まない時、安くても?

## 10. 読み物

- [Vitalik の fraud proof intro](https://vitalik.ca/general/2021/01/05/rollup.html)
- [Cannon (OP Stack fraud proof)](https://github.com/ethereum-optimism/optimism/tree/develop/cannon)
- [SP1 (ZK proving)](https://github.com/succinctlabs/sp1)

> 最終チェック: 一文で、なぜ fraud proof と validity proof の選択が rollup の **すべての他** UX 側面を決めるか? **答えに「withdrawal 遅延」or「trust window」がなければ §2-§4 を再読**。`,
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

動く L2 sequencer は **Rust ~270 行**。これがオーケストレーション層全部: ブロック生成ループ、mempool、L1 inbox watcher、batcher。これがそれほど小さい理由は **実際難しいすべてを Reth が処理** するから — revm 実行、MDBX ストレージ、state 管理、P2P。Sequencer の仕事は Engine API 経由で Reth を駆動し、結果を L1 に投稿することだけ。

その ~270 行という数字が大半の本番 L2 の実 launch アーキテクチャ。本レッスンはそのウォークスルー。

> 🛑 **スクロール前に予測。** Sequencer が ~2s ごとに L2 ブロック構築。**本番で最も起きやすい最初の失敗モードは?** (ヒント: コンセンサスでも crypto でもない。)

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

1 プロセスに 3 コンポーネント:
1. **Sequencer loop** — Engine API 経由でブロック生成駆動
2. **Mempool** — ユーザ tx 受け入れ、fee で優先付け
3. **Batcher** — 定期的に L1 投稿

最小 MVP 向け、すべて 1 バイナリで走らせる。本番は分けて scale。

## 2. Sequencer loop

コア生成ループ:

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

~80 行。**2 秒ごとに sequencer の authority で署名されたブロック生成**。

## 3. Mempool

さらに単純:

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

実用では、mempool に必要:
- 優先キュー (gas tip でソート)
- Eviction (timeout、フル mempool)
- Reorg 処理 (reorg 時に tx を pool に戻す)
- Sanity 検証

しかしデータ構造は単純。

## 4. L1 inbox watcher

L1→L2 deposit 向け、L1 inbox contract を watch:

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

L1 で deposit イベント発火されたら、等価 L2 transaction エンコードして mempool 経由で force-include。Mempool がブロック構築で deposit に優先順序与える。

## 5. Batcher

定期的に L2 ブロックを L1 投稿:

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

~50 行。60 秒ごとに、最後 batch 以降の全 L2 ブロックが圧縮されて blob として L1 提出。

## 6. 全システム

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

**~270 行 Rust** でブロック生成、tx 受け入れ、L1 deposit watch、L1 batch する動く sequencer。これが大半の chain が launch 時に使う実 MVP アーキテクチャ。

## 7. 本番 gotcha

この最小版が省略するもの:

| Gotcha | 現実 |
| :--- | :--- |
| **Liveness alarm** | Monitoring + 自動 failover 必要 (ops チームへの heartbeat) |
| **L1 reorg 処理** | L1 が reorg したら、orphan された tx を再 batch 必要 |
| **L2 reorg 処理** | 稀のはず (単一 sequencer = 決定論的) だが可能 |
| **Pre-confirmation** | Sequencer が L1 finality 前にコミット; 嘘ついたら contract が処理 |
| **Mempool DOS** | 攻撃者が mempool spam; rate limit + fee escalation 必要 |
| **Database 成長** | 全ブロックを追跡; 最終的に pruning 必要 |

各々が独自エンジニアリング問題。270 行 MVP から始め、必要に応じて追加。

## 8. Tempo Moderato 向け

Tempo の sequencer (Paradigm 運用) likely:
- Reth 上で 300-500 行 Rust
- 上記と同じアーキテクチャ
- 加えて: merchant 認可、規制 monitoring、payment 優先順序付け

新規性はアプリケーションロジック、コンセンサスメカニクスではない。

## 9. 練習

1. \`fetch_blocks\` 関数書く — 範囲内 L2 ブロックを Reth に query
2. Blob tx 構築をスケッチ (EIP-4844 type 3)
3. 特定: batcher が投稿失敗するのはいつ? 再試行戦略は?
4. 計算: 2 秒ブロック時間、batch あたり圧縮 1MB で、日次 L1 コスト?

## 10. 読み物

- [op-rbuilder](https://github.com/paradigmxyz/op-rbuilder)
- [op-batcher](https://github.com/ethereum-optimism/optimism/tree/develop/op-batcher)
- [Astria sequencer](https://github.com/astriaorg/astria) — 共有 sequencer 参照

> 最終チェック: 一文で、なぜ ~300 行 Rust で動く L2 sequencer に十分か? **答えに「Reth が難しい部分処理」がなければ、アーキテクチャ分離を内面化していない**。`,
                },
                {
                  title: '分散化パス — 共有 sequencer と MEV 認識 auction',
                  slug: 'sequencer-decentralization-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 16,
                  xpReward: 45,
                  content: `# 分散化パス — 共有 sequencer と MEV 認識 auction

Optimism が「sequencer を分散化する」と発表したのは 2023 年。3 年後、sequencer は OP Labs にある 1 箱のまま。Arbitrum も同じことを言う。Base も。分散化ロードマップは本物 — そして **L2 の人生の後半**。目的地として競合する 2 つのアーキテクチャパターン: **分散化 sequencer セット** (chain が自身のバリデータを走らせる) と **共有 sequencer** (複数 rollup が共通セットに順序付けを outsource)。

本レッスンが地図。なぜ分散化が詰まっているのか? 各パスは実際どう見える? Espresso、Astria、Polygon zkEVM、Linea がどちらに賭けて、なぜか?

> 🛑 **スクロール前に予測。** Optimism は 3 年間「sequencer 分散化中」。**何が阻んでいる?** なぜこんなに難しい?

## 1. 分散化ステージ

| ステージ | 何 | 例 (2026) |
| :--- | :--- | :--- |
| **1: Single sequencer** | 1 オペレータ | 今日の大半 L2 (Optimism、Base、Arbitrum) |
| **2: Multi-sig sequencer** | M-of-N 信頼オペレータ | 一部 L3 |
| **3: PoS sequencer セット** | Bonded validator が回転 | Polygon zkEVM、Linea (recent) |
| **4: 共有 sequencer** | 1 sequencer セットが多 rollup にサービス | Espresso、Astria、Radius |
| **5: MEV 認識分散化** | 入札付き sequencer market | 未来状態 — 完全 deploy なし |

パスは **厳密に線形でない** — 一部 chain はステージスキップ。一部は中央集権から共有 sequencer に直接採用。一部は無期限に中央集権。

## 2. なぜ分散化が難しい

5 つの実問題:

### 2.1 レイテンシ

中央集権: 100ms ブロック生成可能。
分散化: コンセンサスの最小 2-3 round trip → 最良でも 200-500ms。

ユーザはこれを感じる。中央集権 sequencer は <100ms で pre-confirmation 提供。分散化はこれが難しい。

### 2.2 MEV コーディネーション

中央集権: 1 MEV 戦略。
分散化: 誰が MEV 取る? ランダム回転? 入札? 各設計がトレードオフ。

### 2.3 Liveness

中央集権: 1 オペレータ = 単一障害点だが monitor 容易。
分散化: N オペレータ = 単一障害なしだがコーディネーションオーバーヘッド。**ネットワーク問題下の liveness が genuinely 難しい**。

### 2.4 コスト

中央集権: ~1 サーバ。
分散化: ~N サーバ + コンセンサスプロトコル + slashing インフラ。

### 2.5 経済的セキュリティ

中央集権: オペレータ信頼。
分散化: staking、slashing、紛争解決必要。

各障壁は別個に解かれているが、**5 つ全部統合** がシステムチャレンジ。

## 3. PoS sequencer セット — 自然な拡張

最初の分散化ステップ: Ethereum 系 PoS を L2 に複製。

\`\`\`mermaid
flowchart TB
    Stake["バリデータが L2 トークン stake"] --> Set["アクティブ validator set (M-of-N)"]
    Set -->|各ブロック| Leader["指定リーダー (回転)"]
    Leader -->|ブロック構築| Reth["Reth EL"]
    Reth -->|署名ブロック| Others["他バリデータ"]
    Others -->|2f+1 票| Final["ブロック確定"]
    Final -->|定期 batch| L1["L1"]
\`\`\`

これが **Polygon zkEVM** が向かう先 (Hermez 系 validator set)、**Linea** が近づく先 (Consensys-coordinated)、大半の「Stage 3」rollup が行き着く先。

トレードオフ: 1 オペレータから ~10-30 オペレータに。Trust 最小化に増分; 運用複雑さに大増分。

## 4. 共有 sequencer — アーキテクチャ的 bet

もし N 個の rollup それぞれが自身の分散化 sequencer セットを必要としなかったら — もし全部で 1 つを *共有* したら? それが **共有 sequencer** の賭け: 単一 sequencer セットが複数 rollup にサービス。各 L2 は自身の Reth 実行層を保つが、順序付けは共有 validator set で起きる。

\`\`\`mermaid
flowchart TB
    Rollup1["L2 A<br/>(Reth ベース)"] -.->|順序付けを outsource| Shared["共有 Sequencer<br/>(Espresso / Astria)"]
    Rollup2["L2 B<br/>(別 OP Stack)"] -.->|順序付けを outsource| Shared
    Rollup3["L2 C<br/>(別の別)"] -.->|順序付けを outsource| Shared
    Shared -->|署名ブロック| Reth1["Reth EL A"]
    Shared -->|署名ブロック| Reth2["Reth EL B"]
    Shared -->|署名ブロック| Reth3["Reth EL C"]
\`\`\`

なぜ重要:
1. **クロス rollup atomic**: L2 A の tx が L2 B の tx に atomic に依存可能 (同じ sequencer が両方順序付けるため)
2. **低分散化コスト**: 1 validator セットが N rollup にサービス、N validator セットの代わりに
3. **MEV 統合**: クロス rollup MEV キャプチャ可能 (rollup 助け、トレーダ害)
4. **より速い分散化**: rollup が難しい問題を outsource

本番試み:

| プロジェクト | タイプ | ステータス (2026) |
| :--- | :--- | :--- |
| **Espresso** | HotStuff 派生共有 sequencer | Mainnet beta、複数 L2 採用 |
| **Astria** | CometBFT ベース共有 sequencer | Reth 統合でライブ |
| **Radius** | PoS 共有 sequencer | Testnet |
| **Anoma** | Intent 中心 (厳密に sequencer ではない) | 早期 |

> 🛑 **理解度チェック。** 「共有 sequencer は明らかに単一 sequencer より良い」**間違ったフレーミング**。トレードオフ。共有 sequencer が単一に対して犠牲にすることを述べる。

共有 sequencer が犠牲にする:
- **主権**: chain が順序付けに外部当事者依存
- **アップグレード速度**: 共有 sequencer が chain のニーズサポート必要
- **カスタム MEV 戦略**: chain 固有 MEV 抽出より難しい
- **運用独立**: 共有 sequencer が down すると chain 停止

単一 sequencer はこれらを保つ。トレード: より制御するが、より自分を信頼。

## 5. MEV 認識分散化未来

エンドゲーム: **MEV auction 付き分散化 sequencer**。

動作可能性:
1. 複数 sequencer が次ブロック構築競合
2. Builder が抽出 MEV 付き提案ブロック構築
3. Sequencer セットが最良ブロックを vote/auction
4. 勝者が sequencer セットにブロックスペース支払い; sequencer セットが MEV 分配

これが **L2 用 MEV-Boost**。本番でまだ deploy なし (2026)、Flashbots、Espresso、その他のデザインがここをターゲット。

Tempo 向け: 分散化するなら、MEV 問題は興味深い、**merchant 支払いに MEV 機会少ない** から (主に genuine tx、arbitrage でない)。Tempo は MEV 抽出複雑さ多くなく分散化可能。

Hyperliquid 向け: orderbook が本質的に MEV — 中央集権 sequencer を無期限に維持の可能性。

## 6. Astria を読む — 本番共有 sequencer

[\`astriaorg/astria\`](https://github.com/astriaorg/astria) は Reth 統合付き本番共有 sequencer。主要コンポーネント:

- **Sequencer network**: CometBFT ベース validator set
- **Composer**: rollup tx を inclusion 用に集約
- **Rollup nodes**: Reth ベース、sequencer 出力を消費

フロー:
1. ユーザが L2 A の RPC に tx 提出
2. RPC が Astria sequencer に転送
3. Astria が順序付け (L2 B、C などの tx と)
4. Astria が ordering 発火; 各 Reth rollup が自身の tx 選択

これが本番で **最も test された共有 sequencer アーキテクチャ**。パターン読む価値あり。

> 🔍 **リポで探す。** Astria の [docs.astria.org](https://docs.astria.org/) を開いて L2 が Astria sequencing に「subscribe」するために何が必要か追跡。

## 7. Pre-confirmation レース

新方向 (2025-2026): **sequencer からの pre-confirmation**、full sequencing 前でも即時 UX 可能に。

複数 sequencer pre-conf モデル:
- **TACo (Threshold)**: sequencer の majority のコミット必要
- **Lighthouse 系**: 1 sequencer がコミット、他が finality 前検証
- **Speculative**: sequencer がコミット、違反したら fraud-proof

これが 2026 のアクティブ R&D エリア — 「分散化だが速い」問題解決。

## 8. 私のプロジェクトの場合

### Tempo Moderato → Tempo mainnet

パス:
- 今日: 中央集権
- 1 年: PoS sequencer セット (~20-30 バリデータ)
- 2-3 年: 共有 sequencer かも (経済性が動けば)
- 常に: 最終的に高速 withdrawal 用 ZK proof

### mppsol / soltempo

Tempo の sequencer とのやり取りがインタフェース点。Tempo が分散化すると:
- Pre-confirmation がより難しい (複数当事者)
- Liveness alarm がよりニュアンス的
- コードが「sequencer 変更」イベント処理必要

### Hyperliquid

予見可能将来は中央集権維持の可能性。MEV モデルが分散化に合わない。Bridge が sequencer より先に分散化するの可能性。

## 9. 練習

1. Astria の sequencer ドキュメント読む
2. Espresso のデザインと比較 — 何が違うか?
3. 特定: カスタム MEV モデルの chain に共有 sequencer が困難な理由?
4. スケッチ: Tempo が最終的にどう分散化するか?

## 10. 読み物

- [Paradigm on shared sequencing](https://www.paradigm.xyz/2023/11/shared-sequencer) — 設計哲学
- [Espresso docs](https://docs.espressosys.com/)
- [Astria](https://github.com/astriaorg/astria)

> 最終チェック: 一文で、分散化 sequencer セット (chain が所有) と共有 sequencer (outsource) の **根本的アーキテクチャ選択** は? **答えに「主権 vs 効率」がなければ §4 を再読**。`,
                },
                {
                  title: 'ファイナルクイズ: sequencer & rollup アーキテクチャ',
                  slug: 'sequencer-final-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 2,
                  duration: 12,
                  xpReward: 50,
                  content: `# ファイナルクイズ: sequencer & rollup アーキテクチャ

L2 アーキテクトの最終チェック。Rollup を出荷、Tempo の sequencer と統合、新 L2 設計に必要。`,
                  quizQuestions: [
                    {
                      question: 'なぜ **中央集権 sequencer** が rollup に許容可能だが **permissionless L1 には許容不可** か?',
                      options: [
                        'Rollup ユーザは期待値が低い。',
                        'Rollup は L1 の contract を safety のフォールバックとして使用: sequencer 検閲なら、ユーザは L1 force-include contract 経由で提出可能; sequencer が state 嘘なら、L1 contract が withdrawal 拒否。Sequencer は UX (速度、順序付け) に信頼、資金には信頼しない。Permissionless L1 にはそのフォールバックなし — コンセンサスがセキュリティ。',
                        '中央集権 rollup は実は permissioned ではない。',
                        'L2 transaction は可逆。',
                      ],
                      correctIndex: 1,
                      explanation: 'Rollup セキュリティモデル = sequencer は UX に信頼、L1 のコンセンサスは safety に信頼。根本的アーキテクチャ的洞察は、ユーザが L1 経由で escape hatch を持つので sequencer は中央集権でも chain を中央集権にしない。これがまさに本番 L2 が単一 sequencer で出荷する理由 — UX 最高、escape hatch が資金保護。',
                    },
                    {
                      question: 'Rollup が **EIP-4844 blob** として data 投稿、calldata でなく。**なぜ 10x 安いか、catch は?**',
                      options: [
                        'Blob は Bitcoin に保存される、Ethereum でなく。',
                        "Blob ガスは calldata ガスと別価格、はるかに低 (~0.1-1 gas/byte vs 16 gas/byte)。Catch: blob は ~18 日で prune、長期 data 必要なら別途アーカイブ必要。18 日 window は fraud proof window と一致 — safety に十分長く、コストに十分短い。",
                        'Blob は Layer 2 ノードのみ検証。',
                        'Blob は同コスト; EIP-4844 は calldata を rename しただけ。',
                      ],
                      correctIndex: 1,
                      explanation: "EIP-4844 が rollup DA 専用の別 fee market 付き blob 運搬 transaction 導入。低コストは blob が prune 可能だから — Ethereum ノードが proof window 後に drop。長期アーカイブは外部サービス使用 (IPFS、専用アーカイブ)。価格/可用性トレードオフが動くのは、セキュリティが fraud proof window 中にだけ DA 必要だから。",
                    },
                    {
                      question: 'OP Stack で、**deposit transaction** が L1 から L2 ブロックの **先頭** に含まれねばならない。**なぜこれが sequencer policy ではなくプロトコル強制か?**',
                      options: [
                        'Top-of-block が最大 MEV。',
                        'Deposit は L1 から L2 に動くユーザ資金。Sequencer が deprioritize できれば、deposit は無期限遅延可能 — rollup セキュリティモデル「sequencer 検閲しても資金安全」を破壊。Top-of-block を強制することで deposit が well-defined 時刻で処理保証。',
                        'Top of block で低 transaction fee 適用。',
                        'Top of block が gas コスト削減。',
                      ],
                      correctIndex: 1,
                      explanation: 'Deposit はユーザが L1 経由で動くことコミットした資金; 処理されねばならない。プロトコルが最強の inclusion 保証を与える。Sequencer が deprioritize できれば、資金 safety 保証全体崩壊。これが「Deposit が top」が sequencer policy でなく L1 contract 経由でコンセンサス強制な理由。',
                    },
                    {
                      question: '**Fraud proof** と **validity (ZK) proof** の選択が withdrawal 遅延決定。**構造的違いは?**',
                      options: [
                        "Fraud proof のほうが速い。",
                        'Fraud proof: デフォルトで sequencer の state root クレーム信頼、window 中 (OP Stack で 7 日) 誰でもチャレンジ可能; チャレンジャ出ないなら state 最終。Validity proof: sequencer が正確性の暗号 proof 提供必要; proof は L1 で即時検証。Validity → チャレンジ window なし → 即時 finality だが高コスト proof。',
                        "ZK proof は fraud proof より単純。",
                        '両方とも同一の withdrawal 遅延を生む。',
                      ],
                      correctIndex: 1,
                      explanation: 'Fraud proof: 「誰かが間違いを証明しない限り信頼」+ 7 日 window。Validity proof: 「常に暗号正確性要求」+ 即時。トレードオフ: fraud proof は valid 時安価 (proof 不要) だが finality 遅い; validity proof は各 batch 高価だが即時 finality。違う rollup が違って最適化。',
                    },
                    {
                      question: 'Reth 上の最小 sequencer は **~270 行 Rust** 必要。**なぜそんなに少ない?**',
                      options: [
                        'Rust は異常に簡潔。',
                        "Reth がすべての難しい実行処理 (revm、MDBX、state 管理、P2P) を処理。Sequencer は: (1) Engine API でブロック生成駆動、(2) mempool 維持、(3) L1 inbox を deposit に watch、(4) L2 ブロックを L1 投稿用 batch、だけ必要。各々 ~50-80 行のオーケストレーションコード。",
                        "Rollup が L1 より単純。",
                        '大半の rollup ロジックは JavaScript で。',
                      ],
                      correctIndex: 1,
                      explanation: 'アーキテクチャ分離が報酬: Reth = 実行、sequencer = オーケストレーション。Sequencer は Engine API 経由で Reth 駆動する薄いコーディネーション層。難しい部分 (EVM、ストレージ、state) は Reth に。これが多くの本番 sequencer が Reth 上の ~300-500 行 Rust になる理由。',
                    },
                    {
                      question: 'なぜ **Optimism、Arbitrum、Base** 全部が分散化ロードマップにもかかわらず何年も中央集権 sequencer 維持か?',
                      options: [
                        '分散化が優先事項でない。',
                        '5 つの実チャレンジ: (1) コンセンサスでレイテンシが 2-5x 劣化、(2) MEV コーディネーション複雑、(3) N オペレータで liveness 困難化、(4) 運用コスト上昇、(5) 経済セキュリティインフラ (staking、slashing) が非自明。最初 1 つ — ユーザ体験 — だけで中央集権を実用デフォルトに保つ。UX > 大半ユーザの分散化。',
                        'コードベースが汚すぎて分散化できない。',
                        '分散化には法的再構築必要。',
                      ],
                      correctIndex: 1,
                      explanation: '分散化が難しいのはコードではなくシステムエンジニアリング: レイテンシ、liveness、MEV コーディネーション、ops コスト、セキュリティインフラ。各々個別に解決可能; 全 5 を本番で組み合わせるのが実チャレンジ。大半 L2 は UX 優先 (中央集権)、ユーザが速 & 安を分散化より好む。',
                    },
                    {
                      question: 'Espresso、Astria のような **共有 sequencer** の **アーキテクチャ的 bet** は?',
                      options: [
                        '個別 sequencer 走らせるより安価。',
                        "1 sequencer セットが N rollup にサービス、可能にする: (1) クロス rollup atomic transaction (同 sequencer が両方順序付け)、(2) rollup ごと分散化コスト低、(3) クロス rollup MEV キャプチャ。トレードオフ: rollup が順序付けの主権を諦める — 難しい問題を outsource。",
                        'Rollup が data availability スキップ可能。',
                        'State root commitment の必要性を排除。',
                      ],
                      correctIndex: 1,
                      explanation: "共有 sequencer は **マルチ rollup composability が十分重要** で rollup が sovereign sequencer control を諦めるという賭け。Espresso、Astria、Radius が本番試み。Bet は contested — 多くの L2 が運用独立性と MEV 戦略のために sequencer 所有を好む。次の 2-3 年がどちら勝つか明らかにする。",
                    },
                    {
                      question: 'Tempo Moderato (Tempo の testnet) 向け、**中央集権 → 分散化軌跡** は?',
                      options: [
                        'Day 1 で完全分散化 validator set に直接ジャンプ。',
                        "Likely: (1) 今日: 中央集権 sequencer (Paradigm 運用)、(2) 1 年: PoS validator set (~20-30 オペレータ)、(3) 2-3 年: 共有 sequencer かも (経済性が動けば)、(4) 常に: 最終的に高速 withdrawal 用 ZK proof。各ステップが運用コスト付き増分 trust 最小化。",
                        '無期限に中央集権維持。',
                        "Tempo は sequencer 持たない — 純粋に on-chain。",
                      ],
                      correctIndex: 1,
                      explanation: '標準 L2 軌跡。Paradigm が launch 制御; bonded バリデータが sequencing 分散化; ZK proof が最終的に withdrawal 遅延圧縮。各ステップ 1-2 年出荷。大半 L2 がまさにこのパス follow; Tempo も同じ。Soltempo と mppsol はこの軌跡を仮定して構築必要。',
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
