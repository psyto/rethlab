import { PrismaClient } from '@prisma/client';

export async function seedRethSequencerRollupV3JA(prisma: PrismaClient) {
  const tags = ['reth', 'sequencer', 'rollup', 'fraud-proofs', 'validity-proofs', 'mev-boost', 'shared-sequencer', 'l2', 'advanced'];

  await prisma.course.create({
    data: {
      slug: 'reth-sequencer-rollup-v3-ja',
      title: 'Sequencer & Rollup アーキテクチャ — 中央集権ブロック生成から共有 sequencer まで',
      description:
        '現代の L2 が実際どう動くか: sequencer の役割、batch 投稿と data availability、fraud proof vs validity (ZK) proof、op-rbuilder と op-batcher を読み、Reth 上で最小 sequencer を作り、単一オペレータから共有 sequencer までの分散化パス。Tempo Moderato 級の L2 を architect、OP Stack chain を出荷、次の共有 sequencer を作る準備ができる。',
      difficulty: 'ADVANCED',
      duration: 114,
      xpReward: 500,
      track: 'reth-l1-architect',
      tags,
      isPublished: true,
      sortOrder: 1320,
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
                  title: 'レッスン0 — Sequencer とは何か？ Rollup モデルを 15 分で',
                  slug: 'sequencer-fundamentals-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 16,
                  xpReward: 40,
                  content: `# レッスン0 — Sequencer とは何か？ Rollup モデルを 15 分で

## 問い

Base で swap を送る。1 秒未満で confirm。Wallet に tx が表示される。その順序を決め、自社サーバで実行し、**いずれ** Ethereum に投稿するのは **1 企業** — Coinbase。慣習的な定義に従えばこれは中央集権システム。**それなのになぜ Base は「分散化された rollup」と呼ばれるのか？**

## 原理（最小モデル）

- **Rollup = L2 実行 + L1 へのコミットメント.** Sequencer が L2 ブロック生成、batcher + proposer が L1 投稿。
- **Sequencer の 3 役割.** Ordering（tx 順序選択）+ Execution（revm 実行 + post-state 生成）+ Batching（L2 ブロックを L1 投稿）。
- **Rollup モデルの売り「UX は信頼、資金は信頼しない」.** 中央集権 sequencer でもユーザ資金は安全 — 検閲されたら **L1 force-inclusion contract** に直接 tx 提出、L1 contract が期限内 inclusion 強制（OP Stack で約 1 時間）。
- **L1 上の 3 contract.** Inbox（OptimismPortal、deposit + 強制 include）+ Outbox/OutputOracle（state root commitment）+ Bridge（asset 転送ラッパ）。
- **中央集権パラドックスの 5 理由.** 性能 / MEV / Liveness / Pre-confirmation / 運用シンプルさ。
- **分散化スペクトラム 4 位置.** Single sequencer → Multi-sequencer（whitelist）→ 分散化 sequencer → 共有 sequencer。

## 具体例

Rollup データ経路:

\`\`\`mermaid
flowchart TB
    Users["L2 Users"] -->|submit tx| Seq["Sequencer<br/>(centralized)"]
    Seq -->|execute| L2["L2 chain<br/>(Reth-based execution)"]
    L2 -->|batch| Batcher["Batcher<br/>(off-chain)"]
    Batcher -->|post calldata + state root| L1["L1 (Ethereum)"]
    L1 -->|finalize after challenge| L2
\`\`\`

Sequencer の 3 役割:

| 役割 | 内容 | 場所 |
| :--- | :--- | :--- |
| Ordering | 各 L2 ブロックの tx 順序選択 | L2 上 |
| Execution | revm で実行し post-state 生成 | L2 上 |
| Batching | L2 ブロックを L1 投稿 | Off-chain → L1 |

OP Stack の 3 repo 対応:
- **op-rbuilder**（または op-geth）: 実行 + 順序付け
- **op-batcher**: batch サービス
- **op-proposer**: state root 提出サービス

L1 上の 3 contract:

| Contract | 役割 |
| :--- | :--- |
| Inbox (OptimismPortal) | Deposit + 強制 include tx 受信 |
| Outbox / OutputOracle | Sequencer から state root commitment 受信 |
| Bridge | ユーザ向け asset 転送ラッパ |

分散化スペクトラム:

| 位置 | 例 | Trust モデル |
| :--- | :--- | :--- |
| Single sequencer | Optimism、Arbitrum（launch 時）、Base | Liveness 1 オペ信頼、safety は escape hatch |
| Multi-sequencer（whitelist）| 一部 L3、validium chain | N オペ信頼（M-of-N） |
| 分散化 sequencer（共有なし）| Polygon zkEVM（近年） | PoS 系 sequencer 選出 |
| 共有 sequencer | Espresso、Astria、Radius | 1 sequencer set が複数 rollup にサービス |

## 失敗例（誤解）

「Sequencer が中央集権 = rollup が中央集権」— **間違い**。Sequencer は **UX 担当**（順序付け + 即時 confirmation）、**資金担当ではない**。資金は L1 contract 経由で escape hatch 保証。中央集権 = sequencer の選択肢、Rollup security ≠ sequencer trust。

「Sequencer が検閲したらユーザ詰む」— **間違い**。L1 inbox contract（OptimismPortal）に直接提出 → sequencer は期限内（~1 時間）に inclusion 強制 → 期限超過なら誰でも force-inclusion 可能。**検閲コストは有限**（最大 ~1 時間遅延 + L1 ガス）。

「Sequencer が 2 時間 offline = ユーザ資金消失」— **間違い**。L2 chain 停止（新ブロックなし）、ユーザ資金 **安全**（state 変更なし）、Inbox 経由 depositor は escape hatch 機構で tx 強制実行。

> 🛑 **予測。** Optimism は OP Labs チームが運用する sequencer を 1 つだけ持つ。なぜこれが許容可能なのか？ Single sequencer であっても rollup アーキテクチャがなければ可能になる攻撃のうち、緩和できるものは？（答え: 中央集権 sequencer が緩和できないが rollup が緩和するもの = ① 資金窃取（L1 contract が withdrawal を state proof で検証 → sequencer の state 嘘 → 拒否）+ ② 永久検閲（L1 force-inclusion で期限超過なら誰でも強制）+ ③ サイレント rule 変更（OutputOracle に commitment → 全員が検証可能）。**sequencer を信頼するのは UX（順序付けの即時性）のみ、資金 safety は L1 が担保**。）

## ステップで組み立てる

### Step 1: Rollup = L2 実行 + L1 コミットメント

両方が必須 — 一方だけだと「ただの sidechain」または「ただの settlement layer」。

### Step 2: Sequencer 3 役割を即答

Ordering / Execution / Batching。OP Stack では 3 サービス（op-rbuilder / op-batcher / op-proposer）。

### Step 3: 検閲時のユーザ経路

L1 Inbox（OptimismPortal）に直接提出 → sequencer 期限内 inclusion 強制 → 期限超過なら誰でも force-inclusion。

### Step 4: L1 3 contract の役割

Inbox（deposit + force-include）/ Outbox（state root commitment）/ Bridge（asset wrapper）。

### Step 5: 中央集権パラドックスの 5 理由

性能 / MEV / Liveness / Pre-confirmation / 運用シンプルさ。**UX vs 検閲耐性のトレードオフ**、大半の L2 は UX 選ぶ。

### Step 6: Reth が収まる場所

Sequencer が EL として Reth 走らせる → Engine API（forkchoiceUpdated / getPayload / newPayload）経由。OP Stack は \`crates/optimism/\` が OP 理解の実行層提供。

### Step 7: 分散化スペクトラム 4 位置

Single → Multi（whitelist）→ 分散化 → 共有。大半が位置 1、共有 sequencer が位置 4 のフロンティア。

## 答え合わせ

- **Single sequencer 許容可能な理由**: UX の即時性（pre-confirmation、低レイテンシ）+ 運用シンプルさ + 資金 safety は L1 が担保（escape hatch + force-inclusion + state proof）。検閲も期限付きで強制可能。**信頼の対象が小さい**（UX のみ）= 大きな利益。
- **Sequencer downtime（2h）の結末**: L2 chain 停止（新 block なし）+ ユーザ資金安全（state 不変）+ 2h 後に escape hatch で deposit tx 強制実行可能（具体経路は rollup ごとの contract 依存）。**chain は止まるが、resume または migrate できる**。
- **5 つの中央集権理由**: 性能（予測可能順序付け）+ MEV（1 sequencer 制御）+ Liveness（1 オペ online 容易）+ Pre-confirmation（単一なら即時署名）+ 運用（1 オペで monitoring / on-call / deploy）。

## 合格基準

- Rollup の 2 要素（L2 実行 + L1 コミットメント）を即答できる。
- Sequencer の 3 役割と OP Stack の 3 repo を対応付けられる。
- 検閲時のユーザ経路（L1 inbox → force-inclusion）を辿れる。
- 中央集権 5 理由を即答できる。
- 分散化スペクトラム 4 位置を例で言える。

## まとめ（3行）

- Rollup = L2 実行 + L1 コミットメント、Sequencer は UX（順序 + 即時性）を信頼、資金 safety は L1 contract が担保（escape hatch + force-inclusion）。
- 中央集権 sequencer の 5 理由（性能 / MEV / Liveness / Pre-confirmation / 運用）= UX 優先のトレードオフ、検閲コストは有限。
- 分散化スペクトラム 4 位置（Single → Multi → 分散化 → 共有）、大半が Single、共有 sequencer が次のフロンティア。
`,
                },
                {
                  title: 'レッスン1 — Batch 投稿と data availability',
                  slug: 'sequencer-batch-da-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 16,
                  xpReward: 40,
                  content: `# レッスン1 — Batch 投稿と data availability

## 問い

2024 年 3 月以前、Ethereum に rollup data を 1MB 投稿するコストは **batch あたり約 $300**。EIP-4844 後、同じ 1MB が **$3〜$30** に下がった。10 倍のコスト低下は rollup 史上最大の改善で、Base の tx 手数料がセント単位で済む理由。**そもそもなぜ rollup は L1 に data を投稿しなければならないのか？**

## 原理（最小モデル）

- **State root（32 byte）だけでは L2 state を再構築できない.** Tx data がなければ sequencer が嘘をつけて誰も検知できない。
- **Data availability = 「tx data が皆の読める場所に公開」.** 誰でも tx 再実行 + 同 state root 検証可能。
- **4 つの DA モデル.** Rollup（L1 calldata / blob）/ Validium（DA 委員会）/ Volition（tx ごと選択）/ Optimium（DA 委員会 + fraud proof）。
- **EIP-4844 blob 革命.** 専用 fee market + 18 日 prune（fraud proof window 十分）+ 1 block 最大 768KB（128KB × 6）+ byte コスト 0.1-1 gas（vs calldata 16 gas）。
- **3 サービスが異なる頻度.** Sequencer（block ごと ~2s）+ Batcher（~60s）+ Proposer（~1h）。
- **圧縮が静かなる勝者.** zlib 3-5×、カスタム 5-10×。スループット倍増。
- **DA 代替.** Celestia（専用 DA、~$0.0001/byte）/ EigenDA（restaker）/ Avail。Ethereum セキュリティ vs コスト trade。

## 具体例

DA モデル:

| モデル | Data の場所 | Trust | 例 |
| :--- | :--- | :--- | :--- |
| Rollup | L1 calldata or blob 投稿 | L1 コンセンサス | Optimism、Arbitrum、すべての「真の」rollup |
| Validium | 別の DA 委員会 投稿 | Multisig / PoS | StarkEx、dYdX v3 |
| Volition | ユーザが tx ごと選択 | 混合 | dYdX v4 系ハイブリッド |
| Optimium | Fraud proof 付き DA 委員会 | DA 委員会 + fraud proof | より新しい設計 |

Calldata vs Blob:

| 性質 | Calldata | Blob (4844) |
| :--- | :--- | :--- |
| byte あたりコスト | 約 16 gas | 可変、典型的 0.1〜1 gas |
| L1 上の寿命 | 永久 | 約 18 日（その後 prune） |
| 検証 | 誰でも読める | 18 日間は誰でも読める |
| ブロックあたり最大 | 実用 ~125KB | 128KB × 6 = 768KB |

Batch 投稿フロー:

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

3 サービス頻度:

| サービス | 頻度 | 目的 |
| :--- | :--- | :--- |
| Sequencer | L2 block ごと（~2s）| ブロック構築 |
| Batcher | ~60s | 圧縮 batch を L1 提出 |
| Proposer | ~1h | State root commitment 提出 |

op-batcher コアループ（[ethereum-optimism/optimism/op-batcher](https://github.com/ethereum-optimism/optimism/tree/develop/op-batcher)、Go）:

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

圧縮率:

| Data | 圧縮率 |
| :--- | :--- |
| 生 transaction | 1.0× |
| RLP エンコード | 1.0× |
| Batch 単位 zlib | 3〜5× |
| カスタム（zlib + アドレス圧縮など）| 5〜10× |

DA 代替:

- **Celestia** — 専用 DA layer、~$0.0001/byte（blob ~$0.001 vs）
- **EigenDA** — EigenLayer restaker、Ethereum 経済 security 部分継承
- **Avail** — Polygon の DA、Celestia 風構造

## 失敗例（誤解）

「State root だけあれば L2 state 復元可能」— **間違い**。State root は 32 byte の identifier、L2 state の中身は教えない。tx data がなければ sequencer は state について嘘をつき放題、誰も検知不能。**両方** が必要。

「Blob は永久に L1 上に残る」— **間違い**。**18 日後に prune**。長期保存は別途アーカイブ（IPFS / 専用ノード）。18 日は fraud proof window として十分。

「全 rollup が blob に移行すれば全員 10× 安くなる」— **間違い**。Blob は **ブロックスペース競合**。投稿 rollup 増 → blob ガス価格上昇 → 3-5× まで圧縮される均衡。Celestia / EigenDA / Avail が代替（セキュリティ trade）。

> 🛑 **予測。** Rollup が 12 分ごとに L1 に 1MB の transaction data を投稿。Ethereum mainnet ガス価格で 1 日あたりいくらかかるか？ EIP-4844 前と後でコスト差は？（答え: **calldata 時代** = 16 gas/byte × 50 gwei × 1024×1024 byte × (1440 / 12) min/day = ~$36k/day。**EIP-4844 blob** = ~0.5 gas/byte 平均で ~$1k/day（30-40× 削減）。EIP-4844 が rollup を経済的に viable にした。）

## ステップで組み立てる

### Step 1: なぜ DA が必要か

State root（32 byte commitment）+ tx data（実体） = L2 state 復元可能。tx data なし → sequencer 嘘つけて誰も検知不能。

### Step 2: 4 DA モデルを即答

Rollup / Validium / Volition / Optimium。

### Step 3: Calldata vs Blob trade

Calldata: 永久 + 16 gas/byte / Blob: 18 日 prune + 0.1-1 gas/byte + 1 block 768KB。fraud proof window には 18 日で十分。

### Step 4: 3 サービス頻度

Sequencer 2s / Batcher 60s / Proposer 1h。コスト大半が batcher + proposer。

### Step 5: 圧縮の効き

zlib 3-5×、カスタム 5-10×。本番 rollup は vanilla zlib より 2-3× 高い圧縮率。

### Step 6: DA 代替を理解

Celestia / EigenDA / Avail = Ethereum より安いがセキュリティ trade。chain ごとに「Ethereum DA vs 代替」選択。

## 答え合わせ

- **State root 単独で sequencer が嘘つける理由**: state root は 32 byte の Merkle commitment、tx 内容を明かさない → sequencer が「block 100 の state は X」と主張 + 嘘の X を提出 → 検証者は実 tx を持たない → 嘘を検知不能。**両方が L1 上にあって初めて再実行 + verification 可能**。
- **Blob 18 日 prune が問題ない理由**: 18 日は fraud proof window（OP Stack 7 日、ZK の場合は数時間で proof 出る）として十分。Window 過ぎたら state root 最終確定 → past data L1 必要なし。長期保存は別途（IPFS、専用 archive node）で「歴史」用途。
- **全 rollup blob 移行で 3-5× 圧縮の均衡**: blob は block 毎 6 blob limit → 投稿者増 → ガス価格上昇 → 現在の 10× 削減から圧縮。完全均衡では rollup は Ethereum 以外（Celestia / EigenDA）に分散 → セキュリティ vs コスト trade を chain ごと選択。

## 合格基準

- DA の必要性（state root + tx data）を 1 文で言える。
- 4 DA モデルを即答できる。
- Calldata vs Blob の 4 性質比較を言える。
- 3 サービス頻度（Sequencer / Batcher / Proposer）を即答できる。
- 圧縮率と DA 代替（Celestia / EigenDA / Avail）を言える。

## まとめ（3行）

- Data availability = 「tx data が皆の読める場所に公開」、state root + tx data で L2 state 復元 + sequencer 嘘検知可能。
- EIP-4844 blob（18 日 prune + 0.1-1 gas/byte + 1 block 768KB）が rollup コスト 10× 削減、3 サービス（Sequencer 2s / Batcher 60s / Proposer 1h）が異なる頻度。
- 圧縮（zlib 3-5×、カスタム 5-10×）が静かなる勝者、DA 代替（Celestia / EigenDA / Avail）は Ethereum より安いがセキュリティ trade。
`,
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
                  title: 'レッスン2 — op-rbuilder を読む（Reth ベースの OP Stack sequencer）',
                  slug: 'sequencer-op-rbuilder-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 18,
                  xpReward: 45,
                  content: `# レッスン2 — op-rbuilder を読む（Reth ベースの OP Stack sequencer）

## 問い

今日 OP Stack chain を立ち上げると、ブロック生成バイナリはほぼ確実に [\`flashbots/op-rbuilder\`](https://github.com/flashbots/op-rbuilder) — OP 派生 rollup 向けに Paradigm が書いた Rust block builder。「Reth 上の sequencer」の本番参照実装で、**マーケティング図解では見えない実際の sequencer が何をしているか**を理解したければここを読む。

## 原理（最小モデル）

- **3 入力ストリーム.** Engine API（コンセンサス側から「何の上に構築すべきか」）+ Mempool（pending user tx）+ L1 Inbox（必ず含める deposit tx）。
- **OP Stack の 5 順序付けルール.** Deposit を先頭 / L1 epoch 帰属 / Sequencer 署名 / Gas limit / Force inclusion。**op-rbuilder がすべて強制**。
- **Sequencer が「選べる」vs「選べない」.** 選べる = ユーザ tx の選択 + 順序 + L1 epoch + timestamp（範囲内）。選べない = Deposit include 有無 + Force-included tx スキップ + Block validity ルール。
- **build_payload の 4 段.** Deposit tx 強制 include → Force-inclusion tx → Mempool から gas limit まで pull → Block seal（root + 署名）。
- **MEV 3 立場.** Vanilla FIFO / Priority-fee 順序付け（OP Stack デフォルト）/ MEV 認識 builder market（PBS）。
- **Pre-confirmation は単一 sequencer のキラー機能.** 即時署名 → 100ms confirmed。複数当事者では投票必要 → 不可。
- **Pre-conf に reorg リスク.** L2 reorg で tx が canonical から外れる、設計次第で sequencer slash。

## 具体例

op-rbuilder アーキテクチャ:

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

OP Stack 順序付け 5 ルール:

1. **Deposit を先頭に**: L1 inbox からの deposit tx はブロック先頭
2. **L1 epoch 帰属**: ブロックは L1 ブロック（「L1 origin」）を参照必須
3. **Sequencer 署名**: ブロックは現役 sequencer の鍵で署名必須
4. **Gas limit**: OP 固有上下限の範囲内（mainnet と異なる）
5. **Force inclusion**: L1 inbox 内 tx が期限超過なら必ず含める

Sequencer が選べる / 選べない:

| 選べる | 選べない |
| :--- | :--- |
| どのユーザ tx を含めるか | Deposit を含めるかどうか（必須） |
| ユーザ tx の順序 | Force-included tx をスキップするかどうか（必ず含める） |
| 帰属させる L1 epoch | Block validity ルール（gas limit / base fee 計算） |
| ブロック timestamp（範囲内） | |

build_payload 関数（op-rbuilder source、おおよその形）:

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

op-rbuilder の主要パス（reth バージョンで揺れる）:

| パス | 役割 |
| :--- | :--- |
| \`crates/builder/src/payload.rs\` | コアのブロック構築ループ |
| \`crates/builder/src/ordering.rs\` | Tx の順序付け戦略 |
| \`crates/builder/src/deposit.rs\` | Deposit tx 処理 |
| \`crates/builder/src/seal.rs\` | ブロックの sealing + 署名 |

MEV 3 立場:

| 立場 | Sequencer がすること | 例 |
| :--- | :--- | :--- |
| Vanilla FIFO | 提出時刻順 | naive な実装 |
| Priority-fee 順序付け | ガスチップ順（Ethereum mainnet 系）| OP Stack デフォルト |
| MEV 認識 builder market | 外部入札を受け入れる | OP Stack + op-rbuilder + bundle market |

## 失敗例（誤解）

「Sequencer は何でもできる」— **半分間違い**。「選べる」と「選べない」が明確に分かれる。Deposit / Force-include / validity ルールは **必ず守る** → 違反すれば L1 検証失敗 → ブロック reorg。「何でもできる」は UX レベル（順序 + 選択）のみ。

「Pre-confirmation はタダ」— **間違い**。sequencer は inclusion をコミット → L2 reorg があれば tx が canonical chain から外れる可能性 → 設計次第で sequencer slash。**reorg リスクと L1 challenge リスクを負う**。

「FIFO が MEV 中立」— **間違い**。FIFO でも提出 latency 優位 + toxic flow 被害が残る。中立は **設計選択**、FIFO は中立に見えるが実は MEV 抽出経路を作る。

> 🛑 **予測。** Sequencer は ~2s ごとにブロック生成必要。ボトルネックは実行速度（revm）かブロック構築（選択 + 順序付け）？（答え: **ブロック構築 > 実行速度**。revm 自体は 数十 ms で 数千 tx 実行可能。ボトルネックは ① mempool から「最良」tx を選ぶ heuristic + ② gas 推定の精度 + ③ 非同期実行（構築中に新 tx 到着）+ ④ reorg 処理（parent が変わる場合）。op-rbuilder の最適化は **構築アルゴリズム** にあり、実行エンジンにはない。）

## ステップで組み立てる

### Step 1: 3 入力ストリーム

Engine API（コンセンサス）+ Mempool（user tx）+ L1 Inbox（deposit）。

### Step 2: OP Stack 5 順序付けルール

Deposit 先頭 / L1 epoch 帰属 / Sequencer 署名 / Gas limit / Force inclusion。

### Step 3: 「選べる」vs「選べない」を区別

選べる = UX 自由度（tx 選択 + 順序 + epoch + timestamp）/ 選べない = consensus 強制（deposit + force-include + validity）。

### Step 4: build_payload 4 段を辿る

Deposit → Force-inclusion → Mempool（gas limit まで）→ Seal。

### Step 5: MEV 3 立場を判別

Vanilla FIFO / Priority-fee / Builder market。**chain の MEV policy は source code に現れる**。

### Step 6: Pre-confirmation の仕組みとリスク

単一 sequencer の即時署名 → 100ms confirmed → reorg リスク（tx が canonical から外れる、設計次第で slash）。

## 答え合わせ

- **「選べない」を違反すると起きること**: L1 検証失敗（OP Stack 仕様準拠の executor が「ブロック invalid」と判定）→ チェーン分岐 / reorg → 違反ブロックが canonical から削除。**consensus rule は L1 側で強制**、sequencer が回避できない。
- **Pre-conf を発行する sequencer のリスク**: ① L2 reorg（稀でも起こりうる、parent が変わる場合）→ tx が canonical から外れる → ユーザ「confirmed」を見たのに含まれない、② 設計次第で sequencer が slash（pre-conf 違反として on-chain 罰）+ ③ 評判ダメージ。**100ms confirmed の代価**。
- **MEV 3 立場の source code 現れ方**: ① Vanilla FIFO = \`pool.iter().take_until(gas_limit)\`（順序付け hook なし）、② Priority-fee = \`pool.best_pending()\`（gas tip ソート）、③ Builder market = \`extend_builder_with_mev_share\` feature flag + external bundle 受け入れ API。**コードを読む** = MEV policy を読む。

## 合格基準

- 3 入力ストリームを即答できる。
- OP Stack 5 順序付けルールを暗唱できる。
- 「選べる」vs「選べない」を 4 項目ずつ言える。
- build_payload 4 段を辿れる。
- MEV 3 立場を source code パターンで判別できる。

## まとめ（3行）

- op-rbuilder = OP Stack sequencer の本番参照実装、3 入力（Engine API / Mempool / L1 Inbox）+ 5 順序付けルール強制 + build_payload 4 段。
- Sequencer が「選べる」（UX 自由度）と「選べない」（consensus 強制）を区別 — 違反は L1 検証失敗で reorg。
- Pre-confirmation は単一 sequencer のキラー機能（100ms confirmed）だが reorg リスク、MEV 3 立場（Vanilla FIFO / Priority-fee / Builder market）は source code に現れる。
`,
                },
                {
                  title: 'レッスン3 — Fraud proof vs validity (ZK) proof',
                  slug: 'sequencer-fraud-zk-proofs-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 16,
                  xpReward: 45,
                  content: `# レッスン3 — Fraud proof vs validity (ZK) proof

## 問い

Optimism から withdraw する → **7 日**待つ。zkSync から withdraw する → **約 1 時間**待つ。どちらも Ethereum に投稿する EVM rollup。**この 170 倍の差は技術的ではなく、proof パラダイムの選択 — 何が違うのか？**

## 原理（最小モデル）

- **3 つの state root commitment 検証選択肢.** 常に信頼（validium）/ 信頼するがチャレンジ可能（fraud proof）/ 正確性 proof 必須（validity proof）。
- **Fraud proof（optimistic）.** Window 中（OP Stack 7 日）誰でも fraud proof 提出可、有効なら state root 拒否 + chain reorg。Window 過ぎたら最終確定。
- **Validity proof（ZK）.** Sequencer + prover が ZK proof 生成（~分-時間）+ L1 verifier が proof 検証（~100k gas）→ 即時最終確定。
- **コスト trade.** Optimistic = batch コスト安（$1-5）+ withdrawal 7 日 / ZK = batch コスト高（$50-500 proof 検証）+ withdrawal 数時間。
- **OP Stack Cannon の bisection.** 全 L2 を再実行（不可能）ではなく、disputed な 1 MIPS 命令を二分探索で絞り込む + L1 contract が 1 命令だけ再実行 + 正誤判定。
- **SP1 + Reth.** revm 実行を SP1 zkVM の guest program でラップ → revm の state 変更を proof → on-chain 検証。**同じ revm コードが実行と proving 両方で走る**。
- **2025-2026 トレンド.** SP1 / RISC Zero / Polyhedra が Ethereum block proof $1-10 に到達 → ZK rollup が汎用決済で競合可能。

## 具体例

Fraud proof フロー:

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

Validity (ZK) proof フロー:

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

コスト比較:

| 性質 | Optimistic | ZK |
| :--- | :--- | :--- |
| Batch あたり L1 コスト | $1-5（data + state root）| $50-500（proof 検証） |
| Withdrawal の遅延 | 7 日 | 数時間（proving 時間） |
| L2 コスト | Ethereum 同程度 | Ethereum 同程度 |
| Proof 生成 | 無料（チャレンジ時のみ）| 常時、batch あたり $1-100 |
| 代表的実装 | OP Stack、Arbitrum | Polygon zkEVM、zkSync、Scroll |

OP Stack Cannon 流れ:
1. Challenger が「step X が間違っている」と主張
2. **Bisection ゲーム**: 両当事者が単一 MIPS 命令まで二分探索で絞り込む
3. L1 contract がその **1 命令** を実行
4. 命令の正誤を正しく主張した側が勝つ

[\`ethereum-optimism/optimism/cannon\`](https://github.com/ethereum-optimism/optimism/tree/develop/cannon) が codebase。**1 命令まで絞り込むパターンが fraud proof を実現可能にする** — これがなければ L1 に何年分もの L2 履歴を再実行させる羽目になる。

SP1 + Reth 流れ（[\`succinctlabs/sp1\`](https://github.com/succinctlabs/sp1)）:
1. Reth が L2 ブロックを実行（通常の実行）
2. SP1 guest program が revm 実行をラップ
3. SP1 が「revm の主張する state 変更を確かに生成した」proof を出す
4. Proof を on-chain 提出

Tempo 分散化パス予測:
1. **今日**: 中央集権 sequencer、fraud / validity proof なし（Paradigm を信頼）
2. **Phase 2**: optimistic fraud proof 追加（誰でもチャレンジ可能）
3. **Phase 3**: ZK proof（即時 finality）
4. **Phase 4**: 分散化 sequencer + ZK proof

## 失敗例（誤解）

「ZK rollup は optimistic rollup より優れている」— **フレーミング間違い**。**違うトレードオフ**を選んでいる。Optimistic = batch 安 + 7 日待ち / ZK = batch 高 + 即時。高頻度 batch では ZK 高、低頻度では optimistic 安いが finalize 遅。**目的次第**。

「Fraud proof は L2 全体を L1 で再実行」— **不可能**。Cannon は **bisection** で disputed 1 MIPS 命令まで絞り込む → L1 で 1 命令だけ実行。この設計が fraud proof を **実現可能** にする（コスト現実的）。

「2025 年でも ZK proving は実用不可」— **間違い**。SP1 / RISC Zero / Polyhedra が Ethereum block proof $1-10 に到達 → 汎用決済領域でも viable。コストは急速に下落中。

> 🛑 **予測。** Optimism の withdrawal 7 日、zkSync の withdrawal ~1 時間 — 170 倍差を生む構造的理由は？（答え: **proof パラダイム選択**。Optimistic = fraud proof のチャレンジ window（誰でも 7 日以内に「sequencer が嘘」と証明可能）→ window 過ぎないと L1 が「最終」と判定できない → 7 日固定。ZK = proof が即時に正しさを暗号的に証明 → L1 が proof 検証（~ms）→ withdrawal 即時可能。proving 時間は ~時間。**技術ではなくパラダイム選択**、選んだ瞬間に下流 UX 全部が決まる。）

## ステップで組み立てる

### Step 1: 3 検証選択肢を即答

常に信頼 / fraud proof / validity proof。

### Step 2: Fraud proof 5 ステップ

State root 提出 → window 開 → 誰でも fraud proof 提出 → 有効なら拒否 + reorg → window 過ぎたら最終。

### Step 3: Validity proof 5 ステップ

Block 構築 → Prover が ZK proof 生成 → L1 提出 → L1 verifier 検証（~100k gas）→ 即時最終。

### Step 4: コスト trade を計算可能

Optimistic = $1-5 batch + 7 日 / ZK = $50-500 batch + 数時間。**高頻度では ZK 高、低頻度では Optimistic 安いが finalize 遅**。

### Step 5: Cannon の bisection を理解

二分探索で 1 MIPS 命令まで絞り込む → L1 で 1 命令再実行。これがなければ fraud proof 実現不可能。

### Step 6: SP1 + Reth で同 revm 共有

実行（Reth ノード）と proving（SP1 guest）で **同じ revm コード** が走る → コード重複なし + 仕様一致保証。

### Step 7: Tempo 分散化パスを描ける

中央集権 → optimistic → ZK → 分散化 + ZK。各段は信頼最小化を進める。

## 答え合わせ

- **170× 差の構造的理由**: パラダイム選択 = fraud proof（window 7 日固定）vs validity proof（proof で即時 finality）。技術的に Optimism チームが遅いわけではない、**設計選択 + その下流結論**。
- **Optimistic vs ZK の使い分け**: **Optimistic 勝つ場面** = L1 コスト低 + ツーリング成熟 + 汎用 EVM 互換取りやすい。**ZK 勝つ場面** = 即時 finality（7 日待ち回避）+ クロスチェーン相互運用（他 chain が proof 信頼可能）+ コンプライアンス監査用途。
- **Cannon bisection の発明的部分**: 単純な「L2 全部 L1 で再実行」が不可能（コスト無限大）→ 二分探索で disputed 1 命令まで絞り込む → L1 で 1 命令だけ実行 = O(log N) コスト。**fraud proof を実現可能にする設計**、なければ optimistic rollup は理論止まり。

## 合格基準

- 3 検証選択肢を即答できる。
- Fraud proof / Validity proof の 5 ステップを各々辿れる。
- コスト trade を 4 観点で比較できる。
- Cannon の bisection 仕組みを 1 文で説明できる。
- SP1 + Reth の「同 revm 共有」の意味を言える。

## まとめ（3行）

- Fraud proof（optimistic）= window 7 日 + チャレンジで証明 + batch 安、Validity proof（ZK）= 暗号 proof + 即時 + batch 高、170× 差はパラダイム選択。
- Cannon が bisection で disputed 1 MIPS 命令まで絞り込み L1 で再実行 → fraud proof を実現可能、SP1 + Reth は同 revm コードを実行 + proving 両方で共有。
- 2025-2026 トレンドで SP1 / RISC Zero / Polyhedra が Ethereum block proof $1-10 到達 → ZK rollup が汎用決済領域で競合可能。
`,
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
                  title: 'レッスン4 — Reth 上で最小 sequencer を作る',
                  slug: 'sequencer-build-minimal-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 20,
                  xpReward: 55,
                  content: `# レッスン4 — Reth 上で最小 sequencer を作る

## 問い

動く L2 sequencer は **Rust 約 270 行** で書ける。**Reth が難しい部分（revm 実行 + MDBX ストレージ + state 管理 + P2P）をすべて引き受けてくれる** から。Sequencer の仕事は Engine API 経由で Reth を駆動し L1 に投稿することだけ。**その 270 行は何か？**

> 注: 以下のコードは教材向けの概念実装（最小骨格）です。実運用にはエラーハンドリング、型定義、再試行、監視、完全な P2P 実装が追加で必要です。

## 原理（最小モデル）

- **1 プロセスに 4 コンポーネント.** Sequencer loop（Engine API 駆動）+ Mempool（user tx 受け入れ + fee 優先）+ L1 inbox watcher（deposit subscribe + force-include）+ Batcher（定期 L1 投稿）。
- **Sequencer loop 9 ステップ.** Head 取得 → Payload attrs 計算 → forkchoiceUpdated → 500ms 待つ → getPayload → 署名 → newPayload → forkchoiceUpdated（finalize）→ broadcast。
- **Mempool は優先キュー + 検証 + eviction.** Gas tip ソート + timeout / fullness eviction + reorg 時 tx 戻す + sanity 検証。
- **L1 inbox watcher は event subscribe.** Deposit イベント → L2 deposit tx エンコード → mempool で force-include 優先。
- **Batcher は定期投稿.** ~60s ごと → fetch_blocks + zlib + blob チャンク + blob tx 提出。
- **本番落とし穴 6 つ.** Liveness alarm / L1 reorg / L2 reorg / Pre-confirmation / Mempool DOS / DB 成長。

## 具体例

アーキテクチャ:

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

Sequencer loop（コア生成ループ）:

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
}
\`\`\`

Mempool:

\`\`\`rust
use alloy_consensus::TxEnvelope;
use std::sync::{Arc, RwLock};

pub struct Mempool {
    pending: Arc<RwLock<Vec<TxEnvelope>>>,
}

impl Mempool {
    pub fn submit(&self, tx: TxEnvelope) -> eyre::Result<TxHash> {
        validate_tx(&tx)?;
        let hash = tx.hash();
        self.pending.write().unwrap().push(tx);
        Ok(hash)
    }

    pub fn submit_deposit(&self, tx: TxEnvelope) -> eyre::Result<TxHash> {
        // 実装上は通常 tx と同じ受け口に流し込む。
        self.submit(tx)
    }

    pub fn drain_pending(&self, limit: usize) -> Vec<TxEnvelope> {
        let mut pending = self.pending.write().unwrap();
        let len = pending.len().min(limit);
        pending.drain(..len).collect()
    }
}
\`\`\`

L1 inbox watcher:

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

Batcher:

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

ファイル構成:

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

本番落とし穴:

| 落とし穴 | 現実 |
| :--- | :--- |
| Liveness alarm | Monitoring + 自動 failover + ops チーム heartbeat |
| L1 reorg 処理 | L1 reorg で orphan tx を再 batch |
| L2 reorg 処理 | 稀（単一 sequencer = 決定論的）だが起こりうる |
| Pre-confirmation | L1 finality 前のコミット + 嘘 → contract 側処理 |
| Mempool DOS | spam → rate limit + fee escalation |
| Database 成長 | 全ブロック追跡 → pruning 必要 |

## 失敗例（誤解）

「Reth なしで sequencer を書くと数行で済む」— **間違い**。Reth が引き受けている revm 実行 / MDBX / state 管理 / P2P を自前で書くと数万行。270 行は **Reth に乗る** ことで成立する数字。

「mempool は単純な Vec で十分」— **MVP では Yes、本番では No**。本番は ① 優先キュー（gas tip ソート）+ ② timeout / fullness eviction + ③ reorg 時 tx 戻す + ④ DOS 防御。**MVP から始めて足していく**。

「batcher は失敗しない」— **間違い**。L1 ガス急騰 / nonce conflict / blob 容量超過 / L1 RPC エラー、すべて起こる。再試行戦略（exponential backoff + ガス価格 bump）が必要。

> 🛑 **予測。** Sequencer は ~2s ごとに L2 ブロック構築。本番で最初に起きやすい失敗モードは？（ヒント: コンセンサスでも暗号でもない）（答え: **L1 reorg 連鎖**。L1 が短期 reorg → batcher が投稿した batch tx が orphan → 再 batch 必要 + 同時に L1 inbox watcher が観察した deposit イベントが orphan → mempool に偽 deposit が残る → state 不整合。または **mempool DOS** = 攻撃者が無効 tx を spam → mempool 膨らみ + drain が遅くなり ブロック生成が遅れる。両者とも consensus / crypto と無関係、**操作上の堅牢性問題**。）

## ステップで組み立てる

### Step 1: 4 コンポーネントを即答

Sequencer loop / Mempool / L1 inbox watcher / Batcher。

### Step 2: Sequencer loop の 9 ステップ

Head 取得 → Attrs 計算 → forkchoiceUpdated → 500ms 待つ → getPayload → 署名 → newPayload → forkchoiceUpdated（finalize）→ broadcast。

### Step 3: 各コンポーネントの行数感覚

Sequencer 80 / Mempool 50 / L1 watcher 40 / Batcher 50 / main 20 / rpc 30 = ~270 行。

### Step 4: MVP → 本番のステップ

落とし穴 6 つ（Liveness alarm / L1 reorg / L2 reorg / Pre-conf / DOS / DB 成長）を 1 つずつ実装。

### Step 5: なぜ 270 行で済むか

Reth が引き受けるもの: revm 実行 / MDBX / state 管理 / P2P / staged sync / ExEx。**substrate に乗る** = 自分のコードは差分のみ。

### Step 6: Tempo Moderato に当てはめる

Paradigm 製 sequencer は ~300-500 行 + merchant 認可 + 規制 monitoring + payment 優先順序付け。**新規性はアプリケーションロジック、コンセンサスメカニクスではない**。

## 答え合わせ

- **270 行で sequencer が成立する構造的理由**: Reth が引き受けている重い部分（revm + MDBX + state 管理 + P2P + staged sync）= 数万行 → 自分はオーケストレーション層（Engine API 駆動 + mempool + L1 watcher + batcher）= ~270 行。**substrate に乗る差分のみ書く** のが extension model の本質。
- **最初に起きやすい失敗モード**: ① L1 reorg 連鎖（batcher の tx orphan + deposit イベント orphan → mempool 不整合）、② mempool DOS（spam → ブロック生成遅延）、③ DB 成長（pruning なしで disk full）、④ Pre-conf 違反（reorg で約束破る → 評判 / slash）。**コンセンサス / 暗号でなく操作上の堅牢性問題**。
- **Tempo Moderato の構造予測**: ~300-500 行 Reth ベース + ① merchant 認可フィルタ（builder レベル）+ ② 不正検知用緊急停止権限 + ③ payment-tx 優先 + ④ 規制 monitoring。**アプリケーションロジック新規性 + コンセンサスメカニクスは OP Stack 系**。

## 合格基準

- 4 コンポーネントを即答できる。
- Sequencer loop の 9 ステップを順に言える。
- 各コンポーネント行数感覚（270 行合計）を言える。
- 本番落とし穴 6 つを即答できる。
- 「Reth が substrate」の構造的意味を 1 文で説明できる。

## まとめ（3行）

- 最小 sequencer = Rust 約 270 行（Sequencer loop 80 + Mempool 50 + L1 watcher 40 + Batcher 50 + main + rpc）、Reth が重い部分を引き受ける。
- Sequencer loop 9 ステップ（forkchoiceUpdated + 500ms 待つ + getPayload + 署名 + newPayload + finalize + broadcast）= Engine API 駆動 + 4 コンポーネント協調。
- MVP → 本番は 6 落とし穴（Liveness / L1 reorg / L2 reorg / Pre-conf / DOS / DB 成長）を 1 つずつ実装、Tempo Moderato も同パターン + アプリケーションロジック差分。
`,
                },
                {
                  title: 'レッスン5 — 分散化パス（共有 sequencer と MEV 認識 auction）',
                  slug: 'sequencer-decentralization-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 16,
                  xpReward: 45,
                  content: `# レッスン5 — 分散化パス（共有 sequencer と MEV 認識 auction）

## 問い

Optimism が「sequencer を分散化する」と発表したのは 2023 年。3 年経った今でも sequencer は OP Labs の 1 つの箱。Arbitrum も Base も同じ。**ロードマップは本物だが何が妨げているか？ 最終地点として競合する 2 パターンは何か？**

## 原理（最小モデル）

- **5 分散化ステージ.** Single sequencer / Multi-sig sequencer / PoS sequencer set / 共有 sequencer / MEV 認識分散化。線形ではない、スキップ可能。
- **分散化が難しい 5 理由.** Latency（100ms → 200-500ms）+ MEV コーディネーション（誰が取る？）+ Liveness（N オペ調整）+ コスト（N サーバ + slashing infra）+ 経済的セキュリティ（staking + 紛争解決）。
- **PoS sequencer set.** Ethereum 系 PoS を L2 で再現、Polygon zkEVM / Linea が向かう方向。1 → 10-30 オペ、信頼最小化少し進む + 運用複雑性大増。
- **共有 sequencer の賭け.** 1 sequencer set が複数 rollup にサービス、各 L2 は Reth 実行層を保持、順序付けは共有 validator set。
- **共有 sequencer の 4 利益.** クロス rollup atomic 性 / 分散化コスト低減 / MEV 統合 / 速い分散化。
- **共有 sequencer の 4 犠牲.** 主権 / アップグレード速度 / カスタム MEV 戦略 / 運用独立性。
- **本番試み 4 つ.** Espresso（HotStuff 派生、mainnet beta）+ Astria（CometBFT + Reth 統合稼働中）+ Radius（PoS、testnet）+ Anoma（intent 中心）。
- **MEV 認識分散化のエンドゲーム.** L2 版 MEV-Boost、複数 sequencer + builder market + auction + 勝者が sequencer set に payment、未来形。

## 具体例

5 分散化ステージ:

| ステージ | 内容 | 例（2026）|
| :--- | :--- | :--- |
| 1: Single sequencer | 1 オペレータ | 現在の大半の L2（Optimism、Base、Arbitrum）|
| 2: Multi-sig sequencer | M-of-N の信頼できるオペレータ | 一部の L3 |
| 3: PoS sequencer set | Bonded validator が回転 | Polygon zkEVM、Linea（近年）|
| 4: 共有 sequencer | 1 sequencer set が複数 rollup にサービス | Espresso、Astria、Radius |
| 5: MEV 認識分散化 | 入札付き sequencer market | 未来形 — 完全 deploy なし |

PoS sequencer set:

\`\`\`mermaid
flowchart TB
    Stake["バリデータが L2 トークン stake"] --> Set["アクティブ validator set (M-of-N)"]
    Set -->|各ブロック| Leader["指定リーダー (回転)"]
    Leader -->|ブロック構築| Reth["Reth EL"]
    Reth -->|署名ブロック| Others["他バリデータ"]
    Others -->|2f+1 票| Final["ブロック確定"]
    Final -->|定期 batch| L1["L1"]
\`\`\`

共有 sequencer:

\`\`\`mermaid
flowchart TB
    Rollup1["L2 A<br/>(Reth ベース)"] -.->|順序付けを outsource| Shared["共有 Sequencer<br/>(Espresso / Astria)"]
    Rollup2["L2 B<br/>(別 OP Stack)"] -.->|順序付けを outsource| Shared
    Rollup3["L2 C<br/>(別の別)"] -.->|順序付けを outsource| Shared
    Shared -->|署名ブロック| Reth1["Reth EL A"]
    Shared -->|署名ブロック| Reth2["Reth EL B"]
    Shared -->|署名ブロック| Reth3["Reth EL C"]
\`\`\`

共有 sequencer の利益と犠牲:

| 利益 | 犠牲 |
| :--- | :--- |
| クロス rollup atomic 性 | 主権（順序付けを外部依存）|
| 分散化コスト低減（N → 1 set）| アップグレード速度 |
| MEV 統合（クロス rollup MEV 捕捉）| カスタム MEV 戦略 |
| 速い分散化（難問題外部委託）| 運用独立性（共有落ちる → chain 止まる）|

本番試み:

| プロジェクト | タイプ | ステータス（2026）|
| :--- | :--- | :--- |
| Espresso | HotStuff 派生の共有 sequencer | Mainnet beta、複数 L2 採用 |
| Astria | CometBFT ベースの共有 sequencer | Reth 統合とともに稼働中 |
| Radius | PoS の共有 sequencer | Testnet |
| Anoma | Intent 中心（厳密には sequencer でない） | 黎明期 |

Pre-confirmation 複数 sequencer モデル:

- **TACo（Threshold）**: sequencer 過半数のコミット必要
- **Lighthouse 系**: 1 sequencer コミット + 他は finality 前検証
- **Speculative**: sequencer コミット + 違反は fraud proof で処理

## 失敗例（誤解）

「共有 sequencer は明らかに単一 sequencer より優れている」— **フレーミング間違い**。トレードオフ。共有 = 4 利益（atomic 性 / コスト / MEV 統合 / 速い分散化）vs 4 犠牲（主権 / アップグレード / カスタム MEV / 運用独立）。**chain の目的次第**。

「分散化 = 必然」— **間違い**。MEV モデルが分散化と相性悪い場合（Hyperliquid のような orderbook 自体が MEV）、無期限中央集権が合理。**目的によっては分散化しない判断もあり**。

「Pre-confirmation は分散化と両立可能」— **半分間違い**。単一 sequencer の即時署名は単純、複数当事者では投票必要 → 200-500ms。「分散化しつつ速い」は 2026 時点アクティブ R&D 領域、自明解なし。

> 🛑 **予測。** Optimism は 3 年間「sequencer を分散化中」のまま。何が妨げているか？（答え: 5 つの問題の統合 = ① **Latency**（100ms → 200-500ms = UX 退行）、② **MEV コーディネーション**（誰が取る？ ランダム / 入札 / 各設計 trade）、③ **Liveness**（N オペ調整 + ネットワーク不調下 liveness 難）、④ **コスト**（1 サーバ → N サーバ + slashing infra）、⑤ **経済的セキュリティ**（staking + 紛争解決機構）。**個別には解かれているが統合がシステム上の難所**。3 年でも合致解なし。）

## ステップで組み立てる

### Step 1: 5 ステージを即答

Single / Multi-sig / PoS / 共有 / MEV 認識。

### Step 2: 5 難所を即答

Latency / MEV / Liveness / コスト / 経済的セキュリティ。

### Step 3: PoS sequencer set を理解

Ethereum 系 PoS を L2 再現、1 → 10-30 オペ、Polygon zkEVM / Linea が向かう。

### Step 4: 共有 sequencer の 4+4

利益（atomic 性 / コスト低減 / MEV 統合 / 速い分散化）vs 犠牲（主権 / アップグレード / カスタム MEV / 運用独立）。

### Step 5: 本番試み 4 プロジェクト

Espresso（HotStuff）/ Astria（CometBFT + Reth）/ Radius（PoS）/ Anoma（intent）。

### Step 6: Pre-conf 3 モデル

TACo（threshold）/ Lighthouse（1 sequencer + 他検証）/ Speculative（fraud proof）。

### Step 7: chain ごとの分散化パス選択

Tempo（中央 → PoS → 共有 + ZK）/ Hyperliquid（無期限中央 — orderbook MEV）/ Polygon zkEVM（PoS 進行中）。**MEV モデルが分散化方針を規定**。

## 答え合わせ

- **5 難所統合の困難さ**: 個別解決済（PoS / MEV-Boost / Liveness 監視 / クラスタ運用 / staking）だが、**5 つ同時** に統合した場合の interaction が新しい failure mode を生む。例: PoS で MEV 公平分配 → liveness 低下 → コスト増大 → 経済セキュリティ要件変化 → 全部やり直し。**3 年は最低限の時間**。
- **共有 sequencer vs 単一 sequencer の trade**: 共有 = N rollup で 1 sequencer set 共有 → コスト効率 + atomic クロス rollup + MEV 統合。単一 = 主権保持 + アップグレード速度 + カスタム MEV 戦略保持。**「より多くを制御 vs より多くを自分に賭ける」** の選択。chain の目的次第。
- **chain ごとの分散化方針**: Tempo = 決済 chain で MEV 機会少（genuine tx 主体）→ 分散化容易 → 中央 → PoS → 共有 + ZK パス。Hyperliquid = orderbook 自体が MEV → 中央集権無期限 + bridge のみ分散化。**MEV モデルが分散化パスを規定**。

## 合格基準

- 5 分散化ステージを即答できる。
- 5 難所を即答できる。
- 共有 sequencer の 4 利益 + 4 犠牲を言える。
- 本番試み 4 プロジェクトを技術スタックで言える。
- Tempo / Hyperliquid の分散化方針差を MEV モデルで説明できる。

## まとめ（3行）

- 5 分散化ステージ（Single → Multi-sig → PoS → 共有 → MEV 認識）、5 難所（Latency / MEV / Liveness / コスト / 経済セキュリティ）の統合が 3 年でも未解決。
- 共有 sequencer（Espresso / Astria / Radius）= 4 利益（atomic 性 / コスト / MEV 統合 / 速い分散化）vs 4 犠牲（主権 / アップグレード / カスタム MEV / 運用独立）、chain 目的次第。
- MEV モデルが分散化方針を規定 — Tempo（決済、分散化容易）vs Hyperliquid（orderbook MEV、中央集権無期限）が両極端の例。
`,
                },
                {
                  title: 'ファイナルクイズ — Sequencer & Rollup アーキテクチャ',
                  slug: 'sequencer-final-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 2,
                  duration: 12,
                  xpReward: 50,
                  content: `# ファイナルクイズ — Sequencer & Rollup アーキテクチャ

L2 アーキテクトとしての最終チェック。Rollup の出荷、Tempo の sequencer との統合、新規 L2 の設計のいずれにも必要。

レッスン0-5 を通じて: Sequencer 基礎（rollup モデル / 3 役割 / 検閲時経路）/ Data availability（4 モデル / EIP-4844 blob / 圧縮）/ op-rbuilder（OP Stack 5 ルール / 「選べる」vs「選べない」/ MEV 3 立場）/ Fraud proof vs ZK proof（170× 差 / Cannon bisection / SP1 + Reth）/ 最小 sequencer（270 行 / 4 コンポーネント）/ 分散化（5 ステージ / 5 難所 / 共有 sequencer 4+4）の構造的事実を確認する。
`,
                },
              ],
            },
          },
        ],
      },
    },
  });
}
