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
        "Add a price-time-priority matching engine to the consensus substrate from `building-openhl-consensus`. Build the CLOB as a pure state machine, then wire its fills through the bridge into consensus-committed blocks. The second course in the DIY Perp series.",
      difficulty: "EXPERT",
      duration: 365,
      xpReward: 800,
      track: "diy-perp",
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

Concepts you'll grasp in this lesson:

- **Newtype-as-type-safety** — wrapping \`u64\` in \`AccountId\` / \`OrderId\` / \`Price\` / \`Qty\` turns argument-swap bugs into compile errors instead of silent runtime mis-credits.
- **Integer-only money math** — \`Price\` and \`Qty\` are \`u64\`-backed, never \`f64\`; float intermediates would break the engine's exact-integer invariants (e.g. "fills conserve quantity") at the boundaries.
- **Struct-style enum variants for named roles** — \`OrderType::Limit { price }\` reads more clearly than \`Limit(Price)\` at every pattern match site, because the field has a *name*, not just a position.
- **Field-level vs. record-level types as a layering strategy** — atomic types belong in L1 so every later lesson reuses them; record types (\`Order\`, \`Fill\`) layer on top in L2.

Verification:

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

…compiles cleanly.

Specific changes:

You'll have one new crate (\`crates/clob/\`) registered in the workspace, with a single file \`src/types.rs\` containing the **atomic, field-level types** the matching engine uses:

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

Concepts you'll grasp in this lesson:

- **Self-contained messages cross module boundaries cleanly** — \`Fill\` carries both \`maker_order_id\` AND \`maker_account\` even though one could be derived from the other; this decouples Fill consumers (precompiles, payload assembly) from the engine's internal index.
- **Separating "fills" from "remainder" is a type-level decision** — \`FillResult { fills, remaining_qty }\` makes a submit's two distinct outputs explicit, instead of overloading \`Vec<Fill>\` with a phantom remainder entry.
- **Compute, don't cache, for derived totals** — \`total_filled()\` is a method, not a field; caching would force every fill-list mutation to keep a counter in sync, while computing on demand keeps \`FillResult\` a pure data record.
- **\`Copy\` reflects semantics, not convenience** — \`Order\` (5 small fields, ~48 bytes) is \`Copy\`; \`FillResult\` (owns a \`Vec<Fill>\`) is not. \`Copy\` only fits when \`=\` is one bit-blit.

Verification:

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

…still compiles.

Specific changes:

You'll have **3 record types** in \`crates/clob/src/types.rs\`, built from L1's newtypes:

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

Concepts you'll grasp in this lesson:

- **Two \`BTreeMap\`s are the entire matching-engine state** — no order-id index, no best-price cache, no per-side counters. Everything else is derived. Optimizations layer on top later without changing the core model.
- **\`Reverse<Price>\` makes the iterator walk bids highest-first** — by flipping \`Ord::cmp\` at the *key* type, both sides can use \`BTreeMap::iter().next()\` uniformly. One type asymmetry buys symmetric matching code.
- **\`RestingOrder\` trims \`Order\` to make impossible states unrepresentable** — a resting order has no \`side\` (we know it from which map it's in) and no \`order_type\` (Market never rests). Type design as constraint engineering.
- **\`VecDeque\` over \`Vec\` for FIFO queues** — \`Vec::remove(0)\` shifts every element (O(n)); \`VecDeque::pop_front()\` is O(1). Price-time priority requires fast pop-front *and* fast push-back.

Verification:

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

…still compiles.

Specific changes:

You'll have a new file \`crates/clob/src/book.rs\` containing:

- **\`Book\` struct** — two \`BTreeMap\`s (bids + asks), each mapping a price level to a \`VecDeque\` of resting orders.
- **\`RestingOrder\` struct** — what a single order looks like once it's resting on the book (trimmed from \`Order\`).
- **\`new()\` constructor** + 4 read-only accessors (\`best_bid\`, \`best_ask\`, \`depth_bid\`, \`depth_ask\`).

**No matching logic yet** — \`submit\` lands in L4 + L5, \`cancel\` in L6. This lesson is about building the data structure correctly so the matching logic can be a few lines on top of it.

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

Concepts you'll grasp in this lesson:

- **Buy and Sell are structural mirrors, not generic abstractions** — the Buy branch walks asks ascending; Sell walks bids descending. Two near-identical functions read more clearly than one fully-generic helper with boolean-flag puzzles inside.
- **Walk-while-crossing is the matching engine's core loop** — \`while remaining > 0 && best_opposite_price crosses limit { match_at_level; advance/drop level }\`. Once you see this shape, market orders in L5 fall out as "the same loop minus the price check."
- **Empty-queue invariant must be maintained on every mutation** — \`if queue.is_empty() { remove(price) }\` after each match. If an empty queue is left in the map, \`best_bid()\` lies and the no-crossed-book invariant breaks.
- **Return value describes what happened to the call; book state describes what is** — \`FillResult::remaining_qty\` is \`Qty(0)\` for Limit (whatever didn't fill went to rest); to know the rested remainder, query \`best_bid\` / \`depth_bid\` separately. Don't mix the two contracts.
- **\`match_at_level\` as a free function names its scope** — no \`self\`; it operates on data the caller has already extracted (queue + remaining). Function signature is documentation.

Verification:

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

…still compiles.

Specific changes:

Your \`Book\` can now accept **Limit orders** (Buy + Sell) and produce real \`Fill\`s. Market orders are still \`todo!()\` — that's L5.

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

Concepts you'll grasp in this lesson:

- **Market = Limit minus the price check minus the rest step** — same walk-while-crossing loop from L4, but without the \`price <= limit\` guard and without \`rest_unfilled_remainder()\`. The semantic difference is in the *missing* code, which is why parameterizing the two with boolean flags would make both bodies harder to read.
- **Fill price is always the maker's price** — Market orders don't supply a price; they accept what the book offers. "Price discovery" *is* the rule that the spread between best bid and best ask sets the price, not the taker's demand.
- **One return type, two contracts** — \`FillResult::remaining_qty\` means "rested" for Limit (always \`Qty(0)\`) and "discarded" for Market (the actual leftover). The type is identical; the doc on \`FillResult\` names both interpretations.
- **"Nothing happened" is a valid result, not an error** — Market buy against an empty asks book returns \`FillResult { fills: vec![], remaining_qty: order.qty }\`. The caller decides what to do with the leftover; the engine doesn't surface a \`Result\`.
- **Same \`match_at_level\` helper, reused unchanged** — L4's helper handles "maker partially filled" and "maker fully consumed" as one general path; L5 needed no fast paths, no special cases.

Verification:

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

…still compiles, and the \`submit()\` dispatcher no longer panics on Market orders.

Specific changes:

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

Concepts you'll grasp in this lesson:

- **\`BTreeMap::retain\` does "mutate + drop empty entry" in one closure** — the same callback both removes the matching order from a queue *and* returns whether to keep the level. One pass; the empty-level invariant from \`submit\` is maintained automatically.
- **O(n) linear scan is the right v0 choice** — adding \`HashMap<OrderId, (Side, Price)>\` for O(1) cancel adds a second data structure to keep in sync, extra memory, extra cache pressure. Don't optimize what doesn't show up in profiling; add the index when the scan does.
- **\`bool\` return is the smallest honest shape** — \`Option<RestingOrder>\` would leak the private \`RestingOrder\` type from L3; \`Result<(), CancelError>\` would force callers to treat "not found" as an error, but cancellation idempotency (calling cancel twice is safe) is a feature.
- **The empty-level cleanup is what keeps \`best_bid\` honest** — if \`retain\` left a phantom empty queue at price 100, \`best_bid()\` would report 100 even with zero liquidity, and the next sell would match at a phantom price. The cleanup is the same invariant \`submit\` enforces; \`cancel\` must enforce it too.

Verification:

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

…still compiles.

Specific changes:

You'll have one new method on \`Book\`:

- **\`cancel(&mut self, order_id: OrderId) -> bool\`** — searches both bid and ask sides for an order with the given id, removes it if found, drops the price level if cancellation leaves it empty. Returns \`true\` if removed, \`false\` if not found.

About 25 LOC. After L6, the matching engine is **functionally complete**. Submit (Limit + Market) + cancel = the full v0 surface. L7 starts the test suite.

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
          {
            title: "Testing",
            sortOrder: 3,
            lessons: {
              create: [
                {
                  title: "Lesson 7 — 9 hand-traced unit tests",
                  slug: "openhl-clob-unit-tests-en",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 35,
                  xpReward: 70,
                  content: `# Lesson 7 — 9 hand-traced unit tests

## Goal

Concepts you'll grasp in this lesson:

- **Coverage by invariant, not by count** — the 9 tests aren't "9 arbitrary scenarios"; each corresponds to a distinct invariant (empty-book, resting, walks-levels, respects-limit, FIFO time priority, partial-market, cancel-found, cancel-not-found, no-cross). The list of invariants is short and well-defined; that's why 9 is a defensible number.
- **Hand-traced unit tests are the oracle for proptests (L8)** — when a property test fails with a random 25-action sequence, you debug against a hand-traced test that isolates one invariant. Proptests are the amplifier; unit tests are the foundation.
- **Helper functions over builder patterns** — \`limit(...)\` and \`market(...)\` with positional args are the cheapest abstraction that removes repetition without adding indirection. Builder patterns would add ceremony for tests that need ~5 lines each.
- **Source layout encodes priority** — placing \`book_does_not_cross_after_match\` last in source order signals to a maintainer scanning the file: this is the load-bearing safety property. Tests run alphabetically; source order is for humans.
- **\`assert_eq!\` over \`assert!(a == b)\`** — \`assert_eq!\` prints both sides on failure; the actual-value diagnostic is what makes test debugging fast.

Verification:

\`\`\`bash
cargo test -p openhl-clob
\`\`\`

…passes **9 tests**.

Specific changes:

You'll have a new \`#[cfg(test)] mod tests\` block at the bottom of \`book.rs\` containing:

- **2 helper functions** — \`limit(...)\` and \`market(...)\` — that construct \`Order\` structs with sensible defaults so the test bodies don't repeat the 5-field struct literal everywhere.
- **9 hand-traced scenarios** — each tests a specific invariant the matching engine should maintain.

The 9 tests are your **regression safety net**. If you (or a future contributor) introduces a bug in \`submit_limit\`, \`submit_market\`, or \`cancel\`, at least one of these tests will catch it. Together they're the load-bearing proof that the matching logic from L4-L6 actually works.

## Recap

After L6, your matching engine is functionally complete:

\`\`\`rust
// book.rs (~190 lines)
pub struct Book { bids, asks }
impl Book {
    pub fn new() -> Self
    pub fn submit(&mut self, order: Order) -> FillResult
    pub fn cancel(&mut self, order_id: OrderId) -> bool
    pub fn best_bid(&self) -> Option<Price>
    pub fn best_ask(&self) -> Option<Price>
    pub fn depth_bid(&self) -> usize
    pub fn depth_ask(&self) -> usize
}
\`\`\`

\`cargo check -p openhl-clob\` is clean. **But the engine has no proof it's correct.** Every match could be silently wrong; we haven't asserted anything beyond compilation. L7 fixes that.

## Plan

One block to add at the bottom of \`crates/clob/src/book.rs\`, after \`fn match_at_level\` and *outside* \`impl Book\`:

\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;

    fn limit(...) -> Order { ... }
    fn market(...) -> Order { ... }

    #[test] fn empty_book_has_no_best_prices() { ... }
    #[test] fn resting_limit_creates_bid_or_ask() { ... }
    #[test] fn buy_market_takes_best_ask() { ... }
    #[test] fn limit_buy_walks_asks_within_price() { ... }
    #[test] fn price_time_priority_within_level() { ... }
    #[test] fn market_with_insufficient_liquidity_returns_remaining() { ... }
    #[test] fn cancel_removes_resting_order() { ... }
    #[test] fn cancel_unknown_returns_false() { ... }
    #[test] fn book_does_not_cross_after_match() { ... }
}
\`\`\`

That's it. No new types, no new methods on \`Book\`. Just 9 tests + 2 helpers.

The 9 tests are organized in **complexity order**: start with the simplest invariant (empty book has no prices), end with the strongest (book doesn't cross after match — the **safety property** that distinguishes a well-formed orderbook from garbage).

> 🛑 **Predict.** Before scrolling: which of the 9 tests would *fail* if I made the bug \`submit_limit::Buy\` walks asks **descending** (highest first) instead of ascending? Hint: think about the test that specifically asserts "best ask first."

(Answer: \`buy_market_takes_best_ask\`. It asserts \`r.fills[0].price == Price(100)\` and \`r.fills[1].price == Price(105)\` — best-first. A descending walk would produce \`[105, 100]\`. **Hand-traced tests catch directional bugs that randomized tests would also catch but more expensively.**)

## Walk-through

### Step 1: Set up the test module

In \`crates/clob/src/book.rs\`, **outside** the \`impl Book\` block and **after** \`fn match_at_level\`, add:

\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;

    fn limit(id: u64, account: u64, side: Side, price: u64, qty: u64) -> Order {
        Order {
            id: OrderId(id),
            account: AccountId(account),
            side,
            qty: Qty(qty),
            order_type: OrderType::Limit {
                price: Price(price),
            },
        }
    }

    fn market(id: u64, account: u64, side: Side, qty: u64) -> Order {
        Order {
            id: OrderId(id),
            account: AccountId(account),
            side,
            qty: Qty(qty),
            order_type: OrderType::Market,
        }
    }

    // tests follow...
}
\`\`\`

Two helper functions. Without them, every test body would say:

\`\`\`rust
let order = Order {
    id: OrderId(1),
    account: AccountId(100),
    side: Side::Sell,
    qty: Qty(5),
    order_type: OrderType::Limit { price: Price(100) },
};
\`\`\`

…which is 5 lines of boilerplate per order. With \`limit(1, 100, Side::Sell, 100, 5)\`, it's 1 line. The helper takes raw \`u64\`s and wraps them in the appropriate newtypes; that's the only thing it does.

**The argument order matters**: \`(id, account, side, price, qty)\` for \`limit\`, \`(id, account, side, qty)\` for \`market\`. Memorize it once; every test uses the same convention. Putting \`id\` first means tests read in chronological order (\`limit(1, ...)\` is the first order, \`limit(2, ...)\` is the second).

> 🛑 **Anti-fluency.** "I'll just use a builder pattern — \`OrderBuilder::new().id(1).account(100).side(Buy).qty(10).limit_price(100).build()\`." **It's more verbose than the 5-field struct literal, defeating the purpose.** Builders shine when fields are optional or vary widely; here, every order has all 5 fields and they're all required. A 5-arg function with positional arguments is faster to write, faster to read at the call site, and immediately tells the reader what an Order needs.

### Step 2: Test 1 — \`empty_book_has_no_best_prices\`

Inside the \`tests\` module, after the helpers:

\`\`\`rust
    #[test]
    fn empty_book_has_no_best_prices() {
        let book = Book::new();
        assert_eq!(book.best_bid(), None);
        assert_eq!(book.best_ask(), None);
        assert_eq!(book.depth_bid(), 0);
        assert_eq!(book.depth_ask(), 0);
    }
\`\`\`

The simplest possible test: a freshly-constructed \`Book\` has no prices and zero depth. **If this fails, something is broken in \`Book::new()\` or in the accessor logic.** Every later test depends on this — if \`new()\` returns garbage state, nothing else makes sense.

\`assert_eq!(book.best_bid(), None)\` is the kind of test that looks trivial but earns its keep. The accessors could have returned \`Some(Price(0))\` (a default-construction bug). \`None\` is the explicit "no liquidity exists" signal.

### Step 3: Test 2 — \`resting_limit_creates_bid_or_ask\`

\`\`\`rust
    #[test]
    fn resting_limit_creates_bid_or_ask() {
        let mut book = Book::new();
        let r = book.submit(limit(1, 100, Side::Buy, 90, 10));
        assert!(r.fills.is_empty());
        assert_eq!(book.best_bid(), Some(Price(90)));
        assert_eq!(book.best_ask(), None);

        let r = book.submit(limit(2, 101, Side::Sell, 100, 5));
        assert!(r.fills.is_empty());
        assert_eq!(book.best_ask(), Some(Price(100)));
    }
\`\`\`

A Buy Limit @ 90 enters an empty book → no fills, rests as a bid. A Sell Limit @ 100 enters → no fills (bid at 90, ask wants 100, no cross), rests as an ask.

The two assertions per submit are key:
- **\`r.fills.is_empty()\`** — nothing matched, because there was nothing on the other side.
- **\`book.best_bid() == Some(Price(90))\`** — the resting order is observable via the accessor.

This is the "rest-the-remainder" path from L4 in action.

### Step 4: Test 3 — \`buy_market_takes_best_ask\`

\`\`\`rust
    #[test]
    fn buy_market_takes_best_ask() {
        let mut book = Book::new();
        book.submit(limit(1, 100, Side::Sell, 100, 5));
        book.submit(limit(2, 101, Side::Sell, 105, 5));

        let r = book.submit(market(99, 200, Side::Buy, 8));
        assert_eq!(r.fills.len(), 2);
        assert_eq!(r.fills[0].price, Price(100)); // best ask first
        assert_eq!(r.fills[0].qty, Qty(5));
        assert_eq!(r.fills[1].price, Price(105));
        assert_eq!(r.fills[1].qty, Qty(3));
        assert_eq!(r.remaining_qty, Qty(0));
        assert_eq!(book.depth_ask(), 1); // ask @ 105 has 2 left
    }
\`\`\`

Setup: two resting asks at 100 (5 units) and 105 (5 units). A Market buy for 8 units arrives. Expected matching:
- Take 5 from price 100 (cheapest), leaving 3 units to fill.
- Take 3 from price 105 (next cheapest).
- Total filled: 8. Remaining: 0.

Asserts encode this: 2 fills in best-first order, \`remaining_qty == 0\` (Market fully filled), and ask @ 105 still has 2 units depth.

**This test catches** directional bugs in the asks walk (testing for "best first") and also the "drop empty level" invariant (the 100-priced level should be gone after being fully consumed, but the 105 level should remain with reduced depth).

### Step 5: Test 4 — \`limit_buy_walks_asks_within_price\`

\`\`\`rust
    #[test]
    fn limit_buy_walks_asks_within_price() {
        let mut book = Book::new();
        book.submit(limit(1, 100, Side::Sell, 100, 5));
        book.submit(limit(2, 101, Side::Sell, 105, 5));

        // Buy limit @ 103 — should only fill the 100-priced level.
        let r = book.submit(limit(99, 200, Side::Buy, 103, 10));
        assert_eq!(r.fills.len(), 1);
        assert_eq!(r.fills[0].price, Price(100));
        assert_eq!(r.fills[0].qty, Qty(5));
        // Remainder rests as a bid @ 103.
        assert_eq!(book.best_bid(), Some(Price(103)));
        assert_eq!(book.depth_bid(), 1);
    }
\`\`\`

Same starting book as test 3 (asks at 100 and 105). But this time the incoming order is a **Limit Buy @ 103** for 10 units.

Expected:
- The 100-priced ask is at-or-better (100 ≤ 103) — match 5 units.
- The 105-priced ask is **not** at-or-better (105 > 103) — stop matching.
- Remaining 5 units rest as a new bid at 103.

The difference from test 3 is the **limit price check** stops the walk early. Test 3's Market buy kept walking past 100 (Market takes any price); test 4's Limit buy stops at 103.

Together these two tests prove L4's price-check logic works in both directions: Market (no check, walk everything) and Limit (check, stop at limit).

### Step 6: Test 5 — \`price_time_priority_within_level\`

\`\`\`rust
    #[test]
    fn price_time_priority_within_level() {
        let mut book = Book::new();
        book.submit(limit(1, 100, Side::Sell, 100, 5)); // first
        book.submit(limit(2, 101, Side::Sell, 100, 5)); // same price, later

        let r = book.submit(market(99, 200, Side::Buy, 7));
        assert_eq!(r.fills.len(), 2);
        assert_eq!(r.fills[0].maker_order_id, OrderId(1)); // first in, first out
        assert_eq!(r.fills[0].qty, Qty(5));
        assert_eq!(r.fills[1].maker_order_id, OrderId(2));
        assert_eq!(r.fills[1].qty, Qty(2));
    }
\`\`\`

Two resting Sells at the **same price** (100), but submitted in order: order 1, then order 2. A Market buy for 7 units arrives.

Expected:
- Order 1 (placed first) fills first — 5 units.
- Order 2 (placed second) fills next — 2 units.

This is the **time priority** half of "price-time priority." Within a price level, orders are FIFO — first in is first out. The \`VecDeque<RestingOrder>\` we chose in L3 implements this naturally via \`push_back\` (new orders go to the back) + \`pop_front\` (matched orders come from the front).

**This test would fail** if we accidentally used \`Vec<RestingOrder>\` and did \`Vec::remove(0)\` (still correct, but shifts the queue — O(n) per match), or if we used \`VecDeque::push_front\` instead of \`push_back\` (newest-first, which would be price-anti-time-priority).

### Step 7: Tests 6, 7, 8 — Market with leftover, cancel, cancel-unknown

\`\`\`rust
    #[test]
    fn market_with_insufficient_liquidity_returns_remaining() {
        let mut book = Book::new();
        book.submit(limit(1, 100, Side::Sell, 100, 3));

        let r = book.submit(market(99, 200, Side::Buy, 10));
        assert_eq!(r.fills.len(), 1);
        assert_eq!(r.fills[0].qty, Qty(3));
        assert_eq!(r.remaining_qty, Qty(7)); // market discards remainder
        assert_eq!(book.depth_ask(), 0);
    }

    #[test]
    fn cancel_removes_resting_order() {
        let mut book = Book::new();
        book.submit(limit(1, 100, Side::Buy, 90, 10));
        assert_eq!(book.depth_bid(), 1);

        assert!(book.cancel(OrderId(1)));
        assert_eq!(book.depth_bid(), 0);
        assert_eq!(book.best_bid(), None);
    }

    #[test]
    fn cancel_unknown_returns_false() {
        let mut book = Book::new();
        assert!(!book.cancel(OrderId(999)));
    }
\`\`\`

Three tests in one step because each is short:

- **Test 6 (\`market_with_insufficient_liquidity_returns_remaining\`)**: a single ask of 3 units, a Market buy for 10 — exercise L5's "Market discards remainder" semantic. \`remaining_qty == 7\` (the unfilled portion). Book is empty afterward.
- **Test 7 (\`cancel_removes_resting_order\`)**: a resting bid, then cancel it. Verify \`cancel\` returns \`true\`, depth drops to 0, \`best_bid()\` returns \`None\` (the empty-level cleanup from L6).
- **Test 8 (\`cancel_unknown_returns_false\`)**: cancel an OrderId that was never submitted. Returns \`false\`, book is unchanged (the empty book has nothing in it anyway).

The pairing of tests 7 + 8 catches a class of bugs in \`cancel\`: if \`cancel\` returned \`true\` indiscriminately, test 8 would catch it; if it returned \`false\` for a valid cancel, test 7 would catch it. **Tests that check the success path + failure path together** are more robust than either alone.

### Step 8: Test 9 — \`book_does_not_cross_after_match\`

The most important test, last:

\`\`\`rust
    #[test]
    fn book_does_not_cross_after_match() {
        let mut book = Book::new();
        book.submit(limit(1, 100, Side::Sell, 100, 5));
        book.submit(limit(2, 101, Side::Buy, 95, 5));
        // Spread: bid 95, ask 100. No cross.
        let bid = book.best_bid().unwrap();
        let ask = book.best_ask().unwrap();
        assert!(bid < ask);

        // Now a buy @ 100 — fully fills, no resting.
        book.submit(limit(3, 102, Side::Buy, 100, 5));
        // Best bid is still 95 (from order 2). Ask is gone.
        assert_eq!(book.best_bid(), Some(Price(95)));
        assert_eq!(book.best_ask(), None);
    }
\`\`\`

The **no-crossed-book invariant**: at all times, \`best_bid < best_ask\` (or one side is empty). A crossed book — \`best_bid >= best_ask\` — would mean there's a buy and a sell that should have matched but didn't. **It's a soundness violation**: the matching engine has somehow let two orders coexist on the book that should have collided.

This test setup:
1. Sell @ 100, Buy @ 95 → spread = (95, 100), no cross. Assert \`bid < ask\`.
2. Incoming Buy @ 100 → matches the 100-priced ask exactly (5 units → 5 units), no leftover to rest.
3. Final state: ask is gone (consumed), bid is still 95 (order 2 was untouched).

The final assertions check:
- \`best_bid() == Some(Price(95))\` — order 2 is still resting.
- \`best_ask() == None\` — order 1's ask was fully consumed.

**Why this is the strongest test**: the no-crossed-book invariant is what makes an orderbook *correct*. A book that crosses is showing you trades that should have happened but didn't — a fundamental matching engine failure. If this test passes, you have evidence (not proof — that's L8's proptest) that the engine maintains the safety property.

> 🛑 **Anti-fluency.** "Why not write 100 unit tests instead of 9? More coverage is better." **More tests aren't more coverage if they exercise the same paths.** These 9 tests were chosen to exercise *distinct invariants*: empty-book, resting, market-walks-levels, limit-respects-price, time-priority, partial-market, cancel-found, cancel-not-found, no-cross. Each one tests a property the other 8 don't. **Writing 100 tests that all exercise "buy crosses ask" gives you 99 redundant tests.**

## Test

\`\`\`bash
cargo test -p openhl-clob
\`\`\`

Expected:

\`\`\`
running 9 tests
test tests::book_does_not_cross_after_match ... ok
test tests::buy_market_takes_best_ask ... ok
test tests::cancel_removes_resting_order ... ok
test tests::cancel_unknown_returns_false ... ok
test tests::empty_book_has_no_best_prices ... ok
test tests::limit_buy_walks_asks_within_price ... ok
test tests::market_with_insufficient_liquidity_returns_remaining ... ok
test tests::price_time_priority_within_level ... ok
test tests::resting_limit_creates_bid_or_ask ... ok

test result: ok. 9 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

Tests run in alphabetical order (Rust's default). All 9 pass.

Common errors and fixes:

- **\`error: cannot find function 'limit' in this scope\`** inside tests — your \`fn limit(...)\` is outside the \`mod tests\` block. Move it inside, after the \`use super::*;\` line.
- **Test fails with \`assertion failed: r.fills[0].price == Price(100)\`** — you got \`Price(105)\` instead. The bug is in \`submit_market\` or \`submit_limit\` — you're walking the wrong direction. Check the \`keys().next()\` call: for asks, you want the lowest first; for bids (with \`Reverse<Price>\`), you want the highest first (which is what \`keys().next()\` gives you when the key is \`Reverse<Price>\`).
- **\`assertion failed: r.fills[0].maker_order_id == OrderId(1)\`** in \`price_time_priority_within_level\` — you got \`OrderId(2)\`, meaning the LATER-submitted order matched first. Your queue is acting LIFO. Check \`submit_limit\`'s rest path: it should \`push_back\` (FIFO), not \`push_front\` (LIFO).
- **\`assertion failed: book.depth_ask() == 0\`** in \`market_with_insufficient_liquidity_returns_remaining\` — the ask wasn't cleaned up. Your \`submit_market\`'s loop is missing the \`if queue.is_empty() { self.asks.remove(&best_price) }\` step (or its equivalent for bids in the Sell case).

## Design reflection

Three load-bearing decisions encoded here:

1. **Helper functions over builder patterns or struct literals.** \`limit(...)\` and \`market(...)\` are 5- and 4-argument functions with positional arguments. They're fast to write, fast to read, and require zero documentation (the function name + argument positions are self-explanatory). **The right amount of abstraction is "just enough to remove repetition."**

2. **9 tests is a finite, defensible set.** Each test corresponds to a specific invariant: empty-book, resting, walks-levels, respects-limit, FIFO, partial-market, cancel-found, cancel-not-found, no-cross. We didn't write 100 tests. **The list of invariants is short and well-defined; coverage should be by invariant, not by count.**

3. **\`book_does_not_cross_after_match\` is positioned last.** Tests run in alphabetical order, so this specific test's placement in *source order* doesn't affect run order. But for *reading* order (a maintainer scanning the file top-to-bottom), the most important test is the most prominent. **Source layout encodes priority signals about what matters most.**

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout 55a9dff
diff -u ~/code/my-openhl/crates/clob/src/book.rs ./crates/clob/src/book.rs
\`\`\`

After L7, your \`book.rs\` has the test module (9 tests + 2 helpers) at the bottom. The reference at \`55a9dff\` is identical except for doc-comment wording. The reference also contains a \`mod prop_tests\` block — that's L8's scope.

Return:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: Why are the helpers \`limit\` and \`market\` (not \`pub limit\` and \`pub market\`)?**
Because they're private to the \`mod tests\` block. Other modules don't need to construct test Orders. Keeping them private is the right encapsulation: tests can use them freely, but the test helpers don't leak into the public API of \`openhl-clob\`.

**Q: Should I parametrize the tests, e.g., use a property test "for any incoming order, the book invariants hold"?**
L8 does exactly that — 3 proptest invariants exercising 768 random scenarios. But proptests rely on hand-traced tests as their oracle: when a proptest fails, you want a small hand-traced test you can isolate to. **Hand-traced unit tests are the foundation; proptests are the amplifier.**

**Q: What about tests for sell-side limit orders?**
Good question. The 9 tests focus on buy-side scenarios because they're more intuitive to trace ("walk asks lowest-first" is more visualisable than "walk bids highest-first"). Sell-side tests aren't necessary for correctness *if* \`submit_limit::Sell\` is the structural mirror of \`submit_limit::Buy\` (which L4 established). If you're paranoid, add a few sell-side tests — they'd mirror tests 3, 4, 5 from this set.

**Q: Why \`assert_eq!\` instead of \`assert!\`?**
\`assert_eq!(a, b)\` prints both values on failure, while \`assert!(a == b)\` prints only "left == right" with no values. For test debugging, knowing the actual value the engine produced is critical. \`assert_eq!\` is strictly better when the comparison is equality.

## Next lesson (L8)

You have 9 hand-traced tests. **They cover specific scenarios you thought of.** L8 adds **3 proptest invariants** — properties that hold for *any* sequence of submit+cancel actions:

- **\`qty_conservation\`**: total quantity entering the book equals total filled + total resting.
- **\`no_crossed_book\`**: \`best_bid < best_ask\` always holds (the safety property test 9 hand-traced, now random-tested).
- **\`determinism\`**: same action sequence produces the same fills + same book state.

256 random cases × 3 invariants = 768 random scenarios. If any one of them violates an invariant, proptest **automatically shrinks** the failing sequence to a minimal counterexample. That's the load-bearing benefit of properties over examples.`,
                },
                {
                  title: "Lesson 8 — 3 proptest invariants: 768 random scenarios",
                  slug: "openhl-clob-proptests-en",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 40,
                  xpReward: 80,
                  content: `# Lesson 8 — 3 proptest invariants: 768 random scenarios

## Goal

Concepts you'll grasp in this lesson:

- **Determinism is the load-bearing property for consensus chains** — a correct-but-non-deterministic matching engine breaks consensus (validators replay the same actions, see different fills, fail to agree). A deterministic-but-incorrect engine is repairable; a non-deterministic one is not. The \`determinism\` invariant protects the chain's safety.
- **Property tests find bugs in scenarios you didn't think of** — 9 hand-traced tests cover what you anticipated. 256 cases × 3 properties = 768 random sequences cover the long tail (e.g. "submit 17 limits, then market against an empty side"). Shrinking automatically reduces a failing 25-action sequence to the minimal counterexample.
- **Conservation, safety, replayability as the three orthogonal invariants** — \`qty_conservation\` (no quantity invented or lost), \`no_crossed_book\` (best_bid < best_ask always), \`determinism\` (same input → same output). These are the universal CLOB invariants any matching engine must satisfy.
- **\`proptest\` belongs in \`[dev-dependencies]\`, not \`[dependencies]\`** — property tests run during \`cargo test\`, never in production. Putting it in \`[dependencies]\` would force every \`openhl-clob\` consumer to compile proptest.
- **The \`Action\` enum is a simplified intermediate for generators** — proptest combinators work most easily with primitive types; the strategies emit raw \`u64\`s, and the test body wraps them in newtypes before calling \`submit\`. Newtype discipline holds at the API boundary, not inside the generator.

Verification:

\`\`\`bash
cargo test -p openhl-clob
\`\`\`

…passes **12 tests** (9 unit + 3 proptest invariants), with each proptest running **256 cases** each = **768 random scenarios**.

Specific changes:

- **One new dev-dep** — \`proptest = { workspace = true }\` in \`crates/clob/Cargo.toml\`.
- **A new \`#[cfg(test)] mod prop_tests\` block** at the bottom of \`book.rs\`, containing:
  - \`Action\` enum — a simplified action representation for property generators.
  - 3 generator strategies — \`arb_side\`, \`arb_action\`, \`arb_actions\` — that produce random valid action sequences.
  - 3 \`proptest!\` blocks — \`qty_conservation\`, \`no_crossed_book\`, \`determinism\`.

After L8, the matching engine has **property-level proof** that its invariants hold across many random orderings — not just the 9 hand-traced scenarios from L7.

## Recap

After L7:

- 9 hand-traced unit tests pass.
- Each tests a specific invariant on a specific scenario.

**What L7 doesn't test**: random sequences. If a bug exists that only triggers when (e.g.) you submit 17 limits, cancel 3 of them, and then submit a Market, L7's 9 tests will likely miss it. You'd need to either think of that specific scenario yourself (hard — bugs hide in places you don't think to test) or test *many* scenarios automatically. L8 does the latter.

## Plan

Three things:

1. **Add \`proptest\` as a dev-dependency** to \`crates/clob/Cargo.toml\`. \`proptest\` is already a workspace dep (used by \`consensus\` for proposer-election tests in the existing rethlab L1 Architect tier); we just need to declare we use it.
2. **Add a new \`mod prop_tests\` block** below the existing \`mod tests\` in \`book.rs\`. The new module contains:
   - \`Action\` enum (subset of operations the property tests will exercise — for now, just SubmitLimit + SubmitMarket; cancel will arrive in a follow-up).
   - Generator strategies for random \`Action\` sequences.
   - 3 \`proptest!\` blocks — one per invariant.
3. **Run \`cargo test -p openhl-clob\`** — 12 tests pass (9 unit + 3 props).

The 3 invariants:

- **\`qty_conservation\`**: total quantity entering the book equals total filled + total resting (the "money math is conserved" property).
- **\`no_crossed_book\`**: \`best_bid < best_ask\` always holds — the safety property test 9 hand-traced, now random-tested.
- **\`determinism\`**: the same action sequence produces the same fills + same book state, every time. **This is the replayability property the chain's safety relies on.**

If proptest finds a counterexample for any of them, it **automatically shrinks** the failing input to the smallest sequence that still fails. That's the load-bearing benefit of properties over examples.

> 🛑 **Predict.** Before scrolling: imagine a bug where \`submit_limit::Buy\` sometimes (e.g., 1% of the time) walks the asks in *random* order instead of best-first. Which of the 3 invariants would catch it fastest? Which would catch it most informatively?

(Answer: \`qty_conservation\` would catch it indirectly — over enough cases, the wrong walk order produces wrong totals when the matched price differs from what the hand math expects. \`no_crossed_book\` would catch it directly: a buy that doesn't take the cheapest ask first leaves a cheaper ask on the book, and the next bid that's above that ask creates a cross. \`determinism\` would catch it on *every* run because each run picks a different "random" walk order, so two runs of the same input produce different fills. **\`determinism\` is the load-bearing property** for consensus chains — without it, validators won't agree.)

## Walk-through

### Step 1: Add \`proptest\` to \`crates/clob/Cargo.toml\`

Open \`crates/clob/Cargo.toml\`. The current state is:

\`\`\`toml
[package]
name         = "openhl-clob"
# ... shared package fields ...

[dependencies]

[lints]
workspace = true
\`\`\`

Add a \`[dev-dependencies]\` section:

\`\`\`toml
[package]
name         = "openhl-clob"
# ... shared package fields ...

[dependencies]

[dev-dependencies]
proptest = { workspace = true }

[lints]
workspace = true
\`\`\`

\`proptest\` is already declared in the workspace \`Cargo.toml\` (you don't need to add it there — it's been a workspace dep since L1 Architect's first courses). The \`[dev-dependencies]\` block makes it available only when building tests, not when building production code.

> 🛑 **Anti-fluency.** "Why not put \`proptest\` in \`[dependencies]\` so I can use it in non-test code too?" **Because then \`openhl-clob\` carries \`proptest\` as a runtime dependency for every consumer.** Smart contracts, validators, indexers — none of them need property test infrastructure to *use* the matching engine. \`[dev-dependencies]\` is the discipline: testing infrastructure lives only where it's needed.

### Step 2: Set up \`mod prop_tests\` with the \`Action\` enum

In \`crates/clob/src/book.rs\`, **after** the existing \`mod tests { ... }\` block (still at module scope), add:

\`\`\`rust
#[cfg(test)]
mod prop_tests {
    use super::*;
    use proptest::prelude::*;

    /// A simplified action enum for property-based testing.
    #[derive(Clone, Debug)]
    enum Action {
        SubmitLimit {
            id: u64,
            account: u64,
            side: Side,
            price: u64,
            qty: u64,
        },
        SubmitMarket {
            id: u64,
            account: u64,
            side: Side,
            qty: u64,
        },
    }
\`\`\`

The \`Action\` enum is **a simplified representation of what proptest will randomly generate**. Each variant carries the raw \`u64\`s that a real call to \`Book::submit\` would need (wrapped in newtypes later). Two variants for now — Limit and Market submits. Cancel actions aren't here yet; we add them in a follow-up stage of openhl.

**Why model actions as an enum?** Because property tests need to generate *sequences* of actions, and each action can be one of N kinds. The enum captures that variability. proptest's strategy combinators (\`prop_oneof!\`, \`prop::collection::vec\`, etc.) work well with enums.

### Step 3: Write the strategies

Continue inside \`mod prop_tests\`:

\`\`\`rust
    fn arb_side() -> impl Strategy<Value = Side> {
        prop_oneof![Just(Side::Buy), Just(Side::Sell)]
    }

    fn arb_action(id: u64) -> impl Strategy<Value = Action> {
        let limit_action = (1u64..=200, 1u64..=20, arb_side(), 50u64..=150)
            .prop_map(move |(account, qty, side, price)| Action::SubmitLimit {
                id,
                account,
                side,
                price,
                qty,
            });
        let market_action = (1u64..=200, 1u64..=20, arb_side()).prop_map(
            move |(account, qty, side)| Action::SubmitMarket {
                id,
                account,
                side,
                qty,
            },
        );
        prop_oneof![3 => limit_action, 1 => market_action]
    }

    fn arb_actions() -> impl Strategy<Value = Vec<Action>> {
        prop::collection::vec(0u64..1000, 1..30)
            .prop_flat_map(|ids| {
                ids.into_iter()
                    .enumerate()
                    .map(|(i, _)| arb_action(i as u64 + 1))
                    .collect::<Vec<_>>()
            })
    }
\`\`\`

Three strategies, building up:

- **\`arb_side()\`** — uniformly picks Buy or Sell. \`prop_oneof![Just(...), Just(...)]\` is proptest's "one of these literals" combinator.
- **\`arb_action(id)\`** — generates a random \`Action\` with a fixed \`id\`. The Limit branch generates \`(account, qty, side, price)\` in ranges; the Market branch generates \`(account, qty, side)\`. Weights: \`3 => limit_action, 1 => market_action\` — Limit actions happen 3× as often as Market, reflecting realistic order-book usage.
- **\`arb_actions()\`** — generates a random \`Vec<Action>\` of length 1..30. The \`.prop_flat_map\` pattern is a bit unusual: it first generates a vec of u64s just to **decide the length**, then maps each position to an \`arb_action(i+1)\` so order IDs increment. The trick is that \`arb_actions\` produces sequences with strictly-increasing order IDs (avoiding collisions in the book).

**Why use ranges (\`1..=200\` for account, \`50..=150\` for price)?** To bias proptest toward generating *plausible* scenarios. With \`0..=u64::MAX\` ranges, proptest would mostly generate extreme outliers (account_id = 18_446_744_073_709_551_614). Realistic ranges produce scenarios that look like real trading: accounts 1-200, prices 50-150, quantities 1-20. The matching engine's bugs are most likely to hide in normal-looking sequences.

> 🛑 **Anti-fluency.** "Wider ranges = more coverage = better." **Wider ranges = more useless tests.** A 99.99% chance of generating an order with \`qty = u64::MAX - 1\` doesn't exercise normal matching logic; it exercises overflow boundary cases. Both are interesting, but you want the *easy bugs found cheap first*. Tightening the ranges to plausible values means proptest spends its budget on the matching paths that real production traffic exercises.

### Step 4: The first invariant — \`qty_conservation\`

Append below the strategies:

\`\`\`rust
    proptest! {
        #![proptest_config(ProptestConfig {
            cases: 256,
            ..ProptestConfig::default()
        })]

        /// Quantity is conserved: every fill_qty came from a resting maker;
        /// total qty in/out balances.
        #[test]
        fn qty_conservation(actions in arb_actions()) {
            let mut book = Book::new();
            let mut total_in = 0u64;
            let mut total_filled = 0u64;
            let mut total_market_unfilled = 0u64;

            for action in actions {
                match action {
                    Action::SubmitLimit { id, account, side, price, qty } => {
                        total_in += qty;
                        let r = book.submit(Order {
                            id: OrderId(id),
                            account: AccountId(account),
                            side,
                            qty: Qty(qty),
                            order_type: OrderType::Limit { price: Price(price) },
                        });
                        total_filled += r.total_filled().0;
                    }
                    Action::SubmitMarket { id, account, side, qty } => {
                        total_in += qty;
                        let r = book.submit(Order {
                            id: OrderId(id),
                            account: AccountId(account),
                            side,
                            qty: Qty(qty),
                            order_type: OrderType::Market,
                        });
                        total_filled += r.total_filled().0;
                        total_market_unfilled += r.remaining_qty.0;
                    }
                }
            }

            // Resting quantity = total_in - 2*total_filled - total_market_unfilled.
            // (Each fill consumes one unit from a maker AND one unit from a taker,
            // so total_filled counts qty, but the qty appeared in total_in twice
            // — once when the maker was submitted, once when the taker arrived.)
            let resting: u64 = book.bids.values()
                .flat_map(|q| q.iter())
                .chain(book.asks.values().flat_map(|q| q.iter()))
                .map(|o| o.qty.0)
                .sum();
            prop_assert_eq!(total_in, 2 * total_filled + total_market_unfilled + resting);
        }
\`\`\`

This is the "quantity is conserved" invariant. The body has three counters:

- **\`total_in\`**: sum of all \`qty\` values from submitted orders.
- **\`total_filled\`**: sum of \`fill_qty\` across all \`Fill\`s produced.
- **\`total_market_unfilled\`**: sum of \`remaining_qty\` from Market orders (the leftover discarded).

The invariant: \`total_in = 2 * total_filled + total_market_unfilled + resting_qty\`.

Why \`2 *\`? **Because a fill consumes 1 unit from the maker AND 1 unit from the taker, so 1 unit of fill_qty appears in \`total_in\` twice** — once when the maker was originally submitted, once when the taker arrived. The math:

| Action | \`total_in\` | What's left at the end |
| - | - | - |
| Submit Limit 10 units that fully rest | +10 | 10 units resting |
| Submit Market 10 units, no liquidity | +10 | 10 units discarded (no fill) |
| Submit Limit 10 units that match a 5-unit ask | +10 | 5 units filled (one from each), 5 units left over to rest |

If 5 units fill, that means: maker offered 5 (already in \`total_in\`), taker took 5 (also in \`total_in\`). The 5 filled units appear in \`total_in\` as 10 — once from each side. **That's why \`2 * total_filled\`.**

**The \`#![proptest_config(ProptestConfig { cases: 256, .. })]\` line at the top** of the \`proptest!\` block sets each test to run 256 times. With 3 invariants × 256 cases = 768 random scenarios.

**The \`prop_assert_eq!\` (not \`assert_eq!\`) is important** — proptest needs to distinguish "test failed" from "test panicked due to a system error." \`prop_assert_eq!\` reports the failure to proptest's shrinking machinery, which then tries to find a minimal counterexample.

> 🛑 **Anti-fluency.** "\`total_in = 2 * total_filled + ...\` looks off — why double-count?" **Because in a marketplace, a fill *involves two units* — one buyer's intent and one seller's intent.** When maker offers 5 and taker takes 5, the engine has seen 10 units of "demand for matching": 5 from each side. The two collapsed into a Fill of size 5, but they were 10 individual taker-or-maker-units when they entered. **The invariant counts *individual taker/maker intents*, not unique units.**

### Step 5: The second invariant — \`no_crossed_book\`

Below the first proptest, still inside the same \`proptest! { ... }\` block:

\`\`\`rust
        /// Book invariant: best bid is strictly less than best ask. The book
        /// should never be crossed after submit() completes.
        #[test]
        fn no_crossed_book(actions in arb_actions()) {
            let mut book = Book::new();
            for action in actions {
                match action {
                    Action::SubmitLimit { id, account, side, price, qty } => {
                        book.submit(Order {
                            id: OrderId(id),
                            account: AccountId(account),
                            side,
                            qty: Qty(qty),
                            order_type: OrderType::Limit { price: Price(price) },
                        });
                    }
                    Action::SubmitMarket { id, account, side, qty } => {
                        book.submit(Order {
                            id: OrderId(id),
                            account: AccountId(account),
                            side,
                            qty: Qty(qty),
                            order_type: OrderType::Market,
                        });
                    }
                }
                if let (Some(b), Some(a)) = (book.best_bid(), book.best_ask()) {
                    prop_assert!(b < a, "book crossed: bid={} ask={}", b.0, a.0);
                }
            }
        }
\`\`\`

The body:

1. **For each action**, submit the order.
2. **After each submission**, check that \`book.best_bid() < book.best_ask()\` (if both exist).
3. **If at any point \`best_bid >= best_ask\`**, the test fails — the book is crossed.

This is the **same invariant as L7's \`book_does_not_cross_after_match\`**, but tested against random sequences. L7 proves the invariant holds on **one** scenario; L8 proves it holds on **256 randomized** scenarios.

The \`prop_assert!(b < a, "...")\` macro includes a format string — when proptest fails, the error message shows the actual bid/ask values that crossed. This is more informative than the plain \`assert!(b < a)\`.

> 🛑 **Anti-fluency.** "What if the property test finds a failure that the hand-traced test missed?" **That's exactly the point.** Hand-traced tests verify specific scenarios; proptests verify the general invariant. If a proptest finds a bug, the shrinking phase produces a minimal failing case — which you then *add to the hand-traced suite as a permanent regression test*. **Proptests find bugs; hand-traced tests prevent them from coming back.**

### Step 6: The third invariant — \`determinism\`

The most important one:

\`\`\`rust
        /// Determinism: applying the same action sequence produces the same
        /// book + fill history every time. (The "replayability" property
        /// from the architecture doc — required for consensus determinism.)
        #[test]
        fn determinism(actions in arb_actions()) {
            let run = |actions: &[Action]| {
                let mut book = Book::new();
                let mut all_fills: Vec<Fill> = Vec::new();
                for action in actions {
                    let order = match action {
                        Action::SubmitLimit { id, account, side, price, qty } => Order {
                            id: OrderId(*id),
                            account: AccountId(*account),
                            side: *side,
                            qty: Qty(*qty),
                            order_type: OrderType::Limit { price: Price(*price) },
                        },
                        Action::SubmitMarket { id, account, side, qty } => Order {
                            id: OrderId(*id),
                            account: AccountId(*account),
                            side: *side,
                            qty: Qty(*qty),
                            order_type: OrderType::Market,
                        },
                    };
                    all_fills.extend(book.submit(order).fills);
                }
                (book.best_bid(), book.best_ask(), book.depth_bid(), book.depth_ask(), all_fills)
            };
            prop_assert_eq!(run(&actions), run(&actions));
        }
    }
}
\`\`\`

This invariant defines a helper closure \`run\` that applies a sequence of actions to a fresh \`Book\` and returns a 5-tuple summarizing the end state: \`(best_bid, best_ask, depth_bid, depth_ask, all_fills_in_order)\`.

Then: \`prop_assert_eq!(run(&actions), run(&actions))\`.

**Two runs of the same input must produce the same output.** If the matching engine has any non-determinism — randomness, HashMap iteration order, threading races — this test will catch it.

**Why this is the most important property**: a consensus chain relies on every validator computing the same fills from the same inputs. If one validator's matching engine produces different fills than another's, validators can't agree on the block, and the chain forks. **Determinism is the load-bearing property** — \`no_crossed_book\` is about correctness, but determinism is about *agreement*. A correct-but-nondeterministic engine breaks consensus; a deterministic-but-incorrect engine is at least repairable.

**The \`Action::SubmitLimit { id, account, side, price, qty }\` destructuring uses \`*id\`, \`*account\`, etc.** because \`actions\` is borrowed as \`&[Action]\`, so each field is a borrowed \`&u64\`. The \`*\` dereferences to get the value.

> 🛑 **Anti-fluency.** "Determinism seems trivially true — it's just function application." **It looks trivial, but small mistakes can break it.** Sources of nondeterminism that *would* fail this test:
> - Using \`HashMap\` instead of \`BTreeMap\` for \`bids\`/\`asks\` (HashMap iteration is randomized).
> - Adding a \`std::time::Instant::now()\` call inside \`submit\` for telemetry.
> - Spawning a \`tokio::task\` to process the order async without sync barriers.
> - Storing a \`f64\` field and depending on its bits.
>
> Each of these would compile, pass \`no_crossed_book\`, and only fail when a future contributor introduces them — caught here by \`determinism\`. **This is the test that protects you from yourself in 6 months.**

## Test

\`\`\`bash
cargo test -p openhl-clob
\`\`\`

Expected (12 tests):

\`\`\`
running 12 tests
test prop_tests::determinism ... ok
test prop_tests::no_crossed_book ... ok
test prop_tests::qty_conservation ... ok
test tests::book_does_not_cross_after_match ... ok
test tests::buy_market_takes_best_ask ... ok
test tests::cancel_removes_resting_order ... ok
test tests::cancel_unknown_returns_false ... ok
test tests::empty_book_has_no_best_prices ... ok
test tests::limit_buy_walks_asks_within_price ... ok
test tests::market_with_insufficient_liquidity_returns_remaining ... ok
test tests::price_time_priority_within_level ... ok
test tests::resting_limit_creates_bid_or_ask ... ok

test result: ok. 12 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

Total runtime: **a few seconds**. Proptest runs 256 cases per test, each case is a small in-memory matching simulation, so the total cost is well under 10 seconds.

If any prop test fails, you'll see:

\`\`\`
proptest: Saving this and future failures in /Users/.../proptest-regressions/...
proptest: If this test was expected to be flaky, ...
\`\`\`

Proptest **caches the failing input** in a file under \`proptest-regressions/\`. Subsequent runs will re-test the cached input first, so once you find a bug, fixing it is verified against the same minimal counterexample every time. Add the regressions file to git (it's tiny).

Common errors and fixes:

- **\`error: cannot find macro 'proptest' in this scope\`** — your \`mod prop_tests\` is missing \`use proptest::prelude::*;\`. Re-check Step 2.
- **\`error: trait 'Strategy' not satisfied\`** — your generator function's return type isn't \`impl Strategy<Value = T>\`. The \`prop_oneof![Just(...)]\` returns \`impl Strategy<Value = T>\` for the type inside \`Just\`; chaining \`.prop_map(...)\` may change the value type. Make sure your \`Strategy<Value = ...>\` type matches what you actually generate.
- **\`prop_assert_eq\` fails with totals not matching** — your \`total_in\` accumulator is wrong. Each submit adds the order's \`qty\` to \`total_in\`, not the fill quantity. Re-check Step 4 — only sum at submit, not at fill.
- **Determinism fails** — you likely introduced a HashMap somewhere, or a \`time::Instant\`, or some non-deterministic primitive. Check the recent diff against L1-L7's code; the bug is wherever a non-deterministic primitive was added.

## Design reflection

Three load-bearing decisions encoded here:

1. **Proptest is dev-dep, not runtime dep.** Property tests run during \`cargo test\`, not in production. Putting \`proptest\` in \`[dependencies]\` would force every consumer of \`openhl-clob\` to compile and link proptest. The \`[dev-dependencies]\` discipline keeps the production dependency graph clean.

2. **The Action enum is a simplified intermediate.** Each variant carries raw \`u64\`s, not the \`OrderId(u64)\` / \`AccountId(u64)\` newtype-wrapped versions. **The proptest strategies generate the raw values; the test body wraps them in newtypes before calling \`submit\`.** This is on purpose — proptest's combinators work most easily with primitive types, and the \`as u64\` ergonomics save us boilerplate. Newtype enforcement happens at the API boundary (calling \`submit\`), not inside the test generator.

3. **\`determinism\` is the load-bearing property for consensus.** A correct-but-non-deterministic matching engine breaks consensus; a deterministic-but-incorrect one is repairable. The test that catches non-determinism is the one that protects the chain's safety. **Naming and prioritizing properties by what they protect — not by what they test — is the discipline.**

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout 55a9dff
diff -u ~/code/my-openhl/crates/clob/src/book.rs ./crates/clob/src/book.rs
diff -u ~/code/my-openhl/crates/clob/Cargo.toml ./crates/clob/Cargo.toml
\`\`\`

After L8, your \`book.rs\` mirrors the reference at \`55a9dff\` (modulo doc comments). \`Cargo.toml\` has the \`[dev-dependencies] proptest\` line.

Return:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: Why \`cases: 256\` and not \`1024\` or \`100\`?**
A balance. 256 cases × 3 properties × ~10ms per case ≈ 8 seconds total — fast enough to run on every \`cargo test\`. 1024 cases would push it to 30+ seconds, becoming a friction in dev iteration. 100 cases would risk missing rare bugs. **Pick a case count that's small enough to run cheaply but large enough to catch common bugs.**

**Q: Why no \`cancel\` in the proptest actions?**
Because cancel actions complicate the determinism + conservation properties: after a cancel, you need to track which order IDs are still alive. The simplification "submit-only sequences" makes the 3 invariants tractable. Adding cancel-aware properties is a follow-up; the existing 3 invariants are the highest-value ones to get right first.

**Q: What happens when proptest finds a failing input?**
It enters the **shrinking phase**. Starting from the failing input, proptest tries to find the smallest subset / smallest values that still fail. For our test case generators (which produce \`Vec<Action>\`), shrinking might reduce a 25-action sequence to a 3-action sequence that still reproduces the bug. The minimal sequence is what you debug against — much easier than the original input.

**Q: Can I make \`arb_actions\` produce only Limit orders?**
Yes — change \`arb_action\`'s \`prop_oneof![3 => limit_action, 1 => market_action]\` to \`prop_oneof![1 => limit_action]\` (or just return \`limit_action\` directly without the \`prop_oneof\`). For the invariants we have, Market orders are *useful* (they exercise the discard-remainder path), but if you want to focus testing on Limit-only flows, you can. **proptest strategies are composable.**

## Next lesson (L9)

The matching engine is fully tested. **It's not yet integrated with consensus.** L9 starts Module 4 (Bridge integration): adding \`Book\` + \`pending_fills\` fields to \`LiveRethEvmBridge\`, and a \`submit_order\` method that routes orders into the CLOB and accumulates resulting Fills in a buffer. After L9, the bridge owns a matching engine; L10 will drain the buffer at \`build_payload\` time.`,
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
                  title: "Lesson 9 — LiveRethEvmBridge gets a CLOB + submit_order",
                  slug: "openhl-clob-bridge-fields-en",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 40,
                  xpReward: 70,
                  content: `# Lesson 9 — \`LiveRethEvmBridge\` gets a CLOB + \`submit_order\`

## Goal

Concepts you'll grasp in this lesson:

- **The CLOB lives *next to* the bridge, not *inside* the Reth EVM** — \`clob: Mutex<Book>\` is a field on \`LiveRethEvmBridge\`, alongside \`provider\` and \`state\`. Fills become a parallel data lane that rides along with each payload; they aren't yet EVM transactions (that's course 8's precompiles). This is the architectural shape of "CLOB on top of EVM."
- **Lock granularity: two \`Mutex\`es, not one** — \`clob\` and \`pending_fills\` are mutated at different times by different callers. Splitting locks means a thread reading \`pending_fill_count\` doesn't block submitters touching the book. Lock granularity matters when contention is on the hot path.
- **Interior mutability + \`&self\` is the idiomatic shape for async-shared state** — \`submit_order(&self, ...)\` lets the bridge be wrapped in \`Arc\` and shared across tasks without a top-level \`RwLock<Bridge>\` that would serialize everything.
- **APIs that lock should never hand references back through the lock** — \`payload_fills\` returns \`Vec<Fill>\` (cloned), not \`&[Fill]\`, because returning a borrow would force the caller to hold the lock guard for the slice's lifetime — instant deadlock with anything else that wants the lock.
- **Empty-\`Vec\` placeholder is more discoverable than a TODO comment** — \`build_payload\` inserts \`Vec::new()\` until L10 swaps in \`std::mem::take(...)\`. Readers see exactly where the missing functionality lives; a comment would rot.

Verification:

\`\`\`bash
cargo test -p openhl-evm --release
\`\`\`

…still passes (38 tests from course 6 + 1 new test from L9). The bridge now **owns** a CLOB matching engine.

Specific changes:

- **One new workspace dep** — \`openhl-clob = { workspace = true }\` in \`crates/evm/Cargo.toml\`.
- **Two new fields** on \`LiveRethEvmBridge\`: \`clob: Mutex<Book>\` and \`pending_fills: Mutex<Vec<Fill>>\`.
- **A wider pending tuple** — \`pending: HashMap<u64, (B256, Header)>\` becomes \`HashMap<u64, (B256, Header, Vec<Fill>)>\`. The third element is the per-payload fill list.
- **Three new methods** on the bridge: \`submit_order(&self, order: Order) -> FillResult\`, \`payload_fills(id) -> Option<Vec<Fill>>\` (inspection), \`pending_fill_count() -> usize\` (inspection).
- **Ripple updates** — destructuring on the pending tuple in \`build_payload\`, \`payload_ready\`, \`validate_payload\`, \`commit\` all need the 3-tuple pattern.

**\`build_payload\` doesn't drain \`pending_fills\` yet** — it inserts an empty \`Vec<Fill>\` for now. L10 makes the drain real. After L9 you can submit orders, see fills accumulate in \`pending_fills\`, but the bridge's payloads carry no fills. **L10 closes that gap; L11 writes the integration test that proves it.**

## Recap

After course 6 (L14) + course 7 L8, your workspace has:

\`\`\`
crates/clob/                            — complete matching engine (L1-L8)
crates/evm/src/live_node.rs             — LiveRethEvmBridge<P>
  fields: provider, chain_spec, validator, engine_handle: Option<...>, state: Mutex<State>
  pending: HashMap<u64, (B256, Header)>
crates/consensus/                       — full BFT engine
\`\`\`

\`cargo test -p openhl-evm\` passes 38 tests. **The CLOB exists, the bridge exists, but they don't know about each other.** L9 wires the bridge to the CLOB.

## Plan

Six things, all in \`crates/evm/\`:

1. **Add \`openhl-clob = { workspace = true }\`** to \`crates/evm/Cargo.toml\`'s \`[dependencies]\`.
2. **Add the import** to \`crates/evm/src/live_node.rs\`: \`use openhl_clob::{Book, Fill, FillResult, Order};\`.
3. **Add \`clob\` + \`pending_fills\` fields** to the \`LiveRethEvmBridge<P>\` struct.
4. **Change \`pending\` to a 3-tuple** in the \`State\` struct.
5. **Update \`new()\`** to initialize the new fields.
6. **Add three methods** to the \`impl<P> LiveRethEvmBridge<P>\` block: \`submit_order\`, \`payload_fills\`, \`pending_fill_count\`.
7. **Ripple-update the destructuring** in \`build_payload\`, \`payload_ready\`, \`validate_payload\`, \`commit\` to match the new 3-tuple shape. \`build_payload\` inserts an empty \`Vec<Fill>\` for now.

Step 7 sounds tedious but is mechanical: every place that wrote \`(hash, header)\` or \`(h, _)\` becomes \`(hash, header, fills)\` or \`(h, _, _)\`. The compiler tells you each location with a clear error.

> 🛑 **Predict.** Before scrolling: after L9 you can call \`bridge.submit_order(order)\` and see fills accumulate via \`bridge.pending_fill_count()\`. If you then call \`bridge.build_payload(parent, attrs)\`, what does \`bridge.payload_fills(id)\` return for the newly-built payload? Hint: read §Step 7 carefully.

(Answer: \`Some(vec![])\` — the empty fill list. L9 wires the data flow but \`build_payload\` still inserts an empty Vec instead of draining. L10's "drain on build" change is what turns this into \`Some(vec![fill_a, fill_b, ...])\`.)

## Walk-through

### Step 1: Add the dep to \`crates/evm/Cargo.toml\`

Open \`crates/evm/Cargo.toml\`. The current \`[dependencies]\` section (after course 6) has the various \`openhl-types\`, \`reth-*\`, \`alloy-*\` deps. Add one line:

\`\`\`toml
[dependencies]
openhl-consensus         = { workspace = true }
openhl-types             = { workspace = true }
openhl-clob              = { workspace = true }      # NEW
async-trait              = { workspace = true }
# ... rest unchanged ...
\`\`\`

\`openhl-clob\` is already declared in the workspace \`Cargo.toml\` (you added the path entry in L1). The \`[dependencies]\` entry says "this specific crate uses it."

### Step 2: Add the import to \`live_node.rs\`

Open \`crates/evm/src/live_node.rs\`. The current imports include all the reth-related types. Add this line above the \`openhl_consensus\` import:

\`\`\`rust
use alloy_consensus::Header;
use alloy_primitives::{Address, B256};
use alloy_rpc_types_engine::ForkchoiceState;
use async_trait::async_trait;
use openhl_clob::{Book, Fill, FillResult, Order};                     // NEW
use openhl_consensus::bridge::{BridgeError, ConsensusBridge};
use openhl_types::{BlockHash, ExecutedBlock, PayloadAttrs, PayloadId, PayloadStatus};
// ... rest unchanged ...
\`\`\`

Four types pulled in: \`Book\` (the matching engine), \`Fill\` (output), \`FillResult\` (the wrapper from \`Book::submit\`), \`Order\` (the input to submit).

Also update the module-level doc comment to acknowledge the new stage. Find the existing block of \`//! Stage 7X\` comments at the top of the file:

\`\`\`rust
//! Stage 7a: parent lookups go through the live node's provider via the
//! \`BlockNumReader\` trait.
//!
//! Stage 7c: \`validate_payload\` runs Reth's \`EthBeaconConsensus::
//! validate_header_against_parent\` against the live parent ...
//!
//! Stage 7d: \`commit\` now sends a \`ForkchoiceUpdated\` to Reth's in-process
//! consensus engine ...
\`\`\`

…and insert a new Stage 8d block somewhere reasonable (between 7c and 7d is fine):

\`\`\`rust
//! Stage 8d: the bridge now owns a CLOB matching engine. \`submit_order\` routes
//! orders into the book and accumulates resulting fills in \`pending_fills\`.
//! \`build_payload\` drains the pending fills and stores them alongside the
//! synthesized header, so the payload carries real CLOB-generated content.
//! Fills are not yet encoded as EVM transactions executable by Reth's
//! \`BlockExecutor\` — that's the next stage (or Module 3). 8d proves the
//! wiring exists; encoding is downstream.
\`\`\`

This is meta-documentation — when someone reads the file 6 months from now, the staging comments are the map.

### Step 3: Add fields to \`LiveRethEvmBridge\`

Find the struct definition. Add two fields between \`validator\` and \`state\`:

\`\`\`rust
#[derive(Debug)]
pub struct LiveRethEvmBridge<P> {
    provider: P,
    chain_spec: Arc<ChainSpec>,
    validator: EthBeaconConsensus<ChainSpec>,
    clob: Mutex<Book>,                                            // NEW
    pending_fills: Mutex<Vec<Fill>>,                              // NEW
    engine_handle: Option<ConsensusEngineHandle<EthEngineTypes>>,
    state: Mutex<State>,
}
\`\`\`

Two \`Mutex\`-wrapped fields. Why both \`Mutex\`?

- **\`clob: Mutex<Book>\`** — the matching engine. \`Book\` itself is not thread-safe internally; wrapping in \`Mutex\` lets multiple callers submit orders concurrently (the bridge will be shared via \`Arc<LiveRethEvmBridge>\` once integrated into the engine app loop).
- **\`pending_fills: Mutex<Vec<Fill>>\`** — the buffer where \`submit_order\` pushes fills and \`build_payload\` (in L10) drains them. Separate \`Mutex\` from \`clob\` because the two mutate at different times: a submit holds \`clob\`'s lock briefly to do matching, then briefly holds \`pending_fills\`'s lock to append. A separate lock means two submits don't serialize through the full submit → push chain.

> 🛑 **Anti-fluency.** "Why two \`Mutex\`es instead of one \`Mutex<(Book, Vec<Fill>)>\`?" **Lock granularity.** One mutex around both means every submit holds the lock for both the matching work AND the fill-buffer mutation. Future code that reads \`pending_fill_count\` without submitting (e.g., L10's \`build_payload\` drain, debugging tools) would block on submits-in-progress. Two mutexes let reads bypass write contention. **The cost is a few extra \`Mutex::new\` calls; the benefit is better concurrent throughput.**

### Step 4: Change the \`pending\` tuple

Find the \`State\` struct definition:

\`\`\`rust
#[derive(Debug, Default)]
struct State {
    next_payload_id: u64,
    pending: HashMap<u64, (B256, Header)>,
    chain: HashMap<B256, Header>,
    head: Option<B256>,
}
\`\`\`

Change \`pending\`'s value type to a 3-tuple, with the third element being \`Vec<Fill>\`:

\`\`\`rust
#[derive(Debug, Default)]
struct State {
    next_payload_id: u64,
    /// Pending payloads keyed by \`PayloadId.0\`. Value is (\`block_hash\`, \`header\`,
    /// fills drained from the CLOB at \`build_payload\` time).
    pending: HashMap<u64, (B256, Header, Vec<Fill>)>,
    chain: HashMap<B256, Header>,
    head: Option<B256>,
}
\`\`\`

\`chain\` stays as \`HashMap<B256, Header>\` because committed blocks don't need to track their fills here — the fills are downstream of commit. (Production code would persist fills somewhere; that's beyond this course.)

**The new doc comment is part of the lesson.** It explains *why* the third element exists — the data flow from \`submit_order\` → \`pending_fills\` → \`build_payload\` drains → per-payload \`Vec<Fill>\` in \`pending\` map.

### Step 5: Update \`new()\`

The current \`new()\` initializes 4 fields. After the changes, it initializes 6. Update:

\`\`\`rust
impl<P> LiveRethEvmBridge<P> {
    #[must_use]
    pub fn new(provider: P, chain_spec: Arc<ChainSpec>) -> Self {
        let validator = EthBeaconConsensus::new(Arc::clone(&chain_spec));
        Self {
            provider,
            chain_spec,
            validator,
            clob: Mutex::new(Book::new()),                        // NEW
            pending_fills: Mutex::new(Vec::new()),                // NEW
            engine_handle: None,
            state: Mutex::new(State::default()),
        }
    }
\`\`\`

Two new field initializations. \`Book::new()\` from L3's helper (workspaces are wired so \`openhl_clob::Book::new()\` is callable here). \`Vec::new()\` for the empty fill buffer.

### Step 6: Add the three new methods

Below \`new()\` (or after \`chain_spec()\` if you prefer grouping pub methods together), add:

\`\`\`rust
    /// Submit an order to the CLOB. Resulting fills are buffered in
    /// \`pending_fills\` until the next \`build_payload\` drains them.
    pub fn submit_order(&self, order: Order) -> FillResult {
        let mut book = self.clob.lock().expect("clob mutex poisoned");
        let result = book.submit(order);
        if !result.fills.is_empty() {
            self.pending_fills
                .lock()
                .expect("pending_fills mutex poisoned")
                .extend(result.fills.iter().copied());
        }
        result
    }

    /// Inspect (read-only) the fills attached to a built payload. Returns
    /// \`None\` if the payload id is unknown. Production code would encode
    /// these as EVM-executable transactions before they reach the block
    /// body; v0 keeps them as a parallel list for test inspection.
    #[must_use]
    pub fn payload_fills(&self, id: PayloadId) -> Option<Vec<Fill>> {
        let s = self.state.lock().expect("state mutex poisoned");
        s.pending.get(&id.0).map(|(_, _, fills)| fills.clone())
    }

    /// Number of fills currently buffered, waiting for the next \`build_payload\`.
    #[must_use]
    pub fn pending_fill_count(&self) -> usize {
        self.pending_fills
            .lock()
            .expect("pending_fills mutex poisoned")
            .len()
    }
\`\`\`

Three methods, three intents:

- **\`submit_order\`** — the **write** path. Takes \`&self\` (not \`&mut self\`) because internal mutability via \`Mutex\` lets shared references mutate the bridge. Locks \`clob\`, calls \`book.submit\`, gets back a \`FillResult\`. If any fills were produced, locks \`pending_fills\` and appends them. Returns the \`FillResult\` so the caller knows what happened.
- **\`payload_fills\`** — the **inspection** path. Returns \`Option<Vec<Fill>>\` for a given \`PayloadId\`. \`None\` if the id isn't in pending; \`Some(vec)\` (possibly empty) if it is. The doc comment is explicit that this is a test-and-debug method — production code would route fills through a transaction-encoding pipeline.
- **\`pending_fill_count\`** — a small debugging helper. How many fills are sitting in the buffer waiting to be drained. Useful for tests like "submit two orders that cross, expect count == 1."

Notice all three methods take \`&self\`. The internal \`Mutex\`es do the heavy lifting; the public API is "shared reference + interior mutability," which is exactly what async code needs (multiple async tasks can hold \`&LiveRethEvmBridge\` concurrently).

> 🛑 **Anti-fluency.** "Why does \`submit_order\` take \`&self\` instead of \`&mut self\`?" **Because the bridge needs to be shared across async tasks that all want to submit orders concurrently.** The matching engine (the actual code that mutates) is behind a \`Mutex\`, which Rust's borrow checker accepts as "this mutation is safe because the mutex enforces exclusion." If \`submit_order\` took \`&mut self\`, you'd need an \`Arc<RwLock<LiveRethEvmBridge>>\` and every submit would lock the entire bridge — worse performance and weirder API. **Interior mutability is the right tool when shared concurrent access is the use case.**

### Step 7: Ripple-update the destructuring

This is the tedious-but-mechanical part. The pending tuple is now 3 elements; every place that pattern-matches on it needs to know. Five sites total:

**Site 1: \`build_payload\`** — search for \`s.pending.insert(id, ...)\`. Currently:

\`\`\`rust
let hash = header.hash_slow();
s.pending.insert(id, (hash, header));
Ok(PayloadId(id))
\`\`\`

Change to:

\`\`\`rust
let hash = header.hash_slow();
s.pending.insert(id, (hash, header, Vec::new()));    // empty Vec<Fill> for now; L10 drains pending_fills here
Ok(PayloadId(id))
\`\`\`

**\`Vec::new()\` is the placeholder.** L10 replaces it with \`std::mem::take(&mut *self.pending_fills.lock()...)\`.

**Site 2: \`payload_ready\`** — search for \`s.pending.get(&n).cloned()\`. Currently:

\`\`\`rust
let (hash, header) = s
    .pending
    .get(&n)
    .cloned()
    .ok_or_else(|| BridgeError::Rejected(format!("unknown payload id {n}")))?;
\`\`\`

Update the destructuring:

\`\`\`rust
let (hash, header, _fills) = s
    .pending
    .get(&n)
    .cloned()
    .ok_or_else(|| BridgeError::Rejected(format!("unknown payload id {n}")))?;
\`\`\`

The \`_fills\` binding catches the new third element but doesn't use it — \`payload_ready\` returns an \`ExecutedBlock\`, which doesn't need the fills directly. The \`_\` prefix tells the compiler "we know it's there, we don't need it."

**Site 3: \`validate_payload\`** — inside the \`let header = { ... }\` block, search for \`.find(|(h, _)| *h == block_hash)\`:

\`\`\`rust
.find(|(h, _)| *h == block_hash)
.map(|(_, h)| h.clone())
\`\`\`

Update both closures to 3-element patterns:

\`\`\`rust
.find(|(h, _, _)| *h == block_hash)
.map(|(_, h, _)| h.clone())
\`\`\`

**Site 4: \`commit\`** — search for the same \`.find(|(h, _)| *h == hash)\` pattern, change identically:

\`\`\`rust
let header = s
    .pending
    .values()
    .find(|(h, _, _)| *h == hash)
    .map(|(_, h, _)| h.clone())
    .ok_or_else(|| ...)?;
\`\`\`

**Site 5: \`payload_fills\`** (the new method you just added in Step 6) — already uses the 3-element pattern in the \`.map(|(_, _, fills)| fills.clone())\` line. No change needed.

That's all 5 sites. Run \`cargo check -p openhl-evm\` — if you missed any, the compiler will tell you with a "pattern matches against tuple of length 2 but expected 3" error.

> 🛑 **Anti-fluency.** "Couldn't I make the \`pending\` map's third field a \`Vec<Fill>\` only on payloads with fills, like \`(B256, Header, Option<Vec<Fill>>)\`?" **You could, but it's worse.** \`Vec<Fill>\` already represents "zero or more fills" — the empty vec is the natural "no fills" case. \`Option<Vec<Fill>>\` adds an extra unwrap step at every consumer site, and doesn't save meaningful memory (an empty Vec is 24 bytes vs Option's 32 bytes — negligible). **Don't add Option wrappers when the inner type already has a natural empty state.**

## Test

\`\`\`bash
cargo test -p openhl-evm --release
\`\`\`

After ~30 seconds (incremental compile + node bootstrap):

\`\`\`
... 38 tests ...

test result: ok. 38 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

All course 6 tests still pass. L9 doesn't add new tests — the new functionality (submit_order, etc.) gets exercised by L11's integration test. The L9 change is **structural** — the bridge now has new fields and methods, but the existing test surface doesn't touch them, so all those tests continue to work.

You can do a quick sanity check that the new methods are wired correctly:

\`\`\`rust
// In your existing live_bridge_builds_on_real_genesis test or a new smoke test:
let bridge = LiveRethEvmBridge::new(handle.node.provider.clone(), chain_spec);
assert_eq!(bridge.pending_fill_count(), 0); // empty after fresh bridge
\`\`\`

That should pass. We're not testing the matching path yet (that's L11) — just that the new method compiles and returns 0 for a fresh bridge.

Common errors and fixes:

- **\`error[E0432]: unresolved import 'openhl_clob'\`** — Cargo.toml is missing the dep. Re-check Step 1.
- **\`error[E0277]: 'Mutex<Book>' is not 'Send'\`** — somewhere a \`Book\` is being held across an \`.await\`. Check that \`submit_order\` and \`pending_fill_count\` finish their lock + work before any await (they should — they're all synchronous in their bodies).
- **\`error: pattern requires 2 fields, struct has 3\`** — you missed a ripple-update site. The compiler will name the file:line. Add the third pattern element (\`_fills\` or \`_\`).
- **\`error: cannot find value 'pending_fills'\`** in \`build_payload\` — you didn't add the field to the struct or to \`new()\`. Re-check Steps 3 and 5.

## Design reflection

Three load-bearing decisions encoded here:

1. **Two \`Mutex\`es instead of one.** The bridge's CLOB state and its fill buffer are different concerns mutated at different times. Splitting locks lets concurrent submits avoid blocking each other unnecessarily. **Lock granularity matters when contention is on the hot path.**

2. **\`submit_order\` takes \`&self\`.** Interior mutability via \`Mutex\` lets shared references mutate the bridge. The bridge will be wrapped in \`Arc\` and shared across async tasks; making methods take \`&mut self\` would require \`RwLock<Bridge>\` at the top, which would serialize all access through one global lock. **Internal \`Mutex\` + \`&self\` API is the idiomatic Rust pattern for async-shared state.**

3. **Empty \`Vec<Fill>\` placeholder in \`build_payload\`.** L9 wires the structure; L10 makes it functional. Leaving the placeholder is honest scoping — readers can see exactly where the missing functionality lives. **A \`Vec::new()\` placeholder is more discoverable than a future TODO comment.**

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout 428cc26
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
diff -u ~/code/my-openhl/crates/evm/Cargo.toml ./crates/evm/Cargo.toml
\`\`\`

After L9, your code is partway through 428cc26's full set of changes — fields + methods are in, but \`build_payload\` doesn't yet drain (L10) and there's no integration test (L11). The diff should show:
- ✅ \`clob\` + \`pending_fills\` fields (matches reference)
- ✅ \`submit_order\`, \`payload_fills\`, \`pending_fill_count\` methods (matches reference)
- ✅ 3-tuple in \`pending\` (matches reference)
- ❌ \`build_payload\` still inserts \`Vec::new()\` — reference uses \`std::mem::take(...)\`
- ❌ No \`clob_fills_flow_into_payload\` integration test — reference has it

The \`❌\` items land in L10 + L11.

Return:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: Why does \`submit_order\` lock \`clob\`, finish, then separately lock \`pending_fills\`, instead of holding both locks at once?**
Because the \`pending_fills\` append depends on the *result* of the matching, not on the matching's intermediate state. After \`book.submit(order)\` returns, the \`FillResult\` is owned data — we can release \`clob\`'s lock and safely process the result. Holding both locks would serialize unrelated \`pending_fills\` operations (e.g., another caller reading \`pending_fill_count\` would block) for no correctness benefit.

**Q: Why is \`payload_fills\` returning \`Vec<Fill>\` (cloned) instead of \`&[Fill]\` (borrowed)?**
Because returning \`&[Fill]\` would require the caller to hold the \`state\` Mutex's lock guard for the lifetime of the slice — which would deadlock anything else that wants the lock. Cloning the Vec is one allocation per \`payload_fills\` call, which is fine for an inspection method called rarely. **APIs that lock should never return references back through the lock.**

**Q: Could the \`clob\` field be \`Arc<Mutex<Book>>\` instead of \`Mutex<Book>\`?**
Yes — and openhl's Stage 9 (later) actually does this, because the CLOB needs to be shared with custom EVM precompiles that read its state. For Stage 8d, plain \`Mutex<Book>\` is enough. The change from \`Mutex<T>\` to \`Arc<Mutex<T>>\` is mechanical — wrap one place, change a few \`.lock()\` sites to \`.lock().expect(...)\`-on-arc. **Defer the Arc wrap until you actually need the sharing.**

**Q: What happens if \`pending_fills.lock()\` panics because of a poisoned mutex?**
A panic propagates up through \`submit_order\` and crashes whatever task called it. In Rust, mutex poisoning happens when a thread panics while holding the lock. In a synchronous body like \`book.submit(order)\`, panics are rare (the only sources are explicit \`unwrap()\`s, OOM, or stack overflow). If they do happen, the bridge is in an inconsistent state anyway — propagating the panic is the right behavior. **The \`.expect("mutex poisoned")\` is a tripwire, not a recovery path.**

## Next lesson (L10)

The bridge has a CLOB and fills accumulate. **Payloads built via \`build_payload\` still don't carry those fills** — the placeholder \`Vec::new()\` is the gap. L10 replaces the placeholder with \`std::mem::take(&mut *pending_fills.lock(...))\` so each new payload drains all accumulated fills. After L10, \`bridge.payload_fills(id)\` returns the actual fills produced since the last build, and \`bridge.pending_fill_count()\` resets to 0. L11 writes the end-to-end test that proves this drain semantic is forward-only (earlier payloads aren't retroactively filled).`,
                },
                {
                  title: "Lesson 10 — build_payload drains pending fills",
                  slug: "openhl-clob-bridge-drain-en",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 25,
                  xpReward: 50,
                  content: `# Lesson 10 — \`build_payload\` drains pending fills

## Goal

Concepts you'll grasp in this lesson:

- **\`std::mem::take\` is O(1) — a pointer swap, not element copying** — for a \`Vec<Fill>\` with 1000 entries, \`mem::take\` swaps the (ptr, len, cap) triple in one assignment; \`drain(..).collect()\` is O(N) with iterator overhead. Knowing the stdlib primitive saves you from inventing slower versions.
- **Drain at \`build_payload\`, not at \`submit\`** — fills get grouped by *which payload they ride in*, not by submission order. If we drained at submit time, the bridge would need a side-channel to track payload assignment. Buffer-then-drain encodes the grouping for free.
- **Forward-only drain mirrors block immutability** — payload N gets the fills accumulated between the previous \`build_payload\` and now. Earlier payloads are not retroactively updated. This is the same semantics as committed blocks: once built, frozen.
- **Two short locks beat one long lock when operations are independent** — we lock \`state\` to compute the payload ID, *briefly* lock \`pending_fills\` for the swap, then continue under \`state\`'s lock to insert. The \`pending_fills\` mutex isn't held during the heavy work.
- **The lost-fill failure mode is real but acceptable for v0** — if \`build_payload\` errors *after* the drain, the fills are gone from \`pending_fills\` but never made it into a payload. Production hardening would add a recovery queue; v0 single-validator devnet accepts the risk.

Verification:

\`\`\`bash
cargo test -p openhl-evm --release
\`\`\`

…still passes 38 tests.

Specific changes:

**One small change in \`build_payload\`** — about 8 lines — replaces L9's \`Vec::new()\` placeholder with \`std::mem::take(...)\`, so each new payload drains every fill the CLOB has accumulated since the last \`build_payload\` call.

The drain is **forward-only**: once a fill is attached to payload N, it's gone from \`pending_fills\` and will not appear in payload N+1. This is the data-flow promise the bridge makes to its consumers — each payload owns exactly one snapshot of fills, taken at build time.

L10 is short (one focused change). L11 will write the integration test that exercises the full pipeline.

## Recap

After L9, the bridge has:

\`\`\`rust
// new fields
clob: Mutex<Book>,
pending_fills: Mutex<Vec<Fill>>,

// new methods
pub fn submit_order(&self, order: Order) -> FillResult     // pushes fills
pub fn payload_fills(&self, id: PayloadId) -> Option<Vec<Fill>>  // reads fills
pub fn pending_fill_count(&self) -> usize                  // reads count
\`\`\`

You can submit orders. Fills accumulate in \`pending_fills\`. \`pending_fill_count()\` reports the buffer size. **But \`build_payload\` ignores the buffer** — it inserts \`Vec::new()\` as the third element of the pending tuple. So \`payload_fills(id)\` returns \`Some(vec![])\` even when the buffer has entries.

L10 closes that gap.

## Plan

One change, in one location. Inside \`crates/evm/src/live_node.rs\`'s \`build_payload\` method, the line:

\`\`\`rust
s.pending.insert(id, (hash, header, Vec::new()));
\`\`\`

…becomes:

\`\`\`rust
let drained_fills = std::mem::take(
    &mut *self
        .pending_fills
        .lock()
        .expect("pending_fills mutex poisoned"),
);
s.pending.insert(id, (hash, header, drained_fills));
\`\`\`

That's the whole lesson. Eight lines of code. The interesting parts are **what \`std::mem::take\` does** and **why we want forward-only drain semantics**.

> 🛑 **Predict.** Before scrolling: \`std::mem::take(&mut v)\` takes ownership of the contents of \`v\` and replaces \`v\` with \`Default::default()\`. For \`Vec<Fill>\`, that means we get the entire vector contents, and \`v\` becomes an empty \`Vec<Fill>\`. **One question:** could we instead write \`v.drain(..).collect::<Vec<_>>()\` for the same effect? What's the practical difference?

(Answer: \`drain(..)\` removes the elements one at a time, returning an iterator. \`mem::take\` swaps the entire \`Vec<Fill>\` by value — one pointer swap, no per-element work. For a Vec with N fills, \`drain\` is O(N) plus iterator overhead; \`mem::take\` is O(1) constant-time. **\`mem::take\` is faster and clearer for "take everything and reset to default."**)

## Walk-through

### Step 1: Find the line to change

Open \`crates/evm/src/live_node.rs\`. Inside \`impl<P> ConsensusBridge for LiveRethEvmBridge<P>\`, find \`build_payload\`. Scroll to near the end of the body (just before \`Ok(PayloadId(id))\`). You should see the L9 placeholder line:

\`\`\`rust
        let hash = header.hash_slow();
        s.pending.insert(id, (hash, header, Vec::new()));    // empty Vec<Fill> for now; L10 drains pending_fills here
        Ok(PayloadId(id))
    }
\`\`\`

The comment from L9 explicitly points here. This is the spot.

### Step 2: Replace with the drain

Change the section from \`let hash = header.hash_slow();\` through the insert to:

\`\`\`rust
        let hash = header.hash_slow();

        // Drain whatever fills the CLOB has accumulated since the last
        // build_payload call. The fills attach to this payload so the bridge
        // can route them downstream (encode as EVM txs, return via
        // payload_fills, etc.). 8d keeps them as a parallel list; future
        // stages encode them into the block body.
        let drained_fills = std::mem::take(
            &mut *self
                .pending_fills
                .lock()
                .expect("pending_fills mutex poisoned"),
        );

        s.pending.insert(id, (hash, header, drained_fills));
        Ok(PayloadId(id))
    }
\`\`\`

Two new statements: the \`let drained_fills\` block and the modified insert. The comment is intentional — it documents the **drain-on-build semantics** for future readers.

Walk the new code carefully:

1. **\`self.pending_fills.lock()\`** — acquire the mutex. Returns \`LockResult<MutexGuard<Vec<Fill>>>\`. The \`.expect("pending_fills mutex poisoned")\` unwraps the result (\`expect\` over poisoned mutexes is fine — see L9's design reflection).
2. **\`.lock().expect(...)\`** returns a \`MutexGuard<Vec<Fill>>\`. \`MutexGuard\` is \`Deref<Target = Vec<Fill>>\`, but it also has \`DerefMut\`. To take ownership of the Vec by value, we need \`&mut Vec<Fill>\`, which we get by \`&mut *guard\`.
3. **\`std::mem::take(&mut *guard)\`** does the swap: the Vec's heap-pointer + len + capacity move out of the MutexGuard into our \`drained_fills\` variable; the MutexGuard's Vec is replaced with \`Vec::default()\` (which is \`Vec::new()\` — an empty Vec with no allocation).
4. **The MutexGuard is dropped at the end of the block expression** — the lock releases.
5. **\`s.pending.insert(id, (hash, header, drained_fills))\`** stores the snapshot of fills with the new payload. **The pending_fills buffer is now empty, ready for the next round of submits.**

The whole \`std::mem::take(...)\` expression is **a single atomic operation under the lock** — no other caller can see "half-drained" state. Either \`pending_fills\` is full or it's empty; never mid-drain.

> 🛑 **Anti-fluency.** "Couldn't I just collect into \`drained_fills\` and clear separately, like \`let drained = guard.iter().copied().collect::<Vec<_>>(); guard.clear();\`?" **You could — and the result is the same** for the caller. But: (a) \`iter().copied().collect()\` does O(N) copy work plus O(N) clear work, vs. \`mem::take\`'s O(1) pointer swap; (b) the two-step version has a window where someone reading \`pending_fill_count()\` would see the old count even though we've already collected. \`mem::take\` is atomic from the outside's view. **The one-shot swap is both faster and more correct.**

### Step 3: Verify nothing else changed

Run \`cargo check -p openhl-evm\`. You should see only the line you just modified compile differently — no ripple effects, no other tests broken. The signature of \`build_payload\` is unchanged (still \`async fn ... -> Result<PayloadId, BridgeError>\`), so callers don't notice.

If you want a quick mental test of "are the fills actually moving?":

\`\`\`rust
// Conceptually:
bridge.submit_order(order1);  // fill F1 → pending_fills: [F1]
bridge.submit_order(order2);  // fill F2 → pending_fills: [F1, F2]
assert_eq!(bridge.pending_fill_count(), 2);

let id1 = bridge.build_payload(...).await.unwrap();
// Now pending_fills is empty (drained into payload id1)
assert_eq!(bridge.pending_fill_count(), 0);
// And the payload has the fills attached
assert_eq!(bridge.payload_fills(id1), Some(vec![F1, F2]));

let id2 = bridge.build_payload(...).await.unwrap();  // empty drain this time
assert_eq!(bridge.payload_fills(id2), Some(vec![]));  // no retroactive fills
\`\`\`

This is roughly what L11's integration test does, but executed against a real Reth node bootstrap. L10 just makes the underlying mechanism work.

## Test

\`\`\`bash
cargo test -p openhl-evm --release
\`\`\`

After ~30 seconds (incremental compile):

\`\`\`
... 38 tests ...

test result: ok. 38 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

Course 6's existing tests still pass. The L9 + L10 changes are structural — the matching engine isn't being exercised by any existing test (those come in L11), but everything that did work before still works.

You can confirm the change took effect with a quick \`grep\`:

\`\`\`bash
grep -n "std::mem::take" crates/evm/src/live_node.rs
# Should report 1 line in build_payload — your new change.

grep -n "Vec::new()" crates/evm/src/live_node.rs
# Should NOT report the line in build_payload anymore. (Other Vec::new() in the
# file, like for the initial pending_fills initialization, are fine.)
\`\`\`

Common errors and fixes:

- **\`error[E0596]: cannot borrow \`*self.pending_fills.lock()...\` as mutable\`** — the lock returns a \`LockResult\` which needs \`.expect(...)\` (or \`.unwrap()\`) to unwrap to \`MutexGuard\`. Re-check that \`.lock().expect("...")\` chain.
- **\`error[E0277]: \`MutexGuard<'_, Vec<Fill>>\` doesn't implement \`DerefMut\`** — make sure you're using \`&mut *guard\` and not \`&*guard\`. The \`*guard\` deref + \`&mut\` borrow is what gives you \`&mut Vec<Fill>\`.
- **\`error: cannot move out of borrowed content\`** — you tried something like \`std::mem::take(self.pending_fills.lock().expect(...))\` (no \`&mut *\`). The mem::take signature is \`fn take<T: Default>(dest: &mut T) -> T\`. The argument has to be a \`&mut\`, and dereferencing the MutexGuard gives you the right shape.

## Design reflection

Three load-bearing decisions encoded here:

1. **Drain at build_payload, not at submit.** Submits push into \`pending_fills\`; only \`build_payload\` empties it. This is intentional — **fills are grouped by the payload they were assembled into**, not by the order they came in. The downstream payload-consumer gets a coherent "this batch of fills happened between the previous payload and this one." If we drained at submit time, the bridge would need a side-channel to track which fills go with which payload — more state, more bookkeeping.

2. **\`std::mem::take\` is the right primitive.** It's O(1), atomic under the lock, and signals intent ("take everything, leave default"). The alternative — \`collect::<Vec<_>>(...drain(..))\` then explicit clear — is O(N) + has a half-drained window. **Knowing the standard-library primitives saves you from inventing slower or buggier versions.**

3. **The drain is forward-only.** Payload N attaches fills produced between (the previous build_payload call) and (this call). Earlier payloads aren't updated with fills that arrive later. This matches the chain's semantics: once a block is built, its contents are frozen. **The buffer-then-drain shape encodes "what's in this block" without requiring an explicit grouping mechanism.**

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout 428cc26
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
\`\`\`

After L10, the bridge code is **functionally equivalent** to \`428cc26\` modulo doc comments. The only difference from the reference should be the integration test — \`clob_fills_flow_into_payload\` doesn't exist in your code yet. That's L11.

Return:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: What if \`pending_fills\` has many fills (say 1000)?**
\`std::mem::take\` is still O(1). The Vec itself owns a heap allocation; \`mem::take\` swaps the (pointer, length, capacity) triple. No element-by-element work. The downstream consumer eventually iterates over the 1000 fills, but that's their cost, not the drain's.

**Q: Could two \`build_payload\` calls race and both think they have the full fill set?**
No, because \`std::mem::take\` is under a \`MutexGuard\`. While the lock is held, no other thread can acquire the lock. The first build_payload gets the full set; the second gets an empty Vec (because the first replaced it with \`Vec::default()\`). **The mutex serializes the drains.**

**Q: What if \`build_payload\` errors out *after* the drain?**
The fills are gone from \`pending_fills\` but never made it into a payload. They're effectively lost — submitted but not committed. **This is a real bug class** that production code should handle (e.g., save the drained fills to a recovery queue before doing the rest of \`build_payload\`). For our v0 single-validator devnet, the failure path is rare enough that we accept the loss; production hardening is downstream work.

**Q: Why is \`drained_fills\` not in the \`state\` lock — it's locked separately?**
Because \`pending_fills\` and \`state\` are separate mutexes (the L9 design decision). We lock \`state\` first (to compute the new payload ID), then briefly lock \`pending_fills\` (just for the swap), then continue using the state lock to insert into \`pending\`. **Two short locks beat one long lock when the operations are independent.**

## Next lesson (L11)

The bridge has the data flow. **Nothing yet proves it works end-to-end.** L11 writes the \`clob_fills_flow_into_payload\` integration test:

1. Bootstrap a real Reth \`EthereumNode\` (same pattern as course 6).
2. Construct \`LiveRethEvmBridge\` with the live provider.
3. Call \`build_payload\` on an empty book — verify no fills attached (\`payload_fills\` returns \`Some(vec![])\`).
4. Submit a maker BID @ 100, then a crossing taker SELL @ 100 — fill is produced.
5. Verify \`pending_fill_count == 1\`.
6. Build the next payload — verify the fill is drained AND attached.
7. Verify \`pending_fill_count == 0\`.
8. Verify the earlier (pre-orders) payload was NOT retroactively filled (drain is forward-only).

After L11, you have a single integration test that exercises the entire Course 7 pipeline. **That's the "we built a working CLOB-integrated bridge" milestone.**`,
                },
                {
                  title: "Lesson 11 — clob_fills_flow_into_payload — the milestone test",
                  slug: "openhl-clob-integration-test-en",
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 30,
                  xpReward: 70,
                  content: `# Lesson 11 — \`clob_fills_flow_into_payload\` — the milestone test

## Goal

Concepts you'll grasp in this lesson:

- **End-to-end integration testing against a real Reth node** — bootstrap an \`EthereumNode\`, wire \`LiveRethEvmBridge\`, exercise the full submit→buffer→drain pipeline. This is the test that proves the L1-L10 sequence holds together end-to-end, not just per-component.
- **One thorough integration test beats three narrow ones when bootstrap is expensive** — spinning up a real Reth node takes seconds. Three separate tests (each bootstrapping) would triple that cost; one scenario that verifies submit, drain, and forward-only-ness covers all three invariants in one node lifetime.
- **The forward-only assertion is what makes this a *real* integration test** — "submit produces fill" and "build drains" are obvious from unit tests. Checking that the earlier (empty) payload was *not* retroactively updated is what tests the bridge's per-payload snapshot mechanism specifically. Without it, this would be a unit test in disguise.
- **Fill price = maker's price, demonstrated end-to-end** — maker bid @ 100, taker sell @ 100, fill @ 100. The price-time priority rule from L4-L5 holds across the full integration boundary. Submitting in the opposite order (sell first, then crossing buy) would produce the same fill — order of submission is time priority within a level, not which side rests.
- **\`launch_with_debug_capabilities()\` vs \`launch()\` with add-ons** — debug-capabilities setup is shorter and includes the provider but skips engine-API wiring. We don't need the engine handle here (no forkchoice driven during the test); we just need the provider for parent lookups.

Verification:

\`\`\`bash
cargo test -p openhl-evm clob_fills_flow_into_payload --release
\`\`\`

…passes. **This is the milestone of Course 7.** A real fill, produced by the matching engine you built in L1-L8, flows through \`LiveRethEvmBridge::submit_order\` → \`pending_fills\` buffer → \`LiveRethEvmBridge::build_payload\` drain → into a payload that consensus would commit. The test exercises **every piece** of the integration from L9-L10 against a **live Reth node**.

Specific changes:

You'll have written one new test:

- **\`clob_fills_flow_into_payload\`** — ~100 LOC. Bootstraps a real \`EthereumNode\`, exercises 8 assertions across an 8-step scenario.

The test scenario:

1. Build an empty payload before any orders → verify zero fills attached.
2. Submit a maker bid @ 100 → verify it rests (no immediate fill).
3. Submit a crossing taker sell @ 100 → verify exactly 1 fill produced, buffered.
4. Build the next payload → verify the fill drains into it.
5. Verify \`pending_fill_count\` resets to 0.
6. Re-check the earlier (empty) payload → verify drain was **forward-only** (no retroactive fill).

After L11, Course 7's mainline is complete. L12 wraps up with a capstone.

## Recap

After L10, your \`LiveRethEvmBridge\`:

- Has \`clob: Mutex<Book>\` and \`pending_fills: Mutex<Vec<Fill>>\` fields (L9).
- Has \`submit_order\`, \`payload_fills\`, \`pending_fill_count\` methods (L9).
- \`build_payload\` drains \`pending_fills\` into the new payload's third tuple element (L10).

**Nothing yet proves this works end-to-end.** L11 writes that proof.

## Plan

One test, added to the existing \`#[cfg(test)] mod tests\` block in \`crates/evm/src/live_node.rs\`. The test:

1. **Bootstrap a Reth node** — same pattern course 6's \`live_bridge_builds_on_real_genesis\` used. We need the provider for parent lookups.
2. **Construct \`LiveRethEvmBridge::new(provider, chain_spec)\`** — note: no \`with_engine_handle\` this time. We don't need to drive forkchoice for this test; the matching pipeline doesn't depend on engine_handle.
3. **Assert empty initial state** — \`pending_fill_count() == 0\`.
4. **Build an empty payload** (no orders submitted) — verify \`payload_fills(id)\` returns \`Some(vec![])\`.
5. **Submit a maker** — \`Order { id: 1, side: Buy, qty: 10, OrderType::Limit { price: 100 } }\`. Verify rests, no immediate fill.
6. **Submit a crossing taker** — \`Order { id: 2, side: Sell, qty: 10, OrderType::Limit { price: 100 } }\`. Verify 1 fill produced.
7. **Build the next payload** — verify \`payload_fills(next_id) == Some([the_fill])\`.
8. **Verify the drain semantic** — \`pending_fill_count() == 0\`, and the *earlier* payload's fills are still empty (no retroactive update).

This is the integration test for everything Course 7 built.

> 🛑 **Predict.** Before scrolling: the maker bid is at price 100, qty 10. The taker is a Sell at price 100, qty 10. **Will the resulting fill price be 100, or could it be different?** What's the rule that determines the fill price when two orders cross at exactly the same price?

(Answer: the fill happens at the **maker's** price — \`Price(100)\` in this case. From L4: "the fill price is the *resting* order's price (the maker's). Limit-buyer at $101 matching a resting limit-seller at $100 fills at $100 (maker's price); the buyer wins." When both orders are at the same price, the rule still applies — maker resting at 100, taker matches at 100. **The "price-time priority" rule says: maker price (price priority) + first-come within a price level (time priority). Here, no time priority disambiguation is needed because the maker is the only order at 100.**)

## Walk-through

### Step 1: Add the test header

In \`crates/evm/src/live_node.rs\`, scroll to the \`#[cfg(test)] mod tests { ... }\` block. The block already has \`live_bridge_builds_on_real_genesis\` (from course 6's L12-L14) and \`commit_sends_forkchoice_to_engine_when_handle_installed\` (from L14).

Append a new test at the end (just before the closing \`}\` of \`mod tests\`):

\`\`\`rust
    /// Stage 8d end-to-end: CLOB → bridge → payload.
    /// A maker rests, a taker crosses it, the fill flows into the next
    /// \`build_payload\`'s stored fills. The empty-fill \`build_payload\` that
    /// preceded the orders proves the drain semantics — fills accumulate
    /// AFTER they're built, not retroactively included.
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn clob_fills_flow_into_payload() {
        use openhl_clob::{AccountId, OrderId, OrderType, Price, Qty, Side};

        // ... body goes in Steps 2-7 ...
    }
\`\`\`

Two things to notice in the test header:

- **\`#[tokio::test(flavor = "multi_thread", worker_threads = 4)]\`** — same as course 6's integration tests. We need a multi-threaded tokio runtime because Reth's \`EthereumNode\` spawns several background tasks (RPC, payload builder, etc.). The 4-worker setup gives them room.
- **\`use openhl_clob::{AccountId, OrderId, OrderType, Price, Qty, Side};\`** — imports the types we need from L1's newtype set. The \`Order\` and \`Fill\` types are already in scope from the \`super::*\` at the top of \`mod tests\`.

> 🛑 **Anti-fluency.** "Why import these types inside the test function instead of at the top of \`mod tests\`?" **To keep the test's dependencies visible at the test site.** If a future reader is debugging this test, they can see at a glance which types are involved. The cost is one \`use\` statement per test that needs them; the benefit is that each test reads as a self-contained scenario. For tests outside \`mod tests\` (in real source code), you'd put imports at the top — but tests are special: they're documentation for what the system does, and inline imports make the documentation tighter.

### Step 2: Bootstrap a Reth node

Inside the test function body:

\`\`\`rust
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
\`\`\`

This is the **same pattern** as course 6's \`live_bridge_builds_on_real_genesis\` test. We use \`launch_with_debug_capabilities()\` (not \`.with_add_ons(EthereumAddOns::default()).launch()\`) because we don't need the engine handle this time — we're only testing the CLOB-to-payload data flow, not commit-to-forkchoice.

\`Runtime::test()\`, \`dev_chain_spec()\`, \`NodeConfig::test().dev()\`, and the builder chain are all from course 6 L11/L12. If you need a refresher, scroll up in the test module.

### Step 3: Pull the genesis hash + construct the bridge

\`\`\`rust
        let genesis_hash_b256 = node
            .provider
            .block_hash(0)
            .expect("provider call failed")
            .expect("provider has no genesis");

        let bridge = LiveRethEvmBridge::new(node.provider.clone(), chain_spec);
\`\`\`

Two lines. The first pulls the live genesis block hash from the provider (same as course 6 L12). The second constructs the bridge — note **no \`.with_engine_handle(...)\`** chain on the end. The fields we care about (\`clob\`, \`pending_fills\`) are independent of \`engine_handle\`.

The \`node.provider.clone()\` is cheap because \`node.provider\` is \`Arc\`-backed under the hood.

### Step 4: Assert empty initial state

\`\`\`rust
        // Empty initial state — no orders submitted, no fills pending.
        assert_eq!(bridge.pending_fill_count(), 0);
\`\`\`

The simplest check. After \`new()\`, \`pending_fills: Mutex::new(Vec::new())\` is empty. \`pending_fill_count()\` reads its length. **If this assertion fails**, your L9 \`new()\` doesn't initialize \`pending_fills\` correctly.

### Step 5: Build the empty payload (no orders yet)

\`\`\`rust
        // First payload built with no orders → no fills attached.
        let attrs = PayloadAttrs {
            timestamp: 1,
            fee_recipient: [0u8; 20],
            prev_randao: [0u8; 32],
        };
        let empty_id = bridge
            .build_payload(BlockHash(genesis_hash_b256.0), attrs.clone())
            .await
            .expect("build_payload failed");
        let empty_fills = bridge
            .payload_fills(empty_id)
            .expect("payload exists");
        assert!(empty_fills.is_empty(), "no orders submitted yet, fills must be empty");
\`\`\`

Call \`build_payload\` with the genesis as the parent. The bridge calls L10's \`std::mem::take\` on \`pending_fills\` — which is empty — so the drain returns \`Vec::new()\`. The resulting payload has empty fills.

We bind the returned \`PayloadId\` to \`empty_id\` because **Step 7 needs to re-check this payload's fills later** to prove drain is forward-only.

The \`attrs.clone()\` is because we'll reuse \`attrs\` for the second \`build_payload\` call below. Both payloads use the same attrs (timestamp 1, zero fee_recipient, zero prev_randao) for simplicity — in production code, each payload would have a fresh timestamp.

### Step 6: Submit maker + taker, verify the fill

\`\`\`rust
        // Submit a resting limit BID @ 100 from account 1, then a crossing
        // SELL @ 100 from account 2. This produces exactly one fill.
        let maker = Order {
            id: OrderId(1),
            account: AccountId(1),
            side: Side::Buy,
            qty: Qty(10),
            order_type: OrderType::Limit { price: Price(100) },
        };
        let taker = Order {
            id: OrderId(2),
            account: AccountId(2),
            side: Side::Sell,
            qty: Qty(10),
            order_type: OrderType::Limit { price: Price(100) },
        };

        let maker_result = bridge.submit_order(maker);
        assert!(maker_result.fills.is_empty(), "maker rests, no immediate fill");
        assert_eq!(bridge.pending_fill_count(), 0);

        let taker_result = bridge.submit_order(taker);
        assert_eq!(taker_result.fills.len(), 1, "taker should cross the maker");
        assert_eq!(bridge.pending_fill_count(), 1, "fill buffered in pending");
\`\`\`

Two orders, two submits, four assertions.

**First submit (maker)**:
- \`submit_order(maker)\` calls \`book.submit(maker)\`. The book is empty, so the maker rests as a bid at price 100.
- \`maker_result.fills.is_empty()\` — no immediate fill (book had no asks to cross).
- \`pending_fill_count() == 0\` — nothing buffered, nothing matched.

**Second submit (taker)**:
- \`submit_order(taker)\` matches against the resting bid at 100. The match produces one fill (10 units @ 100, from order 1 to order 2).
- \`taker_result.fills.len() == 1\` — the matcher returned the fill.
- \`pending_fill_count() == 1\` — the fill was pushed to \`pending_fills\` by \`submit_order\`'s post-match append (the \`if !result.fills.is_empty() { ... }\` block from L9 Step 6).

**The maker_result + taker_result pair is the test's instrumentation**. By checking both, we verify (a) the maker really rested (didn't accidentally cross something), and (b) the taker really crossed (didn't accidentally rest).

### Step 7: Build the next payload, verify drain + drain semantics

\`\`\`rust
        // Build the NEXT payload — it should drain the buffered fill.
        let next_id = bridge
            .build_payload(BlockHash(genesis_hash_b256.0), attrs)
            .await
            .expect("build_payload failed");
        let next_fills = bridge
            .payload_fills(next_id)
            .expect("payload exists");
        assert_eq!(next_fills.len(), 1, "fill must be attached to the payload");
        assert_eq!(next_fills[0].price, Price(100));
        assert_eq!(next_fills[0].qty, Qty(10));
        assert_eq!(next_fills[0].maker_order_id, OrderId(1));
        assert_eq!(next_fills[0].taker_order_id, OrderId(2));

        // After draining, pending fills must be empty.
        assert_eq!(bridge.pending_fill_count(), 0);

        // The earlier (empty) payload's fills must still be empty —
        // draining is forward-only, never retroactive.
        let empty_fills_again = bridge
            .payload_fills(empty_id)
            .expect("earlier payload exists");
        assert!(empty_fills_again.is_empty(), "earlier payload not retroactively filled");
    }
\`\`\`

Three sets of assertions:

**First set (the drain itself)**: \`build_payload\` is called again — same parent (genesis) and same attrs. L10's \`std::mem::take\` runs and gets the fill that's in \`pending_fills\`. The fill is stored in the new payload's third tuple element. \`payload_fills(next_id)\` returns \`Some(vec![the_fill])\`. We check:
- \`next_fills.len() == 1\` — exactly one fill, not zero (drain didn't fire) and not two (no spurious fills).
- \`next_fills[0].price == Price(100)\` — the maker's price (price priority).
- \`next_fills[0].qty == Qty(10)\` — full fill of both sides.
- \`next_fills[0].maker_order_id == OrderId(1)\` — maker is order 1 (the resting bid).
- \`next_fills[0].taker_order_id == OrderId(2)\` — taker is order 2 (the crossing sell).

**Second set (drain emptied the buffer)**: \`pending_fill_count() == 0\` — the drain replaced the buffer with \`Vec::default()\`. This is the second half of \`mem::take\`'s atomicity.

**Third set (forward-only)**: \`payload_fills(empty_id)\` — the FIRST payload's fills. **Even though we did drain into the second payload**, the first payload's stored fills are *unchanged* from when it was built. This is the load-bearing assertion of L11: **drain doesn't retroactively modify earlier payloads**.

Each payload is a snapshot of fills at the moment of its build. If we drained the first payload retroactively (which would be a bug), the test would fail here.

> 🛑 **Anti-fluency.** "Why does the test check \`payload_fills(empty_id)\` *after* \`payload_fills(next_id)\`? Couldn't it check \`empty_id\` first?" **The ordering matters because we're testing time-invariance.** We check \`next_id\` first to **establish** that \`next_id\` has 1 fill and \`pending_fill_count\` is 0. Then we check \`empty_id\` to **prove** that \`next_id\`'s drain didn't reach back into \`empty_id\`. If we checked \`empty_id\` first, we'd only prove "the empty payload has no fills" — which we already knew from Step 5. Checking after the drain proves "the earlier payload still has no fills *after a later drain happened*." **The temporal ordering of assertions matters when proving time-invariance.**

## Test

\`\`\`bash
cargo test -p openhl-evm clob_fills_flow_into_payload --release
\`\`\`

After ~30 seconds (incremental compile + node bootstrap):

\`\`\`
running 1 test
test live_node::tests::clob_fills_flow_into_payload ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

To run all tests:

\`\`\`bash
cargo test -p openhl-evm --release
\`\`\`

Now 39 tests pass (38 from course 6 + 1 from L11).

The test takes about 2.5 seconds wall-clock (Reth node bootstrap + 2 small \`build_payload\`s + a few CLOB submits). Most of that is the Reth bootstrap; the actual matching + drain is microseconds.

Common errors and fixes:

- **\`assert!(empty_fills.is_empty())\` fails** — your bridge isn't initializing \`pending_fills\` as empty. Check L9 Step 5: \`pending_fills: Mutex::new(Vec::new())\`.
- **\`assert_eq!(taker_result.fills.len(), 1)\` fails with 0** — the orders aren't actually crossing. Check that maker is \`Side::Buy\` and taker is \`Side::Sell\` (or vice versa), and both have price 100. A common bug: both orders are \`Side::Buy\`, in which case the second order doesn't match — it rests too.
- **\`assert_eq!(next_fills.len(), 1)\` fails with 0** — your L10 drain isn't working. Check that \`build_payload\` calls \`std::mem::take(&mut *self.pending_fills.lock()...)\` and inserts the result, not \`Vec::new()\`.
- **\`assert!(empty_fills_again.is_empty())\` fails** — your drain is retroactively modifying earlier payloads. This is unlikely with \`std::mem::take\` (which only writes to the new payload), but could happen if you accidentally used \`pending_fills.clone()\` instead and then mutated the original.
- **Test panics with "provider has no genesis"** — the node bootstrap failed before reaching the test logic. Check \`dev_chain_spec()\` is producing a valid genesis. Run \`cargo test -p openhl-evm live_bridge_builds_on_real_genesis\` first to verify the Reth setup is working.

## Design reflection

Three load-bearing decisions encoded here:

1. **The test verifies all three pipeline stages in one scenario.** \`submit_order\` works (Step 6), \`build_payload\` drains (Step 7's first assertion set), and the forward-only invariant holds (Step 7's last assertion). One scenario, three properties. If we'd split this into three tests, each would have to bootstrap a node — slow. **One thorough integration test that covers multiple invariants is cheaper than three narrow tests.**

2. **The forward-only check is what makes this a real integration test.** The first two checks (submit produces fill, build drains it) are obvious from the unit tests. The forward-only check **needs the bridge** — it tests that the bridge's per-payload snapshot mechanism is honest. Production code might have written fills back to old payloads "for completeness"; L11 catches that bug.

3. **Two payloads with the same parent (genesis) is intentional.** In production, the second \`build_payload\` would use the first decided block as the parent, not genesis. For this test, we don't need to commit anything — we just need two payloads to demonstrate the drain timing. Reusing the genesis as parent simplifies the test and doesn't change what's being verified (the drain mechanism, not the commit flow).

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout 428cc26
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
\`\`\`

After L11, your \`live_node.rs\` is **functionally complete** matching the reference at \`428cc26\`. The only differences should be doc-comment wording.

Return:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: Why do we use \`launch_with_debug_capabilities()\` here but \`launch()\` (with \`.with_add_ons(...)\`) in L14 of course 6?**
Different test goals. Course 6 L14 tested \`commit → forkchoice_updated\` — needed the engine handle, which lives in the AddOns. L11 tests CLOB → payload — doesn't need the engine handle, just the provider. \`launch_with_debug_capabilities()\` is the shorter setup that includes the provider but skips engine API wiring.

**Q: What's the worst-case fill scenario this test misses?**
Multiple fills per submit (e.g., a Market buy that crosses three price levels at once). The unit tests in L7 (specifically \`buy_market_takes_best_ask\`) cover that path at the matching-engine level; L11 only exercises a single-fill case to keep the test focused. Adding a multi-fill case to L11 would be a 2-line change (different qty values) but doesn't change what we're proving.

**Q: Can the test run in parallel with other tests?**
Yes — \`#[tokio::test]\` runs the test in its own runtime, and the bridge + node instances are local to the test. No shared global state. The \`worker_threads = 4\` setting is per-test, not workspace-wide.

**Q: Why is the maker submitted first and the taker second, not the other way around?**
For symmetry with the typical matching-engine narrative: "the maker rested, the taker crossed it." Order is significant in *time priority* (first-in is filled first within a level), but not in *which side rests*. If you submitted the SELL first, it would rest as an ask; if you then submitted a BUY at the same price, the BUY would cross. The result is the same fill. **The test name "fills flow into payload" is about the data path, not the order of operations.**

## Next lesson (L12)

You have a working CLOB integrated into a real Reth-backed bridge. **L12 is the capstone** — no new code, just:
- A recap of the 11 lessons.
- The list of openhl Stage 8 + 8d functionality you've reproduced.
- What's still scope-cut (precompiles in course 8, funding in course 9, EVM tx encoding in some future course).
- Next steps if you want to keep going (psyto/openhl Stage 9 source code, the Module 3+ build arcs).

A reflection lesson, ~15 min. Then Course 7 is done.`,
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
                  title: "Lesson 12 — What you built, what's still stub, where to go next",
                  slug: "openhl-clob-capstone-en",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 15,
                  xpReward: 50,
                  content: `# Lesson 12 — What you built, what's still stub, where to go next

## The system you built

Over 11 lessons you added a **CLOB matching engine** to the substrate you built in course 6, and wired its fills into committed payloads. Your workspace now looks like this:

\`\`\`
~/code/my-openhl/
├── Cargo.toml                          ← +1 workspace dep (openhl-clob path)
├── crates/
│   ├── clob/                           ← NEW crate (course 7 created it)
│   │   ├── Cargo.toml                  L1: package + dev-dep on proptest (L8)
│   │   └── src/
│   │       ├── lib.rs                  L1: pub mod types, pub mod book, re-exports
│   │       ├── types.rs                L1 + L2: newtypes + records (~109 LOC)
│   │       └── book.rs                 L3-L8: Book + matching + cancel + tests
│   └── evm/
│       └── src/live_node.rs            L9-L11: bridge gains CLOB, drains on build
└── ... rest unchanged from course 6 ...
\`\`\`

About **15 new tests** total: 9 hand-traced unit tests (L7) + 3 proptest invariants (L8, 768 random scenarios) + 1 integration test (L11). Workspace test count: 39 tests (38 from course 6 + L11's \`clob_fills_flow_into_payload\`).

## What the matching engine does

A price-time priority CLOB. **Two operations**: submit (new orders take or rest) and cancel (resting orders disappear). **One observable result**: each \`submit\` returns a \`FillResult\` listing matched fills.

| Operation | Public method | What changes inside |
| - | - | - |
| Submit Limit order | \`Book::submit(order)\` (via \`OrderType::Limit\`) | walks opposite side at-or-better than price, matches resting orders, rests unfilled remainder |
| Submit Market order | \`Book::submit(order)\` (via \`OrderType::Market\`) | walks opposite side at any price, matches, discards unfilled remainder |
| Cancel resting order | \`Book::cancel(order_id)\` | linear scan both sides, remove order, drop level if empty |
| Inspect | \`best_bid\`, \`best_ask\`, \`depth_bid\`, \`depth_ask\` | read-only |

The matching is **deterministic by construction**. Every submit produces the same fills given the same inputs and same prior book state — that's the L8 proptest invariant (\`determinism\`) that 256 random sequences exercise.

## The bridge integration

\`LiveRethEvmBridge\` from course 6 gained **two fields** (\`clob\`, \`pending_fills\`) and **three methods** (\`submit_order\`, \`payload_fills\`, \`pending_fill_count\`). The data flow:

\`\`\`
submit_order(order)              build_payload(parent, attrs)
       │                                    │
       ▼                                    ▼
  clob.submit                       drain pending_fills
       │                                    │
       ▼                                    ▼
  pending_fills.push                  attach to payload
       │                                    │
       │                                    ▼
       │                              payload_fills(id) returns them
       ▼
  return FillResult to caller
\`\`\`

Submit pushes; build drains. The drain is **forward-only**: each payload owns the fill snapshot taken at its build time; earlier payloads aren't retroactively filled. **L11's integration test proves this end-to-end** against a real Reth node.

## What you can now do that you couldn't 11 lessons ago

- **Build a price-time priority matching engine from scratch in Rust** — and understand why \`BTreeMap<Reverse<Price>, ...>\` is the right shape for bids, why \`VecDeque\` is the right per-level queue, and what trade-offs cancel's O(n) scan has versus an O(1) index.
- **Reason about pure-state-machine determinism** — the \`determinism\` proptest is the kind of invariant chains rely on, and you've encoded it.
- **Integrate a sub-system into an existing async-shared bridge** — interior mutability via \`Mutex<T>\` and \`&self\` methods is the idiomatic Rust pattern for shared state under async tasks. You've applied it.
- **Read openhl Stage 8a + 8d source** and explain every line of \`book.rs\` + the bridge's CLOB-related code.
- **Modify the matching engine** — add a new order type (Stop, Iceberg, Post-Only) and know where in \`submit_limit\`/\`submit_market\` it'd land.

## What's still placeholder

This course shipped a working matching engine integrated into the bridge. Honest scoping — here's what isn't there:

### 1. EVM-executable transaction encoding

**Status**: not started.

The fills attached to a payload are still a parallel \`Vec<Fill>\`, not transactions in the block body. Reth's \`BlockExecutor\` won't see them. To progress: encode each \`Fill\` as an EVM transaction (likely calling a custom precompile that updates state). That's Module 3 territory — **course 8**'s domain.

### 2. Custom EVM precompiles

**Status**: not started.

For smart contracts to **read** CLOB state (e.g., "what's the best bid?") they need a precompile. For external accounts to **place orders via on-chain transactions** they need another precompile. openhl Stage 9 has both (\`clob_read_best_bid\`, \`clob_place_order\`). **Course 8** builds these.

### 3. Funding rate state machine

**Status**: not started.

A perp DEX needs funding rate calculations (mark vs. index, periodic rebalancing). openhl Stage 8b has the state machine. **Course 9** builds it.

### 4. Multiple markets

**Status**: implicit single market.

The current \`Book\` is one orderbook. Real perp exchanges have many (HYPE/USDC, BTC/USDC, ETH/USDC, etc.). To extend: \`HashMap<MarketId, Book>\` at the bridge. Mechanical change; not yet done in openhl Stage 8.

### 5. Persistent CLOB state

**Status**: in-memory only.

Restart the bridge and all resting orders are gone. Production needs snapshot/load (or full event-sourcing from chain state). Not addressed in any current openhl stage; eventual hardening work.

### 6. Cancel-by-id index

**Status**: O(n) linear scan.

L6 explicitly chose simplicity over an O(1) index. When openhl scales past ~10k orders per book, the cancel scan becomes meaningful. Adding \`HashMap<OrderId, (Side, Price)>\` would make cancel O(1) — small mechanical change, deferred until profiling demands it.

## Production-readiness checklist

If you wanted to take this matching engine + bridge to a real testnet:

- [ ] **EVM-encoded fills** — wrap each \`Fill\` as a transaction, route to BlockExecutor for state execution + state-root computation.
- [ ] **Custom EVM precompiles** — \`clob_read_best_bid\` for contract reads, \`clob_place_order\` for chain-driven submits.
- [ ] **Multi-market support** — \`HashMap<MarketId, Book>\` and per-market submit/cancel paths.
- [ ] **Persistent state** — snapshot the Book to disk + replay on restart, OR fully reconstruct from chain history.
- [ ] **Cancel index** — add \`HashMap<OrderId, (Side, Price)>\` to make cancel O(1).
- [ ] **Order-id collision check** — \`submit\` currently trusts callers to allocate unique OrderIds. Production needs to detect + reject duplicates.
- [ ] **Pre-trade risk checks** — orders that would put an account below maintenance margin should be rejected before matching.
- [ ] **Telemetry** — counters for order throughput, fill latency, depth-of-book metrics.
- [ ] **Multi-validator agreement** — single-validator devnet hides the case where two validators produce different fill orderings. Proptest's \`determinism\` is the local proof; a multi-validator integration test is the network proof.
- [ ] **Liquidation engine** — when an account's margin falls below maintenance, force-close their positions. Course 9 territory.

This list is intentionally longer than the matching engine itself. **A working matching engine is the foundation, not the product.**

## Where to go next

**Within rethlab**:
- **Course 8 — Custom EVM precompiles** (when shipped) — \`clob_read_best_bid\` + \`clob_place_order\` from openhl Stage 9.
- **Course 9 — Funding state machine** — openhl Stage 8b.

**Outside rethlab**:
- **\`psyto/openhl\` Stage 9 source** — the full custom-EVM build is in the public repo. Read \`crates/evm/src/precompiles.rs\` once you understand the bridge.
- **Production matching engines for reference** — Project Serum (Solana CLOB, archived but public), dYdX v4 (Cosmos-based perp DEX, public). Compare data structures.
- **Property-based testing literature** — proptest's docs + Hughes/Claessen QuickCheck papers. The L8 invariants are conservative; you can do much more.

## Closing note

You wrote roughly **800 lines of Rust** across 5 source files (\`types.rs\` + \`book.rs\` + bridge additions). That code is a *working CLOB matching engine wired into a real Reth-backed bridge*. It's not production-ready; it doesn't need to be.

The hardest part wasn't writing the matching logic — L4's submit_limit is 60 lines once you understand the structure. **The hardest part is the determinism property** — making sure that across all possible orderings of submits, the engine produces the same answer. The L8 proptest is what catches the bugs you didn't think to write tests for, and it's why the engine you built is safe to plug into consensus.

A correct-but-non-deterministic matching engine breaks consensus. A deterministic one is the kind of code that survives migration from devnet to mainnet.

Now go build something that uses this.`,
                },
              ],
            },
          },
        ],
      },
    },
  });
}
