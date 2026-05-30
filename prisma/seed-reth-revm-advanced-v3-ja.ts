import { PrismaClient } from '@prisma/client';

export async function seedRethRevmAdvancedV3JA(prisma: PrismaClient) {
  const tags = ['revm', 'rust', 'evm', 'interpreter', 'opcode'];

  await prisma.course.create({
    data: {
      slug: 'revm-advanced-v3-ja',
      title: 'Inside Revm — EVM エンジンを読む',
      description:
        'revm のソースを 1 行ずつ読み解く — Rust EVM スタックの **実行エンジン**を、`add` Opcode + 命令テーブル + カスタム Opcode + `Database` トレイト + テスト + 並列 + JIT/AOT のチェーンで歩く。3 つの独立した中級コース（Revm・Reth・Alloy）の 1 つで、受講順は自由。Reth は revm を実行エンジンに、dapp は revm を bytecode シミュレーションに使うので、Rust で EVM を触るあらゆる場面で本コースは効いてくる。',
      difficulty: 'INTERMEDIATE',
      duration: 182,
      xpReward: 475,
      track: 'revm-advanced',
      tags,
      isPublished: true,
      sortOrder: 1100,
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
                  title: 'レッスン0 — Inside Revm へようこそ',
                  slug: 'revm-advanced-welcome-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 7,
                  xpReward: 15,
                  content: `# レッスン0 — Inside Revm へようこそ

## 問い

これは RethLab の 3 つの独立した中級ティアコースの 1 つ。**Revm は Rust 製 EVM クライアントすべての *実行エンジン***。Reth・Hyperliquid の HyperEVM・Berachain の bera-reth・Tempo — 「うちは Revm を使う」と言うチェーンは全部同じ Opcode ループ・ガス会計・状態読み出しを走らせている。**どこから始め、何を前提に読むか？**

## 原理（最小モデル）

- **3 中級コース**: Inside Revm（ここ）/ Inside Reth（Staged Sync・ExEx・SDK）/ Inside Alloy（Provider・Network・Signer）。受講順は自由、Revm が一番下層なので推奨スタート。
- **3 トピックチェーン構造**: \`add\` Opcode + マクロ / 命令ディスパッチテーブル + カスタム Opcode / \`Database\` トレイト。各々 buildup → walkthrough → quiz → drill の 4 連。
- **追加 3 レッスン**: テスト（state test / EOF / execution-spec）+ 並列実行（block-stm）+ JIT/AOT（revmc）。
- **読み方**: 別タブで [\`bluealloy/revm\`](https://github.com/bluealloy/revm) を開き、レッスンで主張する全ソース箇所を実ファイルで照合。「読んでうなずいた」を信用しない、ドリルで証明する。
- **前提知識**: EVM 内部（バイトコード dispatch loop、stack/memory/calldata/storage、cold/warm gas (EIP-2929)、CALL/DELEGATECALL/STATICCALL）+ 中級 Rust（generics + trait bounds、\`?Sized\`、\`dyn Trait\`、\`Arc<T>\`、\`unsafe\`、\`macro_rules!\`）。

## 具体例

このコースで触る revm ソース:

\`\`\`rust
// 1. crates/interpreter/src/instructions/arithmetic.rs (L1-L4)
pub fn add<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
    popn_top!([op1], op2, context.interpreter);
    *op2 = op1.wrapping_add(*op2);
    Ok(())
}

// 2. crates/interpreter/src/instructions.rs (L5-L8)
const fn instruction_table_impl<WIRE: InterpreterTypes, H: Host>() -> InstructionTable<WIRE, H> {
    let mut table = [Instruction::unknown(); 256];
    table[ADD as usize] = Instruction::new(arithmetic::add);
    // ...
}

// 3. crates/database-interface/src/lib.rs (L9-L12)
#[auto_impl(&mut, Box)]
pub trait Database {
    type Error: DBErrorMarker;
    fn basic(&mut self, address: Address) -> Result<Option<AccountInfo>, Self::Error>;
    fn code_by_hash(&mut self, code_hash: B256) -> Result<Bytecode, Self::Error>;
    fn storage(&mut self, address: Address, index: StorageKey) -> Result<StorageValue, Self::Error>;
    fn block_hash(&mut self, number: u64) -> Result<B256, Self::Error>;
}
\`\`\`

3 トピック、各 ~10 行のソース、それぞれ buildup + walkthrough + quiz + drill で計 12 レッスン。終わりにホットパス全行を読み、各ピースが何をしているか自分の言葉で説明できる。

## セットアップ — 一度だけ

レッスン 1 の前に、別ウィンドウで:

1. \`git clone https://github.com/bluealloy/revm\`
2. \`rustc --version\` でモダンなツールチェーン確認
3. \`cargo install cargo-expand\`（Expert の手続きマクロで欲しい）
4. セカンドモニタか分割端末でソース参照

「Find in repo」プロンプトはリポを実際に開いていなければ機能しない。

## 失敗例（誤解）

「Revm = フルクライアント」— **間違い**。Revm は **実行エンジン**のみ、状態は持たない。状態は \`Database\` トレイト経由で外部供給される（L9-L12 で組み立てる）。Reth / Hyperliquid / Tempo は revm をラップして P2P + DB + コンセンサスを足す。

「Inside Reth から先に読むべき」— **間違いではないが**、Revm が一番下層（Reth は revm の型を使う、Alloy も revm の primitive を使う）。Reth から始めても OK だが、Revm が固まってから Reth に戻ったほうが「なぜこの型なのか」が腑に落ちる。

「読むだけで身に付く」— **致命的**。各トピックチェーンの 4 番目（ドリル）が「読んだことを本当に解いた証明」。読んでうなずく → 1 日後に再現できない、が中級を壊す失敗モード。**ドリルは飛ばさない**。

## ステップで組み立てる

### Step 1: セットアップを完了

revm clone + ツールチェーン + cargo-expand + 2 モニタ。これがないと「Find in repo」プロンプトが機能しない。

### Step 2: トピック 1（\`add\` Opcode）— L1 → L4

buildup → walkthrough → quiz → drill。\`add\` を素朴版から本物まで 5 ステップで積み上げ、マクロ \`popn_top!\` を読み、進行をゲートするクイズ、最後にコンセンサスをわざと壊して直すドリル。

### Step 3: トピック 2（命令ディスパッチテーブル）— L5 → L8

256 スロット const テーブルを組み立て、カスタム Opcode を 3 行で配線、3 注意点（コンセンサス互換 / ガス価格 / 検証性）を学び、ドリルでフォークを出荷。

### Step 4: トピック 3（\`Database\` トレイト）— L9 → L12

4 メソッド + 関連型 + auto_impl を組み立て、仲間トレイト（\`DatabaseRef\` / \`DatabaseCommit\`）と 3 本番実装を読み、ドリルで \`ZeroDb\` を実装して revm の状態読みを観察。

### Step 5: 追加 3 レッスン — L13 → L15

テスト（state test / EOF / execution-spec）+ 並列実行（block-stm）+ JIT/AOT（revmc）。コンセンサスクリティカルなテスト規律 + 性能フロンティア。

### Step 6: ファイナルクイズ — L16

3 トピックチェーンの構造的事実を確認。3 中級コース（Revm・Reth・Alloy）完走に向けたゲート。

## 答え合わせ

- **Revm を 1 番下層に置く理由**: Reth は revm の型（\`Address\`・\`U256\`・\`B256\`・\`Database\` トレイト）を前提に組まれる、Alloy も revm の primitive を使う → **Revm の型システムは Rust EVM スタック全体の語彙の土台**。Revm を固めてから Reth に行くと「なぜこの型なのか」が腑に落ちる。
- **ドリル必須の理由**: 中級を壊す失敗モード = 「読んでうなずいた」を 1 日後に再現できない。各トピック 4 番目（ドリル）が「本当に解いた証明」 = 別端末で revm に手を入れ、テストを走らせ、出力を読み、観測したことを書き留める = **記憶への定着**。
- **追加 3 レッスンの位置づけ**: コア（L1-L12）は revm のホットパス読み。L13-L15 は「revm をどう信頼するか（テスト）+ スループットの先（並列 + JIT）」 = **コア以後の世界**を覗く窓。

## 合格基準

- 3 中級コース（Revm・Reth・Alloy）の関係と受講順自由を即答できる。
- 3 トピックチェーン構造（add / dispatch / Database）+ 各 4 連（buildup → walkthrough → quiz → drill）を言える。
- セットアップ 4 項目（revm clone + ツールチェーン + cargo-expand + 2 モニタ）を即答できる。
- 中級を壊す失敗モード（読みうなずき → 再現不能）とドリル必須の理由を 1 文で説明できる。
- 前提知識（EVM 内部 5 項目 + 中級 Rust 4 項目）を即答できる。

## まとめ（3行）

- Inside Revm = RethLab 3 中級コースの 1 つ、Revm は Rust EVM スタックの実行エンジン（Reth / Hyperliquid / Tempo 等全部同じソースを走らせる）。
- 3 トピックチェーン（add Opcode + マクロ / 命令ディスパッチテーブル + カスタム Opcode / Database トレイト）各 buildup → walkthrough → quiz → drill の 4 連 + テスト + 並列 + JIT/AOT + 最終クイズ = 17 レッスン。
- セットアップ 4 項目（revm clone + ツールチェーン + cargo-expand + 2 モニタ）必須、ドリルは飛ばさない、読みうなずきを信用しない。
`,
                },
                {
                  title: 'レッスン1 — `add` をステップで組み立てる：シグネチャと本体',
                  slug: 'revm-add-buildup-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 8,
                  xpReward: 20,
                  content: `# レッスン1 — \`add\` をステップで組み立てる：シグネチャと本体

## 問い

\`ADD\` は EVM Opcode で最も単純な非自明: 数値 2 つ pop、和を push。**Revm は 4 行で済ませているが、その 4 行に型パラメータ 2 つのジェネリック + \`?Sized\` opt-out + アンダーフローガード + 分岐予測ヒントへ展開されるマクロ + \`wrapping_add\`（\`+\` だと最初のオーバーフローでメインネットから分岐）が詰まっている — どうやって到達するか？**

## 原理（最小モデル）

- **本物の形.** \`pub fn add<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result { popn_top!(...); *op2 = op1.wrapping_add(*op2); Ok(()) }\`。
- **5 ステップ積み上げ.** 素朴版 → \`<H: Host>\` → \`?Sized\` → \`IT: ITy\` → \`&mut\` その場 + \`wrapping_add\`。
- **モノモーフ化.** \`<H: Host>\` は具象 \`H\` ごとに特殊化バイナリ = 静的ディスパッチ、vtable なし。
- **\`?Sized\` opt-out.** Rust の暗黙 \`Sized\` を外すと \`&mut dyn Host\` が渡せる、vtable 間接化と引き換え。
- **\`IT: ITy\`.** 実行モード（本番 / トレース / Inspector）をコンパイル時に選ぶ marker、特殊化バイナリで実行時切替コストゼロ。
- **\`&mut\` その場書き込み.** 3 スタック操作（pop + pop + push）→ 1 操作（pop + 上書き）。
- **\`wrapping_add\` 必須.** EVM コンセンサスは mod 2²⁵⁶ wrap を要求、\`+\` は debug panic / release wrap で分岐、\`saturating_add\` はネットワークフォーク。

## 具体例

ステップ 0 — 素朴版:

\`\`\`rust
pub fn add(stack: &mut Vec<U256>) -> Result<(), &'static str> {
    let a = stack.pop().ok_or("underflow")?;
    let b = stack.pop().ok_or("underflow")?;
    stack.push(a + b);
    Ok(())
}
\`\`\`

2 つ落とし穴: ① \`&mut Vec<U256>\` は具象型、トレーサー / ファザー / Inspector のスタックに差し替え不能、② pop + pop + push = 3 回スタック操作。

ステップ 1 — ホストジェネリック:

\`\`\`rust
pub fn add<H: Host>(host: &mut H) -> Result {
    // ... 本体は同じだが、具象 Vec ではなく H に対して呼ぶ
}
\`\`\`

\`<H: Host>\` = 「\`Host\` トレイトを実装する任意の型」、コンパイラがモノモーフ化で具象 \`H\` ごとに特殊化バイナリ出力。落とし穴: trait object \`&mut dyn Host\` を渡せない（\`<H: Host>\` はコンパイル時サイズ既知のみ）。

ステップ 2 — \`?Sized\` で trait object 許可:

\`\`\`rust
pub fn add<H: Host + ?Sized>(host: &mut H) -> Result {
    // ...
}
\`\`\`

\`?Sized\` で Rust の暗黙の \`Sized\` 制約を外す = \`&mut dyn Host\` が有効引数に = 1 バイナリで全 \`Host\` 実装、vtable 間接化と引き換え。

ステップ 3 — \`IT: ITy\` で実行モード抽象化:

\`\`\`rust
pub fn add<IT: ITy, H: Host + ?Sized>(host: &mut H) -> Result {
    // ...
}
\`\`\`

\`IT\` = 「interpreter-types」マーカー、ストラテジパラメータ。同じソースが本番 / トレース / Inspector サンドボックスごとに特殊化バイナリへコンパイル。本物の \`add\` シグネチャ:

\`\`\`rust
pub fn add<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
\`\`\`

（\`Host\` 制約は \`Ictx\` 側に移っている — \`add\` に残るのは \`IT: ITy\` と \`H: ?Sized\`。）

ステップ 4 — 本体を \`&mut\` その場書き込み:

\`\`\`rust
let a = stack.pop().ok_or(StackUnderflow)?;       // op1 を pop
let b = stack.last_mut().ok_or(StackUnderflow)?;  // 新トップ &mut
*b = a + *b;                                       // その場上書き
\`\`\`

pop 1 + その場書き込み 1 = **push なし**。\`-> Result\` に連結値なし、データの流れは参照経由。

ステップ 5 — \`wrapping_add\`:

\`\`\`rust
*b = a.wrapping_add(*b);
\`\`\`

EVM コンセンサス = \`ADD\` mod 2²⁵⁶ wrap、\`+\` は debug panic / release wrap で分岐、\`saturating_add\` は最初のオーバーフローでネットワークフォーク。\`U256::MAX.wrapping_add(U256::from(1))\` = \`0x0\`。

到達した本物の形:

\`\`\`rust
pub fn add<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
    let op1 = context.interpreter.stack.pop().ok_or(StackUnderflow)?;
    let op2 = context.interpreter.stack.last_mut().ok_or(StackUnderflow)?;
    *op2 = op1.wrapping_add(*op2);
    Ok(())
}
\`\`\`

中央 2 行は次レッスンで \`popn_top!\` マクロに抽出。

## 失敗例（誤解）

「\`<H: Host>\` だけで十分」— **間違い**。trait object \`&mut dyn Host\`（設定フラグ / 動的テストハーネス）には \`?Sized\` 必須。

「\`IT: ITy\` は飾り」— **間違い**。これがないと \`add\` を本番 / トレース / Inspector の 3 回書く羽目、または実行時分岐で速度ペナルティ。

「\`+\` でも release ビルドなら大丈夫」— **致命的**。Rust の \`+\` は debug panic / release wrap = ビルド分岐 = コンセンサス契約に載せられない。**\`wrapping_add\` で明示** = EVM コンセンサスが要求する正確な挙動。

## ステップで組み立てる

### Step 1: 素朴版を確認
\`pop + pop + push\`、3 操作、ホスト固定。

### Step 2: \`<H: Host>\` でホストジェネリック
モノモーフ化で特殊化バイナリ。

### Step 3: \`+ ?Sized\` で trait object 許可
\`&mut dyn Host\` 有効、vtable 間接化と引き換え。

### Step 4: \`<IT: ITy, H: ?Sized>\` で実行モード抽象化
\`IT\` ストラテジパラメータ、特殊化バイナリ。

### Step 5: \`&mut\` その場書き込み + \`wrapping_add\`
1 操作、\`-> Result\` 連結値なし、mod 2²⁵⁶ wrap。

## 答え合わせ

- **\`IT: ITy\` がくれるもの**: 実行モードの **静的選択**、特殊化バイナリで実行時切替コストゼロ。なければ 3 回書くか実行時分岐。
- **\`?Sized\` が許すもの**: trait object \`&mut dyn Host\`。Rust の暗黙 \`Sized\` 制約を外す、vtable 間接化と引き換え。
- **その場書き込みが勝つ理由**: 3 操作 → 1 操作、ホットパス（毎 tx 毎 Opcode 数万 + 毎ブロック数百万 + CI 秒間数億）で実測される差。
- **\`U256::MAX.wrapping_add(U256::from(1))\`**: \`0x0\`（mod 2²⁵⁶ wrap）= EVM コンセンサス要求。\`saturating_add\` だと \`U256::MAX\` のまま → メインネットフォーク。

## 合格基準

- 本物の \`add\` 4 行を即書ける。
- 5 ステップ積み上げを順に言える。
- モノモーフ化と \`?Sized\` の trade-off を 1 文で説明できる。
- \`IT: ITy\` の役割を即答できる。
- \`wrapping_add\` 必須の理由を言える。

## まとめ（3行）

- 本物の \`add\` は 4 行: ジェネリック \`<IT: ITy, H: ?Sized>\` + \`popn_top!\` + \`wrapping_add\` その場書き込み + \`Ok(())\`。
- 5 ステップ積み上げ（素朴 → \`<H: Host>\` → \`?Sized\` → \`IT: ITy\` → \`&mut\` + \`wrapping_add\`）、各ステップに明確な動機。
- EVM コンセンサスは mod 2²⁵⁶ wrap を要求、\`+\` や \`saturating_add\` 置換は分岐 / フォーク、次レッスンで中央 2 行を \`popn_top!\` マクロに抽出。
`,
                },
                {
                  title: 'レッスン2 — `add` を読む：マクロを抽出する',
                  slug: 'revm-add-macro-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 8,
                  xpReward: 25,
                  content: `# レッスン2 — \`add\` を読む：マクロを抽出する

## 問い

\`crates/interpreter/src/instructions/arithmetic.rs\` を開くと \`add\` / \`mul\` / \`sub\` / \`div\` / \`lt\` / \`gt\` / \`eq\` 等の二項 Opcode が 30 個以上、**全部同じ 2 行のスタック pop ボイラープレートで始まる**。revm は \`popn_top!\` という 1 マクロで全箇所を置き換える。**なぜ関数ではなくマクロか、3 ディテールの価値は？**

## 原理（最小モデル）

- **本物のリファクタ.** 前レッスンの \`add\` 中央 2 行を \`popn_top!([op1], op2, context.interpreter);\` に置換。
- **マクロ選択の 2 理由.** ① 可変アリティ（Opcode により pop 数 1/2/3）、② Opcode 関数から直接 \`return Err(StackUnderflow);\` 発行（\`?\` 不要）。
- **3 ディテール.** \`cold_path()\`（LLVM ヒント）+ アンダーフロー 1 回事前チェック + \`unwrap_unchecked()\`（ガード前提で実行時チェックスキップ）。
- **\`gas!\` も同形.** チェック → cold ヒント → 早期リターン、5 行版。
- **\`unsafe\` の契約.** \`unwrap_unchecked\` = ガードが証明したドメイン不変条件、ガード消すと即 UB。
- **\`add\` は固定ガス本体課金なし.** ディスパッチが前払い、\`exp\` / \`sha3\` 等オペランド依存のみ本体課金。

## 具体例

ステップ 1 — マクロ化対象の 2 行:

\`\`\`rust
let op1 = ctx.interpreter.stack.pop().ok_or(StackUnderflow)?;
let op2 = ctx.interpreter.stack.last_mut().ok_or(StackUnderflow)?;
\`\`\`

コードベース全体で 30 回以上繰り返される。問題は *リファクタするかどうか* ではなく *どうやるか*。

ステップ 2 — 素朴マクロ:

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

\`$($x:ident),*\` = カンマ区切り識別子リスト、\`$( ... )*\` = リスト要素ごとに繰り返し。これは動く、ただし遅い 2 点で。

ステップ 3 — アンダーフロー 1 回事前チェック:

\`\`\`rust
if $interpreter.stack.len() < (1 + $crate::_count!($($x)*)) {
    return Err(StackUnderflow);
}
// ... 以降は再チェックなしで pop
\`\`\`

\`.pop()\` を N 回呼ぶ = 内部境界チェック N 回。最初に 1 回だけチェック → 以降の pop は静的に安全。

ステップ 4 — \`cold_path()\` で LLVM ヒント:

\`\`\`rust
if $interpreter.stack.len() < (1 + $crate::_count!($($x)*)) {
    $crate::primitives::hints_util::cold_path();
    return Err(StackUnderflow);
}
\`\`\`

\`cold_path()\` は **実行時には何にもコンパイルされない**、LLVM への「この分岐から到達するコードはレア」というヒント。レア分岐コードをホット icache から離れた場所へ配置、ハッピーパス 1 本直線アセンブリ。ゼロコスト最適化ヒント。

ステップ 5 — \`unwrap_unchecked()\` でガード恩恵回収:

\`\`\`rust
let ([$( $x ),*], $top) = unsafe {
    $crate::interpreter_types::StackTr::popn_top(&mut $interpreter.stack)
        .unwrap_unchecked()
};
\`\`\`

\`unwrap_unchecked()\` は実行時の \`Some\` チェックをスキップ。**安全なのは値が \`Some\` であることを証明できるときだけ — ステップ 3 のガードがそれを証明済み**。\`unsafe\` ブロックは契約: 「自分でチェックした、二重チェック不要」。

ステップ 6 — 本物:

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

3 ディテール:
- **\`cold_path()\`** — LLVM へのコンパイル時ヒント「この分岐から到達するコードはレア」、レア分岐コードをホット icache から離れた場所へ配置、ハッピーパス 1 本直線アセンブリ
- **アンダーフロー 1 回事前チェック** — N 回 \`.pop()\` 呼ぶ = 境界チェック N 回 → 最初に 1 回 \`stack.len() < (1 + N)\` で済ます
- **\`unwrap_unchecked()\`** — ガードが \`Some\` を証明済み、実行時 \`Some\` チェックをスキップ

\`gas!\`:

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

チェック → cold ヒント → 早期リターン、5 行版。

## 失敗例（誤解）

「マクロでなく関数で十分」— **間違い**。① 可変アリティ（\`popn_top1/2/3\` 別関数 or const ジェネリクス曲芸）、② 関数だと呼び出し側で毎回 \`?\` のお決まり構文。

「\`cold_path()\` は panic ハンドラへのジャンプ」— **間違い**。**実行時には何にもコンパイルされない**、LLVM へのヒントのみ。

「コンパイラが冗長な \`Some\` チェックを最適化で除去できる」— **間違い**。\`stack.len() >= N\` と \`popn_top\` が \`Some\` を返すことの関係は **ドメイン不変条件**、型システムが見える型不変条件ではない、コンパイラは証明できない、\`unwrap_unchecked\` がドメイン知識と型システムの継ぎ目。

## ステップで組み立てる

### Step 1: マクロを選ぶ 2 理由
可変アリティ + 直接早期リターン。

### Step 2: 素朴マクロ
\`$($x:ident),*\` 繰り返しで各 pop。

### Step 3: アンダーフロー 1 回事前チェック
\`stack.len() < (1 + N)\` で以降の pop は静的に安全。

### Step 4: \`cold_path()\` で LLVM ヒント
レア分岐コードをホット icache から離す、実行時コストゼロ。

### Step 5: \`unwrap_unchecked()\` でガード恩恵回収
ガードが \`Some\` 証明済み、実行時チェックスキップ、\`unsafe\` 契約。

### Step 6: \`gas!\` も同形
チェック → cold ヒント → 早期リターン、5 行版。

## 答え合わせ

- **マクロ選択の機構的理由**: ① **可変アリティ** = \`[op1]\` / \`[op1, op2]\` / \`[op1, op2, op3]\` を同じアームでマッチ、関数だと N 別関数、② **直接早期リターン** = \`return Err\` を Opcode 関数から発行、関数だと \`Result\` + \`?\`。
- **\`cold_path()\` の実行時挙動**: **何にもコンパイルされない**、LLVM への「この分岐は統計的にレア」ヒント。レア分岐コードをホットパスから離れた場所に配置、ハッピーパスはキャッシュ温度維持の 1 本直線アセンブリ。
- **\`unwrap_unchecked\` が UB にならない理由**: マクロ直前の \`if stack.len() < ...\` ガードが pop する値が \`Some\` であることを **静的に保証**、\`unwrap_unchecked\` 実行時には \`Some\` 証明済み。**ガード消すと即 UB**、\`unsafe\` = 「自分でチェックした、ランタイムは二重チェック不要」契約。

## 合格基準

- 本物の \`popn_top!\` 6 ステップ展開を即書ける。
- マクロ選択の 2 理由を 1 文ずつ説明できる。
- \`cold_path()\` の実行時挙動（何も生成しない LLVM ヒント）を即答できる。
- \`unwrap_unchecked\` がガード前提で UB にならない理由を 1 文で説明できる。
- \`add\` 固定ガス本体課金なし、\`exp\` / \`sha3\` 本体課金（オペランド依存）の差を言える。

## まとめ（3行）

- 本物の \`popn_top!\` = アンダーフロー 1 回事前チェック + \`cold_path()\` LLVM ヒント + \`unwrap_unchecked()\` ガード恩恵回収 + 可変アリティ識別子マッチ。
- マクロ選択 2 理由 = 可変アリティ + 直接早期リターン、関数だと N 別関数 + \`?\` ボイラープレート。
- \`gas!\` も同形（チェック → cold ヒント → 早期リターン）= \`popn_top!\` を消化すれば 5 行で読める、\`add\` は固定ガスで本体課金なし。
`,
                },
                {
                  title: 'クイズ — `add` Opcode',
                  slug: 'revm-add-opcode-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 3,
                  duration: 5,
                  xpReward: 30,
                  content: `# クイズ — \`add\` Opcode

\`add\` のシグネチャ（\`<IT: ITy, H: ?Sized>\`）、\`?Sized\` の役割、\`popn_top!\` 内の \`unwrap_unchecked\` がガード前提で UB にならない理由、\`cold_path()\` の実行時挙動、\`wrapping_add\` がコンセンサスに要求される理由、本体が \`Ok(())\` だけを返す理由を確認する。

組み立てとマクロ抽出にまたがる設計判断を問う 5 問。**クイズはうなずきで通せない。** 2 問以上落としたら、ドリルへ進む前に「\`add\` をステップで組み立てる」と「マクロを抽出する」に戻ること。
`,
                  quizQuestions: [
                    {
                      "question": "`add` のシグネチャの `H: ?Sized` から `?` を取ると、実際に何が壊れますか?",
                      "options": [
                        "何も壊れない — `?Sized` はコンパイラが無視する装飾的なヒント。",
                        "`add` がコンパイルできなくなる — `H` は既に暗黙的に `?Sized` だから。",
                        "`&mut dyn Host` を引数として渡せなくなる — `H` には具象でサイズが決まる型しか渡せなくなる。",
                        "`popn_top!` の中の `unwrap_unchecked()` が未定義動作になる。"
                      ],
                      "correctIndex": 2,
                      "explanation": "Rust はジェネリック型パラメータすべてに暗黙の `Sized` 制約を加える。`?Sized` はその制約を外す指定。これがないと `H` はコンパイル時にサイズが分かる型でなければならず、トレイトオブジェクト（`dyn Host` のように実行時の具象型でサイズが決まる型）は除外される。`&mut dyn Host` がコンパイルする唯一の理由が、この `?Sized` opt-out である。"
                    },
                    {
                      "question": "`popn_top!` の中の `unwrap_unchecked()` がなぜ未定義動作にならないのですか?",
                      "options": [
                        "`unsafe` ブロックは実行時に UB チェックを停止するから。",
                        "マクロの直前にある `if stack.len() < ...` のガードが、pop する値が `Some` であることをちょうど証明したから。",
                        "`cold_path()` がアンダーフロー側の分岐を実行不可能にするから。",
                        "Rust が `unsafe` ブロック内で自動的に `Option` 型を検証するから。"
                      ],
                      "correctIndex": 1,
                      "explanation": "`unwrap_unchecked` は値が `None` のときに未定義動作になる。マクロの `if` ガードはスタックの要素数が必要数より少ないときに早期リターンするので、`unwrap_unchecked` が走る時点では値が `Some` であることが静的に保証されている。ガードを消した瞬間、即座に UB。`unsafe` ブロックは契約です — 「自分でチェックした、ランタイムは二重チェック不要」。"
                    },
                    {
                      "question": "`cold_path()` は生成されるアセンブリで実際に何にコンパイルされますか?",
                      "options": [
                        "panic ハンドラへの無条件ジャンプ。",
                        "実行時には何にもコンパイルされない — LLVM への「この分岐は統計的にレア」というヒント。",
                        "`std::process::abort()` の呼び出し。",
                        "スタックトレースを出力するロギング呼び出し。"
                      ],
                      "correctIndex": 1,
                      "explanation": "`cold_path()` は命令を生成しません。LLVM に「この分岐から到達するコードはレア」と伝える。オプティマイザはその分岐のコードをホットな命令キャッシュから遠ざけて配置する。ハッピーパスはキャッシュ温度を保ったまま1本の直線アセンブリに保たれる — それがこのパターンの目的である。"
                    },
                    {
                      "question": "`U256::MAX.wrapping_add(U256::from(1))` は16進で何を返しますか?",
                      "options": [
                        "`0xFFFF...FF` — 最大値で飽和。",
                        "オーバーフローで panic。",
                        "`0x0` — mod 2²⁵⁶ で wrap する。",
                        "トランザクションが revert する。"
                      ],
                      "correctIndex": 2,
                      "explanation": "EVM の `ADD` Opcode はコンセンサスにより mod 2²⁵⁶ の wrap が *要求* されている。`wrapping_add` がまさにその挙動である。`saturating_add` や `checked_add` に置き換えると、最初のオーバーフローでネットワークがフォークします — ドリルレッスンで実証する。"
                    },
                    {
                      "question": "`add` の関数本体は加算結果をどこにも明示的に返していません。EVM はどこで新しいスタックトップを観測するのですか?",
                      "options": [
                        "成功時に和を載せた `Result` の戻り値を通じて。",
                        "`*op2 = ...` を通じて — `op2` はスタックへの可変参照なので、参照経由で書き込むとスタックがその場で書き換わる。",
                        "インタープリターが管理するスレッドローカルなサイドチャネル経由で。",
                        "`popn_top!` の暗黙的な戻り値を通じて、ディスパッチループが読む。"
                      ],
                      "correctIndex": 1,
                      "explanation": "`popn_top!` は `op2` を `&mut U256` としてバインドし、新しいスタックトップ（`op1` を pop した直後の位置）を指する。`*op2 = ...` でその参照経由に書き込むとスタックがその場で書き換わる — メモリ書き込みは1回、pop してから push しません。だからこそ関数の `Result` は成功/失敗だけを運び、データの流れは参照経由で起きるのである。"
                    }
                  ],
                },
                {
                  title: 'レッスン4 — ドリル: インタープリターのソースが読める証明',
                  slug: 'revm-add-opcode-drill-ja',
                  type: 'CONTENT',
                  sortOrder: 4,
                  duration: 12,
                  xpReward: 25,
                  content: `# レッスン4 — ドリル: インタープリターのソースが読める証明

## 問い

\`add\` とマクロは読んだ。**手を引かれずに同じファイルの残りを読める証明 — 別ウィンドウで \`cargo\` を開いた状態で 4 ドリル、どれも「読むだけ」ではなく やる + 観測したことを書き留める。何を観察するか？**

## 原理（最小モデル）

- **セットアップ.** \`git clone https://github.com/bluealloy/revm && cd revm && cargo build\`。
- **4 ドリル.** ① \`mul\` を読み \`add\` と比較、② \`exp\` の動的ガス課金、③ わざとコンセンサスを壊す（\`wrapping_add\` → \`saturating_add\`）、④ \`add\` を計装してデータ流を観察。
- **\`add\` と \`mul\` の構造同一の根拠.** 両方とも 2-stack-in / 1-stack-out / 固定ガス / 副作用なし = 同じ制御フロー形にコンパイル、違うのは \`OP\`（\`wrapping_add\` vs \`wrapping_mul\`）とガス料金（現行両方 3）のみ。
- **\`exp\` が本体課金の理由.** コストが指数バイト単位（実行時値）に依存 → ディスパッチが前払いできない → 本体で \`gas!\` 呼び出し。同パターン: \`sha3\` / \`mload\` / \`call\` 系。
- **コンセンサスを壊す実証.** \`wrapping_add\` を \`saturating_add\` に変更 → \`cargo test -p revm-interpreter\` で数値不一致 → メインネットフォーク。
- **\`eprintln!\` で計装.** \`cargo test -- --nocapture\` で出力可視化、ADD 実行回数を数える、データ流を物理的に観察。

## 具体例

ドリル 3 — コンセンサスを壊す:

\`\`\`bash
# 1. crates/interpreter/src/instructions/arithmetic.rs の add で
#    wrapping_add を saturating_add に変更、保存
# 2. cargo test -p revm-interpreter
# → テスト失敗、数値不一致（panic ではない）
# 3. git checkout crates/interpreter/src/instructions/arithmetic.rs
# 4. cargo test -p revm-interpreter で再びパス確認
\`\`\`

要点 = ライブラリ関数 1 つを書き換えた瞬間、クライアントは \`0xFFF...FF + 1\` の結果について世界中の他 Ethereum クライアントと不一致 = ADD オーバーフローする最初の tx でメインネットからフォーク。

ドリル 4 — 計装:

\`\`\`rust
pub fn add<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
    popn_top!([op1], op2, context.interpreter);
    eprintln!("ADD: {:#x} + {:#x} = ?", op1, *op2);  // ← 追加
    *op2 = op1.wrapping_add(*op2);
    eprintln!("ADD result: {:#x}", *op2);              // ← 追加
    Ok(())
}
\`\`\`

\`cargo test -p revm-interpreter -- --nocapture\` で出力。テストスイート全体で ADD 実行回数を数える = production の現実（mainnet 毎 tx × 数百万ノード × 数年）をターミナルに圧縮。

## 失敗例（誤解）

「\`add\` と \`mul\` が同形なのは『両方算術』だから」— **間違い**。根本理由 = **メカニクス的な同一プロファイル**（2-in / 1-out / 固定ガス / 副作用なし）、このプロファイル合致全 Opcode が同じ制御フロー形にコンパイル。

「\`exp\` は数学が複雑だから本体課金」— **不十分**。根本理由 = **コストがオペランド依存**（指数バイト単位）→ ディスパッチが前払い不能 → 本体で \`gas!\`。\`sha3\` / \`mload\` / \`call\` も同じ理屈。

「\`saturating_add\` 置換ぐらいでメインネットフォークはしない」— **致命的**。**1 tx 分の数値不一致 = state-root 不一致 = ブロック検証失敗 = ピアから切断**。コンセンサスはライブラリ関数 1 つ分の距離で失われる。

## ステップで組み立てる

### Step 1: \`mul\` を \`add\` と比較
構造同一の根拠 = 2-in/1-out/固定ガス/副作用なしプロファイル。

### Step 2: \`exp\` の動的ガス課金
オペランド依存コスト → 本体内 \`gas!\`、同パターンを \`sha3\` / \`mload\` / \`call\` で。

### Step 3: わざとコンセンサスを壊す
\`wrapping_add\` → \`saturating_add\` → test 数値不一致観察 → 戻す。

### Step 4: \`eprintln!\` で計装
\`cargo test -- --nocapture\` で ADD 実行回数を数える、データ流を物理観察。

## 答え合わせ

- **\`add\` と \`mul\` 同形の根拠**: 両方 **2-stack-in / 1-stack-out / 固定ガス / 副作用なし** プロファイル → \`popn_top!([a], b, ctx.interpreter); *b = a.OP(*b); Ok(())\` の同じ制御フロー形。違うのは \`OP\`（\`wrapping_add\` vs \`wrapping_mul\`）とガス料金（現行両方 3）のみ。
- **\`exp\` が本体課金の理由**: コストが **指数オペランドのバイト単位**（実行時値）に依存 → ディスパッチが前払いできない → 本体内オペランド検査後に \`gas!\` 呼び出し。一般化: コストがオペランドに形作られる全 Opcode（\`sha3\` / \`mload\` / \`call\`）は本体内で課金。
- **コンセンサスを壊す変更**: \`wrapping_add\` → \`saturating_add\`、最初のオーバーフロー tx で他クライアントと state-root 不一致 → メインネットフォーク。テスト失敗モード = panic ではなく **数値不一致**（特定の test ケースで期待値と実値が違う）= コンセンサス契約の実装ミスを CI が捕まえる。

## 合格基準

- \`add\` と \`mul\` の構造同一の根拠（2-in/1-out/固定ガス/副作用なし プロファイル）を即答できる。
- \`exp\` が本体課金の理由（オペランド依存コスト）を即答 + 同パターン Opcode 3 つ（\`sha3\` / \`mload\` / \`call\`）を言える。
- \`wrapping_add\` → \`saturating_add\` がコンセンサスを壊す瞬間を即答できる。
- \`cargo test -- --nocapture\` で計装出力を読む手順を言える。

## まとめ（3行）

- 4 ドリル = \`mul\` 構造比較 + \`exp\` 動的ガス + コンセンサスをわざと壊す + \`eprintln!\` 計装、どれも「やる + 観測したことを書き留める」。
- \`add\` と \`mul\` 同形は機構的（2-in/1-out/固定ガス/副作用なしプロファイル）、\`exp\` 本体課金はオペランド依存コスト（同パターン: \`sha3\` / \`mload\` / \`call\`）。
- \`wrapping_add\` → \`saturating_add\` でテスト数値不一致 → コンセンサスはライブラリ関数 1 つ分の距離で失われる、肌で感じてから戻す。
`,
                },
                {
                  title: 'レッスン5 — 命令テーブルをステップで組み立てる',
                  slug: 'custom-opcodes-table-ja',
                  type: 'CONTENT',
                  sortOrder: 5,
                  duration: 10,
                  xpReward: 25,
                  content: `# レッスン5 — 命令テーブルをステップで組み立てる

## 問い

EVM がバイトコード中に \`0x01\` を見たとき、**どんな仕組みで** \`add\` が呼ばれると決まるか？ それがディスパッチ — 1 バイトを 1 関数呼び出しに変換、ホットパスのホットパス。**素朴な \`match\` から本物の 256 スロット const テーブルまで、どう積み上げるか？**

## 原理（最小モデル）

- **本物の形.** \`const fn instruction_table_impl<WIRE: InterpreterTypes, H: Host>() -> InstructionTable<WIRE, H> { let mut table = [Instruction::unknown(); 256]; table[ADD as usize] = Instruction::new(arithmetic::add); ... }\`。
- **5 ステップ積み上げ.** 256 アーム \`match\` → 配列ルックアップ → \`const fn\` → \`Instruction\` 構造体ラップ → 完成形。
- **配列が 256 サイズの理由.** Opcode は 1 バイト = 256 通り、固定サイズ配列が空間網羅、各バイトは Opcode を持つか \`unknown\` にマップ。
- **\`const fn\` の意味.** コンパイル時に評価、構築済みテーブルがバイナリのデータセクションに焼き込まれる、起動コストゼロ、実行時の \`TABLE\` は手書き配列リテラルと同一。
- **\`Instruction\` 構造体ラップ.** ① 将来のメタデータ拡張（gas_cost、name 等）、② 型規律（シグネチャ不一致は代入行でコンパイルエラー）。
- **\`Instruction::unknown()\` 初期化.** 未定義 Opcode が UB や静かな見逃しではなくクリーン \`Unknown\` 停止を生む。

## 具体例

ステップ 0 — 素朴 \`match\`:

\`\`\`rust
fn dispatch(byte: u8, ctx: &mut Context) -> Result {
    match byte {
        0x01 => add(ctx),
        0x02 => mul(ctx),
        // ... アーム 256 個
        _ => return Err(Unknown),
    }
}
\`\`\`

問題: ① ジャンプテーブル変換が LLVM 任せ（保証なし）、② 巨大 \`match\` 編集 UX。

ステップ 1 — 関数ポインタ配列:

\`\`\`rust
let mut table: [fn(&mut Context) -> Result; 256] = [unknown; 256];
table[0x01] = add;
table[0x02] = mul;
fn dispatch(byte: u8, ctx: &mut Context) -> Result {
    (table[byte as usize])(ctx)
}
\`\`\`

インデックス参照 1 回、O(1) 保証、ハッシュなし。Opcode は 1 バイト = 256 通り、固定サイズ配列がバイト空間網羅。

ステップ 2 — テーブルを \`const\` にする:

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

\`const fn\` = コンパイル時に評価可能。コンパイラが \`build_table()\` をコンパイル中に実行、結果配列を凍結してバイナリのデータセクションに焼き込む。**実行時の \`TABLE\` は手書き配列リテラルと同一**、ディスパッチ準備の実行時コストはゼロ。

ステップ 3 — 関数ポインタを構造体で包む:

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

2 利点: ① 将来のメタデータ拡張（\`gas_cost\` / \`name\` 等）をディスパッチシグネチャを変えずに追加、② **型規律** = \`Instruction::new(arithmetic::add)\` は裸の関数ポインタ代入より型安全、シグネチャ不一致は **代入の行** でコンパイルエラー（バグを実行時から構築時へ前倒し）。ジェネリクス \`W: InterpreterTypes, H: ?Sized\` は 2 レッスン前に積み上げた \`IT\` と \`H\` と同形。

ステップ 4 — 完成形:

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

ステップ 5 — 完成形:

\`\`\`rust
const fn instruction_table_impl<WIRE: InterpreterTypes, H: Host>() -> InstructionTable<WIRE, H> {
    use bytecode::opcode::*;
    let mut table = [Instruction::unknown(); 256];

    table[ADD as usize] = Instruction::new(arithmetic::add);
    table[MUL as usize] = Instruction::new(arithmetic::mul);
    table[SUB as usize] = Instruction::new(arithmetic::sub);
    // ... 残り全 Opcode
    table[LT as usize] = Instruction::new(bitwise::lt);
    // ...

    table
}
\`\`\`

Opcode バイトマップ（参考）:

| バイト | Opcode |
| :--- | :--- |
| 0x01 | ADD |
| 0x02 | MUL |
| 0x60–0x7F | PUSH1–PUSH32 |
| 0x80–0x8F | DUP1–DUP16 |
| 0xA0–0xA4 | LOG0–LOG4 |
| **0x0C–0x0F** | **未割当** ← カスタム Opcode のためのギャップ |
| **0x21–0x2F** | **未割当** |

## 失敗例（誤解）

「\`match\` を LLVM が必ずジャンプテーブルに変換する」— **間違い**。「普通」やってくれるがコンセンサス契約に「普通」は載せられない、配列インデックス参照が **O(1) 保証**。

「\`HashMap<u8, Instruction>\` で十分」— **間違い**。ハッシュ計算オーバーヘッド + アロケーション + キャッシュミス、配列が最速。

「裸の \`fn\` ポインタで十分、構造体ラップは飾り」— **間違い**。① 将来のメタデータ拡張、② **型規律** = シグネチャ不一致が代入行でコンパイルエラー、裸 \`fn\` だと実行時まで気付かない。

## ステップで組み立てる

### Step 1: 素朴 \`match\` の 2 問題
ジャンプテーブル保証なし + 巨大 \`match\` 編集 UX。

### Step 2: 関数ポインタ配列
インデックス参照 1 回、O(1) 保証、256 サイズで空間網羅。

### Step 3: \`const fn\` でコンパイル時構築
バイナリのデータセクションに焼き込み、起動コストゼロ。

### Step 4: \`Instruction { fn_ }\` ラップ
将来メタデータ + 型規律（シグネチャ不一致を代入時に検出）。

### Step 5: 完成形
\`const fn instruction_table_impl<WIRE, H>()\` + \`unknown()\` 初期化 + 定義済み Opcode 上書き。

## 答え合わせ

- **配列を \`match\` や \`HashMap\` でなく使う理由**: ① **O(1) 保証**（ハッシュなし、LLVM のジャンプテーブル変換の匙加減なし）、② **256 サイズでバイト空間網羅**、各バイトは定義済み Opcode か \`unknown\` にマップ、形と最悪レイテンシ両方が契約の一部。
- **\`const fn\` の節約**: 実行時にテーブル構築コードは **走らない** = スロットを埋めるシーケンスがコンパイル時に解決、バイナリのデータセクションに焼き込まれた配列リテラルを読むだけ。ディスパッチ準備の起動コストゼロ。
- **\`unknown()\` 初期化の理由**: 未定義バイトがどれも UB や静かな見逃しではなく **クリーン \`Unknown\` 停止** を生む。\`unknown()\` は安全なデフォルト、定義済み Opcode が上書き、意図的な安全選択。

## 合格基準

- 完成形の \`const fn instruction_table_impl<WIRE, H>()\` 4 構成要素を即書ける。
- 配列が 256 サイズである理由（バイト空間網羅 + O(1) 保証）を即答できる。
- \`const fn\` の実行時節約を 1 文で説明できる。
- \`Instruction\` 構造体ラップの 2 利点（メタデータ + 型規律）を言える。
- \`unknown()\` 初期化の安全選択理由を即答できる。

## まとめ（3行）

- 本物の命令テーブル = 256 スロット \`[Instruction; 256]\` 配列 + \`const fn\` でバイナリに焼き込み + \`unknown()\` 初期化 + 定義済み Opcode 上書き。
- 5 ステップ積み上げ（\`match\` → 配列 → \`const fn\` → \`Instruction\` ラップ → 完成形）、各ステップに O(1) 保証 / 起動コストゼロ / 型規律の明確な動機。
- ジェネリクス \`<WIRE, H>\` は前 2 レッスンの \`IT\` と \`H\` と同形 = 1 テーブルで全実行モード × 全ホスト型対応、次レッスンで自前 Opcode を配線。
`,
                },
                {
                  title: 'レッスン6 — カスタム Opcode を配線する — そして失敗モード',
                  slug: 'custom-opcodes-wiring-ja',
                  type: 'CONTENT',
                  sortOrder: 6,
                  duration: 10,
                  xpReward: 25,
                  content: `# レッスン6 — カスタム Opcode を配線する — そして失敗モード

## 問い

Hyperliquid は perp 用オーダーブック専用 Opcode を追加 — 200 命令の Solidity 関数が 1 バイトのネイティブディスパッチに。**配線は 3 行、ショートカットは 100 倍ガス削減。それでも大半のチェーンが 50 個出さない理由は？ オプションではない 3 注意点。**

## 原理（最小モデル）

- **メカニクス 3 行.** 未割当バイト選択 + \`standard_table\` をコピー + 1 スロット上書き = 配線完了、関数は前レッスンの \`add\` と同形。
- **複利的勝ち 2 つ.** ① 内部ステップごとのインタープリターループ オーバーヘッドなし、② Rust 側で SIMD / FFI / 事前計算テーブル利用可能。
- **実利の桁.** 複雑オプションプライサ = Solidity 500K ガス → カスタム Opcode 5K ガス（100 倍）。
- **注意点 1: コンセンサス互換性.** 標準 EVM から外れる → メインネットとブロック共有不可、自前チェーン限定。
- **注意点 2: ガス価格.** 強力ショートカットには適切ガス、誤価格 = DoS ベクター、方法論 = 最悪ケースベンチ + ガス予算変換 + 安全マージン 2-3 倍。
- **注意点 3: 検証性 (ZK).** 新 Opcode の zkVM 統合 = Opcode あたり数週間の追加作業、暗号演算はさらに重い。
- **正しい数.** 各 Opcode はコンセンサスリスク + 価格リスク + 検証コスト = 大半のチェーンの正解は **0-3 個**。

## 具体例

メカニクス:

\`\`\`rust
const HYPER_FAST_SWAP: u8 = 0x0C;

let mut table = standard_table();
table[HYPER_FAST_SWAP as usize] = Instruction::new(my_hyper_fast_swap);
\`\`\`

関数は \`add\` と同形:

\`\`\`rust
pub fn my_hyper_fast_swap<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
    popn_top!([amount_in, pool_id], amount_out, context.interpreter);
    *amount_out = compute_swap_native(*amount_in, *pool_id);
    Ok(())
}
\`\`\`

フロー:

\`\`\`mermaid
flowchart LR
    Std[standard_table — 256スロット] -->|複製| Mine[フォーク用テーブル]
    Mine -->|0x0C を上書き| Custom[my_hyper_fast_swap]
    Bytecode[bytecode 0x0C ...] -->|interpreter dispatch| Mine
    Mine --> Custom
    Custom --> Result[結果がスタックへ]
\`\`\`

ガス価格方法論 3 文:
1. **最悪ケースをベンチ** — 病的入力（最大 pool ID、最大 amount）で実時間測定
2. **ガス予算に変換** — スループット目標を最悪時間で割る
3. **安全マージン 2-3 倍** — 分散・将来のハードウェア変化・あなたのベンチ vs 攻撃者のベンチギャップ

## 失敗例（誤解）

「Revm がモジュラーだからカスタム Opcode は無料」— **間違い**。各 Opcode = コンセンサスリスク + 価格リスク + 検証コスト、大半のチェーンの正解は **0-3 個**。

「自前チェーンならコンセンサス互換性を無視できる」— **そのとおりだが代償**。メインネットとブロック共有不可 = go-ethereum とピア不可能、\`0x0C\` を触る最初の tx で state-root 不一致 → ピア切断。

「ガス価格は試行錯誤で決められる」— **致命的**。誤価格 = DoS ベクター、攻撃者が病的入力を低ガスで実行 = ノードリソース枯渇。**3 文の方法論なしにリリースしない**。

## ステップで組み立てる

### Step 1: 未割当バイト選択
\`crates/interpreter/src/instructions.rs\` で代入の左辺に出現しないバイト = 未割当。

### Step 2: 関数を \`add\` 同形で書く
\`<IT: ITy, H: ?Sized>\` + \`popn_top!\` + その場書き込み。

### Step 3: \`standard_table\` をコピーして 1 スロット上書き
\`table[BYTE as usize] = Instruction::new(my_fn);\` = 配線完了。

### Step 4: 注意点 1 (コンセンサス) を理解
自前チェーン限定、メインネット非互換、ブロック共有不可。

### Step 5: 注意点 2 (ガス価格) の 3 文方法論
最悪ケースベンチ + ガス予算変換 + 安全マージン 2-3 倍。

### Step 6: 注意点 3 (検証性) で ZK ロードマップ確認
zkVM 統合 = Opcode あたり数週間、暗号演算はさらに重い。

## 答え合わせ

- **メカニクスが 3 行で済む構造的理由**: 命令テーブルが **既にディスパッチを抽象化済み**（前レッスン）= 1 スロット上書きで配線完了、関数自体は \`add\` と同形（\`<IT: ITy, H: ?Sized>\` + \`popn_top!\` + その場書き込み）。テーブル設計の合成性が「ディスパッチに触れずに Opcode 追加」を可能にする。
- **100 倍ガス削減の根拠**: 複雑 Solidity 関数 200 EVM 命令 = 200 ディスパッチ + 200 \`gas!\` + スタック移動、カスタム Opcode 1 = 1 ディスパッチ + Rust ネイティブコード（SIMD / FFI / 事前計算テーブル可）。Solidity 500K ガス → カスタム 5K ガス。
- **大半のチェーンの正解が 0-3 個の理由**: 各 Opcode = **3 コスト**（コンセンサスリスク = 実装バグごとにフォーク、価格リスク = 誤価格で DoS、検証コスト = zkVM 統合に数週間）。利益（100 倍ガス削減）と費用（数週間 × 3 リスク領域）のバランスで、ホットパスに集中する 0-3 個が大半のチェーンの最適。

## 合格基準

- メカニクス 3 行（バイト選択 + テーブルコピー + スロット上書き）を即書ける。
- 関数が \`add\` 同形である理由を即答できる。
- 注意点 3 つ（コンセンサス互換性 + ガス価格 + 検証性）を即答できる。
- ガス価格 3 文方法論（最悪ケースベンチ + 予算変換 + 安全マージン）を即答できる。
- 大半のチェーンの正解が 0-3 個の理由を 1 文で説明できる。

## まとめ（3行）

- カスタム Opcode 配線 = 3 行（未割当バイト + テーブルコピー + スロット上書き）、関数は \`add\` 同形（\`<IT: ITy, H: ?Sized>\` + \`popn_top!\`）、Solidity 500K → カスタム 5K ガス（100 倍削減）。
- 注意点 3 = コンセンサス互換性（自前チェーン限定）+ ガス価格（DoS 防止の方法論必須）+ 検証性（zkVM 統合 Opcode あたり数週間）。
- 大半のチェーンの正解 = 0-3 個、各 Opcode の 3 コスト（リスク + 価格 + 検証）がホットパスに集中させる、次レッスンでクイズ + ドリルでフォーク出荷。
`,
                },
                {
                  title: 'クイズ — 命令テーブル + カスタム Opcode',
                  slug: 'custom-opcodes-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 7,
                  duration: 4,
                  xpReward: 25,
                  content: `# クイズ — 命令テーブル + カスタム Opcode

256 スロット const テーブル設計、\`const fn\` のコンパイル時評価、\`unknown()\` 初期化の安全選択、カスタム Opcode 3 注意点（特に暗号演算で zkVM 検証性が支配的）を確認する。

組み立てと配線にまたがる設計判断を問う 4 問。**クイズはうなずきで通せない。** 2 問以上落としたら、ドリルへ進む前に「命令テーブルをステップで組み立てる」に戻ること。
`,
                  quizQuestions: [
                    {
                      "question": "命令テーブルが固定サイズ `[Instruction; 256]` 配列で、`HashMap<u8, Instruction>` でも `match` 文でもないのはなぜですか?",
                      "options": [
                        "HashMap の方が、配列より見つからない Opcode をエレガントに扱える。",
                        "コンパイラは 256 アームの match を、インデックス配列と同等に最適化する — 等価。",
                        "インデックス配列はハッシュ計算もコンパイラ依存のジャンプテーブル変換も伴わずに O(1) ディスパッチを保証し、256スロットでバイト空間を網羅する。",
                        "HashMap はコンパイル時に unsafe。"
                      ],
                      "correctIndex": 2,
                      "explanation": "Opcode バイトは 1 バイト = 256 通り。固定配列はその空間を網羅。インデックス参照は O(1) を保証 — ハッシュなし、`match` がジャンプテーブルになるかどうかというコンパイラの匙加減もなし。各バイトは定義済み Opcode を持つか `unknown` にマップされる。形と最悪レイテンシの両方が契約の一部である。"
                    },
                    {
                      "question": "`instruction_table_impl()` に対して `const fn` は何をしますか?",
                      "options": [
                        "全呼び出し箇所で関数をインライン化することを強制する。",
                        "コンパイラが関数をコンパイル時に評価し、構築済みテーブルをバイナリに直接焼き込み、起動時にセットアップが走らないようにする。",
                        "関数をスレッドセーフとマークする。",
                        "結果のテーブルの実行時改変を無効化する。"
                      ],
                      "correctIndex": 1,
                      "explanation": "`const fn` は「この関数はコンパイル時に評価できる」を意味する。テーブル構築コードはコンパイル中に走り、実行時の `TABLE` は手書きの配列リテラルと同一である。ディスパッチ準備の起動コストがゼロ — それがここで `const fn` を使う狙いそのものである。"
                    },
                    {
                      "question": "なぜ全スロットがまず `Instruction::unknown()` で初期化され、その後で定義済み Opcode が自分のスロットを上書きするのですか?",
                      "options": [
                        "デバッグヒント — `unknown` は単なるプレースホルダ名。",
                        "バイト 0x00–0xFF が全部「安全に停止する」ハンドラにマップされ、未定義 Opcode が静かに飛ばされたりメモリ unsafety を起こしたりしないようにするため。",
                        "Rust の配列初期化構文を満たす唯一の方法だから。",
                        "後で最適化で消される事前確保ステップ。"
                      ],
                      "correctIndex": 1,
                      "explanation": "理由は2つ複合していますが、安全性が支配的: 未定義のバイトはどれも UB や静かな見逃しではなく、クリーンな `Unknown` 停止を生むべきである。`Instruction::unknown()` が安全なデフォルト、定義済み Opcode が上書きする。Rust の配列初期化は確かに全スロット埋める必要はあるが、`MaybeUninit` で先送りもできる — `unknown()` を使うのは意図的な安全選択である。"
                    },
                    {
                      "question": "高コストな暗号演算（例: ペアリング親和的な楕円曲線）を行うカスタム Opcode を出したい。実務上、*最も重い* 注意点はどれですか?",
                      "options": [
                        "コンセンサス互換性 — メインネットとブロックを共有できない。",
                        "ガス価格 — 誤価格なら DoS ベクター。",
                        "zkVM 内での検証性 — 新しい Opcode は zkVM 統合に数週間かかる可能性があり、暗号演算は制約を書くのが特に難しい。",
                        "Rust の型システムの限界。"
                      ],
                      "correctIndex": 2,
                      "explanation": "3つの注意点は全て当てはまりますが、暗号演算では検証性が決定打である。ZK 親和的でない暗号（ペアリング、特定のハッシュ関数）は Opcode あたり数週間の zkVM 仕様作業を要する可能性があります — ガス価格設計やコンセンサス分割の受容より格段に重い。本番チェーンのカスタム Opcode 数が少ないのは、この検証コストに部分的に支配されている。"
                    }
                  ],
                },
                {
                  title: 'レッスン8 — ドリル: フォークを出荷する',
                  slug: 'custom-opcodes-drill-ja',
                  type: 'CONTENT',
                  sortOrder: 8,
                  duration: 12,
                  xpReward: 25,
                  content: `# レッスン8 — ドリル: フォークを出荷する

## 問い

3 行のメカニクスと 3 注意点は読んだ。**自分で配線する — 別ウィンドウで \`cargo\` を立ち上げて、5 ドリル。何を観測するか？**

## 原理（最小モデル）

- **セットアップ.** \`git clone https://github.com/bluealloy/revm && cd revm && cargo build\`。
- **5 ドリル.** ① 未割当バイト探索（レッスンを信用しない）、② 自前 Opcode 定義（\`DOUBLE_TOP\` = 1-in/1-out）、③ テーブルに配線、④ バイトコード実行、⑤ \`eprintln!\` で観察。
- **\`popn_top!([], op, ...)\` パターン.** 空 \`[]\` = pop なし、\`op\` だけがバインドされ現在スタックトップへの \`&mut\`、1-in/1-out/その場書き換え Opcode の表現。
- **\`DOUBLE_TOP\` 実装.** \`*op = (*op).wrapping_mul(U256::from(2));\`、1 命令で「トップを 2 倍」。
- **テスト用バイトコード.** \`PUSH1 0x05 DOUBLE_TOP STOP\` = \`60 05 0C 00\`、5 push → 2 倍 → スタック \`10\` で終わる。
- **\`eprintln!\` 計装.** 1 行のバイトコード \`0x0C\` が 3 行 Rust 関数を起動する因果鎖を物理観察。

## 具体例

ドリル 2 — \`DOUBLE_TOP\` 実装:

\`\`\`rust
const DOUBLE_TOP: u8 = 0x0C;  // 自分が選んだ未割当バイト

pub fn double_top<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
    popn_top!([], op, context.interpreter);
    *op = (*op).wrapping_mul(U256::from(2));
    Ok(())
}
\`\`\`

ドリル 3 — テーブル配線:

\`\`\`rust
let mut table = standard_table();
table[DOUBLE_TOP as usize] = Instruction::new(double_top);
\`\`\`

ドリル 4 — バイトコード:

\`\`\`
PUSH1 0x05  // 5 をスタックに push — バイト: 0x60 0x05
DOUBLE_TOP  // カスタム Opcode — バイト: 0x0C
STOP        // 0x00
\`\`\`

16 進: \`60 05 0C 00\`、最終スタック \`10\`（= 5 × 2）。

ドリル 5 — 計装:

\`\`\`rust
pub fn double_top<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
    popn_top!([], op, context.interpreter);
    let before = *op;
    *op = (*op).wrapping_mul(U256::from(2));
    eprintln!("DOUBLE_TOP: {:#x} -> {:#x}", before, *op);
    Ok(())
}
\`\`\`

\`cargo run\` で \`DOUBLE_TOP: 0x5 -> 0xa\` 1 行 = ディスパッチがあなたの Rust 関数に到達した瞬間の証跡。

## 失敗例（誤解）

「\`popn_top!([op1], op2, ...)\` と \`popn_top!([], op, ...)\` は同じ」— **間違い**。空 \`[]\` = pop なし、\`op\` だけが現在スタックトップへの \`&mut\` = **1-in/1-out/その場書き換え** Opcode の表現（\`add\` は 2-in/1-out）。マクロのアリティマッチャがここで効く。

「メインネットに出荷しても問題ない」— **致命的**。\`0x0C\` を含むブロックを go-ethereum が実行しようとした時点で state-root 検証失敗 → ピア切断、メインネットからフォーク。**自前チェーン限定**。

「\`cargo test\` で出力が見える」— **不十分**。\`-- --nocapture\` フラグが必要、\`cargo\` がデフォルトで \`eprintln!\` 出力を抑制する。

## ステップで組み立てる

### Step 1: 未割当バイト探索
\`crates/interpreter/src/instructions.rs\` でテーブル構築関数の代入左辺に **出現しない** バイトを探す（\`0x0C-0x0F\` 等）。

### Step 2: \`DOUBLE_TOP\` を定義
\`<IT: ITy, H: ?Sized>\` + \`popn_top!([], op, ...)\` + \`wrapping_mul(U256::from(2))\`。

### Step 3: テーブルに配線
\`standard_table()\` をコピー + \`table[DOUBLE_TOP as usize] = Instruction::new(double_top);\`。

### Step 4: テストバイトコード実行
\`60 05 0C 00\` 実行 → スタック \`10\` 確認。

### Step 5: \`eprintln!\` で計装
\`cargo run\` or \`cargo test -- --nocapture\` で因果鎖（バイト 0x0C → Rust 関数）を物理観察。

## 答え合わせ

- **\`popn_top!([], op, ...)\` のメカニクス**: 空 \`[]\` = **pop する値なし**、\`op\` だけが現在スタックトップへの \`&mut\`。1-in/1-out/その場書き換え Opcode（\`add\` の 2-in/1-out との違い）の表現方法。マクロのアリティマッチャが「同じマクロ、異なるスタックプロファイル、関数を二重に書く必要なし」を実現。
- **\`DOUBLE_TOP\` のスタックプロファイル**: **1-in (現トップ) / 1-out (新トップ) / 副作用なし**、その場書き換え。\`add\` （2-in/1-out）よりさらに単純、\`mul\` / \`sub\` 等の 2-in 二項より純粋。
- **メインネットに出荷した瞬間に壊れるもの**: **\`0x0C\` を含む最初のブロック**で他クライアントと state-root 不一致 → ピア切断。go-ethereum は \`0x0C\` を INVALID として実行、あなたの Reth は swap として実行 → ブロックの state-root 検証失敗 → メインネットからフォーク。

## 合格基準

- \`popn_top!([], op, ...)\` と \`popn_top!([op1], op2, ...)\` の構造的違いを即答できる。
- \`DOUBLE_TOP\` のスタックプロファイル（1-in/1-out/副作用なし）を即答できる。
- メインネット出荷時に最初に壊れるもの（\`0x0C\` 含むブロックの state-root 不一致）を即答できる。
- \`cargo test -- --nocapture\` フラグの役割を言える。
- 5 ドリルを通じて「読んだ」から「やった」への遷移を実体験できる。

## まとめ（3行）

- 5 ドリル = 未割当バイト探索 + \`DOUBLE_TOP\` 実装（1-in/1-out）+ テーブル配線 + バイトコード \`60 05 0C 00\` 実行 + \`eprintln!\` 計装。
- \`popn_top!([], op, ...)\` 空ブラケット = pop なし、\`op\` だけが現スタックトップ \`&mut\`、1-in/1-out/その場書き換えの表現。
- スタック \`10\` 確認 → **フォーク出荷完了**、メインネット非互換チェーンを実行、コストを身をもって理解、次は \`Database\` トレイトで状態供給。
`,
                },
                {
                  title: 'レッスン9 — `Database` トレイトを組み立てる — 読み API',
                  slug: 'revm-database-buildup-ja',
                  type: 'CONTENT',
                  sortOrder: 9,
                  duration: 10,
                  xpReward: 25,
                  content: `# レッスン9 — \`Database\` トレイトを組み立てる — 読み API

## 問い

EVM が \`SLOAD\` を実行したとき、値はどこから来るか？ Revm からではない — Revm は **実行エンジン**であり状態は持たない。**\`Database\` トレイトの実装が Revm を何にでも繋ぐ方法 — テスト用 \`HashMap\`、フォークメインネット JSON-RPC、本物 Reth の MDBX、エキゾチック L1 のシャード網。同じ 4 メソッド、4 種バックエンド。どう組み立てるか？**

## 原理（最小モデル）

- **本物の形.** \`#[auto_impl(&mut, Box)] pub trait Database { type Error: DBErrorMarker; fn basic(&mut self, address: Address) -> Result<Option<AccountInfo>, Self::Error>; fn code_by_hash(&mut self, code_hash: B256) -> ...; fn storage(&mut self, address, index) -> ...; fn block_hash(&mut self, number: u64) -> ...; }\`
- **4 ステップ積み上げ.** 素朴版（状態を内部所有）→ トレイト後ろに押し出す（依存性逆転）→ メソッド正しくグループ化（\`basic\` で AccountInfo 束、\`code_by_hash\` 別出し）→ \`Result\` + 関連型 \`Error\` → \`#[auto_impl(&mut, Box)]\`。
- **\`&mut self\` の理由.** キャッシュ変更（ネットワーク実装が読み込み結果をキャッシュ）、\`&self\` だと \`RwLock\` / \`RefCell\` ラップ強制 = オーバーヘッド。
- **\`basic\` が \`AccountInfo\` を返す理由.** balance + nonce + code hash 束 = **1 ラウンドトリップで 3 データ**、\`Option\` で未知アカウントを綺麗にシグナル。
- **\`code_by_hash\` 別出しの理由.** コントラクトコードは **コンテンツアドレス指定**、人気バイトコード（DEX ルーター）が多アドレスで共有 → ハッシュキャッシュで自動デデュプ、実行必要時のみバイト実体化。
- **\`type Error: DBErrorMarker\` の理由.** 各実装が独自エラー型を選べる + Revm が後から制約厳格化（\`Send\` / \`Sync\`）するフック、固定 enum は狭すぎ or 広すぎ。
- **\`auto_impl\` リスト 2 種（\`&mut, Box\`）.** \`Database\` メソッドは \`&mut self\`、\`Arc<T>\` は \`&T\` しか出さないので不可 → \`DatabaseRef\` 仲間トレイトで解決（次レッスン）。

## 具体例

ステップ 0 — 素朴版:

\`\`\`rust
pub struct Revm {
    stack: Vec<U256>,
    storage: HashMap<(Address, U256), U256>,
    accounts: HashMap<Address, AccountInfo>,
}
\`\`\`

問題: フォークメインネット（リモート RPC）/ 本番 MDBX / 独自スキーマ各々で状態取得コード違う → Revm を 3 通りにフォークしたくない。

ステップ 1 — 依存性逆転:

\`\`\`rust
pub trait Database {
    fn storage(&mut self, address: Address, key: U256) -> U256;
    fn balance(&mut self, address: Address) -> U256;
    fn code(&mut self, address: Address) -> Vec<u8>;
    fn block_hash(&mut self, number: u64) -> B256;
}
\`\`\`

インタープリターが \`db: &mut dyn Database\` を取る、ストレージ非所有、誰でも実装可能。\`&mut self\` の理由 = キャッシュ変更（ネットワーク実装が読み込み結果をキャッシュ）、\`&self\` だと \`RwLock\` / \`RefCell\` ラップ強制。

ステップ 2 — メソッドを正しくグループ化:

\`\`\`rust
fn basic(&mut self, address: Address) -> Result<Option<AccountInfo>, Self::Error>;
fn code_by_hash(&mut self, code_hash: B256) -> Result<Bytecode, Self::Error>;
\`\`\`

\`balance\` / \`code\` / \`nonce\` 分離 → 1 アカウント 3 ラウンドトリップ。\`AccountInfo\` で束 → **1 ラウンドトリップで 3 データ**、\`Option\` で未知アカウント綺麗にシグナル。コード本体は \`code_by_hash\` で **コンテンツアドレス指定**、人気バイトコード（DEX ルーター）が多アドレスで共有 → ハッシュキャッシュで自動デデュプ。

ステップ 3 — \`Result\` + 関連型 \`Error\`:

\`\`\`rust
fn basic(&mut self, ...) -> Result<Option<AccountInfo>, Self::Error>;
// ...
type Error: DBErrorMarker;
\`\`\`

ネットワーク実装は失敗する（RPC タイムアウト / MDBX 古いロック / Arc poisoned）。\`Self::Error\` = 各実装が独自エラー型を選べる、\`DBErrorMarker\` は無内容な制約（拡張に開いた接点）、Revm が後から \`Send\` / \`Sync\` 追加するフック。固定 enum だと \`reqwest::Error\` / \`serde_json::Error\` / タイムアウト / パースエラーを潰す羽目 + 新失敗モードごとに Revm PR 必要。

ステップ 4 — \`#[auto_impl(&mut, Box)]\`:

\`\`\`rust
impl<T: Database> Database for &mut T {
    type Error = T::Error;
    fn basic(&mut self, addr: Address) -> Result<Option<AccountInfo>, T::Error> {
        (**self).basic(addr)
    }
    // ... 残り 3 メソッドも全部同じパターン
}
impl<T: Database> Database for Box<T> { /* ... 同じ 4 メソッド ... */ }
\`\`\`

属性なしだと 4 メソッド × 2 ラッパー = 8 個の転送ボイラープレート。\`#[auto_impl(&mut, Box)]\` がこれを自動生成。\`Arc<MyDb>\` 不可（\`Arc<T>\` は \`&T\` のみ、\`&mut self\` メソッド不可）→ 仲間トレイト \`DatabaseRef\` で次レッスンに解決。

ステップ 5 — 本物:

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

## 失敗例（誤解）

「\`&self\` で十分、不変なら」— **間違い**。本物実装（フォークメインネット、RPC バックエンド）はキャッシュ必要 → \`&mut self\` で素直、\`&self\` だと \`RwLock\` / \`RefCell\` 強制 = 各実装に余計オーバーヘッド。共有並列が本当に必要な場合は \`DatabaseRef\`（次レッスン）。

「\`balance\` / \`code\` / \`nonce\` を別メソッドに」— **間違い**。**1 アカウント = 1 ラウンドトリップ**、ネットワーク実装で各々別 RPC = 3 倍レイテンシ。\`basic\` で \`AccountInfo\` を束、code は \`code_by_hash\` で **コンテンツアドレス指定**（自動デデュプ）。

「\`type Error = DatabaseError\` の固定 enum で十分」— **致命的**。\`reqwest::Error\` / \`serde_json::Error\` / ネットワークタイムアウト / パースエラーを閉じた enum バリアントに **潰す** 羽目 + 新失敗モードごとに Revm への PR 必要。**関連型ならあなたのエラーはあなたのもの**。

## ステップで組み立てる

### Step 1: 素朴版（状態内部所有）の 3 問題
フォークメインネット + 本番 MDBX + 独自スキーマで状態取得コード違う、Revm 3 フォーク不可避。

### Step 2: トレイトに押し出す（依存性逆転）
\`db: &mut dyn Database\`、Revm はストレージ非所有、誰でも実装可能。

### Step 3: メソッドを正しくグループ化
\`basic\` で \`AccountInfo\` 束（1 ラウンドトリップ 3 データ）、\`code_by_hash\` 別出し（コンテンツアドレス指定）。

### Step 4: \`Result\` + 関連型 \`Error\`
\`Self::Error: DBErrorMarker\`、各実装独自エラー型、Revm が後から制約厳格化可能。

### Step 5: \`#[auto_impl(&mut, Box)]\`
転送実装自動生成、\`MyDb: Database\` なら \`&mut MyDb\` と \`Box<MyDb>\` も自動実装、ユーザー側ボイラープレートゼロ。

## 答え合わせ

- **\`&mut self\` を選ぶ理由**: 本物実装はキャッシュ必要 = ネットワーク実装が \`storage(addr, key)\` 最初の呼び出しでネットワーク叩き、以降ローカルキャッシュから返す。\`&mut\` でキャッシュ変更を直接、\`&self\` だと \`RwLock\` / \`RefCell\` ラップ強制 = 各実装にオーバーヘッド。共有並列アクセスが必要なケース（並列 EVM、Arc 共有）は \`DatabaseRef\` 仲間トレイト（次レッスン）で別途。
- **\`basic\` と \`code_by_hash\` の分離**: \`basic\` = balance + nonce + code hash 束 = **1 アカウント 1 ラウンドトリップ**、\`Option\` で未知アカウント綺麗にシグナル（\`EXTCODEHASH\` 特殊意味）。\`code_by_hash\` = コンテンツアドレス指定、人気バイトコード（DEX ルーター）が多アドレスで共有 → ハッシュキャッシュで **自動デデュプ**、実行必要時のみバイト実体化。
- **関連型 \`Error\` の必要性**: Revm にあなたのエラー形状は分からない（RPC エラー / ディスク I/O / ロック poison 全部形違う）。固定 enum は **狭すぎ**（本物エラーを潰す）or **広すぎ**（Revm が 50 バリアント処理）。マーカー \`DBErrorMarker\` = 意図文書化 + Revm が後から \`Send\` / \`Sync\` 制約追加するフック、実装を壊さずに拡張可能。

## 合格基準

- 本物の \`Database\` トレイト 4 メソッド + 関連型 \`Error\` + \`auto_impl\` を即書ける。
- \`&mut self\` の理由（キャッシュ + 余計ラップ回避）を 1 文で説明できる。
- \`basic\` / \`code_by_hash\` 分離の 2 利点（1 ラウンドトリップ束 + コンテンツアドレス指定デデュプ）を即答できる。
- 関連型 \`Error\` の必要性を即答できる。
- \`auto_impl(&mut, Box)\` が \`Arc\` を含まない理由（\`&mut self\` メソッド + \`Arc<T>\` は \`&T\` のみ出す）を言える。

## まとめ（3行）

- 本物の \`Database\` トレイト = 4 メソッド（\`basic\` / \`code_by_hash\` / \`storage\` / \`block_hash\`）+ 関連型 \`Error: DBErrorMarker\` + \`#[auto_impl(&mut, Box)]\`。
- 5 ステップ積み上げ = 素朴版（状態内部）→ トレイトに押し出す → メソッドグループ化 → \`Result\` + 関連型 → \`auto_impl\`、各ステップに動機（フォーク / 1 ラウンドトリップ / 拡張可能エラー / 転送ボイラープレートゼロ）。
- \`Arc\` 不可問題（\`&mut self\` + \`Arc<T>\` は \`&T\` のみ）は次レッスンで \`DatabaseRef\` 仲間トレイトが解決。
`,
                },
                {
                  title: 'レッスン10 — 仲間トレイト・最適化・本物の実装',
                  slug: 'revm-database-companions-ja',
                  type: 'CONTENT',
                  sortOrder: 10,
                  duration: 10,
                  xpReward: 25,
                  content: `# レッスン10 — 仲間トレイト・最適化・本物の実装

## 問い

前レッスンで \`&mut self\` を取る 4 メソッド \`Database\` を組み立てた + 宙ぶらりんの問題: \`Arc<MyDb>\` は \`&T\` しか出さない = 並列リーダーは \`Database\` を共有できない。**Revm の 3 追加ピースで解決 — どう？**

## 原理（最小モデル）

- **\`DatabaseRef\` (読み専用仲間).** 4 メソッド同じ + 違い 2 つ: \`&self\` 化 + \`auto_impl(&, &mut, Box, Rc, Arc)\` 5 種（\`Database\` の 2 種に対し）。
- **\`auto_impl\` リスト非対称の根拠.** \`&self\` アクセスは \`&mut self\` より厳密に弱い制約 = \`Arc<T>\` / \`Rc<T>\` は \`&T\` 出すが \`&mut T\` は出さない、機械的帰結。
- **\`DatabaseCommit\` (書き戻し別トレイト).** \`fn commit(&mut self, changes: AddressMap<Account>);\`、\`Database\` から分離する 2 理由。
- **\`DatabaseCommit\` 分離 2 理由.** ① 読み専用 Database（フォークメインネット）が存在 = \`commit\` 実装強制が panic スタブ要求、② ライフサイクル違う（読みは呼び出しごと、commit は tx 終了時）。
- **\`storage_by_account_id\` 最適化.** デフォルト実装が \`account_id\` 無視で \`storage\` に転送、MDBX バックエンド等内部アカウントインデックス持つ実装はオーバーライドでアドレス→ID 検索省略。
- **3 本番実装.** \`InMemoryDB\`（\`HashMap\` 群、~50 行）/ \`AlloyDB\`（JSON-RPC ネットワーク、~150 行）/ \`StateProviderDatabase\`（reth の MDBX、数千行）。
- **メインネットフォークの選択.** \`AlloyDB\`、RPC 遅延取得 + キャッシュ、フルアーカイブダウンロード不要。

## 具体例

\`DatabaseRef\`:

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

\`DatabaseCommit\`:

\`\`\`rust
#[auto_impl(&mut, Box)]
pub trait DatabaseCommit {
    fn commit(&mut self, changes: AddressMap<Account>);
}
\`\`\`

\`storage_by_account_id\` デフォルト実装:

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

3 本番実装:

| 実装 | 場所 | バッキング | 行数 |
| :--- | :--- | :--- | :--- |
| \`InMemoryDB\` | \`crates/database/src/in_memory_db.rs\` | \`HashMap\` 群 | 約50 |
| \`AlloyDB\` | \`crates/database/src/alloydb.rs\` | ネットワーク経由の JSON-RPC | 約150 |
| \`StateProviderDatabase\` | reth: \`crates/storage/storage-api/src/database_provider.rs\` | MDBX、スパースマークル | 数千 |

## 失敗例（誤解）

「\`Database\` だけで \`Arc<MyDb>\` も動く」— **間違い**。\`Database\` メソッド \`&mut self\` + \`Arc<T>\` は \`&T\` のみ → 共有並列で \`Database\` 使用不可。**\`DatabaseRef\` 仲間トレイト + \`auto_impl\` 5 種** で解決。

「\`commit\` を \`Database\` のメソッドに追加で済む」— **間違い**。読み専用 Database（フォークメインネット = RPC から読むだけ、バッキングストアなし）で \`commit\` 強制 = panic スタブ or 嘘メソッド、型汚染。\`std::io::Read\` と \`Write\` の分離と同じパターン。

「メインネットフォークは \`InMemoryDB\` で十分」— **間違い**。メインネット全状態を事前ロード = 非実用的（TB 級アーカイブ）。**\`AlloyDB\` が遅延取得 + キャッシュ**、tx が初触れスロットを上流ノードに問い合わせ、以降キャッシュから返る。

## ステップで組み立てる

### Step 1: \`DatabaseRef\` で読み専用アクセス
4 メソッド同じ + \`&self\` + \`auto_impl(&, &mut, Box, Rc, Arc)\` 5 種で \`Arc\` 対応。

### Step 2: \`auto_impl\` リスト非対称の機械的帰結
\`&self\` < \`&mut self\` 制約強度、\`Arc<T>\` / \`Rc<T>\` は \`&T\` のみ。

### Step 3: \`DatabaseCommit\` で書き戻し分離
読み専用 Database 存在 + ライフサイクル違い（読み = 呼び出しごと、commit = tx 終了時）。

### Step 4: \`storage_by_account_id\` 最適化
デフォルト実装で安全フォールバック、MDBX 等内部 ID 持つ実装はオーバーライドで検索省略 = **パフォーマンスがトレイト API に住む**。

### Step 5: 3 本番実装を読む
\`InMemoryDB\`（50 行 / \`HashMap\`）/ \`AlloyDB\`（150 行 / RPC）/ \`StateProviderDatabase\`（数千行 / MDBX）= 同形 3 世界。

### Step 6: メインネットフォーク用に \`AlloyDB\` 選択
遅延取得 + キャッシュ、フルアーカイブ不要、150 行のグルーコードがフォーク機構の全て。

## 答え合わせ

- **\`DatabaseRef\` \`auto_impl\` リスト 5 種の機械的根拠**: \`&self\` アクセスは \`&mut self\` より **厳密に弱い制約**。\`Arc<T>\` / \`Rc<T>\` は安価で共有可能な \`&T\` を出すが \`&mut T\` は決して出さない → \`DatabaseRef\` はこれら経由で動くが \`Database\` は動かない、設計選択でなく機械的帰結。
- **\`DatabaseCommit\` 分離の 2 理由**: ① **読み専用 Database 存在**（フォークメインネット = RPC から読むだけ、バッキングストアなし）= \`commit\` 強制で panic スタブ要求 or 型汚染、② **ライフサイクル違い**（読み = 呼び出しごと、commit = tx 終了時）= トレイト分離で型システムに強制。\`std::io::Read\` / \`Write\` パターン、混ぜると全読み手が書きを考える羽目。
- **メインネットフォーク用の \`AlloyDB\` 選択**: RPC 経由遅延取得（tx が初触れスロットを上流ノード問い合わせ）+ インメモリキャッシュ = フルアーカイブダウンロード不要。**メインネットフォークの仕組みは結局 \`Database\` を 150 行で実装したグルーコードがすべて**、\`InMemoryDB\` だとメインネット全状態事前ロード（非実用）、\`StateProviderDatabase\` はローカルフル Reth アーカイブ必要。

## 合格基準

- \`DatabaseRef\` / \`DatabaseCommit\` / \`storage_by_account_id\` 3 追加ピースの役割を即答できる。
- \`auto_impl\` リスト非対称（5 種 vs 2 種）の機械的根拠を即答できる。
- \`DatabaseCommit\` 分離 2 理由（読み専用存在 + ライフサイクル違い）を即答できる。
- 3 本番実装（\`InMemoryDB\` / \`AlloyDB\` / \`StateProviderDatabase\`）の用途と行数感を即答できる。
- メインネットフォーク用に \`AlloyDB\` を選ぶ理由を 1 文で説明できる。

## まとめ（3行）

- 3 追加ピース = \`DatabaseRef\`（\`&self\` 読み専用 + \`auto_impl\` 5 種で \`Arc\` 対応）+ \`DatabaseCommit\`（書き戻し分離）+ \`storage_by_account_id\` 最適化（パフォーマンスがトレイト API に住む）。
- 3 本番実装（\`InMemoryDB\` 50 行 / \`AlloyDB\` 150 行 / \`StateProviderDatabase\` 数千行）= 同じ 4 メソッドトレイトで 3 つの全く違う世界、メインネットフォークは \`AlloyDB\`（RPC 遅延取得 + キャッシュ）。
- \`auto_impl\` リスト非対称は設計でなく機械的帰結（\`&self\` < \`&mut self\` 制約強度）、次クイズで全体定着。
`,
                },
                {
                  title: 'クイズ — `Database` トレイト',
                  slug: 'revm-database-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 11,
                  duration: 4,
                  xpReward: 25,
                  content: `# クイズ — \`Database\` トレイト

\`&mut self\` の理由（キャッシュ）、関連型 \`Error\` の必要性、\`auto_impl\` リスト非対称（5 種 vs 2 種）の機械的根拠、3 本番実装からメインネットフォーク用を選ぶ理由を確認する。

組み立てと仲間トレイトにまたがる設計判断を問う 4 問。**クイズはうなずきで通せない。** 2 問以上落としたら、ドリルへ進む前に「\`Database\` トレイトを組み立てる」に戻ること。
`,
                  quizQuestions: [
                    {
                      "question": "`Database` のメソッドが `&self` ではなく `&mut self` を取るのはなぜですか?",
                      "options": [
                        "複数スレッドからの共有並列アクセスを防ぐため。",
                        "実装が内部キャッシュ（例: フォークメインネット実装がネットワーク読み込みの結果をキャッシュする）を RefCell/RwLock のスキャフォールドなしに変更できるようにするため。",
                        "EVM が `Database` メソッド経由で状態を *書く* 必要があるため。",
                        "Rust の制約 — `&self` トレイトは `dyn` 互換にできないため。"
                      ],
                      "correctIndex": 1,
                      "explanation": "`&mut self` で実装はキャッシュを直接変更できる。ネットワーク実装は呼び出し間で RPC 結果をキャッシュしたい; `&self` だと内部可変性スキャフォールド（RwLock/RefCell）を強制する。本当に共有 `&self` アクセスが必要なユーザー（Arc ラップ、並列タスク）には、Revm は仲間トレイト `DatabaseRef` を提供している — 意図的な設計分割。"
                    },
                    {
                      "question": "`Error` がマーカートレイト `DBErrorMarker` で制約された関連型なのはなぜですか?",
                      "options": [
                        "拡張に開いた接点: 各実装が独自のエラー型を選べるが、Revm は後からマーカー経由で制約（Send、Sync）を厳しくでき、実装を壊さない。",
                        "Rust の制約 — トレイトはジェネリックメソッドを持てないため。",
                        "マーカーは無内容な制約; 設計上の目的は無い。",
                        "古い Revm API の後方互換シム。"
                      ],
                      "correctIndex": 0,
                      "explanation": "固定 `enum DatabaseError` だと、`reqwest::Error`、`serde_json::Error`、MDBX エラーなどを閉じたバリアントに潰す羽目になる — そして新しい失敗モードが必要なたびに Revm への PR が必要。関連型ならあなたのエラーはあなたのもの。マーカートレイトは Revm が *制約を厳しくする* ための場所を残す、実装を壊さずに。"
                    },
                    {
                      "question": "`auto_impl` のリストが `DatabaseRef`（`&, &mut, Box, Rc, Arc`）の方が `Database`（`&mut, Box`）より長いのはなぜですか?",
                      "options": [
                        "`Rc` と `Arc` はスレッドセーフではないため、`Database` を実装できない。",
                        "`DatabaseRef` の方が古いため、リストが時間とともに伸びた。",
                        "`Rc<T>` と `Arc<T>` は共有 `&T` アクセスを提供するが `&mut T` は提供できない。`DatabaseRef` のメソッドは `&self` を取るので Rc/Arc 経由で動くが、`Database` の `&mut self` メソッドは動かない。",
                        "`DatabaseRef` は `Send + Sync` を要求するが、`Database` は要求しない。"
                      ],
                      "correctIndex": 2,
                      "explanation": "様式ではなく機械的な帰結。`Arc<T>` は `&T` しか出さない。だから `&self` のみのトレイトは `Arc` 経由で動くが、`&mut self` のトレイトは動かない。長いリストは `DatabaseRef` の読み専用メソッドの帰結 — トレイト自体の設計上の選択ではない。"
                    },
                    {
                      "question": "`InMemoryDB`、`AlloyDB`、`StateProviderDatabase` の中で、「メインネットをブロック N でフォークして任意のトランザクションを走らせる」用途に正しいのはどれですか?",
                      "options": [
                        "`InMemoryDB` — メインネットの全状態を RAM に事前ロード。",
                        "`AlloyDB` — JSON-RPC 経由で状態を遅延取得; 上流ノードが正典。",
                        "`StateProviderDatabase` — 直接 MDBX アクセスにはローカルにフル Reth アーカイブが必要。",
                        "どれでも同じ — 互換的。"
                      ],
                      "correctIndex": 1,
                      "explanation": "`AlloyDB` がこの用途のために作られている — EVM が触れるたびに上流 RPC に状態スロットやアカウントを問い合わせ、キャッシュする。`InMemoryDB` だとメインネット全体の事前ロードが必要（非実用的）。`StateProviderDatabase` には実 Reth ノードを伴うローカル MDBX が必要。"
                    }
                  ],
                },
                {
                  title: 'レッスン12 — ドリル: `ZeroDb` を実装して Revm の状態読みを観測する',
                  slug: 'revm-database-drill-ja',
                  type: 'CONTENT',
                  sortOrder: 12,
                  duration: 12,
                  xpReward: 25,
                  content: `# レッスン12 — ドリル: \`ZeroDb\` を実装して Revm の状態読みを観測する

## 問い

トレイトの形と 3 参照実装は読んだ。**自分のものを作る — 「残高ゼロ、スロットゼロ、コードなし」と常に答える \`Database\` 最小版を 4 メソッドスタブ、Revm に差し込み、tx 走らせ、EVM が実際に発行する読みを観察。何が見えるか？（ネタバレ: 想像より少ない、EVM は状態に対して非常に怠惰。）**

## 原理（最小モデル）

- **\`ZeroDb\` 実装.** \`type Error = std::convert::Infallible\`（失敗できない慣用型）+ 4 メソッド全部 \`Ok(default())\`。
- **4 メソッド戻り値.** \`basic\` → \`Some(AccountInfo::default())\`（残高 0 / nonce 0 / code hash 空）、\`code_by_hash\` → \`Bytecode::default()\`（長さ 0）、\`storage\` → \`StorageValue::ZERO\`、\`block_hash\` → \`B256::ZERO\`。
- **\`basic\` が \`Ok(None)\` でなく \`Ok(Some(AccountInfo::default()))\` の理由.** \`None\` = アカウント不存在シグナル、\`Some(default)\` = 存在するが空 = Ethereum 上の新アカウント挙動と一致。
- **5 EVM 操作の予測.** \`BALANCE\` = 0 / \`SLOAD\` = 0 / \`EXTCODESIZE\` = 0 / コードなし \`CALL\` = 実行なし成功 / \`BLOCKHASH(N)\` = \`B256::ZERO\`。
- **\`SSTORE\` が \`ZeroDb\` メソッドを呼ばない理由.** 書きは \`DatabaseCommit\` 経由（意図的に未実装）、既存値読みは \`storage\`（0 を返す）、新値はジャーナリング層にステージ、\`ZeroDb\` には届かない。
- **計装で観察するもの.** 標準 tx で \`basic(tx.from)\` 1 回 + \`storage(tx.to, 0)\` 1 回 = 2 読み、それで全部、**Revm 周りハーネス全体が見えた**。
- **tx revert vs \`Database::Error\` の違い.** Revert = コンセンサス、Database エラー = インフラ、Revm は \`Self::Error\` を呼び出し元に bubble up（revert 変換せず）、ハーネスがリトライ / ログ / 伝播を選ぶ。

## 具体例

\`ZeroDb\`:

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

Revm に繋ぐ:

\`\`\`rust
use revm::{database_interface::Database, Evm, primitives::*};

fn main() {
    let mut evm = Evm::builder()
        .with_db(ZeroDb)
        .build();

    // PUSH1 0x42 PUSH1 0x00 SSTORE STOP
    let bytecode = hex::decode("604260005500").unwrap();
    let result = evm.transact(&bytecode);
    println!("{:?}", result);
}
\`\`\`

計装版:

\`\`\`rust
fn basic(&mut self, addr: Address) -> Result<Option<AccountInfo>, Self::Error> {
    println!("[ZeroDb] basic({addr})");
    Ok(Some(AccountInfo::default()))
}
fn storage(&mut self, addr: Address, key: StorageKey) -> Result<StorageValue, Self::Error> {
    println!("[ZeroDb] storage({addr}, {key})");
    Ok(StorageValue::ZERO)
}
\`\`\`

\`PUSH1 0x42 PUSH1 0x00 SSTORE STOP\` で観測:
- 送信者の nonce/残高検証で \`basic(tx.from)\` 1 回
- SSTORE 返金会計のためのスロット読み込みで \`storage(tx.to, 0)\` 1 回

合計 2 読み。

## 失敗例（誤解）

「\`SSTORE\` は \`storage\` を呼ぶ」— **間違い**。書きは \`DatabaseCommit\` 経由、\`ZeroDb\` は \`DatabaseCommit\` 未実装 → 書きは到達しない。既存値読みのみ \`storage\`、新値はジャーナリング層にステージ。

「コードなし \`CALL\` は revert する」— **間違い**。EOA への CALL は **有効な Ethereum 操作**、値転送して return、revert なし。

「\`Database::Error\` は revert に変換される」— **間違い**。Revert = **コンセンサス**、Database エラー = **インフラ**、Revm は \`Self::Error\` を呼び出し元に bubble up（revert 変換せず）、ハーネスがリトライ / ログ / 伝播を選ぶ。**だから \`Error\` はあなたの型、Revm のではない**。

## ステップで組み立てる

### Step 1: \`ZeroDb\` 4 メソッドスタブ
全部 \`Ok(default())\`、\`type Error = Infallible\`。

### Step 2: 5 EVM 操作の予測
\`BALANCE\` / \`SLOAD\` / \`EXTCODESIZE\` / コードなし CALL / \`BLOCKHASH\`。

### Step 3: 1-tx ブロック実行
\`PUSH1 0x42 PUSH1 0x00 SSTORE STOP\` = \`604260005500\`、成功確認。

### Step 4: \`println!\` で計装
標準 tx で \`basic(tx.from)\` 1 + \`storage(tx.to, 0)\` 1 = 2 読み観察。

### Step 5: 失敗ドリル（オプション）
\`Infallible\` をカスタムエラー型に置換、特定キーで \`Err\` 返す \`PickyDb\` で revert vs Database エラーの違いを観察。

## 答え合わせ

- **\`basic\` が \`Some(default)\` を返す理由**: \`None\` = アカウント不存在シグナル、\`Some(default)\` = 存在するが空 = **Ethereum 上の新アカウント挙動と一致**。EXTCODEHASH が未知アカウントに特殊な意味を持つので、不存在ではなく空アカウントを返すことが正しいセマンティクス。
- **\`SSTORE\` が \`ZeroDb\` メソッドを呼ばない理由**: SSTORE = **書き**で、読みではない、書きは \`DatabaseCommit\` 経由（\`ZeroDb\` は意図的未実装）。スロット既存値は \`storage\`（0 返す、問題なし）で読まれる、新値 0x42 は Revm のジャーナリング層にステージ → \`ZeroDb\` には届かない、tx 無事 commit。
- **revert vs \`Database::Error\` の違い**: Revert = **コンセンサス**（プロトコル定義の失敗、ガス消費、状態ロールバック）、Database エラー = **インフラ**（RPC タイムアウト / ロック poison / ディスク I/O）。Revm は \`Self::Error\` を呼び出し元に **bubble up**（revert 変換せず）、ハーネスがリトライ / ログ / 伝播を選ぶ。だから \`Error\` はあなたの型、Revm のではない。

## 合格基準

- \`ZeroDb\` 4 メソッドの戻り値を即書ける。
- 5 EVM 操作の予測（\`BALANCE\` / \`SLOAD\` / \`EXTCODESIZE\` / CALL / \`BLOCKHASH\`）を即答できる。
- \`SSTORE\` が \`ZeroDb\` の \`storage\` を呼ばない理由を 1 文で説明できる。
- 標準 tx で観測される 2 読み（\`basic(tx.from)\` + \`storage(tx.to, 0)\`）を即答できる。
- revert と \`Database::Error\` の違い（コンセンサス vs インフラ）を即答できる。

## まとめ（3行）

- \`ZeroDb\` = 「残高ゼロ、スロットゼロ、コードなし」最小実装、4 メソッド全部 \`Ok(default())\` + \`type Error = Infallible\`。
- 計装で観測 = 標準 tx 2 読み（\`basic(tx.from)\` + \`storage(tx.to, 0)\`）、SSTORE は書きなので \`DatabaseCommit\` 経由（未実装）= \`ZeroDb\` に届かない、EVM は状態に対して非常に怠惰。
- Revert（コンセンサス）vs \`Database::Error\`（インフラ）の違い = Revm が bubble up（変換せず）、ハーネスが対応決定 = **だから \`Error\` はあなたの型**。
`,
                },
                {
                  title: 'レッスン13 — Revm 自身のテスト — state test / EOF / execution-spec',
                  slug: 'revm-testing-ja',
                  type: 'CONTENT',
                  sortOrder: 13,
                  duration: 22,
                  xpReward: 45,
                  content: `# レッスン13 — Revm 自身のテスト — state test / EOF / execution-spec

## 問い

インタープリター + 命令テーブル + Database トレイトは歩いた。**Revm チームが「Revm が EVM を正しく実行する」をどう証明しているか？ コンセンサスクリティカルなエンジン = バグ 1 つでチェーン分裂、別の基準で計られる。3 テスト面の役割と境界は？**

## 原理（最小モデル）

- **3 テスト面.** State tests（[\`ethereum/tests\`](https://github.com/ethereum/tests)、複数クライアント横断、pre → tx → post）/ EOF tests（[\`ethereum/tests/EOFTests\`](https://github.com/ethereum/tests/tree/develop/EOFTests)、EOF コンテナ validation）/ execution-spec-tests（[\`ethereum/execution-spec-tests\`](https://github.com/ethereum/execution-spec-tests)、仕様から生成）。
- **State test の形.** JSON 3 セクション = \`pre\`（実行前状態）/ \`transaction\`（適用）/ \`post\`（fork ごとに state-root + logs ハッシュ）。runner = pre 構築 → tx 実行 → post ハッシュ化 → 比較。
- **EOF test の形.** バイトコードの validation 準拠、「validate される」or 「このエラーで reject される」アサーション、構造クリティカル（不正コンテナ accept / 有効 reject はチェーン分裂）。
- **execution-spec-tests の強み.** Python フレームワークで spec-aware DSL で書く → 全 fork に対し具体的 state test 自動生成 → **pass = 構造的に仕様と一致**。
- **3 面の役割分担.** State tests = 実行セマンティクス確定後、EOF tests = コンテナ validation（別クラスバグ）、execution-spec-tests = 仕様変更を最速で捕まえる（EIP draft 段階）。
- **Revm 消費者の教訓.** ① pre → tx → post = EVM 実行の普遍形、② 他リファレンスへの differential（「自分は仕様ではないが一致」）= Building tier の Revm シミュレーション検証パターン、③ 生成テスト ≥ 手書き（仕様が権威時）。
- **Revm が state tests を走らせる必要性.** Revm 埋め込み全クライアントは Revm の正しさを継承 = Revm のバグは全下流クライアントのバグ、エンジン層の規律。

## 具体例

State test JSON:

\`\`\`json
{
  "TestName": {
    "env": { "currentNumber": "...", "currentTimestamp": "...", "currentGasLimit": "..." },
    "pre": {
      "0xAlice": { "balance": "0x..", "nonce": "0x..", "code": "0x..", "storage": {} }
    },
    "transaction": {
      "data": ["0x..."],
      "gasLimit": ["0x..."],
      "to": "0xBob",
      "value": ["0x.."]
    },
    "post": {
      "Cancun": [{
        "hash":   "0x...post-state-trie-root...",
        "logs":   "0x...logs-bloom...",
        "indexes": { "data": 0, "gas": 0, "value": 0 }
      }]
    }
  }
}
\`\`\`

EOF test:

\`\`\`json
{
  "EmptyContainer": {
    "code": "0x",
    "results": { "Cancun": { "exception": "EOFException.MISSING_HEADER" } }
  }
}
\`\`\`

execution-spec-test:

\`\`\`python
@pytest.mark.valid_from("Cancun")
def test_my_opcode(state_test, fork):
    pre = { Address(0x1000): Account(code=Op.MY_NEW_OPCODE + Op.STOP) }
    tx = Transaction(to=Address(0x1000), gas_limit=100_000)
    post = { Address(0x1000): Account(storage={0: 1}) }
    state_test(env=Environment(), pre=pre, post=post, tx=tx)
\`\`\`

3 面の捕まえタイミング:

| 面 | 捕まえタイミング | クラス |
| :--- | :--- | :--- |
| execution-spec-tests | EIP draft branch（活性化前） | 仕様変更 → 自動生成 |
| State tests | fork ロールアウト中 | 確定挙動の正典 |
| EOF tests | 別クラス（構造 validation） | コンテナ形式 |

## 失敗例（誤解）

「3 テスト面は冗長」— **間違い**。**コンセンサス正しさの空間を分割**、execution-spec が仕様変更を最速で捕まえ、state tests が確定挙動を正典化、EOF tests がコンテナ validation を担当、各々別クラスのバグを捕まえる。

「Revm はライブラリだから state tests 走らせる必要なし」— **致命的**。**Revm 埋め込み全クライアント（Reth / Hyperliquid / Tempo / Berachain）は Revm の正しさを継承** = Revm のバグは全下流クライアントのバグ = エンジン層の規律。

「手書きテストで十分」— **間違い**（仕様が権威時）。execution-spec-tests = **テストが仕様から生成** = pass = 構造的に仕様と一致、手書きテストが取り逃すバグを捕まえる。

## ステップで組み立てる

### Step 1: State tests の役割
JSON 3 セクション（pre / tx / post）+ runner（pre 構築 → tx → post ハッシュ比較）= 確定挙動の正典、複数クライアント横断。

### Step 2: EOF tests の役割
バイトコード validation 準拠、構造クリティカル（不正コンテナ accept / 有効 reject はチェーン分裂）。

### Step 3: execution-spec-tests の役割
Python フレームワーク + spec-aware DSL → 全 fork に具体 state test 自動生成 = pass = 仕様一致、最速で仕様変更を捕まえる。

### Step 4: 3 面の役割分担
実行セマンティクス（State）+ コンテナ validation（EOF）+ 仕様変更最速（execution-spec）= **冗長ではなく分割**。

### Step 5: Revm 消費者の教訓
pre → tx → post の普遍形 / differential パターン / 生成 ≥ 手書き。

### Step 6: Revm が state tests 必須の理由
Revm 埋め込み全クライアントが正しさ継承 = エンジン層の規律。

## 答え合わせ

- **3 テスト面が分割する空間**: ① **State tests** = 実行セマンティクス確定後の正典挙動、② **EOF tests** = コンテナ validation（実行前のパース / validate、別クラスバグ）、③ **execution-spec-tests** = 仕様変更を最速で捕まえる（EIP draft 段階で CI が回す）。「ガスコスト変更」を例に: execution-spec が EIP merge 前に捕まえ、State tests が fork ロールアウト中に捕まえ、EOF tests は捕まえない（構造ではない）。
- **execution-spec-tests が「pass = 仕様一致」を保証する根拠**: テストが **spec-aware DSL で書かれ仕様から自動生成** = テスト pass = 構造的に仕様と一致。手書きテストは「自分が書いたものとは一致」しか保証しない、仕様との乖離を捕まえられない。新 EIP（新 opcode / precompile / ガス規則変更）がカバレッジを得る方法。
- **Revm が state tests を走らせる必要性**: Revm は ライブラリだが、**埋め込み全クライアント（Reth / Hyperliquid / Tempo / Berachain）が Revm の正しさを継承** = Revm のバグは全下流クライアントのバグ = mainnet 起動前に互換性報告する必要 = **エンジン層に住む規律**。「ライブラリだから関係ない」が成立しない構造。

## 合格基準

- 3 テスト面（State / EOF / execution-spec）の役割を即答できる。
- State test JSON 3 セクション（pre / tx / post）を即答できる。
- EOF test の構造クリティカル理由を 1 文で説明できる。
- execution-spec-tests が「pass = 仕様一致」を保証する根拠を即答できる。
- Revm 消費者の 3 教訓（pre→tx→post / differential / 生成 ≥ 手書き）を即答できる。
- 「Revm が state tests を走らせる必要性」の根拠（埋め込み全クライアント継承）を 1 文で説明できる。

## まとめ（3行）

- 3 テスト面 = State tests（確定挙動の正典）+ EOF tests（コンテナ validation）+ execution-spec-tests（仕様変更最速、自動生成）= 冗長でなく分割。
- 「pass = 仕様一致」を保証するのは execution-spec-tests（DSL → 仕様から自動生成）、手書きテストは「自分が書いたものとは一致」しか保証しない、新 EIP カバレッジの正規ルート。
- Revm 埋め込み全クライアント（Reth / Hyperliquid / Tempo / Berachain）が正しさ継承 = Revm のバグは全下流バグ = state tests 走らせるのはエンジン層の規律、次は並列実行（block-stm）。
`,
                },
                {
                  title: 'レッスン14 — 並列実行 — 逐次インタープリターループの先へ',
                  slug: 'revm-parallel-execution-ja',
                  type: 'CONTENT',
                  sortOrder: 14,
                  duration: 24,
                  xpReward: 50,
                  content: `# レッスン14 — 並列実行 — 逐次インタープリターループの先へ

## 問い

ここまで実行を逐次として扱った = Reth と revm が現状で出荷、mainnet が 10 年動いてきた形。**そして EVM 性能を縛る最大の天井**。Sei / Monad / MegaETH / Aptos が並列 EVM を出荷済み、Reth 自身も実験的並列パスを持つ。**block-stm パターン + \`Database\` トレイトへのマッピング、どう動くか？**

## 原理（最小モデル）

- **逐次の天井.** mainnet ブロック ~200 tx、衝突する（互いが読む slot に書く）のは **約 10-20%** = 残り 80% は意味的理由なしに逐次、これが並列 EVM が狙う賞品。
- **block-stm（block-level Software Transactional Memory）.** Aptos が Move 向けに導入、Sei が EVM に移植、Monad / MegaETH 採用。
- **アルゴリズム 4 ステップ.** ① N tx を並列で投機実行（複数 worker）、② 各 tx 中に read set + write set 記録、③ commit 順検証（tx i の read set が早い tx j > j の write set と重なるなら i 再実行）、④ N tx 全部逐次順 valid まで検証 + 再実行繰り返し。
- **楽観的並行制御.** 衝突は稀と仮定、衝突しない 80% は並列で 1 回、衝突する 20% は逐次再実行、正味 3-8 倍スループット（ワークロード次第）。
- **\`Database\` トレイトへのマッピング.** \`basic\` / \`storage\` 呼び出しが read-set entry、state 変更が write-set entry、tracker = 標準 \`Database\` をラップ。
- **\`TrackedDatabase\` 構造.** \`inner: D\` + \`read_set\` + \`read_accounts\`、\`storage()\` 等のオーバーライドで read 記録 → \`inner\` 委譲、**executor / インタープリター書き換え不要**。
- **本番複雑さ 6 領域.** Write set 伝播（MVCC）+ 再実行順序（thrash 防止）+ Read/write set 推定（実行後にしか分からない）+ Hot コントラクト（避けられない直列化）+ ガス会計（再実行で総ガス増）+ 決定論（並列 worker が毎回正確に同じ state root）。
- **チェーン別ステータス.** Sei v2 デフォルト並列 / Monad 初日から / MegaETH ターゲット / Reth 実験的 / mainnet 逐次（コンセンサスリスクと TVL）。

## 具体例

\`TrackedDatabase\`:

\`\`\`rust
pub struct TrackedDatabase<D: Database> {
    inner: D,
    read_set: HashSet<(Address, StorageKey)>,
    read_accounts: HashSet<Address>,
}

impl<D: Database> Database for TrackedDatabase<D> {
    type Error = D::Error;
    fn storage(&mut self, addr: Address, key: StorageKey) -> Result<StorageValue, Self::Error> {
        self.read_set.insert((addr, key));
        self.inner.storage(addr, key)
    }
    // basic / code_by_hash / block_hash も同様に track
}
\`\`\`

100 tx ブロック例（90 独立 + 10 sandwich-arb 同 pool）:

| パス | tx | 結果 |
| :--- | :--- | :--- |
| 投機並列 1 | 90 独立 | 1 パス目で全部 commit |
| 投機並列 1 | 10 sandwich | 9 個が古い read set 検出 |
| 再実行波 1-2 | 10 sandwich | 逐次 commit |

総 wall-clock = 1 並列パス + 2 小再実行波（100 逐次ステップでなく）= 衝突はコストになるが比例的にしか効かない。

## 失敗例（誤解）

「並列 EVM = インタープリター書き換え」— **間違い**。**\`Database\` トレイトの合成性で executor / インタープリター不変**、tracking-wrapper パターンで read/write track、これが「\`Database\` トレイトの形が重く報われる」場所。

「mainnet が並列実行に保守的なのは技術的問題」— **間違い**。**コンセンサスリスク + TVL（$400B+）**、並列バグは全ノード同時影響でチェーン分裂 = mainnet には取れない賭け、新チェーン（Sei / Monad / MegaETH）は TVL 低いところから始め速く iterate できる。

「block-stm は hot コントラクトを並列化できる」— **間違い**。同じ pool への全 sandwich tx は **避けられない直列化** = block-stm は助けない、悪化させないだけ、修正はアプリケーション層（複数 pool / AMM 再設計）。

## ステップで組み立てる

### Step 1: 逐次の天井を理解
mainnet ブロック ~200 tx、衝突 10-20%、残り 80% は意味的理由なしに逐次。

### Step 2: block-stm アルゴリズム 4 ステップ
投機並列 + read/write set 記録 + commit 順検証 + 再実行ループ。

### Step 3: 楽観的並行制御の数字感覚
衝突しない 80% は並列 1 回、衝突する 20% は逐次再実行、正味 3-8 倍。

### Step 4: \`Database\` トレイトへのマッピング
\`TrackedDatabase\` でラップ、\`basic\` / \`storage\` を track、**executor 不変**。

### Step 5: 本番複雑さ 6 領域
MVCC + 再実行順序 + set 推定 + hot コントラクト + ガス会計 + 決定論。

### Step 6: チェーン別ステータス読み解き
Sei / Monad / MegaETH 並列、Reth 実験的、mainnet 逐次（TVL + コンセンサスリスク）。

## 答え合わせ

- **\`Database\` トレイトが並列実行を可能にする理由**: トレイトの **合成性** = \`TrackedDatabase\` で標準 \`Database\` をラップ、\`basic\` / \`storage\` 呼び出しを track（read-set entry）、\`inner\` に委譲。**executor / インタープリターは書き換え不要**、ラッパーが read 記録すれば任意のコードが並列で動く。これが「\`Database\` トレイトの形が重く報われる」場所、設計時点では並列実行を考えていなくても合成性が後から賞金を返す。
- **block-stm が 3-8 倍スループットを出す根拠**: mainnet ブロック ~200 tx で衝突 10-20%、残り 80% は独立 = 投機並列で 1 パス目に commit、衝突する 20% は再実行で逐次にコスト払う、正味 wall-clock = 1 並列パス + 小再実行波（200 逐次ステップでなく）。ワークロード次第で 3-8 倍、衝突多いほど効果薄い。
- **mainnet が並列実行に保守的な理由**: **コンセンサスリスク + TVL**。並列実行のバグは全ノード同時影響でチェーン分裂、mainnet には $400B+ 載っている = 取れない賭け。新チェーン（Sei / Monad / MegaETH）は TVL 低いところから始め速く iterate できる、同じコード同じリスクプロファイル違う失敗コスト。

## 合格基準

- block-stm 4 ステップ（投機並列 + set 記録 + commit 順検証 + 再実行ループ）を即答できる。
- 楽観的並行制御の数字（衝突 10-20% / 残り 80% / 正味 3-8 倍）を即答できる。
- \`TrackedDatabase\` の構造（\`inner\` + \`read_set\` + \`read_accounts\`）と executor 不変の根拠を即答できる。
- 本番複雑さ 6 領域を即答できる。
- mainnet vs Sei / Monad / MegaETH の保守性差（TVL + コンセンサスリスク）を 1 文で説明できる。

## まとめ（3行）

- block-stm = 楽観的並行制御（投機並列 → set 記録 → 検証 → 再実行ループ）、mainnet 衝突 10-20% / 残り 80% 並列 = 正味 3-8 倍スループット。
- \`Database\` トレイトの合成性で \`TrackedDatabase\` ラッパーが read 記録、**executor / インタープリター不変** = トレイト設計の合成性が後から並列化の道を開く。
- 本番複雑さ 6 領域（MVCC / 再実行順序 / set 推定 / hot コントラクト / ガス会計 / 決定論）、mainnet 保守的は TVL + コンセンサスリスク、Sei / Monad / MegaETH は速く iterate、次は JIT/AOT で同じ天井を別角度から attack。
`,
                },
                {
                  title: 'レッスン15 — インタープリターの先へ — revmc による JIT/AOT コンパイル',
                  slug: 'revm-jit-aot-revmc-ja',
                  type: 'CONTENT',
                  sortOrder: 15,
                  duration: 16,
                  xpReward: 40,
                  content: `# レッスン15 — インタープリターの先へ — revmc による JIT/AOT コンパイル

## 問い

ここまで revm を **インタープリター** として扱った = Opcode → Rust 関数 → ループ、通常 mainnet 負荷には十分速い。**MegaETH 等 6 桁 TPS チェーンではインタープリターループ自体がボトルネック**、抜け穴 = インタープリトをやめてコンパイルする。Paradigm の [\`revmc\`](https://github.com/paradigmxyz/revmc) は revm 上に乗る = どう動くか？

## 原理（最小モデル）

- **revmc は revm の置き換えではない.** revm の上の層、インタープリターは依然として **コンパイラが一致しなければならない仕様**、コンパイル失敗は revm にフォールバック。
- **JIT vs AOT.** 目的地同じ（ネイティブ機械語）、タイミング違う。JIT = 実行時最初の呼び出しでコンパイル + code hash でキャッシュ、AOT = 既知ホット bytecode を事前にコンパイルしてバイナリ同梱。
- **3 困難.** ① ガス会計の決定論性（LLVM 最適化が壊しうる）、② EVM スタック/メモリモデル非ネイティブ（U256 はレジスタに収まらない）、③ 副作用（SLOAD / SSTORE / CALL）はホスト呼び出し。
- **ガス計測明示 IR の重要性.** revmc は各 Opcode のガス差し引きを明示的 IR（load → sub → compare → conditional branch to OutOfGas）で出力、**オプティマイザに推論させない**、観測可能な書きだから最適化で消せない。
- **コンパイル済み EVM が C 並みに速くない理由.** EVM はスタックマシン + 256-bit ワード、U256 はネイティブレジスタに収まらない、算術 Opcode が load-load-op-store のシーケンスに下がる、勝ちは「ディスパッチループがなくなる + オプティマイザが Opcode 越しに見える」。
- **副作用 = revmc-builtins ランタイム呼び出し.** SLOAD / SSTORE / CALL 等は不透明な副作用ありの呼び出し、LLVM は並べ替えない、ホスト環境（Database 実装）にルーティング。
- **\`JitEvm\` 統合点.** \`crates/revmc-context\` の \`JitEvm\` が \`EvmTr\` ベース EVM をラップし \`frame_run\` を上書き、code hash がコンパイル済みマップにあれば直接ディスパッチ、なければ on_miss フック or revm インタープリターフォールバック。
- **AOT vs JIT 選択.** AOT = ホットセット既知（システムコントラクト / WETH / DEX ルーター）+ 起動レイテンシ予測可能 / JIT = ホットセット負荷依存（汎用 RPC / インデクサ）+ コンパイルコスト稼働時間で償却。

## 具体例

\`JitEvm\`（概念）:

\`\`\`rust
pub struct JitEvm<EVM, F = ...> {
    inner: EVM,
    functions: B256Map<RawEvmCompilerFn>, // code hash -> compiled fn
    on_miss: F,                            // optional JIT-on-the-fly hook
}
\`\`\`

ガス計測 IR の出方:

\`\`\`
; 概念図 — 各 Opcode が明示的 IR を出力
%gas_remaining = load i64, ptr %gas_remaining_addr
%new_gas = sub i64 %gas_remaining, 3       ; ADD のコスト
%underflow = icmp slt i64 %new_gas, 0
br i1 %underflow, label %OutOfGas, label %Continue
\`\`\`

オプティマイザは:
- %gas_remaining への書きを **観測可能** とみなす → デッドストア除去不可
- \`OutOfGas\` 分岐は **実装の責任** → 投機実行で消せない
- \`gas_metering: bool\` 設定フラグでオフ可能（速いがコンセンサス外、オフチェーン再実行向け）

3 困難の解決:

| 困難 | 解決 |
| :--- | :--- |
| ガス会計決定論性 | 明示的 IR（load → sub → compare → branch）、観測可能で最適化で消せない |
| EVM スタック非ネイティブ | コンパイル済み関数にヒープ確保スタック/メモリを渡す、U256 算術は load-load-op-store |
| 副作用 | revmc-builtins へのランタイム呼び出し、LLVM は不透明とみなし並べ替えない |

## 失敗例（誤解）

「revmc は revm の置き換え」— **間違い**。revmc は **revm の上の層**、インタープリターは依然として仕様、コンパイル失敗 / 非対応 Opcode / デバッグビルドは revm インタープリターフォールバック = 「コンパイル経路が間違っている」失敗モードはない、最悪「コンパイル経路が取られない」だけ。

「ガス計測は LLVM に任せれば最適化される」— **致命的**。LLVM の通常最適化（デッドストア除去 / 定数畳み込み / ループ不変コード移動）が **コンセンサスを壊す**。ガス計測を明示 IR にして観測可能化、**オプティマイザに推論させない**。

「コンパイル済み EVM = コンパイル済み C と同速」— **間違い**。EVM はスタックマシン + 256-bit ワード、U256 はネイティブレジスタに収まらない、算術が load-load-op-store のシーケンスに下がる、勝ちは「ディスパッチループ消失 + Opcode 越し最適化」、ネイティブコード並みではない。

## ステップで組み立てる

### Step 1: revmc は revm の上の層
インタープリターは仕様、コンパイル失敗時フォールバック。

### Step 2: JIT vs AOT のタイミング
JIT = 実行時 + code hash キャッシュ、AOT = 事前にバイナリ同梱。

### Step 3: 3 困難を理解
ガス会計決定論 + EVM スタック非ネイティブ + 副作用ホスト呼び出し。

### Step 4: ガス計測明示 IR の規律
load → sub → compare → branch、観測可能で最適化で消せない、\`gas_metering: bool\` でオフ可。

### Step 5: 副作用 = revmc-builtins ランタイム呼び出し
不透明な副作用、LLVM 並べ替え不可、ホスト環境（Database 実装）にルーティング。

### Step 6: \`JitEvm\` 統合点 + AOT vs JIT 選択
\`frame_run\` 上書き + code hash マップ + on_miss フック、AOT = 既知ホット / JIT = 負荷依存。

## 答え合わせ

- **revmc がガス計測を意図的に明示 IR にする理由**: LLVM 通常最適化がコンセンサスを壊しうる（デッドストア除去 → MSTORE のメモリ拡張ガスコスト消失、定数畳み込み → ガス課金回数不一致、ループ不変コード移動 → GAS Opcode の観測値変化）。明示 IR の \`load → sub → compare → branch\` で **書きを観測可能化**、オプティマイザは観測不能と証明できない限り消せない、ほぼ常に観測可能。
- **revmc と revm の統合境界**: \`crates/revmc-context\` の \`JitEvm\` が \`EvmTr\` ベース EVM をラップし \`frame_run\` を上書き = フレームが始まると code hash 引く → 事前コンパイル済みマップにあればコンパイル済み関数に直接ディスパッチ、なければ \`on_miss\` フック（JIT-on-the-fly）or revm インタープリターフォールバック。**インタープリターはセーフティネット**、コンパイル失敗時に静かに流れる、「コンパイル経路間違い」失敗モードはない。
- **コンパイル済み EVM が C 並みに速くない 2 理由**: ① **U256 はネイティブレジスタに収まらない** = 算術 Opcode が load-load-op-store のシーケンスに下がる、ネイティブ \`u64 a + b\` は 1 命令、コンパイル済み EVM U256 同等は数命令、② **EVM スタック/メモリは別領域** = コンパイル済み関数にヒープ確保のスタック/メモリを渡す、EVM スタックをネイティブレジスタにマップしない。勝ちはインタープリターループ消失 + オプティマイザが Opcode 越しに見える、ネイティブコード並みではない。

## 合格基準

- revmc が revm の置き換えではない（上の層 + フォールバック）ことを即答できる。
- JIT vs AOT のタイミング差を即答できる。
- 3 困難（ガス会計 / EVM スタック / 副作用）と各解決を即答できる。
- ガス計測明示 IR の根拠（最適化で消せない観測可能性）を 1 文で説明できる。
- \`JitEvm\` 統合点（\`frame_run\` 上書き + code hash マップ + フォールバック）を即答できる。
- AOT vs JIT 選択基準（ホットセット既知 vs 負荷依存）を 1 文で説明できる。

## まとめ（3行）

- revmc = revm の上の層（インタープリターは仕様 + フォールバック）、JIT（実行時 + キャッシュ）+ AOT（事前バイナリ同梱）、目的地はネイティブ機械語。
- 3 困難の解決 = ガス計測明示 IR（最適化で消せない観測可能）+ ヒープ確保 EVM スタック（U256 はレジスタに収まらない）+ revmc-builtins 不透明ランタイム呼び出し（LLVM 並べ替え不可）。
- \`JitEvm\` が \`frame_run\` 上書き + code hash マップ、AOT = 既知ホット（システム / WETH / DEX）+ JIT = 負荷依存（汎用 RPC）+ 両方使う本番高スループット L1（MegaETH 等）、次はファイナルクイズ。
`,
                },
                {
                  title: 'クイズ — Inside Revm 完走',
                  slug: 'revm-advanced-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 16,
                  duration: 8,
                  xpReward: 25,
                  content: `# クイズ — Inside Revm 完走

3 トピックチェーン（インタープリター / 命令テーブル / Database）+ テスト + 並列 + JIT/AOT の構造的事実を確認する。3 中級コース（Revm・Reth・Alloy）完走に向けたゲート。

3 問。**クイズはうなずきで通せない。** 2 問落としたら、Inside Revm を「完了」と称する前に該当する積み上げレッスンを読み直してほしい。
`,
                  quizQuestions: [
                    {
                      "question": "Revm の `crates/interpreter` が責任を持つのはどれですか?",
                      "options": [
                        "EVM の型システムプリミティブ (Address、U256、B256) の定義",
                        "各 EVM Opcode の Rust 実装",
                        "Database トレイトと state 供給インターフェースの保持",
                        "実行時の命令ディスパッチテーブルの構築"
                      ],
                      "correctIndex": 1,
                      "explanation": "`crates/interpreter` は Opcode ごとの実装を持つ: ADD、MUL、PUSH、JUMP、SLOAD、SSTORE など。(プリミティブは `crates/primitives` にある。Database トレイトは `crates/database-interface`。ディスパッチテーブルは実行時ではなくコンパイル時に構築される。) 実行時ディスパッチを推測した方は、カスタム Opcode のレッスンを読み直すこと。"
                    },
                    {
                      "question": "Revm ベースのフォークにカスタム Opcode を追加すると、実際に何ができますか?",
                      "options": [
                        "標準 Opcode (ADD など) の結果計算をすべてのクライアントに対して上書きする",
                        "自前のチェーンで高速な単一命令ショートカットを提供する — メインネットとはコンセンサス互換性はない",
                        "メインネットの任意の Solidity コントラクトから固定アドレスで呼べる precompile を追加する",
                        "フォークなしで同じ Opcode のガスコストを下げる"
                      ],
                      "correctIndex": 1,
                      "explanation": "カスタム Opcode は未割当バイト (例: 0x0C) を占める。メインネットはあなたの Opcode を知らないので、それを使うブロックは go-ethereum でリプレイできない。ショートカットは *自分のフォーク内で* 本物。Precompile は別の仕組み (予約済みアドレス、新しい Opcode バイトではない)。コンセンサスをフォークせずにガスコストを下げることはできない。"
                    },
                    {
                      "question": "Revm の `Database` トレイトの主な役割は:",
                      "options": [
                        "EVM の状態変更を背後のストレージに commit して戻すこと",
                        "実行に必要なアカウント情報・コントラクトコード・ストレージスロット・過去のブロックハッシュを供給すること",
                        "ガス会計のホットパスを処理すること",
                        "Opcode バイトから関数へのディスパッチテーブルを提供すること"
                      ],
                      "correctIndex": 1,
                      "explanation": "Database は読み側の状態源。書きは DatabaseCommit を通る。ガス会計はインタープリター内部。ディスパッチは命令テーブル。Database 実装を差し替えれば、EVM をインメモリデータ・JSON-RPC (フォークメインネット)・本番 MDBX・他のあらゆるバックエンドの上で動かせる。"
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
