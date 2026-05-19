# Building OpenHL Precompiles — L2 draft (EN) — build-along

> Drafted against openhl SHA `1761d4d` (Stage 9a — custom EVM with CLOB precompile boots via NodeBuilder).
> Course: `building-openhl-precompiles-en` (track: `reth-l1-architect`).

---

## L2 — `openhl-precompiles-read-hardcoded-en`

- **Module:** 1 (Custom EVM bootstrap), sortOrder 1 within module
- **Course-level sortOrder:** 1 (lesson 2 of 12)
- **Duration:** 30 min
- **XP reward:** 60
- **Type:** CONTENT

### Content

````markdown
# Lesson 2 — `clob_read_best_bid` — the first real precompile

## Goal

By the end of this lesson:

```bash
cargo check -p openhl-evm
```

…still compiles. Your `precompiles/mod.rs` is now the **full Stage 9a version**:

- A constant `CLOB_READ_BEST_BID: Address = 0x...0c1b` — the precompile's address.
- A constant `CLOB_BASE_GAS_COST: u64 = 500` — minimum gas charged per precompile call.
- A function `read_best_bid(input, gas_limit, reservoir) -> PrecompileResult` returning a hardcoded `(price=100, qty=10)` as 64 bytes.
- The `openhl_precompiles` function (no longer passthrough) extends the base set with our new precompile.

About 40 LOC added. The precompile is **registered but not yet wired to live CLOB state** — it returns hardcoded values. That's intentional: L3 tests that the precompile is *reachable* from EVM execution; L4-L5 swap the hardcoded values for live CLOB reads. **Function first, content later** — the same incremental pattern as L1's passthrough.

## Recap

After L1:

```rust
// crates/evm/src/precompiles/mod.rs (passthrough stub)
pub fn openhl_precompiles(base: &Precompiles) -> Precompiles {
    base.clone()
}
```

The function signature is fixed (L1 set the contract); the body just clones the input. L2 changes the body — same signature, more work inside.

## Plan

Four things, all in `crates/evm/src/precompiles/mod.rs`:

1. **Expand the imports** — add `Precompile`, `PrecompileId`, `PrecompileOutput`, `PrecompileResult` from `alloy_evm::revm::precompile`, and `address`, `Address`, `Bytes` from `alloy_primitives`.
2. **Add the address constant** — `CLOB_READ_BEST_BID: Address = 0x000...0c1b`. Public, so consumers (and tests) can call this precompile by name.
3. **Add the gas-cost constant + the `read_best_bid` function** — private. The function returns a hardcoded `(price=100, qty=10)` ABI-encoded as 64 bytes.
4. **Replace the passthrough** — `openhl_precompiles` clones the base set, then `extend`s with the new precompile registration.

The precompile is **callable** after this lesson but **dumb** — returns the same answer regardless of book state. L3 proves it's callable; L4-L5 make it smart.

> 🛑 **Predict.** Before scrolling: the EVM call shape from Solidity is `staticcall(gas, 0x...0c1b, calldata=empty, ...) → (price: u256, qty: u256)`. The precompile returns 64 bytes (two u256s). **Why 64 bytes and not 8 (two u32s) — surely a price and quantity fit in u32?** Hint: think about what types Solidity returns natively.

(Answer: Solidity's ABI encoding for `returns(uint256, uint256)` is 64 bytes — each value is *always* 32 bytes regardless of how many bits it actually needs. Our `u64` price fits in 8 bytes but the ABI pads it to 32. If we returned 8 bytes, Solidity would interpret it as a malformed `uint256` and likely revert. **The wire format matches Solidity's ABI, not our internal representation.**)

## Walk-through

### Step 1: Expand the imports

Open `crates/evm/src/precompiles/mod.rs`. The current imports (from L1) are:

```rust
use alloy_evm::revm::precompile::Precompiles;
```

Replace with:

```rust
use alloy_evm::revm::precompile::{
    Precompile, PrecompileId, PrecompileOutput, PrecompileResult, Precompiles,
};
use alloy_primitives::{address, Address, Bytes};
```

Six new types/macros:

- **`Precompile`** — the wrapper that pairs an `Address` with a `PrecompileFn`. The Precompiles set stores these.
- **`PrecompileId`** — an identifier (mainly for debugging / tracing). Use `PrecompileId::custom("clob_read_best_bid")`.
- **`PrecompileOutput`** — the success type returned from a precompile. Carries gas spent + output bytes + remaining gas reserve.
- **`PrecompileResult`** — `Result<PrecompileOutput, PrecompileError>`. Our v0 never errors so we always return `Ok(...)`.
- **`address`** macro — `address!("0x...")` creates a const `Address` at compile time.
- **`Address`, `Bytes`** — the two byte-array types used everywhere in EVM code.

> 🛑 **Anti-fluency.** "Couldn't I use `[u8; 20]` for the address and skip `alloy_primitives::Address`?" **No — the EVM ecosystem standardizes on `Address`, and `Precompile::new` requires it.** Trying to pass a `[u8; 20]` would either fail the type check or require `.into()` conversions everywhere. `Address` is the canonical EVM-address type; use it.

### Step 2: Add the precompile address constant

After the imports, before any functions, add:

```rust
/// Address of the "read best bid" precompile.
///
/// Solidity call shape: `staticcall(gas, 0x...0c1b, calldata=empty, ...) → (price: u256, qty: u256)`
pub const CLOB_READ_BEST_BID: Address = address!("0x0000000000000000000000000000000000000c1b");

/// The minimum gas charge for invoking a CLOB precompile. Tuned later.
const CLOB_BASE_GAS_COST: u64 = 500;
```

Two constants:

- **`CLOB_READ_BEST_BID`** — **`pub`**, because tests (L3) and downstream callers need to call this address. The `0x...0c1b` is a mnemonic for "CLB" (CLOB). Conventions:
  - addresses `1-9` are Ethereum's standard precompiles (ECDSA recovery, SHA-256, etc.)
  - we stay at 0x0c1b+ to avoid collisions
- **`CLOB_BASE_GAS_COST`** — **private**, an internal cost number. 500 gas is the per-call charge for any CLOB precompile. The real EVM math also charges memory expansion + per-byte cost; this is just the base.

The `pub` vs private split is intentional. Outside callers care about the address (to *call* the precompile); they don't care about the gas cost (the EVM handles that during dispatch).

### Step 3: Write the `read_best_bid` function

Below the constants:

```rust
/// Stage 9a stub: returns a hardcoded best bid so the precompile is callable
/// without requiring live CLOB state injection. Stage 9b replaces this with
/// an `Arc<Mutex<Book>>`-aware closure captured into the precompile.
///
/// `PrecompileFn` signature is `fn(&[u8], u64, u64) -> PrecompileResult`;
/// the third arg is a `reservoir` value (extra gas budget) that we ignore
/// at v0.
///
/// Encoding: 64 bytes total
///   bytes  0..32  big-endian u256 price (hardcoded 100)
///   bytes 32..64  big-endian u256 qty   (hardcoded 10)
// `PrecompileFn` signature mandates the `PrecompileResult` (i.e. `Result`)
// return type. Our v0 stub never errors — gas accounting is the EVM's
// responsibility — but the wrapper is structurally required.
#[allow(clippy::unnecessary_wraps)]
fn read_best_bid(_input: &[u8], _gas_limit: u64, _reservoir: u64) -> PrecompileResult {
    let mut out = vec![0u8; 64];
    // price = 100 (big-endian u256, rightmost byte holds the value)
    out[31] = 100;
    // qty = 10
    out[63] = 10;

    Ok(PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0))
}
```

Walk the body:

1. **`vec![0u8; 64]`** — 64 zero bytes. The ABI shape for `(uint256, uint256)` is two 32-byte blocks.
2. **`out[31] = 100`** — write the price (100) at the rightmost byte of the first 32-byte block. Big-endian u256 means the high-order bytes are zero and the low-order byte (index 31) holds the actual value. Same for qty at index 63.
3. **`PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0)`** — build the output:
   - First arg: gas spent (we charge 500).
   - Second arg: output bytes (the 64-byte buffer).
   - Third arg: reservoir (extra budget); we use 0.

The three function arguments are all `_`-prefixed (unused) because the v0 stub:
- Doesn't read input (the call has empty calldata).
- Doesn't respect gas_limit (the EVM handles overflow checking).
- Ignores reservoir (advanced feature we don't need).

`#[allow(clippy::unnecessary_wraps)]` silences the lint that says "this function always returns `Ok(...)`, just return the unwrapped type." We **can't** unwrap because the `PrecompileFn` trait signature **requires** `PrecompileResult`. The lint is wrong here; the attribute is the right response.

> 🛑 **Anti-fluency.** "Hardcoded `100, 10` feels like a TODO — surely I should leave it `unimplemented!()` until L4 has the real data?" **The hardcoded value is the entire point of Stage 9a.** It lets the *next* lesson (L3) prove the precompile is *reachable* without needing CLOB state injection working yet. If we left it `unimplemented!()`, the L3 test would panic and we couldn't isolate "is the precompile callable?" from "does it return the right value?" **Hardcoded stubs let you test the wiring before testing the content.**

### Step 4: Replace the passthrough `openhl_precompiles`

Find the current passthrough function:

```rust
#[must_use]
pub fn openhl_precompiles(base: &Precompiles) -> Precompiles {
    // L2 will replace this with `let mut precompiles = base.clone();
    // precompiles.extend([...]); precompiles`.
    base.clone()
}
```

Replace with the full implementation:

```rust
/// Build a `Precompiles` set that extends Reth's standard precompiles with
/// openhl's CLOB-reading additions. The base set is parameterized over the
/// hardfork's spec id so we inherit Ethereum's evolution (e.g., the
/// BLS-12-381 precompiles activated in Prague).
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

Three lines of body:

1. **`let mut precompiles = base.clone()`** — start with the base set. We can't mutate `base` directly (it's `&Precompiles`); cloning is the only way to get an owned, mutable copy.
2. **`precompiles.extend([Precompile::new(...)])`** — add our precompile to the set. `extend` accepts an iterator of `Precompile`s; passing an array of length 1 works because arrays implement `IntoIterator`.
3. **Return `precompiles`** — owned `Precompiles` with our addition included.

The `Precompile::new(...)` call creates a new entry from three pieces:
- A `PrecompileId` (the human-readable name, useful for debugging/tracing).
- The `Address` it's registered at.
- The function to call.

L7+ will add a second `Precompile::new(...)` for `clob_place_order`. The pattern stays: clone, extend, return.

## Test

```bash
cargo check -p openhl-evm
```

Still clean. The precompile is now registered, but no test exercises it yet — that's L3.

Optionally, you can verify the precompile address is exported correctly:

```bash
grep -r "CLOB_READ_BEST_BID" crates/evm/src/
# Should report: precompiles/mod.rs declares the const
```

Common errors and fixes:

- **`error[E0432]: unresolved import 'alloy_evm::revm::precompile::Precompile'`** — typo in the import list. The correct path is `alloy_evm::revm::precompile::{Precompile, PrecompileId, PrecompileOutput, PrecompileResult, Precompiles}`.
- **`error: expected struct, found macro 'address'`** — you imported `address` from the wrong place. It's the `address!` macro from `alloy_primitives`; make sure the import list includes `address` (lowercase, the macro).
- **`out[31] = 100u8` overflow lint** — `100` is already `i32`, the conversion to `u8` is fine, but if clippy complains, write `out[31] = 100;` (no type annotation needed).
- **`out[63] = 10` not appearing in the assertion** — your `read_best_bid` is reading from the wrong index. Double-check that index 31 is for price (first 32 bytes) and index 63 is for qty (second 32 bytes).
- **`#[allow(clippy::unnecessary_wraps)]` clippy still complains** — the attribute needs to be on the function, not on a containing block. Place it directly above `fn read_best_bid(...)`.

## Design reflection

Three load-bearing decisions encoded here:

1. **The address constant is `pub`; the gas-cost constant is private.** External callers (tests, smart contracts) need to know *where* to call the precompile. They don't need to know *how much* it costs — the EVM handles that internally. Public vs private mapping reflects the API surface.

2. **The function takes `(&[u8], u64, u64)` — all unused at v0.** The `PrecompileFn` trait fixes the signature; we have to accept those arguments even when we don't use them. The underscore-prefix convention (`_input`, `_gas_limit`, `_reservoir`) tells the compiler "we know they're here, we don't need them yet." L7+ uses `_input` to decode order data.

3. **The 64-byte output is ABI-shaped, not internally-shaped.** A 64-bit price could fit in 8 bytes, but Solidity expects `(uint256, uint256)` as 64 bytes total. Matching the ABI at the wire format means we can write `read_best_bid()` in Solidity directly. The internal `Qty(u64)` types are an implementation detail.

## Answer key

```bash
cd ~/code/openhl-reference
git checkout 1761d4d
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
```

After L2, your `precompiles/mod.rs` should be **functionally identical** to the reference at `1761d4d`. Only doc-comment wording will differ.

Return:

```bash
git checkout main
```

## Common questions

**Q: Why `PrecompileId::custom("clob_read_best_bid")` and not just an enum variant?**
Because `PrecompileId` is an opaque identifier mostly used by REVM's logging/tracing layer. Custom precompiles use string names because they're outside the standard set. The string is human-readable; if a precompile call shows up in a trace, you see "clob_read_best_bid" not a numeric variant.

**Q: What if I want to add error handling?**
Change the return path from `Ok(...)` to `Err(PrecompileError::Other(...))`. The trait already supports this; we just don't have failure modes at v0. When the read precompile gains live state (L4-L5), one possible error is "CLOB lock is poisoned" — that would map to `PrecompileError`.

**Q: Why is `Bytes::from(out)` needed — can I return `Vec<u8>` directly?**
No, the trait wants `Bytes` (alloy's reference-counted byte buffer, not Rust's std `Vec<u8>`). `Bytes::from(vec)` does the conversion. The reason for the wrapper type: `Bytes` can be cheaply cloned and shared across the EVM internals without re-allocating.

**Q: Could a smart contract pass arguments via calldata to read_best_bid?**
Yes — calldata is the `_input` parameter. At v0 the precompile ignores it (returns the best bid regardless), but production code would use calldata to specify *which market's* best bid to read. The current setup is single-market; multi-market support would add `_input` decoding.

## Next lesson (L3)

The precompile is registered but **untested**. L3 wires the executor builder into NodeBuilder + a smoke test that boots a Reth node with our custom EVM and verifies the precompile is callable at `CLOB_READ_BEST_BID`. The test is small (~60 LOC) but exercises the full toolchain: custom EVM, executor builder, NodeBuilder integration, EVM call dispatch, precompile registry lookup. After L3, we have a Reth node where smart contracts can call `0x...0c1b` and get back `(100, 10)`.
````

---

## Seed-file slot

L2 lands in Module 1 (Custom EVM bootstrap) at sortOrder 1:

```typescript
{
  title: 'Lesson 2 — clob_read_best_bid — the first real precompile',
  slug: 'openhl-precompiles-read-hardcoded-en',
  type: 'CONTENT',
  sortOrder: 1,
  duration: 30,
  xpReward: 60,
  content: `# Lesson 2 — \`clob_read_best_bid\` — the first real precompile\n\n...`
},
```

## SHA pinning discipline

Same SHA `1761d4d` (Stage 9a). After L2, `precompiles/mod.rs` is functionally identical to the reference modulo doc comments.

## Style review notes (self-critique before paste)

- **§Plan's "Function first, content later"** echoes L1's stub-then-fill pattern — same incremental construction.
- **§Predict on 64-byte ABI** is the conceptual key — readers from a Rust-centric mindset would default to "just enough bytes," but the EVM ABI dictates 32-byte blocks regardless.
- **§Step 3's walk-through** unpacks what looks like 8 lines into the ABI encoding semantics.
- **3 anti-fluency callouts**: (a) `Address` not `[u8; 20]`, (b) hardcoded stub is intentional (tests wiring not content), (c) `#[allow(clippy::unnecessary_wraps)]` rationale.
- **§Common questions on `PrecompileId`** explains a detail readers will wonder about but might not bother asking.
- **L3 preview names the smoke test scope** — small but exercises the full toolchain.
