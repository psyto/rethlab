import { PrismaClient } from '@prisma/client';

export async function seedRethAdvancedJA(prisma: PrismaClient) {
  const tags = ['reth', 'rust', 'advanced', 'exex', 'staged-sync', 'reth-sdk'];

  await prisma.course.create({
    data: {
      slug: 'reth-advanced-ja',
      title: 'Inside Reth — シンク・拡張・SDK',
      description:
        'Reth の本物のソースを読む: Staged Sync (10 ステージのパイプライン)、ExEx (Execution Extensions — インプロセスのインデクサ・MEV・リスクエンジン用)、Reth SDK (自前の App-chain を組み立てる)。3 つの独立した Advanced コース (Revm・Reth・Alloy) の 1 つ — `Database` トレイトと Revm 実行モデルへの慣れを前提にする箇所があるので、Inside Revm を先にやることを推奨。',
      difficulty: 'INTERMEDIATE',
      duration: 145,
      xpReward: 470,
      track: 'reth-advanced',
      tags,
      isPublished: true,
      sortOrder: 220,
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
                  title: 'Inside Reth へようこそ — このコースの読み方',
                  slug: 'reth-advanced-welcome-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 7,
                  xpReward: 15,
                  content: `# Inside Reth へようこそ — このコースの読み方

これは RethLab の 3 つの独立した Advanced ティアのコースの 1 つです:

- **Inside Revm** — EVM エンジンの内部 *(まだなら先に推奨)*
- **Inside Reth**（あなたはここ）— Reth の内部: Staged Sync・ExEx・Reth SDK
- **Inside Alloy** *(近日公開)* — Alloy の内部: Provider・Network・Signer

3 つは独立していますが、**ここのいくつかのレッスンは Inside Revm で学ぶ \`Database\` トレイトと Revm 実行モデルへの慣れを前提にしています**。それが不安なら、Inside Revm を先に。

> 📋 **Advanced ティアは初めて?** *Bridge to Advanced* の最後にある **「Advanced コースの読み方」** を先に読んでください。編集スタイル（Predict プロンプト・クイズゲート・積み上げ→ウォークスルー→クイズ→ドリルのチェーン構造）とペースを説明しています — 3 つの Advanced コース全てに適用される、1 度読めば済む内容です。

## このコースで学ぶこと

[\`paradigmxyz/reth\`](https://github.com/paradigmxyz/reth) のソースを 1 行ずつ読みます: \`Stage\` トレイトと 10 ステージの sync パイプライン、**ExEx (Execution Extensions)** — インプロセスのインデクサ・MEV・リスクエンジン用、そして自前の App-chain を組み立てる **Reth SDK**。3 つのトピックチェーン、それぞれが積み上げ + ウォークスルー + クイズ + ドリル。

終わりには、ノード速度のインデクサや独自の App-chain を出荷できるだけの Reth 内部を読み解いていることになります。

## 前提知識

**Revm 内部**（Inside Revm を未受講の場合）:
- \`Database\` トレイトの面と Revm がそれを通じて状態を読む方法
- \`ExecutionStage\` で \`Stage\` と \`Database\` がどう相互作用するか

**ブロックレベルの Ethereum**（Bridge to Advanced でカバー）:
- ブロック構造 (header / body / receipts)、reorg は通常運用
- sender 復元、tx body デコード、receipt の中身

**中級 Rust**（同じく Bridge to Advanced で。このコース内の *Rust: ライフタイム・Box・Arc・dyn Trait* レッスンが自己チェック用）:
- Generics + trait bounds、\`?Sized\`、\`dyn Trait\` vs \`impl Trait\`
- \`Arc<T>\`、\`Mutex<T>\`、\`RwLock<T>\` — どれをいつ使うか
- \`async\` / \`Future\` / \`Stream\` の基礎
- \`auto_impl\` マクロと手続き属性

**Revm が不安?** Inside Revm を先に。Stage トレイトも SDK も Revm 型を直接参照します。

## セットアップ — 一度だけ

レッスン 1 の前に、別ウィンドウでこれらを準備:

1. **\`paradigmxyz/reth\` を clone** — \`git clone https://github.com/paradigmxyz/reth\`
2. **\`bluealloy/revm\` を clone** — \`git clone https://github.com/bluealloy/revm\` (ExEx と SDK レッスンで横断参照)
3. **動く \`cargo\` ツールチェイン** — \`rustc --version\` でモダンなバージョンが出ること
4. **\`cargo-expand\`** — \`cargo install cargo-expand\` (両リポジトリの手続きマクロ)
5. **セカンドモニタか分割端末** — レッスンを読みながらソースを参照する

「Find in repo」プロンプトはリポジトリを実際に開いていなければ機能しません。レッスン 1 を始める前にこのループを閉じておく。

## 準備完了

コース詳細に戻って **「\`Stage\` トレイトをステップで組み立てる」** から始める。

Inside Reth の後: **Inside Alloy**（未受講なら）か、手続きマクロや zkVM 統合の深掘りがある **Expert** へ。`,
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
                  title: '\`Stage\` トレイトをステップで組み立てる',
                  slug: 'staged-sync-buildup-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 10,
                  xpReward: 25,
                  content: `# \`Stage\` トレイトをステップで組み立てる

Staged Sync は Reth の背骨です。**そして、見た目は威圧的** — 本物の \`Stage\` トレイトは6つのメソッド、非同期の準備チェック、双方向の対称性、そして \`auto_impl(Box)\` 属性を持っています。素のまま読むと、新しい概念が一度に6つ降ってくる。

このレッスンは、最も素朴な同期ループからこのトレイトを積み上げます。終わりにはこれの全ピースを自分で組み立てたことになります:

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

> 📂 **別タブで \`paradigmxyz/reth\` を開いてください。** 各ステップで照合します。

## ステップ 0 — 素朴な同期: 1ブロックずつ

何も考えずに書くと、Ethereum の同期はこんな形:

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

1ブロックずつ。各ブロックが次のブロックを始める前に全フェーズを通る。

> 🛑 **予測。** スクロールせずに: この素朴な設計が 2000 万ブロックで *破滅的に* 遅い理由を3つ挙げてください。（ヒント: 各々が *別種の* 非効率。）

3つ:

1. **バッチがない。** ECDSA sender 復元は1ブロックあたり 200 回同じ操作。それを 200 回別々の呼び出しでやると、200 回分のセットアップコスト。
2. **I/O 償却がない。** ブロックごとに Merkle ルートを書く = 2000 万回の \`commit()\` 呼び出し — それぞれディスクに触る。バッチ化すれば、Merkle ルートは100万ブロックに1回書けばいい。
3. **並列化がない。** ヘッダー取得は tx 実行に依存しない。Sender 復元は前ブロックに依存しない。でもループは各フェーズでブロックする。

修正方針: **作業をステージに分割。** 各ステージが *ブロック範囲* を端から端まで処理してから次に渡す。

## ステップ 1 — ステージをスケッチする

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

これで sender 復元はブロック間でバッチ化、Merkle ルートは償却され、ステージ内で並列化できる。**データ構造はステージのリスト、各ステージは1つのトレイトを実装。** 次にトレイトを組み立てる。

## ステップ 2 — \`Stage\` の最初の試案

> 🛑 **予測。** トレイトをスケッチしてください。オーケストレータが呼ぶメソッドは? ステージは何を返す? 予想を立ててから先へ。

最初の試み:

\`\`\`rust
trait Stage {
    fn execute(&mut self, blocks: BlockRange) -> Result<(), StageError>;
}
\`\`\`

メソッド1つ。呼び出し側が範囲を渡し、ステージが処理する。完了。

これは前進同期で動きます — でも致命的な穴がある。

## ステップ 3 — \`unwind\`: reorg はオプションではない

> 🛑 **予測。** Ethereum の reorg は特殊ケースではなく日常的に起きる。スクロールせずに: この単一メソッドの \`Stage\` でブロック 1000 → 980 への reorg をどう扱うか?

このトレイトには無い *別の* メソッドが必要 — そしてオーケストレータには別のコードパスが必要。コードベースの半分が「reorg パス」になる。これが他の Ethereum クライアントが持つ形で、Reth が避けるよう設計された形。

Reth の答え: **同じトレイトに \`unwind\` を加える**:

\`\`\`rust
trait Stage {
    fn execute(&mut self, blocks: BlockRange) -> Result<(), StageError>;
    fn unwind(&mut self, blocks: BlockRange) -> Result<(), StageError>;
}
\`\`\`

前進 = 範囲に対して \`execute\`。後退 = 範囲に対して \`unwind\`。**同じトレイト、2方向。** Reorg は通常運用になり、特殊ケースではなくなる。**この対称性がアーキテクチャの要石。**

## ステップ 4 — \`ExecInput\` / \`ExecOutput\`: 明示的な再開可能性

\`BlockRange\` は薄すぎ。オーケストレータはステージに伝える必要がある:

- *どこで止まるか。* ターゲットブロック。
- *どこから再開するか。* 前回のチェックポイント（ノード再起動後）。

ステージはオーケストレータに伝える必要がある:

- *どこで止まったか。* 新しいチェックポイント。
- *終わったかどうか。* \`false\` ならオーケストレータがまた呼ぶ — backpressure 制御。

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

> 🛑 **理解度チェック。** \`done\` が \`ExecOutput\` の *中のフラグ* として返されるのはなぜ? \`has_more()\` のような別メソッドではなく? その設計選択はどんな制約に応えているのか?

アトミックな呼び出し/戻り値。オーケストレータはターンごとに正確に1つのフィードバックが欲しい:「チェックポイント X まで進めた; また呼ぶかどうかはあなた次第」。\`has_more()\` を別にするとオーケストレータがターンに2回呼ぶことになり、checkpoint と has_more が食い違うバグの種類が開く。

## ステップ 5 — 非同期の準備: \`poll_execute_ready\`

ヘッダーをダウンロードするステージは即座に \`execute\` できない — ネットワーク応答を待つ。でもオーケストレータは1つの遅いステージで全パイプラインをブロックさせたくない。

\`\`\`rust
fn poll_execute_ready(&mut self, _cx: &mut Context<'_>, _input: ExecInput)
    -> Poll<Result<(), StageError>>
{
    Poll::Ready(Ok(()))  // デフォルト: 常に準備完了
}
\`\`\`

Rust の async 形式の poll メソッド。常に準備完了のステージ（多くがそう）はデフォルトを取る。I/O を待つステージはオーバーライドして、futures が動いている間 \`Poll::Pending\` を返す。

**オーケストレータは各ステージを poll する; pending なら次に進む。** どのステージも他をブロックしない。

## ステップ 6 — Commit フック: \`post_execute_commit\` / \`post_unwind_commit\`

ステージによっては、データがディスクに commit された *後* に作業をしたい場合がある — メトリクス送信、通知ブロードキャスト、古いデータの prune。これらのフックは「commit 完了したか?」のロジックで \`execute\` を汚さずにそういう仕事を許す。

\`\`\`rust
fn post_execute_commit(&mut self) -> Result<(), StageError> { Ok(()) }
fn post_unwind_commit(&mut self) -> Result<(), StageError> { Ok(()) }
\`\`\`

デフォルトは no-op、必要なステージだけオーバーライド。**ほとんどはオーバーライドしない。** opt-in のライフサイクル、必須の plumbing ではない。

## ステップ 7 — \`#[auto_impl(Box)]\`: ヘテロなステージリスト

オーケストレータはステージを \`Vec<Box<dyn Stage<...>>>\` に格納する。これには \`Box<S>\` が \`S: Stage\` のとき \`Stage\` を実装している必要がある。

属性がなければ手書きでこれを書く:

\`\`\`rust
impl<S: Stage<P>> Stage<P> for Box<S> {
    // 全6メソッドを (**self).method(...) で転送
}
\`\`\`

\`auto_impl\` は手続きマクロで、この転送を生成する。\`#[auto_impl(Box)]\` 付きで、オーケストレータは違う型のステージのリストを保持し、同じトレイトオブジェクト経由で全部呼べる。

## ここまでに組み立てたもの

各ピースが場所代を稼いでいる:

- **\`execute\` / \`unwind\`**（ステップ 3–4）— 対称性: 前進と reorg が同じ表面を使う
- **\`ExecInput\` / \`ExecOutput\`**（ステップ 4）— 再起動を跨いだ明示的な再開
- **フラグとしての \`done\`**（ステップ 4）— アトミックな呼び出し/戻り値
- **\`poll_execute_ready\`**（ステップ 5）— 非同期の準備、ノンブロッキングなスケジュール
- **\`post_*_commit\`**（ステップ 6）— opt-in のライフサイクルフック
- **\`#[auto_impl(Box)]\`**（ステップ 7）— ヘテロなステージリスト

次のレッスンは Reth の本物の10ステージパイプラインを巡ります — 各ステージが何をするか、なぜこの順序か。

## 進む前の想起

スクロールせずに:

1. なぜ \`unwind\` は \`execute\` と同じトレイトにあるのか?
2. \`done: bool\` は \`has_more()\` ではできない何を可能にするか?
3. なぜ \`poll_execute_ready\` が存在する? どのステージがオーバーライドするか?
4. \`#[auto_impl(Box)]\` は何の手書きを省いてくれるか?

どれか曖昧なら戻る。次のレッスンは Reth の本物のパイプライン。
`,
                },
                {
                  title: 'Reth のパイプライン: 10ステージ、順番付き',
                  slug: 'staged-sync-pipeline-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 10,
                  xpReward: 25,
                  content: `# Reth のパイプライン: 10ステージ、順番付き

前のレッスンで \`Stage\` トレイトを組み立てました。**さあ、本物のステージに会いに行きます。** Reth のパイプラインは固定された順序の10ステージ、それぞれが今組み立てたトレイトを実装。順序は恣意的ではない — ステージ間のすべての制約は *どのステージがいつ走るか* にエンコードされている。

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

読みながら Reth リポジトリの \`crates/stages/stages/src/stages/\` を開いてください。

## 10ステージ

| # | ステージ | 何をする | ホットループ |
| - | -------- | -------- | ------------ |
| 1 | \`HeaderStage\` | ブロックヘッダーをダウンロード | ネットワーク I/O |
| 2 | \`BodyStage\` | tx 本体 + uncle をダウンロード | ネットワーク I/O |
| 3 | \`SenderRecoveryStage\` | tx 署名から ECDSA で sender を復元 | CPU（並列） |
| 4 | \`ExecutionStage\` | Revm を走らせ、状態差分を蓄積 | CPU（Revm） |
| 5 | \`AccountHashingStage\` | アカウント変更をハッシュ化キーでソート | sort + write |
| 6 | \`StorageHashingStage\` | ストレージ変更をハッシュ化キーでソート | sort + write |
| 7 | \`MerkleStage\` | Merkle Patricia Trie ルートを更新 | tree compute |
| 8 | \`TransactionLookupStage\` | \`tx_hash → (block, index)\` インデックスを構築 | sort + write |
| 9 | \`IndexAccountHistoryStage\` + \`IndexStorageHistoryStage\` | 履歴アクセスインデックス | sort + write |
| 10 | \`FinishStage\` | 帳簿付け、確定 | なし |

> 🛑 **前のレッスンの予想と比較。** 予想にあって *ここに無い* ステージは何? 含まれていないものが含まれているものよりも雄弁な場合がある — Paradigm はこのリストに「PrunerStage」を含めないことを選んだ（pruning は別のスケジュールで走る）。

## 順序が物を言う: 3つの制約

### 制約 1 — \`MerkleStage\` はハッシング *の後* でなければならない

> 🛑 **予測。** Merkle Patricia Trie のルートには葉がハッシュ化キーでソートされている必要がある。**それがハッシングのステージ分けに何を強いるか?**

Merkle ステージはソート済みハッシュ化キーを *消費する*。だからアカウントハッシングとストレージハッシングは Merkle が始まる *前* にソートを完了して commit する必要がある。ブロック間でハッシングと Merkle 計算をインターリーブできない — Merkle ステージが処理するブロック範囲については *全ソート集合* が必要。

これが \`AccountHashingStage\`(5) と \`StorageHashingStage\`(6) が \`MerkleStage\`(7) より前にある理由。「何かの順序で」ではなく、**この特定の順序で、間に完全な commit を挟んで**。

### 制約 2 — \`AccountHashingStage\` と \`StorageHashingStage\` は *並列実行できる*

両方 \`ExecutionStage\` の出力を消費する。独立したソート済み変更集合を生成する（アカウントキーで vs ストレージキーで）。**なのにパイプラインが順次実行するのはなぜ?**

> 🔍 **\`account_hashing.rs\` と \`storage_hashing.rs\` を開く。** それぞれ最初の30行を読む。何を共有している? Reth が2スレッドに分けない実用的な理由は?

通常2つの理由が成り立つ:

1. **ディスク書き込みの競合。** どちらのステージも MDBX に書く。並列実行するとデータベースロックで競合し、計算面の利得はない。
2. **パイプラインの単純さ。** 順次実行ならオーケストレータのスケジューラはフラットなリスト。並列分岐を加えると DAG スケジューラが必要 — 複雑さが増えるが利得は限界的。

下で紹介する Frontiers 2025 のトークがまさにこのトレードオフを論じている — 何が *並列化された* かと何が順次のままかを、それぞれの理由とともに。

### 制約 3 — \`SenderRecoveryStage\` が並列化の勝ちパターン

> 🛑 **予測。** 10ステージの中で、並列化で *最も* 得をするのはどれ? なぜ?

\`SenderRecoveryStage\`。tx 署名から ECDSA で sender アドレスを復元 — 純粋な CPU、共有状態なし、embarrassingly parallel。Reth は Rayon で全 CPU コアに展開する。

なぜこのステージが特別なのか?

- **巨大なバッチサイズ。** 各ブロックは 100–300 tx; ステージ呼び出しは 100K+ ブロックを一度に処理 = 1呼び出しで 10–30M 個の署名。
- **データ依存なし。** 各署名復元は他から独立 — 前の結果を待つ必要がない。
- **純粋計算。** 復元の合間に I/O なし。

\`ExecutionStage\`(4) も CPU バウンドだが *順次の* 状態依存がある — ブロック N のストレージ書き込みがブロック N+1 の読み込みに影響。Optimistic execution（Block-STM など）なしには簡単に並列化できず、それは独自のコンセンサス的な複雑さを伴う。

## なぜ Staged Sync が勝つのか

3つの複利的な要因がアーキテクチャを説明する:

1. **バッチ化。** Sender 復元、ハッシング、Merkle ルート計算 — 全部1呼び出しで数千ブロックに償却される。
2. **ステージ内並列化。** ステージ内で（特に \`SenderRecoveryStage\`）、Rayon が全コアに作業を展開。
3. **I/O 償却。** ディスク書き込みはブロックごとではなくステージ境界の大きなソート済みバッチで起きる。

> 🛑 **最後の予測。** ノードバイノードの同期（geth の昔のデフォルト）は最大時で〜50–100 blocks/sec。Staged sync は 10K+ blocks/sec。100 倍の係数はどこから来る?

係数は単一のトリックにはない。複利の積: (1) ECDSA 復元のバッチ化＋並列化（〜10× 単独）、(2) Merkle ルートを範囲ごとに1回（ブロックごとではない）（〜10× 単独）、(3) ディスク書き込みが MDBX が効率的に書ける大きなソート済み範囲にバッチ化（〜3× 単独）。掛け合わせて〜300×; ハードウェア依存で実際は 100〜200× に着地。

## クイズ前の想起

スクロールせずに:

1. なぜ \`MerkleStage\` はハッシングの *後* でインターリーブされていないのか?
2. \`AccountHashingStage\` と \`StorageHashingStage\` は並列実行できるのに、なぜしないのか?
3. 10ステージの中で、並列化で最大の勝ちを得るのはどれ? なぜ?
4. Staged sync がブロックバイブロックより速い3つの理由?

次のレッスンはクイズ。曖昧な答えがあるなら今、想起してください。

## 📺 関連動画

\`\`\`youtube
zntRpCKHyDc | Georgios Konstantopoulos — Reth: A New Rust Ethereum Client (アーキテクチャ概論)
\`\`\`

\`\`\`youtube
z3tj8Lk_Ydo | Alexey Shekhirin & Dan Cline — Hyperoptimizing Reth (Frontiers 2025, pipeline perf)
\`\`\`
`,
                },
                {
                  title: 'クイズ: Stage トレイト + パイプラインの形は身についた?',
                  slug: 'staged-sync-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 2,
                  duration: 4,
                  xpReward: 25,
                  content: `# クイズ: Stage トレイト + パイプラインの形は身についた?

トレイトの設計とパイプラインの順序制約をカバーする4問。同じルール: **クイズはうなずきで通せない。**

2問以上落としたら、ドリルへ進む前に「\`Stage\` トレイトをステップで組み立てる」を読み直してください。`,
                  quizQuestions: [
                    {
                      question: "なぜ `unwind` は別の reorg トレイトやメソッドではなく、`Stage` トレイトの中で `execute` と同じ場所にあるのですか?",
                      options: [
                        "Reorg はまれなので様式上の選択。",
                        "Rust はトレイトに対称的なメソッドを要求する。",
                        "Reorg は通常運用の一部で、同じトレイトに置くと「範囲を前進」と「範囲を後退」が構造的に同一になり、コードベースから並行する「reorg パス」を取り除ける。",
                        "古い Reth バージョンの後方互換シム。",
                      ],
                      correctIndex: 2,
                      explanation: "Reth の設計は reorg を特殊ではなく日常として扱う。同じトレイト → 同じオーケストレータスケジューラ、同じステージ単位ロジック。reorg を別トレイトにすると各ステージを2回実装することになり、オーケストレータが前進パスと後退パスに分裂 — まさに他のクライアントが持っていて Reth が避けるよう作られた形。",
                    },
                    {
                      question: "なぜ `ExecOutput.done` は別の `has_more()` メソッドではなく、結果の中のフラグとして返されるのですか?",
                      options: [
                        "様式 — どちらでも同じ。",
                        "別の `has_more()` だとオーケストレータがターンに2回呼ぶ羽目になり（execute、それから has_more）、checkpoint と has_more が食い違うバグの種類を開く。出力の中のフラグなら呼び出しがアトミック — `execute` が状態のスナップショットを1つ返すだけ。",
                        "Rust の型システムが `has_more()` を表現できない。",
                        "非同期キャンセルを可能にするため。",
                      ],
                      correctIndex: 1,
                      explanation: "アトミックな呼び出し/戻り値が肝心。オーケストレータはターンごとに正確に1つのフィードバックが欲しい:「チェックポイント X まで進めた; また呼ぶかどうかはあなた次第」。これを2つのメソッドに分けると、その間に何が起きるかについての推論ギャップが開く。",
                    },
                    {
                      question: "なぜ `MerkleStage` は `AccountHashingStage` と `StorageHashingStage` の *後* に配置され、間に挟まれないのですか?",
                      options: [
                        "歴史的な事故; 順序は違ってもよい。",
                        "Merkle Patricia Trie のルートには葉がハッシュ化キーでソートされている必要がある。ハッシングステージがそのソートを生成し、Merkle はブロック範囲のソート集合全体を必要とするので、ハッシングは Merkle が始まる前に完了して commit しなければならない。",
                        "`MerkleStage` はハッシングより遅いので、性能のために最後。",
                        "メモリを節約するため。",
                      ],
                      correctIndex: 1,
                      explanation: "アルゴリズム上の制約: Merkle ルートの計算はソートされた葉が commit されるまで始められない。ハッシングがプロデューサ、Merkle がコンシューマ。プロデューサが完了し、それからコンシューマが走る。インターリーブすると部分的な Merkle 再計算が強制され、適切なバッチ化よりコストがかかる。",
                    },
                    {
                      question: "Reth の10ステージのうち、`SenderRecoveryStage` が並列化で最も得をする。なぜ（例えば）`ExecutionStage` ではなく、これなのか?",
                      options: [
                        "`SenderRecoveryStage` の方が処理する tx 数が多い。",
                        "Sender 復元は embarrassingly parallel: 各 ECDSA 復元が他から独立、共有状態なし。Execution には順次の状態依存がある — ブロック N のストレージ書き込みがブロック N+1 の読み込みに影響 — ので簡単には並列化できない。",
                        "Rayon は `ExecutionStage` の中では動かない。",
                        "`ExecutionStage` は既に1コアを飽和させているので、並列化で得しない。",
                      ],
                      correctIndex: 1,
                      explanation: "ECDSA 復元は署名間で独立、全コアに簡単に展開できる。Execution にはコンセンサスで決まった順次の状態依存があり、並列化には optimistic execution（Block-STM など）が必要で独自の複雑さを持つ。Sender 復元は作業の形が Rayon のモデルと完全に合うので、特別なケース。",
                    },
                  ],
                },
                {
                  title: 'ドリル: \`SenderRecoveryStage\` を端から端まで読む',
                  slug: 'staged-sync-drill-ja',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 12,
                  xpReward: 25,
                  content: `# ドリル: \`SenderRecoveryStage\` を端から端まで読む

読むのはリハーサル。**実装するのが記憶。** このドリルは「Staged Sync について読んだ」から「\`SenderRecoveryStage\` を1行ずつ読み、ソースから3つのアーキテクチャ的質問に答えた」までを連れて行きます。

## セットアップ

\`\`\`bash
git clone https://github.com/paradigmxyz/reth
cd reth
\`\`\`

ビルドする必要はない — これは読みのドリル、コンパイルのドリルではない。

## ターゲットファイル

\`crates/stages/stages/src/stages/sender_recovery.rs\`

開いてください。順番に進めます。

## ドリル 1 — \`Stage\` 実装を見つける

> 🛑 **スクロール前に予測。** \`SenderRecoveryStage::execute\` は何をする、一文で? 中の「計算」は? その周りの「I/O」は? 文を書き留めてから先へ。

ファイルを開く。\`impl<Provider> Stage<Provider> for SenderRecoveryStage\` を見つける。\`execute\` メソッドが目標。

メソッド本体をスキム。3つのセクションを特定:

1. **読み** — 入力範囲のブロックの tx エンベロープを MDBX から取得
2. **計算** — 各 tx の sender を ECDSA で復元（ここで Rayon が登場）
3. **書き** — 復元した sender を MDBX に書き戻し、checkpoint を更新

予測の文がこの読み/計算/書きの分割を捉えていなかったら、組み立てレッスンのステップ1を読み直してください — この形はパイプラインのパターン全体で、このステージ固有ではない。

## ドリル 2 — バッチループを見つける

ステージは \`ExecInput.target\` の *全* ブロックを一度に処理しない。バッチ化する。

> 🔍 **バッチループを見つける。** ファイル内で \`commit_threshold\`、\`chunk\`、\`batch\` を検索。

> 🛑 **質問（書き留めて）:** なぜバッチ化? なぜ範囲の全ブロックを一度に処理しない?

理由は2つ:

1. **メモリ。** 1000 万署名分のエンベロープバッファを RAM に保持するのは高コスト。バッチが working set を有界に保つ。
2. **Backpressure。** 各バッチ後、ステージは \`done: false\` を返してオーケストレータに「commit して次に進むか、また呼ぶか」を決めさせる。バッチ化なしだとステージは all-or-nothing で commit。

ステージ struct の \`commit_threshold\` フィールドがバッチサイズを制御。**デフォルト値を見つけて** — これは本番でチューニングできる値。

## ドリル 3 — \`done: false\` が返される箇所を見つける

メソッド本体で \`done: false\` または \`ExecOutput { done\` を検索。

> 🛑 **質問:** \`done\` が \`true\` に切り替わる条件は?

ステージが \`ExecInput.target\` までの全ブロックを処理したとき（この範囲でこれ以上仕事がない）。それまで \`done: false\` がオーケストレータに「次のバッチでまた呼んで」と伝える。true になったらオーケストレータは次のステージに進む。

## ドリル 4 — Rayon の並列化を見つける

ファイル内で \`par_iter\` または \`rayon::\` を検索。

> 🔍 **質問:** Rayon はどこで登場? どのデータに?

内側の ECDSA 復元ループ — 通常こんな形:

\`\`\`rust
chunk.par_iter()
    .map(|tx| recover_signer(tx))
    .collect::<Vec<_>>()
\`\`\`

各 tx の sender 復元は独立 → コア間に展開しても安全 → Rayon が仕事をする。

> 🛑 **最終質問（答えを書き留めて）:** チェーンが1ブロックあたり 20 倍の tx を持つようになったがコア数は同じだとしたら、\`SenderRecoveryStage\` は *20 倍* 遅くなるか? なぜ/なぜそうでない?

サブ線形にスケールする。1ブロックあたりの tx が増えると各 Rayon バッチが大きくなるがコア数は同じ — 実時間は総署名数に対して概ね線形に増えるが、バッチごとのオーバーヘッド（chunking、チャンネルの調整）はより多くの仕事に償却されるので、総スループットは少し改善。**ネット: 20倍の署名で〜15–18倍遅い**、キャッシュの振る舞い次第。

## レッスン終了の想起

スクロールせずに、自分の言葉で:

1. \`SenderRecoveryStage::execute\` の読み/計算/書きの構造は?
2. \`commit_threshold\` は何を制御する? なぜ存在するのか?
3. なぜ Rayon の並列化は ECDSA 復元に適用され、（例えば）MDBX 書き込みには適用されないのか?
4. なぜ \`done: false\` が戻り値の状態として存在するのか? 全 \`execute\` が範囲全体を完了する必要があったら何が壊れるか?

どれか曖昧なら、レッスンはまだあなたを離しません。関連する組み立てステップを読み直すか、ファイルを再度開いてください。

このドリルの後、Paradigm が Reth を同期させているのと同じコードを読めるようになりました。`,
                },
                {
                  title: 'Rust：ライフタイム・Box・Arc・dyn Trait',
                  slug: 'rust-lifetimes-arc-dyn-ja',
                  type: 'CONTENT',
                  sortOrder: 4,
                  duration: 15,
                  xpReward: 30,
                  content: `# Rust：ライフタイム・Box・Arc・dyn Trait

ExEx・Reth SDKのコードを読むのに必要な、Rustの **「上級だが実は単純」** な4つの機能。**このレッスンはあなたを試すもので、教えるものではない** — 予測プロンプトでつまずくなら、ギャップが本物で、埋める価値がある。

> 🛑 **コールドスタート: 各概念を一文で定義してください。** スクロールせずに：
> - \`'a\`（ライフタイムパラメータ）
> - \`'static\`
> - \`Box<T>\`
> - \`Arc<T>\` (\`Rc<T>\` との違い)
> - \`Mutex<T>\`
> - \`dyn Trait\`
>
> 2 つ以上つまずいたら、このレッスンは存在価値あり。すらすら答えられたら、レッスンはあなたの定義が **本当に正しいか** をテストします。

## 1. ライフタイム \`'a\`

ライフタイムは「**この借用は何のスコープと同じくらい生きるか**」をコンパイラに教える注釈です。

\`\`\`rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() >= y.len() { x } else { y }
}
\`\`\`

- \`'a\` は「ある寿命」というラベル
- 引数2つと戻り値が **同じ \`'a\`** ＝ 戻りの参照は引数のどちらかと同じ寿命
- 多くの場合、コンパイラが推論してくれる（**省略可**）

> 🛑 **理解度チェック。** \`longest\` から \`'a\` 注釈を削除してください。コンパイラは何のエラーを出す? 具体的に — 引用されるルール名は何?

### \`'static\`

\`'static\` は **「プログラム終了まで生きる」** という特別なライフタイム。文字列リテラル \`"hello"\` の型は \`&'static str\` です。

\`\`\`rust
let s: &'static str = "hello";
\`\`\`

ExExなど **「いつ終わるか分からないバックグラウンドタスク」** には \`'static\` 制約が頻出します。

> 🛑 **予測。** \`tokio::spawn\` に渡すクロージャが \`'static\` を必要とするのはいつ? なぜ? 続ける前に答えてください — この境界は今後読むすべての ExEx ファイルに出てきます。

## 2. \`Box<T>\` — ヒープに置く

スタックではなくヒープに値を置きたいとき、\`Box<T>\` で包みます。

\`\`\`rust
let boxed: Box<i64> = Box::new(42);
println!("{}", *boxed);   // 42
\`\`\`

主な用途：

- **再帰的なデータ構造**（連結リストなど）でサイズを固定したい
- **動的サイズ** の値（\`dyn Trait\`）を持ちたい
- 大きい値を **コピーではなくムーブ** で安く扱いたい

> 🛑 **予測。** \`Box\` がない場合、\`enum List { Cons(i32, List), Nil }\` を書けないのはなぜ? コンパイラの不満を文字に起こしてください。

## 3. \`Rc<T>\` と \`Arc<T>\` — 所有権の共有

Rustの所有権ルールは「ただ一人のオーナー」が原則。でも **複数の場所から同じ値を共有したい** ときがあります。

| 型 | 用途 |
| :--- | :--- |
| \`Rc<T>\` | シングルスレッドで参照カウント共有 |
| \`Arc<T>\` | **マルチスレッド対応**（Atomic参照カウント） |

\`\`\`rust
use std::sync::Arc;

let shared = Arc::new(String::from("hello"));
let clone1 = Arc::clone(&shared);   // 参照カウント+1
let clone2 = Arc::clone(&shared);   // 参照カウント+2

// 別スレッドへ送れる（Arc は Send）
std::thread::spawn(move || println!("{}", clone1));
\`\`\`

**Reth/ExExでは \`Arc<...>\` だらけ** になります。「複数のタスクが同じデータを読む」のが典型的な場面だからです。

> 🛑 **理解度チェック。** \`Arc::clone(&x)\` は内部の \`T\` をディープコピーしません。では正確に **何を** コピーする? コストは? なぜ "Arc" の "A" は "Atomic" なのか?

## 4. \`Mutex\` / \`RwLock\` — 共有 + 書き換え

\`Arc<T>\` だけだと **読み取り専用の共有** です。書き換えたい場合は \`Mutex\` / \`RwLock\` で包みます。

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

> 🛑 **予測。** \`.lock().unwrap()\` は何で panic する? それはいつ起きる? (ヒント: 知らなければ "poisoning" で検索。) **Reth コードには \`.lock().unwrap()\` が至る所にある** — いつクラッシュしうるか理解しておくこと。

## 5. \`dyn Trait\` — 動的ディスパッチ

トレイトオブジェクト。**「実行時にメソッドを解決する」** という意味で、Java/TS の interface に近い動作になります。

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

### \`impl Trait\` vs \`dyn Trait\`

| 構文 | 意味 |
| :--- | :--- |
| \`impl Trait\` | 静的ディスパッチ（コンパイル時に型確定） |
| \`dyn Trait\` | 動的ディスパッチ（実行時に解決、Boxが必要） |

性能は \`impl\` の方が速いですが、ヘテロなコレクション（\`Vec<Box<dyn Trait>>\`）が必要なときは \`dyn\` を使います。

> 🛑 **理解度チェック。** \`Box<dyn Greet>\` は呼び出し地点で \`Box<En>\` より高い。**コストは正確にどこにある?** vtable とは何? 答えられないなら、動的ディスパッチをまだ理解していません — 読み直し。

## 6. これからExExコードで見る形

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

> 🛑 **止まる。スクロール前にこのシグネチャを頭の中で注釈してください。** どこがジェネリクス? どこがトレイト境界? 内部で共有所有権を使うのは? 暗黙のライフタイムは?

- \`Node: FullNodeComponents\` ：トレイト境界
- \`ExExContext<Node>\` ：ノードバンドルにジェネリック
- 内部では \`Arc<...>\` でコンポーネントが共有
- ライフタイムの注釈は省略されているが、\`'static\` が要求される

## まとめ

| 機能 | 一言 |
| :--- | :--- |
| \`'a\` / \`'static\` | 借用がどれだけ生きるか |
| \`Box<T>\` | ヒープ確保 |
| \`Rc<T>\` / \`Arc<T>\` | 所有権の共有（Arcはスレッド対応） |
| \`Mutex<T>\` | 共有データの書き換え |
| \`dyn Trait\` | 実行時のメソッド解決 |

> 最終チェック: タブを閉じて、ExEx の \`my_exex\` シグネチャを記憶から書き出してください。書けないなら、語彙をまだ所有していません — 開き直し。次のレッスンは ExEx を詳細に読みます; カンニングペーパーなしで各概念が必要になります。`,
                },
                {
                  title: 'ExEx API をステップで組み立てる',
                  slug: 'reth-exex-buildup-ja',
                  type: 'CONTENT',
                  sortOrder: 5,
                  duration: 10,
                  xpReward: 25,
                  content: `# ExEx API をステップで組み立てる

**ExEx（Execution Extension）** は Reth が提供する「実行ループに Rust コードを注入する」仕組みです。これでノード速度のインデクサ・MEV ボット・リアルタイムリスクエンジンを **チェーン本体と同じプロセス内で** 構築できます。

ただ API は重そうな部分が4つある: init/run の分割、3 つのバリアントを持つ通知 *enum*、prune ヒント用のイベントチャンネル、ノードビルダーへの install メソッド。素のまま読むと一度に 4 つのアイデアが降ってくる。

このレッスンは、最も素朴な「ブロックリスナー」から API を積み上げます。終わりには本物の最小 ExEx の全ピースを自分で組み立てたことになります — 次レッスンがそれを詳細に読みます。

> 📂 **別タブで \`paradigmxyz/reth-exex-examples/minimal\` を開いてください。** これが組み立て先のファイル。

## ステップ 0 — 素朴なインデクサ: RPC をポーリングする別プロセス

何も考えずに書くと、Ethereum のインデックスはこんな形:

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

別プロセス。1秒ごとに RPC をポーリング。新ブロックがあればインデックス。

> 🛑 **予測。** スクロールせずに: この素朴な設計が Reth の中で動くより *大幅に劣る* 理由を 3 つ挙げてください。（ヒント: 各々が *別種の* 問題。）

3つ:

1. **レイテンシ。** RPC ポーリングはリクエスト/レスポンスのオーバーヘッド。インデクサは tip から数秒遅れる — MEV、リスク、リアルタイム UX には使えない。
2. **アトミック性。** Reth は新ブロックを *先に* ディスクにコミットし、そのあとあなたのインデクサが見る。Reth はブロックを持っていてあなたのコードがまだ処理していない期間がある。あなたのコードが派生ビューの正典なら、その期間が race condition。
3. **Reorg。** ポーリングは \`head = N\` を見て、後で \`head = N\`（違うブロック）を見る。インデクサは外側で reorg を検出して扱う必要がある — Reth 自体より弱い情報で。

修正方針: **Reth と同じプロセスで動く。** ブロックがコミットされた瞬間に通知される、フルチェーンコンテキスト付きで。

## ステップ 1 — 最初の試案: ブロックごとのコールバック

素朴なインプロセス API:

\`\`\`rust
fn on_new_block<F: Fn(&Block)>(reth: &mut Reth, callback: F) {
    reth.add_listener(callback);
}
\`\`\`

Reth が新ブロックごとにクロージャを呼ぶ。シンプル。

> 🛑 **予測。** 何が足りない?（大きく2つ。）

2つ:

1. **Reorg は append-only ではない。** 「新ブロック追加」だけのコールバックは「ブロック N のハッシュ X が ハッシュ Y に置換された」を表現できない。インデクサの導出状態は reorg のたびに静かに壊れる。
2. **Reth に「終わった」を伝える方法がない。** インデクサがブロック N を処理中なら、Reth はブロック N-100,000 のデータを prune していいのか分からない。このシグナルなしでは **Reth は何も捨てられない。**

## ステップ 2 — リッチな通知: 3 つのチェーンイベント

裸のコールバックを、チェーンに起こりうる 3 つのことを捉える enum に置き換える:

\`\`\`rust
enum ExExNotification {
    ChainCommitted { new: Chain },             // canonical ブロック追加
    ChainReorged   { old: Chain, new: Chain }, // old が new に置換
    ChainReverted  { old: Chain },             // 削除（置換なし）
}
\`\`\`

各バリアントが、インデクサが派生状態を undo / redo するのに十分な情報を運ぶ:

- **\`ChainCommitted { new }\`** — 新しいブロックの状態をインデックスに append。
- **\`ChainReorged { old, new }\`** — \`old\` の状態を undo し、\`new\` の状態を apply。アトミックなスワップ。
- **\`ChainReverted { old }\`** — \`old\` の状態を undo して待つ。Reth は新しい tip を選んだら後続の \`ChainCommitted\` を送る。

> 🛑 **理解度チェック。** トランザクションを \`HashMap\` にインデックスしている。\`ChainCommitted\` だけ扱う。チェーンが 5 ブロック深く reorg した。**HashMap の何がおかしくなる?** 失敗モードを 2 文で具体的に書いてください。

HashMap には *古い* チェーンのトランザクションが入っているが、canonical チェーンは *新しい* チェーン。インデックスの後の読み込みは canonical 上に存在しないトランザクションを返す — phantom-data バグ。さらに悪いことに: *新しい* チェーンのトランザクションはインデックスされなかった（\`ChainCommitted\` を見ていない、無視した \`ChainReorged\` を見た）。

これが **ExEx の #1 バグ。** 3 バリアント enum はこれを防ぐために存在する。

## ステップ 3 — Reth に「終わった」と伝える: \`FinishedHeight\`

インデクサがブロック N を処理し終わったら、Reth はそれを知る必要がある。さもないと N 以下を安全に prune できない。

\`\`\`rust
ctx.events.send(ExExEvent::FinishedHeight(block_number_hash))?;
\`\`\`

\`ctx.events\` は Reth への書き込み専用チャンネル。ハンドラがブロック（あるいはチェーン）を終えるたびに \`FinishedHeight(N)\` を送る。Reth はインストールされたすべての ExEx の最小値を集約し、その下を prune する。

> 🛑 **ディスク帰結を予測。** \`FinishedHeight\` イベントなしで ExEx をリリースしたとする。半年後、ノードはブロック 21M。ExEx なしノードと比較してディスク使用量はどうなる? なぜ?

ノードは Reth が通常 prune するであろう履歴をすべて保持する — ExEx が後で読みたいかもしれないものを安全に prune できないから。**ディスク使用量が複利で膨らむ。** \`FinishedHeight\` を忘れると、「無害なインデクサ」が偶然 Reth をフルアーカイブノードにする。

## ステップ 4 — 通知ストリーム: コールバックではなく非同期 pull

コールバックなら Reth がブロックごとにあなたの遅いコードを待つことになる。良い形: 通知をストリームに push、ハンドラが準備ができたときに pull:

\`\`\`rust
while let Some(notification) = ctx.notifications.try_next().await? {
    // 自分のペースで処理
}
\`\`\`

\`ctx.notifications\` は \`ExExNotification\` の \`Stream\`。\`try_next\` は async — ハンドラは Reth と同じ async ランタイムで動く。**Reth の進捗があなたのインデックス速度に縛られない**、でもハンドラはすべてのイベントを順番に観測する。

Reth が停止するかチャンネルが閉じるとループはきれいに \`Ok(())\` で抜ける。

## ステップ 5 — init/run の分割

ユーザーは async ループの開始前に *同期的なセットアップ*（ファイル開放、DB 初期化、バッファ確保）をしたい。単一の \`async fn\` だとこのセットアップを future の中に押し込むことになり、明瞭に推論できなくなる:

\`\`\`rust
async fn exex_init<Node: FullNodeComponents>(
    ctx: ExExContext<Node>,
) -> eyre::Result<impl Future<Output = eyre::Result<()>>> {
    // 同期的セットアップはここ
    Ok(exex(ctx))  // 長時間動く future を返す
}
\`\`\`

関数2つ:

- **\`exex_init\`** — ノード起動時に *1度* 走る。同期的セットアップ。future を返す。
- **\`exex\`**（その future）— *永続的に*（または停止まで）走る。通知ストリームを poll する。

> 🛑 **予測。** init/run の分割がなぜ必要なのか? ファイル開放を \`exex_init\` ではなく \`exex\` に入れると、どんな具体的なバグが発生する?

Reth は通知のプッシュを始める前に ExEx が生きていることを *確認する* 必要がある。\`File::open(...)\` を \`exex\` に入れると、Reth がすでに通知をバッファし始めた *後* にファイル開放が起きる — 失敗（権限なし、パス不存在）すると Reth は ExEx が健康だと思っている間に通知が積み上がる。init/run の分割によって Reth は「ExEx が起動できなかった」と「ExEx が動いた後でクラッシュした」を区別できる。

## ステップ 6 — \`install_exex\`: 複数の拡張

\`main\` で ExEx をノードビルダーに配線する:

\`\`\`rust
.install_exex("MyIndexer", exex_init)
\`\`\`

第 1 引数は名前（メトリクスとログで使われる）、第 2 引数は init 関数。**\`.install_exex(...)\` を複数チェインできる** — 各 ExEx が独立した通知ストリームと \`FinishedHeight\` チャンネルを持つ。Pruner が集約する。

## ここまでに組み立てたもの

各ピースが場所代を稼いでいる:

- **3 バリアントの \`ExExNotification\`**（ステップ 2）— append、reorg、revert を扱う
- **\`FinishedHeight\` イベント**（ステップ 3）— opt-in の prune、ディスク膨張を防ぐ
- **ストリーム pull の通知**（ステップ 4）— Reth がハンドラでブロックしない
- **init/run の分割**（ステップ 5）— async ループ前の同期的セットアップ
- **\`install_exex\`**（ステップ 6）— 複数の拡張、それぞれ独立したストリーム

次のレッスンは最小 ExEx — \`main.rs\` の約 40 行 — を読み、6 つのピースが実コードでどう組み合わさるかを見せる。

## 進む前の想起

スクロールせずに:

1. なぜ API はコールバックではなくストリームで通知を push するのか?
2. \`ExExNotification\` の 3 バリアントは何で、なぜすべて必要なのか?
3. \`FinishedHeight\` は Reth に何を伝える? 忘れたときのディスク帰結は?
4. なぜ API は \`exex_init\`（同期）と \`exex\`（async future）に分かれているのか?

どれか曖昧なら戻る。次のレッスンは本物の最小 ExEx を詳細に読みます。
`,
                },
                {
                  title: '最小 ExEx を 1 行ずつ読む',
                  slug: 'reth-exex-walkthrough-ja',
                  type: 'CONTENT',
                  sortOrder: 6,
                  duration: 10,
                  xpReward: 25,
                  content: `# 最小 ExEx を 1 行ずつ読む

前のレッスンで API を組み立てました。**さあ、本物のコードで見ます。** これは [\`paradigmxyz/reth-exex-examples/minimal\`](https://github.com/paradigmxyz/reth-exex-examples/tree/main/minimal) の \`main.rs\` 全体 — 本番形の動く ExEx が約 40 行。

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

40 行。各行が前レッスンの組み立てステップに対応している。

## 1 行ずつ歩く

### \`exex_init\` — init/run の分割（ステップ 5）

\`\`\`rust
async fn exex_init<Node: FullNodeComponents>(
    ctx: ExExContext<Node>,
) -> eyre::Result<impl Future<Output = eyre::Result<()>>> {
    Ok(exex(ctx))
}
\`\`\`

\`exex_init\` はノード起動時に *1 度* 呼ばれる。Reth が \`ExExContext\`（\`notifications\`、\`events\`、ノードアクセスを含む）を渡してくる。あなたは永続的に poll される future を返す。

この最小 ExEx は同期的セットアップを何もしない — \`ctx\` を \`exex\` にそのまま渡すだけ。**本物の ExEx** で \`File::open(...)\` や \`Database::connect(...)\` が必要なら、その仕事は future を返す *前* の \`exex_init\` 内で行う。

> 🔍 **リポジトリで確認。** \`tracking-state\` 例を開く。\`minimal\` がしていない何を \`exex_init\` でしているか?

### \`exex\` — 長時間動く future

\`\`\`rust
async fn exex<Node: FullNodeComponents>(mut ctx: ExExContext<Node>) -> eyre::Result<()> {
    while let Some(notification) = ctx.notifications.try_next().await? {
        // ...
    }
    Ok(())
}
\`\`\`

ループ。\`ctx.notifications.try_next()\` は async — 通知がないとき、ランタイムはタスクを park して他の ExEx や Reth 自体を走らせる。協調的並行、ブロッキングなし。

チャンネルが閉じる（ノード停止）と、\`try_next()\` は \`Ok(None)\` を返し、\`while let\` が抜け、関数は \`Ok(())\` を返す。きれいな終了。

### 3 アームの match（ステップ 2）

\`\`\`rust
match &notification {
    ExExNotification::ChainCommitted { new } => { /* ... */ }
    ExExNotification::ChainReorged { old, new } => { /* ... */ }
    ExExNotification::ChainReverted { old } => { /* ... */ }
};
\`\`\`

これが load-bearing な判断。**3 アームすべてが必要** — おもちゃでない ExEx には:

- **\`ChainReorged\` 欠落** → 派生状態に *古い* チェーンのデータが残り続ける; 新 canonical チェーンのデータは欠落（\`ChainCommitted\` が来ないから）。
- **\`ChainReverted\` 欠落** → reorg トリガー後、Reth が新 tip を選ぶ前の状態で、あなたの状態が canonical より 1 チェーン進んでいて巻き戻し方法がない。

最小 ExEx は各バリアントをログするだけ; 学習用には有益だが実用ではない。**本物の ExEx は派生状態を更新する** — そして 3 アームを正しく扱うことが、動くインデクサと phantom-data バグの境界。

> 🛑 **理解度チェック。** \`ChainReorged\` アームを読む。\`old\` と \`new\` 両方が渡される。**なぜ両方?** \`new\`（reorg 後の tip）だけではダメか?

インデクサは \`new\` を *apply* する前に \`old\` の状態変更を *undo* する必要があるから。\`new\` だけだと、古いチェーンの効果を派生状態から巻き戻せない — そして静かに二重カウントするか取りこぼす。

### \`committed_chain()\` と \`FinishedHeight\`（ステップ 3）

\`\`\`rust
if let Some(committed_chain) = notification.committed_chain() {
    ctx.events.send(ExExEvent::FinishedHeight(committed_chain.tip().num_hash()))?;
}
\`\`\`

知っておくべき 2 メソッド:

- **\`notification.committed_chain()\`** — \`ChainCommitted\` *と* \`ChainReorged\`（new チェーン）に \`Some(Chain)\` を、\`ChainReverted\` には \`None\` を返す。**「この通知後の canonical 状態は何か」のアクセサ。**
- **\`ctx.events.send(ExExEvent::FinishedHeight(...))\`** — Reth の pruner に「このブロックまで処理した、これ以下を prune してよい」を伝える。

**commit 形の通知ごとに \`FinishedHeight\` を送る。** 忘れると、ノードはアーカイブデータを永久に蓄積する（前レッスンのステップ 3 のディスク膨張シナリオ）。

> 🔍 **検証。** \`reth-exex\` の \`notification.committed_chain()\` のソースを開く。今説明した 3 ケースの動作を確認。

### \`main\`: ExEx をノードに配線

\`\`\`rust
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

これは「通常の Reth ノード、+ 拡張 1 つ」。\`install_exex("Minimal", exex_init)\` が ExEx 固有の唯一の行。**複数の \`install_exex\` をスタック** すれば拡張をコンポーズできる。

## 本物の ExEx は何をやっているか

同じリポジトリにより本格的な例があります:

| 例 | 内容 |
| :--- | :--- |
| \`backfill\` | 起動時に過去ブロックを自分のハンドラに再生 |
| \`in_memory_state\` | 各ブロックから派生したカスタムインデックス状態を保持 |
| \`tracking-state\` | ExEx 内部状態を別 DB に永続化（再起動が安い） |
| \`rollup\` | ExEx フックだけで最小ロールアップを実装 |

> 🔍 **\`rollup\` を開いてください。** state 変更をコミットしている箇所まで読む。**ExEx としてのロールアップ — その意味を一瞬考えてみてください。** これがアーキテクチャ的なアンロック: ロールアップを作るのに Reth を fork する必要はなく、拡張として作れる。

## クイズ前の想起

スクロールせずに:

1. \`exex_init\` ができて \`exex\`（future）にできないことは?
2. なぜおもちゃでない ExEx は 3 つの通知バリアント全部を扱う必要があるのか?
3. \`notification.committed_chain()\` は 3 つのバリアントそれぞれに何を返す?
4. 「ExEx としてのロールアップ」は finality と data availability を何に頼っているか?

次のレッスンはクイズ。曖昧な答えがあるなら今、想起してください。
`,
                },
                {
                  title: 'クイズ: ExEx API は身についた?',
                  slug: 'reth-exex-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 7,
                  duration: 4,
                  xpReward: 25,
                  content: `# クイズ: ExEx API は身についた?

API 設計と、その設計が防ぐ失敗モードをカバーする 4 問。同じルール: **クイズはうなずきで通せない。**

2 問以上落としたら、ドリルへ進む前に「ExEx API をステップで組み立てる」を読み直してください。`,
                  quizQuestions: [
                    {
                      question: "ExEx API が単一の `async fn` ではなく init/run の分割（`exex_init` が future を返す）になっているのはなぜですか?",
                      options: [
                        "Rust が `async` トレイトにセットアップ関数を要求するため。",
                        "古い Reth バージョンの後方互換シム。",
                        "init/run なら長時間の通知ループが始まる前に同期的セットアップ（ファイル開放、DB 初期化）ができる。Reth は「ExEx が起動できなかった」と「ExEx が動いた後でクラッシュした」を区別できる。",
                        "性能 — 分割した関数の方がインライン化される。",
                      ],
                      correctIndex: 2,
                      explanation: "単一の `async fn` だとセットアップが future の中に押し込まれる — 「ExEx が起動しなかった」と「ループ中にクラッシュした」が区別不能になる。init/run の分割は Reth に「この拡張は起動して準備完了」のクリーンな確認の瞬間を与える、通知が始まる前に。",
                    },
                    {
                      question: "ExEx を実装し、`ChainCommitted` だけ扱い、`ChainReorged` と `ChainReverted` を無視する。チェーンが 5 ブロック深く reorg した。派生状態に何が起きる?",
                      options: [
                        "prune されるべき余分な 5 ブロックが含まれる。",
                        "*古い* チェーン（もう canonical でないセグメント）のデータを含み、*同時に* *新しい* チェーンのデータが欠落（置換されたセグメントには `ChainCommitted` が来ない）。Phantom データと欠落データが同時。",
                        "panic でクラッシュする。",
                        "状態は無事; Reth が新チェーン用に `ChainCommitted` を再送する。",
                      ],
                      correctIndex: 1,
                      explanation: "これが ExEx の #1 バグ。`ChainReorged` は `old` と `new` を両方運ぶので、インデクサが `old` の効果を undo して `new` を apply できる。無視すると両半分とも間違う — 古いデータがインデックスされたまま、新しいデータは決してインデックスされない。",
                    },
                    {
                      question: "`ctx.events.send(ExExEvent::FinishedHeight(N))` は Reth に何を伝えるのですか?",
                      options: [
                        "「ブロック N より下の通知を送らないで。」",
                        "「ブロック N まで処理した; N より下の歴史的状態は安全に prune してよい。」Reth はインストールされたすべての ExEx の最小値を集約して prune の判断に使う。",
                        "「ブロック N は不正 — 捨てて。」",
                        "「次の再起動でブロック N から再開して。」",
                      ],
                      correctIndex: 1,
                      explanation: "`FinishedHeight` なしでは、Reth は ExEx が後で読みたいかもしれないものを安全に prune できない — 保守的にすべてを永久に保持する。このイベントを忘れると「無害なインデクサ」が偶然のアーカイブノードに変わる。",
                    },
                    {
                      question: "ExEx ベースのインデクサは別プロセスで RPC をポーリングするインデクサより速い。*主な* アーキテクチャ的理由は?",
                      options: [
                        "インデクサが速い CPU で動いている。",
                        "同じプロセス、I/O ラウンドトリップなし。Reth がブロックをコミットした瞬間に ExEx が通知を受け取る — RPC リクエスト/レスポンスもポーリング間隔もアトミック性のギャップもない。さらに Reth が既に計算したフルチェーンコンテキスト（reorg 構造を含む）。",
                        "ExEx は EVM 実行ステップをスキップする。",
                        "RPC にはレートリミッターがある; ExEx にはない。",
                      ],
                      correctIndex: 1,
                      explanation: "アーキテクチャ的アンロックは co-location（同居）。RPC ポーリング = 最良で〜1 秒のラグ、負荷時はもっと長く、reorg は二次情報。ExEx = ゼロラグ、フルコンテキスト、IPC なし。",
                    },
                  ],
                },
                {
                  title: 'ドリル: reorg-safe なインデクサを作る',
                  slug: 'reth-exex-drill-ja',
                  type: 'CONTENT',
                  sortOrder: 8,
                  duration: 12,
                  xpReward: 25,
                  content: `# ドリル: reorg-safe なインデクサを作る

読むのはリハーサル。**実装するのが記憶。** このドリルは「ExEx について読んだ」から「自分で書いて reorg を正しくサバイブするのを観察した」までを連れて行きます。

## セットアップ

\`\`\`bash
git clone https://github.com/paradigmxyz/reth-exex-examples
cd reth-exex-examples/minimal
cargo build
\`\`\`

ビルドが失敗したら、進む前に直してください。

## ドリル 1 — ノードに対して minimal ExEx を実行

既存の Reth ノードが必要、あるいは小さなテストネット用に \`--chain holesky\`（初期同期が速く、reorg 頻度も高い）:

\`\`\`bash
cargo run -- node --chain holesky
\`\`\`

> 🛑 **質問（書き留めて）:** 最初の 10 ブロックで何がログされる? すべてのログ行が \`ChainCommitted\` か、それとも他のバリアントも見える?

新規同期では、すべてのブロックで \`ChainCommitted\` が見える。\`ChainReorged\` と \`ChainReverted\` はもっと珍しい — 実際のチェーン不一致が必要で、holesky はメインネットより頻繁に生成する（ハッシュパワーが低い → contested fork が増える）。

## ドリル 2 — トランザクションカウンターを追加

\`ChainCommitted\` アームを修正してブロックごとの tx 数を出力:

\`\`\`rust
ExExNotification::ChainCommitted { new } => {
    let total: usize = new.blocks().values()
        .map(|b| b.body.transactions.len())
        .sum();
    info!(committed_chain = ?new.range(), tx_count = total, "Received commit");
}
\`\`\`

> 🛑 **予測。** 再実行。holesky のブロックあたり平均 tx 数は? メインネットでは?

Holesky: 低い — 通常 5〜20 tx/ブロック、たまに 0。メインネット: 100〜300、ブロックの満杯度次第。**ゼロレイテンシで本物のチェーンデータを読んでいることになります。**

## ドリル 3 — reorg-safe な HashMap を追加

各アドレスが送ったトランザクション数を追跡する。**reorg を正しくサバイブする** — それが要点。

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

（API 名はあなたのローカル reth の現状に合わせて調整してください — \`block.body.transactions()\` vs \`.transactions\`、\`tx.signer()\` vs \`tx.recover_signer()\`。要点は *構造*、正確な識別子ではない。）

> 🛑 **質問:** 3 アームを読む。**任意の通知シーケンスの後で \`tx_count\` が正しいために保たれるべき不変条件は?**

**各 \`Address\` について、カウント = (canonical チェーンで送られた tx 数) − (commit され revert されたセグメントで送られた tx 数)。** Reorg アームがコツ: \`old\` を undo して \`new\` を apply、1 通知でアトミックに。

\`ChainReverted\` で \`-=\` を忘れると、カウントが永久に膨らむ。\`ChainReorged\` で \`-=\` を忘れると、カウントは canonical ではなく古いチェーンと新しいチェーンの和を表す。

## ドリル 4 — Reorg ハンドリングを検証

Holesky は時々 reorg を生成する。数時間動かす。

> 🔍 **Reorg を見つける。** ログで「Received reorg」を検索。出てきたら:
>
> 1. \`from_chain\` と \`to_chain\` の範囲をメモ。
> 2. Reorg ログ行 *の前に* 高 tx アドレスの \`tx_count\` をスポットチェック — カウントを記録。
> 3. Reorg ログ行 *の後に* 再度記録。
> 4. 手動で確認: そのアドレスでの古いチェーンと新しいチェーンセグメントの差と一致してカウントが変化したか?

Yes なら — インデクサは reorg-safe。**本番グレードのインデクサ（goldsky、the graph など）が出荷しているのと同種のコードを書いた。**

> 🛑 **最終質問:** \`ChainReorged\` アームでの操作の *順序* がなぜ重要か? 具体的に: \`new\` を apply してから \`old\` を undo しても問題ないか?

問題になるケースは厳密に 1 つ: \`old\` と \`new\` が共通プレフィックスを共有していて、ランタイムがそれを *両方から省く* 場合 — でも実装が共有ブロックを両方に含めると、\`new\` を先に apply すると二重カウントしてから \`old\` の undo で 0 にする。慣習は **\`old\` を先に undo してから \`new\` を apply** で、Reth 自体が reorg を処理する時系列順序と一致する。

## レッスン終了の想起

スクロールせずに、自分の言葉で:

1. \`ChainReorged\` を \`old\` と \`new\` 両方を同じ通知で扱う論理的根拠は?
2. 3 アームのパターンが派生状態で保持する不変条件は?
3. \`FinishedHeight\` を忘れると、ディスク上で時間と共に何が膨らむか?
4. ExEx が別プロセスの RPC ポーリングインデクサに勝つ唯一のアーキテクチャ的理由は?

このドリルの後、reorg-safe なノード速度のインデクサを出荷したことになります。**同じ道具で MEV ボット、リアルタイムリスクエンジン、ロールアップが作れる。**`,
                },
                {
                  title: 'ノードビルダー API をステップで組み立てる',
                  slug: 'reth-sdk-buildup-ja',
                  type: 'CONTENT',
                  sortOrder: 9,
                  duration: 10,
                  xpReward: 25,
                  content: `# ノードビルダー API をステップで組み立てる

ExEx は既存の Ethereum ノードを拡張するもの。**Reth SDK** はコンポーネントを組み立てて *自前の* App-chain を Rust で構築できる仕組み。これが「purpose-built EVM L1」が thesis から **コンパイル可能なバイナリ** になる場所。

ただ API は流れるような呼び出し — \`with_types\`、\`with_components\`、\`with_add_ons\`、\`launch\` — が並んで、それぞれがアーキテクチャ的に違うことを決めている。このレッスンは「最も素朴に動くもの」から積み上げて、各メソッドがなぜ場所代を稼ぐかを見せる。

終わりにはこれの全ピースを自分で組み立てたことになります:

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

> 📂 **別タブで \`paradigmxyz/reth/examples/custom-node-components/src/main.rs\` を開いてください。** これが組み立て先のファイル。

## ステップ 0 — 素朴な App-chain: Reth 全体を fork する

何も考えずにカスタム L1 を出すならこう:

\`\`\`bash
git clone https://github.com/paradigmxyz/reth my-chain
cd my-chain
# 好きなように crates/ を編集
cargo build
\`\`\`

200K 行以上の Reth を全部 fork、必要箇所を編集してリリース。

> 🛑 **予測。** スクロールせずに: 何年もチェーンを運用するなら、この素朴なアプローチが *破滅的* な理由を 3 つ挙げてください。（ヒント: 各々が *別種の* コスト。）

3つ:

1. **アップストリームの分岐。** Paradigm は Reth のアップデートを毎週リリース。あなたの fork はそれをきれいに取り込む方法がない — リリースのたびに rebase 地獄。半年も経つと安全にアップグレードできない。
2. **欲しくない表面積。** *1 つの* サブシステムを変えたいから fork した。でも今や *すべて* を所有している — 読んだことのないコードのバグ、追跡しなければいけないセキュリティパッチ、決して触らないけれどビルドし続けるモジュール。
3. **レビューコスト。** レビュアーには、あなたが実際に変更した 50 行と触っていない 200K 行の区別がつかない。監査、セキュリティ会社、規制当局 — 全員が fork を新しいクライアントとして扱うことになる。

修正方針: **fork するな。組み立てろ。** 実際に変えたいサブシステムだけ上書きし、残りは Reth をライブラリとして依存。

## ステップ 1 — 差し替えポイントを特定する

実際にカスタマイズしたくなるサブシステムは何か?

> 🛑 **予測。** Tempo（payments 特化型 L1）を作るなら、Reth のどのサブシステムを差し替える?（ヒント: 候補は 4〜6 個。）

実本番のチェーンに登場する候補:

- **Pool** — 受付ルール、優先レーン（Tempo は payments 優先）
- **Network** — ピアポリシー、プライベートサブネット
- **Executor** — カスタム Opcode、precompile、ガス表（カスタム Opcode のレッスン）
- **Consensus** — PoS → HyperBFT、PoA、Tendermint
- **Payload** — ブロックビルダー（MEV-aware、アプリ固有の理由でオーダーされる）
- **Add-ons** — カスタム JSON-RPC ネームスペース、ExEx フック

これらが SDK が公開している差し替えポイントそのもの。それ *以外*（sync オーケストレータ、MDBX スキーマ、ヘッダーダウンロード、sender 復元、ハッシングステージ）は Reth から as-is で取る。

## ステップ 2 — 最初の試案: 上書きを struct で渡す

素朴な合成 API:

\`\`\`rust
struct NodeConfig<P, N, E, C, Pl> {
    pool: P,
    network: N,
    executor: E,
    consensus: C,
    payload: Pl,
}

fn main() {
    let cfg = NodeConfig {
        pool: CustomPool::default(),
        network: DefaultNetwork::default(),
        executor: DefaultExecutor::default(),
        consensus: DefaultConsensus::default(),
        payload: DefaultPayload::default(),
    };
    Reth::run(cfg);
}
\`\`\`

上書きを struct で渡す。動くが、ぎこちない。

> 🛑 **予測。** この形のユーザー体験的な問題を 2 つ?

2つ:

1. **毎回全フィールドを書くことになる** — カスタマイズしてないものまで。struct が all-or-nothing を強制する。
2. **型推論が早めに崩れる。** 各コンポーネントが独自のジェネリックパラメータを持つ。それを単一 struct でまとめると推論できないからまった型シグネチャに。

**Builder パターンが両方を直す。** 各メソッドが 1 つの上書きを受け取り、新しいビルダー型を返す — Rust の型システムが変更を追跡し、デフォルトは暗黙のままに。

## ステップ 3 — Builder パターン: 流れるようなチェーン呼び出し

\`\`\`rust
let handle = builder
    .with_pool(CustomPool::default())
    // 残りはスキップ — デフォルト
    .launch()
    .await?;
\`\`\`

各 \`with_*\` 呼び出しが新しいビルダー型を返す。デフォルトは見えないまま。**実際に上書きしたものだけ書く。**

ただ「コンポーネントごとに 1 メソッド」だと Reth のカスタマイズ表面を捉えきれない。もう一段上のグルーピングがある: *types*（block/tx/header レイアウト）、*components*（上のランタイムサブシステム）、*add-ons*（RPC、ExEx）。本物の SDK はビルダーをこの 3 軸に分ける。

## ステップ 4 — \`.with_types::<EthereumNode>()\`

\`\`\`rust
.with_types::<EthereumNode>()
\`\`\`

これは **型バンドル** を選ぶ — chain spec、primitives（block・tx・header 型）、engine API。

なぜこれが独立したステップか? *型* は他のすべての load-bearing だから。tx 構造を変えると、各コンポーネント（pool、executor、payload、network）はその新しい tx 型を使う必要がある。だから SDK は型バンドルを *先に* commit させる — コンポーネント設定の前に。

\`EthereumNode\` はデフォルト（Ethereum block + tx + header）。\`OpNode\`（Optimism 型）や独自の \`NodeTypes\` impl も渡せる。

> 🛑 **理解度チェック。** \`with_types\` がチェーンで \`with_components\` の *後* に来たら、どんな具体的なバグが発生するか? 失敗モードをスケッチ。

コンポーネントが、依存する型がまだ選ばれていない時点で指定されることになる。各コンポーネントビルダーを未確定の型でジェネリックにする（コンパイラ敵対的）か、\`.with_components\` の引数で型を暗黙に commit する（無音で混乱を招く）かしかない。**\`with_types\` 先頭** は残りのチェーンを型認識可能にする。

## ステップ 5 — \`.with_components(...)\`: カスタマイズの中心

\`\`\`rust
.with_components(EthereumNode::components().pool(CustomPoolBuilder::default()))
\`\`\`

トリック: コンポーネントの *基本セット*（\`EthereumNode::components()\`）を取って、\`.pool(...)\`、\`.network(...)\`、\`.executor(...)\` 等をチェインして個別ビルダーを上書きする。

ステップ 3 の「変えるものだけ上書き」パターンを、ランタイムサブシステムに適用したもの。デフォルトは見えないまま:

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

カスタムビルダーを 1 つ書いた。残りは Reth から来た。

> 🛑 **予測。** \`CustomPoolBuilder\` が実装するトレイト \`PoolBuilder\` をスケッチしてください。メソッドシグネチャだけ、本物の impl は不要。Reth は pool ビルダーから何が必要?

おおよそ:

\`\`\`rust
trait PoolBuilder<Node>: Send {
    type Pool;
    fn build_pool(self, ctx: &BuilderContext<Node>)
        -> impl Future<Output = eyre::Result<Self::Pool>>;
}
\`\`\`

メソッド 1 つ: コンテキスト（chain spec、primitives 等を含む）が与えられたら pool を作る。**コンポーネントは事前構築されて渡されるのではなく、遅延ビルドされる**。前のビルダーステップが組み立てたコンテキストを必要とするから。（次レッスンで 6 つのビルダー全部に同じ形を見ます。）

## ステップ 6 — \`.with_add_ons(...)\` と \`.launch()\`

\`\`\`rust
.with_add_ons(EthereumAddOns::default())
.launch()
\`\`\`

Add-ons はランタイムの load-bearing でないもの: RPC ネームスペース、engine API 拡張、ExEx インストール。\`EthereumAddOns::default()\` で標準 Ethereum RPC; ここに \`.install_exex(...)\` をチェインして前レッスンの ExEx パターンを使う。

\`.launch()\` で本物の仕事が起きる: MDBX を開き、P2P スタックを起動、sync ステージ用 Tokio タスクを spawn、RPC サーバーを配線。すべてを駆動する \`NodeHandle\` を返す。

## ここまでに組み立てたもの

\`\`\`rust
let handle = builder
    .with_types::<EthereumNode>()              // (ステップ 4) 型バンドル
    .with_components(                          // (ステップ 5) ランタイムサブシステム
        EthereumNode::components().pool(CustomPoolBuilder::default())
    )
    .with_add_ons(EthereumAddOns::default())   // (ステップ 6) RPC + ExEx
    .launch()                                  // (ステップ 6) すべて起動
    .await?;
\`\`\`

各ステップが場所代を稼いでいる:

- **\`with_types\` 先頭**（ステップ 4）— 型は他のすべての load-bearing
- **\`with_components\` のチェイン上書き**（ステップ 5）— 変えるものだけ上書き、残りはデフォルト
- **\`with_add_ons\`**（ステップ 6）— load-bearing でない拡張
- **\`launch\`**（ステップ 6）— 起動

次のレッスンは **6 つのコンポーネント** を歩く — それぞれが何をして、差し替えで何が出荷でき、どの本番チェーンが何を差し替えているか。

## 進む前の想起

スクロールせずに:

1. なぜ「Reth 全体を fork」は何年も運用するチェーンに通用しないのか?
2. なぜ \`.with_types::<EthereumNode>()\` がチェーンで *先頭* に来るのか?
3. *1 つの* コンポーネントを上書きして残りを Reth デフォルトにするパターンは?
4. \`.launch()\` が実際に起動するのは何?

どれか曖昧なら戻る。次のレッスンは 6 コンポーネントと本物のチェーンの使い方を歩きます。
`,
                },
                {
                  title: '6 コンポーネント — それぞれが何を解放するか',
                  slug: 'reth-sdk-components-ja',
                  type: 'CONTENT',
                  sortOrder: 10,
                  duration: 10,
                  xpReward: 25,
                  content: `# 6 コンポーネント — それぞれが何を解放するか

前のレッスンでノードビルダー API を組み立てました。面白い仕事は \`.with_components(...)\` の中で起きる — そこで実際にサブシステムを差し替える。**このレッスンは 6 つのコンポーネントビルダーを歩き、各々の差し替えが本物のチェーンに何を解放するかを見せます。**

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

## 6 コンポーネント、歩く

| コンポーネント | 差し替える対象 | 解放されるもの |
| :--- | :--- | :--- |
| \`pool\` | tx 受付・順序付け・追い出し | 優先レーン、payments-first 順序、アプリ固有の MEV ルール |
| \`network\` | P2P トランスポート、ピアポリシー | プライベートサブネット、許可リスト、独自プロトコル |
| \`executor\` | EVM 設定 | **カスタム Opcode**、カスタム precompile、カスタムガス表 |
| \`consensus\` | ブロック検証ルール | PoS → HyperBFT、PoA、Tendermint、何でも |
| \`payload\` | ブロックビルダー | MEV-aware 順序、アプリ固有のバッチング |
| \`add_ons\` | ランタイム外の拡張 | カスタム JSON-RPC ネームスペース、ExEx インストール |

それぞれに \`*Builder\` トレイト（\`PoolBuilder\`、\`NetworkBuilder\` 等）があり、SDK が \`.launch()\` 中に呼んで実際のサブシステムを構築する。

> 🛑 **予測。** これら 6 コンポーネントの中で、Hyperliquid が HyperEVM 用に最も大きくカスタマイズしたのはどれ? Tempo が payments 用に最も大きくカスタマイズしたのはどれ? 両方の予想を書き留めてから先へ。

## Hyperliquid HyperEVM — 何を差し替えているか

- **\`consensus\`** — Ethereum PoS ではなく **HyperBFT**（独自の BFT コンセンサス）。コンセンサスサブシステムを置き換えている。
- **\`executor\`** — オーダーブック直結の実行: 一部の Opcode が EVM と並走する perp オーダーブックと相互作用。カスタム executor。
- **\`pool\`** — 高頻度な perp 更新に合わせた受付ルール。
- **その他すべて** — Reth デフォルト。

> 🛑 **理解度チェック。** Hyperliquid は \`consensus\` と \`executor\` を差し替えた。**なぜ Reth 全体を fork してゼロから書き直さなかったのか?** 正直な答えは SDK が重要な理由そのもの — 彼らは *それ以外* すべて（sync、MDBX、ヘッダーダウンロード、sender 復元、RPC）をアップストリームの Reth に追従させたかった、Paradigm のアップデートを rebase 地獄なしに取り込めるように。コンポーネント合成は保守の物語。

## Tempo — 何を差し替えているか

（執筆時点の公開情報 — 最新を検証してください。）

- **\`pool\`** — payments 優先レーン。マーチャント決済が高 gas な DeFi tx の後ろで待つべきではない; pool が違う扱いで surface する。
- **\`payload\`** — payment finality パターンに合わせたブロック構築。
- **\`add_ons\`** — payment 固有エンドポイント用のカスタム RPC。
- **\`consensus\` / \`executor\`** — おそらく Reth デフォルト + 標準 L1 コンセンサス。

パターン: **thesis に合う部分を差し替え、それ以外はそのまま。** Tempo の thesis は payments-priority; 差し替えるコンポーネントがそれを反映する。カスタム executor（カスタム Opcode なし）やカスタム consensus（標準 PoS で OK）は不要。

## Berachain (bera-reth) — 何を差し替えているか

- **\`consensus\`** — **Proof of Liquidity**: バリデータがネイティブトークンを単独で stake するのではなく、流動性を BEX（彼らの DEX）に stake する。コンセンサスルールが Ethereum PoS と異なる。
- **\`executor\`** — PoL と結合しているので、報酬分配が実行と相互作用する。
- **\`add_ons\`** — DEX-aware な RPC ネームスペース。
- **その他すべて** — Reth デフォルト。

## パターン: thesis が要求する部分を差し替える

チェーンの thesis を 1 文で言えるなら、たいてい 1〜3 個のコンポーネント差し替えにマッピングできる:

| Thesis | 差し替えるコンポーネント |
| :--- | :--- |
| 「オーダーブック結合した perp 高速実行」 | \`consensus\`、\`executor\`、\`pool\` |
| 「payment-priority L1」 | \`pool\`、\`payload\`、\`add_ons\` |
| 「流動性 stake PoS」 | \`consensus\`、\`executor\`、\`add_ons\` |
| 「shielded tx 対応のプライバシー L1」 | \`pool\`、\`executor\`、\`add_ons\`（カスタム RPC） |

> 🔍 **リポジトリで確認。** \`EthereumNode::components()\` の定義を開く。各コンポーネントのデフォルトビルダーがそこに並んでいる — それが「無料で来るもの」のメニュー。

## 不変のもの: load-bearing な 80%

差し替え *ない* コンポーネントが価値の大半:

- **Sync オーケストレータ**（Module 1 で読んだ \`Stage\` パイプライン）
- **MDBX スキーマとストレージレイヤ**
- **ヘッダーダウンロード、sender 復元、ハッシング、Merkle、インデックス**
- **JSON-RPC サーバーランタイム、engine API サーバー**
- **Tokio ランタイム、トレース、メトリクス**

これが「fork ではなく組み立てる」が、何年も運用する L1 にとって唯一の保守可能な物語の理由。**Paradigm のアップデートは 80% に流れ込み、あなたの fork 形状の表面積は書いた 20% に留まる。**

## クイズ前の想起

スクロールせずに:

1. 6 コンポーネントの中で Hyperliquid が最も大きくカスタマイズするのはどれで、なぜか?
2. なぜ payments-priority に \`pool\` が正しい差し替え先で、\`consensus\` ではないのか?
3. 「fork ではなく組み立て」の保守上の議論は?
4. プライバシー L1 を出すための *最小* のコンポーネント差し替え集合をスケッチ。

次のレッスンはクイズ。曖昧な答えがあるなら今、想起してください。
`,
                },
                {
                  title: 'クイズ: SDK のコンポーネントモデルは身についた?',
                  slug: 'reth-sdk-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 11,
                  duration: 4,
                  xpReward: 25,
                  content: `# クイズ: SDK のコンポーネントモデルは身についた?

ビルダーパターンとコンポーネントメニューをカバーする 4 問。同じルール: **クイズはうなずきで通せない。**

2 問以上落としたら、ドリルへ進む前に「ノードビルダー API をステップで組み立てる」を読み直してください。`,
                  quizQuestions: [
                    {
                      question: "なぜ `.with_types::<EthereumNode>()` がビルダーチェーンで `.with_components(...)` の *先* に来るのですか?",
                      options: [
                        "様式 — コンパイラに順序は関係ない。",
                        "性能 — 型先頭のほうがコンパイルが速い。",
                        "型はコンポーネントの load-bearing: tx と block の型が pool、executor、payload などが操作する対象を決める。チェーンが先に型バンドルに commit して、後続のコンポーネントビルダーが型認識可能になる。",
                        "古い Reth バージョンとの後方互換性。",
                      ],
                      correctIndex: 2,
                      explanation: "コンポーネントは型に依存する。`with_components` が先頭なら、各ビルダーは未確定の型でジェネリックにする必要がある。チェーンの順序が依存グラフをエンコードする — 型が先、その上にコンポーネントが乗る。",
                    },
                    {
                      question: "あなたが payment-priority L1 を作ろうとしている。どのコンポーネントが最も直接的にそれを実現しますか?",
                      options: [
                        "`consensus` — payment priority はコンセンサスルール。",
                        "`pool`（受付と順序付けルール）と `payload`（ブロックビルダー）。Pool が次のブロックに先に入る tx を決め、payload ビルダーが最終的な順序を決める。",
                        "`executor` — payment priority は Opcode にエンコードされる。",
                        "`network` — P2P レイヤが payment をルーティングする。",
                      ],
                      correctIndex: 1,
                      explanation: "Pool が高優先 payment を早めに surface する; payload がブロックの最終順序を決める。Consensus、executor、network は受付/順序付けに関係ない。これは Tempo の実際のカスタマイズに対応する。",
                    },
                    {
                      question: "「Reth 全体を fork ではなく、コンポーネントを組み立てる」が、何年も運用するチェーンの唯一の実行可能な戦略であるのはなぜですか?",
                      options: [
                        "Fork のほうが速い。",
                        "Fork は実際には変えたくない 200K 行以上の所有権を与える。コンポーネント合成なら差し替える部分（通常 10K 行未満）だけを所有しつつ、Paradigm のアップストリームのアップデートが依存ライブラリの 80% に流れ込む。",
                        "Fork が Reth のライセンスに違反する。",
                        "関係ない — どちらも同じくらい有効。",
                      ],
                      correctIndex: 1,
                      explanation: "これが保守の議論。Fork はアップストリームのリリースごとに分岐を蓄積する。合成はアップグレードパスを開けたままにする: Reth がアップデートを出し、Cargo の依存をバンプし、カスタムビルダーは差し替え表面しか触っていないので動き続ける。",
                    },
                    {
                      question: "ExEx を使うことと Reth SDK を使うことの違いは何ですか?",
                      options: [
                        "違いはない — 同じものの別名。",
                        "ExEx は既存の Ethereum ノードを chain commit にフックして拡張する（あなたはゲスト）。SDK はコンポーネントを組み立てて *自前のチェーン* を作る（あなたはホスト）。ExEx はインデクサ・MEV ボット・ロールアップ向け; SDK は L1/L2 向け。",
                        "ExEx は L1 向け、SDK はインデクサ向け。",
                        "SDK は ExEx の非推奨バージョン。",
                      ],
                      correctIndex: 1,
                      explanation: "ExEx = チェーンイベントを聞く、派生状態、prune に優しい。SDK = チェーンを定義、コンポーネントを差し替え、ノードバイナリを出荷。スタックの違うレイヤの相補的な道具で、本番デプロイは両方使うことが多い（SDK でチェーンを定義、ExEx でインデクサを足す）。",
                    },
                  ],
                },
                {
                  title: 'ドリル: カスタム pool ビルダーを出荷する',
                  slug: 'reth-sdk-drill-ja',
                  type: 'CONTENT',
                  sortOrder: 12,
                  duration: 12,
                  xpReward: 25,
                  content: `# ドリル: カスタム pool ビルダーを出荷する

読むのはリハーサル。**実装するのが記憶。** このドリルは「SDK について読んだ」から「カスタム pool ビルダーを書いて差し替え、ノードバイナリ内で自分のコードが動くのを観察した」までを連れて行きます。

## セットアップ

\`\`\`bash
git clone https://github.com/paradigmxyz/reth
cd reth/examples/custom-node-components
\`\`\`

例は単独でビルドできる — Reth 全体をビルドする必要はない。

## ドリル 1 — \`CustomPoolBuilder\` を読む

\`src/main.rs\` を開く。例はちょうど 1 つのコンポーネント \`pool\` を上書きする。\`CustomPoolBuilder\` 構造体とその \`PoolBuilder\` 実装を見つける。

> 🛑 **予測。** \`CustomPoolBuilder::build_pool\` は何をする、一文で? 予想を立ててから先へ。

実装をスキム。3 セクションを特定:

1. **Validators** — トランザクションバリデータをセットアップ（署名、nonce 等のチェック）。
2. **Ordering** — tx 順序付け戦略を選ぶ（デフォルトは \`CoinbaseTipOrdering\`）。
3. **Construction** — 上記の選択と \`InMemoryBlobStore\` で \`EthTransactionPool\` を構築。

予測がこの 3 つのいずれかを取り逃したら、戻って実装を読み直してください。Pool は単一のものではない — (validator、ordering、blob store) の合成。

## ドリル 2 — 各トランザクションでログを追加

カスタムコードが実際に動くのを見たい。バリデータが受け入れるトランザクションごとにログを追加。

クリーンなアプローチ: バリデータをログ + 委譲する自前のバリデータでラップ:

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

（ローカル Reth の \`TransactionValidator\` トレイトの正確な形に合わせて調整 — API はドリフトする。要点は *構造*。）

そして \`CustomPoolBuilder::build_pool\` の中で、内側のバリデータをラップ:

\`\`\`rust
let inner_validator = TransactionValidationTaskExecutor::eth_builder(...)
    /* ...既存セットアップ... */
    .build_with_tasks(...);

let validator = LoggingValidator { inner: inner_validator };

// inner_validator の代わりに validator を pool に渡す
\`\`\`

> 🔧 **配線はドリルとして残します。** 正確な呪文はあなたが使っている \`reth-pool\` のバージョン次第。要点は: pool に入る各 tx の経路に自分のコードを置くこと。

## ドリル 3 — Dev チェーンを実行してログが発火するのを観察

\`\`\`bash
cargo run -- --dev
\`\`\`

\`--dev\` はブロックを速くマインする 1 ノードのエフェメラルチェーンを起動。tx を送る（任意の方法で — \`cast send\`、\`localhost:8545\` を向けた MetaMask、自前スクリプト）:

\`\`\`bash
cast send \\
  --rpc-url http://localhost:8545 \\
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \\
  --value 1ether \\
  0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
\`\`\`

（dev アカウントの秘密鍵を使う — \`--dev\` は既知のものを使う; 上記は標準的な Anvil/Reth dev 鍵。）

> 🛑 **ターミナルを観察。** こう出るはず:
>
> \`\`\`
> Pool: validating transaction tx_hash=0x... gas_price=...
> \`\`\`
>
> 出ないなら配線が間違っている。よくある原因: \`LoggingValidator\` を構築したけれどビルダーがまだ *内側の* バリデータを pool に渡している。配線を直して再実行。

## ドリル 4 — もう 1 つの差し替え、スケッチ

\`pool\` を所有した。次にもう 1 つのコンポーネントの差し替えで何が変わるかをスケッチ。

> 🛑 **質問（書き留めて）:** チェーンにカスタム precompile（例: 高速 ed25519 検証器）を追加したい。どのコンポーネントを差し替える? 差し替えはおおよそどんな形?

\`executor\` を差し替える。カスタム precompile は EVM 設定の中に住む。スケルトン:

\`\`\`rust
.with_components(
    EthereumNode::components()
        .executor(CustomExecutorBuilder { extra_precompiles: vec![ed25519_verify] })
)
\`\`\`

\`CustomPoolBuilder\` が \`PoolBuilder\` を実装するのと同じやり方で \`ExecutorBuilder\` を実装する。**パターンが転移する。** これが SDK の要点 — 1 つのコンポーネントを差し替えたら、別のを差し替えるのは機械的。

> 🔍 **\`examples/custom-node-precompiles/\` を開く**（あなたのリポジトリのバージョンに存在すれば）— executor を差し替える例。

## レッスン終了の想起

スクロールせずに、自分の言葉で:

1. \`CustomPoolBuilder::build_pool\` は何の 3 ピースを合成しているか?
2. なぜバリデータをラップするのが pool にロギングを注入するクリーンな方法か?
3. カスタム precompile を追加したい場合、どのコンポーネントを差し替えるか?
4. 違うコンポーネントビルダーを使うための \`main.rs\` の *1 行* 変更は?

このドリルの後、1 行のコンポーネント差し替えで動くものを出荷した。**同じパターンを consensus や executor に拡大すれば HyperEVM クラスのインフラを構築している。**

## 📺 関連動画

\`\`\`youtube
cc45Rcmrro4 | The Future of Reth (Frontiers 2025)
\`\`\`
`,
                },
                {
                  title: 'Expert ティアへの橋渡し',
                  slug: 'reth-bridge-to-expert-ja',
                  type: 'CONTENT',
                  sortOrder: 13,
                  duration: 10,
                  xpReward: 20,
                  content: `# Expert ティアへの橋渡し

> 🛑 **ゲートチェック。** Advanced 終了を主張する前に、**前のレッスンに戻らずに** これらに答えてください — 声に出すか紙に書いて：
>
> 1. \`popn_top!\` は何に展開される? なぜ \`unsafe\` 内で \`unwrap_unchecked()\` を使うのか?
> 2. \`Database\` と \`DatabaseRef\` がなぜ別トレイトなのか? \`auto_impl\` リストの非対称（\`&mut, Box\` vs \`&, &mut, Box, Rc, Arc\`）が何を語っているか?
> 3. \`ExExEvent::FinishedHeight\` が Reth の pruner に何を伝えるか — 忘れた場合のディスク帰結は?
> 4. なぜ \`MerkleStage\` がハッシング後で、間に挟まれていないのか?
> 5. Tempo のような purpose-built L1 を出荷するために、Reth のどのコンポーネントを差し替えるか?
>
> **正解が 4 未満なら?** 進まないこと。該当の Advanced レッスンに戻る。Expert はこれらを「再調査する概念」ではなく「流暢な語彙」として前提します。

ゲートを通過したら: **Alloy → Revm → Reth（Staged Sync、ExEx、カスタム NodeBuilder）** の階段を上ってきたことになります。3プロジェクトすべてのソースを目的を持って読めます。

しかし「読める」は半分。**Expert** は「読める」から「**本番に出せる**」への跳躍。

## Expert で待っていること

| レッスン | 焦点 |
| :--- | :--- |
| **パフォーマンスエンジニアリング** | flamegraph、Criterion、jemalloc、Reth の \`maxperf\` ビルドプロファイル |
| **MDBXストレージ内部** | Reth の本物の \`Database\` / \`DbTx\` / \`DbTxMut\` トレイト、B+tree mmap、MVCC |
| **Tokio ランタイム内部** | work-stealing、\`spawn_critical_task\`、パニック監視 |
| **手続きマクロ** | \`address!\` と \`sol!\` の実装 — \`fixed_bytes_macros!\` メタパターン |
| **カスタム precompile** | 本物の Revm \`identity_run\` ＋ Foundry の cheatcodes が precompile である事実 |
| **Merkle Patricia Trie** | reth の本物の \`AccountProof\` / \`StorageProof\` と検証ロジック |
| **本番MEV** | mempool 取り込み、sol! デコード、Revm forking、ExEx をプライベート mempool として |
| **zkEVM with Revm** | Steel + Risc0 guest ソース — Ethereum 実行を証明する |
| **本番フォーク運用** | reth の本物の \`maxperf\` Cargo profile、systemd、監視、diff テスト |

## マインドセットの転換

Advanced は **構造** を教えました。Expert はその構造の **背後にある決定** を教えます。

> 🛑 **私の答えを読む前に、答えを予測してください。** 先に意見を持つ — 間違っていてもいい。インフラを出荷するエンジニアはそうします。
>
> - *なぜ* Reth は MDBX で、RocksDB ではないのか?
> - *なぜ* Revm は pop / pop / push ではなく 1 つ pop して参照経由で書き戻すのか?
> - *なぜ* \`Database::tx()\` に \`#[track_caller]\` が必要か?
> - *なぜ* Foundry の cheatcodes は Opcode ではなく precompile なのか?

---

私の答え:

- **MDBX vs RocksDB** — コンパクションストールでの読み取りレイテンシ。
- **pop-1-write-through** — ADD あたりメモリ書き込みが 1 回減る。
- **\`#[track_caller]\`** — パニックのバックトレースがトレイトメソッドではなく、バグった呼び出し元を指す。
- **cheatcodes が precompile** — バニラ EVM とのコンセンサス互換性 (precompile は予約アドレス、新 Opcode ではない — fork でもメインネット bytecode をパースできる)。

ポイントは私の言い回しと一致したかではなく: **読む前に意見があったか?** 一度この *なぜ* を内部化すれば、Paradigm のエンジニアや Hyperliquid の validator 運用者と設計判断を議論できる — それが grant 応募可能な仕事への入口です。

## 進む前に

冒頭のゲートチェックが楽だったなら、Expert に飛び込んでください。

5 問のどれかで前のレッスンに戻った場合 — 今、再読してください。Expert は密度が高い。リンクされたコードをローカルで実行しながら読むのは、もはやオプションではありません。

> インフラレイヤーの学習は、最初の 3 ヶ月が一番苦しいです。ドキュメントが不十分なことも多く、**「ソースコードこそが最強の教科書」**。Expert はこの教訓が報われるティアです。`,
                },
                {
                  title: 'Inside Reth ファイナルクイズ',
                  slug: 'reth-advanced-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 14,
                  duration: 8,
                  xpReward: 25,
                  content: `# Inside Reth ファイナルクイズ

Staged Sync・ExEx・Reth SDK の最終チェック。3 問。同じルール: **クイズはうなずきで通せない。** 2 問落としたら、Inside Reth を「完了」と称する前に該当する積み上げレッスンを読み直してください。`,
                  quizQuestions: [
                    {
                      question: 'Reth の Staged Sync が、ブロック単位の同期に対して持つ実利は？',
                      options: [
                        'ブロックをダウンロードするだけで実行しない設計でディスクを節約できる',
                        '範囲をステージごとに処理することで I/O・CPU・キャッシュ効率を最大化 — かつ unwind により reorg を対称的に扱える',
                        'Merkle ルート計算を無期限に遅延することでスキップする',
                        'データベース不要 — 状態はクエリ時に都度導出する',
                      ],
                      correctIndex: 1,
                      explanation: 'Staged Sync (Headers → Bodies → Senders → Execution → Hashing → Merkle → TxLookup → Indexes → Finish) は範囲をステージごとに処理。Sender 復元は Rayon で並列化。Hashing でソートしてから MerkleStage が動く。すべてのステージが `execute` と `unwind` を持つから、reorg は特殊ケースではなく通常運用。',
                    },
                    {
                      question: 'ExEx（Execution Extensions）で何ができる？',
                      options: [
                        'JSON-RPC パイプラインの応答送信前にカスタムロジックを注入する',
                        'チェーンの commit / reorg / revert ごとに、ノードプロセス内で実行時間に近いレイテンシで Rust コードを動かす',
                        'P2P ネットワークでのトランザクションの gossip 方法を上書きする',
                        'Reth のコンセンサスエンジンを独自のものに置き換える',
                      ],
                      correctIndex: 1,
                      explanation: 'ExEx は ChainCommitted / ChainReorged / ChainReverted の通知を in-process で受け取り、インデクサ・MEV パイプライン・リアルタイムリスクエンジンに最適。(RPC カスタマイズは add_ons、ネットワークやコンセンサスのカスタマイズは with_components 経由 — 別の SDK 表面。)',
                    },
                    {
                      question: 'Reth SDK で App-chain を作るとき、現実的なカスタマイズ表面は？',
                      options: [
                        'genesis レベルの chain ID と gas limit のみ',
                        'pool・network・payload・executor (EVM)・consensus コンポーネント、加えて RPC と ExEx を add-ons 経由で',
                        '`Stage<Provider>` 実装のみ — それ以外はロックされている',
                        'Database テーブルとインデックスのみ — EVM 自体は固定',
                      ],
                      correctIndex: 1,
                      explanation: 'SDK は `with_components.{pool, network, payload, executor, consensus}` と RPC/ExEx 用の `with_add_ons` を露出。カスタムメンプール (Tempo 風優先レーン) からカスタムコンセンサス (HyperBFT)、カスタム EVM (custom opcode / precompile) まで、すべてビルダー差し替え 1 つの距離。',
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
