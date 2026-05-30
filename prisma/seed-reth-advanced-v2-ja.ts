import { PrismaClient } from '@prisma/client';

export async function seedRethAdvancedV2JA(prisma: PrismaClient) {
  const tags = ['reth', 'rust', 'advanced', 'exex', 'staged-sync', 'reth-sdk', 'v2'];

  await prisma.course.create({
    data: {
      slug: 'reth-advanced-v2-ja',
      title: 'Inside Reth v2 — 中級読解コース',
      description:
        'Stageトレイトと同期パイプラインを、重要コードを追って理解する。',
      difficulty: 'INTERMEDIATE',
      duration: 68,
      xpReward: 210,
      track: 'reth-advanced',
      tags,
      isPublished: true,
      sortOrder: 221,
      locale: 'ja',
      instructorName: 'RethLab',
      modules: {
        create: [
          {
            title: 'Reth読解 v2',
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: 'Stage trait をステップで組み立てる v2',
                  slug: 'staged-sync-buildup-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 32,
                  xpReward: 80,
                  content: `# Stage trait をステップで組み立てる v2

## 問い
なぜ Reth は同期処理を1本ループではなく Stage 分割するのか？

## 原理（最小モデル）
Staged Sync は ETL 的な分割で、次を得る。

- バッチ単位で I/O を償却
- フェーズごとの責務分離
- unwind（reorg対応）を対称実装

## 失敗例（誤解）
「前進同期だけ考えればよい」は誤り。
reorg を同じ抽象で扱えない設計は運用で破綻する。

## ステップで組み立てる
### Step 0: 読解対象を固定する
\`\`\`bash
cd ~/code
git clone https://github.com/paradigmxyz/reth reth-reference
cd reth-reference
\`\`\`
期待出力: リポジトリ取得完了。  
失敗時修正: clone エラー時はネットワーク/権限を確認する。

### Step 1: 単純同期ループ
\`\`\`rust
while let Some(block) = client.next_block()? {
    execute_block(block)?;
    commit()?;
}
\`\`\`

ここでの目的は基準点を作ること。  
重要行は \`execute_block\` と \`commit\` が1ブロックごとに密結合している点。

失敗しやすい点:
- I/O償却を考えず commit 頻度を固定する
- reorg パスを別実装に逃がして分岐を増やす

### Step 2: Stage 境界を作る
\`\`\`rust
trait Stage {
    fn execute(&mut self, input: ExecInput) -> Result<ExecOutput, StageError>;
    fn unwind(&mut self, input: UnwindInput) -> Result<UnwindOutput, StageError>;
}
\`\`\`

ここでの目的は前進/巻戻しを同じ契約に乗せること。  
重要行は \`execute\` と \`unwind\` の対称配置。

失敗しやすい点:
- unwind を後付け特例として実装する
- 入出力型を共通化せず再開点を失う

### Step 3: readiness / commit hooks を追加
\`\`\`rust
fn poll_execute_ready(&mut self, cx: &mut Context<'_>, input: ExecInput)
  -> Poll<Result<(), StageError>>;
fn post_execute_commit(&mut self) -> Result<(), StageError>;
\`\`\`

ここでの目的は、非同期準備とコミット後処理を明示すること。  
重要行は \`poll_execute_ready\`。重いステージが同期全体を止めないための接続点になる。

失敗しやすい点:
- execute 内で準備待ちを抱え込む
- commit 後処理を呼び出し側へ漏らす

### Step 4: 完成形を読む
\`\`\`rust
pub trait Stage<Provider>: Send {
    fn id(&self) -> StageId;
    fn execute(&mut self, provider: &Provider, input: ExecInput) -> Result<ExecOutput, StageError>;
    fn unwind(&mut self, provider: &Provider, input: UnwindInput) -> Result<UnwindOutput, StageError>;
}
\`\`\`

読むときは \`id\` → \`execute\` → \`unwind\` の順で責務を固定する。  
\`Provider\` 型パラメータがあることで、DB/環境差分をステージ実装に閉じ込められる。

### Step 5: シンボル照合を行う
\`\`\`bash
rg "trait Stage<|poll_execute_ready|post_execute_commit" crates -n
\`\`\`
期待出力: trait定義と補助フックが確認できる。  
失敗時修正: まず trait 定義ファイルから辿り直す。

### 合格基準
- execute/unwind 対称性の理由を説明できる
- Stage 分割が性能/保守性に効く理由を説明できる

## まとめ（3行）
- Stage は同期を分割して償却する抽象。
- 前進と巻き戻しを同じ契約で扱うのが重要。
- Stage trait を読めると Reth の同期全体が追いやすくなる。`,
                },
                {
                  title: 'ExEx をステップで組み立てる v2',
                  slug: 'reth-exex-buildup-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 30,
                  xpReward: 80,
                  content: `# ExEx をステップで組み立てる v2

## 問い
なぜ Reth は外部インデクサではなく ExEx を持つのか？

## 原理（最小モデル）
ExEx は「実行イベントに近い位置」で拡張を走らせる仕組み。

- ノード内部のイベントを直接受ける
- シリアライズ/IPC の往復を減らせる
- 再実行や巻き戻しに同期しやすい

## 失敗例（誤解）
「とりあえず外部でログ購読すれば同じ」は誤り。
再編成時の整合性と遅延の扱いが難しくなる。

## ステップで組み立てる
### Step 0: 最小 ExEx を定義する
\`\`\`rust
pub struct MyExEx;
\`\`\`
目的は拡張ロジックの境界を先に型として固定すること。

### Step 1: ExEx の受け口を定義する
\`\`\`rust
pub struct MyExEx;
impl MyExEx {
    pub async fn run(mut ctx: ExExContext) -> eyre::Result<()> { Ok(()) }
}
\`\`\`
目的は拡張ロジックを独立コンポーネント化すること。

### Step 2: 通知を読む
\`\`\`rust
while let Some(notification) = ctx.notifications.recv().await {
    // committed / reverted を処理
}
\`\`\`
重要行は \`notifications.recv\`。ここが実行イベント境界。  
失敗しやすい点: 受信ループを早期 return して通知を取りこぼす。

### Step 3: NodeBuilder に接続する
\`\`\`rust
node_builder.install_exex("my-exex", |ctx| async move {
    MyExEx::run(ctx).await
});
\`\`\`
重要行は \`install_exex\`。登録名と実行関数を紐づける。  
失敗しやすい点: 登録名重複やクロージャのライフタイム不整合。

### Step 4: 巻き戻しを扱う
\`\`\`rust
match notification {
    ExExNotification::Committed(chain) => { /* apply */ }
    ExExNotification::Reverted(chain) => { /* rollback */ }
}
\`\`\`
巻き戻しを先に扱うことで、運用時の整合性事故を減らせる。

### Step 5: 動作を検証する
\`\`\`bash
cargo check -p reth-node-builder
\`\`\`
期待出力はビルド成功。失敗時は ExExContext 型や通知 enum の版ズレを先に疑う。

### Step 6: 失敗時の修正ポイント
1. 通知分岐で \`Committed\` / \`Reverted\` の両方を処理する  
2. 処理順を apply → rollback で対称に保つ  
3. 永続化するなら checkpoint 更新順を固定する

### 合格基準
- 受け口/通知処理/登録の3点を説明できる
- committed と reverted の分岐理由を説明できる

## まとめ（3行）
- ExEx は Reth 内部イベントに接続する拡張点。
- 低遅延と再編成整合を両立しやすい。
- 登録より先に巻き戻し設計を固めるのが安全。`,
                },
                {
                  title: 'Reth SDK をステップで組み立てる v2',
                  slug: 'reth-sdk-buildup-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 30,
                  xpReward: 80,
                  content: `# Reth SDK をステップで組み立てる v2

## 問い
なぜ Reth SDK でノード構成を部品化するのか？

## 原理（最小モデル）
SDK の価値は、ノード構成を型安全に差し替えられること。

- node types で構成境界を明示
- components で差分を局所化
- launch までを一貫したビルダーで扱う

## 失敗例（誤解）
「fork して一枚岩で改造すれば速い」は誤り。
差分が散って追従コストが急増する。

## ステップで組み立てる
### Step 0: ノード差分を一文で定義する
「どのコンポーネントを差し替えるか」を先に文章化する。型実装より先に境界を決める。

### Step 1: Node 型を宣言する
\`\`\`rust
#[derive(Debug, Default, Clone)]
pub struct MyNode;
\`\`\`
目的は差し替え単位を型として固定すること。

### Step 2: Components を束ねる
\`\`\`rust
pub type MyComponents = ComponentsBuilder<...>;
\`\`\`
重要行は型エイリアス。どこを置換したかを1箇所で読める。  
失敗しやすい点: 置換対象を増やしすぎて責務境界が曖昧になる。

### Step 3: NodeBuilder で組み上げる
\`\`\`rust
let handle = NodeBuilder::new(config)
    .with_types::<MyNode>()
    .with_components(my_components)
    .launch()
    .await?;
\`\`\`
重要行は \`with_types\` と \`with_components\`。境界と実体の接続点。

### Step 4: 振る舞いを検証する
\`\`\`rust
assert!(handle.node_exit_future().await.is_ok());
\`\`\`
起動できることだけでなく、終了経路が健全かを確認する。

### Step 5: 起動検証を実行する
\`\`\`bash
cargo check -p reth-node-builder
\`\`\`
期待出力は型解決とビルドが通ること。失敗時は component の型境界不一致を先に確認する。

### Step 6: 失敗時の修正ポイント
1. \`with_types\` の型と component の期待型を合わせる  
2. 先に最小構成で launch し、差分を1つずつ足す  
3. エラー時は型エイリアス定義へ戻って境界を再確認する

### 合格基準
- 型境界とコンポーネント境界を区別して説明できる
- どの差分を SDK 側に寄せるべきか説明できる

## まとめ（3行）
- SDK は「改造」ではなく「構成」のための抽象。
- 差分を型境界で管理すると追従が楽になる。
- launch 成功だけでなく終了経路も検証する。`,
                },
              ],
            },
          },
        ],
      },
    },
  });
}
