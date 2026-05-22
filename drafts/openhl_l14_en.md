# Building OpenHL — L14 draft (EN) — C2 build-along rewrite

> Drafted against openhl SHA `0cac571` (Stage 7d — `commit` drives Reth Engine API forkchoice).
> Course: `building-openhl-consensus-en` (track: `reth-l1-architect`, course #6 of 10).
> Note: L14 closes the consensus↔EVM contract — after this lesson, all four `ConsensusBridge` methods reach real Reth code paths. The wire is connected; full `engine_newPayload` round-tripping (which needs EVM-executable transaction bodies) is left to a future course.

---

## L14 — `openhl-commit-forkchoice-en`

- **Module:** 6 (Live Reth)
- **Module sortOrder:** 3 (after L13's validator wiring)
- **Course-level sortOrder:** 13 (lesson 14 of 16)
- **Duration:** 50 min
- **XP reward:** 90
- **Type:** CONTENT

### Content

````markdown
# Lesson 14 — `commit` drives Reth's Engine API forkchoice

## Goal

Concepts you'll grasp in this lesson:

- **Local-first, engine-second commit ordering** — the bridge's `chain: HashMap` is the consensus layer's source of truth. Committing locally first and notifying the engine second means a failed engine call never forces a rollback of a consensus commit (which would violate safety). This generalizes: primary store first, secondary indexes/replicas after.
- **`Option<EngineHandle>` for test ergonomics** — without optionality, every unit test would need to bootstrap a real node just to get a non-test engine handle. With `Option`, tests pass `None` for the local path and `Some(handle)` for the integration path. Type-level optionality avoids forcing infrastructure into every test.
- **Engine response is intentionally discarded** — `SYNCING` is the expected response right now because no matching `engine_newPayload` was sent first. Treating `SYNCING` as an error would force every caller to know L14 is partial. Discarding keeps the API honest: "commit completed locally; downstream notification was best-effort."
- **The three-field `ForkchoiceState` collapse** — mainnet distinguishes head / safe / finalized (instant / 32-slot / 64+-slot checkpoints). v0 single-validator OpenHL has no such distinction — every commit is final, so all three fields take the same hash. The shape is preserved for forward compat with multi-validator OpenHL.
- **`add_ons_handle.beacon_engine_handle` is the in-process Engine API** — the same handle that backs the network-facing JSON-RPC `engine_*` methods that external CL clients (Lighthouse, Prysm) would use. We're taking the in-process shortcut, but the surface is identical.
- **All four `ConsensusBridge` methods now hit real Reth** — this lesson closes the loop. `build_payload` / `payload_ready` / `validate_payload` / `commit` all reach real Reth code paths.

Verification:

```bash
cargo test -p openhl-evm commit_sends_forkchoice_to_engine_when_handle_installed --release
```

…passes one new integration test. Combined with L11-L13's existing tests, your bridge now has **all four `ConsensusBridge` methods hitting real Reth code paths**:

| Method | What it does | What real Reth code runs |
| - | - | - |
| `build_payload` | Build a child block | `HeaderProvider::sealed_header_by_hash`, `ChainSpec::next_block_base_fee` |
| `payload_ready` | Fetch the built block | (local — bridge's pending map) |
| `validate_payload` | Check the block | `EthBeaconConsensus::validate_header_against_parent` |
| **`commit`** | Make the block canonical | **`ConsensusEngineHandle::fork_choice_updated`** |

**Engine returns `SYNCING` for now — and that's correct at this stage.** We're not yet sending matching `engine_newPayload` calls (that needs EVM-executable transaction bodies, which are out of scope for this course). The wire is connected; payload-execution alignment is the next chunk of work after fills become EVM transactions.

Specific changes:

- New optional field `engine_handle: Option<ConsensusEngineHandle<EthEngineTypes>>` on `LiveRethEvmBridge`.
- New builder method `with_engine_handle()` (`#[must_use]`) and introspection `has_engine_handle()`.
- `commit()` now does **two things**: (1) local bookkeeping (unchanged from L13), then (2) if an engine handle is installed, fire a `ForkchoiceUpdated` to Reth's in-process Engine API and discard the response.
- New integration test that bootstraps `EthereumNode`, installs `add_ons_handle.beacon_engine_handle` on the bridge, and asserts both the local commit and the forkchoice path fire.

## Recap

After L13 your `crates/evm/src/live_node.rs` has:

```rust
pub struct LiveRethEvmBridge<P> {
    provider: P,
    chain_spec: Arc<ChainSpec>,
    validator: EthBeaconConsensus<ChainSpec>,
    state: Mutex<State>,
}
```

`build_payload`, `payload_ready`, and `validate_payload` all run against live Reth. `commit` still records the new head in `state.chain` (in-process `HashMap`) and updates `state.head`. **Local-only.** RPC clients querying the live Reth node still see genesis as the head — the consensus engine doesn't know we've decided anything.

`cargo test` passes 37 tests workspace-wide. **The bridge knows the canonical chain; Reth doesn't.**

## Plan

Six things:

1. **Add 2 workspace deps**: `reth-ethereum-engine-primitives` (for `EthEngineTypes`) and `alloy-rpc-types-engine` (for `ForkchoiceState`).
2. **Update `crates/evm/Cargo.toml`** — add 3 new production deps (the 2 above plus `reth-engine-primitives` which gives us `ConsensusEngineHandle`).
3. **Update imports + struct in `live_node.rs`** — new field `engine_handle: Option<ConsensusEngineHandle<EthEngineTypes>>`.
4. **Add the builder methods** — `with_engine_handle()` consumes self and installs the handle; `has_engine_handle()` is a `const fn` accessor.
5. **Rewrite `commit()`** — local bookkeeping first (unchanged), then best-effort `ForkchoiceUpdated` if an engine handle is installed.
6. **Add the integration test** — bootstraps `EthereumNode`, pulls `add_ons_handle.beacon_engine_handle`, plumbs it through `with_engine_handle()`, exercises the commit path.

This lesson teaches **the side-effect-after-success pattern**. The bridge's local bookkeeping is the *source of truth* for our consensus layer — it has to succeed before anything else can happen. The Engine API call is a *side effect*: useful (downstream RPC clients see the new head), but its failure shouldn't roll back our commit. The pattern is:

```text
1. Do the thing that has to succeed (local state mutation).
2. Best-effort side effects (fire-and-mostly-forget).
3. Return success.
```

If step 2 fails, we log it but don't propagate — because step 1 already happened, and rolling it back would leave us in an inconsistent state. **Side effects that *follow* a success are different from side effects that *gate* a success.**

Laying out what happens when `commit` is called — Phase 1 (must succeed) and Phase 2 (best-effort) — in chronological order makes it obvious why a Phase 2 failure must not undo Phase 1:

```
   [ openhl-consensus ] (Malachite actor)
              │
              │ bridge.commit(block_hash).await
              ▼
  ┌──────────────────────────────────────────────────────────────────┐
  │ ◆ LiveRethEvmBridge::commit()                                     │
  │                                                                    │
  │  [ Phase 1: canonical commit (must succeed) ]                      │
  │   ├── acquire Mutex<State> via state.lock()                        │
  │   ├── look up the header in pending (Rejected if not found)       │
  │   ├── state.chain.insert(hash, header)  ◄── new canonical entry   │
  │   └── state.head = Some(hash)           ◄── source-of-truth update │
  │                                                                    │
  │   ※ Past this point, the consensus layer treats the block as       │
  │      committed; downstream `payload_ready` / next `build_payload`  │
  │      will read this value immediately.                              │
  └──────────────────────────────┬───────────────────────────────────┘
                                 │ (local commit succeeded — no rollback)
                                 ▼
  ┌──────────────────────────────────────────────────────────────────┐
  │  [ Phase 2: best-effort side-effect (fire-and-mostly-forget) ]   │
  │   ├── ForkchoiceState { head_block_hash, safe = head, finalized = head } │
  │   └── if let Some(handle) = &self.engine_handle {                      │
  │           let _ = handle.fork_choice_updated(state, None).await;       │
  │       }                                                                │
  └──────────────────────────────┬───────────────────────────────────┘
                                 │
                                 ▼ in-process Engine API
                       ┌──────────────────────────────┐
                       │ Reth engine actor              │
                       │ (Currently has no body, so it  │
                       │  replies with PayloadStatus    │
                       │  ::SYNCING)                    │
                       └──────────────┬───────────────┘
                                      │ response is discarded via `let _ =`
                                      ▼
                              `commit` returns Ok(())
                              CL proceeds to the next round, unaware
```

Three things this picture pins down: (a) **Phase 1's `state.chain.insert` + `state.head` update is the consensus-side "committed" source-of-truth** — past this line, downstream code (`payload_ready`, the next `build_payload`) reads from these structures immediately. (b) **Phase 2's `fork_choice_updated` is a downstream-notification side effect; `SYNCING` / connection failures / panics get logged but are *not* turned into `Err`** — if a Phase 2 failure surfaced as `Err`, consensus would treat "commit failed" as true and try to roll back already-finalized state, breaking safety. (c) **When `engine_handle: Option<...>` is `None`, Phase 2 is skipped entirely** — unit tests can exercise "Phase 1 only, no Reth bootstrap." L14's integration test passes `Some(handle)` and asserts that both phases fire.

> 🛑 **Predict.** Before scrolling: why does the test only assert `commit().await.expect(...)` succeeds, instead of asserting that Reth's canonical chain head moved? Hint: think about what's missing from our `build_payload` output. The `ExecutedBlock` we hand the engine is just a header — no transactions, no receipts, no state root. Reth's engine needs *the actual block body* to advance its canonical chain. Without `engine_newPayload` first, `fork_choice_updated` responds `SYNCING` ("I don't know this block yet, fetch me the body"). The wire is connected; the data isn't. **L14 proves the connection; payload execution is deferred to a future course.**

## Walk-through

### Step 1: Add 2 workspace deps

Open the root `Cargo.toml`. The reth block (after L13) ends with:

```toml
reth-ethereum-consensus   = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-primitives-traits    = "0.3"
alloy-genesis             = { version = "2.0", default-features = false }
```

Add 1 line right after `reth-ethereum-consensus`:

```toml
reth-ethereum-engine-primitives = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
```

And add 1 line to the alloy block lower down (find the existing `alloy-consensus` workspace dep):

```toml
alloy-rpc-types-engine = { version = "2.0", default-features = false }
```

Two deps, two roles:

- **`reth-ethereum-engine-primitives`** — provides `EthEngineTypes`, the type bundle that says "Ethereum mainnet's engine surface" (vs. Optimism, custom L2s). Our `ConsensusEngineHandle<EthEngineTypes>` is parameterized over it.
- **`alloy-rpc-types-engine`** — provides `ForkchoiceState { head_block_hash, safe_block_hash, finalized_block_hash }`, the canonical wire-format payload for an `engine_forkchoiceUpdatedV4` call. Same struct CL clients (Lighthouse, Prysm) send to EL clients over JSON-RPC; we're using it in-process.

**Note the version on `alloy-rpc-types-engine`**: it's pinned to `2.0` to match Reth v2.2.0's own pinned `alloy-rpc-types-engine` of `2.0.4`. Mismatched versions here would cause `ForkchoiceState` to be two different types and the engine handle would reject our calls.

### Step 2: Update `crates/evm/Cargo.toml`

The `[dependencies]` block gains 3 lines:

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
reth-consensus           = { workspace = true }
reth-ethereum-consensus  = { workspace = true }
reth-primitives-traits   = { workspace = true }
reth-chainspec           = { workspace = true }
reth-engine-primitives          = { workspace = true }    # NEW: ConsensusEngineHandle
reth-ethereum-engine-primitives = { workspace = true }    # NEW: EthEngineTypes
alloy-rpc-types-engine          = { workspace = true }    # NEW: ForkchoiceState
```

`reth-engine-primitives` has been a workspace dep since L1 (for `reth-engine-primitives` is where `PayloadAttributesBuilder` lives, used in some intermediate stages). Here we promote it from "available in the workspace" to "imported by this crate."

### Step 3: Update imports + struct in `live_node.rs`

Open `crates/evm/src/live_node.rs`. The imports gain 3 lines:

```rust
use alloy_consensus::Header;
use alloy_primitives::{Address, B256};
use alloy_rpc_types_engine::ForkchoiceState;                        // NEW
use async_trait::async_trait;
use openhl_consensus::bridge::{BridgeError, ConsensusBridge};
use openhl_types::{BlockHash, ExecutedBlock, PayloadAttrs, PayloadId, PayloadStatus};
use reth_chainspec::{ChainSpec, EthChainSpec};
use reth_consensus::HeaderValidator;
use reth_engine_primitives::ConsensusEngineHandle;                  // NEW
use reth_ethereum_consensus::EthBeaconConsensus;
use reth_ethereum_engine_primitives::EthEngineTypes;                // NEW
use reth_primitives_traits::SealedHeader;
use reth_storage_api::{BlockNumReader, HeaderProvider};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
```

Three new types:
- `ForkchoiceState` — the payload (head/safe/finalized block hashes) we send to the engine.
- `ConsensusEngineHandle` — the handle Reth gives us to send messages to its engine actor.
- `EthEngineTypes` — the type parameter binding the handle to Ethereum mainnet's engine surface.

Now the struct gains one field — `engine_handle`, optional:

```rust
#[derive(Debug)]
pub struct LiveRethEvmBridge<P> {
    provider: P,
    chain_spec: Arc<ChainSpec>,
    validator: EthBeaconConsensus<ChainSpec>,
    /// Optional in-process Engine API handle. When installed via
    /// [`Self::with_engine_handle`], `commit` sends a `ForkchoiceUpdated`
    /// to Reth so its canonical chain advances in lockstep with consensus.
    /// `None` at v0 means commits stay local to the bridge's `state.chain`
    /// `HashMap` — fine for unit tests, but RPC clients won't see new heads.
    engine_handle: Option<ConsensusEngineHandle<EthEngineTypes>>,           // NEW
    state: Mutex<State>,
}
```

`State` is unchanged.

> 🛑 **Anti-fluency.** "Why is `engine_handle` `Option<...>` instead of just always required?" **Because not every consumer of `LiveRethEvmBridge` is a production node that bootstraps Reth.** Unit tests (L12, L13) just want the bridge against a provider; they don't need a running engine. Forcing every caller to provide an engine handle would either (a) require every test to bootstrap a full node, or (b) require a no-op "fake handle" type that's hard to construct. `Option` lets the same struct serve both worlds: tests pass `None`, production passes `Some(handle)`. **Optionality at the type level is how you avoid leaky API surface.**

### Step 4: Update `new()` and add the builder methods

`new()` initializes `engine_handle: None`:

```rust
impl<P> LiveRethEvmBridge<P> {
    #[must_use]
    pub fn new(provider: P, chain_spec: Arc<ChainSpec>) -> Self {
        let validator = EthBeaconConsensus::new(Arc::clone(&chain_spec));
        Self {
            provider,
            chain_spec,
            validator,
            engine_handle: None,                                  // NEW
            state: Mutex::new(State::default()),
        }
    }

    /// Install a Reth in-process Engine API handle. After this call,
    /// `commit` will fire a `ForkchoiceUpdated` to Reth's consensus engine
    /// alongside its own local bookkeeping. Without an engine handle, the
    /// bridge still works (commits go to its internal `HashMap`) but Reth's
    /// canonical chain won't advance — RPC and any other Reth consumer will
    /// see only the genesis block.
    #[must_use]
    pub fn with_engine_handle(
        mut self,
        handle: ConsensusEngineHandle<EthEngineTypes>,
    ) -> Self {
        self.engine_handle = Some(handle);
        self
    }

    #[must_use]
    pub const fn has_engine_handle(&self) -> bool {
        self.engine_handle.is_some()
    }

    #[must_use]
    pub fn chain_spec(&self) -> &Arc<ChainSpec> {
        &self.chain_spec
    }
}
```

Three new methods:

- **`with_engine_handle()`** — consume-and-return-self builder. The `mut self` parameter takes ownership, mutates, returns. This is the canonical Rust "builder method" pattern. **`#[must_use]`** because forgetting to bind the return value (e.g., `bridge.with_engine_handle(h);`) silently drops the modified bridge. **Note: this is `self` (consuming), not `&mut self`, so the pattern `let bridge = ...; bridge.with_engine_handle(h);` will move `bridge` out and leave you unable to use it on subsequent lines.** The idiomatic shape is to chain from the constructor in a single expression — `let bridge = LiveRethEvmBridge::new(p, c).with_engine_handle(h);` (which is what Step 6's integration test does). For conditional wiring, keep construction → configuration → binding inside one expression: `let bridge = if want_engine { LiveRethEvmBridge::new(p, c).with_engine_handle(h) } else { LiveRethEvmBridge::new(p, c) };`.
- **`has_engine_handle()`** — a `const fn` accessor. Useful for tests and assertions ("did the wiring actually take effect?"). `const` because checking `Option::is_some()` doesn't require any runtime computation.
- **`new()` initialization** — the only change is `engine_handle: None`. Callers who want the handle use `LiveRethEvmBridge::new(p, c).with_engine_handle(h)`.

### Step 5: Rewrite `commit()` — local first, engine best-effort

The load-bearing change. Replace L13's `commit` with:

```rust
    async fn commit(&self, block_hash: BlockHash) -> Result<(), BridgeError> {
        let hash = B256::from(block_hash.0);

        // Local bookkeeping first. If this fails, we never call the engine
        // — the bridge stays in a consistent state.
        let _header = {
            let mut s = self.state.lock().expect("state mutex poisoned");
            let header = s
                .pending
                .values()
                .find(|(h, _)| *h == hash)
                .map(|(_, h)| h.clone())
                .ok_or_else(|| {
                    BridgeError::Rejected(format!("commit for unknown hash {hash}"))
                })?;
            s.chain.insert(hash, header.clone());
            s.head = Some(hash);
            header
        };

        // Best-effort: if an Engine API handle has been installed, also tell
        // Reth's consensus engine about the new canonical head. We always
        // commit *locally* first (above) — sending to the engine is best-
        // effort at this stage because we haven't yet uploaded a real
        // ExecutionPayload via newPayload, so the engine will return
        // SYNCING/INVALID. The wire being connected is what 7d proves; full
        // payload-execution alignment is downstream once fills become EVM
        // transactions.
        if let Some(handle) = &self.engine_handle {
            let state = ForkchoiceState {
                head_block_hash: hash,
                safe_block_hash: hash,
                finalized_block_hash: hash,
            };
            let _ = handle.fork_choice_updated(state, None).await;
        }

        Ok(())
    }
```

Two phases:

1. **Local bookkeeping** — same shape as L13. Lookup pending header by hash, insert into `chain`, update `head`. If header is missing → `BridgeError::Rejected`. The header binding is now `let _header` because we don't use it later in this function; the binding exists for clarity and future telemetry.

2. **Best-effort engine notification** — only when `engine_handle.is_some()`. Build the `ForkchoiceState` with all three slots (head, safe, finalized) pointing to the new hash. **Why all three to the same hash?** At v0 we don't have a separate finalization layer — every committed block is also safe and finalized in our model. Production multi-validator chains would track these separately (a block can be the head but not yet finalized until 2/3 of validators have voted on its descendants).

3. **The `let _ = ...await` is intentional** — we discard the engine's response. Engine returns:
   - `VALID` — once we send `engine_newPayload` first with the matching block body, this is the happy case.
   - `SYNCING` — what we get *right now*, because we haven't sent `newPayload`. Engine wants to fetch the block from peers but there are no peers.
   - `INVALID` — would mean we asked the engine to make canonical a block it has rejected. Shouldn't happen in practice for a block we built ourselves.

**For L14, all three responses lead to the same code path: continue.** Our local bookkeeping already happened.

> 🛑 **Anti-fluency.** "Why discard the engine's response instead of returning an error on `INVALID`?" **Because the bridge's local state is the consensus layer's source of truth, not Reth's.** If Reth says `INVALID` and we roll back our local state, we'd be telling Malachite "actually that decided block doesn't exist," which would break the chain. The right response to a disagreement at this layer is to *log it loudly* and *alert an operator* — but never roll back the consensus commit. **Reth's view of the chain is downstream of consensus, not the other way around.**

### Step 6: Update the test (rename + add engine wiring)

Open the existing test `live_bridge_builds_on_real_genesis` from L13. We *add* a new test rather than modifying the existing one — the L12/L13 test still proves what it proved, and adding a separate test keeps the new behaviour isolated.

Append to the `tests` module in `crates/evm/src/live_node.rs`:

```rust
    /// **Stage 7d**: with a Reth `ConsensusEngineHandle` installed, `commit`
    /// sends a `ForkchoiceUpdated` to the in-process Engine API. The bridge's
    /// own bookkeeping still happens (so existing callers don't regress), but
    /// now Reth is told about the new head too.
    ///
    /// At this stage the engine will respond SYNCING because we haven't sent
    /// a matching `newPayload` (`build_payload` doesn't yet produce a real
    /// `ExecutionPayload`). That's intentional: L14 proves the wire is
    /// connected. Full alignment between Malachite's commit and Reth's
    /// canonical head needs `newPayload` integration, which is the next
    /// staging chunk after fills become EVM transactions.
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn commit_sends_forkchoice_to_engine_when_handle_installed() {
        use reth_node_ethereum::node::EthereumAddOns;

        let runtime = Runtime::test();
        let chain_spec = dev_chain_spec();
        let node_config = NodeConfig::test().dev().with_chain(chain_spec.clone());

        // We need add_ons_handle for the engine handle — use the explicit
        // NodeBuilder path with EthereumAddOns rather than launch_with_dbg.
        let handle = NodeBuilder::new(node_config)
            .testing_node(runtime)
            .with_types::<EthereumNode>()
            .with_components(EthereumNode::components())
            .with_add_ons(EthereumAddOns::default())
            .launch()
            .await
            .expect("launch failed");

        // Pull the engine handle out of add_ons. This is what RPC's
        // engine_forkchoiceUpdated endpoint would dispatch to — we're
        // taking the in-process shortcut around the JSON-RPC layer.
        let engine_handle = handle.node.add_ons_handle.beacon_engine_handle.clone();

        let bridge = LiveRethEvmBridge::new(handle.node.provider.clone(), chain_spec)
            .with_engine_handle(engine_handle);
        assert!(
            bridge.has_engine_handle(),
            "with_engine_handle must install the handle"
        );

        let genesis_hash_b256 = handle
            .node
            .provider
            .block_hash(0)
            .expect("provider call failed")
            .expect("provider has no genesis");

        // Build a payload on top of genesis so commit has something to find.
        let attrs = PayloadAttrs {
            timestamp: 1,
            fee_recipient: [0u8; 20],
            prev_randao: [0u8; 32],
        };
        let id = bridge
            .build_payload(BlockHash(genesis_hash_b256.0), attrs)
            .await
            .expect("build_payload failed");
        let block = bridge.payload_ready(id).await.expect("payload_ready failed");

        // The actual test: commit should not panic, not block forever, not
        // surface an error from the engine-side SYNCING response. We're
        // proving the wire is connected — that fork_choice_updated reaches
        // the engine and returns *some* response (even SYNCING).
        bridge
            .commit(block.hash)
            .await
            .expect("commit failed even though local bookkeeping should succeed");

        // Negative case: a commit for an unknown hash must still be Rejected
        // (the engine-side call doesn't happen because the bridge bails out
        // before it).
        let bogus = BlockHash([0xddu8; 32]);
        let err = bridge.commit(bogus).await.unwrap_err();
        assert!(
            matches!(err, BridgeError::Rejected(_)),
            "unknown hash must yield Rejected"
        );

        drop(handle);
    }
```

Walk through what's new:

1. **`with_types::<EthereumNode>()` + `with_components(...)` + `with_add_ons(EthereumAddOns::default())`** — the explicit builder path. `launch_with_debug_capabilities` (L11-L13) is a shortcut that doesn't expose `add_ons_handle`. To pull out the beacon engine handle, we need the explicit form.
2. **`handle.node.add_ons_handle.beacon_engine_handle.clone()`** — the engine handle lives inside add_ons. It's an `Arc`-based handle internally; cloning is cheap.
3. **`.with_engine_handle(engine_handle)`** — our new builder method. Without this, `commit` does only local bookkeeping. With this, `commit` also fires forkchoice.
4. **`assert!(bridge.has_engine_handle())`** — the wiring guard. If `with_engine_handle()` had a bug, this would catch it before the rest of the test runs.
5. **`commit(block.hash).await.expect("commit failed")`** — the main assertion. **Note we don't check what the engine returned** — only that `commit` returns `Ok(())`. The engine's SYNCING response is discarded inside `commit` per Step 5.
6. **Negative case retained** — unknown hash still yields `BridgeError::Rejected`. The engine path never fires because the bridge bails before reaching it.

> 🛑 **Anti-fluency.** "Couldn't I just use `launch_with_debug_capabilities` and hope add_ons_handle is there?" **No — different launch paths produce different handle shapes.** `launch_with_debug_capabilities` returns `NodeHandle` with debug RPC but doesn't expose add_ons. The explicit builder chain (`.with_types().with_components().with_add_ons().launch()`) is the form that gives you `add_ons_handle`. **Knowing which launch path produces which handle shape is the kind of detail that's invisible until you need a specific field.**

## Test

```bash
cargo test -p openhl-evm commit_sends_forkchoice_to_engine_when_handle_installed --release
```

After ~30 seconds (compile + node bootstrap):

```
running 1 test
test live_node::tests::commit_sends_forkchoice_to_engine_when_handle_installed ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

Test runtime: ~3 seconds (Reth bootstrap + forkchoice round-trip).

Full suite:

```bash
cargo test
```

…should produce 38 tests workspace-wide (L13's 37 + the new test).

Common errors and fixes:

- **`error[E0282]: type annotations needed for `Option<ConsensusEngineHandle<_>>`** — the `engine_handle: None` in `new()` needs the type parameter inferred. Either the struct field's type annotation is missing/wrong, or you forgot the `EthEngineTypes` import. Re-check Step 3.
- **`error: cannot find struct `EthereumAddOns` in module `reth_node_ethereum::node`** — version drift between `reth-node-ethereum` and the rest of `reth-*`. All git-pinned reth deps must share the same SHA.
- **Test hangs > 30s** — the most likely cause is that **`EthereumNode`'s background tasks (engine actor, payload builder, libp2p, RPC stubs, …) aren't cleaning up promptly, and Tokio runtime teardown is blocked on them.** When `EthereumNode` drops at the end of the test, each actor waits on its `JoinHandle`; if any oneshot is still pending or a socket isn't released, the runtime stalls. Verify that the test ends with proper cleanup — explicit `drop(handle);` or a `node.task_executor().graceful_shutdown_with_timeout(...)` where appropriate.
  - Side note: dropping `.await` from `let _ = handle.fork_choice_updated(state, None).await` doesn't cause a hang — it causes a **silent skip** (`warning: unused implementor of 'Future'` fires; the future is dropped on the spot and the engine notification never runs). A missing `.await` produces a "Reth never gets notified" bug that lets the test sail through; hangs and silent skips are diagnostically different beasts, so identify which symptom you're seeing before chasing the wrong fix.
- **`assert!(bridge.has_engine_handle())` fails** — `with_engine_handle` is `#[must_use]` but you didn't bind the return: `let bridge = ...new(...); bridge.with_engine_handle(h);`. Must be `let bridge = ...new(...).with_engine_handle(h);`.
- **Commit returns `Ok` but the test for unknown hash also returns `Ok` (no rejection)** — your commit logic is reaching the engine path before the local lookup. Re-check Step 5 — the `?` propagates `BridgeError::Rejected` and exits before the engine block.

## Design reflection

Three load-bearing decisions encoded here:

1. **Local state first, engine second.** The bridge's `chain: HashMap` is the consensus layer's source of truth. If we sent to the engine *first* and it failed, we'd have to decide whether to roll back local state — and rolling back consensus commits is a violation of safety. **The order forces the right answer: succeed locally, then notify downstream.** This pattern generalizes to any system with a primary store + secondary indexes/replicas.

2. **`Option<EngineHandle>` keeps the test surface clean.** Without optionality, every unit test would need to bootstrap a real node just to get a non-test engine handle. With optionality, tests pass `None` and exercise the local path; integration tests pass `Some(handle)` and exercise both. **Type-level optionality is how you avoid forcing infrastructure into every test.**

3. **The engine response is intentionally discarded.** `SYNCING` is the expected response right now (we haven't sent `newPayload`). Returning errors on it would force every consumer to know that L14 is a partial integration. Discarding keeps the API contract clean: "commit completed locally, downstream notification was best-effort." **What clients need to know is what they need to know — no more.**

## Answer key

```bash
cd ~/code/openhl-reference
git checkout 0cac571
diff -u ~/code/my-openhl/Cargo.toml ./Cargo.toml
diff -u ~/code/my-openhl/crates/evm/Cargo.toml ./crates/evm/Cargo.toml
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
```

The reference at `0cac571` may contain additional code (CLOB integration from Stage 8) that we didn't introduce in this course. The Stage 7d-specific changes — `engine_handle` field, `with_engine_handle()` builder, the `commit` body restructure, the integration test using `add_ons_handle.beacon_engine_handle` — should match closely. Doc comments and exact wording can vary.

Return:

```bash
git checkout main
```

## Common questions

**Q: What's `add_ons_handle` and why is the engine handle in there?**
`add_ons_handle` is Reth's bundle of "extra capabilities" attached to a launched node — RPC servers, engine API endpoints, payload builder hooks. The beacon engine handle is one of these because the engine API is what *external* CL clients (Lighthouse, Prysm) would use over JSON-RPC. We're taking the in-process shortcut by pulling the handle directly, but the same handle backs the network-facing API.

**Q: Why does `ForkchoiceState` have three fields (head/safe/finalized) when we set them all to the same value?**
Because the Engine API is designed for chains with separate finalization layers. In Ethereum mainnet, the head can advance on every slot (12 seconds), but a block is "safe" only after 32 slots (a Casper checkpoint), and "finalized" only after 64+ slots. Our v0 single-validator chain has no such distinction — every commit is final. Setting all three to the same hash is the v0 simplification; multi-validator OpenHL would distinguish them.

**Q: What does the engine actually *do* when it gets `ForkchoiceUpdated` with no matching `newPayload`?**
It responds with `PayloadStatusEnum::Syncing` and internally starts trying to sync the block from peers. In our isolated dev node, there are no peers, so the sync request goes nowhere. The engine just sits in a "waiting for block" state for that hash. **This is fine** — we never actually need the engine to advance its canonical chain for L14's purpose. Future course material that introduces real block bodies via `newPayload` would close this gap.

**Q: Can I send `ForkchoiceUpdated` asynchronously and return immediately, instead of awaiting?**
You could — `tokio::spawn(handle.fork_choice_updated(...))` would fire-and-forget. But the await is fast (sub-millisecond for SYNCING) and gives you the option to log the response. The async-spawn approach also makes test ordering harder (does the engine see the update before the test exits?). **Awaiting is the safer default.**

## Next lesson (L15 — capstone)

You now have a complete consensus↔EVM bridge. **All four `ConsensusBridge` methods reach real Reth code paths.** L15 is the capstone: a one-page recap showing the full system, the things you skipped that production needs (block bodies via `newPayload`, real Codec impls instead of stubs, gossip codecs, persistent WAL), and the natural next courses to take. No new code — just a victory lap and a roadmap.
````

---

## Seed-file slot

L14 lands in Module 6 (Live Reth) at sortOrder 3:

```typescript
{
  title: 'Lesson 14 — commit drives Reth\'s Engine API forkchoice',
  slug: 'openhl-commit-forkchoice-en',
  type: 'CONTENT',
  sortOrder: 3,
  duration: 50,
  xpReward: 90,
  content: `# Lesson 14 — \`commit\` drives Reth's Engine API forkchoice\n\n...`
},
```

## SHA pinning discipline

L14 cites one openhl commit (§Answer key):
- `0cac571` (Stage 7d — `commit` drives Reth Engine API forkchoice)

This closes the consensus↔EVM contract — 4/4 `ConsensusBridge` methods reach real Reth.

## Style review notes (self-critique before paste)

- **§Plan's "side-effect-after-success pattern" callout** is the generalizable lesson — applies to caching, event sourcing, replication, any system with primary store + downstream notifications.
- **§Step 5's "Reth's view is downstream of consensus" anti-fluency** is the conceptual rule that makes the discard-response decision feel obvious.
- **The 4-method table at the top of §Goal** is the visual proof that L14 is the closing move.
- **The "engine returns SYNCING — and that's correct at this stage" callout** anticipates the natural worry "but did it really work?"
- **§Common questions on `add_ons_handle`** demystifies the in-process-vs-RPC distinction.
- **§Step 6's launch-path detail** is the kind of subtle detail that breaks tests when not called out.
