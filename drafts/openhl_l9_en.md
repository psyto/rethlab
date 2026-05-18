# Building OpenHL — L9 draft (EN)

> Drafted against openhl SHA `0844d58` (Stage 7c). The trait this lesson designs is also the one cited by L1 (the contract), L7 (Engine API mapping), and L10 (Decided handler) — so L9 is the design rationale lesson the rest of Module 4 builds on.
> Course: `building-openhl-consensus-en` (track: `reth-l1-architect`, course #6 of 10).
> 20-min lesson — longer than L7/L10 because design choices need rationale, not just code.

---

## L9 — `openhl-bridge-trait-en`

- **Module:** 4 (Wiring it up — the consensus crate), sortOrder 0 within module
- **Course-level sortOrder:** 8 (lesson 9 of 13)
- **Duration:** 20 min
- **XP reward:** 60
- **Type:** CONTENT

### Content

````markdown
# Designing the contract — the `ConsensusBridge` trait

Every chain that bolts BFT onto an EVM ends up writing this trait. HyperBFT did it, Tempo did it, every CometBFT-based chain did it. The methods have different names; the shape is the same. The question is whether you write it deliberately — with the four messages from L1 explicit and the failure modes named — or whether it accretes from "whatever consensus needed when it needed it."

We're going to write it deliberately. Once.

> 🛑 **Predict before scrolling.** You've seen the four messages in L1. You've seen them mapped onto the Ethereum Engine API in L7. Now: what should the *Rust trait* look like? Specifically — async or blocking? Owned arguments or borrowed? One error type or many? Trait method signatures matter more than you think.

## 1. The trait every BFT-L1 ends up writing

Open `crates/consensus/src/bridge.rs:11@0844d58`. The whole thing is 40 lines:

```rust
#[async_trait]
pub trait ConsensusBridge: Send + Sync {
    async fn build_payload(
        &self,
        parent: BlockHash,
        attrs: PayloadAttrs,
    ) -> Result<PayloadId, BridgeError>;

    async fn payload_ready(&self, id: PayloadId)
        -> Result<ExecutedBlock, BridgeError>;

    async fn validate_payload(&self, block: &ExecutedBlock)
        -> Result<PayloadStatus, BridgeError>;

    async fn commit(&self, block_hash: BlockHash)
        -> Result<(), BridgeError>;
}
```

That's the contract. Every other crate that participates in consensus either implements this trait (the EVM crate, with three different impls — `InMemoryEvmBridge`, `RethEvmBridge`, `LiveRethEvmBridge`) or holds an `Arc<dyn ConsensusBridge>` to call methods on it (the consensus crate's runner and engine-app loop).

The rest of this lesson is justification. Why these four methods, in these signatures, with this error type? Each choice trades off something. The point of the lesson is to make the trades visible so you can make different ones on purpose, not by accident.

## 2. Async or blocking?

Looking at the signatures: every method is `async`. That's not free. In Rust, `async fn` in traits has been a multi-year saga (the `#[async_trait]` macro is a workaround); async forces `Send + Sync` bounds throughout; calling async from sync requires a tokio handle.

The alternative would have been blocking:

```rust
pub trait ConsensusBridge: Send + Sync {
    fn build_payload(&self, ...) -> Result<PayloadId, BridgeError>;
    // ...
}
```

Simpler signatures. No `#[async_trait]`. No future-pinning issues. Why didn't we go this way?

| Consideration | Async wins | Blocking wins |
| :--- | :--- | :--- |
| Calling Reth's `BlockchainProvider` (which is sync) | tied — both work | tied |
| Calling Reth's `EngineHandle::fork_choice_updated` (async) | **must be async** | requires `block_on` |
| Inside Malachite's tokio runtime | no thread blocking | each call blocks a worker thread |
| The `run_engine_app` AppMsg loop | natural | requires spawn-blocking gymnastics |
| Test doubles (in-memory state) | trivial — just hold a `Mutex` | trivial |

The decision falls on the second and third rows. The real Reth backend uses async APIs (Engine API, payload builder service, network), and our consensus side runs in Malachite's tokio runtime. Going blocking means the entire AppMsg loop would be spawn-blocking on every bridge call — wasteful, error-prone, and observably slower under load.

> 🛑 **Anti-fluency.** "Async is just more flexible than blocking, you can always go async later." **No.** Going from blocking-trait to async-trait is a viral change — every caller has to switch. And every async method in a trait is constrained by `Send + Sync + 'static` propagating through your code. **Pick async early, accept the costs, or commit to blocking and never look back.**

## 3. Why exactly four methods (no fewer, no more)

Four methods. Not three. Not five. Why this number?

The temptation to collapse to three:

- "**`payload_ready` is just part of `build_payload`. Make `build_payload` return the block directly.**" Compelling — fewer methods, simpler call sites. **Wrong.** Doing so kills the build-during-voting parallelism from L7 §4. The proposer's hot path becomes "wait for build, then propose" instead of "propose what was already built." Sub-second slots fall off the table.

- "**`validate_payload` and `commit` should merge. If validation passes, just commit.**" Tempting because most call sites do both back-to-back. **Wrong.** Validators import many candidate proposals per height (one per proposer slot in a round-robin) but commit only one — the deciding value. Validation is speculative; commit is final. Merging them forces speculative state changes, which means rollback machinery, which means a much more complex EVM crate.

The temptation to expand to five:

- "**Add `notify_view_change(round)` so the EVM knows when a round timed out.**" Plausible — view changes are a real consensus event. **Unnecessary.** The EVM doesn't need to know about rounds; it only needs to know about decided blocks. Round changes are CL-internal state. Adding `notify_view_change` leaks consensus internals into execution — a contract leak (see L1 §5).

- "**Add `restream_proposal(hash)` so the bridge can re-broadcast a stale proposal.**" Plausible — Malachite's AppMsg loop has a `RestreamProposal` variant. **Unnecessary.** Restreaming is a network-layer concern: the consensus crate's app loop handles it directly (see `engine_app.rs:96@0844d58`) without bridge involvement. The bridge is the EL contract, not a general consensus event sink.

Four methods is the minimum that captures the L7 mapping (each method maps onto exactly one Ethereum Engine API call) without inviting contract leaks.

## 4. Error semantics — Rejected, Syncing, Internal

`BridgeError` at `crates/consensus/src/bridge.rs:33@0844d58`:

```rust
#[derive(Debug, Error)]
pub enum BridgeError {
    #[error("execution layer rejected payload: {0}")]
    Rejected(String),

    #[error("execution layer is syncing")]
    Syncing,

    #[error("internal: {0}")]
    Internal(#[from] eyre::Report),
}
```

Three variants. Each maps to a specific consensus-side response:

| Variant | What it means | Consensus response |
| :--- | :--- | :--- |
| `Rejected(reason)` | The EL applied logic and decided no. The block is malformed, or refers to an unknown parent, or violates EIP-1559. | Treat the proposal as Invalid; vote nil on this value. Continue to next round. |
| `Syncing` | The EL doesn't have the state to answer yet — it's catching up to the network's tip. | Wait. Don't vote nil (we don't know if the block is bad). Backoff and retry, or fall to a timeout. |
| `Internal(report)` | Something is genuinely broken. Database corruption, EL panic, missing file. | **Halt the chain.** Propagate the error up, log loudly. We can't safely continue. |

The three are not interchangeable. A bridge that returns `Internal` for an unknown parent (which is really `Rejected`) will halt the chain when it should just have voted nil. A bridge that returns `Rejected` for a syncing condition will permanently fork from peers who could have given them the answer.

> 🛑 **Anti-fluency.** "Errors are errors. One `Error` enum is fine." **No.** In consensus code the *category* of error determines whether the chain advances, pauses, or halts. Collapsing them loses information that's load-bearing for liveness. Three variants is the minimum.

> 🛑 **Predict.** Pick one: a peer sends us a proposal whose parent block hash isn't in our chain. Should the bridge return `Rejected`, `Syncing`, or `Internal`?

The answer depends on **whether we expect to learn about the parent**. If our node is behind and the parent is real (and we just haven't synced it yet) → `Syncing`. If our node is up to date and no such block exists → `Rejected`. The bridge can't always tell which case it's in; in practice production bridges check the sync state of their provider before classifying.

In `LiveRethEvmBridge::build_payload` at `crates/evm/src/live_node.rs:68@0844d58`, the current code returns `Rejected` when the provider has no block with the given hash. That's correct **if we assume our provider is up to date** — true for single-validator mode (no peers can be ahead of us), would need tightening for multi-node deployments.

## 5. Test doubles — `InMemoryEvmBridge` as the canonical pattern

Three implementations of `ConsensusBridge` live in `crates/evm/src/`:

- `InMemoryEvmBridge` (`in_memory.rs:14@0844d58`) — pure in-process state, no Reth deps. Used in unit tests where you want fast, isolated bridge calls.
- `RethEvmBridge` (`engine.rs`) — uses real alloy `Header` + `B256`, but in-memory state. Bridge between mock and live.
- `LiveRethEvmBridge` (`live_node.rs`) — wraps a real Reth `BlockchainProvider` + `EthBeaconConsensus`. Production-shape.

The pattern: **trait first, multiple impls, each at a different point on the "real" axis.** Unit tests use the cheapest impl; integration tests use richer impls; production uses the live impl.

`InMemoryEvmBridge` is the canonical test double. Its `build_payload`:

```rust
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
```

Sixteen lines. No Reth, no provider, no validator. The block hash is synthesized from `(payload_id, number)` instead of computed from a real header. The state root is zero. **And the trait doesn't care.**

That's the test-double payoff: the trait expresses *what* the EL contract is, not *how* it's implemented. A unit test can run `run_single_validator(&InMemoryEvmBridge::new(), parent)` in microseconds; the same caller code runs against `LiveRethEvmBridge` in production with no signature changes.

> 🛑 **Anti-fluency.** "Test doubles always lie." Mostly true, but not the right framing. A test double *narrows* the contract to the part you're testing. `InMemoryEvmBridge` truthfully implements "build a child block on a parent" — it just declines to do real EVM execution or hash computation, because those aren't what the consensus tests are testing.

## 6. Type ownership — why contract types live in `openhl-types`

Look at the trait's signatures:

```rust
async fn build_payload(&self, parent: BlockHash, attrs: PayloadAttrs)
    -> Result<PayloadId, BridgeError>;
```

`BlockHash`, `PayloadAttrs`, `PayloadId` — these aren't defined in `openhl-consensus` or `openhl-evm`. They're in `openhl-types`. Why?

Because **the consensus crate and the evm crate both need to name them** — consensus to call the trait, evm to implement it. If the types lived in `openhl-consensus`, then `openhl-evm` would have to depend on `openhl-consensus` to implement the trait. If they lived in `openhl-evm`, then `openhl-consensus` would depend on `openhl-evm` to call the trait.

Either way you get a cycle: A depends on B, B depends on A. Rust's crate graph is a DAG; cycles are a compile error. The fix is the **shared types crate**: both `openhl-consensus` and `openhl-evm` depend on `openhl-types`, and neither depends on the other for type definitions.

The `ConsensusBridge` trait itself lives in `openhl-consensus` (consensus owns the contract), but the trait's *vocabulary* lives one level lower in the dep graph.

This pattern shows up at every L1 with a serious type system:

| Chain | Contract types live in | Trait lives in |
| :--- | :--- | :--- |
| Ethereum (Reth) | `alloy-primitives`, `reth-primitives-traits` | `reth-engine-primitives`, `reth-rpc-api` |
| Tendermint / CometBFT | `tendermint-proto` | various consumer crates |
| Malachite | `informalsystems-malachitebft-core-types` | `informalsystems-malachitebft-core-consensus` |
| **OpenHL** | `openhl-types` | `openhl-consensus` |

Same shape. Different names.

## 7. What this trait DOESN'T do

The hardest part of designing a contract is what you leave out. Four things `ConsensusBridge` deliberately doesn't have:

1. **No transaction pool.** A real EL has a mempool. We could expose `submit_transaction(tx)` on the bridge. **We don't.** The mempool is an EL-internal concern; consensus shouldn't care how the EVM finds transactions to put in blocks. (In real Reth, the payload builder owns mempool access; consensus never touches it.)

2. **No state queries.** No `get_balance(addr)`, no `read_storage(addr, slot)`. **State is an EL-only concern.** If consensus needs to read state, it's doing the wrong thing — consensus only needs to know about blocks and their order, not their contents.

3. **No subscription API.** No `subscribe_decisions()` or `on_block_committed(callback)`. The bridge is a synchronous (well, async-await) request-response trait; the EL doesn't push events back to consensus. If consensus wants to know about decisions, it's *the one making them* — no callback needed.

4. **No genesis/init method.** No `initialize_genesis(spec)`. Genesis is a chain-spec concern, handled at node bootstrap (`OpenHlNode::start()` reads the chain spec from `Genesis` — Module 5 territory). The bridge is for steady-state operation, not initialization.

Each of these temptations is real, and each would have made the trait larger. **The minimum viable contract is exactly four methods.** Resisting expansion is a design discipline.

> 🛑 **Predict.** A new contributor argues: "We should add `query_state(addr) -> StateView` to the trait — it'd make debugging easier." **Why is this wrong?** Hint: think about the dep graph (§6) and what consensus needs to know to make decisions.

The answer: consensus doesn't need to read state; it picks the next *block*, not the next *state*. Adding `query_state` puts the cart before the horse, leaks EL internals into the CL crate, and obligates every impl (including `InMemoryEvmBridge`) to maintain a queryable state machine. The right place for state queries is the EL crate's own debug interface, not the consensus contract.

## 8. Practice

1. **Find the two stub bridges.** In `crates/consensus/src/runner.rs` and `crates/consensus/src/engine_app.rs` test modules, find the inline `StubBridge` impls. Why are there *two* (not one shared)? What's the minimum each one implements vs `InMemoryEvmBridge`? (Hint: both stubs predate adding `openhl-evm` as a test-only dep of `openhl-consensus`, which would have created the dep cycle in §6. Inline stubs avoid the cycle.)

2. **Halt-vs-recover audit.** Read every `Err(BridgeError::...)` return in `LiveRethEvmBridge` at `crates/evm/src/live_node.rs@0844d58`. For each, identify whether it's `Rejected`, `Syncing`, or `Internal`. Then check: does the consensus-side caller (in `runner.rs` or `engine_app.rs`) handle that variant the way §4's table prescribes?

3. **Sketch a fifth method (and discover why not).** Suppose you wanted to add `restream_proposal(block_hash)` to support Malachite's `RestreamProposal` AppMsg. Sketch the trait change. Then read `engine_app.rs:96@0844d58` — what does the current code do for `RestreamProposal`? Why doesn't the bridge need to be involved?

> **Final check.** In one sentence, why does `validate_payload` take `&ExecutedBlock` (a *borrowed* reference) instead of `ExecutedBlock` (owned)? If your answer doesn't include "validation shouldn't consume the block — consensus may still need it" or "the borrow is a type-system safety rail against accidental ownership transfer," re-read the trait signature.
````

---

## Seed-file slot

L9 lands in `prisma/seed-reth-openhl-consensus-en.ts` (course `building-openhl-consensus-en`), as the first lesson of Module 4 (immediately before L10 which we already drafted):

```typescript
// Course.modules.create array:
{
  title: 'Wiring it up — the consensus crate',
  sortOrder: 3,
  lessons: { create: [
    {
      title: 'Designing the contract — the ConsensusBridge trait',
      slug: 'openhl-bridge-trait-en',
      type: 'CONTENT',
      sortOrder: 0,
      duration: 20,    // ← longer than L7/L10's 15 min
      xpReward: 60,    // ← higher than L7/L10's 40 XP
      content: `# Designing the contract — the \`ConsensusBridge\` trait\n\n...`  // L9 markdown
    },
    {
      title: 'From Malachite Decided to Reth forkchoice_updated',
      slug: 'openhl-decided-to-fcu-en',
      type: 'CONTENT',
      sortOrder: 1,
      duration: 15,
      xpReward: 40,
      content: `# From Malachite \`Decided\` to Reth \`forkchoice_updated\` ...`  // L10 markdown
    },
    // L11: Proposer hot loop (TBD)
  ]}
}
```

## SHA pinning discipline

All cites pin SHA `0844d58`. L9 is unusually citation-dense because it's a design lesson — every claim about the trait's shape is grounded in the actual code at:

- `crates/consensus/src/bridge.rs:11` — the trait
- `crates/consensus/src/bridge.rs:33` — BridgeError
- `crates/evm/src/in_memory.rs:14` — InMemoryEvmBridge struct
- `crates/evm/src/in_memory.rs:34` — InMemoryEvmBridge's trait impl
- `crates/evm/src/live_node.rs:68` — LiveRethEvmBridge::build_payload
- `crates/consensus/src/engine_app.rs:96` — RestreamProposal handler (Exercise 3 reference)

When Stage 7d lands and `LiveRethEvmBridge::commit` becomes a real `forkchoice_updated` call:
- L9's argument structure (4 methods, 3 error variants, types in shared crate) stays valid
- The `LiveRethEvmBridge::commit` cite in §4's "halt-vs-recover" table needs a bump

## Style review notes (self-critique before paste)

- **L9 is 20 min by design** — heavier than L7/L10. The 8-section structure (vs the 7-section template of L1/L7/L10) is deliberate: §3 (why four methods) and §7 (what the trait doesn't do) are the design-rationale sections that justify the extra time. If either feels thin in review, fold §7's enumeration into §3 and drop to 7 sections.
- **§4's halt-vs-recover table is the highest-leverage paragraph in the lesson.** It's the one thing learners will reference back to when implementing their own bridge. If the rest of the lesson gets cut, save this section.
- **§5's "test double" framing** doubles as setup for Module 1 L4 (Context type implementation) — both lessons argue that "trait-first, multiple impls" is the right pattern for working with consensus protocols. Worth cross-referencing once both are drafted.
- **§6's dep-graph argument** is Rust-specific. Translating to JA needs care — the term "依存グラフ" works but the cycle-as-compile-error punchline might land differently. Flag for the translator.
- **Exercise 1 references "the inline StubBridge"** — currently these live in `runner.rs:316@0844d58` and `engine_app.rs:163@0844d58` (test modules). Worth verifying line numbers right before paste, since test-module locations shift more than production code.

## Curriculum status

Four lessons drafted as durable files:

| Lesson | Module | File | Status |
| --- | --- | --- | --- |
| L1 — Contract between BFT and the EVM | 1 | `drafts/openhl_l1_en.md` | ✓ drafted |
| L7 — Engine API | 3 | `drafts/openhl_l7_l10_en.md` | ✓ drafted |
| L9 — Designing the ConsensusBridge | 4 | `drafts/openhl_l9_en.md` | ✓ drafted |
| L10 — Decided → forkchoice | 4 | `drafts/openhl_l7_l10_en.md` | ✓ drafted |

L9 + L10 are now a complete Module-4 pair. Module 1 has L1; Module 3 has L7. Remaining: L2, L3, L4, L5, L6, L8, L11, L12, L13 — 9 lessons, all anchored in current code at `0844d58`.

Module 4 is the most teachable module right now — both lessons drafted, the AppMsg loop + trait + Decided handler form a coherent unit. Natural next pairs:
- **L11 + L13** — proposer hot loop (`runner.rs`) + first block via engine (`engine_app.rs` integration test). Completes Module 4 / starts Module 5.
- **L4 + L5** — Malachite Context types + the actor model. Mid-arc.
- **L2 + L3** — the convergence lesson + Context introduction. Earlier in the arc.
