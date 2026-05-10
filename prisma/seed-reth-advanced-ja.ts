import { PrismaClient } from '@prisma/client';

export async function seedRethAdvancedJA(prisma: PrismaClient) {
  const tags = ['reth', 'revm', 'alloy', 'rust', 'advanced', 'exex', 'opcode'];

  await prisma.course.create({
    data: {
      slug: 'reth-advanced-ja',
      title: 'Reth Advanced — Revm内部構造とExEx',
      description:
        'Revmのインタープリターを読み解き、カスタムOpcodeとDatabaseトレイトの実装方法を学びます。さらにRethのStaged SyncとExEx (Execution Extensions) を通じて、独自のEVMインフラを構築するための基礎を固めます。',
      difficulty: 'ADVANCED',
      duration: 190,
      xpReward: 570,
      track: 'reth-advanced',
      tags,
      isPublished: true,
      sortOrder: 300,
      locale: 'ja',
      instructorName: 'RethLab',
      modules: {
        create: [
          {
            title: 'Revmの心臓部',
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: 'Advanced へようこそ — このティアの読み方',
                  slug: 'advanced-welcome-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 7,
                  xpReward: 15,
                  content: `# Advanced へようこそ — このティアの読み方

Fundamentals は終えている前提です（理想的には Bridge to Advanced も）。Beginner と Fundamentals のレッスンは、あなたに寄り添って歩いてきました。**Advanced は違います。** この短いオリエンテーションで違いを把握し、レッスン 1 から正しいマインドセットで臨めるようにしましょう。

## ここで変わるもの

Beginner と Fundamentals は、スタックの **形** を教えました — Alloy 型はどんなものか、Foundry の使い方、EVM が高レベルで何をしているか。

Advanced は別のことを要求します。**Reth・Revm・Alloy・Foundry の本物の本番ソースを 1 行ずつ読みます。** レッスンはあなたが既にこのスタックを使えることを前提にしている — *読めるように* 教えます。

これは本物の転換点。レッスン 1 からこんなコードが出てきます：

\`\`\`rust
pub fn add<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
    popn_top!([op1], op2, context.interpreter);
    *op2 = op1.wrapping_add(*op2);
    Ok(())
}
\`\`\`

(このシグネチャが見慣れないなら、Bridge to Advanced コースの Rust モジュールが各部品をすべてカバーしています。)

## レッスンの書き方 — そしてその理由

Advanced レッスンは、これまでのティアにはない **能動学習プロンプト** を使います：

- 🛑 **Predict (予測)** — *止まる。解説を読む前に、これに頭の中で答えてください。* ポイントは質問に取り組むこと。間違っていてもいい。間違った予測こそが学習の起点。
- 🔍 **Find in repo (リポジトリで確認)** — 実際のソースファイルを開いて、レッスンの主張を検証する。レッスンはガイダンス、ソースが真実。
- **理解度チェック (Anti-fluency)** — *自分の言葉で、なぜこれが効くか?* 答えられないなら、レッスンは明示的に「戻れ」と言います。**スキップしないこと。**
- **末尾の想起テスト** — ほとんどのレッスンが「自分の言葉で X に答えられないうちは、このレッスンはまだあなたを離しません」で終わります。文字通り受け取ってください。

編集スタイルはこれまでのチュートリアルより難しい。意図的にそうしています。**滑らかなチュートリアル散文は「わかった気になる」trap を作る** — 読者は複雑な内容を流して読み、浅い理解で去ってしまう。Predict / Recall パターンは実際のエンゲージメントを強制します。

これは **設計上の摩擦**。受け入れて。

## 前提知識 — 自分に正直に

レッスン 1 の前に、以下が **手に馴染んでいる** こと：

**EVM 内部**:
- バイトコードと dispatch loop（バイトとしての opcode、PC、命令テーブル）
- スタック / メモリ / calldata / ストレージ — 各々何で、どう違うか
- cold vs warm ガス (EIP-2929)
- コールフレーム: CALL / DELEGATECALL / STATICCALL のセマンティクス
- ブロック構造 (header / body / receipts)、reorg は通常運用

**中級 Rust**:
- Generics + trait bounds、\`?Sized\`、\`dyn Trait\` vs \`impl Trait\`
- \`Arc<T>\`、\`Mutex<T>\`、\`RwLock<T>\` — どれをいつ使うか
- \`unsafe\` ブロックと \`unwrap_unchecked()\`
- \`macro_rules!\` 構文 (\`$x:ident\`、\`$($x),*\`、フラグメント specifier)

**どれかでも不安?** 力技で進まないこと。**Bridge to Advanced** コースに戻って該当レッスンをやってください。どれもこのティアが前提とする準備そのものです。

(Advanced 内にも *Rust: ライフタイム・Box・Arc・dyn Trait* レッスンがあるが、それは *テスト* であって *教える* ものではありません。Bridge コースが教える側。)

## セットアップ — 一度だけ

レッスン 1 を始める前に、別ウィンドウでこれらを準備：

1. **\`bluealloy/revm\` を clone** — \`git clone https://github.com/bluealloy/revm\`
2. **\`paradigmxyz/reth\` を clone** — \`git clone https://github.com/paradigmxyz/reth\`
3. **動く \`cargo\` ツールチェイン** — \`rustc --version\` でモダンなバージョンが出ること
4. **\`cargo-expand\`** — \`cargo install cargo-expand\` (Expert の手続きマクロレッスンで欲しくなる)
5. **セカンドモニタか分割端末** — レッスンを読みながらソースを参照する

「Find in repo」プロンプトはリポジトリを実際に開いていなければ機能しません。レッスン 1 を始める前にこのループを閉じておく。

## レッスンの実際の読み方

Advanced 全レッスンに共通するパターン：

1. **レッスンを開く、本物のソース抜粋を見る**（GitHub リンク付き）。
2. **解説の前に 🛑 Predict プロンプトに当たる**。止まる。頭の中か紙で答える。それから続ける。
3. **解説を読む**。予測と比較。間違っていた箇所が学びの場所。
4. **🔍 Find-in-repo プロンプトに当たる**。リポジトリを開く。実際のファイルを見つける。レッスンの主張を検証。
5. **末尾の想起テスト**。自分の言葉で答えられたらタブを閉じる。答えられないならスクロールバック。

これは典型的なチュートリアルより遅い。**でも内在化する**。意図的なトレードオフ。

## ペース

Advanced レッスン 1 本は、プロンプトを実際にやれば **30〜60 分** かかります。Expert はもっと長い。

**1 セッションで 5 本やろうとしないこと**。1 晩 1〜2 本、コードを開きながら predict プロンプトに本気で取り組むペースが正解。一気読みは能動学習モデルを壊します。

## 準備完了

前提リストに見覚えがあって、リポジトリも開いている: コース詳細に戻って **「\`add\` をステップで組み立てる：シグネチャと本体」** から始める。

前提リストが不安だった: まず Bridge to Advanced コースを通す。各項目が「再調査する概念」ではなく「自分の語彙」として読めるようになってから戻ってくる。

どちらの道も問題なし。間違った選択は **ギャップを無視してブルートフォースで Advanced を突破しようとすること** — その道は「全レッスン読んだけど \`?Sized\` が実際何をしているか説明できない」状態で終わります。準備時間に投資してください。ソース読みは、ソースが読めるようになって初めて報われる。`,
                },
                {
                  title: '\`add\` をステップで組み立てる：シグネチャと本体',
                  slug: 'revm-add-buildup-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 8,
                  xpReward: 20,
                  content: `# \`add\` をステップで組み立てる：シグネチャと本体

[\`bluealloy/revm\`](https://github.com/bluealloy/revm) の本物の \`add\` Opcode は、一見すると威圧的:

\`\`\`rust
pub fn add<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
    popn_top!([op1], op2, context.interpreter);
    *op2 = op1.wrapping_add(*op2);
    Ok(())
}
\`\`\`

これを1行ずつ読むと、新しい概念が一度に6つ降ってきます。もっと楽な道: **積み上げる。** 一番素朴な \`add\` から始めて、複雑さを1つずつ獲得していく。このレッスンの終わりには、2行目のマクロ以外の全てを自分で組み立てたことになります — マクロは次のレッスンへ。

> 📂 **別タブで \`bluealloy/revm\` を開いてください。** 積み上げの結果と本物のソースを照合しながら読みます。

## ステップ 0 — 素朴な \`add\`

Rust で EVM を書くとき、何も考えずに書いた \`add\` はこんな形:

\`\`\`rust
pub fn add(stack: &mut Vec<U256>) -> Result<(), &'static str> {
    let a = stack.pop().ok_or("underflow")?;
    let b = stack.pop().ok_or("underflow")?;
    stack.push(a + b);
    Ok(())
}
\`\`\`

2つ pop。足す。push。終わり。

> 🛑 **予測。** スクロールせずに: このバージョンが本物の \`add\` でわざと避けていることを **2つ** 挙げてください。（ヒント: 1つはシグネチャ、もう1つは本体。）答えを保持して、各ステップで照合します。

2つはこれ:

1. **1つのホスト環境にしか対応しない。** \`&mut Vec<U256>\` は具象型。トレーサーのスタック、ファザーのスタック、Inspector サンドボックスのスタックを差し替えるには関数を書き直すしかない。
2. **pop も push もやる — 計3回のスタック操作。** 本物の \`add\` は *1回* — 新しいトップを *その場で上書き*。

#1 を先に直し（シグネチャ）、次に #2（本体）。

## ステップ 1 — ホストに対してジェネリックにする

Revm は複数の環境に組み込まれる必要があります:

- **本番実行**（メインパス）
- **トレース**（デバッグ用にスタック操作を全記録）
- **Inspector サンドボックス**（外部観測者が EVM をステップ実行）
- **ファザー、メインネットフォーク、ステートテストランナー**

これらはスタック/状態の形が少しずつ違う。\`add\` のコピーを6種類書きたくはない。

最初のジェネリック化:

\`\`\`rust
pub fn add<H: Host>(host: &mut H) -> Result {
    // ... 本体は同じだが、具象 Vec ではなく H に対して呼ぶ
}
\`\`\`

\`H: Host\` は「\`Host\` トレイトを実装するどんな型でも可」と読みます。1つのソース。**コンパイル時に具象 \`H\` ごとに特殊化されたバイナリが1つ。**

> 🛑 **予測。** \`<H: Host>\` の落とし穴は何? なぜ revm はここで止まらないのか?

落とし穴は2つ:

1. ホスト型が増えるとモノモーフ化でコンパイル時間が爆発する。
2. **トレイトオブジェクト** \`&mut dyn Host\` を渡せない — \`<H: Host>\` はコンパイル時にサイズが決まる型しか受け付けない。

なぜトレイトオブジェクトを渡したいのか? 設定フラグや動的なテストハーネスから *実行時* にホストを構築したい場合があるから。トレイトオブジェクトは「具象 \`Host\` 実装が実行時まで分からない — vtable で扱って」とコンパイラに伝える方法です。

そこで \`?Sized\` の出番。

## ステップ 2 — トレイトオブジェクトを許す: \`H: ?Sized\`

Rust は **すべての** ジェネリックパラメータに暗黙の \`Sized\` 制約を加えます。\`?Sized\` がないと \`H\` はコンパイル時にサイズが分かる型でなければならず、\`dyn Host\` は除外される（トレイトオブジェクトのサイズは背後の具象型に依存して実行時に決まる）。

\`?Sized\` を足す:

\`\`\`rust
pub fn add<H: Host + ?Sized>(host: &mut H) -> Result {
    // ...
}
\`\`\`

これで \`host: &mut dyn Host\` が有効な引数に。**1つの \`add\` バイナリでどんな \`Host\` 実装にも対応**、ホスト呼び出しごとの vtable 間接化と引き換えに。

> 🛑 **理解度チェック。** 「\`Sized\` を外す」は単なるオウム返し。自分の言葉で: *なぜ* サイズ未知の型を受ける必要があるのか? スクロールせずに動機を語れないなら、読み直し。

> 🔍 **\`revm/src/host.rs\` を開いて、\`dyn Host\` が実際に作られている箇所を1つ見つけてください。** これが、この opt-out が複雑さに見合う実証です。

## ステップ 3 — 2つ目のジェネリクス: \`IT: ITy\`

\`H\` でホストの差し替えが可能になりました。では **実行モード** — 本番 vs トレース vs Inspector サンドボックス — はどう扱う?

Revm は **2つ目の** ジェネリクス \`IT\` でこれをコンパイル時に選びます:

\`\`\`rust
pub fn add<IT: ITy, H: Host + ?Sized>(host: &mut H) -> Result {
    // ...
}
\`\`\`

\`IT\` は "interpreter-types" マーカー — ストラテジパラメータと考えてください。同じソースが実行モードごとに **特殊化されたバイナリ** にコンパイルされる。\`IT\` がなければ、\`add\` を3回書くことに（本番用・トレース用・サンドボックス用）。

これで本物の \`add\` のシグネチャに到達:

\`\`\`rust
pub fn add<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
\`\`\`

（パラメータ型は revm の \`Ictx<...>\` で人間工学的にラップされていますが、ジェネリクスは私たちが組んだ形そのもの。）

ソースに一致。**自分で組み立てた。**

## ステップ 4 — 本体を直す: 参照経由で書き込む

素朴な本体:

\`\`\`rust
let a = stack.pop().ok_or(StackUnderflow)?;
let b = stack.pop().ok_or(StackUnderflow)?;
stack.push(a + b);
\`\`\`

スタック操作は3回。それぞれメモリ書き込みか容量チェック。インタープリターのホットパスはこれを *ブロックあたり数億回* 走らせる — このオーバーヘッドが、競争力のあるスループットとそうでないものの境目です。

もっと良い: 1つだけ pop して、新しいトップを \`&mut\` 経由で **その場で書き換える**。

\`\`\`rust
let a = stack.pop().ok_or(StackUnderflow)?;       // op1 を pop
let b = stack.last_mut().ok_or(StackUnderflow)?;  // 新しいトップへの &mut
*b = a + *b;                                       // その場で上書き
\`\`\`

pop 1回、その場書き込み1回。**push なし。**

> 🛑 **予測。** 本体が \`&mut\` 経由で書き込むようになった今、関数は成功時に何を *返す* 必要がある?

\`Ok(())\` だけ — 値を返す必要がない、データの流れは参照経由で起きているから。本物のシグネチャを見直すと: \`-> Result\` に連結値なし。それが理由。

## ステップ 5 — \`wrapping_add\` を使う

最後の細部。\`+\` を \`wrapping_add\` に置き換える:

\`\`\`rust
*b = a.wrapping_add(*b);
\`\`\`

なぜ? **EVM のコンセンサスは \`ADD\` に mod 2²⁵⁶ の wrap を要求するから。** \`+\` を使うと release/debug で挙動が分岐する（Rust の \`+\` は debug で panic、release で wrap）。\`saturating_add\` を使うと最初のオーバーフローでネットワークがフォークする — ドリルレッスンで実証します。

> 🛑 **予測。** \`U256::MAX.wrapping_add(U256::from(1))\` は16進で何になる?

答えが \`0x0\` でなかったら、止まる。EVM のコンセンサスはこの正確な挙動に依存しています。

## ここまでに組み立てたもの

\`\`\`rust
pub fn add<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
    let op1 = context.interpreter.stack.pop().ok_or(StackUnderflow)?;
    let op2 = context.interpreter.stack.last_mut().ok_or(StackUnderflow)?;
    *op2 = op1.wrapping_add(*op2);
    Ok(())
}
\`\`\`

これは **本物の \`add\` と意味的に等価**、ただスタック操作を手書きしただけ。本物のソースは中央の2行を \`popn_top!\` というマクロにまとめている — それが次のレッスン。

## 進む前の想起

スクロールせずに、自分の言葉で:

1. \`IT: ITy\` はコンパイル時に何をくれる? なければ何が起きる?
2. \`?Sized\` がデフォルトでは許されない何を許すのか?
3. なぜ本体は pop-add-push ではなく1回のその場書き込みなのか?
4. \`U256::MAX.wrapping_add(U256::from(1))\` は何を返す? なぜそれが重要?

どれか曖昧なら戻る。次のレッスンは本体をマクロにリファクタリングします — 私たちが組み立てた版を自分のものにできていなければ、リファクタを追えません。
`,
                },
                {
                  title: '\`add\` を読む：マクロを抽出する',
                  slug: 'revm-add-macro-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 8,
                  xpReward: 25,
                  content: `# \`add\` を読む：マクロを抽出する

前のレッスンで、ここまで組み立てました:

\`\`\`rust
pub fn add<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
    let op1 = context.interpreter.stack.pop().ok_or(StackUnderflow)?;
    let op2 = context.interpreter.stack.last_mut().ok_or(StackUnderflow)?;
    *op2 = op1.wrapping_add(*op2);
    Ok(())
}
\`\`\`

これが意味的な \`add\`。本物のソースはこれより短い:

\`\`\`rust
pub fn add<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
    popn_top!([op1], op2, context.interpreter);
    *op2 = op1.wrapping_add(*op2);
    Ok(())
}
\`\`\`

手書き版の最初の2行が、1つのマクロ呼び出しになりました。**このレッスンはこのリファクタリングだけ。** なぜマクロなのか、中に何があるか、3つのディテールがなぜ価値を持つのか。

## ステップ 1 — そもそもなぜマクロか

\`mul\`、\`sub\`、\`div\`、\`mod\`、\`lt\`、\`gt\`、\`eq\`、\`and\`、\`or\`、\`xor\` ... — 全ての二項 Opcode が同じ2行で始まります:

\`\`\`rust
let op1 = ctx.interpreter.stack.pop().ok_or(StackUnderflow)?;
let op2 = ctx.interpreter.stack.last_mut().ok_or(StackUnderflow)?;
\`\`\`

コードベース全体で30回以上繰り返される。**これはリファクタリング機会。**

> 🛑 **予測。** なぜ通常の関数ではなく \`macro_rules!\` を使うのか? 2つの理由のうち少なくとも1つを挙げてください。

理由は2つ:

1. **可変アリティ。** Opcode によって pop する数が違う（1つ、2つ、3つ）。マクロは \`[op1]\`、\`[op1, op2]\`、\`[op1, op2, op3]\` を同じアームでマッチできる — 関数だと \`popn_top1\`、\`popn_top2\`、\`popn_top3\` を書くか const ジェネリクス曲芸が必要。
2. **直接の早期リターン。** \`Result\` を返す関数だと、呼び出し側で毎回 \`?\` のお決まり構文。マクロは *Opcode 関数* から直接 \`return Err(StackUnderflow);\` を発行できる — \`?\` も \`Result\` の取り回しもなし。

## ステップ 2 — マクロの素朴版

最適化を考えずに書くと:

\`\`\`rust
macro_rules! popn_top_naive {
    ([ $($x:ident),* ], $top:ident, $interpreter:expr) => {
        $(
            let $x = $interpreter.stack.pop().ok_or(StackUnderflow)?;
        )*
        let $top = $interpreter.stack.last_mut().ok_or(StackUnderflow)?;
    };
}
\`\`\`

**シンタックスをゆっくり読む:**

- \`$($x:ident),*\` はカンマ区切りの識別子のリストにマッチ（0個以上）。\`[op1]\` は要素1つ、\`[op1, op2]\` は要素2つ。
- \`$( ... )*\` は中身をリストの要素ごとに繰り返す。ここでは識別子1つにつき1回 pop する。

これは動きます。本物より遅くもなる、revm が気にする2つの点で。

> 🛑 **予測。** どこが遅い? （ヒント: (a) pop ごとの境界チェック、(b) コンパイラが何を証明できるか。）

## ステップ 3 — アンダーフローを1回だけ事前チェック

\`.pop()\` を N 回呼ぶ = 内部の境界チェックが N 回。**もっと良い: 最初に1回だけチェックする。**

\`\`\`rust
if $interpreter.stack.len() < (1 + $crate::_count!($($x)*)) {
    return Err(StackUnderflow);
}
// ... 以降は再チェックなしで pop
\`\`\`

\`_count!\` は繰り返し内の識別子数を数えるヘルパマクロ。\`[op1]\` ならガードは \`stack.len() < 2\` になる（pop する1つ + 可変借用する1つ）。このガードを通過すれば、**以降の pop は静的に安全** — 必要な数があることを今、確かめたから。

## ステップ 4 — \`cold_path()\`: 失敗側がレアであることを LLVM に伝える

スタックアンダーフローはバグであり、通常パスではない。レアな失敗パスのコードをホットな命令キャッシュに置きたくない。

\`\`\`rust
if $interpreter.stack.len() < (1 + $crate::_count!($($x)*)) {
    $crate::primitives::hints_util::cold_path();
    return Err(StackUnderflow);
}
\`\`\`

> 🛑 **予測。** \`cold_path()\` は実行時に何にコンパイルされる?

**実行時には何も** にコンパイルされる。これは LLVM へのコンパイル時ヒント:「この分岐から到達するコードは統計的にレア」。オプティマイザはレアな分岐のコードをホットパスのマシン命令から離れた場所に配置する。結果、ホットパスはキャッシュ温度を保ったまま1本の直線アセンブリ。

ゼロコストの最適化ヒント。それがパターン全体です。

## ステップ 5 — \`unwrap_unchecked()\`: ガードの恩恵を回収

\`stack.len() >= N\` を手動で確認しました。でも Rust の \`pop()\` は \`Option<T>\` を返すので、素朴に書くと \`.unwrap()\`（\`None\` で panic）か \`.ok_or(...)?\`（再チェック）になる。どちらもガードが既にやった仕事を繰り返す。

本物のマクロはこう:

\`\`\`rust
let ([$( $x ),*], $top) = unsafe {
    $crate::interpreter_types::StackTr::popn_top(&mut $interpreter.stack)
        .unwrap_unchecked()
};
\`\`\`

\`unwrap_unchecked()\` は実行時の \`Some\` チェックをスキップ。**安全なのは値が \`Some\` であることを証明できるときだけ — そしてステップ 3 のガードがちょうどそれを証明済み。** \`unsafe\` ブロックは契約: *「自分でチェックした、二重チェック不要」*。ガードを消した瞬間、即座に未定義動作。

> 🛑 **理解度チェック。** スクロールせずに: なぜコンパイラ自身が冗長な \`Some\` チェックを最適化で除去できないのか? なぜ \`unwrap_unchecked\` を強制する必要がある?

コンパイラは \`stack.len() >= N\` と \`popn_top\` が \`Some\` を返すことの関係を証明できません — それはドメイン不変条件（私たちが \`popn_top\` の挙動を知っている）であって、型システムが見られる型不変条件ではない。\`unwrap_unchecked\` はドメイン知識と型システムの限界の継ぎ目 — 「自分でチェックした、信用して」とコンパイラに伝える方法です。

## ステップ 6 — 完成形の \`popn_top!\`

すべて組み合わせると:

\`\`\`rust
macro_rules! popn_top {
    ([ $($x:ident),* ], $top:ident, $interpreter:expr) => {
        if $interpreter.stack.len() < (1 + $crate::_count!($($x)*)) {
            $crate::primitives::hints_util::cold_path();
            return Err($crate::InstructionResult::StackUnderflow);
        }
        let ([$( $x ),*], $top) = unsafe {
            $crate::interpreter_types::StackTr::popn_top(&mut $interpreter.stack)
                .unwrap_unchecked()
        };
    };
}
\`\`\`

3つのディテール、それぞれ価値を持つ:

- **\`cold_path()\`** — レアな失敗パスのコードをホット icache から外す（ゼロコストヒント）
- **\`unwrap_unchecked\`** — ガードが既にやった実行時チェックをスキップ
- **アリティ N のマッチャ** — N 個 pop する Opcode すべてに使える1つのマクロ

> 🔍 **リポジトリで確認。** \`crates/interpreter/src/instructions/macros.rs\` を開いて \`popn_top!\` を見つけ、ここで歩いた内容と同じであること（フォーマットを除く）を確認してください。

## ステップ 7 — \`gas!\`: 同じパターンを別の用途に

\`\`\`rust
macro_rules! gas {
    ($interpreter:expr, $gas:expr) => {
        if !$interpreter.gas.record_regular_cost($gas) {
            $crate::primitives::hints_util::cold_path();
            return Err($crate::InstructionResult::OutOfGas);
        }
    };
}
\`\`\`

同じ形: チェック → 失敗側に cold ヒント → 早期リターン。ガスを引く、払えなければ崖から落ちる。\`popn_top!\` を消化していれば、\`gas!\` は同じパターンの5行版です。

> 🔍 **リポジトリで確認。** \`gas!\` が \`add\` の本体で呼ばれていないのはなぜ? \`arithmetic.rs\` を見て仮説を立てる。次に \`interpreter.rs\` で定数ガスの Opcode がどこで課金されるか探す。

ヒント: \`add\` は **固定の** ガスコスト（現行 Ethereum で 3）。固定コストはディスパッチループが各 Opcode 関数を実行する前に前払いします。**オペランドに依存する** コスト（\`exp\`、\`sha3\`、メモリ操作系）の Opcode だけが本体内で課金 — ドリルでそういうケースを1つ見ます。

## クイズ前の想起

スクロールせずに:

1. なぜ \`popn_top!\` は関数ではなくマクロなのか?（メカニズム的な理由を1つ。）
2. \`cold_path()\` は実行時に何にコンパイルされる?
3. \`popn_top!\` の中の \`unwrap_unchecked\` がなぜ未定義動作にならないのか?
4. \`popn_top!\` と \`gas!\` の構造的な関係は?

次のレッスンは進行をゲートするクイズです。**クイズはうなずきで通せない** — 曖昧な答えがあるなら今、想起してください。

## 📺 関連動画

\`\`\`youtube
Nh19f_2fWLc | Dragan Rakita — EVM Technical walkthrough
\`\`\`
`,
                },
                {
                  title: 'クイズ: \`add\` は本当に身についた?',
                  slug: 'revm-add-opcode-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 3,
                  duration: 5,
                  xpReward: 30,
                  content: `# クイズ: \`add\` は本当に身についた?

このクイズは飾りではありません。前のレッスンの「予測」プロンプトはうなずいて通り過ぎやすい — そして1日後の「読んでうなずいたけど再現できない」が、Advanced を壊す失敗モードです。

5問。前2レッスンの各ピースに1問ずつ対応。**自分が当て推量していると気づいたら**、止まって関連箇所を読み直してから答えてください。クイズは逃げません。

2問以上落としたら、レッスンが内面化していない — ドリルへ進む前に「\`add\` をステップで組み立てる」と「マクロを抽出する」の2つを読み直してください。`,
                  quizQuestions: [
                    {
                      question: "`add` のシグネチャの `H: ?Sized` から `?` を取ると、実際に何が壊れますか?",
                      options: [
                        "何も壊れない — `?Sized` はコンパイラが無視する装飾的なヒント。",
                        "`add` がコンパイルできなくなる — `H` は既に暗黙的に `?Sized` だから。",
                        "`&mut dyn Host` を引数として渡せなくなる — `H` には具象でサイズが決まる型しか渡せなくなる。",
                        "`popn_top!` の中の `unwrap_unchecked()` が未定義動作になる。",
                      ],
                      correctIndex: 2,
                      explanation: "Rust はジェネリック型パラメータすべてに暗黙の `Sized` 制約を加えます。`?Sized` はその制約を外す指定。これがないと `H` はコンパイル時にサイズが分かる型でなければならず、トレイトオブジェクト（`dyn Host` のように実行時の具象型でサイズが決まる型）は除外されます。`&mut dyn Host` がコンパイルする唯一の理由が、この `?Sized` opt-out です。",
                    },
                    {
                      question: "`popn_top!` の中の `unwrap_unchecked()` がなぜ未定義動作にならないのですか?",
                      options: [
                        "`unsafe` ブロックは実行時に UB チェックを停止するから。",
                        "マクロの直前にある `if stack.len() < ...` のガードが、pop する値が `Some` であることをちょうど証明したから。",
                        "`cold_path()` がアンダーフロー側の分岐を実行不可能にするから。",
                        "Rust が `unsafe` ブロック内で自動的に `Option` 型を検証するから。",
                      ],
                      correctIndex: 1,
                      explanation: "`unwrap_unchecked` は値が `None` のときに未定義動作になります。マクロの `if` ガードはスタックの要素数が必要数より少ないときに早期リターンするので、`unwrap_unchecked` が走る時点では値が `Some` であることが静的に保証されています。ガードを消した瞬間、即座に UB。`unsafe` ブロックは契約です — 「自分でチェックした、ランタイムは二重チェック不要」。",
                    },
                    {
                      question: "`cold_path()` は生成されるアセンブリで実際に何にコンパイルされますか?",
                      options: [
                        "panic ハンドラへの無条件ジャンプ。",
                        "実行時には何にもコンパイルされない — LLVM への「この分岐は統計的にレア」というヒント。",
                        "`std::process::abort()` の呼び出し。",
                        "スタックトレースを出力するロギング呼び出し。",
                      ],
                      correctIndex: 1,
                      explanation: "`cold_path()` は命令を生成しません。LLVM に「この分岐から到達するコードはレア」と伝えます。オプティマイザはその分岐のコードをホットな命令キャッシュから遠ざけて配置します。ハッピーパスはキャッシュ温度を保ったまま1本の直線アセンブリに保たれる — それがこのパターンの目的です。",
                    },
                    {
                      question: "`U256::MAX.wrapping_add(U256::from(1))` は16進で何を返しますか?",
                      options: [
                        "`0xFFFF...FF` — 最大値で飽和。",
                        "オーバーフローで panic。",
                        "`0x0` — mod 2²⁵⁶ で wrap する。",
                        "トランザクションが revert する。",
                      ],
                      correctIndex: 2,
                      explanation: "EVM の `ADD` Opcode はコンセンサスにより mod 2²⁵⁶ の wrap が *要求* されています。`wrapping_add` がまさにその挙動です。`saturating_add` や `checked_add` に置き換えると、最初のオーバーフローでネットワークがフォークします — ドリルレッスンで実証します。",
                    },
                    {
                      question: "`add` の関数本体は加算結果をどこにも明示的に返していません。EVM はどこで新しいスタックトップを観測するのですか?",
                      options: [
                        "成功時に和を載せた `Result` の戻り値を通じて。",
                        "`*op2 = ...` を通じて — `op2` はスタックへの可変参照なので、参照経由で書き込むとスタックがその場で書き換わる。",
                        "インタープリターが管理するスレッドローカルなサイドチャネル経由で。",
                        "`popn_top!` の暗黙的な戻り値を通じて、ディスパッチループが読む。",
                      ],
                      correctIndex: 1,
                      explanation: "`popn_top!` は `op2` を `&mut U256` としてバインドし、新しいスタックトップ（`op1` を pop した直後の位置）を指します。`*op2 = ...` でその参照経由に書き込むとスタックがその場で書き換わる — メモリ書き込みは1回、pop してから push しません。だからこそ関数の `Result` は成功/失敗だけを運び、データの流れは参照経由で起きるのです。",
                    },
                  ],
                },
                {
                  title: 'ドリル: インタープリターのソースが読めることを証明する',
                  slug: 'revm-add-opcode-drill-ja',
                  type: 'CONTENT',
                  sortOrder: 4,
                  duration: 12,
                  xpReward: 25,
                  content: `# ドリル: インタープリターのソースが読めることを証明する

読むのはリハーサル。**手を動かすのが記憶。** このレッスンは、別ウィンドウで cargo を開いた状態で、本物の revm チェックアウトの中で自分で走らせる3つのドリルです。どのドリルも「読むだけ」ではなく *やる、そして観測したことを書き留める*。

## セットアップ

\`\`\`bash
git clone https://github.com/bluealloy/revm
cd revm
cargo build  # ツールチェーンをウォームアップ
\`\`\`

\`cargo build\` が失敗したら、先に進む前に直してください。残りのドリルはビルドが通っている前提です — 「読むだけ」のバージョンは存在しません。

## ドリル 1 — \`mul\` を探して、形を証明する

\`crates/interpreter/src/instructions/arithmetic.rs\` を開く。\`mul\` 関数を見つける。\`add\` と1行ずつ比較する。

> 🛑 **質問（スクロールする前に書き留めて）:** \`mul\` と \`add\` は行数まで構造的に同一です。**なぜ?** 「両方算術だから」ではなく — EVM の *メカニズム的にどんな性質* がこの2つを同じ形に強制するのか、具体的に。

答え: 両方とも **2スタック入力 / 1スタック出力 / 固定ガス / 副作用なし** の Opcode。このプロファイルに合致するものはすべて、まったく同じ制御フロー形にコンパイルされる: \`popn_top!([a], b, ctx.interpreter); *b = a.OP(*b); Ok(())\`。違うのは \`OP\`（\`wrapping_add\` vs \`wrapping_mul\`）とガス料金（現行 Ethereum では両方 3）だけ。

書き留めた答えがこれより抽象的だったら、このドリルを獲得していない — 読み直し。

## ドリル 2 — \`exp\` を探して、動的なガス課金を見つける

\`exp\` は同じファイルにあります。\`add\` や \`mul\` より長い。理由は2つ:

1. 数学が複雑（単一演算ではなく冪乗）。
2. ガス料金が **動的** — 指数のサイズに依存する。

> 🔍 **\`exp\` の中に** 指数の *バイト単位で* 課金している \`gas!\` マクロ呼び出しを **見つけて**、その算術を読む。

> 🛑 **質問（書き留めて）:** なぜ \`exp\` は動的課金で、\`add\` はディスパッチループによる定数課金なのか?

答え: ディスパッチは *固定の* コストを前払いできるが、\`exp\` のコストは実行時の値（指数オペランドのサイズ）に依存する。そのコストは関数本体内、オペランドを検査した *後* でしか分からない。だから \`exp\` は自分で課金する。

これは一般化します。コストがオペランドに形作られる Opcode は本体内で課金しなければなりません。これを脳内に保存 — \`sha3\`、\`mload\`、\`call\` 系で同じパターンに会います。

## ドリル 3 — わざとコンセンサスを壊す

これが定番の「理解した証明」ドリル。**コンセンサスがどれほど脆いかは、わざと壊してみるまで信じられません。**

1. \`crates/interpreter/src/instructions/arithmetic.rs\` を開く。
2. \`add\` を見つける。\`wrapping_add\` を \`saturating_add\` に変更。保存。
3. リポジトリルートから: \`cargo test -p revm-interpreter\`。
4. **テストが落ちるのを見る。** 少なくとも1つの失敗メッセージを読む — 失敗が panic ではなく数値の不一致であることを確認。

今やったこと: ライブラリ関数1つを書き換えた。あなたのクライアントは今、\`0xFFF...FF + 1\` の結果について世界中の他の Ethereum クライアントと不一致になっています。\`ADD\` がオーバーフローする最初のトランザクションで、あなたのノードはメインネットからフォークされる。

> 🔧 **変更を元に戻し**、テストが再びパスすることを確認:
>
> \`\`\`bash
> git checkout crates/interpreter/src/instructions/arithmetic.rs
> cargo test -p revm-interpreter
> \`\`\`
>
> 要点は変更ではなく、**コンセンサスがライブラリ関数1つ分の距離** で失われることの実証 — そしてあなたはそれを今、肌で感じた。

\`cargo test\` を実際に走らせて出力を見ていなければ、ドリルをスキップしました。ドリル *は* 走らせること。読んで「分かった」と思えるバージョンは存在しません。

## レッスン終了の想起

スクロールせずに、紙に自分の言葉で:

1. \`add\` と \`mul\` のソースが同一になる *メカニズム的な* 性質は何か?
2. なぜ \`exp\` は本体内で課金するのか、ディスパッチ経由ではなく?
3. \`add\` を EVM 準拠から非準拠に変える1つの変更は何か — そしてどんなテスト失敗モードを観測したか?

どれか曖昧なら、レッスンはまだあなたを離しません。ドリルを走らせ直すか、読み直し。

ここまで来れば、Solidity 開発者の 99% より EVM ソースを多く読んだことに — そしてチェーンに自分自身と矛盾させ、元に戻すことで、それを証明しました。次のレッスンは、1つの Opcode から256個全てをディスパッチするテーブルへとズームアウトします。`,
                },
                {
                  title: '命令テーブルをステップで組み立てる',
                  slug: 'custom-opcodes-table-ja',
                  type: 'CONTENT',
                  sortOrder: 5,
                  duration: 10,
                  xpReward: 25,
                  content: `# 命令テーブルをステップで組み立てる

> 📋 **読む前に想起。** 直前のレッスンからの3問。どれか曖昧なら「\`add\` をステップで組み立てる」やそのドリルに戻ってください — このレッスンは、答えが「自分の語彙」になっている前提で進みます。
>
> 1. Opcode 関数の型シグネチャ \`<IT: ITy, H: ?Sized>\` はコンパイル時に何をくれるか?
> 2. \`popn_top!\` マクロは \`op2\` を \`&mut\` でバインドする。なぜ値ではなく参照なのか?
> 3. \`add\` は \`wrapping_add\` を使う。\`saturating_add\` に置き換えて \`cargo test -p revm-interpreter\` を再実行したとき、どんなテスト失敗モードを観測したか?

---

EVM がバイトコード中に \`0x01\` を見たとき、**どんな仕組みで** \`add\` が呼ばれると決まるのか? このレッスンはその答えです — そして答えは複雑さに見合う。\`add\` のときと同じく、最も素朴なディスパッチから始めて、revm の本物の命令テーブルまで積み上げます。

レッスンの終わりには、これの全ピースを自分で組み立てたことになります:

\`\`\`rust
const fn instruction_table_impl<WIRE: InterpreterTypes, H: Host>()
    -> InstructionTable<WIRE, H>
{
    let mut table = [Instruction::unknown(); 256];
    table[ADD as usize] = Instruction::new(arithmetic::add);
    table[MUL as usize] = Instruction::new(arithmetic::mul);
    // ...
}
\`\`\`

> 📂 **別タブで \`bluealloy/revm\` を開いてください。** 以前と同じく、以下のすべての主張を実ファイルで検証しながら読みます。

## ステップ 0 — 素朴なディスパッチ

何も考えずに書くと、こんな形:

\`\`\`rust
fn dispatch(byte: u8, ctx: &mut Context) -> Result {
    match byte {
        0x01 => add(ctx),
        0x02 => mul(ctx),
        0x03 => sub(ctx),
        // ... アーム256個
        _ => return Err(Unknown),
    }
}
\`\`\`

256個の match アーム。コンパイラはジャンプテーブルに変換 *してくれるかもしれないし、しないかもしれない*。さらに悪いことに: Opcode を1つ追加・改名するたび、この巨大な match を編集する必要がある。

> 🛑 **予測。** スクロールせずに: revm がこの素朴版を採用しない理由を2つ挙げてください。（1つはコンパイラ関連、1つは保守関連。）

2つ:

1. **ジャンプテーブル変換が保証されない。** 256アームの match は LLVM が *普通* 正しくやってくれるが、「普通」はコンセンサスを載せる契約にならない。O(1) ルックアップは保証付きで欲しい。
2. **Opcode の変更コストが高い。** カスタム Opcode を加えるには、この巨大な match を編集することになる。「ディスパッチ match を編集してください」という UX のモジュラリティは、設計時点で壊れています。

## ステップ 1 — 配列に関数ポインタを入れる

match を、Opcode バイトでインデックスする配列に置き換える。各スロットは関数ポインタ:

\`\`\`rust
let mut table: [fn(&mut Context) -> Result; 256] = [unknown; 256];
table[0x01] = add;
table[0x02] = mul;
// ...
fn dispatch(byte: u8, ctx: &mut Context) -> Result {
    (table[byte as usize])(ctx)
}
\`\`\`

ディスパッチはこれで **インデックス参照1回** — match なし、コンパイラに作らせるジャンプテーブルなし。形が保証される。

> 🛑 **予測。** 配列のサイズがちょうど \`256\` で、\`usize::MAX\` でも定義済み Opcode 数でもないのはなぜか?

EVM の Opcode は1バイト。値は 256 通りしかない。固定サイズ配列は空間を網羅する — 各バイトは Opcode を持つか \`unknown\` にマップされる、それだけ。

## ステップ 2 — テーブルを \`const\` にする

素朴版はテーブルを *実行時* に構築する — 代入を順次プッシュして、オプティマイザがホットパスから引き上げてくれることを期待する形。もっと良い方法: **コンパイル時に構築する**。ディスパッチ起動時にはテーブルが既に出来上がっている。

\`\`\`rust
const fn build_table() -> [fn(&mut Context) -> Result; 256] {
    let mut t = [unknown; 256];
    t[0x01] = add;
    t[0x02] = mul;
    // ...
    t
}
const TABLE: [fn(&mut Context) -> Result; 256] = build_table();
\`\`\`

\`const fn\` は「この関数はコンパイル時に評価できる」を意味します。コンパイラは \`build_table()\` を *コンパイル中に* 実行し、結果の配列を凍結してバイナリのデータセクションに焼き込む。実行時に \`build_table\` は走らない — 焼き込まれた配列を読むだけ。

> 🛑 **理解度チェック。** 「コンパイル時に走る」は単なる受け売り。自分の言葉で: もし \`fn\` だったら *正確に* 何が*1回* 走るのか? \`const fn\` はそれを *0回* にしている。具体的に。

0回になるもの: テーブルのスロットを埋めるループ/シーケンス。実行時の \`TABLE\` は手書きの配列リテラル \`[unknown, add, mul, sub, ...; 256]\` と同一。**ディスパッチ準備の実行時コストはゼロ。** それが目的そのもの。

## ステップ 3 — 関数ポインタを \`Instruction\` 構造体で包む

裸の \`fn\` ポインタでも動きますが、柔軟性に欠ける — メタデータ（ガスコスト、Opcode 名など）を後から付けると、ディスパッチの型が壊れる。Revm は関数ポインタを構造体で包む:

\`\`\`rust
#[derive(Debug)]
pub struct Instruction<W: InterpreterTypes, H: ?Sized> {
    fn_: fn(InstructionContext<'_, H, W>) -> InstructionExecResult,
}

impl<W: InterpreterTypes, H: Host + ?Sized> Instruction<W, H> {
    #[inline]
    pub const fn new(fn_: fn(InstructionContext<'_, H, W>) -> InstructionExecResult) -> Self {
        Self { fn_ }
    }
}
\`\`\`

> 🛑 **予測。** \`fn_:\` 1フィールドだけの構造体を作る理由は? 裸の \`fn\` では得られない何を得る?

2つ:

1. **将来のメタデータ。** \`gas_cost: u16\`、\`name: &'static str\` などをディスパッチのシグネチャを変えずに追加できる。
2. **型の規律。** \`Instruction::new(arithmetic::add)\` は裸の関数ポインタ代入よりも型安全 — コンパイラが呼び出し時点で関数シグネチャがテーブルのスロット型と一致するか検証する。

ジェネリクス \`W: InterpreterTypes, H: ?Sized\` は2レッスン前に積み上げた \`IT\` と \`H\` と完全に同じです。同じ理屈 — 1つのテーブルで全ての実行モードとホスト型に対応する。

## ステップ 4 — 完成形の命令テーブル

組み合わせると、[\`crates/interpreter/src/instructions.rs\`](https://github.com/bluealloy/revm/blob/main/crates/interpreter/src/instructions.rs) の本物のコード:

\`\`\`rust
const fn instruction_table_impl<WIRE: InterpreterTypes, H: Host>()
    -> InstructionTable<WIRE, H>
{
    use bytecode::opcode::*;
    let mut table = [Instruction::unknown(); 256];

    table[ADD as usize] = Instruction::new(arithmetic::add);
    table[MUL as usize] = Instruction::new(arithmetic::mul);
    table[SUB as usize] = Instruction::new(arithmetic::sub);
    table[DIV as usize] = Instruction::new(arithmetic::div);
    table[SDIV as usize] = Instruction::new(arithmetic::sdiv);
    // ...
    table[LT as usize] = Instruction::new(bitwise::lt);
    table[GT as usize] = Instruction::new(bitwise::gt);
    // ...

    table
}
\`\`\`

各ピースを自分で組み立てた:

- **Opcode バイトでインデックスする配列**（ステップ 1）— O(1) ディスパッチを保証
- **\`const fn\`**（ステップ 2）— テーブルがコンパイル時に焼き込まれ、起動コストはゼロ
- **最初に全部 \`Instruction::unknown()\`** — 未定義のバイトでも安全に停止、定義済み Opcode だけが自分のスロットを上書き
- **\`Instruction::new(fn)\`**（ステップ 3）— 型付きラッパ、将来のメタデータ拡張に開いている

## Opcode バイトマップ（リファレンス）

[\`bytecode::opcode\`](https://github.com/bluealloy/revm/blob/main/crates/bytecode/src/opcode.rs) より:

| バイト | Opcode |
| :--- | :--- |
| 0x01 | ADD |
| 0x02 | MUL |
| 0x03 | SUB |
| 0x10 | LT |
| 0x14 | EQ |
| 0x16 | AND |
| 0x60–0x7F | PUSH1–PUSH32 |
| 0x80–0x8F | DUP1–DUP16 |
| 0xA0–0xA4 | LOG0–LOG4 |
| **0x0C–0x0F** | **未割当** ← カスタム Opcode のためのギャップ |
| **0x21–0x2F** | **未割当** |

> 🔍 **信用せず、検証する。** リポジトリで \`bytecode::opcode\` を開く。\`0x0C\` が **あなたが実際にフォークするバージョンで** 本当に未割当か確認。レッスン内の表はスナップショット、契約ではありません — ハードフォークごとに隙間は動きます。

## 進む前の想起

スクロールせずに:

1. なぜ \`match\` 文や \`HashMap<u8, fn>\` ではなく、関数ポインタの配列なのか?
2. \`const fn\` は実行時に何を節約しているのか?
3. なぜ全スロットがまず \`Instruction::unknown()\` で初期化され、定義済み Opcode が上書きする形なのか?
4. なぜ裸の \`fn\` ではなく \`Instruction { fn_ }\` の構造体で包むのか?

次のレッスン: テーブルが完成したので、自前の Opcode を差し込みます。
`,
                },
                {
                  title: 'カスタム Opcode を配線する — そして失敗モード',
                  slug: 'custom-opcodes-wiring-ja',
                  type: 'CONTENT',
                  sortOrder: 6,
                  duration: 10,
                  xpReward: 25,
                  content: `# カスタム Opcode を配線する — そして失敗モード

前のレッスンで、revm の命令テーブル — コンパイル時に焼き込まれた256スロットの \`Instruction\` 構造体配列 — を組み立てました。**さあ、自前の Opcode を差し込みます。**

このレッスンは半分メカニクス（実は短い）、もう半分は注意点（こちらが本番）。メカニクスは付箋1枚で済む。注意点は「Hyperliquid が Revm を選んだのはモジュラーだから」という売り文句が *無料ランチではない* 理由です。

## メカニクス — 3行

未割当バイトを選ぶ。関数を差し込む:

\`\`\`rust
const HYPER_FAST_SWAP: u8 = 0x0C;

let mut table = standard_table();
table[HYPER_FAST_SWAP as usize] = Instruction::new(my_hyper_fast_swap);
\`\`\`

\`my_hyper_fast_swap\` は2レッスン前の \`add\` と全く同じ形:

\`\`\`rust
pub fn my_hyper_fast_swap<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
    popn_top!([amount_in, pool_id], amount_out, context.interpreter);
    *amount_out = compute_swap_native(*amount_in, *pool_id);
    Ok(())
}
\`\`\`

**それで全部。** 標準テーブルを取って、コピーして、1スロットを上書き。これでディスパッチループはバイト \`0x0C\` をあなたの関数にルーティングします。

\`\`\`mermaid
flowchart LR
    Std[standard_table — 256スロット] -->|複製| Mine[フォーク用テーブル]
    Mine -->|0x0C を上書き| Custom[my_hyper_fast_swap]
    Bytecode[bytecode 0x0C ...] -->|interpreter dispatch| Mine
    Mine --> Custom
    Custom --> Result[結果がスタックへ]
\`\`\`

## 実利

複利的に効く2つの勝ち:

1. **内部ステップごとのインタープリターループのオーバーヘッドがない。** 複雑な Solidity 関数が 200 EVM 命令だとしても、カスタム Opcode 1つなら 1 ディスパッチ。
2. **Rust 側で SIMD、FFI、事前計算済みテーブルが使える。** バイトコードからは触れない武器。

複雑なオプションプライサーが **Solidity の 500K ガス → カスタム Opcode 1つの 5K ガス** に落ちる。これが Hyperliquid が perp 専用 Opcode を追加した理由 — 決済レイヤーのチェーンが安定通貨オペレーション向けに探索しているのも同種の圧縮です。

> 🛑 **失敗モードを予測。** あなたは明日カスタム Opcode をリリースします。**雑に扱った場合に発生する問題を3つ** リストアップ。リストを保持して、下の注意点と比較。

## 注意点 — オプションではない

### 1. コンセンサス互換性

標準 EVM から外れると、**他の Ethereum クライアントとブロックを共有できなくなる。** **自前のチェーンでのみ** 有効。この Opcode 入りでメインネットからフォークして go-ethereum とピアしたら、\`0x0C\` を触る最初のトランザクションで即切断されます。

> 🔍 **走らせるとどうなるかを推論。** 自分のカスタム Opcode 入りの Reth ノードを起動し、素の geth を同じチェーンヘッドに向けたら: geth はいつ切断する? 答え: \`0x0C\` を含むブロックを実行しようとした時点。geth は \`0x0C\` を INVALID として実行、あなたの Reth は swap として実行 → ブロックの state-root 検証が失敗。「ブロックを共有できない」は読むのではなく、*感じる* べき主張です。

### 2. ガス価格はオプションではない

強力なショートカットには適切なガスコストが必要 — でなければ DoS ベクター。

> 🛑 **質問（書き留めて）:** \`my_hyper_fast_swap\` のガス価格をどう導出するか? 3 文で方法論を書けないなら、この Opcode を安全にリリースできません。

擁護できる方法論:

1. **最悪ケースをベンチマーク。** 病的入力（最大サイズ pool ID、最大 amount）に対して Opcode を走らせる。実時間を測る。
2. **ガス予算に変換。** スループット目標（例: 純 Opcode 負荷でブロック1秒）を選ぶ。予算を最悪時間で割る。
3. **安全マージンを足す。** 分散・将来のハードウェア変化・*あなたのベンチ* と *攻撃者のベンチ* のギャップ — 2〜3倍。

3 文の答えがこの形でなかったら、あなたの Opcode は DoS 待ちです。

### 3. 検証性 — ZK を載せるなら

チェーンが ZK 証明を欲しがるなら（L2 決済を狙うアプリチェーンには現実の懸念）、新しい Opcode を zkVM 内で証明可能にする必要がある。**Opcode あたり数週間の追加作業になる可能性。**

これが「Revm を選んだ理由はモジュラーだから」が「カスタム Opcode を 50 個出す」に翻訳されない理由です。各 Opcode は次を抱えます:

- **コンセンサスリスク**（実装バグごとにフォークする）
- **価格リスク**（誤価格なら DoS ベクター）
- **検証コスト**（証明が欲しいなら zkVM 統合に数週間）

ほとんどのチェーンにとって正しいカスタム Opcode 数は **0〜3個**。Hyperliquid は少数を追加。これを探索する本番アプリチェーンの大半は、同様に小さなフットプリントに収まります。

## クイズ前の想起

スクロールせずに:

1. カスタム Opcode を差し込むメカニクスは **3行。** 記憶からスケッチしてください。
2. 「モジュラー」の売り文句が隠している3つの注意点は何か?
3. 複雑なロジックをカスタム Opcode にコンパイルするとガスはおおよそ何桁節約される? なぜ?
4. ペアリング親和的な楕円曲線演算をするカスタム Opcode を出したい場合、**最も重い注意点はどれか?**

次: 進行をゲートするクイズ、それから本物のフォークで配線するドリル。
`,
                },
                {
                  title: 'クイズ: テーブルのメカニクスは身についた?',
                  slug: 'custom-opcodes-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 7,
                  duration: 4,
                  xpReward: 25,
                  content: `# クイズ: テーブルのメカニクスは身についた?

命令テーブルと配線メカニクスをカバーする4問。前回と同じルール: **クイズはうなずきで通せない。** これらはゲートで、飾りではありません。

2問以上落としたら、ドリルへ進む前に「命令テーブルをステップで組み立てる」を読み直してください。`,
                  quizQuestions: [
                    {
                      question: "命令テーブルが固定サイズ `[Instruction; 256]` 配列で、`HashMap<u8, Instruction>` でも `match` 文でもないのはなぜですか?",
                      options: [
                        "HashMap の方が、配列より見つからない Opcode をエレガントに扱える。",
                        "コンパイラは 256 アームの match を、インデックス配列と同等に最適化する — 等価。",
                        "インデックス配列はハッシュ計算もコンパイラ依存のジャンプテーブル変換も伴わずに O(1) ディスパッチを保証し、256スロットでバイト空間を網羅する。",
                        "HashMap はコンパイル時に unsafe。",
                      ],
                      correctIndex: 2,
                      explanation: "Opcode バイトは 1 バイト = 256 通り。固定配列はその空間を網羅。インデックス参照は O(1) を保証 — ハッシュなし、`match` がジャンプテーブルになるかどうかというコンパイラの匙加減もなし。各バイトは定義済み Opcode を持つか `unknown` にマップされる。形と最悪レイテンシの両方が契約の一部です。",
                    },
                    {
                      question: "`instruction_table_impl()` に対して `const fn` は何をしますか?",
                      options: [
                        "全呼び出し箇所で関数をインライン化することを強制する。",
                        "コンパイラが関数をコンパイル時に評価し、構築済みテーブルをバイナリに直接焼き込み、起動時にセットアップが走らないようにする。",
                        "関数をスレッドセーフとマークする。",
                        "結果のテーブルの実行時改変を無効化する。",
                      ],
                      correctIndex: 1,
                      explanation: "`const fn` は「この関数はコンパイル時に評価できる」を意味します。テーブル構築コードはコンパイル中に走り、実行時の `TABLE` は手書きの配列リテラルと同一です。ディスパッチ準備の起動コストがゼロ — それがここで `const fn` を使う狙いそのものです。",
                    },
                    {
                      question: "なぜ全スロットがまず `Instruction::unknown()` で初期化され、その後で定義済み Opcode が自分のスロットを上書きするのですか?",
                      options: [
                        "デバッグヒント — `unknown` は単なるプレースホルダ名。",
                        "バイト 0x00–0xFF が全部「安全に停止する」ハンドラにマップされ、未定義 Opcode が静かに飛ばされたりメモリ unsafety を起こしたりしないようにするため。",
                        "Rust の配列初期化構文を満たす唯一の方法だから。",
                        "後で最適化で消される事前確保ステップ。",
                      ],
                      correctIndex: 1,
                      explanation: "理由は2つ複合していますが、安全性が支配的: 未定義のバイトはどれも UB や静かな見逃しではなく、クリーンな `Unknown` 停止を生むべきです。`Instruction::unknown()` が安全なデフォルト、定義済み Opcode が上書きする。Rust の配列初期化は確かに全スロット埋める必要はありますが、`MaybeUninit` で先送りもできる — `unknown()` を使うのは意図的な安全選択です。",
                    },
                    {
                      question: "高コストな暗号演算（例: ペアリング親和的な楕円曲線）を行うカスタム Opcode を出したい。実務上、*最も重い* 注意点はどれですか?",
                      options: [
                        "コンセンサス互換性 — メインネットとブロックを共有できない。",
                        "ガス価格 — 誤価格なら DoS ベクター。",
                        "zkVM 内での検証性 — 新しい Opcode は zkVM 統合に数週間かかる可能性があり、暗号演算は制約を書くのが特に難しい。",
                        "Rust の型システムの限界。",
                      ],
                      correctIndex: 2,
                      explanation: "3つの注意点は全て当てはまりますが、暗号演算では検証性が決定打です。ZK 親和的でない暗号（ペアリング、特定のハッシュ関数）は Opcode あたり数週間の zkVM 仕様作業を要する可能性があります — ガス価格設計やコンセンサス分割の受容より格段に重い。本番チェーンのカスタム Opcode 数が少ないのは、この検証コストに部分的に支配されています。",
                    },
                  ],
                },
                {
                  title: 'ドリル: フォークを出荷する',
                  slug: 'custom-opcodes-drill-ja',
                  type: 'CONTENT',
                  sortOrder: 8,
                  duration: 12,
                  xpReward: 25,
                  content: `# ドリル: フォークを出荷する

読むのはリハーサル。**手を動かすのが記憶。** このドリルは「カスタム Opcode について読んだ」から「本物の revm チェックアウトに自分で配線して実行を見た」までを連れて行きます。

## セットアップ

前のドリルで revm チェックアウトは既にあるはず。なければ:

\`\`\`bash
git clone https://github.com/bluealloy/revm
cd revm
cargo build  # 進む前にクリーンビルドを確認
\`\`\`

\`cargo build\` が失敗したら、ドリル前に直してください。

## ドリル 1 — 未割当 Opcode バイトを探す（レッスンを信用しない）

レッスンは \`0x0C–0x0F\` を未割当として示しました。**あなたが実際にフォークするバージョンの実ファイルで** 検証してください。

> 🔍 **\`crates/interpreter/src/instructions.rs\` を開く。** テーブル構築関数をスキャン。代入の左辺に *出現しない* バイトはどれも未割当。

> 🛑 **質問（スクロールする前に書き留めて）:** あなたが見つけた最も意外な未割当バイトは何か?（割当済みの隣接バイトと並んでいるもの — そのギャップは「検討されて却下された提案」や「未来の EIP のための予約」を物語ります。）

唯一の正解はない — でも答えが「レッスンの表をそのまま信用した」だったら、ドリルをスキップしました。ソースで検証してください。

## ドリル 2 — 自分の Opcode を定義する

未割当バイトを1つ選ぶ。定数を定義。\`add\` と同じ形 — ただしスタックプロファイルは **1-in / 1-out / その場書き換え**（「トップを2倍にする」Opcode）の関数を実装:

\`\`\`rust
const DOUBLE_TOP: u8 = 0x0C;  // 自分が選んだバイト

pub fn double_top<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
    popn_top!([], op, context.interpreter);
    *op = (*op).wrapping_mul(U256::from(2));
    Ok(())
}
\`\`\`

> 🛑 **質問:** なぜ \`popn_top!([op1], op2, ...)\` ではなく \`popn_top!([], op, ...)\` なのか? 構造的な違いは何で、それはこの Opcode のスタックプロファイルについて何を語っているか?

空の \`[]\` は **pop する値がない** を意味する — \`op\` だけがバインドされ、現在のスタックトップへの \`&mut\`。これが 1-in / 1-out / その場書き換え型 Opcode（\`add\` の 2-in / 1-out との違い）の表現方法です。マクロのアリティマッチャがここで効いてくる — 同じマクロ、異なるスタックプロファイル、関数を二重に書く必要なし。

## ドリル 3 — テーブルに配線する

標準テーブルのコピーに追加:

\`\`\`rust
let mut table = standard_table();
table[DOUBLE_TOP as usize] = Instruction::new(double_top);
\`\`\`

これで配線完了。ディスパッチループはバイト \`0x0C\` を見たとき \`double_top\` を呼ぶ。

## ドリル 4 — その Opcode を使うバイトコードを実行

値をプッシュし、Opcode を実行し、停止するバイトコードをエンコード:

\`\`\`
PUSH1 0x05  // 5 をスタックに push — バイト: 0x60 0x05
DOUBLE_TOP  // カスタム Opcode — バイト: 0x0C
STOP        // 0x00
\`\`\`

16進: \`60 05 0C 00\`。

このバイトコードを、テーブル付きのフォーク済み revm で実行。スタックは \`10\`（= 5 × 2）で終わるはずです。

> 🔧 **配線はドリルとして残します。** revm の既存テストハーネス \`crates/interpreter/tests/\` を使うか、\`examples/\` にワンショットバイナリを書く。要点は: EVM コンテキストを構築し、改変したテーブルを差し込み、バイトコードを実行し、最終スタック値をアサートすること。

スタックに \`10\` が出たら **フォークを出荷したことになります。** あなたのクライアントは今、メインネットと非互換なチェーンを実行している — そして「読んだ」と「やった」の差を体で感じた。

## レッスン終了の想起

スクロールせずに、自分の言葉で:

1. \`popn_top!([op1], op2, ...)\` と \`popn_top!([], op, ...)\` のメカニクス的な違いは何か? 各々の Opcode のスタックプロファイルについて何を語っているか?
2. あなたの \`double_top\` のスタックプロファイルは何か?（X-in、Y-out、副作用?）
3. \`double_top\` をメインネットに出荷したい場合、*最初に* 壊れるのは何か — そしてどの瞬間に?

どれか曖昧なら、レッスンはまだあなたを離しません。ドリルをやり直すか、読み直し。

このドリルの後、あなたは本当にカスタム Opcode をコードに配線しました。**より重要なのは、コストを体で感じたこと。** 次: revm がどう状態を取るか — \`Database\` トレイト。`,
                },
                {
                  title: '\`Database\` トレイトを組み立てる — 読み API',
                  slug: 'revm-database-buildup-ja',
                  type: 'CONTENT',
                  sortOrder: 9,
                  duration: 10,
                  xpReward: 25,
                  content: `# \`Database\` トレイトを組み立てる — 読み API

Revm は「実行エンジン」ですが、**状態（State）を持っていません。** ストレージ読み込みは外部の \`Database\` トレイト経由で行います — これを実装すれば、Revm を何にでも繋げられる: インメモリ Map、フォークしたメインネット、独自 MDBX スキーマ、リモートノード網。

このレッスンは、最も素朴なスケッチからこのトレイトを積み上げます。終わりにはこれの全ピースを自分で組み立てたことになります:

\`\`\`rust
#[auto_impl(&mut, Box)]
pub trait Database {
    type Error: DBErrorMarker;
    fn basic(&mut self, address: Address) -> Result<Option<AccountInfo>, Self::Error>;
    fn code_by_hash(&mut self, code_hash: B256) -> Result<Bytecode, Self::Error>;
    fn storage(&mut self, address: Address, index: StorageKey)
        -> Result<StorageValue, Self::Error>;
    fn block_hash(&mut self, number: u64) -> Result<B256, Self::Error>;
}
\`\`\`

> 📂 **別タブで \`bluealloy/revm\` を開いてください。** 各ステップで照合します。

## ステップ 0 — 素朴な Revm: 状態を内部に持つ

何も考えずに書くと、Revm が状態を内部に持つ形:

\`\`\`rust
pub struct Revm {
    stack: Vec<U256>,
    storage: HashMap<(Address, U256), U256>,
    accounts: HashMap<Address, AccountInfo>,
    // ...
}
\`\`\`

インタープリターが \`self.storage.get(...)\` を直接呼ぶ。シンプル。おもちゃとしては動く。

> 🛑 **予測。** スクロールせずに: この素朴な設計が *扱えない* 本番シナリオを3つ挙げてください。（ヒント: 各々が *別種の* 状態ソース。）

3つ:

1. **フォークしたメインネット。** 状態はリモート RPC にあって、あなたの \`HashMap\` の中ではない。
2. **本番の MDBX バックエンド。** 本物の Reth ノードはディスク上の MDBX を使っていて、インメモリ Map ではない。
3. **独自スキーマ。** あなたのアプリチェーンはスパースなマークルストア、リモートシャード網、なんでもありえる。

それぞれ状態を *取りに行く* コードが違う。Revm を3通りにフォークしたくない。

## ステップ 1 — 状態をトレイトの後ろに押し出す

何かのトレイトを定義して、Revm が状態に必要とすることを *記述する* — ストレージを所有せずに:

\`\`\`rust
pub trait Database {
    fn storage(&mut self, address: Address, key: U256) -> U256;
    fn balance(&mut self, address: Address) -> U256;
    fn code(&mut self, address: Address) -> Vec<u8>;
    fn block_hash(&mut self, number: u64) -> B256;
}
\`\`\`

これでインタープリターはストレージを所有する代わりに \`db: &mut dyn Database\` を取る。誰でもこのトレイトを実装できる — フォークメインネット実装も、MDBX 実装も、インメモリ実装も、同じソケットに刺さる。

> 🛑 **予測。** なぜ \`&mut self\` で、\`&self\` ではないのか? \`&mut\` が許して \`&self\` が許さないのは何?

**キャッシュ。** 本物の実装（フォークメインネット、RPC バックエンド）は読み込みをキャッシュしたい — \`storage(addr, key)\` の最初の呼び出しはネットワークを叩き、以降の呼び出しはローカルキャッシュから返す。キャッシュの変更には \`&mut self\` が必要。\`&self\` だと各実装が \`RwLock\` か \`RefCell\` でラップする羽目になる — 場合によっては良いが、全体としては税金。デフォルトを \`&mut\` に。（\`&self\` の場合は次レッスンの仲間トレイトでカバー。）

## ステップ 2 — メソッドを正しくグループ化する

素朴なトレイトを見ると: \`balance\` と \`code\` は両方ともアカウントについて聞いているのに、別メソッドになっている。**本当に独立?**

実務では大抵両方欲しい。特にネットワーク実装 — 同じアカウントについて RPC のラウンドトリップを2回したくない。良い形: 1つのメソッドで *両方* 返し、実装に取得方法を任せる。

\`\`\`rust
fn basic(&mut self, address: Address) -> Result<Option<AccountInfo>, Self::Error>;
\`\`\`

\`AccountInfo\` は balance、nonce、code hash を束ねる。**1ラウンドトリップで3つのデータ。** \`Option\` は実装が「そんなアカウントは存在しない」を綺麗にシグナルできるようにする — \`EXTCODEHASH\` が未知アカウントに特殊な意味を持つので便利。

コード本体は別、*ハッシュ* でアドレッシング:

\`\`\`rust
fn code_by_hash(&mut self, code_hash: B256) -> Result<Bytecode, Self::Error>;
\`\`\`

> 🛑 **予測。** なぜ \`code_by_hash\` を \`basic\` から分けるのか? なぜコードはアドレスではなく *ハッシュ* で引くのか?

コントラクトコードは **コンテンツアドレス指定** だから。あるバイトコード（例: 人気の DEX ルーター）は多くのアドレスで共有されている — ハッシュでキャッシュすれば自動的にデデュプ。\`basic\` はハッシュだけ返し、\`code_by_hash\` は実際に実行が必要なときだけバイトを実体化。コンテンツアドレッシングによる遅延ロード。

## ステップ 3 — \`Result\` と関連型 \`Error\` を加える

ネットワーク実装は失敗する。RPC タイムアウト、MDBX が古いロックを返す、Arc が poisoned — **どのメソッドも失敗を許す必要がある。**

\`\`\`rust
fn basic(&mut self, ...) -> Result<Option<AccountInfo>, Self::Error>;
\`\`\`

でも \`Self::Error\` — なぜ固定 enum ではなく関連型?

**Revm にはあなたのエラー形状が分からない** から。RPC エラー、ディスク I/O エラー、ロック poison — 全部形が違う。固定 enum は狭すぎる（実装が本物のエラーを潰す羽目になる）か、広すぎる（Revm が50バリアントを処理する羽目になる）。

\`\`\`rust
type Error: DBErrorMarker;
\`\`\`

\`DBErrorMarker\` は無内容な制約（まともな型ならどれでも自動実装）。目的は: **意図の文書化**（「これは Database が出すエラーの種類です」）と、Revm が後から制約を加える（\`Send\`、\`Sync\` など）ためのフックを残すこと、実装を壊さずに。

> 🛑 **理解度チェック。** 「拡張に開いている」は単なる受け売り。自分の言葉で: \`reqwest\` を使ってフォークメインネット実装を書いていると想像してください。\`Error\` が固定 \`DatabaseError\` enum だと *具体的に* 何が壊れる?

\`reqwest::Error\`、\`serde_json::Error\`、ネットワークタイムアウト、パースエラーを閉じた enum のバリアントに *潰す* 羽目になる — そして *新しい失敗モード* が出るたびに Revm への PR が必要。関連型ならエラーはあなたのもの。

## ステップ 4 — \`#[auto_impl(&mut, Box)]\`

この属性がなければ、同じ転送コードを手書き:

\`\`\`rust
impl<T: Database> Database for &mut T {
    type Error = T::Error;
    fn basic(&mut self, addr: Address) -> Result<Option<AccountInfo>, T::Error> {
        (**self).basic(addr)
    }
    // ... 残り3メソッドも全部同じパターン
}
impl<T: Database> Database for Box<T> { /* ... 同じ4メソッド ... */ }
\`\`\`

12個のメソッド本体が同一の転送ボイラープレート（\`Database\`、\`DatabaseRef\`、\`DatabaseCommit\` の合計）。

\`auto_impl\` はこの転送実装を自動生成する手続きマクロ。\`#[auto_impl(&mut, Box)]\` が付いていれば、\`MyDb\` が \`Database\` を実装していれば、\`&mut MyDb\` も \`Box<MyDb>\` も自動的に \`Database\` を実装する。**ユーザー側のボイラープレートゼロ。**

> 🛑 **予測。** \`Database\` を \`Arc<MyDb>\` でも動かしたい場合は? なぜ \`auto_impl(&mut, Box, Arc)\` で解決しないのか?

直接的には解決しない。\`Arc<T>\` は \`&T\` しか出さない、\`&mut T\` は出さない。\`Database\` のメソッドは \`&mut self\` を取るので、\`Arc<MyDb>\` は \`Database\` を実装できない。**これが設計の分割を強制する** — 次レッスンが解決します: Revm は \`Arc\` のために *仲間の* 読み専用トレイト（\`DatabaseRef\`）を持っています。

## ここまでに組み立てたもの

\`\`\`rust
#[auto_impl(&mut, Box)]
pub trait Database {
    type Error: DBErrorMarker;
    fn basic(&mut self, address: Address) -> Result<Option<AccountInfo>, Self::Error>;
    fn code_by_hash(&mut self, code_hash: B256) -> Result<Bytecode, Self::Error>;
    fn storage(&mut self, address: Address, index: StorageKey)
        -> Result<StorageValue, Self::Error>;
    fn block_hash(&mut self, number: u64) -> Result<B256, Self::Error>;
}
\`\`\`

各ピースが場所代を稼いでいる:

- **\`&mut self\`**（ステップ 1）— \`RefCell\`/\`RwLock\` のオーバーヘッドなしでキャッシュ
- **\`AccountInfo\` を返す \`basic\`**（ステップ 2）— アカウントごとに1ラウンドトリップ
- **\`code_by_hash\`**（ステップ 2）— コンテンツアドレッシング、コントラクト間でデデュプ
- **\`type Error: DBErrorMarker\`**（ステップ 3）— 開いたエラー分類、マーカー制約
- **\`#[auto_impl(&mut, Box)]\`**（ステップ 4）— 自動転送

次レッスン: \`auto_impl\` が *できないこと*（Arc）、Revm が読みと書きをどう分けるか、同じトレイトが 50 行から数千行までどうスケールするかを見せる3つの本物の実装。

## 進む前の想起

スクロールせずに:

1. なぜ \`Database\` は \`&self\` ではなく \`&mut self\` なのか?
2. \`basic\` と \`code_by_hash\` の違いは? なぜ分けるのか?
3. なぜ \`Error\` は固定 enum ではなく関連型なのか?
4. \`#[auto_impl(&mut, Box)]\` は何の手書きを省いてくれるか?

どれか曖昧なら戻る。次のレッスンは読み/書き分離。
`,
                },
                {
                  title: '仲間トレイト・最適化・本物の実装',
                  slug: 'revm-database-companions-ja',
                  type: 'CONTENT',
                  sortOrder: 10,
                  duration: 10,
                  xpReward: 25,
                  content: `# 仲間トレイト・最適化・本物の実装

前のレッスンで \`Database\` を組み立てました。最後にヒントを残しました: \`&mut self\` 要件のせいで \`Arc<MyDb>\` は \`Database\` を実装できない。**このレッスンはそれが OK な理由を説明します** — Revm には仲間の読み専用トレイト、別の書き戻しトレイト、トレイト API の中の性能最適化、そしておもちゃから本番までスケールする3つの実装があります。

## ステップ 1 — \`DatabaseRef\`: 読み専用アクセス

\`\`\`rust
#[auto_impl(&, &mut, Box, Rc, Arc)]
pub trait DatabaseRef {
    type Error: DBErrorMarker;
    fn basic_ref(&self, address: Address) -> Result<Option<AccountInfo>, Self::Error>;
    fn code_by_hash_ref(&self, code_hash: B256) -> Result<Bytecode, Self::Error>;
    fn storage_ref(&self, address: Address, index: StorageKey)
        -> Result<StorageValue, Self::Error>;
    fn block_hash_ref(&self, number: u64) -> Result<B256, Self::Error>;
}
\`\`\`

メソッド4つは \`Database\` と同じ。違いは2つ:

- **\`&mut self\` ではなく \`&self\`。** 内部変更は許されない（\`RwLock\` / \`OnceLock\` などを使わない限り）。
- **\`auto_impl\` のリストが長い** — \`&, &mut, Box, Rc, Arc\`（5種、\`Database\` の2種に対して）。

> 🛑 **予測。** なぜ \`DatabaseRef\` の \`auto_impl\` リストが長いのか? この非対称は何を語っている?

\`&self\` アクセスは \`&mut self\` より *厳密に弱い* 制約だから。\`Arc<T>\` と \`Rc<T>\` は安価で共有可能な \`&T\` を出すが、\`&mut T\` は決して出さない。だから \`DatabaseRef\` はそれらを通じて動くが、\`Database\` は動かない。長いリストは設計上の選択ではなく、機械的な帰結。

パターン: **共有並列アクセスが必要? \`DatabaseRef\` を実装。キャッシュが必要? \`Database\` を実装。両方必要? 両方実装** — Revm には \`WrapDatabaseRef\` のような片方を片方に持ち上げるヘルパーがある。

## ステップ 2 — \`DatabaseCommit\`: 書き戻しを別トレイトに

\`\`\`rust
#[auto_impl(&mut, Box)]
pub trait DatabaseCommit {
    fn commit(&mut self, changes: AddressMap<Account>);
}
\`\`\`

書き戻し用の別トレイト。なぜ?

> 🛑 **予測。** スクロールせずに: なぜ \`commit\` は \`Database\` のもう1つのメソッドではないのか?

理由は2つ:

1. **読み専用 Database が存在する。** フォークメインネット実装は RPC から読むだけで、commit する用事はない — 書き戻すべき本当のバッキングストアがない。\`commit\` の実装を強制すると panic スタブが必要か、嘘のメソッドで型を汚染することになる。
2. **ライフサイクルが違う。** 読みは呼び出しごと、commit はトランザクション終了時。トレイトを分けることでこのライフサイクルを明示し、型システムに強制させる。

Rust の \`std::io\` の \`Read\` と \`Write\` と同じパターン — 1つのトレイトに混ぜたら、すべての読み手が書きについて考えなければならなくなる。

## ステップ 3 — \`storage_by_account_id\`（最適化）

\`Database\` には前のレッスンで見せなかったメソッドがもう1つあります:

\`\`\`rust
#[inline]
fn storage_by_account_id(
    &mut self,
    address: Address,
    account_id: AccountId,
    storage_key: StorageKey,
) -> Result<StorageValue, Self::Error> {
    let _ = account_id;
    self.storage(address, storage_key)
}
\`\`\`

注目: **デフォルト実装** が \`account_id\` を無視して \`storage\` に転送している。このデフォルトが鍵。

> 🛑 **予測。** なぜこのメソッドがそもそも存在するのか? いつデフォルトの「\`account_id\` を無視して \`storage\` にフォールバック」が Revm のニーズを満たさないのか?

**内部のアカウントインデックスを持つ実装** のため — 例えば MDBX バックエンドの Reth では、コールフレームの早い段階でアカウントが内部の数値 ID に解決済み。\`account_id\` を渡せば、ストレージ読み込みごとに冗長なアドレス→アカウント ID 検索を省ける。デフォルトは安全に転送する; *もっと速くできる* 実装はオーバーライドする。

**パフォーマンスがトレイト API の中に存在する**、実装の中だけではなく。素朴な実装（インメモリ）はデフォルトを取って普通に動く。本番実装（MDBX）はオーバーライドして仕事の見返りを得る。

## ステップ 4 — 読むべき3つの本物の実装

同じトレイト、3つの全く違うバックエンド:

| 実装 | 場所 | バッキング | 行数 |
| :--- | :--- | :--- | :--- |
| \`InMemoryDB\` | \`crates/database/src/in_memory_db.rs\` | \`HashMap\` 群 | 約50 |
| \`AlloyDB\` | \`crates/database/src/alloydb.rs\` | ネットワーク経由の JSON-RPC | 約150 |
| \`StateProviderDatabase\` | reth: \`crates/storage/storage-api/src/database_provider.rs\` | MDBX、スパースマークル | 数千 |

> 🔍 **3つ全ての出だしを読んでください。** 型定義と最初のメソッド（\`basic\`）だけ。比較:
> - \`InMemoryDB::basic\` — 直接 \`HashMap::get\`、失敗しない
> - \`AlloyDB::basic\` — 同期 façade に包まれた非同期 RPC 呼び出し、失敗しうる
> - \`StateProviderDatabase::basic\` — MDBX カーソル lookup、失敗しうる
>
> 3つの違う世界、1つのトレイト形。

> 🛑 **理解度チェック。** スクロールせずに: *メインネットをブロック N でフォーク* して任意のトランザクションを上で走らせたい場合、3つのうちどれを選ぶか? なぜ?

\`AlloyDB\`。RPC 経由で状態を遅延取得する — フルアーカイブノードをダウンロードする必要がない。tx が初めてスロットやアカジェントに触れたとき、\`AlloyDB\` は上流ノードに問い合わせ、以降の読み込みはインメモリキャッシュから返る。**フォークメインネットパターンはまさに \`Database\` 周りの150行のグルー。**

## クイズ前の想起

スクロールせずに:

1. なぜ \`DatabaseRef\` の \`auto_impl\` には \`Rc\` と \`Arc\` が含まれていて、\`Database\` には無いのか?
2. なぜ \`commit\` は \`Database\` とは別トレイトなのか?
3. \`storage_by_account_id\` のオーバーライドは MDBX 実装で何を節約するのか?
4. \`InMemoryDB\`、\`AlloyDB\`、\`StateProviderDatabase\` の中で、メインネットフォークに選ぶのはどれ?

次のレッスンはクイズ。曖昧な答えがあるなら今、想起してください。
`,
                },
                {
                  title: 'クイズ: \`Database\` トレイトの形は身についた?',
                  slug: 'revm-database-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 11,
                  duration: 4,
                  xpReward: 25,
                  content: `# クイズ: \`Database\` トレイトの形は身についた?

トレイトの設計判断と読み/書き分離をカバーする4問。前回と同じルール: **クイズはうなずきで通せない。**

2問以上落としたら、ドリルへ進む前に「\`Database\` トレイトを組み立てる」を読み直してください。`,
                  quizQuestions: [
                    {
                      question: "`Database` のメソッドが `&self` ではなく `&mut self` を取るのはなぜですか?",
                      options: [
                        "複数スレッドからの共有並列アクセスを防ぐため。",
                        "実装が内部キャッシュ（例: フォークメインネット実装がネットワーク読み込みの結果をキャッシュする）を RefCell/RwLock のスキャフォールドなしに変更できるようにするため。",
                        "EVM が `Database` メソッド経由で状態を *書く* 必要があるため。",
                        "Rust の制約 — `&self` トレイトは `dyn` 互換にできないため。",
                      ],
                      correctIndex: 1,
                      explanation: "`&mut self` で実装はキャッシュを直接変更できる。ネットワーク実装は呼び出し間で RPC 結果をキャッシュしたい; `&self` だと内部可変性スキャフォールド（RwLock/RefCell）を強制する。本当に共有 `&self` アクセスが必要なユーザー（Arc ラップ、並列タスク）には、Revm は仲間トレイト `DatabaseRef` を提供している — 意図的な設計分割。",
                    },
                    {
                      question: "`Error` がマーカートレイト `DBErrorMarker` で制約された関連型なのはなぜですか?",
                      options: [
                        "拡張に開いた接点: 各実装が独自のエラー型を選べるが、Revm は後からマーカー経由で制約（Send、Sync）を厳しくでき、実装を壊さない。",
                        "Rust の制約 — トレイトはジェネリックメソッドを持てないため。",
                        "マーカーは無内容な制約; 設計上の目的は無い。",
                        "古い Revm API の後方互換シム。",
                      ],
                      correctIndex: 0,
                      explanation: "固定 `enum DatabaseError` だと、`reqwest::Error`、`serde_json::Error`、MDBX エラーなどを閉じたバリアントに潰す羽目になる — そして新しい失敗モードが必要なたびに Revm への PR が必要。関連型ならあなたのエラーはあなたのもの。マーカートレイトは Revm が *制約を厳しくする* ための場所を残す、実装を壊さずに。",
                    },
                    {
                      question: "`auto_impl` のリストが `DatabaseRef`（`&, &mut, Box, Rc, Arc`）の方が `Database`（`&mut, Box`）より長いのはなぜですか?",
                      options: [
                        "`Rc` と `Arc` はスレッドセーフではないため、`Database` を実装できない。",
                        "`DatabaseRef` の方が古いため、リストが時間とともに伸びた。",
                        "`Rc<T>` と `Arc<T>` は共有 `&T` アクセスを提供するが `&mut T` は提供できない。`DatabaseRef` のメソッドは `&self` を取るので Rc/Arc 経由で動くが、`Database` の `&mut self` メソッドは動かない。",
                        "`DatabaseRef` は `Send + Sync` を要求するが、`Database` は要求しない。",
                      ],
                      correctIndex: 2,
                      explanation: "様式ではなく機械的な帰結。`Arc<T>` は `&T` しか出さない。だから `&self` のみのトレイトは `Arc` 経由で動くが、`&mut self` のトレイトは動かない。長いリストは `DatabaseRef` の読み専用メソッドの帰結 — トレイト自体の設計上の選択ではない。",
                    },
                    {
                      question: "`InMemoryDB`、`AlloyDB`、`StateProviderDatabase` の中で、「メインネットをブロック N でフォークして任意のトランザクションを走らせる」用途に正しいのはどれですか?",
                      options: [
                        "`InMemoryDB` — メインネットの全状態を RAM に事前ロード。",
                        "`AlloyDB` — JSON-RPC 経由で状態を遅延取得; 上流ノードが正典。",
                        "`StateProviderDatabase` — 直接 MDBX アクセスにはローカルにフル Reth アーカイブが必要。",
                        "どれでも同じ — 互換的。",
                      ],
                      correctIndex: 1,
                      explanation: "`AlloyDB` がこの用途のために作られている — EVM が触れるたびに上流 RPC に状態スロットやアカウントを問い合わせ、キャッシュする。`InMemoryDB` だとメインネット全体の事前ロードが必要（非実用的）。`StateProviderDatabase` には実 Reth ノードを伴うローカル MDBX が必要。",
                    },
                  ],
                },
                {
                  title: 'ドリル: \`ZeroDb\` を実装して Revm の状態読みを観測する',
                  slug: 'revm-database-drill-ja',
                  type: 'CONTENT',
                  sortOrder: 12,
                  duration: 12,
                  xpReward: 25,
                  content: `# ドリル: \`ZeroDb\` を実装して Revm の状態読みを観測する

読むのはリハーサル。**実装するのが記憶。** このドリルは「\`Database\` トレイトを説明できる」から「自分で実装して、それに対して EVM が走るのを観察した」までを連れて行きます。

## 目標

「残高ゼロ・コードなし・スロット 0」を返すだけの \`Database\` 実装:

\`\`\`rust
struct ZeroDb;

impl Database for ZeroDb {
    type Error = std::convert::Infallible;

    fn basic(&mut self, _: Address) -> Result<Option<AccountInfo>, Self::Error> {
        Ok(Some(AccountInfo::default()))
    }
    fn code_by_hash(&mut self, _: B256) -> Result<Bytecode, Self::Error> {
        Ok(Bytecode::default())
    }
    fn storage(&mut self, _: Address, _: StorageKey) -> Result<StorageValue, Self::Error> {
        Ok(StorageValue::ZERO)
    }
    fn block_hash(&mut self, _: u64) -> Result<B256, Self::Error> {
        Ok(B256::ZERO)
    }
}
\`\`\`

\`type Error = std::convert::Infallible\` — 文字通り失敗できない。すべての呼び出しが \`Ok(...)\` を返す。\`Infallible\` は「これはエラーを起こさない」を表す慣用型。

## ドリル 1 — 繋ぐ前に予測

> 🛑 **質問（スクロールする前に答えを書き留めて）:** 以下の各 EVM 操作が \`ZeroDb\` に対して走ります。何が起きる?
>
> 1. 任意のアドレスへの \`BALANCE\`。
> 2. 任意のスロットの \`SLOAD\`。
> 3. 任意のアドレスへの \`EXTCODESIZE\`。
> 4. コードのないアドレスへの 0 ETH 転送 \`CALL\`。
> 5. 任意のブロック番号 \`N\` への \`BLOCKHASH(N)\`。

答え:

1. **0 を返す。** \`basic\` が \`AccountInfo::default()\`（残高 0）を返す。
2. **0 を返す。** \`storage\` が \`U256::ZERO\` を返す — Ethereum の新規スロットと同じ。
3. **0 を返す。** \`code_by_hash\` が空の \`Bytecode\`（長さ 0）を返す。
4. **実行なしで成功。** コードのない EOA への \`CALL\` は有効な Ethereum 操作 — 値を転送（ここではゼロ）して return。**revert はしない。**
5. **\`B256::ZERO\` を返す。** テストのプレースホルダーとして有用。

どれか間違えたら、\`Database\` × EVM セマンティクスのメンタルモデルに再パスが必要 — 組み立てレッスンを読み直してからドリルを続けてください。

## ドリル 2 — \`ZeroDb\` を Revm に繋いで 1-tx ブロックを実行

ワンショットの \`examples/zero_db_drill.rs\` を書く（または Revm の既存テストハーネスを使う）:

\`\`\`rust
use revm::{database_interface::Database, Evm, primitives::*};

fn main() {
    let mut evm = Evm::builder()
        .with_db(ZeroDb)
        .build();

    // PUSH1 0x42 PUSH1 0x00 SSTORE STOP
    // 0x42 を push、0x00 を push、スロット 0 に 0x42 を書き込み、stop。
    let bytecode = hex::decode("604260005500").unwrap();

    let result = evm.transact(&bytecode);
    println!("{:?}", result);
}
\`\`\`

> 🛑 **予測。** このトランザクションは \`ZeroDb\` に対して成功する?

成功します。\`SSTORE\` は *書き* で、読みではない — そして \`Database\` は書きを見ない（書きは \`DatabaseCommit\` 経由で、これは意図的に実装していない）。スロットの既存値は \`storage\`（0 を返す、問題なし）で読まれる。新値 0x42 は Revm のジャーナリング層にステージされ、\`ZeroDb\` には届かない。tx は無事 commit。

## ドリル 3 — 読みが起きるのを観察する

\`ZeroDb\` に \`println!\` を追加:

\`\`\`rust
fn basic(&mut self, addr: Address) -> Result<Option<AccountInfo>, Self::Error> {
    println!("[ZeroDb] basic({addr})");
    Ok(Some(AccountInfo::default()))
}
fn storage(&mut self, addr: Address, key: StorageKey) -> Result<StorageValue, Self::Error> {
    println!("[ZeroDb] storage({addr}, {key})");
    Ok(StorageValue::ZERO)
}
// ... code_by_hash と block_hash も同じパターン
\`\`\`

再実行。**Revm が必要とする読みが正確に見える** — そしてそれ *だけ*。幻のクエリなし。先取りの状態ロードなし。遅延、オンデマンド、正確。

> 🔧 **質問:** 何種類のメソッド呼び出しを観測した? どのメソッド? どのキーで?

正確な答えはバイトコードとハーネス次第ですが、\`PUSH1 0x42 PUSH1 0x00 SSTORE STOP\` ならこんな感じ:

- 送信者の nonce/残高検証で \`basic(tx.from)\` 1回
- SSTORE 返金会計のためのスロット読み込みで \`storage(tx.to, 0)\` 1回

読み込み2回。それで全部。**これで Revm 周りのハーネス全体が見えた — 他の Database はこれに本物のデータを足しただけ。**

## ドリル 4 — 失敗させる（オプション、難）

\`Infallible\` をカスタムエラー型に置き換え、特定のキーで \`storage\` が \`Err(...)\` を返すようにする:

\`\`\`rust
#[derive(Debug)]
struct DbErr(String);
impl revm::database_interface::DBErrorMarker for DbErr {}

struct PickyDb;

impl Database for PickyDb {
    type Error = DbErr;
    // basic、code_by_hash、block_hash はすべて Ok(...)
    fn storage(&mut self, _: Address, key: StorageKey) -> Result<StorageValue, Self::Error> {
        if key == StorageKey::from(13u64) {
            Err(DbErr("slot 13 is unlucky".into()))
        } else {
            Ok(StorageValue::ZERO)
        }
    }
    // ... 残り
}
\`\`\`

\`SLOAD(13)\` を行う tx を実行。**Revm はどうする?**（ヒント: revert *ではない* — 別カテゴリの失敗。）

tx は「致命的な外部エラー」として中断する — revert とは別物。Revert は *コンセンサス*、Database エラーは *インフラ*。Revm は \`Self::Error\` を呼び出し元に bubble up し、revert に変換しない。これにより、ハーネスがリトライ・ログ・伝播のどれを選ぶか決められる。**だから \`Error\` はあなたの型で、Revm の型ではない。**

## レッスン終了の想起

スクロールせずに、自分の言葉で:

1. なぜ \`ZeroDb::basic\` は \`Ok(None)\` ではなく \`Ok(Some(AccountInfo::default()))\` を返すのか?
2. ドリル 2 で \`SSTORE\` が *書き* のために \`ZeroDb\` のメソッドを呼ばなかったのはなぜか?
3. tx の revert と \`Database::Error\` が bubble up するのとの違いは?

どれか曖昧なら、レッスンはまだあなたを離しません。ドリルをやり直すか、組み立てレッスンを読み直し。

このドリルの後、Revm がどう状態を取るかの動くメンタルモデルがあります — 他のすべての Database はこの \`ZeroDb\` に本物のデータが乗っただけ。次モジュール: Reth が実行をどうフルシンクパイプラインに配線するか。`,
                },
              ],
            },
          },
          {
            title: 'Reth — 実行ループに割り込む',
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: 'Staged Sync — Rethのアーキテクチャ',
                  slug: 'staged-sync-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 12,
                  xpReward: 25,
                  content: `# Staged Sync — Rethのアーキテクチャ

Staged SyncはRethの背骨です。「1ブロックずつ処理」ではなく、同期を複数のステージに分割し、各ステージがブロック範囲に対して動く設計。各ステージは1つのトレイトを実装したRust型です。トレイトを読めば、アーキテクチャを読んだことになる。

> 🛑 **スクロールする前に予測。** 「genesis から 2000 万ブロック同期せよ」と言われたら、**あなたなら** どんなステージに分けますか?
>
> 既存実装の名前ではなく、第一原理から 5〜7 個のステージを書き出してください。何を最初に走らせる? 並列化できるのは何? 前段の出力に依存するのは何?
>
> 正解する必要はありません。Paradigm の答えを見る前に、自分の意見を持つことが目的。

## 本物の \`Stage\` トレイト

[\`crates/stages/api/src/stage.rs\`](https://github.com/paradigmxyz/reth/blob/main/crates/stages/api/src/stage.rs) より：

\`\`\`rust
#[auto_impl::auto_impl(Box)]
pub trait Stage<Provider>: Send {
    fn id(&self) -> StageId;

    fn poll_execute_ready(
        &mut self,
        _cx: &mut Context<'_>,
        _input: ExecInput,
    ) -> Poll<Result<(), StageError>> {
        Poll::Ready(Ok(()))
    }

    fn execute(&mut self, provider: &Provider, input: ExecInput) -> Result<ExecOutput, StageError>;

    fn post_execute_commit(&mut self) -> Result<(), StageError> {
        Ok(())
    }

    fn unwind(
        &mut self,
        provider: &Provider,
        input: UnwindInput,
    ) -> Result<UnwindOutput, StageError>;

    fn post_unwind_commit(&mut self) -> Result<(), StageError> {
        Ok(())
    }
}
\`\`\`

**対称性に注目**：すべてのステージが \`execute\` と \`unwind\` の両方を持つ。

> 🛑 **\`unwind\` がなかったら、Reth はどうやって reorg を扱うのか?** スクロール前に代替アーキテクチャを予測。「unwind なし」設計に必要な追加コードパスは何か? — 答えはとても汚い。

reorgは特殊ケースではなく **通常運用**。前進＝範囲に対して \`execute\`、後退＝範囲に対して \`unwind\`。**同じトレイトで2方向。** だから Reth は「reorg 専用パス」がコードベースの半分を食う事態にならない。

## 入出力型

\`\`\`rust
#[derive(Debug, Default, PartialEq, Eq, Clone, Copy)]
pub struct ExecInput {
    pub target: Option<BlockNumber>,
    pub checkpoint: Option<StageCheckpoint>,
}

#[derive(Debug, PartialEq, Eq, Clone)]
pub struct ExecOutput {
    pub checkpoint: StageCheckpoint,
    pub done: bool,
}

#[derive(Debug, Default, PartialEq, Eq, Clone, Copy)]
pub struct UnwindInput {
    pub checkpoint: StageCheckpoint,
    pub unwind_to: BlockNumber,
    pub bad_block: Option<BlockNumber>,
}
\`\`\`

| フィールド | 役割 |
| :--- | :--- |
| \`ExecInput.target\` | 「このブロックまで処理して」 — オーケストレータがバッチサイズを決定 |
| \`ExecInput.checkpoint\` | 「前回ここで止まった」 — ディスクから再開 |
| \`ExecOutput.done\` | \`false\` =「まだやることがある、また呼んで」 — オーケストレータに backpressure 制御を返す |
| \`UnwindInput.bad_block\` | reorgが特定のbad blockで起きた場合、ステージにそれを渡す |

これが **明示的に再開可能** な設計。ノード再起動時に前回の続きから正確に始まる。「最初から走査しなおす」ハックは不要。

> 🛑 **理解度チェック。** \`done\` が \`ExecOutput\` の中のフラグとして返されるのはなぜ? \`has_more()\` のような別メソッドではなく? その設計選択がどんな制約に応えているか? (ヒント: オーケストレータがステージをどうスケジュールするか考える。)

## \`#[auto_impl(Box)]\` のメリット

オーケストレータはステージを \`Box<dyn Stage<...>>\` で保持し、ヘテロなリストを持てる。\`auto_impl\` がなければ手動で全メソッドをbox越しに転送する必要がある。

## 実際のステージ群

Rethのステージパイプライン（\`crates/stages/stages/src/stages/\`）：

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

1. **\`HeaderStage\`** — ヘッダー取得
2. **\`BodyStage\`** — トランザクション本体取得
3. **\`SenderRecoveryStage\`** — ECDSAでアドレス復元（大規模並列）
4. **\`ExecutionStage\`** — Revmで実行、状態変更を蓄積
5. **\`AccountHashingStage\`** — ハッシュ化アカウント変更をソート
6. **\`StorageHashingStage\`** — ハッシュ化ストレージ変更をソート
7. **\`MerkleStage\`** — Merkle Patricia Trie ルートを更新
8. **\`TransactionLookupStage\`** — txhash → (block, index) インデックス
9. **\`IndexAccountHistoryStage\`** + **\`IndexStorageHistoryStage\`** — 履歴アクセスインデックス
10. **\`FinishStage\`** — 確定処理

> 🛑 **予想と比較。** どのステージが抜けていた? 予想にあって **ここに無い** ものは何? **興味深いのは2問目** — Paradigm の "省いたもの" は "入れたもの" より雄弁なことが多い。

> 🔍 **\`MerkleStage\` がハッシング後で、間に挟まれていないのはなぜ?** どんな順序制約が守られている? (ヒント: Merkle ルート計算には葉のソートが必要。それがハッシングのステージ分けに何を強いるか?)

> 🔍 **\`AccountHashingStage\` と \`StorageHashingStage\` は並列実行できる?** どちらも \`ExecutionStage\` から似た入力を取る。yes/no を予測 → 1つ開いて検証。

## 練習

\`reth\` リポジトリで \`crates/stages/stages/src/stages/sender_recovery.rs\` を開く：

> 🛑 **開く前に予測。** \`SenderRecoveryStage::execute\` は何をする? 一文で。中の "計算" は? その周りの "I/O" は? 文を保持して。

1. \`execute\` メソッドを探す
2. **バッチループ** を見つける — 一度に全部ではなくチャンクで処理。**なぜチャンクで? なぜ 1 ブロックずつでも全ブロック一度でもダメなのか?**
3. \`done: false\` と \`done: true\` を返す箇所 — どんな条件で切り替わる?
4. 並列化に注目 — \`SenderRecoveryStage\` はRayonでCPUコアを使い倒す。**なぜ sender 復元が並列化で最も得をするステージなのか?**

これで Paradigm が Reth を同期させているのと **同じコード** を読めるようになりました。

> 最終チェック: なぜ Staged Sync はブロック単位の同期より速いのか、一文で。「並列化」と答えたら深掘り — 具体的に何がバッチ化・ソート・償却されている? 3 つ挙げられないうちは、このレッスンはまだあなたを離しません。

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
                  title: 'Rust：ライフタイム・Box・Arc・dyn Trait',
                  slug: 'rust-lifetimes-arc-dyn-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
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
                  title: 'ExEx — Execution Extensions',
                  slug: 'reth-exex-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 15,
                  xpReward: 30,
                  content: `# ExEx — Execution Extensions

**ExEx** は、Rethが提供する「実行ループにRustコードを注入する」仕組みです。これでノード速度のインデクサ・MEVボット・リアルタイムリスクエンジンを **チェーン本体と同じプロセス内で** 構築できます。

> 🛑 **スクロールする前に予測。** Reth は新しいブロックごとにあなたのコードに知らせる必要があります。**API をスケッチしてください。** Reth はコミットごとに何を送る? reorg では? あなたのコードは「ブロック N まで終わった、prune して OK」をどう Reth に伝える? 予測を保持して。

\`\`\`mermaid
flowchart LR
    subgraph Reth
        Sync[Sync] --> Exec[ExecutionStage]
        Exec --> Commit[Chain commit]
    end
    Commit -->|notification| ExEx[あなたの ExEx]
    ExEx -->|FinishedHeight| Prune[Reth pruner]
\`\`\`

チェーンが実行 → コミットされた各ブロック（reorg / revert も）の通知が ExEx の stream にプッシュされる → 処理して "ここまで終わった" 高さを返す → Reth が古い履歴を安全に prune できる。

## 最小ExEx — 一字一句そのまま

これは [\`paradigmxyz/reth-exex-examples/minimal\`](https://github.com/paradigmxyz/reth-exex-examples/tree/main/minimal) の \`main.rs\` 全体：

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

これで本番形のExExが動きます。約40行。

> 🛑 **止まる。スクロールせずに、このコードが扱う 3 種類の通知タイプを挙げてください。** なぜ 3 つすべてを扱う? 3 つのうち 2 つの match アームを削除したら何が起きる?

## 詳細に読む

### \`exex_init\` と \`exex\` の2段構え

\`\`\`rust
async fn exex_init<Node: FullNodeComponents>(
    ctx: ExExContext<Node>,
) -> eyre::Result<impl Future<Output = eyre::Result<()>>> {
    Ok(exex(ctx))
}
\`\`\`

Rethは起動時に \`exex_init\` を1度呼び、**永続的にpollされるFuture** を返すことを期待します。2段にすることで、長時間ループの開始前に **同期的セットアップ**（ファイル開放、状態準備）ができます。

> 🛑 **予測。** init/run の分割が必要なのはなぜ? ファイル開放を \`exex\`（長時間ループ）の中に入れると、どんな具体的なバグが発生する?

### 通知ストリーム

\`\`\`rust
while let Some(notification) = ctx.notifications.try_next().await? {
\`\`\`

\`ctx.notifications\` は Stream — \`try_next\` は \`Result<Option<ExExNotification>>\` を返します。ノード停止やエラー時にループはきれいに抜ける。

### 3つの通知タイプ

\`\`\`rust
ExExNotification::ChainCommitted { new }       // canonicalブロック追加
ExExNotification::ChainReorged { old, new }    // reorg：oldがnewに置換
ExExNotification::ChainReverted { old }        // 削除（置換なし）
\`\`\`

正しいExExは **3つすべてを処理** します。\`ChainCommitted\` だけ聞く naive 実装は、reorg のたびに導出状態を静かに壊します。**これがExExの#1バグ**。

> 🛑 **理解度チェック。** トランザクションを HashMap にインデックスしている。\`ChainCommitted\` だけ扱う。チェーンが 5 ブロック深く reorg した。**HashMap の何がおかしくなる?** 失敗モードを 2 文で具体的に書いてください。それから問う: \`ChainReverted\` はどう救うのか?

### \`FinishedHeight\` イベント

\`\`\`rust
if let Some(committed_chain) = notification.committed_chain() {
    ctx.events.send(ExExEvent::FinishedHeight(committed_chain.tip().num_hash()))?;
}
\`\`\`

これがRethに「このブロックハッシュまで処理したから、それより古い履歴は私には不要」と伝えます。送らないと **Rethは何も捨てられない**（ExExが何を読みたいか分からないから）。

> 🛑 **ディスク帰結を予測。** \`FinishedHeight\` イベントなしで ExEx をリリースしたとする。半年後、ノードはブロック 21M。**ExEx なしのノードと比較してディスク使用量はどうなる?** なぜ?

### \`install_exex\`

\`\`\`rust
.install_exex("Minimal", exex_init)
\`\`\`

第1引数は名前（メトリクスとログで使われる）、第2引数は init 関数。\`.install_exex(...)\` を複数チェインできる — 各ExExが独立した通知ストリームを持ちます。

## 本物のExExは何をやっているか

同じリポジトリにより本格的な例があります。\`minimal\` を動かしたら次に読む：

| 例 | 内容 |
| :--- | :--- |
| \`backfill\` | 起動時に過去ブロックを自分のハンドラに再生 |
| \`in_memory_state\` | 各ブロックから派生したカスタムインデックス状態を保持 |
| \`tracking-state\` | ExEx内部状態を別DBに永続化（再起動が安い） |
| \`rollup\` | ExExフックだけで最小ロールアップを実装 |

> 🔍 **\`rollup\` を開いてください。** state 変更をコミットしている箇所まで読む。**ExEx としてのロールアップ — その意味を一瞬考えてみてください。** これがアーキテクチャ的なアンロックです。

## 練習

1. \`reth-exex-examples\` を clone、同期済みノードに対して \`minimal\` を実行
2. \`ChainCommitted\` アームを修正し、各ブロックの **トランザクション数** を出力：\`new.tip().body.transactions.len()\`
3. \`HashMap<Address, u64>\` を追加し、各アドレスが何txを送ったかカウント — reorgを正しく扱う（\`ChainReverted\` で減算、\`ChainCommitted\` で新チェーンを再加算）

これが動けば、ノード速度のインデクサを書けたことになります。

> 最終チェック: ExEx ベースのインデクサは、なぜ別プロセスで RPC をポーリングするインデクサより速いのか、一文で。答えに「同一プロセス」または「I/O ラウンドトリップなし」が含まれないなら、アーキテクチャ的な理由を取り逃しています — 図を読み直し。`,
                },
                {
                  title: 'Reth SDK — App-chainを作る',
                  slug: 'reth-sdk-appchain-ja',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 12,
                  xpReward: 25,
                  content: `# Reth SDK — App-chainを作る

ExExは既存のEthereumノードを拡張しますが、Reth SDKは **コンポーネントを組み立てて自前のApp-chain** をRustで構築できる仕組み。これが「purpose-built EVM L1」が thesis から **コンパイル可能なバイナリ** になるレッスン。

> 🛑 **スクロールする前に予測。** あなたが Tempo（payments 特化型 L1）を作るとして、Reth のどのコンポーネントを差し替える必要がある? どれはそのまま使える? 例を読む前に 3〜4 個の swap をリストアップ。

## 本物のカスタムノード main.rs — 一字一句そのまま

[\`paradigmxyz/reth/examples/custom-node-components/src/main.rs\`](https://github.com/paradigmxyz/reth/tree/main/examples/custom-node-components) より：

\`\`\`rust
use reth_ethereum::{
    chainspec::ChainSpec,
    cli::interface::Cli,
    evm::primitives::ConfigureEvm,
    node::{
        api::{FullNodeTypes, NodeTypes},
        builder::{components::PoolBuilder, BuilderContext},
        node::EthereumAddOns,
        EthereumNode,
    },
    pool::{
        blobstore::InMemoryBlobStore, CoinbaseTipOrdering, EthTransactionPool, Pool, PoolConfig,
        TransactionValidationTaskExecutor,
    },
    provider::CanonStateSubscriptions,
    EthPrimitives,
};

fn main() {
    Cli::parse_args()
        .run(async move |builder, _| {
            let handle = builder
                .with_types::<EthereumNode>()
                .with_components(EthereumNode::components().pool(CustomPoolBuilder::default()))
                .with_add_ons(EthereumAddOns::default())
                .launch()
                .await?;

            handle.wait_for_node_exit().await
        })
        .unwrap();
}
\`\`\`

これが動くチェーンバイナリ。約 30 行。

> 🛑 **止まる。スクロールせずに、4 つのチェーン呼び出し** (\`with_types\`, \`with_components\`, \`with_add_ons\`, \`launch\`) **を挙げてください。** それぞれが何を決めている? 予想を保持 — 下で答え合わせ。

チェーン内の4つの呼び出しを読み解く：

### \`.with_types::<EthereumNode>()\`
**型バンドル** を選択 — chain spec、primitives（block・tx・header型）、engine API。\`EthereumNode\` がデフォルトを提供；\`OpNode\`、独自型、任意の \`NodeTypes\` impl に置換可能。

### \`.with_components(...)\`
カスタマイズの中核。基本セット（\`EthereumNode::components()\`）を取って各ビルダーを上書きする：

- \`.pool(CustomPoolBuilder::default())\` — カスタムトランザクションプール（例ではこれ）
- \`.network(...)\` — カスタムP2P
- \`.payload(...)\` — カスタムブロックビルダー
- \`.executor(...)\` — カスタムEVMエグゼキュータ（カスタムOpcode/precompileがここに入る）
- \`.consensus(...)\` — カスタムコンセンサス

> 🛑 **理解度チェック。** 上のコンポーネントから *1 つ* 選ぶ。差し替えるために実装するトレイトをスケッチしてください。(メソッドシグネチャだけで OK、本物の impl は不要。) 書けないなら、カスタマイズポイントをまだ「見えて」いません — そのビルダーのソースを開いてから次へ。

### \`.with_add_ons(...)\`
RPCネームスペース、engine API拡張、ExExインストール。\`EthereumAddOns::default()\` で標準Ethereum RPC；ここに \`.install_exex(...)\` をチェインできる。

### \`.launch()\`
全部起動：MDBXを開き、P2P開始、ステージ用Tokioタスクをspawn、RPCを公開。\`NodeHandle\` が返り、\`wait_for_node_exit\` で待てる。

\`\`\`mermaid
flowchart TB
    Builder[Cli builder] --> Types[".with_types EthereumNode"]
    Types --> Comps[".with_components"]
    Comps --> Pool["pool — txプール"]
    Comps --> Net["network — P2P"]
    Comps --> Exec["executor — EVM/opcode/ガス"]
    Comps --> Cons["consensus — PoS / HyperBFT 等"]
    Comps --> Payload["payload — ブロック構築"]
    Comps --> AddOns[".with_add_ons — RPC + ExEx"]
    AddOns --> Launch[".launch — あなたのチェーン"]
\`\`\`

## カスタマイズで何が変わるか

| コンポーネント | 変えられること |
| :--- | :--- |
| \`with_types\` | block/tx 構造、header レイアウト、chain ID セマンティクス |
| \`with_components.executor\` | **EVM** — カスタムOpcode（レッスン2）、カスタムprecompile（Expert）、カスタムガス |
| \`with_components.consensus\` | PoS → HyperBFT、PoA、Tendermint、何でも |
| \`with_components.pool\` | 優先レーン（Tempo方式）、独自tx admission ルール |
| \`with_components.payload\` | カスタムブロック構築（例：MEV-aware ordering） |
| \`with_components.network\` | プライベートサブネット、ピアポリシー |
| \`with_add_ons\` | カスタムJSON-RPC、ExExインストール |

## 本番採用例

> 🛑 **読む前に予測。** 各チェーンが Reth のどのコンポーネントを差し替えているか、3 つすべてに対して推測：
> - **Hyperliquid HyperEVM**
> - **Tempo**
> - **Berachain (bera-reth)**
>
> その後、下で確認。

- **Hyperliquid HyperEVM** — HyperBFT + カスタム実行 + オーダーブック直結DB
- **Tempo** — 支払い特化の優先レーン
- **Berachain (bera-reth)** — Proof of Liquidity コンセンサス

これらは1つ以上の \`with_components\` ビルダーを自前のものに差し替えています。上記の枠組みが彼らの拡張ベース。**予想と比較** — 当たったのは何? 意外だったのは何?

## 練習

1. \`reth\` をclone、\`cd examples/custom-node-components\`
2. \`CustomPoolBuilder\` を読む — \`PoolBuilder\` をどう実装してプールを差し替えているか
3. **プールに入る各トランザクションのガス価格をログ出力** するように変更
4. dev chain に対して \`cargo run\`。カスタムログが発火するのを観察

これで1行のコンポーネント差し替えで動くものを出せました。同じパターンをconsensusやexecutorに拡大すればHyperEVMクラスのインフラ。

> 最終チェック: なぜ Reth SDK のコンポーネントビルダーパターンが、コードベース全体を fork するより purpose-built L1 のリリースに有用なのか、一文で。答えに「変更する部分だけ自分のものにする」(you only own the parts you change) という意味の一節がないなら、\`with_components\` を読み直し — それがアーキテクチャ全体のアイデア。

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
                  sortOrder: 4,
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
                  title: 'Advancedまとめクイズ',
                  slug: 'advanced-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 5,
                  duration: 12,
                  xpReward: 35,
                  content: `# Advancedまとめクイズ

Revm内部・ExEx・Reth SDKの理解度を確認します。`,
                  quizQuestions: [
                    {
                      question: 'Revm の `crates/interpreter` の責務として正しいものは？',
                      options: [
                        'EVM の型システムプリミティブ（Address・U256・B256）の定義',
                        'EVM の各 Opcode を Rust で実装している',
                        'Database トレイトと state-supply インターフェースを保持する',
                        '命令ディスパッチテーブルを実行時に構築する',
                      ],
                      correctIndex: 1,
                      explanation: 'crates/interpreter は ADD・MUL・PUSH・JUMP・SLOAD・SSTORE 等の各 Opcode 実装を持ちます。(Primitives は crates/primitives。Database トレイトは crates/database-interface。ディスパッチテーブルはコンパイル時構築、実行時ではない。) 実行時ディスパッチと答えたなら、カスタム Opcode のレッスンを再読してください。',
                    },
                    {
                      question: 'Revm ベースの fork に「カスタム Opcode を追加する」ことで実際にできることは？',
                      options: [
                        '標準 Opcode（ADD など）の計算結果をすべてのクライアントで上書きする',
                        '自前のチェーンで 1 命令の高速ショートカットを提供 — メインネットとはコンセンサス非互換',
                        'メインネット上の任意の Solidity コントラクトから固定アドレスで呼べる precompile を追加する',
                        'fork なしで同じ Opcode のガスコストを下げる',
                      ],
                      correctIndex: 1,
                      explanation: 'カスタム Opcode は未割当バイト（例: 0x0C）を占有。メインネットはこの Opcode を知らないので、それを使うブロックは go-ethereum で再生不能。ショートカットは *自前 fork 内で* 本物。precompile は別の仕組み（予約アドレス、新 Opcode バイトではない）。コンセンサスを fork せずにガスコストを下げることはできない。',
                    },
                    {
                      question: 'Revm の `Database` トレイトの主な役割は？',
                      options: [
                        'EVM の状態変更を裏のストレージに書き戻す',
                        'EVM が実行に必要なアカウント情報・コントラクトコード・ストレージスロット・過去のブロックハッシュを供給する',
                        'ガス計算のホットパスを処理する',
                        'Opcode バイトから関数へのディスパッチテーブルを提供する',
                      ],
                      correctIndex: 1,
                      explanation: 'Database は読み取り側の状態供給元。書き込みは DatabaseCommit を経由。ガス計算はインタープリター内部。ディスパッチは命令テーブル。実装を差し替えれば、インメモリデータ、JSON-RPC（フォークメインネット）、本番 MDBX、何でも EVM のバックエンドにできる。',
                    },
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
