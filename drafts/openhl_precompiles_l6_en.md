# Building OpenHL Precompiles — L6 draft (EN) — build-along

> Drafted against openhl SHA `b635ef7` (Stage 9b — live CLOB state in the CLOB read precompile).
> Course: `building-openhl-precompiles-en` (track: `reth-l1-architect`).

---

## L6 — `openhl-precompiles-live-state-proof-en`

- **Module:** 2 (Read precompile), sortOrder 2 within module
- **Course-level sortOrder:** 5 (lesson 6 of 12)
- **Duration:** 30 min
- **XP reward:** 60
- **Type:** CONTENT
- **Milestone:** Module 2 complete

### Content

````markdown
# Lesson 6 — Module 2 milestone — proving the round-trip

## Goal

By the end of this lesson:

```bash
cargo test -p openhl-evm --release
```

…passes 43 tests (one new). The new test is `read_best_bid_returns_live_state_when_clob_installed`. It does what every prior test has stopped short of: **install a CLOB with a known bid, call the precompile, observe that the precompile's output bytes encode the bid's price and qty.**

This is the milestone. The full chain — `bid placed on CLOB → bridge writes through Mutex → precompile reads via global → encodes 64-byte ABI → returns to caller` — is finally exercised end-to-end. After L6:

- Module 2 (Read precompile) is **complete**: a Solidity contract that issues `STATICCALL(0x...0c1b)` will receive live CLOB state.
- The pattern (precompile-reads-from-global-Arc) is proven, ready to replicate for additional read precompiles (best_ask, depth, mid-price, etc.) in future stages.
- Module 3 (Write precompile, L7-L9) builds on the same infrastructure but in the opposite direction: precompile **writes** to CLOB state.

## Recap

After L5:

- `read_best_bid` calls `current_best_bid()` (live path).
- L3's two tests assert the **uninstalled** semantic — zero output when no CLOB.
- `TEST_SERIALIZER` is in place.
- **But no test ever installs a CLOB with non-empty state and observes the values flowing through.** The wire is hot but unmeasured.

L6 measures the wire.

## Plan

One edit to `crates/evm/src/precompiles/mod.rs`, inside the `#[cfg(test)] mod tests` block: add a new test function.

That's it. No production code changes. **L6 is a pure test addition** — and it's the most important test in the course.

The test's structure:

1. **Setup** — take `TEST_SERIALIZER`. (No `uninstall_clob()` at start; we install our own immediately.)
2. **Build a CLOB** — `Arc::new(Mutex::new(Book::new()))`.
3. **Rest two bids** — one at price 250 qty 7 (will be the best), one at price 240 qty 99 (lower price, must NOT be picked despite the larger qty).
4. **Install the CLOB** — `install_clob(book)`.
5. **Call the precompile directly** — `read_best_bid(&[], 100_000, 0)`.
6. **Decode and assert** — price=250 (not 240), qty=7 (not 99 — the larger qty at the wrong level is the trap).
7. **Cleanup** — `uninstall_clob()` at the end (clarity, not safety).

> 🛑 **Predict.** Before scrolling: we'll install a Book with two bids — `(price=250, qty=7)` and `(price=240, qty=99)`. **What does `read_best_bid` return?** Get it right and you've grasped the matching engine's "best price wins" invariant. Get it wrong and the test will catch your misconception.

(Answer: `price=250, qty=7`. **"Best bid" = highest price, not largest qty.** The qty=99 order is parked at a worse price (240); it's not even considered for the best-bid response. This is the classic order-book invariant: price-time priority within a level, price priority across levels. Beginners often think "best = most liquidity" — that's wrong. **Best bid is what a market sell would hit first.** A market sell would hit the 250-bid first because it offers the highest price; only after exhausting the 250-level would it descend to 240.)

## Walk-through

Open `crates/evm/src/precompiles/mod.rs`. Find the existing `#[cfg(test)] mod tests` block.

Verify the imports at the top of the test module include `Order, OrderId, AccountId, OrderType, Price, Qty, Side` (we kept them through L5 specifically for this lesson):

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use alloy_primitives::U256;
    use openhl_clob::{AccountId, Order, OrderId, OrderType, Price, Qty, Side};

    static TEST_SERIALIZER: Mutex<()> = Mutex::new(());

    // ... read_best_bid_returns_zero_when_no_clob_installed (L5)
    // ... openhl_precompiles_registers_clob_address (L3)
    // ... registered_precompile_is_invokable_via_registry (L5)
}
```

If any of `Order`, `OrderId`, `AccountId`, `OrderType`, `Price`, `Qty`, `Side` are missing, add them.

Now add this test. Best location: between the L5 `read_best_bid_returns_zero_when_no_clob_installed` test and the `openhl_precompiles_registers_clob_address` test:

```rust
    /// **Stage 9b end-to-end**: install a CLOB with a known bid, call the
    /// precompile, observe the live data flow through to the EVM-visible
    /// response. This is the moment custom EVM execution reads real
    /// orderbook state.
    #[test]
    fn read_best_bid_returns_live_state_when_clob_installed() {
        let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);

        let book = Arc::new(Mutex::new(Book::new()));
        // Rest a buy @ 250 with qty 7
        book.lock().unwrap().submit(Order {
            id: OrderId(1),
            account: AccountId(42),
            side: Side::Buy,
            qty: Qty(7),
            order_type: OrderType::Limit { price: Price(250) },
        });
        // Rest another buy @ 240 (lower; shouldn't be picked as best bid)
        book.lock().unwrap().submit(Order {
            id: OrderId(2),
            account: AccountId(43),
            side: Side::Buy,
            qty: Qty(99),
            order_type: OrderType::Limit { price: Price(240) },
        });

        install_clob(book);

        let result = read_best_bid(&[], 100_000, 0).expect("precompile must not error");
        let price = U256::from_be_slice(&result.bytes[0..32]);
        let qty = U256::from_be_slice(&result.bytes[32..64]);
        assert_eq!(price, U256::from(250u64), "best bid is the 250 order, not 240");
        assert_eq!(qty, U256::from(7u64), "qty at the best level is 7");

        uninstall_clob();
    }
```

Let me walk through the seven moving parts.

### Step 1: The doc comment

```rust
    /// **Stage 9b end-to-end**: install a CLOB with a known bid, call the
    /// precompile, observe the live data flow through to the EVM-visible
    /// response. This is the moment custom EVM execution reads real
    /// orderbook state.
```

The bold "Stage 9b end-to-end" is a deliberate flag. Anyone grep-searching for milestone tests will find this. Future engineers reading the codebase need to see "this is the proof of the entire feature," not "this is just another unit test."

### Step 2: Take the serializer

```rust
        let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
```

Same pattern as L5's two tests. **No `uninstall_clob()` here** — we're about to install our own; whatever's currently installed gets replaced atomically by `install_clob`. The serializer alone is enough.

### Step 3: Build the Book

```rust
        let book = Arc::new(Mutex::new(Book::new()));
```

`Arc::new(Mutex::new(Book::new()))` is the exact shape `install_clob` expects. We hold one Arc; after `install_clob`, the global holds another.

### Step 4: Rest two bids, intentionally adversarial

```rust
        // Rest a buy @ 250 with qty 7
        book.lock().unwrap().submit(Order {
            id: OrderId(1),
            account: AccountId(42),
            side: Side::Buy,
            qty: Qty(7),
            order_type: OrderType::Limit { price: Price(250) },
        });
        // Rest another buy @ 240 (lower; shouldn't be picked as best bid)
        book.lock().unwrap().submit(Order {
            id: OrderId(2),
            account: AccountId(43),
            side: Side::Buy,
            qty: Qty(99),
            order_type: OrderType::Limit { price: Price(240) },
        });
```

Two orders, not one. The second one (`240, qty=99`) is a **trap for an incorrect implementation**:

- A naive implementation that "returns the largest qty order" would return `(240, 99)`. Fails.
- A naive implementation that "returns the first order submitted" would return `(250, 7)`. Passes — but only by coincidence.
- A naive implementation that "returns the last order submitted" would return `(240, 99)`. Fails.
- The correct implementation that "returns the price level with the highest price, summed qty at that level" returns `(250, 7)`. Passes.

If we had only the `(250, 7)` order, every naive implementation would pass. The `(240, 99)` order distinguishes correctness from coincidence. **Two orders is the minimum that proves "best = highest price, not largest qty."**

> 🛑 **Anti-fluency.** "Why are the order IDs and account IDs different? Wouldn't it be cleaner to reuse them?" **They must be different because `submit()` indexes by `OrderId`**. Re-using `OrderId(1)` for the second order would either fail or silently overwrite the first. Different IDs matter; account IDs are just cosmetic in this test but they hint at the real-world pattern (different traders, different orders).

> 🛑 **Anti-fluency.** "Couldn't `book.lock().unwrap().submit(...)` be split into a `let mut book = book.lock().unwrap();` + two `book.submit(...)` calls for clarity?" **It could and would acquire the lock once instead of twice.** But test code is read more than it's run; we want each `submit` self-contained and obvious. **The 2-microsecond cost is invisible; the readability gain is significant.** Different rule for hot-path production code (acquire once, release once).

### Step 5: Install + invoke

```rust
        install_clob(book);

        let result = read_best_bid(&[], 100_000, 0).expect("precompile must not error");
```

`install_clob(book)` — note we move `book` here. **No `Arc::clone(&book)`** because we don't use `book` again after install. If you wrote `install_clob(Arc::clone(&book))` and then never used `book`, clippy would warn `unused_variable`. The move is correct.

`read_best_bid(&[], 100_000, 0)` — direct unit-style call. We could go through the registry (like `registered_precompile_is_invokable_via_registry` does) but the registry path is already proven in L5. **L6's job is to prove that with a live CLOB installed, the function reads from it.** Direct call is the cleanest assertion of that.

The `&[]` empty calldata is meaningful: `read_best_bid` ignores its input (no parameters needed for "what's the best bid?"). The 100_000 gas is more than enough — we measured `CLOB_BASE_GAS_COST = 500`.

### Step 6: Decode + assert

```rust
        let price = U256::from_be_slice(&result.bytes[0..32]);
        let qty = U256::from_be_slice(&result.bytes[32..64]);
        assert_eq!(price, U256::from(250u64), "best bid is the 250 order, not 240");
        assert_eq!(qty, U256::from(7u64), "qty at the best level is 7");
```

The `from_be_slice` decoder is the inverse of `to_be_bytes` from L5's Step 1. We wrote 8 bytes at `out[24..32]`; the decoder reads 32 bytes from `result.bytes[0..32]` — those leading 24 zero bytes plus 8 value bytes round-trip to the same u64.

The assertion messages **are not decoration**. A bare `assert_eq!(price, U256::from(250u64))` on failure reports "left != right" — which leaves the reader to guess the test's intent. The message "best bid is the 250 order, not 240" tells them *immediately* what assumption is wrong if this fails. **For milestone tests especially, assertion messages double as documentation.**

### Step 7: Cleanup

```rust
        uninstall_clob();
    }
```

**Only test in the module that explicitly uninstalls at the end.** Why this one?

- L5's two zero-output tests don't need to: they start with `uninstall_clob()`, so they don't care what state they leave.
- This test leaves a non-empty CLOB installed. If another test ran *next* (in the same `cargo test` invocation, after `TEST_SERIALIZER` releases) and was meant to assert "no CLOB → zero," it would see our installed book and fail.

The other tests *also* call `uninstall_clob` at the start, so technically this cleanup is redundant. **But making the cleanup explicit in the test that actually installs non-empty state is good hygiene.** It mirrors the "Setup / Exercise / Verify / Teardown" testing convention without needing test-framework support.

## Test

```bash
cargo test -p openhl-evm --release
```

After ~30 seconds:

```
running 43 tests
... 43 tests pass ...

test result: ok. 43 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

One more than L5. The new one is `read_best_bid_returns_live_state_when_clob_installed`. To see just it:

```bash
cargo test -p openhl-evm --release returns_live_state
```

Output:

```
running 1 test
test precompiles::tests::read_best_bid_returns_live_state_when_clob_installed ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 42 filtered out
```

**That `ok` line is the Module 2 milestone.** A custom EVM precompile is reading from a live matching engine state, and the data is round-tripping into EVM-visible output bytes.

Common errors and fixes:

- **`assertion failed: left=240, right=250`** — your implementation's `best_bid_with_qty()` is returning the wrong level. Likely cause: you're iterating `self.bids` in insertion order instead of price-priority order. Check the L4 implementation — the bids `BTreeMap` is keyed by `RevPrice` (reverse-sorted price) so `.iter().next()` gives you the highest price. If you wrote `.iter().next_back()` or used a different data structure, fix it.
- **`assertion failed: left=99, right=7`** — your `best_bid_with_qty()` returned the right price but the wrong qty. Likely cause: you summed all bids across all price levels instead of just the best level. Re-check the L4 code: the closure inside `.map(|(rev_price, queue)| ...)` should sum **only `queue.iter()`** (orders at that one price level), not `self.bids.values().flatten()` (all orders everywhere).
- **`error[E0382]: borrow of moved value: 'book'`** — you called `install_clob(book)` and then tried to use `book` again afterward. Either drop the later use (we don't need it) or use `install_clob(Arc::clone(&book))` if you have a reason to keep using `book` (you don't in this test).
- **`error[E0599]: no method named 'submit' found for...`** — `book.lock()` returns `LockResult<MutexGuard<Book>>`, so you need `book.lock().unwrap().submit(...)`. Missing `.unwrap()` is the typical cause.
- **Test passes in isolation, fails when run alongside others** — `TEST_SERIALIZER` lock not actually held. Check `let _g = TEST_SERIALIZER.lock()...` is the first statement.

## Design reflection

Four points worth pausing on:

1. **The minimum data shape that distinguishes correctness from coincidence is 2 orders.** Adversarial test data — orders specifically designed to expose the wrong implementations — is more valuable than 50 random orders. Each adversarial value pays for a class of bugs.

2. **Direct function call vs. registry dispatch is a deliberate test partitioning.** L5's `registered_precompile_is_invokable_via_registry` proves the function is reachable through the dispatch table. L6 proves the function reads live state. Partitioning these means a failure in one doesn't mask the other. **Tests that bundle dispatch + behavior + state into one assertion are harder to debug when they fail.**

3. **Assertion messages are documentation for future maintainers.** "best bid is the 250 order, not 240" tells the next engineer reading a failure exactly which conceptual assumption is violated. Bare `assert_eq!(price, U256::from(250u64))` would say "left=240 right=250" — true, but it requires the maintainer to reconstruct the test's intent.

4. **One thing at a time.** L6 adds zero production code. The full Module 2 (L4-L6) progression is: plumbing (no behavior change) → swap (behavior changes, no test of new behavior) → exercise (test the new behavior). Each lesson has *one* thing to learn, *one* thing to verify. Mixing them — e.g., swapping + testing in the same lesson — would have made debugging much harder when something inevitably broke at intermediate stages.

## Answer key

```bash
cd ~/code/openhl-reference
git checkout b635ef7
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
```

After L6, your `precompiles/mod.rs` should be **byte-identical** to Stage 9b (modulo your own doc comment phrasing if you went off-script). This is the end of Stage 9b — `git diff b635ef7 -- crates/evm` is empty.

Return:

```bash
git checkout main
```

## Common questions

**Q: Why call `read_best_bid` directly instead of going through `Precompile::execute`?**
Both paths work. Direct call (`read_best_bid(...)`) tests the function in isolation. Registry path (`precompile.execute(...)`) tests the dispatch. **L5's third test already proves dispatch works**; L6 wants to prove behavior reads from the global. Picking the direct path narrows the test to one assertion.

**Q: What if `submit` fails (e.g., duplicate `OrderId`)?**
`Book::submit` (from course 7) returns `()` — it doesn't fail. Internally, if you submit two orders with the same OrderId, the second overwrites the first silently. **This is by design** for the matching engine but it's a footgun for tests. We use `OrderId(1)` and `OrderId(2)` deliberately to avoid the trap.

**Q: Will this test work on Cancun? Prague? Some hypothetical future fork?**
Yes — `read_best_bid` is the same function regardless of fork. The precompile registry chooses *which* precompiles are in effect per fork (L1/L2 added `openhl_precompiles_for(spec)` with `OnceLock`s per hardfork), but the CLOB-reading function itself is fork-agnostic.

**Q: How would a Solidity contract see this same value?**
```solidity
(uint256 price, uint256 qty) = abi.decode(
    staticcall(gas, 0x...0c1b, "", 64),
    (uint256, uint256)
);
```
With our Book installed and the precompile registered, that staticcall returns 64 bytes encoding (250, 7). The Solidity ABI decoder rejoins them into two uint256s. **The contract sees the same data the test sees, via the same code path.** This is the entire point of a custom precompile.

## Module 2 milestone — what you've built

You now have:
- A registered custom EVM precompile at address `0x...0c1b`.
- A process-global Arc-shared CLOB state.
- A precompile that reads the live matching engine's best bid and encodes it as ABI uint256 pair.
- Tests that prove: (a) the precompile is reachable from the registry, (b) the precompile reads zero when no CLOB is installed, (c) the precompile reads live state when a CLOB is installed.

Smart contracts can now query CLOB state directly. The "fills are a parallel list, smart contracts can't see them" gap from course 7 L12 is partially closed — for reads. Writes (placing orders from contracts) is Module 3.

## Next lesson (L7)

L7 starts Module 3 (Write precompile). It mirrors L2: a new precompile address (`CLOB_PLACE_ORDER` at `0x...0c1c`), Solidity calldata decoding for the order parameters, and a hardcoded placeholder body. The teaching focus shifts from output encoding to **input** decoding — variable-length calldata, struct unpacking, error handling for malformed input.
````

---

## Seed-file slot

L6 lands in Module 2 (Read precompile) at sortOrder 2:

```typescript
{
  title: 'Lesson 6 — Module 2 milestone — proving the round-trip',
  slug: 'openhl-precompiles-live-state-proof-en',
  type: 'CONTENT',
  sortOrder: 2,
  duration: 30,
  xpReward: 60,
  content: `# Lesson 6 — Module 2 milestone — proving the round-trip\n\n...`
},
```

## SHA pinning discipline

L6 cites `b635ef7` (Stage 9b). After L6, `crates/evm/src/precompiles/mod.rs` is **byte-identical** to Stage 9b — `git diff` is empty. Module 2 ships.

## Style review notes (self-critique before paste)

- **§Goal frames the milestone explicitly** — "Module 2 complete" so readers know this is a *closing* lesson, not a *building* lesson.
- **§Plan's "L6 is a pure test addition"** preempts the "wait, no new behavior?" reaction. The behavior was added in L5; L6 proves it.
- **§Predict on (250, 7) vs (240, 99)** earns the adversarial test-data design — the trap order is the whole point.
- **§Step 4's "minimum that distinguishes correctness from coincidence"** is the testable-design lesson.
- **§Step 5 on move vs Arc::clone(&book)** preempts the unnecessary clone trap.
- **§Step 6 on assertion messages as documentation** is reusable advice for any milestone test.
- **§Design reflection 4 — "one thing at a time"** retrospects on the L4/L5/L6 split as a pedagogical choice.
- **§Module 2 milestone summary** lists what the reader has built — it's a celebration moment.
- **L7 preview** points to Module 3 = same pattern, opposite direction (writes vs reads).
