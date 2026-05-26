# Building OpenHL Precompiles — L5 draft (EN) — build-along

> Drafted against openhl SHA `b635ef7` (Stage 9b — live CLOB state in the CLOB read precompile).
> Course: `building-openhl-precompiles-en` (track: `reth-l1-architect`).

---

## L5 — `openhl-precompiles-swap-to-live-en`

- **Module:** 2 (Read precompile), sortOrder 1 within module
- **Course-level sortOrder:** 4 (lesson 5 of 12)
- **Duration:** 40 min
- **XP reward:** 80
- **Type:** CONTENT

### Content

````markdown
# Lesson 5 — `read_best_bid` reads the wire — swap to `current_best_bid()`

## Goal

Concepts you'll grasp in this lesson:

- **Uninstalled-returns-zero is "uninitialised storage slot" semantics** — Solidity contracts naturally handle a zero from `STATICCALL` as "no liquidity" and decline to trade. Erroring instead would revert every transaction during boot.
- **Constant-time precompile = gas charging shouldn't leak state** — charging less gas when no CLOB is installed would let attackers measure gas to detect validator state. A flat `CLOB_BASE_GAS_COST` keeps the precompile's wall-clock-shape uniform.
- **`cargo test` runs in parallel → process-globals race → need a serializer** — once two tests touch the same `CLOB_STATE`, parallel execution makes the global flap between `Some(clob_A)` and `None` within one test's lifetime. A `Mutex<()>` named `TEST_SERIALIZER` is the fix.
- **`TEST_SERIALIZER` is per-module, not per-crate** — narrow the serialization to the tests that actually need it; tests that don't touch `CLOB_STATE` shouldn't pay the cost.
- **Uninstall at *start* of test, not end** — panicked tests skip their cleanup code; the next test's start-of-test reset is the safety net. End-of-test uninstall is decoration.

Verification:

```bash
cargo test -p openhl-evm --release
```

…still passes (42 tests).

Specific changes:

But internally, the precompile now reads **live state** instead of hardcoded values:

- **`read_best_bid` body swapped** — drops the `let mut out = vec![0, 0, ..., 100, 0, 0, ..., 10]` hardcode in favor of `if let Some((price, qty)) = current_best_bid() { ... write into out ... }`. No CLOB installed → 64 zero bytes (matches "uninitialised perp market" semantic).
- **L3's `read_best_bid_returns_hardcoded_price_and_qty` test renamed** to `read_best_bid_returns_zero_when_no_clob_installed` — same shape, asserts zero instead of 100/10.
- **L3's `registered_precompile_is_invokable_via_registry` updated** — same logic, but it now uninstalls any CLOB first and expects zero output.
- **New `static TEST_SERIALIZER: Mutex<()>` added at the top of the test module** — every test that touches `CLOB_STATE` takes this lock first. Parallel `cargo test` would otherwise race on the global.

The course-7 + L3 path-of-callability tests still pass; the assertions just changed. **The big proof — "live CLOB data round-trips to EVM output" — is L6.** L5 makes the swap; L6 demonstrates it works end-to-end.

## Recap

After L4:

- `Book` has `best_bid_with_qty` / `best_ask_with_qty`.
- `precompiles/mod.rs` has the `CLOB_STATE` static + 3 module fns.
- `LiveRethEvmBridge::new` calls `install_clob(Arc::clone(&clob))`.
- **But `read_best_bid` still returns hardcoded `(100, 10)`** — none of this plumbing is exercised.

L5 finally exercises it.

## Plan

Four edits to `crates/evm/src/precompiles/mod.rs`:

1. **Swap `read_best_bid`'s body** — call `current_best_bid()` and only write nonzero bytes if it returns `Some`.
2. **Update the function's doc comment** — the hardcode language goes away; replace with "0 if no bid or no CLOB installed" semantic.
3. **Add `static TEST_SERIALIZER: Mutex<()>` to the test module.**
4. **Rename + rewrite L3's first test** + **update L3's last test** — both touch `CLOB_STATE` so both take the serializer lock and call `uninstall_clob()` first.

Module-level signatures don't change. The registry test (`openhl_precompiles_registers_clob_address`) doesn't touch `CLOB_STATE` and stays as-is.

> 🛑 **Predict.** Before scrolling: `cargo test` runs tests **in parallel by default** (one thread per logical CPU, typically). Two of our tests now read or write `CLOB_STATE`. **What's the failure mode if we don't serialize them?** Hint: think about what could be `Some(clob_A)` momentarily when a test expects `None`.

(Answer: **flaky tests**. Test A installs a CLOB, test B is meant to assert "no CLOB → zero output," but if B runs between A's `install_clob` and A's `uninstall_clob`, B sees A's CLOB and asserts the wrong values. The failure rate depends on test scheduling — sometimes 0%, sometimes 30%. CI flakes randomly. The `TEST_SERIALIZER` mutex pattern forces these tests to run one at a time, eliminating the race. **Cost: 0.0 seconds — these tests run in microseconds. Benefit: deterministic CI.**)

## Walk-through

### Step 1: Swap `read_best_bid`'s body

Open `crates/evm/src/precompiles/mod.rs`. Find the current L2/L3 body:

```rust
#[allow(clippy::unnecessary_wraps)]
fn read_best_bid(_input: &[u8], _gas_limit: u64, _reservoir: u64) -> PrecompileResult {
    // Hardcoded: price=100, qty=10, both as big-endian u256 (32 bytes each).
    let mut out = vec![0u8; 64];
    out[31] = 100;  // price (last byte of first 32-byte word)
    out[63] = 10;   // qty   (last byte of second 32-byte word)
    Ok(PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0))
}
```

Replace with:

```rust
#[allow(clippy::unnecessary_wraps)]
fn read_best_bid(_input: &[u8], _gas_limit: u64, _reservoir: u64) -> PrecompileResult {
    let mut out = vec![0u8; 64];

    if let Some((price, qty)) = current_best_bid() {
        // Big-endian u256: rightmost bytes carry the value.
        out[24..32].copy_from_slice(&price.0.to_be_bytes());
        out[56..64].copy_from_slice(&qty.0.to_be_bytes());
    }
    // If no CLOB is installed or there are no bids, `out` stays all zeros —
    // matches what an uninitialised perp market would return on mainnet.

    Ok(PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0))
}
```

Three things changed:

- **`let mut out = vec![0u8; 64]`** — same start, all zeros.
- **`if let Some((price, qty)) = current_best_bid()`** — read the global. `None` short-circuits the body; `out` stays zero.
- **`out[24..32].copy_from_slice(&price.0.to_be_bytes())`** — `Price` wraps a `u64`. `to_be_bytes()` returns `[u8; 8]`. We copy those 8 bytes into the **last 8 bytes** of the 32-byte word (positions 24..32). The leading 24 bytes are zero — that's the big-endian u256 encoding of a u64 value.
- **Same for qty at `out[56..64]`** — second 32-byte word, last 8 bytes.
- **Hardcoded `out[31] = 100` and `out[63] = 10`** are gone.

Why `out[24..32]` is the right "magic number" pops out the moment you draw the whole 64-byte buffer:

```
                       ┌──── slot 1: price (u256 BE, 32 bytes) ──────┐ ┌──── slot 2: qty (u256 BE, 32 bytes) ────────┐
   byte index:          0    ...    23   24    25    ...    30    31     32    ...    55   56    57    ...    62    63
                       ┌────────────┬────┬────┬─────────────┬────┬────┐  ┌────────────┬────┬────┬─────────────┬────┬────┐
   memory:             │ 00 ... 00  │ p7 │ p6 │ ........... │ p1 │ p0 │  │ 00 ... 00  │ q7 │ q6 │ ........... │ q1 │ q0 │
                       └────────────┴────┴────┴─────────────┴────┴────┘  └────────────┴────┴────┴─────────────┴────┴────┘
                        ↑           ↑                            ↑       ↑           ↑                            ↑
                        │           │                            │       │           │                            │
                       high 24 B    └── price.0.to_be_bytes() ───┘      high 24 B    └── qty.0.to_be_bytes() ─────┘
                       (zero pad)         [u8; 8] fits exactly           (zero pad)         [u8; 8] fits exactly
                                          ┃                                                 ┃
                                          ▼                                                 ▼
                                  out[24..32] (8-byte slice)                        out[56..64] (8-byte slice)
                                  .copy_from_slice(&price.0.to_be_bytes())          .copy_from_slice(&qty.0.to_be_bytes())


   By the numbers:
     ・Slot 1 spans bytes 0..32 (one u256 BE).
     ・The top 24 bytes (0..24) stay zero-padded (already zeroed by vec![0u8; 64]).
     ・The bottom 8 bytes (24..32) take the u64 directly in big-endian → the whole slot
       reads as a "u64 zero-extended into a u256."
     ・Slot 2 is just the same shape shifted +32 bytes.

   Bottom line: 24..32 and 56..64 are "where the u64 (8 bytes) slides into the right
   edge of a u256 (32 bytes)." Not magic — just (32 − 8 = 24) and (64 − 8 = 56).
```

The optimization at work: **u64 BE bytes go directly into the right-edge 8 bytes of a u256 BE word; no intermediate `[u8; 32]` is allocated.** Going through `U256::from(price.0).to_be_bytes::<32>().copy_from_slice(...)` lands on the same result but costs you (a) a stack-allocated 32-byte zero-init and (b) a 32-byte memcpy from that array into `out`. The direct write is one 8-byte memcpy — and the leading zeros are already guaranteed by the initial `vec![0u8; 64]`, so zero-extension comes free.

> 🛑 **Anti-fluency.** "Why not `U256::from(price.0).to_be_bytes::<32>().copy_from_slice(...)` for clarity?" **It allocates** a temporary `[u8; 32]` array, then copies it byte-by-byte. The direct `out[24..32].copy_from_slice(&price.0.to_be_bytes())` writes directly into the output buffer with no intermediate allocation. **Same result, half the work.** Precompiles are hot paths — every microsecond compounds.

### Step 2: Update the doc comment

The L2 doc comment was hardcode-centric:

```rust
/// Returns hardcoded best-bid data as two big-endian u256s (64 bytes total).
/// Stage 9a's purpose is to prove the precompile is reachable from EVM execution;
/// Stage 9b will swap in live CLOB state.
///
/// Encoding:
///   bytes  0..32  big-endian u256 = 100 (price)
///   bytes 32..64  big-endian u256 = 10  (qty)
```

Replace with the live-state version:

```rust
/// Reads the best bid (highest-priced buy order's price + total qty at that
/// level) from the currently-installed CLOB and returns it as two
/// big-endian u256s (64 bytes total).
///
/// Encoding:
///   bytes  0..32  big-endian u256 price (0 if no bid or no CLOB installed)
///   bytes 32..64  big-endian u256 qty   (0 if no bid or no CLOB installed)
///
/// `PrecompileFn` signature is `fn(&[u8], u64, u64) -> PrecompileResult`;
/// the third arg is a `reservoir` value (extra gas budget) that we ignore
/// at v0. The Result wrapper is required by the signature even though we
/// never error — gas accounting is the EVM's responsibility.
```

The "0 if no bid or no CLOB installed" line is load-bearing — it formalizes the API contract that mainnet contracts have to handle. **Smart contracts can't tell the difference between "uninstalled" and "empty book"** — both look like zero. That's intentional; contracts that need to distinguish them must check liveness through some other path.

### Step 3: Add `TEST_SERIALIZER` to the test module

Open the `#[cfg(test)] mod tests` block (added in L3). After the `use` statements, before the test functions:

```rust
/// Tests in this module touch process-global `CLOB_STATE`. This mutex
/// serializes them so parallel test execution can't observe a torn state.
static TEST_SERIALIZER: Mutex<()> = Mutex::new(());
```

One line. Plain `Mutex<()>` (unit type as payload — we never inspect the value, only the lock). Each test that touches `CLOB_STATE` opens with:

```rust
let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
```

The `unwrap_or_else(PoisonError::into_inner)` pattern is **critical** — without it, one panicking test poisons the mutex and every subsequent test fails with `PoisonError` instead of running. Recovering from poison turns "this test panicked once" into "this test panicked once and subsequent tests still get to run." The recovered guard still grants exclusive access; poison is just a signal, not a permanent disability. If type inference ever gets noisy in your toolchain, prefer the explicit closure form: `unwrap_or_else(|e| e.into_inner())`.

> 🛑 **Anti-fluency.** "Couldn't we use `#[serial]` from the `serial_test` crate instead?" **You could, but it's a dev-dep for what one mutex does.** `serial_test` reaches for proc-macros, attribute parsing, and a hash-keyed lock map. For 4 tests touching one global, a 1-line `static Mutex<()>` is right-sized. **Reach for the crate when you have many globals with different lock partitions; not before.**

### Step 4: Update L3's first test (rename + rewrite)

L3 had:

```rust
/// Direct unit test — the function should produce the L2 hardcoded
/// values. This is the lowest-level check before integrating into the registry.
#[test]
fn read_best_bid_returns_hardcoded_price_and_qty() {
    let result = read_best_bid(&[], 100_000, 0).expect("precompile must not error");
    assert_eq!(result.bytes.len(), 64);
    let price = U256::from_be_slice(&result.bytes[0..32]);
    let qty = U256::from_be_slice(&result.bytes[32..64]);
    assert_eq!(price, U256::from(100u64));
    assert_eq!(qty, U256::from(10u64));
    assert_eq!(result.gas_used, CLOB_BASE_GAS_COST);
}
```

Replace with:

```rust
/// With no CLOB installed, the precompile returns 64 zero bytes —
/// matching what an uninitialised perp market would report on mainnet.
#[test]
fn read_best_bid_returns_zero_when_no_clob_installed() {
    let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
    uninstall_clob();

    let result = read_best_bid(&[], 100_000, 0).expect("precompile must not error");
    assert_eq!(result.bytes.len(), 64);
    let price = U256::from_be_slice(&result.bytes[0..32]);
    let qty = U256::from_be_slice(&result.bytes[32..64]);
    assert_eq!(price, U256::ZERO);
    assert_eq!(qty, U256::ZERO);
    assert_eq!(result.gas_used, CLOB_BASE_GAS_COST);
}
```

Five differences from L3:

1. **Renamed** — function name now describes the new semantic.
2. **Doc comment rewritten** — explains the "uninstalled = zero" semantic.
3. **First line: take `TEST_SERIALIZER`.**
4. **Second line: `uninstall_clob()`.** Why? Because earlier tests may have installed a CLOB and forgotten to clean up, or a previous test run may have left state. Calling `uninstall_clob()` is idempotent — safe to call always — and it guarantees a known starting state.
5. **Assertions changed** — `U256::ZERO` instead of `U256::from(100u64)` / `U256::from(10u64)`. The gas check is unchanged (the precompile always charges the same gas regardless of what it returns).

> 🛑 **Anti-fluency.** "Calling `uninstall_clob()` at the start of every test is wasteful if it's already uninstalled." **`uninstall_clob` is `*CLOB_STATE.write().expect(...) = None`** — one acquired-and-released write lock, microseconds. The alternative is a global "test setup" function with shared init order, which is a much bigger lift for a much smaller saving. **Explicit per-test reset is the canonical Rust testing pattern when global state is involved.**

### Step 5: Update L3's last test

L3's `registered_precompile_is_invokable_via_registry` had:

```rust
#[test]
fn registered_precompile_is_invokable_via_registry() {
    let extended = openhl_precompiles(Precompiles::cancun());
    let precompile = extended
        .get(&CLOB_READ_BEST_BID)
        .expect("CLOB precompile must be registered");

    let result = precompile
        .execute(&[], 100_000, 0)
        .expect("call must not error");
    assert_eq!(result.bytes.len(), 64);
    let price = U256::from_be_slice(&result.bytes[0..32]);
    assert_eq!(price, U256::from(100u64));  // L3 hardcoded expectation
}
```

Replace with:

```rust
/// Invoke the registered precompile end-to-end through the registry
/// (rather than calling `read_best_bid` directly). This proves the
/// registration is wired such that an EVM dispatch to the address hits
/// our function — the same path Reth's EVM uses on `staticcall` to
/// `CLOB_READ_BEST_BID`.
#[test]
fn registered_precompile_is_invokable_via_registry() {
    let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
    uninstall_clob();

    let extended = openhl_precompiles(Precompiles::cancun());
    let precompile = extended
        .get(&CLOB_READ_BEST_BID)
        .expect("CLOB precompile must be registered");

    // Precompile::execute is the public dispatch method — same as what
    // the EVM calls internally when a contract STATICCALLs the address.
    let result = precompile
        .execute(&[], 100_000, 0)
        .expect("call must not error");
    assert_eq!(result.bytes.len(), 64);
    // No CLOB → zero output, matching read_best_bid_returns_zero_when_no_clob_installed.
    let price = U256::from_be_slice(&result.bytes[0..32]);
    assert_eq!(price, U256::ZERO);
}
```

Three differences from L3:

1. **Open with `TEST_SERIALIZER` + `uninstall_clob`** — same pattern as test 1.
2. **Doc comment** — added (L3 didn't have one); explains why this test exists alongside the unit test.
3. **`assert_eq!(price, U256::ZERO)`** — was `U256::from(100u64)`.

The middle test (`openhl_precompiles_registers_clob_address`) doesn't touch `CLOB_STATE` — it just checks registry membership. **Don't add serializer + uninstall to it** — that would be unnecessary serialization and a subtle slowdown.

## Test

```bash
cargo test -p openhl-evm --release
```

After ~30 seconds:

```
running 42 tests
... 42 pass ...

test result: ok. 42 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

Same test count as L4 (42). What's different:
- 2 of the 4 tests touching the precompile now run **serialized** (via `TEST_SERIALIZER`).
- The 2 modified tests now assert **zero output** instead of `(100, 10)`.

Try this experiment if you want intuition for what the serializer prevents:

```bash
# Temporarily delete the `let _g = TEST_SERIALIZER.lock()...` lines from both tests.
cargo test -p openhl-evm read_best_bid -- --test-threads=8
# Run it ~20 times.
for i in $(seq 1 20); do
  cargo test -p openhl-evm read_best_bid -- --test-threads=8 --quiet 2>&1 | grep "test result"
done
```

You may see occasional failures — depends on scheduling. Put the lines back when done.

Common errors and fixes:

- **`unused import: Order, OrderId, OrderType, Side`** — these were used by L3's hardcoded test (no longer needed by L5's zero-output test). **Keep them** — L6 will use them for the live-state test. The unused warning is harmless for one lesson.
  - If your `#[cfg(test)] mod tests` had `use openhl_clob::{...};` covering these, leave it. L6 needs it.
- **`error[E0599]: no method named 'lock' found for struct 'Mutex<()>'`** — you imported `Mutex` from somewhere else (e.g., `tokio::sync::Mutex`). The test module's `use super::*;` should bring `std::sync::Mutex` in from the parent module.
- **Test passes once, fails after — `PoisonError`** — one test panicked while holding `TEST_SERIALIZER`. The `unwrap_or_else(PoisonError::into_inner)` pattern is what recovers from this; check that both tests use that exact form.
- **Tests pass when run individually, fail in parallel** — `TEST_SERIALIZER` not actually applied. Verify `let _g = TEST_SERIALIZER.lock().unwrap_or_else(...)` is the **first** statement (before `uninstall_clob()`). If `_g` is dropped early (e.g., shadowed), the lock releases mid-test.

## Design reflection

Three load-bearing decisions encoded here:

1. **Uninstalled CLOB returns zeros, not an error.** The mainnet equivalent is "uninitialised storage slot returns zero" — Solidity contracts naturally handle this. If we errored, calling the precompile during boot (before the bridge has installed its CLOB) would revert the transaction. Returning zero degrades gracefully: contracts see "no liquidity" and decline to trade, which is the right behavior.

2. **`TEST_SERIALIZER` is per-module, not global.** A test in `live_node.rs` that doesn't touch `CLOB_STATE` shouldn't be serialized with these. Module-local mutex keeps the partition narrow.

3. **Tests call `uninstall_clob()` at start, not at end.** Why not symmetric? Because **panicked tests don't run their cleanup code.** A panic mid-test would leave a CLOB installed; the next test's "starting cleanup" picks up the slack. We do still uninstall at the end of the live-state test (L6) for clarity — but the safety net is the start-of-test reset.

## Answer key

```bash
cd ~/code/openhl-reference
git checkout b635ef7
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
```

After L5, your code is **very close** to Stage 9b — same `read_best_bid` body, same `TEST_SERIALIZER`, same two updated tests. The only diff: Stage 9b also has `read_best_bid_returns_live_state_when_clob_installed`, which L6 adds.

Return:

```bash
git checkout main
```

## Common questions

**Q: Why doesn't `read_best_bid` charge less gas when there's no CLOB installed?**
You could make it conditional — return less gas when `current_best_bid()` is `None`. But that exposes implementation details: an attacker could measure gas to detect whether your validator has installed a CLOB. Charging a flat `CLOB_BASE_GAS_COST` is the standard "constant-time precompile" pattern. Gas charging shouldn't leak state.

**Q: What's the difference between `u64::to_be_bytes()` and `U256::to_be_bytes::<32>()`?**
`u64::to_be_bytes()` returns `[u8; 8]` — 8 bytes. `U256::to_be_bytes::<32>()` returns `[u8; 32]` — 32 bytes with zero-padding on the left. **For our use case (8-byte source value, 32-byte destination), we want the 8-byte source-shape copied into the rightmost 8 bytes of the destination.** That's `out[24..32].copy_from_slice(&u64_bytes)`. The U256 version would copy 32 bytes total (24 of which are zero) — same result, 4x the work.

**Q: Will the test be flaky even with `TEST_SERIALIZER`?**
Not under normal `cargo test` execution. The mutex guarantees no two test threads observe `CLOB_STATE` mid-modification. Edge cases that could still flake: (a) panic during `current_best_bid` poisoning the mutex (recovered via `into_inner`), (b) external code (outside the test module) writing to `CLOB_STATE` (only an issue if integration tests in `reth_node.rs` start touching it — they don't yet).

**Q: Couldn't we just pass the CLOB through the precompile's input bytes?**
A smart contract calls precompiles via `staticcall(gas, addr, input, output)`. The input is calldata the contract has constructed — there's no way for the **node operator** to splice in a CLOB pointer. The precompile's input bytes are user-controlled, not node-controlled. Process-global state is the only injection point a node operator has.

## Next lesson (L6)

The wire is hot but no test exercises the round-trip. L6 adds `read_best_bid_returns_live_state_when_clob_installed`: install a CLOB with a known bid, call the precompile, verify the bid round-trips into the output bytes. The proof — `Solidity contract → STATICCALL → EVM dispatch → REVM precompile registry → our function → live Book lock → return encoded → contract sees real data` — is finally end-to-end demonstrated. This is the **Module 2 milestone**.
````

---

## Seed-file slot

L5 lands in Module 2 (Read precompile) at sortOrder 1:

```typescript
{
  title: 'Lesson 5 — read_best_bid reads the wire — swap to current_best_bid()',
  slug: 'openhl-precompiles-swap-to-live-en',
  type: 'CONTENT',
  sortOrder: 1,
  duration: 40,
  xpReward: 80,
  content: `# Lesson 5 — \`read_best_bid\` reads the wire — swap to \`current_best_bid()\`\n\n...`
},
```

## SHA pinning discipline

L5 cites `b635ef7` (Stage 9b). After L5 your code matches Stage 9b except for the live-state proof test (added in L6).

## Style review notes (self-critique before paste)

- **§Plan's "wire is now hot but nothing exercises the round-trip"** frames why L5 and L6 are separate lessons — L5 is the swap mechanics + test machinery, L6 is the proof.
- **§Predict on parallel-test races** earns the `TEST_SERIALIZER` pattern; readers without test-isolation experience need the concrete failure mode.
- **§Step 1's `out[24..32]` vs `U256::to_be_bytes::<32>()`** distinguishes "right for a hot path" from "right for clarity."
- **§Step 3's `unwrap_or_else(PoisonError::into_inner)`** preempts the common mistake of `unwrap()` on a poisoned mutex.
- **§Anti-fluency on `serial_test` crate** justifies the manual mutex.
- **§Design reflection point 3 (start-of-test reset)** explains why we don't bother with end-of-test cleanup as the primary safety net.
- **L6 preview** names the milestone — Module 2 closes when the round-trip is proven.
