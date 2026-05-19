// AUTO-GENERATED from drafts/openhl_clob_*_en.md by .github/scripts/build-openhl-clob-seed.ts
// Do not hand-edit. Re-run the build script when drafts change.

import { PrismaClient } from '@prisma/client';

export async function seedRethOpenHlClobEN(prisma: PrismaClient) {
  const tags = ["reth","malachite","clob","matching-engine","evm","l1","openhl","expert"];

  await prisma.course.create({
    data: {
      slug: "building-openhl-clob-en",
      title: "Build OpenHL CLOB — adding the matching engine",
      description:
        "Course 7 of 10 in the L1 Architect track. Continues the openhl-based build-along arc from `building-openhl-consensus`: starting from a workspace that has the consensus substrate (live Reth + Malachite, single-validator BFT producing blocks in 0.02s), the reader adds the CLOB matching engine and wires its fills into committed blocks. End state: `cargo test clob_fills_flow_into_payload` passes — a real fill produced by the price-time-priority matching engine flows through `LiveRethEvmBridge::build_payload` and lands in a consensus-committed payload. Covers openhl Stage 8a (701 LOC, pure state machine) + Stage 8d (171 LOC, bridge integration). Out of scope: custom EVM precompiles (course 8), funding state machine (course 9).",
      difficulty: "EXPERT",
      duration: 40,
      xpReward: 110,
      track: "reth-l1-architect",
      tags,
      isPublished: false,
      sortOrder: 700,
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
                  title: "Build OpenHL CLOB — adding the matching engine on top of the substrate",
                  slug: "openhl-clob-orientation-en",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 15,
                  xpReward: 50,
                  content: `# Build OpenHL CLOB — adding the matching engine on top of the substrate

The previous course (\`building-openhl-consensus\`) ended with a single-validator BFT chain that decides blocks through a real Reth EVM in 0.02 seconds. **It decides empty blocks.** No transactions. No matching. No price discovery.

This course adds the **CLOB matching engine** — the part of Hyperliquid that turns "I want to buy 10 HYPE at $25" + "I want to sell 5 HYPE at $25" into a real fill. Stage 8a (701 lines) builds the pure state machine; Stage 8d (171 lines) wires it into the bridge so committed blocks now carry the fills the matching engine produced.

By the end of this course, \`cargo test clob_fills_flow_into_payload\` passes — a real fill flows from the matching engine through \`LiveRethEvmBridge::build_payload\` and into a payload that consensus then commits.

## 1. What you'll have at the end

A new \`crates/clob/\` crate with:

- **A price-time-priority matching engine** that runs in microseconds — pure state machine, no I/O, fully deterministic.
- **\`Book\` + \`Order\` + \`Fill\` types** that match what a CEX would call its order book.
- **12 tests passing**: 9 hand-traced scenarios (empty book, FIFO priority, market-order liquidity exhaustion, partial fills, cancellation, no-crossed-book post-match) and 3 proptest invariants exercising 768 random scenarios (quantity conservation, no-crossed-book always, determinism = replayability).

And a new integration test in \`crates/evm/\`:

- **\`clob_fills_flow_into_payload\`** — bootstraps a real Reth node, submits a maker bid + crossing taker sell to the bridge's CLOB, asserts the resulting fill appears in the next \`build_payload\` output, and asserts that **earlier payloads weren't retroactively filled** (drain semantics are forward-only).

By the time you finish, you can:

- Explain why a price-time-priority CLOB is the canonical structure for on-chain perpetual exchanges
- Reason about the trade-offs between matching engines that buffer fills (this one) vs those that emit them synchronously
- Reproduce the matching logic from scratch — and modify it (e.g., to support stop orders, post-only orders, or pro-rata matching) by knowing where to cut into the code

## 2. What you won't have at the end

This course covers **Stage 8a + 8d only**. It does NOT cover:

- Stage 9: custom EVM precompiles that read/write CLOB state (= course 8)
- Stage 8b: funding rate state machine (= course 9)
- Encoding fills as EVM-executable transactions (= future work past Stage 9 in openhl itself)
- Liquidations, mark-vs-index pricing, leverage limits

When you finish this course you have a **working matching engine producing fills into committed blocks**, but those fills are still a parallel list — not yet executable as Ethereum transactions readable by smart contracts. That's what course 8 adds via custom EVM precompiles.

This is honest scoping. A CLOB engine without execution wiring is half the story; the other half (precompiles) is course 8.

## 3. Prerequisites

You need:

- **\`building-openhl-consensus\` complete** — or, equivalently, a workspace at the end-of-course-6 state. Your \`crates/evm/src/live_node.rs\` should already have \`LiveRethEvmBridge<P>\` with \`provider\`, \`chain_spec\`, \`validator\`, and optional \`engine_handle\` fields. If yours doesn't, work through course 6 first.
- **Rust 1.95+**, same as course 6.
- **Comfort with \`BTreeMap\`, \`VecDeque\`, \`Reverse<T>\`, and proptest.** If "natural ordering" and "reverse-ordering trick to walk highest-first" are unfamiliar, skim the \`std::collections::BTreeMap\` docs first.

You do **not** need:

- Any prior matching-engine experience (we'll build the data structures from scratch)
- Any prior order-book reading skill (the test scenarios walk every step)
- Multi-validator setup (still single-validator throughout)

## 4. Setup confirmation (do this now)

You should already have the two-directory workflow from course 6:

- \`~/code/my-openhl/\` — your workspace
- \`~/code/openhl-reference/\` — read-only \`psyto/openhl\` clone

Bring the reference repo up to date in case Stage 8 commits are newer than your clone:

\`\`\`bash
cd ~/code/openhl-reference
git fetch origin
git log --oneline | head -15
# You should see commits up to and including SHA 0cac571 (Stage 7d) and
# 428cc26 (Stage 8d).
\`\`\`

Then confirm your workspace is at the end-of-course-6 state:

\`\`\`bash
cd ~/code/my-openhl
cargo test -p openhl-evm --release 2>&1 | tail -10
# Expect: roughly 38 tests pass workspace-wide, including
# - reth_dev_node_bootstraps (L11 of course 6)
# - live_bridge_builds_on_real_genesis (L12-L13 of course 6)
# - commit_sends_forkchoice_to_engine_when_handle_installed (L14 of course 6)
\`\`\`

If those tests pass, you're at the right starting point. If they don't, finish course 6 first.

> 🛑 **Anti-fluency.** "I'll just \`git clone psyto/openhl\` and start course 7 against that codebase." **You can — but you'll miss the friction.** This course is build-along: you write the matching engine from scratch in \`my-openhl/\` and diff against the reference. If you start in \`openhl-reference\` you're back in "type from the answer key" mode, which we discussed in course 6 §7.

## 5. The 12-lesson map

| # | Module | What you build | End-of-lesson test |
| - | - | - | - |
| **L0** | Orientation | (this lesson) | setup confirmed |
| **L1** | CLOB types | newtypes — \`AccountId\`, \`OrderId\`, \`Price\`, \`Qty\`, \`Side\`, \`OrderType\` | \`cargo check -p openhl-clob\` |
| **L2** | CLOB types | \`Order\`, \`Fill\`, \`FillResult\` | types compile |
| **L3** | Matching engine | \`Book\` struct + \`Reverse<Price>\` trick + accessors | \`cargo check -p openhl-clob\` |
| **L4** | Matching engine | \`submit_order\` — Limit order, in-book matching | matches resting orders |
| **L5** | Matching engine | \`submit_order\` — Market orders + crossing + partial fills | edge-case behaviour |
| **L6** | Matching engine | \`cancel\` + empty-level cleanup | cancel-by-id works |
| **L7** | Testing | 9 hand-traced unit tests | all 9 pass |
| **L8** | Testing | 3 proptest invariants (qty conservation, no-crossed-book, determinism) | 768 random scenarios pass |
| **L9** | Bridge integration | Add \`clob\` + \`pending_fills\` to \`LiveRethEvmBridge\`; \`submit_order\` method | bridge compiles |
| **L10** | Bridge integration | \`build_payload\` drains pending fills; \`payload_fills(id)\` inspector | fills appear in payload |
| **L11** | Bridge integration | \`clob_fills_flow_into_payload\` integration test | **full pipeline test passes** |
| **L12** | Capstone | recap, what's next (precompiles via course 8) | (no test — recap) |

**L11 is the milestone.** Finishing L11, you have a fill produced by the matching engine flowing through the BFT engine into a real block. L12 names what's still missing (the fills aren't yet readable from smart contracts — that's course 8).

## 6. The answer-key discipline (same as course 6)

Every lesson L1–L11 cites either SHA \`55a9dff\` (Stage 8a) or \`428cc26\` (Stage 8d). After your lesson test passes:

\`\`\`bash
cd ~/code/openhl-reference
git checkout 55a9dff    # or 428cc26 for L9-L11
diff -u ~/code/my-openhl/crates/clob/src/types.rs ./crates/clob/src/types.rs
# (etc.)
\`\`\`

Match meaningfully — same types, same control flow. Whitespace and naming will differ.

> 🛑 **Anti-fluency.** "I already know how a CLOB works, I can skip to L9 and just learn the bridge integration." **You can — but L1–L8 encode design decisions that matter when you modify the engine later.** Reverse-ordered bids, FIFO within price levels, the cancel-then-cleanup invariant — none of these are obvious unless you build them. Skipping L1–L8 means you can read the code but you can't change it safely.

## 7. Setup confirmation — the actual L0 exercise

Before L1, run all of these and confirm they pass:

\`\`\`bash
# 1. Rust version
rustc --version    # expect: rustc 1.95.x or later

# 2. End-of-course-6 state
cd ~/code/my-openhl && cargo test -p openhl-evm --release 2>&1 | grep -E "^test result"
# Expect: at least 3 tests passing in openhl-evm

# 3. Reference repo has Stage 8 commits
cd ~/code/openhl-reference && git log --oneline | grep -E "(55a9dff|428cc26)"
# Expect: both SHAs appear
\`\`\`

If all three pass, you're ready for L1.

> **Final check.** In one sentence, what does this course add that course 6 didn't have? If your answer doesn't mention "a matching engine producing fills that flow into committed blocks", re-read §1.`,
                },
              ],
            },
          },
          {
            title: "CLOB types",
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: "Lesson 1 — CLOB newtypes, Side, OrderType",
                  slug: "openhl-clob-types-newtype-en",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 25,
                  xpReward: 60,
                  content: `# Lesson 1 — CLOB newtypes, \`Side\`, \`OrderType\`

## Goal

By the end of this lesson:

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

…compiles cleanly. You'll have one new crate (\`crates/clob/\`) registered in the workspace, with a single file \`src/types.rs\` containing the **atomic, field-level types** the matching engine uses:

- **4 newtypes over \`u64\`** — \`AccountId\`, \`OrderId\`, \`Price\`, \`Qty\` — for type-safety against accidental swaps.
- **\`Side\` enum** (\`Buy\` | \`Sell\`) with an \`opposite()\` helper.
- **\`OrderType\` enum** — \`Limit { price }\` or \`Market\`.
- **\`Display\` impls** on \`OrderId\`, \`Price\`, \`Qty\` so debug output reads naturally (\`"#42"\`, \`"1000000"\`, etc.).

No record types yet (those are L2). No book yet (that's L3 onward). This lesson is the foundation — every later lesson uses the types you build here.

## Recap

After course 6, your workspace has:

\`\`\`
crates/types/             — BlockHash, PayloadId, PayloadAttrs, ExecutedBlock, PayloadStatus
crates/evm/               — InMemoryEvmBridge, RethEvmBridge, LiveRethEvmBridge
crates/consensus/         — full BFT engine (Context, signing, codec, node, engine_app)
bin/openhl/               — stub binary
\`\`\`

\`cargo test\` passes ~38 tests workspace-wide. \`LiveRethEvmBridge::commit\` sends \`ForkchoiceUpdated\` to Reth. **But \`build_payload\` produces empty blocks** — nothing to fill them with.

## Plan

Four things:

1. **Create \`crates/clob/\` directory** with \`Cargo.toml\` and \`src/\`.
2. **Register \`crates/clob/\` in the workspace** — add to \`[workspace.members]\` in the root \`Cargo.toml\`.
3. **Add \`openhl-clob\` to workspace dependencies** in the root \`Cargo.toml\` so other crates can depend on it.
4. **Write \`src/types.rs\`** — the 4 newtypes, \`Side\`, \`OrderType\`, and \`Display\` impls. **No record types yet** (those go in L2).
5. **Wire \`pub mod types;\` + re-exports into \`src/lib.rs\`** so the crate's public API is the types.

The lesson is short because the types are short. The interesting part isn't the code — it's the **design decisions** (why newtypes over raw \`u64\`, why \`Limit\` carries its price as a struct field, what unit \`Qty\` is in).

> 🛑 **Predict.** Before scrolling: when you see four newtypes wrapping the same \`u64\` (\`AccountId(u64)\`, \`OrderId(u64)\`, \`Price(u64)\`, \`Qty(u64)\`), what's the one bug each newtype prevents — that a raw \`u64\` everywhere would let through? Hint: think about a function that takes \`(u64, u64, u64)\`. Now imagine someone calls it with arguments in the wrong order. **The newtype pattern's main job is making argument-swap bugs into compile errors.**

## Walk-through

### Step 1: Create the crate directory + Cargo.toml

From the workspace root (\`~/code/my-openhl/\`):

\`\`\`bash
mkdir -p crates/clob/src
touch crates/clob/Cargo.toml crates/clob/src/lib.rs crates/clob/src/types.rs
\`\`\`

Now open \`crates/clob/Cargo.toml\` and write:

\`\`\`toml
[package]
name         = "openhl-clob"
version      = { workspace = true }
edition      = { workspace = true }
rust-version = { workspace = true }
license      = { workspace = true }
repository   = { workspace = true }
authors      = { workspace = true }

[lints]
workspace = true
\`\`\`

No dependencies. The CLOB matching engine is pure data + pure logic; it doesn't even need \`serde\` at this stage (Stage 8b adds it for funding, but we don't need it now).

### Step 2: Register in workspace

Open the root \`Cargo.toml\`. Find \`[workspace] members = [...]\`. Add \`"crates/clob"\` to the list. Make sure to keep the existing ordering (alphabetical or insertion-order is fine):

\`\`\`toml
[workspace]
resolver = "3"
members = [
    "bin/openhl",
    "crates/types",
    "crates/clob",      # NEW
    "crates/evm",
    "crates/consensus",
]
\`\`\`

Then in the same root \`Cargo.toml\`, find \`[workspace.dependencies]\` and add a path entry for \`openhl-clob\`:

\`\`\`toml
[workspace.dependencies]
# --- Internal crates ---
openhl-types     = { path = "crates/types" }
openhl-clob      = { path = "crates/clob" }     # NEW
openhl-evm       = { path = "crates/evm" }
openhl-consensus = { path = "crates/consensus" }
\`\`\`

Now any crate that wants \`openhl-clob\` can declare \`openhl-clob = { workspace = true }\` in its own \`Cargo.toml\`. We'll use this in L9 when the bridge consumes the CLOB.

### Step 3: Write the newtypes

Open \`crates/clob/src/types.rs\`. Start with the module doc and the 4 newtypes:

\`\`\`rust
//! Core types for the CLOB matching engine.
//!
//! Pure data — no I/O, no allocation beyond what's needed for fills. The
//! whole module is deterministic by construction: every type's \`PartialEq\`
//! and \`Ord\` impl derives from byte-equal field comparison.

use core::fmt;

/// Account identifier. Opaque to the CLOB; chain integration maps these to
/// EVM addresses, validator addresses, or whatever the chain uses.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct AccountId(pub u64);

/// Sequential order identifier. Caller allocates; the book doesn't generate.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct OrderId(pub u64);

/// Price in minor units. For a USDC market, \`Price(1_000_000) = $1.00\`.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Price(pub u64);

/// Quantity in minor units.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Qty(pub u64);
\`\`\`

Four structures, all 1 line each, all wrapping \`u64\`. **The 7 derives are identical** across all 4 types — that's intentional. The newtype pattern works because the types have the *same operations* as \`u64\` but the *type system rejects* mixing them.

Three things to notice in the doc comments:

- **\`AccountId\` is opaque** — the CLOB doesn't know whether your chain uses EVM addresses, ed25519 pubkeys, or sequential integers. It just compares them for equality. Chain integration (course 8 with precompiles, eventually production node code) maps \`AccountId(...)\` to whatever the chain wants.
- **\`OrderId\` is caller-allocated** — the book doesn't generate IDs; callers do. This keeps the book pure-stateless: \`submit_order\` is a function of (book, order), not (book, order, generator-state).
- **\`Price\`/\`Qty\` are in minor units** — \`Price(1_000_000)\` represents $1.00 for a 6-decimal token like USDC. There's no \`f64\` in the matching engine. **Floats are forbidden in money math.**

> 🛑 **Anti-fluency.** "I'll add a method \`pub fn from_dollars(d: f64) -> Price\` for convenience." **No, that smuggles f64 imprecision into the engine.** \`Price(1_000_000)\` is the wire format; if a user-facing tool wants to do \`from_dollars\`, it does the integer multiplication at its boundary and hands the bridge an integer-typed Price. The matching engine never sees a float.

### Step 4: Add the \`Side\` enum and \`opposite()\` helper

Continue in \`types.rs\`:

\`\`\`rust
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum Side {
    Buy,
    Sell,
}

impl Side {
    #[must_use]
    pub const fn opposite(self) -> Self {
        match self {
            Self::Buy => Self::Sell,
            Self::Sell => Self::Buy,
        }
    }
}
\`\`\`

Two variants. The \`opposite()\` method is a one-liner now, but it's load-bearing later: when a taker order arrives, you walk *the opposite side* of the book to find liquidity. A buy taker walks the asks; a sell taker walks the bids. **Encoding the rule in \`opposite()\` once means you can't forget which side to walk when reading book code later.**

\`#[derive(PartialOrd, Ord)]\` is intentionally NOT here. Asking "is Buy less than Sell?" is meaningless — these aren't ordered values, they're tags. Leaving the trait off keeps callers from accidentally writing \`if side < Side::Sell\` and getting an unintended ordering (which would be \`Buy < Sell\` since Buy comes first in the source).

> 🛑 **Anti-fluency.** "Why isn't this a bool? \`is_buy: bool\` would save bytes." **It would also lose meaning at the call site.** \`submit_order(order, true)\` reads garbage; \`submit_order(order, Side::Buy)\` reads obvious. The 1-byte cost of an enum vs. a bool is irrelevant compared to the readability cost of the bool. Enums for things that have *names*, bools only for things that have *no name beyond on/off*.

### Step 5: Add the \`OrderType\` enum

Below the \`Side\` impl:

\`\`\`rust
/// Order type — describes liquidity-taking + liquidity-providing behavior.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum OrderType {
    /// Take liquidity at or better than \`price\`; rest the remainder on the book.
    Limit { price: Price },
    /// Take whatever liquidity is available at any price; never rests.
    Market,
}
\`\`\`

Two variants:

- **\`Limit { price: Price }\`** — a struct-style enum variant. The order has a price; if you can't match at-or-better, the remainder rests on the book.
- **\`Market\`** — unit variant. No price; takes whatever's available at any price, then discards the remainder.

The struct-style \`Limit { price: Price }\` is deliberate over a tuple-style \`Limit(Price)\`. When code reads \`order.order_type\` and pattern-matches, \`Limit { price }\` makes the field name \`price\` part of the pattern. Tuples force you to write \`Limit(p)\` and remember what \`p\` means. **Named fields make the type self-documenting**.

> 🛑 **Anti-fluency.** "Why not also \`Stop\`, \`StopLimit\`, \`Iceberg\`, \`Post-Only\`?" **Because the engine doesn't need them yet, and adding unused variants is technical debt.** Limit + Market is the smallest set that covers the spot-trading test scenarios in L7-L8. When openhl needs Stop orders (probably perp territory, course 9 or later), the maintainers add the variant then — at which point matching logic, book logic, AND test scenarios all update together. **Add types when you're about to use them, not before.**

### Step 6: Add \`Display\` impls for the 3 user-facing newtypes

Append:

\`\`\`rust
impl fmt::Display for OrderId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "#{}", self.0)
    }
}

impl fmt::Display for Price {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl fmt::Display for Qty {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}
\`\`\`

Three \`Display\` impls. **Note \`AccountId\` doesn't get one** — that's intentional. AccountIDs are opaque IDs; if you want to print them, you probably want the chain-integration's mapping to a real address, not the raw \`u64\`. Leaving \`Display\` off forces callers to be explicit (e.g., \`format!("{}", a.0)\` or "render via the chain's address renderer").

OrderId formats as \`"#42"\` so test output reads naturally (\`fill from #1 to #2\`). Price and Qty are just their numeric values — but having the \`Display\` impl means you can use them in \`format!\` and \`println!\` without writing \`.0\`.

### Step 7: Wire types into \`lib.rs\`

Open \`crates/clob/src/lib.rs\`:

\`\`\`rust
//! Pure-Rust CLOB (central limit order book) matching engine for openhl.
//!
//! No I/O. No allocation beyond fill output. Deterministic by construction.
//! See [\`book::Book\`] for the matching state machine (L3+).

pub mod types;

pub use types::*;
\`\`\`

Three lines of body, plus a doc comment. \`pub use types::*\` re-exports the types at the crate root so callers can write \`use openhl_clob::{Order, Side}\` instead of \`use openhl_clob::types::{Order, Side}\` — the shorter form is what we'll use everywhere.

The \`book\` module comes in L3; the \`pub mod types;\` line goes alone for now.

## Test

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

Expected:

\`\`\`
   Compiling openhl-clob v0.1.0 (.../crates/clob)
    Finished \`dev\` profile [unoptimized + debuginfo] target(s) in 1.23s
\`\`\`

No warnings. No errors. The crate's public API is now \`AccountId\`, \`OrderId\`, \`Price\`, \`Qty\`, \`Side\`, \`OrderType\` (no records yet).

If you want to also verify nothing in the workspace broke:

\`\`\`bash
cargo check --workspace
\`\`\`

Should complete cleanly. The new crate is empty of dependents; nothing's affected.

Common errors and fixes:

- **\`error: failed to read 'crates/clob/Cargo.toml'\`** — typo in workspace \`members\` list, or the file doesn't exist. Re-check Step 2.
- **\`error[E0432]: unresolved import 'fmt'\`** — forgot \`use core::fmt;\` at the top of \`types.rs\`. Re-check Step 3.
- **\`error[E0277]: 'Price' doesn't implement \`Display\`** — added \`Display\` for \`OrderId\` but not \`Price\`/\`Qty\`. Re-check Step 6.
- **\`warning: unused import: 'types'\`** — your \`lib.rs\` says \`mod types;\` (private) instead of \`pub mod types;\`. Re-check Step 7.

## Design reflection

Three load-bearing decisions encoded here:

1. **Newtypes prevent argument-swap bugs at compile time.** Code that took \`submit(book, account: u64, price: u64, qty: u64)\` would compile with any permutation of those three \`u64\`s passed in. Code that takes \`submit(book, AccountId, Price, Qty)\` rejects the wrong types at compile time. The cost is two extra \`.0\` deref calls; the benefit is bugs you can't write.

2. **Money math uses integers, not floats.** \`Price\` and \`Qty\` are \`u64\`-backed. There's no \`Price::from_f64\`. Anyone wanting to display a price as "$1.00" does the integer-to-decimal conversion at the rendering boundary, *outside* the engine. The matching engine's invariants (e.g., "total fills always conserve quantity") are exact-integer invariants; introducing float intermediates would break them.

3. **\`OrderType::Limit { price }\` not \`Limit(Price)\`.** When you later write \`match order.order_type { Limit { price } => ..., Market => ... }\`, the \`price\` binding makes the role obvious. Tuple-style enum variants are right when the variant is just "I'm a wrapper around this one thing"; struct-style is right when the field has a *name*. Here it does (\`price\`), so struct-style wins.

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout 55a9dff
diff -u ~/code/my-openhl/crates/clob/src/types.rs ./crates/clob/src/types.rs
diff -u ~/code/my-openhl/crates/clob/Cargo.toml ./crates/clob/Cargo.toml
diff -u ~/code/my-openhl/Cargo.toml ./Cargo.toml
\`\`\`

The reference at \`55a9dff\` has types.rs at ~109 lines total (the full type set). Your version after L1 has only the newtypes + Side + OrderType + Display impls — about 65 lines. The remaining ~45 lines (Order, Fill, FillResult) are L2's scope. Diff should show those as the differences.

Return:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: Why are \`AccountId\`, \`OrderId\`, \`Price\`, \`Qty\` all \`Copy\`?**
They're \`u64\` under the hood — 8 bytes, no heap. Marking them \`Copy\` lets the engine pass them by value freely without \`.clone()\` everywhere. The trait bound costs nothing at runtime.

**Q: Why \`Hash\` on these types?**
Future use: \`HashMap<OrderId, RestingOrder>\` for O(1) cancel-by-id (lesson L6). Adding \`Hash\` now means no derive-cascade churn later.

**Q: Why isn't \`Side: PartialOrd + Ord\`?**
Because asking "is Buy less than Sell" is a meaningless question. If we derived \`Ord\`, callers could write \`if side < Side::Sell { ... }\` and get whichever variant Rust enumerated first (Buy, in our case) — but that's an artifact of declaration order, not semantically meaningful. Leaving the trait off forces callers to use \`match\` or \`==\`.

**Q: Why \`#[must_use]\` on \`opposite()\`?**
Because writing \`side.opposite();\` (without assigning the result) is almost certainly a bug — \`opposite()\` returns a new \`Side\`, it doesn't mutate. \`#[must_use]\` makes that bug a warning. Good practice for any function whose only purpose is to return a value.

## Next lesson (L2)

You have the field-level types — the atomic pieces. L2 builds the **record-level types** that combine them: \`Order\` (the input to the matching engine), \`Fill\` (the output), \`FillResult\` (the wrapper that bundles fills with remaining-quantity info). After L2, the type vocabulary is complete; L3+ uses these types to build the actual matching state machine.`,
                },
              ],
            },
          },
        ],
      },
    },
  });
}
