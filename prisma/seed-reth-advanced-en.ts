import { PrismaClient } from '@prisma/client';

export async function seedRethAdvancedEN(prisma: PrismaClient) {
  const tags = ['reth', 'rust', 'advanced', 'exex', 'staged-sync', 'reth-sdk'];

  await prisma.course.create({
    data: {
      slug: 'reth-advanced-en',
      title: 'Inside Reth — Sync, Extensions, and the SDK',
      description:
        'Read the real Reth source: Staged Sync (the 10-stage pipeline), ExEx (Execution Extensions for in-process indexers / MEV / risk engines), and the Reth SDK (compose your own App-chain). One of three independent Advanced courses (Revm, Reth, Alloy) — Inside Revm is the recommended prerequisite since several lessons here assume comfort with the `Database` trait and Revm execution model.',
      difficulty: 'INTERMEDIATE',
      duration: 145,
      xpReward: 470,
      track: 'reth-advanced',
      tags,
      isPublished: true,
      sortOrder: 220,
      locale: 'en',
      instructorName: 'RethLab',
      modules: {
        create: [
          {
            title: 'Welcome',
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: 'Welcome to Inside Reth — how this course works',
                  slug: 'reth-advanced-welcome-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 7,
                  xpReward: 15,
                  content: `# Welcome to Inside Reth — how this course works

This course is one of three independent Advanced-tier courses on RethLab:

- **Inside Revm** — Inside the EVM engine *(recommended first if you haven't done it)*
- **Inside Reth** (you are here) — Inside Reth: Staged Sync, ExEx, the Reth SDK
- **Inside Alloy** *(coming soon)* — Inside Alloy: Provider, Network, Signer

These three are independent, but **several lessons here assume comfort with the \`Database\` trait and Revm execution model from Inside Revm**. If those concepts feel shaky, do Inside Revm first.

> 📋 **First time at the Advanced tier?** Read **"How Advanced courses work"** at the end of *Bridge to Advanced* before starting. It explains the editorial style (Predict prompts, Quiz gates, the build-up → walkthrough → quiz → drill chain shape) and pacing — applies to all three Advanced courses, so you only read it once.

## What this course teaches

You'll read the [\`paradigmxyz/reth\`](https://github.com/paradigmxyz/reth) source line by line: the \`Stage\` trait and the 10-stage sync pipeline, **ExEx (Execution Extensions)** for in-process indexers / MEV / risk engines, and the **Reth SDK** for composing your own App-chain. Three topic chains, each with build-up + walkthrough + quiz + drill.

By the end, you'll have read enough Reth internals to ship a node-speed indexer or a custom App-chain.

## Prerequisites

**Revm internals** (if you haven't done Inside Revm):
- The \`Database\` trait surface and how Revm reads state through it
- How \`Stage\` and \`Database\` interact during \`ExecutionStage\`

**Block-level Ethereum** (covered in Bridge to Advanced):
- Block structure (header / body / receipts), reorgs as a normal phenomenon
- What sender recovery, transaction body decoding, and receipts contain

**Intermediate Rust** (also Bridge to Advanced; there's a *Rust: lifetimes, Box, Arc, dyn Trait* lesson inside this course for self-checking):
- Generics with trait bounds, \`?Sized\`, \`dyn Trait\` vs \`impl Trait\`
- \`Arc<T>\`, \`Mutex<T>\`, \`RwLock<T>\` — when to use each
- \`async\` / \`Future\` / \`Stream\` basics
- \`auto_impl\` macros and procedural attributes

**Shaky on Revm?** Do Inside Revm first. The Stage trait and the SDK both reference Revm types directly.

## Setup — do this once

Before lesson 1, have these ready in another window:

1. **\`paradigmxyz/reth\` cloned** — \`git clone https://github.com/paradigmxyz/reth\`
2. **\`bluealloy/revm\` cloned** — \`git clone https://github.com/bluealloy/revm\` (cross-referenced during ExEx and SDK lessons)
3. **A working \`cargo\` toolchain** — \`rustc --version\` should print something modern
4. **\`cargo-expand\`** — \`cargo install cargo-expand\` (procedural macros across both repos)
5. **A second monitor or split terminal** — you'll be cross-referencing source while you read

The "Find in repo" prompts only work if you actually have the repos open. Close that loop before starting.

## You're ready

Scroll back to the course detail and start with **Building the \`Stage\` trait step by step**.

After Inside Reth: head to **Inside Alloy** if you haven't yet — or move on to **Expert** for the procedural-macro and zkVM-integration deep dives.`,
                },
              ],
            },
          },
          {
            title: 'The Reth Stack — Sync, Extensions, and the SDK',
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: 'Building the \`Stage\` trait step by step',
                  slug: 'staged-sync-buildup-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 10,
                  xpReward: 25,
                  content: `# Building the \`Stage\` trait step by step

Staged Sync is the spine of Reth. **It also looks intimidating** — the real \`Stage\` trait has 6 methods, async readiness, two-direction symmetry, and an \`auto_impl(Box)\` attribute. Walk it cold and you get six new ideas at once.

This lesson builds the trait up from the simplest possible sync loop. By the end you'll have built every piece of:

\`\`\`rust
#[auto_impl::auto_impl(Box)]
pub trait Stage<Provider>: Send {
    fn id(&self) -> StageId;
    fn poll_execute_ready(&mut self, _cx: &mut Context<'_>, _input: ExecInput)
        -> Poll<Result<(), StageError>> { Poll::Ready(Ok(())) }
    fn execute(&mut self, provider: &Provider, input: ExecInput)
        -> Result<ExecOutput, StageError>;
    fn post_execute_commit(&mut self) -> Result<(), StageError> { Ok(()) }
    fn unwind(&mut self, provider: &Provider, input: UnwindInput)
        -> Result<UnwindOutput, StageError>;
    fn post_unwind_commit(&mut self) -> Result<(), StageError> { Ok(()) }
}
\`\`\`

> 📂 **Open \`paradigmxyz/reth\` in another tab.** Cross-check at every step.

## Step 0 — The naive sync: block by block

Without thinking, you'd write Ethereum sync as:

\`\`\`rust
fn sync_to_tip(client: &mut RethNode) -> Result<(), Error> {
    while let Some(block) = client.next_block()? {
        let header = client.fetch_header(block)?;
        let body   = client.fetch_body(block)?;
        let senders = recover_senders(&body)?;
        let receipts = client.execute(&block, &header, &body)?;
        client.update_state(receipts)?;
        client.update_merkle_root(&block)?;
        client.write_indexes(&block)?;
        client.commit()?;
    }
    Ok(())
}
\`\`\`

One block at a time. Each block goes through every phase before the next block starts.

> 🛑 **Predict.** Without scrolling: name three reasons this naive design is *catastrophically* slow at 20M blocks. (Hint: each is a different *kind of* inefficiency.)

The three:

1. **No batching.** ECDSA sender recovery is the same operation 200 times per block. Doing it in 200 separate calls is 200 separate setup costs.
2. **No I/O amortization.** Writing one Merkle root per block means 20M \`commit()\` calls — each touches disk. Batched, you write Merkle roots once per million blocks.
3. **No parallelism.** Headers don't depend on tx execution; sender recovery doesn't depend on the previous block. But the loop blocks on each phase.

The fix: **split the work into stages.** Each stage processes a *range of blocks* end-to-end before handing off.

## Step 1 — Sketch the stages

\`\`\`rust
let stages = vec![
    HeaderStage,       // download headers for blocks [N..M]
    BodyStage,         // download tx bodies
    SenderRecovery,    // ECDSA-recover senders (parallel)
    Execution,         // run Revm, accumulate state diffs
    Hashing,           // sort hashed account/storage changes
    Merkle,            // compute Merkle roots for the range
    Indexes,           // build txhash → (block, index) etc.
    Finish,            // commit + report
];

for stage in &mut stages {
    stage.run(blocks_n_to_m)?;
}
\`\`\`

Now sender recovery batches across blocks, Merkle roots are amortized, and you can parallelize within stages. **The data structure is a list of stages, each implementing one trait.** Build the trait next.

## Step 2 — The first stab at \`Stage\`

> 🛑 **Predict.** Sketch the trait. What method does the orchestrator call? What does the stage return? Hold your guess.

First attempt:

\`\`\`rust
trait Stage {
    fn execute(&mut self, blocks: BlockRange) -> Result<(), StageError>;
}
\`\`\`

One method. Caller passes a range, stage processes it. Done.

This works for forward sync — but it has a critical hole.

## Step 3 — \`unwind\`: reorgs are not optional

> 🛑 **Predict.** Ethereum reorgs aren't a special case — they happen routinely. Without scrolling: how does this single-method \`Stage\` handle a reorg from block 1000 → block 980?

You'd need a *separate* method, not on this trait — and a separate code path in the orchestrator. Half the codebase becomes "the reorg path." That's exactly what other Ethereum clients have, and exactly what Reth was designed to avoid.

Reth's answer: **add \`unwind\` to the same trait**:

\`\`\`rust
trait Stage {
    fn execute(&mut self, blocks: BlockRange) -> Result<(), StageError>;
    fn unwind(&mut self, blocks: BlockRange) -> Result<(), StageError>;
}
\`\`\`

Going forward = call \`execute\` over a range. Going back = call \`unwind\` over a range. **Same trait, two directions.** Reorgs become a normal mode of operation, not a special case. **This symmetry is the architectural keystone.**

## Step 4 — \`ExecInput\` / \`ExecOutput\`: explicit resumability

\`BlockRange\` is too thin. The orchestrator needs to tell the stage:

- *Where to stop.* A target block.
- *Where to resume.* The stage's checkpoint from the last run (after a node restart).

And the stage needs to tell the orchestrator:

- *Where it stopped.* New checkpoint.
- *Whether it's done.* If \`false\`, the orchestrator should call again — backpressure control.

\`\`\`rust
pub struct ExecInput {
    pub target: Option<BlockNumber>,
    pub checkpoint: Option<StageCheckpoint>,
}
pub struct ExecOutput {
    pub checkpoint: StageCheckpoint,
    pub done: bool,
}
pub struct UnwindInput {
    pub checkpoint: StageCheckpoint,
    pub unwind_to: BlockNumber,
    pub bad_block: Option<BlockNumber>,
}
\`\`\`

> 🛑 **Anti-fluency.** Why is \`done\` returned as a *flag inside* \`ExecOutput\`, not a separate \`has_more()\` method? What design constraint is that choice serving?

Atomic call/return. The orchestrator wants exactly one piece of feedback per turn: "I made progress to checkpoint X; whether you call me again is your decision." A separate \`has_more()\` would force the orchestrator into two calls per turn and open a class of bugs where checkpoint and has_more disagree.

## Step 5 — Async readiness: \`poll_execute_ready\`

A stage that downloads headers can't always execute *immediately* — it has to wait for network responses. But the orchestrator wants to schedule across stages without blocking on one slow stage.

\`\`\`rust
fn poll_execute_ready(&mut self, _cx: &mut Context<'_>, _input: ExecInput)
    -> Poll<Result<(), StageError>>
{
    Poll::Ready(Ok(()))  // default: always ready
}
\`\`\`

A Rust async-style poll method. Stages that are always ready (most of them) take the default. Stages that wait on I/O override it to return \`Poll::Pending\` while their futures are in flight.

**The orchestrator polls each stage; if pending, it moves on.** No stage blocks the others.

## Step 6 — Commit hooks: \`post_execute_commit\` / \`post_unwind_commit\`

Some stages need to do work *after* their data is committed to disk — emit metrics, broadcast a notification, prune old data. These hooks let stages do that without polluting \`execute\` with "are we committed yet?" logic.

\`\`\`rust
fn post_execute_commit(&mut self) -> Result<(), StageError> { Ok(()) }
fn post_unwind_commit(&mut self) -> Result<(), StageError> { Ok(()) }
\`\`\`

Default no-op; stages override only when they need it. **Most don't.** Opt-in lifecycle, not mandatory plumbing.

## Step 7 — \`#[auto_impl(Box)]\`: heterogeneous stage list

The orchestrator stores stages in a \`Vec<Box<dyn Stage<...>>>\`. That requires \`Stage\` to be implemented for \`Box<S>\` where \`S: Stage\`.

Without the attribute, you'd manually write:

\`\`\`rust
impl<S: Stage<P>> Stage<P> for Box<S> {
    // forward all 6 methods through (**self).method(...)
}
\`\`\`

\`auto_impl\` is a procedural macro that generates this forwarding. With \`#[auto_impl(Box)]\`, the orchestrator can hold a list of differently-typed stages and call them all through the same trait object.

## What you've built

Every piece earned its keep:

- **\`execute\` / \`unwind\`** (Steps 3–4) — symmetry: forward and reorg use the same surface
- **\`ExecInput\` / \`ExecOutput\`** (Step 4) — explicit resumability across restarts
- **\`done\` as a flag** (Step 4) — atomic call/return
- **\`poll_execute_ready\`** (Step 5) — async readiness, non-blocking scheduling
- **\`post_*_commit\`** (Step 6) — opt-in lifecycle hooks
- **\`#[auto_impl(Box)]\`** (Step 7) — heterogeneous stage list

The next lesson tours Reth's actual 10-stage pipeline — what each stage does and why the order matters.

## Recall before moving on

Without scrolling:

1. Why is \`unwind\` on the same trait as \`execute\`?
2. What does \`done: bool\` enable that \`has_more()\` wouldn't?
3. Why does \`poll_execute_ready\` exist? Which stages would override it?
4. What does \`#[auto_impl(Box)]\` save you from writing?

If any answer is shaky, scroll back. The next lesson is Reth's actual pipeline.
`,
                },
                {
                  title: "Reth's pipeline: 10 stages, in order",
                  slug: 'staged-sync-pipeline-en',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 10,
                  xpReward: 25,
                  content: `# Reth's pipeline: 10 stages, in order

Picture your node a minute after it joins the network. It has just pulled down 10 million blocks worth of headers from peers. Now it has to turn that pile of headers into a fully validated chain — execute every transaction, recompute every state root, build every index. Done block-by-block the way old clients did it, that takes **weeks**. Reth does it in **hours**.

The trick: don't process one block at a time. Process **one *operation* at a time, across thousands of blocks** — recover all the senders, then execute all the transactions, then hash all the accounts, and so on. That's "staged sync." There are 10 stages, they run in a fixed order, and **the order is not arbitrary** — every constraint between stages is encoded in which one runs when.

(Last lesson you built up the \`Stage\` trait. The 10 stages below are the actual implementations.)

\`\`\`mermaid
flowchart LR
    H[HeaderStage] --> B[BodyStage]
    B --> S[SenderRecoveryStage]
    S --> E[ExecutionStage]
    E --> AH[AccountHashingStage]
    AH --> SH[StorageHashingStage]
    SH --> M[MerkleStage]
    M --> T[TransactionLookupStage]
    T --> I[IndexHistoryStages]
    I --> F[FinishStage]
\`\`\`

Open \`crates/stages/stages/src/stages/\` in the Reth repo as you read.

## The 10 stages

| # | Stage | What it does | Hot loop |
| - | ----- | ------------ | -------- |
| 1 | \`HeaderStage\` | Download block headers | network I/O |
| 2 | \`BodyStage\` | Download tx bodies + uncles | network I/O |
| 3 | \`SenderRecoveryStage\` | ECDSA-recover the sender of each tx (turn the signature back into the address that signed it) | CPU (parallel) |
| 4 | \`ExecutionStage\` | Run Revm; accumulate state diffs | CPU (Revm) |
| 5 | \`AccountHashingStage\` | Sort account changes by hashed key | sort + write |
| 6 | \`StorageHashingStage\` | Sort storage changes by hashed key | sort + write |
| 7 | \`MerkleStage\` | Update Merkle Patricia Trie roots (Ethereum's state-tree hash structure) | tree compute |
| 8 | \`TransactionLookupStage\` | Build \`tx_hash → (block, index)\` index | sort + write |
| 9 | \`IndexAccountHistoryStage\` + \`IndexStorageHistoryStage\` | Historical access indices | sort + write |
| 10 | \`FinishStage\` | Bookkeep, finalize | none |

> 🛑 **Compare your prediction from last lesson.** What stages did you list that *aren't* here? Sometimes the omissions are more revealing than the inclusions — Paradigm chose not to bundle "PrunerStage" into this list (pruning runs separately, on its own schedule).

## Order matters: three constraints

The pipeline's order is fixed by three constraints. Each one forces one stage to come before another.

### Constraint 1 — \`MerkleStage\` must come *after* hashing

> 🛑 **Predict.** A Merkle Patricia Trie root needs leaves in sorted-by-hashed-key order. **What does that say about how hashing must be staged?**

The Merkle stage consumes sorted hashed keys. Account hashing and storage hashing must finish — and commit their sort — before Merkle starts. Interleaving doesn't work: the Merkle stage needs the *whole sorted set* for the block range it's processing.

That's why \`AccountHashingStage\` (5) and \`StorageHashingStage\` (6) come before \`MerkleStage\` (7). **In this specific order, with full commits between them.**

### Constraint 2 — \`AccountHashingStage\` and \`StorageHashingStage\` *could* run in parallel

Both consume \`ExecutionStage\`'s output. They produce independent sorted change sets (account-keyed vs storage-keyed). So why does the pipeline run them sequentially?

> 🔍 **Open \`account_hashing.rs\` and \`storage_hashing.rs\`.** Read the first 30 lines of each. What do they share? What's the practical reason Reth doesn't fork off two threads here?

Two reasons:

1. **Disk write contention.** Both stages write to MDBX (Reth's embedded key-value store). Running them in parallel would contend on the database lock with no compute benefit.
2. **Pipeline simplicity.** Sequential execution lets the orchestrator's scheduler stay a flat list. Parallel branches would require a DAG scheduler (one that can run independent stages concurrently) — more complexity, marginal gain.

The Frontiers 2025 talk (linked at the bottom) discusses exactly this trade-off — what *did* get parallelized and what stayed sequential, and why.

### Constraint 3 — \`SenderRecoveryStage\` is the parallelism win

> 🛑 **Predict.** Of all 10 stages, which one benefits *most* from parallelism, and why?

\`SenderRecoveryStage\`. ECDSA recovery — turning a transaction signature back into the signer's address — is pure CPU, no shared state, embarrassingly parallel. Reth uses Rayon (Rust's data-parallelism library) to fan it out across all CPU cores.

What makes this stage the standout:

- **Massive batch size.** Each block has 100–300 transactions; a stage call processes 100K+ blocks at a time = 10–30M signatures per call.
- **No data dependencies.** Each recovery is independent — no waiting on previous results.
- **Pure compute.** No I/O between recoveries.

\`ExecutionStage\` (4) is also CPU-bound but has *sequential* state dependencies — block N's storage writes affect block N+1's reads. You can't trivially parallelize it without optimistic execution (Block-STM and similar schemes, which speculatively run blocks in parallel and re-run on conflict), which brings its own consensus complications.

## Why staged sync wins

Block-by-block sync (geth's old default) does ~50–100 blocks/sec at full tilt. Staged sync does 10K+ blocks/sec. The 100× comes from three compounding factors:

1. **Batching.** Sender recovery, hashing, Merkle root computation — all amortized across thousands of blocks per call.
2. **Stage-level parallelism.** Within a stage (especially \`SenderRecoveryStage\`), Rayon fans work across all cores.
3. **I/O amortization.** Disk writes happen in big sorted batches at stage boundaries, not after every block.

> 🛑 **Final predict.** Try to attribute the 100× to specific stages before reading on. Which one contributes the most?

Roughly: ECDSA recovery batched + parallelized contributes ~10×; Merkle root computed once per range instead of per block contributes another ~10×; sorted batched writes that MDBX handles efficiently contribute ~3×. Multiplied: ~300× theoretical; the practical number lands around 100–200× depending on hardware.

## Recall before the quiz

Without scrolling:

1. Why is \`MerkleStage\` *after* hashing, not interleaved?
2. Why don't \`AccountHashingStage\` and \`StorageHashingStage\` run in parallel, even though they could?
3. Of the 10 stages, which has the biggest parallelism win and why?
4. Three reasons staged sync is faster than block-by-block?

The next lesson is a quiz. Engage with these recalls now if any answer is shaky.

## 📺 Further watching

\`\`\`youtube
zntRpCKHyDc | Georgios Konstantopoulos — Reth: A New Rust Ethereum Client (architecture intro)
\`\`\`

\`\`\`youtube
z3tj8Lk_Ydo | Alexey Shekhirin & Dan Cline — Hyperoptimizing Reth (Frontiers 2025, pipeline perf)
\`\`\`
`,
                },
                {
                  title: 'Quiz: did the Stage trait + pipeline shape stick?',
                  slug: 'staged-sync-quiz-en',
                  type: 'QUIZ',
                  sortOrder: 2,
                  duration: 4,
                  xpReward: 25,
                  content: `# Quiz: did the Stage trait + pipeline shape stick?

Four questions covering the trait design and the pipeline ordering constraints. Same rule: **you can't nod past a quiz.**

If you miss two or more, scroll back to *Building the Stage trait* before going on to the drill.`,
                  quizQuestions: [
                    {
                      question: "Why is `unwind` a method on the same `Stage` trait as `execute`, instead of a separate 'reorg' trait or method?",
                      options: [
                        "Reorgs are rare enough that it's a stylistic choice.",
                        "Rust requires symmetric methods on traits.",
                        "Reorgs are a normal mode of operation; putting them on the same trait makes 'forward over a range' and 'back over a range' structurally identical, which removes a parallel 'reorg path' from the codebase.",
                        "It's a backwards-compat shim from an older Reth version.",
                      ],
                      correctIndex: 2,
                      explanation: "Reth's design treats reorgs as routine, not special. Same trait → same orchestrator scheduler, same per-stage logic. A separate reorg trait would force every stage to be implemented twice and would split the orchestrator into a forward path and a reverse path — exactly what other clients have, and exactly what Reth was built to avoid.",
                    },
                    {
                      question: "Why does `ExecOutput.done` return a flag inside the result instead of being a separate `has_more()` method?",
                      options: [
                        "It's stylistic — both work equally well.",
                        "A separate `has_more()` would force the orchestrator into two calls per turn (execute, then has_more) and open a class of bugs where checkpoint and has_more disagree. The flag inside the output makes the call atomic — `execute` returns one snapshot of its state.",
                        "Rust's type system can't express `has_more()`.",
                        "To enable async cancellation.",
                      ],
                      correctIndex: 1,
                      explanation: "Atomic call/return matters here. The orchestrator wants exactly one piece of feedback per turn: 'I made progress to checkpoint X; whether you call me again is your decision.' Splitting that into two methods opens reasoning gaps about what happens between them.",
                    },
                    {
                      question: "Why is `MerkleStage` placed *after* both `AccountHashingStage` and `StorageHashingStage`, not interleaved?",
                      options: [
                        "It's a historical accident; the order could be different.",
                        "A Merkle Patricia Trie root requires leaves in sorted-by-hashed-key order. The hashing stages produce that sorted order; Merkle needs the full sorted set for its block range, so hashing must complete and commit before Merkle starts.",
                        "`MerkleStage` is slower than hashing; it's placed last for performance.",
                        "To save memory.",
                      ],
                      correctIndex: 1,
                      explanation: "An algorithmic constraint: Merkle root computation cannot start until its sorted leaves are committed. Hashing is the producer, Merkle is the consumer. Producer completes, then consumer runs. Interleaving would force partial Merkle recomputation, which costs more than just batching properly.",
                    },
                    {
                      question: "Of Reth's 10 stages, `SenderRecoveryStage` benefits most from parallelism. Why is it the one, not (say) `ExecutionStage`?",
                      options: [
                        "`SenderRecoveryStage` has more transactions to process than `ExecutionStage`.",
                        "Sender recovery is embarrassingly parallel: each ECDSA recovery is independent of every other, no shared state. Execution has sequential state dependencies — block N's storage writes affect block N+1's reads — so it can't be trivially parallelized.",
                        "Rayon doesn't work inside `ExecutionStage`.",
                        "`ExecutionStage` already saturates a single core, so parallelism wouldn't help.",
                      ],
                      correctIndex: 1,
                      explanation: "ECDSA recovery is independent across signatures; you can fan it across all cores trivially. Execution has consensus-defined sequential state dependencies — parallelizing it requires optimistic execution (Block-STM, etc.) with its own complications. Sender recovery is the standout because its work shape matches Rayon's model perfectly.",
                    },
                  ],
                },
                {
                  title: 'Drill: read \`SenderRecoveryStage\` end-to-end',
                  slug: 'staged-sync-drill-en',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 12,
                  xpReward: 25,
                  content: `# Drill: read \`SenderRecoveryStage\` end-to-end

Reading is rehearsal. **Doing is memory.** This drill takes you from "I've read about staged sync" to "I have read \`SenderRecoveryStage\` line by line and answered three architectural questions about it from the source."

## Setup

\`\`\`bash
git clone https://github.com/paradigmxyz/reth
cd reth
\`\`\`

You don't need to build it — this is a reading drill, not a compile drill.

## The target file

\`crates/stages/stages/src/stages/sender_recovery.rs\`

Open it. We'll work through it in order.

## Drill 1 — Find the \`Stage\` impl

> 🛑 **Predict before scrolling.** What does \`SenderRecoveryStage::execute\` do, in one sentence? What's the "compute" inside it? What's the "I/O" around the compute? Hold your sentences.

Open the file. Find \`impl<Provider> Stage<Provider> for SenderRecoveryStage\`. The \`execute\` method is your target.

Skim the method body. Identify three sections:

1. **Read** — pull tx envelopes for blocks in the input range from MDBX
2. **Compute** — ECDSA-recover senders for each tx (this is where Rayon enters)
3. **Write** — write recovered senders back to MDBX, update checkpoint

If your sentences from the predict prompt missed the read/compute/write split, scroll back and re-read the build-up lesson's Step 1 — that shape is the entire pipeline pattern, not unique to this stage.

## Drill 2 — Find the batch loop

The stage doesn't process *every* block in \`ExecInput.target\` at once. It batches.

> 🔍 **Find the batch loop.** Search for \`commit_threshold\` or \`chunk\` or \`batch\` in the file.

> 🛑 **Question (write it down):** Why batch? Why not process every block in the range in one shot?

Two reasons:

1. **Memory.** Holding 10M signatures' worth of envelope buffers in RAM is expensive. Batches keep the working set bounded.
2. **Backpressure.** After each batch, the stage can return \`done: false\` and let the orchestrator decide whether to commit and move on, or call again. Without batching, the stage commits everything or nothing.

The \`commit_threshold\` field on the stage struct controls the batch size. **Find its default value** — that's a tunable that matters in production.

## Drill 3 — Find where \`done: false\` is returned

Search for \`done: false\` or \`ExecOutput { done\` in the method body.

> 🛑 **Question:** What condition makes \`done\` flip to \`true\`?

When the stage has processed all blocks up to \`ExecInput.target\` (no more work in this range). Until then, \`done: false\` tells the orchestrator "call me again on the next batch." Once true, the orchestrator advances to the next stage.

## Drill 4 — Find the Rayon parallelism

Search for \`par_iter\` or \`rayon::\` in the file.

> 🔍 **Question:** Where does Rayon enter? On what data?

It's on the inner ECDSA recovery loop — usually shaped like:

\`\`\`rust
chunk.par_iter()
    .map(|tx| recover_signer(tx))
    .collect::<Vec<_>>()
\`\`\`

Each transaction's sender recovery is independent → safe to fan across cores → Rayon does the work.

> 🛑 **Final question (write your answer down):** If the chain had 20× more transactions per block but the same number of cores, would \`SenderRecoveryStage\` get *20×* slower? Why or why not?

It scales sub-linearly. With more transactions per block, each Rayon batch grows but core count stays the same — wall-clock time grows roughly linearly with total signatures, but per-batch overhead (chunking, channel coordination) is amortized over more work, so total throughput improves slightly. **Net: ~15–18× slower for 20× more signatures**, depending on cache behavior.

## End-of-lesson recall

Without scrolling, in your own words:

1. What's the read/compute/write structure of \`SenderRecoveryStage::execute\`?
2. What does \`commit_threshold\` control, and why does it exist?
3. Why is Rayon's parallelism applied to ECDSA recovery and not (say) MDBX writes?
4. Why does \`done: false\` exist as a return state at all? What would break if every \`execute\` had to finish the whole range?

If any answer is shaky, the lesson isn't done with you. Re-read the relevant build-up step or re-open the file.

After this drill, you've read the same code Paradigm uses to keep Reth in sync.`,
                },
                {
                  title: 'Rust: lifetimes, Box, Arc, dyn Trait',
                  slug: 'rust-lifetimes-arc-dyn-en',
                  type: 'CONTENT',
                  sortOrder: 4,
                  duration: 15,
                  xpReward: 30,
                  content: `# Rust: lifetimes, Box, Arc, dyn Trait

Open any ExEx source file. The first ten lines will throw \`Arc<>\`, \`'static\`, \`dyn Trait\`, and \`Box<>\` at you. Four "advanced but actually simple" Rust features — and you need every one to read the code Reth ships with. **This lesson tests you, not teaches you** — if you stumble on the predict prompts, the gap is real and worth closing.

> 🛑 **Cold start: define each in one sentence.** Without scrolling:
> - \`'a\` (a lifetime parameter)
> - \`'static\`
> - \`Box<T>\`
> - \`Arc<T>\` (vs \`Rc<T>\`)
> - \`Mutex<T>\`
> - \`dyn Trait\`
>
> If you stumbled on more than two, this lesson earns its place. If you breezed through, the lesson tests whether your definitions are *actually right*.

## 1. Lifetimes \`'a\`

A lifetime annotation tells the compiler **how long a borrow lives**.

\`\`\`rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() >= y.len() { x } else { y }
}
\`\`\`

- \`'a\` is a label for "some lifetime"
- Both inputs and the output share the same \`'a\` → "the returned reference lives at least as long as both inputs"
- Often the compiler infers them — **most signatures don't need explicit lifetimes**

> 🛑 **Anti-fluency.** Delete the \`'a\` annotations from \`longest\`. What error does the compiler give? Be precise — name the rule it cites.

### \`'static\`

\`'static\` means **"lives for the entire program."** String literals are \`&'static str\`:

\`\`\`rust
let s: &'static str = "hello";
\`\`\`

Long-running tasks (like ExEx) often require \`'static\` bounds because they can outlive any local scope.

> 🛑 **Predict.** When does a closure passed to \`tokio::spawn\` (Tokio is Rust's async runtime — the executor that drives futures) need to be \`'static\`? Why? Answer before continuing — this exact bound shows up in every ExEx file you'll ever read.

## 2. \`Box<T>\` — heap allocation

When you want a value on the heap rather than the stack, wrap it in \`Box<T>\`:

\`\`\`rust
let boxed: Box<i64> = Box::new(42);
println!("{}", *boxed);   // 42
\`\`\`

Common reasons:

- **Recursive types** (linked lists) need a fixed-size pointer
- Holding a **dynamically-sized** value (\`dyn Trait\`)
- **Move** large values cheaply instead of copying

> 🛑 **Predict.** Without \`Box\`, why can't you write \`enum List { Cons(i32, List), Nil }\`? Spell out the compiler's complaint.

## 3. \`Rc<T>\` and \`Arc<T>\` — shared ownership

Rust's "one owner" rule sometimes gets in the way: you want **multiple parts of the program to hold the same value**.

| Type | Use |
| :--- | :--- |
| \`Rc<T>\` | single-threaded reference counting |
| \`Arc<T>\` | **thread-safe** (atomic reference counting) |

\`\`\`rust
use std::sync::Arc;

let shared = Arc::new(String::from("hello"));
let clone1 = Arc::clone(&shared);   // refcount += 1
let clone2 = Arc::clone(&shared);   // refcount += 1

// Send to another thread — Arc is Send
std::thread::spawn(move || println!("{}", clone1));
\`\`\`

**Reth and ExEx code is full of \`Arc<...>\`** — multiple async tasks need to read the same component.

> 🛑 **Anti-fluency.** \`Arc::clone(&x)\` doesn't deep-copy the inner \`T\`. So what does it copy, exactly? What's the cost? Why "atomic" in "Arc"?

## 4. \`Mutex\` / \`RwLock\` — shared mutability

\`Arc<T>\` alone is read-only. To mutate shared state, wrap in \`Mutex\` or \`RwLock\`:

\`\`\`rust
use std::sync::{Arc, Mutex};

let counter = Arc::new(Mutex::new(0));

let c = Arc::clone(&counter);
std::thread::spawn(move || {
    let mut n = c.lock().unwrap();
    *n += 1;
});
\`\`\`

| Type | Use |
| :--- | :--- |
| \`Mutex\` | exclusive read/write |
| \`RwLock\` | many readers OR one writer |

> 🛑 **Predict.** What does \`.lock().unwrap()\` panic on? When does that happen? (Hint: search for "poisoning" if you don't know.) **Reth code uses \`.lock().unwrap()\` everywhere — understand when it can crash.**

## 5. \`dyn Trait\` — dynamic dispatch

A trait object — like a TypeScript / Java interface, but you opt into runtime method resolution explicitly.

\`\`\`rust
trait Greet {
    fn greet(&self);
}

struct En;
struct Ja;
impl Greet for En { fn greet(&self) { println!("Hello"); } }
impl Greet for Ja { fn greet(&self) { println!("こんにちは"); } }

let g: Box<dyn Greet> = if std::env::var("LANG").unwrap_or_default().starts_with("ja") {
    Box::new(Ja)
} else {
    Box::new(En)
};
g.greet();
\`\`\`

### \`impl Trait\` vs \`dyn Trait\`

| Form | Meaning |
| :--- | :--- |
| \`impl Trait\` | static dispatch (concrete type at compile time) |
| \`dyn Trait\` | dynamic dispatch (resolve at runtime, needs Box or & ) |

\`impl\` is faster, but \`dyn\` lets you have heterogeneous collections like \`Vec<Box<dyn Trait>>\`.

> 🛑 **Anti-fluency.** \`Box<dyn Greet>\` is more expensive than \`Box<En>\` at the call site. **Where exactly is the cost?** What's a vtable? If you can't answer, you don't yet understand dynamic dispatch — re-read.

## 6. What you'll see in ExEx code

\`\`\`rust
async fn my_exex<Node: FullNodeComponents>(
    mut ctx: ExExContext<Node>,
) -> eyre::Result<()> {
    while let Some(notification) = ctx.notifications.recv().await {
        // ...
    }
    Ok(())
}
\`\`\`

> 🛑 **Stop. Annotate this signature in your head before scrolling.** Which piece is generics? Which is a trait bound? Which uses shared ownership internally? Which lifetime is implicit?

- \`Node: FullNodeComponents\` — trait bound
- \`ExExContext<Node>\` — generic over the node bundle
- Internally uses \`Arc<...>\` for shared components
- Lifetime annotations are elided but \`'static\` is required

## Cheat sheet

| Feature | One-liner |
| :--- | :--- |
| \`'a\` / \`'static\` | how long borrows live |
| \`Box<T>\` | heap allocation |
| \`Rc<T>\` / \`Arc<T>\` | shared ownership (Arc is thread-safe) |
| \`Mutex<T>\` | safely mutate shared data |
| \`dyn Trait\` | runtime method dispatch |

> Final check: close this tab. Write the ExEx \`my_exex\` signature from memory. If you can't, you don't yet own the vocabulary — open it back up. The next lesson reads ExEx in detail; you'll need each of these without the cheat sheet.`,
                },
                {
                  title: 'Building the ExEx API step by step',
                  slug: 'reth-exex-buildup-en',
                  type: 'CONTENT',
                  sortOrder: 5,
                  duration: 10,
                  xpReward: 25,
                  content: `# Building the ExEx API step by step

**ExEx (Execution Extension)** is Reth's mechanism for injecting Rust code into the execution loop. With it you build node-speed indexers, MEV bots, and live risk engines — directly in the same process as the chain itself.

But the API has 4 parts that look weighty: an init/run split, a notification *enum* with 3 variants, an event channel for pruning hints, and an install method on the node builder. Walk it cold and you get four ideas at once.

This lesson builds the API up from the simplest possible "block listener." By the end you'll have built every piece of the real minimal ExEx — which the next lesson reads in detail.

> 📂 **Open \`paradigmxyz/reth-exex-examples/minimal\` in another tab.** That's the file we're building toward.

## Step 0 — The naive indexer: separate process polling RPC

Without thinking, you'd index Ethereum like this:

\`\`\`rust
fn main() {
    let rpc = HttpProvider::new("http://localhost:8545");
    let mut last_block = 0;
    loop {
        let head = rpc.get_block_number().unwrap();
        for n in (last_block+1)..=head {
            let block = rpc.get_block(n).unwrap();
            index(block);
        }
        last_block = head;
        sleep(Duration::from_secs(1));
    }
}
\`\`\`

A separate process. Polls the RPC every second. Indexes any new blocks.

> 🛑 **Predict.** Without scrolling: name three reasons this naive design is *significantly worse* than running in-process inside Reth. (Hint: each is a different *kind of* problem.)

The three:

1. **Latency.** The RPC poll has request/response overhead. The indexer is always seconds behind the tip — useless for MEV, risk, real-time UX.
2. **Atomicity.** Reth commits a new block to disk *before* your indexer sees it. There's a window where Reth has a block your code hasn't processed. If your code is the source of truth for a derived view, that window is a race condition.
3. **Reorgs.** Polling sees \`head = N\`, then later \`head = N\` (different block). Your indexer has to detect and handle reorgs from outside, with weaker information than Reth itself has.

The fix: **run in the same process as Reth.** Get notified the moment a block commits, with full chain context.

## Step 1 — First stab: a callback per block

Naive in-process API:

\`\`\`rust
fn on_new_block<F: Fn(&Block)>(reth: &mut Reth, callback: F) {
    reth.add_listener(callback);
}
\`\`\`

Reth calls your closure for every new block. Simple.

> 🛑 **Predict.** What's missing? (Two big things.)

The two:

1. **Reorgs aren't append-only.** A callback that only fires on "new block added" can't represent "block N at hash X was replaced by block N at hash Y." Your indexer's derived state silently corrupts on every reorg.
2. **No way to tell Reth you're done.** If your indexer is processing block N, Reth doesn't know whether it can prune block N-100,000's data. Without this signal, **Reth keeps everything forever.**

## Step 2 — A richer notification: the three chain events

Replace the bare callback with an enum that captures all three things that can happen to the chain:

\`\`\`rust
enum ExExNotification {
    ChainCommitted { new: Chain },             // canonical blocks added
    ChainReorged   { old: Chain, new: Chain }, // old replaced by new
    ChainReverted  { old: Chain },             // removed (no replacement yet)
}
\`\`\`

Each variant carries enough information for the indexer to undo or redo derived state:

- **\`ChainCommitted { new }\`** — append the new blocks' state to your index.
- **\`ChainReorged { old, new }\`** — undo \`old\`'s state, apply \`new\`'s state. Atomic swap.
- **\`ChainReverted { old }\`** — undo \`old\`'s state, wait. Reth will follow up with a future \`ChainCommitted\` once it picks a new tip.

> 🛑 **Anti-fluency.** You're indexing transactions to a \`HashMap\`. You handle only \`ChainCommitted\`. The chain reorgs 5 blocks deep. **What's wrong with your HashMap?** Be specific — write the failure mode in two sentences.

The HashMap contains the *old* chain's transactions, but the canonical chain is now the *new* chain. Any later read off your index will return transactions that no longer exist on the canonical chain — a phantom-data bug. Worse: the *new* chain's transactions never got indexed (you didn't see a \`ChainCommitted\` for them — you saw a \`ChainReorged\` you ignored).

This is the **#1 ExEx bug.** The three-variant enum exists specifically to prevent it.

## Step 3 — Tell Reth what you've finished: \`FinishedHeight\`

If your indexer has processed block N, Reth needs to know. Otherwise it can't safely prune anything below N.

\`\`\`rust
ctx.events.send(ExExEvent::FinishedHeight(block_number_hash))?;
\`\`\`

\`ctx.events\` is a write-only channel back to Reth. Whenever your handler finishes a block (or chain), you send \`FinishedHeight(N)\`. Reth aggregates the minimum across all installed ExExes and prunes below that.

> 🛑 **Predict the disk consequence.** You ship an ExEx without the \`FinishedHeight\` event. Six months later your node is at block 21M. What's the disk usage relative to a node without ExEx? Why?

The node retains *all* historical state Reth would otherwise prune — because it can't safely prune anything your ExEx might want to read later. **Disk usage compounds.** Without \`FinishedHeight\`, an "innocuous indexer" turns Reth into a full-archive node by accident.

## Step 4 — The notification stream: async pull, not callback

A callback would force Reth to wait for your slow code on every block. Better: push notifications into a stream, your handler pulls when ready:

\`\`\`rust
while let Some(notification) = ctx.notifications.try_next().await? {
    // process at your pace
}
\`\`\`

\`ctx.notifications\` is a \`Stream\` of \`ExExNotification\`. \`try_next\` is async — your handler runs in the same async runtime as Reth. **Reth's progress isn't gated on your indexing speed**, but your handler still observes every event in order.

When Reth shuts down or the channel closes, the loop exits cleanly with \`Ok(())\`.

## Step 5 — The init/run split

A user wants to do *synchronous setup* (open files, init a database, allocate a buffer) before the async loop starts. A single \`async fn\` would force this setup into the future itself, where it can't be reasoned about clearly:

\`\`\`rust
async fn exex_init<Node: FullNodeComponents>(
    ctx: ExExContext<Node>,
) -> eyre::Result<impl Future<Output = eyre::Result<()>>> {
    // synchronous setup goes here
    Ok(exex(ctx))  // return the long-running future
}
\`\`\`

Two functions:

- **\`exex_init\`** — runs *once* at node startup. Synchronous setup. Returns a future.
- **\`exex\`** (the future) — runs *forever* (or until shutdown). Polls the notification stream.

> 🛑 **Predict.** Why is the init/run split necessary? What concrete bug would happen if you put file-open inside \`exex\` instead of \`exex_init\`?

Reth needs to *acknowledge* the ExEx is alive before it starts pushing notifications. If you put \`File::open(...)\` inside \`exex\`, the file open happens *after* Reth has already started buffering notifications — and if it fails (permissions, missing path), notifications pile up while Reth thinks the ExEx is healthy. The init/run split lets Reth distinguish "ExEx couldn't start" from "ExEx ran for a while and crashed."

## Step 6 — \`install_exex\`: multiple extensions

Your \`main\` wires the ExEx into the node builder:

\`\`\`rust
.install_exex("MyIndexer", exex_init)
\`\`\`

The first arg is a name (used in metrics and logs); the second is the init function. **You can chain multiple \`.install_exex(...)\` calls** — each ExEx gets its own notification stream and its own \`FinishedHeight\` channel. The pruner aggregates.

## What you've built

Every piece earned its keep:

- **\`ExExNotification\` enum with 3 variants** (Step 2) — handles append, reorg, revert
- **\`FinishedHeight\` event** (Step 3) — opt-in pruning, prevents disk bloat
- **Stream-pulled notifications** (Step 4) — Reth doesn't block on your handler
- **init/run split** (Step 5) — synchronous setup before async loop
- **\`install_exex\`** (Step 6) — multiple extensions, each with its own stream

The next lesson reads the minimal ExEx — \`~40 lines of main.rs\` — and shows how all six pieces fit together in real code.

## Recall before moving on

Without scrolling:

1. Why does the API push notifications via a stream instead of calling your code directly?
2. What are the three \`ExExNotification\` variants, and why do you need all three?
3. What does \`FinishedHeight\` tell Reth, and what's the disk consequence of forgetting it?
4. Why is the API split into \`exex_init\` (sync) and \`exex\` (async future)?

If any answer is shaky, scroll back. The next lesson reads the real minimal ExEx in detail.
`,
                },
                {
                  title: 'Reading the minimal ExEx, line by line',
                  slug: 'reth-exex-walkthrough-en',
                  type: 'CONTENT',
                  sortOrder: 6,
                  duration: 10,
                  xpReward: 25,
                  content: `# Reading the minimal ExEx, line by line

A working ExEx is 40 lines of Rust. That's it — no fork of Reth, no separate process, just a function you hand to the node builder and Reth runs it inside the same binary. Below is the entire \`main.rs\` of [\`paradigmxyz/reth-exex-examples/minimal\`](https://github.com/paradigmxyz/reth-exex-examples/tree/main/minimal). By the end of this lesson, every line maps back to a build-up step from the previous one.

\`\`\`rust
use futures::{Future, TryStreamExt};
use reth_exex::{ExExContext, ExExEvent, ExExNotification};
use reth_node_api::FullNodeComponents;
use reth_node_ethereum::EthereumNode;
use reth_tracing::tracing::info;

async fn exex_init<Node: FullNodeComponents>(
    ctx: ExExContext<Node>,
) -> eyre::Result<impl Future<Output = eyre::Result<()>>> {
    Ok(exex(ctx))
}

async fn exex<Node: FullNodeComponents>(mut ctx: ExExContext<Node>) -> eyre::Result<()> {
    while let Some(notification) = ctx.notifications.try_next().await? {
        match &notification {
            ExExNotification::ChainCommitted { new } => {
                info!(committed_chain = ?new.range(), "Received commit");
            }
            ExExNotification::ChainReorged { old, new } => {
                info!(from_chain = ?old.range(), to_chain = ?new.range(), "Received reorg");
            }
            ExExNotification::ChainReverted { old } => {
                info!(reverted_chain = ?old.range(), "Received revert");
            }
        };

        if let Some(committed_chain) = notification.committed_chain() {
            ctx.events.send(ExExEvent::FinishedHeight(committed_chain.tip().num_hash()))?;
        }
    }

    Ok(())
}

fn main() -> eyre::Result<()> {
    reth::cli::Cli::parse_args().run(|builder, _| async move {
        let handle = builder
            .node(EthereumNode::default())
            .install_exex("Minimal", exex_init)
            .launch_with_debug_capabilities()
            .await?;

        handle.wait_for_node_exit().await
    })
}
\`\`\`

Now we walk it.

## Walk it, line by line

### \`exex_init\` — the init/run split (Step 5)

\`\`\`rust
async fn exex_init<Node: FullNodeComponents>(
    ctx: ExExContext<Node>,
) -> eyre::Result<impl Future<Output = eyre::Result<()>>> {
    Ok(exex(ctx))
}
\`\`\`

\`exex_init\` is called *once* at node startup. Reth passes you \`ExExContext\` — a struct bundling \`notifications\` (the incoming chain-event stream), \`events\` (your channel back to Reth's pruner), and a handle to the node's components. You return a future for Reth to poll forever.

This minimal ExEx does no synchronous setup — it just hands \`ctx\` straight to \`exex\`. **Real ExExes** that need \`File::open(...)\` or \`Database::connect(...)\` would do that work inside \`exex_init\`, *before* returning the future.

> 🔍 **Find in repo.** Open the \`tracking-state\` example. What does its \`exex_init\` do that \`minimal\` doesn't?

### \`exex\` — the long-running future

\`\`\`rust
async fn exex<Node: FullNodeComponents>(mut ctx: ExExContext<Node>) -> eyre::Result<()> {
    while let Some(notification) = ctx.notifications.try_next().await? {
        // ...
    }
    Ok(())
}
\`\`\`

The main loop. \`ctx.notifications\` is an async channel (a typed queue Reth pushes chain events into); \`try_next()\` awaits the next one without blocking the thread — when none is available, the runtime parks the task and runs other ExExes or Reth itself. Cooperative concurrency, no blocking.

When the channel closes (node shutdown), \`try_next()\` returns \`Ok(None)\`, the \`while let\` exits, and the function returns \`Ok(())\`. Clean termination.

### The three-arm match (Step 2)

\`\`\`rust
match &notification {
    ExExNotification::ChainCommitted { new } => { /* ... */ }
    ExExNotification::ChainReorged { old, new } => { /* ... */ }
    ExExNotification::ChainReverted { old } => { /* ... */ }
};
\`\`\`

This is the load-bearing decision. **All three arms must be present** in any non-toy ExEx, because:

- **Missing \`ChainReorged\`** → your derived state contains the *old* chain's data forever; the new canonical chain's data is missing because you never saw a \`ChainCommitted\` for it.
- **Missing \`ChainReverted\`** → after a reorg-trigger but before Reth picks a new tip, your state is one chain ahead of canonical with no way to roll back.

The minimal ExEx logs each variant; that's instructive but not useful. **Real ExExes update derived state** — and getting all three arms right is what separates a working indexer from a phantom-data bug.

> 🛑 **Anti-fluency.** Read the \`ChainReorged\` arm. The \`old\` and \`new\` chains are both passed. **Why both?** Why not just \`new\` (the post-reorg tip)?

Because the indexer needs to *undo* \`old\`'s state changes before *applying* \`new\`'s. If you only got \`new\`, you'd have no way to roll back the old chain's effect on your derived state — and you'd silently double-count or skip transactions.

### \`committed_chain()\` and \`FinishedHeight\` (Step 3)

\`\`\`rust
if let Some(committed_chain) = notification.committed_chain() {
    ctx.events.send(ExExEvent::FinishedHeight(committed_chain.tip().num_hash()))?;
}
\`\`\`

Two methods to know:

- **\`notification.committed_chain()\`** — returns \`Some(Chain)\` for \`ChainCommitted\` *and* \`ChainReorged\` (the new chain), \`None\` for \`ChainReverted\`. **It's the "what's the canonical state after this notification" accessor.**
- **\`ctx.events.send(ExExEvent::FinishedHeight(...))\`** — tells Reth's pruner "I've processed up to this block; you can prune below this hash."

**Send \`FinishedHeight\` after every commit-shaped notification.** Forget this and your node accumulates archive data forever (Step 3's disk-bloat scenario from the previous lesson).

> 🔍 **Verify.** Open the source of \`notification.committed_chain()\` in \`reth-exex\`. Confirm the three-cases behavior we just described.

### \`main\`: wiring the ExEx into a node

\`\`\`rust
fn main() -> eyre::Result<()> {
    reth::cli::Cli::parse_args().run(|builder, _| async move {
        let handle = builder
            .node(EthereumNode::default())
            .install_exex("Minimal", exex_init)
            .launch_with_debug_capabilities()
            .await?;

        handle.wait_for_node_exit().await
    })
}
\`\`\`

This is "ordinary Reth node, plus one extension." The \`install_exex("Minimal", exex_init)\` is the only ExEx-specific line. **Stack multiple \`install_exex\` calls** to compose extensions.

## What real ExExes do

The same repo has more substantial examples:

| Example | What it does |
| :--- | :--- |
| \`backfill\` | Replays historical blocks through your handler at startup |
| \`in_memory_state\` | Maintains a custom indexed state derived from each block |
| \`tracking-state\` | Persists ExEx-internal state to a separate DB (so restarts are cheap) |
| \`rollup\` | Implements a minimal rollup using only ExEx hooks |

> 🔍 **Open \`rollup\`.** Read until you find where it commits state changes. **A rollup as an ExEx — sit with that for a moment.** That's the architectural unlock: you don't need to fork Reth to build a rollup; you can build one as an extension.

## Recall before the quiz

Without scrolling:

1. What does \`exex_init\` do that \`exex\` (the future) cannot?
2. Why must a non-toy ExEx handle all three notification variants?
3. What does \`notification.committed_chain()\` return for each of the three variants?
4. What does a "rollup as an ExEx" rely on for finality and data availability?

The next lesson is a quiz. Engage with these recalls now if any answer is shaky.
`,
                },
                {
                  title: 'Quiz: did the ExEx API stick?',
                  slug: 'reth-exex-quiz-en',
                  type: 'QUIZ',
                  sortOrder: 7,
                  duration: 4,
                  xpReward: 25,
                  content: `# Quiz: did the ExEx API stick?

Four questions covering the API design and the failure modes the design prevents. Same rule: **you can't nod past a quiz.**

If you miss two or more, scroll back to *Building the ExEx API* before going on to the drill.`,
                  quizQuestions: [
                    {
                      question: "Why is the ExEx API an init/run split (`exex_init` returns a future) rather than a single `async fn`?",
                      options: [
                        "Rust requires a setup function for `async` traits.",
                        "It's a backwards-compat shim from an older Reth version.",
                        "Init/run lets you do synchronous setup (open files, init DBs) at node startup before the long-running notification loop begins. Reth distinguishes 'ExEx couldn't start' from 'ExEx ran for a while and crashed.'",
                        "Performance — split functions inline better.",
                      ],
                      correctIndex: 2,
                      explanation: "A single `async fn` would force setup into the future itself — making 'ExEx never started' indistinguishable from 'ExEx crashed during the loop.' The init/run split gives Reth a clean acknowledgment moment for 'this extension is alive and ready' before notifications start.",
                    },
                    {
                      question: "You implement an ExEx that only handles `ChainCommitted`, ignoring `ChainReorged` and `ChainReverted`. The chain reorgs 5 blocks deep. What's wrong with your derived state?",
                      options: [
                        "It contains 5 extra blocks that should have been pruned.",
                        "It contains the *old* chain's data (from the segment that's no longer canonical) AND is missing the *new* chain's data (because no `ChainCommitted` fires for replaced segments). Phantom data + missing data simultaneously.",
                        "It crashes with a panic.",
                        "The state is fine; Reth re-emits `ChainCommitted` for the new chain.",
                      ],
                      correctIndex: 1,
                      explanation: "This is the #1 ExEx bug. `ChainReorged` carries both `old` and `new` so the indexer can undo `old`'s effects and apply `new`'s. Ignoring it leaves both halves wrong — old data still indexed, new data never indexed.",
                    },
                    {
                      question: "What does `ctx.events.send(ExExEvent::FinishedHeight(N))` tell Reth?",
                      options: [
                        "'Stop sending me notifications below block N.'",
                        "'I've processed up to block N; you can safely prune historical state below N.' Reth aggregates the minimum across all installed ExExes for its pruning decision.",
                        "'Block N is bad — discard it.'",
                        "'Resume from block N on next restart.'",
                      ],
                      correctIndex: 1,
                      explanation: "Without `FinishedHeight`, Reth can't safely prune anything your ExEx might want to read later — it conservatively keeps everything forever. Forgetting this event turns an 'innocuous indexer' into an accidental archive node.",
                    },
                    {
                      question: "An ExEx-based indexer is faster than a separate process polling the RPC. What's the *primary* architectural reason?",
                      options: [
                        "The indexer runs on a faster CPU.",
                        "Same process, no I/O round trip. The ExEx receives a notification the moment Reth commits a block — no RPC request/response, no polling interval, no atomicity gap. Plus full chain context (including reorg structure) Reth already computed.",
                        "ExEx skips the EVM execution step.",
                        "The RPC has a rate limiter; ExEx doesn't.",
                      ],
                      correctIndex: 1,
                      explanation: "The architectural unlock is colocation. Polling RPC = at best ~1s lag, often more under load, plus reorgs are seen second-hand. ExEx = zero-lag, full context, no IPC.",
                    },
                  ],
                },
                {
                  title: 'Drill: build a reorg-safe indexer',
                  slug: 'reth-exex-drill-en',
                  type: 'CONTENT',
                  sortOrder: 8,
                  duration: 12,
                  xpReward: 25,
                  content: `# Drill: build a reorg-safe indexer

Reading is rehearsal. **Doing is memory.** This drill takes you from "I've read about ExEx" to "I have written one and watched it survive a reorg correctly."

## Setup

\`\`\`bash
git clone https://github.com/paradigmxyz/reth-exex-examples
cd reth-exex-examples/minimal
cargo build
\`\`\`

If the build fails, fix that before proceeding.

## Drill 1 — Run the minimal ExEx against a node

You need an existing Reth node, or run with \`--chain holesky\` for a small testnet (faster initial sync, more frequent reorgs):

\`\`\`bash
cargo run -- node --chain holesky
\`\`\`

> 🛑 **Question (write it down):** What gets logged for the first 10 blocks? Is every log line a \`ChainCommitted\`, or do you see other variants?

For a fresh sync, you'll see \`ChainCommitted\` for every block. \`ChainReorged\` and \`ChainReverted\` are rarer — they require an actual chain disagreement, which holesky generates more often than mainnet (lower hashpower → more contested forks).

## Drill 2 — Add a transaction counter

Modify the \`ChainCommitted\` arm to print transaction count per block:

\`\`\`rust
ExExNotification::ChainCommitted { new } => {
    let total: usize = new.blocks().values()
        .map(|b| b.body.transactions.len())
        .sum();
    info!(committed_chain = ?new.range(), tx_count = total, "Received commit");
}
\`\`\`

> 🛑 **Predict.** Run again. What's the average transaction count per holesky block? Per mainnet block?

Holesky: low — usually 5–20 tx per block, sometimes 0. Mainnet: 100–300, depending on block fullness. **You're now reading real chain data at zero latency.**

## Drill 3 — Add a reorg-safe HashMap

Track how many transactions each address sent. **Survive reorgs correctly** — that's the whole point.

\`\`\`rust
use std::collections::HashMap;
use alloy_primitives::Address;

let mut tx_count: HashMap<Address, u64> = HashMap::new();

while let Some(notification) = ctx.notifications.try_next().await? {
    match &notification {
        ExExNotification::ChainCommitted { new } => {
            for (_, block) in new.blocks() {
                for tx in block.body.transactions() {
                    *tx_count.entry(tx.signer()).or_insert(0) += 1;
                }
            }
        }
        ExExNotification::ChainReorged { old, new } => {
            // Undo old, then apply new — order matters
            for (_, block) in old.blocks() {
                for tx in block.body.transactions() {
                    *tx_count.entry(tx.signer()).or_insert(0) -= 1;
                }
            }
            for (_, block) in new.blocks() {
                for tx in block.body.transactions() {
                    *tx_count.entry(tx.signer()).or_insert(0) += 1;
                }
            }
        }
        ExExNotification::ChainReverted { old } => {
            // Undo old, no replacement yet
            for (_, block) in old.blocks() {
                for tx in block.body.transactions() {
                    *tx_count.entry(tx.signer()).or_insert(0) -= 1;
                }
            }
        }
    };

    if let Some(committed_chain) = notification.committed_chain() {
        ctx.events.send(ExExEvent::FinishedHeight(committed_chain.tip().num_hash()))?;
    }
}
\`\`\`

(Adjust the API names to your local reth's current shape — \`block.body.transactions()\` vs \`.transactions\`, \`tx.signer()\` vs \`tx.recover_signer()\`. The point is the *structure*, not the exact identifier.)

> 🛑 **Question:** Read the three arms. **What invariant must hold for \`tx_count\` to be correct after any sequence of notifications?**

**For every \`Address\`, the count equals (txs sent on the *canonical* chain) − (txs sent on segments that were committed-then-reverted).** The reorg arm is the trick: it undoes \`old\` *and* applies \`new\` in a single notification, atomically.

If you forget the \`-=\` in \`ChainReverted\`, your counts grow forever. If you forget the \`-=\` in \`ChainReorged\`, your counts represent the union of old and new chains, not just canonical.

## Drill 4 — Verify reorg handling

Holesky generates reorgs occasionally. Run for a few hours.

> 🔍 **Find the reorg.** Search your logs for "Received reorg". When one appears:
>
> 1. Note the \`from_chain\` and \`to_chain\` ranges.
> 2. Spot-check a high-tx address in \`tx_count\` *before* the reorg log line — record its count.
> 3. After the reorg log line — record again.
> 4. Manually verify: did the count change consistently with the difference between the old and new chain segments at that address?

If yes — your indexer is reorg-safe. **You've written the same kind of code production-grade indexers (e.g., goldsky, the graph) ship.**

> 🛑 **Final question:** Why does the *order* of operations in the \`ChainReorged\` arm matter? Specifically: does it matter if you apply \`new\` *before* undoing \`old\`?

It matters in exactly one case: when \`old\` and \`new\` share a common prefix that the runtime helpfully *omits* from both — but if the implementation does include any shared blocks in both, applying \`new\` first would double-count them, then \`old\`'s undo would zero them out. The convention is **undo \`old\` first, then apply \`new\`**, which mirrors the chronological order Reth itself processes the reorg.

## End-of-lesson recall

Without scrolling, in your own words:

1. What's the rationale for handling \`ChainReorged\` with both \`old\` and \`new\` in the same notification?
2. What invariant does the three-arm pattern preserve in your derived state?
3. If you forget \`FinishedHeight\`, what specifically grows on disk over time?
4. What's the one architectural reason an ExEx beats a separate RPC-polling indexer?

After this drill, you've shipped a reorg-safe node-speed indexer. **The same tool now lets you build MEV bots, live risk engines, and rollups.**`,
                },
                {
                  title: 'Building the node-builder API step by step',
                  slug: 'reth-sdk-buildup-en',
                  type: 'CONTENT',
                  sortOrder: 9,
                  duration: 10,
                  xpReward: 25,
                  content: `# Building the node-builder API step by step

ExEx extends an existing Ethereum node. The **Reth SDK** lets you build *your own* App-chain in Rust by composing components. This is where "purpose-built EVM L1" stops being a thesis and starts being a binary you can compile.

But the API has fluent calls — \`with_types\`, \`with_components\`, \`with_add_ons\`, \`launch\` — and each one decides something architecturally different. This lesson builds it up from "the dumbest thing that works," so you can see why each method earns its keep.

By the end you'll have built every piece of:

\`\`\`rust
fn main() {
    Cli::parse_args()
        .run(async move |builder, _| {
            let handle = builder
                .with_types::<EthereumNode>()
                .with_components(
                    EthereumNode::components().pool(CustomPoolBuilder::default())
                )
                .with_add_ons(EthereumAddOns::default())
                .launch()
                .await?;
            handle.wait_for_node_exit().await
        })
        .unwrap();
}
\`\`\`

> 📂 **Open \`paradigmxyz/reth/examples/custom-node-components/src/main.rs\` in another tab.** That's the file we're building toward.

## Step 0 — The naive App-chain: fork all of Reth

Without thinking, you'd ship a custom L1 by:

\`\`\`bash
git clone https://github.com/paradigmxyz/reth my-chain
cd my-chain
# edit crates/everything to taste
cargo build
\`\`\`

Fork all 200K+ lines of Reth, edit whatever you need, ship the result.

> 🛑 **Predict.** Without scrolling: name three reasons this naive approach is *catastrophic* if you plan to ship and maintain a chain for years. (Hint: each is a different *kind of* cost.)

The three:

1. **Upstream divergence.** Paradigm ships Reth updates every week. Your fork has no way to pull them in cleanly — every release becomes a rebase nightmare. Six months in, you can't safely upgrade.
2. **Surface area you don't want.** You forked because you wanted to change *one* subsystem. Now you own *everything* — bugs in code you never read, security patches you have to track, modules you'll never modify but must still build.
3. **Review cost.** A reviewer can't tell which 50 lines you actually changed vs the 200K you didn't. Audits, security firms, regulators — all have to treat your fork as a brand-new client.

The fix: **don't fork. Compose.** Override only the subsystems you actually want to change; depend on Reth as a library for everything else.

## Step 1 — Identify the swap points

What subsystems would you actually want to customize for a real chain?

> 🛑 **Predict.** You're building Tempo (payments-focused L1). Which of Reth's subsystems would you swap? (Hint: there are 4–6 candidates.)

The candidates that show up across real production chains:

- **Pool** — admission rules, priority lanes (Tempo wants payments-priority)
- **Network** — peer policy, private subnets
- **Executor** — custom opcodes, precompiles, gas table (the lesson on custom opcodes)
- **Consensus** — PoS → HyperBFT, PoA, Tendermint
- **Payload** — block builder (MEV-aware, ordered for app-specific reasons)
- **Add-ons** — custom JSON-RPC namespaces, ExEx hooks

These are exactly the override points the SDK exposes. Everything *else* (sync orchestrator, MDBX schema, header download, sender recovery, hashing stages) you take from Reth as-is.

## Step 2 — First sketch: pass overrides as a struct

Naive composition API:

\`\`\`rust
struct NodeConfig<P, N, E, C, Pl> {
    pool: P,
    network: N,
    executor: E,
    consensus: C,
    payload: Pl,
}

fn main() {
    let cfg = NodeConfig {
        pool: CustomPool::default(),
        network: DefaultNetwork::default(),
        executor: DefaultExecutor::default(),
        consensus: DefaultConsensus::default(),
        payload: DefaultPayload::default(),
    };
    Reth::run(cfg);
}
\`\`\`

Pass a struct of overrides. Works, but clunky.

> 🛑 **Predict.** Two specific user-experience problems with this shape?

The two:

1. **You spell out every field every time** — even the ones you didn't customize. The struct enforces all-or-nothing.
2. **Type inference falls apart fast.** Each component has its own generic parameters. Specifying them all as a single struct creates a tangled type signature you can't reason about.

**Builder pattern fixes both.** Each method takes one override and returns a new builder type — Rust's type system tracks the changes, defaults stay implicit.

## Step 3 — Builder pattern: fluent chained calls

\`\`\`rust
let handle = builder
    .with_pool(CustomPool::default())
    // skip the rest — defaults
    .launch()
    .await?;
\`\`\`

Each \`with_*\` call returns a new builder type. Defaults stay invisible. **You only spell out what you actually overrode.**

But "one method per component" doesn't capture all of Reth's customization surface. There's a higher-level grouping: *types* (block/tx/header layouts), *components* (the runtime subsystems above), and *add-ons* (RPC, ExEx). The real SDK splits the builder along those three axes.

## Step 4 — \`.with_types::<EthereumNode>()\`

\`\`\`rust
.with_types::<EthereumNode>()
\`\`\`

This picks the **type bundle** — chain spec, primitives (block, tx, header types), engine API.

Why is this its own step? Because the *types* are load-bearing for everything else. If you change the tx structure, every component (pool, executor, payload, network) has to use the new tx type. So the SDK forces you to commit to a type bundle *first* — before configuring components.

\`EthereumNode\` ships defaults (Ethereum block + tx + header). You can also pass \`OpNode\` (Optimism types) or your own \`NodeTypes\` impl.

> 🛑 **Anti-fluency.** What concrete bug would happen if \`with_types\` came *after* \`with_components\` in the chain? Sketch the failure mode.

The components would have to be specified *before* the types they operate on are known. Either every component-builder would need to be generic over not-yet-chosen types (compiler-hostile), or you'd commit to types implicitly via \`.with_components\`'s arguments (silent and confusing). **\`with_types\` first** lets the rest of the chain be type-aware.

## Step 5 — \`.with_components(...)\`: where customization lives

\`\`\`rust
.with_components(EthereumNode::components().pool(CustomPoolBuilder::default()))
\`\`\`

The trick: take the *base set* of components (\`EthereumNode::components()\`) and override individual builders by chaining \`.pool(...)\`, \`.network(...)\`, \`.executor(...)\` etc.

Same override-only-what-you-need pattern from Step 3, applied to the runtime subsystems. Defaults stay invisible:

\`\`\`rust
.with_components(
    EthereumNode::components()
        .pool(CustomPoolBuilder::default())   // overridden
        // .network is default
        // .executor is default
        // .consensus is default
        // .payload is default
)
\`\`\`

You wrote one custom builder. The rest came from Reth.

> 🛑 **Predict.** Sketch the trait \`PoolBuilder\` (the one \`CustomPoolBuilder\` implements). Just method signatures, no real impl. What does Reth need from a pool builder?

Roughly:

\`\`\`rust
trait PoolBuilder<Node>: Send {
    type Pool;
    fn build_pool(self, ctx: &BuilderContext<Node>)
        -> impl Future<Output = eyre::Result<Self::Pool>>;
}
\`\`\`

One method: given a context (which contains chain spec, primitives, etc.), build the pool. **Components are *built* lazily, not passed pre-constructed**, because they need the context that earlier builder steps assembled. (We'll meet this shape across all 6 builders in the next lesson.)

## Step 6 — \`.with_add_ons(...)\` and \`.launch()\`

\`\`\`rust
.with_add_ons(EthereumAddOns::default())
.launch()
\`\`\`

Add-ons are the things that aren't load-bearing for the runtime: RPC namespaces, engine API extensions, ExEx installations. \`EthereumAddOns::default()\` gives you the standard Ethereum RPC; chain \`.install_exex(...)\` calls here for the ExEx pattern from earlier lessons.

\`.launch()\` is where the real work happens: opens MDBX, starts the P2P stack, spawns Tokio tasks for sync stages, wires up the RPC server. Returns a \`NodeHandle\` that drives the whole thing.

## What you've built

\`\`\`rust
let handle = builder
    .with_types::<EthereumNode>()              // (Step 4) the type bundle
    .with_components(                          // (Step 5) runtime subsystems
        EthereumNode::components().pool(CustomPoolBuilder::default())
    )
    .with_add_ons(EthereumAddOns::default())   // (Step 6) RPC + ExEx
    .launch()                                  // (Step 6) boot everything
    .await?;
\`\`\`

Every step earned its keep:

- **\`with_types\` first** (Step 4) — types are load-bearing for everything else
- **\`with_components\` with chained overrides** (Step 5) — override what you change, default the rest
- **\`with_add_ons\`** (Step 6) — non-load-bearing extensions
- **\`launch\`** (Step 6) — the boot

The next lesson walks the **6 components** — what each does, what swapping it lets you ship, and which production chains swap which.

## Recall before moving on

Without scrolling:

1. Why doesn't "fork all of Reth" scale to a chain you maintain for years?
2. Why does \`.with_types::<EthereumNode>()\` come *first* in the chain?
3. What's the pattern for overriding *one* component while keeping the others as Reth defaults?
4. What does \`.launch()\` actually start?

If any answer is shaky, scroll back. The next lesson tours the 6 components and what real chains do with them.
`,
                },
                {
                  title: 'The 6 components — what each one unlocks',
                  slug: 'reth-sdk-components-en',
                  type: 'CONTENT',
                  sortOrder: 10,
                  duration: 10,
                  xpReward: 25,
                  content: `# The 6 components — what each one unlocks

Hyperliquid runs HyperEVM on Reth. Tempo is building a payments L1 on Reth. Berachain ships bera-reth. None of them forked Reth — they each swapped **2 or 3 of Reth's 6 components** and inherited the rest. That's the SDK's whole pitch: **don't rewrite a Rust EVM client, swap the parts that matter to your thesis.** This lesson walks those 6 components — and shows what each swap unlocked for the three chains above.

\`\`\`mermaid
flowchart TB
    Builder["builder · .with_types"] --> Comps[".with_components"]
    Comps --> Pool["pool — admission rules"]
    Comps --> Net["network — P2P"]
    Comps --> Exec["executor — EVM, opcodes, gas"]
    Comps --> Cons["consensus — PoS / HyperBFT / etc."]
    Comps --> Payload["payload — block building"]
    Comps --> AddOns["add-ons — RPC + ExEx"]
    AddOns --> Launch[".launch — your chain"]
\`\`\`

## The 6 components, walked

| Component | What you swap | What it unlocks |
| :--- | :--- | :--- |
| \`pool\` | Tx admission, ordering, eviction | priority lanes, payments-first ordering, app-specific MEV rules |
| \`network\` | P2P transport, peer policy | private subnets, allowlists, custom protocols |
| \`executor\` | EVM configuration | **custom opcodes**, custom precompiles, custom gas table |
| \`consensus\` | Block validation rules | PoS → HyperBFT, PoA, Tendermint, anything |
| \`payload\` | Block builder | MEV-aware ordering, app-specific batching |
| \`add_ons\` | Non-runtime extensions | custom JSON-RPC namespaces, ExEx installs |

Each gets a \`*Builder\` trait — \`PoolBuilder\`, \`NetworkBuilder\`, etc. — that the SDK calls during \`.launch()\` to construct the actual subsystem.

> 🛑 **Predict.** Of these 6 components, which is the one Hyperliquid most heavily customized for HyperEVM? Which is the one Tempo most heavily customized for payments? Hold both guesses.

## Hyperliquid HyperEVM — what they swap

- **\`consensus\`** — They run **HyperBFT** (their own Byzantine-fault-tolerant consensus protocol), not Ethereum PoS. The consensus subsystem is replaced.
- **\`executor\`** — Order-book-coupled execution: certain opcodes interact with the perp order book that lives alongside the EVM. Custom executor.
- **\`pool\`** — Admission rules tuned for high-frequency perp updates.
- **everything else** — Reth defaults.

> 🛑 **Anti-fluency.** Hyperliquid swapped \`consensus\` and \`executor\`. **Why didn't they fork all of Reth and rewrite from scratch?** The honest answer is what makes the SDK matter — they wanted everything *else* (sync, MDBX, header downloads, sender recovery, RPC) to track upstream Reth so they can pull Paradigm's updates without a rebase nightmare. Component composition is the maintenance story.

## Tempo — what they swap

Tempo's source is now public ([\`tempoxyz/tempo\`](https://github.com/tempoxyz/tempo) — 900+★, "the blockchain for payments"). Worth knowing **before you open it**: their Reth fork at [\`tempoxyz/reth\`](https://github.com/tempoxyz/reth) is **0 commits ahead, 1374 commits behind** upstream Paradigm Reth. They did not fork Reth at all. The entire payments-specific customization lives in the \`tempoxyz/tempo\` crate, which depends on upstream Reth as a library.

That's the strongest possible empirical proof of the SDK's pitch — and it tells you exactly which components Paradigm's design enabled them to swap without touching the 80% they inherit:

- **\`pool\`** — Payment-prioritized lanes. A merchant payment shouldn't wait behind a high-gas DeFi tx; the pool surfaces them differently.
- **\`payload\`** — Block construction tuned for payment-finality patterns.
- **\`add_ons\`** — Custom RPC namespaces for payment-specific endpoints, plus integration with the [Machine Payments Protocol](https://github.com/tempoxyz/mpp-specs) (their HTTP-402 layer for agent payments).
- **\`consensus\` / \`executor\`** — Reth defaults are sufficient; they did not need a custom EVM or custom consensus.

Adjacent novel surfaces worth knowing they shipped (not direct Reth component swaps, but enabled by the unmodified Reth dependency):

- **[Zones](https://github.com/tempoxyz/zones)** — confidential blockchains anchored to Tempo, with encrypted deposits/withdrawals and 250ms block times. Compliance policies (TIP-403) inherited from L1.
- **[tidx](https://github.com/tempoxyz/tidx)** — PostgreSQL+ClickHouse hybrid indexer for hot point lookups + analytics.

The pattern: **swap the parts that match your thesis, keep everything else.** Tempo's thesis is payments-priority; the components they swap reflect that. They didn't need a custom executor (no custom opcodes) or custom consensus (standard L1 PoS works), so they didn't write those.

## Berachain (bera-reth) — what they swap

- **\`consensus\`** — **Proof of Liquidity**: validators stake liquidity into BEX (their DEX) instead of staking the native token alone. The consensus rules differ from Ethereum PoS.
- **\`executor\`** — Coupled with PoL, so reward distribution interacts with execution differently.
- **\`add_ons\`** — DEX-aware RPC namespaces.
- **everything else** — Reth defaults.

## The pattern: swap what your thesis demands

If you can articulate your chain's thesis in one sentence, you can usually map it to 1–3 component swaps:

| Thesis | Components to swap |
| :--- | :--- |
| "Faster perp execution coupled to an order book" | \`consensus\`, \`executor\`, \`pool\` |
| "Payment-priority L1" | \`pool\`, \`payload\`, \`add_ons\` |
| "Liquidity-staked PoS" | \`consensus\`, \`executor\`, \`add_ons\` |
| "Privacy-focused L1 with shielded txs" | \`pool\`, \`executor\`, \`add_ons\` (custom RPC) |

> 🔍 **Find in repo.** Open \`EthereumNode::components()\`'s definition. The default builders for each component are listed there — that's the menu of "what comes for free."

## What stays constant: the load-bearing 80%

The components you *don't* swap are the bulk of the value:

- **Sync orchestrator** (the \`Stage\` pipeline you read in Module 1)
- **MDBX schema and storage layer**
- **Header download, sender recovery, hashing, Merkle, indexes**
- **JSON-RPC server runtime, engine API server**
- **Tokio runtime, tracing, metrics**

This is why "compose, don't fork" is the only viable maintenance story for an L1 you intend to run for years. **Paradigm's updates flow into the 80%; your fork-shaped surface area stays in the 20% you wrote.**

## Recall before the quiz

Without scrolling:

1. Of the 6 components, which would Hyperliquid most heavily customize, and why?
2. Why is \`pool\` the right component to swap for payments-priority, not \`consensus\`?
3. What's the maintenance argument for "compose, don't fork"?
4. Sketch the *minimum* set of components you'd swap to ship a privacy-focused L1.

The next lesson is a quiz. Engage with these recalls now if any answer is shaky.
`,
                },
                {
                  title: 'Quiz: did the SDK component model stick?',
                  slug: 'reth-sdk-quiz-en',
                  type: 'QUIZ',
                  sortOrder: 11,
                  duration: 4,
                  xpReward: 25,
                  content: `# Quiz: did the SDK component model stick?

Four questions covering the builder pattern and the component menu. Same rule: **you can't nod past a quiz.**

If you miss two or more, scroll back to *Building the node-builder API* before going on to the drill.`,
                  quizQuestions: [
                    {
                      question: "Why does `.with_types::<EthereumNode>()` come *first* in the builder chain, before `.with_components(...)`?",
                      options: [
                        "Stylistic — order doesn't matter to the compiler.",
                        "Performance — types-first compiles faster.",
                        "Types are load-bearing for components: tx and block types determine what the pool, executor, payload, etc. operate on. The chain commits to a type bundle first so subsequent component builders can be type-aware.",
                        "Backwards compatibility with older Reth versions.",
                      ],
                      correctIndex: 2,
                      explanation: "Components depend on types. If `with_components` came first, every builder would have to be generic over not-yet-chosen types. The chain's order encodes the dependency graph — types first, then components built on top.",
                    },
                    {
                      question: "You're building a payment-priority L1. Which component(s) most directly enable that?",
                      options: [
                        "`consensus` — payment priority is a consensus rule.",
                        "`pool` (admission and ordering rules) plus `payload` (block builder). The pool decides which txs get into the next block first; the payload builder decides their final order.",
                        "`executor` — payment priority is encoded in opcodes.",
                        "`network` — the P2P layer routes payments.",
                      ],
                      correctIndex: 1,
                      explanation: "Pool surfaces high-priority payments early; payload finalizes the block ordering. Consensus, executor, and network are unrelated to admission/ordering. This maps to Tempo's actual customization.",
                    },
                    {
                      question: "Why is 'compose components, don't fork all of Reth' the only viable strategy for a chain you maintain for years?",
                      options: [
                        "Forking is faster.",
                        "Forking gives you ownership of 200K+ lines you don't actually want to change. Component composition lets you own only the parts you swap (typically <10K lines), while Paradigm's upstream updates flow into the 80% you depend on as a library.",
                        "Forking violates Reth's license.",
                        "It doesn't matter — both work equally well.",
                      ],
                      correctIndex: 1,
                      explanation: "This is the maintenance argument. Forks accumulate divergence with every upstream release. Composition keeps the upgrade path open: Reth ships an update, you bump a Cargo dep, and your custom builders keep working because they only touched the override surface.",
                    },
                    {
                      question: "What's the difference between using ExEx and using the Reth SDK?",
                      options: [
                        "There's no difference — they're aliases for the same thing.",
                        "ExEx extends an existing Ethereum node by hooking into chain commits (you're a guest). The SDK lets you build *your own chain* by composing Reth's components (you're the host). ExEx is for indexers, MEV bots, rollups; the SDK is for L1s/L2s.",
                        "ExEx is for L1s, SDK is for indexers.",
                        "SDK is a deprecated version of ExEx.",
                      ],
                      correctIndex: 1,
                      explanation: "ExEx = listen to chain events, derive state, prune-friendly. SDK = define the chain, swap components, ship a node binary. They're complementary tools at different levels of the stack — and a real production deployment often uses both (the SDK to define the chain, then ExEx to add an indexer).",
                    },
                  ],
                },
                {
                  title: 'Drill: ship a custom pool builder',
                  slug: 'reth-sdk-drill-en',
                  type: 'CONTENT',
                  sortOrder: 12,
                  duration: 12,
                  xpReward: 25,
                  content: `# Drill: ship a custom pool builder

Reading is rehearsal. **Doing is memory.** This drill takes you from "I've read about the SDK" to "I have written a custom pool builder, swapped it in, and watched my code run inside a node binary."

## Setup

\`\`\`bash
git clone https://github.com/paradigmxyz/reth
cd reth/examples/custom-node-components
\`\`\`

The example builds standalone — no need to build the rest of Reth.

## Drill 1 — Read \`CustomPoolBuilder\`

Open \`src/main.rs\`. The example overrides exactly one component: \`pool\`. Find the \`CustomPoolBuilder\` struct and its \`PoolBuilder\` impl.

> 🛑 **Predict.** In one sentence, what does \`CustomPoolBuilder::build_pool\` do? Hold your guess.

Skim the impl. Three sections:

1. **Validators** — sets up the transaction validator (signature checks, nonce checks, etc.).
2. **Ordering** — picks a tx ordering strategy (\`CoinbaseTipOrdering\` is the default).
3. **Construction** — builds an \`EthTransactionPool\` with those choices and an \`InMemoryBlobStore\`.

If your guess missed any of those three, scroll back and re-read the impl. The pool isn't a single piece — it's a composition of (validator, ordering, blob store).

## Drill 2 — Add a log on every transaction

You want to see your custom code actually run. Add a log on every transaction the validator accepts.

The cleanest approach: wrap the validator in your own validator that logs and then delegates:

\`\`\`rust
struct LoggingValidator<V> {
    inner: V,
}

impl<V: TransactionValidator> TransactionValidator for LoggingValidator<V> {
    type Transaction = V::Transaction;

    async fn validate_transaction(
        &self,
        origin: TransactionOrigin,
        transaction: Self::Transaction,
    ) -> TransactionValidationOutcome<Self::Transaction> {
        info!(
            tx_hash = %transaction.hash(),
            gas_price = ?transaction.gas_price(),
            "Pool: validating transaction"
        );
        self.inner.validate_transaction(origin, transaction).await
    }
}
\`\`\`

(Adapt to the exact \`TransactionValidator\` trait shape in your local Reth — the API drifts. The point is the *structure*.)

Then in \`CustomPoolBuilder::build_pool\`, wrap the underlying validator:

\`\`\`rust
let inner_validator = TransactionValidationTaskExecutor::eth_builder(...)
    /* ...existing setup... */
    .build_with_tasks(...);

let validator = LoggingValidator { inner: inner_validator };

// pass \`validator\` instead of \`inner_validator\` to the pool
\`\`\`

> 🔧 **The wiring is left as the drill.** The exact incantation depends on the version of \`reth-pool\` you're on. The point is to put your code on the path of every tx that enters the pool.

## Drill 3 — Run a dev chain and watch your log fire

\`\`\`bash
cargo run -- --dev
\`\`\`

\`--dev\` starts a single-node ephemeral chain that mines blocks fast. Send a tx (any way — \`cast send\`, MetaMask pointed at \`localhost:8545\`, your own script):

\`\`\`bash
cast send \\
  --rpc-url http://localhost:8545 \\
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \\
  --value 1ether \\
  0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
\`\`\`

(Use the dev account's private key — \`--dev\` ships a known one; the one above is the standard Anvil/Reth dev key.)

> 🛑 **Watch your terminal.** You should see:
>
> \`\`\`
> Pool: validating transaction tx_hash=0x... gas_price=...
> \`\`\`
>
> If you don't, the wiring is wrong. Common cause: you constructed \`LoggingValidator\` but the builder still hands the *inner* validator to the pool. Fix the wiring; rerun.

## Drill 4 — One more swap, sketched

You've owned \`pool\`. Now sketch what changes for one more component.

> 🛑 **Question (write it down):** You want to add a custom precompile (e.g., a fast ed25519 verifier) for your chain. Which component do you swap? What does the swap roughly look like?

You swap \`executor\`. The custom precompile lives inside the EVM configuration. The skeleton:

\`\`\`rust
.with_components(
    EthereumNode::components()
        .executor(CustomExecutorBuilder { extra_precompiles: vec![ed25519_verify] })
)
\`\`\`

You'd implement \`ExecutorBuilder\` analogously to how \`CustomPoolBuilder\` implements \`PoolBuilder\`. **The pattern transfers.** That's the whole point of the SDK — once you've swapped one component, swapping another is mechanical.

> 🔍 **Open** \`examples/custom-node-precompiles/\` (if it exists in your version of the repo) for a worked example of swapping the executor.

## End-of-lesson recall

Without scrolling, in your own words:

1. What three pieces does \`CustomPoolBuilder::build_pool\` compose?
2. Why is wrapping the validator the cleanest way to inject logging into the pool?
3. If you wanted to add a custom precompile, which component would you swap?
4. What's the *one* line change in \`main.rs\` to use a different component builder?

After this drill, you've shipped a 1-line component swap. **Scale this pattern to consensus or executor and you're building HyperEVM-class infra.**

## 📺 Further watching

\`\`\`youtube
cc45Rcmrro4 | The Future of Reth (Frontiers 2025)
\`\`\`
`,
                },
                {
                  title: 'Bridge to what comes next — Advanced and Expert',
                  slug: 'reth-bridge-to-expert-en',
                  type: 'CONTENT',
                  sortOrder: 13,
                  duration: 10,
                  xpReward: 20,
                  content: `# Bridge to what comes next — Advanced (L1 Architect) and Expert

> 🛑 **Gate check.** Before claiming you've finished Inside Reth, answer these — out loud or on paper, no scrolling back through previous lessons:
>
> 1. What does \`popn_top!\` expand to? Why does it use \`unwrap_unchecked()\` inside \`unsafe\`?
> 2. Why are \`Database\` and \`DatabaseRef\` separate traits? What does the asymmetric \`auto_impl\` list (\`&mut, Box\` vs \`&, &mut, Box, Rc, Arc\`) tell you?
> 3. What does \`ExExEvent::FinishedHeight\` tell Reth's pruner — and what's the disk consequence of forgetting it?
> 4. Why is \`MerkleStage\` *after* hashing, not interleaved?
> 5. To ship a purpose-built L1 like Tempo, which Reth components do you swap?
>
> **Got fewer than 4 right?** Don't continue. Go back to the relevant Inside Reth lesson. What comes next assumes these as fluent vocabulary, not concepts you'll re-look-up.

If you cleared the gate: you've climbed **Alloy → Revm → Reth (Staged Sync, ExEx, custom NodeBuilder)**. You can read the source of all three with intent.

But "reading" is only half. **Two tiers** wait next, depending on your goal (many learners do both):

## Advanced tier — design your own L1 (5 courses, ADVANCED difficulty)

Use the source you read in Inside to *design* L1s. The implementation skills behind architecting Hyperliquid- or Tempo-class chains.

| Course | Focus |
| :--- | :--- |
| **Consensus Engineering** | PoS / BFT / Tendermint internals; latency / liveness / finality trade-offs |
| **Cross-Chain Bridges** | CCIP (Chainlink's cross-chain protocol), OP Standard Bridge, light clients in real source — then build your own |
| **Sequencer & Rollup Architecture** | centralized to shared sequencers; MEV defense and forced inclusion (letting users land txs even when a sequencer censors) |
| **P2P Networking Internals** | devp2p (Ethereum's transport), libp2p (the modular alternative used by many L1s), gossip subprotocols, peer scoring |
| **Validator Operations** | key management, slashing conditions, coordinated upgrades |

## Expert tier — ship in production (2 courses, EXPERT difficulty)

Cross from "I can read it" to "I can ship it." Performance, ops, application engineering.

| Course | Focus |
| :--- | :--- |
| **Reth Expert** | performance, MDBX, Tokio internals, procedural macros, custom precompiles, MPT, MEV, zkEVM, Reth fork ops |
| **Building with the Stack** | 9 runnable apps — MEV searcher, indexer, wallet backend, cheatcode, swap aggregator, order router capstone, cross-client validation |

## Which one first?

Both are reachable directly from Inside Reth and are independent:

- **Advanced (L1 Architect) first** — if you want to design L1s, understand Hyperliquid/Tempo from the inside
- **Expert first** — if you want to ship apps on an existing chain, or you need ops / performance engineering

No strict order. Pick whichever matches your interest and project. Finishing both means "read + design + ship" — the full triad.

## The mindset shift

Inside (Intermediate) taught you the **structures**. The next tiers teach you the **decisions** behind them.

> 🛑 **Predict the answers before reading mine.** Have an opinion first — even a wrong one. Engineers shipping infra do.
>
> - *Why* does Reth use MDBX and not RocksDB?
> - *Why* does Revm pop one and write through a reference instead of pop/pop/push?
> - *Why* does \`#[track_caller]\` matter on \`Database::tx()\`?
> - *Why* are Foundry cheatcodes precompiles and not opcodes?

---

Now mine:

- **MDBX vs RocksDB** — read latency under compaction stalls.
- **Pop-one-write-through** — one fewer memory write per ADD opcode.
- **\`#[track_caller]\`** — panic backtrace shows the buggy caller, not the trait method.
- **Cheatcodes as precompiles** — consensus compatibility with vanilla EVM (precompiles are reserved addresses, not new opcodes — your fork still parses mainnet bytecode).

The point isn't that you matched my wording. The point is: did you have an *opinion* before reading? **Once you internalize the *why*, you can defend design choices to a Paradigm engineer or a Hyperliquid validator op — and that's the gate to grant-eligible work.**

## Before you continue

If the Gate check at the top felt easy, jump into Advanced or Expert.

If any of the five questions sent you back to a previous lesson — re-read them now. Both next tiers are denser. Running the linked code locally as you go is no longer optional.

> The first three months in infra learning are the hardest. Documentation is sparse — **the source code is the textbook**. The Advanced and Expert tiers are where that lesson pays off.`,
                },
                {
                  title: 'Inside Reth final quiz',
                  slug: 'reth-advanced-quiz-en',
                  type: 'QUIZ',
                  sortOrder: 14,
                  duration: 8,
                  xpReward: 25,
                  content: `# Inside Reth final quiz

Final check across Staged Sync, ExEx, and the Reth SDK. Three questions. Same rule: **you can't nod past a quiz.** Miss two and re-read the relevant build-up before claiming you're done with Inside Reth.`,
                  quizQuestions: [
                    {
                      question: "What's the actual advantage of Reth's Staged Sync over block-by-block sync?",
                      options: [
                        'Allows blocks to be downloaded but never executed, saving disk',
                        'Processing in stages over block ranges maximizes I/O, CPU, and cache efficiency — and makes reorgs symmetrical via unwind',
                        'Skips Merkle root computation by deferring it indefinitely',
                        'Removes the database — state is derived on demand at query time',
                      ],
                      correctIndex: 1,
                      explanation: 'Staged Sync (Headers → Bodies → Senders → Execution → Hashing → Merkle → TxLookup → Indexes → Finish) processes ranges per stage. Sender recovery parallelizes via Rayon. Hashing is sorted before MerkleStage runs. And every stage has both `execute` and `unwind` — making reorgs a normal mode of operation, not a special case.',
                    },
                    {
                      question: 'What can you do with ExEx (Execution Extensions)?',
                      options: [
                        'Inject custom logic into the JSON-RPC pipeline before responses are sent',
                        'Run Rust code in-process on every chain commit, reorg, or revert at near-execution-time latency',
                        'Override how transactions are gossiped on the P2P network',
                        "Replace Reth's consensus engine with a custom one",
                      ],
                      correctIndex: 1,
                      explanation: 'ExEx receives ChainCommitted / ChainReorged / ChainReverted notifications in-process — perfect for indexers, MEV pipelines, and real-time risk engines. (RPC customization is via add_ons, network and consensus customization is via with_components — different SDK surfaces.)',
                    },
                    {
                      question: 'Which of these is the realistic customization surface when building an App-chain with the Reth SDK?',
                      options: [
                        'Only the chain ID and gas limit at the genesis level',
                        'Pool, network, payload, executor (EVM), and consensus components — plus RPC and ExEx via add-ons',
                        'Only Stage<Provider> implementations — the rest is locked',
                        'Database tables and indices only — the EVM itself is fixed',
                      ],
                      correctIndex: 1,
                      explanation: 'The SDK exposes `with_components.{pool, network, payload, executor, consensus}` plus `with_add_ons` for RPC and ExEx. Everything from a custom mempool (Tempo-style priority lanes) to a custom consensus (HyperBFT) to a custom EVM (custom opcodes / precompiles) is one builder swap away.',
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
    },
  });
}
