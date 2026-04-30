import { PrismaClient } from '@prisma/client';

export async function seedRethFundamentalsJA(prisma: PrismaClient) {
  const tags = ['reth', 'revm', 'alloy', 'rust', 'fundamentals', 'evm'];

  await prisma.course.create({
    data: {
      slug: 'reth-fundamentals-ja',
      title: 'Reth Fundamentals — Alloyで動かす最初の一歩',
      description:
        'Alloyを使ってEthereumノードに接続し、署名・残高取得・ブロック番号取得など実用的なRustコードを書きます。さらにEVMの基本概念（スタック、メモリ、Opcode）を学びRevmへの橋渡しを行います。',
      difficulty: 'INTERMEDIATE',
      duration: 150,
      xpReward: 250,
      track: 'reth-fundamentals',
      tags,
      isPublished: true,
      sortOrder: 200,
      locale: 'ja',
      instructorName: 'RethLab',
      modules: {
        create: [
          {
            title: 'Alloyを使う',
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: 'Rust：所有権と借用の5分入門',
                  slug: 'rust-ownership-borrowing-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 12,
                  xpReward: 25,
                  content: `# Rust：所有権と借用の5分入門

これからAlloyを書きはじめると、必ず突き当たるのが **所有権（ownership）** です。Rust最大の特徴であり、最初の壁。完璧に理解する必要はなく、**「コードを読んでいてルールが思い出せる」** 状態を目指しましょう。

## 1. なぜ所有権が必要なのか

C/C++ではメモリ管理を人間がやり、JavaやJSではガベージコレクタがやります。Rustは **コンパイル時に「誰が所有していて、いつ解放するか」をチェック** する第三の道を選びました。

そのおかげで、

- ガベージコレクタなしで安全
- メモリ二重解放やuse-after-freeがコンパイル時に検出される
- 並行処理でデータ競合がコンパイル時に検出される

…という「金融資産を扱うコードに最適な性質」が手に入ります。

## 2. 所有権のルール（3つだけ）

\`\`\`
1. 各値には「所有者」がちょうど一人いる
2. 所有者がスコープを抜けると値はドロップ（解放）される
3. 値はムーブ（所有権の移動）か、借用される
\`\`\`

## 3. ムーブ（所有権の移動）

\`\`\`rust
let s1 = String::from("hello");
let s2 = s1;          // 所有権が s1 → s2 へ「ムーブ」
// println!("{}", s1); // ❌ コンパイルエラー：s1はもう使えない
println!("{}", s2);    // OK
\`\`\`

## 4. 借用（&）：読み取り専用の参照

書き換えずに見るだけなら、所有権を渡さなくていい：

\`\`\`rust
fn print_addr(addr: &String) {
    println!("{}", addr);
}

let a = String::from("0xABCD...");
print_addr(&a);   // & で「貸す」
print_addr(&a);   // 所有権はaに残ったままなので何度でも貸せる
\`\`\`

## 5. 可変参照（&mut）：書き換える参照

\`\`\`rust
fn append_suffix(s: &mut String) {
    s.push_str("...");
}

let mut a = String::from("Hello");
append_suffix(&mut a);
\`\`\`

**ルール**: 同時に存在できるのは、

- **複数の \`&\`（読み取り）** OR
- **ただ1つの \`&mut\`（書き換え）**

このルールで、データ競合がコンパイル時に防がれます。

## 6. \`&str\` は何者なのか

実は \`&str\` は **「文字列の借用」** です。\`String\` を所有して、その一部を \`&str\` として貸し出すイメージ。

\`\`\`rust
let owned: String = String::from("Hello, Alloy");
let borrowed: &str = &owned;   // 借用
\`\`\`

関数引数で \`&str\` を要求するのは「読み取りで十分なので、所有権までは要らない」という宣言です。

## 7. これからAlloyコードで見るパターン

\`\`\`rust
// 「.parse()?」 → 文字列をパースしてエラーは伝播
let url = "https://eth.llamarpc.com".parse()?;

// 「&」で借用を渡す
provider.get_balance(&address).await?;

// 「mut」で書き換え許可
let mut signer = PrivateKeySigner::random();
\`\`\`

これらは全部、所有権ルールから来ています。次のレッスンでAlloyコードを実際に書くときに「あ、これは借用してるんだな」と気づけたら勝ちです。

## まとめ

| 記号 | 意味 |
| :--- | :--- |
| \`x\` | 所有 |
| \`&x\` | 借用（読み取り） |
| \`&mut x\` | 借用（書き換え） |
| \`mut x\` | 変数を書き換え可にする |

所有権の感覚は **書きながら身につける** ものなので、いま完璧でなくて大丈夫。次へ進みましょう。`,
                },
                {
                  title: 'Alloyの基本型と署名',
                  slug: 'alloy-primitives-signing-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 12,
                  xpReward: 25,
                  content: `# Alloyの基本型と署名

最初に **Alloy** を直接触ってみましょう。Alloyは「EthereumをRustで扱うための決定版ライブラリ群」で、Rethも内部でこれをフル活用しています。

## 1. プロジェクトの準備

\`\`\`bash
cargo new hello_alloy
cd hello_alloy
\`\`\`

\`Cargo.toml\` の \`[dependencies]\` に追記します。

\`\`\`toml
[dependencies]
alloy = { version = "1.0", features = ["full"] }
tokio = { version = "1", features = ["full"] }
eyre = "0.6"
\`\`\`

> **Tip**: バージョンは執筆時点のもの。実際は最新版を [crates.io](https://crates.io/crates/alloy) で確認してください。\`eyre\` は人間に優しいエラー出力のためのクレートです。

## 2. メッセージに署名する — 実例

これは [\`alloy-rs/examples\`](https://github.com/alloy-rs/examples/blob/main/examples/wallets/examples/sign_message.rs) の \`sign_message.rs\` 全体：

\`\`\`rust
//! Example of signing a message with a signer.

use alloy::signers::{local::PrivateKeySigner, Signer};
use eyre::Result;

#[tokio::main]
async fn main() -> Result<()> {
    // ランダムなシグナーを作る
    let signer = PrivateKeySigner::random();

    // 任意でチェーンIDを設定（EIP-155 リプレイ攻撃防止）
    let signer = signer.with_chain_id(Some(1337));

    // 署名するメッセージ
    let message = b"hello";

    // 非同期に署名
    let signature = signer.sign_message(message).await?;

    println!("Signature produced by {}: {:?}", signer.address(), signature);
    println!("Signature recovered address: {}", signature.recover_address_from_msg(&message[..])?);

    Ok(())
}
\`\`\`

\`src/main.rs\` にコピーして \`cargo run\`。ランダム生成されたシグナーのアドレス、署名、そして検証で復元したアドレス（一致するはず）が表示されます。

## 3. このコードが教えること

### \`PrivateKeySigner::random()\`
セキュアRNGで新しい鍵ペア生成。**本番資金には絶対に使わないこと** — テストと学習用。本番では環境変数、暗号化キーストア、ハードウェアウォレットから読み込む。

### \`with_chain_id(Some(1337))\`
EIP-155 がチェーンIDを署名に含めるので、チェーンAで署名したtxがチェーンBで再送できなくなります。**本番では必須**。\`1337\` はローカルAnvilの典型的チェーンID。

### \`sign_message(message).await\`
**EIP-191** （"Ethereum signed message" プレフィックス）を実装。JSON-RPCの \`personal_sign\` や \`window.ethereum.request("personal_sign", ...)\` が出すものと同じ。async なのは、ハードウェアウォレット（Ledger/Trezor）が応答に時間がかかるため — ローカルシグナーも同じインターフェースで差し替え可能。

### \`signature.recover_address_from_msg(&message[..])\`
検証側。署名と元メッセージから、署名者のアドレスを復元。これが **「Sign in with Ethereum」の作り方** — サーバーがnonceを発行、ユーザーが署名、サーバーがアドレスを復元。パスワード不要。

## 4. \`address!\` マクロ

\`\`\`rust
use alloy::primitives::address;

let recipient = address!("d8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
\`\`\`

\`address!\` は **手続きマクロ** で、コンパイル時に走ります。1桁タイポしたり長さを間違えると、**コンパイルすら通らない** — 「ユーザーが送信ボタンを押したときに実行時エラー」ではない。Expertティアでこのマクロが内部でどう作られているか正確に見ます。

## なぜ「型」が重要なのか

Solidityも \`address\` 型を持ちますが、Rustの型システムはより厳格：

- \`U256\` を期待する関数に \`u64\` を渡すとコンパイル時に止まる
- \`Address\` は \`[u8; 20]\` 互換ではなく、専用の型
- \`Address\` と \`B256\` を混同するとコンパイルエラー
- これが「金融資産を扱うコードの安全性」につながります

## 練習

例を改造して：

1. **同じメッセージ** を **異なる2つのチェーンID** で署名 — 署名は異なるはず
2. \`recover_address_from_msg\` を **改ざんされたメッセージ** に対して呼ぶ — 復元アドレスが一致しない。**それがEIP-191の改ざん耐性**

次は本物のProviderと実際のノード接続。`,
                },
                {
                  title: 'Rust：Result・Option・`?` 演算子',
                  slug: 'rust-result-option-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 12,
                  xpReward: 25,
                  content: `# Rust：Result・Option・\`?\` 演算子

Alloyのコードを書くと、ほぼすべての行に \`.await?\` や \`.parse()?\` が出てきます。これは **Rustのエラーハンドリング** の構文です。

## 1. なぜ例外がないのか

Rustには try/catch（例外）がありません。代わりに **値としてエラーを返す** 設計です。

- 関数は「成功」か「失敗」を **\`Result<T, E>\`** で返す
- 値があるかないかは **\`Option<T>\`** で返す

これらは \`enum\`（列挙型）です。

\`\`\`rust
enum Result<T, E> {
    Ok(T),
    Err(E),
}

enum Option<T> {
    Some(T),
    None,
}
\`\`\`

## 2. \`Option\`：あるか、ないか

\`\`\`rust
let v: Vec<i32> = vec![1, 2, 3];
let first: Option<&i32> = v.first();   // Some(&1)
let empty: Vec<i32> = vec![];
let none: Option<&i32> = empty.first();// None

match first {
    Some(n) => println!("got {}", n),
    None => println!("empty"),
}
\`\`\`

## 3. \`Result\`：成功か、エラーか

\`\`\`rust
fn parse_int(s: &str) -> Result<i32, std::num::ParseIntError> {
    s.parse::<i32>()
}

match parse_int("42") {
    Ok(n) => println!("got {}", n),
    Err(e) => println!("oops: {}", e),
}
\`\`\`

## 4. \`?\` 演算子：エラー伝播の魔法

\`?\` は **「エラーなら今すぐ関数からreturn、成功なら中身を取り出す」** という意味です。

\`\`\`rust
fn parse_two(a: &str, b: &str) -> Result<(i32, i32), std::num::ParseIntError> {
    let x = a.parse::<i32>()?;   // 失敗したら早期リターン
    let y = b.parse::<i32>()?;   // 失敗したら早期リターン
    Ok((x, y))
}
\`\`\`

\`?\` がない世界では、毎回 \`match\` を書く必要があります。同じ意味のコードが3倍くらい長くなります。

## 5. \`Result<(), Box<dyn Error>>\` と \`eyre::Result<()>\`

main関数の戻り値でよく見るやつです：

| 型 | 意味 |
| :--- | :--- |
| \`Result<(), Box<dyn std::error::Error>>\` | 標準ライブラリのみ（やや冗長） |
| \`eyre::Result<()>\` | **\`eyre\`** クレートの便利版（推奨） |

\`eyre\` は「人間が読めるエラー出力」と「いろんなエラー型を1つにまとめられる」のが特徴。Alloyコードでは \`eyre::Result<()>\` が事実上の標準です。

## 6. \`unwrap()\` と \`expect()\`

学習段階でよく使う「エラーを無視する」方法。本番では使わないでください（パニックします）。

\`\`\`rust
let n: i32 = "42".parse().unwrap();          // 失敗ならパニック
let n: i32 = "42".parse().expect("not an int"); // メッセージ付きパニック
\`\`\`

## 7. これからAlloyで見るパターン

\`\`\`rust
async fn main() -> eyre::Result<()> {
    let provider = ProviderBuilder::new()
        .connect_http("https://eth.llamarpc.com".parse()?);  // ?: parse失敗→return
    let block = provider.get_block_number().await?;          // ?: RPC失敗→return
    Ok(())
}
\`\`\`

ほぼすべての行で \`?\` が活躍します。**「成功したらそのまま、失敗したら呼び出し元へエラーを投げる」** とだけ覚えてください。

次のレッスンでこれを実際のProvider接続コードに使います。`,
                },
                {
                  title: 'Provider — ノードへ接続する',
                  slug: 'alloy-provider-ja',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 12,
                  xpReward: 25,
                  content: `# Provider — ノードへ接続する

Alloyの **Provider** は「ノードへの窓口」です。これを通じてブロック番号・残高・トランザクション情報を取得します。

## 最小コード — 一字一句そのまま

これは [\`alloy-rs/examples\`](https://github.com/alloy-rs/examples/blob/main/examples/providers/examples/http.rs) の \`http.rs\` 全体：

\`\`\`rust
//! Example of using the HTTP provider with the \`reqwest\` crate to get the latest block number.

use alloy::providers::{Provider, ProviderBuilder};
use eyre::Result;

#[tokio::main]
async fn main() -> Result<()> {
    // reqwest クレートを使った HTTP transport でProvider作成
    let rpc_url = "https://reth-ethereum.ithaca.xyz/rpc".parse()?;
    let provider = ProviderBuilder::new().connect_http(rpc_url);

    // 最新ブロック番号を取得
    let latest_block = provider.get_block_number().await?;

    println!("Latest block number: {latest_block}");

    Ok(())
}
\`\`\`

\`cargo run\` するとメインネットの最新ブロック番号が表示されます。**これがあなたが書く全ての"監視Bot"の出発点** です。

URLに注目：\`https://reth-ethereum.ithaca.xyz/rpc\` は **Paradigm/Ithaca が運用する公開Rethノード**。あなたのコードは既に文字通りRethノードと喋っています。スタックの中にもう入っているのです。

## よく使うProviderメソッド

| メソッド | 役割 |
| :--- | :--- |
| \`get_block_number\` | 最新ブロック番号 |
| \`get_balance(address)\` | ETH残高 |
| \`get_block(...)\` | ブロックの詳細 |
| \`get_transaction_by_hash(hash)\` | トランザクション詳細 |
| \`get_logs(filter)\` | イベントログの取得 |

## 任意のEVM互換チェーンに繋ぐ

URLを差し替えるだけで、HyperEVM、Optimism、Anvil（ローカル）などにも繋がります。

\`\`\`rust
let provider = ProviderBuilder::new()
    .connect_http("https://api.hyperliquid.xyz/evm".parse()?); // HyperEVM
let provider = ProviderBuilder::new()
    .connect_http("http://127.0.0.1:8545".parse()?);          // Anvil
\`\`\`

## ローカルで試すなら Anvil

[Foundry](https://book.getfoundry.sh/) に同梱の **Anvil** を使うと、自分のマシン上で完全なEthereumノードのフォークを立てられます。

\`\`\`bash
anvil
\`\`\`

ガス代を払わずに残高変更や送金を試せるので、学習にはもってこいです。

## 次のステップ

これでAlloyの「Read」（読み取り）まで来ました。次のモジュールでは、EVMが実際に「動く」中身 — スタック、メモリ、Opcode — に踏み込みます。`,
                },
                {
                  title: 'チャレンジ：残高チェッカー',
                  slug: 'balance-checker-challenge-ja',
                  type: 'CHALLENGE',
                  sortOrder: 4,
                  duration: 15,
                  xpReward: 30,
                  challengeLanguage: 'typescript',
                  content: `# チャレンジ：残高チェッカー

「指定したアドレスの残高を取得して、0 ETHかどうかを判定する」関数を書いてみましょう。

ここではTypeScriptのEthers/Viem風APIで模擬しますが、Alloyでも完全に同じ流れです：

\`\`\`rust
let balance = provider.get_balance(addr).await?;
if balance.is_zero() {
    // ...
}
\`\`\`

## TypeScript版の課題

下のエディタで以下の関数を実装してください：

- \`isEmptyWallet(getBalance, address)\` を実装
- \`getBalance(address)\` は与えられた擬似プロバイダー関数で、bigintを返す
- 残高が \`0n\` ならtrue、それ以外はfalseを返す`,
                  starterCode: `type GetBalance = (address: string) => Promise<bigint>;

async function isEmptyWallet(
  getBalance: GetBalance,
  address: string
): Promise<boolean> {
  // TODO: getBalance(address) を呼んで残高を取得し、0n かどうかを判定する
  return false;
}

// テスト
const fakeBalances: Record<string, bigint> = {
  "0xAAAA": 0n,
  "0xBBBB": 1000000000000000000n,
};
const fakeProvider: GetBalance = async (a) => fakeBalances[a] ?? 0n;

(async () => {
  console.log(await isEmptyWallet(fakeProvider, "0xAAAA")); // true
  console.log(await isEmptyWallet(fakeProvider, "0xBBBB")); // false
})();
`,
                  solutionCode: `type GetBalance = (address: string) => Promise<bigint>;

async function isEmptyWallet(
  getBalance: GetBalance,
  address: string
): Promise<boolean> {
  const balance = await getBalance(address);
  return balance === 0n;
}

const fakeBalances: Record<string, bigint> = {
  "0xAAAA": 0n,
  "0xBBBB": 1000000000000000000n,
};
const fakeProvider: GetBalance = async (a) => fakeBalances[a] ?? 0n;

(async () => {
  console.log(await isEmptyWallet(fakeProvider, "0xAAAA"));
  console.log(await isEmptyWallet(fakeProvider, "0xBBBB"));
})();
`,
                  hints: [
                    'await を忘れずに。getBalance は Promise を返します。',
                    'TypeScriptのbigintリテラルは末尾に n を付けます (0n)。',
                    'Rustでは provider.get_balance(addr).await? と書き、結果は U256 です。',
                  ],
                },
              ],
            },
          },
          {
            title: 'EVMの中身を覗く',
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: 'EVMはスタックマシンだ',
                  slug: 'evm-stack-machine-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 12,
                  xpReward: 25,
                  content: `# EVMはスタックマシンだ

EVM（Ethereum Virtual Machine）は **スタックマシン** と呼ばれる仮想機械の一種です。レジスタや関数呼び出し規約を持たず、ほぼすべての計算を **スタック** の上で行います。

## 主要な「場所」

EVMは命令を実行する際、以下の3つを使います：

| 場所 | 性質 | 用途 |
| :--- | :--- | :--- |
| **Stack** | LIFOの最大1024段 | 計算の入出力 |
| **Memory** | 1トランザクション内で揮発 | 大きなデータの一時置き場 |
| **Storage** | 永続化される（高コスト） | コントラクトの状態 |

## ADD命令の動き

例えば「2つの数を足す」というOpcode \`ADD\` は次のように動きます：

\`\`\`
事前: スタック [..., 7, 5]
ADD実行
事後: スタック [..., 12]
\`\`\`

つまり：
1. スタックの一番上を2つ pop
2. 加算
3. 結果を push

## 本物のRevm \`Stack\`

これは理論ではなく、[\`crates/interpreter/src/interpreter/stack.rs\`](https://github.com/bluealloy/revm/blob/main/crates/interpreter/src/interpreter/stack.rs) にある実構造体：

\`\`\`rust
pub const STACK_LIMIT: usize = 1024;

#[derive(Debug, PartialEq, Eq, Hash)]
pub struct Stack {
    /// スタックの内部データ
    data: Vec<U256>,
}
\`\`\`

これがスタック構造の全て：\`U256\` のVec、上限1024。インタープリター内で呼ばれるメソッド群：

\`\`\`rust
pub fn new() -> Self
pub fn push(&mut self, value: U256) -> bool
pub fn pop(&mut self) -> Result<U256, InstructionResult>
pub fn peek(&self, no_from_top: usize) -> Result<U256, InstructionResult>
pub fn popn<const N: usize>(&mut self) -> Option<[U256; N]>
pub fn dup(&mut self, n: usize) -> bool
pub fn swap(&mut self, n: usize) -> bool
\`\`\`

注意深く読む：

- **\`push(...) -> bool\`** — pushできたら \`true\`、1024を超えたら \`false\`。インタープリターのマクロがこれをチェックして \`StackOverflow\` で抜ける。
- **\`pop(...) -> Result<...>\`** — 明示的なアンダーフロー検出、\`InstructionResult::StackUnderflow\` として返す。
- **\`popn<const N: usize>()\`** — **N個を一度にpop** し、固定サイズ配列で返す。const ジェネリクスによりコンパイラがpopループを展開。**これが \`popn_top!\` を速くしている正体**。

## ADD の実際の動作

2つpop、加算、push。擬似コード：

\`\`\`
事前: スタック [..., 7, 5]
ADD
事後: スタック [..., 12]
\`\`\`

でもAdvancedティアのプレビューで見た **本物の** \`add\` ソースは、両方popしてpushすらしません：1つpopし、もう1つには可変参照経由で書き戻す。RevmのインタープリターはEVMの概念モデルがそのままRustに対応しつつ、サイクル単位の最適化が重ねられている。

## なぜEVMはスタックマシンか

- **シンプルさ** — 命令セットが小さく、コンセンサスバグを減らせる
- **再現性** — 再実行と検証がしやすい
- **ZK化との相性** — スタックセマンティクスは制約系にきれいに写る（後のzkEVMで見ます）

## 練習

リポジトリで \`crates/interpreter/src/interpreter/stack.rs\` を開く。次を探す：

1. \`push\` 内の \`STACK_LIMIT\` チェック — オーバーフロー時に何をする？
2. \`popn\` の実装 — const \`N\` でコンパイラがループを完全に省略する仕組み
3. \`dup\` と \`swap\` メソッド — 確保せずインデックスを操作するだけ

これで次のレッスンで自分のミニスタックマシンを書く準備ができました。`,
                },
                {
                  title: 'チャレンジ：ミニEVMスタック',
                  slug: 'mini-evm-stack-ja',
                  type: 'CHALLENGE',
                  sortOrder: 1,
                  duration: 15,
                  xpReward: 30,
                  challengeLanguage: 'typescript',
                  content: `# チャレンジ：ミニEVMスタック

\`Vec\` のような配列を「スタック」として使い、\`ADD\` 命令を実装しましょう。

## 仕様

- \`push(n)\`: スタックに数値を積む
- \`add()\`: スタックの一番上から2つpopして合計をpushする
- \`peek()\`: スタックの一番上を返す（読み出すだけ）

## Rustでの典型実装

\`\`\`rust
fn main() {
    let mut stack: Vec<i64> = Vec::new();
    stack.push(100);
    stack.push(200);
    let a = stack.pop().unwrap();
    let b = stack.pop().unwrap();
    stack.push(a + b);
    println!("{:?}", stack); // [300]
}
\`\`\`

これを TypeScript でクラスとして実装してみてください。`,
                  starterCode: `class MiniEvmStack {
  private stack: number[] = [];

  push(n: number): void {
    // TODO
  }

  add(): void {
    // TODO: 上から2つpopして加算してpush
  }

  peek(): number | undefined {
    // TODO
    return undefined;
  }
}

const s = new MiniEvmStack();
s.push(100);
s.push(200);
s.add();
console.log(s.peek()); // 300
`,
                  solutionCode: `class MiniEvmStack {
  private stack: number[] = [];

  push(n: number): void {
    this.stack.push(n);
  }

  add(): void {
    const a = this.stack.pop();
    const b = this.stack.pop();
    if (a === undefined || b === undefined) {
      throw new Error("stack underflow");
    }
    this.stack.push(a + b);
  }

  peek(): number | undefined {
    return this.stack[this.stack.length - 1];
  }
}

const s = new MiniEvmStack();
s.push(100);
s.push(200);
s.add();
console.log(s.peek());
`,
                  hints: [
                    'JavaScriptの配列は push/pop メソッドが標準で使えます。',
                    'スタックが空の状態で add すると "underflow" が起きます。実際のEVMでも同じくエラーになります。',
                    'Rustなら Vec<u64> ですが、本物のEVMは U256 (256ビット整数) を使います。',
                  ],
                },
                {
                  title: 'Rust：async・トレイト・ジェネリクス',
                  slug: 'rust-async-traits-generics-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 15,
                  xpReward: 30,
                  content: `# Rust：async・トレイト・ジェネリクス

Revmや Reth のコードを読む前に、**3つの言語機能** を押さえておきます。これがないとAlloy/Reth本体のコードはほぼ読めません。

## 1. async / await — 「待つ」を書ける

ネットワーク通信のように **時間がかかる処理** を効率よく扱うための機能です。

\`\`\`rust
async fn fetch_block_number() -> u64 {
    // ここに重い処理（HTTP通信など）
    42
}

#[tokio::main]
async fn main() {
    let n = fetch_block_number().await;   // .await で実際に待つ
    println!("{}", n);
}
\`\`\`

### \`async\` が返すのは「未来の値」

\`async fn\` は実行されると **\`Future\`** という「あとで値になるもの」を返します。\`.await\` を呼ぶまで実は何も起きません。

### \`#[tokio::main]\` の正体

Rust標準には非同期ランタイムが入っていません。**tokio** を使ってランタイムを起動するのが \`#[tokio::main]\` の役割です。Alloyは tokio 上で動きます。

## 2. トレイト（trait） — 「○○できる」という契約

Java/TypeScriptの **interface** に近いものですが、もっと強力です。「この型は××ができる」を宣言します。

\`\`\`rust
trait HasArea {
    fn area(&self) -> f64;
}

struct Square { side: f64 }

impl HasArea for Square {
    fn area(&self) -> f64 {
        self.side * self.side
    }
}

let s = Square { side: 3.0 };
println!("{}", s.area());   // 9.0
\`\`\`

### Alloyではどう使われているか

\`\`\`rust
provider.get_block_number().await?;
\`\`\`

\`provider\` は **\`Provider\` トレイトを実装したなんらかの型** です。HTTP・WebSocket・IPCなど中身が違っても、同じインターフェースで呼べる。これがトレイトの威力です。

### トレイトの最重要ポイント — Reth/Revmで頻出

| パターン | 意味 |
| :--- | :--- |
| \`impl Trait for Type\` | 型にトレイトを実装 |
| \`fn f<T: Trait>(x: T)\` | 「Traitを実装した何か」を受け取る関数 |
| \`Box<dyn Trait>\` | 動的ディスパッチ（実行時にメソッド解決） |
| \`async fn ... -> Result<T, E>\` | async関数（Futureを返すトレイト実装の糖衣構文） |

## 3. ジェネリクス — 「型を後から決める」

\`Vec<i32>\` の \`<i32>\` がジェネリクスです。\`Vec\` は **何でも入れられる** が、コンパイル時にどの型を入れるか確定する。

\`\`\`rust
fn first<T: Clone>(v: &Vec<T>) -> T {
    v[0].clone()
}

let v = vec![10, 20, 30];
let f = first(&v);   // T = i32 と推論される
\`\`\`

### Alloyの \`Provider<N: Network = Ethereum>\`

実は Alloy の Provider は **「どのネットワーク向けか」** を型パラメータで持ちます。

\`\`\`rust
let p = ProviderBuilder::new()              // デフォルトは Ethereum
    .connect_http(rpc_url);

let p = ProviderBuilder::new()
    .network::<Optimism>()                  // 別のネットワークに切り替え
    .connect_http(rpc_url);
\`\`\`

これが「コンパイル時に型でチェーンが固定される＝ランタイムバグが減る」というRustらしい設計です。

## 4. ライフタイム（チラ見せ）

\`&str\` のような借用には実は **ライフタイム** \`<'a>\` という注釈が暗黙にあります。

\`\`\`rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() >= y.len() { x } else { y }
}
\`\`\`

「返す参照は、引数の参照と同じ寿命を持つ」というアノテーション。**最初は読めればOK**、書けるのは上級ティアで。

## 5. これからRevm/Rethで見る形

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

- \`async fn\` ：時間がかかる処理
- \`<Node: FullNodeComponents>\` ：ジェネリクス＋トレイト境界
- \`while let Some(x) = ...\` ：Optionの中身を取り出すパターン
- \`.await?\` ：非同期＋エラー伝播

すべて、ここまでで紹介した文法の組み合わせです。**読めれば、書けます。**

次のレッスンで、実際のRevmの世界に入っていきましょう。`,
                },
                {
                  title: 'Revmという「実行エンジン」',
                  slug: 'revm-introduction-ja',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 12,
                  xpReward: 25,
                  content: `# Revmという「実行エンジン」

ここまででAlloy（外側のRPC）と、EVMが「スタックマシン」であることを学びました。次の主役は **Revm** — 実際にOpcodeを実行する **エンジン** そのものです。

## Revmの位置づけ

\`\`\`
+----------------+
|     Reth       |  ← フルノード（同期・保存・コンセンサス）
+----------------+
|     Revm       |  ← 実行エンジン（このレイヤーをこれから学ぶ）
+----------------+
| Database / DB  |  ← 状態（Trie、KVS）
+----------------+
\`\`\`

## Revmの本物の高レベルAPI

Revmは以下を公開（[\`crates/revm/src/lib.rs\`](https://github.com/bluealloy/revm/blob/main/crates/revm/src/lib.rs)）：

| 型 | 役割 |
| :--- | :--- |
| **\`MainnetEvm\`** | 事前構築されたEthereumメインネットEVM |
| **\`ExecuteEvm\`**, **\`ExecuteCommitEvm\`** | トランザクション実行（commit = 状態変更も書き戻し） |
| **\`SystemCallEvm\`** | システムレベル呼び出し（例：Cancun以降のBEACONROOT） |
| **\`InspectEvm\`**, **\`InspectCommitEvm\`** | トレース版 — 同じ実行、フック付き |
| **\`Context\`** | 実行環境（block、tx、cfg） |
| **\`Journal\`**, **\`JournalEntry\`** | 状態変更追跡（revert用） |
| **\`Database\`**, **\`DatabaseRef\`**, **\`DatabaseCommit\`** | ストレージインターフェース（Advancedで扱う） |
| **\`Inspector\`** | 実行にフックするトレイト |

要点：Revmは **設計からしてモジュラー**。\`ExecuteEvm\`、\`InspectEvm\`、\`ExecuteCommitEvm\` は別のEVMではなく、**同じエンジンを異なるレイヤーで組み合わせた** もの。**必要なものだけ選ぶ**。

## Revmが提供するもの

- **EVM 命令の解釈**（Interpreter）
- **状態アクセスのトレイト**（\`Database\`）
- **ガス計算と例外処理**
- **ログとトレース** （Inspector経由）

## なぜRevmが「業界標準」になったのか

| 採用先 | 役割 |
| :--- | :--- |
| **Foundry** | Solidityのテストランナー・フォークシミュレーション |
| **Reth** | フルノードの実行エンジン |
| **OP-Reth** / **Tempo** | L2やApp-chainの基盤 |
| **zkVM（Risc0等）** | 証明可能なEVM実行 |
| **MEV/シミュレーション** | 1msでも速く取引を再現したい場面 |

「ライブラリとして使える」「Rustなので組み込みやすい」「カスタマイズが容易」という3点が、ほぼ独占を生み出した理由です。

## 次のステップ

Revmは「動かすための部品」が分かれば、コードを読み始められます。**次のレッスン** で Foundry — 日常的に使う Rust EVM ツールチェイン — を扱い、その後 **Advanced** ティアで Interpreter フォルダに入ります。`,
                },
                {
                  title: 'Foundry — Rust EVMツールチェイン',
                  slug: 'foundry-toolchain-ja',
                  type: 'CONTENT',
                  sortOrder: 4,
                  duration: 18,
                  xpReward: 35,
                  content: `# Foundry — Rust EVMツールチェイン

Reth（ノード）と Revm（エンジン）は見ました。**Rust EVM スタックの第3の柱** が **[Foundry](https://github.com/foundry-rs/foundry)** — Paradigm の Solidity 開発ツールチェインで、すべてが Revm の上に作られています。Rust EVM チェーンに触れる Solidity を書くなら、Foundry を毎日使うことになります。

4つのバイナリ：

| ツール | 役割 |
| :--- | :--- |
| **forge** | Solidity のビルド・テスト・フォーマット — テストは Revm の中で走る |
| **cast** | 「スイスアーミーナイフ」 — コントラクト呼び出し、calldata デコード、チェーンクエリ |
| **anvil** | ローカル Ethereum ノード（メインネットフォーク機能付き、Revm ベース） |
| **chisel** | Solidity REPL — コードを貼って即 Revm で実行 |

## 1. インストール — [Foundry リポジトリ README](https://github.com/foundry-rs/foundry) より一字一句

\`\`\`bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
\`\`\`

\`foundryup\` は最新の \`forge\`/\`cast\`/\`anvil\`/\`chisel\` を \`~/.foundry/bin\` に配置するマネージャ。

## 2. \`forge\` — Revm 上で動く Solidity

\`\`\`bash
forge init counter && cd counter
forge build
forge test
\`\`\`

\`forge test\` がハイライト。これが何をするか：

1. Solidity テストをコンパイル
2. **メモリ内DBの新しい Revm インスタンスを起動**
3. 各 \`testXxx\` 関数を Revm 経由で実行
4. pass/fail、ガス使用量、トレースを報告

ここで既に Revm を使っています。\`forge test\` は、ほとんどの Solidity 開発者にとって **毎日触れる本番 Revm 利用例**。

## 3. Cheatcodes — Foundry の秘密兵器

Solidity テストの中で、通常のコントラクトでは不可能なことができます：

\`\`\`solidity
import "forge-std/Test.sol";

contract MyTest is Test {
    function testTransfer() public {
        vm.deal(alice, 10 ether);             // alice に 10 ETH 与える
        vm.warp(block.timestamp + 1 days);    // 1日進める
        vm.prank(alice);                       // 次のコールは alice 発信扱い
        myContract.transfer(bob, 1 ether);
    }
}
\`\`\`

なぜ可能か？**Cheatcodes は、Foundry が Revm precompile として注入した特殊アドレスへのコール**。[\`forge-std/src/Base.sol\`](https://github.com/foundry-rs/forge-std/blob/master/src/Base.sol) より：

\`\`\`solidity
address internal constant VM_ADDRESS = 0x7109709ECfa91a80626fF3989D68f67F5b1DD12D;
\`\`\`

このアドレスは **暗号学的特性を持たない** — 文字通り：

\`\`\`solidity
address(uint160(uint256(keccak256("hevm cheat code"))))
\`\`\`

Foundry はこのアドレスに **カスタム precompile を登録した Revm** を回しています。Solidity から \`vm.deal(...)\` を呼ぶと、実際は \`0x7109...\` への \`CALL\` で ABI エンコード引数を渡している — そして Foundry の Rust コードが横取りする。

これが **Expert ティアで見る precompile 登録機構そのもの**。Foundry は最も広く使われている本番のカスタム precompile 実例。

## 4. \`cast\` — EVM スイスアーミーナイフ

\`\`\`bash
# 任意のチェーンと通信
cast block-number --rpc-url https://eth.merkle.io
cast balance vitalik.eth --ether --rpc-url https://eth.merkle.io

# calldata 検査
cast 4byte 0xa9059cbb              # → "transfer(address,uint256)"
cast --abi-decode "balanceOf(address)(uint256)" 0x...

# ストレージ読み取り
cast storage 0xUniswapV2Pair 0 --rpc-url https://eth.merkle.io

# tx を送らずにコール（eth_call）
cast call $TOKEN "balanceOf(address)(uint256)" $WALLET --rpc-url ...
\`\`\`

MEV サーチャーや RPC エンジニアにとって、\`cast\` は反射神経レベルのツール。1日に何十回もチェーン状態を確認するのに使う。

## 5. \`anvil\` — ローカルノード + メインネットフォーク

\`\`\`bash
# スタンドアロンのローカルチェーン — 即時ブロック、10アカウントに資金あり
anvil

# 最新ブロックでメインネットフォーク — ローカルから本物のプロトコルと対話
anvil --fork-url https://eth.merkle.io
\`\`\`

フォークモードがキラー機能。これは **\`AlloyDB\` 型のバッキングストアを持つ Revm インスタンス** で、上流 RPC から状態を遅延ロードします。**Uniswap V3 のメインネット状態に対して、ラップトップから testnet 不要で対話できる**。

内部的には anvil は MEV レッスンで見た \`forked_db\` と同じファミリーのコード。anvil はそれを Rust API ではなく JSON-RPC で公開しているだけ。

## 6. \`chisel\` — Solidity REPL

\`\`\`bash
chisel
> uint256 x = 1 + 2 * 3;
> x
7
> address(0x1).balance
0
\`\`\`

裏は Revm。1行打って即結果。フルファイルを書かずに済むコントラクト実験用。

## 7. ハードコア Rust EVM 開発でなぜ重要か

本格的な Rust EVM 開発を目指すなら、Foundry は **日常ツールであり、巨大な Revm 利用例として学べる** 存在：

- \`foundry-rs/foundry/crates/cheatcodes\` を読めば、本番のカスタム precompile システムが分かる
- \`forge\` テストランナーはファジング・invariant テスト・カバレッジ付きの本物の Revm オーケストレータ
- \`anvil\` の状態フォーキングは、Database レッスンの \`AlloyDB\` パターンの本番版

## 練習

1. Foundry インストール：\`curl -L https://foundry.paradigm.xyz | bash && foundryup\`
2. \`forge init my-test && cd my-test && forge test\` — 最初の Revm バックの Solidity テストを実行
3. \`anvil --fork-url <RPC>\` — メインネットをローカルにフォーク
4. 別のターミナルで：\`cast call $UNISWAP_V3_POOL "slot0()" --rpc-url http://localhost:8545\` — ローカルフォーク経由で生きた Uniswap 状態を読む
5. [\`forge-std/src/Vm.sol\`](https://github.com/foundry-rs/forge-std/blob/master/src/Vm.sol) を開いて cheatcode インターフェースを眺める — 各エントリが Foundry の Rust precompile の関数に対応している

これで Revm を学習者として、また毎日のユーザーとして使う立場になりました。`,
                },
                {
                  title: 'Fundamentalsまとめクイズ',
                  slug: 'fundamentals-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 5,
                  duration: 12,
                  xpReward: 30,
                  content: `# Fundamentalsまとめクイズ

Alloy・EVM・Revmの基礎を理解できたか確認します。`,
                  quizQuestions: [
                    {
                      question: 'Alloyの `PrivateKeySigner::random()` で得られるものは？',
                      options: [
                        '公開ノードへのRPC接続',
                        'ランダムな秘密鍵から派生したシグナー（署名器）',
                        'ガス代の見積もり',
                        '監査済みのスマートコントラクト',
                      ],
                      correctIndex: 1,
                      explanation: 'PrivateKeySignerは秘密鍵を保持し、署名を行うオブジェクトです。.address()で公開アドレスを取り出せます。',
                    },
                    {
                      question: 'Alloyの `ProviderBuilder::new().on_http(url)` で作るのは？',
                      options: [
                        'ローカルWebサーバー',
                        'JSON-RPC経由でノードと通信するProviderインスタンス',
                        'ウォレットアプリ',
                        '新しいブロックチェーン',
                      ],
                      correctIndex: 1,
                      explanation: 'ProviderはノードへのRPCクライアントで、get_block_numberやget_balanceなどのメソッドを提供します。',
                    },
                    {
                      question: 'EVMの `ADD` 命令はどのように動きますか？',
                      options: [
                        'メモリの先頭2バイトを足す',
                        'スタックから2つpopして加算結果をpushする',
                        'ストレージスロット0と1を足してスロット2に書く',
                        'gasLimitを2倍にする',
                      ],
                      correctIndex: 1,
                      explanation: 'EVMはスタックマシンで、ADDはスタック上の2つの値をpopし加算結果をpushします。オーバーフローはuint256でラップします。',
                    },
                    {
                      question: 'Revmが Foundry や Reth で使われている主な理由は？',
                      options: [
                        '無償で公開されているEVMはRevmだけだから',
                        'モジュラー設計で「ライブラリとして」組み込みやすく、Rustによる安全性と性能を持つから',
                        'Geth（Go言語）との互換性のために必要だから',
                        'Solidityコンパイラが内蔵されているから',
                      ],
                      correctIndex: 1,
                      explanation: 'Revmはライブラリとして設計されており、Foundry、Reth、OP-Reth、各種zkVM、MEVボットなどで採用されています。',
                    },
                    {
                      question: 'EVMで「永続化される」のはどの記憶領域ですか？',
                      options: [
                        'スタック（Stack）',
                        'メモリ（Memory）',
                        'ストレージ（Storage）',
                        'カレンダー（Calldata）',
                      ],
                      correctIndex: 2,
                      explanation: 'スタックとメモリはトランザクション内のみ揮発、Storageだけがブロックチェーン状態に永続化されます。書き込みコストが高いのもStorageの特徴です。',
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
