# Building OpenHL — L1 draft (EN)

> Drafted against openhl SHA `0844d58` (Stage 7c). Originally written before Stage 6a when `bridge.rs` didn't yet exist as code; SHA pins added retroactively now that the cited file is live at `crates/consensus/src/bridge.rs:11`.
> Course: `building-openhl-consensus-en` (track: `reth-l1-architect`, course #6 of 10).
> First lesson of the arc — establishes the four-message contract every other lesson references.

---

## L1 — `openhl-consensus-contract-en`

- **Module:** 1 (The execution/consensus split), sortOrder 0 within module
- **Course-level sortOrder:** 0 (lesson 1 of 13)
- **Duration:** 15 min
- **XP reward:** 40
- **Type:** CONTENT

### Content

````markdown
# The contract between BFT and the EVM

> **Where you are.** Sub-module 1 of 5: *The execution/consensus split.* L0 mapped the whole repo; this sub-module zooms into the seam between the two halves — what the four-message contract between Malachite (CL) and Reth (EL) actually is, and why every BFT-shape L1 ends up drawing this same line. L1 names the four messages; L2 explains why HL, Tempo, and CometBFT all converge on this shape.

It's 3am. Your OpenHL devnet halted three blocks ago. The Malachite logs say `waiting for value`. The Reth logs say `engine idle`. Neither side is throwing an error. **Which one is broken?**

If you can't answer that question in 30 seconds, the bug isn't in either crate — it's in your mental model of how they talk. This lesson installs that model. By the end you'll know the four messages that cross between consensus and execution, what each one promises, and exactly which crate to blame when one of them goes missing.

> 🛑 **Predict before scrolling.** Two services running in the same process: Malachite (BFT) and Reth (EVM). **Name as many messages as you can that must flow between them for a block to get produced and committed.** If you stop at "block goes from consensus to EVM," you don't have the contract yet.

## 1. Why a contract at all

A naïve L1 fuses consensus and execution into one giant module. State updates, signature verification, fork choice, vote tallying, mempool — all in one binary, all tangled. This is how most pre-2020 chains were written. It works. **It also costs you everything.**

The cost lands in three places:

| Cost | What you lose |
| :--- | :--- |
| **Swappability** | You can't change consensus without rewriting the EVM, and vice versa. HL goes from HyperBFT v1 to v2 without touching the matching engine because v1 and v2 honor the same contract. |
| **Testability** | You cannot unit-test consensus without spinning up an EVM, or vice versa. Both halves are integration-test-only. |
| **Debuggability** | At 3am, you cannot tell which side stalled. The crash dump is one ball of mud. |

The contract is the cure. Once you've named the messages between the two halves, each half becomes a thing you can replace, mock, fuzz, and reason about in isolation. **The contract is the API. The code is implementation detail.**

## 2. What BFT promises the EVM

The consensus crate owes the execution crate exactly two things:

1. **An ordered stream of committed blocks.** Every validator sees the same blocks in the same order. No gaps. No reorgs — in a classical BFT chain. Nakamoto chains promise something weaker, but you're not building one.
2. **Validity assertions.** Each committed block was voted on by ≥ 2f+1 validators. If your EVM applies it and produces an invalid state, that's *your* bug, not consensus's.

That's the entire contract from BFT's side. Notice what's *not* in there:

- Not "the right transactions." (BFT doesn't know what your txs do.)
- Not "the right state root." (BFT didn't compute state.)
- Not "the canonical fork." (In BFT there *is* no fork — that's the point.)

> 🛑 **Anti-fluency.** "Consensus picks the next state." **Wrong.** Consensus picks the next *block*. The state is whatever your EVM computes when it applies that block. If two validators disagree on the state, it's not a consensus bug — it's a determinism bug in execution.

## 3. What the EVM promises BFT

The execution crate owes the consensus crate exactly three things:

1. **Deterministic execution.** Given block B applied to state S, every validator produces the same S'. No floating-point, no system time, no randomness, no map iteration order. Determinism is non-negotiable; one violation forks the chain.
2. **Fast block assembly.** When consensus says "build me a block," execution returns one inside the propose-timeout budget (~300–500ms in HL, Tempo, OpenHL). Slower than that and the chain stalls.
3. **Validity verification on import.** When a peer's proposal arrives, execution can answer: "would this execute cleanly?" *before* consensus commits it.

> 🛑 **Predict.** Three EVM promises, one is far harder than the others. **Which one — and why does it bite teams that rolled their own L1 most often?** Think about the easiest source of nondeterminism to ship by accident.

The answer is determinism. Every junior engineer eventually adds a `HashMap` iteration or a `SystemTime::now()` to "just log something" and forks the chain at 3am. Reth's API surface is paranoid about this for a reason; respect it.

## 4. The four messages

Here is the entire contract, in four messages:

| Direction | Message | Sent when | Promise |
| :--- | :--- | :--- | :--- |
| CL → EL | `build_payload(parent, attrs)` | Validator becomes proposer for height N | "Build me a candidate block on top of `parent`." |
| EL → CL | `payload_ready(block, state_root)` | Build completes before the propose deadline | "Here's the block. Use it as your proposal value." |
| CL → EL | `validate_payload(block)` | A peer's proposal arrives | "Would this block execute cleanly? Answer VALID, INVALID, or SYNCING." |
| CL → EL | `commit(block_hash)` | BFT reaches `Decided` for height N | "Finalize this block as the new head." |

That's it. Three messages CL → EL, one EL → CL. **Every other interaction is a leak.**

Three things in this table are worth seeing clearly:

- **Validation and commit are separate.** Validators import many candidate blocks per height (one per proposer slot in a round-robin), execute each speculatively, and only commit one. Most teams collapse these into a single message and pay for it later when speculative execution becomes a refactor instead of a feature.
- **`build_payload` returns nothing immediately.** It kicks off an async build job; the block arrives later via `payload_ready`. This is the "build during voting" trick — payload assembly overlaps with the previous block's votes, so propose has near-zero latency on the hot path.
- **`commit` is fire-and-forget.** Once consensus says "this is final," execution must apply it. There is no "are you sure?" round-trip. If execution can't apply a committed block, the chain halts. That is the correct behavior — silently dropping a committed block is how you fork the world.

## 5. Where the boundary lives in OpenHL code

Concretely in our workspace:

```
crates/consensus/      ← speaks Malachite. Owns the four messages from the CL side.
  src/bridge.rs        ← the ConsensusBridge trait — the typed cable across the boundary
  src/runner.rs        ← issues build_payload + waits on payload_ready
  src/engine_app.rs    ← issues validate_payload + commit (via the AppMsg loop)

crates/evm/            ← speaks Reth. Owns the four messages from the EL side.
  src/engine.rs        ← RethEvmBridge — early in-process impl using Reth types
  src/live_node.rs     ← LiveRethEvmBridge — full impl against a real Reth node
```

The `ConsensusBridge` trait at `crates/consensus/src/bridge.rs:11@0844d58` is the contract, made textual:

```rust
// crates/consensus/src/bridge.rs
#[async_trait]
pub trait ConsensusBridge: Send + Sync {
    async fn build_payload(
        &self,
        parent: BlockHash,
        attrs: PayloadAttrs,
    ) -> Result<PayloadId, BridgeError>;

    async fn payload_ready(
        &self,
        id: PayloadId,
    ) -> Result<ExecutedBlock, BridgeError>;

    async fn validate_payload(
        &self,
        block: &ExecutedBlock,
    ) -> Result<PayloadStatus, BridgeError>;

    async fn commit(
        &self,
        block_hash: BlockHash,
    ) -> Result<(), BridgeError>;
}
```

Read that trait carefully. **Every interaction between consensus and execution in OpenHL flows through one of those four methods.** If you find yourself reaching across the boundary another way — accessing a Reth DB handle from the consensus crate, or peeking at Malachite vote state from the EVM crate — you've broken the contract and you will pay for it in a forked devnet within the week.

> 🛑 **Anti-fluency.** "Reth *is* the consensus layer of OpenHL." **No.** Reth ships a `Consensus` trait, but it's a *block-validation hook* — parent-hash checks, gas-limit checks, EIP-1559 base-fee math. Not a BFT engine. Reth has no leader election, no votes, no view changes. The BFT engine is Malachite, sitting in `crates/consensus`, talking to Reth through the four messages above. Confuse the two and your architecture diagrams will be wrong forever.

## 6. Every BFT L1 draws this line in the same place

This isn't OpenHL's invention. It's what every serious BFT L1 in production has converged on:

| Chain | CL side | EL side | Contract surface |
| :--- | :--- | :--- | :--- |
| **Ethereum** | Lighthouse, Prysm, Teku, Nimbus | Reth, Geth, Erigon | Engine API over JSON-RPC (`engine_newPayload`, `engine_forkchoiceUpdated`, `engine_getPayload`) |
| **Hyperliquid** | HyperBFT | HyperCore + HyperEVM | Internal Rust trait (closed source) |
| **Tempo** | Tempo BFT (CometBFT-derived) | Reth-based | In-process Rust trait |
| **OpenHL** | Malachite | Reth | `ConsensusBridge` trait |

Ethereum is the special case: the contract is over JSON-RPC because CL and EL are *separate processes*, often from different teams in different languages. HL, Tempo, and OpenHL all run CL and EL in one binary, so the contract is a Rust trait — but **the message surface is the same**. Same shape, different transport.

> 🛑 **Predict.** Ethereum's CL/EL split runs CL and EL as separate processes with a JSON-RPC wire format. OpenHL runs them as two crates in one binary with an in-process trait. **What does Ethereum gain from process separation that costs them — and OpenHL — what?** Think about who can replace which.

Ethereum gains **client diversity**: four CLs, multiple ELs, no single-implementation risk if a bug takes one client down. It pays in latency (RPC overhead, ~5–15ms per call). OpenHL gains low-latency calls (microseconds, in-process) but ships as one binary. For a single-team L1 chasing sub-second finality, the trade is obviously right. And if OpenHL ever wants client diversity, the trait is small enough to expose over JSON-RPC later — the contract already exists.

## 7. Practice

1. **Re-derive the four messages without looking.** Write them down: direction, name, when sent, what each one promises. If you miss one, you don't have the contract internalized yet.
2. **Find the contract leak.** Open `crates/consensus/src/bridge.rs` and `crates/evm/src/live_node.rs` at SHA `0844d58`. Read both files top to bottom. Identify any access from one crate into the other that does *not* flow through `ConsensusBridge`. There shouldn't be any. If you find one, file an issue.
3. **Map to Ethereum.** For each of the four OpenHL messages, name the Ethereum Engine API method that corresponds.
   *Cheat sheet:* `build_payload` + `payload_ready` ↔ `engine_forkchoiceUpdated` (with payload attrs) + `engine_getPayload`. `validate_payload` ↔ `engine_newPayload`. `commit` ↔ `engine_forkchoiceUpdated` with the new finalized hash.

> **Final check:** in one sentence, why does "the EVM can just read the latest committed block from consensus's internal state" violate the contract — and what's the determinism failure mode it would cause? If your answer doesn't include "the EVM crate now depends on consensus internals and any change to those internals can fork the chain," re-read §5.
````

---

## Seed-file slot

L1 lands in `prisma/seed-reth-openhl-consensus-en.ts` (course `building-openhl-consensus-en`), as the first lesson of Module 1:

```typescript
// Course.modules.create array:
{
  title: 'The execution/consensus split',
  sortOrder: 0,
  lessons: { create: [
    {
      title: 'The contract between BFT and the EVM',
      slug: 'openhl-consensus-contract-en',
      type: 'CONTENT',
      sortOrder: 0,
      duration: 15,
      xpReward: 40,
      content: `# The contract between BFT and the EVM\n\nIt's 3am. ...`  // L1 markdown
    },
    // L2: Where Hyperliquid, Tempo, and CometBFT-based chains converge (TBD)
  ]}
},
// Module 2: Malachite as a library (TBD)
// Module 3: Reth as a library — contains L7 (drafted, separate file)
// Module 4: Wiring it up — contains L10 (drafted, separate file)
// Module 5: Single-validator devnet (TBD)
```

## SHA pinning discipline

Every `file:line@SHA` cite pins SHA `0844d58`. L1 has fewer cites than L7/L10 because the lesson is mostly conceptual (the contract design); the one anchored citation is the trait at `crates/consensus/src/bridge.rs:11`, which has been stable since Stage 6a (`13113db`) and is unchanged at `0844d58`.

The trait is a load-bearing artifact for the whole course arc:
- L1 introduces it as the contract
- L7 maps each method onto the Ethereum Engine API
- L9 walks through designing it
- L10 cites the commit handler that exercises it

A change to the trait surface invalidates all four lessons; cite by SHA so the invalidation is detectable.

## Style review notes (self-critique before paste)

- **L1 was the lesson-format template.** L7 + L10 follow its cadence (3am hook → 7 sections → practice + final check). When updating any of them, keep the cadence consistent so the course reads as one voice.
- **§5's "Where the boundary lives" table** initially listed paths that didn't exist (e.g., proposer.rs, validator.rs, sync.rs). Updated to match actual files at `0844d58`: bridge.rs, runner.rs, engine_app.rs, engine.rs, live_node.rs. If the file layout shifts again (e.g., when actor-engine work consolidates), this table needs to track.
- **Exercise 2 references reading both files at SHA `0844d58`** — this is the strongest exercise of the three because it requires actually opening the code, and the "no contract leak" assertion is testable.
- **JA mirror pending.** Per rethlab's bilingual policy, `openhl-consensus-contract-ja` needs a separate seed entry. Translation pass is a separate task — but L1 in particular benefits from JA early since it's the foundational lesson.

## Where this leaves the curriculum

Three lessons now drafted as durable files:

| Lesson | File | Status |
| --- | --- | --- |
| L1 — Contract between BFT and the EVM | `drafts/openhl_l1_en.md` | ✓ drafted |
| L7 — Engine API | `drafts/openhl_l7_l10_en.md` | ✓ drafted |
| L10 — Decided → forkchoice | `drafts/openhl_l7_l10_en.md` | ✓ drafted |

Remaining outlines (L2, L3, L4, L5, L6, L8, L9, L11, L12, L13): code exists for all of them at `0844d58`, so they're writeable when ready. Natural next pairs:
- **L9 + L10** (designing the ConsensusBridge + the Decided handler) — L10 already cites L9's design, so writing L9 closes the loop.
- **L4 + L5** (implementing Context types + the actor model) — both anchored in commits `784785b` (types) and `b7590df` (single-validator runner).
- **L11 + L13** (proposer hot loop + first block via engine) — anchored in `708472c` (run_engine_app + first-block test).
