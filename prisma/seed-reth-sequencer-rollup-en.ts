import { PrismaClient } from '@prisma/client';

export async function seedRethSequencerRollupEN(prisma: PrismaClient) {
  const tags = ['reth', 'sequencer', 'rollup', 'fraud-proofs', 'validity-proofs', 'mev-boost', 'shared-sequencer', 'l2', 'expert'];

  await prisma.course.create({
    data: {
      slug: 'reth-sequencer-rollup-en',
      title: 'Sequencer & Rollup Architecture — From Centralized Block Producer to Shared Sequencers',
      description:
        "How modern L2s actually work: the sequencer's role, batch posting and data availability, fraud proofs vs validity (ZK) proofs, reading op-rbuilder and op-batcher, building a minimal sequencer on Reth, and the decentralization paths from single-operator to shared sequencers. The course that prepares you to architect L2s like Tempo Moderato, ship an OP Stack chain, or build the next shared sequencer.",
      difficulty: 'ADVANCED',
      duration: 165,
      xpReward: 500,
      track: 'reth-l1-architect',
      tags,
      isPublished: true,
      sortOrder: 320,
      locale: 'en',
      instructorName: 'RethLab',
      modules: {
        create: [
          {
            title: 'Sequencer Fundamentals',
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: 'What is a sequencer? The rollup model in 15 minutes',
                  slug: 'sequencer-fundamentals-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 16,
                  xpReward: 40,
                  content: `# What is a sequencer? The rollup model in 15 minutes

You send a swap on Base. It confirms in under a second. The transaction shows up in your wallet. **One company** — Coinbase — chose the order it landed in, executed it on their own server, and *will* eventually post it to Ethereum. By every conventional definition, that's a centralized system. So why is Base called a "decentralized rollup"?

This lesson is the answer. A **sequencer** (the entity that orders transactions on a rollup) is centralized in Base, Optimism, Arbitrum, Mantle, and almost every production L2. Decentralization is "on the roadmap" everywhere and it's been on the roadmap for years. That's not an embarrassment — it's the design.

> 🛑 **Predict before scrolling.** Optimism has **one sequencer** operated by the OP Labs team. **Why is this acceptable?** What attack is mitigated even with a single sequencer that *would* be possible without the rollup architecture?

## 1. The rollup model

A rollup is two things glued together:

1. An **L2 execution environment** — its own EVM, its own state, its own block production
2. A **commitment to L1** — periodic data + state root submissions to Ethereum (or another base chain)

The sequencer's job lives in part 1. It:
- Receives user transactions
- Orders them
- Executes them on L2
- Produces L2 blocks
- Submits batches to L1

\`\`\`mermaid
flowchart TB
    Users["L2 Users"] -->|submit tx| Seq["Sequencer<br/>(centralized)"]
    Seq -->|execute| L2["L2 chain<br/>(Reth-based execution)"]
    L2 -->|batch| Batcher["Batcher<br/>(off-chain)"]
    Batcher -->|post calldata + state root| L1["L1 (Ethereum)"]
    L1 -->|finalize after challenge| L2
\`\`\`

The architectural payoff: **a centralized sequencer doesn't put your funds at risk.** If it censors you, submit the tx directly to L1's force-inclusion contract — the protocol forces the sequencer to include it on a deadline. If it lies about state, L1 contracts reject your withdrawal.

That's the rollup model's whole pitch: **trust the sequencer for UX, not for funds**.

## 2. The sequencer's three jobs

Every sequencer does three things:

| Job | What | Where |
| :--- | :--- | :--- |
| **Ordering** | Pick the order of transactions in each L2 block | On L2 |
| **Execution** | Run them through revm, produce post-state | On L2 |
| **Batching** | Bundle L2 blocks for L1 posting | Off-chain → L1 |

For OP Stack chains, these correspond to three repos:
- **op-rbuilder** (or op-geth): the execution + ordering
- **op-batcher**: the batching service
- **op-proposer**: the state root submission service

Reth-based L2s mirror this structure. The sequencer runs Reth as its execution layer; the batcher and proposer are separate services.

> 🛑 **Anti-fluency.** A user submits a tx to the sequencer. The sequencer ignores it (censorship). **Walk through what the user can do.** If your answer doesn't include "L1 force-inclusion contract," you don't have the rollup security model fully internalized.

The user submits the tx to the **L1 inbox contract** (e.g., OptimismPortal). The sequencer is forced (by protocol rules) to include that tx within a deadline (~1 hour for OP Stack). After that deadline, anyone can force the inclusion. So **censorship has a finite cost** — at most a 1-hour delay plus L1 gas fees.

## 3. The centralization paradox

If decentralization is the whole point, why ship centralized sequencers? Five practical reasons keep the centralized default sticky:

1. **Performance**: a centralized sequencer has predictable ordering. Decentralized = consensus overhead = latency.
2. **MEV** (maximal extractable value — the value a block builder can capture by reordering txs): a centralized sequencer controls MEV extraction. Decentralized = either give up MEV or coordinate via auctions.
3. **Liveness**: one operator is easier to keep online than coordinated validators.
4. **Pre-confirmations**: a single sequencer can promise "your tx will be included" instantly. Multi-party requires voting.
5. **Operational simplicity**: monitoring, on-call, deployment — all easier with one operator.

The trade-off is **UX (centralized sequencer) vs censorship-resistance (decentralized)**. Most L2s pick UX.

Tempo Moderato (Tempo's testnet) is centralized today. Hyperliquid is centralized too. Both will likely decentralize eventually but **not at launch**.

## 4. The L1↔L2 communication layers

Three contracts on L1 do the work for any rollup:

| Contract | Role |
| :--- | :--- |
| **Inbox** (OptimismPortal) | Receives deposits + force-included txs |
| **Outbox / OutputOracle** | Receives state root commitments from sequencer |
| **Bridge** | User-facing — wraps Inbox for asset transfers |

The sequencer **must** read the Inbox every L1 block. If it ignores deposits or force-included txs for more than the deadline (~1 hour), the sequencer is **falling behind** and can be challenged.

On the other direction, the sequencer **submits** state roots to the OutputOracle. These start a challenge period (7 days for optimistic rollups, instant for ZK rollups).

> 🛑 **Predict.** A sequencer goes offline for 2 hours. **What happens to the L2 chain?** What about user funds? Trace through carefully.

The L2 chain **halts** (no new blocks). User funds are **safe** (no state changes happening). After 2 hours: depositors who submitted via Inbox can force their txs once any "escape hatch" mechanism kicks in. The exact recovery depends on the rollup's specific contracts.

## 5. Where Reth fits

Reth is the **execution layer** for the sequencer. The sequencer runs Reth as its EL, calling Engine API to:
- \`forkchoiceUpdated\` with the new L2 head
- \`getPayload\` to fetch the built L2 block
- \`newPayload\` to validate (typically a no-op since the sequencer built it)

For OP Stack specifically: \`crates/optimism/\` in reth provides the OP-aware execution layer. The sequencer is a separate process that drives Reth via Engine API.

For Tempo: similar pattern. Reth runs as execution; a Paradigm-built sequencer drives it.

## 6. The decentralization spectrum

Rollups exist on a spectrum:

| Position | Examples | Trust model |
| :--- | :--- | :--- |
| **Single sequencer** | Optimism, Arbitrum (launch), Base | Trust 1 operator for liveness, escape hatch for safety |
| **Multi-sequencer** (whitelisted) | Some L3s, validium chains | Trust N operators (M-of-N) |
| **Decentralized sequencer** (no shared) | Polygon zkEVM (recent) | PoS-style sequencer election |
| **Shared sequencer** | Espresso, Astria, Radius | One sequencer set serves many rollups |

Most chains are at position 1. Position 4 is the architectural frontier — covered in Lesson 6.

## 7. For your projects

### Tempo Moderato → Tempo mainnet

- Today: centralized sequencer (Paradigm operates it)
- Decentralization path likely: multi-operator → PoS → eventually maybe shared
- Your soltempo / mppsol code interacts with **the sequencer's RPC**, treats it as the chain's source of truth

### Hypothetical "your own L2"

If you spin up a chain on OP Stack:
- You operate the sequencer (cargo run op-rbuilder)
- You operate the batcher
- You operate the proposer
- Users trust you for liveness, L1 contracts for safety

Building this from scratch is the next 4 lessons.

## 8. Reading list

- [Optimism docs - Sequencer architecture](https://docs.optimism.io/builders/chain-operators/architecture)
- [Vitalik on rollups](https://vitalik.ca/general/2021/01/05/rollup.html) — the foundational essay
- [Paradigm on shared sequencing](https://www.paradigm.xyz/2023/11/shared-sequencer) — the future direction

## 9. Practice

For each chain, identify (a) sequencer position on the spectrum, (b) how a user can recover from sequencer downtime:

1. Optimism mainnet
2. Arbitrum One
3. Polygon zkEVM
4. Tempo Moderato (per public info)
5. Hyperliquid

> Final check: in one sentence, why does "centralized sequencer" not mean "centralized rollup"? **If your answer doesn't reference "trust for UX, not for funds," re-read §1.**`,
                },
                {
                  title: 'Batch posting and data availability',
                  slug: 'sequencer-batch-da-en',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 16,
                  xpReward: 40,
                  content: `# Batch posting and data availability

Before March 2024, posting 1MB of rollup data to Ethereum cost roughly **$300 per batch**. After EIP-4844, that same megabyte costs roughly **$3-$30**. The 10× drop is the single biggest cost improvement in rollup history — and it's why Base txs cost cents instead of dollars.

That improvement rests on a deeper question: **why does a rollup have to post any data to L1 at all?** The answer is **data availability** (DA — the property that anyone, not just the sequencer, can get hold of the transaction data). Without it, the sequencer's state root is unverifiable and you're back to trusting one company. This lesson covers what DA is, the four DA models, the EIP-4844 blob trick that made it cheap, and how op-batcher actually posts it.

> 🛑 **Predict before scrolling.** A rollup posts 1MB of transaction data to L1 every 12 minutes. **At Ethereum mainnet's gas prices, how much does this cost per day?** What was the cost difference before vs after EIP-4844?

## 1. Why data availability matters

A rollup commits to its L2 state via a **state root** on L1. But the state root is just 32 bytes — it doesn't tell you *what* the L2 state is. To reconstruct the L2 state, you need:

1. The **state root** (cheap — 32 bytes per batch)
2. The **transaction data** that produced it (expensive — every byte of every tx)

If only (1) is on L1, the sequencer can lie about (2) and there's no way to detect it.
If both are on L1, anyone can re-execute the txs and verify they produce the state root.

**Data availability** = "the transaction data is published somewhere everyone can read it."

## 2. The four DA models

| Model | Where data lives | Trust | Examples |
| :--- | :--- | :--- | :--- |
| **Rollup** | Posted to L1 calldata or blobs | L1 consensus | Optimism, Arbitrum, all "true" rollups |
| **Validium** | Posted to a separate DA committee | Multisig / PoS | StarkEx, dYdX v3 |
| **Volition** | User picks per tx (rollup or validium) | Mixed | dYdX v4-style hybrid |
| **Optimium** | DA committee with fraud proofs | DA committee + fraud proof | Newer designs |

For Tempo, Hyperliquid, and most chains we care about: **rollup** model. Data goes to L1 in some form.

## 3. EIP-4844 — the blob revolution

Before March 2024, rollups posted data as **calldata** (the input bytes of a regular Ethereum transaction) on L1. Calldata costs ~16 gas per byte (~$0.02/byte at 50 gwei). For 1MB per batch: ~$300.

EIP-4844 added a brand new transaction type — **blob transactions** — with its own fee market, priced for one use case: rollup DA.

| Property | Calldata | Blob (4844) |
| :--- | :--- | :--- |
| Cost per byte | ~16 gas | Variable, typically ~0.1-1 gas |
| Lifetime on L1 | Forever | ~18 days (then pruned) |
| Verification | Anyone can read | Anyone can read during 18 days |
| Max per block | ~125KB practical | 128KB × 6 = 768KB |

The trade-off: blobs are **cheap** but **pruneable**. After 18 days, the blob data is dropped from L1 nodes. Anyone needing it long-term must archive it separately (e.g., on IPFS, on dedicated archive nodes).

For 18-day proof window: enough time for fraud proofs to be submitted. After that: the rollup state is final, the data doesn't need to be on L1 anymore.

> 🛑 **Anti-fluency.** "Blobs are cheap so rollups are now 10x cheaper." Sort of true. **What's the catch?** Why does the 10x reduction not apply to all rollups equally?

The catch: blobs are **available** but **competing for blockspace**. As more rollups post blobs, blob gas price rises. The current equilibrium gives 10x reduction; if every rollup moves to blobs, it could compress to 3-5x. Plus: not all chains use Ethereum as DA. Celestia, EigenDA, Avail are alternatives.

## 4. The batch posting flow

For an OP Stack rollup posting to Ethereum:

\`\`\`mermaid
sequenceDiagram
    participant Seq as Sequencer
    participant Batcher
    participant L1 as Ethereum
    participant Proposer

    Note over Seq: Build many L2 blocks
    Seq->>Batcher: L2 blocks produced
    Note over Batcher: Compress + batch
    Batcher->>L1: Submit blob tx with batch data
    Note over L1: Blob included in L1 block
    Note over Seq: Compute new state root for batch
    Seq->>Proposer: Latest state root
    Proposer->>L1: Submit state root to OutputOracle
    Note over L1: Challenge period begins (7 days)
\`\`\`

Three different services, three different cadences:

| Service | Frequency | Purpose |
| :--- | :--- | :--- |
| Sequencer | Every L2 block (~2s) | Build blocks |
| Batcher | Every ~60s | Submit compressed batches to L1 |
| Proposer | Every ~1 hour | Submit state root commitments |

The L1 cost driver is the **batcher** (lots of data) and the **proposer** (less data, but every commitment costs gas).

## 5. Reading op-batcher

OP Stack's batcher is in [\`ethereum-optimism/optimism/op-batcher\`](https://github.com/ethereum-optimism/optimism/tree/develop/op-batcher) (Go). The Rust equivalent for Reth-based chains is in development.

The core loop:

\`\`\`go
// Pseudo-Go for clarity
for {
    // 1. Fetch new L2 blocks since last batch
    blocks := fetchL2BlocksSince(lastBatchEnd)

    // 2. Compress with zlib
    compressed := zlib.Compress(blocks)

    // 3. Split into blob-sized chunks (~128KB each)
    chunks := chunk(compressed, BLOB_SIZE)

    // 4. Submit blob tx to L1
    for _, chunk := range chunks {
        submitBlobTx(chunk)
    }

    // 5. Update local state
    lastBatchEnd = blocks.LastBlock
}
\`\`\`

That's the gist. The complexity is in:
- **Reorg handling** (L2 reorg = batches must be re-sent)
- **Gas pricing** (when to retry with higher fee)
- **Throughput tuning** (how aggressively to fill blobs)

> 🔍 **Find in repo.** Open [op-batcher's main.go](https://github.com/ethereum-optimism/optimism/blob/develop/op-batcher/batcher/driver.go) and trace the main loop. **Where does it decide to submit?** What's the trigger?

## 6. Compression — the silent winner

Rollup batches are highly compressible. Typical compression ratios:

| Data | Compression |
| :--- | :--- |
| Raw transactions | 1.0x |
| RLP-encoded | 1.0x |
| zlib over batch | 3-5x |
| Custom (zlib + addresses/etc compressed) | 5-10x |

Each compression ratio doubles the throughput at the same blob cost. Production rollups use custom compression that beats vanilla zlib by 2-3x.

For Tempo (payment-focused): payment txs are very repetitive (same merchants, same patterns). Compression ratios likely better than generic rollups. **This is a hidden cost advantage** for Tempo's specific use case.

## 7. The DA alternatives

Rollups don't have to post to Ethereum:

### 7.1 Celestia

[\`celestia\`](https://github.com/celestiaorg/celestia-app) is a dedicated DA layer. Rollups post data to Celestia, get a DA attestation, then post the attestation to L1.

Cost: cheaper than Ethereum blobs (~$0.0001 per byte vs ~$0.001 for blobs).

Trade-off: depend on Celestia's security (not Ethereum's). Smaller validator set. Younger ecosystem.

### 7.2 EigenDA

[\`eigenda\`](https://github.com/Layr-Labs/eigenda) is EigenLayer-based DA. Restakers of ETH on EigenLayer provide DA services. Inherits Ethereum's economic security partially.

### 7.3 Avail

[\`avail\`](https://github.com/availproject/avail) is Polygon's DA layer. Similar to Celestia structurally.

For Tempo: as a Paradigm-built L1, Tempo likely uses Ethereum DA initially. Switching to Celestia/EigenDA would lower cost but reduce decentralization (smaller DA validator set).

## 8. Practice

1. Calculate: at 1MB batch per minute, ~$0.1/MB blob cost, what's daily DA cost for a rollup?
2. If the rollup processes 100 tx/s and each tx is 200 bytes: how much does each user tx cost in DA?
3. Open op-batcher source — find the compression call
4. Identify: when would a chain pick Celestia over Ethereum blobs?

## 9. Reading list

- [EIP-4844 spec](https://eips.ethereum.org/EIPS/eip-4844) — the blob standard
- [op-batcher](https://github.com/ethereum-optimism/optimism/tree/develop/op-batcher) — production batcher
- [Celestia docs](https://docs.celestia.org/) — DA layer alternative

> Final check: in one sentence, why is **data availability** the load-bearing security assumption of a rollup, and what happens to user funds if DA fails? **If your answer doesn't reference "anyone can reconstruct L2 state from L1 data," re-read §1.**`,
                },
              ],
            },
          },
          {
            title: 'Reading Real Sequencer Code',
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: 'Reading op-rbuilder — the Reth-based OP Stack sequencer',
                  slug: 'sequencer-op-rbuilder-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 18,
                  xpReward: 45,
                  content: `# Reading op-rbuilder — the Reth-based OP Stack sequencer

If you spin up your own OP Stack chain today, the binary producing blocks is almost certainly [\`paradigmxyz/op-rbuilder\`](https://github.com/paradigmxyz/op-rbuilder) — Paradigm's Rust block builder for OP-derived rollups. Every Reth-based L2 either runs it directly or forks from it. It's the production reference for "sequencer on Reth," and it's the code you'd read if you wanted to understand what a real sequencer does once the marketing diagrams stop.

> 🛑 **Predict before scrolling.** A sequencer must produce blocks every ~2s. **What's the bottleneck — execution speed (revm) or block building (selection + ordering)?** The answer matters because it tells you where optimization effort should go.

## 1. The op-rbuilder architecture

\`\`\`mermaid
flowchart TB
    EngineAPI["Engine API<br/>(from rollup consensus)"] -->|forkchoiceUpdated| Builder["Block Builder"]
    Mempool["L2 Mempool"] -->|pending txs| Builder
    L1Inbox["L1 Inbox<br/>(deposits + force-includes)"] -->|deposit events| Builder
    Builder -->|build block| EVM["revm<br/>(execution)"]
    EVM -->|state changes| State["State DB"]
    Builder -->|signed block| EngineAPI2["Engine API<br/>(getPayload response)"]
    Builder -->|broadcast| P2P["P2P network<br/>(propagate to nodes)"]
\`\`\`

Three input streams:
1. **Engine API** — consensus tells us what to build on top of
2. **Mempool** — user txs waiting for inclusion
3. **L1 Inbox** — deposit txs that must be included

The builder takes these, **applies the OP Stack rules** for ordering, and produces a block.

## 2. OP Stack ordering rules

A sequencer building an OP block must respect specific rules:

1. **Deposits first**: any deposit txs from the L1 inbox must come at the top of the block
2. **L1 epoch attribution**: the block must reference an L1 block (its "L1 origin")
3. **Sequencer signature**: the block must be signed by the active sequencer key
4. **Gas limit**: must be within OP-specific bounds (different from mainnet)
5. **Force inclusions**: if any L1-inboxed txs have aged past deadline, must include them

These are the OP-specific block validity rules. **op-rbuilder enforces all of them.**

> 🛑 **Anti-fluency.** "Sequencer can do whatever it wants." **Half true.** Restate: what's the actual control surface for a sequencer? Where are the consensus-enforced constraints?

Sequencer can choose:
- Which user txs to include
- Order of user txs
- L1 epoch to attribute to
- Block timestamp (within bounds)

Sequencer **cannot** choose:
- Whether to include deposits (must)
- Whether to skip force-included txs (must include)
- Block validity rules (gas limit, base fee math)

Violating any "cannot" = L1 verification fails = your block gets reorged.

## 3. Reading op-rbuilder source

Key files (paths may shift across versions; navigate via search):

| Path | Role |
| :--- | :--- |
| \`crates/builder/src/payload.rs\` | The core block-building loop |
| \`crates/builder/src/ordering.rs\` | Tx ordering strategy |
| \`crates/builder/src/deposit.rs\` | Deposit tx handling |
| \`crates/builder/src/seal.rs\` | Block sealing + signing |

The main building function looks roughly like:

\`\`\`rust
async fn build_payload(
    attributes: PayloadAttributes,
    parent: BlockHash,
    state: StateProvider,
    pool: TxPool,
) -> eyre::Result<ExecutionPayload> {
    let mut block_env = BlockEnv::from(parent, attributes);
    let mut executor = Executor::new(state, &block_env);
    let mut included_txs = Vec::new();

    // 1. Force-include deposit txs
    for deposit_tx in attributes.l1_deposits {
        executor.execute(&deposit_tx)?;
        included_txs.push(deposit_tx);
    }

    // 2. Include force-inclusion txs (aged inbox)
    for force_tx in attributes.force_included {
        executor.execute(&force_tx)?;
        included_txs.push(force_tx);
    }

    // 3. Pull from mempool until gas limit
    let pending = pool.best_pending();
    for tx in pending {
        if executor.gas_used() + tx.gas_limit() > block_env.gas_limit {
            break;
        }
        match executor.execute(&tx) {
            Ok(_) => included_txs.push(tx),
            Err(_) => continue, // skip failed txs
        }
    }

    // 4. Seal block (compute roots, sign)
    let payload = ExecutionPayload {
        header: build_header(&block_env, &executor, &included_txs),
        transactions: included_txs,
    };

    Ok(payload)
}
\`\`\`

That's the sequencer loop in ~30 lines. The complexity in production op-rbuilder is in:
- Async execution (build while accepting more txs)
- Reorg handling (when the parent changes mid-build)
- MEV-aware ordering (prefer high-fee txs, sandwich-resistant ordering)
- Gas estimation accuracy

> 🔍 **Find in repo.** Open [op-rbuilder's payload builder source](https://github.com/paradigmxyz/op-rbuilder) and find the actual \`build_payload\` (or equivalent). **How does it handle the case where the parent block changes mid-build?**

## 4. The MEV question — what does the sequencer extract?

Whoever picks the tx order picks who profits. For OP Stack chains, three positions on how aggressively the sequencer monetizes that power:

| Position | What sequencer does | Examples |
| :--- | :--- | :--- |
| **Vanilla FIFO** | Order by submission time | Naive implementations |
| **Priority-fee ordering** | Order by gas tip (like Ethereum mainnet) | OP Stack default |
| **MEV-aware with builder market** | Accept external bids for block construction | OP Stack with op-rbuilder + bundle markets |

op-rbuilder supports the third — chains can configure whether to **accept external bundles** from builders/searchers (third-party block constructors that compete to build the most valuable block). The bundle market pays the sequencer for blockspace.

This is where **Flashbots-style PBS** (proposer-builder separation — split who *chooses* the block from who *builds* it) comes to L2: builders compete to construct the most profitable block, the sequencer accepts the winning bid.

## 5. The pre-confirmation game

A single sequencer's killer UX feature is the **pre-confirmation**: the moment you submit a tx, the sequencer signs back "yes, this will be included in block N at position M." You can show the user "confirmed" in 100 ms — long before any L1 finality.

This trick **only works with one sequencer.** Multi-party setups have to vote, and voting takes round trips.

In op-rbuilder: the mempool admission step is where pre-confirmations would be issued. If the sequencer signs "I commit to including this tx," users can treat it as final without waiting for L1 finality.

> 🛑 **Anti-fluency.** "Pre-confirmations are free." **No.** What's the sequencer's risk when issuing a pre-conf? If your answer doesn't include "reorg" or "L1 challenge," you don't understand the commitment.

The sequencer commits to inclusion. If the L2 reorgs (which can happen), the tx might not be in the canonical chain anymore. The sequencer might also be slashed in some designs if pre-conf is violated.

## 6. For Tempo's sequencer

Tempo's sequencer (operated by Paradigm) almost certainly:

- Uses op-rbuilder or a similar Rust block builder
- Implements OP-Stack-like ordering rules (deposits first, force inclusions, signature)
- Issues pre-confirmations to merchants (sub-second UX)
- Supports priority-fee ordering with merchant-priority bumps
- Has emergency halt authority for fraud detection

The architectural pattern is the same as any OP Stack L2; the business logic on top (merchant priority, fraud detection) is specific.

## 7. Practice

1. Clone op-rbuilder (or browse online)
2. Find the deposit tx handling code
3. Trace what happens when a user submits via the sequencer's RPC
4. Identify: how does op-rbuilder handle a mempool tx that pays priority fee but reverts in execution?

## 8. Reading list

- [op-rbuilder repo](https://github.com/paradigmxyz/op-rbuilder)
- [Optimism sequencer spec](https://specs.optimism.io/protocol/derivation.html) — how the L2 chain is derived
- [Paradigm rbuilder talk](https://www.youtube.com/watch?v=N6c0LE4Sgis) — design philosophy

> Final check: in one sentence, what's the core consensus-enforced constraint on a sequencer that prevents it from arbitrarily reordering or excluding user txs forever? **If your answer doesn't reference "L1 force-inclusion + deadline," re-read §2.**`,
                },
                {
                  title: 'Fraud proofs vs validity (ZK) proofs',
                  slug: 'sequencer-fraud-zk-proofs-en',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 16,
                  xpReward: 45,
                  content: `# Fraud proofs vs validity (ZK) proofs

You withdraw from Optimism. You wait **seven days**. You withdraw from zkSync. You wait **about an hour**. Both are EVM rollups posting to Ethereum. The 170× difference isn't because Optimism's team is slower — it's because Optimism chose **fraud proofs** and zkSync chose **validity proofs**, and that single choice forces every downstream UX decision.

A rollup's L1 contracts trust the sequencer's state root claims for **a fixed period** (the challenge window). After the window closes, the state root is final. The two paradigms for what happens during the window are **fraud proofs** (challenge-based — "trust unless proven wrong") and **validity / ZK proofs** (cryptographic — "always require a proof of correctness"). Optimistic or ZK: pick one. Everything else follows.

> 🛑 **Predict before scrolling.** Optimism's withdrawal takes 7 days. zkSync's withdrawal takes ~1 hour. **What's the structural reason for the 10x difference?** (Hint: not better tech, different proof paradigm.)

## 1. The state root commitment problem

A sequencer submits a state root to L1 every ~1 hour. The L1 contract must decide: **is this state root correct?**

Options:
1. **Trust it always** — pure trust, no proofs (validium / sidechain)
2. **Trust it, but let challengers prove it wrong** — fraud proofs (optimistic)
3. **Require a proof of correctness** — validity proofs (ZK)

Each makes different trade-offs.

## 2. Fraud proofs — the optimistic model

Sequence:
1. Sequencer posts state root S on L1
2. Challenge window opens (7 days for OP Stack)
3. During window, **anyone** can submit a **fraud proof** showing S is incorrect
4. If valid fraud proof submitted, S is rejected, the chain reorgs
5. After 7 days, S is final

The fraud proof itself is a **proof of incorrect execution**: "the sequencer claimed tx T results in state S, but actually it results in state S'." The L1 contract re-runs the disputed step in a verifier game.

\`\`\`mermaid
sequenceDiagram
    participant Seq as Sequencer
    participant L1 as L1 Output Oracle
    participant Challenger
    participant Verifier as Fraud Proof Verifier

    Seq->>L1: Submit state root S (claim)
    Note over L1: 7-day challenge window opens
    Challenger->>Challenger: Detect S is wrong
    Challenger->>Verifier: Submit fraud proof
    Verifier->>Verifier: Re-execute disputed step
    Verifier->>L1: S is invalid
    L1->>L1: Reject state root, reorg chain
\`\`\`

The trade-off: **anyone can challenge, but you have to wait 7 days** before finality.

## 3. Validity (ZK) proofs — the cryptographic model

Sequence:
1. Sequencer produces L2 blocks
2. Sequencer (or a separate prover) generates a **ZK proof** that the L2 execution is correct
3. Proof is submitted to L1 along with the new state root
4. L1 contract **verifies the proof** (cheap — ~100k gas)
5. If proof verifies, state root is **immediately final**

No challenge period. No waiting.

\`\`\`mermaid
sequenceDiagram
    participant Seq as Sequencer
    participant Prover
    participant L1 as L1 Verifier
    participant User

    Seq->>Seq: Build L2 blocks
    Seq->>Prover: Send execution trace
    Prover->>Prover: Generate ZK proof (~minutes/hours)
    Prover->>L1: Submit proof + new state root
    L1->>L1: Verify proof (~ms on-chain)
    L1->>L1: State root finalized immediately
    User->>L1: Can withdraw without waiting
\`\`\`

The trade-off: **proving is expensive** (compute, time, gas), but **withdrawals are instant**.

## 4. The cost comparison

| Property | Optimistic | ZK |
| :--- | :--- | :--- |
| **L1 cost per batch** | ~$1-5 (data + state root) | ~$50-500 (proof verification) |
| **Withdrawal delay** | 7 days | ~Hours (proving time) |
| **L2 cost** | Same as Ethereum | Same as Ethereum |
| **Proof generation** | Free (only on challenge) | Always, ~$1-100 per batch |
| **State of art** | OP Stack, Arbitrum | Polygon zkEVM, zkSync, Scroll |

For high-frequency batches (sub-hour), **ZK is more expensive per batch**. For low-frequency, **optimistic is cheaper but slower to finalize**.

> 🛑 **Anti-fluency.** "ZK rollups are better than optimistic rollups." **Wrong framing.** Different trade-offs. Restate: when does optimistic win, when does ZK win?

Optimistic wins for:
- Lower L1 cost
- Mature tooling
- General EVM compatibility

ZK wins for:
- Instant finality (no 7-day wait)
- Better for cross-chain interop (other chains can trust proofs)
- Better for compliance (auditable proofs)

## 5. Reading fraud proof code — OP Stack Cannon

OP Stack's fraud proof system is called **Cannon**. The non-obvious move: instead of re-running the entire L2 on L1 (impossible — way too expensive), Cannon re-runs **a single disputed MIPS instruction** in a constrained MIPS VM running on L1.

The flow:
1. Challenger asserts "step X is wrong"
2. Bisection game: both parties narrow down to a single MIPS instruction
3. L1 contract executes that single instruction
4. Wins whoever proves the instruction's correct/incorrect result

[\`ethereum-optimism/optimism/cannon\`](https://github.com/ethereum-optimism/optimism/tree/develop/cannon) is the codebase.

The bisection-to-one-instruction pattern is what makes fraud proofs *feasible at all* — without it, you'd be asking L1 to re-execute potentially years of L2 history.

## 6. Reading ZK proof code — SP1 + Reth

[\`succinctlabs/sp1\`](https://github.com/succinctlabs/sp1) is a zkVM that can prove EVM execution via revm. The flow:

1. Reth executes the L2 block (normal execution)
2. SP1's "guest program" wraps revm execution
3. SP1 generates a proof that revm produced the claimed state changes
4. Proof submitted on-chain

For Reth-based ZK rollups: the **same revm code runs in execution and in proving**. This is why Rust EVM stack matters for ZK rollups.

## 7. The future — RISC Zero, SP1, and ZK rollups on Reth

The 2025-2026 trend: ZK proving costs are dropping fast. SP1, RISC Zero, Polyhedra are all hitting ~$1-10 per proof for an Ethereum block. At this cost, **ZK rollups become competitive for general payments**.

Tempo (if it goes ZK) would likely use one of these proving systems. Hyperliquid is more likely to stay optimistic for now (their MEV-extraction model doesn't benefit from ZK).

## 8. For Tempo's decentralization path

If Tempo Moderato is centralized today, the decentralization path likely:

1. **Today**: centralized sequencer, no fraud/validity proofs (trust Paradigm)
2. **Phase 2**: optimistic fraud proofs added (anyone can challenge)
3. **Phase 3**: ZK proofs (instant finality)
4. **Phase 4**: decentralized sequencer set + ZK proofs

Each step adds trust-minimization at the cost of complexity and operational overhead.

## 9. Practice

1. Read Optimism's [fraud proof spec](https://specs.optimism.io/fault-proof/index.html)
2. Read SP1's [EVM proving guide](https://docs.succinct.xyz/)
3. Calculate: at $5 per ZK proof for 1 batch and $1 fraud proof verification, when does ZK become cheaper than optimistic for a high-throughput chain?
4. Identify: when would a chain *not* want ZK proofs even if cheap?

## 10. Reading list

- [Vitalik's fraud proof intro](https://vitalik.ca/general/2021/01/05/rollup.html)
- [Cannon (OP Stack fraud proofs)](https://github.com/ethereum-optimism/optimism/tree/develop/cannon)
- [SP1 (ZK proving)](https://github.com/succinctlabs/sp1)

> Final check: in one sentence, why does the choice between fraud proofs and validity proofs determine **everything else** about a rollup's UX? **If your answer doesn't reference "withdrawal delay" or "trust window," re-read §2-§4.**`,
                },
              ],
            },
          },
          {
            title: 'Building & Decentralization',
            sortOrder: 2,
            lessons: {
              create: [
                {
                  title: 'Building a minimal sequencer on Reth',
                  slug: 'sequencer-build-minimal-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 20,
                  xpReward: 55,
                  content: `# Building a minimal sequencer on Reth

A working L2 sequencer is **~270 lines of Rust**. That's the entire orchestration layer: block production loop, mempool, L1 inbox watcher, batcher. The reason it's so small is that **Reth does everything that's actually hard** — revm execution, MDBX storage, state management, P2P. The sequencer's job is to drive Reth via Engine API and post the results to L1.

That ~270-line number is the actual launch architecture of most production L2s. This lesson is the walk-through.

> 🛑 **Predict before scrolling.** You have a sequencer building L2 blocks every 2 seconds. **What's the most likely first failure mode in production?** (Hint: not consensus, not crypto.)

## 1. The architecture

\`\`\`mermaid
flowchart TB
    Users["L2 Users (HTTP RPC)"] -->|tx| Mempool["Mempool"]
    L1Sub["L1 Inbox Subscription"] -->|deposit events| Mempool
    Mempool -->|pending txs| Loop["Sequencer Loop<br/>(produce block every 2s)"]
    Loop -->|forkchoiceUpdated + getPayload| Reth["Reth EL"]
    Loop -->|sign block| Signer
    Loop -->|new payload| Reth
    Loop -->|broadcast| P2P["P2P Network"]
    Loop -->|every 60s| Batcher["Batcher"]
    Batcher -->|blob tx| L1["L1 (Ethereum)"]
\`\`\`

Three components in one process:
1. **Sequencer loop** — drives block production via Engine API
2. **Mempool** — accepts user txs, prioritizes by fee
3. **Batcher** — periodically posts to L1

For minimal MVP, run them all in one binary. Production scales them separately.

## 2. The sequencer loop

The core production loop:

\`\`\`rust
use alloy_provider::{Provider, ProviderBuilder};
use alloy_signer_local::PrivateKeySigner;
use reth_rpc_engine_api::EngineApiClient;
use std::time::Duration;
use tokio::time::interval;

pub struct MinimalSequencer {
    signer: PrivateKeySigner,
    engine: EngineApiClient,
    mempool: Arc<Mempool>,
    chain_id: u64,
    block_period: Duration,
}

impl MinimalSequencer {
    pub async fn run(self) -> eyre::Result<()> {
        let mut ticker = interval(self.block_period);
        loop {
            ticker.tick().await;
            if let Err(e) = self.produce_block().await {
                tracing::error!(?e, "block production failed");
            }
        }
    }

    async fn produce_block(&self) -> eyre::Result<()> {
        // 1. Get current head from Reth
        let parent_hash = self.current_head().await?;

        // 2. Compute payload attributes
        let attrs = PayloadAttributes {
            timestamp: now_seconds(),
            prev_randao: B256::random(),
            suggested_fee_recipient: self.signer.address(),
            withdrawals: vec![],
            parent_beacon_block_root: None,
        };

        // 3. Tell Reth to start building
        let forkchoice = ForkchoiceState {
            head_block_hash: parent_hash,
            safe_block_hash: parent_hash,
            finalized_block_hash: parent_hash,
        };
        let resp = self.engine
            .fork_choice_updated_v4(forkchoice, Some(attrs))
            .await?;
        let payload_id = resp.payload_id.ok_or_else(|| eyre!("no payload id"))?;

        // 4. Wait briefly for Reth to build
        tokio::time::sleep(Duration::from_millis(500)).await;

        // 5. Fetch the built payload
        let payload = self.engine
            .get_payload_v4(payload_id)
            .await?;

        // 6. Sign the payload hash
        let signature = self.signer
            .sign_hash(&payload.execution_payload.block_hash())
            .await?;

        // 7. Submit signed payload back to Reth
        self.engine
            .new_payload_v4(payload.execution_payload.clone())
            .await?;

        // 8. Update forkchoice (mark new head as final)
        let new_head = payload.execution_payload.block_hash();
        self.engine
            .fork_choice_updated_v4(
                ForkchoiceState {
                    head_block_hash: new_head,
                    safe_block_hash: new_head,
                    finalized_block_hash: new_head,
                },
                None,
            )
            .await?;

        // 9. Broadcast to peers (P2P, omitted)

        tracing::info!(
            block = new_head.to_string(),
            "produced block"
        );
        Ok(())
    }

    async fn current_head(&self) -> eyre::Result<B256> {
        // Track locally or query EL
        todo!()
    }
}
\`\`\`

That's ~80 lines. **It produces blocks every 2 seconds, signed with the sequencer's authority.**

## 3. The mempool

Even simpler:

\`\`\`rust
use alloy_consensus::TxEnvelope;
use std::sync::{Arc, RwLock};

pub struct Mempool {
    pending: Arc<RwLock<Vec<TxEnvelope>>>,
}

impl Mempool {
    pub fn submit(&self, tx: TxEnvelope) -> eyre::Result<TxHash> {
        // Validate signature, nonce, gas, etc.
        validate_tx(&tx)?;

        let hash = tx.hash();
        self.pending.write().unwrap().push(tx);

        Ok(hash)
    }

    pub fn drain_pending(&self, limit: usize) -> Vec<TxEnvelope> {
        let mut pending = self.pending.write().unwrap();
        let len = pending.len().min(limit);
        pending.drain(..len).collect()
    }
}
\`\`\`

In practice, your mempool needs:
- Priority queue (sort by gas tip)
- Eviction (timeout, full mempool)
- Reorg handling (return txs to pool on reorg)
- Sanity validation

But the data structure is straightforward.

## 4. The L1 inbox watcher

For L1→L2 deposits, watch the L1 inbox contract:

\`\`\`rust
pub struct L1InboxWatcher {
    l1_provider: Box<dyn Provider>,
    inbox_address: Address,
    mempool: Arc<Mempool>,
}

impl L1InboxWatcher {
    pub async fn run(self) -> eyre::Result<()> {
        let mut stream = self.l1_provider
            .subscribe_logs(&Filter::new()
                .address(self.inbox_address)
                .event("DepositInitiated(...)"))
            .await?;

        while let Some(log) = stream.next().await {
            let deposit_tx = self.encode_l2_deposit_tx(&log)?;
            self.mempool.submit_deposit(deposit_tx)?;
        }
        Ok(())
    }
}
\`\`\`

Whenever a deposit event is emitted on L1, encode an equivalent L2 transaction and force-include it via the mempool. The mempool gives deposits priority order in block building.

## 5. The batcher

Periodically post L2 blocks to L1:

\`\`\`rust
pub struct Batcher {
    l1_provider: Box<dyn Provider>,
    l2_provider: Box<dyn Provider>,
    batcher_signer: PrivateKeySigner,
    last_batch_block: AtomicU64,
}

impl Batcher {
    pub async fn run(self) -> eyre::Result<()> {
        let mut ticker = interval(Duration::from_secs(60));
        loop {
            ticker.tick().await;
            if let Err(e) = self.post_batch().await {
                tracing::error!(?e, "batch posting failed");
            }
        }
    }

    async fn post_batch(&self) -> eyre::Result<()> {
        let from = self.last_batch_block.load(Ordering::SeqCst);
        let to = self.l2_provider.get_block_number().await?;

        // 1. Fetch all L2 blocks from "from" to "to"
        let blocks = self.fetch_blocks(from, to).await?;

        // 2. Compress
        let data = zlib_compress(rlp_encode(&blocks))?;

        // 3. Split into blob-sized chunks
        let chunks = chunk(data, MAX_BLOB_SIZE);

        // 4. Submit each as a blob tx
        for chunk in chunks {
            let blob_tx = build_blob_tx(chunk, self.batcher_signer.address());
            self.l1_provider.send_raw_transaction(blob_tx).await?;
        }

        // 5. Update last batch
        self.last_batch_block.store(to, Ordering::SeqCst);
        Ok(())
    }
}
\`\`\`

~50 lines. Every 60 seconds, all L2 blocks since last batch get compressed and submitted to L1 as blobs.

## 6. The total system

\`\`\`
~/my-sequencer/
├── src/
│   ├── main.rs           ← 20 lines (wire it all)
│   ├── sequencer.rs      ← 80 lines
│   ├── mempool.rs        ← 50 lines
│   ├── l1_watcher.rs     ← 40 lines
│   ├── batcher.rs        ← 50 lines
│   └── rpc.rs            ← 30 lines (HTTP server for user submission)
├── Cargo.toml
└── README.md
\`\`\`

**~270 lines of Rust** for a working sequencer that produces blocks, accepts txs, watches L1 deposits, and batches to L1. This is the actual MVP architecture used by most chains at launch.

## 7. Production gotchas

What this minimal version glosses over:

| Gotcha | Reality |
| :--- | :--- |
| **Liveness alarm** | Need monitoring + automatic failover (heartbeat to ops team) |
| **L1 reorg handling** | If L1 reorgs, you must re-batch any txs that got orphaned |
| **L2 reorg handling** | Should be rare (single sequencer = deterministic) but possible |
| **Pre-confirmations** | Sequencer commits before L1 finality; if it lies, contract handles it |
| **Mempool DOS** | Attackers spam mempool; need rate limits + fee escalation |
| **Database growth** | Track every block ever; eventually need pruning |

Each is its own engineering problem. Start with the 270-line MVP; add as needed.

## 8. For Tempo Moderato

Tempo's sequencer (operated by Paradigm) likely:
- 300-500 lines of Rust over Reth
- Same architecture as above
- Plus: merchant authorization, regulatory monitoring, payment-priority ordering

The novel parts are in the application logic, not the consensus mechanics.

## 9. Practice

1. Write the \`fetch_blocks\` function — query Reth for L2 blocks in a range
2. Sketch the blob tx construction (EIP-4844 type 3)
3. Identify: when would the batcher fail to post? What's the retry strategy?
4. Calculate: at 2-second block time and 1MB compressed per batch, daily L1 cost?

## 10. Reading list

- [op-rbuilder](https://github.com/paradigmxyz/op-rbuilder)
- [op-batcher](https://github.com/ethereum-optimism/optimism/tree/develop/op-batcher)
- [Astria sequencer](https://github.com/astriaorg/astria) — shared sequencer reference

> Final check: in one sentence, why does ~300 lines of Rust suffice for a working L2 sequencer? **If your answer doesn't reference "Reth handles the hard parts," you haven't internalized the architectural separation.**`,
                },
                {
                  title: 'Decentralization paths — shared sequencers and MEV-aware auctions',
                  slug: 'sequencer-decentralization-en',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 16,
                  xpReward: 45,
                  content: `# Decentralization paths — shared sequencers and MEV-aware auctions

Optimism announced "we will decentralize the sequencer" in 2023. Three years later, the sequencer is still one box at OP Labs. Arbitrum says the same. So does Base. The decentralization roadmap is real — and it's the **second half of the L2's life**. Two architectural patterns are competing to be the destination: **decentralized sequencer set** (chain runs its own validators) and **shared sequencer** (multiple rollups outsource ordering to a common set).

This lesson is the map. Why is decentralization stuck? What does each path actually look like? Which one are Espresso, Astria, Polygon zkEVM, and Linea betting on, and why?

> 🛑 **Predict before scrolling.** Optimism has been "decentralizing the sequencer" for 3 years. **What's blocked them?** Why is this so hard?

## 1. The decentralization stages

| Stage | What | Examples (2026) |
| :--- | :--- | :--- |
| **1: Single sequencer** | One operator | Most L2s today (Optimism, Base, Arbitrum) |
| **2: Multi-sig sequencer** | M-of-N trusted operators | Some L3s |
| **3: PoS sequencer set** | Bonded validators rotate | Polygon zkEVM, Linea (recent) |
| **4: Shared sequencer** | One sequencer set serves multiple rollups | Espresso, Astria, Radius |
| **5: MEV-aware decentralized** | Sequencer market with bidding | Future state — none fully deployed |

The path is **not strictly linear** — some chains skip stages. Some adopt shared sequencers directly from centralized. Some stay centralized indefinitely.

## 2. Why decentralization is hard

Five real problems:

### 2.1 Latency

Centralized: 100ms block production possible.
Decentralized: minimum 2-3 round trips for consensus → 200-500ms even at best.

Users feel this. Centralized sequencer offers pre-confirmations in <100ms. Decentralized struggles to do this.

### 2.2 MEV coordination

Centralized: one MEV strategy.
Decentralized: who gets MEV? Random rotation? Bidding? Each design has trade-offs.

### 2.3 Liveness

Centralized: 1 operator = single failure point but easy to monitor.
Decentralized: N operators = no single failure but coordination overhead. **Liveness during network issues is genuinely harder.**

### 2.4 Cost

Centralized: ~1 server.
Decentralized: ~N servers + consensus protocol + slashing infrastructure.

### 2.5 Economic security

Centralized: trust the operator.
Decentralized: need staking, slashing, dispute resolution.

Each barrier has been solved separately, but **integrating all 5** is the systems challenge.

## 3. PoS sequencer set — the natural extension

The first decentralization step: replicate Ethereum-style PoS on L2.

\`\`\`mermaid
flowchart TB
    Stake["Validators stake L2 token"] --> Set["Active validator set (M-of-N)"]
    Set -->|each block| Leader["Designated leader (rotation)"]
    Leader -->|build block| Reth["Reth EL"]
    Reth -->|signed block| Others["Other validators"]
    Others -->|2f+1 votes| Final["Block finalized"]
    Final -->|periodic batch| L1["L1"]
\`\`\`

This is what **Polygon zkEVM** is moving toward (Hermez-style validator set), what **Linea** is approaching (Consensys-coordinated), what most "Stage 3" rollups end up doing.

The trade-off: you go from 1 operator to ~10-30 operators. Increment in trust minimization; massive increment in operational complexity.

## 4. Shared sequencers — the architectural bet

What if N rollups didn't each need their own decentralized sequencer set — what if they all *shared* one? That's the **shared sequencer** bet: a single sequencer set serves multiple rollups. Each L2 keeps its own Reth execution layer, but the ordering happens in a shared validator set.

\`\`\`mermaid
flowchart TB
    Rollup1["L2 A<br/>(Reth-based)"] -.->|outsource ordering| Shared["Shared Sequencer<br/>(Espresso / Astria)"]
    Rollup2["L2 B<br/>(another OP Stack)"] -.->|outsource ordering| Shared
    Rollup3["L2 C<br/>(yet another)"] -.->|outsource ordering| Shared
    Shared -->|signed block| Reth1["Reth EL A"]
    Shared -->|signed block| Reth2["Reth EL B"]
    Shared -->|signed block| Reth3["Reth EL C"]
\`\`\`

Why this matters:
1. **Cross-rollup atomicity**: a tx on L2 A can atomically depend on a tx on L2 B (because the same sequencer orders both)
2. **Lower decentralization cost**: 1 validator set serves N rollups instead of N validator sets
3. **MEV unification**: cross-rollup MEV can be captured (helping rollups, hurting traders)
4. **Faster Decentralization**: rollups can outsource the hard problem

Production attempts:

| Project | Type | Status (2026) |
| :--- | :--- | :--- |
| **Espresso** | HotStuff-derived shared sequencer | Mainnet beta, several L2 adopters |
| **Astria** | CometBFT-based shared sequencer | Live with Reth integration |
| **Radius** | PoS shared sequencer | Testnet |
| **Anoma** | Intent-centric (not strictly sequencer) | Early |

> 🛑 **Anti-fluency.** "Shared sequencers are clearly better than single sequencers." **Wrong framing.** Trade-off. State what shared sequencers sacrifice vs single.

Shared sequencers sacrifice:
- **Sovereignty**: your chain depends on an external party for ordering
- **Speed of upgrades**: shared sequencer must support your chain's needs
- **Custom MEV strategy**: harder to extract chain-specific MEV
- **Operational independence**: if shared sequencer goes down, your chain stops

Single sequencer keeps these. The trade is: you control more, but you trust yourself more.

## 5. The MEV-aware decentralized future

The endgame: **decentralized sequencer with MEV auctions**.

How it could work:
1. Multiple sequencers compete to build the next block
2. Builders construct proposed blocks with extracted MEV
3. Sequencer set votes/auctions on best block
4. Winner pays sequencer set for blockspace; sequencer set distributes MEV

This is **MEV-Boost for L2s**. Not deployed in production yet (2026), but designs from Flashbots, Espresso, and others target this.

For Tempo: if it decentralizes, the MEV question is interesting because **merchant payments have low MEV opportunity** (mostly genuine txs, not arbitrage). Tempo could decentralize without much MEV-extraction complexity.

For Hyperliquid: the orderbook is essentially MEV — they likely keep centralized sequencer indefinitely.

## 6. Reading Astria — production shared sequencer

[\`astriaorg/astria\`](https://github.com/astriaorg/astria) is the production shared sequencer with Reth integration. Key components:

- **Sequencer network**: CometBFT-based validator set
- **Composer**: aggregates rollup txs for inclusion
- **Rollup nodes**: Reth-based, consume sequencer outputs

The flow:
1. User submits tx to L2 A's RPC
2. RPC forwards to Astria sequencer
3. Astria sequences (with txs from L2 B, C, etc.)
4. Astria emits ordering; each Reth rollup picks its own txs

This is the **most-tested shared sequencer architecture** in production. Worth reading for the patterns.

> 🔍 **Find in repo.** Open Astria's [docs.astria.org](https://docs.astria.org/) and trace what an L2 needs to do to "subscribe" to Astria sequencing.

## 7. The pre-confirmation race

A new direction (2025-2026): **pre-confirmations from sequencers**, allowing instant UX even before full sequencing.

Multi-sequencer pre-conf models:
- **TACo (Threshold)**: requires majority of sequencers to commit
- **Lighthouse-style**: one sequencer commits, others verify before finality
- **Speculative**: sequencer commits, fraud-proof if violated

This is the active R&D area in 2026 — solving the "decentralized but fast" problem.

## 8. For Hiro's projects

### Tempo Moderato → Tempo mainnet

Path:
- Today: centralized
- 1 year: PoS sequencer set (~20-30 validators)
- 2-3 years: maybe shared sequencer (if economics work)
- Always: ZK proofs eventually for fast withdrawals

### mppsol / soltempo

Interacting with Tempo's sequencer is your interface point. As Tempo decentralizes:
- Pre-confirmations become harder (multi-party)
- Liveness alarms become more nuanced
- Your code needs to handle "sequencer changed" events

### Hyperliquid

Likely stays centralized for the foreseeable future. Their MEV model doesn't suit decentralization. Their bridge will probably decentralize before their sequencer.

## 9. Practice

1. Read Astria's sequencer documentation
2. Compare to Espresso's design — what's different?
3. Identify: what makes shared sequencers harder for chains with custom MEV models?
4. Sketch: how would Tempo eventually decentralize?

## 10. Reading list

- [Paradigm on shared sequencing](https://www.paradigm.xyz/2023/11/shared-sequencer) — design philosophy
- [Espresso docs](https://docs.espressosys.com/)
- [Astria](https://github.com/astriaorg/astria)

> Final check: in one sentence, what's the **fundamental architectural choice** between decentralized sequencer set (your chain owns it) and shared sequencer (outsource it)? **If your answer doesn't reference "sovereignty vs efficiency," re-read §4.**`,
                },
                {
                  title: 'Final quiz: sequencer & rollup architecture',
                  slug: 'sequencer-final-quiz-en',
                  type: 'QUIZ',
                  sortOrder: 2,
                  duration: 12,
                  xpReward: 50,
                  content: `# Final quiz: sequencer & rollup architecture

The L2 architect's final check. You'll need this to ship a rollup, integrate with Tempo's sequencer, or design a new L2.`,
                  quizQuestions: [
                    {
                      question: "Why is **centralized sequencer** acceptable for a rollup but **not** for a permissionless L1?",
                      options: [
                        'Rollup users have lower expectations.',
                        "Rollups use L1's contracts as fallback for safety: if the sequencer censors, users can submit via L1 force-include contract; if the sequencer lies about state, L1 contracts reject the withdrawal. The sequencer is trusted for UX (speed, ordering), not for funds. A permissionless L1 has no such fallback — its consensus is its security.",
                        'Centralized rollups are not actually permissioned.',
                        'L2 transactions are reversible.',
                      ],
                      correctIndex: 1,
                      explanation: "Rollup security model = trust the sequencer for UX, trust L1's consensus for safety. The fundamental architectural insight is that the user has an escape hatch via L1, so the sequencer can be centralized without making the chain centralized. This is exactly why production L2s ship with single sequencers — UX is great, escape hatch protects funds.",
                    },
                    {
                      question: 'A rollup posts data as **EIP-4844 blobs** instead of calldata. **Why is this 10x cheaper, and what\'s the catch?**',
                      options: [
                        'Blobs are stored on Bitcoin instead of Ethereum.',
                        "Blob gas is priced separately from calldata gas, much lower (~0.1-1 gas/byte vs 16 gas/byte). The catch: blobs are pruned after ~18 days, so anyone needing the data long-term must archive separately. The 18-day window aligns with the fraud proof window — long enough for safety, short enough for cost.",
                        'Blobs are validated by Layer 2 nodes only.',
                        'Blobs cost the same; EIP-4844 just renamed calldata.',
                      ],
                      correctIndex: 1,
                      explanation: "EIP-4844 introduced blob-carrying transactions with a separate fee market specifically for rollup DA. Lower cost because blobs are pruneable — Ethereum nodes drop them after the proof window. Long-term archives must use external services (IPFS, dedicated archives). The price/availability trade-off works because security only needs DA during the fraud proof window.",
                    },
                    {
                      question: 'In OP Stack, **deposit transactions** from L1 must be included at the **top** of L2 blocks. **Why is this protocol-enforced rather than sequencer policy?**',
                      options: [
                        'Top-of-block has the most MEV.',
                        'Deposits are user funds moving from L1 to L2. If the sequencer could deprioritize them, deposits could be delayed indefinitely — breaking the rollup security model that says "your funds are safe even if the sequencer censors." Forcing top-of-block ensures deposits are processed at well-defined times.',
                        'Lower transaction fees apply at top of block.',
                        'Top-of-block reduces gas costs.',
                      ],
                      correctIndex: 1,
                      explanation: 'Deposits represent funds the user has committed to move via L1; they must be processed. The protocol gives them the strongest inclusion guarantee. If the sequencer could deprioritize them, the entire fund-safety guarantee collapses. This is why "deposits at top" is consensus-enforced via L1 contracts, not a sequencer policy.',
                    },
                    {
                      question: 'The choice between **fraud proofs** and **validity (ZK) proofs** determines withdrawal delay. **What\'s the structural difference?**',
                      options: [
                        "Fraud proofs are faster.",
                        'Fraud proofs trust the sequencer\'s state root by default, but anyone can challenge during a window (7 days for OP Stack); if no challenger emerges, the state is final. Validity proofs require the sequencer to provide cryptographic proof of correct execution; the proof is verified on L1 immediately. Validity → no challenge window → instant finality but expensive proofs.',
                        "ZK proofs are simpler than fraud proofs.",
                        'Both produce identical withdrawal delays.',
                      ],
                      correctIndex: 1,
                      explanation: 'Fraud proofs: "trust unless someone proves wrong" + 7-day window. Validity proofs: "always require cryptographic correctness" + instant. The trade-off: fraud proofs are cheap when valid (no proof needed) but slow to finalize; validity proofs are expensive every batch but instant finality. Different rollups optimize differently.',
                    },
                    {
                      question: 'A minimal sequencer on Reth requires **~270 lines of Rust**. **Why so few?**',
                      options: [
                        'Rust is unusually terse.',
                        "Reth handles all the hard execution work (revm, MDBX, state management, P2P). The sequencer only needs to: (1) drive Engine API for block production, (2) maintain a mempool, (3) watch L1 inbox for deposits, (4) batch L2 blocks for L1 posting. Each is ~50-80 lines of orchestration code.",
                        "Rollups are simpler than L1s.",
                        'Most rollup logic is in JavaScript.',
                      ],
                      correctIndex: 1,
                      explanation: 'The architecture separation pays off: Reth = execution, sequencer = orchestration. Sequencer is a thin coordination layer driving Reth via Engine API. The hard parts (EVM, storage, state) are in Reth. This is why so many production sequencers can be ~300-500 lines of Rust over Reth.',
                    },
                    {
                      question: "Why have **Optimism, Arbitrum, and Base** all stayed with centralized sequencers for years despite their decentralization roadmaps?",
                      options: [
                        'Decentralization is not their priority.',
                        'Five real challenges: (1) latency degrades 2-5x with consensus, (2) MEV coordination is complex, (3) liveness becomes harder with N operators, (4) operational cost rises, (5) economic security infrastructure (staking, slashing) is non-trivial. The first one — user experience — alone keeps centralized as the practical default. UX > decentralization for most users.',
                        'Their codebases are too messy to decentralize.',
                        'Decentralization requires legal restructuring.',
                      ],
                      correctIndex: 1,
                      explanation: 'Decentralization is hard not because of code but because of the systems engineering: latency, liveness, MEV coordination, ops cost, security infrastructure. Each is solvable in isolation; combining all 5 in production is the real challenge. Most L2s prioritize UX (centralized) because users prefer fast & cheap over decentralized.',
                    },
                    {
                      question: "What's the **architectural bet** of **shared sequencers** like Espresso and Astria?",
                      options: [
                        'They are cheaper than running individual sequencers.',
                        "One sequencer set serves N rollups, which enables: (1) cross-rollup atomic transactions (same sequencer orders both), (2) lower per-rollup decentralization cost, (3) cross-rollup MEV capture. The trade-off: rollups give up sovereignty over ordering — they outsource the hard problem.",
                        'They allow rollups to skip data availability.',
                        'They eliminate the need for state root commitments.',
                      ],
                      correctIndex: 1,
                      explanation: "Shared sequencers bet that **multi-rollup composability matters enough** that rollups will accept giving up sovereign sequencer control. Espresso, Astria, Radius are production attempts. The bet is contested — many L2s prefer to own their sequencer for operational independence and MEV strategy. The next 2-3 years will reveal which side wins.",
                    },
                    {
                      question: "For Tempo Moderato (Tempo's testnet), **what does the centralized → decentralized trajectory look like**?",
                      options: [
                        'Direct jump to fully decentralized validator set on Day 1.',
                        "Likely: (1) today: centralized sequencer (Paradigm operates), (2) 1 year: PoS validator set (~20-30 operators), (3) 2-3 years: possibly shared sequencer (if economics work), (4) always: ZK proofs eventually for fast withdrawal. Each step is an incremental trust-minimization with operational cost.",
                        'Stay centralized indefinitely.',
                        "Tempo doesn't have a sequencer — it's purely on-chain.",
                      ],
                      correctIndex: 1,
                      explanation: 'Standard L2 trajectory. Paradigm controls the launch; bonded validators decentralize sequencing; ZK proofs eventually compress withdrawal delays. Each step takes 1-2 years to ship. Most L2s follow this exact path; Tempo will too. Soltempo and mppsol must build assuming this trajectory.',
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
