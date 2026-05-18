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
      duration: 20,
      xpReward: 60,
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
        ],
      },
    },
  });
}
