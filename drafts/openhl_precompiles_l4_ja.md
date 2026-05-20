# Building OpenHL Precompiles — L4 draft (JA) — build-along

> openhl SHA `b635ef7`（Stage 9b — CLOB read precompile に live CLOB state を配線）に対するドラフト。
> コース: `building-openhl-precompiles-ja`（track: `reth-l1-architect`）。

---

## L4 — `openhl-precompiles-install-clob-ja`

- **Module:** 2 (Read precompile), sortOrder 0 within module
- **Course-level sortOrder:** 3 (lesson 4 of 12)
- **Duration:** 35 min
- **XP reward:** 70
- **Type:** CONTENT

### Content

````markdown
# レッスン 4 — `install_clob()` — EVM の state をマッチングエンジンに橋渡しする

## ゴール

このレッスンで掴む概念：

- **`PrecompileFn` は関数ポインタであって closure ではない → process-global state が回避策** — REVM の `fn(&[u8], u64, u64) -> PrecompileResult` は環境を capture できないので、共有 state は `static` に置き、関数が呼び出し時にそこを読む形にする。
- **`RwLock<Option<Arc<Mutex<T>>>>` — アクセスパターンが違えばロックの種類も違う** — 外側の `RwLock` は installed/uninstalled の区別 (write は稀) を担当し、内側の `Mutex` は matching engine (write は頻繁) を保護する。`Mutex<Option<...>>` 1 個でやろうとすると、すべての read が 1 箇所のボトルネックを通ることになる。
- **`Arc<Mutex<Book>>` で bridge/precompile 境界を超えて所有を共有** — bridge と precompile は別々の「caller」だが、同じ `Book` を見る必要がある。`Arc` は「所有者は複数、データは同じ」を表現する Rust の道具。
- **install は replace するだけで error にしない** — テストでは install/uninstall を繰り返す必要があるので、silent な replacement は機能であってバグではない。production の経路では install を 1 回しか呼ばない。
- **「配線したが電流は流さない」という incremental な形** — L4 は配線 (static、install 関数、bridge フィールドの型) を繋ぐが `read_best_bid` はまだハードコードのまま。switch を入れるのは L5。配線と挙動を分離することで、各レッスンが verifiable な変更を 1 つだけ持てる。

検証：

```bash
cargo test -p openhl-evm --release
```

上記の実行結果が引き続き通る（L3 で追加した 4 つを含む 42 tests）。

具体的な変更：

**`read_best_bid` が返す値はまだ変えずに**、live CLOB state を流すための**配管だけ**を仕込みます：

- **`Book` に新メソッドを 2 つ**（`crates/clob/src/book.rs`）：`best_bid_with_qty()` / `best_ask_with_qty()`。それぞれ `Option<(Price, Qty)>` を返す。
- **`precompiles/mod.rs` にモジュールレベルの `static CLOB_STATE`**：`Option<Arc<Mutex<Book>>>` を保持する。
- **`precompiles/mod.rs` に新しいモジュール関数を 3 つ**：`install_clob` / `uninstall_clob` / `current_best_bid`。
- **`LiveRethEvmBridge` のフィールド型を変更**：`clob: Mutex<Book>` を `clob: Arc<Mutex<Book>>` へ。`new()` の中で `install_clob(clob.clone())` を呼ぶ。

**`read_best_bid` の本体には手を加えない** — 引き続きハードコードの `(100, 10)` を返す。live state への差し替えは L5。L4 の仕事は、配管を**通せる状態にする**こと（実際に通すのはまだ先）。

## おさらい

L3 終了時点（Module 1 完了時点）：

- カスタム EVM precompile は登録済みで、呼び出しも検証済み。
- 全テスト（course 6 + 7 + L3 の新 4 件）が green。
- `LiveRethEvmBridge::new()` は `clob: Mutex::new(Book::new())` を作る — 誰とも共有していない所有。
- `read_best_bid` はハードコード。

**ブリッジと precompile はお互いの存在を知らない。** precompile はハードコード値を返し、ブリッジの CLOB は EVM 実行からは見えない。L4 ではこの 2 つを、プロセスグローバルなハンドルで繋ぐ。

## プラン

6 ステップ：

1. **`Book` に `best_bid_with_qty` と `best_ask_with_qty` を追加**。既存の `best_bid()` は価格だけを返すが、新メソッドは `(price, summed_qty_at_that_level)` — その価格レベルの FIFO キュー内にある数量の合計 — を返す。precompile が 2 値レスポンスを返すために必要だ。
2. **`precompiles/mod.rs` の import を更新** — `openhl_clob::Book` と `std::sync::{Arc, Mutex, RwLock}` を追加する。
3. **モジュールレベルの `static CLOB_STATE` を追加** — `RwLock<Option<Arc<Mutex<Book>>>>`。`Mutex` ではなく `RwLock` にするのは、precompile からの read が install からの write より圧倒的に多いから。
4. **モジュール関数を 3 つ追加** — `pub fn install_clob(...)` / `pub fn uninstall_clob()` / `pub fn current_best_bid() -> Option<...>`。ブリッジから呼べるよう public にする。
5. **ブリッジの `clob` フィールド型を `Mutex<Book>` から `Arc<Mutex<Book>>` に変更**。`new()` で `install_clob(clob.clone())` を呼び、precompile がブリッジと同じ `Book` を見るようにする。
6. **`read_best_bid` には触らない** — 引き続きハードコード値を返す。`current_best_bid()` への差し替えは L5。

L4 を終えた時点で、ブリッジと precompile の間の**配線は存在する**が、**まだ電流は流れていない**。precompile は live な CLOB を無視したままだ。実際に読みに行くのは L5。

> 🛑 **考えてみよう。** スクロールする前に考えてみてほしい — REVM の `PrecompileFn` は `fn(&[u8], u64, u64) -> PrecompileResult` で、**関数ポインタ**であって `Fn` クロージャではない。つまり環境をキャプチャできない（`move |...| { ... }` が書けない）。**だとすれば、precompile にインスタンスごとの state を渡す唯一の方法は何か?** ヒント：「引数として渡せない関数間で、可変な共有 state を扱う」ための Rust の定石パターンを 2 つ思い浮かべる。

（答え：プロセスグローバルな storage。`Arc<Mutex<Book>>` を precompile 関数に**引数として渡す**ことはできない — 関数ポインタのシグネチャは固定だから。なので precompile は `static` 変数からその共有 state を読む。ブリッジが `install_clob` で static に書き込み、precompile が `current_best_bid()` で読む。これは関数ポインタのシグネチャがクロージャキャプチャを許さないときの定石だ。**トレードオフ：プロセスあたり CLOB は 1 つに固定される。** 単一バリデータの openhl ではこれで十分受け入れられる。将来 REVM 側で関数ポインタの制約が緩めば、別の手も取れるようになるかもしれない。）

## 手順

### Step 1: `Book` に `best_bid_with_qty` + `best_ask_with_qty` を追加

`crates/clob/src/book.rs` を開く。既存の `best_bid` / `best_ask` メソッドを探して、その直後に 2 つの新メソッドを追加：

```rust
    /// Best bid price + total qty resting at that price level (sum of every
    /// resting order in the level's FIFO queue). Returns `None` if there
    /// are no bids.
    #[must_use]
    pub fn best_bid_with_qty(&self) -> Option<(Price, Qty)> {
        self.bids.iter().next().map(|(rev_price, queue)| {
            let qty: u64 = queue.iter().map(|o| o.qty.0).sum();
            (rev_price.0, Qty(qty))
        })
    }

    /// Best ask price + total qty resting at that price level.
    #[must_use]
    pub fn best_ask_with_qty(&self) -> Option<(Price, Qty)> {
        self.asks.iter().next().map(|(price, queue)| {
            let qty: u64 = queue.iter().map(|o| o.qty.0).sum();
            (*price, Qty(qty))
        })
    }
```

既存の `best_bid()` は `Option<Price>` だけを返す。新メソッドはその価格に加えて **そのレベルに rest している数量の合計** — best price の FIFO キュー内にある全注文の数量を足し上げたもの — を返す。

これが precompile が必要とする形だ。Solidity 側の戻り値シグネチャは `(price: u256, qty: u256)`。precompile は 64-byte レスポンスを埋めるために両方の値を必要とする。

> 🛑 **やりがちな勘違い。** 「`best_bid()` と `depth_bid()` を precompile から別々に呼べば済むのでは?」 — **`depth_bid()` が返すのは全 bid にわたる注文の本数で、best level の qty ではない。** 別のメトリクスだ。`best_bid_with_qty()` こそが precompile の契約 — 「最良価格はいくらで、その価格にどれだけ流動性があるか」 — に合致した形になる。

### Step 2: `precompiles/mod.rs` の imports を更新

`crates/evm/src/precompiles/mod.rs` を開く。L2 終了時点の imports：

```rust
use alloy_evm::revm::precompile::{
    Precompile, PrecompileId, PrecompileOutput, PrecompileResult, Precompiles,
};
use alloy_primitives::{address, Address, Bytes};
```

2 行追加：

```rust
use openhl_clob::Book;
use std::sync::{Arc, Mutex, RwLock};
```

新しく入ってくる型は次のとおり：
- **`Book`** — 共有するマッチングエンジンの state。
- **`Arc`** — atomic な参照カウント付きハンドル。ブリッジと precompile が 1 つずつ保持する。
- **`Mutex`** — `Book` 本体を守る（course 7 のブリッジパターン）。
- **`RwLock`** — `Option<...>`（共有する `Arc<Mutex<Book>>` のラッパ）を守る。**read（precompile 呼び出しのたび）は write（プロセスあたり 1 回の install）より圧倒的に多い** ので、`RwLock` で並行 read を許容する。

### Step 3: モジュールレベルの `static CLOB_STATE` を追加

imports の下、関数の前に：

```rust
/// Process-global handle to the CLOB the precompile reads from.
///
/// `None` until [`install_clob`] is called (typically by `LiveRethEvmBridge::new`).
/// While `None`, `read_best_bid` returns zero-encoded output rather than
/// erroring — this keeps existing tests deterministic and matches what an
/// uninitialised perp market would return on mainnet.
static CLOB_STATE: RwLock<Option<Arc<Mutex<Book>>>> = RwLock::new(None);
```

1 行に多くが詰まっている：

- **`static CLOB_STATE`** — プロセスグローバル。プログラムのライフタイム全体にわたって生きる。
- **`RwLock<...>`** — 外側のロック。「CLOB がインストールされているか?」と「CLOB の中身は?」を分離する。
- **`Option<...>`** — ブリッジが CLOB を install する前は `None`、install 後は `Some(Arc<Mutex<Book>>)`。
- **`Arc<Mutex<Book>>`** — 共有ハンドル。Arc はブリッジが 1 つ、この static が 1 つ持つ。ブリッジが `Book` を変更すれば（`clob.lock().submit(...)`）、その変更は precompile からも見える（`clob.lock().best_bid_with_qty()`）。
- **`RwLock::new(None)`** — `const fn` なのでコンパイル時に評価される。実行時の初期化レースはそもそも発生し得ない。

ドキュメントコメントが本レッスンの肝 — `None` は「未インストール」状態を表し、エラーではなく zero bytes を返すことを明示している。メインネットで未初期化の perp market を読む契約はゼロ値を見る — その挙動と揃える。

> 🛑 **やりがちな勘違い。** 「`lazy_static!` や `OnceLock` を使えばいいのでは?」 — **使えるが、制約が強すぎる。** `OnceLock` は 1 回しか set できない — だがこちらでは、テスト分離のために `install_clob` を何度も呼び直せるようにしたい。`lazy_static!` は unsafe な初期化トリックが必要 — Rust 1.63 以降の `static RwLock<...> = RwLock::new(None)` ならそれが不要になる。素の `static RwLock<...>` が 2024 年時点で最もクリーンなイディオムだ。

### Step 4: 3 つのモジュール関数を追加

static の下に：

```rust
/// Install the CLOB instance the precompile should read from. The bridge
/// shares its `Arc<Mutex<Book>>` with the global so every EVM-side
/// `staticcall` to `CLOB_READ_BEST_BID` sees the same book the application
/// writes to via `submit_order`.
///
/// Calling this replaces any previously-installed CLOB. Production deployments
/// should call it exactly once at bridge construction.
pub fn install_clob(clob: Arc<Mutex<Book>>) {
    *CLOB_STATE.write().expect("CLOB_STATE rwlock poisoned") = Some(clob);
}

/// Clear the installed CLOB. Used by tests that need a clean slate; rare in
/// production. Idempotent — uninstalling when nothing is installed is a no-op.
pub fn uninstall_clob() {
    *CLOB_STATE.write().expect("CLOB_STATE rwlock poisoned") = None;
}

/// Read the currently-installed CLOB's best bid. Returns `None` if no CLOB
/// is installed or if the book has no bids. Public so tests can verify
/// install/uninstall without going through the precompile dispatch.
#[must_use]
pub fn current_best_bid() -> Option<(openhl_clob::Price, openhl_clob::Qty)> {
    let state = CLOB_STATE.read().expect("CLOB_STATE rwlock poisoned");
    let clob = state.as_ref()?;
    let book = clob.lock().expect("clob mutex poisoned");
    book.best_bid_with_qty()
}
```

3 つとも `pub` にする理由：

- **`install_clob`** — ブリッジが `new()` から呼ぶ。直前の install を**置き換える** — 同じ Arc で 2 回呼んでも idempotent。`*CLOB_STATE.write().expect(...) = Some(clob)` は「write lock を取る → 値を set → release」の典型イディオム。
- **`uninstall_clob`** — 主にテスト用。テストの setup で install、teardown で uninstall。production で呼ぶことは稀。
- **`current_best_bid`** — EVM を経由せず直接テストできるよう露出させる。流れは write lock → read lock → option を deref → mutex を lock → `best_bid_with_qty()`。**ロックを 3 段**通って 1 つの値を読む — コストが高そうに見えるが各々マイクロ秒単位で、しかも read は `RwLock` の下で並行に走れる。

> 🛑 **やりがちな勘違い。** 「1 回の read に 3 つもロックを取るのは無駄では?」 — **3 つのロックはそれぞれ別の目的を持っている。** `RwLock` は installed か uninstalled かを分離する（write 競合は稀）。`Mutex<Book>` はマッチングエンジンの state を守る（write 競合は頻繁だがミリ秒単位）。1 つのロックに統合してしまうと、全 read と write がそのロックで一様に直列化される — 並行性は遥かに悪化する。**多層のロックは多層の関心事を反映している。**

### Step 5: `LiveRethEvmBridge::clob` を `Arc<Mutex<Book>>` に変更

`crates/evm/src/live_node.rs` を開く。`LiveRethEvmBridge` の struct 定義を探す：

```rust
pub struct LiveRethEvmBridge<P> {
    provider: P,
    chain_spec: Arc<ChainSpec>,
    validator: EthBeaconConsensus<ChainSpec>,
    clob: Mutex<Book>,
    pending_fills: Mutex<Vec<Fill>>,
    state: Mutex<State>,
}
```

`clob` を変更：

```rust
pub struct LiveRethEvmBridge<P> {
    provider: P,
    chain_spec: Arc<ChainSpec>,
    validator: EthBeaconConsensus<ChainSpec>,
    /// `Arc<Mutex<Book>>` rather than `Mutex<Book>` so the bridge can share
    /// its CLOB with the precompile module's process-global state. The bridge
    /// writes via `submit_order`; smart contracts read via the
    /// `clob_read_best_bid` precompile — both touch the same `Book`.
    clob: Arc<Mutex<Book>>,
    pending_fills: Mutex<Vec<Fill>>,
    state: Mutex<State>,
}
```

そして `new()` を探す：

```rust
impl<P> LiveRethEvmBridge<P> {
    #[must_use]
    pub fn new(provider: P, chain_spec: Arc<ChainSpec>) -> Self {
        let validator = EthBeaconConsensus::new(Arc::clone(&chain_spec));
        Self {
            provider,
            chain_spec,
            validator,
            clob: Mutex::new(Book::new()),
            pending_fills: Mutex::new(Vec::new()),
            state: Mutex::new(State::default()),
        }
    }
```

Arc で包んで install するように更新：

```rust
impl<P> LiveRethEvmBridge<P> {
    #[must_use]
    pub fn new(provider: P, chain_spec: Arc<ChainSpec>) -> Self {
        let validator = EthBeaconConsensus::new(Arc::clone(&chain_spec));
        let clob = Arc::new(Mutex::new(Book::new()));

        // Make our CLOB visible to the `clob_read_best_bid` precompile so
        // smart contracts can query live orderbook state. The bridge writes
        // (submit_order), the EVM reads (precompile); they share the same Arc.
        crate::precompiles::install_clob(Arc::clone(&clob));

        Self {
            provider,
            chain_spec,
            validator,
            clob,
            pending_fills: Mutex::new(Vec::new()),
            state: Mutex::new(State::default()),
        }
    }
```

変更は 3 点：

1. **`let clob = Arc::new(...)`** — Arc をローカルに束縛する。`install_clob` 用と struct 内用で 2 回使うため。
2. **`crate::precompiles::install_clob(Arc::clone(&clob))`** — precompile モジュールと Arc を共有する。**`Arc::clone(&clob)` で refcount がインクリメントされる** — ブリッジと static の両方が強参照を保持する形になる。
3. **struct リテラル内では `clob,` のみ** — フィールド名とローカル名が同じなので shorthand が効く。

`precompiles` は `crates/evm/` の private モジュールだが、`install_clob` は `pub fn` なので、crate 内からなら `crate::precompiles::install_clob` で呼べる。

### Step 6: 他に壊れた箇所がないか確認

`live_node.rs` の他のコードが `clob: Mutex<Book>` を前提に書かれていないかを確認する — どこも `Arc<Mutex<Book>>` 前提で問題ないはず。`self.clob.lock()` の呼び出しを探してみる。問題なく動く — `Arc<Mutex<Book>>` は `Mutex<Book>` への deref coercion が効くので、`self.clob.lock()` のままで構わない。

`clob` が使われている他の箇所：
- `submit_order(&self, order: Order)` — `self.clob.lock()` を使用。動く（Arc が内側の Mutex に deref）。
- 以上。

`build_payload` / `payload_ready` 等は `clob` を直接触っていない。

## テスト

```bash
cargo test -p openhl-evm --release
```

30 秒ほど待つと：

```
running 42 tests
... 42 tests pass ...

test result: ok. 42 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

L3 のテストはすべて green のまま。注意：**L3 の unit test は依然としてハードコード値**（`U256::from(100u64)` / `U256::from(10u64)`）**を期待している**。まだ `read_best_bid` を変更していないからだ。配管は通したが、`read_best_bid` を流れる値はまだハードコードのまま。

配管が実際に効いているか sanity check したい場合は（L5 で本体を差し替える前に）、使い捨てのテストを書いてもよい：

```rust
#[cfg(test)]
mod smoke {
    use super::*;
    use openhl_clob::{AccountId, Book, Order, OrderId, OrderType, Price, Qty, Side};
    use std::sync::{Arc, Mutex};

    #[test]
    fn current_best_bid_reflects_installed_clob() {
        crate::precompiles::uninstall_clob();
        let book = Arc::new(Mutex::new(Book::new()));
        book.lock().unwrap().submit(Order {
            id: OrderId(1),
            account: AccountId(1),
            side: Side::Buy,
            qty: Qty(7),
            order_type: OrderType::Limit { price: Price(250) },
        });
        crate::precompiles::install_clob(Arc::clone(&book));
        let result = crate::precompiles::current_best_bid();
        assert_eq!(result, Some((Price(250), Qty(7))));
        crate::precompiles::uninstall_clob();
    }
}
```

実行：`cargo test -p openhl-evm current_best_bid_reflects_installed_clob`。通るはずだ。**確認できたら消す** — L5 以降で本物のテストセットを揃える。

よくあるエラーと対処：

- **`error[E0277]: 'Arc<Mutex<Book>>' is not 'Mutex'`** — `submit_order` の `self.clob.lock()` がコンパイラに弾かれている。実は動くはず — `Arc<Mutex<Book>>` は `&Mutex<Book>` に deref する。このエラーが出るなら、どこかで `self.clob.deref().lock()` を書いている可能性 — それは間違った形。`self.clob.lock()` だけが正しい。
- **`error[E0277]: 'PoisonError<RwLockWriteGuard<Option<Arc<Mutex<Book>>>>>' is not 'Send'`** — テストや呼び出し側で poisoned lock が panic している。`.expect(...)` は標準パターン。これが見えるならどこかでロック保持中の panic が起きている。
- **Static initialization warning** — Rust 1.63+ は `static RwLock<T> = RwLock::new(...)` を直接サポート。「calls in static contexts are unstable」が見えるなら toolchain が古い — L0 の前提を確認。
- **`unused variable: clob` in `new()`** — struct リテラル内で `clob` を使い忘れている。`let clob = Arc::new(...)` で束縛した変数は struct 内に `clob,` として登場する必要がある。

## 設計の振り返り

ここに焼き込んだ重要な決定が 3 つ：

1. **関数ポインタのシグネチャ制約に対する定石は process-global な state。** REVM の `PrecompileFn = fn(...) -> PrecompileResult` は関数ポインタであってクロージャではないので、state をキャプチャできない。選択肢は (a) 関数引数として受け取る（REVM API の変更が必要）、(b) process-global から読む — のどちらか。今回は (b) を取った。**コストはプロセスあたり CLOB が 1 つになること。** 単一バリデータの deployment なら問題ないが、マルチテナントには REVM API の変更が必要だ。

2. **外側の Option には `RwLock`、内側の `Book` には `Mutex`。** 外側のロックは installed か uninstalled かを分離する（write は稀）。内側のロックはマッチングエンジンの state を守る（write は submit のたびに発生して頻繁）。アクセスパターンが違えばロックの型も変える。1 つの `Mutex<Option<Arc<Mutex<Book>>>>` に統合してしまうと、すべての read が 1 つのボトルネックを通ることになる。

3. **`install_clob` は黙って置き換える設計で、エラーにはしない。** 別の CLOB で 2 回呼ばれた場合、最初のものを黙って置き換える。検知して panic させる手もあるが、production パスでは 1 回しか呼ばれない一方で、テストは install/uninstall を繰り返す。**置き換え挙動はテストにとってバグではなく機能だ。** ドキュメントコメントで明示してある。

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout b635ef7
diff -u ~/code/my-openhl/crates/clob/src/book.rs ./crates/clob/src/book.rs
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
```

L4 を終えた時点では、あなたのコードは Stage 9b に**部分的に**一致する：新メソッド、static、関数 3 つ、ブリッジのフィールド変更まで。残る差分は：
- `read_best_bid` がまだハードコードのまま（差し替えは L5）。
- L3 の unit test がまだハードコード値を期待している（更新は L5）。

main に戻す：

```bash
git checkout main
```

## よくある質問

**Q: なぜ `CLOB_STATE` は `&'static` なのか? ヒープ割り当てではダメか?**
static storage はもっともシンプルなライフタイム — プログラム開始から終了まで生きる。ヒープ割り当て（`Box::leak` など）でも動くが、ランタイムの allocation コストと複雑さが増える。「プログラム開始から終了までずっと存在してほしい」というケース — まさに今回 — では `static` が正しい道具だ。

**Q: 並行テストなどで `LiveRethEvmBridge` が 2 個作られたら?**
2 回目の `install_clob` が 1 回目を置き換える。**結果として両方のブリッジが、global 経由で 2 つ目の CLOB を共有することになる。** だからテストでは直列化が必要だ（L5 で導入する）。production deployment ではブリッジを 1 つしか作らないので、問題にはならない。

**Q: `current_best_bid` は `Option<...>` ではなく `Result<...>` を返してもいい?**
できる — `None` の代わりに `Err(NoClobInstalled)` を返すこともできる。だが precompile としては「CLOB 未インストール」と「CLOB はあるが空」を区別する必要がない — どちらの場合もゼロを返すべきだからだ。`Option` ならその 2 ケースを `None` に潰せる。`Result` にすると precompile に余計な分岐を強いることになり、利得はない。

**Q: `current_best_bid` の中で `book.lock()` が panic したら?**
`.expect("clob mutex poisoned")` が panic し、`current_best_bid` → `read_best_bid` → REVM の dispatch まで伝播する。REVM はこれを致命的な precompile エラーとして扱い、EVM を halt させる（おそらく transaction 全体を revert する）。**これが正しい挙動だ** — poisoned な Mutex は、別のスレッドがロックを保持したまま crash したことを意味する。不整合な state で走り続けるくらいなら abort するほうがましだ。

## 次のレッスン（L5）

配線は通したが、precompile はまだそれを無視している。L5 では `read_best_bid` の本体を `current_best_bid()` 呼び出しに差し替える。L3 のテストは、CLOB 未インストール時に zero output を期待する形に更新する。並行テストが global state で競合しないよう、`TEST_SERIALIZER` を導入する。L5 を終えると `read_best_bid` は live な state を読むようになる — ただし、ラウンドトリップを実行するテストは、自分でインラインに書く smoke test だけだ。L6 でラウンドトリップテストを正式に追加する。
````

---

## Seed-file slot

L4 は Module 2 (Read precompile) の sortOrder 0 に入る：

```typescript
{
  title: 'レッスン 4 — install_clob() — EVM の state をマッチングエンジンに橋渡しする',
  slug: 'openhl-precompiles-install-clob-ja',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 35,
  xpReward: 70,
  content: `# レッスン 4 — \`install_clob()\` — EVM の state をマッチングエンジンに橋渡しする\n\n...`
},
```

## SHA pinning discipline

L4 は `b635ef7`（Stage 9b）を引用。L4 終了時点であなたのコードは部分的に一致 — 配管はあるが `read_best_bid` はまだハードコード。L5 で差分が閉じる。

## Style review notes (self-critique before paste)

- **§プランの「配線はあるが電流は流れていない」** が L4 のコンセプトフレーム — 配管のみ、テストから見える機能変化なし。
- **§考えてみよう（関数ポインタ vs クロージャ）** がグローバル state パターンを正当化する — Rust 出身者は本能的にクロージャに手を伸ばすので「なぜ動かないか」を先に提示する必要がある。
- **§Step 3 の `RwLock<Option<Arc<Mutex<...>>>>` 分解** が一見 4 重ラッパに見えるものを 4 つの異なる責務に分解。
- **§やりがちな勘違い「1 read に 3 ロックは無駄」** が自然な反発を先回り。
- **§Step 5 の deref coercion 注記** が Arc-vs-Mutex の典型的な混乱を先回り。
- **L5 プレビュー**で差し替え + テスト更新を明示。
