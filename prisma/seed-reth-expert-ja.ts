import { PrismaClient } from '@prisma/client';

export async function seedRethExpertJA(prisma: PrismaClient) {
  const tags = ['reth', 'revm', 'alloy', 'rust', 'expert', 'performance', 'mdbx', 'mev', 'zkvm'];

  await prisma.course.create({
    data: {
      slug: 'reth-expert-ja',
      title: 'Reth Expert — 本番エンジニアリング',
      description:
        'Rust EVM スタックのすべての層をまたぐハードコアな実装: DB 層 (MDBX 内部、MPT)、並行性層 (Tokio ランタイム)、コンパイラ / VM 層 (カスタム Precompile、zkEVM、Tempo Zones を題材とする EVM プライバシー)、production エンジニアリング (プロファイリング、キャッシュ意識の Rust、本番 MEV パイプライン、手続きマクロ、tracing 内部、Reth フォーク運用、differential fuzzing、chaos engineering、systems-code auditing、OSS 貢献ワークフロー)、そして Reth ベース chain の拡張パターン (extension model、OP Stack on Reth、custom ChainSpec / executor / payload builder、Paradigm スタック総覧)。Hyperliquid / Tempo / OP-stack クオリティのバーで Rust EVM コードを ship する準備ができる。なお本コースの一部スニペットは概念説明用で、そのままでは実行できない（擬似コード・省略記法を含む）ため、本文の注記に従って読み解く。',
      difficulty: 'EXPERT',
      duration: 457,
      xpReward: 815,
      track: 'reth-expert',
      tags,
      isPublished: true,
      sortOrder: 1400,
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
                  title: 'レッスン0 — Reth のためのパフォーマンスエンジニアリング',
                  slug: 'performance-engineering-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 18,
                  xpReward: 40,
                  content: `# レッスン0 — Reth のためのパフォーマンスエンジニアリング

## 問い

Reth フォークを本番投入。ベンチではブロック取り込み 12ms だったのに、本番では 80ms。残り 68ms はどこに消えた？ — 答えられない。誰もプロファイルを取っていなかったから。これこそが「見えない遅さ」— 気づかぬ間に積み重なり、バリデータが 200 ブロック遅れるまで誰も気づかない。**測定なしの最適化はどう間違うか？**

## 原理（最小モデル）

- **測ってから直す.** flamegraph（「全体としてどこで時間を使っているか？」）と Criterion（「特定の変更で関数 X が速くなったか？」）の 2 ツールで両側面をカバー。
- **マイクロベンチはシステム効果を測れない.** Criterion で 20% 改善 → ノード全体が 20% 改善する保証はない。ノード全体は schelk（ブロックデバイススナップショット）でディスク状態をロールバックして実測する。
- **キャッシュラインで考える.** RAM 読み出しはレジスタ演算の ~100 倍遅い。Struct of Arrays > Array of Structs、ホット / コールド分離、64 バイトキャッシュライン単位。
- **jemalloc は p99 を救う.** スループットではなくテイルレイテンシ。1 行で 10-30% 改善するワークロードが珍しくない。
- **3 つのリリースプロファイル.** release（日常）/ maxperf（バリデータ・ベンチ）/ maxperf-symbols（本番プロファイリング）。

## 具体例

flamegraph を 30 秒で:

\`\`\`bash
cargo install flamegraph
cargo flamegraph --bin reth -- node --chain mainnet
# flamegraph.svg をブラウザで開く
\`\`\`

Criterion でマイクロベンチ:

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

ホット / コールド分離:

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

jemalloc 1 行で:

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

Reth の実本番プロファイル ([Cargo.toml](https://github.com/paradigmxyz/reth/blob/main/Cargo.toml)):

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

起動:

\`\`\`bash
cargo build --profile maxperf --bin reth
# またはネイティブCPU命令で（AVX2など）：
RUSTFLAGS="-C target-cpu=native" cargo build --profile maxperf --bin reth
\`\`\`

## 失敗例（誤解）

「コードを短くすると速くなる」— **間違い**。現代 CPU では行数ではなく **メモリレイアウト** が支配的。短い行でも200バイト触れば 1 キャッシュラインでは収まらない。

「マイクロベンチで関数 X が 20% 速くなった → ノード全体が 20% 速くなる」— **間違い**。マイクロベンチはシステム効果（cache miss、I/O 直列化、aliasing）を測らない。1 関数が速くても他の遅さに飲まれる。

「maxperf を日常開発でも使う」— **間違い**。\`codegen-units = 1\` + \`lto = "fat"\` は全モジュール跨ぎインライン化でコンパイル時間が桁違いに長くなる。日常開発は release、出荷時だけ maxperf。

> 🛑 **予測。** ジュニアエンジニアが「ノードが遅い気がする、HashMap を BTreeMap に置き換えてみよう」と言う。アプローチの問題点を 3 つ挙げよ。（答え: ① 測定なしに原因を仮定している（実際の遅さの原因は HashMap ではないかもしれない）、② BTreeMap も遅い可能性がある（cache 局所性は劣る場合あり）、③ 変更後の再測定計画がない（最適化が打ち消し合う場合あり）。**測定なしの最適化は逆効果になりうる**。）

## ステップで組み立てる

### Step 1: flamegraph を 1 回取れる

\`cargo flamegraph --bin reth\` → svg をブラウザで → 上部の横に広いバーがホットパス。

### Step 2: Criterion ベンチを 1 つ書ける

\`benches/\` 配下に 1 つ。性能改善の主張にはベンチ結果をコミットに添える規律。

### Step 3: schelk でディスク状態をロールバック

500GB Reth DB を毎ラン再構築するのは数時間 → 不可。\`tempoxyz/schelk\` の \`dm-era\` でブロックデバイススナップショット、ロールバックは数秒。**ロールバック規律のないベンチは再現不可能**。

### Step 4: jemalloc + maxperf プロファイル

\`features = ["jemalloc", "asm-keccak"]\` + \`cargo build --profile maxperf\`。バリデータ向けの「1 サイクルでも惜しい」ビルド。

### Step 5: 3 ルール

1. 何かを変える前に必ず測る（「速くなった気がする」はデータではない）
2. プロファイラが示すパスだけを最適化
3. 変更後にもう一度測る（手動最適化がコンパイラ最適化と打ち消す場合あり）

## 答え合わせ

- **Criterion 20% → ノード全体 20% は保証されない理由**: マイクロベンチはシステム効果（cache、I/O 直列化、aliasing）を測らない。同じ関数が単独で 20% 速くても、ホットパス全体の中では他の遅さに飲まれて改善が薄まる。
- **100 万要素 \`Vec<Row>\` で \`row.id\` だけ読むとき CPU がロードする量**: 200 MB（200バイト × 100万）。\`big_blob\` を読まなくても 1 ロウあたり 200 バイト全部キャッシュラインに乗る = キャッシュラインを 200 バイト触ったのと同じ。SoA に分離すれば 12 バイト × 100 万 = 12 MB に縮む（~16 倍速）。
- **jemalloc の 10-30% はテイル（p99）**: 平均レイテンシではなく、断片化が進んだ状態での p99 が改善する。glibc malloc は arena ロック競合 + 断片化でテイルが暴れる。

## 合格基準

- 2 つのツール（flamegraph + Criterion）の役割を即答できる。
- 3 つのリリースプロファイル（release / maxperf / maxperf-symbols）の使い分けを言える。
- 「マイクロベンチがノード全体について嘘をつく理由」を 2 つ言える。
- jemalloc が救うのは p50 ではなく p99 と説明できる。

## まとめ（3行）

- 測ってから直す = flamegraph（全体）+ Criterion（関数別）。マイクロベンチはシステム効果を測れないので、ノード全体は schelk でロールバックして実測する。
- メモリレイアウト > 行数。SoA + ホット / コールド分離 + jemalloc がテイルレイテンシを救う。
- 3 プロファイル（release / maxperf / maxperf-symbols）を使い分け、性能改善の主張にはベンチ結果を必ず添える。
`,
                },
                {
                  title: 'レッスン1 — MDBX & ストレージ内部',
                  slug: 'mdbx-storage-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 18,
                  xpReward: 40,
                  content: `# レッスン1 — MDBX & ストレージ内部

## 問い

各アカウントの残高、各ストレージスロット、各レシート — Reth はそれらをすべて **1 つの** KV ストアに収める。Postgres でも RocksDB でも独自フォーマットでもなく、**MDBX**。LMDB から派生したメモリマップ B+tree。500GB の DB 全体が、まるで巨大な in-memory slice であるかのように Rust コードから見える。**なぜ RocksDB ではなく MDBX なのか？**

## 原理（最小モデル）

- **MDBX = mmap された B+tree.** OS のページキャッシュが無料の読み取りキャッシュ、ホット読み出しは「ポインタ参照、システムコールなし」。
- **LSM ツリー（RocksDB）は書き込み速いがコンパクションでストールする.** Ethereum は読み取り重く・レイテンシ敏感 → コンパクションのストールが致命傷。
- **\`Database\` trait は 2 つの関連型 \`TX\` / \`TXMut\` で読み書きを分離.** 読み取り tx に \`put\` を呼ぶことをコンパイル時に防ぐ。
- **テーブルは型（\`<T: Table>\`）であって文字列ではない.** タイポは即コンパイルエラー。
- **\`append\` vs \`put\`.** \`append\` は単調増加キー専用、B+tree 探索を省略して速い。ブロック順次処理は \`append\`、reorg は \`put\` フォールバック。
- **Cursor が範囲スキャンの正解.** 一度 B+tree に位置決めし隣接エントリを歩く。隣接キーは同じページを共有するのでキャッシュ局所性が効く。

## 具体例

なぜ MDBX か（vs RocksDB）:

| 特徴 | RocksDB | MDBX |
| :--- | :--- | :--- |
| アーキテクチャ | LSM ツリー | **B+tree（mmap）** |
| 読み取りレイテンシ | 可変（コンパクション） | **予測可能** |
| 書き込み増幅 | 高い | **約 1 倍** |
| クラッシュ安全性 | 手動 flush | **MVCC で ACID** |
| 読み取り並列性 | ロック | **ロックフリー読み取り** |

Reth の本物の \`Database\` trait（[\`crates/storage/db-api/src/database.rs\`](https://github.com/paradigmxyz/reth/blob/main/crates/storage/db-api/src/database.rs)）:

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

\`DbTx\` / \`DbTxMut\` の操作（[\`crates/storage/db-api/src/transaction.rs\`](https://github.com/paradigmxyz/reth/blob/main/crates/storage/db-api/src/transaction.rs)）:

\`\`\`rust
// DbTx (読み取り専用)
fn get<T: Table>(&self, key: T::Key) -> Result<Option<T::Value>, DatabaseError>;
fn commit(self) -> Result<(), DatabaseError>;
fn cursor_read<T: Table>(&self) -> Result<Self::Cursor<T>, DatabaseError>;
fn cursor_dup_read<T: DupSort>(&self) -> Result<Self::DupCursor<T>, DatabaseError>;
fn entries<T: Table>(&self) -> Result<usize, DatabaseError>;

// DbTxMut (読み書き)
fn put<T: Table>(&self, key: T::Key, value: T::Value) -> Result<(), DatabaseError>;
fn append<T: Table>(&self, key: T::Key, value: T::Value) -> Result<(), DatabaseError>;
fn delete<T: Table>(&self, key: T::Key, value: Option<T::Value>) -> Result<bool, DatabaseError>;
fn clear<T: Table>(&self) -> Result<(), DatabaseError>;
fn cursor_write<T: Table>(&self) -> Result<Self::CursorMut<T>, DatabaseError>;
\`\`\`

## 失敗例（誤解）

「\`append\` を任意の順番で呼んでも遅いだけ」— **間違い**。\`append\` は現在の最大より小さいキーで呼ぶと **不変条件違反** で破損する。MDBX ではなく **あなたの責任** で順序を守る（B+tree 探索を省略するため）。逆順なら \`put\` を使う。

「state root 検証は pre-execution で十分」— **間違い**。post-execution が知る = 実 EVM 実行の結果。state root は post-execution のみ検証可能。

> 🛑 **予測。** RocksDB は多くのブロックチェーンクライアントで支配的な KV ストア（geth、erigon 歴史的に）。Reth はなぜ代わりに MDBX を選ぶのか？（答え: 読み取りレイテンシ予測可能性 + クラッシュ安全性 + 書き込み増幅 ~1 倍 + ロックフリー読み取り。Ethereum は読み取り重く・レイテンシ敏感 → LSM のコンパクションストールは sync 速度・バリデータレイテンシに致命的。MDBX の B+tree mmap モデルが噛み合う。）

## ステップで組み立てる

### Step 1: trait の 2 関連型を即答

\`TX\`（読み取り専用）/ \`TXMut\`（読み書き）— 分離はコンパイル時の型安全のため。

### Step 2: \`append\` vs \`put\` を 1 文で

\`append\` は単調増加キー前提、B+tree 探索省略で速い。\`put\` は任意順、安全。reorg は \`put\` フォールバック。

### Step 3: Cursor を使う

範囲スキャンには \`cursor_read\` を一度位置決めして隣接歩き。N 個の独立 \`get\` よりキャッシュ局所性で数桁速い。

### Step 4: ホットパス読みの構造

mmap → ウォーム読みはポインタ参照（システムコールなし）→ OS ページキャッシュが無料の読み取りキャッシュ。Execution ステージ（アカウント → ストレージ → コード）が温まったページを叩く順序になっている。

### Step 5: テーブルを見る

[\`crates/storage/db-api/src/tables\`](https://github.com/paradigmxyz/reth/tree/main/crates/storage/db-api/src/tables) を開く:
- \`Headers\` テーブル: key = \`BlockNumber\`、value = \`Header\`
- \`DupSort\` テーブル: 1 キーに複数値を許す（ストレージスロット、ログなど）

### Step 6: 設計対比 — SALT

MegaETH の SALT は B+tree + MPT を、4 段 256-ary trie + SHI バケットで置き換え、認証層を完全メモリ上に持つ。state root 更新中のランダムディスク I/O ゼロ。MDBX は成熟・ACID・クラッシュセーフだが、高 TPS では state root 更新のランダム I/O がボトルネック。**設計判断は対比で初めて見える**。

## 答え合わせ

- **LSM コンパクションとは**: log-structured-merge tree が定期的に階層を再書き出しする。書き込みは速いがコンパクション中は読み書きストール。B+tree はコンパクションせず、ページ分割 / マージで空間を回収。
- **\`oldest_reader_txnid\` の用途**: 最古実行中読み取り tx を公開、長時間 reader が GC をブロックしている検知に使う。長い読み tx は DB を膨らませる。
- **mmap で 500GB DB が Rust slice に見える理由**: OS が mmap でアドレス空間にマップ、ページフォルト時に該当ページをディスクからロード。ヒット時はメモリアクセスと同コスト、ミスでもシステムコールなしの透過的フォールト。

## 合格基準

- LSM vs B+tree のトレードオフを 1 文で言える。
- \`append\` / \`put\` の使い分けと不変条件を即答できる。
- Cursor が独立 \`get\` より速い理由（B+tree 構造 + ページキャッシュ局所性）を言える。
- 「mmap → ポインタ参照、システムコールなし」を OS ページフォルト機構で説明できる。
- MDBX と SALT の設計対比を 1 つ言える。

## まとめ（3行）

- MDBX = mmap された B+tree、Ethereum の読み取り重・レイテンシ敏感ワークロードに合う（LSM のコンパクションストールが致命的）。
- \`Database\` trait は \`TX\`/\`TXMut\` で読み書き分離、テーブルは型、\`append\` は単調増加専用、Cursor が範囲スキャンの正解。
- mmap + OS ページキャッシュで「500GB DB が Rust の slice」になる — SALT との対比でこの設計判断の意味が見える。
`,
                },
                {
                  title: 'レッスン2 — Tokio ランタイム内部',
                  slug: 'tokio-internals-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 18,
                  xpReward: 40,
                  content: `# レッスン2 — Tokio ランタイム内部

## 問い

\`#[tokio::main]\` を書き、あらゆる async 呼び出しに \`.await\` を散りばめてきた。Reth のコードベースには 200 以上の \`.await\` が散らばっていて、ピーク負荷では数千の peer 接続と数十のバックグラウンドタスクを **8 ワーカースレッド** でさばいている。**\`.await\` の真下に何があるか？**

## 原理（最小モデル）

- **\`async fn\` → コンパイラ生成のステートマシン → \`Future\` trait を実装.** Executor が \`Poll::Ready(value)\` まで \`poll()\` を呼び続ける。
- **Work-stealing スケジューラ.** 各ワーカーにローカルキュー（競合なし）+ グローバルキュー（フォールバック）+ 空いたワーカーは隣から「盗む」。
- **\`spawn_blocking\` を CPU 重い処理に使う.** async コンテキストで重い同期処理を直接呼ぶとランタイムが飢えてノード全体が止まる。
- **チャネルは用途で選ぶ.** mpsc（多生産 1 消費）/ broadcast（チェーンイベント）/ watch（最新値）/ oneshot（リクエスト・レスポンス）。
- **Reth は \`TaskExecutor\` で Tokio を包み「パニック監視」を追加.** \`spawn_task\`（静かに死ぬ）vs \`spawn_critical_task\`（パニック → ノード停止 + タスク名ログ）。

## 具体例

ランタイムスタック:

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

Work-stealing:

\`\`\`
ワーカー A: [task1, task2, task3, task4]   ← 忙しい
ワーカー B: []                              ← アイドル、Aから盗む
ワーカー A: [task1, task2]
ワーカー B: [task3, task4]
\`\`\`

spawn vs blocking:

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

チャネル選定:

| チャネル | 用途 |
| :--- | :--- |
| \`tokio::sync::mpsc\` | 多生産者・1 消費者 |
| \`tokio::sync::broadcast\` | 1 生産者・多消費者（例：チェーンイベント） |
| \`tokio::sync::watch\` | 最新値ブロードキャスト（例：最新ブロック） |
| \`tokio::sync::oneshot\` | 単一値、リクエスト/レスポンス |

カスタム Future poll:

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

Reth の \`TaskExecutor\`（[\`crates/tasks/src/runtime.rs\`](https://github.com/paradigmxyz/reth/blob/main/crates/tasks/src)）:

\`\`\`rust
pub fn spawn_task<F>(&self, fut: F) -> JoinHandle<()>
where
    F: Future<Output = ()> + Send + 'static,

pub fn spawn_critical_task<F>(&self, name: &'static str, fut: F) -> JoinHandle<()>
where
    F: Future<Output = ()> + Send + 'static,
\`\`\`

## 失敗例（誤解）

「\`spawn_blocking\` なしで CPU 重い処理を async fn で呼んでも動く」— **動くが本番で詰まる**。ランタイムワーカーが飢えて、症状は「クラッシュではなく、ノード全体が静かに減速」。Prometheus で task queue 深さが膨らみ、p99 が爆発する。

「\`spawn_task\` で起動すれば長期タスクが安全」— **間違い**。\`spawn_task\` のパニックは静かに消える（Tokio デフォルト）。pruner 検証などクリティカルなタスクは \`spawn_critical_task\` で「大声で失敗」させる。

「ExEx は mpsc で十分」— **間違い**。3 つの ExEx を登録すると mpsc では 1 つだけがイベントを受け取り他は飢える（1 消費者前提）。チェーンイベントは broadcast（全 ExEx が全イベント受信）。

> 🛑 **予測。** \`async fn foo() { bar().await; }\` を書く。コンパイラは何を生成する？（① 結果の型が実装する trait、② 通常関数呼び出しと比較した実行時コスト、③ await 点を跨いだローカル変数の置き場所）。（答え: ① \`Future\` trait 実装のステートマシン struct、② アロケーション 1 回 + 各 poll で state 進める（マイクロコスト、ホット）、③ ステートマシン struct のフィールド（スタックではなく struct に saved state として）。）

## ステップで組み立てる

### Step 1: ステートマシンの正体を言える

async fn → コンパイラがステートマシン struct を生成 → \`Future\` trait 実装。Executor が \`poll()\` を \`Poll::Ready\` まで呼ぶ。

### Step 2: work-stealing の理由

ローカルキュー = 競合なし、グローバルキュー = フォールバック、stealing = 負荷分散。**シングルキュー + グローバル mutex のホット競合を回避**。

### Step 3: チャネル選定の判断軸

「何個の生産者、何個の消費者、最新値で十分か全イベント必要か」で 4 つに分岐。ExEx チェーンイベント = broadcast、設定変更通知 = watch、ジョブキュー = mpsc、RPC レスポンス = oneshot。

### Step 4: TaskExecutor の規律

「静かに死ぬ」= spawn_task、「大声で失敗 → ノード停止」= spawn_critical_task。**インフラでは大声 > 静か** — 劣化状態でノードが動き続けるのを防ぐ。

## 答え合わせ

- **work-stealing なしの代替**: 単一共有キュー + グローバル mutex。8 ワーカーが mutex 競合 = 性能崩壊。stealing は競合を「忙しいワーカー全員」から「アイドルワーカーが盗みに来た瞬間」だけに減らす。
- **CPU 重い処理を async で呼んだときの本番症状**: クラッシュではなく **task queue が詰まる**。Prometheus で「task scheduling latency」「queue depth」が単調増加、p99 が爆発、新しいリクエストが処理されなくなる。oncall は「ノードが動いてるのに遅い」を発見、原因究明に数時間。
- **ExEx + mpsc の失敗モード**: mpsc は 1 消費者前提なので 3 ExEx 登録時、最初の 1 つだけがイベントを受け取り他は飢える。broadcast なら全 ExEx が全イベント受信、ExEx 数に依存せず動く。

## 合格基準

- async fn が生成する 3 要素（Future 実装 + ステートマシン + await 点のフィールド化）を言える。
- work-stealing がグローバル mutex を回避する仕組みを説明できる。
- 4 種チャネルを用途で即答できる。
- spawn_task / spawn_critical_task の使い分けと「大声で失敗」原則を言える。

## まとめ（3行）

- Tokio = コンパイラ生成のステートマシンを work-stealing スケジューラで poll する仕組み。\`.await\` は魔法ではなくステートマシン進行。
- CPU 重い処理は \`spawn_blocking\`、チャネルは用途で 4 種から選ぶ、Reth は TaskExecutor でパニック監視を追加。
- 「大声で失敗 > 静かに死ぬ」原則 — クリティカルタスクは \`spawn_critical_task\` でノード停止 + タスク名ログ。
`,
                },
                {
                  title: 'レッスン3 — 手続きマクロ（\`sol!\` と \`address!\` の中身）',
                  slug: 'procedural-macros-ja',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 15,
                  xpReward: 35,
                  content: `# レッスン3 — 手続きマクロ（\`sol!\` と \`address!\` の中身）

## 問い

\`address!("0xabc...")\` は関数呼び出しに見えるが **コンパイル時に走る**。\`sol! { contract IERC20 { ... } }\` も同じ。**hex のパースはいつ起きるか？コンパイラのどのツールが担うか？無効な hex を書いたら何が起きるか？**

## 原理（最小モデル）

- **3 種類のマクロ.** 関数風（\`address!\`、\`sol!\`）/ derive（\`#[derive(Serialize)]\`）/ 属性（\`#[tokio::main]\`）。すべて \`crate-type = ["proc-macro"]\` のクレートに住み、\`TokenStream → TokenStream\` の関数として動く。
- **\`syn\` + \`quote\` の 2 クレート.** \`syn\` が TokenStream を AST にパース、\`quote\` がテンプレートから TokenStream を生成。
- **\`address!\` は宣言的マクロ（\`macro_rules!\`）.** 本物の手続きマクロは内側で呼ばれる \`hex!\` の方。
- **\`$d:tt\` のトリック.** マクロ内でマクロを生成するとき内側マクロの \`$\` をハイジーン回避するため。
- **\`sol!\` がコンパイル時にやること.** Solidity 風構文をパース → セレクタ（keccak256）計算 → ABI エンコード / デコード impl 生成。実行時コストゼロ。
- **\`cargo expand\` で展開を見る.** 詰まったら必ず使う。

## 具体例

ツールチェイン:

\`\`\`mermaid
flowchart LR
    Src["ソースコード<br/>sol! マクロ"] -->|コンパイラがマクロ呼び出し| In[入力 TokenStream]
    In -->|syn::parse| AST[Rust / DSL AST]
    AST -->|あなたのロジック| Tree[生成された AST]
    Tree -->|quote!| Out[出力 TokenStream]
    Out -->|コンパイラ続行| Compiled[コンパイル後のバイナリ]
\`\`\`

本物の \`address!\` ソース（[\`crates/primitives/src/bits/macros.rs\`](https://github.com/alloy-rs/core/blob/main/crates/primitives/src/bits/macros.rs)）:

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

\`sol!\` の使用例:

\`\`\`rust
sol! {
    interface IERC20 {
        function balanceOf(address owner) external view returns (uint256);
        event Transfer(address indexed from, address indexed to, uint256 value);
    }
}

let balance = IERC20::new(token, &provider).balanceOf(owner).call().await?;
\`\`\`

const としての address:

\`\`\`rust
const BURN: Address = address!();  // Address::ZERO、const で評価
\`\`\`

cargo expand:

\`\`\`bash
cargo install cargo-expand
cargo expand --bin my_app
\`\`\`

## 失敗例（誤解）

「\`address!\` は手続きマクロ」— **間違い**。\`address!\` は \`macro_rules!\` 宣言的マクロ。内側で呼ばれる \`hex!\` が本物の手続きマクロ（hex パース + バイト数チェック + \`[u8; N]\` 配列リテラル生成）。

「\`balanceOf\` の keccak は初回呼び出し時に計算」— **間違い**。\`sol!\` がコンパイル時にセレクタ（\`keccak256("balanceOf(address)")\` の先頭 4 バイト = \`0x70a08231\`）を計算してコードに埋め込む。実行時コストゼロ。

「マクロでマクロを生成するとき内側の \`$\` を直接書ける」— **間違い**。外側のメタ変数として食われてシンタックスエラー。\`$d:tt\` を \`$\` にバインドして \`$d ($d t:tt)+\` を生成コードに書く（マクロハイジーン回避）。

> 🛑 **予測。** \`address!("0xZZZ")\` を書いたらどんなエラーが出る？（答え: **コンパイルエラー**（実行時パニックではない）。\`hex!\` 手続きマクロがコンパイル時に hex digit 検証 + バイト数（Address なら 20）チェック。\`Z\` は hex digit でないのでコンパイル時に失敗。デプロイ前にバグが捕まる。）

## ステップで組み立てる

### Step 1: 3 種類を即答

関数風 / derive / 属性。すべて \`crate-type = ["proc-macro"]\` クレートに住む。

### Step 2: 2 クレートの役割

\`syn\` → TokenStream を AST に。\`quote\` → AST から TokenStream 生成。

### Step 3: \`sol!\` がコンパイル時にする 4 つ

1. Solidity 構文パース
2. 各関数の **セレクタ**（keccak256 先頭 4 バイト）計算
3. ABI エンコード / デコード impl 生成
4. 型付きラッパ struct 生成

実行時はリフレクションなし、文字列パースなし。

### Step 4: いつ proc macro を書くか

- 何度も同じ定型コードが圧縮できる
- コンパイル時バリデーション（address のパースなど）
- DSL 級の使い心地に値する規模

「1 回しか書かない 5 行を浮かせる」ためには書かない。

### Step 5: デバッグ

詰まったら \`cargo expand\` でマクロ生成コードを目視。

## 答え合わせ

- **hex パースが起きる場所**: コンパイル時、\`hex!\` 手続きマクロが \`syn\` で文字列リテラルを受け取り検証して \`[u8; N]\` を生成。
- **\`$d:tt\` トリックの理由**: 外側マクロ展開時に内側マクロの \`$\` がメタ変数として食われるのを防ぐ。\`$d\` を \`$\` にバインドすることで「外側にとってのトークン、内側にとってのメタ変数記号」を区別。
- **マクロを定義するマクロのメリット**: 1 行で 7 つの型付きマクロ（\`address!\` / \`b64!\` / \`b128!\` / \`b256!\` / \`b512!\` / \`bloom!\` / \`fixed_bytes!\`）を作成、メタパターン 1 回書いて 7 倍の便利マクロを得る。

## 合格基準

- 3 種類のマクロを即答できる。
- \`syn\` と \`quote\` の役割を 1 文で言える。
- \`sol!\` がコンパイル時にやる 4 つを即答できる。
- \`address!\` が宣言的 + 内側 \`hex!\` が手続き型、と区別できる。
- \`cargo expand\` を実行できる。

## まとめ（3行）

- 手続きマクロ = \`TokenStream → TokenStream\` の関数、\`syn\` で AST に + \`quote\` で生成。コンパイル時に走り、実行時コストゼロ。
- \`sol!\` は Solidity 構文 → セレクタ計算 + ABI エンコード impl 生成、\`address!\` は宣言的 + 内側で \`hex!\` 手続きマクロ呼び出し。
- 詰まったら \`cargo expand\` で展開コードを目視。proc macro は「コンパイル時バリデーション」「DSL」「定型圧縮」が成立する規模だけ書く。
`,
                },
                {
                  title: 'レッスン4 — Tracing 内部（Reth は自分自身をどう観測しているか）',
                  slug: 'tracing-internals-ja',
                  type: 'CONTENT',
                  sortOrder: 4,
                  duration: 20,
                  xpReward: 45,
                  content: `# レッスン4 — Tracing 内部（Reth は自分自身をどう観測しているか）

## 問い

性能チューニング、デッドロックのデバッグ、ステージが突然止まった理由の診断 — どれも、ノード自身が「何をしているか」を **教えてくれる** ことが前提。Reth の答えは \`tracing\` crate。**Reth の全可観測性（ログ + メトリクス + 分散トレース）が 1 つの基盤から生えている理由は何か？**

## 原理（最小モデル）

- **2 プリミティブ.** Span（実行領域、入れ子可）+ Event（ある時点のログ行、span 文脈を引き継ぐ）。
- **\`RUST_LOG\` で外科的フィルタ.** モジュールパス（crate + モジュール階層）でマッチ。本番デバッグは「グローバル warn + 調査対象だけ debug」。
- **Subscriber が出力先を決める.** fmt（pretty stdout） / json（本番ログ shipping） / opentelemetry（分散トレース） / カスタムレイヤー。
- **Async 境界で \`#[instrument]\`.** span は \`.enter()\` で「現在スレッド」にバインド → await で suspend すると span が drop。\`#[instrument]\` が future ラッパで suspend を生き残らせる（**Rust async tracing バグの第 1 位**）。
- **メトリクスも同じ基盤.** Prometheus メトリクスは \`tracing\` event の特定 target を subscribe して counter / histogram に翻訳。
- **OpenTelemetry でプロセス境界をまたぐ.** OTLP collector がトレース span を集約、N プロセスの完全リクエストパスを 1 つの Jaeger view に。
- **\`debug\`/\`trace\` の hot path コスト.** 静的にはコンパイル除外されない（\`RUST_LOG\` 無効でもレベルチェック）。revm opcode に \`debug!\` を入れると 30% 減速。

## 具体例

基本パターン（span + event + instrument）:

\`\`\`rust
use tracing::{info, debug, instrument};

#[instrument(skip(self, provider))]
async fn execute(&mut self, provider: &Provider, input: ExecInput) -> Result<ExecOutput> {
    let span = tracing::info_span!("execute", target = ?input.target);
    let _enter = span.enter();

    debug!("starting sender recovery");
    let batches = self.compute_batches(input).await?;
    info!(num_batches = batches.len(), "computed batches");

    for batch in batches {
        let _bspan = tracing::info_span!("batch", n = batch.id).entered();
        process_batch(batch).await?;
        info!("batch committed");
    }
    Ok(...)
}
\`\`\`

\`RUST_LOG\` フィルタ:

\`\`\`bash
# グローバルに info+、stages モジュールは debug+
RUST_LOG=info,reth_stages=debug cargo run --bin reth -- node

# 特定モジュールの全部
RUST_LOG=reth_exex=trace cargo run --bin reth -- node

# ターゲット組み合わせ
RUST_LOG=info,reth_stages=debug,reth_exex=trace,reth_network=warn
\`\`\`

Subscriber テーブル:

| Subscriber | 何をするか | いつ使うか |
| :--- | :--- | :--- |
| \`fmt\` | stdout/stderr に pretty-print | ローカル開発 |
| \`json\` | 構造化 JSON 出力 | 本番 (Datadog、Loki、ELK) |
| \`opentelemetry\` | OTLP collector へ export | 分散トレース |
| カスタムレイヤー | event を hook、メトリクス / DB / pager へ | 観測可能性インフラ |

Subscriber 初期化:

\`\`\`rust
use tracing_subscriber::{fmt, EnvFilter};

tracing_subscriber::registry()
    .with(EnvFilter::from_default_env())  // RUST_LOG が効く
    .with(fmt::layer())                    // pretty stdout
    .init();
\`\`\`

Async 境界で span を生かす:

\`\`\`rust
// 素朴 — span は最初の poll でのみ active
async fn naive(input: Input) {
    let _span = tracing::info_span!("naive").entered();
    do_thing(input).await;  // await が resume する前に span が drop される！
}

// 正しい — span のライフタイムを future 自身に紐づける
async fn correct(input: Input) {
    async {
        do_thing(input).await;
    }.instrument(tracing::info_span!("correct")).await;
}

// またはマクロを使う
#[instrument]
async fn easy(input: Input) {
    do_thing(input).await;
}
\`\`\`

OpenTelemetry 統合:

\`\`\`rust
use tracing_subscriber::prelude::*;
use opentelemetry_otlp::WithExportConfig;

let otlp_exporter = opentelemetry_otlp::new_pipeline()
    .tracing()
    .with_exporter(opentelemetry_otlp::new_exporter().tonic().with_endpoint("http://collector:4317"))
    .install_batch(opentelemetry::runtime::Tokio)
    .unwrap();

tracing_subscriber::registry()
    .with(EnvFilter::from_default_env())
    .with(fmt::layer())
    .with(tracing_opentelemetry::layer().with_tracer(otlp_exporter))  // ← OTel export
    .init();
\`\`\`

## 失敗例（誤解）

「\`.enter()\` した span は await 越しに有効」— **間違い**。\`.enter()\` は「現在スレッド」バインド、await で suspend → span drop。**Rust async tracing バグの第 1 位**。解決は \`#[instrument]\` または \`.instrument(span).await\`。

「\`debug!\` は本番で off だからコストゼロ」— **間違い**。レベルチェックは各 event で走る、静的に除外されない。Revm opcode ループに \`debug!\` を入れると 30% 減速。hot path は \`trace!\` で、本番ビルドの \`max_level_*\` feature でコンパイル除外。

> 🛑 **予測。** 本番で sender-recovery の停止をデバッグ中、全ログ行は不要（ディスク溢れ）。\`SenderRecoveryStage\` が emit するものだけ欲しい。**正しい \`RUST_LOG\` は？**（答え: \`RUST_LOG=warn,reth_stages::stages::sender_recovery=debug\` — グローバル warn で他モジュールの致命的問題を捕まえつつ、調査中のステージだけ debug。実際のモジュールパスはリポジトリのバージョンや refactor で変わりうるため、実機ではログ出力元を見て調整する。）

## ステップで組み立てる

### Step 1: Span と Event を 1 文で

Span = 実行領域（入れ子）/ Event = ある時点のログ行（span 文脈を引き継ぐ）。

### Step 2: \`RUST_LOG\` を外科的に書ける

\`warn,reth_stages=debug,reth_exex=trace\` のような組み合わせ。グローバルベースライン + 調査対象だけ詳細。

### Step 3: 4 種 subscriber の使い分け

fmt（開発） / json（本番ログ） / opentelemetry（分散） / カスタム（メトリクスインフラ）。

### Step 4: async では必ず \`#[instrument]\` か \`.instrument()\`

\`.enter()\` は await 境界を生き残らない。これを忘れると「バッチ 17 開始 → その後何もない」になる。

### Step 5: レベル規律

| パス | レベル | 本番運用 |
| :--- | :--- | :--- |
| hot path（revm opcode 内）| trace | off（コンパイル除外） |
| per-block / per-tx | debug | 調査時に選択的に有効 |
| per-stage / per-batch | info | 常時 on |
| エラー / 警告 | warn / error | 常時 on |

### Step 6: メトリクスと分散トレース

メトリクス: 同じ \`tracing\` event の特定 target を subscribe → counter / histogram。
分散トレース: \`tracing_opentelemetry\` レイヤー → OTLP collector → Jaeger / Tempo / Datadog APM。

## 答え合わせ

- **\`tracing\` が \`println!\` より優れる理由**: 構造化（key-value で query 可能）+ フィルタ可能（RUST_LOG）+ async-aware（span が await を生き残る）+ 1 基盤がログ + メトリクス + 分散トレースを feed。
- **revm opcode に \`debug!\` → 30% 減速の理由**: \`debug\` は静的にコンパイル除外されない（\`RUST_LOG\` 無効でもレベルチェックは各 event で走る）。1 ブロック数百万回呼ばれる関数では、チェック自体が測定コスト。→ \`trace!\` にして本番ビルドで \`max_level_*\` feature で除外。
- **メトリクスと \`tracing\` の関係**: 同じ event ストリームから生える — メトリクスレイヤーが特定 target（例: \`reth_metrics=info\`）の event を subscribe して counter / histogram に翻訳。Prometheus エンドポイントが scrape、Grafana で可視化。

## 合格基準

- Span と Event の違いを即答できる。
- 外科的 \`RUST_LOG\` を書ける（\`warn,reth_stages=debug\` 形式）。
- 4 種 subscriber の使い分けを言える。
- async で \`.enter()\` が壊れる理由と \`#[instrument]\` の解決法を説明できる。
- 4 段レベル規律（trace / debug / info / warn）を hot path コストと結びつけて言える。

## まとめ（3行）

- \`tracing\` = Span（領域）+ Event（時点）の 2 プリミティブ、\`RUST_LOG\` で外科的フィルタ、subscriber で出力先決定。
- Async では \`#[instrument]\` か \`.instrument()\` で span を await 境界越しに生かす（\`.enter()\` は drop される）。
- 同じ基盤からログ + メトリクス + 分散トレース全部が生える — これが Reth が \`println!\` ではなく \`tracing\` を使う構造的理由。
`,
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
                  title: 'レッスン5 — カスタム Precompile',
                  slug: 'custom-precompiles-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 15,
                  xpReward: 35,
                  content: `# レッスン5 — カスタム Precompile

## 問い

EVM の中で SHA-256 を使いたい。道は 2 つ: 新しい **Opcode** を足す（命令ストリームに新しいバイト）、あるいは **Precompile** を足す（コントラクトが \`CALL 0x00...02\` した瞬間に EVM が呼び出すネイティブ Rust 関数）。**カスタム Opcode はコンセンサスを破るがカスタム Precompile は破らない — なぜか？**

## 原理（最小モデル）

- **Opcode vs Precompile.** Opcode はバイトコード命令 → Solidity / ABI / インデクサ全部に影響、コンセンサス破壊。Precompile は特定アドレスへの \`CALL\` → ツーリングほぼ透過、レジストリに登録するだけ。
- **\`Precompile\` は \`(input: &[u8], gas_limit: u64) -> PrecompileResult\` の関数.** アドレスは \`Precompile::new\` の一部、コンパイル時に固定。
- **ガス計算は \`base + per_word × ceil(len / 32)\`.** Yellow Paper の標準形。
- **\`Precompiles::extend\` で登録.** \`optimized_access[short_idx]\` 配列にも書く → 短アドレス（0x01-0x0a）はディスパッチが単一インデックス参照。
- **\`PrecompileHalt::OutOfGas\` はフレーム全体停止.** リファンドなし、通常 revert とは別物。
- **Foundry の cheatcode は本番カスタム precompile.** \`vm.deal\` / \`vm.warp\` / \`vm.prank\` は全部 \`0x7109709ECfa91a80626fF3989D68f67F5b1DD12D\` への CALL。

## 具体例

ディスパッチフロー:

\`\`\`mermaid
sequenceDiagram
    participant C as コントラクト bytecode
    participant I as Revm interpreter
    participant Reg as Precompiles レジストリ
    participant Fn as カスタム precompile fn

    C->>I: CALL 0x00...ff
    I->>Reg: lookup アドレス
    Reg-->>I: 発見 — Precompile
    I->>Fn: run(input, gas_limit)
    Fn-->>I: Ok(gas_used, output)
    I->>C: returndata + gas refund
\`\`\`

本物の identity precompile（[\`crates/precompile/src/identity.rs\`](https://github.com/bluealloy/revm/blob/main/crates/precompile/src/identity.rs)）:

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

カスタム登録（[\`crates/precompile/src/lib.rs\`](https://github.com/bluealloy/revm/blob/main/crates/precompile/src/lib.rs)）:

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

登録例:

\`\`\`rust
let my_pre = Precompile::new(
    PrecompileId::Custom("my_thing"),
    address!("00000000000000000000000000000000000000ff"),
    my_function,
);
precompiles.extend([my_pre]);
\`\`\`

Foundry の cheatcode アドレス:

\`\`\`solidity
address internal constant VM_ADDRESS = 0x7109709ECfa91a80626fF3989D68f67F5b1DD12D;
// = address(uint160(uint256(keccak256("hevm cheat code"))))
\`\`\`

## 失敗例（誤解）

「カスタム Opcode を入れればコンセンサスを破らない」— **間違い**。Opcode はバイトコードの 1 バイトを新しい意味に再定義する → Solidity コンパイラ / Wallet / インデクサ / 他クライアントすべてとコンセンサスを破る。Precompile は **executor のレジストリにあなたのビルドだけが持つ追加エントリ** → mainnet との合意は維持される。

「ガスコストは適当でよい、後で調整」— **間違い**。precompile のガスは ChainSpec によって決まる。安すぎる precompile が攻撃者の DoS ベクターになり、後手の価格改定（EIP-2929 のような）はハードフォーク。**現実的に最も遅い入力でベンチ → 悪用係数 2-5 倍 → ガス決定** が最初から必要。

「\`vm.deal\` のような状態変更は precompile では無理」— **間違い**。Foundry はカスタム precompile を Rust で実装、calldata をデコードして Revm DB を直接書き換える。標準 precompile（identity 等）が純粋関数なのは標準仕様の制約で、カスタム precompile はホスト側の状態に何でもできる。

> 🛑 **予測。** カスタム Opcode はメインネットとのコンセンサスを破る（中級で見た）。カスタム Precompile は破らない — 同じく vanilla EVM になかった新コード。なぜ答えが違うか？（答え: Opcode はバイトコードの命令ストリームに新しい意味を導入 → 既存コードに影響 + ツール / インデクサ / コンパイラ全部が知らない命令を見る → コンセンサス分裂。Precompile は **特定アドレスへの CALL** という既存メカニズム上の動作 → mainnet がそのアドレスに何もない / 別のものを返すだけ、他のすべては変わらない。あなたのビルドだけが追加挙動を持つ。）

## ステップで組み立てる

### Step 1: 4 比較項目を即答

呼び出し方 / 追加方法 / ツール影響 / 用途。

### Step 2: identity precompile の構造を読める

\`Precompile::new(id, address, fn)\` + \`fn(input, gas_limit) -> Result\` の 50 行未満。

### Step 3: \`extend\` で登録

\`Precompiles::extend([my_pre])\` の 1 行。あとは Evm ビルダーに通す。

### Step 4: ガス設計

\`base + per_word × ceil(len / 32)\` の線形コスト。価格設定は ① 現実的最遅入力でベンチ → ② 悪用係数 2-5 倍 → ③ チェーンのガス / CPU 比率に変換 → ④ 敵対的入力で再ベンチ。

### Step 5: Foundry の cheatcode を読む

\`0x7109...\` への CALL を Foundry の Rust precompile がインターセプト → cheatcode dispatch（calldata セレクタマッチ）→ Revm DB を Rust から直接書き換え。**カスタム precompile の本番ケーススタディ**。

## 答え合わせ

- **1 KB 入力での identity ガス計算**: \`ceil(1024 / 32) = 32\` ワード。\`15 + 3 × 32 = 111\` ガス。
- **\`vm.deal\` の実装**: Foundry の Rust precompile が calldata から \`deal(address, uint256)\` セレクタをマッチ → Revm DB を直接書き換えてアカウントの残高を更新 → 通常実行を継続。標準 precompile が純粋関数なのは「Ethereum 標準仕様」の選択で、ホスト側の Rust 実装は何でもできる。
- **precompile ガス 100、攻撃者が 10 倍 CPU 時間の入力を発見**: 攻撃者は 100 ガスで通常の 10 倍 CPU を消費 → ノード 1 秒あたり 10 倍多くの CPU を払う → DoS。ガス / CPU 比率が崩れる。EIP-2929 が cold/warm reset で同様問題に対処（後手で痛いハードフォーク）。

## 合格基準

- Opcode vs Precompile の 4 比較を即答できる。
- \`Precompile::new(id, address, fn)\` の構造を言える。
- \`Precompiles::extend\` で登録、\`optimized_access\` で短アドレスが速い理由を説明できる。
- ガス価格設計の 4 ステップを言える。
- Foundry の cheatcode が「カスタム precompile + Rust 側 state 書き換え」と分かる。

## まとめ（3行）

- カスタム Precompile = アドレス + Rust 関数（\`(input, gas_limit) -> Result\`）を Revm レジストリに登録、Opcode と違いコンセンサスを破らない。
- ガス計算は \`base + per_word × ceil(len / 32)\`、価格設計は「最遅入力ベンチ → 悪用係数 → 敵対的再ベンチ」の 4 ステップ。
- Foundry の cheatcode（\`vm.deal\` / \`vm.warp\`）は本番カスタム precompile の最広デプロイ例 — 同じパターンを自分のチェーンに転用できる。
`,
                },
                {
                  title: 'レッスン6 — Merkle Patricia Trie & 状態証明',
                  slug: 'mpt-state-proofs-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 18,
                  xpReward: 40,
                  content: `# レッスン6 — Merkle Patricia Trie & 状態証明

## 問い

スマホ大のデバイスが「Alice のアカウントは 1 ETH 持っているか？」を知りたい — ただし Ethereum の 500GB 状態は持てない。だからフルノードに問い合わせると、返ってくるのは **数百バイト**。デバイスはハッシュループを回し、結果を **手元の信頼済み 32 バイト** と比較する。**手元の 32 バイトは何で、ハッシュループは何を証明するか？**

## 原理（最小モデル）

- **MPT = Trie + Patricia + Merkle.** Trie（経路がキーを綴る木）+ Patricia（単一子ノードを潰す経路圧縮）+ Merkle（各ノードが子のハッシュを保持）。
- **stateRoot = 256 ビットの世界状態識別子.** 1 バイトでも変わればルートが変わる。
- **3 ノード種.** Branch（16 子 + 値、分岐点）+ Extension（共有プレフィックス、「次の N ニブルは全員で共通」）+ Leaf（最終値）。キーはニブル（4 ビット）単位。
- **包含証明 6 ステップ.** ルートから経路ノード収集 → リーフを再ハッシュ → 親を上に再ハッシュ → 結果ルートと信頼済み stateRoot を比較。
- **Witness = ブロック再実行に必要な trie ノード束.** 「触った部分だけ」、数百 KB - 数 MB。
- **2 層 MPT.** stateRoot → アカウントリーフ → storage_root → スロットリーフ。各コントラクトが独立ストレージ trie を持つ。

## 具体例

trie 構造:

\`\`\`mermaid
graph TD
    R[Branch — ルート<br/>16 子スロット]
    R -->|nibble| E[Extension<br/>共通プレフィックス]
    R -->|nibble| L1[Leaf<br/>アカウント → 値]
    E --> B[Branch]
    B -->|nibble| L2[Leaf<br/>アカウント → 値]
    B -->|nibble| L3[Leaf<br/>アカウント → 値]
\`\`\`

包含証明の流れ（6 ステップ）:

1. ルートから X のキーへ向かって辿り、経路のノードを集める
2. 各ノードは子を **ハッシュ** で参照（ポインタではない）
3. 検証側に必要なのは経路ノードだけ。trie 全体は不要
4. リーフを再ハッシュし、上に向かって親を再ハッシュ
5. 結果のルートを **信頼済み \`stateRoot\`** と比較
6. 一致 → X の残高が本当に Y だと確認

Reth の本物の証明型（[\`crates/trie/common/src/proofs.rs\`](https://github.com/paradigmxyz/reth/blob/main/crates/trie/common/src/proofs.rs)）:

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

2 層 MPT:

\`\`\`
stateRoot
└── アカウントリーフ（AccountProof.proof が返す）
    └── storage_root（AccountProof.info.storage_root にも保存）
        └── スロットリーフ群（StorageProof.proof で証明）
\`\`\`

trie crate 構造:

\`\`\`
crates/trie/
├── common/src/proofs.rs  ← AccountProof, StorageProof（上記）
├── trie/                  ← trieデータ構造そのもの
├── parallel/              ← 並列trie計算
├── sparse/                ← witness/proof生成用のsparse trie
└── db/                    ← MDBXバックエンドのtrie
\`\`\`

## 失敗例（誤解）

「ストレージ証明は stateRoot に対して検証」— **間違い**。**2 層 MPT** なので: ストレージ証明は \`storage_root\` に対して、アカウント証明（\`storage_root\` を含む）が \`stateRoot\` に対して。これを忘れるのが「state proof 検証器が動かない」最大の理由。

「Patricia 圧縮は最適化」— **半分正しい**。圧縮なしだと 64 ニブルのキーで 64 ノード経路、ほぼ空の trie でも巨大。Patricia は **必須**（最適化ではなく実装可能性）。

「非包含証明は補助的」— **間違い**。\`info: Option<Account>\` が \`None\` → 非包含証明。「このアドレスにアカウントがない」を証明することは残高証明と同じくらい重要（airdrop、シビル耐性、slashing 適格性）。

> 🛑 **予測。** ライトクライアントが witness（trie ノードバイトリスト）を受け取り、ルートまでハッシュアップ。検証者が必要だが witness にないものは何？（答え: **信頼済み stateRoot**（過去に何らかの方法で信頼済み — consensus client から、他の検証済みヘッダから、created at genesis から）。これがあるからこそ証明は *暗号学的* — 「あなたが送ったバイトを信用する」ではなく「あなたが送ったバイトをハッシュした結果が、私が独立に信頼している 32 バイトと一致する」。）

## ステップで組み立てる

### Step 1: 3 ノード種を即答

Branch（分岐 + 16 子）/ Extension（共有プレフィックス）/ Leaf（最終値）。キーはニブル単位。

### Step 2: 包含証明 6 ステップを暗唱

経路収集 → ハッシュ参照 → witness 経路のみ → リーフ再ハッシュ → 上に向かって再ハッシュ → 信頼済み stateRoot と比較。

### Step 3: \`AccountProof\` フィールドを読める

- \`address\`: 対象
- \`info\`: \`Option<Account>\` — None なら非包含証明
- \`proof\`: ルートからアカウントリーフまでの RLP ノード列
- \`storage_root\`: コントラクトストレージ trie のルート（**stateRoot ではない**）
- \`storage_proofs\`: 各スロットの証明（\`storage_root\` に対して検証）

### Step 4: 2 層構造を意識

ストレージ証明は \`storage_root\` に対して、アカウント証明は \`stateRoot\` に対して。**親ハッシュが違う**。

### Step 5: Reth の trie crate を辿る

順序: \`common\`（型）→ \`trie\`（データ構造）→ \`db\`（本番グルー）+ \`parallel\` / \`sparse\` は MEV / witness 用途で別途。

## 答え合わせ

- **stateRoot が世界状態を一意識別する仕組み**: Merkle ハッシュが下にある全バイトに依存。1 スロット変えれば → 上位の親全部を再ハッシュ → ルートが変わる。
- **非包含証明の実用**: airdrop（「このアドレスは過去 X トークンを保有していない」を証明 = 受給資格）/ slashing 適格性（「この validator はこの slot で signature を出していない」）/ シビル耐性（「このアドレスは新規」）。
- **各コントラクトに独立ストレージ trie の理由**: ① コントラクト独立性（コントラクト A の更新がコントラクト B の ストレージ証明に影響しない）+ ② ローカル更新コスト最小化（コントラクトを 1 つ更新 = そのストレージ trie のルートだけ + アカウントリーフ 1 つ更新、巨大なグローバル trie 全部触らない）+ ③ ライトクライアントが特定コントラクトの全状態証明をコンパクトに得られる。

## 合格基準

- 3 ノード種を即答できる。
- 包含証明 6 ステップを暗唱できる。
- \`AccountProof\` の 5 フィールドを役割で言える。
- 2 層 MPT（stateRoot → storage_root → スロット）を絵で書ける。
- 非包含証明の実用例を 2 つ言える。

## まとめ（3行）

- MPT = Trie + Patricia 経路圧縮 + Merkle ハッシュ。stateRoot が世界状態を 256 ビットで一意識別。
- 包含証明 = ルートから経路ノードを束ねて送る → 検証者が手元の信頼済み stateRoot と再ハッシュ結果を比較。witness は触ったノードだけ、数百 KB-数 MB。
- 2 層 MPT（コントラクトごと独立ストレージ trie）が独立性 + 効率 + ライトクライアント用途を成立させる。
`,
                },
                {
                  title: 'レッスン7 — Stateless Ethereum（ress と stateless-validator を並べて読む）',
                  slug: 'stateless-ethereum-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 18,
                  xpReward: 45,
                  content: `# レッスン7 — Stateless Ethereum（ress と stateless-validator を並べて読む）

## 問い

今日のメインネットで Reth フルノードを動かすには **~3 TB のディスク**。多くの開発者はそれを動かせない → バリデータ層では「誰でも検証できる」が静かに事実でなくなる。Paradigm の [\`ress\`](https://github.com/paradigmxyz/ress) は **14 GB** で同じ検証をする。MegaETH の [\`stateless-validator\`](https://github.com/megaeth-labs/stateless-validator) は高 TPS L2 をコモディティハードウェアで再検証する。**2 つの本番品質 Rust 実装が、興味深いすべてのレイヤで違う設計を選んでいる — その対比は何を教えるか？**

## 原理（最小モデル）

- **ステートレス = ワールド状態を持たずに検証.** Witness（前ブロックの信頼済み stateRoot に対して、ブロックが触るスロットの値を暗号学的に証明する束）から状態を読む。
- **Witness ソースの非対称性.** ステートフルでない誰か（Reth フルノード / MegaETH sequencer）が witness を生成、ステートレス検証者は信頼ではなく **暗号学的に** witness を stateRoot で検証する。
- **ress = フルステートレス（state + bytecode）.** MPT 証明、メインネット、Reth ピアから RLPx で取得、~14 GB ディスク。
- **stateless-validator = 部分ステートレス（state ステートレス、bytecode 別キャッシュ）.** SALT 証明（Banderwagon + IPA）、MegaETH、sequencer から JSON-RPC で取得、bytecode は \`ContractCache\` ローカル永続化。
- **並列性の違い.** ress = 1 ブロックずつ（CL ペーシング）/ stateless-validator = ブロック横断 embarrassingly parallel（各ブロックが独立 witness + pre-state root を持つ）。
- **複数実行エンジン.** stateless-validator は revm + 形式 K-セマンティクスを両方サポート → コンセンサスバグの第二意見、TCB を小さく保つ。

## 具体例

ress（Paradigm）:

- **対象**: Ethereum メインネット
- **ディスク**: 14 GB
- **Witness ソース**: Reth フルノード（\`--ress.enable\`）、専用 RLPx サブプロトコル
- **Witness フォーマット**: MPT 証明（\`AccountProof\` / \`StorageProof\`）
- **Bytecode**: ピアから **オンデマンド** + キャッシュ
- **検証フロー**: CL が \`NewPayload\` → ress が Reth ピアに witness + 不足 bytecode を要求 → メモリ上検証 → \`PayloadStatus\` 返す
- **本番ステータス**: Holesky でバリデータ実走、Hive Cancun テスト 226/206 パス

stateless-validator（MegaETH）:

- **対象**: MegaETH（高 TPS L2、OP-Stack 系）
- **Witness ソース**: MegaETH sequencer の専用 RPC エンドポイント
- **Witness フォーマット**: SALT 証明（Banderwagon + IPA、~1 GB メモリで 30 億アイテム認証）
- **Bytecode**: **部分ステートレス** — public RPC から取得 + 有界 \`ContractCache\` 永続化
- **検証フロー**: 3 ステージパイプライン（FETCH → PROCESS → ADVANCE）、複数ワーカーが異なるブロックを並列処理
- **実行エンジン**: revm + 形式 K-セマンティクス（プラガブル）+ JIT は sequencer 側
- **信頼モデル**: state 遷移検査、カノニカル性は \`op-node\` が L1 + DA から導出（**trust-minimized**）

サイドバイサイド:

| 観点 | \`ress\` (Paradigm) | \`stateless-validator\` (MegaETH) |
| :--- | :--- | :--- |
| 対象チェーン | Ethereum メインネット (L1) | MegaETH (L2) |
| Witness フォーマット | MPT 証明 | SALT 証明 (Banderwagon + IPA) |
| Witness ソース | Reth ピア、\`ress\` RLPx サブプロトコル経由 | Sequencer、\`--witness-endpoint\` JSON-RPC 経由 |
| Bytecode 処理 | ピアからオンデマンド取得・キャッシュ | RPC からオンデマンド取得、\`ContractCache\` にキャッシュ |
| ステートレス度 | フル (state) | **部分** — state はステートレス、bytecode はそうでない |
| 実行エンジン | revm (単一) | revm **と** 形式 K-セマンティクス (プラガブル) |
| 並列性 | 1 ブロックずつ (CL ペーシング) | ブロック横断で embarrassingly parallel (N ワーカー) |
| カノニカル性 | コンセンサスクライアントを信頼 (Engine API) | \`op-node\` を信頼 (L1 + DA 導出) |
| ディスクフットプリント | ~14 GB | \`ContractCache\` + redb メタデータで有界 |

## 失敗例（誤解）

「ステートレスは小さいノードのための機能」— **間違い**。検証者層の機能で、4 用途: ① L1 分散化（ラップトップで完全検証）+ ② L1 ガス上限拡張（state read のランダム I/O が天井を決めていた）+ ③ Optimistic L2 セキュリティ（fraud-proof 見張りが安く）+ ④ Native rollups（再実行可能な検証者は 3 TB 状態を抱えられない）。

「ピアから witness を受け取るのは信頼」— **間違い**。**暗号学的に** witness を stateRoot に対して検証する。1 バイトでも改竄されれば検証失敗。信頼するのはピアではなく **手元の信頼済み stateRoot**。

「ステートレス = 完全ステートレス」— **間違い**。MegaETH は **部分ステートレス**（state は witness、bytecode は別キャッシュ）。bytecode は state と性質が違う（滅多に変わらない、同じ 100 KB を毎ブロック送るのは無駄）→ 一度取って局所キャッシュが合理的。設計選択の自由度。

> 🛑 **予測。** 「ステートレス」ノードはフル状態を持たずにブロックを検証する。ブロックプロポーザーは普通のノードに送らないものを、ステートレスノードには何を送らないといけないか？ その追加ペイロードは何と呼ばれる？（答え: ブロックが触る state 値とその MPT 証明 = **witness**。サイズは数百 KB - 数 MB / ブロック（典型）。フルノードは自分の DB から state を読むので witness は不要、ステートレスノードはこれが state アクセスの唯一の経路。）

## ステップで組み立てる

### Step 1: 「ステートレス」を 1 文で

ワールド状態を持たず、witness（前ブロック stateRoot に対する暗号証明束）から state を読んで検証 + 次の stateRoot を再導出。

### Step 2: ステートレスの 4 用途

① L1 分散化、② ガス上限拡張、③ Optimistic L2 セキュリティ、④ Native rollups。

### Step 3: 2 実装の差分軸 9 つ

対象 chain / Witness ソース / Witness フォーマット / Bytecode / ステートレス度 / 実行エンジン / 並列性 / カノニカル性 / ディスク。

### Step 4: 設計対比の解釈

- **bytecode 別キャッシュ（MegaETH）**: bytecode は滅多に変わらない + 毎 witness に含めるのは無駄 → 一度取って局所キャッシュ。L2 sequencer 集中型なので「単一 RPC からオンデマンド取得」が成立。
- **複数実行エンジン（MegaETH）**: revm のコンセンサスバグ → 全 Reth 系 chain のコンセンサスバグ。形式 K-セマンティクスは設計上違うバグ → 第二意見。**小さな Trusted Computing Base** 原則。
- **embarrassingly parallel（MegaETH）**: 各ブロックが独立 witness + pre-state root → N ワーカーで並列、CL ペーシングに縛られない。

### Step 5: 並べて読まないと見えないこと

ress 単独だと「witness は常に MPT」「ステートレス = フル」「実行エンジンは 1 つ」と思い込む。stateless-validator 単独だと「ステートレスには常にカスタム commitment」「L2 流の trust-minimized 導出パイプライン必須」と思い込む。**対比が教えるのはダイヤルの自由度**。

## 答え合わせ

- **「ピアから witness 信頼」が誤りである理由**: stateRoot に対する MPT 証明として witness を暗号学的に検証する。1 バイト改竄で検証失敗 → 「信用する」ではなく「ハッシュ結果が手元の信頼済み 32 バイトと一致する」。
- **MegaETH の bytecode 別取り扱い**: bytecode は state と違って滅多に変わらない + ホット DeFi コントラクトは毎ブロック state 発信するが bytecode はデプロイ以来不変 → 毎 witness に含めるのは同じ 100 KB を再送 → ローカル \`ContractCache\` に取得 + キャッシュが合理的。
- **MegaETH の複数実行エンジンが防ぐもの**: revm 系クライアントを 1 つだけ動かしていると、revm の 1 つのインタプリタバグでチェーン分裂 / 凍結 + 第二意見得られず。形式 K-セマンティクスは数学的に違うバグなので、両者一致が大きな信頼度向上。**小さな Trusted Computing Base** の規律。

## 合格基準

- 「ステートレス」を witness 概念で定義できる。
- ステートレス 4 用途を即答できる。
- 9 観点の差分を ress / stateless-validator で表で書ける。
- bytecode 別キャッシュと複数実行エンジンの設計理由を説明できる。
- 「並べて読む」が単独読みより教える内容を 2 つ言える。

## まとめ（3行）

- ステートレス = witness（stateRoot に対する暗号証明束）で state を読み、ワールド状態を持たずに検証 + 次の stateRoot を再導出。
- ress（フルステートレス、MPT 証明、メインネット）と stateless-validator（部分ステートレス、SALT 証明、L2、複数実行エンジン）の対比が設計の自由度を見せる。
- 「ステートレスは小さいノードの機能」ではなく、検証者層の機能 — 4 用途（L1 分散化 / ガス上限 / Optimistic L2 / Native rollups）すべてに効く。
`,
                },
                {
                  title: 'レッスン8 — 本番 MEV（Mempool・ExEx・シミュレーション）',
                  slug: 'mev-in-practice-ja',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 20,
                  xpReward: 45,
                  content: `# レッスン8 — 本番 MEV（Mempool・ExEx・シミュレーション）

## 問い

ペンディング tx が mempool に届く。80 ミリ秒後、あなたのバンドルは当たったか外れたか — 同じ tx を 5ms 速くデコードし、結果を 10ms 速くシミュレーションし、ビルダーに 2ms 先に提出した競合に敗れる。**Ethereum のブロックタイムは 12 秒なのに、本気の MEV パイプラインは end-to-end <100ms を狙う — なぜそこまでタイトか？**

## 原理（最小モデル）

- **6 段パイプライン.** Mempool → デコード → シミュレータ → 戦略 → バンドル組成 → 送信。
- **Mempool 取り込み 2 経路.** Alloy WebSocket 購読（簡単・遅い） / devp2p 直接参加（最速・最難）。
- **\`sol!\` マクロが型安全デコードの土台.** \`L1StandardBridgeEvents::decode_raw_log\` が topic0 でバリアントマッチ → 型付きイベントでパターンマッチ。
- **シミュレーションは parent block ピン.** \`latest\` ではなく **ターゲットスロットの親ブロック** に対して fork DB。シミュレーション内の被害 tx が「もう実行済み」状態にならないように。
- **ExEx でウォームキャッシュ.** プールリザーブ / 過去 tx インデックス / reorg 対応 state 差分を ExEx で持ち、サーチャーがネットワーク再取得を避ける。
- **送信経路 2 種.** Flashbots / MEV-share（プライベート、強）/ 特定ビルダー直接（低レイテンシ）。
- **焼かれる 4 ポイント.** Reorg / シミュレータ古い state / Gas griefing / Toxic flow。

## 具体例

パイプライン:

\`\`\`mermaid
flowchart LR
    M[Mempool<br/>ExEx + devp2p] --> D[デコード<br/>Alloy sol!]
    D --> S[シミュレータ<br/>Revm + DB]
    S --> St[戦略<br/>Rust ロジック]
    St --> B[バンドル組成<br/>Alloy encode]
    B --> Sub[送信<br/>Flashbots / 直接]
\`\`\`

本物の ExEx デコードパターン（[\`paradigmxyz/reth-exex-examples/op-bridge\`](https://github.com/paradigmxyz/reth-exex-examples/tree/main/op-bridge) より）:

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

型付きイベントでパターンマッチ:

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

シミュレーション:

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

送信経路:

| 経路 | レイテンシ | プライバシー |
| :--- | :--- | :--- |
| Flashbots / MEV-share | 中 | 強（mempool 公開しない） |
| 特定ビルダーへ直接 | 低 | ビルダー次第 |

## 失敗例（誤解）

「\`latest\` に対してシミュレーション」— **間違い**。シミュレータの「latest」ビューでは被害 tx が **既に実行済み** に見える → 機会を見逃す or 利益が嘘になる。**ターゲットスロットの正確な親ブロック** に対して fork。

「mempool 公開で十分」— **間違い**。公開すると競合サーチャーが先回り。Flashbots / MEV-share で **mempool に公開しない** プライベート提出が標準。

「ExEx は通知だけのもの」— **間違い**。ExEx を **プライベート mempool / ウォームキャッシュ** として使うのが本気のパターン。プールリザーブを ExEx で温める → シミュレータが再取得不要 → 数 ms 削減。

> 🛑 **予測。** Ethereum のブロックタイムは 12 秒、なのに本気の MEV パイプラインは end-to-end <100ms を狙う。なぜそこまでタイトか？ 残りの ~11.9 秒を何が食う？（答え: ① 競合サーチャー数千が同じ機会を狙う → 先着順で 1 ms 単位の競争、② ネットワーク伝播（ペンディング tx 検知から自分のマシンまでに既に数十 ms）、③ ブロックプロポーザータイミング（ビルダーは slot 終了直前まで bundle を accept、最後の数 ms が支配的）。「12 秒の予算」ではなく「数千の競争相手より速い予算」。）

## ステップで組み立てる

### Step 1: 6 段パイプラインを順に言える

Mempool → デコード → シミュレータ → 戦略 → バンドル組成 → 送信。各段が Rust モジュール。

### Step 2: \`sol!\` + \`decode_raw_log\` パターン

\`sol!(Bridge, "abi.json")\` → \`BridgeEvents::decode_raw_log(topics, data)\` → 型付きイベント → パターンマッチ。手書き ABI パースなし。

### Step 3: シミュレーション parent block ピン

\`AlloyDB(provider, BlockId::number(parent))\` + LRU キャッシュ → 同じ読み取りをネットワーク再取得しない。

### Step 4: ExEx を 3 用途で使う

① カスタム DEX トレードインデクサ、② プールリザーブのウォームキャッシュ、③ reorg 対応 state 差分フィード。サーチャーが ExEx 出力を消費。

### Step 5: 焼かれる 4 ポイント

| 失敗 | 対策 |
| :--- | :--- |
| Reorg | \`ChainReorged\` 通知でバンドル後の整合 |
| シミュレータ古い state | parent block ピン |
| Gas griefing | 優先手数料カーブを実時間監視 |
| Toxic flow | 分類器で罠を弾く |

## 答え合わせ

- **3 段ネストの iterator を fold に潰せるか**: 可能だが選ばない理由は **遅延評価と早期フィルタ**。\`flat_map\` でストリーミング、\`filter\` がブリッジアドレスでないログを早期に削除 → デコードはマッチした少数のログだけ。fold だと全ログを accumulator に積んでから処理 = 余計な仕事。
- **\`latest\` シミュレーションの破綻**: バンドル \`[自 tx_A, 被害 tx, 自 tx_B\] でシミュレーション、\`latest\` には被害 tx が **既に含まれている**（mempool から確定済み）→ シミュレータの被害 tx は no-op、利益計算が嘘 → 実際に出すと利益ゼロかマイナス。
- **reorg で当たったバンドルの P&L**: 自 ETH（バンドル先頭で支払い） → 巻き戻し、被害者 ETH → 巻き戻し、ガス → 巻き戻し（バンドル全体が含まれていたブロックが消える）= 全 P&L 巻き戻し。**ただし** バックランの DEX トレードがブロック含むことで価格を動かしていた場合、その状態変化を見て次のブロックで別の機会を見つけられる場合あり。**ExEx の \`ChainReverted\` ハンドラ** で reorg 直後の再評価。

## 合格基準

- 6 段パイプラインを順に言える。
- \`sol!\` デコードパターン（\`decode_raw_log\` + パターンマッチ）を書ける。
- シミュレーションを parent block ピンで設計できる。
- ExEx をプライベート mempool / ウォームキャッシュとして使う発想がある。
- 焼かれる 4 ポイントを即答できる。

## まとめ（3行）

- 6 段パイプライン（Mempool → デコード → シミュレータ → 戦略 → バンドル → 送信）、end-to-end <100ms 予算、競争相手より速い予算。
- \`sol!\` 型安全デコード + parent block ピンシミュレーション + ExEx ウォームキャッシュが本気のパターン。
- 焼かれる 4 点（Reorg / 古い state / Gas griefing / Toxic flow）を全部押さえないと利益が嘘になる。
`,
                },
                {
                  title: 'レッスン9 — zkEVM with Revm',
                  slug: 'zkevm-revm-ja',
                  type: 'CONTENT',
                  sortOrder: 4,
                  duration: 15,
                  xpReward: 35,
                  content: `# レッスン9 — zkEVM with Revm

## 問い

Linea、zkSync、Scroll、Polygon zkEVM — どの本番 zkEVM ロールアップも同じ主張: 「verifier は我々を信用しない、verifier は 250 バイトの証明を検査するだけ」。証明を生成するのが **プローバ** で、動かすのは geth でも nethermind でもなく **Revm**。**zkVM 内で使うのに Revm が選ばれる理由は？**

## 原理（最小モデル）

- **Revm を RISC-V にコンパイル → zkVM 内で実行 → zkVM が正しい実行の証明を出す.** ホスト（preflight: witness 収集）→ guest（Revm 実行 + journal commit）→ プローバ（STARK / SNARK）→ 検証者コントラクト。
- **Revm が zkVM に適する 3 性質.** モジュラー（Database trait で witness / oracle パターンが綺麗）+ 決定論的（同入力同出力）+ CPU で速い → サイクル数少 → 証明サイズ小。
- **Witness パターン.** プローバ内では「ディスクから状態を読む」不可 → 証明前に witness（ブロックが触ったすべての値）を組み立て → in-zkVM Database 実装が witness から読む。witness にない値を読むと証明失敗。
- **\`env::commit_slice\` で公開出力.** 「証明を持つ誰でも検証できる事実」を journal に。コミットメント（ブロックハッシュ + 番号 + stateRoot）+ アプリ固有データ。
- **汎用 zkVM vs 専用 zkEVM.** Risc0 / SP1 = 柔軟（任意 Rust）+ 遅い（数秒-数分 / ブロック GPU）/ 専用（Linea、Scroll）= 速い（1 秒未満）+ 不柔軟（全部自作）。

## 具体例

プルービングスタック:

\`\`\`mermaid
flowchart TB
    subgraph Host
        RPC[Ethereum RPC] --> Pre[preflight: witness 収集]
    end
    Pre -->|Input: header + witness + call| Guest
    subgraph Guest [zkVM guest]
        Verify[stateRoot に対して witness 検証]
        Verify --> RevmRun[Revm が EVM call を実行]
        RevmRun --> Journal[block hash + 結果を commit]
    end
    Guest --> Prover[証明システム<br/>STARK / SNARK]
    Prover --> Proof[Proof + Journal]
    Proof --> Verifier[オンチェーン verifier コントラクト]
\`\`\`

本物の guest コード（[\`boundless-xyz/steel/examples/erc20-counter\`](https://github.com/boundless-xyz/steel/tree/main/examples/erc20-counter) の \`guest/src/main.rs\`）:

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

ホスト側（preflight）:

\`\`\`rust
let input = builder.preflight(&provider, contract, &call).await?;
let env = ExecutorEnv::builder().write(&input)?.build()?;
let receipt = default_prover().prove(env, ERC20_COUNTER_GUEST_ELF)?;
\`\`\`

Witness DB パターン:

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

性能比較:

| システム | 証明時間（1 ブロック） | ハードウェア |
| :--- | :--- | :--- |
| Risc0 | 数秒〜数分 | GPU |
| SP1 | 数秒 | GPU + 再帰 |
| 専用 zkEVM (Linea, Scroll) | 1 秒未満 / ブロック | 専用インフラ |

## 失敗例（誤解）

「Go 製 geth を zkVM 用にコンパイルできる」— **動かない**。GC + goroutine + 動的ディスパッチ + 巨大バイナリで zkVM が爆発（サイクル数膨大）。**Revm が選ばれる構造的理由**: \`no_std\` 可能 + \`Database\` trait で IO 抽象 + 非決定性なし + 静的ディスパッチ中心。

「プローバが state について嘘をつける」— **間違い**。\`evm_input.into_env(chain_spec)\` が **witness をヘッダの stateRoot に対して検証** → 1 バイト改竄で失敗。プローバが嘘をつくと証明が出ない。

> 🛑 **予測。** 攻撃者が、コールが必要とする 1 つのストレージスロット以外はすべて正しい state を持つ witness を含む Input を提出。guest のどこで abort？（答え: \`Contract::new(...).call_builder(&call).call()\` 実行中、Revm がその欠落スロットを read しようとした瞬間に WitnessDB の \`HashMap::get\` が \`None\` → \`Database::storage\` が「未含有」エラー → call panic → 証明生成失敗。プローバから見える失敗は「guest プログラムが panic で終了」、receipt 生成不可。）

## ステップで組み立てる

### Step 1: スタック 4 層を即答

Host（preflight） → Guest（Revm + commitment） → Prover（STARK/SNARK） → Verifier コントラクト。

### Step 2: Revm が zkVM に適する 3 性質

モジュラー / 決定論的 / CPU で速い → サイクル数少 → 証明サイズ小。

### Step 3: Witness パターン

ホストが preflight で witness 収集 → Input にして guest に渡す → guest 内の WitnessDB（\`Database\` 実装）が witness から read。witness にない read は証明失敗 = セキュリティモデルの一部。

### Step 4: \`env::commit_slice\` の意味

公開出力 = 証明を持つ誰でも検証できる事実。Journal に block hash + stateRoot + アプリ固有データを入れる → 検証者は journal + proof で「block N でコントラクト X のユーザ Y が ≥ 1 トークン保有」を知る。

### Step 5: 汎用 vs 専用

Risc0 / SP1 = 柔軟性のためにプローバ速度を諦める（任意 Rust 証明可）/ 専用（Linea / Scroll）= ブロック当たり桁違いに速いが全部自作。Risc0 を選ぶ理由は「証明したいロジックが Solidity 以外でも書ける」「Ethereum 以外の chain も対応」。

## 答え合わせ

- **「1 バイトでも間違えば失敗」のメカニズム**: \`into_env\` が witness（trie ノード列）を MPT 検証 → ヘッダの stateRoot を再導出して入力ヘッダと比較。MPT は Merkle ハッシュなので 1 バイト改竄 → 親ハッシュ変化 → 再導出 root が入力 root と一致しない → 検証エラー → guest abort。
- **Revm が Geth より zkVM に適する 3 性質**: ① \`no_std\` 可能 + 静的ディスパッチ → 小さく決定論的、② \`Database\` trait が witness 抽象を綺麗に受ける、③ CPU で速い → サイクル数少 → 証明サイズ / 時間が小。Go の Geth は GC + goroutine で zkVM 苦手。
- **専用 zkEVM が遅い Risc0 を使う 2 シナリオ**: ① 任意 Rust ロジックを証明したい（アプリ固有計算、AI 推論、署名集約など）→ 専用 zkEVM の EVM 縛りから外れる、② 複数チェーン対応 / 新 chain への即移植性が欲しい（Risc0 は Ethereum 以外も chain spec 差し替えで対応）。

## 合格基準

- 4 層スタックを即答できる。
- Revm が zkVM 適合な 3 性質を言える。
- Witness パターン（ホスト収集 → WitnessDB read → 欠落は失敗）を説明できる。
- \`env::commit_slice\` の公開出力の意味を言える。
- 汎用 vs 専用の使い分けを 2 シナリオで言える。

## まとめ（3行）

- zkEVM プローバは Revm を RISC-V にコンパイル → zkVM 内で実行 → 証明出力。ホスト preflight が witness 収集、guest が Revm + commitment、プローバ + 検証者コントラクトで完結。
- Revm が選ばれる 3 理由（モジュラー / 決定論的 / CPU で速い）= zkVM が罰する 3 性質（非決定性 / syscall / 巨大バイナリ）の逆。
- 汎用 zkVM（Risc0 / SP1）は柔軟性のためにプローバ速度を諦め、専用 zkEVM（Linea / Scroll）は速度のために柔軟性を諦める。
`,
                },
                {
                  title: 'レッスン10 — 本番での Reth フォーク運用',
                  slug: 'reth-fork-production-ja',
                  type: 'CONTENT',
                  sortOrder: 5,
                  duration: 18,
                  xpReward: 40,
                  content: `# レッスン10 — 本番での Reth フォーク運用

## 問い

午前 3 時、バリデータは 40 分前からブロックを生成していない。ダッシュボードには: ファイルディスクリプタ枯渇、MDBX ページキャッシュ圧迫、ピア数 2。**ユニットテストでは引っかからない、出荷した日にも見えない、3 ヶ月目にまとめてくる — どんな運用規律でこれを防ぐか？**

## 原理（最小モデル）

- **本番ビルドフラグ 4 つ.** \`target-cpu=native\` / \`codegen-units=1\` / \`jemalloc\` / \`asm-keccak\`。
- **systemd の上限が支配的.** \`LimitNOFILE=1048576\`（MDBX ページ + P2P 接続）+ \`LimitNPROC=infinity\`。
- **3 ストレージ規律.** DB / ログ別ボリューム + NVMe SSD のみ + 定期スナップショット + 成長監視。
- **絶対値ではなく変化率にアラート.** 同期遅延 / ピア数 / MDBX 空きページ / RSS / ブロック取り込み時間 / ExEx 追従遅延。
- **Diff テストが最強の安全網.** 同じブロックでバニラ Reth と継続的に diff → 1 ストレージスロットでも乖離はコンセンサスバグ。
- **App-chain トポロジ.** 3 データセンター + 4 バリデータ以上 + 各バリデータの前に sentry 2 つ + 別 archive node + 別 RPC フリート。
- **アップグレード = 高さガード + 段階配布.** ブロック高さで切り替え、上げていないバリデータは脱落（自業自得）。

## 具体例

再現可能リリースビルド:

\`\`\`bash
# 再現可能なリリースビルド
RUSTFLAGS="-C target-cpu=native -C codegen-units=1" \\
  cargo build --release --features jemalloc,asm-keccak

strip target/release/reth   # またはデバッグシンボルを切り離し
\`\`\`

systemd ユニット:

\`\`\`ini
[Service]
ExecStart=/usr/local/bin/reth node --chain custom --datadir /var/lib/reth
Restart=on-failure
LimitNOFILE=1048576
LimitNPROC=infinity
TasksMax=infinity
\`\`\`

監視メトリクス:

| メトリクス | アラート条件 |
| :--- | :--- |
| 同期遅延（head vs network） | N ブロック以上を N を超える時間 |
| ピア数 | < 5 |
| MDBX 空きページ | < 5% |
| プロセス RSS | 単調増加 |
| ブロック取り込み時間 | p99 が目標を超える |
| ExEx の追従遅延 | ExEx 依存 |

Diff テストハーネス（擬似）:

\`\`\`bash
# diff ハーネスの擬似コード
for block in mainnet[recent_1000]:
    s1 = reth_vanilla.execute(block)
    s2 = reth_fork.execute(block)
    if s1.stateRoot != s2.stateRoot:
        alert("divergence at block", block, s1, s2)
\`\`\`

App-chain 最低トポロジ:

- 3 データセンターに 4 バリデータ以上
- 各バリデータの前に sentry 2 つ
- 別 archive node（バリデータではない、解析クエリ用）
- 別 RPC フリート（レート制限 + CDN）

アップグレード手順:

1. アクティベーションのターゲットブロック高を発表
2. 設定フラグで off のまま新バイナリをバリデータに配布
3. アクティベーションブロックでコンセンサスルール切り替え — 高さチェックでガード
4. アップグレードしていないバリデータは脱落 — だからこそ高さガード + 告知

## 失敗例（誤解）

「\`cargo build --release\` で本番に出せる」— **間違い**。jemalloc なし / asm-keccak なし / \`target-cpu=native\` なしでは負荷下のテイルレイテンシが暴れる + keccak ホットパスが遅い + AVX2 / AVX512 が活用されない。1 週目は気づかない、4 週目で疑問、3 ヶ月目で oncall。

「ユニットテストが通れば diff テスト不要」— **間違い**。ユニットテスト = 設計者が想像した入力。本番 mainnet ブロックは想像を超える。**Diff テストはバニラ Reth と継続比較**、1 ストレージスロット乖離もコンセンサスバグ。

「バリデータと公開 RPC を同マシンで動かしてよい」— **間違い**。1 回の DDoS でチェーン停止。RPC は別フリート（レート制限 + CDN）+ バリデータの前に sentry。

> 🛑 **予測。** あなたのフォークをデフォルトの \`cargo build --release\` でリリース。1 週目、4 週目、3 ヶ月目に見える本番症状は？（答え: **1 週目** = 気づかない（軽負荷）、**4 週目** = p99 レイテンシが断片化で悪化、ユーザは「たまに遅い」と言うが本気の問題と認識されない、**3 ヶ月目** = jemalloc なしの断片化 + ファイルディスクリプタ枯渇 + 累積された symbol 情報なしのデバッグ困難 → 午前 3 時のページャ → 「動いていたものが急に動かない」「直近変更はない」「ログだけでは原因不明」。**ゆっくり忍び寄り、まとめてくる**。）

## ステップで組み立てる

### Step 1: 4 ビルドフラグを暗唱

| フラグ | 理由 |
| :--- | :--- |
| \`-C target-cpu=native\` | AVX2 / AVX512 活用 |
| \`codegen-units=1\` | ビルド時間と引き換えに最適化 |
| \`features = [jemalloc]\` | テイルレイテンシ安定 |
| \`features = [asm-keccak]\` | keccak ホットパスの手書きアセンブリ |

### Step 2: systemd ファイルディスクリプタ上限

\`LimitNOFILE=1048576\`。デフォルト 1024 や 8192 では数時間で枯渇 → MDBX が \`Too many open files\` → ノードがゾンビ化。

### Step 3: アラートは絶対値より変化率

「現在 1000 ピア」より「過去 1 時間で 50 ピア / 分減少」が意味ある。Prometheus + Grafana で rate / increase 関数。

### Step 4: Diff テスト規律

\`for block in mainnet[recent_1000]: assert reth_vanilla.execute(block).stateRoot == reth_fork.execute(block).stateRoot\`。乖離はフォークの 3 容疑: ① 自分の変更が直接他コードパスに影響、② 共有 utility（gas 計算、precompile）の改変、③ 状態管理の境界条件。

### Step 5: アップグレード規律

高さガード + 段階配布。上げていないバリデータは脱落、回復は再 sync。

## 答え合わせ

- **\`LimitNOFILE=8192\` での失敗シグネチャ**: 数時間後 \`Too many open files\` エラー → MDBX が新規ページオープン失敗 + P2P が新規接続拒否 → ピア数 0 へ + ブロック書き込み停止 → ノードがログ吐きながらゾンビ化、再起動でカウンタリセットで一時回復、根本原因不明。ログを grep して \`EMFILE\` を発見すれば一発、知らないと数時間。
- **diff テスト発見時の 3 容疑**: ① 自分の最近の変更が他コードパスに副作用、② 共有 utility（gas 計算、precompile、state root 計算）の改変、③ 状態管理の境界条件（reorg、empty block、過去 hardfork 境界）。**自分のコミット履歴を再読** が最初の手。
- **3 アップグレード未完バリデータが見る現実**: ブロック 1000 で 3 が新ルール、1 が旧ルール → ブロック 1001 で旧ルールバリデータは新ルールブロックを reject → 「自分から見ると」分岐 → quorum 不足で投票しなくなる → 残り 3 で多数決継続 → 旧バリデータは脱落（slashing 対象または inactivity ペナルティ）。回復は新バイナリに上げて DB を再 sync。

## 合格基準

- 4 本番ビルドフラグを暗唱できる。
- systemd 上限の意味と \`LimitNOFILE\` 値を即答できる。
- 6 監視メトリクスを変化率視点で言える。
- Diff テスト規律を「乖離 = 3 容疑」で説明できる。
- アップグレード手順を高さガード + 段階配布で言える。

## まとめ（3行）

- 本番ビルド = 4 フラグ（\`target-cpu=native\` + \`codegen-units=1\` + \`jemalloc\` + \`asm-keccak\`）+ systemd 上限調整（\`LimitNOFILE=1048576\`）。
- 監視は絶対値より変化率、6 メトリクス（同期遅延 / ピア数 / MDBX 空き / RSS / 取り込み時間 / ExEx 追従）にアラート。
- Diff テスト（バニラ Reth と継続比較、1 スロット乖離もコンセンサスバグ）がフォーク最強の安全網 — 加えて App-chain は 3 DC + sentry + 別 RPC フリートのトポロジ + 高さガードアップグレード。
`,
                },
                {
                  title: 'レッスン11 — Differential fuzzing と execution-spec-tests',
                  slug: 'expert-differential-fuzzing-ja',
                  type: 'CONTENT',
                  sortOrder: 6,
                  duration: 26,
                  xpReward: 60,
                  content: `# レッスン11 — Differential fuzzing と execution-spec-tests

## 問い

フォークを ship した。カスタム precompile、独自 payload builder、いじったガススケジュール。ユニットテストは通っている、バニラ Reth diff テストも通る。**だが、誰もテストを書かなかったパスに潜むバグはどう見つけるか？**

## 原理（最小モデル）

- **2 方向の自動圧力.** EEST（execution-spec-tests）が **仕様に対する準拠** を構造的に保証 + Differential fuzzing が **誰も探さなかったバグ** を浮かび上がらせる。
- **EEST はフォーク CI の毎 push.** 昨日からの fail デルタが非ゼロなら build break。Triage: 意図的（document）/ 非意図的（バグ）。
- **Differential fuzz 4 リファレンス.** vanilla Revm（Revm セマンティクス）/ Geth \`debug_traceTransaction\`（mainnet コンセンサス）/ Erigon（系譜逸脱検知）/ 形式仕様（Python EELS）。
- **24-48 時間走らせる + 縮約.** Foundry スタイルの shrinking で 50-200 byte の最小再現に → 人間が repro を読んで根本原因特定。
- **両規律は補完であり代替ではない.** EEST = 仕様明示範囲、fuzz = 仕様未定義パス含む。両方が production L1 チーム（Hyperliquid / Tempo / Berachain）の標準。
- **Fault injection（chaos の前駆体）.** 入力ではなく **環境**（DB read 失敗、ネットワーク分断、部分書き込み、OOM）を fuzz → 「書き込み中 crash でチェーン壊れる」クラス。

## 具体例

EEST を自分のフォークに走らせる:

\`\`\`bash
# spec-tests フレームワークを clone
git clone https://github.com/ethereum/execution-spec-tests
cd execution-spec-tests
uv sync

# フォークの spec-test runner バイナリをビルド（各フォークが自前同梱; revm は \`revme\`）
cargo build --release -p revme

# スイートをバイナリに対して実行
uv run consume direct \\
  --bin /path/to/your/fork/target/release/revme \\
  -- ./tests/cancun/      # または任意のサブセット
\`\`\`

Differential fuzz パターン:

\`\`\`
ランダム tx → [自前フォーク] → state_root_A
                       ↓
              [リファレンス実装] → state_root_B

assert(state_root_A == state_root_B)
\`\`\`

Fuzz harness 例:

\`\`\`rust
// tests/differential_fuzz.rs
use libafl::prelude::*;       // または proptest、arbitrary、独自 harness

fn fuzz_target(input: &[u8]) -> Result<()> {
    let tx = arbitrary_tx_from_bytes(input)?;
    let pre = arbitrary_pre_state_from_bytes(input)?;

    let your_root = your_fork_execute(pre.clone(), tx.clone())?.state_root;
    let ref_root  = reference_execute(pre, tx)?.state_root;

    if your_root != ref_root {
        return Err(format!("DIFFERENTIAL: your={your_root}, ref={ref_root}").into());
    }
    Ok(())
}
\`\`\`

3 ツール役割表:

| ツール | 捕まえる | 捕まえない |
| :--- | :--- | :--- |
| EEST | 仕様が明示的カバーするケースの回帰 | 仕様未定義挙動のバグ、フォーク固有エッジケース |
| Differential fuzzing | リファレンスからの乖離（仕様未定義パス含む） | リファレンスとフォーク両方間違っている仕様違反 |
| 両方併用 | コンセンサスクリティカルバグの広範囲 | 仕様黙 + リファレンスなし + fuzzer 未到達の稀バグ |

## 失敗例（誤解）

「EEST が通れば fuzz 不要」— **間違い**。EEST は仕様明示範囲だけ。仕様が黙っているパス（カスタム precompile の境界条件、新 opcode 組み合わせ）は fuzz が浮かび上がらせる。

「Differential fuzz は vanilla Revm に対してだけ」— **不十分**。Revm vs Geth の対比で Revm 系全体のバグ（系譜共有バグ）を炙れる。Erigon や EELS（Python 仕様）との対比で更に層を厚く。

「fuzz 24 時間で出ないなら問題なし」— **間違い**。Fuzzer の入力空間カバレッジ依存。crash 0 = バグなしではない。**フォーク誕生から半年が hit 率最高期** = この期間は重点的に。

> 🛑 **予測。** vanilla Revm は何年も fuzz されている、なぜフォークで fuzz が特に有用？（答え: バニラ EVM のバグはほぼ新機能の未テスト組み合わせに残る。あなたのフォークは **新機能そのもの** → fuzz hit 率が最も高い時期。同じ予算でも、vanilla を 1 ヶ月 fuzz する vs フォーク半年目を 1 週間 fuzz する → 後者の発見密度が桁違いに高い。）

## ステップで組み立てる

### Step 1: EEST を 1 回走らせる

\`uv run consume direct --bin revme -- ./tests/cancun/\` → pass/fail/skip 数 → 昨日との delta → 非ゼロは build break。

### Step 2: 簡単な fuzz harness を書く

\`proptest\` か \`libafl\` で「ランダム tx + pre-state → 両実装で実行 → state_root assert」の 50 行。1 時間走らせて乖離をログ。

### Step 3: 4 リファレンスから選ぶ

- vanilla Revm: Revm 系譜のバグ検知
- Geth: mainnet コンセンサス検知
- Erigon: 系譜逸脱検知
- 形式仕様（Python EELS）: 仕様直接対比

### Step 4: 縮約規律

shrinking で 50-200 byte の最小 repro に → 人間が読んで根本原因特定。**24-48 時間 fuzz + shrink + 人間 triage** が標準。

### Step 5: フォーク CI マトリクス

毎 push: EEST サブセット（5 分以内）+ 短い fuzz（5 分）+ diff against vanilla Reth（1000 ブロック）。週次: 24h fuzz + 全 EEST + マルチリファレンス diff。

### Step 6: Fault injection で chaos の前段

入力ではなく環境 fuzz: \`kill -9\` 実行中プロセス、MDBX random page 破壊、ネットワーク分断、OOM 状況。Reth 自身の CI はここまでやらない、production フォークチームが追加。

## 答え合わせ

- **EEST と fuzz の冗長性ではない理由**: EEST は仕様に対してチェック、fuzz は別実装に対してチェック — 仕様が制約しないパスも含めて。仕様が「opcode X の入力 A での挙動は未定義」だと EEST はテストを書けない。fuzz は無作為に A を生成して別実装と比較する → 仕様未定義領域で乖離があれば検知。
- **fuzz hit 率が「フォーク誕生から半年」で最高な理由**: 新機能は未テスト組み合わせの空間が広い + 設計者の頭の中だけのテスト依存 → 想像外の入力で破綻する。時間が経つほどユーザが trigger する → 公開バグになる → 残りは fuzz が掘る相手が少なくなる。
- **Fault injection が fuzzing と区別される領域**: fuzzing = 入力空間探索（「どの tx で壊れるか」）、fault injection = 環境探索（「どの障害で安全性プロパティが破られるか」）。「書き込み中に crash してチェーンが壊れた」クラスは fuzzing には現れない（入力は正常）+ 環境が異常。

## 合格基準

- EEST と differential fuzzing が補完である理由を 1 文で言える。
- 4 リファレンス実装の選び分けを言える。
- 簡単な fuzz harness（\`proptest\` で 50 行）を書ける。
- フォーク CI マトリクス（毎 push / 週次）を設計できる。
- Fault injection が fuzz と違う領域を捕まえる理由を言える。

## まとめ（3行）

- EEST（仕様準拠）+ Differential fuzzing（リファレンス対比）が production フォークの正しさ保証 2 本柱、両方が毎 CI 必須。
- Fuzz は 24-48h 走らせて shrink、フォーク誕生から半年が hit 率最高、4 リファレンスで層を厚く。
- Fault injection（環境 fuzz）が chaos engineering の前段、「正常入力 + 環境異常」クラスのバグを捕まえる。
`,
                },
                {
                  title: 'レッスン12 — EVM プライバシー（Tempo Zones を読む）',
                  slug: 'evm-privacy-tempo-zones-ja',
                  type: 'CONTENT',
                  sortOrder: 7,
                  duration: 28,
                  xpReward: 60,
                  content: `# レッスン12 — EVM プライバシー（Tempo Zones を読む）

## 問い

「EVM プライバシー」は crypto が最も語り、エンジニアが最も出荷しないテーマ。多くのチュートリアルは shielded pool が *なにか* を説明する。**production 水準の設計のひとつ — Tempo Zones — の Rust ソースを読み、将来の任意の EVM プライバシースタックを読むためのフレームワークは何か？**

## 原理（最小モデル）

- **3 ダイヤルのトレードオフ空間.** 信頼モデル（trustless ↔ オペレータ信頼）/ 暗号プリミティブ（古典暗号 ↔ 完全 ZK）/ DX 面（カスタム DSL ↔ 標準 EVM）。
- **Tempo の賭け.** シーケンサ信頼 + 古典暗号（Chaum-Pedersen + AES-GCM）+ 標準 EVM。**機関投資家は暗号トラストレス性より、コンプライアンス + 低運用コスト + 標準ツーリング** を必要とする。
- **Privacy protects against public observers on Tempo, not against the sequencer.** スタック全体で最も重要な設計選択。
- **Chaum-Pedersen prover アドレスは \`0x1C00...0100\`、~6,000 ガス.** ECDH 共有秘密の正しい導出を証明（シーケンサ秘密鍵を明かさず）。Groth16（~150,000 ガス + trusted setup）の 25× 安。**専用プリミティブ > 汎用 ZK** when 主張が単純。
- **AES-GCM precompile は速度が劇的に違う箇所のみ.** HKDF は SHA256 precompile（\`0x02\`）+ Solidity で実装、AES は EVM bytecode だと 100× 遅い → precompile 化。**プリコンパイル面を最小化**。
- **\`IVerifier\` インタフェースで証明系に依存しない settlement.** ZKVM / TEE バックエンド差し替え可能。speed-of-change の異なる層を結合させない。
- **EVM レベル（RPC レベルではなく）でプライバシー実施.** \`balanceOf\` revert / 固定 100k ガス transfer（タイミングサイドチャネル閉鎖）/ \`CREATE\` 無効化。
- **コンプライアンス継承（TIP-403）.** Zone は Tempo のレジストリから ポリシーを読む → 発行者は Tempo 上で 1 回凍結 → 全 zone が次の \`advanceTempo\` で継承。

## 具体例

3 設計の角:

| 設計 | 信頼 | 暗号 | DX |
| :--- | :--- | :--- | :--- |
| Aztec L2 | trustless | 完全 ZK (UltraHonk) | カスタム DSL (Noir) |
| Railgun | trustless | EVM 上の SNARKs | 標準コントラクト (shielded ERC-20 のみ) |
| **Tempo Zones** | **シーケンサ信頼** | 古典暗号 (Chaum-Pedersen + AES-GCM) + 差し替え可能な証明 | 標準 EVM 実行 |

Chaum-Pedersen precompile（[\`tempoxyz/zones\`](https://github.com/tempoxyz/zones) の \`crates/precompiles/src/chaum_pedersen.rs\`）:

\`\`\`rust
//! Chaum-Pedersen DLOG equality proof verification precompile.
//!
//! Registered at [\`CHAUM_PEDERSEN_VERIFY_ADDRESS\`] (\`0x1C00...0100\`).
//!
//! Verifies that the sequencer correctly derived the ECDH shared secret
//! from the depositor's ephemeral public key, without revealing the
//! sequencer's private key to the EVM.
//!
//! Uses the NCC-audited [\`k256\`] crate (v0.13.4) for secp256k1 operations.

pub const CHAUM_PEDERSEN_VERIFY_ADDRESS: Address =
    address!("0x1C00000000000000000000000000000000000100");

const CP_VERIFY_GAS: u64 = 6_000;

pub struct ChaumPedersenVerify;

impl Precompile for ChaumPedersenVerify {
    fn precompile_id(&self) -> &PrecompileId { &CP_PRECOMPILE_ID }
    fn call(&self, input: PrecompileInput<'_>) -> PrecompileResult {
        // verifyProof セレクタをデコードし、検証し、bool を返す
    }
}
\`\`\`

AES-GCM precompile signature:

\`\`\`solidity
function decrypt(
    bytes32 key,
    bytes12 nonce,
    bytes calldata ciphertext,
    bytes calldata aad,
    bytes16 tag
) external view returns (bytes memory plaintext, bool valid);
\`\`\`

IVerifier:

\`\`\`solidity
interface IVerifier {
    function verify(
        uint64 tempoBlockNumber,
        uint64 anchorBlockNumber,
        bytes32 anchorBlockHash,
        uint64 expectedWithdrawalBatchIndex,
        address sequencer,
        BlockTransition calldata blockTransition,
        DepositQueueTransition calldata depositQueueTransition,
        bytes32 withdrawalQueueHash,
        bytes calldata verifierConfig,
        bytes calldata proof
    ) external view returns (bool);
}
\`\`\`

Zone node の依存（\`crates/tempo-zone/Cargo.toml\`）:

\`\`\`toml
[package]
name = "zone"
description = "Tempo Zone node - a lightweight L2 node built on reth"

# reth
reth-basic-payload-builder.workspace = true
reth-chainspec.workspace = true
reth-evm.workspace = true
reth-node-api.workspace = true
reth-node-builder.workspace = true
reth-payload-builder.workspace = true
reth-revm.workspace = true
reth-rpc.workspace = true
reth-rpc-builder.workspace = true
reth-storage-api.workspace = true
reth-tasks.workspace = true
reth-transaction-pool.workspace = true
\`\`\`

\`no_std\` 宣言（\`crates/precompiles/src/lib.rs\`）:

\`\`\`rust
//! This crate is \`no_std\` compatible so these precompiles can run inside the
//! SP1 prover guest (RISC-V) as well as in the zone node.
\`\`\`

## 失敗例（誤解）

「プライバシーは完全 ZK でなければ無意味」— **間違い**。機関投資家の用途では「public observers から隠す」「シーケンサにはコンプライアンス目的で見せる」が合理。Tempo の賭けは market 問題、設計は一貫。

「Chaum-Pedersen は時代遅れ」— **間違い**。1992 年プロトコルだが「DLOG 等価性」という特定主張だけを証明する道具として最適。汎用 ZK（Groth16）の 25× 安 + trusted setup なし + メンテすべき証明系なし。**退屈な暗号 = 監査可能な暗号**。

「\`balanceOf\` revert は RPC で十分」— **間違い**。EVM レベル実施でないと \`eth_call\` シミュレーション + prover 再実行を含むすべてのコードパスで強制されない → 漏れる。

> 🛑 **予測。** AES-GCM はプリコンパイル化したのに HKDF はしない、なぜ？（答え: HKDF は HMAC-SHA256 反復、SHA256 は既に EVM の \`0x02\` precompile に存在 → Solidity で \`0x02\` を呼ぶ実装で十分速い + 専用 precompile とほぼ変わらない。AES は EVM bytecode だと 100× 遅い → precompile 必須。**プリコンパイル面を最小化** = 本当に高コストなものだけ。Yellow Paper の precompile 集合（BN254 / BLS / modexp / ecrecover / identity / sha256 / ripemd160）と同じ規律。）

## ステップで組み立てる

### Step 1: 3 ダイヤルを即答

信頼 / 暗号 / DX。各設計（Aztec / Railgun / Tempo Zones）が空間の異なる角を占める。

### Step 2: Tempo の信頼宣言を 1 文で

「Privacy protects against public observers on Tempo, not against the sequencer」。

### Step 3: 2 precompile の役割分担

Chaum-Pedersen \`0x1C00...0100\` = ECDH 共有秘密導出証明 / AES-GCM \`0x1C00...0101\` = 対称復号。HKDF は Solidity + \`0x02\` で十分。

### Step 4: \`IVerifier\` の意味

State transition function = pure \`no_std\` Rust function（\`prove_zone_batch(witness) -> BatchOutput\`）+ Tempo 側 verifier は interface → ZKVM（Risc0 / SP1 / Jolt）/ TEE（SGX / SEV-SNP / Nitro）どれでも差し替え可能。

### Step 5: 暗号化デポジット 9 ステップ

Tempo 側: ① ECDH + ② HKDF + ③ AES-GCM 暗号化 + ④ portal \`depositEncrypted\` → Zone 側: ⑤ シーケンサが Chaum-Pedersen 証明生成 + ⑥ precompile で検証 + ⑦ HKDF + ⑧ AES-GCM 復号 + ⑨ \`TIP20.mint\`。

### Step 6: EVM レベルプライバシー 3 修正

- \`balanceOf\` revert（所有者 + sequencer 以外）
- transfer 固定 100k ガス（タイミングサイドチャネル閉鎖）
- \`CREATE\` 無効化（predeploy のみ）

### Step 7: TIP-403 継承

Zone が Tempo のレジストリプロキシをデプロイ → \`isAuthorized\` を \`TempoState.readTempoStorageSlot\` 経由で Tempo から読む → 発行者は Tempo に 1 回凍結 → 全 zone が次 \`advanceTempo\` で継承。

## 答え合わせ

- **Chaum-Pedersen が必要な理由（シーケンサ信用しない）**: 証明なしだとシーケンサが任意の共有秘密を提示できる → 暗号文を別の受取人に復号する偽 secret を主張 → 誰も検出不能 → 資金リダイレクト可能。証明は秘密をシーケンサ公開鍵に暗号的に結合 → すり替え検出可能。**シーケンサは liveness + DA に信頼されるが、資金リダイレクトには信頼されない** — 異なる懸念に異なる信頼仮定。
- **無効暗号文の扱い**: Chaum-Pedersen 通過（シーケンサ正しく導出）+ GCM タグ失敗 → bounceback。**証明が「シーケンサが嘘」と「ユーザが無効暗号文」を区別** — 観察者には同じに見えるが対応が違う。
- **\`IVerifier\` の柔軟性**: portal 層に SP1 / Groth16 を焼き込むと SOTA 移行のたびに portal 再デプロイ → 中断。Interface 化 → 証明バックエンドを差し替え可能（ZKVM SOTA は 12-18 ヶ月でシフト + TEE もコンプライアンス文脈で有効）→ portal 不変。**速く動く層（証明）を遅く動く層（settlement）から切り離す**、Revm の Database trait と同じ規律。

## 合格基準

- 3 ダイヤルを即答できる。
- Tempo の信頼宣言を引用できる。
- 2 precompile の役割と「プリコンパイル面最小化」の理由を言える。
- \`IVerifier\` インタフェース化の意味を言える。
- EVM レベル 3 修正と TIP-403 継承の仕組みを言える。

## まとめ（3行）

- 3 ダイヤル（信頼 / 暗号 / DX）が EVM プライバシー設計空間、Tempo Zones は「シーケンサ信頼 + 古典暗号 + 標準 EVM」の角（機関投資家賭け）。
- Chaum-Pedersen + AES-GCM の特定プリミティブ precompile（25× 安 vs Groth16）+ \`IVerifier\` で証明系差し替え可能 + EVM レベルプライバシー実施。
- TIP-403 コンプライアンス継承（Tempo に 1 回書き、全 zone が次 advanceTempo で読む）が「プライバシー + コンプライアンス」を機関投資家にとって一貫したプロダクトに。
`,
                },
                {
                  title: 'レッスン13 — Chaos engineering を Rust EVM ノードに',
                  slug: 'chaos-engineering-rust-evm-ja',
                  type: 'CONTENT',
                  sortOrder: 8,
                  duration: 28,
                  xpReward: 60,
                  content: `# レッスン13 — Chaos engineering を Rust EVM ノードに

## 問い

カスタム Reth フォークを出荷しているチームの大半は upstream のテストスイートを回して終わる。それは間違い。upstream のテストはハッピーパス（全ピア正直 / 全ディスク健全 / 全クロック正確）の正しさ。**敵対的条件（DoS / 破損ページ / ずれたクロック / 嘘をつくピア）で生き残ることは別物 — どう検証するか？**

## 原理（最小モデル）

- **Differential fuzzing + Chaos は補完.** Fuzz = 「有効入力で正しい答えか」、Chaos = 「乱れた条件下で正しい答えが返らなくなるか」。両方必要。
- **4 chaos カテゴリ.** Network（パケット損失 / 分断）+ Disk（MDBX 破損 / write 失敗）+ Time（クロックずれ）+ Byzantine（嘘をつくピア）。各カテゴリにツール + 失敗シグネチャ + 対応パターン。
- **Network = \`tc\` / Toxiproxy / Pumba.** Linux カーネルレベル / アプリレベルプロキシ / Docker ラッパ。
- **Disk = chaosfs / カーネル fault injection.** FUSE で破損バイトを返す + \`fail_io_timeout\` で syscall 失敗注入。
- **Time = libfaketime.** \`LD_PRELOAD\` でクロックずれ注入。単調クロック逆行は VM pause / resume が必要。
- **Byzantine = カスタム Reth フォーク.** 意図的に間違った state root を提案するペイロードビルダー。\`tc\` や \`chaosfs\` では注入不可。
- **3 実践レベル.** CI 内 chaos（毎 PR）+ Game day（四半期）+ Production chaos（週次、Netflix 風）。
- **信頼性トライアングル.** Fuzzing（正しさ）+ Chaos（耐性）+ Auditing（潜在的バグ）= 3 つそろって production-grade。

## 具体例

4 chaos カテゴリ表:

| カテゴリ | 何を注入 | 現実世界の等価 |
| :--- | :--- | :--- |
| Network chaos | パケット損失、レイテンシ、分断、ピア排除 | クラウドリージョン障害、BGP、DDoS |
| Disk chaos | MDBX ページ破損、write 失敗、レイテンシ | 故障 SSD、ビット腐敗、FS バグ |
| Time chaos | クロックずれ、NTP ドリフト、単調逆行 | クロックドリフト、閏秒、VM 仮想化 |
| Byzantine chaos | 敵対ピアが無効ブロック / 矛盾投票 / 嘘 | 悪意バリデータ、鍵漏洩、MitM |

Network chaos:

\`\`\`bash
# tc で 30% パケット損失
tc qdisc add dev eth0 root netem loss 30%

# 200ms レイテンシ
tc qdisc add dev eth0 root netem delay 200ms

# Docker コンテナ向け（Pumba）
pumba netem --duration 5m loss --percent 30 my-reth-validator
\`\`\`

Disk chaos:

\`\`\`bash
# MDBX データディレクトリに chaosfs をマウント
chaosfs --backend ./reth-data --mount ./reth-mdbx --corrupt-rate 0.001

# カーネル fault injection
echo 1 > /sys/kernel/debug/fail_io_timeout/probability
echo 100 > /sys/kernel/debug/fail_io_timeout/interval
\`\`\`

Time chaos:

\`\`\`bash
LD_PRELOAD=/usr/lib/x86_64-linux-gnu/libfaketime.so.1 FAKETIME=+30s reth node
\`\`\`

Byzantine chaos（カスタム Reth フォーク）:

\`\`\`rust
// byzantine-reth フォークで: 標準のペイロードビルダーを、
// state root の 1 bit を反転させたブロックを提案するものに差し替える。
impl PayloadBuilder for ByzantinePayloadBuilder {
    fn build(&self, attrs: PayloadAttributes) -> ExecutionPayload {
        let mut block = self.honest.build(attrs);
        block.state_root ^= 1; // 1 bit 反転
        block
    }
}
\`\`\`

3 実践レベル:

- **CI 内 Chaos**: chaos サブセット毎 PR、4 ノードテストネットで network loss + clock skew + disk fault、毎 commit
- **Game day**: 四半期半日、チームが手動 realistic 失敗を staging chain に注入、バグ + runbook ギャップを発見
- **Production chaos**: Netflix 風週 1、コントロールウィンドウで本番バリデータ意図的 1 台落とす。最も規律ある（Tempo / OP / Hyperliquid）チームが実行。

## 失敗例（誤解）

「\`tc\` で Byzantine も注入できる」— **間違い**。\`tc\` はネットワーク層、Byzantine ピアはアプリケーション層（実 Reth コードを動かして能動的に誤動作）。**カスタム Reth フォーク** が必要。

「サイレントなディスク破損は気づける」— **間違い**。サイレント = MDBX のチェックサムが捕まえない種類の破損（1 ビット反転で意味的に valid だが間違った値）→ ノードが間違った state を serve → 他ノードと分岐 → フォーク。**「サイレント」 = レッスン1にとって最悪の失敗モード**。

「Production chaos は危険、staging で十分」— **半分間違い**。Production には staging で再現できない条件（実トラフィック / 実クライアント / 実ハードウェア）がある。**規律あるチームは production も chaos する**、ただし on-call が revert 準備済み + コントロールウィンドウ。

> 🛑 **予測。** 4 バリデータ BFT テストネット、1 バリデータに 80% パケット損失を 30 秒注入。**起きるべき** 3 つと **起きるべきでない** 1 つ？（答え: **起きるべき**: ① 残り 3 ノード quorum がブロック生成継続（BFT safety: f=1 に対して 3 of 4 ≥ 2f+1）、② 落ちたバリデータが復旧時に手動介入なしでキャッチアップ、③ 落ちたバリデータが inactivity でスラッシュ（policy 次第）。**起きるべきでない**: チェーン停止（safety 維持されているのに liveness が止まる = BFT バグ）。）

## ステップで組み立てる

### Step 1: 4 chaos カテゴリを即答

Network / Disk / Time / Byzantine。各カテゴリのツール 1-2 つ言える。

### Step 2: \`tc\` で network chaos を 1 回実行

\`tc qdisc add dev eth0 root netem loss 30%\` → 4 バリデータテストネットで観察。

### Step 3: chaosfs で disk chaos

FUSE でマウント → MDBX が破損バイトを返したとき Reth が検出するか + 優雅に停止するかサイレント不正 state serve か。

### Step 4: libfaketime で time chaos

\`LD_PRELOAD\` で 30s 進める → 「未来の」ブロック提案 → ネットワークが reject + スラッシュ。

### Step 5: Byzantine フォークで意図 1 bit 反転

\`PayloadBuilder\` を override → state root XOR 1 → 正直ノードが 1 スロット以内に reject すべき。

### Step 6: 3 実践レベルに進化

CI 内 → Game day → Production。**最後は文化、ツールではない**。

### Step 7: 信頼性トライアングルを完成

Fuzz（正しさ）+ Chaos（耐性）+ Auditing（潜在的）= production-grade。1 つ ship なし = 既知の壊れたコード ship。

## 答え合わせ

- **Byzantine chaos がカスタムフォーク必要な理由**: Byzantine ピアは Reth コードを動かして能動的誤動作（state root 1 bit 反転 / 矛盾投票 / 嘘な state）。\`tc\`（ネットワーク層）/ chaosfs（ファイル層）では「アプリが嘘をつく」を表現不能。コードレベルの override が必須。
- **「サイレント破損」のカスケード**: ① MDBX が間違った値を返す（チェックサムも一致してしまう種類）→ ② Reth が間違った state を計算 + serve → ③ stateRoot 検証が他ノードと一致しない → ④ ピアから「あなたのブロックは無効」とアナウンス → ⑤ ノードが分岐したフォークに居る → ⑥ 復旧は手動診断 + DB 再 sync。**fork は 1 ノードから始まる**。
- **\`libfaketime\` でできないこと**: 単調クロック逆行（Rust の \`Instant\` は単調保証 + プロセスがサスペンド/resume したり VM がマイグレートすると見える）→ \`LD_PRELOAD\` は実時計は嘘つけるが \`Instant\` は嘘つけない。カーネル時間ストレッチ or VM pause/resume が必要。

## 合格基準

- 4 chaos カテゴリを即答できる。
- 各カテゴリのツール 1-2 を言える。
- Byzantine chaos がカスタムフォーク必要な理由を説明できる。
- 「サイレント破損」のカスケードを 4 ステップで辿れる。
- 信頼性トライアングルの 3 柱を即答できる。

## まとめ（3行）

- Chaos engineering = 4 カテゴリ（Network / Disk / Time / Byzantine）の失敗注入、ハッピーパステストでは見えない耐性を検証。
- Network = \`tc\` / Toxiproxy、Disk = chaosfs、Time = libfaketime、Byzantine = カスタム Reth フォーク（コードレベル override 必須）。
- 信頼性トライアングル（Fuzz + Chaos + Auditing）= production-grade、3 実践レベル（CI / Game day / Production）で文化として実装。
`,
                },
                {
                  title: 'レッスン14 — Systems-code auditing',
                  slug: 'systems-code-auditing-ja',
                  type: 'CONTENT',
                  sortOrder: 9,
                  duration: 28,
                  xpReward: 60,
                  content: `# レッスン14 — Systems-code auditing

## 問い

Differential fuzz harness と chaos drill を ship した。コードは両方に通る。**これで完了か？** いや — 両規律はコードを *走らせる* ことで exercise する。Audit は走らせるだけでは表面化しないものを捕まえる — まだ exercise されていないコードパス、今日は動くが将来の修正で壊れる不変量、validate されない trust 仮定。**読むことは独立した規律**。

## 原理（最小モデル）

- **Solidity audit と systems-code audit は別仕事.** Solidity = 整数オーバーフロー / reentrancy / アクセス制御 / oracle 操作。Systems = レース条件 / 状態破損 / コンセンサス不変量違反 / \`unsafe\` 正しさ / 信頼境界漏れ。
- **5 systems バグクラス.** ① 状態破損ウィンドウ（部分更新 + 中断）+ ② 並行性バグ（論理競合、loom + miri）+ ③ コンセンサス不変量違反（vote dedup / モノトニック time / 2f+1 厳密チェック）+ ④ \`unsafe\` ブロック正しさ（不変量 + 違反条件 + 検証）+ ⑤ 信頼境界漏れ（RPC / P2P / CLI / Engine API）。
- **\`execute\` ↔ \`unwind\` の対称性.** Reth ステージは「\`execute\` の state 変更を \`unwind\` が完全に undo」が不変量。非対称があれば破損ウィンドウ。
- **すべての \`unsafe\` に 3 問.** どの不変量に依拠? どの条件で違反? どう verify?（テスト / 型 / コメント証明）。「分からない」なら finding。
- **4 信頼境界.** RPC（認証 + レートリミット + ペイロード検証）+ P2P（state root 検証 + tx 署名 + trie ノード）+ CLI / config（chainspec 内部一貫性）+ Engine API（hardfork rule）。
- **ツールは reviewer を増幅、置き換えない.** \`cargo audit\` / \`cargo geiger\` / \`kani\` / \`loom\` / \`miri\` / \`cargo clippy\`。
- **信頼性トライアングルを完成.** Fuzz（正しさ）+ Chaos（耐性）+ Auditing（潜在的）。

## 具体例

5 バグクラスのチェックリスト:

| バグクラス | 探す共通パターン |
| :--- | :--- |
| 状態破損ウィンドウ | tx ラッパなし複数ステップ書き込み / 「保存 → return」失敗パス / 索引と本体の非同期更新 |
| 並行性バグ | await 越し \`Arc<Mutex<T>>\` / 共有 \`Arc<AtomicU64>\` の read-then-write / channel 順序前提 / \`spawn\` の古い snapshot キャプチャ |
| コンセンサス不変量違反 | \`(validator, slot)\` 重複排除なし vote / 単調 timestamp 前提 fork-choice / 2f+1 緩いチェック / slashing-evidence の bandit 検証 |
| \`unsafe\` 正しさ | 不変量 + 違反条件 + 検証手段の 3 問 |
| 信頼境界漏れ | RPC 特権メソッド認証 / P2P state 検証 / chainspec 一貫性 / Engine API hardfork rule |

ツール表:

| ツール | 何をするか | いつ使うか |
| :--- | :--- | :--- |
| \`cargo audit\` | 依存の既知 CVE チェック | 全 CI で走らせる、ベースライン衛生 |
| \`cargo geiger\` | \`unsafe\` ブロック数カウント | スコーピング: どのクレートが最も review 必要か |
| \`kani\` | Rust 用モデルチェッカ | 小さな \`unsafe\` ブロックや critical な関数 |
| \`loom\` | 並行性順列テスト | \`Arc<Mutex<T>>\` 多用パス、レース条件決定論的検知 |
| \`miri\` | 実行時 UB 検出 | テストサブセットを \`miri\` 下で走らせ \`unsafe\` 内 UB 検出 |
| \`cargo clippy\` | Lint ベースバグ探し | ベースライン、よくあるミス |
| 手動 review チェックリスト | 5 バグクラスを体系的適用 | 常に |

Audit レポート構造（Sigma Prime / Trail of Bits / OpenZeppelin 共通）:

各 finding:
- Severity（Critical / High / Medium / Low / Informational）
- Title（1 行サマリー）
- Location（ファイル + 行番号）
- Description（2-3 文）
- Exploit / consequence
- Recommendation
- Status（Open / Acknowledged / Fixed）

レポート全体: Executive summary（1 ページ）+ Methodology + Findings + Out-of-scope。

信頼性トライアングル振り返り:

| 規律 | 捕まえる | 見逃す |
| :--- | :--- | :--- |
| Differential fuzzing | 有効入力で間違った答え | 失敗モード、潜在的設計バグ |
| Chaos engineering | 乱れた条件下で正しい答えが返らない | 注入されなかったコードパスのバグ、潜在的 |
| Systems-code auditing | まだ exercise されていないコードパスの潜在的設計バグ | ランタイム trigger が必要な特定バグ、unknown unknown |

## 失敗例（誤解）

「Solidity audit 経験で systems-code も audit できる」— **間違い**。バグクラスが違う。Solidity = ロジック層（reentrancy）/ Systems = システム層（レース条件、unsafe、信頼境界）。別の思考モデル + ツール。

「\`cargo geiger\` で \`unsafe\` 数を 0 に減らすのが audit」— **間違い**。Audit は数を減らすことではなく **各 \`unsafe\` が明確な + ドキュメント化された不変量を持つこと**。\`unsafe\` 自体は valid な道具、暗黙の仮定が問題。

「Audit はリリース前の独立 review session」— **半分間違い**。Independent audit も必要だが、**consensus に影響する全 PR を正しい問いを持って読む** ことが日々の auditing。PR review に audit マインドセットを織り込まないと event 駆動になり遅れる。

> 🛑 **予測。** Reth の \`execute\` ↔ \`unwind\` 対称性が示唆する audit の問いは？（答え: **\`execute\` が行う state 変更で、\`unwind\` が undo しないものはないか？** あれば破損ウィンドウ。具体的に: ① \`execute\` が書き込むテーブルすべてを列挙、② \`unwind\` がそれぞれを reverse する処理を持つか確認、③ index / cache / 派生データも含めて完全か。**1 つでも非対称があれば finding**。）

## ステップで組み立てる

### Step 1: 5 バグクラスを即答

状態破損 / 並行性 / コンセンサス不変量 / \`unsafe\` / 信頼境界。

### Step 2: \`execute\` ↔ \`unwind\` audit

Reth ステージで両方を読み、state 変更の完全対称性を確認。非対称 = finding。

### Step 3: 全 \`unsafe\` に 3 問

不変量 / 違反条件 / 検証手段。1 つでも「分からない」= finding。

### Step 4: 4 信頼境界をマップ

RPC / P2P / CLI / Engine API。各境界で「何が検証され、何が黙って信頼されているか」を問う。

### Step 5: ツールを正しく使う

\`cargo geiger\` でスコーピング → \`loom\` で並行性 → \`miri\` で UB → \`kani\` で critical \`unsafe\` → \`clippy\` で lint。チェックリストが基盤。

### Step 6: コンセンサス実装の不変量 audit

プロトコル不変量（HotStuff の「正しいレプリカは同じ高さで矛盾するブロックに vote しない」）をリスト → 各不変量について影響コードパス追跡 → state 永続化 / 原子性確認。

### Step 7: 信頼性トライアングルを完成

Fuzz + Chaos + Auditing。1 つ ship なし = 既知ギャップ ship。

## 答え合わせ

- **Solidity audit vs systems-code audit のバグクラス差**: Solidity = 整数オーバーフロー / reentrancy / アクセス制御 / oracle 操作（言語 + コントラクト層）vs Systems = レース条件 / 状態破損ウィンドウ / コンセンサス不変量 / \`unsafe\` / 信頼境界（ランタイム + 並行性 + 物理層）。**別仕事、別ツール、別 reviewer**。
- **3 問が全 \`unsafe\` に適用される理由**: \`unsafe\` は「Rust の安全性保証をプログラマが手作業で維持する」契約 → 不変量明示なしでは契約が不明 → 将来の refactor で違反可能。**契約が明示されていれば違反検出可能**。
- **Loom と Miri の使い分け**: **Loom** = 並行性順列テスト（複数スレッド interleaving を網羅、レース条件決定論的検知）。**Miri** = 実行時 UB 検出（\`unsafe\` 内の未定義動作、メモリ違反、aliasing 違反）。Loom は「論理が正しいか」、Miri は「メモリ安全性」。

## 合格基準

- 5 systems バグクラスを即答できる。
- \`execute\` ↔ \`unwind\` audit の問いを言える。
- 全 \`unsafe\` の 3 問を暗唱できる。
- 4 信頼境界の各々で問うべきことを言える。
- 6 ツールの役割を即答できる。

## まとめ（3行）

- Systems-code audit は Solidity audit と別仕事 — 5 バグクラス（状態破損 / 並行性 / コンセンサス不変量 / \`unsafe\` / 信頼境界）。
- \`execute\` ↔ \`unwind\` 対称性 / 全 \`unsafe\` の 3 問 / 4 信頼境界マップ / 6 ツールの使い分けが日々の audit 道具。
- 信頼性トライアングル（Fuzz + Chaos + Auditing）3 つそろえて初めて production-grade、1 つ ship なし = 既知ギャップ ship。
`,
                },
                {
                  title: 'レッスン15 — OSS 貢献ワークフロー（Reth / Revm / Alloy）',
                  slug: 'oss-contributor-workflow-ja',
                  type: 'CONTENT',
                  sortOrder: 10,
                  duration: 28,
                  xpReward: 60,
                  content: `# レッスン15 — OSS 貢献ワークフロー（Reth / Revm / Alloy）

## 問い

crypto 界の大半のエンジニアはコンパイルする Rust を書ける。最初のレビューで Reth / Revm / Alloy に merge される Rust を書けるエンジニアは少ない。**Paradigm は upstream PR queue で見覚えのある人を採用する**。そのギャップはどう埋めるか？

## 原理（最小モデル）

- **PR を無視させる 6 原因.** 不明瞭なタイトル / 「なぜ」抜け description / 非 atomic commit / スタイル不一致 / テスト規約違反 / defensive 応答。
- **ルーキング期間 2 週.** CONTRIBUTING.md / 直近 20 merged PR / 直近 10 close（無し merge）PR / メンテナの最近の PR / \`good first issue\` / TODO コメント。
- **エスカレーション梯子 5 段.** Docs/README typo → テストケース追加 → 小バグ修正 → 小機能 → アーキ変更。**#5 から始めると無視される**。
- **Paradigm 品質 PR の解剖.** Title（命令形、狭スコープ）+ Description 3 セクション（What / Why / How to verify）+ Atomic commits + コード（cargo fmt + clippy + 既存パターン合致）+ テスト（規約合致 + 意味あるエラー）+ 性能主張にはベンチ数字。
- **非自明変更は RFC.** Motivation / Design / Alternatives / Drawbacks / Prior art。**作業の多くは Alternatives と Drawbacks**。
- **「チームが書いたものと思うか？」テスト.** 既存 trait-first パターン / 不要新抽象なし / 隣接命名合致 / unsafe 避ける / プロジェクトエラー型一致 / なぜをコメント。
- **応答パターン.** 速 + 同意 → merge / 遅 + defensive → close。「これを OK にするには何が必要？」が再議論より良い。
- **Reputation 弧 5 段.** 1 merged（存在）→ 5（認識）→ 10（領域信頼）→ 20（非公式 expert）→ 50+（実質チーム、Paradigm 採用検討）。**月でなく年単位**。

## 具体例

エスカレーション梯子:

1. **Docs / README typo** — ほぼ確実 merge。注意深く読む人と印象
2. **テストケース追加** — edge case カバー。正しさを考える人
3. **小バグ修正** — \`good first issue\` ラベル。navigate できる人
4. **小機能追加** — 有用だが load-bearing でない。判断力ある人
5. **アーキ変更** — 上 4 つの後でなければ無理

PR description 3 セクション:

\`\`\`
1. What changed (1段落、diffが何をするか)
2. Why (1段落、動機; 該当 issue 番号引用)
3. How to verify (レビュアー向け明示指示: テスト + 手動チェック)
\`\`\`

RFC 構造（非自明変更）:

1. Motivation — どんな問題 + なぜ今
2. Design — 何を提案 + API スケッチ
3. Alternatives — 他に何を考え + なぜ却下
4. Drawbacks — 提案の悪い点正直リスト
5. Prior art — 他プロジェクトの扱い

応答パターン比較:

**良い（速 + 同意）:**
- Reviewer: 「ケース X は？」
- You: 「指摘ありがとう、テスト追加 + 修正入れる」（数時間以内）
- You: [push]（1-2 日以内）
- Reviewer: ✓ merge

**悪い（遅 + defensive）:**
- Reviewer: 「ケース X は？」
- You: [元設計が X を正しく扱う 200 単語 defense]
- Reviewer: [engage せず easier PR に移る]
- 3 週後: PR が inactivity で close

Reputation 弧:

| Merged 数 | 状態 |
| :--- | :--- |
| 最初の PR（小修正） | 社会的グラフに存在 |
| 5 件 | メンテナがハンドル認識、PR を見やすくなる |
| 10 件 | ある領域で信頼できる contributor |
| 20 件 | 非公式 expert、新 contributor の例に指される |
| 50+ 件 | 実質チームの一部、設計判断で相談される、**Paradigm 採用検討** |

監視 4 情報源:

1. Issue tracker（\`good first issue\` + \`help wanted\` フィルタ）
2. PR queue（active review コメントは無料の教育）
3. Discord / Telegram（\`#contributing\`、低リスクの「これは正しい approach か」質問）
4. コードベース TODO / FIXME（待っている would-be PR）

週 ~30 分。情報は複利。

## 失敗例（誤解）

「最初の PR で大きな技術貢献を見せる」— **間違い**。最初は **社会的グラフに存在を確立** が仕事。小さい修正で reliability を示す → 5-10 merge で初めて大きな PR の聞いてもらえる地位。

「Refactor PR が技術的に正しいなら受け入れられる」— **間違い**。履歴のない人の refactor は批判として読まれる。「あなたのコードがパターン X を使っているのに気づいた、Y で書き直した」は最悪パターン。

「PR が止まったら ping し続ける」— **間違い**。14 日 + 28 日に 1 度ずつ ping、それ以降は沈黙が答え。**Social capital を nagging で焼かない**。

「PR を Twitter で marketing」— **間違い**。merge 前の自己宣伝は協力前の self-promotion として読まれ、メンテナはそれを見る。

> 🛑 **予測。** Reviewer が「ケース X は？」と聞く。応答パターン 2 つあるが、どちらが merge させる？（答え: **速 + 同意 + 修正 push**（数時間以内応答、1-2 日以内 commit、修正 + テスト追加）。**遅 + defensive**（元設計の 200 単語 defense）はレビュアーが engage せず easier PR に移る → 3 週後 inactivity close。**デフォルトでレビュアーが正しいと仮定**。同意しないなら「これを OK にするには何が必要か？」を聞くのが再議論より良い — レビュアーは多数の PR を扱い、長い議論を相手にする余裕がない。）

## ステップで組み立てる

### Step 1: 2 週のルーキング期間

CONTRIBUTING.md + 直近 20 merged + 直近 10 close + メンテナ最近 PR + \`good first issue\` + TODO。

### Step 2: エスカレーション梯子で最初の PR を選ぶ

Typo か edge case テスト追加。「履歴を作る」が仕事。

### Step 3: Paradigm 品質 PR の 5 要素を毎回チェック

Title + Description 3 セクション + Atomic commits + コード（fmt + clippy + パターン）+ テスト（規約合致）。

### Step 4: 非自明変更は RFC

5 セクション（Motivation / Design / Alternatives / Drawbacks / Prior art）。**Alternatives と Drawbacks に時間を**。

### Step 5: 「チームが書いたものと思うか」テスト

既存パターン合致 / 不要新抽象なし / 命名合致 / unsafe 避ける / エラー型一致 / なぜをコメント。

### Step 6: 応答規律

速 + 同意 + 修正 push、deadlock では「これを OK にする方法は？」、止まったら 14 日 + 28 日に ping、以降沈黙が答え。

### Step 7: 4 情報源を週 ~30 分

Issue tracker + PR queue + Discord + TODO コメント。複利で効く。

## 答え合わせ

- **最初の PR が「大きな技術貢献ではない」理由**: メンテナはまだあなたを知らない、レビューに時間投資する正当化がない。小さい修正（typo、edge case テスト）で **存在 + reliability** を確立 → 後の大きい PR が聞かれる地位を作る。技術スキルではなく social capital の構築。
- **2 応答パターンが merge を決める理由**: レビュアー視点で「engage コスト」が違う。速 + 同意 = 「3 日で merge」、遅 + defensive = 「3 週間議論」。レビュアーは多数 PR を扱う + 長議論の余裕なし → easier PR に移る → 結局 close。「あなたが正しい場合でも、再議論より \`これを OK にする方法は？\` が速い」。
- **Reputation 弧が年単位な理由**: メンテナの認識は merge ごとに少しずつ更新 → 「ハンドルを記憶 + 過去 PR を例に出せる」までに 10-20 PR + 各 PR が atomic + clean + テスト付き → 1 PR/月でも 1-2 年。Paradigm 採用は「実質チームの一部」の認識（50+ merge）で起きる → 通常 2-3 年。**速い道は存在しない**。

## 合格基準

- ルーキング期間の 6 情報源を即答できる。
- エスカレーション梯子 5 段を順に言える。
- Paradigm 品質 PR の 5 要素を毎回チェックできる。
- RFC 構造 5 セクションを暗唱できる。
- Reputation 弧 5 段と Paradigm 採用検討段階を即答できる。

## まとめ（3行）

- Paradigm 採用は upstream PR queue で見覚えのある人から → 「コンパイルする Rust」と「merge される Rust」のギャップは独立スキル。
- 2 週ルーキング + エスカレーション梯子 + Paradigm 品質 PR 5 要素 + 応答規律（速 + 同意）+ 4 情報源 ~30 分/週。
- Reputation 弧 5 段は年単位、近道なし。50+ merge で実質チームの一部 → 採用検討段階。
`,
                },
                {
                  title: 'クイズ — Expert まとめ',
                  slug: 'expert-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 11,
                  duration: 15,
                  xpReward: 50,
                  content: `# クイズ — Expert まとめ

本番エンジニアリング層の総仕上げ。

レッスン0-15 を通じて: パフォーマンス（flamegraph / Criterion / jemalloc / maxperf）/ ストレージ（MDBX / B+tree / SALT 対比）/ 並行性（Tokio work-stealing / TaskExecutor）/ コンパイル時（proc macros / sol! / tracing）/ Precompile / MPT / Stateless / MEV / zkEVM / フォーク運用 / Differential fuzzing / EVM プライバシー / Chaos / Auditing / OSS 貢献ワークフロー の構造的事実を確認する。
`,
                  quizQuestions: [
                    {
                      "question": "Rethがチェーン状態に RocksDB ではなく MDBX を採用する理由は？",
                      "options": [
                        "RocksDB の LSM ツリーのコンパクションは書き込みスループットを上げるが読み取りレイテンシを不安定にする — Reth は予測可能なレイテンシとロックフリー読み取りのため MDBX (B+tree + mmap + MVCC) を選ぶ",
                        "MDBX はネイティブで範囲スキャンをサポートし、RocksDB はセカンダリインデックスの構築が必要",
                        "MDBX は Rust 製なので Reth の他のスタックと統合しやすい",
                        "MDBX の mmap 設計は読み取りごとのカーネル/ユーザ空間コピーを排除する — RocksDB ではできない"
                      ],
                      "correctIndex": 0,
                      "explanation": "Ethereum は読み取り重く・レイテンシ敏感。MDBX は C 製で Rust ではない (選択肢 3 を除外)。RocksDB はイテレータ経由で範囲スキャンをサポート (選択肢 2 を除外)。選択肢 4 の mmap 主張は部分的に正しいが帰結であって設計の動機ではない — 動機は validator レイテンシのためのコンパクションストール回避。"
                    },
                    {
                      "question": "Reth フォークの Rust パフォーマンス最適化で最初にやるべきは？",
                      "options": [
                        "ホットだと疑う関数に #[inline] ヒントを付ける",
                        "グローバルアロケータを jemalloc に切り替える — Reth は既にこれをやっている",
                        "プロファイル (flamegraph) とベンチマーク (Criterion) で **実際の** ホットパスを特定してから何かを変える",
                        "ホットループを std::simd 組み込みでベクトル化する"
                      ],
                      "correctIndex": 2,
                      "explanation": "早すぎる最適化は悪、見えない遅さはもっと悪い。他の 3 つの選択肢はそれぞれ本物の擁護可能な最適化 — しかし測定なしに適用するのが、このレッスンが防ごうとする失敗モードそのもの。"
                    },
                    {
                      "question": "Tokio ランタイム内で CPU 重い処理をやる正しい方法は？",
                      "options": [
                        "tokio::spawn でラップして他の async タスクと並行に実行する",
                        "tokio::task::spawn_blocking — ブロッキング作業用にサイズ調整された別のスレッドプールに逃がす",
                        "std::thread::spawn を直接使い、CPU 作業が Tokio に触らないようにする",
                        "関数に #[tokio::task] アノテーションを付けて Tokio に適切にルーティングさせる"
                      ],
                      "correctIndex": 1,
                      "explanation": "tokio::spawn (選択肢 1) も作業を非同期ワーカープールに置く — 直接呼ぶのと同じくランタイムを飢えさせる。std::thread::spawn (選択肢 3) は Tokio を完全にバイパスし JoinHandle 統合を失う。#[tokio::task] 属性は存在しない (選択肢 4 は捏造)。spawn_blocking が規律。"
                    },
                    {
                      "question": "手続きマクロはいつ実行される？",
                      "options": [
                        "実行時、ただし結果は初回呼び出し後にキャッシュされる",
                        "コンパイル時、入力 TokenStream を出力 TokenStream に変換する",
                        "パース時、レキサが走る前 — だから proc macro は raw バイトを使える",
                        "コンパイル後、リンク前、ビルドスクリプトパイプラインの一部として"
                      ],
                      "correctIndex": 1,
                      "explanation": "proc macro はコンパイラがコードをパースする最中に走る — レキサの後 (選択肢 3 を除外)、リンクのずっと前 (選択肢 4 を除外)。実行時には呼ばれない (選択肢 1 を除外)。cargo expand で結果が見える。"
                    },
                    {
                      "question": "Revm における「カスタム Opcode」と「カスタム Precompile」の主要な違いは？",
                      "options": [
                        "Opcode は EVM インタープリターループで実行される; Precompile は別プロセスで動き IPC 経由で通信する",
                        "Opcode は EVM 命令セットを変更する (バニラ EVM とのコンセンサスを破る); Precompile は予約アドレスへの CALL で呼べるネイティブ関数 (Solidity / ABI ツールにほぼ透過)",
                        "カスタム Opcode はメインネットで有効; カスタム Precompile は App-chain に限定される",
                        "Opcode は任意のコントラクトアドレスから呼べる; Precompile は特別な precompile 対応コンパイラを必要とする"
                      ],
                      "correctIndex": 1,
                      "explanation": "両方とも in-process で動く — IPC はない (選択肢 1 を除外)。カスタム Opcode はコンセンサスを破り、カスタム Precompile は破らない (選択肢 3 の **逆** が正しい)。Precompile は標準 CALL で呼べる — 特別なコンパイラ不要 (選択肢 4 を除外)。"
                    },
                    {
                      "question": "Ethereum が状態に Merkle Patricia Trie (MPT) を使う理由は？",
                      "options": [
                        "Patricia trie は任意の 256 ビットキーに対する最速のインデックスデータ構造",
                        "世界状態全体を単一の 32 バイトハッシュにコミットでき、包含 / 非包含証明が可能で、パス圧縮で空間効率が高い",
                        "ハッシュ衝突攻撃に強い — 各木のレベルで異なるハッシュ関数を使うから",
                        "すべての葉を並列に変更でき、ロック不要 — staged sync に critical"
                      ],
                      "correctIndex": 1,
                      "explanation": "MPT は最速のルックアップ構造ではない (選択肢 1 を除外 — HashMap のほうが速いが何にもコミットしない)。レベルごとに違うハッシュではなく keccak256 を全レベルで使う (選択肢 3 を除外)。並列変更は MPT の性質ではない — ルートまでの逐次再ハッシュが必要 (選択肢 4 を除外)。暗号学的コミットメントが全てのポイント。"
                    },
                    {
                      "question": "Revm を使った本番 zkEVM プルービングパイプラインで「witness」とは？",
                      "options": [
                        "mempool でトランザクションを観測したことを証言するノード運用者からの暗号学的署名",
                        "ブロックがアクセスした状態値 (アカウント・コード・ストレージスロット・最近のブロックハッシュ) の集合 — zkVM 内ではディスクが読めないのでプローバが消費する",
                        "ブロックで使用された全 Opcode のガスコストを事前計算したテーブル",
                        "証明対象ブロックでスナップショットされたフルチェーン状態を zkVM に送り込む"
                      ],
                      "correctIndex": 1,
                      "explanation": "署名は関係ない (選択肢 1 を除外)。ガスコストは EVM 仕様の定数で witness の一部ではない (選択肢 3 を除外)。*フル* 状態を送ると目的が破綻する — witness は最小サブセット、スナップショットではない (選択肢 4 を除外)。witness にない値をブロックが読めば証明は失敗する。"
                    },
                    {
                      "question": "MEV サーチャーにとって ExEx が価値ある理由は？",
                      "options": [
                        "標準のメインネット RPC より速く動く JSON-RPC シミュレーションエンドポイントを内蔵している",
                        "チェーンの commit / reorg / revert 通知をほぼゼロレイテンシで in-process でフル状態アクセスとともに受け取れる — ウォームキャッシュと高速シミュレーションに最適",
                        "Ethereum コンセンサスルールをバイパスし、サーチャーが代替順序を決定論的にシミュレーションできる",
                        "OS スケジューラが予約した CPU コアで動き、他のワークロードがプリエンプトできない"
                      ],
                      "correctIndex": 1,
                      "explanation": "ExEx は RPC エンドポイントではない (選択肢 1 を除外) — Rust コードへのコールバック。コンセンサスをバイパスできない; 通知が従うルールそのもの (選択肢 3 を除外)。Tokio スケジューリングは OS レベルの CPU pinning と関係ない (選択肢 4 を除外)。本領は各チェーンイベントで得られる in-process のレイテンシ。"
                    },
                    {
                      "question": "カスタム Precompile の価格設定で守るべき大原則は？",
                      "options": [
                        "同等の Solidity 実装の約 1/10 のガスに設定して採用を促進する",
                        "ガスコストは CPU コストに追従 — 典型的に最遅の現実的入力でベンチ、2〜5 倍の悪用係数を掛け、敵対的入力で検証",
                        "ユーザに対してガスモデルを予測可能に保つため、フラットな per-call コストを課す",
                        "最も似た標準 precompile (例: ecrecover) のガスコストをベースラインとして使う"
                      ],
                      "correctIndex": 1,
                      "explanation": "採用のための安すぎ (選択肢 1) こそ EIP-2929 が retrofit を強いられた DoS ベクター。フラットコスト (選択肢 3) は入力サイズが効く瞬間に破綻。他の precompile の数字を借りる (選択肢 4) は健全性チェックとしては良いが自分の CPU プロファイルを無視する。本物のワークフローは ベンチ → 悪用係数 → 敵対的検証。"
                    },
                    {
                      "question": "カスタム Reth フォークで App-chain を運用するときの現実的な最低限の本番デプロイは？",
                      "options": [
                        "単一データセンター内に 1 つのロードバランサ越しに 3 バリデータを共存させる (最低レイテンシ)",
                        "3 データセンターに ≥4 バリデータを地理分散、各バリデータの前に sentry ノード、解析用に別 archive ノード、レート制限付き RPC フリート — バリデータと公開 RPC は決して同居させない",
                        "同じクラウドリージョン内に 5 バリデータ (リージョン跨ぎは合意レイテンシが増えすぎる)",
                        "active-passive failover の 2 バリデータとホットスタンバイ (運用チームを小さく保つ)"
                      ],
                      "correctIndex": 1,
                      "explanation": "BFT 安全性は障害ドメイン跨ぎの定足数を要求 — 単一 DC (選択肢 1) と単一リージョン (選択肢 3) は 1 障害で崩壊。2 バリデータ (選択肢 4) はビザンチン振る舞いに耐えられない。現実的最低限は 地理分散 + sentry 分離 + 専用 RPC フリート、なぜなら公開 RPC への 1 度の DDoS でコンセンサスを止めてはいけないから。"
                    }
                  ],
                },
              ],
            },
          },
          {
            title: 'Reth ベースのチェーン — 拡張パターンを読む',
            sortOrder: 2,
            lessons: {
              create: [
                {
                  title: 'レッスン17 — Reth 拡張パターン（フォークではなくライブラリ）',
                  slug: 'reth-extension-pattern-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 14,
                  xpReward: 40,
                  content: `# レッスン17 — Reth 拡張パターン（フォークではなくライブラリ）

## 問い

op-geth / bsc-geth / bor を触った経験があれば、geth-fork パターンの苦しみは知っている。upstream をクローンしてパッチを当て、ずっと rebase。upstream マージのたびに週末がコンフリクト解消で潰れ、監査対象が徐々に mainline からドリフトする。**Reth はこのモデルを終わらせるために設計された — どう機能するか？**

## 原理（最小モデル）

- **2 モデル.** Fork（geth 流）= ソース patch + 定期 rebase → ドリフトコスト超線形 / Extension（reth 流）= crate 依存 + trait 別 crate impl → コスト局所化（trait シグネチャ変更時のみ）。
- **Reth アーキ全体が extension モデル軸.** NodeBuilder / components / ChainSpec パターンはまさに **reth ソース patch せず chain を出荷する** ためにある。
- **Paradigm が選んだ 3 理由.** ① Rebase 痛みは実証済み（op-geth は Optimism 自身が書き直しに資金 → \`crates/optimism/\`）+ ② 監査範囲（fork = upstream diff + 全 patch 理由づけ vs node crate = 1 repo + trait impl 集合）+ ③ コンポーザビリティ（Berachain PoL / Scroll zk-friendly state / Seismic 暗号化 tx が共存）。
- **6 カスタマイズスロット.** ChainSpec / ConfigureEvm / BlockExecutionStrategy / PayloadBuilder / Pool / RPC namespace / Consensus。他（P2P / MDBX / staged sync / ExEx / trie commitment）は何もしなくても reth が提供。
- **読むべき具体例 4 つ.** \`crates/optimism/\`（本番運用最大）/ alphanet（R&D）/ sova-reth（Bitcoin EL）/ seismic-reth（暗号化 tx）。
- **Tempo は extension モデルの実証.** \`tempoxyz/tempo\` = node crate、\`tempoxyz/reth\` = upstream に 0 commits ahead, 1374 commits behind。L1 全体が依存レベル拡張。

## 具体例

2 モデル比較:

| Model | やり方 | 時間が経つほどのコスト |
| :--- | :--- | :--- |
| Fork model (geth 流) | upstream をクローン、ソースに patch、定期的に rebase | ドリフトコスト **超線形に増大** — パッチと upstream の距離が開き続け、コンフリクトが複利で効く |
| Extension model (reth 流) | reth crate に依存、chain 固有 trait を別 crate で実装 | ドリフトコスト **局所化** — trait のシグネチャが変わったときだけ手を入れる |

7 カスタマイズスロット（reth NodeBuilder）:

| スロット | 何を制御 |
| :--- | :--- |
| \`ChainSpec\` | fork 高、gas params、precompile schedule、genesis |
| \`ConfigureEvm\` / block execution strategy | 実行レイヤー、custom precompile、deposit tx |
| \`PayloadBuilder\` | block 生成（sequencer mode） |
| Pool / mempool policy | どの tx をどの順序で受け入れるか |
| Custom RPC namespace | \`extend_rpc_modules\` で chain 固有エンドポイント |
| Custom consensus | Ethereum-PoS 以外向け |
| Add-ons | Custom 追加（ExEx、メトリクスなど） |

実例:

1. **\`crates/optimism/\`** in [paradigmxyz/reth](https://github.com/paradigmxyz/reth) — Optimism / Base / Mode / OP Stack。世界で最も本番運用された extension。
2. **[paradigmxyz/alphanet](https://github.com/paradigmxyz/alphanet)** — Paradigm 自身の OP Stack 互換テストネット。mainnet 実装前の precompile（EIP-7212 P-256）試す場。
3. **[SovaNetwork/sova-reth](https://github.com/SovaNetwork/sova-reth)** — Bitcoin の execution layer として Reth。
4. **[SeismicSystems/seismic-reth](https://github.com/SeismicSystems/seismic-reth)** — 暗号化 tx 対応の Reth。

Tempo の構造証拠:

- \`tempoxyz/tempo\` = node crate（Rust、L1）
- \`tempoxyz/reth\` = upstream Paradigm Reth に対して **0 commits ahead, 1374 commits behind**

**Reth を一切 fork していない**。payments 固有カスタマイズすべて \`tempoxyz/tempo\` crate に依存レベル拡張。

## 失敗例（誤解）

「Berachain は PoL を入れるために reth を fork した」— **間違い**。bera-reth は依存レベル拡張で reth crate に依存、独自 crate（consensus / evm / chainspec / node / rpc）で PoL を実装。**Reth 本体は触らない**。「fork」ではなく「**extend**」「**compose**」が正しい動詞。

「依存レベル拡張は性能を犠牲にする」— **間違い**。コンパイラがインライン化、性能差なし。trait による拡張は **ゼロコスト抽象** — 静的ディスパッチで最終バイナリは fork と同じ性能。

「全 chain は深いカスタマイズが必要」— **間違い**。実例 4 つは深さが違う（alphanet < Optimism < Tempo < MegaETH）。SDK は浅い端から深い端まで対応 + 必要分だけ書く。

> 🛑 **予測。** geth-fork チェーンが 18 ヶ月遅れの security patch を取り込みたい。rebase にどれくらいかかる？ rebase 自体が consensus bug を引き起こす経路 3 つ？（答え: **時間** = 数週間 - 数ヶ月（fork が 18 ヶ月分の patch を持つ → 各 patch をコンフリクト解消 + テスト + 監査）。**bug 経路** = ① patch の意味解釈ミス（upstream の意図と違う形で適用）+ ② 上流の関連変更（chainspec、共通 utility）を引き継ぎ忘れ → 自分の patch が暗黙前提を破る + ③ rebase 後の rebuild で hidden コンパイラ最適化変化 → 確率的バグ。**rebase 自体が consensus-critical**。）

## ステップで組み立てる

### Step 1: 2 モデルの差を即答

Fork = 超線形ドリフトコスト / Extension = 局所化（trait シグネチャ変更時のみ）。

### Step 2: 7 カスタマイズスロット

ChainSpec / ConfigureEvm / PayloadBuilder / Pool / RPC namespace / Consensus / Add-ons。他は reth が提供。

### Step 3: 4 実例を見比べる

\`crates/optimism/\`（本番最大）/ alphanet（R&D 教育）/ sova-reth（Bitcoin）/ seismic-reth（プライバシー）。

### Step 4: Tempo の構造証拠を確認

\`tempoxyz/reth\` の commits ahead / behind を見る → 0 / 1374 → fork ゼロ証明。

### Step 5: 自分の chain 設計

「6 スロットのうちどれを差し替え、どれを継承？」を明示化。**Reth に対する diff だけ書く**。

## 答え合わせ

- **Berachain の正しい言い直し**: 「Berachain は PoL を入れるために bera-reth crate を書き、Reth crate に依存している」または「reth を **extend** した」。fork ではない（reth リポを copy していない、reth-core crate を import している）。
- **Extension モデルが Reth で成立する構造的理由**: trait-based aggregation（NodeBuilder composition）+ ゼロコスト抽象（静的ディスパッチ）+ chainspec / EVM / payload / consensus / pool / RPC が独立 trait → 各 chain が必要な分だけ別 crate で impl → reth-core は変更不要。
- **Tempo / MegaETH / Berachain が同じパターンを使う理由**: 各々が異なる深さのカスタマイズ（Tempo 浅、MegaETH 深、Berachain 中）でも **Reth fork なし** で済む = extension モデルは深さに依存しない。MegaETH は MDBX を SALT で完全置換 + 別 validator binary を書きつつ \`megaeth-labs/reth\` は 0 ahead, 7666 behind。

## 合格基準

- 2 モデル（fork / extension）の差を即答できる。
- 7 カスタマイズスロットを言える。
- Berachain が「fork ではなく extend」と正しく言える。
- Tempo の \`0 ahead, 1374 behind\` の意味を即答できる。
- 4 実例の深さ順を言える。

## まとめ（3行）

- Fork model（geth 流）はドリフトコスト超線形、Extension model（reth 流）は局所化 — Reth アーキ全体が extension 軸。
- 7 カスタマイズスロット（ChainSpec / ConfigureEvm / PayloadBuilder / Pool / RPC / Consensus / Add-ons）+ 他は reth が提供 + 必要分だけ別 crate で impl。
- Tempo / MegaETH / Berachain / Seismic / Sova すべて **Reth fork なし** = extension モデルは深さに依存しない実証。
`,
                },
                {
                  title: 'レッスン18 — op-stack-on-reth を読む',
                  slug: 'reading-op-stack-on-reth-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 16,
                  xpReward: 45,
                  content: `# レッスン18 — op-stack-on-reth を読む

## 問い

Optimism は「Reth ベース L2」の正典。node コードは \`paradigmxyz/reth/crates/optimism/\`。Tempo の node crate も同様の構造で公開済み（\`tempoxyz/tempo\`）。**ここを読めれば向こうも読める — ディレクトリ構造を一目で解く方法は？**

## 原理（最小モデル）

- **Reth ベース chain の sub-crate 構造.** chainspec / node / evm / payload / consensus / rpc / txpool / hardforks。
- **依存関係は extension model の証拠.** \`reth-optimism-node\` は \`reth-node-builder\` + \`reth-chainspec\` などの core crate に依存 + OP 固有 sibling crate に依存、\`reth-node-ethereum\` には依存しない（**並列 mainnet node crate**）。
- **5 分で辿る背骨.** ① NodeBuilder composition / ② ChainSpec / ③ Executor / EVM config / ④ Payload builder / ⑤ Genesis JSON。
- **初回読書 4 ステップ.** \`README.md\` + \`Cargo.toml\` → \`chainspec/\` → \`node/\`（NodeBuilder composition）→ NodeBuilder 順に各カスタマイズ crate → tests。
- **Tempo の構造予測.** tempo-chainspec / tempo-node / tempo-evm / tempo-payload-builder / tempo-pool / tempo-consensus（L1 なので存在）。

## 具体例

OP Stack の sub-crate（reth バージョンで揺れるのでソース確認推奨）:

| Subdirectory | 担当 |
| :--- | :--- |
| \`chainspec/\` | OP chain spec — fork、genesis、gas params、precompile schedule |
| \`node/\` | トップレベル \`NodeBuilder\` 配線 — 「これが OP node である」 |
| \`evm/\` | EVM config — custom precompile、deposit tx semantics、L1 cost logic |
| \`payload/\` | Payload builder — sequencer mode での block 生成 |
| \`consensus/\` | OP の consensus engine（finality は L1 に委ねる） |
| \`rpc/\` | Custom RPC namespace（\`optimism_*\` メソッド） |
| \`txpool/\`（または類似） | Deposit-tx を認識する mempool policy |
| \`hardforks/\` | Bedrock、Canyon、Ecotone、Fjord、... の fork activation logic |

依存関係探索:

\`\`\`bash
cargo tree -p reth-optimism-node
\`\`\`

見えるもの:
- \`reth-optimism-node\` → \`reth-node-builder\` / \`reth-chainspec\` / \`reth-evm\` / \`reth-payload-builder\` / \`reth-rpc-builder\` / \`revm\` / \`alloy-*\`
- OP 固有 sibling: \`reth-optimism-chainspec\` / \`reth-optimism-evm\` / \`reth-optimism-payload-builder\` / ...
- \`reth-node-ethereum\` には依存しない（並列 mainnet node）

5 分背骨:

1. **NodeBuilder composition** — \`*-node/src/lib.rs\` か \`node/builder.rs\`
2. **ChainSpec** — \`*-chainspec/src/\`
3. **Executor / EVM config** — \`*-evm/src/\`
4. **Payload builder** — \`*-payload-builder/src/\` か \`*-payload/src/\`
5. **Genesis JSON** — chainspec crate インラインまたは独立 \`.json\`

初回読書順:

1. \`README.md\` + \`Cargo.toml\` — どの crate が存在するか把握
2. \`chainspec/\` — fork activation を声に出す
3. \`node/\` — NodeBuilder composition、どこがカスタマイズされているか
4. **NodeBuilder で名前が出てきた順** に各 crate
5. Tests — 特に state-transition test

Tempo 予測構造:

- \`tempo-chainspec\` 相当 — Tempo 固有 fork 高、gas params、決済固有 precompile
- \`tempo-node\` 相当 — NodeBuilder composition
- \`tempo-evm\` 相当 — 決済 primitives 用 precompile（FX rate / settlement-proof / regulated-asset）
- \`tempo-payload-builder\` 相当 — sequencer 用
- \`tempo-pool\` 相当 — 決済固有 mempool policy（merchant 認可）
- \`tempo-consensus\` 相当 — Tempo は L1 なので存在

メタ観察: \`tempoxyz/reth\` = **0 commits ahead, 1374 commits behind**。Reth 本体は触られていない。

## 失敗例（誤解）

「OP は \`reth-node-ethereum\` に依存する」— **間違い**。並列関係。両者は共有 reth-core crate（\`reth-node-builder\` / \`reth-chainspec\`）を消費するが、互いに依存しない。**OP も Ethereum も「chain」の選択肢**、Ethereum が特権ではない。

「Reth ベース chain の構造は chain ごとに完全に違う」— **間違い**。**SDK が共通骨格を強制**: chainspec / node / evm / payload / consensus / rpc の sub-crate 構造。chain 固有部分は各 sub-crate 内、骨格は同じ。

「Tempo は L2 なので OP と同構造」— **間違い**。Tempo は L1（独立 consensus 持つ）→ tempo-consensus が存在、Deposit tx / L1 cost / L1 block oracle なし。OP は L2（L1 にアンカー）。**観点で違いがある**。

> 🛑 **予測。** \`node.rs\` というファイルに \`OpNode\` という型を見つけた。\`OpNode\` が **何であるか** と **何をするか** を理解するために、次にどこを見る？ 実装している trait を予測してから。（答え: ① \`impl FullNodeTypes for OpNode\` を探す（Node primitives 定義）+ ② \`impl NodeAdapter for OpNode\` または \`impl Node for OpNode\` を探す（NodeBuilder 配線）+ ③ \`OpNode::components()\` メソッド（6 コンポーネント差し替え）。trait は \`reth_node_api\` / \`reth_node_builder\` から来る。**何であるか = NodeBuilder 型パラメータ**、**何をするか = components() で chain 固有部品を差し込む**。）

## ステップで組み立てる

### Step 1: 8 sub-crate を列挙

chainspec / node / evm / payload / consensus / rpc / txpool / hardforks。

### Step 2: \`cargo tree\` で依存可視化

\`cargo tree -p reth-optimism-node\` → 共有 core crate + OP 固有 sibling + Ethereum non-dependency。

### Step 3: 5 分背骨を辿れる

NodeBuilder → ChainSpec → Executor/EVM → Payload → Genesis。

### Step 4: 初回読書 4 ステップ

README+Cargo.toml → chainspec → node → NodeBuilder 順 + tests。

### Step 5: Tempo を予測構造で読む

8 sub-crate 相当を予測 → 実際の repo で検証 → L1 vs L2 観点で違い理解。

## 答え合わせ

- **op と Ethereum が並列関係である構造的理由**: NodeBuilder + ChainSpec が「複数 chain を同 SDK で扱う」設計。Ethereum は「mainnet」chain の実装、OP は「Optimism」chain の実装、両者が同 substrate（reth-node-builder / reth-chainspec / reth-evm）を消費。一方が「親」ではない、両方が「兄弟」。
- **SDK が骨格を強制する理由**: NodeBuilder の API（\`.with_types::<ChainNode>().with_components(...)\`）が「6 コンポーネント差し替え」パターンを強制 → 各 chain が同じ場所に同じ種類の crate を置く → 新しい chain repo を 5 分で navigate 可能。
- **L1 vs L2 の観点別差分**: L1（Tempo）= 独立 consensus + Deposit tx なし + L1 cost なし + L1 block oracle なし。L2（OP）= 親 chain consensus 依存 + Deposit tx あり + L1 cost あり + L1 block oracle あり。両者とも extension モデルだが「何を差し替えるか」が違う。

## 合格基準

- 8 sub-crate を即答できる。
- \`cargo tree\` で extension model を確認できる。
- 5 分背骨（NodeBuilder → ChainSpec → Executor → Payload → Genesis）を辿れる。
- 初回読書 4 ステップを言える。
- L1 と L2 の観点別差分を 4 つ言える。

## まとめ（3行）

- Reth ベース chain は 8 sub-crate 構造（chainspec / node / evm / payload / consensus / rpc / txpool / hardforks）、SDK が骨格を強制。
- 5 分背骨（NodeBuilder → ChainSpec → Executor → Payload → Genesis）+ 初回読書 4 ステップ（README → chainspec → node → NodeBuilder 順 + tests）。
- L1（Tempo）と L2（OP）は extension モデル共通だが Deposit / L1 cost / consensus の有無で差分 — 観点で読めば両方読める。
`,
                },
                {
                  title: 'レッスン19 — Custom ChainSpec（fork / genesis / precompile schedule）',
                  slug: 'custom-chainspec-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 14,
                  xpReward: 40,
                  content: `# レッスン19 — Custom ChainSpec（fork / genesis / precompile schedule）

## 問い

mainnet では検証が通るブロックが、あなたの chain では reject される。同じブロック、同じクライアントバイナリ、同じ Revm — なのに結果が違う。**\`ChainSpec\` のどこかが「この高さでは、ここのルールが違う」と言っているから — 何が入っているか？**

## 原理（最小モデル）

- **\`ChainSpec\` = chain のプロトコル定義.** Chain ID / Hardfork activation / Base fee params / Genesis / Precompile schedule / レガシー params。
- **6 カテゴリ.** Chain ID（EIP-155 replay protection）+ Hardfork activation（block-height / timestamp スイッチ）+ Base fee（EIP-1559 elasticity / change denominator）+ Genesis（初期 allocation / state root / gas limit）+ Precompile schedule（各 fork でアクティブな precompile アドレス）+ レガシー（block gas limit / DAO fork / mining difficulty）。
- **拡張 ChainSpec.** L2 chain は base \`ChainSpec\` をラップし chain 固有 fork（Bedrock / Canyon / Ecotone / Fjord）+ 独自 precompile schedule を追加。
- **Hardfork enum がプロトコル史.** 声に出して読むのが chain 理解の最速ルート。
- **Precompile activation は ChainSpec に住む.** EVM config 単独ではなく ChainSpec → activation 自体がコンセンサスルール。
- **L2 chainspec の追加項目.** L1 chain ID / L1 block oracle / Sequencer address / Withdrawal config。

## 具体例

ChainSpec 6 カテゴリ:

| カテゴリ | 何を制御 |
| :--- | :--- |
| Chain ID | EIP-155 replay protection キー |
| Hardfork activation | Protocol upgrade を切り替える block-height / timestamp スイッチ |
| Base fee params | EIP-1559 elasticity、change denominator |
| Genesis | 初期 allocation、state root、gas limit |
| Precompile schedule | 各 fork でアクティブな precompile アドレス |
| その他レガシー | Block gas limit、DAO fork、mining difficulty（legacy） |

OP Hardfork enum 例:

\`\`\`rust
pub enum OptimismHardfork {
    Bedrock,
    Regolith,
    Canyon,
    Ecotone,
    Fjord,
    Granite,
    Holocene,
    // ...
}
\`\`\`

Precompile schedule の対応:

\`\`\`
Fork F において、アドレス A は ネイティブ関数 impl I にマップされる
\`\`\`

実体は chain の EVM config crate、**activation 判定は ChainSpec**（activation 自体がコンセンサスルール）。

Genesis 出荷物:

- Genesis JSON ファイル（allocation / gas limit / 初期 difficulty/seal）
- chainspec crate 内 \`Genesis\` Rust struct（JSON からロード可能）
- 計算済み genesis state root — 全ノード合意が必要

L2 chainspec 追加項目:

- **L1 chain ID** — L2 がアンカーされている先（cross-domain message verification）
- **L1 block oracle** address on L2 — 現 L1 block hash を記録するコントラクト
- **Sequencer address** — sequencer 署名つき batch の検証用
- **Withdrawal config** — L2 → L1 withdrawal の時間遅延

## 失敗例（誤解）

「Precompile activation は EVM config 単独で十分」— **間違い**。Block N でどの precompile がアクティブかを 2 ノードが食い違って判定 → 一方が「成功」もう一方が「revert」→ stateRoot 乖離 → コンセンサス分裂。**activation はコンセンサスルール → ChainSpec に置く**（EVM config はその指示を実行するだけ）。

「Genesis state root はどうでもいい」— **間違い**。コード上の root と実ネットワークの root が食い違えば、全ノードが block 1 で食い違う → chain が起動しない / 1 ブロックで分岐。

「ChainSpec は単なる config ファイル」— **半分間違い**。**6 カテゴリすべてがコンセンサスクリティカル**。chain ID 違い = replay 攻撃、hardfork 高さ違い = 分裂、precompile schedule 違い = stateRoot 乖離。「config」より「プロトコル定義」が正確。

> 🛑 **予測。** "ChainSpec" は config 風に聞こえるが何が入っているか **カテゴリを 5 つ** 予想する。5 つに届かない / 全部 gas 関連 → consensus rule の範囲を過小評価。（答え: Chain ID / Hardfork activation / Base fee params / Genesis / Precompile schedule / レガシー params。**6 カテゴリすべて consensus rule**、ChainSpec 1 つ間違えると chain が分裂する。）

## ステップで組み立てる

### Step 1: 6 カテゴリ即答

Chain ID / Hardfork / Base fee / Genesis / Precompile schedule / レガシー。

### Step 2: Hardfork enum を音読

\`OptimismHardfork::Bedrock / Regolith / Canyon / Ecotone / Fjord / ...\` を声に出す → chain のプロトコル史。

### Step 3: 「fork F は block H、timestamp T でアクティブか？」関数

OP chainspec の \`is_fork_active_at_block\` / \`is_fork_active_at_timestamp\` を辿る。

### Step 4: OP mainnet と Base の Bedrock activation block

両方が異なる block を持つ → OP mainnet は本番、Base は別。同じ \`OptimismHardfork::Bedrock\` でも chain ごとに高さが違う。

### Step 5: L2 chainspec の追加 4 項目

L1 chain ID / L1 block oracle / Sequencer address / Withdrawal config。

## 答え合わせ

- **Precompile activation を ChainSpec に置く理由**: 2 ノードが block N で精コンパイル set を食い違うと → 一方が呼び出し成功、もう一方が「アドレスは empty」と revert → stateRoot 乖離 → 分裂。activation はコンセンサスルール → 全ノード合意必要 → ChainSpec（プロトコル定義）に住む。
- **Genesis state root のコード ↔ 実ネットワーク食い違いの結末**: 新ノード起動時、ChainSpec の genesis root を「正しい root」として使う → 実ネットワークのノードが違う root を持つ → block 1 をネットワークから受信 → 自分の post-state root と食い違う → block 1 を invalid と判定 → ネットワークから孤立。
- **L1 chainspec と L2 chainspec の追加 4 項目の存在理由**: L2 は親 chain（L1）にアンカーされる → ① L1 chain ID（どの L1）+ ② L1 block oracle（L1 状態へのアクセス）+ ③ Sequencer address（sequencer 認証）+ ④ Withdrawal config（cross-layer 時間遅延）。L1 自体はアンカー先がない → 不要。

## 合格基準

- 6 カテゴリを即答できる。
- Hardfork enum を音読 → activation table が読める。
- Precompile activation が ChainSpec に住む理由を説明できる。
- Genesis state root の重要性を言える。
- L2 chainspec の追加 4 項目を即答できる。

## まとめ（3行）

- ChainSpec = 6 カテゴリ（Chain ID / Hardfork activation / Base fee / Genesis / Precompile schedule / レガシー）、すべて consensus-critical。
- Hardfork enum はプロトコル史、activation table は「fork F が block H、timestamp T でアクティブか」を答える関数。
- L2 chainspec は L1 chain ID / L1 block oracle / Sequencer / Withdrawal の 4 項目を追加 — L1 は自分でアンカーされないので不要。
`,
                },
                {
                  title: 'レッスン20 — Custom executor（execution layer を差し替える）',
                  slug: 'custom-executor-ja',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 18,
                  xpReward: 45,
                  content: `# レッスン20 — Custom executor（execution layer を差し替える）

## 問い

Executor は「tx を実行して post-state を生成するもの」。Ethereum mainnet では vanilla revm、Optimism では revm + deposit-tx 処理 + L1 cost 計算 + 異なる precompile。**Reth がこの実行レイヤーをどう差し替えさせるか？**

## 原理（最小モデル）

- **3 trait の境界.** \`ConfigureEvm\`（block context → 適切な precompile / gas schedule で revm 構成）+ \`BlockExecutionStrategy\`（block から tx 取り出し → revm 流し → receipt + state change 蓄積）+ \`ExecutorBuilder\`（NodeBuilder スロット）。
- **Optimism が override する 4 つ.** Custom precompile リスト（L1 block hash アクセスなど）+ Deposit transaction 処理（署名検証スキップ）+ L1 cost 計算（calldata の L1 投稿コスト）+ Pre-execution hook（L1 block oracle slot 更新）。
- **Precompile は \`ConfigureEvm\`、L1 cost は実行戦略.** Custom precompile = config、L1 cost = executor メインループ（precompile に収まらない consensus-critical ロジック）。
- **配線.** ChainSpec → [どの fork アクティブ？] → EVM config → [アクティブ precompile set] → revm。
- **Execution loop は mainnet + 2 行差.** Deposit tx 判定 + L1 cost apply 以外は mainnet と同じ。

## 具体例

3 trait:

- **\`ConfigureEvm\`** — block コンテキスト → revm インスタンス構成
- **\`BlockExecutionStrategy\`**（または類似）— block から tx 取り出し → revm 流し → receipt + state change 蓄積
- **\`ExecutorBuilder\`** — NodeBuilder スロット

Optimism の override:

| Override | 理由 |
| :--- | :--- |
| Custom precompile リスト | OP は L1 block hash アクセスなど追加 |
| Deposit transaction 処理 | Deposit tx は署名検証スキップ（L1 で認証済み） |
| L1 cost 計算 | OP tx は L2 gas に加え L1 data cost 支払い |
| Pre-execution hook | block 内最初の tx 実行前、L1 block oracle slot 更新 |

配線:

\`\`\`
ChainSpec  ──[どの fork がアクティブ?]──▶  EVM config  ──[アクティブな precompile set]──▶  revm
\`\`\`

Execution loop 擬似コード:

\`\`\`
for tx in block.body:
    if is_deposit_tx(tx) and current_fork.allows_deposits():
        skip_signature_verify()
    else:
        verify_signature(tx)?

    db = state_provider.load_relevant_accounts(tx)
    cfg = configure_evm(chainspec, block, db)   // precompile、gas schedule をセット
    result = revm.transact(cfg, tx)
    apply_l1_cost(tx, result, db)               // L2 固有
    state.commit(result.state_changes)
    receipts.push(result.receipt)
return post_state_root(state), receipts
\`\`\`

Mainnet では 3 行目（deposit 判定）と 9 行目（L1 cost）が消えるだけ。**他はまったく同じ**。

L1 cost 計算ステップ:

1. 各 tx 実行前に既知の storage slot から L1 base fee + blob gas price を読む
2. \`l1_cost = calldata_gas × l1_base_fee + blob_overhead\` を計算
3. L2 gas 課金 **に加えて** 送信者残高から控除
4. Fee vault に入金

Tempo（L1）で予測される差分:

- "deposit tx" 概念なし（親 chain なし）
- L1 cost 課金なし
- ただし: 決済 primitives 用 custom precompile（FX、settlement attestation）+ Pre-execution hook（FX rate oracle slot）+ 異なる fee 市場構造（stablecoin-native）

## 失敗例（誤解）

「L1 cost charging を precompile で実装すれば speed が出る」— **間違い**。precompile は「tx 実行中の特定 CALL に応じる」もの → tx 実行 **前** に送信者残高から控除できない。L1 cost は実行戦略レベル → executor メインループ。

「Custom precompile は executor に直書きすれば良い」— **間違い**。\`ConfigureEvm\` impl が revm に precompile セットを手渡す → ChainSpec の hardfork schedule で gate → 各 fork で正しい precompile set。直書きすると hardfork transition で壊れる。

「Deposit tx は通常 tx と同じ実行で良い」— **間違い**。Deposit tx は L1 で既に認証済み（L1 コントラクトが認証）→ L2 側で署名検証する署名がない / 検証する必要なし。**OP の deposit tx は署名フィールドが空または特殊値**、署名検証スキップが必須。

> 🛑 **予測。** OP の L1 cost charging はなぜ precompile として実装できないのか？ 「performance のため」だけなら掘り下げが足りない — precompile が tx 実行前に任意のアカウントから控除できない **consensus 上の理由** は？（答え: precompile は **tx 実行中の特定 CALL に応じる純粋関数** → 任意のアカウント残高を tx 実行 **前** に控除する権限がない（既存の precompile アドレス \`0x01\`-\`0x0a\` も全部入出力ベースで、ホスト state を勝手に書き換えない）。L1 cost は ① tx 実行前、② 送信者残高から、③ block 内全 tx に適用 → これは executor の責務、Yellow Paper の framework 外。**consensus-critical ロジックは executor に住む** — precompile では tx-scoped、executor は block-scoped。）

## ステップで組み立てる

### Step 1: 3 trait 境界を即答

\`ConfigureEvm\` / \`BlockExecutionStrategy\` / \`ExecutorBuilder\`。

### Step 2: Optimism の 4 override

Custom precompile / Deposit tx / L1 cost / Pre-execution hook。

### Step 3: Precompile vs Executor の判断軸

「tx-scoped 入出力か」= precompile / 「block-scoped、tx 実行前後、ホスト state 任意書き換え」= executor。

### Step 4: Execution loop 擬似コード暗唱

mainnet との差分 2 行（deposit 判定 + L1 cost apply）= **extension model の最小差分**。

### Step 5: Tempo の予測差分

L1 なので deposit / L1 cost / L1 block oracle なし、代わりに決済 primitives + FX oracle + stablecoin fee 市場。

## 答え合わせ

- **L1 cost が executor のみに住む理由**: precompile = tx 実行中の特定 CALL に応じる純粋関数（入出力）、executor = block 全体の制御（tx 実行前後、ホスト state 書き換え）。L1 cost は ① 全 tx に適用 + ② tx 実行前に控除 + ③ ホスト state 書き換え → 3 つとも precompile の責務外。
- **Custom precompile が ChainSpec を経由する理由**: 各 fork で異なる precompile set が必要（hardfork で precompile 追加 / 削除）→ EVM config が単独で hardfork 状態を知らないと正しい precompile set を渡せない → ChainSpec が「現 block での fork 状態」を提供 → EVM config が「fork に対応する precompile set」を選ぶ → revm が受け取る。
- **mainnet と OP のメインループ差分**: 3 行目（deposit tx 判定 + 署名検証スキップ）+ 9 行目（apply_l1_cost）の 2 行だけ。他のすべて（state load / configure_evm / transact / state.commit / receipts.push）は mainnet と同じ。**extension model の最小差分 = consensus 互換性 + コード共有率最大**。

## 合格基準

- 3 trait（ConfigureEvm / BlockExecutionStrategy / ExecutorBuilder）を即答できる。
- Optimism の 4 override を即答できる。
- Precompile vs Executor の判断軸を言える。
- Execution loop の mainnet との 2 行差分を言える。
- L1 cost が executor のみに住む理由を 3 つ言える。

## まとheme（3行）

- 3 trait（ConfigureEvm / BlockExecutionStrategy / ExecutorBuilder）が execution layer の差し替え API、ChainSpec → EVM config → revm の配線。
- Optimism の 4 override（Custom precompile / Deposit tx / L1 cost / Pre-execution hook）= mainnet との最小差分（2 行）。
- Precompile = tx-scoped 純粋関数、Executor = block-scoped、ホスト state 任意書き換え可 — L1 cost は executor のみ。
`,
                },
                {
                  title: 'レッスン21 — Custom payload builder（sequencer モードの block 生成）',
                  slug: 'custom-payload-builder-ja',
                  type: 'CONTENT',
                  sortOrder: 4,
                  duration: 16,
                  xpReward: 45,
                  content: `# レッスン21 — Custom payload builder（sequencer モードの block 生成）

## 問い

Ethereum mainnet では block を **validator** が consensus client 動かして execution client から pull。L2 や中央集権 sequencer chain では **sequencer がそのまま block producer**。**Payload builder が「どうやって作るか」を担う — 何を制御し、何を制御しないか？**

## 原理（最小モデル）

- **\`PayloadBuilder\` の入出力.** 入力 = Parent block / chain state / Pending tx pool / Timestamp / slot、出力 = 構築済み block（"payload"）。
- **3 種の本番 builder.** Default Ethereum builder（mainnet validator）+ OP payload builder（OP Stack sequencer）+ **op-rbuilder**（[flashbots/rbuilder](https://github.com/flashbots/rbuilder)、OP 向け高性能 external block builder）。
- **L2 builder の 5 つの追加責務.** ① Deposit tx 強制 include（L1 oracle queue から）+ ② FIFO or priority-fee ソート + ③ L1 block oracle slot 更新（最初の state write）+ ④ L2 gas limit でキャップ + ⑤ Sequencer signature でタグ付け。
- **Builder と executor の境界.** Builder = **block に何が入るか** を制御、Executor = **block に入っているもの** を実行。
- **MEV 3 立場.** MEV-blind（厳格 FIFO）/ MEV-aware public（MEV-share bid）/ MEV-extracting（内部 searcher）。**chain の MEV policy は payload builder ソースに現れる**。
- **op-rbuilder.** Bundle merging + Sealing strategy + Builder API、OP Stack 向け本番グレードリファレンス。

## 具体例

3 種 builder:

| Builder | 場所 | 用途 |
| :--- | :--- | :--- |
| Default Ethereum builder | \`crates/payload/builder/\` | Mainnet validator |
| OP payload builder | \`crates/optimism/payload/\` | OP Stack sequencer |
| **op-rbuilder** | [flashbots/rbuilder](https://github.com/flashbots/rbuilder) | OP Stack 向け高性能 external builder |

L2 builder の 5 責務:

1. Deposit tx を block 先頭に強制 include（既知の L1 oracle queue から）
2. 残りを FIFO か priority-fee でソート
3. 最初の state write として L1 block oracle storage slot を更新
4. L2 gas limit で block をキャップ（mainnet limit ではない）
5. Sequencer signature で block にタグ付け（一部 L2 は sequencer identity にコミット）

MEV 3 立場:

| Position | 意味 | 例 |
| :--- | :--- | :--- |
| MEV-blind | 厳格 FIFO、tx 意味に踏み込まない | 一部小規模 L2 が主張 |
| MEV-aware public | 公開 order flow、builder が MEV-share 風 bid 受ける | OP Stack + op-rbuilder |
| MEV-extracting | Sequencer が内部 searcher 運用 | 不透明、中央集権 chain は何でも可能 |

op-rbuilder の特徴:

- **Bundle merging**（private order flow + public mempool）
- **Sealing strategy**（greedy、並列化可能）
- **Builder API**（第三者 bundle 提出可能）
- オープンソースで「本物の」本番 block builder に最も近い

Tempo 予測:

- 決済認識型 payload builder — 決済 tx が汎用 tx より優先される可能性
- Builder レベル merchant 認可フィルタ
- merchant 単位レート制限
- ローンチ時公開 mempool なし（sequencer-private）

## 失敗例（誤解）

「mempool を FIFO に流せば sequencer 完成」— **間違い**。3 攻撃が抜けている: ① tx 提出の latency 攻撃（低レイテンシピアが優位）、② toxic order flow（malicious tx が次の被害者を釣る）、③ reorg 攻撃（sequencer 自身が短期 reorg）。**FIFO + 防御層が必要**。

「builder と executor は同じこと」— **間違い**。Builder = **何を入れるか**（順序 + フィルタ）、Executor = **入っているものをどう走らせるか**（state 遷移）。順序は builder が決定 + executor が忠実に実行。

「MEV-blind が常に倫理的」— **半分間違い**。MEV-blind 主張でも実際は order flow の見え方で抽出可能（mempool 公開 vs sequencer 専有）。**公開された主張ではなく builder source code が真実**。

> 🛑 **予測。** ジュニアエンジニアが「mempool を FIFO に流せば sequencer 完成」と言う。**そこに考慮が抜けている攻撃を 3 つ**。（答え: ① **tx 提出 latency 攻撃** — 低レイテンシピアが MEV 機会を独占（先着 FIFO で）、② **toxic order flow** — bait tx が後続 tx の被害者を釣る、sequencer が一律 FIFO だと罠が成功、③ **reorg / sequencer 自身の MEV** — sequencer 自身が短期 reorg で過去 block を書き換えて利益抽出（中央集権なので何でもできる）。FIFO は **公平に見えて公平でない** — 防御層必要。）

## ステップで組み立てる

### Step 1: 3 種 builder を即答

Default / OP payload / op-rbuilder（external）。

### Step 2: L2 builder の 5 責務

Deposit tx 強制 / FIFO or priority-fee / L1 oracle slot 更新 / L2 gas cap / Sequencer signature。

### Step 3: Builder vs Executor の境界

Builder = 何を入れるか（順序 + フィルタ）、Executor = 入っているものを実行。

### Step 4: MEV 3 立場の判別

source code を読む — \`extend_builder_with_mev_share\` のような feature flag、external builder 統合の有無、internal searcher hook。

### Step 5: op-rbuilder を読む準備

OP Stack 向けの「本物の」本番 builder 参考実装、Bundle merging + Sealing + Builder API。

## 答え合わせ

- **3 攻撃（latency / toxic flow / reorg）が FIFO で防げない理由**: ① latency は network 層の話 → application 層の順序付けでは介入不能、低レイテンシピアが mempool の自分の tx を先に入れる、② toxic flow は順序付けロジックが意味解釈しない FIFO だと罠 tx + 被害者 tx を順に通す、③ sequencer 自身の reorg は順序付けではなく consensus 層の問題、中央集権 sequencer は何でも可能。**FIFO は平等の幻想**、防御層必要。
- **Tempo の予測差分（5 つ）**: 決済認識型優先 / merchant 認可フィルタ / merchant rate limit / 公開 mempool なし / sequencer signature。各々が payload-builder crate の trait impl として現れる。
- **MEV policy が source code に現れる理由**: feature flag や external builder 統合は public API 露出 / 内部 searcher hook は private 関数だが GitHub source で見える / Bundle merging の有無 / Order flow privacy 設定。**主張ではなくコードを読む** — 「MEV-blind」と言いながら \`internal_searcher::bid()\` が呼ばれているかもしれない。

## 合格基準

- 3 種 builder を即答できる。
- L2 builder の 5 責務を言える。
- Builder vs Executor の境界を 1 文で説明できる。
- MEV 3 立場を判別できる。
- 3 攻撃（latency / toxic / reorg）が FIFO で防げない理由を言える。

## まとめ（3行）

- Payload builder = block 内容（順序 + フィルタ）を制御、Executor = 内容を実行。Mainnet validator vs L2 sequencer で「誰がトリガーするか」が違うだけ。
- L2 builder の 5 責務（Deposit tx / FIFO or priority-fee / L1 oracle slot / L2 gas cap / Sequencer signature）+ MEV 3 立場が source code に現れる。
- op-rbuilder が OP Stack 向け本番グレードリファレンス、Bundle merging + Sealing + Builder API。
`,
                },
                {
                  title: 'レッスン22 — ケーススタディ（Paradigm スタック: alphanet / Tempo / MegaETH）',
                  slug: 'paradigm-stack-case-study-ja',
                  type: 'CONTENT',
                  sortOrder: 5,
                  duration: 18,
                  xpReward: 50,
                  content: `# レッスン22 — ケーススタディ（Paradigm スタック: alphanet / Tempo / MegaETH）

## 問い

ここまでで 4 つの拡張スロット（ChainSpec / executor / payload / RPC）+ Reth ベース chain の依存形を見てきた。**Paradigm の全スタックはどう見えるか、Tempo / MegaETH のソースをこのレンズでどう読むか？**

## 原理（最小モデル）

- **6 層スタック.** EVM core（revm）→ Toolkit（alloy）→ Execution client（reth）→ Reth ベース chain（\`crates/optimism/\`）→ R&D testnet（alphanet）→ 本番 L1（Tempo）。
- **下層は上層にしか依存しない.** Tempo は reth を fork しない、**reth の上に建てる**。
- **alphanet = precompile R&D 遊び場.** OP Stack 互換 testnet、mainnet 実装前の EIP（7212 P-256 / 3074 / 7702）を試す。**「chain に precompile を追加する」最もクリーンな実例**。
- **Alphanet → 本番への軌跡.** mainnet Ethereum に EIP として graduate / 本番 Reth ベース chain に graduate。Tempo に何が入るかを予測したいなら **最近 alphanet で検証されたもの** を見る。
- **Tempo（浅い端）.** L1 node crate、3-5 コンポーネント差し替え、残り upstream 継承。\`tempoxyz/reth\` = 0 commits ahead, 1374 commits behind。
- **MegaETH（深い端）.** カスタム EVM（mega-evm）+ カスタム storage（SALT で MDBX 置換）+ 別 validator binary（stateless-validator）— それでも \`megaeth-labs/reth\` = 0 commits ahead, 7666 commits behind。
- **SDK はカスタマイズの深さを制約しない.** Tempo 浅、MegaETH 深、両方とも reth fork なし。

## 具体例

スタック層:

| Layer | Component | 役割 |
| :--- | :--- | :--- |
| EVM core | revm | バイトレベル EVM インタプリタ |
| Toolkit | alloy | Rust 型 / provider / signer / ABI |
| Execution client | reth | フル Ethereum node（staged sync / mempool / RPC / MDBX / P2P） |
| Reth ベース chain | reth \`crates/optimism/\` | OP Stack execution を reth node crate として |
| R&D testnet | alphanet | EIP-X precompile 試す遊び場 |
| 本番 L1 | Tempo | Paradigm 決済レール |

Alphanet の実装事例:

- EIP-7212 — \`secp256r1\` (P-256) verification precompile（WebAuthn / Passkey）
- EIP-3074 / 7702 — account abstraction primitives
- 各種 opcode / gas 微調整

Tempo 公開:

- [\`tempoxyz/tempo\`](https://github.com/tempoxyz/tempo)（900+★、Rust）— "the blockchain for payments"。L1 node crate
- [\`tempoxyz/reth\`](https://github.com/tempoxyz/reth) — **0 commits ahead, 1374 commits behind** = fork ゼロ証拠
- Tempo Moderato が公開テストネット
- Chainlink CCIP（cross-chain rail）

隣接 crate:

- [\`tempoxyz/zones\`](https://github.com/tempoxyz/zones) — confidential blockchain anchored to Tempo（250ms ブロック、TIP-403 compliance 継承）
- [\`tempoxyz/mpp-specs\`](https://github.com/tempoxyz/mpp-specs) — Machine Payments Protocol（HTTP-402 ベース、IETF draft）
- [\`tempoxyz/tempo-foundry\`](https://github.com/tempoxyz/tempo-foundry) — Tempo サポート Foundry fork（薄い fork）
- [\`tempoxyz/tidx\`](https://github.com/tempoxyz/tidx) — PostgreSQL + ClickHouse ハイブリッドインデクサ

Tempo の予測 4 観点:

- Custom ChainSpec — Tempo 固有 fork + precompile schedule
- Custom executor — 決済 precompile（FX rate / settlement attestation / regulated-asset）
- Custom payload builder — merchant 認識 ordering + rate limit
- Custom RPC namespace — \`tempo_*\` + Machine Payments Protocol 統合

MegaETH（深い端）:

- [\`megaeth-labs/reth\`](https://github.com/megaeth-labs/reth) — 空 fork（0 ahead, 7666 behind）
- [\`megaeth-labs/mega-evm\`](https://github.com/megaeth-labs/mega-evm) — revm + op-revm 上に MegaETH 固有仕様（\`EQUIVALENCE\` から \`REX4\`）。sequencer は [\`revmc\`](https://github.com/paradigmxyz/revmc) で JIT/AOT
- [\`megaeth-labs/salt\`](https://github.com/megaeth-labs/salt) — MDBX 置換、30 億アイテム ~1 GB メモリ認証、state-root ランダム I/O ゼロ
- [\`megaeth-labs/stateless-validator\`](https://github.com/megaeth-labs/stateless-validator) — sequencer と完全別バイナリ、SALT witness 読む + バニラ revm 実行

L1 vs L2 observation 表:

| 観点 | OP Stack (L2) | Tempo (L1) |
| :--- | :--- | :--- |
| Deposit tx | あり（L1 から） | なし |
| L1 cost charge | あり | なし |
| L1 block oracle slot | あり | なし |
| 独立 consensus | なし（L1 にアンカー） | あり（自前 consensus） |
| Sequencer モデル | ローンチ中央集権、分散化ロードマップ | おそらく中央集権、決済レール正当化 |
| ネイティブ資産 | ETH 相当 | おそらく USD ステーブル |

## 失敗例（誤解）

「SDK は浅いカスタマイズしかできない」— **間違い**。MegaETH が深い端の証拠: EVM 完全置換 + storage 完全置換 + validator binary 別 = それでも \`megaeth-labs/reth\` は 0 ahead。**深さに依存しない**。

「Tempo は L2 と同じ構造」— **間違い**。Tempo = L1 → 独立 consensus + Deposit / L1 cost / L1 oracle なし。L1 と L2 で 6 観点違う。

「alphanet は単なる testnet」— **間違い**。Paradigm が **mainnet 実装前の EIP を試す** R&D 遊び場 → 最近 alphanet で検証されたもの = 「次に本番 chain に来るもの」のヒント。Tempo に何が入るかを予測したい人は alphanet を見る。

> 🛑 **予測。** Paradigm はこの順で出荷: revm → alloy → reth → alphanet → op-stack-on-reth → Tempo。このシーケンスは何の軌跡？（答え: **下から上に substrate を構築 → R&D → 本番**。① revm = EVM 解釈器、② alloy = Rust 抽象、③ reth = full client、④ alphanet = R&D 遊び場、⑤ op-stack-on-reth = 本番 L2 リファレンス、⑥ Tempo = Paradigm 自身の L1 本番。各層が次層を可能にし、各層が独立価値を持つ。「製品を縦に切る」より「substrate を横に厚く積む」戦略 — Paradigm 全社が同 substrate に乗る + 外部 chain も同 substrate を使える。）

## ステップで組み立てる

### Step 1: 6 層スタックを即答

revm → alloy → reth → \`crates/optimism/\` → alphanet → Tempo。

### Step 2: 「下層は上層にしか依存しない」不変量

各層が独立価値 + 上層が下層を消費するが下層は上層を知らない。

### Step 3: alphanet で「次に来るもの」を予測

最近実装された EIP / opcode 微調整 → Tempo / 本番 chain に来る可能性。

### Step 4: Tempo の予測 4 観点

ChainSpec / executor / payload / RPC。\`tempoxyz/tempo\` の Cargo.toml で実コンポーネントを検証。

### Step 5: MegaETH を深い端として読む

mega-evm / salt / stateless-validator + \`megaeth-labs/reth\` 0 ahead 証拠。

### Step 6: L1 vs L2 観点 6 つ

Deposit / L1 cost / L1 oracle / 独立 consensus / Sequencer / Native 資産。

## 答え合わせ

- **Paradigm シーケンスの軌跡解釈**: substrate を下から積み上げる戦略 — revm（最小単位）→ alloy（型システム）→ reth（フルノード）→ alphanet（R&D）→ \`crates/optimism/\`（L2 リファレンス）→ Tempo（自社 L1）。**各層が独立価値**を持つ → Paradigm 内製品も外部 chain も同 substrate に乗る。
- **Tempo / MegaETH の同じ extension model + 異なる深さ**: SDK のカスタマイズスロットを Tempo は 3-5 つ使い（payments 固有 precompile / payload builder / RPC）、MegaETH は全部 + EVM 置換 + storage 置換 + validator binary 別。深さ問わず reth fork なし（0 ahead）= **fork する必要がない設計**。
- **alphanet 観察の実用**: 最近 alphanet で検証された EIP / precompile / opcode 微調整 → 1-2 年内に Tempo / 本番 chain に graduate する可能性。**「次に来るもの」を予測したい人は alphanet を週次で見る** — 公開 R&D ロードマップ。

## 合格基準

- 6 層スタックを即答できる。
- alphanet の 3 実装事例（EIP-7212 / 3074 / 7702）を言える。
- Tempo の予測 4 観点 + 隣接 4 crate を言える。
- MegaETH の深いカスタマイズ 4 つ（mega-evm / salt / stateless-validator + fork なし）を言える。
- L1 vs L2 観点 6 つを言える。

## まとめ（3行）

- 6 層スタック（revm → alloy → reth → \`crates/optimism/\` → alphanet → Tempo）、下層は上層に依存しない不変量で各層独立価値。
- Tempo = 浅いカスタマイズ（3-5 コンポーネント差し替え）、MegaETH = 深いカスタマイズ（EVM 置換 + storage 置換 + validator 別）、両方 reth fork なし = SDK は深さに依存しない。
- alphanet は Paradigm の R&D 公開遊び場、最近実装された EIP / precompile が本番 chain への graduate 候補 — 「次に来るもの」を予測したい人の必読源。
`,
                },
                {
                  title: 'クイズ — Reth ベース chain まとめ',
                  slug: 'reth-chains-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 6,
                  duration: 15,
                  xpReward: 50,
                  content: `# クイズ — Reth ベース chain まとめ

拡張パターン総まとめ。

レッスン17-22 を通じて: Extension model（fork ではなくライブラリ）/ op-stack-on-reth 解剖 / Custom ChainSpec / Custom executor / Custom payload builder / Paradigm スタックケーススタディ の構造的事実を確認する。
`,
                  quizQuestions: [
                    {
                      "question": "なぜ大半の Reth ベース chain は geth 流のフォークモデルではなく拡張モデルを採用しているのか?",
                      "options": [
                        "Reth が geth より速いため、性能を求めて chain は採用せざるを得ない",
                        "Reth のモジュラーな trait アーキテクチャ (NodeBuilder + ChainSpec + ExecutorBuilder + PayloadBuilder) により、必要な部分だけをカスタマイズし、残りはライブラリとして利用できるため — rebase コストが消える",
                        "Rust のモジュールシステムが source レベルの fork を阻止するため",
                        "Paradigm が Reth を使うすべての chain に対して「拡張のみ」のポリシーを強制しているため"
                      ],
                      "correctIndex": 1,
                      "explanation": "速度 (選択肢 1) は副産物であってアーキテクチャ上の理由ではない。Rust は fork を阻止しない (選択肢 3 は誤り)。Paradigm が独立 chain に何かを強制している事実もない (選択肢 4 は誤り)。本当の駆動要因は trait アーキテクチャそのもの — 重要なスロットだけを override し、残りを継承する設計が成り立つ。"
                    },
                    {
                      "question": "Reth ベース chain の hardfork activation のロジックはどこに住むか?",
                      "options": [
                        "Payload builder — builder が各 fork で block を生成するため",
                        "ChainSpec — ある block height / timestamp でどの fork がアクティブかは consensus rule であり、それを所有するのは ChainSpec だから",
                        "Executor — fork によって execution の振る舞いが変わるため",
                        "Genesis JSON — 初期 state allocation と並べて記述されるため"
                      ],
                      "correctIndex": 1,
                      "explanation": "複数の層が fork state を「読む」が、所有しているのは ChainSpec 一つだけ。Builder (1) や executor (3) は判断のために fork state を参照するが、その都度 ChainSpec に問い合わせる — activation 自体を所有しているわけではない。Genesis (4) は *初期* state を担うもので、fork schedule ではない。"
                    },
                    {
                      "question": "OP Stack は L2 gas に加えて L1 data cost を課金する。このロジックを含む trait の impl はどれで、なぜか?",
                      "options": [
                        "Custom precompile — precompile が native な fee logic を置く自然な場所だから",
                        "Mempool policy — fee は admission 時に計算されるため",
                        "Block execution strategy / executor — tx 実行前にアカウントから控除する操作は consensus-critical な state mutation であり、全ノードが寸分違わず同じ計算を行わなければならないから",
                        "RPC layer — クライアントが tx 提出前に L1 cost を知る必要があるため"
                      ],
                      "correctIndex": 2,
                      "explanation": "Precompile (1) は単独では任意アカウントから控除できない — executor の権限が必要。Mempool (2) は cost を *推定* できるが consensus 上の state change を強制することはできない。RPC (4) は情報提供であって consensus-critical ではない。権限と consensus-critical な位置の両方を持っているのは executor だけ。"
                    },
                    {
                      "question": "Reth ベース L2 が、すべての block の先頭に deposit tx を強制的に含める必要がある。これを処理するのはどの trait か?",
                      "options": [
                        "ChainSpec — deposit の取り扱いは chain rule の一部だから",
                        "Payload builder — block に何が入るか、どの順序で入るかを決めるのは payload builder だから",
                        "Mempool — deposit tx は別 queue にあり、mempool がそこから先に drain するから",
                        "Custom consensus — ordering を強制できるのは consensus だけだから"
                      ],
                      "correctIndex": 1,
                      "explanation": "ChainSpec (1) は deposit tx の *定義* を持つが、選び出し方は持たない。Mempool (3) は deposit queue を追跡できるかもしれないが、「先頭に置く」は block composition の決定。Consensus (4) は過剰 — これは選択の問題であって finality の問題ではない。Block composition と順序を決定する単一コンポーネントが payload builder。"
                    },
                    {
                      "question": "Reth ベース chain で custom precompile を書いたとき、その *登録* はどこで行われるか?",
                      "options": [
                        "Precompile crate 内部、static registry を経由して",
                        "Chain の EVM config (ConfigureEvm impl) 内 — revm にアクティブな precompile セットを手渡し、chain の hardfork schedule で gate する",
                        "Reth core 内部、precompile dispatch table を直接編集して",
                        "Genesis JSON、初期 code allocation の一部として"
                      ],
                      "correctIndex": 1,
                      "explanation": "Static registry (1) では chain rule で gate できない。Reth core を編集 (3) は、まさに避けたい fork-model アンチパターンそのもの。Genesis (4) は state を保持する場所であり、protocol レベルの関数を置く場所ではない。EVM config こそが正しいスロット — ChainSpec (どの fork か) と revm (実際に走るもの) を結ぶ役。"
                    },
                    {
                      "question": "alphanet と Tempo の関係を最も正確に表す説明は?",
                      "options": [
                        "同じプロジェクトの呼び名違い",
                        "alphanet は Tempo のテストデプロイ",
                        "alphanet は Paradigm が EVM 拡張 (custom precompile など) を検証する R&D testnet で、そこで成熟した実験は Tempo のような本番 chain に出荷されたり、Ethereum EIP として提案されたりする",
                        "Tempo は alphanet の上に建てられ、alphanet は Reth の上に建てられている",
                        "メンテナーが共通である以外はほぼ無関係"
                      ],
                      "correctIndex": 2,
                      "explanation": "alphanet は遊び場で、Tempo は本番のレール。選択肢 1、2 は両者を混同している。選択肢 4 は依存関係の順序が逆 — どちらも直接 Reth に依存しており、互いに依存しているわけではない。選択肢 5 は弱すぎる: precompile 実験の技術的な系譜は実在し、追跡できる。"
                    },
                    {
                      "question": "中央集権 sequencer の レッスン2において、payload builder が決め、executor が決めないことは?",
                      "options": [
                        "Payload builder は gas pricing を、executor は ordering を決める",
                        "Payload builder は block にどの tx をどの順序で入れるかを決める。executor は、渡された tx を渡された順序で実行するだけ",
                        "両者の決定範囲は同じ — builder は executor の薄いラッパーにすぎない",
                        "Payload builder は署名を検証し、executor は state change を適用する"
                      ],
                      "correctIndex": 1,
                      "explanation": "Gas pricing (選択肢 1 は逆) は主に chainspec の問題で、builder と executor の対比軸ではない。両者同じ (3) は誤り — この分離こそが要点。署名検証 (4) は executor / tx validator 側の責務で、builder ではない。クリーンな分割: builder = 選択 + 順序づけ、executor = 言われたとおりに実行。"
                    },
                    {
                      "question": "`tempoxyz/tempo` を初めて開き、Paradigm が「compose, don't fork」モデルに従ったかを確認したい。最もシグナルが強い 1 手は?",
                      "options": [
                        "README と発表ブログを読む",
                        "`tempoxyz/reth` を開き、`paradigmxyz/reth` に対する commits-ahead/behind を確認する",
                        "`tempoxyz/tempo` ワークスペース内の crate 数を数える",
                        "Tempo と upstream Reth のスループットを比較するベンチマークを走らせる"
                      ],
                      "correctIndex": 1,
                      "explanation": "README / ブログ (1) は正しいことを言っているが証明にはならない。Crate 数 (3) は緩い相関しかなくノイジー。ベンチマーク (4) は性能を測るのであって fork したかどうかではない。Fork チェック (2) が決定的な構造的テスト — そして答えは \"0 ahead, 1374 behind\"、これが「compose, don't fork」テーゼに対する最強の経験的証明。"
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
