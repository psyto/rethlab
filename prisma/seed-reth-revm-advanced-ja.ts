import { PrismaClient } from '@prisma/client';

export async function seedRethRevmAdvancedJA(prisma: PrismaClient) {
  const tags = ['revm', 'rust', 'advanced', 'opcode', 'evm-internals'];

  await prisma.course.create({
    data: {
      slug: 'revm-advanced-ja',
      title: 'Inside Revm — EVMエンジンを読む',
      description:
        'Revmのインタープリターを1行ずつ読み解きます。本物の `add` Opcode、カスタムOpcode、状態を供給する `Database` トレイトを歩く。3つの独立したAdvancedコース（Revm・Reth・Alloy）の最初の一つ — 順番は自由ですが、Revmが提供する型の語彙は他の2つが前提とします。',
      difficulty: 'INTERMEDIATE',
      duration: 120,
      xpReward: 340,
      track: 'revm-advanced',
      tags,
      isPublished: true,
      sortOrder: 210,
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
                  title: 'Inside Revm へようこそ — このコースの読み方',
                  slug: 'revm-advanced-welcome-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 7,
                  xpReward: 15,
                  content: `# Inside Revm へようこそ — このコースの読み方

Revm は Rust 製 EVM クライアント全ての **実行エンジン**です: Reth・Hyperliquid の HyperEVM・Berachain の bera-reth・Tempo。「うちは Revm を使っている」と言うチェーンは、Opcode ループ・ガス会計・状態読み出しの作法 — *全部同じコード* を走らせています。誰のフォークを見ても同じ。一度読めば全てが読めるようになる。

これは RethLab の 3 つの独立した Advanced ティアのコースの最初の 1 つです:

- **Inside Revm**（あなたはここ）— EVM エンジンの内部
- **Inside Reth** — Reth の内部: Staged Sync・ExEx・Reth SDK
- **Inside Alloy** *(近日公開)* — Alloy の内部: Provider・Network・Signer

Revm を最初に置く理由は、その型（\`Address\`・\`U256\`・\`B256\`・\`Database\` トレイト）が Reth と Alloy の多くの部分の前提になるから。ただし 3 コースは独立しているので、構築しているものに合わせて選んで OK。

> 📋 **Advanced ティアは初めて?** *Bridge to Advanced* の最後にある **「Advanced コースの読み方」** を先に読んでください。編集スタイル（Predict プロンプト・クイズゲート・積み上げ→ウォークスルー→クイズ→ドリルのチェーン構造）とペースを説明しています — 3 つの Advanced コース全てに適用される、1 度読めば済む内容です。

## このコースで学ぶこと

[\`bluealloy/revm\`](https://github.com/bluealloy/revm) のソースを 1 行ずつ読みます: \`add\` Opcode とその周りのマクロスタック、カスタム Opcode と命令ディスパッチテーブル、EVM に状態を供給する \`Database\` トレイト。3 つのトピックチェーン、それぞれが積み上げ + ウォークスルー + クイズ + ドリル。

終わりには revm のホットパスの全行を読み、各ピースが何をしているか自分の言葉で説明できるようになっています。

## 前提知識

**EVM 内部**（Bridge to Advanced でカバー — 不安なら戻る）:
- バイトコードと dispatch loop（バイトとしての opcode、PC、命令テーブル）
- スタック / メモリ / calldata / ストレージ — 各々何で、どう違うか
- cold vs warm ガス (EIP-2929)
- コールフレーム: CALL / DELEGATECALL / STATICCALL のセマンティクス
- ブロック構造 (header / body / receipts)、reorg は通常運用

**中級 Rust**（同じく Bridge to Advanced で。Inside Reth 内の *Rust: ライフタイム・Box・Arc・dyn Trait* レッスンが自己チェック用）:
- Generics + trait bounds、\`?Sized\`、\`dyn Trait\` vs \`impl Trait\`
- \`Arc<T>\`、\`Mutex<T>\`、\`RwLock<T>\` — どれをいつ使うか
- \`unsafe\` ブロックと \`unwrap_unchecked()\`
- \`macro_rules!\` 構文 (\`$x:ident\`、\`$($x),*\`、フラグメント specifier)

## セットアップ — 一度だけ

レッスン 1 の前に、別ウィンドウでこれらを準備:

1. **\`bluealloy/revm\` を clone** — \`git clone https://github.com/bluealloy/revm\`
2. **動く \`cargo\` ツールチェイン** — \`rustc --version\` でモダンなバージョンが出ること
3. **\`cargo-expand\`** — \`cargo install cargo-expand\` (Expert の手続きマクロレッスンで欲しくなる)
4. **セカンドモニタか分割端末** — レッスンを読みながらソースを参照する

「Find in repo」プロンプトはリポジトリを実際に開いていなければ機能しません。レッスン 1 を始める前にこのループを閉じておく。

## 準備完了

コース詳細に戻って **「\`add\` をステップで組み立てる：シグネチャと本体」** から始める。

Inside Revm の後: **Inside Reth** で Reth 固有の sync パイプライン + ExEx + SDK へ、または **Inside Alloy**（公開後）へ。`,
                },
                {
                  title: '\`add\` をステップで組み立てる：シグネチャと本体',
                  slug: 'revm-add-buildup-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 8,
                  xpReward: 20,
                  content: `# \`add\` をステップで組み立てる：シグネチャと本体

\`ADD\` は EVM の Opcode の中でいちばん単純な非自明: 数値を2つ pop して、和を push。週末に自作 EVM を書く人なら Rust 5行で済ませる。Revm は **4行** で済ませているが、その4行には型パラメータ2つを持つジェネリックシグネチャ、\`?Sized\` opt-out、スタックアンダーフローガードと分岐予測ヒントへ展開されるマクロ、そして代わりに使うと最初のオーバーフローでクライアントがメインネットから分岐する \`wrapping_add\` が詰まっている。

[\`bluealloy/revm\`](https://github.com/bluealloy/revm) の本物のソース:

\`\`\`rust
pub fn add<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
    popn_top!([op1], op2, context.interpreter);
    *op2 = op1.wrapping_add(*op2);
    Ok(())
}
\`\`\`

1行ずつ読むと、新しい概念が一度に6つ降ってきます。もっと楽な道: **積み上げる。** 一番素朴な \`add\` から始めて、複雑さを1つずつ獲得していく。このレッスンの終わりには、2行目のマクロ以外の全てを自分で組み立てたことになります — マクロは次へ。

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

> 🛑 **予測。** スクロールせずに: このバージョンが本物の \`add\` でわざと避けていることを **2つ** 挙げてください。（ヒント: 1つはシグネチャ、もう1つは本体。）答えを書き留めて、各ステップで照合してください。

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

それぞれスタック/状態の形が少しずつ違う。\`add\` のコピーを6種類書きたくはない。

最初のジェネリック化: \`Host\` トレイト（Rust の trait は共有インターフェース — Java の interface に似ているが、コンパイル時に解決される）に対してジェネリックにする。

\`\`\`rust
pub fn add<H: Host>(host: &mut H) -> Result {
    // ... 本体は同じだが、具象 Vec ではなく H に対して呼ぶ
}
\`\`\`

\`H: Host\` は「\`Host\` トレイトを実装するどんな型でも可」と読みます。1つのソース。**コンパイル時に具象 \`H\` ごとに特殊化されたバイナリが1つ**（Rust の *モノモーフ化* — その型を使う場所ごとにコンパイラが1コピーずつ展開する）。

> 🛑 **予測。** \`<H: Host>\` の落とし穴は何? なぜ revm はここで止まらないのか?

落とし穴は2つ:

1. ホスト型が増えるとモノモーフ化でコンパイル時間が爆発する。
2. **トレイトオブジェクト** \`&mut dyn Host\` を渡せない（\`dyn Trait\` は Rust の実行時ディスパッチのトレイトポインタ。Java のインターフェース参照に相当）。\`<H: Host>\` はコンパイル時にサイズが決まる型しか受け付けない。

なぜトレイトオブジェクトを渡したいのか? 設定フラグや動的なテストハーネスから *実行時* にホストを構築したい場合があるから。トレイトオブジェクトは「具象 \`Host\` 実装が実行時まで分からない — vtable で扱って」とコンパイラに伝える方法。

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

スタック操作は3回。それぞれメモリ書き込みか容量チェック。インタープリターのホットパス（あらゆるトランザクションで Opcode ごとに1回回る内側のループ）はこれを *ブロックあたり数億回* 走らせる — このオーバーヘッドが、競争力のあるスループットとそうでないものの境目。

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

\`crates/interpreter/src/instructions/arithmetic.rs\` を開くと、\`add\`・\`mul\`・\`sub\`・\`div\`・\`mod\`・\`lt\`・\`gt\`・\`eq\`・\`and\`・\`or\`・\`xor\` — 二項 Opcode が 30 個以上並んでいる。**そのどれもが同じ2行のスタック pop ボイラープレートで始まる。** リファクタが叫んでいる状態で、revm はその通りにやった: \`popn_top!\` という1つのマクロが、その2行を全箇所で置き換える。

前のレッスンで、手書きの版をここまで組み立てました:

\`\`\`rust
pub fn add<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
    let op1 = context.interpreter.stack.pop().ok_or(StackUnderflow)?;
    let op2 = context.interpreter.stack.last_mut().ok_or(StackUnderflow)?;
    *op2 = op1.wrapping_add(*op2);
    Ok(())
}
\`\`\`

本物のソースは、その中央2行をマクロ呼び出し1つに置き換えている:

\`\`\`rust
pub fn add<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
    popn_top!([op1], op2, context.interpreter);
    *op2 = op1.wrapping_add(*op2);
    Ok(())
}
\`\`\`

**このレッスンはこのリファクタリングだけ。** なぜマクロなのか、中に何があるか、3つの小さなディテールがなぜ価値を持つのか。

## ステップ 1 — そもそもなぜマクロか

全ての二項 Opcode が同じ2行で始まります:

\`\`\`rust
let op1 = ctx.interpreter.stack.pop().ok_or(StackUnderflow)?;
let op2 = ctx.interpreter.stack.last_mut().ok_or(StackUnderflow)?;
\`\`\`

コードベース全体で30回以上繰り返される。問題は *リファクタするかどうか* ではなく、*どうやるか*。

> 🛑 **予測。** なぜ通常の関数ではなく \`macro_rules!\`（Rust のパターンマッチ式マクロシステム。コンパイル時にシンタックスを操作する）を使うのか? 2つの理由のうち少なくとも1つを挙げてください。

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

スタックアンダーフローはバグであり、通常パスではない。レアな失敗パスのコードをホットな命令キャッシュ（CPU の icache。現在実行中の関数のバイト列が住む場所）に置きたくない。コールドな命令がそこに入ると、ホットなものが追い出される。

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

\`add\` とそのマクロは読んだ。**今度は、レッスンに手を引かれずに同じファイルの残りを読めることを証明する。** 別ウィンドウで \`cargo\` を開いた状態で、本物の revm チェックアウトの中で自分で走らせる3つのドリル。どれも「読むだけ」ではなく *やる、そして観測したことを書き留める*。

## セットアップ

\`\`\`bash
git clone https://github.com/bluealloy/revm
cd revm
cargo build  # ツールチェーンをウォームアップ
\`\`\`

\`cargo build\` が失敗したら、先に進む前に直してください。残りのドリルはビルドが通っている前提です — 「読むだけ」のバージョンは存在しません。

## ドリル 1 — \`mul\` を探して、形を証明する

\`crates/interpreter/src/instructions/arithmetic.rs\` を開く。\`mul\` 関数を見つける。\`add\` と1行ずつ比較する。

> 🛑 **質問（スクロール前に書き留めて）:** \`mul\` と \`add\` は行数まで構造的に同一です。**なぜ?** 「両方算術だから」ではなく — EVM の *メカニズム的にどんな性質* がこの2つを同じ形に強制するのか、具体的に。

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

EVM がバイトコード中に \`0x01\` を見たとき、**どんな仕組みで** \`add\` が呼ばれると決まるのか? それが *ディスパッチ* — 1バイトを1つの関数呼び出しに変換する仕組みで、あらゆるトランザクションのあらゆる Opcode で繰り返される。ホットパスの中のホットパス。間違えればクライアントは競争力を失い、正しくやればカスタム Opcode は3行で書ける（次のレッスン）。

最も素朴なディスパッチから始めて、revm の本物の命令テーブルまで積み上げます。レッスンの終わりには、これの全ピースを自分で組み立てたことに:

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

素朴版はテーブルを *実行時* に構築する — 起動時に代入を順次プッシュして、オプティマイザが引き上げてくれることを期待する形。もっと良い方法: **コンパイル時に構築する**。バイナリがロードされた瞬間にはテーブルが既に出来上がっている。

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

Hyperliquid は自前の EVM 上で perp を動かしていて、オーダーブック専用 Opcode をいくつか追加している — 200命令の Solidity 関数の代わりに、1バイトでネイティブコードへ直接ディスパッチ。**これがカスタム Opcode の対価: 自前チェーンでの 100 倍ショートカット。** 配線は *3行*。ショートカットは本物。それでも大半のチェーンが 50 個も出さない理由は、オプションではない3つの注意点。

revm の命令テーブル — コンパイル時に焼き込まれた256スロットの \`Instruction\` 構造体配列 — は組み立てた。さあ、自前の Opcode を差し込む。

このレッスンは半分メカニクス（短い）、もう半分は注意点（短くない）。メカニクスは付箋1枚で済む。注意点は「Hyperliquid が Revm を選んだのはモジュラーだから」という売り文句が *無料ランチではない* 理由。

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

複雑なオプションプライサーが **Solidity の 500K ガス → カスタム Opcode 1つの 5K ガス** に落ちる。これが Hyperliquid が perp 専用 Opcode を追加した理由 — 決済レイヤーのチェーン（Tempo 等）が安定通貨オペレーション向けに探索しているのも同種の圧縮。

> 🛑 **失敗モードを予測。** あなたは明日カスタム Opcode をリリースします。**雑に扱った場合に発生する問題を3つ** リストアップ。リストを書き留めて、下の注意点と比較。

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

3行のメカニクスと3つの注意点は読んだ。**今度は自分で配線する。** このドリルは「カスタム Opcode について読んだ」から「本物の revm チェックアウトに自分で配線して実行を見た」までを連れて行く。3 行 + 周辺ハーネス — 別ウィンドウで \`cargo\` を立ち上げて。

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

> 🛑 **質問（スクロール前に書き留めて）:** あなたが見つけた最も意外な未割当バイトは何か?（割当済みの隣接バイトと並んでいるもの — そのギャップは「検討されて却下された提案」や「未来の EIP のための予約」を物語ります。）

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

EVM が \`SLOAD\` を実行したとき、値はどこから来るのか? Revm からではない — Revm は **実行エンジン**であり、状態は持っていない。答えは \`Database\` というトレイト経由で来る。そして **このトレイトの実装が、Revm を何にでも繋ぐ方法**: テスト用のインメモリ Map、メインネットをフォークするリモート JSON-RPC ノード、本物の Reth クライアントの MDBX、エキゾチック L1 のシャード網。同じ4メソッドの形で、4種類のまったく異なるバックエンド。

このレッスンは、最も素朴なスケッチからこのトレイトを積み上げます。終わりにはこれの全ピースを自分で組み立てたことに:

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

修正は古典的な依存性逆転: Revm にストレージを所有させず、インターフェース経由で *問い合わせさせる*。トレイトを定義して、Revm が状態に必要とすることを *記述する* — ストレージを所有せずに:

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

前のレッスンを終えた時点で、あなたは \`&mut self\` を取る4メソッドの \`Database\` トレイトと、宙ぶらりんの問題を抱えている: \`Arc<MyDb>\`（Rust の原子参照カウントポインタ。スレッド間でデータを共有する標準手段）は \`&T\` しか出さず、\`&mut T\` は出さない。**つまり並列リーダーは \`Database\` を共有できない、まったく。** 本番ではそれが必要で、Revm は3つの追加ピースで解決する: 読み専用の仲間トレイト、別個の書き戻しトレイト、そしてトレイト API 自体に住む性能の逃げ口が1つ。プラス、同じ形が 50 行から数千行へ伸びる様を見せる3つの参照実装。

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

Rust の \`std::io\` の \`Read\` と \`Write\` と同じパターン（標準ライブラリのストリーム向けの2トレイト分割）— 1つのトレイトに混ぜたら、すべての読み手が書きについて考えなければならなくなる。

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

トレイトの形と3つの参照実装は読んだ。**今度は自分のものを作る — 誰でも書ける最小のやつ。** 「残高ゼロ、スロットゼロ、コードなし」と常に答える \`Database\`。4メソッドをスタブし、Revm に差し込み、トランザクションを走らせ、EVM が実際にどの読み込みを発行するかを観察する。（ネタバレ: あなたの想像より少ない。EVM は状態に対して *非常に* 怠惰。）

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

> 🛑 **質問（スクロール前に答えを書き留めて）:** 以下の各 EVM 操作が \`ZeroDb\` に対して走ります。何が起きる?
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

このドリルの後、Revm がどう状態を取るかの動くメンタルモデルがあります — 他のすべての Database はこの \`ZeroDb\` に本物のデータが乗っただけ。

ファイナルクイズの前に、もう 1 レッスン残っています: Revm をインタープリターからコンパイラブルへと一段先に進める — Paradigm の revmc。それを終えたら Inside Revm は完了 — **Inside Reth** が自然な次のステップ（Staged Sync・ExEx・Reth SDK）。`,
                },
                {
                  title: 'インタープリターの先へ — revmc による JIT/AOT コンパイル',
                  slug: 'revm-jit-aot-revmc-ja',
                  type: 'CONTENT',
                  sortOrder: 13,
                  duration: 16,
                  xpReward: 40,
                  content: `# インタープリターの先へ — revmc による JIT/AOT コンパイル

ここまでのコースは Revm を **インタープリター** として扱ってきた: Opcode バイトを読み、Rust 関数にディスパッチし、スタックを変更し、プログラムカウンタを進める、ループ。これが今でも revm の主たる動作モードであり、通常のメインネット負荷には十分速い — 誰も気にしない。

ただし、6 桁 TPS を狙う L1 ではその速さでは足りなくなる。MegaETH は EVM 上で 100K+ TPS を謳う; これはメインネットの秒あたり Opcode 予算のおよそ 1000 倍。スループットをそこまで上げると、**インタープリターループそのものがボトルネックになる** — Solidity のガスコストでも、状態アクセスでもなく、毎秒数億回の「ディスパッチ → 実行 → 進める」のコスト自体が。

抜け穴は **インタープリトをやめてコンパイルする** こと。EVM バイトコードを受け取って、Opcode ごとのディスパッチを伴わずマシン速度で動くネイティブコードに変える。それが Paradigm の [\`paradigmxyz/revmc\`](https://github.com/paradigmxyz/revmc) がやることであり、しかも **revm の置き換えではなく revm の上に乗っている**。Revm のインタープリターは依然としてコンパイラが一致しなければならない仕様である。

revmc は **実験的** だ — README が冒頭でそう書いている — が、「インタープリターの次は何か」という問いに対する最も読みやすい Rust ネイティブの答えであり、実際の L1 チームが注視しているツールチェーンだ。このレッスンは「revm のインタープリターが読める」(本コースの残り) と「『コンパイル済み EVM』が具体的に何を意味するか分かる」の橋渡しになる。

> 🛑 **アンチ流暢チェック、始める前に。** スクロールせずに予測: 「EVM バイトコードをコンパイルする」とは具体的に何を意味するか? 出力フォーマットは? コンパイル済みアーティファクトはどこに住む? いつ実行される? 推測を保留せよ。

## 「EVM バイトコードをコンパイルする」とは具体的に

2 つの形がある。目的地は同じ (ネイティブ機械語)、タイミングが違う。

**JIT (Just-In-Time)**。コントラクトが実行時に最初に呼ばれたとき、revmc はそのバイトコードを LLVM 経由でネイティブコードにコンパイルし、結果の関数ポインタを code hash でキャッシュする。2 回目以降はキャッシュに当たり、コンパイル済み関数に直接ディスパッチされる。コールドコールはコンパイルコストを払う; ウォームコールはネイティブ速度で走る。

**AOT (Ahead-Of-Time)**。ホットになると分かっているバイトコードを選んで — Uniswap V2/V3 ルーター、チェーンのシステムコントラクト、ERC-20 transfer のホットパス — オフラインで共有オブジェクトか静的ライブラリにコンパイルし、ノードと一緒にそのバイナリを出荷する。実行時のコンパイルコストはゼロ; トレードオフはどのコントラクトを優遇するかを事前に決め打ちすること。

どちらも同種のアーティファクトを生む: EVM コンテキストとスタックポインタを取って、コントラクトを完了 (またはホスト呼び出し) まで走らせる、固定された C ABI シグネチャのネイティブ関数。違いは *いつ* コンパイルするか。

> 🔍 **リポジトリで探せ。** [\`crates/revmc/src/lib.rs\`](https://github.com/paradigmxyz/revmc/blob/main/crates/revmc/src/lib.rs) を開け。クレートが \`revmc-codegen\`・\`revmc-runtime\`・\`revmc-backend\`・\`revmc-context\` の薄い再エクスポートに過ぎないことに気付け。**なぜ 4 つではなくファサード 1 つ?** コンパイラ ([\`revmc-codegen\`])・バックエンドトレイト ([\`revmc-backend\`])・LLVM 実装 ([\`revmc-llvm\`])・ランタイム接着 ([\`revmc-context\`]) を独立に差し替えられるよう設計されているから — codegen に触れずに明日 Cranelift バックエンドを書ける。

## なぜ難しいか — 自明でない 3 つの問題

「EVM バイトコードをネイティブコードにコンパイルする」を素直に読むと、普通の LLVM フロントエンド演習に聞こえる。違う。EVM にはコンパイラと喧嘩する 3 つの性質がある。

### 問題 1: ガス会計は決定論的でなければならない

ガスは **コンセンサスクリティカルな状態** だ。各 Opcode に定義されたガスコストがあり; 各ブロックの gas used はヘッダの一部であり; ガス使用量で食い違うノードはチェーンをフォークする。インタープリターは Opcode ハンドラの中で実行前にガスを差し引いてこれを満たす。コンパイラも同じことをしなければならない — ただしコンパイラの本業は *正しさに不要なコードを削除すること* だ。

> 🛑 **予測。** スクロールせずに: 通常のコードでは安全に見えるが、ガス会計を壊す「最適化」は何か?

少なくとも 3 つの地雷:

1. **Opcode 越しのデッドストア除去。** 素朴な LLVM オプティマイザは「この \`MSTORE\` は読まれる前に上書きされる値を書く」と気付いて書きを消すかもしれない。だが \`MSTORE\` には *メモリが拡張されるかどうかに依存するガスコスト* がある。データフロー上は dead でも、ガス上は alive。
2. **算術 Opcode 越しの定数畳み込み。** \`PUSH1 2, PUSH1 3, ADD\` は「5 を push」に見える。コンパイラはこれを畳み込んでよい — ただし依然として 3 + 3 + 3 = 9 ガスを請求する場合に限る。畳み込まれたリテラルは 1 値を push し、3 値を push しない。
3. **\`GAS\` Opcode を越えるループ不変コードの移動。** \`GAS\` Opcode は *現在の* 残ガスを読む。\`GAS\` を越えて作業をホイストすると \`GAS\` が読む値が変わる。観測可能な差。コンセンサスフォーク。

revmc の防御: ガス計測は **明示的な IR** であって暗黙ではない。各 Opcode は \`gas.remaining\` を減らし、アンダーフローしたら \`OutOfGas\` ブロックに分岐し、それから走る IR を出す。**オプティマイザはガス書きが見えるので、観測不能だと証明できない限り消せない** — そしてほぼ常に観測可能だ。

> 🔍 **リポジトリで探せ — IR のガス計測。** [\`crates/revmc-codegen/src/compiler/translate/mod.rs\`](https://github.com/paradigmxyz/revmc/blob/main/crates/revmc-codegen/src/compiler/translate/mod.rs) を開き、\`gas_cost_imm\` と \`gas_remaining_addr\` を検索せよ。すべての静的ガス差し引きが明示的な IR \`load → sub → compare → conditional branch to OutOfGas\` を出すのが見える — 全 Opcode で同じ形。これがコンパイラがガスを IR の第一級市民にしている証拠。\`gas_metering: bool\` の設定フラグもある — オフにすれば速いがコンセンサス外のコードが得られる。入力がガス的に妥当だと既に信頼できるオフチェーン再実行などで有用。

### 問題 2: EVM のスタック/メモリモデルはネイティブではない

EVM はスタックマシン: 256 ビットワード 1024 段のスタック + バイトアドレス可能な線形拡張メモリ領域。ネイティブコードはレジスタベースで、別個のマシンスタックとマシンメモリを持つ。

revmc はこれを **EVM コンテキスト経由でヒープ確保のスタックとメモリをコンパイル済み関数に渡す** ことで扱う — EVM スタックをネイティブレジスタにマップするのではない。コンパイラは可能なところで静的にスタック深さを追跡し、スタックバッファに対する load/store を出す。\`U256\` は多くのターゲットでレジスタに収まらないので、算術 Opcode ですらレジスタ演算ではなくスタックバッファに対する load-load-op-store のシーケンスに下げられる。

直感に反する帰結: **コンパイル済み EVM は、コンパイル済み C ほど速くない**。\`u64\` の \`a + b\` はネイティブで 1 命令。コンパイル済み EVM の \`U256\` 同等物は数命令。インタープリターに対する勝ちは「ネイティブコードと同じ速さ」ではなく「ディスパッチループがなくなり、オプティマイザが Opcode 越しに見える」だ。

### 問題 3: 副作用はホストから見えなければならない

SLOAD はチェーン状態を読む。SSTORE はチェーン状態を書く。CALL は他のコントラクトを再帰的に呼ぶ。BALANCE は任意のアカウントについてホストに問い合わせる。これらは消したり並べ替えたり畳んだりできない — これらは **コンパイル済み関数から revm のホスト環境への呼び出し** (前モジュールで読んだ \`Database\` 実装) だ。

revmc では、そのような Opcode はすべて [\`revmc-builtins\`](https://github.com/paradigmxyz/revmc/tree/main/crates/revmc-builtins) のランタイム *ビルトイン* — インタープリターと同じ \`EvmContext\` 経由でホスト呼び出しを行う Rust 関数 — への呼び出しに下げられる。オプティマイザはビルトイン呼び出しを不透明な副作用ありの呼び出し (LLVM の \`call\`、\`readonly\`/\`readnone\` ではない) として扱うため、並べ替えない。

> 🛑 **想起チェック。** スクロールせずに: 上の 3 問題のうち、LLVM オプティマイザを最も強く制約するのはどれ? (答え: #3 — 不透明呼び出しはほぼすべての並べ替えをブロックする。#1 はガスを IR 明示にすることで解決され、#2 は正しさではなくむしろ性能の天井。)

## revmc は revm にどう差し込まれるか

revmc は revm のフォークではない — その **上** の層だ。

統合点は \`revmc-context\` の [\`JitEvm\`](https://github.com/paradigmxyz/revmc/blob/main/crates/revmc-context/src/jit_evm.rs)。\`JitEvm\` は任意の \`EvmTr\` ベースの EVM をラップし、\`frame_run\` を上書きする。フレームが始まると、code hash を引く:

\`\`\`rust
// 概念図 — 本物は crates/revmc-context/src/jit_evm.rs を参照。
pub struct JitEvm<EVM, F = ...> {
    inner: EVM,
    functions: B256Map<RawEvmCompilerFn>, // code hash -> compiled fn
    on_miss: F,                            // optional JIT-on-the-fly hook
}
\`\`\`

code hash が事前コンパイル済みマップにあれば、ディスパッチはコンパイル済み関数に行く。なければ、任意の \`on_miss\` フックを呼ぶ (最初の呼び出しでコンパイル、つまり JIT)、または revm のインタープリターにフォールバックする。**インタープリターはセーフティネットだ**。revmc がコンパイルできないもの — 非対応 Opcode、デバッグビルド、何か変なもの — はすべて revm の通常のインタープリターパスに静かに流れる。「コンパイル経路が間違っている」失敗モードはない — 最悪「コンパイル経路が取られない」だけ。

もう半分はランタイム: AOT コンパイル済みアーティファクトはリンク対象の Rust シンボル群 (ビルトイン) を必要とする。それが [\`revmc-build\`](https://github.com/paradigmxyz/revmc/tree/main/crates/revmc-build) のビルドスクリプト — ノードオペレータが AOT バイナリを出荷するときに走らせる。

> 🔍 **リポジトリで探せ — ディスパッチを動かす。** [\`examples/runner/src/lib.rs\`](https://github.com/paradigmxyz/revmc/blob/main/examples/runner/src/lib.rs) を開け。統合の全体が: 普通の \`MainnetEvm\` を作り、\`JitEvm::new(inner, functions)\` でラップする。ここで \`functions\` は Fibonacci バイトコードのハッシュをそのコンパイル済み関数にマップする。それだけ。8 行。コンパイル済みフィボナッチが走り、他はインタープリトする。

## 本番での AOT vs JIT

AOT を選ぶ:

- ホットセットが分かっているとき。チェーンのシステムコントラクト。WETH。トップ DEX のルーター。ほぼ全ブロックで呼ばれるもの。
- 起動レイテンシを予測可能にしたいとき。AOT アーティファクトはノード起動時に一度ロードされる; コントラクトごとのコンパイル停止はない。
- とにかくノードバイナリを出荷していて、コンパイル済みコントラクトをリリースに焼き込む余裕があるとき。

JIT を選ぶ:

- ホットセットが負荷依存のとき。汎用 RPC ノードやインデクサはユーザーが何を呼ぶか予測できない。
- 一度コンパイルして以降キャッシュ、がノード稼働時間で十分償却するとき。
- 単一バイナリで任意のチェーンに適応させたいとき。

実際には、高スループット L1 は両方使う: 既知のホットセットには AOT、それ以外には JIT、その下にすべてのフォールバックとしてインタープリター。

## ここから先はどこへ

「EVM バイトコードはコンパイル可能だ」を受け入れると、隣接する問題群が同じ扱いを受けるようになる:

- **Native rollup / ステートレス再実行。** 証明生成のためのブロック再実行は同じバイトコードを何度も走らせる; 一度コンパイルしてコンパイル済みアーティファクトを再生するコストが支配的。
- **zkEVM の証明生成。** 一部の zk スタックは EVM バイトコードを同様のパイプラインで下げる; revmc の IR 明示のガス計測は、最終バックエンドが LLVM ではなく SNARK 回路だとしても有用な原始要素。
- **インデクサとトレーサ。** 派生データを抽出するために履歴ブロックを再実行する用途はすべてコンパイルの恩恵を受ける — 負荷は「同じバイトコードを百万回」だから。

EVM-L1 エコシステム全体 (MegaETH、Reth フォーク系チェーン、Paradigm 隣接インフラ) もこの方向に動いている。「Revm は仕様、revmc は速い経路」は次世代の EVM L1 にとって守れるアーキテクチャだ。

## レッスン終わりの想起

スクロールせずに、自分の言葉で:

1. なぜ revmc はガス計測を意図的に明示的 IR (load/sub/branch) にし、オプティマイザに推論させないのか?
2. revmc と revm の統合境界は何か — \`JitEvm\` は何を実際にインターセプトするのか?
3. JIT 後でもコンパイル済み EVM がコンパイル済み C ほど速くない理由を 2 つ挙げよ。
4. 運用するノードについて AOT を JIT より選ぶのはどんなときか?

どれか曖昧ならその節を読み直し。穴を抱えたままファイナルクイズに進むな。

これが Inside Revm の最後のコンテンツレッスン。次はファイナルクイズ — それを終えたら自然な次のステップは **Inside Reth** (Staged Sync・ExEx・Reth SDK)、同じソースファーストの扱いをノード層で続けることになる。`,
                },
                {
                  title: 'Inside Revm ファイナルクイズ',
                  slug: 'revm-advanced-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 14,
                  duration: 8,
                  xpReward: 25,
                  content: `# Inside Revm ファイナルクイズ

Revm 内部の最終チェック: インタープリター、カスタム Opcode、Database トレイト。

3 問。同じルール: **クイズはうなずきで通せない。** 2 問落としたら、Inside Revm を「完了」と称する前に該当する積み上げレッスンを読み直してください。`,
                  quizQuestions: [
                    {
                      question: 'Revm の `crates/interpreter` が責任を持つのはどれですか?',
                      options: [
                        'EVM の型システム原始型 (Address、U256、B256) の定義',
                        '各 EVM Opcode の Rust 実装',
                        'Database トレイトと state 供給インターフェースの保持',
                        '実行時の命令ディスパッチテーブルの構築',
                      ],
                      correctIndex: 1,
                      explanation: '`crates/interpreter` は Opcode ごとの実装を持つ: ADD、MUL、PUSH、JUMP、SLOAD、SSTORE など。(Primitive は `crates/primitives` にある。Database トレイトは `crates/database-interface`。ディスパッチテーブルは実行時ではなくコンパイル時に構築される。) 実行時ディスパッチを推測したら — カスタム Opcode のレッスンを読み直して。',
                    },
                    {
                      question: 'Revm ベースのフォークにカスタム Opcode を追加すると、実際に何ができますか?',
                      options: [
                        '標準 Opcode (ADD など) の結果計算をすべてのクライアントに対して上書きする',
                        '自前のチェーンで高速な単一命令ショートカットを提供する — メインネットとはコンセンサス互換性なし',
                        'メインネットの任意の Solidity コントラクトから固定アドレスで呼べる precompile を追加する',
                        'フォークなしで同じ Opcode のガスコストを下げる',
                      ],
                      correctIndex: 1,
                      explanation: 'カスタム Opcode は未割当バイト (例: 0x0C) を占める。メインネットはあなたの Opcode を知らないので、それを使うブロックは go-ethereum でリプレイできない。ショートカットは *自分のフォーク内で* 本物。Precompile は別仕組み (予約済みアドレス、新しい Opcode バイトではない)。コンセンサスをフォークせずにガスコストを下げることはできない。',
                    },
                    {
                      question: 'Revm の `Database` トレイトの主な役割は:',
                      options: [
                        'EVM の状態変更を裏側のストレージに commit して戻すこと',
                        '実行に必要なアカウント情報・コントラクトコード・ストレージスロット・過去のブロックハッシュを供給すること',
                        'ガス会計のホットパスを処理すること',
                        'Opcode バイトから関数へのディスパッチテーブルを提供すること',
                      ],
                      correctIndex: 1,
                      explanation: 'Database は読み側の状態源。書きは DatabaseCommit を通る。ガス会計はインタープリター内部。ディスパッチは命令テーブル。Database 実装を差し替えれば、EVM をインメモリデータ・JSON-RPC (フォークメインネット)・本番 MDBX・他なんでもの上で動かせる。',
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
