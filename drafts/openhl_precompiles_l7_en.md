# Building OpenHL Precompiles — L7 draft (EN) — build-along

> Drafted against openhl SHA `a8823a1` (Stage 9c — clob_place_order precompile / write path).
> Course: `building-openhl-precompiles-en` (track: `reth-l1-architect`).

---

## L7 — `openhl-precompiles-place-order-scaffold-en`

- **Module:** 3 (Write precompile), sortOrder 0 within module
- **Course-level sortOrder:** 6 (lesson 7 of 12)
- **Duration:** 40 min
- **XP reward:** 80
- **Type:** CONTENT

### Content

````markdown
# Lesson 7 — `clob_place_order` — calldata decoding scaffold

## Goal

By the end of this lesson:

```bash
cargo test -p openhl-evm --release
```

…passes 46 tests (3 new). The CLOB's **write path** has its precompile registered, calldata parsing implemented, and rejection paths verified:

- **New precompile at `0x...0c1c`** — `CLOB_PLACE_ORDER`, registered alongside `CLOB_READ_BEST_BID`.
- **128-byte ABI-aligned input layout** decoded: `account_id`, `side`, `price`, `qty`.
- **Atomic order-ID counter** (`NEXT_ORDER_ID`) — process-global, starts at 1 so the sentinel `0` is unambiguously "rejected."
- **Four rejection paths** all return zero: input too short, invalid `side` byte, zero `qty`, no CLOB installed.
- **Happy path** allocates an order ID and returns it — **but does NOT submit to the book yet.** That's L8.

L7 is the L2 of Module 3: the function is reachable and parses input correctly, but the state-mutation behavior is deferred. L8 adds the single line that actually writes to the book; L9 routes the resulting fills back into the bridge.

## Recap

Module 2 closed with:
- `CLOB_READ_BEST_BID` precompile registered at `0x...0c1b`.
- Smart contracts can `STATICCALL` it to read live best-bid data.
- `Arc<Mutex<Book>>` shared between bridge and precompile via `CLOB_STATE` global.

But contracts still can't **place** orders. They can read the book; they can't write to it. L7 starts to fix that.

## Plan

Six edits to `crates/evm/src/precompiles/mod.rs`:

1. **Expand imports** — pull in the matching engine types (`AccountId`, `Order`, `OrderId`, `OrderType`, `Price`, `Qty`, `Side`) plus `atomic::{AtomicU64, Ordering}`.
2. **Add the `CLOB_PLACE_ORDER` address constant** + a `NEXT_ORDER_ID` atomic counter.
3. **Add the `place_order` precompile function** — parse 128-byte input, validate, allocate ID, return encoded ID. **No `book.submit(...)` yet** (that's L8).
4. **Add a `u64_from_be_chunk` helper** — used 3× by `place_order` to extract u64 values from 32-byte ABI words.
5. **Update `openhl_precompiles`** — `extend` with **both** precompiles now (an array of 2, not 1).
6. **Add 3 new tests** + 1 helper (`place_order_calldata`) to assemble test input.

The `read_best_bid` function and Module 2's tests don't change. **L7 is purely additive.**

> 🛑 **Predict.** Before scrolling: the `read_best_bid` precompile took *empty* input (`&[]`) and returned 64 bytes. `place_order` will take **128 bytes of input** and return 32. **Why does Solidity pad each u64 field to 32 bytes?** Hint: think about what calling convention precompiles share with regular contract functions.

(Answer: **Solidity's ABI is fixed-width-32-byte per slot.** A `function f(uint64 a, uint8 b, uint64 c, uint64 d)` doesn't pack — it allocates 4 × 32 = 128 bytes of calldata, each value right-aligned in its 32-byte slot. Precompiles follow the same convention because they're invoked via the same EVM call opcodes. **The waste is intentional**: it lets the EVM treat all calls uniformly. Our parser reads the meaningful 8 or 1 bytes from each slot and ignores the rest.)

## Walk-through

### Step 1: Expand the imports

Current imports (after L6):

```rust
use alloy_evm::revm::precompile::{
    Precompile, PrecompileId, PrecompileOutput, PrecompileResult, Precompiles,
};
use alloy_primitives::{address, Address, Bytes};
use openhl_clob::Book;
use std::sync::{Arc, Mutex, RwLock};
```

Expand the openhl_clob import to bring in the matching engine types, and the std::sync import to include atomics:

```rust
use alloy_evm::revm::precompile::{
    Precompile, PrecompileId, PrecompileOutput, PrecompileResult, Precompiles,
};
use alloy_primitives::{address, Address, Bytes};
use openhl_clob::{AccountId, Book, Order, OrderId, OrderType, Price, Qty, Side};
use std::sync::{
    atomic::{AtomicU64, Ordering},
    Arc, Mutex, RwLock,
};
```

`AccountId`, `Order`, `OrderId`, `OrderType`, `Price`, `Qty`, `Side` are all needed to **construct an `Order`** in L8 — but the imports go in now to keep the diff focused on L7's concern (we'll reuse them immediately for the function signature in L8). `AtomicU64` and `Ordering` are for the `NEXT_ORDER_ID` counter.

### Step 2: Add the address constant + atomic counter

After `CLOB_READ_BEST_BID`:

```rust
/// Address of the "place order" precompile (write path — Stage 9c).
///
/// Solidity call shape (ABI-aligned 128-byte input):
/// `call(gas, 0x...0c1c, calldata=(uint64 account, uint8 side, uint64 price, uint64 qty), ...) → uint256 order_id`
///
/// `side` encoding: 0 = Buy, 1 = Sell. Any other value → call returns 0
/// (rejected, no state change). Order type is hardcoded to Limit at v0.
///
/// Return: 32 bytes; the last 8 are a big-endian u64 `order_id`. A return
/// of 0 means the order was rejected (no CLOB installed, malformed input,
/// or invalid side byte) — distinguishable from "placed" because allocated
/// IDs start at 1.
pub const CLOB_PLACE_ORDER: Address = address!("0x0000000000000000000000000000000000000c1c");
```

Address `0x...0c1c` — mnemonic `0c1c` for "CL[ob] [pla]C[e]". Sits right next to `0x...0c1b` for "CL[ob] [Rea]B[id]". Both well above standard precompiles `0x01..0x09`.

Then, after `CLOB_BASE_GAS_COST`:

```rust
/// Monotonic order-ID counter for orders placed via the EVM. Starts at 1
/// so the sentinel value 0 (returned on rejection) is distinguishable from
/// a successfully placed order.
///
/// **Single-validator caveat:** This is a process-global counter. For
/// multi-validator deployments, order IDs must come from consensus —
/// each validator's precompile must allocate the same ID for the same
/// EVM-side call, which means the counter has to be either deterministic
/// from input or read from a shared block-scoped state. Out of scope at v0.
static NEXT_ORDER_ID: AtomicU64 = AtomicU64::new(1);
```

**Two load-bearing decisions encoded in this static:**

1. **Starts at 1, not 0.** Because `0` is our "rejected" sentinel value (returned from the precompile when input is malformed or no CLOB is installed). If the counter started at 0, the first successfully-placed order would also return 0, indistinguishable from a rejection. By starting at 1, every allocated ID is `> 0` and every `0` returned to the EVM caller is unambiguous.
2. **`AtomicU64`, not `Mutex<u64>`.** `fetch_add(1, Relaxed)` is wait-free; `Mutex::lock` blocks. Order ID allocation is on the hot path of every order placement; using a mutex would serialize all order placements through one critical section. Atomic increment is the right tool here.

> 🛑 **Anti-fluency.** "Why `Ordering::Relaxed` and not `SeqCst`?" **Because the IDs don't have ordering dependencies with other state.** `Relaxed` guarantees atomicity (no two threads get the same ID) but doesn't synchronize with any other memory operation. We don't need IDs to be ordered with respect to writes to the book — the book has its own mutex, which provides the ordering for state visibility. `SeqCst` would add a memory fence on every increment for no benefit. **Pick the weakest ordering that suffices.**

> 🛑 **Anti-fluency.** "Multi-validator caveat" feels like Future Problems — why bother mentioning it?" **Because the failure mode is silent chain divergence.** If two validators allocate different IDs for the same EVM call, their books diverge after that point — and the divergence is invisible until much later when reads return different values. **Naming the problem at the static's definition site means any future engineer extending this code reads "you cannot ship this multi-validator" before deciding how to refactor.** Documentation comments are the canonical place for "this thing has a hidden constraint" warnings.

### Step 3: Add `u64_from_be_chunk` helper

Below `read_best_bid`, before `openhl_precompiles`:

```rust
/// Read a big-endian u64 from the last 8 bytes of a 32-byte ABI chunk.
fn u64_from_be_chunk(chunk: &[u8]) -> u64 {
    debug_assert!(chunk.len() == 32);
    let mut buf = [0u8; 8];
    buf.copy_from_slice(&chunk[24..32]);
    u64::from_be_bytes(buf)
}
```

Three things:
1. **`debug_assert!` on length** — in debug builds this catches "I sliced the wrong amount." In release builds it compiles away to nothing. Cost-free safety in development.
2. **`u64::from_be_bytes` accepts `[u8; 8]`** — fixed-size array, not a slice. So we copy 8 bytes from `chunk[24..32]` into a stack `[u8; 8]` buffer first.
3. **Plain `fn`, not `pub fn`.** Private to the module. Nothing outside `precompiles/mod.rs` needs this.

> 🛑 **Anti-fluency.** "Couldn't we just `u64::from_be_bytes(chunk[24..32].try_into().unwrap())`?" **We could** — same generated code in release. The named helper is for **clarity at the call site**: `u64_from_be_chunk(&input[0..32])` reads as "decode the first ABI slot as u64." `u64::from_be_bytes(input[0..32][24..32].try_into().unwrap())` reads as bytes-and-indices puzzle. **The helper compiles to identical instructions; the saving is in cognitive load.**

### Step 4: Add the `place_order` precompile function

Below `read_best_bid`, before `u64_from_be_chunk`:

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
/// L7 NOTE: this scaffold parses + validates + allocates an order_id, but
/// does NOT actually submit the order to the book. L8 adds the
/// `book.submit(...)` call that completes the write path.
#[allow(clippy::unnecessary_wraps)]
fn place_order(input: &[u8], _gas_limit: u64, _reservoir: u64) -> PrecompileResult {
    let mut out = vec![0u8; 32];

    // Need exactly 128 bytes of input (4 × ABI-padded fields).
    if input.len() < 128 {
        return Ok(PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0));
    }

    let _account_id = u64_from_be_chunk(&input[0..32]);
    let side_byte = input[63];
    let _price_value = u64_from_be_chunk(&input[64..96]);
    let qty_value = u64_from_be_chunk(&input[96..128]);

    let _side = match side_byte {
        0 => Side::Buy,
        1 => Side::Sell,
        _ => return Ok(PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0)),
    };

    // Reject orders with zero quantity outright — the book accepts them
    // technically, but a zero-qty order is always a bug from the caller.
    if qty_value == 0 {
        return Ok(PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0));
    }

    let state = CLOB_STATE.read().expect("CLOB_STATE rwlock poisoned");
    if state.as_ref().is_none() {
        // No CLOB installed → 0 sentinel.
        return Ok(PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0));
    }
    drop(state); // L8 will re-acquire as write-side-friendly

    let order_id_val = NEXT_ORDER_ID.fetch_add(1, Ordering::Relaxed);

    // L7 stops here. L8 will add: clob.lock().submit(Order { ... }).

    out[24..32].copy_from_slice(&order_id_val.to_be_bytes());
    Ok(PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0))
}
```

Five sequential steps. Each rejection is an **early return**, not a nested `if` — keeps the happy path linear.

**The `_` prefix on `_account_id`, `_price_value`, `_side`** signals "we parsed it but don't use it yet." L8 will drop the underscores and pass them into `Order { ... }`. Until then, clippy and rustc accept the unused bindings because of the underscore convention.

**Length check at the top is a guard.** Any byte index `input[N]` would panic if N > input.len(). Validating `>= 128` once at the top means every subsequent `input[X]` access is provably safe — no per-access bounds-check overhead, no runtime panic risk.

**The `_ =>` arm in the side match.** `Side` is a 2-variant enum. The match must be exhaustive, but the EVM caller might pass any byte 0..=255 in the side slot. Anything not 0 or 1 is a rejection, not a panic.

**`Ordering::Relaxed` on the increment.** As established at Step 2.

**The `out` buffer.** All-zeros until the success path overwrites the last 8 bytes. Every rejection path returns the buffer unchanged — `out[24..32]` stays zero — which the caller decodes as `order_id = 0` = rejected.

> 🛑 **Anti-fluency.** "Why parse `account_id` and `price` if we don't use them yet?" **Because L7's job is to lock the calldata schema** — once the schema is published, contracts will build against it. Parsing every field (even the ones we don't use yet) means the parsing **shape** is the contract. If L8 changed which fields are parsed, every contract built between L7 and L8 would break. **Parse the full schema in L7 even if some bindings are unused; mutate behavior in L8.**

> 🛑 **Predict.** Look at the `drop(state)` line. Why explicitly drop the read-lock before allocating the order ID? Hint: think about what happens in L8 when we want to **acquire a write-side lock on the same Arc**.

(Answer: **A read lock blocks write locks.** If we held `state` for the entire function — including past the L8-future `clob.lock()` — we'd be holding a read lock on `CLOB_STATE` while trying to acquire a separate Mutex on the Book it points to. That works (no deadlock), but the read lock prevents anyone else from calling `install_clob` mid-precompile. Dropping it early reduces the lock-held window. **Be a good citizen: hold each lock for the shortest time you can get away with.**)

### Step 5: Update `openhl_precompiles` to register both

Current (after L6):

```rust
#[must_use]
pub fn openhl_precompiles(base: &Precompiles) -> Precompiles {
    let mut precompiles = base.clone();
    precompiles.extend([Precompile::new(
        PrecompileId::custom("clob_read_best_bid"),
        CLOB_READ_BEST_BID,
        read_best_bid,
    )]);
    precompiles
}
```

Replace with:

```rust
#[must_use]
pub fn openhl_precompiles(base: &Precompiles) -> Precompiles {
    let mut precompiles = base.clone();
    precompiles.extend([
        Precompile::new(
            PrecompileId::custom("clob_read_best_bid"),
            CLOB_READ_BEST_BID,
            read_best_bid,
        ),
        Precompile::new(
            PrecompileId::custom("clob_place_order"),
            CLOB_PLACE_ORDER,
            place_order,
        ),
    ]);
    precompiles
}
```

Two precompiles in one `extend` call — same as if we'd called `extend` twice. The array shape just stays cleaner as more precompiles get added.

Also update the doc comment on `openhl_precompiles` from "CLOB-reading additions" to "CLOB-reading + CLOB-writing additions" — it's a tiny edit but it's the kind of thing that desyncs over time if you don't update it now.

### Step 6: Add 3 tests + 1 test helper

In the `#[cfg(test)] mod tests` block, after the L6 round-trip test, add:

```rust
    /// Helper: build a 128-byte ABI-aligned `place_order` calldata buffer.
    fn place_order_calldata(account: u64, side: u8, price: u64, qty: u64) -> Vec<u8> {
        let mut buf = vec![0u8; 128];
        buf[24..32].copy_from_slice(&account.to_be_bytes());
        buf[63] = side;
        buf[88..96].copy_from_slice(&price.to_be_bytes());
        buf[120..128].copy_from_slice(&qty.to_be_bytes());
        buf
    }

    /// With no CLOB installed, `place_order` rejects (returns sentinel 0).
    #[test]
    fn place_order_returns_zero_when_no_clob_installed() {
        let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        uninstall_clob();

        let calldata = place_order_calldata(42, 0, 100, 5);
        let result = place_order(&calldata, 100_000, 0).expect("precompile must not error");
        let order_id = U256::from_be_slice(&result.bytes[0..32]);
        assert_eq!(order_id, U256::ZERO);
    }

    /// `place_order` with bad input (too short, invalid side byte, zero qty)
    /// rejects — returns the sentinel 0.
    ///
    /// L7 NOTE: this test only checks the return value. L8 will add
    /// `book.depth_bid() == 0` assertions once submit is wired in.
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

    /// `place_order` on the happy path returns a non-zero order ID.
    ///
    /// L7 NOTE: this test only proves we **return** a non-zero ID; L8 will
    /// extend coverage to prove the order is actually visible on the book
    /// (the L8 round-trip test).
    #[test]
    fn place_order_returns_nonzero_id_on_valid_input() {
        let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        install_clob(Arc::new(Mutex::new(Book::new())));

        let calldata = place_order_calldata(0xABCD, 0, 175, 12);
        let result = place_order(&calldata, 100_000, 0).expect("precompile must not error");
        let order_id = U256::from_be_slice(&result.bytes[0..32]);
        assert!(order_id > U256::ZERO, "allocated id must be > 0 sentinel");

        uninstall_clob();
    }
```

The helper builds the 128-byte buffer from the 4 logical values, hiding the ABI-padding details from each test. Without it, every test would have to repeat the byte indexing — error-prone, noisy.

**Three tests, three concerns:**

1. **No CLOB installed → zero.** Mirrors `read_best_bid_returns_zero_when_no_clob_installed`. Same pattern (serializer, `uninstall_clob()`, assert), same semantic (the precompile degrades gracefully on uninstalled state).
2. **Malformed input → zero, across all three rejection paths.** Three sub-assertions in one test because they're conceptually the same scenario ("bad input is refused"). **The L7 NOTE makes the deferred check (`depth_bid == 0`) explicit** — L8 will add it.
3. **Valid input → nonzero ID.** This is the "happy path acknowledgment." We allocated an ID. **We don't yet check whether the order made it onto the book** — that's L8's job.

> 🛑 **Anti-fluency.** "Why split into 3 tests instead of one big test?" **Because failure messages should pinpoint the cause.** If "the whole place_order path" is one test and it fails, you read the assertion message and the stack trace to figure out *which* sub-scenario broke. With 3 tests, the failing test's name *is* the cause: `place_order_rejects_malformed_input` failed → check the rejection paths; `place_order_returns_nonzero_id_on_valid_input` failed → check the happy path. **One concern per test makes failures self-describing.**

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

Three more than L6 (43 → 46). The new ones are the three `place_order_*` tests. The 43 from Module 1+2 still pass — L7 is purely additive.

If you want to see only the L7-relevant tests:

```bash
cargo test -p openhl-evm --release place_order
```

Output:

```
running 3 tests
test precompiles::tests::place_order_returns_zero_when_no_clob_installed ... ok
test precompiles::tests::place_order_rejects_malformed_input ... ok
test precompiles::tests::place_order_returns_nonzero_id_on_valid_input ... ok

test result: ok. 3 passed; 0 failed; 0 ignored; 0 measured; 43 filtered out
```

Common errors and fixes:

- **`unused import: AccountId, Order, OrderId, OrderType, Price, Qty, Side`** — you imported them for L7 but don't use any yet. **Suppress with `#[allow(unused_imports)]` on the use statement, or just accept the warning** — L8 uses every one. Don't delete them.
- **`unused variable: _side`** in the match arm — this is `_side`'s purpose; the underscore prefix tells rustc "I know it's unused, don't warn me." If you wrote `let side = match ...` (no underscore), you'll get an unused-variable warning. Restore the underscore.
- **`error[E0061]: this function takes 0 arguments but 1 was supplied`** on `u64_from_be_chunk` — you misspelled the function name or are calling it with multiple slices. The signature is `u64_from_be_chunk(chunk: &[u8])`, one argument.
- **`error[E0277]: 'u64' is not 'u8'`** on `buf[63] = side` in the helper — you wrote `side: u64` or similar. The helper's parameter is `side: u8`; the byte position 63 is exactly one byte.
- **Test passes alone, fails in suite** — `TEST_SERIALIZER` lock not first statement. Reorder so `let _g = TEST_SERIALIZER.lock()...` comes before any other code in each test.

## Design reflection

Four points worth stopping on:

1. **The schema is the contract; the behavior comes later.** L7 ships the precompile address, the 128-byte calldata layout, and the 32-byte return shape. **Once published, contracts will start calling it.** If L8 changed the calldata layout, every contract built between would break. Locking the schema in L7 (even if behavior is incomplete) means the contract is stable from the day it's exposed.

2. **Rejection paths are tested before the happy path is fully wired.** Each rejection is a public API guarantee: "if you send malformed input, you'll get sentinel 0 back, never a panic, never a partial state mutation." These guarantees can be tested *before* the happy path does anything interesting — and locking them in early means the validation logic isn't an afterthought when L8 adds the real submit call.

3. **`AtomicU64` instead of `Mutex<u64>` for order IDs.** The choice was made based on the access pattern: ID allocation happens on every order placement, with no logical dependency on book state. Atomic increment is wait-free; mutex acquisition can block. **Pick the lighter primitive when the data has no synchronization invariants with other state.**

4. **`Ordering::Relaxed` is enough because the book has its own mutex.** The book's `Mutex` provides the synchronization for order-on-book visibility. The atomic counter provides ID uniqueness, but the IDs don't have any synchronization invariant with other writes. **Memory orderings should be picked from the *invariants you need*, not from "safer is better."**

## Answer key

```bash
cd ~/code/openhl-reference
git checkout a8823a1
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
```

After L7, your code is **close to Stage 9c but stops short** at one specific point: the `place_order` function in Stage 9c has a `book.submit(...)` call between order_id allocation and encoding. Your L7 version doesn't. The test `place_order_rejects_malformed_input` in Stage 9c also has `depth_bid() == 0` assertions; your L7 version doesn't. And Stage 9c has a `place_order_then_read_best_bid_round_trips` test; your L7 version doesn't. **Those are all L8.**

Return:

```bash
git checkout main
```

## Common questions

**Q: Why not just have `place_order` panic on malformed input?**
Because precompiles are called from Solidity, and a panic would propagate as a precompile error, reverting the entire transaction. A `0` return value lets the calling contract decide what to do: log, retry with corrected input, surface to the user. **Precompiles should fail soft when the failure is a caller bug.**

**Q: What's the difference between `AtomicU64::fetch_add(1, Relaxed)` and `fetch_add(1, SeqCst)`?**
Both are atomic in the sense that no two threads will get the same return value. The difference is in **memory ordering**: `SeqCst` adds memory fences that synchronize with all other `SeqCst` operations program-wide; `Relaxed` only guarantees that the increment itself is atomic, without any synchronization with other memory operations. For our case (a counter with no logical dependency on other state), `Relaxed` is enough and is faster.

**Q: Could we have an `EnumValueError` or similar for bad input?**
The `PrecompileFn` signature is `fn(...) -> PrecompileResult` where `PrecompileResult = Result<PrecompileOutput, PrecompileError>`. We *could* return `Err(...)` on malformed input, but that would propagate as an EVM-level error (transaction reverts). Returning `Ok` with sentinel 0 lets the calling contract handle the rejection gracefully. **This is a design choice: are precompile errors EVM-fatal or caller-visible?** For our case (validating user-supplied calldata), caller-visible is the better default.

**Q: What if someone submits an order at exactly `u64::MAX`?**
Eventually `NEXT_ORDER_ID.fetch_add(1, Relaxed)` will wrap around to 0 (it returns u64). At that point, the next allocation returns the sentinel 0 — and the caller treats it as "rejected." `u64` overflow at ~1.8e19 orders is roughly 18 quintillion order placements, which is fine for v0. Production should either use a wider counter or panic on near-overflow.

## Next lesson (L8)

L8 is one-line plus tests. The line: `clob.lock().expect("...").submit(Order { id, account, side, qty, order_type });` between order_id allocation and encoding. The tests: extend `place_order_rejects_malformed_input` to assert `book.depth_bid() == 0` after each rejection (the meaningful side-effect-check now that submit is wired), and replace `place_order_returns_nonzero_id_on_valid_input` with `place_order_then_read_best_bid_round_trips` — the two-precompile round-trip that proves writes via `0x...0c1c` are visible to reads via `0x...0c1b`. **That round-trip is Module 3's mid-stage milestone.**
````

---

## Seed-file slot

L7 lands in Module 3 (Write precompile) at sortOrder 0:

```typescript
{
  title: 'Lesson 7 — clob_place_order — calldata decoding scaffold',
  slug: 'openhl-precompiles-place-order-scaffold-en',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 40,
  xpReward: 80,
  content: `# Lesson 7 — \`clob_place_order\` — calldata decoding scaffold\n\n...`
},
```

## SHA pinning discipline

L7 cites `a8823a1` (Stage 9c). After L7 your code is close to Stage 9c but stops short of `book.submit(...)` and the round-trip test — those are L8.

## Style review notes (self-critique before paste)

- **§Goal frames L7 as "L2 of Module 3"** — the parallel structure helps readers anchor the new module to the now-familiar pattern from Module 2.
- **§Predict on ABI 32-byte padding** earns the calldata layout — a JS/TypeScript audience can be surprised by the waste.
- **§Step 2 on "starts at 1 not 0"** unpacks why the sentinel design works.
- **§Anti-fluency on `Relaxed` vs `SeqCst`** preempts the safety-first reflex.
- **§Anti-fluency on multi-validator caveat** justifies why the doc comment matters.
- **§Step 4's `_` prefix convention** explains the "parsed but unused" idiom.
- **§Anti-fluency on splitting tests** is reusable test-design advice.
- **§Design reflection 1** on "schema first, behavior later" is the central pedagogical point — locks the contract before locking the implementation.
- **L8 preview** is concrete: one line of code + 1 test change + 1 test replacement.
