# Building OpenHL Precompiles — L10 draft (EN) — build-along

> Drafted against openhl SHAs `2f796c3` (Stage 9d) + `d19ba1b` (Stage 9c+ extension).
> Course: `building-openhl-precompiles-en` (track: `reth-l1-architect`).

---

## L10 — `openhl-precompiles-bridge-integration-en`

- **Module:** 4 (Bridge integration), sortOrder 1 within module
- **Course-level sortOrder:** 9 (lesson 10 of 12)
- **Duration:** 45 min
- **XP reward:** 90
- **Type:** CONTENT
- **Milestone:** Course-level milestone — full stack proof

### Content

````markdown
# Lesson 10 — Course milestone — the full stack in a real Reth node

## Goal

Concepts you'll grasp in this lesson:

- **Integration tests catch wiring bugs unit tests can't** — unit tests build each piece in isolation, so a typo in `with_components(...executor(OpenHlExecutorBuilder))` or a regression in `EthereumAddOns` application would leave unit tests green while breaking production. One integration test = wiring assertion.
- **`pub(crate)` is the right visibility for cross-module tests** — widening `place_order` to `pub` leaks the API; `#[cfg(test) pub(crate)]` adds ceremony for no benefit. `pub(crate)` says "inside this crate, anyone; outside, no one."
- **Inlined test calldata > DRY helper** — hand-built `[u8; 128]` with byte-position comments makes the ABI layout visible at the call site. For tests proving system-level correctness, every byte position should be a learnable artifact; helpers hide.
- **Canonical mix: one integration test + many unit tests** — pieces have their own narrow tests; composition has one wide test. Failure localization comes from unit tests; wiring guarantees come from the integration test.
- **The honest deferred: RPC roundtrip is Reth's responsibility, not openhl's** — testing JSON-RPC → eth_call → revm dispatch would validate Reth, not openhl. The scope of "openhl plugs into Reth correctly" doesn't include "Reth's RPC server works."

Verification:

```bash
cargo test -p openhl-evm --release bridge_against_custom_evm
```

…passes a single new integration test, `bridge_against_custom_evm_node_shares_clob_with_precompile`.

Specific changes:

The test does everything Stages 9a-9c+ touched, all in one place:

1. **Bootstrap Reth** with `OpenHlExecutorBuilder` — the custom EVM with both CLOB precompiles registered.
2. **Construct `LiveRethEvmBridge`** against that node's provider — the bridge's `new()` calls `install_clob` and `install_fill_sink`.
3. **Bridge writes to book** — `bridge.submit_order(Buy @ 200 qty 33)`.
4. **Precompile sees it** — `current_best_bid()` returns `Some((Price(200), Qty(33)))`.
5. **Precompile writes to book** — `place_order(Sell @ 200 qty 33)` via direct call (simulating EVM dispatch).
6. **Bridge sees the fill** — `bridge.pending_fill_count() == 1`.

This is **the course milestone**. After L10, the architecture proven by 47 unit tests is also proven by 1 integration test that exercises a real Reth node + a real bridge + both precompiles + both globals + the matching engine — end-to-end, in-process.

To make this work, **one production-code change is needed**: `place_order` must become `pub(crate)` so the integration test (which lives in `live_node.rs`, a sibling module) can call it directly.

## Recap

After L9:
- The precompile module has `CLOB_STATE` + `FILL_SINK`, both `Option<Arc<Mutex<T>>>` globals.
- The bridge installs into both globals during `new()`.
- Unit tests prove: read works (L6), write works (L8), fills route (L9).
- **What hasn't been tested**: the *combination* in a real Reth node. Unit tests bypass Reth's `NodeBuilder`, `EvmFactory` dispatch, `EthereumNode::components()` plumbing.

L10 closes that gap with a single integration test.

## Plan

Two edits across two files:

1. **`crates/evm/src/precompiles/mod.rs`** — change `fn place_order` to `pub(crate) fn place_order`. The integration test will call it directly. One word added.
2. **`crates/evm/src/live_node.rs`** — add the `bridge_against_custom_evm_node_shares_clob_with_precompile` test inside the existing `#[cfg(test)] mod tests` block. ~70 lines, mostly setup + 7 assertions.

No new production code beyond the visibility change. **L10's value is in the proof, not in the new behavior.**

> 🛑 **Predict.** Before scrolling: we already have unit tests (L3, L6, L9) that prove pieces work. **Why bother with an integration test that just exercises the same code paths through Reth's `NodeBuilder`?** Hint: think about what unit tests can't observe.

(Answer: **Unit tests can't observe wiring mistakes between the bridge and Reth's executor.** Each unit test builds the precompile in isolation, or builds the bridge in isolation; none of them exercise the path where a `NodeBuilder::launch()` flow constructs an `OpenHlEvmFactory` instance and the bridge sees the *same* CLOB through the precompile registered in *that* EVM. A typo in the `with_components(...executor(OpenHlExecutorBuilder))` chain — or a regression where `EthereumAddOns` stops being applied — would leave unit tests green but break the actual production path. **Integration test = wiring assertion.**)

## Walk-through

### Step 1: Make `place_order` `pub(crate)`

In `crates/evm/src/precompiles/mod.rs`, find the `fn place_order` line:

```rust
#[allow(clippy::unnecessary_wraps)]
fn place_order(input: &[u8], _gas_limit: u64, _reservoir: u64) -> PrecompileResult {
```

Change to:

```rust
#[allow(clippy::unnecessary_wraps)]
pub(crate) fn place_order(input: &[u8], _gas_limit: u64, _reservoir: u64) -> PrecompileResult {
```

That's the change. `pub(crate)` = visible to the rest of the `openhl-evm` crate, but not to the world. Three reasons not to make it fully `pub`:

1. **The precompile is registered into the registry** by `openhl_precompiles`. Outside callers should invoke it via `Precompile::execute(...)` through the registry, not by name. Keeping it `pub(crate)` discourages bypass.
2. **The function signature is REVM-specific** (`PrecompileFn = fn(&[u8], u64, u64) -> PrecompileResult`). Exposing it widely would couple downstream callers to REVM's calling convention.
3. **The integration test lives in this crate**, so `pub(crate)` is exactly the visibility that test needs — no more.

**`read_best_bid` stays private.** No test outside the precompiles module calls it directly. Keep visibility minimal.

> 🛑 **Anti-fluency.** "Why not just add `#[cfg(test)] pub(crate)` so it's only visible in test builds?" **`pub(crate)` doesn't widen the production binary's surface.** Visibility annotations are compile-time only; the generated code is identical whether `place_order` is `fn` or `pub(crate) fn`. **`#[cfg(test)]` here is extra ceremony for zero benefit.**

### Step 2: Add the integration test

Open `crates/evm/src/live_node.rs`. Find the `#[cfg(test)] mod tests` block at the bottom of the file. Add this test at the end:

```rust
    /// **Stage 9d**: bootstrap a Reth node WITH `OpenHlExecutorBuilder` (so its
    /// EVM has our CLOB precompiles registered), construct a `LiveRethEvmBridge`
    /// against that node's provider, submit an order via the bridge — verify
    /// that the precompile module's process-global `CLOB_STATE` now reflects
    /// the order. This proves the full bridge ↔ custom-EVM-node integration:
    /// the same `Arc<Mutex<Book>>` that the bridge's `submit_order` writes to
    /// is the one any smart contract calling `clob_read_best_bid` through this
    /// node's EVM would see.
    ///
    /// Doesn't yet invoke the precompile via RPC `eth_call` — that's deferred
    /// indefinitely (validates Reth's plumbing rather than openhl behavior).
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn bridge_against_custom_evm_node_shares_clob_with_precompile() {
        use crate::OpenHlExecutorBuilder;
        use crate::precompiles::{
            CLOB_PLACE_ORDER, current_best_bid, uninstall_clob, uninstall_fill_sink,
        };
        use openhl_clob::{AccountId, OrderId, OrderType, Price, Qty, Side};
        use reth_node_ethereum::node::EthereumAddOns;

        // Start from a clean global state — other tests may have left a CLOB
        // or fill sink installed; that's fine for those tests but would mask
        // bugs here (especially the "sink was wired by bridge::new" assertion).
        uninstall_clob();
        uninstall_fill_sink();

        let runtime = Runtime::test();
        let chain_spec = dev_chain_spec();
        let node_config = NodeConfig::test().dev().with_chain(chain_spec.clone());

        let handle = NodeBuilder::new(node_config)
            .testing_node(runtime)
            .with_types::<EthereumNode>()
            .with_components(EthereumNode::components().executor(OpenHlExecutorBuilder))
            .with_add_ons(EthereumAddOns::default())
            .launch()
            .await
            .expect("launch of custom-EVM node failed");

        // Build the bridge against the live custom-EVM node's provider.
        // The bridge installs its CLOB as the precompile's global state
        // (per the install_clob call inside LiveRethEvmBridge::new).
        let bridge = LiveRethEvmBridge::new(handle.node.provider.clone(), chain_spec);

        // Pre-condition: precompile sees an empty book.
        assert_eq!(current_best_bid(), None);

        // Submit a resting bid via the bridge. This goes through Book::submit
        // under the same Arc<Mutex<Book>> the precompile reads from.
        bridge.submit_order(Order {
            id: OrderId(1),
            account: AccountId(42),
            side: Side::Buy,
            qty: Qty(33),
            order_type: OrderType::Limit { price: Price(200) },
        });

        // Post-condition: the precompile's view (which is what a smart
        // contract calling `clob_read_best_bid` through this node would see)
        // now reflects the order.
        let best = current_best_bid().expect("CLOB has bids after submit_order");
        assert_eq!(best.0, Price(200));
        assert_eq!(best.1, Qty(33));

        // === Stage 9c+ ===
        // Now hit the WRITE precompile: place a crossing Sell @ 200 qty 33
        // via `place_order`. The bridge's pending_fills should see the fill
        // even though we never went through bridge.submit_order. This proves
        // the FILL_SINK that LiveRethEvmBridge::new installed is the same
        // Arc<Mutex<Vec<Fill>>> the bridge later drains in build_payload.
        assert_eq!(
            bridge.pending_fill_count(),
            0,
            "fills empty before crossing taker via precompile"
        );

        let mut calldata = [0u8; 128];
        // account_id = 7 (last 8 bytes of slot 0)
        calldata[24..32].copy_from_slice(&7u64.to_be_bytes());
        // side = Sell (1) at byte 63
        calldata[63] = 1;
        // price = 200 (last 8 bytes of slot 2)
        calldata[88..96].copy_from_slice(&200u64.to_be_bytes());
        // qty = 33 (last 8 bytes of slot 3)
        calldata[120..128].copy_from_slice(&33u64.to_be_bytes());

        let r = crate::precompiles::place_order(&calldata, 100_000, 0)
            .expect("place_order must not error");
        let order_id_bytes = &r.bytes[24..32];
        let order_id = u64::from_be_bytes(order_id_bytes.try_into().unwrap());
        assert!(order_id > 0, "successful place_order returns nonzero id");

        // The fill from the cross should have landed in bridge's pending_fills
        // via the FILL_SINK install_fill_sink path inside LiveRethEvmBridge::new.
        assert_eq!(
            bridge.pending_fill_count(),
            1,
            "precompile-placed cross must populate bridge.pending_fills (Stage 9c+)"
        );

        // CLOB_PLACE_ORDER's address constant is part of the public surface
        // (and registered into the precompiles set by `openhl_precompiles`);
        // touch it here so the import resolves and the constant stays load-bearing.
        let _ = CLOB_PLACE_ORDER;

        // Clean up the globals so other tests can start clean.
        uninstall_fill_sink();
        uninstall_clob();

        // Drop the node handle explicitly to make the lifecycle visible
        // in the trace.
        drop(handle);
    }
```

The test is long but every section has a job. Let me walk through the four phases.

### Phase A — Setup (`uninstall` + `NodeBuilder`)

```rust
        uninstall_clob();
        uninstall_fill_sink();

        let runtime = Runtime::test();
        let chain_spec = dev_chain_spec();
        let node_config = NodeConfig::test().dev().with_chain(chain_spec.clone());

        let handle = NodeBuilder::new(node_config)
            .testing_node(runtime)
            .with_types::<EthereumNode>()
            .with_components(EthereumNode::components().executor(OpenHlExecutorBuilder))
            .with_add_ons(EthereumAddOns::default())
            .launch()
            .await
            .expect("launch of custom-EVM node failed");
```

**Why both `uninstall_clob` AND `uninstall_fill_sink` at the start?** Other tests may have left either or both installed. If we ran in the same `cargo test` invocation after, say, L9's `place_order_routes_fills_to_installed_sink`, the sink would still be set to some stray Arc. We can't trust prior state.

**Why is this a `tokio::test(flavor = "multi_thread", worker_threads = 4)`?** Reth's `NodeBuilder.launch()` is async; it spawns background tasks (executor, RPC, mining, etc.). Single-threaded tokio would block on these. **Multi-thread + 4 workers is the canonical Reth integration-test setup.** Less = test stalls; more = wasteful in CI.

**The `NodeBuilder` chain is identical to L3's `reth_dev_node_with_openhl_executor` test.** Same builder methods, same order, same `OpenHlExecutorBuilder` plug-in. Reusing the proven sequence keeps the new test's failure surface focused on what *L10* introduces: the bridge + precompile composition, not the Node bootstrap itself.

> 🛑 **Anti-fluency.** "Should we extract a `spawn_custom_evm_test_node()` helper since this is the second time we've done this chain?" **No, deliberately not.** Reth's `NodeAdapter` (the type returned by `launch().await`) is generic over ~5 phantom parameters. Naming it in a helper's return type tangles every caller in those generics. **Inline composition is uglier to write once but cleaner to read at every call site.** Helpers can be added later if a third call site emerges and the type complexity has stabilized.

### Phase B — Bridge construction + bridge → precompile read

```rust
        let bridge = LiveRethEvmBridge::new(handle.node.provider.clone(), chain_spec);

        assert_eq!(current_best_bid(), None);

        bridge.submit_order(Order {
            id: OrderId(1),
            account: AccountId(42),
            side: Side::Buy,
            qty: Qty(33),
            order_type: OrderType::Limit { price: Price(200) },
        });

        let best = current_best_bid().expect("CLOB has bids after submit_order");
        assert_eq!(best.0, Price(200));
        assert_eq!(best.1, Qty(33));
```

`LiveRethEvmBridge::new(...)` does five things internally:
1. Creates `Arc<Mutex<Book>>` (the CLOB).
2. Creates `Arc<Mutex<Vec<Fill>>>` (the fills buffer).
3. **Calls `install_clob`** — the precompile module's `CLOB_STATE` global now points to the bridge's Book.
4. **Calls `install_fill_sink`** — the `FILL_SINK` global now points to the bridge's fills buffer.
5. Returns `Self { clob, pending_fills, ... }`.

After this single call, the bridge and the precompile module are wired together via two globals.

The pre-condition `current_best_bid() == None` proves we started from a clean state (Phase A's uninstalls worked). The submit_order produces a resting bid in the bridge's Book. The post-condition `current_best_bid() == Some(...)` proves the precompile sees the bridge's write — they share the same Arc.

**This is the Stage 9d proof.** A smart contract calling `STATICCALL(0x...0c1b)` through this exact node would route via the registered precompile → through `current_best_bid()` → through `CLOB_STATE` → into the bridge's Book → see this bid.

### Phase C — Stage 9c+ extension: precompile → bridge fills

```rust
        assert_eq!(
            bridge.pending_fill_count(),
            0,
            "fills empty before crossing taker via precompile"
        );

        let mut calldata = [0u8; 128];
        calldata[24..32].copy_from_slice(&7u64.to_be_bytes());
        calldata[63] = 1;
        calldata[88..96].copy_from_slice(&200u64.to_be_bytes());
        calldata[120..128].copy_from_slice(&33u64.to_be_bytes());

        let r = crate::precompiles::place_order(&calldata, 100_000, 0)
            .expect("place_order must not error");
        let order_id_bytes = &r.bytes[24..32];
        let order_id = u64::from_be_bytes(order_id_bytes.try_into().unwrap());
        assert!(order_id > 0, "successful place_order returns nonzero id");

        assert_eq!(
            bridge.pending_fill_count(),
            1,
            "precompile-placed cross must populate bridge.pending_fills (Stage 9c+)"
        );
```

This phase is what Stage 9c+ added (commit `d19ba1b`). The first call to `place_order` simulates a smart contract calling the write precompile. The crossing Sell @ 200 qty 33 hits the resting Buy @ 200 qty 33 — exactly one Fill produced.

**The hand-built calldata is identical to what `place_order_calldata` produces.** We inline it here for explicitness — every byte position is annotated, so a reader can trace the ABI layout without jumping to a helper. **For integration tests proving end-to-end correctness, calldata explicitness matters more than DRY.**

`pending_fill_count()` jumped from 0 to 1. **The Fill flowed through 5 indirections to get there:**

```
place_order
  → submit_result.fills (Vec<Fill>)
  → FILL_SINK.read() → Some(sink: Arc<Mutex<Vec<Fill>>>)
  → sink.lock().extend(...)
  → same Arc as bridge.pending_fills
  → bridge.pending_fill_count() sees the increment
```

That's the Stage 9c+ thesis, end-to-end.

> 🛑 **Predict.** Look at the `crate::precompiles::place_order(&calldata, ...)` call. **Why call the function directly instead of going through `Precompiles::get(...).execute(...)`?** Hint: we did both in L3's unit tests.

(Answer: **Two reasons.** (1) The Stage 9c+ commit's design is to call `place_order` directly — it's `pub(crate)` for exactly this. Going through the registry would require constructing a `Precompiles` set, knowing which hardfork we're at, etc. — extra plumbing for no additional proof. (2) L3 already proved the registry path works. **L10's job is to prove the bridge ↔ precompile module wiring, not the registry path.** Direct call narrows the test's scope.)

### Phase D — Cleanup

```rust
        let _ = CLOB_PLACE_ORDER;

        uninstall_fill_sink();
        uninstall_clob();

        drop(handle);
```

Three small things:

1. **`let _ = CLOB_PLACE_ORDER;`** — touches the address constant to prove it's load-bearing. **Why?** Because the test imports `CLOB_PLACE_ORDER` but doesn't otherwise use it (the calldata is hand-built without going through the precompile address). Without this line, clippy would warn `unused_imports`. The `let _ = ...` is a documented usage that satisfies the linter and signals "this constant exists; don't delete it."
2. **Reverse-order uninstall.** Install order was clob → fill_sink. Uninstall is fill_sink → clob. **Reverse-order cleanup is the canonical Rust pattern** (mirrors RAII drop order). Idiomatic, low-cost.
3. **`drop(handle)` explicit.** Rust would drop the handle at end-of-scope anyway. But naming it makes the node-lifecycle visible in the test's trace — readers see "node ends here." For an integration test that bootstraps Reth, the lifecycle moments are worth flagging.

## Test

```bash
cargo test -p openhl-evm --release bridge_against_custom_evm
```

Output (after ~5 seconds of Reth bootstrap + test execution):

```
running 1 test
test live_node::tests::bridge_against_custom_evm_node_shares_clob_with_precompile ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 47 filtered out
```

To run the full crate's tests:

```bash
cargo test -p openhl-evm --release
```

```
running 48 tests
... 48 tests pass ...

test result: ok. 48 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

One more than L9 (47 → 48). **Now 47 unit tests + 1 integration test all green.**

Common errors and fixes:

- **`error[E0603]: function 'place_order' is private`** — you forgot Step 1. Add `pub(crate)` to the `fn place_order` signature.
- **`error[E0277]: 'NodeBuilder<...>' does not satisfy the trait...`** — typo in the NodeBuilder chain. Compare to L3's `reth_dev_node_with_openhl_executor` test — same chain, same method order.
- **Test hangs forever** — `worker_threads = 1` or single-threaded tokio. Use `flavor = "multi_thread", worker_threads = 4`.
- **`current_best_bid()` returns `None` after submit_order** — `install_clob` wasn't actually called inside `bridge.new()`. Re-check L4's bridge changes. Or: another test running in parallel did `uninstall_clob()` mid-execution. Verify the TEST_SERIALIZER pattern at all global-touching tests (most should have it from L5).
- **`pending_fill_count` returns 0 after place_order** — likely `install_fill_sink` wasn't called inside `bridge.new()` (L9 Step 7), or `place_order`'s fill-routing block has a bug (L9 Step 3 — verify the `drop(book)` comes before the sink lock).
- **`assertion failed: bridge.pending_fill_count() == 1`** with count = 0 — the place_order's submit returned 0 fills, so nothing was pushed. Verify your hand-built calldata: account=7, side=1 (Sell), price=200, qty=33. Specifically check `calldata[63] = 1` for side=Sell; if it's 0 the order is a Buy and won't cross.

## Design reflection

Five points:

1. **Integration tests catch wiring bugs unit tests can't.** All the pieces have unit tests proving they work in isolation. L10 is the first test that proves they work *composed*. The wiring between L3's NodeBuilder, L4's install_clob, L9's install_fill_sink, and the running Reth process — that wiring has no unit test. **One integration test for end-to-end + many unit tests for piece-correctness is the canonical mix.**

2. **`pub(crate)` is the right visibility for cross-module tests.** Adding `pub` widens API surface. Adding `#[cfg(test)] pub(crate)` adds ceremony for no benefit (visibility is compile-time only). **`pub(crate)` says "inside this crate, anyone can call it; outside, no."** Exactly what cross-module testing wants.

3. **Test calldata: explicit > DRY.** The hand-built `[u8; 128]` calldata in Phase C is what `place_order_calldata` would produce — but inlining it with byte-position comments makes the ABI layout visible at the call site. **For tests proving system-level correctness, every byte position should be a learnable artifact.** Helpers hide; integration tests reveal.

4. **No helper for "spawn-bridge-with-custom-EVM-node."** Reth's `NodeAdapter` generic complexity makes return-type-naming painful. Inline composition is uglier to write once but easier to read. **The cost of premature abstraction in test code is the same as in production: more code paths to debug.** Wait for the third caller before abstracting.

5. **The honest deferred: RPC `eth_call` roundtrip.** This test doesn't go through Reth's RPC server. A real Solidity contract calling `clob_read_best_bid` via JSON-RPC would exercise additional plumbing (RPC server, transaction simulation, etc.) that we haven't proven. **We're not proving Reth works; we're proving openhl plugs into Reth correctly.** The RPC layer is Reth's responsibility; testing it again would validate Reth, not openhl.

## Answer key

```bash
cd ~/code/openhl-reference
git checkout d19ba1b
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
```

After L10, both diffs should be **empty**. Your code matches the head of Stage 9c+ (the Stage 9d test extended with the 9c+ extension). **Stage 9 is now closed.** All openhl Stage 9 milestones — 9a (custom EVM bootstraps), 9b (live CLOB read), 9c (write path), 9c+ (fills route to bridge), 9d (bridge integration) — are reproduced in this course.

Return:

```bash
git checkout main
```

## Common questions

**Q: Does this test cover the RPC path? E.g., a Solidity contract using web3.js to call `clob_read_best_bid`?**
No. The test calls precompiles directly via Rust — `crate::precompiles::place_order(...)` and `current_best_bid()`. The RPC path (JSON-RPC server → eth_call → revm dispatch → our precompile) is additional plumbing that's Reth's responsibility. **We trust Reth to handle the RPC layer correctly.** If we tested it, we'd be testing Reth, not openhl. Out of scope.

**Q: What if multiple `NodeBuilder.launch()` calls happen in parallel (e.g., parallel tests)?**
Each `launch()` produces a separate Reth process state, but they all share the **process-global** `CLOB_STATE` and `FILL_SINK`. **That's why this test calls `uninstall_clob` + `uninstall_fill_sink` at start AND end** — parallel tests can race on the globals. The `TEST_SERIALIZER` pattern from L5 doesn't reach into this test because it's in `live_node.rs`'s test module, not the precompile's. **For full safety we'd need a cross-module serializer, but at v0 the test happens to be the only one in its module that touches both globals.**

**Q: Why is `chain_spec.clone()` needed?**
`NodeConfig::dev().with_chain(chain_spec.clone())` consumes one clone for the node config. `LiveRethEvmBridge::new(provider, chain_spec)` consumes the original (the bridge stores it as an Arc). **Cloning a `ChainSpec` is cheap** (it's typically wrapped in Arc internally) — and the alternative would be ownership wrangling that adds cognitive load to the test. Clone is the right tool here.

**Q: Couldn't we just submit a marketable order via the bridge instead of the precompile in Phase C?**
We could — `bridge.submit_order(Sell @ 200 qty 33)` would also produce one fill. But that would test the **bridge-side** write path, which is course 7's territory. **L10 specifically wants to test the precompile-side write path** through the FILL_SINK to the bridge's pending_fills. Calling `place_order` directly is what proves Stage 9c+'s wiring.

## Course milestone — what's now proven

After L10:

- **Module 1**: `OpenHlEvmFactory` + `OpenHlExecutorBuilder` plugged into Reth via `NodeBuilder`. Custom EVM boots with our precompile registered.
- **Module 2**: `read_best_bid` reads live CLOB state via the `CLOB_STATE` global. Smart contracts see real orderbook data.
- **Module 3**: `place_order` writes to live CLOB state. The EVM↔CLOB surface is bidirectional via `0x...0c1b` (read) and `0x...0c1c` (write).
- **Module 4**: Fills from precompile-placed orders flow into the bridge's `pending_fills` via the `FILL_SINK` global. EVM-side trades become payload fills.

47 unit tests prove each piece. **1 integration test proves the composition.** A smart contract calling either precompile through this Reth node sees and writes to the same Book the bridge orchestrates.

## Next lesson (L11)

L11 is the capstone — **no new code**. We reflect on what's been built, name the deferred items (RPC roundtrip, multi-validator OrderId, transaction-scoped state shadowing, staticcall mutation refusal), and list the next-stage extensions (additional read precompiles for best_ask/depth/mid-price, a clob_cancel_order precompile, fills-as-EVM-events). The L11 lesson is for cementing the mental model and seeing the architecture as a whole.
````

---

## Seed-file slot

L10 lands in Module 4 (Bridge integration) at sortOrder 1:

```typescript
{
  title: 'Lesson 10 — Course milestone — the full stack in a real Reth node',
  slug: 'openhl-precompiles-bridge-integration-en',
  type: 'CONTENT',
  sortOrder: 1,
  duration: 45,
  xpReward: 90,
  content: `# Lesson 10 — Course milestone — the full stack in a real Reth node\n\n...`
},
```

## SHA pinning discipline

L10 cites both `2f796c3` (Stage 9d initial test) and `d19ba1b` (Stage 9c+ extension). After L10, both `precompiles/mod.rs` and `live_node.rs` match Stage 9c+ exactly. Stage 9 is closed.

## Style review notes (self-critique before paste)

- **§Goal frames L10 as the course-level milestone** — proving end-to-end composition in a real Reth process.
- **§Predict on "why integration test"** earns the wiring-assertion framing.
- **§Step 1 on `pub(crate)`** explains the visibility choice in 3 reasons.
- **§Anti-fluency on `#[cfg(test)] pub(crate)`** preempts the over-careful annotation reflex.
- **§Phase A on `tokio multi_thread`** explains the canonical Reth integration-test setup.
- **§Anti-fluency on "no helper for NodeBuilder chain"** retrospects the design decision from Stage 9d's commit message.
- **§Phase C's "5 indirections"** unpacks the Stage 9c+ thesis in concrete terms.
- **§Phase D on `let _ = CLOB_PLACE_ORDER`** documents the unused-import-touch idiom.
- **§Design reflection 5 on the deferred RPC path** is honest about what's *not* proven.
- **§Course milestone summary** — what's proven after L10 — is the celebration moment for the course as a whole.
- **L11 preview** — capstone, no new code — names what L11 will do conceptually.
