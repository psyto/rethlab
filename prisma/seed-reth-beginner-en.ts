import { PrismaClient } from '@prisma/client';

export async function seedRethBeginnerEN(prisma: PrismaClient) {
  const tags = ['rust', 'ethereum', 'beginner', 'reth', 'revm', 'alloy'];

  await prisma.course.create({
    data: {
      slug: 'reth-beginner-en',
      title: 'Intro to Reth — Welcome to Rust Ethereum',
      description:
        'The on-ramp to the Rust Ethereum stack (Reth / Revm / Alloy). Eleven lessons: reading Ethereum as systems engineering, the four adversarial forces, the three-pillar split, comparison to Solana, the Reth vs Geth / Alloy vs ethers-rs substitution case, Rust environment setup, a quick reference, the first homework, and a Beginner final quiz. By the end you can move on to Fundamentals → Bridge to Intermediate → the three Intermediate courses.',
      difficulty: 'BEGINNER',
      duration: 125,
      xpReward: 230,
      track: 'reth-beginner',
      tags,
      isPublished: true,
      sortOrder: 100,
      locale: 'en',
      instructorName: 'RethLab',
      modules: {
        create: [
          {
            title: 'Why the Rust Ethereum Stack',
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: 'Lesson 0 — Ethereum as systems engineering — the mental model you\'ll need',
                  slug: 'ethereum-as-systems-engineering-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 12,
                  xpReward: 25,
                  content: `# Lesson 0 — Ethereum as systems engineering — the mental model you'll need

## Question

Most Ethereum onboarding treats it as a **separate magical world**. That framing works for dapp tutorials but breaks for reading Reth / Revm / Alloy source. **This curriculum reframes:** Ethereum = database + distributed system + compiler + network + concurrency runtime, **glued together by consensus**.

## Principle (minimum model)

- **Five subsystems.** Database (MDBX = B+tree, \`reth-mdbx\`) / Distributed system (consensus + P2P sync) / Compiler-VM (revm / revmc) / Network (\`reth-network\` devp2p) / Concurrency runtime (Tokio).
- **Each subsystem has decades of literature.** The bug classes (race conditions / DB deadlocks / TCP backpressure / JIT errors) are not Ethereum-specific. The shape of finding and fixing them is the same.
- **Skill compounds across the industry.** MDBX → Snowflake / PlanetScale / Neon. Tokio → Cloudflare / Discord / AWS. revm interpreter → TigerBeetle / general language runtimes. Ethereum-specific knowledge is **on top**; systems engineering is the substrate.
- **"Magic" framings to push back on.** "Smart contracts are special" (no — they're programs on a VM) / "state is special" (no — it's a snapshot KV store) / "consensus is special" (no — it's a known-trade-off algorithm) / "gas is special" (no — it's a metered resource budget).
- **Implication for reading source.** \`reth-mdbx\` B+tree → SQLite-family design. revm's 256-pointer table → CPython / JVM design. Peer scoring → BGP heritage. **The patterns you already know, applied to Ethereum** — not Ethereum's weirdness.

## Worked example + steps

# Ethereum as systems engineering — the mental model you'll need

Most introductions to Ethereum treat it as **its own thing**: blockchain magic, special primitives, a parallel universe of crypto-specific terminology. That framing serves dapp tutorials. It's a poor frame for reading Reth, Revm, and Alloy source.

**The frame that actually carries you through this curriculum**: Ethereum is **a database + a distributed system + a compiler + a networking stack + an OS-style concurrency runtime**, glued together by consensus. Each piece is a well-known systems-engineering problem with decades of literature. The "blockchain" part is the glue, not the substance.

This lesson is the mental model you'll need to carry. Read it once, and every Reth / Revm / Alloy lesson after this lands on something familiar.

## 1. The five subsystems

Reth's source tree decomposes cleanly into five systems-engineering disciplines:

| Subsystem | What it is | Where in Reth | Outside-Ethereum analog |
| :--- | :--- | :--- | :--- |
| **Database** | Persistent key-value store with snapshots, MVCC, crash recovery | \`reth-mdbx\` + \`reth-db\` (MDBX, a memory-mapped B+tree) | PostgreSQL's storage layer, RocksDB, LMDB |
| **Distributed system** | Multi-node state machine reaching agreement under partial failure | Consensus integration, P2P state sync, gossip | Raft, Paxos, Bitcoin's longest-chain, Cassandra |
| **Compiler / VM** | Bytecode interpreter; eventually a JIT/AOT compiler | revm (interpreter), revmc (JIT/AOT) | JVM, V8, CPython, LuaJIT |
| **Networking stack** | Custom TCP-based gossip protocol with peer scoring and DoS resistance | \`reth-network\` (devp2p), libp2p in alternative chains | BGP, BitTorrent's tracker layer, IRC |
| **Concurrency runtime** | Async I/O orchestration; thousands of in-flight tasks | Tokio (cooperatively scheduled futures) | Node.js's event loop, Go's goroutines, Erlang's BEAM |

Take any bug class you've seen in production at any company — a race condition, a database deadlock, a TCP backpressure issue, a JIT miscompile — and ask which Ethereum subsystem it could occur in. **All of them could, and all of them have.** Reth's CI catches database compaction stalls (database problem), reorg-handling races (distributed system problem), opcode-pricing bugs (compiler problem), peer-eclipse attacks (networking problem), and task starvation under load (concurrency runtime problem). **The bug classes are not Ethereum-specific.** The techniques to find and fix them aren't either.

## 2. Why this matters for reading source

When you open \`reth-mdbx\` and see "B+tree with copy-on-write pages and MVCC snapshots," you should recognize that **as a database design choice with 50 years of literature behind it**. Not as "the weird way Ethereum stores state." MDBX exists in Reth because the engineering team picked it for the same reasons SQLite uses similar designs: stable read latency under heavy write load, crash safety, embedded use.

When you open revm and see a stack-based interpreter that dispatches via a 256-slot function pointer table, you should recognize that **as a virtual-machine design choice from 1980s CPython and 1990s JVM literature**. Not as "EVM weirdness." The dispatch loop is faster than naive \`match\` for the same reason every interpreter built since 1990 uses some form of computed-goto or function-pointer table.

When you open \`reth-network\` and see "peer scoring with eviction on bad behaviour," you should recognize that **as a BGP-era distributed-systems pattern**. Not as "Ethereum-specific anti-DoS."

The reframing pays off everywhere. The lessons that follow do not say "this is OS scheduling theory applied to chain reorgs" out loud — but they're written knowing you have the frame.

## 3. The skills that compound

Because Ethereum is a composition of well-studied systems, the skills you build here **compound across the industry**:

| Skill you build reading Reth | Where else it applies |
| :--- | :--- |
| MDBX / B+tree storage design | Any database engineering role (Snowflake, PlanetScale, Neon, MongoDB) |
| Tokio async + backpressure | Every Rust networking project (Cloudflare, Discord, AWS internal services, Linkerd) |
| revm interpreter loop | Any VM / language runtime work (TigerBeetle, custom DSLs, smart-contract VMs beyond EVM) |
| Distributed-systems reasoning around reorgs | Database replication, consensus engineering, payment-rail design |
| Profiling, flamegraphs, cache locality | Performance engineering at any high-throughput company |

The "Ethereum engineer" who can only read Solidity has a narrow market. The systems engineer who happens to specialize in Ethereum has the *entire systems-engineering job market* as a fallback — and the Ethereum-specialist premium on top of it.

The 30-second answer for skeptics asking "what does learning Reth actually buy me if Ethereum doesn't take off?": a Rust-fluent systems engineer who has shipped against MDBX, Tokio, and a real distributed system has every infra-engineering job in the broader industry as a fallback — TigerBeetle, Cloudflare, Discord, PlanetScale, Neon, every cloud database team. The Ethereum-specific knowledge is upside; the underlying skills are the floor.

This is why the bet on Reth is not really a bet on Ethereum. It's a bet on **systems engineering as a discipline** — with Ethereum as a particularly interesting and lucrative application surface.

## 4. The "magic" you should reject

A few framings to actively *push back on* when you encounter them:

- **"Smart contracts are special."** They're not. They are programs running on a VM. The VM happens to be deterministic and gas-metered. Replace "smart contract" with "program" in your head; the lessons read more clearly.
- **"State is special."** It's not. It's a key-value store with snapshots. Replace "state" with "the database" in your head.
- **"Consensus is special."** It's not. It's an algorithm with well-known trade-offs (latency vs. liveness vs. throughput) studied for 40+ years. Replace "consensus" with "the protocol the nodes use to agree" in your head.
- **"Gas is special."** It's not. It's a resource budget with metering. Replace "gas" with "CPU and memory metering" in your head.

The lessons that follow assume you've made these substitutions. They use "EVM" and "state" and "consensus" because the literature does, but they treat them as **instances of general systems-engineering problems**, not as magical Ethereum-specific phenomena.

## What comes next

This is lesson 0 — the frame. Lesson 1 sharpens it by naming the 4 forces that distinguish Ethereum's specific instance from a generic systems-engineering deployment. The rest of Module 0 fills in the map: which projects (Reth, Revm, Alloy) implement which subsystems, why teams pick this stack over Geth / ethers-rs / Solana, and how Solidity or Solana experience carries over. After Module 0 you set up Rust and start reading.

Carry one thing forward: **whenever a future lesson uses "blockchain," "state," "consensus," or "gas," mentally substitute the systems-engineering equivalent.** The lessons are written knowing you've made that substitution. The frame is what makes the source readable.

## Summary (3 lines)

- Ethereum = DB + distributed system + compiler + network + concurrency, glued by consensus. Five subsystems with decades of literature; common bug classes.
- Betting on Reth = betting on **systems engineering** as a field. MDBX / Tokio / distributed systems / profiling skills compound across the industry.
- Reject the "blockchain special world" framing; read as known systems patterns applied. Next lesson: the four forces that make Ethereum specifically Ethereum.
`,
                },
                {
                  title: 'Lesson 1 — Beyond the 5 subsystems — the 4 forces that make Ethereum specific',
                  slug: 'ethereum-adversarial-forces-en',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 16,
                  xpReward: 25,
                  content: `# Lesson 1 — Beyond the 5 subsystems — the 4 forces that make Ethereum specific

## Question

L0 framed Ethereum as a composition of 5 subsystems. **So what makes it Ethereum?** Four forces — adversarial environment / consensus determinism / immutability / open membership — distinguish it from general systems engineering.

## Principle (minimum model)

- **Adversarial environment.** Attackers always exist + economically incentivised. Latency attacks / front-run / MEV / sandwich. Design assumes the worst case.
- **Consensus determinism.** Every node, given the same input, must produce **byte-for-byte the same output**. \`wrapping_add\` / no floats / fixed iteration order. The consensus contract.
- **Immutability.** Deployed contracts can't be patched (except \`SELFDESTRUCT\`, soon gone). Design for "this will exist forever".
- **Open membership.** Anyone can validate / run a node / deploy a contract. No permission system → sybil resistance + DoS defence + economic staking become mandatory.
- **4 forces × 5 subsystems determines every design choice.** Choosing MDBX = I/O perf + crash safety. revm's wrapping arithmetic = consensus determinism. \`reth-network\` peer scoring = adversarial. Tokio task budgets = DoS defence.

## Worked example + steps

# Beyond the 5 subsystems — the 4 forces that make Ethereum specific

The previous lesson loaded the on-ramp framing: **Ethereum is database + distributed system + compiler + networking + concurrency runtime, glued by consensus.** Every subsystem is a well-studied SE problem. The "blockchain" part is the glue, not the substance.

That framing is the right starting point. It buys you the right to read Reth source without "this is magic" reactions. But it's also a deliberate simplification — and if you carry only that framing into Inside REVM / Inside Reth, you'll miss why some of Ethereum's design choices look the way they do.

There are **4 forces** that distinguish Ethereum's *specific* instance of systems engineering from a generic one (think: a web2 backend running PostgreSQL + Tokio + a custom VM). Load them now. Each one shows up later in the curriculum as a specific lesson topic; this lesson is the map.

## Force 1: Adversarial environment

Paxos and Raft — the canonical distributed-system algorithms — assume nodes can fail (crash, become slow, partition) but are **not malicious**. The classic literature calls this Crash Fault Tolerance (CFT). Most production distributed systems (Spanner, Kafka, etcd) live in this regime: nodes belong to the same company, run the same code, and have no incentive to lie.

Ethereum doesn't get to make those assumptions. Nodes are operated by mutually distrustful parties, some of which actively try to break the system for profit. The literature for this regime is Byzantine Fault Tolerance (BFT) — and BFT is *qualitatively* harder than CFT. PBFT (1999) was a major academic milestone precisely because BFT in an asynchronous network had been considered nearly impossible.

The adversarial environment is the single load-bearing reason Ethereum's design looks weird in places:

- **Gas isn't just "CPU + memory metering."** It's the DoS-prevention mechanism. If gas were free or unmetered, an attacker could submit one transaction that loops forever and freeze every node. Gas pricing per opcode is a control-theory feedback loop — the price of each operation is calibrated against the cost of executing it adversarially.
- **Slashing isn't just a punishment.** It's the economic safety net that makes consensus work without a trusted authority. A validator who double-signs loses staked capital — the loss has to exceed the attack's profit for the system to be safe. This is game theory wired into the protocol, not a code-level check.
- **Consensus isn't just Paxos with hashes.** Casper FFG + LMD-GHOST, HotStuff, Tendermint — every modern BFT consensus has explicit economic and timing assumptions that classical Paxos doesn't make.

**Analog from outside crypto:** payment-processing networks like Visa run on top of standard distributed-systems substrate but add a fraud-detection layer because they assume merchants and cardholders can be adversarial. Ethereum is the same shape — except the fraud-detection layer *is* the consensus protocol itself, not a separate system bolted on top.

**Where this shows up in the curriculum:** Consensus Engineering tier (BFT, slashing, validator economics), Validator Operations tier (slashing detection, key management).

## Force 2: Cryptographic verifiability

Ethereum's "database" is technically MDBX (a B+tree with MVCC). But MDBX alone is just a key-value store. What makes Ethereum's database fundamentally different from a PostgreSQL deployment is one specific structural addition: a cryptographic accumulator — the Merkle Patricia Trie (MPT).

The MPT means every account, every storage slot, every contract code blob — every piece of state — is included in a single 32-byte hash called the *state root*. Given that 32-byte hash and a small Merkle proof, a third party can verify any individual piece of state **without trusting whoever served the proof, and without holding the database themselves**.

This is the load-bearing difference from PostgreSQL. A PostgreSQL deployment can tell you "Alice's balance is 100" — but you have to trust the database (or its operator) to believe it. Ethereum can tell you "Alice's balance is 100, here's a 1KB proof, verify it against the state root you already trust." The trust assumption shifts from the operator to the cryptography.

Practical consequences worth loading now:

- **Every state-changing operation costs more than a comparable PostgreSQL update.** The MPT has to be re-hashed up to the root on every change. This is why \`SSTORE\` costs 20,000 gas while \`MLOAD\` costs 3.
- **Light clients are possible.** A phone-sized client that doesn't hold the full database can still verify chain state, because it only needs the state root + proofs. This is a structural property of the MPT.
- **Stateless verification is possible.** Validators don't need to hold the full state — they need access to proofs for whatever transactions they're verifying. Active area of protocol research.

**Analog from outside crypto:** Git's content-addressed storage (every commit references its tree via hash), ZFS's Merkle-tree integrity checks, IPFS's content addressing. All applications of the same idea — *the database's contents are cryptographically committed, so any piece can be proven without holding the whole.*

**Where this shows up in the curriculum:** Expert tier (Merkle Patricia Trie & state proofs lesson), Cross-chain Bridges (light clients as bridge verification primitives), Stateless Ethereum.

## Force 3: Transaction ordering as a market

In a standard distributed system — Kafka, a payment queue, a CDC pipeline — transaction order is an implementation detail. The system picks an order (FIFO, partition-key based, timestamp), and that's the end of it.

Ethereum can't make this assumption. Every block has hundreds to thousands of transactions competing for the same scarce resources (block space, storage slots, AMM liquidity). Which transactions go first inside a block has direct monetary value — front-running a large swap, sandwich-attacking a price-impact order, capturing arbitrage between DEX pools. This value has a name: **MEV (Maximal Extractable Value)**.

The result is that transaction *ordering itself* becomes its own systems-engineering layer, with its own pipeline:

- **Mempool** — transactions wait here, visible to everyone watching
- **Searchers** — scan the mempool for profitable orderings, submit bundles
- **Builders** — assemble blocks from searcher bundles + public mempool, optimizing for total fee + MEV
- **Relays** — sit between builders and validators, distributing blocks
- **Validators** — pick the most profitable block, sign it, propose it

That's 5 distinct components, each with its own performance characteristics, trust assumptions, and failure modes. None of them existed in 2015. They emerged because the adversarial environment (Force 1) + a public mempool + per-block scarce resources made transaction ordering economically valuable.

**Analog from outside crypto:** high-frequency trading order routing (which exchange to send the order to, at what time), exchange matching engine design, ad-auction pipelines (header bidding, programmatic ad exchanges). All shapes of *ordering matters, who orders has power, ordering becomes its own optimized layer.*

**Where this shows up in the curriculum:** Building tier (MEV searcher app, frontrun-resistant order router capstone), Expert MEV in production.

## Force 4: Live system migration

Standard distributed systems handle schema migrations and rule changes by stopping the world, running the migration, and restarting. Kafka clusters get rolling upgrades with two minutes of degraded throughput. PostgreSQL gets a maintenance window. Even strict 24/7 systems like Visa coordinate upgrades over hours with rollback plans.

Ethereum can't do that. There's no single operator who can call a maintenance window. The chain has to keep producing blocks every 12 seconds while every node — operated by thousands of independent parties — simultaneously switches to new consensus rules at one specific block height. This is **hot-swap migration with zero downtime, coordinated across mutually distrustful operators.**

The mechanism: every Reth/Revm version carries the entire history of Ethereum's consensus rules inside one binary. A field called \`spec_id\` (or equivalent) selects which rules apply at any given block height. When the chain reaches the activation height of a new hard fork, every node simultaneously switches its rule set. Validators who haven't upgraded fall off the canonical chain; validators who have upgraded continue.

This is why Reth/Revm source has so many \`match spec_id\` and \`if hardfork >=\` branches. Every line of code that touches a consensus-affecting behavior has to know about every hard fork that ever changed that behavior. The code looks complex because it carries the full historical specification.

**Analog from outside crypto:** spacecraft computer firmware updates (you can't physically reach the satellite, you must update in flight), telephone-network protocol upgrades (the AT&T transition from analog to SS7 happened while every call kept connecting), Visa's payment-network hard forks (chip cards, contactless, tokenization — all coordinated upgrades across millions of merchant terminals with no downtime).

**Where this shows up in the curriculum:** Expert tier (Custom ChainSpec — fork, genesis, precompile schedule; production Reth fork operations).

## The updated mental model

Carry both lessons forward:

**5 subsystems** (from the previous lesson):
- Database, distributed system, compiler/VM, networking, concurrency runtime

**4 forces** (this lesson):
- Adversarial environment, cryptographic verifiability, transaction ordering as a market, live system migration

The 5 subsystems tell you *what Ethereum is made of*. The 4 forces tell you *why those subsystems look the way they look*.

When you read Reth and see code that doesn't fit the generic SE pattern — a weird gas-pricing constant, a Merkle re-hash on every storage write, a payload builder with private orderflow handling, a 14-branch \`match spec_id\` — one of these 4 forces is the reason.

**Once you have both halves of the model, you can stop treating Ethereum's specifics as "blockchain magic."** The 5 subsystems give you the SE substrate; the 4 forces give you the constraints that shape it. Together they're enough to read Reth/Revm/Alloy without either failure mode — "this is magic" or "this is just Paxos with extra steps."

## Where you'll meet each force again

| Force | Concrete curriculum touchpoints |
| --- | --- |
| **Adversarial environment** | Consensus Engineering (BFT, validator economics, slashing), Validator Operations (slashing detection, MPC keys) |
| **Cryptographic verifiability** | Expert MPT lesson, Cross-chain Bridges (light clients), Stateless Ethereum |
| **Transaction ordering as a market** | Building tier (MEV searcher, frontrun-resistant router capstone), Expert MEV in production |
| **Live system migration** | Expert Custom ChainSpec, Expert Reth fork operations, hardfork-specific code paths inside Inside Revm and Inside Reth |

The on-ramp framing alone is enough to start reading. These 4 forces are what make the framing sharp. Both lessons are short on purpose — most of the substance lives in the courses they map to.

## Summary (3 lines)

- 4 forces = adversarial environment + consensus determinism + immutability + open membership. These distinguish Ethereum from general systems engineering.
- 4 forces × 5 subsystems product determines every design choice — wrapping arithmetic, peer scoring, task budgets, MDBX choice all fall out.
- Next lesson: the three-pillar role split (Reth / Revm / Alloy) and why this stack is worth learning.
`,
                },
                {
                  title: 'Lesson 2 — Why learn Reth, Revm, and Alloy?',
                  slug: 'why-rust-ethereum-stack-en',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 10,
                  xpReward: 20,
                  content: `# Lesson 2 — Why learn Reth, Revm, and Alloy?

## Question

**Reth / Revm / Alloy = the Rust Ethereum stack.** Newer than Geth (Go) / ethers-rs, still propagating across the ecosystem. **Why learn it now?**

## Principle (minimum model)

- **Industry trend.** Major perp DEX (Hyperliquid, $300 B+/year), rollups (OP / Tempo / Berachain), MEV infra (Flashbots) have adopted Rust EVM. The job market is moving here.
- **Performance + safety.** Rust ownership + zero-cost abstractions + parallelism → clearly faster than Geth in benchmarks + memory safety eliminates a whole class of bug.
- **Modular design.** Reth is SDK-extensible. Revm is embeddable as a library. Alloy is a type foundation for dapps / indexers. All three are componentised.
- **Active community + good docs.** Paradigm-centred development. Source is readable; commit history is a learning resource. Easy to ask on Discord / GitHub.
- **Career compounding.** Rust + Ethereum + systems = rare in the job market. Fallback options (TigerBeetle / Cloudflare / Discord) keep the risk low.

## Worked example + steps

# Why learn Reth, Revm, and Alloy?


Take a look at the most performant chains being built today — Hyperliquid, Tempo, Monad, Berachain — and you'll find a common pattern: **a Rust implementation of the Ethereum stack**, namely **Reth, Revm, and Alloy**.

## What's the deal?

| | Geth (Go) | Reth + Revm (Rust) |
| :--- | :--- | :--- |
| **Language** | Go | **Rust (memory-safe + fast)** |
| **Design** | Monolithic | **Modular (usable as building blocks)** |
| **Adoption** | Most existing nodes | **App-chains, L2s, MEV infra** |

The decisive property is **modularity**. Reth is not just a node binary — it's an SDK for building blockchains.

## Why now?

- **Hyperliquid's HyperEVM** and **Tempo** use Revm internally
- **Foundry** — the standard Solidity toolkit — runs on Revm
- **OP-Reth** (Optimism) and most **zkEVMs** are built on Revm

In other words, this stack is becoming the **lingua franca of next-gen Ethereum infra**.

## Goals for this course

- Understand the distinct roles of Reth, Revm, and Alloy
- Be able to explain in your own words why this stack is winning
- Set up Rust, write your first program, and graduate to the Fundamentals tier

By the end, you'll have "I know some Rust and I know what these projects do" — enough to start using Alloy directly in the Fundamentals course.

## Summary (3 lines)

- Industry is moving to the Rust EVM stack (Hyperliquid / OP / Tempo / Berachain / Flashbots). Newer than Geth / ethers-rs; growing job market.
- Performance + safety + modular design + active community = high learning ROI. Rust + Ethereum + systems = career compounding with low downside.
- Next lesson: the three-pillar role split (Reth full node / Revm execution engine / Alloy type foundation).
`,
                },
                {
                  title: 'Lesson 3 — Reth, Revm, Alloy — three pillars',
                  slug: 'three-pillars-en',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 10,
                  xpReward: 20,
                  content: `# Lesson 3 — Reth, Revm, Alloy — three pillars

## Question

**Three projects, three roles.** Reth = full node, Revm = execution engine, Alloy = types + RPC + signers (a library set). **Which layer does each fill, and how do they depend on each other?**

## Principle (minimum model)

- **Reth = the full node (top layer).** P2P + DB + consensus integration + EVM execution + RPC server. A complete product; users run a binary.
- **Revm = the execution engine (middle layer).** An EVM bytecode interpreter; doesn't carry state — it asks for state via the Database trait. Embedded in Reth / Foundry / Hyperliquid / Tempo.
- **Alloy = the type foundation (bottom layer).** Primitives like \`Address\` / \`U256\` / \`B256\`. \`Provider\` for RPC. \`Signer\` for signatures. The substrate that dapps / indexers / MEV bots build on. Reth and Revm both depend on Alloy types.
- **Dependency direction.** Alloy ← Revm ← Reth. Alloy is the lowest; Reth is the highest; each can be used independently.
- **Learning order.** Beginner = touch all three lightly → Intermediate (Inside Revm / Inside Reth / Inside Alloy) for the deep dive. Order is free; the dependency-order recommendation is Alloy → Revm → Reth.

## Worked example + steps

# Reth, Revm, Alloy — three pillars


These three names get muddled all the time, but they play very different roles. The cleanest analogy: **building a car**.

| Project | Role | Analogy |
| :--- | :--- | :--- |
| **Alloy** | Library suite (types, signing, RPC) | Engine, tires, screws |
| **Revm** | EVM execution engine | Combustion chamber |
| **Reth** | Full node implementation | The finished car |

## Direction of dependency

- **Reth** depends on **Alloy** and **Revm** internally.
- "Learning Reth" automatically means touching Alloy and Revm.

\`\`\`mermaid
graph TD
    Reth["Reth — full node"]
    Revm["Revm — EVM execution engine"]
    Alloy["Alloy — primitives, signing, RPC"]
    Reth -->|uses| Revm
    Reth -->|uses| Alloy
    Revm -->|uses| Alloy
\`\`\`

## What each one is for

### Alloy (you'll touch this most often)
- Primitives like \`Address\`, \`U256\`
- Signing via \`PrivateKeySigner\` (EIP-191, EIP-712, etc.)
- JSON-RPC clients via \`Provider\`
- The successor to \`ethers-rs\`

### Revm
- Smart contract **simulation** (compute outcomes before paying gas)
- Custom execution engines (custom opcodes, custom gas)
- High-speed tracing and backtesting

### Reth
- Run a stock Ethereum full node
- Hook into the execution loop with **ExEx (Execution Extensions)**
- Use as the foundation for your own App-chain

## Where Reth fits in the EVM client landscape

Reth is **not the only Ethereum execution client** — and not the dominant one yet. Per [clientdiversity.org](https://clientdiversity.org/) (May 2026):

| Client | Approx. share | Language |
| :--- | :--- | :--- |
| **Geth** | ~50% | Go |
| **Nethermind** | ~25% | C# |
| **Besu** | ~9% | Java |
| **Reth** | **~7-12%** | **Rust** |
| **Erigon** | ~7% | Go |

Two things follow from this picture:

1. **Reth is emerging, not dominant.** It grew from <1% at its 2023 release to today's ~7-12% in three years — a fast trajectory, but Geth still serves the majority of mainnet RPC calls you make. **The Alloy code you write will mostly talk to Geth-served chains in production.** That's fine — Alloy speaks to any execution client over JSON-RPC.

2. **Revm-based simulation needs to match what production clients do.** When you run a transaction in a local Revm fork (the pattern you'll use in Intermediate + Building tiers), the result has to match what a Geth or Nethermind node would produce for the same transaction. This usually just works — Revm follows the EVM spec — but the discipline of **validating Revm against a non-Revm provider** is a production must. The Building tier capstone covers this.

So when you hear "the Rust EVM stack," read it as **emerging + extensible**, not as "winner take all." The reason Paradigm + Hyperliquid + Tempo build on Reth/Revm is what they enable (modularity, embeddability, performance), not market share.

## Suggested learning order

> **Alloy → Revm → Reth**
>
> Going micro (types) → middle (execution) → macro (whole node) is the path of least friction.

The next tier of this course (**Fundamentals**) starts by getting your hands on Alloy directly. But before we set up Rust, one objection that always comes up is worth addressing head-on: *"Solana is also Rust — why bother with EVM at all?"* That's the next lesson.

## Summary (3 lines)

- Three projects: Reth full node (top, binary) + Revm execution engine (middle, library) + Alloy type foundation (bottom, primitives + RPC + Signer).
- Dependency direction: Alloy ← Revm ← Reth. Each can be used independently. Hyperliquid / Foundry embed Revm; dapps / indexers use Alloy.
- Deep dive in the three Intermediate courses. Recommended order: Alloy → Revm → Reth. Next lesson: why not Solana.
`,
                },
                {
                  title: 'Lesson 4 — Why not just use Solana?',
                  slug: 'why-not-solana-en',
                  type: 'CONTENT',
                  sortOrder: 4,
                  duration: 8,
                  xpReward: 15,
                  content: `# Lesson 4 — Why not just use Solana?

## Question

**Solana is also a Rust-native high-performance chain.** If "Rust + chain" is the lens, Solana is a candidate. **Why pick the Reth stack?** Four practical reasons.

## Principle (minimum model)

- **EVM ecosystem carries over.** Wallets (MetaMask / Rabby), tools (Foundry / Hardhat), DEX / bridges / indexers / oracles are all EVM-compatible. Nothing to rebuild from scratch.
- **Infra layer is customisable.** Reth SDK lets you swap precompiles / state machine / consensus. Hyperliquid built a perp L1 on top; Solana is monolithic and restricts how much you can modify.
- **EVM knowledge applies across the industry.** EVM-compatible chains (OP / Base / Arbitrum / Polygon / BSC / Avalanche / Berachain / Tempo / ...) all use the same skills. Solana knowledge is Solana-only.
- **Rust safety + performance is shared.** Both Solana and the Reth stack are Rust → same strengths (memory safety / speed / parallelism). Ethereum's wrapping arithmetic + 256-bit integers + consensus determinism also play to Rust's strengths.
- **Caveat.** Raw TPS sometimes favours Solana. The Reth-stack edge is **customisability + ecosystem carry-over + Rust safety** — "always faster" is not the claim.

## Worked example + steps

# Why not just use Solana?


A reasonable question: "Solana is fast and also Rust — why bother with Rust EVM at all?"

The honest answer is **it depends on what you want to build**, but here's the comparison.

## Side-by-side

| | **Reth stack (Rust EVM)** | **Solana (SVM)** |
| :--- | :--- | :--- |
| **Language** | Rust (infra) + Solidity | Rust (infra + contracts) |
| **Execution model** | Sequential / Parallel EVM | **Fully parallel (Sealevel)** |
| **Learning curve** | Medium-high | **Very high** (custom memory model) |
| **Future flexibility** | **Applies across EVM chains** | Solana-specific |
| **Adopters** | Hyperliquid, Tempo, Monad, Berachain | Solana, Pyth, Jito, Jupiter |

## Why Rust EVM tends to win in 2026

1. **EVM liquidity**: existing wallets, tooling, and developer mindshare carry over
2. **Modularity**: you can reshape the infra to fit your app (Hyperliquid did exactly this with HyperBFT + HyperEVM)
3. **Vertical integration**: optimize app and execution layer together

## How to choose

If your priority is **trend, breadth, and reusability**, Rust EVM wins. Solana is still excellent, but Reth + Revm offers the unique combination of "EVM developer experience × Rust performance."

## The 2026 reality — not "either/or" but "intersection"

The picture has gotten more interesting. **Tempo** — a Reth-based payments abstraction layer — is emerging as the connective tissue between Stripe (fiat-side distribution) and Solana (crypto-side distribution). When Meta launched USDC payments, they didn't build their own chain — they composed existing networks (Solana + Stripe). Stripe is a central player in Tempo, so the structural connection Meta — Stripe — Tempo — Solana is forming.

So the question shifts from "should I learn Solana or Rust EVM" to **"which distribution do I want to bet on."** The Rust EVM side (this course) covers: app-chains (Hyperliquid), stablecoin payments (Tempo), L2s (Base / OP-Reth) — Reth is becoming the foundation for "Stripe-of-crypto"–style infrastructure.

> **Key point**: Stablecoins are the base currency of DeFi. Owning a stablecoin payment rail also means opening the path to DeFi onboarding later. Today, Stripe / Tempo abstract crypto away to onboard TradFi users — but lending, swap, and perps will eventually layer on top of that rail. Reth/Revm engineers who can read **both the rail and the protocol** sit in scarce-talent territory.

## Next up

Now that you can place these projects on a map, let's get Rust running on your machine.

## Summary (3 lines)

- Four practical edges: EVM ecosystem carry-over + customisable infra (Reth SDK lets Hyperliquid build a perp L1) + EVM knowledge transferability + shared Rust strengths.
- Hyperliquid is the SDK case study; Solana is monolithic with limited customisation. EVM knowledge applies to OP / Base / Arbitrum / etc.
- Raw TPS sometimes favours Solana; the Reth-stack edge is customisability + ecosystem + safety. Next: what carries over from Solana / Anchor for that audience.
`,
                },
                {
                  title: 'Lesson 5 — From Solana / Anchor to Reth — what carries over',
                  slug: 'solana-to-reth-en',
                  type: 'CONTENT',
                  sortOrder: 5,
                  duration: 12,
                  xpReward: 20,
                  content: `# Lesson 5 — From Solana / Anchor to Reth — what carries over

## Question

For Solana / Anchor developers (skip if none). **What carries over from Rust + Anchor to the Reth stack** — and what doesn't. The account model is fundamentally different, so the mental model needs to switch.

## Principle (minimum model)

- **Rust skills carry 100 %.** Ownership / borrowing / Result / async / traits / macros — same language. At the language level, nothing changes.
- **Account model is fundamentally different.** Solana = flat per-account map + transactions pre-declare read/write accounts. Ethereum = per-contract storage trie + arbitrary SLOAD / SSTORE.
- **Anchor \`#[account]\` macro → Solidity storage layout.** Both declare an account's structure; expression differs, intent is the same.
- **Solana CPI (Cross-Program Invocation) → Ethereum CALL / DELEGATECALL.** Both are inter-contract calls. Solana specifies the account list explicitly; Ethereum uses msg.sender + borrowing.
- **Parallel-execution mental model.** Solana = static parallelism (txs pre-declare read/write sets). Ethereum = block-stm optimistic parallelism (collision detection + replay). Both reward Rust concurrency skills.
- **Programs vs smart contracts: upgradability differs.** Solana programs are upgradable via authority. Solidity contracts are immutable (proxy pattern for pseudo-upgrade). Design assumptions differ.

## Worked example + steps

# From Solana / Anchor to Reth — what carries over (skip if not from Solana)


> 📌 **Audience.** This lesson is **only useful if you've shipped on Solana** — Anchor program, Jito MEV bot, Solana program tests, Firedancer contributor, anything with \`solana-program\` or \`anchor-lang\`. If you've never touched Solana, skip to *Set Up Rust*. Nothing in the rest of the curriculum depends on this lesson.

Most curricula assume you're coming from Solidity. You're not — you're coming from Rust on a fundamentally different runtime model. This lesson is the translation layer.

## 1. What carries over (a lot, actually)

Your hard-won skills on the Solana side **all stay valuable** in the Rust EVM stack:

| Skill from Solana | How it lands here |
| :--- | :--- |
| **Rust ownership / lifetimes / async** | Identical. You skip ~3 weeks of "Rust onboarding" that Solidity migrants need. |
| **Reading low-level systems code** | Reth and Revm are denser than \`solana-program\`, but the *reading discipline* is the same — work outside in, trust trait shapes, verify against tests. |
| **Mental model for "engine you don't own"** | If you've patched Firedancer or read Jito's relayer source, the Reth fork model is immediately legible. |
| **Comfort with parallel execution** | Sealevel made you think about concurrent state access. Reth's stage pipeline runs different concerns concurrently; the muscle transfers. |
| **\`cargo\` toolchain fluency** | Same. Workspaces, features, \`cargo expand\` for macro debugging — all of it. |

The honest framing: **your Rust skills are an asset most EVM-side engineers don't have**. The curriculum's harder section — *Bridge to Intermediate*'s Rust module — is mostly review for you.

## 2. What's structurally different

The model gap that *does* matter:

| Concept | Solana | Reth / EVM |
| :--- | :--- | :--- |
| **State** | Per-account, declared in advance (account model) | Per-contract storage, dynamic (\`SLOAD\` / \`SSTORE\` on slot keys) |
| **Parallelism** | Per-account, runtime-scheduled (Sealevel) | Sequential within a block; ExEx / Reth SDK lets you add parallel components |
| **Programs** | One global program, accounts passed in | Each contract is its own deployed bytecode with its own storage |
| **Compute units** | Linear gas-like budget per tx | EVM gas with non-trivial cost curves per opcode |
| **Verification** | BPF VM with custom syscalls | EVM with EOF + spec-tests |
| **Wallet / signer** | Ed25519 throughout | secp256k1 mostly, eventually post-quantum via account abstraction |

The biggest mental flip: **storage is per-contract, not per-account**. In Solana you pass the account that holds the state; in EVM the contract *is* the state. Read this carefully when you reach Inside Revm's \`Database\` trait — that trait is the EVM-side answer to "what AccountInfo do I touch?"

A concrete example: a Solana program that updates per-user counters has one account per user. The EVM equivalent is a \`mapping(address => uint256) counter\` *inside* the contract. The contract owns the slot keys; each user's counter lives at \`keccak256(user_address . slot)\`. Same problem, different model — Solana spreads state across many accounts, EVM packs it into one contract's storage trie.

## 3. Where the two stacks meet: HyperEVM, Tempo

These chains are **specifically built to bring Solana-style performance to EVM semantics**. They are the natural landing zone for a Solana migrant:

- **HyperEVM (Hyperliquid)**: Reth fork with HyperBFT consensus. The execution layer runs EVM bytecode at performance levels Solana engineers expect. Reading HyperEVM means you carry your Solana performance intuitions into EVM territory — this is exactly what Inside Reth + the L1 Architect tier prepare you for.
- **Tempo**: a Reth-based payments chain backed by Stripe. Designed for high-throughput stablecoin transfers. Solana's payment-rail experience (Stripe's earlier Solana integration was the predecessor) translates directly.
- **MegaETH**: another Reth-based high-performance chain pursuing Solana-like UX.

**The Solana → Reth path is not a downgrade.** It's a move from a chain-specific runtime to an execution engine that the next generation of high-performance L1s and L2s are building on. The Rust EVM stack is where your skills compound.

## 4. The specific cultural difference: source-first vs abstraction-first

This is the point Solana engineers tell us about most:

- **Anchor**: heavy abstraction. The framework hides the SVM, hides the serialization, hides the account validation. You write \`#[derive(Accounts)]\` and trust it. When something breaks, the trail to the actual SVM behaviour is long.
- **Firedancer / Jito**: source-first. You read the C, you read the relayer, you patch and rebuild. Excellent culture, narrow access (Firedancer's contribution funnel is effectively closed; Jito is open but Solana-specific).
- **Reth / Revm / Foundry**: source-first by *design*, with *broad* contribution access. The maintainers explicitly publish "read this, ship a custom node" patterns. This is the discipline RethLab is built around.

If Anchor's abstraction felt opaque to you, RethLab will feel like home. If you enjoyed reading Firedancer / Jito but wanted a broader application surface, the Rust EVM stack is the larger version of that.

## 5. The curriculum, mapped for you

Given your Rust background, here's an honest recommendation on which lessons you can skip / accelerate:

| Section | Recommendation |
| :--- | :--- |
| **Beginner — *Set Up Rust*** | Skim. You have \`rustup\`. |
| **Fundamentals — Rust async / traits / generics** | Skim. You have this. |
| **Fundamentals — EVM concepts** | **Read carefully.** This is where your model differs from Solana. |
| **Bridge to Intermediate — EVM at the bytes level** | **Read carefully.** Dispatch loop, gas, call frames — all new. |
| **Bridge to Intermediate — Rust for source-reading** | Skim. Generics, Arc, unsafe, macros — review for you. |
| **Inside Revm / Inside Reth / Inside Alloy** | **Read carefully.** The payoff. |
| **L1 Architecture (Advanced) tier** | **The reason you came.** Especially Consensus + Cross-Chain Bridges. |
| **Expert + Building** | The output. Apply what you read. |

## 6. The bet you're making

Solana's runtime is good but Solana-specific. Reth is the **substrate for many chains** — Hyperliquid, Tempo, OP-Reth, MegaETH, Berachain — and the count keeps growing. The Rust EVM stack is where your skills compound across the broader L1/L2 surface, not just one chain.

This isn't a takedown of Solana. It's the observation that **the engineers who can read Reth are scarcer than the engineers who can read Solana programs, and the chains betting on Reth are growing fast**. Your Solana-trained Rust intuitions land you in that scarce-talent niche faster than anyone migrating from Solidity.

## Next up

You can either skip *Set Up Rust* and head straight to *Fundamentals* (Rust toolchain is yours already), or skim *Set Up Rust* to install Foundry / Anvil if you haven't seen those tools.

## Summary (3 lines)

- Rust language level carries 100 %. The account model (flat vs storage trie) is the switch. Anchor → Solidity layout / CPI → CALL.
- Parallel execution: Solana static (declared) vs Ethereum block-stm optimistic. Both leverage Rust concurrency skills.
- Solana experience transfers ~80 % via Rust competence. Next: substitution case (Reth vs Geth / Alloy vs ethers-rs).
`,
                },
                {
                  title: 'Lesson 6 — Reth vs Geth / Alloy vs ethers-rs — the substitution case',
                  slug: 'substitution-case-en',
                  type: 'CONTENT',
                  sortOrder: 6,
                  duration: 10,
                  xpReward: 20,
                  content: `# Lesson 6 — Reth vs Geth / Alloy vs ethers-rs — the substitution case

## Question

Reth targets to replace Geth (Go). Alloy targets to replace ethers-rs (the earlier Rust library). **Why replace existing things?** Performance + design + maintenance — three axes that justify the substitution.

## Principle (minimum model)

- **Reth vs Geth — performance.** Reth syncs 2–3× faster than Geth (measured). Rust ownership + zero-cost abstractions + parallelism are the reason; memory footprint is also smaller.
- **Reth vs Geth — modularity.** Reth SDK turns a full node into an SDK. Precompiles / state machine / consensus are all swappable → Hyperliquid built a perp-specific L1 on top; Tempo built a settlement L1. Geth is monolithic; modification is bounded.
- **Alloy vs ethers-rs — design.** Alloy is Network-generic (Ethereum / Optimism / custom L2 all under one type system) + Provider trait + Filler stacking. ethers-rs is Ethereum-fixed + internally hardcoded; extensibility differs structurally.
- **Alloy vs ethers-rs — maintenance.** ethers-rs stalled when its maintainer joined the Foundry team. Alloy is actively developed by Paradigm (commit frequency + issue response); the ecosystem is migrating.
- **Substitution timing.** New projects → Reth + Alloy recommended. Existing Geth / ethers-rs projects → migrate based on cost-benefit; Foundry / Hyperliquid / major rollups have already migrated.

## Worked example + steps

# Reth vs Geth / Alloy vs ethers-rs — the substitution case


You've placed the projects on a map. Now the next-most-asked question: **why are teams actively migrating off the older alternatives?** Geth has run Ethereum for a decade. ethers-rs was the Rust Ethereum library for years. Yet new infrastructure is being built on Reth and Alloy. This lesson is why — substitution by substitution.

## 1. Reth vs Geth

Geth (Go-Ethereum) is the original execution client. It's run mainnet since 2015, holds ~40–50% of execution client share, and the team behind it is excellent. **Reth is not "Geth but better."** It's a different design that earns its place by what Geth structurally can't do.

| Property | Geth | Reth | Why it matters |
| :--- | :--- | :--- | :--- |
| **Language** | Go | Rust | Cargo workspaces let you import revm as a library and use it standalone — Geth's execution engine is welded to the node and can't be reused. |
| **Architecture** | Tightly coupled | Modular crates (revm, alloy, reth-stages, reth-network, reth-rpc, etc.) | You can fork *one* crate (e.g., custom executor) without forking the entire node — central to the App-chain / L1 fork pattern. |
| **State storage** | LevelDB-based, evolving | MDBX (memory-mapped B+tree) | Stable read latency under heavy compaction. Geth has historically struggled with compaction stalls on archive nodes. |
| **Execution engine** | go-ethereum's interpreter | revm (Rust, library-first) | revm is reused by Foundry, Hyperliquid's HyperEVM, every Rust-based MEV stack — Geth's interpreter has no consumers outside Geth itself. |
| **Sync strategy** | Snap sync | Staged sync (10-stage pipeline) | Staged sync amortizes I/O across whole batches; faster initial sync and easier to extend with custom stages. |
| **Extension API** | None publicly maintained | ExEx (Execution Extensions) — in-process Rust hooks | Build node-speed indexers, MEV bots, risk engines *inside* the node, no RPC round trips. Geth has nothing equivalent. |
| **Chain forking** | Hard (entire fork-of-Geth) | Easy (Reth SDK: swap one component, keep the rest) | Hyperliquid's HyperEVM, Tempo, MegaETH, Base (OP-Reth), Berachain all use this pattern. |
| **Reuse footprint** | Geth's code is used by Geth | Reth's components (revm, alloy, reth-* crates) are reused by 100+ projects | Every Rust EVM tool you'll touch is built on top of one of these crates. |

Concretely: a team shipping a payments-priority L1 with custom transaction ordering forks Reth — and they don't even fork the whole thing. They depend on Reth's crates and replace only the \`Pool\` and \`Payload\` components. With Geth they'd fork the whole codebase, accept the rebase tax forever, and inherit a 200K-line surface they don't want to maintain. This is exactly what Tempo does, and what every other Reth-based L1 in the table from the previous lesson does.

**Reth wasn't built to dethrone Geth.** It was built to be the *substrate* the next generation of chains builds on. That's a different category.

## 2. Alloy vs ethers-rs

ethers-rs was *the* Rust Ethereum library from ~2020 to 2024. Then in mid-2024, ethers-rs's maintainer (Georgios Konstantopoulos / Paradigm) **deprecated it in favour of Alloy**. The migration wasn't gradual or aesthetic — it was a deliberate redesign with specific properties ethers-rs structurally couldn't deliver.

| Property | ethers-rs | Alloy | Why it matters |
| :--- | :--- | :--- | :--- |
| **Modularity** | Monolithic crates | Many small crates (alloy-provider, alloy-network, alloy-primitives, alloy-signer, alloy-rpc-types, ...) | You pull in only what you need; Cargo bloat shrinks dramatically. |
| **Async style** | \`async-trait\` (allocates Box per call) | Native async traits + ProviderCall (zero-cost) | Hot paths (MEV, RPC servers) measurably benefit from no per-call allocation. |
| **Multi-chain** | Ethereum-only types | \`Network\` trait abstracts chain primitives | Same Provider code works on Ethereum, Optimism, custom L2s — Inside Alloy walks this. |
| **Type ergonomics** | Bespoke types, separate from revm | Uses revm's \`Address\`, \`U256\`, \`B256\` directly | One set of types across alloy + revm + reth. No conversion boilerplate. |
| **Wallet / signer composability** | Coupled to one Provider design | \`Signer\` + \`Filler\` traits compose via \`ProviderBuilder\` | Custom signing, nonce management, gas estimation layer cleanly. Inside Alloy's Signer chain teaches this. |
| **Procedural macros (\`sol!\`)** | External crate, looser integration | First-class, used throughout alloy | Define Solidity types in Rust at compile time; no manual ABI structs. Used in every Rust Solidity-interop project. |
| **Maintainership** | One person at Paradigm, time-limited | Funded Paradigm project + community | Active development, fast PR turnaround, clear roadmap. |

If you're writing a new MEV searcher in 2026, you'd choose Alloy because (a) you share types with revm (and your fork simulation lives in revm), (b) you can compose your own \`Signer\` with cloud KMS or hardware without rewriting the Provider, (c) your code runs on Optimism / Base / any Reth-based L2 with one type parameter change, and (d) ethers-rs no longer receives bug fixes from Paradigm. **Inertia is the only reason to stick with ethers-rs**, and inertia gets weaker every quarter.

## 3. The pattern across both substitutions

Geth and ethers-rs are not bad. They're products of an earlier moment in the Rust EVM ecosystem — when the priority was "make it work" rather than "make it composable across N downstream projects."

**Reth and Alloy share a deliberate design choice: composability over completeness.** Both expose internal pieces as library crates that downstream projects can mix, match, and replace. Geth and ethers-rs were designed as products to be consumed; Reth and Alloy are designed as substrates to be extended.

This is the structural reason the rest of this curriculum exists. **The lessons that come next — Inside Revm, Inside Reth, Inside Alloy — teach you to read the substrate.** Once you can read it, you can build on it. That's the leverage Geth and ethers-rs structurally couldn't offer.

Two reads of the same pattern: payments-priority L1s fork Reth instead of Geth because Reth's crates compose; new MEV searchers pick Alloy over ethers-rs because Alloy shares types with revm and stays maintained. Both are decisions about substrates versus products — keep that lens for the rest of the curriculum.

## Next up

With this lesson, Module 0 is complete: the systems-engineering frame from lesson 0, the project map (Reth / Revm / Alloy), the Solana / Solidity onramps, and now the substitution case. **Module 1 sets up Rust on your machine** so you can start reading source. The frame from lesson 0 starts paying off the moment you open the first \`alloy-rs/alloy\` file.

## Summary (3 lines)

- Reth vs Geth: 2–3× faster sync + SDK modularity (Hyperliquid / Tempo as case studies). Alloy vs ethers-rs: Network-generic design + active Paradigm maintenance.
- New projects → Reth + Alloy. Existing Geth / ethers-rs migrate based on cost-benefit. Foundry / Hyperliquid / major rollups have migrated.
- Module 1 next: Rust environment setup (rustup + VS Code + rust-analyzer).
`,
                },
              ],
            },
          },
          {
            title: 'Set Up Rust',
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: 'Lesson 7 — rustup and VS Code setup',
                  slug: 'setup-rust-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 10,
                  xpReward: 15,
                  content: `# Lesson 7 — rustup and VS Code setup

## Question

**Minimum environment to run the Rust stack** — rustup (toolchain manager) + VS Code + rust-analyzer extension. The three things "you literally can't write Rust without".

## Principle (minimum model)

- **rustup.** Rust's toolchain manager. \`curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh\` is the one-liner. Puts \`cargo\` / \`rustc\` / \`rustup\` on \`$PATH\`.
- **Stable channel.** Default. Reth tracks MSRV (Minimum Supported Rust Version); \`rustup update\` keeps you current.
- **VS Code + rust-analyzer extension.** rust-analyzer = the official language server. Errors + completion + types + jump-to-definition. Without it, you can't practically write Rust.
- **Useful additions.** \`Even Better TOML\` (for \`Cargo.toml\`), \`CodeLLDB\` (debugger), \`Error Lens\` (inline error display).
- **Verify it works.** \`cargo new hello && cd hello && cargo run\` → prints \`Hello, world!\`.

## Worked example + steps

# rustup and VS Code setup

Surprisingly, the Rust dev environment is just **rustup + a VS Code extension**.

## 1. Install Rust via rustup

\`\`\`bash
# macOS / Linux
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Verify
rustc --version
cargo --version
\`\`\`

\`cargo\` is Rust's package manager *and* build tool. Despite the name suggesting "package manager," you'll actually use it for building, testing, and running too — every day.

## 2. Add rust-analyzer to VS Code

Search the extensions marketplace for \`rust-analyzer\` and install it. Without this, Rust development is essentially impossible:

- Real-time type errors
- Autocomplete and "go to definition"
- Inline type hints over variables

> **Tip**: rust-analyzer only activates when the open folder contains a \`Cargo.toml\`. We'll create one in the next step.

## 3. Your first project

\`\`\`bash
cargo new hello_reth
cd hello_reth
cargo run
\`\`\`

If you see "\`Hello, world!\`", you're ready.

## 4. Need to test something quickly?

Use [Rust Playground](https://play.rust-lang.org/). It runs real Rust in the browser — no install needed.

Next, a fast tour of the Rust syntax you'll see throughout the course — then your first challenge.

## Summary (3 lines)

- Three essentials: rustup + VS Code + rust-analyzer extension. \`curl\` one-liner installs rustup; \`cargo new hello\` verifies.
- Useful additions: \`Even Better TOML\` + \`CodeLLDB\` + \`Error Lens\`. \`rustup update\` keeps stable current.
- Environment ready. Next lesson: Rust quick reference — the syntax you'll see in the Reth / Revm / Alloy source.
`,
                },
                {
                  title: 'Lesson 8 — Rust quick reference',
                  slug: 'rust-quick-reference-en',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 12,
                  xpReward: 20,
                  content: `# Lesson 8 — Rust quick reference

## Question

**The Rust syntax you'll see in Reth / Revm / Alloy source, in one lesson.** Not exhaustive — just the minimum set that gets you 80 % of the way to reading the source.

## Principle (minimum model)

- **Variables.** \`let x = 5;\` (immutable, default) / \`let mut y = 10;\` (mutable) / \`const PI: f64 = 3.14;\` (compile-time constant).
- **Functions.** \`fn add(a: i32, b: i32) -> i32 { a + b }\`. The final expression is the return value (no \`;\`). \`return\` is allowed but not idiomatic.
- **Ownership.** \`let s1 = String::from("hello"); let s2 = s1;\` moves s1 (no longer usable). \`&s1\` borrows. \`&mut s1\` borrows mutably.
- **Result / Option / \`?\`.** \`Result<T, E>\` (success / failure) + \`Option<T>\` (some / none) + \`?\` for early-return on error.
- **\`if\` is an expression.** \`let x = if cond { a } else { b };\`. No ternary operator; \`if\` itself returns a value.
- **\`match\`.** Pattern matching; all patterns must be covered; \`_\` is the default arm.
- **struct / enum.** \`struct Point { x: f64, y: f64 }\` / \`enum Color { Red, Green, Blue }\`. Methods in \`impl Point { fn new(...) -> Self { ... } }\`.
- **trait.** Shared interface. \`impl Display for Point { ... }\` to implement. \`<T: Trait>\` for a generic bound.
- **async / await.** \`async fn fetch() -> Result<...>\`; \`.await\` to wait. Runs on a Tokio runtime.
- **Macros.** \`println!\` / \`vec!\` / \`format!\` / \`assert_eq!\` etc. The \`!\` marks them. Compile-time expansion; more flexible than functions.

## Worked example + steps

# Rust quick reference

A fast tour of the Rust syntax you'll see throughout the course. There's no separate "learn Rust" course here — you pick up the language by going through the EVM material, with explanations the moment you need them.

## 1. Variables: \`let\` and \`let mut\`

Rust variables are **immutable by default**. Add \`mut\` to allow reassignment.

\`\`\`rust
let x = 10;        // immutable
// x = 11;         // compile error

let mut y = 10;    // mutable
y = 11;            // OK
\`\`\`

## 2. Primitive types

| Type | Meaning |
| :--- | :--- |
| \`i32\`, \`i64\` | signed integers |
| \`u32\`, \`u64\`, \`u128\` | unsigned integers |
| \`bool\` | true / false |
| \`&str\` | **borrowed string** (read-only, lightweight) |
| \`String\` | **owned string** (mutable, heap-allocated) |

> The \`&str\` vs \`String\` distinction trips everyone up at first. For now: **\`&str\` is "looking at someone else's house," \`String\` is "owning your own house."** We'll do ownership properly in the next tier.

## 3. Functions

\`\`\`rust
fn add(a: i64, b: i64) -> i64 {
    a + b   // no semicolon → it's an "expression" and becomes the return value
}
\`\`\`

- Parameters use \`name: type\`
- Return type after \`->\`
- The trailing expression (no semicolon) is the implicit return

## 4. Methods

Rust values have methods you call with \`.\`:

\`\`\`rust
let s = "0x123";
s.starts_with("0x");      // true / false
s.len();                  // 5
"hello".to_uppercase();   // "HELLO"
\`\`\`

## 5. Control flow: \`if\` / \`else\`

\`\`\`rust
let n = 7;
if n % 2 == 0 {
    println!("even");
} else {
    println!("odd");
}
\`\`\`

\`if\` is itself an **expression**, so it can produce a value:

\`\`\`rust
let parity = if n % 2 == 0 { "even" } else { "odd" };
\`\`\`

## 6. Printing: \`println!\`

The \`!\` means it's a **macro**, not a function. \`{}\` is a placeholder.

\`\`\`rust
let name = "Alloy";
println!("Hello, {}!", name);          // Hello, Alloy!
println!("{} + {} = {}", 1, 2, 1 + 2); // 1 + 2 = 3
\`\`\`

## 7. Collections: \`Vec\`

A growable array. You'll see it everywhere in EVM code — stacks, transaction lists, byte buffers.

\`\`\`rust
let mut v: Vec<i64> = Vec::new();
v.push(10);
v.push(20);
let last = v.pop();   // Some(20)
println!("{:?}", v);  // [10]
\`\`\`

\`{:?}\` is the **debug** placeholder — handy for printing structures while you're learning.

## 8. That's the minimum

You now have enough Rust to read the first chunks of Alloy code. The next lesson exercises this directly.

| Syntax | One-liner |
| :--- | :--- |
| \`let x = ...\` | immutable variable |
| \`let mut x = ...\` | mutable variable |
| \`fn name(arg: T) -> R {}\` | function |
| \`x.method()\` | method call |
| \`if .. else ..\` | branching (also an expression) |
| \`println!("{}", x)\` | print |
| \`Vec<T>\` | growable list |

> Don't try to memorize. **Recognize it when you see it** — that's the goal here.

## Summary (3 lines)

- Variables + functions + ownership + Result + \`?\` + \`if\` expression + \`match\` + struct/enum + trait + async + macros — the minimum set.
- "Enough to read 80 % of the source." Not exhaustive; doc.rust-lang.org has the rest when needed.
- Next lesson: the first homework — write a 0x checker.
`,
                },
                {
                  title: 'Quiz — First homework: 0x check',
                  slug: 'first-homework-en',
                  type: 'QUIZ',
                  sortOrder: 2,
                  duration: 15,
                  xpReward: 25,
                  content: `# Quiz — First homework: 0x check

## Question

**Your first Rust program.** Check whether a given string is an Ethereum address starting with \`0x\`. Combines \`&str.starts_with\` + \`.len()\` + \`if/else\` + \`&&\` — the basics in one function.

## Principle (minimum model)

- **Function signature.** \`fn is_valid_address(addr: &str) -> bool\`. Borrow \`&str\`; return \`bool\`.
- **\`addr.starts_with("0x")\`.** The standard \`&str\` method. \`has_prefix\` does not exist; \`contains\` is substring, not prefix.
- **Length check.** \`addr.len() == 42\`. Ethereum address = 40 hex digits + \`0x\` prefix = 42 chars total.
- **Idiomatic.** \`addr.starts_with("0x") && addr.len() == 42 && addr[2..].chars().all(|c| c.is_ascii_hexdigit())\` — three conditions ANDed.
- **In Alloy.** \`addr.parse::<Address>()\` delegates all of this to Alloy. Production code does this.
- **Rust Playground.** https://play.rust-lang.org/ — try Rust without Alloy. URL-share for snippets.

## Worked example + steps

# First homework: 0x check

The simplest possible task:

> Given a string that's supposed to be an Ethereum address, check whether it starts with \`0x\` and print a message. As a stretch: also verify the length (42 characters total).

## What you'll need

This is your first Rust program in the EVM stack tradition. Three primitives appear in every Rust program you'll ever write:

1. **Variables** — \`let\` and \`let mut\` (we just covered these)
2. **Methods** — Rust strings have built-in methods. There's one that checks whether a string begins with another string. **Find it in the std docs**: [\`&str\` documentation](https://doc.rust-lang.org/std/primitive.str.html)
3. **Conditionals** — \`if\` / \`else\`

You also need to know the **length** of an Ethereum address. Look it up if unsure (hint: 40 hex chars + the \`0x\` prefix).

## Try it yourself

Open [Rust Playground](https://play.rust-lang.org/) and write a function with this signature:

\`\`\`rust
fn is_valid_address(addr: &str) -> bool {
    // your code
}
\`\`\`

Test it against:

\`\`\`rust
fn main() {
    println!("{}", is_valid_address("0x1234567890abcdef1234567890abcdef12345678")); // true
    println!("{}", is_valid_address("1234567890abcdef1234567890abcdef12345678"));   // false
}
\`\`\`

A few hints if you get stuck:

- \`addr.\`-something — there's a method on \`&str\` whose name is exactly what you want
- \`addr.len()\` returns the character byte length
- Two boolean conditions are joined with \`&&\`

Don't peek at the answer until you've **tried writing it**. The whole point of Rust is the compiler teaches you — let it.

## Quiz

Once you've written and run your version, take the quiz below. Each question targets a specific Rust idiom — you should be able to answer them all from the experience of having written this function.

## Summary (3 lines)

- Function \`is_valid_address(addr: &str) -> bool\` = \`starts_with("0x") && len == 42 && all hex digits\`. Three conditions AND.
- Alloy production: \`addr.parse::<Address>()\` delegates everything. Rust Playground for Alloy-free experimentation.
- Five quiz questions cover this homework and the basic syntax. Next: final Beginner quiz.
`,
                  quizQuestions: [
                    {
                      "question": "Which Rust expression correctly checks whether the string `address` starts with `\"0x\"`?",
                      "options": [
                        "`address.has_prefix(\"0x\")`",
                        "`address.starts_with(\"0x\")`",
                        "`address.contains(\"0x\")`",
                        "`address[0..2] == \"0x\"`"
                      ],
                      "correctIndex": 1,
                      "explanation": "`starts_with` is the standard `&str` method. `has_prefix` does not exist. `contains` matches anywhere in the string, not just the start. Direct slice indexing on `&str` panics if the boundary isn't a UTF-8 char boundary, so it's unsafe as a general check."
                    },
                    {
                      "question": "A complete validity check for an Ethereum address string requires:",
                      "options": [
                        "just confirming the `0x` prefix",
                        "the `0x` prefix, exact length of 42, and all hex digits after the prefix",
                        "40 characters and all hex digits",
                        "nothing — just receive it as `Address` type instead of `&str`"
                      ],
                      "correctIndex": 1,
                      "explanation": "A canonical Ethereum address is 40 hex digits (20 bytes), prefixed with `0x`, total 42 characters. All three checks together prevent garbage input. Note: in production Rust EVM code you'd usually parse into `Address` directly via `address.parse::<Address>()` and let Alloy do this."
                    },
                    {
                      "question": "Why does Rust let you write `if condition { a } else { b }` as an expression?",
                      "options": [
                        "Because Rust has no ternary operator (`?:`), so `if/else` is the way to express conditional values",
                        "Because it's faster than `match`",
                        "Because it lets you skip semicolons",
                        "Because it's required for borrow checking"
                      ],
                      "correctIndex": 0,
                      "explanation": "Rust intentionally has no ternary operator. Instead, `if/else` is itself an expression that evaluates to a value, so you write `let x = if cond { a } else { b };`. This keeps the language smaller and more uniform."
                    },
                    {
                      "question": "The Alloy `address!(\"0x...\")` macro provides what benefit over a runtime parse?",
                      "options": [
                        "It runs faster at runtime",
                        "It validates the address literal at compile time, so an invalid address fails to compile",
                        "It's required for Solidity ABI compatibility",
                        "It encodes the address as ABI bytes"
                      ],
                      "correctIndex": 1,
                      "explanation": "`address!` is a macro that runs in the compiler. It validates the hex digits and length while compiling. Typo a digit and the program won't build — much safer than discovering it at runtime when a user clicks a button."
                    },
                    {
                      "question": "What does `mut` add to `let mut x = 5;` versus `let x = 5;`?",
                      "options": [
                        "`mut` makes access faster",
                        "Without `mut`, you cannot reassign (`x = 6` would be a compile error)",
                        "Without `mut`, you cannot shadow with `let x = ...`",
                        "There is no functional difference"
                      ],
                      "correctIndex": 1,
                      "explanation": "Variables are immutable by default in Rust. `mut` permits reassignment. Shadowing with another `let` is independent of `mut` — you can shadow even immutable variables."
                    }
                  ],
                },
                {
                  title: 'Quiz — Beginner',
                  slug: 'beginner-quiz-en',
                  type: 'QUIZ',
                  sortOrder: 3,
                  duration: 10,
                  xpReward: 25,
                  content: `# Quiz — Beginner

## Question

Confirm the role + position of Reth / Revm / Alloy. **Five questions to consolidate the 11-lesson foundation.** Reth = node, Revm = engine, Alloy = type foundation; learning order is Alloy → Revm → Reth.

## Principle (minimum model)

- **Three-project recap.** Reth = full node (top, binary) / Revm = execution engine (middle, library) / Alloy = types + RPC + signers (bottom, primitives).
- **Why Revm everywhere.** Modular design + Rust performance + safety = adopted by Foundry / Reth / OP-Reth / zkVM / MEV bots / Hyperliquid as a common foundation.
- **Learning order.** Alloy → Revm → Reth (micro to macro). Both the dependency and the pedagogy favour this order.
- **VS Code extension.** rust-analyzer (official LSP). Without it you can't practically write Rust.
- **Reth vs Solana.** EVM-stack edges are customisability + ecosystem + Rust safety. **"Always faster" is wrong** — raw TPS sometimes favours Solana.

## Worked example + steps

# Beginner quiz

Check your grasp on the roles of Reth, Revm, and Alloy.

## Summary (3 lines)

- 11 lessons complete: three-project roles + Revm adoption rationale + learning order + setup + Solana comparison consolidated.
- Five questions span all the above. Next: Bridge to Advanced for the run-up to Intermediate.
`,
                  quizQuestions: [
                    {
                      "question": "Which mapping is correct?",
                      "options": [
                        "Reth = library suite, Revm = node, Alloy = execution engine",
                        "Reth = node, Revm = execution engine, Alloy = library suite (types/RPC/signing)",
                        "Reth = execution engine, Revm = node, Alloy = wallet",
                        "They are all the same project under different names"
                      ],
                      "correctIndex": 1,
                      "explanation": "Reth is the full node, Revm is the EVM execution engine, and Alloy provides the foundational types, RPC, and signing libraries."
                    },
                    {
                      "question": "Why is Revm chosen by Foundry, Reth, and Hyperliquid?",
                      "options": [
                        "It's the only Rust EVM in existence",
                        "It's designed as a library, easy to embed and customize, with Rust's performance and safety",
                        "Solidity runs on it without compilation",
                        "It's the only free EVM"
                      ],
                      "correctIndex": 1,
                      "explanation": "Revm's \"library-first\" design and Rust performance/safety make it the standard for Foundry, Reth, OP-Reth, zkVMs, and MEV tools."
                    },
                    {
                      "question": "Recommended learning order in this course?",
                      "options": [
                        "Reth → Revm → Alloy (macro to micro)",
                        "Alloy → Revm → Reth (micro to macro)",
                        "Revm → Alloy → Reth",
                        "Any order, learner's choice"
                      ],
                      "correctIndex": 1,
                      "explanation": "Going from primitives (Alloy) to engine (Revm) to whole-node (Reth) is the lowest-friction path."
                    },
                    {
                      "question": "Which VS Code extension is essentially mandatory for Rust development?",
                      "options": [
                        "Rust Helper",
                        "rust-analyzer",
                        "cargo-vscode",
                        "Rustacean"
                      ],
                      "correctIndex": 1,
                      "explanation": "rust-analyzer is the official language server providing diagnostics, completion, type hints, and navigation."
                    },
                    {
                      "question": "Which of the following is NOT a real practical advantage of Rust EVM over Solana?",
                      "options": [
                        "EVM ecosystem (wallets, tools) carries over directly",
                        "You can customize the infra layer for your specific app",
                        "It is always faster than Solana in raw throughput",
                        "EVM knowledge applies across many chains"
                      ],
                      "correctIndex": 2,
                      "explanation": "\"Always faster\" is wrong. Solana wins on pure TPS in many scenarios. Rust EVM wins on customizability, ecosystem reuse, and Rust safety."
                    }
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
