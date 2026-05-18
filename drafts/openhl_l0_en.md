# Building OpenHL — L0 draft (EN)

> Drafted against openhl SHA `0844d58` (Stage 7c). Orientation lesson — the map every other lesson assumes you already have. Added retroactively after L1-L13 were already drafted because preview surfaced that without this lesson, the rest of the course's "3am" hooks land without context.
> Course: `building-openhl-consensus-en` (track: `reth-l1-architect`, course #6 of 10).

---

## L0 — `openhl-orientation-en`

- **Module:** 0 (Orientation), sortOrder 0 within module
- **Course-level sortOrder:** -1 (lesson 0 of 14 — placed before L1)
- **Duration:** 15 min
- **XP reward:** 40
- **Type:** CONTENT

### Content

````markdown
# OpenHL at a glance — repo, subsystems, build arc

Hyperliquid moved $300B+ of perp volume in 2025 on a fully closed-source stack — HyperBFT consensus, HyperCore matching engine, HyperEVM execution. None of it has a public Rust reference. **`openhl` is what the open-source version of that stack looks like.**

The thirteen lessons that follow this one assume you already know what `openhl` is, where its code lives, and where each lesson sits in a multi-month build. **This lesson is the map.** Read it once carefully; everything else in the course gets faster the better you understand it.

> 🛑 **Predict before scrolling.** You're going to read about a Hyperliquid-shape L1. Without scrolling, sketch a five-box architecture diagram for any L1 in this class. Hint: two halves that talk over a small contract, plus three pure subsystems the I/O half composes.

## 1. What openhl is

From `README.md` at `psyto/openhl`:

> An open-source reference implementation of a Hyperliquid-shape L1: BFT consensus + EVM execution + a CLOB matching engine, with first-class vault primitives.

Three things in that one sentence are load-bearing:

| Phrase | What it commits to |
| :--- | :--- |
| "Open-source reference implementation" | Everything is on GitHub at `psyto/openhl`, MIT + Apache-2.0 dual-licensed. No private repos, no internal forks. |
| "Hyperliquid-shape L1" | Not a Hyperliquid clone. Same *architectural shape* — the same five subsystems in the same relationship — but a clean-room Rust impl on Reth + Malachite, not a port of HL's proprietary code. |
| "First-class vault primitives" | Vaults aren't an app-layer afterthought. They're a chain primitive — auto-compounding, delta-neutral, funding-rate-capture, and similar strategies compose directly against them rather than being smart contracts that have to reinvent custody and accounting. |

`openhl` is also where the rethlab L1 Architect tier's worked example lives. Every concept in this course corresponds to real Rust code at the commit you can pin via `file:line@SHA` cites — and the cites are checked by CI.

> 🛑 **Anti-fluency.** "OpenHL is a Hyperliquid fork." **Wrong.** A fork would import Hyperliquid's source and patch on top. `openhl` is a *clean-room* implementation: the same architecture and the same external behavior, built from public libraries (Reth, Malachite) by someone reading the public Hyperliquid documentation. The distinction matters for licensing (we don't touch HL's IP) and for pedagogy (clean-room means the code is built from explainable first principles).

## 2. Why this exists

Two reasons, both load-bearing:

1. **An open substrate for the ecosystem.** Every HL-shape app (vault product, market-maker bot, structured-product DEX) currently has to either trust HL's closed stack or rebuild the substrate themselves. `openhl` is the substrate, public and forkable.

2. **A teachable codebase.** Most BFT-L1 educational material stops at the algorithm (whiteboard Tendermint, draw arrows for prevote/precommit). `openhl` goes further: it's a real Rust workspace compiled by `cargo build`, where every load-bearing piece can be cited by `file:line` and run by `cargo test`. The rethlab L1 Architect tier is the worked-example surface that turns this codebase into a course.

The dual-use compounds. Code investment pays in two outputs: a working L1 substrate **and** a 13-lesson teachable artifact. Most open-source side projects choose one or the other.

## 3. The five subsystems

From `docs/architecture.md`:

```
┌─────────────────────────────────────────────────────────┐
│                       openhl                             │
├───────────────────────────────┬─────────────────────────┤
│ Consensus Layer (CL)          │ Execution Layer (EL)    │
│ Malachite BFT                  │ Reth (library mode)     │
│ Leader election, voting,       │ EVM execution, state,   │
│ view changes, finality         │ payload building, RPC   │
└───────────┬───────────────────┴──────────┬──────────────┘
            │                              │
            └─────── 4-message contract ───┘
                     (ConsensusBridge trait)

                Three pure state machines that EL composes:

      ┌─────────────┐  ┌──────────────┐  ┌─────────────┐
      │   CLOB      │  │  Settlement  │  │    Vault    │
      │ orderbook   │  │ funding/     │  │ strategy    │
      │ matching    │  │ oracle/      │  │ primitive   │
      │             │  │ liquidation  │  │             │
      └─────────────┘  └──────────────┘  └─────────────┘
```

Two halves, three pure state machines, one contract between the halves. **That's the entire architecture.** Everything else in the codebase is implementation detail of one of these five boxes.

The CL/EL split is the same shape Ethereum uses (Lighthouse / Reth split, Engine API contract), borrowed deliberately. The three pure state machines are HL-specific: a generic L1 like Ethereum doesn't have them; an HL-shape L1 needs all three to be a perp DEX.

## 4. The ten crates

The architecture above maps to a Rust workspace with ten library crates plus the node binary. The split is deliberate:

```
bin/openhl/                          thin binary, calls crates/node

crates/
├── types/         shared primitives (BlockHash, PayloadId, etc.) — Module 1
├── codec/         canonical encoding for consensus messages
├── clob/          orderbook state machine — Module 2
├── oracle/        mark price aggregation — Module 4
├── funding/       funding-rate calc + settlement — Module 4
├── liquidation/   liquidation engine — Module 4
├── vault/         protocol-native vault primitive — Module 5
├── evm/           Reth integration + core↔EVM precompiles — Module 1 + 3
├── consensus/    Malachite BFT app-side wiring — Module 1
└── node/         assembles consensus + evm + clob into Node::run() — Module 1
```

Pure state-machine crates (`types`, `codec`, `clob`, `oracle`, `funding`, `liquidation`, `vault`) have no I/O. Tested with `proptest`, microseconds per case, deterministic by construction. I/O crates (`evm`, `consensus`, `node`) talk to the outside world.

| Crate group | I/O? | Tested how |
| :--- | :--- | :--- |
| Pure state machines (7 crates) | No | Unit + proptest, microseconds per case |
| I/O boundary (3 crates) | Yes | Integration tests, devnet replay |

> 🛑 **Anti-fluency.** "The pure/I-O split is a code style preference." **No.** It's the determinism rail that keeps multi-validator state from diverging. Pure crates never call `SystemTime::now`, `HashMap` iteration order, `rand`, or anything host-dependent — because two validators that disagree on a single LSB fork the chain. The split is enforced by code review + `unsafe_code = "forbid"`; treating it as a style choice is how you ship a chain that forks at the first hardfork-sensitive operation.

## 5. The Build arc

`openhl` ships in five modules, each shipping working code **and** a matching rethlab course. From the README:

| # | Module | Crates touched | What lands |
| - | --- | --- | --- |
| **1** | **Consensus substrate** (Malachite + Reth) | `consensus`, `evm`, `node`, `types`, `codec` | **Single-validator devnet produces blocks end-to-end.** *← This course covers this module.* |
| 2 | CLOB matching engine | `clob`, `types`, `codec` | Real transactions enter the chain. EVM blocks contain actual fills. |
| 3 | Core ↔ EVM precompiles | `evm`, `clob` | Smart contracts can read live orderbook state. |
| 4 | Funding, oracle, liquidations | `funding`, `oracle`, `liquidation` | Perp settlement loop. Chain looks like a perp DEX. |
| 5 | Protocol-native vault primitive | `vault` | Auto-compounding, delta-neutral, and similar vault strategies become chain primitives instead of app-layer contracts. |

**This course covers Module 1 only.** Modules 2-5 each become their own rethlab course in the L1 Architect tier. When you finish this course you have the substrate; when you finish Modules 1+2+3 you have a functional perp DEX; when you finish all five you've built openhl.

> 🛑 **Predict.** Why does Module 1 ship before Module 2 (CLOB), when "what makes openhl interesting" is the orderbook? **Hint: think about what `validate_payload` would have nothing to do without a consensus substrate underneath it.**

The answer: the CLOB is a pure state machine; it produces fills as outputs. But fills only mean anything if there's a consensus that orders them and an EVM that applies them as transactions. Module 1 builds the substrate that the CLOB plugs into; without it, the CLOB is a `cargo test` artifact, not a chain. Build order follows dependency order — Module 1 first because Modules 2-5 all depend on its `ConsensusBridge`.

## 6. Where this course goes — 13 lessons in 5 chunks

This course's 13 lessons cover Module 1 ("Consensus substrate") in five internal chunks. Each chunk is a sub-module of *this* course; don't confuse them with the openhl Build arc Modules 1-5 above.

| This-course sub-module | Lessons | What you understand by the end |
| :--- | :--- | :--- |
| **1. The execution/consensus split** | L1, L2 | Why every BFT-L1 has a four-message contract between CL and EL. Why HL/Tempo/CometBFT all converge on the same shape. |
| **2. Malachite as a library** | L3, L4, L5 | What Malachite gives you (the `Context` trait), what you implement (the 10 sub-types + `SigningProvider`), and the actor model that turns the protocol state machine into a running engine. |
| **3. Reth as a library** | L6, L7, L8 | Why you don't fork Reth — you configure it (`NodeBuilder` slots). The Engine API surface that consensus and execution exchange. How Reth's `PayloadBuilderService` assembles a block. |
| **4. Wiring it up** | L9, L10, L11 | Designing the `ConsensusBridge` trait. From Malachite `Decided` to Reth `forkchoice_updated`. The proposer's hot path through `engine_app.rs`. |
| **5. Single-validator devnet** | L12, L13 | Bootstrap (genesis, keys, single-node config). The integration test that drives a complete block through the actor system in 0.02s — the v0 milestone. |

By the end of L13, the `first_block_via_engine_actors` integration test (`crates/consensus/src/engine_app.rs:246@0844d58`) drives a complete consensus round end-to-end through real Reth + real Malachite, producing one decided block. **That's openhl Module 1's v0 milestone**, and it's the final state this course gets you to.

## 7. How to read the rest of the course

Three patterns worth flagging up front:

1. **The 3am hook.** Every lesson opens with a debugging scenario (you've been paged, something is broken, you have N seconds to figure out what). The scenarios assume you're already running `openhl` mentally; this lesson is what makes those hooks land. If a hook feels disorienting, come back to §3 (the architecture diagram).

2. **`🛑` callouts.** Two flavors: **Predict** (a pause to sketch before reading the answer) and **Anti-fluency** (a common wrong intuition called out by name). Both reward stopping to engage.

3. **`file:line@SHA` cites.** Every code reference is pinned to a specific openhl commit, so you can `git checkout 0844d58` (or whatever SHA the lesson cites) and read the exact same code the lesson describes. CI verifies these cites every push.

Now the rest of the course makes sense to enter.

## 8. Practice

1. **Read the source.** Open `https://github.com/psyto/openhl` and read `README.md` end-to-end, then `docs/architecture.md`. Both fit on one screen each.
2. **Sketch the architecture.** Without re-reading, draw the five-subsystem diagram from §3 on paper. Label which crate(s) implement each box. Compare to §4's tree.
3. **Trace one Build-arc edge.** Pick Module 2 (CLOB). What does it depend on from Module 1, and what does it deliver to Module 3? (Hint: §5's table is a partial answer; the rest is implicit in the architecture.)

> **Final check.** In one sentence, why is "Hyperliquid-shape" the right framing for openhl rather than "Hyperliquid clone" or "Hyperliquid fork"? If your answer doesn't include "same architecture, clean-room implementation, no proprietary code touched," re-read §1.
````

---

## Seed-file slot

L0 lands in a new Module 0 ("Orientation"), with sortOrder 0. All other modules shift down by one:

```typescript
// Course.modules.create array:
{
  title: 'Orientation',
  sortOrder: 0,
  lessons: { create: [
    {
      title: 'OpenHL at a glance — repo, subsystems, build arc',
      slug: 'openhl-orientation-en',
      type: 'CONTENT',
      sortOrder: 0,
      duration: 15,
      xpReward: 40,
      content: `# OpenHL at a glance — repo, subsystems, build arc\n\n...`  // L0 markdown
    },
  ]}
},
{
  title: 'The execution/consensus split',
  sortOrder: 1,  // was 0
  lessons: { create: [
    // L1, L2
  ]}
},
// Module 2 → sortOrder 2 (was 1)
// Module 3 → sortOrder 3 (was 2)
// Module 4 → sortOrder 4 (was 3)
// Module 5 → sortOrder 5 (was 4)
```

Course totals update:
- 13 → 14 lessons
- 195 → 210 duration
- 560 → 600 XP

## SHA pinning discipline

L0 cites `openhl@0844d58` like the other lessons that pin to that SHA. Cited surfaces:
- `README.md` (the "Open-source reference implementation..." sentence in §1)
- `docs/architecture.md` (the five-subsystem decomposition in §3, the pure/I-O table in §4)
- `crates/consensus/src/engine_app.rs:246@0844d58` (the v0 milestone test in §6)

The README/architecture excerpts are quoted to match the live file. If `README.md` or `docs/architecture.md` change shape, L0's §1-§5 need to track. The cite-check workflow will catch line-number drift in the `engine_app.rs:246` cite; the prose cites are looser.

## Style review notes (self-critique before paste)

- **L0 is unusual in not opening with a `3am` scenario** — it opens with a market-fact hook ("Hyperliquid moved $300B in 2025"). That's intentional: the `3am` hook only lands once the reader knows what's running. L0's job is to make the rest of the course's hooks land; using one here would be circular.
- **§3's ASCII diagram** is the load-bearing reference artifact. Every subsequent lesson can be located on this diagram. If a reviewer wants to tighten the lesson, **don't cut the diagram** — cut prose around it instead.
- **§5's "this course covers Module 1 only" line** is the orientation that makes the L13 "Module 2 is next course" framing make sense. Without it, learners hit L13 and don't know what "Module 2" means in context.
- **L0 doesn't have a JA mirror yet at first paste.** Translation pass is the very next task — but the EN should be reviewed and validated first since L0's structure decisions propagate to every other module's framing.
- **§6's table conflicts naming-wise with the openhl Build arc table in §5.** Both use "Module 1-5" but mean different things (openhl's vs this-course's). §6 explicitly calls out the distinction; if a reviewer finds it confusing, the fix is to rename this-course's sub-modules to "Part 1-5" or "Section 1-5" — a course-wide rename that touches all 13 existing lessons. Deferred unless reviewer flags.
