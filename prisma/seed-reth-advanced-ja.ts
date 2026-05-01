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
      duration: 180,
      xpReward: 350,
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
                  title: 'インタープリターを読む',
                  slug: 'revm-interpreter-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 15,
                  xpReward: 30,
                  content: `# インタープリターを読む

[\`bluealloy/revm\`](https://github.com/bluealloy/revm) の中に入ります。重要なのは \`crates/interpreter\` フォルダ — EVMの命令（Opcode）がRustで一つずつ実装されている場所です。

このレッスン: 本物の \`add\` Opcode と、それを呼ぶディスパッチループを読む。コードは3行。1行あたり半ページの含意。**読むのは簡単。身につけるのがこのレッスン。**

## 全体像

\`\`\`
revm/
├── crates/
│   ├── interpreter/        ← 今ここ
│   │   ├── src/
│   │   │   ├── instructions/
│   │   │   │   ├── arithmetic.rs   ← ADD, MUL, SUB, ...
│   │   │   │   ├── stack.rs        ← PUSH, POP, DUP, SWAP
│   │   │   │   ├── memory.rs       ← MLOAD, MSTORE, ...
│   │   │   │   ├── macros.rs       ← gas!, popn_top!, push! ...
│   │   │   │   └── ...
│   │   │   └── interpreter.rs
│   ├── primitives/         ← Address, U256, B256
│   ├── database-interface/ ← Database トレイト
│   └── precompile/         ← 組み込み precompile 群
\`\`\`

> 📂 **今、別タブでリポジトリを開いてください。** 開かずにこの先を読まないこと。以下のすべての主張は、実ファイルで確認しながら読むためにあります。

## 本物の \`add\` Opcode

[\`crates/interpreter/src/instructions/arithmetic.rs\`](https://github.com/bluealloy/revm/blob/main/crates/interpreter/src/instructions/arithmetic.rs) より：

\`\`\`rust
pub fn add<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
    popn_top!([op1], op2, context.interpreter);
    *op2 = op1.wrapping_add(*op2);
    Ok(())
}
\`\`\`

3行。**ぼんやり読むと6つ取りこぼします。**

> 🛑 **スクロールする前に、それぞれ一文で答えてください：**
> 1. なぜジェネリクス \`IT\` がここに必要か? 削除したら何が変わる?
> 2. なぜ \`H\` に \`?Sized\` が付いている? \`?\` を取るとなぜビルドが壊れる?
> 3. 関数本体は結果をどこにも明示的に返していない。EVM はどこで新しいスタックトップを観測しているのか?
>
> 答えに「分からない」「トレイト関係」が混じったら、シグネチャをもう一度読んでから先へ。**スクロールで通過しないことがこのレッスンの全てです。**

---

### \`<IT: ITy, H: ?Sized>\`

- \`IT\` は **interpreter-types** マーカー。コンパイル時に実行モードを選ぶ：通常実行・トレース・サンドボックス（Inspector）。同じ \`add\` がモードごとに別バイナリにコンパイルされる。**\`IT\` がなければ \`add\` を3回書くことになる。**
- \`?Sized\` は \`H\` から暗黙の \`Sized\` 制約を **外す** 指定。\`?\` がないと \`H\` はコンパイル時にサイズ確定の具象型でなければならない。\`?\` 付きで \`H\` は \`dyn Host\`（コンパイル時にはサイズ未知のトレイトオブジェクト）になれる。これが \`&mut dyn Host\` を渡せる唯一の理由。

> 🔍 **\`revm/src/host.rs\` を開いて、\`dyn Host\` が実際に作られている箇所を1つ見つけてください。** これが見つからないなら、ジェネリクスはあなたにとって雑音のまま。見つけてから次へ。

### \`popn_top!([op1], op2, context.interpreter)\`

マクロ。定義は \`instructions/macros.rs\` にあります：

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

> 🛑 **解説を読む前に予測してください：**
> - \`popn_top!([op1], op2, ctx.interpreter)\` を呼んだとき、このマクロは何に展開される? 紙でもいいので書き出して。
> - \`cold_path()\` をエラー側で呼んでいる理由は? 生成されるアセンブリに何をしている?
> - \`unsafe\` の中の \`unwrap_unchecked()\` — 未定義動作にならない正確な条件は何?

---

歩く：

- \`$($x:ident),*\` はカンマ区切りの識別子リストにマッチ。\`[op1]\` の場合、要素は1つ。展開は \`op1\`（pop された値）と \`op2\`（新しいスタックトップへの可変参照）のバインディングを作る。
- \`cold_path()\` は LLVM への「この分岐は統計的にレア」というヒント。コンパイラはレアパスのコードをホットな命令キャッシュから外す。**正味の効果: ハッピーパスがキャッシュ温度を保ったまま、1本の直線アセンブリになる。**
- \`unwrap_unchecked()\` は実行時の \`Some\` チェックをスキップ。直前で \`if stack.len() < ...\` のガードを通過済みなので、値が \`Some\` であることは静的に保証されている。\`unsafe\` ブロックの契約は *「自分でチェック済みだから、二重チェック不要」*。ガードを消した瞬間、即座に未定義動作。

> 🛑 **理解度チェック。** スクロールせずに：なぜコンパイラが冗長な \`Some\` チェックを最適化で除去できず、\`unwrap_unchecked\` を使う必要があるのか? 自分の言葉で説明してください。
>
> 説明できないなら、マクロをまだ理解していません — 読み直し。

### \`*op2 = op1.wrapping_add(*op2)\`

\`op2\` は **新しいスタックトップへの可変参照**（\`op1\` を pop した直後の状態）。この行は *参照経由で* 結果を直接書き込む — メモリ書き込みは1回、pop-add-push の3回ではない。

\`wrapping_add\` は mod 2²⁵⁶ の加算。EVM の \`ADD\` はオーバーフロー時に panic ではなく wrap が要求される。

> 🛑 **予測。** \`U256::MAX.wrapping_add(U256::from(1))\` は16進で何になる?
>
> 答えが \`0x0\`（または \`U256::ZERO\`）でなかったら、止まる。EVM のコンセンサスはこの正確な挙動に依存しています。自前の実装で間違えたら、そこでチェーンがフォークします。

## \`gas!\` マクロ

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

\`popn_top!\` と同じ構造パターン: チェック → 失敗側に cold ヒント → 早期リターン。ガスを引き、払えなければ崖から落ちる。

> 🔍 **\`gas!\` が \`add\` の本体で呼ばれていないのはなぜ?** \`arithmetic.rs\` を開いて確認。仮説を立ててから、\`interpreter.rs\` で定数ガスのオペコードがどこで課金されるか探す。**このレッスンの言葉を信用せず、ソースで検証してください。**

## ディスパッチはどこにある?

\`\`\`mermaid
flowchart LR
    PC[interpreter.pc] -->|byte 取得| Op[opcode 0x01]
    Op -->|添字で| Table["[Instruction; 256]"]
    Table --> Fn[fn add ctx]
    Fn -->|popn_top!| Stack[Stack op1 / op2 top]
    Fn -->|wrapping_add| Stack
    Fn --> PC
\`\`\`

各 Opcode はバイト値で添字される関数ポインタ。ディスパッチループは \`pc\` から1バイト取得、\`[Instruction; 256]\` テーブルを引き、呼ぶ。**\`match\` 文もコンパイラが作るジャンプテーブルもなく、コンパイル時に組まれた関数ポインタの配列だけ。**

> 🔍 **続ける前に、自分でトレースしてください。** リポジトリで：
>
> 1. \`crates/interpreter/src/instructions/mod.rs\` を開く — 何が宣言されている?
> 2. \`[Instruction; 256]\` テーブルが構築される場所を探す（検索: \`Instruction;\` または \`instruction_table\`）
> 3. インデックス \`0x01\` の関数ポインタは何? \`add\` であることを確認。
>
> テーブルを見つけられなかったら、インタープリターのディスパッチをまだ理解していません。見つけずに先に進まないこと。

## 練習

読むのはリハーサル。次は順番に手を動かす：

1. **\`mul\` を探す。** \`add\` と全く同じ形で \`wrapping_mul\` を使っているはず。**なぜ** この2つの Opcode が行数まで構造的に同一なのか? 自分の言葉で答えてから次へ。
2. **\`exp\` を探す。** 長い。**動的な** ガスコストがどこで計算されているか探す（ヒント: 関数本体の途中の \`gas\` 呼び出し、エントリーではない）。なぜ \`exp\` は動的課金で、\`add\` はディスパッチ時の定数課金なのか?
3. **わざとコンセンサスを壊す。** ローカルで \`add\` を \`saturating_add\` に書き換える。ビルドしてテストスイートを走らせる。テストが落ちるのを見る。**これでコンセンサスがライブラリ関数1つ分の距離でフォークすることの実証データを得た。**

---

ここまで来れば、Solidity 開発者の 99% より EVM ソースを多く読んだことになります。**より重要なのは、それを証明できること** — 上の予測/想起プロンプトに、スクロール戻しなしで自分の言葉で答えられること。答えられなければ、このレッスンはまだあなたを離しません。`,
                },
                {
                  title: 'カスタムOpcodeの設計空間',
                  slug: 'custom-opcodes-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 12,
                  xpReward: 25,
                  content: `# カスタムOpcodeの設計空間

HyperliquidやTempoが「Revmはモジュラーだから選んだ」と言うとき、その目玉機能こそ **カスタムOpcode追加**。このレッスン: どこにフックされ、何のコストで何を買えるか、そして「モジュラー」が隠している失敗モード。

> 🛑 **スクロールする前に予測。** ソースを見ずに、Revm が Opcode を関数にディスパッチする方法をスケッチしてください：
> - \`match\` 文? \`HashMap<u8, fn>\`? 配列? それ以外?
> - **どれを選んだとして、なぜそれが効く?** 違う形を選ぶと何のコストが付く?
>
> 予想を保持。直後に本物の実装で答え合わせします。

## 本物の命令テーブル

[\`crates/interpreter/src/instructions.rs\`](https://github.com/bluealloy/revm/blob/main/crates/interpreter/src/instructions.rs) より：

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
    table[MOD as usize] = Instruction::new(arithmetic::rem);
    table[SMOD as usize] = Instruction::new(arithmetic::smod);
    // ...

    table[LT as usize] = Instruction::new(bitwise::lt);
    table[GT as usize] = Instruction::new(bitwise::gt);
    table[EQ as usize] = Instruction::new(bitwise::eq);
    table[AND as usize] = Instruction::new(bitwise::bitand);
    // ...
}
\`\`\`

予測と比較。3つの細部が場所代を稼いでいる — ただし「なぜ」を擁護できる場合に限る：

### \`const fn\`
テーブルは **コンパイル時に構築**。ディスパッチ準備の実行時コストはゼロ。

> 🛑 **理解度チェック。** スクロールせずに：\`const fn\` を \`fn\` に置き換えると、**正確に何が変わる**? 「実行時で遅くなる」は受け売り。具体的に — 何が、どれくらいの頻度で、追加で走る?

### \`[Instruction::unknown(); 256]\`
バイト 0x00〜0xFF は全部最初「unknown opcode」(EVMをエラー停止)。定義された Ethereum オペコードだけが本物の実装で自分のスロットを上書きする。

### \`Instruction::new(arithmetic::add)\`
各スロットは型付き関数ポインタ。Opcode バイト = 配列インデックス。**ディスパッチはインデックス参照1回、それで終わり。**

## Opcodeバイトマップ

クイックリファレンス（[\`bytecode::opcode\`](https://github.com/bluealloy/revm/blob/main/crates/bytecode/src/opcode.rs) より）：

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
| **0x0C–0x0F** | **未割当** ← カスタムOpcodeを入れる場所 |
| **0x21–0x2F** | **未割当** |

> 🔍 **信用せず、検証してください。** リポジトリで \`bytecode::opcode\` を開く。\`0x0C\` が **あなたが実際にフォークするバージョンで** 本当に未割当か確認。レッスン内の表はスナップショット、契約ではありません — ハードフォークごとに隙間は動きます。

## カスタム Opcode を配線する

未割当バイトを取り、関数を割り当てる：

\`\`\`rust
const HYPER_FAST_SWAP: u8 = 0x0C;

let mut table = standard_table();
table[HYPER_FAST_SWAP as usize] = Instruction::new(my_hyper_fast_swap);
\`\`\`

\`my_hyper_fast_swap\` は前のレッスンの \`add\` と全く同じ形：

\`\`\`rust
pub fn my_hyper_fast_swap<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
    popn_top!([amount_in, pool_id], amount_out, context.interpreter);
    *amount_out = compute_swap_native(*amount_in, *pool_id);
    Ok(())
}
\`\`\`

\`\`\`mermaid
flowchart LR
    Std[standard_table 256スロット] -->|複製| Mine[フォーク用テーブル]
    Mine -->|0x0C を上書き| Custom[my_hyper_fast_swap]
    Bytecode[bytecode 0x0C ...] -->|interpreter dispatch| Mine
    Mine --> Custom
    Custom --> Result[結果がスタックへ]
\`\`\`

## 実利 — そして対価

複利的に効く2つの勝ち：

1. **インタープリターループのオーバーヘッドが激減** — 複雑なSolidity関数が200 EVM命令でも、1カスタムOpcodeなら1ディスパッチ。
2. **Rust側ではSIMD・FFI・事前計算済みテーブルが使える** — バイトコードからは触れない武器。

複雑なオプションプライサーが **Solidityの500Kガス → カスタムOpcode 1つの5Kガス** に落ちる例。

> 🛑 **失敗モードを予測。** あなたは明日カスタム Opcode をリリースします。**雑に扱った場合に発生する3つの問題** をリストアップ。リストを保持して、下の注意点と比較。

### 注意点 — オプションではない

1. **コンセンサス互換性**: 標準EVMから外れると、他の Ethereum クライアントとブロックを共有できない。**自前のチェーンでのみ有効**。この Opcode 入りでメインネットからフォークして go-ethereum とピアしたら、\`0x0C\` を触る最初のトランザクションで即切断。
2. **ガス価格**: 強力なショートカットには適切なガスコスト設定が必要 — さもないと DoS ベクター。**\`my_hyper_fast_swap\` のガス価格をどう導出する?** 3 文で方法論を書けないなら、この Opcode を安全にリリースできません。
3. **検証性**: ZK証明を載せるなら、各 Opcode を zkVM 内で証明可能にする必要がある。**Opcode あたり数週間の追加作業**になる可能性。

## 練習

1. リポジトリで \`instructions.rs\` を開く。テーブル代入に **登場しない** スロットを探して、未割当バイトを特定。(上の表を信用せず、実際のフォーク対象コードで検証。)
2. 1つ選ぶ。定数を定義。
3. \`add\` と同じシグネチャで **2倍乗算** をする関数を実装：\`*op2 = (*op2).wrapping_mul(U256::from(2))\`
4. \`table[YOUR_OPCODE as usize] = Instruction::new(your_fn);\` を追加
5. その Opcode を使うバイトコードをエンコードして EVM で実行。**フォークが完成。**

> 最終チェック: この Opcode を載せたチェーンが、なぜメインネットコンセンサスに参加できないか、一文で説明してください。説明できないなら、注意点 #1 に戻る — このレッスンはまだあなたを離しません。`,
                },
                {
                  title: 'Databaseトレイト — 状態をどう供給するか',
                  slug: 'revm-database-trait-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 12,
                  xpReward: 25,
                  content: `# Databaseトレイト — 状態をどう供給するか

Revmは「実行エンジン」ですが、**状態（State）そのものは持っていません**。状態への読み書きは外部の \`Database\` トレイトを通じて行います。これを実装すれば、何でも繋げられる — インメモリ Map、フォークしたメインネット、独自MDBXスキーマ、リモートノード網など。

> 🛑 **スクロールする前に予測。** Revm が状態ストアに必要とする **最小の API** を、見ずに書き出してください。メソッド数は? シグネチャは?
>
> ヒント: 状態に触る各 Opcode を考える。\`SLOAD\`, \`BALANCE\`, \`EXTCODESIZE\`, \`BLOCKHASH\` — それぞれを満たすために何を聞く必要がある? 下書きを持ってからスクロール。

\`\`\`mermaid
sequenceDiagram
    participant Op as Opcode（例: SLOAD）
    participant I as Revm Interpreter
    participant DB as Database トレイト実装
    participant State as 裏側のストア

    Op->>I: storage[addr][key] が必要
    I->>DB: storage(addr, key)
    DB->>State: 検索
    State-->>DB: U256 値
    DB-->>I: Ok(value)
    I-->>Op: スタックに push
\`\`\`

Opcode は store を直接触らない — トレイトしか知らない。実装を差し替えれば現実が変わる：インメモリ、フォークしたメインネット、MDBX、RPC。同じ Revm、違う現実。

## 本物のトレイト — 一字一句そのまま

[\`crates/database/interface/src/lib.rs\`](https://github.com/bluealloy/revm/blob/main/crates/database/interface/src/lib.rs) （現 main）から：

\`\`\`rust
#[auto_impl(&mut, Box)]
pub trait Database {
    type Error: DBErrorMarker;

    fn basic(&mut self, address: Address) -> Result<Option<AccountInfo>, Self::Error>;

    fn code_by_hash(&mut self, code_hash: B256) -> Result<Bytecode, Self::Error>;

    fn storage(&mut self, address: Address, index: StorageKey)
        -> Result<StorageValue, Self::Error>;

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

    fn block_hash(&mut self, number: u64) -> Result<B256, Self::Error>;
}
\`\`\`

> 🛑 **予想と比較。** 何を取りこぼした? もっと重要なのは、**ここに無いけど予想にあったのは何?**
>
> \`set_storage\` がない。\`set_balance\` がない。\`commit\` がない。**読み API と書き API が別トレイトに分割されているのはなぜ?** どんな設計上の制約に応えているのか?

### 3つの注目ポイント

- **\`#[auto_impl(&mut, Box)]\`** — \`auto_impl\` クレートが \`&mut T\` と \`Box<T>\` の \`Database\` 実装を自動生成。\`&mut my_db\` でも \`Box::new(my_db)\` でもそのまま渡せる。

> 🛑 **理解度チェック。** 頭の中で \`#[auto_impl]\` 属性を消してください。さて: \`Database\` を期待する関数に \`&mut MyDatabase\` を渡すには、ユーザーは何を手書きする? \`impl<T: Database> Database for &mut T\` のブロックをスケッチ。書けないなら、このマクロはあなたにとってまだ雑音 — 手書きの実装を書いてから次へ。

- **\`type Error: DBErrorMarker\`** — 各実装が自分のエラー型を持てるが、マーカートレイト実装は強制。なぜマーカーで、固定の enum じゃないのか? Revm はあなたのカスタムエラー（ネットワーク失敗、MDBX エラー、RPC タイムアウト）を、自分の閉じた分類に閉じ込めずに合成する必要があるから。

- **デフォルト実装付きの \`storage_by_account_id\`** — 最近の最適化。アカウントを特定済みなら内部 ID を渡してアドレス検索をスキップ。デフォルト実装は \`storage\` に転送。**パフォーマンスがトレイト API の設計レベルで考慮されている。**

> 🔍 **呼び出し側を探す。** Revm の中で \`storage_by_account_id\` が \`storage\` の代わりに実際に呼ばれている箇所はどこ? \`crates/handler/\` を検索。オーバーライドで得をするのは Database 作者か、それとも Revm 自身か?

## 仲間のトレイト — 読みと書きの分離

\`\`\`rust
#[auto_impl(&mut, Box)]
pub trait DatabaseCommit {
    fn commit(&mut self, changes: AddressMap<Account>);
    // ...
}

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

| トレイト | 用途 |
| :--- | :--- |
| \`Database\` | 通常実行（\`&mut self\` — 内部キャッシュ可） |
| \`DatabaseRef\` | 共有・不変ビュー — \`&self\` なので \`Arc\` で包んで並列タスクに分配可能 |
| \`DatabaseCommit\` | オプション：書き戻しパス、\`commit_state\` で使用 |

> 🛑 **予測。** \`DatabaseRef\` の \`auto_impl\` リスト（\`&, &mut, Box, Rc, Arc\`）は \`Database\` のリスト（\`&mut, Box\`）より長い。なぜ? この非対称は、各トレイトが実際にどう使われているかについて何を語っているか?

## 読むべき実装

| 実装 | 場所 | 読むタイミング |
| :--- | :--- | :--- |
| \`InMemoryDB\` | \`crates/database/src/in_memory_db.rs\` | 最小 \`HashMap\` ベース。おもちゃ版 |
| \`AlloyDB\` | \`crates/database/src/alloydb.rs\` | JSON-RPCで取得 — フォークメインネットの典型 |
| \`StateProviderDatabase\` | reth: \`crates/storage/storage-api/src/database_provider.rs\` | 本番のMDBXバックエンドReth実装 |

「おもちゃ → ネットワーク → 本番」の順で読むと、同じトレイトが 50 行から数千行まで、どうスケールするかが見える。

## 練習

「残高ゼロ・コードなし・スロット0」を返すだけの \`Database\` を実装：

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

> 🛑 **繋ぐ前に予測。** \`ZeroDb\` で実際に失敗するバイトコードは? 成功するバイトコードは?
>
> 具体的に: コードのないアドレスへの \`CALL\` は何が起きる? 未初期化スロットからの \`SLOAD\` は EVM に何を見せる? どのアカウントへの \`BALANCE\` も tx は revert する?

これを Revm に繋いで 1 tx ブロックを実行。すべてゼロを読んでも EVM はきれいに動く。**これで Revm 周りのハーネス全体が見えました — 他の Database はこれに本物のデータを足しただけ。**

> 最終チェック: なぜ Revm は読み (\`Database\`) と書き (\`DatabaseCommit\`) を別トレイトに分割するのか、一文で答えてください。答えられないなら、トレイトの reveal に戻る — 要点を取り逃しています。`,
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

Staged SyncはRethの背骨です。「1ブロックずつ処理」ではなく、同期を複数のステージに分割し、各ステージがブロック範囲に対して動く設計。各ステージは1つのトレイトを実装したRust型です。本物を読みましょう。

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

**対称性に注目**：すべてのステージが \`execute\` と \`unwind\` の両方を持つ。reorgは特殊ケースではなく **通常運用**。前進＝範囲に対して \`execute\`、後退＝範囲に対して \`unwind\`。**同じトレイトで2方向**。

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

## \`#[auto_impl(Box)]\` のメリット

オーケストレータはステージを \`Box<dyn Stage<...>>\` で保持し、混在リストを持てる。\`auto_impl\` がなければ手動で全メソッドをbox越しに転送する必要がある。

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

各ステージは別ファイル；上記トレイトを実装。1つ開く（\`SenderRecoveryStage\` が最も読みやすい）と全形が見えます：\`execute\` がブロック範囲を読み、処理し、範囲尽きるまで \`done: false\` でcheckpointを返す。

## 練習

\`reth\` リポジトリで \`crates/stages/stages/src/stages/sender_recovery.rs\` を開く：

1. \`execute\` メソッドを探す
2. **バッチループ** を見つける — 一度に全部ではなくチャンクで処理
3. \`done: false\` と \`done: true\` を返す箇所を比較
4. 並列化に注目 — \`SenderRecoveryStage\` はRayonでCPUコアを使い倒す

これで Paradigm が Reth を同期させているのと **同じコード** を読めるようになりました。`,
                },
                {
                  title: 'Rust：ライフタイム・Box・Arc・dyn Trait',
                  slug: 'rust-lifetimes-arc-dyn-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 15,
                  xpReward: 30,
                  content: `# Rust：ライフタイム・Box・Arc・dyn Trait

ExEx・Reth SDKのコードを読むのに必要な、Rustの **「上級だが実は単純」** な4つの機能を整理します。

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

### \`'static\`

\`'static\` は **「プログラム終了まで生きる」** という特別なライフタイム。文字列リテラル \`"hello"\` の型は \`&'static str\` です。

\`\`\`rust
let s: &'static str = "hello";
\`\`\`

ExExなど **「いつ終わるか分からないバックグラウンドタスク」** には \`'static\` 制約が頻出します。

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

- \`Node: FullNodeComponents\` ：トレイト境界
- \`ExExContext<Node>\` ：ジェネリック型
- 内部では \`Arc<...>\` でコンポーネントが共有
- ライフタイムの注釈は省略されているが、内部では \`'static\` が要求される

## まとめ

| 機能 | 一言 |
| :--- | :--- |
| \`'a\` / \`'static\` | 借用がどれだけ生きるか |
| \`Box<T>\` | ヒープ確保 |
| \`Rc<T>\` / \`Arc<T>\` | 所有権の共有（Arcはスレッド対応） |
| \`Mutex<T>\` | 共有データの書き換え |
| \`dyn Trait\` | 実行時のメソッド解決 |

これらは「読めれば書ける」段階に入る上で必須の道具立てです。次のExExレッスンでまさに使われている姿を見ていきましょう。`,
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

### \`FinishedHeight\` イベント

\`\`\`rust
if let Some(committed_chain) = notification.committed_chain() {
    ctx.events.send(ExExEvent::FinishedHeight(committed_chain.tip().num_hash()))?;
}
\`\`\`

これがRethに「このブロックハッシュまで処理したから、それより古い履歴は私には不要」と伝えます。送らないと **Rethは何も捨てられない**（ExExが何を読みたいか分からないから）。

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

## 練習

1. \`reth-exex-examples\` を clone、同期済みノードに対して \`minimal\` を実行
2. \`ChainCommitted\` アームを修正し、各ブロックの **トランザクション数** を出力：\`new.tip().body.transactions.len()\`
3. \`HashMap<Address, u64>\` を追加し、各アドレスが何txを送ったかカウント — reorgを正しく扱う（\`ChainReverted\` で減算、\`ChainCommitted\` で新チェーンを再加算）

これが動けば、ノード速度のインデクサを書けたことになります。`,
                },
                {
                  title: 'Reth SDK — App-chainを作る',
                  slug: 'reth-sdk-appchain-ja',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 12,
                  xpReward: 25,
                  content: `# Reth SDK — App-chainを作る

ExExは既存のEthereumノードを拡張しますが、Reth SDKは **コンポーネントを組み立てて自前のApp-chain** をRustで構築できる仕組み。

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

これが動くチェーンバイナリ。チェーン内の4つの呼び出しを読み解く：

### \`.with_types::<EthereumNode>()\`
**型バンドル** を選択 — chain spec、primitives（block・tx・header型）、engine API。\`EthereumNode\` がデフォルトを提供；\`OpNode\`、独自型、任意の \`NodeTypes\` impl に置換可能。

### \`.with_components(...)\`
カスタマイズの中核。基本セット（\`EthereumNode::components()\`）を取って各ビルダーを上書きする：

- \`.pool(CustomPoolBuilder::default())\` — カスタムトランザクションプール（例ではこれ）
- \`.network(...)\` — カスタムP2P
- \`.payload(...)\` — カスタムブロックビルダー
- \`.executor(...)\` — カスタムEVMエグゼキュータ（カスタムOpcode/precompileがここに入る）
- \`.consensus(...)\` — カスタムコンセンサス

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

- **Hyperliquid HyperEVM** — HyperBFT + カスタム実行 + オーダーブック直結DB
- **Tempo** — 支払い特化の優先レーン
- **Berachain (bera-reth)** — Proof of Liquidity コンセンサス

これらは1つ以上の \`with_components\` ビルダーを自前のものに差し替えています。上記の枠組みが彼らの拡張ベース。

## 練習

1. \`reth\` をclone、\`cd examples/custom-node-components\`
2. \`CustomPoolBuilder\` を読む — \`PoolBuilder\` をどう実装してプールを差し替えているか
3. **プールに入る各トランザクションのガス価格をログ出力** するように変更
4. dev chain に対して \`cargo run\`。カスタムログが発火するのを観察

これで1行のコンポーネント差し替えで動くものを出せました。同じパターンをconsensusやexecutorに拡大すればHyperEVMクラスのインフラ。`,
                },
                {
                  title: 'Expert ティアへの橋渡し',
                  slug: 'reth-bridge-to-expert-ja',
                  type: 'CONTENT',
                  sortOrder: 4,
                  duration: 10,
                  xpReward: 20,
                  content: `# Expert ティアへの橋渡し

**Alloy → Revm → Reth（Staged Sync、ExEx、カスタム NodeBuilder）** の階段を上ってきました。3プロジェクトすべてのソースコードを「目的を持って」読める段階です。

しかし「読める」は半分。**Expert** ティアは「読める」から「**本番に出せる**」への跳躍です。

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

Advanced は **構造** を教えました。Expert はその構造の **背後にある決定** を教えます：

- *なぜ* Reth は MDBX で、RocksDB ではないのか？（コンパクションストールでの読み取りレイテンシ）
- *なぜ* Revm は pop / pop / push ではなく1つpopして参照経由で書き戻すのか？（ADD あたりメモリ書き込み1回減）
- *なぜ* \`Database::tx()\` に \`#[track_caller]\` が必要か？（パニックがバグった呼び出し元を指す、トレイトではなく）
- *なぜ* Foundry の cheatcodes は Opcode ではなく precompile なのか？（バニラEVMとのコンセンサス互換性）

この *なぜ* を内部化できれば、Paradigm のエンジニアや Hyperliquid の validator 運用者と設計判断を議論できる — それが grant 応募可能な仕事への入口です。

## 進む前に

自分の言葉で説明できるか確認：

1. \`popn_top!\` が何をしていて、*なぜ* \`unwrap_unchecked()\` を使っているか
2. \`Database\` と \`DatabaseRef\` がなぜ別トレイトに分かれているか
3. \`ExExEvent::FinishedHeight\` が Reth の pruner に何を伝えるか

ぼんやりしている項目があれば、Expert に進む前に該当の Advanced レッスンを再読してください。Expert は密度が高く、リンクされたコードをローカルで実行しながら読むのが効果的です。

> インフラレイヤーの学習は、最初の3ヶ月が一番苦しいです。ドキュメントが不十分なことも多く、**「ソースコードこそが最強の教科書」**。Expert はこの教訓が報われるティアです。`,
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
                      question: 'Revmの `crates/interpreter` フォルダで主に行われていることは？',
                      options: [
                        'ブロックの同期とP2P通信',
                        'EVMのOpcodeをRustで一つずつ実装している',
                        'JSON-RPCサーバーの定義',
                        'コンセンサスのリーダー選出',
                      ],
                      correctIndex: 1,
                      explanation: 'crates/interpreterはADD・MUL・PUSH・JUMPなど、各Opcodeの実行ロジックが集まる場所です。',
                    },
                    {
                      question: 'Revmに「カスタムOpcodeを追加する」ことの意味として正しいのは？',
                      options: [
                        'メインネットEthereumで自分専用の高速命令を使える',
                        '自前のチェーン上で標準EVMにない高速処理を1命令で呼べるようになる',
                        'GethのバージョンをRustに置き換えられる',
                        'Solidityの構文を変えられる',
                      ],
                      correctIndex: 1,
                      explanation: 'カスタムOpcodeはコンセンサス互換性を破るためメインネットでは使えませんが、自前のApp-chain上では強力な最適化手段になります。',
                    },
                    {
                      question: 'Revmの `Database` トレイトの主な役割は？',
                      options: [
                        'EVMの実行を直接コミットする',
                        'EVMが必要なときにアカウント情報・コード・ストレージスロット・過去ブロックハッシュを供給する',
                        'P2Pネットワークを管理する',
                        'ガス代の計算アルゴリズムを差し替える',
                      ],
                      correctIndex: 1,
                      explanation: 'Databaseトレイトは「状態の供給元」を抽象化します。インメモリ・RPCバックエンド・本番ストレージなどを差し替え可能にします。',
                    },
                    {
                      question: 'RethのStaged Syncの利点として正しいのは？',
                      options: [
                        'Gethと完全に互換性があり同じデータベースを使える',
                        'ブロックを「ステージごと」にまとめて処理することで、I/OやCPUの効率を最大化する',
                        'すべてのブロックを並列に検証して時間順序を破る',
                        'ZK証明がなくても動く',
                      ],
                      correctIndex: 1,
                      explanation: 'Staged SyncはHeaders→Bodies→Senders→Execution→Merkle…の順に「範囲をまとめて」処理する設計で、巨大状態を捌く鍵となります。',
                    },
                    {
                      question: 'ExEx（Execution Extensions）でできることの説明として正しいのは？',
                      options: [
                        'メインネットノード自体のコンセンサスを書き換える',
                        'ブロックがコミット／reorg／巻き戻しされたときに、ノードプロセス内でRustコードを実行できる',
                        'ガス代を払わずに任意のSolidityを実行できる',
                        'EthereumのRPCをすべて廃止する',
                      ],
                      correctIndex: 1,
                      explanation: 'ExExは ChainCommitted / ChainReorged / ChainReverted の通知を受け、低レイテンシーで処理を行うフックです。インデクサーやMEVツールに最適です。',
                    },
                    {
                      question: 'Reth SDKを使うことで、自前のApp-chainで「典型的にカスタマイズされる」要素は？',
                      options: [
                        'Solidityコンパイラのバージョンのみ',
                        'EVM設定（Opcode・ガス）、コンセンサス、ストレージ、RPC',
                        'Webブラウザの種類',
                        'TypeScriptの型定義',
                      ],
                      correctIndex: 1,
                      explanation: 'Reth SDKでは、EVMConfig・Consensus・Storage・Network・RPCなど、ノードを構成する主要コンポーネントを差し替えられます。',
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
