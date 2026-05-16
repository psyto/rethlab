import { PrismaClient } from '@prisma/client';

export async function seedRethConsensusEngineeringEN(prisma: PrismaClient) {
  const tags = ['reth', 'consensus', 'bft', 'pos', 'hotstuff', 'hyperbft', 'l1', 'expert'];

  await prisma.course.create({
    data: {
      slug: 'reth-consensus-engineering-en',
      title: 'Consensus Engineering — Building L1 Consensus on Reth',
      description:
        "The biggest gap between 'I can read reth' and 'I can ship an L1.' Consensus is the layer that **binds** the rest of the Rust EVM stack — database, VM, networking, concurrency — into a single chain. Consensus theory from scratch (BFT, safety/liveness, FLP), reading real Rust consensus engines (reth's Consensus trait, Malachite, bera-reth's Proof-of-Liquidity), and wiring custom consensus into a Reth-based chain. The course that prepares you to read HyperBFT and ship Tempo-class L1s.",
      difficulty: 'ADVANCED',
      duration: 220,
      xpReward: 650,
      track: 'reth-l1-architect',
      tags,
      isPublished: true,
      sortOrder: 300,
      locale: 'en',
      instructorName: 'RethLab',
      modules: {
        create: [
          {
            title: 'Consensus Fundamentals',
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: 'The BFT problem from scratch',
                  slug: 'consensus-bft-problem-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 16,
                  xpReward: 40,
                  content: `# The BFT problem from scratch

It's 3am. One validator in your 30-node chain just signed two conflicting blocks. Other validators are voting both ways. The chain's split-brained. **What do you reach for?** If you don't have a mental model for *why this is even possible* — for what failure modes consensus is supposed to survive — you'll spend the next eight hours guessing.

This lesson builds the model: failure modes, the safety/liveness split, and why FLP (the 1985 impossibility theorem) makes "perfect" consensus mathematically off the table.

> 🛑 **Predict before scrolling.** Three nodes A, B, C must agree on a single value. **What can go wrong?** List 4 distinct failure modes. (Hint: not just "the network is slow.")

## 1. The problem statement

Multiple nodes, one decision. They must all decide:

- **The same value** — if A decides "yes" and B decides "no," the system has split-brained
- **A value that was proposed** — they can't just agree on "42" if nobody asked about 42
- **Eventually** — at some point, not "later if we feel like it"

These three are **safety**, **validity**, **liveness**. They aren't free — you cannot get all three under arbitrary network conditions. The whole field of consensus research is figuring out which trade-offs are tolerable for which use case.

## 2. The failure modes you must plan for

| Failure | What it means | Example |
| :--- | :--- | :--- |
| **Crash** | A node stops responding. Period. | The validator's machine power-cycles. |
| **Omission** | A node selectively drops messages. | Packet loss; intentional censorship. |
| **Network partition** | A subset of nodes can't reach another subset. | Submarine cable cut; AWS region outage. |
| **Byzantine** | A node lies. Sends contradictory messages. Signs both A and ¬A. | Compromised validator key; bug. |

The classical literature calls all of these "faults." The **Byzantine** case (named after the Byzantine Generals problem — a node that behaves arbitrarily, including lying) is the hardest because the faulty node is **actively adversarial**. Crash + omission are comparatively easy.

> 🛑 **Predict.** You have 4 nodes. One is Byzantine. **What's the maximum number of total nodes f Byzantines you can tolerate while still reaching consensus?** (Answer below — but predict first. The answer is famous.)

The answer is **f < n/3**. With 4 nodes you tolerate 1 Byzantine. With 7 you tolerate 2. **You always need 3f+1 nodes to tolerate f Byzantines.** This is a hard math result, not a design choice. Proven by Lamport, Pease, and Shostak in 1982.

## 3. Safety vs liveness

The two properties consensus protocols promise:

- **Safety**: "We never disagree." If A decides x and B decides y, then x = y. This is *correctness*.
- **Liveness**: "We eventually decide." Some valid decision will get made in finite time. This is *progress*.

**You cannot have both unconditionally** in an asynchronous network with Byzantine faults. This is the heart of the FLP impossibility theorem (1985).

The choice every protocol makes:

| Protocol family | Sacrifice when partitioned |
| :--- | :--- |
| **Classical BFT** (Tendermint, HotStuff, HyperBFT) | **Liveness**: halts during partition, never forks |
| **Nakamoto** (Bitcoin, ETH 1.0 PoW) | **Safety**: keeps producing, can fork temporarily |
| **Ethereum PoS** (Casper FFG + LMD-GHOST) | **Hybrid**: liveness for tips, finality for older blocks |

There is no protocol that gets safety AND liveness AND fault tolerance AND no synchrony assumption. **One of those four must give.**

> 🛑 **Anti-fluency.** Bitcoin "never halts." Bitcoin "is BFT." Both statements are **technically wrong** in different ways. **Which property does Bitcoin actually sacrifice, and when?** If your answer is "nothing, Bitcoin is great" — go back and re-read §2.

## 4. FLP impossibility — the founding result

**Fischer, Lynch, Paterson (1985)**: In a fully asynchronous network with at least one crash failure, **no deterministic protocol can guarantee both safety and liveness for all executions.**

Note three things about this result:

1. **Asynchronous** — no upper bound on message delay. Real networks aren't fully asynchronous; we can sometimes assume eventually-bounded delays.
2. **One crash** — not Byzantine. Even with crash-only faults, FLP applies.
3. **Deterministic** — randomized protocols can sidestep FLP probabilistically.

How real protocols escape FLP:

- **Timeouts** (synchrony assumption): if a message doesn't arrive in T seconds, assume the sender crashed. Now you have synchronous fallback.
- **Randomness** (probabilistic finality): Bitcoin's proof-of-work uses randomness to elect leaders; finality is probabilistic, not absolute.
- **View changes** (give up liveness temporarily): BFT protocols pause progress during leader failure, then resume.

Every real protocol uses at least one of these escapes.

> 🛑 **Predict.** Tendermint uses timeouts and view changes. Bitcoin uses randomness. Ethereum PoS uses **both**. **Why both? What does each escape buy Ethereum that the other can't?**

## 5. The 3f+1 rule, intuited

Why exactly **3f+1**? Here's the intuition before the algebra.

You ask for votes. **f nodes might lie.** You need a quorum (a vote count that "counts as agreement") where:

- The quorum is large enough that **f Byzantines can't form a majority** in it
- Two quorums must **overlap** in at least one honest node (otherwise you could decide both x and ¬x)

If quorums are size q out of n, then:

- Two quorums overlap in **2q - n** nodes
- Overlap must contain at least one honest node: **2q - n > f**
- Honest nodes in overlap (q - f) must outvote Byzantines: **q - f > f**, so q > 2f, so q ≥ 2f+1
- Substituting: **2(2f+1) - n > f**, so **n > 3f**, so **n ≥ 3f+1**

This is the algebra behind every BFT system you'll ever use. **Cometbft, HotStuff, HyperBFT, Casper FFG** — all assume 3f+1 and break if you go below.

> 🛑 **Anti-fluency.** Ethereum has ~1 million validators. **What's f? What does "Byzantine" even mean at that scale?** If your answer doesn't involve "validators acting against the protocol because they were paid to / hacked / both," you don't have the threat model in mind.

## 6. What this means for your L1

You're building Tempo. You pick a consensus. You face four questions immediately:

| Question | Answer driver |
| :--- | :--- |
| **How many validators?** | Decentralization goal vs latency budget |
| **Sync or async?** | Sub-second finality requires synchronous timeout assumption |
| **What to sacrifice on partition?** | Payments → halt (BFT). Mainnet ETH → fork (Nakamoto-ish). |
| **Slashing or pure economic?** | Slashing requires fork detection; pure economic = staking + nothing else |

Tempo (likely) picks: ~30 validators, synchronous, BFT (halt on partition), slashing. Hyperliquid: ~20 validators, synchronous, HotStuff family, slashing.

**Your protocol choice flows from your business model.** Get the trade-offs straight before writing code.

## 7. Practice

1. Read [Lamport's original paper](https://lamport.azurewebsites.net/pubs/byz.pdf) (1982) — Section 1 and 2 only, the rest is dense
2. Sketch on paper why 3f+1 is tight (you can't do it with 3f)
3. List 3 places in Ethereum PoS where FLP escapes are used

> Final check: in one sentence, why is "Bitcoin doesn't need 3f+1" not a counterexample to the 3f+1 rule? **What does Bitcoin sacrifice that lets it use chain weight instead of voting?** If your answer doesn't include "probabilistic finality," re-read §3.`,
                },
                {
                  title: 'Three consensus families — PoW, PoS, classical BFT',
                  slug: 'consensus-three-families-en',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 16,
                  xpReward: 40,
                  content: `# Three consensus families — PoW, PoS, classical BFT

Bitcoin, Ethereum, and Hyperliquid all run consensus. None of them picked the same family. Each one made a different trade against the 4-way impossibility from last lesson (safety / liveness / fault tolerance / no synchrony) — and that single choice determined everything else about their chain: throughput, latency, validator count, slashing semantics, even who's allowed to be a validator.

This lesson is the map of those three families and what each one costs you.

> 🛑 **Predict before scrolling.** You're building a payment rail (Tempo). Sub-second finality matters more than 1M validators. **Which family do you pick — and why does Bitcoin's family lose immediately?**

## 1. The three families at a glance

| Family | Examples | Finality | Throughput | Validator set | Sacrifices |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Nakamoto / PoW** | Bitcoin, ETH 1.0 | Probabilistic (~6 blocks) | ~7 tps (BTC) | Permissionless miners | Energy, finality time |
| **Pure BFT** | Tendermint, HotStuff, HyperBFT | Instant (1-2 RTT) | High (>1000 tps) | Bounded (~20-150) | Validator set bound, liveness on partition |
| **Hybrid PoS** | Ethereum 2.0 | Eventual (~13 min) | Medium | Large (~1M) | Complexity, gadget overhead |

Each family wins on one axis and loses on others. **No free lunches.** Your job is to pick which losses are acceptable for your chain.

## 2. Nakamoto / PoW — the original

**Mechanism**: Miners compete to solve a hash puzzle (find a nonce such that the block's SHA-256 hash starts with N zero bits). Whoever solves first gets to propose the next block. Other miners "vote" by building on top of it. The longest chain wins.

What this buys:

- **Permissionless**: anyone with hardware can mine
- **No validator set**: no key management, no slashing infrastructure
- **Probabilistic finality**: after k blocks, the probability of reorg drops exponentially
- **Liveness under partition**: each partition keeps producing blocks; they reconcile on heal

What this costs:

- **Energy**: hash puzzles burn electricity
- **No instant finality**: ~10 min × 6 confirmations = 1 hour for high-value tx
- **No slashing**: bad miners just lose hashpower; no economic punishment
- **Low throughput**: 1 block per 10 min × small block size = 7 tps

> 🛑 **Anti-fluency.** "Bitcoin is consensus-by-majority." **Wrong.** Bitcoin is consensus-by-chain-weight (cumulative work). Why does that distinction matter? If you can't articulate the difference, you don't understand longest-chain rules.

**Verdict**: PoW is for chains where censorship resistance and permissionlessness beat finality time. **Almost no new L1 picks PoW in 2026.** Tempo wouldn't. Hyperliquid wouldn't. You won't.

## 3. Classical BFT — the L1 architect's default

**Mechanism**: A bounded committee of validators (typically 20–150, identities known up front). A leader proposes a block. The committee votes. If 2/3+ vote yes, the block is final — instantly, no waiting for confirmations.

The classical references:

- **PBFT** (Castro & Liskov, 1999) — the foundational paper. 3-round protocol (pre-prepare, prepare, commit). O(n²) messages per block.
- **Tendermint** (Buchman, 2014) — added view changes, made it practical. Used by Cosmos, CometBFT.
- **HotStuff** (Yin et al., 2018) — collapsed the round structure to O(n) messages via threshold signatures. Used by Diem (formerly Libra), HyperBFT.

The key innovation: **2/3+ majority** with **3f+1 validators** gives you both safety and instant finality, **as long as the network is synchronous enough for messages to arrive within timeout.**

What this buys:

- **Instant finality**: 1-2 round trips = seconds
- **Slashing**: validators sign messages; you can prove double-signing cryptographically and slash their stake
- **High throughput**: parallel validators, deterministic schedule
- **Predictable latency**: under good conditions, sub-second

What this costs:

- **Bounded validator set**: O(n²) or O(n) messages per block limits n to ~100-200 max in practice
- **Liveness halt on partition**: if you can't get 2/3+ votes, the chain just stops
- **Centralization risk**: bounded validator set is permissioned (in practice)

> 🛑 **Predict.** You have 100 BFT validators across 5 continents. **What's the latency floor on finality?** (Hint: speed of light, message rounds.) Why does this make BFT inherently regional?

Speed of light is ~140 ms round-the-world. With 2 rounds of voting, that's ~300 ms minimum. Real BFT chains cluster validators in low-latency regions to get under 1 sec.

**Verdict**: classical BFT is the default for new L1s when finality matters more than validator count. **Hyperliquid (HotStuff-derived). Tempo (likely Tendermint or HotStuff family). Most app-chains.**

## 4. Hybrid PoS — Ethereum's path

**Mechanism**: Two protocols layered.

- **Fork choice** (LMD-GHOST): each block, validators attest to the head. The chain with most attestations (weighted by stake) wins. This part is Nakamoto-ish — probabilistic, no finality.
- **Finality gadget** (Casper FFG): every 32 slots (epoch), 2/3+ of validators by stake vote to finalize a checkpoint. This part is BFT — instant finality on checkpoints.

Why the hybrid? Ethereum has **~1M validators**. Pure BFT doesn't scale to 1M (O(n) messages = 1M signatures per block). Hybrid gets:

- Large validator set (large committee = decentralization)
- Probabilistic head tracking (fast-but-not-final)
- Eventual finality every ~13 min (BFT-like guarantee on older blocks)

What this buys:

- **Maximum decentralization**: 1M validators is the largest validator set of any L1
- **Best of both**: fast tips + finality
- **Economic security at scale**: $50B+ staked, slashing applies

What this costs:

- **Complexity**: the spec is massive
- **Slow finality**: 13 minutes minimum (2 epochs)
- **Slot-level liveness != finality**: a block can be the head and still get reorged before finality

> 🛑 **Anti-fluency.** "Ethereum is BFT." **Half right, half wrong.** When? It's BFT for **finalized** blocks but Nakamoto-ish for **unfinalized** blocks. The distinction is consensus-critical. Why does Ethereum need both?

**Verdict**: hybrid PoS is what you pick if you need both 1M+ validators AND finality. **Almost nothing besides Ethereum needs this.** Most L1s pick pure BFT.

## 5. Decision framework — which family for your chain?

\`\`\`
                                    Picking consensus
                                          │
                ┌─────────────────────────┼────────────────────────────┐
                │                         │                            │
        Validator count?                Finality?              Permissioned?
                │                         │                            │
        ┌───┴───┐               ┌────┴──────┐                   ┌────┴────┐
        │       │               │           │                   │         │
        <200   >200      Need instant     OK with eventual    Yes        No
        │       │               │           │                   │         │
        BFT    Hybrid PoS      BFT     Either BFT or PoW    BFT-style    PoW or
                                                              committee   PoS
\`\`\`

For Tempo: <100 validators, instant finality, permissioned (banks/Paradigm-approved). → **Pure BFT** (likely Tendermint-style).

For Hyperliquid: ~20 validators, instant finality, permissioned. → **HotStuff family** (this is exactly what they do — HyperBFT).

For Ethereum: 1M validators, eventual finality OK. → **Hybrid PoS** (this is exactly what they do).

> 🛑 **Predict.** A new L1 says "we use AlephBFT for high TPS, plus a finality gadget on top." **Which family is this? What's the gadget for?** If the words "AlephBFT" don't ring bells, look them up — it's a randomized BFT used by Aleph Zero and others.

## 6. What rethlab gives you

Reth's \`consensus\` component slot lets you ship **any of these families** as a node:

| Family | Reth integration |
| :--- | :--- |
| PoW | \`EthBeaconConsensus\` with proof-of-work configs (legacy) |
| PoS (hybrid) | \`EthBeaconConsensus\` — standard Ethereum |
| BFT | Custom \`Consensus\` impl + custom block producer |

We'll read the actual \`Consensus\` trait in Lesson 5 and walk through how Berachain swaps it (Lesson 7).

## 7. Practice

For each chain, identify the family and one specific trade-off:

1. Solana
2. Cosmos Hub
3. Avalanche (subnets)
4. Berachain
5. Hyperliquid

(Answers vary; the point is the muscle of identifying trade-offs from publicly known design.)

> Final check: in one sentence, why does Tempo almost certainly NOT use Ethereum-style hybrid PoS? **What about Tempo's design makes hybrid the wrong choice?** If your answer doesn't reference "validator count" or "payment finality requirements," re-read §5.`,
                },
                {
                  title: "Ethereum's PoS — Casper FFG + LMD-GHOST",
                  slug: 'consensus-ethereum-pos-en',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 18,
                  xpReward: 45,
                  content: `# Ethereum's PoS — Casper FFG + LMD-GHOST

Ethereum doesn't run *one* consensus protocol. It runs two, stacked. **LMD-GHOST** decides which block is "the head right now"; **Casper FFG** decides "what's actually final and can never be reorged." Why two? Because at ~1 million validators, you can't do BFT-style instant finality without melting the network — but you also can't ship a chain where nothing ever truly settles. The hybrid is the compromise.

This lesson takes the hybrid apart so you can read the spec and know what each half is doing.

> 🛑 **Predict before scrolling.** Ethereum slot time is 12 seconds, epoch is 32 slots. **Finality takes ~2 epochs minimum.** Compute the wall-clock time. Why isn't this faster — why doesn't Ethereum finalize every slot?

12 seconds × 32 slots × 2 epochs = **12.8 minutes**. The next 4 sections explain why this number.

## 1. The two protocols

| Protocol | Role | Cadence | Output |
| :--- | :--- | :--- | :--- |
| **LMD-GHOST** | Fork choice — "what's the head?" | Every slot (12s) | Probabilistic head |
| **Casper FFG** | Finality gadget — "what's final?" | Every epoch (~6.4 min) | Finalized checkpoint |

LMD-GHOST runs continuously, picks the tip. Casper FFG runs at epoch boundaries, finalizes older blocks. Both rely on the same validator set — the ~1M ETH stakers.

## 2. LMD-GHOST in 60 seconds

**Latest Message Driven, Greedy Heaviest Observed Sub-Tree.** (The mouthful unpacks below.)

Each slot, validators do two things:
1. **Propose** (if it's your slot) — broadcast a block
2. **Attest** — vote on which block you think is the head (an *attestation* is a signed message naming a block)

The fork choice rule: **for each block, count attestations in its subtree (weighted by stake). Pick the subtree with most weight.**

\`\`\`
Block A (proposed slot N)
├── Block B (slot N+1)        ← 60% of attestations in subtree
│   └── Block D (slot N+2)
└── Block C (slot N+1, conflicting fork)    ← 40% of attestations
\`\`\`

The chain picks B as canonical. C is orphaned.

Key properties:

- **"Latest Message"**: only count each validator's **most recent** attestation (prevents long-range bribery via old votes)
- **"Heaviest Sub-Tree"**: count the subtree's weight, not just the immediate child (this is the GHOST part — gives weight to uncle confirmations)

> 🛑 **Anti-fluency.** "LMD-GHOST is just longest-chain." **Wrong.** LMD-GHOST is heaviest-subtree, weighted by stake. Why the distinction? What attack does heaviest-subtree defend against that longest-chain doesn't?

The defense: **selfish mining**. Longest-chain lets a miner with 30% hashpower secretly build a chain and reveal it to orphan others. Heaviest-subtree forces stake-weighted attestations to make this much harder.

## 3. Casper FFG in 60 seconds

**Friendly Finality Gadget.**

Every 32 slots (one epoch ~ 6.4 min), the protocol picks the start of that epoch as a **checkpoint**. Validators vote on which checkpoint they justify.

The rule:
1. **Justification**: 2/3+ of validators (by stake) vote to justify a checkpoint
2. **Finalization**: a justified checkpoint is finalized when the **next** checkpoint is also justified

So finality takes 2 epochs minimum. After finalization:
- **Cannot be reorged** — finalized blocks are permanent
- **Cannot be slashed away** — even Byzantine validators can't undo finality

This is the BFT half of the hybrid. The 2/3+ rule is exactly the 3f+1 quorum from Lesson 1.

> 🛑 **Predict.** A validator double-votes (votes for two different checkpoints in the same epoch). **What slashing condition is this?** What fraction of their stake gets slashed?

This is **surround voting** or **double voting** — both are slashable. Penalty depends on correlated slashing (how many other validators were slashed in the same window). Minimum: 1 ETH. Maximum: full stake (32 ETH) if many validators were slashed together.

## 4. Slashing conditions

Two slashable offenses:

| Offense | What it looks like | Why it's bad |
| :--- | :--- | :--- |
| **Double voting** | Sign two votes for the same epoch but different checkpoints | Could split-finalize two conflicting checkpoints |
| **Surround voting** | Sign vote A then sign vote B that "surrounds" A | Can't both be valid without forks |

The math: **if no validator double-votes or surround-votes, you can prove safety**. So slashing makes attacks economically irrational — attempt = guaranteed loss of stake.

Slashing is **cryptographically detectable**. Anyone can submit a slashing proof to the chain; the validator's stake gets burned automatically. No trusted oracle needed.

> 🛑 **Anti-fluency.** Slashing isn't punishment — it's **economic security**. Restate the security argument: why does the existence of slashing make attacks impossible-in-practice even though they're possible-in-theory?

Because an attacker needs to acquire stake (millions of ETH) and then **lose it** to attack. The cost of attack > value extractable. Stake is the security collateral.

## 5. The Engine API — where consensus talks to execution

Ethereum splits the node into two processes: a **consensus client** (CL — Lighthouse, Prysm, etc.) that runs the voting protocol, and an **execution client** (EL — Reth, Geth, etc.) that runs the EVM and stores state. They communicate over the **Engine API** — a JSON-RPC interface defined by the Ethereum spec, spoken locally between the two processes on the same machine.

\`\`\`mermaid
sequenceDiagram
    participant CL as Consensus Client (Lighthouse)
    participant EL as Execution Client (Reth)

    Note over CL: Slot N — I'm the proposer
    CL->>EL: engine_forkchoiceUpdated(head, finalized, safe)
    CL->>EL: engine_getPayloadV4(payloadId)
    EL-->>CL: ExecutionPayload (built block)
    Note over CL: Sign + broadcast block
    CL->>EL: engine_newPayloadV4(payload)
    EL-->>CL: PayloadStatus { VALID }
\`\`\`

Three methods do the work:

- **\`engine_forkchoiceUpdated\`** — CL tells EL "the chain head is X, finalized is Y, prepare a block on top of X"
- **\`engine_getPayload\`** — CL asks EL "give me the block you prepared"
- **\`engine_newPayload\`** — CL tells EL "validate this block I received from another proposer"

**Reth implements the EL side of this.** That's where consensus integration happens.

> 🔍 **Find in repo.** Open [reth's engine crate](https://github.com/paradigmxyz/reth/tree/main/crates/engine) and find the \`engine_newPayload\` handler. **Trace what happens when it returns VALID** — what does the EL commit to disk before responding?

## 6. Why this matters for your L1

If you're building Tempo-class L1:

- **Probably not** running Ethereum's CL — you have your own validator set, different slot times, different finality cadence
- **Probably** using a Reth-compatible Engine API — so you can swap in different consensus clients
- **Definitely** need slashing semantics — but customized for your validator set size

The two halves of Ethereum's hybrid (LMD-GHOST + Casper FFG) are the **mental model** for any new PoS chain. You'll likely simplify (no 1M validators = no need for the gadget split), but the **slashing + 2/3+ quorum** structure ports directly.

## 7. Reading list

- [Ethereum consensus spec](https://github.com/ethereum/consensus-specs) — \`specs/phase0/beacon-chain.md\`
- [Vitalik's Casper FFG paper](https://arxiv.org/abs/1710.09437) — original 2017
- [Engine API spec](https://github.com/ethereum/execution-apis/blob/main/src/engine/specification.md) — JSON-RPC interface

## 8. Practice

Sketch on paper:

1. Two competing checkpoints — when does the gadget finalize one over the other?
2. A slashing proof — what data is in it? Why is that data sufficient?
3. The handshake from CL to EL when a new block arrives from the network

> Final check: in two sentences, why is "Ethereum finality takes 13 minutes" not a bug — what does the 13 minutes buy us that 1-second BFT finality wouldn't? **If your answer doesn't include "validator decentralization at scale," re-read §1 of this lesson and §3 of last.**

> 🛣️ **The road not taken (Solana):** Solana's consensus is **Tower BFT + Proof-of-History (PoH)** — a fundamentally different bet from Gasper. Tower BFT is a PBFT variant where validator votes anchor to a *verifiable clock* (PoH — a SHA256 hash-chain that serves as a deterministic timeline). Validators don't agree on time first and then vote; PoH **is** the time, and votes reference points along it. The result: ~400ms finality vs Ethereum's ~13 minutes, at the cost of much higher validator hardware requirements and a single-leader-per-slot model (no per-slot committees, no ~1M validator pool). Gasper trades latency for permissionless validator participation at scale; Tower BFT trades validator-pool size for end-user latency. Both are valid BFT answers; the choice tracks what the chain optimizes for — open participation vs sub-second finality.`,
                },
                {
                  title: 'HotStuff and HyperBFT — the single-leader BFT family',
                  slug: 'consensus-hotstuff-hyperbft-en',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 17,
                  xpReward: 45,
                  content: `# HotStuff and HyperBFT — the single-leader BFT family

Hyperliquid does ~200,000 perp trades per second with sub-second finality. The consensus under that is **HyperBFT** — and HyperBFT isn't an exotic new design. It's a HotStuff variant. HotStuff (2018) is itself a descendant of PBFT (1999), and the whole family is what nearly every modern non-Ethereum L1 picks when it needs instant finality.

Hyperliquid hasn't open-sourced HyperBFT. But HotStuff is published, and reading it is the closest reference you have to what's actually running under HYPE.

> 🛑 **Predict before scrolling.** PBFT (1999) has O(n²) messages per block. HotStuff (2018) has O(n). **What changed to enable that 10000x message reduction at n=100 validators?** (Hint: cryptography.)

## 1. PBFT — the parent

Castro & Liskov (1999). The protocol everyone learned from. Three rounds:

\`\`\`
Round 1 (Pre-prepare): Leader → all validators: "Block B"
Round 2 (Prepare):     All → all: "I voted for B"
Round 3 (Commit):      All → all: "I'm ready to commit B"
\`\`\`

After round 3, validators commit. Three round-trips × n² messages (because round 2 and 3 are all-to-all) = **n² total**.

For n=100, that's 10,000 messages per block. For n=1000, 1M messages per block. Doesn't scale.

> 🛑 **Anti-fluency.** Why not just have everyone send to the leader, who aggregates? **What attack does that open?** If your answer doesn't include "Byzantine leader can lie about who voted what," re-read Lesson 1's §3 on safety.

## 2. HotStuff — the breakthrough

Yin, Malkhi, Reiter, Gueta, Abraham (VMware, 2018). Two innovations:

### 2.1 Threshold signatures

Instead of every validator sending their signature to everyone, use **threshold cryptography** (a signature scheme — typically BLS — where partial signatures from k different signers can be mathematically combined into one short signature that verifies as "k of them signed"):

- 2f+1 validators each produce a partial signature
- The partials combine into **one aggregated signature** of size O(1) — same byte count whether it represents 4 signers or 400
- The leader broadcasts just the aggregate, not n individual signatures

This collapses n²→n communication. The leader fans out a single aggregated signature; validators don't need to talk to each other.

### 2.2 Pipelined commits

Combine "Prepare" and "Commit" into a single pipeline. A new block goes through phases, but multiple blocks are in different phases simultaneously:

\`\`\`
Block N:   Propose → Vote → Commit
Block N+1:           Propose → Vote → Commit
Block N+2:                     Propose → Vote → Commit
\`\`\`

Throughput becomes 1 commit per block-time, not 1 commit per 3-block-times.

> 🛑 **Predict.** A Byzantine leader proposes a bad block. **In HotStuff, when does the protocol detect this and switch leaders?** Trace through the three phases mentally before scrolling.

After the **propose** phase, if 2f+1 validators don't vote yes, the next leader takes over with a **view change**. The bad proposal is dropped. Liveness recovers in one extra round.

## 3. The HotStuff variants

The family has evolved:

| Variant | Year | Key change |
| :--- | :--- | :--- |
| **Basic HotStuff** | 2018 | Original — 3 phases, pipelined |
| **Event-driven HotStuff** | 2019 | Asynchronous between phases |
| **DiemBFT** | 2020 | Used by Diem (now defunct) |
| **HyperBFT** | 2023 | Used by Hyperliquid |
| **Aptos BFT** | 2022 | Used by Aptos |

The pattern: each variant optimizes for a specific deployment. **HyperBFT** appears to optimize for: low-latency single-region validator cluster, hot-path optimized for orderbook trades.

> 🔍 **Find in research.** Search arXiv for "HotStuff" and look at the 2020+ variants. Each adds a specific optimization. **What does each optimize for?** This is your map of the design space.

## 4. HyperBFT — what's public

Hyperliquid's whitepaper and tech blog give some details:

- **HotStuff-derived**: explicitly mentioned
- **~20-25 validators**: bounded committee
- **Sub-second finality**: 1 round-trip in practice
- **EVM integration**: HyperEVM runs in parallel with orderbook, both committed by the same consensus

What's **not public** (and you need to infer):
- Exact pipelining depth
- Leader rotation policy (round-robin, stake-weighted, randomized?)
- View change details
- Network optimization (custom transport? batching?)

For Tempo (Paradigm) we don't have a whitepaper yet, but the family is almost certainly the same (HotStuff or Tendermint family — they're cousins).

## 5. The HotStuff invariants you must understand

Three properties make HotStuff work:

### 5.1 Quorum certificates (QCs)

A **QC** is "proof that 2f+1 validators voted for block B". It's a single aggregated signature. Cheap to verify.

Every commit is **backed by a QC**. If you see a block with a valid QC, you know 2f+1 validators agreed.

### 5.2 View numbers

The protocol runs in **views**. View k has a designated leader. If the leader is Byzantine or unreachable, view changes to k+1 (new leader). Each view has its own QC chain.

### 5.3 Locks

Once 2f+1 validators "lock" on a block (vote in phase 2), the next leader must include that block — or prove it can't (via a higher QC). This **prevents safety violations** during view changes.

> 🛑 **Anti-fluency.** "Locks prevent forks." **Sort of.** Locks prevent **conflicting commits**, not forks. A Byzantine leader can propose conflicting blocks; locks ensure only one gets committed. Restate this distinction.

## 6. The Hyperliquid context — why HotStuff specifically

Hyperliquid is a **perp DEX**. Their consensus design serves:

- **High orderbook update rate**: validators must agree on the orderbook state, which changes every block
- **Low latency**: traders want <1s confirmation
- **Bounded validator set**: high throughput requires few, fast validators
- **EVM coexistence**: HyperEVM runs alongside, same finality guarantees

HotStuff fits because:
- Bounded committee enables low-latency
- QCs are cheap to verify (orderbook code can validate inclusion fast)
- Pipelining = high throughput

Compare with Tendermint: Tendermint is simpler but doesn't pipeline as aggressively. HotStuff wins on throughput.

## 7. Practice

For each chain, identify the consensus family and one design choice:

1. Hyperliquid (HotStuff-derived) — bounded validator set for latency
2. Aptos (Aptos-BFT, HotStuff-derived) — DAG-based mempool for throughput
3. Sui (Bullshark + Narwhal, DAG-based) — separates ordering from execution
4. Cosmos Hub (Tendermint) — simpler, lower throughput than HotStuff
5. Solana (PoH + Tower BFT) — clock-based, sequence-driven (different family)

## 8. Reading list

- [HotStuff paper](https://arxiv.org/abs/1803.05069) — the original 2018
- [Hyperliquid whitepaper](https://hyperliquid.gitbook.io/hyperliquid-docs/about-hyperliquid/consensus) — what's public
- [DiemBFT spec](https://developers.diem.com/docs/technical-papers/the-diem-blockchain-paper/) — the production HotStuff variant (defunct project but public docs)

> Final check: in one sentence, what makes HotStuff superior to PBFT for chains like Hyperliquid? **If your answer is just "faster," go deeper — name the specific structural change.** Reference §2 if needed.`,
                },
              ],
            },
          },
          {
            title: 'Reading real consensus code',
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: "Reading Reth's Consensus trait",
                  slug: 'consensus-reth-trait-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 18,
                  xpReward: 45,
                  content: `# Reading Reth's Consensus trait

Open Reth's source. Search for "PoS." You will find very little, because **Reth doesn't implement PoS or BFT at all** — that work lives in the consensus client (Lighthouse, Prysm, or your own engine). So when people say "Hyperliquid runs on Reth" or "Berachain forks Reth for PoL," what consensus surface are they actually touching?

The answer is one trait: **\`Consensus\`**. It's the integration point where any consensus engine plugs into Reth's execution pipeline. This is the trait Hyperliquid's node, Tempo's node, and every Reth-based chain implements.

> 🛑 **Predict before scrolling.** Reth needs to validate a block coming from the consensus layer. **What checks must run before the EVM executes the transactions?** List 4. (Hint: cryptographic, structural, temporal, and one consensus-specific.)

## 1. Where consensus lives in Reth

Reth's architecture splits concerns:

| Layer | Responsibility | Component |
| :--- | :--- | :--- |
| **Execution** | Run transactions, produce post-state | revm + executor |
| **Storage** | Persist blocks, state, receipts | MDBX (Reth's embedded key-value store) |
| **Network** | Receive blocks from peers | devp2p (Ethereum's P2P transport) |
| **Consensus** | Validate block correctness per chain rules | \`Consensus\` trait |

Note: **Reth's \`Consensus\` trait doesn't pick the chain head.** That's the consensus client's job (Lighthouse, Prysm, or custom). Reth's job is to **validate** blocks it receives — were they built per the rules?

The split: head selection (CL) vs block validation (Reth as EL).

## 2. The trait — actual source

[\`crates/consensus/consensus/src/lib.rs\`](https://github.com/paradigmxyz/reth/blob/main/crates/consensus/consensus/src/lib.rs):

\`\`\`rust
#[auto_impl::auto_impl(&, Arc)]
pub trait Consensus<B: Block>: HeaderValidator<B::Header> {
    type Error;

    fn validate_body_against_header(
        &self,
        body: &B::Body,
        header: &SealedHeader<B::Header>,
    ) -> Result<(), Self::Error>;

    fn validate_block_pre_execution(
        &self,
        block: &SealedBlock<B>,
    ) -> Result<(), Self::Error>;
}

pub trait FullConsensus<N: NodePrimitives>: Consensus<N::Block> {
    fn validate_block_post_execution(
        &self,
        block: &RecoveredBlock<N::Block>,
        result: &BlockExecutionResult<N::Receipt>,
    ) -> Result<(), ConsensusError>;
}
\`\`\`

Three methods, three phases of validation. **Read them in the order they fire** (which is not the order they're declared in the trait above — the pre/structural/post sequence below is the runtime execution order):

### \`validate_block_pre_execution\` — before running txs

Cheap checks that don't require executing the EVM:

- Transaction root matches header
- Receipt root matches header (after applying receipts)
- Block hash is well-formed
- Block size within limits
- Timestamp not too far in future

Fast. Sub-millisecond. Reject obviously broken blocks before wasting EVM cycles.

### \`validate_body_against_header\` — structural consistency

Body and header must match each other:

- Transactions root in header == merkleized tx list
- Withdrawals root == merkleized withdrawals list
- Ommers hash == hash of uncles list (legacy)

This is **cryptographic binding**. If body and header don't match, the block is malformed — someone tampered after signing.

### \`validate_block_post_execution\` — after EVM ran

Now you know the gas used, the post-state, the receipts. Check:

- Gas used in header == gas computed during execution
- State root in header == computed post-state root
- Receipts root == merkleized receipts
- Logs bloom == aggregated bloom

This is **the consensus-critical check**. If your fork miscomputes state root, this is where it diverges from mainnet.

> 🛑 **Anti-fluency.** Why is state root validation post-execution and not pre-execution? **What does pre-execution NOT know that post-execution does?** If you can't answer, re-read §2 of this lesson.

## 3. The HeaderValidator trait — parent

\`Consensus\` extends \`HeaderValidator\`. The header validator handles:

\`\`\`rust
pub trait HeaderValidator<H>: Send + Sync + Debug {
    fn validate_header(&self, header: &SealedHeader<H>) -> Result<(), ConsensusError>;

    fn validate_header_against_parent(
        &self,
        header: &SealedHeader<H>,
        parent: &SealedHeader<H>,
    ) -> Result<(), ConsensusError>;

    fn validate_header_with_total_difficulty(
        &self,
        header: &H,
        total_difficulty: U256,
    ) -> Result<(), ConsensusError>;
}
\`\`\`

Header validation is **separate from body validation** because:
- Headers arrive first (during fast sync)
- Headers can be validated without bodies
- Light clients need only headers

For Tempo or Hyperliquid: your \`HeaderValidator\` impl is where you check things like "is this proposer the elected leader for this slot?" That's your BFT-specific check.

## 4. The default impl — Ethereum's

For Ethereum mainnet, Reth provides \`EthBeaconConsensus\` (in \`crates/ethereum/consensus\`). It validates the Engine API contract:

- Block has the right shape
- State root matches after execution
- Gas limit is within ±1/1024 of parent (the EIP-1559 elastic bound)
- BaseFee follows EIP-1559 formula
- Timestamps increase

**It doesn't do PoS validation** — that's the CL's job. Reth trusts the CL has already validated the proposer signature, slot eligibility, attestations, etc.

> 🔍 **Find in repo.** Open \`crates/ethereum/consensus/src/lib.rs\` and find \`EthBeaconConsensus::validate_block_post_execution\`. **What's it checking specifically?** Make your own list of the checks before scrolling.

## 5. For Tempo / Hyperliquid — what would change

A custom L1 with BFT consensus would override:

- **\`HeaderValidator\`**: verify proposer signature, validator set inclusion, view/round number
- **\`validate_block_post_execution\`**: include consensus-specific post-state checks (e.g., orderbook state for HyperEVM)
- **Slashing-related fields**: if header includes slashing evidence, validate it cryptographically

The structure stays the same. **You're not rewriting the trait** — you're providing a different impl that wires into Reth's NodeBuilder.

## 6. The NodeBuilder slot

From Inside Reth (you've seen this):

\`\`\`rust
let node = NodeBuilder::new()
    .with_types::<CustomNode>()
    .with_components(
        CustomComponents::default()
            .consensus(MyCustomConsensus::new(validator_set))
    )
    .launch()
    .await?;
\`\`\`

\`MyCustomConsensus\` implements \`Consensus<N::Block>\`. The NodeBuilder wires it into block validation. Done.

This is the same pattern as custom payload builder, custom EVM config, etc. — **consensus is one component among six**.

## 7. Practice

In a fresh terminal:

\`\`\`bash
git clone https://github.com/paradigmxyz/reth
cd reth
\`\`\`

Then:

1. Open \`crates/consensus/consensus/src/lib.rs\` and read the full \`Consensus\` trait
2. Open \`crates/ethereum/consensus/src/lib.rs\` and find an impl
3. Count: how many methods does \`EthBeaconConsensus\` override vs use defaults?
4. Find the one place \`validate_block_post_execution\` is called from (search for the method name)

> Final check: in one sentence, what's the boundary between Reth's job (\`Consensus\` impl) and a consensus client's job? **If your answer doesn't reference "head selection vs block validation," re-read §1.**`,
                },
                {
                  title: 'Reading Malachite — Rust-native BFT by Informal Systems',
                  slug: 'consensus-malachite-en',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 18,
                  xpReward: 45,
                  content: `# Reading Malachite — Rust-native BFT by Informal Systems

If your Reth-based L1 needs Tendermint-style BFT consensus, you have three options. (1) Write your own — months of work plus security risk. (2) Shell out to CometBFT in Go — ugly cross-process glue. (3) Use [\`informalsystems/malachite\`](https://github.com/informalsystems/malachite): **Tendermint, rewritten in Rust**, by the same team that built CometBFT. Option 3 is the reason this lesson exists.

Malachite is the closest Rust-native BFT engine you can study, and the cleanest one to embed.

> 🛑 **Predict before scrolling.** Tendermint has **3 voting rounds per block**: Propose, Prevote, Precommit. **For each round, what does a validator decide to do?** List the input and output of each round.

## 1. Why Malachite exists

Informal Systems built CometBFT (Go). They watched the ecosystem ship Tendermint-derivative chains for years. They concluded:

- **Rust-native** consensus is now standard (Reth, Lighthouse-as-rewrite, etc.)
- The Go reference is hard to embed in Rust chains
- **A new high-quality Rust BFT engine** would be a public good

Malachite is the result. Architecturally faithful to Tendermint, ergonomically Rust.

The repo: [\`code/\`](https://github.com/informalsystems/malachite/tree/main/code) is the main implementation.

## 2. The core architecture

Three pluggable layers:

\`\`\`mermaid
flowchart TB
    App["Application<br/>(your chain)"] -->|propose/validate| Driver["Driver<br/>(orchestrator)"]
    Driver -->|Vote keeper| VK["Vote Keeper<br/>(quorum logic)"]
    Driver -->|Round state machine| RSM["Round State Machine<br/>(Tendermint rules)"]
    VK -->|2f+1 met?| Driver
    RSM -->|next step| Driver
\`\`\`

Three components, clean separation:

| Component | Responsibility |
| :--- | :--- |
| **Driver** | The orchestrator. Receives messages, dispatches to vote keeper + RSM. |
| **Vote Keeper** | Counts votes. Decides when 2f+1 is reached. |
| **Round State Machine** | The actual Tendermint protocol — state transitions, view changes. |

Your application plugs in at the top — Malachite calls back to you for "propose this block" and "validate this block."

## 3. The Round State Machine — Tendermint rules

The heart of Tendermint, captured in code:

\`\`\`rust
pub enum Step {
    NewRound,
    Propose,
    Prevote,
    Precommit,
    Commit,
}
\`\`\`

Each block round, validators transition through these:

1. **NewRound** → enter the round, decide if you're the proposer
2. **Propose** → if proposer, broadcast a block. If not, wait.
3. **Prevote** → vote "yes" or "nil" on the proposed block. 2f+1 prevotes for the same block is called a *polka* (Tendermint's name for "enough first-round support to move on").
4. **Precommit** → if you saw a polka, broadcast precommit. With 2f+1 precommits, **block is committed**.
5. **Commit** → finalize, move to next height

**Two thirds of validators must vote in each round** for progress. If they don't, view changes happen.

> 🛑 **Anti-fluency.** Why **two** rounds of voting (Prevote + Precommit) and not one? **What attack does the second round defend against?** Hint: think about what happens if a Byzantine proposer sends different blocks to different validators.

The second round confirms that **2f+1 validators agreed on the same block**, not just that they voted. If you had only one round, a Byzantine leader could split-vote and confuse downstream commits. The two-round structure is the **safety guarantee**.

## 4. The Vote Keeper — quorum logic

\`\`\`rust
pub struct VoteKeeper<Ctx: Context> {
    height: Ctx::Height,
    threshold: ThresholdParam,
    rounds: BTreeMap<Round, RoundVotes<Ctx>>,
}
\`\`\`

The Vote Keeper counts votes per round and tracks:

- **Per round**: prevotes for each candidate block, precommits for each candidate block
- **Polkas**: when 2f+1 prevotes accumulate for a block
- **Commits**: when 2f+1 precommits accumulate for a block

It exposes:

\`\`\`rust
impl<Ctx: Context> VoteKeeper<Ctx> {
    pub fn add_vote(&mut self, vote: Ctx::Vote, weight: Weight) -> VoteKeeperOutput<Ctx::Value>;
    pub fn get_polka(&self, round: Round) -> Option<Ctx::Value>;
    pub fn get_commit(&self, round: Round) -> Option<Ctx::Value>;
}
\`\`\`

Three operations: add a vote, check for polka, check for commit. **That's it.** All of Tendermint's quorum logic is in this struct.

> 🔍 **Find in repo.** Open [\`code/crates/vote/src/lib.rs\`](https://github.com/informalsystems/malachite/blob/main/code/crates/vote/src/lib.rs) and trace through \`add_vote\`. **What weighted by what?** Where does the 2f+1 threshold come from?

## 5. The Driver — orchestrator

The Driver receives messages (proposals, votes), runs them through the Vote Keeper and RSM, and emits **outputs** (actions for the application to take):

\`\`\`rust
pub enum Input<Ctx: Context> {
    NewHeight(Ctx::Height, ValidatorSet),
    Propose(Ctx::Proposal),
    Vote(Ctx::Vote),
    TimeoutElapsed(Timeout),
}

pub enum Output<Ctx: Context> {
    Propose(Ctx::Value),
    Vote(Ctx::Vote),
    Decide(Ctx::Height, Round, Ctx::Value),
    ScheduleTimeout(Timeout),
}
\`\`\`

This is **the entire interface** between the protocol engine and your application:

- App calls \`Driver.process(Input)\` when network messages arrive
- Driver returns \`Output\` actions: "propose this," "vote on that," "I decided, commit this block"

Clean event-loop pattern. Your app calls this in a hot loop.

## 6. The Application interface — what you implement

To wire Malachite to Reth:

\`\`\`rust
pub trait Context {
    type Address;
    type Height;
    type Vote: Vote<Self>;
    type Proposal;
    type Value;  // = your block type
    type ValidatorSet;
    type SigningScheme;
    // ...
}
\`\`\`

You implement \`Context\` with **your block type** (Reth's \`Block\`), **your validator set** (your custom struct), **your signature scheme** (ECDSA, BLS, etc.).

Then Malachite's Driver handles everything: rounds, voting, timeouts, view changes. **You provide just the application primitives.**

## 7. Astria — a real Malachite consumer on Reth

[\`astriaorg/astria\`](https://github.com/astriaorg/astria) ships a shared sequencer that uses **CometBFT** (Go Tendermint) for consensus over Reth-based rollups. They could swap to Malachite — same protocol, different implementation language.

This is the deployment shape:

\`\`\`
Application (Reth-based rollup) ←→ Sequencer (CometBFT/Malachite) ←→ Validator set
\`\`\`

Astria is the cleanest open-source example of "Reth + BFT consensus" in production. Worth reading.

## 8. For your Tempo-style L1

If you ship a Tempo-class L1 with Malachite:

\`\`\`rust
// Your context
struct TempoContext;
impl Context for TempoContext {
    type Address = ValidatorAddress;
    type Height = BlockNumber;
    type Vote = TempoVote;       // typed vote struct
    type Proposal = TempoBlock;   // your reth-compatible Block
    type Value = BlockHash;
    type ValidatorSet = TempoValidatorSet;
    type SigningScheme = Ed25519;
    // ...
}

// Main loop
let mut driver = Driver::<TempoContext>::new(/* params */);
loop {
    let input = network.next_message().await;
    let outputs = driver.process(input);
    for output in outputs {
        handle(output).await;
    }
}
\`\`\`

That's it at the architecture level. Malachite handles the protocol; you handle Reth integration via the consensus trait you saw last lesson.

## 9. Practice

1. Clone \`informalsystems/malachite\`
2. Open \`code/crates/driver/src/driver.rs\` and find the main \`process\` method
3. Trace a single vote through: arrives → Vote Keeper → polka detected → RSM step → output
4. Identify exactly where 2f+1 is checked (it's one specific function — find it)

> Final check: in one sentence, what does Malachite let you avoid writing yourself? **If you can't articulate it, you haven't internalized the value of having a Rust BFT engine ready to embed.**`,
                },
                {
                  title: "Reading bera-reth — Proof-of-Liquidity as consensus customization",
                  slug: 'consensus-bera-reth-en',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 15,
                  xpReward: 40,
                  content: `# Reading bera-reth — Proof-of-Liquidity as consensus customization

Most "we have a different consensus" pitches turn out to be PoS with a renamed token. Berachain's **Proof-of-Liquidity** (PoL) is the rare exception: it actually changes who's allowed to validate and where the rewards go. And the implementation — [\`berachain/bera-reth\`](https://github.com/berachain/bera-reth) — is in production, on Reth, with the diff small enough to read in an afternoon.

This is the practical surface of "swap the consensus." If you want to know what a real custom L1 looks like on Reth, this is the one to study.

> 🛑 **Predict before scrolling.** In Ethereum PoS, you become a validator by **staking 32 ETH**. In Berachain's PoL, what's the analogous step? (Hint: it's not "staking BGT.") **What does Berachain require validators to do that Ethereum doesn't?**

## 1. What Proof-of-Liquidity changes

The Berachain pitch:

- **In PoS**: validators stake a native token. The token's only utility is staking.
- **In PoL**: validators stake **BGT** (Bera Governance Token — Berachain's non-transferable governance asset), but BGT is earned by **providing liquidity to BEX** (BeraSwap, Berachain's native AMM/DEX).

The cascade:
1. Users provide liquidity to BEX → earn BGT
2. BGT can be staked → earn validator privileges
3. Validators earn fees → flow back to LPs as rewards

This makes **validator economics aligned with DEX liquidity**. The chain's most active users (LPs) are also the most reward-aligned validators.

## 2. What stays the same as Ethereum PoS

A lot. PoL is **PoS with a twist**, not a new family:

| Feature | PoS | PoL | Same? |
| :--- | :--- | :--- | :--- |
| Validator set bounded | Yes (~1M) | Yes (smaller, e.g., ~100) | Same structure |
| Slashing for double-signing | Yes | Yes | Same |
| Finality gadget | Casper FFG | CometBFT-style | Different engine |
| Block time | 12s | ~2s | Different |
| Token model | Single (ETH) | Dual (BGT + Bera) | Different |

The fundamental consensus model (BFT-style finality, slashing) is the **same**. What changes is:
- Who can be a validator (LP-based gating)
- How rewards flow (back to LPs, not just stakers)
- Block time (faster, ~2s)

## 3. The Reth-side changes

Reading bera-reth's architecture:

\`\`\`
bera-reth/
├── consensus/          ← Custom consensus impl
├── chainspec/          ← Berachain mainnet/testnet specs
├── evm/                ← Custom EVM config + precompiles
├── node/               ← NodeBuilder wiring
└── rpc/                ← bera_* RPC namespace
\`\`\`

The customization points (same pattern as Tempo or any Reth-based L1):

### 3.1 \`consensus/\`

The \`Consensus\` trait impl validates Berachain-specific block properties:

- **Proposer is in active validator set** (LP-gated)
- **Block timestamp within delta** (fast 2s blocks have tighter timestamp bounds)
- **Validator signature scheme**: BLS aggregated signatures, not ECDSA

### 3.2 \`evm/\`

Custom precompiles for PoL economics:

- **Reward distribution precompile**: when a block commits, native rewards flow to LPs proportionally
- **Validator registry precompile**: track active validator set on-chain

Both of these are **pre-execution hooks** in the executor — they run before transactions, updating chain state automatically.

> 🔍 **Find in repo.** Open bera-reth's \`evm/\` crate and find the executor impl. **What hooks does it run before the first transaction in each block?** This is the PoL reward flow.

## 4. The chain spec — what makes a chain "different"

bera-reth's \`chainspec\` shows what changes at the spec level:

- **Custom fork heights**: their own activation table for upgrades
- **Custom genesis**: BGT pre-mint, validator initial allocations
- **Custom precompile addresses**: PoL hooks at reserved addresses
- **Custom base fee params**: tuned for 2s blocks

This is **structurally identical** to Ethereum's chainspec but **semantically different**. Your custom L1 will have its own version.

## 5. Reading the consensus integration

Read in this order:

1. \`bera-reth/consensus/src/lib.rs\` — the \`Consensus\` impl
2. \`bera-reth/node/src/lib.rs\` — where it's wired into NodeBuilder
3. \`bera-reth/chainspec/src/lib.rs\` — what protocol parameters it depends on
4. \`bera-reth/evm/src/lib.rs\` — what executor hooks run with this consensus

Each file is small (<500 lines). The whole **bera-reth-as-consensus-customization** is ~2000 lines on top of standard Reth.

That's the headline: **a full custom L1 is 2000 lines of Reth customization** if you have a Tendermint-style consensus engine ready. Most of the work is integration, not protocol re-implementation.

> 🛑 **Anti-fluency.** Why does Berachain even need bera-reth, instead of just running standard Reth with custom validators? **What's in bera-reth that vanilla Reth doesn't have?** If your answer is "config" — go deeper. There are consensus-specific code paths.

## 6. The lesson for your L1

Studying bera-reth as a reference:

- Your custom chain crate ~= bera-reth's crate structure
- Your \`Consensus\` impl ~= bera-reth's, with your validator set rules
- Your executor hooks ~= bera-reth's PoL hooks, with your business logic
- Your NodeBuilder wiring ~= bera-reth's, calling your components

**bera-reth is the template.** Tempo's node crate ([\`tempoxyz/tempo\`](https://github.com/tempoxyz/tempo)) is now public and you can verify the same shape directly — different business logic (payments-priority instead of PoL), same skeleton. Same compose-don't-fork pattern: their \`tempoxyz/reth\` is 0 commits ahead of upstream.

## 7. Practice

1. Clone bera-reth (or browse on GitHub)
2. Compare to the directory structure of reth's own \`crates/optimism/\` from Expert Module 3
3. Identify the 3 files most specific to PoL (the parts you'd most need to customize for a different L1)
4. Estimate: if you forked bera-reth to make a Tempo-style L1, how much would you change vs keep?

> Final check: in one sentence, what's the structural answer to "how do I ship a custom L1 on Reth?" **If your answer is more than "implement the Consensus trait + custom executor hooks + NodeBuilder wiring," you're overcomplicating.**`,
                },
                {
                  title: 'Quiz: reading consensus internals',
                  slug: 'consensus-reading-quiz-en',
                  type: 'QUIZ',
                  sortOrder: 3,
                  duration: 10,
                  xpReward: 40,
                  content: `# Quiz: reading consensus internals

Short test on what you've read in this module. **No fluency answers** — every question maps to a specific source file or design choice.`,
                  quizQuestions: [
                    {
                      question: "What's the **structural difference** between Reth's `Consensus` trait and a consensus client like Lighthouse?",
                      options: [
                        'Same thing — Reth includes a consensus engine internally.',
                        "Reth's `Consensus` trait **validates** blocks against chain rules; a consensus client like Lighthouse **selects** which block is the head via fork choice. Two different jobs at the EL/CL boundary.",
                        "Reth's `Consensus` runs at the network layer; consensus clients run at the application layer.",
                        'Reth uses RocksDB; consensus clients use MDBX.',
                      ],
                      correctIndex: 1,
                      explanation: 'The EL/CL split is fundamental. Reth (EL) validates blocks — does this block follow the rules? Lighthouse (CL) decides — which valid block should we build on next? Custom L1s replace **both** the CL (e.g., Malachite) and the Reth `Consensus` impl.',
                    },
                    {
                      question: 'In Tendermint, why are there **two voting rounds** (Prevote then Precommit) instead of one?',
                      options: [
                        'Performance — two rounds parallelize better than one.',
                        'The first round (Prevote) confirms validators see the block. The second round (Precommit) confirms 2f+1 saw the **same** block — defending against a Byzantine leader sending different blocks to different validators.',
                        'Tradition from PBFT (1999); modern variants like HotStuff use one round.',
                        'It allows uncle blocks to be referenced in the second round.',
                      ],
                      correctIndex: 1,
                      explanation: 'Two rounds = safety against split-brain. A Byzantine leader can send different blocks to different subsets. Without the second round, you could commit two conflicting blocks. Prevote tells the network "I saw something"; Precommit confirms "2f+1 of us saw the same something."',
                    },
                    {
                      question: "What's the **headline structural difference** between PBFT (1999) and HotStuff (2018)?",
                      options: [
                        'PBFT runs in pure Rust; HotStuff is a Solidity contract.',
                        'HotStuff uses **threshold signatures** to collapse PBFT\'s O(n²) all-to-all communication into O(n) leader-fanout, and pipelines consecutive blocks for throughput.',
                        'PBFT is a finality gadget; HotStuff is a fork choice rule.',
                        'PBFT is permissionless; HotStuff requires a validator set.',
                      ],
                      correctIndex: 1,
                      explanation: 'Cryptography (threshold signatures) lets one aggregated signature replace n individual signatures. This is the n² → n collapse. Pipelining is the second innovation — blocks can be in different phases simultaneously, so throughput becomes 1 commit per block-time instead of 1 commit per 3-block-times.',
                    },
                    {
                      question: "What is **Ethereum's PoS finality cadence**, and what's the architectural reason for it?",
                      options: [
                        'Every slot (12s) — to maximize throughput.',
                        '2 epochs (~13 min) minimum — because **1M+ validators** can\'t do BFT-style instant finality, so finality happens at epoch checkpoints via 2/3+ stake-weighted votes (Casper FFG).',
                        'Probabilistic — Ethereum PoS uses Bitcoin-style longest-chain.',
                        'Configurable — operators choose between 1 slot and 1 epoch.',
                      ],
                      correctIndex: 1,
                      explanation: 'Hybrid PoS: fast head selection (LMD-GHOST every slot) + slow finality (Casper FFG every 2 epochs). The 13-min number is the cost of decentralization at 1M validators. Tempo-class chains pick smaller validator sets and instant finality.',
                    },
                    {
                      question: "Why does Berachain need **bera-reth** instead of running standard Reth with custom validators?",
                      options: [
                        "Because they use a different EVM implementation, not revm.",
                        'Standard Reth is fine for validators but lacks **consensus-specific code paths**: PoL-aware block validation, custom executor hooks for liquidity reward flow, BGT-aware chainspec, and validator-set-coupled-to-LP-state precompiles.',
                        'For licensing reasons — Reth is GPL.',
                        'Berachain runs on a different L1; bera-reth is for L2 only.',
                      ],
                      correctIndex: 1,
                      explanation: "PoL fundamentally changes the validator-economic relationship. The `Consensus` impl, executor hooks, and chainspec all need to know about it. That's ~2000 lines of customization on top of vanilla Reth. The pattern is the same as op-stack-on-reth: minimal but consensus-critical customization.",
                    },
                    {
                      question: 'In Reth\'s `Consensus` trait, which method **validates the state root**?',
                      options: [
                        '`validate_header` — checks all header fields including state root.',
                        '`validate_body_against_header` — checks body and header structural consistency.',
                        '`validate_block_post_execution` — runs after the EVM executes transactions, so the computed post-state root can be compared to the header value.',
                        'None — state root is validated externally by a separate prover.',
                      ],
                      correctIndex: 2,
                      explanation: 'State root only exists *after* execution. You compute it by running all txs through revm, applying state changes, and merkleizing the resulting state. Pre-execution checks (header structure, gas limit math) happen first; post-execution checks include the state root comparison.',
                    },
                    {
                      question: 'What does **3f+1** mean in BFT consensus, and why is it tight?',
                      options: [
                        'Block size limit — 3 transactions plus 1 coinbase.',
                        'Minimum total validator count needed to tolerate f Byzantine validators. Tight because any two quorums must overlap in at least one honest validator (mathematical proof from Lamport 1982).',
                        'Number of voting rounds — 3 phases plus 1 commit.',
                        'A consensus tax rate — 3% of stake plus 1% fee.',
                      ],
                      correctIndex: 1,
                      explanation: 'The math: two quorums of size 2f+1 in a network of n=3f+1 nodes overlap in 2(2f+1)-n = f+1 nodes, of which at least 1 must be honest. This is the foundational quorum-intersection argument. Every BFT system from PBFT to HyperBFT assumes 3f+1.',
                    },
                    {
                      question: "Why is **Malachite's separation of Driver / VoteKeeper / RoundStateMachine** important for embedding in Reth?",
                      options: [
                        'It makes the protocol asynchronous.',
                        'Clean separation means **your application can implement only the `Context` trait** (block type, validator set, signature scheme) and Malachite handles all protocol logic. You don\'t rewrite Tendermint — you wire it in.',
                        'It enables zero-knowledge proofs of consensus.',
                        'It reduces gas costs for on-chain consensus.',
                      ],
                      correctIndex: 1,
                      explanation: 'The architectural value is the API surface: your Reth-based chain implements `Context` with your block type and validator set, and Malachite\'s Driver handles all the BFT protocol details (voting rounds, view changes, timeouts, 2f+1 detection). This is the same pattern as `Database` trait in revm — Malachite is to consensus what revm is to execution.',
                    },
                  ],
                },
              ],
            },
          },
          {
            title: 'Building consensus on Reth',
            sortOrder: 2,
            lessons: {
              create: [
                {
                  title: 'NodeBuilder consensus slot — wiring custom consensus',
                  slug: 'consensus-nodebuilder-slot-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 16,
                  xpReward: 45,
                  content: `# NodeBuilder consensus slot — wiring custom consensus

You have a custom \`Consensus\` impl (you wrote it last lesson). You have Malachite or your own engine driving the votes. **How do those two pieces actually become a running node?** Answer: one builder, one impl, one chained method call on NodeBuilder — the exact same shape as plugging in a custom mempool or custom EVM.

This lesson walks the call sites. By the end you should be able to sketch the wiring for a new L1 on a whiteboard.

> 🛑 **Predict before scrolling.** You're wiring custom consensus into Reth's NodeBuilder. **What 4 pieces does the builder need from you?** (Hint: trait impl, validator set, signature scheme, and one more.)

## 1. The consensus component in Reth's component model

From Inside Reth — six NodeBuilder components:

| Component | Trait | Default |
| :--- | :--- | :--- |
| pool | \`PoolBuilder\` | Ethereum pool |
| network | \`NetworkBuilder\` | devp2p |
| executor | \`ExecutorBuilder\` | Ethereum executor |
| **consensus** | **\`ConsensusBuilder\`** | **\`EthBeaconConsensus\`** |
| payload | \`PayloadBuilder\` | Ethereum payload builder |
| add_ons | \`AddOns\` | None |

The \`ConsensusBuilder\` slot is where you plug in custom block validation. It produces a \`FullConsensus\` impl that NodeBuilder will call during block processing.

## 2. The trait

\`\`\`rust
pub trait ConsensusBuilder<Node: FullNodeTypes>: Send {
    type Consensus: FullConsensus<Node::Primitives>;

    fn build_consensus(
        self,
        ctx: &BuilderContext<Node>,
    ) -> impl Future<Output = eyre::Result<Self::Consensus>> + Send;
}
\`\`\`

One method: \`build_consensus\`. It receives the builder context (chainspec, db, etc.) and returns your consensus impl.

This is **exactly the same shape** as \`PoolBuilder\`, \`PayloadBuilder\`, etc. The pattern is fractal: each component has a Builder trait that produces the component during \`launch()\`.

## 3. The wire-up code

\`\`\`rust
use reth_node_builder::{NodeBuilder, NodeHandle};
use reth_chainspec::ChainSpec;

// Your custom consensus impl
pub struct TempoConsensus {
    validator_set: TempoValidatorSet,
    chain_spec: Arc<ChainSpec>,
}

impl<B: Block> Consensus<B> for TempoConsensus {
    type Error = ConsensusError;

    fn validate_block_pre_execution(&self, block: &SealedBlock<B>) -> Result<(), Self::Error> {
        // Tempo-specific pre-execution checks:
        // - is proposer in validator set?
        // - is signature valid?
        // - is round number correct?
        todo!()
    }
    // ... other methods
}

// Your custom builder
pub struct TempoConsensusBuilder {
    validator_set: TempoValidatorSet,
}

impl<Node: FullNodeTypes> ConsensusBuilder<Node> for TempoConsensusBuilder
where
    Node::Primitives: NodePrimitives,
{
    type Consensus = TempoConsensus;

    async fn build_consensus(
        self,
        ctx: &BuilderContext<Node>,
    ) -> eyre::Result<Self::Consensus> {
        Ok(TempoConsensus {
            validator_set: self.validator_set,
            chain_spec: ctx.chain_spec(),
        })
    }
}

// Wire it into the node
async fn main() -> eyre::Result<()> {
    let validator_set = TempoValidatorSet::load_from_chainspec(&chain_spec)?;
    let consensus_builder = TempoConsensusBuilder { validator_set };

    let handle = NodeBuilder::new(config)
        .with_types::<TempoNode>()
        .with_components(
            TempoComponents::default()
                .consensus(consensus_builder)
        )
        .launch()
        .await?;

    handle.wait_for_shutdown().await?;
    Ok(())
}
\`\`\`

That's it. **The consensus customization is one builder, one impl, one wiring call.** Same shape as everything else in Reth's SDK.

> 🛑 **Anti-fluency.** Where in this code is the **2f+1 quorum check** actually happening? **Trace it.** If your answer is "in TempoConsensus" — wrong. Reth's Consensus trait validates *blocks*, not votes. The voting happens elsewhere. Where?

The voting happens in the **consensus client** (Malachite, CometBFT, or your custom engine). Reth's \`Consensus\` trait validates blocks **after** they've been agreed upon — it doesn't run the voting. The 2f+1 check is upstream of Reth.

## 4. The consensus client side — Engine API caller

Reth (EL) exposes Engine API. Your consensus client (CL) calls it:

\`\`\`rust
// In your consensus client (Malachite-driven, custom, or other)
// After Malachite's Driver decides on a block:

async fn on_decide(block: TempoBlock, engine_api: EngineApiClient) -> Result<()> {
    // Tell Reth: "this is the new head, validate it"
    let payload_status = engine_api
        .new_payload_v4(block.to_execution_payload())
        .await?;

    if payload_status.status == PayloadStatus::Valid {
        // Tell Reth: "this is finalized, you can prune up to it"
        engine_api
            .fork_choice_updated_v4(ForkchoiceState {
                head_block_hash: block.hash(),
                safe_block_hash: block.hash(),
                finalized_block_hash: block.hash(),
            }, None)
            .await?;
    }
    Ok(())
}
\`\`\`

The CL drives Reth via Engine API. Reth validates locally using your \`TempoConsensus\` impl. **The two communicate over JSON-RPC**, just like Lighthouse ↔ Reth in standard Ethereum.

## 5. The complete picture

\`\`\`mermaid
sequenceDiagram
    participant Network as P2P Network
    participant CL as Tempo Consensus<br/>(Malachite)
    participant Driver as Malachite Driver
    participant EL as Reth<br/>(EL, TempoConsensus)

    Network->>CL: Validator votes / proposals
    CL->>Driver: Process input
    Driver->>Driver: Vote keeper / RSM
    Driver->>CL: Decide(block)
    CL->>EL: engine_newPayloadV4(block)
    EL->>EL: TempoConsensus::validate_block_pre_execution
    EL->>EL: Execute via revm
    EL->>EL: TempoConsensus::validate_block_post_execution
    EL->>CL: PayloadStatus(VALID)
    CL->>EL: engine_forkchoiceUpdatedV4(finalized)
    Network->>CL: Broadcast confirmation
\`\`\`

Two processes, one chain. Reth handles execution + storage + EVM. Malachite handles voting + ordering. Engine API connects them.

> 🔍 **Find in repo.** Open Reth's [\`crates/rpc/rpc-engine-api\`](https://github.com/paradigmxyz/reth/tree/main/crates/rpc/rpc-engine-api) and find \`engine_newPayloadV4\`. Trace what it does on receiving a payload. **What's the order of operations?**

## 6. The error path — when validation fails

If \`TempoConsensus::validate_block_pre_execution\` returns an error, Reth:

- Rejects the block (returns \`PayloadStatus::Invalid\`)
- Tells the CL the block is invalid
- CL must view-change, find a different proposer

**Block validation errors trigger consensus liveness recovery.** This is critical — your validation must be deterministic (same answer every time) or different validators will disagree and split-brain.

## 7. Production considerations

Your \`Consensus\` impl runs on the hot path:

- Every block must validate in milliseconds
- Allocate carefully (no per-block heap churn)
- Cache validator set lookups
- Use BLS or threshold signature verification, not naive ECDSA per-validator

For Tempo at ~30 validators, BLS verification is ~5ms. For Hyperliquid at ~20, even faster. Headroom matters.

## 8. Practice

Sketch (no need to compile):

1. \`TempoValidatorSet\` — what fields does it need? (start with: addresses, voting weights, BLS pub keys)
2. \`TempoConsensus::validate_header\` — what 3 checks must it do?
3. The startup sequence — how does \`TempoNode\` load the validator set from the chainspec?

> Final check: in one sentence, who validates **votes** (2f+1 detection) — Reth, your consensus client, or both? **If your answer doesn't draw the EL/CL line clearly, re-read §3.**`,
                },
                {
                  title: 'Building a minimal single-leader BFT in Rust',
                  slug: 'consensus-minimal-bft-en',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 20,
                  xpReward: 50,
                  content: `# Building a minimal single-leader BFT in Rust

Open the OP Stack docs. Open the Arbitrum docs. Open Hyperliquid's blog from launch. They all say variations of "we will decentralize the sequencer over time." Translation: **at launch, there is one machine producing every block, and a signature from a specific key is the only consensus.** That's it.

You can ship this in ~100 lines of Rust on top of Reth. This lesson is that ~100 lines, plus the trajectory for what to add when "later" arrives.

> 🛑 **Predict before scrolling.** Hyperliquid, Tempo, every OP Stack chain, and Arbitrum — **what consensus do they all run at launch**? It's not HotStuff. It's not Tendermint. (Hint: simpler than both.)

## 1. The single-leader / centralized sequencer pattern

Almost every new chain launches with **one trusted sequencer**:

- Owns the proposer role for every block
- Validates blocks before broadcasting
- Has emergency halt authority
- Plans to decentralize "later"

Why this works:

- **Liveness**: single point of failure but no view changes needed
- **Speed**: 1 round trip = block finalized
- **Simplicity**: no validator set management, no slashing infrastructure, no 2f+1 logic

Why this is acceptable initially:
- Chain has nothing to attack yet (low TVL)
- Decentralization is a roadmap, not a launch requirement
- You ship faster

Hyperliquid launched this way. Tempo will almost certainly launch this way. **You will too.**

## 2. The architecture

\`\`\`
[Mempool] → [Sequencer]  → [Reth EL] → [Network broadcast]
              │  │ │
              │  │ └─ ECDSA sign block
              │  └─ Pick tx order
              └─ Build block
\`\`\`

Three jobs the sequencer does:
1. **Build**: pick transactions, order them, set timestamp
2. **Sign**: cryptographic proof "this came from the sequencer"
3. **Broadcast**: send to Reth EL via Engine API + to other nodes via P2P

That's it. No voting. No quorums.

## 3. The minimal Rust impl

\`\`\`rust
use alloy_primitives::{Address, B256};
use alloy_signer::Signer;
use alloy_signer_local::PrivateKeySigner;
use reth_engine_primitives::ForkchoiceState;
use reth_rpc_engine_api::EngineApiClient;

pub struct CentralizedSequencer {
    signer: PrivateKeySigner,
    sequencer_address: Address,
    engine_api: EngineApiClient,
    block_period: Duration,  // e.g., 2 seconds
}

impl CentralizedSequencer {
    pub async fn run(&self) -> eyre::Result<()> {
        let mut ticker = tokio::time::interval(self.block_period);
        loop {
            ticker.tick().await;
            self.produce_one_block().await?;
        }
    }

    async fn produce_one_block(&self) -> eyre::Result<()> {
        // 1. Ask Reth to build a payload on the current head
        let payload_attrs = PayloadAttributes {
            timestamp: now_seconds(),
            prev_randao: B256::random(),
            suggested_fee_recipient: self.sequencer_address,
            // ...
        };

        let forkchoice_state = self.current_forkchoice().await?;
        let response = self.engine_api
            .fork_choice_updated_v4(forkchoice_state, Some(payload_attrs))
            .await?;
        let payload_id = response.payload_id.expect("must have payload id");

        // 2. Wait a moment for Reth to build the payload
        tokio::time::sleep(Duration::from_millis(500)).await;

        // 3. Get the built payload
        let payload = self.engine_api.get_payload_v4(payload_id).await?;

        // 4. Sign the payload hash (your authority proof)
        let payload_hash = payload.execution_payload.block_hash();
        let signature = self.signer.sign_hash(&payload_hash).await?;

        // 5. Submit signed payload back to Reth (and broadcast to peers)
        let signed_block = SignedPayload {
            payload: payload.execution_payload,
            sequencer_signature: signature,
        };

        self.engine_api
            .new_payload_v4(signed_block.payload.clone())
            .await?;

        // 6. Mark as finalized (single sequencer = instant finality)
        let new_head = signed_block.payload.block_hash();
        let new_forkchoice = ForkchoiceState {
            head_block_hash: new_head,
            safe_block_hash: new_head,
            finalized_block_hash: new_head,
        };
        self.engine_api
            .fork_choice_updated_v4(new_forkchoice, None)
            .await?;

        // 7. Broadcast to peers (via P2P, not shown)
        self.broadcast(signed_block).await?;

        Ok(())
    }

    async fn current_forkchoice(&self) -> eyre::Result<ForkchoiceState> {
        // Track current head locally or query EL
        todo!()
    }

    async fn broadcast(&self, signed: SignedPayload) -> eyre::Result<()> {
        // P2P broadcast (libp2p, devp2p, custom — your choice)
        todo!()
    }
}
\`\`\`

~100 lines total. **That's a working sequencer.** It produces blocks every \`block_period\`, signs them with ECDSA, and broadcasts.

## 4. The consensus side (validation on receivers)

Other nodes receive the signed block and validate via your custom \`Consensus\` impl:

\`\`\`rust
impl<B: Block> Consensus<B> for CentralizedConsensus {
    fn validate_block_pre_execution(
        &self,
        block: &SealedBlock<B>,
    ) -> Result<(), ConsensusError> {
        // The only "consensus" check: was this signed by the sequencer?
        let signature = block.sequencer_signature()?;
        let signer = signature.recover_address(&block.hash())?;

        if signer != self.expected_sequencer {
            return Err(ConsensusError::InvalidSequencer);
        }

        // Standard Ethereum-style checks
        self.validate_basic_block(block)?;

        Ok(())
    }
    // ...
}
\`\`\`

**Three lines of consensus logic**: recover signer, compare to expected, reject if wrong. The rest is standard EVM validation.

> 🛑 **Anti-fluency.** "But this is just trusted authority — not consensus." **Sort of.** It IS consensus — agreement on a single decision (the next block). It just has **a single decider**. Restate this in your own words. Why is "single-leader consensus" still consensus?

Because consensus is "agreement on a single value." With one decider, the value is whatever the decider says. The trade-off is **trust assumption** (1 honest sequencer) for **liveness** (no view changes needed). Acceptable for launch; gradually relaxed as decentralization progresses.

## 5. Step 1 of decentralization: 2-of-3 multisig sequencer

Move from a single signer to a **multisig** — block validity now requires signatures from 2 of 3 designated keys instead of 1:

\`\`\`rust
pub struct MultisigSequencer {
    signers: Vec<PrivateKeySigner>,  // 3 signers
    threshold: usize,                 // = 2
    engine_api: EngineApiClient,
}

impl MultisigSequencer {
    async fn produce_block(&self) -> eyre::Result<SignedPayload> {
        // 1. Lead signer (rotated) builds the payload
        let payload = self.build_payload().await?;

        // 2. Collect signatures from 2-of-3 signers
        let mut signatures = Vec::new();
        for signer in &self.signers {
            if let Some(sig) = self.try_sign(signer, &payload).await {
                signatures.push(sig);
                if signatures.len() >= self.threshold {
                    break;
                }
            }
        }

        if signatures.len() < self.threshold {
            return Err(eyre!("not enough signers available"));
        }

        Ok(SignedPayload {
            payload: payload.execution_payload,
            sequencer_signatures: signatures,
        })
    }
}
\`\`\`

Validation now checks **2-of-3 signatures**. This:

- Adds HA: any 2 of 3 signers can produce a block
- Adds a liveness mode: if one signer is down, the other 2 keep producing
- Still no Byzantine tolerance (assumes signers are honest)

The economics shift: 2-of-3 multisig is the **launch pattern for most production L2s**. Optimism, Arbitrum, Base — all run something like this initially, with multisig keys held by team + auditor + node operator.

## 6. Step 2 of decentralization: leader rotation with eligibility

Add **proposer rotation**:

\`\`\`rust
fn current_proposer(slot: u64, validator_set: &[Address]) -> Address {
    validator_set[(slot as usize) % validator_set.len()]
}
\`\`\`

Now each slot has a different leader, picked deterministically. If the leader misses their slot (no block within timeout), **the next leader takes over**.

This is **single-slot finality with rotating leaders** — almost a real BFT but without the 2f+1 vote.

The missing piece for full BFT: actual votes that hold the leader accountable. That's the jump to Tendermint/HotStuff (Malachite gives you that).

## 7. The realistic L1 launch sequence

Most L1s launch through these stages:

| Stage | Consensus | Decentralization | TVL safety |
| :--- | :--- | :--- | :--- |
| **Day 0** | Single sequencer | None | Trust the team |
| **Month 3** | 2-of-3 multisig | 3 operators | Trust the 2-of-3 set |
| **Month 12** | Rotating proposers | ~10 validators | Liveness if any 1 stays up |
| **Year 2** | Real BFT (Tendermint/HotStuff) | 30+ validators | 2/3+ Byzantine tolerance |

**You can ship the L1 at Day 0** — and then progressively decentralize. Tempo and Hyperliquid are likely at stage 2-3 today, planning for 4 over years.

## 8. Practice

Code-along (no need to run):

1. Write the \`SignedPayload\` struct (your custom block envelope with sequencer signature)
2. Write \`CentralizedConsensus::validate_block_pre_execution\` — full ECDSA signature recovery + comparison
3. Sketch \`current_forkchoice\` — how do you track the current head locally?
4. Think about: where does the mempool live? (Hint: not in the sequencer — separate component.)

> Final check: in one sentence, why is "single-leader consensus" both legitimate and sufficient for launching an L1? **If your answer isn't "trust assumption explicitly stated + progressively relaxed," re-read §4 and §7.**`,
                },
                {
                  title: 'Validator economics — slashing, rewards, attack vectors',
                  slug: 'consensus-validator-economics-en',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 17,
                  xpReward: 45,
                  content: `# Validator economics — slashing, rewards, attack vectors

Cryptography alone doesn't secure a PoS chain. It can *prove* that a validator double-signed — but proof is worthless if the validator pays nothing for it. **The protocol is safe only when the cost of cheating exceeds the cash you can extract by cheating.** That's the economics layer, and it's load-bearing — without it, the elegant 3f+1 quorum math collapses into "they shouldn't double-sign, please."

This lesson is the economics layer: slashing mechanics, attack vector pricing, and how to design slashing for your own L1.

> 🛑 **Predict before scrolling.** Ethereum mainnet has ~$50B+ staked. **What's the dollar cost of attempting a 51% attack on finality?** (You don't need an exact number — sketch the calculation.) Why is this the **security argument** for PoS?

## 1. The economic security argument

For BFT systems:

- Attack requires controlling **> 1/3** of validator stake (to halt liveness) or **> 2/3** (to violate safety)
- Stake gets **slashed** on detected double-sign or surround-vote
- Cost of attack = **lost stake on detection**
- Benefit of attack = value extractable

**Security**: stake required > value extractable.

For Ethereum at $50B staked, attacking finality requires ~$33B of stake. The slashing penalty is **the full $33B**. There's no economically rational attacker; you'd lose more than you could possibly gain.

This is **economic security**: the protocol is safe because attacking is irrational.

## 2. The two slashable offenses

In any BFT system that supports slashing:

### 2.1 Double-signing (equivocation — signing two conflicting messages for the same slot)

\`\`\`
Validator V signs Vote(block_A, round_5)
Validator V signs Vote(block_B, round_5)
\`\`\`

Both signed by V for the same round. **Cryptographically provable** — anyone with the two signatures can construct a slashing proof.

Punishment: validator loses **some or all** of their stake.

### 2.2 Surround voting

\`\`\`
Validator V signs Vote(source: epoch_3, target: epoch_5)
Validator V signs Vote(source: epoch_4, target: epoch_6)
\`\`\`

The second vote **surrounds** the first (later source, later target). This violates safety in Casper FFG specifically. Cryptographically provable.

Punishment: similar to double-signing.

> 🛑 **Anti-fluency.** Why is surround voting slashable but normal voting in consecutive epochs isn't? **What's the structural difference?** Re-read Lesson 3 §3 if unsure.

## 3. The slashing proof

A slashing proof is **the two contradictory signed messages**. That's it. Submission flow:

\`\`\`mermaid
sequenceDiagram
    participant Watcher as Slashing Watcher
    participant Chain as Reth EL
    participant State as State

    Watcher->>Watcher: Observe two signed votes from V
    Watcher->>Watcher: Verify both signatures
    Watcher->>Chain: SlashTransaction(vote_a, vote_b)
    Chain->>State: Verify proof on-chain
    State->>State: Slash V's stake
    State->>Watcher: Pay whistleblower reward (small %)
\`\`\`

Three properties make this work:
1. **Detection is permissionless**: anyone watching the network can submit a proof
2. **Verification is cryptographic**: the chain verifies the two signatures, no oracle needed
3. **Reward is small**: enough to incentivize watching, not enough to incentivize false reports (which fail verification anyway)

## 4. The slashing math — how much to slash?

Two designs:

### 4.1 Flat slash

Slash a fixed % of stake regardless of context. Simple. Ethereum's minimum slash is **1 ETH** for a single offense.

Easy to reason about. Inadequate if many validators slash together (a coordinated attack).

### 4.2 Correlated slashing

Slash proportional to **how many validators slashed in the same window**. Ethereum does this:

\`\`\`
slash_amount = (slashed_stake / total_stake) * stake * multiplier
\`\`\`

Where \`slashed_stake\` is the stake of all slashed validators in a recent window. If one validator slashes alone, penalty is small. If 33% of validators slash together (coordinated attack), penalty is **catastrophic** — full stake.

**This is the economic moat against coordinated attacks.** A small accidental slash costs little; a real attack costs everything.

> 🔍 **Find in repo.** [Ethereum consensus spec](https://github.com/ethereum/consensus-specs/blob/dev/specs/phase0/beacon-chain.md), search for "slashing" or "process_slashing". The exact formula is there. **What's the multiplier?**

## 5. Rewards — the other half

Validators earn:

- **Per-block reward**: small constant
- **Attestation reward**: for voting correctly on the head
- **Finality reward**: for participating in finality votes

Total annual yield for a well-behaved validator: ~3-5% for Ethereum mainnet. Compared to slashing risk:

- Probability of accidental slash: very low if you run conservatively
- Cost of accidental slash: ~1 ETH minimum
- Annual earnings on 32 ETH: ~1 ETH

So a single accidental slash wipes out a year of earnings. **The economic incentive is to be careful**, not to attack.

## 6. The attack vectors

What can a malicious validator try?

| Attack | What it does | Defense |
| :--- | :--- | :--- |
| **Double-sign** | Sign two blocks at same height to confuse fork choice | Slashing |
| **Surround vote** | Vote to finalize two conflicting checkpoints | Slashing |
| **Long-range attack** | Bribe validators from old period to rewrite history | Weak subjectivity (clients trust recent state) |
| **51% finality attack** | Acquire 2/3+ stake, sign everything | Economic cost > $33B for ETH; impossible at TVL |
| **Liveness attack** | Acquire 1/3+ stake, refuse to vote | Halts chain; doesn't compromise safety |

The first two are **slashable** = economically irrational. The third (long-range) is blocked by **weak subjectivity** rather than slashing. The last two require **majority capital** = economically extreme.

The most realistic attack: **liveness halt** with 1/3+. This costs you the income from honestly staking, but you don't lose stake. Some attackers might rationally do this for political reasons (e.g., government coercion).

> 🛑 **Predict.** A nation-state acquires 35% of ETH stake and refuses to vote. **What happens to Ethereum?** Trace through: liveness, finality, eventual user response.

Ethereum halts finalization. Tips keep producing (LMD-GHOST still works). After ~13 days, the protocol's **inactivity leak** kicks in — non-participating validators lose stake gradually until participating stake drops back to 2/3+. The chain finalizes again, with the inactive validators massively penalized.

Beautiful design: even a 1/3+ attack **only halts temporarily**, doesn't permanently break the chain.

## 7. For your custom L1

Designing slashing for Tempo or Hyperliquid:

- **Validator set size**: smaller = easier to coordinate attacks, so harder slashing required
- **Slash amount**: should exceed maximum theoretical extractable value from an attack
- **Whistleblower reward**: 1-5% is standard
- **Inactivity penalty**: necessary if you want resilience to censorship

Hyperliquid at ~20 validators has very high per-validator stake requirements + heavy slashing. Tempo at ~30-50 will similar pattern.

## 8. The launch question — slashing at day 1?

Should your L1 launch with slashing enabled?

**Arguments for**: economic security from day 1, no period of "trust us"
**Arguments against**: bugs in slashing logic are catastrophic, need time to validate

**Common pattern**: launch with slashing **enabled but with a low cap**. Catch real bugs without bankrupting honest validators. Raise the cap as confidence grows.

Hyperliquid launched with slashing. OP-Stack chains famously do not (they have no decentralized validator set yet). Tempo will likely launch with at least a soft form of slashing.

## 9. Practice

Calculate for your hypothetical L1:

1. Validator set size: 50
2. Stake per validator: $10M
3. Total stake: $500M
4. Maximum extractable value per attack (estimate): $200M
5. **Required slash %**: ? (must exceed extractable value)

What if extractable value spikes to $400M (a big trade settling)? Does slashing still cover?

> Final check: in one sentence, why is **slashing** the economic foundation of BFT consensus? **If your answer doesn't reference "attack cost > attack benefit," re-read §1.**`,
                },
                {
                  title: 'Final quiz: building L1 consensus',
                  slug: 'consensus-final-quiz-en',
                  type: 'QUIZ',
                  sortOrder: 3,
                  duration: 12,
                  xpReward: 50,
                  content: `# Final quiz: building L1 consensus

The final consensus check. You'll need this to ship a Tempo-class L1.`,
                  quizQuestions: [
                    {
                      question: 'You are designing consensus for a new payment-focused L1 (Tempo-class). Validator count: 30. Finality target: sub-second. **Which consensus family** and **why**?',
                      options: [
                        'Nakamoto PoW — battle-tested, decentralized.',
                        'Ethereum-style hybrid PoS — best practice, large validator support.',
                        'Pure BFT family (Tendermint or HotStuff) — 30 validators is in the sweet spot, BFT gives instant finality, payment use case demands deterministic settlement.',
                        'Single sequencer — fastest, simplest.',
                      ],
                      correctIndex: 2,
                      explanation: 'Hybrid PoS (option 2) is overengineered for 30 validators — you don\'t need a finality gadget when you can BFT directly. PoW (option 1) sacrifices finality. Single sequencer (option 4) works for launch but isn\'t a real "consensus design." Pure BFT at 30 validators is the textbook fit — Hyperliquid does this with ~20, Tempo (now public at `tempoxyz/tempo`) lands in the same family.',
                    },
                    {
                      question: "What's the **purpose** of Reth's `Consensus` trait, and what does it explicitly NOT do?",
                      options: [
                        'It runs the voting protocol — Reth has its own internal BFT.',
                        'It validates blocks per chain rules (pre-execution structure, post-execution state root, gas math). It does NOT do head selection / fork choice — that\'s the consensus client\'s job (Lighthouse for Ethereum, Malachite for Tendermint chains, custom for L1s).',
                        'It signs blocks on behalf of the validator.',
                        'It manages the validator set.',
                      ],
                      correctIndex: 1,
                      explanation: 'The EL/CL split: Reth (EL) validates blocks; CL decides which block to build on (fork choice) and runs voting. This is the same separation that exists for standard Ethereum (Reth + Lighthouse) and for custom L1s (your Consensus impl + Malachite/CometBFT/etc.).',
                    },
                    {
                      question: 'You need to ship a centralized sequencer L1 as fast as possible. What 3 things does your sequencer code do per block?',
                      options: [
                        'Run 2f+1 vote collection, then sign, then broadcast.',
                        'Build the payload (pick + order txs), sign the resulting block hash (your authority proof), broadcast via Engine API to Reth + via P2P to other nodes.',
                        'Wait for validator votes, aggregate signatures, then commit.',
                        'Query a price oracle, settle margins, then create the block.',
                      ],
                      correctIndex: 1,
                      explanation: 'Single-leader BFT = no votes. Three jobs: build (via Engine API forkchoiceUpdated with PayloadAttributes), sign (your ECDSA signer over the block hash), broadcast (Engine API + P2P). ~100 lines of Rust per Lesson 10 §3.',
                    },
                    {
                      question: 'In Tendermint/HotStuff, the validator set is bounded (~20-100). **What architectural constraint** drives this bound?',
                      options: [
                        'Disk space — each validator stores chain state.',
                        'Communication complexity: PBFT is O(n²) messages per block; even HotStuff with threshold sigs is O(n) per round. Network bandwidth + latency cap n at ~100-200 in practice.',
                        'Token supply — there aren\'t enough tokens for more validators.',
                        'Legal — you can\'t have more than 100 entities in one protocol.',
                      ],
                      correctIndex: 1,
                      explanation: 'Network is the bottleneck. PBFT n² messages = 10k messages at n=100, 1M at n=1000. HotStuff O(n) helps but bandwidth + latency still cap the practical max. Hybrid PoS like Ethereum solves this by separating fork choice (every slot, sampling-based) from finality (every epoch, full participation).',
                    },
                    {
                      question: 'Why is **slashing** the load-bearing foundation of BFT economic security?',
                      options: [
                        'Slashing pays validators for running infrastructure.',
                        "Slashing makes attacks economically irrational: the cost of misbehavior (lost stake) exceeds the benefit of attack (extractable value). Without slashing, validators can vote conflicting messages with no consequence — the protocol's safety guarantee evaporates.",
                        'Slashing speeds up block production.',
                        "Slashing is a feature of the EVM, not consensus.",
                      ],
                      correctIndex: 1,
                      explanation: 'Cryptography proves misbehavior; slashing makes it costly. Without slashing, a Byzantine validator pays nothing for double-signing — the protocol\'s 3f+1 bound becomes meaningless. Slashing turns "they shouldn\'t double-sign" into "they cannot afford to double-sign."',
                    },
                    {
                      question: "Malachite separates Driver / VoteKeeper / RoundStateMachine. **What does this let you do** when embedding Malachite into a Reth-based L1?",
                      options: [
                        'Run Malachite on a different machine than Reth.',
                        'Implement only the `Context` trait (your block type, validator set, signature scheme) — Malachite handles all the Tendermint protocol logic (voting, quorums, view changes). This is the same pattern as revm\'s `Database` trait: you provide the substrate, the engine handles the protocol.',
                        'Use Malachite without writing any Rust code.',
                        "Skip the 2f+1 quorum check.",
                      ],
                      correctIndex: 1,
                      explanation: 'Malachite provides the protocol; your `Context` impl provides the chain-specific types. ~100 lines of integration code for a fully BFT-secured L1, compared to ~10000 lines if you wrote Tendermint yourself. This is the "use a Rust BFT engine" architectural win.',
                    },
                    {
                      question: 'Berachain ships **bera-reth** as a customized Reth distribution. **What percent of vanilla Reth do they actually change**?',
                      options: [
                        '~95% — Proof-of-Liquidity is a totally different chain.',
                        '~10% — most of Reth is reused. The customization is ~2000 lines: custom Consensus impl, custom executor hooks for liquidity rewards, custom chainspec, BLS-aware validator set tracking.',
                        "~50% — Reth's EVM has to be rewritten for PoL.",
                        '0% — bera-reth is just a config file.',
                      ],
                      correctIndex: 1,
                      explanation: "This is the headline of Expert Module 3 too: Reth-based chains are built by *extension*, not fork. bera-reth's diff against vanilla Reth is small but consensus-critical. Same pattern for Tempo when it ships its node crate.",
                    },
                    {
                      question: 'You\'re launching an L1. Day 0 consensus: single sequencer. **What\'s the realistic decentralization trajectory** over the first 2 years?',
                      options: [
                        'Stay single-sequencer indefinitely.',
                        "Single sequencer (Day 0) → 2-of-3 multisig sequencer (Month 3) → rotating proposers with ~10 validators (Month 12) → full BFT with 30+ validators and slashing (Year 2). Each step adds Byzantine fault tolerance progressively while preserving liveness.",
                        'Jump directly to 1000-validator PoS on Day 1.',
                        'Decentralization is a marketing concern, not a technical one.',
                      ],
                      correctIndex: 1,
                      explanation: 'Real L1s follow this trajectory: ship fast with trust, then progressively relax the trust assumption as TVL and ops mature. Hyperliquid, Tempo, every OP-Stack chain — all do versions of this. The protocol design lets you upgrade in place, but the consensus design must accommodate the trajectory from the start (e.g., header format should already include "validator set proof" even if you start with one signer).',
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
