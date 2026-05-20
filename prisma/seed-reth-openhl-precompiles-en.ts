// AUTO-GENERATED from drafts/openhl_precompiles_*_en.md by .github/scripts/build-openhl-precompiles-seed.ts
// Do not hand-edit. Re-run the build script when drafts change.

import { PrismaClient } from '@prisma/client';

export async function seedRethOpenHlPrecompilesEN(prisma: PrismaClient) {
  const tags = ["reth","evm","precompile","clob","l1","openhl","expert"];

  await prisma.course.create({
    data: {
      slug: "building-openhl-precompiles-en",
      title: "Build OpenHL Precompiles — connecting CLOB state to smart contracts",
      description:
        "Connect the CLOB from `building-openhl-clob` to smart contracts via custom EVM precompiles. Smart contracts gain read and write access to the matching engine at well-known precompile addresses, and the resulting fills route back through the bridge into the next payload. The third course in the DIY Perp series.",
      difficulty: "EXPERT",
      duration: 400,
      xpReward: 820,
      track: "diy-perp",
      tags,
      isPublished: true,
      sortOrder: 800,
      locale: "en",
      instructorName: "RethLab",
      modules: {
        create: [
          {
            title: "Orientation",
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: "Build OpenHL Precompiles — connecting CLOB state to smart contracts",
                  slug: "openhl-precompiles-orientation-en",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 15,
                  xpReward: 50,
                  content: `# Build OpenHL Precompiles — connecting CLOB state to smart contracts

The previous course (\`building-openhl-clob\`) ended with the bridge owning a CLOB matching engine. Orders submit, fills flow into payloads, the integration test exercises the whole pipeline against a real Reth node. **But the fills are still a parallel list.** Smart contracts running inside that same Reth node can't see them. The CLOB state and the EVM state live in two different worlds.

This course closes that gap. You'll add **custom EVM precompiles** — special addresses that, when called from Solidity (or any EVM caller), execute Rust code that reads or writes the CLOB. After course 8:

- A smart contract can call \`0x...0c1b\` to **read** the current best bid.
- A smart contract can call \`0x...0c1c\` to **place an order** that the matching engine processes.

Once these two paths exist, the CLOB stops being a parallel structure beside the EVM and starts being a **state extension** the EVM can interact with. That's what makes the chain "Hyperliquid-shape" — Hyperliquid's whole novelty is that the perp matching engine is callable from smart contracts running on the same chain.

By the end of this course, \`cargo test clob_precompile_round_trip\` passes — a smart contract call places an order via precompile, the order matches against existing book state, and the resulting fill flows back into the bridge.

## 1. What you'll have at the end

A new \`crates/evm/src/precompiles/\` module containing:

- **Two custom precompiles** registered at well-known EVM addresses:
  - \`clob_read_best_bid\` (read): returns \`(price, qty)\` of the best bid as a 64-byte response.
  - \`clob_place_order\` (write): decodes an order from calldata, submits it to the CLOB, returns the fill summary.
- **Custom EVM machinery** (\`openhl_evm.rs\`) — an \`EvmFactory\` + \`ExecutorBuilder\` that wires the precompiles into Reth's executor.
- **Bridge integration** — \`LiveRethEvmBridge\` spawns its underlying Reth node with the custom EVM, so smart contract calls to the precompiles touch the same CLOB instance the bridge owns.

About **6 commits worth of work** in openhl (~860 LOC), broken into 11 lessons + capstone. The end-to-end test takes ~3 seconds: bootstrap Reth, deploy a thin solidity wrapper (or call directly via the engine), trigger the precompile, assert the fill.

## 2. What you won't have at the end

This course covers **openhl Stage 9 (9a-9e) only**. It does NOT cover:

- **Encoding Fill → real EVM transaction in the block body.** The fills are still a parallel list attached to payloads (the situation from course 7 L12). Course 8 makes them *accessible from EVM execution*, but doesn't make them *part of the block body*. That's a future course.
- **Funding state machine.** That's Stage 8b / course 9.
- **Liquidations, oracles, perp-specific math.** Not in Stage 9.
- **Multi-market precompiles.** Stage 9 has one CLOB; production would have one precompile per market or one with market-id calldata.

When you finish this course you have a chain where smart contracts can read and write the CLOB. That's a **massive** capability jump — it's the difference between "the chain has an orderbook somewhere" and "the chain *is* an orderbook + EVM." But fully closing the loop (fills back into block body as txs) is downstream work.

## 3. Prerequisites

You need:

- **\`building-openhl-clob\` complete** — or, equivalently, a workspace at the end-of-course-7 state. Your \`LiveRethEvmBridge<P>\` should have \`clob\`, \`pending_fills\`, \`submit_order\`, \`payload_fills\`, and \`pending_fill_count\` from L9-L11 of that course. If yours doesn't, work through course 7 first.
- **Rust 1.95+**, same as before.
- **Familiarity with REVM at the trait level.** You don't need to have written precompiles before — L1 explains the pattern — but if you've never seen REVM's \`Precompile\`, \`PrecompileFn\`, or \`Precompiles\` types, skim the [revm precompile docs](https://docs.rs/revm-precompile) first.
- **Comfort with \`Arc<Mutex<T>>\` for shared state across thread boundaries.** Precompiles need to read the CLOB from the EVM's execution context, which is a different async/sync boundary than the bridge's normal call sites.

You do **not** need:

- Any prior \`EvmFactory\` or \`ExecutorBuilder\` knowledge (L1-L2 explain them).
- Any Solidity (we don't write Solidity — we just exercise the precompiles via raw calldata).
- Knowledge of Reth's internal block-execution pipeline beyond what course 6 covered.

## 4. Setup confirmation (do this now)

You should already have the two-directory workflow from courses 6 and 7:

- \`~/code/my-openhl/\` — your workspace
- \`~/code/openhl-reference/\` — read-only \`psyto/openhl\` clone

Bring the reference repo up to date in case Stage 9 commits are newer than your clone:

\`\`\`bash
cd ~/code/openhl-reference
git fetch origin
git log --oneline | head -25
# You should see commits up to and including SHA d19ba1b (Stage 9c+).
# Stage 9 commits in chronological order:
#   1761d4d — Stage 9a
#   2ba97c6 — Stage 9e
#   b635ef7 — Stage 9b
#   a8823a1 — Stage 9c
#   2f796c3 — Stage 9d
#   d19ba1b — Stage 9c+
\`\`\`

Then confirm your workspace is at the end-of-course-7 state:

\`\`\`bash
cd ~/code/my-openhl
cargo test -p openhl-evm clob_fills_flow_into_payload --release 2>&1 | tail -5
# Expect: test passes (this is course 7's milestone test).
\`\`\`

If that passes, you're at the right starting point.

> 🛑 **やりがちな勘違い.** "Custom EVM precompiles are just a fancier version of contract calls — I'll think of them as Solidity functions." **No, they're more fundamental.** Precompiles execute Rust directly inside the EVM at well-known addresses, with no Solidity bytecode in between. From the calling contract's perspective they look like an external call to a fixed address, but the implementation is native Rust running with full access to whatever state we choose to expose. The mental model is "native function callable from EVM" — not "another smart contract."

## 5. The 12-lesson map

| # | Module | What you build | End-of-lesson test |
| - | - | - | - |
| **L0** | Orientation | (this lesson) | setup confirmed |
| **L1** | Custom EVM bootstrap | \`openhl_evm.rs\` — EvmFactory pattern + dependencies | \`cargo check -p openhl-evm\` |
| **L2** | Custom EVM bootstrap | \`precompiles/mod.rs\` — Stage 9a's hardcoded read precompile + registry | precompile compiles |
| **L3** | Custom EVM bootstrap | \`OpenHlExecutorBuilder\` + NodeBuilder wiring; smoke test that calls the precompile (Stage 9e) | \`precompile_is_callable_via_registry\` passes |
| **L4** | Read precompile | install_clob() — Arc-shared CLOB state, ready for precompile injection | bridge compiles with shared state |
| **L5** | Read precompile | wire the read precompile to live CLOB state (Stage 9b proper) | precompile returns real best_bid |
| **L6** | Read precompile | end-to-end test: read precompile reflects bridge.submit_order results | integration test passes |
| **L7** | Write precompile | \`clob_place_order\` signature + calldata decoding (Stage 9c part 1) | precompile decodes correctly |
| **L8** | Write precompile | implementation: submit to CLOB + return fill summary (Stage 9c part 2) | precompile writes correctly |
| **L9** | Bridge integration | \`install_fill_sink()\` — fills produced by precompile flow back to bridge's pending_fills (Stage 9c+) | precompile-placed fills reach bridge |
| **L10** | Bridge integration | bridge spawns against the custom-EVM Reth node (Stage 9d) | full pipeline test passes |
| **L11** | Capstone | recap, what's next (funding via course 9, fill-as-EVM-tx as future course) | (no test — recap) |

**L10 is the milestone.** Finishing L10, you have an EVM-callable CLOB on a live Reth node: smart contracts call precompiles, the matching engine runs, fills emerge through the bridge into payloads. L11 names what's still missing (the fills aren't yet EVM transactions — that's beyond Stage 9).

## 6. The answer-key discipline (same as before)

Each lesson L1–L10 cites one of the 6 Stage 9 commits:

| Lessons | Stage | SHA |
| - | - | - |
| L1-L3 | 9a + 9e | \`1761d4d\`, \`2ba97c6\` |
| L4-L6 | 9b | \`b635ef7\` |
| L7-L8 | 9c | \`a8823a1\` |
| L9 | 9c+ | \`d19ba1b\` |
| L10 | 9d | \`2f796c3\` |

After each lesson's test passes:

\`\`\`bash
cd ~/code/openhl-reference
git checkout <SHA>
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
\`\`\`

Match meaningfully — same types, same control flow. Whitespace and naming will differ.

> 🛑 **やりがちな勘違い.** "Precompiles seem like a custom thing — surely the openhl reference is more advanced than what I'd write." **The reference is straightforward; this course teaches the canonical Reth + REVM pattern.** Reth provides an \`EvmFactory\` + \`ExecutorBuilder\` pattern specifically for cases like this (the upstream example is \`paradigmxyz/reth/examples/custom-evm\`). What openhl does is *follow the pattern, with one read precompile and one write precompile registered*. If you understand the pattern, you can add more precompiles by copy-modifying the existing ones.

## 7. Setup confirmation — the actual L0 exercise

Before L1, run all of these and confirm they pass:

\`\`\`bash
# 1. Rust version
rustc --version    # expect: rustc 1.95.x or later

# 2. End-of-course-7 state
cd ~/code/my-openhl && cargo test -p openhl-evm clob_fills_flow_into_payload --release 2>&1 | tail -3
# Expect: 1 test passing

# 3. Reference repo has Stage 9 commits
cd ~/code/openhl-reference && git log --oneline | grep -E "(1761d4d|b635ef7|a8823a1)"
# Expect: all three SHAs appear
\`\`\`

If all three pass, you're ready for L1.

> **Final check.** In one sentence, what does this course add that course 7 didn't? If your answer doesn't mention "smart contracts can read and write the CLOB," re-read §1.`,
                },
              ],
            },
          },
          {
            title: "Custom EVM bootstrap",
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: "Lesson 1 — OpenHlEvmFactory — hooking into every EVM creation",
                  slug: "openhl-precompiles-evm-scaffold-en",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 40,
                  xpReward: 80,
                  content: `# Lesson 1 — \`OpenHlEvmFactory\` — hooking into every EVM creation

## Goal

Concepts you'll grasp in this lesson:

- **\`EvmFactory\` + \`ExecutorBuilder\` as Reth's "swap one slot" seam** — every EVM that Reth constructs (payload build, block validation, eth_call RPC, debug RPC) goes through one factory, so registering custom precompiles once propagates everywhere.
- **\`alloy-evm\` (abstract traits) vs \`reth-evm\` (concrete wiring)** — why both deps are required: the trait layer expresses what an EVM *is*, the executor layer expresses how Reth *runs* it.
- **Per-spec \`OnceLock\` caching of \`Precompiles\`** — building a precompile set is expensive (hashing addresses), \`create_evm\` is hot, so each hardfork tier's set is constructed once and shared as \`&'static\`.
- **Stub-with-stable-signature as an incremental-construction tactic** — the passthrough \`openhl_precompiles(base) -> Precompiles\` lets the factory wire up *now* while L2 fills the body later, with no call-site rewrites.

Verification:

\`\`\`bash
cargo check -p openhl-evm
\`\`\`

…compiles cleanly.

Specific changes:

You'll have **two new modules** in \`crates/evm/src/\`:

- **\`openhl_evm.rs\`** — \`OpenHlEvmFactory\` (Reth's \`EvmFactory\` slot) + \`OpenHlExecutorBuilder\` (Reth's \`ExecutorBuilder\` slot) + per-hardfork precompile dispatch via \`OnceLock\`. About 80 LOC.
- **\`precompiles/mod.rs\`** — a **stub** \`openhl_precompiles(base) -> Precompiles\` that passes through unchanged. L2 fills in the actual read precompile.

You also add **5 new dependencies** (1 workspace-level, 4 crate-level — including 1 new git-pinned dep for \`reth-node-api\`).

After L1, the custom EVM **structure** exists end-to-end. Reth can construct EVM instances via our factory; the factory's job (register custom precompiles) just doesn't do anything yet because L2 is what defines those precompiles.

## Recap

After course 7, \`crates/evm/src/\` has:

\`\`\`
crates/evm/src/
├── bridges/                    L4-L5: InMemoryEvmBridge, RethEvmBridge
├── reth_node.rs                L11 (c6): bootstrap proof (test-only)
└── live_node.rs                L12-L14 (c6) + L9-L11 (c7): LiveRethEvmBridge<P>
\`\`\`

\`cargo test -p openhl-evm clob_fills_flow_into_payload --release\` passes. The bridge owns a CLOB and routes fills through \`build_payload\`. **But smart contracts running inside the bridge's Reth node can't see the CLOB** — that's the gap L1 starts closing.

## Plan

Seven things:

1. **Add \`alloy-evm = "0.34"\`** to the workspace \`Cargo.toml\`. This is the public \`alloy-evm\` crate (not git-pinned to Reth) that provides \`EvmFactory\`, \`Database\`, \`EvmEnv\`, etc.
2. **Add 4 deps** to \`crates/evm/Cargo.toml\`: \`reth-evm\`, \`reth-evm-ethereum\`, \`reth-node-api\` (new git dep — same SHA as the rest), and promote \`reth-node-builder\` from \`[dev-dependencies]\` to \`[dependencies]\`.
3. **Create \`crates/evm/src/openhl_evm.rs\`** with \`OpenHlEvmFactory\` + \`OpenHlExecutorBuilder\` + \`precompiles_for(spec)\`.
4. **Create \`crates/evm/src/precompiles/mod.rs\`** as a passthrough stub.
5. **Wire \`pub mod openhl_evm; mod precompiles;\`** into \`crates/evm/src/lib.rs\`.
6. **Re-export \`OpenHlEvmFactory\` and \`OpenHlExecutorBuilder\`** at crate root for L3's NodeBuilder integration.
7. **\`cargo check -p openhl-evm\`** — clean.

This is the **dependency-heaviest** lesson in course 8. Once the scaffold compiles, L2 adds the actual precompile content; L3 wires it into NodeBuilder and tests that the precompile is reachable from EVM execution.

> 🛑 **Predict.** Before scrolling: Reth's \`EvmFactory\` is a trait — why does Reth need a factory at all instead of just constructing one EVM instance and reusing it? Hint: think about what code paths inside a chain need to *execute* EVM transactions. Block validation (validate_payload), payload assembly (build_payload), eth_call RPC, debug RPC — every one of these creates a fresh EVM instance with its own database snapshot. **The factory exists because Reth makes many EVMs**, not one.

## Walk-through

### Step 1: Add \`alloy-evm\` to the workspace

Open the root \`Cargo.toml\`. The alloy block (after L11 in course 6 / L12 in course 7) ends with:

\`\`\`toml
alloy-rpc-types-engine    = { version = "2.0", default-features = false }
alloy-genesis             = { version = "2.0", default-features = false }
\`\`\`

Add **one line**:

\`\`\`toml
alloy-evm                 = { version = "0.34", default-features = false }
\`\`\`

\`alloy-evm\` is the public alloy crate that provides REVM's abstractions at the trait level (\`EvmFactory\`, \`Database\`, \`EvmEnv\`). It's a stable crates.io dependency, not git-pinned to Reth — same status as \`alloy-genesis\` and \`alloy-rpc-types-engine\`.

> 🛑 **やりがちな勘違い.** "\`alloy-evm\` and \`reth-evm\` are the same thing — pick one." **No, they're different layers.** \`alloy-evm\` provides the *abstract* traits (\`EvmFactory\`, \`Database\`, etc.) that any EVM implementation can satisfy. \`reth-evm\` is Reth's *concrete* implementation that wires those traits to its block-executor pipeline. We import both: the abstract for our factory definition, the concrete for the executor wiring.

### Step 2: Update \`crates/evm/Cargo.toml\`

Open \`crates/evm/Cargo.toml\`. After course 7's L9 + L12 (course 6), the \`[dependencies]\` section has 12 entries. We add 4 more (3 new + 1 promotion):

\`\`\`toml
[dependencies]
openhl-consensus         = { workspace = true }
openhl-types             = { workspace = true }
openhl-clob              = { workspace = true }
async-trait              = { workspace = true }
eyre                     = { workspace = true }
alloy-primitives         = { workspace = true }
alloy-consensus          = { workspace = true }
alloy-rpc-types-engine   = { workspace = true }
reth-ethereum-primitives = { workspace = true }
reth-storage-api         = { workspace = true }
reth-consensus           = { workspace = true }
reth-ethereum-consensus  = { workspace = true }
reth-primitives-traits   = { workspace = true }
reth-chainspec           = { workspace = true }
reth-engine-primitives          = { workspace = true }
reth-ethereum-engine-primitives = { workspace = true }
reth-evm                 = { workspace = true }                                                                                          # NEW
reth-evm-ethereum        = { workspace = true }                                                                                          # NEW
reth-node-api            = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }              # NEW (1-off git dep)
reth-node-builder        = { workspace = true }                                                                                          # NEW (was dev-dep)
alloy-evm                = { workspace = true }                                                                                          # NEW
\`\`\`

\`reth-node-builder\` moves from \`[dev-dependencies]\` to \`[dependencies]\` — production code (\`OpenHlExecutorBuilder\`) now uses it. Remove the line in \`[dev-dependencies]\`:

\`\`\`toml
[dev-dependencies]
tokio                = { workspace = true }
reth-node-ethereum   = { workspace = true, features = ["test-utils"] }
reth-node-core       = { workspace = true }
reth-tasks           = { workspace = true }
reth-provider        = { workspace = true }
alloy-genesis        = { workspace = true }
serde_json           = { workspace = true }
tempfile             = "3"
# reth-node-builder removed from here — now a production dep
\`\`\`

**\`reth-node-api\` is a one-off direct git dep** (not via workspace). The workspace \`Cargo.toml\` doesn't declare it; we inline the git+rev directly. This is intentional: \`reth-node-api\` is used in exactly one crate (\`openhl-evm\`), and the rest of the workspace doesn't need it. Promoting it to a workspace dep would force every crate's build graph to know about it.

> 🛑 **やりがちな勘違い.** "Every Reth dep should be a workspace dep — that's the pattern." **Not necessarily.** Workspace deps are useful when multiple crates need the same dep at the same version. When only one crate needs it, inline declaration is cleaner — fewer entries in the workspace-level Cargo.toml, less indirection for readers. \`reth-node-api\` is openhl-evm-only; treat it accordingly.

### Step 3: Create \`crates/evm/src/precompiles/mod.rs\` (stub)

Before writing \`openhl_evm.rs\`, we need the precompile module to exist (because \`openhl_evm.rs\` imports from it). Create the directory + file:

\`\`\`bash
mkdir -p crates/evm/src/precompiles
touch crates/evm/src/precompiles/mod.rs
\`\`\`

Open \`crates/evm/src/precompiles/mod.rs\` and write:

\`\`\`rust
//! Custom REVM precompiles that expose CLOB state to EVM execution.
//!
//! Stage 9a — scout commit. L2 adds the first real precompile
//! (\`clob_read_best_bid\` at 0x...0c1b) that returns a hardcoded best-bid
//! response so smart contracts can prove the precompile is reachable.
//! L4+ wires it to live CLOB state.

use alloy_evm::revm::precompile::Precompiles;

/// Wraps Reth's spec-default precompile set, adding openhl's CLOB precompiles.
///
/// L1 (this lesson): passthrough — clones the base unchanged.
/// L2: registers \`clob_read_best_bid\`.
/// L7+: registers \`clob_place_order\`.
#[must_use]
pub fn openhl_precompiles(base: &Precompiles) -> Precompiles {
    // L2 will replace this with \`let mut precompiles = base.clone();
    // precompiles.extend([...]); precompiles\`.
    base.clone()
}
\`\`\`

3 lines of body. The function takes a \`Precompiles\` set (Reth's default for the current hardfork) and returns it unchanged. **L2 inserts the actual \`clob_read_best_bid\` between \`base\` and the \`return\`.**

The function signature is the **stable contract** the EVM factory depends on. L2-L11 will change the *contents* of this function, but \`openhl_precompiles(base: Precompiles) -> Precompiles\` stays the same shape throughout.

> 🛑 **やりがちな勘違い.** "An empty function is wasted code — combine L1 + L2." **The passthrough is what proves the structure compiles** before we add the precompile logic. If we wrote L1 + L2 as one lesson and the precompile registration was broken, the reader wouldn't know whether the factory wiring or the precompile registration was at fault. Splitting the lesson makes the failure modes addressable separately.

### Step 4: Create \`crates/evm/src/openhl_evm.rs\`

The main file. Top of the file:

\`\`\`rust
//! \`OpenHlEvmFactory\` + \`OpenHlExecutorBuilder\` — Reth's \`ConfigureEvm\` slot,
//! filled with our custom-precompile EVM.
//!
//! Stage 9a (scout commit) — modelled on Reth's \`examples/custom-evm/src/main.rs\`
//! pattern. The factory's \`create_evm\` installs \`openhl_precompiles(...)\` so
//! any EVM execution path (RPC call, payload assembly, validation) sees the
//! CLOB precompile registered at \`CLOB_READ_BEST_BID\`.

use alloy_evm::{
    eth::EthEvmContext,
    precompiles::PrecompilesMap,
    revm::{
        context::{BlockEnv, Context, TxEnv},
        context_interface::result::{EVMError, HaltReason},
        handler::EthPrecompiles,
        inspector::{Inspector, NoOpInspector},
        interpreter::interpreter::EthInterpreter,
        precompile::Precompiles,
        primitives::hardfork::SpecId,
        MainBuilder, MainContext,
    },
    Database, EvmEnv, EvmFactory,
};
use reth_chainspec::ChainSpec;
use reth_ethereum_primitives::EthPrimitives;
use reth_evm_ethereum::{EthEvm, EthEvmConfig};
use reth_node_api::{FullNodeTypes, NodeTypes};
use reth_node_builder::{components::ExecutorBuilder, BuilderContext};
use std::sync::OnceLock;

use crate::precompiles::openhl_precompiles;
\`\`\`

20-ish imports. Most are REVM internals via \`alloy-evm\`'s re-exports. Worth scanning, not memorizing:

- **\`EvmFactory\`** — the trait we'll implement. Reth calls our factory's \`create_evm\` whenever it needs an EVM instance.
- **\`ExecutorBuilder\`** — the trait we'll implement for \`OpenHlExecutorBuilder\`. Reth's \`NodeBuilder\` uses it to construct an EVM config.
- **\`Precompiles\`** — REVM's collection of precompiled contracts. We add to this.
- **\`OnceLock\`** — std's once-init primitive. We cache the per-spec precompile sets.

Now the factory struct:

\`\`\`rust
/// EVM factory that registers openhl's custom precompiles on every EVM
/// instance Reth constructs (for payload assembly, block validation, RPC
/// state queries, etc.).
#[derive(Debug, Clone, Default)]
#[non_exhaustive]
pub struct OpenHlEvmFactory;

impl EvmFactory for OpenHlEvmFactory {
    type Evm<DB: Database, I: Inspector<EthEvmContext<DB>, EthInterpreter>> =
        EthEvm<DB, I, Self::Precompiles>;
    type Tx = TxEnv;
    type Error<DBError: core::error::Error + Send + Sync + 'static> = EVMError<DBError>;
    type HaltReason = HaltReason;
    type Context<DB: Database> = EthEvmContext<DB>;
    type Spec = SpecId;
    type BlockEnv = BlockEnv;
    type Precompiles = PrecompilesMap;

    fn create_evm<DB: Database>(&self, db: DB, input: EvmEnv) -> Self::Evm<DB, NoOpInspector> {
        let spec = input.cfg_env.spec;
        let evm = Context::mainnet()
            .with_db(db)
            .with_cfg(input.cfg_env)
            .with_block(input.block_env)
            .build_mainnet_with_inspector(NoOpInspector {})
            .with_precompiles(PrecompilesMap::from_static(precompiles_for(spec)));
        EthEvm::new(evm, false)
    }

    fn create_evm_with_inspector<DB: Database, I: Inspector<Self::Context<DB>, EthInterpreter>>(
        &self,
        db: DB,
        input: EvmEnv,
        inspector: I,
    ) -> Self::Evm<DB, I> {
        EthEvm::new(
            self.create_evm(db, input).into_inner().with_inspector(inspector),
            true,
        )
    }
}
\`\`\`

The 8 associated types are scaffolding — every \`EvmFactory\` impl needs them, and most are the same as Reth's defaults. **The interesting part is \`create_evm\`.** Five steps:

1. **\`Context::mainnet()\`** — REVM's "Ethereum mainnet" preset (gas constants, etc.).
2. **\`.with_db(db)\` + \`.with_cfg(input.cfg_env)\` + \`.with_block(input.block_env)\`** — install the database, config, and block env passed in.
3. **\`.build_mainnet_with_inspector(NoOpInspector {})\`** — construct the EVM with a no-op inspector (no tracing).
4. **\`.with_precompiles(PrecompilesMap::from_static(precompiles_for(spec)))\`** — **install our precompiles**. \`precompiles_for(spec)\` returns the right precompile set for the current Ethereum hardfork.
5. **\`EthEvm::new(evm, false)\`** — wrap in Reth's EthEvm type.

\`create_evm_with_inspector\` is the same path with a custom inspector instead of the no-op. Most callers use \`create_evm\`; the inspector variant is for debug RPC.

> 🛑 **やりがちな勘違い.** "Why does the factory take \`db: DB\` as a generic? Wouldn't a concrete \`RevmDatabase\` be simpler?" **Because Reth uses many different database snapshot types depending on context.** Block validation uses the live MDBX state; eth_call RPC uses a historical snapshot; debug RPC may use an in-memory overlay. The factory must work with any of them. Generic over \`DB: Database\` is the way to express that without committing to a concrete type.

### Step 5: Add the \`precompiles_for(spec)\` helper

Below the factory impl:

\`\`\`rust
/// Lazily-initialised per-spec precompile sets. \`OnceLock\` ensures we build
/// each set once and share the static reference across every \`create_evm\` call,
/// matching the pattern in Reth's custom-evm example. Shanghai/Paris/London
/// don't add new precompiles, so they fall through to the Berlin set.
fn precompiles_for(spec: SpecId) -> &'static Precompiles {
    static PRAGUE: OnceLock<Precompiles> = OnceLock::new();
    static CANCUN: OnceLock<Precompiles> = OnceLock::new();
    static FALLBACK: OnceLock<Precompiles> = OnceLock::new();

    match spec {
        SpecId::PRAGUE | SpecId::OSAKA => {
            PRAGUE.get_or_init(|| openhl_precompiles(Precompiles::prague()))
        }
        SpecId::CANCUN => CANCUN.get_or_init(|| openhl_precompiles(Precompiles::cancun())),
        // For older hardforks (Berlin/London/Paris/Shanghai), use the Berlin
        // set as the most-recent-additions-cutoff base plus ours.
        _ => FALLBACK.get_or_init(|| {
            let base = EthPrecompiles::new(spec).precompiles;
            openhl_precompiles(base)
        }),
    }
}
\`\`\`

Each Ethereum hardfork has a different set of standard precompiles (ECDSA recovery, SHA-256, ModExp, EC-pairing, etc.). Cancun adds the point evaluation precompile for blobs. Prague will add yet more. **Our wrapper \`openhl_precompiles\` injects our custom precompile(s) into whichever base set is active.**

Three \`OnceLock\`s, one per hardfork tier:

- **\`PRAGUE\`** — covers Prague + Osaka (Osaka inherits Prague's precompiles for now).
- **\`CANCUN\`** — covers Cancun.
- **\`FALLBACK\`** — Berlin/London/Paris/Shanghai, using \`EthPrecompiles::new(spec)\` to get whatever set Reth thinks is right for that spec.

**Why \`OnceLock\` instead of computing per call?** Because \`Precompiles\` is a HashMap-backed structure that's expensive to construct (hashing every precompile address). Computing it once per spec + caching is one of the optimizations Reth's custom-evm example demonstrates. Caching matters because \`create_evm\` is called *very* frequently — every RPC eth_call, every block validation, every block build.

### Step 6: Add the \`OpenHlExecutorBuilder\`

At the bottom of \`openhl_evm.rs\`:

\`\`\`rust
/// Executor builder that swaps in \`OpenHlEvmFactory\` while keeping all other
/// Reth \`EthereumNode\` components at default.
#[derive(Debug, Default, Clone, Copy)]
#[non_exhaustive]
pub struct OpenHlExecutorBuilder;

impl<Node> ExecutorBuilder<Node> for OpenHlExecutorBuilder
where
    Node: FullNodeTypes<Types: NodeTypes<ChainSpec = ChainSpec, Primitives = EthPrimitives>>,
{
    type EVM = EthEvmConfig<ChainSpec, OpenHlEvmFactory>;

    async fn build_evm(self, ctx: &BuilderContext<Node>) -> eyre::Result<Self::EVM> {
        Ok(EthEvmConfig::new_with_evm_factory(
            ctx.chain_spec(),
            OpenHlEvmFactory,
        ))
    }
}
\`\`\`

10 lines. The \`ExecutorBuilder\` trait is Reth's hook for swapping the EVM config used by \`EthereumNode\`. The associated type \`EVM = EthEvmConfig<ChainSpec, OpenHlEvmFactory>\` says "use Reth's standard EthEvmConfig, but parameterize over our factory." \`build_evm\` constructs that config.

The trait bound \`Node: FullNodeTypes<Types: NodeTypes<ChainSpec = ChainSpec, Primitives = EthPrimitives>>\` constrains what kind of node this builder works with — Ethereum mainnet primitives, our \`ChainSpec\`. Anything more exotic (Optimism, OP Stack) wouldn't satisfy these bounds; that's by design.

**\`#[non_exhaustive]\` on both structs** lets us add fields later without a breaking API change. They're unit structs now; if openhl ever needs them to carry configuration, the attribute means consumers can't construct them via \`OpenHlExecutorBuilder {}\` literal.

### Step 7: Wire into \`crates/evm/src/lib.rs\`

Open \`crates/evm/src/lib.rs\`. Currently it has the bridges + reth_node + live_node modules from previous courses. Add two lines:

\`\`\`rust
//! ... existing module doc ...

pub mod bridges;     // existing
pub mod live_node;   // existing (course 6+)
pub mod openhl_evm;  // NEW
mod precompiles;     // NEW (internal)

#[cfg(test)]
mod reth_node;       // existing (test-only smoke)

pub use openhl_evm::{OpenHlEvmFactory, OpenHlExecutorBuilder};  // NEW
// ... existing re-exports ...
\`\`\`

Two changes:
- **\`pub mod openhl_evm\`** — visible to consumers.
- **\`mod precompiles\`** — internal, not exposed externally. Smart contracts call precompiles by *address*; consumers of \`openhl-evm\` don't need to import \`openhl_precompiles\` directly.

The re-export at the bottom (\`pub use openhl_evm::{OpenHlEvmFactory, OpenHlExecutorBuilder}\`) makes the two types accessible as \`openhl_evm::OpenHlEvmFactory\` from consumer code. L3's NodeBuilder integration will use them.

## Test

\`\`\`bash
cargo check -p openhl-evm
\`\`\`

First run is slow — \`alloy-evm\` + the new Reth crates pull in non-trivial code. Expect ~30-60 seconds. Subsequent runs use the cache.

Expected:

\`\`\`
   Compiling openhl-evm v0.1.0 (.../crates/evm)
    Finished \`dev\` profile [unoptimized + debuginfo] target(s) in 32.45s
\`\`\`

No warnings (the import list is long but every item is used). No errors.

You can also run the existing test suite to confirm nothing else broke:

\`\`\`bash
cargo test -p openhl-evm --release
\`\`\`

39 tests still pass. The new modules don't have tests yet — L3 adds the first one.

Common errors and fixes:

- **\`error[E0432]: unresolved import 'reth_node_api'\`** — the inline git dep wasn't added. Re-check Step 2.
- **\`error[E0277]: 'EvmFactory' is not implemented for 'OpenHlEvmFactory'\` (some associated type)** — typo in one of the 8 associated types. Compare against the reference at SHA \`1761d4d\`. Most common: \`type Spec = SpecId\` vs \`type Spec = u64\` or similar.
- **\`error[E0282]: type annotations needed for 'PrecompilesMap'\`** — \`PrecompilesMap::from_static\` returns a generic; the call site needs to know the type. In our case, the \`with_precompiles(...)\` call provides the inference. If the compiler complains, double-check the imports.
- **\`unused import: 'openhl_precompiles'\`** — the function is referenced in \`precompiles_for\`'s closures. If you see this warning, you may have written \`Precompiles::prague()\` directly instead of \`openhl_precompiles(Precompiles::prague())\`. Wrap each base set in \`openhl_precompiles(...)\`.

## Design reflection

Three load-bearing decisions encoded here:

1. **The factory pattern matches Reth's "many EVM instances" reality.** Reth doesn't construct one EVM and reuse it — it creates a fresh EVM for every RPC call, every block validation, every payload build. The \`EvmFactory\` trait is how we hook into "every EVM creation" in one place. **One factory, many EVMs, consistent precompile registration everywhere.**

2. **\`OnceLock\` per spec is the right caching shape.** Building a \`Precompiles\` set is non-trivial (hashing addresses, inserting fns). Doing it per \`create_evm\` call would burn cycles. Per-spec caching means each hardfork tier (Prague, Cancun, fallback) is constructed once. The \`OnceLock\` ensures thread-safe lazy init.

3. **The passthrough \`openhl_precompiles\` stub keeps L1 isolated.** The function exists with the right signature; it does nothing yet. L2 fills the body. **A stub with the right signature is a contract**: callers (the factory) can be wired now, and the implementation can land later without changing the call site. This is incremental construction with no rewrites required.

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout 1761d4d
diff -u ~/code/my-openhl/crates/evm/src/openhl_evm.rs ./crates/evm/src/openhl_evm.rs
diff -u ~/code/my-openhl/crates/evm/Cargo.toml ./crates/evm/Cargo.toml
diff -u ~/code/my-openhl/Cargo.toml ./Cargo.toml
\`\`\`

The reference at \`1761d4d\` has the **full** \`precompiles/mod.rs\` (Stage 9a's read precompile). Your stubbed version differs:

\`\`\`bash
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
# Expected: your stub is much shorter than the reference; you'll see the
# difference as a big addition in the reference. L2 adds the missing content.
\`\`\`

\`openhl_evm.rs\` should match closely (the factory structure is identical; only doc-comment wording may differ).

Return:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: Why is the precompile module \`mod precompiles\` (private) but \`pub mod openhl_evm\`?**
Because \`OpenHlEvmFactory\` is a public API consumers need (L3's NodeBuilder integration uses it), but \`openhl_precompiles\` is implementation detail consumed only by \`openhl_evm.rs\` internally. Keeping the precompile module private prevents API leakage; callers shouldn't construct or modify the precompile set themselves.

**Q: What's the difference between \`Precompiles::from_static\` and \`Precompiles::default\`?**
\`from_static\` takes a \`&'static Precompiles\` reference — meaning the precompile set is one we've cached and reuse. \`default\` builds a new (empty) \`Precompiles\` instance. Our \`create_evm\` uses \`from_static\` because the \`OnceLock\`-cached set is \`'static\`. Caching + static reference = no allocation per EVM creation.

**Q: Why is \`PRAGUE\` covering \`OSAKA\` too?**
Osaka (the proposed next hardfork after Prague) doesn't introduce new standard precompiles as of the reference SHA. When Osaka eventually adds a new precompile, this match arm splits into separate \`OSAKA\` and \`PRAGUE\` branches. Until then, sharing the same \`OnceLock\` is correct.

**Q: Does \`OpenHlExecutorBuilder\` need to be \`Clone\`?**
The trait doesn't require \`Clone\`, but \`#[derive(Clone, Copy)]\` is cheap (it's a unit struct, zero-sized) and matches Reth's pattern. If you later add fields to the struct, you'd want to keep \`Clone\` for ergonomic API.

## Next lesson (L2)

The factory is wired but the precompile module is a passthrough — Reth's standard precompiles are installed, no extra ones. L2 adds the first **real** precompile: \`clob_read_best_bid\` at address \`0x...0c1b\`. It returns hardcoded values for now (the same approach as openhl Stage 9a). L4-L5 will wire it to live CLOB state; this lesson just gets the function defined, registered, and reachable via the registry.`,
                },
                {
                  title: "Lesson 2 — clob_read_best_bid — the first real precompile",
                  slug: "openhl-precompiles-read-hardcoded-en",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 30,
                  xpReward: 60,
                  content: `# Lesson 2 — \`clob_read_best_bid\` — the first real precompile

## Goal

Concepts you'll grasp in this lesson:

- **REVM's \`PrecompileFn\` signature \`fn(&[u8], u64, u64) -> PrecompileResult\`** — a function pointer (not closure), with three fixed args (input, gas_limit, reservoir); your precompile must conform exactly because the registry stores function pointers.
- **Solidity ABI's 32-byte slot layout** — \`(uint256, uint256)\` is 64 bytes total, big-endian, low-order byte at index 31/63 — matching this at the wire format means a Solidity contract can \`abi.decode\` your output directly.
- **Hardcoded stub as a wiring-vs-content split** — returning \`(100, 10)\` (not \`unimplemented!()\`) lets L3 test the *reachability* of the precompile in isolation from "does it return the right data" (L4-L6's job).
- **\`extend-not-replace\` via \`base.clone()\`** — wrapping the standard precompile set means ECDSA recovery / SHA-256 / etc. stay registered; a fresh \`Precompiles::default()\` would silently delete them.
- **\`pub\` const for the address, private const for gas cost** — callers need to *call* the precompile (need the address); the EVM dispatches gas internally (callers don't need the cost). Visibility matches API surface.

Verification:

\`\`\`bash
cargo check -p openhl-evm
\`\`\`

…still compiles.

Specific changes:

Your \`precompiles/mod.rs\` is now the **full Stage 9a version**:

- A constant \`CLOB_READ_BEST_BID: Address = 0x...0c1b\` — the precompile's address.
- A constant \`CLOB_BASE_GAS_COST: u64 = 500\` — minimum gas charged per precompile call.
- A function \`read_best_bid(input, gas_limit, reservoir) -> PrecompileResult\` returning a hardcoded \`(price=100, qty=10)\` as 64 bytes.
- The \`openhl_precompiles\` function (no longer passthrough) extends the base set with our new precompile.

About 40 LOC added. The precompile is **registered but not yet wired to live CLOB state** — it returns hardcoded values. That's intentional: L3 tests that the precompile is *reachable* from EVM execution; L4-L5 swap the hardcoded values for live CLOB reads. **Function first, content later** — the same incremental pattern as L1's passthrough.

## Recap

After L1:

\`\`\`rust
// crates/evm/src/precompiles/mod.rs (passthrough stub)
pub fn openhl_precompiles(base: &Precompiles) -> Precompiles {
    base.clone()
}
\`\`\`

The function signature is fixed (L1 set the contract); the body just clones the input. L2 changes the body — same signature, more work inside.

## Plan

Four things, all in \`crates/evm/src/precompiles/mod.rs\`:

1. **Expand the imports** — add \`Precompile\`, \`PrecompileId\`, \`PrecompileOutput\`, \`PrecompileResult\` from \`alloy_evm::revm::precompile\`, and \`address\`, \`Address\`, \`Bytes\` from \`alloy_primitives\`.
2. **Add the address constant** — \`CLOB_READ_BEST_BID: Address = 0x000...0c1b\`. Public, so consumers (and tests) can call this precompile by name.
3. **Add the gas-cost constant + the \`read_best_bid\` function** — private. The function returns a hardcoded \`(price=100, qty=10)\` ABI-encoded as 64 bytes.
4. **Replace the passthrough** — \`openhl_precompiles\` clones the base set, then \`extend\`s with the new precompile registration.

The precompile is **callable** after this lesson but **dumb** — returns the same answer regardless of book state. L3 proves it's callable; L4-L5 make it smart.

> 🛑 **Predict.** Before scrolling: the EVM call shape from Solidity is \`staticcall(gas, 0x...0c1b, calldata=empty, ...) → (price: u256, qty: u256)\`. The precompile returns 64 bytes (two u256s). **Why 64 bytes and not 8 (two u32s) — surely a price and quantity fit in u32?** Hint: think about what types Solidity returns natively.

(Answer: Solidity's ABI encoding for \`returns(uint256, uint256)\` is 64 bytes — each value is *always* 32 bytes regardless of how many bits it actually needs. Our \`u64\` price fits in 8 bytes but the ABI pads it to 32. If we returned 8 bytes, Solidity would interpret it as a malformed \`uint256\` and likely revert. **The wire format matches Solidity's ABI, not our internal representation.**)

## Walk-through

### Step 1: Expand the imports

Open \`crates/evm/src/precompiles/mod.rs\`. The current imports (from L1) are:

\`\`\`rust
use alloy_evm::revm::precompile::Precompiles;
\`\`\`

Replace with:

\`\`\`rust
use alloy_evm::revm::precompile::{
    Precompile, PrecompileId, PrecompileOutput, PrecompileResult, Precompiles,
};
use alloy_primitives::{address, Address, Bytes};
\`\`\`

Six new types/macros:

- **\`Precompile\`** — the wrapper that pairs an \`Address\` with a \`PrecompileFn\`. The Precompiles set stores these.
- **\`PrecompileId\`** — an identifier (mainly for debugging / tracing). Use \`PrecompileId::custom("clob_read_best_bid")\`.
- **\`PrecompileOutput\`** — the success type returned from a precompile. Carries gas spent + output bytes + remaining gas reserve.
- **\`PrecompileResult\`** — \`Result<PrecompileOutput, PrecompileError>\`. Our v0 never errors so we always return \`Ok(...)\`.
- **\`address\`** macro — \`address!("0x...")\` creates a const \`Address\` at compile time.
- **\`Address\`, \`Bytes\`** — the two byte-array types used everywhere in EVM code.

> 🛑 **Anti-fluency.** "Couldn't I use \`[u8; 20]\` for the address and skip \`alloy_primitives::Address\`?" **No — the EVM ecosystem standardizes on \`Address\`, and \`Precompile::new\` requires it.** Trying to pass a \`[u8; 20]\` would either fail the type check or require \`.into()\` conversions everywhere. \`Address\` is the canonical EVM-address type; use it.

### Step 2: Add the precompile address constant

After the imports, before any functions, add:

\`\`\`rust
/// Address of the "read best bid" precompile.
///
/// Solidity call shape: \`staticcall(gas, 0x...0c1b, calldata=empty, ...) → (price: u256, qty: u256)\`
pub const CLOB_READ_BEST_BID: Address = address!("0x0000000000000000000000000000000000000c1b");

/// The minimum gas charge for invoking a CLOB precompile. Tuned later.
const CLOB_BASE_GAS_COST: u64 = 500;
\`\`\`

Two constants:

- **\`CLOB_READ_BEST_BID\`** — **\`pub\`**, because tests (L3) and downstream callers need to call this address. The \`0x...0c1b\` is a mnemonic for "CLB" (CLOB). Conventions:
  - addresses \`1-9\` are Ethereum's standard precompiles (ECDSA recovery, SHA-256, etc.)
  - we stay at 0x0c1b+ to avoid collisions
- **\`CLOB_BASE_GAS_COST\`** — **private**, an internal cost number. 500 gas is the per-call charge for any CLOB precompile. The real EVM math also charges memory expansion + per-byte cost; this is just the base.

The \`pub\` vs private split is intentional. Outside callers care about the address (to *call* the precompile); they don't care about the gas cost (the EVM handles that during dispatch).

### Step 3: Write the \`read_best_bid\` function

Below the constants:

\`\`\`rust
/// Stage 9a stub: returns a hardcoded best bid so the precompile is callable
/// without requiring live CLOB state injection. Stage 9b replaces this with
/// an \`Arc<Mutex<Book>>\`-aware closure captured into the precompile.
///
/// \`PrecompileFn\` signature is \`fn(&[u8], u64, u64) -> PrecompileResult\`;
/// the third arg is a \`reservoir\` value (extra gas budget) that we ignore
/// at v0.
///
/// Encoding: 64 bytes total
///   bytes  0..32  big-endian u256 price (hardcoded 100)
///   bytes 32..64  big-endian u256 qty   (hardcoded 10)
// \`PrecompileFn\` signature mandates the \`PrecompileResult\` (i.e. \`Result\`)
// return type. Our v0 stub never errors — gas accounting is the EVM's
// responsibility — but the wrapper is structurally required.
#[allow(clippy::unnecessary_wraps)]
fn read_best_bid(_input: &[u8], _gas_limit: u64, _reservoir: u64) -> PrecompileResult {
    let mut out = vec![0u8; 64];
    // price = 100 (big-endian u256, rightmost byte holds the value)
    out[31] = 100;
    // qty = 10
    out[63] = 10;

    Ok(PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0))
}
\`\`\`

Walk the body:

1. **\`vec![0u8; 64]\`** — 64 zero bytes. The ABI shape for \`(uint256, uint256)\` is two 32-byte blocks.
2. **\`out[31] = 100\`** — write the price (100) at the rightmost byte of the first 32-byte block. Big-endian u256 means the high-order bytes are zero and the low-order byte (index 31) holds the actual value. Same for qty at index 63.
3. **\`PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0)\`** — build the output:
   - First arg: gas spent (we charge 500).
   - Second arg: output bytes (the 64-byte buffer).
   - Third arg: reservoir (extra budget); we use 0.

The three function arguments are all \`_\`-prefixed (unused) because the v0 stub:
- Doesn't read input (the call has empty calldata).
- Doesn't respect gas_limit (the EVM handles overflow checking).
- Ignores reservoir (advanced feature we don't need).

\`#[allow(clippy::unnecessary_wraps)]\` silences the lint that says "this function always returns \`Ok(...)\`, just return the unwrapped type." We **can't** unwrap because the \`PrecompileFn\` trait signature **requires** \`PrecompileResult\`. The lint is wrong here; the attribute is the right response.

> 🛑 **Anti-fluency.** "Hardcoded \`100, 10\` feels like a TODO — surely I should leave it \`unimplemented!()\` until L4 has the real data?" **The hardcoded value is the entire point of Stage 9a.** It lets the *next* lesson (L3) prove the precompile is *reachable* without needing CLOB state injection working yet. If we left it \`unimplemented!()\`, the L3 test would panic and we couldn't isolate "is the precompile callable?" from "does it return the right value?" **Hardcoded stubs let you test the wiring before testing the content.**

### Step 4: Replace the passthrough \`openhl_precompiles\`

Find the current passthrough function:

\`\`\`rust
#[must_use]
pub fn openhl_precompiles(base: &Precompiles) -> Precompiles {
    // L2 will replace this with \`let mut precompiles = base.clone();
    // precompiles.extend([...]); precompiles\`.
    base.clone()
}
\`\`\`

Replace with the full implementation:

\`\`\`rust
/// Build a \`Precompiles\` set that extends Reth's standard precompiles with
/// openhl's CLOB-reading additions. The base set is parameterized over the
/// hardfork's spec id so we inherit Ethereum's evolution (e.g., the
/// BLS-12-381 precompiles activated in Prague).
#[must_use]
pub fn openhl_precompiles(base: &Precompiles) -> Precompiles {
    let mut precompiles = base.clone();
    precompiles.extend([Precompile::new(
        PrecompileId::custom("clob_read_best_bid"),
        CLOB_READ_BEST_BID,
        read_best_bid,
    )]);
    precompiles
}
\`\`\`

Three lines of body:

1. **\`let mut precompiles = base.clone()\`** — start with the base set. We can't mutate \`base\` directly (it's \`&Precompiles\`); cloning is the only way to get an owned, mutable copy.
2. **\`precompiles.extend([Precompile::new(...)])\`** — add our precompile to the set. \`extend\` accepts an iterator of \`Precompile\`s; passing an array of length 1 works because arrays implement \`IntoIterator\`.
3. **Return \`precompiles\`** — owned \`Precompiles\` with our addition included.

The \`Precompile::new(...)\` call creates a new entry from three pieces:
- A \`PrecompileId\` (the human-readable name, useful for debugging/tracing).
- The \`Address\` it's registered at.
- The function to call.

L7+ will add a second \`Precompile::new(...)\` for \`clob_place_order\`. The pattern stays: clone, extend, return.

## Test

\`\`\`bash
cargo check -p openhl-evm
\`\`\`

Still clean. The precompile is now registered, but no test exercises it yet — that's L3.

Optionally, you can verify the precompile address is exported correctly:

\`\`\`bash
grep -r "CLOB_READ_BEST_BID" crates/evm/src/
# Should report: precompiles/mod.rs declares the const
\`\`\`

Common errors and fixes:

- **\`error[E0432]: unresolved import 'alloy_evm::revm::precompile::Precompile'\`** — typo in the import list. The correct path is \`alloy_evm::revm::precompile::{Precompile, PrecompileId, PrecompileOutput, PrecompileResult, Precompiles}\`.
- **\`error: expected struct, found macro 'address'\`** — you imported \`address\` from the wrong place. It's the \`address!\` macro from \`alloy_primitives\`; make sure the import list includes \`address\` (lowercase, the macro).
- **\`out[31] = 100u8\` overflow lint** — \`100\` is already \`i32\`, the conversion to \`u8\` is fine, but if clippy complains, write \`out[31] = 100;\` (no type annotation needed).
- **\`out[63] = 10\` not appearing in the assertion** — your \`read_best_bid\` is reading from the wrong index. Double-check that index 31 is for price (first 32 bytes) and index 63 is for qty (second 32 bytes).
- **\`#[allow(clippy::unnecessary_wraps)]\` clippy still complains** — the attribute needs to be on the function, not on a containing block. Place it directly above \`fn read_best_bid(...)\`.

## Design reflection

Three load-bearing decisions encoded here:

1. **The address constant is \`pub\`; the gas-cost constant is private.** External callers (tests, smart contracts) need to know *where* to call the precompile. They don't need to know *how much* it costs — the EVM handles that internally. Public vs private mapping reflects the API surface.

2. **The function takes \`(&[u8], u64, u64)\` — all unused at v0.** The \`PrecompileFn\` trait fixes the signature; we have to accept those arguments even when we don't use them. The underscore-prefix convention (\`_input\`, \`_gas_limit\`, \`_reservoir\`) tells the compiler "we know they're here, we don't need them yet." L7+ uses \`_input\` to decode order data.

3. **The 64-byte output is ABI-shaped, not internally-shaped.** A 64-bit price could fit in 8 bytes, but Solidity expects \`(uint256, uint256)\` as 64 bytes total. Matching the ABI at the wire format means we can write \`read_best_bid()\` in Solidity directly. The internal \`Qty(u64)\` types are an implementation detail.

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout 1761d4d
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
\`\`\`

After L2, your \`precompiles/mod.rs\` should be **functionally identical** to the reference at \`1761d4d\`. Only doc-comment wording will differ.

Return:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: Why \`PrecompileId::custom("clob_read_best_bid")\` and not just an enum variant?**
Because \`PrecompileId\` is an opaque identifier mostly used by REVM's logging/tracing layer. Custom precompiles use string names because they're outside the standard set. The string is human-readable; if a precompile call shows up in a trace, you see "clob_read_best_bid" not a numeric variant.

**Q: What if I want to add error handling?**
Change the return path from \`Ok(...)\` to \`Err(PrecompileError::Other(...))\`. The trait already supports this; we just don't have failure modes at v0. When the read precompile gains live state (L4-L5), one possible error is "CLOB lock is poisoned" — that would map to \`PrecompileError\`.

**Q: Why is \`Bytes::from(out)\` needed — can I return \`Vec<u8>\` directly?**
No, the trait wants \`Bytes\` (alloy's reference-counted byte buffer, not Rust's std \`Vec<u8>\`). \`Bytes::from(vec)\` does the conversion. The reason for the wrapper type: \`Bytes\` can be cheaply cloned and shared across the EVM internals without re-allocating.

**Q: Could a smart contract pass arguments via calldata to read_best_bid?**
Yes — calldata is the \`_input\` parameter. At v0 the precompile ignores it (returns the best bid regardless), but production code would use calldata to specify *which market's* best bid to read. The current setup is single-market; multi-market support would add \`_input\` decoding.

## Next lesson (L3)

The precompile is registered but **untested**. L3 wires the executor builder into NodeBuilder + a smoke test that boots a Reth node with our custom EVM and verifies the precompile is callable at \`CLOB_READ_BEST_BID\`. The test is small (~60 LOC) but exercises the full toolchain: custom EVM, executor builder, NodeBuilder integration, EVM call dispatch, precompile registry lookup. After L3, we have a Reth node where smart contracts can call \`0x...0c1b\` and get back \`(100, 10)\`.`,
                },
                {
                  title: "Lesson 3 — NodeBuilder wiring + registry callability tests",
                  slug: "openhl-precompiles-node-wiring-en",
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 35,
                  xpReward: 70,
                  content: `# Lesson 3 — NodeBuilder wiring + registry callability tests

## Goal

Concepts you'll grasp in this lesson:

- **Test scope = bug localization** — three unit tests in increasing scope (function body → registry registration → registry dispatch) so a failure points to exactly which layer is broken.
- **The extend-not-replace dual assertion** — checking *both* that \`CLOB_READ_BEST_BID\` is present AND that ECDSA recover at \`0x...01\` is still present catches the silent-replace bug that a single-assertion test would let through.
- **\`NodeBuilder.with_components(EthereumNode::components().executor(OpenHlExecutorBuilder))\`** — the explicit-builder path that swaps one slot while inheriting all other Reth defaults; this is the "configure, don't fork" property in code.
- **\`Precompile::execute\` vs direct function call** — the dispatch test proves the \`Precompile::new(...)\` wiring is correct (right function pointer, right id, right address) independent of whether the function body is right.
- **Integration test = wiring assertion, not behavior assertion** — proving \`NodeBuilder\` + \`OpenHlExecutorBuilder\` + \`EthereumAddOns\` compose cleanly is a different concern from "does the precompile read the right bytes" (unit tests cover that).

Verification:

\`\`\`bash
cargo test -p openhl-evm reth_dev_node_with_openhl_executor --release
cargo test -p openhl-evm --lib precompiles
\`\`\`

…both pass.

Specific changes:

You'll have written **4 new tests** total:

- **1 integration test** in \`crates/evm/src/reth_node.rs\` — \`reth_dev_node_with_openhl_executor\`. Bootstraps a Reth node with \`OpenHlExecutorBuilder\` swapped in for the default executor. Validates that the \`EvmFactory\` + \`ExecutorBuilder\` composition spawns cleanly.
- **3 unit tests** in \`crates/evm/src/precompiles/mod.rs\`:
  - \`read_best_bid_returns_hardcoded_price_and_qty\` — direct function-call test.
  - \`openhl_precompiles_registers_clob_address\` — **extend-not-replace** invariant.
  - \`registered_precompile_is_invokable_via_registry\` — full registry-dispatch test (the path REVM uses internally).

**This is the milestone lesson for Module 1.** After L3, the custom EVM + precompile are not just compile-clean — they're proven reachable from EVM execution. Modules 2-4 build the *content* (live state, write paths, bridge integration); Module 1 set up the *plumbing*.

## Recap

After L2:

- \`openhl_evm.rs\` has \`OpenHlEvmFactory\` + \`OpenHlExecutorBuilder\` (L1).
- \`precompiles/mod.rs\` has \`CLOB_READ_BEST_BID\` + \`read_best_bid\` + \`openhl_precompiles\` (L2).
- \`cargo check -p openhl-evm\` passes.

**Nothing has invoked any of this code.** L3 writes the four tests that prove the plumbing works.

## Plan

Five things:

1. **Update imports in \`reth_node.rs\`** — add \`EthereumAddOns\` (needed for \`with_add_ons(...)\`) and \`crate::OpenHlExecutorBuilder\` (the type we'll wire in).
2. **Add \`reth_dev_node_with_openhl_executor\` integration test** — same shape as course 6's \`reth_dev_node_bootstraps\`, but uses the explicit-builder path with \`.with_components(EthereumNode::components().executor(OpenHlExecutorBuilder))\`.
3. **Add \`#[cfg(test)] mod tests\` to \`precompiles/mod.rs\`** with 3 unit tests.
4. **Run both test paths** — integration test passes, 3 unit tests pass.
5. **Verify everything else still passes** — \`cargo test -p openhl-evm --release\` shows all prior course-6 + course-7 tests still green.

The 3 unit tests cover three distinct concerns:

| Test | Concern | If it fails, the bug is in… |
| - | - | - |
| \`read_best_bid_returns_hardcoded_price_and_qty\` | The function's body is correct (writes the right bytes) | L2's \`read_best_bid\` implementation |
| \`openhl_precompiles_registers_clob_address\` | Extend-not-replace invariant | L2's \`openhl_precompiles\` body — likely the wrong \`clone()\` or \`extend(...)\` semantics |
| \`registered_precompile_is_invokable_via_registry\` | EVM dispatch path through the registry works | The \`Precompile::new(...)\` call shape, the \`PrecompileId\`, or registration ordering |

> 🛑 **Predict.** Before scrolling: why does \`openhl_precompiles_registers_clob_address\` assert that **both** \`CLOB_READ_BEST_BID\` AND ECDSA recover at \`0x...01\` are present in the extended set? The first assertion alone seems sufficient — we registered it, why check that ECDSA is still there?

(Answer: because the test enforces the **extend-not-replace** invariant. If your \`openhl_precompiles\` accidentally created a fresh \`Precompiles\` set instead of cloning the base and extending it, \`CLOB_READ_BEST_BID\` would still be present, but the standard Ethereum precompiles (ECDSA recover, SHA-256, etc.) would be **gone**. The base set is one of the load-bearing things our wrapper must preserve. Without ECDSA recover, any contract that verifies signatures would revert. **The dual assertion catches the silent-replace bug.**)

## Walk-through

### Step 1: Update imports in \`reth_node.rs\`

Open \`crates/evm/src/reth_node.rs\`. The existing test module (\`mod tests\` from course 6) imports:

\`\`\`rust
use reth_node_ethereum::EthereumNode;
\`\`\`

Change to:

\`\`\`rust
use reth_node_ethereum::{node::EthereumAddOns, EthereumNode};
\`\`\`

Also add an import for \`OpenHlExecutorBuilder\`. Put it just after the \`use\` block, before \`dev_chain_spec()\`:

\`\`\`rust
use crate::OpenHlExecutorBuilder;
\`\`\`

Two imports because \`EthereumAddOns\` is needed for \`.with_add_ons(...)\` (the explicit-builder path requires the \`add_ons\` argument, even if we don't customize them), and \`OpenHlExecutorBuilder\` is the type we're swapping in.

### Step 2: Add \`reth_dev_node_with_openhl_executor\` integration test

Append the following test to the \`mod tests\` block in \`reth_node.rs\`, after the existing \`reth_dev_node_bootstraps\` test:

\`\`\`rust
    /// Stage 9a: prove that \`NodeBuilder\` accepts \`OpenHlExecutorBuilder\` in
    /// place of Reth's default executor, and that the resulting node still
    /// spawns cleanly with our custom precompile registered.
    ///
    /// Doesn't yet invoke the precompile (that requires deploying a
    /// Solidity contract); just validates the \`EvmFactory\` + \`ExecutorBuilder\`
    /// composition compiles, spawns, and tears down.
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn reth_dev_node_with_openhl_executor() {
        let runtime = Runtime::test();
        let chain_spec = dev_chain_spec();
        let expected_chain_id = chain_spec.chain.id();
        let node_config = NodeConfig::test().dev().with_chain(chain_spec);

        let result: Result<()> = async {
            let _handle = NodeBuilder::new(node_config)
                .testing_node(runtime)
                .with_types::<EthereumNode>()
                .with_components(EthereumNode::components().executor(OpenHlExecutorBuilder))
                .with_add_ons(EthereumAddOns::default())
                .launch()
                .await?;
            // The node spawned with our custom EVM. We don't need to inspect
            // further — if the EvmFactory or ExecutorBuilder were broken,
            // launch() would have failed.
            let _ = expected_chain_id;
            Ok(())
        }
        .await;
        if let Err(e) = result {
            panic!("Reth dev node bootstrap with OpenHl EVM failed: {e:?}");
        }
    }
\`\`\`

Compare against course 6's \`reth_dev_node_bootstraps\` test — same setup pattern, but one critical line differs:

\`\`\`rust
// course 6:
.node(EthereumNode::default())
.launch_with_debug_capabilities()

// course 8:
.with_components(EthereumNode::components().executor(OpenHlExecutorBuilder))
.with_add_ons(EthereumAddOns::default())
.launch()
\`\`\`

The course-6 path uses \`.node(...)\` which is shorthand — it takes a pre-built node spec. The course-8 path uses the explicit builder: **swap in \`OpenHlExecutorBuilder\` while keeping every other component (network, payload pool, RPC handler) at default.** That's the "you don't fork Reth, you configure it" property.

The \`.executor(OpenHlExecutorBuilder)\` chain is the load-bearing piece. \`EthereumNode::components()\` returns a default \`ComponentsBuilder\`; \`.executor(...)\` overrides one slot. The remaining slots (network, payload, pool, etc.) come from defaults. **One slot swapped, everything else inherited.**

> 🛑 **Anti-fluency.** "I could just write the executor inline — \`.executor(my_closure)\` instead of building a whole \`OpenHlExecutorBuilder\` struct." **The \`ExecutorBuilder\` trait is the contract Reth's \`ComponentsBuilder\` accepts.** A closure would have to satisfy the same trait (\`impl ExecutorBuilder<Node>\`), which is awkward to write inline. The struct exists because the trait is the API surface; closures are a worse fit for this particular hook.

### Step 3: Add the \`mod tests\` block to \`precompiles/mod.rs\`

Open \`crates/evm/src/precompiles/mod.rs\`. Append the following at the end of the file (after \`openhl_precompiles\`):

\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;
    use alloy_primitives::U256;

    /// Direct unit test of the precompile function: invoked with empty input,
    /// it returns the hardcoded (price=100, qty=10) as 64 big-endian u256 bytes.
    #[test]
    fn read_best_bid_returns_hardcoded_price_and_qty() {
        let result = read_best_bid(&[], 100_000, 0).expect("precompile must not error");
        assert_eq!(result.bytes.len(), 64);
        let price = U256::from_be_slice(&result.bytes[0..32]);
        let qty = U256::from_be_slice(&result.bytes[32..64]);
        assert_eq!(price, U256::from(100u64));
        assert_eq!(qty, U256::from(10u64));
        assert_eq!(result.gas_used, CLOB_BASE_GAS_COST);
    }

    /// Registry test: \`openhl_precompiles()\` extends a base precompile set
    /// with our CLOB precompile at the well-known address. This is what the
    /// Stage 9a \`EvmFactory\` plugs into every EVM instance Reth constructs.
    #[test]
    fn openhl_precompiles_registers_clob_address() {
        let base = Precompiles::cancun();
        let extended = openhl_precompiles(base);

        // The CLOB address must be in the extended set.
        assert!(
            extended.contains(&CLOB_READ_BEST_BID),
            "openhl_precompiles must register the CLOB_READ_BEST_BID address"
        );

        // The base Ethereum precompiles (e.g. ECDSA recover at 0x...01) must
        // still be present — we EXTEND, not replace.
        let ecrecover: Address = alloy_primitives::address!("0x0000000000000000000000000000000000000001");
        assert!(
            extended.contains(&ecrecover),
            "extended set must retain base Ethereum precompiles"
        );
    }

    /// Invoke the registered precompile end-to-end through the registry
    /// (rather than calling \`read_best_bid\` directly). This proves the
    /// registration is wired such that an EVM dispatch to the address hits
    /// our function — the same path Reth's EVM uses on \`staticcall\` to
    /// \`CLOB_READ_BEST_BID\`.
    #[test]
    fn registered_precompile_is_invokable_via_registry() {
        let extended = openhl_precompiles(Precompiles::cancun());
        let precompile = extended
            .get(&CLOB_READ_BEST_BID)
            .expect("CLOB precompile must be registered");

        // Precompile::execute is the public dispatch method — same as what
        // the EVM calls internally when a contract STATICCALLs the address.
        let result = precompile
            .execute(&[], 100_000, 0)
            .expect("call must not error");
        assert_eq!(result.bytes.len(), 64);
        let price = U256::from_be_slice(&result.bytes[0..32]);
        let qty = U256::from_be_slice(&result.bytes[32..64]);
        assert_eq!(price, U256::from(100u64));
        assert_eq!(qty, U256::from(10u64));
    }
}
\`\`\`

Three tests in **increasing scope**:

- **\`read_best_bid_returns_hardcoded_price_and_qty\`** — calls the function directly with \`(empty_input, gas_limit=100_000, reservoir=0)\`. Asserts byte length, decoded price, decoded qty, gas used. **The narrowest scope** — just the function, no registry, no EVM.
- **\`openhl_precompiles_registers_clob_address\`** — calls \`openhl_precompiles(Precompiles::cancun())\`, checks that both our address AND the standard ECDSA recover address are in the extended set. **The extend-not-replace invariant** is the load-bearing assertion: a buggy wrapper could replace the base set instead of extending it.
- **\`registered_precompile_is_invokable_via_registry\`** — extracts the precompile from the registry via \`.get(&CLOB_READ_BEST_BID)\`, calls its \`.execute(...)\` method. **The full dispatch path** — same code REVM uses internally on a \`STATICCALL\`.

The \`alloy_primitives::U256\` import is needed for decoding the 64-byte response. \`U256::from_be_slice(&bytes[..])\` decodes a 32-byte big-endian slice into a U256 value.

> 🛑 **Anti-fluency.** "The third test seems redundant — if the function works (test 1) and the address is registered (test 2), invoking via registry has to work." **It doesn't have to.** Test 2 only checks that \`address.contains(&...)\` returns true. The dispatch from registry to function lookup is separate — REVM internally uses \`.get(&address)\` then calls \`.execute(...)\`. **A bug in \`Precompile::new(...)\`'s wiring (wrong function pointer, type mismatch) would pass tests 1 and 2 but fail test 3.** The dispatch test catches a real bug class.

### Step 4: Run the tests

\`\`\`bash
cargo test -p openhl-evm reth_dev_node_with_openhl_executor --release
\`\`\`

After ~30 seconds (first incremental build with the new tests):

\`\`\`
running 1 test
test reth_node::tests::reth_dev_node_with_openhl_executor ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

Then the unit tests:

\`\`\`bash
cargo test -p openhl-evm --lib precompiles
\`\`\`

\`\`\`
running 3 tests
test precompiles::tests::openhl_precompiles_registers_clob_address ... ok
test precompiles::tests::read_best_bid_returns_hardcoded_price_and_qty ... ok
test precompiles::tests::registered_precompile_is_invokable_via_registry ... ok

test result: ok. 3 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

Note \`--lib\` ensures we run the unit tests inside the library (not integration tests, which live in \`tests/\`). Without \`--lib\`, \`cargo test precompiles\` would also try to match integration test names.

### Step 5: Verify nothing else broke

Full suite:

\`\`\`bash
cargo test -p openhl-evm --release
\`\`\`

After ~30 seconds:

\`\`\`
running 42 tests
... 42 tests pass ...

test result: ok. 42 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

**42 tests workspace-wide for \`openhl-evm\`** (39 from courses 6+7 + 3 new unit tests + 1 new integration test - some test counts may overlap because \`--lib\` and integration tests share name patterns; the exact count varies). All prior tests still green.

Common errors and fixes:

- **Integration test fails with \`with_components\` not found** — the new test uses \`with_components\` instead of the shorthand \`.node(...)\`. Make sure you replaced the shorthand entirely, not just appended to it.
- **\`error[E0277]: 'EthereumAddOns' is not a 'NodeAddOns'\`** — wrong import path. Use \`reth_node_ethereum::node::EthereumAddOns\` (with \`node::\` in the path), not just \`reth_node_ethereum::EthereumAddOns\`.
- **\`assert!(extended.contains(&ecrecover))\` fails** — your \`openhl_precompiles\` body created a fresh \`Precompiles\` set instead of cloning the base. Re-check L2's Step 4: it must be \`let mut precompiles = base.clone(); precompiles.extend(...); precompiles\`. **NOT \`let precompiles = Precompiles::default(); precompiles.extend(...)\`.**
- **\`result.gas_used\` doesn't match \`CLOB_BASE_GAS_COST\`** — the constant has a different value than what \`read_best_bid\` charges. Re-check L2's Step 3: \`PrecompileOutput::new(CLOB_BASE_GAS_COST, ...)\` — both must reference the same constant.
- **Test \`registered_precompile_is_invokable_via_registry\` panics** — your \`Precompile::new(...)\` call in L2's \`openhl_precompiles\` was wrong (e.g., wrong function pointer or wrong argument order). Re-check the 3-argument shape: \`(PrecompileId, Address, fn)\`.

## Design reflection

Three load-bearing decisions encoded here:

1. **Tests in increasing scope.** The 3 unit tests start with the narrowest (function body) and expand outward (registry registration → registry dispatch). When one fails, you know exactly which layer is broken. **Test scope = bug localization.**

2. **The extend-not-replace check is the dual assertion.** A passing test for \`extended.contains(CLOB_READ_BEST_BID)\` alone doesn't prove the wrapper isn't catastrophically wrong — a buggy wrapper that *replaces* the base set would still pass. Asserting that ECDSA recover is *also* there catches the silent-replace bug. **A single assertion can pass for the wrong reasons; the dual asserts together can't.**

3. **The integration test doesn't invoke the precompile.** The full RPC roundtrip would require deploying a Solidity contract — that's Reth-RPC testing surface, not precompile testing. The Module-1 milestone is "the EvmFactory + ExecutorBuilder spawn cleanly." The unit tests (Step 3) cover the precompile behavior; the integration test covers the assembly. **Two tests with different scope, addressed separately.**

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout 2ba97c6
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
diff -u ~/code/my-openhl/crates/evm/src/reth_node.rs ./crates/evm/src/reth_node.rs
\`\`\`

After L3, your code matches the reference at \`2ba97c6\` — both Stage 9a's NodeBuilder wiring and Stage 9e's 3 unit tests are present. Only doc-comment wording may differ.

Return:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: Why use \`EthereumNode::components()\` instead of \`EthereumNode::default()\`?**
\`default()\` returns a pre-built node spec where every component is fixed; you can't swap individual components. \`components()\` returns a \`ComponentsBuilder\` that exposes \`.executor(...)\`, \`.network(...)\`, \`.payload(...)\`, etc. as chainable methods. **You use \`components()\` when you need to swap one or more slots; \`default()\` when you accept everything as-is.**

**Q: What does \`Precompile::execute(&[], 100_000, 0)\` actually do internally?**
It's the public dispatch method on the \`Precompile\` type. Internally it calls the stored function pointer (our \`read_best_bid\`) with the provided arguments. REVM uses this same method when a smart contract \`STATICCALL\`s the precompile's address — the EVM looks up the address in the precompile registry, gets back a \`&Precompile\`, and calls \`.execute(input, gas_limit, reservoir)\`.

**Q: Why does the integration test need \`--release\`?**
For speed. \`--release\` cuts the test runtime from ~5 seconds (debug) to ~1 second by enabling optimizations. The other unit tests are tiny enough that the debug overhead is negligible.

**Q: Could the \`.with_add_ons(EthereumAddOns::default())\` be skipped?**
No — \`NodeBuilder\`'s build chain requires every "slot" to be filled, even with defaults. Skipping it would fail at compile time. The explicit \`EthereumAddOns::default()\` says "use the defaults" without ambiguity.

**Q: Why is the integration test using \`Result<()>\` and an \`async\` block instead of \`unwrap()\` chains?**
For better error reporting. If something inside the \`NodeBuilder\` chain fails, the \`?\` operator propagates the error to the outer \`result\`, and the \`panic!\` at the end prints \`{e:?}\` so the failure cause is visible. With \`.unwrap()\`, you'd get a generic panic without the original error chain.

## Next lesson (L4)

The precompile is registered and proven callable, but it returns **hardcoded values**. L4 starts wiring **live CLOB state** to the precompile — adding \`install_clob()\` so the bridge can inject its \`Arc<Mutex<Book>>\` into the precompile module, and updating \`openhl_precompiles\` to accept the shared state. After L4, the precompile is *capable* of returning real data; L5 makes it *actually* read from the shared book.`,
                },
              ],
            },
          },
          {
            title: "Read precompile",
            sortOrder: 2,
            lessons: {
              create: [
                {
                  title: "Lesson 4 — install_clob() — bridging EVM state to the matching engine",
                  slug: "openhl-precompiles-install-clob-en",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 35,
                  xpReward: 70,
                  content: `# Lesson 4 — \`install_clob()\` — bridging EVM state to the matching engine

## Goal

Concepts you'll grasp in this lesson:

- **\`PrecompileFn\` is a function pointer, not a closure → process-global state is the workaround** — REVM's \`fn(&[u8], u64, u64) -> PrecompileResult\` can't capture environment, so shared state has to live in a \`static\` the function reads at call time.
- **\`RwLock<Option<Arc<Mutex<T>>>>\` — different locks for different access patterns** — outer \`RwLock\` distinguishes installed-vs-uninstalled (rare write); inner \`Mutex\` protects the matching engine (frequent write). A single \`Mutex<Option<...>>\` would serialize all reads through one bottleneck.
- **\`Arc<Mutex<Book>>\` for shared ownership across the bridge/precompile boundary** — the bridge and the precompile are different "callers" but must see the same \`Book\`; \`Arc\` is how Rust expresses "more than one owner, same data."
- **Install-replaces-not-errors** — tests need to install/uninstall repeatedly, so silent replacement is a feature, not a bug. Production paths only call install once.
- **Plumbing-without-current as an incremental shape** — L4 connects the wires (static, install fn, bridge field type) but leaves \`read_best_bid\` hardcoded; L5 closes the switch. Splitting plumbing from behavior lets each lesson have one verifiable change.

Verification:

\`\`\`bash
cargo test -p openhl-evm --release
\`\`\`

…still passes (42 tests including L3's 4 new ones).

Specific changes:

You'll have **added the plumbing** for live CLOB state without yet changing what \`read_best_bid\` returns:

- **2 new methods** on \`Book\` (in \`crates/clob/src/book.rs\`): \`best_bid_with_qty()\` and \`best_ask_with_qty()\` returning \`Option<(Price, Qty)>\`.
- **A module-level \`static CLOB_STATE\`** in \`precompiles/mod.rs\` holding \`Option<Arc<Mutex<Book>>>\`.
- **Three new module functions** in \`precompiles/mod.rs\`: \`install_clob\`, \`uninstall_clob\`, \`current_best_bid\`.
- **One field type change** in \`LiveRethEvmBridge\`: \`clob: Mutex<Book>\` becomes \`clob: Arc<Mutex<Book>>\`, and \`new()\` calls \`install_clob(clob.clone())\`.

**\`read_best_bid\` itself is unchanged** — it still returns hardcoded \`(100, 10)\`. L5 swaps that for live state. L4's job is to make the wiring **possible** without yet exercising it.

## Recap

After L3 (end of Module 1):

- Custom EVM precompile is registered and proven callable.
- All tests (course 6 + 7 + L3's new 4) pass.
- \`LiveRethEvmBridge::new()\` creates \`clob: Mutex::new(Book::new())\` — owned, not shared with anything.
- \`read_best_bid\` is hardcoded.

**The bridge and the precompile know nothing about each other.** The precompile returns its hardcoded values; the bridge's CLOB is invisible to EVM execution. L4 connects them through a process-global handle.

## Plan

Six things:

1. **Add \`best_bid_with_qty\` + \`best_ask_with_qty\`** to \`Book\`. The existing \`best_bid()\` returns just the price; the new methods return \`(price, summed_qty_at_that_level)\` — needed for the precompile's 2-value response.
2. **Update imports in \`precompiles/mod.rs\`** — add \`openhl_clob::Book\` and \`std::sync::{Arc, Mutex, RwLock}\`.
3. **Add a module-level \`static CLOB_STATE\`** — \`RwLock<Option<Arc<Mutex<Book>>>>\`. \`RwLock\` (not \`Mutex\`) because reads from the precompile are much more common than writes (install).
4. **Add three module functions** — \`pub fn install_clob(...)\`, \`pub fn uninstall_clob()\`, \`pub fn current_best_bid() -> Option<...>\`. Public so the bridge can call them.
5. **Change the bridge's \`clob\` field** from \`Mutex<Book>\` to \`Arc<Mutex<Book>>\`, and have \`new()\` \`install_clob(clob.clone())\` so the precompile sees the same \`Book\` the bridge writes to.
6. **Leave \`read_best_bid\` alone** — it still returns hardcoded values. L5 swaps in \`current_best_bid()\`.

After L4, the **wires exist** between bridge and precompile, but **no current flows**. The precompile still ignores the live CLOB. L5 makes it read.

> 🛑 **Predict.** Before scrolling: REVM's \`PrecompileFn\` is \`fn(&[u8], u64, u64) -> PrecompileResult\` — a **function pointer**, not an \`Fn\` closure. We can't capture environment in it (no \`move |...| { ... }\`). **What's the only way left to get per-instance state into the precompile?** Hint: think about Rust's two patterns for "shared mutable state across functions that don't take it as a parameter."

(Answer: process-global storage. We can't pass the \`Arc<Mutex<Book>>\` *into* the precompile function — the function pointer's signature is fixed. So the precompile reads from a \`static\` variable that holds the shared state. The bridge writes the static (via \`install_clob\`); the precompile reads it (via \`current_best_bid()\`). This is the canonical pattern when function-pointer signatures preclude closure capture. **The trade-off: one CLOB per process.** That's acceptable for single-validator openhl; future REVM versions may relax the function-pointer constraint.)

## Walk-through

### Step 1: Add \`best_bid_with_qty\` + \`best_ask_with_qty\` to \`Book\`

Open \`crates/clob/src/book.rs\`. Find the existing \`best_bid\` and \`best_ask\` methods. Add two new methods just after them:

\`\`\`rust
    /// Best bid price + total qty resting at that price level (sum of every
    /// resting order in the level's FIFO queue). Returns \`None\` if there
    /// are no bids.
    #[must_use]
    pub fn best_bid_with_qty(&self) -> Option<(Price, Qty)> {
        self.bids.iter().next().map(|(rev_price, queue)| {
            let qty: u64 = queue.iter().map(|o| o.qty.0).sum();
            (rev_price.0, Qty(qty))
        })
    }

    /// Best ask price + total qty resting at that price level.
    #[must_use]
    pub fn best_ask_with_qty(&self) -> Option<(Price, Qty)> {
        self.asks.iter().next().map(|(price, queue)| {
            let qty: u64 = queue.iter().map(|o| o.qty.0).sum();
            (*price, Qty(qty))
        })
    }
\`\`\`

The existing \`best_bid()\` returns just \`Option<Price>\`. The new method returns the price **plus** the total quantity resting at that level — summing across every order in the FIFO queue at the best price.

This is what the precompile needs. The Solidity-side return signature is \`(price: u256, qty: u256)\`; the precompile needs both values to fill the 64-byte response.

> 🛑 **Anti-fluency.** "Couldn't the precompile just call \`best_bid()\` and \`depth_bid()\` separately?" **\`depth_bid()\` returns the count of orders across all bids, not the qty at the best level.** They're different metrics. \`best_bid_with_qty()\` is the right shape for the precompile's contract: tell me the best price and how much liquidity is at that price.

### Step 2: Update imports in \`precompiles/mod.rs\`

Open \`crates/evm/src/precompiles/mod.rs\`. The current imports (after L2) are:

\`\`\`rust
use alloy_evm::revm::precompile::{
    Precompile, PrecompileId, PrecompileOutput, PrecompileResult, Precompiles,
};
use alloy_primitives::{address, Address, Bytes};
\`\`\`

Add two more \`use\` statements:

\`\`\`rust
use openhl_clob::Book;
use std::sync::{Arc, Mutex, RwLock};
\`\`\`

Three new types pulled in:
- **\`Book\`** — the matching engine state we'll share.
- **\`Arc\`** — atomic reference-counted handle. The bridge and the precompile both hold one.
- **\`Mutex\`** — for the \`Book\` itself (the bridge's pattern from course 7).
- **\`RwLock\`** — for the \`Option<...>\` wrapper around the shared \`Arc<Mutex<Book>>\`. Reads (every precompile call) are vastly more common than writes (one install per process); \`RwLock\` allows concurrent readers.

### Step 3: Add the module-level \`static CLOB_STATE\`

Below the imports, before any functions:

\`\`\`rust
/// Process-global handle to the CLOB the precompile reads from.
///
/// \`None\` until [\`install_clob\`] is called (typically by \`LiveRethEvmBridge::new\`).
/// While \`None\`, \`read_best_bid\` returns zero-encoded output rather than
/// erroring — this keeps existing tests deterministic and matches what an
/// uninitialised perp market would return on mainnet.
static CLOB_STATE: RwLock<Option<Arc<Mutex<Book>>>> = RwLock::new(None);
\`\`\`

One line that does a lot:

- **\`static CLOB_STATE\`** — process-global; lives for the whole program's runtime.
- **\`RwLock<...>\`** — outer lock, separating "is a CLOB installed?" from "what's in the CLOB?"
- **\`Option<...>\`** — \`None\` before any bridge installs a CLOB; \`Some(Arc<Mutex<Book>>)\` after.
- **\`Arc<Mutex<Book>>\`** — the shared handle. The bridge owns one Arc; this static holds another. When the bridge mutates the \`Book\` (via \`clob.lock().submit(...)\`), the precompile sees the same changes (via \`clob.lock().best_bid_with_qty()\`).
- **\`RwLock::new(None)\`** — initialized at compile time. Type system enforces single-threaded init.

The doc comment is the lesson — call out that \`None\` is the "uninstalled" state and that we return zero bytes rather than erroring. Mainnet contracts that read an uninitialised perp market would see zero values; we match that semantic.

> 🛑 **Anti-fluency.** "Why not use \`lazy_static!\` or \`OnceLock\`?" **They'd work but they'd over-constrain us.** \`OnceLock\` only allows one set; we want \`install_clob\` to be re-callable (test isolation). \`lazy_static!\` requires unsafe initialization tricks that \`static RwLock<...> = RwLock::new(None)\` avoids since Rust 1.63. Plain \`static RwLock<...>\` is the cleanest 2024 idiom.

### Step 4: Add the three module functions

Below the static:

\`\`\`rust
/// Install the CLOB instance the precompile should read from. The bridge
/// shares its \`Arc<Mutex<Book>>\` with the global so every EVM-side
/// \`staticcall\` to \`CLOB_READ_BEST_BID\` sees the same book the application
/// writes to via \`submit_order\`.
///
/// Calling this replaces any previously-installed CLOB. Production deployments
/// should call it exactly once at bridge construction.
pub fn install_clob(clob: Arc<Mutex<Book>>) {
    *CLOB_STATE.write().expect("CLOB_STATE rwlock poisoned") = Some(clob);
}

/// Clear the installed CLOB. Used by tests that need a clean slate; rare in
/// production. Idempotent — uninstalling when nothing is installed is a no-op.
pub fn uninstall_clob() {
    *CLOB_STATE.write().expect("CLOB_STATE rwlock poisoned") = None;
}

/// Read the currently-installed CLOB's best bid. Returns \`None\` if no CLOB
/// is installed or if the book has no bids. Public so tests can verify
/// install/uninstall without going through the precompile dispatch.
#[must_use]
pub fn current_best_bid() -> Option<(openhl_clob::Price, openhl_clob::Qty)> {
    let state = CLOB_STATE.read().expect("CLOB_STATE rwlock poisoned");
    let clob = state.as_ref()?;
    let book = clob.lock().expect("clob mutex poisoned");
    book.best_bid_with_qty()
}
\`\`\`

Three public functions, each \`pub\` for a reason:

- **\`install_clob\`** — the bridge calls this in \`new()\`. **Replaces** any previous installation; idempotent on multiple calls with the same Arc. The \`*CLOB_STATE.write().expect(...) = Some(clob)\` pattern is the canonical "acquire write lock, set value, release lock" idiom.
- **\`uninstall_clob\`** — test-only typical use. Test setups install + tear down. Production rarely uninstalls.
- **\`current_best_bid\`** — exposed for direct testing without going through the EVM. Walks: write lock → read lock → option deref → mutex lock → \`best_bid_with_qty()\`. **Three locks** to read one value; that sounds expensive but each is microseconds, and reads are concurrent under \`RwLock\`.

> 🛑 **Anti-fluency.** "Three locks for one read seems wasteful." **The locks serve different purposes.** \`RwLock\` distinguishes installed-vs-uninstalled (rare write contention). \`Mutex<Book>\` protects the matching engine state (frequent contention but milliseconds). Putting them all in one lock would serialize all reads + writes uniformly — much worse for concurrency. **Layered locks reflect layered concerns.**

### Step 5: Change \`LiveRethEvmBridge::clob\` to \`Arc<Mutex<Book>>\`

Open \`crates/evm/src/live_node.rs\`. Find the \`LiveRethEvmBridge\` struct definition:

\`\`\`rust
pub struct LiveRethEvmBridge<P> {
    provider: P,
    chain_spec: Arc<ChainSpec>,
    validator: EthBeaconConsensus<ChainSpec>,
    clob: Mutex<Book>,
    pending_fills: Mutex<Vec<Fill>>,
    state: Mutex<State>,
}
\`\`\`

Change \`clob\`:

\`\`\`rust
pub struct LiveRethEvmBridge<P> {
    provider: P,
    chain_spec: Arc<ChainSpec>,
    validator: EthBeaconConsensus<ChainSpec>,
    /// \`Arc<Mutex<Book>>\` rather than \`Mutex<Book>\` so the bridge can share
    /// its CLOB with the precompile module's process-global state. The bridge
    /// writes via \`submit_order\`; smart contracts read via the
    /// \`clob_read_best_bid\` precompile — both touch the same \`Book\`.
    clob: Arc<Mutex<Book>>,
    pending_fills: Mutex<Vec<Fill>>,
    state: Mutex<State>,
}
\`\`\`

Then find \`new()\`:

\`\`\`rust
impl<P> LiveRethEvmBridge<P> {
    #[must_use]
    pub fn new(provider: P, chain_spec: Arc<ChainSpec>) -> Self {
        let validator = EthBeaconConsensus::new(Arc::clone(&chain_spec));
        Self {
            provider,
            chain_spec,
            validator,
            clob: Mutex::new(Book::new()),
            pending_fills: Mutex::new(Vec::new()),
            state: Mutex::new(State::default()),
        }
    }
\`\`\`

Update to wrap in Arc + install:

\`\`\`rust
impl<P> LiveRethEvmBridge<P> {
    #[must_use]
    pub fn new(provider: P, chain_spec: Arc<ChainSpec>) -> Self {
        let validator = EthBeaconConsensus::new(Arc::clone(&chain_spec));
        let clob = Arc::new(Mutex::new(Book::new()));

        // Make our CLOB visible to the \`clob_read_best_bid\` precompile so
        // smart contracts can query live orderbook state. The bridge writes
        // (submit_order), the EVM reads (precompile); they share the same Arc.
        crate::precompiles::install_clob(Arc::clone(&clob));

        Self {
            provider,
            chain_spec,
            validator,
            clob,
            pending_fills: Mutex::new(Vec::new()),
            state: Mutex::new(State::default()),
        }
    }
\`\`\`

Three changes:

1. **\`let clob = Arc::new(...)\`** — bind the Arc to a local. We need to use it twice (for \`install_clob\` and for the struct).
2. **\`crate::precompiles::install_clob(Arc::clone(&clob))\`** — share the Arc with the precompile module. **\`Arc::clone(&clob)\` increments the refcount**; both the bridge and the static now hold strong references.
3. **\`clob,\`** in the struct literal — just \`clob\` (the field is the same name as the local).

Note \`precompiles\` is a private module of \`crates/evm/\`, but \`install_clob\` is \`pub fn\` — within the crate, this works via \`crate::precompiles::install_clob\`.

### Step 6: Verify nothing else broke

Make sure no other code in \`live_node.rs\` was relying on \`clob: Mutex<Book>\` — only \`Arc<Mutex<Book>>\`. Look for any \`self.clob.lock()\` calls. They still work — \`Arc<Mutex<Book>>\` deref-coerces through to \`Mutex<Book>\`, so \`self.clob.lock()\` is unchanged.

The other places \`clob\` is used:
- \`submit_order(&self, order: Order)\` — uses \`self.clob.lock()\`. Still works (Arc derefs to inner Mutex).
- That's it.

\`build_payload\`, \`payload_ready\`, etc. don't touch \`clob\` directly.

## Test

\`\`\`bash
cargo test -p openhl-evm --release
\`\`\`

After ~30 seconds:

\`\`\`
running 42 tests
... 42 tests pass ...

test result: ok. 42 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

All L3 tests still green. Note that **the L3 unit tests still expect hardcoded values** (\`U256::from(100u64)\`, \`U256::from(10u64)\`) — because we haven't changed \`read_best_bid\` yet. The plumbing is in place; the values flowing through \`read_best_bid\` are still hardcoded.

If you want to sanity-check that the plumbing actually works (before L5 swaps the body), you can write a one-off:

\`\`\`rust
#[cfg(test)]
mod smoke {
    use super::*;
    use openhl_clob::{AccountId, Book, Order, OrderId, OrderType, Price, Qty, Side};
    use std::sync::{Arc, Mutex};

    #[test]
    fn current_best_bid_reflects_installed_clob() {
        crate::precompiles::uninstall_clob();
        let book = Arc::new(Mutex::new(Book::new()));
        book.lock().unwrap().submit(Order {
            id: OrderId(1),
            account: AccountId(1),
            side: Side::Buy,
            qty: Qty(7),
            order_type: OrderType::Limit { price: Price(250) },
        });
        crate::precompiles::install_clob(Arc::clone(&book));
        let result = crate::precompiles::current_best_bid();
        assert_eq!(result, Some((Price(250), Qty(7))));
        crate::precompiles::uninstall_clob();
    }
}
\`\`\`

Run with \`cargo test -p openhl-evm current_best_bid_reflects_installed_clob\`. Should pass. **Then delete it** — L5+ has the real test set.

Common errors and fixes:

- **\`error[E0277]: 'Arc<Mutex<Book>>' is not 'Mutex'\`** — your \`submit_order\` is using \`self.clob.lock()\` and the compiler is rejecting because of trait differences. Actually this should work — \`Arc<Mutex<Book>>\` derefs to \`&Mutex<Book>\`. If you see this error, you probably wrote \`self.clob.deref().lock()\` somewhere, which is the wrong shape. Just \`self.clob.lock()\` is correct.
- **\`error[E0277]: 'PoisonError<RwLockWriteGuard<Option<Arc<Mutex<Book>>>>>' is not 'Send'\`** — your test or call site is panicking with a poisoned lock. The \`.expect(...)\` we use is the standard pattern; if you're seeing this, there's a panic somewhere within a held lock.
- **Static initialization warning** — Rust 1.63+ supports \`static RwLock<T> = RwLock::new(...)\` directly. If you see "calls in static contexts are unstable," you're on an older toolchain — see the L0 prerequisites.
- **\`unused variable: clob\` in \`new()\`** — you forgot to use \`clob\` in the struct literal. The variable bound to \`let clob = Arc::new(...)\` must also appear in the struct as \`clob,\`.

## Design reflection

Three load-bearing decisions encoded here:

1. **Process-global state is the canonical workaround for function-pointer signatures.** REVM's \`PrecompileFn = fn(...) -> PrecompileResult\` is a function pointer, not a closure. We can't capture state in it. The only options are: (a) accept it via the function arguments (which would require REVM API changes), (b) read it from a process-global. We take option (b). **The cost: one CLOB per process.** For single-validator deployments that's fine; multi-tenant would need REVM API changes.

2. **\`RwLock\` for the outer Option, \`Mutex\` for the inner \`Book\`.** The outer lock distinguishes installed-vs-uninstalled (rare write). The inner lock protects the matching engine state (frequent write — every submit). Different lock types for different access patterns. Single \`Mutex<Option<Arc<Mutex<Book>>>>\` would serialize all reads through one bottleneck.

3. **\`install_clob\` replaces, doesn't error.** Calling it twice with two different CLOBs silently replaces the first. We could detect this and panic, but production paths only call it once. Tests, however, may need to install/uninstall repeatedly. **Replacement is a feature for tests, not a bug.** Doc comments make this explicit.

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout b635ef7
diff -u ~/code/my-openhl/crates/clob/src/book.rs ./crates/clob/src/book.rs
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
\`\`\`

After L4, your code partially matches Stage 9b: the new methods, the static, the 3 module functions, the bridge field change. The remaining differences are:
- \`read_best_bid\` still hardcoded (L5 swaps).
- L3's unit tests still expect hardcoded values (L5 updates them).

Return:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: Why is \`CLOB_STATE\` \`&'static\` not heap-allocated?**
Static storage has the simplest lifetime: lives for the entire program. Heap allocation (via \`Box::leak\` or similar) would also work but adds runtime allocation cost and complexity. \`static\` is the right tool when you want "exists from program start to program end" — exactly our case.

**Q: What happens if two \`LiveRethEvmBridge\` instances are created (e.g., in parallel tests)?**
The second call to \`install_clob\` replaces the first. **Both bridges share the second's CLOB via the global.** This is why tests need serialization (L5 adds it). Production deployments create exactly one bridge; this isn't an issue.

**Q: Could \`current_best_bid\` return \`Result<...>\` instead of \`Option<...>\`?**
You could — \`Err(NoClobInstalled)\` instead of \`None\`. But the precompile doesn't need to distinguish "no CLOB installed" from "CLOB installed but empty" — both should return zero. \`Option\` collapses both cases to \`None\`; \`Result\` would force the precompile to handle them separately for no benefit.

**Q: What if \`book.lock()\` panics inside \`current_best_bid\`?**
The \`.expect("clob mutex poisoned")\` panics, which propagates up through \`current_best_bid\` → \`read_best_bid\` → REVM's dispatch. REVM treats this as a fatal precompile error and halts the EVM (likely reverting the entire transaction). **This is the right behavior** — a poisoned Mutex means another thread crashed while holding the lock; continuing to run on inconsistent state is worse than aborting.

## Next lesson (L5)

The plumbing is installed but the precompile still ignores it. L5 swaps \`read_best_bid\`'s body to call \`current_best_bid()\` instead of returning hardcoded values. Updates L3's tests to expect zero output when no CLOB is installed. Adds \`TEST_SERIALIZER\` to prevent parallel tests from racing on the global state. After L5, \`read_best_bid\` reads live state — but the only test exercising the round-trip is the smoke test you write inline. L6 makes the round-trip test permanent.`,
                },
                {
                  title: "Lesson 5 — read_best_bid reads the wire — swap to current_best_bid()",
                  slug: "openhl-precompiles-swap-to-live-en",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 40,
                  xpReward: 80,
                  content: `# Lesson 5 — \`read_best_bid\` reads the wire — swap to \`current_best_bid()\`

## Goal

Concepts you'll grasp in this lesson:

- **Uninstalled-returns-zero is "uninitialised storage slot" semantics** — Solidity contracts naturally handle a zero from \`STATICCALL\` as "no liquidity" and decline to trade. Erroring instead would revert every transaction during boot.
- **Constant-time precompile = gas charging shouldn't leak state** — charging less gas when no CLOB is installed would let attackers measure gas to detect validator state. A flat \`CLOB_BASE_GAS_COST\` keeps the precompile's wall-clock-shape uniform.
- **\`cargo test\` runs in parallel → process-globals race → need a serializer** — once two tests touch the same \`CLOB_STATE\`, parallel execution makes the global flap between \`Some(clob_A)\` and \`None\` within one test's lifetime. A \`Mutex<()>\` named \`TEST_SERIALIZER\` is the fix.
- **\`TEST_SERIALIZER\` is per-module, not per-crate** — narrow the serialization to the tests that actually need it; tests that don't touch \`CLOB_STATE\` shouldn't pay the cost.
- **Uninstall at *start* of test, not end** — panicked tests skip their cleanup code; the next test's start-of-test reset is the safety net. End-of-test uninstall is decoration.

Verification:

\`\`\`bash
cargo test -p openhl-evm --release
\`\`\`

…still passes (42 tests).

Specific changes:

But internally, the precompile now reads **live state** instead of hardcoded values:

- **\`read_best_bid\` body swapped** — drops the \`let mut out = vec![0, 0, ..., 100, 0, 0, ..., 10]\` hardcode in favor of \`if let Some((price, qty)) = current_best_bid() { ... write into out ... }\`. No CLOB installed → 64 zero bytes (matches "uninitialised perp market" semantic).
- **L3's \`read_best_bid_returns_hardcoded_price_and_qty\` test renamed** to \`read_best_bid_returns_zero_when_no_clob_installed\` — same shape, asserts zero instead of 100/10.
- **L3's \`registered_precompile_is_invokable_via_registry\` updated** — same logic, but it now uninstalls any CLOB first and expects zero output.
- **New \`static TEST_SERIALIZER: Mutex<()>\` added at the top of the test module** — every test that touches \`CLOB_STATE\` takes this lock first. Parallel \`cargo test\` would otherwise race on the global.

The course-7 + L3 path-of-callability tests still pass; the assertions just changed. **The big proof — "live CLOB data round-trips to EVM output" — is L6.** L5 makes the swap; L6 demonstrates it works end-to-end.

## Recap

After L4:

- \`Book\` has \`best_bid_with_qty\` / \`best_ask_with_qty\`.
- \`precompiles/mod.rs\` has the \`CLOB_STATE\` static + 3 module fns.
- \`LiveRethEvmBridge::new\` calls \`install_clob(Arc::clone(&clob))\`.
- **But \`read_best_bid\` still returns hardcoded \`(100, 10)\`** — none of this plumbing is exercised.

L5 finally exercises it.

## Plan

Four edits to \`crates/evm/src/precompiles/mod.rs\`:

1. **Swap \`read_best_bid\`'s body** — call \`current_best_bid()\` and only write nonzero bytes if it returns \`Some\`.
2. **Update the function's doc comment** — the hardcode language goes away; replace with "0 if no bid or no CLOB installed" semantic.
3. **Add \`static TEST_SERIALIZER: Mutex<()>\` to the test module.**
4. **Rename + rewrite L3's first test** + **update L3's last test** — both touch \`CLOB_STATE\` so both take the serializer lock and call \`uninstall_clob()\` first.

Module-level signatures don't change. The registry test (\`openhl_precompiles_registers_clob_address\`) doesn't touch \`CLOB_STATE\` and stays as-is.

> 🛑 **Predict.** Before scrolling: \`cargo test\` runs tests **in parallel by default** (one thread per logical CPU, typically). Two of our tests now read or write \`CLOB_STATE\`. **What's the failure mode if we don't serialize them?** Hint: think about what could be \`Some(clob_A)\` momentarily when a test expects \`None\`.

(Answer: **flaky tests**. Test A installs a CLOB, test B is meant to assert "no CLOB → zero output," but if B runs between A's \`install_clob\` and A's \`uninstall_clob\`, B sees A's CLOB and asserts the wrong values. The failure rate depends on test scheduling — sometimes 0%, sometimes 30%. CI flakes randomly. The \`TEST_SERIALIZER\` mutex pattern forces these tests to run one at a time, eliminating the race. **Cost: 0.0 seconds — these tests run in microseconds. Benefit: deterministic CI.**)

## Walk-through

### Step 1: Swap \`read_best_bid\`'s body

Open \`crates/evm/src/precompiles/mod.rs\`. Find the current L2/L3 body:

\`\`\`rust
#[allow(clippy::unnecessary_wraps)]
fn read_best_bid(_input: &[u8], _gas_limit: u64, _reservoir: u64) -> PrecompileResult {
    // Hardcoded: price=100, qty=10, both as big-endian u256 (32 bytes each).
    let mut out = vec![0u8; 64];
    out[31] = 100;  // price (last byte of first 32-byte word)
    out[63] = 10;   // qty   (last byte of second 32-byte word)
    Ok(PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0))
}
\`\`\`

Replace with:

\`\`\`rust
#[allow(clippy::unnecessary_wraps)]
fn read_best_bid(_input: &[u8], _gas_limit: u64, _reservoir: u64) -> PrecompileResult {
    let mut out = vec![0u8; 64];

    if let Some((price, qty)) = current_best_bid() {
        // Big-endian u256: rightmost bytes carry the value.
        out[24..32].copy_from_slice(&price.0.to_be_bytes());
        out[56..64].copy_from_slice(&qty.0.to_be_bytes());
    }
    // If no CLOB is installed or there are no bids, \`out\` stays all zeros —
    // matches what an uninitialised perp market would return on mainnet.

    Ok(PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0))
}
\`\`\`

Three things changed:

- **\`let mut out = vec![0u8; 64]\`** — same start, all zeros.
- **\`if let Some((price, qty)) = current_best_bid()\`** — read the global. \`None\` short-circuits the body; \`out\` stays zero.
- **\`out[24..32].copy_from_slice(&price.0.to_be_bytes())\`** — \`Price\` wraps a \`u64\`. \`to_be_bytes()\` returns \`[u8; 8]\`. We copy those 8 bytes into the **last 8 bytes** of the 32-byte word (positions 24..32). The leading 24 bytes are zero — that's the big-endian u256 encoding of a u64 value.
- **Same for qty at \`out[56..64]\`** — second 32-byte word, last 8 bytes.
- **Hardcoded \`out[31] = 100\` and \`out[63] = 10\`** are gone.

> 🛑 **Anti-fluency.** "Why not \`U256::from(price.0).to_be_bytes::<32>().copy_from_slice(...)\` for clarity?" **It allocates** a temporary \`[u8; 32]\` array, then copies it byte-by-byte. The direct \`out[24..32].copy_from_slice(&price.0.to_be_bytes())\` writes directly into the output buffer with no intermediate allocation. **Same result, half the work.** Precompiles are hot paths — every microsecond compounds.

### Step 2: Update the doc comment

The L2 doc comment was hardcode-centric:

\`\`\`rust
/// Returns hardcoded best-bid data as two big-endian u256s (64 bytes total).
/// Stage 9a's purpose is to prove the precompile is reachable from EVM execution;
/// Stage 9b will swap in live CLOB state.
///
/// Encoding:
///   bytes  0..32  big-endian u256 = 100 (price)
///   bytes 32..64  big-endian u256 = 10  (qty)
\`\`\`

Replace with the live-state version:

\`\`\`rust
/// Reads the best bid (highest-priced buy order's price + total qty at that
/// level) from the currently-installed CLOB and returns it as two
/// big-endian u256s (64 bytes total).
///
/// Encoding:
///   bytes  0..32  big-endian u256 price (0 if no bid or no CLOB installed)
///   bytes 32..64  big-endian u256 qty   (0 if no bid or no CLOB installed)
///
/// \`PrecompileFn\` signature is \`fn(&[u8], u64, u64) -> PrecompileResult\`;
/// the third arg is a \`reservoir\` value (extra gas budget) that we ignore
/// at v0. The Result wrapper is required by the signature even though we
/// never error — gas accounting is the EVM's responsibility.
\`\`\`

The "0 if no bid or no CLOB installed" line is load-bearing — it formalizes the API contract that mainnet contracts have to handle. **Smart contracts can't tell the difference between "uninstalled" and "empty book"** — both look like zero. That's intentional; contracts that need to distinguish them must check liveness through some other path.

### Step 3: Add \`TEST_SERIALIZER\` to the test module

Open the \`#[cfg(test)] mod tests\` block (added in L3). After the \`use\` statements, before the test functions:

\`\`\`rust
/// Tests in this module touch process-global \`CLOB_STATE\`. This mutex
/// serializes them so parallel test execution can't observe a torn state.
static TEST_SERIALIZER: Mutex<()> = Mutex::new(());
\`\`\`

One line. Plain \`Mutex<()>\` (unit type as payload — we never inspect the value, only the lock). Each test that touches \`CLOB_STATE\` opens with:

\`\`\`rust
let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
\`\`\`

The \`unwrap_or_else(PoisonError::into_inner)\` pattern is **critical** — without it, one panicking test poisons the mutex and every subsequent test fails with \`PoisonError\` instead of running. Recovering from poison turns "this test panicked once" into "this test panicked once and subsequent tests still get to run." The recovered guard still grants exclusive access; poison is just a signal, not a permanent disability.

> 🛑 **Anti-fluency.** "Couldn't we use \`#[serial]\` from the \`serial_test\` crate instead?" **You could, but it's a dev-dep for what one mutex does.** \`serial_test\` reaches for proc-macros, attribute parsing, and a hash-keyed lock map. For 4 tests touching one global, a 1-line \`static Mutex<()>\` is right-sized. **Reach for the crate when you have many globals with different lock partitions; not before.**

### Step 4: Update L3's first test (rename + rewrite)

L3 had:

\`\`\`rust
/// Direct unit test — the function should produce the L2 hardcoded
/// values. This is the lowest-level check before integrating into the registry.
#[test]
fn read_best_bid_returns_hardcoded_price_and_qty() {
    let result = read_best_bid(&[], 100_000, 0).expect("precompile must not error");
    assert_eq!(result.bytes.len(), 64);
    let price = U256::from_be_slice(&result.bytes[0..32]);
    let qty = U256::from_be_slice(&result.bytes[32..64]);
    assert_eq!(price, U256::from(100u64));
    assert_eq!(qty, U256::from(10u64));
    assert_eq!(result.gas_used, CLOB_BASE_GAS_COST);
}
\`\`\`

Replace with:

\`\`\`rust
/// With no CLOB installed, the precompile returns 64 zero bytes —
/// matching what an uninitialised perp market would report on mainnet.
#[test]
fn read_best_bid_returns_zero_when_no_clob_installed() {
    let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
    uninstall_clob();

    let result = read_best_bid(&[], 100_000, 0).expect("precompile must not error");
    assert_eq!(result.bytes.len(), 64);
    let price = U256::from_be_slice(&result.bytes[0..32]);
    let qty = U256::from_be_slice(&result.bytes[32..64]);
    assert_eq!(price, U256::ZERO);
    assert_eq!(qty, U256::ZERO);
    assert_eq!(result.gas_used, CLOB_BASE_GAS_COST);
}
\`\`\`

Five differences from L3:

1. **Renamed** — function name now describes the new semantic.
2. **Doc comment rewritten** — explains the "uninstalled = zero" semantic.
3. **First line: take \`TEST_SERIALIZER\`.**
4. **Second line: \`uninstall_clob()\`.** Why? Because earlier tests may have installed a CLOB and forgotten to clean up, or a previous test run may have left state. Calling \`uninstall_clob()\` is idempotent — safe to call always — and it guarantees a known starting state.
5. **Assertions changed** — \`U256::ZERO\` instead of \`U256::from(100u64)\` / \`U256::from(10u64)\`. The gas check is unchanged (the precompile always charges the same gas regardless of what it returns).

> 🛑 **Anti-fluency.** "Calling \`uninstall_clob()\` at the start of every test is wasteful if it's already uninstalled." **\`uninstall_clob\` is \`*CLOB_STATE.write().expect(...) = None\`** — one acquired-and-released write lock, microseconds. The alternative is a global "test setup" function with shared init order, which is a much bigger lift for a much smaller saving. **Explicit per-test reset is the canonical Rust testing pattern when global state is involved.**

### Step 5: Update L3's last test

L3's \`registered_precompile_is_invokable_via_registry\` had:

\`\`\`rust
#[test]
fn registered_precompile_is_invokable_via_registry() {
    let extended = openhl_precompiles(Precompiles::cancun());
    let precompile = extended
        .get(&CLOB_READ_BEST_BID)
        .expect("CLOB precompile must be registered");

    let result = precompile
        .execute(&[], 100_000, 0)
        .expect("call must not error");
    assert_eq!(result.bytes.len(), 64);
    let price = U256::from_be_slice(&result.bytes[0..32]);
    assert_eq!(price, U256::from(100u64));  // L3 hardcoded expectation
}
\`\`\`

Replace with:

\`\`\`rust
/// Invoke the registered precompile end-to-end through the registry
/// (rather than calling \`read_best_bid\` directly). This proves the
/// registration is wired such that an EVM dispatch to the address hits
/// our function — the same path Reth's EVM uses on \`staticcall\` to
/// \`CLOB_READ_BEST_BID\`.
#[test]
fn registered_precompile_is_invokable_via_registry() {
    let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
    uninstall_clob();

    let extended = openhl_precompiles(Precompiles::cancun());
    let precompile = extended
        .get(&CLOB_READ_BEST_BID)
        .expect("CLOB precompile must be registered");

    // Precompile::execute is the public dispatch method — same as what
    // the EVM calls internally when a contract STATICCALLs the address.
    let result = precompile
        .execute(&[], 100_000, 0)
        .expect("call must not error");
    assert_eq!(result.bytes.len(), 64);
    // No CLOB → zero output, matching read_best_bid_returns_zero_when_no_clob_installed.
    let price = U256::from_be_slice(&result.bytes[0..32]);
    assert_eq!(price, U256::ZERO);
}
\`\`\`

Three differences from L3:

1. **Open with \`TEST_SERIALIZER\` + \`uninstall_clob\`** — same pattern as test 1.
2. **Doc comment** — added (L3 didn't have one); explains why this test exists alongside the unit test.
3. **\`assert_eq!(price, U256::ZERO)\`** — was \`U256::from(100u64)\`.

The middle test (\`openhl_precompiles_registers_clob_address\`) doesn't touch \`CLOB_STATE\` — it just checks registry membership. **Don't add serializer + uninstall to it** — that would be unnecessary serialization and a subtle slowdown.

## Test

\`\`\`bash
cargo test -p openhl-evm --release
\`\`\`

After ~30 seconds:

\`\`\`
running 42 tests
... 42 pass ...

test result: ok. 42 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

Same test count as L4 (42). What's different:
- 2 of the 4 tests touching the precompile now run **serialized** (via \`TEST_SERIALIZER\`).
- The 2 modified tests now assert **zero output** instead of \`(100, 10)\`.

Try this experiment if you want intuition for what the serializer prevents:

\`\`\`bash
# Temporarily delete the \`let _g = TEST_SERIALIZER.lock()...\` lines from both tests.
cargo test -p openhl-evm read_best_bid -- --test-threads=8
# Run it ~20 times.
for i in $(seq 1 20); do
  cargo test -p openhl-evm read_best_bid -- --test-threads=8 --quiet 2>&1 | grep "test result"
done
\`\`\`

You may see occasional failures — depends on scheduling. Put the lines back when done.

Common errors and fixes:

- **\`unused import: Order, OrderId, OrderType, Side\`** — these were used by L3's hardcoded test (no longer needed by L5's zero-output test). **Keep them** — L6 will use them for the live-state test. The unused warning is harmless for one lesson.
  - If your \`#[cfg(test)] mod tests\` had \`use openhl_clob::{...};\` covering these, leave it. L6 needs it.
- **\`error[E0599]: no method named 'lock' found for struct 'Mutex<()>'\`** — you imported \`Mutex\` from somewhere else (e.g., \`tokio::sync::Mutex\`). The test module's \`use super::*;\` should bring \`std::sync::Mutex\` in from the parent module.
- **Test passes once, fails after — \`PoisonError\`** — one test panicked while holding \`TEST_SERIALIZER\`. The \`unwrap_or_else(PoisonError::into_inner)\` pattern is what recovers from this; check that both tests use that exact form.
- **Tests pass when run individually, fail in parallel** — \`TEST_SERIALIZER\` not actually applied. Verify \`let _g = TEST_SERIALIZER.lock().unwrap_or_else(...)\` is the **first** statement (before \`uninstall_clob()\`). If \`_g\` is dropped early (e.g., shadowed), the lock releases mid-test.

## Design reflection

Three load-bearing decisions encoded here:

1. **Uninstalled CLOB returns zeros, not an error.** The mainnet equivalent is "uninitialised storage slot returns zero" — Solidity contracts naturally handle this. If we errored, calling the precompile during boot (before the bridge has installed its CLOB) would revert the transaction. Returning zero degrades gracefully: contracts see "no liquidity" and decline to trade, which is the right behavior.

2. **\`TEST_SERIALIZER\` is per-module, not global.** A test in \`live_node.rs\` that doesn't touch \`CLOB_STATE\` shouldn't be serialized with these. Module-local mutex keeps the partition narrow.

3. **Tests call \`uninstall_clob()\` at start, not at end.** Why not symmetric? Because **panicked tests don't run their cleanup code.** A panic mid-test would leave a CLOB installed; the next test's "starting cleanup" picks up the slack. We do still uninstall at the end of the live-state test (L6) for clarity — but the safety net is the start-of-test reset.

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout b635ef7
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
\`\`\`

After L5, your code is **very close** to Stage 9b — same \`read_best_bid\` body, same \`TEST_SERIALIZER\`, same two updated tests. The only diff: Stage 9b also has \`read_best_bid_returns_live_state_when_clob_installed\`, which L6 adds.

Return:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: Why doesn't \`read_best_bid\` charge less gas when there's no CLOB installed?**
You could make it conditional — return less gas when \`current_best_bid()\` is \`None\`. But that exposes implementation details: an attacker could measure gas to detect whether your validator has installed a CLOB. Charging a flat \`CLOB_BASE_GAS_COST\` is the standard "constant-time precompile" pattern. Gas charging shouldn't leak state.

**Q: What's the difference between \`u64::to_be_bytes()\` and \`U256::to_be_bytes::<32>()\`?**
\`u64::to_be_bytes()\` returns \`[u8; 8]\` — 8 bytes. \`U256::to_be_bytes::<32>()\` returns \`[u8; 32]\` — 32 bytes with zero-padding on the left. **For our use case (8-byte source value, 32-byte destination), we want the 8-byte source-shape copied into the rightmost 8 bytes of the destination.** That's \`out[24..32].copy_from_slice(&u64_bytes)\`. The U256 version would copy 32 bytes total (24 of which are zero) — same result, 4x the work.

**Q: Will the test be flaky even with \`TEST_SERIALIZER\`?**
Not under normal \`cargo test\` execution. The mutex guarantees no two test threads observe \`CLOB_STATE\` mid-modification. Edge cases that could still flake: (a) panic during \`current_best_bid\` poisoning the mutex (recovered via \`into_inner\`), (b) external code (outside the test module) writing to \`CLOB_STATE\` (only an issue if integration tests in \`reth_node.rs\` start touching it — they don't yet).

**Q: Couldn't we just pass the CLOB through the precompile's input bytes?**
A smart contract calls precompiles via \`staticcall(gas, addr, input, output)\`. The input is calldata the contract has constructed — there's no way for the **node operator** to splice in a CLOB pointer. The precompile's input bytes are user-controlled, not node-controlled. Process-global state is the only injection point a node operator has.

## Next lesson (L6)

The wire is hot but no test exercises the round-trip. L6 adds \`read_best_bid_returns_live_state_when_clob_installed\`: install a CLOB with a known bid, call the precompile, verify the bid round-trips into the output bytes. The proof — \`Solidity contract → STATICCALL → EVM dispatch → REVM precompile registry → our function → live Book lock → return encoded → contract sees real data\` — is finally end-to-end demonstrated. This is the **Module 2 milestone**.`,
                },
                {
                  title: "Lesson 6 — Module 2 milestone — proving the round-trip",
                  slug: "openhl-precompiles-live-state-proof-en",
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 30,
                  xpReward: 60,
                  content: `# Lesson 6 — Module 2 milestone — proving the round-trip

## Goal

Concepts you'll grasp in this lesson:

- **The full read chain end-to-end** — \`bid placed on CLOB → bridge writes through Mutex → precompile reads via global → encodes 64-byte ABI → returns to caller\`. This is the first test that exercises the whole chain in one shot.
- **Adversarial test data > random test data** — two orders chosen specifically to distinguish a correct best-bid implementation from a coincidentally-correct one (one at price 250 qty 7 = the *correct* answer; one at price 240 qty 99 = the larger-qty trap a buggy iteration order would return). Two orders, not 50.
- **Partitioning dispatch tests from behavior tests** — L5 proved the function is reachable through \`Precompile::execute\`; L6 proves the function reads live state by calling \`read_best_bid\` directly. A test that bundles dispatch + behavior together is harder to debug when it fails.
- **Assertion messages as documentation for future maintainers** — \`"best bid is the 250 order, not 240"\` tells the next engineer the conceptual invariant being violated, where a bare \`left=240 right=250\` only tells them the values.
- **One-thing-at-a-time across L4-L6** — plumbing (L4) → swap (L5) → exercise (L6). Each lesson has one verifiable change; mixing them would make debugging much harder when something breaks at an intermediate stage.

Verification:

\`\`\`bash
cargo test -p openhl-evm --release
\`\`\`

…passes 43 tests (one new).

Specific changes:

The new test is \`read_best_bid_returns_live_state_when_clob_installed\`. It does what every prior test has stopped short of: **install a CLOB with a known bid, call the precompile, observe that the precompile's output bytes encode the bid's price and qty.**

This is the milestone. The full chain — \`bid placed on CLOB → bridge writes through Mutex → precompile reads via global → encodes 64-byte ABI → returns to caller\` — is finally exercised end-to-end. After L6:

- Module 2 (Read precompile) is **complete**: a Solidity contract that issues \`STATICCALL(0x...0c1b)\` will receive live CLOB state.
- The pattern (precompile-reads-from-global-Arc) is proven, ready to replicate for additional read precompiles (best_ask, depth, mid-price, etc.) in future stages.
- Module 3 (Write precompile, L7-L9) builds on the same infrastructure but in the opposite direction: precompile **writes** to CLOB state.

## Recap

After L5:

- \`read_best_bid\` calls \`current_best_bid()\` (live path).
- L3's two tests assert the **uninstalled** semantic — zero output when no CLOB.
- \`TEST_SERIALIZER\` is in place.
- **But no test ever installs a CLOB with non-empty state and observes the values flowing through.** The wire is hot but unmeasured.

L6 measures the wire.

## Plan

One edit to \`crates/evm/src/precompiles/mod.rs\`, inside the \`#[cfg(test)] mod tests\` block: add a new test function.

That's it. No production code changes. **L6 is a pure test addition** — and it's the most important test in the course.

The test's structure:

1. **Setup** — take \`TEST_SERIALIZER\`. (No \`uninstall_clob()\` at start; we install our own immediately.)
2. **Build a CLOB** — \`Arc::new(Mutex::new(Book::new()))\`.
3. **Rest two bids** — one at price 250 qty 7 (will be the best), one at price 240 qty 99 (lower price, must NOT be picked despite the larger qty).
4. **Install the CLOB** — \`install_clob(book)\`.
5. **Call the precompile directly** — \`read_best_bid(&[], 100_000, 0)\`.
6. **Decode and assert** — price=250 (not 240), qty=7 (not 99 — the larger qty at the wrong level is the trap).
7. **Cleanup** — \`uninstall_clob()\` at the end (clarity, not safety).

> 🛑 **Predict.** Before scrolling: we'll install a Book with two bids — \`(price=250, qty=7)\` and \`(price=240, qty=99)\`. **What does \`read_best_bid\` return?** Get it right and you've grasped the matching engine's "best price wins" invariant. Get it wrong and the test will catch your misconception.

(Answer: \`price=250, qty=7\`. **"Best bid" = highest price, not largest qty.** The qty=99 order is parked at a worse price (240); it's not even considered for the best-bid response. This is the classic order-book invariant: price-time priority within a level, price priority across levels. Beginners often think "best = most liquidity" — that's wrong. **Best bid is what a market sell would hit first.** A market sell would hit the 250-bid first because it offers the highest price; only after exhausting the 250-level would it descend to 240.)

## Walk-through

Open \`crates/evm/src/precompiles/mod.rs\`. Find the existing \`#[cfg(test)] mod tests\` block.

Verify the imports at the top of the test module include \`Order, OrderId, AccountId, OrderType, Price, Qty, Side\` (we kept them through L5 specifically for this lesson):

\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;
    use alloy_primitives::U256;
    use openhl_clob::{AccountId, Order, OrderId, OrderType, Price, Qty, Side};

    static TEST_SERIALIZER: Mutex<()> = Mutex::new(());

    // ... read_best_bid_returns_zero_when_no_clob_installed (L5)
    // ... openhl_precompiles_registers_clob_address (L3)
    // ... registered_precompile_is_invokable_via_registry (L5)
}
\`\`\`

If any of \`Order\`, \`OrderId\`, \`AccountId\`, \`OrderType\`, \`Price\`, \`Qty\`, \`Side\` are missing, add them.

Now add this test. Best location: between the L5 \`read_best_bid_returns_zero_when_no_clob_installed\` test and the \`openhl_precompiles_registers_clob_address\` test:

\`\`\`rust
    /// **Stage 9b end-to-end**: install a CLOB with a known bid, call the
    /// precompile, observe the live data flow through to the EVM-visible
    /// response. This is the moment custom EVM execution reads real
    /// orderbook state.
    #[test]
    fn read_best_bid_returns_live_state_when_clob_installed() {
        let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);

        let book = Arc::new(Mutex::new(Book::new()));
        // Rest a buy @ 250 with qty 7
        book.lock().unwrap().submit(Order {
            id: OrderId(1),
            account: AccountId(42),
            side: Side::Buy,
            qty: Qty(7),
            order_type: OrderType::Limit { price: Price(250) },
        });
        // Rest another buy @ 240 (lower; shouldn't be picked as best bid)
        book.lock().unwrap().submit(Order {
            id: OrderId(2),
            account: AccountId(43),
            side: Side::Buy,
            qty: Qty(99),
            order_type: OrderType::Limit { price: Price(240) },
        });

        install_clob(book);

        let result = read_best_bid(&[], 100_000, 0).expect("precompile must not error");
        let price = U256::from_be_slice(&result.bytes[0..32]);
        let qty = U256::from_be_slice(&result.bytes[32..64]);
        assert_eq!(price, U256::from(250u64), "best bid is the 250 order, not 240");
        assert_eq!(qty, U256::from(7u64), "qty at the best level is 7");

        uninstall_clob();
    }
\`\`\`

Let me walk through the seven moving parts.

### Step 1: The doc comment

\`\`\`rust
    /// **Stage 9b end-to-end**: install a CLOB with a known bid, call the
    /// precompile, observe the live data flow through to the EVM-visible
    /// response. This is the moment custom EVM execution reads real
    /// orderbook state.
\`\`\`

The bold "Stage 9b end-to-end" is a deliberate flag. Anyone grep-searching for milestone tests will find this. Future engineers reading the codebase need to see "this is the proof of the entire feature," not "this is just another unit test."

### Step 2: Take the serializer

\`\`\`rust
        let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
\`\`\`

Same pattern as L5's two tests. **No \`uninstall_clob()\` here** — we're about to install our own; whatever's currently installed gets replaced atomically by \`install_clob\`. The serializer alone is enough.

### Step 3: Build the Book

\`\`\`rust
        let book = Arc::new(Mutex::new(Book::new()));
\`\`\`

\`Arc::new(Mutex::new(Book::new()))\` is the exact shape \`install_clob\` expects. We hold one Arc; after \`install_clob\`, the global holds another.

### Step 4: Rest two bids, intentionally adversarial

\`\`\`rust
        // Rest a buy @ 250 with qty 7
        book.lock().unwrap().submit(Order {
            id: OrderId(1),
            account: AccountId(42),
            side: Side::Buy,
            qty: Qty(7),
            order_type: OrderType::Limit { price: Price(250) },
        });
        // Rest another buy @ 240 (lower; shouldn't be picked as best bid)
        book.lock().unwrap().submit(Order {
            id: OrderId(2),
            account: AccountId(43),
            side: Side::Buy,
            qty: Qty(99),
            order_type: OrderType::Limit { price: Price(240) },
        });
\`\`\`

Two orders, not one. The second one (\`240, qty=99\`) is a **trap for an incorrect implementation**:

- A naive implementation that "returns the largest qty order" would return \`(240, 99)\`. Fails.
- A naive implementation that "returns the first order submitted" would return \`(250, 7)\`. Passes — but only by coincidence.
- A naive implementation that "returns the last order submitted" would return \`(240, 99)\`. Fails.
- The correct implementation that "returns the price level with the highest price, summed qty at that level" returns \`(250, 7)\`. Passes.

If we had only the \`(250, 7)\` order, every naive implementation would pass. The \`(240, 99)\` order distinguishes correctness from coincidence. **Two orders is the minimum that proves "best = highest price, not largest qty."**

> 🛑 **Anti-fluency.** "Why are the order IDs and account IDs different? Wouldn't it be cleaner to reuse them?" **They must be different because \`submit()\` indexes by \`OrderId\`**. Re-using \`OrderId(1)\` for the second order would either fail or silently overwrite the first. Different IDs matter; account IDs are just cosmetic in this test but they hint at the real-world pattern (different traders, different orders).

> 🛑 **Anti-fluency.** "Couldn't \`book.lock().unwrap().submit(...)\` be split into a \`let mut book = book.lock().unwrap();\` + two \`book.submit(...)\` calls for clarity?" **It could and would acquire the lock once instead of twice.** But test code is read more than it's run; we want each \`submit\` self-contained and obvious. **The 2-microsecond cost is invisible; the readability gain is significant.** Different rule for hot-path production code (acquire once, release once).

### Step 5: Install + invoke

\`\`\`rust
        install_clob(book);

        let result = read_best_bid(&[], 100_000, 0).expect("precompile must not error");
\`\`\`

\`install_clob(book)\` — note we move \`book\` here. **No \`Arc::clone(&book)\`** because we don't use \`book\` again after install. If you wrote \`install_clob(Arc::clone(&book))\` and then never used \`book\`, clippy would warn \`unused_variable\`. The move is correct.

\`read_best_bid(&[], 100_000, 0)\` — direct unit-style call. We could go through the registry (like \`registered_precompile_is_invokable_via_registry\` does) but the registry path is already proven in L5. **L6's job is to prove that with a live CLOB installed, the function reads from it.** Direct call is the cleanest assertion of that.

The \`&[]\` empty calldata is meaningful: \`read_best_bid\` ignores its input (no parameters needed for "what's the best bid?"). The 100_000 gas is more than enough — we measured \`CLOB_BASE_GAS_COST = 500\`.

### Step 6: Decode + assert

\`\`\`rust
        let price = U256::from_be_slice(&result.bytes[0..32]);
        let qty = U256::from_be_slice(&result.bytes[32..64]);
        assert_eq!(price, U256::from(250u64), "best bid is the 250 order, not 240");
        assert_eq!(qty, U256::from(7u64), "qty at the best level is 7");
\`\`\`

The \`from_be_slice\` decoder is the inverse of \`to_be_bytes\` from L5's Step 1. We wrote 8 bytes at \`out[24..32]\`; the decoder reads 32 bytes from \`result.bytes[0..32]\` — those leading 24 zero bytes plus 8 value bytes round-trip to the same u64.

The assertion messages **are not decoration**. A bare \`assert_eq!(price, U256::from(250u64))\` on failure reports "left != right" — which leaves the reader to guess the test's intent. The message "best bid is the 250 order, not 240" tells them *immediately* what assumption is wrong if this fails. **For milestone tests especially, assertion messages double as documentation.**

### Step 7: Cleanup

\`\`\`rust
        uninstall_clob();
    }
\`\`\`

**Only test in the module that explicitly uninstalls at the end.** Why this one?

- L5's two zero-output tests don't need to: they start with \`uninstall_clob()\`, so they don't care what state they leave.
- This test leaves a non-empty CLOB installed. If another test ran *next* (in the same \`cargo test\` invocation, after \`TEST_SERIALIZER\` releases) and was meant to assert "no CLOB → zero," it would see our installed book and fail.

The other tests *also* call \`uninstall_clob\` at the start, so technically this cleanup is redundant. **But making the cleanup explicit in the test that actually installs non-empty state is good hygiene.** It mirrors the "Setup / Exercise / Verify / Teardown" testing convention without needing test-framework support.

## Test

\`\`\`bash
cargo test -p openhl-evm --release
\`\`\`

After ~30 seconds:

\`\`\`
running 43 tests
... 43 tests pass ...

test result: ok. 43 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

One more than L5. The new one is \`read_best_bid_returns_live_state_when_clob_installed\`. To see just it:

\`\`\`bash
cargo test -p openhl-evm --release returns_live_state
\`\`\`

Output:

\`\`\`
running 1 test
test precompiles::tests::read_best_bid_returns_live_state_when_clob_installed ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 42 filtered out
\`\`\`

**That \`ok\` line is the Module 2 milestone.** A custom EVM precompile is reading from a live matching engine state, and the data is round-tripping into EVM-visible output bytes.

Common errors and fixes:

- **\`assertion failed: left=240, right=250\`** — your implementation's \`best_bid_with_qty()\` is returning the wrong level. Likely cause: you're iterating \`self.bids\` in insertion order instead of price-priority order. Check the L4 implementation — the bids \`BTreeMap\` is keyed by \`RevPrice\` (reverse-sorted price) so \`.iter().next()\` gives you the highest price. If you wrote \`.iter().next_back()\` or used a different data structure, fix it.
- **\`assertion failed: left=99, right=7\`** — your \`best_bid_with_qty()\` returned the right price but the wrong qty. Likely cause: you summed all bids across all price levels instead of just the best level. Re-check the L4 code: the closure inside \`.map(|(rev_price, queue)| ...)\` should sum **only \`queue.iter()\`** (orders at that one price level), not \`self.bids.values().flatten()\` (all orders everywhere).
- **\`error[E0382]: borrow of moved value: 'book'\`** — you called \`install_clob(book)\` and then tried to use \`book\` again afterward. Either drop the later use (we don't need it) or use \`install_clob(Arc::clone(&book))\` if you have a reason to keep using \`book\` (you don't in this test).
- **\`error[E0599]: no method named 'submit' found for...\`** — \`book.lock()\` returns \`LockResult<MutexGuard<Book>>\`, so you need \`book.lock().unwrap().submit(...)\`. Missing \`.unwrap()\` is the typical cause.
- **Test passes in isolation, fails when run alongside others** — \`TEST_SERIALIZER\` lock not actually held. Check \`let _g = TEST_SERIALIZER.lock()...\` is the first statement.

## Design reflection

Four points worth pausing on:

1. **The minimum data shape that distinguishes correctness from coincidence is 2 orders.** Adversarial test data — orders specifically designed to expose the wrong implementations — is more valuable than 50 random orders. Each adversarial value pays for a class of bugs.

2. **Direct function call vs. registry dispatch is a deliberate test partitioning.** L5's \`registered_precompile_is_invokable_via_registry\` proves the function is reachable through the dispatch table. L6 proves the function reads live state. Partitioning these means a failure in one doesn't mask the other. **Tests that bundle dispatch + behavior + state into one assertion are harder to debug when they fail.**

3. **Assertion messages are documentation for future maintainers.** "best bid is the 250 order, not 240" tells the next engineer reading a failure exactly which conceptual assumption is violated. Bare \`assert_eq!(price, U256::from(250u64))\` would say "left=240 right=250" — true, but it requires the maintainer to reconstruct the test's intent.

4. **One thing at a time.** L6 adds zero production code. The full Module 2 (L4-L6) progression is: plumbing (no behavior change) → swap (behavior changes, no test of new behavior) → exercise (test the new behavior). Each lesson has *one* thing to learn, *one* thing to verify. Mixing them — e.g., swapping + testing in the same lesson — would have made debugging much harder when something inevitably broke at intermediate stages.

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout b635ef7
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
\`\`\`

After L6, your \`precompiles/mod.rs\` should be **byte-identical** to Stage 9b (modulo your own doc comment phrasing if you went off-script). This is the end of Stage 9b — \`git diff b635ef7 -- crates/evm\` is empty.

Return:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: Why call \`read_best_bid\` directly instead of going through \`Precompile::execute\`?**
Both paths work. Direct call (\`read_best_bid(...)\`) tests the function in isolation. Registry path (\`precompile.execute(...)\`) tests the dispatch. **L5's third test already proves dispatch works**; L6 wants to prove behavior reads from the global. Picking the direct path narrows the test to one assertion.

**Q: What if \`submit\` fails (e.g., duplicate \`OrderId\`)?**
\`Book::submit\` (from course 7) returns \`()\` — it doesn't fail. Internally, if you submit two orders with the same OrderId, the second overwrites the first silently. **This is by design** for the matching engine but it's a footgun for tests. We use \`OrderId(1)\` and \`OrderId(2)\` deliberately to avoid the trap.

**Q: Will this test work on Cancun? Prague? Some hypothetical future fork?**
Yes — \`read_best_bid\` is the same function regardless of fork. The precompile registry chooses *which* precompiles are in effect per fork (L1/L2 added \`openhl_precompiles_for(spec)\` with \`OnceLock\`s per hardfork), but the CLOB-reading function itself is fork-agnostic.

**Q: How would a Solidity contract see this same value?**
\`\`\`solidity
(uint256 price, uint256 qty) = abi.decode(
    staticcall(gas, 0x...0c1b, "", 64),
    (uint256, uint256)
);
\`\`\`
With our Book installed and the precompile registered, that staticcall returns 64 bytes encoding (250, 7). The Solidity ABI decoder rejoins them into two uint256s. **The contract sees the same data the test sees, via the same code path.** This is the entire point of a custom precompile.

## Module 2 milestone — what you've built

You now have:
- A registered custom EVM precompile at address \`0x...0c1b\`.
- A process-global Arc-shared CLOB state.
- A precompile that reads the live matching engine's best bid and encodes it as ABI uint256 pair.
- Tests that prove: (a) the precompile is reachable from the registry, (b) the precompile reads zero when no CLOB is installed, (c) the precompile reads live state when a CLOB is installed.

Smart contracts can now query CLOB state directly. The "fills are a parallel list, smart contracts can't see them" gap from course 7 L12 is partially closed — for reads. Writes (placing orders from contracts) is Module 3.

## Next lesson (L7)

L7 starts Module 3 (Write precompile). It mirrors L2: a new precompile address (\`CLOB_PLACE_ORDER\` at \`0x...0c1c\`), Solidity calldata decoding for the order parameters, and a hardcoded placeholder body. The teaching focus shifts from output encoding to **input** decoding — variable-length calldata, struct unpacking, error handling for malformed input.`,
                },
              ],
            },
          },
          {
            title: "Write precompile",
            sortOrder: 3,
            lessons: {
              create: [
                {
                  title: "Lesson 7 — clob_place_order — calldata decoding scaffold",
                  slug: "openhl-precompiles-place-order-scaffold-en",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 40,
                  xpReward: 80,
                  content: `# Lesson 7 — \`clob_place_order\` — calldata decoding scaffold

## Goal

Concepts you'll grasp in this lesson:

- **Schema-first design — the calldata layout is the public contract, locked before behavior** — once the precompile is exposed at \`0x...0c1c\`, contracts will call it. Lock the input layout in L7 so L8's behavior change doesn't break callers.
- **128-byte ABI input as four 32-byte slots** — Solidity ABI packs each scalar into a 32-byte word; \`u64\` lives in the rightmost 8 bytes (\`[0; 24] + [u64 BE]\`). Four words = \`account_id\`, \`side\`, \`price\`, \`qty\`.
- **Precompiles fail soft, not panic** — malformed input (4 rejection paths) returns sentinel \`0\`, never reverts the transaction. The calling contract gets back a value it can branch on, instead of an EVM-level error.
- **\`AtomicU64::fetch_add(1, Relaxed)\` for ID allocation** — IDs need uniqueness (atomic guarantees that) but no synchronization invariant with other state (the Book has its own Mutex). Pick the lighter memory ordering when no invariant requires more.
- **Sentinel \`0\` requires \`NEXT_ORDER_ID\` to start at 1** — if IDs started at 0, the first allocated ID would be indistinguishable from "rejected." Starting at 1 makes the sentinel unambiguous.

Verification:

\`\`\`bash
cargo test -p openhl-evm --release
\`\`\`

…passes 46 tests (3 new).

Specific changes:

The CLOB's **write path** has its precompile registered, calldata parsing implemented, and rejection paths verified:

- **New precompile at \`0x...0c1c\`** — \`CLOB_PLACE_ORDER\`, registered alongside \`CLOB_READ_BEST_BID\`.
- **128-byte ABI-aligned input layout** decoded: \`account_id\`, \`side\`, \`price\`, \`qty\`.
- **Atomic order-ID counter** (\`NEXT_ORDER_ID\`) — process-global, starts at 1 so the sentinel \`0\` is unambiguously "rejected."
- **Four rejection paths** all return zero: input too short, invalid \`side\` byte, zero \`qty\`, no CLOB installed.
- **Happy path** allocates an order ID and returns it — **but does NOT submit to the book yet.** That's L8.

L7 is the L2 of Module 3: the function is reachable and parses input correctly, but the state-mutation behavior is deferred. L8 adds the single line that actually writes to the book; L9 routes the resulting fills back into the bridge.

## Recap

Module 2 closed with:
- \`CLOB_READ_BEST_BID\` precompile registered at \`0x...0c1b\`.
- Smart contracts can \`STATICCALL\` it to read live best-bid data.
- \`Arc<Mutex<Book>>\` shared between bridge and precompile via \`CLOB_STATE\` global.

But contracts still can't **place** orders. They can read the book; they can't write to it. L7 starts to fix that.

## Plan

Six edits to \`crates/evm/src/precompiles/mod.rs\`:

1. **Expand imports** — pull in the matching engine types (\`AccountId\`, \`Order\`, \`OrderId\`, \`OrderType\`, \`Price\`, \`Qty\`, \`Side\`) plus \`atomic::{AtomicU64, Ordering}\`.
2. **Add the \`CLOB_PLACE_ORDER\` address constant** + a \`NEXT_ORDER_ID\` atomic counter.
3. **Add the \`place_order\` precompile function** — parse 128-byte input, validate, allocate ID, return encoded ID. **No \`book.submit(...)\` yet** (that's L8).
4. **Add a \`u64_from_be_chunk\` helper** — used 3× by \`place_order\` to extract u64 values from 32-byte ABI words.
5. **Update \`openhl_precompiles\`** — \`extend\` with **both** precompiles now (an array of 2, not 1).
6. **Add 3 new tests** + 1 helper (\`place_order_calldata\`) to assemble test input.

The \`read_best_bid\` function and Module 2's tests don't change. **L7 is purely additive.**

> 🛑 **Predict.** Before scrolling: the \`read_best_bid\` precompile took *empty* input (\`&[]\`) and returned 64 bytes. \`place_order\` will take **128 bytes of input** and return 32. **Why does Solidity pad each u64 field to 32 bytes?** Hint: think about what calling convention precompiles share with regular contract functions.

(Answer: **Solidity's ABI is fixed-width-32-byte per slot.** A \`function f(uint64 a, uint8 b, uint64 c, uint64 d)\` doesn't pack — it allocates 4 × 32 = 128 bytes of calldata, each value right-aligned in its 32-byte slot. Precompiles follow the same convention because they're invoked via the same EVM call opcodes. **The waste is intentional**: it lets the EVM treat all calls uniformly. Our parser reads the meaningful 8 or 1 bytes from each slot and ignores the rest.)

## Walk-through

### Step 1: Expand the imports

Current imports (after L6):

\`\`\`rust
use alloy_evm::revm::precompile::{
    Precompile, PrecompileId, PrecompileOutput, PrecompileResult, Precompiles,
};
use alloy_primitives::{address, Address, Bytes};
use openhl_clob::Book;
use std::sync::{Arc, Mutex, RwLock};
\`\`\`

Expand the openhl_clob import to bring in the matching engine types, and the std::sync import to include atomics:

\`\`\`rust
use alloy_evm::revm::precompile::{
    Precompile, PrecompileId, PrecompileOutput, PrecompileResult, Precompiles,
};
use alloy_primitives::{address, Address, Bytes};
use openhl_clob::{AccountId, Book, Order, OrderId, OrderType, Price, Qty, Side};
use std::sync::{
    atomic::{AtomicU64, Ordering},
    Arc, Mutex, RwLock,
};
\`\`\`

\`AccountId\`, \`Order\`, \`OrderId\`, \`OrderType\`, \`Price\`, \`Qty\`, \`Side\` are all needed to **construct an \`Order\`** in L8 — but the imports go in now to keep the diff focused on L7's concern (we'll reuse them immediately for the function signature in L8). \`AtomicU64\` and \`Ordering\` are for the \`NEXT_ORDER_ID\` counter.

### Step 2: Add the address constant + atomic counter

After \`CLOB_READ_BEST_BID\`:

\`\`\`rust
/// Address of the "place order" precompile (write path — Stage 9c).
///
/// Solidity call shape (ABI-aligned 128-byte input):
/// \`call(gas, 0x...0c1c, calldata=(uint64 account, uint8 side, uint64 price, uint64 qty), ...) → uint256 order_id\`
///
/// \`side\` encoding: 0 = Buy, 1 = Sell. Any other value → call returns 0
/// (rejected, no state change). Order type is hardcoded to Limit at v0.
///
/// Return: 32 bytes; the last 8 are a big-endian u64 \`order_id\`. A return
/// of 0 means the order was rejected (no CLOB installed, malformed input,
/// or invalid side byte) — distinguishable from "placed" because allocated
/// IDs start at 1.
pub const CLOB_PLACE_ORDER: Address = address!("0x0000000000000000000000000000000000000c1c");
\`\`\`

Address \`0x...0c1c\` — mnemonic \`0c1c\` for "CL[ob] [pla]C[e]". Sits right next to \`0x...0c1b\` for "CL[ob] [Rea]B[id]". Both well above standard precompiles \`0x01..0x09\`.

Then, after \`CLOB_BASE_GAS_COST\`:

\`\`\`rust
/// Monotonic order-ID counter for orders placed via the EVM. Starts at 1
/// so the sentinel value 0 (returned on rejection) is distinguishable from
/// a successfully placed order.
///
/// **Single-validator caveat:** This is a process-global counter. For
/// multi-validator deployments, order IDs must come from consensus —
/// each validator's precompile must allocate the same ID for the same
/// EVM-side call, which means the counter has to be either deterministic
/// from input or read from a shared block-scoped state. Out of scope at v0.
static NEXT_ORDER_ID: AtomicU64 = AtomicU64::new(1);
\`\`\`

**Two load-bearing decisions encoded in this static:**

1. **Starts at 1, not 0.** Because \`0\` is our "rejected" sentinel value (returned from the precompile when input is malformed or no CLOB is installed). If the counter started at 0, the first successfully-placed order would also return 0, indistinguishable from a rejection. By starting at 1, every allocated ID is \`> 0\` and every \`0\` returned to the EVM caller is unambiguous.
2. **\`AtomicU64\`, not \`Mutex<u64>\`.** \`fetch_add(1, Relaxed)\` is wait-free; \`Mutex::lock\` blocks. Order ID allocation is on the hot path of every order placement; using a mutex would serialize all order placements through one critical section. Atomic increment is the right tool here.

> 🛑 **Anti-fluency.** "Why \`Ordering::Relaxed\` and not \`SeqCst\`?" **Because the IDs don't have ordering dependencies with other state.** \`Relaxed\` guarantees atomicity (no two threads get the same ID) but doesn't synchronize with any other memory operation. We don't need IDs to be ordered with respect to writes to the book — the book has its own mutex, which provides the ordering for state visibility. \`SeqCst\` would add a memory fence on every increment for no benefit. **Pick the weakest ordering that suffices.**

> 🛑 **Anti-fluency.** "Multi-validator caveat" feels like Future Problems — why bother mentioning it?" **Because the failure mode is silent chain divergence.** If two validators allocate different IDs for the same EVM call, their books diverge after that point — and the divergence is invisible until much later when reads return different values. **Naming the problem at the static's definition site means any future engineer extending this code reads "you cannot ship this multi-validator" before deciding how to refactor.** Documentation comments are the canonical place for "this thing has a hidden constraint" warnings.

### Step 3: Add \`u64_from_be_chunk\` helper

Below \`read_best_bid\`, before \`openhl_precompiles\`:

\`\`\`rust
/// Read a big-endian u64 from the last 8 bytes of a 32-byte ABI chunk.
fn u64_from_be_chunk(chunk: &[u8]) -> u64 {
    debug_assert!(chunk.len() == 32);
    let mut buf = [0u8; 8];
    buf.copy_from_slice(&chunk[24..32]);
    u64::from_be_bytes(buf)
}
\`\`\`

Three things:
1. **\`debug_assert!\` on length** — in debug builds this catches "I sliced the wrong amount." In release builds it compiles away to nothing. Cost-free safety in development.
2. **\`u64::from_be_bytes\` accepts \`[u8; 8]\`** — fixed-size array, not a slice. So we copy 8 bytes from \`chunk[24..32]\` into a stack \`[u8; 8]\` buffer first.
3. **Plain \`fn\`, not \`pub fn\`.** Private to the module. Nothing outside \`precompiles/mod.rs\` needs this.

> 🛑 **Anti-fluency.** "Couldn't we just \`u64::from_be_bytes(chunk[24..32].try_into().unwrap())\`?" **We could** — same generated code in release. The named helper is for **clarity at the call site**: \`u64_from_be_chunk(&input[0..32])\` reads as "decode the first ABI slot as u64." \`u64::from_be_bytes(input[0..32][24..32].try_into().unwrap())\` reads as bytes-and-indices puzzle. **The helper compiles to identical instructions; the saving is in cognitive load.**

### Step 4: Add the \`place_order\` precompile function

Below \`read_best_bid\`, before \`u64_from_be_chunk\`:

\`\`\`rust
/// Place a limit order on the installed CLOB. The write counterpart to
/// \`read_best_bid\` — completes the EVM ↔ CLOB bidirectional surface.
///
/// Calldata layout (ABI-aligned, 128 bytes):
/// \`\`\`text
///   [  0.. 32]  account_id  (u64 in last 8 bytes)
///   [ 32.. 64]  side        (u8 in last byte: 0 = Buy, 1 = Sell)
///   [ 64.. 96]  price       (u64 in last 8 bytes)
///   [ 96..128]  qty         (u64 in last 8 bytes)
/// \`\`\`
///
/// Returns 32 bytes: the allocated \`order_id\` in the last 8 bytes, or zero
/// on rejection (no CLOB installed, malformed input, invalid side byte).
/// Allocated IDs start at 1, so zero is unambiguously "rejected".
///
/// L7 NOTE: this scaffold parses + validates + allocates an order_id, but
/// does NOT actually submit the order to the book. L8 adds the
/// \`book.submit(...)\` call that completes the write path.
#[allow(clippy::unnecessary_wraps)]
fn place_order(input: &[u8], _gas_limit: u64, _reservoir: u64) -> PrecompileResult {
    let mut out = vec![0u8; 32];

    // Need exactly 128 bytes of input (4 × ABI-padded fields).
    if input.len() < 128 {
        return Ok(PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0));
    }

    let _account_id = u64_from_be_chunk(&input[0..32]);
    let side_byte = input[63];
    let _price_value = u64_from_be_chunk(&input[64..96]);
    let qty_value = u64_from_be_chunk(&input[96..128]);

    let _side = match side_byte {
        0 => Side::Buy,
        1 => Side::Sell,
        _ => return Ok(PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0)),
    };

    // Reject orders with zero quantity outright — the book accepts them
    // technically, but a zero-qty order is always a bug from the caller.
    if qty_value == 0 {
        return Ok(PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0));
    }

    let state = CLOB_STATE.read().expect("CLOB_STATE rwlock poisoned");
    if state.as_ref().is_none() {
        // No CLOB installed → 0 sentinel.
        return Ok(PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0));
    }
    drop(state); // L8 will re-acquire as write-side-friendly

    let order_id_val = NEXT_ORDER_ID.fetch_add(1, Ordering::Relaxed);

    // L7 stops here. L8 will add: clob.lock().submit(Order { ... }).

    out[24..32].copy_from_slice(&order_id_val.to_be_bytes());
    Ok(PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0))
}
\`\`\`

Five sequential steps. Each rejection is an **early return**, not a nested \`if\` — keeps the happy path linear.

**The \`_\` prefix on \`_account_id\`, \`_price_value\`, \`_side\`** signals "we parsed it but don't use it yet." L8 will drop the underscores and pass them into \`Order { ... }\`. Until then, clippy and rustc accept the unused bindings because of the underscore convention.

**Length check at the top is a guard.** Any byte index \`input[N]\` would panic if N > input.len(). Validating \`>= 128\` once at the top means every subsequent \`input[X]\` access is provably safe — no per-access bounds-check overhead, no runtime panic risk.

**The \`_ =>\` arm in the side match.** \`Side\` is a 2-variant enum. The match must be exhaustive, but the EVM caller might pass any byte 0..=255 in the side slot. Anything not 0 or 1 is a rejection, not a panic.

**\`Ordering::Relaxed\` on the increment.** As established at Step 2.

**The \`out\` buffer.** All-zeros until the success path overwrites the last 8 bytes. Every rejection path returns the buffer unchanged — \`out[24..32]\` stays zero — which the caller decodes as \`order_id = 0\` = rejected.

> 🛑 **Anti-fluency.** "Why parse \`account_id\` and \`price\` if we don't use them yet?" **Because L7's job is to lock the calldata schema** — once the schema is published, contracts will build against it. Parsing every field (even the ones we don't use yet) means the parsing **shape** is the contract. If L8 changed which fields are parsed, every contract built between L7 and L8 would break. **Parse the full schema in L7 even if some bindings are unused; mutate behavior in L8.**

> 🛑 **Predict.** Look at the \`drop(state)\` line. Why explicitly drop the read-lock before allocating the order ID? Hint: think about what happens in L8 when we want to **acquire a write-side lock on the same Arc**.

(Answer: **A read lock blocks write locks.** If we held \`state\` for the entire function — including past the L8-future \`clob.lock()\` — we'd be holding a read lock on \`CLOB_STATE\` while trying to acquire a separate Mutex on the Book it points to. That works (no deadlock), but the read lock prevents anyone else from calling \`install_clob\` mid-precompile. Dropping it early reduces the lock-held window. **Be a good citizen: hold each lock for the shortest time you can get away with.**)

### Step 5: Update \`openhl_precompiles\` to register both

Current (after L6):

\`\`\`rust
#[must_use]
pub fn openhl_precompiles(base: &Precompiles) -> Precompiles {
    let mut precompiles = base.clone();
    precompiles.extend([Precompile::new(
        PrecompileId::custom("clob_read_best_bid"),
        CLOB_READ_BEST_BID,
        read_best_bid,
    )]);
    precompiles
}
\`\`\`

Replace with:

\`\`\`rust
#[must_use]
pub fn openhl_precompiles(base: &Precompiles) -> Precompiles {
    let mut precompiles = base.clone();
    precompiles.extend([
        Precompile::new(
            PrecompileId::custom("clob_read_best_bid"),
            CLOB_READ_BEST_BID,
            read_best_bid,
        ),
        Precompile::new(
            PrecompileId::custom("clob_place_order"),
            CLOB_PLACE_ORDER,
            place_order,
        ),
    ]);
    precompiles
}
\`\`\`

Two precompiles in one \`extend\` call — same as if we'd called \`extend\` twice. The array shape just stays cleaner as more precompiles get added.

Also update the doc comment on \`openhl_precompiles\` from "CLOB-reading additions" to "CLOB-reading + CLOB-writing additions" — it's a tiny edit but it's the kind of thing that desyncs over time if you don't update it now.

### Step 6: Add 3 tests + 1 test helper

In the \`#[cfg(test)] mod tests\` block, after the L6 round-trip test, add:

\`\`\`rust
    /// Helper: build a 128-byte ABI-aligned \`place_order\` calldata buffer.
    fn place_order_calldata(account: u64, side: u8, price: u64, qty: u64) -> Vec<u8> {
        let mut buf = vec![0u8; 128];
        buf[24..32].copy_from_slice(&account.to_be_bytes());
        buf[63] = side;
        buf[88..96].copy_from_slice(&price.to_be_bytes());
        buf[120..128].copy_from_slice(&qty.to_be_bytes());
        buf
    }

    /// With no CLOB installed, \`place_order\` rejects (returns sentinel 0).
    #[test]
    fn place_order_returns_zero_when_no_clob_installed() {
        let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        uninstall_clob();

        let calldata = place_order_calldata(42, 0, 100, 5);
        let result = place_order(&calldata, 100_000, 0).expect("precompile must not error");
        let order_id = U256::from_be_slice(&result.bytes[0..32]);
        assert_eq!(order_id, U256::ZERO);
    }

    /// \`place_order\` with bad input (too short, invalid side byte, zero qty)
    /// rejects — returns the sentinel 0.
    ///
    /// L7 NOTE: this test only checks the return value. L8 will add
    /// \`book.depth_bid() == 0\` assertions once submit is wired in.
    #[test]
    fn place_order_rejects_malformed_input() {
        let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        install_clob(Arc::new(Mutex::new(Book::new())));

        // Too short.
        let r = place_order(&[0u8; 64], 100_000, 0).unwrap();
        assert_eq!(U256::from_be_slice(&r.bytes[0..32]), U256::ZERO, "short input rejects");

        // Invalid side byte.
        let bad_side = place_order_calldata(42, 7, 100, 5);
        let r = place_order(&bad_side, 100_000, 0).unwrap();
        assert_eq!(U256::from_be_slice(&r.bytes[0..32]), U256::ZERO, "bad side byte rejects");

        // Zero qty.
        let zero_qty = place_order_calldata(42, 0, 100, 0);
        let r = place_order(&zero_qty, 100_000, 0).unwrap();
        assert_eq!(U256::from_be_slice(&r.bytes[0..32]), U256::ZERO, "zero qty rejects");

        uninstall_clob();
    }

    /// \`place_order\` on the happy path returns a non-zero order ID.
    ///
    /// L7 NOTE: this test only proves we **return** a non-zero ID; L8 will
    /// extend coverage to prove the order is actually visible on the book
    /// (the L8 round-trip test).
    #[test]
    fn place_order_returns_nonzero_id_on_valid_input() {
        let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        install_clob(Arc::new(Mutex::new(Book::new())));

        let calldata = place_order_calldata(0xABCD, 0, 175, 12);
        let result = place_order(&calldata, 100_000, 0).expect("precompile must not error");
        let order_id = U256::from_be_slice(&result.bytes[0..32]);
        assert!(order_id > U256::ZERO, "allocated id must be > 0 sentinel");

        uninstall_clob();
    }
\`\`\`

The helper builds the 128-byte buffer from the 4 logical values, hiding the ABI-padding details from each test. Without it, every test would have to repeat the byte indexing — error-prone, noisy.

**Three tests, three concerns:**

1. **No CLOB installed → zero.** Mirrors \`read_best_bid_returns_zero_when_no_clob_installed\`. Same pattern (serializer, \`uninstall_clob()\`, assert), same semantic (the precompile degrades gracefully on uninstalled state).
2. **Malformed input → zero, across all three rejection paths.** Three sub-assertions in one test because they're conceptually the same scenario ("bad input is refused"). **The L7 NOTE makes the deferred check (\`depth_bid == 0\`) explicit** — L8 will add it.
3. **Valid input → nonzero ID.** This is the "happy path acknowledgment." We allocated an ID. **We don't yet check whether the order made it onto the book** — that's L8's job.

> 🛑 **Anti-fluency.** "Why split into 3 tests instead of one big test?" **Because failure messages should pinpoint the cause.** If "the whole place_order path" is one test and it fails, you read the assertion message and the stack trace to figure out *which* sub-scenario broke. With 3 tests, the failing test's name *is* the cause: \`place_order_rejects_malformed_input\` failed → check the rejection paths; \`place_order_returns_nonzero_id_on_valid_input\` failed → check the happy path. **One concern per test makes failures self-describing.**

## Test

\`\`\`bash
cargo test -p openhl-evm --release
\`\`\`

After ~30 seconds:

\`\`\`
running 46 tests
... 46 tests pass ...

test result: ok. 46 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

Three more than L6 (43 → 46). The new ones are the three \`place_order_*\` tests. The 43 from Module 1+2 still pass — L7 is purely additive.

If you want to see only the L7-relevant tests:

\`\`\`bash
cargo test -p openhl-evm --release place_order
\`\`\`

Output:

\`\`\`
running 3 tests
test precompiles::tests::place_order_returns_zero_when_no_clob_installed ... ok
test precompiles::tests::place_order_rejects_malformed_input ... ok
test precompiles::tests::place_order_returns_nonzero_id_on_valid_input ... ok

test result: ok. 3 passed; 0 failed; 0 ignored; 0 measured; 43 filtered out
\`\`\`

Common errors and fixes:

- **\`unused import: AccountId, Order, OrderId, OrderType, Price, Qty, Side\`** — you imported them for L7 but don't use any yet. **Suppress with \`#[allow(unused_imports)]\` on the use statement, or just accept the warning** — L8 uses every one. Don't delete them.
- **\`unused variable: _side\`** in the match arm — this is \`_side\`'s purpose; the underscore prefix tells rustc "I know it's unused, don't warn me." If you wrote \`let side = match ...\` (no underscore), you'll get an unused-variable warning. Restore the underscore.
- **\`error[E0061]: this function takes 0 arguments but 1 was supplied\`** on \`u64_from_be_chunk\` — you misspelled the function name or are calling it with multiple slices. The signature is \`u64_from_be_chunk(chunk: &[u8])\`, one argument.
- **\`error[E0277]: 'u64' is not 'u8'\`** on \`buf[63] = side\` in the helper — you wrote \`side: u64\` or similar. The helper's parameter is \`side: u8\`; the byte position 63 is exactly one byte.
- **Test passes alone, fails in suite** — \`TEST_SERIALIZER\` lock not first statement. Reorder so \`let _g = TEST_SERIALIZER.lock()...\` comes before any other code in each test.

## Design reflection

Four points worth stopping on:

1. **The schema is the contract; the behavior comes later.** L7 ships the precompile address, the 128-byte calldata layout, and the 32-byte return shape. **Once published, contracts will start calling it.** If L8 changed the calldata layout, every contract built between would break. Locking the schema in L7 (even if behavior is incomplete) means the contract is stable from the day it's exposed.

2. **Rejection paths are tested before the happy path is fully wired.** Each rejection is a public API guarantee: "if you send malformed input, you'll get sentinel 0 back, never a panic, never a partial state mutation." These guarantees can be tested *before* the happy path does anything interesting — and locking them in early means the validation logic isn't an afterthought when L8 adds the real submit call.

3. **\`AtomicU64\` instead of \`Mutex<u64>\` for order IDs.** The choice was made based on the access pattern: ID allocation happens on every order placement, with no logical dependency on book state. Atomic increment is wait-free; mutex acquisition can block. **Pick the lighter primitive when the data has no synchronization invariants with other state.**

4. **\`Ordering::Relaxed\` is enough because the book has its own mutex.** The book's \`Mutex\` provides the synchronization for order-on-book visibility. The atomic counter provides ID uniqueness, but the IDs don't have any synchronization invariant with other writes. **Memory orderings should be picked from the *invariants you need*, not from "safer is better."**

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout a8823a1
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
\`\`\`

After L7, your code is **close to Stage 9c but stops short** at one specific point: the \`place_order\` function in Stage 9c has a \`book.submit(...)\` call between order_id allocation and encoding. Your L7 version doesn't. The test \`place_order_rejects_malformed_input\` in Stage 9c also has \`depth_bid() == 0\` assertions; your L7 version doesn't. And Stage 9c has a \`place_order_then_read_best_bid_round_trips\` test; your L7 version doesn't. **Those are all L8.**

Return:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: Why not just have \`place_order\` panic on malformed input?**
Because precompiles are called from Solidity, and a panic would propagate as a precompile error, reverting the entire transaction. A \`0\` return value lets the calling contract decide what to do: log, retry with corrected input, surface to the user. **Precompiles should fail soft when the failure is a caller bug.**

**Q: What's the difference between \`AtomicU64::fetch_add(1, Relaxed)\` and \`fetch_add(1, SeqCst)\`?**
Both are atomic in the sense that no two threads will get the same return value. The difference is in **memory ordering**: \`SeqCst\` adds memory fences that synchronize with all other \`SeqCst\` operations program-wide; \`Relaxed\` only guarantees that the increment itself is atomic, without any synchronization with other memory operations. For our case (a counter with no logical dependency on other state), \`Relaxed\` is enough and is faster.

**Q: Could we have an \`EnumValueError\` or similar for bad input?**
The \`PrecompileFn\` signature is \`fn(...) -> PrecompileResult\` where \`PrecompileResult = Result<PrecompileOutput, PrecompileError>\`. We *could* return \`Err(...)\` on malformed input, but that would propagate as an EVM-level error (transaction reverts). Returning \`Ok\` with sentinel 0 lets the calling contract handle the rejection gracefully. **This is a design choice: are precompile errors EVM-fatal or caller-visible?** For our case (validating user-supplied calldata), caller-visible is the better default.

**Q: What if someone submits an order at exactly \`u64::MAX\`?**
Eventually \`NEXT_ORDER_ID.fetch_add(1, Relaxed)\` will wrap around to 0 (it returns u64). At that point, the next allocation returns the sentinel 0 — and the caller treats it as "rejected." \`u64\` overflow at ~1.8e19 orders is roughly 18 quintillion order placements, which is fine for v0. Production should either use a wider counter or panic on near-overflow.

## Next lesson (L8)

L8 is one-line plus tests. The line: \`clob.lock().expect("...").submit(Order { id, account, side, qty, order_type });\` between order_id allocation and encoding. The tests: extend \`place_order_rejects_malformed_input\` to assert \`book.depth_bid() == 0\` after each rejection (the meaningful side-effect-check now that submit is wired), and replace \`place_order_returns_nonzero_id_on_valid_input\` with \`place_order_then_read_best_bid_round_trips\` — the two-precompile round-trip that proves writes via \`0x...0c1c\` are visible to reads via \`0x...0c1b\`. **That round-trip is Module 3's mid-stage milestone.**`,
                },
                {
                  title: "Lesson 8 — book.submit(...) — the write path goes live",
                  slug: "openhl-precompiles-place-order-write-en",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 30,
                  xpReward: 60,
                  content: `# Lesson 8 — \`book.submit(...)\` — the write path goes live

## Goal

Concepts you'll grasp in this lesson:

- **The precompile represents an on-chain caller** — when test code writes directly to \`book.lock().submit(...)\`, that simulates the bridge (off-chain). When \`place_order\` writes to the book, that simulates an EVM transaction (on-chain). L8 is the moment EVM execution starts mutating CLOB state.
- **Two precompiles, one Arc, shared state = round-trip** — both precompiles read/write through \`CLOB_STATE\`, so a write via \`0x...0c1c\` is immediately visible to a read via \`0x...0c1b\`. The L4 architecture was designed for exactly this moment.
- **Schema-first means behavior-second is small** — L7 wrote ~70 lines (constants, atomic, parser, registration, tests). L8 adds ~7 lines (the submit call + binding renames + test extensions). Locking the contract first compressed the behavior change.
- **Side-effect testing requires holding a handle** — L7's malformed-input test couldn't check the book because it didn't keep a reference. L8 fixes that with \`let book = Arc::new(...); install_clob(book.clone());\`. The clone is the difference between testing returns and testing state.
- **\`_result\` vs \`_\` as future-intent markers** — \`_result\` says "I see this value, don't use it yet, expect future use." \`_\` (bare) says "I'm explicitly not using this." L8 binds to \`_result\`; L9 renames to \`fills\`.

Verification:

\`\`\`bash
cargo test -p openhl-evm --release
\`\`\`

…passes 46 tests, same count as L7.

Specific changes:

With a one-line addition to \`place_order\` and two test changes, the precompile **actually writes to the book**:

- **One line added** to \`place_order\` — \`clob.lock().submit(Order { ... })\` between order_id allocation and encoding.
- **L7's \`_\` prefixes dropped** from \`_account_id\` / \`_price_value\` / \`_side\` — they're used now.
- **L7's \`place_order_rejects_malformed_input\` extended** — each rejection sub-assertion now also checks \`book.depth_bid() == 0\` (proves no partial mutation on rejection).
- **L7's \`place_order_returns_nonzero_id_on_valid_input\` replaced** — by \`place_order_then_read_best_bid_round_trips\`, the two-precompile round-trip that proves writes via \`0x...0c1c\` are visible to reads via \`0x...0c1b\`.

This round-trip is **Module 3's mid-stage milestone**: the EVM ↔ CLOB surface is now bidirectional. A smart contract can place an order via one precompile and immediately read the best bid via another, with both seeing the same \`Arc<Mutex<Book>>\`.

## Recap

L7 left us with:
- \`place_order\` parses 128-byte calldata into \`(account, side, price, qty)\`, validates, allocates \`order_id\` — **then returns it without writing.**
- The 3 unit tests all pass, but \`place_order_rejects_malformed_input\` only checks the return value (no side-effect check).
- The happy-path test (\`place_order_returns_nonzero_id_on_valid_input\`) only verifies we *return* an ID, not that the order is on the book.

The function is half a write-path. L8 makes it whole.

## Plan

Three edits to \`crates/evm/src/precompiles/mod.rs\`:

1. **Inside \`place_order\`** — between order ID allocation and the output encoding, lock the Book and call \`submit\`. Drop the underscores from the bindings (now used).
2. **Inside \`place_order_rejects_malformed_input\` test** — after each of the 3 rejection assertions, also assert \`book.lock().unwrap().depth_bid() == 0\`. This requires the test to hold \`book\` (an \`Arc<Mutex<Book>>\`) so it can inspect the book after rejection.
3. **Replace \`place_order_returns_nonzero_id_on_valid_input\`** with a new test \`place_order_then_read_best_bid_round_trips\` — the two-precompile round-trip.

No imports change. No new functions. No new precompiles. **L8 is the smallest content lesson in the course** — the value is in proving that one line of code closes a bidirectional surface.

> 🛑 **Predict.** Before scrolling: we already proved in L6 that the read precompile sees live data from the global Arc. The only thing changed in L8 is the *source* of that data — instead of the test setup writing directly to the Arc via \`book.lock().submit(...)\` (as L6 did), the **\`place_order\` precompile** writes to it. **Why does this change matter?** Hint: think about what kind of caller the precompile represents.

(Answer: **The precompile represents a smart contract caller.** When L6 wrote to the book directly from test code, that was equivalent to the *bridge* (off-chain code) writing to the book. When \`place_order\` writes to the book, that's equivalent to **an EVM transaction writing to the book** — a smart contract's call propagating through EVM dispatch into a precompile and producing book state. **Stage 9c is the moment EVM execution starts mutating CLOB state.** Until L8, only off-chain code could write to the book. After L8, on-chain code can.)

## Walk-through

### Step 1: Add the \`submit\` call to \`place_order\`

Find the L7 body. The relevant region is between the order ID allocation and the output encoding:

\`\`\`rust
    drop(state); // L8 will re-acquire as write-side-friendly

    let order_id_val = NEXT_ORDER_ID.fetch_add(1, Ordering::Relaxed);

    // L7 stops here. L8 will add: clob.lock().submit(Order { ... }).

    out[24..32].copy_from_slice(&order_id_val.to_be_bytes());
\`\`\`

Change this region to:

\`\`\`rust
    let order_id_val = NEXT_ORDER_ID.fetch_add(1, Ordering::Relaxed);

    let mut book = clob.lock().expect("clob mutex poisoned");
    let _result = book.submit(Order {
        id: OrderId(order_id_val),
        account: AccountId(account_id),
        side,
        qty: Qty(qty_value),
        order_type: OrderType::Limit {
            price: Price(price_value),
        },
    });
    drop(book);

    out[24..32].copy_from_slice(&order_id_val.to_be_bytes());
\`\`\`

Several things to notice:

- **\`drop(state)\` was removed.** In L7 we had a half-step that read \`CLOB_STATE\`, checked for \`Some\`, then dropped the read lock. In L8 we use the same read but bind to \`clob\` (the \`Arc\` inside). Let me show the full updated function in Step 2 — the read-lock dance has to be reshaped.

Actually — let me show the full updated \`place_order\` body so the lock pattern is obvious. Replace the body's lock section (after the qty check) with:

\`\`\`rust
    let state = CLOB_STATE.read().expect("CLOB_STATE rwlock poisoned");
    let Some(clob) = state.as_ref() else {
        // No CLOB installed → 0 sentinel.
        return Ok(PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0));
    };

    let order_id_val = NEXT_ORDER_ID.fetch_add(1, Ordering::Relaxed);

    let mut book = clob.lock().expect("clob mutex poisoned");
    let _result = book.submit(Order {
        id: OrderId(order_id_val),
        account: AccountId(account_id),
        side,
        qty: Qty(qty_value),
        order_type: OrderType::Limit {
            price: Price(price_value),
        },
    });
    drop(book);

    out[24..32].copy_from_slice(&order_id_val.to_be_bytes());
    Ok(PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0))
\`\`\`

The change from L7:
- \`if state.as_ref().is_none() { ... }; drop(state);\` becomes \`let Some(clob) = state.as_ref() else { ... };\` — the \`let-else\` binding lets us keep \`clob\` accessible after the \`None\` early return.
- After the \`Some\` binding, we **don't drop \`state\`** — we need it to live long enough that \`clob\` (a reference into it) stays valid through the \`clob.lock()\` call.
- \`let _result = book.submit(...)\` — \`submit\` returns a \`Vec<Fill>\` (the matching engine's fills). At L8 we ignore them. **L9 routes these fills back to the bridge** — but for now, \`let _result\` keeps clippy quiet about the unused return value.
- \`drop(book)\` — explicit drop of the Book mutex guard. The \`out[24..32]\` copy and the \`Ok(...)\` return happen without holding the Book lock. Tiny optimization for hot paths.

**Also drop the \`_\` prefixes from the bindings** (now used):

\`\`\`rust
    let account_id = u64_from_be_chunk(&input[0..32]);   // was _account_id
    let side_byte = input[63];
    let price_value = u64_from_be_chunk(&input[64..96]); // was _price_value
    let qty_value = u64_from_be_chunk(&input[96..128]);

    let side = match side_byte {                          // was _side
        0 => Side::Buy,
        1 => Side::Sell,
        _ => return Ok(PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0)),
    };
\`\`\`

Three identifiers gain meaning: \`account_id\` becomes the order's account, \`price_value\` becomes the limit price, \`side\` becomes the order's side. **The full Order struct construction in L8's submit is exactly the data we parsed in L7.** That's what "schema locked in L7, behavior added in L8" looks like in practice.

Also update the doc comment — remove the L7 "L7 NOTE" line about not yet calling submit:

\`\`\`rust
/// Place a limit order on the installed CLOB. The write counterpart to
/// \`read_best_bid\` — completes the EVM ↔ CLOB bidirectional surface.
///
/// Calldata layout (ABI-aligned, 128 bytes):
/// \`\`\`text
///   [  0.. 32]  account_id  (u64 in last 8 bytes)
///   [ 32.. 64]  side        (u8 in last byte: 0 = Buy, 1 = Sell)
///   [ 64.. 96]  price       (u64 in last 8 bytes)
///   [ 96..128]  qty         (u64 in last 8 bytes)
/// \`\`\`
///
/// Returns 32 bytes: the allocated \`order_id\` in the last 8 bytes, or zero
/// on rejection (no CLOB installed, malformed input, invalid side byte).
/// Allocated IDs start at 1, so zero is unambiguously "rejected".
///
/// Side note: the fills returned by \`Book::submit\` are discarded here.
/// Production-shape integration would route them through the bridge's
/// \`pending_fills\` so they reach the next \`build_payload\`. At v0 the
/// precompile and the bridge are write-side independent.
\`\`\`

The "Side note" at the bottom names the next gap — fills returned by \`submit\` are discarded. **That gap is L9.** Naming it in the doc comment means future readers see "we know this is a gap" rather than wondering if it's an oversight.

> 🛑 **Anti-fluency.** "Why is \`_result\` underscored if we want to suppress the unused warning?" **\`let _result = ...\` and \`let _ = ...\` both suppress the warning.** The difference: \`let _result\` *binds* the value and drops it at end of scope. \`let _ = ...\` drops the value *immediately* (before any subsequent statement). For \`submit\`, either works because nothing in the function reads \`_result\` later. But \`let _result\` is conventional when the value has a meaningful name and we plan to use it later — like in L9, where we'll bind it to a real name and route it. **\`_result\` is a "future intent" marker.**

> 🛑 **Anti-fluency.** "Why explicitly \`drop(book)\` if the lock would release at end-of-scope anyway?" **Because the encoding and Ok() return are still pending.** If we don't \`drop(book)\`, the Book lock is held across the \`out[24..32].copy_from_slice(...)\` and the \`Ok(PrecompileOutput::new(...))\` construction. Neither needs the lock. Holding it costs concurrent readers and other precompiles parallel access. **Explicit drop = "I'm done with this lock, I don't need it for the rest of the function."** Compiler-optional, but it shrinks the lock-held window noticeably in hot paths.

### Step 2: Extend \`place_order_rejects_malformed_input\` with \`depth_bid\` checks

Current L7 test:

\`\`\`rust
    #[test]
    fn place_order_rejects_malformed_input() {
        let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        install_clob(Arc::new(Mutex::new(Book::new())));

        // Too short.
        let r = place_order(&[0u8; 64], 100_000, 0).unwrap();
        assert_eq!(U256::from_be_slice(&r.bytes[0..32]), U256::ZERO, "short input rejects");

        // Invalid side byte.
        let bad_side = place_order_calldata(42, 7, 100, 5);
        let r = place_order(&bad_side, 100_000, 0).unwrap();
        assert_eq!(U256::from_be_slice(&r.bytes[0..32]), U256::ZERO, "bad side byte rejects");

        // Zero qty.
        let zero_qty = place_order_calldata(42, 0, 100, 0);
        let r = place_order(&zero_qty, 100_000, 0).unwrap();
        assert_eq!(U256::from_be_slice(&r.bytes[0..32]), U256::ZERO, "zero qty rejects");

        uninstall_clob();
    }
\`\`\`

The test installs a Book but discards the Arc, so it can't check book state. Replace with:

\`\`\`rust
    /// \`place_order\` with bad input (too short, invalid side byte, zero qty)
    /// rejects without mutating state.
    #[test]
    fn place_order_rejects_malformed_input() {
        let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        let book = Arc::new(Mutex::new(Book::new()));
        install_clob(book.clone());

        // Too short.
        let r = place_order(&[0u8; 64], 100_000, 0).unwrap();
        assert_eq!(U256::from_be_slice(&r.bytes[0..32]), U256::ZERO);
        assert_eq!(book.lock().unwrap().depth_bid(), 0, "no order on book after short input");

        // Invalid side byte.
        let bad_side = place_order_calldata(42, 7, 100, 5);
        let r = place_order(&bad_side, 100_000, 0).unwrap();
        assert_eq!(U256::from_be_slice(&r.bytes[0..32]), U256::ZERO);
        assert_eq!(book.lock().unwrap().depth_bid(), 0, "no order on book after bad side");

        // Zero qty.
        let zero_qty = place_order_calldata(42, 0, 100, 0);
        let r = place_order(&zero_qty, 100_000, 0).unwrap();
        assert_eq!(U256::from_be_slice(&r.bytes[0..32]), U256::ZERO);
        assert_eq!(book.lock().unwrap().depth_bid(), 0, "no order on book after zero qty");

        uninstall_clob();
    }
\`\`\`

Three changes from L7:

1. **\`let book = Arc::new(...); install_clob(book.clone());\`** — bind the Arc to a local. The \`.clone()\` of an Arc is just a refcount bump; both names point to the same Book.
2. **3 new assertions: \`book.lock().unwrap().depth_bid() == 0\`** — after each rejection, the book has nothing on it. **\`depth_bid()\` is the count of bid orders across all price levels** (defined in course 7's Book). Zero = empty.
3. **The doc comment** — added (L7 had a "L7 NOTE" version explaining the deferred check; that's gone now).

**The 3 new assertions are the side-effect proof.** L7's \`assert_eq!(... U256::ZERO)\` only checked the precompile *returned* the sentinel. L8 now checks the precompile **also didn't write anything**. The two together prove: malformed input → returns 0 *and* leaves state untouched.

> 🛑 **Anti-fluency.** "Why \`book.clone()\` instead of just passing \`book\`?" **Because we want to retain a handle to inspect after \`install_clob\` consumes (moves) its argument.** \`install_clob(Arc<Mutex<Book>>)\` takes the Arc by value. After \`install_clob(book.clone())\`, the global holds one Arc, \`book\` (in this scope) holds another. Both refer to the same Book. If we wrote \`install_clob(book)\` instead, we'd no longer have a local handle to call \`.lock().unwrap().depth_bid()\` on. **Arc::clone is the cheap way to share ownership across a function call.**

### Step 3: Replace the happy-path test with the round-trip

Delete L7's:

\`\`\`rust
    #[test]
    fn place_order_returns_nonzero_id_on_valid_input() {
        // ...
    }
\`\`\`

Add in its place:

\`\`\`rust
    /// **Stage 9c end-to-end (write side)**: place a Buy via the precompile,
    /// then read the best bid via the read precompile. The two-precompile
    /// round-trip is the moment the EVM ↔ CLOB surface becomes bidirectional.
    #[test]
    fn place_order_then_read_best_bid_round_trips() {
        let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        let book = Arc::new(Mutex::new(Book::new()));
        install_clob(book);

        // EVM call: place Buy @ 175 with qty 12, account 0xABCD.
        let calldata = place_order_calldata(0xABCD, 0, 175, 12);
        let result = place_order(&calldata, 100_000, 0).expect("precompile must not error");
        let returned_id = U256::from_be_slice(&result.bytes[0..32]);
        assert!(
            returned_id > U256::ZERO,
            "place_order must return a non-zero order id on success"
        );

        // Now read the best bid via the read precompile. Should see our order.
        let read_result = read_best_bid(&[], 100_000, 0).expect("precompile must not error");
        let price = U256::from_be_slice(&read_result.bytes[0..32]);
        let qty = U256::from_be_slice(&read_result.bytes[32..64]);
        assert_eq!(price, U256::from(175u64), "best bid is the placed order's price");
        assert_eq!(qty, U256::from(12u64), "qty at best level matches placed qty");

        uninstall_clob();
    }
\`\`\`

Why this replaces (not supplements) the L7 test:

- L7's \`place_order_returns_nonzero_id_on_valid_input\` only asserted that \`place_order\` returns a nonzero ID. That assertion is **subsumed** by this test's \`assert!(returned_id > U256::ZERO, ...)\`.
- The new test goes further: it then reads via \`read_best_bid\` and verifies the placed order is visible. **The L7 assertion is a strict subset of the L8 assertion.**

Keeping both would be redundant. **A subsumed test is dead weight** — it doesn't add coverage, just maintenance burden.

The two precompile calls are independent — \`read_best_bid\` doesn't know \`place_order\` happened. They both read/write the same \`Arc<Mutex<Book>>\` via \`CLOB_STATE\`. **That's the round-trip: write through one precompile, observed by the other.** From a Solidity contract's perspective:

\`\`\`solidity
uint256 order_id = call(0x...0c1c, abi.encode(0xABCD, 0, 175, 12));   // ~ id > 0
(uint256 price, uint256 qty) = staticcall(0x...0c1b, "");             // ~ (175, 12)
\`\`\`

Two separate EVM calls, two separate precompiles, but they share state because they share the global. **The bridge installed that global. The bridge's submit_order writes to it. The bridge's pending_fills hasn't gained anything yet (L9 fixes that).**

> 🛑 **Predict.** Before scrolling: this test installs a \`Book\`, places a Buy via \`place_order\`, then reads via \`read_best_bid\`. **What would happen if the read precompile and the write precompile each held their own \`Arc<Mutex<Book>>\` (two separate Books)?** Hint: think about what shared state means.

(Answer: **The test would fail.** \`read_best_bid\` would see an empty book and return zero. The only reason this round-trip works is that **both precompiles read from the same \`CLOB_STATE\` global, which holds one Arc, which points to one Book.** The Arc-shared-pattern is what makes the round-trip semantically meaningful. If we had two precompiles each with their own private state, they'd be functionally isolated — useless for talking to the same CLOB.)

## Test

\`\`\`bash
cargo test -p openhl-evm --release
\`\`\`

After ~30 seconds:

\`\`\`
running 46 tests
... 46 tests pass ...

test result: ok. 46 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

Same count as L7 (46). What changed: 1 test was replaced (\`place_order_returns_nonzero_id_on_valid_input\` → \`place_order_then_read_best_bid_round_trips\`), and 1 was extended (\`place_order_rejects_malformed_input\` now also checks book state).

To see the milestone test specifically:

\`\`\`bash
cargo test -p openhl-evm --release round_trips
\`\`\`

Output:

\`\`\`
running 1 test
test precompiles::tests::place_order_then_read_best_bid_round_trips ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 45 filtered out
\`\`\`

**That \`ok\` line is Module 3's mid-stage milestone.** Two custom precompiles, one shared state, full write→read round-trip in EVM execution.

Common errors and fixes:

- **\`error[E0382]: borrow of moved value: 'state'\`** in \`place_order\` — you wrote \`let Some(clob) = state.as_ref() else { ... };\` but then later code uses \`state\`. The \`let-else\` pattern binds \`clob\` (a reference into \`state\`), so \`state\` must stay live; don't add \`drop(state)\` anywhere afterward.
- **\`error: cannot find value 'account_id' in this scope\`** — you dropped the \`_\` prefix in the inner \`Order { ... }\` literal but the parsing line still has \`let _account_id = ...\`. Drop the prefix in *both* places.
- **\`assertion failed: book.lock().unwrap().depth_bid() == 0\`** in \`place_order_rejects_malformed_input\` — a rejection path is **not** rejecting cleanly. Something passed through the early returns and called \`book.submit(...)\`. Re-check the rejection sequence: short input → side byte → qty → no CLOB. Each must be \`return Ok(...)\` not \`if ... { ... }\` with the body falling through.
- **\`assertion failed: left=200 right=175\`** in the round-trip test — your \`submit\` is binding the wrong field. The order's \`price\` should be the one parsed from calldata at \`input[64..96]\` (a u64). Check that you pass \`Price(price_value)\` (not \`Price(qty_value)\` or similar).
- **\`error[E0599]: no method 'depth_bid' found for struct 'Book'\`** — that method was added in course 7's Book design. Verify it exists in \`crates/clob/src/book.rs\`.

## Design reflection

Four points worth pausing on:

1. **Schema-first means behavior-second is small.** L7 wrote ~70 lines of code (constants, atomic, parser, registration, tests). L8 added ~7 lines (the submit call + binding renames + test extensions). That **small delta is the point**: by locking the contract before the implementation, the implementation becomes a focused change instead of a sprawling one. Future precompile additions can follow the same pattern.

2. **Two precompiles, one Arc, shared state = round-trip works.** The architecture from L4 (\`Arc<Mutex<Book>>\` in a \`static\`, installed by the bridge, read by each precompile) was designed for exactly this moment. **Both precompiles see the same Book because both go through \`CLOB_STATE\`.** A different architecture (one global per precompile) would have been simpler to build initially but would have prevented the round-trip from being possible at all.

3. **Side-effect testing means holding a handle.** L7's malformed-input test couldn't check the book because it didn't keep a reference. L8 fixed that with \`let book = Arc::new(...); install_clob(book.clone());\`. **The clone is the difference between testing returns and testing state.** Cheap (1 atomic increment); valuable (proves no partial writes).

4. **\`_result\` is a future-intent marker.** L8 binds the fills returned by \`submit\` to \`_result\` and ignores them. L9 will bind to \`fills\` (no underscore) and route them. The naming convention is: \`_name\` = "I see this value and acknowledge it but don't use it yet; expect future use." \`_\` (bare) = "I'm explicitly not using this and don't plan to." Pick the right one for the situation.

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout a8823a1
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
\`\`\`

After L8, your code matches Stage 9c. The diff should be **empty** (modulo any doc comment phrasing you wrote on your own). **Stage 9c is now closed.**

Return:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: What's \`Book::submit\`'s return value, and why are we discarding it?**
\`Book::submit(order)\` returns \`Vec<Fill>\` — the fills that resulted from matching the new order against resting orders on the opposite side. If you submit a marketable Buy, it may consume one or more Sell orders, producing one Fill per match. We discard these fills in L8 because the bridge's \`pending_fills\` (which gets attached to the next payload) isn't connected to the precompile yet. **L9 connects them via an \`install_fill_sink\` pattern that mirrors \`install_clob\`.**

**Q: What happens if \`place_order\` is called from a \`staticcall\`?**
A staticcall is a read-only call — Solidity revert if the target attempts state mutation. **For precompiles, the EVM doesn't enforce this at the precompile boundary** — it's up to the precompile to refuse writes when called via STATICCALL. At v0 we don't check this; a sufficiently-determined contract could STATICCALL \`0x...0c1c\` and we'd happily write to the book. **This is a known soundness gap.** Production should plumb the call context (\`is_static\`) through and reject. Out of scope at v0.

**Q: Could one EVM call produce *both* a write and a read in our setup?**
Yes — a single Solidity function could \`call(0x...0c1c, ...)\` and then \`staticcall(0x...0c1b, ...)\` in sequence. That's effectively what \`place_order_then_read_best_bid_round_trips\` simulates at the Rust level. Both calls execute inside one EVM transaction's call stack, both touch \`CLOB_STATE\` global. **If the EVM transaction reverts later, the book state isn't rolled back** — another soundness gap. Production needs transaction-scoped state shadowing.

**Q: Why is \`place_order\` registered at \`0x...0c1c\` and not \`0x...0c1a\`?**
Address namespacing convention: \`0c1b\` = "Read Best [b]id," \`0c1c\` = "[c]lob [c]reate." Numerically \`0c1a\` was tempting (\`0c1a < 0c1b\`), but \`0c1c\` reads better aloud and keeps the read/write addresses adjacent — \`0c1b\` for the read, \`0c1c\` for the write — which helps anyone scanning a contract that uses both. Address conventions matter when contracts will be written by humans.

## Next lesson (L9)

L9 closes the "fills are discarded" gap from L8's doc comment. Add a \`FILL_SINK\` static parallel to \`CLOB_STATE\` — process-global \`Option<Arc<Mutex<Vec<Fill>>>>\`. \`place_order\` now pushes fills into the sink. The bridge's \`pending_fills\` field becomes \`Arc<Mutex<Vec<Fill>>>\` (was just \`Mutex<...>\`); the bridge's \`new()\` installs it as the FILL_SINK. After L9, **EVM-placed orders produce fills that flow into the bridge's payload-attached fill stream** — the precompile and the bridge are no longer write-side independent.`,
                },
              ],
            },
          },
          {
            title: "Bridge integration",
            sortOrder: 4,
            lessons: {
              create: [
                {
                  title: "Lesson 9 — install_fill_sink — fills flow back to the bridge",
                  slug: "openhl-precompiles-fill-sink-en",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 40,
                  xpReward: 80,
                  content: `# Lesson 9 — \`install_fill_sink\` — fills flow back to the bridge

## Goal

Concepts you'll grasp in this lesson:

- **The shared-buffer pattern generalizes** — L4's \`Arc<Mutex<T>>\` + process-global pattern for CLOB state is reused 1:1 for fills. Once the primitive is in place, additional shared state costs ~20 lines per buffer. The L4 abstraction pays compound interest.
- **Orthogonal globals = orthogonal test setup** — bundling \`CLOB_STATE\` and \`FILL_SINK\` into one global would force every test to install both. Two separate globals keep test setup composable; only install what your test actually exercises.
- **Early-out on the common case is free** — \`if !submit_result.fills.is_empty()\` skips lock acquisition when the order rests without crossing (the dominant case). One branch in the hot path saves an \`RwLock\` acquisition.
- **\`drop(book)\` before pushing to the sink — release the inner lock before taking the outer one** — holding both locks (Book + sink) at once would create a lock-ordering hazard. Explicitly dropping the Book guard keeps lock acquisition strictly sequential.
- **Doc-comment-as-debt-tracker** — L8's "fills are discarded" doc comment was load-bearing: it told future readers "deliberate gap, not oversight." L9 closes the gap and updates the doc. A documented gap is half-fixed; an undocumented gap is invisible debt.

Verification:

\`\`\`bash
cargo test -p openhl-evm --release
\`\`\`

…passes 47 tests (1 new).

Specific changes:

The "fills are discarded" gap from L8's doc comment is closed:

- **\`FILL_SINK\` static added** — parallel to \`CLOB_STATE\`, holds \`Option<Arc<Mutex<Vec<Fill>>>>\`.
- **\`install_fill_sink\` / \`uninstall_fill_sink\` module fns** — public, mirror the \`install_clob\` / \`uninstall_clob\` pattern.
- **\`place_order\` extended** — \`let submit_result = book.submit(...)\` (was \`_result\`); after \`drop(book)\`, if the sink is installed, **push the produced fills into it**.
- **\`LiveRethEvmBridge::pending_fills\`** changes from \`Mutex<Vec<Fill>>\` to \`Arc<Mutex<Vec<Fill>>>\`. The bridge's \`new()\` now calls \`install_fill_sink(Arc::clone(&pending_fills))\` alongside \`install_clob\`.
- **New unit test** \`place_order_routes_fills_to_installed_sink\` — exercises the maker/taker cross and verifies the sink receives a fill.

After L9, the precompile and the bridge are no longer **write-side independent**. EVM-placed orders produce fills that flow into the same \`pending_fills\` queue that bridge-side \`submit_order\` writes to. The next \`build_payload\` will see them.

## Recap

L8 closed Stage 9c proper: \`place_order\` now writes to the book, and the round-trip via \`place_order → read_best_bid\` is proven. But L8's doc comment named a gap:

> Side note: the fills returned by \`Book::submit\` are discarded here. Production-shape integration would route them through the bridge's \`pending_fills\` so they reach the next \`build_payload\`.

That gap was deliberate — Stage 9c shipped without it to keep the diff focused. Stage 9c+ closes it.

## Plan

Five edits to \`crates/evm/src/precompiles/mod.rs\` + 2 edits to \`crates/evm/src/live_node.rs\`:

1. **Import \`Fill\`** in \`precompiles/mod.rs\` (and in \`live_node.rs\` if not already present).
2. **Add the \`FILL_SINK\` static** and the 2 install/uninstall module fns.
3. **Inside \`place_order\`** — rename \`_result\` to \`submit_result\`, then push \`submit_result.fills\` into the sink (if installed) after the Book lock is dropped.
4. **Update \`place_order\` doc comment** — remove the "fills are discarded" side note, replace with the Stage 9c+ behavior.
5. **Add the unit test** \`place_order_routes_fills_to_installed_sink\`.

For \`live_node.rs\`:

6. **Change \`pending_fills\` field** from \`Mutex<Vec<Fill>>\` to \`Arc<Mutex<Vec<Fill>>>\`.
7. **Update \`new()\`** — bind \`pending_fills\` as an Arc, call \`install_fill_sink(Arc::clone(&pending_fills))\` alongside the existing \`install_clob\`.

> 🛑 **Predict.** Before scrolling: we already have a precompile (\`place_order\`) that calls \`book.submit(...)\` and *discards* the returned fills. To make those fills reach the bridge, we could (a) have the precompile *call* the bridge directly, (b) have the bridge *poll* somewhere for fills, or (c) install a shared buffer the precompile pushes into. **Why is option (c) — the shared-buffer pattern — almost forced by the architecture we've built?** Hint: think about what (a) and (b) would require knowing.

(Answer: **The precompile is a \`fn\` pointer; it can't capture a reference to the bridge.** Option (a) would require giving the precompile an \`&Bridge\` somehow, which is the same function-pointer-capture problem we solved with the \`CLOB_STATE\` global. Option (b) would require the bridge to know it should poll — a clear separation-of-concerns violation. Option (c) is the same pattern: bridge owns the buffer, precompile sees it through a global. **Once the architecture for shared CLOB state is in place, shared fill state is the natural extension.**)

## Walk-through

### Step 1: Import \`Fill\`

In \`crates/evm/src/precompiles/mod.rs\`, the current import is:

\`\`\`rust
use openhl_clob::{AccountId, Book, Order, OrderId, OrderType, Price, Qty, Side};
\`\`\`

Add \`Fill\`:

\`\`\`rust
use openhl_clob::{AccountId, Book, Fill, Order, OrderId, OrderType, Price, Qty, Side};
\`\`\`

\`Fill\` is a value type defined in \`crates/clob/src/lib.rs\` (from course 7). It has \`price: Price\` and \`qty: Qty\` fields (and possibly more — \`maker_order_id\`, \`taker_order_id\`, etc., but the test below only inspects \`price\` and \`qty\`). Copy-able, so passing fills around is cheap.

In \`crates/evm/src/live_node.rs\`, the \`Fill\` import is already present (the existing \`pending_fills\` field uses it). No change there yet.

### Step 2: Add \`FILL_SINK\` + install/uninstall fns

After \`uninstall_clob\`:

\`\`\`rust
/// Process-global handle to the buffer where the precompile pushes fills.
///
/// Same lifecycle rules as \`CLOB_STATE\`: installed by \`LiveRethEvmBridge::new\`,
/// none until set. When set, \`place_order\` extends this buffer with any fills
/// produced by the matched order, so production-shape EVM-placed orders flow
/// into the next \`build_payload\`'s drained fills exactly like bridge-side
/// \`submit_order\` does.
static FILL_SINK: RwLock<Option<Arc<Mutex<Vec<Fill>>>>> = RwLock::new(None);

/// Install the \`pending_fills\` buffer the precompile should write to.
/// Companion to \`install_clob\`. Calling this replaces any previously-installed
/// sink.
pub fn install_fill_sink(sink: Arc<Mutex<Vec<Fill>>>) {
    *FILL_SINK.write().expect("FILL_SINK rwlock poisoned") = Some(sink);
}

/// Clear the installed fill sink. Test-only typical use; idempotent.
pub fn uninstall_fill_sink() {
    *FILL_SINK.write().expect("FILL_SINK rwlock poisoned") = None;
}
\`\`\`

The static is an exact structural parallel to \`CLOB_STATE\`:
- \`CLOB_STATE: RwLock<Option<Arc<Mutex<Book>>>>\` — outer install/uninstall lock, inner Book lock.
- \`FILL_SINK: RwLock<Option<Arc<Mutex<Vec<Fill>>>>>\` — outer install/uninstall lock, inner buffer lock.

Same lifecycle, same lock-layering rationale (from L4 §Design reflection 2): \`RwLock\` for the rare install/uninstall write, \`Mutex\` for the frequent buffer writes.

\`install_fill_sink\` and \`uninstall_fill_sink\` mirror their CLOB counterparts: 1-line bodies, both \`pub fn\`. The doc comments name the lifecycle ("by \`LiveRethEvmBridge::new\`") so readers tracing the code know who's expected to call them.

> 🛑 **Anti-fluency.** "Why not bundle the CLOB and the fill-sink into one global like \`CLOB_STATE: Option<(Arc<Mutex<Book>>, Arc<Mutex<Vec<Fill>>>)>\`?" **Because they have different installation timing requirements.** A test that exercises only \`read_best_bid\` doesn't need a fill sink installed. Bundling forces every test to provide both. **Keeping the globals orthogonal means each test installs only what it touches.** The cost of two statics is symbolic (and they're zero-runtime-cost when uninstalled). The benefit is per-test composability.

### Step 3: Extend \`place_order\` to push fills

L8's body had:

\`\`\`rust
    let mut book = clob.lock().expect("clob mutex poisoned");
    let _result = book.submit(Order {
        id: OrderId(order_id_val),
        account: AccountId(account_id),
        side,
        qty: Qty(qty_value),
        order_type: OrderType::Limit {
            price: Price(price_value),
        },
    });
    drop(book);

    out[24..32].copy_from_slice(&order_id_val.to_be_bytes());
\`\`\`

Change to:

\`\`\`rust
    let mut book = clob.lock().expect("clob mutex poisoned");
    let submit_result = book.submit(Order {
        id: OrderId(order_id_val),
        account: AccountId(account_id),
        side,
        qty: Qty(qty_value),
        order_type: OrderType::Limit {
            price: Price(price_value),
        },
    });
    drop(book);

    // Stage 9c+: route any fills produced by this order through the bridge's
    // pending_fills buffer so they reach the next \`build_payload\`. Drops
    // silently if no sink is installed (consistent with no-CLOB → return 0).
    if !submit_result.fills.is_empty() {
        let sink_state = FILL_SINK.read().expect("FILL_SINK rwlock poisoned");
        if let Some(sink) = sink_state.as_ref() {
            sink.lock()
                .expect("fill_sink mutex poisoned")
                .extend(submit_result.fills.iter().copied());
        }
    }

    out[24..32].copy_from_slice(&order_id_val.to_be_bytes());
\`\`\`

Three changes:

1. **\`_result\` → \`submit_result\`.** Per L8's design reflection ("\`_result\` is a future-intent marker"), this is now its future. The underscore goes away; the binding is used.
2. **The \`if !submit_result.fills.is_empty()\` early-out.** When the order rested without crossing (no fills produced), we skip the lock acquisition entirely. Common case for resting limits → no fill-sink traffic.
3. **\`sink_state.as_ref().map(|sink| sink.lock()...extend(...))\` pattern.** Same shape as \`current_best_bid\`'s read pattern (Step 4 of L4): hold the outer read lock briefly to access the inner Arc, then acquire the inner Mutex.

**\`submit_result.fills.iter().copied()\`** — \`Fill\` is \`Copy\`, so \`.iter().copied()\` produces an owned-fill iterator. Cheaper than \`.into_iter()\` because \`submit_result\` may have other fields we don't want to consume. **Iterating-by-copy keeps the source intact.**

> 🛑 **Predict.** Look at the \`if !submit_result.fills.is_empty()\` guard. If we removed it (and unconditionally acquired the FILL_SINK read lock + checked \`as_ref()\`), would behavior change?

(Answer: **Behavior would be identical, but performance would suffer in the no-fill case.** Every \`place_order\` call that rests without crossing — the common case for limit orders — would acquire a \`FILL_SINK\` read lock just to find out there's nothing to push. The guard short-circuits that. **Early-out on the common case is a free win.** This is a hot path; the cost of the unnecessary lock acquisition would compound.)

### Step 4: Update the \`place_order\` doc comment

L8's bottom paragraph said:

\`\`\`rust
/// Side note: the fills returned by \`Book::submit\` are discarded here.
/// Production-shape integration would route them through the bridge's
/// \`pending_fills\` so they reach the next \`build_payload\`. At v0 the
/// precompile and the bridge are write-side independent.
\`\`\`

Replace with:

\`\`\`rust
/// Stage 9c+ (this commit): any fills produced by the submit are pushed into
/// the \`FILL_SINK\` global if installed. This is what makes EVM-placed orders
/// flow into the bridge's \`pending_fills\` and out via \`build_payload\`,
/// matching the bridge-side \`submit_order\` semantics. If no sink is
/// installed the fills are still produced (visible via subsequent
/// \`read_best_bid\`) but won't reach a payload.
\`\`\`

Two things named:

1. **The "what changed" line** — "Stage 9c+ (this commit)". When a reader skims this doc 6 months later they'll know exactly what version of the code is doing this.
2. **The fallback semantic** — "if no sink is installed the fills are still produced." Crucial for test isolation: the round-trip test from L8 doesn't install a sink, but \`place_order_then_read_best_bid_round_trips\` still works because fills land in the Book regardless. **Naming the fallback in the doc comment means tests that don't care about fills don't have to install a sink just to keep \`place_order\` happy.**

### Step 5: Add the unit test

After \`place_order_then_read_best_bid_round_trips\`, in the \`#[cfg(test)] mod tests\` block:

\`\`\`rust
    /// **Stage 9c+**: when a \`FILL_SINK\` is installed alongside the CLOB,
    /// fills produced by a \`place_order\` call flow into the sink. This is the
    /// hook the bridge relies on to surface EVM-placed fills in the next
    /// \`build_payload\`. With no sink installed, fills are still produced but
    /// silently dropped — verified by the round-trip test above (which never
    /// installs a sink yet still observes book state changes).
    #[test]
    fn place_order_routes_fills_to_installed_sink() {
        let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        let book = Arc::new(Mutex::new(Book::new()));
        let sink: Arc<Mutex<Vec<Fill>>> = Arc::new(Mutex::new(Vec::new()));
        install_clob(book);
        install_fill_sink(Arc::clone(&sink));

        // Maker: Buy @ 100, qty 10. Rests, no fill.
        let maker = place_order_calldata(1, 0, 100, 10);
        let r = place_order(&maker, 100_000, 0).unwrap();
        assert!(U256::from_be_slice(&r.bytes[0..32]) > U256::ZERO);
        assert!(sink.lock().unwrap().is_empty(), "no fills after resting maker");

        // Taker: Sell @ 100, qty 10. Crosses the maker → exactly one fill.
        let taker = place_order_calldata(2, 1, 100, 10);
        let r = place_order(&taker, 100_000, 0).unwrap();
        assert!(U256::from_be_slice(&r.bytes[0..32]) > U256::ZERO);

        let fills = sink.lock().unwrap().clone();
        assert_eq!(fills.len(), 1, "exactly one fill from the crossing taker");
        assert_eq!(fills[0].price, Price(100));
        assert_eq!(fills[0].qty, Qty(10));

        uninstall_fill_sink();
        uninstall_clob();
    }
\`\`\`

The test's shape:

1. **Setup** — \`TEST_SERIALIZER\` + install both CLOB and sink. Hold \`sink\` (an Arc clone) for inspection.
2. **Resting maker** — a Buy @ 100 that doesn't cross anything (book is empty). Should produce **zero fills**. Sink remains empty.
3. **Crossing taker** — a Sell @ 100 that crosses the resting Buy. The maker exits the book, the taker is fully matched → **exactly one Fill**.
4. **Inspect the sink** — \`clone()\` the Vec out so the assertion happens without holding the Mutex. Verify length, price, qty.
5. **Cleanup** — both uninstall calls in reverse install order.

**Why a maker + taker pair, not just a single submit?** Because \`Book::submit\` only produces fills when the new order *crosses* existing orders. A solo submit on an empty book produces zero fills. To test the routing logic, we **need at least one fill to actually route**. The maker rests; the taker crosses → 1 fill — minimum test data.

> 🛑 **Anti-fluency.** "Couldn't we test by submitting just a marketable Buy when the book has a resting Sell?" **Yes, equivalent. We pick maker-Buy/taker-Sell because that's the canonical order-book example.** Either direction works as long as the second order is marketable against the first. The pedagogical point is "two orders that cross produce one fill"; the price direction is incidental.

> 🛑 **Predict.** What happens if we install the CLOB but **not** the sink, then place crossing orders? Hint: look at L8's existing \`place_order_then_read_best_bid_round_trips\` test.

(Answer: **The fill is produced inside the Book but not pushed anywhere — the precompile's \`if !submit_result.fills.is_empty()\` guard hits, but \`FILL_SINK.read()\` returns \`None\`, so the inner block doesn't execute.** The order is still on/off the book correctly; only the *flow to the bridge* is missing. This is the "still works for solo tests" property called out in the doc comment. L8's round-trip test relies on this — it never installs a sink and still observes correct best-bid behavior.)

### Step 6: \`live_node.rs\` — pending_fills as Arc

Open \`crates/evm/src/live_node.rs\`. The current struct (from L4):

\`\`\`rust
pub struct LiveRethEvmBridge<P> {
    provider: P,
    chain_spec: Arc<ChainSpec>,
    validator: EthBeaconConsensus<ChainSpec>,
    clob: Arc<Mutex<Book>>,
    pending_fills: Mutex<Vec<Fill>>,
    state: Mutex<State>,
}
\`\`\`

Change \`pending_fills\`:

\`\`\`rust
pub struct LiveRethEvmBridge<P> {
    provider: P,
    chain_spec: Arc<ChainSpec>,
    validator: EthBeaconConsensus<ChainSpec>,
    clob: Arc<Mutex<Book>>,
    /// Same shared-Arc pattern as \`clob\`: the precompile module's \`FILL_SINK\`
    /// global points at this buffer too, so fills produced by EVM-placed
    /// orders (via \`clob_place_order\`) flow into the same queue the bridge's
    /// own \`submit_order\` writes to (Stage 9c+).
    pending_fills: Arc<Mutex<Vec<Fill>>>,
    state: Mutex<State>,
}
\`\`\`

Doc comment explains the architectural symmetry — \`pending_fills\` and \`clob\` are now both shared-Arc pattern. Anyone tracing the type and seeing the \`Arc\` will know there's a global pointing at it too.

### Step 7: Update \`LiveRethEvmBridge::new\`

Current \`new\` (after L4):

\`\`\`rust
    pub fn new(provider: P, chain_spec: Arc<ChainSpec>) -> Self {
        let validator = EthBeaconConsensus::new(Arc::clone(&chain_spec));
        let clob = Arc::new(Mutex::new(Book::new()));

        // Make our CLOB visible to the \`clob_read_best_bid\` precompile so
        // smart contracts can query live orderbook state. The bridge writes
        // (submit_order), the EVM reads (precompile); they share the same Arc.
        crate::precompiles::install_clob(Arc::clone(&clob));

        Self {
            provider,
            chain_spec,
            validator,
            clob,
            pending_fills: Mutex::new(Vec::new()),
            state: Mutex::new(State::default()),
        }
    }
\`\`\`

Change to:

\`\`\`rust
    pub fn new(provider: P, chain_spec: Arc<ChainSpec>) -> Self {
        let validator = EthBeaconConsensus::new(Arc::clone(&chain_spec));
        let clob = Arc::new(Mutex::new(Book::new()));
        let pending_fills = Arc::new(Mutex::new(Vec::new()));

        // Make our CLOB visible to the \`clob_read_best_bid\` precompile so
        // smart contracts can query live orderbook state. The bridge writes
        // (submit_order), the EVM reads (precompile); they share the same Arc.
        crate::precompiles::install_clob(Arc::clone(&clob));

        // Route fills produced by the \`clob_place_order\` precompile into the
        // same queue \`submit_order\` writes to. Without this, EVM-placed orders
        // would match but their fills would be silently dropped (Stage 9c+).
        crate::precompiles::install_fill_sink(Arc::clone(&pending_fills));

        Self {
            provider,
            chain_spec,
            validator,
            clob,
            pending_fills,
            state: Mutex::new(State::default()),
        }
    }
\`\`\`

Three changes:

1. **\`let pending_fills = Arc::new(Mutex::new(Vec::new()));\`** — bind the Arc to a local, same shape as \`let clob = ...\` above.
2. **\`crate::precompiles::install_fill_sink(Arc::clone(&pending_fills));\`** — share the Arc with the precompile module. Mirrors \`install_clob\`.
3. **Struct literal \`pending_fills,\`** (no \`Mutex::new(Vec::new())\` inline) — just use the local.

Other call sites that use \`self.pending_fills\` (e.g., \`pending_fill_count()\`, the drain in \`build_payload\`) keep working — \`Arc<Mutex<T>>\` derefs to \`&Mutex<T>\`, so \`self.pending_fills.lock()\` is unchanged. Same coercion that kept \`submit_order\` working when we Arc-wrapped \`clob\` in L4.

## Test

\`\`\`bash
cargo test -p openhl-evm --release
\`\`\`

After ~30 seconds:

\`\`\`
running 47 tests
... 47 tests pass ...

test result: ok. 47 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

One more than L8 (46 → 47). The new one is \`place_order_routes_fills_to_installed_sink\`. To see only it:

\`\`\`bash
cargo test -p openhl-evm --release routes_fills
\`\`\`

Output:

\`\`\`
running 1 test
test precompiles::tests::place_order_routes_fills_to_installed_sink ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 46 filtered out
\`\`\`

Common errors and fixes:

- **\`error[E0277]: 'Vec<Fill>' is not 'Arc<Mutex<Vec<Fill>>>'\`** in \`live_node.rs\` — you forgot to wrap \`pending_fills\` in Arc::new + Mutex::new. The new() must construct \`let pending_fills = Arc::new(Mutex::new(Vec::new()));\`.
- **\`error[E0277]: 'Mutex<Vec<Fill>>' is not 'Arc<Mutex<Vec<Fill>>>'\`** when struct-literal uses \`Mutex::new(...)\` directly — leftover from L4 shape. Replace with the local \`pending_fills,\` binding.
- **\`unused import: Fill\`** in \`precompiles/mod.rs\` — you added Fill to the import but didn't use it. The \`Vec<Fill>\` and \`FILL_SINK: ...Fill...\` references should use it. If you see this, check that the static is in place.
- **\`assertion failed: fills.len() == 1\`** in the new test — \`book.submit\` produced 0 fills instead of 1. Likely cause: the second order didn't cross the first. Verify maker is Buy @ 100 and taker is Sell @ 100 (same price = crosses).
- **Hangs forever** — \`place_order\` is holding the Book lock when it tries to acquire the FILL_SINK. Verify the \`drop(book)\` line is *before* the \`if !submit_result.fills.is_empty()\` block.

## Design reflection

Four points:

1. **The shared-buffer pattern generalizes.** L4 introduced the \`Arc<Mutex<T>>\` + process-global pattern for the CLOB. L9 reuses it for fills. **Once the architectural primitive is in place, additional "shared between bridge and precompile" state costs ~20 lines of code per new buffer.** The investment in L4's abstraction pays compound interest.

2. **Different states have different installation lifetimes — keep them separate.** Bundling CLOB and FILL_SINK into one global would force every test to install both. Orthogonal globals = orthogonal test setup. **Cohesion of related state matters less than orthogonal lifecycle composability when tests are the primary consumer.**

3. **Early-out on the common case is free.** \`if !submit_result.fills.is_empty()\` skips lock acquisition when the order rests without crossing — the most common case. The guard adds one branch in the hot path and saves an RwLock acquisition when fills are empty. **The cheapest optimization in a hot path is often an early-out on the dominant case.**

4. **The flag is in the doc comment.** "Side note: fills are discarded" in L8's doc was load-bearing — it told future readers "this is a deliberate gap, not an oversight." L9 closes the gap and updates the doc accordingly. **A gap that's documented is half-fixed; an undocumented gap is invisible technical debt.**

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout d19ba1b
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
\`\`\`

After L9, the \`precompiles/mod.rs\` diff should be empty, and the \`live_node.rs\` diff should also be empty *for the changes covered in L9*. The Stage 9c+ commit also extends the bridge integration test (which doesn't exist yet — L10 adds it). So a non-empty diff in \`live_node.rs\` is expected at the test region — that's L10's territory.

Return:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: What if two threads call \`place_order\` at the same time and both produce fills?**
Both threads will acquire the FILL_SINK read lock (non-exclusive, fine). Both will get a reference to the same Arc-wrapped buffer. Each will \`.lock()\` the inner Mutex — that acquisition serializes them. **One thread's fills land first, then the other's. Order matches the order of \`submit\` calls; nothing is lost.** Standard Mutex semantics.

**Q: Why does \`place_order_routes_fills_to_installed_sink\` test the maker-taker cross instead of a simpler scenario?**
Because we need a fill to test routing. \`Book::submit\` returns 0 fills when the order doesn't cross anything; we'd never exercise the routing block. **The maker-taker pair is the minimum test data that produces a fill.** Simpler scenarios miss the routing logic entirely.

**Q: What's \`submit_result\` exactly? Is it just \`Vec<Fill>\`?**
It's the struct returned by \`Book::submit\` (defined in course 7's CLOB crate). It typically has at least a \`.fills: Vec<Fill>\` field, possibly more (\`order_id_assigned\`, \`resting_qty\`, etc.). We only need \`.fills\` for L9; the rest is unused at v0.

**Q: When the bridge \`build_payload\` drains \`pending_fills\`, does it drain fills from both sources atomically?**
Yes. \`pending_fills\` is one buffer (one Mutex), regardless of whether fills came from \`bridge.submit_order\` (calls inside the bridge) or \`place_order\` (via the FILL_SINK). When \`build_payload\` calls \`self.pending_fills.lock().unwrap().drain(..)\`, it gets every fill that's been pushed since the last drain — both EVM-placed and bridge-placed, interleaved by chronological order. **A unified queue means a unified drain.**

## Next lesson (L10)

L10 is the **course-level milestone**: the Stage 9d integration test \`bridge_against_custom_evm_node_shares_clob_with_precompile\`. We bootstrap a Reth node with \`OpenHlExecutorBuilder\`, construct a \`LiveRethEvmBridge\` against that node's provider, submit an order via \`bridge.submit_order\`, observe it through \`current_best_bid\`, then **call \`place_order\` via the precompile** and verify \`bridge.pending_fill_count()\` increments. This is the proof that **everything** — Module 1 EVM bootstrap, Module 2 read precompile, Module 3 write precompile, Module 4 FILL_SINK — fits together inside a real Reth process. After L10, the openhl reference implementation closes Stage 9d.`,
                },
                {
                  title: "Lesson 10 — Course milestone — the full stack in a real Reth node",
                  slug: "openhl-precompiles-bridge-integration-en",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 45,
                  xpReward: 90,
                  content: `# Lesson 10 — Course milestone — the full stack in a real Reth node

## Goal

Concepts you'll grasp in this lesson:

- **Integration tests catch wiring bugs unit tests can't** — unit tests build each piece in isolation, so a typo in \`with_components(...executor(OpenHlExecutorBuilder))\` or a regression in \`EthereumAddOns\` application would leave unit tests green while breaking production. One integration test = wiring assertion.
- **\`pub(crate)\` is the right visibility for cross-module tests** — widening \`place_order\` to \`pub\` leaks the API; \`#[cfg(test) pub(crate)]\` adds ceremony for no benefit. \`pub(crate)\` says "inside this crate, anyone; outside, no one."
- **Inlined test calldata > DRY helper** — hand-built \`[u8; 128]\` with byte-position comments makes the ABI layout visible at the call site. For tests proving system-level correctness, every byte position should be a learnable artifact; helpers hide.
- **Canonical mix: one integration test + many unit tests** — pieces have their own narrow tests; composition has one wide test. Failure localization comes from unit tests; wiring guarantees come from the integration test.
- **The honest deferred: RPC roundtrip is Reth's responsibility, not openhl's** — testing JSON-RPC → eth_call → revm dispatch would validate Reth, not openhl. The scope of "openhl plugs into Reth correctly" doesn't include "Reth's RPC server works."

Verification:

\`\`\`bash
cargo test -p openhl-evm --release bridge_against_custom_evm
\`\`\`

…passes a single new integration test, \`bridge_against_custom_evm_node_shares_clob_with_precompile\`.

Specific changes:

The test does everything Stages 9a-9c+ touched, all in one place:

1. **Bootstrap Reth** with \`OpenHlExecutorBuilder\` — the custom EVM with both CLOB precompiles registered.
2. **Construct \`LiveRethEvmBridge\`** against that node's provider — the bridge's \`new()\` calls \`install_clob\` and \`install_fill_sink\`.
3. **Bridge writes to book** — \`bridge.submit_order(Buy @ 200 qty 33)\`.
4. **Precompile sees it** — \`current_best_bid()\` returns \`Some((Price(200), Qty(33)))\`.
5. **Precompile writes to book** — \`place_order(Sell @ 200 qty 33)\` via direct call (simulating EVM dispatch).
6. **Bridge sees the fill** — \`bridge.pending_fill_count() == 1\`.

This is **the course milestone**. After L10, the architecture proven by 47 unit tests is also proven by 1 integration test that exercises a real Reth node + a real bridge + both precompiles + both globals + the matching engine — end-to-end, in-process.

To make this work, **one production-code change is needed**: \`place_order\` must become \`pub(crate)\` so the integration test (which lives in \`live_node.rs\`, a sibling module) can call it directly.

## Recap

After L9:
- The precompile module has \`CLOB_STATE\` + \`FILL_SINK\`, both \`Option<Arc<Mutex<T>>>\` globals.
- The bridge installs into both globals during \`new()\`.
- Unit tests prove: read works (L6), write works (L8), fills route (L9).
- **What hasn't been tested**: the *combination* in a real Reth node. Unit tests bypass Reth's \`NodeBuilder\`, \`EvmFactory\` dispatch, \`EthereumNode::components()\` plumbing.

L10 closes that gap with a single integration test.

## Plan

Two edits across two files:

1. **\`crates/evm/src/precompiles/mod.rs\`** — change \`fn place_order\` to \`pub(crate) fn place_order\`. The integration test will call it directly. One word added.
2. **\`crates/evm/src/live_node.rs\`** — add the \`bridge_against_custom_evm_node_shares_clob_with_precompile\` test inside the existing \`#[cfg(test)] mod tests\` block. ~70 lines, mostly setup + 7 assertions.

No new production code beyond the visibility change. **L10's value is in the proof, not in the new behavior.**

> 🛑 **Predict.** Before scrolling: we already have unit tests (L3, L6, L9) that prove pieces work. **Why bother with an integration test that just exercises the same code paths through Reth's \`NodeBuilder\`?** Hint: think about what unit tests can't observe.

(Answer: **Unit tests can't observe wiring mistakes between the bridge and Reth's executor.** Each unit test builds the precompile in isolation, or builds the bridge in isolation; none of them exercise the path where a \`NodeBuilder::launch()\` flow constructs an \`OpenHlEvmFactory\` instance and the bridge sees the *same* CLOB through the precompile registered in *that* EVM. A typo in the \`with_components(...executor(OpenHlExecutorBuilder))\` chain — or a regression where \`EthereumAddOns\` stops being applied — would leave unit tests green but break the actual production path. **Integration test = wiring assertion.**)

## Walk-through

### Step 1: Make \`place_order\` \`pub(crate)\`

In \`crates/evm/src/precompiles/mod.rs\`, find the \`fn place_order\` line:

\`\`\`rust
#[allow(clippy::unnecessary_wraps)]
fn place_order(input: &[u8], _gas_limit: u64, _reservoir: u64) -> PrecompileResult {
\`\`\`

Change to:

\`\`\`rust
#[allow(clippy::unnecessary_wraps)]
pub(crate) fn place_order(input: &[u8], _gas_limit: u64, _reservoir: u64) -> PrecompileResult {
\`\`\`

That's the change. \`pub(crate)\` = visible to the rest of the \`openhl-evm\` crate, but not to the world. Three reasons not to make it fully \`pub\`:

1. **The precompile is registered into the registry** by \`openhl_precompiles\`. Outside callers should invoke it via \`Precompile::execute(...)\` through the registry, not by name. Keeping it \`pub(crate)\` discourages bypass.
2. **The function signature is REVM-specific** (\`PrecompileFn = fn(&[u8], u64, u64) -> PrecompileResult\`). Exposing it widely would couple downstream callers to REVM's calling convention.
3. **The integration test lives in this crate**, so \`pub(crate)\` is exactly the visibility that test needs — no more.

**\`read_best_bid\` stays private.** No test outside the precompiles module calls it directly. Keep visibility minimal.

> 🛑 **Anti-fluency.** "Why not just add \`#[cfg(test)] pub(crate)\` so it's only visible in test builds?" **\`pub(crate)\` doesn't widen the production binary's surface.** Visibility annotations are compile-time only; the generated code is identical whether \`place_order\` is \`fn\` or \`pub(crate) fn\`. **\`#[cfg(test)]\` here is extra ceremony for zero benefit.**

### Step 2: Add the integration test

Open \`crates/evm/src/live_node.rs\`. Find the \`#[cfg(test)] mod tests\` block at the bottom of the file. Add this test at the end:

\`\`\`rust
    /// **Stage 9d**: bootstrap a Reth node WITH \`OpenHlExecutorBuilder\` (so its
    /// EVM has our CLOB precompiles registered), construct a \`LiveRethEvmBridge\`
    /// against that node's provider, submit an order via the bridge — verify
    /// that the precompile module's process-global \`CLOB_STATE\` now reflects
    /// the order. This proves the full bridge ↔ custom-EVM-node integration:
    /// the same \`Arc<Mutex<Book>>\` that the bridge's \`submit_order\` writes to
    /// is the one any smart contract calling \`clob_read_best_bid\` through this
    /// node's EVM would see.
    ///
    /// Doesn't yet invoke the precompile via RPC \`eth_call\` — that's deferred
    /// indefinitely (validates Reth's plumbing rather than openhl behavior).
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn bridge_against_custom_evm_node_shares_clob_with_precompile() {
        use crate::OpenHlExecutorBuilder;
        use crate::precompiles::{
            CLOB_PLACE_ORDER, current_best_bid, uninstall_clob, uninstall_fill_sink,
        };
        use openhl_clob::{AccountId, OrderId, OrderType, Price, Qty, Side};
        use reth_node_ethereum::node::EthereumAddOns;

        // Start from a clean global state — other tests may have left a CLOB
        // or fill sink installed; that's fine for those tests but would mask
        // bugs here (especially the "sink was wired by bridge::new" assertion).
        uninstall_clob();
        uninstall_fill_sink();

        let runtime = Runtime::test();
        let chain_spec = dev_chain_spec();
        let node_config = NodeConfig::test().dev().with_chain(chain_spec.clone());

        let handle = NodeBuilder::new(node_config)
            .testing_node(runtime)
            .with_types::<EthereumNode>()
            .with_components(EthereumNode::components().executor(OpenHlExecutorBuilder))
            .with_add_ons(EthereumAddOns::default())
            .launch()
            .await
            .expect("launch of custom-EVM node failed");

        // Build the bridge against the live custom-EVM node's provider.
        // The bridge installs its CLOB as the precompile's global state
        // (per the install_clob call inside LiveRethEvmBridge::new).
        let bridge = LiveRethEvmBridge::new(handle.node.provider.clone(), chain_spec);

        // Pre-condition: precompile sees an empty book.
        assert_eq!(current_best_bid(), None);

        // Submit a resting bid via the bridge. This goes through Book::submit
        // under the same Arc<Mutex<Book>> the precompile reads from.
        bridge.submit_order(Order {
            id: OrderId(1),
            account: AccountId(42),
            side: Side::Buy,
            qty: Qty(33),
            order_type: OrderType::Limit { price: Price(200) },
        });

        // Post-condition: the precompile's view (which is what a smart
        // contract calling \`clob_read_best_bid\` through this node would see)
        // now reflects the order.
        let best = current_best_bid().expect("CLOB has bids after submit_order");
        assert_eq!(best.0, Price(200));
        assert_eq!(best.1, Qty(33));

        // === Stage 9c+ ===
        // Now hit the WRITE precompile: place a crossing Sell @ 200 qty 33
        // via \`place_order\`. The bridge's pending_fills should see the fill
        // even though we never went through bridge.submit_order. This proves
        // the FILL_SINK that LiveRethEvmBridge::new installed is the same
        // Arc<Mutex<Vec<Fill>>> the bridge later drains in build_payload.
        assert_eq!(
            bridge.pending_fill_count(),
            0,
            "fills empty before crossing taker via precompile"
        );

        let mut calldata = [0u8; 128];
        // account_id = 7 (last 8 bytes of slot 0)
        calldata[24..32].copy_from_slice(&7u64.to_be_bytes());
        // side = Sell (1) at byte 63
        calldata[63] = 1;
        // price = 200 (last 8 bytes of slot 2)
        calldata[88..96].copy_from_slice(&200u64.to_be_bytes());
        // qty = 33 (last 8 bytes of slot 3)
        calldata[120..128].copy_from_slice(&33u64.to_be_bytes());

        let r = crate::precompiles::place_order(&calldata, 100_000, 0)
            .expect("place_order must not error");
        let order_id_bytes = &r.bytes[24..32];
        let order_id = u64::from_be_bytes(order_id_bytes.try_into().unwrap());
        assert!(order_id > 0, "successful place_order returns nonzero id");

        // The fill from the cross should have landed in bridge's pending_fills
        // via the FILL_SINK install_fill_sink path inside LiveRethEvmBridge::new.
        assert_eq!(
            bridge.pending_fill_count(),
            1,
            "precompile-placed cross must populate bridge.pending_fills (Stage 9c+)"
        );

        // CLOB_PLACE_ORDER's address constant is part of the public surface
        // (and registered into the precompiles set by \`openhl_precompiles\`);
        // touch it here so the import resolves and the constant stays load-bearing.
        let _ = CLOB_PLACE_ORDER;

        // Clean up the globals so other tests can start clean.
        uninstall_fill_sink();
        uninstall_clob();

        // Drop the node handle explicitly to make the lifecycle visible
        // in the trace.
        drop(handle);
    }
\`\`\`

The test is long but every section has a job. Let me walk through the four phases.

### Phase A — Setup (\`uninstall\` + \`NodeBuilder\`)

\`\`\`rust
        uninstall_clob();
        uninstall_fill_sink();

        let runtime = Runtime::test();
        let chain_spec = dev_chain_spec();
        let node_config = NodeConfig::test().dev().with_chain(chain_spec.clone());

        let handle = NodeBuilder::new(node_config)
            .testing_node(runtime)
            .with_types::<EthereumNode>()
            .with_components(EthereumNode::components().executor(OpenHlExecutorBuilder))
            .with_add_ons(EthereumAddOns::default())
            .launch()
            .await
            .expect("launch of custom-EVM node failed");
\`\`\`

**Why both \`uninstall_clob\` AND \`uninstall_fill_sink\` at the start?** Other tests may have left either or both installed. If we ran in the same \`cargo test\` invocation after, say, L9's \`place_order_routes_fills_to_installed_sink\`, the sink would still be set to some stray Arc. We can't trust prior state.

**Why is this a \`tokio::test(flavor = "multi_thread", worker_threads = 4)\`?** Reth's \`NodeBuilder.launch()\` is async; it spawns background tasks (executor, RPC, mining, etc.). Single-threaded tokio would block on these. **Multi-thread + 4 workers is the canonical Reth integration-test setup.** Less = test stalls; more = wasteful in CI.

**The \`NodeBuilder\` chain is identical to L3's \`reth_dev_node_with_openhl_executor\` test.** Same builder methods, same order, same \`OpenHlExecutorBuilder\` plug-in. Reusing the proven sequence keeps the new test's failure surface focused on what *L10* introduces: the bridge + precompile composition, not the Node bootstrap itself.

> 🛑 **Anti-fluency.** "Should we extract a \`spawn_custom_evm_test_node()\` helper since this is the second time we've done this chain?" **No, deliberately not.** Reth's \`NodeAdapter\` (the type returned by \`launch().await\`) is generic over ~5 phantom parameters. Naming it in a helper's return type tangles every caller in those generics. **Inline composition is uglier to write once but cleaner to read at every call site.** Helpers can be added later if a third call site emerges and the type complexity has stabilized.

### Phase B — Bridge construction + bridge → precompile read

\`\`\`rust
        let bridge = LiveRethEvmBridge::new(handle.node.provider.clone(), chain_spec);

        assert_eq!(current_best_bid(), None);

        bridge.submit_order(Order {
            id: OrderId(1),
            account: AccountId(42),
            side: Side::Buy,
            qty: Qty(33),
            order_type: OrderType::Limit { price: Price(200) },
        });

        let best = current_best_bid().expect("CLOB has bids after submit_order");
        assert_eq!(best.0, Price(200));
        assert_eq!(best.1, Qty(33));
\`\`\`

\`LiveRethEvmBridge::new(...)\` does five things internally:
1. Creates \`Arc<Mutex<Book>>\` (the CLOB).
2. Creates \`Arc<Mutex<Vec<Fill>>>\` (the fills buffer).
3. **Calls \`install_clob\`** — the precompile module's \`CLOB_STATE\` global now points to the bridge's Book.
4. **Calls \`install_fill_sink\`** — the \`FILL_SINK\` global now points to the bridge's fills buffer.
5. Returns \`Self { clob, pending_fills, ... }\`.

After this single call, the bridge and the precompile module are wired together via two globals.

The pre-condition \`current_best_bid() == None\` proves we started from a clean state (Phase A's uninstalls worked). The submit_order produces a resting bid in the bridge's Book. The post-condition \`current_best_bid() == Some(...)\` proves the precompile sees the bridge's write — they share the same Arc.

**This is the Stage 9d proof.** A smart contract calling \`STATICCALL(0x...0c1b)\` through this exact node would route via the registered precompile → through \`current_best_bid()\` → through \`CLOB_STATE\` → into the bridge's Book → see this bid.

### Phase C — Stage 9c+ extension: precompile → bridge fills

\`\`\`rust
        assert_eq!(
            bridge.pending_fill_count(),
            0,
            "fills empty before crossing taker via precompile"
        );

        let mut calldata = [0u8; 128];
        calldata[24..32].copy_from_slice(&7u64.to_be_bytes());
        calldata[63] = 1;
        calldata[88..96].copy_from_slice(&200u64.to_be_bytes());
        calldata[120..128].copy_from_slice(&33u64.to_be_bytes());

        let r = crate::precompiles::place_order(&calldata, 100_000, 0)
            .expect("place_order must not error");
        let order_id_bytes = &r.bytes[24..32];
        let order_id = u64::from_be_bytes(order_id_bytes.try_into().unwrap());
        assert!(order_id > 0, "successful place_order returns nonzero id");

        assert_eq!(
            bridge.pending_fill_count(),
            1,
            "precompile-placed cross must populate bridge.pending_fills (Stage 9c+)"
        );
\`\`\`

This phase is what Stage 9c+ added (commit \`d19ba1b\`). The first call to \`place_order\` simulates a smart contract calling the write precompile. The crossing Sell @ 200 qty 33 hits the resting Buy @ 200 qty 33 — exactly one Fill produced.

**The hand-built calldata is identical to what \`place_order_calldata\` produces.** We inline it here for explicitness — every byte position is annotated, so a reader can trace the ABI layout without jumping to a helper. **For integration tests proving end-to-end correctness, calldata explicitness matters more than DRY.**

\`pending_fill_count()\` jumped from 0 to 1. **The Fill flowed through 5 indirections to get there:**

\`\`\`
place_order
  → submit_result.fills (Vec<Fill>)
  → FILL_SINK.read() → Some(sink: Arc<Mutex<Vec<Fill>>>)
  → sink.lock().extend(...)
  → same Arc as bridge.pending_fills
  → bridge.pending_fill_count() sees the increment
\`\`\`

That's the Stage 9c+ thesis, end-to-end.

> 🛑 **Predict.** Look at the \`crate::precompiles::place_order(&calldata, ...)\` call. **Why call the function directly instead of going through \`Precompiles::get(...).execute(...)\`?** Hint: we did both in L3's unit tests.

(Answer: **Two reasons.** (1) The Stage 9c+ commit's design is to call \`place_order\` directly — it's \`pub(crate)\` for exactly this. Going through the registry would require constructing a \`Precompiles\` set, knowing which hardfork we're at, etc. — extra plumbing for no additional proof. (2) L3 already proved the registry path works. **L10's job is to prove the bridge ↔ precompile module wiring, not the registry path.** Direct call narrows the test's scope.)

### Phase D — Cleanup

\`\`\`rust
        let _ = CLOB_PLACE_ORDER;

        uninstall_fill_sink();
        uninstall_clob();

        drop(handle);
\`\`\`

Three small things:

1. **\`let _ = CLOB_PLACE_ORDER;\`** — touches the address constant to prove it's load-bearing. **Why?** Because the test imports \`CLOB_PLACE_ORDER\` but doesn't otherwise use it (the calldata is hand-built without going through the precompile address). Without this line, clippy would warn \`unused_imports\`. The \`let _ = ...\` is a documented usage that satisfies the linter and signals "this constant exists; don't delete it."
2. **Reverse-order uninstall.** Install order was clob → fill_sink. Uninstall is fill_sink → clob. **Reverse-order cleanup is the canonical Rust pattern** (mirrors RAII drop order). Idiomatic, low-cost.
3. **\`drop(handle)\` explicit.** Rust would drop the handle at end-of-scope anyway. But naming it makes the node-lifecycle visible in the test's trace — readers see "node ends here." For an integration test that bootstraps Reth, the lifecycle moments are worth flagging.

## Test

\`\`\`bash
cargo test -p openhl-evm --release bridge_against_custom_evm
\`\`\`

Output (after ~5 seconds of Reth bootstrap + test execution):

\`\`\`
running 1 test
test live_node::tests::bridge_against_custom_evm_node_shares_clob_with_precompile ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 47 filtered out
\`\`\`

To run the full crate's tests:

\`\`\`bash
cargo test -p openhl-evm --release
\`\`\`

\`\`\`
running 48 tests
... 48 tests pass ...

test result: ok. 48 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

One more than L9 (47 → 48). **Now 47 unit tests + 1 integration test all green.**

Common errors and fixes:

- **\`error[E0603]: function 'place_order' is private\`** — you forgot Step 1. Add \`pub(crate)\` to the \`fn place_order\` signature.
- **\`error[E0277]: 'NodeBuilder<...>' does not satisfy the trait...\`** — typo in the NodeBuilder chain. Compare to L3's \`reth_dev_node_with_openhl_executor\` test — same chain, same method order.
- **Test hangs forever** — \`worker_threads = 1\` or single-threaded tokio. Use \`flavor = "multi_thread", worker_threads = 4\`.
- **\`current_best_bid()\` returns \`None\` after submit_order** — \`install_clob\` wasn't actually called inside \`bridge.new()\`. Re-check L4's bridge changes. Or: another test running in parallel did \`uninstall_clob()\` mid-execution. Verify the TEST_SERIALIZER pattern at all global-touching tests (most should have it from L5).
- **\`pending_fill_count\` returns 0 after place_order** — likely \`install_fill_sink\` wasn't called inside \`bridge.new()\` (L9 Step 7), or \`place_order\`'s fill-routing block has a bug (L9 Step 3 — verify the \`drop(book)\` comes before the sink lock).
- **\`assertion failed: bridge.pending_fill_count() == 1\`** with count = 0 — the place_order's submit returned 0 fills, so nothing was pushed. Verify your hand-built calldata: account=7, side=1 (Sell), price=200, qty=33. Specifically check \`calldata[63] = 1\` for side=Sell; if it's 0 the order is a Buy and won't cross.

## Design reflection

Five points:

1. **Integration tests catch wiring bugs unit tests can't.** All the pieces have unit tests proving they work in isolation. L10 is the first test that proves they work *composed*. The wiring between L3's NodeBuilder, L4's install_clob, L9's install_fill_sink, and the running Reth process — that wiring has no unit test. **One integration test for end-to-end + many unit tests for piece-correctness is the canonical mix.**

2. **\`pub(crate)\` is the right visibility for cross-module tests.** Adding \`pub\` widens API surface. Adding \`#[cfg(test)] pub(crate)\` adds ceremony for no benefit (visibility is compile-time only). **\`pub(crate)\` says "inside this crate, anyone can call it; outside, no."** Exactly what cross-module testing wants.

3. **Test calldata: explicit > DRY.** The hand-built \`[u8; 128]\` calldata in Phase C is what \`place_order_calldata\` would produce — but inlining it with byte-position comments makes the ABI layout visible at the call site. **For tests proving system-level correctness, every byte position should be a learnable artifact.** Helpers hide; integration tests reveal.

4. **No helper for "spawn-bridge-with-custom-EVM-node."** Reth's \`NodeAdapter\` generic complexity makes return-type-naming painful. Inline composition is uglier to write once but easier to read. **The cost of premature abstraction in test code is the same as in production: more code paths to debug.** Wait for the third caller before abstracting.

5. **The honest deferred: RPC \`eth_call\` roundtrip.** This test doesn't go through Reth's RPC server. A real Solidity contract calling \`clob_read_best_bid\` via JSON-RPC would exercise additional plumbing (RPC server, transaction simulation, etc.) that we haven't proven. **We're not proving Reth works; we're proving openhl plugs into Reth correctly.** The RPC layer is Reth's responsibility; testing it again would validate Reth, not openhl.

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout d19ba1b
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
\`\`\`

After L10, both diffs should be **empty**. Your code matches the head of Stage 9c+ (the Stage 9d test extended with the 9c+ extension). **Stage 9 is now closed.** All openhl Stage 9 milestones — 9a (custom EVM bootstraps), 9b (live CLOB read), 9c (write path), 9c+ (fills route to bridge), 9d (bridge integration) — are reproduced in this course.

Return:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: Does this test cover the RPC path? E.g., a Solidity contract using web3.js to call \`clob_read_best_bid\`?**
No. The test calls precompiles directly via Rust — \`crate::precompiles::place_order(...)\` and \`current_best_bid()\`. The RPC path (JSON-RPC server → eth_call → revm dispatch → our precompile) is additional plumbing that's Reth's responsibility. **We trust Reth to handle the RPC layer correctly.** If we tested it, we'd be testing Reth, not openhl. Out of scope.

**Q: What if multiple \`NodeBuilder.launch()\` calls happen in parallel (e.g., parallel tests)?**
Each \`launch()\` produces a separate Reth process state, but they all share the **process-global** \`CLOB_STATE\` and \`FILL_SINK\`. **That's why this test calls \`uninstall_clob\` + \`uninstall_fill_sink\` at start AND end** — parallel tests can race on the globals. The \`TEST_SERIALIZER\` pattern from L5 doesn't reach into this test because it's in \`live_node.rs\`'s test module, not the precompile's. **For full safety we'd need a cross-module serializer, but at v0 the test happens to be the only one in its module that touches both globals.**

**Q: Why is \`chain_spec.clone()\` needed?**
\`NodeConfig::dev().with_chain(chain_spec.clone())\` consumes one clone for the node config. \`LiveRethEvmBridge::new(provider, chain_spec)\` consumes the original (the bridge stores it as an Arc). **Cloning a \`ChainSpec\` is cheap** (it's typically wrapped in Arc internally) — and the alternative would be ownership wrangling that adds cognitive load to the test. Clone is the right tool here.

**Q: Couldn't we just submit a marketable order via the bridge instead of the precompile in Phase C?**
We could — \`bridge.submit_order(Sell @ 200 qty 33)\` would also produce one fill. But that would test the **bridge-side** write path, which is course 7's territory. **L10 specifically wants to test the precompile-side write path** through the FILL_SINK to the bridge's pending_fills. Calling \`place_order\` directly is what proves Stage 9c+'s wiring.

## Course milestone — what's now proven

After L10:

- **Module 1**: \`OpenHlEvmFactory\` + \`OpenHlExecutorBuilder\` plugged into Reth via \`NodeBuilder\`. Custom EVM boots with our precompile registered.
- **Module 2**: \`read_best_bid\` reads live CLOB state via the \`CLOB_STATE\` global. Smart contracts see real orderbook data.
- **Module 3**: \`place_order\` writes to live CLOB state. The EVM↔CLOB surface is bidirectional via \`0x...0c1b\` (read) and \`0x...0c1c\` (write).
- **Module 4**: Fills from precompile-placed orders flow into the bridge's \`pending_fills\` via the \`FILL_SINK\` global. EVM-side trades become payload fills.

47 unit tests prove each piece. **1 integration test proves the composition.** A smart contract calling either precompile through this Reth node sees and writes to the same Book the bridge orchestrates.

## Next lesson (L11)

L11 is the capstone — **no new code**. We reflect on what's been built, name the deferred items (RPC roundtrip, multi-validator OrderId, transaction-scoped state shadowing, staticcall mutation refusal), and list the next-stage extensions (additional read precompiles for best_ask/depth/mid-price, a clob_cancel_order precompile, fills-as-EVM-events). The L11 lesson is for cementing the mental model and seeing the architecture as a whole.`,
                },
              ],
            },
          },
          {
            title: "Capstone",
            sortOrder: 5,
            lessons: {
              create: [
                {
                  title: "Lesson 11 — Capstone — what you built, what's deferred, what comes next",
                  slug: "openhl-precompiles-capstone-en",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 20,
                  xpReward: 40,
                  content: `# Lesson 11 — Capstone — what you built, what's deferred, what comes next

## Goal

By the end of this lesson:

- You can sketch the EVM ↔ CLOB architecture on a whiteboard from memory.
- You can name the four deferred items in v0 (RPC roundtrip, multi-validator OrderIds, transaction-scoped rollback, staticcall mutation refusal) and explain why each is out of scope.
- You can sketch where four extensions would land (best_ask precompile, depth precompile, clob_cancel_order, fills-as-EVM-events).
- You're ready to ship custom precompiles in your own Reth-based L1.

**No code in this lesson.** Just the mental model.

## The architecture, in one diagram

\`\`\`
                ┌─────────────────────────────────────────────┐
                │           LiveRethEvmBridge                  │
                │                                              │
                │  clob: Arc<Mutex<Book>>                      │
                │  pending_fills: Arc<Mutex<Vec<Fill>>>        │
                └──────┬───────────────┬───────────────────────┘
                       │               │
            install_   │               │ install_
            clob       │               │ fill_sink
                       ▼               ▼
              ┌─────────────────────────────────────┐
              │  precompiles module (process-global) │
              │                                     │
              │  CLOB_STATE: RwLock<Option<…>>      │
              │  FILL_SINK:  RwLock<Option<…>>      │
              └──────┬───────────────┬──────────────┘
                     │               │
        read_best_   │               │ place_order
        bid          │               │
                     ▼               ▼
              ┌─────────────────────────────────────┐
              │  Reth EVM (via OpenHlEvmFactory)    │
              │                                     │
              │  Precompile registry:               │
              │    0x...0c1b → read_best_bid        │
              │    0x...0c1c → place_order          │
              └──────┬──────────────────────────────┘
                     │
                     ▼
              ┌─────────────────────────────────────┐
              │  Solidity contracts                 │
              │                                     │
              │  staticcall(0x...0c1b, "")          │
              │  call(0x...0c1c, abi.encode(...))   │
              └─────────────────────────────────────┘
\`\`\`

Read top-to-bottom: the bridge owns the data, the precompile module exposes it via process-global handles, the EVM dispatches calls to the precompiles, and Solidity contracts hit those addresses just like they'd hit \`ecrecover\`.

Read bottom-to-top: a smart contract issues \`STATICCALL(0x...0c1b)\`. The Reth EVM looks up the address in its precompile registry → dispatches to \`read_best_bid\` → which reads from \`CLOB_STATE\` → which is the same \`Arc<Mutex<Book>>\` the bridge's \`submit_order\` writes to. **No translation layer. No serialization round-trip. Just memory.**

## What each module delivered

**Module 1 (Custom EVM bootstrap, L1-L3)** — The pluggable seam:

- \`OpenHlEvmFactory\` implements \`alloy_evm::EvmFactory\` — Reth's "swap one slot" interface for custom EVMs.
- \`OpenHlExecutorBuilder\` implements \`reth_node_builder::ExecutorBuilder\` — the NodeBuilder plug-in shape.
- \`openhl_precompiles(base)\` extends Reth's standard precompile set with our custom addresses, per hardfork (\`OnceLock\` cached).
- Reth boots with our EVM via \`.with_components(EthereumNode::components().executor(OpenHlExecutorBuilder))\`.

**Module 2 (Read precompile, L4-L6)** — Smart contracts read live CLOB state:

- \`CLOB_READ_BEST_BID\` at \`0x...0c1b\` — empty calldata, returns 64-byte ABI-encoded \`(price, qty)\`.
- \`CLOB_STATE\` global: \`RwLock<Option<Arc<Mutex<Book>>>>\` — process-global handle to the bridge's Book.
- \`install_clob\` / \`uninstall_clob\` / \`current_best_bid\` — the lifecycle and read primitives.
- Tests prove: zero output when uninstalled, live values when installed, registry-callable through dispatch.

**Module 3 (Write precompile, L7-L8)** — Smart contracts write to the CLOB:

- \`CLOB_PLACE_ORDER\` at \`0x...0c1c\` — 128-byte ABI-aligned calldata \`(account, side, price, qty)\`, returns 32-byte \`(order_id)\`.
- \`NEXT_ORDER_ID: AtomicU64\` — wait-free ID allocation, starts at 1 so \`0\` = rejected sentinel.
- Rejection paths: short input, invalid side byte, zero qty, no CLOB installed.
- Tests prove: rejections leave book untouched, valid input crosses correctly, two-precompile round-trip works.

**Module 4 (Bridge integration, L9-L10)** — Fills flow back to the bridge:

- \`FILL_SINK\` global: \`RwLock<Option<Arc<Mutex<Vec<Fill>>>>>\` — parallel structure to \`CLOB_STATE\`.
- \`LiveRethEvmBridge::new()\` installs both globals from its owned Arcs.
- \`place_order\` pushes fills into the sink (if installed) — they reach the next \`build_payload\` via the same drain as bridge-side \`submit_order\`.
- Integration test proves the full chain in a real Reth process: 48 tests total (47 unit + 1 integration).

## The honest deferred

Four things v0 doesn't do. Each is a real production gap. Each was deferred *deliberately* with documentation in the code.

### 1. RPC \`eth_call\` roundtrip

**What we proved**: direct Rust calls to \`place_order(...)\` and \`current_best_bid()\` work, and the precompiles are registered into Reth's EVM via \`openhl_precompiles()\`.

**What we didn't prove**: a Solidity contract calling \`staticcall(0x...0c1b, "")\` via JSON-RPC actually reaches our function. That path involves Reth's RPC server, its transaction simulation, its EVM dispatch — plumbing we trust Reth to handle correctly.

**Why deferred**: testing this would primarily validate Reth, not openhl. The integration boundary between our crate and Reth is \`openhl_precompiles()\` — once that's correct, the rest is Reth's responsibility.

**When to revisit**: if you fork Reth significantly or upgrade across a major version boundary where the precompile registry interface changes.

### 2. Multi-validator deterministic OrderIds

**What we have**: \`NEXT_ORDER_ID: AtomicU64\`, a process-global counter starting at 1.

**The problem**: with two validators running this code, each maintains its own counter. Validator A allocates \`OrderId(5)\` for some EVM call; validator B allocates \`OrderId(11)\` for the *same* call. **Books diverge silently.** No error, no crash — just inconsistent state across the network until a read returns different values.

**Why deferred**: openhl v0 is single-validator. Multi-validator consensus on OrderIds requires either (a) deterministic ID derivation from the EVM call itself (e.g., \`keccak(tx_hash, call_index)\`) or (b) reading IDs from a block-scoped shared state.

**When to revisit**: before any multi-validator deployment. **This is a network-divergence bug waiting to happen.** The doc comment on \`NEXT_ORDER_ID\` calls this out at the static's definition site so future code-readers see the constraint.

### 3. Transaction-scoped state shadowing (revert rollback)

**What we have**: \`place_order\` mutates the Book *immediately* during precompile execution.

**The problem**: if the EVM transaction reverts later (after \`place_order\` succeeded), the book mutation isn't rolled back. The EVM's normal storage semantics revert with the transaction — but our Book lives outside EVM storage in a process-global Arc.

**Why deferred**: storage shadowing would require either (a) journaling Book mutations so they can be replayed on revert, or (b) running the matching engine in a "virtual" mode during EVM execution and committing on transaction success. Both are non-trivial; openhl v0 punts on this.

**When to revisit**: when production traffic includes contracts that can fail mid-transaction after placing orders. **In single-actor scenarios (one matching contract, no external composability), it doesn't matter; in DeFi composability scenarios, it absolutely does.**

### 4. \`staticcall\` mutation refusal

**What we have**: \`place_order\` writes to the Book regardless of how it's called.

**The problem**: Solidity's \`staticcall\` is supposed to enforce read-only access — but the EVM doesn't pass the static-call flag into our precompile. A contract could \`STATICCALL(0x...0c1c, ...)\` and we'd happily mutate the book, breaking the contract's expectation of read-only semantics.

**Why deferred**: REVM's \`PrecompileFn\` signature is \`fn(&[u8], u64, u64) -> PrecompileResult\`. The "is this a staticcall?" flag isn't in the third argument (that's the gas reservoir). We'd need to plumb additional context through, which means either modifying REVM (a fork) or waiting for an upstream API.

**When to revisit**: when a security audit flags this as a real attack vector. **The attack scenario is contrived** — most contracts won't \`STATICCALL\` a known write precompile — but a careful auditor will name it.

## What comes next

Four extensions you could ship after this course, in order of complexity.

### Extension 1: \`best_ask\` precompile (1 day)

Mirror of \`read_best_bid\` for the sell side. Same shape, opposite direction. New address (\`0x...0c1d\`?), one new function, ~30 lines of test code. **The structural parallel to \`read_best_bid\` makes this nearly mechanical.**

### Extension 2: \`clob_depth_at_price\` precompile (2-3 days)

Takes a \`(side, price)\` calldata, returns the total qty resting at that price level. Useful for contracts that want to estimate slippage before placing market orders. Adds a \`Book::depth_at_price()\` method and a new precompile. **Conceptually similar but extends the calldata layout to include an input parameter.**

### Extension 3: \`clob_cancel_order\` precompile (1 week)

Takes an \`(order_id, account)\` calldata, removes the order from the book if it belongs to the caller. Returns success/failure. **Adds an authorization concern** — how do we verify the caller is the account that placed the order? The EVM call's \`msg.sender\` is the precompile-calling contract, not the original account. **You need a \`keccak(account_id, signature)\` scheme or a pre-registered authorization mapping.** Defer the authorization design until you've decided on your account model.

### Extension 4: Fills as EVM events (2 weeks)

Currently fills land in \`bridge.pending_fills\` and get attached to payload-built blocks. **Smart contracts can't observe them.** Emitting fills as EVM events would let downstream contracts subscribe via \`eth_getLogs\` / event filters — the same way they'd subscribe to ERC-20 transfers.

**The mechanism**: at the end of \`place_order\`, encode each fill as a Solidity-ABI-encoded event and call \`revm::interpreter::Interpreter::add_log(...)\` (or whatever the equivalent for our EVM version is). The contract emitting the event is the precompile itself (address \`0x...0c1c\`).

**The complexity**: precompiles aren't typically event-emitting. The revm API for this is awkward — you may need to extend the \`PrecompileFn\` signature, which means a small revm fork. **High-impact, high-friction.** Defer until there's clear product demand.

## Course completion — what you've internalized

The skills you've practiced through this course generalize beyond CLOB precompiles:

1. **The custom-EVM "swap one slot" pattern.** Any time you want to plug in your own dispatch into Reth's EVM — for custom opcodes, custom transaction validation, custom gas pricing — the path is the same: \`EvmFactory\` + \`ExecutorBuilder\` + \`.with_components(...)\`.

2. **The process-global-Arc pattern for precompile state.** REVM's function-pointer signature means closures aren't an option; process-global storage is. **The pattern compounds**: once you have one shared state (the CLOB), adding more (the fill sink) is mechanical.

3. **Schema-first protocol design.** Locking the calldata layout (L7) before the implementation (L8) means contracts built against the schema don't break when the implementation evolves. **The contract is the schema, not the function body.**

4. **Adversarial test data.** Two orders @ different prices to prove "best = highest price, not largest qty." Maker + taker to prove fills flow. Every test value should distinguish correctness from coincidence.

5. **Honest scoping with documentation.** Every deferred item is named in a doc comment at the relevant code site. **Future readers see the gap and the reason in one place.** Undocumented gaps become invisible debt.

## Where this course sits in the L1 Architect track

**Courses 1-5** (Reth internals): Reth's pipeline, payload building, NodeBuilder, evm crate, RPC.

**Courses 6-7** (consensus + CLOB): the openhl-specific machinery — Malachite consensus integration, then the CLOB matching engine.

**Course 8 (this one)**: bridging EVM ↔ CLOB via custom precompiles. **The first course that touches Reth's pluggable EVM seams.**

**Course 9 (funding state machine)**: perpetuals-specific — the funding rate machinery that turns the CLOB into a perp DEX. Will build on the precompile patterns from course 8.

**Course 10 (capstone — a full openhl deployment)**: takes everything from 1-9 and ships a runnable openhl node + a sample trading contract.

You're now 80% of the way through the L1 Architect track. **The patterns you've learned here are the foundation for everything that comes after.**

## Final answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout d19ba1b
diff -u ~/code/my-openhl/crates/evm/ ./crates/evm/ --recursive
\`\`\`

After L11, **the entire \`crates/evm/\` directory should be byte-identical** to openhl's Stage 9c+ HEAD. You've reproduced 5 commits (9a, 9b, 9c, 9c+, 9d) by hand, with full understanding of why each line is there.

Return:

\`\`\`bash
git checkout main
\`\`\`

## You shipped this

47 unit tests. 1 integration test. 2 custom precompiles. 2 process-globals. 1 EvmFactory. 1 ExecutorBuilder. ~600 lines of production Rust code. Smart contracts can read and write to a matching engine running on the same node — through the same EVM dispatch that handles \`ecrecover\` and BLS12-381.

**That's a custom L1 trading primitive built on Reth.** Go ship.`,
                },
              ],
            },
          },
        ],
      },
    },
  });
}
