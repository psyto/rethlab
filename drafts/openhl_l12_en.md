# Building OpenHL — L12 draft (EN) — C2 build-along rewrite

> Drafted against openhl SHA `8d211b8` (Stage 7b — `LiveRethEvmBridge` looks up parents via the live provider).
> Course: `building-openhl-consensus-en` (track: `reth-l1-architect`, course #6 of 10).
> Note: L12 is the **first commit where bridge code actually reads from a live Reth chain.** L13-L15 progressively replace the remaining stubs.

---

## L12 — `openhl-live-bridge-en`

- **Module:** 6 (Live Reth)
- **Module sortOrder:** 1 (after L11's bootstrap)
- **Course-level sortOrder:** 11 (lesson 12 of 16)
- **Duration:** 50 min
- **XP reward:** 100
- **Type:** CONTENT

### Content

````markdown
# Lesson 12 — `LiveRethEvmBridge` reads parents from the real chain

## Goal

Concepts you'll grasp in this lesson:

- **Generic over `P: BlockNumReader`, not concrete on `BlockchainProvider`** — the bridge declares exactly the one Reth capability it needs. The concrete provider has 30+ trait bounds you'd otherwise have to thread through every call site; the generic narrows the surface and makes mock testing trivial.
- **Happy/negative pair as minimal honest validation** — happy alone misses silent fallback to in-memory state; negative alone misses a bridge that always rejects. Both must be load-bearing for "the bridge talks to Reth" to be a true claim.
- **`Result<Option<u64>>` distinguishes operational from protocol failures** — DB-call failure → `BridgeError::Internal` (alert); unknown-hash → `BridgeError::Rejected` (vote nil, move on). Errors carry semantics, not just messages.
- **Refusing unknown parents is a safety property** — if the consensus engine proposes building on a hash the live chain has never seen, the bridge must refuse. This is the rule that prevents a malicious or buggy proposer from steering the EL into a forked subtree.
- **Two bridges as integration milestones** — `RethEvmBridge` (L5, alloy-only) and `LiveRethEvmBridge` (L12, live provider) both stay in the codebase. They represent two stages of integration, not duplicate implementations.

Verification:

```bash
cargo test -p openhl-evm live_bridge_builds_on_real_genesis --release
```

…passes one new test that exercises both **the happy path and the negative path**:

```
test live_node::tests::live_bridge_builds_on_real_genesis ... ok
```

Happy path: boot `EthereumNode`, query its `BlockchainProvider` for the real genesis hash, hand the provider to `LiveRethEvmBridge`, call `build_payload(genesis_hash, attrs)`. The resulting child block has `number = 1` and `parent_hash = genesis` — both **derived from the live provider**, not synthesised in memory.

Negative path: call `build_payload(BlockHash([0xee; 32]), attrs)`. The provider doesn't know that hash, so the bridge returns `BridgeError::Rejected`. **Refusing to build on a parent the live chain has never seen is what makes the bridge safe to wire into consensus.**

Specific changes:

- `crates/evm/src/live_node.rs` — new file (~227 lines). `LiveRethEvmBridge<P>` generic over `P: BlockNumReader + Clone + Sync + 'static`. `build_payload` is real (queries the live provider); `payload_ready` reads from in-memory pending state; `validate_payload` + `commit` stay stubbed for L13-L14.
- `crates/evm/Cargo.toml` adds the production deps needed by the generic bound.
- `crates/evm/src/lib.rs` — wires `pub mod live_node;`.

## Recap

After L11 your workspace has:

```
Cargo.toml                       — 13 reth-* workspace deps + alloy-genesis
crates/evm/Cargo.toml            — 6 production deps + 11 dev-deps
crates/evm/src/bridges/          — InMemoryEvmBridge (L4) + RethEvmBridge (L5)
crates/evm/src/reth_node.rs      — bootstrap-only smoke test
crates/consensus/                — full BFT engine + run_engine_app
```

`cargo test` passes 36 tests workspace-wide. **Reth boots, Malachite produces blocks, but they don't talk.** `RethEvmBridge` uses in-process state for parent lookups; `LiveRethEvmBridge` doesn't exist yet.

## Plan

Six things:

1. **Add `reth-storage-api`** at the workspace level — provides `BlockNumReader`, the trait surface we're generic over.
2. **Update `crates/evm/Cargo.toml`** — promote `eyre` from dev-dep to production dep (for `BridgeError::Internal`'s message construction); add `reth-storage-api` as production dep.
3. **Create `crates/evm/src/live_node.rs`** with `LiveRethEvmBridge<P>` struct + `ConsensusBridge` impl (`build_payload` is live, others are stubs).
4. **Wire `pub mod live_node;`** into `crates/evm/src/lib.rs` (production-visible this time, *not* `#[cfg(test)]`).
5. **Add the integration test** `live_bridge_builds_on_real_genesis` — bootstraps a real node, asserts happy + negative paths.
6. **Run** `cargo test -p openhl-evm live_bridge_builds_on_real_genesis --release` — passes in ~2.4 seconds.

This lesson teaches **the generic-over-provider pattern** that makes the bridge testable in isolation. `LiveRethEvmBridge<P>` is generic over `P: BlockNumReader + Clone + Sync + 'static`. In production, `P` is the live node's `BlockchainProvider`. In tests, `P` could be a `MockProvider` that returns a deterministic set of `(hash → number)` mappings. **The bridge itself doesn't care which** — it just calls `provider.block_number(...)`. This is the same pattern as `run_engine_app<B: ConsensusBridge>` in L10: depend on the trait, not the concrete type.

> 🛑 **Predict.** Before scrolling: why does `LiveRethEvmBridge` still hold an internal `Mutex<State>` with `pending`, `chain`, and `head` fields if `build_payload` reads from the live provider? Hint: `build_payload` returns a `PayloadId`, and the engine later calls `payload_ready(id)` to fetch the actual block. The pending state is what bridges those two calls — Reth's payload-builder takes 10-50ms to assemble blocks, and the bridge needs to hold the *result* somewhere while the engine waits. **L13 replaces this in-memory pending state with Reth's actual payload-builder.** For now, it's a placeholder that proves the build-then-fetch shape works.
>
> *(More concretely: the consensus-side actor task fires `build_payload`, grabs only the `PayloadId`, and immediately moves on — broadcasting the proposal, doing other work. A separate actor task (possibly on a different worker thread) later calls `payload_ready(id)`. While Reth assembles the block in the background and Malachite drives other rounds elsewhere, both run as **independent async-task lifetimes**. The single `Mutex<State>::pending` map is the **seam** that safely splices together two distinct protocol moments — "the instant `build_payload` returned" and "the instant `payload_ready` is invoked" — at the type level. L13 swaps in the real payload-builder, but the **need** for this seam doesn't vanish; `pending` simply evolves into a real async channel / oneshot.)*

## Walk-through

### Step 1: Add `reth-storage-api` to workspace

Open the root `Cargo.toml`. After L11 the reth block ends with:

```toml
reth-payload-builder      = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-provider             = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
alloy-genesis             = { version = "2.0", default-features = false }
```

Add one line between `reth-provider` and `alloy-genesis`:

```toml
reth-storage-api          = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
```

`reth-storage-api` is where `BlockNumReader`, `BlockHashReader`, and similar reader traits live. **Same pinned SHA as the rest of the reth-* deps** — version skew here would mean `LiveRethEvmBridge` can't accept `node.provider` because they'd be different versions of `BlockNumReader`.

### Step 2: Update `crates/evm/Cargo.toml`

Two small changes. The `[dependencies]` section gets two additions:

```toml
[dependencies]
openhl-consensus         = { workspace = true }
openhl-types             = { workspace = true }
async-trait              = { workspace = true }
eyre                     = { workspace = true }      # NEW: was in [dev-dependencies], now production
alloy-primitives         = { workspace = true }
alloy-consensus          = { workspace = true }
reth-ethereum-primitives = { workspace = true }
reth-storage-api         = { workspace = true }      # NEW
```

And `eyre` gets removed from `[dev-dependencies]`:

```toml
[dev-dependencies]
tokio                = { workspace = true }
reth-node-builder    = { workspace = true, features = ["test-utils"] }
reth-node-ethereum   = { workspace = true, features = ["test-utils"] }
reth-node-core       = { workspace = true }
reth-tasks           = { workspace = true }
reth-chainspec       = { workspace = true }
reth-provider        = { workspace = true }
alloy-genesis        = { workspace = true }
serde_json           = { workspace = true }
# eyre line is GONE — it's a production dep now
tempfile             = "3"
```

**Why `eyre` is now production**: `BridgeError::Internal(eyre::eyre!(...))` is constructed in `build_payload` (production code), not just in tests. The dev-dep listing was correct in L11 (only tests imported `eyre::Result`); now production code needs it.

### Step 3: Create `crates/evm/src/live_node.rs` — module doc + imports

Top of the file. Make the role explicit and call out the remaining stubs so readers know exactly what's load-bearing in this lesson vs. what comes later:

```rust
//! `LiveRethEvmBridge` — `ConsensusBridge` backed by a real Reth provider.
//!
//! Stage 7b: parent lookups go through the live node's provider via the
//! `BlockNumReader` trait, so `build_payload` produces a child block whose
//! `number` and `parent_hash` reflect actual chain state rather than the
//! in-process synthesis of [`crate::engine::RethEvmBridge`].
//!
//! Still stubbed for now (each rolls into a later stage):
//!   - `validate_payload` → Stage 7c: real `BlockExecutor` execution
//!   - `commit` → Stage 7d: forkchoice via in-process Engine API
//!
//! Both stubs are visible markers of "what still needs the live node."

use alloy_consensus::Header;
use alloy_primitives::{Address, B256};
use async_trait::async_trait;
use openhl_consensus::bridge::{BridgeError, ConsensusBridge};
use openhl_types::{BlockHash, ExecutedBlock, PayloadAttrs, PayloadId, PayloadStatus};
use reth_storage_api::BlockNumReader;
use std::collections::HashMap;
use std::sync::Mutex;
```

`BlockNumReader` is the single trait that drives the live read; everything else is bridge types we've used since L4.

Drawing this crate's boundary layout in one picture shows that L5's "outer = contract types / inner = alloy types" structure now gets one additional layer below it — a **trait-based provider abstraction** introduced for L12:

```
   [ Outer: the consensus-layer (CL) world ]
   ──────────────────────────────────────────────────────────────────────
       openhl-types / contract primitives (defined ourselves):
         BlockHash       PayloadId        ExecutedBlock
   ──────────────────────────────────────────────────────────────────────
                                  ▲    │
                                  │    ▼  trait-boundary conversions (same helpers as L5)
                                  │       to_b256 / from_b256 / to_executed_block
                                  │    │
   ──────────────────────────────────────────────────────────────────────
       alloy-primitives / alloy-consensus (Ethereum-ecosystem standard):
         B256             u64              Header
   ──────────────────────────────────────────────────────────────────────
                                       │
                                       │  self.provider.block_number(parent_b256)
                                       ▼
   ────── ★ NEW in L12: trait-based provider abstraction boundary ★ ──────
       reth-storage-api / the abstract trait:
         BlockNumReader   (← the one capability the bridge actually needs)
   ──────────────────────────────────────────────────────────────────────
                                       │
                                       │ the type system hides the concrete provider
                                       ▼
   ──────────────────────────────────────────────────────────────────────
       reth-provider / concrete impl (this is what `P` satisfies in production):
         BlockchainProvider  ──►  MDBX storage engine ──► the real block number
   ──────────────────────────────────────────────────────────────────────
   [ Inner: the execution-layer (EL) / actual on-disk state ]
```

Three things this picture pins down: (a) **`LiveRethEvmBridge<P>` is generic over `P: BlockNumReader`** — the bridge body never sees the concrete provider type (with its 30+ trait bounds). (b) **The trait-abstraction layer (the ★ row) lets "a mock `P` for tests" and "the live provider in production" plug into the same interface** — anything satisfying `BlockNumReader` works. (c) **Data narrows in type as it flows from outer to inner**: `BlockHash` (a meaning-carrying 32-byte newtype) → `B256` (alloy primitive) → a query through the trait → the single `u64` MDBX returns. The trait-boundary discipline established back in L5 has been extended here by one more layer — the provider abstraction.

### Step 4: Define the struct

```rust
#[derive(Debug)]
pub struct LiveRethEvmBridge<P> {
    provider: P,
    state: Mutex<State>,
}

#[derive(Debug, Default)]
struct State {
    next_payload_id: u64,
    pending: HashMap<u64, (B256, Header)>,
    chain: HashMap<B256, Header>,
    head: Option<B256>,
}

impl<P> LiveRethEvmBridge<P> {
    #[must_use]
    pub fn new(provider: P) -> Self {
        Self {
            provider,
            state: Mutex::new(State::default()),
        }
    }
}
```

Two pieces:

- **`LiveRethEvmBridge<P>`** holds the provider by value and a `Mutex<State>` for the build/commit bookkeeping. **Generic over `P`** — no concrete provider type baked in.
- **`State`** mirrors what `InMemoryEvmBridge` had (L4) — a `next_payload_id` counter, a `pending` map (payload_id → built header awaiting fetch), a `chain` map (commit history), and a `head` pointer. L13-L15 replace each of these with live Reth structures.

> 🛑 **Anti-fluency.** "Why not put `provider` inside `State` and use one mutex?" **Because `BlockNumReader` impls are typically `Sync + Clone` — they're meant to be shared across many async tasks at once.** Putting the provider inside the mutex would serialize every `block_number` lookup. Keeping it outside lets concurrent calls to `build_payload` race for the (cheap) state lock without blocking each other's (potentially expensive) provider reads. **The lock guards what's mutated, not what's read.**

### Step 5: The `ConsensusBridge` impl — `build_payload` is the live read

```rust
#[async_trait]
impl<P> ConsensusBridge for LiveRethEvmBridge<P>
where
    P: BlockNumReader + Clone + Sync + 'static,
{
    async fn build_payload(
        &self,
        parent: BlockHash,
        attrs: PayloadAttrs,
    ) -> Result<PayloadId, BridgeError> {
        let parent_b256 = B256::from(parent.0);

        // LIVE READ: parent's block number comes from the real provider, not
        // an in-process HashMap. If the provider doesn't know this hash, we
        // refuse to build a child on it.
        let parent_number = self
            .provider
            .block_number(parent_b256)
            .map_err(|e| BridgeError::Internal(eyre::eyre!("provider error: {e}")))?
            .ok_or_else(|| {
                BridgeError::Rejected(format!("provider has no block with hash {parent_b256}"))
            })?;

        let mut s = self.state.lock().expect("state mutex poisoned");
        let id = s.next_payload_id;
        s.next_payload_id += 1;

        let header = Header {
            parent_hash: parent_b256,
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
```

The trait bound `P: BlockNumReader + Clone + Sync + 'static` is the contract: any provider that can do hash→number lookups, that's cheap to clone, that's safe to share across threads, and that lives long enough to outlive any async task.

The `build_payload` body has three phases:

1. **Live read** (the load-bearing line). `self.provider.block_number(parent_b256)` returns `Result<Option<u64>, _>`:
   - `Ok(Some(n))` — provider knows the parent, it's at number `n`. We continue.
   - `Ok(None)` — provider doesn't know the parent. We return `BridgeError::Rejected`. **This is what makes the bridge safe to wire into consensus** — we never build on a parent the live chain has never seen.
   - `Err(e)` — provider failed (DB corruption, deadlock, whatever). We return `BridgeError::Internal`.

2. **State allocation**. Lock the mutex, grab the next ID, increment. Fast — no I/O under the lock.

3. **Header synthesis**. Build a child `Header` with `number = parent_number + 1` (taken from the live read), `parent_hash = parent_b256`, and the attrs the engine passed. Compute the hash via `header.hash_slow()`. Store the `(id → (hash, header))` mapping in `pending`.

> 🛑 **Anti-fluency.** "Why is the parent lookup `Result<Option<u64>, _>` instead of just `Result<u64, _>`?" **Because "the provider couldn't find this hash" and "the provider crashed" are different failure modes, and the consumer should treat them differently.** A missing hash is a *protocol* problem ("we got asked to build on something we don't know about" — possibly a malicious peer or a stale message). A provider error is an *operational* problem ("our DB is broken" — operational alert). The two-layer `Result<Option<...>>` lets the caller distinguish — and we map each to a different `BridgeError` variant (`Rejected` vs. `Internal`).

### Step 6: `payload_ready` + `commit` stubs

These two stay roughly the same as L4's in-memory bridge — the live-Reth integration for them lands in L13 (`payload_ready` against Reth's real payload-builder) and L15 (`commit` against the Engine API):

```rust
    async fn payload_ready(&self, id: PayloadId) -> Result<ExecutedBlock, BridgeError> {
        let s = self.state.lock().expect("state mutex poisoned");
        let n = id.0;
        let (hash, header) = s
            .pending
            .get(&n)
            .cloned()
            .ok_or_else(|| BridgeError::Rejected(format!("unknown payload id {n}")))?;
        Ok(ExecutedBlock {
            hash: BlockHash(hash.0),
            parent_hash: BlockHash(header.parent_hash.0),
            number: header.number,
            state_root: header.state_root.0,
        })
    }

    async fn validate_payload(
        &self,
        _block: &ExecutedBlock,
    ) -> Result<PayloadStatus, BridgeError> {
        // Stage 7c: replace with real BlockExecutor execution + state-root check.
        Ok(PayloadStatus::Valid)
    }

    async fn commit(&self, block_hash: BlockHash) -> Result<(), BridgeError> {
        // Stage 7d: replace with in-process Engine API forkchoice update.
        let hash = B256::from(block_hash.0);
        let mut s = self.state.lock().expect("state mutex poisoned");
        let header = s
            .pending
            .values()
            .find(|(h, _)| *h == hash)
            .map(|(_, h)| h.clone())
            .ok_or_else(|| BridgeError::Rejected(format!("commit for unknown hash {hash}")))?;
        s.chain.insert(hash, header);
        s.head = Some(hash);
        Ok(())
    }
}
```

- **`payload_ready`** looks up the payload by ID in `pending`, builds the `ExecutedBlock` from the stored header. Same shape as L4.
- **`validate_payload`** is `Ok(PayloadStatus::Valid)` — a literal "always valid" stub. The comment names L14 (Stage 7c) as where the real execution lands. **Visible stubs are progress markers, not technical debt.**
- **`commit`** records the block in `chain` and updates `head`. Same shape as L4. The comment names L15 (Stage 7d) as where forkchoice lands.

### Step 7: Wire `live_node.rs` into `lib.rs`

Open `crates/evm/src/lib.rs`. From L11 it had:

```rust
pub mod bridges;

#[cfg(test)]
mod reth_node;
```

Add `live_node` — **production-visible this time:**

```rust
pub mod bridges;
pub mod live_node;

#[cfg(test)]
mod reth_node;
```

Why not `#[cfg(test)]`? Because in L13-L15 we'll use `LiveRethEvmBridge` from production code (eventually from `bin/openhl/src/main.rs`). L11's bootstrap module is genuinely test-only — it just exists to validate the dep tree. L12's bridge is the production API.

### Step 8: Add the integration test

Append to `crates/evm/src/live_node.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use alloy_genesis::Genesis;
    use reth_chainspec::ChainSpec;
    use reth_node_builder::{NodeBuilder, NodeHandle};
    use reth_node_core::node_config::NodeConfig;
    use reth_node_ethereum::EthereumNode;
    use reth_storage_api::BlockHashReader;
    use reth_tasks::Runtime;
    use std::sync::Arc;

    fn dev_chain_spec() -> Arc<ChainSpec> {
        let custom_genesis = r#"{
            "nonce": "0x42",
            "timestamp": "0x0",
            "extraData": "0x5343",
            "gasLimit": "0x5208",
            "difficulty": "0x400000000",
            "mixHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
            "coinbase": "0x0000000000000000000000000000000000000000",
            "alloc": {},
            "number": "0x0",
            "gasUsed": "0x0",
            "parentHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
            "config": {
                "ethash": {},
                "chainId": 2600,
                "homesteadBlock": 0,
                "eip150Block": 0,
                "eip155Block": 0,
                "eip158Block": 0,
                "byzantiumBlock": 0,
                "constantinopleBlock": 0,
                "petersburgBlock": 0,
                "istanbulBlock": 0,
                "berlinBlock": 0,
                "londonBlock": 0,
                "terminalTotalDifficulty": 0,
                "terminalTotalDifficultyPassed": true,
                "shanghaiTime": 0
            }
        }"#;
        let genesis: Genesis = serde_json::from_str(custom_genesis).expect("dev genesis parses");
        Arc::new(genesis.into())
    }

    /// END-TO-END Stage 7b: bootstrap a real Reth node, hand its provider to
    /// `LiveRethEvmBridge`, build a payload on top of the real genesis block.
    /// Asserts the `parent_hash` and number come from the live chain, not an
    /// in-process synthesis.
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn live_bridge_builds_on_real_genesis() {
        let runtime = Runtime::test();
        let chain_spec = dev_chain_spec();
        let node_config = NodeConfig::test().dev().with_chain(chain_spec);

        let NodeHandle {
            node,
            node_exit_future: _,
        } = NodeBuilder::new(node_config)
            .testing_node(runtime)
            .node(EthereumNode::default())
            .launch_with_debug_capabilities()
            .await
            .expect("launch failed");

        // Pull the genesis hash from the live provider.
        let genesis_hash_b256 = node
            .provider
            .block_hash(0)
            .expect("provider call failed")
            .expect("provider has no block 0 (genesis)");

        // Construct the bridge against the live provider.
        let bridge = LiveRethEvmBridge::new(node.provider.clone());

        // Build a payload on the real genesis.
        let attrs = PayloadAttrs {
            timestamp: 1,
            fee_recipient: [0u8; 20],
            prev_randao: [0u8; 32],
        };
        let id = bridge
            .build_payload(BlockHash(genesis_hash_b256.0), attrs.clone())
            .await
            .expect("build_payload failed");
        let block = bridge.payload_ready(id).await.expect("payload_ready failed");

        // The bridge's lookup hit the LIVE provider — assert the resulting
        // header carries genesis as its parent and is at height 1.
        assert_eq!(block.parent_hash, BlockHash(genesis_hash_b256.0));
        assert_eq!(block.number, 1);

        // Negative case: a fabricated parent hash must be rejected because
        // the live provider doesn't know it.
        let fake_parent = BlockHash([0xeeu8; 32]);
        let err = bridge.build_payload(fake_parent, attrs).await.unwrap_err();
        assert!(matches!(err, BridgeError::Rejected(_)));
    }
}
```

Walk through the test:

1. **Bootstrap a real `EthereumNode`** — identical setup to L11.
2. **`node.provider.block_hash(0)`** — ask the live provider for the genesis block hash. This is `BlockHashReader`'s API (different trait from `BlockNumReader` — they're paired).
3. **`LiveRethEvmBridge::new(node.provider.clone())`** — construct the bridge. The clone is cheap because `BlockchainProvider` is internally `Arc`-based.
4. **Happy path**: build a payload on the real genesis hash, fetch via `payload_ready`, assert `parent_hash == genesis_hash` and `number == 1`. **This proves the live read happened** — if it were an in-memory synthesis, the parent_hash would have been whatever we passed in (still correct) but `number` could be anything we chose. `1` only comes out if `provider.block_number(genesis_hash)` returned `Some(0)`.
5. **Negative path**: `BlockHash([0xee; 32])` is a fabricated hash the chain has never seen. `build_payload` must return `BridgeError::Rejected`. `matches!(err, BridgeError::Rejected(_))` is the exhaustive check — any other error variant would fail the test.

> 🛑 **Anti-fluency.** "Why test the negative path at all?" **Because the test that doesn't test rejection only proves the happy path works — it can't catch the bug where the bridge accidentally falls back to in-memory state and produces a child block on any parent at all.** A bridge that silently builds on garbage parents would compile, the happy path would pass, and consensus would happily commit blocks at corrupted heights. The negative path is the one that proves the live read is actually load-bearing.

## Test

```bash
cargo test -p openhl-evm live_bridge_builds_on_real_genesis --release
```

After ~30 seconds (compile + first node bootstrap):

```
running 1 test
test live_node::tests::live_bridge_builds_on_real_genesis ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

Test runtime: ~2.4 seconds (the Reth bootstrap dominates).

Full suite:

```bash
cargo test
```

…should produce 37 tests workspace-wide.

Common errors and fixes:

- **`error[E0277]: P: BlockNumReader is not satisfied for ...`** — workspace `reth-storage-api` SHA doesn't match the rest of the reth-* SHAs. Re-check Step 1.
- **`error[E0433]: failed to resolve: use of undeclared crate or module 'reth_provider'`** — you forgot to add `reth-provider = { workspace = true }` to the `[dev-dependencies]` block of `crates/evm/Cargo.toml` (note: it's `reth-provider`, not `reth-storage-api` — the latter gives you the trait, the former gives you the concrete provider type you need in tests). The fix isn't a `test-utils` feature — it's adding the dependency itself. Re-walk the Step 2 dependency list.
- **`provider has no block with hash 0x000...`** in the happy path test — you're querying `block_hash(0)` but it returns `None`. Check that you're using `.dev()` mode in `NodeConfig` (test mode without dev sometimes doesn't pre-seed genesis correctly).
- **Test fails on `matches!(err, BridgeError::Rejected(_))`** — your `build_payload` propagated `BridgeError::Internal` instead. Check the `.ok_or_else(|| BridgeError::Rejected(...))` line; if you used `.expect(...)` or `.unwrap_or(0)` instead, the error path won't fire.
- **Test compiles but says "P is private"** — your `LiveRethEvmBridge<P>` needs `pub struct ... { provider: P, ... }`. Even though `provider` is `pub`, the generic parameter being `pub` is implicit.

## Design reflection

Three load-bearing decisions encoded here:

1. **The bridge is generic over `P: BlockNumReader`, not concrete on `BlockchainProvider`.** Production passes the live provider; tests could pass a mock; future module 7 might pass a `RemoteProvider` that talks JSON-RPC to a separate Reth process. **The bridge code doesn't change** — only the type parameter does.

2. **`Result<Option<u64>, _>` distinguishes operational from protocol failures.** A failed DB call is a different problem from "we don't know this hash." Mapping them to `BridgeError::Internal` vs. `BridgeError::Rejected` lets consumers respond appropriately — alert on the first, ignore-and-vote-nil on the second. **Errors carry semantics, not just messages.**

3. **The two-test happy/negative pair is the *minimal* honest validation.** Either one alone is insufficient: happy alone fails to catch silent fallback to in-memory state, negative alone fails to catch a bridge that always rejects. **A live integration needs both to be load-bearing.**

## Answer key

```bash
cd ~/code/openhl-reference
git checkout 8d211b8
diff -u ~/code/my-openhl/Cargo.toml ./Cargo.toml
diff -u ~/code/my-openhl/crates/evm/Cargo.toml ./crates/evm/Cargo.toml
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
diff -u ~/code/my-openhl/crates/evm/src/lib.rs ./crates/evm/src/lib.rs
```

The reference at `8d211b8` includes ~227 lines of `live_node.rs`. The trait bound `P: BlockNumReader + Clone + Sync + 'static`, the `build_payload` body, and the two-path test should match closely. Doc comments and exact wording can vary.

Return:

```bash
git checkout main
```

## Common questions

**Q: Why is the bridge `generic over P` instead of taking `BlockchainProvider` directly?**
Two reasons. First, `BlockchainProvider` is a heavy concrete type with 30+ trait bounds in its definition — using it directly means every consumer of `LiveRethEvmBridge` has to thread those bounds through. The generic `P: BlockNumReader` reduces the surface to *exactly* the one capability the bridge needs. Second, generic-over-trait makes mock testing easy — write a `MockProvider` impl, pass it to `LiveRethEvmBridge::new(...)`, get a unit-testable bridge that doesn't need a real node bootstrap.

**Q: What's the difference between `BlockNumReader::block_number` and `BlockHashReader::block_hash`?**
Direction. `block_number(hash) → Option<u64>` answers "what number is this hash at?" `block_hash(n) → Option<B256>` answers "what hash is at this number?" The test uses both: `block_hash(0)` to pull the genesis hash, then `LiveRethEvmBridge` internally uses `block_number(hash)` to look up the parent's number. Same chain index, two access patterns.

**Q: Why `Mutex<State>` instead of `parking_lot::Mutex<State>`?**
`std::sync::Mutex` is fine for low-contention scenarios. The bridge's state is only touched on `build_payload` / `payload_ready` / `commit` — each at most once per block, separated by tens to thousands of milliseconds. `parking_lot` matters when you have lots of contention; here you have almost none. Don't add a dep without a reason.

**Q: When does this bridge actually replace `RethEvmBridge`?**
It already has — `RethEvmBridge` (L5) is now superseded by `LiveRethEvmBridge` for production use. `RethEvmBridge` stays in the codebase as a pedagogical waypoint and as the in-memory variant used in `StubBridge` for engine tests. **Two bridges in the codebase represent two stages of integration**, not duplicate implementations.

## Next lesson (L13)

The bridge reads from Reth on `build_payload`. But the `pending` HashMap is still just an in-process synthesis — the engine asks for "the next block to propose" and we hand back a header we made up. **L13 replaces `pending` with Reth's actual `PayloadBuilder`** — the same machinery Reth uses to assemble blocks for the JSON-RPC `engine_getPayloadV4` call. By the end of L13, the bridge produces blocks that real Ethereum tooling could accept (full transaction lists, receipts, gas usage, state root). This is the transition from "the bridge talks to Reth's storage" to "the bridge is fully integrated with Reth's execution pipeline."
````

---

## Seed-file slot

L12 lands in Module 6 (Live Reth) at sortOrder 1:

```typescript
{
  title: 'Lesson 12 — LiveRethEvmBridge reads parents from the real chain',
  slug: 'openhl-live-bridge-en',
  type: 'CONTENT',
  sortOrder: 1,
  duration: 50,
  xpReward: 100,
  content: `# Lesson 12 — \`LiveRethEvmBridge\` reads parents from the real chain\n\n...`
},
```

## SHA pinning discipline

L12 cites one openhl commit (§Answer key):
- `8d211b8` (Stage 7b — LiveRethEvmBridge looks up parents via the live provider)

This is the first commit where bridge code actually reads from a live Reth chain.

## Style review notes (self-critique before paste)

- **§Plan's "generic-over-provider pattern" callout** parallels L10's `run_engine_app<B>` pattern — same lesson framed differently.
- **The Predict question** about Mutex<State> is the kind of thing readers wonder about and never get a satisfying answer to. Calling it out explicitly anchors the L13 preview.
- **§Step 5's three-phase walkthrough (live read / state alloc / header synthesis)** maps body to logic so readers don't get lost in the prose.
- **The "two-test happy/negative pair is the minimal honest validation" callout** is the generalizable principle this lesson teaches beyond Reth integration.
- **§Step 8's "this proves the live read happened" callout** explains *why* asserting `number == 1` is load-bearing, not just an arbitrary check.
