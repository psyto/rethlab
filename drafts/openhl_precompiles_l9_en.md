# Building OpenHL Precompiles — L9 draft (EN) — build-along

> Drafted against openhl SHA `d19ba1b` (Stage 9c+ — route precompile-placed fills into the bridge).
> Course: `building-openhl-precompiles-en` (track: `reth-l1-architect`).

---

## L9 — `openhl-precompiles-fill-sink-en`

- **Module:** 4 (Bridge integration), sortOrder 0 within module
- **Course-level sortOrder:** 8 (lesson 9 of 12)
- **Duration:** 40 min
- **XP reward:** 80
- **Type:** CONTENT

### Content

````markdown
# Lesson 9 — `install_fill_sink` — fills flow back to the bridge

## Goal

By the end of this lesson:

```bash
cargo test -p openhl-evm --release
```

…passes 47 tests (1 new). The "fills are discarded" gap from L8's doc comment is closed:

- **`FILL_SINK` static added** — parallel to `CLOB_STATE`, holds `Option<Arc<Mutex<Vec<Fill>>>>`.
- **`install_fill_sink` / `uninstall_fill_sink` module fns** — public, mirror the `install_clob` / `uninstall_clob` pattern.
- **`place_order` extended** — `let submit_result = book.submit(...)` (was `_result`); after `drop(book)`, if the sink is installed, **push the produced fills into it**.
- **`LiveRethEvmBridge::pending_fills`** changes from `Mutex<Vec<Fill>>` to `Arc<Mutex<Vec<Fill>>>`. The bridge's `new()` now calls `install_fill_sink(Arc::clone(&pending_fills))` alongside `install_clob`.
- **New unit test** `place_order_routes_fills_to_installed_sink` — exercises the maker/taker cross and verifies the sink receives a fill.

After L9, the precompile and the bridge are no longer **write-side independent**. EVM-placed orders produce fills that flow into the same `pending_fills` queue that bridge-side `submit_order` writes to. The next `build_payload` will see them.

## Recap

L8 closed Stage 9c proper: `place_order` now writes to the book, and the round-trip via `place_order → read_best_bid` is proven. But L8's doc comment named a gap:

> Side note: the fills returned by `Book::submit` are discarded here. Production-shape integration would route them through the bridge's `pending_fills` so they reach the next `build_payload`.

That gap was deliberate — Stage 9c shipped without it to keep the diff focused. Stage 9c+ closes it.

## Plan

Five edits to `crates/evm/src/precompiles/mod.rs` + 2 edits to `crates/evm/src/live_node.rs`:

1. **Import `Fill`** in `precompiles/mod.rs` (and in `live_node.rs` if not already present).
2. **Add the `FILL_SINK` static** and the 2 install/uninstall module fns.
3. **Inside `place_order`** — rename `_result` to `submit_result`, then push `submit_result.fills` into the sink (if installed) after the Book lock is dropped.
4. **Update `place_order` doc comment** — remove the "fills are discarded" side note, replace with the Stage 9c+ behavior.
5. **Add the unit test** `place_order_routes_fills_to_installed_sink`.

For `live_node.rs`:

6. **Change `pending_fills` field** from `Mutex<Vec<Fill>>` to `Arc<Mutex<Vec<Fill>>>`.
7. **Update `new()`** — bind `pending_fills` as an Arc, call `install_fill_sink(Arc::clone(&pending_fills))` alongside the existing `install_clob`.

> 🛑 **Predict.** Before scrolling: we already have a precompile (`place_order`) that calls `book.submit(...)` and *discards* the returned fills. To make those fills reach the bridge, we could (a) have the precompile *call* the bridge directly, (b) have the bridge *poll* somewhere for fills, or (c) install a shared buffer the precompile pushes into. **Why is option (c) — the shared-buffer pattern — almost forced by the architecture we've built?** Hint: think about what (a) and (b) would require knowing.

(Answer: **The precompile is a `fn` pointer; it can't capture a reference to the bridge.** Option (a) would require giving the precompile an `&Bridge` somehow, which is the same function-pointer-capture problem we solved with the `CLOB_STATE` global. Option (b) would require the bridge to know it should poll — a clear separation-of-concerns violation. Option (c) is the same pattern: bridge owns the buffer, precompile sees it through a global. **Once the architecture for shared CLOB state is in place, shared fill state is the natural extension.**)

## Walk-through

### Step 1: Import `Fill`

In `crates/evm/src/precompiles/mod.rs`, the current import is:

```rust
use openhl_clob::{AccountId, Book, Order, OrderId, OrderType, Price, Qty, Side};
```

Add `Fill`:

```rust
use openhl_clob::{AccountId, Book, Fill, Order, OrderId, OrderType, Price, Qty, Side};
```

`Fill` is a value type defined in `crates/clob/src/lib.rs` (from course 7). It has `price: Price` and `qty: Qty` fields (and possibly more — `maker_order_id`, `taker_order_id`, etc., but the test below only inspects `price` and `qty`). Copy-able, so passing fills around is cheap.

In `crates/evm/src/live_node.rs`, the `Fill` import is already present (the existing `pending_fills` field uses it). No change there yet.

### Step 2: Add `FILL_SINK` + install/uninstall fns

After `uninstall_clob`:

```rust
/// Process-global handle to the buffer where the precompile pushes fills.
///
/// Same lifecycle rules as `CLOB_STATE`: installed by `LiveRethEvmBridge::new`,
/// none until set. When set, `place_order` extends this buffer with any fills
/// produced by the matched order, so production-shape EVM-placed orders flow
/// into the next `build_payload`'s drained fills exactly like bridge-side
/// `submit_order` does.
static FILL_SINK: RwLock<Option<Arc<Mutex<Vec<Fill>>>>> = RwLock::new(None);

/// Install the `pending_fills` buffer the precompile should write to.
/// Companion to `install_clob`. Calling this replaces any previously-installed
/// sink.
pub fn install_fill_sink(sink: Arc<Mutex<Vec<Fill>>>) {
    *FILL_SINK.write().expect("FILL_SINK rwlock poisoned") = Some(sink);
}

/// Clear the installed fill sink. Test-only typical use; idempotent.
pub fn uninstall_fill_sink() {
    *FILL_SINK.write().expect("FILL_SINK rwlock poisoned") = None;
}
```

The static is an exact structural parallel to `CLOB_STATE`:
- `CLOB_STATE: RwLock<Option<Arc<Mutex<Book>>>>` — outer install/uninstall lock, inner Book lock.
- `FILL_SINK: RwLock<Option<Arc<Mutex<Vec<Fill>>>>>` — outer install/uninstall lock, inner buffer lock.

Same lifecycle, same lock-layering rationale (from L4 §Design reflection 2): `RwLock` for the rare install/uninstall write, `Mutex` for the frequent buffer writes.

`install_fill_sink` and `uninstall_fill_sink` mirror their CLOB counterparts: 1-line bodies, both `pub fn`. The doc comments name the lifecycle ("by `LiveRethEvmBridge::new`") so readers tracing the code know who's expected to call them.

> 🛑 **Anti-fluency.** "Why not bundle the CLOB and the fill-sink into one global like `CLOB_STATE: Option<(Arc<Mutex<Book>>, Arc<Mutex<Vec<Fill>>>)>`?" **Because they have different installation timing requirements.** A test that exercises only `read_best_bid` doesn't need a fill sink installed. Bundling forces every test to provide both. **Keeping the globals orthogonal means each test installs only what it touches.** The cost of two statics is symbolic (and they're zero-runtime-cost when uninstalled). The benefit is per-test composability.

### Step 3: Extend `place_order` to push fills

L8's body had:

```rust
    let mut book = clob.lock().expect("clob mutex poisoned");
    let _result = book.submit(Order {
        id: OrderId(order_id_val),
        account: AccountId(account_id),
        side,
        qty: Qty(qty_value),
        order_type: OrderType::Limit {
            price: Price(price_value),
        },
    });
    drop(book);

    out[24..32].copy_from_slice(&order_id_val.to_be_bytes());
```

Change to:

```rust
    let mut book = clob.lock().expect("clob mutex poisoned");
    let submit_result = book.submit(Order {
        id: OrderId(order_id_val),
        account: AccountId(account_id),
        side,
        qty: Qty(qty_value),
        order_type: OrderType::Limit {
            price: Price(price_value),
        },
    });
    drop(book);

    // Stage 9c+: route any fills produced by this order through the bridge's
    // pending_fills buffer so they reach the next `build_payload`. Drops
    // silently if no sink is installed (consistent with no-CLOB → return 0).
    if !submit_result.fills.is_empty() {
        let sink_state = FILL_SINK.read().expect("FILL_SINK rwlock poisoned");
        if let Some(sink) = sink_state.as_ref() {
            sink.lock()
                .expect("fill_sink mutex poisoned")
                .extend(submit_result.fills.iter().copied());
        }
    }

    out[24..32].copy_from_slice(&order_id_val.to_be_bytes());
```

Three changes:

1. **`_result` → `submit_result`.** Per L8's design reflection ("`_result` is a future-intent marker"), this is now its future. The underscore goes away; the binding is used.
2. **The `if !submit_result.fills.is_empty()` early-out.** When the order rested without crossing (no fills produced), we skip the lock acquisition entirely. Common case for resting limits → no fill-sink traffic.
3. **`sink_state.as_ref().map(|sink| sink.lock()...extend(...))` pattern.** Same shape as `current_best_bid`'s read pattern (Step 4 of L4): hold the outer read lock briefly to access the inner Arc, then acquire the inner Mutex.

**`submit_result.fills.iter().copied()`** — `Fill` is `Copy`, so `.iter().copied()` produces an owned-fill iterator. Cheaper than `.into_iter()` because `submit_result` may have other fields we don't want to consume. **Iterating-by-copy keeps the source intact.**

> 🛑 **Predict.** Look at the `if !submit_result.fills.is_empty()` guard. If we removed it (and unconditionally acquired the FILL_SINK read lock + checked `as_ref()`), would behavior change?

(Answer: **Behavior would be identical, but performance would suffer in the no-fill case.** Every `place_order` call that rests without crossing — the common case for limit orders — would acquire a `FILL_SINK` read lock just to find out there's nothing to push. The guard short-circuits that. **Early-out on the common case is a free win.** This is a hot path; the cost of the unnecessary lock acquisition would compound.)

### Step 4: Update the `place_order` doc comment

L8's bottom paragraph said:

```rust
/// Side note: the fills returned by `Book::submit` are discarded here.
/// Production-shape integration would route them through the bridge's
/// `pending_fills` so they reach the next `build_payload`. At v0 the
/// precompile and the bridge are write-side independent.
```

Replace with:

```rust
/// Stage 9c+ (this commit): any fills produced by the submit are pushed into
/// the `FILL_SINK` global if installed. This is what makes EVM-placed orders
/// flow into the bridge's `pending_fills` and out via `build_payload`,
/// matching the bridge-side `submit_order` semantics. If no sink is
/// installed the fills are still produced (visible via subsequent
/// `read_best_bid`) but won't reach a payload.
```

Two things named:

1. **The "what changed" line** — "Stage 9c+ (this commit)". When a reader skims this doc 6 months later they'll know exactly what version of the code is doing this.
2. **The fallback semantic** — "if no sink is installed the fills are still produced." Crucial for test isolation: the round-trip test from L8 doesn't install a sink, but `place_order_then_read_best_bid_round_trips` still works because fills land in the Book regardless. **Naming the fallback in the doc comment means tests that don't care about fills don't have to install a sink just to keep `place_order` happy.**

### Step 5: Add the unit test

After `place_order_then_read_best_bid_round_trips`, in the `#[cfg(test)] mod tests` block:

```rust
    /// **Stage 9c+**: when a `FILL_SINK` is installed alongside the CLOB,
    /// fills produced by a `place_order` call flow into the sink. This is the
    /// hook the bridge relies on to surface EVM-placed fills in the next
    /// `build_payload`. With no sink installed, fills are still produced but
    /// silently dropped — verified by the round-trip test above (which never
    /// installs a sink yet still observes book state changes).
    #[test]
    fn place_order_routes_fills_to_installed_sink() {
        let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        let book = Arc::new(Mutex::new(Book::new()));
        let sink: Arc<Mutex<Vec<Fill>>> = Arc::new(Mutex::new(Vec::new()));
        install_clob(book);
        install_fill_sink(Arc::clone(&sink));

        // Maker: Buy @ 100, qty 10. Rests, no fill.
        let maker = place_order_calldata(1, 0, 100, 10);
        let r = place_order(&maker, 100_000, 0).unwrap();
        assert!(U256::from_be_slice(&r.bytes[0..32]) > U256::ZERO);
        assert!(sink.lock().unwrap().is_empty(), "no fills after resting maker");

        // Taker: Sell @ 100, qty 10. Crosses the maker → exactly one fill.
        let taker = place_order_calldata(2, 1, 100, 10);
        let r = place_order(&taker, 100_000, 0).unwrap();
        assert!(U256::from_be_slice(&r.bytes[0..32]) > U256::ZERO);

        let fills = sink.lock().unwrap().clone();
        assert_eq!(fills.len(), 1, "exactly one fill from the crossing taker");
        assert_eq!(fills[0].price, Price(100));
        assert_eq!(fills[0].qty, Qty(10));

        uninstall_fill_sink();
        uninstall_clob();
    }
```

The test's shape:

1. **Setup** — `TEST_SERIALIZER` + install both CLOB and sink. Hold `sink` (an Arc clone) for inspection.
2. **Resting maker** — a Buy @ 100 that doesn't cross anything (book is empty). Should produce **zero fills**. Sink remains empty.
3. **Crossing taker** — a Sell @ 100 that crosses the resting Buy. The maker exits the book, the taker is fully matched → **exactly one Fill**.
4. **Inspect the sink** — `clone()` the Vec out so the assertion happens without holding the Mutex. Verify length, price, qty.
5. **Cleanup** — both uninstall calls in reverse install order.

**Why a maker + taker pair, not just a single submit?** Because `Book::submit` only produces fills when the new order *crosses* existing orders. A solo submit on an empty book produces zero fills. To test the routing logic, we **need at least one fill to actually route**. The maker rests; the taker crosses → 1 fill — minimum test data.

> 🛑 **Anti-fluency.** "Couldn't we test by submitting just a marketable Buy when the book has a resting Sell?" **Yes, equivalent. We pick maker-Buy/taker-Sell because that's the canonical order-book example.** Either direction works as long as the second order is marketable against the first. The pedagogical point is "two orders that cross produce one fill"; the price direction is incidental.

> 🛑 **Predict.** What happens if we install the CLOB but **not** the sink, then place crossing orders? Hint: look at L8's existing `place_order_then_read_best_bid_round_trips` test.

(Answer: **The fill is produced inside the Book but not pushed anywhere — the precompile's `if !submit_result.fills.is_empty()` guard hits, but `FILL_SINK.read()` returns `None`, so the inner block doesn't execute.** The order is still on/off the book correctly; only the *flow to the bridge* is missing. This is the "still works for solo tests" property called out in the doc comment. L8's round-trip test relies on this — it never installs a sink and still observes correct best-bid behavior.)

### Step 6: `live_node.rs` — pending_fills as Arc

Open `crates/evm/src/live_node.rs`. The current struct (from L4):

```rust
pub struct LiveRethEvmBridge<P> {
    provider: P,
    chain_spec: Arc<ChainSpec>,
    validator: EthBeaconConsensus<ChainSpec>,
    clob: Arc<Mutex<Book>>,
    pending_fills: Mutex<Vec<Fill>>,
    state: Mutex<State>,
}
```

Change `pending_fills`:

```rust
pub struct LiveRethEvmBridge<P> {
    provider: P,
    chain_spec: Arc<ChainSpec>,
    validator: EthBeaconConsensus<ChainSpec>,
    clob: Arc<Mutex<Book>>,
    /// Same shared-Arc pattern as `clob`: the precompile module's `FILL_SINK`
    /// global points at this buffer too, so fills produced by EVM-placed
    /// orders (via `clob_place_order`) flow into the same queue the bridge's
    /// own `submit_order` writes to (Stage 9c+).
    pending_fills: Arc<Mutex<Vec<Fill>>>,
    state: Mutex<State>,
}
```

Doc comment explains the architectural symmetry — `pending_fills` and `clob` are now both shared-Arc pattern. Anyone tracing the type and seeing the `Arc` will know there's a global pointing at it too.

### Step 7: Update `LiveRethEvmBridge::new`

Current `new` (after L4):

```rust
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

Change to:

```rust
    pub fn new(provider: P, chain_spec: Arc<ChainSpec>) -> Self {
        let validator = EthBeaconConsensus::new(Arc::clone(&chain_spec));
        let clob = Arc::new(Mutex::new(Book::new()));
        let pending_fills = Arc::new(Mutex::new(Vec::new()));

        // Make our CLOB visible to the `clob_read_best_bid` precompile so
        // smart contracts can query live orderbook state. The bridge writes
        // (submit_order), the EVM reads (precompile); they share the same Arc.
        crate::precompiles::install_clob(Arc::clone(&clob));

        // Route fills produced by the `clob_place_order` precompile into the
        // same queue `submit_order` writes to. Without this, EVM-placed orders
        // would match but their fills would be silently dropped (Stage 9c+).
        crate::precompiles::install_fill_sink(Arc::clone(&pending_fills));

        Self {
            provider,
            chain_spec,
            validator,
            clob,
            pending_fills,
            state: Mutex::new(State::default()),
        }
    }
```

Three changes:

1. **`let pending_fills = Arc::new(Mutex::new(Vec::new()));`** — bind the Arc to a local, same shape as `let clob = ...` above.
2. **`crate::precompiles::install_fill_sink(Arc::clone(&pending_fills));`** — share the Arc with the precompile module. Mirrors `install_clob`.
3. **Struct literal `pending_fills,`** (no `Mutex::new(Vec::new())` inline) — just use the local.

Other call sites that use `self.pending_fills` (e.g., `pending_fill_count()`, the drain in `build_payload`) keep working — `Arc<Mutex<T>>` derefs to `&Mutex<T>`, so `self.pending_fills.lock()` is unchanged. Same coercion that kept `submit_order` working when we Arc-wrapped `clob` in L4.

## Test

```bash
cargo test -p openhl-evm --release
```

After ~30 seconds:

```
running 47 tests
... 47 tests pass ...

test result: ok. 47 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

One more than L8 (46 → 47). The new one is `place_order_routes_fills_to_installed_sink`. To see only it:

```bash
cargo test -p openhl-evm --release routes_fills
```

Output:

```
running 1 test
test precompiles::tests::place_order_routes_fills_to_installed_sink ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 46 filtered out
```

Common errors and fixes:

- **`error[E0277]: 'Vec<Fill>' is not 'Arc<Mutex<Vec<Fill>>>'`** in `live_node.rs` — you forgot to wrap `pending_fills` in Arc::new + Mutex::new. The new() must construct `let pending_fills = Arc::new(Mutex::new(Vec::new()));`.
- **`error[E0277]: 'Mutex<Vec<Fill>>' is not 'Arc<Mutex<Vec<Fill>>>'`** when struct-literal uses `Mutex::new(...)` directly — leftover from L4 shape. Replace with the local `pending_fills,` binding.
- **`unused import: Fill`** in `precompiles/mod.rs` — you added Fill to the import but didn't use it. The `Vec<Fill>` and `FILL_SINK: ...Fill...` references should use it. If you see this, check that the static is in place.
- **`assertion failed: fills.len() == 1`** in the new test — `book.submit` produced 0 fills instead of 1. Likely cause: the second order didn't cross the first. Verify maker is Buy @ 100 and taker is Sell @ 100 (same price = crosses).
- **Hangs forever** — `place_order` is holding the Book lock when it tries to acquire the FILL_SINK. Verify the `drop(book)` line is *before* the `if !submit_result.fills.is_empty()` block.

## Design reflection

Four points:

1. **The shared-buffer pattern generalizes.** L4 introduced the `Arc<Mutex<T>>` + process-global pattern for the CLOB. L9 reuses it for fills. **Once the architectural primitive is in place, additional "shared between bridge and precompile" state costs ~20 lines of code per new buffer.** The investment in L4's abstraction pays compound interest.

2. **Different states have different installation lifetimes — keep them separate.** Bundling CLOB and FILL_SINK into one global would force every test to install both. Orthogonal globals = orthogonal test setup. **Cohesion of related state matters less than orthogonal lifecycle composability when tests are the primary consumer.**

3. **Early-out on the common case is free.** `if !submit_result.fills.is_empty()` skips lock acquisition when the order rests without crossing — the most common case. The guard adds one branch in the hot path and saves an RwLock acquisition when fills are empty. **The cheapest optimization in a hot path is often an early-out on the dominant case.**

4. **The flag is in the doc comment.** "Side note: fills are discarded" in L8's doc was load-bearing — it told future readers "this is a deliberate gap, not an oversight." L9 closes the gap and updates the doc accordingly. **A gap that's documented is half-fixed; an undocumented gap is invisible technical debt.**

## Answer key

```bash
cd ~/code/openhl-reference
git checkout d19ba1b
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
```

After L9, the `precompiles/mod.rs` diff should be empty, and the `live_node.rs` diff should also be empty *for the changes covered in L9*. The Stage 9c+ commit also extends the bridge integration test (which doesn't exist yet — L10 adds it). So a non-empty diff in `live_node.rs` is expected at the test region — that's L10's territory.

Return:

```bash
git checkout main
```

## Common questions

**Q: What if two threads call `place_order` at the same time and both produce fills?**
Both threads will acquire the FILL_SINK read lock (non-exclusive, fine). Both will get a reference to the same Arc-wrapped buffer. Each will `.lock()` the inner Mutex — that acquisition serializes them. **One thread's fills land first, then the other's. Order matches the order of `submit` calls; nothing is lost.** Standard Mutex semantics.

**Q: Why does `place_order_routes_fills_to_installed_sink` test the maker-taker cross instead of a simpler scenario?**
Because we need a fill to test routing. `Book::submit` returns 0 fills when the order doesn't cross anything; we'd never exercise the routing block. **The maker-taker pair is the minimum test data that produces a fill.** Simpler scenarios miss the routing logic entirely.

**Q: What's `submit_result` exactly? Is it just `Vec<Fill>`?**
It's the struct returned by `Book::submit` (defined in course 7's CLOB crate). It typically has at least a `.fills: Vec<Fill>` field, possibly more (`order_id_assigned`, `resting_qty`, etc.). We only need `.fills` for L9; the rest is unused at v0.

**Q: When the bridge `build_payload` drains `pending_fills`, does it drain fills from both sources atomically?**
Yes. `pending_fills` is one buffer (one Mutex), regardless of whether fills came from `bridge.submit_order` (calls inside the bridge) or `place_order` (via the FILL_SINK). When `build_payload` calls `self.pending_fills.lock().unwrap().drain(..)`, it gets every fill that's been pushed since the last drain — both EVM-placed and bridge-placed, interleaved by chronological order. **A unified queue means a unified drain.**

## Next lesson (L10)

L10 is the **course-level milestone**: the Stage 9d integration test `bridge_against_custom_evm_node_shares_clob_with_precompile`. We bootstrap a Reth node with `OpenHlExecutorBuilder`, construct a `LiveRethEvmBridge` against that node's provider, submit an order via `bridge.submit_order`, observe it through `current_best_bid`, then **call `place_order` via the precompile** and verify `bridge.pending_fill_count()` increments. This is the proof that **everything** — Module 1 EVM bootstrap, Module 2 read precompile, Module 3 write precompile, Module 4 FILL_SINK — fits together inside a real Reth process. After L10, the openhl reference implementation closes Stage 9d.
````

---

## Seed-file slot

L9 lands in Module 4 (Bridge integration) at sortOrder 0:

```typescript
{
  title: 'Lesson 9 — install_fill_sink — fills flow back to the bridge',
  slug: 'openhl-precompiles-fill-sink-en',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 40,
  xpReward: 80,
  content: `# Lesson 9 — \`install_fill_sink\` — fills flow back to the bridge\n\n...`
},
```

## SHA pinning discipline

L9 cites `d19ba1b` (Stage 9c+). After L9, `precompiles/mod.rs` matches Stage 9c+; `live_node.rs` matches Stage 9c+ except for the integration-test region (L10's territory).

## Style review notes (self-critique before paste)

- **§Goal frames Module 4 opening** — the precompile and bridge are no longer write-side independent.
- **§Predict on (a)(b)(c) options** earns the shared-buffer pattern by elimination.
- **§Step 2's structural parallel between `CLOB_STATE` and `FILL_SINK`** anchors L9 in the L4 abstraction.
- **§Anti-fluency on "why not bundle"** justifies the orthogonal-globals design.
- **§Predict on early-out** preempts "could we simplify?" — explains the hot-path optimization.
- **§Step 5 maker/taker explanation** justifies the test data shape.
- **§Step 6 + 7 mirror L4's bridge changes** — readers see the structural symmetry.
- **§Design reflection 1** "the shared-buffer pattern generalizes" retrospects L4's abstraction value.
- **L10 preview** is the course milestone tease — "everything fits together."
