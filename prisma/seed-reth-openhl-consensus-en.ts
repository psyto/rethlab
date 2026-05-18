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
      duration: 205,
      xpReward: 400,
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
          {
            title: "EL test double",
            sortOrder: 3,
            lessons: {
              create: [
                {
                  title: "Lesson 4 — InMemoryEvmBridge — first impl of the trait",
                  slug: "openhl-in-memory-bridge-en",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 40,
                  xpReward: 70,
                  content: `# Lesson 4 — \`InMemoryEvmBridge\` — first impl of the trait

## Goal

By the end of this lesson:

\`\`\`bash
cargo test -p openhl-evm
\`\`\`

…passes 5 tests covering build → ready → commit flows of the in-memory bridge. You have the first **concrete implementation** of \`ConsensusBridge\` from L3 — a test double that pretends to be an EVM, stores fake blocks in a \`Mutex<HashMap>\`, and lets you exercise the trait without spinning up Reth. The consensus crate's later tests will use this; so will the future runner and engine_app code in L8/L9.

## Recap

After L3:

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

This is the first time you write a Rust impl. The pattern you encode here repeats: \`RethEvmBridge\` in L5 uses the same skeleton, and \`LiveRethEvmBridge\` in L11+ does too. **The state-management pattern (Mutex<State> with pending vs chain maps) propagates to those impls too.**

> 🛑 **Predict.** Before scrolling: what does the test double's \`build_payload\` need to **fake**, vs what can it **actually do**? Hint: it can't run an EVM, but it can: assign a \`PayloadId\`, increment a block number, synthesize a hash, remember the pending block. The fake-vs-real distinction matters in L5 + L11.

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
//! real Reth-backed implementation lives in \`engine.rs\` (lands in L5).
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

> 🛑 **Anti-fluency.** "I should use a real cryptographic hash for \`BlockHash\`." **No** — this is a test double. Real hashing requires running the EVM to compute the post-state root, which is what we're avoiding by using a test double in the first place. The synthesized hash satisfies the *uniqueness* requirement of \`BlockHash\` without satisfying the *cryptographic-commitment* requirement, which is fine for unit tests. Module 1 L11+ (LiveRethEvmBridge) does real hashing — but it depends on Reth doing the work.

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

The simplest one in this impl. We're a test double — we just assert any block is valid. Real validation in L12 will run \`EthBeaconConsensus::validate_header_against_parent\` against the actual parent. For now, returning \`Valid\` makes consensus tests work.

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

1. **State lives behind a \`Mutex<State>\`.** This is what makes \`InMemoryEvmBridge\` thread-safe — and therefore \`Send + Sync\`. The alternative (lock-free, atomic-only mutation) would be far more complex for a test double. Locks are fine when the contention is low (test code) or the critical sections are short (real code). The pattern propagates to \`LiveRethEvmBridge\` in L11+, which uses the same \`Mutex<State>\` shape.

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
The most common cause is that an earlier test panicked inside the same impl while holding the lock, leaving it in a poisoned state. Cargo runs tests in parallel by default; if you're sure the issue is real, run \`cargo test -p openhl-evm -- --test-threads=1\` to serialize. (In our case it's almost certainly a test-code bug, since each test creates its own \`InMemoryEvmBridge::new()\` — no shared state.)

**Q: Should \`pending\` use \`HashMap<PayloadId, _>\` instead of \`HashMap<u64, _>\`?**
Either works. The openhl convention is to use the inner type (\`u64\`) at the storage layer to avoid wrapping/unwrapping inside lookups. The public API still uses \`PayloadId\`. The trade-off: with \`HashMap<PayloadId, _>\`, you get type safety at the price of \`.0\` accessors on every key. With \`HashMap<u64, _>\`, you give up some type safety at the storage layer but avoid the noise. Personal preference; we picked \`u64\`.

**Q: Why is \`hex_short\` only first 8 bytes? Why not full?**
Logs need to be short. A full 32-byte hex is 64 chars — eats the log line. The first 8 bytes (16 hex chars + "0x") is enough to identify a block in dev/test scenarios. Production logs would use the full hash; the helper would change accordingly.

**Q: Tests pass but I get clippy warnings about \`unused_imports\`.**
Make sure each import is actually used somewhere in your code. The boilerplate I gave imports \`std::fmt::Write as _\` — that's only used inside \`hex_short\`. If you didn't write \`hex_short\` yet, the import is unused. Add the helper or remove the import.

## Next lesson (L5)

You have a working \`ConsensusBridge\` impl, but it doesn't use Reth at all. L5 writes the next impl: \`RethEvmBridge\`. Same trait, but the \`ExecutedBlock\` is now built from a real \`alloy_consensus::Header\` (not synthesized), and the \`BlockHash\` is a real \`B256\` hashed via Reth's \`Header::hash_slow\`. Still in-memory state (no live Reth provider), but the **types are real**. This is the bridge between toy types (L4) and live integration (L11+).`,
                },
                {
                  title: "Lesson 5 — RethEvmBridge with real alloy types",
                  slug: "openhl-reth-bridge-en",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 40,
                  xpReward: 70,
                  content: `# Lesson 5 — \`RethEvmBridge\` with real alloy types

## Goal

By the end of this lesson:

\`\`\`bash
cargo test -p openhl-evm
\`\`\`

…passes **9 tests** (5 from L4's \`InMemoryEvmBridge\` + 4 new ones for \`RethEvmBridge\`). The new bridge is structurally identical to L4's, but it stores \`alloy_consensus::Header\` (the real Ethereum header struct) instead of synthesized blocks, and computes block hashes via \`Header::hash_slow()\` (real RLP-encoded SHA-256) instead of fabricated bytes.

**This is the first time your code touches alloy/Reth types.** The pattern of "synthesized for tests, real types for production-shape" repeats throughout the course; learning it cleanly here saves time in L11+.

## Recap

After L4:

\`\`\`
crates/evm/src/in_memory.rs — InMemoryEvmBridge (synthesized blocks, 5 tests passing)
crates/evm/src/lib.rs       — pub mod in_memory; pub use InMemoryEvmBridge;
crates/evm/Cargo.toml       — 3 deps (openhl-consensus, openhl-types, async-trait), tokio dev-dep
\`\`\`

\`cargo test -p openhl-evm\` passes 5/5.

## Plan

Six things:

1. **Add 2 alloy deps** to \`crates/evm/Cargo.toml\`: \`alloy-primitives\` (for \`B256\`, \`Address\`) and \`alloy-consensus\` (for \`Header\`). Both already in workspace deps from L1.
2. **Create \`crates/evm/src/engine.rs\`** with \`RethEvmBridge\` struct, private \`State\` struct (storing \`Header\` instead of synthesized \`ExecutedBlock\`), and \`impl ConsensusBridge for RethEvmBridge\` block.
3. **Three type-conversion helpers** (\`to_b256\`, \`from_b256\`, \`to_executed_block\`) bridging the trait's \`BlockHash\` and the internals' \`B256\` + \`Header\`.
4. **4 unit tests**, one of which proves real hashing — mutating a header field changes the hash.
5. **Wire \`engine\` into the crate** by adding \`pub mod engine;\` + re-export to \`lib.rs\`.
6. **Run** \`cargo test -p openhl-evm\` — all 9 tests pass.

The key step is #2 — the **shape of internal state changes**. L4 stored \`ExecutedBlock\` directly. L5 stores \`(B256, Header)\`: the alloy-native types, with conversion to/from \`ExecutedBlock\` only at the trait boundary. **The alloy types are the source of truth; \`ExecutedBlock\` is just the contract serialization.** This separation is what L11+ extends — \`LiveRethEvmBridge\` keeps the same internal-vs-boundary split, just adds a real Reth provider behind it.

> 🛑 **Predict.** L4's \`InMemoryEvmBridge\` synthesized a hash from \`(id, number)\`. L5's \`RethEvmBridge\` calls \`header.hash_slow()\` — real RLP encoding + Keccak-256. **What testable behavior does this difference enable?** Hint: think about what happens to the hash if you change a single field on the header.

## Walk-through

### Step 1: Add alloy deps to \`crates/evm/Cargo.toml\`

Open \`crates/evm/Cargo.toml\`. The current \`[dependencies]\` section (from L4):

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

Both are inherited from \`workspace.dependencies\` (set up in L1). \`alloy-primitives\` gives us \`B256\` (32-byte hash newtype) and \`Address\` (20-byte address newtype). \`alloy-consensus\` gives us \`Header\` (Ethereum block header struct with all its fields).

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
//! The live-node bootstrap lands in later lessons (L10-L13); the type
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

The new imports vs L4:

- \`alloy_consensus::Header\` — the canonical Ethereum block header struct (~20 fields: parent_hash, number, timestamp, beneficiary, gas_limit, base_fee, state_root, etc.)
- \`alloy_primitives::{Address, B256}\` — the address type (20 bytes) and the hash type (32 bytes). Both are newtypes over byte arrays, like \`BlockHash\` from L2 — but they come from alloy and are the convention across the Ethereum Rust ecosystem.

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

Same shape as L4's \`InMemoryEvmBridge\`, but the **types inside \`State\` are different**:

| Field | L4 (InMemory) | L5 (Reth) |
| - | - | - |
| \`pending\` | \`HashMap<u64, ExecutedBlock>\` | \`HashMap<u64, (B256, Header)>\` |
| \`chain\` | \`HashMap<[u8; 32], ExecutedBlock>\` | \`HashMap<B256, Header>\` |
| \`head\` | \`Option<BlockHash>\` | \`Option<B256>\` |

**Why store \`(B256, Header)\` not \`Header\` alone?** Because \`Header::hash_slow()\` is expensive — it RLP-encodes the entire header and runs Keccak-256. We compute the hash once at insert time and cache it in the tuple, so \`pending.get(id)\` returns both without re-hashing. The hash is the lookup key for \`chain\` (and the lookup criterion for \`commit\`), so we want it ready.

**Why \`B256\` instead of \`[u8; 32]\` for \`chain\` key and \`head\`?** Because we're now in alloy-native space — once you have a \`Header\`, the natural hash type is \`B256\`. Using \`[u8; 32]\` would require \`.0\` accessors everywhere. The conversion to \`BlockHash\` happens only when we cross the trait boundary, in helper functions (Step 6).

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
3. **Allocate payload ID** — same as L4.
4. **Build a \`Header\`** with the field defaults except for the ones we're setting:
   - \`parent_hash\` — the alloy \`B256\` from the trait input
   - \`number\` — parent + 1
   - \`timestamp\` — from \`PayloadAttrs\`
   - \`beneficiary: Address::from(attrs.fee_recipient)\` — convert from \`[u8; 20]\` to alloy's \`Address\` newtype
   - \`mix_hash: B256::from(attrs.prev_randao)\` — convert from \`[u8; 32]\` to \`B256\`
   - \`..Default::default()\` — fills in all remaining fields with zero/default values (state_root, gas_limit, etc.)
5. **\`header.hash_slow()\`** — **the real hash computation**. This RLP-encodes the entire \`Header\` (all ~20 fields, including the defaulted ones), then runs Keccak-256, producing a \`B256\`. The name "slow" is a convention — \`hash_fast\` would only exist if a cached hash were already on the header struct, which is not our case.
6. **Insert \`(hash, header)\`** into pending, keyed by payload ID. Return the ID.

**This block hash is real.** If any field of the header changes between two \`build_payload\` calls — even by one byte — the resulting hash differs. The L4 synthesized hash didn't have this property; the L5 hash does. The test in Step 9 proves this.

> 🛑 **Anti-fluency.** "Why not store \`hash\` separately from \`header\` instead of as a tuple — it's clearer." **You could, with one more field on \`State\`. But the tuple captures the relationship: this hash is the hash *of this exact header*.** Storing them separately invites the bug where someone mutates the header and forgets to recompute the hash. The tuple makes them inseparable.

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
        // Real validation requires a live Reth provider + EVM (lessons L11+).
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

**\`validate_payload\`** is still a stub. Real validation against a live Reth provider lands in L12; for now we accept structurally.

**\`commit\`** mirrors L4 with type substitutions:
- \`to_b256(block_hash)\` converts the trait's \`BlockHash\` to \`B256\`
- We search \`pending.values()\` for a tuple whose hash matches
- Insert the header into \`chain\` (keyed by \`B256\`)
- Update \`head\`

Notice the closure pattern \`find(|(h, _)| *h == hash)\` — destructure the tuple, compare the first element. The \`*h\` dereferences the \`&B256\` to a \`B256\` so we can compare with \`hash\` (also a \`B256\`).

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

> 🛑 **Anti-fluency.** "\`B256\` and \`BlockHash\` both wrap \`[u8; 32]\`. Can't I just \`transmute\` between them?" **Don't.** Even though the byte layout is identical, the types are distinct in the type system — that's the point. The conversion functions document where the boundaries are. If a future change makes \`BlockHash\` carry additional metadata (e.g., a checksum), \`transmute\` becomes a bug; \`to_b256\` becomes a place to update.

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
| \`build_then_ready_returns_alloy_hashed_block\` | Real hashing — same \`parent\` + different \`timestamp\` produces different \`hash\`. This is the test L4 couldn't write (synthesized hashes were timestamp-blind). |
| \`commit_advances_head\` | After commit, head points to the new block (in \`B256\` form internally). |
| \`build_on_committed_parent_increments_number\` | Number monotonicity, same as L4. |
| \`commit_unknown_hash_errors\` | Unknown-hash commit returns \`BridgeError::Rejected\`. |

The **key new test** is the first one. It mutates a single field (\`timestamp\`) of the \`Header\` and asserts the resulting hash differs. This proves the hashing is real — alloy is actually RLP-encoding and Keccak-256-ing the header. L4's synthesized hash from \`(id, number)\` would have failed this test (same parent, same number → same synthesized hash regardless of timestamp).

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

The 4 L5 tests pass alongside the 5 L4 tests — **both implementations satisfy the same trait**, and the same \`ConsensusBridge\` consumer code (which we'll write in L8/L9) works against either.

Common errors and fixes:

- **\`Header::hash_slow()\` returns wrong type** — if you wrote \`let hash: BlockHash = header.hash_slow();\` directly, that fails. \`hash_slow()\` returns \`B256\`; convert via \`from_b256\` after.
- **\`assert_ne!(block.hash, block2.hash)\` fails** — your \`..Default::default()\` might be the issue. Are you constructing \`Header\` with \`..Default::default()\` at the end? Without it, you might have all-zeros and same-timestamp-but-still-equal hashes.
- **\`B256::from(attrs.fee_recipient)\` errors** — \`fee_recipient\` is \`[u8; 20]\`, but \`B256\` is \`[u8; 32]\`. The correct conversion is \`Address::from(attrs.fee_recipient)\`.

## Design reflection

Three load-bearing decisions encoded:

1. **Internal types are alloy-native; trait types are the contract serialization.** State stores \`(B256, Header)\`. The trait returns \`ExecutedBlock\`. Conversion happens at exactly the trait boundary (\`to_executed_block\`). This means alloy can evolve its types without breaking the trait — only the conversion helpers update. **Decoupling production-shape internal types from the contract is what lets \`LiveRethEvmBridge\` (L11+) reuse the same trait.**

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

The reference's Cargo.toml at \`c938321\` also lists \`reth-ethereum-primitives\` (without using it in \`engine.rs\`). It's a forward-declared dep for later lessons; our L5 omits it. Both are correct.

Return:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: Why have *two* bridge impls — InMemoryEvmBridge and RethEvmBridge — both with the same logic?**
The logic is the same; the **types are different**. \`InMemoryEvmBridge\` uses synthesized types (for fast unit tests). \`RethEvmBridge\` uses alloy types (for tests that validate alloy interop). Later, \`LiveRethEvmBridge\` will use alloy types AND a live Reth provider. Each step adds production fidelity while keeping the trait surface stable.

**Q: \`Header\` has ~20 fields. Why do I only set 4?**
The unset fields get \`Default::default()\` values: \`state_root = B256::ZERO\`, \`gas_limit = 0\`, \`base_fee_per_gas = None\`, etc. At v0 we don't have an EVM running, so we can't compute a real \`state_root\`; we accept zero. Production code (L11+) computes these from the live Reth provider.

**Q: What's the difference between \`hash_slow\` and \`hash_fast\` in alloy?**
There's no \`hash_fast\` method on \`Header\`. The naming convention is: methods that recompute a value are "slow," methods that return a pre-cached value are "fast." \`Header\` doesn't have a pre-cached hash, so we get only \`hash_slow\`. Some types in alloy (like \`SealedHeader\`) carry the hash and offer \`.hash()\` as the "fast" alternative.

**Q: Should I \`cargo update\` to get the latest alloy?**
No — the workspace pins alloy to specific versions (\`alloy-primitives = "1.5"\`, \`alloy-consensus = "2.0"\`). \`cargo update\` would just verify those resolve; it wouldn't bump. To bump alloy: edit \`workspace.dependencies\` in the root \`Cargo.toml\`, then \`cargo update\` to refresh the lock file.

## Next lesson (L6)

You've now written two \`ConsensusBridge\` impls — one synthesized, one with real alloy types. Both are usable by consensus-side test code, which you'll start writing in L8. But first, in L6, we go to the consensus side properly: we implement Malachite's \`Context\` trait — the type-level API surface that Malachite requires from any chain that uses it. 10 associated types, 4 factory methods. After L6, your chain can answer "what's our \`Address\` type, our \`Height\` type, our \`Value\` type" to Malachite. This is the **other half** of the contract: L3 was the trait we own; L6 is the trait Malachite owns.`,
                },
              ],
            },
          },
        ],
      },
    },
  });
}
