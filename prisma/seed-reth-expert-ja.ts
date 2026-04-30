import { PrismaClient } from '@prisma/client';

export async function seedRethExpertJA(prisma: PrismaClient) {
  const tags = ['reth', 'revm', 'alloy', 'rust', 'expert', 'performance', 'mdbx', 'mev', 'zkvm'];

  await prisma.course.create({
    data: {
      slug: 'reth-expert-ja',
      title: 'Reth Expert — 本番エンジニアリング',
      description:
        'ハードコアな実装：プロファイリングとキャッシュ意識のRust、MDBXストレージ内部、Tokioランタイム、手続きマクロ、カスタムPrecompile、Merkle Patricia Trie、本番MEVパイプライン、zkEVM、そして独自Rethフォークの運用。',
      difficulty: 'ADVANCED',
      duration: 240,
      xpReward: 500,
      track: 'reth-expert',
      tags,
      isPublished: true,
      sortOrder: 400,
      locale: 'ja',
      instructorName: 'RethLab',
      modules: {
        create: [
          {
            title: 'パフォーマンス & システム',
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: 'Rethのためのパフォーマンスエンジニアリング',
                  slug: 'performance-engineering-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 18,
                  xpReward: 40,
                  content: `# Rethのためのパフォーマンスエンジニアリング

Rethフォークを本番に出すか、Revmのホットパスをいじるなら、**プロファイリングとベンチマークは必須** です。早すぎる最適化は悪、ですが **「見えていない遅さ」はもっと悪い**。

## 1. 「測ってから直す」

2つのツール、2つの目的：

| ツール | 用途 |
| :--- | :--- |
| **flamegraph** | 「全体としてどこで時間を使っているか？」 |
| **Criterion** | 「特定の変更で関数Xが速くなったか？」 |

### flamegraphを30秒で

\`\`\`bash
cargo install flamegraph
cargo flamegraph --bin reth -- node --chain mainnet
# flamegraph.svg をブラウザで開く
\`\`\`

上の方で横に広いバーがホットパス。**そこに見えていない箇所を最適化しても無駄** です。

### Criterion でマイクロベンチマーク

\`\`\`rust
// Cargo.toml
// [dev-dependencies]
// criterion = "0.5"

// benches/my_bench.rs
use criterion::{criterion_group, criterion_main, Criterion};

fn bench_my_thing(c: &mut Criterion) {
    c.bench_function("hash 1KB", |b| {
        let data = vec![0u8; 1024];
        b.iter(|| keccak256(&data))
    });
}

criterion_group!(benches, bench_my_thing);
criterion_main!(benches);
\`\`\`

\`cargo bench\` は統計付きの比較レポートを出します。**性能改善を主張するならベンチ結果をコミットに添えてください**。

## 2. 行数ではなくキャッシュラインで考える

現代CPUではメモリアクセスは計算より約100倍遅い。アクセスの単位は **64バイトのキャッシュライン**。

### 含意

- ホットなループでは **Struct of Arrays > Array of Structs**
- フォルスシェアリングを避けるため **ホットなフィールドはキャッシュライン分にパディング**
- **アクセスパターンを予測しやすい順** にデータを並べる

\`\`\`rust
// 悪い例：1イテレーションごとに200バイト触る
struct Row {
    id: u64,
    big_blob: [u8; 192],
}

// 改善：ホットとコールドを分離
struct Hot { id: u64, version: u32 }
struct Cold { big_blob: [u8; 192] }
\`\`\`

## 3. アロケータ選定

デフォルトのアロケータ（glibc malloc、jemalloc など）は性能特性が違います。Rethは負荷下のテイルレイテンシを安定させるため **jemalloc** を採用しています。

\`\`\`toml
# Cargo.toml
[dependencies]
tikv-jemallocator = "0.5"
\`\`\`

\`\`\`rust
// main.rs
#[global_allocator]
static GLOBAL: tikv_jemallocator::Jemalloc = tikv_jemallocator::Jemalloc;
\`\`\`

I/O重めのサービスでは、この1行で **テイルレイテンシが10〜30%改善** することが珍しくありません。

## 4. Reth の本物の本番ビルドプロファイル

[\`paradigmxyz/reth\` の Cargo.toml](https://github.com/paradigmxyz/reth/blob/main/Cargo.toml) から：

\`\`\`toml
[profile.release]
opt-level = 3
lto = "thin"
debug = "none"
strip = "symbols"
panic = "unwind"
codegen-units = 16

[profile.maxperf]
inherits = "release"
lto = "fat"
codegen-units = 1

[profile.maxperf-symbols]
inherits = "maxperf"
debug = "full"
strip = "none"
\`\`\`

Paradigm が実際に出荷しているもの。3つのプロファイル、3つのトレードオフ：

### \`release\` — 日常ビルド
\`thin\` LTO + 16 codegen-units でコンパイル速度と実行性能のバランス。開発と多くの本番デプロイにはこれで十分。

### \`maxperf\` — バリデータとベンチマーク
\`fat\` LTO + 1 codegen-unit。コンパイル時間は大幅に増える（全モジュール跨ぎインライン化）が、バイナリは確実に速くなる — **1サイクルでも惜しいバリデータ向け**。

### \`maxperf-symbols\` — 本番のプロファイリング
\`maxperf\` と同じ最適化だが、フルデバッグシンボル付き。本番グレードのコードで関数名が見えるflamegraphが必要なときに使う。**「本番で何かが遅い、原因を突き止めたい」時にビルドするプロファイル**。

### 起動方法

\`\`\`bash
cargo build --profile maxperf --bin reth
# またはネイティブCPU命令で（AVX2など）：
RUSTFLAGS="-C target-cpu=native" cargo build --profile maxperf --bin reth
\`\`\`

前述の \`jemalloc\` と \`asm-keccak\` フィーチャと組み合わせる。

## 5. 3つのルール

1. **何かを変える前に必ず測る。** 「速くなった気がする」はデータではない。
2. **プロファイラーが示すパスだけを最適化する。** それ以外は徒労。
3. **変更後にもう一度測る。** コンパイラがあなたの手最適化を相殺することがある。

これでRethのパフォーマンス重要ファイル（\`crates/storage/db\`、\`crates/blockchain-tree\` など）を「好奇心」ではなく「目的意識」で開けるようになります。`,
                },
                {
                  title: 'MDBX & ストレージ内部',
                  slug: 'mdbx-storage-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 18,
                  xpReward: 40,
                  content: `# MDBX & ストレージ内部

Rethはチェーン状態を **MDBX**（LMDBから派生したメモリマップB+treeのKVストア）に保存します。MDBXを理解できると「Rethを使える」から「Rethを拡張できる」に進化します。

## 1. なぜMDBX（LevelDB / RocksDBではなく）？

| 特徴 | RocksDB | MDBX |
| :--- | :--- | :--- |
| **アーキテクチャ** | LSMツリー | **B+tree（mmap）** |
| **読み取りレイテンシ** | 可変（コンパクション） | **予測可能** |
| **書き込み増幅** | 高い | **約1倍** |
| **クラッシュ安全性** | 手動flush | **MVCCでACID** |
| **読み取り並列性** | ロック | **ロックフリー読み取り** |

Ethereumは **読み取り重く・レイテンシ敏感** なので、コンパクションでストールするLSMは validator や同期にとって致命的。MDBXのほうが噛み合います。

## 2. Rethの本物の \`Database\` トレイト

[\`crates/storage/db-api/src/database.rs\`](https://github.com/paradigmxyz/reth/blob/main/crates/storage/db-api/src/database.rs) より：

\`\`\`rust
pub trait Database: Send + Sync + Debug {
    type TX: DbTx + Send + Sync + Debug + 'static;
    type TXMut: DbTxMut + DbTx + TableImporter + Send + Sync + Debug + 'static;

    #[track_caller]
    fn tx(&self) -> Result<Self::TX, DatabaseError>;

    #[track_caller]
    fn tx_mut(&self) -> Result<Self::TXMut, DatabaseError>;

    fn path(&self) -> PathBuf;

    fn oldest_reader_txnid(&self) -> Option<u64>;

    fn last_txnid(&self) -> Option<u64>;
}
\`\`\`

注意深く読む：

- **2つの関連トランザクション型** — \`TX\`（読み取り専用）と \`TXMut\`（読み書き）。それぞれメソッドが異なる。
- **\`oldest_reader_txnid\`** — 最も古い実行中の読み取りトランザクションを公開。運用者がGCを止めている長時間readerを検知するのに使う。
- **\`#[track_caller]\`** — tx 開設失敗時のパニックは **呼び出し側の行番号** を表示する。本番デバッグの規律。

## 3. \`DbTx\` と \`DbTxMut\` — 実際の操作

[\`crates/storage/db-api/src/transaction.rs\`](https://github.com/paradigmxyz/reth/blob/main/crates/storage/db-api/src/transaction.rs) より：

\`\`\`rust
// DbTx (読み取り専用)
fn get<T: Table>(&self, key: T::Key) -> Result<Option<T::Value>, DatabaseError>;
fn get_by_encoded_key<T: Table>(
    &self,
    key: &<T::Key as Encode>::Encoded,
) -> Result<Option<T::Value>, DatabaseError>;
fn commit(self) -> Result<(), DatabaseError>;
fn abort(self);
fn cursor_read<T: Table>(&self) -> Result<Self::Cursor<T>, DatabaseError>;
fn cursor_dup_read<T: DupSort>(&self) -> Result<Self::DupCursor<T>, DatabaseError>;
fn entries<T: Table>(&self) -> Result<usize, DatabaseError>;
fn disable_long_read_transaction_safety(&mut self);

// DbTxMut (読み書き)
fn put<T: Table>(&self, key: T::Key, value: T::Value) -> Result<(), DatabaseError>;
fn append<T: Table>(&self, key: T::Key, value: T::Value) -> Result<(), DatabaseError>;
fn delete<T: Table>(&self, key: T::Key, value: Option<T::Value>) -> Result<bool, DatabaseError>;
fn clear<T: Table>(&self) -> Result<(), DatabaseError>;
fn cursor_write<T: Table>(&self) -> Result<Self::CursorMut<T>, DatabaseError>;
fn cursor_dup_write<T: DupSort>(&self) -> Result<Self::DupCursorMut<T>, DatabaseError>;
\`\`\`

最重要ポイントは3つ：

### \`<T: Table>\` — テーブルは型、文字列ではない

各テーブルは \`Table\` トレイトを実装した **Rust型**。コンパイラが「キー/値の型はこのテーブルのスキーマに合致する」を強制する。**テーブル名のタイポは即コンパイルエラー**。

### \`append\` vs \`put\`

\`put\` は任意のキーで動く。\`append\` は **キーが現在の最大より大きい場合のみ有効** だが、B+tree探索を省略するので速い。ブロックを順次処理するときは \`append\`、reorgのときは \`put\` にフォールバック。

### Cursors

範囲スキャンには \`get\` の繰り返しではなく **cursor** を使う。一度だけB+tree内に位置決めし、隣接エントリを歩く — 独立した get の数桁倍速い。隣接キーは同じページを共有する可能性が高いので。

### \`disable_long_read_transaction_safety\`

実用的なエルゴノミクス。長い読み取りtxはGCをブロックしDBを膨らませる。Rethは通常、開きすぎた読み取りtxを中止する。**本当に** 長いスナップショットが必要な時だけ設定する（コストを受け入れて）。

## 4. ホットパスで重要な理由

mmap で読むので：

- 「ウォーム」なヘッダー検索は **ポインタ参照** で完了（システムコールなし）
- OSのページキャッシュが無料の読み取りキャッシュになる
- **ローカリティが効く**：関連データを同じページに

Rethのテーブル設計は、Executionステージの読み取り（アカウント → ストレージ → コード）が温まったページを叩くようになっています。

## 5. 練習

リポジトリで [\`crates/storage/db-api/src/tables\`](https://github.com/paradigmxyz/reth/tree/main/crates/storage/db-api/src/tables) を開く：

1. \`Headers\` テーブルを探す — キー（\`BlockNumber\`）と値（\`Header\`）に注目
2. \`DupSort\` テーブルを探す — 1キーに複数値を許すテーブル
3. Executionステージの1回の読み取りを追跡：どのテーブルをどの順で参照する？

これでEthereum状態のすべてのバイトがRethのどこに住んでいるかが分かります。`,
                },
                {
                  title: 'Tokioランタイム内部',
                  slug: 'tokio-internals-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 18,
                  xpReward: 40,
                  content: `# Tokioランタイム内部

\`#[tokio::main]\` と \`.await\` を書いてきました。次は **実際に何が起きているか**。

## 1. ランタイムスタック

Tokio の構成：

\`\`\`
+--------------------+
|   非同期コード     |  ← Future
+--------------------+
|     Executor       |  ← Future を完了までpoll
|  (work-stealing)   |
+--------------------+
|       I/O          |  ← epoll / kqueue / io_uring
+--------------------+
\`\`\`

\`async fn\` を書くと、コンパイラは \`Future\` トレイトを実装する **ステートマシン** を生成します。Executorの仕事は、そのステートマシンに対して \`poll()\` を \`Poll::Ready(value)\` を返すまで呼び続けること。

## 2. work-stealing を60秒で

Tokioのマルチスレッドランタイムは各ワーカーに **ローカルタスクキュー**＋共通グローバルキューを持たせます。アイドルなワーカーは忙しいワーカーのキューから **タスクを盗む**。

\`\`\`
ワーカー A: [task1, task2, task3, task4]   ← 忙しい
ワーカー B: []                              ← アイドル、Aから盗む
ワーカー A: [task1, task2]
ワーカー B: [task3, task4]
\`\`\`

これでグローバルロックの競合を避けつつ負荷分散できます。

## 3. spawn vs blocking

\`\`\`rust
// 並列実行：ランタイムにspawn
let h1 = tokio::spawn(async { fetch().await });
let h2 = tokio::spawn(async { fetch().await });
let (r1, r2) = (h1.await?, h2.await?);

// CPU重い処理：非同期ワーカーに乗せない
tokio::task::spawn_blocking(|| {
    expensive_sync_calc()  // 別のスレッドプールで動く
}).await?
\`\`\`

**ルール**：CPU重い処理を非同期コンテキストで \`spawn_blocking\` なしに呼ばないこと。ランタイムが飢えてノード全体が止まる。

## 4. チャネル — 適切な選択

| チャネル | 用途 |
| :--- | :--- |
| \`tokio::sync::mpsc\` | 多生産者・1消費者 |
| \`tokio::sync::broadcast\` | 1生産者・多消費者（例：チェーンイベント） |
| \`tokio::sync::watch\` | 最新値ブロードキャスト（例：最新ブロック） |
| \`tokio::sync::oneshot\` | 単一値、リクエスト/レスポンス |

ExEx はチェーン通知に **broadcast** を使います。すべてのExExがすべてのイベントを受け取るため。

## 5. カスタム Executor / Future の手動 poll

いずれ **Future を手で poll したい場面** が出てきます：

\`\`\`rust
use std::pin::Pin;
use std::task::{Context, Poll, Waker};
use std::future::Future;

let mut fut = Box::pin(my_async_fn());
let waker = Waker::noop();
let mut cx = Context::from_waker(&waker);

match fut.as_mut().poll(&mut cx) {
    Poll::Ready(v) => /* 完了 */,
    Poll::Pending => /* まだ — Wakerが起こすときに再poll */,
}
\`\`\`

これがReth内部の独自スケジューラ（例：MEVシミュをバッチする）を書く土台になります。

## 6. Rethが本番でTokioをどう使うか

RethはTokioを直接公開せず、**\`TaskExecutor\`** で包んで **パニック監視** を追加しています。[\`crates/tasks/src/runtime.rs\`](https://github.com/paradigmxyz/reth/blob/main/crates/tasks/src) より：

\`\`\`rust
pub fn spawn_task<F>(&self, fut: F) -> JoinHandle<()>
where
    F: Future<Output = ()> + Send + 'static,

pub fn spawn_critical_task<F>(&self, name: &'static str, fut: F) -> JoinHandle<()>
where
    F: Future<Output = ()> + Send + 'static,
\`\`\`

2種類：

- **\`spawn_task\`** — 投げっぱなし。パニックすれば静かに消える（Tokioデフォルト）。
- **\`spawn_critical_task\`** — 名前付きで登録、パニックすると \`TaskManager\` のチャネルが発火し、**ノード全体が停止し、タスク名がログに残る**。

これが本番の規律：静かに死んだバックグラウンドタスクのせいで、劣化状態でノードが動き続けるのは避けたい。**クリティカルなタスクは大声で失敗する**。

\`TaskExecutor = Runtime\` のエイリアスは、生Tokio型を引き回さずにステージコードに渡せる — セーフティネット付きのきれいな抽象化。

## 7. 読み物リスト

- \`tokio/tokio/src/runtime/scheduler/multi_thread_alt\` — 現代のマルチスレッドスケジューラ
- \`reth/crates/tasks/src/runtime.rs\` — RethのTokio監視ラッパ

このレッスンを終えると、「Tokio = 魔法」が「Tokio = work-stealing付きステートマシンドライバ。Rethはそれをパニック監視で包んでいる」になります。`,
                },
                {
                  title: '手続きマクロ — `sol!`と`address!`の中身',
                  slug: 'procedural-macros-ja',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 15,
                  xpReward: 35,
                  content: `# 手続きマクロ — \`sol!\`と\`address!\`の中身

\`address!("0xabc...")\` は関数呼び出しに見えますが **コンパイル時に走ります**。\`sol! { contract IERC20 { ... } }\` も同じ。これらは **手続きマクロ（procedural macro）** — TokenStream を受けてTokenStreamを返す、コンパイラ内で動くコードです。

## 1. 3種類

| 種類 | 見た目 | 例 |
| :--- | :--- | :--- |
| **関数風** | \`my_macro!(...)\` | \`address!\`、\`sol!\` |
| **derive** | \`#[derive(MyTrait)]\` | \`#[derive(Serialize)]\` |
| **属性** | \`#[my_attr]\` | \`#[tokio::main]\` |

すべて \`crate-type = ["proc-macro"]\` のクレートで、\`proc_macro::TokenStream\` を返す関数として実装します。

## 2. ツールチェイン

ほぼ2クレートで完結：

| クレート | 役割 |
| :--- | :--- |
| \`syn\` | TokenStreamをRust ASTにパース |
| \`quote\` | テンプレートからTokenStreamを生成 |

## 3. 本物の \`address!\` マクロ

驚くかもしれません：**\`address!\` は手続きマクロではありません**。普通の \`macro_rules!\` 宣言的マクロです。これが [\`crates/primitives/src/bits/macros.rs\`](https://github.com/alloy-rs/core/blob/main/crates/primitives/src/bits/macros.rs) の本物のソース：

\`\`\`rust
macro_rules! fixed_bytes_macros {
    ($d:tt $($(#[$attr:meta])* macro $name:ident($ty:ident $($rest:tt)*);)*) => {$(
        $(#[$attr])*
        #[macro_export]
        macro_rules! $name {
            () => {
                $crate::$ty::ZERO
            };

            ($d ($d t:tt)+) => {
                $crate::$ty::new($crate::hex!($d ($d t)+))
            };
        }
    )*};
}

fixed_bytes_macros! { $
    macro address(Address);
    macro b64(B64);
    macro b128(B128);
    macro b256(B256);
    macro b512(B512);
    macro bloom(Bloom);
    macro fixed_bytes(FixedBytes<0>);
}
\`\`\`

2回読んでください。情報量が多い。

### マクロを定義するマクロ

\`fixed_bytes_macros!\` は **外側のマクロが内側のマクロを生成するマクロ**。最後の1行の呼び出しで7つのマクロを一度に作成：\`address!\`, \`b64!\`, \`b128!\`, \`b256!\`, \`b512!\`, \`bloom!\`, \`fixed_bytes!\`。**メタパターンを1回書いて、型付きの便利マクロが7つもらえる**。

### \`$d:tt\` のトリック

\`$d\` はトークンツリー（実際は \`$\`）にマッチします。これは有名な問題を解いている：マクロ内でマクロを生成するとき、内側マクロの変数のために単に \`$\` を書くと、Rustのマクロパーサーが外側マクロのメタ変数として食べてしまう。だから \`$d\` を \`$\` にバインドし、\`$d ($d t:tt)+\` が生成コードでは \`$ ( $ t:tt )+\` になる。**マクロハイジーン回避の教科書的テクニック**。

### コンパイル時バリデーションは別のマクロが担当

実際のhexパースは \`$crate::hex!(...)\` に委譲され、こちら **は** 手続きマクロです。\`hex!\` は：
1. 文字列リテラルをコンパイル時にパース
2. 各文字が hex digit かバリデーション
3. 長さが対象型と一致するか確認（\`Address\` なら20バイト、\`B256\` なら32バイト）
4. \`[u8; N]\` 配列リテラルを生成

何か失敗すれば **コンパイルエラー**。実行時パニックではない。\`Address::new(...)\` がそこで型付きラッパを構築する。

### 空入力ケース

\`\`\`rust
() => { $crate::$ty::ZERO };
\`\`\`

\`address!()\`（引数なし）は \`Address::ZERO\` を返す — const。だから書ける：

\`\`\`rust
const BURN: Address = address!();
\`\`\`

constとしてバーンアドレスが評価できる。実行時パーサーで **これ** をやるのは無理。

## 4. \`sol!\` — 本物の手続きマクロ

\`address!\` は宣言的、\`sol!\` こそが本物の手続きマクロです。場所は [\`alloy-rs/core/crates/sol-macro\`](https://github.com/alloy-rs/core/tree/main/crates/sol-macro)。中身は：

1. Solidity風の構文をパース（\`syn::ItemImpl\` ではなく独自パーサー — Solidityは Rust ではない）
2. 関数ごとに struct を生成、**セレクタ**（\`keccak256(signature)\` の先頭4バイト）を計算、ABIエンコード/デコードを impl
3. イベントごとに **topic0 ハッシュ** を計算、ログデコードを impl
4. コントラクトごとに \`Provider\` を受けてメソッドを自然に呼べるラッパ struct を吐く

\`\`\`rust
sol! {
    interface IERC20 {
        function balanceOf(address owner) external view returns (uint256);
        event Transfer(address indexed from, address indexed to, uint256 value);
    }
}

let balance = IERC20::new(token, &provider).balanceOf(owner).call().await?;
\`\`\`

— この \`.balanceOf(owner)\` は静的型付き、\`uint256\` は本物の \`U256\`、セレクタはコンパイル時計算、ABIエンコードはモノモーフ化済み。**リフレクションなし、実行時パースなし、文字列型エラーなし**。

## 5. proc macro を書くべき場面

- **何度も同じ定型コード** がコンパクトな1行マクロに圧縮できるとき
- **コンパイル時バリデーション** ができるとき（例：address のバース）
- **DSL 級の使い心地** に値する規模感のとき

「1回しか書かない5行を浮かせる」ためには書かない。

## 6. デバッグTip

\`cargo expand\` でマクロが生成しているコードが見えます。**詰まったら必ず展開を見る**。

\`\`\`bash
cargo install cargo-expand
cargo expand --bin my_app
\`\`\`

コード生成のミスを目で確認できます。`,
                },
              ],
            },
          },
          {
            title: '本番エンジニアリング',
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: 'カスタムPrecompile',
                  slug: 'custom-precompiles-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 15,
                  xpReward: 35,
                  content: `# カスタムPrecompile

カスタム **Opcode** は新しいEVM命令を追加します。カスタム **Precompile** は通常のコントラクトのように呼び出せるネイティブRust関数を追加します。Precompile のほうが **侵襲が小さく** 、ほとんどのツーリングと共存できます。

## 1. Opcode vs Precompile

| | Opcode | Precompile |
| :--- | :--- | :--- |
| **呼び出し方** | バイトコード命令 | 特定アドレスへの \`CALL\` |
| **追加方法** | インタープリター改造 | precompile レジストリへの登録 |
| **ツールへの影響** | Solidity・ABI 破壊 | ほぼ透過 |
| **用途** | 内側の高頻度ループ | ペアリング・ハッシュなど重い演算 |

実Ethereumは既に 0x01〜0x0a に precompile を持ちます（ecrecover, sha256, ripemd160, modexp, BN254 ops, BLAKE2F, point eval）。

## 2. 本物のprecompile — identity precompile (0x04)

これは [\`crates/precompile/src/identity.rs\`](https://github.com/bluealloy/revm/blob/main/crates/precompile/src/identity.rs) の \`identity_run\` 全体：

\`\`\`rust
use super::calc_linear_cost;
use crate::{
    eth_precompile_fn, EthPrecompileOutput, EthPrecompileResult, Precompile, PrecompileHalt,
    PrecompileId,
};
use primitives::Bytes;

eth_precompile_fn!(identity_precompile, identity_run);

/// Address of the identity precompile.
pub const FUN: Precompile = Precompile::new(
    PrecompileId::Identity,
    crate::u64_to_address(4),
    identity_precompile,
);

/// 操作の基本コスト
pub const IDENTITY_BASE: u64 = 15;
/// ワードあたりのコスト
pub const IDENTITY_PER_WORD: u64 = 3;

/// 入力バイトをコピーして出力として返す。
pub fn identity_run(input: &[u8], gas_limit: u64) -> EthPrecompileResult {
    let gas_used = calc_linear_cost(input.len(), IDENTITY_BASE, IDENTITY_PER_WORD);
    if gas_used > gas_limit {
        return Err(PrecompileHalt::OutOfGas);
    }
    Ok(EthPrecompileOutput::new(
        gas_used,
        Bytes::copy_from_slice(input),
    ))
}
\`\`\`

これがEthereumメインネットで動いている本番precompile。行ごとに読み解く：

- **アドレス** \`u64_to_address(4)\` → \`0x0000…0004\`。アドレスは \`Precompile::new\` の一部 — どこに置くかを選ぶ自由はなく、コンパイル時に固定。
- **ガス計算式** \`base + per_word * ceil(len / 32)\`。入力長に対して線形。\`IDENTITY_BASE = 15\`、\`IDENTITY_PER_WORD = 3\` — Yellow Paper の値そのまま。
- **Halt vs revert** — \`PrecompileHalt::OutOfGas\` はフレーム全体停止（リファンドなし）。通常のrevertとは別物。
- **\`EthPrecompileOutput\`** は \`(gas_used, output_bytes)\` を運ぶ。

## 3. カスタムprecompileを登録する

[\`crates/precompile/src/lib.rs\`](https://github.com/bluealloy/revm/blob/main/crates/precompile/src/lib.rs) の \`Precompiles\` レジストリにはまさにこのための \`extend\` メソッドがあります：

\`\`\`rust
pub fn extend(&mut self, other: impl IntoIterator<Item = Precompile>) {
    let iter = other.into_iter();
    let (lower, _) = iter.size_hint();
    self.addresses.reserve(lower);
    self.inner.reserve(lower);
    for item in iter {
        let address = *item.address();
        if let Some(short_idx) = short_address(&address) {
            self.optimized_access[short_idx] = Some(item.clone());
        }
        self.addresses.insert(address);
        self.inner.insert(address, item);
    }
}
\`\`\`

なので独自precompileの登録はこれだけ：

\`\`\`rust
let my_pre = Precompile::new(
    PrecompileId::Custom("my_thing"),
    address!("00000000000000000000000000000000000000ff"),
    my_function,
);
precompiles.extend([my_pre]);
\`\`\`

\`my_function\` は \`identity_run\` と同じ形：\`fn(&[u8], u64) -> EthPrecompileResult\`。precompileセットがロードされるカスタムEvmビルダーに通します。

### \`optimized_access\` 配列

\`optimized_access[short_idx]\` への書き込みに注目。短いアドレスに対しては Revm が hashmap ではなくフラット配列を使い、**ディスパッチが単一インデックス参照に縮約** されます。だから標準precompile（0x01〜0x0a）はディスパッチが事実上無料。

## 4. 実例：Foundry の cheatcodes はカスタム precompile

Rust EVM スタックで最も広くデプロイされているカスタム precompile は Foundry にあります。Solidity テストで書いた \`vm.deal\`、\`vm.warp\`、\`vm.prank\` のすべては **カスタム precompile への \`CALL\`**。

[\`forge-std/src/Base.sol\`](https://github.com/foundry-rs/forge-std/blob/master/src/Base.sol) より：

\`\`\`solidity
address internal constant VM_ADDRESS = 0x7109709ECfa91a80626fF3989D68f67F5b1DD12D;
\`\`\`

このアドレスは：

\`\`\`solidity
address(uint160(uint256(keccak256("hevm cheat code"))))
\`\`\`

として計算されます。Foundry はこのアドレスに **カスタム precompile を登録した Revm** を構築。precompile は calldata を cheatcode 呼び出しとしてデコード（例：\`deal(address,uint256)\` のセレクタ）し、Foundry の Rust コードへディスパッチします。「このアカウントに 10 ETH 与える」のような状態変更は、メモリ内の Revm DB を直接書き換えてから実行を続行することで実現。

これは **セクション3の登録パターンの本番ケーススタディそのもの**：

- Foundry は標準 precompile セットを fork
- \`0x7109...\` に追加エントリを登録、cheatcode ディスパッチャを指す
- ディスパッチャは calldata を読み、セレクタをマッチ、Rust で EVM 状態を変更

本番のカスタム precompile 設計を細部まで見たいなら、[\`foundry-rs/foundry/crates/cheatcodes\`](https://github.com/foundry-rs/foundry/tree/master/crates/cheatcodes) を読んでください — 我々の例と同じパターンを産業規模で（cheatcode 数百個、スナップショット、revert サポート付き）実装したもの。

## 5. precompile を選ぶ場面

- 計算が **純粋なEVMバイトコードでは高すぎる**（BLSペアリング、FRI検証、多桁演算）
- 同じ操作が **多くのコントラクトから必要** とされる
- **正しさを証明可能なRust実装** が書ける

数命令節約のために precompile を足してはいけません。設計コストとコンセンサスリスクが見合うのは「本当に重い処理」だけ。

## 6. 価格設定

最重要ルール：**ガスコストはCPUコストに追従させる**（理想は最悪ケースの何倍か）。安すぎると攻撃者が1つの変なtxでチェーンをDoSできる。実Ethereumも何度も後手で価格改定しています（EIP-2929 のcold/warm reset）。

ワークフロー：

1. 現実的に最も遅い入力でベンチマーク
2. CPU時間に「悪用係数」を掛ける（2〜5倍が一般的）
3. チェーンの ガス/CPU 比率に変換
4. 敵対的入力で再ベンチ

これで通常コードからは安く、悪用には法外に高い precompile になります。`,
                },
                {
                  title: 'Merkle Patricia Trie & 状態証明',
                  slug: 'mpt-state-proofs-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 18,
                  xpReward: 40,
                  content: `# Merkle Patricia Trie & 状態証明

Ethereum の状態は **Merkle Patricia Trie (MPT)** に住んでいます。これを理解すると、stateRoot・ライトクライアント・witness の理屈が全部つながり、自分で実装できるようになります。

## 1. MPT とは何か

3つの考えを合わせたもの：

- **Trie**：ルートからリーフへの経路がキーを綴る木
- **Patricia**：単一子ノードを潰して trie をコンパクトに
- **Merkle**：各ノードが子のハッシュを保持 → ルートが全データをコミット

結果：**256ビットの \`stateRoot\`** が世界状態を一意に識別する。1バイトでも変えればルートが変わる。

## 2. ノードの種類

\`\`\`
+----------+    Branch (16子 + 値)
|  Branch  |    キーが分岐する場所で使う
+----------+

+----------+    Extension (共有プレフィックス)
| Extension|    "次のNニブルは下にある全員で共通"
+----------+

+----------+    Leaf (最終値)
|   Leaf   |
+----------+
\`\`\`

キーは **ニブル**（4ビット）単位なので、32バイトのキーは64ニブル。各ノードは自分のkeccakハッシュを知っています。

## 3. 包含証明を6ステップで

「アカウントXの残高がY」を証明するには：

1. ルートからXのキーへ向かって辿り、経路のノードを集める
2. 各ノードは子を **ハッシュ** で参照（ポインタではない）
3. 検証側に必要なのは経路ノードだけ。trie全体は不要
4. リーフを再ハッシュし、上に向かって親を再ハッシュ
5. 結果のルートを **信頼済み \`stateRoot\`** と比較
6. 一致 → Xの残高が本当にYだと確認

これだけ。**ライトクライアントは「信頼ルートを持つ検証器」** にすぎません。

## 4. Witness（証人データ）

**Witness** は、ブロックを再実行するために必要な trie ノード集合です。フルステートを持たずに再実行できる。zkEVM プローバが消費し、ステートレスクライアントが使い、一部のMEVサーチャーがフォークシミュレーションに使います。

典型的なブロックの witness は数百KB〜数MB。

## 5. Reth の本物の証明型

[\`crates/trie/common/src/proofs.rs\`](https://github.com/paradigmxyz/reth/blob/main/crates/trie/common/src/proofs.rs) より：

\`\`\`rust
#[derive(Clone, PartialEq, Eq, Debug)]
pub struct AccountProof {
    pub address: Address,
    pub info: Option<Account>,
    pub proof: Vec<Bytes>,
    pub storage_root: B256,
    pub storage_proofs: Vec<StorageProof>,
}

impl AccountProof {
    pub const fn new(address: Address) -> Self;
    pub fn verify(&self, root: B256) -> Result<(), ProofVerificationError>;
}

#[derive(Clone, PartialEq, Eq, Default, Debug)]
pub struct StorageProof {
    pub key: B256,
    pub nibbles: Nibbles,
    pub value: U256,
    pub proof: Vec<Bytes>,
}

impl StorageProof {
    pub fn verify(&self, root: B256) -> Result<(), ProofVerificationError>;
}
\`\`\`

これがJSON-RPCの \`eth_getProof\` で流れるデータそのもの。フィールドごとに読み解く：

### \`AccountProof.proof: Vec<Bytes>\`
ルートからアカウントリーフまでのtrieノードリスト — RLPエンコード。検証側はこれらを順に歩き、各ノードをハッシュし、親の子参照と比較し、最後にルートを確認する。

### \`AccountProof.storage_root: B256\`
**コントラクトの独立ストレージtrieのルート**。予言通り：2層MPT。アカウントリーフがこのハッシュを持ち、ストレージ証明はこれに対して検証する（グローバル \`stateRoot\` ではない）。

### \`AccountProof.info: Option<Account>\`
アカウントが存在しなければ \`None\`（「非包含」証明）、存在すれば \`Some\`。**両方とも有効な証明** — 「このアドレスにアカウントがない」を証明することは残高証明と同じくらい重要。

### \`StorageProof.nibbles: Nibbles\`
ストレージキーのニブル表現を事前計算してキャッシュ。ニブル変換はホットパスにあるため。

### \`AccountProof::verify(&self, root: B256)\`
純粋ロジック — 信頼済みstate rootを与えれば、証明を検証する。**これがライトクライアント検査の全て**。数百バイトのバイトコード、ミリ秒で走り、状態に対する暗号学的保証を与える。

## 6. 落とし穴：ストレージtrie

各コントラクトは **自分専用** のMPTをストレージスロット用に持ちます。だから世界状態は：

\`\`\`
stateRoot
└── アカウントリーフ（AccountProof.proof が返す）
    └── storage_root（AccountProof.info.storage_root にも保存）
        └── スロットリーフ群（StorageProof.proof で証明）
\`\`\`

**2層MPT** をまさに \`AccountProof\` がエンコードしています。これを忘れるのが「state proof 検証器が動かない」最大の理由。

## 7. Rethのどこに住んでいるか

\`\`\`
crates/trie/
├── common/src/proofs.rs  ← AccountProof, StorageProof（上記）
├── trie/                  ← trieデータ構造そのもの
├── parallel/              ← 並列trie計算
├── sparse/                ← witness/proof生成用のsparse trie
└── db/                    ← MDBXバックエンドのtrie
\`\`\`

この順に読む：\`common\`（型）→ \`trie\`（データ構造）→ \`db\`（本番グルー）。

## 8. 練習

1. リポジトリで \`crates/trie/common/src/proofs.rs\` を開く
2. \`AccountProof\` の \`verify\` メソッドを読む
3. \`storage_proofs\` 内の各 \`StorageProof::verify\` 呼び出しに注目 — 親が \`storage_root\`（\`root\` ではない）になっている
4. [EIP-1186](https://eips.ethereum.org/EIPS/eip-1186) を読む — \`AccountProof\` はこの仕様のRust ミラー

これで \`eth_getProof\` が「魔法」ではなく「読めて、書けて、デバッグできる構造」になります。`,
                },
                {
                  title: '本番MEV — Mempool・ExEx・シミュレーション',
                  slug: 'mev-in-practice-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 20,
                  xpReward: 45,
                  content: `# 本番MEV — Mempool・ExEx・シミュレーション

MEV（Maximal Extractable Value）はシステムエンジニアリング × ゲーム理論。本気のサーチャー／ビルダーパイプラインが2026年現在どう構築されているか整理します。

## 1. パイプライン

\`\`\`
Mempool ──► デコード ──► シミュレータ ──► 戦略 ──► バンドル組成 ──► 送信
   │           │             │            │           │              │
 ExEx        Alloy         Revm         Rust       Alloy        Flashbots /
 + p2p       sol!          + DB         ロジック    encode        直接ビルダ
\`\`\`

各箱がRustモジュール。本番のレイテンシ予算は **次ブロックまでに< 100ms**。

## 2. Mempool の取り込み

2経路：

- **Alloy WebSocket購読**（\`pending_transactions\` フィルタ）— 簡単・遅い
- **devp2p に直接参加** — 自分でネットに参加し、生のtxアナウンスを受信、RLPを自分でパース — 最速・最難

本気のサーチャーには devp2p は必須。Reth のネットワーククレートが入り口。

## 3. デコード — 本物のExExパターン

[\`paradigmxyz/reth-exex-examples/op-bridge\`](https://github.com/paradigmxyz/reth-exex-examples/tree/main/op-bridge) は本番形のインデクサで、各ブロックからコントラクトイベントをデコードします。コアのデコードパターンを一字一句そのまま：

\`\`\`rust
use alloy_sol_types::{sol, SolEventInterface};

sol!(L1StandardBridge, "l1_standard_bridge_abi.json");
use crate::L1StandardBridge::{
    ETHBridgeFinalized, ETHBridgeInitiated, L1StandardBridgeEvents,
};

fn decode_chain_into_events(
    chain: &Chain,
) -> impl Iterator<Item = (...)> {
    chain
        .blocks_and_receipts()
        .flat_map(|(block, receipts)| {
            block.body().transactions_iter()
                .zip(receipts.iter())
                .map(move |(tx, receipt)| (block, tx, receipt))
        })
        .flat_map(|(block, tx, receipt)| {
            receipt.logs.iter()
                .filter(|log| OP_BRIDGES.contains(&log.address))
                .map(move |log| (block, tx, log))
        })
        .filter_map(|(block, tx, log)| {
            L1StandardBridgeEvents::decode_raw_log(log.topics(), &log.data.data)
                .ok()
                .map(|event| (block, tx, log, event))
        })
}
\`\`\`

これが **本番形のMEVデコード**。3つのflat_map：

1. **\`chain.blocks_and_receipts()\`** — コミットされたチェーンの各ブロックとレシートのペア
2. **各(block, receipt)について** — トランザクションをレシートとzipしてflat化
3. **各(block, tx, receipt)について** — ログを既知のブリッジアドレスでフィルタ、デコード

最後の \`filter_map\` で **\`sol!\`** の真価が出ます。\`L1StandardBridgeEvents::decode_raw_log\` は自動生成 — イベント列挙の各バリアントを試し、topic0が一致するものを \`Ok(Event)\` で返す。**手書きABIパースなし。型安全に出てくる**。

そして型付きイベントでパターンマッチ：

\`\`\`rust
match event {
    L1StandardBridgeEvents::ETHBridgeInitiated(ETHBridgeInitiated {
        amount, from, to, ..
    }) => {
        // デポジットを自分のDBに記録
    }
    L1StandardBridgeEvents::ETHBridgeFinalized(ETHBridgeFinalized {
        amount, from, to, ..
    }) => {
        // 引き出しを自分のDBに記録
    }
    _ => continue,
}
\`\`\`

MEVサーチャーなら、「ブリッジアドレス」を「DEXルーターアドレス」に、「デポジット/引き出し処理」を「swap検出 + サンドイッチ機会スコアリング」に置き換えれば良い。**同じ形、フィルタセットが違うだけ**。

## 4. シミュレーション

事前にRevmでフォーク状態に対してシミュレーション。本物の形：

\`\`\`rust
use revm::Evm;
use revm::primitives::{TxKind, U256};

let mut evm = Evm::builder()
    .with_db(forked_db)            // ブロックNでのメインネット状態
    .with_external_context(())
    .build();

evm.cfg_mut().chain_id = 1;
evm.tx_mut().caller = bot_address;
evm.tx_mut().transact_to = TxKind::Call(target);
evm.tx_mut().data = tx_data;

let result = evm.transact()?;
let profit = compute_profit(&result.state);
\`\`\`

バンドルシミュレーション（自tx + 被害tx + 自tx）でガス支払い前に実利益が分かる。ホットパス。徹底プロファイル。\`forked_db\` は典型的に \`AlloyDB\`（Database traitレッスンで見たもの）+ LRUキャッシュ層で、同じ読み取りをネットワークに繰り返さない。

## 5. ExEx をプライベートmempoolとして使う

ExEx はゼロレイテンシで **すべてのブロック** を受け取ります。これは：

- カスタムDEXトレードインデクサ
- プールリザーブの「ウォームキャッシュ」（シミュレータが再取得しなくて済む）
- reorg 対応の状態差分フィード

の置き場として最適。サーチャーはExExフィードを消費し、節約した時間をシミュレーションに使えます。

## 6. バンドル送信

| 経路 | レイテンシ | プライバシー |
| :--- | :--- | :--- |
| **Flashbots / MEV-share** | 中 | 強（mempoolに公開しない） |
| **特定ビルダーへ直接** | 低 | ビルダー次第 |

バンドルはJSON-RPC、ワイヤフォーマットは小さい。サーチャー間の競争は **数ミリ秒** で決まります。

## 7. 焼かれるポイント

1. **Reorg。** バンドルが当たった後に消える。ExEx の \`ChainReorged\` 通知後に必ず現実と整合させる。
2. **シミュレータの古い状態。** ターゲットスロットの **正確な親ブロック** を使う。「latest」ではない。
3. **ガスgriefing。** 攻撃者が無関係な高ガスtxを並べて押し出す。優先手数料カーブをリアルタイムで監視。
4. **Toxic flow。** 「機会」がサンドイッチの罠であることがある。分類器を回す。すべての利益が本物ではない。

このレッスン後、[reth-exex-examples](https://github.com/paradigmxyz/reth-exex-examples) のコードが「おもちゃ」ではなく「本番アーキテクチャの骨格」として読めるはずです。`,
                },
                {
                  title: 'zkEVM with Revm',
                  slug: 'zkevm-revm-ja',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 15,
                  xpReward: 35,
                  content: `# zkEVM with Revm

zkEVM は「このブロックは正しく実行された」を再実行なしで証明します。Revm はプローバが消費する **EVM正準実装**。仕組みを整理します。

## 1. プルービングスタック

\`\`\`
+------------------------+
|  Revm 実行             |  ← 通常のEVM、ただし
|  zkVM の中で動く       |     汎用プローバ（Risc0、SP1など）の中
+------------------------+
|  zkVM (RISC-V)         |  ← Rust命令ごとに制約を吐く
+------------------------+
|  Proving system        |  ← STARK / SNARK
|  (Plonky3, Halo2, ...) |
+------------------------+
\`\`\`

普通のRustプログラム（中身でRevmを呼ぶ）を **RISC-V** にコンパイルし、zkVMの中で実行 → zkVMが正しい実行の証明を出す。

## 2. 本物のguest — Steel + Risc0

これは [\`boundless-xyz/steel/examples/erc20-counter\`](https://github.com/boundless-xyz/steel/tree/main/examples/erc20-counter) の \`guest/src/main.rs\` 全体：

\`\`\`rust
use alloy_primitives::U256;
use erc20_counter_core::{IERC20, Input, Journal};
use risc0_steel::{Contract, ethereum::EthChainSpec};
use risc0_zkvm::guest::env;

fn main() {
    // guest 環境から入力を読む
    let input: Input = env::read();

    // chain ID から chain spec を導出
    let chain_spec = EthChainSpec::from_chain_id(input.chain_id).unwrap();

    // 入力を EvmEnv に変換。入力ヘッダーの state root と一致するか検証
    let env = input.evm_input.into_env(chain_spec);

    // view call 実行；sol! マクロが生成した型で結果が返る
    let call = IERC20::balanceOfCall {
        account: input.account,
    };
    let returns = Contract::new(input.erc20_contract, &env)
        .call_builder(&call)
        .call();

    // 指定アカウントが少なくとも1トークン保有している
    assert!(returns >= U256::from(1));

    // view_call_env 導出に使ったブロックハッシュと番号を journal にコミット
    let journal = Journal {
        commitment: env.into_commitment(),
        contract: input.erc20_contract,
    };
    env::commit_slice(&journal.abi_encode());
}
\`\`\`

これがzkVM guestの **全コード**。約25行。注意深く読みます。

### \`env::read()\`
guestはhostから直列化されたストリームで入力を読む。\`Input\` 構造体：chain ID、対象コントラクトアドレス、EVM入力（コールが触る state proof群）、クエリ対象のアカウント。

### \`input.evm_input.into_env(chain_spec)\`
ここが魔法の核心。\`evm_input\` は **ブロックヘッダー** と **state witness**（コールが触る各ストレージスロット + そのMPT証明）を保持。\`.into_env(...)\` が **witness をヘッダーの stateRoot に対して検証** — 1バイトでも間違えば失敗。これが「proverが状態について嘘をつけない」保証。

### \`IERC20::balanceOfCall\`（sol!）
MEVレッスンで見た同じ \`sol!\` マクロが型付きコールを生成。**ノードとRPC通信する同じコードがzkVM内でも動く**。これが統一性 — ABI、エンコード、型システムがオフチェーンとin-prover世界で共有されている。

### \`Contract::new(...).call_builder(&call).call()\`
**Revmの中で** view call を実行、検証済みstateに対して。型付き \`U256\` を返す。Revm はwitness経由で読むので、witness になかったスロットを要求すると証明が失敗する。

### \`env::commit_slice(&journal.abi_encode())\`
「公開出力」 — 検証側が見る情報。ここではコミットメント（ブロックハッシュ・番号・stateRoot）とコントラクトアドレスを含むABIエンコード済み \`Journal\`。証明と journal があれば誰でも「ブロックNでコントラクトXのユーザーYが少なくとも1トークン保有」を検証できる。

## 3. host 側（preflight）

このファイルには host が出てきませんが、mirror：実Ethereumノード（Alloy + Reth RPC）と通信し、コールをシミュレーション、**witnessを収集**、それを \`Input\` としてproverに送る。Steelのhostヘルパが RPC + witness収集を担当するので、あなたのバイナリは要はこれだけ：

\`\`\`rust
let input = builder.preflight(&provider, contract, &call).await?;
let env = ExecutorEnv::builder().write(&input)?.build()?;
let receipt = default_prover().prove(env, ERC20_COUNTER_GUEST_ELF)?;
\`\`\`

## 3. なぜ Revm なのか

- **モジュラー**（Database トレイトのおかげで witness/oracle パターンが綺麗）
- **決定論的** — 同じ入力で同じ出力
- **CPUで速い** → サイクル数が少ない → 証明サイズも小さい

Go製のGethを zkVM 用にコンパイル＆最小化するのは悪夢。Revm は素直に動く。

## 4. Witness パターン

プローバの中では「ディスクから状態を読む」ができません。代わりに、証明前に **witness**（ブロックが触ったすべての状態値）を組み立てます。in-zkVM の Database 実装はこんな形：

\`\`\`rust
struct WitnessDB {
    accounts: HashMap<Address, AccountInfo>,
    storage: HashMap<(Address, U256), U256>,
    // ...
}

impl Database for WitnessDB {
    fn basic(&mut self, addr: Address) -> ... {
        Ok(self.accounts.get(&addr).cloned())
    }
    // ...
}
\`\`\`

ブロックが witness にない値を読むと証明が失敗します。witness 生成器（インデクサ／Reth ExEx）は **セキュリティモデルの一部**。

## 5. 性能の現実

2026年のEthereum 1ブロック証明：

| システム | 証明時間（1ブロック） | ハードウェア |
| :--- | :--- | :--- |
| **Risc0** | 数秒〜数分 | GPU |
| **SP1** | 数秒 | GPU + 再帰 |
| **専用zkEVM (Linea, Scroll)** | 1秒未満/ブロック | 専用インフラ |

汎用zkVM（Risc0/SP1）は **柔軟性のために** プローバ速度をある程度諦めています — 任意のRustプログラムを証明できる。専用zkEVMは速いが全部自作。

## 6. なぜ重要か

- **zkEVM L2** はこのパイプライン上に載る（Linea、zkSync、Scroll、Polygon zkEVM）
- **Optimistic Rollup** も「妥当性証明によるファストファイナリティ」へ移行中
- **ステートレスクライアント** は状態保持なしで同期する未来 — witness ＋ 証明依存

[risc0/risc0-ethereum](https://github.com/risc0/risc0-ethereum) を読むのが zk × Revm の本番版を理解する最短ルート。

## 7. 練習

「分かった」と言う前に、最小の host/guest を書いてみる：

1. guest が整数2つを読み和を返す
2. host が証明を作って検証
3. guest を 1tx ブロックでRevmを呼ぶ形に拡張
4. guestのサイクル数を前後で比較 — そこに性能の戦場がある

これで「L2プローバ」が実際にやっていることが分かります。`,
                },
                {
                  title: '本番でのRethフォーク運用',
                  slug: 'reth-fork-production-ja',
                  type: 'CONTENT',
                  sortOrder: 4,
                  duration: 18,
                  xpReward: 40,
                  content: `# 本番でのRethフォーク運用

カスタムフォークを作りました。ここからはそれを **週末を食いつぶさず** 運用するための実務チェックリスト。

## 1. ビルド & リリースパイプライン

\`\`\`bash
# 再現可能なリリースビルド
RUSTFLAGS="-C target-cpu=native -C codegen-units=1" \\
  cargo build --release --features jemalloc,asm-keccak

strip target/release/reth   # またはデバッグシンボルを切り離し
\`\`\`

| フラグ | 理由 |
| :--- | :--- |
| \`-C target-cpu=native\` | バリデータがAVX2/AVX512を持つなら使う |
| \`codegen-units=1\` | ビルド時間と引き換えに最適化 |
| \`features = [jemalloc]\` | 負荷下のテイルレイテンシ安定 |
| \`features = [asm-keccak]\` | keccakの手書きアセンブリ — ホットパスで効く |

## 2. systemd ユニット（または同等）

\`\`\`ini
[Service]
ExecStart=/usr/local/bin/reth node --chain custom --datadir /var/lib/reth
Restart=on-failure
LimitNOFILE=1048576
LimitNPROC=infinity
TasksMax=infinity
\`\`\`

ファイルディスクリプタ上限が重要：MDBXページとP2P接続を大量に持ちます。

## 3. ストレージ運用

- DB と ログは **別ボリューム**。ログでDBパーティションを埋めない
- **NVMe SSD のみ**。HDDは追従不可能
- **定期スナップショット**。\`reth db checkpoint\`、または書き込みを止められるならファイルシステム級のスナップショット
- **成長を見越す**。Rethのフルステートは数百GBで増え続ける

## 4. 監視

アラート対象：

| メトリクス | アラート条件 |
| :--- | :--- |
| 同期遅延（head vs network） | Nブロック以上を Nを超える時間 |
| ピア数 | < 5 |
| MDBX 空きページ | < 5% |
| プロセスRSS | 単調増加 |
| ブロック取り込み時間 | p99が目標を超える |
| ExEx の追従遅延 | ExEx依存 |

Reth は Prometheus メトリクスを標準で出します。Grafanaで可視化し **絶対値ではなく変化率** にもアラートを。

## 5. Diff テスト

フォークが実行を変えるなら、同じブロックでバニラRethと **継続的にdiffテスト**：

\`\`\`bash
# diffハーネスの擬似コード
for block in mainnet[recent_1000]:
    s1 = reth_vanilla.execute(block)
    s2 = reth_fork.execute(block)
    if s1.stateRoot != s2.stateRoot:
        alert("divergence at block", block, s1, s2)
\`\`\`

意図しない差分（1ストレージスロットでも）はコンセンサスバグ。**App-chain ではバグ＝チェーン停止**。

## 6. App-chain の本番トポロジ

最低限：

- **3データセンター** に **4バリデータ以上**
- 各バリデータの前に sentry を 2つ
- 別の **archive node**（バリデータではない、解析クエリ用）
- 別の **RPCフリート**（レート制限とCDN）

バリデータと公開RPCを同じマシンで動かさない。1回のDDoSでチェーンが止まる。

## 7. アップグレード手順

フォークを動かしていて一番難しいのは **チェーンを止めずにアップグレード** すること。

1. アクティベーションのターゲットブロック高を発表
2. 設定フラグでオフのまま新バイナリをバリデータに配布
3. アクティベーションブロックでコンセンサスルールが切り替わる — 高さチェックでガード
4. アップグレードしていないバリデータは脱落 — だからこそ高さガード＋告知が要る

これが Ethereum のハードフォーク運用そのものです。App-chain も規模が違うだけで構造は同じ。

## 8. 読み物

- [Reth Book "Run a node" + "Custom chain"](https://reth.rs/) のセクション
- 主要チェーンの障害ポストモーテム — 運用の直感を得る金鉱

これで「開発・プロファイル・拡張・デプロイ・監視」が全部つながりました。少数派のクラブへようこそ。`,
                },
                {
                  title: 'Expertまとめクイズ',
                  slug: 'expert-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 5,
                  duration: 15,
                  xpReward: 50,
                  content: `# Expertまとめクイズ

本番エンジニアリング層の総仕上げ。`,
                  quizQuestions: [
                    {
                      question: 'Rethが RocksDB ではなく MDBX を採用する理由は？',
                      options: [
                        'MDBX は Rust製だから',
                        '読み取りレイテンシが予測可能（LSMコンパクションのストールがない）、書き込み増幅が約1倍、mmap+MVCC でロックフリーな読み取りが可能だから',
                        'RocksDB はトランザクションをサポートしないから',
                        'MDBX は Ethereum のサポートが組み込まれているから',
                      ],
                      correctIndex: 1,
                      explanation: 'Ethereumは読み取り重く・レイテンシ敏感。MDBX (B+tree + mmap + MVCC) は予測可能なレイテンシとロックフリー読み取りを提供。RocksDB (LSM) はコンパクション起因のテイルレイテンシが validator や同期に致命的。',
                    },
                    {
                      question: 'Rust のパフォーマンス最適化で最初にやるべきは？',
                      options: [
                        'unsafe Rust に切り替える',
                        '高速なアロケータを使う',
                        'プロファイル（flamegraph 等）とベンチマーク（Criterion）で実際のホットパスを特定する',
                        'ホットループをインラインアセンブリで書き直す',
                      ],
                      correctIndex: 2,
                      explanation: '早すぎる最適化は悪、見えない遅さはもっと悪い。プロファイルで時間が消費される場所を特定し、ベンチマークで変更の効果を検証してから最適化する。',
                    },
                    {
                      question: 'Tokio ランタイム内でCPU重い処理をやる正しい方法は？',
                      options: [
                        'そのまま .await する',
                        'tokio::task::spawn_blocking で別のスレッドプールに逃がす',
                        '非同期タスクをブロックしてランタイムに任せる',
                        '多数の tokio::spawn を起動して期待する',
                      ],
                      correctIndex: 1,
                      explanation: '非同期ランタイムは並列性のためのもので、CPU処理用ではない。非同期ワーカーをブロックすると他タスクが飢える。spawn_blocking は専用スレッドプールに逃がす。',
                    },
                    {
                      question: '手続きマクロはいつ実行される？',
                      options: [
                        '実行時、マクロ呼び出しが到達するたび',
                        'コンパイル時、TokenStream を別の TokenStream に変換',
                        'リンカ内部',
                        'cargo install のインストール時',
                      ],
                      correctIndex: 1,
                      explanation: '手続きマクロ（関数風・derive・属性）はコンパイル時に走る。TokenStreamを受けてTokenStreamを吐く。cargo expand で結果が見える。',
                    },
                    {
                      question: 'Revm における「カスタムOpcode」と「カスタムPrecompile」の主要な違いは？',
                      options: [
                        'Opcode は Precompile より遅い',
                        'Opcode は EVM命令セットを変更してツールを破る／Precompile は特定アドレスへのCALLで呼べるネイティブ関数で、ツールにほぼ透過',
                        'Precompile は L2 でしか動かない',
                        '同じもの',
                      ],
                      correctIndex: 1,
                      explanation: 'Opcode はバイトコード命令でバニラEVMとのコンセンサスを破る。Precompile はCALLで呼べるネイティブ関数 — Solidity・ABIはそのまま動き、チェーンだけが知っている存在。',
                    },
                    {
                      question: 'Ethereum が状態に Merkle Patricia Trie を使う理由は？',
                      options: [
                        '最速のデータ構造だから',
                        '世界状態全体を単一の32バイトハッシュにコミットでき、包含証明が可能で、パス圧縮で空間効率が高いから',
                        'Solidity でそれしか使えなかった',
                        '他のtrieより使うRAMが少ない',
                      ],
                      correctIndex: 1,
                      explanation: 'MPT は trie（キー＝経路）＋ Patricia（パス圧縮）＋ Merkleハッシュ（ルートが全データをコミット）。32バイトのstateRootが状態を一意に識別し、ライトクライアント証明を支える。',
                    },
                    {
                      question: 'Revm を使った本番 zkEVM プルービングパイプラインで「witness」とは？',
                      options: [
                        'トランザクションを署名したウォレット',
                        'ブロックがアクセスした状態値（アカウント、ストレージ、コード）の集合。ディスクが読めないプローバが消費する',
                        'ネットワーク観測ノード',
                        'バリデータから集めた署名',
                      ],
                      correctIndex: 1,
                      explanation: 'zkVMの中ではディスクI/Oができない。witnessはブロックが読むすべての状態値のスナップショット。in-prover の Database 実装がこれを返す。witness にない値を読むと証明が失敗する。',
                    },
                    {
                      question: 'MEVサーチャーにとって ExEx が価値ある理由は？',
                      options: [
                        '次ブロックへの取り込みを保証する',
                        'チェーンのコミット／reorg 通知をほぼゼロレイテンシでプロセス内で受け取れる — ウォームキャッシュと高速シミュレーションに最適',
                        'ノード運用より安い',
                        'mempool に直接書き込む',
                      ],
                      correctIndex: 1,
                      explanation: 'ExEx はチェーンイベントが起きた瞬間に同一プロセス内でフル状態アクセスとともに発火。サーチャーはプールのウォームキャッシュ、reorg対応の状態差分、シミュレーション側のラウンドトリップ削減に使う。',
                    },
                    {
                      question: 'カスタム Precompile の価格設定で守るべき大原則は？',
                      options: [
                        'ビットコインのトランザクション手数料に合わせる',
                        'ガスコストはCPUコストに追従させ、悪用係数（2〜5倍）を掛け、敵対的入力で再ベンチして決定する',
                        '最も安いOpcodeと同じガスにする',
                        '採用されるためにゼロにする',
                      ],
                      correctIndex: 1,
                      explanation: '安すぎるprecompileはDoS攻撃を許す。最遅の現実的入力でベンチ → 悪用係数を掛ける → 敵対的入力で再ベンチ。実Ethereumも EIP-2929 で価格修正を強いられた。',
                    },
                    {
                      question: 'カスタムRethフォークでApp-chainを動かすときの最低限の本番デプロイは？',
                      options: [
                        '開発者のラップトップ上に1台のバリデータ',
                        '3データセンターに4バリデータ以上、sentry、別archive、別RPCフリート — バリデータと公開RPCは決して同居させない',
                        'ロードバランサ越しに2バリデータ',
                        'クラウドVMオートスケーラ',
                      ],
                      correctIndex: 1,
                      explanation: 'BFT安全性は障害ドメインに跨る定足数を要求。sentryでDDoS吸収、archiveで重いクエリ吸収。バリデータと公開RPCの同居は1回のDDoSでチェーンが止まる。',
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
