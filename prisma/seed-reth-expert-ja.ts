import { PrismaClient } from '@prisma/client';

export async function seedRethExpertJA(prisma: PrismaClient) {
  const tags = ['reth', 'revm', 'alloy', 'rust', 'expert', 'performance', 'mdbx', 'mev', 'zkvm'];

  await prisma.course.create({
    data: {
      slug: 'reth-expert-ja',
      title: 'Reth Expert — 本番エンジニアリング',
      description:
        'ハードコアな実装：プロファイリングとキャッシュ意識のRust、MDBXストレージ内部、Tokioランタイム、手続きマクロ、カスタムPrecompile、Merkle Patricia Trie、本番MEVパイプライン、zkEVM、独自Rethフォークの運用、そして拡張パターン経由で Reth ベース chain (op-stack、alphanet、Tempo) を読む。',
      difficulty: 'EXPERT',
      duration: 290,
      xpReward: 815,
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

Rethフォークを本番投入。ベンチではブロック取り込み 12ms だったのに、本番では 80ms。残り 68ms はどこに消えた? — 答えられない。誰もプロファイルを取っていなかったから。これこそ本レッスンが防ぐべき失敗モード: **見えない遅さ**。気づかぬ間に積み重なり、バリデータが 200 ブロック遅れるまで誰も気づかない、あの種類。

Rethフォークを本番に出すか、Revmのホットパスをいじるなら、**プロファイリングとベンチマークは必須** です。早すぎる最適化は悪、ですが **「見えていない遅さ」はもっと悪い**。

> 🛑 **スクロール前に予測。** ジュニアエンジニアが「ノードが遅い気がする、HashMap を BTreeMap に置き換えてみよう」と言ってきました。**そのアプローチの問題点を 3 つ挙げてください。** 自分のリストを手元に残してから先へ。

## 1. 「測ってから直す」

ルール: 測っていないものは最適化しない。これから問うことになる 2 つの問いを、それぞれカバーするツールが 2 つ：

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

> 🛑 **理解度チェック。** Criterion ベンチで関数 X が変更後 20% 速くなった。**ノード全体は 20% 速くなる?** ならない可能性は? 具体的に — マイクロベンチが現実への影響について嘘をつく理由を 2 つ挙げてください。

### ノード全体のベンチ: ディスクをスナップショット

上の理解度チェックが捉えているのは本物の問題: マイクロベンチはシステム効果を測れない。解決策はノード全体のワークロードをベンチすることだが、それには毎回同じディスク状態が必要 — そして 500 GB の Reth DB を毎ラン再構築するのは数時間かかる。Paradigm はまさにこの目的で [\`tempoxyz/schelk\`](https://github.com/tempoxyz/schelk) を使っています: ブロックデバイスのスナップショット/ロールバックツールで、ベンチが *書き込んだ* ブロックだけを (\`dm-era\` で追跡) virgin ボリュームからコピーして scratch を復元する。ロールバックは数時間ではなく数秒、ワークロード自体は実 NVMe 上の素の ext4 で走る — オーバーレイなし、書き込みリダイレクトなし。

教育的なポイント: Reth の性能主張 (「staged sync を 15% 短縮した」) を読むときは、著者がラン間で schelk のような何かを使っていると想定すること。ロールバック規律のないベンチは再現不可能。間違ったロールバック (LVM thin オーバーレイ、btrfs スナップショット) を使ったベンチは、ワークロードと同じくらいロールバック機構を測ってしまう。

> 🔍 **リポジトリで確認。** [\`tempoxyz/schelk\`](https://github.com/tempoxyz/schelk) を開き、\`docs/SKILL.md\` を読む。**ロールバックの仕方について驚くポイントが 3 つあるはず。** 先に挙げてからリポで検証してください。

## 2. 行数ではなくキャッシュラインで考える

現代 CPU では RAM 読み出しがレジスタ上の演算より約 100 倍遅い。だから「コードを短くする」は誤ったツマミで、**メモリレイアウトを CPU に優しく** が正解。CPU が実際にロードする単位はバイトでもフィールドでもなく、固定 **64 バイトのキャッシュライン**。

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

> 🛑 **予測。** 100 万要素の \`Vec<Row>\` がある。\`row.id\` だけ読み出して合計するイテレーション。\`big_blob\` は決して読まない。**CPU が実際にキャッシュ経由でロードするメモリ量はどれくらい?** なぜ?

## 3. アロケータ選定

\`Vec::push\` も \`Box::new\` も、最終的にはグローバルアロケータを呼びます。どのアロケータを選ぶかで変わるのはスループットではなく **テイル(p99)レイテンシ**。Reth は **jemalloc**（Facebook 製アロケータ、現在は tikv-jemallocator クレート経由で利用）を Linux のシステムデフォルト(glibc malloc)より優先します。断片化が進んだ状態でも p99 が安定するためです。

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

> 🛑 **理解度チェック。** jemalloc の 10〜30% はどこで節約されている? **平均**レイテンシ? それとも**テイル**レイテンシ? どんな負荷でその差が広がる? 「速い」だけならアロケータ設計をまだ理解していません — 読み直し。

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

> 🛑 **予測。** なぜ \`maxperf\` を日常開発ビルドで **絶対に使わない** のか? コストを具体的に。(ヒント: \`codegen-units = 1\` と \`lto = "fat"\` の組み合わせ — コンパイラに何をさせる?)

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
3. **変更後にもう一度測る。** 手動の最適化がコンパイラの最適化と打ち消し合うこともある。

> 最終チェック: 冒頭の「ジュニアエンジニアが HashMap を BTreeMap に置き換えたい」予測に戻る。**測定・プロファイリング・再検証** を挙げたか? 「BTreeMap は時に遅い」と挙げたなら、それも誤った推論 — 反対側で同じ間違い。**ポイントはどのコンテナかではなく、データなしには答えられない問いだということ。**

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

各アカウントの残高、各ストレージスロット、各レシート — Reth はそれらをすべて **1つの** KV ストアに収めます。Postgres でも RocksDB でも独自フォーマットでもなく、**MDBX**。LMDB から派生したメモリマップB+tree(各ノードが複数キーを保持してディスクページに収まる、バランス木)です。500GB の DB 全体が、まるで巨大な in-memory slice であるかのように Rust コードから見える — ディスクと RAM の往復は OS が mmap で処理する。

MDBX を理解できると「Reth を使える」から「Reth を拡張できる」に進化します。

> 🛑 **スクロール前に予測。** RocksDB は多くのブロックチェーンクライアントで支配的な KV ストア（geth、erigon の歴史的に）。**Reth はなぜ代わりに MDBX を選ぶのか?** 書き込みスループット・読み取りレイテンシ・クラッシュ安全性・mmap・コンパクションのいずれかを引いて仮説を立ててください。

## 1. なぜMDBX（LevelDB / RocksDBではなく）？

| 特徴 | RocksDB | MDBX |
| :--- | :--- | :--- |
| **アーキテクチャ** | LSMツリー | **B+tree（mmap）** |
| **読み取りレイテンシ** | 可変（コンパクション） | **予測可能** |
| **書き込み増幅** | 高い | **約1倍** |
| **クラッシュ安全性** | 手動flush | **MVCCでACID** |
| **読み取り並列性** | ロック | **ロックフリー読み取り** |

Ethereum は **読み取り重く・レイテンシ敏感**。LSM ツリー(RocksDB や LevelDB が採用する log-structured-merge の設計 — 書き込み高速、定期的にバックグラウンドで階層を書き直す)は書き込みは得意ですが、**コンパクション** — すべてを止めて階層を再書き出しする瞬間 — でストールします。このストールが sync 速度とバリデータ レイテンシにとって致命傷になる。MDBX のほうが噛み合います。

> 🛑 **理解度チェック。** LSM ツリーの **コンパクション** とは何? なぜ読み取りをストールさせる? B+tree はコンパクションしない — 代わりに何をやって空間を回収する? 各 2 文で答えられないなら、表を理解せずに鵜呑みにしているだけです。

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

> 🛑 **予測。** なぜこのトレイトには **2 つの** 関連型 (\`TX\` と \`TXMut\`) があり、1 つの \`Tx\` 型ではないのか? 単一型では強制できない不変条件は何?

注意深く読む：

- **2つの関連トランザクション型** — \`TX\`（読み取り専用）と \`TXMut\`（読み書き）。それぞれメソッドが異なる。分離することで、読み取りトランザクションに対して \`put\` を誤って呼ぶことをコンパイル時に防ぐ。
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

最重要ポイントは4つ：

### \`<T: Table>\` — テーブルは型、文字列ではない

各テーブルは \`Table\` トレイトを実装した **Rust型**。コンパイラが「キー/値の型はこのテーブルのスキーマに合致する」を強制する。**テーブル名のタイポは即コンパイルエラー**。

### \`append\` vs \`put\`

\`put\` は任意のキーで動く。\`append\` は **キーが現在の最大より大きい場合のみ有効** だが、B+tree探索を省略するので速い。ブロックを順次処理するときは \`append\`、reorgのときは \`put\` にフォールバック。

> 🛑 **予測。** 現在の最大より *小さい* キーで \`append\` を呼ぶと何が起きる? クラッシュ? サイレント破損? エラー? なぜこの不変条件の強制が MDBX ではなくあなたの責任なのか? 答えられないなら、なぜ \`append\` が速いのかをまだ理解していません — 読み直し。

### Cursors

範囲スキャンには \`get\` の繰り返しではなく **cursor** を使う。一度だけB+tree内に位置決めし、隣接エントリを歩く — 独立した get の数桁倍速い。隣接キーは同じページを共有する可能性が高いので。

> 🛑 **理解度チェック。** なぜ cursor は隣接キーへの N 回の独立 \`get\` よりこれほど速いのか? 答えには **B+tree 構造** と **ページキャッシュのローカリティ** の両方が含まれる。各 1 文で。

### \`disable_long_read_transaction_safety\`

実用的なエルゴノミクス。長い読み取りtxはGCをブロックしDBを膨らませる。Rethは通常、開きすぎた読み取りtxを中止する。**本当に** 長いスナップショットが必要な時だけ設定する（コストを承知のうえで）。

## 4. ホットパスで重要な理由

mmap で読むので：

- 「ウォーム」なヘッダー検索は **ポインタ参照** で完了（システムコールなし）
- OSのページキャッシュが無料の読み取りキャッシュになる
- **ローカリティが効く**：関連データを同じページに

Rethのテーブル設計は、Executionステージの読み取り（アカウント → ストレージ → コード）が温まったページを叩くようになっています。

## 5. 比較対象: MegaETH の SALT

MDBX はバニラ Reth ノードのための正しいデフォルト。しかし「正しいデフォルト」と「どんな chain にも正しい」は別物です。MegaETH は MDBX を完全に置き換え、ディスクバックの B+tree が許す以上のスループットを押し上げるために **[SALT](https://github.com/megaeth-labs/salt)** (Small Authentication Large Trie) を採用しました。

設計のコントラスト — どちらを読むときも頭に置く価値あり:

| 観点 | **MDBX** (Reth デフォルト) | **SALT** (MegaETH) |
| :--- | :--- | :--- |
| 形 | Memory-mapped B+tree | 2 階層: 4 段の完全 256-ary trie + SHI ハッシュテーブルのバケット |
| ストレージモデル | 全データがディスク、OS が mmap でページイン | 認証層は **完全にメモリ上** (30 億アイテムで ~1 GB)、データはバケットに |
| state root 更新 | MPT を歩き、多数のランダムディスクページに触れる | バケット内ローカル更新; ルート再計算中のランダムディスク I/O を排除 |
| trie の形 | なし — Reth は MDBX の上で MPT を別途維持 | trie *が* ストレージそのもの; commitment が内在 |
| 挿入順不変性 | 該当なし (KV agnostic) | SHI (Strongly History-Independent) — 挿入順によらず正準的な commitment |
| 強み | 成熟、クラッシュセーフ、ACID、ツール生態系が深い | 数十億スケールでのメモリ効率良好な authentication、state root のランダム I/O ゼロ |
| トレードオフ | 高 TPS では state root 更新時のランダム I/O がボトルネックになる | 新しい (~2026 年設計)、デプロイ範囲が狭い、メモリ圧力に敏感 |

教育的なポイントは「SALT のほうが良い」ではない。MDBX の設計判断は、**誰かが違う選択をしたものを見て初めて見えるようになる** ということ。ストレージレイヤを 1 つしか読んだことがないと、どの判断が必須でどれが偶発的かを区別できません。

[\`megaeth-labs/salt\`](https://github.com/megaeth-labs/salt) を Reth の MDBX ラッパーと並べて読んでみてください。そのとき浮かんでくる問い — 「Reth は高 TPS で必要ないクラッシュ安全性のためにどこで対価を払っているか?」「SALT は authentication をメモリに収めるために何を諦めているか?」 — が、自分の chain のためにストレージレイヤを拡張するときに直面する設計の問いそのものです。

## 6. 練習

リポジトリで [\`crates/storage/db-api/src/tables\`](https://github.com/paradigmxyz/reth/tree/main/crates/storage/db-api/src/tables) を開く：

> 🛑 **開く前に予測。** \`Headers\` テーブルのキー / 値は何? \`Transactions\` は? \`PlainAccountState\` は? 推測してから検証してください。

1. \`Headers\` テーブルを探す — キー（\`BlockNumber\`）と値（\`Header\`）に注目
2. \`DupSort\` テーブルを探す — 1キーに複数値を許すテーブル。**なぜ \`DupSort\` が存在する? どんな種類のデータがそれを必要とする?**
3. Executionステージの1回の読み取りを追跡：どのテーブルをどの順で参照する？

これでEthereum状態のすべてのバイトがRethのどこに住んでいるかが分かります。

> 最終チェック: なぜ mmap が 500GB の DB を Rust の slice のように扱えるようにするのか、一文で。**OS はどこで関わる?** ページフォルト → ページロードのメカニズムを説明できないなら、「ポインタ参照、システムコールではない」の主張はあなたにとって言葉のまま、理解になっていません。`,
                },
                {
                  title: 'Tokioランタイム内部',
                  slug: 'tokio-internals-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 18,
                  xpReward: 40,
                  content: `# Tokioランタイム内部

\`#[tokio::main]\` を書き、あらゆる async 呼び出しに \`.await\` を散りばめてきました。Reth のコードベースには 200 以上の \`.await\` が散らばっていて、ピーク負荷では数千の peer 接続と数十のバックグラウンドタスクを **8 ワーカースレッド** でさばいています。魔法ではない — コンパイラがあなたのために書いたステートマシン、work-stealing スケジューラ、そして epoll ループ。本レッスンは \`.await\` の真下に何があるかです。

> 🛑 **スクロール前に予測。** \`async fn foo() { bar().await; }\` を書く。コンパイラは *何か具体的なもの* を生成する。**それは何?** 具体的に：
> - 結果の型はどのトレイトを実装する?
> - 通常の関数呼び出しと比較した実行時コストは?
> - \`await\` 点を跨いだローカル変数はどこに置かれる?
>
> どれか曖昧なら、このレッスンが必要なものです。

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

問題: 8 ワーカースレッド、タスクは数千。1 つの共有キューを 8 スレッドで奪い合わせずに、どう分配する? Tokio の答えは、各ワーカーに自分専用の **ローカルキュー**(競合なし、安価)を持たせ、フォールバックとして **グローバルキュー** を用意する。ワーカーが空になったら忙しい隣人のキューから **タスクを盗む**。

\`\`\`
ワーカー A: [task1, task2, task3, task4]   ← 忙しい
ワーカー B: []                              ← アイドル、Aから盗む
ワーカー A: [task1, task2]
ワーカー B: [task3, task4]
\`\`\`

これでグローバルロックの競合を避けつつ負荷分散できます。

> 🛑 **理解度チェック。** work-stealing がない場合、ワーカー間でタスクを分配する代替案は何? なぜそれが悪いのか? (ヒント: 単一の共有キューに対するグローバル mutex を考える、競合下のホット。)

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

> 🛑 **予測。** ルールを無視。\`expensive_sync_calc()\` を async fn の中で直接呼ぶ。ノードは動く。**本番での症状は何?** 具体的に — Prometheus / ダッシュボードに何が表示される? oncall はどう発見する? (ヒント: クラッシュではない。)

## 4. チャネル — 適切な選択

| チャネル | 用途 |
| :--- | :--- |
| \`tokio::sync::mpsc\` | 多生産者・1消費者 |
| \`tokio::sync::broadcast\` | 1生産者・多消費者（例：チェーンイベント） |
| \`tokio::sync::watch\` | 最新値ブロードキャスト（例：最新ブロック） |
| \`tokio::sync::oneshot\` | 単一値、リクエスト/レスポンス |

ExEx はチェーン通知に **broadcast** を使います。すべてのExExがすべてのイベントを受け取るため。

> 🛑 **理解度チェック。** ExEx はなぜ \`mpsc\` を使わない? 3 つの ExEx を登録した場合、\`mpsc\` だとイベント配信に何が起きる? \`broadcast\` が防いでいる失敗モードを書き出してください。

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

> 🛑 **予測。** バックグラウンド「pruner state 検証」タスクを \`spawn_task\` で起動。6 週間後、破損したエントリで panic。Reth は動き続ける。**ユーザに見える症状は何?** なぜインフラでは「大声で失敗」が「静かに失敗」より良いのか?

これが本番の規律：静かに死んだバックグラウンドタスクのせいで、劣化状態でノードが動き続けるのは避けたい。**クリティカルなタスクは大声で失敗する**。

\`TaskExecutor = Runtime\` のエイリアスは、生Tokio型を引き回さずにステージコードに渡せる — セーフティネット付きのきれいな抽象化。

## 7. 読み物リスト

- \`tokio/tokio/src/runtime/scheduler/multi_thread_alt\` — 現代のマルチスレッドスケジューラ
- \`reth/crates/tasks/src/runtime.rs\` — RethのTokio監視ラッパ

このレッスンを終えると、「Tokio = 魔法」が「Tokio = work-stealing付きステートマシンドライバ。Rethはそれをパニック監視で包んでいる」になります。

> 最終チェック: \`async fn\` と \`fn\` の **Rust の型としての** 違いを、一文で。「片方は Future を返し、片方は返さない」と答えたら深掘り — Future とは構造的に *何* なのか? **「Tokio = 魔法」が「Tokio = コンパイラ生成のステートマシンを work-stealing スケジューラで poll する」になるまで、このレッスンはあなたを離しません。**`,
                },
                {
                  title: '手続きマクロ — `sol!`と`address!`の中身',
                  slug: 'procedural-macros-ja',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 15,
                  xpReward: 35,
                  content: `# 手続きマクロ — \`sol!\`と\`address!\`の中身

\`address!("0xabc...")\` は関数呼び出しに見えますが **コンパイル時に走ります**。\`sol! { contract IERC20 { ... } }\` も同じ。

> 🛑 **スクロール前に予測。** \`address!("0xabc123...")\` を書いたとき：
> - hex のパースは **どこ** で起きる — コンパイル時か実行時か?
> - コンパイル時なら、Rust コンパイラの **どのツール** がそれをやる?
> - \`address!("0xZZZ")\` を書いたら、どんなエラーが出る?
>
> 予想を立ててから先へ。このレッスンには \`address!\` について、世間の説明と意見を異にするサプライズが少なくとも 1 つあります。

## 1. 3種類

| 種類 | 見た目 | 例 |
| :--- | :--- | :--- |
| **関数風** | \`my_macro!(...)\` | \`address!\`、\`sol!\` |
| **derive** | \`#[derive(MyTrait)]\` | \`#[derive(Serialize)]\` |
| **属性** | \`#[my_attr]\` | \`#[tokio::main]\` |

いずれも Cargo.toml に \`crate-type = ["proc-macro"]\` を書いたクレートに住みます。コンパイラはそうしたクレートをプラグインのようにロードし、中の関数を呼びます。関数は \`TokenStream\`(マクロ入力を字句解析したが型検査はまだのトークン列)を受け取り、別の \`TokenStream\`(コンパイラがその場所で続けてコンパイルしていく代替コード)を返します。

## 2. ツールチェイン

\`\`\`mermaid
flowchart LR
    Src["ソースコード<br/>sol! マクロ"] -->|コンパイラがマクロ呼び出し| In[入力 TokenStream]
    In -->|syn::parse| AST[Rust / DSL AST]
    AST -->|あなたのロジック| Tree[生成された AST]
    Tree -->|quote!| Out[出力 TokenStream]
    Out -->|コンパイラ続行| Compiled[コンパイル後のバイナリ]
\`\`\`

ほぼ2クレートで完結：

| クレート | 役割 |
| :--- | :--- |
| \`syn\` | TokenStreamをRust ASTにパース |
| \`quote\` | テンプレートからTokenStreamを生成 |

## 3. 本物の \`address!\` マクロ

驚くかもしれません：**\`address!\` は手続きマクロではありません**。普通の \`macro_rules!\` 宣言的マクロです。

> 🛑 **\`address!\` が宣言的だけなら、何に委譲しているのが手続きマクロ?** 予測 → 下のソースで検証してください。

これが [\`crates/primitives/src/bits/macros.rs\`](https://github.com/alloy-rs/core/blob/main/crates/primitives/src/bits/macros.rs) の本物のソース：

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

> 🛑 **理解度チェック。** \`$d:tt\` のトリックを取り除いて、内側マクロにそのまま \`$\` を書いたら、コンパイラは何のエラーを出す? (ヒント: 「シンタックスエラー」ではない — どっちのマクロがメタ変数を所有するかについてのエラー。) エラークラスを予測できなければ、このトリックはあなたにとってまだ伝承です。

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

> 🛑 **予測。** \`balanceOf(address)\` のセレクタは \`0x70a08231\` — \`keccak256("balanceOf(address)")\` の先頭 4 バイト。**この keccak ハッシュはビルドのどの時点で計算される?** 「実行時、初回 .balanceOf 呼び出し時」と答えたら読み直し — それこそ \`sol!\` が排除する実行時コスト。

## 5. proc macro を書くべき場面

- **何度も同じ定型コード** がコンパクトな1行マクロに圧縮できるとき
- **コンパイル時バリデーション** ができるとき（例：address のパース）
- **DSL 級の使い心地** に値する規模感のとき

「1回しか書かない5行を浮かせる」ためには書かない。

## 6. デバッグTip

\`cargo expand\` でマクロが生成しているコードが見えます。**詰まったら必ず展開を見る**。

\`\`\`bash
cargo install cargo-expand
cargo expand --bin my_app
\`\`\`

コード生成のミスを目で確認できます。

> 最終チェック: \`macro_rules!\` と手続きマクロの違いを一文で。「片方が古い」だけなら深掘り — 各々が何を操作し、どこで走る? **Rust のエコシステムはこの区別の上に成り立っています。理解せずにバイナリを構築するコードは読めません。**`,
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

EVM の中で SHA-256 を使いたいとします。道は 2 つ: 新しい **Opcode** を足す(命令ストリームに新しいバイトを — \`ADD\` の隣に \`SHA256\`)、あるいは **Precompile** を足す(コントラクトが \`CALL 0x00...02\` した瞬間に EVM が呼び出すネイティブ Rust 関数)。本物の Ethereum は後者を選んだ: アドレス \`0x01\`〜\`0x0a\` に ecrecover、sha256、modexp、BN254 楕円曲線演算が並んでいます。Foundry の cheatcodes (\`vm.deal\`、\`vm.warp\`) も、産業規模での同じトリックです。

カスタム Opcode はあらゆるウォレット・インデクサ・Solidity コンパイラとのコンセンサスを破ります。カスタム Precompile は **破らない**。本レッスンは、なぜ答えが違うのか、そして自分で登録する方法です。

> 🛑 **スクロール前に予測。** カスタム *Opcode* はメインネットとのコンセンサスを破る (Advanced で見た通り)。カスタム *Precompile* は破らない — 同じく vanilla EVM になかった新コードなのに。**なぜ答えが違う?** EVM バイトコードパーサーを引いて仮説を立ててください。

## 1. Opcode vs Precompile

| | Opcode | Precompile |
| :--- | :--- | :--- |
| **呼び出し方** | バイトコード命令 | 特定アドレスへの \`CALL\` |
| **追加方法** | インタープリター改造 | precompile レジストリへの登録 |
| **ツールへの影響** | Solidity・ABI 破壊 | ほぼ透過 |
| **用途** | 内側の高頻度ループ | ペアリング・ハッシュなど重い演算 |

実Ethereumは既に 0x01〜0x0a に precompile を持ちます（ecrecover, sha256, ripemd160, identity, modexp, BN254 ops, BLAKE2F, point eval）。

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

> 🛑 **予測。** identity precompile を 1 KB の入力で CALL する。**ガスコストを計算してください。** 計算過程を示す: 何ワード? 計算式は? 答えは? 計算できないなら、ガス計算は数字のままです — 今やってください。

## 3. カスタムprecompileを登録する

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

> 🛑 **読む前に予測。** \`vm.deal(addr, 1 ether)\` は状態を変更します — 任意のアカウントに何もないところから ETH を与える。**標準 precompile は状態を変更できません** (\`identity_run\` を見る — 純粋関数、入力 → 出力)。では Foundry はどうやって \`vm.deal\` を実装する? 仮説を立てて。

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

これで通常コードからは安く、悪用には法外に高い precompile になります。

> 最終チェック: precompile をガスコスト = 100 でリリース。攻撃者が **同じ 100 ガスで通常の 10 倍の CPU 時間** を要する入力形を発見。**経済攻撃は何? 攻撃者がノード CPU 1 秒あたりにいくら払う?** 計算をスケッチできないなら、precompile を安全に価格設定できません — セクション 6 と Ethereum の EIP-2929 を読み直して、メインネットで実際の安すぎが何のコストになったか確認。`,
                },
                {
                  title: 'Merkle Patricia Trie & 状態証明',
                  slug: 'mpt-state-proofs-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 18,
                  xpReward: 40,
                  content: `# Merkle Patricia Trie & 状態証明

スマホ大のデバイスが「Alice のアカウントは 1 ETH 持っているか?」を知りたい — ただし Ethereum の 500GB 状態は持てない。だからフルノードに問い合わせると、返ってくるのは **数百バイト**。デバイスはハッシュループを回し、結果を **手元の信頼済み 32 バイト** と比較する。暗号学的な答えが得られる: yes か no か。これがライトクライアントです。手元の 32 バイトが Ethereum の **stateRoot**、そしてこれを可能にするデータ構造が **Merkle Patricia Trie (MPT)**。

MPT を理解すれば、stateRoot・ライトクライアント・witness・\`eth_getProof\`・ステートレスクライアントのロードマップがすべて繋がります。自分で実装することもできます。

> 🛑 **スクロール前に予測。** あなたは「アカウント X の残高は Y」を **暗号学的に証明したい** — フル状態を持たず、信頼済み 32 バイトのルートだけ持つ検証者に対して。**プロトコルをスケッチしてください。** 検証者に何を送る? 検証者は何をハッシュする? どうやって proof or rejection を結論する?
>
> 3-4 行書いてから、レッスンを読んで何を取りこぼしたか確認。

## 1. MPT とは何か

3つの考えを合わせたもの：

- **Trie**：ルートからリーフへの経路がキーを綴る木
- **Patricia**：単一子ノードを潰して trie をコンパクトに
- **Merkle**：各ノードが子のハッシュを保持 → ルートが全データをコミット

結果：**256ビットの \`stateRoot\`** が世界状態を一意に識別する。1バイトでも変えればルートが変わる。

> 🛑 **理解度チェック。** Patricia の経路圧縮は最適化です。**圧縮なしで普通の trie を使うとコストは何?** Ethereum がなぜわざわざ複雑さを足してまで気にするのか? (ヒント: 64 ニブルのキー、ほぼ空の trie。圧縮あり vs なしで経路はいくつのノードを通る?)

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

\`\`\`mermaid
graph TD
    R[Branch — ルート<br/>16 子スロット]
    R -->|nibble| E[Extension<br/>共通プレフィックス]
    R -->|nibble| L1[Leaf<br/>アカウント → 値]
    E --> B[Branch]
    B -->|nibble| L2[Leaf<br/>アカウント → 値]
    B -->|nibble| L3[Leaf<br/>アカウント → 値]
\`\`\`

各親は子の **ハッシュ** を保持しているので、ルートハッシュは下にある全バイトにコミットしている。どこか1スロット変えれば → 上位の親が全て再ハッシュ → \`stateRoot\` が変わる。

## 3. 包含証明を6ステップで

「アカウントXの残高がY」を証明するには：

1. ルートからXのキーへ向かって辿り、経路のノードを集める
2. 各ノードは子を **ハッシュ** で参照（ポインタではない）
3. 検証側に必要なのは経路ノードだけ。trie全体は不要
4. リーフを再ハッシュし、上に向かって親を再ハッシュ
5. 結果のルートを **信頼済み \`stateRoot\`** と比較
6. 一致 → Xの残高が本当にYだと確認

これだけ。**ライトクライアントは「信頼ルートを持つ検証器」** にすぎません。

> 🛑 **予測。** あなたはアカウント X の witness を受け取る — trie ノードのバイトリスト。検証者はルートまでハッシュアップ。**検証者が必要だが witness にないものは何?** 検証者の唯一の secret/trusted な入力は何? 答えられないなら、これを *暗号学的* にしている要素 (「あなたが送ったバイトを信用する」ではない) をまだ理解していません。

## 4. Witness（証人データ）

**Witness** とは、ブロックを *再実行するために* 必要な trie ノードだけを束ねたもの。「500GB の DB を寄越せ」ではなく「このブロックが触った部分だけ寄越せ」。zkEVM プローバが消費(zkVM 内ではディスクを読めない)。ステートレスクライアントが使う(同期せずに検証するため)。一部の MEV サーチャーがフォークシミュレーションに使う。

典型的なブロックの witness は数百 KB 〜 数 MB。

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

> 🛑 **予測。** 非包含証明が実用で役立つのはいつ? 「このアドレスはトークンを一度も保有していない」を証明したい具体的なシナリオを 1 つ挙げてください。(ヒント: airdrop、シビル耐性、slashing 適格性 — 1 つ選んでプロトコルを追跡。)

### \`StorageProof.nibbles: Nibbles\`
ストレージキーのニブル表現を事前計算してキャッシュ。ニブル変換はホットパスにあるため。

### \`AccountProof::verify(&self, root: B256)\`
純粋ロジック — 信頼済みstate rootを与えれば、証明を検証する。**これがライトクライアント検査の全て**。数百バイトのバイトコード、ミリ秒で走り、状態に対する暗号学的保証を与える。

## 6. 落とし穴：ストレージtrie

> 🛑 **予測。** 各コントラクトがなぜ **自分専用** のストレージ MPT を持つのか? Ethereum が \`(contract, slot)\` をキーとする 1 つの巨大な MPT を使っていたら? トレードオフを書き出してください。

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

これで \`eth_getProof\` が「魔法」ではなく「読めて、書けて、デバッグできる構造」になります。

> 最終チェック: 二文で、なぜ state proof が「私を信じて、ノード運用者だから」より強い保証を与えるのか説明してください。Merkle ハッシングが暗号学的でない主張に与えられない性質は何? **ライトクライアントを使ったことがない人を納得させられるまで、このレッスンはあなたを離しません。**`,
                },
                {
                  title: 'Stateless Ethereum — ress と stateless-validator を並べて読む',
                  slug: 'stateless-ethereum-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 18,
                  xpReward: 45,
                  content: `# Stateless Ethereum — ress と stateless-validator を並べて読む

今日のメインネットで Reth フルノードを動かすには **~3 TB のディスク** と、それに見合う IOPS が必要です。このレッスンを読んでいる人のほとんどはそれを動かせません — ラップトップでは無理、一般的な VPS でも無理、趣味の NUC でも無理。だからフルノードを実際に動かす人々は小さな祭司階級になり、Ethereum の「誰でも検証できる」という主張は、バリデータ層では静かに事実でなくなります。

**ステートレスクライアント** がその出口です。Paradigm の [\`ress\`](https://github.com/paradigmxyz/ress) は **14 GB** のディスクでメインネットの全ブロックを再検証します。MegaETH の [\`stateless-validator\`](https://github.com/megaeth-labs/stateless-validator) は高 TPS の L2 をコモディティハードウェアで再検証します。両方とも Rust。両方とも Ethereum 等価の状態遷移を検証する。そして興味深いすべてのレイヤで **異なる設計選択** をしています — 並べて読むのが、その選択肢が何なのかを学ぶ最も安い方法です。

> 🛑 **スクロール前に予測。** 「ステートレス」ノードはフル状態を持たずにブロックを検証する。**ブロックプロポーザーは普通のノードに送らないものを、ステートレスノードには何を送らないといけない?** その追加ペイロードは何と呼ばれる? Ethereum の典型的なブロックでサイズを見積もってください。両方の答えはセクション 3 で出てきます。

## 1. 「ディスクが少ない」を超えて、なぜステートレスが大事か

ress に付随する [Paradigm のブログ記事](https://www.paradigm.xyz/2025/03/stateless-reth-nodes) は 4 つのユースケースを挙げています。どれも「HDD を節約する」ではありません。

- **L1 の分散化。** ラップトップを持つ誰もが、完全検証する実行クライアントを動かせる。バリデータ集合がハードウェアでゲートされなくなる。
- **L1 ガス上限の拡張。** 現在のガス上限は「**ステートフル** なフルノードが追従できる範囲」がボトルネック — state read のランダム I/O が支配的だから。ステートレス検証者はメモリから witness を読む。I/O の天井が動く。
- **Optimistic L2 のセキュリティ。** Fraud-proof の見張り役は、見張る L2 ごとに \`reth\` を動かしたくない。チェーンごとのステートレス検証者なら安い。
- **Native rollups.** Vitalik が描いた「サービスとしての EVM」方向には、L1 に埋め込んだ再実行可能な検証者が要る — そしてその検証者は 3 TB の状態を抱えられない。

つまりステートレスは「小さいノード」のための機能ではない。**検証者層の機能**で、Ethereum を安く・繰り返し・場合によっては zkVM 内で・場合によっては数百のチェーンで同時に — 再実行する必要がある特定クラスのクライアントのためのもの。

## 2. 「ステートレス」の正確な意味

ステートレスクライアントは、**ワールド状態全体をストレージに持たずに** ブロックを検証する。そのために、ブロックが行うすべての state read (とブロックが再計算しなければならない post-state root) は、**witness** から来なければならない — 前ブロックの信頼済み state root に対して、ブロックが触るスロットにどんな値があったかを暗号学的に証明する束。

ステートレス側は残りの状態を見ない。post-state root だけは見て・再導出する。そしてそれが *次の* witness の信頼済みルートになる。

witness はどこからか来なくてはならない。あらゆるステートレス設計で、**ステートレスでない誰か** (ress なら Reth フルノード、stateless-validator なら MegaETH の sequencer) がそれを生成する。この非対称性こそが取引の核心: 少数のステートフルな witness 提供者を置くことで、はるかに多くのステートレス検証者が成立する。

> 🛑 **理解度チェック。** 「ステートフルピアからの witness」は信頼に聞こえます。**でも信頼ではない、なぜ?** ステートレスクライアントは witness の中の値に触る *前に* 何を暗号学的に検査する? 答えが「ピアを信頼する」なら、[MPT レッスン](mpt-state-proofs-ja) のセクション 4 を読み直してください — 暗号学的な部分を取りこぼしています。

## 3. 二つの独立した実装

2026 年時点で、本番品質の Rust 製ステートレスクライアントが 2 つ存在する。違うチームが、違うチェーンのために、違う優先順位で作った。**それがプレゼントです** — ほとんどのカリキュラムは参照実装を 1 つしか手にできない。我々には 2 つある。

### Paradigm の \`ress\` (Reth Stateless)

- **リポジトリ:** [\`paradigmxyz/ress\`](https://github.com/paradigmxyz/ress)
- **対象チェーン:** Ethereum メインネット、完全検証。
- **ディスク:** 14 GB (フル Reth の ~3 TB に対して)。
- **Witness ソース:** \`--ress.enable\` で起動した任意の Reth フルノード。ress は専用 RLPx サブプロトコル \`ress\` でピアリングする — [Reth の \`crates/ress/protocol\`](https://github.com/paradigmxyz/reth/tree/main/crates/ress/protocol) 参照。
- **Witness フォーマット:** Merkle Patricia Trie の証明 (MPT レッスンで見たもの — \`AccountProof\` / \`StorageProof\` と同じ形)。
- **バイトコード:** ステートフルピアから **オンデマンド** で取得 (\`GetBytecode\` メッセージ経由)。ress は見たものをキャッシュし、未取得分はピアから引く。
- **検証フロー:** コンセンサスクライアントが \`NewPayload\` 送信 → ress が Reth ピアに witness と不足バイトコードを要求 → メモリ上で payload を検証 → \`PayloadStatus\` を返す。
- **本番ステータス:** 実験的。ただし Holesky で ress 駆動バリデータを実走し、Hive Cancun テスト 226 件中 206 件をパス。

### MegaETH の \`stateless-validator\`

- **リポジトリ:** [\`megaeth-labs/stateless-validator\`](https://github.com/megaeth-labs/stateless-validator)
- **対象チェーン:** MegaETH (Ethereum 互換、高 TPS の L2、OP-Stack 系)。
- **Witness ソース:** MegaETH の sequencer、専用 witness RPC エンドポイント (\`--witness-endpoint\`) で配信。
- **Witness フォーマット:** **SALT** の証明、MPT ではない — [\`megaeth-labs/salt\`](https://github.com/megaeth-labs/salt) 参照。SALT は静的な 4-レベル 256-ary trie で、葉が SHI ハッシュテーブルのバケット。Banderwagon + IPA でコミットする。約 1 GB のメモリで 30 億アイテムを authenticate。
- **バイトコード:** **部分ステートレス**。コントラクトコードは witness に **含まない**。バリデータはパブリック RPC からオンデマンドで取得し、有界 \`ContractCache\` (\`crates/stateless-db/src/cache.rs\`) にローカルキャッシュする。
- **検証フロー:** [\`crates/stateless-core/src/pipeline\`](https://github.com/megaeth-labs/stateless-validator/tree/main/crates/stateless-core/src/pipeline) で定義された 3 ステージのパイプライン (FETCH → PROCESS → ADVANCE)。複数の検証ワーカーが異なるブロックを並列処理する — 各ブロックが自分の witness と自分の pre-state root を持つので embarrassingly parallel。
- **実行エンジン:** **プラガブル**。デフォルトはバニラ revm。第二バックエンドは Pi² と共同開発した [EVM の形式 K セマンティクス](https://github.com/Pi-Squared-Inc/evm-semantics)。JIT コンパイルされた sequencer エクゼキュータと合わせて、MegaETH は同一の状態遷移関数に対して **3 つの独立クライアント実装** を持つ。
- **信頼モデル:** バリデータは状態遷移だけを検査する。カノニカル性は \`op-node\` が L1 + DA から L2 チェーンを導出することで担保 — これがバリデータを「単一の RPC プロバイダに対するトラストレス」ではなく **trust-minimized** にしている。

> 🔍 **リポジトリで確認。** [\`bin/stateless-validator/src/app.rs\`](https://github.com/megaeth-labs/stateless-validator/blob/main/bin/stateless-validator/src/app.rs) を開いて、バリデータがパイプラインを組み立てる箇所を探してください。ress の main エントリと比較 — 両者がノードの「外側のループ」として何を扱っているか?

## 4. サイドバイサイド

| 観点 | \`ress\` (Paradigm) | \`stateless-validator\` (MegaETH) |
| :--- | :--- | :--- |
| **対象チェーン** | Ethereum メインネット (L1) | MegaETH (L2) |
| **Witness フォーマット** | MPT 証明 | SALT 証明 (Banderwagon + IPA) |
| **Witness ソース** | Reth ピア、\`ress\` RLPx サブプロトコル経由 | Sequencer、\`--witness-endpoint\` JSON-RPC 経由 |
| **バイトコード処理** | ピアからオンデマンド取得・キャッシュ | RPC からオンデマンド取得、\`ContractCache\` にキャッシュ |
| **ステートレス度** | フル (state) | **部分** — state はステートレス、bytecode はそうでない |
| **実行エンジン** | revm (単一) | revm **と** 形式 K-セマンティクス (プラガブル) |
| **並列性** | 1 ブロックずつ (CL ペーシング) | ブロック横断で embarrassingly parallel (N ワーカー) |
| **カノニカル性** | コンセンサスクライアントを信頼 (Engine API) | \`op-node\` を信頼 (L1 + DA 導出) |
| **ディスクフットプリント** | ~14 GB | \`ContractCache\` + redb メタデータで有界 |

## 5. 部分ステートレスを選んだ理由を予測

> 🛑 **予測。** MegaETH は *部分的* ステートレスを選択: state は witness に入れ、bytecode は入れない。**なぜ?** bytecode が state と共有しない性質を 2 つ挙げてください。次に自分を検査: どんなワークロードパターンで、毎 witness に bytecode を含めるのが特に無駄になる?

MegaETH の README は明確: コントラクトコードは state に比べて **滅多に変わらない**。ホットな DeFi コントラクトは毎ブロック state を発信・読み込みするが、bytecode はデプロイ以来変わっていない。bytecode を毎 witness に埋めるとは、同じ 100 KB を毎ブロック再送ること。一度取って局所キャッシュするのは明らかな手 — *ただし* バリデータが小さな永続ストアを持つことを受け入れるなら (実際そうしている — \`crates/stateless-db/src/cache.rs\` の有界 \`ContractCache\`)。

ress は同じ簡単な勝ちを得られない。メインネットを対象にしていて、1 チェーン分のコントラクトコードは大きいが無際限ではない、そして「全部 1 つのピアから来る」という対称性がプロトコルを単純にしている。チェーンが違えば、取引も違う。

## 6. 二つの実行エンジンを選んだ理由を予測

> 🛑 **予測。** MegaETH の README はバリデータが **2 つ** の実行エンジン (revm と形式 K-セマンティクス) をサポートし、sequencer がさらに 3 つ目 (JIT コンパイル) を加えると述べている。**同じ STF の独立実装を 3 つ走らせて得られる性質で、十分にテストされた 1 実装で得られないものは何?** 二文で答えてください。

revm のコンセンサスバグは、存在するすべての Reth フォーク横断のコンセンサスバグになる。MegaETH が revm 系クライアントだけを走らせていたら、ひとつの微妙なインタプリタバグ — バージョン間で revm 自身が共有しているものですら — がチェーンを分裂か凍結させ、第二意見が得られない事態を生む。形式仕様の K-セマンティクス エクゼキュータは、バギーな revm と **設計上** 異なる動きをする: そのバグは数学的に存在しない。MegaETH の README はこれを **小さな Trusted Computing Base** 原則と呼び、プラガブルなエンジンを single-point-of-failure を防ぐためのものと明示している。

これがまた、バリデータが **シングルスレッドのバニラ revm インタプリタとメモリ内ストレージ** をデフォルトに選んだ理由でもある — 性能よりシンプルさ。TCB を徹底監査できるほど小さく保つため。JIT コンパイルの sequencer が性能の代価を払うので、バリデータが払わなくていい。

## 7. 対比だけが教えること、片方では教えられないこと

ress しか読まなかったら、こう思い込んでしまう:

- Witness は MPT 証明である (常にそうではない)
- ステートレス = フルステートレス (そうある必要はない)
- 実行エンジンは EVM のインタプリタである (それは選択肢)
- ステートレスクライアントはコンセンサスレイヤにペースを合わせる (そうである必要はない)

stateless-validator しか読まなかったら、こう思い込んでしまう:

- ステートレスクライアントには常にカスタムコミットメントスキームが必要 (メインネット系は MPT)
- ステートレスクライアントには常に L2 流の trust-minimized 導出パイプラインが必要 (メインネット系は Engine API)
- ステートレスは L2 形状である (そうではない — Paradigm の主張は明示的に L1)

対比が教えるのは、ステートレス設計の **自由度** です。上の表の各観点は、誰かが下した設計選択であって、ステートレスについての事実ではない。自分のチェーンのためにいずれかをフォークするとき、それがあなたが回すダイヤルになる。

> 🔍 **リポジトリで確認。** [\`crates/stateless-core/src/evm_database.rs\`](https://github.com/megaeth-labs/stateless-validator/blob/main/crates/stateless-core/src/evm_database.rs) を開いて \`WitnessDatabase\` を見つけてください。\`revm::DatabaseRef\` を実装している — 実行中のすべての state read がここを通る。**witness にない読み込みでは何を返す?** その答えが witness 生成 (sequencer) と witness 消費 (validator) の間の契約。同じ契約が ress にも、別の形で存在する — 探してみてください。

## 8. 進む前のリコール

スクロールせずに:

1. ステートレスクライアントがディスク節約以外で有用な理由は? ディスク以外のユースケースを 2 つ。
2. Witness とは何か。検証者はその中の値を読む前に、それを *暗号学的に* 何に対して検査する?
3. \`ress\` と \`stateless-validator\` は bytecode について真逆の判断をした。各々の判断と、その背景にあるワークロード上の理由を述べてください。
4. なぜ MegaETH は同じチェーンに 2 つの実行エンジンを出荷する? それが防ぐ失敗は何?
5. セクション 4 の表の観点のうち、**1 つだけ**最も多くの下流設計を駆動するのはどれだと思うか? 一文で論じてください。

1–4 が怪しいなら戻る。5 を論じられないなら、**まだ対比を内在化していない** — 表はフラットなリストだが、各行はいくつもの他の行と繋がっている。そのうち少なくとも 2 つの繋がりを辿れるまで、このレッスンはあなたを離しません。

## 追加で読むもの

- [Paradigm ブログ: Stateless Reth Nodes](https://www.paradigm.xyz/2025/03/stateless-reth-nodes) — セクション 1 のユースケース整理はここ由来。
- [\`paradigmxyz/ress\`](https://github.com/paradigmxyz/ress) — README → \`bin/\` のエントリ → [\`paradigmxyz/reth/crates/ress/protocol\`](https://github.com/paradigmxyz/reth/tree/main/crates/ress/protocol) の RLPx サブプロトコル。
- [\`megaeth-labs/stateless-validator\`](https://github.com/megaeth-labs/stateless-validator) — README → \`crates/stateless-core/src/pipeline\` → \`crates/stateless-core/src/executor.rs\`。
- [\`megaeth-labs/salt\`](https://github.com/megaeth-labs/salt) — MegaETH の witness フォーマットで MPT を置き換える authenticated KV store。`,
                },
                {
                  title: '本番MEV — Mempool・ExEx・シミュレーション',
                  slug: 'mev-in-practice-ja',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 20,
                  xpReward: 45,
                  content: `# 本番MEV — Mempool・ExEx・シミュレーション

ペンディング tx が mempool に届く。80 ミリ秒後、あなたのバンドルは当たったか、外れたか — 同じ tx を 5ms 速くデコードし、結果を 10ms 速くシミュレーションし、同じビルダーに 2ms 先に提出した競合サーチャーに敗れる。MEV(Maximal Extractable Value — tx 並び替え権を持つ者がペンディングトランザクションから抽出できる利益)は、**システムエンジニアリングとゲーム理論が 1 桁ミリ秒スケールでぶつかる場**。本レッスンは、2026 年時点の本気のパイプラインの形です。

> 🛑 **スクロール前に予測。** Ethereum のブロックタイムは 12 秒。**にもかかわらず本気の MEV パイプラインは end-to-end で <100ms を狙う。** なぜ予算がそこまでタイトなのか? 残りの ~11.9 秒を何が食う? 競争・ネットワーク伝播・ブロックプロポーザータイミングのいずれかを引いて仮説を立ててください。

## 1. パイプライン

\`\`\`mermaid
flowchart LR
    M[Mempool<br/>ExEx + devp2p] --> D[デコード<br/>Alloy sol!]
    D --> S[シミュレータ<br/>Revm + DB]
    S --> St[戦略<br/>Rust ロジック]
    St --> B[バンドル組成<br/>Alloy encode]
    B --> Sub[送信<br/>Flashbots / 直接]
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

これが **本番形のMEVデコード**。\`flat_map\` 2 段 + 最後に \`filter_map\` の重ね合わせ：

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

> 🛑 **理解度チェック。** 3 段ネストしたイテレータ ( \`flat_map\` 2 + \`filter_map\` 1 ) を 1 つの \`fold\` に潰せる? 著者がなぜこの形を選んだ? (ヒント: イテレータの遅延評価と、フィルタが早いか遅いかを考える。)

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

> 🛑 **予測。** ターゲットスロットの親ブロックではなく、\`latest\` に対してシミュレーションする。**何が壊れる?** 具体的に — シミュレータが見るが実ブロックでは見えないものは何? (ヒント: バンドル内の被害 tx は、シミュレータの「latest」ビューでは既に実行済み。)

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

> 最終チェック: バンドルがブロック 1000 に当たった。チェーンが reorg してブロック 1000 が置き換えられた。**あなたのお金 — 自分の ETH、被害者の ETH、払ったガス — はどこにある?** P&L を reorg 越しにトレース。できないなら、ExEx に ChainReverted ハンドラがある理由をまだ理解していません — Advanced ExEx レッスンを再読。`,
                },
                {
                  title: 'zkEVM with Revm',
                  slug: 'zkevm-revm-ja',
                  type: 'CONTENT',
                  sortOrder: 4,
                  duration: 15,
                  xpReward: 35,
                  content: `# zkEVM with Revm

Linea、zkSync、Scroll、Polygon zkEVM — どの本番 zkEVM ロールアップも同じ主張をしています: 「verifier は我々を信用しない、verifier は 250 バイトの証明を検査するだけ」。再実行なし、運用者を信用するでもない。32 バイトのコミットメント、SNARK か STARK、そして yes/no を返すスマートコントラクト。

証明を生成する主体を **プローバ** と呼びます。プローバが動かすのは geth でも nethermind でもなく — **Revm**、Rust 製の EVM を **RISC-V**(zkVM が安価にモデル化できる、よく整理された縮小命令セット CPU アーキテクチャ)にコンパイルし、zkVM の中で実行します。本レッスンは、なぜ Revm が選ばれるのか、プローバ側のコードが実際にどう書かれるのかです。

> 🛑 **スクロール前に予測。** Risc0 と SP1 は Ethereum 実行を zkVM 内で証明するのに **Revm** を使い、geth は使わない。**zkVM 内で使うのに Revm が正しい選択である性質を 3 つ挙げてください。** (ヒント: zkVM が罰するもの — 非決定性、syscall、巨大バイナリ、動的ディスパッチ。Revm はこれらすべてに優しい。)

## 1. プルービングスタック

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

> 🛑 **理解度チェック。** 「1 バイトでも間違えば失敗」。**検証者はそれが間違っているとどうやって知る?** 正確なメカニズムは何 — 検証者は何を何と比較する? MPT レッスンで学んだ — スクロールせずに想起。できないなら、なぜこの証明が *暗号学的* なのかをまだ理解していません。

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

## 4. なぜ Revm なのか

- **モジュラー**（Database トレイトのおかげで witness/oracle パターンが綺麗）
- **決定論的** — 同じ入力で同じ出力
- **CPUで速い** → サイクル数が少ない → 証明サイズも小さい

Go製のGethを zkVM 用にコンパイル＆最小化するのは悪夢。Revm は素直に動く。

## 5. Witness パターン

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

> 🛑 **予測。** 攻撃者が、コールが必要とする 1 つのストレージスロット *以外* はすべて正しい状態を持つ witness を含む Input を提出する。**guest のどこで abort する?** プローバが見える失敗は何? 具体的に — どの行か言ってください。

## 6. 性能の現実

2026年のEthereum 1ブロック証明：

| システム | 証明時間（1ブロック） | ハードウェア |
| :--- | :--- | :--- |
| **Risc0** | 数秒〜数分 | GPU |
| **SP1** | 数秒 | GPU + 再帰 |
| **専用zkEVM (Linea, Scroll)** | 1秒未満/ブロック | 専用インフラ |

汎用zkVM（Risc0/SP1）は **柔軟性のために** プローバ速度をある程度諦めています — 任意のRustプログラムを証明できる。専用zkEVMは速いが全部自作。

> 🛑 **予測。** 専用 zkEVM (Linea, Scroll) は **ブロックあたり Risc0 より桁違いに速い**。**にもかかわらず Risc0 を使う理由は何?** 速度の遅さに対して汎用性が値する本番シナリオを 2 つ挙げてください。

## 7. なぜ重要か

- **zkEVM L2** はこのパイプライン上に載る（Linea、zkSync、Scroll、Polygon zkEVM）
- **Optimistic Rollup** も「妥当性証明によるファストファイナリティ」へ移行中
- **ステートレスクライアント** は状態保持なしで同期する未来 — witness ＋ 証明依存

[risc0/risc0-ethereum](https://github.com/risc0/risc0-ethereum) を読むのが zk × Revm の本番版を理解する最短ルート。

## 8. 練習

「分かった」と言う前に、最小の host/guest を書いてみる：

1. guest が整数2つを読み和を返す
2. host が証明を作って検証
3. guest を 1tx ブロックでRevmを呼ぶ形に拡張
4. guestのサイクル数を前後で比較 — そこに性能の戦場がある

これで「L2プローバ」が実際にやっていることが分かります。

> 最終チェック: 二文で、EVM 実行の zk 証明を **トラストレス** にしているのは何か説明 — ノード運用者が「ブロックを実行した、これが結果」と主張するだけの場合と比較して。答えに verifier 側のチェック（commitment + verifier コントラクト内での再計算）が出てこなければ、このレッスンはまだあなたを離しません。`,
                },
                {
                  title: '本番でのRethフォーク運用',
                  slug: 'reth-fork-production-ja',
                  type: 'CONTENT',
                  sortOrder: 5,
                  duration: 18,
                  xpReward: 40,
                  content: `# 本番でのRethフォーク運用

午前 3 時。あなたのバリデータは 40 分前からブロックを生成していない。ダッシュボードには: ファイルディスクリプタ枯渇、MDBX ページキャッシュ圧迫、ピア数 2。どれもユニットテストでは引っかからない。出荷した日にも見えない。3 ヶ月目に、まとめてやってくる。本レッスンはその午前 3 時のページャーを防ぐ **運用チェックリスト** — ビルドフラグ、systemd の上限、バニラに対する diff テスト、現実との接触に耐えるためのデプロイトポロジー。

> 🛑 **スクロール前に予測。** あなたはフォークを **デフォルトの \`cargo build --release\`** でリリースする — jemalloc なし、asm-keccak なし、\`target-cpu=native\` なし。**1 週目、4 週目、3 ヶ月目** に見える本番症状をリストアップ。(ヒント: どの症状はゆっくり忍び寄る? どれは即ヒットする?)

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

> 🛑 **理解度チェック。** \`LimitNOFILE=8192\`（デフォルト的な値）に設定。Reth は数時間動いて、それから壊れる。**ログでの失敗シグネチャは何?** どのシステムコールがエラーを返し、Reth はそれをどう処理する? エラーメッセージを予測できなければ、それで oncall シフトを 1 つ無駄にします。

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

> 🛑 **予測。** あなたの diff ハーネスがブロック N で stateRoot 差分を報告。**あなたのフォークで** 最も疑わしい根本原因を 3 つ挙げてください（バニラ Reth のバグではなく、あなたのフォークの）。具体的に — どの変更が第一容疑者? 第二は? 答えられないなら、フォークのアクティブな変更が多すぎてデバッグ不能 — 自分のコミットを再読。

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

> 🛑 **予測。** ブロック 1000 でアクティベーションを発表。4 バリデータのうち 3 が時間内にアップグレード。4 つ目はしない。**ブロック 1001 で各バリデータは何を見る?** チェーンが分岐を検知するのはいつ? 遅れたバリデータの **回復経路** は?

## 8. 読み物

- [Reth Book "Run a node" + "Custom chain"](https://reth.rs/) のセクション
- 主要チェーンの障害ポストモーテム — 運用の直感を得る金鉱

これで「開発・プロファイル・拡張・デプロイ・監視」が全部つながりました。少数派のクラブへようこそ。

> 最終チェック: なぜ「バニラ Reth に対する diff テスト」がフォークに対して書ける最も価値の高いテストなのか、一文で。**ユニットテストでは決して捕まえられないバグの種類は何?** 答えに「コンセンサス」または「重要な唯一の出力は stateRoot」と出てこなければ、セクション 5 を再読。`,
                },
                {
                  title: 'Expertまとめクイズ',
                  slug: 'expert-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 6,
                  duration: 15,
                  xpReward: 50,
                  content: `# Expertまとめクイズ

本番エンジニアリング層の総仕上げ。`,
                  quizQuestions: [
                    {
                      question: 'Rethがチェーン状態に RocksDB ではなく MDBX を採用する理由は？',
                      options: [
                        'RocksDB の LSM ツリーのコンパクションは書き込みスループットを上げるが読み取りレイテンシを不安定にする — Reth は予測可能なレイテンシとロックフリー読み取りのため MDBX (B+tree + mmap + MVCC) を選ぶ',
                        'MDBX はネイティブで範囲スキャンをサポートし、RocksDB はセカンダリインデックスの構築が必要',
                        'MDBX は Rust 製なので Reth の他のスタックと統合しやすい',
                        'MDBX の mmap 設計は読み取りごとのカーネル/ユーザ空間コピーを排除する — RocksDB ではできない',
                      ],
                      correctIndex: 0,
                      explanation: 'Ethereum は読み取り重く・レイテンシ敏感。MDBX は C 製で Rust ではない (選択肢 3 を除外)。RocksDB はイテレータ経由で範囲スキャンをサポート (選択肢 2 を除外)。選択肢 4 の mmap 主張は部分的に正しいが帰結であって設計の動機ではない — 動機は validator レイテンシのためのコンパクションストール回避。',
                    },
                    {
                      question: 'Reth フォークの Rust パフォーマンス最適化で最初にやるべきは？',
                      options: [
                        'ホットだと疑う関数に #[inline] ヒントを付ける',
                        'グローバルアロケータを jemalloc に切り替える — Reth は既にこれをやっている',
                        'プロファイル (flamegraph) とベンチマーク (Criterion) で **実際の** ホットパスを特定してから何かを変える',
                        'ホットループを std::simd 組み込みでベクトル化する',
                      ],
                      correctIndex: 2,
                      explanation: '早すぎる最適化は悪、見えない遅さはもっと悪い。他の 3 つの選択肢はそれぞれ本物の擁護可能な最適化 — しかし測定なしに適用するのが、このレッスンが防ごうとする失敗モードそのもの。',
                    },
                    {
                      question: 'Tokio ランタイム内で CPU 重い処理をやる正しい方法は？',
                      options: [
                        'tokio::spawn でラップして他の async タスクと並行に実行する',
                        'tokio::task::spawn_blocking — ブロッキング作業用にサイズ調整された別のスレッドプールに逃がす',
                        'std::thread::spawn を直接使い、CPU 作業が Tokio に触らないようにする',
                        '関数に #[tokio::task] アノテーションを付けて Tokio に適切にルーティングさせる',
                      ],
                      correctIndex: 1,
                      explanation: 'tokio::spawn (選択肢 1) も作業を非同期ワーカープールに置く — 直接呼ぶのと同じくランタイムを飢えさせる。std::thread::spawn (選択肢 3) は Tokio を完全にバイパスし JoinHandle 統合を失う。#[tokio::task] 属性は存在しない (選択肢 4 は捏造)。spawn_blocking が規律。',
                    },
                    {
                      question: '手続きマクロはいつ実行される？',
                      options: [
                        '実行時、ただし結果は初回呼び出し後にキャッシュされる',
                        'コンパイル時、入力 TokenStream を出力 TokenStream に変換する',
                        'パース時、レキサが走る前 — だから proc macro は raw バイトを使える',
                        'コンパイル後、リンク前、ビルドスクリプトパイプラインの一部として',
                      ],
                      correctIndex: 1,
                      explanation: 'proc macro はコンパイラがコードをパースする最中に走る — レキサの後 (選択肢 3 を除外)、リンクのずっと前 (選択肢 4 を除外)。実行時には呼ばれない (選択肢 1 を除外)。cargo expand で結果が見える。',
                    },
                    {
                      question: 'Revm における「カスタム Opcode」と「カスタム Precompile」の主要な違いは？',
                      options: [
                        'Opcode は EVM インタープリターループで実行される; Precompile は別プロセスで動き IPC 経由で通信する',
                        'Opcode は EVM 命令セットを変更する (バニラ EVM とのコンセンサスを破る); Precompile は予約アドレスへの CALL で呼べるネイティブ関数 (Solidity / ABI ツールにほぼ透過)',
                        'カスタム Opcode はメインネットで有効; カスタム Precompile は App-chain に限定される',
                        'Opcode は任意のコントラクトアドレスから呼べる; Precompile は特別な precompile 対応コンパイラを必要とする',
                      ],
                      correctIndex: 1,
                      explanation: '両方とも in-process で動く — IPC はない (選択肢 1 を除外)。カスタム Opcode はコンセンサスを破り、カスタム Precompile は破らない (選択肢 3 の **逆** が正しい)。Precompile は標準 CALL で呼べる — 特別なコンパイラ不要 (選択肢 4 を除外)。',
                    },
                    {
                      question: 'Ethereum が状態に Merkle Patricia Trie (MPT) を使う理由は？',
                      options: [
                        'Patricia trie は任意の 256 ビットキーに対する最速のインデックスデータ構造',
                        '世界状態全体を単一の 32 バイトハッシュにコミットでき、包含 / 非包含証明が可能で、パス圧縮で空間効率が高い',
                        'ハッシュ衝突攻撃に強い — 各木のレベルで異なるハッシュ関数を使うから',
                        'すべての葉を並列に変更でき、ロック不要 — staged sync に critical',
                      ],
                      correctIndex: 1,
                      explanation: 'MPT は最速のルックアップ構造ではない (選択肢 1 を除外 — HashMap のほうが速いが何にもコミットしない)。レベルごとに違うハッシュではなく keccak256 を全レベルで使う (選択肢 3 を除外)。並列変更は MPT の性質ではない — ルートまでの逐次再ハッシュが必要 (選択肢 4 を除外)。暗号学的コミットメントが全てのポイント。',
                    },
                    {
                      question: 'Revm を使った本番 zkEVM プルービングパイプラインで「witness」とは？',
                      options: [
                        'mempool でトランザクションを観測したことを証言するノード運用者からの暗号学的署名',
                        'ブロックがアクセスした状態値 (アカウント・コード・ストレージスロット・最近のブロックハッシュ) の集合 — zkVM 内ではディスクが読めないのでプローバが消費する',
                        'ブロックで使用された全 Opcode のガスコストを事前計算したテーブル',
                        '証明対象ブロックでスナップショットされたフルチェーン状態を zkVM に送り込む',
                      ],
                      correctIndex: 1,
                      explanation: '署名は関係ない (選択肢 1 を除外)。ガスコストは EVM 仕様の定数で witness の一部ではない (選択肢 3 を除外)。*フル* 状態を送ると目的が破綻する — witness は最小サブセット、スナップショットではない (選択肢 4 を除外)。witness にない値をブロックが読めば証明は失敗する。',
                    },
                    {
                      question: 'MEV サーチャーにとって ExEx が価値ある理由は？',
                      options: [
                        '標準のメインネット RPC より速く動く JSON-RPC シミュレーションエンドポイントを内蔵している',
                        'チェーンの commit / reorg / revert 通知をほぼゼロレイテンシで in-process でフル状態アクセスとともに受け取れる — ウォームキャッシュと高速シミュレーションに最適',
                        'Ethereum コンセンサスルールをバイパスし、サーチャーが代替順序を決定論的にシミュレーションできる',
                        'OS スケジューラが予約した CPU コアで動き、他のワークロードがプリエンプトできない',
                      ],
                      correctIndex: 1,
                      explanation: 'ExEx は RPC エンドポイントではない (選択肢 1 を除外) — Rust コードへのコールバック。コンセンサスをバイパスできない; 通知が従うルールそのもの (選択肢 3 を除外)。Tokio スケジューリングは OS レベルの CPU pinning と関係ない (選択肢 4 を除外)。本領は各チェーンイベントで得られる in-process のレイテンシ。',
                    },
                    {
                      question: 'カスタム Precompile の価格設定で守るべき大原則は？',
                      options: [
                        '同等の Solidity 実装の約 1/10 のガスに設定して採用を促進する',
                        'ガスコストは CPU コストに追従 — 典型的に最遅の現実的入力でベンチ、2〜5 倍の悪用係数を掛け、敵対的入力で検証',
                        'ユーザに対してガスモデルを予測可能に保つため、フラットな per-call コストを課す',
                        '最も似た標準 precompile (例: ecrecover) のガスコストをベースラインとして使う',
                      ],
                      correctIndex: 1,
                      explanation: '採用のための安すぎ (選択肢 1) こそ EIP-2929 が retrofit を強いられた DoS ベクター。フラットコスト (選択肢 3) は入力サイズが効く瞬間に破綻。他の precompile の数字を借りる (選択肢 4) は健全性チェックとしては良いが自分の CPU プロファイルを無視する。本物のワークフローは ベンチ → 悪用係数 → 敵対的検証。',
                    },
                    {
                      question: 'カスタム Reth フォークで App-chain を運用するときの現実的な最低限の本番デプロイは？',
                      options: [
                        '単一データセンター内に 1 つのロードバランサ越しに 3 バリデータを共存させる (最低レイテンシ)',
                        '3 データセンターに ≥4 バリデータを地理分散、各バリデータの前に sentry ノード、解析用に別 archive ノード、レート制限付き RPC フリート — バリデータと公開 RPC は決して同居させない',
                        '同じクラウドリージョン内に 5 バリデータ (リージョン跨ぎは合意レイテンシが増えすぎる)',
                        'active-passive failover の 2 バリデータとホットスタンバイ (運用チームを小さく保つ)',
                      ],
                      correctIndex: 1,
                      explanation: 'BFT 安全性は障害ドメイン跨ぎの定足数を要求 — 単一 DC (選択肢 1) と単一リージョン (選択肢 3) は 1 障害で崩壊。2 バリデータ (選択肢 4) はビザンチン振る舞いに耐えられない。現実的最低限は 地理分散 + sentry 分離 + 専用 RPC フリート、なぜなら公開 RPC への 1 度の DDoS でコンセンサスを止めてはいけないから。',
                    },
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
                  title: 'Reth 拡張パターン — フォークではなくライブラリ',
                  slug: 'reth-extension-pattern-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 14,
                  xpReward: 40,
                  content: `# Reth 拡張パターン — フォークではなくライブラリ

**op-geth**、**bsc-geth**、**bor** (Polygon) を触った経験があれば、geth-fork パターンの苦しみは知っているはずです。upstream をクローンしてパッチを当て、ずっと rebase し続ける。upstream マージのたびに週末がコンフリクト解消で潰れ、監査対象は徐々に mainline からドリフトしていく。

**Reth はこのモデルを終わらせるために設計されました。** Optimism、Base、Berachain、Scroll、Seismic、Sova、alphanet、Tempo — これらはすべて Reth 上で動いていますが、従来の意味での "fork" はほぼ存在しません。いずれも **reth をライブラリとして依存する node crate** であり、必要な部分だけを trait で override する形になっています。

> 🛑 **スクロール前に予測。** geth-fork のチェーンが、upstream から重大な security patch を取り込もうとしている状況を考えてください。fork は 18 ヶ月遅れ。**rebase にどれくらい時間がかかるか見積もり**、**rebase 自体が consensus bug を引き起こす経路を 3 つ** 挙げてください。

## 1. 二つのモデル

| Model | やり方 | 時間が経つほどのコスト |
| :--- | :--- | :--- |
| **Fork model** (geth 流) | upstream をクローン、ソースに patch、定期的に rebase | ドリフトコストは **超線形に増大** — パッチと upstream の距離が開き続け、コンフリクトが複利で効いてくる |
| **Extension model** (reth 流) | reth crate に依存、chain 固有の trait を別 crate で実装 | ドリフトコストは **局所化** — trait のシグネチャが変わったときだけ手を入れれば済む |

Reth のアーキテクチャ全体は二つ目のモデルを軸に組まれています。Advanced で見た NodeBuilder / components / ChainSpec パターンは、まさに **reth のソースを patch せずに chain を出荷する** ために存在しているのです。

## 2. Paradigm がこのモデルを選んだ理由

Paradigm は Reth、alphanet、**そして** Tempo のすべてを自社で開発しています。つまり自社が顧客でもある。三つの理由が拡張モデルを後押ししました。

1. **Rebase の痛みは現実。** Optimism の op-geth はフォーク乖離が深刻化し、Optimism 自身が書き直しに資金を投じることになりました — その成果は今 \`crates/optimism/\` として reth 本体に統合されています。
2. **監査の範囲。** Fork を読む監査人は upstream に対する diff を取り、すべての patch を一つひとつ理由づけしなければなりません。Node crate を読む監査人は repo を一つ、実装された trait の集合だけを見れば済みます。
3. **コンポーザビリティ。** Berachain は reth + 独自 consensus を、Scroll は reth + zk-friendly state を、Seismic は reth + 暗号化 tx を必要としています。拡張モデルならこの 3 つが共存できますが、フォークモデルでは各々が独自の分岐コピーを保守し続けることになります。

つまり: **reth の trait アーキテクチャ = chain を作るための API**。

## 3. カスタマイズするのは何か

Reth ベースの chain が典型的に override するスロット:

- **\`ChainSpec\`** — fork 高、gas params、precompile schedule、genesis
- **\`ConfigureEvm\` / block execution strategy** — 実行レイヤー、custom precompile、deposit tx 処理
- **\`PayloadBuilder\`** — block 生成 (L2 の sequencer mode)
- **Pool / mempool policy** — どの tx をどの順序で受け入れるか
- **Custom RPC namespace** — \`extend_rpc_modules\` 経由で chain 固有のエンドポイントを公開
- **Custom consensus** — Ethereum-PoS 以外の chain 向け

それ以外 (P2P、MDBX storage、staged sync、ExEx、trie commitment) は **何もしなくても reth が提供してくれる**。

> 🛑 **理解度チェック。** 誰かが「Berachain は Proof-of-Liquidity を入れるために reth を fork した」と言ったとします。なぜ "fork" という動詞がほぼ間違いで、どう言い直すべきか? 正しく言い換えられないなら、モデルがまだ入っていません。

## 4. 読むべき具体例

「mainnet 出荷済み」→「R&D」の順:

1. **\`crates/optimism/\`** in [paradigmxyz/reth](https://github.com/paradigmxyz/reth/tree/main/crates/optimism) — Optimism / Base / Mode / OP Stack。世界で最も本番運用された extension。
2. **[paradigmxyz/alphanet](https://github.com/paradigmxyz/alphanet)** — Paradigm 自身が運営する OP Stack 互換テストネット。mainnet に実装される前の custom precompile (EIP-7212 P-256 verify など) を試す場。
3. **[SovaNetwork/sova-reth](https://github.com/SovaNetwork/sova-reth)** — Reth を Bitcoin の execution layer として動かす。
4. **[SeismicSystems/seismic-reth](https://github.com/SeismicSystems/seismic-reth)** — 暗号化 tx 対応の Reth。

いずれも「chain に必要な最小パッチは何か?」を考えるための題材になります。答えは大抵 **node crate 数千行で済む** — execution client 20 万行をフォークする必要はありません。

## 5. 自分が作るものへの含意

Reth ベース chain に触れるもの (bridge、settlement layer、custom node、sequencer integration など) を作るなら、**バイナリレベルではなく trait レベルで読む** 必要があります。「Tempo は X をどう処理するか?」という問いは、「Tempo の node crate がどの trait を override し、どう実装しているか?」に還元されます。

**Tempo のソースは現在公開されています** ([\`tempoxyz/tempo\`](https://github.com/tempoxyz/tempo))。「この標準スロットのどれをカスタマイズし、なぜか?」というレンズで読んでください。開く前の参考データ: [\`tempoxyz/reth\`](https://github.com/tempoxyz/reth) は upstream Paradigm Reth に対して **0 commits ahead, 1374 commits behind**。Reth を一切 fork していないということ。payments 固有のカスタマイズはすべて \`tempoxyz/tempo\` crate に依存レベル拡張として存在します。

## 6. 練習

1. [reth ワークスペースの Cargo.toml](https://github.com/paradigmxyz/reth/blob/main/Cargo.toml) を開き、\`reth-optimism-*\` にマッチする crate をすべて探す
2. それぞれが何を担当しているか (chainspec? evm? payload? rpc?) を確認
3. 本番 chain を出荷するために埋めるべき 6 つのカスタマイズスロットを列挙
4. その中で「自分の chain の consensus rule」を担うスロットを特定

ここまでできれば、どんな Reth ベース chain repo もディレクトリ構造で怯まずに読めるはず。

> 最終チェック: Reth ベース chain が reth のソースをほぼ patch せずに済む構造的理由を、1 文で答えてください。**trait-based extension** と **NodeBuilder composition** に触れていないなら、まだ定着していない — §1、§2 を再読。`,
                },
                {
                  title: 'op-stack-on-reth を読む — Reth ベース L2 の解剖',
                  slug: 'reading-op-stack-on-reth-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 16,
                  xpReward: 45,
                  content: `# op-stack-on-reth を読む — Reth ベース L2 の解剖

Optimism は「Reth ベース L2」の正典です。その node コードは \`paradigmxyz/reth/crates/optimism/\` にあります。Tempo の node crate も同様の構造で公開済み ([\`tempoxyz/tempo\`](https://github.com/tempoxyz/tempo))、ここを読めれば向こうも読める。本レッスンの目的は、**ディレクトリ構造を一目で読み解けるようにする** ことです。

> 🛑 **スクロール前に予測。** 新しい Reth ベース L2 が node crate を出荷したとして、**そこに並ぶサブディレクトリを 5 つ** とそれぞれの担当を挙げてください。出てこなければ前レッスンに戻る。

## 1. 見る場所

ここを開く: [paradigmxyz/reth → crates/optimism/](https://github.com/paradigmxyz/reth/tree/main/crates/optimism)

ざっくり以下のような sub-crate が並んでいるはず (正確な名前は reth のバージョンで揺れるので、ソースで確認すること):

| Subdirectory | 担当 |
| :--- | :--- |
| \`chainspec/\` | OP chain spec — fork、genesis、gas params、precompile schedule |
| \`node/\` | トップレベルの \`NodeBuilder\` 配線 — 「これが OP node である」を定義 |
| \`evm/\` | EVM config — custom precompile、deposit tx semantics、L1 cost logic |
| \`payload/\` | Payload builder — sequencer mode での block 生成 |
| \`consensus/\` | OP の consensus engine (finality は L1 に委ねる) |
| \`rpc/\` | Custom RPC namespace (\`optimism_*\` メソッド) |
| \`txpool/\` (または類似) | Deposit-tx を認識する mempool policy |
| \`hardforks/\` | Bedrock、Canyon、Ecotone、Fjord、... の fork activation logic |

> **現物を確認。** 上の表を鵜呑みにせず、実際の repo を歩いて **自分で表を作り直してください**。バージョンは動きます — 自分の表だけが信頼できる。

## 2. 依存関係の形

\`cargo tree -p reth-optimism-node\` を実行してみる (正確な crate 名はワークスペースで確認)。

見えるもの:

- \`reth-optimism-node\` が依存しているもの: \`reth-node-builder\`、\`reth-chainspec\`、\`reth-evm\`、\`reth-payload-builder\`、\`reth-rpc-builder\`、\`revm\`、\`alloy-*\`
- OP 固有の兄弟 crate にも依存: \`reth-optimism-chainspec\`、\`reth-optimism-evm\`、\`reth-optimism-payload-builder\`、…
- \`reth-node-ethereum\` には **依存していない** — これは並列に存在する mainnet 用 node crate

**パターン**: chain の node crate は Ethereum node crate と **兄弟関係** にあり、両者が共有の reth-core crate 群を消費している。これが依存関係として現れる extension model の姿です。

## 3. 5 分で辿り着くべき「背骨」

どの Reth ベース chain でも、以下の 5 つは 5 分以内に見つけられるはず:

1. **NodeBuilder composition** — chain が「このコンポーネントを使う」と宣言している場所。大抵 \`*-node/src/lib.rs\` か \`node/builder.rs\`。
2. **ChainSpec** — consensus rule を担う型。大抵 \`*-chainspec/src/\`。
3. **Executor / EVM config** — 大抵 \`*-evm/src/\`。
4. **Payload builder** — 大抵 \`*-payload-builder/src/\` か \`*-payload/src/\`。
5. **Genesis JSON** — chainspec crate にインラインの場合と、独立した \`.json\` の場合がある。

ここまで辿れれば、その chain は読めます。

> 🛑 **理解度チェック。** \`node.rs\` というファイルに \`OpNode\` という型を見つけたとします。\`OpNode\` が **何であるか** と **何をするか** を理解するために、次にどこを見ますか? 実装している trait を **予測してから** スクロールしてください。

## 4. 初回読書の順序

新しい Reth ベース chain を初めて読むときの推奨シーケンス:

1. **\`README.md\`** と **\`Cargo.toml\`** (chain ルート) — どの crate が存在するかを把握
2. **\`chainspec/\`** — fork activation の一覧を声に出して読む
3. **\`node/\`** — NodeBuilder composition を読み、どこがカスタマイズされているかを掴む
4. **NodeBuilder で名前が出てきた順** に、各カスタマイズコンポーネント crate を読む
5. **Tests** — 特に state-transition test。実際の振る舞いに対するコミットメントがそこに刻まれている

ステップ 3 が終わった時点で **何が違うか** はわかります。ステップ 4–5 は *どう違うか* を読む段階。

## 5. Tempo を読む — 公開済み

Tempo のソースは [\`tempoxyz/tempo\`](https://github.com/tempoxyz/tempo)（900+★、Rust）で公開されています。\`crates/optimism/\` と同じ要領で読めます。期待される構造（あなた自身で source-of-truth として検証してください）:

- \`tempo-chainspec\` 相当 — Tempo の fork 高、gas params、決済固有の precompile
- \`tempo-node\` 相当 — NodeBuilder composition
- \`tempo-evm\` 相当 — 決済プリミティブの custom precompile (FX rate oracle? settlement-proof verify? regulated-asset check?)
- \`tempo-payload-builder\` 相当 — sequencer 用
- \`tempo-pool\` 相当 — 決済固有の mempool policy (merchant 認可など)
- \`tempo-consensus\` 相当 — Tempo は L1 なので存在する

開く前のメタ観察: [\`tempoxyz/reth\`](https://github.com/tempoxyz/reth) は upstream に対して **0 commits ahead, 1374 commits behind**。Reth 本体は触られていない。L1 全体が依存レベルの拡張で実現されているという、SDK の最強の証拠。

## 6. 練習

Reth ベース chain を 1 つ選び、repo を歩いて **§1 の表をその chain ぶん作ってみる**。

読みやすさ順の候補:
- \`paradigmxyz/reth/crates/optimism/\` (規模最大、最も洗練されている)
- \`paradigmxyz/alphanet\` (小ぶり、R&D 寄り — end-to-end で通読しやすい)
- \`SovaNetwork/sova-reth\` (Bitcoin 視点 — chainspec の形が違う)

> 最終チェック: **Reth ベース chain repo の形** を、新人が 10 分で何でも見つけられる言葉で 2 文にしてください。「フォルダがあって」から始めたらやり直し — *コンセプト* (trait による拡張 + NodeBuilder composition) から始める。`,
                },
                {
                  title: 'Custom ChainSpec — fork、genesis、precompile schedule',
                  slug: 'custom-chainspec-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 14,
                  xpReward: 40,
                  content: `# Custom ChainSpec — fork、genesis、precompile schedule

mainnet では検証が通るブロックが、あなたの chain では reject される。同じブロック、同じクライアントバイナリ、同じ Revm — なのに結果が違う。なぜか? \`ChainSpec\` のどこかが「この高さでは、ここのルールが違う」と言っているから。fork 高の誤り、precompile schedule のエントリ誤り、base-fee パラメータの誤り — どれか一つでも間違っていれば、あなたの chain は 1 ブロックでネットワークから分岐します。

\`ChainSpec\` は「この chain が **プロトコル** レベルで mainnet Ethereum と何が違うか」を所有する Rust の struct です — chain ID、fork activation、base fee カーブ、genesis allocation、precompile schedule。Reth ベース chain を読むときも書くときも、**最初に読むべき型** です。

> 🛑 **予測。** "ChainSpec" という名前は config 風に聞こえますが、実際には何が入っているか **カテゴリを 5 つ** 予想してみてください。5 つに届かない、あるいは全部 gas 関連、というなら consensus rule が触れる範囲を過小評価しています。

## 1. ChainSpec とは

\`reth-chainspec\` の \`ChainSpec\` は (chain 固有 crate の拡張型も含めて) 以下を抱える struct です:

| カテゴリ | 何を制御するか |
| :--- | :--- |
| **Chain ID** | EIP-155 の replay protection キー |
| **Hardfork activation** | Protocol upgrade を切り替える block-height / timestamp ベースのスイッチ |
| **Base fee params** | EIP-1559 のパラメータ (elasticity、change denominator) |
| **Genesis** | 初期 allocation、state root、gas limit |
| **Precompile schedule** | 各 fork でアクティブになる precompile アドレス |
| **その他のレガシー params** | Block gas limit、DAO fork、mining difficulty (legacy) |

Reth ベース L2 では、chain は *拡張された* ChainSpec を提供します — たとえば OP chain spec は base \`ChainSpec\` をラップし、OP 固有の fork 追跡 (Bedrock、Canyon、Ecotone、Fjord、…) を追加しています。

> 🛑 **現物を確認。** \`crates/optimism/chainspec/\` を開いて、OP chain spec を表す正確な型を特定してください。\`ChainSpec\` のラッパー struct ですか? Trait 拡張? **その両方?** 答えが出るまで先に進まない。

## 2. Hardfork のリスト = chain の歴史

Hardfork enum を声に出して読むのが、chain を理解する最速の方法です。

OP Stack ならおよそ以下のような enum が見つかるはず:

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

各 variant には **activation logic** が紐づいています (mainnet では block height、Sepolia や Base などの各ネットワークでは別の timestamp)。この enum と activation table を読むことが、すなわち chain のプロトコル史全体を読むこと。

Tempo でも同じ形の enum が出てくるはず。名前は違っても、構造は同じです。

## 3. Precompile schedule

Precompile は予約アドレス (mainnet の \`0x00..01\` から \`0x00..0a\`、加えて任意の追加分) に存在する「ネイティブ関数」です。どの fork でどの precompile が存在するかは、各 chain が決めます。

OP Stack は Ethereum の precompile の大半を継承し、独自のものを少し追加しています。今後の hardfork でさらに追加されていく。Precompile schedule は要するに以下の対応:

\`\`\`
Fork F において、アドレス A は ネイティブ関数 impl I にマップされる
\`\`\`

実体は chain の EVM config crate に置かれます (次レッスン) が、**activation の判定** は ChainSpec にあります — activation 自体が consensus rule だからです。

> 🛑 **理解度チェック。** なぜ precompile の activation は EVM config 単独ではなく ChainSpec に置かねばならないのか? 答えが「一貫性のため」だけなら掘り下げが足りません。**block N でどの precompile がアクティブかを 2 つのノードが食い違って判定したら、何が壊れますか?**

## 4. Genesis encoding

Genesis は要するに「block 0 の state」。Custom chain が出荷するものは:

- Genesis JSON ファイル (allocation、gas limit、初期 difficulty/seal)
- chainspec crate 内の \`Genesis\` Rust struct (たいていは JSON からロード可能)
- 計算済みの genesis state root — 全ノードが合意していないと成立しない

chain を監査するなら、**コード上の genesis state root が実ネットワークと一致するか必ず検証** してください。ここで食い違えば、全ノードが block 1 で食い違います。

## 5. L2 chainspec の特殊性

L2 の chainspec (Optimism、Base、…) はさらに以下も追跡します:

- **L1 chain ID** — L2 がアンカーされている先 (cross-domain message verification 用)
- **L1 block oracle** address on L2 — 現在の L1 block hash を記録するコントラクト
- **Sequencer address** — sequencer 署名つき batch の検証用
- **Withdrawal config** — L2 → L1 withdrawal の時間遅延

Tempo のような L1 にはこれらは適用されませんが、拡張された ChainSpec にどんな *種類* の情報が住むかという例として参考になります。

## 6. 読解演習

\`crates/optimism/chainspec/\` (または手元の reth チェックアウトの該当箇所) で:

1. **特定**: OP chain spec を表す struct
2. **音読**: hardfork のリストを声に出す
3. **位置特定**: 「fork F は block height H、timestamp T でアクティブか?」に答える関数
4. **発見**: OP mainnet と Base の Bedrock activation block がハードコードされている場所

そのあと、awesome-reth の "Layer 2" セクションにある任意の chain で同じ作業をしてみてください。

> 最終チェック: 「chain X が block N で使っている fork activation rule は?」と問われたら、どのファイルをどの順序で読みますか? 2 ファイルを超えるなら過剰 — ChainSpec と activation table、それだけで足ります。`,
                },
                {
                  title: 'Custom executor — execution layer を差し替える',
                  slug: 'custom-executor-ja',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 18,
                  xpReward: 45,
                  content: `# Custom executor — execution layer を差し替える

Executor とは「実際に tx を実行して post-state を生成するもの」です。Ethereum mainnet では vanilla revm がそれにあたります。Optimism では revm に **deposit-tx 処理**、**L1 cost 計算**、**少し異なる precompile リスト** を足したものになる。本レッスンでは、Reth がこの実行レイヤーをどう差し替えさせてくれるかを見ていきます。

> 🛑 **予測。** Reth ベース L2 が "deposit transaction" — L1 起源で L2 側には署名のない tx — を実行する必要があるとき、**L2 がカスタマイズするのはどの層** ですか? mempool? Transaction validator? Executor? **理由づけしてから** 読み進めてください。

## 1. Trait の境界

関連する trait (正確な名前は reth のバージョンで揺れるのでソースで確認):

- **\`ConfigureEvm\`** — block コンテキストを受け取り、適切な precompile セット、gas schedule などを備えた revm インスタンスを構成
- **\`BlockExecutionStrategy\`** (または類似) — block から tx を取り出して revm に流し、receipt と state change を蓄積していくループ
- **\`ExecutorBuilder\`** — 動作中の node に executor を供給する NodeBuilder のスロット

Chain は前者 2 つを自分の crate での trait impl でカスタマイズし、3 つ目を経由して NodeBuilder に登録します。

## 2. Optimism が override しているもの

\`crates/optimism/evm/\` を読むと、おおむね以下が見つかります:

| Override | 理由 |
| :--- | :--- |
| **Custom precompile リスト** | OP は precompile をいくつか追加 (例: L1 block hash アクセス) |
| **Deposit transaction の処理** | Deposit tx は署名検証をスキップ (L1 側で認証済みのため) |
| **L1 cost 計算** | OP の tx はすべて、L2 gas に加えて L1 data cost を支払う |
| **Pre-execution hook** | Block 内の最初の tx 実行前に、L1 block oracle の storage slot を更新する |

最初の 1 つは config。残り 3 つは実行戦略レベルの話で、block executor のメインループに住みます。

> 🛑 **現物を確認。** \`crates/optimism/evm/\` の中で「これは deposit tx だから署名検証をスキップ」と判断している関数を特定してください。**シグネチャは?** (記憶する必要はない — 見つけられればいい)。

## 3. Custom precompile の話

すでに custom precompile を書いた経験があるはず。問いは: **その precompile はどこで chain に組み込まれるのか?**

答えは: \`ConfigureEvm\` impl が revm に precompile セットを手渡す。Chain の \`ConfigureEvm\` impl が、chain の hardfork schedule で gate された custom precompile をデフォルトセットに足していく形です。

配線:

\`\`\`
ChainSpec  ──[どの fork がアクティブ?]──▶  EVM config  ──[アクティブな precompile set]──▶  revm
\`\`\`

precompile を登録するコードが物理的に住む場所が、この EVM config crate。

## 4. L1 cost 計算 (なぜ良い例か)

OP Stack は tx すべてに *L1 data cost* — その tx の calldata を L1 に投稿する分の償却コスト — を課金します。これは厳しい要求で、全ノードが寸分違わず同じ L1 cost を計算できないと block validation が失敗します。

Executor 内では以下のように実装されます:
1. 各 tx の実行前に、既知の storage slot から現在の L1 base fee と blob gas price を読み出す
2. \`l1_cost = calldata_gas * l1_base_fee + blob_overhead\` を計算
3. L2 gas の課金に **加えて** 送信者の残高から控除
4. Fee vault に入金

これは **precompile には収まらない consensus-critical なロジック** の典型例 — executor 自体に置く以外ない。

> 🛑 **理解度チェック。** OP の L1 cost charging はなぜ precompile として実装できないのか? 答えが「performance のため」だけなら掘り下げが足りません — precompile が tx 実行前に任意のアカウントから控除できない **consensus 上の理由** は何ですか?

## 5. Execution loop を擬似コードで

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

Ethereum mainnet では 3 行目と 9 行目が消えるだけ。**他はまったく同じ。** これが extension model のすべて。

## 6. Tempo で何が来るか

Tempo は L1 なので、以下は無いはず:
- "deposit tx" の概念 (deposit 元になる親 chain がない)
- L1 cost の課金

逆におそらく "yes":
- 決済プリミティブ用の custom precompile (FX、settlement attestation など)
- Tempo に「現在の FX rate」のような oracle slot が組み込まれているなら pre-execution hook (OP の L1 block hash slot と同じ発想)
- 異なる fee 市場構造 (Tempo は stablecoin-native なので、fee 資産の選択が興味深い)

Tempo の executor は現在公開されています — [\`tempoxyz/tempo\`](https://github.com/tempoxyz/tempo) で該当ファイルを開き、上記の仮説を実コードに対して検証してください。

## 7. 練習

\`crates/optimism/evm/\` で:

1. **特定**: OP の \`ConfigureEvm\` impl
2. **列挙**: Ethereum mainnet には無い precompile アドレスをすべて
3. **特定**: L1 cost charge を加える関数
4. **追跡**: deposit transaction が署名検証をどのようにバイパスしているか

> 最終チェック: Reth ベース chain で executor に **必ず** 住む (precompile にも mempool にも置けない) 要素を 2 つ挙げ、それぞれなぜ executor にしか置けないかを説明してください。できなければ §4、§5 を再読。`,
                },
                {
                  title: 'Custom payload builder — sequencer モードの block 生成',
                  slug: 'custom-payload-builder-ja',
                  type: 'CONTENT',
                  sortOrder: 4,
                  duration: 16,
                  xpReward: 45,
                  content: `# Custom payload builder — sequencer モードの block 生成

Ethereum mainnet では、block は **validator** が consensus client を動かし、execution client から提案された payload を pull することで生成されます。一方、L2 や中央集権 sequencer の chain では block 生成モデルが違います: **sequencer がそのまま block producer になる**、それだけ。Payload builder は、その「どうやって作るか」を担うコンポーネントです。

> 🛑 **予測。** 中央集権 sequencer の L2 において、block 内の **tx ordering を決める** のは誰/何ですか? sequencer は何を最適化していて、MEV 上の含意はどうなる? 自分の予測を立ててから読み進めてください。

## 1. Trait の境界

\`PayloadBuilder\` (と関連 trait 群) は、reth NodeBuilder の「block の作り方」を担うスロット。受け取るもの:

- Parent block (どこから建てるか)
- 現在の chain state
- Pending transaction の pool
- Timestamp / slot

…返すものは、構築済みの block ("payload")。Mainnet では validator 側の consensus client が Engine API 経由でこれをトリガーします。Sequencer L2 では sequencer が直接トリガーする。

## 2. 本番で出てくる 3 種類の builder

Reth エコシステムには複数の payload builder が存在します:

| Builder | 場所 | 用途 |
| :--- | :--- | :--- |
| Default Ethereum builder | \`crates/payload/builder/\` | Mainnet validator |
| OP payload builder | \`crates/optimism/payload/\` | OP Stack sequencer |
| **op-rbuilder** | [paradigmxyz/rbuilder](https://github.com/paradigmxyz/rbuilder) | OP Stack 向けの高性能な external block builder |

最初の 2 つは reth 本体に入っています。**op-rbuilder** は別 repo で、MEV と ordering policy にずっと積極的、複数の OP Stack chain が本番で使用しています。

## 3. L2 の builder が違うこと

Sequencer モードでの block 生成では、典型的に以下を行います:

1. **Deposit tx を block の先頭に強制 include する** (既知の L1 oracle queue から)
2. **残りを FIFO か priority-fee でソート**
3. **最初の state write として L1 block oracle の storage slot を更新**
4. **L2 の gas limit で block をキャップ** (mainnet limit ではない)
5. **Sequencer signature で block にタグ付け** (一部 L2 は sequencer identity にコミットする)

これらのいくつかは **executor 側にはない** — *builder* 側にあります。なぜか。Builder は *block に何が入るか* を制御し、executor は *block に入っているもの* を実行するだけだからです。

> 🛑 **理解度チェック。** ジュニアエンジニアが「mempool を FIFO に流せば sequencer 完成」と言ったとします。**そこに考慮が抜けている攻撃を 3 つ** 挙げてください。(ヒント: tx 提出の latency、toxic order flow、reorg)

## 4. MEV の問題

Tx を順序づける sequencer は、validator にはできない形で MEV を抽出できます (block 内で consensus 上の競合相手がいないため)。

Sequencer が取れる立場は 3 つ:

| Position | 意味 | 例 |
| :--- | :--- | :--- |
| **MEV-blind** | 厳格 FIFO、tx の意味には踏み込まない | 一部の小規模 L2 がそう主張 |
| **MEV-aware, public** | 公開 order flow、builder が MEV-share 風の bid を受ける | OP Stack + op-rbuilder |
| **MEV-extracting** | Sequencer が内部 searcher を運用 | (不透明な場合が多い。中央集権 chain は何でもできる) |

どの立場を取るかは **payload builder のソースコード** に現れます — feature flag や外部 builder 統合で gate されている形が多い。Chain の payload builder を読むことは、その chain の MEV policy を読むことと同義です。

## 5. op-rbuilder — 本番グレードのリファレンス

[paradigmxyz/rbuilder](https://github.com/paradigmxyz/rbuilder) は、Paradigm が OP Stack 向けに作った external builder。読む価値がある理由:

- **Bundle merging** が実装されている (private order flow + public mempool)
- **Sealing strategy** (greedy、並列化可能なアルゴリズム)
- **Builder API** — 第三者が bundle を提出できる
- オープンソースの中では「本物の」本番 block builder に最も近い

Tempo が sequencer モード block 生成に op-rbuilder を採用または拡張するなら、最初に学ぶべき codebase です。

## 6. Tempo 特有のこと

予測:
- Tempo は **決済認識型の payload builder** を持つ — 決済 tx が汎用 tx より優先される可能性
- Builder レベルでの **merchant 認可フィルタ** — 認可された merchant だけが特定の tx 種別を提出できる
- 濫用防止のための **merchant 単位のレート制限**
- ローンチ時は **公開 mempool 無し** の可能性が高い (sequencer-private)

これらはそれぞれ、payload-builder crate の一つの trait impl として現れるはずです。

## 7. 練習

\`crates/optimism/payload/\` を開いて:

1. **特定**: \`PayloadBuilder\` の trait impl
2. **追跡**: deposit tx が block 先頭にどう include されるか
3. **特定**: block の gas cap が強制されている箇所
4. **特定**: 構築した block を sign / seal する関数

そのあと [op-rbuilder の README](https://github.com/paradigmxyz/rbuilder) を読み、"external builder" モデルの考え方を掴んでください。

> 最終チェック: 1 文で、payload builder が **決定する** けれども executor は決定しないものは? 答えに "ordering" または "selection" が出てこないなら §3 を再読。`,
                },
                {
                  title: 'ケーススタディ — Paradigm のスタック: alphanet、Tempo、L1 パターン',
                  slug: 'paradigm-stack-case-study-ja',
                  type: 'CONTENT',
                  sortOrder: 5,
                  duration: 18,
                  xpReward: 50,
                  content: `# ケーススタディ — Paradigm のスタック: alphanet、Tempo、L1 パターン

ここまでで 4 つの拡張スロット (ChainSpec、executor、payload builder、RPC) と、Reth ベース chain の依存関係の形を見てきました。本レッスンはその **総合編** です: Paradigm の全スタックはどう見えるか、そして **Tempo のソースが公開された今**、先ほど学んだ構造のレンズでそれをどう読むか。

> 🛑 **予測。** Paradigm はこの順で出荷してきました: **revm → alloy → reth → alphanet → op-stack-on-reth → Tempo**。**このシーケンスは何の軌跡か?** 予想してから読み進めてください。後で答え合わせします。

## 1. スタックを上から下まで

| Layer | Component | 役割 |
| :--- | :--- | :--- |
| **EVM core** | revm | バイトレベルの EVM インタプリタ |
| **Toolkit** | alloy | Rust の型、provider、signer、ABI |
| **Execution client** | reth | フル Ethereum node — staged sync、mempool、RPC、MDBX、P2P |
| **Reth ベース chain** | reth の \`crates/optimism/\` | OP Stack の execution を reth node crate として実装 |
| **R&D testnet** | alphanet | 「Ethereum に EIP-X precompile があったら?」を試す遊び場 |
| **本番 L1** | Tempo | Paradigm の決済レール |

**下の層 (table 上の後ろの行) は上の層にしか依存しない** — これが構造的な不変量です。Tempo は reth を fork しません。reth の *上に* 建てます。

## 2. alphanet — precompile R&D の遊び場

[paradigmxyz/alphanet](https://github.com/paradigmxyz/alphanet) は OP Stack 互換のテストネットロールアップ。明示的な目的は **mainnet に実装される前に EVM 拡張を試す** こと。

これまでに alphanet で実装・実験されたもの:
- **EIP-7212** — \`secp256r1\` (P-256) verification precompile (WebAuthn / Passkey 関連)
- **EIP-3074 / 7702** — account abstraction primitives
- 各種 opcode / gas の微調整

学習対象としての価値: alphanet は **end-to-end で通読できる規模**、カスタマイズも教育目的で設計されています。「chain に precompile を追加するとはこういうこと」という最もクリーンな実例です。

> 🛑 **現物を確認。** alphanet repo を開き、P-256 precompile が **chain に登録されている** ファイルを特定してください (math の実装場所ではなく — chain のアクティブな precompile セットに加わるところ)。**なぜそのファイルに置かれているのか?**

## 3. Alphanet から本番へ

軌跡が重要です。alphanet は Paradigm の実験場で、そこで試したものはやがて:
- **mainnet Ethereum に EIP として graduate** する (例: 7212 はその経路上)、もしくは
- **本番の Reth ベース chain に graduate** する (例: Tempo)

Tempo に何が入っているかを予測したいなら、**最近 alphanet で検証されたもの** を見るのが最短ルートです。技術的な系譜はそのまま繋がっています。

## 4. Tempo — Paradigm の決済 L1 on Reth

公開済み。構造はこのモジュールのテーゼをそのまま裏付けています:

- **[\`tempoxyz/tempo\`](https://github.com/tempoxyz/tempo)** (900+★、Rust) — "the blockchain for payments"。L1 node crate。
- **[\`tempoxyz/reth\`](https://github.com/tempoxyz/reth)** — upstream Paradigm Reth に対して **0 commits ahead, 1374 commits behind**。Reth を一切 fork していない。Tempo は upstream Reth をライブラリとして依存。これが「compose, don't fork」の教科書的な実例です。
- **Tempo Moderato** が公開テストネット。
- **Chainlink CCIP** が cross-chain rail (CCTP は Tempo をカバーしていない)。

L1 と同時に出荷された隣接 crate:
- **[\`tempoxyz/zones\`](https://github.com/tempoxyz/zones)** — Tempo にアンカーされた confidential blockchain。暗号化された deposit/withdrawal、250ms ブロック時間、L1 から継承される compliance ポリシー (TIP-403)。
- **[\`tempoxyz/mpp-specs\`](https://github.com/tempoxyz/mpp-specs)** — Machine Payments Protocol: agent/machine 決済用の HTTP-402 ベース支払いプロトコル。IETF draft。Payment-method agnostic (Tempo、Stripe、ACH)。
- **[\`tempoxyz/tempo-foundry\`](https://github.com/tempoxyz/tempo-foundry)** — Tempo サポートつきの Foundry fork (これも薄い fork — 同じ compose-don't-fork パターン)。
- **[\`tempoxyz/tidx\`](https://github.com/tempoxyz/tidx)** — PostgreSQL + ClickHouse のハイブリッドインデクサ (OLTP の point lookup + OLAP analytics)。

[\`tempoxyz/tempo\`](https://github.com/tempoxyz/tempo) を開いた時に学んだばかりの構造に対して期待するもの:

- **Custom ChainSpec** — Tempo 固有の fork と precompile schedule
- **Custom executor** — 決済プリミティブ用 precompile (FX rate 読み出し、settlement attestation の検証、regulated-asset チェック)
- **Custom payload builder** — merchant 認識つきの ordering とレート制限
- **Custom RPC namespace** — \`tempo_*\` 系のメソッド、merchant / payment 用エンドポイント、加えて Machine Payments Protocol との統合
- **Custom mempool policy** — ローンチ時はほぼ間違いなく private mempool、認可された提出者だけ受け付け

*不在* を検証すべきもの (SDK がそれを不在にできるから):
- Reth core から乖離した独自 fork (確認済み — fork は空)
- 独自 EVM 実装 (revm が EVM そのもの)
- 独自ネットワークスタック (reth の P2P を再利用)

## 5. MegaETH — 同じパターン、より深いカスタマイズ

Tempo が SDK の **浅い端** (数コンポーネントだけ差し替え、残りはすべて継承) を見せるなら、[\`megaeth-labs\`](https://github.com/megaeth-labs) は **深い端** を見せます:

- **[\`megaeth-labs/reth\`](https://github.com/megaeth-labs/reth)** — 空 fork (**0 commits ahead, 7666 commits behind**)。Tempo と同じ compose-don't-fork パターン、ただ遅れがさらに大きいだけ。
- **[\`megaeth-labs/mega-evm\`](https://github.com/megaeth-labs/mega-evm)** — revm と op-revm の上に MegaETH 固有仕様 (\`EQUIVALENCE\` から \`REX4\`) で構築されたカスタム EVM。sequencer は Paradigm の [\`revmc\`](https://github.com/paradigmxyz/revmc) を経由した JIT/AOT コンパイル実行を走らせる。
- **[\`megaeth-labs/salt\`](https://github.com/megaeth-labs/salt)** — **MDBX をカスタム authenticated KV store で置き換え**。30 億アイテムを ~1 GB のメモリで authenticate、state-root 更新中のランダムディスク I/O を排除。これは標準 6 コンポーネントスロットを大きく超えるカスタマイズ。
- **[\`megaeth-labs/stateless-validator\`](https://github.com/megaeth-labs/stateless-validator)** — sequencer とは別の **完全に別のバリデータバイナリ**。SALT witness を読み、ブロックをバニラ revm interpreter で実行、コモディティハードウェアで動く。アーキテクチャ的な動き: high-spec sequencer と low-spec validator を、まったく違うノードコードを与えることで分離する。

このレッスンで Tempo の隣に MegaETH を置く理由: **SDK はカスタマイズの深さを制約しない**。Tempo は 3 コンポーネントを差し替えて upstream の ~80% を継承。MegaETH は EVM executor を差し替え、storage layer を置き換え、完全に別の validator client を出荷 — それでも **Reth を fork しない** (\`megaeth-labs/reth\`: 0 ahead, 7666 behind)。天井は最初に読んだときより遥かに高い。

## 6. Extension model における L1 vs L2

op-stack-on-reth を読むこと、そして将来 tempo-on-reth を読むことは、構造的には似ていますが以下の点で異なります:

| 観点 | OP Stack (L2) | Tempo (L1) |
| :--- | :--- | :--- |
| **Deposit tx** | あり (L1 から) | なし |
| **L1 cost charge** | あり | なし |
| **L1 block oracle slot** | あり | なし |
| **独立 consensus** | なし (L1 にアンカー) | あり (Tempo は自前の consensus を持つ) |
| **Sequencer モデル** | ローンチ時は中央集権、分散化ロードマップあり | おそらく中央集権、決済レールという正当化あり |
| **ネイティブ資産** | ETH 相当 | おそらく USD ステーブル |

Tempo が L1 であるということは、**consensus layer もカスタマイズポイントになる** ということ — execution layer だけではありません。これは大半の L2 chain がスキップするスロットです。

## 7. 自分の作るものへの含意

Tempo の上に何かを作るなら:

| プロジェクト | Reth-on-Tempo 知識が効く理由 |
| :--- | :--- |
| Cross-VM intent matcher | Intent matching には決定論的な EVM semantics が必要。Tempo の executor crate を読むことで、正確な gas コスト、利用可能な precompile、execution のエッジケースが把握できる。 |
| Cross-chain settlement layer | EVM 側の settlement proof は Tempo の state と厳密に一致しなければならない。Tempo の chainspec と executor が信頼できる source of truth。 |
| Merchant treasury / payment ops | Merchant 運用には予測可能な confirmation semantics が必要。Tempo の payload builder と mempool policy が、tx が inclusion-final になるタイミングを教えてくれる。 |

Tempo のローンチ時に reth を trait レベルで読まずに現れる誰よりも、**数ヶ月先** にいることになります。

## 8. 最終練習

このモジュールの成果物: [\`tempoxyz/tempo\`](https://github.com/tempoxyz/tempo) を開いて、1 セッションで以下を読み通して 1 ページのアーキテクチャサマリーを書くこと。

1. Tempo node crate の \`Cargo.toml\` — reth 依存が upstream で fork されていないことを確認
2. chainspec crate — hardfork + precompile schedule
3. NodeBuilder composition (\`node/src/lib.rs\` 相当) — 6 コンポーネントのうちどれが差し替えられ、どれが継承されているか
4. 差し替えられた各 crate を順に — payload、pool、RPC namespace
5. Tests ディレクトリ — どの振る舞いを assert する価値があると判断したか?

alphanet を end-to-end で読んだことがないなら、それを先に練習として。規模が小さくクリーン。

> 最終チェック: [\`tempoxyz/tempo\`](https://github.com/tempoxyz/tempo) のソースを読んで **検証した具体的な事実を 5 つ**、自分の仕事への重要度順に挙げてください。5 つ挙げられないなら、本モジュールはまだ完全には定着していません — §4、§5 を再読してからソースに戻る。`,
                },
                {
                  title: 'クイズ: 拡張パターンは定着したか?',
                  slug: 'reth-chains-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 6,
                  duration: 15,
                  xpReward: 50,
                  content: `# クイズ: 拡張パターンは定着したか?

拡張モデルと、各カスタマイズの居場所を確認する短いテストです。雰囲気で答えず — 各設問には「どの trait / どの crate」という具体的な答えがあります。`,
                  quizQuestions: [
                    {
                      question: 'なぜ大半の Reth ベース chain は geth 流のフォークモデルではなく拡張モデルを採用しているのか?',
                      options: [
                        'Reth が geth より速いため、性能を求めて chain は採用せざるを得ない',
                        'Reth のモジュラーな trait アーキテクチャ (NodeBuilder + ChainSpec + ExecutorBuilder + PayloadBuilder) により、必要な部分だけをカスタマイズし、残りはライブラリとして利用できるため — rebase コストが消える',
                        'Rust のモジュールシステムが source レベルの fork を阻止するため',
                        'Paradigm が Reth を使うすべての chain に対して「拡張のみ」のポリシーを強制しているため',
                      ],
                      correctIndex: 1,
                      explanation: '速度 (選択肢 1) は副産物であってアーキテクチャ上の理由ではない。Rust は fork を阻止しない (選択肢 3 は誤り)。Paradigm が独立 chain に何かを強制している事実もない (選択肢 4 は誤り)。本当の駆動要因は trait アーキテクチャそのもの — 重要なスロットだけを override し、残りを継承する設計が成り立つ。',
                    },
                    {
                      question: 'Reth ベース chain の hardfork activation のロジックはどこに住むか?',
                      options: [
                        'Payload builder — builder が各 fork で block を生成するため',
                        'ChainSpec — ある block height / timestamp でどの fork がアクティブかは consensus rule であり、それを所有するのは ChainSpec だから',
                        'Executor — fork によって execution の振る舞いが変わるため',
                        'Genesis JSON — 初期 state allocation と並べて記述されるため',
                      ],
                      correctIndex: 1,
                      explanation: '複数の層が fork state を「読む」が、所有しているのは ChainSpec 一つだけ。Builder (1) や executor (3) は判断のために fork state を参照するが、その都度 ChainSpec に問い合わせる — activation 自体を所有しているわけではない。Genesis (4) は *初期* state を担うもので、fork schedule ではない。',
                    },
                    {
                      question: 'OP Stack は L2 gas に加えて L1 data cost を課金する。このロジックを含む trait の impl はどれで、なぜか?',
                      options: [
                        'Custom precompile — precompile が native な fee logic を置く自然な場所だから',
                        'Mempool policy — fee は admission 時に計算されるため',
                        'Block execution strategy / executor — tx 実行前にアカウントから控除する操作は consensus-critical な state mutation であり、全ノードが寸分違わず同じ計算を行わなければならないから',
                        'RPC layer — クライアントが tx 提出前に L1 cost を知る必要があるため',
                      ],
                      correctIndex: 2,
                      explanation: 'Precompile (1) は単独では任意アカウントから控除できない — executor の権限が必要。Mempool (2) は cost を *推定* できるが consensus 上の state change を強制することはできない。RPC (4) は情報提供であって consensus-critical ではない。権限と consensus-critical な位置の両方を持っているのは executor だけ。',
                    },
                    {
                      question: 'Reth ベース L2 が、すべての block の先頭に deposit tx を強制的に含める必要がある。これを処理するのはどの trait か?',
                      options: [
                        'ChainSpec — deposit の取り扱いは chain rule の一部だから',
                        'Payload builder — block に何が入るか、どの順序で入るかを決めるのは payload builder だから',
                        'Mempool — deposit tx は別 queue にあり、mempool がそこから先に drain するから',
                        'Custom consensus — ordering を強制できるのは consensus だけだから',
                      ],
                      correctIndex: 1,
                      explanation: 'ChainSpec (1) は deposit tx の *定義* を持つが、選び出し方は持たない。Mempool (3) は deposit queue を追跡できるかもしれないが、「先頭に置く」は block composition の決定。Consensus (4) は過剰 — これは選択の問題であって finality の問題ではない。Block composition と順序を決定する単一コンポーネントが payload builder。',
                    },
                    {
                      question: 'Reth ベース chain で custom precompile を書いたとき、その *登録* はどこで行われるか?',
                      options: [
                        'Precompile crate 内部、static registry を経由して',
                        "Chain の EVM config (ConfigureEvm impl) 内 — revm にアクティブな precompile セットを手渡し、chain の hardfork schedule で gate する",
                        'Reth core 内部、precompile dispatch table を直接編集して',
                        'Genesis JSON、初期 code allocation の一部として',
                      ],
                      correctIndex: 1,
                      explanation: 'Static registry (1) では chain rule で gate できない。Reth core を編集 (3) は、まさに避けたい fork-model アンチパターンそのもの。Genesis (4) は state を保持する場所であり、protocol レベルの関数を置く場所ではない。EVM config こそが正しいスロット — ChainSpec (どの fork か) と revm (実際に走るもの) を結ぶ役。',
                    },
                    {
                      question: 'alphanet と Tempo の関係を最も正確に表す説明は?',
                      options: [
                        '同じプロジェクトの呼び名違い',
                        'alphanet は Tempo のテストデプロイ',
                        'alphanet は Paradigm が EVM 拡張 (custom precompile など) を検証する R&D testnet で、そこで成熟した実験は Tempo のような本番 chain に出荷されたり、Ethereum EIP として提案されたりする',
                        'Tempo は alphanet の上に建てられ、alphanet は Reth の上に建てられている',
                        'メンテナーが共通である以外はほぼ無関係',
                      ],
                      correctIndex: 2,
                      explanation: 'alphanet は遊び場で、Tempo は本番のレール。選択肢 1、2 は両者を混同している。選択肢 4 は依存関係の順序が逆 — どちらも直接 Reth に依存しており、互いに依存しているわけではない。選択肢 5 は弱すぎる: precompile 実験の技術的な系譜は実在し、追跡できる。',
                    },
                    {
                      question: '中央集権 sequencer の L2 において、payload builder が決め、executor が決めないことは?',
                      options: [
                        'Payload builder は gas pricing を、executor は ordering を決める',
                        'Payload builder は block にどの tx をどの順序で入れるかを決める。executor は、渡された tx を渡された順序で実行するだけ',
                        '両者の決定範囲は同じ — builder は executor の薄いラッパーにすぎない',
                        'Payload builder は署名を検証し、executor は state change を適用する',
                      ],
                      correctIndex: 1,
                      explanation: 'Gas pricing (選択肢 1 は逆) は主に chainspec の問題で、builder と executor の対比軸ではない。両者同じ (3) は誤り — この分離こそが要点。署名検証 (4) は executor / tx validator 側の責務で、builder ではない。クリーンな分割: builder = 選択 + 順序づけ、executor = 言われたとおりに実行。',
                    },
                    {
                      question: '`tempoxyz/tempo` を初めて開き、Paradigm が「compose, don\'t fork」モデルに従ったかを確認したい。最もシグナルが強い 1 手は?',
                      options: [
                        'README と発表ブログを読む',
                        '`tempoxyz/reth` を開き、`paradigmxyz/reth` に対する commits-ahead/behind を確認する',
                        '`tempoxyz/tempo` ワークスペース内の crate 数を数える',
                        'Tempo と upstream Reth のスループットを比較するベンチマークを走らせる',
                      ],
                      correctIndex: 1,
                      explanation: 'README / ブログ (1) は正しいことを言っているが証明にはならない。Crate 数 (3) は緩い相関しかなくノイジー。ベンチマーク (4) は性能を測るのであって fork したかどうかではない。Fork チェック (2) が決定的な構造的テスト — そして答えは "0 ahead, 1374 behind"、これが「compose, don\'t fork」テーゼに対する最強の経験的証明。',
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
