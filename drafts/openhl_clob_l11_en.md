# Building OpenHL CLOB — L11 draft (EN) — build-along

> Drafted against openhl SHA `428cc26` (Stage 8d — CLOB fills flow into bridge payloads).
> Course: `building-openhl-clob-en` (track: `reth-l1-architect`).

---

## L11 — `openhl-clob-integration-test-en`

- **Module:** 4 (Bridge integration), sortOrder 2 within module
- **Course-level sortOrder:** 10 (lesson 11 of 12)
- **Duration:** 30 min
- **XP reward:** 70
- **Type:** CONTENT

### Content

````markdown
# Lesson 11 — `clob_fills_flow_into_payload` — the milestone test

## Goal

By the end of this lesson:

```bash
cargo test -p openhl-evm clob_fills_flow_into_payload --release
```

…passes. **This is the milestone of Course 7.** A real fill, produced by the matching engine you built in L1-L8, flows through `LiveRethEvmBridge::submit_order` → `pending_fills` buffer → `LiveRethEvmBridge::build_payload` drain → into a payload that consensus would commit. The test exercises **every piece** of the integration from L9-L10 against a **live Reth node**.

You'll have written one new test:

- **`clob_fills_flow_into_payload`** — ~100 LOC. Bootstraps a real `EthereumNode`, exercises 8 assertions across an 8-step scenario.

The test scenario:

1. Build an empty payload before any orders → verify zero fills attached.
2. Submit a maker bid @ 100 → verify it rests (no immediate fill).
3. Submit a crossing taker sell @ 100 → verify exactly 1 fill produced, buffered.
4. Build the next payload → verify the fill drains into it.
5. Verify `pending_fill_count` resets to 0.
6. Re-check the earlier (empty) payload → verify drain was **forward-only** (no retroactive fill).

After L11, Course 7's mainline is complete. L12 wraps up with a capstone.

## Recap

After L10, your `LiveRethEvmBridge`:

- Has `clob: Mutex<Book>` and `pending_fills: Mutex<Vec<Fill>>` fields (L9).
- Has `submit_order`, `payload_fills`, `pending_fill_count` methods (L9).
- `build_payload` drains `pending_fills` into the new payload's third tuple element (L10).

**Nothing yet proves this works end-to-end.** L11 writes that proof.

## Plan

One test, added to the existing `#[cfg(test)] mod tests` block in `crates/evm/src/live_node.rs`. The test:

1. **Bootstrap a Reth node** — same pattern course 6's `live_bridge_builds_on_real_genesis` used. We need the provider for parent lookups.
2. **Construct `LiveRethEvmBridge::new(provider, chain_spec)`** — note: no `with_engine_handle` this time. We don't need to drive forkchoice for this test; the matching pipeline doesn't depend on engine_handle.
3. **Assert empty initial state** — `pending_fill_count() == 0`.
4. **Build an empty payload** (no orders submitted) — verify `payload_fills(id)` returns `Some(vec![])`.
5. **Submit a maker** — `Order { id: 1, side: Buy, qty: 10, OrderType::Limit { price: 100 } }`. Verify rests, no immediate fill.
6. **Submit a crossing taker** — `Order { id: 2, side: Sell, qty: 10, OrderType::Limit { price: 100 } }`. Verify 1 fill produced.
7. **Build the next payload** — verify `payload_fills(next_id) == Some([the_fill])`.
8. **Verify the drain semantic** — `pending_fill_count() == 0`, and the *earlier* payload's fills are still empty (no retroactive update).

This is the integration test for everything Course 7 built.

> 🛑 **Predict.** Before scrolling: the maker bid is at price 100, qty 10. The taker is a Sell at price 100, qty 10. **Will the resulting fill price be 100, or could it be different?** What's the rule that determines the fill price when two orders cross at exactly the same price?

(Answer: the fill happens at the **maker's** price — `Price(100)` in this case. From L4: "the fill price is the *resting* order's price (the maker's). Limit-buyer at $101 matching a resting limit-seller at $100 fills at $100 (maker's price); the buyer wins." When both orders are at the same price, the rule still applies — maker resting at 100, taker matches at 100. **The "price-time priority" rule says: maker price (price priority) + first-come within a price level (time priority). Here, no time priority disambiguation is needed because the maker is the only order at 100.**)

## Walk-through

### Step 1: Add the test header

In `crates/evm/src/live_node.rs`, scroll to the `#[cfg(test)] mod tests { ... }` block. The block already has `live_bridge_builds_on_real_genesis` (from course 6's L12-L14) and `commit_sends_forkchoice_to_engine_when_handle_installed` (from L14).

Append a new test at the end (just before the closing `}` of `mod tests`):

```rust
    /// Stage 8d end-to-end: CLOB → bridge → payload.
    /// A maker rests, a taker crosses it, the fill flows into the next
    /// `build_payload`'s stored fills. The empty-fill `build_payload` that
    /// preceded the orders proves the drain semantics — fills accumulate
    /// AFTER they're built, not retroactively included.
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn clob_fills_flow_into_payload() {
        use openhl_clob::{AccountId, OrderId, OrderType, Price, Qty, Side};

        // ... body goes in Steps 2-7 ...
    }
```

Two things to notice in the test header:

- **`#[tokio::test(flavor = "multi_thread", worker_threads = 4)]`** — same as course 6's integration tests. We need a multi-threaded tokio runtime because Reth's `EthereumNode` spawns several background tasks (RPC, payload builder, etc.). The 4-worker setup gives them room.
- **`use openhl_clob::{AccountId, OrderId, OrderType, Price, Qty, Side};`** — imports the types we need from L1's newtype set. The `Order` and `Fill` types are already in scope from the `super::*` at the top of `mod tests`.

> 🛑 **Anti-fluency.** "Why import these types inside the test function instead of at the top of `mod tests`?" **To keep the test's dependencies visible at the test site.** If a future reader is debugging this test, they can see at a glance which types are involved. The cost is one `use` statement per test that needs them; the benefit is that each test reads as a self-contained scenario. For tests outside `mod tests` (in real source code), you'd put imports at the top — but tests are special: they're documentation for what the system does, and inline imports make the documentation tighter.

### Step 2: Bootstrap a Reth node

Inside the test function body:

```rust
        let runtime = Runtime::test();
        let chain_spec = dev_chain_spec();
        let node_config = NodeConfig::test().dev().with_chain(chain_spec.clone());

        let NodeHandle {
            node,
            node_exit_future: _,
        } = NodeBuilder::new(node_config)
            .testing_node(runtime)
            .node(EthereumNode::default())
            .launch_with_debug_capabilities()
            .await
            .expect("launch failed");
```

This is the **same pattern** as course 6's `live_bridge_builds_on_real_genesis` test. We use `launch_with_debug_capabilities()` (not `.with_add_ons(EthereumAddOns::default()).launch()`) because we don't need the engine handle this time — we're only testing the CLOB-to-payload data flow, not commit-to-forkchoice.

`Runtime::test()`, `dev_chain_spec()`, `NodeConfig::test().dev()`, and the builder chain are all from course 6 L11/L12. If you need a refresher, scroll up in the test module.

### Step 3: Pull the genesis hash + construct the bridge

```rust
        let genesis_hash_b256 = node
            .provider
            .block_hash(0)
            .expect("provider call failed")
            .expect("provider has no genesis");

        let bridge = LiveRethEvmBridge::new(node.provider.clone(), chain_spec);
```

Two lines. The first pulls the live genesis block hash from the provider (same as course 6 L12). The second constructs the bridge — note **no `.with_engine_handle(...)`** chain on the end. The fields we care about (`clob`, `pending_fills`) are independent of `engine_handle`.

The `node.provider.clone()` is cheap because `node.provider` is `Arc`-backed under the hood.

### Step 4: Assert empty initial state

```rust
        // Empty initial state — no orders submitted, no fills pending.
        assert_eq!(bridge.pending_fill_count(), 0);
```

The simplest check. After `new()`, `pending_fills: Mutex::new(Vec::new())` is empty. `pending_fill_count()` reads its length. **If this assertion fails**, your L9 `new()` doesn't initialize `pending_fills` correctly.

### Step 5: Build the empty payload (no orders yet)

```rust
        // First payload built with no orders → no fills attached.
        let attrs = PayloadAttrs {
            timestamp: 1,
            fee_recipient: [0u8; 20],
            prev_randao: [0u8; 32],
        };
        let empty_id = bridge
            .build_payload(BlockHash(genesis_hash_b256.0), attrs.clone())
            .await
            .expect("build_payload failed");
        let empty_fills = bridge
            .payload_fills(empty_id)
            .expect("payload exists");
        assert!(empty_fills.is_empty(), "no orders submitted yet, fills must be empty");
```

Call `build_payload` with the genesis as the parent. The bridge calls L10's `std::mem::take` on `pending_fills` — which is empty — so the drain returns `Vec::new()`. The resulting payload has empty fills.

We bind the returned `PayloadId` to `empty_id` because **Step 7 needs to re-check this payload's fills later** to prove drain is forward-only.

The `attrs.clone()` is because we'll reuse `attrs` for the second `build_payload` call below. Both payloads use the same attrs (timestamp 1, zero fee_recipient, zero prev_randao) for simplicity — in production code, each payload would have a fresh timestamp.

### Step 6: Submit maker + taker, verify the fill

```rust
        // Submit a resting limit BID @ 100 from account 1, then a crossing
        // SELL @ 100 from account 2. This produces exactly one fill.
        let maker = Order {
            id: OrderId(1),
            account: AccountId(1),
            side: Side::Buy,
            qty: Qty(10),
            order_type: OrderType::Limit { price: Price(100) },
        };
        let taker = Order {
            id: OrderId(2),
            account: AccountId(2),
            side: Side::Sell,
            qty: Qty(10),
            order_type: OrderType::Limit { price: Price(100) },
        };

        let maker_result = bridge.submit_order(maker);
        assert!(maker_result.fills.is_empty(), "maker rests, no immediate fill");
        assert_eq!(bridge.pending_fill_count(), 0);

        let taker_result = bridge.submit_order(taker);
        assert_eq!(taker_result.fills.len(), 1, "taker should cross the maker");
        assert_eq!(bridge.pending_fill_count(), 1, "fill buffered in pending");
```

Two orders, two submits, four assertions.

**First submit (maker)**:
- `submit_order(maker)` calls `book.submit(maker)`. The book is empty, so the maker rests as a bid at price 100.
- `maker_result.fills.is_empty()` — no immediate fill (book had no asks to cross).
- `pending_fill_count() == 0` — nothing buffered, nothing matched.

**Second submit (taker)**:
- `submit_order(taker)` matches against the resting bid at 100. The match produces one fill (10 units @ 100, from order 1 to order 2).
- `taker_result.fills.len() == 1` — the matcher returned the fill.
- `pending_fill_count() == 1` — the fill was pushed to `pending_fills` by `submit_order`'s post-match append (the `if !result.fills.is_empty() { ... }` block from L9 Step 6).

**The maker_result + taker_result pair is the test's instrumentation**. By checking both, we verify (a) the maker really rested (didn't accidentally cross something), and (b) the taker really crossed (didn't accidentally rest).

### Step 7: Build the next payload, verify drain + drain semantics

```rust
        // Build the NEXT payload — it should drain the buffered fill.
        let next_id = bridge
            .build_payload(BlockHash(genesis_hash_b256.0), attrs)
            .await
            .expect("build_payload failed");
        let next_fills = bridge
            .payload_fills(next_id)
            .expect("payload exists");
        assert_eq!(next_fills.len(), 1, "fill must be attached to the payload");
        assert_eq!(next_fills[0].price, Price(100));
        assert_eq!(next_fills[0].qty, Qty(10));
        assert_eq!(next_fills[0].maker_order_id, OrderId(1));
        assert_eq!(next_fills[0].taker_order_id, OrderId(2));

        // After draining, pending fills must be empty.
        assert_eq!(bridge.pending_fill_count(), 0);

        // The earlier (empty) payload's fills must still be empty —
        // draining is forward-only, never retroactive.
        let empty_fills_again = bridge
            .payload_fills(empty_id)
            .expect("earlier payload exists");
        assert!(empty_fills_again.is_empty(), "earlier payload not retroactively filled");
    }
```

Three sets of assertions:

**First set (the drain itself)**: `build_payload` is called again — same parent (genesis) and same attrs. L10's `std::mem::take` runs and gets the fill that's in `pending_fills`. The fill is stored in the new payload's third tuple element. `payload_fills(next_id)` returns `Some(vec![the_fill])`. We check:
- `next_fills.len() == 1` — exactly one fill, not zero (drain didn't fire) and not two (no spurious fills).
- `next_fills[0].price == Price(100)` — the maker's price (price priority).
- `next_fills[0].qty == Qty(10)` — full fill of both sides.
- `next_fills[0].maker_order_id == OrderId(1)` — maker is order 1 (the resting bid).
- `next_fills[0].taker_order_id == OrderId(2)` — taker is order 2 (the crossing sell).

**Second set (drain emptied the buffer)**: `pending_fill_count() == 0` — the drain replaced the buffer with `Vec::default()`. This is the second half of `mem::take`'s atomicity.

**Third set (forward-only)**: `payload_fills(empty_id)` — the FIRST payload's fills. **Even though we did drain into the second payload**, the first payload's stored fills are *unchanged* from when it was built. This is the load-bearing assertion of L11: **drain doesn't retroactively modify earlier payloads**.

Each payload is a snapshot of fills at the moment of its build. If we drained the first payload retroactively (which would be a bug), the test would fail here.

> 🛑 **Anti-fluency.** "Why does the test check `payload_fills(empty_id)` *after* `payload_fills(next_id)`? Couldn't it check `empty_id` first?" **The ordering matters because we're testing time-invariance.** We check `next_id` first to **establish** that `next_id` has 1 fill and `pending_fill_count` is 0. Then we check `empty_id` to **prove** that `next_id`'s drain didn't reach back into `empty_id`. If we checked `empty_id` first, we'd only prove "the empty payload has no fills" — which we already knew from Step 5. Checking after the drain proves "the earlier payload still has no fills *after a later drain happened*." **The temporal ordering of assertions matters when proving time-invariance.**

## Test

```bash
cargo test -p openhl-evm clob_fills_flow_into_payload --release
```

After ~30 seconds (incremental compile + node bootstrap):

```
running 1 test
test live_node::tests::clob_fills_flow_into_payload ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

To run all tests:

```bash
cargo test -p openhl-evm --release
```

Now 39 tests pass (38 from course 6 + 1 from L11).

The test takes about 2.5 seconds wall-clock (Reth node bootstrap + 2 small `build_payload`s + a few CLOB submits). Most of that is the Reth bootstrap; the actual matching + drain is microseconds.

Common errors and fixes:

- **`assert!(empty_fills.is_empty())` fails** — your bridge isn't initializing `pending_fills` as empty. Check L9 Step 5: `pending_fills: Mutex::new(Vec::new())`.
- **`assert_eq!(taker_result.fills.len(), 1)` fails with 0** — the orders aren't actually crossing. Check that maker is `Side::Buy` and taker is `Side::Sell` (or vice versa), and both have price 100. A common bug: both orders are `Side::Buy`, in which case the second order doesn't match — it rests too.
- **`assert_eq!(next_fills.len(), 1)` fails with 0** — your L10 drain isn't working. Check that `build_payload` calls `std::mem::take(&mut *self.pending_fills.lock()...)` and inserts the result, not `Vec::new()`.
- **`assert!(empty_fills_again.is_empty())` fails** — your drain is retroactively modifying earlier payloads. This is unlikely with `std::mem::take` (which only writes to the new payload), but could happen if you accidentally used `pending_fills.clone()` instead and then mutated the original.
- **Test panics with "provider has no genesis"** — the node bootstrap failed before reaching the test logic. Check `dev_chain_spec()` is producing a valid genesis. Run `cargo test -p openhl-evm live_bridge_builds_on_real_genesis` first to verify the Reth setup is working.

## Design reflection

Three load-bearing decisions encoded here:

1. **The test verifies all three pipeline stages in one scenario.** `submit_order` works (Step 6), `build_payload` drains (Step 7's first assertion set), and the forward-only invariant holds (Step 7's last assertion). One scenario, three properties. If we'd split this into three tests, each would have to bootstrap a node — slow. **One thorough integration test that covers multiple invariants is cheaper than three narrow tests.**

2. **The forward-only check is what makes this a real integration test.** The first two checks (submit produces fill, build drains it) are obvious from the unit tests. The forward-only check **needs the bridge** — it tests that the bridge's per-payload snapshot mechanism is honest. Production code might have written fills back to old payloads "for completeness"; L11 catches that bug.

3. **Two payloads with the same parent (genesis) is intentional.** In production, the second `build_payload` would use the first decided block as the parent, not genesis. For this test, we don't need to commit anything — we just need two payloads to demonstrate the drain timing. Reusing the genesis as parent simplifies the test and doesn't change what's being verified (the drain mechanism, not the commit flow).

## Answer key

```bash
cd ~/code/openhl-reference
git checkout 428cc26
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
```

After L11, your `live_node.rs` is **functionally complete** matching the reference at `428cc26`. The only differences should be doc-comment wording.

Return:

```bash
git checkout main
```

## Common questions

**Q: Why do we use `launch_with_debug_capabilities()` here but `launch()` (with `.with_add_ons(...)`) in L14 of course 6?**
Different test goals. Course 6 L14 tested `commit → forkchoice_updated` — needed the engine handle, which lives in the AddOns. L11 tests CLOB → payload — doesn't need the engine handle, just the provider. `launch_with_debug_capabilities()` is the shorter setup that includes the provider but skips engine API wiring.

**Q: What's the worst-case fill scenario this test misses?**
Multiple fills per submit (e.g., a Market buy that crosses three price levels at once). The unit tests in L7 (specifically `buy_market_takes_best_ask`) cover that path at the matching-engine level; L11 only exercises a single-fill case to keep the test focused. Adding a multi-fill case to L11 would be a 2-line change (different qty values) but doesn't change what we're proving.

**Q: Can the test run in parallel with other tests?**
Yes — `#[tokio::test]` runs the test in its own runtime, and the bridge + node instances are local to the test. No shared global state. The `worker_threads = 4` setting is per-test, not workspace-wide.

**Q: Why is the maker submitted first and the taker second, not the other way around?**
For symmetry with the typical matching-engine narrative: "the maker rested, the taker crossed it." Order is significant in *time priority* (first-in is filled first within a level), but not in *which side rests*. If you submitted the SELL first, it would rest as an ask; if you then submitted a BUY at the same price, the BUY would cross. The result is the same fill. **The test name "fills flow into payload" is about the data path, not the order of operations.**

## Next lesson (L12)

You have a working CLOB integrated into a real Reth-backed bridge. **L12 is the capstone** — no new code, just:
- A recap of the 11 lessons.
- The list of openhl Stage 8 + 8d functionality you've reproduced.
- What's still scope-cut (precompiles in course 8, funding in course 9, EVM tx encoding in some future course).
- Next steps if you want to keep going (psyto/openhl Stage 9 source code, the Module 3+ build arcs).

A reflection lesson, ~15 min. Then Course 7 is done.
````

---

## Seed-file slot

L11 lands in Module 4 (Bridge integration) at sortOrder 2:

```typescript
{
  title: 'Lesson 11 — clob_fills_flow_into_payload — the milestone test',
  slug: 'openhl-clob-integration-test-en',
  type: 'CONTENT',
  sortOrder: 2,
  duration: 30,
  xpReward: 70,
  content: `# Lesson 11 — \`clob_fills_flow_into_payload\` — the milestone test\n\n...`
},
```

## SHA pinning discipline

Same `428cc26`. After L11, the file matches the reference modulo doc comments. The course's mainline pipeline is complete.

## Style review notes (self-critique before paste)

- **§Plan's "this is the milestone of Course 7"** is the conceptual hook for L11. The course has been building toward this moment — submit goes in, build_payload comes out, fill flows through, asserted end-to-end.
- **§Predict on fill price** (maker's price, not taker's) reinforces L4's price-priority rule, now in the integration context.
- **§Step 7's three assertion sets** (drain itself, buffer emptied, forward-only) frame the test's structure. The forward-only check is the load-bearing one — it's what makes this a real integration test instead of a unit test you happen to run with a Reth bootstrap.
- **§Anti-fluency about temporal ordering of assertions** explains *why* we check `next_id` first then `empty_id`, which is non-obvious — "we're testing time-invariance, so order matters."
- **§Design reflection's "one thorough vs three narrow"** generalizes — applies to any integration test design decision.
- **§Common questions about parallel tests** preempts a real worry developers have when adding new Reth-bootstrap tests.
- **L12 is positioned as a capstone**, no new code — Course 7 is then complete.
