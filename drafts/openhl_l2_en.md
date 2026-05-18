# Building OpenHL — L2 draft (EN) — C2 build-along rewrite

> Drafted against openhl SHA `13113db` (Stage 4: ConsensusBridge trait and CL/EL contract types). This lesson covers the **types** portion of that commit; L3 covers the trait.
> Course: `building-openhl-consensus-en` (track: `reth-l1-architect`, course #6 of 10).

---

## L2 — `openhl-contract-types-en`

- **Module:** 2 (Contract types), sortOrder 0 within module
- **Course-level sortOrder:** 1 (lesson 2 of 15)
- **Duration:** 30 min
- **XP reward:** 60
- **Type:** CONTENT

### Content

````markdown
# Lesson 2 — Shared contract types in `openhl-types`

## Goal

By the end of this lesson:

```bash
cargo test -p openhl-types
```

…passes 4 tests covering the 5 contract primitives you wrote. The `openhl-types` crate becomes the **shared vocabulary** that consensus and EVM both depend on — the only crate either side imports for these types. No application logic yet; just data definitions that the contract trait (L3) will reference.

## Recap

After L1, your workspace looks like this:

```
~/code/my-openhl/
├── Cargo.toml          # workspace root with Reth + Malachite pinned
├── Cargo.lock          # full lock file (Reth/Malachite resolved)
├── rust-toolchain.toml # rustc 1.95.0
├── bin/openhl/         # binary that prints "openhl v0.1.0"
├── crates/
│   ├── types/          # empty — `//! Shared primitives...` doc comment only
│   ├── codec/
│   ├── clob/
│   ├── consensus/      # empty
│   ├── evm/            # empty
│   ... (6 more empty crates) ...
└── target/             # cached compilation
```

`cargo check --workspace` passes. `cargo test -p openhl-types` runs zero tests successfully.

## Plan

You'll add 5 contract types to `crates/types/src/lib.rs`:

| Type | Shape | Role in the contract |
| - | - | - |
| `BlockHash` | `pub struct BlockHash(pub [u8; 32])` | 32-byte hash, Ethereum convention. Used everywhere a block is referenced. |
| `PayloadId` | `pub struct PayloadId(pub u64)` | Returned by `build_payload`; passed to `payload_ready`. |
| `PayloadAttrs` | `pub struct PayloadAttrs { timestamp, fee_recipient, prev_randao }` | Inputs to a payload-build job. |
| `PayloadStatus` | `pub enum PayloadStatus { Valid, Invalid, Syncing }` | Verdict from `validate_payload`. |
| `ExecutedBlock` | `pub struct ExecutedBlock { hash, parent_hash, number, state_root }` | What a consensus round commits to. |

Plus one `Display` impl on `BlockHash` (so logs print `0xab12...` instead of `BlockHash([171, 18, ...])`).

Plus 4 unit tests covering: BlockHash hex display, PayloadStatus equality, ExecutedBlock cloneability, BlockHash serde round-trip.

These five types are the **shared vocabulary** of the CL↔EL contract. Both the consensus crate and the evm crate will import them. They live in `openhl-types` (a third crate) — not in `openhl-consensus` and not in `openhl-evm` — for a reason explored in §Design reflection below.

> 🛑 **Predict.** Look at the 5 types in the table above. **Why is `PayloadStatus` an enum with three variants (Valid/Invalid/Syncing), not just `bool`?** Hint: think about what a consensus node should do when the EL gives each answer. Three different actions, not two.

## Walk-through

### Step 1: Open `crates/types/src/lib.rs`

The current contents (from L1):

```rust
//! Shared primitives and CL/EL contract types.
```

You'll add type definitions below this comment.

### Step 2: Verify `serde` is available in `Cargo.toml`

L1 set up `crates/types/Cargo.toml` with:

```toml
[dependencies]
serde = { workspace = true }
```

That's correct; we'll use it for the `#[derive(Serialize, Deserialize)]` lines. No edit needed.

### Step 3: Add imports

Edit `crates/types/src/lib.rs`. After the doc comment, add:

```rust
//! Shared primitives and CL/EL contract types.

use std::fmt;

use serde::{Deserialize, Serialize};
```

`std::fmt` for the `Display` impl we'll add to `BlockHash`. `serde::{Deserialize, Serialize}` for the derives on every type — every contract type needs to round-trip through wire format eventually.

### Step 4: Add `BlockHash`

```rust
/// 32-byte block hash, Ethereum convention.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub struct BlockHash(pub [u8; 32]);

impl fmt::Display for BlockHash {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("0x")?;
        for b in &self.0 {
            write!(f, "{b:02x}")?;
        }
        Ok(())
    }
}
```

**Newtype pattern.** `BlockHash` is a wrapper around `[u8; 32]`, not a type alias. This matters: with a wrapper, the compiler rejects `let h: BlockHash = [0u8; 32];` (must wrap explicitly). With a type alias (`type BlockHash = [u8; 32];`), they're interchangeable and you can pass a random `[u8; 32]` where a `BlockHash` was expected. **Newtypes are how Rust type-checks "this is specifically a block hash, not just any 32 bytes."**

**Why `Copy` despite being 32 bytes?** Copy semantics let you pass `BlockHash` by value without explicit `.clone()`. The cost is small (a memcpy of 32 bytes), and the ergonomics gain is large — you'll pass block hashes around constantly. The alternative (`Clone` only) requires `.clone()` at every call site and is noisy.

**Why all 10 trait derives?** `Debug` for `{:?}` formatting; `Clone, Copy` for value semantics; `PartialEq, Eq` for equality testing; `PartialOrd, Ord` for sorting (we'll need this when validators sort blocks); `Hash` for `HashMap` keys; `Serialize, Deserialize` for wire format. Every contract type needs roughly this same set.

**Why a custom `Display` impl?** Default `Debug` would print `BlockHash([171, 18, 240, ...])`, which is unreadable in logs. The custom `Display` prints `0xab12f0...`, matching the Ethereum convention. Logs are a debugger's primary tool; making them human-readable is not optional.

Run `cargo check -p openhl-types`. Should pass.

### Step 5: Add `PayloadId`

```rust
/// Identifier returned by `build_payload`; used to retrieve the assembled block via `payload_ready`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct PayloadId(pub u64);
```

Same newtype pattern, smaller backing type. No `Display` impl — `Debug` (`PayloadId(42)`) is fine in logs.

No `PartialOrd, Ord` here. Block hashes need ordering (for sorting); payload IDs don't (they're just opaque tokens between `build_payload` and `payload_ready`).

> 🛑 **Anti-fluency.** "Why not just use `u64` directly? PayloadId is just a number." **Because newtypes prevent footguns.** If you use `u64`, you can write `build_payload(..., some_random_u64)` and Cargo won't catch it. With `PayloadId(u64)`, the compiler forces you to spell out `PayloadId(some_random_u64)`, making the intent visible. The cost is one extra `(...)` per construction; the benefit is that every payload ID in your code is provably a payload ID, not someone's mis-typed integer.

### Step 6: Add `PayloadAttrs`

```rust
/// Inputs to a payload-build job.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PayloadAttrs {
    pub timestamp: u64,
    pub fee_recipient: [u8; 20],
    pub prev_randao: [u8; 32],
}
```

A real struct (not a newtype) — multiple fields. Three pieces:

- `timestamp` — Unix seconds, picked by the proposer
- `fee_recipient` — 20-byte Ethereum address, where gas fees go
- `prev_randao` — 32-byte beacon-chain randomness (from previous block)

These three are the **minimum** Reth needs to assemble a payload. The Ethereum Engine API spec has more fields (`suggestedFeeRecipient`, `parentBeaconBlockRoot`, `withdrawals`, etc.); we omit them at v0 because openhl is single-validator and doesn't have withdrawal flows.

No `Copy` here — 60 bytes is past the comfortable Copy threshold. Callers will explicitly `clone()` when passing around.

### Step 7: Add `PayloadStatus`

```rust
/// Verdict from `validate_payload`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PayloadStatus {
    Valid,
    Invalid,
    Syncing,
}
```

Three variants, each with a specific consensus-side response:

- **`Valid`** — The EL applied the block and got the expected state. Vote for it.
- **`Invalid`** — The EL applied the block and the result was wrong (state-root mismatch, gas-limit violation, etc.). Vote nil; treat this proposer as faulty.
- **`Syncing`** — The EL doesn't have the state to answer yet (chain is behind). Don't vote yet; wait or fall to timeout.

The **three variants are not interchangeable**. Treating `Syncing` like `Invalid` permanently forks you from peers who could have answered. Treating `Invalid` like `Syncing` lets bad proposals through. The L3 lesson on the trait will get into this; for now, you encoded the three distinct verdicts.

### Step 8: Add `ExecutedBlock`

```rust
/// An executed block — the artifact a consensus round commits to. Minimal v0 shape; txs and receipts land per Module 2.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutedBlock {
    pub hash: BlockHash,
    pub parent_hash: BlockHash,
    pub number: u64,
    pub state_root: [u8; 32],
}
```

The fields:

- `hash` — this block's hash
- `parent_hash` — the previous block's hash, forming the chain
- `number` — block height (parent.number + 1, monotonic)
- `state_root` — Merkle root of the post-execution state (32 bytes)

What's **not** here (deliberately):

- Transactions list — Module 2 (CLOB) lands transactions; v0 produces empty blocks
- Receipts list — same
- Logs bloom — same
- Difficulty / mix hash — post-merge defaults

This is the minimum shape needed for the consensus round to close. As Modules 2-5 land, `ExecutedBlock` gets more fields. By keeping it minimal now, we avoid encoding Module 2's design before we've designed it.

Run `cargo check -p openhl-types` — should still pass.

### Step 9: Add unit tests

Append to `crates/types/src/lib.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn block_hash_display_is_hex() {
        let h = BlockHash([0xab; 32]);
        let s = format!("{h}");
        assert!(s.starts_with("0x"));
        assert_eq!(s.len(), 2 + 64); // "0x" + 64 hex chars
        assert!(s.ends_with("ab"));
    }

    #[test]
    fn payload_status_equality() {
        assert_eq!(PayloadStatus::Valid, PayloadStatus::Valid);
        assert_ne!(PayloadStatus::Valid, PayloadStatus::Invalid);
        assert_ne!(PayloadStatus::Syncing, PayloadStatus::Valid);
    }

    #[test]
    fn executed_block_is_cloneable() {
        let original = ExecutedBlock {
            hash: BlockHash([1u8; 32]),
            parent_hash: BlockHash([0u8; 32]),
            number: 1,
            state_root: [2u8; 32],
        };
        let cloned = original.clone();
        assert_eq!(cloned.number, original.number);
        assert_eq!(cloned.hash, original.hash);
    }

    #[test]
    fn block_hash_serde_round_trips() {
        let original = BlockHash([0x42; 32]);
        let json = serde_json::to_string(&original).unwrap();
        let round_tripped: BlockHash = serde_json::from_str(&json).unwrap();
        assert_eq!(original, round_tripped);
    }
}
```

The last test needs `serde_json` as a dev-dependency. Add it to `crates/types/Cargo.toml`:

```toml
[dev-dependencies]
serde_json = { workspace = true }
```

## Test

```bash
cargo test -p openhl-types
```

Expected:

```
running 4 tests
test tests::block_hash_display_is_hex ... ok
test tests::executed_block_is_cloneable ... ok
test tests::payload_status_equality ... ok
test tests::block_hash_serde_round_trips ... ok

test result: ok. 4 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

If a test fails, the typical mistakes are:

- **Forgot `#[derive(Clone)]` or `#[derive(PartialEq)]`** on a type. The compiler error names the missing trait.
- **`Display` impl missing for `BlockHash`**. `format!("{h}")` requires `Display`, not `Debug`.
- **Forgot to add `serde_json` to `[dev-dependencies]`**. `serde_json::to_string` won't resolve.

## Design reflection

Two load-bearing decisions:

1. **Contract types live in `openhl-types`, a separate crate.** Not in `openhl-consensus` and not in `openhl-evm`. The reason is the Rust crate-graph constraint: if `BlockHash` lived in `openhl-consensus`, then `openhl-evm` would have to depend on `openhl-consensus` (to use the type). But `openhl-consensus` also needs to call methods that `openhl-evm` implements — meaning `openhl-consensus` would need to depend on `openhl-evm`. **A→B and B→A is a dependency cycle, which Rust does not allow.** The fix is the **shared vocabulary crate**: both `openhl-consensus` and `openhl-evm` depend on `openhl-types`, and neither depends on the other for type definitions. This is a standard pattern in any Rust workspace with a CL↔EL split — Reth uses `alloy-primitives` and `reth-primitives-traits` for the same purpose.

2. **PayloadStatus is an enum, not a bool.** L0 / your prediction above flagged this. The three states are not interchangeable: the consensus-side response depends on *which* not-Valid state the EL is in. Collapsing them to `bool { is_valid }` would lose information that's load-bearing for chain liveness — a Syncing node treated as Invalid permanently forks from peers who could have helped it.

## Answer key

```bash
cd ~/code/openhl-reference
git checkout 13113db
diff -u ~/code/my-openhl/crates/types/src/lib.rs ./crates/types/src/lib.rs
```

Your code should be effectively identical, modulo whitespace and possibly the test names. Important things to match: type definitions (every field, every derive), the `BlockHash::Display` impl logic, the `PayloadStatus` enum variants (in the same order).

Return to main:

```bash
git checkout main
```

## Common questions

**Q: My `BlockHash::Display` test fails — "expected 2+64 chars, got X."**
You probably wrote `write!(f, "{b:x}")` (single hex digit) instead of `write!(f, "{b:02x}")` (two hex digits, zero-padded). For a byte value of 0x05, `{b:x}` produces `"5"` but `{b:02x}` produces `"05"`. The test expects 2 chars per byte.

**Q: Can `ExecutedBlock` be `Copy`?**
Not as written — it contains a `Vec<...>` in production (transactions list), and `Vec` isn't `Copy`. At v0 the struct only has fixed-size fields so it *could* be Copy, but we omit the derive deliberately to avoid having to remove it later. Cloning is cheap when fields are bytes; the call sites that need it can `.clone()` explicitly.

**Q: Why is `prev_randao` 32 bytes if it's "randomness"?**
It's a hash of the previous block's RANDAO mix (Ethereum's beacon-chain randomness beacon). 32 bytes = SHA-256 output. The actual entropy source is the beacon chain, but we receive it as a hash, so the type is `[u8; 32]`.

**Q: Should `BlockHash` derive `Default`?**
It can (`Default` for `[u8; 32]` is all-zeros), but **we don't here** — the openhl convention is that block hashes are computed from real data; a default-constructed `BlockHash([0u8; 32])` is a code smell. Let test code that needs a sentinel write `BlockHash([0u8; 32])` explicitly.

## Next lesson (L3)

`openhl-types` now has 5 contract types. L3 is the `ConsensusBridge` trait — the 4-method API surface that consensus calls into. The trait will reference the types you just wrote: `build_payload(BlockHash, PayloadAttrs) -> PayloadId`, `payload_ready(PayloadId) -> ExecutedBlock`, etc. After L3 the contract is fully specified at the type level; L4 starts implementing it.
````

---

## Seed-file slot

L2 lands in Module 2 (Contract types) at sortOrder 0:

```typescript
{
  title: 'Lesson 2 — Shared contract types in openhl-types',
  slug: 'openhl-contract-types-en',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 30,
  xpReward: 60,
  content: `# Lesson 2 — Shared contract types in \`openhl-types\`\n\n...`
},
```

## SHA pinning discipline

L2 references one openhl commit (§Answer key):
- `13113db` (Stage 4: ConsensusBridge trait + CL/EL contract types — added in one commit; L2 covers the types part, L3 covers the trait)

## Style review notes (self-critique before paste)

- **L2 is 30 min — significantly shorter than L1's 45 min.** Less time on TOML/Cargo wrangling, more time on Rust type design + reasoning about derives. XP 60 reflects this.
- **Step 4's "Why all 10 trait derives" subsection** is the highest-leverage paragraph. New Rust devs over-derive (or under-derive) and don't know why. Walking the derives one by one teaches the pattern.
- **The "Anti-fluency" callout in Step 5** ("why not just use `u64`?") is the newtype-pattern lesson made concrete. Junior Rust devs reach for plain `u64` constantly; this callout names the cost.
- **The unit tests are 4 simple cases**, not exhaustive coverage. Goal is to give the reader *something passing*, not to validate the type definitions exhaustively (which property tests would do later). The tests are also useful for showing `Display`/`Clone`/`PartialEq`/`Serialize` actually work.
- **Step 9's `serde_json` dev-dep addition** is a small footgun that catches readers — they add the test, run, get "serde_json not found." The Q&A entry addresses this; might also pre-emptively mention in Step 9.
- **No JA mirror yet at first paste.**
