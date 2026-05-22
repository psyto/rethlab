# Building OpenHL Precompiles — L8 draft (EN) — build-along

> Drafted against openhl SHA `a8823a1` (Stage 9c — clob_place_order precompile / write path).
> Course: `building-openhl-precompiles-en` (track: `reth-l1-architect`).

---

## L8 — `openhl-precompiles-place-order-write-en`

- **Module:** 3 (Write precompile), sortOrder 1 within module
- **Course-level sortOrder:** 7 (lesson 8 of 12)
- **Duration:** 30 min
- **XP reward:** 60
- **Type:** CONTENT
- **Milestone:** Module 3 mid-stage (write-read round-trip)

### Content

````markdown
# Lesson 8 — `book.submit(...)` — the write path goes live

## Goal

Concepts you'll grasp in this lesson:

- **The precompile represents an on-chain caller** — when test code writes directly to `book.lock().submit(...)`, that simulates the bridge (off-chain). When `place_order` writes to the book, that simulates an EVM transaction (on-chain). L8 is the moment EVM execution starts mutating CLOB state.
- **Two precompiles, one Arc, shared state = round-trip** — both precompiles read/write through `CLOB_STATE`, so a write via `0x...0c1c` is immediately visible to a read via `0x...0c1b`. The L4 architecture was designed for exactly this moment.
- **Schema-first means behavior-second is small** — L7 wrote ~70 lines (constants, atomic, parser, registration, tests). L8 adds ~7 lines (the submit call + binding renames + test extensions). Locking the contract first compressed the behavior change.
- **Side-effect testing requires holding a handle** — L7's malformed-input test couldn't check the book because it didn't keep a reference. L8 fixes that with `let book = Arc::new(...); install_clob(book.clone());`. The clone is the difference between testing returns and testing state.
- **`_result` vs `_` as future-intent markers** — `_result` says "I see this value, don't use it yet, expect future use." `_` (bare) says "I'm explicitly not using this." L8 binds to `_result`; L9 renames to `fills`.

Verification:

```bash
cargo test -p openhl-evm --release
```

…passes 46 tests, same count as L7.

Specific changes:

With a one-line addition to `place_order` and two test changes, the precompile **actually writes to the book**:

- **One line added** to `place_order` — `clob.lock().submit(Order { ... })` between order_id allocation and encoding.
- **L7's `_` prefixes dropped** from `_account_id` / `_price_value` / `_side` — they're used now.
- **L7's `place_order_rejects_malformed_input` extended** — each rejection sub-assertion now also checks `book.depth_bid() == 0` (proves no partial mutation on rejection).
- **L7's `place_order_returns_nonzero_id_on_valid_input` replaced** — by `place_order_then_read_best_bid_round_trips`, the two-precompile round-trip that proves writes via `0x...0c1c` are visible to reads via `0x...0c1b`.

This round-trip is **Module 3's mid-stage milestone**: the EVM ↔ CLOB surface is now bidirectional. A smart contract can place an order via one precompile and immediately read the best bid via another, with both seeing the same `Arc<Mutex<Book>>`.

## Recap

L7 left us with:
- `place_order` parses 128-byte calldata into `(account, side, price, qty)`, validates, allocates `order_id` — **then returns it without writing.**
- The 3 unit tests all pass, but `place_order_rejects_malformed_input` only checks the return value (no side-effect check).
- The happy-path test (`place_order_returns_nonzero_id_on_valid_input`) only verifies we *return* an ID, not that the order is on the book.

The function is half a write-path. L8 makes it whole.

## Plan

Three edits to `crates/evm/src/precompiles/mod.rs`:

1. **Inside `place_order`** — between order ID allocation and the output encoding, lock the Book and call `submit`. Drop the underscores from the bindings (now used).
2. **Inside `place_order_rejects_malformed_input` test** — after each of the 3 rejection assertions, also assert `book.lock().unwrap().depth_bid() == 0`. This requires the test to hold `book` (an `Arc<Mutex<Book>>`) so it can inspect the book after rejection.
3. **Replace `place_order_returns_nonzero_id_on_valid_input`** with a new test `place_order_then_read_best_bid_round_trips` — the two-precompile round-trip.

No imports change. No new functions. No new precompiles. **L8 is the smallest content lesson in the course** — the value is in proving that one line of code closes a bidirectional surface.

> 🛑 **Predict.** Before scrolling: we already proved in L6 that the read precompile sees live data from the global Arc. The only thing changed in L8 is the *source* of that data — instead of the test setup writing directly to the Arc via `book.lock().submit(...)` (as L6 did), the **`place_order` precompile** writes to it. **Why does this change matter?** Hint: think about what kind of caller the precompile represents.

(Answer: **The precompile represents a smart contract caller.** When L6 wrote to the book directly from test code, that was equivalent to the *bridge* (off-chain code) writing to the book. When `place_order` writes to the book, that's equivalent to **an EVM transaction writing to the book** — a smart contract's call propagating through EVM dispatch into a precompile and producing book state. **Stage 9c is the moment EVM execution starts mutating CLOB state.** Until L8, only off-chain code could write to the book. After L8, on-chain code can.)

## Walk-through

### Step 1: Add the `submit` call to `place_order`

Find the L7 body. The relevant region is between the order ID allocation and the output encoding:

```rust
    drop(state); // L8 will re-acquire as write-side-friendly

    let order_id_val = NEXT_ORDER_ID.fetch_add(1, Ordering::Relaxed);

    // L7 stops here. L8 will add: clob.lock().submit(Order { ... }).

    out[24..32].copy_from_slice(&order_id_val.to_be_bytes());
```

Change this region to:

```rust
    let order_id_val = NEXT_ORDER_ID.fetch_add(1, Ordering::Relaxed);

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

Several things to notice:

- **`drop(state)` was removed.** In L7 we had a half-step that read `CLOB_STATE`, checked for `Some`, then dropped the read lock. In L8 we use the same read but bind to `clob` (the `Arc` inside). Let me show the full updated function in Step 2 — the read-lock dance has to be reshaped.

Actually — let me show the full updated `place_order` body so the lock pattern is obvious. Replace the body's lock section (after the qty check) with:

```rust
    let state = CLOB_STATE.read().expect("CLOB_STATE rwlock poisoned");
    let Some(clob) = state.as_ref() else {
        // No CLOB installed → 0 sentinel.
        return Ok(PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0));
    };

    let order_id_val = NEXT_ORDER_ID.fetch_add(1, Ordering::Relaxed);

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
    Ok(PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0))
```

The change from L7:
- `if state.as_ref().is_none() { ... }; drop(state);` becomes `let Some(clob) = state.as_ref() else { ... };` — the `let-else` binding lets us keep `clob` accessible after the `None` early return.
- After the `Some` binding, we **don't drop `state`** — we need it to live long enough that `clob` (a reference into it) stays valid through the `clob.lock()` call.
- `let _result = book.submit(...)` — `submit` returns a `Vec<Fill>` (the matching engine's fills). At L8 we ignore them. **L9 routes these fills back to the bridge** — but for now, `let _result` keeps clippy quiet about the unused return value.
- `drop(book)` — explicit drop of the Book mutex guard. The `out[24..32]` copy and the `Ok(...)` return happen without holding the Book lock. Tiny optimization for hot paths.

**Also drop the `_` prefixes from the bindings** (now used):

```rust
    let account_id = u64_from_be_chunk(&input[0..32]);   // was _account_id
    let side_byte = input[63];
    let price_value = u64_from_be_chunk(&input[64..96]); // was _price_value
    let qty_value = u64_from_be_chunk(&input[96..128]);

    let side = match side_byte {                          // was _side
        0 => Side::Buy,
        1 => Side::Sell,
        _ => return Ok(PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0)),
    };
```

Three identifiers gain meaning: `account_id` becomes the order's account, `price_value` becomes the limit price, `side` becomes the order's side. **The full Order struct construction in L8's submit is exactly the data we parsed in L7.** That's what "schema locked in L7, behavior added in L8" looks like in practice.

Also update the doc comment — remove the L7 "L7 NOTE" line about not yet calling submit:

```rust
/// Place a limit order on the installed CLOB. The write counterpart to
/// `read_best_bid` — completes the EVM ↔ CLOB bidirectional surface.
///
/// Calldata layout (ABI-aligned, 128 bytes):
/// ```text
///   [  0.. 32]  account_id  (u64 in last 8 bytes)
///   [ 32.. 64]  side        (u8 in last byte: 0 = Buy, 1 = Sell)
///   [ 64.. 96]  price       (u64 in last 8 bytes)
///   [ 96..128]  qty         (u64 in last 8 bytes)
/// ```
///
/// Returns 32 bytes: the allocated `order_id` in the last 8 bytes, or zero
/// on rejection (no CLOB installed, malformed input, invalid side byte).
/// Allocated IDs start at 1, so zero is unambiguously "rejected".
///
/// Side note: the fills returned by `Book::submit` are discarded here.
/// Production-shape integration would route them through the bridge's
/// `pending_fills` so they reach the next `build_payload`. At v0 the
/// precompile and the bridge are write-side independent.
```

The "Side note" at the bottom names the next gap — fills returned by `submit` are discarded. **That gap is L9.** Naming it in the doc comment means future readers see "we know this is a gap" rather than wondering if it's an oversight.

> 🛑 **Anti-fluency.** "Why is `_result` underscored if we want to suppress the unused warning?" **`let _result = ...` and `let _ = ...` both suppress the warning.** The difference: `let _result` *binds* the value and drops it at end of scope. `let _ = ...` drops the value *immediately* (before any subsequent statement). For `submit`, either works because nothing in the function reads `_result` later. But `let _result` is conventional when the value has a meaningful name and we plan to use it later — like in L9, where we'll bind it to a real name and route it. **`_result` is a "future intent" marker.**

> 🛑 **Anti-fluency.** "Why explicitly `drop(book)` if the lock would release at end-of-scope anyway?" **Because the encoding and Ok() return are still pending.** If we don't `drop(book)`, the Book lock is held across the `out[24..32].copy_from_slice(...)` and the `Ok(PrecompileOutput::new(...))` construction. Neither needs the lock. Holding it costs concurrent readers and other precompiles parallel access. **Explicit drop = "I'm done with this lock, I don't need it for the rest of the function."** Compiler-optional, but it shrinks the lock-held window noticeably in hot paths.

### Step 2: Extend `place_order_rejects_malformed_input` with `depth_bid` checks

Current L7 test:

```rust
    #[test]
    fn place_order_rejects_malformed_input() {
        let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        install_clob(Arc::new(Mutex::new(Book::new())));

        // Too short.
        let r = place_order(&[0u8; 64], 100_000, 0).unwrap();
        assert_eq!(U256::from_be_slice(&r.bytes[0..32]), U256::ZERO, "short input rejects");

        // Invalid side byte.
        let bad_side = place_order_calldata(42, 7, 100, 5);
        let r = place_order(&bad_side, 100_000, 0).unwrap();
        assert_eq!(U256::from_be_slice(&r.bytes[0..32]), U256::ZERO, "bad side byte rejects");

        // Zero qty.
        let zero_qty = place_order_calldata(42, 0, 100, 0);
        let r = place_order(&zero_qty, 100_000, 0).unwrap();
        assert_eq!(U256::from_be_slice(&r.bytes[0..32]), U256::ZERO, "zero qty rejects");

        uninstall_clob();
    }
```

The test installs a Book but discards the Arc, so it can't check book state. Replace with:

```rust
    /// `place_order` with bad input (too short, invalid side byte, zero qty)
    /// rejects without mutating state.
    #[test]
    fn place_order_rejects_malformed_input() {
        let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        let book = Arc::new(Mutex::new(Book::new()));
        install_clob(book.clone());

        // Too short.
        let r = place_order(&[0u8; 64], 100_000, 0).unwrap();
        assert_eq!(U256::from_be_slice(&r.bytes[0..32]), U256::ZERO);
        assert_eq!(book.lock().unwrap().depth_bid(), 0, "no order on book after short input");

        // Invalid side byte.
        let bad_side = place_order_calldata(42, 7, 100, 5);
        let r = place_order(&bad_side, 100_000, 0).unwrap();
        assert_eq!(U256::from_be_slice(&r.bytes[0..32]), U256::ZERO);
        assert_eq!(book.lock().unwrap().depth_bid(), 0, "no order on book after bad side");

        // Zero qty.
        let zero_qty = place_order_calldata(42, 0, 100, 0);
        let r = place_order(&zero_qty, 100_000, 0).unwrap();
        assert_eq!(U256::from_be_slice(&r.bytes[0..32]), U256::ZERO);
        assert_eq!(book.lock().unwrap().depth_bid(), 0, "no order on book after zero qty");

        uninstall_clob();
    }
```

Three changes from L7:

1. **`let book = Arc::new(...); install_clob(book.clone());`** — bind the Arc to a local. The `.clone()` of an Arc is just a refcount bump; both names point to the same Book.
2. **3 new assertions: `book.lock().unwrap().depth_bid() == 0`** — after each rejection, the book has nothing on it. **`depth_bid()` is the count of bid orders across all price levels** (defined in course 7's Book). Zero = empty.
3. **The doc comment** — added (L7 had a "L7 NOTE" version explaining the deferred check; that's gone now).

**The 3 new assertions are the side-effect proof.** L7's `assert_eq!(... U256::ZERO)` only checked the precompile *returned* the sentinel. L8 now checks the precompile **also didn't write anything**. The two together prove: malformed input → returns 0 *and* leaves state untouched.

> 🛑 **Anti-fluency.** "Why `book.clone()` instead of just passing `book`?" **Because we want to retain a handle to inspect after `install_clob` consumes (moves) its argument.** `install_clob(Arc<Mutex<Book>>)` takes the Arc by value. After `install_clob(book.clone())`, the global holds one Arc, `book` (in this scope) holds another. Both refer to the same Book. If we wrote `install_clob(book)` instead, we'd no longer have a local handle to call `.lock().unwrap().depth_bid()` on. **Arc::clone is the cheap way to share ownership across a function call.**

### Step 3: Replace the happy-path test with the round-trip

Delete L7's:

```rust
    #[test]
    fn place_order_returns_nonzero_id_on_valid_input() {
        // ...
    }
```

Add in its place:

```rust
    /// **Stage 9c end-to-end (write side)**: place a Buy via the precompile,
    /// then read the best bid via the read precompile. The two-precompile
    /// round-trip is the moment the EVM ↔ CLOB surface becomes bidirectional.
    #[test]
    fn place_order_then_read_best_bid_round_trips() {
        let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        let book = Arc::new(Mutex::new(Book::new()));
        install_clob(book);

        // EVM call: place Buy @ 175 with qty 12, account 0xABCD.
        let calldata = place_order_calldata(0xABCD, 0, 175, 12);
        let result = place_order(&calldata, 100_000, 0).expect("precompile must not error");
        let returned_id = U256::from_be_slice(&result.bytes[0..32]);
        assert!(
            returned_id > U256::ZERO,
            "place_order must return a non-zero order id on success"
        );

        // Now read the best bid via the read precompile. Should see our order.
        let read_result = read_best_bid(&[], 100_000, 0).expect("precompile must not error");
        let price = U256::from_be_slice(&read_result.bytes[0..32]);
        let qty = U256::from_be_slice(&read_result.bytes[32..64]);
        assert_eq!(price, U256::from(175u64), "best bid is the placed order's price");
        assert_eq!(qty, U256::from(12u64), "qty at best level matches placed qty");

        uninstall_clob();
    }
```

Why this replaces (not supplements) the L7 test:

- L7's `place_order_returns_nonzero_id_on_valid_input` only asserted that `place_order` returns a nonzero ID. That assertion is **subsumed** by this test's `assert!(returned_id > U256::ZERO, ...)`.
- The new test goes further: it then reads via `read_best_bid` and verifies the placed order is visible. **The L7 assertion is a strict subset of the L8 assertion.**

Keeping both would be redundant. **A subsumed test is dead weight** — it doesn't add coverage, just maintenance burden.

The two precompile calls are independent — `read_best_bid` doesn't know `place_order` happened. They both read/write the same `Arc<Mutex<Book>>` via `CLOB_STATE`. **That's the round-trip: write through one precompile, observed by the other.** From a Solidity contract's perspective:

```solidity
uint256 order_id = call(0x...0c1c, abi.encode(0xABCD, 0, 175, 12));   // ~ id > 0
(uint256 price, uint256 qty) = staticcall(0x...0c1b, "");             // ~ (175, 12)
```

Two separate EVM calls, two separate precompiles, but they share state because they share the global. **The bridge installed that global. The bridge's submit_order writes to it. The bridge's pending_fills hasn't gained anything yet (L9 fixes that).**

> 🛑 **Predict.** Before scrolling: this test installs a `Book`, places a Buy via `place_order`, then reads via `read_best_bid`. **What would happen if the read precompile and the write precompile each held their own `Arc<Mutex<Book>>` (two separate Books)?** Hint: think about what shared state means.

(Answer: **The test would fail.** `read_best_bid` would see an empty book and return zero. The only reason this round-trip works is that **both precompiles read from the same `CLOB_STATE` global, which holds one Arc, which points to one Book.** The Arc-shared-pattern is what makes the round-trip semantically meaningful. If we had two precompiles each with their own private state, they'd be functionally isolated — useless for talking to the same CLOB.)

### Bidirectional round-trip topology

The plumbing we've been laying since L4 finally conducts in both directions — here's the full picture:

```
 ┌────── on-chain (Solidity, two calls in one transaction) ──────────┐
 │  uint256 id  = call      (0x...0c1c, abi.encode(0xABCD,0,175,12)); │ ← WRITE call
 │  (uint256 p,                                                       │
 │   uint256 q) = staticcall(0x...0c1b, "");                          │ ← READ staticcall
 └──────────┬──────────────────────────────────────────┬──────────────┘
            │ CALL (128-byte calldata)                 │ STATICCALL (empty calldata)
            ▼                                          ▼
 ┌──────────────────────────────────┐   ┌──────────────────────────────────┐
 │ Reth EVM dispatch — write side   │   │ Reth EVM dispatch — read side    │
 │   0x...0c1c → place_order        │   │   0x...0c1b → read_best_bid      │
 └──────────────┬───────────────────┘   └──────────────────┬───────────────┘
                │ fn pointer call                          │ fn pointer call
                ▼                                          ▼
 ┌──────────────────────────────────┐   ┌──────────────────────────────────┐
 │ place_order(input,...)  [L7+L8]  │   │ read_best_bid(_,...)  [L2+L5]    │
 │  1. parse 128-byte calldata      │   │  1. let mut out = vec![0u8; 64]; │
 │  2. validate (4 rejection paths) │   │  2. current_best_bid()  ──┐      │
 │  3. fetch_add(1, Relaxed) → id   │   │  3. encode (price,qty)  ◄─┘      │
 │  4. clob.lock().submit(Order{…}) │   │     out[24..32] ← price BE       │
 │  5. encode id → out[24..32]      │   │     out[56..64] ← qty BE         │
 └──────────────┬───────────────────┘   └──────────────────┬───────────────┘
                │ ── mutating write ──                     │ ── pure read ──
                │ submit(Order{id, 0xABCD,                 │ best_bid_with_qty():
                │         Buy, Qty(12),                    │   bids.iter().next()
                │         Limit{Price(175)}})              │   → (Price(175), Qty(12))
                ▼                                          ▼
 ┌──────────────────────────────────────────────────────────────────────┐
 │ static CLOB_STATE: RwLock<Option<Arc<Mutex<Book>>>>     [installed by L4]│
 │                                                                       │
 │   ┌─────────────── one Arc → one Mutex → one Book ────────────────┐ │
 │   │  bids: BTreeMap<RevPrice, OrderQueue>                          │ │
 │   │     RevPrice(175) → [Order{ id, account: 0xABCD, qty: 12,      │ │
 │   │                             side: Buy, type: Limit }]          │ │
 │   └────────────────────────────────────────────────────────────────┘ │
 │                                                                       │
 │   write side holds = inner Mutex (exclusive)                          │
 │   read side holds  = inner Mutex (exclusive, after write releases)    │
 └──────────────────────────────────────────────────────────────────────┘
```

The reason the round-trip works boils down to **"there is only one Arc"**:

- Write and read both go through the same `CLOB_STATE` → both clone the same Arc → both see the same Book
- When the write side's `clob.lock().submit(...)` releases, the inner Mutex is freed and the read side can immediately call `current_best_bid()`
- The bridge's off-chain `submit_order` (Course 7) **writes to the same Arc** — meaning the precompile (on-chain) and the bridge (off-chain) are now equal-status writers from the Book's perspective
- **The `Arc<Mutex<Book>>` global hand-off we built in L4 was designed exactly for this bidirectional conduction** — L7 placed the two precompiles side by side, L8 made the write side real, and only now does that design surface as visible behavior

"Module 3's mid-stage milestone" means this vertical line now runs **both directions simultaneously**.

## Test

```bash
cargo test -p openhl-evm --release
```

After ~30 seconds:

```
running 46 tests
... 46 tests pass ...

test result: ok. 46 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

Same count as L7 (46). What changed: 1 test was replaced (`place_order_returns_nonzero_id_on_valid_input` → `place_order_then_read_best_bid_round_trips`), and 1 was extended (`place_order_rejects_malformed_input` now also checks book state).

To see the milestone test specifically:

```bash
cargo test -p openhl-evm --release round_trips
```

Output:

```
running 1 test
test precompiles::tests::place_order_then_read_best_bid_round_trips ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 45 filtered out
```

**That `ok` line is Module 3's mid-stage milestone.** Two custom precompiles, one shared state, full write→read round-trip in EVM execution.

Common errors and fixes:

- **`error[E0382]: borrow of moved value: 'state'`** in `place_order` — you wrote `let Some(clob) = state.as_ref() else { ... };` but then later code uses `state`. The `let-else` pattern binds `clob` (a reference into `state`), so `state` must stay live; don't add `drop(state)` anywhere afterward.
- **`error: cannot find value 'account_id' in this scope`** — you dropped the `_` prefix in the inner `Order { ... }` literal but the parsing line still has `let _account_id = ...`. Drop the prefix in *both* places.
- **`assertion failed: book.lock().unwrap().depth_bid() == 0`** in `place_order_rejects_malformed_input` — a rejection path is **not** rejecting cleanly. Something passed through the early returns and called `book.submit(...)`. Re-check the rejection sequence: short input → side byte → qty → no CLOB. Each must be `return Ok(...)` not `if ... { ... }` with the body falling through.
- **`assertion failed: left=200 right=175`** in the round-trip test — your `submit` is binding the wrong field. The order's `price` should be the one parsed from calldata at `input[64..96]` (a u64). Check that you pass `Price(price_value)` (not `Price(qty_value)` or similar).
- **`error[E0599]: no method 'depth_bid' found for struct 'Book'`** — that method was added in course 7's Book design. Verify it exists in `crates/clob/src/book.rs`.

## Design reflection

Four points worth pausing on:

1. **Schema-first means behavior-second is small.** L7 wrote ~70 lines of code (constants, atomic, parser, registration, tests). L8 added ~7 lines (the submit call + binding renames + test extensions). That **small delta is the point**: by locking the contract before the implementation, the implementation becomes a focused change instead of a sprawling one. Future precompile additions can follow the same pattern.

2. **Two precompiles, one Arc, shared state = round-trip works.** The architecture from L4 (`Arc<Mutex<Book>>` in a `static`, installed by the bridge, read by each precompile) was designed for exactly this moment. **Both precompiles see the same Book because both go through `CLOB_STATE`.** A different architecture (one global per precompile) would have been simpler to build initially but would have prevented the round-trip from being possible at all.

3. **Side-effect testing means holding a handle.** L7's malformed-input test couldn't check the book because it didn't keep a reference. L8 fixed that with `let book = Arc::new(...); install_clob(book.clone());`. **The clone is the difference between testing returns and testing state.** Cheap (1 atomic increment); valuable (proves no partial writes).

4. **`_result` is a future-intent marker.** L8 binds the fills returned by `submit` to `_result` and ignores them. L9 will bind to `fills` (no underscore) and route them. The naming convention is: `_name` = "I see this value and acknowledge it but don't use it yet; expect future use." `_` (bare) = "I'm explicitly not using this and don't plan to." Pick the right one for the situation.

## Answer key

```bash
cd ~/code/openhl-reference
git checkout a8823a1
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
```

After L8, your code matches Stage 9c. The diff should be **empty** (modulo any doc comment phrasing you wrote on your own). **Stage 9c is now closed.**

Return:

```bash
git checkout main
```

## Common questions

**Q: What's `Book::submit`'s return value, and why are we discarding it?**
`Book::submit(order)` returns `Vec<Fill>` — the fills that resulted from matching the new order against resting orders on the opposite side. If you submit a marketable Buy, it may consume one or more Sell orders, producing one Fill per match. We discard these fills in L8 because the bridge's `pending_fills` (which gets attached to the next payload) isn't connected to the precompile yet. **L9 connects them via an `install_fill_sink` pattern that mirrors `install_clob`.**

**Q: What happens if `place_order` is called from a `staticcall`?**
A staticcall is a read-only call — Solidity revert if the target attempts state mutation. **For precompiles, the EVM doesn't enforce this at the precompile boundary** — it's up to the precompile to refuse writes when called via STATICCALL. At v0 we don't check this; a sufficiently-determined contract could STATICCALL `0x...0c1c` and we'd happily write to the book. **This is a known soundness gap.** Production should plumb the call context (`is_static`) through and reject. Out of scope at v0.

**Q: Could one EVM call produce *both* a write and a read in our setup?**
Yes — a single Solidity function could `call(0x...0c1c, ...)` and then `staticcall(0x...0c1b, ...)` in sequence. That's effectively what `place_order_then_read_best_bid_round_trips` simulates at the Rust level. Both calls execute inside one EVM transaction's call stack, both touch `CLOB_STATE` global. **If the EVM transaction reverts later, the book state isn't rolled back** — another soundness gap. Production needs transaction-scoped state shadowing.

**Q: Why is `place_order` registered at `0x...0c1c` and not `0x...0c1a`?**
Address namespacing convention: `0c1b` = "Read Best [b]id," `0c1c` = "[c]lob [c]reate." Numerically `0c1a` was tempting (`0c1a < 0c1b`), but `0c1c` reads better aloud and keeps the read/write addresses adjacent — `0c1b` for the read, `0c1c` for the write — which helps anyone scanning a contract that uses both. Address conventions matter when contracts will be written by humans.

## Next lesson (L9)

L9 closes the "fills are discarded" gap from L8's doc comment. Add a `FILL_SINK` static parallel to `CLOB_STATE` — process-global `Option<Arc<Mutex<Vec<Fill>>>>`. `place_order` now pushes fills into the sink. The bridge's `pending_fills` field becomes `Arc<Mutex<Vec<Fill>>>` (was just `Mutex<...>`); the bridge's `new()` installs it as the FILL_SINK. After L9, **EVM-placed orders produce fills that flow into the bridge's payload-attached fill stream** — the precompile and the bridge are no longer write-side independent.
````

---

## Seed-file slot

L8 lands in Module 3 (Write precompile) at sortOrder 1:

```typescript
{
  title: 'Lesson 8 — book.submit(...) — the write path goes live',
  slug: 'openhl-precompiles-place-order-write-en',
  type: 'CONTENT',
  sortOrder: 1,
  duration: 30,
  xpReward: 60,
  content: `# Lesson 8 — \`book.submit(...)\` — the write path goes live\n\n...`
},
```

## SHA pinning discipline

L8 cites `a8823a1` (Stage 9c). After L8, `crates/evm/src/precompiles/mod.rs` is byte-identical to Stage 9c. The diff is empty.

## Style review notes (self-critique before paste)

- **§Goal frames L8 as "the smallest content lesson"** — one line + 2 test changes — and ties it to the Module 3 mid-stage milestone.
- **§Predict on "what changed in the *source* of the data"** earns the EVM-execution-mutates-state framing.
- **§Step 1's `let-else` pattern** explains why the L7 `is_none()` + `drop(state)` becomes a single `let Some(clob) = ... else { ... }`.
- **§Anti-fluency on `_result` vs `let _`** is reusable Rust style guidance.
- **§Anti-fluency on `book.clone()`** preempts the "why bother" question.
- **§Predict on "what if precompiles had separate globals?"** earns the shared-state architecture.
- **§Design reflection 1** — schema-first means behavior-second is small — retrospects the L7/L8 split.
- **§Common question on `staticcall` + soundness gap** is honest about the v0 limitation.
- **L9 preview** points to the next gap (fills routing).
