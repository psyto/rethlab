# Building OpenHL — L5 draft (EN) — C2 build-along rewrite

> Drafted against openhl SHA `c938321` (Stage 5b: RethEvmBridge — ConsensusBridge implemented against Reth/alloy types). This lesson introduces alloy as a workspace dep and uses it from real code for the first time.
> Course: `building-openhl-consensus-en` (track: `reth-l1-architect`, course #6 of 10).

---

## L5 — `openhl-reth-bridge-en`

- **Module:** 3 (EL test double), sortOrder 1 within module
- **Course-level sortOrder:** 4 (lesson 5 of 15)
- **Duration:** 40 min
- **XP reward:** 70
- **Type:** CONTENT

### Content

````markdown
# Lesson 5 — `RethEvmBridge` with real alloy types

## Goal

Concepts you'll grasp in this lesson:

- **Production-shape internal types behind a contract surface** — storing `(B256, Header)` internally while the trait returns `ExecutedBlock`. Conversion happens only at the trait boundary, so alloy can evolve without breaking the contract. This is exactly what `LiveRethEvmBridge` (L12+) reuses.
- **Real RLP hashing via `Header::hash_slow()`** — why `hash_slow` is named "slow" (recomputes on every call, no cache), what RLP encoding is at the byte level, and how alloy enforces this is the same hash an Ethereum node would compute.
- **Hash-and-header binding via tuple storage** — `(B256, Header)` as one stored unit, not two separate fields. Separating them invites the bug where a mutation desyncs the cached hash from the header it describes.
- **Two impls of one trait** — `InMemoryEvmBridge` and `RethEvmBridge` share the trait surface but differ in fidelity. This is the polymorphism Rust gives you for free once the trait is right; the same shape extends to a third impl in L12.

Verification:

```bash
cargo test -p openhl-evm
```

…passes **9 tests** (5 from L4's `InMemoryEvmBridge` + 4 new ones for `RethEvmBridge`). **This is the first time your code touches alloy/Reth types.** The pattern of "synthesized for tests, real types for production-shape" repeats throughout the course; learning it cleanly here saves time in L11+.

Specific changes:

- 2 alloy deps added to `crates/evm/Cargo.toml`: `alloy-primitives` (for `B256`, `Address`) and `alloy-consensus` (for `Header`).
- `crates/evm/src/engine.rs` — new file with `RethEvmBridge` struct, private `State` storing `Header`, and `impl ConsensusBridge for RethEvmBridge` with all 4 methods + 4 unit tests.
- Three small conversion helpers — `to_b256`, `from_b256`, `to_executed_block` — bridge alloy types to contract types only at the trait boundary.
- `crates/evm/src/lib.rs` — wires `pub mod engine; pub use engine::RethEvmBridge;`.

## Recap

After L4:

```
crates/evm/src/in_memory.rs — InMemoryEvmBridge (synthesized blocks, 5 tests passing)
crates/evm/src/lib.rs       — pub mod in_memory; pub use InMemoryEvmBridge;
crates/evm/Cargo.toml       — 3 deps (openhl-consensus, openhl-types, async-trait), tokio dev-dep
```

`cargo test -p openhl-evm` passes 5/5.

## Plan

Six things:

1. **Add 2 alloy deps** to `crates/evm/Cargo.toml`: `alloy-primitives` (for `B256`, `Address`) and `alloy-consensus` (for `Header`). Both already in workspace deps from L1.
2. **Create `crates/evm/src/engine.rs`** with `RethEvmBridge` struct, private `State` struct (storing `Header` instead of synthesized `ExecutedBlock`), and `impl ConsensusBridge for RethEvmBridge` block.
3. **Three type-conversion helpers** (`to_b256`, `from_b256`, `to_executed_block`) bridging the trait's `BlockHash` and the internals' `B256` + `Header`.
4. **4 unit tests**, one of which proves real hashing — mutating a header field changes the hash.
5. **Wire `engine` into the crate** by adding `pub mod engine;` + re-export to `lib.rs`.
6. **Run** `cargo test -p openhl-evm` — all 9 tests pass.

The key step is #2 — the **shape of internal state changes**. L4 stored `ExecutedBlock` directly. L5 stores `(B256, Header)`: the alloy-native types, with conversion to/from `ExecutedBlock` only at the trait boundary. **The alloy types are the source of truth; `ExecutedBlock` is just the contract serialization.** This separation is what L11+ extends — `LiveRethEvmBridge` keeps the same internal-vs-boundary split, just adds a real Reth provider behind it.

> 🛑 **Predict.** L4's `InMemoryEvmBridge` synthesized a hash from `(id, number)`. L5's `RethEvmBridge` calls `header.hash_slow()` — real RLP encoding + Keccak-256. **What testable behavior does this difference enable?** Hint: think about what happens to the hash if you change a single field on the header.

## Walk-through

### Step 1: Add alloy deps to `crates/evm/Cargo.toml`

Open `crates/evm/Cargo.toml`. The current `[dependencies]` section (from L4):

```toml
[dependencies]
openhl-consensus = { workspace = true }
openhl-types     = { workspace = true }
async-trait      = { workspace = true }
```

Add two lines:

```toml
[dependencies]
openhl-consensus = { workspace = true }
openhl-types     = { workspace = true }
async-trait      = { workspace = true }
alloy-primitives = { workspace = true }
alloy-consensus  = { workspace = true }
```

Both are inherited from `workspace.dependencies` (set up in L1). `alloy-primitives` gives us `B256` (32-byte hash newtype) and `Address` (20-byte address newtype). `alloy-consensus` gives us `Header` (Ethereum block header struct with all its fields).

Run:

```bash
cargo check -p openhl-evm
```

Should pass — deps available, nothing using them yet.

### Step 2: Create `crates/evm/src/engine.rs`

```bash
touch crates/evm/src/engine.rs
```

Start with the module doc + imports:

```rust
//! Reth-backed `ConsensusBridge` — uses alloy / Reth types throughout.
//!
//! At v0 this maintains state in-process for the parts that would normally
//! require a running Reth node (`PayloadBuilder` service, `BlockchainProvider`).
//! The live-node bootstrap lands in later lessons (L10-L13); the type
//! conversions and state-machine shape here are the contract that bootstrap
//! will satisfy.

use alloy_consensus::Header;
use alloy_primitives::{Address, B256};
use async_trait::async_trait;
use openhl_consensus::bridge::{BridgeError, ConsensusBridge};
use openhl_types::{BlockHash, ExecutedBlock, PayloadAttrs, PayloadId, PayloadStatus};
use std::collections::HashMap;
use std::sync::Mutex;
```

The new imports vs L4:

- `alloy_consensus::Header` — the canonical Ethereum block header struct (~20 fields: parent_hash, number, timestamp, beneficiary, gas_limit, base_fee, state_root, etc.)
- `alloy_primitives::{Address, B256}` — the address type (20 bytes) and the hash type (32 bytes). Both are newtypes over byte arrays, like `BlockHash` from L2 — but they come from alloy and are the convention across the Ethereum Rust ecosystem.

### Step 3: Add the structs

```rust
#[derive(Debug, Default)]
pub struct RethEvmBridge {
    state: Mutex<State>,
}

#[derive(Debug, Default)]
struct State {
    next_payload_id: u64,
    pending: HashMap<u64, (B256, Header)>,
    chain: HashMap<B256, Header>,
    head: Option<B256>,
}

impl RethEvmBridge {
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }
}
```

Same shape as L4's `InMemoryEvmBridge`, but the **types inside `State` are different**:

| Field | L4 (InMemory) | L5 (Reth) |
| - | - | - |
| `pending` | `HashMap<u64, ExecutedBlock>` | `HashMap<u64, (B256, Header)>` |
| `chain` | `HashMap<[u8; 32], ExecutedBlock>` | `HashMap<B256, Header>` |
| `head` | `Option<BlockHash>` | `Option<B256>` |

**Why store `(B256, Header)` not `Header` alone?** Because `Header::hash_slow()` is expensive — it RLP-encodes the entire header and runs Keccak-256. We compute the hash once at insert time and cache it in the tuple, so `pending.get(id)` returns both without re-hashing. The hash is the lookup key for `chain` (and the lookup criterion for `commit`), so we want it ready.

**Why `B256` instead of `[u8; 32]` for `chain` key and `head`?** Because we're now in alloy-native space — once you have a `Header`, the natural hash type is `B256`. Using `[u8; 32]` would require `.0` accessors everywhere. The conversion to `BlockHash` happens only when we cross the trait boundary, in helper functions (Step 6).

### Step 4: Implement `build_payload` — first real hashing

```rust
#[async_trait]
impl ConsensusBridge for RethEvmBridge {
    async fn build_payload(
        &self,
        parent: BlockHash,
        attrs: PayloadAttrs,
    ) -> Result<PayloadId, BridgeError> {
        let parent_hash = to_b256(parent);
        let mut s = self.state.lock().expect("state mutex poisoned");

        let parent_number = s.chain.get(&parent_hash).map_or(0, |h| h.number);
        let id = s.next_payload_id;
        s.next_payload_id += 1;

        let header = Header {
            parent_hash,
            number: parent_number + 1,
            timestamp: attrs.timestamp,
            beneficiary: Address::from(attrs.fee_recipient),
            mix_hash: B256::from(attrs.prev_randao),
            ..Default::default()
        };
        let hash = header.hash_slow();
        s.pending.insert(id, (hash, header));
        Ok(PayloadId(id))
    }
    // ...continued
```

Walk through:

1. **`to_b256(parent)`** — convert the trait's `BlockHash` to alloy's `B256` (just byte reinterpretation, both are 32 bytes). The helper is in Step 6.
2. **Look up parent number in `chain`** — keyed by `B256` now, not `[u8; 32]`. The map's lookup type is `B256`; we pass `&parent_hash` (a `&B256`) without unwrapping.
3. **Allocate payload ID** — same as L4.
4. **Build a `Header`** with the field defaults except for the ones we're setting:
   - `parent_hash` — the alloy `B256` from the trait input
   - `number` — parent + 1
   - `timestamp` — from `PayloadAttrs`
   - `beneficiary: Address::from(attrs.fee_recipient)` — convert from `[u8; 20]` to alloy's `Address` newtype
   - `mix_hash: B256::from(attrs.prev_randao)` — convert from `[u8; 32]` to `B256`
   - `..Default::default()` — fills in all remaining fields with zero/default values (state_root, gas_limit, etc.)
5. **`header.hash_slow()`** — **the real hash computation**. This RLP-encodes the entire `Header` (all ~20 fields, including the defaulted ones), then runs Keccak-256, producing a `B256`. The name "slow" is a convention — `hash_fast` would only exist if a cached hash were already on the header struct, which is not our case.
6. **Insert `(hash, header)`** into pending, keyed by payload ID. Return the ID.

**This block hash is real.** If any field of the header changes between two `build_payload` calls — even by one byte — the resulting hash differs. The L4 synthesized hash didn't have this property; the L5 hash does. The test in Step 9 proves this.

> 🛑 **Anti-fluency.** "Why not store `hash` separately from `header` instead of as a tuple — it's clearer." **You could, with one more field on `State`. But the tuple captures the relationship: this hash is the hash *of this exact header*.** Storing them separately invites the bug where someone mutates the header and forgets to recompute the hash. The tuple makes them inseparable.

### Step 5: Implement `payload_ready`, `validate_payload`, `commit`

```rust
    async fn payload_ready(&self, id: PayloadId) -> Result<ExecutedBlock, BridgeError> {
        let s = self.state.lock().expect("state mutex poisoned");
        let n = id.0;
        let (hash, header) = s
            .pending
            .get(&n)
            .cloned()
            .ok_or_else(|| BridgeError::Rejected(format!("unknown payload id {n}")))?;
        Ok(to_executed_block(hash, &header))
    }

    async fn validate_payload(
        &self,
        _block: &ExecutedBlock,
    ) -> Result<PayloadStatus, BridgeError> {
        // Real validation requires a live Reth provider + EVM (lessons L11+).
        // For now, defer to the CL's voting layer for actual block validity
        // and accept structurally.
        Ok(PayloadStatus::Valid)
    }

    async fn commit(&self, block_hash: BlockHash) -> Result<(), BridgeError> {
        let hash = to_b256(block_hash);
        let mut s = self.state.lock().expect("state mutex poisoned");
        let header = s
            .pending
            .values()
            .find(|(h, _)| *h == hash)
            .map(|(_, header)| header.clone())
            .ok_or_else(|| BridgeError::Rejected(format!("commit for unknown hash {hash}")))?;
        s.chain.insert(hash, header);
        s.head = Some(hash);
        Ok(())
    }
}
```

**`payload_ready`** clones the tuple out of pending and calls `to_executed_block` (Step 6) to materialize the trait's return type from the internal `(B256, Header)`.

**`validate_payload`** is still a stub. Real validation against a live Reth provider lands in L12; for now we accept structurally.

**`commit`** mirrors L4 with type substitutions:
- `to_b256(block_hash)` converts the trait's `BlockHash` to `B256`
- We search `pending.values()` for a tuple whose hash matches
- Insert the header into `chain` (keyed by `B256`)
- Update `head`

Notice the closure pattern `find(|(h, _)| *h == hash)` — destructure the tuple, compare the first element. The `*h` dereferences the `&B256` to a `B256` so we can compare with `hash` (also a `B256`).

### Step 6: Add the conversion helpers

After the `impl ConsensusBridge` block:

```rust
fn to_b256(h: BlockHash) -> B256 {
    B256::from(h.0)
}

fn from_b256(b: B256) -> BlockHash {
    BlockHash(b.0)
}

fn to_executed_block(hash: B256, header: &Header) -> ExecutedBlock {
    ExecutedBlock {
        hash: from_b256(hash),
        parent_hash: from_b256(header.parent_hash),
        number: header.number,
        state_root: header.state_root.0,
    }
}
```

Three small helpers:

- **`to_b256`** — `BlockHash → B256`. Just access `.0` to get the inner `[u8; 32]` and pass it to `B256::from`.
- **`from_b256`** — `B256 → BlockHash`. Wrap the inner bytes in our newtype.
- **`to_executed_block`** — materialize the trait's `ExecutedBlock` from internal `(B256, Header)`. Pulls fields from the header (`parent_hash`, `number`) and the cached hash.

**Why three separate helpers instead of one big conversion function?** Each does one thing. `to_b256` and `from_b256` are pure type-system bridges (no logic). `to_executed_block` knows which fields of `Header` map to which fields of `ExecutedBlock`. Splitting them makes each obviously correct.

> 🛑 **Anti-fluency.** "`B256` and `BlockHash` both wrap `[u8; 32]`. Can't I just `transmute` between them?" **Don't.** Even though the byte layout is identical, the types are distinct in the type system — that's the point. The conversion functions document where the boundaries are. If a future change makes `BlockHash` carry additional metadata (e.g., a checksum), `transmute` becomes a bug; `to_b256` becomes a place to update.

### Step 7: Wire `engine` into the crate

Open `crates/evm/src/lib.rs`. Current:

```rust
//! EVM execution layer — Reth integration.

pub mod in_memory;

pub use in_memory::InMemoryEvmBridge;
```

Add 2 lines:

```rust
//! EVM execution layer — Reth integration.

pub mod engine;
pub mod in_memory;

pub use engine::RethEvmBridge;
pub use in_memory::InMemoryEvmBridge;
```

`pub mod engine;` exposes the module. `pub use engine::RethEvmBridge;` re-exports the type at the crate root.

### Step 8: Verify it compiles

```bash
cargo check -p openhl-evm
```

Should pass. If you see errors:

- **`use of undeclared crate or module 'alloy_consensus'`** — `[dependencies]` is missing `alloy-consensus = { workspace = true }`. Re-check Step 1.
- **`cannot find type 'B256' in this scope`** — `use alloy_primitives::B256;` is missing from the import block.
- **`method 'hash_slow' not found on Header`** — alloy version mismatch (you might be on an older alloy). Re-run `cargo update` to pull the version pinned by workspace.

### Step 9: Add unit tests

At the bottom of `crates/evm/src/engine.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    fn attrs() -> PayloadAttrs {
        PayloadAttrs {
            timestamp: 42,
            fee_recipient: [0xaa; 20],
            prev_randao: [0xbb; 32],
        }
    }

    #[tokio::test]
    async fn build_then_ready_returns_alloy_hashed_block() {
        let bridge = RethEvmBridge::new();
        let parent = BlockHash([1u8; 32]);
        let id = bridge.build_payload(parent, attrs()).await.unwrap();
        let block = bridge.payload_ready(id).await.unwrap();
        assert_eq!(block.parent_hash, parent);
        assert_eq!(block.number, 1);
        // Hash is computed by alloy_consensus::Header::hash_slow, not synthesized:
        // it changes if any header field changes.
        let mut alt_attrs = attrs();
        alt_attrs.timestamp += 1;
        let id2 = bridge.build_payload(parent, alt_attrs).await.unwrap();
        let block2 = bridge.payload_ready(id2).await.unwrap();
        assert_ne!(block.hash, block2.hash);
    }

    #[tokio::test]
    async fn commit_advances_head() {
        let bridge = RethEvmBridge::new();
        let parent = BlockHash([1u8; 32]);
        let id = bridge.build_payload(parent, attrs()).await.unwrap();
        let block = bridge.payload_ready(id).await.unwrap();
        bridge.commit(block.hash).await.unwrap();
        let s = bridge.state.lock().unwrap();
        assert_eq!(s.head, Some(to_b256(block.hash)));
    }

    #[tokio::test]
    async fn build_on_committed_parent_increments_number() {
        let bridge = RethEvmBridge::new();
        let genesis = BlockHash([1u8; 32]);
        let id1 = bridge.build_payload(genesis, attrs()).await.unwrap();
        let block1 = bridge.payload_ready(id1).await.unwrap();
        bridge.commit(block1.hash).await.unwrap();

        let id2 = bridge.build_payload(block1.hash, attrs()).await.unwrap();
        let block2 = bridge.payload_ready(id2).await.unwrap();
        assert_eq!(block2.number, 2);
        assert_eq!(block2.parent_hash, block1.hash);
    }

    #[tokio::test]
    async fn commit_unknown_hash_errors() {
        let bridge = RethEvmBridge::new();
        let err = bridge.commit(BlockHash([9u8; 32])).await.unwrap_err();
        assert!(matches!(err, BridgeError::Rejected(_)));
    }
}
```

What each test covers:

| Test | What it proves |
| - | - |
| `build_then_ready_returns_alloy_hashed_block` | Real hashing — same `parent` + different `timestamp` produces different `hash`. This is the test L4 couldn't write (synthesized hashes were timestamp-blind). |
| `commit_advances_head` | After commit, head points to the new block (in `B256` form internally). |
| `build_on_committed_parent_increments_number` | Number monotonicity, same as L4. |
| `commit_unknown_hash_errors` | Unknown-hash commit returns `BridgeError::Rejected`. |

The **key new test** is the first one. It mutates a single field (`timestamp`) of the `Header` and asserts the resulting hash differs. This proves the hashing is real — alloy is actually RLP-encoding and Keccak-256-ing the header. L4's synthesized hash from `(id, number)` would have failed this test (same parent, same number → same synthesized hash regardless of timestamp).

## Test

```bash
cargo test -p openhl-evm
```

Expected:

```
running 9 tests
test engine::tests::build_on_committed_parent_increments_number ... ok
test engine::tests::build_then_ready_returns_alloy_hashed_block ... ok
test engine::tests::commit_advances_head ... ok
test engine::tests::commit_unknown_hash_errors ... ok
test in_memory::tests::build_on_committed_parent_increments_number ... ok
test in_memory::tests::build_then_ready_returns_same_block ... ok
test in_memory::tests::commit_advances_head_and_records_block ... ok
test in_memory::tests::commit_unknown_hash_errors ... ok
test in_memory::tests::validate_returns_valid ... ok

test result: ok. 9 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

The 4 L5 tests pass alongside the 5 L4 tests — **both implementations satisfy the same trait**, and the same `ConsensusBridge` consumer code (which we'll write in L8/L9) works against either.

Common errors and fixes:

- **`Header::hash_slow()` returns wrong type** — if you wrote `let hash: BlockHash = header.hash_slow();` directly, that fails. `hash_slow()` returns `B256`; convert via `from_b256` after.
- **`assert_ne!(block.hash, block2.hash)` fails** — your `..Default::default()` might be the issue. Are you constructing `Header` with `..Default::default()` at the end? Without it, you might have all-zeros and same-timestamp-but-still-equal hashes.
- **`B256::from(attrs.fee_recipient)` errors** — `fee_recipient` is `[u8; 20]`, but `B256` is `[u8; 32]`. The correct conversion is `Address::from(attrs.fee_recipient)`.

## Design reflection

Three load-bearing decisions encoded:

1. **Internal types are alloy-native; trait types are the contract serialization.** State stores `(B256, Header)`. The trait returns `ExecutedBlock`. Conversion happens at exactly the trait boundary (`to_executed_block`). This means alloy can evolve its types without breaking the trait — only the conversion helpers update. **Decoupling production-shape internal types from the contract is what lets `LiveRethEvmBridge` (L11+) reuse the same trait.**

2. **`(B256, Header)` tuple, not separate fields.** The hash is *of this exact header*. Storing them separately invites the bug where a header mutation desyncs from the cached hash. The tuple binds them.

3. **Three small conversion helpers, not one big one.** `to_b256` and `from_b256` are pure type bridges; `to_executed_block` knows the field mapping. Splitting them keeps each helper obviously correct and makes future changes localized.

## Answer key

```bash
cd ~/code/openhl-reference
git checkout c938321
diff -u ~/code/my-openhl/crates/evm/src/engine.rs ./crates/evm/src/engine.rs
diff -u ~/code/my-openhl/crates/evm/src/lib.rs ./crates/evm/src/lib.rs
diff -u ~/code/my-openhl/crates/evm/Cargo.toml ./crates/evm/Cargo.toml
```

Variations OK in doc comments and error messages. The struct types, helper signatures, and the 4 method impls should align closely.

The reference's Cargo.toml at `c938321` also lists `reth-ethereum-primitives` (without using it in `engine.rs`). It's a forward-declared dep for later lessons; our L5 omits it. Both are correct.

Return:

```bash
git checkout main
```

## Common questions

**Q: Why have *two* bridge impls — InMemoryEvmBridge and RethEvmBridge — both with the same logic?**
The logic is the same; the **types are different**. `InMemoryEvmBridge` uses synthesized types (for fast unit tests). `RethEvmBridge` uses alloy types (for tests that validate alloy interop). Later, `LiveRethEvmBridge` will use alloy types AND a live Reth provider. Each step adds production fidelity while keeping the trait surface stable.

**Q: `Header` has ~20 fields. Why do I only set 4?**
The unset fields get `Default::default()` values: `state_root = B256::ZERO`, `gas_limit = 0`, `base_fee_per_gas = None`, etc. At v0 we don't have an EVM running, so we can't compute a real `state_root`; we accept zero. Production code (L11+) computes these from the live Reth provider.

**Q: What's the difference between `hash_slow` and `hash_fast` in alloy?**
There's no `hash_fast` method on `Header`. The naming convention is: methods that recompute a value are "slow," methods that return a pre-cached value are "fast." `Header` doesn't have a pre-cached hash, so we get only `hash_slow`. Some types in alloy (like `SealedHeader`) carry the hash and offer `.hash()` as the "fast" alternative.

**Q: Should I `cargo update` to get the latest alloy?**
No — the workspace pins alloy to specific versions (`alloy-primitives = "1.5"`, `alloy-consensus = "2.0"`). `cargo update` would just verify those resolve; it wouldn't bump. To bump alloy: edit `workspace.dependencies` in the root `Cargo.toml`, then `cargo update` to refresh the lock file.

## Next lesson (L6)

You've now written two `ConsensusBridge` impls — one synthesized, one with real alloy types. Both are usable by consensus-side test code, which you'll start writing in L8. But first, in L6, we go to the consensus side properly: we implement Malachite's `Context` trait — the type-level API surface that Malachite requires from any chain that uses it. 10 associated types, 4 factory methods. After L6, your chain can answer "what's our `Address` type, our `Height` type, our `Value` type" to Malachite. This is the **other half** of the contract: L3 was the trait we own; L6 is the trait Malachite owns.
````

---

## Seed-file slot

L5 lands in Module 3 (EL test double) at sortOrder 1:

```typescript
{
  title: 'Lesson 5 — RethEvmBridge with real alloy types',
  slug: 'openhl-reth-bridge-en',
  type: 'CONTENT',
  sortOrder: 1,
  duration: 40,
  xpReward: 70,
  content: `# Lesson 5 — \`RethEvmBridge\` with real alloy types\n\n...`
},
```

## SHA pinning discipline

L5 references one openhl commit (§Answer key):
- `c938321` (Stage 5b: RethEvmBridge — ConsensusBridge implemented against Reth/alloy types)

## Style review notes (self-critique before paste)

- **L5 is 40 min** — code volume similar to L4 but with alloy type concepts to learn.
- **The §Plan callout naming the "internal vs trait-boundary" split** is the most important meta-lesson. It's the pattern that L11+ extends. Don't compress this.
- **Step 4's walk-through is dense** — `hash_slow()`, `Default::default()`, alloy newtype conversions, the closure pattern in `find`. This is the lesson where the reader meets alloy idioms for the first time; pacing matters.
- **The hash-divergence test** is the lesson's pedagogical hook — readers see real hashing prove itself by failing the L4 expectation.
- **§Design reflection's "tuple binds them" point** is small but important. New Rust devs often store related values as separate fields then forget to update one.
- **Answer-key note about `reth-ethereum-primitives`** — psyto/openhl declares it but doesn't use it in this file. We omit it to keep the lesson honest; the dep is added later when actually used.
