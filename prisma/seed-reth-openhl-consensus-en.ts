// AUTO-GENERATED from drafts/openhl_*_en.md by .github/scripts/build-openhl-seed.ts
// Do not hand-edit. Re-run the build script when drafts change.

import { PrismaClient } from '@prisma/client';

export async function seedRethOpenHlConsensusEN(prisma: PrismaClient) {
  const tags = ["reth","malachite","bft","evm","clob","l1","openhl","expert"];

  await prisma.course.create({
    data: {
      slug: "reth-openhl-consensus-en",
      title: "Building OpenHL — Consensus Substrate",
      description:
        "OpenHL is the open-source reference implementation of Hyperliquid: in place of the closed-source HyperBFT / HyperCore / HyperEVM stack, it assembles the same shape of L1 on top of Reth (EVM execution) and Malachite (BFT consensus). This course is the L1 Architect tier's worked example, walking that build end to end. By the end you can read every load-bearing piece of a Hyperliquid-shape L1 (BFT consensus + EVM execution + CLOB matching engine) in the actual psyto/openhl code — the four-message ConsensusBridge contract that wires CL to EL, Malachite's Context trait, Reth's NodeBuilder pattern for swapping individual components, the proposer hot loop, and custom EVM precompiles that read live orderbook state. Not a course that just talks about consensus theory; one that takes you all the way to a running cargo binary.",
      difficulty: "EXPERT",
      duration: 195,
      xpReward: 560,
      track: "reth-l1-architect",
      tags,
      isPublished: false,
      sortOrder: 600,
      locale: "en",
      instructorName: "RethLab",
      modules: {
        create: [
          {
            title: "The execution/consensus split",
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: "The contract between BFT and the EVM",
                  slug: "openhl-consensus-contract-en",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 15,
                  xpReward: 40,
                  content: `# The contract between BFT and the EVM

It's 3am. Your OpenHL devnet halted three blocks ago. The Malachite logs say \`waiting for value\`. The Reth logs say \`engine idle\`. Neither side is throwing an error. **Which one is broken?**

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

The answer is determinism. Every junior engineer eventually adds a \`HashMap\` iteration or a \`SystemTime::now()\` to "just log something" and forks the chain at 3am. Reth's API surface is paranoid about this for a reason; respect it.

## 4. The four messages

Here is the entire contract, in four messages:

| Direction | Message | Sent when | Promise |
| :--- | :--- | :--- | :--- |
| CL → EL | \`build_payload(parent, attrs)\` | Validator becomes proposer for height N | "Build me a candidate block on top of \`parent\`." |
| EL → CL | \`payload_ready(block, state_root)\` | Build completes before the propose deadline | "Here's the block. Use it as your proposal value." |
| CL → EL | \`validate_payload(block)\` | A peer's proposal arrives | "Would this block execute cleanly? Answer VALID, INVALID, or SYNCING." |
| CL → EL | \`commit(block_hash)\` | BFT reaches \`Decided\` for height N | "Finalize this block as the new head." |

That's it. Three messages CL → EL, one EL → CL. **Every other interaction is a leak.**

Three things in this table are worth seeing clearly:

- **Validation and commit are separate.** Validators import many candidate blocks per height (one per proposer slot in a round-robin), execute each speculatively, and only commit one. Most teams collapse these into a single message and pay for it later when speculative execution becomes a refactor instead of a feature.
- **\`build_payload\` returns nothing immediately.** It kicks off an async build job; the block arrives later via \`payload_ready\`. This is the "build during voting" trick — payload assembly overlaps with the previous block's votes, so propose has near-zero latency on the hot path.
- **\`commit\` is fire-and-forget.** Once consensus says "this is final," execution must apply it. There is no "are you sure?" round-trip. If execution can't apply a committed block, the chain halts. That is the correct behavior — silently dropping a committed block is how you fork the world.

## 5. Where the boundary lives in OpenHL code

Concretely in our workspace:

\`\`\`
crates/consensus/      ← speaks Malachite. Owns the four messages from the CL side.
  src/bridge.rs        ← the ConsensusBridge trait — the typed cable across the boundary
  src/runner.rs        ← issues build_payload + waits on payload_ready
  src/engine_app.rs    ← issues validate_payload + commit (via the AppMsg loop)

crates/evm/            ← speaks Reth. Owns the four messages from the EL side.
  src/engine.rs        ← RethEvmBridge — early in-process impl using Reth types
  src/live_node.rs     ← LiveRethEvmBridge — full impl against a real Reth node
\`\`\`

The \`ConsensusBridge\` trait at \`crates/consensus/src/bridge.rs:11@0844d58\` is the contract, made textual:

\`\`\`rust
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
\`\`\`

Read that trait carefully. **Every interaction between consensus and execution in OpenHL flows through one of those four methods.** If you find yourself reaching across the boundary another way — accessing a Reth DB handle from the consensus crate, or peeking at Malachite vote state from the EVM crate — you've broken the contract and you will pay for it in a forked devnet within the week.

> 🛑 **Anti-fluency.** "Reth *is* the consensus layer of OpenHL." **No.** Reth ships a \`Consensus\` trait, but it's a *block-validation hook* — parent-hash checks, gas-limit checks, EIP-1559 base-fee math. Not a BFT engine. Reth has no leader election, no votes, no view changes. The BFT engine is Malachite, sitting in \`crates/consensus\`, talking to Reth through the four messages above. Confuse the two and your architecture diagrams will be wrong forever.

## 6. Every BFT L1 draws this line in the same place

This isn't OpenHL's invention. It's what every serious BFT L1 in production has converged on:

| Chain | CL side | EL side | Contract surface |
| :--- | :--- | :--- | :--- |
| **Ethereum** | Lighthouse, Prysm, Teku, Nimbus | Reth, Geth, Erigon | Engine API over JSON-RPC (\`engine_newPayload\`, \`engine_forkchoiceUpdated\`, \`engine_getPayload\`) |
| **Hyperliquid** | HyperBFT | HyperCore + HyperEVM | Internal Rust trait (closed source) |
| **Tempo** | Tempo BFT (CometBFT-derived) | Reth-based | In-process Rust trait |
| **OpenHL** | Malachite | Reth | \`ConsensusBridge\` trait |

Ethereum is the special case: the contract is over JSON-RPC because CL and EL are *separate processes*, often from different teams in different languages. HL, Tempo, and OpenHL all run CL and EL in one binary, so the contract is a Rust trait — but **the message surface is the same**. Same shape, different transport.

> 🛑 **Predict.** Ethereum's CL/EL split runs CL and EL as separate processes with a JSON-RPC wire format. OpenHL runs them as two crates in one binary with an in-process trait. **What does Ethereum gain from process separation that costs them — and OpenHL — what?** Think about who can replace which.

Ethereum gains **client diversity**: four CLs, multiple ELs, no single-implementation risk if a bug takes one client down. It pays in latency (RPC overhead, ~5–15ms per call). OpenHL gains low-latency calls (microseconds, in-process) but ships as one binary. For a single-team L1 chasing sub-second finality, the trade is obviously right. And if OpenHL ever wants client diversity, the trait is small enough to expose over JSON-RPC later — the contract already exists.

## 7. Practice

1. **Re-derive the four messages without looking.** Write them down: direction, name, when sent, what each one promises. If you miss one, you don't have the contract internalized yet.
2. **Find the contract leak.** Open \`crates/consensus/src/bridge.rs\` and \`crates/evm/src/live_node.rs\` at SHA \`0844d58\`. Read both files top to bottom. Identify any access from one crate into the other that does *not* flow through \`ConsensusBridge\`. There shouldn't be any. If you find one, file an issue.
3. **Map to Ethereum.** For each of the four OpenHL messages, name the Ethereum Engine API method that corresponds.
   *Cheat sheet:* \`build_payload\` + \`payload_ready\` ↔ \`engine_forkchoiceUpdated\` (with payload attrs) + \`engine_getPayload\`. \`validate_payload\` ↔ \`engine_newPayload\`. \`commit\` ↔ \`engine_forkchoiceUpdated\` with the new finalized hash.

> **Final check:** in one sentence, why does "the EVM can just read the latest committed block from consensus's internal state" violate the contract — and what's the determinism failure mode it would cause? If your answer doesn't include "the EVM crate now depends on consensus internals and any change to those internals can fork the chain," re-read §5.`,
                },
                {
                  title: "Where Hyperliquid, Tempo, and CometBFT-based chains all converge",
                  slug: "openhl-consensus-convergence-en",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 15,
                  xpReward: 40,
                  content: `# Where Hyperliquid, Tempo, and CometBFT-based chains all converge

Pick any production BFT L1 and read its consensus-side architecture. **Three teams in three different companies, optimizing for three different go-to-markets, all converge on the same design.** Hyperliquid (closed source, HotStuff-derived). Tempo (CometBFT-derived). Every chain in the Cosmos ecosystem (CometBFT). Malachite, the library openhl uses, is a clean-room implementation of the same idea.

That's not a coincidence. There's a forcing function. By the end of this lesson you'll know what it is — and why no major BFT L1 does optimistic execution.

> 🛑 **Predict before scrolling.** Pick one: in a BFT chain, does execution happen *before* a block is finalized (optimistic), *during* finalization (mid-flight), or *after* finalization (decide-first-then-execute)? Once you've picked, name three properties the other two patterns sacrifice.

## 1. The convergence — observation

| Chain | Consensus family | When does execution happen? |
| :--- | :--- | :--- |
| Bitcoin (PoW) | Nakamoto / longest-chain | **During** (miner runs txs while building the candidate; chain advances when their PoW lands) |
| Ethereum 1.0 (PoW) | Nakamoto | **During** (same as Bitcoin) |
| Ethereum 2.0 (PoS) | Casper FFG + LMD-GHOST | **Optimistic, then finalized** (execute under fork-choice, finalize ~13 minutes later) |
| Cosmos chains (CometBFT) | Tendermint BFT | **After decide** (consensus reaches commit, then ABCI app executes) |
| **Hyperliquid (HyperBFT)** | HotStuff-family BFT | **After decide** (same pattern, different name) |
| **Tempo (CometBFT-derived)** | Tendermint-shape | **After decide** |
| **openhl (Malachite)** | Tendermint BFT (clean-room) | **After decide** |

Every BFT L1 in the last column lands in the same row: **decision happens first, execution happens after.** Three independent teams converged on this design — not by talking to each other, but because the BFT safety property forces it.

## 2. Why decide-first-execute-after — the safety argument

BFT's promise is **safety**: no two honest validators ever decide on different values for the same height. This implies a corollary: **once decided, never reorged.** No takebacks.

For this to hold, execution must be deterministic *given a decided block*. Every validator that applies the decided block must arrive at the same post-state. If they don't, two validators that agreed on block contents but disagreed on its effects have effectively forked — same block, different state — and the chain's safety property has been silently violated.

Optimistic execution undermines this in a subtle way. The pattern goes:

1. Validator receives a candidate block (not yet decided)
2. Validator executes the block speculatively to compute state
3. Validator votes based on its computed state
4. Other validators do the same
5. Aggregate votes; if 2/3+, decide

The problem is step 2: each validator has executed the block in their own state. If their pre-states diverge (because of a prior nondeterminism bug, network partition, etc.), they'll compute different post-states and vote differently. **The fork happens during voting, not after.** And BFT's safety promise doesn't catch it — the votes might still reach quorum on the same block_hash, but the resulting state disagrees.

The decide-first pattern sidesteps this:

1. Validators agree on a candidate block (just bytes; no execution)
2. They vote on the bytes
3. Once 2/3+ commit, decision is final
4. *Then* every validator applies the bytes to their state
5. If the state diverges, it's a determinism bug, not a consensus bug — and the chain halts visibly (state-root mismatch) rather than forking silently

> 🛑 **Anti-fluency.** "Optimistic execution is just a performance optimization for BFT." **No.** It's a *different paradigm* that requires rollback machinery (undo a speculative execution if the vote goes the other way) and changes the safety story. **No major BFT L1 uses optimistic execution at v1.** Some have proposed it for advanced versions (HotShot, Solana-style); none of them have shipped.

## 3. The Nakamoto counterexample — why Bitcoin had to be different

Bitcoin can't use decide-first because **there's no decision event**. In Nakamoto consensus, the "decision" is chain weight (cumulative PoW), which is probabilistic. There's no moment when validators all agree "this block is final" — there's only "this block is buried under N more confirmations, so the probability of reorg is exponentially small."

In that world, optimistic execution is the only choice. Miners *must* execute candidate blocks (it's how they find valid ones), and the chain's safety story relies on economic finality rather than algorithmic finality.

Bitcoin pays for this with:
- ~10-minute average block time (vs sub-second for BFT)
- ~6-block confirmation depth for high-value transactions (~1 hour vs instant for BFT)
- No slashing (can't punish miners for misbehavior because miners are pseudonymous)

In exchange, it gets:
- Permissionless participation (anyone with hashpower can mine)
- No bounded validator set (no 3f+1 constraint)
- Liveness under partition (each side keeps mining; they reconcile when reunited)

These are the trades the L2 table's first two rows make. **They are not better or worse than BFT — they're for a different problem.** For a chain optimizing for sub-second finality (HL, Tempo, openhl), BFT wins; for a chain optimizing for permissionless miners (Bitcoin), Nakamoto wins.

## 4. ETH 2.0's hybrid — a forcing function in microcosm

Ethereum's post-merge architecture is a fascinating intermediate case: it runs LMD-GHOST (Nakamoto-shape fork-choice) at the head and Casper FFG (BFT-shape) for finality. The EL executes optimistically; the CL's Casper finalizes blocks ~13 minutes later.

This works because the EL/CL split (which L1 §6 names as the convergence point) lets each layer use the consensus family that fits it:

- The CL gets BFT-shape finality (so the chain can recover from forks)
- The EL stays Nakamoto-flexible (so it can keep producing optimistic state)

But the hybrid is not free. The EL must support **reorgs at the head** (revert a few blocks if Casper finalizes a different fork). This is where Reth's deep \`BlockExecutor\` complexity comes from — it has to be reorg-safe, not just append-only.

**openhl skips this entire complexity.** Pure BFT means no reorgs ever — Casper-style "this is finalized, that wasn't" is unnecessary because *everything* is finalized. The same property that forced HL and Tempo to be decide-first chains also bought us a simpler EL contract.

## 5. What openhl inherits

The decide-first pattern shapes openhl's design in three ways:

1. **\`commit\` is fire-and-forget** (L1 §4). No "are you sure?" round-trip because there's nothing to retract. The decision is already permanent before the EL hears about it.

2. **\`validate_payload\` exists** (L1 §3, L7 §3). Validators receive proposals from peers and ask the EL to check executability *before* voting. This is the optimistic-execution-equivalent for decide-first chains: we don't speculate post-state, but we *do* check the proposal is well-formed enough to commit to.

3. **No reorg machinery** (this lesson). The EL never has to undo a committed block. State growth is monotonic; the canonical chain is appendable-only. Reth's reorg support stays unused.

Each of these is a deliberate inheritance from the same forcing function — the BFT safety property.

> 🛑 **Predict.** A startup proposes "BFT chain with optimistic execution" — claims 2x throughput vs decide-first. **What's their architectural commitment that the table in §1 didn't expose?**

The answer: they're committing to a rollback-capable EL — an execution layer that can revert state when consensus votes against a speculatively-executed block. That's an order of magnitude more complex than the EL on a decide-first chain. **The 2x throughput claim is real but the engineering bill comes due in the EL.** Most teams that try this end up rewriting their EL twice before shipping.

## 6. Practice

1. **Find the convergence in code.** Open any CometBFT-based chain's repo (e.g., \`cometbft/cometbft\` itself, or a downstream like Osmosis). Locate where consensus "decides" and where the application "executes." Compare to openhl's \`crates/consensus/src/engine_app.rs:119@0844d58\` (the \`AppMsg::Decided\` arm walked in L10).
2. **Name the trade.** Bitcoin uses optimistic execution. **Why is this safe for Bitcoin?** Hint: think about what "decision" means in Bitcoin — when is it irreversible?
3. **The hybrid case.** Ethereum 2.0's LMD-GHOST + Casper hybrid means the EL must support reorgs. Find one place in Reth where this shows up (search \`block_indices\`, \`reorg\`, or \`revert_state\` in \`reth-provider\`).

> **Final check.** In one sentence, why does the decide-first-execute-after pattern *force* the four-message contract (L1 §4) to have separate \`validate_payload\` and \`commit\` methods? If your answer doesn't include "validation is speculative; commit is final; they happen at different protocol moments," re-read §2.`,
                },
              ],
            },
          },
          {
            title: "Malachite as a library",
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: "What Malachite gives you — the Context trait",
                  slug: "openhl-malachite-context-en",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 15,
                  xpReward: 40,
                  content: `# What Malachite gives you — the \`Context\` trait

Malachite is one trait with ten associated types and four methods. **Once you've named the ten types, you've named your chain.** That's not metaphor — the consensus engine is parametric over those types, and every method's signature is derived from them. Pick the right types and Malachite drives consensus on them.

> 🛑 **Predict before scrolling.** A BFT consensus protocol needs to know about addresses, heights, values, votes, validators, and signatures. Sketch a Rust trait with associated types for each. We'll compare yours to Malachite's \`Context\` in §1, then look at openhl's concrete impl at \`crates/consensus/src/context.rs:19@0844d58\`.

## 1. The \`Context\` trait, named

From \`informalsystems_malachitebft_core_types::Context\`:

\`\`\`rust
pub trait Context
where
    Self: Sized + Clone + Send + Sync + 'static,
{
    type Address: Address;
    type Height: Height;
    type ProposalPart: ProposalPart<Self>;
    type Proposal: Proposal<Self>;
    type Validator: Validator<Self>;
    type ValidatorSet: ValidatorSet<Self>;
    type Value: Value;
    type Vote: Vote<Self>;
    type Extension: Extension;
    type SigningScheme: SigningScheme;

    fn select_proposer(&self, validator_set: &Self::ValidatorSet,
                       height: Self::Height, round: Round)
        -> &Self::Validator;
    fn new_proposal(&self, height: Self::Height, round: Round,
                    value: Self::Value, pol_round: Round,
                    address: Self::Address) -> Self::Proposal;
    fn new_prevote(&self, height: Self::Height, round: Round,
                   value_id: NilOrVal<ValueId<Self>>,
                   address: Self::Address) -> Self::Vote;
    fn new_precommit(&self, height: Self::Height, round: Round,
                     value_id: NilOrVal<ValueId<Self>>,
                     address: Self::Address) -> Self::Vote;
}
\`\`\`

Ten types, four methods. The whole thing is about 90 lines including doc comments. **Reading this trait IS reading what your chain looks like to Malachite.**

Notice the constraints on the types: each has its own sub-trait (\`Address\`, \`Height\`, \`Proposal<Self>\`, etc.) that defines what operations Malachite expects. We'll inventory those in §2.

## 2. The ten types, each one

| Associated type | What it is | openhl chooses |
| :--- | :--- | :--- |
| \`Address\` | Validator identity (small, comparable) | \`OpenHlAddress([u8; 20])\` — Ethereum 20-byte convention |
| \`Height\` | Block height; monotonic counter | \`OpenHlHeight(u64)\` |
| \`Value\` | What consensus decides on | \`OpenHlValue(BlockHash)\` — wraps a 32-byte hash |
| \`Validator\` | A single validator (addr + key + power) | \`OpenHlValidator { address, public_key, voting_power }\` |
| \`ValidatorSet\` | Collection of validators | \`OpenHlValidatorSet(Vec<OpenHlValidator>)\` sorted (power desc, addr asc) |
| \`Proposal\` | The proposed value + round metadata | \`OpenHlProposal { height, round, value, pol_round, address }\` |
| \`Vote\` | Prevote or precommit | \`OpenHlVote { height, round, value_id, vote_type, address }\` |
| \`ProposalPart\` | Streamed proposal pieces (for large values) | \`OpenHlProposalPart\` (unit struct; ProposalOnly mode) |
| \`Extension\` | Application data attached to precommits | \`()\` (no extensions at v0) |
| \`SigningScheme\` | What signatures look like | \`Ed25519\` from \`malachitebft-signing-ed25519\` |

Each row maps to a file in \`crates/consensus/src/types/\` — that's the structure: **one type per concept, seven files** (Address-and-Validator share \`validator.rs\`; \`Extension\` is \`()\` so no file; \`SigningScheme\` is shipped by Malachite).

\`\`\`
crates/consensus/src/types/
├── address.rs        ← OpenHlAddress
├── height.rs         ← OpenHlHeight
├── value.rs          ← OpenHlValue (wraps openhl_types::BlockHash)
├── validator.rs      ← OpenHlValidator + OpenHlValidatorSet
├── proposal.rs       ← OpenHlProposal
├── vote.rs           ← OpenHlVote
└── proposal_part.rs  ← OpenHlProposalPart
\`\`\`

(Address-and-key together in \`validator.rs\`; \`Extension\` is \`()\` so no file needed; \`SigningScheme\` is shipped by Malachite, so no impl required.)

L4 walks each file in detail. For now: **knowing these ten types exist is half of knowing what Malachite is.** The other half is the four methods (§3).

> 🛑 **Anti-fluency.** "Malachite is Tendermint." **Almost wrong.** Malachite is the *abstract* Tendermint algorithm — the state machine, the proposal-vote-precommit dance, the 3f+1 quorum math — with the I/O ripped out. The actual CometBFT implementation owns I/O (libp2p, ABCI, mempool, network); Malachite owns just the algorithm. **That separation is what lets openhl use Malachite without inheriting CometBFT's whole runtime.**

## 3. The four methods

The methods construct the protocol's messages. Their signatures look minimal because the heavy lifting is in the types.

\`\`\`rust
fn select_proposer(&self, validator_set: &Self::ValidatorSet,
                   height: Self::Height, round: Round)
    -> &Self::Validator;
\`\`\`

Given a validator set + (height, round), return whose turn it is. openhl uses round-robin over sorted validators; \`crates/consensus/src/context.rs:32@0844d58\`. **The function must be deterministic** — every honest validator computes the same proposer for the same (height, round). Nondeterminism here forks the chain.

\`\`\`rust
fn new_proposal(&self, height: Self::Height, round: Round,
                value: Self::Value, pol_round: Round,
                address: Self::Address) -> Self::Proposal;
fn new_prevote(...) -> Self::Vote;
fn new_precommit(...) -> Self::Vote;
\`\`\`

Three message constructors — one for each consensus message type. **Why factory functions rather than direct struct construction?** Because the *protocol* (Malachite's \`Driver\`) needs to create these messages, but the *chain* defines what they look like. The factory pattern decouples protocol logic from message shape.

If your \`Proposal\` type carries extra fields beyond (height, round, value, pol_round, address), you can include them in your \`new_proposal\` impl. Malachite never sees them — they're chain-specific.

## 4. What's left for you

Malachite gives you the protocol. **It does NOT give you:**

| Concern | Who owns it |
| :--- | :--- |
| Choosing addresses | You (your chain's identity scheme) |
| Building validator sets | You (genesis + slashing logic) |
| Picking values to propose | You (\`build_payload\` via the bridge) |
| Validating values | You (\`validate_payload\` via the bridge) |
| Signing messages | You (\`SigningProvider\` impl — L4 §7) |
| Network gossip | The engine actor system (libp2p) |
| Persistence (WAL) | The engine actor system |
| Storage of decided blocks | You (EL state) |
| Mempool | You (EL transaction pool) |

The split is intentional. **Malachite is small** because it only owns the consensus algorithm. Everything chain-specific — addresses, signing, payload assembly, storage — is yours.

> 🛑 **Predict.** A team forks openhl to build a new chain. They want a different address format (32-byte Solana-style addresses instead of 20-byte Ethereum-style). **How many files do they touch?**

The answer: **one file — \`crates/consensus/src/types/address.rs\`.** Change \`OpenHlAddress\` from \`[u8; 20]\` to \`[u8; 32]\`, ensure it still implements \`Address: Clone + Debug + Display + Eq + Ord + Send + Sync\`, and you're done. Malachite doesn't care about the byte width; it only cares that the trait bounds are satisfied. The rest of the chain — proposer election, vote tallying, network gossip — works unchanged.

That's the parametricity payoff. The cost of getting it right is implementing all ten types up front; the reward is that swapping any single type changes nothing else.

## 5. Reading Malachite's \`Driver\`

The \`Driver\` from \`malachitebft-core-driver\` (which openhl's \`run_single_validator\` uses at \`crates/consensus/src/runner.rs:34@0844d58\`) is the protocol state machine. It exposes:

\`\`\`rust
fn process(&mut self, input: Input<Ctx>) -> Result<Vec<Output<Ctx>>, Error<Ctx>>
\`\`\`

The \`Input<Ctx>\` and \`Output<Ctx>\` enums are parameterized by your \`Context\`. Their variants carry your types:

- \`Input::Proposal(SignedProposal<Ctx>, Validity)\` — a proposal arrived. \`SignedProposal\` is generic over \`Ctx::Proposal\`.
- \`Output::Vote(Ctx::Vote)\` — broadcast this vote. Your \`OpenHlVote\` flows back to you.
- \`Output::Decide(Round, Ctx::Proposal)\` — consensus decided on this proposal.

**The \`Driver\` itself reads as if your types didn't exist.** It traffics in \`Ctx::Address\`, \`Ctx::Vote\`, \`Ctx::Proposal\` — never \`OpenHlAddress\`, \`OpenHlVote\`, \`OpenHlProposal\`. The whole protocol is type-parametric.

Why does this matter? Because **the entire Tendermint protocol is one piece of code, debugged once across every chain that uses it.** When Cosmos chains, openhl, Tempo, and others all use Malachite (or its conceptual equivalents), they all benefit from bug fixes to the algorithm itself. No chain has to re-implement BFT.

> 🛑 **Anti-fluency.** "Each BFT chain implements its own consensus." **No.** Each chain implements its own *types* and *I/O*. The algorithm is shared across the family — sometimes literally (chains using the same library) and sometimes conceptually (HotStuff variants converge on the same state machine). **Your job as an L1 architect is types and I/O, not the algorithm.**

## 6. Practice

1. **Inventory the types.** Without looking at the code, list the ten associated types of \`Context\` and what each one represents in your chain. Then open \`crates/consensus/src/context.rs:19@0844d58\` and check your list.
2. **The Solana-address experiment.** Sketch what would change if \`OpenHlAddress\` was \`[u8; 32]\` instead of \`[u8; 20]\`. Identify which files would change (hint: just one) and which would NOT change (hint: most of them).
3. **Find the Driver.** Read \`crates/consensus/src/runner.rs:34-83@0844d58\` (the start of \`run_single_validator\`). Identify every place where one of your \`OpenHlContext\` types appears versus where a Malachite-internal type appears. Where's the seam?

> **Final check.** In one sentence, why does Malachite's \`Context\` use *associated types* rather than just generic parameters (\`Driver<Address, Height, Value, ...>\`)? If your answer doesn't include "associated types lock in one set of types per chain — generics would let callers mix-and-match, which breaks the determinism invariant," re-read §3.`,
                },
                {
                  title: "What you implement — proposals, validators, votes, signing",
                  slug: "openhl-malachite-impl-en",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 20,
                  xpReward: 60,
                  content: `# What you implement — proposals, validators, votes, signing

L3 named the ten types. Now we write them. **Forty lines of trait impls and your chain has an identity.** The exercise is mostly mechanical — each sub-trait has a small surface — but the choices encoded in those forty lines are the ones every downstream lesson references.

> 🛑 **Predict before scrolling.** Open \`crates/consensus/src/types/\` at SHA \`0844d58\`. Without reading the files, sketch the *trait bounds* you'd expect each of the ten Context sub-types to require. Hint: think about the operations Malachite needs (compare addresses for sorting, hash values for VoteKeeper lookups, display heights in logs).

## 1. The trait-bounds tour

Each Context associated type has its own sub-trait. The bounds are the API surface Malachite expects:

| Sub-trait | Required bounds | Why |
| :--- | :--- | :--- |
| \`Address\` | \`Clone + Debug + Display + Eq + Ord + Send + Sync\` | Sorted in validator sets, displayed in logs |
| \`Height\` | \`Copy + Clone + Default + Debug + Display + Eq + Ord + Send + Sync\` plus \`ZERO\`, \`INITIAL\`, \`increment_by\`, \`decrement_by\`, \`as_u64\` | Monotonic counter math |
| \`Value\` | \`Clone + Debug + Eq + Ord + Send + Sync\` plus \`type Id: Clone + Debug + Display + Eq + Ord + Send + Sync\` and \`fn id() -> Self::Id\` | Has a compact identifier (vote payload) |
| \`Validator<Ctx>\` | \`Clone + Debug + Eq + Send + Sync\` plus \`address()\`, \`public_key()\`, \`voting_power()\` | Identifies a participant with weight |
| \`ValidatorSet<Ctx>\` | \`Clone + Debug + Eq + Send + Sync\` plus \`count()\`, \`total_voting_power()\`, \`get_by_address()\`, \`get_by_index()\` | Iterable, sortable, lookupable collection |
| \`Proposal<Ctx>\` | \`Clone + Debug + Eq + Send + Sync + 'static\` plus six accessors | Carries a value plus round metadata |
| \`Vote<Ctx>\` | \`Clone + Debug + Eq + Ord + Send + Sync + 'static\` plus nine accessors | Prevote or precommit |
| \`ProposalPart<Ctx>\` | \`Clone + Debug + Eq + Send + Sync + 'static\` plus \`is_first\`, \`is_last\` | Streamable in \`PartsOnly\` mode |
| \`Extension\` | \`Clone + Debug + Eq + Send + Sync + 'static\` plus \`size_bytes()\` | Optional precommit attachment |
| \`SigningScheme\` | \`Clone + Debug + Eq\` plus \`type Signature\`, \`type PublicKey\`, \`type PrivateKey\`, encode/decode | Wire-format crypto |

**Every type also needs \`Send + Sync\` because Malachite runs across actor boundaries.** That single requirement rules out non-thread-safe choices (e.g., raw \`Rc<_>\` fields). The compiler enforces it.

## 2. The trivial three — \`Address\`, \`Height\`, \`Value\`

These are the simplest. Three structs, ~20 lines each. Open \`crates/consensus/src/types/address.rs:7@0844d58\`:

\`\`\`rust
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct OpenHlAddress(pub [u8; 20]);

impl fmt::Display for OpenHlAddress {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("0x")?;
        for b in &self.0 {
            write!(f, "{b:02x}")?;
        }
        Ok(())
    }
}

impl Address for OpenHlAddress {}
\`\`\`

Three things:
1. **\`#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]\`** gives us most trait bounds for free. The \`[u8; 20]\` field derives these naturally.
2. **\`fmt::Display\` impl** hex-encodes the address. Required by the \`Address\` super-trait; used in logs and error messages.
3. **\`impl Address for OpenHlAddress {}\`** — empty impl. The trait has no methods of its own beyond what the bounds require.

\`Height\` and \`Value\` follow the same shape. \`Height\` at \`crates/consensus/src/types/height.rs@0844d58\` adds \`INITIAL = 1\`, \`ZERO = 0\`, and saturating-arithmetic \`increment_by\`/\`decrement_by\`. \`Value\` at \`crates/consensus/src/types/value.rs\` wraps \`BlockHash\` and impls \`Value::id() -> Self::Id = BlockHash\` (the value IS its own id, since the block hash is already 32 bytes — see the prediction below).

> 🛑 **Predict.** Our \`Value::Id\` is the same type as \`Value\` itself (both \`BlockHash\`). In Cosmos chains, \`Value\` carries the full block and \`Value::Id\` is the block's hash. **Why doesn't openhl do that — why is \`Value\` just the hash?**

Because we don't ship transactions over consensus yet. The bridge produces a block, the block's hash is what's voted on, and the EL is the source of truth for the block's contents. Carrying the full block through consensus would mean serializing transactions over libp2p gossipsub — wasteful since every validator already has the EL state to reconstruct the block from its hash. **In Module 2 (CLOB) this calculation may change** — once the consensus value includes CLOB fills that aren't in the EVM mempool, \`Value\` may need to carry more than a hash.

## 3. \`Validator\` and \`ValidatorSet\` — the sort order is load-bearing

Open \`crates/consensus/src/types/validator.rs:21@0844d58\`:

\`\`\`rust
impl Validator<OpenHlContext> for OpenHlValidator {
    fn address(&self) -> &OpenHlAddress { &self.address }
    fn public_key(&self) -> &PublicKey { &self.public_key }
    fn voting_power(&self) -> VotingPower { self.voting_power }
}
\`\`\`

Three accessors. The trait expects them; the struct stores them. Trivial.

\`OpenHlValidatorSet\`'s \`new\` is the interesting bit at \`crates/consensus/src/types/validator.rs:42@0844d58\`:

\`\`\`rust
pub fn new(mut validators: Vec<OpenHlValidator>) -> Self {
    validators.sort_by(|a, b| {
        b.voting_power
            .cmp(&a.voting_power)
            .then_with(|| a.address.cmp(&b.address))
    });
    Self(validators)
}
\`\`\`

Sorted by \`(voting_power desc, address asc)\`. **This sort order is load-bearing for determinism.**

Reason: \`OpenHlContext::select_proposer\` uses \`validator_set.get_by_index((height + round) % count)\` to pick proposers (L11 territory). If two validators have different sort orders for the same validator set, they pick different proposers for the same round, and the chain forks.

The CometBFT convention (which openhl inherits) is \`voting_power desc, address asc\`. Any chain using this sort + the modulo-rotation gets deterministic proposer election as long as the address space is totally ordered — which is why \`Address: Ord\` is a hard bound (§1).

> 🛑 **Anti-fluency.** "Sort order is an implementation detail." **Wrong for consensus.** In consensus, the sort order *is* the protocol. Two implementations that sort differently are running different consensus protocols, regardless of what their type signatures look like. The CometBFT sort convention is part of the de-facto BFT family standard.

## 4. \`Proposal\` and \`Vote\` — message constructors

\`Proposal\` at \`crates/consensus/src/types/proposal.rs@0844d58\` is six accessors over a five-field struct:

\`\`\`rust
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct OpenHlProposal {
    pub height: OpenHlHeight,
    pub round: Round,
    pub value: OpenHlValue,
    pub pol_round: Round,    // "Proof-of-lock round" — Tendermint nuance
    pub address: OpenHlAddress,
}
\`\`\`

\`pol_round\` is the round at which the proposed value was locked — used by Tendermint to handle "I prevoted for this value at an earlier round but the round timed out; now I'm proposing it again." For first-round proposals, \`pol_round = Round::Nil\`.

\`Vote\` at \`crates/consensus/src/types/vote.rs:10@0844d58\`:

\`\`\`rust
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct OpenHlVote {
    pub height: OpenHlHeight,
    pub round: Round,
    pub value_id: NilOrVal<BlockHash>,    // NilOrVal: vote for value, or nil
    pub vote_type: VoteType,              // Prevote | Precommit
    pub address: OpenHlAddress,
}
\`\`\`

The \`value_id: NilOrVal<BlockHash>\` is doing real work. A vote can be:
- \`NilOrVal::Val(hash)\` — "I vote for the value with this id"
- \`NilOrVal::Nil\` — "I vote against any value at this round" (timed out, no proposal arrived)

Voting nil is how Tendermint handles missing or invalid proposals; the round still has to terminate.

Both types impl their respective sub-traits with simple accessor functions — twenty lines each. We don't write the *protocol* (Malachite owns that); we write the *types the protocol traffics in*.

## 5. \`ProposalPart\` — the streaming type we don't use

\`ProposalPart\` at \`crates/consensus/src/types/proposal_part.rs@0844d58\` is the most boring file in the codebase:

\`\`\`rust
pub struct OpenHlProposalPart;

impl ProposalPart<OpenHlContext> for OpenHlProposalPart {
    fn is_first(&self) -> bool { true }
    fn is_last(&self) -> bool { true }
}
\`\`\`

A unit struct. \`is_first = is_last = true\` (a single part is the only part).

Why does this type even exist? Malachite supports three \`ValuePayload\` modes (L5 §6 territory):
- \`ProposalOnly\` — entire value is in the \`Proposal\` message. **openhl uses this.**
- \`PartsOnly\` — value is streamed in chunks; \`Proposal\` references them.
- \`ProposalAndParts\` — both.

The other two modes exist for chains that propose large values that don't fit in a single gossip message (multi-MB blocks). \`ProposalPart\` is the streaming chunk. **openhl proposes a 32-byte block hash; we never need streaming.** But the Context trait requires the associated type, so we provide a unit struct that satisfies the bounds and never actually flows over the wire.

## 6. Signing — Ed25519 in 0 lines

Our \`SigningScheme\` is \`Ed25519\`, shipped by Malachite at \`informalsystems-malachitebft-signing-ed25519\`. **We write zero lines for it.** From \`crates/consensus/src/context.rs:29@0844d58\`:

\`\`\`rust
type SigningScheme = Ed25519;
\`\`\`

That's it. Malachite handles signature encoding/decoding, the \`Signature\` / \`PublicKey\` / \`PrivateKey\` types, all of it.

If we wanted BLS aggregation (smaller commit certificates), we'd swap to a different \`SigningScheme\` impl — Malachite's design is parametric over the scheme. We don't; Ed25519 is simpler and Tempo/HL both use it.

> 🛑 **Predict.** Switching from Ed25519 to BLS would be a one-line change in \`OpenHlContext\`. **What else in openhl would need to change?** Hint: think about validator-set storage and what gets put on the wire.

The answer: most of it would be unchanged. Validator-set storage stores \`PublicKey\`; \`PublicKey\`'s concrete type comes from \`SigningScheme\`. Switching schemes changes the type, but the storage code (just \`Vec<_>\`) doesn't care. The wire format of votes / commit certificates would change (BLS gives aggregable signatures), so the \`OpenHlCodec\` impls might need to update. But the bulk of the code — types, runner, engine_app — is invariant under the scheme choice.

## 7. The \`SigningProvider\` — where signing actually happens

\`SigningScheme\` defines what signatures *look like*. \`SigningProvider\` defines who *makes* them. The two are different traits; the split is intentional.

\`OpenHlSigningProvider\` at \`crates/consensus/src/signing_provider.rs:18@0844d58\`:

\`\`\`rust
pub struct OpenHlSigningProvider {
    private_key: PrivateKey,
}
\`\`\`

One field. Holds the validator's private key.

\`\`\`rust
impl SigningProvider<OpenHlContext> for OpenHlSigningProvider {
    fn sign_vote(&self, vote: OpenHlVote) -> SignedMessage<OpenHlContext, OpenHlVote> {
        sign_vote_with(vote, &self.private_key)
    }
    fn verify_signed_vote(&self, vote: &OpenHlVote,
                          signature: &Signature, public_key: &PublicKey) -> bool {
        public_key.verify(&vote_signing_bytes(vote), signature).is_ok()
    }
    // ... sign/verify pairs for proposal, proposal_part, vote_extension
}
\`\`\`

Eight methods total — sign/verify pairs for the four signable message types (vote, proposal, proposal_part, vote_extension). The signing functions delegate to \`crates/consensus/src/signing.rs\`'s canonical-encoding helpers; verification is direct \`public_key.verify(...)\`.

**Why a separate \`SigningProvider\` trait, rather than a method on \`OpenHlContext\`?** Because \`Context\` is purely *type-level* (it picks types, but holds no state); \`SigningProvider\` holds the private key — runtime state. Putting the private key on \`Context\` would mean every Context instance has a key, which is wrong (only validators have keys; observers don't).

> 🛑 **Anti-fluency.** "The Context trait is where validators are configured." **No.** The Context picks types; the SigningProvider holds the key; the validator set carries identities. **Three separate concerns, three separate traits.** Mixing them gives you a single godclass that's hard to test and impossible to swap.

## 8. The forty-line claim, validated

L4's hook claimed "forty lines of trait impls and your chain has an identity." Let's add up:

| File | Lines | What it impls |
| :--- | :--- | :--- |
| \`address.rs\` | 19 | \`Address\` + \`Display\` |
| \`height.rs\` | ~20 | \`Height\` + \`Display\` |
| \`value.rs\` | ~15 | \`Value\` |
| \`validator.rs\` | 73 | \`Validator\` + \`ValidatorSet\` + constructor |
| \`proposal.rs\` | ~35 | \`Proposal\` (six accessors) |
| \`vote.rs\` | 54 | \`Vote\` (nine accessors) |
| \`proposal_part.rs\` | ~10 | \`ProposalPart\` (unit struct) |
| \`context.rs\` | ~90 | \`Context\` (10 type defs + 4 method bodies) |

About 230 LOC of types + 90 LOC of Context impl = ~320 LOC for the entire Module 2 deliverable. The "forty lines" claim was about trait impls specifically (not the structs they wrap); the broader codebase comes in around 8× that.

But the load-bearing decision count is small: **two design choices that propagate everywhere.**

1. **The CometBFT sort convention** (\`voting_power desc, address asc\`) — forces every validator-set construction to agree on order
2. **The 20-byte Ethereum address format** — fixed at chain genesis; everything downstream assumes it

Change either and the whole consensus implementation has to be reviewed. The other 318 lines are mechanical type definitions following established Rust conventions.

## 9. Practice

1. **Trace the bounds, no peeking.** For each of the ten Context associated types, list the trait bounds Malachite requires (use the §1 table after you've sketched). Compare to your prediction.
2. **The Solana-address experiment.** Suppose \`OpenHlAddress\` was \`[u8; 32]\` instead of \`[u8; 20]\`. Which files at \`crates/consensus/src/\` (at SHA \`0844d58\`) would compile-error? (Hint: only one if you're disciplined — \`address.rs\` itself. The propagation should be invisible to other files.)
3. **The signing-scheme swap.** Sketch the diff to switch \`type SigningScheme = Ed25519\` to a hypothetical \`Bls12_381\` impl. Which lines change? Which lines stay? (Hint: more lines stay than change.)
4. **The validator-set sort-order leak.** Read \`OpenHlContext::select_proposer\` at \`crates/consensus/src/context.rs:32@0844d58\`. **What goes wrong if two validators sort their validator sets differently?** Sketch the chain divergence scenario.

> **Final check.** In one sentence, why are \`Context\`, \`SigningProvider\`, and \`ValidatorSet\` separate traits (not collapsed into one giant trait)? If your answer doesn't include "type-level vs runtime-state vs identity-set are three different concerns," re-read §7.`,
                },
                {
                  title: "The actor model behind malachitebft-engine",
                  slug: "openhl-malachite-engine-en",
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 15,
                  xpReward: 40,
                  content: `# The actor model behind \`malachitebft-engine\`

L3 said Malachite is "the abstract Tendermint algorithm with the I/O ripped out." This lesson is about what *adds* the I/O back. **Consensus is a state machine that ignores time; the engine is what gives it a clock.**

Malachite's protocol logic lives in a synchronous \`Driver\` struct — pure state machine, no timers, no network, no threads. The \`malachitebft-engine\` crate wraps it in an actor system (via \`ractor\`) that provides the runtime context — timeouts, network sockets, WAL writes, mempool access — that real consensus needs.

L4's types tell Malachite *what* your chain is. This lesson is about *how* Malachite turns those types into a running node.

> 🛑 **Predict before scrolling.** A consensus protocol needs to schedule timeouts (round-change, propose), receive network messages, write to a WAL, and notify the application of decisions. Sketch a tokio-based architecture for these. We'll compare to what Malachite actually does in §2.

## 1. Why an actor framework

The temptation: just use \`tokio::spawn\` and channels. Why does Malachite use ractor?

Three reasons:

| Need | tokio | ractor |
| :--- | :--- | :--- |
| Spawn a long-running concurrent task | \`tokio::spawn(future)\` | \`Actor::spawn(name, args)\` |
| Send a message to a specific task | \`tx.send(msg)\` (you wire the channel) | \`actor_ref.cast(msg)\` (built in) |
| Reply to a sender (request/response) | wrap in \`oneshot::channel\` | \`actor_ref.call(msg)\` (built in) |
| Restart a crashed task | DIY (catch_unwind, respawn) | supervision (built in) |
| Pause/resume an actor | DIY | \`actor_ref.stop()\` / \`start()\` |
| Pre-stop hooks (clean shutdown) | DIY | trait method \`pre_stop\` |

You can build all of these on tokio — but the abstractions you'd end up writing are exactly ractor. **For a complex multi-actor system (Consensus, Network, Wal, Sync, Host all coordinating), the boilerplate adds up.** Malachite chose ractor; openhl inherits the choice.

> 🛑 **Anti-fluency.** "ractor is just an indirection over \`tokio::spawn\`." Mostly wrong. ractor provides supervision, message ordering guarantees, and named actor lookup that you'd otherwise hand-roll. **For a 5-actor system it's load-bearing infrastructure, not syntactic sugar.**

## 2. The actor topology

When \`OpenHlNode::start()\` calls \`start_engine\` (Stage 6c → 6d in openhl), the engine spawns five actors:

| Actor | Lives in | Owns |
| :--- | :--- | :--- |
| **Consensus** | \`malachitebft-engine::consensus\` | The \`Driver\` (state machine), proposer-timeout timer, vote tallying |
| **Network** | \`malachitebft-engine::network\` | libp2p socket, gossipsub topic subscriptions, peer discovery |
| **Wal** | \`malachitebft-engine::wal\` | Append-only log of consensus messages on disk (\`get_home_dir()/wal\`) |
| **Host** (connector) | \`malachitebft-app-channel::connector\` | The bridge between the engine and **your** app loop (sends \`AppMsg\` events) |
| **Sync** | \`malachitebft-engine::sync\` | Peer catch-up — fetches missing blocks when behind |

Plus our own runtime concern:

| Component | Lives in | Owns |
| :--- | :--- | :--- |
| **\`run_engine_app\` loop** | \`crates/consensus/src/engine_app.rs:29@0844d58\` | Receives \`AppMsg\`, calls \`ConsensusBridge\` methods, replies |

This isn't an actor — it's an async task we spawn ourselves. But it's the application-side counterpart to the Host actor: the engine asks us questions via \`AppMsg\`, our loop answers via \`oneshot::Reply\` channels.

## 3. The \`AppMsg\` channel — what flows in, what flows out

The \`Channels<Ctx>\` struct from app-channel:

\`\`\`rust
pub struct Channels<Ctx: Context> {
    pub consensus: mpsc::Receiver<AppMsg<Ctx>>,    // engine → us
    pub network: mpsc::Sender<NetworkMsg<Ctx>>,    // us → network actor
    pub events: TxEvent<Ctx>,                      // for observers to subscribe
}
\`\`\`

Three channels:

1. **\`consensus\`** — the engine asks us things. \`AppMsg::GetValue\`, \`AppMsg::Decided\`, all the rest (we walked them in L11 / L13).
2. **\`network\`** — we tell the network actor things. The two main uses are \`PublishProposalPart\` (for streaming proposals; openhl doesn't use this) and \`BroadcastConsensusMsg\` (for forwarding our votes).
3. **\`events\`** — read-only stream of events for outside observers (metrics, logs, downstream consumers).

Our \`run_engine_app\` only consumes from \`consensus\`. It never publishes to \`network\` — Malachite handles vote broadcast internally via the Consensus actor. **The network channel is for chains that need application-level network injection** (e.g., DA layers that send commitments alongside consensus); openhl doesn't.

## 4. The Consensus actor's role

The Consensus actor at \`malachitebft-engine::consensus::Consensus\` is where Malachite's protocol Driver actually runs. Its job:

1. Receive consensus messages from the Network actor (peer proposals, peer votes)
2. Feed them as \`Driver::Input\` to the protocol state machine
3. Process \`Driver::Output\` — schedule timeouts, broadcast votes via Network, notify Host of \`Decide\`
4. Manage round transitions, timeouts, view changes

We never see this code in openhl. **Our code can't directly invoke the Driver** — that's intentional. The Driver is shielded behind the actor; the only way to send it input is to send the Consensus actor a message, and the only way to read its output is to receive an \`AppMsg\` from the Host connector. **Our \`run_engine_app\` loop is the application side of that conversation.**

Compare to \`run_single_validator\` at \`crates/consensus/src/runner.rs:34@0844d58\`, which uses the Driver directly without an actor wrapper. That was Stage 5 (pedagogical); Stage 6 wrapped it in actors. **Both produce the same chain behavior**; the actor version is the production-shape one.

## 5. Network + WAL actors

The Network actor wraps libp2p:

- Manages the gossipsub topic for consensus messages
- Encodes outgoing votes/proposals via the \`ConsensusCodec\` (Stage 6b → currently stub impls; see the openhl \`crates/consensus/src/codec.rs\` source for the stub set)
- Decodes incoming messages and forwards them to Consensus
- Handles peer discovery

In single-validator mode (no peers), the Network actor still spawns — libp2p starts listening on \`/ip4/127.0.0.1/tcp/0\` — but receives no inbound messages and broadcasts to nobody. **It's a no-op in single-validator mode**, which is how \`OpenHlCodec\`'s gossip stubs (Stage 6b) get away with returning errors: nothing is actually encoding them.

The WAL actor writes consensus messages to disk for crash recovery:

- Every \`Vote\` and \`Proposal\` we sign gets persisted before it's broadcast
- Every \`Decided\` value gets persisted before the bridge commits
- On restart, the WAL is replayed before the engine resumes consensus

In single-validator mode the WAL writes happen but are never replayed (tests use tempfile home_dirs that get cleaned up). **In production, the WAL is what makes the chain durable across validator restarts.**

> 🛑 **Predict.** What happens if you restart openhl mid-round (after a vote was cast but before the round decided)?

Without WAL: when you restart, the engine has no memory of your previous votes. If a peer remembers you voted for value X and you now vote for value Y on restart, you've equivocated — a slashable offense in production BFT chains. With WAL: on restart, the engine replays your previous votes, sees that you voted for X, and refuses to vote for Y. **WAL is how single-machine consensus avoids self-equivocation across restarts.**

## 6. The one Malachite gotcha — proposal-part streaming

Malachite supports three \`ValuePayload\` modes (last seen in L4 §5):
- \`ProposalOnly\` — value fits in one \`Proposal\` message. openhl uses this.
- \`PartsOnly\` — value is streamed in chunks.
- \`ProposalAndParts\` — both.

When you use \`PartsOnly\` or \`ProposalAndParts\`, the network actor maintains a *stream* per proposer per round. The Host actor reassembles parts as they arrive, signals "complete proposal arrived" via \`AppMsg::ReceivedProposalPart\` with \`reply: Option<ProposedValue>\`. Our \`run_engine_app\` loop replies \`None\` until all parts have arrived; then \`Some(full_value)\`.

**openhl skips this entirely** (\`ProposalOnly\`), so \`AppMsg::ReceivedProposalPart\` never fires for us. But if you fork openhl for a chain with large proposals (e.g., a CLOB chain where the value carries 10MB of pending fills), you'll need to implement the stream-reassembly path.

The gotcha to watch for: **the part-streaming code lives in \`malachitebft-engine::util::streaming\`**, not in your app loop. You configure it via \`ConsensusConfig::value_payload\`; the engine handles the rest. **You don't write the streaming code; you write the value-reassembly logic.**

## 7. Practice

1. **Map the actors.** From memory, list the five actors the engine spawns. For each, name one function it owns and one channel/message it produces.
2. **Find the actor seam.** Read \`crates/consensus/src/node.rs::OpenHlNode::start@0844d58\`. Identify the line where the engine actor system is started (hint: it's a \`malachitebft_app_channel::start_engine(...)\` call). What does openhl give the engine, and what does it get back?
3. **The actor-vs-Driver comparison.** Compare \`run_single_validator\` at \`crates/consensus/src/runner.rs:34@0844d58\` (Driver directly, sync loop) to \`run_engine_app\` at \`crates/consensus/src/engine_app.rs:29@0844d58\` (AppMsg loop, async). For each \`Output<Ctx>\` variant the Driver produces, identify the equivalent AppMsg variant. Is the mapping 1:1?
4. **The single-validator no-op.** When openhl runs single-validator, the Network actor starts but never receives a message. **Why doesn't the consensus halt waiting for peer votes?** Hint: think about what the proposer's own vote contributes.

> **Final check.** In one sentence, what does the actor system give you that calling \`Driver::process\` directly (as \`run_single_validator\` does) doesn't? If your answer doesn't include "timers, network, persistence, supervision," re-read §1 + §2.`,
                },
              ],
            },
          },
          {
            title: "Reth as a library",
            sortOrder: 2,
            lessons: {
              create: [
                {
                  title: "Reth without the geth-shape — NodeBuilder and components",
                  slug: "openhl-reth-nodebuilder-en",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 15,
                  xpReward: 40,
                  content: `# Reth without the geth-shape — NodeBuilder and components

**You don't fork Reth. You configure it.** Most teams approaching Reth for the first time reach for \`git clone paradigmxyz/reth\`, edit \`bin/reth/src/main.rs\`, and immediately accrue technical debt — every upstream bump becomes a merge conflict.

The correct path is \`reth-node-builder::NodeBuilder\`. It's a fluent API that lets you swap out components (consensus engine, payload builder, block validator) while keeping everything else (DB, mempool, RPC, network) at Reth's default. The result: openhl's \`LiveRethEvmBridge\` runs against a real Reth node *without* maintaining a fork.

This lesson is about the seam between "what you replace" and "what you keep." By the end you'll know which 5% of Reth needs custom code for a typical L1 chain, and why the other 95% should stay at upstream defaults.

> 🛑 **Predict before scrolling.** You're building an L1 with custom consensus (Malachite/HotStuff-style) but vanilla EVM execution. Of Reth's ~30 components (DB, mempool, payload builder, network, RPC, transaction pool, validator set provider, etc.), **which need replacing and which can stay default?** Sketch your list before reading §3.

## 1. The fork-Reth temptation

The path of least apparent resistance:

\`\`\`bash
git clone https://github.com/paradigmxyz/reth
cd reth
# edit bin/reth/src/main.rs to plug in your consensus
# edit crates/payload/builder/... to change payload semantics
# ... eventually realize you have 200 lines of patches across 40 files
\`\`\`

Three months later, Reth releases v2.3.0. You try to rebase your patches. Half of them are over files that were refactored. The merge takes a week. **You've forked**, and now you maintain that fork forever.

The \`NodeBuilder\` pattern exists precisely to avoid this. Reth's authors are aware that downstream chains want to swap consensus and payload assembly. The trait-based component architecture is the supported answer.

> 🛑 **Anti-fluency.** "We need to fork Reth because our chain is too custom for the trait surface." **Almost always wrong.** If your customization is "different consensus" or "different payload selection" or "different block validation rules", the traits are designed for it. Fork only if you need to change the *storage engine* (MDBX → something else) or the *EVM itself* (custom opcodes) — both of which are extremely rare.

## 2. \`NodeBuilder\`'s component traits

Reth's \`NodeBuilder\` exposes a fluent API where you declare which type implements each component. The default \`EthereumNode\` configuration plugs in Reth's own implementations for everything; you swap individual slots by providing your own types.

The component traits, grouped by what they do:

| Component category | What it does | Replace for openhl? |
| :--- | :--- | :--- |
| **DB** (\`Database\`) | MDBX-backed storage | **No** — keep Reth's |
| **Provider** (\`BlockchainProvider\`) | Read API over the DB | **No** — keep Reth's |
| **Network** (\`NetworkHandle\`) | devp2p / discv5 / RLPx | **Likely no** — keep for compat, may disable peer discovery in single-CL deployments |
| **Pool** (\`TransactionPool\`) | Mempool | **No** — keep Reth's |
| **EVM** (\`ConfigureEvm\`) | EVM config, precompiles, hardforks | **Maybe** — replace for custom precompiles (Module 3 of openhl) |
| **Consensus** (\`Consensus\`) | Block-level validation rules (PoW/PoS gadgets) | **Yes** — we use Malachite, not Reth's gadget |
| **PayloadBuilder** | Assembles blocks from mempool | **Maybe** — keep default for v0; replace when CLOB needs custom ordering |
| **EngineApi** | The CL ↔ EL conversation surface | **Different transport** — openhl uses in-process trait, not JSON-RPC |
| **RPC** (\`RpcEthApi\`) | eth_* JSON-RPC methods | **No** — keep for compat |

The "no" rows are roughly 80% of Reth's code. The "yes" / "maybe" rows are the customization surface for a typical BFT L1.

## 3. What you keep — five components Reth gets right

Reth's MDBX-backed storage, BlockchainProvider, mempool, networking stack, and RPC server are mature, well-tested, and downstream-compatible (a wallet that talks to mainnet Reth talks to openhl's RPC unchanged). **Replacing any of them is a multi-month project with no upside.**

Specifically:

- **MDBX**: faster than LMDB, battle-tested by Erigon and Reth; replacing it means rewriting the storage engine
- **BlockchainProvider**: the read API every other component depends on; replacing it cascades through ~10 trait impls
- **TransactionPool**: the mempool with EIP-1559 ordering, replacement rules, blob-tx support; ~30k LOC of edge cases you'd reproduce
- **Network**: devp2p compatibility means your node can sync from existing peers; lose this and you can't bootstrap from Ethereum infrastructure
- **RPC**: every wallet, indexer, and explorer expects \`eth_getBlockByNumber\`, \`eth_call\`, etc.; reimplementing means everyone in the ecosystem has to special-case your chain

Keep all five. Save your engineering budget for the components you actually need to change.

## 4. What you replace — three components openhl customizes

| Component | Why replace | Where in openhl |
| :--- | :--- | :--- |
| **Consensus** (the \`Consensus\` trait) | Reth's default uses Ethereum's PoW/PoS gadget; we use Malachite | Implicit — we don't engage Reth's \`Consensus\` trait; Malachite drives the chain externally |
| **EngineApi transport** | Reth defaults to JSON-RPC; we use in-process Rust traits | \`ConsensusBridge\` (L1/L7/L9) replaces the JSON-RPC engine API for openhl |
| **PayloadBuilder** | Module 2's CLOB will need custom transaction ordering | Not yet replaced at v0 — see L8 for what changes |

Notice what's NOT replaced: the EVM, the storage engine, the mempool, the RPC. **openhl is 90% stock Reth**, with consensus and the engine transport swapped out. That's the right ratio for a custom-consensus chain on stock EVM semantics.

## 5. The dev-node example from our codebase

Look at \`crates/evm/src/reth_node.rs:74@0844d58\` — our Stage 7a smoke test:

\`\`\`rust
async fn launch_and_check() -> Result<()> {
    let runtime = Runtime::test();
    let chain_spec = dev_chain_spec();
    let expected_chain_id = chain_spec.chain.id();

    let node_config = NodeConfig::test().dev().with_chain(chain_spec);

    let NodeHandle {
        node,
        node_exit_future: _,
    } = NodeBuilder::new(node_config)
        .testing_node(runtime)
        .node(EthereumNode::default())
        .launch_with_debug_capabilities()
        .await?;

    let observed_chain_id = node.chain_spec().chain.id();
    assert_eq!(observed_chain_id, expected_chain_id);
    Ok(())
}
\`\`\`

Read it line by line:

1. **\`Runtime::test()\`** — a lightweight tokio runtime for tests (real deployments use the long-running tokio runtime)
2. **\`dev_chain_spec()\`** — chain ID 2600, dev genesis (we walked this in L12)
3. **\`NodeConfig::test().dev().with_chain(chain_spec)\`** — Reth's "dev mode" presets + our chain spec. \`dev()\` disables peer discovery and enables some debugging conveniences; not what production uses.
4. **\`NodeBuilder::new(node_config).testing_node(runtime).node(EthereumNode::default())\`** — the heart of the API. **We're using \`EthereumNode::default()\`** — Reth's stock configuration with all components at defaults. To customize, we'd swap \`.node(EthereumNode::default())\` with \`.node(OpenHlEthereumNode::new())\` or similar.
5. **\`.launch_with_debug_capabilities().await?\`** — spawns all the actors, starts listening, opens the DB.
6. **\`node.chain_spec().chain.id()\`** — sanity-check the node's view of the chain matches what we configured.

**This is the whole pattern.** ~10 lines of glue. The complexity is in Reth's \`NodeBuilder\` internals, not in our code. **A production openhl node would be ~50 lines** — this plus configuring listen ports, data directories, validator keypairs.

## 6. Why this matters for openhl long-term

The NodeBuilder pattern future-proofs openhl against three things:

1. **Reth version bumps** — when Reth releases v2.3.0, we change one SHA in \`workspace.dependencies\` and run \`cargo update\`. The trait surface is stable across minor versions; we don't have to merge patches.
2. **Custom precompiles** (Module 3 of openhl) — when we add CLOB-reading precompiles, we replace the \`ConfigureEvm\` slot. The rest of Reth stays default.
3. **Custom payload builders** (Module 2 of openhl) — when the CLOB needs custom transaction ordering, we replace the \`PayloadBuilder\` slot. The mempool, EVM execution, state computation stay default.

**Each customization is a slot, not a fork.** That's the value of the NodeBuilder design.

## 7. Practice

1. **Identify the slots.** From the §2 table, name the 9 component categories and whether openhl replaces each. Without looking, write down which 4 we'd ever consider replacing in subsequent modules of the course.
2. **Find the fork temptation.** Search openhl's repo for any code that imports a Reth crate path *deeper* than \`reth-*-builder::*\`, \`reth-storage-api\`, \`reth-consensus\`, \`reth-chainspec\`, or alloy. **Any deeper imports are signs of "we needed something the trait surface didn't expose."** What does that suggest about our customization?
3. **The custom-EVM experiment.** Suppose openhl wanted custom EVM opcodes (a real Module 3 territory). Sketch the diff to \`crates/evm/src/reth_node.rs\`: which \`EthereumNode\` slot would you replace, and what trait would your custom type implement?

> **Final check.** In one sentence, why is \`NodeBuilder::new(config).node(EthereumNode::default())\` a better pattern than \`git clone reth && edit main.rs\`? If your answer doesn't include "upstream-trackable" or "swap components without forking the whole codebase," re-read §1.`,
                },
                {
                  title: "The Engine API — what forkchoice_updated and new_payload actually do",
                  slug: "openhl-engine-api-en",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 15,
                  xpReward: 40,
                  content: `# The Engine API — what \`forkchoice_updated\` and \`new_payload\` actually do

It's 3am. Two services on the same machine — a Reth process and a Lighthouse process — are exchanging exactly **two RPC methods**. That's the whole conversation between Ethereum's consensus layer and execution layer. Once you've named those two methods, traced them through openhl's actual code, and watched a real validator force them to be implemented honestly, you'll understand why a chain like HL or Tempo can offer sub-second finality where Ethereum offers 12 seconds.

> 🛑 **Predict before scrolling.** Two methods, three forkchoice pointers (head/safe/finalized), one payload-build hint, one validation result. Sketch on paper what each method carries in and returns out. We'll trace your sketch against the real spec, and against \`crates/evm/src/live_node.rs:68@0844d58\`.

## 1. The conversation, named

The Ethereum Engine API — used everywhere CL talks to EL — has three calls in active use:

- \`engine_forkchoiceUpdatedV3\` — "here is the new head/safe/finalized state. Optionally, build a payload from this head."
- \`engine_getPayloadV3\` — "the payload you started building earlier — give it to me."
- \`engine_newPayloadV3\` — "execute this block and tell me if it's valid."

Three calls, but conceptually two operations: \`forkchoiceUpdated\` + \`getPayload\` together form one operation (build a block). Hence the "two methods" framing.

Notice what's NOT in there. There is **no** "send me the next decision" call. The CL never asks the EL "what should we decide?" The decision is made on the CL side; the EL is told what was decided.

## 2. \`forkchoice_updated\` — two purposes in one method

\`\`\`
forkchoiceUpdated(ForkchoiceState, Option<PayloadAttributes>) → ForkchoiceUpdatedResponse
\`\`\`

\`ForkchoiceState\`:
- \`headBlockHash\` — what the EL should consider the canonical head
- \`safeBlockHash\` — what's reasonably finalized (justified, in PoS terms)
- \`finalizedBlockHash\` — what's irreversibly finalized

\`PayloadAttributes\`:
- \`timestamp\`, \`prevRandao\`, \`suggestedFeeRecipient\`, plus optional fields

What it does:
- **Always**: updates the EL's view of head/safe/finalized.
- **If attrs is Some**: also starts a payload-build job and returns a \`PayloadId\` to fetch the result later.

> 🛑 **Predict.** Why does \`forkchoice_updated\` take an optional payload-attribute argument? Why not have a separate \`start_build_payload\` call? Hint: count the round-trips between CL and EL for the proposer's hot path.

The answer: **amortization**. The proposer's most latency-sensitive moment is the start of their slot. If "advance fork-choice" and "start building" are two separate calls, you pay two RTTs. By bundling them, you pay one. For a CL like HyperBFT shooting for sub-second slots, that's the difference between viable and not.

## 3. \`new_payload\` — "execute this and tell me if it's valid"

\`\`\`
newPayload(ExecutionPayload) → PayloadStatus
\`\`\`

When a CL receives a peer's proposal, it asks the EL to validate it before voting. The EL:
- Re-executes the transactions
- Computes the resulting state root
- Compares to the proposed state root
- Returns \`Valid\` if they match, \`Invalid\` if not, \`Syncing\` if the EL is behind

> 🛑 **Anti-fluency.** "The CL validates the block." **Wrong.** The CL validates the *consensus rules* — signatures, fork-choice, justification. The EL validates *the block contents* — execution, state, receipts. Confuse the two and you'll wire validation in the wrong place.

## 4. The async asymmetry — \`getPayload\`

\`forkchoice_updated(parent, Some(attrs))\` returns immediately with a \`PayloadId\`. The block isn't built yet — the EL has started a background job, pulling transactions from its mempool and computing state.

When the CL needs the block (its propose deadline arrives), it calls \`getPayload(id)\` to retrieve it.

Why decouple? **Build during voting.** The previous block is still being voted on. The EL can start building the next one before the previous one is finalized. By the time it's the CL's turn to propose, the new block is already assembled.

| When | Operation | Latency budget |
| :--- | :--- | :--- |
| Previous round in progress | EL building next payload in background | 100–400ms |
| Our slot starts | CL calls \`getPayload(id)\` | < 5ms |
| Got payload | CL gossips proposal | network-bound |

Without the async split, propose would have to wait for build. That single design choice is why fast L1s are possible.

## 5. openhl: in-process, named differently, same shape

openhl runs CL and EL in one binary. So our "Engine API" is a Rust trait surface, not JSON-RPC. But the *shape* is identical.

The \`ConsensusBridge\` trait at \`crates/consensus/src/bridge.rs:11@0844d58\` is the openhl Engine API:

\`\`\`rust
async fn build_payload(&self, parent: BlockHash, attrs: PayloadAttrs)
    -> Result<PayloadId, BridgeError>;
async fn payload_ready(&self, id: PayloadId)
    -> Result<ExecutedBlock, BridgeError>;
async fn validate_payload(&self, block: &ExecutedBlock)
    -> Result<PayloadStatus, BridgeError>;
async fn commit(&self, block_hash: BlockHash)
    -> Result<(), BridgeError>;
\`\`\`

Map each onto Ethereum:

| openhl | Ethereum equivalent |
| :--- | :--- |
| \`build_payload(parent, attrs)\` | \`forkchoiceUpdated(state{head=parent}, Some(attrs))\` returning \`PayloadId\` |
| \`payload_ready(id)\` | \`getPayload(id)\` |
| \`validate_payload(block)\` | \`newPayload(block)\` |
| \`commit(block_hash)\` | \`forkchoiceUpdated(state{head=hash, finalized=hash}, None)\` |

Same four messages, different names. The semantic mapping is **exact**.

What we save by going in-process:
- No JSON-RPC encoding overhead (~1–5ms per call)
- No HTTP/TCP round-trip
- No serialization of typed Rust values into JSON-of-hex-strings
- Strong typing at the boundary — the compiler catches mismatches

What we give up:
- Client diversity (Ethereum can mix-and-match CLs/ELs; we can't)
- A network-debuggable transport (JSON-RPC is human-readable)

For openhl's design point (single-team L1, sub-second finality), the trade is obviously right. **And if we ever want client diversity, the trait is small enough to expose over JSON-RPC later — the contract already exists.**

## 6. The validator forces honesty

The most pedagogically valuable moment in openhl's history was when we wired \`validate_payload\` to Reth's real \`EthBeaconConsensus::validate_header_against_parent\` at \`crates/evm/src/live_node.rs:139@0844d58\`.

The test went red. Reth's validator immediately rejected our previously-fine \`build_payload\` output because:
- We had \`gas_limit: 0\` (default Header value)
- We had \`base_fee_per_gas: None\` (default)
- We hadn't even bothered with \`difficulty: 0\` for post-merge

Reth's validator caught all of it. The fix wasn't to weaken the validator — it was to make \`build_payload\` produce a real production-shape header:

\`\`\`rust
let next_base_fee = self
    .chain_spec
    .next_block_base_fee(parent_header, our_timestamp);

let header = Header {
    parent_hash: parent_b256,
    number: parent_header.number + 1,
    timestamp: our_timestamp,
    gas_limit: parent_header.gas_limit,        // no drift
    difficulty: U256::ZERO,                    // post-merge
    base_fee_per_gas: next_base_fee,           // EIP-1559 math
    ..Default::default()
};
\`\`\`

The base-fee calculation calls the same helper (\`ChainSpec::next_block_base_fee\`) that Reth's validator uses to *verify* the base-fee. By construction, they agree — not by coincidence.

> 🛑 **Anti-fluency.** "I'll implement \`validate_payload\` later." **Wrong order.** Validation comes first, because real validation is what forces real construction. If you implement \`build_payload\` against a permissive validator (or no validator), you'll ship a header that looks fine and fails three layers down when a real node tries to validate it.

This is the L7 lesson made concrete: the Engine API isn't a passive shape. It's an **active discipline**. Reth's validator IS the spec; everything upstream has to play by its rules.

## 7. Practice

1. **Map the methods.** Without looking, write down the four openhl \`ConsensusBridge\` methods and their Ethereum Engine API equivalents.
2. **Find the build-while-voting moment.** In \`crates/consensus/src/engine_app.rs\`, find the \`AppMsg::GetValue\` arm. What's the equivalent Ethereum sequence? (Cheat sheet: a CL \`engine_forkchoiceUpdated(state, Some(attrs))\` followed by a \`getPayload\`.)
3. **Validator-forcing.** Read \`LiveRethEvmBridge::build_payload\` at \`crates/evm/src/live_node.rs:68@0844d58\`. Identify which fields are set non-trivially (not from \`Default\`). For each, name which \`EthBeaconConsensus\` sub-check would have failed if you'd left it at default.

> **Final check.** In one sentence, why does openhl need TWO functions (\`build_payload\` + \`payload_ready\`) where you might naively expect one? If your answer doesn't include "build-during-voting parallelism" or "the proposer's hot-path latency," re-read §4.`,
                },
                {
                  title: "Where a block comes from — payload building inside Reth",
                  slug: "openhl-payload-building-en",
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 15,
                  xpReward: 40,
                  content: `# Where a block comes from — payload building inside Reth

Between \`forkchoice_updated(parent, attrs)\` (L7's request) and \`getPayload(id)\` (L7's fetch), **Reth assembles a block**. Knowing what happens in that interval — and where the openhl-specific seam goes — is the difference between a chain that ships and one that mysteriously stalls.

This lesson walks Reth's \`PayloadBuilderService\` (the production-shape payload assembly that L11's "async trick" section forward-referenced), names what openhl currently does instead (synthesize an empty header), and previews where Module 2's CLOB plugs in.

> 🛑 **Predict before scrolling.** From the moment a CL says "build me a payload" to the moment the EL says "here's a block with state root X," name every operation Reth runs. Hint: there are at least four, and one of them dominates the others in latency.

## 1. The lifecycle, from request to block

The Engine API call from L7:

\`\`\`
forkchoiceUpdated(state{head=parent}, Some(attrs)) → PayloadId
                                                       │
                                                       ▼ (later)
                          getPayload(id) → ExecutionPayload
\`\`\`

Between \`forkchoiceUpdated\` (returns \`PayloadId\` instantly) and \`getPayload\` (fetches the assembled block), Reth's \`PayloadBuilderService\` runs the following pipeline:

| Step | Owner | What runs |
| :--- | :--- | :--- |
| 1 | PayloadBuilderService | Receive build-job request; allocate \`PayloadId\` |
| 2 | \`EthereumPayloadBuilder\` | Pull transactions from the mempool (\`TransactionPool\`) |
| 3 | \`EthereumPayloadBuilder\` | Apply ordering policy (priority fee, EIP-1559, nonce) |
| 4 | \`EthEvm\` (BlockExecutor) | Execute transactions against parent state; track gas |
| 5 | \`EthEvm\` | Compute state root via Merkle Patricia Trie |
| 6 | \`EthereumPayloadBuilder\` | Assemble Header (with state_root, receipts_root, etc.) |
| 7 | PayloadBuilderService | Cache result, signal \`PayloadId\` is ready |

Steps 2–5 dominate the wall clock. **Step 4 (real EVM execution) typically takes 50–300ms** for a full block; step 5 (state root) adds 50–150ms more.

\`EthereumPayloadBuilder\` lives at \`reth_ethereum::node::EthereumPayloadBuilder\` (from \`reth-ethereum-payload-builder\` at the Reth v2.2.0 source). It implements the \`PayloadBuilder\` trait from \`reth-payload-builder\`. **Every step above is in Reth's code, not ours.**

## 2. Transaction selection — \`Pool::best_transactions\`

The \`TransactionPool\` trait (at \`reth-transaction-pool::TransactionPool\`) exposes a \`best_transactions()\` method that yields txs in priority order. The default ordering policy:

1. **EIP-1559 effective tip first** — \`min(max_priority_fee, max_fee - base_fee)\` descending
2. **Nonce-ordered within a sender** — can't include nonce 5 before nonce 4 for the same address
3. **Replacement rules** — newer tx with higher fee replaces older tx with same nonce

The pool excludes:
- Txs whose gas would exceed \`block_gas_limit\`
- Txs whose sender has insufficient balance after prior txs in the block
- Txs that would revert (in some pool configurations — most use "include and let it revert" semantics)

**The pool is mempool-aware.** It knows about txns broadcast by peers but not yet included; it knows about local txns submitted via RPC; it tracks them all in a priority queue.

> 🛑 **Anti-fluency.** "Payload building is just executing transactions in order." **No.** *Selecting* which transactions to include — and in what order — is half the work. The ordering policy determines fee revenue, transaction fairness, and (importantly) MEV opportunities. **Changing the ordering policy is one of the most consequential customizations a chain can make.**

## 3. State root computation — where execution becomes a number

After step 4 (transactions executed), the EVM has a state diff: accounts modified, storage slots touched, balances updated. Step 5 condenses this into a single 32-byte \`state_root\` hash:

1. Apply all state changes to the parent's state trie (Merkle Patricia Trie)
2. Recompute the trie root
3. The result is \`state_root\` — the canonical commitment to post-block state

This is the **expensive bit**. A full mainnet block touching ~1000 accounts can take 100ms+ to compute the new trie root, depending on how cached the parent state is.

The state root is what \`validate_header_against_parent\` doesn't check (it can't — it doesn't execute), but \`validate_block_post_execution\` does. **Two validators that compute different state roots for the same block have a determinism bug** (L2 §2 territory). This is why state-root-mismatch is the headline failure mode for chain forks.

Reth's trie computation is highly optimized — it parallelizes hash computation across cores when the state diff is large enough. **One of the reasons not to fork Reth** (L6 §3) is that you'd reproduce all of this for diminishing returns.

## 4. What openhl currently does (vs production-shape)

Now compare to openhl's \`LiveRethEvmBridge::build_payload\` at \`crates/evm/src/live_node.rs:68@0844d58\`:

\`\`\`rust
let parent_sealed = self.provider.sealed_header_by_hash(parent_b256)?
    .ok_or_else(|| BridgeError::Rejected(...))?;
let parent_header = parent_sealed.header();

let next_base_fee = self.chain_spec.next_block_base_fee(parent_header, our_timestamp);

let header = Header {
    parent_hash: parent_b256,
    number: parent_header.number + 1,
    timestamp: our_timestamp,
    gas_limit: parent_header.gas_limit,
    difficulty: U256::ZERO,
    base_fee_per_gas: next_base_fee,
    ..Default::default()
};
let hash = header.hash_slow();
\`\`\`

Compare to §1's seven-step pipeline:

| Step | Production Reth | openhl at \`0844d58\` |
| :--- | :--- | :--- |
| 1. Allocate PayloadId | PayloadBuilderService | In-memory counter (\`pending\` HashMap) |
| 2. Pull transactions | \`Pool::best_transactions\` | **Skipped** — no transactions yet |
| 3. Apply ordering | EIP-1559 priority fee math | **Skipped** |
| 4. Execute via EVM | EthEvm + receipts | **Skipped** — empty body |
| 5. Compute state root | Merkle Patricia Trie | **Skipped** — state_root = parent_header.state_root (implicit) |
| 6. Assemble Header | \`EthereumPayloadBuilder\` | Done — but with mostly default fields |
| 7. Cache result | PayloadBuilderService | In-memory HashMap |

**Five of seven steps are skipped.** That's because openhl at SHA \`0844d58\` doesn't yet produce real transactions — the CLOB (Module 2 of openhl) is the source of those. Until that module ships, the bridge synthesizes empty headers that pass header-level validation (L7 §6 — the validator-forcing-honesty moment) but contain no actual transactions.

The seven-step pipeline matters because **swapping in the production-shape PayloadBuilder is the first stage of Module 2.** When the CLOB starts producing fills, those become transactions, and the bridge starts using the real builder.

## 5. Where openhl will plug in — preview of Module 2

The L8 forward reference to Module 2:

> *"Where OpenHL will later inject CLOB-fill transactions"*

The plan for openhl's CLOB integration:

1. **CLOB engine** (\`crates/clob/src/\`) produces matched fills as the chain runs
2. **Each fill becomes a transaction** — a transfer between buyer and seller accounts via the EVM
3. **The transaction pool** receives these fills alongside any user-submitted txns
4. **A custom \`PayloadBuilder\`** (replacing the EthereumPayloadBuilder slot from L6 §4) prioritizes CLOB fills over user txns in the payload-assembly order
5. **The standard Reth state computation runs** — the new state root reflects both user txs and CLOB fills

This is where openhl becomes a *perp DEX* rather than a *generic EVM*. The mechanical part — replacing one Reth component — is small (L6's NodeBuilder pattern in action). The interesting part is the CLOB matching logic itself, which is Module 2 of the rethlab course.

**L8 is a bridge between modules.** It tells the learner: "you've mastered the consensus substrate; the EVM payload pipeline is what Module 2 plugs into."

## 6. The async-trick from L11, made concrete

L11 §5 introduced an "async trick we're not using yet":

> "Kick off \`build_payload(...)\` at round-decided time so the EL has the whole previous round's voting window to assemble the block."

Now you can see what's being amortized. The expensive operations in §1's table (steps 2–5: pull, order, execute, state root) take 100–400ms cumulatively for a full mainnet-shape block. If those run **during** the previous round's voting (which always takes at least 200–500ms for vote propagation), the propose hot path drops to "fetch the cached payload" — microseconds, not hundreds of milliseconds.

This is **the** performance optimization that lets HL, Tempo, and openhl run sub-second slots while doing real EVM execution. **You cannot get sub-second slots without it.** Either you run an empty EVM (no real txs to execute, like openhl at \`0844d58\`) or you parallelize the execution against the voting window.

The ConsensusBridge trait's split between \`build_payload\` (start) and \`payload_ready\` (fetch) is shaped to support this. **The trait API is ahead of the implementation.** When the production-shape \`LiveRethEvmBridge\` lands, the loop in \`engine_app.rs::run_engine_app\` will move the \`build_payload\` call earlier (right after \`AppMsg::Decided\`), and \`payload_ready\` will become a constant-time fetch.

## 7. Practice

1. **The state-root question.** Two validators receive the same proposal (same Header bytes), execute it against their respective copies of parent state, and arrive at *different* state roots. What goes wrong? At which step of §1's pipeline did the divergence occur?
2. **The ordering policy.** Reth's default ordering is EIP-1559 priority fee descending. **What would change** if openhl's CLOB used a different ordering policy — say, "CLOB fills first, then user txs by priority fee"? Which lines of \`EthereumPayloadBuilder\` would need replacing? (Hint: it's the \`Pool::best_transactions\` iterator that gets reimplemented, not the executor.)
3. **The async-trick gap.** Read \`crates/consensus/src/engine_app.rs:65-82@0844d58\` (the \`AppMsg::GetValue\` arm). Sketch the diff to move the \`bridge.build_payload(...)\` call to fire at \`AppMsg::Decided\` instead. What state does the AppMsg loop need to track between these two messages?

> **Final check.** In one sentence, why is the production-shape payload-building pipeline (§1) decoupled into a separate service rather than running inline during \`engine_forkchoiceUpdated\`? If your answer doesn't include "async / build-during-voting" or "the proposer's hot path needs to fetch, not assemble," re-read §6.

---

**Congratulations** — this is the last lesson of *Building OpenHL — Consensus Substrate*. You've covered the contract (L1), the convergence (L2), Malachite as a library (L3 + L4 + L5), Reth as a library (L6 + L7 + L8), the wiring (L9 + L10 + L11), and the devnet (L12 + L13).

**Module 2 of the rethlab L1 Architect track picks up at openhl's CLOB matching engine** — where the first real transactions enter the chain, and §5's preview becomes Module 2's first lesson.`,
                },
              ],
            },
          },
          {
            title: "Wiring it up — the consensus crate",
            sortOrder: 3,
            lessons: {
              create: [
                {
                  title: "Designing the contract — the ConsensusBridge trait",
                  slug: "openhl-bridge-trait-en",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 20,
                  xpReward: 60,
                  content: `# Designing the contract — the \`ConsensusBridge\` trait

Every chain that bolts BFT onto an EVM ends up writing this trait. HyperBFT did it, Tempo did it, every CometBFT-based chain did it. The methods have different names; the shape is the same. The question is whether you write it deliberately — with the four messages from L1 explicit and the failure modes named — or whether it accretes from "whatever consensus needed when it needed it."

We're going to write it deliberately. Once.

> 🛑 **Predict before scrolling.** You've seen the four messages in L1. You've seen them mapped onto the Ethereum Engine API in L7. Now: what should the *Rust trait* look like? Specifically — async or blocking? Owned arguments or borrowed? One error type or many? Trait method signatures matter more than you think.

## 1. The trait every BFT-L1 ends up writing

Open \`crates/consensus/src/bridge.rs:11@0844d58\`. The whole thing is 40 lines:

\`\`\`rust
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
\`\`\`

That's the contract. Every other crate that participates in consensus either implements this trait (the EVM crate, with three different impls — \`InMemoryEvmBridge\`, \`RethEvmBridge\`, \`LiveRethEvmBridge\`) or holds an \`Arc<dyn ConsensusBridge>\` to call methods on it (the consensus crate's runner and engine-app loop).

The rest of this lesson is justification. Why these four methods, in these signatures, with this error type? Each choice trades off something. The point of the lesson is to make the trades visible so you can make different ones on purpose, not by accident.

## 2. Async or blocking?

Looking at the signatures: every method is \`async\`. That's not free. In Rust, \`async fn\` in traits has been a multi-year saga (the \`#[async_trait]\` macro is a workaround); async forces \`Send + Sync\` bounds throughout; calling async from sync requires a tokio handle.

The alternative would have been blocking:

\`\`\`rust
pub trait ConsensusBridge: Send + Sync {
    fn build_payload(&self, ...) -> Result<PayloadId, BridgeError>;
    // ...
}
\`\`\`

Simpler signatures. No \`#[async_trait]\`. No future-pinning issues. Why didn't we go this way?

| Consideration | Async wins | Blocking wins |
| :--- | :--- | :--- |
| Calling Reth's \`BlockchainProvider\` (which is sync) | tied — both work | tied |
| Calling Reth's \`EngineHandle::fork_choice_updated\` (async) | **must be async** | requires \`block_on\` |
| Inside Malachite's tokio runtime | no thread blocking | each call blocks a worker thread |
| The \`run_engine_app\` AppMsg loop | natural | requires spawn-blocking gymnastics |
| Test doubles (in-memory state) | trivial — just hold a \`Mutex\` | trivial |

The decision falls on the second and third rows. The real Reth backend uses async APIs (Engine API, payload builder service, network), and our consensus side runs in Malachite's tokio runtime. Going blocking means the entire AppMsg loop would be spawn-blocking on every bridge call — wasteful, error-prone, and observably slower under load.

> 🛑 **Anti-fluency.** "Async is just more flexible than blocking, you can always go async later." **No.** Going from blocking-trait to async-trait is a viral change — every caller has to switch. And every async method in a trait is constrained by \`Send + Sync + 'static\` propagating through your code. **Pick async early, accept the costs, or commit to blocking and never look back.**

## 3. Why exactly four methods (no fewer, no more)

Four methods. Not three. Not five. Why this number?

The temptation to collapse to three:

- "**\`payload_ready\` is just part of \`build_payload\`. Make \`build_payload\` return the block directly.**" Compelling — fewer methods, simpler call sites. **Wrong.** Doing so kills the build-during-voting parallelism from L7 §4. The proposer's hot path becomes "wait for build, then propose" instead of "propose what was already built." Sub-second slots fall off the table.

- "**\`validate_payload\` and \`commit\` should merge. If validation passes, just commit.**" Tempting because most call sites do both back-to-back. **Wrong.** Validators import many candidate proposals per height (one per proposer slot in a round-robin) but commit only one — the deciding value. Validation is speculative; commit is final. Merging them forces speculative state changes, which means rollback machinery, which means a much more complex EVM crate.

The temptation to expand to five:

- "**Add \`notify_view_change(round)\` so the EVM knows when a round timed out.**" Plausible — view changes are a real consensus event. **Unnecessary.** The EVM doesn't need to know about rounds; it only needs to know about decided blocks. Round changes are CL-internal state. Adding \`notify_view_change\` leaks consensus internals into execution — a contract leak (see L1 §5).

- "**Add \`restream_proposal(hash)\` so the bridge can re-broadcast a stale proposal.**" Plausible — Malachite's AppMsg loop has a \`RestreamProposal\` variant. **Unnecessary.** Restreaming is a network-layer concern: the consensus crate's app loop handles it directly (see \`engine_app.rs:96@0844d58\`) without bridge involvement. The bridge is the EL contract, not a general consensus event sink.

Four methods is the minimum that captures the L7 mapping (each method maps onto exactly one Ethereum Engine API call) without inviting contract leaks.

## 4. Error semantics — Rejected, Syncing, Internal

\`BridgeError\` at \`crates/consensus/src/bridge.rs:33@0844d58\`:

\`\`\`rust
#[derive(Debug, Error)]
pub enum BridgeError {
    #[error("execution layer rejected payload: {0}")]
    Rejected(String),

    #[error("execution layer is syncing")]
    Syncing,

    #[error("internal: {0}")]
    Internal(#[from] eyre::Report),
}
\`\`\`

Three variants. Each maps to a specific consensus-side response:

| Variant | What it means | Consensus response |
| :--- | :--- | :--- |
| \`Rejected(reason)\` | The EL applied logic and decided no. The block is malformed, or refers to an unknown parent, or violates EIP-1559. | Treat the proposal as Invalid; vote nil on this value. Continue to next round. |
| \`Syncing\` | The EL doesn't have the state to answer yet — it's catching up to the network's tip. | Wait. Don't vote nil (we don't know if the block is bad). Backoff and retry, or fall to a timeout. |
| \`Internal(report)\` | Something is genuinely broken. Database corruption, EL panic, missing file. | **Halt the chain.** Propagate the error up, log loudly. We can't safely continue. |

The three are not interchangeable. A bridge that returns \`Internal\` for an unknown parent (which is really \`Rejected\`) will halt the chain when it should just have voted nil. A bridge that returns \`Rejected\` for a syncing condition will permanently fork from peers who could have given them the answer.

> 🛑 **Anti-fluency.** "Errors are errors. One \`Error\` enum is fine." **No.** In consensus code the *category* of error determines whether the chain advances, pauses, or halts. Collapsing them loses information that's load-bearing for liveness. Three variants is the minimum.

> 🛑 **Predict.** Pick one: a peer sends us a proposal whose parent block hash isn't in our chain. Should the bridge return \`Rejected\`, \`Syncing\`, or \`Internal\`?

The answer depends on **whether we expect to learn about the parent**. If our node is behind and the parent is real (and we just haven't synced it yet) → \`Syncing\`. If our node is up to date and no such block exists → \`Rejected\`. The bridge can't always tell which case it's in; in practice production bridges check the sync state of their provider before classifying.

In \`LiveRethEvmBridge::build_payload\` at \`crates/evm/src/live_node.rs:68@0844d58\`, the current code returns \`Rejected\` when the provider has no block with the given hash. That's correct **if we assume our provider is up to date** — true for single-validator mode (no peers can be ahead of us), would need tightening for multi-node deployments.

## 5. Test doubles — \`InMemoryEvmBridge\` as the canonical pattern

Three implementations of \`ConsensusBridge\` live in \`crates/evm/src/\`:

- \`InMemoryEvmBridge\` (\`in_memory.rs:14@0844d58\`) — pure in-process state, no Reth deps. Used in unit tests where you want fast, isolated bridge calls.
- \`RethEvmBridge\` (\`engine.rs\`) — uses real alloy \`Header\` + \`B256\`, but in-memory state. Bridge between mock and live.
- \`LiveRethEvmBridge\` (\`live_node.rs\`) — wraps a real Reth \`BlockchainProvider\` + \`EthBeaconConsensus\`. Production-shape.

The pattern: **trait first, multiple impls, each at a different point on the "real" axis.** Unit tests use the cheapest impl; integration tests use richer impls; production uses the live impl.

\`InMemoryEvmBridge\` is the canonical test double. Its \`build_payload\`:

\`\`\`rust
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
\`\`\`

Sixteen lines. No Reth, no provider, no validator. The block hash is synthesized from \`(payload_id, number)\` instead of computed from a real header. The state root is zero. **And the trait doesn't care.**

That's the test-double payoff: the trait expresses *what* the EL contract is, not *how* it's implemented. A unit test can run \`run_single_validator(&InMemoryEvmBridge::new(), parent)\` in microseconds; the same caller code runs against \`LiveRethEvmBridge\` in production with no signature changes.

> 🛑 **Anti-fluency.** "Test doubles always lie." Mostly true, but not the right framing. A test double *narrows* the contract to the part you're testing. \`InMemoryEvmBridge\` truthfully implements "build a child block on a parent" — it just declines to do real EVM execution or hash computation, because those aren't what the consensus tests are testing.

## 6. Type ownership — why contract types live in \`openhl-types\`

Look at the trait's signatures:

\`\`\`rust
async fn build_payload(&self, parent: BlockHash, attrs: PayloadAttrs)
    -> Result<PayloadId, BridgeError>;
\`\`\`

\`BlockHash\`, \`PayloadAttrs\`, \`PayloadId\` — these aren't defined in \`openhl-consensus\` or \`openhl-evm\`. They're in \`openhl-types\`. Why?

Because **the consensus crate and the evm crate both need to name them** — consensus to call the trait, evm to implement it. If the types lived in \`openhl-consensus\`, then \`openhl-evm\` would have to depend on \`openhl-consensus\` to implement the trait. If they lived in \`openhl-evm\`, then \`openhl-consensus\` would depend on \`openhl-evm\` to call the trait.

Either way you get a cycle: A depends on B, B depends on A. Rust's crate graph is a DAG; cycles are a compile error. The fix is the **shared types crate**: both \`openhl-consensus\` and \`openhl-evm\` depend on \`openhl-types\`, and neither depends on the other for type definitions.

The \`ConsensusBridge\` trait itself lives in \`openhl-consensus\` (consensus owns the contract), but the trait's *vocabulary* lives one level lower in the dep graph.

This pattern shows up at every L1 with a serious type system:

| Chain | Contract types live in | Trait lives in |
| :--- | :--- | :--- |
| Ethereum (Reth) | \`alloy-primitives\`, \`reth-primitives-traits\` | \`reth-engine-primitives\`, \`reth-rpc-api\` |
| Tendermint / CometBFT | \`tendermint-proto\` | various consumer crates |
| Malachite | \`informalsystems-malachitebft-core-types\` | \`informalsystems-malachitebft-core-consensus\` |
| **OpenHL** | \`openhl-types\` | \`openhl-consensus\` |

Same shape. Different names.

## 7. What this trait DOESN'T do

The hardest part of designing a contract is what you leave out. Four things \`ConsensusBridge\` deliberately doesn't have:

1. **No transaction pool.** A real EL has a mempool. We could expose \`submit_transaction(tx)\` on the bridge. **We don't.** The mempool is an EL-internal concern; consensus shouldn't care how the EVM finds transactions to put in blocks. (In real Reth, the payload builder owns mempool access; consensus never touches it.)

2. **No state queries.** No \`get_balance(addr)\`, no \`read_storage(addr, slot)\`. **State is an EL-only concern.** If consensus needs to read state, it's doing the wrong thing — consensus only needs to know about blocks and their order, not their contents.

3. **No subscription API.** No \`subscribe_decisions()\` or \`on_block_committed(callback)\`. The bridge is a synchronous (well, async-await) request-response trait; the EL doesn't push events back to consensus. If consensus wants to know about decisions, it's *the one making them* — no callback needed.

4. **No genesis/init method.** No \`initialize_genesis(spec)\`. Genesis is a chain-spec concern, handled at node bootstrap (\`OpenHlNode::start()\` reads the chain spec from \`Genesis\` — Module 5 territory). The bridge is for steady-state operation, not initialization.

Each of these temptations is real, and each would have made the trait larger. **The minimum viable contract is exactly four methods.** Resisting expansion is a design discipline.

> 🛑 **Predict.** A new contributor argues: "We should add \`query_state(addr) -> StateView\` to the trait — it'd make debugging easier." **Why is this wrong?** Hint: think about the dep graph (§6) and what consensus needs to know to make decisions.

The answer: consensus doesn't need to read state; it picks the next *block*, not the next *state*. Adding \`query_state\` puts the cart before the horse, leaks EL internals into the CL crate, and obligates every impl (including \`InMemoryEvmBridge\`) to maintain a queryable state machine. The right place for state queries is the EL crate's own debug interface, not the consensus contract.

## 8. Practice

1. **Find the two stub bridges.** In \`crates/consensus/src/runner.rs\` and \`crates/consensus/src/engine_app.rs\` test modules, find the inline \`StubBridge\` impls. Why are there *two* (not one shared)? What's the minimum each one implements vs \`InMemoryEvmBridge\`? (Hint: both stubs predate adding \`openhl-evm\` as a test-only dep of \`openhl-consensus\`, which would have created the dep cycle in §6. Inline stubs avoid the cycle.)

2. **Halt-vs-recover audit.** Read every \`Err(BridgeError::...)\` return in \`LiveRethEvmBridge\` at \`crates/evm/src/live_node.rs@0844d58\`. For each, identify whether it's \`Rejected\`, \`Syncing\`, or \`Internal\`. Then check: does the consensus-side caller (in \`runner.rs\` or \`engine_app.rs\`) handle that variant the way §4's table prescribes?

3. **Sketch a fifth method (and discover why not).** Suppose you wanted to add \`restream_proposal(block_hash)\` to support Malachite's \`RestreamProposal\` AppMsg. Sketch the trait change. Then read \`engine_app.rs:96@0844d58\` — what does the current code do for \`RestreamProposal\`? Why doesn't the bridge need to be involved?

> **Final check.** In one sentence, why does \`validate_payload\` take \`&ExecutedBlock\` (a *borrowed* reference) instead of \`ExecutedBlock\` (owned)? If your answer doesn't include "validation shouldn't consume the block — consensus may still need it" or "the borrow is a type-system safety rail against accidental ownership transfer," re-read the trait signature.`,
                },
                {
                  title: "From Malachite Decided to Reth forkchoice_updated",
                  slug: "openhl-decided-to-fcu-en",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 15,
                  xpReward: 40,
                  content: `# From Malachite \`Decided\` to Reth \`forkchoice_updated\`

It's 3am. Your validator just signed the deciding precommit on block 17. Malachite emits \`Decided\`. Your EL is sitting there. **What needs to happen, in what order, before the chain advances to block 18?**

If your answer is "we call \`bridge.commit(hash)\`" — keep reading. The order matters more than the call.

> 🛑 **Predict before scrolling.** List, in order, the state changes that need to happen between Malachite saying \`Decided\` and the next round starting. Hint: there are more than three, and skipping any one of them halts the chain.

## 1. What \`Decided\` means in BFT

When Malachite emits \`Decided\` for value V at height H, three things are simultaneously true:

1. **≥ 2/3+1 of voting power** signed a precommit for V at H.
2. **No other value can ever be decided** for height H — the signatures are recorded, and any equivocation by a validator is slashable evidence.
3. **No reorg is possible** at H. Block H is now an immutable fact of the chain.

This is the BFT promise. In Nakamoto-shape chains (PoW, ETH 1.0 longest-chain), "decided" is probabilistic — you wait k confirmations and hope no fork catches up. In BFT, **decided is decided. Forever.**

This single property changes how the EL must respond. In Ethereum, the EL applies blocks under fork-choice and is told *afterwards* which ones became finalized (via Casper FFG, ~13 minutes later). In BFT, the head and the finalized block are the same block, decided in the same operation.

## 2. What \`forkchoice_updated\` needs from us

The Engine API call shape:

\`\`\`
forkchoiceUpdated(ForkchoiceState {
    headBlockHash:      B256,
    safeBlockHash:      B256,
    finalizedBlockHash: B256,
}, payload_attrs: None)
\`\`\`

Three hashes. Reth (and any compliant EL) updates its internal pointers and immediately starts treating the named blocks as canonical.

In Ethereum, these are three potentially-different blocks:
- \`head\`: latest block validators are building on (might still get reorged)
- \`safe\`: justified, won't be reorged barring 1/3+ malicious stake
- \`finalized\`: irreversibly committed, can be archived

In BFT, **they collapse**. After a Malachite Decision:
- \`head = decided block\`
- \`safe = decided block\`
- \`finalized = decided block\`

> 🛑 **Anti-fluency.** "BFT and PoS finality are the same thing." Not quite. Ethereum's Casper FFG is a BFT *gadget* layered on a Nakamoto chain — it can finalize blocks behind the head. Pure BFT (Tendermint, HyperBFT, openhl) doesn't have this gap because the head IS finalized at every step.

## 3. The collapse, concretely

This collapse simplifies our Decided handler. We don't need to track three separate forkchoice pointers — they're always identical. The forkchoice update degenerates to:

\`\`\`
forkchoiceUpdated(ForkchoiceState {
    headBlockHash:      decided_hash,
    safeBlockHash:      decided_hash,
    finalizedBlockHash: decided_hash,
}, None)
\`\`\`

That's the Reth side. In openhl's in-process variant, it's just \`bridge.commit(decided_hash)\` — the trait we mapped in L7.

## 4. The Decided handler, walked

Here's the actual Decided arm of openhl's app loop at \`crates/consensus/src/engine_app.rs:119@0cac571\`:

\`\`\`rust
AppMsg::Decided {
    certificate, reply, ..
} => {
    let hash = certificate.value_id;
    bridge.commit(hash).await?;
    decided.push(hash);
    current_parent = hash;

    if decided.len() >= stop_after_decisions {
        let next_height = certificate.height.increment();
        let _ = reply.send(Next::Start(next_height, validator_set.clone()));
        return Ok(decided);
    }

    let next_height = certificate.height.increment();
    current_height = next_height;
    if reply.send(Next::Start(next_height, validator_set.clone())).is_err() {
        tracing::warn!("{APP_REPLY_WAIT_LOG} (Decided)");
    }
}
\`\`\`

Five steps. In order:

1. **Extract the decided hash.** \`certificate.value_id\` is the \`BlockHash\` BFT just irreversibly committed to. We have nothing to do with the decision — it's already made.

2. **Commit through the bridge.** \`bridge.commit(hash).await?\` propagates the decision to the EL. As of Stage 7d (commit \`0cac571\`) this fires a real \`forkchoiceUpdated\` against Reth's in-process Engine API — see §6 for the body. **If this returns an error, we propagate it — the chain halts.** That's the correct behavior; we just had a decision and our EL refused to apply it. **Better to halt than to silently fork.**

3. **Update our tracking.** \`decided.push(hash)\` for the caller's view; \`current_parent = hash\` so the next \`build_payload\` knows what to build on.

4. **Tell consensus what's next.** \`reply.send(Next::Start(...))\` instructs Malachite to begin the next height. If we send \`Next::Restart\` instead, Malachite redoes the current height.

5. **(Test-only) early termination.** If \`stop_after_decisions\` was reached, return so tests can exit cleanly.

> 🛑 **Predict.** What happens if we skip step 4 — don't send any reply?

Malachite stalls. The Consensus actor blocks waiting for our response before advancing to the next height. The chain freezes. **This is by design** — Malachite refuses to advance without explicit application confirmation. It's how the EL stops the CL from getting ahead.

## 5. \`Next::Start\` vs \`Next::Restart\`

| Variant | Used when |
| :--- | :--- |
| \`Next::Start(height+1, validator_set)\` | Commit succeeded; advance to the next height. |
| \`Next::Restart(current_height, validator_set)\` | Commit failed; redo the current height (different proposer rotation may help). |

In openhl's current implementation we only use \`Next::Start\`. If \`bridge.commit\` fails, we propagate the error up the stack — by the time we'd consider \`Restart\`, the chain is already halted. **There's no automatic restart loop.** That's intentional: a failed commit means our state is corrupt or the EL is broken; quietly retrying would compound the problem.

Production-shape \`Restart\` use would be paired with infrastructure-level recovery (state restoration, WAL replay) before re-attempting. The WAL integration in Stage 7d's commit path is where that pattern would land.

## 6. Stage 7d — \`commit\` reaches Reth, honestly

Stage 7c gave us a working \`commit\` stub: write the header into the bridge's own \`HashMap\`, advance \`head\`, return \`Ok\`. Stage 7d turns that stub into a real \`forkchoiceUpdated\` against Reth's in-process Engine API — without breaking any caller that doesn't want it.

The actual \`commit\` body at \`crates/evm/src/live_node.rs:301@0cac571\`:

\`\`\`rust
async fn commit(&self, block_hash: BlockHash) -> Result<(), BridgeError> {
    let hash = B256::from(block_hash.0);
    let header = {
        let mut s = self.state.lock().expect("state mutex poisoned");
        let header = s
            .pending
            .values()
            .find(|(h, _, _)| *h == hash)
            .map(|(_, h, _)| h.clone())
            .ok_or_else(|| {
                BridgeError::Rejected(format!("commit for unknown hash {hash}"))
            })?;
        s.chain.insert(hash, header.clone());
        s.head = Some(hash);
        header
    };

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
\`\`\`

Three things to notice:

**Local first, engine second.** The bridge's own \`HashMap\` is updated *inside* a tight critical section. Then we drop the lock and only afterwards reach for the engine. The order is load-bearing: if the engine call panics or hangs, the bridge's own view of the chain is already consistent. Tests that don't install a handle keep working — \`engine_handle: None\` short-circuits the second half.

**Three hashes, one value.** §3's collapse made concrete: \`head = safe = finalized = hash\`. No drift between justification and finality because there's no justification step in BFT — the decision *is* the finalization. Compare to a Casper-FFG client where these three are usually different blocks.

**\`let _ = ... .await\`.** The engine's response is deliberately discarded. Why?

> 🛑 **Predict.** What does Reth's engine return when openhl sends \`forkchoiceUpdated(hash)\` for a \`hash\` it has never seen via \`newPayload\`? Three options: \`VALID\`, \`INVALID\`, \`SYNCING\`. Which, and why?

The answer is \`SYNCING\`. Reth doesn't have the block in its database — openhl built the header inside the bridge, never asked Reth to execute it, never produced an \`ExecutionPayload\` for \`engine_newPayload\`. Reth correctly responds: "I'm not on this chain; I don't know what you're talking about; assume I'm syncing."

That's the **honest-scoping flag** for Stage 7d. The wire is connected — the call reaches the engine, the engine responds, we don't deadlock or panic. But the engine's response is not *useful* yet, because we don't have a real payload to validate against. The next staging chunk (post-Module-3, once CLOB fills are encoded as EVM transactions) will pair \`commit\` with a prior \`newPayload(payload)\` so that by the time forkchoice arrives, the engine already knows the block.

The handle install path lives at \`crates/evm/src/live_node.rs:118@0cac571\`:

\`\`\`rust
#[must_use]
pub fn with_engine_handle(
    mut self,
    handle: ConsensusEngineHandle<EthEngineTypes>,
) -> Self {
    self.engine_handle = Some(handle);
    self
}
\`\`\`

Builder-style because the bridge is constructed before the Reth node finishes launching — you can't pass the handle to \`new()\`. The integration test at \`crates/evm/src/live_node.rs:691@0cac571\` shows the actual hand-off:

\`\`\`rust
let handle = NodeBuilder::new(node_config)
    .testing_node(runtime)
    .with_types::<EthereumNode>()
    .with_components(EthereumNode::components().executor(OpenHlExecutorBuilder))
    .with_add_ons(EthereumAddOns::default())
    .launch()
    .await?;

let engine_handle = handle.node.add_ons_handle.beacon_engine_handle.clone();

let bridge = LiveRethEvmBridge::new(handle.node.provider.clone(), chain_spec)
    .with_engine_handle(engine_handle);
\`\`\`

The handle is plucked out of the launched node's \`add_ons_handle.beacon_engine_handle\`. That field exists because we composed with \`EthereumAddOns::default()\`; without it the field wouldn't be present and \`with_engine_handle\` would have nothing to install.

> 🛑 **Anti-fluency.** "Decided and committed are the same thing." **No.** *Decided* is BFT's claim that 2/3+1 of validators agreed. *Committed* is the EL's confirmation that it actually applied the block. Both must happen for the chain to advance. Collapse them into one concept and you'll skip the bridge call entirely, ending up with consensus that decides on blocks the EL refuses to apply.

> 🛑 **Anti-fluency.** "The engine returning SYNCING means Stage 7d is broken." **No.** SYNCING means the engine doesn't have the block — which is *correct* given we never sent it one. The bug would be if SYNCING surprised us; instead, we expect it, document it, and gate it behind the next stage's \`newPayload\` integration.

## 7. Practice

1. **Trace the three pointers.** After block 5 is decided in openhl, what are the three Forkchoice hashes openhl sends to Reth? Compare to what Ethereum mainnet would send if block 5 was its head but block 3 was its latest finalized.
2. **Find the halt condition.** What error from \`bridge.commit\` would prevent step 4 from running? In \`crates/evm/src/live_node.rs:301@0cac571\`, identify which conditions return \`Ok(())\` and which return \`Err\`. (Hint: only one branch returns \`Err\` — and it's the same one Stage 7c already had.)
3. **Why discard the engine's response?** §6's \`commit\` writes \`let _ = handle.fork_choice_updated(...)\`. Imagine the next stage encodes CLOB fills as EVM transactions and adds a \`newPayload\` call before this \`forkchoiceUpdated\`. Rewrite the body to (a) call \`newPayload(payload)\` first, (b) check the returned \`PayloadStatus\`, (c) only forkchoice-update if \`PayloadStatus::Valid\`. What \`BridgeError\` would you produce on \`Invalid\`? On \`Syncing\`?
4. **Sketch the Restart use.** If \`bridge.commit\` returned an error meaning "the proposer's value won't apply cleanly, but the next try should work", how would the Decided handler change? Sketch the diff to switch to \`Next::Restart\`.

> **Final check.** In one sentence, why does openhl wait for the application's reply (step 4) before advancing to the next height, instead of advancing immediately on \`Decided\`? If your answer doesn't mention "the EL might refuse" or "preventing the CL from getting ahead," re-read §4 step 2.`,
                },
                {
                  title: "Producing blocks — Malachite proposer → Reth payload → broadcast",
                  slug: "openhl-proposer-en",
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 15,
                  xpReward: 40,
                  content: `# Producing blocks — Malachite proposer → Reth payload → broadcast

It's 3am. Malachite's leader-election function just picked you as proposer for height 47, round 0. You have **400 milliseconds** to produce a block, broadcast it to peers, and start gathering prevotes. The clock is already running.

Where do those milliseconds go? Which 200µs of the budget is your own code, which 50ms is Reth, and which 100ms is network propagation that the proposer can't shrink no matter how hard they try? This lesson traces the proposer hot path through openhl's actual code and names the moments that matter.

> 🛑 **Predict before scrolling.** You're proposer for height N. From the moment your code learns this until you've broadcast the proposal, name every action that has to happen — in order. Hint: there are at least five, and one of them is "doesn't have to happen synchronously."

## 1. The hot path, named

When openhl's \`run_engine_app\` loop sees an \`AppMsg::GetValue\` from the consensus engine, that's the engine saying: "It's your slot. Build me a block to propose."

Trace from above-the-bridge:

| Step | Owner | What runs | Typical budget |
| :--- | :--- | :--- | :--- |
| 1 | Malachite Consensus actor | Round-robin selects us as proposer | <1µs |
| 2 | Malachite Engine actor | Sends \`AppMsg::GetValue { height, round, timeout, reply }\` | <5µs |
| 3 | **openhl \`run_engine_app\`** | Calls \`bridge.build_payload(parent, attrs)\` | varies — see §3 |
| 4 | **openhl \`run_engine_app\`** | Calls \`bridge.payload_ready(id)\` | varies |
| 5 | **openhl \`run_engine_app\`** | Wraps in \`LocallyProposedValue\`, sends via \`reply\` | <10µs |
| 6 | Malachite Consensus actor | Receives the value, calls \`OpenHlContext::new_proposal\` | <100µs (signing) |
| 7 | Malachite Network actor | Gossips proposal via libp2p | network-bound |

Steps 3–5 are ours. Steps 1–2 and 6–7 are Malachite. **The entire proposer hot path that we control is sixteen lines of code.**

## 2. Where the milliseconds go

The \`AppMsg::GetValue\` payload includes a \`timeout: Duration\` — Malachite telling us how long we have. Our code currently ignores it (\`timeout: _\`), which is fine in test mode where bridge calls are synchronous. **In production it's not fine** — if \`build_payload\` takes longer than the timeout, Malachite stops waiting and the round times out without a proposal.

The timeout in Malachite's default \`ConsensusConfig\` is the **propose timeout**, typically 1–3 seconds for safety, but tunable down to 300–500ms for chains like HL or Tempo chasing sub-second slots.

| Budget consumer | Test-mode (today) | Production-mode |
| :--- | :--- | :--- |
| \`bridge.build_payload\` body | microseconds (in-memory) | 100–400ms (real Reth payload assembly) |
| \`bridge.payload_ready\` body | microseconds | <5ms (cached result) |
| \`reply.send(...)\` channel write | nanoseconds | nanoseconds |
| \`OpenHlContext::new_proposal\` + sign | microseconds | microseconds |
| Network gossip propagation | n/a (single validator) | 50–200ms (peer-count dependent) |

The expensive line in production is **assembling the actual payload from the mempool** — Reth's payload builder picks transactions, executes them, computes state. That's where the 100–400ms lives. Everything else is overhead.

> 🛑 **Anti-fluency.** "Just build the payload synchronously when it's your turn — that's the simplest design." **Wrong for production.** Synchronous build wastes most of your propose budget on work that could have happened earlier. The 4-method \`ConsensusBridge\` trait (L9) exists specifically to enable the async optimization. We'll see how in §5.

## 3. The proposer's code, walked

Open \`crates/consensus/src/engine_app.rs:65@0844d58\`:

\`\`\`rust
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
    let lpv = informalsystems_malachitebft_app_channel::app::types
        ::LocallyProposedValue::new(height, round, value);
    if reply.send(lpv).is_err() {
        tracing::warn!("{APP_REPLY_WAIT_LOG} (GetValue)");
    }
}
\`\`\`

Sixteen lines. Five logical steps:

1. **Build payload attributes.** \`default_attrs()\` returns a \`PayloadAttrs { timestamp: 0, fee_recipient: [0u8; 20], prev_randao: [0u8; 32] }\`. In production these would come from somewhere — chain config, validator settings, the previous block's randao reveal. At v0 they're constants because no part of the chain logic depends on them yet.

2. **Start payload build.** \`bridge.build_payload(current_parent, attrs).await\` — returns a \`PayloadId\` immediately in test mode (sync impls), or starts an async job in production (with \`LiveRethEvmBridge\`, this would dispatch to Reth's payload-builder service).

3. **Wait for the block.** \`bridge.payload_ready(id).await\` — returns the assembled \`ExecutedBlock\`. In test mode this returns instantly; in production it blocks until the payload-builder service signals readiness (or the propose timeout fires, in which case we'd lose the round — see §5 for how to avoid).

4. **Wrap in \`LocallyProposedValue\`.** Malachite's app-channel uses this type as the contract handoff for proposals built locally. It's a struct of \`(height, round, value)\`. We don't construct a \`Proposal\` directly — that's the consensus actor's job.

5. **Send via the reply oneshot.** \`reply.send(lpv)\` is a \`tokio::sync::oneshot\` channel. The Engine actor is blocked waiting on the other end of that oneshot. **If we never send, Malachite stalls** (same halt pattern as L10's \`Decided\` reply). We send a warning if \`is_err()\` because the only way \`send\` fails is if the receiver was already dropped — meaning the engine timed out and moved on.

> 🛑 **Predict.** What happens if step 5's \`reply.send(...)\` happens *after* the engine's propose timeout fires?

The \`send\` returns \`Err(_)\` because the engine already gave up on the oneshot. We log a warning and continue. **Malachite advances to the next round without a proposal from us** — the round times out, prevotes go to nil, the next proposer (round-robin) gets a turn. The chain doesn't halt; it just loses a round.

This is correct behavior: a slow proposer shouldn't block the chain forever. The 1/3+ byzantine fault assumption protects against this — even with one slow validator per round, the chain advances at the speed of the average validator.

## 4. \`LocallyProposedValue\` — what consensus actually gets

We don't construct a Malachite \`Proposal\` directly. We construct \`LocallyProposedValue::new(height, round, value)\`. Malachite's Consensus actor takes our value, builds a \`Proposal\` via \`OpenHlContext::new_proposal\` (L4 territory), signs it via the \`SigningProvider\` (Stage 6a), and hands the signed Proposal to the Network actor for gossip.

We don't do any of those four operations. The trait split is deliberate: we own *value selection* (which block to propose), Malachite owns *proposal construction* (how to format it on the wire), *signing*, and *broadcast*.

| Operation | Owner | Why this owner |
| :--- | :--- | :--- |
| Pick the value | **openhl app loop** | Application-specific — the chain decides what counts as a block |
| Wrap in \`Proposal\` struct | Malachite | Consensus-protocol concern — the on-wire format is fixed by the BFT spec |
| Sign | \`OpenHlSigningProvider\` (Stage 6a) | Validator-key-specific — only we hold our key |
| Broadcast | Malachite Network actor | Network-layer concern — gossipsub topic management |

This is the same separation-of-concerns L1 §5 named for the four-message contract: the bridge owns "what the EVM does"; Malachite owns "what consensus does"; the SigningProvider owns "what our validator's key does." Each piece is small enough to be debuggable in isolation.

## 5. The async trick we're not using (yet)

Look at steps 2 and 3 of §3 again. \`build_payload\` and \`payload_ready\` are *separate calls* — that's not an accident. The split lets us do this in production:

\`\`\`
Time:  t=0       t=200ms        t=400ms                   t=propose
       │           │               │                          │
       ▼           ▼               ▼                          ▼
       │       round N-1            │            our slot starts (round N)
       │   voting in progress       │
       │           │               │                          │
       └─ build_payload(...)─async─┴─ payload_ready(id) ─────┘
          (kicked off while         (just fetches the
           round N-1 still votes)    already-built block)
\`\`\`

\`build_payload\` is called early — as soon as the previous round's decided block is known — so the EL can spend the round's voting time assembling the next block in parallel. By the time \`payload_ready\` is called, the block is sitting there. The propose-time critical path is reduced to "fetch the prepared payload + send the reply" — measured in microseconds, not milliseconds.

This is the **build-during-voting** optimization from L7 §4. **Today's openhl code doesn't do this** — the \`AppMsg::GetValue\` arm calls \`build_payload\` and \`payload_ready\` back-to-back inside the same handler. That's fine in test mode (everything is microseconds anyway). For production it needs to change to "kick off build_payload at round-decided, await payload_ready at propose time."

The trait surface already supports this — the 4-method split is the API. Implementation work for the async optimization lives outside the bridge: it's the AppMsg loop that needs to learn to call \`build_payload\` earlier than \`GetValue\` arrives.

> 🛑 **Anti-fluency.** "We can collapse \`build_payload\` and \`payload_ready\` into one method since they're always called together today." **No.** The fact that they're called together today is the bug we'll eventually fix — the trait is shaped right *to enable* the fix. Collapsing the methods would lock in the synchronous design forever.

## 6. After the reply — what Malachite does with it

Once \`reply.send(lpv)\` returns, our code is done. Malachite's Consensus actor receives the value and does the rest:

1. Looks up the proposer's address for (height, round) via \`OpenHlContext::select_proposer\` (verifies it's us)
2. Calls \`OpenHlContext::new_proposal(height, round, value, pol_round, address)\` to construct a \`Proposal\`
3. Hands the proposal to \`OpenHlSigningProvider::sign_proposal\` for an Ed25519 signature
4. Wraps in \`SignedProposal\`, hands to the Network actor
5. Network actor broadcasts via libp2p gossipsub
6. Each peer receives the proposal, validates the signature, hands it to *their* Consensus actor as an external input

We're done at step 1 of that list. From the proposer's perspective, the entire downstream pipeline is opaque — the actor framework handles it.

This is the L11 lesson made concrete: **the proposer's code is small because the contract is well-designed.** Malachite handles the consensus protocol; we handle the application-specific "what value to propose"; the bridge handles the EL-specific "how to build it."

## 7. Practice

1. **Trace the budget.** A production openhl deployment uses a 1-second propose timeout. Reth's payload builder typically takes 200ms. Network propagation to peers is ~80ms. **How much of the 1-second budget is left for the rest of consensus operations?** What does the proposer use that buffer for? (Hint: gathering prevotes from peers happens in parallel with proposal broadcast, but the proposer waits for 2/3+ prevotes before precommitting.)

2. **Find the timeout-ignored line.** In \`engine_app.rs:65@0844d58\`, the \`AppMsg::GetValue\` destructure has \`timeout: _\`. Find every other AppMsg variant that discards \`timeout\` or another field with \`_\`. Are any of them load-bearing? (Hint: most are fine — we don't need every field — but one or two might be production gaps.)

3. **Sketch the async optimization.** Today's \`AppMsg::GetValue\` handler is sync (build + ready back-to-back). Sketch the diff to call \`build_payload\` immediately after every \`AppMsg::Decided\` instead, storing the resulting \`PayloadId\` keyed by \`(next_height, round=0)\`. Then \`GetValue\` becomes just \`payload_ready\` + \`reply.send\`. How does this change interact with \`Next::Restart\` from L10 §5?

> **Final check.** In one sentence, why doesn't openhl's proposer code construct a \`Proposal\` directly — instead handing back a \`LocallyProposedValue\` and letting Malachite build the \`Proposal\`? If your answer doesn't include "separation of concerns: application owns value selection, consensus owns proposal construction" or "the on-wire \`Proposal\` format is fixed by the consensus protocol, not the application," re-read §4.`,
                },
              ],
            },
          },
          {
            title: "Single-validator devnet",
            sortOrder: 4,
            lessons: {
              create: [
                {
                  title: "Bootstrapping — genesis, keys, the single-node config",
                  slug: "openhl-devnet-bootstrap-en",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 10,
                  xpReward: 30,
                  content: `# Bootstrapping — genesis, keys, the single-node config

You've installed every concept in modules 1–4. You can read the contract (L1), trace the Engine API (L7), design the bridge (L9), commit a decided block (L10), produce one as proposer (L11). **Now we bootstrap.** What does the smallest possible runnable openhl look like — one validator, one node, no peers? And why is that "toy" actually a real test of everything we've built?

> 🛑 **Predict before scrolling.** You want to run a one-validator devnet. List the artifacts you need to construct (not write code yet — just enumerate). Hint: there are exactly four, and three of them already exist at SHA \`0844d58\`.

## 1. The four artifacts

To bootstrap a single-validator openhl devnet, you need:

| Artifact | What it carries | Where it lives in openhl |
| :--- | :--- | :--- |
| **Ed25519 keypair** | Validator identity for signing | Generated by \`PrivateKey::generate(OsRng)\` |
| **Validator set** | "Who can propose / vote" — just us, with \`voting_power = 1\` | \`OpenHlValidatorSet::new(vec![...])\` at \`crates/consensus/src/types/validator.rs:42@0844d58\` |
| **ChainSpec** | Genesis state, hardfork timestamps, chain ID | \`reth_chainspec::ChainSpec\`, constructed from \`Genesis\` JSON |
| **Home directory** | Where the WAL writes, where keys could be persisted | \`tempfile::tempdir()\` in tests; a real path in production |

Plus the \`OpenHlConfig\` (NodeConfig + ConsensusConfig + ValueSyncConfig) — but that's mostly defaults. The four above are the chain-defining inputs.

## 2. The \`OpenHlNode\` constructor

Everything bundles into a single struct. \`crates/consensus/src/node.rs:144@0844d58\`:

\`\`\`rust
pub fn new(
    private_key: PrivateKey,
    validator_set: OpenHlValidatorSet,
    home_dir: PathBuf,
    moniker: impl Into<String>,
) -> Self {
    Self {
        private_key,
        validator_set,
        home_dir,
        moniker: moniker.into(),
    }
}
\`\`\`

Four fields, no surprises. The \`moniker\` is just a human-readable identifier — it shows up in logs and metrics. The other three are the chain-defining inputs from §1 (the ChainSpec is plumbed through \`load_config()\`, not stored here — see §5).

The test helper \`single_validator_node\` at \`crates/consensus/src/node.rs:249@0844d58\` walks the construction end-to-end:

\`\`\`rust
fn single_validator_node(home_dir: PathBuf) -> OpenHlNode {
    let sk = PrivateKey::generate(OsRng);
    let pk = sk.public_key();
    let digest = Sha256::digest(pk.as_bytes());
    let mut addr_bytes = [0u8; 20];
    addr_bytes.copy_from_slice(&digest[12..32]);
    let address = OpenHlAddress(addr_bytes);
    let validator_set =
        OpenHlValidatorSet::new(vec![OpenHlValidator::new(address, pk, 1)]);
    OpenHlNode::new(sk, validator_set, home_dir, "openhl-test")
}
\`\`\`

Eight lines. Generate a keypair, derive an Ethereum-style address (last 20 bytes of \`SHA-256(pubkey)\` — see L4 §1), wrap into a one-element validator set with \`voting_power = 1\`, instantiate the node.

This is **the minimum chain.** Everything else in modules 1–4 — the Context impl, the bridge, the engine actors, the Reth integration — works against this single struct.

## 3. The single-validator escape hatch

A bona-fide BFT chain needs \`n ≥ 3f + 1\` validators to tolerate \`f\` byzantine faults. The smallest non-trivial set is \`n = 4, f = 1\`. So why does single-validator (\`n = 1, f = 0\`) work?

It works because the **quorum threshold becomes vacuously easy**: 2/3 of 1 validator is, well, 1 validator. We always have a quorum because we're the only voter. There's nothing for byzantine faults to attack — there are no other validators to disagree with.

The \`OpenHlContext::select_proposer\` round-robin (L4 §3 territory) at single-validator becomes a constant function: we're always the proposer. Every prevote, every precommit, every commit certificate has exactly one signature — ours.

> 🛑 **Anti-fluency.** "Single-validator is fake consensus; it doesn't prove anything." **Wrong.** Single-validator is *real* consensus running against a degenerate validator set. Every piece exercises:
> - the \`OpenHlContext\` trait surface (proposer election, proposal construction, vote signing)
> - the \`ConsensusBridge\` contract (all four methods)
> - the engine actor system (libp2p starts, ractor actors spawn, WAL writes)
> - the Reth integration (the \`LiveRethEvmBridge\` path validates against \`EthBeaconConsensus\`)
>
> What it doesn't exercise: multi-peer network gossip, sync protocols, byzantine handling. That's \`run_multi_validator\` territory (Stage 5 in the codebase). But "no byzantine handling" is **not** "no consensus" — it's "all the consensus machinery, on the trivial topology."

## 4. The ChainSpec

The Reth side of the equation. Constructed from \`Genesis\` JSON — at v0 we use a minimal post-merge dev spec from \`crates/evm/src/reth_node.rs:35@0844d58\`:

\`\`\`rust
fn dev_chain_spec() -> Arc<ChainSpec> {
    let custom_genesis = r#"{
        "nonce": "0x42",
        "timestamp": "0x0",
        "extraData": "0x5343",
        "gasLimit": "0x5208",
        "difficulty": "0x400000000",
        "alloc": {},
        "number": "0x0",
        "parentHash": "0x00...",
        "config": {
            "ethash": {},
            "chainId": 2600,
            "homesteadBlock": 0,
            // ... London, Paris, Shanghai all at 0
            "terminalTotalDifficulty": 0,
            "shanghaiTime": 0
        }
    }"#;
    let genesis: Genesis = serde_json::from_str(custom_genesis).expect("...");
    Arc::new(genesis.into())
}
\`\`\`

Chain ID 2600 mirrors Reth's own \`custom-dev-node\` example, so the chain is observable-compatible with that reference. Every hardfork is enabled from block 0 (post-merge dev mode); no PoW phase, no fork transitions during the chain's lifetime.

The ChainSpec feeds two consumers:
- **Reth side**: \`NodeBuilder::new(NodeConfig::test().dev().with_chain(chain_spec.clone()))\` (§5)
- **OpenHL bridge**: \`LiveRethEvmBridge::new(provider, chain_spec)\` (Stage 7c) — to construct the \`EthBeaconConsensus\` validator that runs against this chain's hardforks

The same \`Arc<ChainSpec>\` flows to both. **They must agree** — if the bridge's validator and Reth's executor disagree on what's a valid block, the chain forks at the first hardfork-sensitive operation.

## 5. The escape hatch in \`load_config\`

\`OpenHlConfig::new(moniker)\` at \`crates/consensus/src/node.rs:34@0844d58\` builds the consensus config:

\`\`\`rust
pub fn new(moniker: impl Into<String>) -> Self {
    let consensus = ConsensusConfig {
        value_payload: ValuePayload::ProposalOnly,  // ← required by our ProposalPart
        ..ConsensusConfig::default()
    };
    Self { moniker: moniker.into(), consensus, value_sync: ValueSyncConfig::default() }
}
\`\`\`

Plus the listen-address override in \`load_config()\`:

\`\`\`rust
cfg.consensus.p2p.listen_addr = "/ip4/127.0.0.1/tcp/0"  // OS picks port
    .parse()
    .map_err(|e| eyre!("invalid listen_addr: {e}"))?;
\`\`\`

Port 0 means "OS picks an ephemeral port" — important for tests (no conflicts) and harmless for production (you'd override in the real config file).

## 6. Practice

1. **Re-derive the four artifacts.** Without looking, list the four things \`OpenHlNode::new\` needs (or that flow into \`start_engine\`) for bootstrap. Match each against the line in \`node.rs\` where it's introduced.
2. **The voting-power-1 question.** In \`single_validator_node\`, the validator is created with \`voting_power = 1\`. What if we used \`voting_power = 100\`? Would anything change? (Hint: in single-validator mode, 100% of 100 power is the same as 100% of 1 power — but think about logging, metrics, and what a hypothetical second validator would have to overcome.)
3. **The bin/openhl gap.** Open \`bin/openhl/src/main.rs@0844d58\`. What does it actually do? What would it need to do to become a real \`openhl run\` command? Sketch the function body. (Hint: roughly the body of \`start_engine_smoke_spawns_and_kills\` minus the smoke-test assertions.)

> **Final check.** In one sentence, why does single-validator mode test "all the consensus machinery" even though it has trivial quorum? If your answer doesn't include "the trait surface, the actor system, the Reth integration" or "everything except multi-peer gossip and byzantine handling," re-read §3.`,
                },
                {
                  title: "The first block — running openhl and watching it tick",
                  slug: "openhl-devnet-first-block-en",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 10,
                  xpReward: 30,
                  content: `# The first block — running openhl and watching it tick

If you see \`decided_hash = BlockHash([0x42; 32])\` in the test output, **every concept in this course just composed correctly**. You're about to read what that looks like on the wire.

This is the last lesson of the course. The previous twelve built the pieces — the contract (L1), the Context (L3–L5), the Reth integration (L6–L8), the bridge wiring (L9–L11), the bootstrap (L12). L13 runs them together and reads the trace.

> 🛑 **Predict before scrolling.** Imagine you ran \`first_block_via_engine_actors\` and got an assertion failure: \`decided[0]\` is not what you built. Without looking at any code, list five things that could have gone wrong, in *order from most-likely to least-likely*. We'll trace your sketch against the actual flow.

## 1. The runnable artifact at v0

Today's "openhl devnet" is the integration test at \`crates/consensus/src/engine_app.rs:246@0844d58\`:

\`\`\`rust
#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn first_block_via_engine_actors() {
    let tmp = tempfile::tempdir().unwrap();
    let node = make_test_node(tmp.path().to_path_buf());
    let validator_set = node.validator_set.clone();

    let handle = node.start().await.expect("start_engine failed");
    let channels = handle.take_channels().await.expect("...");

    let bridge = Arc::new(StubBridge::default());
    let bridge_for_check = bridge.clone();

    let app_task = tokio::spawn(run_engine_app(bridge, channels, validator_set, 1));

    let decisions = tokio::time::timeout(Duration::from_secs(15), app_task)
        .await.expect("timed out").expect("panicked").expect("returned err");

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
\`\`\`

You can run it with:

\`\`\`bash
cargo test -p openhl-consensus first_block_via_engine_actors
\`\`\`

Runtime: ~0.02 seconds for the actual consensus round (libp2p + ractor startup dominates the wall clock at ~2.5s).

## 2. The AppMsg trace, in order

When the test runs, the engine emits AppMsg events to our \`run_engine_app\` loop in this order:

| # | AppMsg | Our handler does |
| :--- | :--- | :--- |
| 1 | \`ConsensusReady\` | Reply \`(INITIAL height, validator_set)\` |
| 2 | \`StartedRound { height=1, round=0, proposer=us, role=Proposer }\` | Reply \`Vec::new()\` (no cached proposals) |
| 3 | \`GetValue { height=1, round=0, timeout }\` | Call \`bridge.build_payload\` + \`payload_ready\`, reply with \`LocallyProposedValue\` |
| 4 | (Malachite handles internally: signs proposal, "broadcasts" — no peers, but it goes through the motions) | — |
| 5 | (Malachite handles internally: prevotes, polka, precommits) | — |
| 6 | \`Decided { certificate }\` | Call \`bridge.commit(hash)\`, push to \`decided\` vec, reply \`Next::Start(height=2)\` |

Six AppMsg events. Three replies from our code. **One decided block.** That's the entire course in one trace.

> 🛑 **Predict.** Steps 4 and 5 are entirely internal to Malachite — they happen between our reply to \`GetValue\` (step 3) and the arrival of \`Decided\` (step 6). For a single-validator chain, what consensus protocol activity actually happens in steps 4–5?

The answer: **the same protocol runs**, but every vote is from us. Malachite's Consensus actor (1) wraps our value in a \`Proposal\` and signs it (Stage 6a's \`OpenHlSigningProvider\`); (2) calls \`OpenHlContext::new_prevote\`, signs, "broadcasts"; (3) the VoteKeeper receives the prevote and tallies — 1/1 votes for our value, which exceeds the 2/3 threshold; polka is reached; (4) \`new_precommit\`, sign, "broadcast"; (5) 1/1 precommits exceed threshold; (6) Decided event fires. The whole protocol executes against the trivial validator set.

## 3. What the assertions prove

The test asserts three things:

\`\`\`rust
assert_eq!(decisions.len(), 1, "expected exactly one decided block");
let decided_hash = decisions[0];

let committed = bridge_for_check.committed.lock().unwrap().clone();
assert_eq!(committed, vec![decided_hash], "bridge must commit decided hash");
assert_eq!(
    *bridge_for_check.last_built.lock().unwrap(),
    Some(decided_hash),
    "decided hash must match what we built",
);
\`\`\`

In plain English:
1. **Exactly one decision came out** — not zero (chain didn't halt), not two (the \`stop_after_decisions = 1\` early-return worked correctly).
2. **The bridge committed the hash consensus agreed on** — proves the L10 commit path actually fired.
3. **The decided hash matches what \`build_payload\` produced** — proves the L11 propose path produced a value that round-tripped intact through Malachite's signing + broadcast + voting before coming back as Decided.

This is the **end-to-end check** for the course. If all three pass, every lesson from L1 through L12 just executed in sequence.

## 4. Reading the trace output

Run with \`RUST_LOG=info\`:

\`\`\`bash
RUST_LOG=informalsystems_malachitebft=info,openhl=info \\
  cargo test -p openhl-consensus first_block_via_engine_actors -- --nocapture
\`\`\`

You'll see (approximately):

\`\`\`
INFO  consensus: starting consensus engine
INFO  network: libp2p listening on /ip4/127.0.0.1/tcp/<port>
INFO  wal: opened wal at /tmp/.tmpXXX/wal
INFO  consensus: ConsensusReady — height=1, validators=1
INFO  consensus: starting height=1
INFO  consensus: proposer for height=1 round=0 is <our address>
INFO  consensus: building payload (parent=<genesis> attrs=...)
INFO  consensus: payload ready (id=PayloadId(1))
INFO  consensus: proposing height=1 round=0 value=<hash>
INFO  consensus: prevote (h=1 r=0 v=<hash>) from <our address>
INFO  consensus: polka reached at height=1 round=0
INFO  consensus: precommit (h=1 r=0 v=<hash>) from <our address>
INFO  consensus: decided at height=1 round=0 value=<hash>
INFO  consensus: committed via bridge: <hash>
INFO  consensus: starting height=2
\`\`\`

Each line maps to a sentence in this course. **Read this trace once.** It is the answer to "what does the chain actually do" for every layer you learned.

## 5. What to break next

Three pedagogical experiments worth running:

1. **Crank the propose-timeout down to 1ms.** Edit \`OpenHlConfig::new\` to set \`consensus.timeouts.timeout_propose = Duration::from_millis(1)\`. Rerun the test. What happens? (Hint: the test mode bridge calls are fast enough that this still works. But in production-mode with a real payload builder, this would lose the round.)

2. **Add a second validator.** Modify \`single_validator_node\` to generate two keypairs and put both in the validator set, but only run one node. What does the test do? (Hint: the second validator has no node, so its votes never arrive. The single running node has 1/2 voting power = 50%, which is below the 2/3 threshold. The chain stalls. **This is correct behavior** — BFT requires actual votes from at least 2/3 of voting power, not just the existence of validators.)

3. **Break the bridge.** Make \`StubBridge::commit\` return \`BridgeError::Internal(eyre!("oops"))\`. Rerun. What happens? (Hint: \`run_engine_app\` propagates the error, the spawned task returns \`Err\`, the test panics with the propagation chain. **Halt-the-chain behavior from L9 §4 in action.**)

> 🛑 **Anti-fluency.** "If the test passes, the chain works in production." **Not quite.** The test exercises the *correctness* of the four-message contract, the actor wiring, the trait impls. It does *not* exercise: liveness under network delays, byzantine validators, sync from a partial state, gossip propagation under load, real Reth payload assembly with mempool. Those are integration tests at a different scale. **The first-block test is a passing necessary condition, not a sufficient one for production readiness.**

## 6. What comes next — preview of Module 2

This course (Module 1 of openhl) builds the consensus substrate. Modules 2–5 build on top:

- **Module 2 — CLOB matching engine** — adds real transactions: a deterministic orderbook that produces matched fills. The first time \`LiveRethEvmBridge::validate_payload\` actually executes a block body (the test today validates empty blocks).
- **Module 3 — Core↔EVM precompiles** — custom REVM precompiles that let the EVM read CLOB state. Bridges the orderbook (off-EVM) and the EVM.
- **Module 4 — Funding, oracle, liquidations** — settlement loop. Where the chain looks like a perp DEX.
- **Module 5 — Vault primitive** — first-class on-chain object so Kodiak-style strategies are protocol-native, not app contracts.

The trait surface from this course doesn't change in modules 2–5. **The four messages stay four messages.** What changes is what the EL crate does inside \`build_payload\` (real transactions) and \`validate_payload\` (real execution against state).

## 7. Practice

1. **Trace your own run.** Run the test with \`RUST_LOG=info\` and \`--nocapture\`. Map each log line to a section of this course. Lines that don't map: open an issue. (There may be a few — production logging often outpaces curriculum coverage.)
2. **Predict the failure mode.** Without running it, predict what \`cargo test first_block_via_engine_actors\` does if you delete the \`reply.send(Next::Start(...))\` line in the Decided arm. Then run it and confirm.
3. **The two-validator stall.** Implement experiment 2 from §5. The chain stalls — observe what the trace looks like as it stalls. What's the last log line before silence?

> **Final check.** In one sentence, what is the difference between *"the test passed"* and *"the chain works in production"*? If your answer doesn't include "liveness under adversarial conditions" or "the test is a passing-necessary, not sufficient, condition," re-read §5's anti-fluency callout.

---

**Congratulations** — you've completed *Building OpenHL — Consensus Substrate*. The next course in the L1 Architect tier picks up at Module 2 (the CLOB matching engine), which is the first place real transactions enter the system.`,
                },
              ],
            },
          },
        ],
      },
    },
  });
}
