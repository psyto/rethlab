// AUTO-GENERATED from drafts/openhl_*_en.md by .github/scripts/build-openhl-seed.ts
// Do not hand-edit. Re-run the build script when drafts change.

import { PrismaClient } from '@prisma/client';

export async function seedRethOpenHlConsensusEN(prisma: PrismaClient) {
  const tags = ["reth","malachite","bft","evm","clob","l1","openhl","expert"];

  await prisma.course.create({
    data: {
      slug: "reth-openhl-consensus-en",
      title: "Build OpenHL — from `cargo init` to a single-validator devnet",
      description:
        "OpenHL is the open-source reference implementation of Hyperliquid (HyperBFT consensus + HyperCore matching engine + HyperEVM execution, all closed source). This is the build-along course for openhl's Module 1 (the consensus substrate): starting from `cargo init` on an empty directory, you write code lesson by lesson and end with a Rust workspace that drives a real BFT consensus round end-to-end through real Reth and real Malachite. By the last lesson, `cargo test first_block_via_engine_actors` produces a passing single-validator round in ~0.02 seconds against code you wrote yourself, with `psyto/openhl` as the answer key. This course covers openhl Build arc Module 1 only — the substrate — not Modules 2-5 (CLOB, precompiles, settlement, vault), which become their own rethlab courses later.",
      difficulty: "EXPERT",
      duration: 125,
      xpReward: 260,
      track: "reth-l1-architect",
      tags,
      isPublished: false,
      sortOrder: 600,
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
                  title: "Build OpenHL — from cargo init to a single-validator devnet",
                  slug: "openhl-orientation-en",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 20,
                  xpReward: 60,
                  content: `# Build OpenHL — from \`cargo init\` to a single-validator devnet

This is not a course you read. This is a course you **build**.

Over the next 14 lessons, you'll start from \`cargo init\` on an empty directory and end with a Rust workspace that compiles, passes a real BFT-consensus integration test, and drives a complete block end-to-end through a real Reth + a real Malachite. The codebase you end with is your own — written by you, line by line — and it will look almost exactly like \`psyto/openhl\` at the same Stage. That repo is your **answer key**.

Hyperliquid moved $300B+ of perp volume in 2025 on a fully closed-source stack — HyperBFT consensus, HyperCore matching engine, HyperEVM execution. There is no public Rust reference. **OpenHL is what the open-source version looks like**, and this course is how you build the Module 1 substrate of it yourself.

## 1. What you'll have at the end

By the end of lesson 14, on your own machine, \`cargo test first_block_via_engine_actors\` will produce a passing single-validator BFT consensus round in roughly 0.02 seconds against real Reth as the EVM layer and real Malachite as the BFT layer. The code path is:

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

This is honest scoping. A "build your own Hyperliquid" course that promises everything in 15 lessons would be lying to you.

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
cargo init --name openhl --lib
# (we'll delete the default lib.rs in lesson 1; this just makes a workspace stub)

# Answer-key reference
mkdir -p ~/code && cd ~/code
git clone https://github.com/psyto/openhl.git openhl-reference
cd openhl-reference
cargo check  # this WILL take a long time the first time — Reth is big
\`\`\`

If \`cargo check\` in \`openhl-reference\` passes, you have the right toolchain. Move on. If it fails, fix toolchain version first — rust-toolchain.toml in that repo pins Rust 1.95.0.

> 🛑 **Anti-fluency.** "I'll just edit \`openhl-reference\` directly." **No.** That repo is your answer key, not your workspace. Treat it as read-only. Edits to \`my-openhl/\` are yours; edits to \`openhl-reference/\` are confusing — you'll lose track of what you wrote vs what was already there.

## 6. The 15-lesson map

Each row is one lesson. Each lesson ends with a passing \`cargo test\`.

| # | Module | What you build | End-of-lesson test |
| - | - | - | - |
| **L0** | Orientation | (this lesson) | setup confirmed |
| **L1** | Foundations | workspace + Reth & Malachite pinned | \`cargo check --workspace\` clean |
| **L2** | Contract types | \`openhl-types\` primitives (BlockHash, PayloadId, ...) | \`cargo test -p openhl-types\` |
| **L3** | Contract trait | \`ConsensusBridge\` trait — 4 messages as async fns | \`cargo check -p openhl-consensus\` |
| **L4** | EL test double | \`InMemoryEvmBridge\` — fake EVM for testing | InMemoryEvmBridge tests pass |
| **L5** | Reth-typed bridge | \`RethEvmBridge\` — same contract, real Reth types | RethEvmBridge tests pass |
| **L6** | CL types | \`OpenHlContext\` + 10 Context sub-types | context compiles |
| **L7** | Signing | \`OpenHlSigningProvider\` — Ed25519 sign/verify | sign/verify round-trip |
| **L8** | Codec + Node | \`OpenHlCodec\` + \`Node\` trait impl | engine start/stop smoke |
| **L9** | App loop | \`run_engine_app\` — the actor pipeline that ties it all together | **\`first_block_via_engine_actors\`** — Module 1 milestone, BFT round closes |
| **L10** | Live Reth | bootstrap a real Reth dev-node in a test | \`reth_dev_node_bootstraps\` |
| **L11** | Live build_payload | \`LiveRethEvmBridge\` reads parent from a live provider | \`live_bridge_builds_on_real_genesis\` |
| **L12** | Live validate_payload | wire \`EthBeaconConsensus\` for real header validation | validate-path tests |
| **L13** | Live commit | wire \`forkchoice_updated\` via Reth's in-process Engine API | \`commit_sends_forkchoice_to_engine\` |
| **L14** | Capstone | write the end-to-end test that openhl doesn't have yet — \`run_engine_app\` + \`LiveRethEvmBridge\` together | your own integration test |

**L9 is the major milestone.** Finishing L9, you have BFT consensus producing a block end-to-end through your actor system. L10-L13 swap your stub Reth for real Reth. L14 lets you exercise the combined whole — something \`psyto/openhl\` itself hasn't built yet (at SHA \`0844d58\`), so you'll be **ahead** of the reference at the end.

## 7. The answer-key discipline

Every lesson cites a \`psyto/openhl\` SHA — the commit where the same code first appeared. After you finish the lesson and your test passes:

\`\`\`bash
cd ~/code/openhl-reference
git checkout <SHA-from-lesson>
# Now compare. Your code in ~/code/my-openhl/ should be ~equivalent.
diff -ru ~/code/my-openhl/crates/types ./crates/types
\`\`\`

Your code will differ in trivial ways (whitespace, variable names, comment wording). What matters: types, signatures, control flow are equivalent. If those diverge meaningfully, the lesson didn't land; re-read the design-reflection section and adjust.

> 🛑 **Anti-fluency.** "I should just type from the answer key." **No, that's the worst path.** If you copy from \`openhl-reference\`, you'll finish in 30 minutes and learn nothing. The point is to type from the lesson description, run into the friction the lesson describes, and arrive at code that happens to match the answer key. The matching is evidence, not the goal.

## 8. Setup confirmation — the actual L0 exercise

Before you move to L1, run all of this and confirm it all passes:

\`\`\`bash
# 1. Rust version
rustc --version    # expect: rustc 1.95.x or later

# 2. Your workspace exists
ls ~/code/my-openhl    # expect: Cargo.toml, src/

# 3. Reference exists and compiles
cd ~/code/openhl-reference && cargo check    # expect: "Finished" eventually
\`\`\`

If all three pass, you are set up correctly. Move to L1.

> **Final check.** In one sentence, what's the difference between \`~/code/my-openhl\` and \`~/code/openhl-reference\` in this course's workflow? If your answer doesn't mention "one is yours, one is the answer key, you write in the first and read the second to verify," re-read §5.`,
                },
              ],
            },
          },
          {
            title: "Foundations",
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: "Lesson 1 — Workspace + Reth + Malachite (Stages 1-3)",
                  slug: "openhl-workspace-en",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 45,
                  xpReward: 80,
                  content: `# Lesson 1 — Workspace + Reth + Malachite (Stages 1-3)

## Goal

By the end of this lesson, run from your \`~/code/my-openhl/\` directory:

\`\`\`bash
cargo check --workspace
\`\`\`

…and see \`Finished\` with no warnings other than "unused dependency" warnings. You'll have a Rust workspace with 10 empty library crates, one binary crate, Reth pinned as a git dependency, and Malachite pinned as a git dependency. **You will have written zero application logic** — that's L2 onwards. This lesson is about getting the dependency graph correct.

The Reth compile graph alone is ~600 crates. The first \`cargo check\` will take 5-15 minutes depending on your machine. Plan accordingly. Subsequent checks are incremental and fast.

## Recap

You ran the L0 setup. You have:

- \`~/code/my-openhl/\` — your workspace, currently a default \`cargo init --lib\` artifact
- \`~/code/openhl-reference/\` — \`psyto/openhl\` cloned, \`cargo check\` passing

This lesson edits files in \`~/code/my-openhl/\`. **Never** touch \`openhl-reference/\`.

## Plan

You'll do three things, in order:

1. **Stage 1** — replace the default \`cargo init --lib\` output with a real workspace: 10 empty library crates, 1 binary crate, top-level \`Cargo.toml\` declaring all the workspace defaults. **Test**: \`cargo check --workspace\` succeeds with no external dependencies.
2. **Stage 2** — pin Reth as a git dependency at a specific SHA, declared at the workspace level. **Test**: \`cargo check --workspace\` still succeeds (no crate uses Reth yet — we just verify the dep resolves).
3. **Stage 3** — pin Malachite the same way. **Test**: \`cargo check --workspace\` still succeeds.

Each stage is a real commit in \`psyto/openhl\`: \`75be9de\`, then \`5fc7ca1\`.

The reason we set up the dep graph before writing application code: dependency resolution is the most common source of friction in a Rust workspace. Getting Reth + Malachite to compile cleanly together is non-trivial — they're both big crates with deep transitive dep trees. **If we deferred this to "later," we'd discover the conflicts in the middle of writing application code and have to backtrack.** Getting the deps right first means every subsequent lesson focuses on the lesson's actual topic, not yak-shaving dependencies.

> 🛑 **Predict.** Before you scroll, sketch: how many \`members\` should the workspace Cargo.toml have, and what should they be? Hint: 10 library crates + 1 binary crate. You learned the 5 subsystems in L0 §3; what 10 crates implement them? (Look at L0 §4 if you need to.)

## Walk-through

### Step 1: Reset \`~/code/my-openhl/\`

The L0 setup left a default cargo project there. We need to wipe it and start fresh:

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
2. **\`unsafe_code = "forbid"\` at the workspace level**. This forbids \`unsafe\` in every member crate. Reth depends on \`unsafe\` internally; we don't. Forbidding it at the application layer is the determinism rail from L0 §4 — if a pure state-machine crate ever wants \`unsafe\`, that's a code review smell.
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

> 🛑 **Anti-fluency.** "Why not write all dependencies up front and avoid edits later?" **No.** A crate with an unused dependency is technical debt: it slows builds, confuses readers, and invites version conflicts. Add dependencies exactly when the code that needs them lands. The workspace \`Cargo.toml\` declares the *available* dependencies; each crate's \`Cargo.toml\` declares the *used* ones.

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

Some \`unused_imports\` warnings are OK (we declared \`serde\` as a workspace dep but most crates don't use it yet). Hard errors are NOT OK — if you see one, the most common causes are:

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

> 🛑 **Predict.** What happens to \`cargo check --workspace\` when you run it now? Pick one before scrolling:
> - (a) Same as before — no change since no crate uses any Reth dep yet
> - (b) Massively slower the first time — fetches and compiles ~600 transitive Reth deps
> - (c) Errors out — Reth needs explicit configuration we haven't provided

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
cargo check --workspace 2>&1 | tail -5
\`\`\`

Expected (the exact "x warnings" count and timing may differ):

\`\`\`
    Finished \`dev\` profile [optimized + debuginfo] target(s) in 23.45s
\`\`\`

You can also try:

\`\`\`bash
cargo build --bin openhl
./target/debug/openhl
\`\`\`

Expected:

\`\`\`
openhl v0.1.0
\`\`\`

That's L1 done.

## Design reflection

Two load-bearing decisions you just encoded:

1. **All external deps are declared at the workspace level**, not per-crate. Per-crate Cargo.toml entries say \`reth-storage-api = { workspace = true }\`, inheriting the version. This means a Reth version bump is a one-line change. The alternative (each crate declaring its own version) would cause every Cargo.toml in 11 crates to drift.

2. **Reth and Malachite are git deps, not crates.io deps.** Both projects publish to crates.io, but with significantly different versioning cadence. Pinning to a specific commit SHA in the workspace is a deliberate trade-off: more friction for bumps, but absolute reproducibility. Production L1s pin like this for the same reason — you don't want your validators desyncing because two of them happened to fetch a different "0.5.x" patch from crates.io.

These two decisions propagate: every later lesson assumes them. When you add \`reth-storage-api = { workspace = true }\` to a crate's \`[dependencies]\` in L11, Cargo finds the workspace-level pin and resolves correctly without you thinking about it.

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
git commit -m "L1 — workspace + Reth + Malachite pinned"
\`\`\`

**Q: Why so many "unused dependency" warnings?** Because each member crate's \`[dependencies]\` section is mostly empty. We declared deps at the workspace level so they're *available*, but no crate has \`[dependencies]\` populated yet. As lessons progress, crates pull in their needed deps and the warnings drop.

**Q: My machine ran out of disk space.** The Reth + Malachite source trees plus their target/ cache can easily reach 10-15 GB. Add disk or move target/ to an external drive via \`[build] target-dir = ...\` in \`.cargo/config.toml\`.

**Q: Can I parallelize fetching deps?** Cargo does this automatically. The "Updating git repository" steps run sequentially because each one writes to the same git cache. The "Compiling" steps fan out across cores. If yours is slow, check \`cargo build -j $(nproc)\`.

## Next lesson (L2)

You have a workspace that compiles. No application logic yet. In L2 we write the first application code — \`openhl-types\`'s \`BlockHash\`, \`PayloadId\`, \`PayloadAttrs\`, \`ExecutedBlock\`, and \`PayloadStatus\`. These are the **shared vocabulary** of the consensus↔EVM contract. After L2, the contract types compile and have basic tests. Then L3 writes the trait that uses them.`,
                },
              ],
            },
          },
          {
            title: "Contract types",
            sortOrder: 2,
            lessons: {
              create: [
                {
                  title: "Lesson 2 — Shared contract types in openhl-types",
                  slug: "openhl-contract-types-en",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 30,
                  xpReward: 60,
                  content: `# Lesson 2 — Shared contract types in \`openhl-types\`

## Goal

By the end of this lesson:

\`\`\`bash
cargo test -p openhl-types
\`\`\`

…passes 4 tests covering the 5 contract primitives you wrote. The \`openhl-types\` crate becomes the **shared vocabulary** that consensus and EVM both depend on — the only crate either side imports for these types. No application logic yet; just data definitions that the contract trait (L3) will reference.

## Recap

After L1, your workspace looks like this:

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

> 🛑 **Predict.** Look at the 5 types in the table above. **Why is \`PayloadStatus\` an enum with three variants (Valid/Invalid/Syncing), not just \`bool\`?** Hint: think about what a consensus node should do when the EL gives each answer. Three different actions, not two.

## Walk-through

### Step 1: Open \`crates/types/src/lib.rs\`

The current contents (from L1):

\`\`\`rust
//! Shared primitives and CL/EL contract types.
\`\`\`

You'll add type definitions below this comment.

### Step 2: Verify \`serde\` is available in \`Cargo.toml\`

L1 set up \`crates/types/Cargo.toml\` with:

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

> 🛑 **Anti-fluency.** "Why not just use \`u64\` directly? PayloadId is just a number." **Because newtypes prevent footguns.** If you use \`u64\`, you can write \`build_payload(..., some_random_u64)\` and Cargo won't catch it. With \`PayloadId(u64)\`, the compiler forces you to spell out \`PayloadId(some_random_u64)\`, making the intent visible. The cost is one extra \`(...)\` per construction; the benefit is that every payload ID in your code is provably a payload ID, not someone's mis-typed integer.

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

The **three variants are not interchangeable**. Treating \`Syncing\` like \`Invalid\` permanently forks you from peers who could have answered. Treating \`Invalid\` like \`Syncing\` lets bad proposals through. The L3 lesson on the trait will get into this; for now, you encoded the three distinct verdicts.

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

Append to \`crates/types/src/lib.rs\`:

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

The last test needs \`serde_json\` as a dev-dependency. Add it to \`crates/types/Cargo.toml\`:

\`\`\`toml
[dev-dependencies]
serde_json = { workspace = true }
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

2. **PayloadStatus is an enum, not a bool.** L0 / your prediction above flagged this. The three states are not interchangeable: the consensus-side response depends on *which* not-Valid state the EL is in. Collapsing them to \`bool { is_valid }\` would lose information that's load-bearing for chain liveness — a Syncing node treated as Invalid permanently forks from peers who could have helped it.

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
It's a hash of the previous block's RANDAO mix (Ethereum's beacon-chain randomness beacon). 32 bytes = SHA-256 output. The actual entropy source is the beacon chain, but we receive it as a hash, so the type is \`[u8; 32]\`.

**Q: Should \`BlockHash\` derive \`Default\`?**
It can (\`Default\` for \`[u8; 32]\` is all-zeros), but **we don't here** — the openhl convention is that block hashes are computed from real data; a default-constructed \`BlockHash([0u8; 32])\` is a code smell. Let test code that needs a sentinel write \`BlockHash([0u8; 32])\` explicitly.

## Next lesson (L3)

\`openhl-types\` now has 5 contract types. L3 is the \`ConsensusBridge\` trait — the 4-method API surface that consensus calls into. The trait will reference the types you just wrote: \`build_payload(BlockHash, PayloadAttrs) -> PayloadId\`, \`payload_ready(PayloadId) -> ExecutedBlock\`, etc. After L3 the contract is fully specified at the type level; L4 starts implementing it.`,
                },
                {
                  title: "Lesson 3 — The ConsensusBridge trait",
                  slug: "openhl-bridge-trait-en",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 30,
                  xpReward: 60,
                  content: `# Lesson 3 — The \`ConsensusBridge\` trait

## Goal

By the end of this lesson:

\`\`\`bash
cargo check -p openhl-consensus
\`\`\`

…passes. The \`openhl-consensus\` crate now contains the four-message \`ConsensusBridge\` trait — the typed API surface that consensus calls into and execution implements. **No impls yet** (those start in L4); just the trait and its associated error type. Once this compiles, the contract is fully defined at the type level, and every later lesson is "fill in this trait method" or "use a method on this trait."

## Recap

After L2:

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

1. **Add 4 dependencies** to \`crates/consensus/Cargo.toml\`: \`openhl-types\` (to use the types from L2), \`async-trait\` (the macro that makes \`async fn\` legal in trait methods), \`thiserror\` (derive macro for nice error types), \`eyre\` (a \`Result\` library that pairs well with \`thiserror\`).
2. **Create \`crates/consensus/src/bridge.rs\`** with the \`ConsensusBridge\` trait (4 async methods) and the \`BridgeError\` enum (3 variants).
3. **Wire \`bridge\` into the crate** by adding \`pub mod bridge;\` to \`crates/consensus/src/lib.rs\`.

This trait is the **single most-referenced artifact in the entire course**. L4 implements it (\`InMemoryEvmBridge\`). L5 implements it again (\`RethEvmBridge\`). L9 calls into it from the actor pipeline. L11-L13 implement it a third time (\`LiveRethEvmBridge\`). **The signatures you write now propagate everywhere downstream.**

> 🛑 **Predict.** Look at the four method names again: \`build_payload\`, \`payload_ready\`, \`validate_payload\`, \`commit\`. **Three of them are CL → EL (consensus calling execution); one is EL → CL (execution responding). Which one is the EL → CL direction, and why?** Hint: think about which method's *return value* the consensus side is waiting on.

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

- **\`openhl-types\`** because the trait signatures reference \`BlockHash\`, \`PayloadAttrs\`, \`PayloadId\`, \`ExecutedBlock\`, \`PayloadStatus\` — all five types from L2.
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

> 🛑 **Anti-fluency.** "Can't I just write \`async fn\` directly without the macro?" **As of Rust 1.75 you can, but with caveats.** Native async-fn-in-trait doesn't yet give you \`Send\` bounds on the returned future automatically, and \`dyn Trait\` for traits with native async fns has rough edges. \`#[async_trait]\` is the boring, working solution. When the native feature matures (likely 1.95-2025+), we can revisit. For now: macro.

### Step 4: Understand the four method signatures

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

**Why split into \`build_payload\` + \`payload_ready\` instead of one \`build_payload -> ExecutedBlock\`?** Because the EL needs to build *during* the previous round's voting. If \`build_payload\` returned the block synchronously, the proposer would have to wait for build before broadcasting; with the split, build runs in the background while voting happens, and the proposer's hot path becomes "fetch the prepared block" (microseconds). This is the **single most important latency trick** in the design. Sub-second block times depend on it.

\`\`\`rust
async fn validate_payload(
    &self,
    block: &ExecutedBlock,
) -> Result<PayloadStatus, BridgeError>;
\`\`\`

Different shape: \`&ExecutedBlock\` (borrowed, not owned). The bridge is *examining* the block, not consuming it. Returns \`PayloadStatus\` (the enum from L2): Valid / Invalid / Syncing.

**Why borrowed?** Because consensus may need to inspect the same block multiple times (broadcast it, persist it, then validate). Taking ownership would consume the value at the call site, forcing the caller to clone. Borrowing lets the caller keep it.

\`\`\`rust
async fn commit(&self, block_hash: BlockHash) -> Result<(), BridgeError>;
\`\`\`

Smallest signature: hash in, unit out. **Fire-and-forget.** When consensus has decided on a block, this method tells the EL to finalize it. The EL applies it to state, updates fork-choice, and never sees this hash unset later. Returning \`Result<()>\` lets the EL signal a hard failure (which **halts the chain** — see L9), but successful commits return nothing.

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

## Next lesson (L4)

The contract is now fully specified at the type level. L4 starts implementing it. We write \`InMemoryEvmBridge\` — a test double that stores fake blocks in a \`Mutex<HashMap>\` and returns synthesized hashes. No real EVM, no real state — just enough to make the trait satisfiable and the consensus side testable. **Critically, the same trait \`ConsensusBridge\` covers both \`InMemoryEvmBridge\` (L4) and \`LiveRethEvmBridge\` (L11+) — that's the polymorphism win we're paying for with the \`Send + Sync\` bound and \`async_trait\` macro.**`,
                },
              ],
            },
          },
        ],
      },
    },
  });
}
