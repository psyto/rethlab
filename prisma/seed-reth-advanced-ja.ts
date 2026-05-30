import { PrismaClient } from '@prisma/client';

export async function seedRethAdvancedJA(prisma: PrismaClient) {
  const tags = ['reth', 'rust', 'advanced', 'exex', 'staged-sync', 'reth-sdk'];

  await prisma.course.create({
    data: {
      slug: 'reth-advanced-ja',
      title: 'Inside Reth — シンク・拡張・SDK',
      description:
        'Reth の本物のソースを読む — Rust EVM スタックの **DB + 分散システム + 並行性層**。Staged Sync (10 ステージの ETL パイプライン)、ExEx (Execution Extensions — インプロセスのインデクサ・MEV・リスクエンジン用)、Reth SDK (自前の App-chain を組み立てる)。3 つの独立した中級コース (Revm・Reth・Alloy) の 1 つ — `Database` トレイトと Revm 実行モデルへの慣れを前提にする箇所があるので、Inside Revm を先にやることを推奨。',
      difficulty: 'INTERMEDIATE',
      duration: 172,
      xpReward: 470,
      track: 'reth-advanced',
      tags,
      isPublished: true,
      sortOrder: 1230,
      locale: 'ja',
      instructorName: 'RethLab',
      modules: {
        create: [
          {
            title: 'ようこそ',
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: 'レッスン0 — Inside Reth へようこそ',
                  slug: 'reth-advanced-welcome-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 7,
                  xpReward: 15,
                  content: `# レッスン0 — Inside Reth へようこそ

## 問い

これは RethLab の 3 つの独立した中級ティアコースの 1 つ。**どこから始め、何を前提に読むか？**

## 原理（最小モデル）

- **3 中級コースは独立だが順序がある.** Inside Revm（EVM エンジン）→ **Inside Reth**（このコース、Staged Sync + ExEx + SDK）→ Inside Alloy（Provider + Network + Signer）。Inside Revm を先に推奨（\`Database\` trait + Revm 実行モデルが前提）。
- **3 トピックチェーン.** Staged Sync（10 ステージ ETL パイプライン）+ ExEx（インプロセス Rust 注入）+ Reth SDK（自前 App-chain）。各々が「積み上げ → ウォークスルー → クイズ → ドリル」の 4 部構成。
- **前提知識 3 領域.** Revm 内部（\`Database\` trait の形）+ ブロックレベル Ethereum（header / body / receipts、reorg は通常運用）+ 中級 Rust（generics + trait bounds、Arc、async/Future、auto_impl）。

## 具体例

3 中級コースの分担:

| コース | 焦点 |
| :--- | :--- |
| Inside Revm | EVM エンジン内部 — **未受講なら先に推奨** |
| **Inside Reth**（ここ） | Reth: Staged Sync・ExEx・Reth SDK |
| Inside Alloy | Alloy: Provider・Network・Signer |

セットアップ（一度だけ）:

\`\`\`bash
# 1. paradigmxyz/reth を clone
git clone https://github.com/paradigmxyz/reth

# 2. bluealloy/revm を clone（ExEx / SDK レッスンで横断参照）
git clone https://github.com/bluealloy/revm

# 3. 動く cargo ツールチェイン確認
rustc --version

# 4. cargo-expand（両リポの手続きマクロ）
cargo install cargo-expand
\`\`\`

セカンドモニタか分割端末で、レッスンを読みながらソースを参照する形が想定。

## ステップで組み立てる

### Step 1: Inside Revm への自己チェック

- \`Database\` trait の形、Revm が状態を読む仕組み
- \`ExecutionStage\` で \`Stage\` と \`Database\` がどう相互作用するか

不安なら Inside Revm を先に。

### Step 2: ブロックレベル Ethereum

- header / body / receipts、reorg は通常運用
- sender 復元、tx body デコード、receipt の中身

中級への橋渡し でカバー済。

### Step 3: 中級 Rust 語彙

- Generics + trait bounds、\`?Sized\`、\`dyn Trait\` vs \`impl Trait\`
- \`Arc<T>\`、\`Mutex<T>\`、\`RwLock<T>\`
- \`async\` / \`Future\` / \`Stream\` の基礎
- \`auto_impl\` マクロと手続き属性

このコース内の *Rust: ライフタイム・Box・Arc・dyn Trait* レッスンが自己チェック用。

### Step 4: コース構造を把握

3 トピックチェーン（Staged Sync / ExEx / SDK）+ Testing + Bridge to Expert。各チェーンは「buildup → walkthrough → quiz → drill」の 4 段。

## まとめ（3行）

- Inside Reth は RethLab の 3 中級コースの 1 つ、\`Database\` trait と Revm 実行モデルへの慣れを前提（不安なら Inside Revm を先に）。
- 3 トピックチェーン（Staged Sync 10 ステージ ETL / ExEx インプロセス注入 / SDK 自前 App-chain）、各々が「積み上げ → ウォークスルー → クイズ → ドリル」の 4 部構成。
- セットアップ（reth + revm clone + cargo-expand）を済ませて Lesson 1 「\`Stage\` トレイトをステップで組み立てる」から始める。
`,
                },
              ],
            },
          },
          {
            title: 'Reth スタック — シンク・拡張・SDK',
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: 'レッスン1 — \`Stage\` トレイトをステップで組み立てる',
                  slug: 'staged-sync-buildup-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 10,
                  xpReward: 25,
                  content: `# レッスン1 — \`Stage\` トレイトをステップで組み立てる

## 問い

Staged Sync は Reth の背骨。本物の \`Stage\` トレイトは 6 メソッド + 非同期準備チェック + 双方向対称性 + \`auto_impl(Box)\` 属性 = 一度に概念が 6 つ降ってくる。**素朴な同期ループから組み立てると、各要素の理由が見えるか？**

## 原理（最小モデル）

- **素朴な「1 ブロックずつ」が遅い 3 理由.** バッチなし + I/O 償却なし + 並列化なし。修正方針 = ステージに分割、ブロック範囲を端から端まで処理。
- **\`execute\` / \`unwind\` 対称性が要石.** Reorg を特殊ケースではなく通常運用に。**同じトレイト、2 方向**。
- **\`ExecInput\` / \`ExecOutput\` で明示的再開可能.** target + checkpoint で「どこで止め、どこから再開」を表現。\`done: bool\` が戻り値内にあるのは **アトミック呼び出し/戻り値** のため。
- **\`poll_execute_ready\` で非同期準備.** Rust async 形式の poll、ネットワーク I/O 待ちのステージがオーバーライド。pending を返してもパイプライン全体は止まらない。
- **\`post_*_commit\` で opt-in ライフサイクル.** \`ExecutionStage\` が ExEx 通知を流す、Pruner が古いインデックス開放、など。
- **\`#[auto_impl(Box)]\` でヘテロリスト.** \`Vec<Box<dyn Stage>>\` に格納可能、\`Box<S>\` への転送 impl を自動生成。

## 具体例

最終的に組み立てる本物のトレイト:

\`\`\`rust
#[auto_impl::auto_impl(Box)]
pub trait Stage<Provider>: Send {
    fn id(&self) -> StageId;
    fn poll_execute_ready(&mut self, _cx: &mut Context<'_>, _input: ExecInput)
        -> Poll<Result<(), StageError>> { Poll::Ready(Ok(())) }
    fn execute(&mut self, provider: &Provider, input: ExecInput)
        -> Result<ExecOutput, StageError>;
    fn post_execute_commit(&mut self) -> Result<(), StageError> { Ok(()) }
    fn unwind(&mut self, provider: &Provider, input: UnwindInput)
        -> Result<UnwindOutput, StageError>;
    fn post_unwind_commit(&mut self) -> Result<(), StageError> { Ok(()) }
}
\`\`\`

素朴な 1 ブロックずつ:

\`\`\`rust
fn sync_to_tip(client: &mut RethNode) -> Result<(), Error> {
    while let Some(block) = client.next_block()? {
        let header = client.fetch_header(block)?;
        let body   = client.fetch_body(block)?;
        let senders = recover_senders(&body)?;
        let receipts = client.execute(&block, &header, &body)?;
        client.update_state(receipts)?;
        client.update_merkle_root(&block)?;
        client.write_indexes(&block)?;
        client.commit()?;
    }
    Ok(())
}
\`\`\`

ステージのスケッチ:

\`\`\`rust
let stages = vec![
    HeaderStage,       // [N..M] のヘッダーをダウンロード
    BodyStage,         // tx 本体をダウンロード
    SenderRecovery,    // ECDSA sender 復元（並列）
    Execution,         // Revm を走らせ、状態差分を蓄積
    Hashing,           // ハッシュ化されたアカウント/ストレージ変更をソート
    Merkle,            // 範囲の Merkle ルートを計算
    Indexes,           // txhash → (block, index) などのインデックス
    Finish,            // commit + 報告
];

for stage in &mut stages {
    stage.run(blocks_n_to_m)?;
}
\`\`\`

\`Stage\` の最初の試案（メソッド 1 つだけ）:

\`\`\`rust
trait Stage {
    fn execute(&mut self, blocks: BlockRange) -> Result<(), StageError>;
}
\`\`\`

\`unwind\` 追加（reorg は通常運用）:

\`\`\`rust
trait Stage {
    fn execute(&mut self, blocks: BlockRange) -> Result<(), StageError>;
    fn unwind(&mut self, blocks: BlockRange) -> Result<(), StageError>;
}
\`\`\`

入出力 struct:

\`\`\`rust
pub struct ExecInput {
    pub target: Option<BlockNumber>,
    pub checkpoint: Option<StageCheckpoint>,
}
pub struct ExecOutput {
    pub checkpoint: StageCheckpoint,
    pub done: bool,
}
pub struct UnwindInput {
    pub checkpoint: StageCheckpoint,
    pub unwind_to: BlockNumber,
    pub bad_block: Option<BlockNumber>,
}
\`\`\`

非同期準備:

\`\`\`rust
fn poll_execute_ready(&mut self, _cx: &mut Context<'_>, _input: ExecInput)
    -> Poll<Result<(), StageError>>
{
    Poll::Ready(Ok(()))  // デフォルト: 常に準備完了
}
\`\`\`

\`Poll<T>\` の意味: \`Future\` の内部関数が \`Poll::Ready(value)\`（完了）か \`Poll::Pending\`（まだ準備中）を返す。Pending → ランタイムが脇に置き別ステージを poll → 準備完了で起こされ再 poll。**スレッドをブロックせずに「待つ」を表現**。

コミットフック（opt-in）:

\`\`\`rust
fn post_execute_commit(&mut self) -> Result<(), StageError> { Ok(()) }
fn post_unwind_commit(&mut self) -> Result<(), StageError> { Ok(()) }
\`\`\`

具体例: \`ExecutionStage\` が ExEx 通知を流す（subscriber が commit 済みデータを読みに来るので tx body のコミットが先に完了している保証が必要）/ Pruner 系が checkpoint 書き込み後にディスクから古いインデックスを開放。

\`#[auto_impl(Box)]\` の転送:

\`\`\`rust
impl<S: Stage<P>> Stage<P> for Box<S> {
    // 全6メソッドを (**self).method(...) で転送
}
\`\`\`

手書きせず属性で自動生成、\`Vec<Box<dyn Stage<...>>>\` に格納可能に。

## 失敗例（誤解）

「reorg は特殊コードパスで扱う」— **間違い**。他クライアントの形 = コードベース半分が「reorg パス」化、Reth は **同じトレイトに \`unwind\`** で通常運用に。

「\`done\` を \`has_more()\` メソッドで返す」— **間違い**。オーケストレータが 1 ターンで 2 回呼ぶ = checkpoint と has_more が食い違うバグ余地。**戻り値内のフラグでアトミック**。

「同期セットアップを \`exex\` future 内に置く」— **間違い**。Reth が通知バッファ後に init が失敗 → ExEx 健全と誤認しつつ通知積上り。**\`exex_init\` と \`exex\` 分割で「起動できなかった」と「動いた後でクラッシュ」を区別**。

## ステップで組み立てる

### Step 1: 素朴な「1 ブロックずつ」の 3 失敗

バッチなし（200 回 ECDSA セットアップ）+ I/O 償却なし（2000 万 commit）+ 並列化なし。**ステージ分割で全部解決**。

### Step 2: \`execute\` / \`unwind\` 対称性

同じトレイト、2 方向。前進 = \`execute\`、後退 = \`unwind\`。Reorg は通常運用の一部に。

### Step 3: \`ExecInput\` / \`ExecOutput\` で再開可能

target（どこで止め）+ checkpoint（どこから再開）+ done フラグ（戻り値内、アトミック）。

### Step 4: \`poll_execute_ready\` で非同期準備

デフォルト Ready、ネットワーク I/O 待ちステージのみオーバーライド。

### Step 5: \`post_*_commit\` で opt-in ライフサイクル

デフォルト no-op、必要なステージのみ（\`ExecutionStage\` が ExEx 通知、Pruner がディスク開放）。

### Step 6: \`#[auto_impl(Box)]\` で転送自動化

\`Vec<Box<dyn Stage>>\` に格納可能、属性で 6 メソッドの転送 impl を自動生成。

## 答え合わせ

- **\`unwind\` を同トレイトにする利点**: 前進と reorg が **同じ表面** を使う = コードベースが「通常パス + reorg パス」に二分されない。Reth のアーキ要石。
- **\`done\` が戻り値内のフラグである理由**: アトミック呼び出し/戻り値。オーケストレータは 1 ターンで「checkpoint X、また呼ぶ／呼ばない」の 1 フィードバックを得る。別メソッド = 2 回呼びで食い違いバグ。
- **\`poll_execute_ready\` の存在理由**: ネットワーク I/O 待ち（HeaderStage など）が他ステージをブロックしないように pending 返す。常時 Ready のステージはデフォルト使用。

## 合格基準

- 6 メソッドの \`Stage\` トレイトを役割で言える。
- 素朴 1 ブロックずつの 3 失敗（バッチ / I/O / 並列）を即答できる。
- \`execute\` / \`unwind\` 対称性が要石である理由を 1 文で説明できる。
- \`ExecInput\` / \`ExecOutput\` / \`UnwindInput\` の主要フィールドを言える。
- \`#[auto_impl(Box)]\` が省く手書きを言える。

## まとめ（3行）

- \`Stage\` トレイト 6 メソッド = 素朴「1 ブロックずつ」の 3 失敗（バッチ / I/O / 並列）を解決する 6 設計判断の積み重ね。
- \`execute\` / \`unwind\` 対称性 + \`ExecInput\` / \`ExecOutput\` の明示的再開 + \`poll_execute_ready\` の非同期準備 + \`post_*_commit\` の opt-in + \`#[auto_impl(Box)]\` のヘテロリスト。
- 次のレッスンで Reth の本物の 10 ステージパイプラインを巡る、各ステージが何をするか + なぜこの順序か。
`,
                },
                {
                  title: 'レッスン2 — Reth のパイプライン: 10 ステージ、順番付き',
                  slug: 'staged-sync-pipeline-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 10,
                  xpReward: 25,
                  content: `# レッスン2 — Reth のパイプライン: 10 ステージ、順番付き

## 問い

ノードがネットワーク参加 1 分後、10M ブロック分のヘッダーを引っ張った。**1 ブロックずつ処理 = 数週間 vs Reth の Staged Sync = 数時間** — トリックは「1 つの *操作* を数千ブロックにまたがって処理」。10 ステージ、固定順序、**順序は恣意的ではない** — どの制約がどの順序を強いるか？

## 原理（最小モデル）

- **10 ステージのパイプライン.** Header → Body → SenderRecovery → Execution → AccountHashing → StorageHashing → Merkle → TransactionLookup → IndexHistory → Finish。
- **3 制約が順序を規定.** Merkle はハッシング後 + AccountHashing/StorageHashing は理論並列だが順次実行（MDBX 競合 + DAG 複雑性）+ SenderRecovery が並列化の最大勝ち。
- **MerkleStage がハッシング後である理由.** ソート済みハッシュ化キーを消費 → 全ソート集合が必要 → インターリーブ不可。
- **AccountHashing と StorageHashing が並列実行されない理由.** MDBX 書き込み競合 + パイプライン単純性（DAG スケジューラ複雑化）。
- **SenderRecoveryStage が並列化の勝ち.** 巨大バッチサイズ（10-30M 署名）+ データ依存なし + 純粋計算。Rayon で全 CPU コア展開。
- **ExecutionStage は順次の状態依存.** ブロック N のストレージ書き込みがブロック N+1 の読み込みに影響 → Optimistic execution（Block-STM）なしでは並列化困難。
- **100× 高速化の 3 要因.** バッチ化（~10×）+ ステージ内並列化（~10×）+ I/O 償却（~3×）。

## 具体例

10 ステージのフロー:

\`\`\`mermaid
flowchart LR
    H[HeaderStage] --> B[BodyStage]
    B --> S[SenderRecoveryStage]
    S --> E[ExecutionStage]
    E --> AH[AccountHashingStage]
    AH --> SH[StorageHashingStage]
    SH --> M[MerkleStage]
    M --> T[TransactionLookupStage]
    T --> I[IndexHistoryStages]
    I --> F[FinishStage]
\`\`\`

| # | ステージ | 何をする | ホットループ |
| - | -------- | -------- | ------------ |
| 1 | \`HeaderStage\` | ブロックヘッダーをダウンロード | ネットワーク I/O |
| 2 | \`BodyStage\` | tx 本体 + uncle をダウンロード | ネットワーク I/O |
| 3 | \`SenderRecoveryStage\` | 各 tx の sender を ECDSA で復元 | CPU（並列） |
| 4 | \`ExecutionStage\` | Revm を走らせ、状態差分を蓄積 | CPU（Revm） |
| 5 | \`AccountHashingStage\` | アカウント変更をハッシュ化キーでソート | sort + write |
| 6 | \`StorageHashingStage\` | ストレージ変更をハッシュ化キーでソート | sort + write |
| 7 | \`MerkleStage\` | MPT ルートを更新 | tree compute |
| 8 | \`TransactionLookupStage\` | \`tx_hash → (block, index)\` インデックス | sort + write |
| 9 | \`IndexAccount/StorageHistoryStage\` | 履歴アクセスインデックス | sort + write |
| 10 | \`FinishStage\` | 帳簿付け、確定 | なし |

3 順序制約:

**制約 1: \`MerkleStage\` はハッシング後**:
- Merkle はソート済みハッシュ化キーを消費
- AccountHashing/StorageHashing が Merkle 開始前にソート完了 + commit 必要
- インターリーブ不可 = Merkle が処理するブロック範囲について全ソート集合が必要

**制約 2: AccountHashing と StorageHashing は順次実行（理論並列だが）**:
- 両方 ExecutionStage 出力を消費、独立ソート済み変更集合を生成 → 理論並列可能
- なぜ順次? ① MDBX 書き込み競合（並列でロック争い、計算面の利得なし）+ ② パイプライン単純性（並列分岐 = DAG スケジューラ複雑化、利得限界的）

**制約 3: \`SenderRecoveryStage\` が並列化の最大勝ち**:
- ECDSA 復元 = 純粋 CPU、共有状態なし、embarrassingly parallel
- Rayon で全 CPU コア展開
- 巨大バッチサイズ: 各ブロック 100-300 tx × 100K+ ブロック = 1 呼び出しで 10-30M 署名
- データ依存なし + 純粋計算
- \`ExecutionStage\` は順次状態依存（ブロック N のストレージ書き込み → ブロック N+1 の読み込み）→ Optimistic execution（Block-STM）なしでは並列化困難

100× 高速化の内訳:
- **バッチ化** ~10×: Sender 復元 + ハッシング + Merkle ルート計算が 1 呼び出しで数千ブロックに償却
- **ステージ内並列化** ~10×: 特に SenderRecoveryStage の Rayon 全コア展開
- **I/O 償却** ~3×: ディスク書き込みがブロックごとではなくステージ境界の大きなソート済みバッチ
- 掛け合わせ ~300× 理論値、実際は 100-200× に着地（ハードウェア依存）

## 失敗例（誤解）

「Merkle ステージはハッシング中にインターリーブ可能」— **間違い**。Merkle はソート済みハッシュ化キーを消費 → 全ソート集合が必要 → AccountHashing/StorageHashing が完全に commit 完了してから Merkle が始まる。

「並列化 = どこでも勝つ」— **間違い**。AccountHashing/StorageHashing は理論並列だが MDBX 書き込み競合で利得なし + パイプライン複雑化。**並列化は条件付きの勝ち**：embarrassingly parallel + データ依存なし + 純粋計算が揃ったときだけ。

「ExecutionStage を Block-STM で並列化すれば 10×」— **可能だが複雑**。ブロック N のストレージ書き込み → ブロック N+1 の読み込み = 順次状態依存。Block-STM は投機的並列実行 + 衝突再実行で並列化可能だが独自のコンセンサス的複雑性を伴う。

## ステップで組み立てる

### Step 1: 10 ステージを順に言える

Header → Body → SenderRecovery → Execution → AccountHashing → StorageHashing → Merkle → TransactionLookup → IndexHistory → Finish。

### Step 2: 3 順序制約

Merkle はハッシング後 / AccountHashing と StorageHashing は順次（MDBX 競合 + DAG 複雑性）/ SenderRecovery が並列化の最大勝ち。

### Step 3: なぜ SenderRecovery が勝つか

巨大バッチ + データ依存なし + 純粋計算 = Rayon で全コア展開。

### Step 4: ExecutionStage が並列化困難な理由

順次状態依存（ブロック N → N+1）、Block-STM は可能だが複雑。

### Step 5: 100× の 3 要因

バッチ化 ~10× + ステージ内並列化 ~10× + I/O 償却 ~3× = 掛けて ~300×、実際 100-200×。

## 答え合わせ

- **AccountHashing と StorageHashing を並列実行しない理由**: ① **ディスク書き込み競合**（両方 MDBX に書く → ロック争い → 計算面の利得を打ち消す）、② **パイプライン単純性**（並列分岐 = DAG スケジューラが必要 → 複雑性増 vs 利得限界的）。Frontiers 2025 トークがこのトレードオフを論じる。
- **SenderRecovery がパイプラインで特別な理由**: ① 巨大バッチ（100K+ ブロック × 100-300 tx = 10-30M 署名 / 呼び出し）、② データ依存なし（各復元独立）、③ 純粋計算（復元の合間に I/O なし）。Rayon で全コア展開できる embarrassingly parallel の教科書例。
- **100× 高速化の帰属**: バッチ化（~10×）が ECDSA セットアップを 100K+ ブロックに償却 + Merkle ルートを範囲ごとに 1 回（ブロックごとではない）でさらに ~10× + MDBX が効率的に書ける大きなソート済みバッチで ~3× = 掛けて ~300× 理論、ハードウェア依存で実際 100-200×。

## 合格基準

- 10 ステージを順に即答できる。
- 3 順序制約を言える。
- SenderRecovery が並列化の勝ちである 3 理由を言える。
- ExecutionStage が並列化困難な順次状態依存を 1 文で説明できる。
- 100× 高速化を 3 要因に分解できる。

## まとめ（3行）

- 10 ステージパイプライン（Header → Body → SenderRecovery → Execution → AccountHashing → StorageHashing → Merkle → TransactionLookup → IndexHistory → Finish）、固定順序、3 制約が順序を規定。
- SenderRecovery が並列化最大勝ち（embarrassingly parallel + Rayon 全コア）、AccountHashing/StorageHashing は理論並列だが順次（MDBX 競合 + DAG 複雑性）、ExecutionStage は順次状態依存。
- 100× 高速化 = バッチ化 ~10× × ステージ内並列化 ~10× × I/O 償却 ~3× = ~300× 理論、実際 100-200×。
`,
                },
                {
                  title: 'クイズ — Staged Sync',
                  slug: 'staged-sync-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 2,
                  duration: 4,
                  xpReward: 25,
                  content: `# クイズ — Staged Sync

\`Stage\` トレイトの 6 メソッド、10 ステージパイプラインの順序制約、SenderRecovery の並列化、100× 高速化の 3 要因 を確認する。
`,
                  quizQuestions: [
                    {
                      "question": "なぜ `unwind` は別の reorg トレイトやメソッドではなく、`Stage` トレイトの中で `execute` と同じ場所にあるのですか?",
                      "options": [
                        "Reorg はまれなので様式上の選択。",
                        "Rust はトレイトに対称的なメソッドを要求する。",
                        "Reorg は通常運用の一部で、同じトレイトに置くと「範囲を前進」と「範囲を後退」が構造的に同一になり、コードベースから並行する「reorg パス」を取り除ける。",
                        "古い Reth バージョンの後方互換シム。"
                      ],
                      "correctIndex": 2,
                      "explanation": "Reth の設計は reorg を特殊ではなく日常として扱う。同じトレイト → 同じオーケストレータスケジューラ、同じステージ単位ロジック。reorg を別トレイトにすると各ステージを2回実装することになり、オーケストレータが前進パスと後退パスに分裂 — まさに他のクライアントが持っていて Reth が避けるよう作られた形。"
                    },
                    {
                      "question": "なぜ `ExecOutput.done` は別の `has_more()` メソッドではなく、結果の中のフラグとして返されるのですか?",
                      "options": [
                        "様式 — どちらでも同じ。",
                        "別の `has_more()` だとオーケストレータがターンに2回呼ぶ羽目になり（execute、それから has_more）、checkpoint と has_more が食い違うバグの種類を開く。出力の中のフラグなら呼び出しがアトミック — `execute` が状態のスナップショットを1つ返すだけ。",
                        "Rust の型システムが `has_more()` を表現できない。",
                        "非同期キャンセルを可能にするため。"
                      ],
                      "correctIndex": 1,
                      "explanation": "アトミックな呼び出し/戻り値が肝心。オーケストレータはターンごとに正確に1つのフィードバックが欲しい:「チェックポイント X まで進めた; また呼ぶかどうかはあなた次第」。これを2つのメソッドに分けると、その間に何が起きるかについての推論ギャップが開く。"
                    },
                    {
                      "question": "なぜ `MerkleStage` は `AccountHashingStage` と `StorageHashingStage` の *後* に配置され、間に挟まれないのですか?",
                      "options": [
                        "歴史的な事故; 順序は違ってもよい。",
                        "Merkle Patricia Trie のルートには葉がハッシュ化キーでソートされている必要がある。ハッシングステージがそのソートを生成し、Merkle はブロック範囲のソート集合全体を必要とするので、ハッシングは Merkle が始まる前に完了して commit しなければならない。",
                        "`MerkleStage` はハッシングより遅いので、性能のために最後。",
                        "メモリを節約するため。"
                      ],
                      "correctIndex": 1,
                      "explanation": "アルゴリズム上の制約: Merkle ルートの計算はソートされた葉が commit されるまで始められない。ハッシングがプロデューサ、Merkle がコンシューマ。プロデューサが完了し、それからコンシューマが走る。インターリーブすると部分的な Merkle 再計算が強制され、適切なバッチ化よりコストがかかる。"
                    },
                    {
                      "question": "Reth の10ステージのうち、`SenderRecoveryStage` が並列化で最も得をする。なぜ（例えば）`ExecutionStage` ではなく、これなのか?",
                      "options": [
                        "`SenderRecoveryStage` の方が処理する tx 数が多い。",
                        "Sender 復元は embarrassingly parallel: 各 ECDSA 復元が他から独立、共有状態なし。Execution には順次の状態依存がある — ブロック N のストレージ書き込みがブロック N+1 の読み込みに影響 — ので簡単には並列化できない。",
                        "Rayon は `ExecutionStage` の中では動かない。",
                        "`ExecutionStage` は既に1コアを飽和させているので、並列化で得しない。"
                      ],
                      "correctIndex": 1,
                      "explanation": "ECDSA 復元は署名間で独立、全コアに簡単に展開できる。Execution にはコンセンサスで決まった順次の状態依存があり、並列化には optimistic execution（Block-STM など）が必要で独自の複雑さを持つ。Sender 復元は作業の形が Rayon のモデルと完全に合うので、特別なケース。"
                    }
                  ],
                },
                {
                  title: 'レッスン3 — ドリル: \`SenderRecoveryStage\` を端から端まで読む',
                  slug: 'staged-sync-drill-ja',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 12,
                  xpReward: 25,
                  content: `# レッスン3 — ドリル: \`SenderRecoveryStage\` を端から端まで読む

## 問い

読むのはリハーサル、**実装するのが記憶**。\`SenderRecoveryStage\` を 1 行ずつ読み、3 つのアーキ問いに答える。**読み / 計算 / 書きの構造、バッチループ、Rayon 並列化、\`done\` フラグの戻り — どこにあるか？**

## 原理（最小モデル）

- **ターゲットファイル.** \`crates/stages/stages/src/stages/sender_recovery.rs\`。
- **\`execute\` の 3 セクション.** 読み（MDBX から tx エンベロープ取得）+ 計算（Rayon で ECDSA 復元）+ 書き（MDBX に sender 書き戻し + checkpoint 更新）。
- **バッチループ = \`commit_threshold\`.** 全ブロックを一度に処理せず分割 → メモリ有界 + backpressure（\`done: false\` でオーケストレータに「次のバッチ呼んで」）。
- **\`done: true\` の条件.** \`ExecInput.target\` までの全ブロック処理完了。
- **Rayon は内側 ECDSA ループに.** \`chunk.par_iter()\` で各 tx の sender 復元を並列、MDBX 書き込みは順次（シングル writer）。
- **サブ線形スケール.** tx 20 倍でも実時間は 15-18 倍程度（バッチごとのオーバーヘッドが増えた仕事に償却）。
- **\`tracing\` で動作観測.** \`RUST_LOG=reth_stages=debug\` で本物のステージ遷移ログを観察。

## 具体例

セットアップ:

\`\`\`bash
git clone https://github.com/paradigmxyz/reth
cd reth
\`\`\`

ビルド不要（読みのドリル、コンパイルのドリルではない）。

ターゲットファイル: \`crates/stages/stages/src/stages/sender_recovery.rs\`

メソッド本体の 3 セクション:

1. **読み** — 入力範囲のブロックの tx エンベロープを MDBX から取得
2. **計算** — 各 tx の sender を ECDSA で復元（Rayon が登場）
3. **書き** — 復元した sender を MDBX に書き戻し、checkpoint 更新

バッチループの検索キーワード: \`commit_threshold\`、\`chunk\`、\`batch\`。

バッチ化の 2 理由:
- **メモリ**: 1000 万署名分のエンベロープバッファ = 高コスト RAM。バッチで working set 有界に
- **Backpressure**: 各バッチ後に \`done: false\` 返し → オーケストレータが「commit して次に進むか、また呼ぶか」判断

\`commit_threshold\` フィールドがバッチサイズ制御、本番でチューニング可能。

\`done: true\` への切替条件: \`ExecInput.target\` までの全ブロック処理完了 = 「この範囲でこれ以上仕事なし」。それまで \`done: false\` でオーケストレータに「次のバッチでまた呼んで」。

Rayon の並列化（内側 ECDSA 復元ループ）:

\`\`\`rust
chunk.par_iter()
    .map(|tx| recover_signer(tx))
    .collect::<Vec<_>>()
\`\`\`

各 tx の sender 復元は独立 → コア間展開安全 → Rayon が捌く。

スケール分析: tx 20 倍でコア数同じ → 各 Rayon バッチも大きくなる + 実時間は総署名数に概ね線形だがバッチごとオーバーヘッドが償却 → **20 倍の署名でも ~15-18 倍程度の遅さ** にとどまる。

\`tracing\` で観測（任意）:

\`\`\`bash
# reth リポジトリのルートで:
RUST_LOG=reth_stages=debug,reth_stages_api=debug \\
  cargo run --bin reth --release -- node --dev --dev.block-time 5s
\`\`\`

\`--dev\` = 単一ノード devnet、\`--dev.block-time 5s\` = 5 秒ごとブロック生成。ターミナルにステージ遷移ログ（\`headers\`、\`bodies\`、\`sender_recovery\`、\`execution\`、\`hashing\`、\`merkle\`、\`tx_lookup\`）が読んだ順序で。

観察ポイント: 特定ブロック番号で \`sender_recovery\` の開始 → \`commit\` → 完了の流れ。\`execute()\` が **何回呼ばれているか** を数える（バッチサイズ小なら複数回 = \`done: false\` 戻りパターンの実物）。

## 失敗例（誤解）

「Rayon は全ループに適用すれば速くなる」— **間違い**。Rayon が効くのは **独立計算 + 共有状態なし + 純粋関数** が揃ったとき。MDBX 書き込みは順次（シングル writer）なので Rayon 化しても勝てない。ECDSA 復元のみ並列化対象。

「バッチサイズは大きいほど速い」— **間違い**。大きすぎると ① RAM 圧迫、② コミット間隔長すぎでクラッシュ時の損失大、③ backpressure 効かず他ステージが詰まる。**\`commit_threshold\` のデフォルトは経験的最適点**、本番で調整。

「\`done: false\` を返すと次のバッチを自動で実行」— **半分間違い**。オーケストレータが判断して「次のバッチ呼ぶ vs 次のステージに進む」を決める。**\`done: false\` は backpressure シグナル**、自動実行ではない。

## ステップで組み立てる

### Step 1: \`Stage\` 実装の場所を見つける

\`impl<Provider> Stage<Provider> for SenderRecoveryStage\` → \`execute\` メソッド。

### Step 2: 3 セクション特定

読み（MDBX → tx エンベロープ）+ 計算（Rayon → ECDSA）+ 書き（MDBX → sender + checkpoint）。

### Step 3: バッチループ確認

\`commit_threshold\` / \`chunk\` / \`batch\` で検索 → メモリ + backpressure の 2 理由。

### Step 4: Rayon 並列化を辿る

\`par_iter\` / \`rayon::\` 検索 → 内側 ECDSA ループに限定。

### Step 5: \`tracing\` で実動作を観察

\`RUST_LOG=reth_stages=debug\` で dev チェーンを起動 → ステージ遷移ログ + \`execute()\` 呼び出し回数を数える。

## 答え合わせ

- **読み/計算/書きの構造の意味**: パイプライン全体のパターン、このステージ固有ではない。**全ステージが読み（MDBX 範囲取得）+ 計算（ステージ固有処理）+ 書き（MDBX commit）の 3 セクション構成**。
- **\`commit_threshold\` の存在理由**: メモリ有界化（10M 署名バッファ回避）+ Backpressure シグナル（\`done: false\` でオーケストレータに「また呼んで」）。デフォルトは経験的最適、本番でチューニング可能。
- **Rayon が ECDSA に適用され MDBX 書き込みに適用されない理由**: ① ECDSA = embarrassingly parallel（独立 + 純粋 + 共有状態なし）→ Rayon の勝ち、② MDBX 書き込み = シングル writer 制約（並列化不可）+ 順次書き込みで十分速い → Rayon 化しても勝てない。

## 合格基準

- \`SenderRecoveryStage::execute\` の読み / 計算 / 書き 3 セクションを言える。
- \`commit_threshold\` の 2 理由（メモリ + backpressure）を即答できる。
- Rayon が ECDSA に適用される 3 条件を言える。
- \`done: false\` が backpressure シグナルである意味を 1 文で説明できる。
- \`tracing\` で実動作を観測する手順を辿れる。

## まとめ（3行）

- \`SenderRecoveryStage::execute\` = 読み（MDBX → tx）+ 計算（Rayon → ECDSA）+ 書き（MDBX → sender + checkpoint）の 3 セクション。
- \`commit_threshold\` でバッチ化（メモリ有界 + backpressure シグナル）、\`done: false\` がオーケストレータに「次のバッチ呼んで」を伝える。
- Rayon は内側 ECDSA に限定、MDBX 書き込みはシングル writer。\`tracing\` で実動作を観測 + \`execute()\` 呼び出し回数を数えると backpressure パターンが実コードで見える。
`,
                },
                {
                  title: 'レッスン4 — Rust: ライフタイム・Box・Arc・dyn Trait',
                  slug: 'rust-lifetimes-arc-dyn-ja',
                  type: 'CONTENT',
                  sortOrder: 4,
                  duration: 15,
                  xpReward: 30,
                  content: `# レッスン4 — Rust: ライフタイム・Box・Arc・dyn Trait

## 問い

ExEx ソースの最初の 10 行で \`Arc<>\`、\`'static\`、\`dyn Trait\`、\`Box<>\` が立て続けに登場。**Rust の「上級だが実は単純」な 4 機能 — Reth ソースを読むには全部必要、ExEx シグネチャを記憶から書けるか？**

## 原理（最小モデル）

- **\`'a\` = この借用は何のスコープと同じくらい生きるか.** コンパイラへの注釈、多くは推論で省略可能。
- **\`'static\` = プログラム終了まで生きる.** \`&'static str\` リテラル、ExEx のような「いつ終わるか分からないバックグラウンドタスク」に頻出。
- **\`Box<T>\` = ヒープに置く.** 再帰データ構造 / 動的サイズ値（\`dyn Trait\`）/ ムーブで安価。
- **\`Rc<T>\` vs \`Arc<T>\`.** Rc = シングルスレッド参照カウント / Arc = マルチスレッド対応（Atomic 参照カウント）。Reth/ExEx は \`Arc<...>\` だらけ。
- **\`Mutex<T>\` / \`RwLock<T>\` で共有 + 書き換え.** Arc 単独 = 読み取り専用、書き換えるなら Mutex（読み書き排他）or RwLock（読み並列、書き排他）。\`.lock().unwrap()\` は poisoning で panic。
- **\`dyn Trait\` = 動的ディスパッチ.** 実行時メソッド解決、Java/TS interface 風。コストは vtable 経由の呼び出し。
- **\`impl Trait\` vs \`dyn Trait\`.** impl = 静的（コンパイル時）、dyn = 動的（実行時 + Box 必要）。ヘテロコレクションは dyn。
- **ExEx シグネチャの語彙.** \`async fn my_exex<Node: FullNodeComponents>(mut ctx: ExExContext<Node>) -> eyre::Result<()>\`。

## 具体例

ライフタイム \`'a\`:

\`\`\`rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() >= y.len() { x } else { y }
}
\`\`\`

\`'static\` の例:

\`\`\`rust
let s: &'static str = "hello";
\`\`\`

\`tokio::spawn\` に渡すクロージャが \`'static\` を必要とする理由: spawn は future を独立タスクとして駆動、いつ終わるか分からない → クロージャがキャプチャするデータも「いつまでも生き続ける」必要 → \`'static\` 制約。

\`Box<T>\` でヒープ:

\`\`\`rust
let boxed: Box<i64> = Box::new(42);
println!("{}", *boxed);   // 42
\`\`\`

3 用途: 再帰データ構造（\`enum List { Cons(i32, Box<List>), Nil }\` — Box なしだとサイズ無限大でコンパイル不可）+ 動的サイズ値（\`Box<dyn Trait>\`）+ 大きい値の安価ムーブ。

\`Rc\` vs \`Arc\`:

| 型 | 用途 |
| :--- | :--- |
| \`Rc<T>\` | シングルスレッドで参照カウント共有 |
| \`Arc<T>\` | **マルチスレッド対応**（Atomic 参照カウント） |

\`\`\`rust
use std::sync::Arc;

let shared = Arc::new(String::from("hello"));
let clone1 = Arc::clone(&shared);   // 参照カウント+1
let clone2 = Arc::clone(&shared);   // 参照カウント+2

// 別スレッドへ送れる（Arc は Send）
std::thread::spawn(move || println!("{}", clone1));
\`\`\`

**Arc::clone は内部 T をディープコピーしない** → 参照カウントを atomic に +1 するだけ（low コスト）。"A" = Atomic（Compare-And-Swap で thread-safe）。

\`Mutex\` で書き換え:

\`\`\`rust
use std::sync::{Arc, Mutex};

let counter = Arc::new(Mutex::new(0));

let c = Arc::clone(&counter);
std::thread::spawn(move || {
    let mut n = c.lock().unwrap();
    *n += 1;
});
\`\`\`

| 型 | 用途 |
| :--- | :--- |
| \`Mutex\` | 読み書き両方を排他 |
| \`RwLock\` | 読みは並列、書きは排他 |

\`.lock().unwrap()\` の panic = **poisoning**（あるスレッドが lock 中に panic で死ぬ → 後続の lock が panic 連鎖）。Reth のコードに \`.lock().unwrap()\` 至る所、クラッシュタイミングを理解。

\`dyn Trait\`:

\`\`\`rust
trait Greet {
    fn greet(&self);
}

struct En;
struct Ja;
impl Greet for En { fn greet(&self) { println!("Hello"); } }
impl Greet for Ja { fn greet(&self) { println!("こんにちは"); } }

let g: Box<dyn Greet> = if std::env::var("LANG").unwrap_or_default().starts_with("ja") {
    Box::new(Ja)
} else {
    Box::new(En)
};
g.greet();
\`\`\`

\`impl Trait\` vs \`dyn Trait\`:

| 構文 | 意味 |
| :--- | :--- |
| \`impl Trait\` | 静的ディスパッチ（コンパイル時に型確定） |
| \`dyn Trait\` | 動的ディスパッチ（実行時に解決、Box が必要） |

\`Box<dyn Greet>\` のコスト = **vtable 経由**（実行時に「実装の関数ポインタテーブル」を引いてメソッド呼び出し）。\`Box<En>\` は静的に展開、vtable 不要。性能は impl 勝つが、ヘテロコレクション（\`Vec<Box<dyn Trait>>\`）が必要なら dyn。

ExEx シグネチャ:

\`\`\`rust
async fn my_exex<Node: FullNodeComponents>(
    mut ctx: ExExContext<Node>,
) -> eyre::Result<()> {
    while let Some(notification) = ctx.notifications.recv().await {
        // ...
    }
    Ok(())
}
\`\`\`

注釈:
- \`Node: FullNodeComponents\` = トレイト境界
- \`ExExContext<Node>\` = ノードバンドルにジェネリック
- 内部で \`Arc<...>\` でコンポーネント共有
- ライフタイム省略だが \`'static\` 要求

## 失敗例（誤解）

「Rc を別スレッドに送れる」— **間違い**。Rc は \`!Send\`（コンパイラが拒否）、参照カウントが atomic でないので競合データレース可能性。マルチスレッド共有は **Arc 必須**。

「\`.lock().unwrap()\` は OK」— **危険**。poisoning（lock 保持中のスレッドが panic）で連鎖 panic。本番では \`.lock().expect("...")\` でメッセージ + 致命的なら適切なリカバリ。

「\`impl Trait\` が常に dyn より速い」— **半分間違い**。impl は静的ディスパッチで vtable なし → ホットループで速い。ただし dyn は **コードサイズ** が小さい（モノモーフ化爆発回避）+ ヘテロコレクション可能。**用途次第**。

## ステップで組み立てる

### Step 1: ライフタイム 2 種を即答

\`'a\` = スコープ注釈、\`'static\` = プログラム終了まで（バックグラウンドタスク頻出）。

### Step 2: \`Box<T>\` の 3 用途

再帰データ + 動的サイズ + 安価ムーブ。

### Step 3: Rc vs Arc

シングル vs マルチスレッド、Atomic 参照カウント。Reth/ExEx は Arc。

### Step 4: Mutex / RwLock の使い分け

Mutex = 読み書き排他、RwLock = 読み並列 + 書き排他。poisoning に注意。

### Step 5: dyn Trait と vtable

実行時メソッド解決、Box 必要、ヘテロコレクション可能、vtable 経由のコスト。

### Step 6: ExEx シグネチャを記憶

\`async fn my_exex<Node: FullNodeComponents>(mut ctx: ExExContext<Node>) -> eyre::Result<()>\`。

## 答え合わせ

- **\`'static\` がバックグラウンドタスクに頻出する理由**: \`tokio::spawn\` の future はいつ終わるか不明 → クロージャがキャプチャするデータも「いつまでも生き続ける」必要 → \`'static\` 制約。ExEx のような「ノード寿命と同じくらい生きる」タスクで頻出。
- **\`Arc::clone\` の正確なコスト**: 参照カウンタを atomic に +1 するだけ（コンペア & スワップ 1 回）= ナノ秒オーダー。**T のディープコピーは起きない** → 共有が安価。"A" = Atomic（thread-safe な参照カウント増減）。
- **\`dyn Trait\` の vtable コスト**: 実行時に「実装の関数ポインタテーブル」を引く間接呼び出し（branch prediction が効きにくい + キャッシュミス可能性）= ホットループで impl Trait より遅い。ただし **ヘテロコレクション必須**（\`Vec<Box<dyn Stage>>\` など）の場合は dyn 一択。

## 合格基準

- \`'a\` と \`'static\` の差を即答できる。
- \`Box<T>\` の 3 用途を言える。
- Rc / Arc の使い分けと Atomic の意味を言える。
- Mutex / RwLock の使い分けと poisoning を言える。
- impl Trait と dyn Trait の使い分けを言える。
- ExEx シグネチャを記憶から書ける。

## まとめ（3行）

- ライフタイム（\`'a\` / \`'static\`）+ \`Box\`（ヒープ）+ Arc（マルチスレッド共有）+ Mutex/RwLock（書き換え）+ dyn Trait（動的ディスパッチ）= Reth ソース読みの 5 語彙。
- Arc::clone は atomic +1（ナノ秒、ディープコピーなし）、Mutex.lock の panic は poisoning で連鎖、dyn は vtable コストとヘテロコレクション可能のトレードオフ。
- ExEx シグネチャ \`async fn my_exex<Node: FullNodeComponents>(mut ctx: ExExContext<Node>) -> eyre::Result<()>\` を記憶から書けるのが習得証拠。
`,
                },
                {
                  title: 'レッスン5 — ExEx API をステップで組み立てる',
                  slug: 'reth-exex-buildup-ja',
                  type: 'CONTENT',
                  sortOrder: 5,
                  duration: 10,
                  xpReward: 25,
                  content: `# レッスン5 — ExEx API をステップで組み立てる

## 問い

**ExEx**（Execution Extension）= Reth が提供する「実行ループに Rust コードを注入する」仕組み。ノード速度のインデクサ・MEV ボット・リアルタイムリスクエンジンを **チェーン本体と同じプロセス内で** 構築可能。**素朴な「RPC ポーリング」インデクサから組み立てると、API の 4 要素の理由が見えるか？**

## 原理（最小モデル）

- **素朴な RPC ポーリングが劣る 3 理由.** レイテンシ（数秒遅れ）+ アトミック性（Reth コミット → インデクサ間の race）+ Reorg 弱い情報。修正方針 = **同プロセスで動かす**。
- **\`ExExNotification\` の 3 バリアント.** \`ChainCommitted { new }\`（追加）+ \`ChainReorged { old, new }\`（置換、アトミックスワップ）+ \`ChainReverted { old }\`（削除のみ）。
- **3 アーム必須が ExEx #1 バグ防止.** \`ChainReorged\` 欠落 → 派生状態に古いチェーンのデータ phantom 化 + 新チェーンのデータ欠落。
- **\`FinishedHeight\` で「終わった」を Reth に伝える.** Pruner が安全に prune できる最下位を集約。**忘れると Reth がフルアーカイブに変質**。
- **ストリーム pull（コールバックではない）.** \`ctx.notifications.try_next().await\` でハンドラ自分のペース、Reth はハンドラ速度に縛られない。
- **init/run 分割.** \`exex_init\`（同期セットアップ + future 返す）+ \`exex\`（永続 future、ストリーム poll）。Reth が「起動失敗」と「動いた後クラッシュ」を区別可能。
- **\`install_exex\` で複数拡張.** 独立通知ストリーム、独立 \`FinishedHeight\`、互いに干渉しない。Pruner は **最遅の 1 つ** に合わせる。

## 具体例

素朴な RPC ポーリング:

\`\`\`rust
fn main() {
    let rpc = HttpProvider::new("http://localhost:8545");
    let mut last_block = 0;
    loop {
        let head = rpc.get_block_number().unwrap();
        for n in (last_block+1)..=head {
            let block = rpc.get_block(n).unwrap();
            index(block);
        }
        last_block = head;
        sleep(Duration::from_secs(1));
    }
}
\`\`\`

劣る 3 理由:
1. **レイテンシ** — RPC ポーリング = req/res オーバーヘッド、tip から数秒遅れ → MEV / リスク / リアルタイム UX に使えない
2. **アトミック性** — Reth が新ブロックをコミット → インデクサが見るまでに期間 = race condition
3. **Reorg** — ポーリングで \`head = N\` を 2 回見るが中身違うブロック = インデクサが外側で reorg 検出する羽目、しかも Reth より弱い情報

最初の試案（コールバック）:

\`\`\`rust
fn on_new_block<F: Fn(&Block)>(reth: &mut Reth, callback: F) {
    reth.add_listener(callback);
}
\`\`\`

足りないもの 2 つ:
1. **Reorg は append-only ではない** — 「新ブロック追加」だけのコールバックでは「ブロック N のハッシュ X が Y に置換」を表現不能 → 派生状態が静かに壊れる
2. **Reth に「終わった」を伝える方法なし** — N-100,000 のデータを prune してよいか Reth は判断不可

3 バリアントの通知:

\`\`\`rust
enum ExExNotification {
    ChainCommitted { new: Chain },             // canonical ブロック追加
    ChainReorged   { old: Chain, new: Chain }, // old が new に置換
    ChainReverted  { old: Chain },             // 削除（置換なし）
}
\`\`\`

各バリアントの扱い:
- **\`ChainCommitted { new }\`** — 新ブロック状態をインデックスに追記
- **\`ChainReorged { old, new }\`** — \`old\` の状態を undo し、\`new\` の状態を apply（アトミックスワップ）
- **\`ChainReverted { old }\`** — \`old\` の状態を undo して待つ、Reth は新 tip を選んだら後続 \`ChainCommitted\` を送る

\`ChainReorged\` 欠落の失敗モード（**ExEx #1 バグ**）:
- HashMap に **古いチェーン** の tx + canonical チェーンは **新しいチェーン**
- インデックスを後で読むと canonical 上に存在しない tx が返る = **phantom-data バグ**
- さらに悪い: 新しいチェーンの tx はインデックスされていない（\`ChainCommitted\` 未受信、無視した \`ChainReorged\` 受信）

\`FinishedHeight\`:

\`\`\`rust
ctx.events.send(ExExEvent::FinishedHeight(block_number_hash))?;
\`\`\`

\`ctx.events\` = Reth への書き込み専用チャンネル。ブロック終了ごと送信、Reth が全 ExEx の最小値を集約してその下を prune。

**忘れたディスク帰結**: Reth が prune すべき履歴を全保持 → 半年後にディスク使用量複利膨張 → 「無害なインデクサ」がノードをフルアーカイブに変質。

ストリーム pull:

\`\`\`rust
while let Some(notification) = ctx.notifications.try_next().await? {
    // 自分のペースで処理
}
\`\`\`

非同期 + ハンドラのペース + Reth がハンドラ速度に縛られない + イベント順序保証。

init/run 分割:

\`\`\`rust
async fn exex_init<Node: FullNodeComponents>(
    ctx: ExExContext<Node>,
) -> eyre::Result<impl Future<Output = eyre::Result<()>>> {
    // 同期的セットアップはここ
    Ok(exex(ctx))  // 長時間動く future を返す
}
\`\`\`

2 関数:
- **\`exex_init\`** — ノード起動時に 1 度だけ、同期セットアップ、future を返す
- **\`exex\`** — 永続 future、通知ストリームを poll

分割理由: ファイル open 等を \`exex\` に入れると Reth が通知バッファ後に init 失敗 → ExEx 健全と誤認しつつ通知積上り。分割で「起動失敗」と「動いた後クラッシュ」を区別可能。

複数拡張:

\`\`\`rust
.install_exex("MyIndexer", exex_init)
.install_exex("MevWatcher", mev_init)
.install_exex("RiskEngine", risk_init)
\`\`\`

実用的含意:
- **互いに干渉しない** — 各ストリーム独立バッファ
- **Pruner は最遅の 1 つに合わせる** — 全 ExEx の \`FinishedHeight\` の **最小値** より下しか prune しない
- **クラッシュは独立** — 1 つ panic でも他 ExEx + Reth は動き続ける
- **メトリクスは ExEx ごと** — 第 1 引数の名前が \`reth_exex_<name>_*\` メトリクスラベル

## 失敗例（誤解）

「\`ChainCommitted\` だけ扱えば十分」— **間違い**（ExEx #1 バグ）。Reorg 5 ブロック深く → HashMap に phantom data + 新チェーン未インデックス。3 アーム全部必要。

「\`FinishedHeight\` 送信は任意」— **間違い**。忘れると Pruner が止まる → ディスク膨張複利 → 半年後にフルアーカイブ。**毎 commit ごとに必須**。

「同プロセスならパフォーマンスは同じ」— **間違い**。RPC ポーリング = req/res オーバーヘッド + tip から数秒遅れ + race。ExEx = ゼロレイテンシ + アトミック + 構造化 reorg 情報。**MEV / リアルタイムに必要**。

## ステップで組み立てる

### Step 1: RPC ポーリングの 3 失敗

レイテンシ + アトミック性 + Reorg 弱情報 → 同プロセス（ExEx）で全解決。

### Step 2: 3 バリアント通知

ChainCommitted（追加）+ ChainReorged（置換）+ ChainReverted（削除のみ）。**全 3 アーム必須**。

### Step 3: \`FinishedHeight\` の役割

Reth に「終わった」を伝え、Pruner が安全 prune。忘れると ディスク膨張。

### Step 4: ストリーム pull の利点

ハンドラのペース、Reth がブロックされない、順序保証。

### Step 5: init/run 分割の理由

「起動失敗」と「動いた後クラッシュ」を区別可能、ファイル open は \`exex_init\` で。

### Step 6: \`install_exex\` で複数拡張

独立通知 + Pruner は最遅に合わせる + クラッシュ独立 + メトリクス別。

## 答え合わせ

- **3 アーム必須が ExEx #1 バグ防止である理由**: \`ChainReorged\` 欠落 → HashMap に古いチェーン phantom + 新チェーン未インデックス。**任意の通知シーケンスの後、各 Address のカウントが正しい不変条件** を保つには、reorg で old 全 undo → new 全 apply を 1 通知でアトミックに必要。
- **\`FinishedHeight\` を忘れたディスク帰結**: Reth が prune すべき履歴を「ExEx が後で読みたいかも」で全保持 → 半年でディスク複利膨張 → ノードがフルアーカイブに変質。**「無害なインデクサ」の典型本番事故**。
- **クラッシュした ExEx の Pruner への影響**: 落ちた時点の \`FinishedHeight\` で Pruner 固まる → 以降ブロック全部「再起動したら読みたい」扱い → 全履歴蓄積。再起動して \`FinishedHeight\` 進めるまで蓄積継続。

## 合格基準

- 3 バリアント（ChainCommitted / ChainReorged / ChainReverted）を即答できる。
- 3 アーム必須の理由を ExEx #1 バグで説明できる。
- \`FinishedHeight\` の役割と忘却時のディスク帰結を言える。
- init/run 分割の理由を「起動失敗 vs 後でクラッシュ」で説明できる。
- 複数 ExEx の Pruner ルール（最遅に合わせる）を即答できる。

## まとめ（3行）

- ExEx = 同プロセス Rust 注入、RPC ポーリングの 3 失敗（レイテンシ + アトミック性 + Reorg 弱情報）を全解決。
- 3 バリアント通知（ChainCommitted / ChainReorged / ChainReverted）の **全アーム必須**（ExEx #1 バグ防止）+ \`FinishedHeight\` で Pruner 制御（忘却 → ディスク複利膨張）。
- init/run 分割で起動失敗を検出 + \`install_exex\` で複数拡張独立、Pruner は **最遅の 1 つに合わせる**。
`,
                },
                {
                  title: 'レッスン6 — 最小 ExEx を 1 行ずつ読む',
                  slug: 'reth-exex-walkthrough-ja',
                  type: 'CONTENT',
                  sortOrder: 6,
                  duration: 10,
                  xpReward: 25,
                  content: `# レッスン6 — 最小 ExEx を 1 行ずつ読む

## 問い

動く ExEx は Rust 約 40 行で書ける。**Reth を fork せず、別プロセスを立てず、ノードビルダーに渡す関数 1 つ — その各行が前レッスンの組み立てステップにどう対応するか？**

## 原理（最小モデル）

- **40 行で完成する 5 要素.** init/run 分割 + 永続 future + 3 アーム match + \`committed_chain()\` + \`install_exex\` 配線。
- **\`committed_chain()\` は便利アクセサ.** \`ChainCommitted\` と \`ChainReorged\`（new）には \`Some(Chain)\`、\`ChainReverted\` には \`None\`。
- **\`new_payload_for_finalized\` パターン.** commit を伴う通知ごとに \`FinishedHeight\` 送信、忘れるとディスク膨張。
- **本物の ExEx の 4 系統.** backfill（起動時過去ブロック再生）+ in_memory_state（カスタムインデックス保持）+ tracking-state（別 DB 永続化）+ rollup（ExEx フックだけで最小ロールアップ）。

## 具体例

最小 ExEx 全コード（[\`paradigmxyz/reth-exex-examples/minimal\`](https://github.com/paradigmxyz/reth-exex-examples/tree/main/minimal) の \`main.rs\`）:

\`\`\`rust
use futures::{Future, TryStreamExt};
use reth_exex::{ExExContext, ExExEvent, ExExNotification};
use reth_node_api::FullNodeComponents;
use reth_node_ethereum::EthereumNode;
use reth_tracing::tracing::info;

async fn exex_init<Node: FullNodeComponents>(
    ctx: ExExContext<Node>,
) -> eyre::Result<impl Future<Output = eyre::Result<()>>> {
    Ok(exex(ctx))
}

async fn exex<Node: FullNodeComponents>(mut ctx: ExExContext<Node>) -> eyre::Result<()> {
    while let Some(notification) = ctx.notifications.try_next().await? {
        match &notification {
            ExExNotification::ChainCommitted { new } => {
                info!(committed_chain = ?new.range(), "Received commit");
            }
            ExExNotification::ChainReorged { old, new } => {
                info!(from_chain = ?old.range(), to_chain = ?new.range(), "Received reorg");
            }
            ExExNotification::ChainReverted { old } => {
                info!(reverted_chain = ?old.range(), "Received revert");
            }
        };

        if let Some(committed_chain) = notification.committed_chain() {
            ctx.events.send(ExExEvent::FinishedHeight(committed_chain.tip().num_hash()))?;
        }
    }

    Ok(())
}

fn main() -> eyre::Result<()> {
    reth::cli::Cli::parse_args().run(|builder, _| async move {
        let handle = builder
            .node(EthereumNode::default())
            .install_exex("Minimal", exex_init)
            .launch_with_debug_capabilities()
            .await?;

        handle.wait_for_node_exit().await
    })
}
\`\`\`

各部の対応:

**\`exex_init\`（init/run 分割）**: ノード起動時に 1 度、Reth が \`ExExContext\` を渡す（notifications + events + ノードコンポーネントへのハンドル）、長時間動く future を返す。最小版は同期セットアップなし。

**\`exex\`（長時間動く future）**: メインループ、\`ctx.notifications\` は非同期チャンネル、\`try_next()\` で next イベント await（スレッドブロックなし、未完なら他 ExEx + Reth 自体を走らせる）。チャンネル閉じる → \`Ok(None)\` → \`while let\` 抜ける → 関数 \`Ok(())\` 返す。

**3 アーム match**: ChainCommitted / ChainReorged / ChainReverted。**最小版はログのみ、本物は派生状態更新**。3 アーム正しく扱えるかが「動くインデクサ vs phantom-data バグ」を分ける。

**\`committed_chain()\` + \`FinishedHeight\`**:
- \`notification.committed_chain()\` — ChainCommitted と ChainReorged（new）には \`Some(Chain)\`、ChainReverted には \`None\`
- \`ctx.events.send(ExExEvent::FinishedHeight(...))\` — Reth pruner に「このブロックまで処理した」
- **commit を伴う通知ごとに送信、忘却 → ディスク膨張**

**\`main\` 配線**: 通常 Reth ノード + 拡張 1 つ。\`install_exex("Minimal", exex_init)\` が ExEx 固有の唯一の行、複数 install で拡張コンポーズ可能。

本物の ExEx 4 系統:

| 例 | 内容 |
| :--- | :--- |
| backfill | 起動時に過去ブロックを自分のハンドラに再生 |
| in_memory_state | 各ブロックから派生したカスタムインデックス状態を保持 |
| tracking-state | ExEx 内部状態を別 DB に永続化（再起動が安い） |
| rollup | ExEx フックだけで最小ロールアップを実装 |

## 失敗例（誤解）

「\`ChainReorged\` の \`new\` だけで十分」— **間違い**。\`new\` apply 前に \`old\` の状態変更を **undo** 必要、\`new\` だけだと古いチェーンの効果を派生状態から巻き戻せず → 静かに二重カウント or 取りこぼし。

「\`exex_init\` で同期セットアップを書かなくても良い」— **間違い**。\`File::open\` 等を \`exex\` 内に入れると Reth が通知バッファ後 init 失敗 → ExEx 健全と誤認しつつ通知積上り。**\`exex_init\` でセットアップ + future 返す**。

「\`install_exex\` を 1 回で十分」— **不足**。複数 ExEx を install すれば独立通知 + 独立 \`FinishedHeight\` + 互いに干渉なし。1 つ落ちても他は動く。

## ステップで組み立てる

### Step 1: \`exex_init\` の役割

ノード起動時 1 度、同期セットアップ + future 返す。

### Step 2: \`exex\` の永続ループ

\`while let Some(notification) = ctx.notifications.try_next().await?\` の構造、チャンネル閉じれば抜ける。

### Step 3: 3 アーム match の load-bearing 性

本物の ExEx は派生状態更新、3 アーム正しく扱えるかが phantom-data バグ防止。

### Step 4: \`committed_chain()\` の 3 バリアント挙動

ChainCommitted → \`Some(new)\` / ChainReorged → \`Some(new)\` / ChainReverted → \`None\`。

### Step 5: \`FinishedHeight\` の送信タイミング

commit を伴う通知ごと、ディスク膨張を防ぐ。

### Step 6: \`install_exex\` を main で配線

NodeBuilder にチェイン、複数 install で拡張コンポーズ。

## 答え合わせ

- **\`ChainReorged\` で old/new 両方渡される理由**: インデクサは \`new\` を apply する前に \`old\` の状態変更を undo 必要。\`new\` だけだと古いチェーンの効果を派生状態から巻き戻せず、静かに二重カウント or 取りこぼし。**アトミック undo+apply のために両方必要**。
- **\`committed_chain()\` の 3 バリアント挙動**: ChainCommitted と ChainReorged（new）には \`Some(Chain)\`、ChainReverted には \`None\`。「この通知後の canonical 状態は何か」を取り出すアクセサ、\`if let Some(...) = ...\` パターンで \`FinishedHeight\` 送信判定に使う。
- **「ExEx としてのロールアップ」が依存するもの**: finality と data availability を **Reth 本体** に依存。ロールアップは Reth fork ではなく ExEx フックだけで実装可能 = アーキテクチャ上のアンロック。

## 合格基準

- 40 行の最小 ExEx の 5 要素（init/run + 永続 future + 3 アーム + committed_chain + install_exex）を即答できる。
- \`committed_chain()\` の 3 バリアント挙動を言える。
- \`FinishedHeight\` 送信タイミング（commit を伴う通知ごと）を即答できる。
- 本物の ExEx 4 系統（backfill / in_memory_state / tracking-state / rollup）を言える。
- 「ExEx としてのロールアップ」の依存（Reth の finality + DA）を 1 文で説明できる。

## まとめ（3行）

- 40 行の最小 ExEx = init/run 分割 + 永続 future（\`try_next().await\`）+ 3 アーム match + \`committed_chain()\` で \`FinishedHeight\` 送信 + \`install_exex\` 配線。
- \`committed_chain()\` が ChainCommitted/Reorged（new）→ \`Some\`、ChainReverted → \`None\`、これで \`FinishedHeight\` 判定。
- 本物の ExEx 4 系統（backfill / in_memory_state / tracking-state / rollup）、ロールアップは ExEx フックだけで Reth fork なしに実装可能 = アーキテクチャ上のアンロック。
`,
                },
                {
                  title: 'クイズ — ExEx',
                  slug: 'reth-exex-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 7,
                  duration: 4,
                  xpReward: 25,
                  content: `# クイズ — ExEx

ExEx の 3 バリアント通知、\`FinishedHeight\` の役割、init/run 分割、\`install_exex\` の複数拡張パターンを確認する。
`,
                  quizQuestions: [
                    {
                      "question": "ExEx API が単一の `async fn` ではなく init/run の分割（`exex_init` が future を返す）になっているのはなぜですか?",
                      "options": [
                        "Rust が `async` トレイトにセットアップ関数を要求するため。",
                        "古い Reth バージョンの後方互換シム。",
                        "init/run なら長時間の通知ループが始まる前に同期的セットアップ（ファイル開放、DB 初期化）ができる。Reth は「ExEx が起動できなかった」と「ExEx が動いた後でクラッシュした」を区別できる。",
                        "性能 — 分割した関数の方がインライン化される。"
                      ],
                      "correctIndex": 2,
                      "explanation": "単一の `async fn` だとセットアップが future の中に押し込まれる — 「ExEx が起動しなかった」と「ループ中にクラッシュした」が区別不能になる。init/run の分割は Reth に「この拡張は起動して準備完了」のクリーンな確認の瞬間を与える、通知が始まる前に。"
                    },
                    {
                      "question": "ExEx を実装し、`ChainCommitted` だけ扱い、`ChainReorged` と `ChainReverted` を無視する。チェーンが 5 ブロック深く reorg した。派生状態に何が起きる?",
                      "options": [
                        "prune されるべき余分な 5 ブロックが含まれる。",
                        "*古い* チェーン（もう canonical でないセグメント）のデータを含み、*同時に* *新しい* チェーンのデータが欠落（置換されたセグメントには `ChainCommitted` が来ない）。Phantom データと欠落データが同時。",
                        "panic でクラッシュする。",
                        "状態は無事; Reth が新チェーン用に `ChainCommitted` を再送する。"
                      ],
                      "correctIndex": 1,
                      "explanation": "これが ExEx の #1 バグ。`ChainReorged` は `old` と `new` を両方運ぶので、インデクサが `old` の効果を undo して `new` を apply できる。無視すると両半分とも間違う — 古いデータがインデックスされたまま、新しいデータは決してインデックスされない。"
                    },
                    {
                      "question": "`ctx.events.send(ExExEvent::FinishedHeight(N))` は Reth に何を伝えるのですか?",
                      "options": [
                        "「ブロック N より下の通知を送らないで。」",
                        "「ブロック N まで処理した; N より下の歴史的状態は安全に prune してよい。」Reth はインストールされたすべての ExEx の最小値を集約して prune の判断に使う。",
                        "「ブロック N は不正 — 捨てて。」",
                        "「次の再起動でブロック N から再開して。」"
                      ],
                      "correctIndex": 1,
                      "explanation": "`FinishedHeight` なしでは、Reth は ExEx が後で読みたいかもしれないものを安全に prune できない — 保守的にすべてを永久に保持する。このイベントを忘れると「無害なインデクサ」が偶然のアーカイブノードに変わる。"
                    },
                    {
                      "question": "ExEx ベースのインデクサは別プロセスで RPC をポーリングするインデクサより速い。*主な* アーキテクチャ的理由は?",
                      "options": [
                        "インデクサが速い CPU で動いている。",
                        "同じプロセス、I/O ラウンドトリップなし。Reth がブロックをコミットした瞬間に ExEx が通知を受け取る — RPC リクエスト/レスポンスもポーリング間隔もアトミック性のギャップもない。さらに Reth が既に計算したフルチェーンコンテキスト（reorg 構造を含む）。",
                        "ExEx は EVM 実行ステップをスキップする。",
                        "RPC にはレートリミッターがある; ExEx にはない。"
                      ],
                      "correctIndex": 1,
                      "explanation": "アーキテクチャ的アンロックは co-location（同居）。RPC ポーリング = 最良で〜1 秒のラグ、負荷時はもっと長く、reorg は二次情報。ExEx = ゼロラグ、フルコンテキスト、IPC なし。"
                    }
                  ],
                },
                {
                  title: 'レッスン7 — ドリル: reorg-safe なインデクサを作る',
                  slug: 'reth-exex-drill-ja',
                  type: 'CONTENT',
                  sortOrder: 8,
                  duration: 12,
                  xpReward: 25,
                  content: `# レッスン7 — ドリル: reorg-safe なインデクサを作る

## 問い

読むのはリハーサル、**実装するのが記憶**。reorg を正しく乗り越える HashMap インデクサを書く。**holesky で reorg を実際に観測、tx_count の不変条件を保つには？**

## 原理（最小モデル）

- **セットアップ.** \`reth-exex-examples\` を clone + minimal で build。
- **holesky テストネット.** 初期同期速い + reorg 頻度高い（ハッシュパワー低、contested fork 多い）= 学習に最適。
- **トランザクションカウンター追加.** \`ChainCommitted\` で tx 数を sum + log。
- **HashMap インデックスの reorg-safe 設計.** ChainCommitted += / ChainReorged old -= then new += / ChainReverted -=。
- **3 アーム不変条件.** 各 Address のカウント = (canonical チェーンで送られた tx 数) − (commit 後 revert されたセグメントで送られた tx 数)。
- **\`ChainReorged\` の操作順序.** old を先に undo してから new を apply（Reth が reorg を処理する時系列順と一致）。
- **観察ポイント.** Reorg ログ前後で高 tx アドレスの \`tx_count\` をスポットチェック、古い/新しいチェーンセグメントの差と一致確認。

## 具体例

セットアップ:

\`\`\`bash
git clone https://github.com/paradigmxyz/reth-exex-examples
cd reth-exex-examples/minimal
cargo build
\`\`\`

holesky で実行:

\`\`\`bash
cargo run -- node --chain holesky
\`\`\`

トランザクションカウンター（\`ChainCommitted\` アーム拡張）:

\`\`\`rust
ExExNotification::ChainCommitted { new } => {
    let total: usize = new.blocks().values()
        .map(|b| b.body.transactions.len())
        .sum();
    info!(committed_chain = ?new.range(), tx_count = total, "Received commit");
}
\`\`\`

実測値: holesky 5-20 tx/block（たまに 0）、mainnet 100-300（混雑度次第）= **ゼロレイテンシで本物のチェーンデータ読み**。

Reorg-safe HashMap（フル実装）:

\`\`\`rust
use std::collections::HashMap;
use alloy_primitives::Address;

let mut tx_count: HashMap<Address, u64> = HashMap::new();

while let Some(notification) = ctx.notifications.try_next().await? {
    match &notification {
        ExExNotification::ChainCommitted { new } => {
            for (_, block) in new.blocks() {
                for tx in block.body.transactions() {
                    *tx_count.entry(tx.signer()).or_insert(0) += 1;
                }
            }
        }
        ExExNotification::ChainReorged { old, new } => {
            // old を undo してから new を apply — 順序が大事
            for (_, block) in old.blocks() {
                for tx in block.body.transactions() {
                    *tx_count.entry(tx.signer()).or_insert(0) -= 1;
                }
            }
            for (_, block) in new.blocks() {
                for tx in block.body.transactions() {
                    *tx_count.entry(tx.signer()).or_insert(0) += 1;
                }
            }
        }
        ExExNotification::ChainReverted { old } => {
            // old を undo、置換なし
            for (_, block) in old.blocks() {
                for tx in block.body.transactions() {
                    *tx_count.entry(tx.signer()).or_insert(0) -= 1;
                }
            }
        }
    };

    if let Some(committed_chain) = notification.committed_chain() {
        ctx.events.send(ExExEvent::FinishedHeight(committed_chain.tip().num_hash()))?;
    }
}
\`\`\`

3 アーム不変条件: 各 Address のカウント = (canonical で送られた tx 数) − (commit 後 revert で送られた tx 数)。

操作順序が重要: \`old\` を先に undo してから \`new\` を apply（Reth の reorg 時系列順と一致）。\`new\` 先 + \`old\` 後 の場合、共通プレフィックスがあると一旦二重カウント → \`old\` undo で復旧、ただし慣習は old-first。

Reorg 検証手順:
1. \`from_chain\` / \`to_chain\` 範囲メモ
2. Reorg ログ前に高 tx アドレスの \`tx_count\` スポットチェック → 記録
3. Reorg ログ後に再記録
4. 手動確認: 古い/新しいチェーンセグメントの差と一致するか

一致すれば **本番グレードインデクサ**（goldsky、The Graph 等が出荷するコード）相当。

## 失敗例（誤解）

「\`ChainReverted\` で \`-=\` しなくても \`ChainCommitted\` で正しくなる」— **間違い**。Revert された tx は **canonical ではなくなった**、\`-=\` 忘れるとカウント永久膨張。

「順序は \`new\` 先で良い」— **危険**。共通プレフィックスがある場合、\`new\` 先 apply で一旦二重カウント → \`old\` undo で復旧、ただし中間状態が不正。**Reth と同じ time-line 順（old-first）が慣習**。

「再起動後にカウントは再構築できる」— **半分間違い**。在庫が永続化されていないと再起動で全消失 → 再 sync 必要。tracking-state パターン（別 DB 永続化）を見る。

## ステップで組み立てる

### Step 1: セットアップ

\`reth-exex-examples\` clone + minimal build。

### Step 2: holesky で実行

reorg 頻度が高い + 初期同期速い = 学習に最適。

### Step 3: tx カウンター追加

\`ChainCommitted\` で sum + log、実測値を確認（holesky 5-20、mainnet 100-300）。

### Step 4: 3 アーム HashMap 実装

ChainCommitted += / ChainReorged old -= then new += / ChainReverted -=。

### Step 5: 不変条件を理解

各 Address のカウント = canonical で送られた tx 数 − revert されたセグメントで送られた tx 数。

### Step 6: 操作順序を守る

\`old\` を先に undo、\`new\` を後で apply（Reth の reorg 時系列順）。

### Step 7: Reorg を検証

ログ前後でスポットチェック、差と一致確認 → 一致すれば本番グレード。

## 答え合わせ

- **\`ChainReorged\` で old/new を同通知で扱う論理的根拠**: アトミック swap、reorg を 1 トランザクションとして扱う。**old を先に undo + new を後で apply** で 1 通知の処理を Reth の time-line 順と一致させる。\`new\` 先だと共通プレフィックスで一旦二重カウント。
- **3 アームの不変条件**: 各 Address のカウント = (canonical で送られた tx 数) − (commit 後 revert で送られた tx 数)。**revert アームで \`-=\` を忘れると永久膨張、reorg アームで \`-=\` を忘れると古い + 新しいチェーンの和**になる。
- **本番グレードの定義**: holesky で実際の reorg を検知 + 前後の \`tx_count\` 差が古い/新しいチェーンセグメントの差と一致 → goldsky や The Graph が出荷するコード相当。**MEV ボット、リアルタイムリスクエンジン、ロールアップも同じ道具で実装可能**。

## 合格基準

- holesky で reorg 観測の理由（頻度高 + 同期速い）を即答できる。
- 3 アーム HashMap の += / -= パターンを書ける。
- 不変条件（canonical − revert）を 1 文で言える。
- 操作順序（old undo first）の理由を Reth time-line で説明できる。
- Reorg 検証手順（前後スポットチェック）を辿れる。

## まとめ（3行）

- holesky で 3 アーム HashMap インデクサ実装（ChainCommitted += / ChainReorged old -= then new += / ChainReverted -=）、不変条件 = canonical − revert。
- 操作順序は old を先に undo + new を後で apply（Reth time-line 順）、\`new\` 先だと共通プレフィックスで二重カウント可能。
- Reorg 観測 + スポットチェックで一致確認 → 本番グレード（goldsky / The Graph 相当）、MEV / リスクエンジン / ロールアップも同じ道具で実装。
`,
                },
                {
                  title: 'レッスン8 — ノードビルダー API をステップで組み立てる',
                  slug: 'reth-sdk-buildup-ja',
                  type: 'CONTENT',
                  sortOrder: 9,
                  duration: 10,
                  xpReward: 25,
                  content: `# レッスン8 — ノードビルダー API をステップで組み立てる

## 問い

ExEx は既存 Ethereum ノードを拡張。**Reth SDK** はコンポーネントを組み立てて自前の App-chain を Rust で構築可能。「purpose-built EVM L1」thesis がコンパイル可能なバイナリに化けるのはここ。**\`with_types\` → \`with_components\` → \`with_add_ons\` → \`launch\` の理由は？**

## 原理（最小モデル）

- **素朴な「Reth 全体 fork」が破滅的 3 理由.** アップストリーム分岐（毎週 update、rebase 地獄）+ 抱え込みたくない表面積（1 サブシステム変えたいのに 200K 行抱え込み）+ レビューコスト（監査 / セキュリティ / 規制が新クライアント扱い）。
- **修正方針 = fork ではなく組み立てる.** 実際に変えたいサブシステムだけ上書き、残りは Reth をライブラリ依存。
- **6 差し替えポイント.** pool / network / executor / consensus / payload / add_ons。
- **Builder パターンが「変えるものだけ書く」を実現.** struct 渡しは型推論早々に崩れる + all-or-nothing 強制 → 流れるようなチェーン呼び出しに。
- **3 軸ビルダー.** types（block/tx/header レイアウト、他の全てを支える）→ components（ランタイムサブシステム）→ add_ons（RPC、ExEx）。
- **\`with_types\` 先頭の理由.** 型が他全てを支える load-bearing、未確定型でコンポーネント指定すると静かに混乱 or コンパイラと戦う。
- **\`with_components\` で base.method() チェイン.** EthereumNode::components() 取って .pool(...) / .network(...) で個別上書き、デフォルトは見えないまま。
- **\`launch\` の本物の仕事.** MDBX 開く + P2P 起動 + sync Tokio タスク spawn + RPC サーバー配線。

## 具体例

最終形:

\`\`\`rust
fn main() {
    Cli::parse_args()
        .run(async move |builder, _| {
            let handle = builder
                .with_types::<EthereumNode>()
                .with_components(
                    EthereumNode::components().pool(CustomPoolBuilder::default())
                )
                .with_add_ons(EthereumAddOns::default())
                .launch()
                .await?;
            handle.wait_for_node_exit().await
        })
        .unwrap();
}
\`\`\`

素朴な fork:

\`\`\`bash
git clone https://github.com/paradigmxyz/reth my-chain
cd my-chain
# 好きなように crates/ を編集
cargo build
\`\`\`

破滅的 3 理由:
1. **アップストリーム分岐** — Paradigm 毎週リリース、fork は rebase 地獄 → 半年で安全アップグレード不可
2. **抱え込みたくない表面積** — 1 サブシステム変えたくて fork したのに **全て** 抱え込み（読んだことないコードのバグ、セキュリティパッチ、決して触らないがビルドし続けるモジュール）
3. **レビューコスト** — レビュアーには変更 50 行と未変更 200K 行の区別不可 → 監査 / セキュリティ会社 / 規制当局が新クライアント扱い

6 差し替えポイント:

| サブシステム | 何を変えるか | 本番例 |
| :--- | :--- | :--- |
| **Pool** | 受付ルール、優先レーン | Tempo は payments tx を gas 価格より優先するレーン |
| **Network** | ピアポリシー、プライベートサブネット | バリデータが互いを優先する private gossip subnet |
| **Executor** | カスタム Opcode、precompile、ガス表 | Hyperliquid は HyperBFT 専用 precompile 追加 |
| **Consensus** | PoS → HyperBFT、PoA、Tendermint | Hyperliquid HyperBFT、Berachain Polaris |
| **Payload** | ブロックビルダー | MEV-aware、アプリ固有順序（Tempo payments-first） |
| **Add-ons** | カスタム JSON-RPC、ExEx | tidx の \`tidx_*\` namespace、検閲耐性監視 ExEx |

残り（sync オーケストレータ / MDBX スキーマ / ヘッダーダウンロード / sender 復元 / ハッシングステージ）は Reth デフォルト。

最初の試案（struct 渡し）の 2 UX 問題:

\`\`\`rust
struct NodeConfig<P, N, E, C, Pl> {
    pool: P,
    network: N,
    executor: E,
    consensus: C,
    payload: Pl,
}
\`\`\`

1. **毎回全フィールド書く羽目** — カスタマイズしていないものまで（all-or-nothing 強制）
2. **型推論早々に崩れる** — 各コンポーネントが独自ジェネリックパラメータ、単一 struct にまとめると推論効かず行き詰まった型シグネチャ

Builder パターン:

\`\`\`rust
let handle = builder
    .with_pool(CustomPool::default())
    // 残りはスキップ — デフォルト
    .launch()
    .await?;
\`\`\`

各 \`with_*\` が新しいビルダー型を返す、デフォルトは見えないまま。

3 軸ビルダー:
- **types**: block/tx/header レイアウト、engine API
- **components**: ランタイムサブシステム
- **add-ons**: RPC、ExEx

\`with_types::<EthereumNode>()\` が先頭の理由: 型が他全てを支える。tx 構造を変えると pool/executor/payload/network 全てがその新 tx 型を使う必要 → SDK は **型バンドルを先に commit** させる。

\`with_components\` の base.method() チェイン:

\`\`\`rust
.with_components(
    EthereumNode::components()
        .pool(CustomPoolBuilder::default())   // 上書き
        // .network はデフォルト
        // .executor はデフォルト
        // .consensus はデフォルト
        // .payload はデフォルト
)
\`\`\`

\`PoolBuilder\` トレイト（おおよそ）:

\`\`\`rust
trait PoolBuilder<Node>: Send {
    type Pool;
    fn build_pool(self, ctx: &BuilderContext<Node>)
        -> impl Future<Output = eyre::Result<Self::Pool>>;
}
\`\`\`

**コンポーネントは事前に構築されて渡されるのではなく、遅延ビルドされる** — 前のビルダーステップが組み立てたコンテキストを必要とするから。同じ形が 6 ビルダー全部に。

\`with_add_ons\` + \`launch\`:

\`\`\`rust
.with_add_ons(EthereumAddOns::default())
.launch()
\`\`\`

Add-ons = load-bearing でない（RPC namespace、engine API 拡張、ExEx インストール）。\`.launch()\` で本物の仕事: MDBX 開く + P2P 起動 + sync Tokio タスク spawn + RPC サーバー配線 → \`NodeHandle\` 返す。

## 失敗例（誤解）

「fork してから時間と共に rebase で追従」— **間違い**。半年で rebase 不可能化、Paradigm の毎週 update 取り込み困難 → 安全アップグレード不可。**fork は何年も運用するチェーンに通用しない**。

「\`with_components\` を先に書いてもよい」— **間違い**。型が未確定でコンポーネント指定 → ① 各コンポーネントビルダーを未確定型でジェネリックにする（コンパイラと戦う）か、② \`.with_components\` 引数で型を暗黙 commit（静かに混乱）。**\`with_types\` を先頭に置く**。

「全フィールド明示が安全」— **逆効果**。デフォルトを書くと Reth のライブラリバージョンアップで型が変わるたびに全ファイル書き直し。**変えるものだけ書く + デフォルトは暗黙据え置き**。

## ステップで組み立てる

### Step 1: fork の 3 破滅理由

アップストリーム分岐 / 抱え込み表面積 / レビューコスト → 何年も運用に通用しない。

### Step 2: 6 差し替えポイント

pool / network / executor / consensus / payload / add_ons。

### Step 3: Builder パターンの 2 UX 解決

毎回全フィールド書かない + 型推論崩れない。

### Step 4: 3 軸ビルダー

types（先頭、load-bearing）→ components（ランタイム）→ add_ons（RPC、ExEx）。

### Step 5: \`with_components\` の base.method() パターン

\`EthereumNode::components()\` で base、\`.pool(CustomBuilder)\` で上書き、デフォルトは暗黙。

### Step 6: \`PoolBuilder\` トレイトの遅延ビルド

\`build_pool(self, ctx)\` でコンテキスト渡し、6 ビルダー全部に同じ形。

### Step 7: \`launch\` の本物の仕事

MDBX 開く + P2P 起動 + sync Tokio タスク spawn + RPC サーバー配線。

## 答え合わせ

- **fork が「何年も運用するチェーン」に通用しない理由**: ① Paradigm の毎週 update を rebase で追従不可能（半年で限界）、② 1 サブシステム変えたいのに 200K 行抱え込み、③ 監査 / セキュリティ / 規制が新クライアント扱い → コスト爆発。
- **\`with_types::<EthereumNode>()\` が先頭である理由**: 型が他全てを支える load-bearing。tx 構造を変えると pool/executor/payload/network 全てがその新型を使う必要、SDK は型バンドルを **先に commit** させてチェーン残りを型認識可能にする。
- **「変えるものだけ書く + デフォルトは暗黙」が成立する仕組み**: \`EthereumNode::components()\` が base、\`.pool(CustomBuilder)\` が個別上書き。Reth のライブラリバージョンアップで残り 5 のデフォルト型が変わってもユーザコードは触れない → **80% 継承 + 20% カスタム** で長期メンテ可能。

## 合格基準

- fork の 3 破滅理由を即答できる。
- 6 差し替えポイント（pool / network / executor / consensus / payload / add_ons）を言える。
- Builder パターンの 2 UX 解決を即答できる。
- 3 軸ビルダー（types / components / add_ons）の順序と理由を言える。
- \`launch\` の 4 起動仕事を言える。

## まとめ（3行）

- 「fork ではなく組み立てる」= 何年も運用するチェーンの保守可能な唯一の物語、6 差し替えポイント（pool / network / executor / consensus / payload / add_ons）+ 残りは Reth デフォルト。
- 3 軸ビルダー（types 先頭 = load-bearing / components ランタイム / add_ons RPC + ExEx）+ Builder パターンで「変えるものだけ書く + デフォルト暗黙」。
- \`launch\` が MDBX + P2P + sync Tokio + RPC を配線、Paradigm の毎週 update が 80% に流れ込み + あなたの fork 由来表面積は 20% に留まる。
`,
                },
                {
                  title: 'レッスン9 — 6 コンポーネント — それぞれが何を解放するか',
                  slug: 'reth-sdk-components-ja',
                  type: 'CONTENT',
                  sortOrder: 10,
                  duration: 10,
                  xpReward: 25,
                  content: `# レッスン9 — 6 コンポーネント — それぞれが何を解放するか

## 問い

Tempo / Berachain / MegaETH / Hyperliquid — **どれも Reth を fork していない**。Reth の 6 コンポーネントのうち数個だけ差し替え、残りを継承。**SDK の最大の売り = Rust EVM クライアントを書き直すのではなく、自分の thesis に合う部分だけ差し替える — 各コンポーネントが何を解放するか？**

## 原理（最小モデル）

- **fork なしの経験的証拠.** Tempo（0 ahead, 1374 behind） / MegaETH（0 ahead, 7666 behind） / Berachain（独立 repo、fork ですらない）。
- **6 コンポーネント.** pool（受付・順序付け・追い出し）/ network（P2P・ピア）/ executor（EVM / Opcode / ガス）/ consensus（ブロック検証ルール）/ payload（ブロック構築）/ add_ons（RPC + ExEx）。
- **Hyperliquid の差し替え.** consensus（HyperBFT）+ executor（オーダーブック結合）+ pool（高頻度 perp 更新）。
- **Tempo の差し替え.** pool（payments 優先レーン）+ payload（payment finality）+ add_ons（payment RPC + MPP 統合）。**consensus / executor は Reth デフォルト**。
- **Berachain（bera-reth）の差し替え.** consensus（Proof of Liquidity、流動性 stake）+ executor（PoL 報酬分配）+ add_ons（DEX-aware RPC）。
- **MegaETH の深いカスタマイズ.** executor（JIT/AOT EVM、revmc ベース）+ storage（MDBX → SALT）+ バリデータ別バイナリ（stateless-validator）= **それでも fork なし**。
- **Thesis → コンポーネント差し替えマッピング.** チェーンの thesis 1 文で 1-3 コンポーネント差し替えに対応。
- **不変の 80%.** sync オーケストレータ + MDBX スキーマ + ヘッダーダウンロード + sender 復元 + ハッシング + Merkle + インデックス + JSON-RPC ランタイム + engine API + Tokio + tracing + メトリクス = 価値の大半。

## 具体例

経験的証拠:

| Chain | Reth との関係 | 証拠 |
| :--- | :--- | :--- |
| Tempo | 空 fork | [\`tempoxyz/reth\`](https://github.com/tempoxyz/reth): upstream に対して 0 commits ahead, 1374 behind |
| MegaETH | 空 fork | [\`megaeth-labs/reth\`](https://github.com/megaeth-labs/reth): upstream に対して 0 commits ahead, 7666 behind |
| Berachain | fork ですらない | [\`berachain/bera-reth\`](https://github.com/berachain/bera-reth): Reth crate を依存として使う独立 repo |

builder フロー:

\`\`\`mermaid
flowchart TB
    Builder["builder · .with_types"] --> Comps[".with_components"]
    Comps --> Pool["pool — 受付ルール"]
    Comps --> Net["network — P2P"]
    Comps --> Exec["executor — EVM/Opcode/ガス"]
    Comps --> Cons["consensus — PoS / HyperBFT 等"]
    Comps --> Payload["payload — ブロック構築"]
    Comps --> AddOns["add-ons — RPC + ExEx"]
    AddOns --> Launch[".launch — あなたのチェーン"]
\`\`\`

6 コンポーネント表:

| コンポーネント | 差し替える対象 | 解放されるもの |
| :--- | :--- | :--- |
| \`pool\` | tx 受付・順序付け・追い出し | 優先レーン、payments-first 順序、アプリ固有 MEV ルール |
| \`network\` | P2P トランスポート、ピアポリシー | プライベートサブネット、許可リスト、独自プロトコル |
| \`executor\` | EVM 設定 | **カスタム Opcode**、カスタム precompile、カスタムガス表 |
| \`consensus\` | ブロック検証ルール | PoS → HyperBFT、PoA、Tendermint、何でも |
| \`payload\` | ブロックビルダー | MEV-aware 順序、アプリ固有バッチング |
| \`add_ons\` | ランタイム外拡張 | カスタム JSON-RPC namespace、ExEx インストール |

それぞれに \`*Builder\` トレイト（\`PoolBuilder\`、\`NetworkBuilder\` 等）、SDK が \`.launch()\` 中に呼び出してサブシステム構築。

**Hyperliquid HyperEVM の差し替え**:
- \`consensus\` — Ethereum PoS ではなく **HyperBFT**
- \`executor\` — オーダーブック直結（Opcode が perp オーダーブックと相互作用）
- \`pool\` — 高頻度 perp 更新ルール
- その他 — Reth デフォルト

**Tempo の差し替え**:
- \`pool\` — payments 優先レーン（マーチャント決済が高 gas DeFi tx の後ろで待たされない）
- \`payload\` — payment finality パターンに合わせたブロック構築
- \`add_ons\` — payment RPC namespace + [Machine Payments Protocol](https://github.com/tempoxyz/mpp-specs)（HTTP-402 エージェント決済）統合
- \`consensus\` / \`executor\` — Reth デフォルトで十分

隣接 crate（Reth 差し替えそのものではないが、Reth 未改造依存で成立）:
- **[Zones](https://github.com/tempoxyz/zones)** — confidential blockchain、250ms ブロック、TIP-403 compliance
- **[tidx](https://github.com/tempoxyz/tidx)** — PostgreSQL+ClickHouse ハイブリッドインデクサ

**Berachain (bera-reth) の差し替え**:
- \`consensus\` — **Proof of Liquidity**（流動性を BEX stake）
- \`executor\` — PoL 報酬分配が実行と相互作用
- \`add_ons\` — DEX-aware RPC namespace
- 構造: GitHub fork ですらなく、Reth crate を依存とする独立 repo = 「compose, don't fork」の最鮮明表現

**MegaETH の深いカスタマイズ**（thesis = 100K+ TPS L1）:
- \`executor\` — JIT/AOT EVM（[revmc](https://github.com/paradigmxyz/revmc) ベース）、[mega-evm](https://github.com/megaeth-labs/mega-evm) が revm を MegaETH 仕様でラップ
- **storage / state** — MDBX を [SALT](https://github.com/megaeth-labs/salt) に置き換え（30 億アイテム / 1 GB メモリ、state-root ランダム I/O 排除）
- **バリデータ別バイナリ** — [stateless-validator](https://github.com/megaeth-labs/stateless-validator) が SALT witness でステートレス検証
- \`consensus\` / \`pool\` / \`network\` — Reth デフォルト + 性能最適化
- それでも \`megaeth-labs/reth\`: 0 ahead, 7666 behind

Thesis → コンポーネント差し替えマッピング:

| Thesis | 差し替えるコンポーネント |
| :--- | :--- |
| 「オーダーブック結合 perp 高速実行」 | consensus、executor、pool |
| 「payment-priority L1」 | pool、payload、add_ons |
| 「流動性 stake PoS」 | consensus、executor、add_ons |
| 「JIT EVM + stateless validator で 100K+ TPS」 | executor、storage layer、validator client |
| 「shielded tx プライバシー L1」 | pool、executor、add_ons（カスタム RPC） |

不変の 80%:
- Sync オーケストレータ（M1 で読んだ \`Stage\` パイプライン）
- MDBX スキーマとストレージレイヤ
- ヘッダーダウンロード、sender 復元、ハッシング、Merkle、インデックス
- JSON-RPC サーバーランタイム、engine API サーバー
- Tokio ランタイム、トレース、メトリクス

## 失敗例（誤解）

「全 6 コンポーネント差し替えが本物のカスタマイズ」— **間違い**。Tempo は 3 つだけ差し替え。**thesis が要求する部分だけ差し替える** が正解、不要なコンポーネントを差し替えても無意味 + メンテコスト増。

「MegaETH の SALT は標準 6 スロットではないので不可能」— **間違い**。Reth のストレージ抽象を経由してプラグイン、6 コンポーネントを超えるカスタマイズも fork なしで可能。**SDK の天井は標準 6 スロットを大きく超える**。

「Reth デフォルトでは性能不足」— **間違い**。不変の 80% が価値の大半（sync、ストレージ、MPT、Tokio）= 数年の最適化結果。差し替えるべきは thesis 固有部分のみ。

## ステップで組み立てる

### Step 1: fork なし証拠

Tempo / MegaETH = 0 ahead、Berachain = 独立 repo（fork ですらない）。

### Step 2: 6 コンポーネントを役割で言える

pool / network / executor / consensus / payload / add_ons。

### Step 3: 実本番チェーンの差し替えパターン

Hyperliquid（3 = consensus + executor + pool）/ Tempo（3 = pool + payload + add_ons）/ Berachain（3 = consensus + executor + add_ons）/ MegaETH（深 = executor + storage + validator）。

### Step 4: Thesis → 差し替えマッピング

チェーン thesis 1 文 = 1-3 コンポーネント差し替えに対応。

### Step 5: 不変の 80% を理解

sync + ストレージ + MPT + RPC + Tokio = 価値の大半、ここを差し替えない。

## 答え合わせ

- **Hyperliquid が最も大きくカスタマイズしたコンポーネント**: consensus（HyperBFT）+ executor（オーダーブック結合）。**全 Reth fork ではなく差し替えだけ** にした理由 = それ以外（sync、MDBX、ヘッダーダウンロード、sender 復元、RPC）を upstream Reth に追従、Paradigm のアップデートを rebase 地獄なしに取り込む。
- **Payments-priority に pool が正しい差し替え先である理由**: 受付・順序付け・追い出しの場、merchant 決済を高 gas DeFi tx の前に出すレーンを定義可能。**consensus はブロック検証ルール** = 何が valid ブロックかを決める、優先順位ではない。
- **「fork ではなく組み立てる」の保守上の論拠**: Paradigm の毎週 update が **80% に流れ込む** + 自分の fork 由来の表面積は書いた **20% に留まる**。何年も運用するチェーンで唯一の保守可能パス。

## 合格基準

- 6 コンポーネントを役割で即答できる。
- Hyperliquid / Tempo / Berachain / MegaETH の差し替えパターンを言える。
- Thesis → コンポーネントマッピングを 5 例で言える。
- 不変の 80% を 5 領域で言える。
- 「fork ではなく組み立てる」の保守上の論拠を 1 文で説明できる。

## まとめ（3行）

- 6 コンポーネント（pool / network / executor / consensus / payload / add_ons）の差し替えで Tempo / Berachain / MegaETH / Hyperliquid が **fork なし** で出荷。
- Thesis が要求する 1-3 コンポーネントだけ差し替え、不変の 80%（sync + ストレージ + MPT + RPC + Tokio）は Reth 継承 = 数年の最適化結果を活用。
- MegaETH が SDK 天井実証（executor + storage + validator client 差し替え + 0 ahead 維持）、Berachain が「compose, don't fork」最鮮明表現（独立 repo）。
`,
                },
                {
                  title: 'クイズ — Reth SDK',
                  slug: 'reth-sdk-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 11,
                  duration: 4,
                  xpReward: 25,
                  content: `# クイズ — Reth SDK

NodeBuilder API の 3 軸（types / components / add_ons）、6 コンポーネント、実本番チェーン（Tempo / Berachain / MegaETH / Hyperliquid）の差し替えパターンを確認する。
`,
                  quizQuestions: [
                    {
                      "question": "なぜ `.with_types::<EthereumNode>()` がビルダーチェーンで `.with_components(...)` の *先* に来るのですか?",
                      "options": [
                        "様式 — コンパイラに順序は関係ない。",
                        "性能 — 型先頭のほうがコンパイルが速い。",
                        "型はコンポーネントの load-bearing: tx と block の型が pool、executor、payload などが操作する対象を決める。チェーンが先に型バンドルに commit して、後続のコンポーネントビルダーが型認識可能になる。",
                        "古い Reth バージョンとの後方互換性。"
                      ],
                      "correctIndex": 2,
                      "explanation": "コンポーネントは型に依存する。`with_components` が先頭なら、各ビルダーは未確定の型でジェネリックにする必要がある。チェーンの順序が依存グラフをエンコードする — 型が先、その上にコンポーネントが乗る。"
                    },
                    {
                      "question": "あなたが payment-priority レッスン1を作ろうとしている。どのコンポーネントが最も直接的にそれを実現しますか?",
                      "options": [
                        "`consensus` — payment priority はコンセンサスルール。",
                        "`pool`（受付と順序付けルール）と `payload`（ブロックビルダー）。Pool が次のブロックに先に入る tx を決め、payload ビルダーが最終的な順序を決める。",
                        "`executor` — payment priority は Opcode にエンコードされる。",
                        "`network` — P2P レイヤが payment をルーティングする。"
                      ],
                      "correctIndex": 1,
                      "explanation": "Pool が高優先 payment を早めに surface する; payload がブロックの最終順序を決める。Consensus、executor、network は受付/順序付けに関係ない。これは Tempo の実際のカスタマイズに対応する。"
                    },
                    {
                      "question": "「Reth 全体を fork ではなく、コンポーネントを組み立てる」が、何年も運用するチェーンの唯一の実行可能な戦略であるのはなぜですか?",
                      "options": [
                        "Fork のほうが速い。",
                        "Fork は実際には変えたくない 200K 行以上の所有権を与える。コンポーネント合成なら差し替える部分（通常 10K 行未満）だけを所有しつつ、Paradigm のアップストリームのアップデートが依存ライブラリの 80% に流れ込む。",
                        "Fork が Reth のライセンスに違反する。",
                        "関係ない — どちらも同じくらい有効。"
                      ],
                      "correctIndex": 1,
                      "explanation": "これが保守の議論。Fork はアップストリームのリリースごとに分岐を蓄積する。合成はアップグレードパスを開けたままにする: Reth がアップデートを出し、Cargo の依存をバンプし、カスタムビルダーは差し替え表面しか触っていないので動き続ける。"
                    },
                    {
                      "question": "ExEx を使うことと Reth SDK を使うことの違いは何ですか?",
                      "options": [
                        "違いはない — 同じものの別名。",
                        "ExEx は既存の Ethereum ノードを chain commit にフックして拡張する（あなたはゲスト）。SDK はコンポーネントを組み立てて *自前のチェーン* を作る（あなたはホスト）。ExEx はインデクサ・MEV ボット・ロールアップ向け; SDK は レッスン1/レッスン2 向け。",
                        "ExEx は L1 向け、SDK はインデクサ向け。",
                        "SDK は ExEx の非推奨バージョン。"
                      ],
                      "correctIndex": 1,
                      "explanation": "ExEx = チェーンイベントを聞く、派生状態、prune に優しい。SDK = チェーンを定義、コンポーネントを差し替え、ノードバイナリを出荷。スタックの違うレイヤの相補的な道具で、本番デプロイは両方使うことが多い（SDK でチェーンを定義、ExEx でインデクサを足す）。"
                    }
                  ],
                },
                {
                  title: 'レッスン10 — ドリル: カスタム pool ビルダーを出荷する',
                  slug: 'reth-sdk-drill-ja',
                  type: 'CONTENT',
                  sortOrder: 12,
                  duration: 12,
                  xpReward: 25,
                  content: `# レッスン10 — ドリル: カスタム pool ビルダーを出荷する

## 問い

読むのはリハーサル、**実装するのが記憶**。カスタム pool ビルダーを書いて差し替え、ノードバイナリの中で自分のコードが動くのを観察。**\`CustomPoolBuilder::build_pool\` の 3 要素 + LoggingValidator のラップパターン + Dev チェーンで確認 — どこにあるか？**

> 注: 以下のコード断片は拡張ポイント理解のための概念スニペットです（\`...\` は省略箇所）。そのまま実行する用途ではありません。

## 原理（最小モデル）

- **\`CustomPoolBuilder::build_pool\` の 3 要素.** Validators（署名 / nonce チェック）+ Ordering（デフォルト \`CoinbaseTipOrdering\`）+ Construction（\`InMemoryBlobStore\` + 上記合成 → \`EthTransactionPool\`）。
- **\`LoggingValidator\` ラップパターン.** \`inner: V\` フィールド + \`validate_transaction\` で log + 委譲 = pool に副作用差し込む clean な方法。
- **Dev チェーンで確認.** \`cargo run -- --dev\` で 1 ノードエフェメラル、tx 送信で log 発火確認。
- **配線ミスの典型.** \`LoggingValidator\` 構築したが Builder が内側 validator を pool に渡したまま → log 発火せず。
- **カスタム precompile の差し替え.** executor を差し替える、同パターン転用（\`ExecutorBuilder\` 実装、\`CustomPoolBuilder\` と同形）。
- **1 コンポーネント差し替えたら他は機械的.** SDK の要点 = パターンが転用可能。

## 具体例

セットアップ:

\`\`\`bash
git clone https://github.com/paradigmxyz/reth
cd reth/examples/custom-node-components
\`\`\`

ビルド不要（Reth 全体ビルドは不要）。

\`CustomPoolBuilder::build_pool\` の 3 セクション:
1. **Validators** — 署名 / nonce / その他のチェック
2. **Ordering** — tx 順序付け戦略選択（デフォルト \`CoinbaseTipOrdering\`）
3. **Construction** — \`InMemoryBlobStore\` + 上記選択を合成して \`EthTransactionPool\` 構築

**Pool は単体機能ではなく (validator、ordering、blob store) の合成**。

\`LoggingValidator\` ラップパターン:

\`\`\`rust
struct LoggingValidator<V> {
    inner: V,
}

impl<V: TransactionValidator> TransactionValidator for LoggingValidator<V> {
    type Transaction = V::Transaction;

    async fn validate_transaction(
        &self,
        origin: TransactionOrigin,
        transaction: Self::Transaction,
    ) -> TransactionValidationOutcome<Self::Transaction> {
        info!(
            tx_hash = %transaction.hash(),
            gas_price = ?transaction.gas_price(),
            "Pool: validating transaction"
        );
        self.inner.validate_transaction(origin, transaction).await
    }
}
\`\`\`

（API 名は手元 reth の \`TransactionValidator\` トレイトの正確な形に合わせて調整。重要なのは **構造** であって正確な識別子ではない。）

\`CustomPoolBuilder::build_pool\` 内で wrap:

\`\`\`rust
let inner_validator = TransactionValidationTaskExecutor::eth_builder(...)
    /* ...既存セットアップ... */
    .build_with_tasks(...);

let validator = LoggingValidator { inner: inner_validator };

// inner_validator の代わりに validator を pool に渡す
\`\`\`

Dev チェーンで確認:

\`\`\`bash
cargo run -- --dev
\`\`\`

\`--dev\` = 1 ノードエフェメラル + 高速マイン。tx 送信例:

\`\`\`bash
cast send \\
  --rpc-url http://localhost:8545 \\
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \\
  --value 1ether \\
  0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
\`\`\`

ターミナル出力:

\`\`\`
Pool: validating transaction tx_hash=0x... gas_price=...
\`\`\`

出ない場合: 配線ミス。よくある原因 = \`LoggingValidator\` 構築したが Builder が **内側** validator を pool に渡したまま。配線を直して再実行。

カスタム precompile を追加したい場合:

\`\`\`rust
.with_components(
    EthereumNode::components()
        .executor(CustomExecutorBuilder { extra_precompiles: vec![ed25519_verify] })
)
\`\`\`

\`CustomPoolBuilder\` が \`PoolBuilder\` 実装と同じやり方で \`ExecutorBuilder\` を実装。**パターンがそのまま転用** — これが SDK の要点。1 コンポーネント差し替えたら、別のは機械的作業。

## 失敗例（誤解）

「pool は validator だけ」— **間違い**。Pool は (validator、ordering、blob store) の **合成**。3 要素どれも独立に差し替え可能。

「\`LoggingValidator\` を構築しただけで log 発火」— **間違い**。Builder で **内側 validator を渡してしまっている** ことが典型ミス。\`validator\` 変数を pool に渡す必要、構築だけでは効果なし。

「executor 差し替えは pool 差し替えと別の作法」— **間違い**。\`ExecutorBuilder\` が \`PoolBuilder\` と同形（\`build_executor\` メソッド + コンテキスト引数）。**1 コンポーネント差し替え方を学んだら他は機械的**。

## ステップで組み立てる

### Step 1: \`CustomPoolBuilder\` を読む

\`src/main.rs\` で \`CustomPoolBuilder\` 構造体 + \`PoolBuilder\` 実装。

### Step 2: 3 要素を特定

Validators + Ordering + Construction。

### Step 3: \`LoggingValidator\` でラップ

\`inner: V\` フィールド + \`validate_transaction\` で log + 委譲。

### Step 4: Builder 内で wrap

\`let validator = LoggingValidator { inner: inner_validator };\` → pool に \`validator\` を渡す。

### Step 5: Dev チェーンで確認

\`cargo run -- --dev\` + tx 送信 → ターミナルログ確認。

### Step 6: カスタム precompile スケッチ

\`ExecutorBuilder\` 実装、\`extra_precompiles\` フィールド + \`PoolBuilder\` 同形。

### Step 7: 1 行で別コンポーネント差し替え

\`.pool(...)\` → \`.executor(...)\` の **1 行変更**。

## 答え合わせ

- **\`CustomPoolBuilder::build_pool\` の 3 合成要素**: Validators（署名 / nonce 等のチェック）+ Ordering（tx 順序、デフォルト \`CoinbaseTipOrdering\`）+ Construction（\`InMemoryBlobStore\` + 上記合成 → \`EthTransactionPool\`）。Pool は **単体機能ではなく合成**、3 要素どれも独立に差し替え可能。
- **\`LoggingValidator\` ラップが clean な理由**: \`inner: V\` フィールドで委譲、既存 validator の全機能保持 + ログだけ追加 = decorator パターン。pool 内部に手を入れず、新しい validator として登録するだけ。
- **executor 差し替えに pool パターンが転用できる理由**: \`ExecutorBuilder\` が \`PoolBuilder\` と同形（\`build_executor(self, ctx)\` メソッド + コンテキスト引数 + コンポーネント返す）。**1 コンポーネント差し替えの作法を学んだら他は機械的** = SDK の最大の売り。

## 合格基準

- \`CustomPoolBuilder::build_pool\` の 3 合成要素を言える。
- \`LoggingValidator\` ラップパターンを書ける。
- Dev チェーン + tx 送信で log 確認手順を辿れる。
- カスタム precompile = executor 差し替え と判断できる。
- \`main.rs\` の 1 行変更で別コンポーネント差し替え可能と理解している。

## まとめ（3行）

- カスタム pool ビルダー = (validators + ordering + blob store) の合成、\`LoggingValidator\` で wrap して副作用注入が clean パターン。
- Dev チェーン（\`cargo run -- --dev\`）+ \`cast send\` で動作確認、ログが出なければ Builder が内側 validator を渡してしまうのが典型ミス。
- パターンは全コンポーネントに転用可能（\`ExecutorBuilder\` で precompile 追加 etc）= SDK の最大の売り、1 コンポーネント差し替え覚えたら他は機械的。
`,
                },
                {
                  title: 'レッスン11 — Stage と ExEx のテスト — fixture chain・インプロセスノード・golden state',
                  slug: 'reth-testing-ja',
                  type: 'CONTENT',
                  sortOrder: 13,
                  duration: 24,
                  xpReward: 50,
                  content: `# レッスン11 — Stage と ExEx のテスト — fixture chain・インプロセスノード・golden state

## 問い

\`Stage\` トレイト・ExEx API・NodeBuilder SDK を歩いてきた。**Reth と Reth を拡張するアプリは、これらの動作をどう検証しているか？** dev で「動いて見える」コンポーネントは本番で何千人ものユーザの状態を静かに壊する。Reth 自身の CI がそれを防ぐパターンは？

## 原理（最小モデル）

- **2 テスト層が必要.** Stage/ExEx ユニットテスト（trait 実装単体、純 Rust + fixture）+ NodeBuilder 統合テスト（ノード全体、インプロセス起動）。
- **Stage ユニットテスト = 一時 DB + 事前状態 + execute + assert.** \`TestStageDB\` + \`create_test_provider_factory\` がephemeral MDBX 提供。
- **ExEx ユニットテスト = ハーネス + 合成通知.** \`test_exex_context()\` がフルノード起動なしで ExEx 駆動可能。
- **NodeBuilder 統合テスト = インプロセス起動.** カスタムコンポーネント間相互作用を検証、~1 秒/テスト。
- **Fixture-chain テスト = canned data 再生.** 既知正常ノードからキャプチャ + golden state-root と完全一致 assert。
- **Reth 自身の CI が両層使う.** stage コードの全変更が state-root 不一致として検出 → mainnet 前にコンセンサスバグ捕獲。
- **Building tier との接続.** *Read a Real Production Indexer — tidx* の test gate がこの §2 ExEx ユニットテストパターンをアプリケーション層で適用。

## 具体例

2 テスト層:

| 層 | 何をテストするか | 何を起動するか |
| :--- | :--- | :--- |
| Stage / ExEx ユニットテスト | trait 実装単体に、用意したチェーンイベントを与える | 何も起動しない — 純 Rust + fixture |
| NodeBuilder 統合テスト | 自前コンポーネントを差したノード全体 | Reth ノードをインプロセスで起動 |

Stage ユニットテスト:

\`\`\`rust
use reth_provider::test_utils::create_test_provider_factory;
use reth_stages::test_utils::{TestRunnerError, TestStageDB};

#[tokio::test]
async fn execute_advances_checkpoint() {
    let db = TestStageDB::default();
    seed_blocks(&db, 0..=10).await;             // fixture ヘルパ

    let mut stage = MyStage::default();
    let input = ExecInput { target: Some(10), checkpoint: None };
    let output = stage.execute(&db.factory.provider_rw().unwrap(), input).await.unwrap();

    assert_eq!(output.checkpoint.block_number, 10);
    assert!(output.done);
    assert_my_derived_state(&db, 10).await;
}

#[tokio::test]
async fn unwind_rolls_back_to_checkpoint() {
    let db = TestStageDB::default();
    seed_blocks(&db, 0..=10).await;
    let mut stage = MyStage::default();

    // 10 まで前進
    stage.execute(&db.factory.provider_rw().unwrap(),
        ExecInput { target: Some(10), checkpoint: None }).await.unwrap();

    // 5 まで unwind
    let output = stage.unwind(&db.factory.provider_rw().unwrap(),
        UnwindInput { unwind_to: 5, checkpoint: ..., bad_block: None }).await.unwrap();

    assert_eq!(output.checkpoint.block_number, 5);
    assert_my_derived_state(&db, 5).await;
}
\`\`\`

要のツール: **\`create_test_provider_factory\`** と **\`TestStageDB\`**（\`reth_provider::test_utils\` および \`reth_stages::test_utils\`）。テストごとに ephemeral MDBX DB = 共有状態なし + cleanup 定型コードなし + stale fixture なし。

ExEx ユニットテスト（ハーネス）:

\`\`\`rust
use reth_exex_test_utils::{test_exex_context, PollOnce};
use reth_exex::{ExExEvent, ExExNotification};

#[tokio::test]
async fn handles_committed_then_reverted() {
    let (ctx, mut handle) = test_exex_context().await.unwrap();
    let exex = my_exex(ctx);
    tokio::spawn(exex);

    // ブロック N..N+5 をカバーする committed-chain 通知を送る
    handle.send_notification_chain_committed(committed_chain(N..=N+5)).await.unwrap();
    handle.assert_event_finished_height(N+5).await;

    // N+3..N+5 を reorg
    handle.send_notification_chain_reverted(reverted_chain(N+3..=N+5)).await.unwrap();
    handle.assert_event_finished_height(N+2).await;

    // 自前の導出状態を検証
    assert_my_state_at_height(N+2).await;
}
\`\`\`

ハーネスなしの場合: フルノード起動 + 本物チェーンデータ再生 + イベント待ち = テストサイクル数分。ハーネスあり: 各通知が単一関数呼び出し = テスト時間が数秒に。

NodeBuilder 統合テスト:

\`\`\`rust
use reth_node_builder::NodeBuilder;
use reth_node_ethereum::EthereumNode;
use reth_tasks::TokioTaskExecutor;

#[tokio::test]
async fn custom_pool_builder_filters_blob_txs() {
    let node = NodeBuilder::new(test_node_config())
        .testing_node(TokioTaskExecutor::default())
        .with_types::<EthereumNode>()
        .with_components(EthereumNode::components().pool(MyPoolBuilder))
        .with_add_ons(EthereumNode::add_ons())
        .launch()
        .await
        .unwrap();

    // pool の API 経由で tx を提出
    let pool = node.pool();
    let blob_tx = test_blob_tx();
    let result = pool.add_external_transaction(blob_tx).await;
    assert!(matches!(result, Err(PoolError::BlobsExcluded)));
}
\`\`\`

パターン: \`NodeBuilder::new(...).testing_node(...)\` がカスタムコンポーネント付きでノードをインプロセス起動 → ハンドル（\`node.pool()\`、\`node.provider()\`、\`node.network()\`）露出 → 直接駆動。ユニットテストより遅い（~1 秒/テスト）が、コンポーネント間挙動には不可欠。

Fixture-chain テスト:

\`\`\`rust
#[tokio::test]
async fn full_sync_to_pinned_block_matches_golden_state() {
    let chain_fixture = load_fixture("tests/fixtures/sepolia_blocks_0_to_1000.rlp").await;
    let db = TestStageDB::default();

    // fixture を通して全 stage を駆動
    for stage in default_stages_for_test() {
        run_stage_to_completion(&mut stage, &db, chain_fixture.range()).await;
    }

    // ブロック 1000 時点の derived state-root を既知の正答と比較
    let derived = db.factory.provider().header(1000).unwrap().state_root;
    assert_eq!(derived, GOLDEN_SEPOLIA_STATE_ROOT_AT_1000);
}
\`\`\`

これが Reth が史実データに対して sync 正しさを検証する方法。fixture は既知正常ノードからの 1 回キャプチャ、CI が push のたびに再生。**任意 stage の回帰が state-root 不一致として現れる = コンセンサスバグで mainnet 前に捕獲**。

## 失敗例（誤解）

「ユニットテストだけで十分」— **間違い**。コンポーネント間相互作用（カスタム pool ビルダーがカスタム payload validator から read）はユニットテストでは見えない。**統合テスト必須**。

「ExEx は手で \`ExExNotification\` 値を構築すれば良い」— **間違い**。ハーネスがイベント / 完了シグナルの **裏チャンネルを所有** → テストが poll なしで同期可能。手作りだと race condition + flaky test。

「Fixture-chain は重すぎて CI で回せない」— **間違い**。Reth 自身が push のたびに再生。**コンセンサスクリティカルバグを mainnet 前に捕獲する唯一の方法**。

## ステップで組み立てる

### Step 1: 2 テスト層を即答

ユニット（trait 実装単体）+ 統合（ノード全体）。

### Step 2: Stage ユニットテストパターン

\`TestStageDB\` + seed_blocks + execute + assert + unwind + assert。

### Step 3: ExEx ユニットテストハーネス

\`test_exex_context()\` + \`send_notification_*\` + \`assert_event_finished_height\`。

### Step 4: NodeBuilder 統合テスト

\`testing_node()\` でインプロセス起動 + ハンドル露出 + 直接駆動。

### Step 5: Fixture-chain テスト

既知正常ノードからキャプチャ + 全 stage 駆動 + golden state-root 比較。

### Step 6: Building tier との接続

tidx の test gate = §2 のアプリケーション層適用。

## 答え合わせ

- **\`reth-exex-test-utils\` を別 crate で同梱する理由**: ハーネスがイベント / 完了シグナルの **裏チャンネルを所有** → テストが poll なしで同期可能。手作り通知だと race condition で flaky test、ハーネスで決定的テストに。**同期がテストの決定性を保証**。
- **Fixture-chain テストが Reth の CI に必須な理由**: 任意 stage の回帰が **state-root 不一致** として現れる = コンセンサスクリティカルバグを mainnet 前に捕獲。fixture は既知正常ノードから 1 回キャプチャ、CI が push のたびに再生 → state 一致なら全 stage 正しい。
- **2 層テストの補完関係**: ユニット = trait 実装単体の正しさ（速い、純 Rust）+ 統合 = コンポーネント間相互作用（~1 秒、ノード組み立て）。**どちらかを省くと特定クラスのバグが通り抜ける**。

## Expert への接続

Reth コンポーネント層のテスト規律。Systems 層では Expert tier の 2 レッスンがこれを発展させる:

- [Differential fuzzing と execution-spec-tests](/courses/reth-expert-ja/lessons/expert-differential-fuzzing-ja) — 複数実装にわたるコンセンサス正しさのテスト
- [Systems-code auditing](/courses/reth-expert-ja/lessons/systems-code-auditing-ja) — Reth patch を監査人の目で読む

## 合格基準

- 2 テスト層と各々が何をテストするかを言える。
- \`TestStageDB\` + \`create_test_provider_factory\` のパターンを書ける。
- \`test_exex_context()\` のハーネスパターンを言える。
- \`testing_node()\` での統合テスト構造を即答できる。
- Fixture-chain テストの golden state-root 検証を 1 文で説明できる。

## まとめ（3行）

- 2 テスト層（ユニット = trait 単体 / 統合 = ノード全体）+ Fixture-chain テスト = Reth 自身の CI 規律、両方が補完関係。
- \`TestStageDB\` + \`test_exex_context()\` + \`testing_node()\` で ephemeral / 決定的 / 高速テスト、手作り通知だと flaky test 化。
- Fixture-chain テスト + golden state-root = コンセンサスクリティカルバグを mainnet 前に捕獲、tidx の test gate がこの §2 ExEx ユニットテストパターンをアプリケーション層で適用。
`,
                },
                {
                  title: 'レッスン12 — 次のティアへの橋渡し — Advanced (L1 Architect) と Expert',
                  slug: 'reth-bridge-to-expert-ja',
                  type: 'CONTENT',
                  sortOrder: 14,
                  duration: 10,
                  xpReward: 20,
                  content: `# レッスン12 — 次のティアへの橋渡し — Advanced (L1 Architect) と Expert

## 問い

**Alloy → Revm → Reth（Staged Sync、ExEx、カスタム NodeBuilder）** の階段を上ってきた。「読める」は半分、**次のティアは何を教え、どこから始めるか？**

## 原理（最小モデル）

- **ゲートチェック 5 問.** \`popn_top!\` 展開 / \`Database\` vs \`DatabaseRef\` 非対称 / \`ExExEvent::FinishedHeight\` 役割 / \`MerkleStage\` の位置 / Tempo のコンポーネント差し替え。**4 未満なら戻る**。
- **Advanced ティア = L1 を architect.** 5 コース（Consensus Engineering / Cross-Chain Bridges / Sequencer & Rollup / P2P Networking / Validator Operations）、難易度 ADVANCED。
- **Expert ティア = 本番に出す.** 2 コース（Reth Expert / Building with the Stack）、難易度 EXPERT。
- **マインドセット転換.** Intermediate = **構造** を教える / 次ティア = その構造の **背後にある決定** を教える。
- **「なぜ」を読む前に意見を持つ.** インフラ出荷エンジニアの規律、間違っていても先に意見。
- **両ティア独立、興味と project に合うほうから.**

## 具体例

ゲートチェック 5 問:
1. \`popn_top!\` は何に展開される? なぜ \`unsafe\` 内で \`unwrap_unchecked()\` を使うのか?
2. \`Database\` と \`DatabaseRef\` がなぜ別トレイト? \`auto_impl\` リストの非対称（\`&mut, Box\` vs \`&, &mut, Box, Rc, Arc\`）が何を語るか?
3. \`ExExEvent::FinishedHeight\` が Reth pruner に何を伝えるか — 忘れた場合のディスク帰結は?
4. なぜ \`MerkleStage\` がハッシング後で、間に挟まれていないのか?
5. Tempo のような purpose-built L1 を出荷するために Reth のどのコンポーネントを差し替えるか?

**4 正解未満なら進まない**、該当 Inside Reth レッスンに戻る。

Advanced ティア（5 コース、ADVANCED）:

| コース | 焦点 |
| :--- | :--- |
| Consensus Engineering | PoS / BFT / Tendermint 内部、レイテンシ・ライブネス・finality |
| Cross-Chain Bridges | CCIP・OP Standard Bridge・light client、自分で書く |
| Sequencer & Rollup アーキテクチャ | 中央集権 sequencer → 共有 sequencer、MEV 防衛、forced inclusion |
| P2P Networking Internals | devp2p・libp2p・gossip サブプロトコル・ピアスコアリング |
| Validator Operations | 鍵管理、slashing 条件、協調アップグレード |

Expert ティア（2 コース、EXPERT）:

| コース | 焦点 |
| :--- | :--- |
| Reth Expert | パフォーマンス、MDBX、Tokio 内部、手続きマクロ、カスタム precompile、MPT、本番 MEV、zkEVM、Reth フォーク運用 |
| Building with the Stack | 動くアプリ 10 本 — MEV searcher、indexer、wallet backend、cheatcode、swap aggregator、order router capstone、cross-client 検証、HTTP 402 / MPP machine-payments |

順序:
- **Advanced を先に**: 自分で L1 を architect したい、Hyperliquid / Tempo を理解したい
- **Expert を先に**: 既存 chain で本番アプリを ship したい、運用 / 性能エンジニアリングが必要
- **両方終えれば「読める + 設計できる + 出荷できる」の三拍子**

マインドセット転換 — 「なぜ」を予測:
- **MDBX vs RocksDB**: コンパクションストールでの読み取りレイテンシ
- **pop-1-write-through**: ADD あたりメモリ書き込みが 1 回減る
- **\`#[track_caller]\`**: パニックのバックトレースがトレイトメソッドではなく、バグった呼び出し元を指す
- **cheatcodes が precompile**: バニラ EVM とのコンセンサス互換性（precompile は予約アドレス、新 Opcode ではない）

ポイントは私の言い回しと一致したかではなく: **読む前に意見があったか?** 一度この *なぜ* を内部化すれば、Paradigm のエンジニアや Hyperliquid validator 運用者と設計判断を議論可能 = grant 応募可能な仕事への入口。

## 失敗例（誤解）

「ゲートで 3 問正解なら進んで良い」— **間違い**。次ティアは「再調査する概念」ではなく「**流暢な語彙**」として前提する。4 未満で進むと密度に詰まる。

「Advanced を先に Expert を後にすべき」— **半分間違い**。両ティア独立、興味と project 次第。Hyperliquid / Tempo 理解優先なら Advanced、本番アプリ出荷優先なら Expert。

「『なぜ』を予測しなくても読めば分かる」— **間違い**。インフラ出荷エンジニアの規律 = 読む前に意見を持つ、間違っていても先に。「内部化」が grant 応募可能な仕事への入口。

## ステップで組み立てる

### Step 1: ゲートチェック 5 問

\`popn_top!\` / \`Database\` 非対称 / \`FinishedHeight\` / \`MerkleStage\` 位置 / Tempo コンポーネント差し替え。

### Step 2: 4 未満なら戻る

該当 Inside Reth レッスンを再読、次ティア前提を満たす。

### Step 3: Advanced or Expert を選ぶ

architect 優先 = Advanced / 出荷優先 = Expert。

### Step 4: マインドセット転換

構造 → 構造の背後の決定。**「なぜ」を予測してから読む**。

### Step 5: 両ティア完走を目指す

「読める + 設計できる + 出荷できる」三拍子。

## 答え合わせ

- **ゲートチェック 4 未満で戻るべき理由**: 次ティアは「流暢な語彙」前提、再調査する概念扱いではない。密度高 + リンクされたコード再現が必須 + デフォルトで言える状態でないと付いていけない。**前提を満たすことが進む条件**。
- **マインドセット転換の意味**: Intermediate = 構造を教える（\`Stage\` trait、ExEx API、NodeBuilder の形）/ 次ティア = 構造の **背後にある決定** を教える（なぜ MDBX、なぜ pop-1-write-through、なぜ \`#[track_caller]\`、なぜ cheatcodes が precompile）。意見 → 検証 → 内部化のサイクル。
- **「読める + 設計できる + 出荷できる」の三拍子の意味**: Inside Reth で読める / Advanced (L1 Architect) で設計できる / Expert で出荷できる。3 つ揃って Paradigm / Hyperliquid / Tempo エンジニアと議論可能 = grant 応募可能な仕事の入口。

## 合格基準

- ゲートチェック 5 問に答えられる。
- Advanced ティア 5 コースと Expert ティア 2 コースを役割で言える。
- マインドセット転換（構造 → 背後の決定）を 1 文で説明できる。
- 「なぜ」を予測する規律の意味を言える。
- 「読める + 設計できる + 出荷できる」三拍子を即答できる。

## まとめ（3行）

- Inside Reth 完走後 = Advanced (L1 Architect, 5 コース) / Expert (本番に出す, 2 コース) の 2 ティアに進む、両ティア独立で興味と project 次第。
- ゲートチェック 5 問で 4 未満なら戻る、次ティアは「流暢な語彙」前提で密度高 + リンクコード再現必須。
- マインドセット転換 = 構造（Intermediate）→ 構造の背後の決定（次ティア）、「なぜ」を予測してから読む規律 = grant 応募可能な仕事への入口。
`,
                },
                {
                  title: 'クイズ — Inside Reth 完走',
                  slug: 'reth-advanced-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 15,
                  duration: 8,
                  xpReward: 25,
                  content: `# クイズ — Inside Reth 完走

3 トピックチェーン（Staged Sync / ExEx / SDK）+ Testing + Bridge to Expert の構造的事実を確認する。次ティア（Advanced or Expert）へ進む前のゲート。
`,
                  quizQuestions: [
                    {
                      "question": "Reth の Staged Sync が、ブロック単位の同期に対して持つ実利は？",
                      "options": [
                        "ブロックをダウンロードするだけで実行しない設計でディスクを節約できる",
                        "範囲をステージごとに処理することで I/O・CPU・キャッシュ効率を最大化 — かつ unwind により reorg を対称的に扱える",
                        "Merkle ルート計算を無期限に遅延することでスキップする",
                        "データベース不要 — 状態はクエリ時に都度導出す"
                      ],
                      "correctIndex": 1,
                      "explanation": "Staged Sync (Headers → Bodies → Senders → Execution → Hashing → Merkle → TxLookup → Indexes → Finish) は範囲をステージごとに処理。Sender 復元は Rayon で並列化。Hashing でソートしてから MerkleStage が動く。すべてのステージが `execute` と `unwind` を持つから、reorg は特殊ケースではなく通常運用。"
                    },
                    {
                      "question": "ExEx（Execution Extensions）で何ができる？",
                      "options": [
                        "JSON-RPC パイプラインの応答送信前にカスタムロジックを注入する",
                        "チェーンの commit / reorg / revert ごとに、ノードプロセス内で実行時間に近いレイテンシで Rust コードを動かす",
                        "P2P ネットワークでのトランザクションの gossip 方法を上書きする",
                        "Reth のコンセンサスエンジンを独自のものに置き換える"
                      ],
                      "correctIndex": 1,
                      "explanation": "ExEx は ChainCommitted / ChainReorged / ChainReverted の通知を in-process で受け取り、インデクサ・MEV パイプライン・リアルタイムリスクエンジンに最適。(RPC カスタマイズは add_ons、ネットワークやコンセンサスのカスタマイズは with_components 経由 — 別の SDK 表面。)"
                    },
                    {
                      "question": "Reth SDK で App-chain を作るとき、現実的なカスタマイズ表面は？",
                      "options": [
                        "genesis レベルの chain ID と gas limit のみ",
                        "pool・network・payload・executor (EVM)・consensus コンポーネント、加えて RPC と ExEx を add-ons 経由で",
                        "`Stage<Provider>` 実装のみ — それ以外はロックされている",
                        "Database テーブルとインデックスのみ — EVM 自体は固定"
                      ],
                      "correctIndex": 1,
                      "explanation": "SDK は `with_components.{pool, network, payload, executor, consensus}` と RPC/ExEx 用の `with_add_ons` を露出。カスタムメンプール (Tempo 風優先レーン) からカスタムコンセンサス (HyperBFT)、カスタム EVM (custom opcode / precompile) まで、すべてビルダー差し替え 1 つの距離。"
                    }
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
