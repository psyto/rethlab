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

このレッスンが終わると：

```bash
cargo test -p openhl-evm --release
```

…が引き続き通る（L3 で追加した 4 つを含む 42 tests）。**`read_best_bid` が返す値はまだ変えずに**、live CLOB state を流すための**配管だけ**を仕込みます：

- **`Book` に 2 つの新メソッド**（`crates/clob/src/book.rs`）：`best_bid_with_qty()` / `best_ask_with_qty()`。それぞれ `Option<(Price, Qty)>` を返す。
- **`precompiles/mod.rs` にモジュールレベルの `static CLOB_STATE`**：`Option<Arc<Mutex<Book>>>` を保持。
- **`precompiles/mod.rs` に 3 つの新モジュール関数**：`install_clob` / `uninstall_clob` / `current_best_bid`。
- **`LiveRethEvmBridge` のフィールド型変更**：`clob: Mutex<Book>` を `clob: Arc<Mutex<Book>>` に。`new()` の中で `install_clob(clob.clone())` を呼ぶ。

**`read_best_bid` 本体は変更しません** — 引き続きハードコードの `(100, 10)` を返します。L5 で live state に差し替えます。L4 の仕事は配管を**通せる状態にする**こと（まだ通しません）。

## おさらい

L3 終了時点（Module 1 完了時点）：

- カスタム EVM precompile は登録済みで、呼び出しも検証済み。
- 全テスト（course 6 + 7 + L3 の新 4 件）が green。
- `LiveRethEvmBridge::new()` は `clob: Mutex::new(Book::new())` を作る — 誰とも共有していない所有。
- `read_best_bid` はハードコード。

**ブリッジと precompile は互いの存在を知りません。** precompile はハードコード値を返し、ブリッジの CLOB は EVM 実行から見えません。L4 ではこの 2 つをプロセスグローバルなハンドルで繋ぎます。

## プラン

6 ステップ：

1. **`best_bid_with_qty` + `best_ask_with_qty` を `Book` に追加**。既存の `best_bid()` は価格だけを返す。新メソッドは `(price, summed_qty_at_that_level)` — その価格レベルの FIFO キュー内の数量合計 — を返す。precompile が 2 値レスポンスを返すために必要。
2. **`precompiles/mod.rs` の imports を更新** — `openhl_clob::Book` と `std::sync::{Arc, Mutex, RwLock}` を追加。
3. **モジュールレベルの `static CLOB_STATE` を追加** — `RwLock<Option<Arc<Mutex<Book>>>>`。`RwLock`（`Mutex` ではなく）にする理由は、precompile からの read は install からの write より圧倒的に多いから。
4. **3 つのモジュール関数を追加** — `pub fn install_clob(...)`, `pub fn uninstall_clob()`, `pub fn current_best_bid() -> Option<...>`。ブリッジから呼べるよう public。
5. **ブリッジの `clob` フィールド型を `Mutex<Book>` → `Arc<Mutex<Book>>`** に変更。`new()` で `install_clob(clob.clone())` を呼んで、precompile がブリッジと同じ `Book` を見るようにする。
6. **`read_best_bid` は触らない** — まだハードコード値を返す。L5 で `current_best_bid()` に差し替え。

L4 終了時点では、ブリッジと precompile の間の**配線は存在する**が、**まだ電流は流れていない**。precompile は live CLOB を無視したまま。L5 で初めて読みに行きます。

> 🛑 **考えてみよう。** スクロール前に考えてください — REVM の `PrecompileFn` は `fn(&[u8], u64, u64) -> PrecompileResult` で、**関数ポインタ**であって `Fn` クロージャではありません。つまり環境をキャプチャできません（`move |...| { ... }` が書けない）。**だとすれば、precompile に instance ごとの state を渡す唯一の方法は？** ヒント：「引数として渡されない関数間で可変な共有 state を扱う」ための Rust の典型パターンを 2 つ思い浮かべてください。

（答え：プロセスグローバル storage。`Arc<Mutex<Book>>` を precompile 関数に**引数として渡す**ことはできない — 関数ポインタのシグネチャは固定。だから precompile は `static` 変数からその共有 state を読む。ブリッジが `install_clob` で static に書き込み、precompile が `current_best_bid()` で読む。これは関数ポインタのシグネチャがクロージャキャプチャを許さないときの定石パターン。**トレードオフ：プロセスあたり CLOB は 1 つ。** 単一バリデータの openhl では受容可能。REVM の将来バージョンで関数ポインタ制約が緩めば変わるかも。）

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

既存の `best_bid()` は `Option<Price>` のみ。新メソッドはその価格 **+ そのレベルに resting する数量合計** — その best price の FIFO キュー内の全注文の数量合計 — を返します。

これが precompile が必要とする形。Solidity 側の戻り値シグネチャは `(price: u256, qty: u256)`。precompile は 64-byte レスポンスを埋めるために両方の値が必要。

> 🛑 **やりがちな勘違い。** 「precompile が `best_bid()` と `depth_bid()` を別々に呼べばよくない？」 **`depth_bid()` は全 bids にわたる注文の数を返すのであって、best level の qty ではありません。** 別のメトリクスです。`best_bid_with_qty()` こそが precompile の契約形 — 「最良価格はいくらで、その価格にどれだけ流動性があるか」 — に合った形。

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

3 つの新しい型が入ってくる：
- **`Book`** — 共有するマッチングエンジン state。
- **`Arc`** — atomic な参照カウントハンドル。ブリッジと precompile の両方が 1 つずつ持つ。
- **`Mutex`** — `Book` 本体を守る（course 7 のブリッジパターン）。
- **`RwLock`** — `Option<...>`（共有 `Arc<Mutex<Book>>` のラッパ）を守る。**Read（precompile 呼び出しごと）は write（プロセスあたり 1 回の install）より圧倒的に多い**ので `RwLock` で並行 read を許容。

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

1 行で多くを語っています：

- **`static CLOB_STATE`** — プロセスグローバル。プログラムのライフタイム全体で生きる。
- **`RwLock<...>`** — 外側のロック。「CLOB がインストールされているか？」と「CLOB の中身は？」を分離。
- **`Option<...>`** — ブリッジが CLOB を install する前は `None`、install 後は `Some(Arc<Mutex<Book>>)`。
- **`Arc<Mutex<Book>>`** — 共有ハンドル。ブリッジが 1 Arc、この static が 1 Arc 持つ。ブリッジが `Book` を変更すれば（`clob.lock().submit(...)`）、precompile から同じ変更が見える（`clob.lock().best_bid_with_qty()`）。
- **`RwLock::new(None)`** — `const fn` なのでコンパイル時に評価される。ランタイム初期化レースがそもそも起こりえない。

ドキュメントコメントがレッスンの肝 — `None` は「未インストール」状態であり、エラーではなく zero bytes を返すことを明示。メインネットで未初期化の perp market を読む契約はゼロ値を見る — その挙動と一致させる。

> 🛑 **やりがちな勘違い。** 「`lazy_static!` や `OnceLock` を使えばいいんじゃ？」 **使えますが、過度に制約されます。** `OnceLock` は 1 回だけ set 可能 — でも `install_clob` はテスト隔離のために再呼び出し可能にしたい。`lazy_static!` は unsafe な初期化トリックが要る — Rust 1.63 以降の `static RwLock<...> = RwLock::new(None)` ならそれが要らない。素の `static RwLock<...>` こそ 2024 年の最もクリーンなイディオム。

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

- **`install_clob`** — ブリッジが `new()` で呼ぶ。直前の install を**置き換える** — 同じ Arc を 2 回呼べば idempotent。`*CLOB_STATE.write().expect(...) = Some(clob)` は「write lock 取得 → 値 set → release」の典型イディオム。
- **`uninstall_clob`** — テスト用が典型。テスト setup で install / 後始末で uninstall。Production では稀。
- **`current_best_bid`** — EVM 経由でなく直接テストできるよう露出。流れ：write lock → read lock → option deref → mutex lock → `best_bid_with_qty()`。**3 つのロック**を経由して 1 値を読む — 高くつくように見えるが各々マイクロ秒オーダー、しかも reads は `RwLock` 下で並行可能。

> 🛑 **やりがちな勘違い。** 「1 read に 3 ロックは無駄じゃ？」 **ロックはそれぞれ別の目的を持っています。** `RwLock` は installed-vs-uninstalled を分離（write 衝突は稀）。`Mutex<Book>` はマッチングエンジン state を守る（write 衝突は頻繁だがミリ秒）。1 つのロックに統合したら、全 read + write がそのロックで一様に直列化される — 並行性は遥かに悪化。**多層ロックは多層の関心事を反映している。**

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

3 つの変更：

1. **`let clob = Arc::new(...)`** — Arc をローカル束縛。`install_clob` 用と struct 内用で 2 回使うため。
2. **`crate::precompiles::install_clob(Arc::clone(&clob))`** — precompile モジュールと Arc を共有。**`Arc::clone(&clob)` は refcount をインクリメント** — ブリッジと static の両方が強参照を持つ。
3. **struct リテラル内の `clob,`** — `clob` のみ（フィールド名とローカル名が同じ）。

`precompiles` は `crates/evm/` の private モジュールだが `install_clob` は `pub fn` — crate 内なら `crate::precompiles::install_clob` でアクセス可能。

### Step 6: 他の壊れた箇所がないか確認

`live_node.rs` の他のコードが `clob: Mutex<Book>` 前提で書かれていないか確認 — `Arc<Mutex<Book>>` 前提のみのはず。`self.clob.lock()` の呼び出しを探す。動きます — `Arc<Mutex<Book>>` は `Mutex<Book>` に deref coercion されるので、`self.clob.lock()` は変更不要。

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

L3 のテストは全部 green のまま。注意：**L3 の unit tests は今もハードコード値**（`U256::from(100u64)`, `U256::from(10u64)`）**を期待**しています — 我々はまだ `read_best_bid` を変えていないから。配管は通したが、`read_best_bid` を流れる値はまだハードコード。

配管が実際に効いているか sanity check したければ（L5 で本体を差し替える前に）、ワンオフを書いてもよい：

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

実行：`cargo test -p openhl-evm current_best_bid_reflects_installed_clob`。通るはず。**確認できたら消す** — L5 以降が本物のテストセットを持つ。

よくあるエラーと対処：

- **`error[E0277]: 'Arc<Mutex<Book>>' is not 'Mutex'`** — `submit_order` の `self.clob.lock()` がコンパイラに弾かれている。実は動くはず — `Arc<Mutex<Book>>` は `&Mutex<Book>` に deref する。このエラーが出るなら、どこかで `self.clob.deref().lock()` を書いている可能性 — それは間違った形。`self.clob.lock()` だけが正しい。
- **`error[E0277]: 'PoisonError<RwLockWriteGuard<Option<Arc<Mutex<Book>>>>>' is not 'Send'`** — テストや呼び出し側で poisoned lock が panic している。`.expect(...)` は標準パターン。これが見えるならどこかでロック保持中の panic が起きている。
- **Static initialization warning** — Rust 1.63+ は `static RwLock<T> = RwLock::new(...)` を直接サポート。「calls in static contexts are unstable」が見えるなら toolchain が古い — L0 の前提を確認。
- **`unused variable: clob` in `new()`** — struct リテラル内で `clob` を使い忘れている。`let clob = Arc::new(...)` で束縛した変数は struct 内に `clob,` として登場する必要がある。

## 設計の振り返り

ここに焼き込んだ重要な決定 3 つ：

1. **関数ポインタのシグネチャ制約に対する定石は process-global state。** REVM の `PrecompileFn = fn(...) -> PrecompileResult` は関数ポインタであってクロージャではない。state をキャプチャできない。残る選択肢：(a) 関数引数として受け取る（REVM API 変更が必要）、(b) process-global から読む。我々は (b)。**コスト：プロセスあたり CLOB 1 つ。** 単一バリデータ deployment なら OK、マルチテナントなら REVM API 変更が必要。

2. **外側の Option には `RwLock`、内側の `Book` には `Mutex`。** 外側のロックは installed-vs-uninstalled を分離（write は稀）。内側のロックはマッチングエンジン state を守る（write 頻繁 — submit ごと）。アクセスパターンごとに異なるロック型。`Mutex<Option<Arc<Mutex<Book>>>>` 一発なら全 read が 1 つのボトルネックを通る。

3. **`install_clob` は置き換え、エラーにしない。** 異なる CLOB で 2 回呼ぶと黙って 1 つ目を置き換える。検知して panic させてもよいが、production パスは 1 回しか呼ばない。テストは install/uninstall を繰り返す。**置き換えはテストにとってバグでなく機能。** ドキュメントコメントで明示。

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout b635ef7
diff -u ~/code/my-openhl/crates/clob/src/book.rs ./crates/clob/src/book.rs
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
```

L4 終了時点ではあなたのコードは Stage 9b に**部分的に**一致：新メソッド、static、3 関数、ブリッジのフィールド変更まで。残る差分は：
- `read_best_bid` がまだハードコード（L5 で差し替え）。
- L3 の unit tests がまだハードコード値を期待（L5 で更新）。

戻す：

```bash
git checkout main
```

## よくある質問

**Q: なぜ `CLOB_STATE` は `&'static` で、ヒープ割り当てではない？**
Static storage は最もシンプルなライフタイム — プログラム開始から終了まで。ヒープ割り当て（`Box::leak` など）でも動くがランタイム allocation コストと複雑度が増える。「プログラム開始から終了まで存在」が欲しい場合 — まさに我々のケース — `static` が正しい道具。

**Q: `LiveRethEvmBridge` が並行テストなどで 2 個作られたら？**
2 つ目の `install_clob` 呼び出しが 1 つ目を置き換える。**両ブリッジが global 経由で 2 つ目の CLOB を共有することになる。** だからテストは serialization が必要（L5 で導入）。Production deployment はブリッジを 1 つだけ作る — 問題にならない。

**Q: `current_best_bid` は `Option<...>` でなく `Result<...>` でもいい？**
できる — `Err(NoClobInstalled)` を `None` の代わりに返してもよい。だが precompile は「CLOB 未インストール」と「CLOB インストール済みだが空」を区別する必要がない — 両方ともゼロを返すべき。`Option` は両ケースを `None` に潰す。`Result` だと precompile が分岐処理を強いられる — 利得なし。

**Q: `current_best_bid` 内で `book.lock()` が panic したら？**
`.expect("clob mutex poisoned")` が panic し、`current_best_bid` → `read_best_bid` → REVM の dispatch まで伝播。REVM はこれを fatal precompile error として扱い EVM を halt（おそらく transaction 全体を revert）。**これが正しい挙動** — poisoned Mutex は別スレッドがロック保持中に crash したことを意味し、不整合な state で走り続けるより abort のほうがマシ。

## 次のレッスン（L5）

配管は通したが precompile はまだ無視している。L5 は `read_best_bid` の本体を `current_best_bid()` 呼び出しに差し替え。L3 のテストを CLOB 未 install 時に zero output を期待するように更新。並行テストが global state を競合しないよう `TEST_SERIALIZER` を追加。L5 後、`read_best_bid` は live state を読む — ただしラウンドトリップを実行するテストは、あなたがインラインで書く smoke test だけ。L6 でラウンドトリップテストを正式化する。
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
