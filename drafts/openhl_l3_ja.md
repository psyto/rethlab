# Building OpenHL — L3 draft (JA) — C2 build-along rewrite

> openhl SHA `13113db` (Stage 4: ConsensusBridge trait + CL/EL contract types) に対してドラフト。L2 がこの commit の type 部分を扱った; L3 が trait 部分を扱う。
> EN ミラー: `drafts/openhl_l3_en.md`。
> Course: `building-openhl-consensus-ja` (track: `reth-l1-architect`, course #6 of 10)。

---

## L3 — `openhl-bridge-trait-ja`

- **Module:** 2 (Contract types)、module 内 sortOrder 1
- **Course-level sortOrder:** 2 (15 レッスン中の 3 番目)
- **Duration:** 30 分
- **XP reward:** 60
- **Type:** CONTENT

### Content

````markdown
# レッスン 3 — `ConsensusBridge` trait

## ゴール

このレッスンで掴む概念:

- **なぜちょうど 4 メソッドか** — `build_payload / payload_ready / validate_payload / commit` の 4 つは BFT round 構造 (propose → vote → decide) によって決まるもので、言語の好みではない。build/ready を 1 つにまとめると build-during-voting が消える。5 つ目を足すと consensus 内部が EL に漏れる。
- **`#[async_trait]` と `Send + Sync` bound** — `async_trait` が実際に何に desugar されるか (boxed futures + object-safety)、そして `: Send + Sync` が Malachite actor 間で共有される `Arc<dyn ConsensusBridge>` の soundness をコンパイル時に保証する仕組み。
- **3 つの error 分類** — `Rejected / NotReady / Internal` が 3 種類の consensus 応答 (反対 vote / 待つ / 停止) に対応する。1 つの string variant にすると consensus 側が string を parse する羽目になり、variant を増やすと EL 内部が漏れる。
- **Trait-as-contract プログラミング** — このファイルがコンパイルされた瞬間、以降のレッスンはすべて「この method を実装する」か「この method を呼ぶ」のどちらかになる。L4-L5 は impl、L10-L14 は caller。ここから先の codebase の形が決まる。

検証:

```bash
cargo check -p openhl-consensus
```

上記の実行結果が pass する。`openhl-consensus` crate に 4 メッセージの `ConsensusBridge` trait — consensus が呼び、execution が実装する型付き API surface — が入る。**impl はまだない** (L4 から始まる)。trait とそれに紐づく error type だけだ。

具体的な変更:

- `crates/consensus/Cargo.toml` に 4 つの依存追加: `openhl-types`、`async-trait`、`thiserror`、`eyre`。
- `crates/consensus/src/bridge.rs` — 新規ファイル、`ConsensusBridge` trait (4 つの async method) と `BridgeError` enum (3 variant) を含む。
- `crates/consensus/src/lib.rs` — `pub mod bridge;` を配線する。

## おさらい

L2 を終えた時点:

```
crates/types/src/lib.rs:
  - BlockHash、PayloadId、PayloadAttrs、PayloadStatus、ExecutedBlock
  - + BlockHash の Display impl
  - + 4 unit test pass
```

`openhl-consensus` を含むほかの crate はまだ空の stub:

```
crates/consensus/src/lib.rs:
  //! Consensus layer — Malachite BFT.
crates/consensus/Cargo.toml:
  [dependencies]   ← 空
```

## 計画

3 つのことをする:

1. **`crates/consensus/Cargo.toml` に 4 つの依存を追加する**: `openhl-types` (L2 の type を使うため)、`async-trait` (trait メソッドで `async fn` を合法化するマクロ)、`thiserror` (きれいな error type を derive する macro)、`eyre` (`thiserror` と相性のよい `Result` ライブラリ)。
2. **`crates/consensus/src/bridge.rs` を作成する** — `ConsensusBridge` trait (4 つの async メソッド) と `BridgeError` enum (3 variant)。
3. **`crates/consensus/src/lib.rs` に `pub mod bridge;` を追加して** bridge module を crate に組み込む。

この trait は **コース全体で最も参照されるアーティファクト** だ。L4 で impl する (`InMemoryEvmBridge`)。L5 でもう一度 impl する (`RethEvmBridge`)。L9 で actor pipeline から呼ぶ。L11-L13 で 3 度目の impl (`LiveRethEvmBridge`)。**今書く signature が下流すべてに伝播する。**

> 🛑 **考えてみよう。** もう一度 4 つのメソッド名を見る: `build_payload`、`payload_ready`、`validate_payload`、`commit`。**3 つは CL → EL (consensus が execution を呼ぶ)、1 つは EL → CL (execution が応答する)。どれが EL → CL 方向か、そしてなぜか?** ヒント: そのメソッドの *戻り値* を consensus 側がどう待っているかを考える。

## 手を動かす walk-through

### Step 1: `crates/consensus/Cargo.toml` に依存を追加

`crates/consensus/Cargo.toml` を開く。`[dependencies]` セクションは現状 header だけで空のはずだ。次に置き換える:

```toml
[dependencies]
openhl-types = { workspace = true }
async-trait  = { workspace = true }
thiserror    = { workspace = true }
eyre         = { workspace = true }
```

4 つ。それぞれ `workspace = true` でルート `Cargo.toml` の pinned version を継承する。保存して:

```bash
cargo check -p openhl-consensus
```

これでも pass するはず — まだ使っていない依存を宣言しただけだからだ。Cargo は lock file に無いものを fetch する。`async-trait` と `thiserror` は小さいので、~5 秒で終わる。

**なぜこの 4 つか?**

- **`openhl-types`** — trait の signature が L2 の 5 つの type (`BlockHash`、`PayloadAttrs`、`PayloadId`、`ExecutedBlock`、`PayloadStatus`) を参照するため。
- **`async-trait`** — Rust の native な「trait 内の `async fn`」はいくつかの caveat (Send bound、`dyn` 互換性) が残っており、まだ完全には解決していない。`#[async_trait]` macro はそれを `Pin<Box<dyn Future<...>>>` へ desugar して処理する。冗長だが安定していて `dyn` 互換だ。
- **`thiserror`** — `impl Display`/`impl Error` を手書きせずに custom error enum を derive するため。
- **`eyre`** — catch-all な `Internal` variant 用。`eyre::Report` は任意の error をバックトレース付きでラップする。「予期せぬ何かがおかしくなった」を、internal failure mode をすべて列挙せずに表現するのに使う。

### Step 2: `crates/consensus/src/bridge.rs` を作成

新しいファイル。全体の内容:

```rust
//! The CL/EL contract: four messages between consensus and execution.

use async_trait::async_trait;
use openhl_types::{BlockHash, ExecutedBlock, PayloadAttrs, PayloadId, PayloadStatus};
use thiserror::Error;

/// The four-message contract between BFT consensus and EVM execution.
///
/// Every interaction between `openhl-consensus` and `openhl-evm` flows through one of these methods. Anything else is a contract leak.
#[async_trait]
pub trait ConsensusBridge: Send + Sync {
    /// CL → EL: build a candidate block on `parent`. Returns immediately; await the block via [`Self::payload_ready`].
    async fn build_payload(
        &self,
        parent: BlockHash,
        attrs: PayloadAttrs,
    ) -> Result<PayloadId, BridgeError>;

    /// EL → CL: wait for an in-flight build to complete.
    async fn payload_ready(&self, id: PayloadId) -> Result<ExecutedBlock, BridgeError>;

    /// CL → EL: would this peer-proposed block execute cleanly?
    async fn validate_payload(
        &self,
        block: &ExecutedBlock,
    ) -> Result<PayloadStatus, BridgeError>;

    /// CL → EL: finalize this block. Fire-and-forget; failure halts the chain.
    async fn commit(&self, block_hash: BlockHash) -> Result<(), BridgeError>;
}

#[derive(Debug, Error)]
pub enum BridgeError {
    #[error("execution layer rejected payload: {0}")]
    Rejected(String),

    #[error("execution layer is syncing")]
    Syncing,

    #[error("internal: {0}")]
    Internal(#[from] eyre::Report),
}
```

各部分の役割を walk する — このファイルはコース内で最も重要なファイルだ。

### Step 3: Trait 宣言を理解する

```rust
#[async_trait]
pub trait ConsensusBridge: Send + Sync {
```

**`#[async_trait]`** は attribute macro で、trait を書き換えて各 `async fn` を `Pin<Box<dyn Future<Output = ...> + Send + 'a>>` を返す形にする。このマクロが無いと、`dyn ConsensusBridge` (後で必ず使う) として trait を呼びたいときに Rust がエラーを出す。

**`pub trait ConsensusBridge`** で trait を public API にする — `openhl-consensus` 自身も、後続の `openhl-evm` impl のような downstream crate も、この名前を使える。

**`: Send + Sync`** は super-trait bound。`ConsensusBridge` を impl するすべての type は `Send` (thread 境界をまたいで move 可能) かつ `Sync` (複数 thread から参照可能) でなければならない、と宣言している。bridge は `Arc<dyn ConsensusBridge>` として actor task 間で共有されるので、これが必要だ — actor は別 thread に住み得る。

> 🛑 **やりがちな勘違い。** 「macro なしで `async fn` を直接書けないのか?」 **Rust 1.75 以降なら書けるが caveat がある。** Native な async-fn-in-trait は返される future に自動で `Send` bound を付けてくれず、native async fn を持つ trait の `dyn Trait` にはまだ粗い部分が残る。`#[async_trait]` は退屈だが確実に動く解決策だ。Native feature が成熟したら (おそらく 1.95-2025 以降) 見直せる。今は macro で行く。

### Step 4: 4 つの method signature を理解する

```rust
async fn build_payload(
    &self,
    parent: BlockHash,
    attrs: PayloadAttrs,
) -> Result<PayloadId, BridgeError>;
```

入力: parent block hash と payload attribute。出力: `PayloadId` — 不透明 handle で、bridge は build を開始したがブロックはまだ ready ではない、ということを表す。即座に return する。

```rust
async fn payload_ready(&self, id: PayloadId) -> Result<ExecutedBlock, BridgeError>;
```

その companion。`build_payload` から返ってきた `PayloadId` を渡し、`ExecutedBlock` を受け取る。in-flight な build が完了するまで block するので async になっている。

**なぜ `build_payload` + `payload_ready` に分けて、1 つの `build_payload -> ExecutedBlock` にしないのか?** EL が *前 round の投票中に* build する必要があるからだ。`build_payload` が同期的にブロックを返すなら、proposer は build を待ってから broadcast することになる。分けると build が裏で走りつつ投票が進み、proposer の hot path は「準備済みブロックを fetch」(microsecond) に縮む。これが設計上 **最も重要な latency trick** で、sub-second block time はこれに依存する。

```rust
async fn validate_payload(
    &self,
    block: &ExecutedBlock,
) -> Result<PayloadStatus, BridgeError>;
```

形が違う: `&ExecutedBlock` (borrowed、own ではない)。Bridge はブロックを *調べる* だけで、consume しない。`PayloadStatus` (L2 の enum) を返す — Valid / Invalid / Syncing のいずれか。

**なぜ borrowed か?** Consensus は同じブロックを複数回 inspect する必要があるかもしれないからだ (broadcast、persist、それから validate)。Ownership を取ると call site で値が consume され、呼び出し側が clone を強いられる。Borrow なら呼び出し側がそのまま保持できる。

```rust
async fn commit(&self, block_hash: BlockHash) -> Result<(), BridgeError>;
```

最も小さい signature: 入力は hash、出力は unit。**Fire-and-forget。** Consensus がブロックを decide した時点でこのメソッドが EL に「finalize しろ」と告げる。EL は state に適用し、fork-choice を更新し、それ以降この hash を unset することは無い。`Result<()>` を返すことで hard failure を signal できる (**chain を halt させる** — L9 で扱う) が、成功 commit は何も返さない。

**`&ExecutedBlock` 引数が無い** ことに注意。commit が呼ばれる時点で、bridge は `payload_ready` か `validate_payload` でこのブロックをすでに見ている。hash だけを引数に取ることで、consensus は何も覚えなくて済む — EL が state を持ち、CL は stateless のままだ。

### Step 5: `BridgeError` enum を理解する

```rust
#[derive(Debug, Error)]
pub enum BridgeError {
    #[error("execution layer rejected payload: {0}")]
    Rejected(String),

    #[error("execution layer is syncing")]
    Syncing,

    #[error("internal: {0}")]
    Internal(#[from] eyre::Report),
}
```

3 variant — `PayloadStatus` と同じ数だが、**1:1 対応ではない**。区別は次のとおり:

- **`Rejected(String)`** — EL がブロックにロジックを適用して「no、これは bad」と言った。String が human-readable な理由を持つ。Consensus はブロックを invalid として扱うべきだ: nil 投票し、次 round へ。
- **`Syncing`** — EL がまだ答えるための state を持っていない。Rejection とは違う: ブロックが bad かどうかはまだ分からない、答えられないだけだ。Consensus は後でリトライすべきで、nil 投票はしない。
- **`Internal(eyre::Report)`** — 予期せぬ何かが壊れた。Disk full、mutex poisoned、panic caught など。Consensus は **halt** すべきだ — chain レベルでは回復不能。

**`PayloadStatus::Syncing` も status として存在するのに、なぜ `Syncing` が error variant なのか?** Contract に 2 層があるからだ:

- `validate_payload` からの `PayloadStatus::Syncing` は「EL が request を処理し、自分の sync state を report した」という意味だ。
- 任意のメソッドからの `BridgeError::Syncing` は「call そのものが完了できなかった」という意味だ。`build_payload` (parent state が無いと build できない) と `commit` (適用できないものは finalize できない) でよく出る。

**`#[from] eyre::Report`** で `From<eyre::Report> for BridgeError::Internal` を自動 derive する。Bridge 実装側は `let foo = some_call()?;` と書けて、`some_call()` が `Result<_, eyre::Report>` を返すとき `?` が自動で `BridgeError::Internal` にラップしてくれる。「予期せぬ」エラーを bubble up する canonical な方法だ。

### Step 6: `bridge` を crate に組み込む

`crates/consensus/src/lib.rs` を開く。現状:

```rust
//! Consensus layer — Malachite BFT.
```

次に置き換える:

```rust
//! Consensus layer — Malachite BFT.

pub mod bridge;
```

`pub mod bridge;` が Rust に「この crate には `bridge` という public module があり、source は `src/bridge.rs`」と教える。この行が無いと `bridge.rs` は crate 外から見えない。

## テスト

実行:

```bash
cargo check -p openhl-consensus
```

期待値:

```
   Compiling openhl-consensus v0.1.0
    Finished `dev` profile [optimized + debuginfo] target(s) in 0.45s
```

unused imports の warning (例: method signature をタイプミスして `ExecutedBlock` が未使用になる) や unused trait の warning が出るかもしれない。**Hard error は許容できないが**、warning は今のところ OK。

よくあるエラーと対処:

- **`use of undeclared crate or module 'async_trait'`** — `async-trait` が `[dependencies]` に無い。Step 1 を再確認。
- **`cannot find type 'BlockHash' in this scope`** — `openhl-types` が import されていない。`bridge.rs` の `use` 行を再確認。
- **`expected type parameter 'Send + Sync', found...`** — `pub trait ConsensusBridge` の後に `: Send + Sync` を書き忘れている。戻す。
- **`#[from] is only allowed on a single field`** — variant に `#[from]` を 2 個以上書いたか、tuple field のない variant に `#[from]` を付けている。

workspace 全体もコンパイルしてみる:

```bash
cargo check --workspace
```

引き続き pass するはず。

## 設計を振り返る

このレッスンで encode した本質的な決定が 3 つ:

1. **メソッドは 4 つ。3 でも 5 でもない。** すべての BFT-L1 実装がきっかりこの 4 つに収束する。`build_payload` + `payload_ready` を 1 つに collapse すると build-during-voting が死ぬ。5 つ目 (例: `notify_view_change`) を足すと consensus 内部が execution に leak する。数は BFT round 構造 (propose → vote → decide) で決まるもので、言語の好みでは決まらない。

2. **trait に `Send + Sync` bound。** すべての impl が thread-safe であることを強制する。これが無いと、actor 間で共有される `Arc<dyn ConsensusBridge>` がコンパイルできない。これがあれば、実装者は「mutable state は Mutex か atomic の裏に置く必要がある」と最初から分かる。Runtime バグへの discipline を compiler が enforce してくれる形だ。

3. **Error variant は 3 つ。1 つでも多くでもない。** 3 つは consensus 側の 3 つの distinct な action (vote-against、wait、halt) に対応する。`BridgeError(String)` 1 つだと consensus 側で文字列パースをすることになる。5 つ以上 (例: `Rejected.Hash`、`Rejected.Number`、`Rejected.BaseFee`) にすると、EL 内部を consensus 側に leak するか、EL が変わると急速に drift する。3 つは **consensus が error に対して取る応答** の cardinality であり、EL の internal taxonomy は `Rejected` の String の裏に隠したままだ。

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 13113db
diff -u ~/code/my-openhl/crates/consensus/src/bridge.rs ./crates/consensus/src/bridge.rs
diff -u ~/code/my-openhl/crates/consensus/Cargo.toml ./crates/consensus/Cargo.toml
```

期待値: doc-comment の言い回しは多少違って OK。4 つの method signature、3 つの error variant、`#[async_trait]` attribute、`: Send + Sync` bound は完全に一致する必要がある。

main に戻す:

```bash
git checkout main
```

## よくある質問

**Q: `cargo check` が `pub mod bridge` と `bridge.rs not found` で文句を言う。**
ファイルは `crates/consensus/src/bridge.rs` であって `crates/consensus/bridge.rs` ではない。convention は「`lib.rs` で宣言された module は `lib.rs` の隣に住む」だ。

**Q: `validate_payload` が bytes を inspect するだけなら、なぜ async?**
v0 では sync でもよい — `BlockHash` を `parent_hash` と比較するのは microsecond の話だ。だが production の validate_payload は parent state に対して EVM を走らせるので、async DB access が必要になる。今 async にしておけば、後で trait を破る必要が無い。コストはほぼゼロ (immediate-ready future は実質タダ)。

**Q: メソッド名は変えていい? `build_payload` は冗長だ。**
自分のコードでは変えられるが、openhl からは divergence する。名前は Ethereum Engine API に合わせてある (`engine_forkchoiceUpdated` が `PayloadId` を返し、`engine_getPayload` で fetch する)。これで openhl ↔ Ethereum のマッピングが、後者を知っている人にとって分かりやすくなる。

**Q: `eyre::Report` とは何か? なぜ `String` ではいけないのか?**
`eyre::Report` は cause chain と source-location info を持つ。Chain halt をデバッグするときに見たいのは「DB write failed: disk full: at io.rs:142」であって、「internal error」だけでは困る。`Report` はこれをやってくれる、`String` はやってくれない。catch-all variant に使う。

## 次のレッスン (L4)

Contract は型レベルで完全に specified された。L4 で impl を開始する。`InMemoryEvmBridge` を書く — fake ブロックを `Mutex<HashMap>` に保存して synthesize した hash を返す test double だ。Real EVM も real state も無い — trait を満たして consensus 側をテスト可能にするための最小限の実装。**重要なのは、同じ trait `ConsensusBridge` が `InMemoryEvmBridge` (L4) と `LiveRethEvmBridge` (L11+) の両方をカバーすること — `Send + Sync` bound と `async_trait` macro のコストを払うことで得られる polymorphism の win だ。**
````

---

## Seed-file slot

L3 は Module 2 (Contract types) の sortOrder 1 に landing する:

```typescript
{
  title: 'レッスン 3 — ConsensusBridge trait',
  slug: 'openhl-bridge-trait-ja',
  type: 'CONTENT',
  sortOrder: 1,
  duration: 30,
  xpReward: 60,
  content: `# レッスン 3 — \`ConsensusBridge\` trait\n\n...`
},
```

## SHA pinning discipline

L3 が引用する openhl commit (§答え合わせ で参照):
- `13113db` (Stage 4: ConsensusBridge trait + CL/EL contract types — L2 と同じ commit; L3 は trait 部分、L2 は type 部分を扱う)

## Style review notes (self-critique before paste)

- **L3 は 30 分で L2 と同じ長さ。** コード量は ~45 行と少ないが、理解密度は高い。trait の各行に設計判断がある。
- **Step 3-4-5 でファイルを部分ごとに walk する。** 意図的。L1 (TOML/Cargo) と L2 (5 type 定義) を経て読者はコードブロックを流し読みしがちになる。区切って解説することで各設計判断に engage させる。
- **Step 3 のやりがちな勘違い callout** (「macro なしで async fn を書けないか?」) は Rust 1.75+ を知っている読者が trade-off を理解していない場合への対処。
- **§設計を振り返る で「trait のメソッド数は BFT 構造で決まる」を強調**。レッスン中で最も meta な主張で、land させる価値が最も高い。
- **「よくある質問」の Q3** (メソッド名のリネーム) は学習者が嵌るパターンを先回りしている。「build_payload は冗長」と思って `build` にすると、後で Ethereum Engine API mapping が見えなくなる。
- **翻訳 policy は L1/L2 JA と同一**:
  - Rust の syntax 用語 (trait、impl、derive、Send、Sync、async fn、Pin、Box、dyn) は英語のまま
  - Cargo の用語 (`workspace = true`、`[dependencies]`) は英語のまま
  - `#[async_trait]`、`#[derive(Error)]`、`#[from]` 等のマクロ呼び出しは英語のまま
  - コード、ファイルパス、コマンドは英語のまま
  - 🛑 callout: 考えてみよう (Predict)、やりがちな勘違い (Anti-fluency)
  - 「contract」「fork」「leak」「polymorphism」等は英語のまま (CS/SE の確立した語彙)
