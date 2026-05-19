# OpenHL CLOB を作る — L9 draft (JA) — build-along

> openhl SHA `428cc26` (Stage 8d — CLOB fill が bridge payload に流れる) 基準。
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

このレッスンの終わりに:

```bash
cargo test -p openhl-evm --release
```

…依然 pass する (course 6 から 38 テスト + L9 の new test なし、依然 38)。Bridge が CLOB matching engine を **所有** する。書くもの:

- **新規 workspace dep 1 個** — `crates/evm/Cargo.toml` に `openhl-clob = { workspace = true }`。
- **`LiveRethEvmBridge` に新規フィールド 2 個** — `clob: Mutex<Book>` と `pending_fills: Mutex<Vec<Fill>>`。
- **より広い pending tuple** — `pending: HashMap<u64, (B256, Header)>` が `HashMap<u64, (B256, Header, Vec<Fill>)>` になる。3 番目の要素が payload ごとの fill リスト。
- **新規メソッド 3 個** — `submit_order(&self, order: Order) -> FillResult`、`payload_fills(id) -> Option<Vec<Fill>>` (inspection)、`pending_fill_count() -> usize` (inspection)。
- **波及更新** — `build_payload`、`payload_ready`、`validate_payload`、`commit` での pending tuple の destructuring すべてを 3-tuple pattern に。

**`build_payload` はまだ `pending_fills` を drain しない** — 今は空の `Vec<Fill>` を挿入する。L10 で drain を実装する。L9 後、order を submit でき、fill が `pending_fills` に蓄積するのが見えるが、bridge の payload が fill を運ばない。**L10 がそのギャップを閉じ、L11 がそれを証明する integration test を書く。**

## おさらい

Course 6 (L14) + course 7 L8 完了時点で workspace は:

```
crates/clob/                            — 完成した matching engine (L1-L8)
crates/evm/src/live_node.rs             — LiveRethEvmBridge<P>
  fields: provider, chain_spec, validator, engine_handle: Option<...>, state: Mutex<State>
  pending: HashMap<u64, (B256, Header)>
crates/consensus/                       — フル BFT engine
```

`cargo test -p openhl-evm` で 38 個 pass。**CLOB は存在し、bridge も存在する、だが互いに知らない。** L9 で bridge を CLOB に配線する。

## 計画

`crates/evm/` 内で 6 つ (実際は 7 step):

1. **`openhl-clob = { workspace = true }`** を `crates/evm/Cargo.toml` の `[dependencies]` に追加。
2. **Import を追加** — `crates/evm/src/live_node.rs` に `use openhl_clob::{Book, Fill, FillResult, Order};`。
3. **`clob` + `pending_fills` フィールドを追加** — `LiveRethEvmBridge<P>` struct に。
4. **`pending` を 3-tuple に変更** — `State` struct で。
5. **`new()` を更新** — 新フィールドを初期化。
6. **メソッド 3 個を追加** — `impl<P> LiveRethEvmBridge<P>` block に `submit_order`、`payload_fills`、`pending_fill_count`。
7. **destructuring を波及更新** — `build_payload`、`payload_ready`、`validate_payload`、`commit` を新 3-tuple shape にマッチ。`build_payload` は今は空 `Vec<Fill>` を挿入。

Step 7 は退屈に聞こえるが機械的: `(hash, header)` または `(h, _)` を書いた場所すべてが `(hash, header, fills)` または `(h, _, _)` になる。Compiler が各場所をクリアなエラーで教える。

> 🛑 **考えてみよう。** スクロールする前に: L9 後、`bridge.submit_order(order)` を呼べ、`bridge.pending_fill_count()` で fill が蓄積するのが見える。それから `bridge.build_payload(parent, attrs)` を呼ぶと、新しく build した payload に対する `bridge.payload_fills(id)` は何を返す? ヒント: §Step 7 を注意深く読む。

(答え: `Some(vec![])` — 空 fill リスト。L9 はデータフローを配線するが、`build_payload` はまだ drain せず空 Vec を挿入する。L10 の「build 時に drain」変更が、これを `Some(vec![fill_a, fill_b, ...])` にする。)

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

`openhl-clob` は workspace `Cargo.toml` に既に宣言済み (path entry を L1 で追加)。`[dependencies]` entry は「この特定 crate がそれを使う」と言う。

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

4 つの型を pull in: `Book` (matching engine)、`Fill` (output)、`FillResult` (`Book::submit` の wrapper)、`Order` (submit の input)。

モジュールレベルの doc comment も新 stage を ack するように更新。ファイル冒頭の既存 `//! Stage 7X` コメントブロックを探す:

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

…どこか妥当な場所 (7c と 7d の間で fine) に新規 Stage 8d block を挿入:

```rust
//! Stage 8d: the bridge now owns a CLOB matching engine. `submit_order` routes
//! orders into the book and accumulates resulting fills in `pending_fills`.
//! `build_payload` drains the pending fills and stores them alongside the
//! synthesized header, so the payload carries real CLOB-generated content.
//! Fills are not yet encoded as EVM transactions executable by Reth's
//! `BlockExecutor` — that's the next stage (or Module 3). 8d proves the
//! wiring exists; encoding is downstream.
```

これがメタドキュメンテーション — 誰かが 6 ヶ月後にファイルを読むとき、staging comment が map になる。

### Step 3: `LiveRethEvmBridge` にフィールド追加

Struct 定義を見つける。`validator` と `state` の間にフィールド 2 個を追加:

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

`Mutex` でラップされた 2 フィールド。なぜ両方 `Mutex`?

- **`clob: Mutex<Book>`** — matching engine。`Book` 自体は内部的に thread-safe ではない; `Mutex` でラップすると複数の caller が同時に order を submit できる (engine app loop に統合されると bridge は `Arc<LiveRethEvmBridge>` で共有される)。
- **`pending_fills: Mutex<Vec<Fill>>`** — `submit_order` が fill を push し、(L10 の) `build_payload` が drain する buffer。`clob` と別 `Mutex` なのは、2 つが異なる時間に mutate するから: submit は matching するために `clob` の lock を短く保持、それから append のために `pending_fills` の lock を短く保持。別 lock により、2 つの submit が submit → push の full chain を直列化しない。

> 🛑 **やりがちな勘違い。** 「1 個の `Mutex<(Book, Vec<Fill>)>` ではなく 2 個の `Mutex` なのは?」 **Lock 粒度。** 1 個の mutex が両方を覆うと、submit ごとに matching 仕事 AND fill-buffer mutation の両方で lock を保持する。Submit せずに `pending_fill_count` を読む将来のコード (例: L10 の `build_payload` drain、デバッグツール) が、submit-in-progress で block する。2 個の mutex は read が write contention を bypass できる。**コストは余分な `Mutex::new` 呼び出し数個; 利益はより良い並行スループット。**

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

`pending` の value 型を 3-tuple に変更、3 番目要素を `Vec<Fill>` に:

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

`chain` は `HashMap<B256, Header>` のまま、commit された block はここで fill を track する必要なし — fill は commit の下流。(Production コードは fill をどこかに persist する; それは本コース範囲外。)

**新しい doc コメントがレッスンの一部。** 3 番目要素が存在する **理由** を説明 — `submit_order` → `pending_fills` → `build_payload` drain → `pending` map の payload ごとの `Vec<Fill>`、というデータフロー。

### Step 5: `new()` を更新

現在の `new()` は 4 フィールドを初期化。変更後は 6 個。更新:

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

新規フィールド初期化 2 個。`Book::new()` は L3 のヘルパー (workspace が配線されているので `openhl_clob::Book::new()` がここで呼べる)。空の fill buffer に `Vec::new()`。

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

3 メソッド、3 つの意図:

- **`submit_order`** — **write** path。`&self` を取る (`&mut self` ではない)、内部 mutability via `Mutex` が shared 参照で bridge を mutate できるようにする。`clob` を lock、`book.submit` を呼ぶ、`FillResult` を受け取る。Fill が produce されたら、`pending_fills` を lock して append。`FillResult` を return して caller に何が起きたか知らせる。
- **`payload_fills`** — **inspection** path。指定 `PayloadId` に対して `Option<Vec<Fill>>` を返す。Id が pending にない場合 `None`、ある場合 (空の可能性あり) `Some(vec)`。Doc コメントが、これが test-and-debug メソッドであることを明示 — production コードは fill を transaction-encoding pipeline 経由でルートする。
- **`pending_fill_count`** — 小さい debugging ヘルパー。Buffer で drain 待ちの fill 数。「Cross する 2 order を submit、count == 1 を期待」のようなテストに有用。

3 メソッドすべてが `&self` を取ることに注意。内部 `Mutex` が重い lifting をする; public API が「shared 参照 + interior mutability」、まさに async コードが必要とするもの (複数の async task が `&LiveRethEvmBridge` を同時に保持できる)。

> 🛑 **やりがちな勘違い。** 「`submit_order` が `&mut self` ではなく `&self` を取るのは?」 **Bridge を、order を同時に submit したい async task 間で共有する必要があるから。** Matching engine (実際に mutate するコード) が `Mutex` の後ろにあり、Rust の borrow checker は「mutex が exclusion を強制するので、この mutation は安全」と受け入れる。`submit_order` が `&mut self` を取ると、`Arc<RwLock<LiveRethEvmBridge>>` が必要になり、submit ごとに bridge 全体を lock する — パフォーマンスが悪化し、API の形も適切でない。**Interior mutability は shared concurrent access が use case のときに正しいツール。**

### Step 7: destructuring を波及更新

ここが退屈だが機械的な部分。pending tuple は今 3 要素; pattern match する場所すべてが知る必要がある。合計 5 site:

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

**`Vec::new()` が placeholder。** L10 が `std::mem::take(&mut *self.pending_fills.lock()...)` に置き換える。

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

`_fills` binding が新しい 3 番目要素を catch するが使わない — `payload_ready` は `ExecutedBlock` を返し、fill を直接必要としない。`_` 接頭辞が compiler に「存在は知っている、必要なし」と伝える。

**Site 3: `validate_payload`** — `let header = { ... }` block 内、`.find(|(h, _)| *h == block_hash)` を検索:

```rust
.find(|(h, _)| *h == block_hash)
.map(|(_, h)| h.clone())
```

両 closure を 3 要素 pattern に更新:

```rust
.find(|(h, _, _)| *h == block_hash)
.map(|(_, h, _)| h.clone())
```

**Site 4: `commit`** — 同じ `.find(|(h, _)| *h == hash)` パターンを検索、同様に変更:

```rust
let header = s
    .pending
    .values()
    .find(|(h, _, _)| *h == hash)
    .map(|(_, h, _)| h.clone())
    .ok_or_else(|| ...)?;
```

**Site 5: `payload_fills`** (Step 6 でちょうど追加した新メソッド) — 既に `.map(|(_, _, fills)| fills.clone())` 行で 3 要素 pattern を使う。変更不要。

5 site すべて。`cargo check -p openhl-evm` を走らせる — 見逃せば compiler が「pattern matches against tuple of length 2 but expected 3」エラーで教える。

> 🛑 **やりがちな勘違い。** 「`pending` の 3 番目を fill がある payload にだけ `Vec<Fill>` 、例えば `(B256, Header, Option<Vec<Fill>>)` にしたら?」 **できるが、より悪い。** `Vec<Fill>` は既に「0 個以上の fill」を表現する — 空 vec が自然な「fill なし」ケース。`Option<Vec<Fill>>` は consumer site ごとに余分な unwrap step を追加し、meaningful なメモリ節約にもならない (空 Vec が 24 バイト vs Option の 32 バイト — 無視できる)。**内部型が自然な empty state を既に持っているなら、Option ラッパーを追加しない。**

## テスト

```bash
cargo test -p openhl-evm --release
```

~30 秒後 (incremental compile + node bootstrap):

```
... 38 tests ...

test result: ok. 38 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

Course 6 のテストすべて依然 pass。L9 は新規テストを追加しない — 新機能 (submit_order 等) は L11 の integration test で exercise する。L9 の変更は **構造的** — bridge が新フィールドとメソッドを持つが、既存のテスト面はそれらに触れないので、それらのテストが動き続ける。

新メソッドが正しく配線されたか quick sanity check できる:

```rust
// 既存の live_bridge_builds_on_real_genesis test または新規 smoke test 内で:
let bridge = LiveRethEvmBridge::new(handle.node.provider.clone(), chain_spec);
assert_eq!(bridge.pending_fill_count(), 0); // fresh bridge では空
```

これが pass するはず。Matching path はまだテストしない (L11) — 新メソッドがコンパイルし、fresh bridge で 0 を返すだけ。

よくあるエラーと対処:

- **`error[E0432]: unresolved import 'openhl_clob'`** — Cargo.toml に dep がない。Step 1 を再確認。
- **`error[E0277]: 'Mutex<Book>' is not 'Send'`** — どこかで `Book` が `.await` を跨いで保持されている。`submit_order` と `pending_fill_count` が、await 前に lock + 仕事を終えることを check (synchronous な body なのでそうあるべき)。
- **`error: pattern requires 2 fields, struct has 3`** — 波及更新 site を見逃した。Compiler が file:line を name する。3 番目 pattern 要素 (`_fills` または `_`) を追加。
- **`build_payload` で `error: cannot find value 'pending_fills'`** — フィールドを struct または `new()` に追加していない。Step 3 と 5 を再確認。

## 設計の振り返り

3 つの load-bearing な決定:

1. **1 個ではなく 2 個の `Mutex`。** Bridge の CLOB 状態と fill buffer は異なる関心事で異なる時間に mutate する。Lock を分割すると並行 submit が不要に block し合わない。**Lock 粒度は contention が hot path 上にあるときに重要。**

2. **`submit_order` は `&self` を取る。** Interior mutability via `Mutex` が shared 参照で bridge を mutate できるようにする。Bridge は `Arc` でラップされ async task 間で共有される; メソッドが `&mut self` を取ると、トップで `RwLock<Bridge>` が必要になり、すべての access を 1 つのグローバル lock で直列化する。**内部 `Mutex` + `&self` API が async-shared state の idiomatic な Rust パターン。**

3. **`build_payload` の空 `Vec<Fill>` placeholder。** L9 が構造を配線; L10 がそれを機能的にする。Placeholder を残すのは honest scoping — reader は欠けている機能がどこにあるか正確に見える。**`Vec::new()` placeholder は将来の TODO コメントより discoverable。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 428cc26
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
diff -u ~/code/my-openhl/crates/evm/Cargo.toml ./crates/evm/Cargo.toml
```

L9 後、コードは 428cc26 の full 変更セットの途中にいる — フィールドとメソッドは入ったが、`build_payload` がまだ drain せず (L10)、integration test がない (L11)。Diff は以下を見せるはず:
- ✅ `clob` + `pending_fills` フィールド (参照と一致)
- ✅ `submit_order`、`payload_fills`、`pending_fill_count` メソッド (参照と一致)
- ✅ `pending` の 3-tuple (参照と一致)
- ❌ `build_payload` が依然 `Vec::new()` を挿入 — 参照は `std::mem::take(...)` を使う
- ❌ `clob_fills_flow_into_payload` integration test なし — 参照にある

`❌` 項目が L10 + L11 で着地する。

戻る:

```bash
git checkout main
```

## よくある質問

**Q: `submit_order` が `clob` を lock、終え、別途 `pending_fills` を lock するのは — 両方を同時に持たないのは?**
`pending_fills` の append が matching の **結果** に依存、matching の中間状態には依存しないから。`book.submit(order)` が return した後、`FillResult` は所有データ — `clob` の lock を release し、result を安全に処理できる。両 lock を保持すると、無関係な `pending_fills` 操作 (例: 他の caller が `pending_fill_count` を読む) を correctness 利益なしに直列化する。

**Q: `payload_fills` が `&[Fill]` (borrowed) ではなく `Vec<Fill>` (clone) を返すのは?**
`&[Fill]` を返すと caller が slice のライフタイム中 `state` Mutex の lock guard を保持する必要があり — lock を欲しがる他のものすべてを deadlock させる。Vec を clone するのは `payload_fills` 呼び出しごとに 1 allocation で、稀にしか呼ばれない inspection メソッドには問題ない。**Lock する API は決して参照を lock 経由で返してはいけない。**

**Q: `clob` フィールドを `Mutex<Book>` ではなく `Arc<Mutex<Book>>` にできる?**
できる — openhl の Stage 9 (後) が実際にこれをする、CLOB をその state を読む custom EVM precompile と共有する必要があるから。Stage 8d ではプレーン `Mutex<Book>` で十分。`Mutex<T>` から `Arc<Mutex<T>>` への変更は機械的 — 1 箇所をラップ、いくつかの `.lock()` site を `.lock().expect(...)`-on-arc に変更。**Arc ラップは実際に sharing が必要になるまで遅らせる。**

**Q: `pending_fills.lock()` が poisoned mutex で panic したら?**
Panic が `submit_order` 経由で上に伝播し、それを呼んだ task をクラッシュさせる。Rust では、スレッドが lock 保持中に panic すると mutex poisoning が起きる。`book.submit(order)` のような synchronous body では、panic は稀 (唯一のソースは明示的な `unwrap()`、OOM、stack overflow)。起きた場合、bridge はどのみち inconsistent state にある — panic を伝播するのが正しい動作。**`.expect("mutex poisoned")` は tripwire であり、recovery path ではない。**

## 次のレッスン (L10)

Bridge が CLOB を持ち、fill が蓄積する。**`build_payload` 経由で build された payload がまだその fill を運ばない** — placeholder の `Vec::new()` がギャップ。L10 が placeholder を `std::mem::take(&mut *pending_fills.lock(...))` に置き換え、新しい payload ごとに蓄積した fill をすべて drain する。L10 後、`bridge.payload_fills(id)` が最後の build 以降に produce された実際の fill を返し、`bridge.pending_fill_count()` が 0 にリセットされる。L11 が end-to-end test を書き、この drain 意味論が forward-only である (以前の payload が retroactively fill されない) ことを証明する。
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
