import { PrismaClient } from '@prisma/client';

export async function seedRethFundamentalsV3JA(prisma: PrismaClient) {
  const tags = ['rust', 'alloy', 'evm', 'fundamentals', 'beginner'];

  await prisma.course.create({
    data: {
      slug: 'reth-fundamentals-v3-ja',
      title: 'Reth Fundamentals — Alloy で動かす最初の一歩',
      description:
        'Rust × Ethereum の最初の道具立てを 11 レッスンで揃える — Rust の所有権 / Result / async、Alloy の Address / U256 / Signer / Provider、EVM のスタックマシンと 5 記憶領域、Revm 実行エンジン、Foundry ツールチェイン。BEGINNER 向け、3 クイズで定着確認、修了時に 3 中級コース（Inside Revm / Inside Reth / Inside Alloy）へ進む準備が整う。',
      difficulty: 'BEGINNER',
      duration: 139,
      xpReward: 290,
      track: 'reth-fundamentals',
      tags,
      isPublished: true,
      sortOrder: 110,
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
                  title: 'レッスン1 — Rust：所有権と借用の5分入門',
                  slug: 'rust-ownership-borrowing-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 12,
                  xpReward: 25,
                  content: `# レッスン1 — Rust：所有権と借用の5分入門

## 問い

これから Alloy を書き始めると必ず突き当たるのが **所有権（ownership）**。Rust 最大の特徴で最初の壁。完璧な理解は不要、**「コードを読みながらルールを思い出せる」** 状態を目指す。

## 原理（最小モデル）

- **所有権 = コンパイル時のメモリ管理.** C/C++ は人間が、Java/JS は GC が、Rust はコンパイラが「誰が所有し、いつ解放するか」を検証 → GC なし安全 + 二重解放 / use-after-free 防止 + データ競合防止。
- **3 ルール.** ① 各値には所有者がちょうど 1 人、② 所有者がスコープを抜けると値はドロップ、③ 値はムーブ or 借用される。
- **借用 \`&\` と \`&mut\`.** \`&\` = 読み取り（複数同時可）/ \`&mut\` = 書き換え（同時に 1 つだけ）= データ競合をコンパイル時に防ぐ。
- **\`&str\` = 文字列の借用.** \`String\` を所有 + その一部を \`&str\` として貸す、関数引数 \`&str\` は「読み取りで十分、所有権不要」の宣言。
- **Alloy で頻出する 3 パターン.** \`"...".parse()?\`（文字列パース + エラー伝播）/ \`provider.get_balance(&address).await?\`（借用渡し）/ \`let mut signer = ...\`（書き換え許可）。

## 具体例 + ステップで組み立てる

# Rust：所有権と借用の5分入門


これからAlloyを書き始めると、必ず突き当たるのが **所有権（ownership）** である。Rust最大の特徴であり、最初の壁でもある。完璧な理解は不要で、**「コードを読みながらルールを思い出せる」** 状態を目指す。

## 1. なぜ所有権が必要なのか

C/C++は人間がメモリ管理を担い、Java/JSはGCが担う。Rustは **コンパイル時に「誰が所有し、いつ解放するか」を検証** する第三の道を取る。

そのおかげで、

- ガベージコレクタなしで安全
- メモリ二重解放やuse-after-freeがコンパイル時に検出される
- 並行処理でデータ競合がコンパイル時に検出される

…という「金融資産を扱うコードに適した性質」が得られる。

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

このルールで、データ競合はコンパイル時に防がれる。

## 6. \`&str\` は何者なのか

実は \`&str\` は **「文字列の借用」** である。\`String\` を所有し、その一部を \`&str\` として貸し出すイメージになる。

\`\`\`rust
let owned: String = String::from("Hello, Alloy");
let borrowed: &str = &owned;   // 借用
\`\`\`

関数引数で \`&str\` を要求するのは、「読み取りで十分で所有権は不要」という宣言である。

## 7. これからAlloyコードで見るパターン

\`\`\`rust
// 「.parse()?」 → 文字列をパースしてエラーは伝播
let url = "https://eth.llamarpc.com".parse()?;

// 「&」で借用を渡す
provider.get_balance(&address).await?;

// 「mut」で書き換え許可
let mut signer = PrivateKeySigner::random();
\`\`\`

これらはすべて所有権ルールに由来する。次のレッスンでAlloyコードを書くときに「これは借用だ」と気づければ十分である。

## まとめ

| 記号 | 意味 |
| :--- | :--- |
| \`x\` | 所有 |
| \`&x\` | 借用（読み取り） |
| \`&mut x\` | 借用（書き換え） |
| \`mut x\` | 変数を書き換え可にする |

所有権の感覚は **書きながら身につける** ものなので、いま完璧でなくて大丈夫。次へ進みましょう。

## まとめ（3行）

- 所有権 3 ルール = 各値 1 所有者、スコープ離脱でドロップ、ムーブ or 借用、コンパイル時メモリ管理 = GC なし安全。
- \`&\` 読み取り（複数可）+ \`&mut\` 書き換え（1 つだけ）= データ競合防止、\`&str\` は \`String\` の借用。
- 完璧な理解は不要、「コードを読みながら思い出せる」が目標、次レッスンで Alloy 基本型と署名へ。
`,
                },
                {
                  title: 'レッスン2 — Alloyの基本型と署名',
                  slug: 'alloy-primitives-signing-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 12,
                  xpReward: 25,
                  content: `# レッスン2 — Alloyの基本型と署名

## 問い

Alloy で Ethereum を扱うときの最初の道具立て — **アドレス / U256 / B256 / 署名**。型システムが「これは Address、これは uint256」と区別してくれるので、誤って混ぜることがない。本レッスンで Alloy 基本型を見て、Signer で鍵を作る。

## 原理（最小モデル）

- **3 primitive 型.** \`Address\`（20 バイト、コントラクト or EOA）/ \`U256\`（256 ビット符号なし整数、wei 金額）/ \`B256\`（32 バイト、ハッシュやスロットキー）。
- **\`.parse::<Address>()\`.** 文字列 → \`Address\`、checksum 検証込み、不正なら \`Err\`。
- **\`U256\` リテラル.** \`U256::from(1_000_000)\`（u64 から）/ \`"1000000".parse()?\`（文字列から）/ \`parse_ether("1")?\`（ETH 単位）。
- **\`Signer\` トレイト.** 鍵を持って署名を作る抽象、\`PrivateKeySigner::random()\` で新規鍵、\`.address()\` で公開アドレス取得。
- **Ledger / AWS KMS 等もSigner で抽象化.** 後の Inside Alloy で詳細、ここでは「Signer = 署名できる何か」で十分。

## 具体例 + ステップで組み立てる

# Alloyの基本型と署名


最初に **Alloy** を直接触る。Alloyは「EthereumをRustで扱うためのライブラリ群」で、Rethも内部でこれを活用している。

## 1. プロジェクトの準備

\`\`\`bash
cargo new hello_alloy
cd hello_alloy
\`\`\`

\`Cargo.toml\` の \`[dependencies]\` に追記する。

\`\`\`toml
[dependencies]
alloy = { version = "1.0", features = ["full"] }
tokio = { version = "1", features = ["full"] }
eyre = "0.6"
\`\`\`

> **Tip**: バージョンは執筆時点のもの。実際は最新版を [crates.io](https://crates.io/crates/alloy) で確認する。\`eyre\` は読みやすいエラー出力向けのクレートである。

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

\`src/main.rs\` にコピーして \`cargo run\` する。ランダム生成シグナーのアドレス、署名、検証で復元したアドレス（一致するはず）が表示される。

\`\`\`mermaid
sequenceDiagram
    participant Signer as PrivateKeySigner
    participant Msg as メッセージバイト
    participant Hash as EIP-191 ハッシュ
    participant Sig as 署名
    participant Verify as recover_address_from_msg

    Signer->>Msg: "hello" を取得
    Msg->>Hash: prefix + keccak256
    Hash->>Sig: sign(privkey, hash)
    Sig-->>Verify: 署名 + 元メッセージ
    Verify->>Hash: prefix付きで再ハッシュ
    Verify-->>Signer: 復元したアドレス
\`\`\`

## 3. このコードが教えること

### \`PrivateKeySigner::random()\`
セキュアRNGで新しい鍵ペア生成。**本番資金には絶対に使わないこと** — テストと学習用。本番では環境変数、暗号化キーストア、ハードウェアウォレットから読み込む。

### \`with_chain_id(Some(1337))\`
EIP-155 はチェーンIDを署名に含めるため、チェーンAで署名したtxをチェーンBへ再送できなくする。**本番では必須**。 \`1337\` はローカルAnvilの典型的チェーンIDである。

### \`sign_message(message).await\`
**EIP-191** （"Ethereum signed message" プレフィックス）を実装。JSON-RPCの \`personal_sign\` や \`window.ethereum.request("personal_sign", ...)\` が返すものと同じ。async なのは、ハードウェアウォレット（Ledger/Trezor）が応答に時間がかかるため — ローカルシグナーも同じインターフェースで差し替え可能。

### \`signature.recover_address_from_msg(&message[..])\`
検証側。署名と元メッセージから、署名者のアドレスを復元。これが **「Sign in with Ethereum」の作り方** — サーバーがnonceを発行、ユーザーが署名、サーバーがアドレスを復元。パスワード不要。

## 4. \`address!\` マクロ

\`\`\`rust
use alloy::primitives::address;

let recipient = address!("d8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
\`\`\`

\`address!\` は **手続きマクロ** で、コンパイル時に走る。1桁タイポや長さミスは **コンパイル時に失敗** し、送信時の実行時エラーにしない。Expertティアで内部実装を正確に扱う。

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

次は \`Result\`・\`Option\`・\`?\` — Provider に触れる前に押さえるべきエラーハンドリングの語彙。

## まとめ（3行）

- 3 primitive = \`Address\` 20 バイト / \`U256\` 256 ビット / \`B256\` 32 バイト、型システムが「これは Address、これは wei」を区別。
- \`.parse()\` で文字列 → 型、\`U256::from()\` で数値 → U256、\`parse_ether("1")\` で ETH 単位、お金は f64 でなく U256。
- \`Signer\` = 署名できる何か、\`PrivateKeySigner::random()\` で新規鍵、\`.address()\` で公開アドレス、次は Result/Option/?。
`,
                },
                {
                  title: 'レッスン3 — Rust：Result・Option・`?` 演算子',
                  slug: 'rust-result-option-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 12,
                  xpReward: 25,
                  content: `# レッスン3 — Rust：Result・Option・\`?\` 演算子

## 問い

Rust にはエラーを返す関数が大量にある。それらをすべて手動でアンラップすると、**コードが try/catch だらけになる**。Rust は \`?\` 演算子で「エラーなら早期 return、成功なら値を取り出す」を 1 文字で書ける。Alloy のコードを読むときに \`?\` が至る所に出てくる理由を理解する。

## 原理（最小モデル）

- **\`Result<T, E>\`.** 成功 = \`Ok(T)\`、失敗 = \`Err(E)\`、関数の戻り値型として「失敗しうる」を型で表現。
- **\`Option<T>\`.** 値あり = \`Some(T)\`、なし = \`None\`、null の代わり、unwrap せずに済む。
- **\`?\` 演算子.** \`result?\` = \`match result { Ok(v) => v, Err(e) => return Err(e.into()) }\` の糖衣、エラーは呼び出し元へ自動伝播。
- **\`.await?\` 組み合わせ.** async 関数で頻出、\`.await\` で Future 完了待ち + \`?\` でエラー伝播 = 同期的に書ける async コード。
- **\`unwrap()\` vs \`?\`.** \`unwrap()\` = エラーで panic（学習 / プロトタイプ）、\`?\` = エラーを呼び出し元へ伝播（本番コード）。

## 具体例 + ステップで組み立てる

# Rust：Result・Option・\`?\` 演算子


Alloyコードでは、ほぼすべての行に \`.await?\` や \`.parse()?\` が出る。これは **Rustのエラーハンドリング** 構文である。

## 1. なぜ例外がないのか

Rustに try/catch（例外）はない。代わりに **値としてエラーを返す** 設計を取る。

- 関数は「成功」か「失敗」を **\`Result<T, E>\`** で返す
- 値があるかないかは **\`Option<T>\`** で返す

これらは \`enum\`（列挙型）である。

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

\`?\` は **「エラーなら今すぐ関数からreturn、成功なら中身を取り出す」** という意味だ。

\`\`\`rust
fn parse_two(a: &str, b: &str) -> Result<(i32, i32), std::num::ParseIntError> {
    let x = a.parse::<i32>()?;   // 失敗したら早期リターン
    let y = b.parse::<i32>()?;   // 失敗したら早期リターン
    Ok((x, y))
}
\`\`\`

\`?\` がない場合、毎回 \`match\` を書く必要があり、同じ意味のコードが大きく長くなる。

## 5. \`Result<(), Box<dyn Error>>\` と \`eyre::Result<()>\`

main関数の戻り値でよく見るやつです：

| 型 | 意味 |
| :--- | :--- |
| \`Result<(), Box<dyn std::error::Error>>\` | 標準ライブラリのみ（やや冗長） |
| \`eyre::Result<()>\` | **\`eyre\`** クレートの便利版（推奨） |

\`eyre\` は「読みやすいエラー出力」と「多様なエラー型の統合」が特徴である。Alloyコードでは \`eyre::Result<()>\` が事実上の標準になる。

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

ほぼすべての行で \`?\` が活躍する。**「成功ならそのまま、失敗なら呼び出し元へ返す」** と覚えればよい。

次のレッスンでこれを実際のProvider接続コードに使う。

## まとめ（3行）

- \`Result<T, E>\` 成功 / 失敗 + \`Option<T>\` 値あり / なし = Rust のエラー / 不在表現、type system が「失敗しうる」を強制。
- \`?\` 演算子 = エラー時に早期 return、\`.await?\` で async + エラー伝播、try/catch の地獄を 1 文字で避ける。
- \`unwrap()\` は学習用 / \`?\` は本番、次は \`Provider\` でノードへ接続。
`,
                },
                {
                  title: 'レッスン4 — Provider — ノードへ接続する',
                  slug: 'alloy-provider-ja',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 12,
                  xpReward: 25,
                  content: `# レッスン4 — Provider — ノードへ接続する

## 問い

ここまでの 3 レッスンで Rust と Alloy 型を扱えるようになった。**次は Ethereum ノードと話す方法** — \`Provider\` がそのインターフェース。HTTP / WebSocket / IPC / Anvil-fork どれでも、**同じ trait の同じメソッド** で叩ける。

## 原理（最小モデル）

- **\`Provider\` トレイト.** ノードへの RPC クライアント抽象、\`get_block_number\` / \`get_balance\` / \`call\` / \`send_transaction\` 等の動詞。
- **\`ProviderBuilder::new().connect_http(url)\`.** HTTP 経由のプロバイダを作る、\`url.parse()?\` で \`Url\` 型に。
- **Public RPC エンドポイント.** \`https://ethereum.reth.rs/rpc\`（rethlab 公式、無料）/ \`https://eth.llamarpc.com\`（llamarpc）/ Alchemy / Infura（API key 必要）。
- **async メソッド.** \`provider.get_block_number().await?\` = ネットワーク往復、Tokio ランタイム上で実行。
- **\`#[tokio::main]\`.** \`main()\` を async 化、ランタイム起動 + 最後まで待つ、初心者の boilerplate。

## 具体例 + ステップで組み立てる

# Provider — ノードへ接続する


Alloyの **Provider** は「ノードへの窓口」である。これを通じてブロック番号・残高・トランザクション情報を取得する。

## 最小コード — 一字一句そのまま

これは [\`alloy-rs/examples\`](https://github.com/alloy-rs/examples/blob/main/examples/providers/examples/http.rs) の \`http.rs\` をベースにした最小プロジェクトである。

まず \`Cargo.toml\`：

\`\`\`toml
[package]
name = "hello_provider"
version = "0.1.0"
edition = "2024"

[dependencies]
alloy = "2.0.5"
alloy-provider = "2.0.5"
eyre = "0.6.12"
tokio = { version = "1", features = ["full"] }
\`\`\`

次に \`src/main.rs\`：

\`\`\`rust
use alloy::providers::{Provider, ProviderBuilder};
use eyre::Result;

#[tokio::main]
async fn main() -> Result<()> {
    let rpc_url = "https://ethereum.reth.rs/rpc".parse()?;
    let provider = ProviderBuilder::new().connect_http(rpc_url);

    let latest_block = provider.get_block_number().await?;

    println!("Latest block number: {}", latest_block);

    Ok(())
}
\`\`\`

\`cargo run\` するとメインネットの最新ブロック番号が表示される。**これが監視Botの出発点** になる。

URLに注目: \`https://ethereum.reth.rs/rpc\` は **Reth プロジェクトが運営する公開RPCエンドポイント** である。コードは既に文字通り Reth ノードと通信している。

## よく使うProviderメソッド

| メソッド | 役割 |
| :--- | :--- |
| \`get_block_number\` | 最新ブロック番号 |
| \`get_balance(address)\` | ETH残高 |
| \`get_block(...)\` | ブロックの詳細 |
| \`get_transaction_by_hash(hash)\` | トランザクション詳細 |
| \`get_logs(filter)\` | イベントログの取得 |

## 任意のEVM互換チェーンに繋ぐ

URLを差し替えるだけで、HyperEVM、Optimism、Anvil（ローカル）などにも接続できる。

\`\`\`rust
let provider = ProviderBuilder::new()
    .connect_http("https://api.hyperliquid.xyz/evm".parse()?); // HyperEVM
let provider = ProviderBuilder::new()
    .connect_http("http://127.0.0.1:8545".parse()?);          // Anvil
\`\`\`

## ローカルで試すなら Anvil

[Foundry](https://book.getfoundry.sh/) に同梱の **Anvil** を使うと、自分のマシン上でローカルなEthereumノードを立てられます（後で \`--fork-url\` を付ければメインネットフォークにもできます）。

\`\`\`bash
anvil
\`\`\`

ガス代なしで残高変更や送金を試せるため、学習用途に向く。

## 次のステップ

これでAlloyの「Read」（読み取り）まで来た。次のモジュールでは、EVMが実際に「動く」中身（スタック、メモリ、Opcode）に踏み込む。

## まとめ（3行）

- \`Provider\` = ノードへの RPC クライアント抽象、HTTP / WebSocket / IPC / Anvil-fork どれでも同じ trait + 同じメソッド。
- \`ProviderBuilder::new().connect_http(url)\` で作成、public RPC は \`ethereum.reth.rs/rpc\` 等、async メソッドで往復。
- \`#[tokio::main]\` で main async 化、次は学んだ要素を組み合わせた残高チェッカークイズ。
`,
                },
                {
                  title: 'クイズ — 残高チェッカー',
                  slug: 'balance-checker-challenge-ja',
                  type: 'QUIZ',
                  sortOrder: 4,
                  duration: 15,
                  xpReward: 30,
                  content: `# クイズ — 残高チェッカー

## 問い

指定アドレスの ETH 残高がゼロなら \`true\` を返す関数を書く。**Provider + get_balance + \`.await?\` + Option/Result の組み合わせを 1 関数で使う実践クイズ**。Vitalik のアドレスで動作確認。

## 原理（最小モデル）

- **関数シグネチャ.** \`async fn is_empty_wallet(provider: &impl Provider, address: Address) -> eyre::Result<bool>\`。
- **\`&impl Provider\`.** 任意の Provider 実装を受け取れる、トレイト境界によるポリモーフィズム = HTTP / WebSocket / Anvil-fork どれでも。
- **\`get_balance(address).await?\`.** Future を完了まで待つ + エラー伝播、\`U256\` 残高を取り出す。
- **\`.is_zero()\`.** \`U256\` のゼロ判定慣用表現、\`balance == 0u64\` は型不一致でコンパイルエラー。
- **Wei 単位.** \`get_balance\` は **wei** を \`U256\` で返す、ETH は 10¹⁸ wei、\`format_ether\` で表示用変換、\`f64\` は精度損失で絶対 NG。

## 具体例 + ステップで組み立てる

# クイズ：残高チェッカー

ゴール：指定したアドレスの ETH 残高がゼロなら \`true\`、それ以外なら \`false\` を返す関数を書く。

## 必要な要素

Alloy で既に出会った2つ：

- \`Provider\` — \`ProviderBuilder::new().connect_http(url)\` で作る（Provider レッスン）
- \`get_balance(address)\` — 残高を返す async メソッド

加えて、前の Rust レッスンで扱った **\`?\` 演算子**（\`async\` 呼び出しでのエラー伝播：\`x.await?\`）。

## 自分で書いてみる

Rust Playground には Alloy が無いので、ローカルで新規プロジェクト：

\`\`\`bash
cargo new balance-check && cd balance-check
\`\`\`

\`Cargo.toml\`：

\`\`\`toml
[dependencies]
alloy = { version = "1.0", features = ["full"] }
tokio = { version = "1", features = ["full"] }
eyre = "0.6"
\`\`\`

\`src/main.rs\` に、このシグネチャで関数を書く：

\`\`\`rust
async fn is_empty_wallet(
    provider: &impl Provider,
    address: Address,
) -> eyre::Result<bool> {
    // ここを書く
}
\`\`\`

\`main\` から呼ぶ：

\`\`\`rust
#[tokio::main]
async fn main() -> eyre::Result<()> {
    let provider = ProviderBuilder::new()
        .connect_http("https://ethereum.reth.rs/rpc".parse()?);

    let vitalik = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045".parse::<Address>()?;
    println!("vitalik empty? {}", is_empty_wallet(&provider, vitalik).await?);

    Ok(())
}
\`\`\`

詰まったとき：

- \`provider.get_balance(address)\` は Future を返す — \`.await?\` で残高を取り出す
- 残高の型は \`U256\`。「ゼロか？」を聞く慣用メソッドがある — Alloy ドキュメントで探す
- \`Result<...>\` を返す関数なら最後は \`Ok(...)\` で包む

\`cargo run\` で公開 Reth RPC に問い合わせ、Vitalik のウォレットが空かどうかを返す（空ではない）。

## クイズ

## まとめ（3行）

- \`async fn is_empty_wallet(&impl Provider, Address) -> eyre::Result<bool>\` + \`get_balance(addr).await?.is_zero()\` の 1 行。
- \`impl Provider\` でトレイト境界ポリモーフィズム、\`is_zero()\` で U256 のゼロ判定、wei 単位を \`U256\` で扱う（\`f64\` 不可）。
- 次は EVM の中身を覗くモジュール、まず EVM スタックマシンの基本構造へ。
`,
                  quizQuestions: [
                    {
                      "question": "ウォレット残高がゼロかをチェックする Rust + Alloy のスニペットとして正しいのは？",
                      "options": [
                        "`provider.balance(addr) == 0`",
                        "`provider.get_balance(addr).await?.is_zero()`",
                        "`provider.is_zero(addr).await?`",
                        "`provider.get_balance(addr) == U256::ZERO`"
                      ],
                      "correctIndex": 1,
                      "explanation": "`get_balance` は async で `Result<U256>` を返す。`await?` で完了を待ち、エラーは伝播する。`is_zero()` が `U256` のゼロ判定の慣用表現。"
                    },
                    {
                      "question": "`get_balance` を呼ぶ行で `.await?` を書く理由は？",
                      "options": [
                        "`.await` は飾り、`?` だけが必要",
                        "`async fn` だから",
                        "`.await` は Future を完了まで poll し、`?` は失敗時にエラーを呼び出し元へ伝播する",
                        "`.await` で実行が速くなる"
                      ],
                      "correctIndex": 2,
                      "explanation": "2つの別演算子の組み合わせ：`.await` は Future を完了まで進める（`get_balance` が async なので）、`?` は結果が `Err` のとき早期 return する。"
                    },
                    {
                      "question": "`balance`（`U256`）と `0u64` を `==` で直接比較するとどうなる？",
                      "options": [
                        "`0` は自動変換されるので動く",
                        "コンパイルは通るが警告が出る",
                        "コンパイルエラー — 型が違う",
                        "ランタイムでパニック"
                      ],
                      "correctIndex": 2,
                      "explanation": "Rust は数値型を暗黙変換しない。`U256 == u64` はコンパイルエラー。`balance == U256::from(0)` か、より慣用的に `balance.is_zero()` を使う。"
                    },
                    {
                      "question": "Provider の `get_balance` が返す残高の単位は？",
                      "options": [
                        "ETH（浮動小数）",
                        "Gwei",
                        "Wei（`U256` 型）",
                        "Lamport"
                      ],
                      "correctIndex": 2,
                      "explanation": "`get_balance` は **wei** を `U256` で返す。ETH 表示には 10^18 で割るが、お金の精度が重要なので `f64` は絶対NG。Alloy の `format_ether` を使う。"
                    },
                    {
                      "question": "関数シグネチャが具体型でなく `&impl Provider` を取る理由は？",
                      "options": [
                        "`impl` は単なる省略記法で実質的な違いはない",
                        "任意の Provider 実装（HTTP・WebSocket・Anvil-fork）を受け取れる — トレイト境界によるポリモーフィズム",
                        "`await` のために必須",
                        "メモリ節約のため"
                      ],
                      "correctIndex": 1,
                      "explanation": "`impl Provider` は「`Provider` トレイトを実装した何らかの具体型」を意味する。同じ関数を HTTP プロバイダ、WebSocket プロバイダ、テスト用インメモリプロバイダに対して書き直さずに使える。"
                    }
                  ],
                },
              ],
            },
          },
          {
            title: 'EVM の中身を覗く',
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: 'レッスン6 — EVMはスタックマシンだ',
                  slug: 'evm-stack-machine-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 12,
                  xpReward: 25,
                  content: `# レッスン6 — EVMはスタックマシンだ

## 問い

これまで Alloy で「外側から」Ethereum と話してきた。**ここから EVM の中身を覗く** — Ethereum Virtual Machine は何で、どう動くか。EVM は **スタックマシン**、レジスタもメモリアドレスもなく、ただ「上に積む / 下から取り出す」だけで計算する。

## 原理（最小モデル）

- **スタックマシン vs レジスタマシン.** スタック = 値の置き場が 1 つ（top）/ レジスタ = 名前付き場所が複数（R0, R1, ...）。EVM は 1024 段のスタックのみ。
- **5 つの記憶領域.** Stack（1024 段、現行計算）/ Memory（揮発、tx 内のみ）/ Calldata（読み専用、tx の入力）/ Storage（永続化、ブロックチェーン状態）/ Code（読み専用、コントラクトコード）。
- **Opcode = 1 バイト命令.** \`0x01 ADD\` / \`0x60 PUSH1\` / \`0x52 MSTORE\` / \`0x55 SSTORE\`、ADD はスタックトップ 2 値を pop して和を push。
- **ガス.** 全 opcode が gas コスト持ち、tx に gas limit、消費でランタイム停止、Storage 書き込みが最も高い（永続化）。
- **スタックマシン選択の理由.** 命令セット小 + オペランドエンコード単純 = コンセンサスバグ少 + 検証 / ZK 回路化容易、トレードオフはネイティブレジスタコードに対するランタイム効率。

## 具体例 + ステップで組み立てる

# EVMはスタックマシンだ


EVM（Ethereum Virtual Machine）は **スタックマシン** と呼ばれる仮想機械の一種である。レジスタや関数呼び出し規約を持たず、ほぼすべての計算を **スタック** 上で行う。

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

Revm の **本物の** \`add\` ソース（中級ティアで一行ずつ分解する）は、両方popしてpushすらしない。1つpopし、もう1つへ可変参照経由で書き戻す。Revmのインタープリターは、EVM概念モデルをRustへ写しつつ、サイクル単位の最適化を重ねた設計である。

## なぜEVMはスタックマシンか

- **シンプルさ** — 命令セットが小さく、コンセンサスバグを減らせる
- **再現性** — 再実行と検証がしやすい
- **ZK化との相性** — スタックセマンティクスは制約系にきれいに写る（後のzkEVMで見ます）

## 練習

リポジトリで \`crates/interpreter/src/interpreter/stack.rs\` を開く。次を探す：

1. \`push\` 内の \`STACK_LIMIT\` チェック — オーバーフロー時に何をする？
2. \`popn\` の実装 — const \`N\` でコンパイラがループを完全に省略する仕組み
3. \`dup\` と \`swap\` メソッド — 確保せずインデックスを操作するだけ

これで次のレッスンで自分のミニスタックマシンを書く準備ができました。

## まとめ（3行）

- EVM = スタックマシン、1024 段スタック + 5 記憶領域（Stack / Memory / Calldata / Storage / Code）、Storage のみ永続化。
- 1 バイト Opcode、\`ADD\` は pop 2 + push 1、wrapping arithmetic（mod 2²⁵⁶）、全 opcode が gas コスト持ち、Storage 書き込み最も高い。
- スタックマシン選択 = 命令セット小 + 検証容易 + ZK 回路化容易、トレードオフはレジスタコードに対するランタイム効率、次はミニ EVM スタッククイズ。
`,
                },
                {
                  title: 'クイズ — ミニEVMスタック',
                  slug: 'mini-evm-stack-ja',
                  type: 'QUIZ',
                  sortOrder: 1,
                  duration: 15,
                  xpReward: 30,
                  content: `# クイズ — ミニEVMスタック

## 問い

EVM のスタック操作を **Rust の \`Vec\` で再現** する。\`pop\` + \`push\` + wrapping arithmetic + \`unwrap_unchecked\` の安全パターン — Revm のホットパスでも同じ仕組みが使われている。

## 原理（最小モデル）

- **\`Vec::pop\` の戻り値は \`Option<T>\`.** 空 → \`None\`、\`Some(v)\` → 値取り出し、null チェックを型システムで強制。
- **EVM スタックリミット 1024.** Revm に \`pub const STACK_LIMIT: usize = 1024;\`、超えると \`StackOverflow\`。
- **EVM ADD は \`wrapping_add\`.** mod 2²⁵⁶ wrap、\`saturating_add\` や \`checked_add\` はコンセンサス外、\`+\` は debug/release で挙動分岐。
- **\`unwrap_unchecked()\` + \`unsafe\`.** 直前で長さチェック済 → パニックパスがデッドコード → \`unwrap_unchecked\` でホットパスから消去、手動チェック後 \`unsafe\` で不変条件を符号化する最適化。
- **スタックマシン vs レジスタマシン.** 命令セット小 + オペランドエンコード単純 = ZK 回路化 / 形式検証容易、レジスタコード並みの速度は出ない。

## 具体例 + ステップで組み立てる

# クイズ：ミニEVMスタック


Rust で小さな EVM 風スタックを 3 操作だけで作ります：

- \`push(n)\`: スタックに数値を積む
- \`add()\`: 上から2つ pop し、合計を push
- \`peek()\`: 上の値を読むだけ（pop しない）

前レッスンで読んだ本物の Revm \`Stack\` と同じ形を、シンプル化のため \`U256\` の代わりに \`i64\` で作るだけである。

## 必要な要素

- \`Vec<i64>\` をラップする \`struct\`
- \`impl\` ブロックに \`new()\`、\`push(&mut self, n)\`、\`add(&mut self)\`、\`peek(&self)\`
- \`Vec::pop\` と \`Vec::last\` の戻り値の型 — 空の Vec のとき Rust は何を返してくる？
- underflow 処理：要素が 2 つ未満のとき \`add()\` はどうする？

EVM 仕様に忠実に、加算はオーバーフローで **ラップアラウンド** する（飽和もパニックもしない）。整数のメソッドで正しいものを探す。

## 自分で書いてみる

[Rust Playground](https://play.rust-lang.org/) でスケルトンから始める：

\`\`\`rust
struct MiniEvmStack {
    data: Vec<i64>,
}

impl MiniEvmStack {
    fn new() -> Self {
        Self { data: Vec::new() }
    }

    // TODO: push, add, peek
}

fn main() {
    let mut s = MiniEvmStack::new();
    s.push(100);
    s.push(200);
    s.add().unwrap();
    println!("{:?}", s.peek()); // 出力は Some(300) になるはず
}
\`\`\`

ヒント：

- \`Vec::pop\` は \`Option<T>\` を返す — 空のケースが戻り値の型に符号化されている
- \`Vec::last\` は \`Option<&T>\` を返す — コピーではなく借用（安い）
- \`add\` の戻り値は \`Result<(), &'static str>\` にすると、pop 呼び出しに \`.ok_or("stack underflow")?\` が付けられる
- EVM 互換の加算は、名前に「wrap」を含む整数メソッド

動いたら、前のレッスンの本物の Revm \`Stack\` と頭の中で設計を比較してみてください — 同じ形のはず。

## クイズ

## まとめ（3行）

- \`Vec::pop -> Option<T>\` で空チェック型強制、EVM スタックリミット 1024 = Revm \`STACK_LIMIT\`、ADD は \`wrapping_add\`（mod 2²⁵⁶）。
- \`unwrap_unchecked\` + \`unsafe\` = 事前長さチェック後の最適化、ホットパスからパニックパス消去、手動チェック後 unsafe で不変条件符号化。
- スタックマシンは命令セット小 + ZK / 検証容易 = レジスタコードに対するランタイム速度とのトレードオフ、次は async / トレイト / ジェネリクス。
`,
                  quizQuestions: [
                    {
                      "question": "`Vec::pop` の返り値の型は？",
                      "options": [
                        "`T`",
                        "`Option<T>` — `Some(value)` か空のとき `None`",
                        "`Result<T, Error>`",
                        "`&T`"
                      ],
                      "correctIndex": 1,
                      "explanation": "`pop` は `Option<T>` を返す。「スタックが空かもしれない」という可能性が型システムに組み込まれているので、空のケースを処理しないまま値を取り出すことはできない。"
                    },
                    {
                      "question": "EVM スタックのハードリミット（最大サイズ）は？",
                      "options": [
                        "256",
                        "512",
                        "1024",
                        "無制限（メモリ次第）"
                      ],
                      "correctIndex": 2,
                      "explanation": "EVM は 1024 個までと厳密に決められている。Revm にも `pub const STACK_LIMIT: usize = 1024;` がそのまま定義されている。超えると `StackOverflow`。"
                    },
                    {
                      "question": "本物の EVM の ADD opcode で正しい算術セマンティクスは？",
                      "options": [
                        "`wrapping_add` — オーバーフロー時に mod 2²⁵⁶ でラップ",
                        "`saturating_add` — オーバーフローで最大値に飽和",
                        "`checked_add` — `Option` を返し、オーバーフロー時にパニック",
                        "どれでもよい"
                      ],
                      "correctIndex": 0,
                      "explanation": "EVM はラップアラウンド（modulo 2²⁵⁶）の算術を使う。Solidity の `unchecked { ... }` ブロックがこれを露出している。コンセンサスを守るなら必ず wrapping。saturating や checked は仕様から外れる。"
                    },
                    {
                      "question": "Revm の `popn_top!` マクロが（`unwrap()` ではなく）`unwrap_unchecked()` を `unsafe` で使うのはなぜ？",
                      "options": [
                        "バグ — `unwrap()` でも動く",
                        "直前で長さチェック済みなのでパニックパスはデッドコード；`unwrap_unchecked` でホットパスから消去できる",
                        "スレッドセーフのため",
                        "メモリ節約のため"
                      ],
                      "correctIndex": 1,
                      "explanation": "マクロが事前に長さをチェックしているので、`unwrap_unchecked()` を使えばコンパイラがホットパスのパニックパスコードを省略できる。これは「手動チェックの後 `unsafe` で不変条件を符号化する」最適化テクニック。"
                    },
                    {
                      "question": "レジスタマシンと比較した、EVM のようなスタックマシンの実利は？",
                      "options": [
                        "現代ハードウェアでの素の実行速度",
                        "命令セットが小さくオペランドのエンコードもシンプル — コンセンサスバグが少なく、検証しやすい",
                        "キャッシュ局所性が良い",
                        "消費電力が少ない"
                      ],
                      "correctIndex": 1,
                      "explanation": "スタックマシンは命令セットが非常に小さい（レジスタ引数のエンコードが要らない）。Ethereum にとっては：インタープリターがシンプル、形式検証が容易、ZK 回路化も楽。トレードオフはネイティブのレジスタコードに対するランタイム効率。"
                    }
                  ],
                },
                {
                  title: 'レッスン8 — Rust：async・トレイト・ジェネリクス',
                  slug: 'rust-async-traits-generics-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 15,
                  xpReward: 30,
                  content: `# レッスン8 — Rust：async・トレイト・ジェネリクス

## 問い

Alloy も Reth も Revm も、コードを読むと必ず \`async\` / \`trait\` / \`<T: Bound>\` が出てくる。**この 3 つを最低限読めるようにする** — async は Future を返す関数、trait は Java の interface 相当、ジェネリクスは型パラメータでコード再利用。

## 原理（最小モデル）

- **\`async fn\`.** 戻り値は **Future**（未完了の計算）、\`.await\` で完了まで進める、Tokio 等のランタイム上で実行。
- **\`trait\`.** 共有インターフェース、Java/Kotlin の interface に類似、\`impl Trait for Type\` で実装、コンパイル時解決。
- **\`Box<dyn Trait>\` / \`&dyn Trait\`.** 実行時ディスパッチ、複数の具象型を統一で扱う、vtable 経由で遅い代わりに柔軟。
- **ジェネリクス \`<T>\` + 境界 \`T: Bound\`.** コンパイル時に型パラメータを具象化、モノモーフ化で実行時オーバーヘッドなし。
- **\`impl Trait\` 構文.** 引数 \`&impl Provider\` = 「\`Provider\` 実装の何か」、戻り値 \`impl Future<Output=T>\` = 具体的な型は隠蔽。
- **\`async + trait\` = async-trait crate or Rust 1.75+ 標準.** トレイトメソッドが async を返す場合、過去は \`#[async_trait]\` 属性が必要、現在は標準対応。

## 具体例 + ステップで組み立てる

# Rust：async・トレイト・ジェネリクス


Revmや Reth のコードを読む前に、**3つの言語機能** を押さえる。これがないとAlloy/Reth本体のコードはほぼ読めない。

## 1. async / await — 「待つ」を書ける

ネットワーク通信のような **時間がかかる処理** を効率よく扱うための機能である。

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

\`async fn\` は実行時に **\`Future\`**（あとで値になるもの）を返す。\`.await\` を呼ぶまで実際の実行は進まない。

### \`#[tokio::main]\` の正体

Rust標準には非同期ランタイムが入っていない。**tokio** でランタイムを起動するのが \`#[tokio::main]\` の役割であり、Alloyは tokio 上で動く。

## 2. トレイト（trait） — 「○○できる」という契約

Java/TypeScriptの **interface** に近いが、より強力である。「この型は××できる」を宣言する。

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

\`provider\` は **\`Provider\` トレイトを実装した何らかの型** である。HTTP・WebSocket・IPCで中身が違っても、同じインターフェースで呼べる。これがトレイトの威力である。

### トレイトの最重要ポイント — Reth/Revmで頻出

| パターン | 意味 |
| :--- | :--- |
| \`impl Trait for Type\` | 型にトレイトを実装 |
| \`fn f<T: Trait>(x: T)\` | 「Traitを実装した何か」を受け取る関数 |
| \`Box<dyn Trait>\` | 動的ディスパッチ（実行時にメソッド解決） |
| \`async fn ... -> Result<T, E>\` | async関数（Futureを返すトレイト実装の糖衣構文） |

## 3. ジェネリクス — 「型を後から決める」

\`Vec<i32>\` の \`<i32>\` がジェネリクスである。\`Vec\` は **何でも入れられる** が、コンパイル時に要素型を確定する。

\`\`\`rust
fn first<T: Clone>(v: &Vec<T>) -> T {
    v[0].clone()
}

let v = vec![10, 20, 30];
let f = first(&v);   // T = i32 と推論される
\`\`\`

### Alloyの \`Provider<N: Network = Ethereum>\`

Alloy の Provider は **「どのネットワーク向けか」** を型パラメータで持つ。

\`\`\`rust
let p = ProviderBuilder::new()              // デフォルトは Ethereum
    .connect_http(rpc_url);

let p = ProviderBuilder::new()
    .network::<Optimism>()                  // 別のネットワークに切り替え
    .connect_http(rpc_url);
\`\`\`

これは「コンパイル時に型でチェーンを固定し、ランタイムバグを減らす」というRustらしい設計である。

## 4. ライフタイム（チラ見せ）

\`&str\` のような借用には、実は **ライフタイム** \`<'a>\` 注釈が暗黙にある。

\`\`\`rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() >= y.len() { x } else { y }
}
\`\`\`

「返す参照は、引数の参照と同じ寿命を持つ」というアノテーション。**最初は読めればOK**、書けるのは中級ティアで。

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

すべて、ここまでで紹介した文法の組み合わせである。**読めれば、書ける。**

次のレッスンで、実際のRevmの世界に入っていきましょう。

## まとめ（3行）

- \`async fn\` = Future を返す、\`.await\` で完了待ち、Tokio ランタイム上、Alloy の全 RPC メソッドが async。
- \`trait\` = 共有インターフェース、ジェネリクス \`<T: Bound>\` でコンパイル時解決、\`impl Trait\` は引数 / 戻り値で短縮記法。
- \`Box<dyn Trait>\` は実行時ディスパッチ（vtable）、ジェネリクスは静的ディスパッチ（モノモーフ化）、次は Revm 実行エンジン紹介。
`,
                },
                {
                  title: 'レッスン9 — Revmという「実行エンジン」',
                  slug: 'revm-introduction-ja',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 12,
                  xpReward: 25,
                  content: `# レッスン9 — Revmという「実行エンジン」

## 問い

**Revm = Rust 製の EVM 実行エンジン**。Reth、Foundry、Hyperliquid、Tempo、Berachain — Rust エコシステムで「EVM を実行する」必要がある場所すべてが Revm を使う。**なぜ Revm か、ライブラリとして何を提供するか？**

## 原理（最小モデル）

- **Revm はライブラリ.** チェーンでもノードでもない、**EVM の実行エンジン** のみ、Reth が状態 + コンセンサスを足し、Foundry がテストハーネスを足す。
- **モジュラー設計.** インタープリター / 命令テーブル / Database トレイト / Inspector がそれぞれ独立、差し替え可能 = Hyperliquid がカスタム precompile を足したり、MEV ボットが Inspector で観測したり。
- **Database トレイト.** state を供給する抽象、HashMap（テスト）/ JSON-RPC（メインネットフォーク）/ MDBX（本番）全部同じトレイトで動く。
- **Foundry / Reth / OP-Reth / zkVM / MEV ボット採用.** Rust EVM が必要な場所すべてが Revm を使う、エコシステムの共通基盤。
- **Inside Revm コース（中級）.** add Opcode / 命令テーブル / Database trait を 1 行ずつ歩く深掘り、本レッスンはその入口。

## 具体例 + ステップで組み立てる

# Revmという「実行エンジン」


ここまででAlloy（外側のRPC）と、EVMがスタックマシンであることを学んだ。次の主役は **Revm**、実際にOpcodeを実行する **エンジン** そのものである。

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
| **\`Database\`**, **\`DatabaseRef\`**, **\`DatabaseCommit\`** | ストレージインターフェース（中級で扱う） |
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

「ライブラリ利用しやすい」「Rustで組み込みやすい」「カスタマイズ容易」という3点が、ほぼ独占を生んだ理由である。

## 次のステップ

Revmは「動かすための部品」が分かれば、コードを読み始められる。**次のレッスン** で Foundry（日常的に使う Rust EVM ツールチェイン）を扱い、その後 **中級** ティアで Interpreter フォルダに入る。

## 📺 関連動画

\`\`\`youtube
xRuDWTWuxKA | Dragan Rakita — Revm Endgame (Devcon SEA 2024)
\`\`\`

## まとめ（3行）

- Revm = Rust 製 EVM 実行エンジン（ライブラリ）、Reth / Foundry / Hyperliquid / Tempo / Berachain 等が共通基盤として採用。
- モジュラー設計（インタープリター / 命令テーブル / Database / Inspector 独立）、Database トレイトで HashMap / JSON-RPC / MDBX を同じ trait で扱う。
- 中級 Inside Revm コースで内部を深掘り、次は Foundry ツールチェイン紹介で Solidity 側の手触り。
`,
                },
                {
                  title: 'レッスン10 — Foundry — Rust EVMツールチェイン',
                  slug: 'foundry-toolchain-ja',
                  type: 'CONTENT',
                  sortOrder: 4,
                  duration: 10,
                  xpReward: 20,
                  content: `# レッスン10 — Foundry — Rust EVMツールチェイン

## 問い

**Foundry = Rust 製の Solidity 開発ツールチェイン**。\`forge\`（テスト + ビルド）/ \`cast\`（chain CLI）/ \`anvil\`（ローカルノード）/ \`chisel\`（Solidity REPL）の 4 binary、すべて Revm を内部で使う。**Hardhat / Truffle が JS だったところを、Foundry は Rust ネイティブで 20-30 倍速い**。

## 原理（最小モデル）

- **4 binary.** \`forge\`（テスト + コンパイル）/ \`cast\`（curl + jq for EVM）/ \`anvil\`（local node、\`--fork-url\` で mainnet fork）/ \`chisel\`（Solidity REPL）。
- **\`foundryup\` でインストール.** \`curl -L https://foundry.paradigm.xyz | bash && foundryup\` の 1 行、ツールチェイン全体を更新。
- **\`forge test\` = Solidity 版 \`cargo test\`.** \`.t.sol\` ファイル + \`test*\` 関数を自動発見、in-process REVM で sub-second フィードバック。
- **Cheatcodes = precompile.** \`vm.warp\` / \`vm.deal\` / \`vm.prank\` がアドレス \`0x71097...\` の precompile call、Hardhat の \`evm_snapshot\` JSON-RPC とは同一プロセス + IPC なしで根本差。
- **Foundry を極めるコース（中級）.** 規律の transfer（Rust proptest! → forge fuzz / forge invariant、Capstone で \`InsuranceFund\` 2 言語証明）、本レッスンはその入口。

## 具体例 + ステップで組み立てる

# Foundry — Rust EVMツールチェイン（導線）


Foundry は Reth / Revm / Alloy と同じ Rust EVM 系譜のツールチェインで、主に次の 4 つから成る。

| ツール | 役割 |
| :--- | :--- |
| **forge** | Solidity の build / test |
| **cast** | RPC / calldata / storage の検査 |
| **anvil** | ローカルノード（fork 含む） |
| **chisel** | Solidity REPL |

最小セットアップ:

\`\`\`bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
forge init counter && cd counter
forge test
\`\`\`

ここで理解すべき要点は 1 つだけ: **\`forge test\` は Revm の上で実行される**。  
つまり Foundry は、ノード開発と分断された別世界ではなく、同じ実行基盤の開発者向けインターフェースである。

## この先の学習導線

- 詳細な Foundry 全体像: \`/courses/mastering-foundry-ja/lessons/foundry-orientation-ja\`
- Cheatcode の内部機構: \`/courses/mastering-foundry-ja/lessons/foundry-anvil-cheatcodes-ja\`
- 実務レベルのテスト規律: fuzz / invariant / cheatcode は Foundry 本編へ

## テスト観点（このページで最低限）

Foundry テストの型は 3 つだけ覚える:

1. **unit**（\`forge test\`）
2. **fuzz**（入力空間の探索）
3. **invariant**（呼び出し順序を跨ぐ保存則）

最小サイクル:

\`\`\`bash
forge test
forge test -vvv
forge snapshot
\`\`\`

本番前の最低基準:

- 失敗パスを \`vm.expectRevert\` で確認
- 重要イベントを \`vm.expectEmit\` で確認
- 算術を含む public 入力を fuzz
- 会計保存則を invariant で確認

## ここから先（重複回避のため専用コースへ）

- テスト規律の全体像: \`/courses/mastering-foundry-ja/lessons/foundry-orientation-ja\`
- fuzz 実践: \`/courses/mastering-foundry-ja/lessons/foundry-forge-fuzz-ja\`
- invariant 実践: \`/courses/mastering-foundry-ja/lessons/foundry-forge-invariant-ja\`
- cheatcode / fork 実践: \`/courses/mastering-foundry-ja/lessons/foundry-anvil-cheatcodes-ja\`

## まとめ（3行）

- Foundry = Rust 製 Solidity ツールチェイン、4 binary（forge / cast / anvil / chisel）、内部で Revm 使用、JS 系（Hardhat / Truffle）より 20-30 倍速い。
- \`forge test\` = \`cargo test\` 等価、in-process REVM、cheatcode は precompile（\`vm.warp\` / \`vm.deal\` / \`vm.prank\` 等）。
- 中級 Foundry コースで規律の transfer を深掘り、次は Fundamentals まとめクイズ。
`,
                },
                {
                  title: 'クイズ — Fundamentals まとめ',
                  slug: 'fundamentals-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 5,
                  duration: 12,
                  xpReward: 30,
                  content: `# クイズ — Fundamentals まとめ

## 問い

Fundamentals 11 レッスン完走の最終確認 — Alloy の Signer / Provider、EVM スタックマシンの ADD、Revm のモジュラー設計、永続化される記憶領域。**5 問で身についた基礎を確認**。

## 原理（最小モデル）

- **Alloy 復習.** \`PrivateKeySigner::random()\` で署名器、\`ProviderBuilder::new().connect_http(url)\` でノード接続、\`get_balance().await?\` で残高取得。
- **EVM 復習.** ADD は pop 2 + push 1（wrapping）、5 記憶領域のうち **Storage のみ永続化**（Stack / Memory / Calldata / Code は揮発）。
- **Revm 復習.** モジュラー設計で組み込みやすい + Rust 安全性 + 性能 = Foundry / Reth / OP-Reth / zkVM / MEV ボット採用。
- **次のステップ.** Bridge to Advanced で中級への橋渡し、その後 3 中級コース（Inside Revm / Inside Reth / Inside Alloy）。

## 具体例 + ステップで組み立てる

# Fundamentalsまとめクイズ

Alloy・EVM・Revmの基礎を理解できたか確認する。

## まとめ（3行）

- 5 問でこの 11 レッスンの基礎確認、Alloy の Signer / Provider、EVM の ADD + 5 記憶領域、Revm のモジュラー設計、Storage のみ永続化。
- Fundamentals 完走、Bridge to Advanced で中級への橋渡し、3 中級コース（Revm / Reth / Alloy）へ進む準備完了。
- rethlab の続きへ進む前に、\`cargo new\` / \`forge init\` / \`anvil\` を手元で 1 回ずつ動かすのを推奨。
`,
                  quizQuestions: [
                    {
                      "question": "Alloyの `PrivateKeySigner::random()` で得られるものは？",
                      "options": [
                        "公開ノードへのRPC接続",
                        "ランダムな秘密鍵から派生したシグナー（署名器）",
                        "ガス代の見積もり",
                        "監査済みのスマートコントラクト"
                      ],
                      "correctIndex": 1,
                      "explanation": "PrivateKeySignerは秘密鍵を保持し、署名を行うオブジェクトである。.address()で公開アドレスを取り出せる。"
                    },
                    {
                      "question": "Alloyの `ProviderBuilder::new().connect_http(url)` で作るのは？",
                      "options": [
                        "ローカルWebサーバー",
                        "JSON-RPC経由でノードと通信するProviderインスタンス",
                        "ウォレットアプリ",
                        "新しいブロックチェーン"
                      ],
                      "correctIndex": 1,
                      "explanation": "ProviderはノードへのRPCクライアントであり、get_block_numberやget_balanceなどのメソッドを提供する。"
                    },
                    {
                      "question": "EVM の `ADD` 命令はどのように動きますか？",
                      "options": [
                        "メモリの先頭2バイトを足す",
                        "スタックから2つpopして加算結果をpushする",
                        "ストレージスロット0と1を足してスロット2に書く",
                        "gasLimitを2倍にする"
                      ],
                      "correctIndex": 1,
                      "explanation": "EVMはスタックマシンで、ADDはスタック上の2つの値をpopし、加算結果をpushする。オーバーフローはuint256でラップする。"
                    },
                    {
                      "question": "Revmが Foundry や Reth で使われている主な理由は？",
                      "options": [
                        "無償で公開されているEVMはRevmだけだから",
                        "モジュラー設計で「ライブラリとして」組み込みやすく、Rustによる安全性と性能を持つから",
                        "Geth（Go言語）との互換性のために必要だから",
                        "Solidityコンパイラが内蔵されているから"
                      ],
                      "correctIndex": 1,
                      "explanation": "Revmはライブラリとして設計され、Foundry、Reth、OP-Reth、各種zkVM、MEVボットなどで採用されている。"
                    },
                    {
                      "question": "EVMで「永続化される」のはどの記憶領域ですか？",
                      "options": [
                        "スタック（Stack）",
                        "メモリ（Memory）",
                        "ストレージ（Storage）",
                        "コールデータ（Calldata）"
                      ],
                      "correctIndex": 2,
                      "explanation": "スタックとメモリはトランザクション内のみ揮発し、Storageだけがブロックチェーン状態に永続化される。書き込みコストが高いのもStorageの特徴である。"
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
