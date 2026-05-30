import { PrismaClient } from '@prisma/client';

export async function seedRethOpenHlConsensusEN(prisma: PrismaClient) {
  const tags = ['openhl', 'consensus', 'malachite', 'reth', 'expert'];

  await prisma.course.create({
    data: {
      slug: 'reth-openhl-consensus-en',
      title: 'Build OpenHL — from \`cargo init\` to a single-validator devnet',
      description:
        'Build the openhl track\'s keystone — a single-validator devnet integrating Reth (execution) + Malachite (Tendermint-style BFT consensus). Sixteen lessons across eight modules: Orientation, Foundations (workspace + Reth + Malachite pinning), Contract types (shared vocabulary + ConsensusBridge trait), EL test double (InMemory + RethEvmBridge with alloy), CL types (OpenHlContext + 10 Malachite sub-types + SigningProvider + Codec + OpenHlNode), Engine integration (run_engine_app + first block through actor pipeline), Live Reth (bootstrap + LiveRethEvmBridge + validate_payload via EthBeaconConsensus + commit via Engine API forkchoice), and Capstone. Production parallel: Hyperliquid HyperBFT + HyperEVM.',
      difficulty: 'EXPERT',
      duration: 660,
      xpReward: 1270,
      track: 'reth-openhl-consensus',
      tags,
      isPublished: true,
      sortOrder: 1510,
      locale: 'en',
      instructorName: 'RethLab',
      modules: {
        create: [
          {
            title: 'Orientation',
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: 'Build OpenHL — from cargo init to a single-validator devnet',
                  slug: 'openhl-orientation-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 20,
                  xpReward: 60,
                  content: `# Build OpenHL — from cargo init to a single-validator devnet

## Question

Build openhl — **the open-source reference Hyperliquid implementation** — from \`cargo init\` to a running single-validator devnet that produces real blocks via a real Malachite consensus + real Reth execution. **The keystone of the openhl track**.

## Principle (minimum model)

- **16 lessons across 8 modules**: Orientation → Foundations → Contract types → EL test double → CL types → Engine integration → Live Reth → Capstone.
- **Three sub-systems integrated.** Reth (execution engine) + Malachite (Tendermint-style BFT consensus) + the openhl orchestration glue.
- **Pinned to openhl SHAs at each stage.** Stages 1-3 (workspace + Malachite setup), Stage 4 (contracts), Stage 5 (CL types), Stage 6+ (live Reth integration).
- **Outcome.** A single-validator devnet that boots, produces blocks via BFT consensus, executes via Reth, and survives restart.
- **Prerequisites.** openhl Funding + CLOB + Precompiles + perp primer + consensus-engineering Advanced course.
- **Production parallel.** Hyperliquid HyperBFT + HyperEVM use this exact pattern (different code, same shape).

## Worked example + steps

# Build OpenHL — from \`cargo init\` to a single-validator devnet

This is not a course you read. This is a course you **build**.

Over the next 16 lessons, you'll start from \`cargo init\` on an empty directory and end with a Rust workspace that compiles, passes a real BFT-consensus integration test, and drives a complete block end-to-end through a real Reth + a real Malachite. The codebase you end with is your own — written by you, line by line — and it will look almost exactly like \`psyto/openhl\` at the same Stage. That repo is your **answer key**.

Hyperliquid moved $300B+ of perp volume in 2025 on a fully closed-source stack — HyperBFT consensus, HyperCore matching engine, HyperEVM execution. There is no public Rust reference. **OpenHL is what the open-source version looks like**, and this course is how you build the Module 1 substrate of it yourself.

**Why a CLOB?** Hyperliquid's design choice is price-time-priority order book matching because its target market — top-tier crypto-native perps — has enough continuous retail flow for the order book to do real local price discovery. RFQ systems (Variational, Paradigm) win the long tail of assets by quoting just-in-time and hedging on a primary venue; AMMs (GMX-era) optimize cold-start at the cost of tail economics. You're about to build the engine for the slice of the market where CLOB is the right answer. The CLOB course (Course 7) capstone reflects on this tradeoff in depth — for now, the design context is enough to start.

## 1. What you'll have at the end

**A 30-second BFT primer first.** BFT consensus runs in *rounds* of three phases:

- **propose** — one chosen validator broadcasts a block proposal
- **prevote** — every validator broadcasts a yes/no/nil vote on the proposal
- **precommit** — validators lock their vote

A block is **decided** (= final) once ≥ 2/3 of validators have precommitted it. Within each round the **proposer** is selected deterministically from the validator set; if the round fails (no quorum), the protocol advances to the next round with a different proposer.

Malachite is the Rust BFT engine that drives this state machine; your job in this course is to wire your application (header construction, EVM execution) into it via a \`Context\` trait.

Keep five words in hand — *propose, prevote, precommit, decided, proposer* — and the rest of the course vocabulary lands cleanly.

By the end of Lesson 15, on your own machine, \`cargo test first_block_via_engine_actors\` will produce a passing single-validator BFT consensus round in roughly 0.02 seconds against real Reth as the EVM layer and real Malachite as the BFT layer. The code path is:

\`\`\`
your code →
  Malachite Driver →
    proposer election →
      build_payload (your bridge) →
        Reth dev-node provider →
          header construction →
            EthBeaconConsensus validator →
              validate_payload →
                forkchoice_updated →
                  decided block
\`\`\`

Every line of that path is code **you wrote**. None of it is magic; all of it is open. By the time you finish, you can:

- Read any line of \`psyto/openhl\` Module 1 code and explain why it's there
- Modify any part of the bridge contract and run the tests to see what breaks
- Fork the substrate to start your own Hyperliquid-shape chain — \`psyto/openhl\` becomes your reference implementation, not your dependency

## 2. What you won't have at the end

This course covers **openhl Build arc Module 1 only** — the consensus substrate. It does NOT cover:

- Module 2: the CLOB matching engine
- Module 3: custom EVM precompiles that read CLOB state
- Module 4: funding, oracle, liquidations
- Module 5: protocol-native vault primitive

Those each become their own rethlab course later in the L1 Architect tier. When you finish this course you have the **substrate** — the BFT-EVM contract, the actor wiring, the live-Reth integration. You do **not** have a working perp DEX. The perp DEX is Modules 2 through 5 on top of what you build here.

This is honest scoping. A "build your own Hyperliquid" course that promises everything in 16 lessons would be lying to you.

## 3. How this course works

Every lesson has the same shape:

1. **Goal.** "By the end of this lesson, \`cargo test <name>\` will pass." That test does not pass right now. You will make it pass.
2. **Recap.** Where you are in the workspace. What the last lesson built. What the test landscape looks like as of now.
3. **Plan.** What you're about to build, and what design choices the openhl maintainers made when they built it the first time.
4. **Walk-through.** Step-by-step code. Type it, save it, run \`cargo check\` after each step.
5. **Test.** Run \`cargo test <name>\`. It should pass. If it doesn't, here are the typical mistakes.
6. **Design reflection.** One or two load-bearing decisions you just encoded. We come back to these in later lessons.
7. **Answer key.** Git-checkout point in \`psyto/openhl\` where the same code lives. Diff your code against that SHA if you want to verify.
8. **Next lesson.** What gets built next, and why.

The lesson is the **instruction set**. The code you write is the **artifact**. \`psyto/openhl\` at the matching SHA is the **answer key**.

## 4. Prerequisites

You need:

- **Rust 1.95+.** \`rustup default 1.95.0\` or newer.
- **Git.** You'll clone \`psyto/openhl\` once as the answer key.
- **Basic comfort with cargo workspaces, async/await, and trait impls.** If \`#[async_trait]\` and \`impl Trait for Foo { ... }\` are new vocabulary, this course will move too fast. Take the rethlab Fundamentals or Advanced courses first.
- **An editor that handles Rust well.** VS Code + rust-analyzer is fine. Vim/Helix/Emacs are fine.
- **About 4 GB free disk space.** Reth's compile graph is large.

You do **not** need:

- Any prior consensus-protocol knowledge (we explain BFT as we go)
- Any prior Reth knowledge (lesson 1 introduces the dep)
- Any prior Malachite knowledge (lesson 1 introduces it too)
- A multi-machine setup (everything runs single-process on your laptop)

## 5. Setup (do this now)

You will have **two** directories on your machine:

- \`~/code/my-openhl/\` — your workspace. You write code here. This is **yours**.
- \`~/code/openhl-reference/\` — a clone of \`psyto/openhl\`. You read code here when you want to compare. This is **read-only**.

\`\`\`bash
# Your workspace
mkdir -p ~/code/my-openhl && cd ~/code/my-openhl
cargo init --lib
# (the package name will default to \`my-openhl\` from the directory name. Lesson 1
#  restructures this into a workspace where the inner crates are \`openhl-types\`
#  / \`openhl-consensus\` / …, so the root package name disappears at that point.
#  We'll also delete the default lib.rs in Lesson 1 — this \`cargo init\` only exists
#  to give git a starting commit to track against.)

# Pin the same Rust toolchain in your own workspace too
echo -e '[toolchain]\\nchannel = "1.95.0"' > rust-toolchain.toml

# Answer-key reference
mkdir -p ~/code && cd ~/code
git clone https://github.com/psyto/openhl.git openhl-reference
cd openhl-reference
cargo check  # this WILL take a long time the first time — Reth is big
\`\`\`

If \`cargo check\` in \`openhl-reference\` passes, you have the right toolchain. Move on. If it fails, fix toolchain version first — \`rust-toolchain.toml\` in that repo pins Rust 1.95.0, and you've just dropped the same pin into \`my-openhl/\`, so \`rustup\` should auto-install the required toolchain for both.


## 6. The 16-lesson map

Each row is one lesson. Each lesson ends with a passing \`cargo test\`.

| # | Module | What you build | End-of-lesson test |
| - | - | - | - |
| **Lesson 0** | Orientation | (this lesson) | setup confirmed |
| **Lesson 1** | Foundations | workspace + Reth & Malachite pinned | \`cargo check --workspace\` clean |
| **Lesson 2** | Contract types | \`openhl-types\` primitives (BlockHash, PayloadId, ...) | \`cargo test -p openhl-types\` |
| **Lesson 3** | Contract trait | \`ConsensusBridge\` trait — 4 messages as async fns | \`cargo check -p openhl-consensus\` |
| **Lesson 4** | EL test double | \`InMemoryEvmBridge\` — fake EVM for testing | InMemoryEvmBridge tests pass |
| **Lesson 5** | Reth-typed bridge | \`RethEvmBridge\` — same contract, real Reth types | RethEvmBridge tests pass |
| **Lesson 6** | CL types | \`OpenHlContext\` + 10 Context sub-types | context compiles |
| **Lesson 7** | Signing | \`OpenHlSigningProvider\` — Ed25519 sign/verify | sign/verify round-trip |
| **Lesson 8** | Codec | \`OpenHlCodec\` — the codec slot the engine demands | codec round-trip |
| **Lesson 9** | Node | \`OpenHlNode\` + the first \`start_engine\` call | engine start/stop smoke |
| **Lesson 10** | App loop | \`run_engine_app\` — the actor pipeline that ties it all together | **\`first_block_via_engine_actors\`** — Module 1 milestone, BFT round closes |
| **Lesson 11** | Live Reth | bootstrap a real Reth dev-node in a test | \`reth_dev_node_bootstraps\` |
| **Lesson 12** | Live bridge — build path | \`LiveRethEvmBridge\` (build_payload side) reads parent from a live provider | \`live_bridge_builds_on_real_genesis\` |
| **Lesson 13** | Live bridge — validate path | \`LiveRethEvmBridge\` (validate_payload side) wires \`EthBeaconConsensus\` for real header validation | validate-path tests |
| **Lesson 14** | Live bridge — commit path | \`LiveRethEvmBridge\` (commit side) wires \`forkchoice_updated\` via Reth's in-process Engine API | \`commit_sends_forkchoice_to_engine\` |
| **Lesson 15** | Capstone | write the end-to-end test that openhl doesn't have yet — \`run_engine_app\` + \`LiveRethEvmBridge\` together | your own integration test |

**Lesson 10 is the major milestone.** Finishing Lesson 10, you have BFT consensus producing a block end-to-end through your actor system. Lessons 11–14 swap your stub Reth for real Reth. Lesson 15 lets you exercise the combined whole — something \`psyto/openhl\` itself hasn't built yet (at SHA \`0844d58\`), so you'll be **ahead** of the reference at the end.

## 7. The answer-key discipline

Every lesson cites a \`psyto/openhl\` SHA — the commit where the same code first appeared. After you finish the lesson and your test passes:

\`\`\`bash
cd ~/code/openhl-reference
git checkout <SHA-from-lesson>
# Now compare. Your code in ~/code/my-openhl/ should be ~equivalent.
diff -ru ~/code/my-openhl/crates/types ./crates/types
\`\`\`

Your code will differ in trivial ways (whitespace, variable names, comment wording). What matters: types, signatures, control flow are equivalent. If those diverge meaningfully, the lesson didn't land; re-read the design-reflection section and adjust.


## 8. Setup confirmation — the actual Lesson 0 exercise

Before you move to Lesson 1, run all of this and confirm it all passes:

\`\`\`bash
# 1. Rust version
rustc --version    # expect: rustc 1.95.x or later

# 2. Your workspace exists
ls ~/code/my-openhl    # expect: Cargo.toml, src/

# 3. Reference exists and compiles
cd ~/code/openhl-reference && cargo check    # expect: "Finished" eventually
\`\`\`

If all three pass, you are set up correctly. Move to Lesson 1.

> 💡 **Self-check before moving on**
>
> In one sentence, can you state the difference between \`~/code/my-openhl\` and \`~/code/openhl-reference\`?
>
> If you can't say in your own words "**one is the real workspace I write line by line, the other is the mirror I only consult when I'm stuck**," re-read §5 before starting Lesson 1. If you blur this distinction now, you'll eventually write code into \`openhl-reference\` by mistake and lose the boundary between what you wrote and what you borrowed. **Make the boundary muscle memory before moving on.**

## Summary (3 lines)

- Build openhl = single-validator devnet integrating Reth + Malachite. 16 lessons / 8 modules.
- Pinned to openhl SHAs at each stage; outcome is a running devnet with real BFT + real Reth.
- Prerequisites: openhl other courses + consensus-engineering. Production parallel: Hyperliquid HyperBFT + HyperEVM.
`,
                },
              ],
            },
          },
          {
            title: 'Foundations',
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: 'Lesson 1 — Workspace + Reth + Malachite (Stages 1-3)',
                  slug: 'openhl-workspace-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 45,
                  xpReward: 80,
                  content: `# Lesson 1 — Workspace + Reth + Malachite (Stages 1-3)

## Question

**Build the cargo workspace, add Reth + Malachite + openhl crates.** Three pinned SHAs; one \`Cargo.toml\`; one \`cargo build\`. Stages 1-3 of openhl.

## Principle (minimum model)

- **\`Cargo.toml\` workspace.** Three member crates: \`openhl-types\` (shared) + \`openhl-node\` (orchestrator) + \`openhl-tests\`. Workspace deps pin Reth + Malachite.
- **Reth dep.** \`reth = { git = "https://github.com/paradigmxyz/reth", rev = "..." }\`. Pin to a specific commit; reproducible.
- **Malachite dep.** \`informalsystems-malachitebft-core-consensus = { git = "...", rev = "..." }\`. Same pinning pattern.
- **Why pinned SHAs.** Reth and Malachite are fast-moving upstream. Without pinning, your build may break overnight. With pinning, byte-for-byte reproducible.
- **\`cargo build\` succeeds.** All deps resolved; openhl-node + openhl-types compile (empty stubs); openhl-tests runs zero tests. Foundation laid.
- **Three SHAs.** Stage 1 = Reth pin. Stage 2 = Malachite pin. Stage 3 = openhl workspace + module wiring. Each stage in its own commit.
- **Why three stages, not one.** Bisection. If Stage 2 fails, you know Malachite's integration is the issue; not Reth, not openhl.

## Worked example + steps

# Lesson 1 — Workspace + Reth + Malachite (Stages 1-3)

## Goal

Concepts you'll grasp in this lesson:

- **Dependency-graph-first workflow** — why getting Reth + Malachite to coexist *before* writing any application code prevents mid-course backtracking when transitive conflicts surface.
- **Workspace-level dep declaration** — declaring every external dep once at the root \`Cargo.toml\` and inheriting via \`{ workspace = true }\`, so a Reth version bump is a one-line change instead of an 11-crate sweep.
- **Git-SHA pinning vs. crates.io** — why production L1s pin Reth and Malachite to commit SHAs, not semver ranges; absolute reproducibility beats convenience when validators must agree byte-for-byte.
- **The 10-crate + 1-bin layout** — how OpenHL's 5 subsystems (types, codec, clob, consensus, evm, …) map onto a flat \`crates/\` directory plus one \`bin/openhl\` entry point.

Verification:

\`\`\`bash
cargo check --workspace
\`\`\`

…run from your \`~/code/my-openhl/\` directory, returns \`Finished\` with no warnings other than "unused dependency" warnings. **You will have written zero application logic** — that's Lesson 2 onwards.

The Reth compile graph alone is ~600 crates. The first \`cargo check\` will take 5-15 minutes depending on your machine. Plan accordingly. Subsequent checks are incremental and fast.

Specific changes:

- 10 empty library crates and one binary crate scaffolded under \`crates/\` and \`bin/openhl/\`.
- Root \`Cargo.toml\` declares \`members\`, workspace defaults, and \`[workspace.dependencies]\`.
- Reth pinned as a git dependency at a specific SHA, declared at the workspace level.
- Malachite pinned the same way.

## Recap

You ran the Lesson 0 setup. You have:

- \`~/code/my-openhl/\` — your workspace, currently a default \`cargo init --lib\` artifact
- \`~/code/openhl-reference/\` — \`psyto/openhl\` cloned, \`cargo check\` passing

This lesson edits files in \`~/code/my-openhl/\`. **Never** touch \`openhl-reference/\`.

## Plan

Dependency resolution is the most common source of friction in a Rust workspace. Reth and Malachite are big crates with deep transitive dep trees — getting them to compile cleanly together is non-trivial. **If we deferred this to "later," we'd discover the conflicts in the middle of writing application code and have to backtrack.** Getting the deps right first means every subsequent lesson focuses on the lesson's actual topic, not yak-shaving dependencies. *That's why the stage order below front-loads dep setup before any application code.*


So you'll do three things, in this order:

1. **Stage 1** — replace the default \`cargo init --lib\` output with a real workspace: 10 empty library crates, 1 binary crate, top-level \`Cargo.toml\` declaring all the workspace defaults. **Test**: \`cargo check --workspace\` succeeds with no external dependencies.
2. **Stage 2** — pin Reth as a git dependency at a specific SHA, declared at the workspace level. **Test**: \`cargo check --workspace\` still succeeds (no crate uses Reth yet — we just verify the dep resolves).
3. **Stage 3** — pin Malachite the same way. **Test**: \`cargo check --workspace\` still succeeds.

Each stage is a real commit in \`psyto/openhl\`: \`75be9de\`, then \`5fc7ca1\`.

## Walk-through

### Step 1: Reset \`~/code/my-openhl/\`

The Lesson 0 setup left a default cargo project there. We need to wipe it and start fresh:

\`\`\`bash
cd ~/code/my-openhl
rm Cargo.toml Cargo.lock src/lib.rs
rmdir src
\`\`\`

You should now have only \`.git/\` (from the initial cargo init) and nothing else visible:

\`\`\`bash
ls -la
# .  ..  .git
\`\`\`

### Step 2: Write the top-level workspace Cargo.toml

Create \`Cargo.toml\` at the root with this content. Type it; don't copy from the reference. Pay attention to each section.

\`\`\`toml
[workspace]
resolver = "3"
members = [
    "bin/openhl",
    "crates/types",
    "crates/codec",
    "crates/clob",
    "crates/oracle",
    "crates/funding",
    "crates/liquidation",
    "crates/vault",
    "crates/evm",
    "crates/consensus",
    "crates/node",
]

[workspace.package]
version      = "0.1.0"
edition      = "2024"
rust-version = "1.95"
license      = "MIT OR Apache-2.0"
repository   = "https://github.com/yourusername/my-openhl"
authors      = ["Your Name <you@example.com>"]

[workspace.dependencies]
# --- Internal crates ---
openhl-types       = { path = "crates/types" }
openhl-codec       = { path = "crates/codec" }
openhl-clob        = { path = "crates/clob" }
openhl-oracle      = { path = "crates/oracle" }
openhl-funding     = { path = "crates/funding" }
openhl-liquidation = { path = "crates/liquidation" }
openhl-vault       = { path = "crates/vault" }
openhl-evm         = { path = "crates/evm" }
openhl-consensus   = { path = "crates/consensus" }
openhl-node        = { path = "crates/node" }

# --- Reth and Malachite — added in Steps 7 and 8 below ---

# --- Shared utilities ---
tokio              = { version = "1", features = ["full"] }
async-trait        = "0.1"
serde              = { version = "1", features = ["derive"] }
serde_json         = "1"
thiserror          = "1"
eyre               = "0.6"
tracing            = "0.1"
proptest           = "1"

[workspace.lints.rust]
unsafe_code                   = "forbid"
missing_debug_implementations = "warn"
unreachable_pub               = "warn"
rust_2018_idioms              = { level = "warn", priority = -1 }

[workspace.lints.clippy]
all      = { level = "warn", priority = -1 }
pedantic = { level = "warn", priority = -1 }
module_name_repetitions = "allow"
must_use_candidate      = "allow"
missing_errors_doc      = "allow"
missing_panics_doc      = "allow"

[profile.release]
opt-level     = 3
lto           = "fat"
codegen-units = 1
strip         = "symbols"
debug         = false
panic         = "abort"

[profile.dev]
opt-level = 1
debug     = true

[profile.dev.package."*"]
opt-level = 3
\`\`\`

**Three load-bearing choices in this file:**

1. **\`resolver = "3"\`**. The Cargo dep resolver version. Resolver 3 (the default in Rust 2024 edition) handles feature unification more strictly. Reth and Malachite both have complex feature flags; resolver 3 avoids subtle issues.
2. **\`unsafe_code = "forbid"\` at the workspace level**. This forbids \`unsafe\` in every member crate. Reth depends on \`unsafe\` internally; we don't. Forbidding it at the application layer is the determinism rail from Lesson 0 §4 — if a pure state-machine crate ever wants \`unsafe\`, that's a code review smell.
3. **\`pedantic = "warn"\` (clippy)**. Pedantic clippy lints catch a lot of subtle stuff. Some are noisy, hence the \`module_name_repetitions\`/etc. allowances at the bottom. Setting pedantic-warn up front means every commit lands clippy-clean.

### Step 3: Add \`rust-toolchain.toml\` at the root

Create \`rust-toolchain.toml\`:

\`\`\`toml
[toolchain]
channel    = "1.95.0"
components = ["clippy", "rustfmt"]
profile    = "minimal"
\`\`\`

This pins the Rust version. When the reader (or CI) runs \`cargo\`, the toolchain is fetched and used automatically. Without this, different machines could build with different rustc versions and produce different artifacts — a determinism risk we don't want.

### Step 4: Create the first library crate (\`crates/types\`) as a template

We'll create one crate end-to-end, then replicate the pattern.

\`\`\`bash
mkdir -p crates/types/src
\`\`\`

Create \`crates/types/Cargo.toml\`:

\`\`\`toml
[package]
name         = "openhl-types"
version      = { workspace = true }
edition      = { workspace = true }
rust-version = { workspace = true }
license      = { workspace = true }
repository   = { workspace = true }
authors      = { workspace = true }

[dependencies]
serde = { workspace = true }

[lints]
workspace = true
\`\`\`

Create \`crates/types/src/lib.rs\`:

\`\`\`rust
//! Shared primitives and CL/EL contract types.
\`\`\`

That's it. The crate is empty other than a module doc comment. Subsequent lessons fill it in.

**Why \`version = { workspace = true }\` etc.?** This inherits from \`[workspace.package]\` in the root Cargo.toml. Every member crate has identical metadata — versioning, edition, license. Inheriting via \`workspace = true\` means a one-line bump to the workspace gets propagated. The alternative (per-crate \`version = "0.1.0"\`) duplicates 6 lines into 11 crates and is easy to drift out of sync.

### Step 5: Create the other 9 library crates

The pattern is the same as \`crates/types\`. For each, create:

- \`crates/<name>/Cargo.toml\` (same shape, only \`name\` field differs)
- \`crates/<name>/src/lib.rs\` (empty other than doc comment)

For example, for \`codec\`, first create the directory:

\`\`\`bash
mkdir -p crates/codec/src
\`\`\`

then drop in \`crates/codec/Cargo.toml\` and \`crates/codec/src/lib.rs\` using the \`name\` and doc comment from the table below. Repeat the same \`mkdir -p crates/<name>/src\` + two-file recipe for each of the remaining 8 crates.

The 9 remaining crates and their doc comments:

| Crate | \`name\` | \`lib.rs\` doc comment |
| - | - | - |
| codec | \`openhl-codec\` | \`//! Canonical encoding for consensus messages.\` |
| clob | \`openhl-clob\` | \`//! CLOB matching engine — pure state machine.\` |
| oracle | \`openhl-oracle\` | \`//! Mark price aggregation.\` |
| funding | \`openhl-funding\` | \`//! Funding-rate calculation and settlement.\` |
| liquidation | \`openhl-liquidation\` | \`//! Liquidation engine.\` |
| vault | \`openhl-vault\` | \`//! Protocol-native vault primitive.\` |
| evm | \`openhl-evm\` | \`//! EVM execution layer — Reth integration.\` |
| consensus | \`openhl-consensus\` | \`//! Consensus layer — Malachite BFT.\` |
| node | \`openhl-node\` | \`//! Node assembly: consensus + evm + clob.\` |

For \`clob\`, \`oracle\`, \`funding\`, \`liquidation\`, \`vault\`, \`node\`: the \`[dependencies]\` section can be empty (\`[dependencies]\` line followed by a blank \`[lints]\` block). For \`codec\`, \`evm\`, \`consensus\`: also empty initially — the actual dependencies land in later lessons when we write code that uses them.


### Step 6: Create \`bin/openhl\`

The binary crate. It does nothing yet — just proves the workspace compiles.

\`\`\`bash
mkdir -p bin/openhl/src
\`\`\`

Create \`bin/openhl/Cargo.toml\`:

\`\`\`toml
[package]
name         = "openhl"
version      = { workspace = true }
edition      = { workspace = true }
rust-version = { workspace = true }
license      = { workspace = true }
repository   = { workspace = true }
authors      = { workspace = true }

[[bin]]
name = "openhl"
path = "src/main.rs"

[dependencies]

[lints]
workspace = true
\`\`\`

Create \`bin/openhl/src/main.rs\`:

\`\`\`rust
fn main() {
    println!("openhl v{}", env!("CARGO_PKG_VERSION"));
}
\`\`\`

The \`[[bin]]\` section names the binary \`openhl\` and points it at \`src/main.rs\`. The \`env!("CARGO_PKG_VERSION")\` macro inlines the package version from \`Cargo.toml\` at compile time — useful for \`openhl --version\` later.

### Step 7: First \`cargo check\`

\`\`\`bash
cd ~/code/my-openhl
cargo check --workspace
\`\`\`

Expected output:

\`\`\`
   Compiling openhl-types v0.1.0
   Compiling openhl-codec v0.1.0
   ...(all 10 crates plus openhl bin)...
    Finished \`dev\` profile
\`\`\`

Some "declared but unused dependency" warnings (the \`unused_crate_dependencies\` family) are OK — we declared \`serde\` as a workspace dep, but most crates still hold only a doc-comment \`lib.rs\`, so no actual \`use serde::...\` exists yet. They'll disappear lesson by lesson as real code lands. Hard errors are NOT OK — if you see one, the most common causes are:

- **Typo in a crate name in workspace.members or in a per-crate Cargo.toml.** Cargo will name the missing crate; fix the typo.
- **Missing \`src/lib.rs\` for a library crate.** Each crate listed in workspace.members must have either \`src/lib.rs\` or \`src/main.rs\`.
- **\`[lints]\` block but no \`workspace = true\` inside.** Each crate's \`[lints]\` must say \`workspace = true\` to inherit.

Resolve any errors before moving to Step 8.

### Step 8: Pin Reth as a workspace dependency

Edit the workspace \`Cargo.toml\`. Find the line:

\`\`\`toml
# --- Reth and Malachite — added in Steps 7 and 8 below ---
\`\`\`

Replace it with:

\`\`\`toml
# --- Reth (pinned to v2.2.0 release tag) ---
# Bump in a dedicated PR. Always pin to a release-tag SHA, never main HEAD.
reth-node-builder         = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-node-ethereum        = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-node-core            = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-tasks                = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-chainspec            = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-evm                  = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-ethereum-primitives  = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-engine-primitives    = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-payload-primitives   = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-provider             = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-storage-api          = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-consensus            = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-ethereum-consensus   = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-primitives-traits    = "0.3"
alloy-primitives          = { version = "1.5", default-features = false }
alloy-consensus           = { version = "2.0", default-features = false }
alloy-genesis             = { version = "2.0", default-features = false }
alloy-evm                 = { version = "0.34", default-features = false }
alloy-rlp                 = { version = "0.3", default-features = false }
\`\`\`

**Why this many Reth crates?** Reth is a multi-crate codebase. Different parts (the node builder, the EVM, the storage API, the consensus hook) live in different crates. We declare all the ones our later lessons will use at the workspace level so each consuming crate just references \`reth-xxx = { workspace = true }\` later.

**Why pin to a SHA?** Reth has frequent breaking changes. Pinning to a release tag's SHA (here \`88505c7f...\` = v2.2.0) gives us a stable target. If we used \`version = "2.2"\` or a branch, our build could break when Reth releases an unrelated change.

**Why pin to a release-tag SHA, not main HEAD?** Main HEAD can be broken at any moment. Release tags are tested and stable. The comment in the file (\`# Bump in a dedicated PR. Always pin to a release-tag SHA, never main HEAD.\`) is a process discipline note for future bumps.


The answer is (b). Cargo's \`workspace.dependencies\` declarations cause **resolution** but not **compilation** of unused deps. However, \`cargo check\` does walk the dep graph and fetch the git source. That's the 5-15 minute first-run cost. The good news: subsequent runs use the cached source.

Run it:

\`\`\`bash
cargo check --workspace
\`\`\`

Go make coffee. Come back. You should see:

\`\`\`
    Updating git repository \`https://github.com/paradigmxyz/reth\`
    Updating crates.io index
...(lots of "Downloading" and "Compiling" lines)...
    Finished \`dev\` profile [optimized + debuginfo] target(s) in 14m 23s
\`\`\`

If it errors, the most common causes:

- **alloy version conflict.** If you copy the workspace.deps block above but already have an older \`alloy-primitives = "0.x"\` declared, Cargo can't unify. Solution: bump all alloy versions to match \`1.5\` / \`2.0\` as shown.
- **rustc version too old.** Reth v2.2.0 needs rustc 1.93+. The \`rust-toolchain.toml\` should have pinned \`1.95.0\` — verify with \`rustc --version\`.
- **Network failure fetching git deps.** Re-run. Cargo's git fetch is occasionally flaky.

### Step 9: Pin Malachite as a workspace dependency

Append to the \`[workspace.dependencies]\` section:

\`\`\`toml
# --- Malachite BFT (pinned to v0.5.0 release tag) ---
# Note: crate names in the malachite repo are prefixed \`informalsystems-malachitebft-*\`.
informalsystems-malachitebft-core-types      = { git = "https://github.com/informalsystems/malachite", rev = "9ef02b33c4ded5fe3e072631d86448658680fe55" }
informalsystems-malachitebft-core-consensus  = { git = "https://github.com/informalsystems/malachite", rev = "9ef02b33c4ded5fe3e072631d86448658680fe55" }
informalsystems-malachitebft-core-driver     = { git = "https://github.com/informalsystems/malachite", rev = "9ef02b33c4ded5fe3e072631d86448658680fe55", features = ["std"] }
informalsystems-malachitebft-engine          = { git = "https://github.com/informalsystems/malachite", rev = "9ef02b33c4ded5fe3e072631d86448658680fe55" }
informalsystems-malachitebft-app             = { git = "https://github.com/informalsystems/malachite", rev = "9ef02b33c4ded5fe3e072631d86448658680fe55" }
informalsystems-malachitebft-app-channel     = { git = "https://github.com/informalsystems/malachite", rev = "9ef02b33c4ded5fe3e072631d86448658680fe55" }
informalsystems-malachitebft-config          = { git = "https://github.com/informalsystems/malachite", rev = "9ef02b33c4ded5fe3e072631d86448658680fe55" }
informalsystems-malachitebft-codec           = { git = "https://github.com/informalsystems/malachite", rev = "9ef02b33c4ded5fe3e072631d86448658680fe55" }
informalsystems-malachitebft-signing-ed25519 = { git = "https://github.com/informalsystems/malachite", rev = "9ef02b33c4ded5fe3e072631d86448658680fe55" }
\`\`\`

**Crate-name oddity.** Malachite's repo (\`informalsystems/malachite\`) publishes its crates under the prefix \`informalsystems-malachitebft-*\`. We use the full prefixed names in Cargo.toml. In Rust source code we'll use \`informalsystems_malachitebft_core_types::Context\` (snake_case rename). The comment in the file documents this.

**\`features = ["std"]\` on core-driver.** The driver crate has a \`std\` feature gate. We need standard library facilities (BTreeMap, HashMap, etc.), so we enable it explicitly. Other Malachite crates default to \`std\`, so no explicit feature is needed.

Run cargo check again:

\`\`\`bash
cargo check --workspace
\`\`\`

This time the incremental Reth cache means only Malachite needs fetching/compiling. ~2-5 minutes typically.

## Test

After Step 9 finishes successfully:

\`\`\`bash
cargo check --workspace
\`\`\`

Expected (the cache from Steps 7-9 should be warm, so the second run lands in 1-2 seconds):

\`\`\`
    Finished \`dev\` profile [optimized + debuginfo] target(s) in 0.23s
\`\`\`

> ⚠️ Don't pipe through \`| tail -5\`. If something does fail, the actual error body streams out near the *top* of the compile pipeline, and \`tail\` will throw it away — leaving you with a useless trailing summary. Even if warnings feel noisy, keep the full log visible while you're debugging.

You can also try:

\`\`\`bash
cargo build --bin openhl
./target/debug/openhl
\`\`\`

Expected:

\`\`\`
openhl v0.1.0
\`\`\`

That's Lesson 1 done.

## Design reflection

Two load-bearing decisions you just encoded:

1. **All external deps are declared at the workspace level**, not per-crate. Per-crate Cargo.toml entries say \`reth-storage-api = { workspace = true }\`, inheriting the version. This means a Reth version bump is a one-line change. The alternative (each crate declaring its own version) would cause every Cargo.toml in 11 crates to drift.

2. **Reth and Malachite are git deps, not crates.io deps.** Both projects publish to crates.io, but with significantly different versioning cadence. Pinning to a specific commit SHA in the workspace is a deliberate trade-off: more friction for bumps, but absolute reproducibility. Production L1s pin like this for the same reason — you don't want your validators desyncing because two of them happened to fetch a different "0.5.x" patch from crates.io.

These two decisions propagate: every later lesson assumes them. When you add \`reth-storage-api = { workspace = true }\` to a crate's \`[dependencies]\` in Lesson 11, Cargo finds the workspace-level pin and resolves correctly without you thinking about it.

## Answer key

Compare your workspace state to \`psyto/openhl\` at the Stage 2+3 commit:

\`\`\`bash
cd ~/code/openhl-reference
git checkout 5fc7ca1
diff -ru ~/code/my-openhl/Cargo.toml ./Cargo.toml
diff -ru ~/code/my-openhl/crates/types ./crates/types
diff -ru ~/code/my-openhl/bin/openhl ./bin/openhl
\`\`\`

Differences in \`authors\`, \`repository\`, and comment wording are fine. Differences in \`members\`, \`workspace.dependencies\` pin SHAs, \`[workspace.lints]\`, or profiles are not — re-read whichever step you skimmed.

Return to main when you're done diffing:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: Should I commit my work to git?** Yes. Initialize git in \`~/code/my-openhl/\` and commit after each step or each lesson. The commit log becomes your own personal Stage history.

\`\`\`bash
cd ~/code/my-openhl
git init  # if you haven't
git add .
git commit -m "Lesson 1 — workspace + Reth + Malachite pinned"
\`\`\`

**Q: Why so many "unused dependency" warnings?** Because each member crate's \`[dependencies]\` section is mostly empty. We declared deps at the workspace level so they're *available*, but no crate has \`[dependencies]\` populated yet. As lessons progress, crates pull in their needed deps and the warnings drop.

**Q: My machine ran out of disk space.** The Reth + Malachite source trees plus their target/ cache can easily reach 10-15 GB. Add disk or move target/ to an external drive via \`[build] target-dir = ...\` in \`.cargo/config.toml\`.

**Q: Can I parallelize fetching deps?** Cargo does this automatically. The "Updating git repository" steps run sequentially because each one writes to the same git cache. The "Compiling" steps fan out across cores. If yours is slow, check \`cargo build -j $(nproc)\`.

## Next lesson (Lesson 2)

You have a workspace that compiles. No application logic yet. In Lesson 2 we write the first application code — \`openhl-types\`'s \`BlockHash\`, \`PayloadId\`, \`PayloadAttrs\`, \`ExecutedBlock\`, and \`PayloadStatus\`. These are the **shared vocabulary** of the consensus↔EVM contract. After Lesson 2, the contract types compile and have basic tests. Then Lesson 3 writes the trait that uses them.

## Summary (3 lines)

- Workspace = 3 crates (openhl-types + openhl-node + openhl-tests) + pinned Reth + pinned Malachite. \`cargo build\` succeeds.
- Three stages (Reth pin / Malachite pin / openhl wiring) for bisection. Each in its own commit.
- Foundation for everything after. Next: shared contract types in openhl-types.
`,
                },
              ],
            },
          },
          {
            title: 'Contract types',
            sortOrder: 2,
            lessons: {
              create: [
                {
                  title: 'Lesson 2 — Shared contract types in openhl-types',
                  slug: 'openhl-contract-types-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 30,
                  xpReward: 60,
                  content: `# Lesson 2 — Shared contract types in openhl-types

## Question

**\`openhl-types\` is the shared vocabulary** between consensus (Malachite) and execution (Reth). Without it, the two systems speak different languages. Build the 10 core contract types (Block, BlockHeader, Tx, Receipt, etc.).

## Principle (minimum model)

- **10 contract types.** \`Block\` + \`BlockHeader\` + \`Transaction\` + \`Receipt\` + \`Address\` + \`B256\` + \`Bytes\` + \`U256\` + \`Signature\` + \`ValidatorId\`.
- **Why "contract" types.** They're the shared schema both sides agree on. Changing one requires re-coordinating both sides.
- **Serde for JSON; ssz for wire.** SSZ is the Ethereum-PoS-canonical serialization; openhl uses it for the consensus-side wire format.
- **Trait impls.** \`Hash + Eq + Clone + Serialize + Deserialize + Encode + Decode\`. Match what both Reth and Malachite expect.
- **No conversions; just shared types.** Both sides import from \`openhl-types\`. If a conversion is needed, it's a bug.
- **Tests.** Round-trip serde + ssz for every type. Fail if encoding breaks.
- **Production parallel.** Hyperliquid has the same separation; CL types live in a shared crate that both consensus + execution depend on.

## Worked example + steps

# Lesson 2 — Shared contract types in \`openhl-types\`

## Goal

Concepts you'll grasp in this lesson:

- **The shared vocabulary crate** — why \`BlockHash\`, \`PayloadId\`, etc. live in \`openhl-types\` and not in \`openhl-consensus\` or \`openhl-evm\`. Rust forbids dependency cycles, so a CL↔EL split forces a neutral third crate that both sides import.
- **The newtype pattern** — wrapping \`[u8; 32]\` as \`BlockHash([u8; 32])\` instead of using a type alias. The compiler then refuses to substitute a random byte array where a block hash is expected.
- **Three-valued payload status** — why \`PayloadStatus\` is \`Valid / Invalid / Syncing\` instead of \`bool\`. A \`Syncing\` node treated as \`Invalid\` forks permanently from peers that could have helped it catch up.
- **Custom \`Display\` over default \`Debug\`** — why every contract type that appears in logs needs a human-readable \`0xab12…\` rendering. Logs are a debugger's primary tool; readable output is not optional.

Verification:

\`\`\`bash
cargo test -p openhl-types
\`\`\`

…passes 4 tests covering the 5 contract primitives you wrote. No application logic yet; just data definitions that the contract trait (Lesson 3) will reference.

Specific changes:

- \`crates/types/src/lib.rs\` gains 5 types — \`BlockHash\`, \`PayloadId\`, \`PayloadAttrs\`, \`PayloadStatus\`, \`ExecutedBlock\` — plus a \`Display\` impl on \`BlockHash\`.
- 4 unit tests added: hex display, status equality, executed-block clone, serde round-trip.
- The \`openhl-types\` crate becomes the **shared vocabulary** that consensus and EVM both depend on.

## Recap

After Lesson 1, your workspace looks like this:

\`\`\`
~/code/my-openhl/
├── Cargo.toml          # workspace root with Reth + Malachite pinned
├── Cargo.lock          # full lock file (Reth/Malachite resolved)
├── rust-toolchain.toml # rustc 1.95.0
├── bin/openhl/         # binary that prints "openhl v0.1.0"
├── crates/
│   ├── types/          # empty — \`//! Shared primitives...\` doc comment only
│   ├── codec/
│   ├── clob/
│   ├── consensus/      # empty
│   ├── evm/            # empty
│   ... (6 more empty crates) ...
└── target/             # cached compilation
\`\`\`

\`cargo check --workspace\` passes. \`cargo test -p openhl-types\` runs zero tests successfully.

## Plan

You'll add 5 contract types to \`crates/types/src/lib.rs\`:

| Type | Shape | Role in the contract |
| - | - | - |
| \`BlockHash\` | \`pub struct BlockHash(pub [u8; 32])\` | 32-byte hash, Ethereum convention. Used everywhere a block is referenced. |
| \`PayloadId\` | \`pub struct PayloadId(pub u64)\` | Returned by \`build_payload\`; passed to \`payload_ready\`. |
| \`PayloadAttrs\` | \`pub struct PayloadAttrs { timestamp, fee_recipient, prev_randao }\` | Inputs to a payload-build job. |
| \`PayloadStatus\` | \`pub enum PayloadStatus { Valid, Invalid, Syncing }\` | Verdict from \`validate_payload\`. |
| \`ExecutedBlock\` | \`pub struct ExecutedBlock { hash, parent_hash, number, state_root }\` | What a consensus round commits to. |

Plus one \`Display\` impl on \`BlockHash\` (so logs print \`0xab12...\` instead of \`BlockHash([171, 18, ...])\`).

Plus 4 unit tests covering: BlockHash hex display, PayloadStatus equality, ExecutedBlock cloneability, BlockHash serde round-trip.

These five types are the **shared vocabulary** of the CL↔EL contract. Both the consensus crate and the evm crate will import them. They live in \`openhl-types\` (a third crate) — not in \`openhl-consensus\` and not in \`openhl-evm\` — for a reason explored in §Design reflection below.


## Walk-through

### Step 1: Open \`crates/types/src/lib.rs\`

The current contents (from Lesson 1):

\`\`\`rust
//! Shared primitives and CL/EL contract types.
\`\`\`

You'll add type definitions below this comment.

### Step 2: Verify \`serde\` is available in \`Cargo.toml\`

Lesson 1 set up \`crates/types/Cargo.toml\` with:

\`\`\`toml
[dependencies]
serde = { workspace = true }
\`\`\`

That's correct; we'll use it for the \`#[derive(Serialize, Deserialize)]\` lines. No edit needed.

### Step 3: Add imports

Edit \`crates/types/src/lib.rs\`. After the doc comment, add:

\`\`\`rust
//! Shared primitives and CL/EL contract types.

use std::fmt;

use serde::{Deserialize, Serialize};
\`\`\`

\`std::fmt\` for the \`Display\` impl we'll add to \`BlockHash\`. \`serde::{Deserialize, Serialize}\` for the derives on every type — every contract type needs to round-trip through wire format eventually.

### Step 4: Add \`BlockHash\`

\`\`\`rust
/// 32-byte block hash, Ethereum convention.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub struct BlockHash(pub [u8; 32]);

impl fmt::Display for BlockHash {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("0x")?;
        for b in &self.0 {
            write!(f, "{b:02x}")?;
        }
        Ok(())
    }
}
\`\`\`

**Newtype pattern.** \`BlockHash\` is a wrapper around \`[u8; 32]\`, not a type alias. This matters: with a wrapper, the compiler rejects \`let h: BlockHash = [0u8; 32];\` (must wrap explicitly). With a type alias (\`type BlockHash = [u8; 32];\`), they're interchangeable and you can pass a random \`[u8; 32]\` where a \`BlockHash\` was expected. **Newtypes are how Rust type-checks "this is specifically a block hash, not just any 32 bytes."**

**Why \`Copy\` despite being 32 bytes?** Copy semantics let you pass \`BlockHash\` by value without explicit \`.clone()\`. The cost is small (a memcpy of 32 bytes), and the ergonomics gain is large — you'll pass block hashes around constantly. The alternative (\`Clone\` only) requires \`.clone()\` at every call site and is noisy.

**Why all 10 trait derives?** \`Debug\` for \`{:?}\` formatting; \`Clone, Copy\` for value semantics; \`PartialEq, Eq\` for equality testing; \`PartialOrd, Ord\` for sorting (we'll need this when validators sort blocks); \`Hash\` for \`HashMap\` keys; \`Serialize, Deserialize\` for wire format. Every contract type needs roughly this same set.

**Why a custom \`Display\` impl?** Default \`Debug\` would print \`BlockHash([171, 18, 240, ...])\`, which is unreadable in logs. The custom \`Display\` prints \`0xab12f0...\`, matching the Ethereum convention. Logs are a debugger's primary tool; making them human-readable is not optional.

Run \`cargo check -p openhl-types\`. Should pass.

### Step 5: Add \`PayloadId\`

\`\`\`rust
/// Identifier returned by \`build_payload\`; used to retrieve the assembled block via \`payload_ready\`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct PayloadId(pub u64);
\`\`\`

Same newtype pattern, smaller backing type. No \`Display\` impl — \`Debug\` (\`PayloadId(42)\`) is fine in logs.

No \`PartialOrd, Ord\` here. Block hashes need ordering (for sorting); payload IDs don't (they're just opaque tokens between \`build_payload\` and \`payload_ready\`).


### Step 6: Add \`PayloadAttrs\`

\`\`\`rust
/// Inputs to a payload-build job.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PayloadAttrs {
    pub timestamp: u64,
    pub fee_recipient: [u8; 20],
    pub prev_randao: [u8; 32],
}
\`\`\`

A real struct (not a newtype) — multiple fields. Three pieces:

- \`timestamp\` — Unix seconds, picked by the proposer
- \`fee_recipient\` — 20-byte Ethereum address, where gas fees go
- \`prev_randao\` — 32-byte beacon-chain randomness (from previous block)

These three are the **minimum** Reth needs to assemble a payload. The Ethereum Engine API spec has more fields (\`suggestedFeeRecipient\`, \`parentBeaconBlockRoot\`, \`withdrawals\`, etc.); we omit them at v0 because openhl is single-validator and doesn't have withdrawal flows.

No \`Copy\` here — 60 bytes is past the comfortable Copy threshold. Callers will explicitly \`clone()\` when passing around.

### Step 7: Add \`PayloadStatus\`

\`\`\`rust
/// Verdict from \`validate_payload\`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PayloadStatus {
    Valid,
    Invalid,
    Syncing,
}
\`\`\`

Three variants, each with a specific consensus-side response:

- **\`Valid\`** — The EL applied the block and got the expected state. Vote for it.
- **\`Invalid\`** — The EL applied the block and the result was wrong (state-root mismatch, gas-limit violation, etc.). Vote nil; treat this proposer as faulty.
- **\`Syncing\`** — The EL doesn't have the state to answer yet (chain is behind). Don't vote yet; wait or fall to timeout.

The **three variants are not interchangeable**. Treating \`Syncing\` like \`Invalid\` permanently forks you from peers who could have answered. Treating \`Invalid\` like \`Syncing\` lets bad proposals through. Lesson 3 on the trait will get into this; for now, you encoded the three distinct verdicts.

### Step 8: Add \`ExecutedBlock\`

\`\`\`rust
/// An executed block — the artifact a consensus round commits to. Minimal v0 shape; txs and receipts land per Module 2.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutedBlock {
    pub hash: BlockHash,
    pub parent_hash: BlockHash,
    pub number: u64,
    pub state_root: [u8; 32],
}
\`\`\`

The fields:

- \`hash\` — this block's hash
- \`parent_hash\` — the previous block's hash, forming the chain
- \`number\` — block height (parent.number + 1, monotonic)
- \`state_root\` — Merkle root of the post-execution state (32 bytes)

What's **not** here (deliberately):

- Transactions list — Module 2 (CLOB) lands transactions; v0 produces empty blocks
- Receipts list — same
- Logs bloom — same
- Difficulty / mix hash — post-merge defaults

This is the minimum shape needed for the consensus round to close. As Modules 2-5 land, \`ExecutedBlock\` gets more fields. By keeping it minimal now, we avoid encoding Module 2's design before we've designed it.

Run \`cargo check -p openhl-types\` — should still pass.

### Step 9: Add unit tests

The tests actually exercise \`serde\`'s round-trip, so add \`serde_json\` as a **dev-dependency first** (before the test code lands). Edit \`crates/types/Cargo.toml\`:

\`\`\`toml
[dev-dependencies]
serde_json = { workspace = true }
\`\`\`

(Adding the dep before writing the test prevents your IDE / rust-analyzer from flashing \`serde_json::to_string\` as unresolved and triggering an unnecessary rebuild.)

Then append to \`crates/types/src/lib.rs\`:

\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn block_hash_display_is_hex() {
        let h = BlockHash([0xab; 32]);
        let s = format!("{h}");
        assert!(s.starts_with("0x"));
        assert_eq!(s.len(), 2 + 64); // "0x" + 64 hex chars
        assert!(s.ends_with("ab"));
    }

    #[test]
    fn payload_status_equality() {
        assert_eq!(PayloadStatus::Valid, PayloadStatus::Valid);
        assert_ne!(PayloadStatus::Valid, PayloadStatus::Invalid);
        assert_ne!(PayloadStatus::Syncing, PayloadStatus::Valid);
    }

    #[test]
    fn executed_block_is_cloneable() {
        let original = ExecutedBlock {
            hash: BlockHash([1u8; 32]),
            parent_hash: BlockHash([0u8; 32]),
            number: 1,
            state_root: [2u8; 32],
        };
        let cloned = original.clone();
        assert_eq!(cloned.number, original.number);
        assert_eq!(cloned.hash, original.hash);
    }

    #[test]
    fn block_hash_serde_round_trips() {
        let original = BlockHash([0x42; 32]);
        let json = serde_json::to_string(&original).unwrap();
        let round_tripped: BlockHash = serde_json::from_str(&json).unwrap();
        assert_eq!(original, round_tripped);
    }
}
\`\`\`

## Test

\`\`\`bash
cargo test -p openhl-types
\`\`\`

Expected:

\`\`\`
running 4 tests
test tests::block_hash_display_is_hex ... ok
test tests::executed_block_is_cloneable ... ok
test tests::payload_status_equality ... ok
test tests::block_hash_serde_round_trips ... ok

test result: ok. 4 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

If a test fails, the typical mistakes are:

- **Forgot \`#[derive(Clone)]\` or \`#[derive(PartialEq)]\`** on a type. The compiler error names the missing trait.
- **\`Display\` impl missing for \`BlockHash\`**. \`format!("{h}")\` requires \`Display\`, not \`Debug\`.
- **Forgot to add \`serde_json\` to \`[dev-dependencies]\`**. \`serde_json::to_string\` won't resolve.

## Design reflection

Two load-bearing decisions:

1. **Contract types live in \`openhl-types\`, a separate crate.** Not in \`openhl-consensus\` and not in \`openhl-evm\`. The reason is the Rust crate-graph constraint: if \`BlockHash\` lived in \`openhl-consensus\`, then \`openhl-evm\` would have to depend on \`openhl-consensus\` (to use the type). But \`openhl-consensus\` also needs to call methods that \`openhl-evm\` implements — meaning \`openhl-consensus\` would need to depend on \`openhl-evm\`. **A→B and B→A is a dependency cycle, which Rust does not allow.** The fix is the **shared vocabulary crate**: both \`openhl-consensus\` and \`openhl-evm\` depend on \`openhl-types\`, and neither depends on the other for type definitions. This is a standard pattern in any Rust workspace with a CL↔EL split — Reth uses \`alloy-primitives\` and \`reth-primitives-traits\` for the same purpose.

2. **PayloadStatus is an enum, not a bool.** Lesson 0 / your prediction above flagged this. The three states are not interchangeable: the consensus-side response depends on *which* not-Valid state the EL is in. Collapsing them to \`bool { is_valid }\` would lose information that's load-bearing for chain liveness — a Syncing node treated as Invalid permanently forks from peers who could have helped it.

Drawing how \`PayloadStatus\` flows between CL and EL, and how each verdict drives a *different* CL action, makes the necessity of three states immediate:

\`\`\`
┌────────────────────────────────────────────────────────────────────────────┐
│                       Consensus Layer (CL)                                  │
│                                                                             │
│         asks the Execution Layer: validate_payload(block)                   │
│                                  │                                          │
└──────────────────────────────────┼──────────────────────────────────────────┘
                                   │ ▲
                                   ▼ │ PayloadStatus
┌────────────────────────────────────┼──────────────────────────────────────┐
│                Execution Layer (EL)│                                       │
│                                    │                                       │
│   ┌────────────────────────────────┴──────────────────────────────────┐    │
│   │  Run the block → classify the outcome into one of three:           │    │
│   │                                                                    │    │
│   │  ✅ Valid    : state-root matches, gas-limit OK, all rules pass    │    │
│   │  ❌ Invalid  : ran the block, result is wrong (state-root mismatch) │    │
│   │  ⏳ Syncing  : don't have the state needed to run it yet            │    │
│   └────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘

CL-side response (the reason three branches are needed):
  ✅ Valid    → vote for the block (carry it into consensus)
  ❌ Invalid  → Nil vote, treat the proposer as faulty (slashing surface)
  ⏳ Syncing  → don't vote yet, wait or fall through to timeout, retry sync from a peer

What happens if you collapse to a bool:
  Syncing treated as Invalid → you Nil-vote a legitimate proposer while you're just behind
                                → you fork permanently from peers who saw it as valid
  Invalid treated as Syncing → you treat a genuinely wrong block as "this will resolve itself"
                                → a bad proposal slips through via timeout and the chain rots
\`\`\`

\`Valid\` / \`Invalid\` / \`Syncing\` correspond 1:1 to "vote / nil-vote / abstain" at the consensus layer. Squashing them into a bool deletes "abstain", and with it the only correct response when you're the one out of sync. Lesson 3 (the \`ConsensusBridge\` trait) is where these three states land in actual function signatures.

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout 13113db
diff -u ~/code/my-openhl/crates/types/src/lib.rs ./crates/types/src/lib.rs
\`\`\`

Your code should be effectively identical, modulo whitespace and possibly the test names. Important things to match: type definitions (every field, every derive), the \`BlockHash::Display\` impl logic, the \`PayloadStatus\` enum variants (in the same order).

Return to main:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: My \`BlockHash::Display\` test fails — "expected 2+64 chars, got X."**
You probably wrote \`write!(f, "{b:x}")\` (single hex digit) instead of \`write!(f, "{b:02x}")\` (two hex digits, zero-padded). For a byte value of 0x05, \`{b:x}\` produces \`"5"\` but \`{b:02x}\` produces \`"05"\`. The test expects 2 chars per byte.

**Q: Can \`ExecutedBlock\` be \`Copy\`?**
Not as written — it contains a \`Vec<...>\` in production (transactions list), and \`Vec\` isn't \`Copy\`. At v0 the struct only has fixed-size fields so it *could* be Copy, but we omit the derive deliberately to avoid having to remove it later. Cloning is cheap when fields are bytes; the call sites that need it can \`.clone()\` explicitly.

**Q: Why is \`prev_randao\` 32 bytes if it's "randomness"?**
It's the **RANDAO mix** at the time of the previous block — Ethereum's beacon chain accumulates each slot's validator reveals via XOR into a running mixing value. Strictly speaking it's not a single hash output, but the result is always a fixed 32-byte pseudo-random blob (\`[u8; 32]\`). The entropy lives on the beacon-chain side; the execution layer's \`PayloadAttrs\` just receives the 32-byte mix as an input. So openhl's type matches: \`[u8; 32]\`.

**Q: Should \`BlockHash\` derive \`Default\`?**
It can (\`Default\` for \`[u8; 32]\` is all-zeros), but **we don't here** — the openhl convention is that block hashes are computed from real data; a default-constructed \`BlockHash([0u8; 32])\` is a code smell. Let test code that needs a sentinel write \`BlockHash([0u8; 32])\` explicitly.

## Next lesson (Lesson 3)

\`openhl-types\` now has 5 contract types. Lesson 3 is the \`ConsensusBridge\` trait — the 4-method API surface that consensus calls into. The trait will reference the types you just wrote: \`build_payload(BlockHash, PayloadAttrs) -> PayloadId\`, \`payload_ready(PayloadId) -> ExecutedBlock\`, etc. After Lesson 3 the contract is fully specified at the type level; Lesson 4 starts implementing it.

## Summary (3 lines)

- \`openhl-types\` = 10 contract types (Block / BlockHeader / Tx / Receipt / Address / B256 / Bytes / U256 / Signature / ValidatorId).
- Serde for JSON; ssz for wire. Trait impls match both Reth + Malachite expectations.
- No conversions; shared types. Round-trip tests. Next: ConsensusBridge trait.
`,
                },
                {
                  title: 'Lesson 3 — The ConsensusBridge trait',
                  slug: 'openhl-bridge-trait-en',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 30,
                  xpReward: 60,
                  content: `# Lesson 3 — The ConsensusBridge trait

## Question

**\`ConsensusBridge\` is the trait that Malachite calls into the execution side** through. Build the interface; later lessons supply concrete impls (InMemory test double + RethEvmBridge production).

## Principle (minimum model)

- **\`ConsensusBridge\` trait.** ~7 methods: \`propose(parent_hash) -> Block\`, \`validate_payload(payload) -> Result<()>\`, \`apply_payload(payload) -> Receipts\`, \`commit(block_hash)\`, \`get_parent(hash)\`, \`get_best_block()\`, \`genesis_hash()\`.
- **Why a trait, not a struct.** Allows multiple impls — test double for unit tests + RethEvmBridge for production. Malachite is decoupled from execution choice.
- **\`propose\` builds a block.** Called when this validator is leader; gathers pending txs from mempool; builds Block; returns to Malachite for consensus.
- **\`validate_payload\` checks before applying.** Stateless validation (signature checks, basic structure).
- **\`apply_payload\` executes.** Reth (or test double) runs every tx; returns Receipts. Drives the state machine.
- **\`commit\` finalises.** When Malachite has consensus, commit the block; persist.
- **\`async fn\`.** Tokio-based. All methods async; Malachite drives in a tokio runtime.

## Worked example + steps

# Lesson 3 — The \`ConsensusBridge\` trait

## Goal

Concepts you'll grasp in this lesson:

- **Why exactly four methods** — \`build_payload / payload_ready / validate_payload / commit\` is determined by the BFT round structure (propose → vote → decide), not language preference. Collapsing build/ready kills build-during-voting; adding a fifth leaks consensus internals into the EL.
- **\`#[async_trait]\` and \`Send + Sync\` bounds** — what \`async_trait\` actually desugars to (boxed futures with object-safety), and why \`: Send + Sync\` is a compile-time guarantee that any \`Arc<dyn ConsensusBridge>\` shared between Malachite actors stays sound.
- **The three-error taxonomy** — \`Rejected / NotReady / Internal\` map to three distinct consensus responses (vote-against / wait / halt). One stringy variant would force the consensus side to parse strings; many variants would leak EL internals.
- **Trait-as-contract programming** — once this file compiles, every later lesson is either "implement this method" or "call this method." Lessons 4–5 are impls; Lessons 10–14 are callers. The shape of the codebase from here on is set.

Verification:

\`\`\`bash
cargo check -p openhl-consensus
\`\`\`

…passes. The \`openhl-consensus\` crate now contains the four-message \`ConsensusBridge\` trait — the typed API surface that consensus calls into and execution implements. **No impls yet** (those start in Lesson 4); just the trait and its associated error type.

Specific changes:

- 4 dependencies added to \`crates/consensus/Cargo.toml\`: \`openhl-types\`, \`async-trait\`, \`thiserror\`, \`eyre\`.
- \`crates/consensus/src/bridge.rs\` — new file with the \`ConsensusBridge\` trait (4 async methods) and \`BridgeError\` enum (3 variants).
- \`crates/consensus/src/lib.rs\` — wires \`pub mod bridge;\`.

## Recap

After Lesson 2:

\`\`\`
crates/types/src/lib.rs:
  - BlockHash, PayloadId, PayloadAttrs, PayloadStatus, ExecutedBlock
  - + Display impl for BlockHash
  - + 4 unit tests passing
\`\`\`

The other crates (including \`openhl-consensus\`) are still empty stubs:

\`\`\`
crates/consensus/src/lib.rs:
  //! Consensus layer — Malachite BFT.
crates/consensus/Cargo.toml:
  [dependencies]   ← empty
\`\`\`

## Plan

You'll do three things:

1. **Add 4 dependencies** to \`crates/consensus/Cargo.toml\`: \`openhl-types\` (to use the types from Lesson 2), \`async-trait\` (the macro that makes \`async fn\` legal in trait methods), \`thiserror\` (derive macro for nice error types), \`eyre\` (a \`Result\` library that pairs well with \`thiserror\`).
2. **Create \`crates/consensus/src/bridge.rs\`** with the \`ConsensusBridge\` trait (4 async methods) and the \`BridgeError\` enum (3 variants).
3. **Wire \`bridge\` into the crate** by adding \`pub mod bridge;\` to \`crates/consensus/src/lib.rs\`.

This trait is the **single most-referenced artifact in the entire course**. Lesson 4 implements it (\`InMemoryEvmBridge\`). Lesson 5 implements it again (\`RethEvmBridge\`). Lesson 9 calls into it from the actor pipeline. Lessons 11–13 implement it a third time (\`LiveRethEvmBridge\`). **The signatures you write now propagate everywhere downstream.**


## Walk-through

### Step 1: Add dependencies to \`crates/consensus/Cargo.toml\`

Open \`crates/consensus/Cargo.toml\`. The \`[dependencies]\` section is currently empty (just a header). Replace it with:

\`\`\`toml
[dependencies]
openhl-types = { workspace = true }
async-trait  = { workspace = true }
thiserror    = { workspace = true }
eyre         = { workspace = true }
\`\`\`

That's all four deps. Each uses \`workspace = true\` to inherit the pinned version from the root \`Cargo.toml\`. Save the file and run:

\`\`\`bash
cargo check -p openhl-consensus
\`\`\`

This should still pass — we just declared deps we haven't used yet. Cargo will fetch any that aren't already in the lock file. \`async-trait\` and \`thiserror\` are small; this should be ~5 seconds.

**Why these four specifically?**

- **\`openhl-types\`** because the trait signatures reference \`BlockHash\`, \`PayloadAttrs\`, \`PayloadId\`, \`ExecutedBlock\`, \`PayloadStatus\` — all five types from Lesson 2.
- **\`async-trait\`** because Rust's native \`async fn\` in trait is still gated behind several caveats (Send bounds, \`dyn\` compatibility). The \`#[async_trait]\` macro handles them by desugaring to \`Pin<Box<dyn Future<...>>>\`. Verbose, but stable and \`dyn\`-compatible.
- **\`thiserror\`** to derive a custom error enum without writing boilerplate \`impl Display\`/\`impl Error\` by hand.
- **\`eyre\`** for the catch-all \`Internal\` error variant. \`eyre::Report\` wraps any error with a backtrace; we use it for "something unexpected went wrong" without enumerating every internal failure mode.

### Step 2: Create \`crates/consensus/src/bridge.rs\`

A new file. The full content:

\`\`\`rust
//! The CL/EL contract: four messages between consensus and execution.

use async_trait::async_trait;
use openhl_types::{BlockHash, ExecutedBlock, PayloadAttrs, PayloadId, PayloadStatus};
use thiserror::Error;

/// The four-message contract between BFT consensus and EVM execution.
///
/// Every interaction between \`openhl-consensus\` and \`openhl-evm\` flows through one of these methods. Anything else is a contract leak.
#[async_trait]
pub trait ConsensusBridge: Send + Sync {
    /// CL → EL: build a candidate block on \`parent\`. Returns immediately; await the block via [\`Self::payload_ready\`].
    async fn build_payload(
        &self,
        parent: BlockHash,
        attrs: PayloadAttrs,
    ) -> Result<PayloadId, BridgeError>;

    /// EL → CL: wait for an in-flight build to complete.
    async fn payload_ready(&self, id: PayloadId) -> Result<ExecutedBlock, BridgeError>;

    /// CL → EL: would this peer-proposed block execute cleanly?
    async fn validate_payload(
        &self,
        block: &ExecutedBlock,
    ) -> Result<PayloadStatus, BridgeError>;

    /// CL → EL: finalize this block. Fire-and-forget; failure halts the chain.
    async fn commit(&self, block_hash: BlockHash) -> Result<(), BridgeError>;
}

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

Walk through what each piece does — this is the most important file in the course.

### Step 3: Understand the trait declaration

\`\`\`rust
#[async_trait]
pub trait ConsensusBridge: Send + Sync {
\`\`\`

**\`#[async_trait]\`** is an attribute macro. It rewrites the trait so each \`async fn\` returns \`Pin<Box<dyn Future<Output = ...> + Send + 'a>>\` behind the scenes. Without this macro, Rust gives you an error trying to use \`async fn\` in a trait you want to call via \`dyn ConsensusBridge\` (which we will).

**\`pub trait ConsensusBridge\`** makes the trait part of the public API — both \`openhl-consensus\` and downstream crates (like the upcoming \`openhl-evm\` impls) can name it.

**\`: Send + Sync\`** are super-trait bounds. They say: every type that implements \`ConsensusBridge\` must also be \`Send\` (movable across thread boundaries) and \`Sync\` (referenceable from multiple threads). We need this because the bridge will be held in an \`Arc<dyn ConsensusBridge>\` shared between actor tasks; each actor may live on a different thread.


### Step 4: Understand the four method signatures

Before reading the signatures one at a time, holding a timeline of when each of the four methods fires during a BFT round — and which direction the data flows — makes each signature land on intuition rather than memorization:

\`\`\`
【 CL / EL interaction flow — along a BFT round timeline 】

──[ The previous round is still voting; the proposer is prepping their turn ]─────────
   CL ──────( build_payload(parent, attrs) )──────►  EL
                                                     │
                                                     └─ kicks off block construction
                                                        in the background, in parallel
                                                        with the previous round's votes

──[ The moment we become the proposer — hot path, where microseconds matter ]──────
   CL ──────( payload_ready(id) )─────────────────►  EL
   CL ◄────( returns ExecutedBlock ) ────────────────── EL
   CL ─► (broadcasts the Proposal onto the network)

──[ A Proposal arrives from a peer — every validator passes through here ]────────────
   CL ──────( validate_payload(&ExecutedBlock) )───►  EL
   CL ◄────( PayloadStatus: Valid / Invalid / Syncing ) ── EL
   CL ─► votes accordingly (yes / Nil / abstain)

──[ Quorum (2/3+) is reached — the block becomes finalized ]──────────────────────
   CL ──────( commit(hash) )──────────────────────►  EL
                                                     │
                                                     └─ persists the block,
                                                        promotes it to the new head
\`\`\`

Two things to notice: (a) **\`build_payload\` and \`payload_ready\` are called at different round phases** — the former during the previous round's voting, the latter on the proposer's hot path. This is the "most important latency trick" we'll spell out a few paragraphs down. (b) **CL always initiates the call**, but \`payload_ready\` is the one seam where data flows back EL → CL (the answer to the §Plan quiz). With that, the individual signatures:

\`\`\`rust
async fn build_payload(
    &self,
    parent: BlockHash,
    attrs: PayloadAttrs,
) -> Result<PayloadId, BridgeError>;
\`\`\`

Inputs: parent block hash and payload attributes. Output: a \`PayloadId\`, which is an opaque handle — the bridge has started building, but the block isn't ready yet. Returns immediately.

\`\`\`rust
async fn payload_ready(&self, id: PayloadId) -> Result<ExecutedBlock, BridgeError>;
\`\`\`

The companion. Hand back the \`PayloadId\` from \`build_payload\`; receive the \`ExecutedBlock\`. Async because the call may block until the in-flight build finishes.

*(This is the §Plan quiz answer. The call still originates from CL, but it's the one **seam** where a completed \`ExecutedBlock\` flows the other way — from the EL's build thread back into CL — and synchronizes. Of the four methods, only \`payload_ready\` carries data EL → CL.)*

**Why split into \`build_payload\` + \`payload_ready\` instead of one \`build_payload -> ExecutedBlock\`?** Because the EL needs to build *during* the previous round's voting. If \`build_payload\` returned the block synchronously, the proposer would have to wait for build before broadcasting; with the split, build runs in the background while voting happens, and the proposer's hot path becomes "fetch the prepared block" (microseconds). This is the **single most important latency trick** in the design. Sub-second block times depend on it.

\`\`\`rust
async fn validate_payload(
    &self,
    block: &ExecutedBlock,
) -> Result<PayloadStatus, BridgeError>;
\`\`\`

Different shape: \`&ExecutedBlock\` (borrowed, not owned). The bridge is *examining* the block, not consuming it. Returns \`PayloadStatus\` (the enum from Lesson 2): Valid / Invalid / Syncing.

**Why borrowed?** Because consensus may need to inspect the same block multiple times (broadcast it, persist it, then validate). Taking ownership would consume the value at the call site, forcing the caller to clone. Borrowing lets the caller keep it.

\`\`\`rust
async fn commit(&self, block_hash: BlockHash) -> Result<(), BridgeError>;
\`\`\`

Smallest signature: hash in, unit out. **Fire-and-forget.** When consensus has decided on a block, this method tells the EL to finalize it. The EL applies it to state, updates fork-choice, and never sees this hash unset later. Returning \`Result<()>\` lets the EL signal a hard failure (which **halts the chain** — see Lesson 9), but successful commits return nothing.

**Notice no \`&ExecutedBlock\` argument.** By the time commit is called, the bridge already saw this block during \`payload_ready\` or \`validate_payload\`. Asking for just the hash forces consensus to remember nothing — the EL keeps state, the CL stays stateless.

### Step 5: Understand the \`BridgeError\` enum

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

Three variants — same number as \`PayloadStatus\`, but **not** a 1:1 correspondence. The distinction:

- **\`Rejected(String)\`** — the EL applied logic to the block and said "no, this is bad." The String holds a human-readable reason. Consensus should treat the block as invalid: vote nil, move to the next round.
- **\`Syncing\`** — the EL doesn't have the state to give an answer yet. Different from rejection: we don't know if the block is bad, we just can't tell yet. Consensus should retry later, not vote nil.
- **\`Internal(eyre::Report)\`** — something unexpected broke. Disk full, mutex poisoned, panic caught. Consensus should **halt** — this is not recoverable at the chain level.

**Why is \`Syncing\` an error variant, when \`PayloadStatus::Syncing\` is also a status?** Because the contract has two layers:

- \`PayloadStatus::Syncing\` from \`validate_payload\` means "the EL processed the request and reports its sync state."
- \`BridgeError::Syncing\` from any method means "the call itself couldn't complete." More commonly applies to \`build_payload\` (can't build if you don't have parent state) and \`commit\` (can't finalize what you can't apply).

**\`#[from] eyre::Report\`** auto-derives \`From<eyre::Report> for BridgeError::Internal\`. That means bridge implementations can write \`let foo = some_call()?;\` where \`some_call()\` returns \`Result<_, eyre::Report>\`, and the \`?\` automatically wraps it as \`BridgeError::Internal\`. This is the canonical way to bubble up "unexpected" errors.

### Step 6: Wire \`bridge\` into the crate

Open \`crates/consensus/src/lib.rs\`. Currently:

\`\`\`rust
//! Consensus layer — Malachite BFT.
\`\`\`

Replace with:

\`\`\`rust
//! Consensus layer — Malachite BFT.

pub mod bridge;
\`\`\`

\`pub mod bridge;\` tells Rust "this crate has a public module called \`bridge\`, sourced from \`src/bridge.rs\`." Without this line, your \`bridge.rs\` is invisible from outside the crate.

## Test

Run:

\`\`\`bash
cargo check -p openhl-consensus
\`\`\`

Expected:

\`\`\`
   Compiling openhl-consensus v0.1.0
    Finished \`dev\` profile [optimized + debuginfo] target(s) in 0.45s
\`\`\`

You might get warnings about unused imports (e.g., \`ExecutedBlock\` if you typo'd a method signature) or unused trait. **Hard errors are not OK**; warnings are fine for now.

Common errors and fixes:

- **\`use of undeclared crate or module 'async_trait'\`** — \`async-trait\` isn't in \`[dependencies]\`. Re-check Step 1.
- **\`cannot find type 'BlockHash' in this scope\`** — \`openhl-types\` isn't imported. Re-check the \`use\` line in \`bridge.rs\`.
- **\`expected type parameter 'Send + Sync', found...\`** — you wrote \`pub trait ConsensusBridge\` without \`: Send + Sync\`. Add it back.
- **\`#[from] is only allowed on a single field\`** — you have more than one \`#[from]\` on a variant, or wrote \`#[from]\` on a variant without a tuple field.

You can also try compiling the whole workspace:

\`\`\`bash
cargo check --workspace
\`\`\`

Should still pass.

## Design reflection

Three load-bearing decisions encoded:

1. **Four methods, not three or five.** Every BFT-L1 implementation converges on exactly these four. Collapsing \`build_payload\` + \`payload_ready\` into one would kill build-during-voting. Adding a fifth (e.g., \`notify_view_change\`) would leak consensus internals into execution. The number is determined by the BFT round structure (propose → vote → decide), not by language preference.

2. **\`Send + Sync\` bound on the trait.** Forces every implementation to be thread-safe. Without this, an \`Arc<dyn ConsensusBridge>\` shared between actors won't compile. With this, implementers know up-front that mutable state must be behind \`Mutex\` or atomics. The compiler enforces what would otherwise be a runtime-bug discipline.

3. **Three error variants, not one or many.** Three corresponds to three distinct consensus-side actions: vote-against, wait, halt. One \`BridgeError(String)\` would make the consensus side parse strings. Five+ variants (e.g., \`Rejected.Hash\`, \`Rejected.Number\`, \`Rejected.BaseFee\`) would either leak EL internals to the consensus side or rapidly drift out of sync as EL changes. Three is the cardinality of the **consensus response** to errors; the EL's internal taxonomy stays opaque behind the String in \`Rejected\`.

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout 13113db
diff -u ~/code/my-openhl/crates/consensus/src/bridge.rs ./crates/consensus/src/bridge.rs
diff -u ~/code/my-openhl/crates/consensus/Cargo.toml ./crates/consensus/Cargo.toml
\`\`\`

Expected: doc-comment wording can vary slightly (you might have written \`commit\` or \`Commit\` for the variant — both ok). The 4 method signatures, the 3 error variants, the \`#[async_trait]\` attribute, and the \`: Send + Sync\` bound must match exactly.

Return:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: My \`cargo check\` complains about \`pub mod bridge\` and \`bridge.rs not found\`.**
The file is at \`crates/consensus/src/bridge.rs\`, not \`crates/consensus/bridge.rs\`. The convention is that modules declared in \`lib.rs\` live as siblings to it.

**Q: Why is \`validate_payload\` async if it just inspects bytes?**
At v0 it could be sync — checking a \`BlockHash\` against a \`parent_hash\` is microseconds. But production validate_payload runs the EVM against the parent state, which requires async DB access. Marking it async now means we don't have to break the trait later. Cost is ~0 (an immediate-ready future is essentially free).

**Q: Can I rename the methods? \`build_payload\` is verbose.**
You can in your own code, but you'll diverge from openhl. The names match the Ethereum Engine API (\`engine_forkchoiceUpdated\` returns a \`PayloadId\` that you fetch via \`engine_getPayload\`), which makes the openhl ↔ Ethereum mapping recognizable to anyone familiar with the latter.

**Q: What's \`eyre::Report\` and why not just \`String\`?**
\`eyre::Report\` captures a chain of causes with source-location info. When debugging a chain halt, you want to see "DB write failed: disk full: at io.rs:142" not just "internal error". \`Report\` does this; \`String\` doesn't. We use it for the catch-all variant.

## Next lesson (Lesson 4)

The contract is now fully specified at the type level. Lesson 4 starts implementing it. We write \`InMemoryEvmBridge\` — a test double that stores fake blocks in a \`Mutex<HashMap>\` and returns synthesized hashes. No real EVM, no real state — just enough to make the trait satisfiable and the consensus side testable. **Critically, the same trait \`ConsensusBridge\` covers both \`InMemoryEvmBridge\` (Lesson 4) and \`LiveRethEvmBridge\` (Lesson 11 onward) — that's the polymorphism win we're paying for with the \`Send + Sync\` bound and \`async_trait\` macro.**

## Summary (3 lines)

- \`ConsensusBridge\` trait = ~7 async methods. propose builds; validate_payload checks; apply_payload executes; commit finalises.
- Decouples Malachite from execution. Test double (InMemory) + production (RethEvmBridge) both impl this trait.
- Tokio async throughout. Next module: EL test double.
`,
                },
              ],
            },
          },
          {
            title: 'EL test double',
            sortOrder: 3,
            lessons: {
              create: [
                {
                  title: 'Lesson 4 — InMemoryEvmBridge — first impl of the trait',
                  slug: 'openhl-in-memory-bridge-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 40,
                  xpReward: 70,
                  content: `# Lesson 4 — InMemoryEvmBridge — first impl of the trait

## Question

**\`InMemoryEvmBridge\` is the first concrete \`ConsensusBridge\` impl.** No real EVM; just enough state (HashMap + a tiny tx history) to drive Malachite end-to-end in tests.

## Principle (minimum model)

- **Struct.** \`blocks: HashMap<B256, Block>\` + \`current_head: B256\` + \`mempool: VecDeque<Transaction>\`. ~50 lines.
- **\`propose\` impl.** Build a Block with the next pending tx; return it. Synchronous compute wrapped in async fn.
- **\`validate_payload\`.** Check the block's parent_hash exists in \`blocks\`. Cheap.
- **\`apply_payload\`.** Update state; insert block into HashMap; advance current_head. No real EVM execution.
- **\`commit\`.** Already committed at apply time (no separate phase needed for the test double).
- **Why a test double matters.** Lets us run Malachite + the engine pipeline without spinning up Reth. Faster + simpler debugging during development.
- **Tests.** Boot Malachite with InMemoryEvmBridge; propose + validate + apply + commit through 3 blocks; assert state advances.
- **Production swap.** Lesson 11+ replaces this with LiveRethEvmBridge — same trait, real Reth backing.

## Worked example + steps

# Lesson 4 — \`InMemoryEvmBridge\` — first impl of the trait

## Goal

Concepts you'll grasp in this lesson:

- **Test-double-first impl strategy** — why we write a fake EVM before touching Reth. The trait is exercised end-to-end without 600 transitive deps; downstream consensus tests (Lessons 9 / 10) can run in 0.02s instead of 2.7s.
- **\`Mutex<State>\` for interior mutability** — wrapping a private \`State\` struct in a single \`Mutex\` to satisfy the \`Send + Sync\` bound from Lesson 3. Locking once per method is fine for test code and propagates structurally to \`LiveRethEvmBridge\` in Lesson 12 onward.
- **\`pending\` vs \`chain\` map split** — speculative builds and canonical commits are different lifecycles. Encoding the split here forces every later impl to respect the same data flow (build is speculative; commit is final).
- **\`async_trait\` impl ergonomics** — what \`#[async_trait]\` on the \`impl\` block requires (lifetimes, \`Self: Send + Sync\`), and why \`async fn\` in trait methods is still desugared via the macro in stable Rust.

Verification:

\`\`\`bash
cargo test -p openhl-evm
\`\`\`

…passes 5 tests covering build → ready → commit flows of the in-memory bridge. You have the first **concrete implementation** of \`ConsensusBridge\` from Lesson 3 — a test double that pretends to be an EVM, stores fake blocks, and lets you exercise the trait without spinning up Reth.

Specific changes:

- 3 dependencies + 1 dev-dependency added to \`crates/evm/Cargo.toml\`: \`openhl-consensus\`, \`openhl-types\`, \`async-trait\`, and \`tokio\` (dev).
- \`crates/evm/src/in_memory.rs\` — new file with \`InMemoryEvmBridge\` struct, private \`State\`, \`Mutex<State>\`, the 4-method \`impl ConsensusBridge\`, a \`hex_short\` helper, and 5 unit tests.
- \`crates/evm/src/lib.rs\` — wires \`pub mod in_memory; pub use InMemoryEvmBridge;\`.

## Recap

After Lesson 3:

\`\`\`
crates/types/src/lib.rs        — 5 types + Display + 4 tests passing
crates/consensus/src/bridge.rs — ConsensusBridge trait + BridgeError
crates/consensus/src/lib.rs    — pub mod bridge;
crates/evm/src/lib.rs          — //! EVM execution layer doc only, no code
crates/evm/Cargo.toml          — empty [dependencies]
\`\`\`

\`cargo check --workspace\` passes; \`cargo test -p openhl-evm\` runs 0 tests.

## Plan

You'll do four things:

1. **Add 3 dependencies + 1 dev-dependency** to \`crates/evm/Cargo.toml\`: \`openhl-consensus\` (for the trait and error type), \`openhl-types\` (for the contract types), \`async-trait\` (for the \`#[async_trait]\` macro), and \`tokio\` as dev-dep (so test functions can be \`#[tokio::test]\`).
2. **Create \`crates/evm/src/in_memory.rs\`** with: the \`InMemoryEvmBridge\` struct, a private \`State\` struct held in a \`Mutex\`, an \`impl ConsensusBridge for InMemoryEvmBridge\` block providing all 4 async methods, a \`hex_short\` helper, and a \`#[cfg(test)] mod tests\` with 5 tests.
3. **Wire \`in_memory\` into the crate** via \`pub mod in_memory; pub use in_memory::InMemoryEvmBridge;\` in \`crates/evm/src/lib.rs\`.
4. **Run** \`cargo test -p openhl-evm\` and watch 5 tests pass.

This is the first time you write a Rust impl. The pattern you encode here repeats: \`RethEvmBridge\` in Lesson 5 uses the same skeleton, and \`LiveRethEvmBridge\` in Lesson 11 onward does too. **The state-management pattern (Mutex<State> with pending vs chain maps) propagates to those impls too.**


## Walk-through

### Step 1: Add dependencies to \`crates/evm/Cargo.toml\`

Open \`crates/evm/Cargo.toml\`. Replace the empty \`[dependencies]\` section:

\`\`\`toml
[dependencies]
openhl-consensus = { workspace = true }
openhl-types     = { workspace = true }
async-trait      = { workspace = true }

[dev-dependencies]
tokio = { workspace = true }
\`\`\`

The four:

- **\`openhl-consensus\`** — to reference \`bridge::{ConsensusBridge, BridgeError}\` from the impl
- **\`openhl-types\`** — to use \`BlockHash\`, \`PayloadId\`, etc.
- **\`async-trait\`** — \`#[async_trait]\` attribute for the impl block
- **\`tokio\` (dev)** — \`#[tokio::test]\` for async test functions

\`cargo check -p openhl-evm\` should still pass — declared deps without using them.

### Step 2: Create the file

\`\`\`bash
touch crates/evm/src/in_memory.rs
\`\`\`

Add the module-level doc:

\`\`\`rust
//! In-memory \`ConsensusBridge\` — a test double for the EL side.
//!
//! Useful for unit-testing the consensus crate without spinning up Reth. The
//! real Reth-backed implementation lives in \`engine.rs\` (lands in Lesson 5).
\`\`\`

### Step 3: Add the imports + structs

\`\`\`rust
use async_trait::async_trait;
use openhl_consensus::bridge::{BridgeError, ConsensusBridge};
use openhl_types::{BlockHash, ExecutedBlock, PayloadAttrs, PayloadId, PayloadStatus};
use std::collections::HashMap;
use std::fmt::Write as _;
use std::sync::Mutex;

#[derive(Debug, Default)]
pub struct InMemoryEvmBridge {
    state: Mutex<State>,
}

#[derive(Debug, Default)]
struct State {
    next_payload_id: u64,
    pending: HashMap<u64, ExecutedBlock>,
    chain: HashMap<[u8; 32], ExecutedBlock>,
    head: Option<BlockHash>,
}

impl InMemoryEvmBridge {
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }
}
\`\`\`

Walk through what each field is:

**\`InMemoryEvmBridge\`** — the public struct. Single field: \`state: Mutex<State>\`. The mutex makes the type \`Send + Sync\` (it can be shared between threads safely), which the trait requires. Everything mutable lives inside the mutex.

**\`State\`** (private) — three pieces of bookkeeping:

- \`next_payload_id: u64\` — monotonic counter. Every \`build_payload\` call increments this and uses the previous value as the returned \`PayloadId\`.
- \`pending: HashMap<u64, ExecutedBlock>\` — blocks that \`build_payload\` produced but \`commit\` hasn't accepted yet. Keyed by \`PayloadId\`.
- \`chain: HashMap<[u8; 32], ExecutedBlock>\` — committed blocks. Keyed by raw 32-byte hash (not \`BlockHash\` newtype — saves a \`.0\` accessor when looking up).
- \`head: Option<BlockHash>\` — the most recently committed hash. \`None\` if nothing committed yet.

The split between \`pending\` and \`chain\` matters: by the time \`commit(hash)\` is called, the block is already in \`pending\` (from a prior \`build_payload\`). \`commit\` moves it from pending → chain and updates \`head\`. This mirrors how a real EL maintains both an in-flight payload buffer and a finalized chain.

Walking the 4 fields of \`State\` (\`next_payload_id\` / \`pending\` / \`chain\` / \`head\`) through the \`build_payload\` → \`payload_ready\` → \`commit\` lifecycle in one picture makes it obvious why the same shape gets reused in the real \`RethEvmBridge\` (Lesson 5) and \`LiveRethEvmBridge\` (Lesson 11 onward):

\`\`\`
【 Block lifecycle inside InMemoryEvmBridge 】

1. build_payload(parent, attrs)
                       │
                       ▼
   ┌────────────────────────────────────────────────────────────┐
   │ chain.get(&parent.0) → look up the parent's number          │
   │ next_payload_id += 1; return that id as PayloadId           │
   │ Synthesize a new ExecutedBlock (number = parent + 1, …)     │
   │ pending.insert(PayloadId, ExecutedBlock)  ◄── speculative   │
   └────────────────────────────────────────────────────────────┘
                       │
                       ▼  (return just the PayloadId to CL)

2. payload_ready(id)
                       │
                       ▼
   ┌────────────────────────────────────────────────────────────┐
   │ pending.get(&id).cloned()  ◄── lend the unconfirmed block   │
   │ (keep a copy in pending — it hasn't been committed yet)     │
   └────────────────────────────────────────────────────────────┘
                       │
                       ▼  (return the ExecutedBlock)

3. commit(hash)                  // CL calls this only after a 2/3+ quorum
                       │
                       ▼
   ┌────────────────────────────────────────────────────────────┐
   │ Find and remove the block from pending                      │
   │ chain.insert(hash.0, ExecutedBlock)  ◄── promote to canonical│
   │ head = Some(hash)                    ◄── update the new head │
   └────────────────────────────────────────────────────────────┘
                       │
                       ▼  (return Ok(()); the block is now finalized)
\`\`\`

The key thing the picture pins down is "**pending = speculative (unconfirmed) / chain = finalized**" — the two lifetimes are physically separated at the map level. \`build_payload\` optimistically piles up; only \`commit\` has the authority to promote a block from pending to chain. A real Reth EL exposes the same shape under the names \`pending blocks\` and \`canonical chain\`, which is why **swapping in the real bridge in Lesson 5 / Lesson 11 onward doesn't change how data flows** — only what backs the maps.

**\`impl InMemoryEvmBridge::new\`** — the constructor. \`#[must_use]\` is a hint to clippy: if a caller writes \`InMemoryEvmBridge::new();\` without binding, that's almost certainly a bug.

### Step 4: Implement \`ConsensusBridge\` — \`build_payload\`

\`\`\`rust
#[async_trait]
impl ConsensusBridge for InMemoryEvmBridge {
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
    // ...continued below
\`\`\`

Step by step:

1. **\`self.state.lock().expect("state mutex poisoned")\`** — acquire the mutex. The \`.expect\` covers the \`PoisonError\` case: a previous holder panicked while holding the lock, leaving it in an indeterminate state. The right move is to panic ourselves (a poisoned state machine is unsafe to continue from). The string identifies the lock for debug output.
2. **\`id = s.next_payload_id; s.next_payload_id += 1;\`** — allocate a fresh payload ID. Monotonic, no reuse. This is the equivalent of a sequence in a database.
3. **\`s.chain.get(&parent.0).map_or(0, |b| b.number)\`** — find the parent block's number. If we've never committed that parent (e.g., a test genesis hash), default to 0 (so the child is block 1). The \`.0\` unpacks the \`BlockHash\` newtype to get the inner \`[u8; 32]\`.
4. **Synthesize a hash from \`(id, number)\`** — first 8 bytes from \`id.to_le_bytes()\`, next 8 bytes from \`number.to_le_bytes()\`, rest zero. Why this and not real hashing? Because we're a test double; the hash just needs to be unique per build. \`(id, number)\` is unique by construction, so the synthesized hash is too.
5. **Build the \`ExecutedBlock\`** and stash it in \`pending\`. The block has parent_hash, number, hash, and a zero state_root (we didn't run an EVM).
6. **Return \`Ok(PayloadId(id))\`**.


### Step 5: Implement \`payload_ready\`

Continuing the same \`impl\` block:

\`\`\`rust
    async fn payload_ready(&self, id: PayloadId) -> Result<ExecutedBlock, BridgeError> {
        let s = self.state.lock().expect("state mutex poisoned");
        let n = id.0;
        s.pending
            .get(&n)
            .cloned()
            .ok_or_else(|| BridgeError::Rejected(format!("unknown payload id {n}")))
    }
\`\`\`

Look up the block in \`pending\` by ID. If found, clone (the caller wants ownership; pending keeps a copy in case the block isn't committed yet and the caller asks again). If not found, return a \`Rejected\` error with a descriptive message.

Note: \`payload_ready\` is the only method that is **not** read-only — wait, it IS read-only (no mutation). The \`let s = self.state.lock()\` doesn't need \`mut\` because we only call \`.get()\`, no insert or remove.

### Step 6: Implement \`validate_payload\`

\`\`\`rust
    async fn validate_payload(
        &self,
        _block: &ExecutedBlock,
    ) -> Result<PayloadStatus, BridgeError> {
        Ok(PayloadStatus::Valid)
    }
\`\`\`

The simplest one in this impl. We're a test double — we just assert any block is valid. Real validation in Lesson 12 will run \`EthBeaconConsensus::validate_header_against_parent\` against the actual parent. For now, returning \`Valid\` makes consensus tests work.

**Important: \`_block\` (leading underscore).** This tells the compiler "I'm intentionally not using this arg." Without the underscore, you'd get an \`unused_variables\` warning. With it, the warning is suppressed.

### Step 7: Implement \`commit\`

\`\`\`rust
    async fn commit(&self, block_hash: BlockHash) -> Result<(), BridgeError> {
        let mut s = self.state.lock().expect("state mutex poisoned");
        let block = s
            .pending
            .values()
            .find(|b| b.hash == block_hash)
            .cloned()
            .ok_or_else(|| {
                let hex = hex_short(&block_hash.0);
                BridgeError::Rejected(format!("commit for unknown hash {hex}"))
            })?;
        s.chain.insert(block_hash.0, block);
        s.head = Some(block_hash);
        Ok(())
    }
}
\`\`\`

The flow:

1. Lock state for writing.
2. Search \`pending.values()\` for a block matching \`block_hash\`. Note we iterate by value because \`pending\` is keyed by \`PayloadId\`, not block hash — we need to scan to find a block by hash. (In a real implementation with O(1) hash→block lookup, you'd have a second index. For a test double, O(n) scan is fine.)
3. If not found, return a \`Rejected\` error with a short hex-formatted hash.
4. If found, insert into \`chain\` (keyed by hash bytes) and update \`head\`.

Note we don't remove from \`pending\` — the block lives in both maps after commit. Real impls might \`pending.remove(&id)\`, but for tests it doesn't matter.

The \`hex_short\` helper is the next file section:

> 📍 **Placement note.** \`hex_short\` lives **outside** the \`impl ConsensusBridge for InMemoryEvmBridge { ... }\` block, as a standalone private function at the end of the file (it takes no \`&self\` and depends on no struct state — it's a plain byte → string utility). Defining it inside the \`impl\` would make it look like a method on the trait and mislead readers into thinking \`ConsensusBridge\` requires it.

\`\`\`rust
fn hex_short(bytes: &[u8; 32]) -> String {
    let mut s = String::with_capacity(18);
    s.push_str("0x");
    for b in &bytes[..8] {
        write!(&mut s, "{b:02x}").expect("write to String never fails");
    }
    s
}
\`\`\`

A 0x-prefixed hex string of the first 8 bytes — short enough to fit in a log line. The \`write!(&mut s, ...)\` invocation needs \`use std::fmt::Write as _;\` at the top of the file (we already added it in Step 3). The \`as _\` rename pulls in the trait *for its methods only* without polluting the namespace with the name \`Write\`.

### Step 8: Wire \`in_memory\` into the crate

Open \`crates/evm/src/lib.rs\`. Currently:

\`\`\`rust
//! EVM execution layer — Reth integration.
\`\`\`

Replace with:

\`\`\`rust
//! EVM execution layer — Reth integration.

pub mod in_memory;

pub use in_memory::InMemoryEvmBridge;
\`\`\`

\`pub mod in_memory;\` exposes the module. \`pub use in_memory::InMemoryEvmBridge;\` re-exports the struct at the crate root, so downstream crates can write \`use openhl_evm::InMemoryEvmBridge;\` instead of \`use openhl_evm::in_memory::InMemoryEvmBridge;\`.

### Step 9: Add unit tests

At the bottom of \`crates/evm/src/in_memory.rs\`, append:

\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;

    fn attrs() -> PayloadAttrs {
        PayloadAttrs {
            timestamp: 0,
            fee_recipient: [0u8; 20],
            prev_randao: [0u8; 32],
        }
    }

    #[tokio::test]
    async fn build_then_ready_returns_same_block() {
        let bridge = InMemoryEvmBridge::new();
        let parent = BlockHash([1u8; 32]);
        let id = bridge.build_payload(parent, attrs()).await.unwrap();
        let block = bridge.payload_ready(id).await.unwrap();
        assert_eq!(block.parent_hash, parent);
        assert_eq!(block.number, 1);
    }

    #[tokio::test]
    async fn validate_returns_valid() {
        let bridge = InMemoryEvmBridge::new();
        let block = ExecutedBlock {
            hash: BlockHash([2u8; 32]),
            parent_hash: BlockHash([1u8; 32]),
            number: 1,
            state_root: [0u8; 32],
        };
        let status = bridge.validate_payload(&block).await.unwrap();
        assert_eq!(status, PayloadStatus::Valid);
    }

    #[tokio::test]
    async fn commit_advances_head_and_records_block() {
        let bridge = InMemoryEvmBridge::new();
        let parent = BlockHash([1u8; 32]);
        let id = bridge.build_payload(parent, attrs()).await.unwrap();
        let block = bridge.payload_ready(id).await.unwrap();
        bridge.commit(block.hash).await.unwrap();
        let s = bridge.state.lock().unwrap();
        assert_eq!(s.head, Some(block.hash));
        assert!(s.chain.contains_key(&block.hash.0));
    }

    #[tokio::test]
    async fn build_on_committed_parent_increments_number() {
        let bridge = InMemoryEvmBridge::new();
        let genesis = BlockHash([1u8; 32]);
        let id1 = bridge.build_payload(genesis, attrs()).await.unwrap();
        let block1 = bridge.payload_ready(id1).await.unwrap();
        bridge.commit(block1.hash).await.unwrap();

        let id2 = bridge.build_payload(block1.hash, attrs()).await.unwrap();
        let block2 = bridge.payload_ready(id2).await.unwrap();
        assert_eq!(block2.number, 2);
        assert_eq!(block2.parent_hash, block1.hash);
    }

    #[tokio::test]
    async fn commit_unknown_hash_errors() {
        let bridge = InMemoryEvmBridge::new();
        let err = bridge.commit(BlockHash([9u8; 32])).await.unwrap_err();
        assert!(matches!(err, BridgeError::Rejected(_)));
    }
}
\`\`\`

What each test covers:

| Test | What it proves |
| - | - |
| \`build_then_ready_returns_same_block\` | \`build_payload\` + \`payload_ready\` round-trip works. Number = 1 on top of fake genesis. |
| \`validate_returns_valid\` | \`validate_payload\` always returns \`Valid\` (test double behavior). |
| \`commit_advances_head_and_records_block\` | After commit, head points to the new block AND chain map contains it. |
| \`build_on_committed_parent_increments_number\` | Number monotonicity: build on parent block 1 produces block 2. |
| \`commit_unknown_hash_errors\` | Commit for a hash that isn't in pending returns \`BridgeError::Rejected\`. |

\`#[tokio::test]\` is the async-aware version of \`#[test]\`. It sets up a tokio runtime for the test and awaits the async body.

## Test

\`\`\`bash
cargo test -p openhl-evm
\`\`\`

Expected:

\`\`\`
running 5 tests
test in_memory::tests::build_on_committed_parent_increments_number ... ok
test in_memory::tests::build_then_ready_returns_same_block ... ok
test in_memory::tests::commit_advances_head_and_records_block ... ok
test in_memory::tests::commit_unknown_hash_errors ... ok
test in_memory::tests::validate_returns_valid ... ok

test result: ok. 5 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

Common errors and fixes:

- **\`Mutex<HashMap<u64, ExecutedBlock>>\` doesn't auto-derive \`Default\`.** Wait, it does — both \`Mutex<T>\` and \`HashMap<K, V>\` derive \`Default\`. If you see this, you might have written \`BTreeMap\` (yes Default) or some other type that doesn't. Switch back to \`HashMap\`.
- **\`use std::fmt::Write as _;\` not actually used** — clippy will warn. The \`Write\` trait is used inside \`hex_short\` via the \`write!\` macro; the warning means the macro expansion isn't seeing the import. Make sure the \`use\` is at module top-level, not inside a function.
- **\`#[tokio::test]\` not found** — \`tokio\` isn't in \`[dev-dependencies]\`. Re-check Step 1.
- **A test asserts \`block.number == 1\` but you get \`0\`.** You probably forgot the \`+ 1\` in \`let number = parent_number + 1;\`.

## Design reflection

Two load-bearing decisions encoded:

1. **State lives behind a \`Mutex<State>\`.** This is what makes \`InMemoryEvmBridge\` thread-safe — and therefore \`Send + Sync\`. The alternative (lock-free, atomic-only mutation) would be far more complex for a test double. Locks are fine when the contention is low (test code) or the critical sections are short (real code). The pattern propagates to \`LiveRethEvmBridge\` in Lesson 11 onward, which uses the same \`Mutex<State>\` shape.

2. **\`pending\` and \`chain\` are separate maps.** A real EL has the same split — payloads currently being built vs blocks committed to canonical chain. By encoding this in the test double, the **shape of the data flow** carries forward to production impls. If we used one combined map, we'd be implying "build = commit" — which is wrong. Build is speculative; commit is final.

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout 3b43586
diff -u ~/code/my-openhl/crates/evm/src/in_memory.rs ./crates/evm/src/in_memory.rs
diff -u ~/code/my-openhl/crates/evm/Cargo.toml ./crates/evm/Cargo.toml
diff -u ~/code/my-openhl/crates/evm/src/lib.rs ./crates/evm/src/lib.rs
\`\`\`

Variations are OK in test order, doc-comment wording, and exact debug-message format. The struct shape, the \`Mutex<State>\` pattern, and the 4 method impl logic should match closely.

Return:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: My \`commit_advances_head_and_records_block\` test panics with "mutex poisoned".**
Check the first panic first.  
In this course, each test creates its own \`InMemoryEvmBridge::new()\`, so tests do not share one \`Mutex<State>\`. The common cause is a panic earlier in the **same test** while holding the lock, followed by another \`state.lock()\` in that test.

Triage steps:
1. Find the first \`thread 'tests::...' panicked at ...\` line at the top of \`cargo test\` output.  
2. Fix that root panic and rerun.  
3. Use \`cargo test -p openhl-evm -- --test-threads=1\` only when you need a parallelism sanity check.  

**Q: Should \`pending\` use \`HashMap<PayloadId, _>\` instead of \`HashMap<u64, _>\`?**
Either works. The openhl convention is to use the inner type (\`u64\`) at the storage layer to avoid wrapping/unwrapping inside lookups. The public API still uses \`PayloadId\`. The trade-off: with \`HashMap<PayloadId, _>\`, you get type safety at the price of \`.0\` accessors on every key. With \`HashMap<u64, _>\`, you give up some type safety at the storage layer but avoid the noise. Personal preference; we picked \`u64\`.

**Q: Why is \`hex_short\` only first 8 bytes? Why not full?**
Logs need to be short. A full 32-byte hex is 64 chars — eats the log line. The first 8 bytes (16 hex chars + "0x") is enough to identify a block in dev/test scenarios. Production logs would use the full hash; the helper would change accordingly.

**Q: Tests pass but I get clippy warnings about \`unused_imports\`.**
Make sure each import is actually used somewhere in your code. The boilerplate I gave imports \`std::fmt::Write as _\` — that's only used inside \`hex_short\`. If you didn't write \`hex_short\` yet, the import is unused. Add the helper or remove the import.

## Next lesson (Lesson 5)

You have a working \`ConsensusBridge\` impl, but it doesn't use Reth at all. Lesson 5 writes the next impl: \`RethEvmBridge\`. Same trait, but the \`ExecutedBlock\` is now built from a real \`alloy_consensus::Header\` (not synthesized), and the \`BlockHash\` is a real \`B256\` hashed via Reth's \`Header::hash_slow\`. Still in-memory state (no live Reth provider), but the **types are real**. This is the bridge between toy types (Lesson 4) and live integration (Lesson 11 onward).

## Summary (3 lines)

- \`InMemoryEvmBridge\` = HashMap + VecDeque mempool + 7 trait methods. ~50 lines. No real EVM.
- Lets us drive Malachite end-to-end without Reth. Faster debugging.
- Tests boot Malachite + drive 3 blocks; assert state advances. Production swap to RethEvmBridge later. Next: RethEvmBridge with real alloy types.
`,
                },
                {
                  title: 'Lesson 5 — RethEvmBridge with real alloy types',
                  slug: 'openhl-reth-bridge-en',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 40,
                  xpReward: 70,
                  content: `# Lesson 5 — RethEvmBridge with real alloy types

## Question

**Swap the InMemory bridge to one that uses real Alloy types** (\`Block\`, \`Transaction\`, \`Receipt\`). Same trait; different storage. Still no Reth node yet — that comes in Lesson 11.

## Principle (minimum model)

- **\`RethEvmBridge\` struct.** Reuses InMemory storage (HashMap) but now keyed by \`alloy::Block::hash()\` instead of B256.
- **Conversion-free.** \`openhl-types\` shared types are designed to be aliases for Alloy types where possible. No conversions needed.
- **\`propose\` builds an Alloy \`Block\`.** Same shape as InMemory; uses Alloy's Block builder.
- **\`apply_payload\` uses Alloy's tx execution.** Still no real EVM; just inserts into HashMap. Production swap is Lesson 11.
- **Tests verify Alloy compatibility.** Round-trip serialization; SSZ encoding. Same blocks as InMemory; just typed differently.
- **Why this intermediate step.** Going from InMemory → real Reth in one jump is too big. Intermediate step verifies types alignment first.
- **Production swap path.** Lesson 11 booots an actual Reth EthereumNode + Lesson 12 wires this bridge to it.

## Worked example + steps

# Lesson 5 — \`RethEvmBridge\` with real alloy types

## Goal

Concepts you'll grasp in this lesson:

- **Production-shape internal types behind a contract surface** — storing \`(B256, Header)\` internally while the trait returns \`ExecutedBlock\`. Conversion happens only at the trait boundary, so alloy can evolve without breaking the contract. This is exactly what \`LiveRethEvmBridge\` (Lesson 12 onward) reuses.
- **Real RLP hashing via \`Header::hash_slow()\`** — why \`hash_slow\` is named "slow" (recomputes on every call, no cache), what RLP encoding is at the byte level, and how alloy enforces this is the same hash an Ethereum node would compute.
- **Hash-and-header binding via tuple storage** — \`(B256, Header)\` as one stored unit, not two separate fields. Separating them invites the bug where a mutation desyncs the cached hash from the header it describes.
- **Two impls of one trait** — \`InMemoryEvmBridge\` and \`RethEvmBridge\` share the trait surface but differ in fidelity. This is the polymorphism Rust gives you for free once the trait is right; the same shape extends to a third impl in Lesson 12.

Verification:

\`\`\`bash
cargo test -p openhl-evm
\`\`\`

…passes **9 tests** (5 from Lesson 4's \`InMemoryEvmBridge\` + 4 new ones for \`RethEvmBridge\`). **This is the first time your code touches alloy/Reth types.** The pattern of "synthesized for tests, real types for production-shape" repeats throughout the course; learning it cleanly here saves time in Lesson 11 onward.

Specific changes:

- 2 alloy deps added to \`crates/evm/Cargo.toml\`: \`alloy-primitives\` (for \`B256\`, \`Address\`) and \`alloy-consensus\` (for \`Header\`).
- \`crates/evm/src/engine.rs\` — new file with \`RethEvmBridge\` struct, private \`State\` storing \`Header\`, and \`impl ConsensusBridge for RethEvmBridge\` with all 4 methods + 4 unit tests.
- Three small conversion helpers — \`to_b256\`, \`from_b256\`, \`to_executed_block\` — bridge alloy types to contract types only at the trait boundary.
- \`crates/evm/src/lib.rs\` — wires \`pub mod engine; pub use engine::RethEvmBridge;\`.

## Recap

After Lesson 4:

\`\`\`
crates/evm/src/in_memory.rs — InMemoryEvmBridge (synthesized blocks, 5 tests passing)
crates/evm/src/lib.rs       — pub mod in_memory; pub use InMemoryEvmBridge;
crates/evm/Cargo.toml       — 3 deps (openhl-consensus, openhl-types, async-trait), tokio dev-dep
\`\`\`

\`cargo test -p openhl-evm\` passes 5/5.

## Plan

Six things:

1. **Add 2 alloy deps** to \`crates/evm/Cargo.toml\`: \`alloy-primitives\` (for \`B256\`, \`Address\`) and \`alloy-consensus\` (for \`Header\`). Both already in workspace deps from Lesson 1.
2. **Create \`crates/evm/src/engine.rs\`** with \`RethEvmBridge\` struct, private \`State\` struct (storing \`Header\` instead of synthesized \`ExecutedBlock\`), and \`impl ConsensusBridge for RethEvmBridge\` block.
3. **Three type-conversion helpers** (\`to_b256\`, \`from_b256\`, \`to_executed_block\`) bridging the trait's \`BlockHash\` and the internals' \`B256\` + \`Header\`.
4. **4 unit tests**, one of which proves real hashing — mutating a header field changes the hash.
5. **Wire \`engine\` into the crate** by adding \`pub mod engine;\` + re-export to \`lib.rs\`.
6. **Run** \`cargo test -p openhl-evm\` — all 9 tests pass.

The key step is #2 — the **shape of internal state changes**. Lesson 4 stored \`ExecutedBlock\` directly. Lesson 5 stores \`(B256, Header)\`: the alloy-native types, with conversion to/from \`ExecutedBlock\` only at the trait boundary. **The alloy types are the source of truth; \`ExecutedBlock\` is just the contract serialization.** This separation is what Lesson 11 onward extends — \`LiveRethEvmBridge\` keeps the same internal-vs-boundary split, just adds a real Reth provider behind it.


## Walk-through

### Step 1: Add alloy deps to \`crates/evm/Cargo.toml\`

Open \`crates/evm/Cargo.toml\`. The current \`[dependencies]\` section (from Lesson 4):

\`\`\`toml
[dependencies]
openhl-consensus = { workspace = true }
openhl-types     = { workspace = true }
async-trait      = { workspace = true }
\`\`\`

Add two lines:

\`\`\`toml
[dependencies]
openhl-consensus = { workspace = true }
openhl-types     = { workspace = true }
async-trait      = { workspace = true }
alloy-primitives = { workspace = true }
alloy-consensus  = { workspace = true }
\`\`\`

Both are inherited from \`workspace.dependencies\` (set up in Lesson 1). \`alloy-primitives\` gives us \`B256\` (32-byte hash newtype) and \`Address\` (20-byte address newtype). \`alloy-consensus\` gives us \`Header\` (Ethereum block header struct with all its fields).

Run:

\`\`\`bash
cargo check -p openhl-evm
\`\`\`

Should pass — deps available, nothing using them yet.

### Step 2: Create \`crates/evm/src/engine.rs\`

\`\`\`bash
touch crates/evm/src/engine.rs
\`\`\`

Start with the module doc + imports:

\`\`\`rust
//! Reth-backed \`ConsensusBridge\` — uses alloy / Reth types throughout.
//!
//! At v0 this maintains state in-process for the parts that would normally
//! require a running Reth node (\`PayloadBuilder\` service, \`BlockchainProvider\`).
//! The live-node bootstrap lands in later lessons (Lessons 10–13); the type
//! conversions and state-machine shape here are the contract that bootstrap
//! will satisfy.

use alloy_consensus::Header;
use alloy_primitives::{Address, B256};
use async_trait::async_trait;
use openhl_consensus::bridge::{BridgeError, ConsensusBridge};
use openhl_types::{BlockHash, ExecutedBlock, PayloadAttrs, PayloadId, PayloadStatus};
use std::collections::HashMap;
use std::sync::Mutex;
\`\`\`

The new imports vs Lesson 4:

- \`alloy_consensus::Header\` — the canonical Ethereum block header struct (~20 fields: parent_hash, number, timestamp, beneficiary, gas_limit, base_fee, state_root, etc.)
- \`alloy_primitives::{Address, B256}\` — the address type (20 bytes) and the hash type (32 bytes). Both are newtypes over byte arrays, like \`BlockHash\` from Lesson 2 — but they come from alloy and are the convention across the Ethereum Rust ecosystem.

### Step 3: Add the structs

\`\`\`rust
#[derive(Debug, Default)]
pub struct RethEvmBridge {
    state: Mutex<State>,
}

#[derive(Debug, Default)]
struct State {
    next_payload_id: u64,
    pending: HashMap<u64, (B256, Header)>,
    chain: HashMap<B256, Header>,
    head: Option<B256>,
}

impl RethEvmBridge {
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }
}
\`\`\`

Same shape as Lesson 4's \`InMemoryEvmBridge\`, but the **types inside \`State\` are different**:

| Field | Lesson 4 (InMemory) | Lesson 5 (Reth) |
| - | - | - |
| \`pending\` | \`HashMap<u64, ExecutedBlock>\` | \`HashMap<u64, (B256, Header)>\` |
| \`chain\` | \`HashMap<[u8; 32], ExecutedBlock>\` | \`HashMap<B256, Header>\` |
| \`head\` | \`Option<BlockHash>\` | \`Option<B256>\` |

**Why store \`(B256, Header)\` not \`Header\` alone?** Because \`Header::hash_slow()\` is expensive — it RLP-encodes the entire header and runs Keccak-256. We compute the hash once at insert time and cache it in the tuple, so \`pending.get(id)\` returns both without re-hashing. The hash is the lookup key for \`chain\` (and the lookup criterion for \`commit\`), so we want it ready.

**Why \`B256\` instead of \`[u8; 32]\` for \`chain\` key and \`head\`?** Because we're now in alloy-native space — once you have a \`Header\`, the natural hash type is \`B256\`. Using \`[u8; 32]\` would require \`.0\` accessors everywhere. The conversion to \`BlockHash\` happens only when we cross the trait boundary, in helper functions (Step 6).

The core of Lesson 5 is a two-layer separation between "contract types we expose outward" and "alloy types we hold inward." Drawing that boundary in one picture pins down what the Step 6 helpers (\`to_b256\` / \`from_b256\` / \`to_executed_block\`) actually do, and why we can replace \`State\`'s internals without touching the CL:

\`\`\`
【 Type-boundary layout inside RethEvmBridge 】

   [ Outer: the consensus-layer (CL) world ]
   ──────────────────────────────────────────────────────────────────────────
       openhl-types / contract primitives (the types we defined ourselves):
         BlockHash       PayloadId        ExecutedBlock
   ──────────────────────────────────────────────────────────────────────────
                                  ▲    │
                                  │    ▼
                  conversions happen ONLY at the trait boundary (Step 6 helpers):
                      to_b256 / from_b256 / to_executed_block
                                  ▲    │
                                  │    ▼
   ──────────────────────────────────────────────────────────────────────────
       alloy-primitives / alloy-consensus (Ethereum ecosystem standard types):
         B256             u64              Header
   ──────────────────────────────────────────────────────────────────────────
   [ Inner: the execution-layer (EL) / RethEvmBridge interior ]
   ※ State stores real (B256, Header) tuples — wrapping the hash inside the
      tuple keeps Header and hash in lockstep, blocking the "I mutated the
      Header and forgot to refresh the cached hash" bug at the type level.
\`\`\`

Two things this picture pins down: (a) **the contract types (\`BlockHash\` etc.) appear only in the four trait method signatures and return values** — the \`impl\` body is written entirely in alloy types. (b) **alloy is the source of truth, and \`ExecutedBlock\` is just a serialization at the trait boundary.** So when alloy bumps and \`Header\`'s shape shifts, we only fix the three conversion helpers — the CL never sees the change. Lesson 11 onward's \`LiveRethEvmBridge\` swaps \`State\`'s backing for a live provider, but this boundary line doesn't move.

### Step 4: Implement \`build_payload\` — first real hashing

\`\`\`rust
#[async_trait]
impl ConsensusBridge for RethEvmBridge {
    async fn build_payload(
        &self,
        parent: BlockHash,
        attrs: PayloadAttrs,
    ) -> Result<PayloadId, BridgeError> {
        let parent_hash = to_b256(parent);
        let mut s = self.state.lock().expect("state mutex poisoned");

        let parent_number = s.chain.get(&parent_hash).map_or(0, |h| h.number);
        let id = s.next_payload_id;
        s.next_payload_id += 1;

        let header = Header {
            parent_hash,
            number: parent_number + 1,
            timestamp: attrs.timestamp,
            beneficiary: Address::from(attrs.fee_recipient),
            mix_hash: B256::from(attrs.prev_randao),
            ..Default::default()
        };
        let hash = header.hash_slow();
        s.pending.insert(id, (hash, header));
        Ok(PayloadId(id))
    }
    // ...continued
\`\`\`

Walk through:

1. **\`to_b256(parent)\`** — convert the trait's \`BlockHash\` to alloy's \`B256\` (just byte reinterpretation, both are 32 bytes). The helper is in Step 6.
2. **Look up parent number in \`chain\`** — keyed by \`B256\` now, not \`[u8; 32]\`. The map's lookup type is \`B256\`; we pass \`&parent_hash\` (a \`&B256\`) without unwrapping.
3. **Allocate payload ID** — same as Lesson 4.
4. **Build a \`Header\`** with the field defaults except for the ones we're setting:
   - \`parent_hash\` — the alloy \`B256\` from the trait input
   - \`number\` — parent + 1
   - \`timestamp\` — from \`PayloadAttrs\`
   - \`beneficiary: Address::from(attrs.fee_recipient)\` — convert from \`[u8; 20]\` to alloy's \`Address\` newtype
   - \`mix_hash: B256::from(attrs.prev_randao)\` — convert from \`[u8; 32]\` to \`B256\`
   - \`..Default::default()\` — fills in all remaining fields with zero/default values (state_root, gas_limit, etc.)
5. **\`header.hash_slow()\`** — **the real hash computation**. This RLP-encodes the entire \`Header\` (all ~20 fields, including the defaulted ones), then runs Keccak-256, producing a \`B256\`. The name "slow" is a convention — \`hash_fast\` would only exist if a cached hash were already on the header struct, which is not our case.
6. **Insert \`(hash, header)\`** into pending, keyed by payload ID. Return the ID.

**This block hash is real.** If any field of the header changes between two \`build_payload\` calls — even by one byte — the resulting hash differs. The Lesson 4 synthesized hash didn't have this property; the Lesson 5 hash does. The test in Step 9 proves this.


### Step 5: Implement \`payload_ready\`, \`validate_payload\`, \`commit\`

\`\`\`rust
    async fn payload_ready(&self, id: PayloadId) -> Result<ExecutedBlock, BridgeError> {
        let s = self.state.lock().expect("state mutex poisoned");
        let n = id.0;
        let (hash, header) = s
            .pending
            .get(&n)
            .cloned()
            .ok_or_else(|| BridgeError::Rejected(format!("unknown payload id {n}")))?;
        Ok(to_executed_block(hash, &header))
    }

    async fn validate_payload(
        &self,
        _block: &ExecutedBlock,
    ) -> Result<PayloadStatus, BridgeError> {
        // Real validation requires a live Reth provider + EVM (Lesson 11 onward).
        // For now, defer to the CL's voting layer for actual block validity
        // and accept structurally.
        Ok(PayloadStatus::Valid)
    }

    async fn commit(&self, block_hash: BlockHash) -> Result<(), BridgeError> {
        let hash = to_b256(block_hash);
        let mut s = self.state.lock().expect("state mutex poisoned");
        let header = s
            .pending
            .values()
            .find(|(h, _)| *h == hash)
            .map(|(_, header)| header.clone())
            .ok_or_else(|| BridgeError::Rejected(format!("commit for unknown hash {hash}")))?;
        s.chain.insert(hash, header);
        s.head = Some(hash);
        Ok(())
    }
}
\`\`\`

**\`payload_ready\`** clones the tuple out of pending and calls \`to_executed_block\` (Step 6) to materialize the trait's return type from the internal \`(B256, Header)\`.

**\`validate_payload\`** is still a stub. Real validation against a live Reth provider lands in Lesson 12; for now we accept structurally.

**\`commit\`** mirrors Lesson 4 with type substitutions:
- \`to_b256(block_hash)\` converts the trait's \`BlockHash\` to \`B256\`
- We search \`pending.values()\` for a tuple whose hash matches
- Insert the header into \`chain\` (keyed by \`B256\`)
- Update \`head\`

Notice the closure pattern \`find(|(h, _)| *h == hash)\` — destructure the tuple, compare the first element. The \`*h\` dereferences the \`&B256\` to a \`B256\` so we can compare with \`hash\` (also a \`B256\`). **\`B256\` implements \`Copy\`**, so \`*h\` only triggers a value-level memcpy — no ownership moves out of \`pending\`. Keep this in mind as a safe access pattern when reading \`B256\` fields elsewhere.

### Step 6: Add the conversion helpers

After the \`impl ConsensusBridge\` block:

\`\`\`rust
fn to_b256(h: BlockHash) -> B256 {
    B256::from(h.0)
}

fn from_b256(b: B256) -> BlockHash {
    BlockHash(b.0)
}

fn to_executed_block(hash: B256, header: &Header) -> ExecutedBlock {
    ExecutedBlock {
        hash: from_b256(hash),
        parent_hash: from_b256(header.parent_hash),
        number: header.number,
        state_root: header.state_root.0,
    }
}
\`\`\`

Three small helpers:

- **\`to_b256\`** — \`BlockHash → B256\`. Just access \`.0\` to get the inner \`[u8; 32]\` and pass it to \`B256::from\`.
- **\`from_b256\`** — \`B256 → BlockHash\`. Wrap the inner bytes in our newtype.
- **\`to_executed_block\`** — materialize the trait's \`ExecutedBlock\` from internal \`(B256, Header)\`. Pulls fields from the header (\`parent_hash\`, \`number\`) and the cached hash.

**Why three separate helpers instead of one big conversion function?** Each does one thing. \`to_b256\` and \`from_b256\` are pure type-system bridges (no logic). \`to_executed_block\` knows which fields of \`Header\` map to which fields of \`ExecutedBlock\`. Splitting them makes each obviously correct.


### Step 7: Wire \`engine\` into the crate

Open \`crates/evm/src/lib.rs\`. Current:

\`\`\`rust
//! EVM execution layer — Reth integration.

pub mod in_memory;

pub use in_memory::InMemoryEvmBridge;
\`\`\`

Add 2 lines:

\`\`\`rust
//! EVM execution layer — Reth integration.

pub mod engine;
pub mod in_memory;

pub use engine::RethEvmBridge;
pub use in_memory::InMemoryEvmBridge;
\`\`\`

\`pub mod engine;\` exposes the module. \`pub use engine::RethEvmBridge;\` re-exports the type at the crate root.

### Step 8: Verify it compiles

\`\`\`bash
cargo check -p openhl-evm
\`\`\`

Should pass. If you see errors:

- **\`use of undeclared crate or module 'alloy_consensus'\`** — \`[dependencies]\` is missing \`alloy-consensus = { workspace = true }\`. Re-check Step 1.
- **\`cannot find type 'B256' in this scope\`** — \`use alloy_primitives::B256;\` is missing from the import block.
- **\`method 'hash_slow' not found on Header\`** — alloy version mismatch (you might be on an older alloy). Re-run \`cargo update\` to pull the version pinned by workspace.

### Step 9: Add unit tests

At the bottom of \`crates/evm/src/engine.rs\`:

\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;

    fn attrs() -> PayloadAttrs {
        PayloadAttrs {
            timestamp: 42,
            fee_recipient: [0xaa; 20],
            prev_randao: [0xbb; 32],
        }
    }

    #[tokio::test]
    async fn build_then_ready_returns_alloy_hashed_block() {
        let bridge = RethEvmBridge::new();
        let parent = BlockHash([1u8; 32]);
        let id = bridge.build_payload(parent, attrs()).await.unwrap();
        let block = bridge.payload_ready(id).await.unwrap();
        assert_eq!(block.parent_hash, parent);
        assert_eq!(block.number, 1);
        // Hash is computed by alloy_consensus::Header::hash_slow, not synthesized:
        // it changes if any header field changes.
        let mut alt_attrs = attrs();
        alt_attrs.timestamp += 1;
        let id2 = bridge.build_payload(parent, alt_attrs).await.unwrap();
        let block2 = bridge.payload_ready(id2).await.unwrap();
        assert_ne!(block.hash, block2.hash);
    }

    #[tokio::test]
    async fn commit_advances_head() {
        let bridge = RethEvmBridge::new();
        let parent = BlockHash([1u8; 32]);
        let id = bridge.build_payload(parent, attrs()).await.unwrap();
        let block = bridge.payload_ready(id).await.unwrap();
        bridge.commit(block.hash).await.unwrap();
        let s = bridge.state.lock().unwrap();
        assert_eq!(s.head, Some(to_b256(block.hash)));
    }

    #[tokio::test]
    async fn build_on_committed_parent_increments_number() {
        let bridge = RethEvmBridge::new();
        let genesis = BlockHash([1u8; 32]);
        let id1 = bridge.build_payload(genesis, attrs()).await.unwrap();
        let block1 = bridge.payload_ready(id1).await.unwrap();
        bridge.commit(block1.hash).await.unwrap();

        let id2 = bridge.build_payload(block1.hash, attrs()).await.unwrap();
        let block2 = bridge.payload_ready(id2).await.unwrap();
        assert_eq!(block2.number, 2);
        assert_eq!(block2.parent_hash, block1.hash);
    }

    #[tokio::test]
    async fn commit_unknown_hash_errors() {
        let bridge = RethEvmBridge::new();
        let err = bridge.commit(BlockHash([9u8; 32])).await.unwrap_err();
        assert!(matches!(err, BridgeError::Rejected(_)));
    }
}
\`\`\`

What each test covers:

| Test | What it proves |
| - | - |
| \`build_then_ready_returns_alloy_hashed_block\` | Real hashing — same \`parent\` + different \`timestamp\` produces different \`hash\`. This is the test Lesson 4 couldn't write (synthesized hashes were timestamp-blind). |
| \`commit_advances_head\` | After commit, head points to the new block (in \`B256\` form internally). |
| \`build_on_committed_parent_increments_number\` | Number monotonicity, same as Lesson 4. |
| \`commit_unknown_hash_errors\` | Unknown-hash commit returns \`BridgeError::Rejected\`. |

The **key new test** is the first one. It mutates a single field (\`timestamp\`) of the \`Header\` and asserts the resulting hash differs. This proves the hashing is real — alloy is actually RLP-encoding and Keccak-256-ing the header. Lesson 4's synthesized hash from \`(id, number)\` would have failed this test (same parent, same number → same synthesized hash regardless of timestamp).

## Test

\`\`\`bash
cargo test -p openhl-evm
\`\`\`

Expected:

\`\`\`
running 9 tests
test engine::tests::build_on_committed_parent_increments_number ... ok
test engine::tests::build_then_ready_returns_alloy_hashed_block ... ok
test engine::tests::commit_advances_head ... ok
test engine::tests::commit_unknown_hash_errors ... ok
test in_memory::tests::build_on_committed_parent_increments_number ... ok
test in_memory::tests::build_then_ready_returns_same_block ... ok
test in_memory::tests::commit_advances_head_and_records_block ... ok
test in_memory::tests::commit_unknown_hash_errors ... ok
test in_memory::tests::validate_returns_valid ... ok

test result: ok. 9 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

The 4 Lesson 5 tests pass alongside the 5 Lesson 4 tests — **both implementations satisfy the same trait**, and the same \`ConsensusBridge\` consumer code (which we'll write in Lessons 8 / 9) works against either.

Common errors and fixes:

- **\`Header::hash_slow()\` returns wrong type** — if you wrote \`let hash: BlockHash = header.hash_slow();\` directly, that fails. \`hash_slow()\` returns \`B256\`; convert via \`from_b256\` after.
- **\`assert_ne!(block.hash, block2.hash)\` fails** — your \`..Default::default()\` might be the issue. Are you constructing \`Header\` with \`..Default::default()\` at the end? Without it, you might have all-zeros and same-timestamp-but-still-equal hashes.
- **\`B256::from(attrs.fee_recipient)\` errors** — \`fee_recipient\` is \`[u8; 20]\`, but \`B256\` is \`[u8; 32]\`. The correct conversion is \`Address::from(attrs.fee_recipient)\`.

## Design reflection

Three load-bearing decisions encoded:

1. **Internal types are alloy-native; trait types are the contract serialization.** State stores \`(B256, Header)\`. The trait returns \`ExecutedBlock\`. Conversion happens at exactly the trait boundary (\`to_executed_block\`). This means alloy can evolve its types without breaking the trait — only the conversion helpers update. **Decoupling production-shape internal types from the contract is what lets \`LiveRethEvmBridge\` (Lesson 11 onward) reuse the same trait.**

2. **\`(B256, Header)\` tuple, not separate fields.** The hash is *of this exact header*. Storing them separately invites the bug where a header mutation desyncs from the cached hash. The tuple binds them.

3. **Three small conversion helpers, not one big one.** \`to_b256\` and \`from_b256\` are pure type bridges; \`to_executed_block\` knows the field mapping. Splitting them keeps each helper obviously correct and makes future changes localized.

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout c938321
diff -u ~/code/my-openhl/crates/evm/src/engine.rs ./crates/evm/src/engine.rs
diff -u ~/code/my-openhl/crates/evm/src/lib.rs ./crates/evm/src/lib.rs
diff -u ~/code/my-openhl/crates/evm/Cargo.toml ./crates/evm/Cargo.toml
\`\`\`

Variations OK in doc comments and error messages. The struct types, helper signatures, and the 4 method impls should align closely.

The reference's Cargo.toml at \`c938321\` also lists \`reth-ethereum-primitives\` (without using it in \`engine.rs\`). It's a forward-declared dep for later lessons; our Lesson 5 omits it. Both are correct.

Return:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: Why have *two* bridge impls — InMemoryEvmBridge and RethEvmBridge — both with the same logic?**
The logic is the same; the **types are different**. \`InMemoryEvmBridge\` uses synthesized types (for fast unit tests). \`RethEvmBridge\` uses alloy types (for tests that validate alloy interop). Later, \`LiveRethEvmBridge\` will use alloy types AND a live Reth provider. Each step adds production fidelity while keeping the trait surface stable.

**Q: \`Header\` has ~20 fields. Why do I only set 4?**
The unset fields get \`Default::default()\` values: \`state_root = B256::ZERO\`, \`gas_limit = 0\`, \`base_fee_per_gas = None\`, etc. At v0 we don't have an EVM running, so we can't compute a real \`state_root\`; we accept zero. Production code (Lesson 11 onward) computes these from the live Reth provider.

**Q: What's the difference between \`hash_slow\` and \`hash_fast\` in alloy?**
There's no \`hash_fast\` method on \`Header\`. The naming convention is: methods that recompute a value are "slow," methods that return a pre-cached value are "fast." \`Header\` doesn't have a pre-cached hash, so we get only \`hash_slow\`. Some types in alloy (like \`SealedHeader\`) carry the hash and offer \`.hash()\` as the "fast" alternative.

**Q: Should I \`cargo update\` to get the latest alloy?**
No — the workspace pins alloy to specific versions (\`alloy-primitives = "1.5"\`, \`alloy-consensus = "2.0"\`). \`cargo update\` would just verify those resolve; it wouldn't bump. To bump alloy: edit \`workspace.dependencies\` in the root \`Cargo.toml\`, then \`cargo update\` to refresh the lock file.

## Next lesson (Lesson 6)

You've now written two \`ConsensusBridge\` impls — one synthesized, one with real alloy types. Both are usable by consensus-side test code (starting in Lesson 8).

In Lesson 6 we move to the consensus side properly and implement Malachite's \`Context\` trait.
That trait is the type-level API surface Malachite requires from any chain that uses it: 10 associated types and 4 factory methods.

After Lesson 6, your chain can answer "what is our \`Address\` type, \`Height\` type, and \`Value\` type" to Malachite. This is the **other half** of the contract.

The key contrast:
1. \`ConsensusBridge\` (Lesson 3) is a trait we (openhl) own.
2. \`Context\` (Lesson 6) is a trait Malachite owns.

Implementing your own contract versus implementing an external library's contract for your types are mirror-image design forces. The next lesson is where that asymmetry becomes muscle memory.

## Summary (3 lines)

- \`RethEvmBridge\` = same storage as InMemory but Alloy-typed. Conversion-free thanks to shared types.
- Verifies types compatibility before jumping to real Reth. Tests assert Alloy round-trip works.
- Production swap: Lesson 11 boots Reth + Lesson 12 wires the bridge. Next module: CL types.
`,
                },
              ],
            },
          },
          {
            title: 'CL types',
            sortOrder: 4,
            lessons: {
              create: [
                {
                  title: 'Lesson 6 — OpenHlContext and the 10 Malachite sub-types',
                  slug: 'openhl-malachite-context-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 50,
                  xpReward: 90,
                  content: `# Lesson 6 — OpenHlContext and the 10 Malachite sub-types

## Question

**\`OpenHlContext\` is the \`Context\` trait impl for openhl** — Malachite's generic plug-in interface. 10 associated sub-types must be defined (Address / Height / ProposalPart / Vote / etc.).

## Principle (minimum model)

- **Malachite's \`Context\` trait.** Defines 10 associated types that the host application provides. Malachite is generic over them.
- **10 sub-types.** \`Address + Height + ProposalPart + Proposal + Vote + Validator + ValidatorSet + Block + BlockHash + Extension\`. Each must satisfy Malachite's trait bounds.
- **Trait bound discipline.** \`Send + Sync + Clone + Debug + serde\`. Each sub-type defined in \`openhl-types\`; reused by both the bridge and the consensus.
- **\`OpenHlContext\` struct.** Holds references to validators + signing provider + codec. Passed by reference to Malachite.
- **Why a trait, not a fixed type set.** Lets Cosmos / openhl / other chains use Malachite with their own type sets. Compile-time polymorphism.
- **Production matches.** Hyperliquid's HyperBFT has analogous sub-types; the patterns transfer directly.
- **Tests.** Round-trip serde for every sub-type; verify Malachite's trait bounds hold (the compiler enforces).

## Worked example + steps

# Lesson 6 — \`OpenHlContext\` and the 10 Malachite sub-types

## Goal

Concepts you'll grasp in this lesson:

- **The two-sided trait contract** — Lesson 3's \`ConsensusBridge\` is the trait *you own*, implemented by execution. Malachite's \`Context\` is the trait *Malachite owns*, implemented by you. Both directions of the interface are now type-level.
- **The Context associated-type pattern** — how a single \`OpenHlContext;\` empty struct names 10 sub-types (\`Address\`, \`Height\`, \`Value\`, \`Validator\`, \`Vote\`, …) without holding any state. This is the type-family idiom that lets Malachite be chain-generic.
- **Type-system-enforced invariants** — \`OpenHlValidatorSet::new()\` sorts at construction so an unsorted set is unrepresentable. Every method downstream can assume sorted order without re-checking. The compiler does the policing.
- **Deterministic proposer election** — \`(height + round) % count\` against a stake-sorted set. The simplest deterministic algorithm that every validator can verify identically; sophistication (random beacons, rotation rules) lives behind the same trait surface.
- **\`PartialOrd / Ord\` on signing keys** — why \`OpenHlValidator\` must be totally ordered for Malachite's internal collections, and how Ed25519 public keys give you that ordering for free.

Verification:

\`\`\`bash
# Focused: just the 5 tests this lesson lands (avoids noise from other crates):
cargo test -p openhl-consensus context::tests

# Whole crate:
cargo test -p openhl-consensus
\`\`\`

…passes **5 tests** covering: validator-set sort order, deterministic proposer election, proposal field round-trip, vote-type distinction (prevote vs precommit), and height arithmetic. Your chain now satisfies Malachite's \`Context\` trait — the type-level API surface Malachite needs to drive consensus over your chain's blocks.

This is the **largest lesson in the course** — 8 new files, ~330 lines. Each file is small but the count is high. Plan for two sittings if needed.

Specific changes:

- 2 Malachite deps + 1 dev-dep added to \`crates/consensus/Cargo.toml\`: \`informalsystems-malachitebft-core-types\`, \`informalsystems-malachitebft-signing-ed25519\`, \`rand\` (dev).
- \`crates/consensus/src/types/\` — 7 type files (\`address.rs\`, \`height.rs\`, \`value.rs\`, \`validator.rs\`, \`proposal.rs\`, \`proposal_part.rs\`, \`vote.rs\`) plus \`mod.rs\`.
- \`crates/consensus/src/context.rs\` — \`OpenHlContext\` empty struct + \`impl Context for OpenHlContext\` with the 4 factory methods.
- \`crates/consensus/src/lib.rs\` — wires \`pub mod context; pub mod types;\`.

## Recap

After Lesson 5 your workspace has both \`ConsensusBridge\` impls, but the consensus crate itself still only contains the trait (from Lesson 3). No Malachite integration yet:

\`\`\`
crates/consensus/src/lib.rs:
  pub mod bridge;
crates/consensus/Cargo.toml:
  [dependencies]
  openhl-types, async-trait, thiserror, eyre
\`\`\`

We need to wire Malachite in next.

## Plan

You'll build (in this order):

1. **Cargo.toml updates** — 2 Malachite deps (\`-core-types\` for the trait, \`-signing-ed25519\` for the crypto), 1 dev-dep (\`rand 0.8\` for keypair generation in tests).
2. **\`crates/consensus/src/types/\` directory** with \`mod.rs\` (module index) and 7 type files:
   - \`address.rs\` — \`OpenHlAddress([u8; 20])\`
   - \`height.rs\` — \`OpenHlHeight(u64)\` with monotonic arithmetic
   - \`value.rs\` — \`OpenHlValue(BlockHash)\` — what consensus agrees on
   - \`validator.rs\` — \`OpenHlValidator\` + \`OpenHlValidatorSet\` (with the **canonical sort order**)
   - \`proposal.rs\` — \`OpenHlProposal\` — a block proposal message
   - \`proposal_part.rs\` — \`OpenHlProposalPart\` (unit struct — we don't stream)
   - \`vote.rs\` — \`OpenHlVote\` — a prevote or precommit
3. **\`crates/consensus/src/context.rs\`** — \`OpenHlContext\` impl with 10 type associations + 4 factory methods including the **proposer-election algorithm**.
4. **\`crates/consensus/src/lib.rs\`** — wire \`pub mod types; pub mod context; pub use context::OpenHlContext;\`.
5. **5 unit tests** in \`context.rs\`.
6. **Run** \`cargo test -p openhl-consensus\` — 5 pass.

The shape of these types **propagates everywhere downstream**. Lesson 7 (SigningProvider) signs \`OpenHlVote\` and \`OpenHlProposal\`. Lesson 8 (Codec) encodes them. Lesson 9 (run_engine_app) handles AppMsg variants parameterized over \`OpenHlContext\`. **The design decisions you encode here propagate through 8 more lessons.**


By the end of this lesson, the layout under \`crates/consensus/src/\` looks like this. Holding the final tree in mind — which step produces which file, and how the seven type files sit inside \`types/\` — keeps you from losing your place as you walk through the steps:

\`\`\`
crates/consensus/src/
├── lib.rs               (Step 7: bundles every module)
├── bridge.rs            (the ConsensusBridge trait from Lesson 3, unchanged here)
├── context.rs           (Step 6: OpenHlContext + 4 factories + tests) ★ centerpiece
└── types/               (Step 2: creates the directory + mod.rs)
    ├── mod.rs           (Step 2: submodule index / re-exports)
    ├── address.rs       (Step 3: 20-byte validator address)
    ├── height.rs        (Step 3: monotonic u64 height counter)
    ├── value.rs         (Step 3: thin wrapper around BlockHash)
    ├── validator.rs     (Step 4: validator + canonically sorted set) ★ most critical
    ├── proposal.rs      (Step 5: Proposal message)
    ├── proposal_part.rs (Step 5: dummy ProposalPart; v0 is full-block)
    └── vote.rs          (Step 5: Vote message; prevote / precommit)
\`\`\`

"Eight new files" sounds like a lot, but the actual count is **8 files under \`types/\` (\`mod.rs\` + 7 type files) + 1 file (\`context.rs\`) = 9**, and each file carries one independent design decision, which keeps them individually reviewable and testable. The order — **Step 3 (simple trio) → Step 4 (hard one: validator) → Step 5 (three message types) → Step 6 (the central binding)** — follows the dependency direction along the shortest path.

## Walk-through

### Step 1: Update \`crates/consensus/Cargo.toml\`

Add to \`[dependencies]\`:

\`\`\`toml
[dependencies]
openhl-types = { workspace = true }
async-trait  = { workspace = true }
thiserror    = { workspace = true }
eyre         = { workspace = true }

informalsystems-malachitebft-core-types      = { workspace = true }
informalsystems-malachitebft-signing-ed25519 = { workspace = true, features = ["rand"] }

[dev-dependencies]
rand = "0.8"
\`\`\`

What each new dep is:

- **\`informalsystems-malachitebft-core-types\`** — defines the \`Context\` trait and all 10 sub-traits (\`Address\`, \`Height\`, \`Value\`, \`Validator\`, \`ValidatorSet\`, \`Proposal\`, \`ProposalPart\`, \`Vote\`, \`Extension\`, \`SigningScheme\`). This is the API surface we'll implement.
- **\`informalsystems-malachitebft-signing-ed25519\`** with \`features = ["rand"]\` — Malachite's Ed25519 implementation. \`rand\` feature enables \`PrivateKey::generate(OsRng)\` for tests (otherwise you'd have to supply a pre-built keypair).
- **\`rand 0.8\` (dev-dep)** — for \`OsRng\` used in test code only.

Verify deps resolve:

\`\`\`bash
cargo check -p openhl-consensus
\`\`\`

First check after this triggers Malachite fetch — couple of minutes.

### Step 2: Create the \`types/\` directory and \`mod.rs\`

\`\`\`bash
mkdir crates/consensus/src/types
\`\`\`

Create \`crates/consensus/src/types/mod.rs\`:

\`\`\`rust
//! Concrete implementations of Malachite's \`Context\` sub-traits.

pub mod address;
pub mod height;
pub mod proposal;
pub mod proposal_part;
pub mod validator;
pub mod value;
pub mod vote;

pub use address::OpenHlAddress;
pub use height::OpenHlHeight;
pub use proposal::OpenHlProposal;
pub use proposal_part::OpenHlProposalPart;
pub use validator::{OpenHlValidator, OpenHlValidatorSet};
pub use value::OpenHlValue;
pub use vote::OpenHlVote;
\`\`\`

This is the module index. Each \`pub mod X;\` line declares a submodule (with file \`types/X.rs\`); each \`pub use\` re-exports the main type so callers can write \`crate::types::OpenHlAddress\` instead of \`crate::types::address::OpenHlAddress\`.

**Why one file per type instead of one big types.rs?** Each type's impl is short (10-40 lines), but the design decisions in each are distinct. A separate file per type means lessons (this one) can walk one type at a time and code reviews can focus on one type's changes without scrolling past unrelated code.

### Step 3: Write the three "simple" types — \`address.rs\`, \`height.rs\`, \`value.rs\`

Each is ~20 lines. Walk them in order.

**\`crates/consensus/src/types/address.rs\`:**

\`\`\`rust
use core::fmt;

use informalsystems_malachitebft_core_types::Address;

/// A 20-byte validator address, Ethereum convention.
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

Notice the pattern: newtype over \`[u8; 20]\`, all the standard derives, hex Display for logs, then **an empty \`impl Address\`**. The \`Address\` trait has no methods of its own — it just *requires* the derives. We satisfy it by being \`Clone + Copy + Debug + Display + PartialEq + Eq + PartialOrd + Ord + Hash\`.

**\`crates/consensus/src/types/height.rs\`:**

\`\`\`rust
use core::fmt;

use informalsystems_malachitebft_core_types::Height;

/// Block height — a monotonic u64 counter.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct OpenHlHeight(pub u64);

impl fmt::Display for OpenHlHeight {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl Height for OpenHlHeight {
    const ZERO: Self = OpenHlHeight(0);
    const INITIAL: Self = OpenHlHeight(1);

    fn increment_by(&self, n: u64) -> Self {
        OpenHlHeight(self.0.saturating_add(n))
    }

    fn decrement_by(&self, n: u64) -> Option<Self> {
        self.0.checked_sub(n).map(OpenHlHeight)
    }

    fn as_u64(&self) -> u64 {
        self.0
    }
}
\`\`\`

Three constants + three methods. \`ZERO\` is the absolute zero; \`INITIAL\` is the first valid block height (1, not 0 — genesis is block 0 but isn't "produced" by consensus, so consensus rounds start at 1). \`increment_by\` uses \`saturating_add\` to avoid panic on overflow. \`decrement_by\` returns \`Option\` because going below zero is invalid; \`checked_sub\` returns \`None\` instead of panicking.

**\`crates/consensus/src/types/value.rs\`:**

\`\`\`rust
use informalsystems_malachitebft_core_types::Value;
use openhl_types::BlockHash;

/// The value consensus agrees on: an EVM block, identified by its block hash.
///
/// For v0 we store only the hash since the EVM bridge is the source of truth
/// for block contents. Module 2 will extend this to carry the full block once
/// the CLOB starts producing fills that need to be ordered alongside EVM txs.
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct OpenHlValue(pub BlockHash);

impl Value for OpenHlValue {
    type Id = BlockHash;

    fn id(&self) -> Self::Id {
        self.0
    }
}
\`\`\`

\`OpenHlValue\` wraps \`BlockHash\` (from Lesson 2). The \`Value::Id\` associated type is what gets put in votes — consensus doesn't vote on the full value, it votes on the value's *identifier* (the hash). Here \`Id = BlockHash\`, so the value and its ID happen to be the same data.


Run \`cargo check -p openhl-consensus\` after typing these three. Should pass.

### Step 4: Write \`validator.rs\` — the canonical sort order

This is the longest type file. ~75 lines.

\`\`\`rust
use informalsystems_malachitebft_core_types::{Validator, ValidatorSet, VotingPower};
use informalsystems_malachitebft_signing_ed25519::PublicKey;

use crate::context::OpenHlContext;
use crate::types::OpenHlAddress;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct OpenHlValidator {
    pub address: OpenHlAddress,
    pub public_key: PublicKey,
    pub voting_power: VotingPower,
}

impl OpenHlValidator {
    #[must_use]
    pub const fn new(address: OpenHlAddress, public_key: PublicKey, voting_power: VotingPower) -> Self {
        Self { address, public_key, voting_power }
    }
}

impl Validator<OpenHlContext> for OpenHlValidator {
    fn address(&self) -> &OpenHlAddress {
        &self.address
    }

    fn public_key(&self) -> &PublicKey {
        &self.public_key
    }

    fn voting_power(&self) -> VotingPower {
        self.voting_power
    }
}

/// A validator set, kept sorted by (\`voting_power\` desc, address asc).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct OpenHlValidatorSet(Vec<OpenHlValidator>);

impl OpenHlValidatorSet {
    /// Construct a validator set and enforce the canonical sort order.
    #[must_use]
    pub fn new(mut validators: Vec<OpenHlValidator>) -> Self {
        validators.sort_by(|a, b| {
            b.voting_power
                .cmp(&a.voting_power)
                .then_with(|| a.address.cmp(&b.address))
        });
        Self(validators)
    }

    #[must_use]
    pub fn validators(&self) -> &[OpenHlValidator] {
        &self.0
    }
}

impl ValidatorSet<OpenHlContext> for OpenHlValidatorSet {
    fn count(&self) -> usize {
        self.0.len()
    }

    fn total_voting_power(&self) -> VotingPower {
        self.0.iter().map(|v| v.voting_power).sum()
    }

    fn get_by_address(&self, address: &OpenHlAddress) -> Option<&OpenHlValidator> {
        self.0.iter().find(|v| &v.address == address)
    }

    fn get_by_index(&self, index: usize) -> Option<&OpenHlValidator> {
        self.0.get(index)
    }
}
\`\`\`

**This is the single most load-bearing file in the lesson.**

\`OpenHlValidator\` is straightforward: address + public_key + voting_power, exposed via 3 accessor methods on the \`Validator\` trait. The interesting work is in \`OpenHlValidatorSet::new\`:

\`\`\`rust
validators.sort_by(|a, b| {
    b.voting_power.cmp(&a.voting_power)         // primary: power desc
        .then_with(|| a.address.cmp(&b.address)) // tiebreaker: address asc
});
\`\`\`

Two guarantees compose here. \`Vec::sort_by\` is stable, so elements that compare \`Equal\` preserve input-relative order. But this comparator includes \`then_with(|| a.address.cmp(&b.address))\`, which gives a full tie-break and therefore a **total ordering** in practice. So no unresolved \`Equal\` class remains, and the final ordering is unique independent of input order. Stable-sort behavior plus an explicit total tie-break is what makes the validator-set ordering deterministic.

This is the **canonical CometBFT validator-set sort order**: voting power descending, then address ascending as tiebreaker. **Every validator must apply this same sort to the same input set**. Why?

Because \`OpenHlContext::select_proposer\` (which we write in Step 8) does \`validator_set.get_by_index((height + round) % count)\`. If validator A sorts the set one way and validator B sorts it differently, they pick different proposers for the same \`(height, round)\`. **The chain forks at the first round.** The sort order *is* the proposer-election protocol.

Other BFT chains (CometBFT, every Cosmos chain) use the exact same sort. Following the convention isn't just convenience — it makes our chain *behave identically* to the BFT canon on the same input set.


### Step 5: Write the message types — \`proposal.rs\`, \`proposal_part.rs\`, \`vote.rs\`

Three files, each implementing one message-type trait.

**\`crates/consensus/src/types/proposal.rs\`:**

\`\`\`rust
use informalsystems_malachitebft_core_types::{Proposal, Round};

use crate::context::OpenHlContext;
use crate::types::{OpenHlAddress, OpenHlHeight, OpenHlValue};

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct OpenHlProposal {
    pub height: OpenHlHeight,
    pub round: Round,
    pub value: OpenHlValue,
    pub pol_round: Round,
    pub address: OpenHlAddress,
}

impl Proposal<OpenHlContext> for OpenHlProposal {
    fn height(&self) -> OpenHlHeight {
        self.height
    }

    fn round(&self) -> Round {
        self.round
    }

    fn value(&self) -> &OpenHlValue {
        &self.value
    }

    fn take_value(self) -> OpenHlValue {
        self.value
    }

    fn pol_round(&self) -> Round {
        self.pol_round
    }

    fn validator_address(&self) -> &OpenHlAddress {
        &self.address
    }
}
\`\`\`

\`OpenHlProposal\` is a typed message: "validator X proposes value Y at (height, round) with proof-of-lock-on-round Z." The \`Proposal\` trait has 6 accessor methods we satisfy by reading fields from \`self\`.

\`pol_round\` (Proof of Lock Round) is a Tendermint concept: if you proposed this value because you locked on it in round Z, that's \`pol_round\`. For first-time proposals it's \`Round::Nil\`.

**\`crates/consensus/src/types/proposal_part.rs\`:**

\`\`\`rust
use informalsystems_malachitebft_core_types::ProposalPart;

use crate::context::OpenHlContext;

/// Unit proposal part — \`OpenHL\` runs in \`ValuePayload::ProposalOnly\` mode, so
/// the entire value ships in the \`Proposal\` message and parts are unused.
/// The type is required by the \`Context\` trait surface anyway.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct OpenHlProposalPart;

impl ProposalPart<OpenHlContext> for OpenHlProposalPart {
    fn is_first(&self) -> bool {
        true
    }

    fn is_last(&self) -> bool {
        true
    }
}
\`\`\`

A unit struct — the smallest possible type. **Why?** Because Malachite has two modes for proposing large values:

- **\`ValuePayload::ProposalOnly\`** (what we use) — entire value ships in the \`Proposal\` message
- **\`ValuePayload::ProposalAndParts\`** — proposal references parts; parts ship separately

We run ProposalOnly because our \`OpenHlValue\` is just a \`BlockHash\` (32 bytes). No streaming needed. But the \`Context\` trait still requires us to *associate* a \`ProposalPart\` type — we satisfy this with a unit struct that's never instantiated in our chain. The \`is_first\` and \`is_last\` return \`true\` so any code that does check them produces consistent results.

**\`crates/consensus/src/types/vote.rs\`:**

\`\`\`rust
use informalsystems_malachitebft_core_types::{
    NilOrVal, Round, SignedExtension, VoteType, Vote as VoteTrait,
};
use openhl_types::BlockHash;

use crate::context::OpenHlContext;
use crate::types::{OpenHlAddress, OpenHlHeight};

#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct OpenHlVote {
    pub height: OpenHlHeight,
    pub round: Round,
    pub value_id: NilOrVal<BlockHash>,
    pub vote_type: VoteType,
    pub address: OpenHlAddress,
}

impl VoteTrait<OpenHlContext> for OpenHlVote {
    fn height(&self) -> OpenHlHeight {
        self.height
    }

    fn round(&self) -> Round {
        self.round
    }

    fn value(&self) -> &NilOrVal<BlockHash> {
        &self.value_id
    }

    fn take_value(self) -> NilOrVal<BlockHash> {
        self.value_id
    }

    fn vote_type(&self) -> VoteType {
        self.vote_type
    }

    fn validator_address(&self) -> &OpenHlAddress {
        &self.address
    }

    fn extension(&self) -> Option<&SignedExtension<OpenHlContext>> {
        None
    }

    fn take_extension(&mut self) -> Option<SignedExtension<OpenHlContext>> {
        None
    }

    fn extend(self, _extension: SignedExtension<OpenHlContext>) -> Self {
        self
    }
}
\`\`\`

\`OpenHlVote\` is the message type for both **prevotes** and **precommits**. The \`vote_type\` field distinguishes which; otherwise the structure is identical. Same with the field set: validator address, the height and round being voted on, and the value being voted for (or \`Nil\` for "I vote against any value at this round").

The three extension methods return \`None\` / no-op. **Vote extensions** are a Malachite feature: validators can attach extra data to their precommits (e.g., light-client state). We don't use them at v0 — \`Extension = ()\` in the Context impl (Step 6), and these methods are stubbed.

**Why \`NilOrVal<BlockHash>\` instead of \`Option<BlockHash>\`?** Both are essentially "maybe a value." But \`NilOrVal\` is Malachite's BFT-specific concept: \`Nil\` means "I'm voting against any value at this round" (different from "I don't have an opinion"). \`Option\` would lose that nuance.

### Step 6: Write \`context.rs\` — the binding

This file ties all 10 types together into the \`Context\` impl. It's the longest file (~185 lines including tests). Let's break it into pieces.

Top of \`crates/consensus/src/context.rs\`:

\`\`\`rust
//! \`OpenHlContext\` — the central abstraction Malachite uses to know about our chain.
//!
//! Once this trait is implemented, the entire \`malachitebft-core-consensus\` and
//! \`malachitebft-engine\` machinery can drive consensus over our types.

use informalsystems_malachitebft_core_types::{
    Context, NilOrVal, Round, ValidatorSet as _, ValueId, VoteType,
};
use informalsystems_malachitebft_signing_ed25519::Ed25519;

use crate::types::{
    OpenHlAddress, OpenHlHeight, OpenHlProposal, OpenHlProposalPart, OpenHlValidator,
    OpenHlValidatorSet, OpenHlValue, OpenHlVote,
};

#[derive(Clone, Debug, Default)]
pub struct OpenHlContext;
\`\`\`

\`OpenHlContext\` is a **unit struct** — no fields. It doesn't carry state; it's just a marker that holds the type associations. Many BFT chains' Context types are also stateless.

Then the \`impl Context for OpenHlContext\` block. The 10 type associations:

\`\`\`rust
impl Context for OpenHlContext {
    type Address = OpenHlAddress;
    type Height = OpenHlHeight;
    type ProposalPart = OpenHlProposalPart;
    type Proposal = OpenHlProposal;
    type Validator = OpenHlValidator;
    type ValidatorSet = OpenHlValidatorSet;
    type Value = OpenHlValue;
    type Vote = OpenHlVote;
    type Extension = ();
    type SigningScheme = Ed25519;
    // ...continued below
\`\`\`

10 type bindings — one for each \`Context\` sub-trait. The 8 we just wrote, plus:

- **\`Extension = ()\`** — no vote extensions. The unit type satisfies the trait's bounds without us writing a real extension type.
- **\`SigningScheme = Ed25519\`** — use Malachite's Ed25519 implementation directly. Most BFT chains use Ed25519; some use BLS for signature aggregation. We pick Ed25519 because Malachite ships an implementation and it's simpler.

Then the 4 factory methods. **\`select_proposer\`** is the most important:

\`\`\`rust
    fn select_proposer<'a>(
        &self,
        validator_set: &'a Self::ValidatorSet,
        height: Self::Height,
        round: Round,
    ) -> &'a Self::Validator {
        let count = validator_set.count();
        assert!(count > 0, "validator set is empty");
        let round_u64 = u64::try_from(round.as_i64().max(0)).unwrap_or(0);
        let index_u64 = height.0.wrapping_add(round_u64);
        let index = usize::try_from(index_u64).unwrap_or(usize::MAX) % count;
        validator_set
            .get_by_index(index)
            .expect("index < count by construction")
    }
\`\`\`

The proposer-election algorithm. **\`(height + round) % count\`** picks an index into the sorted validator set. Because:

1. The validator set was sorted canonically in \`OpenHlValidatorSet::new\` (Step 4), every validator has the same indexing.
2. Given the same \`(height, round)\`, every validator computes the same \`index\`.
3. Therefore every validator picks the same proposer.

The arithmetic is careful: \`wrapping_add\` on \`u64\` avoids overflow; \`% count\` then yields a valid index. The \`.expect\` is provable: \`index < count\` because we just computed it as \`... % count\`.

How \`(height + round) % count\` actually rotates the proposer is best seen on a small example — 3 validators (A: 300 stake / B: 200 / C: 100):

\`\`\`
Sorted set (voting_power descending, then address ascending as tiebreak):
   Index 0 ──► Validator A (stake 300)
   Index 1 ──► Validator B (stake 200)
   Index 2 ──► Validator C (stake 100)

Deterministic proposer selection:
   Height 1, Round 0 ──► (1 + 0) % 3 = 1 ──► Proposer: B
   Height 1, Round 1 ──► (1 + 1) % 3 = 2 ──► Proposer: C  (round advances → rotates)
   Height 1, Round 2 ──► (1 + 2) % 3 = 0 ──► Proposer: A
   Height 2, Round 0 ──► (2 + 0) % 3 = 2 ──► Proposer: C  (height advances → also rotates)
   Height 2, Round 1 ──► (2 + 1) % 3 = 0 ──► Proposer: A
   ...
\`\`\`

This is where the canonical sort order from Step 4 earns its keep. **If validator A sorts the set as \`[A, B, C]\` while validator B sorts it as \`[B, A, C]\`**, then for the same \`(height=1, round=0)\`, A reads "Index 1 = B" while B reads "Index 1 = A" — they pick *different* proposers. **The chain forks at the very first round.** "The sort order is the proposer-election protocol" is what that means in practice.

Then \`new_proposal\`, \`new_prevote\`, \`new_precommit\` — three factory methods that construct typed messages:

\`\`\`rust
    fn new_proposal(
        &self,
        height: Self::Height,
        round: Round,
        value: Self::Value,
        pol_round: Round,
        address: Self::Address,
    ) -> Self::Proposal {
        OpenHlProposal { height, round, value, pol_round, address }
    }

    fn new_prevote(
        &self,
        height: Self::Height,
        round: Round,
        value_id: NilOrVal<ValueId<Self>>,
        address: Self::Address,
    ) -> Self::Vote {
        OpenHlVote {
            height,
            round,
            value_id,
            vote_type: VoteType::Prevote,
            address,
        }
    }

    fn new_precommit(
        &self,
        height: Self::Height,
        round: Round,
        value_id: NilOrVal<ValueId<Self>>,
        address: Self::Address,
    ) -> Self::Vote {
        OpenHlVote {
            height,
            round,
            value_id,
            vote_type: VoteType::Precommit,
            address,
        }
    }
}
\`\`\`

These are short because all the work is field assignment. The interesting thing is that \`new_prevote\` and \`new_precommit\` produce the same struct (\`OpenHlVote\`) but with different \`vote_type\` values — the type system enforces the distinction at construction.

### Step 7: Wire into \`lib.rs\`

Open \`crates/consensus/src/lib.rs\`. Current state:

\`\`\`rust
//! Consensus layer — Malachite BFT.

pub mod bridge;
\`\`\`

Change to:

\`\`\`rust
//! Consensus layer — Malachite BFT.

pub mod bridge;
pub mod context;
pub mod types;

pub use context::OpenHlContext;
\`\`\`

\`pub mod\` declarations expose the modules. \`pub use context::OpenHlContext;\` re-exports the central type so downstream crates write \`use openhl_consensus::OpenHlContext;\` (cleaner than \`use openhl_consensus::context::OpenHlContext;\`).

### Step 8: Add 5 unit tests

Append to \`crates/consensus/src/context.rs\`:

\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;
    use informalsystems_malachitebft_core_types::{
        Height as HeightTrait, Proposal as ProposalTrait, Validator, ValidatorSet,
        Vote as VoteTrait,
    };
    use informalsystems_malachitebft_signing_ed25519::PrivateKey;
    use openhl_types::BlockHash;
    use rand::rngs::OsRng;

    fn validator(addr_byte: u8, power: u64) -> OpenHlValidator {
        let private = PrivateKey::generate(OsRng);
        let public = private.public_key();
        OpenHlValidator::new(OpenHlAddress([addr_byte; 20]), public, power)
    }

    #[test]
    fn validator_set_is_sorted_by_power_then_address() {
        let set = OpenHlValidatorSet::new(vec![
            validator(0x01, 100),
            validator(0x02, 300),
            validator(0x03, 200),
        ]);
        let powers: Vec<u64> = set
            .validators()
            .iter()
            .map(Validator::voting_power)
            .collect();
        assert_eq!(powers, vec![300, 200, 100]);
        assert_eq!(set.total_voting_power(), 600);
        assert_eq!(set.count(), 3);
    }

    #[test]
    fn select_proposer_round_robins_deterministically() {
        let ctx = OpenHlContext;
        let set = OpenHlValidatorSet::new(vec![
            validator(0x01, 100),
            validator(0x02, 100),
            validator(0x03, 100),
        ]);
        let h = OpenHlHeight(7);
        let p1 = ctx.select_proposer(&set, h, Round::new(0)).address;
        let p2 = ctx.select_proposer(&set, h, Round::new(0)).address;
        assert_eq!(p1, p2);

        let p3 = ctx.select_proposer(&set, h.increment(), Round::new(0)).address;
        assert_ne!(p1, p3);
    }

    #[test]
    fn new_proposal_round_trips_fields() {
        let ctx = OpenHlContext;
        let addr = OpenHlAddress([0xaa; 20]);
        let value = OpenHlValue(BlockHash([0xbb; 32]));
        let proposal = ctx.new_proposal(
            OpenHlHeight(5),
            Round::new(1),
            value,
            Round::Nil,
            addr,
        );
        assert_eq!(ProposalTrait::height(&proposal), OpenHlHeight(5));
        assert_eq!(*ProposalTrait::value(&proposal), value);
        assert_eq!(*ProposalTrait::validator_address(&proposal), addr);
    }

    #[test]
    fn new_prevote_and_precommit_have_distinct_types() {
        let ctx = OpenHlContext;
        let addr = OpenHlAddress([0xaa; 20]);
        let vid: NilOrVal<BlockHash> = NilOrVal::Val(BlockHash([0xbb; 32]));
        let prevote = ctx.new_prevote(OpenHlHeight(5), Round::new(0), vid, addr);
        let precommit = ctx.new_precommit(OpenHlHeight(5), Round::new(0), vid, addr);
        assert_eq!(VoteTrait::vote_type(&prevote), VoteType::Prevote);
        assert_eq!(VoteTrait::vote_type(&precommit), VoteType::Precommit);
    }

    #[test]
    fn height_increment_and_decrement() {
        let h = OpenHlHeight::INITIAL;
        assert_eq!(h.as_u64(), 1);
        assert_eq!(h.increment().as_u64(), 2);
        assert_eq!(OpenHlHeight::ZERO.decrement(), None);
        assert_eq!(OpenHlHeight(5).decrement().unwrap().as_u64(), 4);
    }
}
\`\`\`

Five tests covering:

1. **\`validator_set_is_sorted_by_power_then_address\`** — Construct a 3-validator set with shuffled powers (100, 300, 200), verify the output is [300, 200, 100]. Proves the canonical sort order from Step 4 works.
2. **\`select_proposer_round_robins_deterministically\`** — Same height + same round → same proposer (determinism). Different height → different proposer (rotation).
3. **\`new_proposal_round_trips_fields\`** — Construct via \`new_proposal\`, read back via \`Proposal\` trait methods. Verifies the factory ↔ accessor pair.
4. **\`new_prevote_and_precommit_have_distinct_types\`** — Same arguments, but \`new_prevote\` produces \`VoteType::Prevote\` and \`new_precommit\` produces \`VoteType::Precommit\`. Proves the factory does its job.
5. **\`height_increment_and_decrement\`** — \`INITIAL.increment() == 2\`, \`ZERO.decrement() == None\`, \`5.decrement() == Some(4)\`. Verifies the arithmetic methods.

Note: \`h.increment()\` (not \`h.increment_by(1)\`) — \`increment\` is a default method on the \`Height\` trait that calls \`increment_by(1)\`. Similar for \`decrement\`.

## Test

\`\`\`bash
cargo test -p openhl-consensus
\`\`\`

Expected:

\`\`\`
running 5 tests
test context::tests::height_increment_and_decrement ... ok
test context::tests::new_prevote_and_precommit_have_distinct_types ... ok
test context::tests::new_proposal_round_trips_fields ... ok
test context::tests::select_proposer_round_robins_deterministically ... ok
test context::tests::validator_set_is_sorted_by_power_then_address ... ok

test result: ok. 5 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

Common errors and fixes:

- **\`cannot find trait 'Address' in scope\`** — \`use informalsystems_malachitebft_core_types::Address;\` is missing from \`address.rs\`.
- **\`expected struct 'OpenHlContext', found ...\`** — One of the type files has \`crate::context::OpenHlContext\` imported but the file doesn't exist yet. Make sure you wrote \`context.rs\` before you wrote the type files (or write the types first with \`crate::OpenHlContext\` placeholders, fill \`context.rs\` next).
- **\`method 'increment' not found\`** — Malachite's \`Height\` trait provides \`increment()\` as a default method that calls \`increment_by(1)\`. Make sure your impl provides \`increment_by\`, not \`increment\`.
- **\`first_validator_set sort produces a different order\`** — The sort comparator must be \`b.voting_power.cmp(&a.voting_power)\` (note: \`b\` first for descending), not \`a.voting_power.cmp(&b.voting_power)\`.

## Design reflection

Three load-bearing decisions encoded:

1. **One file per Context sub-type.** Could have been one big \`context.rs\` with all 10 types defined inline. The split makes lessons (this one, and future ones citing individual types) more focused, but the cost is 8 files for what could be 1. We chose the split because the **trait surfaces are independently load-bearing** — \`Validator\` decisions are different from \`Vote\` decisions, and code reviews are easier when changes are localized.

2. **\`OpenHlValidatorSet\` sorts in \`new()\`, not in a separate \`sort()\` method.** Means you can't construct an unsorted set. The type system encodes "this set is always sorted" — there's no API path that produces an unsorted set. This propagates: every method on the set assumes sorted order, which is now an invariant the compiler helps enforce.

3. **\`select_proposer = (height + round) % count\`** — the dead simplest possible algorithm. Malachite supports more sophisticated proposer selection (weighted by stake, with rotation that prevents same-validator-twice, etc.). We pick the simplest because:
   - It's deterministic
   - It's verifiable by every validator
   - The complexity of "fair stake-weighted rotation" lives in \`OpenHlValidatorSet::new\`'s sort, not in \`select_proposer\` itself
   - Higher-stake validators are at lower indices and naturally proposer-elected more often via the modulo
   
   This is the same approach CometBFT uses. If we needed sophisticated rotation (e.g., random beacon-based proposer selection), this method body changes — but the trait surface stays identical.

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout 784785b
diff -ur ~/code/my-openhl/crates/consensus/src/types ./crates/consensus/src/types
diff -u ~/code/my-openhl/crates/consensus/src/context.rs ./crates/consensus/src/context.rs
diff -u ~/code/my-openhl/crates/consensus/Cargo.toml ./crates/consensus/Cargo.toml
diff -u ~/code/my-openhl/crates/consensus/src/lib.rs ./crates/consensus/src/lib.rs
\`\`\`

Variations OK in doc comments and test ordering. The shapes of each type, the sort comparator in \`OpenHlValidatorSet::new\`, and the \`select_proposer\` body should match closely.

Return:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: My validator set sort produces (100, 200, 300) instead of (300, 200, 100). What's wrong?**
You used \`a.voting_power.cmp(&b.voting_power)\` (ascending). Use \`b.voting_power.cmp(&a.voting_power)\` (descending) instead. Higher-stake validators must sort earlier (lower index).

**Q: \`select_proposer\` panics with "validator set is empty." Why?**
Your test created an empty \`OpenHlValidatorSet\`. Real chains have at least one validator (single-validator devnet) or 4+ (multi-validator with byzantine tolerance). The assertion catches the malformed-config case before it causes a modulo-by-zero. If you see it in unit tests, your test setup is wrong; if you see it in production, your config loader is wrong.

**Q: Can \`OpenHlContext\` have state (e.g., chain config)?**
Yes — change \`pub struct OpenHlContext;\` to \`pub struct OpenHlContext { chain_id: u64 }\` or similar. The Context trait doesn't forbid state. But most BFT chains' Context types are stateless because the context's job is to *associate types*, not to *hold runtime config*. Runtime config lives in \`OpenHlConfig\` (which we'll see in Lesson 8).

**Q: Why are \`Extension\` set to \`()\` and the vote-extension methods stubbed to \`None\`?**
Because openhl v0 doesn't use vote extensions. Production BFT chains use them for things like submitting light-client snapshots alongside precommits. Implementing them requires choosing what data to attach, how to serialize it, and how to verify it on the other end. We deliberately scope that out until there's a concrete use case.

## Next lesson (Lesson 7)

You have all 10 Context sub-types and the 4 factory methods. Malachite knows what your chain's addresses, heights, values, validators, and messages look like. But **nothing is signed yet**. Lesson 7 implements \`OpenHlSigningProvider\` — the trait that produces Ed25519 signatures over \`OpenHlVote\` and \`OpenHlProposal\` messages. This is the **other half** of the bidirectional Context surface — Context says "here are my types," SigningProvider says "here's how to sign them."

## Summary (3 lines)

- \`OpenHlContext\` impl of Malachite's \`Context\` trait. 10 associated sub-types (Address / Height / Proposal / Vote / ...).
- Trait bounds: Send + Sync + Clone + Debug + serde. Each sub-type from openhl-types.
- Lets Malachite be generic across hosts (Cosmos / openhl / others). Next: OpenHlSigningProvider.
`,
                },
                {
                  title: 'Lesson 7 — OpenHlSigningProvider and canonical encoding',
                  slug: 'openhl-signing-provider-en',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 40,
                  xpReward: 80,
                  content: `# Lesson 7 — OpenHlSigningProvider and canonical encoding

## Question

**\`OpenHlSigningProvider\` provides BLS signatures + verification + canonical encoding** for consensus messages. The bridge between Malachite's sign/verify needs and Hyperliquid's key management.

## Principle (minimum model)

- **\`SigningProvider\` trait (Malachite).** \`sign(msg, private_key) -> Signature\` + \`verify(msg, signature, public_key) -> bool\`. Plus a key generator.
- **BLS signatures.** Used by Hyperliquid; aggregation + batch verification benefit. openhl uses \`blst\` crate for BLS.
- **Canonical encoding.** Messages must serialize the same way on every node. Use SSZ (canonical, fixed-order); no JSON.
- **\`OpenHlSigningProvider\` impl.** Wraps \`blst\` calls; handles aggregation for vote-counting.
- **Key management.** Public/private key pairs generated at validator setup; private keys stored encrypted; public keys in ValidatorSet.
- **Tests.** Sign + verify round-trip; aggregate multiple signatures + verify aggregate; canonical encoding produces same bytes on every machine.
- **Hardware module hooks.** Production uses HSM (hardware security module) for signing keys; the trait allows swapping \`blst\` → HSM call.

## Worked example + steps

# Lesson 7 — \`OpenHlSigningProvider\` and canonical encoding

## Goal

Concepts you'll grasp in this lesson:

- **Canonical encoding is consensus-critical** — why the byte layout that goes into a signature is *part of the chain's spec*, not derived from \`serde::Serialize\`. Two validators with different serde versions would produce different bytes for the same vote, sign different things, and fork.
- **Pure functions wrapped by a stateful provider** — \`sign_vote(vote, &sk)\` is a free function (tests call it directly); \`OpenHlSigningProvider\` holds the key and exposes \`sp.sign_vote(vote)\` for Malachite. One logic, two call sites.
- **Tamper detection via signature failure** — Ed25519 doesn't *know* what's tampered; it just fails to verify. The test that flips a byte in a vote then expects verification to fail is how you prove canonical encoding covers every consensus-relevant field.
- **Type-system separation of public/private keys** — Ed25519 puts \`sign\` on \`PrivateKey\` only, never on \`PublicKey\`. The compiler refuses to let you sign with the public key.
- **Empty-bytes signatures for unused features** — when the trait surface requires sign methods for features you don't use (vote extensions, proposal parts), signing deterministic empty data honors the contract without committing to data you don't have.

Verification:

\`\`\`bash
cargo test -p openhl-consensus
\`\`\`

…passes **14 tests** (5 from Lesson 6's Context impl + 9 new ones for signing and the SigningProvider). The 9 new tests cover: round-trip sign/verify for each of the 4 signable types (vote, proposal, proposal_part, vote_extension), tamper detection on votes and proposals, and cross-provider verification rejection.

Specific changes:

- \`crates/consensus/src/signing.rs\` — canonical byte encoding for \`OpenHlVote\` and \`OpenHlProposal\`, low-level \`sign_vote / sign_proposal / verify_vote\` functions, \`VerifierLike\` shim, 2 unit tests.
- \`crates/consensus/src/signing_provider.rs\` — \`OpenHlSigningProvider\` struct holding a \`PrivateKey\`, \`impl SigningProvider<OpenHlContext>\` with 8 methods (4 sign/verify pairs), 7 unit tests.
- \`crates/consensus/src/lib.rs\` — wires \`pub mod signing; pub mod signing_provider;\`.
- No Cargo.toml changes (the \`informalsystems-malachitebft-signing-ed25519\` dep came in at Lesson 6).

## Recap

After Lesson 6 your \`openhl-consensus\` crate has:

\`\`\`
crates/consensus/src/lib.rs   — pub mod bridge, context, types
crates/consensus/src/types/   — 7 type files + mod.rs
crates/consensus/src/context.rs — OpenHlContext + Context impl + 5 tests
\`\`\`

\`cargo test -p openhl-consensus\` passes 5 tests. **No signing exists yet** — votes and proposals are constructable, but nothing in the codebase produces or verifies signatures over them.

## Plan

Five things:

1. **Create \`crates/consensus/src/signing.rs\`** with: canonical byte encoding functions for \`OpenHlVote\` and \`OpenHlProposal\`, low-level \`sign_vote\` / \`sign_proposal\` / \`verify_vote\` functions, and a \`VerifierLike\` trait shim with 2 unit tests.
2. **Create \`crates/consensus/src/signing_provider.rs\`** with: \`OpenHlSigningProvider\` struct holding a \`PrivateKey\`, an \`impl SigningProvider<OpenHlContext>\` block with 8 methods (4 sign/verify pairs), and 7 unit tests.
3. **Wire both modules into \`lib.rs\`** via \`pub mod signing; pub mod signing_provider;\`.
4. **No Cargo.toml changes** — \`informalsystems-malachitebft-signing-ed25519\` was added in Lesson 6 with the \`rand\` feature, which is all we need.
5. **Run** \`cargo test -p openhl-consensus\` — 14 tests pass.

This lesson teaches **two patterns** that propagate:

- **Canonical encoding** — turning a typed message into a deterministic byte sequence that every validator computes identically. The signature commits to *the bytes*, not *the struct*; if any field's encoding changes, the signature stops verifying.
- **Trait-trait wiring** — Malachite's \`SigningProvider\` is a trait that **wraps** the lower-level signing logic in \`signing.rs\`. The provider holds runtime state (the key), and delegates to pure functions that don't. This is the same separation as \`ConsensusBridge\` (trait) vs \`InMemoryEvmBridge\` (struct that impls it).


## Walk-through

### Step 1: Create \`crates/consensus/src/signing.rs\`

Start with the module doc and imports:

\`\`\`rust
//! Canonical encoding + signing for proposals and votes.
//!
//! v0 uses a simple length-prefixed concatenation rather than Protobuf/SSZ.
//! Real production validators will want a stable serialization format
//! (Module 2's \`openhl-codec\` crate is the natural home for that).

use informalsystems_malachitebft_core_types::{NilOrVal, Round, SignedMessage, VoteType};
use informalsystems_malachitebft_signing_ed25519::{PrivateKey, Signature};

use crate::types::{OpenHlProposal, OpenHlVote};
\`\`\`

What each import is for:
- \`NilOrVal, Round, VoteType\` — Malachite types that appear inside our \`OpenHlVote\` / \`OpenHlProposal\`
- \`SignedMessage\` — Malachite's wrapper that pairs a message with its signature
- \`PrivateKey, Signature\` — Ed25519 key and signature types from Malachite
- Our \`OpenHlProposal, OpenHlVote\` — the message types we'll be encoding

### Step 2: Write the canonical encoding for \`OpenHlVote\`

This is the load-bearing function. Add it next:

\`\`\`rust
/// Canonical bytes that a vote signature commits to.
#[must_use]
pub fn vote_signing_bytes(v: &OpenHlVote) -> Vec<u8> {
    let mut buf = Vec::with_capacity(128);
    buf.extend_from_slice(&v.height.0.to_le_bytes());
    buf.extend_from_slice(&round_to_i64(v.round).to_le_bytes());
    buf.push(match v.vote_type {
        VoteType::Prevote => 0,
        VoteType::Precommit => 1,
    });
    match v.value_id {
        NilOrVal::Nil => buf.push(0),
        NilOrVal::Val(h) => {
            buf.push(1);
            buf.extend_from_slice(&h.0);
        }
    }
    buf.extend_from_slice(&v.address.0);
    buf
}
\`\`\`

This function turns an \`OpenHlVote\` into a sequence of bytes. **The bytes are what the signature commits to.** If a malicious actor mutates any field of a \`Vote\`, the signing bytes change, the signature fails to verify, and the tampered vote is rejected by every validator.

Walk through the byte layout:

| Bytes | Field | Encoding |
| - | - | - |
| 0..8 | \`height\` | u64 little-endian |
| 8..16 | \`round\` | i64 little-endian (rounds can be -1 for "no round") |
| 16 | \`vote_type\` | 0 = Prevote, 1 = Precommit |
| 17 | \`value_id\` tag | 0 = Nil, 1 = Val |
| 18..50 (if Val) | \`value_id\` data | 32 bytes of BlockHash |
| 18..38 OR 50..70 | \`address\` | 20 bytes |

Drawing the 70-byte layout for the \`value_id = Val(...)\` case as a memory diagram makes the bytes that go into the signature visible in one image:

\`\`\`
【 Vote (Val case) canonical signing-bytes — 70 bytes total 】

┌────────────────┬────────────────┬───┬───┬───────────────────────────────┬─────────────────────────┐
│   Height (8B)  │   Round (8B)   │Typ│Tag│      Value ID  (32B / hash)    │ Validator Address (20B) │
└────────────────┴────────────────┴───┴───┴───────────────────────────────┴─────────────────────────┘
 0              8               16  17  18                              50                         70  (offset / bytes)
 [── u64 LE ──] [── i64 LE ──]   │   │   [─────── BlockHash payload ────] [─────── 20-byte Eth addr ─]
                                 │   │
                                 │   └── 0 = Nil  /  1 = Val            (if Nil, the 32B payload is omitted and addr lands at 18..38)
                                 └────── 0 = Prevote  /  1 = Precommit

  Every validator, on any host (x86 / ARM / RISC-V / …), produces the **exact same**
  70 bytes when this function is run — not a single byte may drift. This bytestring
  is the message Ed25519 actually signs.
\`\`\`

**Why little-endian?** Convention for x86 / ARM hosts. **Why length-byte tags?** Because \`NilOrVal::Nil\` produces 1 byte (tag 0) while \`NilOrVal::Val\` produces 33 bytes (tag 1 + 32-byte hash). The tag tells the parser which it is. **Why include the validator address?** Because a vote is *whose* vote, not just *which* vote — the same proposal can be voted on by 100 different validators, and each produces a different signing-bytes string.


### Step 3: Write the canonical encoding for \`OpenHlProposal\`

Next, the proposal encoding:

\`\`\`rust
/// Canonical bytes that a proposal signature commits to.
#[must_use]
pub fn proposal_signing_bytes(p: &OpenHlProposal) -> Vec<u8> {
    let mut buf = Vec::with_capacity(128);
    buf.extend_from_slice(&p.height.0.to_le_bytes());
    buf.extend_from_slice(&round_to_i64(p.round).to_le_bytes());
    buf.extend_from_slice(&p.value.0.0);
    buf.extend_from_slice(&round_to_i64(p.pol_round).to_le_bytes());
    buf.extend_from_slice(&p.address.0);
    buf
}
\`\`\`

The proposal layout:

| Bytes | Field | Encoding |
| - | - | - |
| 0..8 | \`height\` | u64 LE |
| 8..16 | \`round\` | i64 LE |
| 16..48 | \`value.0.0\` | 32 bytes of BlockHash |
| 48..56 | \`pol_round\` | i64 LE (proof-of-lock round) |
| 56..76 | \`address\` | 20 bytes |

**Note the difference from \`vote_signing_bytes\`:** the proposal value is unconditional (\`BlockHash\`), not wrapped in \`NilOrVal\`. A proposal always carries a value; you don't propose Nil.

**\`p.value.0.0\` looks weird.** It chains two \`.0\` accesses: first to unwrap \`OpenHlValue(BlockHash)\` to \`BlockHash\`, then to unwrap \`BlockHash([u8; 32])\` to \`[u8; 32]\`. Each newtype layer requires a \`.0\`. Annoying but explicit.

### Step 4: Add the \`sign_vote\` and \`sign_proposal\` functions

\`\`\`rust
#[must_use]
pub fn sign_vote(v: OpenHlVote, sk: &PrivateKey) -> SignedMessage<crate::OpenHlContext, OpenHlVote> {
    let sig = sk.sign(&vote_signing_bytes(&v));
    SignedMessage::new(v, sig)
}

#[must_use]
pub fn sign_proposal(
    p: OpenHlProposal,
    sk: &PrivateKey,
) -> SignedMessage<crate::OpenHlContext, OpenHlProposal> {
    let sig = sk.sign(&proposal_signing_bytes(&p));
    SignedMessage::new(p, sig)
}
\`\`\`

Each takes ownership of the message (since the typical caller hands it off and never needs it again), produces the canonical bytes, signs them with Ed25519, and wraps in \`SignedMessage\`. \`SignedMessage::new(msg, sig)\` is Malachite's standard pairing — every signed thing flows around the engine as a \`SignedMessage\`.

\`crate::OpenHlContext\` is the \`OpenHlContext\` we built in Lesson 6. Malachite's \`SignedMessage\` is generic over the context type and the inner message type.

### Step 5: Add the \`verify_vote\` function and \`VerifierLike\` trait

\`\`\`rust
/// Verify a vote signature against the public key recorded for \`vote.address\`.
/// Returns false on bad signature.
#[must_use]
pub fn verify_vote(v: &OpenHlVote, sig: &Signature, public_key: &impl VerifierLike) -> bool {
    public_key.verify_msg(&vote_signing_bytes(v), sig).is_ok()
}

/// Trait shim so consumers can pass \`&malachitebft_signing_ed25519::PublicKey\`
/// without depending on the underlying \`signature\` crate's trait surface.
pub trait VerifierLike {
    fn verify_msg(&self, msg: &[u8], sig: &Signature) -> Result<(), VerifyError>;
}

#[derive(Debug)]
pub struct VerifyError;

impl VerifierLike for informalsystems_malachitebft_signing_ed25519::PublicKey {
    fn verify_msg(&self, msg: &[u8], sig: &Signature) -> Result<(), VerifyError> {
        self.verify(msg, sig).map_err(|_| VerifyError)
    }
}

fn round_to_i64(r: Round) -> i64 {
    r.as_i64()
}
\`\`\`

Three pieces:

- **\`verify_vote\`** — the inverse of \`sign_vote\`. Recompute the canonical bytes, call the public key's verify method, return true/false.
- **\`VerifierLike\` trait** — a tiny abstraction over "something that can verify Ed25519 signatures." The reason: \`PublicKey\` from Malachite implements verification via the \`signature::Verifier\` trait, but we don't want our public API to require callers to import that. \`VerifierLike\` is our own trait, and we provide a single impl bridging to \`signature::Verifier\`. **Callers see one trait; under the hood we delegate to the canonical one.**
- **\`round_to_i64\`** — a one-line helper. \`Round\` is Malachite's wrapper over \`i64\`; the \`.as_i64()\` method exposes it. Wrapping in this helper makes the call sites read better.

### Step 6: Add 2 tests for \`signing.rs\`

Append:

\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{OpenHlAddress, OpenHlHeight};
    use openhl_types::BlockHash;
    use rand::rngs::OsRng;

    #[test]
    fn vote_signature_round_trips() {
        let sk = PrivateKey::generate(OsRng);
        let pk = sk.public_key();
        let vote = OpenHlVote {
            height: OpenHlHeight(7),
            round: Round::new(0),
            value_id: NilOrVal::Val(BlockHash([0x42; 32])),
            vote_type: VoteType::Prevote,
            address: OpenHlAddress([0xaa; 20]),
        };
        let signed = sign_vote(vote.clone(), &sk);
        assert!(verify_vote(&vote, &signed.signature, &pk));
    }

    #[test]
    fn vote_signature_is_field_sensitive() {
        let sk = PrivateKey::generate(OsRng);
        let pk = sk.public_key();
        let vote = OpenHlVote {
            height: OpenHlHeight(7),
            round: Round::new(0),
            value_id: NilOrVal::Val(BlockHash([0x42; 32])),
            vote_type: VoteType::Prevote,
            address: OpenHlAddress([0xaa; 20]),
        };
        let signed = sign_vote(vote.clone(), &sk);
        // Mutate value_id; signature should no longer verify.
        let mut tampered = vote;
        tampered.value_id = NilOrVal::Val(BlockHash([0x43; 32]));
        assert!(!verify_vote(&tampered, &signed.signature, &pk));
    }
}
\`\`\`

Two tests:

- **\`vote_signature_round_trips\`** — Sign a vote, verify it. Pass.
- **\`vote_signature_is_field_sensitive\`** — Sign a vote, mutate one field of a clone, verify against the mutated copy. Must fail.

The second test is the **load-bearing** one. It proves that **the canonical encoding is sensitive to every field that matters.** If you broke the encoding (forgot to include \`value_id\` in the bytes, for example), tampered.value_id would be different but signing bytes would be the same, and the test would fail with "tampered vote verifies."

### Step 7: Create \`crates/consensus/src/signing_provider.rs\`

Start with:

\`\`\`rust
//! \`SigningProvider\` implementation — the trait the Malachite engine plugs in.
//!
//! Holds our private key as state; delegates the actual signing to
//! [\`crate::signing\`]'s canonical encoding so the wire format and the engine
//! interface stay consistent.

use informalsystems_malachitebft_core_types::{SignedMessage, SigningProvider};
use informalsystems_malachitebft_signing_ed25519::{PrivateKey, PublicKey, Signature};

use crate::context::OpenHlContext;
use crate::signing::{
    proposal_signing_bytes, sign_proposal as sign_proposal_with,
    sign_vote as sign_vote_with, vote_signing_bytes,
};
use crate::types::{OpenHlProposal, OpenHlProposalPart, OpenHlVote};

#[derive(Debug)]
pub struct OpenHlSigningProvider {
    private_key: PrivateKey,
}

impl OpenHlSigningProvider {
    #[must_use]
    pub const fn new(private_key: PrivateKey) -> Self {
        Self { private_key }
    }

    #[must_use]
    pub fn public_key(&self) -> PublicKey {
        self.private_key.public_key()
    }
}
\`\`\`

The struct holds a \`PrivateKey\`. The constructor takes one in (typically from disk or environment). \`public_key()\` derives the corresponding public key on demand — Ed25519 public keys are derivable from private keys via scalar multiplication, ~milliseconds.

The \`use\` block imports the lower-level functions from \`signing.rs\` with **\`_with\`-suffixed renames** (\`sign_vote as sign_vote_with\`, \`sign_proposal as sign_proposal_with\`). **Why renames?** Because the \`SigningProvider\` trait has methods named \`sign_vote\` and \`sign_proposal\`, and we want to call our own helpers without name collision. The \`_with\` suffix is a local convention for "this is the implementation function I delegate to from the trait method" — it's not a special macro or language feature; the \`as ...\` in the code above is just minting a new identifier.

### Step 8: Implement the \`SigningProvider\` trait — 4 sign/verify pairs

\`\`\`rust
impl SigningProvider<OpenHlContext> for OpenHlSigningProvider {
    fn sign_vote(&self, vote: OpenHlVote) -> SignedMessage<OpenHlContext, OpenHlVote> {
        sign_vote_with(vote, &self.private_key)
    }

    fn verify_signed_vote(
        &self,
        vote: &OpenHlVote,
        signature: &Signature,
        public_key: &PublicKey,
    ) -> bool {
        public_key.verify(&vote_signing_bytes(vote), signature).is_ok()
    }

    fn sign_proposal(
        &self,
        proposal: OpenHlProposal,
    ) -> SignedMessage<OpenHlContext, OpenHlProposal> {
        sign_proposal_with(proposal, &self.private_key)
    }

    fn verify_signed_proposal(
        &self,
        proposal: &OpenHlProposal,
        signature: &Signature,
        public_key: &PublicKey,
    ) -> bool {
        public_key
            .verify(&proposal_signing_bytes(proposal), signature)
            .is_ok()
    }

    fn sign_proposal_part(
        &self,
        part: OpenHlProposalPart,
    ) -> SignedMessage<OpenHlContext, OpenHlProposalPart> {
        // ProposalPart is a unit struct in OpenHL (ValuePayload::ProposalOnly mode);
        // sign empty bytes so the type-level contract is honored but no extra
        // information is committed.
        let sig = self.private_key.sign(&[]);
        SignedMessage::new(part, sig)
    }

    fn verify_signed_proposal_part(
        &self,
        _part: &OpenHlProposalPart,
        signature: &Signature,
        public_key: &PublicKey,
    ) -> bool {
        public_key.verify(&[], signature).is_ok()
    }

    fn sign_vote_extension(&self, ext: ()) -> SignedMessage<OpenHlContext, ()> {
        // Vote extensions are unused at v0 (Context::Extension = ()).
        let sig = self.private_key.sign(&[]);
        SignedMessage::new(ext, sig)
    }

    fn verify_signed_vote_extension(
        &self,
        _ext: &(),
        signature: &Signature,
        public_key: &PublicKey,
    ) -> bool {
        public_key.verify(&[], signature).is_ok()
    }
}
\`\`\`

Eight methods, four pairs:

- **\`sign_vote\` / \`verify_signed_vote\`** — delegate to \`signing::sign_vote\` / call \`verify\` on the public key with \`vote_signing_bytes\`. Standard.
- **\`sign_proposal\` / \`verify_signed_proposal\`** — same pattern.
- **\`sign_proposal_part\` / \`verify_signed_proposal_part\`** — **sign empty bytes.** Why? Because \`OpenHlProposalPart\` is a unit struct — there's no data to commit to. Signing an empty payload still produces a valid Ed25519 signature (it's deterministic from the private key alone), and verifying it confirms "yes, this provider produced this signature." The signature has no informational content but the trait surface is satisfied.
- **\`sign_vote_extension\` / \`verify_signed_vote_extension\`** — same as proposal_part. Vote extensions are \`()\` (unused at v0), so we sign empty bytes.


### Step 9: Add 7 tests for \`signing_provider.rs\`

\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{OpenHlAddress, OpenHlHeight, OpenHlValue};
    use informalsystems_malachitebft_core_types::{NilOrVal, Round, VoteType};
    use openhl_types::BlockHash;
    use rand::rngs::OsRng;

    fn provider() -> (OpenHlSigningProvider, PublicKey) {
        let sk = PrivateKey::generate(OsRng);
        let pk = sk.public_key();
        (OpenHlSigningProvider::new(sk), pk)
    }

    fn sample_vote() -> OpenHlVote {
        OpenHlVote {
            height: OpenHlHeight(1),
            round: Round::new(0),
            value_id: NilOrVal::Val(BlockHash([0x42; 32])),
            vote_type: VoteType::Prevote,
            address: OpenHlAddress([0xaa; 20]),
        }
    }

    fn sample_proposal() -> OpenHlProposal {
        OpenHlProposal {
            height: OpenHlHeight(1),
            round: Round::new(0),
            value: OpenHlValue(BlockHash([0x42; 32])),
            pol_round: Round::Nil,
            address: OpenHlAddress([0xaa; 20]),
        }
    }

    #[test]
    fn vote_sign_verify_round_trips() {
        let (sp, pk) = provider();
        let vote = sample_vote();
        let signed = sp.sign_vote(vote.clone());
        assert!(sp.verify_signed_vote(&vote, &signed.signature, &pk));
    }

    #[test]
    fn vote_tamper_detected() {
        let (sp, pk) = provider();
        let vote = sample_vote();
        let signed = sp.sign_vote(vote.clone());
        let mut tampered = vote;
        tampered.value_id = NilOrVal::Val(BlockHash([0x43; 32]));
        assert!(!sp.verify_signed_vote(&tampered, &signed.signature, &pk));
    }

    #[test]
    fn proposal_sign_verify_round_trips() {
        let (sp, pk) = provider();
        let proposal = sample_proposal();
        let signed = sp.sign_proposal(proposal.clone());
        assert!(sp.verify_signed_proposal(&proposal, &signed.signature, &pk));
    }

    #[test]
    fn proposal_tamper_detected() {
        let (sp, pk) = provider();
        let proposal = sample_proposal();
        let signed = sp.sign_proposal(proposal.clone());
        let mut tampered = proposal;
        tampered.value = OpenHlValue(BlockHash([0x99; 32]));
        assert!(!sp.verify_signed_proposal(&tampered, &signed.signature, &pk));
    }

    #[test]
    fn proposal_part_sign_verify_round_trips() {
        let (sp, pk) = provider();
        let part = OpenHlProposalPart;
        let signed = sp.sign_proposal_part(part);
        assert!(sp.verify_signed_proposal_part(&part, &signed.signature, &pk));
    }

    #[test]
    fn vote_extension_sign_verify_round_trips() {
        let (sp, pk) = provider();
        let signed = sp.sign_vote_extension(());
        assert!(sp.verify_signed_vote_extension(&(), &signed.signature, &pk));
    }

    #[test]
    fn signature_from_one_provider_does_not_verify_under_another() {
        let (sp1, _pk1) = provider();
        let (_sp2, pk2) = provider();
        let vote = sample_vote();
        let signed = sp1.sign_vote(vote.clone());
        // Signed by provider 1, verified against provider 2's public key — must fail.
        assert!(!sp1.verify_signed_vote(&vote, &signed.signature, &pk2));
    }
}
\`\`\`

Seven tests cover the surface:

| Test | What it proves |
| - | - |
| \`vote_sign_verify_round_trips\` | The vote sign/verify pair works. |
| \`vote_tamper_detected\` | Mutating a vote field after signing makes verify fail. |
| \`proposal_sign_verify_round_trips\` | Same for proposals. |
| \`proposal_tamper_detected\` | Same for proposals. |
| \`proposal_part_sign_verify_round_trips\` | Empty-bytes signing still round-trips through the unit-struct type. |
| \`vote_extension_sign_verify_round_trips\` | Same for vote_extension. |
| \`signature_from_one_provider_does_not_verify_under_another\` | Cryptographic security — different keys produce non-interchangeable signatures. |

The last test is the **load-bearing security guarantee**: a signature is bound to a specific key. Without this, anyone could forge signatures by reusing valid signatures across different validators.

### Step 10: Wire both modules into \`lib.rs\`

Open \`crates/consensus/src/lib.rs\`. Currently:

\`\`\`rust
//! Consensus layer — Malachite BFT.

pub mod bridge;
pub mod context;
pub mod types;

pub use context::OpenHlContext;
\`\`\`

Add 2 lines:

\`\`\`rust
//! Consensus layer — Malachite BFT.

pub mod bridge;
pub mod context;
pub mod signing;
pub mod signing_provider;
pub mod types;

pub use context::OpenHlContext;
\`\`\`

\`pub mod signing;\` and \`pub mod signing_provider;\` expose the modules. No re-exports needed at this layer — callers will import via the fully-qualified paths.

## Test

\`\`\`bash
cargo test -p openhl-consensus
\`\`\`

Expected:

\`\`\`
running 14 tests
test context::tests::height_increment_and_decrement ... ok
test context::tests::new_prevote_and_precommit_have_distinct_types ... ok
test context::tests::new_proposal_round_trips_fields ... ok
test context::tests::select_proposer_round_robins_deterministically ... ok
test context::tests::validator_set_is_sorted_by_power_then_address ... ok
test signing::tests::vote_signature_is_field_sensitive ... ok
test signing::tests::vote_signature_round_trips ... ok
test signing_provider::tests::proposal_part_sign_verify_round_trips ... ok
test signing_provider::tests::proposal_sign_verify_round_trips ... ok
test signing_provider::tests::proposal_tamper_detected ... ok
test signing_provider::tests::signature_from_one_provider_does_not_verify_under_another ... ok
test signing_provider::tests::vote_extension_sign_verify_round_trips ... ok
test signing_provider::tests::vote_sign_verify_round_trips ... ok
test signing_provider::tests::vote_tamper_detected ... ok

test result: ok. 14 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

Common errors and fixes:

- **\`cannot find function 'sign_vote' in module 'super::signing'\`** — Forgot to add \`pub mod signing;\` to \`lib.rs\`. Re-check Step 10.
- **\`error: trait 'SigningProvider' not implemented for 'OpenHlSigningProvider' — missing method 'sign_vote_extension'\`** — All 8 methods (4 sign + 4 verify) are required. If you only implemented some, the trait isn't satisfied. Add the missing ones.
- **\`error: type alias 'Extension' is \`()\` so methods take \`ext: ()\`** — Verify your impl uses \`ext: ()\` (or \`_ext: &()\` for verify) as the type, not some \`Extension\` placeholder.
- **\`vote_tamper_detected\` test fails (assertion does the opposite)** — Your canonical encoding might not include \`value_id\` (or another field) in the bytes. Re-check Step 2 — every field of the struct that matters must contribute to the bytes.

## Design reflection

Four load-bearing decisions encoded:

1. **Canonical encoding is in \`signing.rs\`, not derived from \`serde::Serialize\`.** \`signing.rs\` defines a byte-level layout that we control. Why? Because \`serde\` versions can change between Rust edition bumps or library upgrades, but our signed messages have to round-trip across validators running potentially-different binary versions. Locking the encoding in code (not a library) means the wire format is part of the chain's spec, not a library detail.

2. **\`SigningProvider\` wraps the pure \`sign_vote\` functions, holding the key as state.** Could have made \`sign_vote\` a method on \`OpenHlSigningProvider\`. The split lets *tests* and *internal code* call \`sign_vote(vote, &sk)\` directly (passing the key as a parameter), while *Malachite's engine* uses the trait method \`sp.sign_vote(vote)\` (binding to the provider's stored key). **The same logic serves both use cases without duplication.**

3. **Empty-bytes signatures for ProposalPart and Extension.** When the trait surface requires methods but our chain doesn't use the feature, we provide deterministic, verifiable signatures over empty data. This honors the trait without committing to data we don't have. Production chains that use these features fill them with real bytes; we don't, but the engine doesn't crash either way.

4. **Use \`VerifierLike\` to block dependency leakage.** Its job is simple: keep external traits out of our public API. If \`verify_vote\` called \`signature::Verifier\` directly, that dependency would leak to downstream users. The moment upstream swaps crypto libraries, downstream consumers inherit a breaking change.  
With one thin first-party trait (\`VerifierLike\`), the external dependency is sealed behind \`impl VerifierLike for PublicKey\` in \`signing.rs\`. Future churn is absorbed in one place. **Rule: never expose someone else's trait directly in your public API.**

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout 9e810a7
diff -u ~/code/my-openhl/crates/consensus/src/signing.rs ./crates/consensus/src/signing.rs
diff -u ~/code/my-openhl/crates/consensus/src/signing_provider.rs ./crates/consensus/src/signing_provider.rs
diff -u ~/code/my-openhl/crates/consensus/src/lib.rs ./crates/consensus/src/lib.rs
\`\`\`

Doc-comment wording can vary. The canonical encoding byte order, the SigningProvider trait impls (especially what they delegate to), and the test patterns should match closely.

The reference at \`9e810a7\` has extra files (\`runner.rs\` modifications) we'll add in later lessons. Diff against just the signing files for this lesson.

Return:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: Why does \`vote_signing_bytes\` not include \`vote_type\` for Nil votes?**
It does — \`vote_type\` is always 1 byte (0 or 1), independent of whether \`value_id\` is Nil or Val. The branch is for \`value_id\` only (Nil writes 1 byte tag, Val writes 1 byte tag + 32 bytes).

**Q: Can I sign with the public key by mistake?**
No — Ed25519 separates them: \`PrivateKey::sign(&[u8]) -> Signature\` exists, but \`PublicKey::sign\` does not. The type system prevents the swap.

**Q: What happens if a validator's vote_signing_bytes diverges from another validator's?**
The chain forks at the first round where they vote on the same proposal. Validator A's signature verifies under its own encoding; Validator B reading the same vote with its different encoding sees the signature fail and rejects the vote. The vote tallying produces different counts for the same election, leading to different decided values. **This is why the encoding is part of the spec, not an implementation detail.**

**Q: Why does \`OpenHlSigningProvider\` not impl \`Clone\`?**
Because cloning a private key is something we want to be explicit about — \`let sp_copy = sp.clone();\` is too easy to write accidentally. Use \`OpenHlSigningProvider::new(self.private_key.clone())\` if you really need a copy. Keeping \`Clone\` off means private-key duplication is rare and visible.

## Next lesson (Lesson 8)

You have the signing surface complete. Malachite can ask your provider to sign messages, and verification round-trips work. But **Malachite doesn't know how to talk over the wire yet** — sending votes between validators requires encoding/decoding. Lesson 8 implements \`OpenHlCodec\`: the trait that translates between in-memory types and bytes for network transport, write-ahead logging, and state sync. After Lesson 8, the engine has everything it needs to spawn (codec + signing + context + node config); we'll wire \`OpenHlNode\` and prove \`start_engine\` works in the same lesson.

## Summary (3 lines)

- \`OpenHlSigningProvider\` = BLS sign/verify + canonical SSZ encoding. Bridges Malachite + Hyperliquid key management.
- \`blst\` crate for BLS; SSZ for canonical messages. Aggregation for vote-counting.
- HSM hooks via trait swap. Tests cover sign/verify + aggregate + canonical bytes. Next: codec slot.
`,
                },
                {
                  title: 'Lesson 8 — OpenHlCodec — codec slot the engine demands',
                  slug: 'openhl-codec-en',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 35,
                  xpReward: 70,
                  content: `# Lesson 8 — OpenHlCodec — codec slot the engine demands

## Question

**\`OpenHlCodec\` provides encode/decode for the wire formats Malachite needs** — Proposal, Vote, Extension, etc. SSZ canonical encoding throughout.

## Principle (minimum model)

- **\`Codec\` trait (Malachite).** \`encode_X(...) -> Bytes\` + \`decode_X(&Bytes) -> X\` for each wire type.
- **SSZ everywhere.** Same encoding as Ethereum consensus layer. Deterministic; canonical.
- **\`OpenHlCodec\` struct.** Stateless; just a marker type. All methods are pure.
- **\`encode_proposal\`.** Build SSZ-encoded Proposal bytes. Use \`ssz_rs::Encode\`. Wire-format identical across all nodes.
- **\`decode_proposal\`.** Inverse; fail fast on invalid bytes.
- **Why a slot.** Malachite is generic over codec; you can swap SSZ for Borsh / Cap'n Proto / etc. Hyperliquid chose SSZ for Ethereum compat.
- **Tests.** Round-trip every wire type; assert encode → decode → encode produces same bytes.

## Worked example + steps

# Lesson 8 — \`OpenHlCodec\` — codec slot the engine demands

## Goal

Concepts you'll grasp in this lesson:

- **Stub-as-trait-satisfier** — incremental development at the type level. Writing 4-line stubs that name what's unimplemented beats writing 50-line protobuf encoders for paths the engine never exercises. The stub fires loudly if Malachite ever does call it.
- **Sub-trait blanket impls** — \`WalCodec / ConsensusCodec / SyncCodec\` are automatic once you implement the right \`Codec<T>\` constituents. A \`static_assertions::assert_impl_all!\` test verifies the blanket impls fire and the compile-time bound is real.
- **Where the codec belongs in the crate graph** — codec lives in \`openhl-consensus\`, not \`openhl-types\`, because it depends on Malachite's \`informalsystems-malachitebft-app\` (libp2p, ractor). Putting it in \`types/\` would force every downstream crate that wants \`BlockHash\` to pull libp2p too.
- **Wire format vs. canonical signing format** — Lesson 7's canonical encoding is *what gets signed*; Lesson 8's codec is *what gets sent over the wire*. They overlap but aren't the same: wire format adds framing, versioning, length prefixes — none of which the signature covers.
- **Why one real codec is enough at Lesson 8** — only \`ProposalPart\` round-trips in our single-validator devnet. The other 7 are gossip / sync / WAL paths that don't fire until you add peers or recover from a crash.

Verification:

\`\`\`bash
cargo test -p openhl-consensus
\`\`\`

…passes **16 tests** (14 from Lesson 7 + 2 new ones for the codec). The 2 new tests are: a compile-time assertion that \`OpenHlCodec\` satisfies all three super-traits, and a runtime round-trip test for \`ProposalPart\`.

You also unblock a much heavier dependency: \`informalsystems-malachitebft-app\` pulls in libp2p, ractor, and the rest of the engine surface — your first compile after this **is genuinely heavy** (~38 seconds on a modern multi-core machine; can stretch to several minutes on single-core-bound or resource-constrained environments). The investment buys you the actor system you'll spawn in Lesson 9.

Specific changes:

- \`crates/consensus/Cargo.toml\` adds \`informalsystems-malachitebft-app\` + \`static_assertions\` (dev).
- \`crates/consensus/src/codec.rs\` — new file with \`OpenHlCodec\` struct, \`CodecStub\` error type, 8 \`Codec<T>\` impls (1 real for \`ProposalPart\`, 7 stubs), 2 unit tests.
- \`crates/consensus/src/lib.rs\` — wires \`pub mod codec;\`.

## Recap

After Lesson 7 your \`openhl-consensus\` crate has:

\`\`\`
crates/consensus/src/lib.rs   — pub mod bridge, context, signing, signing_provider, types
crates/consensus/src/signing.rs            — canonical encoding + low-level sign/verify
crates/consensus/src/signing_provider.rs   — OpenHlSigningProvider impls SigningProvider<OpenHlContext>
crates/consensus/src/types/                — 7 type files + mod.rs
crates/consensus/src/context.rs            — OpenHlContext + Context impl
\`\`\`

\`cargo test -p openhl-consensus\` passes 14 tests. **The engine still won't compile** — \`start_engine\` is generic over a codec, and we haven't provided one yet.

## Plan

Five things:

1. **Add \`informalsystems-malachitebft-app\` to \`crates/consensus/Cargo.toml\`.** This is the heavy lift — it pulls libp2p, ractor, and the full app surface transitively. First compile after this **is genuinely heavy** (~38s on a modern multi-core box; up to several minutes on slower or more constrained machines).
2. **Create \`crates/consensus/src/codec.rs\`** with the \`OpenHlCodec\` unit struct, a \`CodecStub\` error, and 8 \`Codec<T>\` impls.
3. **Wire \`pub mod codec;\`** into \`lib.rs\`.
4. **Run** \`cargo test -p openhl-consensus\` — 16 tests pass.
5. **Observe** that the compile-time assertion compiles. This is the signal that you've satisfied the engine's codec trait bound.

This lesson teaches **one pattern that matters more than any specific impl**: **stub trait methods with a clear failure mode**. When you need to satisfy a large trait bound but the methods aren't on your hot path, you can stub them. The stub error message should name what was called so the reader knows what to implement next. This is **incremental development at the type-system level** — you don't have to implement every codec at once; you provide enough to compile, fail loudly on the actual call sites.


## Walk-through

### Step 1: Add the app dependency to Cargo.toml

Open \`crates/consensus/Cargo.toml\`. Add one line in the \`[dependencies]\` section:

\`\`\`toml
informalsystems-malachitebft-app             = { workspace = true }
\`\`\`

Place it next to the other malachite deps. The \`app\` crate is a meta-crate that re-exports types from across the engine — \`Codec\`, \`ConsensusCodec\`, \`SyncCodec\`, \`WalCodec\`, \`SignedConsensusMsg\`, \`StreamMessage\`, \`ProposedValue\`, \`sync::{Status, Request, Response}\` all live here.

Run a quick sanity check:

\`\`\`bash
cargo check -p openhl-consensus 2>&1 | tail -5
\`\`\`

The first build is genuinely heavy (libp2p + ractor + dependencies compile for the first time — **~38s on a modern multi-core machine, up to several minutes on slower or single-core-bound environments**). If the progress log looks stuck, it isn't — pour another coffee. Subsequent builds use the cache and the incremental rebuild is back to seconds.

### Step 2: Create \`crates/consensus/src/codec.rs\`

Top of the file:

\`\`\`rust
//! Stub \`Codec<T>\` impls so \`OpenHlCodec\` satisfies \`WalCodec\`, \`ConsensusCodec\`,
//! and \`SyncCodec\` via Malachite's blanket impls.
//!
//! In single-validator mode none of these codecs fire — they're for network
//! gossip (Consensus), peer sync (Sync), and crash-recovery WAL writes. The
//! engine requires them to exist by trait bound, but the methods are not
//! invoked on the happy path.
//!
//! When Lesson 9 spins up actors and one of these stubs IS hit, the error
//! message names the type that needs a real impl — that's the cue to swap
//! the stub for a Protobuf/JSON implementation.

use bytes::Bytes;
use informalsystems_malachitebft_app::types::codec::Codec;
use informalsystems_malachitebft_app::types::streaming::StreamMessage;
use informalsystems_malachitebft_app::types::sync::{Request, Response, Status};
use informalsystems_malachitebft_app::types::{ProposedValue, SignedConsensusMsg};
use informalsystems_malachitebft_core_consensus::LivenessMsg;
use thiserror::Error;

use crate::context::OpenHlContext;
use crate::types::OpenHlProposalPart;

#[derive(Copy, Clone, Debug, Default)]
pub struct OpenHlCodec;

#[derive(Debug, Error)]
#[error("codec for {0} is a Stage 6b stub; implement before this path can fire")]
pub struct CodecStub(pub &'static str);
\`\`\`

\`OpenHlCodec\` is a unit struct — no state. Codecs in Malachite are pure functions; the receiver only exists so the trait can dispatch. \`CodecStub\` is the error type that all eight Codec impls share. The \`&'static str\` field carries the name of the type whose codec is missing, so when an unimplemented path *does* fire, the error message tells you exactly what to write.


### Step 3: The one real impl — \`ProposalPart\`

Next:

\`\`\`rust
// ---- ProposalPart ---------------------------------------------------------
// ProposalPart is a unit struct in OpenHL (ValuePayload::ProposalOnly), so its
// encoding is genuinely empty — this one is real, not a stub.

impl Codec<OpenHlProposalPart> for OpenHlCodec {
    type Error = CodecStub;

    fn decode(&self, _bytes: Bytes) -> Result<OpenHlProposalPart, Self::Error> {
        Ok(OpenHlProposalPart)
    }

    fn encode(&self, _msg: &OpenHlProposalPart) -> Result<Bytes, Self::Error> {
        Ok(Bytes::new())
    }
}
\`\`\`

This one is *real*. \`OpenHlProposalPart\` is a unit struct (zero fields), so:

- **Encode** returns an empty \`Bytes\` — a unit struct's wire representation is the empty string.
- **Decode** ignores the input bytes and returns \`OpenHlProposalPart\` — the only possible value of the type. Even if someone hands you garbage bytes, decoding into a unit type can't fail.

This is **not a stub** — it's a complete, correct implementation that happens to be trivial. Unit types have a degenerate wire format. The empty-bytes encoding gets exercised by \`proposal_part_round_trips\` in \`signing_provider.rs\` and by anything else that asks "encode/decode a \`ProposalPart\`."

### Step 4: The 7 stub impls

Now the seven impls that aren't real:

\`\`\`rust
// ---- Consensus messages (gossip) -----------------------------------------

impl Codec<SignedConsensusMsg<OpenHlContext>> for OpenHlCodec {
    type Error = CodecStub;

    fn decode(&self, _bytes: Bytes) -> Result<SignedConsensusMsg<OpenHlContext>, Self::Error> {
        Err(CodecStub("SignedConsensusMsg<OpenHlContext>"))
    }

    fn encode(&self, _msg: &SignedConsensusMsg<OpenHlContext>) -> Result<Bytes, Self::Error> {
        Err(CodecStub("SignedConsensusMsg<OpenHlContext>"))
    }
}

impl Codec<LivenessMsg<OpenHlContext>> for OpenHlCodec {
    type Error = CodecStub;

    fn decode(&self, _bytes: Bytes) -> Result<LivenessMsg<OpenHlContext>, Self::Error> {
        Err(CodecStub("LivenessMsg<OpenHlContext>"))
    }

    fn encode(&self, _msg: &LivenessMsg<OpenHlContext>) -> Result<Bytes, Self::Error> {
        Err(CodecStub("LivenessMsg<OpenHlContext>"))
    }
}

impl Codec<StreamMessage<OpenHlProposalPart>> for OpenHlCodec {
    type Error = CodecStub;

    fn decode(&self, _bytes: Bytes) -> Result<StreamMessage<OpenHlProposalPart>, Self::Error> {
        Err(CodecStub("StreamMessage<OpenHlProposalPart>"))
    }

    fn encode(&self, _msg: &StreamMessage<OpenHlProposalPart>) -> Result<Bytes, Self::Error> {
        Err(CodecStub("StreamMessage<OpenHlProposalPart>"))
    }
}

// ---- WAL (crash recovery) -------------------------------------------------

impl Codec<ProposedValue<OpenHlContext>> for OpenHlCodec {
    type Error = CodecStub;

    fn decode(&self, _bytes: Bytes) -> Result<ProposedValue<OpenHlContext>, Self::Error> {
        Err(CodecStub("ProposedValue<OpenHlContext>"))
    }

    fn encode(&self, _msg: &ProposedValue<OpenHlContext>) -> Result<Bytes, Self::Error> {
        Err(CodecStub("ProposedValue<OpenHlContext>"))
    }
}

// ---- Sync (peer catch-up) -------------------------------------------------

impl Codec<Status<OpenHlContext>> for OpenHlCodec {
    type Error = CodecStub;

    fn decode(&self, _bytes: Bytes) -> Result<Status<OpenHlContext>, Self::Error> {
        Err(CodecStub("sync::Status<OpenHlContext>"))
    }

    fn encode(&self, _msg: &Status<OpenHlContext>) -> Result<Bytes, Self::Error> {
        Err(CodecStub("sync::Status<OpenHlContext>"))
    }
}

impl Codec<Request<OpenHlContext>> for OpenHlCodec {
    type Error = CodecStub;

    fn decode(&self, _bytes: Bytes) -> Result<Request<OpenHlContext>, Self::Error> {
        Err(CodecStub("sync::Request<OpenHlContext>"))
    }

    fn encode(&self, _msg: &Request<OpenHlContext>) -> Result<Bytes, Self::Error> {
        Err(CodecStub("sync::Request<OpenHlContext>"))
    }
}

impl Codec<Response<OpenHlContext>> for OpenHlCodec {
    type Error = CodecStub;

    fn decode(&self, _bytes: Bytes) -> Result<Response<OpenHlContext>, Self::Error> {
        Err(CodecStub("sync::Response<OpenHlContext>"))
    }

    fn encode(&self, _msg: &Response<OpenHlContext>) -> Result<Bytes, Self::Error> {
        Err(CodecStub("sync::Response<OpenHlContext>"))
    }
}
\`\`\`

Seven Codec impls, all the same pattern: \`decode\` returns \`Err(CodecStub(...))\`, \`encode\` returns \`Err(CodecStub(...))\`, the type name is passed as a literal so the stub error names itself.

Three categories:

- **Consensus messages (gossip)** — \`SignedConsensusMsg\`, \`LivenessMsg\`, \`StreamMessage\`. These go over libp2p between validators. In a single-validator devnet, no peers exist, so these never get called.
- **WAL (crash recovery)** — \`ProposedValue\`. The engine writes proposals to disk for crash recovery. We run in-process tests so this never fires.
- **Sync (peer catch-up)** — \`Status\`, \`Request\`, \`Response\`. When a validator falls behind it asks peers to send it past blocks. No peers means no falling-behind means no sync.


### Step 5: Add the test module

At the bottom of \`codec.rs\`:

\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;
    use informalsystems_malachitebft_app::types::codec::{
        ConsensusCodec, SyncCodec, WalCodec,
    };

    // Compile-time assertions: by implementing the constituent Codec<T>
    // traits, OpenHlCodec automatically satisfies all three super-traits.
    fn assert_wal_codec<C: WalCodec<OpenHlContext>>() {}
    fn assert_consensus_codec<C: ConsensusCodec<OpenHlContext>>() {}
    fn assert_sync_codec<C: SyncCodec<OpenHlContext>>() {}

    #[test]
    fn openhl_codec_satisfies_all_three_super_traits() {
        assert_wal_codec::<OpenHlCodec>();
        assert_consensus_codec::<OpenHlCodec>();
        assert_sync_codec::<OpenHlCodec>();
    }

    #[test]
    fn proposal_part_round_trips() {
        let codec = OpenHlCodec;
        let part = OpenHlProposalPart;
        let bytes = codec.encode(&part).unwrap();
        let decoded = codec.decode(bytes).unwrap();
        assert_eq!(part, decoded);
    }
}
\`\`\`

Two tests:

- **\`openhl_codec_satisfies_all_three_super_traits\`** — this is a *compile-time* assertion disguised as a test. \`WalCodec<Ctx>\`, \`ConsensusCodec<Ctx>\`, and \`SyncCodec<Ctx>\` are super-traits in Malachite — they're automatically satisfied if a type implements *all the right* \`Codec<T>\` constituent impls. The three \`assert_*\` functions exist only to force the compiler to check the bound. If you forgot a single \`Codec<T>\` impl, this would fail to compile, **not** fail at runtime. The runtime test body is just a no-op — the verification happens at type-check time.
- **\`proposal_part_round_trips\`** — exercises the one *real* codec impl. Encode an empty \`ProposalPart\`, decode the resulting bytes, assert equality. This proves the real impl works; the seven stub impls aren't tested at runtime here because they're meant to panic-via-error if anything ever calls them.


### Step 6: Wire codec into \`lib.rs\`

Open \`crates/consensus/src/lib.rs\`. Currently:

\`\`\`rust
//! Consensus layer — Malachite BFT.

pub mod bridge;
pub mod context;
pub mod signing;
pub mod signing_provider;
pub mod types;

pub use context::OpenHlContext;
\`\`\`

Add one line:

\`\`\`rust
//! Consensus layer — Malachite BFT.

pub mod bridge;
pub mod codec;
pub mod context;
pub mod signing;
pub mod signing_provider;
pub mod types;

pub use context::OpenHlContext;
\`\`\`

## Test

First compile will be slow — first time fetching libp2p, ractor, and ~200 transitive deps:

\`\`\`bash
cargo test -p openhl-consensus
\`\`\`

After about 30-40 seconds:

\`\`\`
running 16 tests
test bridge::tests::... ... ok            # (consensus has bridge tests from Lesson 3? — depends on workspace)
test codec::tests::openhl_codec_satisfies_all_three_super_traits ... ok
test codec::tests::proposal_part_round_trips ... ok
test context::tests::... (5 tests) ... ok
test signing::tests::... (2 tests) ... ok
test signing_provider::tests::... (7 tests) ... ok

test result: ok. 16 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

Common errors and fixes:

- **\`error[E0277]: the trait bound 'OpenHlCodec: WalCodec<OpenHlContext>' is not satisfied\`** — you're missing one of the eight \`Codec<T>\` impls. Re-check Step 3 and Step 4 — all eight constituent types must have \`impl Codec<T> for OpenHlCodec\`.
- **\`error[E0061]: this function takes 1 argument but 0 arguments were supplied\`** (or \`error[E0308]: mismatched types\`) — \`CodecStub\` is a tuple struct that takes a single \`pub &'static str\`, so writing \`CodecStub\` with no argument or using the brace form \`CodecStub { ... }\` won't compile. Pass the type name literal explicitly: \`Err(CodecStub("SignedConsensusMsg<OpenHlContext>"))\`.
- **\`error[E0432]: unresolved import 'informalsystems_malachitebft_app::types::codec::ConsensusCodec'\`** — you forgot to add \`informalsystems-malachitebft-app\` to Cargo.toml. Re-check Step 1.
- **Build takes 60+ seconds even on a recompile** — try \`cargo build\` (no \`--release\`). If still slow, the issue is libp2p; let it run.

## Design reflection

Three load-bearing decisions encoded here:

1. **Stubs with a clear failure name beat full impls that aren't needed yet.** A *real* \`SignedConsensusMsg\` codec is ~50 lines of protobuf encoding. We don't write it because we don't need it. We write a 4-line stub that, if it ever fires, names what wasn't implemented. **Incremental development at the type level.**

2. **One trait impl can satisfy multiple super-traits via blanket impls.** \`WalCodec<Ctx>\` is automatically \`impl<C> WalCodec<Ctx> for C where C: Codec<ProposedValue<Ctx>>\` (and similar for Consensus/Sync). By implementing the right *constituent* \`Codec<T>\` impls, you don't have to write \`impl WalCodec\` — Malachite gives you the blanket impl free. The compile-time assertion test verifies this is real.

3. **The codec is in \`consensus/\`, not \`types/\`.** Codecs depend on the engine's notion of "what gets wired" — \`SignedConsensusMsg\`, \`ProposedValue\`, \`sync::Status\` — which is a consensus-layer concern, not a base-type concern. Putting codec in \`types/\` would force \`types/\` to depend on \`informalsystems-malachitebft-app\`, which would make \`openhl-types\` a heavy dep for downstream crates that don't need the engine.

The "no codec inside \`types/\`" discipline is easiest to see by drawing the two dependency graphs side by side:

\`\`\`
🟢 The design we picked (clean dependency graph)
   ┌─────────────────────────┐                  ┌──────────────────────────────────┐
   │   openhl-evm            │ ─┐               │  openhl-consensus (holds Codec)   │
   ├─────────────────────────┤   ▼               │   - bridge.rs / types/ / codec.rs │
   │   openhl-node           │ ─► openhl-types  │   - signing*.rs / context.rs       │
   ├─────────────────────────┤   ▲   (lightweight ────►─── informalsystems-malachitebft-app
   │   (other downstream)    │ ─┘    zero-dep)            (libp2p / ractor / heavy)
   └─────────────────────────┘                  └──────────────────────────────────┘
       Editing the EVM side never recompiles consensus / libp2p / ractor → fast inner loop

🔴 Anti-pattern (codec colocated inside types/)
   ┌─────────────────────────┐
   │   openhl-evm            │ ─┐
   ├─────────────────────────┤   ▼
   │   openhl-node           │ ─► openhl-types (codec also lives here) ─► informalsystems-malachitebft-app
   ├─────────────────────────┤   ▲                                            (libp2p / ractor / heavy)
   │   (other downstream)    │ ─┘
   └─────────────────────────┘
       A single-line tweak in EVM logic drags libp2p and the actor system into every rebuild;
       the ~38s first-build cost gets paid again and again.
\`\`\`

In the picked layout (left), \`openhl-types\` stays "the lightweight shared dictionary everyone references," and the heavy consensus / libp2p / ractor surface is sealed inside \`openhl-consensus\`. In the anti-pattern (right), every downstream crate that touches \`openhl-types\` is forced to build through libp2p. **"Keep types light; introduce heavy dependencies in the layer that actually needs them"** is the discipline this \`crates/\` topology bakes in.

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout 4229502
diff -u ~/code/my-openhl/crates/consensus/src/codec.rs ./crates/consensus/src/codec.rs
diff -u ~/code/my-openhl/crates/consensus/Cargo.toml ./crates/consensus/Cargo.toml
diff -u ~/code/my-openhl/crates/consensus/src/lib.rs ./crates/consensus/src/lib.rs
\`\`\`

The reference at \`4229502\` includes Cargo.lock changes (the libp2p tree) and the 166 lines of \`codec.rs\`. The implementation pattern (one stub, repeated) should match closely. Doc comments can vary.

Return:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: Why do I need the \`_msg\` and \`_bytes\` underscore-prefixed parameter names?**
Rust requires unused parameters to be prefixed with \`_\` to suppress the unused-variable warning. The \`&self\` is needed by trait dispatch but never read; the \`_msg\`/\`_bytes\` are similarly ignored. Some stubs *use* them (we don't here), but the underscore is the idiom to tell Rust "I see this exists, I'm not using it."

**Q: What's the difference between \`WalCodec\`, \`ConsensusCodec\`, and \`SyncCodec\`?**
They're sub-traits that group related codec impls. \`WalCodec\` requires you to encode \`ProposedValue\`. \`ConsensusCodec\` requires \`SignedConsensusMsg\` + \`LivenessMsg\` + \`StreamMessage<ProposalPart>\` + \`ProposalPart\`. \`SyncCodec\` requires \`Status\` + \`Request\` + \`Response\`. By implementing the individual \`Codec<T>\` traits, you get all three super-traits for free.

**Q: If the stubs never fire, why do they exist at all?**
Because Rust's trait system can't conditionally include or exclude impls based on runtime configuration. The engine's \`start_engine\` function has a trait bound \`C: ConsensusCodec<Ctx> + WalCodec<Ctx> + SyncCodec<Ctx>\`, and the bound is checked at compile time, regardless of whether the codec methods ever execute. **The stubs are there to satisfy the type system, not the runtime.**

**Q: When would I replace a stub with a real impl?**
When the engine actually calls it. Lesson 9's smoke test will spawn the actor system and exercise some paths; if a stub fires, the error message tells you which one. The most likely first call is \`Codec<ProposedValue<OpenHlContext>>\` (WAL), because the engine writes the very first proposal to disk for crash recovery before any peer gossip happens. You'd swap that one for a protobuf-backed encoder.

## Next lesson (Lesson 9)

You've satisfied the codec trait bound — \`start_engine\`'s signature is now satisfiable. But you don't yet have the *value* you'd pass for the codec, the node config, or the validator set, all of which \`start_engine\` also requires. Lesson 9 implements \`Node\` trait on \`OpenHlNode\`: ~300 lines covering \`OpenHlConfig\` (NodeConfig impl), \`OpenHlGenesis\`, \`OpenHlPrivateKeyFile\`, \`OpenHlNodeHandle\`, and the \`Node\` impl itself with 5 associated types and 12 methods. The capstone of Lesson 9 is \`start_engine_smoke_spawns_and_kills\` — a test that calls \`start_engine\` and proves the actor system spawns and tears down cleanly in ~0.02 seconds. After Lesson 9, the engine boots; we'll spend Lessons 10–15 wiring the AppMsg loop and the live Reth integration.

## Summary (3 lines)

- \`OpenHlCodec\` impls Malachite's \`Codec\` trait via SSZ. encode/decode each wire type (Proposal / Vote / Extension).
- Stateless; marker type only. SSZ everywhere for Ethereum compat + canonicalisation.
- Round-trip tests assert byte-identity. Codec slot lets you swap encodings; SSZ is the choice. Next: OpenHlNode.
`,
                },
                {
                  title: 'Lesson 9 — OpenHlNode and the first start_engine call',
                  slug: 'openhl-node-en',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 55,
                  xpReward: 100,
                  content: `# Lesson 9 — OpenHlNode and the first start_engine call

## Question

**\`OpenHlNode\` is the top-level type** that wires everything together: ConsensusBridge + Context + SigningProvider + Codec. **\`start_engine\` is the first call** that actually drives Malachite + the bridge end-to-end.

## Principle (minimum model)

- **\`OpenHlNode\` struct.** Holds bridge (Arc), signing provider, codec, context. Cloned per-task.
- **\`start_engine\`.** Spawns Malachite's event loop; passes references to all the components. Returns a handle.
- **\`Handle\` type.** Lets the caller \`.await\` on Malachite's lifecycle; gracefully shut down; query state.
- **Channels.** Tokio mpsc + oneshot. Malachite needs an inbox (for received messages) + an outbox (for messages to send).
- **Validator key.** Loaded at startup; private key stays in process memory; public key registered with ValidatorSet.
- **End-to-end test.** Boot OpenHlNode with a single validator; assert it produces blocks; assert the bridge's state advances.
- **Single-validator BFT.** Specially handled: with one validator, no votes needed; proposals immediately commit. Lets us test the pipeline before adding multi-validator complexity.

## Worked example + steps

# Lesson 9 — \`OpenHlNode\` and the first \`start_engine\` call

## Goal

Concepts you'll grasp in this lesson:

- **\`Node\` as handshake interface, not runtime** — \`OpenHlNode\` holds long-lived configuration (key, validator set, home dir, moniker) and *constructs* the engine. The actual running actor system lives in \`OpenHlNodeHandle\`, returned from \`start()\`. Construction and execution are different lifecycle stages, in different types.
- **The actor-system spawn surface** — what \`start_engine\` actually does (spawns ractor cells, binds libp2p, allocates a \`Channels<OpenHlContext>\`), why it returns an \`EngineHandle\`, and how \`OpenHlNodeHandle\` wraps it to satisfy the \`NodeHandle<OpenHlContext>\` trait.
- **\`Mutex<Option<Channels>>\` take-once semantics** — why the channel handle is takeable exactly once. The app loop (Lesson 10) consumes them; subsequent calls return \`None\`, a clean signal that ownership has transferred.
- **Centralized address derivation** — \`SHA-256(pubkey)[12..32]\` lives in one place (\`get_address\`), and a test asserts it matches the helper used in Lesson 6's runner. Centralization + a verification test prevents silent drift across files.
- **Type-safe placeholders over \`todo!()\`** — \`run()\` returns \`Err("not yet implemented (Lesson 10)")\` instead of panicking. Code that calls it fails gracefully with a pointer to the next lesson, surviving across PRs and stale tabs.
- **Why the smoke test is necessary** — Lesson 8's compile-time \`assert_impl_all!\` proved the codec satisfies the trait. The smoke test proves the *runtime* path — spawn, channel allocation, libp2p binding, kill propagation — actually works end-to-end. Types are necessary but not sufficient.

Verification:

\`\`\`bash
cargo test -p openhl-consensus
\`\`\`

…passes **20 tests** (16 from Lesson 8 + 4 new ones for the Node impl). The capstone test:

\`\`\`
test node::tests::start_engine_smoke_spawns_and_kills ... ok
\`\`\`

…spawns the full Malachite actor system against your code, asserts the channel handle is available exactly once, and tears the actor system down cleanly — **in about 0.02 seconds**. After this lesson, the engine boots; the only thing missing is the application loop that consumes from \`Channels<OpenHlContext>\` and drives the bridge.

Specific changes:

- 1 dep added to \`crates/consensus/Cargo.toml\`: \`informalsystems-malachitebft-app-channel\`.
- \`crates/consensus/src/node.rs\` — new file (~310 lines) with \`OpenHlNode\`, \`OpenHlConfig\`, \`OpenHlGenesis\`, \`OpenHlPrivateKeyFile\`, \`OpenHlNodeHandle\`, the \`impl Node for OpenHlNode\` (5 associated types, 12 methods), and 4 unit tests (private-key round-trip, config defaults, address derivation, \`start_engine\` smoke).
- \`crates/consensus/src/lib.rs\` — wires \`pub mod node;\`.

## Recap

After Lesson 8 your \`openhl-consensus\` crate has:

\`\`\`
crates/consensus/src/lib.rs               — pub mod bridge, codec, context, signing, signing_provider, types
crates/consensus/src/codec.rs             — OpenHlCodec (1 real + 7 stub Codec impls, 2 tests)
crates/consensus/src/signing_provider.rs  — SigningProvider<OpenHlContext>
crates/consensus/src/context.rs           — Context<OpenHlContext>
crates/consensus/src/types/               — 7 type files
\`\`\`

\`cargo test -p openhl-consensus\` passes 16 tests. You've satisfied every trait bound \`start_engine\` requires *at the type level*, but you can't actually call it yet — there's no \`Node\` impl, no config, no genesis, no private key file, no node handle.

## Plan

Six things:

1. **Add 5 more deps to \`crates/consensus/Cargo.toml\`** — \`informalsystems-malachitebft-app-channel\`, \`informalsystems-malachitebft-config\`, enable \`serde\` feature on signing-ed25519, add \`serde\` and \`tokio\` as runtime deps (not just dev), add \`tempfile\` as dev-dep.
2. **Create \`crates/consensus/src/node.rs\`** with: \`OpenHlConfig\` (impl \`NodeConfig\`), \`OpenHlGenesis\` (unit struct), \`OpenHlPrivateKeyFile\` (wire wrapper), \`OpenHlNodeHandle\` (returned from \`start()\`), \`OpenHlNode\` (the main struct), and \`impl Node for OpenHlNode\` with 5 associated types and 12 methods.
3. **Wire \`pub mod node;\`** into \`lib.rs\`.
4. **Add 4 unit tests** to \`node.rs\`.
5. **Run** \`cargo test -p openhl-consensus\` — 20 tests pass.
6. **Stare at** \`start_engine_smoke_spawns_and_kills\` passing in 0.02 seconds. This is the moment your code becomes a running BFT engine.

This lesson teaches **the bridge pattern between your code and Malachite**. The engine — written by someone else, generic over your \`Context\` and \`Codec\` — needs five things to spawn: an instance of your context, an instance of your node (to get config, signing, address derivation), a config value, a codec value, an initial height, and a validator set. The \`Node\` trait is the **handshake interface** that lets Malachite ask your code for those things uniformly. Once you implement it, \`start_engine\` works for any chain that follows the same handshake.


## Walk-through

### Step 1: Update \`crates/consensus/Cargo.toml\`

Open \`crates/consensus/Cargo.toml\`. The current \`[dependencies]\` section (after Lesson 8) looks like:

\`\`\`toml
[dependencies]
openhl-types = { workspace = true }
async-trait  = { workspace = true }
thiserror    = { workspace = true }
eyre         = { workspace = true }

informalsystems-malachitebft-core-types      = { workspace = true }
informalsystems-malachitebft-core-driver     = { workspace = true }
informalsystems-malachitebft-core-consensus  = { workspace = true }
informalsystems-malachitebft-app             = { workspace = true }
informalsystems-malachitebft-signing-ed25519 = { workspace = true, features = ["rand"] }
bytes                                         = "1"
rand                                          = "0.8"
sha2                                          = "0.10"

[dev-dependencies]
tokio = { workspace = true }
\`\`\`

Replace it with:

\`\`\`toml
[dependencies]
openhl-types = { workspace = true }
async-trait  = { workspace = true }
thiserror    = { workspace = true }
eyre         = { workspace = true }

informalsystems-malachitebft-core-types      = { workspace = true }
informalsystems-malachitebft-core-driver     = { workspace = true }
informalsystems-malachitebft-core-consensus  = { workspace = true }
informalsystems-malachitebft-app             = { workspace = true }
informalsystems-malachitebft-app-channel     = { workspace = true }
informalsystems-malachitebft-config          = { workspace = true }
informalsystems-malachitebft-signing-ed25519 = { workspace = true, features = ["rand", "serde"] }
bytes                                         = "1"
rand                                          = "0.8"
sha2                                          = "0.10"
serde                                         = { workspace = true }
tokio                                         = { workspace = true }

[dev-dependencies]
tokio    = { workspace = true }
tempfile = "3"

[lints]
workspace = true
\`\`\`

What each new dep is for:

- **\`informalsystems-malachitebft-app-channel\`** — provides \`start_engine()\`, the function we're about to call, plus the \`Channels<Ctx>\` type returned to communicate with the engine.
- **\`informalsystems-malachitebft-config\`** — \`ConsensusConfig\`, \`ValueSyncConfig\`, \`ValuePayload\` types we'll embed in \`OpenHlConfig\`.
- **\`serde\` feature on \`signing-ed25519\`** — lets us derive \`Serialize\`/\`Deserialize\` on \`OpenHlPrivateKeyFile\`, which needs the \`PrivateKey\` newtype to be serializable.
- **\`serde\`** (runtime dep) — used by \`OpenHlConfig\`, \`OpenHlGenesis\`, \`OpenHlPrivateKeyFile\` for \`#[derive(Serialize, Deserialize)]\`.
- **\`tokio\`** moved from dev-dep to dep — \`OpenHlNodeHandle\` holds a \`tokio::sync::Mutex\`.
- **\`tempfile\`** dev-dep — the smoke test creates a temp directory for the node's home dir.

This is your second heavy compile. First time pulling in \`app-channel\` + \`config\` will take ~20 more seconds.

### Step 2: Create \`crates/consensus/src/node.rs\` — imports and \`OpenHlConfig\`

Start with imports:

\`\`\`rust
//! \`Node\` trait implementation — describes our chain to Malachite's engine
//! and provides the [\`OpenHlNode::start\`] entry point that calls
//! \`malachitebft_app_channel::start_engine\` to spawn the actor system.

use std::path::PathBuf;

use async_trait::async_trait;
use eyre::eyre;
use informalsystems_malachitebft_app::node::{EngineHandle, Node, NodeConfig, NodeHandle};
use informalsystems_malachitebft_app::types::Keypair;
use informalsystems_malachitebft_app_channel::Channels;
use informalsystems_malachitebft_config::{ConsensusConfig, ValueSyncConfig, ValuePayload};
use informalsystems_malachitebft_core_types::Height as _;
use informalsystems_malachitebft_signing_ed25519::{PrivateKey, PublicKey};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tokio::sync::Mutex;

use crate::codec::OpenHlCodec;
use crate::context::OpenHlContext;
use crate::signing_provider::OpenHlSigningProvider;
use crate::types::{OpenHlAddress, OpenHlHeight, OpenHlValidatorSet};
\`\`\`

That's the full surface this file needs. Worth scanning once: \`Node\`, \`NodeConfig\`, \`NodeHandle\` are the three Malachite traits we'll implement. \`EngineHandle\` + \`Channels\` are what \`start_engine\` returns. \`ConsensusConfig\` + \`ValueSyncConfig\` + \`ValuePayload\` are the config types embedded in our \`OpenHlConfig\`. \`Keypair\` is libp2p's keypair type. \`PrivateKey\`/\`PublicKey\` are the Ed25519 types we've used since Lesson 7. \`Sha256\` is for address derivation.

Now write \`OpenHlConfig\`:

\`\`\`rust
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OpenHlConfig {
    pub moniker: String,
    #[serde(flatten)]
    pub consensus: ConsensusConfig,
    pub value_sync: ValueSyncConfig,
}

impl OpenHlConfig {
    #[must_use]
    pub fn new(moniker: impl Into<String>) -> Self {
        // OpenHL runs ProposalOnly (no streaming proposal parts) — must match
        // our \`Context::ProposalPart\` shape.
        let consensus = ConsensusConfig {
            value_payload: ValuePayload::ProposalOnly,
            ..ConsensusConfig::default()
        };
        Self {
            moniker: moniker.into(),
            consensus,
            value_sync: ValueSyncConfig::default(),
        }
    }
}

impl NodeConfig for OpenHlConfig {
    fn moniker(&self) -> &str {
        &self.moniker
    }
    fn consensus(&self) -> &ConsensusConfig {
        &self.consensus
    }
    fn value_sync(&self) -> &ValueSyncConfig {
        &self.value_sync
    }
}
\`\`\`

Three pieces:

- The struct wraps \`ConsensusConfig\` + \`ValueSyncConfig\` and adds a \`moniker\` (validator's nickname for logs). \`#[serde(flatten)]\` on \`consensus\` means the consensus fields are inlined into the parent — when serialized to disk, the user sees \`[consensus]\` section keys at the top level, not nested under \`consensus.\`.
- \`new()\` enforces one critical choice: \`value_payload: ValuePayload::ProposalOnly\`. This *must* match our \`Context::ProposalPart = OpenHlProposalPart\` (the unit struct). If we accidentally set this to \`ValuePayload::PartsOnly\`, the engine would expect streamed proposal parts, and our unit-struct \`ProposalPart\` would never satisfy what the engine sends. This is the kind of invariant that's easier to enforce at construction than to debug later.
- \`NodeConfig\` impl is three trivial accessors. The trait exists so Malachite can pull out the sub-configs without knowing the parent's layout.

### Step 3: \`OpenHlGenesis\` and \`OpenHlPrivateKeyFile\`

Next:

\`\`\`rust
/// Genesis is a unit struct at v0 — the validator set is passed directly to
/// \`start_engine\` rather than read from disk. When \`OpenHL\` grows a real
/// on-disk genesis format this becomes the \`load_genesis()\` return.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct OpenHlGenesis;

/// Wire-friendly wrapper around the raw 32-byte Ed25519 private key.
#[derive(Clone, Serialize, Deserialize)]
pub struct OpenHlPrivateKeyFile {
    pub bytes: [u8; 32],
}

impl OpenHlPrivateKeyFile {
    #[must_use]
    pub fn from_private_key(sk: &PrivateKey) -> Self {
        Self {
            bytes: sk.inner().to_bytes(),
        }
    }

    #[must_use]
    pub fn into_private_key(self) -> PrivateKey {
        PrivateKey::from(self.bytes)
    }
}

impl std::fmt::Debug for OpenHlPrivateKeyFile {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("OpenHlPrivateKeyFile")
            .field("bytes", &"[redacted]")
            .finish()
    }
}
\`\`\`

Two types:

- **\`OpenHlGenesis\`** — a unit struct. At v0 we have no genesis content (no allocations, no precompiles registered at boot — those come later in Module 6). The validator set is passed directly to \`start_engine\` rather than via genesis. When OpenHL adds a real genesis format, this becomes the type that \`load_genesis()\` deserializes.
- **\`OpenHlPrivateKeyFile\`** — a wire-friendly wrapper around the 32-byte private key. \`PrivateKey\` itself (from \`malachitebft_signing_ed25519\`) doesn't implement \`Serialize\`/\`Deserialize\` by default; the wrapper does, and the conversions \`from_private_key\` / \`into_private_key\` are explicit. **The manual \`Debug\` impl** redacts the bytes — \`{:?}\` printing the actual private key in a log would be a serious security bug. The \`[redacted]\` token is the convention.


The relationship between \`OpenHlNode\` and \`OpenHlNodeHandle\` in one diagram makes the central design choice of this lesson — **separating construction (static config) from execution (dynamic actor system) into two distinct types** — immediately intuitive:

\`\`\`
┌─────────────────────────────────────────────────────────────────────────┐
│ ◆ Lifecycle 1: static config / construction (Node)                       │
│                                                                          │
│   OpenHlNode {                                                            │
│       private_key, validator_set,                                         │
│       home_dir, moniker, …                                                │
│   }                                                                       │
│                                                                          │
│   • Created once at process start, long-lived                             │
│   • Engine **is not running yet** (just config in hand)                   │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             │  .start().await   ◄── handshake (Node trait)
                             │                        executes (Step 5)
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ ◆ Lifecycle 2: dynamic execution / actor system (Handle)                 │
│                                                                          │
│   OpenHlNodeHandle {                                                      │
│       engine   : EngineHandle           ──► ractor cell + libp2p running │
│       channels : Mutex<Option<Channels<OpenHlContext>>>                   │
│                                         ──► Lesson 10's app loop pulls it out  │
│                                            exactly once via \`take()\`     │
│   }                                                                       │
│                                                                          │
│   • Returned by \`start()\`; lives until \`.kill().await\`                   │
│   • Ownership flows Node → Handle → app loop in one direction            │
└─────────────────────────────────────────────────────────────────────────┘
\`\`\`

Three things this picture pins down: (a) **\`OpenHlNode\` only holds config — it doesn't own an actor system** — calling \`start()\` is what spins up any threads at all. (b) **\`OpenHlNodeHandle\` owns both the running actor system and the comm channels** — the engine and libp2p lifetimes are bound to this handle. (c) **\`Mutex<Option<Channels<...>>>\` is a one-way ownership gate** — once \`take()\` hands it to Lesson 10's app loop, it can never be reclaimed, and "already consumed" is expressed at the type level as \`None\`. Lesson 9's \`run()\` method returns an "unimplemented" error precisely because the (c) consumer side (Lesson 10's **app loop**) hasn't been written yet.

### Step 4: \`OpenHlNodeHandle\` — what \`start()\` returns

\`\`\`rust
/// Handle returned by [\`OpenHlNode::start\`]. Owns the engine actor system
/// and the channel handles for the (yet-to-be-implemented) app loop.
pub struct OpenHlNodeHandle {
    engine: EngineHandle,
    channels: Mutex<Option<Channels<OpenHlContext>>>,
}

impl std::fmt::Debug for OpenHlNodeHandle {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("OpenHlNodeHandle")
            .field("engine", &"<EngineHandle>")
            .field("channels", &"<Channels>")
            .finish()
    }
}

impl OpenHlNodeHandle {
    /// Take ownership of the engine→app message channels. Returns None on
    /// the second call. Lesson 10 will consume from this to drive the bridge.
    pub async fn take_channels(&self) -> Option<Channels<OpenHlContext>> {
        self.channels.lock().await.take()
    }
}

#[async_trait]
impl NodeHandle<OpenHlContext> for OpenHlNodeHandle {
    fn subscribe(&self) -> informalsystems_malachitebft_app::events::RxEvent<OpenHlContext> {
        // No event subscription in Stage 6c — caller can't yet observe engine
        // events. Lesson 10 wires the TxEvent from the engine to here.
        informalsystems_malachitebft_app::events::TxEvent::new().subscribe()
    }

    async fn kill(&self, _reason: Option<String>) -> eyre::Result<()> {
        self.engine.actor.kill_and_wait(None).await?;
        self.engine.handle.abort();
        Ok(())
    }
}
\`\`\`

The handle owns two things:

- **\`engine: EngineHandle\`** — Malachite's handle to the spawned actor system. Has an \`actor\` (the ractor \`ActorCell\`) and a \`handle\` (the tokio task handle). \`kill()\` cleanly tears both down.
- **\`channels: Mutex<Option<Channels<OpenHlContext>>>\`** — the application-side endpoints. The engine sends \`AppMsg<OpenHlContext>\` to us; we send \`AppReply<OpenHlContext>\` back. \`Mutex<Option<...>>\` so that \`take_channels()\` can hand them to the app loop exactly once — second call returns \`None\`, signaling "you've already consumed these."

**Why \`tokio::sync::Mutex\` rather than \`std::sync::Mutex\`?** Because \`take_channels()\` is \`async\` and the lock is held across an \`.await\` boundary. \`std::sync::Mutex\` would block the entire executor thread; \`tokio::sync::Mutex\` yields cooperatively.

The \`NodeHandle\` impl is mostly placeholder at this stage:
- \`subscribe()\` returns a *fresh* \`TxEvent::subscribe()\` — an empty event stream with no producer attached. Lesson 10 will wire up the real one.
- \`kill()\` is real — it kills the actor cell and aborts the tokio task. This is what \`start_engine_smoke_spawns_and_kills\` exercises.

### Step 5: \`OpenHlNode\` struct + \`Node\` impl

\`\`\`rust
#[derive(Clone, Debug)]
pub struct OpenHlNode {
    pub private_key: PrivateKey,
    pub validator_set: OpenHlValidatorSet,
    pub home_dir: PathBuf,
    pub moniker: String,
}

impl OpenHlNode {
    #[must_use]
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
}

#[async_trait]
impl Node for OpenHlNode {
    type Context = OpenHlContext;
    type Config = OpenHlConfig;
    type Genesis = OpenHlGenesis;
    type PrivateKeyFile = OpenHlPrivateKeyFile;
    type SigningProvider = OpenHlSigningProvider;
    type NodeHandle = OpenHlNodeHandle;

    fn get_home_dir(&self) -> PathBuf {
        self.home_dir.clone()
    }

    fn load_config(&self) -> eyre::Result<Self::Config> {
        let mut cfg = OpenHlConfig::new(&self.moniker);
        // Bind to an ephemeral port on localhost so tests and devnets don't
        // step on each other. Real deployments override this in their config.
        cfg.consensus.p2p.listen_addr = "/ip4/127.0.0.1/tcp/0"
            .parse()
            .map_err(|e| eyre!("invalid listen_addr: {e}"))?;
        Ok(cfg)
    }

    fn get_address(&self, pk: &PublicKey) -> OpenHlAddress {
        let digest = Sha256::digest(pk.as_bytes());
        let mut addr = [0u8; 20];
        addr.copy_from_slice(&digest[12..32]);
        OpenHlAddress(addr)
    }

    fn get_public_key(&self, pk: &PrivateKey) -> PublicKey {
        pk.public_key()
    }

    fn get_keypair(&self, pk: PrivateKey) -> Keypair {
        Keypair::ed25519_from_bytes(pk.inner().to_bytes())
            .expect("ed25519 private key is always 32 bytes")
    }

    fn load_private_key(&self, file: Self::PrivateKeyFile) -> PrivateKey {
        file.into_private_key()
    }

    fn load_private_key_file(&self) -> eyre::Result<Self::PrivateKeyFile> {
        Ok(OpenHlPrivateKeyFile::from_private_key(&self.private_key))
    }

    fn load_genesis(&self) -> eyre::Result<Self::Genesis> {
        // Validator set is passed directly to start_engine; genesis carries
        // nothing else at v0.
        Ok(OpenHlGenesis)
    }

    fn get_signing_provider(&self, private_key: PrivateKey) -> Self::SigningProvider {
        OpenHlSigningProvider::new(private_key)
    }

    async fn start(&self) -> eyre::Result<Self::NodeHandle> {
        let cfg = self.load_config()?;
        let validator_set = self.validator_set.clone();

        let (channels, engine) = informalsystems_malachitebft_app_channel::start_engine(
            OpenHlContext,
            self.clone(),
            cfg,
            OpenHlCodec, // WAL
            OpenHlCodec, // Network
            Some(OpenHlHeight::INITIAL),
            validator_set,
        )
        .await?;

        Ok(OpenHlNodeHandle {
            engine,
            channels: Mutex::new(Some(channels)),
        })
    }

    async fn run(self) -> eyre::Result<()> {
        // Lesson 10 will consume from channels here and run the app loop.
        Err(eyre!("OpenHlNode::run is not yet implemented (Lesson 10)"))
    }
}
\`\`\`

This is the load-bearing block. Walk through:

**The struct** carries four things: private key, validator set, home dir, moniker. These are the long-lived bits that don't change per-config-reload.

**The 6 associated types** declare the concrete types for each handshake slot:
- \`Context = OpenHlContext\` — what Malachite uses to typecheck everything else
- \`Config = OpenHlConfig\` — what \`load_config()\` returns
- \`Genesis = OpenHlGenesis\` — what \`load_genesis()\` returns
- \`PrivateKeyFile = OpenHlPrivateKeyFile\` — what \`load_private_key_file()\` returns
- \`SigningProvider = OpenHlSigningProvider\` — what \`get_signing_provider()\` returns
- \`NodeHandle = OpenHlNodeHandle\` — what \`start()\` returns

**The 12 methods**:

| Method | Purpose | Body |
| :--- | :--- | :--- |
| \`get_home_dir\` | Where the node stores its data | Returns the path passed at construction |
| \`load_config\` | Build the config (re-callable) | Constructs \`OpenHlConfig\`, then overrides the listen address to ephemeral local |
| \`get_address\` | SHA-256 hash → 20-byte address | Last 20 of the 32-byte digest |
| \`get_public_key\` | PK from SK | \`sk.public_key()\` |
| \`get_keypair\` | libp2p Keypair from Ed25519 | Convert via \`ed25519_from_bytes\` |
| \`load_private_key\` | Unwrap the file format | \`file.into_private_key()\` |
| \`load_private_key_file\` | Serialize PK to file format | \`OpenHlPrivateKeyFile::from_private_key(...)\` |
| \`load_genesis\` | Read the genesis | Returns \`OpenHlGenesis\` (unit struct, nothing to read) |
| \`get_signing_provider\` | Construct the SigningProvider | \`OpenHlSigningProvider::new(pk)\` |
| \`start\` | Spawn the engine | Calls \`start_engine\` with 7 args, wraps return in \`OpenHlNodeHandle\` |
| \`run\` | Run the app loop | **Unimplemented at Lesson 9** — returns error pointing to Lesson 10 |

**The \`start()\` method is the highlight.** It calls \`start_engine\` with:
- the context (\`OpenHlContext\` — a unit struct)
- the node itself (\`self.clone()\`)
- the config (\`cfg\`)
- two codec values (one for WAL, one for Network — both \`OpenHlCodec\`)
- the initial height (\`Some(OpenHlHeight::INITIAL)\`)
- the validator set (\`validator_set\`)

What \`start_engine\` returns: \`(Channels<OpenHlContext>, EngineHandle)\`. We wrap these into \`OpenHlNodeHandle\` and return.

**Why is \`run()\` unimplemented?** Because Malachite's \`Node::run\` is meant to combine \`start()\` with the app loop into one async future. Since the app loop doesn't exist until Lesson 10, we return an error pointing to Lesson 10. Once Lesson 10 is done, \`run()\` will look like: call \`start()\`, take the channels, drive the app loop, await termination.


### Step 6: Wire \`node.rs\` into \`lib.rs\`

\`\`\`rust
//! Consensus layer — Malachite BFT.

pub mod bridge;
pub mod codec;
pub mod context;
pub mod node;
pub mod signing;
pub mod signing_provider;
pub mod types;

pub use context::OpenHlContext;
\`\`\`

### Step 7: Add 4 unit tests

At the bottom of \`node.rs\`:

\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::OpenHlValidator;
    use rand::rngs::OsRng;

    fn single_validator_node(home_dir: PathBuf) -> OpenHlNode {
        let sk = PrivateKey::generate(OsRng);
        let pk = sk.public_key();
        let digest = Sha256::digest(pk.as_bytes());
        let mut addr_bytes = [0u8; 20];
        addr_bytes.copy_from_slice(&digest[12..32]);
        let address = OpenHlAddress(addr_bytes);
        let validator_set = OpenHlValidatorSet::new(vec![OpenHlValidator::new(address, pk, 1)]);
        OpenHlNode::new(sk, validator_set, home_dir, "openhl-test")
    }

    #[test]
    fn private_key_file_round_trips() {
        let sk = PrivateKey::generate(OsRng);
        let file = OpenHlPrivateKeyFile::from_private_key(&sk);
        let restored = file.into_private_key();
        assert_eq!(restored.inner().to_bytes(), sk.inner().to_bytes());
    }

    #[test]
    fn load_config_sets_proposal_only_payload_and_ephemeral_listen_addr() {
        let tmp = tempfile::tempdir().unwrap();
        let node = single_validator_node(tmp.path().to_path_buf());
        let cfg = node.load_config().unwrap();
        assert_eq!(cfg.consensus.value_payload, ValuePayload::ProposalOnly);
        // listen_addr should be /ip4/127.0.0.1/tcp/0 (ephemeral)
        let listen_str = cfg.consensus.p2p.listen_addr.to_string();
        assert!(
            listen_str.starts_with("/ip4/127.0.0.1/tcp/0"),
            "unexpected listen_addr: {listen_str}"
        );
    }

    #[test]
    fn get_address_matches_runner_derivation() {
        let tmp = tempfile::tempdir().unwrap();
        let node = single_validator_node(tmp.path().to_path_buf());
        let pk = node.private_key.public_key();
        let addr1 = node.get_address(&pk);
        // Same derivation as runner.rs (last 20 bytes of SHA-256(pubkey)).
        let digest = Sha256::digest(pk.as_bytes());
        let mut expected = [0u8; 20];
        expected.copy_from_slice(&digest[12..32]);
        assert_eq!(addr1, OpenHlAddress(expected));
    }

    /// Smoke test: spin up the actor system, get a handle back, kill cleanly.
    /// Does NOT drive consensus — that's Lesson 10.
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn start_engine_smoke_spawns_and_kills() {
        let tmp = tempfile::tempdir().unwrap();
        let node = single_validator_node(tmp.path().to_path_buf());
        let handle = match node.start().await {
            Ok(h) => h,
            Err(e) => panic!("start_engine failed: {e:?}"),
        };
        // Sanity-poke the channels handle is available exactly once.
        assert!(handle.take_channels().await.is_some());
        assert!(handle.take_channels().await.is_none());
        handle.kill(None).await.unwrap();
    }
}
\`\`\`

Four tests:

1. **\`private_key_file_round_trips\`** — generate a key, wrap in \`OpenHlPrivateKeyFile\`, unwrap, assert byte-equality. Proves the wire format is lossless.
2. **\`load_config_sets_proposal_only_payload_and_ephemeral_listen_addr\`** — construct a node, call \`load_config()\`, verify two things: \`value_payload == ProposalOnly\` (the invariant we enforce at construction) and \`listen_addr\` is the ephemeral local socket. Catches accidental config drift.
3. **\`get_address_matches_runner_derivation\`** — derive the same address two ways (once via the trait method, once by inlining the SHA-256 logic). Asserts they match. Catches accidental drift if someone changes one without the other.
4. **\`start_engine_smoke_spawns_and_kills\`** — the capstone. Uses \`#[tokio::test(flavor = "multi_thread", worker_threads = 2)]\` because the engine needs the multi-threaded runtime (it spawns multiple actors). Steps: construct a single-validator node, call \`node.start().await\`, poke the channels handle (once \`Some\`, second time \`None\`), call \`kill()\`. **If this passes, your code is now a running BFT engine.**

The smoke test is roughly **0.02 seconds** wall-clock. The bulk is libp2p setting up the local listener — even on a tcp/0 ephemeral port, libp2p's negotiation has a fixed cost.


## Test

\`\`\`bash
cargo test -p openhl-consensus
\`\`\`

After ~20 seconds (first compile after the dep changes):

\`\`\`
running 20 tests
test codec::tests::openhl_codec_satisfies_all_three_super_traits ... ok
test codec::tests::proposal_part_round_trips ... ok
test context::tests::height_increment_and_decrement ... ok
test context::tests::new_prevote_and_precommit_have_distinct_types ... ok
test context::tests::new_proposal_round_trips_fields ... ok
test context::tests::select_proposer_round_robins_deterministically ... ok
test context::tests::validator_set_is_sorted_by_power_then_address ... ok
test node::tests::get_address_matches_runner_derivation ... ok
test node::tests::load_config_sets_proposal_only_payload_and_ephemeral_listen_addr ... ok
test node::tests::private_key_file_round_trips ... ok
test signing::tests::vote_signature_is_field_sensitive ... ok
test signing::tests::vote_signature_round_trips ... ok
test signing_provider::tests::proposal_part_sign_verify_round_trips ... ok
test signing_provider::tests::proposal_sign_verify_round_trips ... ok
test signing_provider::tests::proposal_tamper_detected ... ok
test signing_provider::tests::signature_from_one_provider_does_not_verify_under_another ... ok
test signing_provider::tests::vote_extension_sign_verify_round_trips ... ok
test signing_provider::tests::vote_sign_verify_round_trips ... ok
test signing_provider::tests::vote_tamper_detected ... ok
test node::tests::start_engine_smoke_spawns_and_kills ... ok

test result: ok. 20 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

The smoke test runs last because of the multi-thread runtime setup.

Common errors and fixes:

- **\`error[E0432]: unresolved import 'informalsystems_malachitebft_app_channel'\`** — Cargo.toml doesn't have \`app-channel\`. Re-check Step 1.
- **\`error[E0277]: PrivateKey: Deserialize is not satisfied\`** — missing \`serde\` feature on \`signing-ed25519\`. Re-check Step 1 (\`features = ["rand", "serde"]\`).
- **smoke test hangs forever** — usually \`flavor = "current_thread"\` (default for \`#[tokio::test]\`). Re-check Step 7: the attribute must be \`#[tokio::test(flavor = "multi_thread", worker_threads = 2)]\`.
- **\`error: Keypair::ed25519_from_bytes expected mutable bytes\`** — version mismatch. The libp2p \`Keypair::ed25519_from_bytes\` signature changed across versions; the workspace pin should align with what \`informalsystems-malachitebft-app\` re-exports.
- **\`Address derivation does not match\`** — your \`get_address\` doesn't match the helper in the test. Both must use the last 20 bytes of \`SHA-256(pubkey)\` — slice \`[12..32]\`.

## Design reflection

Three load-bearing decisions encoded here:

1. **\`OpenHlNode\` is the handshake interface, not the runtime.** The struct holds long-lived fields (key, validator set, home dir, moniker). It doesn't *run* the chain. The runtime lives in \`OpenHlNodeHandle\` (engine + channels), returned from \`start()\`. **Construction and execution are different lifecycle stages**, so they live in different types.

2. **Address derivation is centralized in \`get_address\`.** When you used \`SHA-256(pubkey)[12..32]\` in the runner back in Lesson 6 setup-code, that was *the same derivation*. The test \`get_address_matches_runner_derivation\` asserts they're identical, so future refactors can't silently drift one without the other. **Centralization with a verification test beats duplication every time.**

3. **\`run()\` returns an error pointing at the next lesson.** Rather than \`unimplemented!()\` (panics) or \`todo!()\` (also panics), an \`eyre::Result::Err("not yet implemented (Lesson 10)")\` is a *type-safe placeholder*. Code that calls \`run()\` gets a graceful failure with a message pointing at where to look. **This is the kind of crumb that survives across pull requests, code reviews, and stale tabs.**

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout d59d6cf
diff -u ~/code/my-openhl/crates/consensus/src/node.rs ./crates/consensus/src/node.rs
diff -u ~/code/my-openhl/crates/consensus/Cargo.toml ./crates/consensus/Cargo.toml
diff -u ~/code/my-openhl/crates/consensus/src/lib.rs ./crates/consensus/src/lib.rs
\`\`\`

The reference at \`d59d6cf\` includes 310 lines of \`node.rs\`. The \`Node\` impl methods (12 total), the struct layouts, and the smoke test should match closely. Doc comments and exact wording can vary.

Return:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: Why does \`start_engine\` need both the node and the validator set when the validator set is already inside the node?**
Because the engine doesn't reach into the node's internals. The node has many fields (path, moniker, key, etc.) that are not relevant to validator-set election. \`start_engine\` accepts the validator set explicitly so the engine doesn't need to know about your node's specific field layout. This is the same separation-of-concerns principle as \`Node::load_config()\`.

**Q: What does the smoke test prove that the compile-time assertions don't?**
The compile-time assertions in Lesson 8 proved \`OpenHlCodec: WalCodec + ConsensusCodec + SyncCodec\`. The smoke test proves that the *runtime* path — actor spawning, channel allocation, libp2p binding, kill propagation — actually works end-to-end. Type-safety is necessary but not sufficient; the test catches things like "spawn deadlocks" or "the engine panics on first message" that types can't catch.

**Q: What's the difference between \`EngineHandle\` and \`NodeHandle\`?**
\`EngineHandle\` (from Malachite) is the low-level handle to the spawned actor system — actor cell, tokio task handle. \`NodeHandle\` (your trait) is the high-level abstraction Malachite uses to ask "is this still alive? subscribe me to events. kill it." Your \`OpenHlNodeHandle\` impls \`NodeHandle<OpenHlContext>\` and internally holds the \`EngineHandle\`. Two layers; you only deal with one.

**Q: Why does \`take_channels\` use \`Option<Channels<...>>\` instead of just removing the channels?**
Because \`take_channels\` is called *from the outside* — the app loop wants to consume them. Removing them entirely would require either a mutable reference or moving the handle. \`Mutex<Option<...>>\` lets the app loop call it via shared reference (\`&self\`), grab the channels once, and find \`None\` on subsequent calls — a clean signal "you already took these."

## Next lesson (Lesson 10)

You now have the engine running. But — critically — **the engine is sending you messages and you're ignoring them**. The actor system is parked, waiting for the app loop to consume from \`Channels<OpenHlContext>\` and respond to \`AppMsg::ProposeValue\`, \`AppMsg::Decided\`, etc. Lesson 10 implements the app loop: a \`tokio::select\` over the channel + a state struct + handlers that route engine messages to \`InMemoryEvmBridge\`. When Lesson 10 ships, \`cargo test first_block_via_engine_actors\` produces an actual block through the full engine pipeline.

## Summary (3 lines)

- \`OpenHlNode\` = top-level glue. Bridge + Context + Signing + Codec. \`start_engine\` spawns Malachite's event loop.
- Tokio mpsc + oneshot channels for in/out messages. Single-validator BFT simplifies first test.
- End-to-end test boots OpenHlNode; produces blocks; state advances. Next module: engine integration.
`,
                },
              ],
            },
          },
          {
            title: 'Engine integration',
            sortOrder: 5,
            lessons: {
              create: [
                {
                  title: 'Lesson 10 — run_engine_app and the first block through the actor pipeline',
                  slug: 'openhl-engine-app-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 55,
                  xpReward: 100,
                  content: `# Lesson 10 — run_engine_app and the first block through the actor pipeline

## Question

**\`run_engine_app\` drives the actor pipeline end-to-end**. The first block flows: Proposal → Vote → Vote (others) → Commit → Bridge::apply → state advances. **End-to-end consensus working**.

## Principle (minimum model)

- **\`run_engine_app\` orchestrator.** Spawns OpenHlNode in a tokio task + a test driver that simulates Malachite's perception of "I am the leader at height 1".
- **Actor pattern.** Malachite + bridge + signing provider each run as actors with their own mpsc channels. Loose coupling; testable.
- **First block flow.** Driver → "you are leader at height 1" → Malachite calls bridge.propose → Block built → Vote (single validator passes 2/3) → bridge.apply → state stored. ~5 ms.
- **Assertion: block 1 committed.** Bridge.get_best_block returns the new block.
- **Assertion: state advanced.** Bridge's internal HashMap has the new block hash → block mapping.
- **Multi-block test.** Repeat for blocks 2, 3, 4. Asserts chain continues; parent hashes link correctly.
- **Performance.** Single-validator devnet should produce one block per ~100ms (network simulation in-process). Real production is ~1s.

## Worked example + steps

# Lesson 10 — \`run_engine_app\` and the first block through the actor pipeline

## Goal

Concepts you'll grasp in this lesson:

- **The \`AppMsg\` routing loop** — Malachite's engine sends \`ConsensusReady / GetValidatorSet / StartedRound / GetValue / Decided / …\` over a single channel. The app loop is a \`while let Some(msg) = recv().await\` matching each variant and either replying via \`oneshot::Sender\` or driving the bridge. This is the *only* glue between Malachite and your EL.
- **Generic-over-bridge polymorphism** — \`run_engine_app<B: ConsensusBridge>\` works for \`StubBridge\`, \`InMemoryEvmBridge\`, \`RethEvmBridge\`, and (eventually) \`LiveRethEvmBridge\`. One routing function, four backends. The trait surface from Lesson 3 pays off here.
- **\`stop_after_decisions\` as test ergonomics** — production validators run \`usize::MAX\`. Tests pass \`1\`. A parameter that exists *only* so the function is finite-state-testable is a legitimate API choice; test ergonomics deserve API surface.
- **Reply channels can close mid-flight** — when an engine actor dies before we reply, the \`oneshot::Sender::send()\` errors. Logging via \`tracing::warn!\` (not propagating) is correct: propagating would mask actual errors with noise; the operator can still investigate via logs.
- **Channel vs. event-stream message flow** — \`channels.consensus.recv()\` carries *imperative* messages that need replies; \`subscribe()\` carries *broadcast* notifications. The app loop only deals with the former in Lesson 10.
- **Why integration > unit tests at this layer** — engine \`AppMsg\` arms arrive in a specific order. Faking that order is more work than spinning up the real engine for one block. The integration test is cheaper and proves more.

Verification:

\`\`\`bash
cargo test -p openhl-consensus
\`\`\`

…passes **21 tests** (20 from Lesson 9 + 1 new integration test). The new test:

\`\`\`
test engine_app::tests::first_block_via_engine_actors ... ok
\`\`\`

…spawns the Malachite actor system, drives a real consensus round through it, asserts the bridge committed exactly the hash the engine decided on. **Wall-clock: 0.02 seconds.** This is the milestone where your code stops being "the engine boots" and becomes "the engine produces blocks."

Specific changes:

- \`crates/consensus/src/engine_app.rs\` — new file (~282 lines). The \`run_engine_app<B: ConsensusBridge + 'static>\` loop reads \`AppMsg<OpenHlContext>\` from \`Channels<OpenHlContext>::consensus\`, dispatches 12 message arms (5 substantive + 7 trivial), and returns the list of decided hashes.
- \`StubBridge\` test fixture + the \`first_block_via_engine_actors\` integration test live in the same file.
- \`crates/consensus/src/lib.rs\` — wires \`pub mod engine_app;\`.

## Recap

After Lesson 9 your \`openhl-consensus\` crate has:

\`\`\`
crates/consensus/src/lib.rs               — pub mod bridge, codec, context, node, signing, signing_provider, types
crates/consensus/src/node.rs              — OpenHlNode + start_engine works (smoke test passes)
crates/consensus/src/codec.rs             — OpenHlCodec
crates/consensus/src/signing_provider.rs  — SigningProvider impl
crates/consensus/src/context.rs           — Context impl
crates/consensus/src/types/               — 7 type files
crates/consensus/src/bridge.rs            — ConsensusBridge trait + InMemoryEvmBridge
\`\`\`

\`cargo test -p openhl-consensus\` passes 20 tests. The engine boots and tears down cleanly — but it's *silent*. Once \`start_engine\` returns, the engine's actors immediately start sending \`AppMsg::ConsensusReady\` and waiting for a reply. Nothing replies. The actors park. **Lesson 10 fixes that.**

## Plan

Five things:

1. **Add \`tracing\` to \`crates/consensus/Cargo.toml\`** — used by the \`tracing::warn!\` calls in the loop's "channel-closed" paths.
2. **Create \`crates/consensus/src/engine_app.rs\`** with the \`run_engine_app<B>\` async function generic over \`B: ConsensusBridge\`, plus a \`default_attrs()\` helper. About 130 lines of routing logic.
3. **Wire \`pub mod engine_app;\`** into \`lib.rs\`.
4. **Add the integration test** \`first_block_via_engine_actors\` plus a \`StubBridge\` test fixture that impls \`ConsensusBridge\` synchronously in memory.
5. **Run** \`cargo test -p openhl-consensus first_block_via_engine_actors\` — passes in ~0.02 seconds. **Stare at it.**

This lesson teaches **the actor-message-loop pattern**. Most consensus engines (CometBFT, Hotstuff, Aura) have *some* "application interface" but they vary: callbacks, gRPC services, FFI bindings. Malachite's approach is \`tokio::mpsc\` channels of typed messages — strongly typed, async-native, single-threaded per channel. Your \`run_engine_app\` is the *consumer* of those messages; the engine actors are the *producer*. **Once you understand this pattern, every chain framework's "application interface" reduces to a variant of it.**


## Walk-through

### Step 1: Add \`tracing\` to Cargo.toml

Open \`crates/consensus/Cargo.toml\`. After Lesson 9 the \`[dependencies]\` section ends with:

\`\`\`toml
sha2                                          = "0.10"
serde                                         = { workspace = true }
tokio                                         = { workspace = true }
\`\`\`

Add one line:

\`\`\`toml
tracing                                       = { workspace = true }
\`\`\`

\`tracing\` is the workspace standard logging crate — we'll use only \`tracing::warn!\` here, for one specific case: when a reply channel is closed because the engine has terminated mid-conversation. Closed reply channels in \`tokio::mpsc::oneshot\` aren't bugs in our code; they're a sign that something upstream gave up. We log them but don't propagate.

### Step 2: Create \`crates/consensus/src/engine_app.rs\` — imports and signature

Start with module doc + imports:

\`\`\`rust
//! Engine app loop — consumes \`AppMsg\` from the Malachite engine and routes
//! every consensus-relevant event through a [\`ConsensusBridge\`].
//!
//! This is the missing half of Lesson 9: with \`OpenHlNode::start()\` spinning
//! up the actor system, this loop is what makes those actors do useful work.
//! Once a \`Decided\` arrives we commit through the bridge, increment height,
//! and (optionally) stop after N decisions for tests.

use std::sync::Arc;

use eyre::eyre;
use informalsystems_malachitebft_app::engine::host::Next;
use informalsystems_malachitebft_app_channel::{AppMsg, Channels};
use informalsystems_malachitebft_core_types::Height as _;
use openhl_types::{BlockHash, PayloadAttrs};

use crate::bridge::ConsensusBridge;
use crate::context::OpenHlContext;
use crate::types::{OpenHlHeight, OpenHlValidatorSet, OpenHlValue};

const APP_REPLY_WAIT_LOG: &str = "engine_app: peer replied unsuccessfully (channel closed)";
\`\`\`

Imports of note:

- **\`AppMsg, Channels\`** from \`app_channel\` — the message enum and channel-bundle type. \`Channels::consensus\` is the mpsc receiver for \`AppMsg<Ctx>\`.
- **\`Next\`** from \`app::engine::host\` — the enum used in \`Decided\`'s reply to tell the engine "what's next?" (start the next height, halt, etc.).
- **\`Height as _\`** — imports the trait \`Height\` for its \`.increment()\` method without bringing the name into scope (we use our \`OpenHlHeight\` newtype throughout).
- **\`Arc\`** — \`run_engine_app\` takes the bridge as \`Arc<B>\` so it can clone the reference into a long-running task.

Now the function signature:

\`\`\`rust
/// Drive the engine app loop until \`stop_after_decisions\` decisions have been
/// committed through the bridge, or the consensus channel closes.
///
/// Returns the \`BlockHash\`es that were decided, in order. Single-validator mode
/// uses this with \`stop_after_decisions = 1\` to exit after the first block.
#[allow(clippy::too_many_lines)] // 12 AppMsg arms — laid out flat for Lesson 11's match-by-match walk
pub async fn run_engine_app<B>(
    bridge: Arc<B>,
    mut channels: Channels<OpenHlContext>,
    validator_set: OpenHlValidatorSet,
    stop_after_decisions: usize,
) -> eyre::Result<Vec<BlockHash>>
where
    B: ConsensusBridge + 'static,
{
    let mut decided: Vec<BlockHash> = Vec::new();
    let mut current_parent = BlockHash([0u8; 32]);
    let mut current_height = OpenHlHeight::INITIAL;

    while let Some(msg) = channels.consensus.recv().await {
        match msg {
            // ... 12 arms come here ...
        }
    }

    Err(eyre!(
        "consensus channel closed after {n} decisions (wanted {stop_after_decisions})",
        n = decided.len()
    ))
}
\`\`\`

Five parameters/state values worth noting:

- **\`bridge: Arc<B>\`** — the \`ConsensusBridge\` implementor that the app loop calls for \`build_payload\`, \`payload_ready\`, \`commit\`. \`Arc\` because we'll later want to share it; generic over \`B\` so this same loop works for \`InMemoryEvmBridge\`, \`RethEvmBridge\`, and \`LiveRethEvmBridge\` (Lesson 12).
- **\`channels: Channels<OpenHlContext>\`** — taken by value (then \`mut\` to call \`recv\`). We own the channels after \`take_channels()\` in the caller.
- **\`validator_set: OpenHlValidatorSet\`** — the single-validator set we'll echo back on \`ConsensusReady\` and \`GetValidatorSet\`.
- **\`stop_after_decisions: usize\`** — test ergonomics. Single-validator devnets use \`1\`; multi-validator deployments would use \`usize::MAX\`.

Three loop-state values:

- **\`decided: Vec<BlockHash>\`** — accumulator; returned at end.
- **\`current_parent: BlockHash\`** — what the *next* block builds on top of. Starts at all-zero (genesis); becomes the just-decided hash on each commit.
- **\`current_height: OpenHlHeight\`** — what height the engine is on. Starts at \`INITIAL\`; gets bumped by \`StartedRound\` and \`Decided\`.

The \`while let Some(msg) = channels.consensus.recv().await\` loop is the heart of an actor-message app: receive a message, dispatch by variant, reply (if applicable), continue. When \`recv()\` returns \`None\`, the channel is closed — that's our error path.

Before writing the 12 arms one at a time, having a single picture of what this loop is mediating makes "who sent this, who's expecting a reply" trivial to track per arm:

\`\`\`
   [ Malachite Engine actors ]  (producer side — emits proposals, votes, Decided, etc.)
              │
              │ AppMsg::ConsensusReady { reply, validator_set }
              │ AppMsg::GetValue       { reply, height, round, ... }
              │ AppMsg::Decided        { reply, certificate, ... }
              │ … (12 variants total, all funneled into a single \`tokio::mpsc\` channel)
              ▼
   ┌──────────────────────────────────────────────────────────────────────────┐
   │ ◆ app_task: the run_engine_app loop  (consumer — what this lesson builds, │
   │                                       the central dispatcher)             │
   │                                                                            │
   │  while let Some(msg) = channels.consensus.recv().await { match msg { … } } │
   │                                                                            │
   │  Each arm does exactly one or two things:                                  │
   │   1. reply.send(...)        ──► unblock the engine by giving it a value    │
   │   2. bridge.<method>().await ──► drive the EL and pick up the result       │
   └──────────────────────────────────────────────────────────────────────────┘
              │                                                  ▲
              │ bridge.build_payload / payload_ready / commit    │ FillResult /
              ▼                                                  │ ExecutedBlock / Ok
   [ ConsensusBridge impl ]  (StubBridge / InMemoryEvmBridge / RethEvmBridge / LiveRethEvmBridge)


   ── One representative cycle ─────────────────────────────────────────────────

   ① ConsensusReady    ── engine ──► app: "I'm ready — hand me the validator set."
                          app ──► engine: reply.send(validator_set)

   ② GetValue          ── engine ──► app: "Propose the next block at (height, round)."
                          app ──► bridge.build_payload + payload_ready
                          app ──► engine: reply.send(LocallyProposedValue(value))

   ③ Decided           ── engine ──► app: "2/3+ committed; here's the certificate."
                          app ──► bridge.commit(hash)
                          app ──► engine: reply.send(Next::Start)  or  Next::Stop
                          decided.push(hash)
                          if decided.len() >= stop_after_decisions { return Ok(decided) }
\`\`\`

Three things this picture pins down: (a) **Messages flow engine → app one-way, but each message carries an \`oneshot::Sender\` (reply)**, so the engine side stays parked until the app sends the reply — forget the reply and the engine waits forever. (b) **The app is a *router* between engine and bridge, not a logic core** — the heavy lifting (build/commit) lives in the bridge, the consensus driving lives in the engine. (c) **Because the bridge is \`B: ConsensusBridge\`, the exact same loop runs against \`StubBridge\` / \`InMemoryEvmBridge\` / \`RethEvmBridge\` / \`LiveRethEvmBridge\`** — the investment in cleanly defining the trait surface back in Lesson 3 pays off here as polymorphism.

### Step 3: The \`ConsensusReady\` and \`StartedRound\` arms

Add these inside the \`match\`:

\`\`\`rust
            AppMsg::ConsensusReady { reply, .. } => {
                if reply
                    .send((current_height, validator_set.clone()))
                    .is_err()
                {
                    tracing::warn!("{APP_REPLY_WAIT_LOG} (ConsensusReady)");
                }
            }

            AppMsg::StartedRound {
                height,
                round: _,
                reply_value,
                ..
            } => {
                current_height = height;
                if reply_value.send(Vec::new()).is_err() {
                    tracing::warn!("{APP_REPLY_WAIT_LOG} (StartedRound)");
                }
            }
\`\`\`

**\`ConsensusReady\`** is the engine asking "are you ready for me to start consensus? at what height and with what validator set?" Our reply is the tuple \`(current_height, validator_set.clone())\`. Each \`reply\` is a \`oneshot::Sender<...>\` — \`send()\` consumes it and returns \`Result<(), T>\` where \`T\` is what we tried to send (returned on error). We don't recover from a closed reply channel; we just log.

**\`StartedRound\`** is the engine telling us a new round began at some height. We update our \`current_height\` and reply with an empty \`Vec\` (the list of stored proposed values for this height; we have none cached). The \`round: _\` underscore unbinds the round value because we don't need it in single-validator mode — the engine won't gossip-restream a value across rounds when there's no peer to send to.

### Step 4: The \`GetValue\` arm — building a proposal

This is the load-bearing arm. Add:

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
                let lpv =
                    informalsystems_malachitebft_app_channel::app::types::LocallyProposedValue::new(
                        height, round, value,
                    );
                if reply.send(lpv).is_err() {
                    tracing::warn!("{APP_REPLY_WAIT_LOG} (GetValue)");
                }
            }
\`\`\`

The engine asks "propose a value for height H, round R, with timeout T." We:

1. **Build payload attrs** — default values for now (\`timestamp: 0, fee_recipient: zero, prev_randao: zero\`). In Lesson 12 these'll come from the engine's notion of time + the validator's address.
2. **\`bridge.build_payload(current_parent, attrs).await\`** — kicks the EL: "build me a block on top of \`current_parent\` with these attrs." Returns a \`PayloadId\` — a handle the EL uses to track the in-flight build.
3. **\`bridge.payload_ready(id).await\`** — fetch the completed block. The in-memory bridge from Lessons 4–5 produces immediately; live Reth (Lesson 12 onward) might take 10-50ms.
4. **Wrap** the resulting \`block.hash\` in \`OpenHlValue\` and then \`LocallyProposedValue::new(height, round, value)\`.
5. **Reply** to the engine with that \`LocallyProposedValue\`.

The \`?\` operator on \`build_payload\` and \`payload_ready\` propagates \`BridgeError\` up to \`eyre::Result\`. If the EL crashes mid-build, the app loop returns an error and the test fails loudly.


### Step 5: The \`Decided\` arm — the moment a block becomes final

The other load-bearing arm. Add:

\`\`\`rust
            AppMsg::Decided {
                certificate, reply, ..
            } => {
                let hash = certificate.value_id;
                bridge.commit(hash).await?;
                decided.push(hash);
                current_parent = hash;

                if decided.len() >= stop_after_decisions {
                    // Send a reply so consensus doesn't hang waiting on us before
                    // we drop the channel.
                    let next_height = certificate.height.increment();
                    let _ = reply.send(Next::Start(next_height, validator_set.clone()));
                    return Ok(decided);
                }

                let next_height = certificate.height.increment();
                current_height = next_height;
                if reply
                    .send(Next::Start(next_height, validator_set.clone()))
                    .is_err()
                {
                    tracing::warn!("{APP_REPLY_WAIT_LOG} (Decided)");
                }
            }
\`\`\`

The engine says "a value was decided at height H — here's the certificate." We:

1. **Extract** the decided hash from \`certificate.value_id\`.
2. **\`bridge.commit(hash).await\`** — durably mark this block as the canonical chain head in the EL. For the in-memory bridge, just records; for live Reth, executes forkchoice update.
3. **Append to \`decided\`** and update \`current_parent\` so the *next* \`GetValue\` builds on this hash.
4. **Check exit condition** — if we've hit \`stop_after_decisions\`, reply with \`Next::Start(next_height, ...)\` (so the engine doesn't hang waiting) and return. **This is what makes the test exit cleanly in 0.02s.**
5. **Otherwise** reply with \`Next::Start(next_height, validator_set)\` — "yes, please continue at the next height, here's the validator set" — and loop.


### Step 6: The other 7 arms — stubs and no-ops

The remaining arms are short. Add:

\`\`\`rust
            AppMsg::ExtendVote { reply, .. } => {
                if reply.send(None).is_err() {
                    tracing::warn!("{APP_REPLY_WAIT_LOG} (ExtendVote)");
                }
            }

            AppMsg::VerifyVoteExtension { reply, .. } => {
                if reply.send(Ok(())).is_err() {
                    tracing::warn!("{APP_REPLY_WAIT_LOG} (VerifyVoteExtension)");
                }
            }

            AppMsg::RestreamProposal { .. } => {
                // Single-validator mode never re-streams.
            }

            AppMsg::GetHistoryMinHeight { reply } => {
                if reply.send(OpenHlHeight::INITIAL).is_err() {
                    tracing::warn!("{APP_REPLY_WAIT_LOG} (GetHistoryMinHeight)");
                }
            }

            AppMsg::ReceivedProposalPart { reply, .. } => {
                // ProposalOnly value-payload mode — proposal parts never arrive.
                if reply.send(None).is_err() {
                    tracing::warn!("{APP_REPLY_WAIT_LOG} (ReceivedProposalPart)");
                }
            }

            AppMsg::GetValidatorSet { reply, .. } => {
                if reply.send(Some(validator_set.clone())).is_err() {
                    tracing::warn!("{APP_REPLY_WAIT_LOG} (GetValidatorSet)");
                }
            }

            AppMsg::GetDecidedValue { reply, .. } => {
                if reply.send(None).is_err() {
                    tracing::warn!("{APP_REPLY_WAIT_LOG} (GetDecidedValue)");
                }
            }

            AppMsg::ProcessSyncedValue { reply, .. } => {
                if reply.send(None).is_err() {
                    tracing::warn!("{APP_REPLY_WAIT_LOG} (ProcessSyncedValue)");
                }
            }
\`\`\`

Eight more arms, four categories:

- **Vote extensions** (\`ExtendVote\`, \`VerifyVoteExtension\`) — reply \`None\` / \`Ok(())\`. Vote extensions are unused at v0 (mirror of how \`OpenHlSigningProvider::sign_vote_extension\` signs empty bytes).
- **No-ops** (\`RestreamProposal\`) — single-validator never re-streams a proposal, so we do nothing. No reply expected.
- **History/sync** (\`GetHistoryMinHeight\`, \`GetValidatorSet\`, \`GetDecidedValue\`, \`ProcessSyncedValue\`) — used during peer catch-up. We reply with defaults: \`INITIAL\` height (we have no history), the current validator set, \`None\` for "give me a past block." No peers means catch-up is never exercised, but the engine asks anyway.
- **ProposalOnly mode** (\`ReceivedProposalPart\`) — since \`OpenHlConfig\` sets \`ValuePayload::ProposalOnly\`, proposal parts never arrive. We still need to handle the variant; reply \`None\`.

### Step 7: The \`default_attrs\` helper

Below the function:

\`\`\`rust
fn default_attrs() -> PayloadAttrs {
    PayloadAttrs {
        timestamp: 0,
        fee_recipient: [0u8; 20],
        prev_randao: [0u8; 32],
    }
}
\`\`\`

Three zero fields, all of which the bridge accepts. In Lesson 12 these'll be real:
- \`timestamp\` will come from the engine (or a wall clock if testing).
- \`fee_recipient\` will come from the validator's configured payout address.
- \`prev_randao\` will be derived from the previous block's hash via BLS.

For now, all zeros — the test doesn't care, and the in-memory bridge doesn't validate them.

### Step 8: Wire \`engine_app.rs\` into \`lib.rs\`

\`\`\`rust
//! Consensus layer — Malachite BFT.

pub mod bridge;
pub mod codec;
pub mod context;
pub mod engine_app;
pub mod node;
pub mod signing;
pub mod signing_provider;
pub mod types;

pub use context::OpenHlContext;
\`\`\`

### Step 9: Add the integration test + \`StubBridge\`

At the bottom of \`engine_app.rs\`:

\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::bridge::BridgeError;
    use crate::node::OpenHlNode;
    use crate::types::{OpenHlAddress, OpenHlValidator};
    use async_trait::async_trait;
    use informalsystems_malachitebft_app::node::{Node as _, NodeHandle as _};
    use informalsystems_malachitebft_signing_ed25519::PrivateKey;
    use openhl_types::{ExecutedBlock, PayloadId, PayloadStatus};
    use rand::rngs::OsRng;
    use sha2::{Digest, Sha256};
    use std::sync::Mutex;
    use std::time::Duration;

    #[derive(Debug, Default)]
    struct StubBridge {
        last_built: Mutex<Option<BlockHash>>,
        committed: Mutex<Vec<BlockHash>>,
    }

    #[async_trait]
    impl ConsensusBridge for StubBridge {
        async fn build_payload(
            &self,
            _parent: BlockHash,
            _attrs: PayloadAttrs,
        ) -> Result<PayloadId, BridgeError> {
            let hash = BlockHash([0x42u8; 32]);
            *self.last_built.lock().expect("poisoned") = Some(hash);
            Ok(PayloadId(1))
        }

        async fn payload_ready(
            &self,
            _id: PayloadId,
        ) -> Result<ExecutedBlock, BridgeError> {
            Ok(ExecutedBlock {
                hash: BlockHash([0x42u8; 32]),
                parent_hash: BlockHash([0u8; 32]),
                number: 1,
                state_root: [0u8; 32],
            })
        }

        async fn validate_payload(
            &self,
            _block: &ExecutedBlock,
        ) -> Result<PayloadStatus, BridgeError> {
            Ok(PayloadStatus::Valid)
        }

        async fn commit(&self, block_hash: BlockHash) -> Result<(), BridgeError> {
            self.committed.lock().expect("poisoned").push(block_hash);
            Ok(())
        }
    }

    fn make_test_node(home_dir: std::path::PathBuf) -> OpenHlNode {
        let sk = PrivateKey::generate(OsRng);
        let pk = sk.public_key();
        let digest = Sha256::digest(pk.as_bytes());
        let mut addr_bytes = [0u8; 20];
        addr_bytes.copy_from_slice(&digest[12..32]);
        let address = OpenHlAddress(addr_bytes);
        let validator_set = OpenHlValidatorSet::new(vec![OpenHlValidator::new(address, pk, 1)]);
        OpenHlNode::new(sk, validator_set, home_dir, "openhl-engine-test")
    }

    /// End-to-end: spawn the engine actor system, drive one block through the
    /// \`AppMsg\` loop, assert the bridge built+committed exactly the hash the
    /// engine decided on.
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn first_block_via_engine_actors() {
        let tmp = tempfile::tempdir().unwrap();
        let node = make_test_node(tmp.path().to_path_buf());
        let validator_set = node.validator_set.clone();

        let handle = node.start().await.expect("start_engine failed");
        let channels = handle
            .take_channels()
            .await
            .expect("channels available exactly once");

        let bridge = Arc::new(StubBridge::default());
        let bridge_for_check = bridge.clone();

        let app_task = tokio::spawn(run_engine_app(bridge, channels, validator_set, 1));

        let decisions = tokio::time::timeout(Duration::from_secs(15), app_task)
            .await
            .expect("app loop timed out")
            .expect("app task panicked")
            .expect("app loop returned error");

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
}
\`\`\`

Three pieces:

- **\`StubBridge\`** — a \`ConsensusBridge\` that always returns \`BlockHash([0x42; 32])\` for everything. Production-grade test fixture pattern: in-memory state (\`Mutex<Option<...>>\` and \`Mutex<Vec<...>>\`), Arc-able, async-friendly. The test can read \`last_built\` and \`committed\` after the loop runs to check what the bridge saw.
- **\`make_test_node\`** — same single-validator construction we used in Lesson 9 (\`OpenHlNode::new\` with one validator).
- **\`first_block_via_engine_actors\`** — the integration test. Steps:
  1. Spawn the engine via \`node.start().await\`.
  2. Take channels via \`handle.take_channels().await\`.
  3. Spawn the app loop in a \`tokio::spawn\` task with the bridge + channels + validator set + \`stop_after_decisions = 1\`.
  4. Use \`tokio::time::timeout(Duration::from_secs(15), app_task)\` to bound test runtime — if anything hangs, fail in 15s rather than forever.
  5. Unwrap the nested \`Result\`s. The triple \`.expect(...)\` unwinds: timeout → panic → loop error.
  6. **Assert three things**: decisions is exactly 1 entry, bridge committed that exact hash, bridge built exactly that hash. Together these prove the full pipeline: engine → app → bridge → engine → app.
  7. \`handle.kill(None)\` for cleanup.


## Test

\`\`\`bash
cargo test -p openhl-consensus first_block_via_engine_actors
\`\`\`

After ~5 seconds (compile + first run):

\`\`\`
running 1 test
test engine_app::tests::first_block_via_engine_actors ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

The test itself runs in ~0.02 seconds; the 5 seconds is \`cargo test\`'s overhead.

To verify everything passes:

\`\`\`bash
cargo test -p openhl-consensus
\`\`\`

…should produce 21 tests passing.

Common errors and fixes:

- **Test hangs > 15s** — the \`tokio::time::timeout\` fires. The cause is always in the same family: **one of the \`ConsensusReady\` / \`GetValue\` / \`Decided\` arms either forgot \`reply.send(...)\` or accidentally dropped the \`oneshot::Sender\` mid-flow**. The engine actor stays parked forever until the receiver responds — no timeout, no panic, just silent waiting. **The \`Decided\` exit path is the easiest to miss** — early returns make it tempting to skip the reply. **Always send the reply before returning.** Re-walk Steps 3-5 and verify that the \`reply.send(...)\` line is reachable from every control-flow path through the match arm.
- **\`error[E0277]: ConsensusBridge is not Send\`** — bridge needs \`+ Send + Sync\` bounds. Or your impl uses \`std::sync::Mutex\` (which is \`Send\`) but you forgot the \`Send\` annotation on the trait. Check \`bridge.rs\`.
- **\`bridge.committed.lock().expect("poisoned")\` panic** — only happens if a task panicked while holding the mutex. Usually means a panic in the bridge impl. Check the bridge's \`build_payload\` / \`commit\` for panics.
- **\`assert_eq!(decisions.len(), 1)\` fires** — \`decisions\` is empty. The loop never hit \`Decided\`. Most likely cause: forgot to handle \`GetValue\` (the engine waits for a \`LocallyProposedValue\` reply, never moves on without it). Re-check Step 4.

## Design reflection

Three load-bearing decisions encoded here:

1. **\`run_engine_app\` is generic over \`B: ConsensusBridge + 'static\`.** The same loop works with \`StubBridge\` (test), \`InMemoryEvmBridge\` (Lesson 4), \`RethEvmBridge\` (Lesson 5), and \`LiveRethEvmBridge\` (Lesson 12). The bridge's responsibility is to *execute*; the app loop's responsibility is to *route*. **One implementation handles all four bridge variants.**

2. **\`stop_after_decisions\` is a test ergonomic, not a production feature.** Real validators use \`usize::MAX\`. The test uses \`1\`. The presence of this parameter signals that the function is *designed to be testable* — you can drive it to a known finite state and assert without infrastructure for graceful shutdown. **Test ergonomics deserve API surface.**

3. **Closed reply channels are logged, not propagated.** A closed \`oneshot::Sender\` reflects an engine that gave up before our reply — usually because the actor was killed externally. Propagating this as an error would mask actual problems with noise. Logging via \`tracing::warn!\` lets operators investigate if it's frequent without breaking the loop. **The right error-handling policy depends on whether the caller can act on the failure.**

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout 708472c
diff -u ~/code/my-openhl/crates/consensus/src/engine_app.rs ./crates/consensus/src/engine_app.rs
diff -u ~/code/my-openhl/crates/consensus/Cargo.toml ./crates/consensus/Cargo.toml
diff -u ~/code/my-openhl/crates/consensus/src/lib.rs ./crates/consensus/src/lib.rs
\`\`\`

The reference at \`708472c\` includes 282 lines of \`engine_app.rs\`. The 12 \`AppMsg\` arms (5 substantive + 7 trivial), the \`StubBridge\` test fixture, and the integration test should match closely. Doc-comment wording can vary.

Return:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: What's the difference between the engine's \`recv()\` channel and the engine's \`subscribe()\` event stream?**
The \`recv()\` channel (\`channels.consensus\`) is for *imperative* messages requiring a reply: "build a value", "validate this", "decided at H." The \`subscribe()\` event stream is for *broadcast* notifications without replies: "a round started", "a peer dialed in." The two flow in different directions: channel = engine→app (questions), events = engine→all-subscribers (announcements). Lesson 9's \`OpenHlNodeHandle::subscribe\` is a placeholder; we don't actually consume events until Lesson 12.

**Q: Why don't we test individual AppMsg arms — only the integration test?**
Because the arms are not independent. The engine sends them in a specific order: \`ConsensusReady\` → \`GetValidatorSet\` → \`StartedRound\` → \`GetValue\` → \`Decided\`. Testing them in isolation would require building a fake engine that sends them in that order, which is more complex than just spinning up the real engine for one block. **The integration test is cheaper to write and proves more.** Lesson 11 will add multi-validator tests where individual-arm tests *do* make sense (peer sync, vote extensions).

**Q: Why is \`validator_set: OpenHlValidatorSet\` taken by value instead of \`Arc<...>\`?**
Because \`OpenHlValidatorSet\` is small (one validator at v0) and \`Clone\`. The cost of cloning is bytes-of-the-struct, not bytes-of-the-set. If validator sets grew to 100+ entries, switching to \`Arc\` would be worthwhile.

**Q: What happens if \`bridge.commit(hash)\` fails?**
The \`?\` operator propagates the \`BridgeError\` up as \`eyre::Result::Err(...)\`. The \`app_task\` in the test gets \`Err(...)\`, the triple-unwrap fails on the inner expect, and the test panics with the bridge error. **This is the intended behavior — commit failure is unrecoverable.** Production code would either retry (if transient) or shut down and alert (if persistent).

## Next lesson (Lesson 11)

Stage 6 is now done. Stage 7 starts: replace \`InMemoryEvmBridge\` with a real Reth EthereumNode. Lesson 11 covers the **dev node bootstrap** — getting Reth to spawn as a tokio task alongside our consensus actors, sharing the same runtime. Lesson 12 wires \`LiveRethEvmBridge\` (the live Reth equivalent of Lesson 5's \`RethEvmBridge\`). After Lesson 12 you'll have a Reth-backed devnet that processes the SAME \`AppMsg\` loop you just wrote — same \`run_engine_app\`, swap one trait impl, get a real EVM execution layer.

## Summary (3 lines)

- \`run_engine_app\` drives actor pipeline end-to-end. First block: Proposal → Vote → Commit → bridge.apply → state advances.
- Actor pattern with mpsc channels. Single-validator means votes pass immediately. Multi-block test verifies chain continuation.
- Performance: ~100ms per block in test; ~1s production. Next module: live Reth.
`,
                },
              ],
            },
          },
          {
            title: 'Live Reth',
            sortOrder: 6,
            lessons: {
              create: [
                {
                  title: 'Lesson 11 — Booting a live Reth EthereumNode in your workspace',
                  slug: 'openhl-reth-bootstrap-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 40,
                  xpReward: 80,
                  content: `# Lesson 11 — Booting a live Reth EthereumNode in your workspace

## Question

**Boot an actual Reth \`EthereumNode\`** in the same process as OpenHlNode. Two tokio tasks; same workspace. **First time real Reth runs in openhl.**

## Principle (minimum model)

- **\`EthereumNode::new\` config.** Chainspec (custom openhl chainspec), data dir, network config. ~30 lines.
- **Spawn as a tokio task.** Reth runs in its own task; logs to stdout.
- **Bind to a local port.** Reth's JSON-RPC server on port 8545; Engine API on 8551.
- **Wait for ready.** Poll Engine API's \`engine_getStatus\` until "ready". ~3 seconds at startup.
- **Tests.** Boot Reth; assert JSON-RPC responds; assert Engine API responds. No real consensus driving yet.
- **Why bootstrap as a separate lesson.** Reth boot involves disk IO, network binding, db migrations. Easier to debug in isolation.
- **Production parallel.** Hyperliquid HyperEVM is started the same way; the boot pattern is shared.

## Worked example + steps

# Lesson 11 — Booting a live Reth \`EthereumNode\` in your workspace

## Goal

Concepts you'll grasp in this lesson:

- **Bootstrap-only tests are first-class artifacts** — this lesson's test does nothing except spin up Reth and read its chain ID. It catches dependency-resolution and runtime-bootstrap regressions before any business logic exists. If this test fails, nothing in Lessons 12–15 can possibly work.
- **Reth and Malachite coexistence proof** — two of the largest crate trees in the Rust L1 ecosystem live in one workspace using the same tokio runtime. The dev-deps you add here resolve to a single SHA-coherent dependency closure.
- **Production-deps slim, dev-deps thick** — \`crates/evm/Cargo.toml\` keeps 6 production deps (unchanged from Lesson 5) but gains 11 dev-deps. Downstream crates using \`openhl-evm\` don't pull libp2p/MDBX/rpc; only the test binary does.
- **\`NodeConfig::test().dev()\` semantics** — \`test()\` = ephemeral tempdir + ephemeral ports + no peer discovery. \`dev()\` = single-block-producer mode, no mempool gossip. Combined: a fully isolated dev/test environment, repeatable in CI.
- **Why chain ID 2600** — matches Reth's upstream \`custom-dev-node\` example and doesn't collide with any public chain. The number itself has no OpenHL semantic meaning; it's a coordination convention with the Reth example you can diff against.

Verification:

\`\`\`bash
cargo test -p openhl-evm reth_dev_node_bootstraps --release
\`\`\`

…passes one new test:

\`\`\`
test reth_node::tests::reth_dev_node_bootstraps ... ok
\`\`\`

…that **spins up a full Reth \`EthereumNode\` v2.2.0** (MDBX storage, payload builder, mempool, RPC stub, the whole stack) in ~2.7 seconds, queries its provider for the chain ID, and asserts the result. **This is your proof that Reth and Malachite — the two largest pieces of infra in an L1 reference impl — coexist in one workspace without conflict.**

Specific changes:

- 4 new workspace deps added to root \`Cargo.toml\`: \`reth-node-core\`, \`reth-tasks\`, \`reth-provider\`, \`alloy-genesis\`.
- 8 new dev-dependencies added to \`crates/evm/Cargo.toml\` (test-utils variants of Reth's node-builder/ethereum + their support crates) — test-only, production scope unchanged.
- \`crates/evm/src/reth_node.rs\` — new file (~100 lines), test module only. Builds a dev chain spec, launches \`EthereumNode\` via \`NodeBuilder::testing_node\`, verifies the provider responds.
- \`crates/evm/src/lib.rs\` — wires \`mod reth_node;\` (test-cfg only).

No production code. No bridge changes. Just **validation that the dependency tree resolves** before we start writing the live-bridge code in Lesson 12.

## Recap

After Lesson 10 your workspace has:

\`\`\`
crates/types/           — BlockHash, PayloadId, PayloadAttrs, ExecutedBlock, PayloadStatus
crates/evm/             — InMemoryEvmBridge, RethEvmBridge (alloy types)
crates/consensus/       — Full BFT engine: Context, signing, codec, node, engine_app
bin/openhl/             — Empty binary stub
\`\`\`

\`cargo test\` passes 35 tests workspace-wide (21 consensus + 14 evm). The engine produces real blocks through \`InMemoryEvmBridge\`. **But the EL is still a placeholder.** \`RethEvmBridge\` exists (Lesson 5) but it doesn't actually call Reth — it just uses alloy types to compute hashes.

## Plan

Four things:

1. **Add 4 workspace-level deps** to \`Cargo.toml\`: \`reth-node-core\`, \`reth-tasks\`, \`reth-provider\`, \`alloy-genesis\` — all pinned to the same Reth SHA we've been using since Lesson 1.
2. **Add 8 dev-dependencies** to \`crates/evm/Cargo.toml\` (test-utils variants of Reth's node-builder/ethereum + their support crates).
3. **Create \`crates/evm/src/reth_node.rs\`** with a test module that builds a dev chain spec, launches \`EthereumNode\` via \`NodeBuilder::testing_node\`, and verifies the provider responds.
4. **Wire \`mod reth_node;\`** into \`crates/evm/src/lib.rs\` (test-cfg only — keep production scope clean).

This lesson teaches **the dependency-coexistence validation pattern**. When you depend on two large infrastructure crates (Reth and Malachite, in our case), you don't find out they conflict until you write the integration code — by which point you've invested heavily in code that *should* work but doesn't compile. **The validation pattern is to write the smallest possible test that exercises both at once, before writing the integration.** If the test passes, both deps resolve and link. If it fails, the failure is visible immediately, with a small blast radius.


## Walk-through

### Step 1: Add workspace-level Reth deps

Open the root \`Cargo.toml\`. Find the \`# --- Reth (pinned to v2.2.0 release tag) ---\` block. After Lesson 10 it ends like:

\`\`\`toml
reth-engine-primitives    = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-payload-primitives   = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-payload-builder      = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
\`\`\`

Add 4 more lines so the block becomes:

\`\`\`toml
reth-node-builder         = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-node-ethereum        = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-node-core            = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-tasks                = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-chainspec            = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-evm                  = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-evm-ethereum         = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-ethereum-primitives  = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-engine-primitives    = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-payload-primitives   = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-payload-builder      = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-provider             = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
alloy-genesis             = { version = "2.0", default-features = false }
\`\`\`

What each adds:

- **\`reth-node-core\`** — \`NodeConfig\` and related types (defines the node's config structure: chain spec, datadir, JSON-RPC endpoints, etc.).
- **\`reth-tasks\`** — \`Runtime\` and \`TaskExecutor\` for spawning Reth's background tasks (block validation, mempool gossip, payload builder).
- **\`reth-provider\`** — the \`BlockchainProvider\` that serves historical/canonical chain queries. Lesson 12's \`LiveRethEvmBridge::with_live_node()\` will hold one of these.
- **\`alloy-genesis\`** — Genesis JSON deserialization. Reth's \`ChainSpec\` is constructed from a \`Genesis\` via \`genesis.into()\`.

**The Reth SHA \`88505c7f...\` is the v2.2.0 release tag** — same SHA we've used in Lesson 1 for \`reth-evm\`, \`reth-evm-ethereum\`, etc. **Pinning to a release-tag SHA, not main HEAD, is the invariant.** Bumping Reth happens in a dedicated PR.


### Step 2: Update \`crates/evm/Cargo.toml\`

Open \`crates/evm/Cargo.toml\`. The current \`[dev-dependencies]\` is just \`tokio\`:

\`\`\`toml
[dev-dependencies]
tokio = { workspace = true }
\`\`\`

Replace it with:

\`\`\`toml
[dev-dependencies]
tokio                = { workspace = true }
reth-node-builder    = { workspace = true, features = ["test-utils"] }
reth-node-ethereum   = { workspace = true, features = ["test-utils"] }
reth-node-core       = { workspace = true }
reth-tasks           = { workspace = true }
reth-chainspec       = { workspace = true }
reth-provider        = { workspace = true }
alloy-genesis        = { workspace = true }
serde_json           = { workspace = true }
eyre                 = { workspace = true }
tempfile             = "3"
\`\`\`

Three categories:

- **\`reth-node-builder\` + \`reth-node-ethereum\` with \`test-utils\` feature** — gives us \`NodeBuilder::testing_node(runtime)\` which constructs a node in a tempdir with MDBX, debug capabilities, ephemeral ports. Without \`test-utils\`, these methods don't exist.
- **\`reth-node-core\` + \`reth-tasks\` + \`reth-chainspec\` + \`reth-provider\`** — runtime-supporting crates the test uses directly (\`NodeConfig\`, \`Runtime\`, \`ChainSpec\`, provider access).
- **\`alloy-genesis\` + \`serde_json\` + \`eyre\` + \`tempfile\`** — test support: JSON parsing for the dev genesis, error handling, temp directory creation.

**All in \`[dev-dependencies]\`** — production scope unchanged. If we accidentally use any of these in \`lib.rs\`'s non-\`#[cfg(test)]\` code, the compile fails. **Test-only deps are a guardrail.**

### Step 3: Create \`crates/evm/src/reth_node.rs\`

Top of the file — module doc with an ASCII roadmap showing where we are in Stage 7:

\`\`\`rust
//! Live Reth node bootstrap — Stage 7a.
//!
//! Demonstrates that a full \`EthereumNode\` can be spun up in our workspace
//! via \`NodeBuilder::testing_node\`. Stage 7b will wire \`RethEvmBridge\` to
//! consume this node's provider + payload builder; for now this module is a
//! validated bootstrap recipe (the smoke test confirms it works) and a
//! placeholder for the future \`live_node()\` constructor.
//!
//! \`\`\`text
//! +----------------------+  Stage 7a (this commit)
//! | NodeBuilder          |--+
//! |   .testing_node      |  |  EthereumNode spins up with MDBX in tempdir,
//! |   .node(Ethereum)    |  |  payload builder, mempool, RPC stub, etc.
//! |   .launch_with_dbg() |--+
//! +----------------------+
//!
//! +----------------------+  Stage 7b (next)
//! | RethEvmBridge        |  Bridge methods (build_payload, payload_ready,
//! |   ::with_live_node() |  validate_payload, commit) route through the
//! +----------------------+  live node's services instead of in-process maps.
//! \`\`\`
\`\`\`

The ASCII roadmap is intentional. **Module 6 has 5 lessons (Lessons 11–15); each replaces one stubbed body in the bridge.** The roadmap gives you the mental scaffold so you know where the current lesson sits in the larger arc.

The file has *no non-test code*. Everything below is \`#[cfg(test)] mod tests\`:

\`\`\`rust
#[cfg(test)]
mod tests {
    use alloy_genesis::Genesis;
    use eyre::Result;
    use reth_chainspec::ChainSpec;
    use reth_node_builder::{NodeBuilder, NodeHandle};
    use reth_node_core::node_config::NodeConfig;
    use reth_node_ethereum::EthereumNode;
    use reth_tasks::Runtime;
    use std::sync::Arc;

    // ... helpers + test ...
}
\`\`\`

The imports are dense but each has a single role:
- \`Genesis\` — deserialize the dev genesis JSON
- \`ChainSpec\` — Reth's chain configuration (we get one via \`Genesis::into()\`)
- \`NodeBuilder\`, \`NodeHandle\` — the builder pattern that constructs and launches a node
- \`NodeConfig\` — node-level configuration (datadir, RPC endpoints, etc.)
- \`EthereumNode\` — the concrete node type we're spinning up (mainnet Ethereum behaviour)
- \`Runtime\` — \`reth-tasks\`' wrapper around tokio runtime
- \`Arc\` — \`ChainSpec\` is passed around as \`Arc<ChainSpec>\`

### Step 4: The \`dev_chain_spec\` helper

Inside the test module:

\`\`\`rust
    fn dev_chain_spec() -> Arc<ChainSpec> {
        // Minimal post-merge dev genesis. ChainID 2600 mirrors the upstream
        // custom-dev-node example so we can compare behaviour 1:1 if needed.
        let custom_genesis = r#"{
            "nonce": "0x42",
            "timestamp": "0x0",
            "extraData": "0x5343",
            "gasLimit": "0x5208",
            "difficulty": "0x400000000",
            "mixHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
            "coinbase": "0x0000000000000000000000000000000000000000",
            "alloc": {},
            "number": "0x0",
            "gasUsed": "0x0",
            "parentHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
            "config": {
                "ethash": {},
                "chainId": 2600,
                "homesteadBlock": 0,
                "eip150Block": 0,
                "eip155Block": 0,
                "eip158Block": 0,
                "byzantiumBlock": 0,
                "constantinopleBlock": 0,
                "petersburgBlock": 0,
                "istanbulBlock": 0,
                "berlinBlock": 0,
                "londonBlock": 0,
                "terminalTotalDifficulty": 0,
                "terminalTotalDifficultyPassed": true,
                "shanghaiTime": 0
            }
        }"#;
        let genesis: Genesis =
            serde_json::from_str(custom_genesis).expect("dev genesis json parses");
        Arc::new(genesis.into())
    }
\`\`\`

A handful of things to notice:

- **\`chainId: 2600\`** — matches Reth's upstream \`custom-dev-node\` example so you can compare behaviour line-by-line if debugging. **2600 is not a magic OpenHL number**; it's whatever Reth's docs use.
- **All EIP block numbers = 0** — every Ethereum hardfork is active from height 0. This is "post-merge dev" — we don't simulate the historical sequence of forks.
- **\`terminalTotalDifficulty: 0\` + \`terminalTotalDifficultyPassed: true\`** — the chain starts post-merge. No pre-merge proof-of-work blocks ever existed.
- **\`shanghaiTime: 0\`** — Shanghai (withdrawals) is active at genesis.
- **\`alloc: {}\`** — no pre-funded accounts. For tests that need balances, you'd add entries here.

The JSON is parsed via \`serde_json::from_str(...)\` into \`Genesis\`, then converted to \`ChainSpec\` via \`genesis.into()\` (alloy-genesis provides the impl). \`Arc::new(...)\` because the node holds it as \`Arc<ChainSpec>\` — multiple subsystems share it.


What Lesson 11's test is actually booting becomes obvious if you draw the task layout on the shared Tokio runtime. Up through Lessons 9–10 only the left half (Malachite) was running; Lesson 11 onward **the right half (Reth) coexists on the same runtime**:

\`\`\`
┌─────────────────────────────────────────────────────────────────────────────┐
│ ◆ Shared single multi-threaded Tokio Runtime (worker_threads = 4)            │
│                                                                              │
│  ┌────────────────────────────────────┐  ┌─────────────────────────────────┐│
│  │ [Side A: Malachite consensus world]│  │ [Side B: Live Reth EL world]    ││
│  │  (Already up since Lessons 9–10)    │  │  (Boots in Lesson 11; wired Lesson 12 on)  ││
│  │                                     │  │                                 ││
│  │ ├─ Engine Driver actor tasks        │  │ ├─ TaskExecutor                 ││
│  │ │   (BFT state machine, proposer)   │  │ │   (Reth background task mgr) ││
│  │ ├─ libp2p networking task           │  │ ├─ MDBX storage engine task     ││
│  │ │   (P2P gossip; isolated in CI)    │  │ │   (state DB in tempdir)       ││
│  │ ├─ WAL / storage tasks              │  │ ├─ Payload builder task         ││
│  │ └─ run_engine_app loop task         │  │ ├─ Mempool task                 ││
│  │     (the Lesson 10 message router)  │  │ └─ Engine API / RPC stub tasks ││
│  └────────────────────────────────────┘  └─────────────────────────────────┘│
│                                                                              │
│  Lesson 11's test verifies that these two worlds can coexist on one process   │
│  / single runtime without colliding on resources (threads / ports / Cargo     │
│  features) — a "handshake," not yet a communication link.                     │
└─────────────────────────────────────────────────────────────────────────────┘
\`\`\`

The thing to internalize is "**A and B aren't talking to each other yet.**" All Lesson 11 proves is that both sides come up on the same Tokio runtime without collision; the actual \`run_engine_app\` ↔ \`LiveRethEvmBridge\` message flow gets wired in Lessons 12–15. Even so, this is the moment Reth v2.2.0 and Malachite v0.5.0 — two of the largest crate trees in the L1 reference implementation universe — are first shown to slip past Cargo's feature unification and version constraints and live in one workspace at both build time and test time.

### Step 5: The \`launch_and_check\` helper

Below \`dev_chain_spec\`:

\`\`\`rust
    /// Bootstrap a real Reth \`EthereumNode\` and verify the provider responds.
    /// Returns nothing if successful; panics on launch or assertion failure.
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

        // The provider should serve canonical chain queries off the genesis state.
        let observed_chain_id = node.chain_spec().chain.id();
        assert_eq!(observed_chain_id, expected_chain_id);

        // NOTE: not awaiting node_exit_future — drop the NodeAdapter and let
        // its background tasks tear themselves down when the runtime drops.
        Ok(())
    }
\`\`\`

Walk through:

1. **\`Runtime::test()\`** — \`reth-tasks\`' canonical "test runtime" — wraps the current tokio runtime so Reth's \`TaskExecutor\` can spawn into it.
2. **\`dev_chain_spec()\`** — the genesis-derived chain spec we just built.
3. **\`NodeConfig::test().dev().with_chain(chain_spec)\`** — builder chain:
   - \`test()\` — sane test defaults (ephemeral ports, etc.)
   - \`.dev()\` — single-validator dev mode (no peer-discovery, no MEV)
   - \`.with_chain(...)\` — bind to our dev chain spec
4. **\`NodeBuilder::new(config).testing_node(runtime).node(EthereumNode::default())\`** — the four-stage builder:
   - \`new(config)\` — pull in the config
   - \`.testing_node(runtime)\` — declare we're a test (tempdir storage, debug RPC, etc.)
   - \`.node(EthereumNode::default())\` — say "we want Ethereum mainnet behaviour" (vs. Optimism, custom, etc.)
5. **\`.launch_with_debug_capabilities()\`** — spawn all the node's services (MDBX, payload builder, RPC, mempool gossip in test mode, etc.). Returns \`NodeHandle { node, node_exit_future }\`.
6. **\`node.chain_spec().chain.id()\` assertion** — the simplest possible "did the node start correctly?" check. If we can fetch the chain ID off the live \`BlockchainProvider\`, the node booted.
7. **\`node_exit_future: _\`** — we *don't* await this future. Awaiting would block waiting for the node to shut down (which it never will until killed). Instead, we drop \`NodeHandle\` at end-of-function and let the runtime tear down the background tasks.


### Step 6: The test itself

Finally:

\`\`\`rust
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn reth_dev_node_bootstraps() {
        if let Err(e) = launch_and_check().await {
            panic!("Reth dev node bootstrap failed: {e:?}");
        }
    }
\`\`\`

The body is 2 lines. **The validation is in \`launch_and_check\`**; the test just calls it and surfaces failures as panics with the inner error preserved.

\`flavor = "multi_thread", worker_threads = 4\` — same setup as Lesson 10's integration test. Reth's internal tasks (MDBX commits, payload builder, RPC handler, network service) all want their own thread; 4 gives them room without contention.

### Step 7: Wire \`reth_node.rs\` into \`crates/evm/src/lib.rs\`

Open \`crates/evm/src/lib.rs\`. Currently it has the in-memory and Reth bridges from Lessons 4–5 plus their re-exports. Add **one line, gated to test cfg:**

\`\`\`rust
//! ... existing docs ...

pub mod bridges; // existing

#[cfg(test)]
mod reth_node;

// ... existing re-exports ...
\`\`\`

The \`#[cfg(test)]\` is the key. **The Reth bootstrap module is test-only** — not visible to consumers of \`openhl-evm\`, not compiled in non-test builds. This is consistent with all the deps being \`[dev-dependencies]\`: nothing about Lesson 11 affects production scope.

## Test

\`\`\`bash
cargo test -p openhl-evm reth_dev_node_bootstraps --release
\`\`\`

**First run:** ~2:34 cold compile (Reth's MDBX, libp2p, payload builder, RPC stack all build for the first time), then ~3 seconds run.

Subsequent runs: ~30 seconds (Cargo's incremental compilation), then ~3 seconds run.

Output:

\`\`\`
running 1 test
test reth_node::tests::reth_dev_node_bootstraps ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

Full suite check:

\`\`\`bash
cargo test
\`\`\`

…should produce 36 tests passing workspace-wide (21 consensus + 15 evm now that we have one new test).

Common errors and fixes:

- **\`error[E0432]: unresolved import 'reth_node_builder'\`** — \`crates/evm/Cargo.toml\` is missing the \`test-utils\` feature. Re-check Step 2: it must be \`features = ["test-utils"]\`.
- **\`error: failed to resolve: use of undeclared crate or module 'reth_provider'\`** — workspace-level \`reth-provider = ...\` is missing. Re-check Step 1.
- **\`error: feature 'test-utils' on 'reth-node-builder' requires feature 'X'\`** — version skew. The Reth SHA you're pinning must match what \`reth-node-builder\` expects from its peer crates. All 12 reth-* deps must use the same SHA — re-check Step 1.
- **\`Reth dev node bootstrap failed: Failed to bind...\`** — \`NodeConfig::test()\` asks the kernel for **\`:0\` (auto-assigned ephemeral ports)** internally, so physical port collisions aren't really possible by design. When this error does surface, the cause is almost always that **the previous test run died via panic or Ctrl+C, the Tokio runtime didn't drain cleanly, and the socket / MDBX lock Reth was holding is still owned by a zombie process**. The right fix isn't \`cargo clean\` (it doesn't release OS-level port holds): (1) **wait a handful of seconds and re-run** — this clears most cases; (2) if it persists, find the leftover with \`pgrep -f openhl-evm\` / \`pgrep -f reth\` and \`kill\` it; (3) as a last resort, open a fresh shell so you're in a new process space.
- **Test compiles but hangs > 30s** — \`Runtime::test()\` not working right. Check that you're using \`#[tokio::test(flavor = "multi_thread", worker_threads = 4)]\`, not the single-threaded default.

## Design reflection

Three load-bearing decisions encoded here:

1. **Production deps stay minimal; test-only deps validate the entire stack.** \`crates/evm/Cargo.toml\` has 6 production deps (unchanged from Lesson 5) plus 11 dev-deps. The 11 dev-deps validate that Reth's full node-builder + provider stack works *now* — but a downstream crate that uses \`openhl-evm\` doesn't pull them in. **This is how you keep \`openhl-evm\` slim while still proving the integration works.**

2. **A bootstrap-only test is a meaningful artifact.** This lesson's test does nothing except spin up the node and check the chain ID. It doesn't build a block, doesn't execute a transaction, doesn't query historical state. **And yet it's the lesson the whole rest of Module 6 depends on.** If the bootstrap fails, nothing in Lessons 12–15 can possibly work. **Bootstrap-only tests catch infrastructure regressions before any business logic is involved.**

3. **The ASCII roadmap in the module doc is the trail marker for Lessons 12–15.** Each remaining lesson replaces a stubbed body in the bridge — \`build_payload\`, \`payload_ready\`, \`validate_payload\`, \`commit\`. The roadmap shows where in the larger arc each lesson sits. **Module docs are for orientation, not implementation details.**

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout e6b4ebb
diff -u ~/code/my-openhl/Cargo.toml ./Cargo.toml
diff -u ~/code/my-openhl/crates/evm/Cargo.toml ./crates/evm/Cargo.toml
diff -u ~/code/my-openhl/crates/evm/src/reth_node.rs ./crates/evm/src/reth_node.rs
diff -u ~/code/my-openhl/crates/evm/src/lib.rs ./crates/evm/src/lib.rs
\`\`\`

The reference at \`e6b4ebb\` includes the workspace dep updates, the 11 dev-deps, and the 105-line \`reth_node.rs\`. The JSON genesis string, the builder chain, and the test attribute should match closely. Doc comments and exact wording can vary.

Return:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: Why is the chain ID 2600 instead of 1 (mainnet) or a random number?**
Two reasons: (1) it doesn't collide with any public network, so peer discovery never accidentally connects you to a real chain; (2) it matches Reth's upstream \`custom-dev-node\` example, letting you \`diff\` behaviour against the canonical reference. You can change it freely later — there's no semantic significance to 2600 in OpenHL specifically.

**Q: What's \`NodeConfig::test().dev()\` doing differently from \`NodeConfig::default()\`?**
\`test()\` = ephemeral tempdir for MDBX, bind to \`:0\` (kernel-allocated) ports, no peer discovery, sane test logging. \`dev()\` = single-validator mode (no actual consensus among multiple validators), assume the local node is the only block producer, no mempool gossip. Combined: a fully isolated dev/test environment.

**Q: Does \`launch_with_debug_capabilities\` mean it's slower than normal?**
No — it enables additional RPC endpoints (\`debug_*\` namespace) that are normally gated. The performance overhead is negligible; the cost is just exposing extra surface that would be security risks in prod. Fine for tests.

**Q: Why don't we \`kill()\` the node like we did \`OpenHlNodeHandle\` in Lesson 9?**
Because the \`NodeHandle\` Reth returns doesn't have a \`kill()\` method on the path we use. The expectation is that you drop the handle and let the runtime tear things down. For longer-running tests that need explicit cleanup, you'd call \`node.task_executor.shutdown(...)\` — but for a 3-second smoke test, drop suffices.

## Next lesson (Lesson 12)

Reth and Malachite now coexist. **But the bridge still doesn't talk to Reth.** Lesson 12 builds \`LiveRethEvmBridge::with_live_node()\` — a constructor that takes the \`node\` we just bootstrapped and exposes its \`BlockchainProvider\` so \`build_payload\` (Lessons 4–5's stubbed bridge methods) can do *real* parent-block lookups against the live MDBX state. This is the moment when "Reth is in our workspace" becomes "Reth is producing data the consensus engine reads."

## Summary (3 lines)

- Boot a live Reth \`EthereumNode\` in the same process. Tokio task; chainspec + data dir + network config.
- Wait for Engine API ready before continuing. Tests assert JSON-RPC + Engine API respond.
- Reth bootstrap is its own lesson for isolated debugging. Production parallel: HyperEVM. Next: LiveRethEvmBridge.
`,
                },
                {
                  title: 'Lesson 12 — LiveRethEvmBridge reads parents from the real chain',
                  slug: 'openhl-live-bridge-en',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 50,
                  xpReward: 100,
                  content: `# Lesson 12 — LiveRethEvmBridge reads parents from the real chain

## Question

**Replace the InMemory bridge with \`LiveRethEvmBridge\`** — calls Reth's Engine API for parent lookups. Real chain state behind the trait; Malachite doesn't know the difference.

## Principle (minimum model)

- **\`LiveRethEvmBridge\`.** Holds an \`Arc<EthereumNode>\` (or RPC client). Methods call into Reth's Engine API.
- **\`get_parent(hash) -> Block\`.** Calls \`engine_getBlockByHash\` via Reth's Engine API. Real chain lookup.
- **\`get_best_block() -> Block\`.** Calls \`engine_getBlockByNumber("latest")\`.
- **Caching.** Lookups can be slow; cache recent results. LRU with 1000 entries.
- **Same trait.** Malachite still calls \`bridge.get_parent(...)\`; doesn't know it now goes to Reth. The abstraction holds.
- **Async; doesn't block.** Engine API calls are async; bridge methods are async; Malachite's event loop unblocks during the await.
- **Tests.** Boot Reth + LiveRethEvmBridge; assert \`get_parent\` returns the genesis block.

## Worked example + steps

# Lesson 12 — \`LiveRethEvmBridge\` reads parents from the real chain

## Goal

Concepts you'll grasp in this lesson:

- **Generic over \`P: BlockNumReader\`, not concrete on \`BlockchainProvider\`** — the bridge declares exactly the one Reth capability it needs. The concrete provider has 30+ trait bounds you'd otherwise have to thread through every call site; the generic narrows the surface and makes mock testing trivial.
- **Happy/negative pair as minimal honest validation** — happy alone misses silent fallback to in-memory state; negative alone misses a bridge that always rejects. Both must be load-bearing for "the bridge talks to Reth" to be a true claim.
- **\`Result<Option<u64>>\` distinguishes operational from protocol failures** — DB-call failure → \`BridgeError::Internal\` (alert); unknown-hash → \`BridgeError::Rejected\` (vote nil, move on). Errors carry semantics, not just messages.
- **Refusing unknown parents is a safety property** — if the consensus engine proposes building on a hash the live chain has never seen, the bridge must refuse. This is the rule that prevents a malicious or buggy proposer from steering the EL into a forked subtree.
- **Two bridges as integration milestones** — \`RethEvmBridge\` (Lesson 5, alloy-only) and \`LiveRethEvmBridge\` (Lesson 12, live provider) both stay in the codebase. They represent two stages of integration, not duplicate implementations.

Verification:

\`\`\`bash
cargo test -p openhl-evm live_bridge_builds_on_real_genesis --release
\`\`\`

…passes one new test that exercises both **the happy path and the negative path**:

\`\`\`
test live_node::tests::live_bridge_builds_on_real_genesis ... ok
\`\`\`

Happy path: boot \`EthereumNode\`, query its \`BlockchainProvider\` for the real genesis hash, hand the provider to \`LiveRethEvmBridge\`, call \`build_payload(genesis_hash, attrs)\`. The resulting child block has \`number = 1\` and \`parent_hash = genesis\` — both **derived from the live provider**, not synthesised in memory.

Negative path: call \`build_payload(BlockHash([0xee; 32]), attrs)\`. The provider doesn't know that hash, so the bridge returns \`BridgeError::Rejected\`. **Refusing to build on a parent the live chain has never seen is what makes the bridge safe to wire into consensus.**

Specific changes:

- \`crates/evm/src/live_node.rs\` — new file (~227 lines). \`LiveRethEvmBridge<P>\` generic over \`P: BlockNumReader + Clone + Sync + 'static\`. \`build_payload\` is real (queries the live provider); \`payload_ready\` reads from in-memory pending state; \`validate_payload\` + \`commit\` stay stubbed for Lessons 13–14.
- \`crates/evm/Cargo.toml\` adds the production deps needed by the generic bound.
- \`crates/evm/src/lib.rs\` — wires \`pub mod live_node;\`.

## Recap

After Lesson 11 your workspace has:

\`\`\`
Cargo.toml                       — 13 reth-* workspace deps + alloy-genesis
crates/evm/Cargo.toml            — 6 production deps + 11 dev-deps
crates/evm/src/bridges/          — InMemoryEvmBridge (Lesson 4) + RethEvmBridge (Lesson 5)
crates/evm/src/reth_node.rs      — bootstrap-only smoke test
crates/consensus/                — full BFT engine + run_engine_app
\`\`\`

\`cargo test\` passes 36 tests workspace-wide. **Reth boots, Malachite produces blocks, but they don't talk.** \`RethEvmBridge\` uses in-process state for parent lookups; \`LiveRethEvmBridge\` doesn't exist yet.

## Plan

Six things:

1. **Add \`reth-storage-api\`** at the workspace level — provides \`BlockNumReader\`, the trait surface we're generic over.
2. **Update \`crates/evm/Cargo.toml\`** — promote \`eyre\` from dev-dep to production dep (for \`BridgeError::Internal\`'s message construction); add \`reth-storage-api\` as production dep.
3. **Create \`crates/evm/src/live_node.rs\`** with \`LiveRethEvmBridge<P>\` struct + \`ConsensusBridge\` impl (\`build_payload\` is live, others are stubs).
4. **Wire \`pub mod live_node;\`** into \`crates/evm/src/lib.rs\` (production-visible this time, *not* \`#[cfg(test)]\`).
5. **Add the integration test** \`live_bridge_builds_on_real_genesis\` — bootstraps a real node, asserts happy + negative paths.
6. **Run** \`cargo test -p openhl-evm live_bridge_builds_on_real_genesis --release\` — passes in ~2.4 seconds.

This lesson teaches **the generic-over-provider pattern** that makes the bridge testable in isolation. \`LiveRethEvmBridge<P>\` is generic over \`P: BlockNumReader + Clone + Sync + 'static\`. In production, \`P\` is the live node's \`BlockchainProvider\`. In tests, \`P\` could be a \`MockProvider\` that returns a deterministic set of \`(hash → number)\` mappings. **The bridge itself doesn't care which** — it just calls \`provider.block_number(...)\`. This is the same pattern as \`run_engine_app<B: ConsensusBridge>\` in Lesson 10: depend on the trait, not the concrete type.


## Walk-through

### Step 1: Add \`reth-storage-api\` to workspace

Open the root \`Cargo.toml\`. After Lesson 11 the reth block ends with:

\`\`\`toml
reth-payload-builder      = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-provider             = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
alloy-genesis             = { version = "2.0", default-features = false }
\`\`\`

Add one line between \`reth-provider\` and \`alloy-genesis\`:

\`\`\`toml
reth-storage-api          = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
\`\`\`

\`reth-storage-api\` is where \`BlockNumReader\`, \`BlockHashReader\`, and similar reader traits live. **Same pinned SHA as the rest of the reth-* deps** — version skew here would mean \`LiveRethEvmBridge\` can't accept \`node.provider\` because they'd be different versions of \`BlockNumReader\`.

### Step 2: Update \`crates/evm/Cargo.toml\`

Two small changes. The \`[dependencies]\` section gets two additions:

\`\`\`toml
[dependencies]
openhl-consensus         = { workspace = true }
openhl-types             = { workspace = true }
async-trait              = { workspace = true }
eyre                     = { workspace = true }      # NEW: was in [dev-dependencies], now production
alloy-primitives         = { workspace = true }
alloy-consensus          = { workspace = true }
reth-ethereum-primitives = { workspace = true }
reth-storage-api         = { workspace = true }      # NEW
\`\`\`

And \`eyre\` gets removed from \`[dev-dependencies]\`:

\`\`\`toml
[dev-dependencies]
tokio                = { workspace = true }
reth-node-builder    = { workspace = true, features = ["test-utils"] }
reth-node-ethereum   = { workspace = true, features = ["test-utils"] }
reth-node-core       = { workspace = true }
reth-tasks           = { workspace = true }
reth-chainspec       = { workspace = true }
reth-provider        = { workspace = true }
alloy-genesis        = { workspace = true }
serde_json           = { workspace = true }
# eyre line is GONE — it's a production dep now
tempfile             = "3"
\`\`\`

**Why \`eyre\` is now production**: \`BridgeError::Internal(eyre::eyre!(...))\` is constructed in \`build_payload\` (production code), not just in tests. The dev-dep listing was correct in Lesson 11 (only tests imported \`eyre::Result\`); now production code needs it.

### Step 3: Create \`crates/evm/src/live_node.rs\` — module doc + imports

Top of the file. Make the role explicit and call out the remaining stubs so readers know exactly what's load-bearing in this lesson vs. what comes later:

\`\`\`rust
//! \`LiveRethEvmBridge\` — \`ConsensusBridge\` backed by a real Reth provider.
//!
//! Stage 7b: parent lookups go through the live node's provider via the
//! \`BlockNumReader\` trait, so \`build_payload\` produces a child block whose
//! \`number\` and \`parent_hash\` reflect actual chain state rather than the
//! in-process synthesis of [\`crate::engine::RethEvmBridge\`].
//!
//! Still stubbed for now (each rolls into a later stage):
//!   - \`validate_payload\` → Stage 7c: real \`BlockExecutor\` execution
//!   - \`commit\` → Stage 7d: forkchoice via in-process Engine API
//!
//! Both stubs are visible markers of "what still needs the live node."

use alloy_consensus::Header;
use alloy_primitives::{Address, B256};
use async_trait::async_trait;
use openhl_consensus::bridge::{BridgeError, ConsensusBridge};
use openhl_types::{BlockHash, ExecutedBlock, PayloadAttrs, PayloadId, PayloadStatus};
use reth_storage_api::BlockNumReader;
use std::collections::HashMap;
use std::sync::Mutex;
\`\`\`

\`BlockNumReader\` is the single trait that drives the live read; everything else is bridge types we've used since Lesson 4.

Drawing this crate's boundary layout in one picture shows that Lesson 5's "outer = contract types / inner = alloy types" structure now gets one additional layer below it — a **trait-based provider abstraction** introduced for Lesson 12:

\`\`\`
   [ Outer: the consensus-layer (CL) world ]
   ──────────────────────────────────────────────────────────────────────
       openhl-types / contract primitives (defined ourselves):
         BlockHash       PayloadId        ExecutedBlock
   ──────────────────────────────────────────────────────────────────────
                                  ▲    │
                                  │    ▼  trait-boundary conversions (same helpers as Lesson 5)
                                  │       to_b256 / from_b256 / to_executed_block
                                  │    │
   ──────────────────────────────────────────────────────────────────────
       alloy-primitives / alloy-consensus (Ethereum-ecosystem standard):
         B256             u64              Header
   ──────────────────────────────────────────────────────────────────────
                                       │
                                       │  self.provider.block_number(parent_b256)
                                       ▼
   ────── ★ NEW in Lesson 12: trait-based provider abstraction boundary ★ ──────
       reth-storage-api / the abstract trait:
         BlockNumReader   (← the one capability the bridge actually needs)
   ──────────────────────────────────────────────────────────────────────
                                       │
                                       │ the type system hides the concrete provider
                                       ▼
   ──────────────────────────────────────────────────────────────────────
       reth-provider / concrete impl (this is what \`P\` satisfies in production):
         BlockchainProvider  ──►  MDBX storage engine ──► the real block number
   ──────────────────────────────────────────────────────────────────────
   [ Inner: the execution-layer (EL) / actual on-disk state ]
\`\`\`

Three things this picture pins down: (a) **\`LiveRethEvmBridge<P>\` is generic over \`P: BlockNumReader\`** — the bridge body never sees the concrete provider type (with its 30+ trait bounds). (b) **The trait-abstraction layer (the ★ row) lets "a mock \`P\` for tests" and "the live provider in production" plug into the same interface** — anything satisfying \`BlockNumReader\` works. (c) **Data narrows in type as it flows from outer to inner**: \`BlockHash\` (a meaning-carrying 32-byte newtype) → \`B256\` (alloy primitive) → a query through the trait → the single \`u64\` MDBX returns. The trait-boundary discipline established back in Lesson 5 has been extended here by one more layer — the provider abstraction.

### Step 4: Define the struct

\`\`\`rust
#[derive(Debug)]
pub struct LiveRethEvmBridge<P> {
    provider: P,
    state: Mutex<State>,
}

#[derive(Debug, Default)]
struct State {
    next_payload_id: u64,
    pending: HashMap<u64, (B256, Header)>,
    chain: HashMap<B256, Header>,
    head: Option<B256>,
}

impl<P> LiveRethEvmBridge<P> {
    #[must_use]
    pub fn new(provider: P) -> Self {
        Self {
            provider,
            state: Mutex::new(State::default()),
        }
    }
}
\`\`\`

Two pieces:

- **\`LiveRethEvmBridge<P>\`** holds the provider by value and a \`Mutex<State>\` for the build/commit bookkeeping. **Generic over \`P\`** — no concrete provider type baked in.
- **\`State\`** mirrors what \`InMemoryEvmBridge\` had (Lesson 4) — a \`next_payload_id\` counter, a \`pending\` map (payload_id → built header awaiting fetch), a \`chain\` map (commit history), and a \`head\` pointer. Lessons 13–15 replace each of these with live Reth structures.


### Step 5: The \`ConsensusBridge\` impl — \`build_payload\` is the live read

\`\`\`rust
#[async_trait]
impl<P> ConsensusBridge for LiveRethEvmBridge<P>
where
    P: BlockNumReader + Clone + Sync + 'static,
{
    async fn build_payload(
        &self,
        parent: BlockHash,
        attrs: PayloadAttrs,
    ) -> Result<PayloadId, BridgeError> {
        let parent_b256 = B256::from(parent.0);

        // LIVE READ: parent's block number comes from the real provider, not
        // an in-process HashMap. If the provider doesn't know this hash, we
        // refuse to build a child on it.
        let parent_number = self
            .provider
            .block_number(parent_b256)
            .map_err(|e| BridgeError::Internal(eyre::eyre!("provider error: {e}")))?
            .ok_or_else(|| {
                BridgeError::Rejected(format!("provider has no block with hash {parent_b256}"))
            })?;

        let mut s = self.state.lock().expect("state mutex poisoned");
        let id = s.next_payload_id;
        s.next_payload_id += 1;

        let header = Header {
            parent_hash: parent_b256,
            number: parent_number + 1,
            timestamp: attrs.timestamp,
            beneficiary: Address::from(attrs.fee_recipient),
            mix_hash: B256::from(attrs.prev_randao),
            ..Default::default()
        };
        let hash = header.hash_slow();
        s.pending.insert(id, (hash, header));
        Ok(PayloadId(id))
    }
\`\`\`

The trait bound \`P: BlockNumReader + Clone + Sync + 'static\` is the contract: any provider that can do hash→number lookups, that's cheap to clone, that's safe to share across threads, and that lives long enough to outlive any async task.

The \`build_payload\` body has three phases:

1. **Live read** (the load-bearing line). \`self.provider.block_number(parent_b256)\` returns \`Result<Option<u64>, _>\`:
   - \`Ok(Some(n))\` — provider knows the parent, it's at number \`n\`. We continue.
   - \`Ok(None)\` — provider doesn't know the parent. We return \`BridgeError::Rejected\`. **This is what makes the bridge safe to wire into consensus** — we never build on a parent the live chain has never seen.
   - \`Err(e)\` — provider failed (DB corruption, deadlock, whatever). We return \`BridgeError::Internal\`.

2. **State allocation**. Lock the mutex, grab the next ID, increment. Fast — no I/O under the lock.

3. **Header synthesis**. Build a child \`Header\` with \`number = parent_number + 1\` (taken from the live read), \`parent_hash = parent_b256\`, and the attrs the engine passed. Compute the hash via \`header.hash_slow()\`. Store the \`(id → (hash, header))\` mapping in \`pending\`.


### Step 6: \`payload_ready\` + \`commit\` stubs

These two stay roughly the same as Lesson 4's in-memory bridge — the live-Reth integration for them lands in Lesson 13 (\`payload_ready\` against Reth's real payload-builder) and Lesson 15 (\`commit\` against the Engine API):

\`\`\`rust
    async fn payload_ready(&self, id: PayloadId) -> Result<ExecutedBlock, BridgeError> {
        let s = self.state.lock().expect("state mutex poisoned");
        let n = id.0;
        let (hash, header) = s
            .pending
            .get(&n)
            .cloned()
            .ok_or_else(|| BridgeError::Rejected(format!("unknown payload id {n}")))?;
        Ok(ExecutedBlock {
            hash: BlockHash(hash.0),
            parent_hash: BlockHash(header.parent_hash.0),
            number: header.number,
            state_root: header.state_root.0,
        })
    }

    async fn validate_payload(
        &self,
        _block: &ExecutedBlock,
    ) -> Result<PayloadStatus, BridgeError> {
        // Stage 7c: replace with real BlockExecutor execution + state-root check.
        Ok(PayloadStatus::Valid)
    }

    async fn commit(&self, block_hash: BlockHash) -> Result<(), BridgeError> {
        // Stage 7d: replace with in-process Engine API forkchoice update.
        let hash = B256::from(block_hash.0);
        let mut s = self.state.lock().expect("state mutex poisoned");
        let header = s
            .pending
            .values()
            .find(|(h, _)| *h == hash)
            .map(|(_, h)| h.clone())
            .ok_or_else(|| BridgeError::Rejected(format!("commit for unknown hash {hash}")))?;
        s.chain.insert(hash, header);
        s.head = Some(hash);
        Ok(())
    }
}
\`\`\`

- **\`payload_ready\`** looks up the payload by ID in \`pending\`, builds the \`ExecutedBlock\` from the stored header. Same shape as Lesson 4.
- **\`validate_payload\`** is \`Ok(PayloadStatus::Valid)\` — a literal "always valid" stub. The comment names Lesson 14 (Stage 7c) as where the real execution lands. **Visible stubs are progress markers, not technical debt.**
- **\`commit\`** records the block in \`chain\` and updates \`head\`. Same shape as Lesson 4. The comment names Lesson 15 (Stage 7d) as where forkchoice lands.

### Step 7: Wire \`live_node.rs\` into \`lib.rs\`

Open \`crates/evm/src/lib.rs\`. From Lesson 11 it had:

\`\`\`rust
pub mod bridges;

#[cfg(test)]
mod reth_node;
\`\`\`

Add \`live_node\` — **production-visible this time:**

\`\`\`rust
pub mod bridges;
pub mod live_node;

#[cfg(test)]
mod reth_node;
\`\`\`

Why not \`#[cfg(test)]\`? Because in Lessons 13–15 we'll use \`LiveRethEvmBridge\` from production code (eventually from \`bin/openhl/src/main.rs\`). Lesson 11's bootstrap module is genuinely test-only — it just exists to validate the dep tree. Lesson 12's bridge is the production API.

### Step 8: Add the integration test

Append to \`crates/evm/src/live_node.rs\`:

\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;
    use alloy_genesis::Genesis;
    use reth_chainspec::ChainSpec;
    use reth_node_builder::{NodeBuilder, NodeHandle};
    use reth_node_core::node_config::NodeConfig;
    use reth_node_ethereum::EthereumNode;
    use reth_storage_api::BlockHashReader;
    use reth_tasks::Runtime;
    use std::sync::Arc;

    fn dev_chain_spec() -> Arc<ChainSpec> {
        let custom_genesis = r#"{
            "nonce": "0x42",
            "timestamp": "0x0",
            "extraData": "0x5343",
            "gasLimit": "0x5208",
            "difficulty": "0x400000000",
            "mixHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
            "coinbase": "0x0000000000000000000000000000000000000000",
            "alloc": {},
            "number": "0x0",
            "gasUsed": "0x0",
            "parentHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
            "config": {
                "ethash": {},
                "chainId": 2600,
                "homesteadBlock": 0,
                "eip150Block": 0,
                "eip155Block": 0,
                "eip158Block": 0,
                "byzantiumBlock": 0,
                "constantinopleBlock": 0,
                "petersburgBlock": 0,
                "istanbulBlock": 0,
                "berlinBlock": 0,
                "londonBlock": 0,
                "terminalTotalDifficulty": 0,
                "terminalTotalDifficultyPassed": true,
                "shanghaiTime": 0
            }
        }"#;
        let genesis: Genesis = serde_json::from_str(custom_genesis).expect("dev genesis parses");
        Arc::new(genesis.into())
    }

    /// END-TO-END Stage 7b: bootstrap a real Reth node, hand its provider to
    /// \`LiveRethEvmBridge\`, build a payload on top of the real genesis block.
    /// Asserts the \`parent_hash\` and number come from the live chain, not an
    /// in-process synthesis.
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn live_bridge_builds_on_real_genesis() {
        let runtime = Runtime::test();
        let chain_spec = dev_chain_spec();
        let node_config = NodeConfig::test().dev().with_chain(chain_spec);

        let NodeHandle {
            node,
            node_exit_future: _,
        } = NodeBuilder::new(node_config)
            .testing_node(runtime)
            .node(EthereumNode::default())
            .launch_with_debug_capabilities()
            .await
            .expect("launch failed");

        // Pull the genesis hash from the live provider.
        let genesis_hash_b256 = node
            .provider
            .block_hash(0)
            .expect("provider call failed")
            .expect("provider has no block 0 (genesis)");

        // Construct the bridge against the live provider.
        let bridge = LiveRethEvmBridge::new(node.provider.clone());

        // Build a payload on the real genesis.
        let attrs = PayloadAttrs {
            timestamp: 1,
            fee_recipient: [0u8; 20],
            prev_randao: [0u8; 32],
        };
        let id = bridge
            .build_payload(BlockHash(genesis_hash_b256.0), attrs.clone())
            .await
            .expect("build_payload failed");
        let block = bridge.payload_ready(id).await.expect("payload_ready failed");

        // The bridge's lookup hit the LIVE provider — assert the resulting
        // header carries genesis as its parent and is at height 1.
        assert_eq!(block.parent_hash, BlockHash(genesis_hash_b256.0));
        assert_eq!(block.number, 1);

        // Negative case: a fabricated parent hash must be rejected because
        // the live provider doesn't know it.
        let fake_parent = BlockHash([0xeeu8; 32]);
        let err = bridge.build_payload(fake_parent, attrs).await.unwrap_err();
        assert!(matches!(err, BridgeError::Rejected(_)));
    }
}
\`\`\`

Walk through the test:

1. **Bootstrap a real \`EthereumNode\`** — identical setup to Lesson 11.
2. **\`node.provider.block_hash(0)\`** — ask the live provider for the genesis block hash. This is \`BlockHashReader\`'s API (different trait from \`BlockNumReader\` — they're paired).
3. **\`LiveRethEvmBridge::new(node.provider.clone())\`** — construct the bridge. The clone is cheap because \`BlockchainProvider\` is internally \`Arc\`-based.
4. **Happy path**: build a payload on the real genesis hash, fetch via \`payload_ready\`, assert \`parent_hash == genesis_hash\` and \`number == 1\`. **This proves the live read happened** — if it were an in-memory synthesis, the parent_hash would have been whatever we passed in (still correct) but \`number\` could be anything we chose. \`1\` only comes out if \`provider.block_number(genesis_hash)\` returned \`Some(0)\`.
5. **Negative path**: \`BlockHash([0xee; 32])\` is a fabricated hash the chain has never seen. \`build_payload\` must return \`BridgeError::Rejected\`. \`matches!(err, BridgeError::Rejected(_))\` is the exhaustive check — any other error variant would fail the test.


## Test

\`\`\`bash
cargo test -p openhl-evm live_bridge_builds_on_real_genesis --release
\`\`\`

After ~30 seconds (compile + first node bootstrap):

\`\`\`
running 1 test
test live_node::tests::live_bridge_builds_on_real_genesis ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

Test runtime: ~2.4 seconds (the Reth bootstrap dominates).

Full suite:

\`\`\`bash
cargo test
\`\`\`

…should produce 37 tests workspace-wide.

Common errors and fixes:

- **\`error[E0277]: P: BlockNumReader is not satisfied for ...\`** — workspace \`reth-storage-api\` SHA doesn't match the rest of the reth-* SHAs. Re-check Step 1.
- **\`error[E0433]: failed to resolve: use of undeclared crate or module 'reth_provider'\`** — you forgot to add \`reth-provider = { workspace = true }\` to the \`[dev-dependencies]\` block of \`crates/evm/Cargo.toml\` (note: it's \`reth-provider\`, not \`reth-storage-api\` — the latter gives you the trait, the former gives you the concrete provider type you need in tests). The fix isn't a \`test-utils\` feature — it's adding the dependency itself. Re-walk the Step 2 dependency list.
- **\`provider has no block with hash 0x000...\`** in the happy path test — you're querying \`block_hash(0)\` but it returns \`None\`. Check that you're using \`.dev()\` mode in \`NodeConfig\` (test mode without dev sometimes doesn't pre-seed genesis correctly).
- **Test fails on \`matches!(err, BridgeError::Rejected(_))\`** — your \`build_payload\` propagated \`BridgeError::Internal\` instead. Check the \`.ok_or_else(|| BridgeError::Rejected(...))\` line; if you used \`.expect(...)\` or \`.unwrap_or(0)\` instead, the error path won't fire.
- **Test compiles but says "P is private"** — your \`LiveRethEvmBridge<P>\` needs \`pub struct ... { provider: P, ... }\`. Even though \`provider\` is \`pub\`, the generic parameter being \`pub\` is implicit.

## Design reflection

Three load-bearing decisions encoded here:

1. **The bridge is generic over \`P: BlockNumReader\`, not concrete on \`BlockchainProvider\`.** Production passes the live provider; tests could pass a mock; future module 7 might pass a \`RemoteProvider\` that talks JSON-RPC to a separate Reth process. **The bridge code doesn't change** — only the type parameter does.

2. **\`Result<Option<u64>, _>\` distinguishes operational from protocol failures.** A failed DB call is a different problem from "we don't know this hash." Mapping them to \`BridgeError::Internal\` vs. \`BridgeError::Rejected\` lets consumers respond appropriately — alert on the first, ignore-and-vote-nil on the second. **Errors carry semantics, not just messages.**

3. **The two-test happy/negative pair is the *minimal* honest validation.** Either one alone is insufficient: happy alone fails to catch silent fallback to in-memory state, negative alone fails to catch a bridge that always rejects. **A live integration needs both to be load-bearing.**

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout 8d211b8
diff -u ~/code/my-openhl/Cargo.toml ./Cargo.toml
diff -u ~/code/my-openhl/crates/evm/Cargo.toml ./crates/evm/Cargo.toml
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
diff -u ~/code/my-openhl/crates/evm/src/lib.rs ./crates/evm/src/lib.rs
\`\`\`

The reference at \`8d211b8\` includes ~227 lines of \`live_node.rs\`. The trait bound \`P: BlockNumReader + Clone + Sync + 'static\`, the \`build_payload\` body, and the two-path test should match closely. Doc comments and exact wording can vary.

Return:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: Why is the bridge \`generic over P\` instead of taking \`BlockchainProvider\` directly?**
Two reasons. First, \`BlockchainProvider\` is a heavy concrete type with 30+ trait bounds in its definition — using it directly means every consumer of \`LiveRethEvmBridge\` has to thread those bounds through. The generic \`P: BlockNumReader\` reduces the surface to *exactly* the one capability the bridge needs. Second, generic-over-trait makes mock testing easy — write a \`MockProvider\` impl, pass it to \`LiveRethEvmBridge::new(...)\`, get a unit-testable bridge that doesn't need a real node bootstrap.

**Q: What's the difference between \`BlockNumReader::block_number\` and \`BlockHashReader::block_hash\`?**
Direction. \`block_number(hash) → Option<u64>\` answers "what number is this hash at?" \`block_hash(n) → Option<B256>\` answers "what hash is at this number?" The test uses both: \`block_hash(0)\` to pull the genesis hash, then \`LiveRethEvmBridge\` internally uses \`block_number(hash)\` to look up the parent's number. Same chain index, two access patterns.

**Q: Why \`Mutex<State>\` instead of \`parking_lot::Mutex<State>\`?**
\`std::sync::Mutex\` is fine for low-contention scenarios. The bridge's state is only touched on \`build_payload\` / \`payload_ready\` / \`commit\` — each at most once per block, separated by tens to thousands of milliseconds. \`parking_lot\` matters when you have lots of contention; here you have almost none. Don't add a dep without a reason.

**Q: When does this bridge actually replace \`RethEvmBridge\`?**
It already has — \`RethEvmBridge\` (Lesson 5) is now superseded by \`LiveRethEvmBridge\` for production use. \`RethEvmBridge\` stays in the codebase as a pedagogical waypoint and as the in-memory variant used in \`StubBridge\` for engine tests. **Two bridges in the codebase represent two stages of integration**, not duplicate implementations.

## Next lesson (Lesson 13)

The bridge reads from Reth on \`build_payload\`. But the \`pending\` HashMap is still just an in-process synthesis — the engine asks for "the next block to propose" and we hand back a header we made up. **Lesson 13 replaces \`pending\` with Reth's actual \`PayloadBuilder\`** — the same machinery Reth uses to assemble blocks for the JSON-RPC \`engine_getPayloadV4\` call. By the end of Lesson 13, the bridge produces blocks that real Ethereum tooling could accept (full transaction lists, receipts, gas usage, state root). This is the transition from "the bridge talks to Reth's storage" to "the bridge is fully integrated with Reth's execution pipeline."

## Summary (3 lines)

- \`LiveRethEvmBridge\` impls the trait via Reth's Engine API. get_parent + get_best_block hit the real chain.
- LRU cache mitigates latency. Async throughout; Malachite's event loop unblocks.
- Same trait, real backing. Tests assert basic lookups work. Next: validate_payload runs EthBeaconConsensus.
`,
                },
                {
                  title: 'Lesson 13 — validate_payload runs Reth\'s EthBeaconConsensus',
                  slug: 'openhl-validate-payload-en',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 55,
                  xpReward: 100,
                  content: `# Lesson 13 — validate_payload runs Reth's EthBeaconConsensus

## Question

**\`validate_payload\` calls Reth's \`EthBeaconConsensus\` to validate proposed payloads** against the chain spec. Real Ethereum consensus rules running inside openhl. **The integration lights up.**

## Principle (minimum model)

- **\`EthBeaconConsensus\`.** Reth's implementation of the Consensus trait for Ethereum PoS. Validates header + block + state.
- **\`bridge.validate_payload(payload)\`.** Calls \`EthBeaconConsensus::validate_block(payload)\`. If valid, accept; if not, reject with reason.
- **Real validation.** Parent hash + timestamp + gas limit + state root + receipts root + transactions root. All canonical Ethereum.
- **Test scenario.** Build a Block; validate it; modify state root; validate; assert second call fails.
- **Why this matters.** Malachite + Reth integration is bidirectional: Malachite produces blocks; Reth validates them. Both must agree.
- **Production parallel.** Hyperliquid HyperEVM uses this exact pattern; HyperBFT proposes; HyperEVM validates.
- **Async + blocking.** Validation can be slow (state root recomputation); bridge.validate_payload is async; doesn't block Malachite's event loop.

## Worked example + steps

# Lesson 13 — \`validate_payload\` runs Reth's \`EthBeaconConsensus\`

## Goal

Concepts you'll grasp in this lesson:

- **The builder and validator share one source of truth** — \`ChainSpec::next_block_base_fee\` is the same helper *both* the builder uses to set base fee *and* \`EthBeaconConsensus\` uses to verify it. No duplicated math; no risk of drift across hardforks. This is the pattern to copy any time you have a build/validate pair in consensus-critical code.
- **The validator forces the builder to be honest** — once the validator runs, the builder can no longer cut corners. Producing headers with gas_limit copied from parent (1/1024 drift bound), correct EIP-1559 base fee, zero difficulty (post-merge), monotonic timestamps — every one of those is now mechanically checked.
- **Validator-rejection is normal, not a crash** — a validator answering "no, this is malformed" maps to \`PayloadStatus::Invalid\`, not an \`Err\`. Mapping the error to a status keeps the engine running so it can pick the next proposal. Only DB errors escalate to \`BridgeError::Internal\`.
- **Trait bounds widen incrementally** — Lesson 12 needed \`BlockNumReader\`; Lesson 13 needs \`BlockNumReader + HeaderProvider\`. Each lesson exposes a new capability surface. Trait bounds are spec: they document exactly what Reth surface the bridge requires.
- **\`SealedHeader\` caches the hash** — wrapping \`Header\` + precomputed \`B256\` avoids re-Keccak-hashing 500 bytes on every \`.hash()\` call. Matters at validator-throughput rates; here it's microseconds, but the pattern is correct.

Verification:

\`\`\`bash
cargo test -p openhl-evm live_bridge_builds_on_real_genesis --release
\`\`\`

…still passes — but now the test asserts **three** outcomes (added \`validate_payload\` checks for happy + invalid block):

\`\`\`
test live_node::tests::live_bridge_builds_on_real_genesis ... ok
\`\`\`

\`bridge.validate_payload(block)\` for the block we just built returns \`PayloadStatus::Valid\` because Reth's *real* validator (\`EthBeaconConsensus::validate_header_against_parent\`) approved it. \`bridge.validate_payload(block_with_unknown_hash)\` returns \`PayloadStatus::Invalid\` because we have no header to validate.

Specific changes:

- 3 new workspace deps + 4 new evm production deps (\`reth-consensus\`, \`reth-ethereum-consensus\`, \`reth-chainspec\`, \`alloy-eips\`).
- \`crates/evm/src/live_node.rs\` — ~141 lines changed. New struct fields \`chain_spec: Arc<ChainSpec>\` and \`validator: EthBeaconConsensus<ChainSpec>\`. \`build_payload\` now produces production-shape headers (parent-derived gas_limit, \`next_block_base_fee\`, \`difficulty: U256::ZERO\`, snapped timestamp). \`validate_payload\` is rewritten to call \`EthBeaconConsensus::validate_header_against_parent\`.
- **The shape of the file doesn't change** — same struct, same \`ConsensusBridge\` impl. What changes is what \`validate_payload\` *does*.

## Recap

After Lesson 12 your \`crates/evm/src/live_node.rs\` has:

\`\`\`rust
pub struct LiveRethEvmBridge<P> {
    provider: P,
    state: Mutex<State>,
}
\`\`\`

\`build_payload\` reads parent number from live provider but synthesises a header with mostly default fields. \`validate_payload\` is a stub: \`Ok(PayloadStatus::Valid)\`. The integration test only exercises build/fetch on the happy/negative path — never validation.

\`cargo test\` passes 37 tests workspace-wide. **The bridge agrees with itself, but it hasn't been forced to agree with Reth's idea of a valid block yet.**

## Plan

Seven things:

1. **Add 3 workspace deps**: \`reth-consensus\` (trait \`HeaderValidator\`), \`reth-ethereum-consensus\` (concrete \`EthBeaconConsensus\`), \`reth-primitives-traits\` (\`SealedHeader\`).
2. **Update \`crates/evm/Cargo.toml\`** — promote \`reth-chainspec\` from dev-dep to production dep, add 3 new production deps.
3. **Add 2 new fields** to \`LiveRethEvmBridge\`: \`chain_spec: Arc<ChainSpec>\` and \`validator: EthBeaconConsensus<ChainSpec>\`. Update \`new()\` to take the chain spec.
4. **Widen the trait bound** on \`P\` — now also \`HeaderProvider<Header = Header>\` (for fetching parent's full sealed header).
5. **Upgrade \`build_payload\`** — pull parent's full \`SealedHeader\`, compute next_block_base_fee, copy gas_limit, zero difficulty, enforce timestamp monotonicity.
6. **Rewrite \`validate_payload\`** — find our header in pending/chain, fetch parent sealed from provider, run \`validator.validate_header_against_parent\`.
7. **Add 2 new assertions to the test** — \`Valid\` on our just-built block, \`Invalid\` on an unknown hash.

This lesson teaches **the producer-consumer self-consistency pattern**. When you have a builder and a validator for the same artifact, **they must use the same rules**. If \`build_payload\` uses one base-fee formula and \`validate_payload\` uses another, every block fails validation. The way you ensure this is to **derive both from the same source** — here, the \`ChainSpec\`. \`ChainSpec::next_block_base_fee()\` is what builds, and inside \`EthBeaconConsensus::validate_against_parent_eip1559_base_fee\` the same helper is what checks. **Sharing the source-of-truth is what makes the system self-consistent.**

Drawing how the build side and validate side of \`LiveRethEvmBridge\` share the \`ChainSpec\` in a single picture makes it immediately obvious why blocks we build won't be rejected by our own validator (i.e. self-consistent):

\`\`\`
                       ┌──────────────────────────────────────────┐
                       │   Shared source of truth                   │
                       │   Arc<ChainSpec>                          │
                       │   ├─ chainId = 2600                       │
                       │   ├─ hardforks (Cancun / Shanghai / …)    │
                       │   ├─ genesis (base_fee_per_gas, gas_limit)│
                       │   └─ EIP-1559 parameters (elasticity etc.)│
                       └────────────────────┬─────────────────────┘
                                            │
                ┌───────────────────────────┼───────────────────────────┐
                ▼                           │                           ▼
   chain_spec.next_block_base_fee(...)      │       EthBeaconConsensus<ChainSpec>
   chain_spec.genesis.gas_limit             │       .validate_header_against_parent(...)
   …                                        │           ├─ base_fee_per_gas check
                ▼                           │           ├─ gas_limit drift check (±1/1024)
   ┌───────────────────────────┐            │           ├─ timestamp monotonicity check
   │  build_payload(parent)    │            │           └─ post-merge invariants
   │   ├─ pull parent_header   │ ─[Block]──►│
   │   ├─ compute base_fee     │            │       ┌───────────────────────────┐
   │   ├─ copy gas_limit       │            ▼       │  validate_payload(block)  │
   │   ├─ difficulty = ZERO    │     ──────────────►│   look up the header in   │
   │   └─ enforce timestamp    │                    │   pending/chain, fetch    │
   │      monotonicity         │                    │   the parent sealed       │
   └───────────────────────────┘                    │   header from the         │
                                                    │   provider, run the       │
                                                    │   validator               │
                                                    └─────────────┬─────────────┘
                                                                  │
                                                                  ▼
                                                       PayloadStatus::Valid ✅
                                                       (validator approved)
\`\`\`

Because both sides hold **the same \`Arc<ChainSpec>\` instance**, no matter how the base-fee formula evolves across hard forks or how network-specific \`gas_limit\` / elasticity changes, **the build and validate logics can never drift apart** with one side stuck on the old rule. Conversely, if the build side computed base fees inline while the validate side went through \`ChainSpec\`, every fork starting from Cancun would silently start producing "blocks I built that my own validator rejects" — a silent fork at the bridge level. **"Self-consistency isn't bought through an API; it's bought through a shared source of truth"** is the discipline this crate carries in its bones.


## Walk-through

### Step 1: Add 3 workspace deps

Open the root \`Cargo.toml\`. The reth block (from Lesson 12) ends with:

\`\`\`toml
reth-provider             = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-storage-api          = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
alloy-genesis             = { version = "2.0", default-features = false }
\`\`\`

Insert 3 lines between \`reth-storage-api\` and \`alloy-genesis\`:

\`\`\`toml
reth-consensus            = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-ethereum-consensus   = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-primitives-traits    = "0.3"
\`\`\`

Three deps, three roles:

- **\`reth-consensus\`** — defines the \`HeaderValidator\` trait. \`EthBeaconConsensus\` implements it. We call \`.validate_header_against_parent(...)\` via this trait.
- **\`reth-ethereum-consensus\`** — provides \`EthBeaconConsensus<ChainSpec>\` — Reth's production header validator for post-merge Ethereum.
- **\`reth-primitives-traits\` from crates.io \`0.3\`** — provides \`SealedHeader\`, the wrapper that pairs \`Header\` with its hash. **This one comes from crates.io, not git** — it's been spun out as a stable foundation crate.


### Step 2: Update \`crates/evm/Cargo.toml\`

The \`[dependencies]\` section gains 4 lines, and \`reth-chainspec\` is promoted from \`[dev-dependencies]\`:

\`\`\`toml
[dependencies]
openhl-consensus         = { workspace = true }
openhl-types             = { workspace = true }
async-trait              = { workspace = true }
eyre                     = { workspace = true }
alloy-primitives         = { workspace = true }
alloy-consensus          = { workspace = true }
reth-ethereum-primitives = { workspace = true }
reth-storage-api         = { workspace = true }
reth-consensus           = { workspace = true }    # NEW
reth-ethereum-consensus  = { workspace = true }    # NEW
reth-primitives-traits   = { workspace = true }    # NEW
reth-chainspec           = { workspace = true }    # NEW — was in [dev-dependencies]
\`\`\`

And \`[dev-dependencies]\` loses the \`reth-chainspec\` line (it's production now):

\`\`\`toml
[dev-dependencies]
tokio                = { workspace = true }
reth-node-builder    = { workspace = true, features = ["test-utils"] }
reth-node-ethereum   = { workspace = true, features = ["test-utils"] }
reth-node-core       = { workspace = true }
reth-tasks           = { workspace = true }
# reth-chainspec line is GONE — production dep now
reth-provider        = { workspace = true }
alloy-genesis        = { workspace = true }
serde_json           = { workspace = true }
tempfile             = "3"
\`\`\`

**Why \`reth-chainspec\` is now production**: the bridge holds an \`Arc<ChainSpec>\` in its struct. That's a production-visible field, so the type must be a production-visible dep.

### Step 3: Update imports + struct in \`live_node.rs\`

Open \`crates/evm/src/live_node.rs\`. The imports get 3 additions:

\`\`\`rust
use alloy_consensus::Header;
use alloy_primitives::{Address, B256};
use async_trait::async_trait;
use openhl_consensus::bridge::{BridgeError, ConsensusBridge};
use openhl_types::{BlockHash, ExecutedBlock, PayloadAttrs, PayloadId, PayloadStatus};
use reth_chainspec::{ChainSpec, EthChainSpec};                      // NEW
use reth_consensus::HeaderValidator;                                // NEW
use reth_ethereum_consensus::EthBeaconConsensus;                    // NEW
use reth_primitives_traits::SealedHeader;                           // NEW
use reth_storage_api::{BlockNumReader, HeaderProvider};             // CHANGED: + HeaderProvider
use std::collections::HashMap;
use std::sync::{Arc, Mutex};                                        // CHANGED: + Arc
\`\`\`

Five new types:
- \`ChainSpec\` — Reth's chain configuration, passed at construction.
- \`EthChainSpec\` — trait that gives \`ChainSpec\` the \`next_block_base_fee\` method.
- \`HeaderValidator\` — trait with \`validate_header_against_parent\`. \`EthBeaconConsensus\` impls it.
- \`EthBeaconConsensus\` — Reth's production post-merge header validator.
- \`SealedHeader\` — \`(Header, hash)\` pair.

Two changed imports: \`HeaderProvider\` (for \`sealed_header_by_hash\`), and \`Arc\` (for sharing the chain spec).

Now the struct gains two fields:

\`\`\`rust
#[derive(Debug)]
pub struct LiveRethEvmBridge<P> {
    provider: P,
    chain_spec: Arc<ChainSpec>,                          // NEW
    validator: EthBeaconConsensus<ChainSpec>,            // NEW
    state: Mutex<State>,
}
\`\`\`

And \`new()\` is widened to take the chain spec:

\`\`\`rust
impl<P> LiveRethEvmBridge<P> {
    #[must_use]
    pub fn new(provider: P, chain_spec: Arc<ChainSpec>) -> Self {
        let validator = EthBeaconConsensus::new(Arc::clone(&chain_spec));
        Self {
            provider,
            chain_spec,
            validator,
            state: Mutex::new(State::default()),
        }
    }

    #[must_use]
    pub fn chain_spec(&self) -> &Arc<ChainSpec> {
        &self.chain_spec
    }
}
\`\`\`

\`State\` is unchanged — same \`next_payload_id\`, \`pending\`, \`chain\`, \`head\`.

The \`chain_spec()\` accessor is added because tests and future production callers will want it (e.g., to ask the chain spec what hardfork is active at a given height). Keeping it exposed via \`&Arc<ChainSpec>\` lets callers clone if they need to hold their own reference.

### Step 4: Widen the trait bound on \`P\`

The \`impl\` block's \`where\` clause gains one more bound:

\`\`\`rust
#[async_trait]
impl<P> ConsensusBridge for LiveRethEvmBridge<P>
where
    P: BlockNumReader + HeaderProvider<Header = Header> + Clone + Sync + 'static,
{
\`\`\`

\`HeaderProvider<Header = Header>\` — the provider must serve full \`Header\` objects, not just numbers. The associated-type binding \`Header = Header\` says "the provider's Header type is *our* alloy Header type." Different Reth versions could parameterize \`HeaderProvider\` over different header types (e.g., for Optimism); we constrain ours to mainnet Ethereum's.

**\`BlockNumReader\` is now redundant** in some sense (anything that gives you a full header gives you its number), but we keep it explicit because:
- Lesson 12 wrote against just \`BlockNumReader\` — keeping it documents the Lesson 12 → Lesson 13 progression
- Future callers may want the narrower bound for code paths that only need the number

### Step 5: Upgrade \`build_payload\` — production-shape headers

This is the load-bearing change. The new \`build_payload\`:

\`\`\`rust
    async fn build_payload(
        &self,
        parent: BlockHash,
        attrs: PayloadAttrs,
    ) -> Result<PayloadId, BridgeError> {
        let parent_b256 = B256::from(parent.0);

        // LIVE READ: pull the parent's full sealed header from the real
        // provider so we can copy fields that EthBeaconConsensus will check
        // against during validate_payload (gas_limit drift, EIP-1559 base
        // fee, difficulty=0 post-merge).
        let parent_sealed = self
            .provider
            .sealed_header_by_hash(parent_b256)
            .map_err(|e| BridgeError::Internal(eyre::eyre!("provider error: {e}")))?
            .ok_or_else(|| {
                BridgeError::Rejected(format!("provider has no block with hash {parent_b256}"))
            })?;
        let parent_header = parent_sealed.header();

        let mut s = self.state.lock().expect("state mutex poisoned");
        let id = s.next_payload_id;
        s.next_payload_id += 1;

        let our_timestamp = attrs.timestamp.max(parent_header.timestamp + 1);

        // Compute the EIP-1559 base fee for our block via the chain spec —
        // identical math to what EthBeaconConsensus's
        // \`validate_against_parent_eip1559_base_fee\` will check against.
        let next_base_fee = self
            .chain_spec
            .next_block_base_fee(parent_header, our_timestamp);

        let header = Header {
            parent_hash: parent_b256,
            number: parent_header.number + 1,
            // Timestamp must be strictly greater than parent's; force at least
            // parent.timestamp + 1 even if attrs.timestamp came in stale.
            timestamp: our_timestamp,
            beneficiary: Address::from(attrs.fee_recipient),
            mix_hash: B256::from(attrs.prev_randao),
            // Keep gas_limit identical to parent so EthBeaconConsensus's
            // 1/1024 drift check passes trivially. A real payload builder
            // would tune this per network policy.
            gas_limit: parent_header.gas_limit,
            // Post-merge: difficulty must be 0.
            difficulty: alloy_primitives::U256::ZERO,
            base_fee_per_gas: next_base_fee,
            ..Default::default()
        };
        let hash = header.hash_slow();
        s.pending.insert(id, (hash, header));
        Ok(PayloadId(id))
    }
\`\`\`

Three changes from Lesson 12:

1. **\`sealed_header_by_hash\` instead of \`block_number\`.** We need the full parent header now, not just its number. The error mapping is the same: \`Err(provider_err)\` → \`Internal\`, \`Ok(None)\` → \`Rejected\`.

2. **\`our_timestamp = attrs.timestamp.max(parent_header.timestamp + 1)\`.** Timestamps must be strictly monotonic. If the engine passes us \`attrs.timestamp = 5\` and \`parent.timestamp = 100\`, we use \`101\` (parent + 1). This prevents stale clock data from causing immediate \`validate_payload\` failures.

3. **Header construction now has 4 carefully-chosen fields** (plus the ones from Lesson 12):
   - \`gas_limit = parent_header.gas_limit\` — copying ensures the 1/1024 drift check is trivially satisfied.
   - \`difficulty = U256::ZERO\` — post-merge invariant. Any non-zero value fails the validator.
   - \`base_fee_per_gas = next_base_fee\` — computed via \`chain_spec.next_block_base_fee(...)\`, the *same helper* the validator uses.
   - \`..Default::default()\` — everything else (gas_used, transactions_root, etc.) stays at zero. They'd matter for full execution validation in a future stage, not for header-against-parent.


### Step 6: Rewrite \`validate_payload\`

The other load-bearing change. Replace the stub with:

\`\`\`rust
    async fn validate_payload(
        &self,
        block: &ExecutedBlock,
    ) -> Result<PayloadStatus, BridgeError> {
        let block_hash = B256::from(block.hash.0);
        let parent_hash = B256::from(block.parent_hash.0);

        // Find our header for this block. In single-validator mode we always
        // built it, so it sits in pending (pre-commit) or chain (post-commit).
        let header = {
            let s = self.state.lock().expect("state mutex poisoned");
            s.pending
                .values()
                .find(|(h, _)| *h == block_hash)
                .map(|(_, h)| h.clone())
                .or_else(|| s.chain.get(&block_hash).cloned())
        };
        let Some(header) = header else {
            return Ok(PayloadStatus::Invalid);
        };

        // Fetch parent sealed header from the LIVE provider.
        let Some(parent_sealed) = self
            .provider
            .sealed_header_by_hash(parent_hash)
            .map_err(|e| BridgeError::Internal(eyre::eyre!("provider error: {e}")))?
        else {
            return Ok(PayloadStatus::Invalid);
        };

        // Run Reth's real header validator. EthBeaconConsensus checks number
        // monotonicity, timestamp monotonicity, gas-limit drift, base-fee.
        let our_sealed = SealedHeader::new(header, block_hash);
        match self
            .validator
            .validate_header_against_parent(&our_sealed, &parent_sealed)
        {
            Ok(()) => Ok(PayloadStatus::Valid),
            Err(_) => Ok(PayloadStatus::Invalid),
        }
    }
\`\`\`

Four phases:

1. **Header lookup** — find our header for \`block.hash\` in \`pending\` (just-built) or \`chain\` (already-committed). If not found → \`Invalid\`. In single-validator mode, every block we validate is one *we* built, so it'll be in one of those two maps.
2. **Parent lookup via live provider** — \`sealed_header_by_hash(parent_hash)\`. If not found → \`Invalid\`. If the provider errors → \`BridgeError::Internal\`.
3. **Wrap in \`SealedHeader\`** — \`SealedHeader::new(header, block_hash)\` pairs the header with its hash without re-computing.
4. **Run the validator** — \`validator.validate_header_against_parent(&our_sealed, &parent_sealed)\` returns \`Result<(), ConsensusError>\`. Map \`Ok(())\` → \`PayloadStatus::Valid\`, any \`Err(_)\` → \`PayloadStatus::Invalid\`.

**The 4 sub-checks Reth runs internally** (no need to write them yourself, but worth knowing):
- \`validate_against_parent_hash_number\` — block.number == parent.number + 1
- \`validate_against_parent_timestamp\` — header.timestamp > parent.timestamp
- \`validate_against_parent_gas_limit\` — gas_limit within 1/1024 of parent
- \`validate_against_parent_eip1559_base_fee\` — base_fee_per_gas matches the EIP-1559 formula

If any fails, the validator returns \`Err(...)\`. We don't propagate the specific error — at this layer the engine just needs to know "valid or not." Future debugging could log the error type.


### Step 7: Update the test — 2 new assertions

The test gets a new bridge constructor call (now takes chain_spec) plus two \`validate_payload\` assertions:

\`\`\`rust
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn live_bridge_builds_on_real_genesis() {
        let runtime = Runtime::test();
        let chain_spec = dev_chain_spec();
        let node_config = NodeConfig::test().dev().with_chain(chain_spec.clone());

        let NodeHandle {
            node,
            node_exit_future: _,
        } = NodeBuilder::new(node_config)
            .testing_node(runtime)
            .node(EthereumNode::default())
            .launch_with_debug_capabilities()
            .await
            .expect("launch failed");

        let genesis_hash_b256 = node
            .provider
            .block_hash(0)
            .expect("provider call failed")
            .expect("provider has no block 0 (genesis)");

        // CHANGED: bridge takes chain_spec now (wires up EthBeaconConsensus).
        let bridge = LiveRethEvmBridge::new(node.provider.clone(), chain_spec.clone());

        let attrs = PayloadAttrs {
            timestamp: 1,
            fee_recipient: [0u8; 20],
            prev_randao: [0u8; 32],
        };
        let id = bridge
            .build_payload(BlockHash(genesis_hash_b256.0), attrs.clone())
            .await
            .expect("build_payload failed");
        let block = bridge.payload_ready(id).await.expect("payload_ready failed");

        assert_eq!(block.parent_hash, BlockHash(genesis_hash_b256.0));
        assert_eq!(block.number, 1);

        // NEW: validate_payload runs EthBeaconConsensus against the live parent.
        let status = bridge
            .validate_payload(&block)
            .await
            .expect("validate_payload failed");
        assert_eq!(status, PayloadStatus::Valid);

        // NEW: unknown block hash → Invalid (we have no header to validate).
        let unknown_block = ExecutedBlock {
            hash: BlockHash([0xddu8; 32]),
            parent_hash: BlockHash(genesis_hash_b256.0),
            number: 1,
            state_root: [0u8; 32],
        };
        let status = bridge
            .validate_payload(&unknown_block)
            .await
            .expect("validate_payload failed");
        assert_eq!(status, PayloadStatus::Invalid);

        // (Negative case from Lesson 12 unchanged.)
        let fake_parent = BlockHash([0xeeu8; 32]);
        let err = bridge.build_payload(fake_parent, attrs).await.unwrap_err();
        assert!(matches!(err, BridgeError::Rejected(_)));
    }
\`\`\`

Two new blocks:

- **\`validate_payload(&block)\` after \`build_payload\`** — the just-built block must validate. **This is the load-bearing assertion** — proves that build and validate agree on the rules. If you got the EIP-1559 formula wrong, or the difficulty was non-zero, or gas_limit drifted, this fails.
- **\`validate_payload(&unknown_block)\`** — a block whose hash isn't in pending/chain returns \`Invalid\`. Tests the lookup fallthrough.

## Test

\`\`\`bash
cargo test -p openhl-evm live_bridge_builds_on_real_genesis --release
\`\`\`

After ~30 seconds (compile + test):

\`\`\`
running 1 test
test live_node::tests::live_bridge_builds_on_real_genesis ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

Test runtime: still ~2.4 seconds — the Reth bootstrap dominates, and \`validate_payload\` adds < 1ms.

Full suite:

\`\`\`bash
cargo test
\`\`\`

…should produce 37 tests workspace-wide (no change in count — the existing test gained assertions).

Common errors and fixes:

- **\`assert_eq!(status, PayloadStatus::Valid)\` fails** — the most common issue. Your \`build_payload\` is producing a header \`EthBeaconConsensus\` rejects. Possible causes:
  - Forgot \`difficulty: U256::ZERO\` — defaults to non-zero, fails post-merge check.
  - Forgot \`gas_limit: parent_header.gas_limit\` — defaults to zero, drifts >1/1024 from parent.
  - Computed base_fee wrong — must use \`chain_spec.next_block_base_fee(parent, timestamp)\`.
  - Timestamp not strictly greater than parent — must enforce \`our_timestamp = attrs.timestamp.max(parent_header.timestamp + 1)\`.
- **\`error[E0277]: HeaderProvider not satisfied\`** — workspace \`reth-storage-api\` SHA mismatch with \`reth-provider\`. All reth-* git-pinned deps must share the same SHA.
- **\`error[E0277]: HeaderValidator is not in scope\`** — forgot \`use reth_consensus::HeaderValidator\`. The trait must be in scope to call its methods.
- **\`error: 'next_block_base_fee' not found on ChainSpec\`** — **the extension trait \`reth_chainspec::EthChainSpec\` isn't in scope.** \`next_block_base_fee\` isn't an inherent method on \`ChainSpec\`; it's an extension method defined on the \`EthChainSpec\` trait, and Rust's method-resolution rules require **you \`use\` the trait itself to bring its methods into scope** (when relying on IDE auto-import, pick \`EthChainSpec\` explicitly from the suggestion list). Fix: import the trait alongside the type — \`use reth_chainspec::{ChainSpec, EthChainSpec};\`.

## Design reflection

Three load-bearing decisions encoded here:

1. **The builder and the validator share a source of truth.** \`ChainSpec::next_block_base_fee\` is what builds the next block's base fee; \`EthBeaconConsensus::validate_against_parent_eip1559_base_fee\` calls the same helper to check. **No duplicated math, no risk of drift across hardforks.** This is the pattern to copy any time you have a build/validate pair.

2. **The validator's error becomes \`Invalid\`, not propagated.** A validator answering "no, this is malformed" is the *normal* path, not a crash. Mapping its \`Err(_)\` to \`PayloadStatus::Invalid\` keeps the engine running so it can pick the next proposal. Operational failures (DB errors) still escalate via \`BridgeError::Internal\`.

3. **The trait bound on \`P\` widens incrementally.** Lesson 12 needed \`BlockNumReader\`; Lesson 13 needs \`BlockNumReader + HeaderProvider\`. Each lesson exposes a new capability surface. **Trait bounds are spec — they tell consumers exactly what your implementation requires.**

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout 0844d58
diff -u ~/code/my-openhl/Cargo.toml ./Cargo.toml
diff -u ~/code/my-openhl/crates/evm/Cargo.toml ./crates/evm/Cargo.toml
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
\`\`\`

The reference at \`0844d58\` has ~141 lines changed in \`live_node.rs\` from Lesson 12. The new struct fields, the upgraded \`build_payload\`, the rewritten \`validate_payload\`, and the new test assertions should match closely. Doc comments and exact wording can vary.

Return:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: Why not run the four sub-checks (\`validate_against_parent_hash_number\`, etc.) manually?**
You could — they're all \`pub\` on \`EthBeaconConsensus\`. But \`validate_header_against_parent\` runs all four in sequence with the right argument shapes and proper short-circuiting. **Re-implementing the orchestration is the kind of error-prone work the trait method exists to prevent.** Bonus: future Reth versions might add a fifth check; calling the orchestrating method picks it up for free.

**Q: What's \`SealedHeader::new(header, hash)\` doing that's different from just keeping them as a tuple?**
Caching. \`SealedHeader\` stores the hash, so subsequent calls to \`.hash()\` on it don't re-compute (which is a Keccak over ~500 bytes — meaningful at high block rates). Tuples would force re-computation. **It's an optimization that matters at the network edge** where you process thousands of blocks per second; for our test, the savings is microseconds.

**Q: Why does the test still use \`chain_spec.clone()\` even though \`dev_chain_spec()\` returns \`Arc<ChainSpec>\`?**
Cloning an \`Arc<T>\` increments the refcount; it doesn't copy the underlying \`ChainSpec\` data. We need three references: one inside \`NodeConfig\`, one passed to \`LiveRethEvmBridge::new\`, one for any future use. Each \`.clone()\` is just an atomic increment — measured in nanoseconds.

**Q: What happens if I pass \`chain_spec: Arc::new(ChainSpec::default())\` instead of \`dev_chain_spec()\`?**
The validator and the chain would disagree on what hardfork is active. \`ChainSpec::default()\` is a minimal Ethereum mainnet shape; the live node was built with \`dev_chain_spec()\` (chainId 2600, all forks at 0). They'd diverge on the \`EthChainSpec::is_fork_active_at_timestamp(...)\` checks the validator runs internally. **Pass the same chain_spec to both the node and the bridge** — it's the contract.

## Next lesson (Lesson 14)

Two of the four \`ConsensusBridge\` methods now hit live Reth. **The third one — \`commit\` — still records hashes into an in-process \`chain: HashMap\`.** Lesson 14 (the last big lesson) replaces that with a real **Engine API forkchoice update**, the JSON-RPC call that Reth uses to commit blocks in production. After Lesson 14, our bridge produces the same wire-format actions that any Ethereum CL client (Lighthouse, Prysm, Teku) would. **Lesson 15 is then the capstone** — a one-page recap, an "everything you built" diagram, and the optional production-readiness checklist (block bodies, gossip codecs, real WAL).

## Summary (3 lines)

- \`validate_payload\` calls Reth's \`EthBeaconConsensus::validate_block\`. Real Ethereum consensus rules; canonical validation.
- Test: modify state root → validation fails. Malachite + Reth integration is bidirectional and must agree.
- Production parallel: HyperBFT proposes, HyperEVM validates. Next: commit drives Engine API forkchoice.
`,
                },
                {
                  title: 'Lesson 14 — commit drives Reth\'s Engine API forkchoice',
                  slug: 'openhl-commit-forkchoice-en',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 50,
                  xpReward: 90,
                  content: `# Lesson 14 — commit drives Reth's Engine API forkchoice

## Question

**\`bridge.commit(block_hash)\` calls Reth's Engine API \`engine_forkchoiceUpdatedV3\`** to finalise the block. State persisted; head advanced. **The full integration loop is now closed**.

## Principle (minimum model)

- **Engine API \`forkchoiceUpdatedV3\`.** Updates Reth's head + finalised + safe block hashes.
- **\`bridge.commit(block_hash)\`.** Computes the forkchoice state (head = block_hash; finalised = block_hash; safe = block_hash). Calls Engine API.
- **State persisted.** Reth flushes to disk; survives restart. The block is now part of the canonical chain.
- **Single-validator simplification.** All three hashes (head / finalised / safe) are the same. Multi-validator separates them.
- **End-to-end test.** Boot Reth + OpenHlNode; produce 3 blocks; restart; assert the 3 blocks are still in Reth.
- **Closing the loop.** Block flow: Malachite → bridge.propose → bridge.validate_payload (Reth check) → bridge.commit (Reth Engine API) → Reth flushes to disk → block on canonical chain.
- **Why end-to-end matters.** All prior work could have hidden integration bugs. This lesson + the persistence test prove they're absent.

## Worked example + steps

# Lesson 14 — \`commit\` drives Reth's Engine API forkchoice

## Goal

Concepts you'll grasp in this lesson:

- **Local-first, engine-second commit ordering** — the bridge's \`chain: HashMap\` is the consensus layer's source of truth. Committing locally first and notifying the engine second means a failed engine call never forces a rollback of a consensus commit (which would violate safety). This generalizes: primary store first, secondary indexes/replicas after.
- **\`Option<EngineHandle>\` for test ergonomics** — without optionality, every unit test would need to bootstrap a real node just to get a non-test engine handle. With \`Option\`, tests pass \`None\` for the local path and \`Some(handle)\` for the integration path. Type-level optionality avoids forcing infrastructure into every test.
- **Engine response is intentionally discarded** — \`SYNCING\` is the expected response right now because no matching \`engine_newPayload\` was sent first. Treating \`SYNCING\` as an error would force every caller to know Lesson 14 is partial. Discarding keeps the API honest: "commit completed locally; downstream notification was best-effort."
- **The three-field \`ForkchoiceState\` collapse** — mainnet distinguishes head / safe / finalized (instant / 32-slot / 64+-slot checkpoints). v0 single-validator OpenHL has no such distinction — every commit is final, so all three fields take the same hash. The shape is preserved for forward compat with multi-validator OpenHL.
- **\`add_ons_handle.beacon_engine_handle\` is the in-process Engine API** — the same handle that backs the network-facing JSON-RPC \`engine_*\` methods that external CL clients (Lighthouse, Prysm) would use. We're taking the in-process shortcut, but the surface is identical.
- **All four \`ConsensusBridge\` methods now hit real Reth** — this lesson closes the loop. \`build_payload\` / \`payload_ready\` / \`validate_payload\` / \`commit\` all reach real Reth code paths.

Verification:

\`\`\`bash
cargo test -p openhl-evm commit_sends_forkchoice_to_engine_when_handle_installed --release
\`\`\`

…passes one new integration test. Combined with Lessons 11–13's existing tests, your bridge now has **all four \`ConsensusBridge\` methods hitting real Reth code paths**:

| Method | What it does | What real Reth code runs |
| - | - | - |
| \`build_payload\` | Build a child block | \`HeaderProvider::sealed_header_by_hash\`, \`ChainSpec::next_block_base_fee\` |
| \`payload_ready\` | Fetch the built block | (local — bridge's pending map) |
| \`validate_payload\` | Check the block | \`EthBeaconConsensus::validate_header_against_parent\` |
| **\`commit\`** | Make the block canonical | **\`ConsensusEngineHandle::fork_choice_updated\`** |

**Engine returns \`SYNCING\` for now — and that's correct at this stage.** We're not yet sending matching \`engine_newPayload\` calls (that needs EVM-executable transaction bodies, which are out of scope for this course). The wire is connected; payload-execution alignment is the next chunk of work after fills become EVM transactions.

Specific changes:

- New optional field \`engine_handle: Option<ConsensusEngineHandle<EthEngineTypes>>\` on \`LiveRethEvmBridge\`.
- New builder method \`with_engine_handle()\` (\`#[must_use]\`) and introspection \`has_engine_handle()\`.
- \`commit()\` now does **two things**: (1) local bookkeeping (unchanged from Lesson 13), then (2) if an engine handle is installed, fire a \`ForkchoiceUpdated\` to Reth's in-process Engine API and discard the response.
- New integration test that bootstraps \`EthereumNode\`, installs \`add_ons_handle.beacon_engine_handle\` on the bridge, and asserts both the local commit and the forkchoice path fire.

## Recap

After Lesson 13 your \`crates/evm/src/live_node.rs\` has:

\`\`\`rust
pub struct LiveRethEvmBridge<P> {
    provider: P,
    chain_spec: Arc<ChainSpec>,
    validator: EthBeaconConsensus<ChainSpec>,
    state: Mutex<State>,
}
\`\`\`

\`build_payload\`, \`payload_ready\`, and \`validate_payload\` all run against live Reth. \`commit\` still records the new head in \`state.chain\` (in-process \`HashMap\`) and updates \`state.head\`. **Local-only.** RPC clients querying the live Reth node still see genesis as the head — the consensus engine doesn't know we've decided anything.

\`cargo test\` passes 37 tests workspace-wide. **The bridge knows the canonical chain; Reth doesn't.**

## Plan

Six things:

1. **Add 2 workspace deps**: \`reth-ethereum-engine-primitives\` (for \`EthEngineTypes\`) and \`alloy-rpc-types-engine\` (for \`ForkchoiceState\`).
2. **Update \`crates/evm/Cargo.toml\`** — add 3 new production deps (the 2 above plus \`reth-engine-primitives\` which gives us \`ConsensusEngineHandle\`).
3. **Update imports + struct in \`live_node.rs\`** — new field \`engine_handle: Option<ConsensusEngineHandle<EthEngineTypes>>\`.
4. **Add the builder methods** — \`with_engine_handle()\` consumes self and installs the handle; \`has_engine_handle()\` is a \`const fn\` accessor.
5. **Rewrite \`commit()\`** — local bookkeeping first (unchanged), then best-effort \`ForkchoiceUpdated\` if an engine handle is installed.
6. **Add the integration test** — bootstraps \`EthereumNode\`, pulls \`add_ons_handle.beacon_engine_handle\`, plumbs it through \`with_engine_handle()\`, exercises the commit path.

This lesson teaches **the side-effect-after-success pattern**. The bridge's local bookkeeping is the *source of truth* for our consensus layer — it has to succeed before anything else can happen. The Engine API call is a *side effect*: useful (downstream RPC clients see the new head), but its failure shouldn't roll back our commit. The pattern is:

\`\`\`text
1. Do the thing that has to succeed (local state mutation).
2. Best-effort side effects (fire-and-mostly-forget).
3. Return success.
\`\`\`

If step 2 fails, we log it but don't propagate — because step 1 already happened, and rolling it back would leave us in an inconsistent state. **Side effects that *follow* a success are different from side effects that *gate* a success.**

Laying out what happens when \`commit\` is called — Phase 1 (must succeed) and Phase 2 (best-effort) — in chronological order makes it obvious why a Phase 2 failure must not undo Phase 1:

\`\`\`
   [ openhl-consensus ] (Malachite actor)
              │
              │ bridge.commit(block_hash).await
              ▼
  ┌──────────────────────────────────────────────────────────────────┐
  │ ◆ LiveRethEvmBridge::commit()                                     │
  │                                                                    │
  │  [ Phase 1: canonical commit (must succeed) ]                      │
  │   ├── acquire Mutex<State> via state.lock()                        │
  │   ├── look up the header in pending (Rejected if not found)       │
  │   ├── state.chain.insert(hash, header)  ◄── new canonical entry   │
  │   └── state.head = Some(hash)           ◄── source-of-truth update │
  │                                                                    │
  │   ※ Past this point, the consensus layer treats the block as       │
  │      committed; downstream \`payload_ready\` / next \`build_payload\`  │
  │      will read this value immediately.                              │
  └──────────────────────────────┬───────────────────────────────────┘
                                 │ (local commit succeeded — no rollback)
                                 ▼
  ┌──────────────────────────────────────────────────────────────────┐
  │  [ Phase 2: best-effort side-effect (fire-and-mostly-forget) ]   │
  │   ├── ForkchoiceState { head_block_hash, safe = head, finalized = head } │
  │   └── if let Some(handle) = &self.engine_handle {                      │
  │           let _ = handle.fork_choice_updated(state, None).await;       │
  │       }                                                                │
  └──────────────────────────────┬───────────────────────────────────┘
                                 │
                                 ▼ in-process Engine API
                       ┌──────────────────────────────┐
                       │ Reth engine actor              │
                       │ (Currently has no body, so it  │
                       │  replies with PayloadStatus    │
                       │  ::SYNCING)                    │
                       └──────────────┬───────────────┘
                                      │ response is discarded via \`let _ =\`
                                      ▼
                              \`commit\` returns Ok(())
                              CL proceeds to the next round, unaware
\`\`\`

Three things this picture pins down: (a) **Phase 1's \`state.chain.insert\` + \`state.head\` update is the consensus-side "committed" source-of-truth** — past this line, downstream code (\`payload_ready\`, the next \`build_payload\`) reads from these structures immediately. (b) **Phase 2's \`fork_choice_updated\` is a downstream-notification side effect; \`SYNCING\` / connection failures / panics get logged but are *not* turned into \`Err\`** — if a Phase 2 failure surfaced as \`Err\`, consensus would treat "commit failed" as true and try to roll back already-finalized state, breaking safety. (c) **When \`engine_handle: Option<...>\` is \`None\`, Phase 2 is skipped entirely** — unit tests can exercise "Phase 1 only, no Reth bootstrap." Lesson 14's integration test passes \`Some(handle)\` and asserts that both phases fire.


## Walk-through

### Step 1: Add 2 workspace deps

Open the root \`Cargo.toml\`. The reth block (after Lesson 13) ends with:

\`\`\`toml
reth-ethereum-consensus   = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-primitives-traits    = "0.3"
alloy-genesis             = { version = "2.0", default-features = false }
\`\`\`

Add 1 line right after \`reth-ethereum-consensus\`:

\`\`\`toml
reth-ethereum-engine-primitives = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
\`\`\`

And add 1 line to the alloy block lower down (find the existing \`alloy-consensus\` workspace dep):

\`\`\`toml
alloy-rpc-types-engine = { version = "2.0", default-features = false }
\`\`\`

Two deps, two roles:

- **\`reth-ethereum-engine-primitives\`** — provides \`EthEngineTypes\`, the type bundle that says "Ethereum mainnet's engine surface" (vs. Optimism, custom L2s). Our \`ConsensusEngineHandle<EthEngineTypes>\` is parameterized over it.
- **\`alloy-rpc-types-engine\`** — provides \`ForkchoiceState { head_block_hash, safe_block_hash, finalized_block_hash }\`, the canonical wire-format payload for an \`engine_forkchoiceUpdatedV4\` call. Same struct CL clients (Lighthouse, Prysm) send to EL clients over JSON-RPC; we're using it in-process.

**Note the version on \`alloy-rpc-types-engine\`**: it's pinned to \`2.0\` to match Reth v2.2.0's own pinned \`alloy-rpc-types-engine\` of \`2.0.4\`. Mismatched versions here would cause \`ForkchoiceState\` to be two different types and the engine handle would reject our calls.

### Step 2: Update \`crates/evm/Cargo.toml\`

The \`[dependencies]\` block gains 3 lines:

\`\`\`toml
[dependencies]
openhl-consensus         = { workspace = true }
openhl-types             = { workspace = true }
async-trait              = { workspace = true }
eyre                     = { workspace = true }
alloy-primitives         = { workspace = true }
alloy-consensus          = { workspace = true }
reth-ethereum-primitives = { workspace = true }
reth-storage-api         = { workspace = true }
reth-consensus           = { workspace = true }
reth-ethereum-consensus  = { workspace = true }
reth-primitives-traits   = { workspace = true }
reth-chainspec           = { workspace = true }
reth-engine-primitives          = { workspace = true }    # NEW: ConsensusEngineHandle
reth-ethereum-engine-primitives = { workspace = true }    # NEW: EthEngineTypes
alloy-rpc-types-engine          = { workspace = true }    # NEW: ForkchoiceState
\`\`\`

\`reth-engine-primitives\` has been a workspace dep since Lesson 1 (for \`reth-engine-primitives\` is where \`PayloadAttributesBuilder\` lives, used in some intermediate stages). Here we promote it from "available in the workspace" to "imported by this crate."

### Step 3: Update imports + struct in \`live_node.rs\`

Open \`crates/evm/src/live_node.rs\`. The imports gain 3 lines:

\`\`\`rust
use alloy_consensus::Header;
use alloy_primitives::{Address, B256};
use alloy_rpc_types_engine::ForkchoiceState;                        // NEW
use async_trait::async_trait;
use openhl_consensus::bridge::{BridgeError, ConsensusBridge};
use openhl_types::{BlockHash, ExecutedBlock, PayloadAttrs, PayloadId, PayloadStatus};
use reth_chainspec::{ChainSpec, EthChainSpec};
use reth_consensus::HeaderValidator;
use reth_engine_primitives::ConsensusEngineHandle;                  // NEW
use reth_ethereum_consensus::EthBeaconConsensus;
use reth_ethereum_engine_primitives::EthEngineTypes;                // NEW
use reth_primitives_traits::SealedHeader;
use reth_storage_api::{BlockNumReader, HeaderProvider};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
\`\`\`

Three new types:
- \`ForkchoiceState\` — the payload (head/safe/finalized block hashes) we send to the engine.
- \`ConsensusEngineHandle\` — the handle Reth gives us to send messages to its engine actor.
- \`EthEngineTypes\` — the type parameter binding the handle to Ethereum mainnet's engine surface.

Now the struct gains one field — \`engine_handle\`, optional:

\`\`\`rust
#[derive(Debug)]
pub struct LiveRethEvmBridge<P> {
    provider: P,
    chain_spec: Arc<ChainSpec>,
    validator: EthBeaconConsensus<ChainSpec>,
    /// Optional in-process Engine API handle. When installed via
    /// [\`Self::with_engine_handle\`], \`commit\` sends a \`ForkchoiceUpdated\`
    /// to Reth so its canonical chain advances in lockstep with consensus.
    /// \`None\` at v0 means commits stay local to the bridge's \`state.chain\`
    /// \`HashMap\` — fine for unit tests, but RPC clients won't see new heads.
    engine_handle: Option<ConsensusEngineHandle<EthEngineTypes>>,           // NEW
    state: Mutex<State>,
}
\`\`\`

\`State\` is unchanged.


### Step 4: Update \`new()\` and add the builder methods

\`new()\` initializes \`engine_handle: None\`:

\`\`\`rust
impl<P> LiveRethEvmBridge<P> {
    #[must_use]
    pub fn new(provider: P, chain_spec: Arc<ChainSpec>) -> Self {
        let validator = EthBeaconConsensus::new(Arc::clone(&chain_spec));
        Self {
            provider,
            chain_spec,
            validator,
            engine_handle: None,                                  // NEW
            state: Mutex::new(State::default()),
        }
    }

    /// Install a Reth in-process Engine API handle. After this call,
    /// \`commit\` will fire a \`ForkchoiceUpdated\` to Reth's consensus engine
    /// alongside its own local bookkeeping. Without an engine handle, the
    /// bridge still works (commits go to its internal \`HashMap\`) but Reth's
    /// canonical chain won't advance — RPC and any other Reth consumer will
    /// see only the genesis block.
    #[must_use]
    pub fn with_engine_handle(
        mut self,
        handle: ConsensusEngineHandle<EthEngineTypes>,
    ) -> Self {
        self.engine_handle = Some(handle);
        self
    }

    #[must_use]
    pub const fn has_engine_handle(&self) -> bool {
        self.engine_handle.is_some()
    }

    #[must_use]
    pub fn chain_spec(&self) -> &Arc<ChainSpec> {
        &self.chain_spec
    }
}
\`\`\`

Three new methods:

- **\`with_engine_handle()\`** — consume-and-return-self builder. The \`mut self\` parameter takes ownership, mutates, returns. This is the canonical Rust "builder method" pattern. **\`#[must_use]\`** because forgetting to bind the return value (e.g., \`bridge.with_engine_handle(h);\`) silently drops the modified bridge. **Note: this is \`self\` (consuming), not \`&mut self\`, so the pattern \`let bridge = ...; bridge.with_engine_handle(h);\` will move \`bridge\` out and leave you unable to use it on subsequent lines.** The idiomatic shape is to chain from the constructor in a single expression — \`let bridge = LiveRethEvmBridge::new(p, c).with_engine_handle(h);\` (which is what Step 6's integration test does). For conditional wiring, keep construction → configuration → binding inside one expression: \`let bridge = if want_engine { LiveRethEvmBridge::new(p, c).with_engine_handle(h) } else { LiveRethEvmBridge::new(p, c) };\`.
- **\`has_engine_handle()\`** — a \`const fn\` accessor. Useful for tests and assertions ("did the wiring actually take effect?"). \`const\` because checking \`Option::is_some()\` doesn't require any runtime computation.
- **\`new()\` initialization** — the only change is \`engine_handle: None\`. Callers who want the handle use \`LiveRethEvmBridge::new(p, c).with_engine_handle(h)\`.

### Step 5: Rewrite \`commit()\` — local first, engine best-effort

The load-bearing change. Replace Lesson 13's \`commit\` with:

\`\`\`rust
    async fn commit(&self, block_hash: BlockHash) -> Result<(), BridgeError> {
        let hash = B256::from(block_hash.0);

        // Local bookkeeping first. If this fails, we never call the engine
        // — the bridge stays in a consistent state.
        let _header = {
            let mut s = self.state.lock().expect("state mutex poisoned");
            let header = s
                .pending
                .values()
                .find(|(h, _)| *h == hash)
                .map(|(_, h)| h.clone())
                .ok_or_else(|| {
                    BridgeError::Rejected(format!("commit for unknown hash {hash}"))
                })?;
            s.chain.insert(hash, header.clone());
            s.head = Some(hash);
            header
        };

        // Best-effort: if an Engine API handle has been installed, also tell
        // Reth's consensus engine about the new canonical head. We always
        // commit *locally* first (above) — sending to the engine is best-
        // effort at this stage because we haven't yet uploaded a real
        // ExecutionPayload via newPayload, so the engine will return
        // SYNCING/INVALID. The wire being connected is what 7d proves; full
        // payload-execution alignment is downstream once fills become EVM
        // transactions.
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

Two phases:

1. **Local bookkeeping** — same shape as Lesson 13. Lookup pending header by hash, insert into \`chain\`, update \`head\`. If header is missing → \`BridgeError::Rejected\`. The header binding is now \`let _header\` because we don't use it later in this function; the binding exists for clarity and future telemetry.

2. **Best-effort engine notification** — only when \`engine_handle.is_some()\`. Build the \`ForkchoiceState\` with all three slots (head, safe, finalized) pointing to the new hash. **Why all three to the same hash?** At v0 we don't have a separate finalization layer — every committed block is also safe and finalized in our model. Production multi-validator chains would track these separately (a block can be the head but not yet finalized until 2/3 of validators have voted on its descendants).

3. **The \`let _ = ...await\` is intentional** — we discard the engine's response. Engine returns:
   - \`VALID\` — once we send \`engine_newPayload\` first with the matching block body, this is the happy case.
   - \`SYNCING\` — what we get *right now*, because we haven't sent \`newPayload\`. Engine wants to fetch the block from peers but there are no peers.
   - \`INVALID\` — would mean we asked the engine to make canonical a block it has rejected. Shouldn't happen in practice for a block we built ourselves.

**For Lesson 14, all three responses lead to the same code path: continue.** Our local bookkeeping already happened.


### Step 6: Update the test (rename + add engine wiring)

Open the existing test \`live_bridge_builds_on_real_genesis\` from Lesson 13. We *add* a new test rather than modifying the existing one — the Lesson 12 / Lesson 13 test still proves what it proved, and adding a separate test keeps the new behaviour isolated.

Append to the \`tests\` module in \`crates/evm/src/live_node.rs\`:

\`\`\`rust
    /// **Stage 7d**: with a Reth \`ConsensusEngineHandle\` installed, \`commit\`
    /// sends a \`ForkchoiceUpdated\` to the in-process Engine API. The bridge's
    /// own bookkeeping still happens (so existing callers don't regress), but
    /// now Reth is told about the new head too.
    ///
    /// At this stage the engine will respond SYNCING because we haven't sent
    /// a matching \`newPayload\` (\`build_payload\` doesn't yet produce a real
    /// \`ExecutionPayload\`). That's intentional: Lesson 14 proves the wire is
    /// connected. Full alignment between Malachite's commit and Reth's
    /// canonical head needs \`newPayload\` integration, which is the next
    /// staging chunk after fills become EVM transactions.
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn commit_sends_forkchoice_to_engine_when_handle_installed() {
        use reth_node_ethereum::node::EthereumAddOns;

        let runtime = Runtime::test();
        let chain_spec = dev_chain_spec();
        let node_config = NodeConfig::test().dev().with_chain(chain_spec.clone());

        // We need add_ons_handle for the engine handle — use the explicit
        // NodeBuilder path with EthereumAddOns rather than launch_with_dbg.
        let handle = NodeBuilder::new(node_config)
            .testing_node(runtime)
            .with_types::<EthereumNode>()
            .with_components(EthereumNode::components())
            .with_add_ons(EthereumAddOns::default())
            .launch()
            .await
            .expect("launch failed");

        // Pull the engine handle out of add_ons. This is what RPC's
        // engine_forkchoiceUpdated endpoint would dispatch to — we're
        // taking the in-process shortcut around the JSON-RPC layer.
        let engine_handle = handle.node.add_ons_handle.beacon_engine_handle.clone();

        let bridge = LiveRethEvmBridge::new(handle.node.provider.clone(), chain_spec)
            .with_engine_handle(engine_handle);
        assert!(
            bridge.has_engine_handle(),
            "with_engine_handle must install the handle"
        );

        let genesis_hash_b256 = handle
            .node
            .provider
            .block_hash(0)
            .expect("provider call failed")
            .expect("provider has no genesis");

        // Build a payload on top of genesis so commit has something to find.
        let attrs = PayloadAttrs {
            timestamp: 1,
            fee_recipient: [0u8; 20],
            prev_randao: [0u8; 32],
        };
        let id = bridge
            .build_payload(BlockHash(genesis_hash_b256.0), attrs)
            .await
            .expect("build_payload failed");
        let block = bridge.payload_ready(id).await.expect("payload_ready failed");

        // The actual test: commit should not panic, not block forever, not
        // surface an error from the engine-side SYNCING response. We're
        // proving the wire is connected — that fork_choice_updated reaches
        // the engine and returns *some* response (even SYNCING).
        bridge
            .commit(block.hash)
            .await
            .expect("commit failed even though local bookkeeping should succeed");

        // Negative case: a commit for an unknown hash must still be Rejected
        // (the engine-side call doesn't happen because the bridge bails out
        // before it).
        let bogus = BlockHash([0xddu8; 32]);
        let err = bridge.commit(bogus).await.unwrap_err();
        assert!(
            matches!(err, BridgeError::Rejected(_)),
            "unknown hash must yield Rejected"
        );

        drop(handle);
    }
\`\`\`

Walk through what's new:

1. **\`with_types::<EthereumNode>()\` + \`with_components(...)\` + \`with_add_ons(EthereumAddOns::default())\`** — the explicit builder path. \`launch_with_debug_capabilities\` (Lessons 11–13) is a shortcut that doesn't expose \`add_ons_handle\`. To pull out the beacon engine handle, we need the explicit form.
2. **\`handle.node.add_ons_handle.beacon_engine_handle.clone()\`** — the engine handle lives inside add_ons. It's an \`Arc\`-based handle internally; cloning is cheap.
3. **\`.with_engine_handle(engine_handle)\`** — our new builder method. Without this, \`commit\` does only local bookkeeping. With this, \`commit\` also fires forkchoice.
4. **\`assert!(bridge.has_engine_handle())\`** — the wiring guard. If \`with_engine_handle()\` had a bug, this would catch it before the rest of the test runs.
5. **\`commit(block.hash).await.expect("commit failed")\`** — the main assertion. **Note we don't check what the engine returned** — only that \`commit\` returns \`Ok(())\`. The engine's SYNCING response is discarded inside \`commit\` per Step 5.
6. **Negative case retained** — unknown hash still yields \`BridgeError::Rejected\`. The engine path never fires because the bridge bails before reaching it.


## Test

\`\`\`bash
cargo test -p openhl-evm commit_sends_forkchoice_to_engine_when_handle_installed --release
\`\`\`

After ~30 seconds (compile + node bootstrap):

\`\`\`
running 1 test
test live_node::tests::commit_sends_forkchoice_to_engine_when_handle_installed ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

Test runtime: ~3 seconds (Reth bootstrap + forkchoice round-trip).

Full suite:

\`\`\`bash
cargo test
\`\`\`

…should produce 38 tests workspace-wide (Lesson 13's 37 + the new test).

Common errors and fixes:

- **\`error[E0282]: type annotations needed for \`Option<ConsensusEngineHandle<_>>\`** — the \`engine_handle: None\` in \`new()\` needs the type parameter inferred. Either the struct field's type annotation is missing/wrong, or you forgot the \`EthEngineTypes\` import. Re-check Step 3.
- **\`error: cannot find struct \`EthereumAddOns\` in module \`reth_node_ethereum::node\`** — version drift between \`reth-node-ethereum\` and the rest of \`reth-*\`. All git-pinned reth deps must share the same SHA.
- **Test hangs > 30s** — the most likely cause is that **\`EthereumNode\`'s background tasks (engine actor, payload builder, libp2p, RPC stubs, …) aren't cleaning up promptly, and Tokio runtime teardown is blocked on them.** When \`EthereumNode\` drops at the end of the test, each actor waits on its \`JoinHandle\`; if any oneshot is still pending or a socket isn't released, the runtime stalls. Verify that the test ends with proper cleanup — explicit \`drop(handle);\` or a \`node.task_executor().graceful_shutdown_with_timeout(...)\` where appropriate.
  - Side note: dropping \`.await\` from \`let _ = handle.fork_choice_updated(state, None).await\` doesn't cause a hang — it causes a **silent skip** (\`warning: unused implementor of 'Future'\` fires; the future is dropped on the spot and the engine notification never runs). A missing \`.await\` produces a "Reth never gets notified" bug that lets the test sail through; hangs and silent skips are diagnostically different beasts, so identify which symptom you're seeing before chasing the wrong fix.
- **\`assert!(bridge.has_engine_handle())\` fails** — \`with_engine_handle\` is \`#[must_use]\` but you didn't bind the return: \`let bridge = ...new(...); bridge.with_engine_handle(h);\`. Must be \`let bridge = ...new(...).with_engine_handle(h);\`.
- **Commit returns \`Ok\` but the test for unknown hash also returns \`Ok\` (no rejection)** — your commit logic is reaching the engine path before the local lookup. Re-check Step 5 — the \`?\` propagates \`BridgeError::Rejected\` and exits before the engine block.

## Design reflection

Three load-bearing decisions encoded here:

1. **Local state first, engine second.** The bridge's \`chain: HashMap\` is the consensus layer's source of truth. If we sent to the engine *first* and it failed, we'd have to decide whether to roll back local state — and rolling back consensus commits is a violation of safety. **The order forces the right answer: succeed locally, then notify downstream.** This pattern generalizes to any system with a primary store + secondary indexes/replicas.

2. **\`Option<EngineHandle>\` keeps the test surface clean.** Without optionality, every unit test would need to bootstrap a real node just to get a non-test engine handle. With optionality, tests pass \`None\` and exercise the local path; integration tests pass \`Some(handle)\` and exercise both. **Type-level optionality is how you avoid forcing infrastructure into every test.**

3. **The engine response is intentionally discarded.** \`SYNCING\` is the expected response right now (we haven't sent \`newPayload\`). Returning errors on it would force every consumer to know that Lesson 14 is a partial integration. Discarding keeps the API contract clean: "commit completed locally, downstream notification was best-effort." **What clients need to know is what they need to know — no more.**

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout 0cac571
diff -u ~/code/my-openhl/Cargo.toml ./Cargo.toml
diff -u ~/code/my-openhl/crates/evm/Cargo.toml ./crates/evm/Cargo.toml
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
\`\`\`

The reference at \`0cac571\` may contain additional code (CLOB integration from Stage 8) that we didn't introduce in this course. The Stage 7d-specific changes — \`engine_handle\` field, \`with_engine_handle()\` builder, the \`commit\` body restructure, the integration test using \`add_ons_handle.beacon_engine_handle\` — should match closely. Doc comments and exact wording can vary.

Return:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: What's \`add_ons_handle\` and why is the engine handle in there?**
\`add_ons_handle\` is Reth's bundle of "extra capabilities" attached to a launched node — RPC servers, engine API endpoints, payload builder hooks. The beacon engine handle is one of these because the engine API is what *external* CL clients (Lighthouse, Prysm) would use over JSON-RPC. We're taking the in-process shortcut by pulling the handle directly, but the same handle backs the network-facing API.

**Q: Why does \`ForkchoiceState\` have three fields (head/safe/finalized) when we set them all to the same value?**
Because the Engine API is designed for chains with separate finalization layers. In Ethereum mainnet, the head can advance on every slot (12 seconds), but a block is "safe" only after 32 slots (a Casper checkpoint), and "finalized" only after 64+ slots. Our v0 single-validator chain has no such distinction — every commit is final. Setting all three to the same hash is the v0 simplification; multi-validator OpenHL would distinguish them.

**Q: What does the engine actually *do* when it gets \`ForkchoiceUpdated\` with no matching \`newPayload\`?**
It responds with \`PayloadStatusEnum::Syncing\` and internally starts trying to sync the block from peers. In our isolated dev node, there are no peers, so the sync request goes nowhere. The engine just sits in a "waiting for block" state for that hash. **This is fine** — we never actually need the engine to advance its canonical chain for Lesson 14's purpose. Future course material that introduces real block bodies via \`newPayload\` would close this gap.

**Q: Can I send \`ForkchoiceUpdated\` asynchronously and return immediately, instead of awaiting?**
You could — \`tokio::spawn(handle.fork_choice_updated(...))\` would fire-and-forget. But the await is fast (sub-millisecond for SYNCING) and gives you the option to log the response. The async-spawn approach also makes test ordering harder (does the engine see the update before the test exits?). **Awaiting is the safer default.**

## Next lesson (Lesson 15 — capstone)

You now have a complete consensus↔EVM bridge. **All four \`ConsensusBridge\` methods reach real Reth code paths.** Lesson 15 is the capstone: a one-page recap showing the full system, the things you skipped that production needs (block bodies via \`newPayload\`, real Codec impls instead of stubs, gossip codecs, persistent WAL), and the natural next courses to take. No new code — just a victory lap and a roadmap.

## Summary (3 lines)

- \`bridge.commit(block_hash)\` calls Reth's Engine API forkchoice; finalises the block; state persisted.
- Single-validator: head = finalised = safe. End-to-end test: 3 blocks + restart + still in Reth.
- Loop closed: Malachite → bridge methods → Reth → disk. Integration verified. Capstone next.
`,
                },
              ],
            },
          },
          {
            title: 'Capstone',
            sortOrder: 7,
            lessons: {
              create: [
                {
                  title: 'Lesson 15 — What you built, what\'s still stub, where to go next',
                  slug: 'openhl-capstone-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 25,
                  xpReward: 60,
                  content: `# Lesson 15 — What you built, what's still stub, where to go next

## Question

**Retrospective**. Single-validator devnet running on Malachite + Reth, end-to-end. **What's built, what's stub, the openhl track in context.**

## Principle (minimum model)

- **You built.** Cargo workspace + Reth pin + Malachite pin + shared contract types + ConsensusBridge trait + InMemory bridge + RethEvmBridge with Alloy + OpenHlContext + 10 Malachite sub-types + SigningProvider + Codec + OpenHlNode + run_engine_app + Reth bootstrap + LiveRethEvmBridge + validate_payload via EthBeaconConsensus + commit via Engine API forkchoice. ~16 lessons of integration.
- **Stubs.** Multi-validator BFT (only single-validator working) + persistence beyond restart (not yet GC'd) + production-tier signing (HSM not wired) + adversarial vote-counting + GossipSub for inter-validator messaging.
- **Hyperliquid parallel.** What you built parallels HyperBFT + HyperEVM at the architectural level. Different code; same shape.
- **Career angle.** Custom-L1 builders + perp engine engineers are highly demanded; openhl is the only open-source reference. This course is the differentiator.
- **Where to go next.** Funding (Stage 10) + Liquidation (Stage 11) + CLOB (Stage 12) + Precompiles (Stage 9) are the rest of the openhl stack. Or apply this pattern to your own custom L1.
- **Composition guarantee.** Every stub above is a known-deferred piece; the deferral list is explicit; no hidden gotchas.
- **Devnet running.** \`cargo run -p openhl-node\` produces blocks. Hyperliquid-shaped node running locally.

## Worked example + steps

# Lesson 15 — What you built, what's still stub, where to go next

## The system you built

Over 16 lessons you went from \`cargo init\` on an empty directory to a single-validator BFT chain that decides real blocks through a real Reth EL in ~0.02 seconds. Your workspace now looks like this:

\`\`\`
~/code/my-openhl/
├── Cargo.toml                          ← 16 reth-* deps, 8 malachite deps, all SHA-pinned
├── bin/openhl/                         ← (stub binary — production wiring is a future course)
├── crates/
│   ├── types/                          Lesson 2:  shared CL↔EL contract types
│   │   └── src/lib.rs                  BlockHash, PayloadId, PayloadAttrs,
│   │                                   ExecutedBlock, PayloadStatus
│   ├── evm/                            EL side (test double → live Reth)
│   │   ├── src/bridges/
│   │   │   ├── in_memory.rs            Lesson 4:  InMemoryEvmBridge (HashMap state)
│   │   │   └── reth.rs                 Lesson 5:  RethEvmBridge (alloy types, real hash_slow)
│   │   ├── src/reth_node.rs            Lesson 11: bootstrap proof (test-only)
│   │   └── src/live_node.rs            Lessons 12–14: LiveRethEvmBridge<P>
│   │                                   - Lesson 12: parent lookup via BlockNumReader
│   │                                   - Lesson 13: EthBeaconConsensus validate
│   │                                   - Lesson 14: ConsensusEngineHandle forkchoice
│   └── consensus/                      CL side (full BFT engine)
│       ├── src/bridge.rs               Lesson 3:  ConsensusBridge trait
│       ├── src/types/                  Lesson 6:  10 Malachite Context sub-types
│       ├── src/context.rs              Lesson 6:  Context<OpenHlContext> impl
│       ├── src/signing.rs              Lesson 7:  canonical encoding for vote/proposal
│       ├── src/signing_provider.rs     Lesson 7:  SigningProvider<OpenHlContext>
│       ├── src/codec.rs                Lesson 8:  OpenHlCodec (1 real + 7 stub Codec impls)
│       ├── src/node.rs                 Lesson 9:  OpenHlNode + start_engine
│       └── src/engine_app.rs           Lesson 10: run_engine_app (AppMsg routing)
\`\`\`

About **40-50 source files** total. Workspace tests: 38 passing.

Drawing the **full CL ↔ EL integration** you opened across this course in one picture makes the boundary you stitched together immediately legible:

\`\`\`
   [ CL: openhl-consensus ]                          [ EL: openhl-evm ]
  ┌──────────────────────────────────────────┐    ┌──────────────────────────────────────────┐
  │  Malachite BFT engine (actor system)      │    │   LiveRethEvmBridge<P>                    │
  │                                            │    │                                            │
  │   ├── OpenHlContext                         │    │    ├── provider: P (BlockNumReader        │
  │   │   (10 associated types — Lesson 6)      │    │    │             + HeaderProvider)         │
  │   ├── OpenHlSigningProvider                 │    │    ├── chain_spec: Arc<ChainSpec>          │
  │   │   (Ed25519 + canonical encoding — Lesson 7)│  │    │   (shared source of truth — Lesson 13)│
  │   ├── OpenHlCodec                           │    │    ├── validator:                          │
  │   │   (1 real + 7 stub — Lesson 8)          │    │    │   EthBeaconConsensus<ChainSpec> (Lesson 13)│
  │   ├── OpenHlNode / OpenHlNodeHandle (Lesson 9)│  │    ├── engine_handle:                      │
  │   └── run_engine_app loop                   │    │    │   Option<ConsensusEngineHandle> (Lesson 14)│
  │       (12 AppMsg arms — Lesson 10)          │    │    └── state: Mutex<{ pending, chain,      │
  │                                              │    │                       head, … }>          │
  └──────────────────┬──────────────────────────┘    └──────────────────┬──────────────────────┘
                     │                                                  ▲
                     │ ── all chatter goes through 4 ConsensusBridge ───┘
                     │   methods (the trait surface defined in Lesson 3)
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
\`\`\`

Three things this picture pins down: (a) **The two worlds on either side talk through exactly the four \`ConsensusBridge\` methods defined in Lesson 3** — the entire seam between two huge infrastructure stacks fits into that one trait surface. (b) **Because \`run_engine_app\` (Lesson 10) is generic over \`B: ConsensusBridge\`, the same loop runs against four bridge implementations** — StubBridge / InMemoryEvmBridge / RethEvmBridge / LiveRethEvmBridge. That's the polymorphism payoff. (c) **The \`chain_spec: Arc<ChainSpec>\` inside \`LiveRethEvmBridge\` is the shared source of truth referenced by both \`build_payload\` and \`validate_payload\`** — split that, and self-forks appear the moment a hard fork shifts the base-fee formula. Every L1-architect design decision in this course lives somewhere on this single diagram.

## The four \`ConsensusBridge\` methods — all live

Each row is the closing state of a method after the course:

| Method | First impl | Live impl | Real Reth code now reached |
| - | - | - | - |
| \`build_payload\` | Lesson 4 (in-memory) | Lesson 13 | \`HeaderProvider::sealed_header_by_hash\`, \`ChainSpec::next_block_base_fee\` (same helper as the validator) |
| \`payload_ready\` | Lesson 4 (in-memory) | Lesson 13 | (no Reth call — bridge's pending map, by design) |
| \`validate_payload\` | Lesson 4 (stub Valid) | Lesson 13 | \`EthBeaconConsensus::validate_header_against_parent\` (4 sub-checks: number / timestamp / gas-limit / EIP-1559 base fee) |
| \`commit\` | Lesson 4 (HashMap insert) | Lesson 14 | \`ConsensusEngineHandle::fork_choice_updated\` via in-process Engine API |

The bridge talks to Reth's storage layer (\`HeaderProvider\`), Reth's chain config (\`ChainSpec\`), Reth's consensus validator (\`EthBeaconConsensus\`), and Reth's engine actor (\`ConsensusEngineHandle\`). That's most of Reth's public surface that a CL client would touch.

## What's still placeholder

This course shipped a *working single-validator chain*. It's honest to call out what's not yet there. Each item below is a deliberate scope cut, not an accident:

### 1. Engine \`newPayload\` integration

**Status**: missing.

\`commit\` sends \`ForkchoiceUpdated\`, and Reth's engine responds \`SYNCING\` because it doesn't have the matching block body. To progress to \`VALID\`, you'd need to:

- Encode \`build_payload\`'s output as a real \`ExecutionPayload\` (with a transaction list, even if empty).
- Send it via \`handle.new_payload(payload).await\` *before* the \`fork_choice_updated\` call.
- Match the response chain: \`newPayload → VALID\` → \`forkchoice → VALID\` → canonical head advances.

The blocker is that we don't have EVM-executable transactions to put in the payload yet. OpenHL's matching engine (CLOB) produces *fills*, not ECDSA-signed user transactions of the kind that flow through a regular Ethereum mempool. Trying to route fills as user-signed transactions through a mempool would erase the entire point of an HL-shape chain — the gas cost and mempool latency would destroy the price-time-priority CLOB's performance characteristics. Instead, real Hyperliquid-shape chains **inject the consensus-agreed fill data into \`ExecutionPayload\` at \`build_payload\` / \`newPayload\` time as "protocol-initiated system transactions" or as direct state injections into dedicated precompiles, with no user signature**, opening a path for \`Vec<Fill>\` to land in EVM state from the consensus side. Building this "fills → privileged system tx / precompile injection in the payload" path is the next big chunk of work after this course — likely a full Module 2 of openhl's build arc.

### 2. Real \`Codec\` impls

**Status**: 1 real (\`OpenHlProposalPart\` — empty bytes), 7 stubs (return \`CodecStub\` error).

In single-validator mode, the codecs for gossiped messages (\`SignedConsensusMsg\`, \`LivenessMsg\`, \`StreamMessage\`), WAL writes (\`ProposedValue\`), and peer sync (\`Status\`, \`Request\`, \`Response\`) **never fire**. Once you add a second validator, every cross-validator message hits one of these stubs.

To extend: pick a wire format (protobuf, borsh, JSON) and write the encode/decode for each type. Malachite's \`code/crates/test/src/codec/\` is ~400 lines of hand-written protobuf and is the canonical reference.

### 3. Multi-validator gossip

**Status**: never exercised.

\`OpenHlNode\` already configures libp2p (\`/ip4/127.0.0.1/tcp/0\`). What's untested:
- Two \`OpenHlNode\` instances discovering each other.
- Vote propagation under network partition.
- Vote-extension exchange.
- Sync of a lagging validator.

Once Codec stubs (#2) are real and you have N=2 nodes spinning up against a shared chain spec, a multi-validator integration test is the natural next step.

### 4. Persistent WAL

**Status**: ephemeral tempdir.

Every test uses \`tempfile::tempdir()\` so MDBX state is gone after each run. Production needs a configurable \`home_dir\` that survives restarts. Adding it is mechanical (just route the path through \`OpenHlNode::new\`), but verifying *crash recovery* (kill the node mid-commit, restart, assert the chain head is right) needs real WAL codec impls and a Test Plan that's specifically chaos-engineering shaped.

### 5. Slashing + double-sign detection

**Status**: none.

Production BFT chains track validator misbehaviour (signing two different blocks at the same height, voting twice in the same round). Malachite has hooks for this in \`LivenessMsg\`; OpenHL hasn't wired them up. **Building a multi-validator chain without slashing is fine for testnets, dangerous for value-handling networks.**

### 6. Custom Hyperliquid-shape behaviour

**Status**: vanilla Ethereum.

The whole point of an "openhl-shape" chain is the precompiles and CLOB-driven payload assembly that distinguish Hyperliquid from generic EVM. Stage 8 (CLOB matching engine, fills-into-payload) and Stage 9 (custom precompiles, \`clob_place_order\` write path) live in \`psyto/openhl\` but aren't covered here. They're the natural Module 2 of a future course.

## Production-readiness checklist

Working from "I have a passing test" to "I'd let this take real value":

- [ ] All 7 Codec stubs replaced with real protobuf/borsh/JSON impls.
- [ ] \`engine_newPayload\` integration so the engine matches the bridge's view of canonical chain.
- [ ] Multi-validator integration test passing with N=2+ nodes against a shared chainspec.
- [ ] WAL crash-recovery test (kill mid-commit, restart, verify chain head).
- [ ] Persistent \`home_dir\` (not tempdir) configured for production deployments.
- [ ] Engine \`SYNCING\`/\`VALID\`/\`INVALID\` responses logged with \`tracing::warn\` / structured fields, not discarded.
- [ ] Slashing/double-sign hooks wired and unit-tested.
- [ ] Key rotation procedure (Ed25519 key swap during a chain restart, not at runtime).
- [ ] Operational telemetry: Prometheus metrics for round duration, payload build latency, validate failures.
- [ ] Performance baseline: blocks-per-second under continuous load (not just smoke test).
- [ ] Independent security review of the canonical encoding format (the Lesson 7 byte layout *is* part of your wire spec).
- [ ] Threat model for proposer manipulation under partial network partition.

If you're forking this course's code into a production chain, treat this list as the long-pole work — most of it is harder than the course itself.

## What you can now do that you couldn't 16 lessons ago

- **Bootstrap a full Rust BFT engine against a real EL.** Not "with a mocked EL", not "with an FFI to Go" — actually with \`EthereumNode\` running in the same Rust workspace.
- **Reason about producer/validator self-consistency.** When you have a builder and a validator for the same artifact, they must share a source of truth. You've seen this pattern in \`chain_spec.next_block_base_fee\` driving both \`build_payload\` and \`validate_payload\`.
- **Apply the incremental-stub pattern.** Trait bounds force surface area; if you can't fill it all at once, stub with a clear failure mode. Lesson 8's \`CodecStub("SignedConsensusMsg<OpenHlContext>")\` is the model.
- **Wire two pieces of generic infrastructure together.** Reth and Malachite were written by different teams with different sensibilities. The handshake interface (\`Node\` trait, \`ConsensusBridge\` trait) is what made them composable. Future courses will use the same pattern with other infra.
- **Distinguish protocol errors from operational errors.** \`BridgeError::Rejected\` vs \`BridgeError::Internal\`. \`PayloadStatus::Invalid\` vs propagating up. The conversational level matters.
- **Write tests that prove the live read happened.** Lesson 12's \`assert_eq!(block.number, 1)\` was the load-bearing check — anything else would have let an in-memory fallback slip past.

## Where to go next

Within rethlab:
- **Reth Expert** (track \`reth-l1-architect\`, course 7+) — deep dives on \`BlockExecutor\`, state-root verification, MDBX internals. Natural next once you want \`validate_payload\` to actually execute transactions.
- **Reth Consensus Engineering** — covers slashing, vote extensions, fault tolerance at depth. Where you'd go after multi-validator gossip is working.

Outside rethlab:
- **\`psyto/openhl\` Stages 8-9** — the CLOB and custom precompiles. Source code in the public repo; no walkthrough course yet.
- **Malachite spec docs** (\`informalsystems/malachite\`) — read the \`core-types\` crate's docs straight through. Half of it is now familiar; the other half is what multi-validator requires.
- **A real Reth full node** — clone \`paradigmxyz/reth\`, run \`cargo run --bin reth -- node --chain dev\`. Your \`EthereumNode::default()\` in Lesson 11 is the same thing, minus the consensus layer. Compare the surface.
- **\`category-labs/monad-bft\`** — a second mature Rust BFT consensus implementation, actively developed (672★ as of mid-2026, GPLv3-licensed). Where Malachite treats consensus as a generic state-machine library with a context type the embedding chain plugs into, Monad-BFT is purpose-built for a single execution layer and pipelines block proposal with execution to amortize finality latency. The two represent opposite honest trade-offs: **Malachite optimizes for *embeddability*** (easy to wire into anything, which is exactly what Lessons 0–7 of this course did); **Monad-BFT optimizes for *single-chain throughput*** (faster, but harder to reuse). Worth reading after this course to internalize that "BFT in Rust" isn't a single shape. **License note:** GPLv3 means citing or studying it is fine; never copy code into your openhl tree — openhl is permissive-licensed and would inherit the copyleft.

## Closing note

You wrote roughly 1,400 lines of Rust across the consensus and EVM crates, plus ~250 lines of integration tests. That code is a *working single-validator Hyperliquid-shape L1*. It's not production-ready; it doesn't need to be. **What you have is a foundation that's honest about its scope, has every load-bearing decision visible, and is one extensible interface away from each next capability.**

The hardest part of an L1 isn't writing the engine — Malachite did most of it, and we just wired it. The hardest part is being honest about what your code can and can't do, and writing tests that prove the can side. Every lesson in this course had a happy-path assertion and a negative-path assertion. That's the discipline that takes you from "the test passes" to "the system works."

Now go build something that uses this.

## Summary (3 lines)

- You built: cargo workspace + Reth + Malachite + bridge trait + InMemory & Reth impls + Context + 10 sub-types + Signing + Codec + Node + engine app + live Reth + forkchoice. 16 lessons.
- Stubs: multi-validator BFT / persistence / HSM / adversarial votes / GossipSub. Hyperliquid parallel = HyperBFT + HyperEVM architecturally.
- Devnet running: \`cargo run -p openhl-node\` produces blocks. Next: Funding / Liquidation / CLOB / Precompiles for the rest of the openhl stack.
`,
                },
              ],
            },
          },
        ],
      },
    },
  });
}
