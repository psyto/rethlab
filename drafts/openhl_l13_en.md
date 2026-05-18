# Building OpenHL — L13 draft (EN) — C2 build-along rewrite

> Drafted against openhl SHA `0844d58` (Stage 7c — `validate_payload` runs Reth's `EthBeaconConsensus`).
> Course: `building-openhl-consensus-en` (track: `reth-l1-architect`, course #6 of 10).
> Note: L13 forces both sides of the bridge to be production-shape — `build_payload` synthesises a real Reth-shape header, `validate_payload` runs Reth's real validator. The two have to *agree*, which means this is the first lesson where you're touching production EIP-1559 math, post-merge invariants, and gas-limit drift rules.

---

## L13 — `openhl-validate-payload-en`

- **Module:** 6 (Live Reth)
- **Module sortOrder:** 2 (after L12's parent lookup)
- **Course-level sortOrder:** 12 (lesson 13 of 16)
- **Duration:** 55 min
- **XP reward:** 100
- **Type:** CONTENT

### Content

````markdown
# Lesson 13 — `validate_payload` runs Reth's `EthBeaconConsensus`

## Goal

By the end of this lesson:

```bash
cargo test -p openhl-evm live_bridge_builds_on_real_genesis --release
```

…still passes — but now the test asserts **three** outcomes (added `validate_payload` checks for happy + invalid block):

```
test live_node::tests::live_bridge_builds_on_real_genesis ... ok
```

What changes inside:
- `bridge.validate_payload(block)` for the block we just built returns `PayloadStatus::Valid` — because Reth's *real* validator (`EthBeaconConsensus::validate_header_against_parent`) approved it.
- `bridge.validate_payload(block_with_unknown_hash)` returns `PayloadStatus::Invalid` — because we have no header to validate.

For this to work, **`build_payload` had to start producing production-shape headers** — copying gas_limit from parent (1/1024 drift bound), computing next_block_base_fee via the chain spec (the same helper the validator uses), zeroing difficulty (post-merge invariant), snapping timestamp to `parent.timestamp + 1` if attrs came in stale. **The validator forces the builder to be honest.**

The 3 new workspace deps + 4 new evm production deps + the rewrite of `live_node.rs` are about 141 lines changed. **The shape of the file doesn't change** — same struct, same `ConsensusBridge` impl. What changes is what `validate_payload` *does*.

## Recap

After L12 your `crates/evm/src/live_node.rs` has:

```rust
pub struct LiveRethEvmBridge<P> {
    provider: P,
    state: Mutex<State>,
}
```

`build_payload` reads parent number from live provider but synthesises a header with mostly default fields. `validate_payload` is a stub: `Ok(PayloadStatus::Valid)`. The integration test only exercises build/fetch on the happy/negative path — never validation.

`cargo test` passes 37 tests workspace-wide. **The bridge agrees with itself, but it hasn't been forced to agree with Reth's idea of a valid block yet.**

## Plan

Seven things:

1. **Add 3 workspace deps**: `reth-consensus` (trait `HeaderValidator`), `reth-ethereum-consensus` (concrete `EthBeaconConsensus`), `reth-primitives-traits` (`SealedHeader`).
2. **Update `crates/evm/Cargo.toml`** — promote `reth-chainspec` from dev-dep to production dep, add 3 new production deps.
3. **Add 2 new fields** to `LiveRethEvmBridge`: `chain_spec: Arc<ChainSpec>` and `validator: EthBeaconConsensus<ChainSpec>`. Update `new()` to take the chain spec.
4. **Widen the trait bound** on `P` — now also `HeaderProvider<Header = Header>` (for fetching parent's full sealed header).
5. **Upgrade `build_payload`** — pull parent's full `SealedHeader`, compute next_block_base_fee, copy gas_limit, zero difficulty, enforce timestamp monotonicity.
6. **Rewrite `validate_payload`** — find our header in pending/chain, fetch parent sealed from provider, run `validator.validate_header_against_parent`.
7. **Add 2 new assertions to the test** — `Valid` on our just-built block, `Invalid` on an unknown hash.

This lesson teaches **the producer-consumer self-consistency pattern**. When you have a builder and a validator for the same artifact, **they must use the same rules**. If `build_payload` uses one base-fee formula and `validate_payload` uses another, every block fails validation. The way you ensure this is to **derive both from the same source** — here, the `ChainSpec`. `ChainSpec::next_block_base_fee()` is what builds, and inside `EthBeaconConsensus::validate_against_parent_eip1559_base_fee` the same helper is what checks. **Sharing the source-of-truth is what makes the system self-consistent.**

> 🛑 **Predict.** Before scrolling: why does `EthBeaconConsensus::validate_header_against_parent` need the parent's *full* sealed header (with gas_limit, timestamp, base_fee_per_gas, all the fields), but `BlockNumReader::block_number` only gives us a `u64`? Hint: think about the four sub-checks Reth's validator runs. Number monotonicity only needs parent.number. But timestamp monotonicity needs parent.timestamp. Gas-limit drift needs parent.gas_limit. EIP-1559 base fee needs parent.base_fee_per_gas + parent.gas_used + parent.gas_limit. **As soon as you need to validate at all, you need the whole header — not just the number.** That's why L13 widens the trait bound from `BlockNumReader` to *also* `HeaderProvider<Header = Header>`.

## Walk-through

### Step 1: Add 3 workspace deps

Open the root `Cargo.toml`. The reth block (from L12) ends with:

```toml
reth-provider             = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-storage-api          = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
alloy-genesis             = { version = "2.0", default-features = false }
```

Insert 3 lines between `reth-storage-api` and `alloy-genesis`:

```toml
reth-consensus            = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-ethereum-consensus   = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-primitives-traits    = "0.3"
```

Three deps, three roles:

- **`reth-consensus`** — defines the `HeaderValidator` trait. `EthBeaconConsensus` implements it. We call `.validate_header_against_parent(...)` via this trait.
- **`reth-ethereum-consensus`** — provides `EthBeaconConsensus<ChainSpec>` — Reth's production header validator for post-merge Ethereum.
- **`reth-primitives-traits` from crates.io `0.3`** — provides `SealedHeader`, the wrapper that pairs `Header` with its hash. **This one comes from crates.io, not git** — it's been spun out as a stable foundation crate.

> 🛑 **Anti-fluency.** "Why is `reth-primitives-traits` from crates.io while everything else is git-pinned?" **Because `reth-primitives-traits` is the part of Reth that's been *stabilized* as a public Rust ecosystem crate.** Other crates (alloy, foundry, custom L2s) all depend on it. Pinning it to the git SHA would force version conflicts with anyone who imports it from crates.io — which is everyone. **The git-pinned reth-* deps are mainly Reth's "internal" surface; `reth-primitives-traits` is the *external* one.**

### Step 2: Update `crates/evm/Cargo.toml`

The `[dependencies]` section gains 4 lines, and `reth-chainspec` is promoted from `[dev-dependencies]`:

```toml
[dependencies]
openhl-consensus         = { workspace = true }
openhl-types             = { workspace = true }
async-trait              = { workspace = true }
eyre                     = { workspace = true }
alloy-primitives         = { workspace = true }
alloy-consensus          = { workspace = true }
reth-ethereum-primitives = { workspace = true }
reth-storage-api         = { workspace = true }
reth-consensus           = { workspace = true }    # NEW
reth-ethereum-consensus  = { workspace = true }    # NEW
reth-primitives-traits   = { workspace = true }    # NEW
reth-chainspec           = { workspace = true }    # NEW — was in [dev-dependencies]
```

And `[dev-dependencies]` loses the `reth-chainspec` line (it's production now):

```toml
[dev-dependencies]
tokio                = { workspace = true }
reth-node-builder    = { workspace = true, features = ["test-utils"] }
reth-node-ethereum   = { workspace = true, features = ["test-utils"] }
reth-node-core       = { workspace = true }
reth-tasks           = { workspace = true }
# reth-chainspec line is GONE — production dep now
reth-provider        = { workspace = true }
alloy-genesis        = { workspace = true }
serde_json           = { workspace = true }
tempfile             = "3"
```

**Why `reth-chainspec` is now production**: the bridge holds an `Arc<ChainSpec>` in its struct. That's a production-visible field, so the type must be a production-visible dep.

### Step 3: Update imports + struct in `live_node.rs`

Open `crates/evm/src/live_node.rs`. The imports get 3 additions:

```rust
use alloy_consensus::Header;
use alloy_primitives::{Address, B256};
use async_trait::async_trait;
use openhl_consensus::bridge::{BridgeError, ConsensusBridge};
use openhl_types::{BlockHash, ExecutedBlock, PayloadAttrs, PayloadId, PayloadStatus};
use reth_chainspec::{ChainSpec, EthChainSpec};                      // NEW
use reth_consensus::HeaderValidator;                                // NEW
use reth_ethereum_consensus::EthBeaconConsensus;                    // NEW
use reth_primitives_traits::SealedHeader;                           // NEW
use reth_storage_api::{BlockNumReader, HeaderProvider};             // CHANGED: + HeaderProvider
use std::collections::HashMap;
use std::sync::{Arc, Mutex};                                        // CHANGED: + Arc
```

Five new types:
- `ChainSpec` — Reth's chain configuration, passed at construction.
- `EthChainSpec` — trait that gives `ChainSpec` the `next_block_base_fee` method.
- `HeaderValidator` — trait with `validate_header_against_parent`. `EthBeaconConsensus` impls it.
- `EthBeaconConsensus` — Reth's production post-merge header validator.
- `SealedHeader` — `(Header, hash)` pair.

Two changed imports: `HeaderProvider` (for `sealed_header_by_hash`), and `Arc` (for sharing the chain spec).

Now the struct gains two fields:

```rust
#[derive(Debug)]
pub struct LiveRethEvmBridge<P> {
    provider: P,
    chain_spec: Arc<ChainSpec>,                          // NEW
    validator: EthBeaconConsensus<ChainSpec>,            // NEW
    state: Mutex<State>,
}
```

And `new()` is widened to take the chain spec:

```rust
impl<P> LiveRethEvmBridge<P> {
    #[must_use]
    pub fn new(provider: P, chain_spec: Arc<ChainSpec>) -> Self {
        let validator = EthBeaconConsensus::new(Arc::clone(&chain_spec));
        Self {
            provider,
            chain_spec,
            validator,
            state: Mutex::new(State::default()),
        }
    }

    #[must_use]
    pub fn chain_spec(&self) -> &Arc<ChainSpec> {
        &self.chain_spec
    }
}
```

`State` is unchanged — same `next_payload_id`, `pending`, `chain`, `head`.

The `chain_spec()` accessor is added because tests and future production callers will want it (e.g., to ask the chain spec what hardfork is active at a given height). Keeping it exposed via `&Arc<ChainSpec>` lets callers clone if they need to hold their own reference.

### Step 4: Widen the trait bound on `P`

The `impl` block's `where` clause gains one more bound:

```rust
#[async_trait]
impl<P> ConsensusBridge for LiveRethEvmBridge<P>
where
    P: BlockNumReader + HeaderProvider<Header = Header> + Clone + Sync + 'static,
{
```

`HeaderProvider<Header = Header>` — the provider must serve full `Header` objects, not just numbers. The associated-type binding `Header = Header` says "the provider's Header type is *our* alloy Header type." Different Reth versions could parameterize `HeaderProvider` over different header types (e.g., for Optimism); we constrain ours to mainnet Ethereum's.

**`BlockNumReader` is now redundant** in some sense (anything that gives you a full header gives you its number), but we keep it explicit because:
- L12 wrote against just `BlockNumReader` — keeping it documents the L12→L13 progression
- Future callers may want the narrower bound for code paths that only need the number

### Step 5: Upgrade `build_payload` — production-shape headers

This is the load-bearing change. The new `build_payload`:

```rust
    async fn build_payload(
        &self,
        parent: BlockHash,
        attrs: PayloadAttrs,
    ) -> Result<PayloadId, BridgeError> {
        let parent_b256 = B256::from(parent.0);

        // LIVE READ: pull the parent's full sealed header from the real
        // provider so we can copy fields that EthBeaconConsensus will check
        // against during validate_payload (gas_limit drift, EIP-1559 base
        // fee, difficulty=0 post-merge).
        let parent_sealed = self
            .provider
            .sealed_header_by_hash(parent_b256)
            .map_err(|e| BridgeError::Internal(eyre::eyre!("provider error: {e}")))?
            .ok_or_else(|| {
                BridgeError::Rejected(format!("provider has no block with hash {parent_b256}"))
            })?;
        let parent_header = parent_sealed.header();

        let mut s = self.state.lock().expect("state mutex poisoned");
        let id = s.next_payload_id;
        s.next_payload_id += 1;

        let our_timestamp = attrs.timestamp.max(parent_header.timestamp + 1);

        // Compute the EIP-1559 base fee for our block via the chain spec —
        // identical math to what EthBeaconConsensus's
        // `validate_against_parent_eip1559_base_fee` will check against.
        let next_base_fee = self
            .chain_spec
            .next_block_base_fee(parent_header, our_timestamp);

        let header = Header {
            parent_hash: parent_b256,
            number: parent_header.number + 1,
            // Timestamp must be strictly greater than parent's; force at least
            // parent.timestamp + 1 even if attrs.timestamp came in stale.
            timestamp: our_timestamp,
            beneficiary: Address::from(attrs.fee_recipient),
            mix_hash: B256::from(attrs.prev_randao),
            // Keep gas_limit identical to parent so EthBeaconConsensus's
            // 1/1024 drift check passes trivially. A real payload builder
            // would tune this per network policy.
            gas_limit: parent_header.gas_limit,
            // Post-merge: difficulty must be 0.
            difficulty: alloy_primitives::U256::ZERO,
            base_fee_per_gas: next_base_fee,
            ..Default::default()
        };
        let hash = header.hash_slow();
        s.pending.insert(id, (hash, header));
        Ok(PayloadId(id))
    }
```

Three changes from L12:

1. **`sealed_header_by_hash` instead of `block_number`.** We need the full parent header now, not just its number. The error mapping is the same: `Err(provider_err)` → `Internal`, `Ok(None)` → `Rejected`.

2. **`our_timestamp = attrs.timestamp.max(parent_header.timestamp + 1)`.** Timestamps must be strictly monotonic. If the engine passes us `attrs.timestamp = 5` and `parent.timestamp = 100`, we use `101` (parent + 1). This prevents stale clock data from causing immediate `validate_payload` failures.

3. **Header construction now has 4 carefully-chosen fields** (plus the ones from L12):
   - `gas_limit = parent_header.gas_limit` — copying ensures the 1/1024 drift check is trivially satisfied.
   - `difficulty = U256::ZERO` — post-merge invariant. Any non-zero value fails the validator.
   - `base_fee_per_gas = next_base_fee` — computed via `chain_spec.next_block_base_fee(...)`, the *same helper* the validator uses.
   - `..Default::default()` — everything else (gas_used, transactions_root, etc.) stays at zero. They'd matter for full execution validation in a future stage, not for header-against-parent.

> 🛑 **Anti-fluency.** "Why does the build call `chain_spec.next_block_base_fee(parent, timestamp)` instead of doing the EIP-1559 math inline?" **Because the validator does the SAME call.** If you wrote the math by hand, you'd have to keep your impl in sync with Reth's whenever the formula changes (which it does — Cancun changed `BASE_FEE_MAX_CHANGE_DENOMINATOR`, future forks will tweak again). **By calling the chain spec's helper, your builder is guaranteed to agree with the validator forever — including across hardforks the chain spec knows about and your builder doesn't.**

### Step 6: Rewrite `validate_payload`

The other load-bearing change. Replace the stub with:

```rust
    async fn validate_payload(
        &self,
        block: &ExecutedBlock,
    ) -> Result<PayloadStatus, BridgeError> {
        let block_hash = B256::from(block.hash.0);
        let parent_hash = B256::from(block.parent_hash.0);

        // Find our header for this block. In single-validator mode we always
        // built it, so it sits in pending (pre-commit) or chain (post-commit).
        let header = {
            let s = self.state.lock().expect("state mutex poisoned");
            s.pending
                .values()
                .find(|(h, _)| *h == block_hash)
                .map(|(_, h)| h.clone())
                .or_else(|| s.chain.get(&block_hash).cloned())
        };
        let Some(header) = header else {
            return Ok(PayloadStatus::Invalid);
        };

        // Fetch parent sealed header from the LIVE provider.
        let Some(parent_sealed) = self
            .provider
            .sealed_header_by_hash(parent_hash)
            .map_err(|e| BridgeError::Internal(eyre::eyre!("provider error: {e}")))?
        else {
            return Ok(PayloadStatus::Invalid);
        };

        // Run Reth's real header validator. EthBeaconConsensus checks number
        // monotonicity, timestamp monotonicity, gas-limit drift, base-fee.
        let our_sealed = SealedHeader::new(header, block_hash);
        match self
            .validator
            .validate_header_against_parent(&our_sealed, &parent_sealed)
        {
            Ok(()) => Ok(PayloadStatus::Valid),
            Err(_) => Ok(PayloadStatus::Invalid),
        }
    }
```

Four phases:

1. **Header lookup** — find our header for `block.hash` in `pending` (just-built) or `chain` (already-committed). If not found → `Invalid`. In single-validator mode, every block we validate is one *we* built, so it'll be in one of those two maps.
2. **Parent lookup via live provider** — `sealed_header_by_hash(parent_hash)`. If not found → `Invalid`. If the provider errors → `BridgeError::Internal`.
3. **Wrap in `SealedHeader`** — `SealedHeader::new(header, block_hash)` pairs the header with its hash without re-computing.
4. **Run the validator** — `validator.validate_header_against_parent(&our_sealed, &parent_sealed)` returns `Result<(), ConsensusError>`. Map `Ok(())` → `PayloadStatus::Valid`, any `Err(_)` → `PayloadStatus::Invalid`.

**The 4 sub-checks Reth runs internally** (no need to write them yourself, but worth knowing):
- `validate_against_parent_hash_number` — block.number == parent.number + 1
- `validate_against_parent_timestamp` — header.timestamp > parent.timestamp
- `validate_against_parent_gas_limit` — gas_limit within 1/1024 of parent
- `validate_against_parent_eip1559_base_fee` — base_fee_per_gas matches the EIP-1559 formula

If any fails, the validator returns `Err(...)`. We don't propagate the specific error — at this layer the engine just needs to know "valid or not." Future debugging could log the error type.

> 🛑 **Anti-fluency.** "Why map `Err(_)` to `PayloadStatus::Invalid` instead of `BridgeError::Internal`?" **Because validation failure is a protocol-level signal, not an operational failure.** "This block doesn't pass the rules" is what the validator is *for* — it's the answer to a question, not a crash. `BridgeError::Internal` would propagate up and kill the engine app loop. `PayloadStatus::Invalid` lets the engine continue and treat the block as a rejected proposal. **Match the error type to the conversational level.**

### Step 7: Update the test — 2 new assertions

The test gets a new bridge constructor call (now takes chain_spec) plus two `validate_payload` assertions:

```rust
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn live_bridge_builds_on_real_genesis() {
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

        let genesis_hash_b256 = node
            .provider
            .block_hash(0)
            .expect("provider call failed")
            .expect("provider has no block 0 (genesis)");

        // CHANGED: bridge takes chain_spec now (wires up EthBeaconConsensus).
        let bridge = LiveRethEvmBridge::new(node.provider.clone(), chain_spec.clone());

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

        assert_eq!(block.parent_hash, BlockHash(genesis_hash_b256.0));
        assert_eq!(block.number, 1);

        // NEW: validate_payload runs EthBeaconConsensus against the live parent.
        let status = bridge
            .validate_payload(&block)
            .await
            .expect("validate_payload failed");
        assert_eq!(status, PayloadStatus::Valid);

        // NEW: unknown block hash → Invalid (we have no header to validate).
        let unknown_block = ExecutedBlock {
            hash: BlockHash([0xddu8; 32]),
            parent_hash: BlockHash(genesis_hash_b256.0),
            number: 1,
            state_root: [0u8; 32],
        };
        let status = bridge
            .validate_payload(&unknown_block)
            .await
            .expect("validate_payload failed");
        assert_eq!(status, PayloadStatus::Invalid);

        // (Negative case from L12 unchanged.)
        let fake_parent = BlockHash([0xeeu8; 32]);
        let err = bridge.build_payload(fake_parent, attrs).await.unwrap_err();
        assert!(matches!(err, BridgeError::Rejected(_)));
    }
```

Two new blocks:

- **`validate_payload(&block)` after `build_payload`** — the just-built block must validate. **This is the load-bearing assertion** — proves that build and validate agree on the rules. If you got the EIP-1559 formula wrong, or the difficulty was non-zero, or gas_limit drifted, this fails.
- **`validate_payload(&unknown_block)`** — a block whose hash isn't in pending/chain returns `Invalid`. Tests the lookup fallthrough.

## Test

```bash
cargo test -p openhl-evm live_bridge_builds_on_real_genesis --release
```

After ~30 seconds (compile + test):

```
running 1 test
test live_node::tests::live_bridge_builds_on_real_genesis ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

Test runtime: still ~2.4 seconds — the Reth bootstrap dominates, and `validate_payload` adds < 1ms.

Full suite:

```bash
cargo test
```

…should produce 37 tests workspace-wide (no change in count — the existing test gained assertions).

Common errors and fixes:

- **`assert_eq!(status, PayloadStatus::Valid)` fails** — the most common issue. Your `build_payload` is producing a header `EthBeaconConsensus` rejects. Possible causes:
  - Forgot `difficulty: U256::ZERO` — defaults to non-zero, fails post-merge check.
  - Forgot `gas_limit: parent_header.gas_limit` — defaults to zero, drifts >1/1024 from parent.
  - Computed base_fee wrong — must use `chain_spec.next_block_base_fee(parent, timestamp)`.
  - Timestamp not strictly greater than parent — must enforce `our_timestamp = attrs.timestamp.max(parent_header.timestamp + 1)`.
- **`error[E0277]: HeaderProvider not satisfied`** — workspace `reth-storage-api` SHA mismatch with `reth-provider`. All reth-* git-pinned deps must share the same SHA.
- **`error[E0277]: HeaderValidator is not in scope`** — forgot `use reth_consensus::HeaderValidator`. The trait must be in scope to call its methods.
- **`error: 'next_block_base_fee' not found on ChainSpec`** — forgot `use reth_chainspec::EthChainSpec`. `next_block_base_fee` is on the `EthChainSpec` extension trait, not `ChainSpec` itself.

## Design reflection

Three load-bearing decisions encoded here:

1. **The builder and the validator share a source of truth.** `ChainSpec::next_block_base_fee` is what builds the next block's base fee; `EthBeaconConsensus::validate_against_parent_eip1559_base_fee` calls the same helper to check. **No duplicated math, no risk of drift across hardforks.** This is the pattern to copy any time you have a build/validate pair.

2. **The validator's error becomes `Invalid`, not propagated.** A validator answering "no, this is malformed" is the *normal* path, not a crash. Mapping its `Err(_)` to `PayloadStatus::Invalid` keeps the engine running so it can pick the next proposal. Operational failures (DB errors) still escalate via `BridgeError::Internal`.

3. **The trait bound on `P` widens incrementally.** L12 needed `BlockNumReader`; L13 needs `BlockNumReader + HeaderProvider`. Each lesson exposes a new capability surface. **Trait bounds are spec — they tell consumers exactly what your implementation requires.**

## Answer key

```bash
cd ~/code/openhl-reference
git checkout 0844d58
diff -u ~/code/my-openhl/Cargo.toml ./Cargo.toml
diff -u ~/code/my-openhl/crates/evm/Cargo.toml ./crates/evm/Cargo.toml
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
```

The reference at `0844d58` has ~141 lines changed in `live_node.rs` from L12. The new struct fields, the upgraded `build_payload`, the rewritten `validate_payload`, and the new test assertions should match closely. Doc comments and exact wording can vary.

Return:

```bash
git checkout main
```

## Common questions

**Q: Why not run the four sub-checks (`validate_against_parent_hash_number`, etc.) manually?**
You could — they're all `pub` on `EthBeaconConsensus`. But `validate_header_against_parent` runs all four in sequence with the right argument shapes and proper short-circuiting. **Re-implementing the orchestration is the kind of error-prone work the trait method exists to prevent.** Bonus: future Reth versions might add a fifth check; calling the orchestrating method picks it up for free.

**Q: What's `SealedHeader::new(header, hash)` doing that's different from just keeping them as a tuple?**
Caching. `SealedHeader` stores the hash, so subsequent calls to `.hash()` on it don't re-compute (which is a Keccak over ~500 bytes — meaningful at high block rates). Tuples would force re-computation. **It's an optimization that matters at the network edge** where you process thousands of blocks per second; for our test, the savings is microseconds.

**Q: Why does the test still use `chain_spec.clone()` even though `dev_chain_spec()` returns `Arc<ChainSpec>`?**
Cloning an `Arc<T>` increments the refcount; it doesn't copy the underlying `ChainSpec` data. We need three references: one inside `NodeConfig`, one passed to `LiveRethEvmBridge::new`, one for any future use. Each `.clone()` is just an atomic increment — measured in nanoseconds.

**Q: What happens if I pass `chain_spec: Arc::new(ChainSpec::default())` instead of `dev_chain_spec()`?**
The validator and the chain would disagree on what hardfork is active. `ChainSpec::default()` is a minimal Ethereum mainnet shape; the live node was built with `dev_chain_spec()` (chainId 2600, all forks at 0). They'd diverge on the `EthChainSpec::is_fork_active_at_timestamp(...)` checks the validator runs internally. **Pass the same chain_spec to both the node and the bridge** — it's the contract.

## Next lesson (L14)

Two of the four `ConsensusBridge` methods now hit live Reth. **The third one — `commit` — still records hashes into an in-process `chain: HashMap`.** L14 (the last big lesson) replaces that with a real **Engine API forkchoice update**, the JSON-RPC call that Reth uses to commit blocks in production. After L14, our bridge produces the same wire-format actions that any Ethereum CL client (Lighthouse, Prysm, Teku) would. **L15 is then the capstone** — a one-page recap, an "everything you built" diagram, and the optional production-readiness checklist (block bodies, gossip codecs, real WAL).
````

---

## Seed-file slot

L13 lands in Module 6 (Live Reth) at sortOrder 2:

```typescript
{
  title: 'Lesson 13 — validate_payload runs Reth\'s EthBeaconConsensus',
  slug: 'openhl-validate-payload-en',
  type: 'CONTENT',
  sortOrder: 2,
  duration: 55,
  xpReward: 100,
  content: `# Lesson 13 — \`validate_payload\` runs Reth's \`EthBeaconConsensus\`\n\n...`
},
```

## SHA pinning discipline

L13 cites one openhl commit (§Answer key):
- `0844d58` (Stage 7c — validate_payload runs Reth's EthBeaconConsensus)

The first commit where production validation rules force the builder to be honest.

## Style review notes (self-critique before paste)

- **§Plan's "producer-consumer self-consistency pattern" callout** generalizes the lesson beyond this specific bridge — "if you build and validate something, derive both from the same source." This is universal advice.
- **The four sub-checks named in §Step 6** give readers a quick-reference for what `EthBeaconConsensus` actually does without needing them to dig into Reth source.
- **§Step 5's "anti-fluency about `next_block_base_fee`"** anticipates the natural instinct to inline the math, naming the production cost (hardfork drift) explicitly.
- **§Step 6's "validator's error becomes Invalid, not propagated" callout** is the conversational-level rule that distinguishes protocol from operational errors. Worth repeating across the course.
- **The L14 preview names commit + forkchoice** to set up the final big lesson.
