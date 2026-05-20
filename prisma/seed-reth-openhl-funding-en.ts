// AUTO-GENERATED from drafts/openhl_funding_*_en.md by .github/scripts/build-openhl-funding-seed.ts
// Do not hand-edit. Re-run the build script when drafts change.

import { PrismaClient } from '@prisma/client';

export async function seedRethOpenHlFundingEN(prisma: PrismaClient) {
  const tags = ["reth","evm","funding","perpetual","l1","openhl","expert"];

  await prisma.course.create({
    data: {
      slug: "building-openhl-funding-en",
      title: "Build OpenHL Funding — perpetual funding state machine",
      description:
        "Course 9 of 10 in the L1 Architect track. Fourth of the openhl-based build-along courses. Builds the pure state machine that drives perpetual-contract funding payments: a fixed-point premium derivation, a divisor+cap rate calculator, position-snapshot application, and a tick-gating clock with at-most-one-per-interval + no-catch-up invariants. End state: 22 tests pass (20 hand-traced + 2 proptest covering premium antisymmetry and balanced-book zero-sum). Covers openhl Stage 8b (~635 LOC across types.rs / compute.rs / clock.rs). The funding crate is pure state — not yet wired into bridge or vault; that integration is the next L1 Architect course (Funding, oracle, liquidations).",
      difficulty: "EXPERT",
      duration: 355,
      xpReward: 730,
      track: "reth-l1-architect",
      tags,
      isPublished: false,
      sortOrder: 900,
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
                  title: "Build OpenHL Funding — perpetual funding state machine",
                  slug: "openhl-funding-orientation-en",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 15,
                  xpReward: 50,
                  content: `# Build OpenHL Funding — perpetual funding state machine

## What you'll build

The previous course (\`building-openhl-precompiles\`) plugged custom EVM precompiles into Reth so smart contracts can read and write a live CLOB. This course builds the next openhl primitive: the **funding state machine** that drives perpetual-contract funding payments.

By the end of this course, you'll have shipped:

- **3 source files / ~635 LOC** in a new \`openhl-funding\` crate.
- **22 tests passing**: 20 hand-traced + 2 proptest (premium antisymmetry + balanced-book zero-sum).
- **3 building blocks**: a fixed-point types module, a pure compute module (premium / rate / settlement), and a tick-gating clock state machine.
- **Two enforced invariants on the clock**: at most one settlement per interval; no catch-up after long gaps.

You'll understand:

- Why floating-point arithmetic is a network-fork hazard in consensus systems.
- The Hyperliquid funding-rate shape: premium → rate → settlement, with divisor + cap.
- How fixed-point integers scaled by \`RATE_SCALE = 1_000_000_000\` (parts-per-billion) get you 9 decimal digits of precision without consensus risk.
- Why pure state machines + saturating arithmetic are the right shape for consensus-critical math.
- Why the clock advances to \`now\` (not to \`last_settled + interval\`) — and the design trade-off that encodes.

## Why funding matters (1-paragraph perp recap)

Perpetual futures don't expire. So how does the mark price stay anchored to the spot/index price? Funding payments. When mark > index (longs are overpaying relative to spot), longs pay shorts on a fixed cadence — typically every interval (HL: 1 hour). When mark < index, shorts pay longs. The premium \`(mark - index) / index\` gets divided by a \`divisor\` (HL: 8) to derive a per-interval rate, then **capped** at a network-set absolute max (HL: ±4%/interval) to bound worst-case payments. At each tick, every account with a non-zero position settles \`size × mark × rate\` in quote currency. Longs pay, shorts receive — or vice versa, depending on the sign of the premium.

## Why funding can't use floats

A consensus L1 validator must compute *exactly the same* funding rate as every other validator. If two validators disagree on the last bit of a rate, they fork the chain.

Float arithmetic gives different bit patterns across:
- **Compilers** — LLVM may emit FMA (fused multiply-add) on one CPU and split it on another.
- **CPUs** — different rounding modes, different denormal handling.
- **Operations** — \`(a * b) + c\` and \`a * b + c\` can compile to identical-looking IR but produce different LSBs after optimization.

The cost of a one-LSB disagreement on a funding rate is **chain divergence**. Validators on different sides of the fork settle different deltas, balances diverge, the next block won't validate against either chain.

The fix: never use floats. Compute everything in signed integers scaled by \`RATE_SCALE = 1_000_000_000\` (parts-per-billion). \`0.04\` (4%) is \`40_000_000\`. \`0.001\` (0.1%) is \`1_000_000\`. Multiplication needs \`i128\` intermediate to avoid overflow; division comes after.

This is the same constraint Solana's compute budget, Ethereum's EVM, and every other consensus system imposes. **Determinism is the whole game.**

## The 12 lessons

### Module 0 — Orientation
- **L0** (this lesson) — Why funding, why fixed-point, why state machine.

### Module 1 — Determinism + types (L1-L3)
- **L1** — \`RATE_SCALE = 1e9\`: fixed-point scheme, why integers, what 9 decimal digits buys you.
- **L2** — Money types: \`MarkPrice\`, \`IndexPrice\`, \`Premium\`, \`Notional\`. Why each is its own newtype, not just \`i64\`.
- **L3** — Position types: \`PositionSize\`, \`Position\`, \`Settlement\`, \`FundingParams\`. The HL defaults and what each parameter encodes.

### Module 2 — Pure compute (L4-L7)
- **L4** — \`compute_premium\`: the \`(mark - index) / index\` derivation. Tests for sign symmetry.
- **L5** — \`saturate_i128_to_i64\` + overflow philosophy. Why saturate, why not panic.
- **L6** — \`compute_rate\`: divisor, cap, HL-style defaults. The clamp behavior.
- **L7** — \`apply_funding\`: longs-pay-shorts sign convention. Balanced-book zero-sum invariant.

### Module 3 — Clock state machine (L8-L10)
- **L8** — \`FundingClock\` structure + \`tick()\` interface.
- **L9** — Interval-gating invariant: at most one settlement per interval. Tests at the boundary.
- **L10** — No-catch-up invariant: 10-interval gap settles ONCE, not ten times. Why.

### Module 4 — Capstone (L11)
- **L11** — Synthesis. Bridge integration preview (where funding plugs into \`LiveRethEvmBridge\`). Honest deferred: oracle, liquidations, basis-vs-fixed funding.

## SHA pinning per module

Every lesson cites the openhl commit it builds against. For this course, all 12 lessons cite **Stage 8b \`cd94137\`** — funding is a single self-contained commit. (Compare to course 8 which spanned 5 commits across Stage 9a-9d.) The clean SHA mapping means the answer-key diff at the end of L11 is \`crates/funding/\` byte-identical against \`cd94137\`.

| Module | Lessons | SHA |
|---|---|---|
| 0 | L0 | \`cd94137\` |
| 1 | L1-L3 | \`cd94137\` |
| 2 | L4-L7 | \`cd94137\` |
| 3 | L8-L10 | \`cd94137\` |
| 4 | L11 | \`cd94137\` |

## Prerequisites

To get the most from this course you should have:

- **Course 6 (openhl-consensus) and course 7 (openhl-clob)** in your head as conceptual background — the funding state machine consumes \`AccountId\` (course 7) and is targeted at the bridge built in courses 6+7. **You can skip course 8 (precompiles) and still follow this course** — funding is pure state-machine math, not EVM-side wiring.
- **Comfort with i128 arithmetic in Rust** — at least one prior \`as i128\` upcast for overflow avoidance in your bag.
- **A passing familiarity with perpetual-futures funding mechanics.** If you've never traded a perp, the 1-paragraph recap above is enough. If you've traded a perp on Hyperliquid, you're set.
- **No EVM-specific knowledge.** This course doesn't touch precompiles, contracts, or RPC.

You do NOT need:
- A running openhl node (the funding crate has zero I/O).
- Solana or any other L1 experience.
- Quantitative finance background — the math here is straightforward fixed-point arithmetic.

## Setup

\`\`\`bash
# In your openhl workspace root:
cd ~/code/my-openhl
git checkout main
cargo build --workspace  # baseline — should pass before L1
\`\`\`

Reference checkout (for the answer-key diff at the end of each lesson):

\`\`\`bash
cd ~/code/openhl-reference  # separate checkout from your work tree
git checkout cd94137
\`\`\`

(Or use the same workspace and \`git stash\` between lookups. Either works.)

## Course style

Each lesson follows the build-along format established in courses 6-8:
- **Goal** — what passes / what's built by the end.
- **Recap** — where the previous lesson left off.
- **Plan** — the specific edits, numbered.
- **Predict** callouts (🛑 with "Before scrolling...") — questions before answers, so the answers stick.
- **Anti-fluency** callouts (🛑 with common misconceptions named explicitly) — preempt the "couldn't we just...?" reflex.
- **Walk-through** — step-by-step code edits with explanation per change.
- **Test** — the \`cargo test\` command to run + expected output.
- **Design reflection** — 3-5 load-bearing decisions encoded in this lesson's code.
- **Answer key** — \`git diff\` against the openhl reference SHA.
- **Common questions** — 3-5 questions with grounded answers.

The math content (especially modules 2-3) is more concept-heavy than code-heavy compared to course 8. Plan to **slow down at the formulas** — they're short, but they need to compute the right thing for every input you can imagine. **A perp funding bug doesn't crash; it silently shifts wealth.**

## Ready

Onward to L1, where we set up the \`RATE_SCALE\` constant and the fixed-point scheme that everything else builds on.`,
                },
              ],
            },
          },
          {
            title: "Determinism + types",
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: "Lesson 1 — RATE_SCALE — the constant that defends consensus",
                  slug: "openhl-funding-rate-scale-en",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 25,
                  xpReward: 50,
                  content: `# Lesson 1 — \`RATE_SCALE\` — the constant that defends consensus

## Goal

By the end of this lesson:

\`\`\`bash
cargo build -p openhl-funding
\`\`\`

…compiles. The \`openhl-funding\` crate now has:

- **Cargo.toml** wiring an \`openhl-clob\` dependency (we'll need \`AccountId\` from there later, but the dep goes in now so it's not a surprise at L3) and a \`[dev-dependencies]\` block ready for \`proptest\` (used at L4 / L7).
- **\`src/types.rs\`** — newly created, containing the module doc + \`pub const RATE_SCALE: i64 = 1_000_000_000\`. Nothing else yet.
- **\`src/lib.rs\`** — was empty, now declares \`pub mod types;\` + re-exports \`RATE_SCALE\` at the crate root.

That's the lesson. **One constant, the most important constant in the entire crate.** Every rate, every premium, every settlement in the next 10 lessons will be expressed in terms of \`RATE_SCALE\`. Get this right and the rest of the math is straightforward; get it wrong and validators fork.

There are no tests in L1 — \`RATE_SCALE\` is a value, not a behavior. L2's first money type will get the first test.

## Recap

After L0:
- You understand why funding payments exist (mark/index drift correction).
- You understand why floats are a consensus fork hazard.
- The funding crate scaffold (Cargo.toml + empty \`src/lib.rs\`) was already in your workspace from before Stage 8b.

L1 turns the empty crate into a real crate with one publicly-visible value.

## Plan

Three edits:

1. **\`crates/funding/Cargo.toml\`** — add \`openhl-clob = { path = "../clob" }\` to \`[dependencies]\`, add a new \`[dev-dependencies]\` block with \`proptest\`.
2. **Create \`crates/funding/src/types.rs\`** — module doc explaining the determinism rationale + \`RATE_SCALE\` constant.
3. **\`crates/funding/src/lib.rs\`** — was empty; add the crate doc + \`pub mod types;\` + \`pub use types::RATE_SCALE;\` re-export.

That's it. Compile, see green, move on.

> 🛑 **Predict.** Before scrolling: \`RATE_SCALE\` is \`1_000_000_000\` = \`1e9\` = parts-per-billion. Why not \`1_000_000\` (parts-per-million, 6 digits) or \`1_000_000_000_000\` (parts-per-trillion, 12 digits)? Hint: think about what range of rates you need to represent, and what i64 can hold.

(Answer: **i64 max is ~9.2e18.** With \`RATE_SCALE = 1e9\`, a raw value of \`1e18\` represents \`1e9\` = a billion. We don't need rates in the billion range — funding rates are typically \`0.0001\` to \`0.04\` per interval. **\`RATE_SCALE = 1e9\` gives 9 decimal digits of precision with massive headroom**: \`40_000_000\` (\`0.04\`, the HL cap) is 11 orders of magnitude below \`i64::MAX\`. Going to \`1e12\` (parts-per-trillion) would buy more precision but cost headroom — multiplying two \`1e12\`-scaled values would need \`i256\` to stay safe. Going to \`1e6\` would save no real headroom and lose meaningful precision when a funding rate is \`0.0001%\` = \`10\` ppb. **\`1e9\` is the sweet spot for fixed-point rates in i64.**)

## Walk-through

### Step 1: Update Cargo.toml

Open \`crates/funding/Cargo.toml\`. Currently it looks like:

\`\`\`toml
[package]
name         = "openhl-funding"
version      = { workspace = true }
edition      = { workspace = true }
rust-version = { workspace = true }
license      = { workspace = true }
repository   = { workspace = true }
authors      = { workspace = true }

[dependencies]

[lints]
workspace = true
\`\`\`

Update to:

\`\`\`toml
[package]
name         = "openhl-funding"
version      = { workspace = true }
edition      = { workspace = true }
rust-version = { workspace = true }
license      = { workspace = true }
repository   = { workspace = true }
authors      = { workspace = true }

[dependencies]
openhl-clob = { path = "../clob" }

[dev-dependencies]
proptest = { workspace = true }

[lints]
workspace = true
\`\`\`

Two changes:

1. **\`openhl-clob = { path = "../clob" }\`** in \`[dependencies]\`. The funding crate will need \`AccountId\` from \`openhl-clob\` (it appears in \`Position\` at L3). Adding the dep now keeps the diff focused at L3. **Cost: ~0** — declaring a path dep doesn't recompile anything until the first \`use\`.
2. **\`[dev-dependencies]\` block** with \`proptest\`. Used at L4 (premium antisymmetry test) and L7 (balanced-book zero-sum). Same logic: declare the dev-dep now, use it later. Production builds don't include proptest.

> 🛑 **Anti-fluency.** "Why not also add \`openhl-clob\` as a dev-dependency, since tests use it too?" **Because the production code uses \`openhl_clob::AccountId\` in \`Position\`, not just tests.** If \`AccountId\` were test-only we'd dev-dep it; since it's part of the production type signature, it has to be a regular dep. Dev-deps are only for things the tests pull in *that production never touches*.

### Step 2: Create \`src/types.rs\`

Create \`crates/funding/src/types.rs\`. The file doesn't exist yet — it's brand new in this lesson. Initial content:

\`\`\`rust
//! Core types for the funding state machine.
//!
//! Pure data — no I/O, no allocation beyond what's needed for settlements.
//! Every type is \`Copy\`-friendly (or, in the case of \`Position\`, \`Clone +
//! Copy\`) so callers can pass snapshots without lifetime gymnastics.
//!
//! ### Why fixed-point integers, not floats
//!
//! Consensus determinism — every validator must compute the *same* funding
//! rate from the *same* inputs. Float arithmetic gives different bit patterns
//! across compilers and CPUs (FMA, rounding mode, denormal handling); the
//! moment two validators disagree on a single LSB they fork. We use signed
//! integers scaled by [\`RATE_SCALE\`] (parts-per-billion) for rates and
//! premiums, and a separate \`Notional\` type for quote-currency deltas.

/// Scale factor for [\`FundingRate\`] and [\`Premium\`]. A raw value of
/// \`RATE_SCALE\` represents \`1.0\` (i.e., 100%). With \`1e9\` we get 9 decimal
/// digits of precision — more than enough for funding rates that typically
/// sit in the ±0.01% to ±0.05% per interval band.
pub const RATE_SCALE: i64 = 1_000_000_000;
\`\`\`

Four things to notice about this 15-line file:

1. **Module doc has a "Why fixed-point integers, not floats" section.** This is the load-bearing rationale for the entire crate. The next engineer reading \`types.rs\` six months from now needs to see this explanation at the top — not buried in a commit message.
2. **The \`[\`FundingRate\`]\` and \`[\`Premium\`]\` cross-references.** Those types don't exist yet (L2 / L3). Rustdoc will warn about broken links during the L1 build. **Tolerate the warnings** — they resolve as we add types in L2/L3. If you really want zero warnings now, use \`[FundingRate]\` (no backticks) in plain text rather than \`[\`FundingRate\`]\` — but the cross-reference style matches the source convention.
3. **\`pub const RATE_SCALE: i64 = 1_000_000_000\`** — \`i64\`, not \`u64\`. Rates and premiums are *signed* (longs paying = positive premium, shorts paying = negative). Signed integers also let the arithmetic in \`compute.rs\` flow without sign-checking, since \`i128\` intermediates absorb the products naturally.
4. **The doc says \`1.0\` = \`100%\`.** That's a unit-of-account decision. A raw \`RATE_SCALE\` value (1e9) means a 100% funding rate per interval. \`40_000_000\` means 4%. \`1_000_000\` means 0.1%. **Read it as parts-per-billion of "1 unit notional."**

> 🛑 **Anti-fluency.** "Couldn't we just use \`f64\` and round the result before sharing across validators?" **Two reasons no.** (1) The intermediate calculations diverge before the final round; by then the damage is done. (2) "Round to N decimal places" itself uses float ops with rounding behavior that varies. **There's no escape hatch from float nondeterminism that's simpler than just using integers.**

### Step 3: Update \`src/lib.rs\`

Open \`crates/funding/src/lib.rs\`. Currently empty (\`e69de29\` blob). Replace with:

\`\`\`rust
//! \`openhl-funding\` — funding-rate state machine.
//!
//! Pure state machine: no I/O, no async, no networking. Funding is applied
//! deterministically on a fixed cadence (see [\`FundingClock\`]); every tick is
//! a pure function over \`(now, mark, index, positions)\` → settlements.
//!
//! ### Hyperliquid-shape funding, in one paragraph
//!
//! Perpetual contracts don't expire, so the mark price can drift arbitrarily
//! from the spot ("index") price. Funding payments push it back: when mark >
//! index (longs are overpaying), longs pay shorts; when mark < index, shorts
//! pay longs. The premium \`(mark - index) / index\` is divided by a
//! per-day-interval count (HL: 8 — one settlement every 3 hours) to derive a
//! per-interval rate, capped at a network-set absolute max. At each tick
//! every account with an open position settles \`position_size * mark * rate\`
//! in quote currency.
//!
//! Integration with the rest of openhl happens at the EVM bridge: settlement
//! deltas become balance updates that the bridge bundles into payloads. That
//! integration lives in \`crates/evm/\`; the rate math and tick gating are here.

pub mod types;

pub use types::RATE_SCALE;
\`\`\`

Notice what's missing compared to the L11-end version: \`pub mod clock\`, \`pub mod compute\`, the rest of the \`pub use types::{...}\` re-exports. Those come in lessons L4-L10 as we add the modules. **L1 lib.rs is the minimum that compiles.**

The crate-level doc (\`//! ...\`) explains:
- This is a pure state machine. No I/O.
- A 1-paragraph HL funding recap — for any reader who lands on the crate root without context.
- Where integration happens (the bridge, not here).

The cross-reference \`[\`FundingClock\`]\` will be broken until L8 adds it; same handling as types.rs cross-refs.

> 🛑 **Predict.** What happens if you write \`pub mod compute;\` here without creating \`compute.rs\`? Hint: think about what \`pub mod foo;\` actually does.

(Answer: **Compile error.** \`pub mod compute;\` tells the compiler to find either \`compute.rs\` or \`compute/mod.rs\` in the same directory. With neither present, you get \`error[E0583]: file not found for module 'compute'\`. That's why we add the \`pub mod\` declarations *as we create each file*, not all upfront.)

### Step 4: Compile

\`\`\`bash
cargo build -p openhl-funding
\`\`\`

Expected output:

\`\`\`
   Compiling openhl-funding v0.1.0 (/Users/.../my-openhl/crates/funding)
warning: unresolved link to \`FundingRate\`
warning: unresolved link to \`Premium\`
warning: unresolved link to \`FundingClock\`
    Finished \`dev\` profile [unoptimized + debuginfo] in 0.5s
\`\`\`

Three rustdoc warnings about unresolved links. Those are expected — the linked types arrive in L2/L3 (types.rs) and L8 (clock.rs). **All three resolve by L11.** Don't suppress them with \`#[allow(rustdoc::broken_intra_doc_links)]\` — they're useful "you still need to add X" indicators while building.

Common errors:

- **\`error[E0463]: can't find crate for 'openhl_clob'\`** — you forgot the \`openhl-clob = { path = "../clob" }\` line in Cargo.toml. We don't use \`openhl_clob\` in L1 code, but if you preempted L3 and added the \`use openhl_clob::AccountId\` import to types.rs without the dep, this fires.
- **\`error[E0583]: file not found for module 'clock'\`** or \`'compute'\` — you preemptively added \`pub mod clock;\` to lib.rs. Remove it; we'll add it back in L8.
- **\`error: failed to parse manifest\`** — Cargo.toml syntax. Double-check the \`[dev-dependencies]\` block isn't typo'd as \`[dev-dependences]\`.

## Design reflection

Three load-bearing decisions in this lesson:

1. **\`RATE_SCALE = 1e9\` is i64, not u64.** Signed because rates are signed. The arithmetic in \`compute.rs\` will use \`i128\` intermediates to absorb products; \`u64\` would complicate sign handling for no benefit.

2. **Module doc comment is the rationale, not a tutorial.** The "Why fixed-point integers, not floats" paragraph explains *why* this design exists. A reader who lands on \`types.rs\` in 6 months needs the *why* — the *how* is in the code itself. **Doc comments earn their keep when they preempt the questions a future reader would ask.**

3. **\`pub use types::RATE_SCALE\` at the crate root.** Callers can write \`use openhl_funding::RATE_SCALE;\` instead of \`use openhl_funding::types::RATE_SCALE;\`. The shorter path is the canonical one; the module path is internal. **Re-export at the crate root for anything callers actually use.**

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/Cargo.toml ./crates/funding/Cargo.toml
diff -u ~/code/my-openhl/crates/funding/src/types.rs ./crates/funding/src/types.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
\`\`\`

After L1:
- **Cargo.toml** matches Stage 8b exactly.
- **types.rs** matches the *first ~30 lines* of Stage 8b's types.rs — module doc + \`RATE_SCALE\`. Everything below (the type definitions) is L2/L3.
- **lib.rs** is shorter than Stage 8b's lib.rs — only \`pub mod types;\` + the one \`pub use\`. The other module decls and re-exports come in later lessons.

Return:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: Why declare \`[dev-dependencies] proptest\` now if L1 has no tests?**
Because the Cargo.toml is a single diff target. Adding proptest at L4 would mean two Cargo.toml touches across the course; doing it once at L1 means the file stops changing after this lesson. **Cargo.toml stability is worth a small unused dep declaration.**

**Q: What's a "parts-per-billion" interpretation in practice?**
A funding rate of \`1_250_000\` raw means \`0.00125\` (0.125% per interval). Read it as "1,250,000 out of 1,000,000,000" — i.e., 0.125%. With HL's 8 settlements per day and a 4% cap, the range of values you'll see in practice is \`±40_000_000\` raw = \`±4%/interval\` = \`±32%/day\` worst case. **All comfortably representable in i64.**

**Q: Could we change \`RATE_SCALE\` later without breaking consumers?**
**No.** \`RATE_SCALE\` is a chain-consensus constant. Every persisted balance, every historical settlement, every test fixture is calibrated against \`RATE_SCALE = 1e9\`. Changing it requires a coordinated network upgrade. **Treat it as immutable post-deployment.** This is why we set it once, in a \`const\`, at the start of the crate.

**Q: Why no test for \`RATE_SCALE\`?**
What would the test assert? \`assert_eq!(RATE_SCALE, 1_000_000_000)\` is tautological — it tests the constant against itself. The constant's meaning lives in how *other* code uses it. **L2's first money type gets the first meaningful test.**

## Next lesson (L2)

L2 adds the four "money types" — \`MarkPrice\`, \`IndexPrice\`, \`Premium\`, \`Notional\`. Each is a newtype wrapping a primitive. The teaching focus shifts from "why fixed-point" to "why newtypes": preventing accidental cross-feeding (e.g., passing an \`IndexPrice\` where a \`MarkPrice\` is expected). The four types add ~30 lines to \`types.rs\` and prove out the newtype pattern that the remaining types (L3) will follow.`,
                },
                {
                  title: "Lesson 2 — Money types — newtypes for prices, premiums, and notional",
                  slug: "openhl-funding-money-types-en",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 30,
                  xpReward: 60,
                  content: `# Lesson 2 — Money types — newtypes for prices, premiums, and notional

## Goal

By the end of this lesson:

\`\`\`bash
cargo build -p openhl-funding
\`\`\`

…still compiles. \`types.rs\` grows from \`RATE_SCALE\` alone to \`RATE_SCALE\` + four newtypes:

- **\`MarkPrice(pub u64)\`** — perpetual mark price in minor units. Unsigned because prices can't be negative.
- **\`IndexPrice(pub u64)\`** — off-chain oracle reference price. Same shape, different *meaning*.
- **\`Premium(pub i64)\`** — signed \`(mark - index) / index\`, scaled by \`RATE_SCALE\`. Positive when longs are overpaying.
- **\`Notional(pub i64)\`** — signed quote-currency delta. Positive = account receives, negative = pays.

Each is \`Copy + Default + PartialEq + Eq + PartialOrd + Ord + Hash + Debug\`. No tests yet — these types have no behavior beyond the wrapper. **L4's \`compute_premium\` is the first lesson where these types get exercised in code that can have bugs.**

The teaching point of this lesson isn't the math — it's the **newtype pattern**. Why wrap a \`u64\` instead of using \`u64\` directly? L2 is the answer to that question, demonstrated on 4 concrete types.

## Recap

After L1:
- \`RATE_SCALE = 1_000_000_000\` is the load-bearing constant.
- \`types.rs\` exists with module doc + \`RATE_SCALE\`.
- \`lib.rs\` re-exports \`RATE_SCALE\` at the crate root.

L2 fills \`types.rs\` with the first half of the actual types (the "money" half). L3 fills the second half (positions, settlement, params).

## Plan

Two edits:

1. **\`crates/funding/src/types.rs\`** — append 4 newtypes after \`RATE_SCALE\`. Doc comments explain each type's role + the invariant it encodes.
2. **\`crates/funding/src/lib.rs\`** — extend the \`pub use types::{...}\` line to re-export the 4 new types.

That's it. No \`compute.rs\`, no \`clock.rs\`, no tests. **Pure type definitions.**

> 🛑 **Predict.** Before scrolling: we're about to define \`pub struct MarkPrice(pub u64);\`. Why is the inner field \`pub\`? What if it were private with a \`#[must_use] pub fn new(v: u64) -> Self\` constructor? Hint: think about what callers in \`compute.rs\` will need.

(Answer: **Callers in \`compute.rs\` need to do arithmetic on the raw value** — \`i128::from(mark.0) - i128::from(index.0)\`. Making the field private + a \`.value()\` getter would require \`mark.value()\` instead of \`mark.0\` everywhere. **\`pub\` on the inner field is the openhl convention for newtypes that exist purely to prevent cross-feeding** — no validation, no invariants beyond the type system. Compare to \`clob::Price(pub u64)\` and \`clob::Qty(pub u64)\` — same shape, same reasoning. **The newtype's job is to make \`compute_premium(index, mark)\` a type error, not to validate the values.**)

## Walk-through

### Step 1: Append the 4 newtypes to \`types.rs\`

Open \`crates/funding/src/types.rs\`. After the existing \`RATE_SCALE\` constant, add:

\`\`\`rust
/// Mark price in minor units. Same scale convention as \`clob::Price\`, but a
/// distinct type so callers can't accidentally feed an orderbook price into
/// the funding math where an index/oracle price is expected.
///
/// \`MarkPrice\` is a single u64 not a signed-fixed-point, because prices are
/// always positive (zero or negative price would be a system invariant
/// violation handled upstream, not here).
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct MarkPrice(pub u64);

/// Index price (off-chain oracle reference). Same scale as \`MarkPrice\`.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct IndexPrice(pub u64);

/// Premium = \`(mark - index) / index\`, scaled by [\`RATE_SCALE\`].
///
/// Sign convention: positive when mark > index (longs are overpaying,
/// funding will be positive → longs pay shorts).
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Premium(pub i64);

/// Signed quote-currency delta. Positive = account receives, negative =
/// account pays. Funding settlement produces one [\`Notional\`] per non-flat
/// position per tick.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Notional(pub i64);
\`\`\`

Four types, each ~5 lines. Let me walk through what's encoded in each.

#### \`MarkPrice(pub u64)\` — and the case against signed prices

Why \`u64\`, not \`i64\`? Because a *negative price* doesn't have a meaning in the funding math. A spot or perp price below zero is a system invariant violation that should never reach the funding crate — and if it did, the right response is "the upstream layer is broken, halt and investigate," not "compute funding against a negative price."

The doc says it explicitly: *"zero or negative price would be a system invariant violation handled upstream, not here."* That's the right place to draw the line. **The funding crate trusts that its inputs are well-formed; it doesn't re-validate them.** Re-validation everywhere is a common over-engineering mistake; the funding crate's job is the math, not the input sanitization.

> 🛑 **Anti-fluency.** "Shouldn't we at least return an error on \`MarkPrice(0)\`?" **No.** \`MarkPrice(0)\` could mean "an asset that genuinely has zero spot price" (extreme tail, rare but real) or "the oracle hasn't delivered a price yet" (boot state). Compute_premium handles the second case explicitly (returns \`Premium(0)\` when \`index == 0\`). The first case is rare enough that the right action is to settle zero funding, which \`compute_premium\` produces naturally. **No error path needed.**

#### \`IndexPrice(pub u64)\` — same shape, different *meaning*

\`IndexPrice\` is structurally identical to \`MarkPrice\`. Same field, same derives, same range. **The difference is purely in the type system.** A function signature \`compute_premium(mark: MarkPrice, index: IndexPrice) -> Premium\` rejects \`compute_premium(IndexPrice(100), MarkPrice(100))\` at compile time. Without the newtypes, both arguments would be \`u64\`, and an argument-order bug would silently produce an inverted premium.

**This is the entire point of the newtype pattern.** It costs ~5 lines per type and prevents a class of bugs that *would otherwise be invisible until production*.

> 🛑 **Anti-fluency.** "Couldn't we use type aliases instead? \`type MarkPrice = u64; type IndexPrice = u64;\`" **No — type aliases don't create new types**, they just rename existing ones. \`type MarkPrice = u64\` and \`type IndexPrice = u64\` are both \`u64\`, and \`compute_premium(some_index, some_mark)\` would compile silently. **Type aliases are documentation, not safety.** Use them for long generic types where readability suffers (\`type FillSink = Arc<Mutex<Vec<Fill>>>\`) — not for distinguishing semantically different values.

#### \`Premium(pub i64)\` — and why it's signed

A premium can be negative when mark < index (shorts are overpaying). The signed representation lets the rest of the math flow without explicit sign handling: \`compute_premium\` returns a signed number, \`compute_rate\` divides + clamps it, \`apply_funding\` multiplies it into a settlement. **At no point does anyone need to check "which direction is this?"** — the sign carries the answer.

The doc says: *"Sign convention: positive when mark > index (longs are overpaying, funding will be positive → longs pay shorts)."* That's a load-bearing line. Anyone reading downstream code will need to remember this convention. **A doc comment that names the sign convention is what separates "correct math" from "math you have to re-derive every time."**

#### \`Notional(pub i64)\` — quote-currency delta, signed from the *account's* perspective

\`Notional\` represents the change to a single account's quote balance from a single settlement. Sign convention: *positive = account receives, negative = account pays.* So a long position with a positive funding rate produces \`Notional(negative)\`; a short position with a positive funding rate produces \`Notional(positive)\`.

**The sign is from the account's viewpoint**, not from the market's. This matters at the bridge integration layer (course 10) where a \`Notional(-12)\` becomes "subtract 12 from this account's quote balance." If the sign were market-centric, the bridge would need to flip it before applying.

### Step 2: Update \`lib.rs\` re-exports

Open \`crates/funding/src/lib.rs\`. The current \`pub use\` line is:

\`\`\`rust
pub use types::RATE_SCALE;
\`\`\`

Change to:

\`\`\`rust
pub use types::{IndexPrice, MarkPrice, Notional, Premium, RATE_SCALE};
\`\`\`

Alphabetical order for the imports — same as Stage 8b's lib.rs. Callers can now write:

\`\`\`rust
use openhl_funding::{MarkPrice, IndexPrice};
\`\`\`

instead of:

\`\`\`rust
use openhl_funding::types::{MarkPrice, IndexPrice};
\`\`\`

**Crate-root re-export for everything callers actually use.** Module paths are internal.

> 🛑 **Anti-fluency.** "Couldn't we use \`pub use types::*\` to re-export everything?" **You could, but it leaks the internal types list to the public API surface.** Today we have 4 types in \`types.rs\`; if we ever add a private helper like \`internal_FillSinkCachedView\` and forget the \`pub\` modifier, \`pub use types::*\` would silently expose it. **Explicit re-exports are a public-API checklist.** Each re-exported name is a deliberate decision.

### Step 3: Compile

\`\`\`bash
cargo build -p openhl-funding
\`\`\`

Expected output:

\`\`\`
   Compiling openhl-funding v0.1.0 (/Users/.../my-openhl/crates/funding)
warning: unresolved link to \`FundingRate\`
warning: unresolved link to \`FundingClock\`
    Finished \`dev\` profile [unoptimized + debuginfo] in 0.4s
\`\`\`

Two rustdoc warnings now (down from three at L1). The \`[Premium]\` link in \`RATE_SCALE\`'s doc resolves; the \`[FundingRate]\` and \`[FundingClock]\` links still don't. **Expected progress** — L3 will add \`FundingRate\` and clear the second warning.

Common errors:

- **\`error[E0381]: missing field 'value' in initializer of MarkPrice\`** — you forgot \`pub\` on the inner field and wrote \`MarkPrice { value: u64 }\` instead of \`MarkPrice(pub u64)\`. Use the tuple-struct form per the openhl convention.
- **\`error[E0277]: 'i64' is not 'u64'\`** — you wrote \`Premium(pub u64)\` instead of \`Premium(pub i64)\`. Premium is signed; check the inner type.
- **Missing derive** — you forgot one of the derives. The full set is \`Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash\`. \`Default\` is needed because tests will use \`MarkPrice::default()\` in some L4 fixture builders.

## Design reflection

Three load-bearing decisions in this lesson:

1. **Newtype pattern over type aliases or raw primitives.** The ~5-line cost per type buys compile-time prevention of argument-order bugs that would otherwise be invisible. **Cheap insurance for a high-cost class of bugs.**

2. **Public inner field (\`pub u64\`).** Validation isn't this crate's job; preventing cross-feeding is. The inner field is \`pub\` to keep arithmetic ergonomic in \`compute.rs\`. **The newtype defends against type confusion, not bad values.**

3. **Sign conventions live in doc comments at the type definition.** "Positive when mark > index, longs pay shorts" — that sentence in \`Premium\`'s doc is the single point of truth for the sign convention. Every consumer relies on it. **Sign conventions are the most-misremembered piece of any numerical type; pin them in the doc at definition site.**

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/types.rs ./crates/funding/src/types.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
\`\`\`

After L2:
- **types.rs** matches Stage 8b through \`Notional\` (the first 4 newtypes). The next types — \`FundingRate\`, \`PositionSize\`, \`Position\`, \`Settlement\`, \`FundingParams\` — are L3.
- **lib.rs** has the 4-type re-export. The full Stage 8b re-export adds 5 more names (\`FundingParams\`, \`FundingRate\`, \`Notional\` is already there, \`Position\`, \`PositionSize\`, \`Settlement\`). All come in L3.

Return:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: Why are \`MarkPrice\` and \`IndexPrice\` \`u64\` but \`Premium\` and \`Notional\` are \`i64\`?**
Because prices are always positive (negative price would be a system invariant violation), but **premiums and notionals can be negative**. A premium is negative when mark < index. A notional delta is negative when the account pays (vs. receives). Signed integers represent both directions naturally; unsigned would require a separate "direction" field or pair of types.

**Q: Why \`Default\` on these types? When would default values be useful?**
\`Default::default()\` returns \`MarkPrice(0)\`, \`Premium(0)\`, etc. Useful in test fixtures: \`let mark: MarkPrice = Default::default();\` is shorter than \`MarkPrice(0)\`. Also enables \`#[derive(Default)]\` on containing structs that use these types. **Cheap derive; no behavioral cost.**

**Q: Should \`Premium\` and \`Notional\` implement \`Add\` / \`Sub\` / \`Mul\`?**
Tempting — \`Premium(5) + Premium(3) == Premium(8)\` reads nicely. But Stage 8b chose not to: the math operations in \`compute.rs\` need to upcast to \`i128\` for overflow safety, and providing \`Add\` for \`Premium\` would tempt callers to use it without the i128 dance. **The crate's API contract is: do arithmetic on the inner field with explicit i128 upcasting.** That contract is easier to enforce when the types don't have arithmetic ops.

**Q: Why aren't there tests for these types?**
What would the test assert? \`assert_eq!(MarkPrice(100), MarkPrice(100))\` tests \`PartialEq\` (a derive). \`assert_eq!(MarkPrice(100).0, 100)\` tests the pub field (a language feature). **Newtypes that only wrap a primitive have no behavior to test.** L4's \`compute_premium\` is where these types start participating in code that could have bugs.

## Next lesson (L3)

L3 finishes the type roster: \`FundingRate(i64)\`, \`PositionSize(i64)\`, \`Position { account, size }\`, \`Settlement { account, delta }\`, \`FundingParams { interval_secs, rate_cap, divisor }\`. The teaching focus shifts from "newtype pattern" to "the parameter object pattern" (\`FundingParams\`) and the **HL-style defaults** — why 8 settlements per day, why 4% cap. The \`Position\` struct introduces the \`AccountId\` dependency from \`openhl_clob\` that we set up in L1's Cargo.toml.`,
                },
                {
                  title: "Lesson 3 — Position types — finishing the roster + HL defaults",
                  slug: "openhl-funding-position-types-en",
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 35,
                  xpReward: 70,
                  content: `# Lesson 3 — Position types — finishing the roster + HL defaults

## Goal

By the end of this lesson:

\`\`\`bash
cargo build -p openhl-funding
\`\`\`

…still compiles, with zero rustdoc warnings. \`types.rs\` is **complete** — all nine types from Stage 8b's roster are in place:

- **\`FundingRate(pub i64)\`** — per-interval rate after divisor + cap. Same scale as \`Premium\`.
- **\`PositionSize(pub i64)\`** — signed: positive = long, negative = short, zero = flat.
- **\`Position { account, size }\`** — per-account snapshot. Activates the \`openhl_clob::AccountId\` dependency.
- **\`Settlement { account, delta }\`** — output of \`apply_funding\`: who pays/receives, how much.
- **\`FundingParams { interval_secs, rate_cap, divisor }\`** + \`hyperliquid_default()\` — network-level configuration with HL-shape defaults.

This closes **Module 1**. After L3:
- All types defined; no behavior yet.
- Cross-references resolve in rustdoc (no more "unresolved link" warnings).
- The crate is a pure data-types library — useful as documentation, not yet doing math.

**Module 2 (L4-L7) starts the pure compute** — \`compute_premium\`, \`compute_rate\`, \`apply_funding\`. The first tests live there.

The teaching focus this lesson is the **parameter-object pattern** and the HL-default rationale. Why bundle three parameters into a \`FundingParams\` struct instead of passing them as positional args? Why 1-hour interval, why 4% cap, why divisor of 8?

## Recap

After L2:
- 4 money newtypes (\`MarkPrice\`, \`IndexPrice\`, \`Premium\`, \`Notional\`) defined.
- \`types.rs\` has module doc + \`RATE_SCALE\` + 4 types.
- \`lib.rs\` re-exports 5 names (the constant + 4 types).
- 2 unresolved rustdoc warnings remain (\`FundingRate\`, \`FundingClock\`).

L3 adds 5 more types (closing the type roster) + the \`openhl_clob::AccountId\` import.

## Plan

Three edits:

1. **\`crates/funding/src/types.rs\`** — add the \`openhl_clob::AccountId\` import at the top, then append 5 type definitions (\`FundingRate\`, \`PositionSize\`, \`Position\`, \`Settlement\`, \`FundingParams\` + \`hyperliquid_default\`).
2. **\`crates/funding/src/lib.rs\`** — extend the re-export to include all 9 names.
3. **Verify**: \`cargo build -p openhl-funding\` compiles with **zero warnings**.

> 🛑 **Predict.** Before scrolling: we're about to define \`FundingParams { interval_secs: u64, rate_cap: FundingRate, divisor: u32 }\` instead of having \`compute_rate(premium, interval_secs, rate_cap, divisor)\`. **Why bundle these three values into a struct?** Hint: think about how many call sites for \`compute_rate\` exist, and what happens when we add a fourth parameter later.

(Answer: **Parameter-object pattern preserves call-site stability across config evolution.** \`compute_rate(premium, params)\` is one positional arg + one struct. If we later add \`min_settlement_threshold\` to the funding config, the function signature stays \`compute_rate(premium, params)\` — only the \`FundingParams\` struct grows. Positional-arg variants \`compute_rate(premium, interval, cap, divisor)\` would break every call site at every new parameter. With <5 call sites today (clock + tests) the cost is modest; with 50+ in a mature codebase, the parameter object is essential. **Bundle stable groupings of values together when the grouping itself is a domain concept** — "the funding configuration" is one such concept.)

## Walk-through

### Step 1: Add the \`AccountId\` import

At the top of \`crates/funding/src/types.rs\`, after the module doc but before \`pub const RATE_SCALE\`, add:

\`\`\`rust
use openhl_clob::AccountId;
\`\`\`

This import was set up in L1's Cargo.toml (the \`openhl-clob = { path = "../clob" }\` dep). It activates here because \`Position\` and \`Settlement\` will reference \`AccountId\` as a struct field type.

> 🛑 **Anti-fluency.** "Should we re-export \`AccountId\` from \`openhl-funding\` so callers don't need to import from \`openhl-clob\`?" **No — it's not ours.** \`AccountId\` is \`openhl-clob\`'s type, and callers should import it from where it's defined. Re-exporting it through \`openhl-funding\` would create two import paths for the same thing (\`openhl_clob::AccountId\` vs \`openhl_funding::AccountId\`) and obscure the dependency. **Re-export your own types; let callers import their dependencies' types directly.**

### Step 2: Append \`FundingRate\` after \`Premium\`

After the existing \`Premium\` definition, add:

\`\`\`rust
/// Per-interval funding rate. Same scale as [\`Premium\`]; positive means
/// longs pay shorts. A rate of \`RATE_SCALE / 100\` = 1% per interval.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct FundingRate(pub i64);
\`\`\`

\`FundingRate\` is structurally identical to \`Premium\` — same \`i64\`, same derives. **The reason it's a separate type, not an alias, is that they represent different concepts in the funding pipeline.** A premium is the *raw* mark/index dislocation; a rate is what gets *applied* to positions after divisor + clamp. Code that consumes a premium (\`compute_rate\`) shouldn't accept a rate (which is post-processed); code that consumes a rate (\`apply_funding\`) shouldn't accept a premium (which hasn't been clamped).

**Same shape, different roles, separate types.** This is the newtype pattern doing exactly what it does for \`MarkPrice\` vs \`IndexPrice\`.

### Step 3: Append \`PositionSize\`

After \`FundingRate\`:

\`\`\`rust
/// Signed position size in base units. Positive = long, negative = short,
/// zero = flat. Accounts with zero size aren't included in settlement
/// snapshots — see [\`Position\`].
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct PositionSize(pub i64);
\`\`\`

One signed integer carries three states: long (\`> 0\`), short (\`< 0\`), flat (\`== 0\`). Compare to a 2-field representation:

\`\`\`rust
// Verbose alternative — NOT what we use:
pub struct PositionSize {
    pub direction: Direction,  // Long, Short, Flat
    pub magnitude: u64,
}
\`\`\`

The signed-integer representation is **smaller** (8 bytes vs ~16+), **faster** (no enum dispatch in the hot path), and **simpler at the math layer** (just multiply by \`size.0\`; the sign carries through naturally). The tradeoff: the inner value's sign is implicit. The doc comment names it explicitly: *"Positive = long, negative = short, zero = flat."*

**The note "Accounts with zero size aren't included in settlement snapshots"** is load-bearing. \`apply_funding\` will filter zero-size positions out — they have no economic exposure, so settling them produces a zero delta that adds noise. We'll see that filter in L7.

### Step 4: Append \`Position\`

\`\`\`rust
/// A single account's net position on the market. The funding state machine
/// treats positions as a per-tick *snapshot* — it never owns or mutates
/// them. The owning layer (vault / clearing) is responsible for tracking
/// \`Position\` over time and producing snapshots at each tick.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Position {
    pub account: AccountId,
    pub size: PositionSize,
}
\`\`\`

Two fields, both public. \`account\` lets the settlement output know whose balance to credit/debit. \`size\` lets the rate-application math compute the delta.

**Crucially: no \`entry_price\`, no \`realized_pnl\`, no \`unrealized_pnl\`.** The funding state machine doesn't need to know how the position was opened or what its P&L looks like — it just needs the *current size* to multiply against the current rate. **The simpler the snapshot, the easier it is to produce one upstream.**

> 🛑 **Anti-fluency.** "Shouldn't \`Position\` also carry the entry price, for futures-PnL accounting?" **No — that's the owning layer's job.** The vault or clearing layer tracks entry prices, computes unrealized PnL, etc. The funding crate is downstream of that: it gets a snapshot of *current* positions and applies *current* funding. **Keep the snapshot type narrow; the owning layer can have a wider type that includes everything.**

The doc comment makes the ownership boundary explicit: *"never owns or mutates them. The owning layer is responsible..."* — this is the contract between the funding crate and its callers.

No \`Default\` on \`Position\` — \`AccountId::default()\` would be \`AccountId(0)\`, which is reserved/sentinel in most account systems. **Don't accidentally allow default-construction of an entity-identity-bearing struct.**

### Step 5: Append \`Settlement\`

\`\`\`rust
/// Output of applying a funding rate to one position. The bridge layer
/// translates these into balance updates against each account's quote
/// balance.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Settlement {
    pub account: AccountId,
    pub delta: Notional,
}
\`\`\`

\`Settlement\` is the output type of \`apply_funding\`: one per non-flat position. It carries the account ID (so the bridge knows who) and the delta (so the bridge knows how much).

**Why does \`Settlement\` carry \`account\` again instead of being indexed by position order?** Because \`apply_funding\` filters zero-size positions out, the input position list and the output settlement list have *different lengths*. Indexing by position would require the caller to remember which positions had nonzero size; carrying the account ID in the output decouples them.

**This is the parallel-array vs struct-array tradeoff** — and Stage 8b chose struct-array. The cost is one redundant \`AccountId\` per settlement; the benefit is callers don't need to maintain index correspondence.

### Step 6: Append \`FundingParams\` + \`hyperliquid_default\`

\`\`\`rust
/// Network parameters that govern funding cadence and magnitude.
///
/// \`divisor\` represents "settlements per day": HL settles 8 times per day,
/// so \`premium / 8\` is the per-interval rate. Higher divisor → smaller rate
/// per tick (and inverse: lower divisor concentrates the same daily target
/// rate into fewer payments).
///
/// \`rate_cap\` is the absolute maximum |rate| per interval. Production
/// networks set this to bound the worst-case payment an extreme oracle
/// dislocation can produce. Zero \`rate_cap\` disables funding entirely.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct FundingParams {
    pub interval_secs: u64,
    pub rate_cap: FundingRate,
    pub divisor: u32,
}

impl FundingParams {
    /// Hyperliquid-style defaults: 1-hour interval, ±4%/hour cap, 8× divisor.
    /// 8× divisor with a 1-hour interval means the *target* daily premium
    /// would be applied across 24 hours' worth of ticks at 1/8 of the premium
    /// each — i.e., 24/8 = 3× the premium per day. That asymmetry is
    /// intentional: HL caps more aggressively than the divisor alone implies.
    #[must_use]
    pub const fn hyperliquid_default() -> Self {
        Self {
            interval_secs: 3600,
            // 4% per interval = 40_000_000 ppb (since 0.04 × 1e9 = 4e7).
            rate_cap: FundingRate(40_000_000),
            divisor: 8,
        }
    }
}
\`\`\`

Three fields, all \`pub\` for the same reason as the newtypes — \`compute_rate\` needs them all directly.

#### Why each HL default

- **\`interval_secs: 3600\`** — 1 hour. HL settles every hour; Binance Futures settles every 8 hours. The 1-hour cadence is short enough that traders feel funding pressure quickly when basis dislocates, long enough that block-time noise doesn't dominate.
- **\`rate_cap: FundingRate(40_000_000)\`** — 4%/interval. With 24 intervals/day this is \`±96%/day\` worst case; with the divisor below, effective worst is much lower. The cap is the *insurance policy* against oracle hijinks: an attacker who can move the index 50% transiently can't extract 50% from the longs in one tick.
- **\`divisor: 8\`** — 8 settlements per day (per HL's spec), but applied across **24** 1-hour intervals. The arithmetic in the doc comment is the load-bearing nuance: \`(premium / 8) × 24 hours = 3 × premium/day\`. **HL's caps are stricter than the divisor alone implies** — the divisor sets the cadence, but the cap binds the worst-case payment.

> 🛑 **Predict.** What's the effective worst-case daily payment with the HL defaults? Hint: \`rate_cap = 4%/hour\`, intervals per day = 24, but the divisor is 8.

(Answer: **\`±96%/day\` if every interval hits the cap.** The cap of 4% per *interval* applies regardless of the divisor. The divisor only affects the per-interval rate *before* clamping. So if the premium is so large that the post-divisor rate exceeds 4%, every hour clamps to 4%, and 24 hourly clamps × 4% = 96% per day. In practice, premiums that drive sustained 4%/interval clamping are pathological — HL has historically seen them only during oracle outages. **The cap is the floor on insurance cost, not the typical funding magnitude.**)

#### Why \`const fn\` on \`hyperliquid_default\`

\`const fn\` lets us write \`static DEFAULT: FundingParams = FundingParams::hyperliquid_default();\` if we ever want a compile-time constant. The cost is zero (it's a no-arg constructor of constants); the benefit is preserving the option.

#### Why \`#[must_use]\`

\`#[must_use]\` triggers a warning if a caller invokes \`hyperliquid_default()\` and discards the result. **For a function whose entire purpose is to produce a value, discarding the result is always a bug** — the warning catches a class of "I forgot to assign" mistakes.

### Step 7: Update \`lib.rs\` re-exports

The current re-export:

\`\`\`rust
pub use types::{IndexPrice, MarkPrice, Notional, Premium, RATE_SCALE};
\`\`\`

Replace with the complete list:

\`\`\`rust
pub use types::{
    FundingParams, FundingRate, IndexPrice, MarkPrice, Notional, Position, PositionSize,
    Premium, Settlement, RATE_SCALE,
};
\`\`\`

Alphabetical order maintained. 10 names total (9 types + \`RATE_SCALE\`). Callers can now write \`use openhl_funding::{FundingParams, Position};\` etc. without going through the \`types\` module.

### Step 8: Compile

\`\`\`bash
cargo build -p openhl-funding
\`\`\`

Expected output:

\`\`\`
   Compiling openhl-funding v0.1.0 (/Users/.../my-openhl/crates/funding)
warning: unresolved link to \`FundingClock\`
    Finished \`dev\` profile [unoptimized + debuginfo] in 0.4s
\`\`\`

**One rustdoc warning remaining** (from L0 we had 3; L1 still 3; L2 had 2; L3 has 1). The last unresolved link is \`FundingClock\` — resolved by L8.

Actually — depending on rustdoc's link-resolution behavior, the \`[FundingRate]\` and \`[Premium]\` cross-refs in the various doc comments may all resolve now (those types now exist). Verify with \`cargo doc -p openhl-funding --no-deps\`. The exact warning count may differ.

Common errors:

- **\`error[E0432]: unresolved import 'openhl_clob::AccountId'\`** — Cargo.toml dep not in place. Re-check L1's \`[dependencies]\` block has \`openhl-clob = { path = "../clob" }\`.
- **\`error: cannot find type 'Notional' in this scope\`** in \`Settlement\` — you didn't import the local type. \`Notional\` is in the same module, no \`use\` needed, but the type name must be spelled exactly.
- **\`error: function calls are not allowed in const fn\`** on \`hyperliquid_default\` — you wrote \`FundingRate::from(40_000_000)\` or similar. Use the tuple-struct literal \`FundingRate(40_000_000)\` directly.

## Design reflection

Four load-bearing decisions in this lesson:

1. **\`FundingRate\` is a separate type from \`Premium\` despite identical shape.** The newtype pattern enforces the pipeline stages — a premium can't be applied to positions without going through \`compute_rate\` first. **Same-shape-but-different-role is the canonical newtype use case.**

2. **\`PositionSize\` is a single signed integer, not direction + magnitude.** Smaller, faster, simpler math — and the doc comment is the contract for the sign convention. **Choose the densest representation that the math will use anyway.**

3. **\`Position\` is a snapshot type, not a stateful entity.** No entry price, no PnL, no history — just \`(account, size)\`. The owning layer tracks state; the funding crate processes snapshots. **Narrow downstream types; wide upstream types.**

4. **\`FundingParams\` bundles config that varies as a unit.** Three values that always travel together; expanding the bundle later doesn't break call sites. **Parameter object whenever the grouping is itself a domain concept.**

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/types.rs ./crates/funding/src/types.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
\`\`\`

After L3:
- **types.rs** matches Stage 8b **completely** — all 9 types + \`RATE_SCALE\` + \`hyperliquid_default\`.
- **lib.rs** has the full type re-export; only the \`compute\` / \`clock\` re-exports are missing.

**Module 1 is complete.** From L4 onward we shift to \`compute.rs\` — pure functions over these types, with tests.

Return:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: Why is \`FundingParams::divisor\` a \`u32\` and not \`u64\`?**
HL's divisor is 8. Other configurations might go to 24 (once-per-hour-as-the-divisor) or 1 (single daily settlement). Even pathological values stay well under \`u32::MAX\` (~4 billion). **\`u32\` is "more than enough" with half the bit cost of \`u64\`** — and \`compute_rate\` will widen to \`i64\` for the division anyway. Tiny optimization, but \`Copy\` types benefit.

**Q: Should \`FundingParams\` validate its fields in a constructor?**
Tempting — reject \`interval_secs == 0\` (would cause division-by-zero or perpetual gating)? Reject \`divisor == 0\`? Stage 8b chose not to: validation in a constructor means there's *another* validation point besides the caller's input handling, and divergence between the two becomes a bug source. **Single point of truth for input validation: the caller.** That said, \`compute_rate\` does handle \`divisor == 0\` as "funding disabled" — a defensive default, not a validation.

**Q: Why does \`Position\` derive \`Eq\` but not \`Default\`?**
\`Eq\` because positions are compared in tests (and possibly in some upstream dedup logic). \`Default\` would give \`Position { account: AccountId(0), size: PositionSize(0) }\`, which is nonsensical (\`AccountId(0)\` is typically a sentinel). **Defaults should produce sensible values; if they can't, omit the derive.**

**Q: Are the \`Position\` and \`Settlement\` types redundant — they both have \`account\` + a value field?**
They look similar but they're at different lifecycle stages. \`Position\` is an *input* to \`apply_funding\`; \`Settlement\` is its *output*. The owning layer hands you \`Position\`s and receives \`Settlement\`s back. **Type-level distinction prevents accidentally re-applying settlements as if they were positions.**

## Module 1 milestone — what you've built

After L3 you have:
- 9 newtypes + 1 struct-with-method (\`FundingParams\`).
- ~110 lines of \`types.rs\` matching Stage 8b exactly.
- A full vocabulary for talking about funding — every value in the math pipeline (premium, rate, settlement, position) has a type.
- Zero behavior yet. **Modules 2-3 add the behavior.**

## Next lesson (L4)

L4 starts \`compute.rs\`. We create the file with the module doc + \`compute_premium\` function — the first math in the crate. The function is 8 lines but encodes 3 design decisions: (a) handle \`index == 0\` by returning \`Premium(0)\` instead of erroring; (b) use \`i128\` intermediates to avoid overflow on the subtraction-times-scale; (c) saturate back to \`i64\` rather than wrapping. The lesson also adds the first 4 unit tests — premium-zero-when-equal, premium-positive/negative cases, and the \`index == 0\` saturation test. **First tests in the crate.**`,
                },
              ],
            },
          },
          {
            title: "Pure compute",
            sortOrder: 2,
            lessons: {
              create: [
                {
                  title: "Lesson 4 — compute_premium — first math, first tests",
                  slug: "openhl-funding-compute-premium-en",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 40,
                  xpReward: 80,
                  content: `# Lesson 4 — \`compute_premium\` — first math, first tests

## Goal

By the end of this lesson:

\`\`\`bash
cargo test -p openhl-funding
\`\`\`

…passes 4 unit tests. The \`openhl-funding\` crate goes from "all type definitions" to "type definitions + first piece of math":

- **\`crates/funding/src/compute.rs\`** — new file with the module doc + 2 functions:
  - \`compute_premium(mark, index) -> Premium\` — derives \`(mark - index) / index\`, scaled by \`RATE_SCALE\`.
  - \`saturate_i128_to_i64(v) -> i64\` — clamp helper (private). 3 lines.
- **4 hand-traced unit tests** in \`compute.rs\`'s \`#[cfg(test)] mod tests\` block:
  - \`premium_zero_when_mark_equals_index\`
  - \`premium_positive_when_mark_above_index\`
  - \`premium_negative_when_mark_below_index\`
  - \`premium_saturates_to_zero_when_index_is_zero\`
- **\`crates/funding/src/lib.rs\`** — adds \`pub mod compute;\` + re-exports \`compute_premium\`.

This is the first lesson with **actual math**. From now on, every code change has the potential to silently shift wealth between accounts. The hand-traced tests pin the expected output against specific input values you can verify by paper math.

## Recap

After L3:
- 9 types + \`RATE_SCALE\` in \`types.rs\` — Stage 8b's complete type roster.
- Zero behavior yet. The crate compiles but does nothing.

L4 introduces the first function. The function is short (~10 lines of body) but encodes 3 design decisions: graceful handling of \`index == 0\`, \`i128\` intermediates for overflow safety, and saturation rather than wrap/panic.

## Plan

Three edits:

1. **Create \`crates/funding/src/compute.rs\`** — module doc + imports + \`compute_premium\` + private \`saturate_i128_to_i64\` helper.
2. **Add \`#[cfg(test)] mod tests\`** to \`compute.rs\` with 4 hand-traced unit tests.
3. **Update \`crates/funding/src/lib.rs\`** — add \`pub mod compute;\` declaration and re-export \`compute_premium\` at the crate root.

> 🛑 **Predict.** Before scrolling: we're computing \`(mark - index) * RATE_SCALE / index\`. \`mark\` and \`index\` are both \`u64\` up to ~1.8e19. \`RATE_SCALE\` is \`1e9\`. What's the maximum size of the *intermediate* product \`(mark - index) * RATE_SCALE\`, and what type does it need to fit in?

(Answer: **\`u64::MAX * 1e9\` overflows \`i64\` by 10 orders of magnitude.** Worst case \`mark = u64::MAX\`, \`index = 0\` (we handle this separately), or \`mark = u64::MAX\`, \`index = 1\` → \`(u64::MAX - 1) * 1e9 ≈ 1.8e28\`. \`i64::MAX\` is ~9.2e18; we need \`i128\` for the intermediate. After the divide by \`index\`, we're back in i64 range — but the divide must happen *after* the multiply, so the intermediate must fit i128. **i128 is mandatory for the product; saturation handles the rare cases where even the final result overflows i64.**)

## Walk-through

### Step 1: Create \`compute.rs\` with the module doc

Create \`crates/funding/src/compute.rs\`. Initial content:

\`\`\`rust
//! Pure funding-rate math.
//!
//! Three building blocks, each stateless:
//!   - [\`compute_premium\`] derives the mark/index gap as a signed fraction
//!   - [\`compute_rate\`] divides + caps to produce a per-interval rate
//!   - [\`apply_funding\`] turns a rate + position snapshot into settlements
//!
//! Each function is deterministic and saturates on overflow rather than
//! wrapping. Validators that disagree about funding fork the chain, so the
//! cost of an unexpected overflow has to be bounded behavior, not panic.

use crate::types::{
    FundingParams, FundingRate, IndexPrice, MarkPrice, Notional, Position, Premium, Settlement,
    RATE_SCALE,
};
\`\`\`

Two things to notice:

**The module doc previews 3 functions but we only ship 1 in L4.** The cross-references \`[compute_rate]\` and \`[apply_funding]\` will be broken until L6 and L7. **Tolerate the warnings** — same as the L1/L2 \`[FundingRate]\` cross-refs we let resolve incrementally.

**The \`use\` statement imports types we don't all use yet.** \`FundingParams\`, \`FundingRate\`, \`Notional\`, \`Position\`, \`Settlement\` are needed by L6/L7's functions. Importing them now means the import block stabilizes after L4 — same logic as L1's \`[dev-dependencies] proptest\`. **Stabilize boilerplate early; iterate on logic.**

> 🛑 **Anti-fluency.** "Shouldn't we suppress the unused-import warnings between L4 and L6?" **The unused-import warning fires on items the *compiler* sees as unused, not items rustdoc references.** Since we'll use \`FundingRate\`, \`Notional\`, etc. by L7, the compiler doesn't complain — it sees \`use\` declarations whose items will get used later in the same module. Only the rustdoc cross-refs \`[compute_rate]\` and \`[apply_funding]\` produce warnings, and those resolve when L6/L7 land.

### Step 2: Add \`compute_premium\`

After the \`use\` block:

\`\`\`rust
/// Compute the premium \`(mark - index) / index\`, scaled by [\`RATE_SCALE\`].
///
/// Returns \`Premium(0)\` if \`index == 0\` — the safest behavior, since with no
/// reliable reference price the funding rate should not push capital around.
/// Real deployments should guard upstream (e.g., refuse to tick when the
/// oracle is missing); the saturation here is the second line of defense.
#[must_use]
pub fn compute_premium(mark: MarkPrice, index: IndexPrice) -> Premium {
    if index.0 == 0 {
        return Premium(0);
    }
    // (mark - index) as i128 so we can't lose sign on subtraction; multiply
    // by RATE_SCALE in i128 to avoid overflow before the divide.
    let diff = i128::from(mark.0) - i128::from(index.0);
    let scaled = diff.saturating_mul(i128::from(RATE_SCALE));
    let premium = scaled / i128::from(index.0);
    // Saturate back to i64 — at i64 range with index prices in u64::MAX
    // territory, this only clips at network-pathological inputs.
    Premium(saturate_i128_to_i64(premium))
}
\`\`\`

10 lines of body. Four moving parts:

1. **Early return on \`index == 0\`.** A zero index means the oracle hasn't delivered a price (boot state) or the asset has no spot reference. **Either case should produce zero funding** — there's no meaningful (mark - index) to compute when there's no index. Returning \`Premium(0)\` is graceful degradation; an error would propagate as a transaction-level failure through the bridge, which is the wrong response to a transient oracle issue.

2. **\`i128::from(mark.0) - i128::from(index.0)\`.** Both operands upcast to \`i128\` *before* the subtraction. **Subtracting two \`u64\`s would underflow for \`mark < index\`** — the result would wrap to near \`u64::MAX\` instead of producing a negative number. Upcasting to signed i128 makes the subtraction algebraically correct.

3. **\`diff.saturating_mul(i128::from(RATE_SCALE))\`.** The multiply uses \`saturating_mul\`, not regular \`*\`. At worst case (\`mark\` close to \`u64::MAX\`, \`index\` very small), the product can approach \`i128::MAX\` — and *would* overflow with regular multiplication. \`saturating_mul\` clamps to \`i128::MAX\` / \`i128::MIN\` instead of panicking.

4. **\`scaled / i128::from(index.0)\`.** The division comes *after* the multiplication. **If we divided first, we'd lose precision** — \`(mark - index) / index\` in integer math would produce 0 for any premium less than 1.0 (the entire useful range!). Multiplying by \`RATE_SCALE\` first preserves the fractional digits as integer magnitude, then the divide produces the scaled premium.

Then \`saturate_i128_to_i64\` clips back to the \`Premium\`'s i64 range.

> 🛑 **Anti-fluency.** "Couldn't we just compute \`(mark - index).saturating_mul(RATE_SCALE) / index\` as u64?" **No — the subtraction is the problem.** \`MarkPrice(99) - IndexPrice(100)\` in \`u64\` produces underflow → wraps to \`u64::MAX - 0\`. That's a giant positive number, not a small negative one. The result would be a huge *positive* premium when the truth is a small *negative* one. **The sign matters; signed arithmetic is mandatory.**

### Step 3: Add the \`saturate_i128_to_i64\` helper

After \`compute_premium\`:

\`\`\`rust
/// Clamp an \`i128\` into the \`i64\` range. Used wherever an intermediate
/// product can exceed \`i64::MAX\` at network-pathological inputs (e.g., a
/// \`u64::MAX\` index price). Saturation, not wrapping — see the module-doc
/// comment on why panicking would be a worse failure mode.
fn saturate_i128_to_i64(v: i128) -> i64 {
    i64::try_from(v).unwrap_or(if v > 0 { i64::MAX } else { i64::MIN })
}
\`\`\`

Three lines of body. **\`i64::try_from(v)\` returns \`Result\`** — \`Ok(value)\` if \`v\` fits in i64, \`Err\` otherwise. \`unwrap_or(...)\` provides the default for the \`Err\` case: clamp to \`i64::MAX\` if the overflow was positive, \`i64::MIN\` if negative.

This function is **private to the module** (\`fn\`, not \`pub fn\`). Callers don't need it — they pass \`MarkPrice\` / \`IndexPrice\` in, get \`Premium\` back, and the saturation happens behind the scenes. Keeping it private prevents accidental misuse and keeps the public surface clean.

L7's \`apply_funding\` will be the second caller of this helper; that's why it's a helper and not inlined into \`compute_premium\`.

> 🛑 **Predict.** What would the test \`assert_eq!(saturate_i128_to_i64(i128::MAX), ???)\` expect?

(Answer: **\`i64::MAX\`.** \`i128::MAX\` is ~1.7e38, way beyond \`i64::MAX\` (~9.2e18). \`i64::try_from(i128::MAX)\` fails; \`unwrap_or(if v > 0 { i64::MAX } else { i64::MIN })\` evaluates the closure since \`v > 0\`, returning \`i64::MAX\`. Symmetric on the negative side: \`i128::MIN\` clamps to \`i64::MIN\`.)

### Step 4: Add the test module + 4 unit tests

At the end of \`compute.rs\`:

\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn premium_zero_when_mark_equals_index() {
        let p = compute_premium(MarkPrice(100), IndexPrice(100));
        assert_eq!(p, Premium(0));
    }

    #[test]
    fn premium_positive_when_mark_above_index() {
        // mark 101, index 100 → premium = 1/100 = 0.01 → 10_000_000 ppb
        let p = compute_premium(MarkPrice(101), IndexPrice(100));
        assert_eq!(p, Premium(10_000_000));
    }

    #[test]
    fn premium_negative_when_mark_below_index() {
        let p = compute_premium(MarkPrice(99), IndexPrice(100));
        assert_eq!(p, Premium(-10_000_000));
    }

    #[test]
    fn premium_saturates_to_zero_when_index_is_zero() {
        let p = compute_premium(MarkPrice(1_000_000), IndexPrice(0));
        assert_eq!(p, Premium(0));
    }
}
\`\`\`

Four hand-traced tests. Each is short, but each pins a specific *meaning*:

1. **\`premium_zero_when_mark_equals_index\`** — the symmetry case. Mark = index means no dislocation. The math is straightforward: \`(100 - 100) * 1e9 / 100 = 0\`. This test catches an off-by-one or sign-flip in the formula.

2. **\`premium_positive_when_mark_above_index\`** — the longs-overpaying case. Mark 101 > Index 100 → positive premium. The expected value \`10_000_000\` is the paper math: \`(101-100) * 1e9 / 100 = 1e9 / 100 = 1e7 = 10_000_000\`. **In ppb: 1% premium.** This test catches an inverted sign convention.

3. **\`premium_negative_when_mark_below_index\`** — the shorts-overpaying case. Mark 99 < Index 100 → negative premium. Same magnitude as test 2, opposite sign. **Catches the "subtract as u64 → underflow" bug specifically.**

4. **\`premium_saturates_to_zero_when_index_is_zero\`** — the graceful-degradation case. \`Premium(0)\` is the expected output, not a panic or error. **Catches anyone who deletes the early-return guard "for simplicity."**

The comment \`// mark 101, index 100 → premium = 1/100 = 0.01 → 10_000_000 ppb\` in test 2 is the **paper math, written in the test**. Anyone debugging this in the future can verify by hand that the assertion is correct — no need to trust the test author got it right.

> 🛑 **Anti-fluency.** "Shouldn't we test edge cases like \`MarkPrice(u64::MAX)\` or \`IndexPrice(1)\`?" **Yes, but in L5.** Those are the saturation-edge tests — they exercise the \`saturate_i128_to_i64\` helper at its boundary, which is L5's main pedagogical focus. **L4's tests pin the normal-input semantics; L5 pins the pathological-input behavior.** Both classes of test matter; separating them by lesson keeps the per-lesson scope tight.

### Step 5: Update \`lib.rs\`

Open \`crates/funding/src/lib.rs\`. The current state:

\`\`\`rust
//! \`openhl-funding\` — funding-rate state machine.
//! ...

pub mod types;

pub use types::{
    FundingParams, FundingRate, IndexPrice, MarkPrice, Notional, Position, PositionSize,
    Premium, Settlement, RATE_SCALE,
};
\`\`\`

Add the compute module declaration + re-export:

\`\`\`rust
//! \`openhl-funding\` — funding-rate state machine.
//! ...

pub mod compute;
pub mod types;

pub use compute::compute_premium;
pub use types::{
    FundingParams, FundingRate, IndexPrice, MarkPrice, Notional, Position, PositionSize,
    Premium, Settlement, RATE_SCALE,
};
\`\`\`

Two changes:
- \`pub mod compute;\` — declares the new module.
- \`pub use compute::compute_premium;\` — re-exports the function at the crate root. Callers can write \`use openhl_funding::compute_premium;\` instead of \`use openhl_funding::compute::compute_premium;\`.

**Module declarations stay alphabetical** (\`compute\` before \`types\`). Same for the \`pub use\` ordering. Consistency matters in long re-export blocks.

### Step 6: Run tests

\`\`\`bash
cargo test -p openhl-funding
\`\`\`

Expected output:

\`\`\`
   Compiling openhl-funding v0.1.0 (/Users/.../my-openhl/crates/funding)
warning: unresolved link to \`compute_rate\`
warning: unresolved link to \`apply_funding\`
warning: unresolved link to \`FundingClock\`
    Finished \`test\` profile [unoptimized + debuginfo] in 0.6s
     Running unittests src/lib.rs

running 4 tests
test compute::tests::premium_negative_when_mark_below_index ... ok
test compute::tests::premium_positive_when_mark_above_index ... ok
test compute::tests::premium_saturates_to_zero_when_index_is_zero ... ok
test compute::tests::premium_zero_when_mark_equals_index ... ok

test result: ok. 4 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

**4 tests pass.** First green run in the crate. The 3 rustdoc warnings are still expected (\`compute_rate\`/\`apply_funding\`/\`FundingClock\` — resolved by L6/L7/L8).

Common errors:

- **\`assertion failed: left=0 right=10_000_000\`** on the positive test — your \`compute_premium\` is missing the \`* RATE_SCALE\` step. Without that scaling, integer division \`(101 - 100) / 100\` rounds to 0.
- **\`assertion failed: left=18446744073709541616 right=-10_000_000\`** on the negative test — you did the subtraction in \`u64\` instead of upcasting to \`i128\`. The huge positive number is \`u64::MAX + (99 - 100)\` underflow-wrapped. **Add the \`i128::from(...)\` upcasts on both operands.**
- **Panic in test** — you used regular \`*\` instead of \`saturating_mul\`. Regular multiplication panics on overflow in debug builds. Switch to \`saturating_mul\`.
- **\`error: cannot find function 'saturate_i128_to_i64'\`** — the helper is defined below \`compute_premium\` in the same file. Either move it above the caller, or leave it below — Rust doesn't care about declaration order in modules.

## Design reflection

Four load-bearing decisions in this lesson:

1. **\`index == 0\` returns \`Premium(0)\`, not an error.** Graceful degradation when the oracle is unavailable. Erroring would propagate as a transaction failure through the bridge, blocking unrelated payload work. Zero is the right answer for "we have no information to drive a rate."

2. **\`i128\` intermediates, never \`u64\`.** The subtraction can be negative; the multiplication can exceed \`u64::MAX\`. Both operations need signed and wider arithmetic. **Choose the integer width by the *intermediate* range, not the input range.**

3. **\`saturating_mul\`, not \`*\`.** Overflow during the multiply would either panic (debug) or wrap (release). Both are worse than saturation: panic = chain fork via halt, wrap = chain fork via wrong value. **Saturation is the only bounded-behavior option for consensus-critical math.**

4. **Test comments are the paper math.** \`// (101-100) * 1e9 / 100 = 10_000_000\` next to the assertion lets any future debugger verify the assertion *against the formula*, not against the test author's promise. **Tests are documentation; their comments are the doc body.**

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/compute.rs ./crates/funding/src/compute.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
\`\`\`

After L4:
- **compute.rs** matches Stage 8b through \`compute_premium\` + \`saturate_i128_to_i64\` + the 4 hand-traced premium tests. \`compute_rate\`, \`apply_funding\`, the rate tests, and the proptests are L5-L7.
- **lib.rs** has \`pub mod compute;\` and the \`compute_premium\` re-export. \`apply_funding\`, \`compute_rate\`, and the clock module are L5-L8.

Return:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: Why does \`compute_premium\` use \`i128\` everywhere instead of just for the dangerous step?**
The conversion \`i128::from(u64)\` is free (it's just a zero-extend). Doing the whole calculation in \`i128\` is one mental model — "this function uses i128 arithmetic" — vs the mixed model "u64 here, i128 there." **Uniform width is a readability win at zero cost.** The final saturation back to i64 is the only conversion that has any semantic weight.

**Q: Why is \`RATE_SCALE\` upcast via \`i128::from(RATE_SCALE)\` and not just \`RATE_SCALE as i128\`?**
\`from\` is the idiomatic, non-truncating conversion. \`as i128\` works here (\`i64 → i128\` doesn't truncate), but \`from\` documents intent: "this is a widening, not a reinterpretation." **Use \`from\` for widening, \`as\` only when you've already verified no truncation can happen.** A future engineer reading \`as i128\` has to verify safety; \`from\` documents that the conversion is safe.

**Q: Why is the helper named \`saturate_i128_to_i64\` and not just \`clamp_to_i64\`?**
"Saturate" is the established term for "clamp at type boundary" — same word as \`u64::saturating_mul\`, \`i128::saturating_sub\`. **Using the standard vocabulary makes the function's behavior obvious to any Rust dev.** "Clamp" can mean any user-defined bounds; "saturate" specifically means type-bound clamping.

**Q: Should \`compute_premium\` be \`pub(crate)\` instead of \`pub\`?**
\`pub\` because external callers (the bridge integration in course 10, or external observers querying funding state for telemetry) need it. \`pub(crate)\` would forbid that. **The function is part of the public API.** \`saturate_i128_to_i64\` is the implementation detail; \`compute_premium\` is the contract.

## Next lesson (L5)

L5 doesn't add a new function. Instead, it does a deep dive on the overflow philosophy: why saturation is the only acceptable behavior for consensus-critical math, what the alternatives look like and why they fork the chain, and how \`saturate_i128_to_i64\`'s edges behave under pathological inputs. The lesson also adds 1 proptest (\`premium_is_antisymmetric_in_mark_index\`) — the property that swapping mark and index flips the premium sign. **First proptest in the crate.**`,
                },
                {
                  title: "Lesson 5 — Overflow philosophy + the first proptest",
                  slug: "openhl-funding-overflow-proptest-en",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 30,
                  xpReward: 60,
                  content: `# Lesson 5 — Overflow philosophy + the first proptest

## Goal

By the end of this lesson:

\`\`\`bash
cargo test -p openhl-funding
\`\`\`

…passes 5 tests (4 from L4 + 1 new proptest). The crate gains:

- **The first proptest in the codebase** — \`premium_is_antisymmetric_in_mark_index\`. Swapping \`mark\` and \`index\` flips the sign of the premium (or both are zero when they're equal). 256 random inputs per test run.

But the larger payload of this lesson is **conceptual, not code**. We walk through:

1. **Why panic = chain fork.** A validator that panics halts; remaining validators advance without it. State diverges.
2. **Why wrap = chain fork.** Two validators with different compiler versions or build flags can wrap *differently* at the same overflow point. Wrong values diverge from correct values.
3. **Why saturate is bounded behavior.** All validators agree on the saturated value at the same input. No fork.
4. **\`saturate_i128_to_i64\` boundary cases.** \`i128::MAX → i64::MAX\`, \`i128::MIN → i64::MIN\`. Why the \`unwrap_or\` closure depends on sign, not just \`i64::MAX\`.

No new function. ~5 lines of new test code. **The mental model is the lesson.**

## Recap

After L4:
- \`compute_premium\` computes a signed premium with \`i128\` intermediates.
- \`saturate_i128_to_i64\` clamps overflow to i64 boundaries.
- 4 hand-traced tests pin the function's behavior at normal inputs.

L4's tests don't exercise pathological inputs (e.g., \`MarkPrice(u64::MAX)\`), and they don't exercise the saturate helper at its boundaries. L5 explores both gaps via philosophy + a proptest.

## Plan

Two edits:

1. **Add a \`use proptest::prelude::*;\` import** to \`compute.rs\`'s test module.
2. **Append a \`proptest! { ... }\` block** with the antisymmetry property.

No production code changes.

> 🛑 **Predict.** Before scrolling: a panic in \`compute_premium\` halts the validator. **Why is this a chain fork, not just a single-node failure?** Hint: think about what the other validators are doing when one halts.

(Answer: **The other validators advance without the halted one.** A funding tick produces deterministic state updates on every validator; if one halts, the network's quorum (typically 2/3+) continues. By the time the halted validator reboots, the chain head is many blocks ahead. The halted validator can't sync — its local state at the halt block disagrees with the network's view of that block. **The halt creates two versions of history: "with the panicking input" and "with the network's advanced state." The validator effectively forked itself off the network.** Saturate, in contrast, lets the validator stay in lockstep.)

## Walk-through

### Step 1: The overflow taxonomy

Three failure modes for "the integer didn't fit":

#### Panic (debug builds with \`*\`)

\`\`\`rust
let scaled = diff * i128::from(RATE_SCALE);  // panics on overflow in debug
\`\`\`

In debug builds, integer overflow panics. The thread that hits the panic halts; if it's the funding tick on a validator, the validator's state machine stops advancing. **The rest of the network doesn't notice and continues.** When the halted validator restarts, its world-view at the panic block doesn't match the network's. From that point forward, it can't validate further blocks — it sees them as referencing state it never computed.

Effectively: **one validator is gone, but its absence corrupts only itself, not the network.** The chain forks not by producing two valid histories, but by the panicking validator falling permanently off the consensus.

#### Wrap (release builds with \`*\`)

\`\`\`rust
let scaled = diff * i128::from(RATE_SCALE);  // silently wraps in release
\`\`\`

In release builds, \`*\` wraps without panicking. The result is \`(diff * RATE_SCALE).wrapping_rem(2^128)\` — a *defined* value, but not the mathematically correct one.

**The hazard**: two validators with different compiler optimizations might wrap *differently*. Compilers can re-order operations under associativity rules; \`(a * b) * c\` and \`a * (b * c)\` can produce different wrapped results when intermediate overflows differ. Even if both validators wrap identically by chance, the *wrong* value still propagates to every account that gets settled this tick. **All validators agree on the wrong answer.** Then a downstream client that recomputes the funding from raw inputs disagrees. The chain forks via inconsistency between layers.

In *release builds* the wrap is silent — no log, no warning, no event. **The hardest class of bug to detect: wrong but consistent.**

#### Saturate (our chosen behavior)

\`\`\`rust
let scaled = diff.saturating_mul(i128::from(RATE_SCALE));  // clamps to i128::MAX/MIN
\`\`\`

Saturation produces a defined value at the type boundary: \`i128::MAX\` on positive overflow, \`i128::MIN\` on negative. **Every validator with \`saturating_mul\` produces the same value.** No fork.

The *funding rate* at saturation is effectively the cap (after \`saturate_i128_to_i64\` further clamps to i64). The economic consequence: an extreme oracle dislocation that pushes premium past the saturation point produces a payment at the maximum rate, not a panic and not a wrap. **The behavior degrades gracefully.**

> 🛑 **Anti-fluency.** "Couldn't we use \`checked_mul\` and return an error?" **Yes, but it pushes the problem to the caller.** \`Result<Premium, OverflowError>\` would propagate up through \`compute_rate\`, \`apply_funding\`, the clock — and eventually to the bridge, which would have to decide what to do. The bridge's options would be (a) revert the block (chain fork), (b) skip the funding tick (silent state inconsistency), (c) settle at the cap anyway. **The "settle at the cap" outcome is what saturation achieves directly, without propagating the error.**

### Step 2: \`saturate_i128_to_i64\` boundary cases

Recall the helper from L4:

\`\`\`rust
fn saturate_i128_to_i64(v: i128) -> i64 {
    i64::try_from(v).unwrap_or(if v > 0 { i64::MAX } else { i64::MIN })
}
\`\`\`

Three input regimes:

| Input | \`try_from\` result | \`unwrap_or\` produces |
|---|---|---|
| \`v\` fits in i64 | \`Ok(v as i64)\` | \`v as i64\` (no override) |
| \`v > i64::MAX\` | \`Err(...)\` | \`i64::MAX\` (since \`v > 0\`) |
| \`v < i64::MIN\` | \`Err(...)\` | \`i64::MIN\` (since \`v ≤ 0\`) |

**Why the sign check inside \`unwrap_or\`?** Because \`try_from\` doesn't tell us which direction the overflow went — it just says "doesn't fit." If we returned a fixed value (say \`i64::MAX\`) on every overflow, then \`i128::MIN\` would saturate to \`i64::MAX\` instead of \`i64::MIN\` — the sign would flip. The \`if v > 0\` test recovers the direction.

> 🛑 **Predict.** What does \`saturate_i128_to_i64(0)\` return?

(Answer: **\`0\`.** \`i64::try_from(0_i128)\` returns \`Ok(0)\`. The \`unwrap_or\` branch never fires. **Saturation is a no-op for in-range values.** This is important for the proptest below — most random \`(mark, index)\` pairs produce premiums that fit comfortably in i64, and the saturate helper is invisible for those.)

> 🛑 **Anti-fluency.** "We test the boundaries explicitly — wouldn't a property-based test cover those?" **Probably not by random sampling.** Proptest's default strategy generates values uniformly across the input space. \`i128::MAX\` is a single point out of 2^129 values; the chance of randomly hitting it is effectively zero. **Boundary tests need to be hand-traced** because they target specific values the generator won't reach by random walk.

### Step 3: Add proptest support to the test module

Open \`crates/funding/src/compute.rs\`. The current test module starts:

\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;

    // ... 4 unit tests from L4 ...
}
\`\`\`

Add the proptest prelude import. The test module becomes:

\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;
    use openhl_clob::AccountId;
    use proptest::prelude::*;

    fn pos(account: u64, size: i64) -> Position {
        Position {
            account: AccountId(account),
            size: crate::types::PositionSize(size),
        }
    }

    // ... 4 unit tests from L4 ...
}
\`\`\`

Three things to notice:

1. **\`use openhl_clob::AccountId;\`** — needed for the \`pos\` helper. Not used by L4's tests, but used by L5's proptest (we won't need it in this exact proptest, but L7's apply_funding tests will, and we add it now to stabilize the test module imports).
2. **\`use proptest::prelude::*;\`** — brings \`proptest!\`, \`prop_assert_eq!\`, \`prop_assert!\`, and the strategy combinators (\`1u64..1_000_000\`) into scope.
3. **\`fn pos(account: u64, size: i64) -> Position\`** — a tiny helper that constructs a \`Position\`. Used by L7. Adding now to stabilize the imports/helpers section.

**Stabilize boilerplate; iterate on tests.** Same logic as L1's deps and L4's \`use\` block — we add now what we'll need later, so the per-lesson diff stays focused on what's actually new.

### Step 4: Add the antisymmetry proptest

After the 4 unit tests, before the closing \`}\` of the test module, add:

\`\`\`rust
    proptest! {
        /// Premium symmetry: swapping mark and index flips the sign.
        /// (Up to integer division rounding, the magnitude is the same — we
        /// allow off-by-one to absorb the rounding-toward-zero asymmetry.)
        #[test]
        fn premium_is_antisymmetric_in_mark_index(
            mark in 1u64..1_000_000,
            index in 1u64..1_000_000,
        ) {
            let a = compute_premium(MarkPrice(mark), IndexPrice(index));
            let b = compute_premium(MarkPrice(index), IndexPrice(mark));
            // Cross-multiplied magnitudes must be equal: |a| / mark == |b| / index
            // (i.e., the proportional dislocation is the same both ways).
            // We test the weaker property that the signs are opposite (or both zero).
            if mark == index {
                prop_assert_eq!(a, Premium(0));
                prop_assert_eq!(b, Premium(0));
            } else {
                prop_assert!(a.0.signum() == -b.0.signum());
            }
        }
    }
\`\`\`

Several proptest-specific elements:

- **\`proptest! { ... }\`** — the macro that wraps the test function. Inside this block, \`#[test]\` functions get treated as property tests with generators.
- **\`mark in 1u64..1_000_000\`** — the **strategy**. \`mark\` will be sampled from values in \`[1, 1_000_000)\`. Default is 256 cases per test run (~256 random \`(mark, index)\` pairs).
- **\`prop_assert_eq!\` and \`prop_assert!\`** — proptest's assertion macros. Same effect as \`assert_eq!\` / \`assert!\` on a single case, but proptest needs its own macros to shrink the input on failure (find the *minimal* failing case).

Why this property?

The naive version of "antisymmetry" would be: \`compute_premium(MarkPrice(M), IndexPrice(I))\` and \`compute_premium(MarkPrice(I), IndexPrice(M))\` should have **equal-magnitude, opposite-sign** results. But integer division rounds toward zero, so the cross-comparison \`|a| / M == |b| / I\` doesn't hold exactly — there's an off-by-one rounding asymmetry.

**The proptest tests the weaker property: signs are opposite (or both zero).** When mark = index, both premiums are zero. When mark ≠ index, one is positive and one is negative.

**The comment explains why we weakened it.** A future reader looking at this property and thinking "shouldn't the magnitudes also be equal?" will see the rounding caveat documented in place. **Aspirational properties that don't actually hold under integer arithmetic are testing failures waiting to happen.** Test the property that's actually invariant.

> 🛑 **Anti-fluency.** "Why not use \`f64\` in the test fixture to compute the expected magnitude exactly?" **Because the test would assert a \`f64\`-computed expectation against the \`i64\`-computed actual — and the two would disagree in the LSB.** Tests that compare deterministic-integer code against non-deterministic-float expectations are unreliable. **Keep the test arithmetic in the same domain as the production arithmetic.**

> 🛑 **Predict.** Why does the strategy use \`1u64..1_000_000\` (excluding zero) instead of \`0u64..1_000_000\`?

(Answer: **Because \`index == 0\` is the \`Premium(0)\` early-return case, already tested as a hand-traced unit test in L4.** Including 0 in the proptest would either: (a) cause the proptest to assert \`signs are opposite\` when they're both zero, breaking the property, or (b) require special-casing zero inside the proptest, complicating the test. Excluding zero keeps the property clean. **Proptests should exercise the interesting range, not the trivial-or-already-tested range.**)

### Step 5: Run the test

\`\`\`bash
cargo test -p openhl-funding
\`\`\`

Expected output:

\`\`\`
   Compiling openhl-funding v0.1.0 (/Users/.../my-openhl/crates/funding)
warning: unresolved link to \`compute_rate\`
warning: unresolved link to \`apply_funding\`
warning: unresolved link to \`FundingClock\`
    Finished \`test\` profile [unoptimized + debuginfo] in 0.6s
     Running unittests src/lib.rs

running 5 tests
test compute::tests::premium_is_antisymmetric_in_mark_index ... ok
test compute::tests::premium_negative_when_mark_below_index ... ok
test compute::tests::premium_positive_when_mark_above_index ... ok
test compute::tests::premium_saturates_to_zero_when_index_is_zero ... ok
test compute::tests::premium_zero_when_mark_equals_index ... ok

test result: ok. 5 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

5 tests, all green. The proptest ran 256 random \`(mark, index)\` pairs; all 256 satisfied the antisymmetry property.

If you want to see proptest's verbosity, set the env var:

\`\`\`bash
PROPTEST_VERBOSE=1 cargo test -p openhl-funding premium_is_antisymmetric
\`\`\`

You'll see logs like "passed 256 cases" or, on failure, "shrunk to mark=X index=Y" — the minimal counterexample.

Common errors:

- **\`error: macro 'proptest' is not used\`** — you imported \`use proptest::*\` instead of \`use proptest::prelude::*\`. The macro lives in \`prelude\`.
- **\`prop_assert_eq!\` typo to \`assert_eq!\`** — works in a regular function but inside \`proptest!\` you need the prop_* variants for proper shrinking. The test will pass but on failure won't shrink to a minimal example.
- **\`signs are opposite\` fails** — usually means the proptest accidentally included \`mark == index\` in the else branch. Verify the if/else split: \`if mark == index { both zero } else { opposite signs }\`.
- **proptest panics on \`signum() == -b.0.signum()\` when \`b.0 == 0\`** — happens if compute_premium produces zero for non-equal mark/index (e.g., very small inputs where the integer math rounds to zero). The \`1u64..1_000_000\` range avoids this; tighter ranges would hit it.

## Design reflection

Five load-bearing decisions in this lesson:

1. **Saturate is the only bounded-behavior overflow option for consensus.** Panic = chain fork via halt. Wrap = chain fork via wrong-but-consistent value. Saturate = same value across all validators, gracefully degraded. **There are no other options that preserve consensus liveness.**

2. **Test the property that's actually invariant, not the aspirational one.** Naive antisymmetry would require equal magnitudes; integer rounding breaks that. We test the weaker property (opposite signs) and document the rounding caveat in the test comment. **Aspirational tests fail in production; invariant tests fail in development.**

3. **Stabilize test-module boilerplate early.** Adding \`use proptest::prelude::*\`, \`use openhl_clob::AccountId\`, and the \`pos\` helper now means the test module's imports stay stable for L6 / L7. **Boilerplate churn obscures the actual diff per lesson.**

4. **The \`unwrap_or\` closure in \`saturate_i128_to_i64\` depends on sign.** A fixed override would flip negative overflows to positive. Reading the saturate helper carefully reveals why the closure is *necessary*, not just defensive.

5. **Exclude zero from the proptest range** — the zero case is already a hand-traced unit test, and including it in the proptest would require complicating the property. **Hand-traced tests pin boundary cases; proptests pin properties on the interior.** They're complementary, not redundant.

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/compute.rs ./crates/funding/src/compute.rs
\`\`\`

After L5:
- **compute.rs** matches Stage 8b through \`compute_premium\` + \`saturate_i128_to_i64\` + the 4 hand-traced premium tests + the antisymmetry proptest + the test-module imports/helpers. \`compute_rate\`, \`apply_funding\`, and the rest of the proptests are L6/L7.

Return:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: How many cases does the proptest actually run?**
Default is 256 per test invocation. Configurable via \`PROPTEST_CASES=N cargo test\`. The shrinker can run additional cases after finding a failure to minimize the counterexample. **At 256 random pairs, the antisymmetry property is exercised against a meaningful sample of the input space without making CI slow.**

**Q: Could we increase to 10,000 cases for stronger coverage?**
You could, but the marginal benefit drops fast for properties with a clean closed form. Antisymmetry isn't a probabilistic property — it either holds or it doesn't. 256 cases provides high confidence that the implementation is correct on the tested range. **For properties with adversarial inputs (e.g., crypto), you'd want more cases; for pure math properties, 256 is plenty.**

**Q: Why not use \`quickcheck\` instead of \`proptest\`?**
Both are property-testing crates for Rust; both work fine. \`proptest\` has stronger shrinking (finds smaller counterexamples) and better strategy composition (the \`in\` syntax for ranges). The openhl workspace already pulls in proptest via the consensus crate's tests, so the marginal cost is zero. **Pick one and stick with it; switching mid-codebase is more cost than choosing differently upfront.**

**Q: What's the relationship between \`saturating_mul\` and \`saturate_i128_to_i64\`?**
\`saturating_mul\` is a built-in method on \`i128\` (and other integers) that produces the saturated product within the type's own range. \`saturate_i128_to_i64\` is our user-defined helper that clamps an \`i128\` to the \`i64\` range. They serve different boundaries: \`saturating_mul\` defends against in-type overflow, \`saturate_i128_to_i64\` defends against the cross-type narrowing. **Both are needed because the math uses both i128 (for products) and i64 (for storage).**

## Next lesson (L6)

L6 adds \`compute_rate\` — the function that takes a \`Premium\` and \`FundingParams\` and produces a \`FundingRate\`. The function is ~10 lines but encodes 3 decisions: (a) \`divisor == 0\` returns \`FundingRate(0)\` (funding disabled), (b) the divisor reduces the premium before clamping, (c) the \`rate_cap\` clamps absolute value (so negative caps and positive caps share the same \`params.rate_cap\`). The lesson also adds 4 unit tests covering the divisor, the cap on both sides, and the disabled-funding case. After L6, two of the three pure-compute functions are done.`,
                },
                {
                  title: "Lesson 6 — compute_rate — divisor + cap",
                  slug: "openhl-funding-compute-rate-en",
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 30,
                  xpReward: 60,
                  content: `# Lesson 6 — \`compute_rate\` — divisor + cap

## Goal

By the end of this lesson:

\`\`\`bash
cargo test -p openhl-funding
\`\`\`

…passes 10 tests (5 from L4-L5 + 5 new). \`compute.rs\` gains:

- **\`compute_rate(premium, params) -> FundingRate\`** — turns a raw premium into a per-interval rate by dividing by \`params.divisor\` and clamping to \`±params.rate_cap\`.
- **5 unit tests** covering: the divisor effect, the positive cap clamp, the negative cap clamp, the disabled-when-divisor-zero case, the disabled-when-cap-zero case.

After L6, two of \`compute.rs\`'s three pure functions are done. **\`apply_funding\` is the only one left** — L7.

The teaching focus is the **order of operations**: divide *then* clamp. Reversing that order would change the rate cap's meaning entirely — and it's the kind of off-by-one design bug that's easy to introduce and hard to detect.

## Recap

After L5:
- \`compute_premium\` produces a signed premium from mark/index.
- The antisymmetry proptest exercises 256 random pairs.
- \`saturate_i128_to_i64\` is in place but only used by \`compute_premium\` so far.

L6 adds the second pure function. \`compute_rate\` is shorter than \`compute_premium\` (no overflow gymnastics — the values it processes already fit in i64) but encodes its own set of design decisions.

## Plan

Two edits:

1. **Append \`compute_rate\` to \`compute.rs\`** — 10 lines of body, after \`compute_premium\` (before \`saturate_i128_to_i64\`).
2. **Append 5 unit tests** to the existing \`mod tests\` block.
3. **Update \`lib.rs\`** — add \`compute_rate\` to the \`pub use compute::{...}\` re-export.

> 🛑 **Predict.** Before scrolling: we'll compute \`raw_rate = premium / divisor\`, then clamp to \`±cap\`. **What changes if we clamp first and then divide?** Hint: think about what unit the cap is in.

(Answer: **Clamping first would make the cap mean "the maximum premium," not "the maximum rate."** With \`cap = 4%/interval\` and \`divisor = 8\`, clamping the premium to \`±4%\` and then dividing produces a maximum *rate* of \`0.5%/interval\`. With our approach (divide first, then clamp at the rate level), the cap genuinely binds at \`4%/interval\`. **The cap's unit must match the output's unit.** Premium and rate are both scaled by \`RATE_SCALE\`, so they look numerically similar — but they're semantically different. The divisor changes which one you're capping.)

## Walk-through

### Step 1: Add \`compute_rate\`

Open \`crates/funding/src/compute.rs\`. After \`compute_premium\`, before \`saturate_i128_to_i64\`, add:

\`\`\`rust
/// Divide the premium by \`params.divisor\` and clamp to ±\`params.rate_cap\`.
///
/// \`divisor == 0\` is treated as "funding disabled" → returns \`FundingRate(0)\`,
/// which causes \`apply_funding\` to produce zero-delta settlements for every
/// position (or none, by the filter inside \`apply_funding\`).
#[must_use]
pub fn compute_rate(premium: Premium, params: FundingParams) -> FundingRate {
    if params.divisor == 0 {
        return FundingRate(0);
    }
    let raw = premium.0 / i64::from(params.divisor);
    let cap = params.rate_cap.0.abs();
    let capped = raw.clamp(-cap, cap);
    FundingRate(capped)
}
\`\`\`

10 lines of body. Four moving parts:

1. **\`if params.divisor == 0 { return FundingRate(0); }\`** — the funding-disabled early exit. Without this, the \`premium.0 / i64::from(params.divisor)\` line would panic (division by zero). **A guard is the only safe response to a divisor of zero.**

2. **\`premium.0 / i64::from(params.divisor)\`** — the division. \`premium.0\` is \`i64\`; \`divisor\` is \`u32\`. \`i64::from(u32)\` widens losslessly (any u32 value fits in i64). Then \`i64 / i64\` produces an i64 quotient. **The result is the "raw" per-interval rate before any clamping.**

3. **\`let cap = params.rate_cap.0.abs();\`** — extract the cap as an absolute value. \`params.rate_cap\` is a \`FundingRate(i64)\`, and the user *might* have provided a negative value. We don't care about the sign of the cap — we care about the magnitude. **The cap is a width, not a position.**

4. **\`raw.clamp(-cap, cap)\`** — the symmetric clamp. \`i64::clamp(min, max)\` returns \`min\` if \`raw < min\`, \`max\` if \`raw > max\`, else \`raw\`. **Built-in Rust API; no manual \`if/else\` chain needed.**

> 🛑 **Anti-fluency.** "Why bother with \`.abs()\` on the cap? Couldn't we just require the user to pass a positive cap?" **We could, but defensive abs is cheaper than runtime validation.** A user who passes \`FundingRate(-40_000_000)\` thinking "negative cap" or "absolute cap, allow either sign" gets the same behavior as \`FundingRate(40_000_000)\`. The cost is one \`.abs()\` call (~1ns); the benefit is one less footgun. **\`.abs()\` is the API equivalent of saying "I accept either sign for the cap; I'll interpret it as a magnitude."**

> 🛑 **Anti-fluency.** "Why not also handle \`params.rate_cap == 0\` as a special case?" **We don't need to — it falls out naturally.** When \`cap == 0\`, \`clamp(-0, 0)\` produces \`0\` for any input. The result is \`FundingRate(0)\`, which is the disabled-funding semantics we want. **Code that works naturally for the edge case beats code with explicit edge-case branches.**

### Step 2: Why divide first

The order matters. Two alternatives:

**A) Our approach: divide, then clamp**

\`\`\`rust
let raw = premium / divisor;
let capped = raw.clamp(-cap, cap);
\`\`\`

- Cap binds at the *rate* level.
- \`cap = 4%/interval\` means "no single interval can pay more than 4%."
- Premium of \`100%\` with divisor \`8\` → raw \`12.5%\`, clamped to \`4%\`.

**B) Reverse: clamp, then divide**

\`\`\`rust
let capped_premium = premium.clamp(-cap, cap);
let raw = capped_premium / divisor;
\`\`\`

- Cap binds at the *premium* level.
- \`cap = 4%\` means "no single premium reading can exceed 4%."
- Premium of \`100%\` clamped to \`4%\`, then divided by \`8\` → final rate \`0.5%\`.

**Approach A is what we want.** Approach B would make the cap effectively \`0.5%/interval\` (rate_cap divided by divisor), which isn't what the docstring promises.

> 🛑 **Predict.** With \`params.hyperliquid_default()\` (divisor=8, cap=4%), what's the maximum rate produced from a premium of \`RATE_SCALE\` (100% dislocation)?

(Answer: **\`FundingRate(40_000_000)\` = 4%/interval.** Walk through: premium.0 = 1_000_000_000 (RATE_SCALE). raw = 1_000_000_000 / 8 = 125_000_000 (12.5%/interval). cap = 40_000_000 (4%). clamp(-40_000_000, 40_000_000) on 125_000_000 → 40_000_000. **The cap does its job.** Compare to approach B: clamped_premium = clamp(1_000_000_000) at cap 40_000_000 → 40_000_000. raw = 40_000_000 / 8 = 5_000_000 (0.5%). Way under the spec.)

### Step 3: Add 5 unit tests

In the \`#[cfg(test)] mod tests\` block, after the existing premium tests (and before the proptest block), add:

\`\`\`rust
    #[test]
    fn rate_divides_premium_by_divisor() {
        let params = FundingParams::hyperliquid_default();
        // premium = 0.01 (10_000_000 ppb), divisor = 8 → rate = 1_250_000
        let r = compute_rate(Premium(10_000_000), params);
        assert_eq!(r, FundingRate(1_250_000));
    }

    #[test]
    fn rate_clamps_at_positive_cap() {
        let params = FundingParams::hyperliquid_default();
        // premium = 1.0 (RATE_SCALE), divisor = 8 → raw = 125_000_000
        // cap is 40_000_000 → clamps to 40_000_000.
        let r = compute_rate(Premium(RATE_SCALE), params);
        assert_eq!(r, FundingRate(40_000_000));
    }

    #[test]
    fn rate_clamps_at_negative_cap() {
        let params = FundingParams::hyperliquid_default();
        let r = compute_rate(Premium(-RATE_SCALE), params);
        assert_eq!(r, FundingRate(-40_000_000));
    }

    #[test]
    fn rate_zero_when_divisor_is_zero() {
        let mut params = FundingParams::hyperliquid_default();
        params.divisor = 0;
        let r = compute_rate(Premium(RATE_SCALE), params);
        assert_eq!(r, FundingRate(0));
    }

    #[test]
    fn rate_zero_when_cap_is_zero_funding_disabled() {
        let mut params = FundingParams::hyperliquid_default();
        params.rate_cap = FundingRate(0);
        let r = compute_rate(Premium(10_000_000), params);
        assert_eq!(r, FundingRate(0));
    }
\`\`\`

5 tests, each pinning a specific behavior:

1. **\`rate_divides_premium_by_divisor\`** — the normal case. Premium 1% (10_000_000 ppb), divisor 8 → rate 0.125% (1_250_000 ppb). The expected value is the paper math \`10_000_000 / 8 = 1_250_000\`. Catches off-by-one in the division.

2. **\`rate_clamps_at_positive_cap\`** — clamping kicks in when the premium would produce a raw rate above the cap. Premium 100% → raw 12.5% → clamped to 4%. **Catches: "I forgot to clamp" bugs.**

3. **\`rate_clamps_at_negative_cap\`** — symmetric to #2 on the negative side. Premium -100% → raw -12.5% → clamped to -4%. **Catches: "I clamped only the positive side" bugs.** This is a real bug pattern; people write \`min(raw, cap)\` instead of \`raw.clamp(-cap, cap)\` and miss the negative side.

4. **\`rate_zero_when_divisor_is_zero\`** — the disabled-funding case via divisor. Even with a non-zero premium, \`divisor = 0\` makes the function return zero. **Catches: forgot to guard against division-by-zero.** Without the guard, this test would panic in debug mode.

5. **\`rate_zero_when_cap_is_zero_funding_disabled\`** — the disabled-funding case via cap. With \`rate_cap = 0\`, the clamp is \`[0, 0]\`, so any raw rate clamps to 0. **Catches: assuming clamp(0, 0) does something other than return 0.** Also confirms our "no special case for cap == 0" approach works.

> 🛑 **Predict.** What happens if you set \`params.rate_cap = FundingRate(-40_000_000)\` (a negative cap) and run test 2?

(Answer: **Same result — \`FundingRate(40_000_000)\`.** Because \`.abs()\` extracts the magnitude. Negative caps and positive caps with the same absolute value produce identical behavior. **The "negative cap" is silently accepted.** This is the defensive abs at work — the user gets reasonable behavior either way.)

### Step 4: Update \`lib.rs\`

The current re-export line:

\`\`\`rust
pub use compute::compute_premium;
\`\`\`

Becomes:

\`\`\`rust
pub use compute::{compute_premium, compute_rate};
\`\`\`

Two functions now in the public API. **Alphabetical order maintained** — \`compute_premium\` before \`compute_rate\`. The pattern continues with L7 when \`apply_funding\` arrives.

### Step 5: Run tests

\`\`\`bash
cargo test -p openhl-funding
\`\`\`

Expected output:

\`\`\`
running 10 tests
test compute::tests::premium_is_antisymmetric_in_mark_index ... ok
test compute::tests::premium_negative_when_mark_below_index ... ok
test compute::tests::premium_positive_when_mark_above_index ... ok
test compute::tests::premium_saturates_to_zero_when_index_is_zero ... ok
test compute::tests::premium_zero_when_mark_equals_index ... ok
test compute::tests::rate_clamps_at_negative_cap ... ok
test compute::tests::rate_clamps_at_positive_cap ... ok
test compute::tests::rate_divides_premium_by_divisor ... ok
test compute::tests::rate_zero_when_cap_is_zero_funding_disabled ... ok
test compute::tests::rate_zero_when_divisor_is_zero ... ok

test result: ok. 10 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

10 tests, all green. Rate tests + premium tests + proptest.

Common errors:

- **Panic in \`rate_zero_when_divisor_is_zero\`** — you forgot the early-return guard. \`premium.0 / 0\` is an arithmetic panic in Rust. Add \`if params.divisor == 0 { return FundingRate(0); }\` at the top of the function.
- **\`assertion failed: left=-125000000 right=-40000000\` in \`rate_clamps_at_negative_cap\`** — you wrote \`raw.min(cap).max(-cap)\` instead of \`raw.clamp(-cap, cap)\`, and got the min/max order wrong. \`.clamp(min, max)\` is the canonical Rust idiom; use it.
- **\`assertion failed: left=0 right=1_250_000\` in \`rate_divides_premium_by_divisor\`** — you wrote \`premium.0 / params.divisor\` (mixed types) instead of \`premium.0 / i64::from(params.divisor)\`. The error is actually a compile error (\`u32 vs i64\` mismatch); if you typo'd \`as i64\` it might compile but truncate. Use \`i64::from(...)\`.
- **\`error: cannot find function 'compute_rate'\`** in \`lib.rs\` re-export — you added \`compute_rate\` to the re-export but didn't define the function. Check that you actually added the function body to \`compute.rs\`.

## Design reflection

Four load-bearing decisions in this lesson:

1. **Divide first, then clamp.** The cap binds at the *rate* level (the output), not the *premium* level (the input). Reversing the order would effectively divide the cap by the divisor, silently weakening it. **Order-of-operations matters when units differ.**

2. **\`.abs()\` on the cap.** Defensive against users passing negative caps; cheap (~1ns) and removes a footgun. **Defensive idioms at the API boundary are worth their cost.**

3. **\`clamp(-cap, cap)\` instead of explicit min/max.** Rust's built-in \`.clamp\` is shorter, more idiomatic, and less error-prone than \`raw.max(-cap).min(cap)\`. **Use stdlib APIs when they fit; reach for custom code only when they don't.**

4. **No special case for \`cap == 0\`.** It falls out of the clamp naturally: \`clamp(-0, 0)\` returns \`0\`. **Edge cases handled naturally are better than edge cases with explicit branches.** Explicit branches add code paths to test; natural handling is automatically covered.

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/compute.rs ./crates/funding/src/compute.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
\`\`\`

After L6:
- **compute.rs** matches Stage 8b through \`compute_premium\` + \`compute_rate\` + \`saturate_i128_to_i64\` + the 4 premium tests + 5 rate tests + 1 proptest. The only remaining gap is \`apply_funding\` and the balanced-book proptest (L7).
- **lib.rs** re-exports \`compute_premium\` and \`compute_rate\`. \`apply_funding\` is L7's addition.

Return:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: Why is \`params.divisor\` a \`u32\` if we have to widen it to \`i64\` anyway?**
The widening is a single \`i64::from(u32)\` call — a no-op cost in machine code. The benefit of \`u32\` storage is bit cost (\`FundingParams\` is \`Copy\`, smaller is better) and semantic clarity (a divisor of \`-1\` or \`u64::MAX\` makes no sense; \`u32::MAX\` is still ~4 billion, plenty of headroom). **\`u32\` documents intent: "this is a small positive count."**

**Q: Could \`compute_rate\` ever overflow?**
The division \`premium / divisor\` cannot grow the value — division by a positive integer produces a smaller magnitude. \`clamp(-cap, cap)\` cannot grow beyond \`cap\`'s i64 value. **No overflow possible inside \`compute_rate\`.** Unlike \`compute_premium\`, no i128 intermediate is needed.

**Q: What if \`rate_cap > i64::MAX / 2\`? Does the symmetric clamp still work?**
\`.abs()\` on \`i64::MIN\` panics (no positive \`i64\` for \`i64::MIN\`'s magnitude). With \`rate_cap.0 == i64::MIN\`, the \`.abs()\` would panic. Stage 8b doesn't guard against this — it's a user-supplied \`FundingParams\` issue. Realistic deployments use values like \`40_000_000\` (way below \`i64::MAX / 2\`), so the edge isn't reachable in practice. **A defensive \`saturating_abs()\` would handle this, but Stage 8b doesn't bother.**

**Q: Why no proptest for \`compute_rate\`?**
There's no obvious algebraic property to test. "Divide and clamp" doesn't have an antisymmetry, commutativity, or other invariant that proptest would shine on. The 5 hand-traced tests cover the input regions (normal divide, positive clamp, negative clamp, divisor zero, cap zero) well. **Proptest is great for properties; hand-traced tests are great for distinct input regions.** Don't force a proptest where there's no property to test.

## Next lesson (L7)

L7 adds \`apply_funding\` — the third and final pure function. It takes a slice of \`Position\`s, a \`MarkPrice\`, and a \`FundingRate\`, and returns a \`Vec<Settlement>\` (one per non-flat position). The function is ~25 lines but encodes the *longs-pay-shorts* sign convention and includes the **balanced-book zero-sum** proptest — for every set of equal-and-opposite positions, the settlement deltas sum to zero (funding redistributes; it doesn't create or destroy quote currency). This is the second proptest in the crate and closes Module 2.`,
                },
                {
                  title: "Lesson 7 — apply_funding — sign convention + zero-sum proptest",
                  slug: "openhl-funding-apply-funding-en",
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 40,
                  xpReward: 80,
                  content: `# Lesson 7 — \`apply_funding\` — sign convention + zero-sum proptest

## Goal

By the end of this lesson:

\`\`\`bash
cargo test -p openhl-funding
\`\`\`

…passes 15 tests (10 from L4-L6 + 5 new). \`compute.rs\` gains the final pure function:

- **\`apply_funding(positions, mark, rate) -> Vec<Settlement>\`** — applies the rate to every non-flat position and produces a settlement per match. ~25 lines.
- **4 hand-traced unit tests**:
  - \`apply_funding_skips_flat_positions\`
  - \`apply_funding_longs_pay_shorts_when_rate_positive\`
  - \`apply_funding_shorts_pay_longs_when_rate_negative\`
  - \`apply_funding_returns_empty_on_zero_rate\`
- **1 proptest** — \`balanced_book_settlements_sum_to_zero\` — for any equal-and-opposite pair of positions, the settlements sum to zero. **The fundamental conservation law for funding: it redistributes, it doesn't create or destroy.**

**Module 2 closes** after this lesson. All three pure functions (\`compute_premium\`, \`compute_rate\`, \`apply_funding\`) are in place. Module 3 (the clock state machine) starts at L8.

The teaching focus is the **sign convention** (longs-pay-shorts), specifically *how* the code expresses it: a single \`-\` in front of \`delta_unscaled\`. One character carries the entire sign contract.

## Recap

After L6:
- \`compute_premium\` → \`Premium\`
- \`compute_rate\` → \`FundingRate\`
- 10 tests passing, 1 proptest passing
- \`saturate_i128_to_i64\` has one user (\`compute_premium\`)

L7 wires the final stage of the pipeline — turning a rate into per-account settlements — and adds the second user of the saturate helper.

## Plan

Three edits:

1. **Append \`apply_funding\` to \`compute.rs\`** — after \`compute_rate\`, before \`saturate_i128_to_i64\`.
2. **Append 4 unit tests + 1 proptest** to the existing \`mod tests\` block.
3. **Update \`lib.rs\`** — add \`apply_funding\` to the re-exports.

> 🛑 **Predict.** Before scrolling: we have \`size: PositionSize(i64)\` (positive = long, negative = short) and \`rate: FundingRate(i64)\` (positive = longs pay shorts). The naive product \`size × rate\` is positive when a long is in a positive-rate world. **But the settlement delta for a long should be *negative* (longs pay).** What's the cleanest way to encode the sign flip?

(Answer: **A single \`-\` in front of the product.** \`delta = -(size × mark × rate / RATE_SCALE)\`. The product \`size × rate\` naturally encodes "magnitude × direction-of-payment-flow," but the sign convention for \`Notional\` is "account-centric" (positive = receives, negative = pays). The \`-\` flips from market-centric to account-centric. **One unary minus carries the entire convention.** Anyone reading the code sees the \`-\` and knows the convention was deliberately inverted at that point.)

## Walk-through

### Step 1: Add \`apply_funding\`

Open \`crates/funding/src/compute.rs\`. After \`compute_rate\`, before \`saturate_i128_to_i64\`, add:

\`\`\`rust
/// Apply \`rate\` to each position, producing one [\`Settlement\`] per non-flat
/// position. Flat positions (\`size == 0\`) are dropped — there's no settlement
/// to record. Order of input positions is preserved in the output.
///
/// Sign convention: with positive \`rate\`, longs (positive size) pay; shorts
/// (negative size) receive. The product \`size * mark * rate / RATE_SCALE\`
/// is the quote-currency delta; long pays → delta is negative for longs.
#[must_use]
pub fn apply_funding(
    positions: &[Position],
    mark: MarkPrice,
    rate: FundingRate,
) -> Vec<Settlement> {
    if rate.0 == 0 {
        return Vec::new();
    }

    let mut out = Vec::with_capacity(positions.len());
    for pos in positions {
        if pos.size.0 == 0 {
            continue;
        }
        // notional = size * mark, in i128 to absorb the product's full range.
        let notional = i128::from(pos.size.0).saturating_mul(i128::from(mark.0));
        // delta_unscaled = notional * rate; still i128.
        let delta_unscaled = notional.saturating_mul(i128::from(rate.0));
        // Sign convention: longs PAY when rate > 0. The product above is
        // positive (long size * positive rate) — we flip its sign so the
        // resulting delta is negative for longs and positive for shorts.
        let delta_scaled = -delta_unscaled / i128::from(RATE_SCALE);
        out.push(Settlement {
            account: pos.account,
            delta: Notional(saturate_i128_to_i64(delta_scaled)),
        });
    }
    out
}
\`\`\`

~25 lines. Six moving parts:

1. **\`if rate.0 == 0 { return Vec::new(); }\`** — the zero-rate fast path. No allocation, no work. Reflects the contract: a zero rate means "no funding to apply." Common case during boot or oracle outages.

2. **\`Vec::with_capacity(positions.len())\`** — pre-allocate the output capacity. Even though we may filter some out (flat positions), the input length is a good upper bound. **Avoids re-allocation as we push.** Tiny optimization; matters in a hot path.

3. **\`if pos.size.0 == 0 { continue; }\`** — skip flat positions. They have no economic exposure; settling them produces a zero delta that pollutes the output. **The contract says output length differs from input length precisely when flat positions are present.**

4. **\`i128::from(pos.size.0).saturating_mul(i128::from(mark.0))\`** — the notional product. \`size * mark\` can exceed \`i64::MAX\` for big positions and big marks (e.g., a position of \`1e18\` units × mark of \`1e10\` = \`1e28\`, way past i64). **i128 + saturating_mul: same defensive recipe as \`compute_premium\`.**

5. **\`notional.saturating_mul(i128::from(rate.0))\`** — the next product. Now we have \`size × mark × rate\`, all in i128. Even at this stage, i128 can saturate at pathological inputs.

6. **\`-delta_unscaled / i128::from(RATE_SCALE)\`** — the final scaling + sign flip. The division by \`RATE_SCALE\` undoes the rate's per-billion scaling. **The leading \`-\` is the sign convention.**

Then \`saturate_i128_to_i64(delta_scaled)\` clips back to i64 (Notional's inner type), and we push a \`Settlement\`.

> 🛑 **Predict.** Why does the function take \`positions: &[Position]\` (a slice) instead of \`positions: Vec<Position>\` (an owned vec)?

(Answer: **The caller owns the position list and re-uses it across ticks.** Taking ownership would force the caller to clone before each call. A slice borrow is zero-cost; the caller retains ownership. **Accept the least-restrictive type the function can use** — slice over Vec when iteration is all you need.)

> 🛑 **Anti-fluency.** "Could we use \`positions.iter().filter(...).map(...).collect()\` instead of the loop?" **Yes, and it would be more idiomatic Rust.** Stage 8b uses the imperative loop because the intermediate calculations are easier to follow when they're separate \`let\` bindings. The functional chain \`positions.iter().filter(|p| p.size.0 != 0).map(|pos| { let notional = ...; Settlement { ... } }).collect()\` works identically. **Readability over idiom — pick whichever shape the team finds easier to debug.**

### Step 2: Walk through the sign convention

The sign flip is the most subtle part of the function. Let's trace it through both directions.

**Positive rate, long position:**
- \`size.0 = +100\`, \`mark.0 = 100\`, \`rate.0 = 1_000_000\` (0.1%)
- \`notional = 100 × 100 = 10_000\` (i128)
- \`delta_unscaled = 10_000 × 1_000_000 = 10_000_000_000\` (positive i128)
- \`delta_scaled = -10_000_000_000 / 1_000_000_000 = -10\`
- \`Notional(-10)\` → "long pays 10"

**Positive rate, short position:**
- \`size.0 = -50\`, \`mark.0 = 100\`, \`rate.0 = 1_000_000\`
- \`notional = -50 × 100 = -5_000\` (negative i128)
- \`delta_unscaled = -5_000 × 1_000_000 = -5_000_000_000\`
- \`delta_scaled = -(-5_000_000_000) / 1_000_000_000 = 5\`
- \`Notional(+5)\` → "short receives 5"

**Negative rate, long position:**
- \`size.0 = +100\`, \`mark.0 = 100\`, \`rate.0 = -1_000_000\`
- \`notional = 10_000\`
- \`delta_unscaled = 10_000 × -1_000_000 = -10_000_000_000\`
- \`delta_scaled = -(-10_000_000_000) / 1_000_000_000 = 10\`
- \`Notional(+10)\` → "long receives 10" ✓

**The single \`-\` in front of \`delta_unscaled\` handles all four cases.** Without it, longs would receive when they should pay, and vice versa. **One character; one design decision.**

> 🛑 **Anti-fluency.** "Why not compute the delta without the \`-\` and call it 'market delta', then flip at the storage layer?" **Two sign-flip points double the chance of bugs.** Encoding "account-centric" once at the math layer means everyone downstream (bridge, balances, telemetry) reads \`Notional\` with the consistent convention. **A single conversion point is half the surface area to test.**

### Step 3: Add the 4 unit tests

After the existing rate tests (and before the proptest block — we'll add the new proptest to the existing \`proptest! { ... }\` block in Step 4), add:

\`\`\`rust
    #[test]
    fn apply_funding_skips_flat_positions() {
        let positions = vec![pos(1, 0), pos(2, 100), pos(3, 0)];
        let settlements = apply_funding(&positions, MarkPrice(100), FundingRate(1_000_000));
        assert_eq!(settlements.len(), 1);
        assert_eq!(settlements[0].account, AccountId(2));
    }

    #[test]
    fn apply_funding_longs_pay_shorts_when_rate_positive() {
        // size 100 (long), mark 100, rate 0.001 (1_000_000 ppb)
        // delta = -(100 * 100 * 1_000_000 / 1_000_000_000) = -10
        let positions = vec![pos(1, 100), pos(2, -50)];
        let s = apply_funding(&positions, MarkPrice(100), FundingRate(1_000_000));
        assert_eq!(s[0].account, AccountId(1));
        assert_eq!(s[0].delta, Notional(-10), "long pays");
        assert_eq!(s[1].account, AccountId(2));
        assert_eq!(s[1].delta, Notional(5), "short receives, half size");
    }

    #[test]
    fn apply_funding_shorts_pay_longs_when_rate_negative() {
        let positions = vec![pos(1, 100), pos(2, -50)];
        let s = apply_funding(&positions, MarkPrice(100), FundingRate(-1_000_000));
        assert_eq!(s[0].delta, Notional(10), "long receives");
        assert_eq!(s[1].delta, Notional(-5), "short pays");
    }

    #[test]
    fn apply_funding_returns_empty_on_zero_rate() {
        let positions = vec![pos(1, 100), pos(2, -50)];
        let s = apply_funding(&positions, MarkPrice(100), FundingRate(0));
        assert!(s.is_empty());
    }
\`\`\`

4 tests, each pinning a behavior:

1. **\`apply_funding_skips_flat_positions\`** — input has 3 positions but 2 are flat. Output has 1. Filter semantics confirmed. **Also confirms the account in the surviving settlement matches the non-flat input position.**

2. **\`apply_funding_longs_pay_shorts_when_rate_positive\`** — the canonical scenario. Long position 100 at mark 100 with rate 0.1% → delta -10 (long pays). Short position -50 → delta +5 (short receives, half magnitude because position is half size). **The asymmetric magnitudes prove that delta scales with \`|size|\`, not just sign.**

3. **\`apply_funding_shorts_pay_longs_when_rate_negative\`** — same positions, opposite rate. Long now receives +10, short pays -5. **Confirms the sign convention is symmetric.**

4. **\`apply_funding_returns_empty_on_zero_rate\`** — the fast-path. Non-empty positions, zero rate → empty output. **Confirms the early return runs before any per-position work.**

The \`pos(account, size)\` helper was added in L5's test-module setup; we use it freely here.

### Step 4: Add the balanced-book zero-sum proptest

In the existing \`proptest! { ... }\` block (which currently holds only \`premium_is_antisymmetric_in_mark_index\`), add a second test:

\`\`\`rust
        /// Sum of all settlement deltas is zero (or exactly the negation of
        /// itself with saturation tolerance) when the population is balanced.
        /// Equivalently: funding redistributes between longs and shorts —
        /// it doesn't create or destroy quote currency.
        ///
        /// We test the property by constructing equal-and-opposite long/short
        /// pairs and asserting their settlements sum to zero exactly.
        #[test]
        fn balanced_book_settlements_sum_to_zero(
            size in 1i64..1_000_000,
            mark in 1u64..1_000_000,
            rate in -10_000_000i64..10_000_000,
        ) {
            let positions = vec![
                pos(1, size),
                pos(2, -size),
            ];
            let s = apply_funding(&positions, MarkPrice(mark), FundingRate(rate));
            if rate == 0 {
                prop_assert!(s.is_empty());
            } else {
                prop_assert_eq!(s.len(), 2);
                prop_assert_eq!(s[0].delta.0 + s[1].delta.0, 0);
            }
        }
\`\`\`

**The zero-sum property is the fundamental conservation law for funding.** A balanced book — one long for every short of equal size — should redistribute exactly. The shorts collectively receive what the longs collectively pay; quote currency is neither created nor destroyed.

The proptest exercises this:
- **Generate** a random \`size\` (1 to 1M), \`mark\` (1 to 1M), and \`rate\` (-10M to +10M ppb, i.e., -1% to +1%).
- **Construct** a balanced book: account 1 long \`size\`, account 2 short \`size\`.
- **Apply funding**. If rate is 0, the output is empty (no settlements at all). Otherwise, exactly 2 settlements.
- **Assert** the deltas sum to 0.

> 🛑 **Predict.** Why bound \`size\` to \`1i64..1_000_000\` rather than the full i64 range?

(Answer: **At very large \`size\` or \`mark\`, the i128 intermediate can saturate.** When \`i128::saturating_mul\` clips, the round-trip computation \`(size * mark * rate / RATE_SCALE)\` loses information — the long's saturated value won't be exactly the negative of the short's saturated value, breaking the zero-sum property. **The 1M bound keeps inputs in the regime where saturation doesn't kick in.** A real production proptest could be wider but would need to add tolerance for saturation; we chose the simpler "no saturation regime" approach.)

> 🛑 **Anti-fluency.** "Couldn't we test \`sum.abs() < 1\` to allow for integer-division rounding instead of \`== 0\`?" **Within the input range we chose, the property holds exactly.** Because \`size_long == -size_short\`, the i128 products are exact negatives of each other before the divide; the divide by \`RATE_SCALE\` doesn't change that (integer division rounds toward zero, and \`-x / d == -(x / d)\` for any signed \`x\` and positive \`d\`). **We get exact zero-sum within range; no tolerance needed.**

### Step 5: Update \`lib.rs\`

Current re-export:

\`\`\`rust
pub use compute::{compute_premium, compute_rate};
\`\`\`

Becomes:

\`\`\`rust
pub use compute::{apply_funding, compute_premium, compute_rate};
\`\`\`

Alphabetical order. **Module 2's three pure functions are now all re-exported at the crate root.** Callers can use them without going through \`compute::\`.

### Step 6: Run tests

\`\`\`bash
cargo test -p openhl-funding
\`\`\`

Expected:

\`\`\`
   Compiling openhl-funding v0.1.0 (/Users/.../my-openhl/crates/funding)
warning: unresolved link to \`FundingClock\`
    Finished \`test\` profile [unoptimized + debuginfo] in 0.7s

running 15 tests
test compute::tests::apply_funding_longs_pay_shorts_when_rate_positive ... ok
test compute::tests::apply_funding_returns_empty_on_zero_rate ... ok
test compute::tests::apply_funding_shorts_pay_longs_when_rate_negative ... ok
test compute::tests::apply_funding_skips_flat_positions ... ok
test compute::tests::balanced_book_settlements_sum_to_zero ... ok
test compute::tests::premium_is_antisymmetric_in_mark_index ... ok
... (rest of L4-L6 tests)

test result: ok. 15 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

**15 tests, all green.** Only one rustdoc warning left (\`FundingClock\` — resolves at L8). **Module 2 closes.**

Common errors:

- **\`delta == 0\` everywhere** — you forgot the \`-\` in front of \`delta_unscaled\`. Without the sign flip, longs and shorts get the same-sign delta (because \`pos.size\` carries the sign already), so longs and shorts both pay/both receive instead of opposing. The unit tests catch this immediately.
- **Long pays, short pays** (both negative deltas) — you missed that \`pos.size\` is signed. The naive \`size * mark * rate\` (no upcast) might work but the sign tracking is fragile. Use \`i128::from(pos.size.0)\` to preserve the sign through the multiplication.
- **Proptest fails at \`size = 100_000, mark = 100_000\`** — \`size * mark = 1e10\`, then \`× rate = 1e16\` — still within i128 range. Property should still hold. If it fails, check the sign flip: the long and short must produce equal-magnitude deltas with opposite signs.
- **\`assertion failed: s[0].delta == Notional(-10)\` got \`Notional(10)\`** — you set \`delta_unscaled\` correctly but forgot the leading \`-\`. The "longs pay = negative delta" convention requires the flip.

## Design reflection

Four load-bearing decisions in this lesson:

1. **Single unary minus carries the entire sign convention.** Encoding "longs pay" via \`-delta_unscaled\` keeps the convention in one place, at the boundary between market-centric and account-centric semantics. **Two sign-flip points would double the surface area for bugs.**

2. **Filter, don't error.** Flat positions are filtered out silently. We don't return \`Result<Vec<Settlement>, FlatPositionError>\` — flat positions are *expected* (any account that closed out before this tick). **The "no flat positions" property is a precondition the caller can verify if they care; we just drop them.**

3. **Slice input, owned output.** \`&[Position]\` lets the caller retain ownership; \`Vec<Settlement>\` returns owned data the caller didn't have before. **The function consumes references and produces values; it's a pure transformation.**

4. **Proptest range avoids saturation regime.** Bounding \`size in 1..1M\` keeps the i128 products below \`saturating_mul\`'s clamp threshold. The property holds *exactly* in this range; broadening would force us to weaken the property. **Choose proptest ranges to make the property exactly true, not approximately.**

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/compute.rs ./crates/funding/src/compute.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
\`\`\`

After L7:
- **compute.rs** matches Stage 8b **exactly**. All three pure functions, all helpers, all tests, all proptests.
- **lib.rs** re-exports \`apply_funding\`, \`compute_premium\`, \`compute_rate\`. The remaining gap is \`pub mod clock;\` and its re-exports — L8.

**Module 2 is complete.** Module 3 starts at L8.

Return:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: Why does the output preserve input order rather than sorting by account?**
Determinism. Sorting would impose an ordering choice; preserving input order makes the function's behavior trivially predictable from the input. **Callers that need sorted output can sort the result; callers that don't, don't pay the cost.** The cheapest behavior wins by default.

**Q: What's the order of magnitude for \`notional × rate\` at realistic inputs?**
With \`size = 1M\`, \`mark = 1M\`, \`rate = 1e7\` (1% of RATE_SCALE = 1% per interval): \`notional = 1e12\`, \`delta_unscaled = 1e19\`. This is right around \`i64::MAX\` (~9.2e18), so we're in the saturation regime already with these "reasonable" inputs. **i128 intermediates are not optional for realistic deployments.**

**Q: Why no tests for the saturation behavior of \`apply_funding\`?**
The saturation cases are tested *via the helper* (\`saturate_i128_to_i64\`'s boundary behavior is explored in L5). Testing the same boundary again at this function call would be redundant. **Test the helper once; trust it everywhere else.** A composition test (\`size = u64::MAX, mark = u64::MAX, rate = i64::MAX\`) might be worth adding for completeness, but Stage 8b chose not to — the saturation guarantees come from the helper, and the helper is tested.

**Q: Could \`apply_funding\` be a \`parallel_iter\` for huge position lists?**
Yes, with \`rayon\`. At v0 the position list is at most a few thousand accounts (HL's actual user count for any single market). Parallelization overhead exceeds the work. **At 10K+ positions per tick, rayon would pay off.** Defer until production traffic demands it.

## Module 2 milestone — what you've built

After L7:
- **3 pure functions**: \`compute_premium\`, \`compute_rate\`, \`apply_funding\`.
- **1 private helper**: \`saturate_i128_to_i64\`.
- **15 tests**: 9 hand-traced + 2 proptests (antisymmetry, zero-sum).
- **~150 lines** of \`compute.rs\` (excluding tests).
- Module 2 is **byte-identical to Stage 8b** for everything outside the clock.

The crate now produces a fully-determined \`Vec<Settlement>\` from a \`(positions, mark, index, params)\` tuple. **The math is done.** Module 3 wraps this in tick-gating state — when to compute, when to skip, when to settle.

## Next lesson (L8)

L8 creates \`crates/funding/src/clock.rs\` — a new module — with the \`FundingClock\` struct + the \`FundingTick\` output type. The first version of \`tick()\` is added: a function that combines \`compute_premium\` + \`compute_rate\` + \`apply_funding\` behind a "has enough time elapsed?" guard. **The clock is the discrete event loop that calls the pure math on the right cadence.** Tests in L8 are simple sanity tests; the *invariants* (at-most-one-per-interval, no-catch-up) get their own lessons in L9 and L10.`,
                },
              ],
            },
          },
          {
            title: "Clock state machine",
            sortOrder: 3,
            lessons: {
              create: [
                {
                  title: "Lesson 8 — FundingClock — the discrete event loop",
                  slug: "openhl-funding-clock-scaffold-en",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 35,
                  xpReward: 70,
                  content: `# Lesson 8 — \`FundingClock\` — the discrete event loop

## Goal

By the end of this lesson:

\`\`\`bash
cargo test -p openhl-funding
\`\`\`

…passes 18 tests (15 from L4-L7 + 3 new). The crate gains its **third and final module**:

- **\`crates/funding/src/clock.rs\`** — new file with the module doc + 2 structs + 1 impl block:
  - **\`FundingClock\`** — owns \`params: FundingParams\` and \`last_settled_at: u64\`. The state across funding ticks.
  - **\`FundingTick\`** — output type carrying \`settled_at\`, \`premium\`, \`rate\`, \`settlements\`. Returned from \`tick()\` on success.
  - **\`impl FundingClock\`** — \`new\`, \`params\`, \`last_settled_at\` accessors, and the \`tick(...)\` function.
- **3 sanity tests**:
  - \`first_tick_before_interval_returns_none\`
  - \`first_tick_at_exact_interval_fires\`
  - \`empty_positions_yield_empty_settlements_but_still_advance_clock\`
- **\`crates/funding/src/lib.rs\`** — declares \`pub mod clock;\` and re-exports \`FundingClock\` + \`FundingTick\`. **Last rustdoc warning resolves.**

L8 is the **module opener**. The invariants that make this clock subtle — *at most one settlement per interval*, *no catch-up after long gaps* — get their own dedicated lessons (L9 and L10). This lesson establishes the structure.

The teaching focus is **state machines with discrete event loops**: how a pure function (the math) gets gated by a stateful object (the clock) without losing determinism.

## Recap

After L7:
- 3 pure functions (\`compute_premium\`, \`compute_rate\`, \`apply_funding\`) all green.
- 15 tests passing including 2 proptests.
- \`compute.rs\` byte-identical to Stage 8b.
- The crate computes funding *math*; it doesn't yet know *when* to apply it.

L8 wires the "when." The clock is a thin layer that calls the math at the right times — and crucially, that *doesn't* call the math at the wrong times.

## Plan

Two file edits:

1. **Create \`crates/funding/src/clock.rs\`** — module doc + imports + \`FundingClock\` + \`FundingTick\` + \`impl FundingClock { new, params, last_settled_at, tick }\`.
2. **Add \`#[cfg(test)] mod tests\`** to \`clock.rs\` with 3 sanity tests.
3. **Update \`crates/funding/src/lib.rs\`** — \`pub mod clock;\` + re-export \`FundingClock\`, \`FundingTick\`.

> 🛑 **Predict.** Before scrolling: \`tick()\` will return \`Option<FundingTick>\` — \`Some\` if a settlement happened, \`None\` if not. **Why return \`Option\` instead of always returning \`FundingTick\` (with empty \`settlements\` when no settlement is due)?** Hint: think about what the caller does with the result.

(Answer: **\`None\` signals "no state change happened" without forcing the caller to inspect the result.** A caller wiring funding ticks into a block production loop wants to know cheaply whether to emit a \`FundingApplied\` event, log a settlement, etc. With \`Option\`, \`if let Some(tick) = clock.tick(...)\` is the natural shape. Always-returning would force the caller to check \`if !tick.settlements.is_empty()\` or similar — which doesn't even capture the right meaning (an empty settlement list could mean "tick fired but no positions" *or* "tick didn't fire"). **\`Option\` makes the dichotomy explicit at the type level.**)

## Walk-through

### Step 1: Create \`clock.rs\`

Create \`crates/funding/src/clock.rs\`. Initial content (top of file):

\`\`\`rust
//! Funding clock — the gating state machine that decides *when* to settle.
//!
//! The rate math lives in [\`crate::compute\`]; this module is the discrete
//! event loop that calls it on the right cadence. Two invariants:
//!
//!   1. **At most one settlement per interval.** Two ticks at the same
//!      timestamp produce one settlement, not two.
//!   2. **No catch-up.** If \`now\` jumps forward by 10 intervals (validator
//!      reboot, chain pause), we settle *once*. Compounding 10 ticks of
//!      retroactive funding from a single stale snapshot would over-pay
//!      whichever side has been losing without giving the loser a chance
//!      to close. Production deployments that need catch-up logic should
//!      build it on top of repeated ticks with fresh snapshots, not here.

use crate::compute::{apply_funding, compute_premium, compute_rate};
use crate::types::{
    FundingParams, FundingRate, IndexPrice, MarkPrice, Position, Premium, Settlement,
};
\`\`\`

Two parts to notice:

**The module doc names both invariants up front.** The actual enforcement is in \`tick()\` (interval guard) and the tests of L9 / L10. But the *contract* is here at the top — anyone reading the module sees both invariants before any code. **Promise the contract; defend it with code and tests below.**

**The imports pull in everything we'll need.** \`apply_funding\`, \`compute_premium\`, \`compute_rate\` (Module 2). \`FundingParams\`, \`FundingRate\`, \`IndexPrice\`, \`MarkPrice\`, \`Position\`, \`Premium\`, \`Settlement\` (Module 1). **Same logic as L4's compute.rs imports: stabilize boilerplate early.**

### Step 2: Add the \`FundingClock\` struct

After the imports:

\`\`\`rust
/// State that persists across funding ticks. The clock is initialized with
/// the timestamp of its last settlement (often the chain's genesis time, or
/// the previous validator-set's last tick).
#[derive(Clone, Debug)]
pub struct FundingClock {
    params: FundingParams,
    last_settled_at: u64,
}
\`\`\`

Two fields, both *private*:

1. **\`params: FundingParams\`** — the per-network config (interval_secs, rate_cap, divisor). Set at construction; can be read via \`params()\` but not mutated. **Immutable post-construction — production deployments don't change funding params mid-run.**

2. **\`last_settled_at: u64\`** — the timestamp of the most recent successful tick. Updated on every successful tick. **The only mutable state.**

\`#[derive(Clone, Debug)]\` only. **No \`Copy\`** because \`Clone\` is cheap-enough and we don't want to make the clock so easy to duplicate that someone forgets which copy advanced. **No \`Eq\`/\`Hash\`/\`PartialOrd\`** — clocks aren't meaningfully equal-comparable; they're operational state machines.

> 🛑 **Anti-fluency.** "Should we use \`AtomicU64\` for \`last_settled_at\` to support concurrent ticks?" **No — the funding crate is single-threaded by contract.** Concurrent funding ticks would race on \`last_settled_at\` *and* on \`CLOB_STATE\` *and* on whatever balance store the bridge uses downstream. The right answer is "the caller serializes ticks," not "the clock handles concurrency." **Pushing concurrency into the data structure adds complexity for a problem that shouldn't exist.**

### Step 3: Add \`FundingTick\`

After \`FundingClock\`:

\`\`\`rust
/// The output of a successful tick. Returned by [\`FundingClock::tick\`] when
/// at least \`params.interval_secs\` have elapsed since the last settlement.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct FundingTick {
    pub settled_at: u64,
    pub premium: Premium,
    pub rate: FundingRate,
    pub settlements: Vec<Settlement>,
}
\`\`\`

Four fields, all \`pub\`. **Output structs typically have all-public fields** because callers consume them directly — they're plain data, not encapsulated state.

What each field carries:

- **\`settled_at: u64\`** — the timestamp the tick was applied (= \`now\` argument to \`tick()\`).
- **\`premium: Premium\`** — the premium computed at this tick (for telemetry / event emission).
- **\`rate: FundingRate\`** — the per-interval rate after divisor + cap (also for telemetry).
- **\`settlements: Vec<Settlement>\`** — what \`apply_funding\` produced. The actual deltas to apply.

**Why include \`premium\` and \`rate\` if \`settlements\` is what the bridge needs?** Because telemetry needs them. An observer wanting to log "funding rate at tick 12345 was 0.125%" can read \`tick.rate\` directly. Without these fields, telemetry would have to recompute the rate — duplicate work, and the duplicate could disagree with the actual rate if either side changes. **Surface intermediate values in the output struct when downstream consumers want them.**

\`PartialEq, Eq\` derives for testability — tests can \`assert_eq!(tick, expected)\`. **Cheap and useful.**

### Step 4: Add the impl block

After \`FundingTick\`:

\`\`\`rust
impl FundingClock {
    /// Construct a clock that thinks its last settlement happened at
    /// \`genesis_time\`. The first tick after \`genesis_time + interval_secs\`
    /// will fire.
    #[must_use]
    pub const fn new(params: FundingParams, genesis_time: u64) -> Self {
        Self {
            params,
            last_settled_at: genesis_time,
        }
    }

    #[must_use]
    pub const fn params(&self) -> FundingParams {
        self.params
    }

    #[must_use]
    pub const fn last_settled_at(&self) -> u64 {
        self.last_settled_at
    }

    /// Attempt a settlement. Returns \`Some\` only if at least one full
    /// \`interval_secs\` has elapsed since \`last_settled_at\`.
    ///
    /// On success, the clock advances to \`now\` (NOT to
    /// \`last_settled_at + interval\`) — see the "no catch-up" invariant in
    /// the module docs. Production callers wanting strict interval alignment
    /// can advance externally, but openhl's default is "settle on the first
    /// block ≥ interval boundary, then reset the deadline".
    pub fn tick(
        &mut self,
        now: u64,
        mark: MarkPrice,
        index: IndexPrice,
        positions: &[Position],
    ) -> Option<FundingTick> {
        if now < self.last_settled_at.saturating_add(self.params.interval_secs) {
            return None;
        }

        let premium = compute_premium(mark, index);
        let rate = compute_rate(premium, self.params);
        let settlements = apply_funding(positions, mark, rate);

        self.last_settled_at = now;

        Some(FundingTick {
            settled_at: now,
            premium,
            rate,
            settlements,
        })
    }
}
\`\`\`

Four methods:

#### \`new(params, genesis_time)\`

Construct the clock. **\`const fn\`** so \`static DEFAULT_CLOCK: FundingClock = FundingClock::new(...)\` is possible at compile time. **\`#[must_use]\`** because constructing a clock and discarding it is always a bug.

The doc explains the timing semantics: "The first tick after \`genesis_time + interval_secs\` will fire." A caller setting \`genesis_time = 1_000_000\` and \`interval_secs = 3600\` knows the first tick fires at or after \`1_003_600\`. **No surprises.**

#### \`params()\` and \`last_settled_at()\` accessors

Read-only access to the private fields. **\`const fn\`** + **\`#[must_use]\`** for both. Returning by value (not \`&FundingParams\`) because \`FundingParams: Copy\`. **Copy-cheap, no lifetime gymnastics for callers.**

#### \`tick(&mut self, now, mark, index, positions)\`

The heart of the clock. Three logical phases:

1. **Guard**: \`if now < self.last_settled_at.saturating_add(self.params.interval_secs) { return None; }\`. The \`saturating_add\` defends against \`u64\` overflow when \`last_settled_at\` is near \`u64::MAX\` (pathological, but free to defend).

2. **Compute**: chain the three Module 2 functions. \`compute_premium(mark, index)\` → \`compute_rate(premium, params)\` → \`apply_funding(positions, mark, rate)\`. **The clock composes them; it doesn't reimplement anything.**

3. **Update state + return**: advance \`last_settled_at\` to \`now\`, return \`Some(FundingTick { ... })\`.

**Crucially, the clock advances to \`now\`, not to \`last_settled_at + interval_secs\`.** This is the "no catch-up" invariant in action — when ticks fire late, they reset the deadline forward rather than catching up. L10's lesson explains why this matters.

> 🛑 **Predict.** With \`last_settled_at = 1_000_000\`, \`interval_secs = 3600\`, and a \`tick()\` at \`now = 1_010_000\` (= +10000s, i.e., ~2.8 intervals), what's \`last_settled_at\` after the tick?

(Answer: **\`1_010_000\`.** Not \`1_003_600\` (1 interval after genesis) and not \`1_007_200\` (2 intervals after genesis). The clock advances to \`now\` — see the doc comment in \`tick()\`. The next tick won't fire until \`now ≥ 1_010_000 + 3600 = 1_013_600\`. **This is the design choice; L10 explains the reasoning.**)

### Step 5: Add 3 sanity tests

After the \`impl FundingClock\` block:

\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{Notional, PositionSize};
    use openhl_clob::AccountId;

    fn pos(account: u64, size: i64) -> Position {
        Position {
            account: AccountId(account),
            size: PositionSize(size),
        }
    }

    fn balanced_book() -> Vec<Position> {
        vec![pos(1, 100), pos(2, -100)]
    }

    #[test]
    fn first_tick_before_interval_returns_none() {
        let params = FundingParams::hyperliquid_default(); // 3600s interval
        let mut clock = FundingClock::new(params, 1_000_000);

        // 3599 seconds later — not enough.
        let out = clock.tick(1_003_599, MarkPrice(100), IndexPrice(100), &balanced_book());
        assert!(out.is_none());
        // Clock didn't advance.
        assert_eq!(clock.last_settled_at(), 1_000_000);
    }

    #[test]
    fn first_tick_at_exact_interval_fires() {
        let params = FundingParams::hyperliquid_default();
        let mut clock = FundingClock::new(params, 1_000_000);

        let out = clock
            .tick(1_003_600, MarkPrice(100), IndexPrice(100), &balanced_book())
            .expect("tick should fire at exact interval boundary");
        assert_eq!(out.settled_at, 1_003_600);
        // mark == index → zero rate → empty settlements
        assert_eq!(out.rate, FundingRate(0));
        assert!(out.settlements.is_empty());
        assert_eq!(clock.last_settled_at(), 1_003_600);
    }

    #[test]
    fn empty_positions_yield_empty_settlements_but_still_advance_clock() {
        let params = FundingParams::hyperliquid_default();
        let mut clock = FundingClock::new(params, 1_000_000);

        let out = clock
            .tick(1_003_600, MarkPrice(101), IndexPrice(100), &[])
            .expect("tick fires regardless of position count");
        assert!(out.settlements.is_empty());
        // But the rate was still computed — useful for telemetry.
        assert_eq!(out.rate, FundingRate(1_250_000));
        assert_eq!(clock.last_settled_at(), 1_003_600);
    }
}
\`\`\`

Three things to notice about the test setup:

**The test module imports \`Notional\` and \`PositionSize\`** even though only \`PositionSize\` is used in this file (\`Notional\` is used in L9). Same boilerplate-stabilization pattern as L5's test module.

**Two helpers: \`pos(account, size)\` and \`balanced_book()\`.** The first echoes L5's helper. The second produces a canonical 2-position book that L8/L9 tests use repeatedly. **Helpers earn their keep when they're used in 3+ tests** — both these helpers are.

**Three tests, three concerns:**

1. **\`first_tick_before_interval_returns_none\`** — the guard works. Calling tick before the interval has elapsed → \`None\`. The clock state is unchanged. **Catches: "I forgot to guard" or "I always returned Some."**

2. **\`first_tick_at_exact_interval_fires\`** — the boundary inclusive. At \`genesis + interval_secs\` exactly, the tick fires. Catches off-by-one in the guard condition (\`<\` vs \`<=\`). The body verifies the math composition: \`mark == index\` → \`Premium(0)\` → \`FundingRate(0)\` → empty settlements.

3. **\`empty_positions_yield_empty_settlements_but_still_advance_clock\`** — the composition works even with zero positions. \`apply_funding(&[])\` returns empty; the clock still advances. **Catches: "I gated tick() on having positions"** or any other shortcut that mishandles the empty-input case.

> 🛑 **Anti-fluency.** "Should we test what happens if \`mark\` or \`index\` is zero?" **Already covered by L4's premium tests.** The clock just passes inputs through to \`compute_premium\`. If we didn't trust \`compute_premium\`, we'd add more tests in \`compute.rs\`, not duplicate them here. **Don't test the same behavior through two abstraction levels.**

### Step 6: Update \`lib.rs\`

Current state:

\`\`\`rust
//! ...

pub mod compute;
pub mod types;

pub use compute::{apply_funding, compute_premium, compute_rate};
pub use types::{ ... };
\`\`\`

Add the clock module:

\`\`\`rust
//! ...

pub mod clock;
pub mod compute;
pub mod types;

pub use clock::{FundingClock, FundingTick};
pub use compute::{apply_funding, compute_premium, compute_rate};
pub use types::{ ... };
\`\`\`

Module declarations stay alphabetical (\`clock\` before \`compute\` before \`types\`). Re-exports likewise. **L8's lib.rs is the final lib.rs shape** — L9 and L10 don't add any new module-level names.

### Step 7: Run tests

\`\`\`bash
cargo test -p openhl-funding
\`\`\`

Expected:

\`\`\`
   Compiling openhl-funding v0.1.0 (/Users/.../my-openhl/crates/funding)
    Finished \`test\` profile [unoptimized + debuginfo] in 0.6s

running 18 tests
test clock::tests::empty_positions_yield_empty_settlements_but_still_advance_clock ... ok
test clock::tests::first_tick_at_exact_interval_fires ... ok
test clock::tests::first_tick_before_interval_returns_none ... ok
test compute::tests::... (all 15 from L4-L7)

test result: ok. 18 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

**18 tests, no rustdoc warnings.** The crate's documentation is now complete.

Common errors:

- **\`tick\` fires for \`now == last_settled_at + interval - 1\`** — you used \`<=\` instead of \`<\` in the guard, or \`>\` instead of \`>=\` in the inverted form. The intended semantic: "fire if \`now >= last_settled_at + interval\`," which negated for the guard is \`if now < last_settled_at + interval { return None; }\`.
- **\`tick\` doesn't advance \`last_settled_at\`** — you forgot the \`self.last_settled_at = now;\` line before \`Some(FundingTick { ... })\`. The next tick would refire immediately.
- **\`out.settlements\` is non-empty** in \`empty_positions...\` test — \`apply_funding(&[])\` should return empty. Trace: the early-return on \`rate.0 == 0\` returns an empty vec, *and* an empty positions slice would skip the loop entirely. Either path yields empty.
- **Borrow checker error on \`clock.tick(...).expect(...)\` followed by \`clock.last_settled_at()\`** — \`tick\` takes \`&mut self\`; the borrow ends when the expression completes. If you assigned the result to a variable and then called \`clock.last_settled_at()\` *before* dropping the result, the borrow would be live. Solution: \`let out = clock.tick(...); assert_eq!(clock.last_settled_at(), ...); \` — the \`let\` ends the borrow at the end of the call.

## Design reflection

Five load-bearing decisions in this lesson:

1. **\`Option<FundingTick>\` instead of always-return.** \`None\` cheaply signals "no state change." Callers don't need to inspect a \`FundingTick\` to decide whether anything happened. **Use the type system to encode the "did this fire?" dichotomy.**

2. **Clock advances to \`now\`, not \`last_settled + interval\`.** The first big difference from "perfectly periodic" — the clock's deadline resets on every fire, regardless of how much elapsed. **L10 will defend this; here we just note it.**

3. **Module 2 functions composed without reimplementation.** \`tick()\` chains \`compute_premium\`, \`compute_rate\`, \`apply_funding\`. The clock doesn't know how any of them work — only the order. **Layering: math computes; clock gates.**

4. **\`FundingTick\` exposes intermediate values for telemetry.** Premium and rate are surfaced in the output, not just the final settlements. Downstream observers don't need to recompute. **Surface useful intermediates; recomputation invites divergence.**

5. **Module doc names both invariants up front.** The actual code that enforces them comes piece by piece (L8 guard, L9 boundary tests, L10 advancement choice). But the *contract* is documented before any of the code. **Documentation as design intent.**

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/clock.rs ./crates/funding/src/clock.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
\`\`\`

After L8:
- **clock.rs** matches Stage 8b through \`FundingClock\` + \`FundingTick\` + \`impl FundingClock { ... }\` + 3 of the 7 tests. The remaining 4 tests are split across L9 (3 tests on interval-gating + premium-driving) and L10 (1 milestone test on no-catch-up).
- **lib.rs** matches Stage 8b **exactly**. Final shape.

Return:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: Why is \`tick\` \`&mut self\` instead of consuming \`self\` and returning \`(Self, Option<FundingTick>)\`?**
Pragmatism. \`&mut self\` is the canonical Rust pattern for mutating in-place. Consuming-and-returning would force the caller to reassign: \`clock = clock.tick(...)\`. That's verbose for no semantic benefit. **\`&mut self\` for state machines that mutate; consuming for ones that genuinely transform.** A funding clock is the former.

**Q: Should \`FundingClock\` track the *number* of ticks (e.g., for telemetry)?**
You could add a \`ticks_fired: u64\` counter. Stage 8b doesn't — the caller can count externally if they care. **Don't add state to a minimal struct without a concrete consumer.** Adding it later is one struct field change; removing unused state is a breaking API change.

**Q: Why does \`tick\` take \`mark\`, \`index\`, \`positions\` as arguments instead of having them on the clock?**
Because they change every tick. \`mark\` and \`index\` come from oracle/orderbook reads at tick time; \`positions\` is a fresh snapshot. Storing them on the clock would require the caller to update them before calling \`tick\` — which is the same shape, with more steps. **Inputs that change per call go in the call; inputs that persist go on the receiver.**

**Q: Why no proptest for the clock?**
The clock's properties are mostly *interval semantics* (one settlement per interval, no catch-up) which are easier to express as hand-traced tests. There's no algebraic property like the antisymmetry or zero-sum of Module 2. **The clock is an event loop; event loops are tested with scenarios, not algebra.**

## Next lesson (L9)

L9 adds 3 more tests to \`clock.rs\`, exercising the **interval-gating invariant** in increasing depth:

- \`premium_drives_settlement_signs\` — when mark > index, settlements flow long→short (full math composition test).
- \`second_tick_requires_another_full_interval\` — after a successful tick, the next one needs another \`interval_secs\`. The interval isn't a one-time check.
- \`capped_rate_when_premium_extreme\` — at saturation premiums, the rate clamps to the cap. Confirms \`compute_rate\`'s cap behavior surfaces correctly through the clock.

The lesson is mostly about *testing* and the *interval-gating* invariant. **L10 closes Module 3 with the no-catch-up invariant.**`,
                },
                {
                  title: "Lesson 9 — Interval-gating invariant — three deeper tests",
                  slug: "openhl-funding-interval-invariant-en",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 30,
                  xpReward: 60,
                  content: `# Lesson 9 — Interval-gating invariant — three deeper tests

## Goal

By the end of this lesson:

\`\`\`bash
cargo test -p openhl-funding
\`\`\`

…passes 21 tests (18 from L4-L8 + 3 new). **No new production code.** The three new tests deepen our coverage of clock semantics across multiple operations:

- **\`premium_drives_settlement_signs\`** — full math composition flows through the clock. mark > index → positive premium → settlement signs match.
- **\`second_tick_requires_another_full_interval\`** — interval-gating is persistent across ticks. A successful tick doesn't permanently unlock the clock.
- **\`capped_rate_when_premium_extreme\`** — \`compute_rate\`'s cap behavior surfaces correctly through \`tick()\`. Layers compose without losing semantics.

The teaching focus is **invariants across multiple operations**, not just one. L8's tests verified the guard works *once*; L9's tests verify it works *across ticks* and that the layered composition doesn't introduce subtle bugs.

## Recap

After L8:
- \`FundingClock\` exists with \`tick()\` returning \`Option<FundingTick>\`.
- 3 sanity tests confirm: guard works, boundary fires, empty positions still advance.
- All 3 Module 2 functions compose through \`tick()\`.

L8's tests run the clock at most *once*. L9 exercises the clock across multiple calls, with non-trivial inputs, to validate the **invariant holds beyond a single operation**.

## Plan

One file edit:

1. **Append 3 tests to \`crates/funding/src/clock.rs\`** — inside the existing \`#[cfg(test)] mod tests\` block, after the 3 sanity tests from L8.

No production code, no \`lib.rs\` changes, no imports beyond what L8 already added.

> 🛑 **Predict.** Before scrolling: L8's \`first_tick_at_exact_interval_fires\` test fires \`tick(1_003_600, ...)\` once and asserts it returned \`Some\`. Why isn't that enough to verify the interval-gating invariant?

(Answer: **One successful tick says the guard *can* return \`Some\`. It doesn't say the guard *re-engages* afterward.** A buggy implementation could fire on the first interval boundary, then never gate again — every subsequent \`tick()\` would return \`Some\` regardless of time. The invariant "at most one settlement per interval" requires testing that the second tick is rejected unless another full interval has passed. **Single-operation tests verify behavior; multi-operation tests verify state machines.**)

## Walk-through

### Step 1: Add \`premium_drives_settlement_signs\`

After the L8 tests in \`mod tests\`, add:

\`\`\`rust
    #[test]
    fn premium_drives_settlement_signs() {
        let params = FundingParams::hyperliquid_default();
        let mut clock = FundingClock::new(params, 1_000_000);

        // mark 101, index 100 → premium = 0.01 = 10_000_000 ppb
        // rate = 10_000_000 / 8 = 1_250_000 ppb
        // long size 100 * mark 101 * rate / RATE_SCALE = 100*101*1.25e6 / 1e9
        // = 1.2625e10 / 1e9 = 12 (floor)
        // long pays → -12; short receives → +12.
        let out = clock
            .tick(1_003_600, MarkPrice(101), IndexPrice(100), &balanced_book())
            .expect("tick should fire");

        assert_eq!(out.premium, Premium(10_000_000));
        assert_eq!(out.rate, FundingRate(1_250_000));
        assert_eq!(out.settlements.len(), 2);
        assert_eq!(out.settlements[0].delta, Notional(-12));
        assert_eq!(out.settlements[1].delta, Notional(12));
    }
\`\`\`

This is **the full math composition test** for the clock. Every Module 2 function gets exercised in sequence:

1. \`compute_premium(MarkPrice(101), IndexPrice(100))\` → \`Premium(10_000_000)\` (1% premium).
2. \`compute_rate(Premium(10_000_000), hyperliquid_default)\` → \`FundingRate(1_250_000)\` (0.125%, after divisor 8).
3. \`apply_funding(&[Pos(1, 100), Pos(2, -100)], MarkPrice(101), FundingRate(1_250_000))\` → \`[Settlement(-12), Settlement(+12)]\`.

**The 5-line block comment is the paper math.** Anyone debugging this test can verify the arithmetic by hand: \`100 × 101 × 1_250_000 = 12_625_000_000\`. Divided by \`RATE_SCALE = 1_000_000_000\` (with integer rounding toward zero), that's \`12\`. With the sign flip from \`apply_funding\`, long gets \`-12\`, short gets \`+12\`. **The comment is documentation; tests are the spec.**

**Why does this test exist if every step is already tested individually?** Because composition is its own concern. \`tick()\` could conceivably call the wrong function in the wrong order — e.g., \`apply_funding\` before \`compute_rate\`, or pass \`index\` where \`mark\` is expected. **Composition tests catch wiring errors that unit tests miss.**

> 🛑 **Anti-fluency.** "This test duplicates \`apply_funding\`'s tests. Should we drop the per-account assertions and just check \`out.rate\`?" **No.** The point of this test is the *composition*. If \`apply_funding\`'s tests pass but \`premium_drives_settlement_signs\` fails, the bug is in how \`tick()\` wires the calls — not in \`apply_funding\`. **Each layer needs its own composition tests.** Three layers deep, that's three composition tests at minimum.

### Step 2: Add \`second_tick_requires_another_full_interval\`

After \`premium_drives_settlement_signs\`:

\`\`\`rust
    #[test]
    fn second_tick_requires_another_full_interval() {
        let params = FundingParams::hyperliquid_default();
        let mut clock = FundingClock::new(params, 1_000_000);

        // First tick at +3600.
        clock
            .tick(1_003_600, MarkPrice(101), IndexPrice(100), &balanced_book())
            .expect("first tick fires");

        // +3599 from first tick → not enough.
        let early = clock.tick(1_007_199, MarkPrice(101), IndexPrice(100), &balanced_book());
        assert!(early.is_none());

        // +3600 from first tick → fires.
        let on_time = clock.tick(1_007_200, MarkPrice(101), IndexPrice(100), &balanced_book());
        assert!(on_time.is_some());
    }
\`\`\`

**Three tick calls, three assertions.** The structure tells the story:

1. **First tick at \`1_003_600\`** — fires (boundary case from L8). After this, \`last_settled_at = 1_003_600\`.
2. **Second tick at \`1_007_199\`** — \`1_007_199 - 1_003_600 = 3599\`. One second short of an interval. Returns \`None\`.
3. **Third tick at \`1_007_200\`** — \`1_007_200 - 1_003_600 = 3600\`. Exactly an interval. Returns \`Some\`.

**The invariant being tested**: "the interval guard re-engages after every successful tick." A naive implementation that only checks against \`genesis_time\` (instead of \`last_settled_at\`) would fire on every tick after \`1_003_600\` — and this test catches it.

**The minimal counterexample**: between L8's \`first_tick_at_exact_interval_fires\` and L9's \`second_tick_requires_another_full_interval\`, the only thing being verified is that \`last_settled_at\` is the *gating reference*, not \`genesis_time\`. **Three calls is the minimum to test state-machine persistence.**

> 🛑 **Predict.** What's \`clock.last_settled_at()\` after each of the three ticks above?

(Answer:
- After tick 1 (success): \`1_003_600\`.
- After tick 2 (None — gated): unchanged, still \`1_003_600\`.
- After tick 3 (success): \`1_007_200\`.

**The clock doesn't advance on a gated call.** That's the second part of the interval-gating invariant: failure leaves state unchanged. The test doesn't explicitly assert \`last_settled_at\` after tick 2, but the success of tick 3 at exactly \`1_003_600 + 3600\` implies it.)

### Step 3: Add \`capped_rate_when_premium_extreme\`

After \`second_tick_requires_another_full_interval\`:

\`\`\`rust
    #[test]
    fn capped_rate_when_premium_extreme() {
        let params = FundingParams::hyperliquid_default();
        let mut clock = FundingClock::new(params, 1_000_000);

        // mark 200, index 100 → premium = 1.0 = 1e9 ppb
        // raw rate = 1e9 / 8 = 1.25e8; cap = 4e7 → clamps to 4e7.
        let out = clock
            .tick(1_003_600, MarkPrice(200), IndexPrice(100), &balanced_book())
            .unwrap();
        assert_eq!(out.rate, FundingRate(40_000_000));
    }
\`\`\`

**Tests that \`compute_rate\`'s cap clamps correctly when called through \`tick()\`.** The math:

1. \`compute_premium(MarkPrice(200), IndexPrice(100))\` → \`Premium(1_000_000_000)\` (100% premium).
2. \`compute_rate(Premium(1_000_000_000), {divisor=8, cap=40M})\` → raw = \`1_000_000_000 / 8 = 125_000_000\`. After clamp to \`±40_000_000\` → \`FundingRate(40_000_000)\`.

**Why does this test exist if \`compute_rate\`'s tests already cover clamping?** Because we need to know \`tick()\` doesn't unwrap, fiddle with, or bypass the rate before applying it. **The cap surfaces through the clock unchanged.**

A subtle wiring bug — say, \`compute_rate(premium, FundingParams { rate_cap: FundingRate(0), ..params })\` — would break this test (zero cap → zero rate → no settlements at all). **The composition test catches what unit tests can't.**

### Step 4: Run tests

\`\`\`bash
cargo test -p openhl-funding
\`\`\`

Expected:

\`\`\`
running 21 tests
test clock::tests::capped_rate_when_premium_extreme ... ok
test clock::tests::empty_positions_yield_empty_settlements_but_still_advance_clock ... ok
test clock::tests::first_tick_at_exact_interval_fires ... ok
test clock::tests::first_tick_before_interval_returns_none ... ok
test clock::tests::premium_drives_settlement_signs ... ok
test clock::tests::second_tick_requires_another_full_interval ... ok
... (15 tests from L4-L7 compute.rs)

test result: ok. 21 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

**21 tests, all green.** 6 of them now live in \`clock::tests\` (3 from L8 + 3 from L9).

Common errors:

- **\`premium_drives_settlement_signs\` fails with \`Notional(-13)\` or \`Notional(-11)\`** — off-by-one from rounding. Re-check the math: \`100 × 101 × 1_250_000 = 12_625_000_000\`. Divided by \`1_000_000_000\` is \`12.625\`. Integer division truncates toward zero → \`12\`. The sign flip → \`-12\`. If your number is different, check whether you're using \`*\` (which panics on debug overflow), \`saturating_mul\`, or \`wrapping_mul\`.
- **\`second_tick_requires_another_full_interval\` fails on the second tick** — your guard is comparing to \`genesis_time\` instead of \`last_settled_at\`. Re-read the L8 code: the guard is \`now < self.last_settled_at.saturating_add(...)\`, *not* \`now < self.params.genesis_time + ...\`.
- **\`capped_rate_when_premium_extreme\` returns \`FundingRate(125_000_000)\`** — your \`compute_rate\` isn't clamping. Re-check L6: the \`raw.clamp(-cap, cap)\` line should be present.

## Design reflection

Four load-bearing decisions in this lesson:

1. **Composition tests catch wiring errors.** Even when every step is unit-tested, the wiring between steps is a separate concern. **A 3-step pipeline needs at least 3 composition tests (one for each step's correct placement) plus a multi-step composition test.** \`premium_drives_settlement_signs\` is the latter.

2. **State machines need multi-call tests.** A single operation can satisfy an invariant by accident; only multiple operations confirm the state machine enforces it consistently. **\`second_tick_requires_another_full_interval\` exists because \`first_tick_at_exact_interval_fires\` alone is insufficient.**

3. **Boundary tests at every gate.** Both the inclusive boundary (\`now == last_settled_at + interval\`) and the exclusive boundary (\`now == last_settled_at + interval - 1\`) need to be tested. **One-second-short and one-second-after are the standard pair.**

4. **Each layer's invariants need their own surface tests.** \`compute_rate\` tests prove the cap clamps. \`tick\` tests prove the cap *survives* the composition. **Composition can lose semantics; verify each invariant at every layer it traverses.**

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/clock.rs ./crates/funding/src/clock.rs
\`\`\`

After L9:
- **clock.rs** matches Stage 8b through 6 of 7 tests. Only \`no_catchup_after_long_gap\` remains — that's L10's milestone test.

Return:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: Why does \`second_tick_requires_another_full_interval\` not also test \`+3601\`?**
Because \`+3600\` exactly *and* \`+3599\` together pin both sides of the boundary. \`+3601\` would just be slightly more than \`+3600\` — same direction. **Two boundary cases (just-before and exactly-at) suffice.** Adding more cases doesn't catch a different class of bug.

**Q: Could we have caught the "genesis vs last_settled_at" bug with a proptest?**
You could — random \`(t1, t2)\` pairs with \`t2 < t1 + interval\` should produce \`None\` on the second tick. But the hand-traced test makes the intent clearer: "after a tick at \`t1\`, the next tick at \`t1 + 3599\` is gated." Proptests excel at properties; hand-traced tests excel at named scenarios. **State-machine behaviors are usually scenarios.**

**Q: Why does the test not include a third tick at, say, +7200 (two intervals after first)?**
Because that wouldn't add information. The second tick at \`+3600\` already establishes that the clock fires at the correct cadence; a third tick is just more of the same. **Tests should distinguish themselves by what they verify**, not by adding repetition.

**Q: What if the test author had \`genesis_time = 0\` instead of \`1_000_000\`?**
The math would be identical, but the test would be less helpful. Using \`1_000_000\` (and the corresponding \`1_003_600\`, etc.) makes the "clock advanced by 3600 seconds" pattern visible at every assertion. **Test data should be readable, not just correct.**

## Next lesson (L10)

L10 closes Module 3 with the **no-catch-up invariant**: the milestone test \`no_catchup_after_long_gap\`. The scenario: validator reboots after 10 hours of downtime, so \`now - last_settled_at = 36000\` (10 intervals). The naive expectation might be "catch up by replaying 10 ticks," but the design choice is to **settle once and advance to \`now\`**. The lesson explains why catch-up would be worse than skipping ticks, and the test confirms the design choice is enforced. **One test, one invariant, the design philosophy in action.**`,
                },
                {
                  title: "Lesson 10 — No-catch-up invariant — the design philosophy in one test",
                  slug: "openhl-funding-no-catchup-en",
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 25,
                  xpReward: 50,
                  content: `# Lesson 10 — No-catch-up invariant — the design philosophy in one test

## Goal

By the end of this lesson:

\`\`\`bash
cargo test -p openhl-funding
\`\`\`

…passes 22 tests (21 from L4-L9 + 1 new). The new test is **\`no_catchup_after_long_gap\`** — the milestone test that pins openhl's design choice on what happens when a validator misses multiple intervals.

After L10:
- \`crates/funding/\` is **byte-identical to Stage 8b** (\`cd94137\`).
- All 22 tests pass: 20 hand-traced + 2 proptests.
- Module 3 (Clock state machine) is **complete**.
- The funding state machine is **production-shape** as a standalone crate.

The teaching focus is **design philosophy under failure modes**: when the clock falls behind, what's the right semantics? The naive answer (catch up by replaying ticks) is wrong, and L10 explains why.

## Recap

After L9:
- 6 of 7 clock tests pass.
- Both interval-gating sub-invariants verified (boundary, persistence).
- The math composition surfaces correctly through \`tick()\`.

L9 covered the "normal operation" invariant. L10 covers the "abnormal operation" invariant — what happens when the clock is *late*.

## The scenario

Imagine the openhl chain has been running normally, settling funding every hour. Then something happens:

- Validator reboot (process restart taking 5 minutes).
- Network partition (chain pause for 8 hours while validators reconnect).
- Hardware failure on the leader, fallback validator picks up after 30 minutes.

Whatever the cause, the next \`tick()\` call has \`now - last_settled_at\` far exceeding \`interval_secs\`. **What should the clock do?**

Two design choices:

### Choice A: Catch up

Replay 10 intervals' worth of funding. Each replay uses the *current* mark/index/positions snapshot. Apply 10 settlements in succession.

**Pros**: every interval gets a settlement, the chain "doesn't fall behind."

**Cons**: 
- **Stale-snapshot problem**: all 10 settlements use the *same* current snapshot, not the snapshot at each historical interval boundary. A trader who was winning during the gap pays for 10 settlements all computed from the now-favorable rate. Whichever side has been losing gets pummeled 10x, without ever having had a chance to close their position to escape it.
- **Concentrated risk**: 10x funding at once can liquidate accounts that would have survived 10 separate hourly payments.
- **Path dependency**: the funding history depends on *when* the gap occurred, not just on the cumulative time.

### Choice B: Settle once, advance to \`now\`

Apply funding *once* at the current snapshot, then advance \`last_settled_at\` to \`now\`. The 10 missed intervals are *skipped*, not replayed.

**Pros**:
- **No concentrated punishment**: at most one settlement at the cap per outage.
- **Path-independent**: the result depends only on the current snapshot, not on the gap's timing.
- **External catch-up possible**: a caller wanting catch-up logic can implement it themselves with repeated ticks + fresh snapshots at intermediate timestamps.

**Cons**:
- **Missing revenue**: funding is the equilibration mechanism for the perpetual price; skipping intervals removes pressure on the basis.

**openhl chooses Choice B.** The catch-up logic, if anyone needs it, lives *outside* the clock — built on repeated \`tick()\` calls with snapshots at the right historical times.

> 🛑 **Predict.** Before scrolling: a validator that missed 10 hours of funding due to a node reboot tries to make up for lost time by replaying 10 ticks from the *current* snapshot. **Which kind of trader gets hurt the most by this approach?** Hint: think about who's been losing during the gap.

(Answer: **The losing side gets pummeled 10x.** During a 10-hour gap, suppose mark drifted high relative to index — longs have been overpaying in the "real" world. Choice A replays 10 settlements at the *current* rate, all charging longs. The trader who was already on the losing side of the basis pays 10x what they would have if funding had been applied hourly. Worse, they couldn't have closed their position during the gap (the chain was paused); the catch-up appears to charge them retroactively for time they had no agency. **Choice B says: skip the 10 missed payments and start fresh now. Bad for funding revenue; fair to traders.**)

## Plan

One file edit:

1. **Append \`no_catchup_after_long_gap\` to \`crates/funding/src/clock.rs\`** — inside the existing \`#[cfg(test)] mod tests\` block, after the L9 tests.

No production code, no \`lib.rs\` changes.

## Walk-through

### Step 1: Add the milestone test

After \`capped_rate_when_premium_extreme\`, add:

\`\`\`rust
    #[test]
    fn no_catchup_after_long_gap() {
        // If 10 intervals elapse before the next tick, we settle ONCE and
        // advance to \`now\`. We don't replay 10 settlements with stale state.
        let params = FundingParams::hyperliquid_default();
        let mut clock = FundingClock::new(params, 1_000_000);

        let way_later = 1_000_000 + 10 * 3600;
        let out = clock.tick(way_later, MarkPrice(101), IndexPrice(100), &balanced_book());
        assert!(out.is_some(), "elapsed >> interval → tick fires");
        assert_eq!(clock.last_settled_at(), way_later);

        // Immediately ticking again at the same moment does NOT settle.
        let again = clock.tick(way_later, MarkPrice(101), IndexPrice(100), &balanced_book());
        assert!(again.is_none(), "no duplicate settlement at same now");
    }
\`\`\`

**Two parts.** Each pins a separate sub-property of the no-catch-up invariant.

#### Part 1: settle once after long gap

\`\`\`rust
        let way_later = 1_000_000 + 10 * 3600;
        let out = clock.tick(way_later, MarkPrice(101), IndexPrice(100), &balanced_book());
        assert!(out.is_some(), "elapsed >> interval → tick fires");
        assert_eq!(clock.last_settled_at(), way_later);
\`\`\`

The setup: genesis at \`1_000_000\`, then tick at \`1_036_000\` (= \`1_000_000 + 10 × 3600\`). Ten full intervals have elapsed.

**Two assertions:**

1. **\`out.is_some()\`** — the tick *does* fire. We don't skip it just because it's late. **Choice B isn't "skip everything" — it's "settle once."**

2. **\`clock.last_settled_at() == way_later\`** — and *crucially*, the clock advances to \`now\`, not to \`1_000_000 + 3600\` (one interval after genesis) or \`1_000_000 + 10*3600\` (ten intervals after genesis — same number but for different reasons). **The clock forgets the missed intervals entirely.**

> 🛑 **Anti-fluency.** "Why doesn't the test also check that there's only one entry in \`out.settlements\`?" **Because the settlements count depends on positions, not on the gap.** With \`balanced_book()\` (long 100, short -100), we get 2 settlements regardless of gap length. The test's job is to verify *one tick* fires, not how many settlements that tick produces. **Test the tick count; settlement count is a separate concern.**

#### Part 2: no re-fire at same \`now\`

\`\`\`rust
        let again = clock.tick(way_later, MarkPrice(101), IndexPrice(100), &balanced_book());
        assert!(again.is_none(), "no duplicate settlement at same now");
\`\`\`

After the long-gap tick, immediately call \`tick\` again at the *same* \`now\`. **It must return \`None\`.** This proves the interval-gating invariant still holds after a late tick — we can't get a double settlement by calling tick twice in a row.

**Why is this assertion important?** Because without it, a buggy implementation could:
- Detect "elapsed time >> interval" and decide "fire continuously until we catch up" (the buggy version of catch-up).
- Forget to update \`last_settled_at\` on the long-gap tick, so subsequent ticks at the same \`now\` keep firing.

**The same \`now\` is the strictest possible test.** No time has passed between the two ticks; only the clock's internal state has changed. If \`last_settled_at == way_later\` (from Part 1), then the guard \`now < last_settled_at + interval\` becomes \`way_later < way_later + 3600\`, which is \`0 < 3600\`, which is true — so \`tick\` correctly returns \`None\`.

### Step 2: Run tests

\`\`\`bash
cargo test -p openhl-funding
\`\`\`

Expected:

\`\`\`
running 22 tests
test clock::tests::capped_rate_when_premium_extreme ... ok
test clock::tests::empty_positions_yield_empty_settlements_but_still_advance_clock ... ok
test clock::tests::first_tick_at_exact_interval_fires ... ok
test clock::tests::first_tick_before_interval_returns_none ... ok
test clock::tests::no_catchup_after_long_gap ... ok
test clock::tests::premium_drives_settlement_signs ... ok
test clock::tests::second_tick_requires_another_full_interval ... ok
... (15 tests from L4-L7)

test result: ok. 22 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

**22 tests, all green.** Module 3 closes. \`crates/funding/\` is byte-identical to Stage 8b.

Common errors:

- **\`Part 1 fails: \`out.is_none()\`** — your guard's comparison is wrong direction. Re-check: \`if now < last_settled_at + interval { return None; }\`. At \`now = 1_036_000\` and \`last_settled_at = 1_000_000\`, \`now < 1_003_600\` is false, so the guard doesn't return; the tick fires.
- **\`Part 1 fails: \`last_settled_at() != way_later\`** — you advanced the clock to something other than \`now\`. Re-check the line \`self.last_settled_at = now;\` near the end of \`tick()\`. Common typo: \`self.last_settled_at = self.last_settled_at + self.params.interval_secs;\` (catch-up version) or \`self.last_settled_at += self.params.interval_secs;\` (similarly wrong).
- **Part 2 fails: \`again.is_some()\`** — \`last_settled_at\` wasn't updated on Part 1's tick. The Part 2 tick at the same \`now\` finds the gate at \`genesis + interval\` (still satisfied), so it fires erroneously. Re-check the Part 1 assignment.

## Design reflection

Four load-bearing decisions in this lesson:

1. **Settle once on long gaps, advance to \`now\`.** The alternative (catch up by replaying intervals) creates concentrated punishment for the losing side without giving them the chance to close. Funding's purpose is *equilibration*, not retroactive enforcement. **Choice B aligns the math with fairness, at the cost of some funding revenue.**

2. **The same-\`now\` second-tick test is the strictest possible.** No time elapses; only state has changed. Catches all implementations that fail to update \`last_settled_at\` on a late tick. **For state machines, "same input, repeated call" reveals state-update bugs.**

3. **Catch-up logic lives outside the clock.** A caller wanting catch-up can call \`tick()\` repeatedly with snapshots at intermediate historical timestamps. **The clock is the primitive; the policy is the caller's.**

4. **Design philosophy lives in documentation + tests.** The clock's module doc names the invariant; this test enforces it; the test comments + this lesson explain *why*. **Three places to find the rationale: doc, code, test.**

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/ ./crates/funding/ --recursive
\`\`\`

After L10, \`crates/funding/\` is **byte-identical to Stage 8b**. The diff is empty.

**Module 3 closes.** Module 4 (capstone) is L11.

Return:

\`\`\`bash
git checkout main
\`\`\`

## Common questions

**Q: What if I want catch-up semantics? Can I configure it?**
Not from inside the clock. You'd have to write a wrapper that calls \`tick()\` repeatedly with snapshots at historical intermediate timestamps:

\`\`\`rust
// Pseudocode for an external catch-up wrapper:
while clock.last_settled_at() + interval < now {
    let next_target = clock.last_settled_at() + interval;
    let historical_snapshot = fetch_snapshot_at(next_target);  // !!! complex !!!
    clock.tick(next_target, historical_snapshot.mark, ...);
}
clock.tick(now, current_snapshot.mark, ...);
\`\`\`

The hard part is \`fetch_snapshot_at(historical_timestamp)\` — the caller has to know what mark/index/positions looked like at past times. **That's why catch-up isn't in the clock: it requires historical state the clock doesn't have.** The application layer (which has the chain database) can do it.

**Q: How long can the gap be before \`way_later\` overflows?**
\`u64::MAX\` seconds is roughly \`5.8 × 10^11\` years — well past heat death. The \`saturating_add\` in the guard handles \`last_settled_at\` near \`u64::MAX\`, but in practice we don't reach that regime. **The pathological case is the guard's responsibility; the realistic case is the design's.**

**Q: What if \`mark\` and \`index\` are both reasonable values at \`way_later\`, but the *gap* was caused by mark/index oracle being unavailable?**
The clock doesn't know about oracle staleness. If you call \`tick()\` with a stale mark, you get funding based on the stale data. **Oracle freshness is the caller's responsibility.** Production deployments add an oracle-staleness check before calling \`tick()\` — and skip the call if the oracle is too old. The skip happens above the clock; the clock just trusts its inputs.

**Q: Should we add a warning log when a long-gap tick happens?**
Logging is a side effect. The clock is pure (no I/O). A wrapper can log the gap if it cares: \`if elapsed > 2*interval { log!("late tick: {} hours behind", elapsed/3600); }\`. **Keep the primitive pure; let the wrapper observe.**

## Module 3 milestone — what you've built

After L10:
- **Module 3 complete.** Clock state machine + 7 tests covering interval-gating, no-catch-up, math composition, cap surfacing.
- **Entire crate byte-identical to Stage 8b.** ~635 LOC across types.rs / compute.rs / clock.rs.
- **22 tests** total: 20 hand-traced + 2 proptest.
- **Zero rustdoc warnings.**

The funding state machine is now a **complete, tested, production-shape** crate. It computes funding deterministically, gates on the right cadence, and refuses to introduce path-dependent settlements after gaps.

What's left:
- **Module 4 (Capstone, L11)** — synthesis, deferred items, bridge-integration preview. No code.
- **Future course** — wiring this crate into the bridge (oracle integration, balance updates, liquidation triggers).

## Next lesson (L11)

L11 is the capstone — no new code. We sketch the architecture, name the items deferred from this course (oracle integration, balance updates, liquidations, multi-market funding, funding-as-EVM-event), and trace where each will live when shipped. The lesson is for cementing the mental model and seeing the funding state machine as a piece of the larger openhl architecture.`,
                },
              ],
            },
          },
          {
            title: "Capstone",
            sortOrder: 4,
            lessons: {
              create: [
                {
                  title: "Lesson 11 — Capstone — what you built, what's deferred, what comes next",
                  slug: "openhl-funding-capstone-en",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 20,
                  xpReward: 40,
                  content: `# Lesson 11 — Capstone — what you built, what's deferred, what comes next

## Goal

By the end of this lesson:

- You can sketch the funding pipeline on a whiteboard from memory: \`(mark, index)\` → premium → rate → settlements, gated by the clock.
- You can name the five deferred items (oracle integration, balance updates, liquidations, multi-market funding, funding-as-EVM-event) and explain why each is out of scope for \`crates/funding/\`.
- You can sketch where four extensions would land in a future course.
- You're ready to wire this state machine into a perpetual DEX.

**No code in this lesson.** Just the mental model.

## The pipeline, in one diagram

\`\`\`
   ┌────────────┐   ┌─────────────┐
   │ MarkPrice  │   │ IndexPrice  │     (oracle, off-chain)
   └─────┬──────┘   └──────┬──────┘
         │                 │
         ▼                 ▼
       ┌─────────────────────┐
       │   compute_premium    │  →  Premium(i64, ppb)
       └──────────┬───────────┘
                  │
                  ▼
       ┌─────────────────────┐
       │    compute_rate      │  ← FundingParams (divisor, cap)
       └──────────┬───────────┘
                  │
                  ▼  FundingRate(i64, ppb, clamped)
                  │
            ┌─────┴─────┐
            │           │
            ▼           ▼
       ┌──────────────────────┐
       │   apply_funding      │  ← Vec<Position>, MarkPrice
       └──────────┬───────────┘
                  │
                  ▼
              Vec<Settlement>  →  bridge → balance updates (future)


   ╔═══════════════════════════════════════════════════════╗
   ║                  FundingClock::tick                    ║
   ║                                                        ║
   ║  guard: now ≥ last_settled_at + interval_secs?         ║
   ║    no  → return None                                   ║
   ║    yes → execute pipeline above, advance to \`now\`      ║
   ╚═══════════════════════════════════════════════════════╝
\`\`\`

Read top-to-bottom: prices in, settlements out. The clock wraps the whole pipeline behind a "has enough time elapsed?" gate.

## What each module delivered

**Module 1 (Determinism + types, L1-L3)** — Fixed-point vocabulary:

- \`RATE_SCALE = 1_000_000_000\` (ppb): the load-bearing constant.
- 9 newtypes: \`MarkPrice\`, \`IndexPrice\`, \`Premium\`, \`FundingRate\`, \`Notional\`, \`PositionSize\`, \`Position\`, \`Settlement\`, \`FundingParams\`.
- \`hyperliquid_default()\`: 3600s interval, ±4% cap, divisor 8.
- **Lesson learned**: newtypes prevent argument-order bugs at compile time; sign conventions live in doc comments at definition site.

**Module 2 (Pure compute, L4-L7)** — Stateless math:

- \`compute_premium(mark, index) → Premium\` — graceful on \`index == 0\`, i128 intermediates, saturate.
- \`compute_rate(premium, params) → FundingRate\` — divide-then-clamp, defensive \`.abs()\` on cap.
- \`apply_funding(positions, mark, rate) → Vec<Settlement>\` — longs-pay-shorts via unary minus, filters flat positions.
- \`saturate_i128_to_i64\`: 3-line private helper, the only safety net at type boundaries.
- **15 tests**: 13 hand-traced + 2 proptests (antisymmetry, balanced-book zero-sum).
- **Lesson learned**: panic-vs-wrap-vs-saturate as a 3-way design tension; saturation is the only consensus-safe choice.

**Module 3 (Clock state machine, L8-L10)** — Discrete event loop:

- \`FundingClock\` + \`FundingTick\` + \`tick()\`.
- 7 tests covering: guard semantics, boundary cases, interval persistence, no-catch-up.
- **Lesson learned**: composition tests catch wiring errors; state machines need multi-call tests; design philosophy belongs in doc comments + tests + lesson prose, never in just one place.

## The honest deferred

Five things \`crates/funding/\` doesn't do. Each is a real production gap, *deliberately deferred* to keep this crate a pure state machine.

### 1. Oracle integration

**What we have**: \`compute_premium\` takes \`mark: MarkPrice, index: IndexPrice\` as inputs.

**What we don't have**: a way to *get* those prices. The caller must source mark from the CLOB (via something like \`clob.best_bid_with_qty()\` mid-price) and index from an external oracle (Pyth, Chainlink, a validator-attested feed).

**Why deferred**: oracle plumbing is its own discipline — staleness checks, deviation circuit breakers, multi-source aggregation, validator-set sign-off. Bundling it into the funding crate would couple two unrelated concerns. **The bridge layer (future course) wires the oracle to \`tick()\`.**

**When to revisit**: when wiring the funding crate into \`LiveRethEvmBridge\`. The bridge's payload-building code will read the latest mark/index *just before* calling \`clock.tick(...)\`.

### 2. Balance updates

**What we have**: \`tick()\` returns \`Vec<Settlement>\` — a list of \`(account, delta)\` pairs.

**What we don't have**: any mechanism to *apply* those deltas to account balances.

**Why deferred**: balance state lives in EVM storage (or another store maintained by the bridge). The funding crate is intentionally storage-free — it computes, it doesn't persist. **The bridge takes the \`Vec<Settlement>\` and emits balance-update transactions or direct state mutations.**

**When to revisit**: same as oracle integration. The bridge layer is where settlements meet balances.

### 3. Liquidations

**What we have**: settlements that can push an account's balance arbitrarily negative.

**What we don't have**: any check that an account has *capacity* to absorb the funding payment, or any logic for what happens when it doesn't.

**Why deferred**: liquidation is a separate state machine with its own invariants (insurance fund, ADL waterfalls, mark-price triggers). Tying it to funding would conflate two cadences (funding is hourly; liquidation is per-block). **Liquidation should be its own crate.**

**When to revisit**: after balance updates. The bridge sees a balance go negative; *then* the liquidation engine kicks in.

### 4. Multi-market funding

**What we have**: a single \`FundingClock\` for a single market.

**What we don't have**: a way to manage funding across multiple perpetual markets (BTC-USD, ETH-USD, SOL-USD, etc.) with potentially different intervals or caps.

**Why deferred**: the multi-market design is straightforward — one \`FundingClock\` per market, all managed by a \`HashMap<MarketId, FundingClock>\` at the bridge layer. The crate doesn't need to know about market multiplicity; it just needs to be correct for *one*.

**When to revisit**: when openhl adds a second market. **Probably never as part of this crate** — the multiplexing belongs above.

### 5. Funding as EVM events

**What we have**: settlements as \`Vec<Settlement>\` returned from \`tick()\`.

**What we don't have**: a way for smart contracts to *observe* a funding tick. A contract that wants to react to funding (e.g., "auto-deleverage when funding exceeds X%") can't subscribe to it as an event.

**Why deferred**: emitting EVM events from non-EVM code requires plumbing — the bridge would have to convert each \`Settlement\` into an \`EvmLog\` and inject it into the next block. **It's a bridge-layer concern, not a state-machine concern.**

**When to revisit**: when there's a concrete contract use case that demands event-based funding observation. **Until then, telemetry can be done at the bridge layer.**

## What comes next

Four extensions you could ship after this course:

### Extension 1: Oracle adapter (2-3 days)

A small \`crates/oracle/\` that pulls index prices from one or more sources (Pyth, Chainlink, validator-signed), aggregates with staleness checks, and exposes \`fn current_index_price() -> Option<IndexPrice>\`. The bridge calls this just before \`clock.tick(...)\`. **The hard part is choosing the staleness threshold; the code is straightforward.**

### Extension 2: Bridge-side funding tick (1 week)

Wire \`FundingClock\` into \`LiveRethEvmBridge\`. The bridge owns the clock instance, reads mark from the CLOB, reads index from the oracle, gets positions from the perpetuals position store, calls \`tick()\`, and applies the resulting settlements to balances. **Most of the work is plumbing; the funding crate is self-contained.**

### Extension 3: Liquidation engine (3-4 weeks)

A separate \`crates/liquidation/\` that monitors balances post-funding-tick, identifies under-margined accounts, and routes them through the insurance fund / ADL waterfall. **Big design discussions: insurance fund sizing, partial liquidation, MEV protection.** This is its own course.

### Extension 4: Multi-market manager (1 week)

A \`crates/markets/\` that maintains \`HashMap<MarketId, FundingClock>\` plus per-market position stores. The bridge dispatches funding ticks per market at the right cadences. **Conceptually simple; the value is in the per-market isolation.**

## Course completion — what you've internalized

Five skills that generalize beyond perpetual funding:

1. **Fixed-point arithmetic for consensus systems.** Any time you need to share numerical state across validators — funding, fees, oracle prices, vesting schedules — you'll use signed integers + a scale constant. **\`RATE_SCALE = 1e9\` is the pattern; the constant value is the variable.**

2. **Saturation as the consensus-safe overflow strategy.** Panic = chain fork via halt. Wrap = chain fork via wrong value. Saturate = bounded, consistent across validators. **For any consensus-critical math, saturate is the only choice.**

3. **Newtype pattern for semantic distinction.** \`MarkPrice\` and \`IndexPrice\` both wrap \`u64\`, but they're different concepts. The newtype prevents arg-order bugs at compile time, and the doc comment carries the sign convention. **5 lines per newtype; entire bug classes prevented.**

4. **Composition tests for layered code.** Each layer (\`compute_premium\`, \`compute_rate\`, \`apply_funding\`) is tested individually, but the layering itself is a separate concern. **\`tick()\` tests verify the composition; unit tests verify the pieces. You need both.**

5. **Design philosophy lives in code + doc + tests + prose.** The no-catch-up invariant is named in \`clock.rs\`'s module doc, enforced by \`tick()\`'s implementation, verified by \`no_catchup_after_long_gap\`, and explained in this course. **Four places to find the rationale; rationale survives even when individual pieces change.**

## Where this course sits in the L1 Architect track

**Courses 1-5** (Reth internals): pipeline, payload building, NodeBuilder, evm crate, RPC.

**Course 6** (openhl-consensus): Malachite integration.

**Course 7** (openhl-clob): matching engine.

**Course 8** (openhl-precompiles): EVM ↔ CLOB bridge via custom precompiles.

**Course 9 (this one)**: funding state machine. **Pure state, no I/O — the contrast to course 8's bridge plumbing.**

**Course 10** (openhl-bridge-integration — future): wires funding + oracle + liquidation into \`LiveRethEvmBridge\`. This is where everything from courses 6-9 composes into a runnable perp DEX.

You're now 90% of the way through the L1 Architect track. **The patterns from this course (fixed-point, saturation, composition tests) apply across the remaining work.**

## Final answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/ ./crates/funding/ --recursive
\`\`\`

After L11, **the entire \`crates/funding/\` directory should be byte-identical** to Stage 8b. You've reproduced 1 commit (~635 LOC across 3 files) by hand, with full understanding of why each line is there. **The crate compiles standalone, tests pass standalone, no external dependencies beyond \`openhl-clob\` (for \`AccountId\`).**

Return:

\`\`\`bash
git checkout main
\`\`\`

## You shipped this

22 tests passing. 3 source files. ~635 LOC of production Rust. A funding state machine that:
- computes deterministic premium/rate/settlement math at signed fixed-point precision;
- saturates rather than panics on pathological inputs;
- gates settlements on a configurable interval;
- refuses to catch up after long gaps (philosophical choice that aligns math with fairness).

**That's the entire HL-shape perpetual funding mechanism, in a crate you can drop into any Rust trading system.** The next time someone asks "how does perpetual funding work?" — show them this crate.

Go build perpetuals.`,
                },
              ],
            },
          },
        ],
      },
    },
  });
}
