# Building OpenHL — L4 draft (EN) — C2 build-along rewrite

> Drafted against openhl SHA `3b43586` (Stage 5a: InMemoryEvmBridge — first impl of ConsensusBridge). This is the **first ConsensusBridge impl** in the course.
> Course: `building-openhl-consensus-en` (track: `reth-l1-architect`, course #6 of 10).

---

## L4 — `openhl-in-memory-bridge-en`

- **Module:** 3 (EL test double), sortOrder 0 within module
- **Course-level sortOrder:** 3 (lesson 4 of 15)
- **Duration:** 40 min
- **XP reward:** 70
- **Type:** CONTENT

### Content

````markdown
# Lesson 4 — `InMemoryEvmBridge` — first impl of the trait

## Goal

Concepts you'll grasp in this lesson:

- **Test-double-first impl strategy** — why we write a fake EVM before touching Reth. The trait is exercised end-to-end without 600 transitive deps; downstream consensus tests (L9/L10) can run in 0.02s instead of 2.7s.
- **`Mutex<State>` for interior mutability** — wrapping a private `State` struct in a single `Mutex` to satisfy the `Send + Sync` bound from L3. Locking once per method is fine for test code and propagates structurally to `LiveRethEvmBridge` in L12+.
- **`pending` vs `chain` map split** — speculative builds and canonical commits are different lifecycles. Encoding the split here forces every later impl to respect the same data flow (build is speculative; commit is final).
- **`async_trait` impl ergonomics** — what `#[async_trait]` on the `impl` block requires (lifetimes, `Self: Send + Sync`), and why `async fn` in trait methods is still desugared via the macro in stable Rust.

Verification:

```bash
cargo test -p openhl-evm
```

…passes 5 tests covering build → ready → commit flows of the in-memory bridge. You have the first **concrete implementation** of `ConsensusBridge` from L3 — a test double that pretends to be an EVM, stores fake blocks, and lets you exercise the trait without spinning up Reth.

Specific changes:

- 3 dependencies + 1 dev-dependency added to `crates/evm/Cargo.toml`: `openhl-consensus`, `openhl-types`, `async-trait`, and `tokio` (dev).
- `crates/evm/src/in_memory.rs` — new file with `InMemoryEvmBridge` struct, private `State`, `Mutex<State>`, the 4-method `impl ConsensusBridge`, a `hex_short` helper, and 5 unit tests.
- `crates/evm/src/lib.rs` — wires `pub mod in_memory; pub use InMemoryEvmBridge;`.

## Recap

After L3:

```
crates/types/src/lib.rs        — 5 types + Display + 4 tests passing
crates/consensus/src/bridge.rs — ConsensusBridge trait + BridgeError
crates/consensus/src/lib.rs    — pub mod bridge;
crates/evm/src/lib.rs          — //! EVM execution layer doc only, no code
crates/evm/Cargo.toml          — empty [dependencies]
```

`cargo check --workspace` passes; `cargo test -p openhl-evm` runs 0 tests.

## Plan

You'll do four things:

1. **Add 3 dependencies + 1 dev-dependency** to `crates/evm/Cargo.toml`: `openhl-consensus` (for the trait and error type), `openhl-types` (for the contract types), `async-trait` (for the `#[async_trait]` macro), and `tokio` as dev-dep (so test functions can be `#[tokio::test]`).
2. **Create `crates/evm/src/in_memory.rs`** with: the `InMemoryEvmBridge` struct, a private `State` struct held in a `Mutex`, an `impl ConsensusBridge for InMemoryEvmBridge` block providing all 4 async methods, a `hex_short` helper, and a `#[cfg(test)] mod tests` with 5 tests.
3. **Wire `in_memory` into the crate** via `pub mod in_memory; pub use in_memory::InMemoryEvmBridge;` in `crates/evm/src/lib.rs`.
4. **Run** `cargo test -p openhl-evm` and watch 5 tests pass.

This is the first time you write a Rust impl. The pattern you encode here repeats: `RethEvmBridge` in L5 uses the same skeleton, and `LiveRethEvmBridge` in L11+ does too. **The state-management pattern (Mutex<State> with pending vs chain maps) propagates to those impls too.**

> 🛑 **Predict.** Before scrolling: what does the test double's `build_payload` need to **fake**, vs what can it **actually do**? Hint: it can't run an EVM, but it can: assign a `PayloadId`, increment a block number, synthesize a hash, remember the pending block. The fake-vs-real distinction matters in L5 + L11.

## Walk-through

### Step 1: Add dependencies to `crates/evm/Cargo.toml`

Open `crates/evm/Cargo.toml`. Replace the empty `[dependencies]` section:

```toml
[dependencies]
openhl-consensus = { workspace = true }
openhl-types     = { workspace = true }
async-trait      = { workspace = true }

[dev-dependencies]
tokio = { workspace = true }
```

The four:

- **`openhl-consensus`** — to reference `bridge::{ConsensusBridge, BridgeError}` from the impl
- **`openhl-types`** — to use `BlockHash`, `PayloadId`, etc.
- **`async-trait`** — `#[async_trait]` attribute for the impl block
- **`tokio` (dev)** — `#[tokio::test]` for async test functions

`cargo check -p openhl-evm` should still pass — declared deps without using them.

### Step 2: Create the file

```bash
touch crates/evm/src/in_memory.rs
```

Add the module-level doc:

```rust
//! In-memory `ConsensusBridge` — a test double for the EL side.
//!
//! Useful for unit-testing the consensus crate without spinning up Reth. The
//! real Reth-backed implementation lives in `engine.rs` (lands in L5).
```

### Step 3: Add the imports + structs

```rust
use async_trait::async_trait;
use openhl_consensus::bridge::{BridgeError, ConsensusBridge};
use openhl_types::{BlockHash, ExecutedBlock, PayloadAttrs, PayloadId, PayloadStatus};
use std::collections::HashMap;
use std::fmt::Write as _;
use std::sync::Mutex;

#[derive(Debug, Default)]
pub struct InMemoryEvmBridge {
    state: Mutex<State>,
}

#[derive(Debug, Default)]
struct State {
    next_payload_id: u64,
    pending: HashMap<u64, ExecutedBlock>,
    chain: HashMap<[u8; 32], ExecutedBlock>,
    head: Option<BlockHash>,
}

impl InMemoryEvmBridge {
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }
}
```

Walk through what each field is:

**`InMemoryEvmBridge`** — the public struct. Single field: `state: Mutex<State>`. The mutex makes the type `Send + Sync` (it can be shared between threads safely), which the trait requires. Everything mutable lives inside the mutex.

**`State`** (private) — three pieces of bookkeeping:

- `next_payload_id: u64` — monotonic counter. Every `build_payload` call increments this and uses the previous value as the returned `PayloadId`.
- `pending: HashMap<u64, ExecutedBlock>` — blocks that `build_payload` produced but `commit` hasn't accepted yet. Keyed by `PayloadId`.
- `chain: HashMap<[u8; 32], ExecutedBlock>` — committed blocks. Keyed by raw 32-byte hash (not `BlockHash` newtype — saves a `.0` accessor when looking up).
- `head: Option<BlockHash>` — the most recently committed hash. `None` if nothing committed yet.

The split between `pending` and `chain` matters: by the time `commit(hash)` is called, the block is already in `pending` (from a prior `build_payload`). `commit` moves it from pending → chain and updates `head`. This mirrors how a real EL maintains both an in-flight payload buffer and a finalized chain.

Walking the 4 fields of `State` (`next_payload_id` / `pending` / `chain` / `head`) through the `build_payload` → `payload_ready` → `commit` lifecycle in one picture makes it obvious why the same shape gets reused in the real `RethEvmBridge` (L5) and `LiveRethEvmBridge` (L11+):

```
【 Block lifecycle inside InMemoryEvmBridge 】

1. build_payload(parent, attrs)
                       │
                       ▼
   ┌────────────────────────────────────────────────────────────┐
   │ chain.get(&parent.0) → look up the parent's number          │
   │ next_payload_id += 1; return that id as PayloadId           │
   │ Synthesize a new ExecutedBlock (number = parent + 1, …)     │
   │ pending.insert(PayloadId, ExecutedBlock)  ◄── speculative   │
   └────────────────────────────────────────────────────────────┘
                       │
                       ▼  (return just the PayloadId to CL)

2. payload_ready(id)
                       │
                       ▼
   ┌────────────────────────────────────────────────────────────┐
   │ pending.get(&id).cloned()  ◄── lend the unconfirmed block   │
   │ (keep a copy in pending — it hasn't been committed yet)     │
   └────────────────────────────────────────────────────────────┘
                       │
                       ▼  (return the ExecutedBlock)

3. commit(hash)                  // CL calls this only after a 2/3+ quorum
                       │
                       ▼
   ┌────────────────────────────────────────────────────────────┐
   │ Find and remove the block from pending                      │
   │ chain.insert(hash.0, ExecutedBlock)  ◄── promote to canonical│
   │ head = Some(hash)                    ◄── update the new head │
   └────────────────────────────────────────────────────────────┘
                       │
                       ▼  (return Ok(()); the block is now finalized)
```

The key thing the picture pins down is "**pending = speculative (unconfirmed) / chain = finalized**" — the two lifetimes are physically separated at the map level. `build_payload` optimistically piles up; only `commit` has the authority to promote a block from pending to chain. A real Reth EL exposes the same shape under the names `pending blocks` and `canonical chain`, which is why **swapping in the real bridge in L5 / L11+ doesn't change how data flows** — only what backs the maps.

**`impl InMemoryEvmBridge::new`** — the constructor. `#[must_use]` is a hint to clippy: if a caller writes `InMemoryEvmBridge::new();` without binding, that's almost certainly a bug.

### Step 4: Implement `ConsensusBridge` — `build_payload`

```rust
#[async_trait]
impl ConsensusBridge for InMemoryEvmBridge {
    async fn build_payload(
        &self,
        parent: BlockHash,
        _attrs: PayloadAttrs,
    ) -> Result<PayloadId, BridgeError> {
        let mut s = self.state.lock().expect("state mutex poisoned");
        let id = s.next_payload_id;
        s.next_payload_id += 1;

        let parent_number = s.chain.get(&parent.0).map_or(0, |b| b.number);
        let number = parent_number + 1;

        let mut hash_bytes = [0u8; 32];
        hash_bytes[..8].copy_from_slice(&id.to_le_bytes());
        hash_bytes[8..16].copy_from_slice(&number.to_le_bytes());

        let block = ExecutedBlock {
            hash: BlockHash(hash_bytes),
            parent_hash: parent,
            number,
            state_root: [0u8; 32],
        };
        s.pending.insert(id, block);
        Ok(PayloadId(id))
    }
    // ...continued below
```

Step by step:

1. **`self.state.lock().expect("state mutex poisoned")`** — acquire the mutex. The `.expect` covers the `PoisonError` case: a previous holder panicked while holding the lock, leaving it in an indeterminate state. The right move is to panic ourselves (a poisoned state machine is unsafe to continue from). The string identifies the lock for debug output.
2. **`id = s.next_payload_id; s.next_payload_id += 1;`** — allocate a fresh payload ID. Monotonic, no reuse. This is the equivalent of a sequence in a database.
3. **`s.chain.get(&parent.0).map_or(0, |b| b.number)`** — find the parent block's number. If we've never committed that parent (e.g., a test genesis hash), default to 0 (so the child is block 1). The `.0` unpacks the `BlockHash` newtype to get the inner `[u8; 32]`.
4. **Synthesize a hash from `(id, number)`** — first 8 bytes from `id.to_le_bytes()`, next 8 bytes from `number.to_le_bytes()`, rest zero. Why this and not real hashing? Because we're a test double; the hash just needs to be unique per build. `(id, number)` is unique by construction, so the synthesized hash is too.
5. **Build the `ExecutedBlock`** and stash it in `pending`. The block has parent_hash, number, hash, and a zero state_root (we didn't run an EVM).
6. **Return `Ok(PayloadId(id))`**.

> 🛑 **Anti-fluency.** "I should use a real cryptographic hash for `BlockHash`." **No** — this is a test double. Real hashing requires running the EVM to compute the post-state root, which is what we're avoiding by using a test double in the first place. The synthesized hash satisfies the *uniqueness* requirement of `BlockHash` without satisfying the *cryptographic-commitment* requirement, which is fine for unit tests. Module 1 L11+ (LiveRethEvmBridge) does real hashing — but it depends on Reth doing the work.

### Step 5: Implement `payload_ready`

Continuing the same `impl` block:

```rust
    async fn payload_ready(&self, id: PayloadId) -> Result<ExecutedBlock, BridgeError> {
        let s = self.state.lock().expect("state mutex poisoned");
        let n = id.0;
        s.pending
            .get(&n)
            .cloned()
            .ok_or_else(|| BridgeError::Rejected(format!("unknown payload id {n}")))
    }
```

Look up the block in `pending` by ID. If found, clone (the caller wants ownership; pending keeps a copy in case the block isn't committed yet and the caller asks again). If not found, return a `Rejected` error with a descriptive message.

Note: `payload_ready` is the only method that is **not** read-only — wait, it IS read-only (no mutation). The `let s = self.state.lock()` doesn't need `mut` because we only call `.get()`, no insert or remove.

### Step 6: Implement `validate_payload`

```rust
    async fn validate_payload(
        &self,
        _block: &ExecutedBlock,
    ) -> Result<PayloadStatus, BridgeError> {
        Ok(PayloadStatus::Valid)
    }
```

The simplest one in this impl. We're a test double — we just assert any block is valid. Real validation in L12 will run `EthBeaconConsensus::validate_header_against_parent` against the actual parent. For now, returning `Valid` makes consensus tests work.

**Important: `_block` (leading underscore).** This tells the compiler "I'm intentionally not using this arg." Without the underscore, you'd get an `unused_variables` warning. With it, the warning is suppressed.

### Step 7: Implement `commit`

```rust
    async fn commit(&self, block_hash: BlockHash) -> Result<(), BridgeError> {
        let mut s = self.state.lock().expect("state mutex poisoned");
        let block = s
            .pending
            .values()
            .find(|b| b.hash == block_hash)
            .cloned()
            .ok_or_else(|| {
                let hex = hex_short(&block_hash.0);
                BridgeError::Rejected(format!("commit for unknown hash {hex}"))
            })?;
        s.chain.insert(block_hash.0, block);
        s.head = Some(block_hash);
        Ok(())
    }
}
```

The flow:

1. Lock state for writing.
2. Search `pending.values()` for a block matching `block_hash`. Note we iterate by value because `pending` is keyed by `PayloadId`, not block hash — we need to scan to find a block by hash. (In a real implementation with O(1) hash→block lookup, you'd have a second index. For a test double, O(n) scan is fine.)
3. If not found, return a `Rejected` error with a short hex-formatted hash.
4. If found, insert into `chain` (keyed by hash bytes) and update `head`.

Note we don't remove from `pending` — the block lives in both maps after commit. Real impls might `pending.remove(&id)`, but for tests it doesn't matter.

The `hex_short` helper is the next file section:

> 📍 **Placement note.** `hex_short` lives **outside** the `impl ConsensusBridge for InMemoryEvmBridge { ... }` block, as a standalone private function at the end of the file (it takes no `&self` and depends on no struct state — it's a plain byte → string utility). Defining it inside the `impl` would make it look like a method on the trait and mislead readers into thinking `ConsensusBridge` requires it.

```rust
fn hex_short(bytes: &[u8; 32]) -> String {
    let mut s = String::with_capacity(18);
    s.push_str("0x");
    for b in &bytes[..8] {
        write!(&mut s, "{b:02x}").expect("write to String never fails");
    }
    s
}
```

A 0x-prefixed hex string of the first 8 bytes — short enough to fit in a log line. The `write!(&mut s, ...)` invocation needs `use std::fmt::Write as _;` at the top of the file (we already added it in Step 3). The `as _` rename pulls in the trait *for its methods only* without polluting the namespace with the name `Write`.

### Step 8: Wire `in_memory` into the crate

Open `crates/evm/src/lib.rs`. Currently:

```rust
//! EVM execution layer — Reth integration.
```

Replace with:

```rust
//! EVM execution layer — Reth integration.

pub mod in_memory;

pub use in_memory::InMemoryEvmBridge;
```

`pub mod in_memory;` exposes the module. `pub use in_memory::InMemoryEvmBridge;` re-exports the struct at the crate root, so downstream crates can write `use openhl_evm::InMemoryEvmBridge;` instead of `use openhl_evm::in_memory::InMemoryEvmBridge;`.

### Step 9: Add unit tests

At the bottom of `crates/evm/src/in_memory.rs`, append:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    fn attrs() -> PayloadAttrs {
        PayloadAttrs {
            timestamp: 0,
            fee_recipient: [0u8; 20],
            prev_randao: [0u8; 32],
        }
    }

    #[tokio::test]
    async fn build_then_ready_returns_same_block() {
        let bridge = InMemoryEvmBridge::new();
        let parent = BlockHash([1u8; 32]);
        let id = bridge.build_payload(parent, attrs()).await.unwrap();
        let block = bridge.payload_ready(id).await.unwrap();
        assert_eq!(block.parent_hash, parent);
        assert_eq!(block.number, 1);
    }

    #[tokio::test]
    async fn validate_returns_valid() {
        let bridge = InMemoryEvmBridge::new();
        let block = ExecutedBlock {
            hash: BlockHash([2u8; 32]),
            parent_hash: BlockHash([1u8; 32]),
            number: 1,
            state_root: [0u8; 32],
        };
        let status = bridge.validate_payload(&block).await.unwrap();
        assert_eq!(status, PayloadStatus::Valid);
    }

    #[tokio::test]
    async fn commit_advances_head_and_records_block() {
        let bridge = InMemoryEvmBridge::new();
        let parent = BlockHash([1u8; 32]);
        let id = bridge.build_payload(parent, attrs()).await.unwrap();
        let block = bridge.payload_ready(id).await.unwrap();
        bridge.commit(block.hash).await.unwrap();
        let s = bridge.state.lock().unwrap();
        assert_eq!(s.head, Some(block.hash));
        assert!(s.chain.contains_key(&block.hash.0));
    }

    #[tokio::test]
    async fn build_on_committed_parent_increments_number() {
        let bridge = InMemoryEvmBridge::new();
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
        let bridge = InMemoryEvmBridge::new();
        let err = bridge.commit(BlockHash([9u8; 32])).await.unwrap_err();
        assert!(matches!(err, BridgeError::Rejected(_)));
    }
}
```

What each test covers:

| Test | What it proves |
| - | - |
| `build_then_ready_returns_same_block` | `build_payload` + `payload_ready` round-trip works. Number = 1 on top of fake genesis. |
| `validate_returns_valid` | `validate_payload` always returns `Valid` (test double behavior). |
| `commit_advances_head_and_records_block` | After commit, head points to the new block AND chain map contains it. |
| `build_on_committed_parent_increments_number` | Number monotonicity: build on parent block 1 produces block 2. |
| `commit_unknown_hash_errors` | Commit for a hash that isn't in pending returns `BridgeError::Rejected`. |

`#[tokio::test]` is the async-aware version of `#[test]`. It sets up a tokio runtime for the test and awaits the async body.

## Test

```bash
cargo test -p openhl-evm
```

Expected:

```
running 5 tests
test in_memory::tests::build_on_committed_parent_increments_number ... ok
test in_memory::tests::build_then_ready_returns_same_block ... ok
test in_memory::tests::commit_advances_head_and_records_block ... ok
test in_memory::tests::commit_unknown_hash_errors ... ok
test in_memory::tests::validate_returns_valid ... ok

test result: ok. 5 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

Common errors and fixes:

- **`Mutex<HashMap<u64, ExecutedBlock>>` doesn't auto-derive `Default`.** Wait, it does — both `Mutex<T>` and `HashMap<K, V>` derive `Default`. If you see this, you might have written `BTreeMap` (yes Default) or some other type that doesn't. Switch back to `HashMap`.
- **`use std::fmt::Write as _;` not actually used** — clippy will warn. The `Write` trait is used inside `hex_short` via the `write!` macro; the warning means the macro expansion isn't seeing the import. Make sure the `use` is at module top-level, not inside a function.
- **`#[tokio::test]` not found** — `tokio` isn't in `[dev-dependencies]`. Re-check Step 1.
- **A test asserts `block.number == 1` but you get `0`.** You probably forgot the `+ 1` in `let number = parent_number + 1;`.

## Design reflection

Two load-bearing decisions encoded:

1. **State lives behind a `Mutex<State>`.** This is what makes `InMemoryEvmBridge` thread-safe — and therefore `Send + Sync`. The alternative (lock-free, atomic-only mutation) would be far more complex for a test double. Locks are fine when the contention is low (test code) or the critical sections are short (real code). The pattern propagates to `LiveRethEvmBridge` in L11+, which uses the same `Mutex<State>` shape.

2. **`pending` and `chain` are separate maps.** A real EL has the same split — payloads currently being built vs blocks committed to canonical chain. By encoding this in the test double, the **shape of the data flow** carries forward to production impls. If we used one combined map, we'd be implying "build = commit" — which is wrong. Build is speculative; commit is final.

## Answer key

```bash
cd ~/code/openhl-reference
git checkout 3b43586
diff -u ~/code/my-openhl/crates/evm/src/in_memory.rs ./crates/evm/src/in_memory.rs
diff -u ~/code/my-openhl/crates/evm/Cargo.toml ./crates/evm/Cargo.toml
diff -u ~/code/my-openhl/crates/evm/src/lib.rs ./crates/evm/src/lib.rs
```

Variations are OK in test order, doc-comment wording, and exact debug-message format. The struct shape, the `Mutex<State>` pattern, and the 4 method impl logic should match closely.

Return:

```bash
git checkout main
```

## Common questions

**Q: My `commit_advances_head_and_records_block` test panics with "mutex poisoned".**
Check the first panic first.  
In this course, each test creates its own `InMemoryEvmBridge::new()`, so tests do not share one `Mutex<State>`. The common cause is a panic earlier in the **same test** while holding the lock, followed by another `state.lock()` in that test.

Triage steps:
1. Find the first `thread 'tests::...' panicked at ...` line at the top of `cargo test` output.  
2. Fix that root panic and rerun.  
3. Use `cargo test -p openhl-evm -- --test-threads=1` only when you need a parallelism sanity check.  

**Q: Should `pending` use `HashMap<PayloadId, _>` instead of `HashMap<u64, _>`?**
Either works. The openhl convention is to use the inner type (`u64`) at the storage layer to avoid wrapping/unwrapping inside lookups. The public API still uses `PayloadId`. The trade-off: with `HashMap<PayloadId, _>`, you get type safety at the price of `.0` accessors on every key. With `HashMap<u64, _>`, you give up some type safety at the storage layer but avoid the noise. Personal preference; we picked `u64`.

**Q: Why is `hex_short` only first 8 bytes? Why not full?**
Logs need to be short. A full 32-byte hex is 64 chars — eats the log line. The first 8 bytes (16 hex chars + "0x") is enough to identify a block in dev/test scenarios. Production logs would use the full hash; the helper would change accordingly.

**Q: Tests pass but I get clippy warnings about `unused_imports`.**
Make sure each import is actually used somewhere in your code. The boilerplate I gave imports `std::fmt::Write as _` — that's only used inside `hex_short`. If you didn't write `hex_short` yet, the import is unused. Add the helper or remove the import.

## Next lesson (L5)

You have a working `ConsensusBridge` impl, but it doesn't use Reth at all. L5 writes the next impl: `RethEvmBridge`. Same trait, but the `ExecutedBlock` is now built from a real `alloy_consensus::Header` (not synthesized), and the `BlockHash` is a real `B256` hashed via Reth's `Header::hash_slow`. Still in-memory state (no live Reth provider), but the **types are real**. This is the bridge between toy types (L4) and live integration (L11+).
````

---

## Seed-file slot

L4 lands in Module 3 (EL test double) at sortOrder 0:

```typescript
{
  title: 'Lesson 4 — InMemoryEvmBridge — first impl of the trait',
  slug: 'openhl-in-memory-bridge-en',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 40,
  xpReward: 70,
  content: `# Lesson 4 — \`InMemoryEvmBridge\` — first impl of the trait\n\n...`
},
```

## SHA pinning discipline

L4 references one openhl commit (§Answer key):
- `3b43586` (Stage 5a: InMemoryEvmBridge — first impl of ConsensusBridge)

## Style review notes (self-critique before paste)

- **L4 is 40 min** — first time the reader writes a meaningful impl (~120 lines). Splits across 9 steps to keep each digestible.
- **§Step 4 walks `build_payload` step-by-step in 6 sub-points.** This is the lesson's pedagogical core — the reader is learning what Mutex acquisition, monotonic ID allocation, parent lookup, and hash synthesis look like in idiomatic Rust. Don't compress this.
- **The "anti-fluency" callout in Step 4** ("use real cryptographic hash") names a common over-engineering trap that wastes hours of debugging on test doubles.
- **The 5 tests test the right things**: round-trip, validation, commit, monotonicity, error path. The "right number of tests" for this impl — too few misses bugs, too many is busywork.
- **§Design reflection's "shape of data flow propagates" point** is the most important meta-lesson. The reader is writing a test double, but the patterns survive into production impls — that's the polymorphism payoff of the trait.
