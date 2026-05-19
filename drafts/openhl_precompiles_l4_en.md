# Building OpenHL Precompiles — L4 draft (EN) — build-along

> Drafted against openhl SHA `b635ef7` (Stage 9b — live CLOB state in the CLOB read precompile).
> Course: `building-openhl-precompiles-en` (track: `reth-l1-architect`).

---

## L4 — `openhl-precompiles-install-clob-en`

- **Module:** 2 (Read precompile), sortOrder 0 within module
- **Course-level sortOrder:** 3 (lesson 4 of 12)
- **Duration:** 35 min
- **XP reward:** 70
- **Type:** CONTENT

### Content

````markdown
# Lesson 4 — `install_clob()` — bridging EVM state to the matching engine

## Goal

By the end of this lesson:

```bash
cargo test -p openhl-evm --release
```

…still passes (42 tests including L3's 4 new ones). You'll have **added the plumbing** for live CLOB state without yet changing what `read_best_bid` returns:

- **2 new methods** on `Book` (in `crates/clob/src/book.rs`): `best_bid_with_qty()` and `best_ask_with_qty()` returning `Option<(Price, Qty)>`.
- **A module-level `static CLOB_STATE`** in `precompiles/mod.rs` holding `Option<Arc<Mutex<Book>>>`.
- **Three new module functions** in `precompiles/mod.rs`: `install_clob`, `uninstall_clob`, `current_best_bid`.
- **One field type change** in `LiveRethEvmBridge`: `clob: Mutex<Book>` becomes `clob: Arc<Mutex<Book>>`, and `new()` calls `install_clob(clob.clone())`.

**`read_best_bid` itself is unchanged** — it still returns hardcoded `(100, 10)`. L5 swaps that for live state. L4's job is to make the wiring **possible** without yet exercising it.

## Recap

After L3 (end of Module 1):

- Custom EVM precompile is registered and proven callable.
- All tests (course 6 + 7 + L3's new 4) pass.
- `LiveRethEvmBridge::new()` creates `clob: Mutex::new(Book::new())` — owned, not shared with anything.
- `read_best_bid` is hardcoded.

**The bridge and the precompile know nothing about each other.** The precompile returns its hardcoded values; the bridge's CLOB is invisible to EVM execution. L4 connects them through a process-global handle.

## Plan

Six things:

1. **Add `best_bid_with_qty` + `best_ask_with_qty`** to `Book`. The existing `best_bid()` returns just the price; the new methods return `(price, summed_qty_at_that_level)` — needed for the precompile's 2-value response.
2. **Update imports in `precompiles/mod.rs`** — add `openhl_clob::Book` and `std::sync::{Arc, Mutex, RwLock}`.
3. **Add a module-level `static CLOB_STATE`** — `RwLock<Option<Arc<Mutex<Book>>>>`. `RwLock` (not `Mutex`) because reads from the precompile are much more common than writes (install).
4. **Add three module functions** — `pub fn install_clob(...)`, `pub fn uninstall_clob()`, `pub fn current_best_bid() -> Option<...>`. Public so the bridge can call them.
5. **Change the bridge's `clob` field** from `Mutex<Book>` to `Arc<Mutex<Book>>`, and have `new()` `install_clob(clob.clone())` so the precompile sees the same `Book` the bridge writes to.
6. **Leave `read_best_bid` alone** — it still returns hardcoded values. L5 swaps in `current_best_bid()`.

After L4, the **wires exist** between bridge and precompile, but **no current flows**. The precompile still ignores the live CLOB. L5 makes it read.

> 🛑 **Predict.** Before scrolling: REVM's `PrecompileFn` is `fn(&[u8], u64, u64) -> PrecompileResult` — a **function pointer**, not an `Fn` closure. We can't capture environment in it (no `move |...| { ... }`). **What's the only way left to get per-instance state into the precompile?** Hint: think about Rust's two patterns for "shared mutable state across functions that don't take it as a parameter."

(Answer: process-global storage. We can't pass the `Arc<Mutex<Book>>` *into* the precompile function — the function pointer's signature is fixed. So the precompile reads from a `static` variable that holds the shared state. The bridge writes the static (via `install_clob`); the precompile reads it (via `current_best_bid()`). This is the canonical pattern when function-pointer signatures preclude closure capture. **The trade-off: one CLOB per process.** That's acceptable for single-validator openhl; future REVM versions may relax the function-pointer constraint.)

## Walk-through

### Step 1: Add `best_bid_with_qty` + `best_ask_with_qty` to `Book`

Open `crates/clob/src/book.rs`. Find the existing `best_bid` and `best_ask` methods. Add two new methods just after them:

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

The existing `best_bid()` returns just `Option<Price>`. The new method returns the price **plus** the total quantity resting at that level — summing across every order in the FIFO queue at the best price.

This is what the precompile needs. The Solidity-side return signature is `(price: u256, qty: u256)`; the precompile needs both values to fill the 64-byte response.

> 🛑 **Anti-fluency.** "Couldn't the precompile just call `best_bid()` and `depth_bid()` separately?" **`depth_bid()` returns the count of orders across all bids, not the qty at the best level.** They're different metrics. `best_bid_with_qty()` is the right shape for the precompile's contract: tell me the best price and how much liquidity is at that price.

### Step 2: Update imports in `precompiles/mod.rs`

Open `crates/evm/src/precompiles/mod.rs`. The current imports (after L2) are:

```rust
use alloy_evm::revm::precompile::{
    Precompile, PrecompileId, PrecompileOutput, PrecompileResult, Precompiles,
};
use alloy_primitives::{address, Address, Bytes};
```

Add two more `use` statements:

```rust
use openhl_clob::Book;
use std::sync::{Arc, Mutex, RwLock};
```

Three new types pulled in:
- **`Book`** — the matching engine state we'll share.
- **`Arc`** — atomic reference-counted handle. The bridge and the precompile both hold one.
- **`Mutex`** — for the `Book` itself (the bridge's pattern from course 7).
- **`RwLock`** — for the `Option<...>` wrapper around the shared `Arc<Mutex<Book>>`. Reads (every precompile call) are vastly more common than writes (one install per process); `RwLock` allows concurrent readers.

### Step 3: Add the module-level `static CLOB_STATE`

Below the imports, before any functions:

```rust
/// Process-global handle to the CLOB the precompile reads from.
///
/// `None` until [`install_clob`] is called (typically by `LiveRethEvmBridge::new`).
/// While `None`, `read_best_bid` returns zero-encoded output rather than
/// erroring — this keeps existing tests deterministic and matches what an
/// uninitialised perp market would return on mainnet.
static CLOB_STATE: RwLock<Option<Arc<Mutex<Book>>>> = RwLock::new(None);
```

One line that does a lot:

- **`static CLOB_STATE`** — process-global; lives for the whole program's runtime.
- **`RwLock<...>`** — outer lock, separating "is a CLOB installed?" from "what's in the CLOB?"
- **`Option<...>`** — `None` before any bridge installs a CLOB; `Some(Arc<Mutex<Book>>)` after.
- **`Arc<Mutex<Book>>`** — the shared handle. The bridge owns one Arc; this static holds another. When the bridge mutates the `Book` (via `clob.lock().submit(...)`), the precompile sees the same changes (via `clob.lock().best_bid_with_qty()`).
- **`RwLock::new(None)`** — initialized at compile time. Type system enforces single-threaded init.

The doc comment is the lesson — call out that `None` is the "uninstalled" state and that we return zero bytes rather than erroring. Mainnet contracts that read an uninitialised perp market would see zero values; we match that semantic.

> 🛑 **Anti-fluency.** "Why not use `lazy_static!` or `OnceLock`?" **They'd work but they'd over-constrain us.** `OnceLock` only allows one set; we want `install_clob` to be re-callable (test isolation). `lazy_static!` requires unsafe initialization tricks that `static RwLock<...> = RwLock::new(None)` avoids since Rust 1.63. Plain `static RwLock<...>` is the cleanest 2024 idiom.

### Step 4: Add the three module functions

Below the static:

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

Three public functions, each `pub` for a reason:

- **`install_clob`** — the bridge calls this in `new()`. **Replaces** any previous installation; idempotent on multiple calls with the same Arc. The `*CLOB_STATE.write().expect(...) = Some(clob)` pattern is the canonical "acquire write lock, set value, release lock" idiom.
- **`uninstall_clob`** — test-only typical use. Test setups install + tear down. Production rarely uninstalls.
- **`current_best_bid`** — exposed for direct testing without going through the EVM. Walks: write lock → read lock → option deref → mutex lock → `best_bid_with_qty()`. **Three locks** to read one value; that sounds expensive but each is microseconds, and reads are concurrent under `RwLock`.

> 🛑 **Anti-fluency.** "Three locks for one read seems wasteful." **The locks serve different purposes.** `RwLock` distinguishes installed-vs-uninstalled (rare write contention). `Mutex<Book>` protects the matching engine state (frequent contention but milliseconds). Putting them all in one lock would serialize all reads + writes uniformly — much worse for concurrency. **Layered locks reflect layered concerns.**

### Step 5: Change `LiveRethEvmBridge::clob` to `Arc<Mutex<Book>>`

Open `crates/evm/src/live_node.rs`. Find the `LiveRethEvmBridge` struct definition:

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

Change `clob`:

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

Then find `new()`:

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

Update to wrap in Arc + install:

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

Three changes:

1. **`let clob = Arc::new(...)`** — bind the Arc to a local. We need to use it twice (for `install_clob` and for the struct).
2. **`crate::precompiles::install_clob(Arc::clone(&clob))`** — share the Arc with the precompile module. **`Arc::clone(&clob)` increments the refcount**; both the bridge and the static now hold strong references.
3. **`clob,`** in the struct literal — just `clob` (the field is the same name as the local).

Note `precompiles` is a private module of `crates/evm/`, but `install_clob` is `pub fn` — within the crate, this works via `crate::precompiles::install_clob`.

### Step 6: Verify nothing else broke

Make sure no other code in `live_node.rs` was relying on `clob: Mutex<Book>` — only `Arc<Mutex<Book>>`. Look for any `self.clob.lock()` calls. They still work — `Arc<Mutex<Book>>` deref-coerces through to `Mutex<Book>`, so `self.clob.lock()` is unchanged.

The other places `clob` is used:
- `submit_order(&self, order: Order)` — uses `self.clob.lock()`. Still works (Arc derefs to inner Mutex).
- That's it.

`build_payload`, `payload_ready`, etc. don't touch `clob` directly.

## Test

```bash
cargo test -p openhl-evm --release
```

After ~30 seconds:

```
running 42 tests
... 42 tests pass ...

test result: ok. 42 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

All L3 tests still green. Note that **the L3 unit tests still expect hardcoded values** (`U256::from(100u64)`, `U256::from(10u64)`) — because we haven't changed `read_best_bid` yet. The plumbing is in place; the values flowing through `read_best_bid` are still hardcoded.

If you want to sanity-check that the plumbing actually works (before L5 swaps the body), you can write a one-off:

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

Run with `cargo test -p openhl-evm current_best_bid_reflects_installed_clob`. Should pass. **Then delete it** — L5+ has the real test set.

Common errors and fixes:

- **`error[E0277]: 'Arc<Mutex<Book>>' is not 'Mutex'`** — your `submit_order` is using `self.clob.lock()` and the compiler is rejecting because of trait differences. Actually this should work — `Arc<Mutex<Book>>` derefs to `&Mutex<Book>`. If you see this error, you probably wrote `self.clob.deref().lock()` somewhere, which is the wrong shape. Just `self.clob.lock()` is correct.
- **`error[E0277]: 'PoisonError<RwLockWriteGuard<Option<Arc<Mutex<Book>>>>>' is not 'Send'`** — your test or call site is panicking with a poisoned lock. The `.expect(...)` we use is the standard pattern; if you're seeing this, there's a panic somewhere within a held lock.
- **Static initialization warning** — Rust 1.63+ supports `static RwLock<T> = RwLock::new(...)` directly. If you see "calls in static contexts are unstable," you're on an older toolchain — see the L0 prerequisites.
- **`unused variable: clob` in `new()`** — you forgot to use `clob` in the struct literal. The variable bound to `let clob = Arc::new(...)` must also appear in the struct as `clob,`.

## Design reflection

Three load-bearing decisions encoded here:

1. **Process-global state is the canonical workaround for function-pointer signatures.** REVM's `PrecompileFn = fn(...) -> PrecompileResult` is a function pointer, not a closure. We can't capture state in it. The only options are: (a) accept it via the function arguments (which would require REVM API changes), (b) read it from a process-global. We take option (b). **The cost: one CLOB per process.** For single-validator deployments that's fine; multi-tenant would need REVM API changes.

2. **`RwLock` for the outer Option, `Mutex` for the inner `Book`.** The outer lock distinguishes installed-vs-uninstalled (rare write). The inner lock protects the matching engine state (frequent write — every submit). Different lock types for different access patterns. Single `Mutex<Option<Arc<Mutex<Book>>>>` would serialize all reads through one bottleneck.

3. **`install_clob` replaces, doesn't error.** Calling it twice with two different CLOBs silently replaces the first. We could detect this and panic, but production paths only call it once. Tests, however, may need to install/uninstall repeatedly. **Replacement is a feature for tests, not a bug.** Doc comments make this explicit.

## Answer key

```bash
cd ~/code/openhl-reference
git checkout b635ef7
diff -u ~/code/my-openhl/crates/clob/src/book.rs ./crates/clob/src/book.rs
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
```

After L4, your code partially matches Stage 9b: the new methods, the static, the 3 module functions, the bridge field change. The remaining differences are:
- `read_best_bid` still hardcoded (L5 swaps).
- L3's unit tests still expect hardcoded values (L5 updates them).

Return:

```bash
git checkout main
```

## Common questions

**Q: Why is `CLOB_STATE` `&'static` not heap-allocated?**
Static storage has the simplest lifetime: lives for the entire program. Heap allocation (via `Box::leak` or similar) would also work but adds runtime allocation cost and complexity. `static` is the right tool when you want "exists from program start to program end" — exactly our case.

**Q: What happens if two `LiveRethEvmBridge` instances are created (e.g., in parallel tests)?**
The second call to `install_clob` replaces the first. **Both bridges share the second's CLOB via the global.** This is why tests need serialization (L5 adds it). Production deployments create exactly one bridge; this isn't an issue.

**Q: Could `current_best_bid` return `Result<...>` instead of `Option<...>`?**
You could — `Err(NoClobInstalled)` instead of `None`. But the precompile doesn't need to distinguish "no CLOB installed" from "CLOB installed but empty" — both should return zero. `Option` collapses both cases to `None`; `Result` would force the precompile to handle them separately for no benefit.

**Q: What if `book.lock()` panics inside `current_best_bid`?**
The `.expect("clob mutex poisoned")` panics, which propagates up through `current_best_bid` → `read_best_bid` → REVM's dispatch. REVM treats this as a fatal precompile error and halts the EVM (likely reverting the entire transaction). **This is the right behavior** — a poisoned Mutex means another thread crashed while holding the lock; continuing to run on inconsistent state is worse than aborting.

## Next lesson (L5)

The plumbing is installed but the precompile still ignores it. L5 swaps `read_best_bid`'s body to call `current_best_bid()` instead of returning hardcoded values. Updates L3's tests to expect zero output when no CLOB is installed. Adds `TEST_SERIALIZER` to prevent parallel tests from racing on the global state. After L5, `read_best_bid` reads live state — but the only test exercising the round-trip is the smoke test you write inline. L6 makes the round-trip test permanent.
````

---

## Seed-file slot

L4 lands in Module 2 (Read precompile) at sortOrder 0:

```typescript
{
  title: 'Lesson 4 — install_clob() — bridging EVM state to the matching engine',
  slug: 'openhl-precompiles-install-clob-en',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 35,
  xpReward: 70,
  content: `# Lesson 4 — \`install_clob()\` — bridging EVM state to the matching engine\n\n...`
},
```

## SHA pinning discipline

L4 cites `b635ef7` (Stage 9b). After L4 your code partially matches — plumbing present, `read_best_bid` still hardcoded. L5 closes the gap.

## Style review notes (self-critique before paste)

- **§Plan's "wires exist but no current flows"** is the conceptual frame — L4 is plumbing-only, no functional change visible from tests.
- **§Predict on function-pointer-vs-closure** earns the global-state pattern; readers from Rust backgrounds will instinctively reach for closures and need the reason why they don't work.
- **§Step 3's `RwLock<Option<Arc<Mutex<...>>>>` breakdown** unpacks what looks like a four-layer wrapper into four distinct responsibilities.
- **§Anti-fluency on three-locks-for-one-read** preempts the natural "this is wasteful" reaction.
- **§Step 5's "deref coercion" note** preempts the common Arc-vs-Mutex confusion.
- **L5 preview** names the swap + test updates clearly.
