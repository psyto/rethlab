# Building OpenHL — L10 draft (EN) — C2 build-along rewrite

> Drafted against openhl SHA `708472c` (Stage 6d — first block through the engine actor pipeline).
> Course: `building-openhl-consensus-en` (track: `reth-l1-architect`, course #6 of 10).
> Note: L10 is the **real block produced** milestone — Module 1 of openhl's build arc closes here. After this lesson, a single-validator chain decides a real block through the actor system in ~0.02 seconds. L11-L15 move from the in-memory bridge to a live Reth EthereumNode.

---

## L10 — `openhl-engine-app-en`

- **Module:** 5 (Engine integration — first lesson in a new module)
- **Module sortOrder:** 5 (after CL types)
- **Course-level sortOrder:** 9 (lesson 10 of 16)
- **Duration:** 55 min
- **XP reward:** 100
- **Type:** CONTENT

### Content

````markdown
# Lesson 10 — `run_engine_app` and the first block through the actor pipeline

## Goal

Concepts you'll grasp in this lesson:

- **The `AppMsg` routing loop** — Malachite's engine sends `ConsensusReady / GetValidatorSet / StartedRound / GetValue / Decided / …` over a single channel. The app loop is a `while let Some(msg) = recv().await` matching each variant and either replying via `oneshot::Sender` or driving the bridge. This is the *only* glue between Malachite and your EL.
- **Generic-over-bridge polymorphism** — `run_engine_app<B: ConsensusBridge>` works for `StubBridge`, `InMemoryEvmBridge`, `RethEvmBridge`, and (eventually) `LiveRethEvmBridge`. One routing function, four backends. The trait surface from L3 pays off here.
- **`stop_after_decisions` as test ergonomics** — production validators run `usize::MAX`. Tests pass `1`. A parameter that exists *only* so the function is finite-state-testable is a legitimate API choice; test ergonomics deserve API surface.
- **Reply channels can close mid-flight** — when an engine actor dies before we reply, the `oneshot::Sender::send()` errors. Logging via `tracing::warn!` (not propagating) is correct: propagating would mask actual errors with noise; the operator can still investigate via logs.
- **Channel vs. event-stream message flow** — `channels.consensus.recv()` carries *imperative* messages that need replies; `subscribe()` carries *broadcast* notifications. The app loop only deals with the former in L10.
- **Why integration > unit tests at this layer** — engine `AppMsg` arms arrive in a specific order. Faking that order is more work than spinning up the real engine for one block. The integration test is cheaper and proves more.

Verification:

```bash
cargo test -p openhl-consensus
```

…passes **21 tests** (20 from L9 + 1 new integration test). The new test:

```
test engine_app::tests::first_block_via_engine_actors ... ok
```

…spawns the Malachite actor system, drives a real consensus round through it, asserts the bridge committed exactly the hash the engine decided on. **Wall-clock: 0.02 seconds.** This is the milestone where your code stops being "the engine boots" and becomes "the engine produces blocks."

Specific changes:

- `crates/consensus/src/engine_app.rs` — new file (~282 lines). The `run_engine_app<B: ConsensusBridge + 'static>` loop reads `AppMsg<OpenHlContext>` from `Channels<OpenHlContext>::consensus`, dispatches 12 message arms (5 substantive + 7 trivial), and returns the list of decided hashes.
- `StubBridge` test fixture + the `first_block_via_engine_actors` integration test live in the same file.
- `crates/consensus/src/lib.rs` — wires `pub mod engine_app;`.

## Recap

After L9 your `openhl-consensus` crate has:

```
crates/consensus/src/lib.rs               — pub mod bridge, codec, context, node, signing, signing_provider, types
crates/consensus/src/node.rs              — OpenHlNode + start_engine works (smoke test passes)
crates/consensus/src/codec.rs             — OpenHlCodec
crates/consensus/src/signing_provider.rs  — SigningProvider impl
crates/consensus/src/context.rs           — Context impl
crates/consensus/src/types/               — 7 type files
crates/consensus/src/bridge.rs            — ConsensusBridge trait + InMemoryEvmBridge
```

`cargo test -p openhl-consensus` passes 20 tests. The engine boots and tears down cleanly — but it's *silent*. Once `start_engine` returns, the engine's actors immediately start sending `AppMsg::ConsensusReady` and waiting for a reply. Nothing replies. The actors park. **L10 fixes that.**

## Plan

Five things:

1. **Add `tracing` to `crates/consensus/Cargo.toml`** — used by the `tracing::warn!` calls in the loop's "channel-closed" paths.
2. **Create `crates/consensus/src/engine_app.rs`** with the `run_engine_app<B>` async function generic over `B: ConsensusBridge`, plus a `default_attrs()` helper. About 130 lines of routing logic.
3. **Wire `pub mod engine_app;`** into `lib.rs`.
4. **Add the integration test** `first_block_via_engine_actors` plus a `StubBridge` test fixture that impls `ConsensusBridge` synchronously in memory.
5. **Run** `cargo test -p openhl-consensus first_block_via_engine_actors` — passes in ~0.02 seconds. **Stare at it.**

This lesson teaches **the actor-message-loop pattern**. Most consensus engines (CometBFT, Hotstuff, Aura) have *some* "application interface" but they vary: callbacks, gRPC services, FFI bindings. Malachite's approach is `tokio::mpsc` channels of typed messages — strongly typed, async-native, single-threaded per channel. Your `run_engine_app` is the *consumer* of those messages; the engine actors are the *producer*. **Once you understand this pattern, every chain framework's "application interface" reduces to a variant of it.**

> 🛑 **Predict.** Before scrolling: when the engine sends `AppMsg::GetValue` ("propose the next block"), why does the app reply with `LocallyProposedValue(height, round, value)` rather than just `BlockHash`? Hint: the value the engine wires through the rest of consensus is what it commits to. If we sent only a hash, the engine would have no way to gossip the proposal contents to other validators or include them in the certificate. **The wrapping is what makes the value first-class in the BFT machine.** (Even though in our single-validator devnet, no other validators receive the gossip — the engine doesn't *know* it's running solo.)

## Walk-through

### Step 1: Add `tracing` to Cargo.toml

Open `crates/consensus/Cargo.toml`. After L9 the `[dependencies]` section ends with:

```toml
sha2                                          = "0.10"
serde                                         = { workspace = true }
tokio                                         = { workspace = true }
```

Add one line:

```toml
tracing                                       = { workspace = true }
```

`tracing` is the workspace standard logging crate — we'll use only `tracing::warn!` here, for one specific case: when a reply channel is closed because the engine has terminated mid-conversation. Closed reply channels in `tokio::mpsc::oneshot` aren't bugs in our code; they're a sign that something upstream gave up. We log them but don't propagate.

### Step 2: Create `crates/consensus/src/engine_app.rs` — imports and signature

Start with module doc + imports:

```rust
//! Engine app loop — consumes `AppMsg` from the Malachite engine and routes
//! every consensus-relevant event through a [`ConsensusBridge`].
//!
//! This is the missing half of L9: with `OpenHlNode::start()` spinning
//! up the actor system, this loop is what makes those actors do useful work.
//! Once a `Decided` arrives we commit through the bridge, increment height,
//! and (optionally) stop after N decisions for tests.

use std::sync::Arc;

use eyre::eyre;
use informalsystems_malachitebft_app::engine::host::Next;
use informalsystems_malachitebft_app_channel::{AppMsg, Channels};
use informalsystems_malachitebft_core_types::Height as _;
use openhl_types::{BlockHash, PayloadAttrs};

use crate::bridge::ConsensusBridge;
use crate::context::OpenHlContext;
use crate::types::{OpenHlHeight, OpenHlValidatorSet, OpenHlValue};

const APP_REPLY_WAIT_LOG: &str = "engine_app: peer replied unsuccessfully (channel closed)";
```

Imports of note:

- **`AppMsg, Channels`** from `app_channel` — the message enum and channel-bundle type. `Channels::consensus` is the mpsc receiver for `AppMsg<Ctx>`.
- **`Next`** from `app::engine::host` — the enum used in `Decided`'s reply to tell the engine "what's next?" (start the next height, halt, etc.).
- **`Height as _`** — imports the trait `Height` for its `.increment()` method without bringing the name into scope (we use our `OpenHlHeight` newtype throughout).
- **`Arc`** — `run_engine_app` takes the bridge as `Arc<B>` so it can clone the reference into a long-running task.

Now the function signature:

```rust
/// Drive the engine app loop until `stop_after_decisions` decisions have been
/// committed through the bridge, or the consensus channel closes.
///
/// Returns the `BlockHash`es that were decided, in order. Single-validator mode
/// uses this with `stop_after_decisions = 1` to exit after the first block.
#[allow(clippy::too_many_lines)] // 12 AppMsg arms — laid out flat for lesson L11's match-by-match walk
pub async fn run_engine_app<B>(
    bridge: Arc<B>,
    mut channels: Channels<OpenHlContext>,
    validator_set: OpenHlValidatorSet,
    stop_after_decisions: usize,
) -> eyre::Result<Vec<BlockHash>>
where
    B: ConsensusBridge + 'static,
{
    let mut decided: Vec<BlockHash> = Vec::new();
    let mut current_parent = BlockHash([0u8; 32]);
    let mut current_height = OpenHlHeight::INITIAL;

    while let Some(msg) = channels.consensus.recv().await {
        match msg {
            // ... 12 arms come here ...
        }
    }

    Err(eyre!(
        "consensus channel closed after {n} decisions (wanted {stop_after_decisions})",
        n = decided.len()
    ))
}
```

Five parameters/state values worth noting:

- **`bridge: Arc<B>`** — the `ConsensusBridge` implementor that the app loop calls for `build_payload`, `payload_ready`, `commit`. `Arc` because we'll later want to share it; generic over `B` so this same loop works for `InMemoryEvmBridge`, `RethEvmBridge`, and `LiveRethEvmBridge` (L12).
- **`channels: Channels<OpenHlContext>`** — taken by value (then `mut` to call `recv`). We own the channels after `take_channels()` in the caller.
- **`validator_set: OpenHlValidatorSet`** — the single-validator set we'll echo back on `ConsensusReady` and `GetValidatorSet`.
- **`stop_after_decisions: usize`** — test ergonomics. Single-validator devnets use `1`; multi-validator deployments would use `usize::MAX`.

Three loop-state values:

- **`decided: Vec<BlockHash>`** — accumulator; returned at end.
- **`current_parent: BlockHash`** — what the *next* block builds on top of. Starts at all-zero (genesis); becomes the just-decided hash on each commit.
- **`current_height: OpenHlHeight`** — what height the engine is on. Starts at `INITIAL`; gets bumped by `StartedRound` and `Decided`.

The `while let Some(msg) = channels.consensus.recv().await` loop is the heart of an actor-message app: receive a message, dispatch by variant, reply (if applicable), continue. When `recv()` returns `None`, the channel is closed — that's our error path.

### Step 3: The `ConsensusReady` and `StartedRound` arms

Add these inside the `match`:

```rust
            AppMsg::ConsensusReady { reply, .. } => {
                if reply
                    .send((current_height, validator_set.clone()))
                    .is_err()
                {
                    tracing::warn!("{APP_REPLY_WAIT_LOG} (ConsensusReady)");
                }
            }

            AppMsg::StartedRound {
                height,
                round: _,
                reply_value,
                ..
            } => {
                current_height = height;
                if reply_value.send(Vec::new()).is_err() {
                    tracing::warn!("{APP_REPLY_WAIT_LOG} (StartedRound)");
                }
            }
```

**`ConsensusReady`** is the engine asking "are you ready for me to start consensus? at what height and with what validator set?" Our reply is the tuple `(current_height, validator_set.clone())`. Each `reply` is a `oneshot::Sender<...>` — `send()` consumes it and returns `Result<(), T>` where `T` is what we tried to send (returned on error). We don't recover from a closed reply channel; we just log.

**`StartedRound`** is the engine telling us a new round began at some height. We update our `current_height` and reply with an empty `Vec` (the list of stored proposed values for this height; we have none cached). The `round: _` underscore unbinds the round value because we don't need it in single-validator mode — the engine won't gossip-restream a value across rounds when there's no peer to send to.

### Step 4: The `GetValue` arm — building a proposal

This is the load-bearing arm. Add:

```rust
            AppMsg::GetValue {
                height,
                round,
                timeout: _,
                reply,
            } => {
                let attrs = default_attrs();
                let id = bridge.build_payload(current_parent, attrs).await?;
                let block = bridge.payload_ready(id).await?;
                let value = OpenHlValue(block.hash);
                let lpv =
                    informalsystems_malachitebft_app_channel::app::types::LocallyProposedValue::new(
                        height, round, value,
                    );
                if reply.send(lpv).is_err() {
                    tracing::warn!("{APP_REPLY_WAIT_LOG} (GetValue)");
                }
            }
```

The engine asks "propose a value for height H, round R, with timeout T." We:

1. **Build payload attrs** — default values for now (`timestamp: 0, fee_recipient: zero, prev_randao: zero`). In L12 these'll come from the engine's notion of time + the validator's address.
2. **`bridge.build_payload(current_parent, attrs).await`** — kicks the EL: "build me a block on top of `current_parent` with these attrs." Returns a `PayloadId` — a handle the EL uses to track the in-flight build.
3. **`bridge.payload_ready(id).await`** — fetch the completed block. The in-memory bridge from L4-L5 produces immediately; live Reth (L12+) might take 10-50ms.
4. **Wrap** the resulting `block.hash` in `OpenHlValue` and then `LocallyProposedValue::new(height, round, value)`.
5. **Reply** to the engine with that `LocallyProposedValue`.

The `?` operator on `build_payload` and `payload_ready` propagates `BridgeError` up to `eyre::Result`. If the EL crashes mid-build, the app loop returns an error and the test fails loudly.

> 🛑 **Anti-fluency.** "Why does `GetValue` reply with `LocallyProposedValue` instead of just `OpenHlValue`?" **Because the engine needs to *gossip* what we proposed in addition to using it locally.** `LocallyProposedValue` is a typed wrapper that says "this is the value *we* proposed for height H round R." In multi-validator mode, the engine then sends this to peers as a `Proposal`. In single-validator mode, no peers — but the API doesn't bifurcate, so we honor the wrapper.

### Step 5: The `Decided` arm — the moment a block becomes final

The other load-bearing arm. Add:

```rust
            AppMsg::Decided {
                certificate, reply, ..
            } => {
                let hash = certificate.value_id;
                bridge.commit(hash).await?;
                decided.push(hash);
                current_parent = hash;

                if decided.len() >= stop_after_decisions {
                    // Send a reply so consensus doesn't hang waiting on us before
                    // we drop the channel.
                    let next_height = certificate.height.increment();
                    let _ = reply.send(Next::Start(next_height, validator_set.clone()));
                    return Ok(decided);
                }

                let next_height = certificate.height.increment();
                current_height = next_height;
                if reply
                    .send(Next::Start(next_height, validator_set.clone()))
                    .is_err()
                {
                    tracing::warn!("{APP_REPLY_WAIT_LOG} (Decided)");
                }
            }
```

The engine says "a value was decided at height H — here's the certificate." We:

1. **Extract** the decided hash from `certificate.value_id`.
2. **`bridge.commit(hash).await`** — durably mark this block as the canonical chain head in the EL. For the in-memory bridge, just records; for live Reth, executes forkchoice update.
3. **Append to `decided`** and update `current_parent` so the *next* `GetValue` builds on this hash.
4. **Check exit condition** — if we've hit `stop_after_decisions`, reply with `Next::Start(next_height, ...)` (so the engine doesn't hang waiting) and return. **This is what makes the test exit cleanly in 0.02s.**
5. **Otherwise** reply with `Next::Start(next_height, validator_set)` — "yes, please continue at the next height, here's the validator set" — and loop.

> 🛑 **Predict.** Why send a reply on the exit path even though we're about to return? **Because `oneshot::Sender::send` is the only thing that unblocks the engine actor that's waiting for our reply.** If we just `return Ok(decided)` without sending, the engine actor is stuck in `await` on a now-dropped sender, which would cause a slow tear-down (eventually a `kill_and_wait` cleans it up). Replying first means the engine actor finishes naturally, and `handle.kill(None)` is just confirming the inevitable.

### Step 6: The other 7 arms — stubs and no-ops

The remaining arms are short. Add:

```rust
            AppMsg::ExtendVote { reply, .. } => {
                if reply.send(None).is_err() {
                    tracing::warn!("{APP_REPLY_WAIT_LOG} (ExtendVote)");
                }
            }

            AppMsg::VerifyVoteExtension { reply, .. } => {
                if reply.send(Ok(())).is_err() {
                    tracing::warn!("{APP_REPLY_WAIT_LOG} (VerifyVoteExtension)");
                }
            }

            AppMsg::RestreamProposal { .. } => {
                // Single-validator mode never re-streams.
            }

            AppMsg::GetHistoryMinHeight { reply } => {
                if reply.send(OpenHlHeight::INITIAL).is_err() {
                    tracing::warn!("{APP_REPLY_WAIT_LOG} (GetHistoryMinHeight)");
                }
            }

            AppMsg::ReceivedProposalPart { reply, .. } => {
                // ProposalOnly value-payload mode — proposal parts never arrive.
                if reply.send(None).is_err() {
                    tracing::warn!("{APP_REPLY_WAIT_LOG} (ReceivedProposalPart)");
                }
            }

            AppMsg::GetValidatorSet { reply, .. } => {
                if reply.send(Some(validator_set.clone())).is_err() {
                    tracing::warn!("{APP_REPLY_WAIT_LOG} (GetValidatorSet)");
                }
            }

            AppMsg::GetDecidedValue { reply, .. } => {
                if reply.send(None).is_err() {
                    tracing::warn!("{APP_REPLY_WAIT_LOG} (GetDecidedValue)");
                }
            }

            AppMsg::ProcessSyncedValue { reply, .. } => {
                if reply.send(None).is_err() {
                    tracing::warn!("{APP_REPLY_WAIT_LOG} (ProcessSyncedValue)");
                }
            }
```

Eight more arms, four categories:

- **Vote extensions** (`ExtendVote`, `VerifyVoteExtension`) — reply `None` / `Ok(())`. Vote extensions are unused at v0 (mirror of how `OpenHlSigningProvider::sign_vote_extension` signs empty bytes).
- **No-ops** (`RestreamProposal`) — single-validator never re-streams a proposal, so we do nothing. No reply expected.
- **History/sync** (`GetHistoryMinHeight`, `GetValidatorSet`, `GetDecidedValue`, `ProcessSyncedValue`) — used during peer catch-up. We reply with defaults: `INITIAL` height (we have no history), the current validator set, `None` for "give me a past block." No peers means catch-up is never exercised, but the engine asks anyway.
- **ProposalOnly mode** (`ReceivedProposalPart`) — since `OpenHlConfig` sets `ValuePayload::ProposalOnly`, proposal parts never arrive. We still need to handle the variant; reply `None`.

### Step 7: The `default_attrs` helper

Below the function:

```rust
fn default_attrs() -> PayloadAttrs {
    PayloadAttrs {
        timestamp: 0,
        fee_recipient: [0u8; 20],
        prev_randao: [0u8; 32],
    }
}
```

Three zero fields, all of which the bridge accepts. In L12 these'll be real:
- `timestamp` will come from the engine (or a wall clock if testing).
- `fee_recipient` will come from the validator's configured payout address.
- `prev_randao` will be derived from the previous block's hash via BLS.

For now, all zeros — the test doesn't care, and the in-memory bridge doesn't validate them.

### Step 8: Wire `engine_app.rs` into `lib.rs`

```rust
//! Consensus layer — Malachite BFT.

pub mod bridge;
pub mod codec;
pub mod context;
pub mod engine_app;
pub mod node;
pub mod signing;
pub mod signing_provider;
pub mod types;

pub use context::OpenHlContext;
```

### Step 9: Add the integration test + `StubBridge`

At the bottom of `engine_app.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::bridge::BridgeError;
    use crate::node::OpenHlNode;
    use crate::types::{OpenHlAddress, OpenHlValidator};
    use async_trait::async_trait;
    use informalsystems_malachitebft_app::node::{Node as _, NodeHandle as _};
    use informalsystems_malachitebft_signing_ed25519::PrivateKey;
    use openhl_types::{ExecutedBlock, PayloadId, PayloadStatus};
    use rand::rngs::OsRng;
    use sha2::{Digest, Sha256};
    use std::sync::Mutex;
    use std::time::Duration;

    #[derive(Debug, Default)]
    struct StubBridge {
        last_built: Mutex<Option<BlockHash>>,
        committed: Mutex<Vec<BlockHash>>,
    }

    #[async_trait]
    impl ConsensusBridge for StubBridge {
        async fn build_payload(
            &self,
            _parent: BlockHash,
            _attrs: PayloadAttrs,
        ) -> Result<PayloadId, BridgeError> {
            let hash = BlockHash([0x42u8; 32]);
            *self.last_built.lock().expect("poisoned") = Some(hash);
            Ok(PayloadId(1))
        }

        async fn payload_ready(
            &self,
            _id: PayloadId,
        ) -> Result<ExecutedBlock, BridgeError> {
            Ok(ExecutedBlock {
                hash: BlockHash([0x42u8; 32]),
                parent_hash: BlockHash([0u8; 32]),
                number: 1,
                state_root: [0u8; 32],
            })
        }

        async fn validate_payload(
            &self,
            _block: &ExecutedBlock,
        ) -> Result<PayloadStatus, BridgeError> {
            Ok(PayloadStatus::Valid)
        }

        async fn commit(&self, block_hash: BlockHash) -> Result<(), BridgeError> {
            self.committed.lock().expect("poisoned").push(block_hash);
            Ok(())
        }
    }

    fn make_test_node(home_dir: std::path::PathBuf) -> OpenHlNode {
        let sk = PrivateKey::generate(OsRng);
        let pk = sk.public_key();
        let digest = Sha256::digest(pk.as_bytes());
        let mut addr_bytes = [0u8; 20];
        addr_bytes.copy_from_slice(&digest[12..32]);
        let address = OpenHlAddress(addr_bytes);
        let validator_set = OpenHlValidatorSet::new(vec![OpenHlValidator::new(address, pk, 1)]);
        OpenHlNode::new(sk, validator_set, home_dir, "openhl-engine-test")
    }

    /// End-to-end: spawn the engine actor system, drive one block through the
    /// `AppMsg` loop, assert the bridge built+committed exactly the hash the
    /// engine decided on.
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn first_block_via_engine_actors() {
        let tmp = tempfile::tempdir().unwrap();
        let node = make_test_node(tmp.path().to_path_buf());
        let validator_set = node.validator_set.clone();

        let handle = node.start().await.expect("start_engine failed");
        let channels = handle
            .take_channels()
            .await
            .expect("channels available exactly once");

        let bridge = Arc::new(StubBridge::default());
        let bridge_for_check = bridge.clone();

        let app_task = tokio::spawn(run_engine_app(bridge, channels, validator_set, 1));

        let decisions = tokio::time::timeout(Duration::from_secs(15), app_task)
            .await
            .expect("app loop timed out")
            .expect("app task panicked")
            .expect("app loop returned error");

        assert_eq!(decisions.len(), 1, "expected exactly one decided block");
        let decided_hash = decisions[0];

        let committed = bridge_for_check.committed.lock().unwrap().clone();
        assert_eq!(committed, vec![decided_hash], "bridge must commit decided hash");
        assert_eq!(
            *bridge_for_check.last_built.lock().unwrap(),
            Some(decided_hash),
            "decided hash must match what we built",
        );

        handle.kill(None).await.unwrap();
    }
}
```

Three pieces:

- **`StubBridge`** — a `ConsensusBridge` that always returns `BlockHash([0x42; 32])` for everything. Production-grade test fixture pattern: in-memory state (`Mutex<Option<...>>` and `Mutex<Vec<...>>`), Arc-able, async-friendly. The test can read `last_built` and `committed` after the loop runs to check what the bridge saw.
- **`make_test_node`** — same single-validator construction we used in L9 (`OpenHlNode::new` with one validator).
- **`first_block_via_engine_actors`** — the integration test. Steps:
  1. Spawn the engine via `node.start().await`.
  2. Take channels via `handle.take_channels().await`.
  3. Spawn the app loop in a `tokio::spawn` task with the bridge + channels + validator set + `stop_after_decisions = 1`.
  4. Use `tokio::time::timeout(Duration::from_secs(15), app_task)` to bound test runtime — if anything hangs, fail in 15s rather than forever.
  5. Unwrap the nested `Result`s. The triple `.expect(...)` unwinds: timeout → panic → loop error.
  6. **Assert three things**: decisions is exactly 1 entry, bridge committed that exact hash, bridge built exactly that hash. Together these prove the full pipeline: engine → app → bridge → engine → app.
  7. `handle.kill(None)` for cleanup.

> 🛑 **Anti-fluency.** "Why `worker_threads = 4` here when L9's smoke test used 2?" **Because the integration test runs MORE actors concurrently.** The smoke test only spawned + killed; we never produced messages. The integration test additionally runs our `run_engine_app` task (consuming + replying), the bridge's `async fn` calls, AND the multiple internal engine actors. 4 threads gives them all room. If you go lower, you can hit contention (slower) or deadlock (hang). 4 is comfortable.

## Test

```bash
cargo test -p openhl-consensus first_block_via_engine_actors
```

After ~5 seconds (compile + first run):

```
running 1 test
test engine_app::tests::first_block_via_engine_actors ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

The test itself runs in ~0.02 seconds; the 5 seconds is `cargo test`'s overhead.

To verify everything passes:

```bash
cargo test -p openhl-consensus
```

…should produce 21 tests passing.

Common errors and fixes:

- **Test hangs > 15s** — the `tokio::time::timeout` fires. Most likely cause: forgot to handle a reply on the `Decided` exit path, so the engine actor is stuck waiting. Re-check Step 5 — the `if decided.len() >= stop_after_decisions` branch *must* reply before returning.
- **`error[E0277]: ConsensusBridge is not Send`** — bridge needs `+ Send + Sync` bounds. Or your impl uses `std::sync::Mutex` (which is `Send`) but you forgot the `Send` annotation on the trait. Check `bridge.rs`.
- **`bridge.committed.lock().expect("poisoned")` panic** — only happens if a task panicked while holding the mutex. Usually means a panic in the bridge impl. Check the bridge's `build_payload` / `commit` for panics.
- **`assert_eq!(decisions.len(), 1)` fires** — `decisions` is empty. The loop never hit `Decided`. Most likely cause: forgot to handle `GetValue` (the engine waits for a `LocallyProposedValue` reply, never moves on without it). Re-check Step 4.

## Design reflection

Three load-bearing decisions encoded here:

1. **`run_engine_app` is generic over `B: ConsensusBridge + 'static`.** The same loop works with `StubBridge` (test), `InMemoryEvmBridge` (L4), `RethEvmBridge` (L5), and `LiveRethEvmBridge` (L12). The bridge's responsibility is to *execute*; the app loop's responsibility is to *route*. **One implementation handles all four bridge variants.**

2. **`stop_after_decisions` is a test ergonomic, not a production feature.** Real validators use `usize::MAX`. The test uses `1`. The presence of this parameter signals that the function is *designed to be testable* — you can drive it to a known finite state and assert without infrastructure for graceful shutdown. **Test ergonomics deserve API surface.**

3. **Closed reply channels are logged, not propagated.** A closed `oneshot::Sender` reflects an engine that gave up before our reply — usually because the actor was killed externally. Propagating this as an error would mask actual problems with noise. Logging via `tracing::warn!` lets operators investigate if it's frequent without breaking the loop. **The right error-handling policy depends on whether the caller can act on the failure.**

## Answer key

```bash
cd ~/code/openhl-reference
git checkout 708472c
diff -u ~/code/my-openhl/crates/consensus/src/engine_app.rs ./crates/consensus/src/engine_app.rs
diff -u ~/code/my-openhl/crates/consensus/Cargo.toml ./crates/consensus/Cargo.toml
diff -u ~/code/my-openhl/crates/consensus/src/lib.rs ./crates/consensus/src/lib.rs
```

The reference at `708472c` includes 282 lines of `engine_app.rs`. The 12 `AppMsg` arms (5 substantive + 7 trivial), the `StubBridge` test fixture, and the integration test should match closely. Doc-comment wording can vary.

Return:

```bash
git checkout main
```

## Common questions

**Q: What's the difference between the engine's `recv()` channel and the engine's `subscribe()` event stream?**
The `recv()` channel (`channels.consensus`) is for *imperative* messages requiring a reply: "build a value", "validate this", "decided at H." The `subscribe()` event stream is for *broadcast* notifications without replies: "a round started", "a peer dialed in." The two flow in different directions: channel = engine→app (questions), events = engine→all-subscribers (announcements). L9's `OpenHlNodeHandle::subscribe` is a placeholder; we don't actually consume events until L12.

**Q: Why don't we test individual AppMsg arms — only the integration test?**
Because the arms are not independent. The engine sends them in a specific order: `ConsensusReady` → `GetValidatorSet` → `StartedRound` → `GetValue` → `Decided`. Testing them in isolation would require building a fake engine that sends them in that order, which is more complex than just spinning up the real engine for one block. **The integration test is cheaper to write and proves more.** L11 will add multi-validator tests where individual-arm tests *do* make sense (peer sync, vote extensions).

**Q: Why is `validator_set: OpenHlValidatorSet` taken by value instead of `Arc<...>`?**
Because `OpenHlValidatorSet` is small (one validator at v0) and `Clone`. The cost of cloning is bytes-of-the-struct, not bytes-of-the-set. If validator sets grew to 100+ entries, switching to `Arc` would be worthwhile.

**Q: What happens if `bridge.commit(hash)` fails?**
The `?` operator propagates the `BridgeError` up as `eyre::Result::Err(...)`. The `app_task` in the test gets `Err(...)`, the triple-unwrap fails on the inner expect, and the test panics with the bridge error. **This is the intended behavior — commit failure is unrecoverable.** Production code would either retry (if transient) or shut down and alert (if persistent).

## Next lesson (L11)

Stage 6 is now done. Stage 7 starts: replace `InMemoryEvmBridge` with a real Reth EthereumNode. L11 covers the **dev node bootstrap** — getting Reth to spawn as a tokio task alongside our consensus actors, sharing the same runtime. L12 wires `LiveRethEvmBridge` (the live Reth equivalent of L5's `RethEvmBridge`). After L12 you'll have a Reth-backed devnet that processes the SAME `AppMsg` loop you just wrote — same `run_engine_app`, swap one trait impl, get a real EVM execution layer.
````

---

## Seed-file slot

L10 lands in a new Module 5 (Engine integration), sortOrder 0:

```typescript
modules: {
  0: { title: 'Orientation', sortOrder: 0 },
  1: { title: 'Foundations', sortOrder: 1 },
  2: { title: 'Contract types', sortOrder: 2 },
  3: { title: 'EL test double', sortOrder: 3 },
  4: { title: 'CL types', sortOrder: 4 },
  5: { title: 'Engine integration', sortOrder: 5 },  // NEW
},
```

```typescript
{
  title: 'Lesson 10 — run_engine_app and the first block through the actor pipeline',
  slug: 'openhl-engine-app-en',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 55,
  xpReward: 100,
  content: `# Lesson 10 — \`run_engine_app\` and the first block through the actor pipeline\n\n...`
},
```

## SHA pinning discipline

L10 cites one openhl commit (§Answer key):
- `708472c` (Stage 6d — first block through the engine actor pipeline)

This is the Stage-6-closes / Module-1-of-openhl-closes milestone. After this lesson, your single-validator chain produces real blocks through the actor system.

## Style review notes (self-critique before paste)

- **§Plan's "actor-message-loop pattern that generalizes to every chain framework" callout** — generalization to other systems (CometBFT, Hotstuff) gives the pattern its weight beyond OpenHL.
- **The Decided arm's "send a reply on the exit path" Predict** is the kind of micro-detail that wastes hours when wrong — worth a callout.
- **§Step 6's categorization (Vote extensions / no-ops / history-sync / ProposalOnly mode)** is the load-bearing way to scan the 8 trivial arms quickly.
- **§Step 4 step-by-step (build → ready → wrap → reply)** maps to the bridge methods explicitly so readers can trace which method does what at runtime.
- **The `worker_threads = 4` vs 2 callout** anticipates the kind of subtle test-config drift that bites later.
- **L11 preview names the "swap one trait impl" payoff** so readers see that `run_engine_app` is *the* pattern that survives across module 1→2 transitions.
