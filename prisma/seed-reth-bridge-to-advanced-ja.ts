import { PrismaClient } from '@prisma/client';

export async function seedRethBridgeToAdvancedJA(prisma: PrismaClient) {
  const tags = ['reth', 'revm', 'evm', 'rust', 'bridge'];

  await prisma.course.create({
    data: {
      slug: 'reth-bridge-to-advanced-ja',
      title: 'スタックを読む — Advanced への橋渡し',
      description:
        'Fundamentals は終えた。でも Advanced のソース読みは依然として圧倒的。このコースがそのギャップを埋めます。EVM をバイト単位で（ディスパッチループ・ワールドステート・コールフレーム・reorg）、そして Reth/Revm のソースが暗黙の前提とする中級 Rust（generics・dyn・Arc・unsafe・macro_rules）。',
      difficulty: 'INTERMEDIATE',
      duration: 180,
      xpReward: 200,
      track: 'reth-bridge-to-advanced',
      tags,
      isPublished: true,
      sortOrder: 250,
      locale: 'ja',
      instructorName: 'RethLab',
      modules: {
        create: [
          {
            title: 'EVM をバイト単位で',
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: 'Solidityからバイトコードへ — ディスパッチループ',
                  slug: 'bytecode-dispatch-loop-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 12,
                  xpReward: 25,
                  content: `# Solidityからバイトコードへ — ディスパッチループ

Solidity を書いてきた。Foundry でデプロイとテストもした。でも、デプロイ後の EVM は **実際に何をやっているのか?** このレッスンは1段階下のレイヤー — バイトの世界 — に降りていきます。

これが Advanced レッスンが暗黙の前提にしているレイヤー。これがないと \`revm/crates/interpreter\` のソースは雑音にしか読めません。

## Solidity が変身する先

Solidity コントラクトをコンパイルすると、出力は **bytecode** — 文字通りバイトの列。実際のデプロイ済みコントラクトの一部：

\`\`\`
0x60 0x80 0x60 0x40 0x52 0x34 0x80 0x15 0x60 0x10 0x57 ...
\`\`\`

各バイトは：

- **opcode**（EVM が知っている命令）
- ある種の push opcode に続く **リテラル値**

最初のバイト \`0x60\` は \`PUSH1\` opcode。2番目のバイト (\`0x80\`) は push する 1 バイトのリテラル。

次の \`0x60 0x40\` — もう一度 PUSH1、リテラル \`0x40\`。
次の \`0x52\` — \`MSTORE\` (スタックトップ 2 つをメモリへ書き込み)。

魔法ではない。これは EVM 版の x86 機械語 — フラットなバイト列で、ランタイムにとって特定の意味を持つ。

## EVM はそのバイト列で何をやるか

EVM は **program counter (PC)** — 現在のバイトを指す整数 — を持っています。コアループ：

\`\`\`
loop {
    let opcode = bytecode[pc];                 // 1 バイト fetch
    let handler = instruction_table[opcode];   // O(1) 配列参照
    handler(stack, memory, gas, ...);          // 実行
    pc = pc + 1;                               // (または jump)
    if halted { break; }
}
\`\`\`

これが EVM の全部。擬似コード 3 行。

面白い部分：

1. **\`instruction_table\`** — **256 エントリの配列**（バイト値 0x00–0xFF それぞれ 1 スロット）。各スロットは opcode ハンドラへの関数ポインタ。
2. **PC 管理** — ほとんどの opcode は PC を 1 進める。ただし：
   - \`PUSH1\` は 2 進む（リテラル 1 バイトをスキップ）。\`PUSH32\` は 33 進む。
   - \`JUMP\` と \`JUMPI\` は PC を任意の値（分岐先）に設定。
3. **Halt** — \`STOP\`、\`RETURN\`、\`REVERT\`、\`INVALID\`、**Out-Of-Gas** すべてループを break する。ただし結果（成功 / 失敗 / 状態巻き戻し / 巻き戻しなし）が異なる。

## あなたが使ったことのある opcode: ADD (\`0x01\`)

ADD はスタックトップ 2 つを取って加算、結果を push する。擬似コード：

\`\`\`
fn add(stack, gas) {
    gas.charge(3);                  // ADD は固定 3 ガス
    let a = stack.pop();
    let b = stack.pop();
    stack.push(a.wrapping_add(b));  // mod 2^256、panic しない
}
\`\`\`

3 つの重要な詳細：

- **ガス**: 各 opcode はガスを払う。ADD は固定 3。SLOAD は動的（cold = 2100, warm = 100）。実行中の Out-of-gas はフレームを halt させる。
- **\`wrapping_add\`**: EVM の演算は mod 2²⁵⁶。\`U256::MAX + 1 = 0\`。例外なし。Solidity ≥ 0.8 はオーバーフローチェックを **EVM の上に** 追加したが、根底の ADD opcode はラップする。
- **スタック規律**: pop, pop, push。スタックは 1 縮む。EVM スタックは 1024 アイテム上限、オーバーフローは halt。

## bytecode の出どころ

デプロイ済みコントラクトには 2 つの bytecode がある：

| 部分 | いつ走る | 何をする |
| :--- | :--- | :--- |
| **コンストラクタ (init code)** | デプロイ時に 1 度 | ストレージ初期化、runtime code を返す |
| **runtime code** | コントラクトへの各 call ごと | dispatch ロジック + あなたの関数群 |

Foundry のテスト出力で「creation code」が出てくる時、それが init code。runtime code が \`eth_getCode(address)\` の返り値。

## 図

\`\`\`
bytecode: 0x60 0x80 0x60 0x40 0x52 0x34 0x80 ...
                 │
                 │   PC = 0
                 ▼
            ┌────────────┐
            │ バイト fetch│  ← bytecode[PC] = 0x60
            └────────────┘
                 │
                 ▼
       ┌────────────────────┐
       │  instruction_table │  ← table[0x60] = fn push1
       │     [0x00..0xFF]   │
       └────────────────────┘
                 │
                 ▼
            ┌────────────┐
            │   push1    │  ← 実行: リテラル読んでスタックへ push
            └────────────┘
                 │
                 ▼
              PC += 2     ← (opcode 1 + リテラル 1)
\`\`\`

halt opcode に当たるか、ガス枯渇か、無効 opcode に出会うまで繰り返し。

## なぜ Advanced で重要か

Advanced コースで \`revm/crates/interpreter/src/instructions/arithmetic.rs\` を開くと、こう書いてあります：

\`\`\`rust
pub fn add<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
    popn_top!([op1], op2, context.interpreter);
    *op2 = op1.wrapping_add(*op2);
    Ok(())
}
\`\`\`

このレッスン抜きだと「何かの Rust 関数」にしか見えない。あった上では：

- これは **256 エントリ命令テーブルのスロット 0x01 にある関数ポインタ**。
- インタープリタループが **bytecode から 0x01 を fetch して、これを呼んだ**。
- 関数は 1 つ pop し (\`popn_top!([op1])\`)、新しいトップへの *可変参照* (\`op2\`) を取得し、\`op1 + op2\` を参照経由で直接書き込む。**pop-pop-push ではなくメモリ書き込み 1 回**。これは最適化だが、セマンティクスは上の擬似コードと同一。

Rust ソースは **擬似コードそのもの** をやっている — キャッシュと CPU 向けに最適化されているだけ。

## なぜ \`match\` ではなく配列なのか

妥当な代替案はこうなる：

\`\`\`rust
match opcode {
    0x01 => add(...),
    0x02 => mul(...),
    // 254 個の arm
}
\`\`\`

なぜ関数ポインタの配列が選ばれているか？

- **予測可能なパフォーマンス**: 配列アクセスは CPU 命令 1 つ。\`match\` は分岐ツリーかジャンプテーブルにコンパイルされる — 大抵速いが、配列は *常に* 速い。
- **コンパイル時構築**: 256 エントリのテーブルは \`const fn\` でコンパイル時に組める。実行時セットアップコストゼロ。
- **カスタマイズ容易**: フォークは **1 スロット** を置き換えるだけでカスタム opcode を追加できる（Advanced lesson 2 で出てきます）。

## 読み物リスト — Advanced 前にやること

1. **[evm.codes](https://www.evm.codes) を開いて** クリックして回る。各 opcode、ガスコスト、スタック効果。ブックマーク必須。
2. **[Yellow Paper](https://ethereum.github.io/yellowpaper/paper.pdf) の EVM セクション**、9–13 ページをスキム。通読しなくていい。ループと opcode の形式定義を見るだけ。見た目より読みやすい。
3. **1 行の Solidity コントラクトを \`forge build\` でコンパイル**。\`out/Contract.sol/Contract.json\` を開いて \`bytecode.object\` を見る。認識できるバイト (PUSH, MSTORE, JUMP) を探す。

## このレッスンで持ち帰るもの

- EVM は **バイト駆動の dispatch ループ**: バイトを fetch、256 スロットの関数テーブルを引く、ハンドラを実行、PC を進める。
- 各 opcode は **固定の契約** を持つ小さな Rust 関数（Revm の場合）: スタック・メモリ・ガス・必要ならストレージに触れて、制御を返す。
- Advanced lesson 1 で見るすべての詳細（\`add<IT, H>\`、命令テーブル、PC、halt）はこのモデルに直接マッピングされる。

Advanced を始めたら、最初のレッスンで **まったく同じ** \`add\` 関数が出てきます。それが何か驚きはない — あなたが既に理解している何かの本番グレード実装を読むだけです。`,
                },
              ],
            },
          },
        ],
      },
    },
  });
}
