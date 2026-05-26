# OpenHL CLOB を作る — L9 draft (JA) — build-along

> openhl SHA `428cc26` (Stage 8d — CLOB の約定が bridge payload に流れる) 基準。
> コース: `building-openhl-clob-ja` (track: `reth-l1-architect`)。

---

## L9 — `openhl-clob-bridge-fields-ja`

- **モジュール:** 4 (Bridge 統合), モジュール内 sortOrder 0
- **コース全体 sortOrder:** 8 (12 レッスン中 9 番目)
- **所要時間:** 40 分
- **XP:** 70
- **type:** CONTENT

### Content

````markdown
# レッスン 9 — `LiveRethEvmBridge` に CLOB + `submit_order` を持たせる

## ゴール

このレッスンで掴む概念:

- **CLOB は Reth EVM の *中* ではなく bridge の *横* に置く** — `clob: Mutex<Book>` は `LiveRethEvmBridge` のフィールドであり、`provider` や `state` と並ぶ。約定は payload に併走する parallel データレーンであって、まだ EVM transaction ではない (それは course 8 の precompile で扱う)。これが「CLOB を EVM の上に乗せる」アーキテクチャの形。
- **Lock 粒度: `Mutex` は 1 つではなく 2 つ** — `clob` と `pending_fills` は別タイミングで別 caller に変更される。Lock を分けておけば、`pending_fill_count` を読むスレッドが book を触る submitter を block しない。Contention がホットパスに乗ると lock 粒度が効いてくる。
- **Interior mutability + `&self` が async 共有 state の idiomatic な形** — `submit_order(&self, ...)` だからこそ、bridge を `Arc` で wrap して task 間で共有できる。トップに `RwLock<Bridge>` を載せると、すべてのアクセスが直列化してしまう。
- **Lock を取る API は lock 越しに参照を返してはならない** — `payload_fills` は `&[Fill]` ではなく `Vec<Fill>` (clone) を返す。Borrow を返すと caller がスライスの lifetime 分 lock guard を抱え続け、同じ lock を欲しがる他者と即デッドロックする。
- **空 `Vec` placeholder は TODO コメントより見つけやすい** — `build_payload` には L10 が `std::mem::take(...)` に差し替えるまで `Vec::new()` を入れておく。読者は欠けている機能の場所を正確に見られる。コメントは腐る。

検証:

```bash
cargo test -p openhl-evm --release
```

上記の実行結果が引き続き pass する (course 6 由来の 38 テスト + L9 の new test なし、合計依然 38)。Bridge が CLOB matching engine を **所有** するようになる。

具体的な変更:

- **新規 workspace dep 1 個** — `crates/evm/Cargo.toml` に `openhl-clob = { workspace = true }` を追加。
- **`LiveRethEvmBridge` に新規フィールド 2 個** — `clob: Mutex<Book>` と `pending_fills: Mutex<Vec<Fill>>`。
- **pending tuple を拡張** — `pending: HashMap<u64, (B256, Header)>` を `HashMap<u64, (B256, Header, Vec<Fill>)>` に変える。3 番目の要素が payload ごとの約定リスト。
- **新規メソッド 3 個** — `submit_order(&self, order: Order) -> FillResult`、`payload_fills(id) -> Option<Vec<Fill>>` (inspection 用)、`pending_fill_count() -> usize` (inspection 用)。
- **波及更新** — `build_payload`、`payload_ready`、`validate_payload`、`commit` での pending tuple の destructuring をすべて 3-tuple pattern に揃える。

**`build_payload` はまだ `pending_fills` を drain しない** — 今は空の `Vec<Fill>` を挿入する。drain の実装は L10 で行う。L9 後、order を submit でき、約定が `pending_fills` に蓄積していく様子も観察できるようになるが、bridge の payload はまだ約定を運ばない。**L10 でそのギャップを閉じ、L11 でそれを証明する integration test を書く。**

## おさらい

Course 6 (consensus、L14 完了) + course 7 (CLOB、L8 完了) 時点で workspace は:

```
crates/clob/                            — 完成した matching engine (L1-L8)
crates/evm/src/live_node.rs             — LiveRethEvmBridge<P>
  fields: provider, chain_spec, validator, engine_handle: Option<...>, state: Mutex<State>
  pending: HashMap<u64, (B256, Header)>
crates/consensus/                       — フル BFT engine
```

`cargo test -p openhl-evm` で 38 個 pass する。**CLOB も bridge もそれぞれ存在するが、互いを知らない状態。** L9 で bridge を CLOB に接続する。

## 計画

`crates/evm/` 内で 6 項目 (実際の手順は 7 step):

1. **`openhl-clob = { workspace = true }`** を `crates/evm/Cargo.toml` の `[dependencies]` に追加する。
2. **Import を追加する** — `crates/evm/src/live_node.rs` に `use openhl_clob::{Book, Fill, FillResult, Order};` を入れる。
3. **`clob` + `pending_fills` フィールドを追加する** — `LiveRethEvmBridge<P>` struct に。
4. **`pending` を 3-tuple に変更する** — `State` struct 側。
5. **`new()` を更新する** — 新フィールドを初期化する。
6. **メソッド 3 個を追加する** — `impl<P> LiveRethEvmBridge<P>` block に `submit_order`、`payload_fills`、`pending_fill_count` を追加。
7. **destructuring を波及更新する** — `build_payload`、`payload_ready`、`validate_payload`、`commit` を新しい 3-tuple shape にマッチさせる。`build_payload` は今のところ空の `Vec<Fill>` を挿入しておく。

Step 7 は退屈に聞こえるが機械的な作業: `(hash, header)` や `(h, _)` を書いた場所すべてが `(hash, header, fills)` または `(h, _, _)` になる。Compiler が各場所をクリアなエラーで教えてくれる。

L9 後の bridge の内部トポロジーを 1 枚にまとめると:

```
        order in
            ↓
   ┌───────────────────────────────────┐
   │  LiveRethEvmBridge<P>             │
   │                                   │
   │   ┌─────────────────┐             │
   │   │ Arc<Mutex<Book>>│ ← submit_order が短時間ロック
   │   │   (matching)    │   して match、結果を返す
   │   └─────────────────┘             │
   │            │ fills                │
   │            ↓                      │
   │   ┌─────────────────────┐         │
   │   │ Mutex<Vec<Fill>>    │ ← submit_order が短時間ロック
   │   │   (pending_fills)   │   して append。L10 で build_payload
   │   └─────────────────────┘   が drain する
   │            │                      │
   │            ↓                      │
   │   ┌──────────────────────────┐    │
   │   │ Mutex<State>             │    │
   │   │   pending: HashMap<id,   │    │
   │   │     (hash, header,       │ ← L10 で fills を Vec<Fill> として注入
   │   │      Vec<Fill>)>         │   今は空 Vec を挿入
   │   └──────────────────────────┘    │
   └───────────────────────────────────┘
            │ build_payload → PayloadId
            ↓
        EVM レーン（state、header、forkchoice）
```

`clob` と `pending_fills` を **別々の Mutex** に分けているのが load-bearing — 2 つのレーンが直列化しないので、片方が長く保持されても他方が遅延しない。EVM レーン側（`State` 内の `pending` HashMap）は既存の bridge の動きで、CLOB は完全な並走レーンとして接続される。

> 🛑 **考えてみよう。** スクロールする前に: L9 後、`bridge.submit_order(order)` を呼べるようになり、`bridge.pending_fill_count()` で fill が蓄積していく様子が観察できる。そこで `bridge.build_payload(parent, attrs)` を呼ぶと、新しく build された payload に対する `bridge.payload_fills(id)` は何を返すか? ヒント: §Step 7 を注意深く読む。

(答え: `Some(vec![])` — 空の fill リスト。L9 はデータフローを接続するが、`build_payload` はまだ drain せず空 Vec を挿入する。L10 の「build 時に drain」変更で、これが `Some(vec![fill_a, fill_b, ...])` になる。)

## 手順

### Step 1: `crates/evm/Cargo.toml` に dep を追加

`crates/evm/Cargo.toml` を開く。現在の `[dependencies]` セクション (course 6 後) には各種 `openhl-types`、`reth-*`、`alloy-*` dep がある。1 行追加:

```toml
[dependencies]
openhl-consensus         = { workspace = true }
openhl-types             = { workspace = true }
openhl-clob              = { workspace = true }      # NEW
async-trait              = { workspace = true }
# ... rest unchanged ...
```

`openhl-clob` は workspace `Cargo.toml` に既に宣言済み (path entry を L1 で追加した)。`[dependencies]` entry は「この特定 crate がそれを使う」ことを宣言する役割を果たす。

### Step 2: `live_node.rs` に import を追加

`crates/evm/src/live_node.rs` を開く。現在の import に reth 関連型がある。`openhl_consensus` import の上にこの行を追加:

```rust
use alloy_consensus::Header;
use alloy_primitives::{Address, B256};
use alloy_rpc_types_engine::ForkchoiceState;
use async_trait::async_trait;
use openhl_clob::{Book, Fill, FillResult, Order};                     // NEW
use openhl_consensus::bridge::{BridgeError, ConsensusBridge};
use openhl_types::{BlockHash, ExecutedBlock, PayloadAttrs, PayloadId, PayloadStatus};
// ... rest unchanged ...
```

4 つの型を pull in する: `Book` (matching engine)、`Fill` (output)、`FillResult` (`Book::submit` の wrapper)、`Order` (submit の input)。

モジュールレベルの doc comment も新しい stage を反映するように更新する。ファイル冒頭の既存 `//! Stage 7X` コメントブロックを探す:

```rust
//! Stage 7a: parent lookups go through the live node's provider via the
//! `BlockNumReader` trait.
//!
//! Stage 7c: `validate_payload` runs Reth's `EthBeaconConsensus::
//! validate_header_against_parent` against the live parent ...
//!
//! Stage 7d: `commit` now sends a `ForkchoiceUpdated` to Reth's in-process
//! consensus engine ...
```

…どこか妥当な場所 (7c と 7d の間でも構わない) に新規 Stage 8d block を挿入する:

```rust
//! Stage 8d: the bridge now owns a CLOB matching engine. `submit_order` routes
//! orders into the book and accumulates resulting fills in `pending_fills`.
//! `build_payload` drains the pending fills and stores them alongside the
//! synthesized header, so the payload carries real CLOB-generated content.
//! Fills are not yet encoded as EVM transactions executable by Reth's
//! `BlockExecutor` — that's the next stage (or Module 3). 8d proves the
//! wiring exists; encoding is downstream.
```

これがメタドキュメントの役割を果たす — 6 ヶ月後に誰かがファイルを読んだとき、staging comment が地図になる。

### Step 3: `LiveRethEvmBridge` にフィールド追加

Struct 定義を見つけ、`validator` と `state` の間にフィールド 2 個を追加する:

```rust
#[derive(Debug)]
pub struct LiveRethEvmBridge<P> {
    provider: P,
    chain_spec: Arc<ChainSpec>,
    validator: EthBeaconConsensus<ChainSpec>,
    clob: Mutex<Book>,                                            // NEW
    pending_fills: Mutex<Vec<Fill>>,                              // NEW
    engine_handle: Option<ConsensusEngineHandle<EthEngineTypes>>,
    state: Mutex<State>,
}
```

`Mutex` でラップされたフィールドが 2 個。両方を `Mutex` にする理由は次の通り:

- **`clob: Mutex<Book>`** — matching engine。`Book` 自体は内部的に thread-safe ではない。`Mutex` でラップすれば、複数の caller が同時に order を submit できる (engine app loop に統合された後、bridge は `Arc<LiveRethEvmBridge>` で共有される)。
- **`pending_fills: Mutex<Vec<Fill>>`** — `submit_order` が fill を push し、(L10 の) `build_payload` が drain する buffer。`clob` と別の `Mutex` にしているのは、2 つが異なるタイミングで mutate するから: submit は matching のために `clob` の lock を短時間保持し、その後 append のために `pending_fills` の lock を短時間保持する。lock を分けることで、2 つの submit が submit → push の全 chain を直列化しなくて済む。

> 🛑 **やりがちな勘違い。** 「`Mutex<(Book, Vec<Fill>)>` 1 個ではなく `Mutex` 2 個にする理由は?」 **Lock 粒度。** 1 個の mutex で両方を覆うと、submit ごとに matching 作業と fill-buffer mutation の両方で lock を保持する。submit せずに `pending_fill_count` を読みたい将来のコード (たとえば L10 の `build_payload` drain やデバッグツール) が、submit-in-progress で block されてしまう。`Mutex` を 2 個にすれば、read が write contention を bypass できる。**コストは余分な `Mutex::new` 呼び出しが数個増える程度。利益は並行スループットの改善。**

### Step 4: `pending` tuple を変更

`State` struct 定義を見つける:

```rust
#[derive(Debug, Default)]
struct State {
    next_payload_id: u64,
    pending: HashMap<u64, (B256, Header)>,
    chain: HashMap<B256, Header>,
    head: Option<B256>,
}
```

`pending` の value 型を 3-tuple に変更し、3 番目要素を `Vec<Fill>` にする:

```rust
#[derive(Debug, Default)]
struct State {
    next_payload_id: u64,
    /// Pending payloads keyed by `PayloadId.0`. Value is (`block_hash`, `header`,
    /// fills drained from the CLOB at `build_payload` time).
    pending: HashMap<u64, (B256, Header, Vec<Fill>)>,
    chain: HashMap<B256, Header>,
    head: Option<B256>,
}
```

`chain` は `HashMap<B256, Header>` のまま据え置く。commit された block はここで fill を track する必要がない — fill は commit の下流に流れていく。(Production コードでは fill をどこかに persist することになるが、それは本コースの範囲外。)

**新しい doc コメント自体がレッスンの一部。** 3 番目要素が存在する **理由** を説明する — `submit_order` → `pending_fills` → `build_payload` drain → `pending` map の payload ごとの `Vec<Fill>` というデータフローを残しておく。

### Step 5: `new()` を更新

現在の `new()` は 4 フィールドを初期化している。変更後は 6 個になる。更新:

```rust
impl<P> LiveRethEvmBridge<P> {
    #[must_use]
    pub fn new(provider: P, chain_spec: Arc<ChainSpec>) -> Self {
        let validator = EthBeaconConsensus::new(Arc::clone(&chain_spec));
        Self {
            provider,
            chain_spec,
            validator,
            clob: Mutex::new(Book::new()),                        // NEW
            pending_fills: Mutex::new(Vec::new()),                // NEW
            engine_handle: None,
            state: Mutex::new(State::default()),
        }
    }
```

新規フィールドの初期化が 2 個。`Book::new()` は L3 で書いたヘルパー (workspace に接続されているので、ここで `openhl_clob::Book::new()` が呼べる)。空の fill buffer には `Vec::new()` を使う。

### Step 6: 新メソッド 3 個を追加

`new()` の下 (または pub メソッドをまとめたければ `chain_spec()` の後) に追加:

```rust
    /// Submit an order to the CLOB. Resulting fills are buffered in
    /// `pending_fills` until the next `build_payload` drains them.
    pub fn submit_order(&self, order: Order) -> FillResult {
        let mut book = self.clob.lock().expect("clob mutex poisoned");
        let result = book.submit(order);
        if !result.fills.is_empty() {
            self.pending_fills
                .lock()
                .expect("pending_fills mutex poisoned")
                .extend(result.fills.iter().copied());
        }
        result
    }

    /// Inspect (read-only) the fills attached to a built payload. Returns
    /// `None` if the payload id is unknown. Production code would encode
    /// these as EVM-executable transactions before they reach the block
    /// body; v0 keeps them as a parallel list for test inspection.
    #[must_use]
    pub fn payload_fills(&self, id: PayloadId) -> Option<Vec<Fill>> {
        let s = self.state.lock().expect("state mutex poisoned");
        s.pending.get(&id.0).map(|(_, _, fills)| fills.clone())
    }

    /// Number of fills currently buffered, waiting for the next `build_payload`.
    #[must_use]
    pub fn pending_fill_count(&self) -> usize {
        self.pending_fills
            .lock()
            .expect("pending_fills mutex poisoned")
            .len()
    }
```

メソッド 3 個、それぞれの意図は次の通り:

- **`submit_order`** — **write** path。`&self` を取る (`&mut self` ではない)。`Mutex` 経由の interior mutability によって、shared 参照で bridge を mutate できる。`clob` を lock し、`book.submit` を呼び、`FillResult` を受け取る。約定が生成されたら、`pending_fills` を lock して append する。`FillResult` を return して caller に何が起きたかを知らせる。

  > **ロック順序の安全性 — 重要:** ソース上は `let mut book = self.clob.lock()...` が関数の途中まで生きているように見えるが、Rust の **non-lexical lifetimes (NLL)** によって、`book.submit(order)` の行（`book` の最後の使用）の **直後に** `book` (MutexGuard) は drop される。`pending_fills.lock()` が呼ばれる時点では `clob` のロックは既に解放されている。つまり **2 つのロックは決して同時に保持されない** — 直列に取って直列に放す。デッドロックの可能性はゼロ。コンパイラがこの drop タイミングを保証してくれる。
  >
  > もし明示性を最大化したければ、`let result = { let mut book = ...; book.submit(order) };` のように **scope block で囲む**、または `drop(book);` を `book.submit` の直後に書く、という書き方もある。本コースは `openhl` 参照 SHA との byte-identical を優先するためそのままにしているが、production code では明示的な scope か `drop` のほうが、将来「ロックを保持したまま別ロックを取る」拡張を入れにくくなる防御として機能する。
- **`payload_fills`** — **inspection** path。指定 `PayloadId` に対して `Option<Vec<Fill>>` を返す。`PayloadId` が pending にない場合は `None`、ある場合は `Some(vec)` (空の可能性あり)。Doc コメントで、これが test-and-debug 用のメソッドであることを明示する — production コードは fill を transaction-encoding pipeline 経由で route する。
- **`pending_fill_count`** — 小さな debugging ヘルパー。Buffer で drain 待ちの fill 数を返す。「Cross する 2 order を submit、count == 1 を期待」といったテストで有用。

3 メソッドすべてが `&self` を取る点に注目。内部の `Mutex` が重い処理を担い、public API としては「shared 参照 + interior mutability」になる — まさに async コードが必要とする形 (複数の async task が `&LiveRethEvmBridge` を同時に保持できる)。

> 🛑 **やりがちな勘違い。** 「`submit_order` が `&mut self` ではなく `&self` を取るのはなぜか?」 **order を同時に submit したい async task 間で bridge を共有する必要があるから。** Matching engine (実際に mutate するコード) は `Mutex` の後ろにあり、Rust の borrow checker は「mutex が exclusion を強制しているから、この mutation は安全」と受け入れる。`submit_order` が `&mut self` を取るなら `Arc<RwLock<LiveRethEvmBridge>>` が必要になり、submit ごとに bridge 全体を lock する— パフォーマンスが悪化し、API の形としても適切でない。**Interior mutability は shared concurrent access が use case のときに正しいツール。**

### Step 7: destructuring を波及更新

ここからは退屈だが機械的な作業。pending tuple は 3 要素になったので、pattern match する場所すべてをそれに合わせる必要がある。合計 5 サイト:

**Site 1: `build_payload`** — `s.pending.insert(id, ...)` を検索。現在:

```rust
let hash = header.hash_slow();
s.pending.insert(id, (hash, header));
Ok(PayloadId(id))
```

変更:

```rust
let hash = header.hash_slow();
s.pending.insert(id, (hash, header, Vec::new()));    // 今は空 Vec<Fill>; L10 がここで pending_fills を drain する
Ok(PayloadId(id))
```

**`Vec::new()` は placeholder。** L10 で `std::mem::take(&mut *self.pending_fills.lock()...)` に置き換える。

**Site 2: `payload_ready`** — `s.pending.get(&n).cloned()` を検索。現在:

```rust
let (hash, header) = s
    .pending
    .get(&n)
    .cloned()
    .ok_or_else(|| BridgeError::Rejected(format!("unknown payload id {n}")))?;
```

Destructuring を更新:

```rust
let (hash, header, _fills) = s
    .pending
    .get(&n)
    .cloned()
    .ok_or_else(|| BridgeError::Rejected(format!("unknown payload id {n}")))?;
```

`_fills` binding が新しい 3 番目要素を catch するが使わない — `payload_ready` は `ExecutedBlock` を返すだけで、fill を直接必要としないからだ。`_` 接頭辞で compiler に「存在は認識しているが使わない」と伝える。

**Site 3: `validate_payload`** — `let header = { ... }` block 内で `.find(|(h, _)| *h == block_hash)` を検索する:

```rust
.find(|(h, _)| *h == block_hash)
.map(|(_, h)| h.clone())
```

両方の closure を 3 要素 pattern に更新する:

```rust
.find(|(h, _, _)| *h == block_hash)
.map(|(_, h, _)| h.clone())
```

**Site 4: `commit`** — 同じ `.find(|(h, _)| *h == hash)` パターンを検索し、同様に変更する:

```rust
let header = s
    .pending
    .values()
    .find(|(h, _, _)| *h == hash)
    .map(|(_, h, _)| h.clone())
    .ok_or_else(|| ...)?;
```

**Site 5: `payload_fills`** (Step 6 で追加したばかりの新メソッド) — 既に `.map(|(_, _, fills)| fills.clone())` の行で 3 要素 pattern を使っているので、変更不要。

合計 5 サイト。`cargo check -p openhl-evm` を走らせる — 見逃しがあれば compiler が「pattern matches against tuple of length 2 but expected 3」エラーで教えてくれる。

> 🛑 **やりがちな勘違い。** 「`pending` の 3 番目要素を、fill がある payload にだけ持たせる形にしたら? たとえば `(B256, Header, Option<Vec<Fill>>)` のように」。 **できるが、かえって悪い。** `Vec<Fill>` は既に「0 個以上の fill」を表現できる — 空 vec が自然な「fill なし」ケース。`Option<Vec<Fill>>` にすると consumer サイトごとに余分な unwrap step が増え、meaningful なメモリ節約にもならない (空 Vec が 24 バイトに対し Option は 32 バイト — 無視できる)。**内部型が自然な empty state を既に持っているなら、Option ラッパーは追加しない。**

## テスト

```bash
cargo test -p openhl-evm --release
```

~30 秒後 (incremental compile + node bootstrap):

```
... 38 tests ...

test result: ok. 38 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

Course 6 のテストはすべて引き続き pass する。L9 では新規テストを追加しない — 新機能 (submit_order 等) は L11 の integration test で exercise する。L9 の変更は **構造的** なもの — bridge に新しいフィールドとメソッドが入るが、既存のテスト面はそれらに触れないので、そのテストはそのまま動き続ける。

新メソッドが正しく接続されたかをクイックにサニティチェックできる:

```rust
// 既存の live_bridge_builds_on_real_genesis test または新規 smoke test 内で:
let bridge = LiveRethEvmBridge::new(handle.node.provider.clone(), chain_spec);
assert_eq!(bridge.pending_fill_count(), 0); // fresh bridge では空
```

これが pass するはず。Matching path はまだテストしない (それは L11)。ここでは新メソッドがコンパイルでき、fresh bridge で 0 を返すことだけ確認する。

よくあるエラーと対処:

- **`error[E0432]: unresolved import 'openhl_clob'`** — Cargo.toml に dep がない。Step 1 を再確認。
- **`error[E0277]: 'Mutex<Book>' is not 'Send'`** — どこかで `Book` が `.await` を跨いで保持されている。`submit_order` と `pending_fill_count` が、await 前に lock + 仕事を終えることを check (synchronous な body なのでそうあるべき)。
- **`error: pattern requires 2 fields, struct has 3`** — 波及更新 site を見逃した。Compiler が file:line を name する。3 番目 pattern 要素 (`_fills` または `_`) を追加。
- **`build_payload` で `error: cannot find value 'pending_fills'`** — フィールドを struct または `new()` に追加していない。Step 3 と 5 を再確認。

## 設計の振り返り

3 つの load-bearing な決定:

1. **`Mutex` 1 個ではなく 2 個にした。** Bridge の CLOB 状態と fill buffer は別々の関心事で、別々のタイミングで mutate する。Lock を分割しておけば、並行 submit が不必要に互いを block し合わなくて済む。**Lock 粒度は、contention が hot path 上にあるときに重要になる。**

2. **`submit_order` は `&self` を取る。** `Mutex` 経由の interior mutability によって、shared 参照で bridge を mutate できる。Bridge は `Arc` でラップされ async task 間で共有される。メソッドが `&mut self` を取ると、外側に `RwLock<Bridge>` が必要になり、すべての access を 1 つのグローバル lock で直列化する。**内部 `Mutex` + `&self` API が、async-shared state に対する idiomatic な Rust パターン。**

3. **`build_payload` に空の `Vec<Fill>` placeholder を残した。** L9 では構造を組み込むに留め、L10 でそれを機能的にする。Placeholder を残すのは honest scoping — reader には欠けている機能がどこにあるかが正確に見える。**`Vec::new()` placeholder のほうが、将来用の TODO コメントよりも discoverable。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 428cc26
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
diff -u ~/code/my-openhl/crates/evm/Cargo.toml ./crates/evm/Cargo.toml
```

L9 後、コードは 428cc26 の full 変更セットの途中にある — フィールドとメソッドは入っているが、`build_payload` はまだ drain せず (L10 で対応)、integration test もまだない (L11 で対応)。Diff は次のような状態になるはず:
- ✅ `clob` + `pending_fills` フィールド (参照と一致)
- ✅ `submit_order`、`payload_fills`、`pending_fill_count` メソッド (参照と一致)
- ✅ `pending` の 3-tuple (参照と一致)
- ❌ `build_payload` が依然 `Vec::new()` を挿入している — 参照は `std::mem::take(...)` を使う
- ❌ `clob_fills_flow_into_payload` integration test がない — 参照には存在する

`❌` 項目は L10 + L11 で揃う。

戻る:

```bash
git checkout main
```

## よくある質問

**Q: `submit_order` が `clob` を lock してから別途 `pending_fills` を lock するのはなぜか? 両方を同時に保持しないのは?**
`pending_fills` の append が依存しているのは matching の **結果** であって、matching の中間状態ではないから。`book.submit(order)` が return した時点で `FillResult` は所有データなので、`clob` の lock を release してから result を安全に処理できる。両 lock を保持してしまうと、無関係な `pending_fills` 操作 (たとえば別の caller が `pending_fill_count` を読むなど) を correctness 上の利益なしに直列化する。

**Q: `payload_fills` が `&[Fill]` (borrowed) ではなく `Vec<Fill>` (clone) を返すのはなぜか?**
`&[Fill]` を返すと caller が slice のライフタイム中ずっと `state` Mutex の lock guard を保持しなければならず、lock を欲しがる他のすべてが deadlock してしまうから。Vec を clone するのは `payload_fills` 呼び出しごとに allocation 1 個増えるだけで、稀にしか呼ばれない inspection メソッドなら問題ない。**Lock を取る API は、決して lock 越しの参照を返してはいけない。**

**Q: `clob` フィールドを `Mutex<Book>` ではなく `Arc<Mutex<Book>>` にできるか?**
できる — openhl の Stage 9 (もっと後) では実際にそうする。state を読む custom EVM precompile と CLOB を共有する必要が出てくるからだ。Stage 8d ではプレーンな `Mutex<Book>` で十分。`Mutex<T>` から `Arc<Mutex<T>>` への変更は機械的なもの — 1 箇所をラップし、いくつかの `.lock()` サイトを arc 経由の `.lock().expect(...)` に変えるだけ。**Arc ラップは、実際に sharing が必要になるまで遅らせる。**

**Q: `pending_fills.lock()` が poisoned mutex で panic したらどうなるか?**
Panic が `submit_order` 経由で上に伝播し、それを呼んだ task がクラッシュする。Rust では、スレッドが lock を保持したまま panic すると mutex poisoning が起きる。`book.submit(order)` のような synchronous body では panic は稀 (発生源としては明示的な `unwrap()`、OOM、stack overflow くらい)。起きた場合、bridge はどのみち inconsistent state にあるので、panic を伝播させるのが正しい動作。**`.expect("mutex poisoned")` は tripwire であって、recovery path ではない。**

## 次のレッスン (L10)

Bridge が CLOB を持ち、約定が蓄積するようになった。**ただし `build_payload` 経由で build された payload はまだ約定を運ばない** — placeholder の `Vec::new()` がギャップになっている。L10 で placeholder を `std::mem::take(&mut *pending_fills.lock(...))` に置き換え、新しい payload ごとに蓄積した約定をすべて drain する。L10 後、`bridge.payload_fills(id)` が最後の build 以降に生成された実際の約定を返し、`bridge.pending_fill_count()` が 0 にリセットされるようになる。L11 で end-to-end test を書き、この drain 意味論が forward-only である (以前の payload に遡って約定が attach されない) ことを証明する。
````

---

## Seed ファイルスロット

L9 は **新規 Module 4 (Bridge 統合)** sortOrder 0 に入る:

```typescript
modules: {
  0: { title: 'Orientation', sortOrder: 0 },
  1: { title: 'CLOB 型', sortOrder: 1 },
  2: { title: 'Matching engine', sortOrder: 2 },
  3: { title: 'テスト', sortOrder: 3 },
  4: { title: 'Bridge 統合', sortOrder: 4 },  // 新規
},
```

```typescript
{
  title: 'レッスン 9 — LiveRethEvmBridge に CLOB + submit_order を持たせる',
  slug: 'openhl-clob-bridge-fields-ja',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 40,
  xpReward: 70,
  content: `# レッスン 9 — \`LiveRethEvmBridge\` に CLOB + \`submit_order\` を持たせる\n\n...`
},
```

## SHA pinning 規律

L9 が `428cc26` (Stage 8d) を cite する。その SHA の参照は L10 の drain + L11 の integration test を含む full bridge integration を持つ。L9 後、reader のコードは **構造的に** 一致するが、`build_payload` がまだ `Vec::new()` (L10) を使い、integration test が存在しない (L11)。
