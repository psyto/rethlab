# Building OpenHL — L15 draft (EN) — C2 build-along rewrite

> No openhl SHA cited — this lesson is a recap and roadmap, not new code.
> Course: `building-openhl-consensus-en` (track: `reth-l1-architect`, course #6 of 10).
> Closing lesson of the course.

---

## L15 — `openhl-capstone-en`

- **Module:** 7 (Capstone — new module for the closing lesson)
- **Module sortOrder:** 7
- **Course-level sortOrder:** 14 (lesson 15 of 15 you'll see in the course; numbered 15 because Module 4 has 4 lessons and we split L8 + L9 mid-course)
- **Duration:** 25 min
- **XP reward:** 60
- **Type:** CONTENT

### Content

````markdown
# Lesson 15 — What you built, what's still stub, where to go next

## The system you built

Over 14 lessons you went from `cargo init` on an empty directory to a single-validator BFT chain that decides real blocks through a real Reth EL in ~0.02 seconds. Your workspace now looks like this:

```
~/code/my-openhl/
├── Cargo.toml                          ← 16 reth-* deps, 8 malachite deps, all SHA-pinned
├── bin/openhl/                         ← (stub binary — production wiring is a future course)
├── crates/
│   ├── types/                          L2:  shared CL↔EL contract types
│   │   └── src/lib.rs                  BlockHash, PayloadId, PayloadAttrs,
│   │                                   ExecutedBlock, PayloadStatus
│   ├── evm/                            EL side (test double → live Reth)
│   │   ├── src/bridges/
│   │   │   ├── in_memory.rs            L4:  InMemoryEvmBridge (HashMap state)
│   │   │   └── reth.rs                 L5:  RethEvmBridge (alloy types, real hash_slow)
│   │   ├── src/reth_node.rs            L11: bootstrap proof (test-only)
│   │   └── src/live_node.rs            L12-L14: LiveRethEvmBridge<P>
│   │                                   - L12: parent lookup via BlockNumReader
│   │                                   - L13: EthBeaconConsensus validate
│   │                                   - L14: ConsensusEngineHandle forkchoice
│   └── consensus/                      CL side (full BFT engine)
│       ├── src/bridge.rs               L3:  ConsensusBridge trait
│       ├── src/types/                  L6:  10 Malachite Context sub-types
│       ├── src/context.rs              L6:  Context<OpenHlContext> impl
│       ├── src/signing.rs              L7:  canonical encoding for vote/proposal
│       ├── src/signing_provider.rs     L7:  SigningProvider<OpenHlContext>
│       ├── src/codec.rs                L8:  OpenHlCodec (1 real + 7 stub Codec impls)
│       ├── src/node.rs                 L9:  OpenHlNode + start_engine
│       └── src/engine_app.rs           L10: run_engine_app (AppMsg routing)
```

About **40-50 source files** total. Workspace tests: 38 passing.

Drawing the **full CL ↔ EL integration** you opened across this course in one picture makes the boundary you stitched together immediately legible:

```
   [ CL: openhl-consensus ]                          [ EL: openhl-evm ]
  ┌──────────────────────────────────────────┐    ┌──────────────────────────────────────────┐
  │  Malachite BFT engine (actor system)      │    │   LiveRethEvmBridge<P>                    │
  │                                            │    │                                            │
  │   ├── OpenHlContext                         │    │    ├── provider: P (BlockNumReader        │
  │   │   (10 associated types — L6)            │    │    │             + HeaderProvider)         │
  │   ├── OpenHlSigningProvider                 │    │    ├── chain_spec: Arc<ChainSpec>          │
  │   │   (Ed25519 + canonical encoding — L7)   │    │    │   (shared source of truth — L13)     │
  │   ├── OpenHlCodec                           │    │    ├── validator:                          │
  │   │   (1 real + 7 stub — L8)                │    │    │   EthBeaconConsensus<ChainSpec> (L13) │
  │   ├── OpenHlNode / OpenHlNodeHandle (L9)    │    │    ├── engine_handle:                      │
  │   └── run_engine_app loop                   │    │    │   Option<ConsensusEngineHandle> (L14) │
  │       (12 AppMsg arms — L10)                │    │    └── state: Mutex<{ pending, chain,      │
  │                                              │    │                       head, … }>          │
  └──────────────────┬──────────────────────────┘    └──────────────────┬──────────────────────┘
                     │                                                  ▲
                     │ ── all chatter goes through 4 ConsensusBridge ───┘
                     │   methods (the trait surface defined in L3)
                     │
                     ├── ① build_payload(parent, attrs)
                     │     CL ──► EL : "Assemble the next block."
                     │     EL ──► CL : PayloadId (returns immediately; Reth assembles async)
                     │     Under the hood: pull parent_header from provider →
                     │                     ChainSpec::next_block_base_fee + gas_limit copy
                     │                     + timestamp monotonicity → header synth → stash in pending
                     │
                     ├── ② payload_ready(id)
                     │     CL ──► EL : "Hand me the block for that PayloadId."
                     │     EL ──► CL : ExecutedBlock (retrieved from pending)
                     │     ※ The only seam where data flows EL → CL among the four methods
                     │
                     ├── ③ validate_payload(&block)
                     │     CL ──► EL : "A peer's proposal — validate it."
                     │     EL ──► CL : PayloadStatus { Valid / Invalid / Syncing }
                     │     Under the hood: EthBeaconConsensus::validate_header_against_parent
                     │                     (4 sub-checks: number / timestamp / gas-limit / EIP-1559)
                     │
                     └── ④ commit(hash)
                           CL ──► EL : "Quorum reached; finalize this."
                           EL ──► CL : Ok(())
                           Phase 1 (must succeed): state.chain.insert + update head
                           Phase 2 (best-effort):  ConsensusEngineHandle::fork_choice_updated
                               → Reth's in-process Engine API (no body yet → SYNCING reply; discarded)
```

Three things this picture pins down: (a) **The two worlds on either side talk through exactly the four `ConsensusBridge` methods defined in L3** — the entire seam between two huge infrastructure stacks fits into that one trait surface. (b) **Because `run_engine_app` (L10) is generic over `B: ConsensusBridge`, the same loop runs against four bridge implementations** — StubBridge / InMemoryEvmBridge / RethEvmBridge / LiveRethEvmBridge. That's the polymorphism payoff. (c) **The `chain_spec: Arc<ChainSpec>` inside `LiveRethEvmBridge` is the shared source of truth referenced by both `build_payload` and `validate_payload`** — split that, and self-forks appear the moment a hard fork shifts the base-fee formula. Every L1-architect design decision in this course lives somewhere on this single diagram.

## The four `ConsensusBridge` methods — all live

Each row is the closing state of a method after the course:

| Method | First impl | Live impl | Real Reth code now reached |
| - | - | - | - |
| `build_payload` | L4 (in-memory) | L13 | `HeaderProvider::sealed_header_by_hash`, `ChainSpec::next_block_base_fee` (same helper as the validator) |
| `payload_ready` | L4 (in-memory) | L13 | (no Reth call — bridge's pending map, by design) |
| `validate_payload` | L4 (stub Valid) | L13 | `EthBeaconConsensus::validate_header_against_parent` (4 sub-checks: number / timestamp / gas-limit / EIP-1559 base fee) |
| `commit` | L4 (HashMap insert) | L14 | `ConsensusEngineHandle::fork_choice_updated` via in-process Engine API |

The bridge talks to Reth's storage layer (`HeaderProvider`), Reth's chain config (`ChainSpec`), Reth's consensus validator (`EthBeaconConsensus`), and Reth's engine actor (`ConsensusEngineHandle`). That's most of Reth's public surface that a CL client would touch.

## What's still placeholder

This course shipped a *working single-validator chain*. It's honest to call out what's not yet there. Each item below is a deliberate scope cut, not an accident:

### 1. Engine `newPayload` integration

**Status**: missing.

`commit` sends `ForkchoiceUpdated`, and Reth's engine responds `SYNCING` because it doesn't have the matching block body. To progress to `VALID`, you'd need to:

- Encode `build_payload`'s output as a real `ExecutionPayload` (with a transaction list, even if empty).
- Send it via `handle.new_payload(payload).await` *before* the `fork_choice_updated` call.
- Match the response chain: `newPayload → VALID` → `forkchoice → VALID` → canonical head advances.

The blocker is that we don't have EVM-executable transactions to put in the payload yet. OpenHL's matching engine (CLOB) produces *fills*, not ECDSA-signed user transactions of the kind that flow through a regular Ethereum mempool. Trying to route fills as user-signed transactions through a mempool would erase the entire point of an HL-shape chain — the gas cost and mempool latency would destroy the price-time-priority CLOB's performance characteristics. Instead, real Hyperliquid-shape chains **inject the consensus-agreed fill data into `ExecutionPayload` at `build_payload` / `newPayload` time as "protocol-initiated system transactions" or as direct state injections into dedicated precompiles, with no user signature**, opening a path for `Vec<Fill>` to land in EVM state from the consensus side. Building this "fills → privileged system tx / precompile injection in the payload" path is the next big chunk of work after this course — likely a full Module 2 of openhl's build arc.

### 2. Real `Codec` impls

**Status**: 1 real (`OpenHlProposalPart` — empty bytes), 7 stubs (return `CodecStub` error).

In single-validator mode, the codecs for gossiped messages (`SignedConsensusMsg`, `LivenessMsg`, `StreamMessage`), WAL writes (`ProposedValue`), and peer sync (`Status`, `Request`, `Response`) **never fire**. Once you add a second validator, every cross-validator message hits one of these stubs.

To extend: pick a wire format (protobuf, borsh, JSON) and write the encode/decode for each type. Malachite's `code/crates/test/src/codec/` is ~400 lines of hand-written protobuf and is the canonical reference.

### 3. Multi-validator gossip

**Status**: never exercised.

`OpenHlNode` already configures libp2p (`/ip4/127.0.0.1/tcp/0`). What's untested:
- Two `OpenHlNode` instances discovering each other.
- Vote propagation under network partition.
- Vote-extension exchange.
- Sync of a lagging validator.

Once Codec stubs (#2) are real and you have N=2 nodes spinning up against a shared chain spec, a multi-validator integration test is the natural next step.

### 4. Persistent WAL

**Status**: ephemeral tempdir.

Every test uses `tempfile::tempdir()` so MDBX state is gone after each run. Production needs a configurable `home_dir` that survives restarts. Adding it is mechanical (just route the path through `OpenHlNode::new`), but verifying *crash recovery* (kill the node mid-commit, restart, assert the chain head is right) needs real WAL codec impls and a Test Plan that's specifically chaos-engineering shaped.

### 5. Slashing + double-sign detection

**Status**: none.

Production BFT chains track validator misbehaviour (signing two different blocks at the same height, voting twice in the same round). Malachite has hooks for this in `LivenessMsg`; OpenHL hasn't wired them up. **Building a multi-validator chain without slashing is fine for testnets, dangerous for value-handling networks.**

### 6. Custom Hyperliquid-shape behaviour

**Status**: vanilla Ethereum.

The whole point of an "openhl-shape" chain is the precompiles and CLOB-driven payload assembly that distinguish Hyperliquid from generic EVM. Stage 8 (CLOB matching engine, fills-into-payload) and Stage 9 (custom precompiles, `clob_place_order` write path) live in `psyto/openhl` but aren't covered here. They're the natural Module 2 of a future course.

## Production-readiness checklist

Working from "I have a passing test" to "I'd let this take real value":

- [ ] All 7 Codec stubs replaced with real protobuf/borsh/JSON impls.
- [ ] `engine_newPayload` integration so the engine matches the bridge's view of canonical chain.
- [ ] Multi-validator integration test passing with N=2+ nodes against a shared chainspec.
- [ ] WAL crash-recovery test (kill mid-commit, restart, verify chain head).
- [ ] Persistent `home_dir` (not tempdir) configured for production deployments.
- [ ] Engine `SYNCING`/`VALID`/`INVALID` responses logged with `tracing::warn` / structured fields, not discarded.
- [ ] Slashing/double-sign hooks wired and unit-tested.
- [ ] Key rotation procedure (Ed25519 key swap during a chain restart, not at runtime).
- [ ] Operational telemetry: Prometheus metrics for round duration, payload build latency, validate failures.
- [ ] Performance baseline: blocks-per-second under continuous load (not just smoke test).
- [ ] Independent security review of the canonical encoding format (the L7 byte layout *is* part of your wire spec).
- [ ] Threat model for proposer manipulation under partial network partition.

If you're forking this course's code into a production chain, treat this list as the long-pole work — most of it is harder than the course itself.

## What you can now do that you couldn't 14 lessons ago

- **Bootstrap a full Rust BFT engine against a real EL.** Not "with a mocked EL", not "with an FFI to Go" — actually with `EthereumNode` running in the same Rust workspace.
- **Reason about producer/validator self-consistency.** When you have a builder and a validator for the same artifact, they must share a source of truth. You've seen this pattern in `chain_spec.next_block_base_fee` driving both `build_payload` and `validate_payload`.
- **Apply the incremental-stub pattern.** Trait bounds force surface area; if you can't fill it all at once, stub with a clear failure mode. L8's `CodecStub("SignedConsensusMsg<OpenHlContext>")` is the model.
- **Wire two pieces of generic infrastructure together.** Reth and Malachite were written by different teams with different sensibilities. The handshake interface (`Node` trait, `ConsensusBridge` trait) is what made them composable. Future courses will use the same pattern with other infra.
- **Distinguish protocol errors from operational errors.** `BridgeError::Rejected` vs `BridgeError::Internal`. `PayloadStatus::Invalid` vs propagating up. The conversational level matters.
- **Write tests that prove the live read happened.** L12's `assert_eq!(block.number, 1)` was the load-bearing check — anything else would have let an in-memory fallback slip past.

## Where to go next

Within rethlab:
- **Reth Expert** (track `reth-l1-architect`, course 7+) — deep dives on `BlockExecutor`, state-root verification, MDBX internals. Natural next once you want `validate_payload` to actually execute transactions.
- **Reth Consensus Engineering** — covers slashing, vote extensions, fault tolerance at depth. Where you'd go after multi-validator gossip is working.

Outside rethlab:
- **`psyto/openhl` Stages 8-9** — the CLOB and custom precompiles. Source code in the public repo; no walkthrough course yet.
- **Malachite spec docs** (`informalsystems/malachite`) — read the `core-types` crate's docs straight through. Half of it is now familiar; the other half is what multi-validator requires.
- **A real Reth full node** — clone `paradigmxyz/reth`, run `cargo run --bin reth -- node --chain dev`. Your `EthereumNode::default()` in L11 is the same thing, minus the consensus layer. Compare the surface.
- **`category-labs/monad-bft`** — a second mature Rust BFT consensus implementation, actively developed (672★ as of mid-2026, GPLv3-licensed). Where Malachite treats consensus as a generic state-machine library with a context type the embedding chain plugs into, Monad-BFT is purpose-built for a single execution layer and pipelines block proposal with execution to amortize finality latency. The two represent opposite honest trade-offs: **Malachite optimizes for *embeddability*** (easy to wire into anything, which is exactly what L0-L7 of this course did); **Monad-BFT optimizes for *single-chain throughput*** (faster, but harder to reuse). Worth reading after this course to internalize that "BFT in Rust" isn't a single shape. **License note:** GPLv3 means citing or studying it is fine; never copy code into your openhl tree — openhl is permissive-licensed and would inherit the copyleft.

## Closing note

You wrote roughly 1,400 lines of Rust across the consensus and EVM crates, plus ~250 lines of integration tests. That code is a *working single-validator Hyperliquid-shape L1*. It's not production-ready; it doesn't need to be. **What you have is a foundation that's honest about its scope, has every load-bearing decision visible, and is one extensible interface away from each next capability.**

The hardest part of an L1 isn't writing the engine — Malachite did most of it, and we just wired it. The hardest part is being honest about what your code can and can't do, and writing tests that prove the can side. Every lesson in this course had a happy-path assertion and a negative-path assertion. That's the discipline that takes you from "the test passes" to "the system works."

Now go build something that uses this.
````

---

## Seed-file slot

L15 opens new Module 7 (Capstone) at sortOrder 7:

```typescript
modules: {
  0: { title: 'Orientation', sortOrder: 0 },
  1: { title: 'Foundations', sortOrder: 1 },
  2: { title: 'Contract types', sortOrder: 2 },
  3: { title: 'EL test double', sortOrder: 3 },
  4: { title: 'CL types', sortOrder: 4 },
  5: { title: 'Engine integration', sortOrder: 5 },
  6: { title: 'Live Reth', sortOrder: 6 },
  7: { title: 'Capstone', sortOrder: 7 },  // NEW
},
```

```typescript
{
  title: "Lesson 15 — What you built, what's still stub, where to go next",
  slug: 'openhl-capstone-en',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 25,
  xpReward: 60,
  content: `# Lesson 15 — What you built, what's still stub, where to go next\n\n...`
},
```

## SHA pinning discipline

L15 does not cite a specific openhl SHA — it summarizes the journey across SHAs `75be9de` (L1) through `0cac571` (L14). The lesson's primary artifacts are conceptual (system map, production checklist, roadmap), not code.

## Style review notes (self-critique before paste)

- **No `cargo test` in §Goal** — capstone tone, comprehension over code.
- **The 4-method table is the load-bearing visual** — it's the proof that "the bridge talks to Reth" is now true on all four methods.
- **§What's still placeholder is honest** — 6 items, each labelled with "Status: missing/none/etc" and "what it would take." Not hand-wavy; specifically blockages named.
- **§Production-readiness checklist is a real punch list** — 12 checkbox items, deliberately harder than the course itself.
- **§Closing note is short and warm** — not motivational fluff, just a quick "you have a real thing, here's how to use it."
- **§Where to go next names specific things** — rethlab next courses, openhl Stages 8-9, the Malachite spec, comparing against `paradigmxyz/reth` directly. No vague "keep learning" advice.
