# Building OpenHL — L2 + L3 draft (EN)

> Drafted against openhl SHA `0844d58` (Stage 7c). L2 closes Module 1 (paired with L1, the contract); L3 opens Module 2 (paired with L4 and L5). Together they sit at the seam between "why this architecture" and "now meet the library that gives it to us."
> Course: `building-openhl-consensus-en` (track: `reth-l1-architect`, course #6 of 10).

---

## L2 — `openhl-consensus-convergence-en`

- **Module:** 1 (The execution/consensus split), sortOrder 1 within module
- **Course-level sortOrder:** 1 (lesson 2 of 13)
- **Duration:** 15 min
- **XP reward:** 40
- **Type:** CONTENT

### Content

````markdown
# Where Hyperliquid, Tempo, and CometBFT-based chains all converge

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

But the hybrid is not free. The EL must support **reorgs at the head** (revert a few blocks if Casper finalizes a different fork). This is where Reth's deep `BlockExecutor` complexity comes from — it has to be reorg-safe, not just append-only.

**openhl skips this entire complexity.** Pure BFT means no reorgs ever — Casper-style "this is finalized, that wasn't" is unnecessary because *everything* is finalized. The same property that forced HL and Tempo to be decide-first chains also bought us a simpler EL contract.

## 5. What openhl inherits

The decide-first pattern shapes openhl's design in three ways:

1. **`commit` is fire-and-forget** (L1 §4). No "are you sure?" round-trip because there's nothing to retract. The decision is already permanent before the EL hears about it.

2. **`validate_payload` exists** (L1 §3, L7 §3). Validators receive proposals from peers and ask the EL to check executability *before* voting. This is the optimistic-execution-equivalent for decide-first chains: we don't speculate post-state, but we *do* check the proposal is well-formed enough to commit to.

3. **No reorg machinery** (this lesson). The EL never has to undo a committed block. State growth is monotonic; the canonical chain is appendable-only. Reth's reorg support stays unused.

Each of these is a deliberate inheritance from the same forcing function — the BFT safety property.

> 🛑 **Predict.** A startup proposes "BFT chain with optimistic execution" — claims 2x throughput vs decide-first. **What's their architectural commitment that the table in §1 didn't expose?**

The answer: they're committing to a rollback-capable EL — an execution layer that can revert state when consensus votes against a speculatively-executed block. That's an order of magnitude more complex than the EL on a decide-first chain. **The 2x throughput claim is real but the engineering bill comes due in the EL.** Most teams that try this end up rewriting their EL twice before shipping.

## 6. Practice

1. **Find the convergence in code.** Open any CometBFT-based chain's repo (e.g., `cometbft/cometbft` itself, or a downstream like Osmosis). Locate where consensus "decides" and where the application "executes." Compare to openhl's `crates/consensus/src/engine_app.rs:119@0844d58` (the `AppMsg::Decided` arm walked in L10).
2. **Name the trade.** Bitcoin uses optimistic execution. **Why is this safe for Bitcoin?** Hint: think about what "decision" means in Bitcoin — when is it irreversible?
3. **The hybrid case.** Ethereum 2.0's LMD-GHOST + Casper hybrid means the EL must support reorgs. Find one place in Reth where this shows up (search `block_indices`, `reorg`, or `revert_state` in `reth-provider`).

> **Final check.** In one sentence, why does the decide-first-execute-after pattern *force* the four-message contract (L1 §4) to have separate `validate_payload` and `commit` methods? If your answer doesn't include "validation is speculative; commit is final; they happen at different protocol moments," re-read §2.
````

---

## L3 — `openhl-malachite-context-en`

- **Module:** 2 (Malachite as a library), sortOrder 0 within module
- **Course-level sortOrder:** 2 (lesson 3 of 13)
- **Duration:** 15 min
- **XP reward:** 40
- **Type:** CONTENT

### Content

````markdown
# What Malachite gives you — the `Context` trait

Malachite is one trait with ten associated types and four methods. **Once you've named the ten types, you've named your chain.** That's not metaphor — the consensus engine is parametric over those types, and every method's signature is derived from them. Pick the right types and Malachite drives consensus on them.

> 🛑 **Predict before scrolling.** A BFT consensus protocol needs to know about addresses, heights, values, votes, validators, and signatures. Sketch a Rust trait with associated types for each. We'll compare yours to Malachite's `Context` in §1, then look at openhl's concrete impl at `crates/consensus/src/context.rs:19@0844d58`.

## 1. The `Context` trait, named

From `informalsystems_malachitebft_core_types::Context`:

```rust
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
```

Ten types, four methods. The whole thing is about 90 lines including doc comments. **Reading this trait IS reading what your chain looks like to Malachite.**

Notice the constraints on the types: each has its own sub-trait (`Address`, `Height`, `Proposal<Self>`, etc.) that defines what operations Malachite expects. We'll inventory those in §2.

## 2. The ten types, each one

| Associated type | What it is | openhl chooses |
| :--- | :--- | :--- |
| `Address` | Validator identity (small, comparable) | `OpenHlAddress([u8; 20])` — Ethereum 20-byte convention |
| `Height` | Block height; monotonic counter | `OpenHlHeight(u64)` |
| `Value` | What consensus decides on | `OpenHlValue(BlockHash)` — wraps a 32-byte hash |
| `Validator` | A single validator (addr + key + power) | `OpenHlValidator { address, public_key, voting_power }` |
| `ValidatorSet` | Collection of validators | `OpenHlValidatorSet(Vec<OpenHlValidator>)` sorted (power desc, addr asc) |
| `Proposal` | The proposed value + round metadata | `OpenHlProposal { height, round, value, pol_round, address }` |
| `Vote` | Prevote or precommit | `OpenHlVote { height, round, value_id, vote_type, address }` |
| `ProposalPart` | Streamed proposal pieces (for large values) | `OpenHlProposalPart` (unit struct; ProposalOnly mode) |
| `Extension` | Application data attached to precommits | `()` (no extensions at v0) |
| `SigningScheme` | What signatures look like | `Ed25519` from `malachitebft-signing-ed25519` |

Each row maps to one file in `crates/consensus/src/types/` — that's the structure: **one type per file, ten files per chain.**

```
crates/consensus/src/types/
├── address.rs        ← OpenHlAddress
├── height.rs         ← OpenHlHeight
├── value.rs          ← OpenHlValue (wraps openhl_types::BlockHash)
├── validator.rs      ← OpenHlValidator + OpenHlValidatorSet
├── proposal.rs       ← OpenHlProposal
├── vote.rs           ← OpenHlVote
└── proposal_part.rs  ← OpenHlProposalPart
```

(Address-and-key together in `validator.rs`; `Extension` is `()` so no file needed; `SigningScheme` is shipped by Malachite, so no impl required.)

L4 walks each file in detail. For now: **knowing these ten types exist is half of knowing what Malachite is.** The other half is the four methods (§4).

> 🛑 **Anti-fluency.** "Malachite is Tendermint." **Almost wrong.** Malachite is the *abstract* Tendermint algorithm — the state machine, the proposal-vote-precommit dance, the 3f+1 quorum math — with the I/O ripped out. The actual CometBFT implementation owns I/O (libp2p, ABCI, mempool, network); Malachite owns just the algorithm. **That separation is what lets openhl use Malachite without inheriting CometBFT's whole runtime.**

## 3. The four methods

The methods construct the protocol's messages. Their signatures look minimal because the heavy lifting is in the types.

```rust
fn select_proposer(&self, validator_set: &Self::ValidatorSet,
                   height: Self::Height, round: Round)
    -> &Self::Validator;
```

Given a validator set + (height, round), return whose turn it is. openhl uses round-robin over sorted validators; `crates/consensus/src/context.rs:32@0844d58`. **The function must be deterministic** — every honest validator computes the same proposer for the same (height, round). Nondeterminism here forks the chain.

```rust
fn new_proposal(&self, height: Self::Height, round: Round,
                value: Self::Value, pol_round: Round,
                address: Self::Address) -> Self::Proposal;
fn new_prevote(...) -> Self::Vote;
fn new_precommit(...) -> Self::Vote;
```

Three message constructors — one for each consensus message type. **Why factory functions rather than direct struct construction?** Because the *protocol* (Malachite's `Driver`) needs to create these messages, but the *chain* defines what they look like. The factory pattern decouples protocol logic from message shape.

If your `Proposal` type carries extra fields beyond (height, round, value, pol_round, address), you can include them in your `new_proposal` impl. Malachite never sees them — they're chain-specific.

## 4. What's left for you

Malachite gives you the protocol. **It does NOT give you:**

| Concern | Who owns it |
| :--- | :--- |
| Choosing addresses | You (your chain's identity scheme) |
| Building validator sets | You (genesis + slashing logic) |
| Picking values to propose | You (`build_payload` via the bridge) |
| Validating values | You (`validate_payload` via the bridge) |
| Signing messages | You (`SigningProvider` impl — L9 §4) |
| Network gossip | The engine actor system (libp2p) |
| Persistence (WAL) | The engine actor system |
| Storage of decided blocks | You (EL state) |
| Mempool | You (EL transaction pool) |

The split is intentional. **Malachite is small** because it only owns the consensus algorithm. Everything chain-specific — addresses, signing, payload assembly, storage — is yours.

> 🛑 **Predict.** A team forks openhl to build a new chain. They want a different address format (32-byte Solana-style addresses instead of 20-byte Ethereum-style). **How many files do they touch?**

The answer: **one file — `crates/consensus/src/types/address.rs`.** Change `OpenHlAddress` from `[u8; 20]` to `[u8; 32]`, ensure it still implements `Address: Clone + Debug + Display + Eq + Ord + Send + Sync`, and you're done. Malachite doesn't care about the byte width; it only cares that the trait bounds are satisfied. The rest of the chain — proposer election, vote tallying, network gossip — works unchanged.

That's the parametricity payoff. The cost of getting it right is implementing all ten types up front; the reward is that swapping any single type changes nothing else.

## 5. Reading Malachite's `Driver`

The `Driver` from `malachitebft-core-driver` (which openhl's `run_single_validator` uses at `crates/consensus/src/runner.rs:34@0844d58`) is the protocol state machine. It exposes:

```rust
fn process(&mut self, input: Input<Ctx>) -> Result<Vec<Output<Ctx>>, Error<Ctx>>
```

The `Input<Ctx>` and `Output<Ctx>` enums are parameterized by your `Context`. Their variants carry your types:

- `Input::Proposal(SignedProposal<Ctx>, Validity)` — a proposal arrived. `SignedProposal` is generic over `Ctx::Proposal`.
- `Output::Vote(Ctx::Vote)` — broadcast this vote. Your `OpenHlVote` flows back to you.
- `Output::Decide(Round, Ctx::Proposal)` — consensus decided on this proposal.

**The `Driver` itself reads as if your types didn't exist.** It traffics in `Ctx::Address`, `Ctx::Vote`, `Ctx::Proposal` — never `OpenHlAddress`, `OpenHlVote`, `OpenHlProposal`. The whole protocol is type-parametric.

Why does this matter? Because **the entire Tendermint protocol is one piece of code, debugged once across every chain that uses it.** When Cosmos chains, openhl, Tempo, and others all use Malachite (or its conceptual equivalents), they all benefit from bug fixes to the algorithm itself. No chain has to re-implement BFT.

> 🛑 **Anti-fluency.** "Each BFT chain implements its own consensus." **No.** Each chain implements its own *types* and *I/O*. The algorithm is shared across the family — sometimes literally (chains using the same library) and sometimes conceptually (HotStuff variants converge on the same state machine). **Your job as an L1 architect is types and I/O, not the algorithm.**

## 6. Practice

1. **Inventory the types.** Without looking at the code, list the ten associated types of `Context` and what each one represents in your chain. Then open `crates/consensus/src/context.rs:19@0844d58` and check your list.
2. **The Solana-address experiment.** Sketch what would change if `OpenHlAddress` was `[u8; 32]` instead of `[u8; 20]`. Identify which files would change (hint: just one) and which would NOT change (hint: most of them).
3. **Find the Driver.** Read `crates/consensus/src/runner.rs:34-83@0844d58` (the start of `run_single_validator`). Identify every place where one of your `OpenHlContext` types appears versus where a Malachite-internal type appears. Where's the seam?

> **Final check.** In one sentence, why does Malachite's `Context` use *associated types* rather than just generic parameters (`Driver<Address, Height, Value, ...>`)? If your answer doesn't include "associated types lock in one set of types per chain — generics would let callers mix-and-match, which breaks the determinism invariant," re-read §3.
````

---

## Seed-file slot

L2 lands as the second lesson of Module 1 (right after L1); L3 opens Module 2:

```typescript
// Course.modules.create array:

{
  title: 'The execution/consensus split',
  sortOrder: 0,
  lessons: { create: [
    // L1: The contract between BFT and the EVM (already drafted)
    {
      title: 'Where Hyperliquid, Tempo, and CometBFT-based chains all converge',
      slug: 'openhl-consensus-convergence-en',
      type: 'CONTENT',
      sortOrder: 1,
      duration: 15,
      xpReward: 40,
      content: `# Where Hyperliquid, Tempo, and CometBFT-based chains all converge\n\n...`  // L2 markdown
    },
  ]}
},
{
  title: 'Malachite as a library',
  sortOrder: 1,
  lessons: { create: [
    {
      title: 'What Malachite gives you — the Context trait',
      slug: 'openhl-malachite-context-en',
      type: 'CONTENT',
      sortOrder: 0,
      duration: 15,
      xpReward: 40,
      content: `# What Malachite gives you — the \`Context\` trait\n\n...`  // L3 markdown
    },
    // L4: What you implement — proposals, validators, votes, signing (TBD)
    // L5: The actor model behind malachitebft-engine (TBD)
  ]}
}
```

**Module 1 now has both lessons drafted.** Module 2 has 1 of 3.

## SHA pinning discipline

All cites pin SHA `0844d58`. L2 is light on code cites (it's a conceptual/comparative lesson) but pinned where it matters:
- `crates/consensus/src/engine_app.rs:119` — the Decided arm L10 walks (referenced from L2 Practice exercise 1)

L3 cite-dense (it's the trait-introduction lesson):
- `crates/consensus/src/context.rs:19` — `OpenHlContext` impl
- `crates/consensus/src/context.rs:32` — `select_proposer` round-robin
- `crates/consensus/src/types/*.rs` — the per-type modules (referenced as a pattern, not individual line numbers)
- `crates/consensus/src/runner.rs:34` — the `run_single_validator` Driver setup

When L4 lands (per-type walk), it should cite specific line numbers inside each `crates/consensus/src/types/*.rs` file. L3 only needs the directory structure.

## Style review notes (self-critique before paste)

- **L2 is unusually framed as a comparative lesson.** Most of the course is "here's our code." L2 is "here's why every chain looks like our code." Different mode of argument — closer to the consensus-engineering course's tone than the rest of Module 1's "your code, walked" tone. If a reviewer finds this jarring, soften by adding more openhl-specific cites in §5 ("what openhl inherits") — currently mostly forward-references.
- **L2's table in §1** is the load-bearing artifact. If reviewers want to expand or contract, the column count is the parameter — current 3-column form (chain, family, when-execute) is the minimum. Could add a 4th column (sacrifices) without bloat.
- **L3 §2's "ten types, one file per type" framing** is critical setup for L4. L4 will assume the reader knows the file structure; L3 introduces it. If L4 ends up restructuring (e.g., merging validator + validator_set into one type), L3 needs a parallel update.
- **L3 §5's "the Driver reads as if your types didn't exist"** is the deepest insight in the lesson. Don't cut it in review — it's the moment where parametricity-as-design-discipline lands.
- **L3 is heavier on conceptual claims than L1/L7/L10.** It's the parametricity lesson; the trait abstracts everything. If reviewers find it abstract, the fix is more code excerpts, not more prose. Practice exercise 3 (read the Driver code, identify the type seam) anchors the abstraction in concrete reading.

## Curriculum status

Nine lessons drafted as durable files:

| Lesson | Module | File | Status |
| --- | --- | --- | --- |
| L1 — Contract between BFT and the EVM | 1 | `drafts/openhl_l1_en.md` | ✓ |
| **L2 — Where chains converge** | **1** | **`drafts/openhl_l2_l3_en.md`** | **✓ NEW** |
| **L3 — Malachite's Context trait** | **2** | **`drafts/openhl_l2_l3_en.md`** | **✓ NEW** |
| L7 — Engine API | 3 | `drafts/openhl_l7_l10_en.md` | ✓ |
| L9 — Designing the ConsensusBridge | 4 | `drafts/openhl_l9_en.md` | ✓ |
| L10 — Decided → forkchoice | 4 | `drafts/openhl_l7_l10_en.md` | ✓ |
| L11 — Producing blocks | 4 | `drafts/openhl_l11_en.md` | ✓ |
| L12 — Devnet bootstrap | 5 | `drafts/openhl_l12_l13_en.md` | ✓ |
| L13 — First block | 5 | `drafts/openhl_l12_l13_en.md` | ✓ |

| Module | Drafted | Total |
| --- | --- | --- |
| 1. Execution/consensus split | **L1 + L2** | **2 / 2 ✓** |
| 2. Malachite as a library | L3 | 1 / 3 |
| 3. Reth as a library | L7 | 1 / 3 |
| **4. Wiring it up** | **L9 + L10 + L11** | **3 / 3 ✓** |
| **5. Single-validator devnet** | **L12 + L13** | **2 / 2 ✓** |

**Module 1 complete. Modules 4 and 5 already complete. 9 of 13 lessons drafted across 6 files.**

Remaining four lessons:
- **L4 — Implementing Context sub-types** (the per-type deep dive; the heaviest remaining lesson)
- **L5 — The actor model behind malachitebft-engine** (ractor introduction + the engine_app loop revisited)
- **L6 — Reth without the geth-shape (NodeBuilder pattern)**
- **L8 — Payload building inside Reth**

Natural pairings: **L4 + L5** (closes Module 2), **L6 + L8** (closes Module 3).

The course can now ship a complete-feeling "spine + closer" without the middle: L1 → L2 → L3 → L7 → L9 → L10 → L11 → L12 → L13. That's 9 lessons / ~140 min that any reader can profitably consume in order, with L4 + L5 + L6 + L8 marked as forthcoming.
