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

これは RethLab の 3 つの独立した中級ティアコースの 1 つです:

- **Inside Revm** — EVM エンジンの内部 *(まだなら先に推奨)*
- **Inside Reth**（あなたはここ）— Reth の内部: Staged Sync・ExEx・Reth SDK
- **Inside Alloy** *(近日公開)* — Alloy の内部: Provider・Network・Signer

3 つは独立していますが、**ここのいくつかのレッスンは Inside Revm で学ぶ \`Database\` トレイトと Revm 実行モデルへの慣れを前提にしています**。それが不安なら、Inside Revm を先に。

> 📋 **中級ティアは初めて?** *中級への橋渡し* の最後にある **「中級コースの読み方」** を先に読んでください。編集スタイル（Predict プロンプト・クイズゲート・積み上げ→ウォークスルー→クイズ→ドリルのチェーン構造）とペースを説明しています — 3 つの中級コース全てに適用される、1 度読めば済む内容です。

## このコースで学ぶこと

[\`paradigmxyz/reth\`](https://github.com/paradigmxyz/reth) のソースを 1 行ずつ読みます: \`Stage\` トレイトと 10 ステージの sync パイプライン、**ExEx (Execution Extensions)** — インプロセスのインデクサ・MEV・リスクエンジン用、そして自前の App-chain を組み立てる **Reth SDK**。3 つのトピックチェーン、それぞれが積み上げ + ウォークスルー + クイズ + ドリル。

終わりには、ノード速度のインデクサや独自の App-chain を出荷できるだけの Reth 内部を読み解いていることになります。

## 前提知識

**Revm 内部**（Inside Revm を未受講の場合）:
- \`Database\` トレイトの形と、Revm がそれを通じて状態を読む仕組み
- \`ExecutionStage\` で \`Stage\` と \`Database\` がどう相互作用するか

**ブロックレベルの Ethereum**（中級への橋渡し でカバー）:
- ブロック構造 (header / body / receipts)、reorg は通常運用
- sender 復元、tx body デコード、receipt の中身

**中級 Rust**（同じく 中級への橋渡し で。このコース内の *Rust: ライフタイム・Box・Arc・dyn Trait* レッスンが自己チェック用）:
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

「Find in repo」プロンプトはリポジトリを実際に開いていなければ意味がありません。レッスン 1 を始める前にここまで済ませておいてください。

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

> 🧭 **systems engineering スタックでの位置:** **DB 層と並行性層が交わる場所**。staged sync は、データエンジニアリングの ETL パイプライン設計をチェーン同期に持ち込んだもの — 各 stage は独立だが順序があり、I/O をバッチ全体で償却する。Airflow の DAG、Kafka Streams のトポロジ、データベースのバックフィル — どれも同じ構造と格闘している。Reth のパイプラインは、その「チェーン同期版」。

Staged Sync は Reth の背骨です。**そして、見た目は威圧的** — 本物の \`Stage\` トレイトは6つのメソッド、非同期の準備チェック、双方向の対称性、そして \`auto_impl(Box)\` 属性を抱えています。素のまま読むと、新しい概念が一度に6つ降ってきます。

このレッスンでは、最も素朴な同期ループからこのトレイトを積み上げていきます。最後まで通せば、以下の全要素を自分の手で組み立てたことになります:

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

> 🛑 **予測。** スクロールせずに: この素朴な設計が 2000 万ブロックで *破滅的に* 遅い理由を3つ挙げてください。（ヒント: それぞれ *別種の* 非効率です。）

3つ:

1. **バッチがない。** ECDSA sender 復元は1ブロックあたり同じ操作が 200 回。それを 200 回別々の呼び出しでやると、セットアップコストを 200 回分払うことになる。
2. **I/O 償却がない。** ブロックごとに Merkle ルートを書く = 2000 万回の \`commit()\` — そのたびにディスクへ触る。バッチ化すれば、Merkle ルートは100万ブロックに1回書けば済む。
3. **並列化がない。** ヘッダー取得は tx 実行に依存しない。Sender 復元は前ブロックに依存しない。それでもループは各フェーズでブロックする。

修正方針: **作業をステージに分割する。** 各ステージが *ブロック範囲* を端から端まで処理してから次に渡す。

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

これで sender 復元はブロック間でバッチ化でき、Merkle ルートは償却され、ステージ内で並列化もできる。**データ構造はステージのリスト、各ステージは1つのトレイトを実装する。** 次にそのトレイトを組み立てます。

## ステップ 2 — \`Stage\` の最初の試案

> 🛑 **予測。** トレイトをスケッチしてください。オーケストレータが呼ぶメソッドは? ステージは何を返す? 予想を立ててから先へ。

最初の試み:

\`\`\`rust
trait Stage {
    fn execute(&mut self, blocks: BlockRange) -> Result<(), StageError>;
}
\`\`\`

メソッド1つ。呼び出し側が範囲を渡し、ステージが処理する。それで完了。

前進同期だけならこれで動きます — ただし致命的な穴があります。

## ステップ 3 — \`unwind\`: reorg はオプションではない

> 🛑 **予測。** Ethereum の reorg は特殊ケースではなく日常的に起きる。スクロールせずに: この単一メソッドの \`Stage\` でブロック 1000 → 980 への reorg をどう扱うか?

このトレイトには無い *別の* メソッドが必要になり、オーケストレータにも別のコードパスが必要になります。気付けばコードベースの半分が「reorg パス」になる。これが他の Ethereum クライアントが取った形であり、Reth が避けるよう設計された形です。

Reth の答え: **同じトレイトに \`unwind\` を加える**:

\`\`\`rust
trait Stage {
    fn execute(&mut self, blocks: BlockRange) -> Result<(), StageError>;
    fn unwind(&mut self, blocks: BlockRange) -> Result<(), StageError>;
}
\`\`\`

前進 = 範囲に対して \`execute\`。後退 = 範囲に対して \`unwind\`。**同じトレイト、2方向。** Reorg は特殊ケースではなく通常運用の一部になる。**この対称性がアーキテクチャの要石です。**

## ステップ 4 — \`ExecInput\` / \`ExecOutput\`: 明示的な再開可能性

\`BlockRange\` だけでは情報が足りません。オーケストレータはステージに次のことを伝える必要があります:

- *どこで止まるか。* ターゲットブロック。
- *どこから再開するか。* 前回のチェックポイント（ノード再起動後）。

ステージはオーケストレータに次のことを伝える必要があります:

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

> 🛑 **理解度チェック。** \`done\` が \`ExecOutput\` の *中のフラグ* として返されるのはなぜ? \`has_more()\` のような別メソッドにしないのは? この設計選択はどんな制約に応えているのか?

アトミックな呼び出し/戻り値にするためです。オーケストレータは1ターンごとに正確に1つのフィードバックが欲しい:「チェックポイント X まで進めた。また呼ぶかどうかは任せる」。\`has_more()\` を別メソッドにするとオーケストレータが1ターンで2回呼ぶことになり、checkpoint と has_more が食い違うバグの余地を生む。

## ステップ 5 — 非同期の準備: \`poll_execute_ready\`

ヘッダーをダウンロードするステージは即座に \`execute\` できない — ネットワーク応答を待つ必要があるからです。とはいえオーケストレータは、1つの遅いステージのせいでパイプライン全体を止めたくない。

\`\`\`rust
fn poll_execute_ready(&mut self, _cx: &mut Context<'_>, _input: ExecInput)
    -> Poll<Result<(), StageError>>
{
    Poll::Ready(Ok(()))  // デフォルト: 常に準備完了
}
\`\`\`

Rust の async 形式の poll メソッドです。

> **\`Poll<T>\` とは:** Rust の \`Future\` は内部で \`fn poll(...) -> Poll<T>\` という関数を持ち、呼ばれるたびに \`Poll::Ready(value)\`（完了）か \`Poll::Pending\`（まだ準備中）のどちらかを返す。\`Pending\` を返したら、ランタイムはそのステージを脇に置き、別のステージを poll する。準備が整ったら別の経路で起こされ、再度 poll される。**スレッドをブロックせずに「待つ」を表現する仕組み。**

常に準備完了のステージ（多くがそう）はデフォルトをそのまま使う。I/O を待つステージはオーバーライドして、futures が動いている間は \`Poll::Pending\` を返す。

**オーケストレータは各ステージを poll し、pending なら次へ進む。** どのステージも他のステージをブロックしません。

## ステップ 6 — Commit フック: \`post_execute_commit\` / \`post_unwind_commit\`

ステージによっては、データがディスクに commit された *後* に作業をしたい場合があります。これらのフックを使えば、「commit 完了したか?」というロジックで \`execute\` を汚さずに、そうした仕事をこなせます。

\`\`\`rust
fn post_execute_commit(&mut self) -> Result<(), StageError> { Ok(()) }
fn post_unwind_commit(&mut self) -> Result<(), StageError> { Ok(()) }
\`\`\`

デフォルトは no-op、必要なステージだけオーバーライドする。Reth 内の具体例:

- **\`ExecutionStage\`** が \`post_execute_commit\` でブロック実行通知を ExEx subscriber へ流す — トランザクション本体のコミットが先に完了している保証が必要だから (subscriber は commit 済みデータを読みに来る)
- **Pruner 系ステージ** がチェックポイント書き込み後にディスクから古いインデックスを開放する

**ほとんどのステージはオーバーライドしません。** opt-in のライフサイクルであって、必須の配線ではない。

## ステップ 7 — \`#[auto_impl(Box)]\`: ヘテロなステージリスト

オーケストレータはステージを \`Vec<Box<dyn Stage<...>>>\` に格納します。そのためには、\`S: Stage\` のとき \`Box<S>\` も \`Stage\` を実装している必要があります。

属性がなければ、これを手書きする必要があります:

\`\`\`rust
impl<S: Stage<P>> Stage<P> for Box<S> {
    // 全6メソッドを (**self).method(...) で転送
}
\`\`\`

\`auto_impl\` は手続きマクロで、この転送コードを自動生成します。\`#[auto_impl(Box)]\` が付いていれば、オーケストレータは型の違うステージをリストで保持し、同じトレイトオブジェクト経由で全部呼べます。

## ここまでに組み立てたもの

各要素がきちんと役割を果たしています:

- **\`execute\` / \`unwind\`**（ステップ 3–4）— 対称性: 前進と reorg が同じ表面を使う
- **\`ExecInput\` / \`ExecOutput\`**（ステップ 4）— 再起動を跨いだ明示的な再開
- **フラグとしての \`done\`**（ステップ 4）— アトミックな呼び出し/戻り値
- **\`poll_execute_ready\`**（ステップ 5）— 非同期の準備、ノンブロッキングなスケジュール
- **\`post_*_commit\`**（ステップ 6）— opt-in のライフサイクルフック
- **\`#[auto_impl(Box)]\`**（ステップ 7）— ヘテロなステージリスト

次のレッスンでは Reth の本物の10ステージパイプラインを巡ります — 各ステージが何をするか、なぜこの順序か。

## 進む前の想起

スクロールせずに:

1. なぜ \`unwind\` は \`execute\` と同じトレイトにあるのか?
2. \`done: bool\` は \`has_more()\` ではできない何を可能にするか?
3. なぜ \`poll_execute_ready\` が存在する? どのステージがオーバーライドするか?
4. \`#[auto_impl(Box)]\` は何の手書きを省いてくれるか?

どれか曖昧なら戻る。次のレッスンは Reth の本物のパイプラインです。

> **🧭 ここまでで積み上げたもの:** **DB 層 × 並行性層の ETL パイプライン抽象** が完成 — \`Stage\` の \`execute\` / \`unwind\` 対称性、明示的な \`ExecInput\` / \`ExecOutput\`、I/O 準備のための \`poll_execute_ready\`、\`Box\` ディスパッチのための \`auto_impl\`。Airflow・dbt・Kafka Streams のパイプラインと同じ構造を、チェーン同期に持ち込んだかたち。次のレッスンでは、Reth に同梱されている本物の 10 ステージパイプラインを巡る。
`,
                },
                {
                  title: 'Reth のパイプライン — 順序のある 10 ステージ',
                  slug: 'staged-sync-pipeline-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 10,
                  xpReward: 25,
                  content: `# Reth のパイプライン: 10ステージ、順番付き

ノードがネットワークに参加して1分後を想像してください。ピアからすでに 10M ブロック分のヘッダーを引っ張ってきた。ここから、その大量のヘッダーを完全に検証されたチェーンに変換しなければならない — すべての tx を実行し、すべての state root を再計算し、すべてのインデックスを構築する。古いクライアントのようにブロックごとに処理すると、**数週間** かかる。Reth は **数時間** で終わらせる。

トリックはこれ: 一度に1ブロックずつ処理するのではなく、**1つの *操作* を、数千ブロックにまたがって処理する** — まず全部の sender を復元、次に全部の tx を実行、次に全アカウントをハッシュ化、と続ける。これが「Staged Sync」。10ステージあり、固定された順序で走り、**順序は恣意的ではない** — ステージ間のすべての制約はどのステージがいつ走るかにエンコードされている。

（前のレッスンで \`Stage\` トレイトを組み立てました。下の10ステージはその実装です。）

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
| 3 | \`SenderRecoveryStage\` | 各 tx の sender を ECDSA で復元（署名を、それを生成したアドレスに戻す） | CPU（並列） |
| 4 | \`ExecutionStage\` | Revm を走らせ、状態差分を蓄積 | CPU（Revm） |
| 5 | \`AccountHashingStage\` | アカウント変更をハッシュ化キーでソート | sort + write |
| 6 | \`StorageHashingStage\` | ストレージ変更をハッシュ化キーでソート | sort + write |
| 7 | \`MerkleStage\` | Merkle Patricia Trie ルートを更新（Ethereum の state ツリーのハッシュ構造） | tree compute |
| 8 | \`TransactionLookupStage\` | \`tx_hash → (block, index)\` インデックスを構築 | sort + write |
| 9 | \`IndexAccountHistoryStage\` + \`IndexStorageHistoryStage\` | 履歴アクセスインデックス | sort + write |
| 10 | \`FinishStage\` | 帳簿付け、確定 | なし |

> 🛑 **前のレッスンの予想と比較。** 予想にあって *ここに無い* ステージは何? 含まれていないものが含まれているものよりも雄弁な場合がある — Paradigm はこのリストに「PrunerStage」を含めないことを選んだ（pruning は別のスケジュールで走る）。

## 順序が物を言う: 3つの制約

パイプラインの順序は3つの制約で決まる。それぞれが特定のステージを別のステージの前に置くことを強いる。

### 制約 1 — \`MerkleStage\` はハッシング *の後* でなければならない

> 🛑 **予測。** Merkle Patricia Trie のルートには葉がハッシュ化キーでソートされている必要がある。**それがハッシングのステージ分けに何を強いるか?**

Merkle ステージはソート済みハッシュ化キーを消費する。アカウントハッシングとストレージハッシングは Merkle が始まる前にソートを完了して commit する必要がある。インターリーブは効かない — Merkle ステージが処理するブロック範囲について *全ソート集合* が必要。

これが \`AccountHashingStage\`(5) と \`StorageHashingStage\`(6) が \`MerkleStage\`(7) より前にある理由。**この特定の順序で、間に完全な commit を挟んで。**

### 制約 2 — \`AccountHashingStage\` と \`StorageHashingStage\` は *並列実行できる*

両方 \`ExecutionStage\` の出力を消費する。独立したソート済み変更集合を生成する（アカウントキーで vs ストレージキーで）。なのにパイプラインが順次実行するのはなぜ?

> 🔍 **\`account_hashing.rs\` と \`storage_hashing.rs\` を開く。** それぞれ最初の30行を読む。何を共有している? Reth が2スレッドに分けない実用的な理由は?

理由は2つ:

1. **ディスク書き込みの競合。** どちらのステージも MDBX（Reth の組み込みキーバリューストア）に書く。並列実行するとデータベースロックで競合し、計算面の利得はない。
2. **パイプラインの単純さ。** 順次実行ならオーケストレータのスケジューラはフラットなリストのまま。並列分岐を加えると DAG スケジューラ（独立したステージを並行実行できるもの）が必要 — 複雑さが増えるが利得は限界的。

下で紹介する Frontiers 2025 のトークがまさにこのトレードオフを論じている — 何が *並列化された* かと何が順次のままかを、それぞれの理由とともに。

### 制約 3 — \`SenderRecoveryStage\` が並列化の勝ちパターン

> 🛑 **予測。** 10ステージの中で、並列化で *最も* 得をするのはどれ? なぜ?

\`SenderRecoveryStage\`。ECDSA 復元 — tx の署名を署名者のアドレスに戻す処理 — は純粋な CPU、共有状態なし、embarrassingly parallel。Reth は Rayon（Rust のデータ並列ライブラリ）で全 CPU コアに展開する。

このステージが特別な理由:

- **巨大なバッチサイズ。** 各ブロックは 100–300 tx; ステージ呼び出しは 100K+ ブロックを一度に処理 = 1呼び出しで 10–30M 個の署名。
- **データ依存なし。** 各復元は他から独立 — 前の結果を待つ必要がない。
- **純粋計算。** 復元の合間に I/O なし。

\`ExecutionStage\`(4) も CPU バウンドだが *順次の* 状態依存がある — ブロック N のストレージ書き込みがブロック N+1 の読み込みに影響。Optimistic execution（Block-STM など、ブロックを投機的に並列実行して衝突したら再実行する方式）なしには簡単に並列化できず、独自のコンセンサス的な複雑さを伴う。

## なぜ Staged Sync が勝つのか

ブロックバイブロック同期（geth の昔のデフォルト）は最大時でも〜50–100 blocks/sec。Staged sync は 10K+ blocks/sec。この 100× は3つの複利的な要因の積:

1. **バッチ化。** Sender 復元、ハッシング、Merkle ルート計算 — すべて1呼び出しで数千ブロックに償却される。
2. **ステージ内並列化。** ステージ内で（特に \`SenderRecoveryStage\`）、Rayon が全コアに作業を展開。
3. **I/O 償却。** ディスク書き込みはブロックごとではなくステージ境界の大きなソート済みバッチで起きる。

> 🛑 **最後の予測。** 読み進める前に、この 100× を具体的なステージに帰属させてみてください。最も寄与するのはどれ?

おおよそ: ECDSA 復元のバッチ化＋並列化が〜10×、Merkle ルートを範囲ごとに1回（ブロックごとではない）でさらに〜10×、MDBX が効率的に書ける大きなソート済みバッチが〜3×。掛け合わせて〜300× が理論値; ハードウェア依存で実際は 100〜200× に着地。

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

読むのはリハーサル。**実装するのが記憶。** このドリルは「Staged Sync について読んだ」から「\`SenderRecoveryStage\` を1行ずつ読み、ソースから3つのアーキテクチャ上の問いに答えた」まで連れて行きます。

## セットアップ

\`\`\`bash
git clone https://github.com/paradigmxyz/reth
cd reth
\`\`\`

ビルドする必要はありません — これは読みのドリルで、コンパイルのドリルではありません。

## ターゲットファイル

\`crates/stages/stages/src/stages/sender_recovery.rs\`

開いてください。順番に進めます。

## ドリル 1 — \`Stage\` 実装を見つける

> 🛑 **スクロール前に予測。** \`SenderRecoveryStage::execute\` は何をするか、一文で? 中の「計算」は? その周りの「I/O」は? 文を書き留めてから先へ。

ファイルを開きます。\`impl<Provider> Stage<Provider> for SenderRecoveryStage\` を見つける。\`execute\` メソッドが目標です。

メソッド本体をざっと読み、3つのセクションを特定:

1. **読み** — 入力範囲のブロックの tx エンベロープを MDBX から取得
2. **計算** — 各 tx の sender を ECDSA で復元（ここで Rayon が登場）
3. **書き** — 復元した sender を MDBX に書き戻し、checkpoint を更新

予測した文がこの読み/計算/書きの分割を捉えていなかったら、組み立てレッスンのステップ1に戻ってください — この形はパイプライン全体のパターンで、このステージ固有のものではありません。

## ドリル 2 — バッチループを見つける

ステージは \`ExecInput.target\` の *全* ブロックを一度に処理するわけではありません。バッチ化します。

> 🔍 **バッチループを見つける。** ファイル内で \`commit_threshold\`、\`chunk\`、\`batch\` を検索。

> 🛑 **質問（書き留めて）:** なぜバッチ化するのか? なぜ範囲の全ブロックを一度に処理しないのか?

理由は2つ:

1. **メモリ。** 1000 万署名分のエンベロープバッファを RAM に保持するのは高コスト。バッチを切ることで working set を有界に保てる。
2. **Backpressure。** 各バッチの後、ステージは \`done: false\` を返してオーケストレータに「commit して次に進むか、また呼ぶか」を判断させる。バッチ化しないと、ステージは all-or-nothing でしか commit できない。

ステージ struct の \`commit_threshold\` フィールドがバッチサイズを制御します。**デフォルト値を見つけてください** — これは本番でチューニングできる値です。

## ドリル 3 — \`done: false\` が返される箇所を見つける

メソッド本体で \`done: false\` または \`ExecOutput { done\` を検索。

> 🛑 **質問:** \`done\` が \`true\` に切り替わる条件は?

ステージが \`ExecInput.target\` までの全ブロックを処理し終わったとき（この範囲でこれ以上仕事がない）。それまでは \`done: false\` がオーケストレータに「次のバッチでまた呼んで」と伝えます。true になったら、オーケストレータは次のステージに進みます。

## ドリル 4 — Rayon の並列化を見つける

ファイル内で \`par_iter\` または \`rayon::\` を検索。

> 🔍 **質問:** Rayon はどこで登場? どのデータに?

内側の ECDSA 復元ループ — 通常はこんな形です:

\`\`\`rust
chunk.par_iter()
    .map(|tx| recover_signer(tx))
    .collect::<Vec<_>>()
\`\`\`

各 tx の sender 復元は独立 → コア間に展開しても安全 → Rayon が仕事を捌く。

> 🛑 **最終質問（答えを書き留めて）:** チェーンが1ブロックあたり 20 倍の tx を持つようになり、コア数は変わらないとします。\`SenderRecoveryStage\` は *20 倍* 遅くなるでしょうか? なぜ、あるいはなぜそうならないのか?

サブ線形にスケールします。1ブロックあたりの tx が増えると各 Rayon バッチも大きくなるが、コア数は同じ — 実時間は総署名数に対して概ね線形に伸びるものの、バッチごとのオーバーヘッド（chunking、チャンネル調整）が増えた仕事に償却されるため、総スループットは少し改善する。**結果として、20倍の署名でも〜15–18倍程度の遅さ** にとどまります（キャッシュ挙動次第）。

## レッスン終了の想起

スクロールせずに、自分の言葉で:

1. \`SenderRecoveryStage::execute\` の読み/計算/書きの構造は?
2. \`commit_threshold\` は何を制御する? なぜ存在するのか?
3. なぜ Rayon の並列化は ECDSA 復元に適用され、（例えば）MDBX 書き込みには適用されないのか?
4. なぜ \`done: false\` が戻り値の状態として存在するのか? 全 \`execute\` が範囲全体を完了する必要があったら何が壊れるか?

どれか曖昧なら、ここで足止めです。関連する組み立てステップを読み直すか、ファイルを開き直してください。

## ドリル 5 — \`tracing\` 経由でステージが実行される様子を観測する（任意）

これまで全部「読む」だった。最後に **動かして見る** 1 段。Reth はあらゆるステージに \`tracing\` の span / event を仕込んでいる。debug レベルで動かせば、本番ノードでステージが何をしているかが行ごとに見える:

\`\`\`bash
# reth リポジトリのルートで:
RUST_LOG=reth_stages=debug,reth_stages_api=debug \\
  cargo run --bin reth --release -- node --dev --dev.block-time 5s
\`\`\`

\`--dev\` は単一ノードの devnet を起動し、\`--dev.block-time 5s\` で 5 秒ごとにブロックを mine する。ターミナルにステージ遷移ログが流れ始めるはず — \`headers\`、\`bodies\`、\`sender_recovery\`、\`execution\`、\`hashing\`、\`merkle\`、\`tx_lookup\` などの span が、各ブロックに対して **読んだとおりの順序で** 走る。

> 🛑 **何を観察すべきか:** 特定のブロック番号で \`sender_recovery\` の開始 → \`commit\` → 完了の流れが現れる。その間に \`execute()\` が **何回呼ばれているか** を数える（バッチサイズが小さいと複数回 — \`done: false\` の戻りパターンの実物）。

これが本物。組み立てで読んだ「\`done: false\` を返してオーケストレータに backpressure を伝える」 が、\`tracing\` 出力にそのまま現れる。**メンタルモデルとログの一致が、レッスンを「分かった」から「動くと分かった」へ昇格させる。**

このドリルを終えた時点で、Paradigm が Reth を同期させているのと同じコードを読めるようになっています。`,
                },
                {
                  title: 'Rust：ライフタイム・Box・Arc・dyn Trait',
                  slug: 'rust-lifetimes-arc-dyn-ja',
                  type: 'CONTENT',
                  sortOrder: 4,
                  duration: 15,
                  xpReward: 30,
                  content: `# Rust：ライフタイム・Box・Arc・dyn Trait

ExEx のソースファイルを開いてみてください。最初の 10 行で \`Arc<>\`、\`'static\`、\`dyn Trait\`、\`Box<>\` が立て続けに出てきます。Rust の **「上級だが実は単純」** な4つの機能 — Reth が出荷するコードを読むには、そのいずれもが必要です。**このレッスンはあなたを試すもので、教えるものではありません** — 予測プロンプトでつまずくなら、そのギャップは本物で、埋める価値があります。

> 🛑 **コールドスタート: 各概念を一文で定義してください。** スクロールせずに：
> - \`'a\`（ライフタイムパラメータ）
> - \`'static\`
> - \`Box<T>\`
> - \`Arc<T>\` (\`Rc<T>\` との違い)
> - \`Mutex<T>\`
> - \`dyn Trait\`
>
> 2 つ以上つまずいたら、このレッスンには十分価値があります。すらすら答えられたなら、レッスンはあなたの定義が **本当に正しいか** をテストします。

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

ExEx のような **「いつ終わるか分からないバックグラウンドタスク」** には \`'static\` 制約が頻出します。

> 🛑 **予測。** \`tokio::spawn\`（Tokio は Rust の非同期ランタイム — future を駆動する実行系）に渡すクロージャが \`'static\` を必要とするのはどんなときか? なぜ? 続ける前に答えてください — この境界は今後読むすべての ExEx ファイルに出てきます。

## 2. \`Box<T>\` — ヒープに置く

スタックではなくヒープに値を置きたいとき、\`Box<T>\` で包みます。

\`\`\`rust
let boxed: Box<i64> = Box::new(42);
println!("{}", *boxed);   // 42
\`\`\`

主な用途：

- **再帰的なデータ構造**（連結リストなど）でサイズを固定したい
- **動的サイズ** の値（\`dyn Trait\`）を保持したい
- 大きい値を **コピーではなくムーブ** で安価に扱いたい

> 🛑 **予測。** \`Box\` がない場合、\`enum List { Cons(i32, List), Nil }\` を書けないのはなぜか? コンパイラの不満を文字に起こしてください。

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

**Reth/ExEx では \`Arc<...>\` だらけ** になります。「複数のタスクが同じデータを読む」のが典型的な場面だからです。

> 🛑 **理解度チェック。** \`Arc::clone(&x)\` は内部の \`T\` をディープコピーしません。では正確に **何を** コピーしているのか? そのコストは? なぜ "Arc" の "A" は "Atomic" なのか?

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

> 🛑 **予測。** \`.lock().unwrap()\` はどんなときに panic するか? それはいつ起きるか? (ヒント: 知らなければ "poisoning" で検索。) **Reth のコードには \`.lock().unwrap()\` が至る所にあります** — いつクラッシュし得るのかは理解しておいてください。

## 5. \`dyn Trait\` — 動的ディスパッチ

トレイトオブジェクト。**「実行時にメソッドを解決する」** という意味で、Java/TS の interface に近い挙動になります。

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

> 🛑 **理解度チェック。** \`Box<dyn Greet>\` は呼び出し地点で \`Box<En>\` よりコストが高い。**そのコストは正確にどこにあるのか?** vtable とは何か? 答えられないなら、動的ディスパッチをまだ理解できていません — 読み直しを。

## 6. これから ExEx コードで見る形

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

> 🛑 **止まる。スクロール前にこのシグネチャに頭の中で注釈を付けてください。** どこがジェネリクス? どこがトレイト境界? 内部で共有所有権を使うのは? 暗黙のライフタイムは?

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

> 最終チェック: タブを閉じて、ExEx の \`my_exex\` シグネチャを記憶から書き出してください。書けないなら、語彙をまだ自分のものにできていません — もう一度開き直してください。次のレッスンは ExEx を詳細に読みます。カンニングペーパーなしで各概念が必要になります。`,
                },
                {
                  title: 'ExEx API をステップで組み立てる',
                  slug: 'reth-exex-buildup-ja',
                  type: 'CONTENT',
                  sortOrder: 5,
                  duration: 10,
                  xpReward: 25,
                  content: `# ExEx API をステップで組み立てる

> 🧭 **systems engineering スタックでの位置:** **DB 層の pub-sub インタフェース** と **上流への prune プロトコル** の組み合わせ。PostgreSQL の logical replication、Kafka consumer の offset 追跡、CDC パイプラインが共通して解いてきた問題 — 「下流コンシューマが commit 済みイベントを読めるようにしつつ、上流に永久保持を強いない」。ExEx は、その発想を Reth に持ち込んだもの — インプロセスのコンシューマが「N まで読み終えた」と伝え、ノードが安全に prune できるようにする。

**ExEx（Execution Extension）** は Reth が提供する「実行ループに Rust コードを注入する」仕組みです。これでノード速度のインデクサ・MEV ボット・リアルタイムリスクエンジンを **チェーン本体と同じプロセス内で** 構築できます。

ただ API には重そうな部分が4つあります: init/run の分割、3 つのバリアントを持つ通知 *enum*、prune ヒント用のイベントチャンネル、ノードビルダーへの install メソッド。素のまま読むと、4 つのアイデアが一度に降ってきます。

このレッスンでは、最も素朴な「ブロックリスナー」から API を積み上げていきます。最後まで通せば、本物の最小 ExEx の全要素を自分で組み立てたことになります — 次のレッスンでそれを詳細に読みます。

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

> 🛑 **予測。** スクロールせずに: この素朴な設計が Reth の中で動かす場合と比べて *大幅に劣る* 理由を 3 つ挙げてください。（ヒント: それぞれ *別種の* 問題です。）

3つ:

1. **レイテンシ。** RPC ポーリングにはリクエスト/レスポンスのオーバーヘッドがある。インデクサは tip から数秒遅れる — MEV、リスク、リアルタイム UX には使えない。
2. **アトミック性。** Reth は新ブロックを *先に* ディスクへコミットし、その後にあなたのインデクサが見る。Reth がブロックを持っていてあなたのコードがまだ処理していない期間が必ず存在する。あなたのコードが派生ビューの正典であれば、その期間は race condition になる。
3. **Reorg。** ポーリングでは \`head = N\` を見て、後で \`head = N\`（だが中身は違うブロック）を見ることになる。インデクサは外側で reorg を検出して扱う必要がある — しかも Reth 自体より弱い情報で。

修正方針: **Reth と同じプロセスで動かす。** ブロックがコミットされた瞬間に、フルチェーンコンテキスト付きで通知を受け取る。

## ステップ 1 — 最初の試案: ブロックごとのコールバック

素朴なインプロセス API:

\`\`\`rust
fn on_new_block<F: Fn(&Block)>(reth: &mut Reth, callback: F) {
    reth.add_listener(callback);
}
\`\`\`

Reth が新ブロックごとにクロージャを呼ぶ。シンプルです。

> 🛑 **予測。** 何が足りないか?（大きく2つあります。）

2つ:

1. **Reorg は append-only ではない。** 「新ブロック追加」だけのコールバックでは「ブロック N のハッシュ X がハッシュ Y に置換された」を表現できない。インデクサの導出状態は reorg のたびに静かに壊れる。
2. **Reth に「終わった」を伝える方法がない。** インデクサがブロック N を処理中なら、Reth はブロック N-100,000 のデータを prune してよいか判断できない。このシグナルがないと **Reth は何も捨てられません。**

## ステップ 2 — リッチな通知: 3 つのチェーンイベント

裸のコールバックを、チェーンに起こり得る 3 種類の出来事を捉える enum に置き換えます:

\`\`\`rust
enum ExExNotification {
    ChainCommitted { new: Chain },             // canonical ブロック追加
    ChainReorged   { old: Chain, new: Chain }, // old が new に置換
    ChainReverted  { old: Chain },             // 削除（置換なし）
}
\`\`\`

各バリアントが、インデクサが派生状態を undo / redo するのに十分な情報を運びます:

- **\`ChainCommitted { new }\`** — 新しいブロックの状態をインデックスに追記。
- **\`ChainReorged { old, new }\`** — \`old\` の状態を undo し、\`new\` の状態を適用。アトミックなスワップ。
- **\`ChainReverted { old }\`** — \`old\` の状態を undo して待つ。Reth は新しい tip を選んだら後続の \`ChainCommitted\` を送る。

> 🛑 **理解度チェック。** トランザクションを \`HashMap\` にインデックスしている。\`ChainCommitted\` だけを扱う。チェーンが 5 ブロック深く reorg した。**HashMap の何がおかしくなるか?** 失敗モードを 2 文で具体的に書いてください。

HashMap には *古い* チェーンのトランザクションが入っている一方、canonical チェーンは *新しい* チェーン。インデックスを後で読むと、canonical 上に存在しないトランザクションが返ってくる — phantom-data バグです。さらに悪いことに、*新しい* チェーンのトランザクションはインデックスされなかった（\`ChainCommitted\` を見ていない、無視した \`ChainReorged\` を見た）。

これが **ExEx の #1 バグ** です。3 バリアントの enum はこれを防ぐために存在しています。

## ステップ 3 — Reth に「終わった」と伝える: \`FinishedHeight\`

インデクサがブロック N を処理し終わったら、Reth にそれを知らせる必要があります。さもないと N 以下を安全に prune できません。

\`\`\`rust
ctx.events.send(ExExEvent::FinishedHeight(block_number_hash))?;
\`\`\`

\`ctx.events\` は Reth への書き込み専用チャンネルです。ハンドラがブロック（あるいはチェーン）を終えるたびに \`FinishedHeight(N)\` を送ります。Reth はインストールされた全 ExEx の最小値を集約し、その下を prune します。

> 🛑 **ディスクへの影響を予測。** \`FinishedHeight\` イベントなしで ExEx をリリースしたとします。半年後、ノードはブロック 21M。ExEx なしのノードと比べてディスク使用量はどうなるか? なぜか?

Reth が通常なら prune するはずの履歴をすべて抱え込みます — ExEx が後から読みたがるかもしれないものを安全には prune できないからです。**ディスク使用量は複利で膨らんでいきます。** \`FinishedHeight\` を忘れると、「無害なインデクサ」が知らぬ間に Reth をフルアーカイブノードに変えてしまいます。

## ステップ 4 — 通知ストリーム: コールバックではなく非同期 pull

コールバック方式だと、Reth はブロックごとにあなたの遅いコードを待つことになります。望ましい形は、通知をストリームに push し、ハンドラが準備できたときに pull する方式です:

\`\`\`rust
while let Some(notification) = ctx.notifications.try_next().await? {
    // 自分のペースで処理
}
\`\`\`

\`ctx.notifications\` は \`ExExNotification\` の \`Stream\` です。\`try_next\` は async で、ハンドラは Reth と同じ async ランタイム上で動きます。**Reth の進捗があなたのインデックス速度に縛られない**、それでいてハンドラは全イベントを順番に観測します。

Reth が停止するかチャンネルが閉じると、ループはきれいに \`Ok(())\` で抜けます。

## ステップ 5 — init/run の分割

ユーザーは async ループを開始する前に *同期的なセットアップ*（ファイルを開く、DB を初期化する、バッファを確保するなど）を済ませたい。単一の \`async fn\` だと、このセットアップを future の中に押し込むことになり、推論しづらくなります:

\`\`\`rust
async fn exex_init<Node: FullNodeComponents>(
    ctx: ExExContext<Node>,
) -> eyre::Result<impl Future<Output = eyre::Result<()>>> {
    // 同期的セットアップはここ
    Ok(exex(ctx))  // 長時間動く future を返す
}
\`\`\`

関数2つ:

- **\`exex_init\`** — ノード起動時に *1度だけ* 走る。同期的セットアップ。future を返す。
- **\`exex\`**（その future）— *永続的に*（または停止まで）走り続ける。通知ストリームを poll する。

> 🛑 **予測。** init/run の分割がなぜ必要なのか? ファイルを開く処理を \`exex_init\` ではなく \`exex\` に入れると、どんな具体的なバグが発生するか?

Reth は通知の push を始める前に、ExEx が生きていることを *確認する* 必要があります。\`File::open(...)\` を \`exex\` の中に入れてしまうと、Reth がすでに通知をバッファし始めた *後* にファイルを開くことになる — 失敗（権限なし、パス不存在）すると、Reth は ExEx が健全だと思い込んでいる間に通知が積み上がります。init/run の分割により、Reth は「ExEx が起動できなかった」と「ExEx が動いた後でクラッシュした」を区別できます。

## ステップ 6 — \`install_exex\`: 複数の拡張

\`main\` で ExEx をノードビルダーに配線する:

\`\`\`rust
.install_exex("MyIndexer", exex_init)
.install_exex("MevWatcher", mev_init)
.install_exex("RiskEngine", risk_init)
\`\`\`

第 1 引数は名前（メトリクスとログで使われる）、第 2 引数は init 関数です。**\`.install_exex(...)\` は複数チェインできます** — 各 ExEx は独立した通知ストリームと \`FinishedHeight\` チャンネルを持ちます。

**実用的な含意:**

- **互いに干渉しない。** インデクサが遅延しても MEV Watcher の処理は止まらない（各 stream が独立にバッファされる）
- **Pruner は最遅の 1 つに合わせる。** Pruner はインストールされた全 ExEx の \`FinishedHeight\` の **最小値** より下しか prune しない — インデクサがブロック 100 で止まれば、Reth は MEV Watcher が 1000 まで進んでいてもブロック 100 以下を保持する
- **クラッシュは独立。** ある ExEx が panic しても他の ExEx と Reth 本体は動き続ける（init で失敗した場合は除く — その場合はノード起動が失敗）
- **メトリクスは ExEx ごと。** 第 1 引数の名前が \`reth_exex_<name>_*\` 系メトリクスのラベルになる

> 🛑 **理解度チェック。** あなたのインデクサがある日 OOM で落ちて、別 ExEx の MEV Watcher は問題なく走り続けたとします。Pruner は何時間ぶんの履歴を抱え込み始めるか? なぜか?

インデクサが落ちた時点での \`FinishedHeight\` で Pruner は固まる — その瞬間以降に到達したブロックは全部「インデクサがまだ読みたいかも」という扱いになり、prune できない。インデクサを再起動して \`FinishedHeight\` を進めるまで、Reth は **インデクサが落ちていた間ずっと** 全履歴を蓄積する。これが本番で「監視を忘れた死んだ ExEx がディスクを食い潰す」事故の典型形です。

## ここまでに組み立てたもの

各要素がきちんと役割を果たしています:

- **3 バリアントの \`ExExNotification\`**（ステップ 2）— append、reorg、revert を扱う
- **\`FinishedHeight\` イベント**（ステップ 3）— opt-in の prune、ディスク膨張を防ぐ
- **ストリーム pull の通知**（ステップ 4）— Reth がハンドラでブロックしない
- **init/run の分割**（ステップ 5）— async ループ前の同期的セットアップ
- **\`install_exex\`**（ステップ 6）— 複数の拡張、それぞれ独立したストリーム

次のレッスンでは最小 ExEx — \`main.rs\` の約 40 行 — を読み、5 つの要素が実コードでどう組み合わさるかを示します。

## 進む前の想起

スクロールせずに:

1. なぜ API はコールバックではなくストリームで通知を push するのか?
2. \`ExExNotification\` の 3 バリアントは何で、なぜすべて必要なのか?
3. \`FinishedHeight\` は Reth に何を伝える? 忘れたときのディスク帰結は?
4. なぜ API は \`exex_init\`（同期）と \`exex\`（async future）に分かれているのか?

どれか曖昧なら戻る。次のレッスンでは本物の最小 ExEx を詳細に読みます。

> **🧭 ここまでで積み上げたもの:** **DB 層の pub-sub + prune プロトコル** が完成 — 3 バリアントの \`ExExNotification\`、\`FinishedHeight\` によるバックプレッシャ、ストリームの pull、\`init/run\` の分離、\`install_exex\` による注入。Kafka コンシューマの offset 管理や Postgres の論理レプリケーションスロットと同じ構造を、EVM チェーン同期に持ち込んだかたち。次のレッスンでは、最小 ExEx の本物のソースを、このモデルに突き合わせて読む。
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

動く ExEx は Rust 約 40 行で書けます。それだけ — Reth を fork する必要も、別プロセスを立てる必要もなく、ノードビルダーに渡す関数を 1 つ書けば、Reth が同じバイナリ内で走らせてくれます。下は [\`paradigmxyz/reth-exex-examples/minimal\`](https://github.com/paradigmxyz/reth-exex-examples/tree/main/minimal) の \`main.rs\` 全体です。このレッスンの最後には、各行が前レッスンの組み立てステップに対応していることが分かるはずです。

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

では順に追っていきます。

## 1 行ずつ追う

### \`exex_init\` — init/run の分割（ステップ 5）

\`\`\`rust
async fn exex_init<Node: FullNodeComponents>(
    ctx: ExExContext<Node>,
) -> eyre::Result<impl Future<Output = eyre::Result<()>>> {
    Ok(exex(ctx))
}
\`\`\`

\`exex_init\` はノード起動時に *1 度だけ* 呼ばれます。Reth が \`ExExContext\` を渡してきます — これは \`notifications\`（流れてくるチェーンイベントのストリーム）、\`events\`（Reth の pruner への返信チャンネル）、ノードコンポーネントへのハンドルをまとめた struct です。あなたは、Reth が永続的に poll する future を返します。

この最小 ExEx は同期的セットアップを何もしません — \`ctx\` を \`exex\` にそのまま渡すだけ。**本物の ExEx** で \`File::open(...)\` や \`Database::connect(...)\` が必要なら、その処理は future を返す *前* に \`exex_init\` 内で行います。

> 🔍 **リポジトリで確認。** \`tracking-state\` の例を開く。\`minimal\` がやっていないことを \`exex_init\` でやっているのは何か?

### \`exex\` — 長時間動く future

\`\`\`rust
async fn exex<Node: FullNodeComponents>(mut ctx: ExExContext<Node>) -> eyre::Result<()> {
    while let Some(notification) = ctx.notifications.try_next().await? {
        // ...
    }
    Ok(())
}
\`\`\`

メインループです。\`ctx.notifications\` は非同期チャンネル（Reth がチェーンイベントを push してくる型付きキュー）。\`try_next()\` はスレッドをブロックせずに次のイベントを await します — 利用可能な通知がなければ、ランタイムはタスクを park して他の ExEx や Reth 自体を走らせます。協調的並行、ブロッキングなし。

チャンネルが閉じる（ノード停止）と、\`try_next()\` は \`Ok(None)\` を返し、\`while let\` が抜け、関数は \`Ok(())\` を返します。きれいな終了。

### 3 アームの match（ステップ 2）

\`\`\`rust
match &notification {
    ExExNotification::ChainCommitted { new } => { /* ... */ }
    ExExNotification::ChainReorged { old, new } => { /* ... */ }
    ExExNotification::ChainReverted { old } => { /* ... */ }
};
\`\`\`

ここが load-bearing な判断です。**3 アームすべてが必要** — おもちゃ以上の ExEx であれば:

- **\`ChainReorged\` 欠落** → 派生状態に *古い* チェーンのデータが残り続け、新 canonical チェーンのデータは欠落（\`ChainCommitted\` が来ないため）。
- **\`ChainReverted\` 欠落** → reorg をトリガーした後、Reth が新 tip を選ぶ前の状態で、あなたの状態は canonical より 1 チェーン分進んでしまっていて、巻き戻す手段がない。

最小 ExEx は各バリアントをログするだけ。学習用には有益ですが実用ではありません。**本物の ExEx は派生状態を更新します** — そして 3 アームを正しく扱えるかどうかが、動くインデクサと phantom-data バグを分けます。

> 🛑 **理解度チェック。** \`ChainReorged\` アームを読む。\`old\` と \`new\` の両方が渡される。**なぜ両方なのか?** \`new\`（reorg 後の tip）だけではダメか?

インデクサは \`new\` を *apply* する前に \`old\` の状態変更を *undo* する必要があるからです。\`new\` だけだと、古いチェーンの効果を派生状態から巻き戻せず、静かに二重カウントするか取りこぼします。

### \`committed_chain()\` と \`FinishedHeight\`（ステップ 3）

\`\`\`rust
if let Some(committed_chain) = notification.committed_chain() {
    ctx.events.send(ExExEvent::FinishedHeight(committed_chain.tip().num_hash()))?;
}
\`\`\`

知っておくべき 2 メソッド:

- **\`notification.committed_chain()\`** — \`ChainCommitted\` *と* \`ChainReorged\`（new チェーン）には \`Some(Chain)\` を、\`ChainReverted\` には \`None\` を返す。**「この通知後の canonical 状態は何か」を取り出すアクセサです。**
- **\`ctx.events.send(ExExEvent::FinishedHeight(...))\`** — Reth の pruner に「このブロックまで処理した、これ以下は prune してよい」と伝える。

**commit を伴う通知ごとに \`FinishedHeight\` を送ること。** 忘れると、ノードはアーカイブデータを永久に蓄積し続けます（前レッスンのステップ 3 のディスク膨張シナリオです）。

> 🔍 **検証。** \`reth-exex\` の \`notification.committed_chain()\` のソースを開き、今説明した 3 ケースの挙動を確認。

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

これは「通常の Reth ノード + 拡張 1 つ」です。\`install_exex("Minimal", exex_init)\` が ExEx 固有の唯一の行。**\`install_exex\` を重ねていけば**、拡張をコンポーズできます。

## 本物の ExEx は何をやっているか

同じリポジトリにより本格的な例があります:

| 例 | 内容 |
| :--- | :--- |
| \`backfill\` | 起動時に過去ブロックを自分のハンドラに再生 |
| \`in_memory_state\` | 各ブロックから派生したカスタムインデックス状態を保持 |
| \`tracking-state\` | ExEx 内部状態を別 DB に永続化（再起動が安い） |
| \`rollup\` | ExEx フックだけで最小ロールアップを実装 |

> 🔍 **\`rollup\` を開いてください。** state 変更をコミットしている箇所まで読む。**ExEx としてのロールアップ — その意味を少し考えてみてください。** これがアーキテクチャ上のアンロックです: ロールアップを作るのに Reth を fork する必要はなく、拡張として作れる。

## クイズ前の想起

スクロールせずに:

1. \`exex_init\` でできて \`exex\`（future）でできないことは何か?
2. なぜおもちゃ以上の ExEx は 3 つの通知バリアントを全部扱う必要があるのか?
3. \`notification.committed_chain()\` は 3 つのバリアントそれぞれで何を返すか?
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

読むのはリハーサル。**実装するのが記憶。** このドリルは「ExEx について読んだ」から「自分で書いて、それが reorg を正しく乗り越える様子を観察した」までを連れて行きます。

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

> 🛑 **質問（書き留めて）:** 最初の 10 ブロックで何がログされるか? すべてのログ行が \`ChainCommitted\` か、それとも他のバリアントも見えるか?

新規同期中は、すべてのブロックで \`ChainCommitted\` が見えます。\`ChainReorged\` と \`ChainReverted\` はもっと珍しい — 実際のチェーン不一致が必要で、holesky はメインネットより頻繁に発生させます（ハッシュパワーが低い → contested fork が増える）。

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

> 🛑 **予測。** 再実行してみてください。holesky のブロックあたりの平均 tx 数は? メインネットでは?

Holesky: 低め — 通常 5〜20 tx/ブロック、たまに 0。メインネット: 100〜300、ブロックの混雑度次第。**ゼロレイテンシで本物のチェーンデータを読んでいることになります。**

## ドリル 3 — reorg-safe な HashMap を追加

各アドレスが送ったトランザクション数を追跡します。**reorg を正しく乗り越える** — そこが要点です。

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

（API 名は手元の reth の現状に合わせて調整してください — \`block.body.transactions()\` vs \`.transactions\`、\`tx.signer()\` vs \`tx.recover_signer()\` など。重要なのは *構造* であって、正確な識別子ではありません。）

> 🛑 **質問:** 3 アームを読む。**任意の通知シーケンスの後で \`tx_count\` が正しい状態であるために保たれるべき不変条件は?**

**各 \`Address\` について、カウント = (canonical チェーンで送られた tx 数) − (commit された後で revert されたセグメントで送られた tx 数)。** Reorg アームがコツ: \`old\` を undo して \`new\` を apply、これを 1 通知でアトミックに行う。

\`ChainReverted\` で \`-=\` を忘れると、カウントは永久に膨らみ続けます。\`ChainReorged\` で \`-=\` を忘れると、カウントは canonical ではなく、古いチェーンと新しいチェーンの和を表すことになります。

## ドリル 4 — Reorg ハンドリングを検証

Holesky は時々 reorg を生成する。数時間動かす。

> 🔍 **Reorg を見つける。** ログで「Received reorg」を検索。出てきたら:
>
> 1. \`from_chain\` と \`to_chain\` の範囲をメモ。
> 2. Reorg ログ行 *の前に* 高 tx アドレスの \`tx_count\` をスポットチェック — カウントを記録。
> 3. Reorg ログ行 *の後に* 再度記録。
> 4. 手動で確認: そのアドレスでの古いチェーンと新しいチェーンセグメントの差と一致してカウントが変化したか?

一致していれば、インデクサは reorg-safe です。**本番グレードのインデクサ（goldsky、the graph など）が出荷しているのと同種のコードを書いたことになります。**

> 🛑 **最終質問:** \`ChainReorged\` アームでの操作の *順序* がなぜ重要なのか? 具体的に: \`new\` を apply してから \`old\` を undo しても問題ないか?

問題になるケースは厳密に 1 つ: \`old\` と \`new\` が共通プレフィックスを共有していて、ランタイムがそれを *両方から省く* 場合 — ただし、実装が共有ブロックを両方に含めると、\`new\` を先に apply した場合に一旦二重カウントになり、その後 \`old\` の undo でゼロに戻ることになる。慣習は **\`old\` を先に undo してから \`new\` を apply** で、これは Reth 自体が reorg を処理する時系列順と一致します。

## レッスン終了の想起

スクロールせずに、自分の言葉で:

1. \`ChainReorged\` で \`old\` と \`new\` を同じ通知で扱う論理的根拠は?
2. 3 アームのパターンが派生状態について保つ不変条件は?
3. \`FinishedHeight\` を忘れると、ディスク上で時間と共に何が膨らむか?
4. ExEx が別プロセスの RPC ポーリングインデクサに勝つ、唯一のアーキテクチャ上の理由は?

このドリルを終えれば、reorg-safe でノード速度のインデクサを出荷したことになります。**同じ道具で MEV ボット、リアルタイムリスクエンジン、ロールアップも作れます。**`,
                },
                {
                  title: 'ノードビルダー API をステップで組み立てる',
                  slug: 'reth-sdk-buildup-ja',
                  type: 'CONTENT',
                  sortOrder: 9,
                  duration: 10,
                  xpReward: 25,
                  content: `# ノードビルダー API をステップで組み立てる

> 🧭 **systems engineering スタックでの位置:** ノード全体の **組み立て / DI 層**。Spring のコンテナ、Kubernetes operator、Linux init system が共通して直面する問題 — 「ユーザがコンポーネントを 1 つだけ差し替えても、残りには触らずに済み、触らないものにはデフォルトが効く」。Reth SDK は、その発想を型付きビルダーとして表現し、L1 / L2 の構築に持ち込んだもの。

ExEx は既存の Ethereum ノードを拡張するもの。**Reth SDK** はコンポーネントを組み立てて *自前の* App-chain を Rust で構築できる仕組みです。「purpose-built EVM L1」という thesis が **コンパイル可能なバイナリ** に化けるのはここ。

ただ API は流れるような呼び出し — \`with_types\`、\`with_components\`、\`with_add_ons\`、\`launch\` — が並び、それぞれがアーキテクチャ上まったく違うことを決めています。このレッスンでは「最も素朴に動くもの」から積み上げて、各メソッドがなぜ意味を持つかを示します。

最後まで通せば、以下の全要素を自分の手で組み立てたことになります:

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

何も考えずにカスタム L1 を出すならこんな形:

\`\`\`bash
git clone https://github.com/paradigmxyz/reth my-chain
cd my-chain
# 好きなように crates/ を編集
cargo build
\`\`\`

200K 行以上の Reth を丸ごと fork し、必要箇所を編集してリリース。

> 🛑 **予測。** スクロールせずに: 何年もチェーンを運用するなら、この素朴なアプローチが *破滅的* になる理由を 3 つ挙げてください。（ヒント: それぞれ *別種の* コストです。）

3つ:

1. **アップストリームの分岐。** Paradigm は Reth のアップデートを毎週リリースしています。あなたの fork はそれをきれいに取り込む手段がない — リリースのたびに rebase 地獄。半年も経つと安全にアップグレードできなくなる。
2. **抱え込みたくない表面積。** *1 つの* サブシステムを変えたいから fork したのに、今では *すべて* を抱え込むことになる — 読んだことのないコードのバグ、追跡しなければならないセキュリティパッチ、決して触らないがビルドし続けるモジュール。
3. **レビューコスト。** レビュアーには、あなたが実際に変更した 50 行と、触っていない 200K 行の区別がつかない。監査、セキュリティ会社、規制当局 — 全員があなたの fork を新しいクライアントとして扱うことになります。

修正方針: **fork するのではなく、組み立てる。** 実際に変えたいサブシステムだけを上書きし、残りは Reth をライブラリとして依存する。

## ステップ 1 — 差し替えポイントを特定する

実際にカスタマイズしたくなるサブシステムは何か?

> 🛑 **予測。** Tempo（payments 特化型 L1）を作るなら、Reth のどのサブシステムを差し替える?（ヒント: 候補は 4〜6 個。）

実本番のチェーンに登場する候補:

| サブシステム | 何を変えるか | 本番例 |
| :--- | :--- | :--- |
| **Pool** | 受付ルール、優先レーン | Tempo は payments tx を gas 価格より優先するレーンを実装 |
| **Network** | ピアポリシー、プライベートサブネット | バリデータが互いを優先する private gossip subnet など |
| **Executor** | カスタム Opcode、precompile、ガス表 | Hyperliquid は HyperBFT 専用 precompile を追加 |
| **Consensus** | PoS → HyperBFT、PoA、Tendermint | Hyperliquid の HyperBFT、Berachain の Polaris |
| **Payload** | ブロックビルダー | MEV-aware、アプリ固有の優先順 (Tempo の payments-first ordering) |
| **Add-ons** | カスタム JSON-RPC ネームスペース、ExEx フック | tidx の \`tidx_*\` ネームスペース、検閲耐性監視の ExEx |

これらが SDK が公開している差し替えポイントそのものです。それ *以外*（sync オーケストレータ、MDBX スキーマ、ヘッダーダウンロード、sender 復元、ハッシングステージ）は Reth からそのまま使います。

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

上書きを struct で渡す形。動くことは動きますが、ぎこちない。

> 🛑 **予測。** この形には UX 上の問題が 2 つあります。何でしょう?

2つ:

1. **毎回全フィールドを書く羽目になる** — カスタマイズしていないものまで。struct が all-or-nothing を強制する。
2. **型推論が早々に崩れる。** 各コンポーネントが独自のジェネリックパラメータを持つ。それを単一 struct にまとめると推論が効かず、行き詰まった型シグネチャになる。具体的にはこんな形:

\`\`\`rust
// pool だけ差し替えたいのに、コンパイラが全パラメータの specification を要求
let cfg: NodeConfig<
    CustomPool,
    DefaultNetwork<EthereumPrimitives, DefaultDiscovery>,
    DefaultExecutor<EthereumChainSpec, EthereumPrimitives>,
    DefaultConsensus<EthereumChainSpec>,
    DefaultPayload<EthereumPayloadBuilder, EthereumPrimitives>,
> = NodeConfig { /* ... */ };
\`\`\`

毎行に Reth 内部の具体型を書く羽目になり、ライブラリのバージョンアップで型が変わるたびに全ファイル書き直し。実用上、ユーザコードは触れません。

**Builder パターンが両方を解決します。** 各メソッドが 1 つの上書きを受け取り、新しいビルダー型を返す — Rust の型システムが変更を追跡し、デフォルトは暗黙のまま据え置けます。

## ステップ 3 — Builder パターン: 流れるようなチェーン呼び出し

\`\`\`rust
let handle = builder
    .with_pool(CustomPool::default())
    // 残りはスキップ — デフォルト
    .launch()
    .await?;
\`\`\`

各 \`with_*\` 呼び出しが新しいビルダー型を返します。デフォルトは見えないまま。**実際に上書きしたものだけを書きます。**

ただ「コンポーネントごとに 1 メソッド」だけでは Reth のカスタマイズ表面を捉えきれません。もう一段上のグルーピングがあります: *types*（block/tx/header レイアウト）、*components*（上のランタイムサブシステム）、*add-ons*（RPC、ExEx）。本物の SDK はビルダーをこの 3 軸に分けています。

## ステップ 4 — \`.with_types::<EthereumNode>()\`

\`\`\`rust
.with_types::<EthereumNode>()
\`\`\`

これは **型バンドル** を選びます — chain spec、primitives（block・tx・header 型）、engine API。

なぜこれが独立したステップなのか? *型* が他のすべてを支えているからです。tx 構造を変えると、各コンポーネント（pool、executor、payload、network）はその新しい tx 型を使う必要がある。だから SDK は型バンドルを *先に* commit させる — コンポーネント設定よりも前に。

\`EthereumNode\` はデフォルト（Ethereum block + tx + header）。\`OpNode\`（Optimism 型）や独自の \`NodeTypes\` 実装も渡せます。

> 🛑 **理解度チェック。** \`with_types\` がチェーンで \`with_components\` の *後* に来たら、どんな具体的なバグが発生するか? 失敗モードをスケッチしてください。

コンポーネントが、依存する型がまだ確定していない時点で指定されることになります。各コンポーネントビルダーを未確定の型でジェネリックにする（コンパイラと戦う羽目になる）か、\`.with_components\` の引数で型を暗黙に commit する（静かに混乱を招く）かしかない。**\`with_types\` を先頭に置く** ことで、残りのチェーンを型認識可能にしています。

## ステップ 5 — \`.with_components(...)\`: カスタマイズの中心

\`\`\`rust
.with_components(EthereumNode::components().pool(CustomPoolBuilder::default()))
\`\`\`

仕組みはこう: コンポーネントの *基本セット*（\`EthereumNode::components()\`）を取って、\`.pool(...)\`、\`.network(...)\`、\`.executor(...)\` などをチェインして個別ビルダーを上書きする。

ステップ 3 の「変えるものだけ上書き」パターンを、ランタイムサブシステムに適用したものです。デフォルトは見えないまま:

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

カスタムビルダーを 1 つ書いた。残りは Reth から来ます。

> 🛑 **予測。** \`CustomPoolBuilder\` が実装するトレイト \`PoolBuilder\` をスケッチしてください。メソッドシグネチャだけで、本物の impl は不要です。Reth は pool ビルダーから何を必要としているか?

おおよそ:

\`\`\`rust
trait PoolBuilder<Node>: Send {
    type Pool;
    fn build_pool(self, ctx: &BuilderContext<Node>)
        -> impl Future<Output = eyre::Result<Self::Pool>>;
}
\`\`\`

メソッドは 1 つ: コンテキスト（chain spec、primitives などを含む）が与えられたら pool を作る。**コンポーネントは事前に構築されて渡されるのではなく、遅延ビルドされる** — 前のビルダーステップが組み立てたコンテキストを必要とするからです。（次のレッスンで、6 つのビルダー全部に同じ形が現れるのを見ます。）

## ステップ 6 — \`.with_add_ons(...)\` と \`.launch()\`

\`\`\`rust
.with_add_ons(EthereumAddOns::default())
.launch()
\`\`\`

Add-ons はランタイムを支える load-bearing ではない要素です: RPC ネームスペース、engine API 拡張、ExEx インストールなど。\`EthereumAddOns::default()\` で標準 Ethereum RPC。ここに \`.install_exex(...)\` をチェインすれば前レッスンの ExEx パターンが使えます。

\`.launch()\` で本物の仕事が起きます: MDBX を開き、P2P スタックを起動し、sync ステージ用に Tokio タスクを spawn し、RPC サーバーを配線する。これらすべてを駆動する \`NodeHandle\` を返します。

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

各ステップがきちんと役割を果たしています:

- **\`with_types\` 先頭**（ステップ 4）— 型が他のすべてを支える load-bearing な要素
- **\`with_components\` のチェイン上書き**（ステップ 5）— 変えるものだけ上書きし、残りはデフォルト
- **\`with_add_ons\`**（ステップ 6）— load-bearing ではない拡張
- **\`launch\`**（ステップ 6）— 起動

次のレッスンでは **6 つのコンポーネント** を巡ります — それぞれが何をして、差し替えで何が出荷でき、本番のどのチェーンが何を差し替えているのか。

## 進む前の想起

スクロールせずに:

1. なぜ「Reth 全体を fork」は何年も運用するチェーンに通用しないのか?
2. なぜ \`.with_types::<EthereumNode>()\` がチェーンで *先頭* に来るのか?
3. *1 つの* コンポーネントを上書きして残りを Reth デフォルトにするパターンは?
4. \`.launch()\` が実際に起動するのは何?

どれか曖昧なら戻る。次のレッスンでは 6 コンポーネントと、本物のチェーンが何を差し替えているかを巡ります。

> **🧭 ここまでで積み上げたもの:** **ノード全体の組み立て / DI 層** が完成 — \`with_types\` → \`with_components\` → \`with_add_ons\` → \`launch\` の typed builder で、デフォルトを暗黙のまま 1 コンポーネントだけ差し替えられるかたちになった。Kubernetes operator や Spring container が解いているのと同じ問題（6 つのサブシステムを、6 個ぶんのボイラープレートなしで合成する）への、Rust 流の解答。次のレッスンでは、6 つのコンポーネントを順に巡る。
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

Tempo は payments L1 を Reth 上で構築中。Berachain は bera-reth を出荷済み。MegaETH は高スループット L1 を Reth 上で構築中。Hyperliquid は HyperEVM (独自の Reth 近接の実行レイヤ) を動かしています。**どれも Reth を fork していません** — いずれも Reth の 6 コンポーネントのうち数個だけを差し替え、残りを継承しています。これが SDK の最大の売りです: **Rust EVM クライアントを書き直すのではなく、自分の thesis に合う部分だけを差し替える。** このレッスンではその 6 コンポーネントを巡り、本番チェーンが各差し替えで何を解放したかを示します。

今日時点の経験的証拠:

| Chain | Reth との関係 | 証拠 |
| :--- | :--- | :--- |
| **Tempo** | 空 fork | [\`tempoxyz/reth\`](https://github.com/tempoxyz/reth): upstream に対して 0 commits ahead, 1374 behind |
| **MegaETH** | 空 fork | [\`megaeth-labs/reth\`](https://github.com/megaeth-labs/reth): upstream に対して 0 commits ahead, 7666 behind |
| **Berachain** | fork ですらない | [\`berachain/bera-reth\`](https://github.com/berachain/bera-reth): Reth crate を依存として使う独立 repo |

Reth に触れるチェーンはいずれも upstream-as-library のスタンスです。カスタマイズは完全に自分たちの crate 内に収まっています。

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

それぞれに \`*Builder\` トレイト（\`PoolBuilder\`、\`NetworkBuilder\` など）があり、SDK が \`.launch()\` 中にそれらを呼んで実際のサブシステムを構築します。

> 🛑 **予測。** これら 6 コンポーネントの中で、Hyperliquid が HyperEVM 用に最も大きくカスタマイズしたのはどれか? Tempo が payments 用に最も大きくカスタマイズしたのはどれか? 両方の予想を書き留めてから先へ。

## Hyperliquid HyperEVM — 何を差し替えているか

- **\`consensus\`** — Ethereum PoS ではなく **HyperBFT**（独自の Byzantine-fault-tolerant コンセンサスプロトコル）。コンセンサスサブシステムを置き換えています。
- **\`executor\`** — オーダーブック直結の実行: 一部の Opcode が EVM と並走する perp オーダーブックと相互作用する。カスタム executor。
- **\`pool\`** — 高頻度な perp 更新に合わせた受付ルール。
- **その他すべて** — Reth デフォルト。

> 🛑 **理解度チェック。** Hyperliquid は \`consensus\` と \`executor\` を差し替えました。**なぜ Reth 全体を fork してゼロから書き直さなかったのか?** 率直な答えは、SDK が重要である理由そのものです — 彼らは *それ以外* すべて（sync、MDBX、ヘッダーダウンロード、sender 復元、RPC）をアップストリームの Reth に追従させたかった。Paradigm のアップデートを rebase 地獄なしに取り込めるようにするためです。コンポーネント合成は、保守をめぐる物語です。

## Tempo — 何を差し替えているか

Tempo のソースは現在公開されています（[\`tempoxyz/tempo\`](https://github.com/tempoxyz/tempo) — 900+★、"the blockchain for payments"）。中を開く前に押さえておくと有用なのが、Tempo の Reth fork [\`tempoxyz/reth\`](https://github.com/tempoxyz/reth) が upstream Paradigm Reth に対して **0 commits ahead, 1374 commits behind** であること。つまり Reth を fork していません。payments 固有のカスタマイズはすべて \`tempoxyz/tempo\` crate にあり、それが upstream Reth をライブラリとして依存しています。

これは SDK の売りに対する最強の経験的証拠であり、Paradigm の設計が、継承する 80% を触らずにどのコンポーネントを差し替えられるよう作られたかを的確に示しています:

- **\`pool\`** — payments 優先レーン。マーチャント決済が高 gas な DeFi tx の後ろで待たされるべきではない。pool がそれらを別扱いで前に出す。
- **\`payload\`** — payment finality パターンに合わせたブロック構築。
- **\`add_ons\`** — payment 固有エンドポイント用のカスタム RPC ネームスペース、加えて [Machine Payments Protocol](https://github.com/tempoxyz/mpp-specs)（エージェント決済用の HTTP-402 レイヤ）との統合。
- **\`consensus\` / \`executor\`** — Reth デフォルトで十分。カスタム EVM もカスタムコンセンサスも不要でした。

L1 と同時に出荷された隣接 crate（Reth コンポーネント差し替えそのものではないが、Reth を未改造のまま依存できることで成立しているもの）:

- **[Zones](https://github.com/tempoxyz/zones)** — Tempo にアンカーされた confidential blockchain。暗号化された deposit/withdrawal、250ms ブロック時間、L1 から継承される compliance ポリシー（TIP-403）。
- **[tidx](https://github.com/tempoxyz/tidx)** — hot point lookup と analytics 用の PostgreSQL+ClickHouse ハイブリッドインデクサ。

パターン: **thesis に合う部分を差し替え、それ以外はそのまま。** Tempo の thesis は payments-priority で、差し替えたコンポーネントがそれを反映しています。カスタム executor（カスタム Opcode なし）やカスタム consensus（標準 L1 PoS で OK）は不要だったので、書きませんでした。

## Berachain (bera-reth) — 何を差し替えているか

- **\`consensus\`** — **Proof of Liquidity**: バリデータがネイティブトークンを単独で stake するのではなく、流動性を BEX（彼らの DEX）に stake する。コンセンサスルールが Ethereum PoS と異なる。
- **\`executor\`** — PoL と結合しているため、報酬分配が実行と相互作用する。
- **\`add_ons\`** — DEX-aware な RPC ネームスペース。
- **その他すべて** — Reth デフォルト。

[\`berachain/bera-reth\`](https://github.com/berachain/bera-reth) は構造的にも興味深い: そもそも upstream Reth の GitHub fork ですらなく、Reth crate を依存として使う独立 repo になっています。Tempo / MegaETH の空 fork パターンよりさらに鮮明な「compose, don't fork」の表現です。

## MegaETH — 何を差し替えているか

MegaETH ([\`megaeth-labs/\`](https://github.com/megaeth-labs)) は Reth 上に構築された 100K+ TPS L1 の thesis。Tempo よりカスタマイズは深い — thesis (生スループット) が execution と storage の奥まで届く必要があるからです:

- **\`executor\`** — sequencer 上で JIT/AOT コンパイルされた EVM (Paradigm の [\`revmc\`](https://github.com/paradigmxyz/revmc) ベース)。[\`megaeth-labs/mega-evm\`](https://github.com/megaeth-labs/mega-evm) が revm を MegaETH 固有の仕様でラップ。
- **storage / state** — **MDBX を [\`SALT\`](https://github.com/megaeth-labs/salt) (Small Authentication Large Trie) に置き換え** — 30 億アイテムを 1 GB のメモリで保持し、state-root 更新中のランダムディスク I/O を排除する authenticated KV store。標準の 6 コンポーネントスロットではなく、Reth のストレージ抽象を経由してプラグインしています。
- **バリデータは別バイナリを走らせる** — [\`megaeth-labs/stateless-validator\`](https://github.com/megaeth-labs/stateless-validator) が SALT witness を使ってブロックをステートレスに検証する。バリデータは sequencer の数分の一のハードウェアで済みます。
- **\`consensus\` / \`pool\` / \`network\`** — Reth デフォルト + 性能最適化。

MegaETH の事例が教育的に重要なのは、SDK の天井を見せてくれるからです: コア Reth を fork せずにカスタマイズはどこまで深く行けるか。Tempo は数コンポーネントだけ差し替えて残りはそのまま。MegaETH は EVM executor と storage layer を置き換え、**それでも Reth を fork していません** (\`megaeth-labs/reth\`: 0 ahead, 7666 behind)。

## bera-reth を ship した実体験 — Berachain の振り返り

上記のアーキテクチャ各節（「各チェーンが何を差し替えているか」）は *到達地点* を語っています。本節は *journey*（道のり）を語ります — Berachain が dozens of validators を擁する mainnet 上に bera-reth を ship したとき、実際にはどう感じたか。出典は [Berachain チームの Rez 氏自身による寄稿](https://medium.com/@rezayan/building-modular-execution-clients-on-reth-d56c2d65b85a)。本節はそこから、*あなたが* Reth SDK に手を伸ばすときに期待値を変えるべき部分だけを蒸留しています。

### うまくいったこと

| 何が | なぜ重要か |
| :--- | :--- |
| **sync と pruning が無料で継承される** | \`Header\` / \`Block\` trait を実装するだけで、sync、prune、history caching、header download — すべてを 1 行も書かずに継承する。意識せずに済む 80% だ。 |
| **Ethereum 互換性が副産物として手に入る** | カスタムハードフォークを無効化した状態で、bera-reth は **Hive test suite** を無修正で pass する。これがフレームワークが与える regression discipline だ。カスタマイズは gate されており、デフォルトパスは Ethereum 等価のまま。 |
| **execution path の共有** | 同じ block-execution コードが block builder、validator、re-execution CLI — どこでも使われる。1 つの実装、複数の呼び出し元。Fork していたら caller ごとに duplicate していたところだ。 |
| **bootstrap が速い** | Examples + SDK で differentiated なノードまで数日。最初のコンパイルは数時間、初回のカスタムトランザクションは最初の週で動く。 |
| **Reth チームの反応速度** | Upstream PR の review と merge cycle が速い。bera-reth が leaky abstraction にぶつかったとき、修正は upstream に速やかに反映された。 |

### 難しかったこと

正直なリスト、ざっくり苦痛が小→大の順で。

1. **新トランザクション型における big-bang 問題。** カスタムトランザクションの導入はコードパスを十数か所同時に touch する — すべての encoder、すべての validator、すべての tracing パス。Rez は bera-reth のカスタムトランザクションを **5,000+ 行の単一 PR** でまとめてランディングした。コードがコンパイルさえ通るために必要だったからだ。この抽象に対する iterative または collaborative な開発は、構造上ほぼ不可能。**新 tx 型が必要なプロジェクトは、一気通貫の delivery を計画せよ。Incremental ではない。**

2. **SDK の抽象はほぼ毎リリース壊れる。** Reth 依存の bump は **1 行で済むことが稀**。SDK がどう変わったかを理解するために upstream PR を読むのが、通常のリリース bump ワークフローの一部だ。壊れることを織り込み、適応工数を予算化せよ。

3. **Regression test は non-optional。** bera-reth は、新しい Reth リリースで予期せず値が変わったある変数を継承していた — 黙って。それを catch したのは regression test だけ。**CI で integration test 一式を走らせていなければ、SDK はいずれ production で君を驚かせる。**

4. **Tracing API がカスタムトランザクションで壊れた。** 呼び出しコンテキスト（builder、validator、CLI、*そして tracing*）で共有されるカスタム execution path 抽象があれば防げた問題だ。今はないので、bera-reth は tracing のために「un-elegant な解決策」を抱えて出荷している。**カスタムトランザクションは同じ execution logic を 2 回書かせる可能性がある。**

5. **検証の provenance（出所）が曖昧。** SDK がコアの runtime loop を露出しないため、「pre-validation で既に validate 済みのものを execution 中に再 validate すべきか」が不明瞭。コードを読んで判断するしかない。

6. **Generics + エラーメッセージ。** Rust の generics は SDK で重い。エラーメッセージは notoriously 読みにくい。**LLM の支援すら手こずる** — 明白な修正方法を持たない型エラーに時間を使うことになる。

7. **Leaky abstraction → upstream PR。** 一部の抽象は宣言された surface をきっちりカバーしきれていない。回避策は Reth への contribution back。Turnaround は速いが、貢献負担は実在する。

8. **多層抽象がカスケードする。** **REVM** 深部の変更が **Alloy** へカスケードし、さらに **Reth** へ到達する。1 つの問題を直すために 3 つの crate 境界をナビゲートする。

9. **upstream のリリースケイデンスに縛られる。** 好むと好まざるとに関わらず、自分のリリーススケジュールは Paradigm のペースの下流だ。

### 戦略的な問い — Reth SDK か Geth fork か

Rez のフレーミング、より鋭く言い直すと:

- **プロジェクトが Ethereum のコアループや Engine API を共有しない場合**、Reth SDK の現在の抽象では不十分かもしれない。フレームワークと戦うことになる。（Hyperliquid が Reth-adjacent な execution layer を走らせるのはまさにこの理由 — コンセンサスループが違いすぎる。）
- **代替が Geth fork なら**、Reth SDK は厳密に保守性で勝る。**10,000 行の upstream Geth merge は楽しくない。** Rez はそれをレビューしたことがある。
- **Client diversity のためなら**、両方 build せよ。Berachain は mainnet 上で **bera-reth AND bera-geth** を走らせる。State-root mismatch が起きたとき、同じ spec の独立した 2 実装を持つことが原因究明に効く。また、これは Berachain に *仕様* に対して build することを強制し、1 つの実装に対して build することを許さなかった。

### これがあなたのプロジェクト計画に意味すること

自分のチェーンで Reth SDK に手を伸ばすとき、期待値はこう設定する:

- 動く differentiated ノードまで **週ではなく日**（examples 経由）
- 新トランザクション型の統合まで **日ではなく週**（big-bang スコープ）
- Reth リリースが breaking abstraction change を出荷するたびの **定期的な適応作業**
- 時間とともに contribute back する **upstream PR のパイプライン**
- 本物の L1 を ship するなら **client diversity の意思決定** — second client を build するか、Reth 単独で行くか

SDK は万能薬ではない。だが正しい形のプロジェクトには — Ethereum を *再発明* するのではなく *拡張* するチェーンには — production-deploy 可能な Rust EVM クライアントへの最も摩擦の少ない経路だ。**Rez の結論: 「振り返ってみても、私は絶対にもう一度 Reth SDK で build する」。**

> 🔍 **Find in repo.** [\`berachain/bera-reth\`](https://github.com/berachain/bera-reth) を開いて \`crates/bera-reth/src/lib.rs\` を見る。それがエントリーポイントだ。そこの \`with_components\` チェーンは、本モジュールの先のレッスンで読んだ builder の production 版 — 今日 dozens-of-validators-on-mainnet を抱えるチェーンのものだ。

## パターン: thesis が要求する部分を差し替える

チェーンの thesis を 1 文で言えるなら、たいてい 1〜3 個のコンポーネント差し替えにマッピングできます:

| Thesis | 差し替えるコンポーネント |
| :--- | :--- |
| 「オーダーブック結合した perp 高速実行」 | \`consensus\`、\`executor\`、\`pool\` |
| 「payment-priority L1」 | \`pool\`、\`payload\`、\`add_ons\` |
| 「流動性 stake PoS」 | \`consensus\`、\`executor\`、\`add_ons\` |
| 「JIT EVM + stateless validator による 100K+ TPS」 | \`executor\`、storage layer、validator client |
| 「shielded tx 対応のプライバシー L1」 | \`pool\`、\`executor\`、\`add_ons\`（カスタム RPC） |

> 🔍 **リポジトリで確認。** \`EthereumNode::components()\` の定義を開く。各コンポーネントのデフォルトビルダーがそこに並んでいます — それが「無料で手に入るもの」のメニューです。

## 不変のもの: load-bearing な 80%

差し替え *ない* コンポーネントが価値の大半を占めます:

- **Sync オーケストレータ**（Module 1 で読んだ \`Stage\` パイプライン）
- **MDBX スキーマとストレージレイヤ**
- **ヘッダーダウンロード、sender 復元、ハッシング、Merkle、インデックス**
- **JSON-RPC サーバーランタイム、engine API サーバー**
- **Tokio ランタイム、トレース、メトリクス**

これが「fork ではなく組み立てる」が、何年も運用する L1 にとって唯一の保守可能な物語である理由です。**Paradigm のアップデートは 80% に流れ込み、あなたの fork 由来の表面積は書いた 20% に留まります。**

## クイズ前の想起

スクロールせずに:

1. 6 コンポーネントの中で Hyperliquid が最も大きくカスタマイズするのはどれで、なぜか?
2. なぜ payments-priority には \`pool\` が正しい差し替え先で、\`consensus\` ではないのか?
3. 「fork ではなく組み立てる」の保守上の論拠は?
4. プライバシー L1 を出すための *最小* のコンポーネント差し替え集合をスケッチしてください。

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

読むのはリハーサル。**実装するのが記憶。** このドリルは「SDK について読んだ」から「カスタム pool ビルダーを書いて差し替え、自分のコードがノードバイナリの中で動くのを観察した」までを連れて行きます。

## セットアップ

\`\`\`bash
git clone https://github.com/paradigmxyz/reth
cd reth/examples/custom-node-components
\`\`\`

この例は単独でビルドできます — Reth 全体をビルドする必要はありません。

## ドリル 1 — \`CustomPoolBuilder\` を読む

\`src/main.rs\` を開きます。例はちょうど 1 つのコンポーネント \`pool\` を上書きしています。\`CustomPoolBuilder\` 構造体とその \`PoolBuilder\` 実装を見つけてください。

> 🛑 **予測。** \`CustomPoolBuilder::build_pool\` は何をするか、一文で? 予想を立ててから先へ。

実装をざっと読み、3 つのセクションを特定:

1. **Validators** — トランザクションバリデータをセットアップ（署名や nonce などのチェック）。
2. **Ordering** — tx の順序付け戦略を選ぶ（デフォルトは \`CoinbaseTipOrdering\`）。
3. **Construction** — 上記の選択と \`InMemoryBlobStore\` を組み合わせて \`EthTransactionPool\` を構築。

予測がこの 3 つのいずれかを取り逃していたら、戻って実装を読み直してください。Pool は単一の何かではなく、(validator、ordering、blob store) の合成です。

## ドリル 2 — 各トランザクションでログを追加

自分のカスタムコードが実際に動いていることを確認したいですよね。バリデータが受け入れるトランザクションごとにログを出すよう追加します。

きれいなアプローチ: 既存のバリデータを、ログ + 委譲を行う自前のバリデータでラップする:

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

（手元の Reth の \`TransactionValidator\` トレイトの正確な形に合わせて調整してください — API はドリフトします。重要なのは *構造* です。）

そして \`CustomPoolBuilder::build_pool\` の中で、内側のバリデータをラップします:

\`\`\`rust
let inner_validator = TransactionValidationTaskExecutor::eth_builder(...)
    /* ...既存セットアップ... */
    .build_with_tasks(...);

let validator = LoggingValidator { inner: inner_validator };

// inner_validator の代わりに validator を pool に渡す
\`\`\`

> 🔧 **配線はドリルとして残します。** 正確な呼び出し方は使っている \`reth-pool\` のバージョン次第。要点は、pool に入る各 tx の経路上に自分のコードを置くことです。

## ドリル 3 — Dev チェーンを実行してログが発火するのを観察

\`\`\`bash
cargo run -- --dev
\`\`\`

\`--dev\` はブロックを高速にマインする 1 ノードのエフェメラルチェーンを起動します。tx を送ってみます（任意の方法で — \`cast send\`、\`localhost:8545\` を向けた MetaMask、自前スクリプトなど）:

\`\`\`bash
cast send \\
  --rpc-url http://localhost:8545 \\
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \\
  --value 1ether \\
  0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
\`\`\`

（dev アカウントの秘密鍵を使います — \`--dev\` は既知のものを使い、上記は標準的な Anvil/Reth dev 鍵です。）

> 🛑 **ターミナルを観察。** こう出るはず:
>
> \`\`\`
> Pool: validating transaction tx_hash=0x... gas_price=...
> \`\`\`
>
> 出ないなら配線が間違っています。よくある原因: \`LoggingValidator\` を構築したものの、ビルダーがまだ *内側の* バリデータを pool に渡している。配線を直して再実行してください。

## ドリル 4 — もう 1 つの差し替え、スケッチ

\`pool\` を自分のものにしました。次は、もう 1 つのコンポーネントを差し替えると何が変わるかをスケッチします。

> 🛑 **質問（書き留めて）:** チェーンにカスタム precompile（例: 高速 ed25519 検証器）を追加したい。どのコンポーネントを差し替えるか? 差し替えはおおよそどんな形になるか?

\`executor\` を差し替えます。カスタム precompile は EVM 設定の中に置かれます。スケルトン:

\`\`\`rust
.with_components(
    EthereumNode::components()
        .executor(CustomExecutorBuilder { extra_precompiles: vec![ed25519_verify] })
)
\`\`\`

\`CustomPoolBuilder\` が \`PoolBuilder\` を実装するのと同じやり方で \`ExecutorBuilder\` を実装します。**パターンがそのまま転用できる** — これが SDK の要点です。1 つのコンポーネントを差し替えたら、別のを差し替えるのは機械的な作業になります。

> 🔍 **\`examples/custom-node-precompiles/\` を開く**（手元のリポジトリのバージョンに存在すれば）— executor を差し替える例です。

## レッスン終了の想起

スクロールせずに、自分の言葉で:

1. \`CustomPoolBuilder::build_pool\` はどの 3 要素を合成しているか?
2. なぜバリデータをラップするのが、pool にロギングを差し込むきれいな方法なのか?
3. カスタム precompile を追加したい場合、どのコンポーネントを差し替えるか?
4. 別のコンポーネントビルダーを使うために必要な \`main.rs\` の *1 行* の変更は?

このドリルを終えれば、1 行のコンポーネント差し替えで動くものを出荷したことになります。**同じパターンを consensus や executor に拡大すれば、HyperEVM クラスのインフラを構築していることになります。**

## 📺 関連動画

\`\`\`youtube
cc45Rcmrro4 | The Future of Reth (Frontiers 2025)
\`\`\`
`,
                },
                {
                  title: 'Stage と ExEx のテスト — fixture chain・インプロセスノード・golden state',
                  slug: 'reth-testing-ja',
                  type: 'CONTENT',
                  sortOrder: 13,
                  duration: 24,
                  xpReward: 50,
                  content: `# Stage と ExEx のテスト — fixture chain・インプロセスノード・golden state

ここまでで \`Stage\` トレイト・ExEx API・NodeBuilder SDK を歩いてきました。**次の問いは、Reth — そして Reth を拡張するアプリ — がこれらの動作をどう検証しているか** です。dev 環境で「動いて見える」ノードコンポーネントは、本番で何千人ものユーザの状態を静かに壊します。以下のパターンが、Reth 自身の CI がそれを防いでいる方法であり、Building tier で出荷する ExEx ベースのアプリすべてがテストされるべき形です。

## Reth を拡張するアプリに必要な 2 つのテスト層

| 層 | 何をテストするか | 何を起動するか |
| :--- | :--- | :--- |
| **Stage / ExEx のユニットテスト** | trait 実装単体に、用意したチェーンイベントを与える | 何も起動しない — 純 Rust + fixture |
| **NodeBuilder の統合テスト** | 自前コンポーネントを差したノード全体 | Reth ノードをインプロセスで起動し、fixture か anvil チェーンに当てる |

Reth 自身の crate も両方を使っています。本番の拡張（\`tidx\`、MEV ExEx、独自 App-chain）でも両方が必要です。どちらかを省くと、特定クラスのバグが必ず通り抜けます。

## 1. Stage のユニットテスト — 標準パターン

\`Stage\` の実装はメソッド 2 つ — \`execute\`（前進方向の同期）と \`unwind\`（reorg のロールバック）。どちらも、与えられたチェックポイントとステージ DB の状態に対する純粋関数です。ユニットテストの形は次の流れです: 一時 DB を作り、事前状態を流し込み、\`execute\` を呼んで事後状態を assert する。次に \`unwind\` を呼んで巻き戻しを assert する。

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

要のツール: **\`create_test_provider_factory\`** と **\`TestStageDB\`**（\`reth_provider::test_utils\` および \`reth_stages::test_utils\` 配下）。これらがテストごとに ephemeral MDBX DB を提供する — 共有状態なし、cleanup 定型コードなし、stale fixture なし。

> 🔍 **リポジトリで確認。** [\`paradigmxyz/reth\`](https://github.com/paradigmxyz/reth) を開き、\`crates/stages/\` 配下で \`test_utils\` を検索。既存 stage テスト（例: \`SenderRecoveryStage\` テスト）を 1 つ読む。**Reth 同梱の全 stage がこの形のユニットテストを持つ。** 自前 stage も同じ形であるべき。

## 2. ExEx ユニットテスト — ハーネスパターン

\`reth-exex-test-utils\` は、フルノードを起動せずに合成通知で ExEx を駆動できるハーネスを export:

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

このハーネスが ExEx 開発を実用可能にする。**無ければフルノードを起動し本物のチェーンデータを再生してイベントを待つ必要がある** — テストサイクルあたり数分。あれば各通知が単一の関数呼び出し。

## 3. NodeBuilder integration テスト — Reth をインプロセスで

ユニットテスト層では足りない場合がある。コードがコンポーネント間の *相互作用* に依存する場合（カスタム pool ビルダーがカスタム payload validator から read する、など）、組み立てたノードが必要:

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

パターン: \`NodeBuilder::new(...).testing_node(...)\` がカスタムコンポーネント付きでノードをインプロセス起動し、handle（\`node.pool()\`、\`node.provider()\`、\`node.network()\`）を露出する — 直接駆動可能。ユニットテストより遅い（テストあたり ~1 秒）が、コンポーネント間挙動には不可欠。

## 4. Fixture-chain テスト — canned data では足りないとき

最重量のテスト — フル sync 検証、複数ブロック reorg シナリオ — のためには、捕獲済みの本物のチェーンデータを再生できる:

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

これが Reth が史実データに対して sync 正しさを検証する方法。fixture は既知正常ノードからの 1 回キャプチャ; CI が push のたびに再生する。**任意 stage の回帰が state-root 不一致として現れる — それはコンセンサスバグで、mainnet 前に捕まる。**

## Building tier との接続

Building tier の *Read a Real Production Indexer — tidx* レッスンはこの test gate を提示:

> **Fixture chain replay** — 既知の \`Notification::ChainCommitted\` / \`ChainReverted\` の列を流し込み、導出状態が golden reference と完全一致することを assert。

それは **本レッスンの §2** をアプリケーション層で適用したもの。Reth 内部のパターン（テストハーネス + 合成通知）こそが、tidx test gate が要求する適用方法そのもの。Building に着いたとき、本レッスンが前提となる。

## ドリル

1. **Reth の stage テストを 1 つ end-to-end で読む。** \`paradigmxyz/reth\` を開き、\`crates/stages\` 配下の \`SenderRecoveryStage\` テストを見つける。1 件のテストを最初から最後まで読む。各ヘルパ（\`TestStageDB\`、\`create_test_provider_factory\`、\`ExecInput\`）がテスト内のどこに現れるかをマップ。30 分。
2. **ハーネスを使った ExEx テストを 1 つ読む。** [\`reth-exex-test-utils\`](https://github.com/paradigmxyz/reth/tree/main/crates/exex/test-utils) の使用例を Reth リポジトリで検索し 1 つ選ぶ。\`test_exex_context()\` が何を返し、テストがどう通知を駆動するかを追う。30 分。
3. **stage ユニットテストをゼロから書く。** ブロックを数えるだけの自明な stage（\`output.checkpoint.block_number = input.target\`）を取る。\`execute\` がチェックポイントを進め、\`unwind\` がロールバックすることをテスト。\`create_test_provider_factory\` を使う。**\`cargo test\` を green にする。** 1.5 時間。
4. **ExEx ユニットテストをゼロから書く。** 各 \`ChainCommitted\` でカウンタをインクリメント、\`ChainReverted\` でデクリメントするだけの自明な ExEx。\`test_exex_context()\` を使い 3 commit + 1 revert を駆動; カウンタが 2 で終わることを assert。1 時間。
5. **NodeBuilder integration テストを 1 つ走らせる。** \`crates/node/builder/\` で \`testing_node()\` を使う最も単純なテストを選ぶ。\`cargo test\` でローカル実行。テストが何を assert するか読む。1 時間。

ドリル 5 後、自分が出荷する任意のカスタム Reth コンポーネントのテストを書ける — Reth メンテナが自分のコンポーネントをテストするのと同じ方法で。

> 🛑 **最終チェック。** 一文で: なぜ Reth は \`reth-exex-test-utils\` を別 crate で同梱するのか? ユーザに \`ExExNotification\` 値を手で構築させるだけでよいのに。答えに「ハーネスがイベント / 完了シグナルの裏チャンネルを所有することで、テストが poll 無しで同期できる」が無いなら §2 を読み直す — その同期が ExEx テストを決定的にする。

## 📺 関連リンク

- [\`reth_exex_test_utils\`](https://reth.rs/docs/reth_exex_test_utils/) — ExEx テストハーネスの自動生成ドキュメント
- [Reth Book — Testing chapter](https://reth.rs/) — stage / node テストの公式ガイダンス
`,
                },
                {
                  title: '次のティアへの橋渡し — Advanced と Expert',
                  slug: 'reth-bridge-to-expert-ja',
                  type: 'CONTENT',
                  sortOrder: 14,
                  duration: 10,
                  xpReward: 20,
                  content: `# 次のティアへの橋渡し — Advanced (L1 Architect) と Expert

> 🛑 **ゲートチェック。** Inside Reth 終了を主張する前に、**前のレッスンに戻らずに** これらに答えてください — 声に出すか紙に書いて：
>
> 1. \`popn_top!\` は何に展開される? なぜ \`unsafe\` 内で \`unwrap_unchecked()\` を使うのか?
> 2. \`Database\` と \`DatabaseRef\` がなぜ別トレイトなのか? \`auto_impl\` リストの非対称（\`&mut, Box\` vs \`&, &mut, Box, Rc, Arc\`）が何を語っているか?
> 3. \`ExExEvent::FinishedHeight\` が Reth の pruner に何を伝えるか — 忘れた場合のディスク帰結は?
> 4. なぜ \`MerkleStage\` がハッシング後で、間に挟まれていないのか?
> 5. Tempo のような purpose-built L1 を出荷するために、Reth のどのコンポーネントを差し替えるか?
>
> **正解が 4 未満なら?** 進まないこと。該当の Inside Reth レッスンに戻る。次のティアはこれらを「再調査する概念」ではなく「流暢な語彙」として前提します。

ゲートを通過したら: **Alloy → Revm → Reth（Staged Sync、ExEx、カスタム NodeBuilder）** の階段を上ってきたことになります。3 プロジェクトすべてのソースを目的を持って読めます。

しかし「読める」は半分。次の **2 ティア** が待っています、目的に応じて選択 (両方やる人も多い):

## Advanced ティア — L1 を architect する (5 コース、難易度 ADVANCED)

Inside で読んだソースを使って、自分の L1 を設計する。Hyperliquid・Tempo クラスの chain アーキテクチャに必要な実装スキル。

| コース | 焦点 |
| :--- | :--- |
| **Consensus Engineering** | PoS / BFT / Tendermint 内部、レイテンシ・ライブネス・finality の設計トレードオフ |
| **Cross-Chain Bridges** | CCIP（Chainlink のクロスチェーンプロトコル）・OP Standard Bridge・light client を本番ソースで読み、自分で書く |
| **Sequencer & Rollup アーキテクチャ** | 中央集権 sequencer から共有 sequencer、MEV 防衛、forced inclusion（sequencer に検閲されてもユーザが tx をオンチェーンに乗せられる仕組み） |
| **P2P Networking Internals** | devp2p（Ethereum のトランスポート）・libp2p（多くの L1 が採用するモジュラー代替）・gossip サブプロトコル・ピアスコアリング |
| **Validator Operations** | 鍵管理、slashing 条件、協調アップグレード |

## Expert ティア — 本番に出す (2 コース、難易度 EXPERT)

「読める」から「本番に出せる」への跳躍。性能、運用、application 開発。

| コース | 焦点 |
| :--- | :--- |
| **Reth Expert** | パフォーマンス、MDBX、Tokio 内部、手続きマクロ、カスタム precompile、MPT、本番 MEV、zkEVM、Reth フォーク運用 |
| **Building with the Stack** | 動くアプリ 10 本 — MEV searcher、indexer、wallet backend、cheatcode、swap aggregator、order router capstone、cross-client 検証、HTTP 402 / MPP の machine-payments エンドポイント |

## どちらから始める?

両方とも Inside Reth から直接ジャンプ可能、独立しています:

- **Advanced (L1 Architect) を先に** — 自分で L1 を architect したい、Hyperliquid・Tempo を理解したい
- **Expert を先に** — 既存 chain で本番アプリを ship したい、運用 / 性能エンジニアリングが必要

順序にこだわらず、興味とプロジェクトに合うほうから。両方終えれば「読める + 設計できる + 出荷できる」の三拍子。

## マインドセットの転換

Inside (Intermediate) は **構造** を教えました。次のティアはその構造の **背後にある決定** を教えます。

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

冒頭のゲートチェックが楽だったなら、Advanced か Expert に飛び込んでください。

5 問のどれかで前のレッスンに戻った場合 — 今、再読してください。次のティアはどちらも密度が高い。リンクされたコードをローカルで動かしながら読むのは、もはや任意ではありません。

> インフラレイヤーの学習は、最初の 3 ヶ月が一番苦しいです。ドキュメントが不十分なことも多く、**「ソースコードこそが最強の教科書」**。Advanced と Expert はこの教訓が報われるティアです。`,
                },
                {
                  title: 'Inside Reth ファイナルクイズ',
                  slug: 'reth-advanced-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 15,
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
