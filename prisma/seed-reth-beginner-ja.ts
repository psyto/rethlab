import { PrismaClient } from '@prisma/client';

export async function seedRethBeginnerJA(prisma: PrismaClient) {
  const tags = ['reth', 'revm', 'alloy', 'rust', 'beginner'];

  await prisma.course.create({
    data: {
      slug: 'reth-beginner-ja',
      title: 'Reth入門 — Rust Ethereumの世界へ',
      description:
        'Reth・Revm・Alloyとは何かを俯瞰し、なぜいま注目されているのかを理解します。Rust環境を構築し、最初の小さなRustプログラムを動かすところまで。',
      difficulty: 'BEGINNER',
      duration: 90,
      xpReward: 150,
      track: 'reth-beginner',
      tags,
      isPublished: true,
      sortOrder: 100,
      locale: 'ja',
      instructorName: 'RethLab',
      modules: {
        create: [
          {
            title: 'なぜRust Ethereumスタックなのか',
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: 'なぜReth・Revm・Alloyを学ぶのか',
                  slug: 'why-rust-ethereum-stack-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 10,
                  xpReward: 20,
                  content: `# なぜReth・Revm・Alloyを学ぶのか

近年、HyperliquidやTempoのような高性能チェーンが共通して採用しているのが、**Ethereum系のRust実装** — つまり **Reth / Revm / Alloy** です。

## 何が「面白い」のか？

| 観点 | EVM（Geth） | Rust EVMスタック（Reth + Revm） |
| :--- | :--- | :--- |
| **言語** | Go | **Rust（メモリ安全＋高速）** |
| **設計** | 一体型（モノリシック） | **モジュラー（部品として使える）** |
| **採用** | 既存の大半 | **新興のApp-chain・L2・MEVインフラ** |

最大のポイントは「**モジュラー**」であること。Rethは「ノード」として動かすだけでなく、**ブロックチェーンを作るためのSDK**として使えます。

## なぜ、いま注目されているのか

- **HyperliquidのHyperEVM** や **Tempo** は、内部でRevmを採用
- **Foundry**（Solidity開発の事実上の標準）の実行エンジンもRevm
- **OP-Reth**（Optimism）や zkVM の多くもRevmベース

つまりRust Ethereumスタックは、**「次世代Ethereum開発の共通言語」** になりつつあります。

## このコースのゴール

- Reth / Revm / Alloy の役割の違いを正確に理解する
- なぜこのスタックが注目されているか、自分の言葉で説明できるようになる
- Rustの開発環境を整え、最初のプログラムを動かす

このコースは「Rustが少し書ける」状態を目指すまでをカバーします。次のFundamentalsで実際にAlloyを使ってEthereumノードに接続していきます。`,
                },
                {
                  title: 'Reth・Revm・Alloyの三つ巴',
                  slug: 'three-pillars-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 10,
                  xpReward: 20,
                  content: `# Reth・Revm・Alloyの三つ巴

3つの名前は混同されがちですが、役割はまったく違います。**「家を建てる」** に例えるとシンプルです。

| プロジェクト | 役割 | 例え |
| :--- | :--- | :--- |
| **Alloy** | ライブラリ群（型、署名、RPC） | エンジン、タイヤ、ネジ |
| **Revm** | EVM実行エンジン | 燃焼室（命令を実行する場所） |
| **Reth** | フルノード実装 | 完成した自動車 |

## 依存の方向

- **Reth** は内部で **Alloy** と **Revm** を全面的に採用しています。
- つまり「Rethを学ぶ＝Alloy／Revmにも触れる」ということになります。

## それぞれの「使い道」

### Alloy（最も触れる機会が多い）
- **Address**、**U256** などEthereumの基本データ型
- **PrivateKeySigner** によるEIP-712などの署名
- **Provider** によるJSON-RPC通信
- ETHers-rs の事実上の後継

### Revm
- スマートコントラクトの **シミュレーション**（取引前に結果を計算）
- カスタムOpcodeを追加した **専用実行エンジン** の構築
- バックテストや高速トレース

### Reth
- 標準的なEthereumフルノードとして動かす
- **ExEx (Execution Extensions)** で実行ループにフックして拡張
- 独自のApp-chainの基盤として使う

## 学習の順番

> **Alloy → Revm → Reth**
>
> 理由：「ミクロ（型）→ ミドル（実行）→ マクロ（ノード全体）」と進むのが最も挫折しにくいから。

このコースの次のティアであるFundamentalsで、まずはAlloyから手を動かし始めます。`,
                },
                {
                  title: 'なぜSolanaではなくEthereum（Rust）なのか',
                  slug: 'why-not-solana-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 8,
                  xpReward: 15,
                  content: `# なぜSolanaではなくEthereum（Rust）なのか

「Solanaも高速で、しかもRustだから、わざわざRust EVMを学ぶ意味は？」とよく聞かれます。結論は **「目指す方向性次第」** ですが、判断軸を整理しておきましょう。

## 比較

| 項目 | **Reth系（Rust EVM）** | **Solana（SVM）** |
| :--- | :--- | :--- |
| **言語** | Rust（基盤）＋ Solidity | Rust（基盤＋コントラクト） |
| **実行モデル** | 直列／部分並列（ParallelEVM） | **完全並列（Sealevel）** |
| **学習コスト** | 中〜高 | **非常に高い**（独自モデル） |
| **将来の柔軟性** | **EVM全体に応用可** | Solana特化 |
| **対象プロジェクト** | Hyperliquid, Tempo, Monad, Berachain | Solana, Pyth, Jito, Jupiter |

## Rust EVM が選ばれる「実利」

1. **EVMエコシステムの流動性**: 既存のウォレット、ツール、開発者の知見をそのまま流用可能
2. **モジュール性**: 「インフラを自分のアプリに最適化する」ができる（HyperliquidがHyperBFT＋HyperEVMでやっていること）
3. **垂直統合**: アプリ層と実行層を一気に最適化できる

## どちらを「優先すべきか」

「**現在のトレンドと汎用性**」を重視するなら、**Reth系（このコース）** が答えです。Solanaは依然として強いですが、Rust EVMは「EVMの開発体験 × Rustの性能」という両取りができる稀有なポジションにあります。

## 次の一歩

役割と相対的な価値が見えたところで、いよいよ **Rust環境を構築** していきましょう。`,
                },
              ],
            },
          },
          {
            title: 'Rust環境を整える',
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: 'rustupとVS Codeの準備',
                  slug: 'setup-rust-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 10,
                  xpReward: 15,
                  content: `# rustupとVS Codeの準備

Rustの開発環境は、実は **rustup と VS Code 拡張だけ** で完結します。

## 1. rustupでRustを入れる

公式ツールチェーン管理ツール **rustup** からインストールします。

\`\`\`bash
# macOS / Linux
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 動作確認
rustc --version
cargo --version
\`\`\`

\`cargo\` は **Rustのパッケージマネージャー＋ビルドツール** です。npmやcargoという名前から「ライブラリを管理するもの」と思いがちですが、実際は **ビルドもテストも実行もすべてcargoでやる** ので、毎日触ることになります。

## 2. VS Codeに rust-analyzer を入れる

VS Code拡張機能の検索で \`rust-analyzer\` をインストールしてください。これがないとRust開発は事実上不可能です。

- リアルタイムで型エラーを表示
- 自動補完・「ジャンプ・トゥ・デファイン」
- インライン型注釈（変数の上に型が表示される）

> **コツ**: \`Cargo.toml\` を持つフォルダを開かないと rust-analyzer は起動しません。次のレッスンで作ります。

## 3. はじめてのプロジェクトを作る

\`\`\`bash
cargo new hello_reth
cd hello_reth
cargo run
\`\`\`

\`cargo run\` で「\`Hello, world!\`」が表示されれば準備完了です。

## 4. ブラウザですぐ試したい時

何かインストールせずに試したいときは [Rust Playground](https://play.rust-lang.org/) を使えます。コピペで実行できる便利な環境です。

次のレッスンでは、Rust構文の最小限を駆け足で押さえてから、宿題に挑戦します。`,
                },
                {
                  title: 'Rustクイックリファレンス',
                  slug: 'rust-quick-reference-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 12,
                  xpReward: 20,
                  content: `# Rustクイックリファレンス

これから書くコードに登場するRust構文を一気に押さえます。「Rustを学ぶ」ためのコースは別にありますが、**Reth/Revm/Alloyを学ぶうちにRustも自然と身につく** ように、必要なところで都度説明します。

## 1. 変数：\`let\` と \`let mut\`

Rustの変数はデフォルトで **不変（immutable）** です。書き換えたいときは \`mut\` を付けます。

\`\`\`rust
let x = 10;        // 不変
// x = 11;        // コンパイルエラー！

let mut y = 10;    // 可変
y = 11;            // OK
\`\`\`

## 2. 基本データ型

| 型 | 意味 |
| :--- | :--- |
| \`i32\`, \`i64\` | 符号付き整数 |
| \`u32\`, \`u64\`, \`u128\` | 符号なし整数 |
| \`bool\` | true / false |
| \`&str\` | **借用された文字列**（読み取り専用、軽い） |
| \`String\` | **所有された文字列**（書き換え可能、ヒープ） |

> 「\`&str\` と \`String\` の違い」は最初みんな混乱します。今は **「\`&str\` は他人の家を覗く感じ、\`String\` は自分の家を持つ感じ」** とだけ覚えておけば十分です。所有権は次のティアで詳しく扱います。

## 3. 関数

\`\`\`rust
fn add(a: i64, b: i64) -> i64 {
    a + b   // 末尾にセミコロンを付けないと「式」として返り値になる
}
\`\`\`

- 引数は \`名前: 型\`
- 返り値は \`-> 型\`
- 最後の式（セミコロンなし）が暗黙の return

## 4. メソッドの呼び方

Rustの値はメソッドを持っています。例：

\`\`\`rust
let s = "0x123";
s.starts_with("0x");  // true / false
s.len();              // 5
"hello".to_uppercase(); // "HELLO"
\`\`\`

## 5. 条件分岐：\`if\` / \`else\`

\`\`\`rust
let n = 7;
if n % 2 == 0 {
    println!("even");
} else {
    println!("odd");
}
\`\`\`

\`if\` 自体が「式」なので、値を返すこともできます：

\`\`\`rust
let parity = if n % 2 == 0 { "even" } else { "odd" };
\`\`\`

## 6. 表示：\`println!\`

\`!\` が付いているのは **マクロ** だからです（関数ではない）。\`{}\` がプレースホルダー。

\`\`\`rust
let name = "Alloy";
println!("Hello, {}!", name);          // Hello, Alloy!
println!("{} + {} = {}", 1, 2, 1 + 2); // 1 + 2 = 3
\`\`\`

## 7. コレクション：\`Vec\`

可変長の配列です。スマートコントラクトのスタックや、トランザクションのリストなど、Rust EVMコードで頻出します。

\`\`\`rust
let mut v: Vec<i64> = Vec::new();
v.push(10);
v.push(20);
let last = v.pop();   // Some(20)
println!("{:?}", v);  // [10]
\`\`\`

\`{:?}\` は **デバッグ表示** 用のプレースホルダーです。

## 8. これだけ覚えればOK

ここまでが Reth/Revm/Alloy の最初のコードを読み解くのに必要な「最小限の Rust」です。次の宿題でこれらをすべて使います。

| 構文 | 一言 |
| :--- | :--- |
| \`let x = ...\` | 不変な変数 |
| \`let mut x = ...\` | 可変な変数 |
| \`fn name(arg: T) -> R {}\` | 関数定義 |
| \`x.method()\` | メソッド呼び出し |
| \`if .. else ..\` | 条件分岐（式としても使える） |
| \`println!("{}", x)\` | 表示 |
| \`Vec<T>\` | 可変長配列 |

> 完璧に覚えなくて大丈夫です。**書きながら少しずつ思い出す** のが正解。`,
                },
                {
                  title: '小さな宿題：0xチェック',
                  slug: 'first-homework-ja',
                  type: 'CHALLENGE',
                  sortOrder: 2,
                  duration: 15,
                  xpReward: 25,
                  challengeLanguage: 'typescript',
                  content: `# 小さな宿題：0xチェック

最初の課題はとてもシンプルです。

> 文字列として与えられたEthereumアドレスが、\`0x\` から始まっているかをチェックして、正しい／不正のメッセージを表示する。

## なぜこれが「最初の一歩」なのか

1. **変数を作る** という最も基本的な動作
2. **メソッドを呼ぶ** （\`starts_with\`）という、Rustの「道具の使い方」
3. **条件分岐** （\`if / else\`）でロジックを書く

これらはRustに限らず、すべてのプログラミングの基本です。

## ヒント

\`\`\`rust
fn main() {
    let address = "0x1234567890abcdef1234567890abcdef12345678";

    if address.starts_with("0x") {
        // ここで成功メッセージを表示
    } else {
        // ここでエラーメッセージを表示
    }
}
\`\`\`

## 試してみよう

下のエディタには **TypeScript版** の同じ問題を用意しています。Rust側は [Rust Playground](https://play.rust-lang.org/) で試してみてください。考え方はまったく同じです。

## 発展課題

- アドレスが **42文字** であるかも合わせてチェックする（\`address.len()\` を使う）
- アドレスを引数に取る関数 \`is_valid_address(addr: &str) -> bool\` を作る`,
                  starterCode: `function isValidEthAddress(address: string): boolean {
  // TODO: address が "0x" で始まっているかチェックして boolean を返す
  return false;
}

console.log(isValidEthAddress("0x1234567890abcdef1234567890abcdef12345678"));
console.log(isValidEthAddress("1234567890abcdef1234567890abcdef12345678"));
`,
                  solutionCode: `function isValidEthAddress(address: string): boolean {
  return address.startsWith("0x") && address.length === 42;
}

console.log(isValidEthAddress("0x1234567890abcdef1234567890abcdef12345678"));
console.log(isValidEthAddress("1234567890abcdef1234567890abcdef12345678"));
`,
                  hints: [
                    'JavaScript/TypeScriptでは String.prototype.startsWith() を使います。Rustも同名のメソッド starts_with() を持っています。',
                    'Ethereumアドレスは "0x" を含めて42文字です。長さチェックも入れてみましょう。',
                    'AND条件は && で繋ぎます。',
                  ],
                },
                {
                  title: '初級まとめクイズ',
                  slug: 'beginner-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 3,
                  duration: 10,
                  xpReward: 25,
                  content: `# 初級まとめクイズ

Reth・Revm・Alloyの役割と立ち位置を理解できたかチェックします。`,
                  quizQuestions: [
                    {
                      question: 'Reth、Revm、Alloyの役割の組み合わせとして正しいものは？',
                      options: [
                        'Reth=ライブラリ群、Revm=ノード、Alloy=実行エンジン',
                        'Reth=ノード、Revm=実行エンジン、Alloy=ライブラリ群（型・RPC・署名）',
                        'Reth=実行エンジン、Revm=ノード、Alloy=ウォレット',
                        '3つは全て同じプロジェクトの別名',
                      ],
                      correctIndex: 1,
                      explanation: 'Rethは完成品（フルノード）、Revmは実行エンジン（EVM本体）、Alloyは型やRPC、署名などの基盤ライブラリ群です。',
                    },
                    {
                      question: 'なぜRevmが Foundry や Hyperliquid に選ばれているのでしょうか？',
                      options: [
                        '世界唯一のRust製EVMだから',
                        'モジュラーなライブラリとして設計され、カスタマイズしやすく性能が高いから',
                        'Solidityがコンパイル不要で動くから',
                        '無料で使えるEVMはRevmだけだから',
                      ],
                      correctIndex: 1,
                      explanation: 'Revmは「部品として使える」設計と、Rustによる高速さと安全性を兼ね備えているため、Foundry・OP-Reth・zkVM・Hyperliquidなど幅広く採用されています。',
                    },
                    {
                      question: 'このコースで推奨される学習の順番は？',
                      options: [
                        'Reth → Revm → Alloy（マクロからミクロへ）',
                        'Alloy → Revm → Reth（ミクロからマクロへ）',
                        'Revm → Alloy → Reth',
                        '好きなところから自由に',
                      ],
                      correctIndex: 1,
                      explanation: 'まず型とRPC（Alloy）→ 実行エンジン（Revm）→ ノード全体（Reth）と進むのが、最も挫折しにくい順番です。',
                    },
                    {
                      question: 'Rustの開発環境で「これがないと事実上書けない」と紹介されたVS Code拡張は？',
                      options: [
                        'Rust Helper',
                        'rust-analyzer',
                        'cargo-vscode',
                        'Rustacean',
                      ],
                      correctIndex: 1,
                      explanation: 'rust-analyzerは公式の言語サーバーで、エラー表示・補完・型情報・ジャンプ等を提供します。',
                    },
                    {
                      question: 'Solanaと比較したとき、Reth系（Rust EVM）の主な「実利」として正しくないものは？',
                      options: [
                        'EVMエコシステムの既存資産（ウォレット、ツール）をそのまま流用できる',
                        'インフラ層をアプリ向けに最適化（カスタマイズ）できる',
                        'コンセンサスを書かずに済むので、Solanaより常に高速になる',
                        'EVM互換チェーン全体に知識を応用しやすい',
                      ],
                      correctIndex: 2,
                      explanation: '「常に高速」は誤りです。純粋なTPSではSolanaが優位な場面が多く、Reth系の利点は「カスタマイズ性」「既存資産」「Rustによる安全性」です。',
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
