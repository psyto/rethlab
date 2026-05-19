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
      duration: 180,
      xpReward: 410,
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
                {
                  title: "Lesson 2 — Order, Fill, FillResult",
                  slug: "openhl-clob-types-records-en",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 20,
                  xpReward: 50,
                  content: `# Lesson 2 — \`Order\`, \`Fill\`, \`FillResult\`

## Goal

By the end of this lesson:

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

…still compiles. You'll have **3 record types** in \`crates/clob/src/types.rs\`, built from L1's newtypes:

- **\`Order\`** — the input to the matching engine (id, account, side, qty, order_type).
- **\`Fill\`** — the output of a single match between a maker and a taker (maker_order_id, taker_order_id, maker_account, taker_account, price, qty).
- **\`FillResult\`** — the wrapper around a submit's return: \`fills: Vec<Fill>\` + \`remaining_qty: Qty\` + a \`total_filled()\` helper.

That completes the **type vocabulary**. L3+ uses these types to build the matching state machine.

## Recap

After L1, your \`crates/clob/src/types.rs\` has:

\`\`\`rust
// L1 — field-level types
pub struct AccountId(pub u64);
pub struct OrderId(pub u64);
pub struct Price(pub u64);
pub struct Qty(pub u64);
pub enum Side { Buy, Sell }
pub enum OrderType { Limit { price: Price }, Market }
// + Display impls for OrderId, Price, Qty
\`\`\`

About 65 lines. \`cargo check -p openhl-clob\` passes. **What's missing**: types that combine these — what does an order look like, what does a fill look like, what does the engine return after a submit. L2 fills exactly that gap.

## Plan

Three records to add, all to the same \`types.rs\`:

1. **\`Order\`** — 5 fields, all from L1's types. The matching engine takes one \`Order\` and returns one \`FillResult\`.
2. **\`Fill\`** — 6 fields naming maker + taker explicitly. **Both** maker_order_id AND maker_account are stored because the chain integration (course 8) needs the account to credit/debit balances.
3. **\`FillResult\`** — collects the fills plus the unmatched-and-not-rested remainder. Includes a \`total_filled()\` helper so callers can ask "how much got matched?" without iterating.

No new dependencies. No code changes outside \`types.rs\`. The lesson is ~35 lines of code.

> 🛑 **Predict.** Before scrolling: \`Fill\` carries **both** \`maker_order_id\` AND \`maker_account\`. Why duplicate? The maker's \`OrderId\` should be enough to look up the account, right? Hint: think about who consumes a \`Fill\`. The chain's \`clob_place_order\` precompile (course 8) credits a balance — it needs the account directly. Looking up \`OrderId → AccountId\` would require the precompile to hold a reference to the order book's internal index. **Carrying both fields in the Fill itself decouples consumers from the engine's internal state.** Same idea as message-passing vs. shared-state.

## Walk-through

### Step 1: Add \`Order\` below \`OrderType\`

Open \`crates/clob/src/types.rs\`. After the \`OrderType\` enum, before the \`Display\` impls, add:

\`\`\`rust
/// A new order entering the book or arriving as a taker.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Order {
    pub id: OrderId,
    pub account: AccountId,
    pub side: Side,
    pub qty: Qty,
    pub order_type: OrderType,
}
\`\`\`

5 fields. **All \`Copy\`** — Order is 8 (OrderId) + 8 (AccountId) + 1 (Side) + 8 (Qty) + 16 (OrderType — discriminant + Price) = 41 bytes. With padding, around 48 bytes. Small enough to pass by value freely; we don't need \`Box<Order>\` or \`&Order\` in normal code.

The field order is meaningful:
- **\`id\` first** — the most-used field (lookups, equality, debug).
- **\`account\`** — who placed it.
- **\`side\`** — Buy or Sell.
- **\`qty\`** — how much.
- **\`order_type\` last** — the most complex field (an enum), and the field that controls dispatch (Limit vs Market drives different matching logic in L4-L5).

> 🛑 **Anti-fluency.** "\`order_type\` is redundant — if \`OrderType::Limit { price }\` carries the price, why not just put \`price: Price\` on \`Order\` directly?" **Because Market orders don't have a price.** Putting \`price: Price\` on Order would force every Market order to carry a placeholder price, which then has to be ignored everywhere. The enum encodes "either there's a price, or there isn't" exactly once. **\`Option<Price>\` would also work but loses the "Market" tag** — \`OrderType\` is the right shape because the distinction has a *name*, not just a presence/absence.

### Step 2: Add \`Fill\`

Below \`Order\`:

\`\`\`rust
/// A fill between a maker (resting order) and a taker (incoming order).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Fill {
    pub maker_order_id: OrderId,
    pub taker_order_id: OrderId,
    pub maker_account: AccountId,
    pub taker_account: AccountId,
    pub price: Price,
    pub qty: Qty,
}
\`\`\`

6 fields. The maker-vs-taker distinction is the most important concept in matching-engine code:

- **Maker** = the order that was already resting on the book. They "made" liquidity available; they get the better deal economically (usually a rebate on real exchanges).
- **Taker** = the incoming order that consumed liquidity. They paid the spread; on real exchanges, they pay the fee.

Each \`Fill\` represents one matched pair. A single taker order can produce **multiple Fills** if it crosses multiple maker price levels (e.g., a market buy that walks up the ask side, eating each resting ask in turn).

**Note \`price\` is the maker's price** — when a taker hits the book, it matches at the maker's resting price, not the taker's limit. Limit-buyer at $101 matching a resting limit-seller at $100 fills at $100 (maker's price); the buyer wins. This is "price-time priority" in action.

> 🛑 **Anti-fluency.** "Storing both account IDs feels redundant — every \`Fill\` could just look up account by \`OrderId\` at consumer time." **No — that requires the consumer to hold a reference to the book's \`HashMap<OrderId, RestingOrder>\` and to keep it alive after the book has moved on.** Fills are emitted at match time and consumed asynchronously (in our case, drained into a payload that's committed later). If the book has since cancelled the maker order, looking up \`OrderId → AccountId\` returns \`None\` and the consumer is stuck. **Self-contained Fills don't have that problem.**

### Step 3: Add \`FillResult\` + \`total_filled()\` helper

Below \`Fill\`:

\`\`\`rust
/// Result of submitting a taker order.
///
/// \`fills\` is the list of matched fills, in order of execution. \`remaining_qty\`
/// is the leftover taker quantity that was *not* rested on the book (Market
/// orders discard their remainder; fully-filled Limit orders return zero).
/// A partially-filled Limit order that rested on the book also returns zero
/// here — the remainder is in the book, not in the return value.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct FillResult {
    pub fills: Vec<Fill>,
    pub remaining_qty: Qty,
}

impl FillResult {
    /// Total quantity matched across all fills.
    #[must_use]
    pub fn total_filled(&self) -> Qty {
        Qty(self.fills.iter().map(|f| f.qty.0).sum())
    }
}
\`\`\`

**Note \`FillResult\` is NOT \`Copy\`** — it owns a \`Vec<Fill>\` which is heap-allocated. It's \`Clone\` for tests and debug paths, but the engine returns it by value (no clone needed on the happy path).

Three things in the doc comment that the L3+ code will rely on:

1. **\`fills\` is in order of execution**. If a market buy walks 3 ask levels, fills[0] is the cheapest match, fills[1] is the next, fills[2] is the most expensive. This ordering matters for replay determinism (L8's proptest will assert this).
2. **\`remaining_qty\` is for unrested taker quantity only**. A Market order with remainder 100 means 100 units couldn't be matched at any price (because the book ran out of liquidity). A Limit order with remainder 0 might still have an unfilled remainder — but that remainder is **now in the book** as a resting order, not in the return value.
3. **\`total_filled\` is a helper, not a stored field**. It's an O(N) sum over fills. We don't cache it because (a) \`Vec::len()\` is usually what callers really want when they just need "did anything fill?", and (b) the actual quantity total is only needed by tests/inspection code, where O(N) doesn't matter.

> 🛑 **Anti-fluency.** "Why isn't \`remaining_qty\` part of the per-fill data instead of a separate field?" **Because there's at most one remainder per submit, and it's not associated with any fill** — it's the *unfilled* part. Putting it in \`Fill\` would either force every fill to carry a meaningless 0 or require a "phantom fill" entry just to hold it. Keeping it separate on \`FillResult\` is the right shape.

### Step 4: Confirm \`lib.rs\` still re-exports everything

You wrote \`pub use types::*;\` in L1's \`lib.rs\`. That \`*\` automatically picks up the 3 new types you just added — no edit needed. Verify by quickly checking:

\`\`\`rust
// crates/clob/src/lib.rs (no change needed)
pub mod types;
pub use types::*;
\`\`\`

If your \`lib.rs\` has individual re-exports like \`pub use types::{AccountId, OrderId, ...};\`, you'd need to add the 3 new types. **But \`*\` is what L1 set up, so you don't.**

## Test

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

Still compiles. Output is the same as L1 (no new warnings or errors, just slightly more code being checked).

You can also do a quick sanity test that the types are visible from another crate, e.g., from a future \`crates/evm/Cargo.toml\` perspective. We don't add a dep yet (that's L9), but you can prove the types are public:

\`\`\`bash
cargo doc -p openhl-clob --no-deps --open
\`\`\`

Browse the rendered docs. You should see \`Order\`, \`Fill\`, \`FillResult\` listed under "Structs" alongside \`AccountId\`/\`OrderId\`/\`Price\`/\`Qty\`. \`total_filled\` should appear under \`FillResult\`'s methods.

Common errors and fixes:

- **\`error[E0277]: 'FillResult' doesn't implement 'Copy'\`** — you tried to \`#[derive(Copy)]\` on \`FillResult\`. **It can't be Copy** because of the inner \`Vec<Fill>\`. Remove \`Copy\` from its derive; leave \`Clone\`.
- **\`error[E0599]: no method named 'total_filled' for ...\`** — you wrote the helper outside \`impl FillResult { ... }\`. The function needs to be inside an impl block.
- **\`warning: field 'X' is never read\`** — you wrote a field but no test/usage references it. **Ignore for now** — L3+ will use everything. The matching engine has no consumers yet.

## Design reflection

Three load-bearing decisions encoded here:

1. **\`Fill\` is self-contained.** Both maker_order_id AND maker_account are stored, even though one could be derived from the other given the order book's internal index. This decouples Fill consumers (precompiles, payload assembly, chain integration) from the engine's internal data structures. **Self-contained messages are easier to pass across module boundaries than references back to live state.**

2. **\`FillResult\` separates "fills" from "remainder."** A submit produces zero-or-more fills AND zero-or-one remainder. Modeling them as a single \`Vec<Fill>\` would force a "phantom fill" for the remainder, or special-case logic to detect it. The two-field record makes the types do the work.

3. **\`total_filled()\` is computed, not cached.** Caching would force every fill-list mutation to update a counter — error-prone. Computing on demand keeps \`FillResult\` a pure data record with no derived state. The O(N) cost is negligible because N is typically 1-3 (single fills are most common; a market order eating 10 levels is unusual).

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout 55a9dff
diff -u ~/code/my-openhl/crates/clob/src/types.rs ./crates/clob/src/types.rs
\`\`\`

After L2, your types.rs is approximately the full ~109 lines of the reference. The only diff should be doc-comment wording / whitespace. **L1 + L2 together = complete types.rs**.

Return:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: Why is \`Order\` \`Copy\` but \`FillResult\` isn't?**
\`Order\` has 5 fields, all \`Copy\` (newtypes over \`u64\` + small enums). Total ~48 bytes — cheap to memcpy. \`FillResult\` owns a \`Vec<Fill>\`, which is heap-allocated; copying it would require allocator calls. \`Copy\` is only for types where \`=\` is a single bit-blit. The trait reflects that semantic.

**Q: Why does \`Fill\` have \`qty: Qty\` instead of just a \`u64\`?**
Consistency with the rest of the engine. All quantities are \`Qty\`-typed; mixing \`u64\` here would force conversions at the boundary (and risk forgetting them). The newtype discipline is per-engine, not per-struct.

**Q: Could \`FillResult\` use \`Box<[Fill]>\` instead of \`Vec<Fill>\`?**
Yes, slightly more memory-efficient for the "no more pushes" case. But \`Vec<Fill>\` is what \`submit_order\` builds incrementally (push on each match); converting to \`Box<[Fill]>\` at the end would be one extra allocation. Until profiling shows it matters, \`Vec\` is the simpler choice.

**Q: What if a fill's \`qty\` is 0? Is that a valid Fill?**
No — the matching engine in L4-L5 will never produce a zero-qty Fill (it would mean "we matched 0 units," which is just "we didn't match"). The type system doesn't enforce this; the engine's invariants do. Tests in L7-L8 will catch any regression.

## Next lesson (L3)

The type vocabulary is complete. L3 introduces the **matching state machine** — the \`Book\` struct that holds resting bid/ask orders, plus the helper methods (\`best_bid\`, \`best_ask\`, accessors for inspecting the book). No \`submit\` logic yet (that's L4); just the data structure and the \`Reverse<Price>\` trick for walking bids in highest-first order.`,
                },
              ],
            },
          },
          {
            title: "Matching engine",
            sortOrder: 2,
            lessons: {
              create: [
                {
                  title: "Lesson 3 — The Book struct and the Reverse<Price> trick",
                  slug: "openhl-clob-book-struct-en",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 30,
                  xpReward: 60,
                  content: `# Lesson 3 — The \`Book\` struct and the \`Reverse<Price>\` trick

## Goal

By the end of this lesson:

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

…still compiles. You'll have a new file \`crates/clob/src/book.rs\` containing:

- **\`Book\` struct** — two \`BTreeMap\`s (bids + asks), each mapping a price level to a \`VecDeque\` of resting orders.
- **\`RestingOrder\` struct** — what a single order looks like once it's resting on the book (trimmed from \`Order\`).
- **\`new()\` constructor** + 4 read-only accessors (\`best_bid\`, \`best_ask\`, \`depth_bid\`, \`depth_ask\`).

**No matching logic yet** — \`submit\` lands in L4 + L5, \`cancel\` in L6. This lesson is about building the data structure correctly so the matching logic can be a few lines on top of it.

The single load-bearing idea: **\`Reverse<Price>\` as a \`BTreeMap\` key** makes the natural-order iterator walk bids highest-first. Once you see why that works, the rest of the matching code becomes obvious.

## Recap

After L2, your \`crates/clob/src/types.rs\` is complete (~109 lines): 4 newtypes, \`Side\`, \`OrderType\`, \`Order\`, \`Fill\`, \`FillResult\`, \`Display\` impls.

\`crates/clob/src/lib.rs\` re-exports all of those via \`pub use types::*\`. **There is no \`book\` module yet** — this lesson creates it.

## Plan

Five things:

1. **Create \`crates/clob/src/book.rs\`.**
2. **Write the \`Book\` struct** with \`bids: BTreeMap<Reverse<Price>, VecDeque<RestingOrder>>\` and \`asks: BTreeMap<Price, VecDeque<RestingOrder>>\`.
3. **Write the \`RestingOrder\` struct** — trimmed from \`Order\` (no side, no order_type, no qty growth).
4. **Add \`Book::new()\`** + the 4 accessor methods.
5. **Wire \`pub mod book;\`** into \`lib.rs\`.

The accessors return \`Option<Price>\` or \`usize\` — pure read operations against the BTreeMap shape. The interesting design choices are the **map key types** and what \`RestingOrder\` keeps vs. drops from \`Order\`.

> 🛑 **Predict.** Before scrolling: \`BTreeMap\` iterates keys in **natural order** (smallest to largest). For **asks** (we want lowest price first), \`BTreeMap<Price, _>\` is perfect — natural order already walks lowest-first. For **bids**, we want **highest price first** — but natural order would walk lowest-first. **What's the cheapest way to make BTreeMap walk highest-first without writing a custom comparator?** Hint: think about what "reverse a u64's ordering" looks like as a type.

## Walk-through

### Step 1: Create \`book.rs\` with module doc and imports

\`touch crates/clob/src/book.rs\` (or just create the file in your editor). Top of the file:

\`\`\`rust
//! Price-time priority orderbook + matching engine.
//!
//! Bids are stored with a \`Reverse<Price>\` key so \`BTreeMap\` natural-order
//! iteration walks them best-first (highest price first). Asks are stored
//! with \`Price\` directly so they also walk best-first (lowest price first).
//! Within each price level, orders are queued FIFO — that's the "time
//! priority" half of price-time priority.

use core::cmp::Reverse;
use std::collections::{BTreeMap, VecDeque};

use crate::types::{
    AccountId, Fill, FillResult, Order, OrderId, OrderType, Price, Qty, Side,
};
\`\`\`

A few things to scan:

- **\`core::cmp::Reverse\`** — the wrapper that flips the ordering of any \`Ord\` type. \`Reverse(Price(100))\` compares **greater than** \`Reverse(Price(200))\`, because \`Reverse\` inverts the underlying comparison.
- **\`BTreeMap\`** — a sorted map. Iteration walks keys in ascending order (= **natural order** = whatever \`Ord::cmp\` says is "smaller goes first"). Insert/remove/lookup are all O(log n).
- **\`VecDeque\`** — a double-ended queue. We use it for the "time priority" inside each price level: \`push_back\` for new orders (they go to the back of the line), \`pop_front\` for matched orders (front of the line gets filled first).
- **All the types from L1 + L2** — even ones we don't use directly in this lesson (\`Fill\`, \`FillResult\`, \`Side\`, etc.). We're importing them now to match the final imports list; they'll all be used by L4-L6's matching code.

> 🛑 **Anti-fluency.** "Why not use \`HashMap\` instead of \`BTreeMap\`? Hash lookups are O(1) vs BTreeMap's O(log n)." **Because we don't just look up — we iterate in price order.** Finding "the best bid" means "the bid with the highest price." A HashMap has no notion of "next key in sorted order"; we'd have to scan all keys (O(n)) and find the max. BTreeMap's sorted iteration gives us best-first in O(1) for the lookup (\`keys().next()\`) — that's what makes matching cheap.

### Step 2: Write the \`Book\` struct

Continue:

\`\`\`rust
#[derive(Debug, Default)]
pub struct Book {
    /// Bids: \`Reverse<Price>\` key gives best-first iteration (highest first).
    bids: BTreeMap<Reverse<Price>, VecDeque<RestingOrder>>,
    /// Asks: \`Price\` key gives best-first iteration (lowest first).
    asks: BTreeMap<Price, VecDeque<RestingOrder>>,
}
\`\`\`

The whole matching engine's state is **two BTreeMaps**. That's it. No order-id index (we'll do O(n) cancel in L6 and address that trade-off explicitly), no separate "best price" cache (the BTreeMap already gives us best in O(1)), no tick-size tables.

The asymmetry between bids and asks — \`Reverse<Price>\` vs. \`Price\` — looks weird, but it's the load-bearing trick:

- **Asks: \`BTreeMap<Price, _>\`.** Natural-order keys means iteration goes \`Price(99)\`, \`Price(100)\`, \`Price(101)\`, ... A buy-taker that wants the cheapest ask reads \`asks.keys().next()\` → \`Price(99)\`. Best-first.
- **Bids: \`BTreeMap<Reverse<Price>, _>\`.** Natural order on \`Reverse<Price>(p)\` is **descending in \`p\`**: \`Reverse(Price(101))\` comes before \`Reverse(Price(100))\` comes before \`Reverse(Price(99))\`. A sell-taker that wants the highest bid reads \`bids.keys().next()\` → \`Reverse(Price(101))\`. Best-first.

**Both sides use \`keys().next()\` to get the best price.** That's the API symmetry that justifies the type asymmetry. Without \`Reverse\`, bid lookup would have to be \`keys().next_back()\` (the BTreeMap iterator's reverse direction), and the matching code would be asymmetric across sides — easy to confuse, easy to write wrong.

\`#[derive(Default)]\` is here so \`Book::new()\` (next step) can just be \`Self::default()\` — no need to write \`BTreeMap::new()\` four times in a constructor. Default for \`BTreeMap\` is an empty map; same for \`Default\` on \`Book\` overall.

### Step 3: Write the \`RestingOrder\` struct

Below \`Book\`:

\`\`\`rust
/// An order resting on the book. Trimmed from \`Order\` — side and \`order_type\`
/// are implicit from which side of the book it's resting on, and \`qty\` shrinks
/// as fills consume it.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
struct RestingOrder {
    id: OrderId,
    account: AccountId,
    qty: Qty,
}
\`\`\`

3 fields, **not pub** (this is an internal type — callers never touch \`RestingOrder\` directly).

What's missing from \`Order\`:

- **\`side\`** — gone. We know what side a RestingOrder is on by which map it lives in (bids vs. asks). Storing it twice would be redundant + error-prone.
- **\`order_type\`** — gone. Resting orders are always Limit orders by definition (Market orders never rest — they fill what they can and discard the rest). Storing \`order_type\` would let us construct a \`RestingOrder\` with \`OrderType::Market\`, which is meaningless.
- **\`qty\` stays** — but it **shrinks over time** as the order gets partially filled. The submit code in L4 will mutate \`RestingOrder.qty\` directly when a maker eats less than 100% of a taker's quantity.

> 🛑 **Anti-fluency.** "Why not just store the original \`Order\` in the book and modify its \`qty\`?" **Because \`Order\` is \`Copy\` (5 fields, all stack-safe), but mutating a field-of-a-Copy looks like a bug to careful reviewers.** Specifically, if \`Order\` were stored in the queue, the matching code might do \`*order_in_queue.qty.0 -= fill_qty.0\` — but that's mutating data that \`Copy\` is supposed to be cheap to clone. \`RestingOrder\` is a separate type that makes the "this gets mutated" property explicit: callers know \`RestingOrder.qty\` shrinks because that's what \`RestingOrder\` is *for*.

### Step 4: Add \`new()\` and the 4 accessors

Append to \`book.rs\`:

\`\`\`rust
impl Book {
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    #[must_use]
    pub fn best_bid(&self) -> Option<Price> {
        self.bids.keys().next().map(|rp| rp.0)
    }

    #[must_use]
    pub fn best_ask(&self) -> Option<Price> {
        self.asks.keys().next().copied()
    }

    #[must_use]
    pub fn depth_bid(&self) -> usize {
        self.bids.values().map(VecDeque::len).sum()
    }

    #[must_use]
    pub fn depth_ask(&self) -> usize {
        self.asks.values().map(VecDeque::len).sum()
    }
}
\`\`\`

5 methods, all \`#[must_use]\`:

- **\`new()\`** — \`Self::default()\`. We could write \`Book { bids: BTreeMap::new(), asks: BTreeMap::new() }\` but \`#[derive(Default)]\` handles that uniformly.
- **\`best_bid()\`** — \`keys().next()\` returns the smallest natural-order key. Because bids use \`Reverse<Price>\`, that key wraps the highest price. We unwrap with \`.map(|rp| rp.0)\` — the \`rp.0\` peels off the \`Reverse\` wrapper.
- **\`best_ask()\`** — same pattern, but the key is \`Price\` directly. \`keys().next()\` returns the smallest \`Price\`, and we \`.copied()\` to get a \`Price\` value (without that, we'd get \`Option<&Price>\`).
- **\`depth_bid()\` / \`depth_ask()\`** — sum of queue lengths across all price levels. Inspection-only methods, used by tests and debugging.

**Why \`Option<Price>\` for best?** When the book is empty, there's no best price. \`Option::None\` is the right answer; returning \`Price(0)\` or \`Price(u64::MAX)\` would let callers accidentally treat them as real prices. The type forces the empty case to be handled.

> 🛑 **Anti-fluency.** "\`depth_bid\` is O(n) — that's slow." **It's only called from tests and inspection code, where O(n) is fine.** The matching engine itself never calls \`depth_bid\` — it walks \`keys().next()\` and \`front()\` in O(1)/O(log n). If \`depth_bid\` were on the hot path, we'd add a counter and bump it on every push/pop; but it's not, so we don't.

### Step 5: Wire into \`lib.rs\`

Open \`crates/clob/src/lib.rs\`. L1 + L2's content is:

\`\`\`rust
//! Pure-Rust CLOB (central limit order book) matching engine for openhl.
//!
//! No I/O. No allocation beyond fill output. Deterministic by construction.
//! See [\`book::Book\`] for the matching state machine (L3+).

pub mod types;

pub use types::*;
\`\`\`

Add **one line** for the new module, and **one re-export** for the public \`Book\` type:

\`\`\`rust
//! Pure-Rust CLOB (central limit order book) matching engine for openhl.
//!
//! No I/O. No allocation beyond fill output. Deterministic by construction.
//! See [\`book::Book\`] for the matching state machine.

pub mod book;
pub mod types;

pub use book::Book;
pub use types::*;
\`\`\`

The order is intentional: \`book\` first alphabetically, \`types\` second. Imports in Rust crates generally read better when crate-level modules are alphabetized.

**Only \`Book\` is re-exported, not \`RestingOrder\`.** \`RestingOrder\` is the internal queue element; nothing outside the matching engine should construct or read it. Keeping it \`struct\` (not \`pub struct\`) inside \`book.rs\` makes that explicit. The compiler enforces "no one outside this module touches RestingOrder."

## Test

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

Expected: clean compile, no warnings.

You might see a warning about **unused imports** — that's because \`book.rs\` imports \`Fill\`, \`FillResult\`, \`Order\`, \`OrderType\`, \`Qty\`, \`Side\` but L3 doesn't use them yet:

\`\`\`
warning: unused import: \`Fill, FillResult, Order, OrderType, Qty, Side\`
 --> crates/clob/src/book.rs:11:5
\`\`\`

**Two options for how to handle this:**

1. **Suppress the warning for now** by adding \`#[allow(unused_imports)]\` above the use statement. Remove it once L4 starts using everything.
2. **Comment out the unused imports for now**, uncomment as you need them in L4-L6.

The reference at SHA \`55a9dff\` keeps all imports (because the file is complete at that SHA). For build-along, choice 1 is closer to the reference; choice 2 is cleaner if you mind warnings. Either is fine.

A quick sanity test that the structure compiles correctly:

\`\`\`bash
cat > /tmp/book_test.rs <<'EOF'
use openhl_clob::Book;
use openhl_clob::Price;

fn main() {
    let b = Book::new();
    assert_eq!(b.best_bid(), None);
    assert_eq!(b.best_ask(), None);
    assert_eq!(b.depth_bid(), 0);
    assert_eq!(b.depth_ask(), 0);
    let _: Option<Price> = b.best_bid();
}
EOF
\`\`\`

You don't need to run this; the types just have to compile. If \`cargo check -p openhl-clob\` is clean, you're good.

Common errors and fixes:

- **\`error[E0277]: 'BTreeMap<Reverse<Price>, ...>' is not 'Default'\`** — \`BTreeMap<K, V>\` requires \`K: Ord\`, and \`Reverse<T>\` requires \`T: Ord\`. Since \`Price: Ord\` from L1, this works. If you forgot to derive \`Ord\` on \`Price\` in L1, that derive chain breaks here.
- **\`error[E0599]: no method named 'len' for \`VecDeque<RestingOrder>\`** — typo in \`depth_bid\`/\`depth_ask\`. The method is \`VecDeque::len\`, accessed as \`.len()\` directly or as \`VecDeque::len(deque_ref)\`.
- **\`error[E0382]: borrow of moved value: \`rp\`** in \`best_bid\` — using \`.map(|rp| rp.0)\` on a \`&Reverse<Price>\` reference: the closure receives \`rp: &Reverse<Price>\`, and \`rp.0\` is \`Price\` by value because \`Reverse<Price>: Copy\` (since \`Price: Copy\`). If this errors, \`Price\` isn't \`Copy\` — check L1's derive list.
- **\`error: cannot find type 'RestingOrder' in module 'book'\`** from outside — \`RestingOrder\` is private. That's intentional.

## Design reflection

Three load-bearing decisions encoded here:

1. **The state of the matching engine is two BTreeMaps.** No order-id index, no best-price cache, no per-side counters. Everything else is derived from those two maps. Future optimizations (e.g., \`HashMap<OrderId, (Side, Price)>\` for O(1) cancel) can be added without changing the core data model. **Start with the simplest representation that supports the operations; optimize when profiling demands it.**

2. **\`Reverse<Price>\` for bids is a type-level trick that saves matching-code complexity.** Without it, every place that walks the book would have to branch: "if asks, use \`next\`; if bids, use \`next_back\`." With \`Reverse<Price>\` on bids, both sides use \`next\` uniformly. **One symmetric API at the call site is worth one type asymmetry in the data definition.**

3. **\`RestingOrder\` is trimmed from \`Order\` to encode invariants.** A resting order doesn't have a side (we know its side from which map it's in) and doesn't have an \`order_type\` (Market orders never rest). Removing those fields from \`RestingOrder\` makes the impossible states unrepresentable. **Type design = constraint engineering.**

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout 55a9dff
diff -u ~/code/my-openhl/crates/clob/src/book.rs ./crates/clob/src/book.rs
diff -u ~/code/my-openhl/crates/clob/src/lib.rs ./crates/clob/src/lib.rs
\`\`\`

After L3, your \`book.rs\` is approximately **the first ~45 lines** of the reference (struct definitions + \`new()\` + 4 accessors). The reference at this SHA also contains \`submit\` (~100 LOC, L4 + L5), \`cancel\` (~25 LOC, L6), and \`match_at_level\` helper (~30 LOC, L4). Those will land in subsequent lessons.

Return:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: Why \`VecDeque\` and not \`Vec\`?**
Because we need fast push-back **and** fast pop-front. \`Vec::remove(0)\` shifts every element left — O(n). \`VecDeque::pop_front()\` is O(1). FIFO queues should always use \`VecDeque\` (or a real ringbuffer) — never \`Vec\` shifted from the front.

**Q: What's \`Reverse\` actually doing under the hood?**
It flips the \`Ord::cmp\` direction. \`Reverse(a).cmp(&Reverse(b)) == b.cmp(&a)\`. That's all. \`BTreeMap\` queries the key's \`Ord\` impl when sorting; by wrapping the key in \`Reverse\`, we make \`BTreeMap\` think \`Reverse(higher)\` is "smaller" than \`Reverse(lower)\` and walks accordingly.

**Q: Couldn't \`RestingOrder\` just be \`Order\`?**
You could — but you'd carry the \`side\` and \`order_type\` fields uselessly (we already know the side from the map, and a resting Market order is a contradiction). The trim is small, but the **type-level guarantee** "you can't construct a resting Market order" comes for free.

**Q: Why are the BTreeMap fields private?**
Because callers shouldn't directly modify the maps — they should go through \`submit\` / \`cancel\` (L4+ / L6) which maintain invariants like "an empty queue is never left in the map." If someone called \`book.asks.insert(price, VecDeque::new())\`, they'd create a phantom empty price level that \`best_ask()\` would return. The encapsulation prevents that.

## Next lesson (L4)

You have the data structure. L4 puts the first matching logic on top of it — \`submit\` for Limit Buy orders. Reader writes the \`Buy\` branch that walks asks from cheapest, matches at-or-below the limit, and rests the unfilled remainder. ~60 LOC of body + a \`match_at_level\` helper that L4-L5 both use. After L4, your matching engine produces real \`Fill\`s for the most common scenario (limit buy crossing a resting ask).`,
                },
                {
                  title: "Lesson 4 — submit for Limit orders + match_at_level",
                  slug: "openhl-clob-submit-limit-en",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 45,
                  xpReward: 80,
                  content: `# Lesson 4 — \`submit\` for Limit orders + \`match_at_level\`

## Goal

By the end of this lesson:

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

…still compiles. Your \`Book\` can now accept **Limit orders** (Buy + Sell) and produce real \`Fill\`s. Market orders are still \`todo!()\` — that's L5.

What you'll write:

- **\`submit()\`** — the dispatch method that routes to \`submit_limit\` or \`submit_market\` based on \`order.order_type\`.
- **\`submit_limit()\`** — the meat: walks the opposite side of the book, matches at-or-better than the limit price, rests any unfilled remainder back on the book.
- **\`match_at_level()\`** — a private helper called from \`submit_limit\` (and from \`submit_market\` in L5) that does the actual fill at a single price level, mutating both the maker queue and the taker's remaining quantity.

After L4 you'll have **~150 lines of book.rs**. Buy + Sell Limit orders both work; Market still panics with \`todo!\`.

## Recap

After L3, \`book.rs\` has:

\`\`\`rust
pub struct Book {
    bids: BTreeMap<Reverse<Price>, VecDeque<RestingOrder>>,
    asks: BTreeMap<Price, VecDeque<RestingOrder>>,
}

struct RestingOrder { id: OrderId, account: AccountId, qty: Qty }

impl Book {
    pub fn new() -> Self { ... }
    pub fn best_bid(&self) -> Option<Price> { ... }
    pub fn best_ask(&self) -> Option<Price> { ... }
    pub fn depth_bid(&self) -> usize { ... }
    pub fn depth_ask(&self) -> usize { ... }
}
\`\`\`

**No way to put an order in.** That's what L4 fixes.

## Plan

Three additions, all in \`crates/clob/src/book.rs\`:

1. **\`submit()\` dispatcher** — 1 \`match\` over \`OrderType\`. Limit → \`submit_limit\`; Market → \`todo!()\` for now.
2. **\`submit_limit()\` body** — about 60 lines. Buy walks asks ascending, matches while \`ask_price <= limit\`. Sell walks bids descending, matches while \`bid_price >= limit\`. Unfilled remainder rests on the book (entering as a \`RestingOrder\`).
3. **\`match_at_level()\` helper** — about 25 lines. Pops or shrinks the maker at the front of a queue, returns a single \`Fill\`, mutates the taker's \`remaining\` quantity.

This is **most of the matching engine**. L5 adds Market (which is \`submit_limit\` minus the price check + minus the resting step). L6 adds cancel. **The core of the matching engine is this lesson.**

> 🛑 **Predict.** Before scrolling: a Limit Buy order at price 100 walks the asks from cheapest. Suppose the asks look like \`{ Price(98): [O_a], Price(99): [O_b, O_c], Price(101): [O_d] }\`. The buyer wants to buy 50 units; each resting order has 30 units. **In what order do fills happen? What's the final state of the book?** Hint: walk asks from \`keys().next()\` and match each level until you're full or the next level exceeds your limit.

(Answer: fills are \`[Fill@98 for 30, Fill@99 for 20]\`. After the trade, \`O_a\` is gone, \`O_b\` has 10 units left, \`O_c\` is untouched at 30, \`O_d\` is untouched at 30. The buyer paid less than the limit (98 + 99 vs 100) — that's the "at-or-better" rule.)

## Walk-through

### Step 1: Add the \`submit()\` dispatcher

In \`crates/clob/src/book.rs\`, inside the existing \`impl Book { ... }\` block (right after \`new()\`), add:

\`\`\`rust
    /// Submit a taker order. Limit orders rest any unfilled remainder on the
    /// book; Market orders discard it (returned via \`remaining_qty\`).
    pub fn submit(&mut self, order: Order) -> FillResult {
        match order.order_type {
            OrderType::Limit { price } => self.submit_limit(order, price),
            OrderType::Market => todo!("Market orders land in L5"),
        }
    }
\`\`\`

3 lines of body. The dispatcher is intentionally tiny — all the matching logic lives in \`submit_limit\` and (eventually) \`submit_market\`. **The dispatcher's only job is type-driven routing**, not matching.

\`todo!()\` is the right placeholder here: it panics with a clear message at runtime if a Market order is submitted, but compiles cleanly. L5 will replace it with a real \`self.submit_market(order)\` call.

> 🛑 **Anti-fluency.** "Why not write submit() inline as one big match with the matching logic inside each arm?" **Because then \`submit_limit\` and \`submit_market\` would be hidden inside the dispatcher's match arms.** Two effects: (1) the public method \`submit\` grows to 100+ lines and is hard to read at a glance; (2) testing each path becomes harder (the test imports \`Book::submit\` but has to construct an \`Order\` with the right \`order_type\` to exercise a specific path). Pulling \`submit_limit\` / \`submit_market\` out as named functions makes them addressable and testable.

### Step 2: Start writing \`submit_limit\` — the dispatcher's body

Below \`submit()\`, still inside \`impl Book\`:

\`\`\`rust
    fn submit_limit(&mut self, order: Order, limit_price: Price) -> FillResult {
        let mut remaining = order.qty;
        let mut fills = Vec::new();

        match order.side {
            Side::Buy => {
                // Buy walks asks from cheapest; matches while ask <= limit.
                loop {
                    if remaining.0 == 0 {
                        break;
                    }
                    let Some(best_price) = self.asks.keys().next().copied() else {
                        break;
                    };
                    if best_price > limit_price {
                        break;
                    }
                    let queue = self
                        .asks
                        .get_mut(&best_price)
                        .expect("price level exists by construction");
                    fills.push(match_at_level(&order, best_price, queue, &mut remaining));
                    if queue.is_empty() {
                        self.asks.remove(&best_price);
                    }
                }
            }
            Side::Sell => {
                // Sell walks bids from highest; matches while bid >= limit.
                loop {
                    if remaining.0 == 0 {
                        break;
                    }
                    let Some(best_rev) = self.bids.keys().next().copied() else {
                        break;
                    };
                    let best_price = best_rev.0;
                    if best_price < limit_price {
                        break;
                    }
                    let queue = self
                        .bids
                        .get_mut(&best_rev)
                        .expect("price level exists by construction");
                    fills.push(match_at_level(&order, best_price, queue, &mut remaining));
                    if queue.is_empty() {
                        self.bids.remove(&best_rev);
                    }
                }
            }
        }

        // (rest-the-remainder logic comes next)
        FillResult { fills, remaining_qty: Qty(0) }
    }
\`\`\`

This is the matching loop. Walk it carefully. The Buy branch:

1. **Loop forever, breaking on conditions.** Three exits: (a) taker is fully filled, (b) book is empty on this side, (c) the cheapest ask is more expensive than the limit.
2. **\`self.asks.keys().next().copied()\`** — the cheapest ask price. \`.copied()\` because we want a \`Price\` value, not \`&Price\`.
3. **\`if best_price > limit_price { break }\`** — the at-or-better rule. We won't pay more than \`limit_price\` for an ask.
4. **\`self.asks.get_mut(&best_price).expect(...)\`** — the queue at that price. **\`.expect\` is safe here** because we just got \`best_price\` from \`keys().next()\` — the level definitely exists. The expect message documents this invariant.
5. **\`match_at_level(&order, best_price, queue, &mut remaining)\`** — does the actual match. We'll write this helper next; for now know that it returns a \`Fill\` and mutates both \`queue\` (pops the maker if fully filled) and \`remaining\` (subtracts the filled quantity).
6. **\`if queue.is_empty() { self.asks.remove(&best_price) }\`** — if \`match_at_level\` left the queue empty, drop the level so \`best_ask()\` stays consistent with \`depth_ask()\`. (If we left an empty queue in the map, \`best_ask()\` would return that level's price even though no orders are there.)

The Sell branch is **structurally identical** but inverted:
- Walks \`bids\` instead of \`asks\`.
- The keys are \`Reverse<Price>\`, so we unwrap via \`best_rev.0\`.
- Compares with \`best_price < limit_price\` (sell at-or-better means sell at or above limit).

**The "structural identity" is the load-bearing observation.** A Buy + a Sell are mirror images of each other. Both walk the opposite side's best-first; both match while the price clears the limit; both pop the level if it goes empty. The only difference is which BTreeMap they touch and which direction the comparison goes. If you understand the Buy branch, you understand the Sell branch.

> 🛑 **Anti-fluency.** "Couldn't I parameterize over Buy/Sell and write this loop once?" **You could — but it's not worth it.** The fully-generic version requires you to abstract the BTreeMap (\`Reverse<Price>\` vs \`Price\`), the comparison operator (\`>\` vs \`<\`), and the keys (\`bids\` vs \`asks\`). The savings is ~30 lines of duplication; the cost is one of the most hostile generic-bound puzzles in Rust. **Duplication is cheap; abstraction-budget is precious. Spend it where you actually win.**

### Step 3: Add the rest-the-remainder logic

The matching loop above ends with \`FillResult { fills, remaining_qty: Qty(0) }\` — that's a placeholder. Replace it with the real "rest the remainder" logic:

\`\`\`rust
        // Any unfilled limit qty rests on the book.
        if remaining.0 > 0 {
            let resting = RestingOrder {
                id: order.id,
                account: order.account,
                qty: remaining,
            };
            match order.side {
                Side::Buy => self
                    .bids
                    .entry(Reverse(limit_price))
                    .or_default()
                    .push_back(resting),
                Side::Sell => self.asks.entry(limit_price).or_default().push_back(resting),
            }
            // Limit orders that rest report zero remaining to the caller —
            // the remainder isn't in the return value, it's in the book.
            FillResult {
                fills,
                remaining_qty: Qty(0),
            }
        } else {
            FillResult {
                fills,
                remaining_qty: Qty(0),
            }
        }
    }
\`\`\`

Walk this carefully:

1. **\`if remaining.0 > 0\`** — taker still has unfilled quantity. For Limit orders, that quantity goes onto the book (Market orders, in L5, discard it instead).
2. **Construct \`RestingOrder\`** — drop the side and order_type (encoded by which map we push into), keep id + account + remaining qty.
3. **\`self.bids.entry(Reverse(limit_price)).or_default().push_back(resting)\`** — for a Buy order's unfilled remainder. \`entry\` + \`or_default\` is the "insert if missing, get mutable ref either way" idiom for BTreeMap. The \`Reverse(limit_price)\` is the key shape we picked for bids in L3.
4. **\`self.asks.entry(limit_price).or_default().push_back(resting)\`** — symmetric for Sell.
5. **\`FillResult { fills, remaining_qty: Qty(0) }\`** — return zero \`remaining_qty\` to the caller. **This is the load-bearing semantic** the doc on \`FillResult\` in L2 promised: a Limit order that rests *says zero remaining*. The remainder is in the book, not in the return value.
6. **Both branches** (\`if\` and \`else\`) return \`Qty(0)\` remaining. The \`else\` branch is for the fully-filled case (taker matched 100%; nothing rests, nothing remains). The two branches produce the same return value but for different reasons.

> 🛑 **Anti-fluency.** "Why does a Limit order that rests return \`remaining_qty: Qty(0)\` instead of the resting amount? Callers might want to know how much went onto the book." **Because \`FillResult\` is the result of *matching*, not the state of the book.** A caller who wants the resting amount can query \`best_bid()\` or \`depth_bid()\` after the call. Conflating "the book accepted this much new resting liquidity" with "the matcher had leftover taker quantity it couldn't place" makes the semantics ambiguous. **Returns describe what happened; book state describes what's there. Separate concerns.**

### Step 4: Write the \`match_at_level()\` helper

Below the \`impl Book { ... }\` block (at module scope, not inside the impl), add:

\`\`\`rust
/// Match a taker against the front of a single price level.
/// Mutates \`queue\` (pops the maker if fully filled) and \`remaining\`.
fn match_at_level(
    taker: &Order,
    price: Price,
    queue: &mut VecDeque<RestingOrder>,
    remaining: &mut Qty,
) -> Fill {
    let maker = queue
        .front_mut()
        .expect("match_at_level called with empty queue");
    let fill_qty = Qty(maker.qty.0.min(remaining.0));

    let fill = Fill {
        maker_order_id: maker.id,
        taker_order_id: taker.id,
        maker_account: maker.account,
        taker_account: taker.account,
        price,
        qty: fill_qty,
    };

    maker.qty.0 -= fill_qty.0;
    remaining.0 -= fill_qty.0;

    if maker.qty.0 == 0 {
        queue.pop_front();
    }

    fill
}
\`\`\`

This is **the actual match** — the smallest function that does the real work. Walk it:

1. **\`queue.front_mut().expect(...)\`** — the maker at the front of the queue. Time priority means the first-placed order matches first. \`expect\` is safe because \`submit_limit\` only calls \`match_at_level\` after confirming the level exists.
2. **\`fill_qty = min(maker.qty, remaining)\`** — match the smaller of the two. If the maker has 30 units and the taker still needs 50, the fill is 30 (the maker is fully consumed). If the maker has 30 and the taker only needs 10, the fill is 10 (the maker still has 20 left).
3. **Build the \`Fill\`** — store both order IDs and both account IDs (L2's design decision: self-contained Fills).
4. **\`maker.qty.0 -= fill_qty.0\`** — shrink the maker. This is the **mutation that's safe inside RestingOrder but would be weird inside Order** (L3's anti-fluency callout — RestingOrder exists exactly to make this kind of mutation explicit).
5. **\`remaining.0 -= fill_qty.0\`** — shrink the taker's outstanding quantity. The caller (\`submit_limit\`) sees this via the \`&mut Qty\` argument.
6. **\`if maker.qty.0 == 0 { queue.pop_front() }\`** — if the maker is fully consumed, pop them off. The next iteration of \`submit_limit\`'s outer loop will check this queue again — if it's now empty, the level itself gets dropped.

**Why is this a free function instead of a method on Book?** Because it doesn't need access to \`self\`. It only touches a single queue (which \`submit_limit\` already has a mutable reference to) and a single \`remaining\` counter. Making it a free function reflects that scope: nothing about \`Book\` as a whole is involved.

> 🛑 **Anti-fluency.** "The \`expect("empty queue")\` panic seems risky. What if the queue *is* empty?" **The function isn't supposed to be called with an empty queue — that's an \`submit_limit\` invariant.** Specifically, \`submit_limit\` calls \`match_at_level\` only after \`keys().next()\` returned \`Some(price)\`, which guarantees the level (and thus its queue) has at least one element. If \`match_at_level\` were called with an empty queue, that's a bug in \`submit_limit\`, not in \`match_at_level\` — and \`expect\` makes the bug surface as a panic with a clear message instead of an \`Option::None\` silently propagating. **Trust internal invariants; assert them with \`expect\`.**

## Test

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

Should compile clean. Unused-import warnings from L3 (specifically \`Fill\`, \`FillResult\`, \`Order\`, \`OrderType\`, \`Qty\`, \`Side\`) should be gone now — \`submit_limit\` and \`match_at_level\` use all of them.

To sanity-check the matching logic, we don't have tests yet (those are L7-L8), but you can write a one-off in \`src/lib.rs\` temporarily:

\`\`\`rust
#[cfg(test)]
mod smoke {
    use super::*;

    #[test]
    fn buy_crosses_resting_ask() {
        let mut book = Book::new();
        // Place a resting sell at 100 for 30 units.
        book.submit(Order {
            id: OrderId(1),
            account: AccountId(1),
            side: Side::Sell,
            qty: Qty(30),
            order_type: OrderType::Limit { price: Price(100) },
        });
        // Cross with a buy at 100 for 50 units.
        let result = book.submit(Order {
            id: OrderId(2),
            account: AccountId(2),
            side: Side::Buy,
            qty: Qty(50),
            order_type: OrderType::Limit { price: Price(100) },
        });
        assert_eq!(result.fills.len(), 1);
        assert_eq!(result.fills[0].qty, Qty(30));
        assert_eq!(result.fills[0].price, Price(100));
        assert_eq!(result.fills[0].maker_order_id, OrderId(1));
        assert_eq!(result.fills[0].taker_order_id, OrderId(2));
        // 50 - 30 = 20 unfilled, rests as a new bid at 100.
        assert_eq!(result.remaining_qty, Qty(0)); // rested, not returned
        assert_eq!(book.best_bid(), Some(Price(100)));
        assert_eq!(book.depth_bid(), 1);
        assert_eq!(book.depth_ask(), 0); // ask was fully consumed
    }
}
\`\`\`

Run with \`cargo test -p openhl-clob buy_crosses_resting_ask\`. If it passes, your Limit Buy + Limit Sell logic is correct.

**Delete this smoke test before moving to L5** — the real test suite goes in L7-L8 with proper hand-traced scenarios + proptests. The smoke test above is just to verify L4 compiles AND runs correctly. Keep your \`src/lib.rs\` clean for L5.

Common errors and fixes:

- **\`error: 'Buy' branch panics with 'todo!()' but I selected Limit not Market\`** — your \`submit\` dispatcher's \`OrderType::Limit\` arm still has \`todo!()\` from a draft state. Re-check Step 1; the Limit arm should call \`self.submit_limit(order, price)\`.
- **\`error[E0596]: cannot borrow 'maker' as mutable... requires Copy\`** — \`front_mut()\` returns \`Option<&mut T>\`, not \`Option<T>\`. If you wrote \`let maker = queue.front_mut().expect(...).clone()\`, you're working with a \`Copy\` of the maker and your mutations don't persist. Use the reference directly: \`let maker = queue.front_mut().expect(...)\`.
- **\`error: cannot find value 'asks' in scope\`** in match_at_level — \`match_at_level\` is a free function, not a Book method. It doesn't have \`self\`. Use the parameters (\`queue\`, \`remaining\`) instead.
- **Smoke test reports \`depth_bid: 0\`** — your rest-the-remainder logic didn't push to bids. Re-check Step 3, especially the \`Reverse(limit_price)\` key wrapping (forgetting \`Reverse\` means you push into an unwrapped-Price entry which won't be found by \`best_bid\`'s \`Reverse\`-keyed lookup).

## Design reflection

Three load-bearing decisions encoded here:

1. **Buy and Sell are structural mirrors.** The Buy branch walks asks ascending; the Sell branch walks bids descending. We didn't try to abstract over them with generics — duplication was cheaper than the abstraction tax. **Two structurally identical functions are easier to read than one fully-generic function.**

2. **\`match_at_level\` is a free function, not a method.** It doesn't need \`self\`. Making it a free function documents that it operates on data the caller has already extracted (queue + remaining), not on the Book's overall state. **Function signature is documentation: name your scope.**

3. **\`remaining_qty: Qty(0)\` for resting Limit orders is intentional.** The caller sees "this many units matched; nothing leftover for me." If they want to know about the resting remainder, they query the book directly via \`best_bid\` / \`depth_bid\` — those are book-state methods. **Return values describe what happened to the call; book state describes what is. Don't mix.**

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout 55a9dff
diff -u ~/code/my-openhl/crates/clob/src/book.rs ./crates/clob/src/book.rs
\`\`\`

After L4, your \`book.rs\` is approximately **the first ~145 lines** of the reference (struct + accessors from L3 + submit dispatcher + submit_limit + match_at_level). The reference also has \`submit_market\` (~40 LOC, L5) and \`cancel\` (~25 LOC, L6) that you haven't written yet.

Return:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: Why is \`match_at_level\`'s \`taker\` an \`&Order\` reference but \`queue\` is \`&mut VecDeque<RestingOrder>\`?**
Because \`match_at_level\` reads from \`taker\` (just to copy fields into the \`Fill\`) but writes to \`queue\` (pops or shrinks the front element). The function signature matches usage: \`&\` for read-only, \`&mut\` for mutating. The compiler enforces this — you can't accidentally mutate \`taker\` because the reference type doesn't allow it.

**Q: What happens if a price level exists but its queue is empty?**
That's a bug. The invariant is "every key in the map corresponds to a non-empty queue." \`submit_limit\` enforces this by checking \`if queue.is_empty() { self.asks.remove(&best_price) }\` after each match — so an empty queue is never left behind. If you ever see an empty queue, look for places that mutated the queue without checking emptiness afterward.

**Q: Why not use \`BTreeMap::pop_first()\` to grab the best level + remove it in one call?**
Two reasons. (1) Popping unconditionally removes the level, but we don't always want that — sometimes the level still has orders after matching (the maker got partially filled, queue still has others behind them). (2) \`pop_first\` was stabilized in Rust 1.66 but the matching pattern with \`get_mut\` + conditional \`remove\` reads more naturally for the "consume some, maybe drop the level" flow.

**Q: Is there a fast path for "the taker exactly matches the maker"?**
No, and we don't need one. The general path (\`min(maker.qty, remaining)\` + shrink-or-pop) handles "exact match" as a special case of the general one. Adding a special-case branch would add a code path to test for marginal speedup; profile first if performance matters.

## Next lesson (L5)

Limit orders work. **Market orders still \`todo!()\`.** L5 finishes the matching engine by:
- Replacing \`todo!()\` in \`submit()\` with \`self.submit_market(order)\`
- Writing \`submit_market()\` — like \`submit_limit\` but **without the price check** (Market takes any price) and **without resting the remainder** (Market discards leftovers).

L5 is shorter than L4 because most of the work (\`match_at_level\`, the dispatcher) is done. By the end of L5 you have a complete matching engine with both order types working.`,
                },
                {
                  title: "Lesson 5 — submit_market — orders that take any price",
                  slug: "openhl-clob-submit-market-en",
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 25,
                  xpReward: 60,
                  content: `# Lesson 5 — \`submit_market\` — orders that take any price

## Goal

By the end of this lesson:

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

…still compiles, and the \`submit()\` dispatcher no longer panics on Market orders. You'll have written:

- **\`submit_market()\`** — the Market-order matcher. Structurally similar to \`submit_limit\` from L4, but with **two key differences**:
  1. **No price check** — Market orders take whatever's available at any price.
  2. **No rest-the-remainder** — Market orders discard unmatched quantity; the leftover comes back in \`FillResult::remaining_qty\`.
- **Updated \`submit()\` dispatcher** — replace L4's \`todo!("Market orders land in L5")\` with \`self.submit_market(order)\`.

After L5 the matching engine is **complete**. Both Limit and Market orders produce real fills. L6 adds \`cancel\`; L7-L8 add the test suite that proves the engine's invariants hold.

## Recap

After L4, \`book.rs\` has:

\`\`\`rust
pub fn submit(&mut self, order: Order) -> FillResult {
    match order.order_type {
        OrderType::Limit { price } => self.submit_limit(order, price),
        OrderType::Market => todo!("Market orders land in L5"),
    }
}

fn submit_limit(&mut self, order: Order, limit_price: Price) -> FillResult {
    // ~60 lines: walk opposite side, match at-or-better, rest remainder
}

fn match_at_level(taker: &Order, price: Price, ...) -> Fill { ... }
\`\`\`

If you call \`book.submit(market_order)\`, it panics with \`todo!\`. L5 fixes that.

## Plan

Two changes, both in \`crates/clob/src/book.rs\`:

1. **Add \`submit_market()\`** below \`submit_limit()\`. Two branches (Buy/Sell), each a loop almost identical to \`submit_limit\`'s loop — but **without** the limit-price comparison.
2. **Edit \`submit()\`** to dispatch to \`submit_market\` instead of panicking.

No new types, no new helpers. We reuse \`match_at_level\` from L4 unchanged.

The lesson is short because **L5 is what's left over after L4 did most of the work**. The structural pattern is the same; the differences are what makes "market order" different from "limit order" semantically.

> 🛑 **Predict.** Before scrolling: suppose the asks are \`{ Price(100): [O_a (30 units)] }\` and a Market buy for 50 units arrives. What's the fill, and what's in \`FillResult::remaining_qty\`? Now contrast: the same starting book, but a Limit buy at price 100 for 50 units. **Where does the leftover 20 units go in each case?**

(Answer: Market case → fill \`[30 @ 100]\`, \`remaining_qty = 20\` (the unfilled portion is discarded — the caller sees it but it's not on the book). Limit case → fill \`[30 @ 100]\`, \`remaining_qty = 0\` (the 20 units rest on the book as a new bid at 100). **Same fill, different fate for the leftover.**)

## Walk-through

### Step 1: Add \`submit_market()\` to \`impl Book\`

In \`crates/clob/src/book.rs\`, inside the existing \`impl Book { ... }\` block (right after \`submit_limit\`), add:

\`\`\`rust
    fn submit_market(&mut self, order: Order) -> FillResult {
        let mut remaining = order.qty;
        let mut fills = Vec::new();

        match order.side {
            Side::Buy => loop {
                if remaining.0 == 0 {
                    break;
                }
                let Some(best_price) = self.asks.keys().next().copied() else {
                    break;
                };
                let queue = self
                    .asks
                    .get_mut(&best_price)
                    .expect("price level exists by construction");
                fills.push(match_at_level(&order, best_price, queue, &mut remaining));
                if queue.is_empty() {
                    self.asks.remove(&best_price);
                }
            },
            Side::Sell => loop {
                if remaining.0 == 0 {
                    break;
                }
                let Some(best_rev) = self.bids.keys().next().copied() else {
                    break;
                };
                let queue = self
                    .bids
                    .get_mut(&best_rev)
                    .expect("price level exists by construction");
                fills.push(match_at_level(&order, best_rev.0, queue, &mut remaining));
                if queue.is_empty() {
                    self.bids.remove(&best_rev);
                }
            },
        }

        FillResult {
            fills,
            remaining_qty: remaining,
        }
    }
\`\`\`

Compare side-by-side with \`submit_limit\`. The differences:

| What | \`submit_limit\` | \`submit_market\` |
| - | - | - |
| Price check inside loop | \`if best_price > limit_price { break }\` (Buy) | **None** — takes any price |
| Price check inside loop | \`if best_price < limit_price { break }\` (Sell) | **None** — takes any price |
| Rest-the-remainder after loop | \`if remaining.0 > 0 { ... push_back(resting) ... }\` | **None** — leftover is discarded |
| \`remaining_qty\` in return | Always \`Qty(0)\` (rested or fully filled) | \`remaining\` (whatever's left over after matching) |

That's the entire delta. **Same loop shape, two checks removed, one return value changed.**

> 🛑 **Anti-fluency.** "Couldn't I just call \`submit_limit\` with \`limit_price = Price(u64::MAX)\` for Market Buy and \`Price(0)\` for Market Sell?" **It works for the price-check elimination, but it doesn't eliminate the rest-the-remainder logic.** A Market order with \`u64::MAX\` limit would still try to rest unfilled qty at \`u64::MAX\` — creating a phantom resting bid at the highest possible price. The behavior would be wrong: a Market buy that doesn't fully fill would put a \`u64::MAX\`-priced bid on the book, which would then immediately match any incoming sell. **Two functions, two semantics, kept separate.**

### Step 2: Update \`submit()\` dispatcher

Find the dispatcher you wrote in L4:

\`\`\`rust
pub fn submit(&mut self, order: Order) -> FillResult {
    match order.order_type {
        OrderType::Limit { price } => self.submit_limit(order, price),
        OrderType::Market => todo!("Market orders land in L5"),
    }
}
\`\`\`

Replace the \`todo!\` with a real call:

\`\`\`rust
pub fn submit(&mut self, order: Order) -> FillResult {
    match order.order_type {
        OrderType::Limit { price } => self.submit_limit(order, price),
        OrderType::Market => self.submit_market(order),
    }
}
\`\`\`

One line changed. The dispatcher's role hasn't expanded — it's still "type-driven routing, one line per arm." The implementations live in the dedicated methods.

## Test

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

Clean. No warnings about unused functions (every function declared in \`book.rs\` now has at least one caller — \`submit_market\` is called by \`submit\`, the \`submit_*\` private methods are called from inside \`Book\`, \`match_at_level\` is called by both submits).

Smoke test (delete after, as in L4):

\`\`\`rust
#[cfg(test)]
mod smoke {
    use super::*;

    #[test]
    fn market_buy_takes_what_it_can_then_discards() {
        let mut book = Book::new();
        // Place a single resting sell at 100 for 30 units.
        book.submit(Order {
            id: OrderId(1),
            account: AccountId(1),
            side: Side::Sell,
            qty: Qty(30),
            order_type: OrderType::Limit { price: Price(100) },
        });
        // Market buy for 50 — should match 30 at 100, leave 20 unfilled.
        let result = book.submit(Order {
            id: OrderId(2),
            account: AccountId(2),
            side: Side::Buy,
            qty: Qty(50),
            order_type: OrderType::Market,
        });
        assert_eq!(result.fills.len(), 1);
        assert_eq!(result.fills[0].qty, Qty(30));
        assert_eq!(result.fills[0].price, Price(100));
        // The 20 unfilled units are DISCARDED, not rested.
        assert_eq!(result.remaining_qty, Qty(20));
        assert_eq!(book.best_bid(), None); // no resting bid created
        assert_eq!(book.best_ask(), None); // ask was consumed
    }

    #[test]
    fn market_buy_against_empty_book_returns_full_remainder() {
        let mut book = Book::new();
        let result = book.submit(Order {
            id: OrderId(1),
            account: AccountId(1),
            side: Side::Buy,
            qty: Qty(50),
            order_type: OrderType::Market,
        });
        assert_eq!(result.fills.len(), 0);
        assert_eq!(result.remaining_qty, Qty(50));
        assert_eq!(book.best_bid(), None);
        assert_eq!(book.best_ask(), None);
    }
}
\`\`\`

Run with \`cargo test -p openhl-clob smoke\`. Both should pass. **Then delete the smoke module** — L7-L8 has the real test suite.

The contrast between the two smoke tests is the L5 lesson in miniature: **whatever's left over after matching is discarded**, regardless of whether the matching engine produced any fills or not. The book state after a Market order is exactly the book state minus the consumed liquidity — no resting orders added.

Common errors and fixes:

- **Smoke test reports \`result.remaining_qty == Qty(0)\` instead of \`Qty(20)\`** — your \`submit_market\`'s final \`FillResult\` has \`remaining_qty: Qty(0)\` (probably copy-pasted from \`submit_limit\`). It should be \`remaining_qty: remaining\` — the actual leftover quantity.
- **\`book.best_bid()\` returns \`Some(price)\` after Market Buy** — your \`submit_market\` is hitting \`submit_limit\`'s rest-the-remainder branch. That's because the loop fell through into shared code. Check that \`submit_market\` is its own function with its own final \`FillResult\` — no shared "rest" logic.
- **\`error: cannot find function 'submit_market' in '&mut Book'\`** — typo in \`submit()\` dispatcher. The method should be \`self.submit_market(order)\`, called against \`self\`.
- **\`warning: unused variable: remaining\`** in a wrong path — you might have written \`let remaining_qty = ...\` instead of \`remaining: remaining,\` in the FillResult. The field name is \`remaining_qty\`, the local variable is \`remaining\` (\`FillResult { fills, remaining_qty: remaining }\`).

## Design reflection

Three load-bearing decisions encoded here:

1. **\`submit_limit\` and \`submit_market\` are separate functions, not parameterized.** Even though the loops are 80% identical, the semantic difference (does the leftover rest or get discarded?) is in the *missing* code, not the code that's there. Parameterizing would require boolean flags like \`rest_remainder: bool\` and \`enforce_price: bool\` — turning the function bodies into branchy puzzles. **The clear separation makes the two semantics easy to read independently.**

2. **\`FillResult::remaining_qty\` carries different meaning across order types.** For Limit, it's always \`Qty(0)\` (rested or fully matched). For Market, it's the actual unfilled remainder. **The type is the same; the contract differs.** This is OK because the field doc on \`FillResult\` (L2) explicitly names both interpretations.

3. **Empty-book Market orders return cleanly, not via error.** A Market buy against an empty asks book returns \`FillResult { fills: vec![], remaining_qty: order.qty }\`. No error. This is the right default: the caller asked us to match, we matched as much as we could (zero), and we reported the leftover. **"Nothing happened" should be a valid result, not an error.**

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout 55a9dff
diff -u ~/code/my-openhl/crates/clob/src/book.rs ./crates/clob/src/book.rs
\`\`\`

After L5, your \`book.rs\` is approximately **the first ~190 lines** of the reference. The remaining ~25 lines are \`cancel()\` (L6) and module exports.

Return:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: What's the use case for an empty-book Market order to return cleanly instead of erroring?**
Production matching engines see this often: a thin market opens, the orderbook is empty briefly between fills, and a Market order arrives. The right behavior is "produce zero fills, report full remainder, let the caller decide what to do." The caller might retry later, switch to a Limit order, or surface an error to the user — but the matching engine itself doesn't decide.

**Q: Why is the maker's resting price used, even though Market doesn't have its own price?**
The fill price is always the *resting* order's price (the maker's). Market orders don't supply a price; they accept whatever the book offers. **The "price discovery" is what makes a market a market** — the buyer doesn't dictate price; the spread between best bid and best ask does.

**Q: Could a Market order produce a Fill with zero quantity?**
No. \`match_at_level\` computes \`fill_qty = min(maker.qty, remaining)\`. For this to be zero, either \`maker.qty\` or \`remaining\` would have to be zero. Both invariants are maintained: \`submit_market\` breaks out of the loop the moment \`remaining == 0\`, and a maker queue never has a zero-qty resting order (the matching code shrinks qty and pops the maker when it hits zero). So \`match_at_level\` is never called with either being zero.

**Q: What about partial fills against multiple price levels?**
Market orders handle this naturally. A 100-unit Market buy facing asks \`{99: [30 units], 100: [30 units], 101: [50 units]}\` produces three fills (30 @ 99, 30 @ 100, 40 @ 101). Each iteration of the loop calls \`match_at_level\` against the front of the next-best level; the loop continues until \`remaining == 0\` or the book runs out. **The walk-multiple-levels behavior is the same as for crossing Limit orders.**

## Next lesson (L6)

The matching engine handles **submit**. It can't handle **cancel** yet — a user who wants to remove their resting order before it gets filled has no way to do so. L6 adds \`cancel(order_id) -> bool\`:

- Linear scan through both bids and asks until the order is found.
- O(n) for now, where n is total resting orders. We'll address whether to add an O(1) index in a later openhl stage.
- Critically: drops the price level if cancellation leaves it empty (the same invariant \`submit\` maintains via \`if queue.is_empty() { self.asks.remove(...) }\`).`,
                },
                {
                  title: "Lesson 6 — cancel — pulling an order off the book",
                  slug: "openhl-clob-cancel-en",
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 20,
                  xpReward: 50,
                  content: `# Lesson 6 — \`cancel\` — pulling an order off the book

## Goal

By the end of this lesson:

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

…still compiles. You'll have one new method on \`Book\`:

- **\`cancel(&mut self, order_id: OrderId) -> bool\`** — searches both bid and ask sides for an order with the given id, removes it if found, drops the price level if cancellation leaves it empty. Returns \`true\` if removed, \`false\` if not found.

About 25 LOC. The interesting idiom is **\`BTreeMap::retain\`** — a single call that traverses every queue, conditionally mutates it, and drops the entry if a closure returns \`false\`. That handles both the "remove the order" and "drop the empty level" steps in one pass.

After L6, the matching engine is **functionally complete**. Submit (Limit + Market) + cancel = the full v0 surface. L7 starts the test suite.

## Recap

After L5, \`Book\` has:

\`\`\`rust
impl Book {
    pub fn new() -> Self { ... }                          // L3
    pub fn best_bid(&self) -> Option<Price> { ... }       // L3
    pub fn best_ask(&self) -> Option<Price> { ... }       // L3
    pub fn depth_bid(&self) -> usize { ... }              // L3
    pub fn depth_ask(&self) -> usize { ... }              // L3
    pub fn submit(&mut self, order: Order) -> FillResult { ... }  // L4 + L5
    // submit_limit, submit_market (private)
}
\`\`\`

What's missing: a way to **remove** a resting order. If a user submits a Limit Buy at 100 that rests on the book, they currently have no way to take it off. L6 adds that.

## Plan

One method, one file. In \`crates/clob/src/book.rs\`, add \`cancel\` to the existing \`impl Book\` block:

1. **Search bids first** via \`BTreeMap::retain\` — a closure that removes the matching order from its queue and reports whether the queue is now non-empty.
2. **If found in bids**, return \`true\` immediately.
3. **Otherwise search asks** the same way.
4. **Return \`found\`** (true if found in asks, false if not found anywhere).

The trick is \`retain\`. We use the same closure to do **two jobs**:

- **Mutate the queue** (remove the order if its id matches).
- **Signal whether to drop the BTreeMap entry** (return \`!queue.is_empty()\`).

\`retain\` calls the closure on every (key, value) pair and removes the pair if the closure returns \`false\`. By combining the queue-mutation with the empty-check return, we get the "remove + clean up empty levels" invariant for free.

> 🛑 **Predict.** Before scrolling: a user submits a Limit Buy at 100 for 50 units (which fully rests on the book), then submits Cancel for that order's id. After cancel, **what should \`best_bid()\` return**? Hint: think about whether the price level still exists in the map after the cancellation.

(Answer: \`None\`. The order was the only one at price 100, so canceling it leaves the queue empty, which means \`retain\` drops the level from the map, which means \`bids.keys().next()\` returns \`None\`, which means \`best_bid()\` returns \`None\`. **The empty-level cleanup is what keeps \`best_bid\` honest about whether liquidity actually exists.**)

## Walk-through

### Step 1: Add \`cancel\` to the impl block

In \`crates/clob/src/book.rs\`, inside \`impl Book { ... }\` (after \`submit_market\`), add:

\`\`\`rust
    /// Cancel a resting order by id. O(n) linear scan; fine for v0 book sizes.
    /// Returns true if the order was found and removed. Empty price levels
    /// left behind by cancellation are also dropped, so \`best_bid\`/\`best_ask\`
    /// stay consistent with \`depth_bid\`/\`depth_ask\`.
    pub fn cancel(&mut self, order_id: OrderId) -> bool {
        let mut found = false;
        self.bids.retain(|_, queue| {
            if !found && let Some(pos) = queue.iter().position(|o| o.id == order_id) {
                queue.remove(pos);
                found = true;
            }
            !queue.is_empty()
        });
        if found {
            return true;
        }
        self.asks.retain(|_, queue| {
            if !found && let Some(pos) = queue.iter().position(|o| o.id == order_id) {
                queue.remove(pos);
                found = true;
            }
            !queue.is_empty()
        });
        found
    }
\`\`\`

Walk it carefully:

1. **\`let mut found = false\`** — local flag. Becomes \`true\` the moment we find and remove the order.
2. **\`self.bids.retain(|_, queue| { ... })\`** — \`retain\` walks every (\`Reverse<Price>\`, \`VecDeque<RestingOrder>\`) pair. The closure mutates \`queue\` and returns \`bool\`: \`false\` drops the entry, \`true\` keeps it.
3. **\`if !found && let Some(pos) = queue.iter().position(|o| o.id == order_id)\`** — search only if we haven't already found it. \`iter().position()\` returns \`Option<usize>\` — the index of the first element matching the predicate. Combined with \`if let\`, this is the idiomatic Rust pattern for "do something with the index if it exists."
4. **\`queue.remove(pos)\`** — \`VecDeque::remove(index)\` pulls out the element at that index. It returns \`Option<T>\` (the removed element), which we ignore here. **\`VecDeque::remove\` is O(n)** — it shifts subsequent elements one slot left. For a queue of a few hundred orders, that's microseconds.
5. **\`found = true\`** — set the flag so subsequent levels don't get scanned. **This is the load-bearing optimization** — once we find the order, we still walk the rest of the levels (to check for empty queues that might exist from prior cancellations), but we skip the linear scan inside each remaining queue.
6. **\`!queue.is_empty()\`** — the return value. If the queue is now empty (because we just removed its last order, or it was empty for some other reason), return \`false\` so \`retain\` drops the entry. Otherwise return \`true\` to keep it.
7. **\`if found { return true }\`** — short-circuit. If we already found and removed the order in bids, no need to search asks.
8. **\`self.asks.retain(...)\`** — same logic against asks. The closure body is identical (no key differences — both maps use \`VecDeque<RestingOrder>\` as values).
9. **\`found\`** — the final return. If we found in bids, we returned \`true\` earlier; if we found in asks, \`found\` got set to \`true\` and we return that; if neither, \`found\` stays \`false\`.

> 🛑 **Anti-fluency.** "I'll just iterate over the BTreeMap, find the entry, remove the order, then iterate again to drop empty levels." **Two passes is wasteful, and worse, it splits the invariant across two places.** With \`retain\`, the "remove order" and "drop empty level" decisions are both encoded in one closure. There's no window between "removed the order" and "checked if the level is empty" where the data structure is in an inconsistent state. **One closure, two jobs, one invariant.**

### Step 2: Verify the new method has a path through both branches

\`cargo check -p openhl-clob\` should compile cleanly. No warnings.

The unused-import warnings from previous lessons should all be gone — \`cancel\` doesn't introduce new imports (everything it uses, \`OrderId\` + \`VecDeque::remove\` + the BTreeMap surface, was already in scope).

If you want to verify the \`if let && pattern\` syntax is OK with your Rust version (it's stable in 1.65+):

\`\`\`bash
rustc --version
# Should report 1.95.x or later from the course prerequisites.
\`\`\`

If you're stuck on an older Rust, the equivalent without let-chains is:

\`\`\`rust
if !found {
    if let Some(pos) = queue.iter().position(|o| o.id == order_id) {
        queue.remove(pos);
        found = true;
    }
}
\`\`\`

Same behavior, two extra lines, no \`let && let\` chain.

## Test

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

Clean. The matching engine is now feature-complete — \`book.rs\` has \`new\`, all 4 accessors, \`submit\` (with both Limit and Market paths), and \`cancel\`. No \`todo!()\` left.

Smoke test (delete after, like L4/L5):

\`\`\`rust
#[cfg(test)]
mod smoke {
    use super::*;

    fn limit_buy(id: u64, account: u64, qty: u64, price: u64) -> Order {
        Order {
            id: OrderId(id),
            account: AccountId(account),
            side: Side::Buy,
            qty: Qty(qty),
            order_type: OrderType::Limit { price: Price(price) },
        }
    }

    #[test]
    fn cancel_removes_resting_order() {
        let mut book = Book::new();
        // Rest a buy at 100, then a buy at 99 (different price levels).
        book.submit(limit_buy(1, 1, 30, 100));
        book.submit(limit_buy(2, 2, 30, 99));
        assert_eq!(book.best_bid(), Some(Price(100)));
        assert_eq!(book.depth_bid(), 2);

        // Cancel order 1 — the 100-price level should be gone.
        assert!(book.cancel(OrderId(1)));
        assert_eq!(book.best_bid(), Some(Price(99))); // 99 is now the best
        assert_eq!(book.depth_bid(), 1);

        // Cancel again — already removed, should return false.
        assert!(!book.cancel(OrderId(1)));
    }

    #[test]
    fn cancel_searches_both_sides() {
        let mut book = Book::new();
        // Resting Sell at 100, no bids.
        book.submit(Order {
            id: OrderId(7),
            account: AccountId(1),
            side: Side::Sell,
            qty: Qty(30),
            order_type: OrderType::Limit { price: Price(100) },
        });
        assert!(book.cancel(OrderId(7)));
        assert_eq!(book.best_ask(), None);
    }

    #[test]
    fn cancel_nonexistent_returns_false() {
        let mut book = Book::new();
        book.submit(limit_buy(1, 1, 30, 100));
        assert!(!book.cancel(OrderId(99))); // not in the book
        assert_eq!(book.depth_bid(), 1); // resting order untouched
    }
}
\`\`\`

\`cargo test -p openhl-clob smoke\`. All three should pass. **Then delete the smoke module** — L7 brings the real test suite.

Common errors and fixes:

- **\`error: 'retain' has no method named 'retain' on BTreeMap<...>\`** — typo or wrong version. \`BTreeMap::retain\` is stable since Rust 1.53. Check \`rustc --version\`.
- **\`error: 'position' has no method named 'position'\`** — \`iter().position()\` is on the \`Iterator\` trait, which is in scope by default in \`std\`. If your closure took \`queue.position(|o| ...)\` (without \`iter()\`), it won't compile. Use \`queue.iter().position(...)\`.
- **Cancel returns true but \`best_bid()\` still shows the cancelled order's price** — your \`retain\` closure isn't returning \`!queue.is_empty()\` correctly. Probably returning \`true\` unconditionally. Check the closure body's last expression.
- **\`cancel\` removes the wrong order** — your \`position\` predicate is checking the wrong field. The compare should be \`o.id == order_id\` (matching by OrderId), not \`o.account == order_id\` or similar.

## Design reflection

Three load-bearing decisions encoded here:

1. **\`retain\` for the "remove + cleanup" combo.** Two separate operations done in one closure pass: mutate the queue, decide whether to drop the entry. This is \`retain\`'s exact use case. Alternatives (iterate-then-cleanup, or \`BTreeMap::iter_mut\` plus manual collection of empty keys) would split the invariant across more code. **When a method exists that exactly matches your operation, use it.**

2. **O(n) linear scan is fine for v0.** Real exchanges have thousands or tens of thousands of resting orders. For v0 openhl with hundreds, the scan is microseconds. Adding a \`HashMap<OrderId, (Side, Price)>\` index would make cancel O(1) but also adds: a second data structure to keep in sync with the BTreeMaps, additional memory, additional cache pressure. **Don't optimize what doesn't show up in profiling.** When openhl outgrows v0 scale, add the index; until then, the scan is the right shape.

3. **Cancel returns \`bool\`, not \`Option<RestingOrder>\` or a \`Result<(), CancelError>\`.** Returning the removed order would expose \`RestingOrder\` (intentionally a private type from L3). Returning a \`Result\` would force callers to handle the "not found" case as an error — but cancellation idempotency is a feature, not a bug (calling cancel twice should be safe). \`bool\` cleanly says "I did the work or I didn't" without leaking internals or forcing error-handling. **Pick the smallest return shape that's honest about what happened.**

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout 55a9dff
diff -u ~/code/my-openhl/crates/clob/src/book.rs ./crates/clob/src/book.rs
\`\`\`

After L6, your \`book.rs\` should be **functionally identical** to the reference at \`55a9dff\`. The remaining differences are doc comments / whitespace and the test module at the bottom — L7-L8 will add the 9 unit tests + 3 proptest invariants the reference has.

Return:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: What's the cost of NOT clearing empty levels in \`retain\`?**
Eventually \`best_bid()\` returns a price even though no orders exist at that level. Then a Sell limit at slightly below that "best" gets matched at the phantom price, fills against zero quantity (which \`match_at_level\` would handle weirdly), and the engine's invariants drift. The empty-level cleanup is the invariant \`submit\` already maintains; \`cancel\` must maintain it too.

**Q: Why is the \`if !found &&\` guard inside the closure necessary?**
Without it, \`retain\` would scan every level looking for the order, even after we found and removed it from an earlier level. The match would happen at most once (the order is unique by \`OrderId\`), so the \`found\` flag is more of an optimization than a correctness fix. But: setting \`found = true\` on the first match means subsequent levels skip the \`iter().position()\` call, which is the O(k) work per level. **Optimization through early-out.**

**Q: What if two different orders had the same \`OrderId\`?**
Then \`cancel\` would remove the first one it finds (probably from bids, since they're scanned first). The matching engine assumes \`OrderId\` is unique per book — caller responsibility. The newtype + \`pub u64\` field design in L1 makes this caller's job: they construct the ID and they own its uniqueness.

**Q: Why not use \`position\` on each VecDeque, get a \`(Reverse<Price>, position)\`, then handle removal outside \`retain\`?**
You'd need to borrow the BTreeMap immutably to find the position, then borrow it mutably to remove. Rust's borrow checker would reject that without a \`clone()\` of the position. The \`retain\` approach holds the mutable borrow throughout — simpler.

## Next lesson (L7)

The matching engine compiles. **What it can't do**: prove it works. L7 starts the test module — 9 hand-traced unit tests covering the scenarios you'd expect: empty book matching, FIFO time priority within a price level, market order liquidity exhaustion, partial fills across multiple price levels, cancel + re-submit, no-crossed-book invariant after matches. Each test walks one specific path through the engine; together they're a regression suite for the matching logic you've built so far.`,
                },
              ],
            },
          },
        ],
      },
    },
  });
}
