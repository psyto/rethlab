// AUTO-GENERATED from drafts/openhl_liquidation_*_en.md by .github/scripts/build-openhl-liquidation-seed.ts
// Do not hand-edit. Re-run the build script when drafts change.

import { PrismaClient } from '@prisma/client';

export async function seedRethOpenHlLiquidationEN(prisma: PrismaClient) {
  const tags = ["reth","evm","liquidation","perpetual","l1","openhl","expert"];

  await prisma.course.create({
    data: {
      slug: "building-openhl-liquidation-en",
      title: "Build OpenHL Liquidation — perpetual position liquidation engine",
      description:
        "Build the perpetual-position liquidation engine — the pure-compute layer that classifies accounts (Safe / AtRisk / Liquidatable / Underwater) from margin ratios and generates close-order specs. Includes the leveraged-regime non-monotonicity discovery: write the proptest, watch it fail, trace the failure analytically, refine with prop_assume!. The fifth course in the DIY Perp series. Stage 10a (margin math) shipped; insurance fund (Stage 10b) and multi-account scanner (Stage 10c) pending.",
      difficulty: "EXPERT",
      duration: 250,
      xpReward: 490,
      track: "diy-perp",
      tags,
      isPublished: true,
      sortOrder: 1000,
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
                  title: "Build OpenHL Liquidation — perpetual position liquidation engine",
                  slug: "openhl-liquidation-orientation-en",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 15,
                  xpReward: 50,
                  content: `# Build OpenHL Liquidation — perpetual position liquidation engine

## What you'll build

The previous course (\`building-openhl-funding\`) added the funding-rate state machine — perpetual contracts now have a mechanism that keeps the mark price anchored to the index. This course builds the next openhl primitive: the **liquidation engine** that force-closes positions when an account's losses exceed its deposited collateral.

By the end of this course, you'll have shipped:

- **3 source files / ~600 LOC** in a new \`openhl-liquidation\` crate.
- **24+ tests passing** at the Stage 10a milestone, more by capstone: hand-traced unit tests for each compute function + proptests for margin-ratio monotonicity and determinism + insurance-fund conservation invariants.
- **3 building blocks**: a fixed-point types module, a pure compute module (margin math), and a state machine (insurance fund, Stage 10b) plus a multi-account scanner (Stage 10c).
- **A four-state margin classification** (\`Safe\`, \`AtRisk\`, \`Liquidatable\`, \`Underwater\`) that every validator computes identically.

You'll understand:

- Why a perp DEX cannot outsource liquidations to an off-chain process and still claim consensus solvency.
- The Hyperliquid-shape margin model: cross-margin, mark-vs-entry, initial-vs-maintenance.
- The four states of margin health and what each state authorizes the engine to do.
- The **non-monotonic edge case** in \`margin_ratio\` — when collateral dominates notional, the ratio can move against the direction of mark, and why that doesn't break liquidations.
- Why the insurance fund is a state machine, not a balance entry.
- How auto-deleveraging (ADL) lives at the edge of this design — and why we leave it out of Stage 10.

## Why liquidations matter (1-paragraph perp recap)

Perpetual contracts are levered positions. A trader deposits \`collateral\` (USDC) and opens a position of \`size\` (signed: positive = long, negative = short) at an \`entry\` price. The position's *unrealized PnL* moves with the mark price: a long profits when mark > entry, loses when mark < entry. When the loss eats into collateral far enough that \`equity / notional\` drops below the **maintenance margin** requirement, the account can no longer cover its losses — the engine force-closes the position at market (opposite side, full size), debits a **liquidation fee** to the insurance fund, and (if equity remained positive) returns the remainder to the account. If equity went *negative* before the close — the "underwater" case — the insurance fund absorbs the deficit. That's the entire mechanism.

## Why an L1 perp DEX runs liquidations in consensus

Some derivatives venues outsource liquidations to off-chain liquidator processes — bots that scan account state and call a \`liquidate(account)\` endpoint when they find a target. This works for low-frequency settlement systems (think credit default swaps) but breaks at perp speed: a 50× levered HYPE position can flip from healthy to underwater in seconds during a news cascade, and any RPC-round-trip delay between detection and close is loss the chain absorbs.

Hyperliquid runs liquidations **in consensus**. Every validator, every block, computes which accounts are below maintenance — independently, from the same data, with the same code. The engine's output (close orders + insurance-fund movements) becomes part of the block. **That's the only way the chain stays solvent in adversarial market moves.**

The price you pay for this guarantee is the determinism discipline: float arithmetic is forbidden, every classification must be byte-identical across validators, every overflow must saturate rather than panic. The funding course (\`openhl-funding\`) was your first deep encounter with this discipline; this course is the second.

## Why liquidations can't use floats

Same answer as funding: consensus determinism. A validator that classifies an account as \`Liquidatable\` while a peer validator classifies the same account as \`AtRisk\` will produce a different block — different close orders, different fees, different insurance-fund deltas. Block proposals diverge, the chain forks.

The fix: signed integers + saturating arithmetic + i128 intermediate products for any multiplication that can overflow i64. We use \`MARGIN_SCALE = 10_000\` (basis points) as the fixed-point unit for \`MarginRatio\`. Bps is the conventional unit for margin in TradFi *and* in crypto perp venues — Hyperliquid, Binance, Drift all express margin requirements in bps. \`MarginRatio(1_000)\` is exactly 10%; \`MarginRatio(MARGIN_SCALE)\` is exactly 100%.

(Funding used \`RATE_SCALE = 1_000_000_000\` because it needed parts-per-billion precision for tiny per-interval rates. Liquidation needs less precision but the same discipline.)

## The 12 lessons

### Module 0 — Orientation
- **L0** (this lesson) — Why liquidations, why margin model, three-sub-stage roadmap.

### Module 1 — Types (L1-L3)
- **L1** — \`MARGIN_SCALE = 1e4\` (bps) + \`LiquidationParams\` + \`hyperliquid_default()\` (10% / 2% / 1.5%). Why bps, why these defaults.
- **L2** — \`MarginRatio\` newtype + \`MarginHealth\` enum (\`Safe\` / \`AtRisk\` / \`Liquidatable\` / \`Underwater\`). Why four states, what each authorizes.
- **L3** — \`AccountSnapshot\` + \`CloseOrderSpec\`. Why a new snapshot type (not \`funding::Position\`), and how the bridge layer assembles it.

### Module 2 — Pure compute (L4-L7) — Stage 10a
- **L4** — \`notional_value\` + \`unrealized_pnl\`. The signed-multiplication trick that gets the sign right for both longs and shorts.
- **L5** — \`account_equity\` + \`margin_ratio\`. The proptest that uncovers the **non-monotonic edge case** when collateral dominates notional, and why \`prop_assume!\` is the right fix.
- **L6** — \`margin_health\` classification. Strict-less-than at every boundary and what that buys you.
- **L7** — \`close_order_spec\`. The market-order discipline: liquidation takes any available price. Stage 10a complete.

### Module 3 — Insurance fund (L8-L10) — Stage 10b
- **L8** — \`InsuranceFund\` struct + \`deposit\` / \`withdraw\`. The single-balance state machine.
- **L9** — \`absorb_deficit\`: how an Underwater liquidation drains the fund.
- **L10** — \`credit_fee\`: liquidation fee flows from collateral into the fund. Composition test: a single liquidation can both credit a fee *and* absorb a deficit when the position is severely underwater.

### Module 4 — Scanner + Capstone (L11-L12) — Stage 10c
- **L11** — \`LiquidationScanner\`: iterate \`&[AccountSnapshot]\`, classify each, emit close orders for \`Liquidatable\` and \`Underwater\`, return insurance-fund deltas. The composition layer.
- **L12** — Capstone. Synthesis, bridge integration preview, market structure context: how on-chain CLOB liquidations differ from CEX liquidations and from ADL.

## SHA pinning per module

Every lesson cites the openhl commit it builds against. For this course, lessons span three commits across Stage 10a → 10c:

| Module | Lessons | openhl SHA |
|---|---|---|
| 0 | L0 | \`22eedf9\` (Stage 10a) |
| 1 | L1-L3 | \`22eedf9\` (Stage 10a) |
| 2 | L4-L7 | \`22eedf9\` (Stage 10a) |
| 3 | L8-L10 | *Stage 10b — TBD* |
| 4 | L11-L12 | *Stage 10c — TBD* |

The TBD rows update as Stage 10b and 10c ship. Until then, modules 3 and 4 are skeleton — the modules 1-2 content (the entire pure-compute side) is fully built against \`22eedf9\` and ready to take you through Stage 10a end-to-end.

## Prerequisites

To get the most from this course you should have:

- **Course 9 (openhl-funding)** in your head. You don't need to remember every lesson, but the fixed-point / saturating-arithmetic / pure-state-machine pattern from funding is the same pattern here. If funding was hard, this will be hard.
- **Course 7 (openhl-clob)** for \`AccountId\`, \`Side\`, \`Qty\`. We reuse these directly. You don't need the matching engine internals.
- **Familiarity with margin math at the basic level.** If you've ever seen "initial margin = 10%, maintenance = 2%" and not been confused, you're set. If you haven't, the perp recap above plus the Hyperliquid help center is enough.
- **No EVM, no precompile knowledge needed.** Liquidation is pure state-machine math, just like funding.

You do NOT need:
- A running openhl node — the crate has zero I/O.
- Experience with risk engines at exchanges — the model here is small.
- Quantitative finance background — basic algebra is enough.

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
git checkout 22eedf9
\`\`\`

(Or use the same workspace and \`git stash\` between lookups. Either works.)

## Course style

Each lesson follows the build-along format established in courses 6-9:
- **Goal** — what passes / what's built by the end.
- **Recap** — where the previous lesson left off.
- **Plan** — the specific edits, numbered.
- **Predict** callouts (🛑 with "Before scrolling...") — questions before answers.
- **Anti-fluency** callouts (🛑 with common misconceptions named explicitly) — preempt the "couldn't we just...?" reflex.
- **Walk-through** — step-by-step code edits.
- **Test** — the \`cargo test\` command + expected output.
- **Design reflection** — 3-5 load-bearing decisions encoded in this lesson's code.
- **Answer key** — \`git diff\` against the openhl reference SHA.
- **Common questions** — 3-5 grounded answers.

Module 2 (pure compute) is more proof-heavy than code-heavy compared to the matching engine in course 7. **Plan to slow down at the edge cases** — the leveraged-regime non-monotonicity in L5 is where most readers' first mental model breaks. We rebuild it.

## Ready

Onward to L1, where we set up \`MARGIN_SCALE\` and the \`LiquidationParams\` struct that the network's risk parameters live in.
`,
                },
              ],
            },
          },
          {
            title: "Types",
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: "Lesson 1 — MARGIN_SCALE + LiquidationParams — the dials on the risk engine",
                  slug: "openhl-liquidation-margin-scale-en",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 30,
                  xpReward: 60,
                  content: `# Lesson 1 — \`MARGIN_SCALE\` + \`LiquidationParams\` — the dials on the risk engine

## Goal

Concepts you'll grasp in this lesson:

- **Why basis points are the right fixed-point unit for margin** — bps gives you 4 decimal digits of precision, which is exactly the resolution real exchanges (HL, Binance, Drift) express margin requirements in. Same i64-saturating discipline as \`RATE_SCALE\`, different scale.
- **Why margin and rates need different scales** — funding rates need parts-per-billion because a single funding interval moves wealth by \`0.0001\` to \`0.04\` of notional; margin requirements move in \`0.02\` to \`0.10\` of notional. Two orders of magnitude difference → two orders of magnitude difference in scale.
- **\`LiquidationParams\` as network state, not user state** — the 10% / 2% / 1.5% defaults are *consensus parameters*, set once at network genesis and changed only by governance. The struct's job is to make the parameters first-class and explicit, not magic constants scattered through \`compute.rs\`.
- **The \`hyperliquid_default()\` constant constructor** — \`const fn\` so the defaults can land in \`static\` contexts, in test fixtures, in compile-time assertions. **\`#[must_use]\` so the struct can't be silently dropped after construction.**

Verification:

\`\`\`bash
cargo build -p openhl-liquidation
\`\`\`

…compiles.

Specific changes:

- **Cargo.toml** wiring \`openhl-clob\` and \`openhl-funding\` dependencies (\`AccountId\`, \`Side\`, \`Qty\` come from clob; \`MarkPrice\`, \`PositionSize\`, \`Notional\` come from funding — both are part of the production type signature, not test-only).
- **\`src/types.rs\`** — newly created, containing the module doc + \`MARGIN_SCALE\` constant + \`LiquidationParams\` struct + impl block with defaults and accessors.
- **\`src/lib.rs\`** — was empty, now declares \`pub mod types;\` + re-exports \`MARGIN_SCALE\` and \`LiquidationParams\` at the crate root.

L1 has no tests — \`MARGIN_SCALE\` is a value and \`LiquidationParams\` is a passive struct. L2's first behavior-bearing type (the \`MarginHealth\` enum) earns the first unit test.

## Recap

After L0:
- You understand why a perp DEX runs liquidations in consensus, not off-chain.
- You understand why floats are a chain-fork hazard (same as funding).
- The liquidation crate scaffold (Cargo.toml + empty \`src/lib.rs\`) is already in your workspace from before Stage 10a — same as the funding crate scaffold was before Stage 8b.

L1 turns the empty crate into a real crate with one publicly-visible scale + the parameters that govern the entire engine.

## Plan

Three edits, exactly mirroring funding L1's shape but with two deps instead of one:

1. **\`crates/liquidation/Cargo.toml\`** — add \`openhl-clob = { path = "../clob" }\` and \`openhl-funding = { path = "../funding" }\` to \`[dependencies]\`, plus a \`[dev-dependencies]\` block with \`proptest\` (used at L5 / L6).
2. **Create \`crates/liquidation/src/types.rs\`** — module doc explaining the bps rationale + \`MARGIN_SCALE\` constant + \`LiquidationParams\` struct + impl block.
3. **\`crates/liquidation/src/lib.rs\`** — was empty; add the crate doc + \`pub mod types;\` + \`pub use types::{LiquidationParams, MARGIN_SCALE};\`.

> 🛑 **Predict.** Before scrolling: funding uses \`RATE_SCALE = 1_000_000_000\` (parts-per-billion, 9 decimal digits of precision). Why does liquidation use \`MARGIN_SCALE = 10_000\` (basis points, 4 decimal digits)? Hint: think about what magnitudes you need to represent — funding rates are typically \`0.0001\` to \`0.04\` per interval; margin requirements are \`0.02\` to \`0.10\` of notional.

(Answer: **the resolution you need scales with the smallest meaningful step.** A funding rate of \`0.0001%\` per interval is a meaningful difference for high-volume traders — ppb is the right resolution. A maintenance margin of \`0.02%\` instead of \`0.05%\` is **not** a meaningful difference at the engine layer — production deployments set maintenance in whole bps (\`200 bps\`, \`500 bps\`). Bps is the conventional unit; using ppb would buy precision the system can't actually use. **Use the smallest scale that covers your real range.**)

## Walk-through

### Step 1: Update Cargo.toml

Open \`crates/liquidation/Cargo.toml\`. Currently:

\`\`\`toml
[package]
name         = "openhl-liquidation"
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
name         = "openhl-liquidation"
version      = { workspace = true }
edition      = { workspace = true }
rust-version = { workspace = true }
license      = { workspace = true }
repository   = { workspace = true }
authors      = { workspace = true }

[dependencies]
openhl-clob    = { path = "../clob" }
openhl-funding = { path = "../funding" }

[dev-dependencies]
proptest = { workspace = true }

[lints]
workspace = true
\`\`\`

Three changes:

1. **\`openhl-clob = { path = "../clob" }\`** — needed for \`AccountId\`, \`Side\`, \`Qty\` (the bridge layer reuses these for liquidation orders, and \`AccountSnapshot\` carries \`AccountId\`).
2. **\`openhl-funding = { path = "../funding" }\`** — needed for \`MarkPrice\`, \`PositionSize\`, \`Notional\`. These types are the contact surface between funding and liquidation: both crates speak the same currency.
3. **\`[dev-dependencies]\` block** with \`proptest\`. Used at L5 (margin-ratio monotonicity test) and L6 (margin-health determinism test). Declared now, used later.

> 🛑 **Anti-fluency.** "Why not put both deps as dev-deps too, since L5/L6 are tests?" **Because the production code uses \`MarkPrice\`, \`AccountId\` etc. in the function signatures of \`compute.rs\`, not just in tests.** Funding made the same call at its L1. The rule: a type that appears in any \`pub fn\` signature has to be a regular dep, not dev-only.

### Step 2: Create \`src/types.rs\`

Create \`crates/liquidation/src/types.rs\`. The file doesn't exist yet — brand new this lesson. Initial content:

\`\`\`rust
//! Core types for the liquidation engine.
//!
//! Pure data — no I/O, no allocation. Every type is \`Copy\`-friendly so the
//! engine can be invoked on snapshots taken at the bridge layer without
//! lifetime gymnastics. The convention follows \`openhl-funding\`: the
//! liquidation crate never owns mutable state in Stage 10a; it computes
//! over snapshots that the caller assembled.
//!
//! ### Why fixed-point integers, not floats
//!
//! Same answer as \`openhl-funding\`: consensus determinism. Every validator
//! must reach the same \`MarginHealth\` from the same inputs, and float
//! arithmetic varies bit-for-bit across compilers and CPUs. We use signed
//! integers scaled by [\`MARGIN_SCALE\`] (basis points, 10⁴) for margin
//! ratios.

/// Scale factor for \`MarginRatio\` — basis points (1 bp = 0.01%).
///
/// A raw value of \`MARGIN_SCALE\` represents \`100%\`; \`MARGIN_SCALE / 10\`
/// (= 1_000) represents \`10%\`. Bps is the conventional unit for margin
/// in TradFi and in crypto perp venues (Hyperliquid, Binance, Drift all
/// express margin requirements in bps).
pub const MARGIN_SCALE: i64 = 10_000;

/// Network parameters governing the margin model.
///
/// Bps convention: \`initial_margin_bps = 1000\` means a 10% initial margin
/// requirement. Maintenance must be ≤ initial; if a misconfigured network
/// sets them equal, every position at exactly that threshold classifies as
/// \`Liquidatable\` (the conservative default).
///
/// \`liquidation_fee_bps\` is charged on the notional being closed, paid
/// out of the account's collateral, and credited to the insurance fund
/// (Stage 10b). A typical HL-style value is 1–2% (100–200 bps).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct LiquidationParams {
    /// Initial margin requirement in bps (e.g., 1000 = 10%).
    pub initial_margin_bps: u32,
    /// Maintenance margin requirement in bps (e.g., 200 = 2%).
    pub maintenance_margin_bps: u32,
    /// Liquidation fee in bps, charged on closed notional.
    pub liquidation_fee_bps: u32,
}

impl LiquidationParams {
    /// Hyperliquid-style defaults: 10% initial, 2% maintenance, 1.5% fee.
    /// Real production deployments use tiered maintenance (higher margin
    /// for larger position sizes) — out of scope for Stage 10a.
    #[must_use]
    pub const fn hyperliquid_default() -> Self {
        Self {
            initial_margin_bps: 1_000,
            maintenance_margin_bps: 200,
            liquidation_fee_bps: 150,
        }
    }

    #[must_use]
    pub const fn initial_margin_bps(&self) -> u32 {
        self.initial_margin_bps
    }

    #[must_use]
    pub const fn maintenance_margin_bps(&self) -> u32 {
        self.maintenance_margin_bps
    }

    #[must_use]
    pub const fn liquidation_fee_bps(&self) -> u32 {
        self.liquidation_fee_bps
    }
}
\`\`\`

Five things to notice about this file:

1. **\`MARGIN_SCALE: i64 = 10_000\`** — \`i64\`, not \`u32\` or \`i32\`. Even though the scale itself fits in i32, every multiplication that produces a margin ratio uses i128 intermediates and then saturates back to i64 — keeping \`MARGIN_SCALE\` as i64 means no extra \`as i64\` casts at every arithmetic site.

2. **\`#[derive(Clone, Copy, Debug, PartialEq, Eq)]\` on \`LiquidationParams\`.** All three of the fields are \`u32\`; the struct is 12 bytes and trivially \`Copy\`. The engine passes \`LiquidationParams\` to \`margin_health\` by reference (\`&LiquidationParams\`), but the type being \`Copy\` means callers don't get yelled at if they accidentally pass by value.

3. **\`pub\` fields *and* \`const fn\` getters.** The fields are public for the same reason \`MarkPrice.0\` is — these are transparent newtypes / params, not encapsulation boundaries. The \`const fn\` getters exist alongside the public fields because they're useful in constant contexts (e.g., a compile-time assertion that \`maintenance_bps < initial_bps\`) where \`params.initial_margin_bps\` works only in \`const\` if the type is \`Copy\`. Both styles, both fine.

4. **\`hyperliquid_default()\` is \`const fn\`.** This lets the defaults appear in \`static\` items: \`static PARAMS: LiquidationParams = LiquidationParams::hyperliquid_default();\` works in any context, including embedded in tests, fixtures, and protobuf-encoded genesis state. **A \`const fn\` constructor is the bridge between "value I want" and "value I can declare anywhere."**

5. **\`#[must_use]\` on the constructor and getters.** Constructed-but-dropped \`LiquidationParams\` is almost certainly a bug — you computed the defaults and threw them away. Same logic for accessor: reading \`initial_margin_bps()\` and ignoring the result is almost always wrong. \`#[must_use]\` makes the compiler ask the reader to confirm.

> 🛑 **Anti-fluency.** "Why three separate \`u32\` fields instead of one \`LiquidationParams\` newtype wrapping a \`(u32, u32, u32)\` tuple?" **Because the three values mean different things.** Tuple ordering is positional and fragile — a refactor that swaps \`initial\` and \`maintenance\` produces a silent semantic bug. Named fields force the call site to be explicit: \`LiquidationParams { initial_margin_bps: 1000, ... }\`. **Names cost no runtime; positional tuples earn no runtime.**

### Step 3: Update \`src/lib.rs\`

Open \`crates/liquidation/src/lib.rs\`. Currently empty. Replace with:

\`\`\`rust
//! \`openhl-liquidation\` — perpetual-position liquidation engine.
//!
//! Pure compute in Stage 10a: no I/O, no async, no networking. Liquidation
//! decisions are deterministic functions over \`(account_snapshot, mark,
//! params)\`. Every validator on the chain must reach the same
//! [\`MarginHealth\`] from the same inputs; if two validators classify the
//! same account differently, the chain forks.
//!
//! ### Hyperliquid-shape liquidation, in one paragraph
//!
//! Perpetual contracts are levered positions backed by deposited
//! collateral. As the mark price moves against an open position,
//! unrealized PnL eats into the account's equity. When \`equity / notional\`
//! drops below the network's maintenance-margin requirement, the engine
//! force-closes the position at market — opposite side, full size, no
//! limit price. The liquidation fee is debited from collateral and
//! credited to the insurance fund. Any residual collateral, after fee
//! and PnL settlement, stays with the account. If equity went negative
//! before the close (the account is "underwater"), the insurance fund
//! absorbs the deficit instead of the position closing solvently.

pub mod types;

pub use types::{LiquidationParams, MARGIN_SCALE};
\`\`\`

Notice what's missing compared to the L11-end version: \`pub mod compute\`, the rest of the \`pub use types::{...}\` re-exports for \`MarginHealth\`, \`MarginRatio\`, \`AccountSnapshot\`, \`CloseOrderSpec\`. Those come in L2-L7 as we add the types and the compute functions. **L1 lib.rs is the minimum that compiles.**

The cross-reference \`[\`MarginHealth\`]\` will be broken until L2 adds the enum; rustdoc will emit a warning that we tolerate (same handling as funding L1).

> 🛑 **Predict.** What happens if you write \`pub use types::*;\` here instead of the explicit two-name re-export? Hint: think about what types exist after L1 vs after L7, and which API surface you're committing to.

(Answer: **\`pub use types::*\` would re-export everything that ever lives in \`types.rs\`, including future helpers and private support types you might accidentally \`pub\`.** Explicit \`pub use types::{LiquidationParams, MARGIN_SCALE}\` makes the crate's public surface a deliberate decision — every time you add a public type to \`types.rs\`, you also have to add it to the lib.rs re-export, which forces a moment of "is this part of the public API?" Glob re-exports are a maintenance hazard: a future helper added with \`pub\` instead of \`pub(crate)\` accidentally becomes part of the public API. **Explicit re-export is a checklist for the public API surface.**)

### Step 4: Compile

\`\`\`bash
cargo build -p openhl-liquidation
\`\`\`

Expected output:

\`\`\`
   Compiling openhl-liquidation v0.1.0 (/Users/.../my-openhl/crates/liquidation)
warning: unresolved link to \`MarginHealth\`
    Finished \`dev\` profile [unoptimized + debuginfo] in 0.4s
\`\`\`

One rustdoc warning about an unresolved link to \`MarginHealth\` (added at L2). **Don't suppress it** — it's the build telling you what's still missing.

Common errors:

- **\`error[E0463]: can't find crate for 'openhl_clob'\` or \`'openhl_funding'\`** — you forgot to add one of the \`path = "..."\` deps in Cargo.toml. L1 code doesn't actually use them yet, but if you preempted the L3 imports they'll fire.
- **\`error[E0583]: file not found for module 'compute'\`** — you preemptively added \`pub mod compute;\` to lib.rs. Remove it; we'll add it back at L4.
- **\`error: failed to parse manifest\`** — Cargo.toml syntax. Easy mistake: \`[dev-dependences]\` typo.

## Design reflection

Three load-bearing decisions in this lesson:

1. **\`MARGIN_SCALE = 10_000\`, not \`1_000_000_000\`.** Two orders of magnitude finer than funding's \`RATE_SCALE\` would be wrong — production margin parameters are not set in ppb. Two orders coarser (\`100\`, percent) would lose meaningful resolution. **Bps is the unit the world has settled on for margin; we match it.**

2. **Default constructor is \`const fn\`, not a \`Default\` impl.** Why both styles aren't right: \`Default::default()\` returns reasonable zero-ish defaults across many types. \`LiquidationParams::default()\` would suggest "zero margin, zero fee" which is **dangerous** — a network running with \`default()\` params has no liquidations at all. **\`hyperliquid_default()\` is a named, intentional default** — callers have to ask for it by name, which keeps the safety-critical nature visible.

3. **Three independent \`u32\` fields, not a \`LiquidationConfig\` struct nested inside.** Future migration to tiered maintenance margin (HL-style: higher maintenance % for larger positions) might want a \`Vec<MaintenanceTier>\` field. We don't add that now — premature generalization. **Stage 10a uses flat margin; Stage 10c+ can revisit if tiered is needed.**

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/Cargo.toml ./crates/liquidation/Cargo.toml
diff -u ~/code/my-openhl/crates/liquidation/src/types.rs ./crates/liquidation/src/types.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
\`\`\`

After L1:
- **Cargo.toml** matches Stage 10a exactly.
- **types.rs** matches the *first ~50 lines* of Stage 10a's types.rs — module doc + \`MARGIN_SCALE\` + \`LiquidationParams\` + impl. The rest (\`MarginRatio\`, \`MarginHealth\`, \`AccountSnapshot\`, \`CloseOrderSpec\`) is L2/L3.
- **lib.rs** matches the *first ~25 lines* of Stage 10a's lib.rs — crate doc + \`pub mod types;\` + the two re-exports. The other re-exports come as we add their types.

## Common questions

**Q1: Why not put \`MARGIN_SCALE\` in \`lib.rs\` alongside the crate doc?**

It belongs with the type system it scales. \`types.rs\` is where everything related to the unit-of-account (margin ratios, bps, classification thresholds) lives. The lib.rs is the public-API surface — re-exporting \`MARGIN_SCALE\` from types.rs to the crate root is cleaner than splitting the source of truth.

**Q2: Should \`LiquidationParams\` validate that \`maintenance ≤ initial\` in the constructor?**

Stage 10a says no — the struct accepts any combination. Stage 10c will add a \`validated()\` constructor that returns \`Result<Self, ParamsError>\` when called by genesis-loading code; the unvalidated constructor stays for tests and proptest generators that *want* to feed pathological inputs.

**Q3: Why is \`hyperliquid_default()\` 10% / 2% / 1.5% and not something else?**

HL's actual maintenance margin tiers run from 1.25% to 6.67% depending on position size; we picked 2% as a representative middle value. Initial is 10× maintenance — a common shape. Fee at 1.5% is the public HL number for ETH/BTC; lighter assets are lower. **None of these are precious — your network sets its own.**

**Q4: What's the actual i64-overflow risk on a margin ratio computation?**

\`margin_ratio = equity * MARGIN_SCALE / notional\`. With \`MARGIN_SCALE = 10_000\` and \`equity\` and \`notional\` bounded by \`i64::MAX\`, the product \`equity * MARGIN_SCALE\` can overflow i64 when \`equity > i64::MAX / 10_000 ≈ 9.2e14\`. At realistic exchange scales that's $920 trillion of equity — far above plausible inputs, but L5 still does the multiplication in \`i128\` and saturates back. **The reflex is the same as funding: any product that *can* exceed i64 *will* exceed i64 at some adversarial input.**

**Q5: Could we use \`u32\` for \`MARGIN_SCALE\` and \`bps\` and avoid the i64 conversion noise?**

You could — and you'd save a few \`i64::from(...)\` calls. The cost: every margin-ratio calculation involves \`equity\` (signed) and \`notional\` (unsigned), and mixing signed/unsigned in arithmetic requires explicit casts at every site. Better to upcast to i64 once at the boundary (\`i64::from(params.initial_margin_bps)\`) and keep the arithmetic signed throughout. **Convert at the boundary, compute in one type.**

## Next lesson (L2)

L2 adds the \`MarginRatio\` newtype + the \`MarginHealth\` enum. \`MarginHealth\` is the load-bearing classification type — the next 5 lessons all return or consume it. You'll see why we made it a 4-variant enum and not a \`bool\` or a \`u8\`.
`,
                },
                {
                  title: "Lesson 2 — MarginRatio + MarginHealth — the classification types the engine returns",
                  slug: "openhl-liquidation-margin-types-en",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 25,
                  xpReward: 50,
                  content: `# Lesson 2 — \`MarginRatio\` + \`MarginHealth\` — the classification types the engine returns

## Goal

Concepts you'll grasp in this lesson:

- **Why \`MarginRatio\` is a newtype, not a \`type\` alias for \`i64\`** — the newtype catches accidental "passed a raw i64 where a bps-scaled ratio was expected" bugs at compile time. Same discipline as funding's \`MarkPrice(pub u64)\` vs \`u64\`.
- **Why \`MarginHealth\` has exactly 4 variants** — \`Safe\`, \`AtRisk\`, \`Liquidatable\`, \`Underwater\`. Each variant authorizes a different engine action; collapsing any pair loses information the rest of the engine needs.
- **What each variant authorizes the rest of the engine to do** — a quick decision matrix you can keep in your head.
- **Why we *don't* derive \`PartialOrd\` / \`Ord\` on the enum** — even though the variants form a natural worsening order, ordered comparisons (\`health > Safe\`) read as code-smell next to explicit \`matches!\` patterns.

Verification:

\`\`\`bash
cargo build -p openhl-liquidation
\`\`\`

…compiles.

Specific changes:

- **\`src/types.rs\`** — appends \`MARGIN_SCALE\`-typed \`MarginRatio\` newtype and \`MarginHealth\` enum below the existing \`MARGIN_SCALE\` constant and \`LiquidationParams\` struct. No changes to anything from L1.
- **\`src/lib.rs\`** — adds \`MarginRatio\` and \`MarginHealth\` to the existing \`pub use types::{...}\` re-export.

L2 still has no tests — \`MarginRatio\` and \`MarginHealth\` are passive data types. L3 finishes the types module with \`AccountSnapshot\` + \`CloseOrderSpec\` (also no tests). The first behavior test arrives at L4 with \`notional_value\`.

## Recap

After L1:
- The crate has \`MARGIN_SCALE\` (10⁴) and \`LiquidationParams\` with a \`hyperliquid_default()\`.
- \`lib.rs\` re-exports both names from \`types\`.
- \`cargo build -p openhl-liquidation\` passes; one rustdoc warning about \`MarginHealth\` (still unresolved at this point).

L2 adds the two classification types the rest of the engine speaks in. From L4 onward, \`margin_ratio\` returns a \`MarginRatio\` and \`margin_health\` returns a \`MarginHealth\`.

## Plan

Two edits, both small:

1. **Append to \`crates/liquidation/src/types.rs\`** — \`MarginRatio(pub i64)\` newtype with \`MARGIN_SCALE\`-relative docs, and the \`MarginHealth\` enum with 4 variants + per-variant doc comments explaining the authorization meaning of each.
2. **Update \`crates/liquidation/src/lib.rs\`** — extend the \`pub use types::{...}\` line to include the two new names.

> 🛑 **Predict.** Before scrolling: \`MarginHealth\` is going to be an enum. How many variants does it need? Hint: the engine needs to decide three things about each account — (a) can the account open new risk? (b) should the engine force-close the position? (c) is closing the position by itself enough to cover the deficit, or does the insurance fund need to step in?

(Answer: **3 questions → 4 variants.** \`Safe\` = yes to (a). \`AtRisk\` = no to (a), no to (b). \`Liquidatable\` = no to (a), yes to (b), yes to (c) (close-only suffices). \`Underwater\` = no to (a), yes to (b), no to (c) (insurance fund absorbs the deficit). A 3-variant enum (Safe/AtRisk/Liquidatable) would collapse Liquidatable and Underwater, losing the "does the insurance fund get involved?" signal. The engine doesn't have to recompute that — it's already encoded in the variant.)

## Walk-through

### Step 1: Append to \`src/types.rs\`

Open \`crates/liquidation/src/types.rs\`. After the closing \`}\` of the \`LiquidationParams\` impl block, append:

\`\`\`rust
/// Account margin ratio = \`equity / notional\`, scaled by [\`MARGIN_SCALE\`].
///
/// Sign: usually non-negative; can be negative when the account is
/// "underwater" — accumulated losses have driven equity below zero, and
/// liquidating the position alone cannot cover the deficit. The insurance
/// fund absorbs that shortfall (Stage 10b).
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct MarginRatio(pub i64);

/// Margin health classification given the account's current margin ratio
/// and the network's params. Four states, in decreasing health order.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum MarginHealth {
    /// Margin ratio ≥ initial margin requirement. Healthy: the account
    /// can open new positions or increase existing ones.
    Safe,
    /// Margin ratio ∈ [maintenance, initial). Allowed to hold existing
    /// positions but not to add risk. Production UIs typically warn the
    /// user.
    AtRisk,
    /// Margin ratio < maintenance, equity still ≥ 0. The engine should
    /// liquidate the position at market; the account's remaining equity
    /// (after the liquidation fee) returns to the account.
    Liquidatable,
    /// Margin ratio < 0 (equity is negative). Closing the position at
    /// any price won't fully cover losses. The insurance fund absorbs
    /// the shortfall — handled in Stage 10b.
    Underwater,
}
\`\`\`

Things to notice about these 25 lines:

1. **\`MarginRatio(pub i64)\` is a newtype.** Not a \`type MarginRatio = i64\` alias. The newtype gives the type checker a handle: a function that takes \`MarginRatio\` cannot be accidentally called with a raw \`i64\` value that's actually a balance, an account ID, or a \`MarkPrice\`. The \`pub i64\` field means callers can construct one with \`MarginRatio(1000)\` and read it with \`ratio.0\` — no encapsulation invariant to defend.

2. **\`MarginRatio\` derives a lot of traits — \`Default\`, \`PartialOrd\`, \`Ord\`, \`Hash\`.** The defaults aren't required by the engine, but they let downstream code (telemetry, sorted-by-worst-health scanners in Stage 10c, dashboards) use \`MarginRatio\` like any other comparable value type. \`MarginRatio::default()\` is \`MarginRatio(0)\` — 0 bps, semantically "no ratio computed" or "freshly zeroed." The engine itself never reads \`default()\`; it always computes from a snapshot.

3. **\`MarginHealth\` does NOT derive \`PartialOrd\` / \`Ord\`.** Even though the variants naturally order (Safe < AtRisk < Liquidatable < Underwater in worsening direction), ordered comparisons on enums read as code-smell. \`if health > MarginHealth::AtRisk\` is less clear than \`if matches!(health, MarginHealth::Liquidatable | MarginHealth::Underwater)\`. The compiler enforces the explicit pattern; future maintainers see exactly which variants the branch covers.

4. **Per-variant doc comments describe the *authorization*, not the math.** "Margin ratio < maintenance" tells you when the variant fires, but the comment also says what the engine does in response ("should liquidate the position at market"). Doc comments here serve as the canonical reference for "what does Liquidatable actually mean to the rest of the system?"

5. **Variant order matches worsening health.** The variants are listed in the source in the order Safe → AtRisk → Liquidatable → Underwater. This isn't load-bearing for the compiler — Rust enums have no inherent order beyond what you derive — but it matches the order an exhaustive \`match\` typically reads naturally (best case first, worst case last).

> 🛑 **Anti-fluency.** "Couldn't \`MarginHealth\` be a \`bool\` — liquidatable or not?" **No, because the engine needs three downstream decisions, not one.** A \`bool\` collapses (a) "can open positions?" and (c) "does the insurance fund get involved?" into a single bit. The cost of fixing that later is going through every call site that returned the \`bool\` and changing the type — the cost of getting it right now is two extra variants.

### Step 2: Update \`src/lib.rs\`

Open \`crates/liquidation/src/lib.rs\`. Extend the \`pub use types::{...}\` line. Was:

\`\`\`rust
pub use types::{LiquidationParams, MARGIN_SCALE};
\`\`\`

Becomes:

\`\`\`rust
pub use types::{LiquidationParams, MarginHealth, MarginRatio, MARGIN_SCALE};
\`\`\`

That's the entire \`lib.rs\` change — three new public names at the crate root, in alphabetical order. Constants traditionally sort last so \`MARGIN_SCALE\` stays at the end.

The rustdoc warning about \`[\`MarginHealth\`]\` (unresolved at L1) now resolves — the type exists.

### Step 3: Compile

\`\`\`bash
cargo build -p openhl-liquidation
\`\`\`

Expected output:

\`\`\`
   Compiling openhl-liquidation v0.1.0 (/Users/.../my-openhl/crates/liquidation)
    Finished \`dev\` profile [unoptimized + debuginfo] in 0.4s
\`\`\`

Zero warnings. The L1 rustdoc warning about \`MarginHealth\` is gone.

Common errors:

- **\`error[E0432]: unresolved import 'crate::types::MarginRatio'\`** — typo in the \`pub use\` line (e.g., \`MarignRatio\`). Match the type names character-for-character.
- **\`error: ambiguous re-export\`** — you accidentally added a second \`pub use\` line at the bottom instead of extending the existing one. Keep all re-exports on a single \`pub use types::{...}\` block; the formatter expects this shape.

## Design reflection

Three load-bearing decisions in this lesson:

1. **\`MarginRatio(pub i64)\` newtype, not \`type MarginRatio = i64\`.** Aliases are zero-cost but also zero-safety: the compiler treats them as the same type. A newtype is also zero-cost at runtime (single-field structs lay out identical to the field) but creates a real distinction the compiler enforces. **Use newtypes wherever the value carries a meaning beyond "an integer with this bit pattern."**

2. **\`MarginHealth\` has 4 variants because the engine makes 3 downstream decisions.** Each variant maps cleanly to a unique combination of those 3 decisions. A 5th variant ("ImminentlyLiquidatable"? "RecentlyClosed"?) would require a 4th decision; until we have one, 4 is the right number. **Match the cardinality of your enum to the cardinality of the actions it authorizes.**

3. **No \`PartialOrd\` on \`MarginHealth\`.** The variants order naturally, but ordered comparisons on enums lose specificity (\`health > AtRisk\` doesn't say *which* "worse than AtRisk" — \`Liquidatable\` or \`Underwater\`?). Explicit \`matches!\` patterns force every branch to spell out which variants it handles, and \`rustc -W non_exhaustive_omitted_patterns\` catches the case you forgot. **Comparable enums are usually a code-smell; reach for \`matches!\` first.**

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/src/types.rs ./crates/liquidation/src/types.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
\`\`\`

After L2:
- **types.rs** matches lines 1 through ~\`MarginHealth::Underwater\` of Stage 10a's types.rs — the \`MARGIN_SCALE\` + \`LiquidationParams\` (from L1) plus the new \`MarginRatio\` + \`MarginHealth\`. The next two types (\`AccountSnapshot\`, \`CloseOrderSpec\`) are L3.
- **lib.rs** matches Stage 10a's lib.rs except for \`compute\` module + 6 more re-exports — those come in L4–L7.

## Common questions

**Q1: Why doesn't \`MarginRatio\` implement \`Display\`?**

It could; the value is just an i64 in bps. We don't because no production code path formats a \`MarginRatio\` directly for end-user display — the bridge layer pulls \`.0\` out and renders it with a known scale ("\`{}%\`", \`ratio.0 / 100\`). Adding \`Display\` invites callers to print \`MarginRatio\` in logs as a raw integer, which obscures the bps scale. **Implement traits at the layer that needs them.**

**Q2: Could \`MarginHealth\` be a \`u8\` and save memory?**

Rust's enum layout for 4 variants without payloads already fits in a \`u8\` — \`size_of::<MarginHealth>() == 1\`. The compiler picks the smallest discriminant. Switching to a raw \`u8\` would lose the named variants, lose exhaustiveness checking in \`match\`, and gain nothing.

**Q3: Should the variants carry payloads (e.g., \`AtRisk { headroom_bps: u32 }\`)?**

Tempting but premature. The downstream consumers (Stage 10c scanner, dashboards) re-derive what they need from the underlying margin_ratio. Variant payloads add construction overhead and complicate \`match\` ergonomics. **Keep enums payload-free unless every consumer benefits from the payload.**

**Q4: Why include \`Underwater\` as a separate variant when \`Liquidatable\` could imply both "close + maybe absorb deficit"?**

Because the bridge needs to do *different things* in the two cases. A \`Liquidatable\` account generates a single close order and the engine settles fee+remainder normally. An \`Underwater\` account generates a close order AND a credit-to-insurance-fund entry that the bridge must apply atomically. Separating the variants pushes the case distinction up to the type level, where exhaustive \`match\` catches it; merging them pushes the case distinction into runtime branching inside the bridge, where it's easier to miss. **State machines benefit from variants that mirror the actions they trigger.**

**Q5: Should \`margin_health\` return \`Option<MarginHealth>\` for flat positions?**

No — flat positions return \`MarginHealth::Safe\` (no notional, no margin requirement to fall short of). \`Option\` would force every caller to handle \`None\` explicitly, even though "flat = safe" is unambiguous. **Don't add \`Option\` to encode states the type system already handles.**

## Next lesson (L3)

L3 closes the types module with \`AccountSnapshot\` (the input to every margin function) and \`CloseOrderSpec\` (the output the engine hands the bridge). After L3, the \`types\` module is complete; L4 starts the \`compute\` module with \`notional_value\`.
`,
                },
                {
                  title: "Lesson 3 — AccountSnapshot + CloseOrderSpec — the engine's input and output types",
                  slug: "openhl-liquidation-snapshot-spec-en",
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 25,
                  xpReward: 50,
                  content: `# Lesson 3 — \`AccountSnapshot\` + \`CloseOrderSpec\` — the engine's input and output types

## Goal

Concepts you'll grasp in this lesson:

- **Why liquidation defines its own \`AccountSnapshot\` instead of reusing \`funding::Position\`** — \`Position\` carries \`(account, size)\`; liquidation needs \`(account, size, avg_entry, collateral)\`. Two crates, two snapshot types, no cross-coupling. The bridge layer assembles each from its own ledger.
- **The "snapshot" discipline shared with funding** — the engine consumes a snapshot the caller built; it never owns mutable account state. Same I/O-free purity that lets the proptest catch determinism bugs.
- **Why \`CloseOrderSpec\` carries no price field** — liquidation always closes at market. The engine doesn't pick prices; the bridge encodes this as \`clob::Action::SubmitMarket\` and the book settles at whatever the next available price is.
- **Why \`Side\` and \`Qty\` come from \`openhl_clob\`, not a new liquidation-local type** — they're the same concepts the matching engine speaks. Two parallel \`Side\` enums in two crates would be a translation surface waiting to drift.

Verification:

\`\`\`bash
cargo build -p openhl-liquidation
\`\`\`

…compiles. After this lesson, the \`types\` module is complete.

Specific changes:

- **\`src/types.rs\`** — appends \`AccountSnapshot\` and \`CloseOrderSpec\` structs below the existing \`MarginHealth\` enum. No changes to anything from L1 or L2.
- **\`src/lib.rs\`** — adds \`AccountSnapshot\` and \`CloseOrderSpec\` to the \`pub use types::{...}\` re-export.

L3 still has no tests — both new structs are passive data containers. L4 begins the \`compute\` module and earns the first behavior test (\`notional_value\`).

## Recap

After L2:
- \`types.rs\` has \`MARGIN_SCALE\` + \`LiquidationParams\` (L1) + \`MarginRatio\` + \`MarginHealth\` (L2).
- \`lib.rs\` re-exports four names: \`LiquidationParams\`, \`MarginHealth\`, \`MarginRatio\`, \`MARGIN_SCALE\`.
- \`cargo build -p openhl-liquidation\` passes with zero warnings.

L3 adds the two **I/O types**: the input every margin function consumes (\`AccountSnapshot\`) and the output the engine hands the bridge (\`CloseOrderSpec\`). After L3, the types module is finished — Module 1 of Course 10 is closed.

## Plan

Two edits, both append-only:

1. **Append \`AccountSnapshot\` to \`crates/liquidation/src/types.rs\`** — 4 fields, \`Copy\`-friendly, doc comment that names the caller's responsibility for maintaining \`avg_entry\` across fills.
2. **Append \`CloseOrderSpec\`** below that — 3 fields, no price, doc comment that names the bridge as the consumer.
3. **Update \`crates/liquidation/src/lib.rs\`** — extend the \`pub use types::{...}\` line.

> 🛑 **Predict.** Before scrolling: liquidation needs to compute unrealized PnL per account. That formula is \`(mark - entry) * size\`. **Which inputs does \`funding::Position\` *not* give you, and why didn't funding need them?** Hint: funding's formula is \`size * mark * rate\` — see what's missing.

(Answer: **\`avg_entry\` (to compute the PnL leg) and \`collateral\` (to compute equity).** Funding's formula has no \`entry\` factor — it scales by the current mark times the rate, regardless of where the position was opened. Funding also doesn't read collateral; the settlement deltas it emits get applied to balances at the bridge layer, which keeps its own balance ledger. Liquidation's job is to *measure* whether collateral + unrealized PnL has fallen below the threshold, so it needs both. Different jobs, different snapshots.)

## Walk-through

### Step 1: Append \`AccountSnapshot\` to \`src/types.rs\`

Open \`crates/liquidation/src/types.rs\`. After the closing \`}\` of the \`MarginHealth\` enum, append:

\`\`\`rust
/// Snapshot of one account's perpetual-market state, assembled by the
/// bridge layer before invoking the liquidation engine. Same "snapshot"
/// model as \`openhl_funding::Position\`: the engine treats this as a
/// per-tick read-only view, never mutates it.
///
/// \`avg_entry\` is the volume-weighted average price at which the account
/// opened its current net position. The owning layer (vault / clearing)
/// is responsible for maintaining this across fills.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct AccountSnapshot {
    pub account: AccountId,
    pub position_size: PositionSize,
    pub avg_entry: MarkPrice,
    pub collateral: Notional,
}
\`\`\`

Things to notice about this 10-line block:

1. **Four fields, all \`Copy\`.** \`AccountId\` (\`u64\`), \`PositionSize\` (\`i64\`), \`MarkPrice\` (\`u64\`), \`Notional\` (\`i64\`). Total stack size: 32 bytes. The engine passes snapshots by reference (\`&AccountSnapshot\`) in most calls but the \`Copy\` derive means a caller that accidentally drops a \`&\` reference doesn't get a borrow-checker fight.

2. **\`avg_entry: MarkPrice\`, not a new \`EntryPrice\` type.** The price at which a position was opened lives in the same unit-of-account as the mark price the position is currently measured against. Defining a separate \`EntryPrice\` newtype would force conversions at every PnL computation site for no semantic gain. **When two fields measure the same physical thing, share the type.**

3. **\`collateral: Notional\` — signed.** Collateral is *deposited* funds, conventionally non-negative, but the type is \`Notional\` (signed) because \`account_equity = collateral + unrealized_pnl\` needs to flow as a signed sum. Making \`collateral\` unsigned would force an \`as i64\` cast in every equity computation. **Convert at the boundary, keep the math in one signed type.**

4. **\`pub\` fields, no constructor function.** Same convention as \`LiquidationParams\` from L1: transparent struct, no encapsulation invariant. The bridge layer builds \`AccountSnapshot { account: …, position_size: …, … }\` directly. There's no \`AccountSnapshot::new()\` because there's nothing for a constructor to enforce.

5. **Doc comment names the caller's contract.** "*The owning layer (vault / clearing) is responsible for maintaining this across fills.*" That single sentence is the entire \`avg_entry\` invariant: liquidation doesn't track fills, doesn't recompute entry, doesn't reconcile partial closes. Those responsibilities live one layer up. **The crate doc says what *this* crate guarantees; what it requires from the caller goes in the type's doc comment.**

> 🛑 **Anti-fluency.** "Why not put \`AccountSnapshot\` in \`openhl-funding\` so both crates can use the same type?" **Because funding doesn't need \`avg_entry\` or \`collateral\` — adding them to \`funding::Position\` would bloat the funding snapshot for no benefit, and bridge would have to populate fields funding ignores.** Two crates, two snapshot types is the right shape. The bridge holds the canonical account ledger; producing two different snapshot views per tick is cheap.

### Step 2: Append \`CloseOrderSpec\` to \`src/types.rs\`

Continue in \`src/types.rs\`. After the closing \`}\` of \`AccountSnapshot\`, append:

\`\`\`rust
/// Specification for a single liquidation close order, generated by the
/// engine and consumed by the bridge layer. The bridge encodes this as
/// \`openhl_clob::Action::SubmitMarket\` and routes it through the matching
/// engine.
///
/// Always a market order — liquidation accepts any available price.
/// Always the opposite side of the position: a long position closes via
/// \`Side::Sell\`, a short via \`Side::Buy\`. Quantity is the absolute value
/// of the position size.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct CloseOrderSpec {
    pub account: AccountId,
    pub side: Side,
    pub qty: Qty,
}
\`\`\`

Three things to notice:

1. **No \`price\` field.** Liquidation never picks a price; the engine produces a market order spec and the matching engine fills it at whatever depth exists in the book. Stage 10c will iterate \`AccountSnapshot\` slices and emit one \`CloseOrderSpec\` per \`Liquidatable\` or \`Underwater\` account; none of them will carry a limit.

2. **\`side: Side\` reuses \`openhl_clob::Side\`.** The matching engine speaks in \`Side::{Buy, Sell}\`. If we defined a new \`liquidation::Side\` enum and converted at the bridge, we'd introduce a translation surface that can drift (someone adds a third side variant in one crate but not the other). **One enum, one source of truth.**

3. **\`qty: Qty\` reuses \`openhl_clob::Qty(u64)\`.** The doc comment says "absolute value of the position size" — \`PositionSize\` is \`i64\` (signed) but the close quantity is always positive. The conversion (\`Qty(position_size.0.unsigned_abs())\`) happens in \`compute::close_order_spec\` at L7; here we just commit to the *output type* being unsigned.

> 🛑 **Predict.** Before scrolling: \`CloseOrderSpec\` doesn't carry a \`Reason\` field saying *why* the close happened (Liquidatable vs Underwater). Should it? Hint: think about who consumes the spec and what information they need.

(Answer: **No.** The bridge consumes the spec and needs to do two things: submit the close order, and (for Underwater accounts) credit the insurance fund. The engine signals both — Stage 10c's scanner emits the \`CloseOrderSpec\` *plus* an \`InsuranceFundDelta\` for accounts that were Underwater. Adding a \`Reason\` field to the close spec would duplicate signal between the spec and the insurance-fund delta, and a future refactor could let them drift apart. **Don't encode the same fact in two places — let the upstream output be the source of truth, and let downstream consumers carry only what they need.**)

### Step 3: Update \`src/lib.rs\`

Open \`crates/liquidation/src/lib.rs\`. Extend the \`pub use types::{...}\` line. Was:

\`\`\`rust
pub use types::{LiquidationParams, MarginHealth, MarginRatio, MARGIN_SCALE};
\`\`\`

Becomes:

\`\`\`rust
pub use types::{
    AccountSnapshot, CloseOrderSpec, LiquidationParams, MarginHealth, MarginRatio, MARGIN_SCALE,
};
\`\`\`

Two new names added — \`AccountSnapshot\` and \`CloseOrderSpec\` — alphabetically inserted (so \`AccountSnapshot\` lands at the start, \`CloseOrderSpec\` after it, and the rest follows in the same order). The line breaks across multiple lines once the list grows past ~5 items; rustfmt will reformat to a one-name-per-line block on the next save if you keep adding.

### Step 4: Compile

\`\`\`bash
cargo build -p openhl-liquidation
\`\`\`

Expected output:

\`\`\`
   Compiling openhl-liquidation v0.1.0 (/Users/.../my-openhl/crates/liquidation)
    Finished \`dev\` profile [unoptimized + debuginfo] in 0.4s
\`\`\`

Zero warnings, zero errors. The \`types\` module of the liquidation crate is now complete.

Common errors:

- **\`error[E0432]: unresolved import 'openhl_clob::Qty'\`** — the import line at the top of \`types.rs\` already names \`Qty\` (added back in L1's types.rs scaffold), so this fires only if you stripped imports. If it does, the L1-era top of the file should still read \`use openhl_clob::{AccountId, Qty, Side};\` and \`use openhl_funding::{MarkPrice, Notional, PositionSize};\` — the same imports cover both L2 and L3.
- **\`error: cannot find type 'Notional'\`** — same root cause; check the \`use openhl_funding::{…}\` line includes \`Notional\`.

## Design reflection

Three load-bearing decisions in this lesson:

1. **\`AccountSnapshot\` is liquidation-local, not a shared type in \`openhl-funding\`.** The two crates have different jobs — funding settles continuous rate-driven deltas, liquidation classifies discrete margin events — and forcing them to share a snapshot type would couple the bridge's data plumbing on both sides. **Two crates with related-but-different needs deserve two snapshot types.**

2. **\`CloseOrderSpec\` carries no price.** The engine's responsibility is to decide *whether* to close, not at *what* price. The bridge layer translates the spec into a market order and the matching engine takes whatever depth exists. **Mechanisms that pick prices belong below the policy layer that decides actions.**

3. **\`Side\` and \`Qty\` come from \`openhl_clob\`, not a parallel liquidation-local type.** When two crates exchange messages, they should speak in the same vocabulary types. Two \`Side\` enums means two \`impl From\` blocks at the boundary plus a coordination tax forever. **Share the boundary types; specialize the internal types.**

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/src/types.rs ./crates/liquidation/src/types.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
\`\`\`

After L3:
- **types.rs** matches **the full Stage 10a types.rs byte-for-byte**. Module 1 of Course 10 ships exactly this types module.
- **lib.rs** still misses \`pub mod compute;\` + the compute re-exports. Those land in L4–L7.

## Common questions

**Q1: Could \`AccountSnapshot\` be generic over a position-type trait so funding and liquidation share an abstract snapshot?**

Could, but premature. Both crates each fit on one page of fields they need; an abstract \`Snapshot<P: PositionLike>\` trait would add types-machinery the bridge doesn't need to manipulate. **A concrete type per crate, with the bridge translating, is cheaper to read and cheaper to refactor.**

**Q2: Why does \`avg_entry\` use \`MarkPrice\` instead of a dedicated \`EntryPrice\` newtype?**

Because the price at which a position was opened and the price the position is being measured against are in the same units — same scale, same source-of-truth (the matching engine's last fill price, conventionally). Defining \`EntryPrice(u64)\` parallel to \`MarkPrice(u64)\` would force conversions at every PnL site. **When two values share units, share the type.**

**Q3: Is \`collateral\` allowed to be negative?**

In the engine's eyes: no, the *deposited* collateral is always non-negative. But \`Notional\` is signed because (a) it's the type funding uses for settlement deltas, which *can* be negative, and (b) intermediate equity computations \`collateral + unrealized_pnl\` produce signed results. Making \`collateral\` itself unsigned would force casts at every equity site. **Signed arithmetic upstream, range-check at the boundary.**

**Q4: Should \`CloseOrderSpec\` carry a \`bridge_metadata: Bytes\` field for upstream context?**

No — Stage 10c will pass \`CloseOrderSpec\` directly to the bridge with no envelope. If you need to correlate a close back to its trigger (audit logs, telemetry), the bridge can do that with \`(snapshot.account, current_block_height)\` from outside the spec. **Don't let downstream features balloon the upstream type.**

**Q5: Why are both structs \`Copy\`?**

Cheap and convenient. \`AccountSnapshot\` is 32 bytes, \`CloseOrderSpec\` is 24 bytes — Copy is essentially free at these sizes. Without it, callers have to clone every time they want a second reference. **Make small Plain-Old-Data types \`Copy\`; reach for \`Clone\` only when ownership semantics actually matter.**

## Next lesson (L4)

L4 starts the \`compute\` module. The first two functions — \`notional_value\` and \`unrealized_pnl\` — earn the first behavior tests for the liquidation crate. You'll see the signed-multiplication trick that makes the same code path produce the right sign for both long and short positions, and the i128-intermediate discipline that keeps multiplications safe from i64 overflow at network-pathological inputs.
`,
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
                  title: "Lesson 4 — notional_value + unrealized_pnl — the signed-multiplication trick",
                  slug: "openhl-liquidation-notional-pnl-en",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 45,
                  xpReward: 80,
                  content: `# Lesson 4 — \`notional_value\` + \`unrealized_pnl\` — the signed-multiplication trick

## Goal

Concepts you'll grasp in this lesson:

- **Why \`notional_value\` returns \`u64\` and \`unrealized_pnl\` returns \`i64\`** — notional exposure is always non-negative (\`|size| × mark\`); PnL is signed (\`mark − entry\` can be either side). Reflecting each at the return-type level lets the compiler catch sign-confusion bugs at call sites.
- **\`unsigned_abs()\` over \`abs()\` for \`i64\`** — \`i64::MIN.abs()\` overflows (positive \`i64::MIN\` doesn't exist). \`unsigned_abs()\` returns \`u64\` and never panics. Use it whenever you need the magnitude of a signed integer.
- **The signed-multiplication trick that handles long vs short with no branching** — \`(mark − entry) × size\`, with \`size\` signed, produces the right sign for *both* directions naturally. Four sign combinations resolve to four correct PnL values with no \`if side == Long\` anywhere.
- **The i128-intermediate discipline** — sign-preserving subtraction (\`i128::from(mark.0) − i128::from(entry.0)\`) followed by an overflow-safe product, saturated back to \`i64\`. Same shape as funding's \`compute_premium\`.
- **\`saturate_i128_to_i64\` as a load-bearing helper** — any product that *can* exceed \`i64::MAX\` at network-pathological inputs *will*, eventually. Saturate, don't panic.

Verification:

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

…passes 8 tests (3 for \`notional_value\`, 5 for \`unrealized_pnl\`).

Specific changes:

- **Create \`crates/liquidation/src/compute.rs\`** — the file doesn't exist yet. Module doc + imports + two public functions + one private helper + a \`#[cfg(test)]\` block with 8 unit tests.
- **\`src/lib.rs\`** — add \`pub mod compute;\` + extend the re-export to include \`notional_value\` and \`unrealized_pnl\`.

L4 is the first lesson with running tests. From here every lesson adds tests until L8 (\`close_order_spec\`, the last of Stage 10a's behaviors).

## Recap

After L3:
- The types module is byte-for-byte complete against Stage 10a — \`MARGIN_SCALE\`, \`LiquidationParams\`, \`MarginRatio\`, \`MarginHealth\`, \`AccountSnapshot\`, \`CloseOrderSpec\`.
- The compute module doesn't exist yet.
- \`cargo build\` passes; \`cargo test\` runs zero tests.

L4 creates the compute module. The first two functions answer the question "what does this account *currently* look like?" — its notional exposure and its unrealized PnL. L5 builds equity and margin ratio on top of these.

## Plan

Two edits:

1. **Create \`crates/liquidation/src/compute.rs\`** — module doc + \`use\` statements pulling \`AccountSnapshot\`, \`MarkPrice\` from L1–L3 + \`notional_value\` + \`unrealized_pnl\` + the private \`saturate_i128_to_i64\` helper + a \`#[cfg(test)]\` tests block with 3 notional tests + 5 PnL tests.
2. **Update \`src/lib.rs\`** — add \`pub mod compute;\` and extend the public re-exports to include the two new function names.

> 🛑 **Predict.** Before scrolling: \`unrealized_pnl\` needs to return *positive* when a long is in profit AND when a short is in profit. The naïve shape is:
>
> \`\`\`rust
> if size > 0 {  // long
>     (mark - entry) * size.abs()
> } else {       // short
>     (entry - mark) * size.abs()
> }
> \`\`\`
>
> This works but branches. **There's a single-expression formula that gets all four sign combinations right without any \`if\`.** What is it? Hint: think about what happens to the formula \`(mark - entry) * size\` when \`size\` itself carries the long/short sign.

(Answer: **\`(mark − entry) × size\`, where \`size\` is signed \`i64\`.** Walk through the four cases:
- Long (\`size = +10\`), mark > entry: positive × positive = positive profit ✓
- Long (\`size = +10\`), mark < entry: negative × positive = negative loss ✓
- Short (\`size = −10\`), mark > entry: positive × negative = negative loss ✓
- Short (\`size = −10\`), mark < entry: negative × negative = positive profit ✓

Every case lands on the right sign. **No branching, no two-codepath testing, no risk that someone "fixes" one branch without the other.** This is the load-bearing reason \`PositionSize\` is signed — the type carries the long/short distinction so the arithmetic doesn't have to.)

## Walk-through

### Step 1: Create \`src/compute.rs\`

Create \`crates/liquidation/src/compute.rs\`. The file doesn't exist yet. Initial content:

\`\`\`rust
//! Pure liquidation math.
//!
//! Six building blocks, all stateless:
//!   - [\`notional_value\`] — \`|size| × mark\`, the exposure in quote units
//!   - [\`unrealized_pnl\`] — \`(mark − avg_entry) × size\`, signed
//!   - [\`account_equity\`] — \`collateral + unrealized_pnl\`, can be negative
//!   - [\`margin_ratio\`] — \`equity / notional\`, scaled by [\`MARGIN_SCALE\`]
//!   - [\`margin_health\`] — classify the account against the params
//!   - [\`close_order_spec\`] — generate the close order for a liquidatable
//!     account
//!
//! Each function is deterministic and saturates on overflow rather than
//! wrapping or panicking. Validators that disagree about a margin
//! classification fork the chain, so the failure mode at network-
//! pathological inputs has to be bounded behavior.

use crate::types::{
    AccountSnapshot, CloseOrderSpec, LiquidationParams, MarginHealth, MarginRatio, MARGIN_SCALE,
};
use openhl_clob::{Qty, Side};
use openhl_funding::MarkPrice;
\`\`\`

The module doc names six functions — only two of them land in L4. The next four (\`account_equity\`, \`margin_ratio\`, \`margin_health\`, \`close_order_spec\`) come in L5–L7. Listing all six upfront avoids re-editing the module doc at every lesson; it's also a roadmap for any reader who lands here without context.

> 🛑 **Anti-fluency.** "Why import \`CloseOrderSpec\`, \`Side\`, \`Qty\`, \`LiquidationParams\`, \`MarginHealth\`, \`MarginRatio\` when L4 only uses \`AccountSnapshot\` and \`MarkPrice\`?" **Because every subsequent lesson uses them — adding imports in batch at L4 keeps the diff focused on the function being added.** Rust will warn about unused imports until L5+; you tolerate those warnings the same way funding L1 tolerated rustdoc warnings about types that arrive later. The alternative — edit the \`use\` lines six times across L4–L7 — is busywork that obscures what each lesson actually adds.

### Step 2: Add \`notional_value\`

Below the imports, add:

\`\`\`rust
/// Notional exposure of the account = \`|position_size| × mark\`, in quote
/// units. Returns \`0\` for a flat position (no exposure regardless of mark).
///
/// \`u64::saturating_mul\` clips at \`u64::MAX\` for network-pathological
/// \`position_size × mark\` products. Real deployments are bounded by upstream
/// position-size limits; the saturation here is the second line of defense.
#[must_use]
pub fn notional_value(snapshot: &AccountSnapshot, mark: MarkPrice) -> u64 {
    let abs_size = snapshot.position_size.0.unsigned_abs();
    abs_size.saturating_mul(mark.0)
}
\`\`\`

Three things to notice about this 7-line function:

1. **Return type is \`u64\`, not \`i64\`.** Notional is the *magnitude* of exposure — always non-negative. Returning \`u64\` makes "did the caller forget to take abs?" impossible: the type system enforces it. A caller that wants to feed notional into a signed computation (like \`margin_ratio\`'s division) does an explicit \`i64::from(notional_value(...))\` at the call site. **The conversion is one line; the bug it prevents is silent sign errors that survive into production.**

2. **\`snapshot.position_size.0.unsigned_abs()\`, not \`.abs()\`.** \`i64::abs\` returns \`i64\` — and \`i64::MIN.abs()\` is undefined in safe Rust (panics in debug, wraps in release). \`unsigned_abs\` returns \`u64\` and is defined for every input, including \`i64::MIN\` (\`i64::MIN.unsigned_abs() == 9_223_372_036_854_775_808\`). **Use \`unsigned_abs\` whenever you need the magnitude of a signed integer; reserve \`abs\` only when you're sure the value can't be \`MIN\`.**

3. **\`u64::saturating_mul\` over \`u64::checked_mul\`.** Both detect overflow; \`saturating_mul\` returns \`u64::MAX\` on overflow, \`checked_mul\` returns \`None\`. Returning \`Option<u64>\` would force every caller (margin_ratio in L5, etc.) to handle a \`None\` that *only* arises at network-pathological inputs. Saturating returns a usable value that's mathematically wrong only at the extremes — and at those extremes the margin engine will classify the account as \`Liquidatable\` either way. **Saturation is the right failure mode when "wrong but bounded" beats "must handle Option."**

### Step 3: Add \`unrealized_pnl\`

Below \`notional_value\`, add:

\`\`\`rust
/// Unrealized PnL = \`(mark − avg_entry) × position_size\`, in quote units.
/// Positive = profit, negative = loss.
///
/// Sign convention follows the natural signed multiplication:
///   - Long position (size > 0) profits when \`mark > entry\` → positive
///   - Long position loses when \`mark < entry\` → negative
///   - Short position (size < 0) profits when \`mark < entry\` → negative
///     times negative is positive
///   - Flat position (size = 0) → 0
#[must_use]
pub fn unrealized_pnl(snapshot: &AccountSnapshot, mark: MarkPrice) -> i64 {
    // diff = mark − entry, in i128 to preserve sign on subtraction.
    let diff = i128::from(mark.0) - i128::from(snapshot.avg_entry.0);
    // pnl = diff × size, in i128 to absorb the product's full range.
    let pnl = diff.saturating_mul(i128::from(snapshot.position_size.0));
    saturate_i128_to_i64(pnl)
}
\`\`\`

Four things to notice:

1. **\`i128::from(mark.0) − i128::from(snapshot.avg_entry.0)\`, not \`(mark.0 as i64) − (snapshot.avg_entry.0 as i64)\`.** Both \`mark\` and \`entry\` are \`u64\`. Subtracting \`u64 − u64\` in Rust panics if the result would be negative; casting to \`i64\` first loses the top bit if either value exceeds \`i64::MAX\`. Upcasting to \`i128\` first preserves the full range and produces a signed result that can be negative without surprises. **Upcast wider than you think you need; the cost is zero and the safety is enormous.**

2. **The \`saturating_mul\` is on \`i128\`.** A \`diff\` near \`u64::MAX\` (≈ 2⁶⁴) times a \`position_size\` near \`i64::MAX\` (≈ 2⁶³) is ≈ 2¹²⁷ — within \`i128\`'s \`±2¹²⁷\` range but \`saturating_mul\` is still cheap defense at the extremes. Saturation here matches funding's pattern.

3. **\`saturate_i128_to_i64(pnl)\` at the end.** The PnL might be in i128 territory after the product, but the engine downstream uses \`i64\`. The helper saturates rather than panicking on conversion failure — same discipline. (Helper definition comes in Step 4.)

4. **Sign convention spelled out in the doc.** The 4-case enumeration ("Long profits when mark > entry") is the canonical reference for any reviewer asking "wait, does this work for shorts?" The math gets it right by construction, but the doc says *why* — readers don't have to mentally walk through the cases each time.

> 🛑 **Anti-fluency.** "Why not just do \`(mark.0 as i64 − entry.0 as i64) × size\` directly?" **Three problems.** (1) If \`mark\` or \`entry\` exceeds \`i64::MAX\`, the cast wraps silently — the top bit becomes the sign bit. (2) Even if both fit in i64, the subtraction in i64 can overflow when one is near \`i64::MIN\` and the other is positive. (3) The product \`(mark − entry) × size\` can exceed i64 even when each operand fits — a 1% price move on an \`i64::MAX\`-size position overflows. **The \`as\` cast is the Rust footgun this lesson exists to defuse.**

### Step 4: Add the \`saturate_i128_to_i64\` helper

After \`unrealized_pnl\`, add the private helper:

\`\`\`rust
/// Saturating cast from \`i128\` to \`i64\`. Used wherever an intermediate
/// product can exceed \`i64::MAX\` at network-pathological inputs.
/// Saturation, not wrapping — see the module-doc note on why panicking
/// would be a worse failure mode.
fn saturate_i128_to_i64(v: i128) -> i64 {
    i64::try_from(v).unwrap_or(if v > 0 { i64::MAX } else { i64::MIN })
}
\`\`\`

Three things to notice about this 3-line helper:

1. **No \`pub\`.** This is an implementation detail of \`compute.rs\`. The public API is the six functions named in the module doc; the helper exists to keep their bodies clean. **Keep helpers private unless callers in other modules genuinely need them.**

2. **\`i64::try_from(v).unwrap_or(...)\`.** \`try_from\` returns \`Err\` exactly when the value doesn't fit; the \`unwrap_or\` branch picks the saturation target by sign. For \`v > 0\` the value was too positive (saturate at \`i64::MAX\`); for \`v ≤ 0\` it was too negative (saturate at \`i64::MIN\`). **Three lines of arithmetic; one decision point; impossible to typo.**

3. **No tests for the helper.** The behavior is exhaustively tested through \`unrealized_pnl\`'s test cases (which exercise both happy-path and edge-of-range inputs). A separate test for the helper would be redundant.

### Step 5: Add the tests

Below the helper, add the \`#[cfg(test)]\` block:

\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;
    use openhl_clob::AccountId;
    use openhl_funding::{Notional, PositionSize};
    use proptest::prelude::*;

    fn snapshot(size: i64, entry: u64, collateral: i64) -> AccountSnapshot {
        AccountSnapshot {
            account: AccountId(42),
            position_size: PositionSize(size),
            avg_entry: MarkPrice(entry),
            collateral: Notional(collateral),
        }
    }

    // ─── notional_value ───────────────────────────────────────────

    #[test]
    fn notional_long() {
        let s = snapshot(10, 100, 0);
        assert_eq!(notional_value(&s, MarkPrice(120)), 10 * 120);
    }

    #[test]
    fn notional_short_uses_abs() {
        let s = snapshot(-10, 100, 0);
        assert_eq!(notional_value(&s, MarkPrice(120)), 10 * 120);
    }

    #[test]
    fn notional_flat_is_zero() {
        let s = snapshot(0, 100, 1_000);
        assert_eq!(notional_value(&s, MarkPrice(120)), 0);
    }

    // ─── unrealized_pnl ───────────────────────────────────────────

    #[test]
    fn pnl_long_profit() {
        // Long 10 @ entry 100; mark 120 → +200
        let s = snapshot(10, 100, 0);
        assert_eq!(unrealized_pnl(&s, MarkPrice(120)), 200);
    }

    #[test]
    fn pnl_long_loss() {
        // Long 10 @ entry 100; mark 80 → −200
        let s = snapshot(10, 100, 0);
        assert_eq!(unrealized_pnl(&s, MarkPrice(80)), -200);
    }

    #[test]
    fn pnl_short_profit() {
        // Short −10 @ entry 100; mark 80 → +200 (price down is good for short)
        let s = snapshot(-10, 100, 0);
        assert_eq!(unrealized_pnl(&s, MarkPrice(80)), 200);
    }

    #[test]
    fn pnl_short_loss() {
        // Short −10 @ entry 100; mark 120 → −200
        let s = snapshot(-10, 100, 0);
        assert_eq!(unrealized_pnl(&s, MarkPrice(120)), -200);
    }

    #[test]
    fn pnl_flat_is_zero() {
        let s = snapshot(0, 100, 0);
        assert_eq!(unrealized_pnl(&s, MarkPrice(200)), 0);
    }
}
\`\`\`

Things to notice about the test block:

1. **A \`snapshot()\` helper at the top.** Three integer args (\`size\`, \`entry\`, \`collateral\`) — \`account\` is hardcoded to \`AccountId(42)\`. The helper saves typing across 8+ tests and keeps each test's *meaningful* inputs (the sign of size, the relationship between entry and mark) visible. **Test fixtures should expose what varies and hide what's constant.**

2. **Four PnL cases mirror the four sign combinations from the predict callout.** \`pnl_long_profit\`, \`pnl_long_loss\`, \`pnl_short_profit\`, \`pnl_short_loss\`. Plus \`pnl_flat_is_zero\` to nail the zero-size path. Every reachable sign combination has a test. **Coverage of sign combinations is the load-bearing property — miss one and a future refactor can silently invert a side.**

3. **\`use proptest::prelude::*;\` even though L4 has no proptests yet.** The import lands here once and survives through L5/L8 where proptests are added. Same reasoning as the bulk imports in \`compute.rs\` proper — write once at the boundary, tolerate the unused-import warning across the next few lessons.

4. **Test names are sentences.** \`pnl_long_profit\` reads as "PnL when long is in profit." When a test fails, the test name in the failure output is the first thing you see — make it descriptive enough that you don't need to read the body to know what broke. **\`fn test_1\`, \`fn test_2\` are CI noise; sentence-fragment names are CI signal.**

### Step 6: Update \`src/lib.rs\`

Open \`crates/liquidation/src/lib.rs\`. Add \`pub mod compute;\` and extend the re-export. Was:

\`\`\`rust
pub mod types;

pub use types::{
    AccountSnapshot, CloseOrderSpec, LiquidationParams, MarginHealth, MarginRatio, MARGIN_SCALE,
};
\`\`\`

Becomes:

\`\`\`rust
pub mod compute;
pub mod types;

pub use compute::{notional_value, unrealized_pnl};
pub use types::{
    AccountSnapshot, CloseOrderSpec, LiquidationParams, MarginHealth, MarginRatio, MARGIN_SCALE,
};
\`\`\`

Two changes:

1. **\`pub mod compute;\`** above \`pub mod types;\` — alphabetical, same as the existing convention.
2. **\`pub use compute::{notional_value, unrealized_pnl};\`** — a new re-export line, separate from the \`types\` re-export so each module gets its own line. L5–L7 will extend the compute list as more functions land.

### Step 7: Run the tests

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

Expected output:

\`\`\`
running 8 tests
test compute::tests::notional_flat_is_zero ... ok
test compute::tests::notional_long ... ok
test compute::tests::notional_short_uses_abs ... ok
test compute::tests::pnl_flat_is_zero ... ok
test compute::tests::pnl_long_loss ... ok
test compute::tests::pnl_long_profit ... ok
test compute::tests::pnl_short_loss ... ok
test compute::tests::pnl_short_profit ... ok

test result: ok. 8 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

**The 8 tests are your proof that the signed-multiplication trick works for every sign combination.** When you (or a future contributor) refactors \`unrealized_pnl\`, these tests are what keeps the sign convention honest.

Common errors:

- **\`warning: unused import: ...\`** for any of the imports added in batch — expected, gone by L7.
- **\`error[E0599]: no method named 'unsigned_abs' found for type 'i64'\`** — you're on a very old Rust. \`unsigned_abs\` was stabilized in Rust 1.51 (2021). The project's \`rust-toolchain.toml\` should pin a recent enough version.
- **Test fails with \`attempt to multiply with overflow\`** — your build is in debug mode and you wrote \`*\` instead of \`saturating_mul\`. Replace.

## Design reflection

Three load-bearing decisions in this lesson:

1. **\`notional_value: u64\`, \`unrealized_pnl: i64\`.** Return types signal invariants. Notional is never negative; PnL can be either side. Calling code that needs to mix them does the explicit conversion (\`i64::from(notional)\`). **One conversion at the call site beats a class of silent-sign bugs that survive into production.**

2. **Signed-multiplication symmetry over branching.** \`(mark − entry) × size\` resolves all four sign combinations correctly because \`size\` carries the long/short sign. The branching alternative (\`if size > 0 { ... } else { ... }\`) splits the codepath in two, double-fields the test budget, and risks a "fix the long branch but forget the short branch" bug in some future refactor. **Let the type system carry the cases the arithmetic naturally handles.**

3. **\`unsigned_abs\` over \`abs\` for \`i64\`.** \`i64::MIN.abs()\` is the canonical Rust footgun: panics in debug, silently wraps in release. \`unsigned_abs\` returns \`u64\` and is defined for every \`i64\` input. **Pick the version of the operation that has no panic-path; the alternative is a debug-only crash that a release build will gladly hide.**

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/src/compute.rs ./crates/liquidation/src/compute.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
\`\`\`

After L4:
- **compute.rs** matches the first ~80 lines of Stage 10a's \`compute.rs\` — module doc + imports + \`notional_value\` + \`unrealized_pnl\` + helper + the first 8 tests. Everything below (the next four functions and their tests, plus 3 proptests) lands in L5–L7.
- **lib.rs** still misses 4 more compute re-exports (\`account_equity\`, \`margin_ratio\`, \`margin_health\`, \`close_order_spec\`). Those arrive incrementally.

## Common questions

**Q1: Why is \`notional_value\` \`u64\` but \`mark\` is also \`u64\` — couldn't the product overflow \`u64\`?**

It can, at network-pathological inputs (a position so large that \`|size| × mark > 2⁶⁴\`). That's what \`saturating_mul\` defends. In realistic markets this doesn't happen — exchange position-size limits keep notional far below \`u64::MAX\`. The saturation is the second line of defense; the first is upstream sanity checks.

**Q2: Why is the helper \`saturate_i128_to_i64\` private but \`notional_value\` and \`unrealized_pnl\` are public?**

The helper is an implementation choice (saturating cast). The two public functions are part of the engine's contract — every callsite computing margin needs them. **Public means "callers depend on this." Private means "this is how we happen to do it inside."** A future refactor could replace \`saturate_i128_to_i64\` with \`checked_mul\` + \`Option\` propagation without breaking any callers.

**Q3: Could the signed-multiplication trick produce a wrong sign at the integer extremes?**

Mathematically no — the four sign combinations come from elementary algebra. But arithmetically, yes: a product that overflows \`i64\` (and then \`i128\`) loses information about the sign of the true result. That's why every intermediate product uses \`i128::saturating_mul\` and the final cast saturates at \`i64::MAX\` / \`i64::MIN\` depending on the sign of the i128 value. **Saturation preserves the *sign* of the answer even when it loses the *magnitude*.**

**Q4: Should \`unrealized_pnl\` panic when \`mark == 0\`?**

No — \`mark = 0\` is bizarre but not undefined. The formula \`(0 − entry) × size = −entry × size\` is mathematically well-defined (and would classify the position as deeply underwater, which is correct behavior). Production deployments will refuse to *publish* a zero mark; if one slips through, the engine handles it gracefully. **Pure functions don't decide policy; they compute on whatever inputs they get.**

**Q5: Why doesn't \`notional_value\` take \`&MarkPrice\` instead of \`MarkPrice\`?**

\`MarkPrice\` is \`Copy\` and 8 bytes (\`u64\`). Pass-by-value is cheaper than pass-by-reference for \`Copy\` types this small — no pointer indirection, no aliasing concerns. **Reach for \`&\` when the type is large enough that copying is expensive, OR when ownership semantics matter. For \`Copy\` newtypes around primitives, pass-by-value is the right default.**

## Next lesson (L5)

L5 adds \`account_equity\` and \`margin_ratio\` — and the **most pedagogically loaded discovery in Stage 10a**: the leveraged-regime non-monotonicity of \`margin_ratio\`. You'll write the proptest first ("as mark increases for a long, margin_ratio should also increase"), watch it fail at a small handful of inputs, trace through *why* the failure is real (and not a bug), and refine the proptest with \`prop_assume!\` to express the actual invariant. This is the lesson where a learner's first mental model of margin math gets broken and rebuilt.
`,
                },
                {
                  title: "Lesson 5 — account_equity + margin_ratio — and the proptest that breaks your first mental model",
                  slug: "openhl-liquidation-equity-ratio-en",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 60,
                  xpReward: 100,
                  content: `# Lesson 5 — \`account_equity\` + \`margin_ratio\` — and the proptest that breaks your first mental model

## Goal

Concepts you'll grasp in this lesson:

- **Why \`account_equity\` returns \`i64\` and can be negative** — equity is \`collateral + unrealized_pnl\`. The PnL leg can blow through deposited collateral and produce a deficit; the engine has to be able to *measure* that deficit so liquidation can pull the right lever.
- **Why \`margin_ratio\` guards \`notional == 0\` with \`MarginRatio(i64::MAX)\`** — flat positions have no exposure, so no margin requirement applies. Returning the maximum representable ratio signals "infinitely safe" and lets every downstream classifier short-circuit naturally.
- **The i128-scaling discipline for \`equity × MARGIN_SCALE / notional\`** — order of operations matters: multiply first in \`i128\` so the high-precision numerator survives the divide. Doing the divide first in \`i64\` loses precision for small ratios.
- **The leveraged-regime non-monotonicity of \`margin_ratio\`** — your first intuition ("as mark increases for a long, margin_ratio increases") is **wrong in the cash-heavy regime** where \`collateral > entry × size\`. The proptest will catch this — and the fix isn't "patch the function," it's "refine the invariant statement."
- **\`prop_assume!\` as the right way to express conditional invariants** — when an invariant holds only inside a subset of the input space, \`prop_assume!\` filters proptest inputs to that subset rather than weakening the assertion.
- **Short vs long monotonicity asymmetry** — short positions have *unconditional* monotonicity in mark; longs only have it under the leveraged condition. The math derivative explains why.

Verification:

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

…passes 16 tests (8 from L4 + 5 new unit tests + 3 proptests, each at the default 256 cases).

Specific changes:

- **\`src/compute.rs\`** — appends \`account_equity\`, \`margin_ratio\`, 5 unit tests, and 3 proptests below the existing L4 content.
- **\`src/lib.rs\`** — extends the \`pub use compute::{...}\` re-export to include \`account_equity\` and \`margin_ratio\`.

L5 is the pedagogical center of Stage 10a. Don't rush it. The proptest discovery loop — write, fail, trace, refine — is the load-bearing skill the lesson exists to teach.

## Recap

After L4:
- The compute module exists with \`notional_value\` and \`unrealized_pnl\` plus the private \`saturate_i128_to_i64\` helper.
- 8 unit tests cover the four sign combinations of PnL plus the three notional cases (long, short, flat).
- \`cargo test\` runs 8 tests, all green.

L5 builds the next layer: convert PnL into account equity (adds collateral), then divide equity by notional to get a margin ratio. Then we write the first proptest — and meet the surprise that defines this stage.

## Plan

Three phases:

1. **Append \`account_equity\`** — one-line function, one happy-path unit test, one "equity goes negative" unit test.
2. **Append \`margin_ratio\`** — the i128-scaled division with a flat-position guard, three unit tests (flat returns max, ratio at exactly 10%, ratio can be negative).
3. **Add a proptest block** — write the long-monotonicity proptest in its naïve form, watch it fail at a specific input, trace why, refine with \`prop_assume!\`, then add the short-monotonicity (no precondition) and determinism proptests. Final state: three proptests, all green.

Then update \`lib.rs\`.

> 🛑 **Predict.** Before scrolling: a long position with \`collateral = 100\`, \`size = 1\`, \`entry = 100\` has \`notional = 100\` and \`equity = 100\` at mark = 100 (zero PnL). **What is the margin_ratio at mark = 100?** And what does it become at mark = 110, mark = 50? Think through the formula \`equity × MARGIN_SCALE / notional\` for each case before reading on.

(Walk-through:
- **mark = 100**: notional = 1 × 100 = 100, pnl = (100 − 100) × 1 = 0, equity = 100 + 0 = 100, ratio = 100 × 10_000 / 100 = **10_000 bps = 100%**.
- **mark = 110**: notional = 110, pnl = 10, equity = 110, ratio = 110 × 10_000 / 110 = **10_000 bps = 100%**.
- **mark = 50**: notional = 50, pnl = −50, equity = 50, ratio = 50 × 10_000 / 50 = **10_000 bps = 100%**.

**Margin ratio doesn't move!** The collateral exactly offsets the PnL movement at every mark because \`collateral = notional_at_entry\`. The position is unlevered: every dollar of exposure has a dollar of collateral behind it. **That's the regime where the naïve monotonicity intuition breaks** — a position with \`collateral ≥ notional_at_entry\` is "cash-funded" and the margin ratio can move in either direction as mark moves. We'll see this in the proptest in a minute.)

## Walk-through

### Step 1: Append \`account_equity\`

Open \`crates/liquidation/src/compute.rs\`. After the \`saturate_i128_to_i64\` helper, add (above the \`#[cfg(test)]\` block):

\`\`\`rust
/// Account equity = \`collateral + unrealized_pnl\`. Can be negative.
///
/// A negative equity means losses have exceeded deposited collateral —
/// the account is underwater. The liquidation engine still attempts to
/// close the position; any residual deficit falls to the insurance fund
/// (Stage 10b).
#[must_use]
pub fn account_equity(snapshot: &AccountSnapshot, mark: MarkPrice) -> i64 {
    snapshot
        .collateral
        .0
        .saturating_add(unrealized_pnl(snapshot, mark))
}
\`\`\`

Three things to notice about this 6-line function:

1. **Returns \`i64\`, not \`u64\`.** The doc says "can be negative" and the type makes it real. A caller that downstreams this into a margin computation can use signed arithmetic without surprise. **Match the type to the value's actual range.**

2. **\`saturating_add\` over \`+\` or \`checked_add\`.** Adding two \`i64\` values can overflow at the extremes. \`saturating_add\` returns \`i64::MAX\` or \`i64::MIN\` at overflow; the engine will classify either as a definitive health state without needing to handle an \`Option\`. Same pattern as the \`i128 → i64\` saturation.

3. **No tests yet — they come in Step 2 below.** This keeps the function definitions visually contiguous before the test block. Many lessons interleave; we don't.

### Step 2: Append \`margin_ratio\`

After \`account_equity\`, append:

\`\`\`rust
/// Margin ratio = \`equity / notional\`, scaled by [\`MARGIN_SCALE\`].
///
/// Returns \`MarginRatio(i64::MAX)\` for a flat position — no notional
/// exposure means the margin requirement is irrelevant, and we report the
/// healthiest possible ratio.
///
/// Returns a negative ratio when equity < 0 (the underwater case).
#[must_use]
pub fn margin_ratio(snapshot: &AccountSnapshot, mark: MarkPrice) -> MarginRatio {
    let notional = notional_value(snapshot, mark);
    if notional == 0 {
        return MarginRatio(i64::MAX);
    }
    let equity = account_equity(snapshot, mark);
    // ratio = equity × MARGIN_SCALE / notional, in i128 to avoid overflow
    // before the divide.
    let scaled = i128::from(equity).saturating_mul(i128::from(MARGIN_SCALE));
    let ratio = scaled / i128::from(notional);
    MarginRatio(saturate_i128_to_i64(ratio))
}
\`\`\`

Five things to notice:

1. **\`notional == 0\` early return with \`i64::MAX\`.** Flat positions have no exposure → no margin requirement to fall short of. Returning the maximum representable ratio signals "infinitely safe" and lets every downstream \`margin_health\` comparison short-circuit naturally (no special-case in \`margin_health\`). The alternative — \`Option<MarginRatio>\` or \`Result<MarginRatio>\` — would force every caller to handle the flat case explicitly. **Encode the "no constraint" case as the safest possible value.**

2. **The multiplication happens *before* the division.** \`equity × MARGIN_SCALE / notional\` in i128 preserves precision for small ratios (e.g., a 1% margin = 100 bps survives the divide). Doing the divide first (\`equity / notional × MARGIN_SCALE\` in i64) would truncate to integer percentages before scaling, losing precision. **Order of operations matters when integer division is in the mix.**

3. **i128 for the scaled product.** \`equity\` is i64; \`MARGIN_SCALE\` is 10⁴. Their i64 product can overflow when \`|equity| > i64::MAX / 10_000 ≈ 9.2e14\`. At realistic exchange scales that's $920 trillion — well above plausible — but the i128 multiplication is the second line of defense. Same discipline as \`unrealized_pnl\`.

4. **The \`i128::from(notional)\` cast for the divide.** Once \`scaled\` is i128, dividing by an i128 keeps the result in i128. Casting \`notional\` (u64) to i128 is free; mixing i128 and u64 in division isn't directly possible. **Stay in one wide type for the whole chain; cast once at the boundary.**

5. **Final \`saturate_i128_to_i64(ratio)\`.** Even after the divide, an extreme i128 value can exceed i64 range (e.g., huge equity vs tiny notional). Saturation preserves the sign of the answer and clips the magnitude.

### Step 3: Add 5 unit tests

Inside the existing \`#[cfg(test)] mod tests { ... }\` block, after the PnL tests from L4, add:

\`\`\`rust
    // ─── account_equity ────────────────────────────────────────────

    #[test]
    fn equity_collateral_plus_pnl() {
        // Long 10 @ 100, collateral 1_000, mark 120 → equity = 1_000 + 200 = 1_200
        let s = snapshot(10, 100, 1_000);
        assert_eq!(account_equity(&s, MarkPrice(120)), 1_200);
    }

    #[test]
    fn equity_can_go_negative() {
        // Long 10 @ 100, collateral 100, mark 50 → pnl = −500, equity = −400
        let s = snapshot(10, 100, 100);
        assert_eq!(account_equity(&s, MarkPrice(50)), -400);
    }

    // ─── margin_ratio ──────────────────────────────────────────────

    #[test]
    fn ratio_flat_returns_max() {
        let s = snapshot(0, 100, 1_000);
        assert_eq!(margin_ratio(&s, MarkPrice(100)), MarginRatio(i64::MAX));
    }

    #[test]
    fn ratio_exactly_ten_percent() {
        // Notional = 10 × 100 = 1_000; equity = 100 (collateral only, pnl = 0).
        // ratio = 100 × 10_000 / 1_000 = 1_000 bps = 10%.
        let s = snapshot(10, 100, 100);
        assert_eq!(margin_ratio(&s, MarkPrice(100)), MarginRatio(1_000));
    }

    #[test]
    fn ratio_can_be_negative() {
        // Underwater: equity = −400, notional = 500 → ratio = −8_000 bps
        let s = snapshot(10, 100, 100);
        let r = margin_ratio(&s, MarkPrice(50));
        assert!(r.0 < 0, "expected negative ratio, got {:?}", r);
    }
\`\`\`

Things to notice:

1. **Each ratio test names the exact arithmetic in the comment.** "\`ratio = 100 × 10_000 / 1_000 = 1_000 bps = 10%\`" — the reader (and future-you, debugging a regression) can verify the test's expected value without re-running the calculation. **Tests are code that also explains.**

2. **\`ratio_can_be_negative\` uses \`assert!(r.0 < 0)\` instead of \`assert_eq!(r, MarginRatio(-8000))\`.** The exact ratio value depends on i64 rounding of the divide; pinning the exact bps locks in arithmetic that doesn't have a single canonical answer (different rounding modes give different LSBs). Asserting just the *sign* tests the load-bearing property — equity-negative-implies-ratio-negative — without testing the rounding accident. **Test the property, not the artifact.**

3. **\`ratio_flat_returns_max\` uses \`MarginRatio(i64::MAX)\` directly.** The sentinel value is part of the contract — \`margin_health\` (in L6) will rely on it.

### Step 4: Write the proptest — initial naïve form

Below the unit tests (still inside \`mod tests\`), open a \`proptest!\` block. Start with the long-position monotonicity invariant *without* \`prop_assume!\`:

\`\`\`rust
    proptest! {
        /// For a long position, as mark increases (price moves in the
        /// long's favor), margin_ratio should monotonically increase.
        /// If it ever moved the other way, an account could pass from
        /// "safe" to "liquidatable" without a single adverse price move,
        /// which would be a soundness bug.
        #[test]
        fn long_ratio_monotonic_in_mark(
            size in 1_i64..1_000,
            entry in 100_u64..10_000,
            collateral in 1_i64..1_000_000,
            mark_a in 1_u64..50_000,
            mark_b in 1_u64..50_000,
        ) {
            prop_assume!(mark_a < mark_b);
            let s = snapshot(size, entry, collateral);
            let r_low  = margin_ratio(&s, MarkPrice(mark_a));
            let r_high = margin_ratio(&s, MarkPrice(mark_b));
            prop_assert!(
                r_low.0 <= r_high.0,
                "long ratio not monotonic: mark_a={} → r={}; mark_b={} → r={}",
                mark_a, r_low.0, mark_b, r_high.0
            );
        }
    }
\`\`\`

Run the test:

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

It **fails** with a minimal counterexample like:

\`\`\`
thread 'compute::tests::long_ratio_monotonic_in_mark' panicked:
Test failed: long ratio not monotonic: mark_a=1 → r=40000; mark_b=2 → r=25000
minimal failing input: size = 1, entry = 100, collateral = 103, mark_a = 1, mark_b = 2
\`\`\`

**Stop here. Don't fix the function. Hand-trace the failure.**

### Step 5: Trace the failure

Plug the minimal failing input through \`margin_ratio\` step by step:

**At mark = 1:**
- \`notional = |1| × 1 = 1\`
- \`pnl = (1 − 100) × 1 = −99\`
- \`equity = 103 + (−99) = 4\`
- \`ratio = 4 × 10_000 / 1 = 40_000 bps\` (= 400%)

**At mark = 2:**
- \`notional = |1| × 2 = 2\`
- \`pnl = (2 − 100) × 1 = −98\`
- \`equity = 103 + (−98) = 5\`
- \`ratio = 5 × 10_000 / 2 = 25_000 bps\` (= 250%)

Margin ratio went from 400% to 250% as mark went up. Equity rose (from 4 to 5), but notional *also* rose (from 1 to 2). The notional grew faster than the equity recovered.

The general formula:

> \`margin_ratio = (collateral + (mark − entry) × size) × MARGIN_SCALE / (|size| × mark)\`
>
> = \`MARGIN_SCALE × (collateral/notional + (1 − entry/mark))\`

Differentiate with respect to mark (for a long, holding size and entry and collateral fixed):

> \`d(margin_ratio)/d(mark) = MARGIN_SCALE × (entry / mark² − collateral / (size × mark²))\`
>
> = \`MARGIN_SCALE / mark² × (entry − collateral / size)\`

The sign of this derivative is the sign of \`entry − collateral / size\`. So:

- If \`entry × size > collateral\`: derivative is positive → ratio **increases** with mark (the levered regime, where the naïve intuition is correct).
- If \`entry × size < collateral\`: derivative is negative → ratio **decreases** with mark (the cash-heavy regime, where the naïve intuition is wrong).
- If \`entry × size = collateral\`: derivative is zero → ratio is constant in mark (the "exactly funded" knife edge).

The failing input has \`entry × size = 100 × 1 = 100\` and \`collateral = 103\`. Since \`collateral > entry × size\`, we're in the cash-heavy regime where the ratio decreases as mark rises.

**This is not a bug in \`margin_ratio\`. The function is correct. The bug is in the proptest's invariant statement — it's claiming monotonicity in a regime where monotonicity doesn't hold.**

### Step 6: Refine the proptest with \`prop_assume!\`

Replace the long-monotonicity proptest with a version that asserts monotonicity only inside the regime where it actually holds:

\`\`\`rust
    proptest! {
        /// For a *levered* long position (entry × size > collateral), as
        /// mark increases, margin_ratio monotonically increases.
        ///
        /// The leverage condition is load-bearing: when collateral exceeds
        /// position notional at entry (effectively cash + tiny exposure),
        /// the ratio is dominated by \`collateral / notional\`, which
        /// *decreases* as mark grows — so monotonicity fails. That
        /// regime is uninteresting for liquidation (the account can
        /// never be liquidated), so we exclude it via \`prop_assume!\`.
        #[test]
        fn long_ratio_monotonic_in_mark_when_levered(
            size in 1_i64..1_000,
            entry in 100_u64..10_000,
            collateral in 1_i64..1_000_000,
            mark_a in 1_u64..50_000,
            mark_b in 1_u64..50_000,
        ) {
            prop_assume!(mark_a < mark_b);
            // Levered regime: notional at entry strictly exceeds collateral.
            prop_assume!(
                i128::from(entry) * i128::from(size) > i128::from(collateral)
            );
            let s = snapshot(size, entry, collateral);
            let r_low  = margin_ratio(&s, MarkPrice(mark_a));
            let r_high = margin_ratio(&s, MarkPrice(mark_b));
            prop_assert!(
                r_low.0 <= r_high.0,
                "long ratio not monotonic: mark_a={} → r={}; mark_b={} → r={}",
                mark_a, r_low.0, mark_b, r_high.0
            );
        }
\`\`\`

Three things to notice about the refinement:

1. **The test name now ends in \`_when_levered\`.** The name carries the precondition. A future reader who jumps to a failure of this test knows the precondition without reading the body.

2. **The doc comment names *why* the assumption matters.** "*That regime is uninteresting for liquidation*" — readers see this is a deliberate scoping choice, not an oversight.

3. **\`prop_assume!\` over restricting the input ranges.** We *could* generate \`collateral\` in \`0..(entry × size)\` to enforce the leverage condition by construction. But proptest input strategies are often hard to compose for inter-parameter constraints, and \`prop_assume!\` reads naturally as "skip cases that violate this precondition." The proptest counter (\`successes: 8, rejects: ~\`) tells you how many cases got filtered — if rejects climb above ~10× successes, *then* refine the strategies.

### Step 7: Add the short-monotonicity proptest (no precondition)

Add inside the same \`proptest!\` block:

\`\`\`rust
        /// Symmetric invariant for shorts: as mark increases, the short's
        /// margin_ratio always decreases. Unlike the long case, this holds
        /// for *any* collateral level — the math derivative is uniformly
        /// negative in mark (every term either decreases or stays flat).
        #[test]
        fn short_ratio_monotonic_in_mark(
            size in 1_i64..1_000,
            entry in 100_u64..10_000,
            collateral in 1_i64..1_000_000,
            mark_a in 1_u64..50_000,
            mark_b in 1_u64..50_000,
        ) {
            prop_assume!(mark_a < mark_b);
            let s = snapshot(-size, entry, collateral);
            let r_low  = margin_ratio(&s, MarkPrice(mark_a));
            let r_high = margin_ratio(&s, MarkPrice(mark_b));
            prop_assert!(
                r_low.0 >= r_high.0,
                "short ratio not monotonic: mark_a={} → r={}; mark_b={} → r={}",
                mark_a, r_low.0, mark_b, r_high.0
            );
        }
\`\`\`

Two things to notice:

1. **No \`prop_assume!\` for the leverage condition.** Short monotonicity holds *unconditionally*. Walk through the derivative: for \`size < 0\`, the formula becomes \`margin_ratio = MARGIN_SCALE × (collateral / notional + entry / mark − 1)\`. Differentiating: \`d/d(mark) = MARGIN_SCALE / mark² × (−collateral / |size| − entry)\`. Both terms inside the parens are non-positive (collateral and entry are non-negative; \`|size|\` is positive). The derivative is uniformly negative or zero. **The asymmetry is a real mathematical fact, not a notation choice.**

2. **\`-size\` in the snapshot setup.** We feed positive \`size\` to the strategy generator (so it stays > 0) and negate it before constructing the snapshot. This avoids generating \`size = 0\` (which would test the flat case, covered by \`ratio_flat_returns_max\`).

### Step 8: Add the determinism proptest

Add inside the same \`proptest!\` block:

\`\`\`rust
        /// Determinism: the same inputs always produce the same MarginRatio.
        /// Trivially true for pure functions, but the proptest catches
        /// accidental non-determinism (e.g., if a future refactor introduces
        /// HashMap iteration or float arithmetic).
        #[test]
        fn margin_ratio_deterministic(
            size in -1_000_i64..1_000,
            entry in 1_u64..10_000,
            collateral in -1_000_000_i64..1_000_000,
            mark in 1_u64..50_000,
        ) {
            let s = snapshot(size, entry, collateral);
            let r1 = margin_ratio(&s, MarkPrice(mark));
            let r2 = margin_ratio(&s, MarkPrice(mark));
            prop_assert_eq!(r1, r2);
        }
    }
\`\`\`

Things to notice:

1. **The assertion is trivial for pure functions.** Two calls with identical inputs must return identical outputs. **The test catches *future* regressions** — a refactor that accidentally introduces \`HashMap\` iteration order, \`SystemTime::now\`, or float arithmetic into the margin computation would fail this proptest before it could fork a chain in production.

2. **Wide input ranges include negatives and zero.** The other two proptests carved out specific regimes; determinism holds *everywhere*, so the strategies are generous. We're not trying to test specific properties of the value; we're testing the *property of the function* (deterministic dispatch).

3. **This is the cheapest invariant to maintain and the cheapest to discover violations of.** Every pure function in the engine should have a determinism proptest. **A 5-line proptest is a guard against an entire class of consensus-fork bugs.**

### Step 9: Update \`lib.rs\`

Open \`crates/liquidation/src/lib.rs\`. Extend the compute re-export. Was:

\`\`\`rust
pub use compute::{notional_value, unrealized_pnl};
\`\`\`

Becomes:

\`\`\`rust
pub use compute::{account_equity, margin_ratio, notional_value, unrealized_pnl};
\`\`\`

Two new names, alphabetically inserted.

### Step 10: Run the tests

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

Expected output:

\`\`\`
running 16 tests
test compute::tests::equity_can_go_negative ... ok
test compute::tests::equity_collateral_plus_pnl ... ok
test compute::tests::notional_flat_is_zero ... ok
test compute::tests::notional_long ... ok
test compute::tests::notional_short_uses_abs ... ok
test compute::tests::pnl_flat_is_zero ... ok
test compute::tests::pnl_long_loss ... ok
test compute::tests::pnl_long_profit ... ok
test compute::tests::pnl_short_loss ... ok
test compute::tests::pnl_short_profit ... ok
test compute::tests::ratio_can_be_negative ... ok
test compute::tests::ratio_exactly_ten_percent ... ok
test compute::tests::ratio_flat_returns_max ... ok
test compute::tests::long_ratio_monotonic_in_mark_when_levered ... ok
test compute::tests::short_ratio_monotonic_in_mark ... ok
test compute::tests::margin_ratio_deterministic ... ok

test result: ok. 16 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

**All 16 tests pass.** The three proptests each run 256 cases by default — that's ~768 randomly-generated input combinations checked.

Common errors / surprises:

- **\`successes: 220, rejects: 36\`** in proptest output — perfectly fine. The \`prop_assume!\` filters caused some cases to be discarded. As long as successes is the bulk of cases, the proptest is doing real work.
- **Proptest takes longer than expected** — increase the timeout in \`cargo test\` flags or just be patient. 3 proptests × 256 cases × the speed of pure arithmetic is fast in practice.

## Design reflection

Three load-bearing decisions in this lesson:

1. **\`MarginRatio(i64::MAX)\` for flat positions, not \`Option\` or \`Result\`.** The "no constraint" case is the *safest* possible state. Encoding it as the max representable ratio lets every downstream classifier short-circuit naturally without special-case branching. **Encode "no information" as the safest value, not as an absence of information.**

2. **The proptest's failure is the lesson.** If the proptest had passed on the first try, the reader would have learned "margin_ratio is monotonic in mark." With the failure-and-trace step, the reader learns "**margin_ratio is monotonic in mark *in the levered regime*, and the boundary is when collateral equals notional-at-entry."** The deeper fact survives because the reader walked through the derivative themselves.

3. **\`prop_assume!\` for conditional invariants.** When an invariant holds only over a subset of inputs, the right tool is \`prop_assume!\` — not a stronger function postcondition, not a weaker assertion, not a hand-restricted strategy. **The invariant is what's true *under what condition*; encode both.**

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/src/compute.rs ./crates/liquidation/src/compute.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
\`\`\`

After L5:
- **compute.rs** now matches Stage 10a through \`margin_ratio\` + the first 13 unit tests + all 3 proptests. The next two functions (\`margin_health\` at L6, \`close_order_spec\` at L7) and their tests are still pending.
- **lib.rs** has 4 of 6 compute re-exports — \`notional_value\`, \`unrealized_pnl\`, \`account_equity\`, \`margin_ratio\`. The last two arrive in L6/L7.

## Common questions

**Q1: Why does a flat position return \`MarginRatio(i64::MAX)\` and not \`MarginRatio(0)\` or \`Option::None\`?**

\`MarginRatio(0)\` would classify the flat account as the *worst* possible margin state — which then forces every consumer of margin_ratio to special-case "but is it really zero, or is it flat?" \`Option::None\` is honest but pushes the special case to every call site. \`MarginRatio(i64::MAX)\` makes the flat case look identical to "infinitely safe" — which is what it *is* for liquidation purposes — and lets margin_health classify it as \`Safe\` without a single special-case branch. **Three options, one of them composes naturally.**

**Q2: Why is \`collateral\` allowed to push margin_ratio above 100%?**

Margin ratio is \`equity / notional\`, scaled. There's no upper bound at 100% mathematically — a position with $1,000 collateral and $100 notional has 1,000% margin ratio. Real exchanges report this as "10× collateralized." The engine doesn't care about the value of ratios above the initial-margin threshold; everything above is \`Safe\`. **The ceiling is a UI concern, not an engine concern.**

**Q3: Could we simplify \`margin_ratio\` by always computing in i128 without the flat guard?**

Division by zero in Rust panics in both debug and release for integers. The flat guard prevents that panic. Removing it would require either a \`try_div\` (which i128 doesn't have built-in) or a branchless approach (multiplying notional by a constant before the divide, with extra rounding noise). The two-line guard is the cleanest. **One conditional is cheaper than a branchless dance.**

**Q4: Why \`prop_assume!\` instead of restricting the input strategy to \`collateral in 1..(entry × size)\`?**

Two reasons. (1) Proptest strategies are independent per-parameter; expressing inter-parameter constraints requires \`(entry, size, collateral).prop_filter(...)\` or composing with \`flat_map\`, both of which are noisier than \`prop_assume!\`. (2) \`prop_assume!\` makes the precondition visible inline in the test body — a reader can see "we skip cases where collateral ≥ notional-at-entry" right next to the assertion, not buried in the input strategies. **Express preconditions where the assertion lives, not in the data generator.**

**Q5: When does the long-monotonicity invariant *not* hold, and is that a problem?**

It doesn't hold when \`collateral ≥ entry × size\` — the cash-heavy regime where the position is so over-collateralized that it can't be liquidated. In that regime, mark moves push the margin ratio around but never below maintenance, so the engine never has to act. **The cases where monotonicity fails are exactly the cases the engine doesn't care about — that's why excluding them with \`prop_assume!\` is the right move, not a workaround.**

## Next lesson (L6)

L6 adds \`margin_health\` — the function that turns a \`MarginRatio\` into one of the four \`MarginHealth\` variants by comparing against the params. Five unit tests at the boundaries (Safe / AtRisk / Liquidatable / Underwater / exact-maintenance-edge) plus a discussion of why the boundaries use strict-less-than at every threshold. The lesson is shorter than L5 — by L6 you've internalized the discipline; L6 is application.
`,
                },
                {
                  title: "Lesson 6 — margin_health — the classification cascade and boundary semantics",
                  slug: "openhl-liquidation-margin-health-en",
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 30,
                  xpReward: 60,
                  content: `# Lesson 6 — \`margin_health\` — the classification cascade and boundary semantics

## Goal

Concepts you'll grasp in this lesson:

- **Why the classification cascade checks \`Underwater\` first** — a negative margin ratio is *also* less than maintenance, so flipping the order would silently reclassify underwater accounts as Liquidatable, losing the insurance-fund signal. Check the most extreme state first; let the cascade narrow inward.
- **Strict-less-than at every boundary** — \`ratio < maintenance_bps\`, not \`≤\`. An account at *exactly* maintenance is \`AtRisk\`, not \`Liquidatable\`. The line itself belongs to the *better* state; you only fall into the worse state when you're strictly below it.
- **Type widening for the params comparisons** — \`i64::from(params.initial_margin_bps)\` upcasts u32 to i64 at the boundary, then compares two i64 values. Avoids implicit casts at each comparison site.
- **Flat-as-Safe is free, not coded** — \`margin_ratio\` returns \`MarginRatio(i64::MAX)\` for flat positions, which compares ≥ any reasonable \`initial_margin_bps\`, so \`margin_health\` returns \`Safe\` without a special-case branch. The composition handles it.

Verification:

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

…passes 21 tests (16 from L4–L5 + 5 new boundary tests).

Specific changes:

- **\`src/compute.rs\`** — appends \`margin_health\` after \`margin_ratio\` + 5 unit tests inside the existing test module.
- **\`src/lib.rs\`** — extends the compute re-export to include \`margin_health\`.

L6 is application: by now you've internalized the i128 / saturate / proptest discipline. The classification cascade is short — but the design hill (cascade order + strict-less-than) is where most bugs would hide in a careless implementation.

## Recap

After L5:
- \`compute.rs\` has \`notional_value\`, \`unrealized_pnl\`, \`account_equity\`, \`margin_ratio\`, the \`saturate_i128_to_i64\` helper, plus 13 unit tests and 3 proptests.
- The non-monotonic edge case is encoded in \`long_ratio_monotonic_in_mark_when_levered\` with \`prop_assume!\`.
- \`cargo test\` runs 16 tests, all green.

L6 maps \`MarginRatio\` values to \`MarginHealth\` variants. The function is short. The decisions are not.

## Plan

Three edits:

1. **Append \`margin_health\` to \`crates/liquidation/src/compute.rs\`** — 13 lines plus the doc comment. Sits below \`margin_ratio\` and uses it.
2. **Add 5 unit tests** in the existing test module — one per \`MarginHealth\` variant (4 tests) plus one boundary test at the exact maintenance threshold.
3. **Update \`crates/liquidation/src/lib.rs\`** — extend the \`pub use compute::{...}\` line.

> 🛑 **Predict.** Before scrolling: the cascade has to check four states (\`Underwater\`, \`Liquidatable\`, \`AtRisk\`, \`Safe\`). The conditions are: \`ratio < 0\`, \`ratio < maintenance_bps\`, \`ratio < initial_bps\`, otherwise. **What happens if you write the cascade \`Liquidatable → Underwater → AtRisk → Safe\` instead — checking Liquidatable first?**

(Answer: **Underwater accounts get classified as Liquidatable.** A ratio of \`−5_000\` is \`< maintenance_bps\` (= 200), so the Liquidatable branch fires first and the cascade never reaches the Underwater check. Result: the bridge doesn't get the insurance-fund-needed signal, the underwater deficit silently routes through the regular liquidation path, and the position closes solvently in the books even though the math says it didn't. **Cascade order is load-bearing — check the most extreme state first; each step inward narrows the remaining range.**)

## Walk-through

### Step 1: Append \`margin_health\` to \`src/compute.rs\`

Open \`crates/liquidation/src/compute.rs\`. After \`margin_ratio\`, before the \`#[cfg(test)]\` block, append:

\`\`\`rust
/// Classify margin health against the given params.
///
/// Returns one of four states in decreasing health order:
/// \`Safe → AtRisk → Liquidatable → Underwater\`. The boundaries use strict
/// inequality below the threshold (\`<\`), so an account at exactly the
/// maintenance ratio is \`AtRisk\`, not \`Liquidatable\`. This matches the
/// conventional "you start liquidating when you fall below the line"
/// reading.
#[must_use]
pub fn margin_health(
    snapshot: &AccountSnapshot,
    mark: MarkPrice,
    params: &LiquidationParams,
) -> MarginHealth {
    let ratio = margin_ratio(snapshot, mark);
    let initial_bps = i64::from(params.initial_margin_bps);
    let maintenance_bps = i64::from(params.maintenance_margin_bps);

    if ratio.0 < 0 {
        MarginHealth::Underwater
    } else if ratio.0 < maintenance_bps {
        MarginHealth::Liquidatable
    } else if ratio.0 < initial_bps {
        MarginHealth::AtRisk
    } else {
        MarginHealth::Safe
    }
}
\`\`\`

Five things to notice about this 18-line function:

1. **The cascade order checks \`Underwater\` first.** A negative ratio satisfies \`< maintenance_bps\` too — so if Liquidatable were checked first, every Underwater account would be misclassified as Liquidatable. **The invariant: each branch's condition excludes everything the previous branches caught.** Underwater (\`< 0\`) is the strictest, narrowing inward through Liquidatable (\`< maintenance\`), AtRisk (\`< initial\`), and finally Safe (the residual).

2. **\`<\`, not \`≤\`, at every threshold.** An account whose ratio equals \`maintenance_bps\` is *not* yet Liquidatable — it's AtRisk. The conventional reading: maintenance margin is the line you have to stay *above*; you cross it (strictly) before getting liquidated. The doc spells this out; the test in Step 2 enforces it. **Strict inequality means the threshold value itself belongs to the better-health state.**

3. **\`i64::from(params.initial_margin_bps)\` widens u32 → i64.** The fields are \`u32\` (saves memory, plenty of range for bps values up to ~4 billion). The ratio is \`i64\` (the type forced by signed division in \`margin_ratio\`). Comparing different integer types is a compile error in Rust; widening at the boundary keeps the comparisons clean. **One cast per param at the top; the cascade body reads as pure i64 < i64.**

4. **No special case for flat positions.** \`margin_ratio\` returns \`MarginRatio(i64::MAX)\` for a flat account. \`i64::MAX\` is far above any sane \`initial_margin_bps\`, so the cascade falls through to \`Safe\`. **The flat-as-Safe property is encoded by \`margin_ratio\`'s flat-position guard — \`margin_health\` doesn't need to know about it.** A future tweak to flat-position semantics happens in *one place* (\`margin_ratio\`), not in two synchronized branches.

5. **Function takes \`&LiquidationParams\`, not \`LiquidationParams\` by value.** Even though \`LiquidationParams\` is \`Copy\` (12 bytes), the reference signature signals "I'm reading these, not consuming them." The bridge passes the same \`params\` to every \`margin_health\` call for an entire scan; reference avoids a (technically free) move per call.

> 🛑 **Anti-fluency.** "Why three \`if\` branches instead of \`match (ratio.0, maintenance_bps, initial_bps) { ... }\`?" **Because the conditions are inequalities, not pattern matches.** Match patterns are for structural equality on values, not for range checks. Rewriting as a match with guard clauses (\`x if x < 0 => ...\`) loses readability and gains nothing — the explicit cascade reads exactly as you'd think the decision.

### Step 2: Add 5 boundary tests

Inside the existing \`#[cfg(test)] mod tests { ... }\`, after the \`margin_ratio\` unit tests (and before the \`proptest!\` block), add:

\`\`\`rust
    // ─── margin_health ─────────────────────────────────────────────

    #[test]
    fn health_safe() {
        // Ratio 1_500 bps (= 15%) with params (initial = 1_000, maintenance = 200) → Safe
        let s = snapshot(10, 100, 150);
        let p = LiquidationParams::hyperliquid_default();
        assert_eq!(margin_health(&s, MarkPrice(100), &p), MarginHealth::Safe);
    }

    #[test]
    fn health_at_risk() {
        // Ratio 500 bps with params (initial = 1_000, maintenance = 200) → AtRisk
        let s = snapshot(10, 100, 50);
        let p = LiquidationParams::hyperliquid_default();
        assert_eq!(margin_health(&s, MarkPrice(100), &p), MarginHealth::AtRisk);
    }

    #[test]
    fn health_liquidatable() {
        // Ratio 100 bps (= 1%) with params (maintenance = 200) → Liquidatable
        let s = snapshot(10, 100, 10);
        let p = LiquidationParams::hyperliquid_default();
        assert_eq!(
            margin_health(&s, MarkPrice(100), &p),
            MarginHealth::Liquidatable
        );
    }

    #[test]
    fn health_underwater() {
        // Equity goes negative (mark moved hard against long): Underwater
        let s = snapshot(10, 100, 100);
        let p = LiquidationParams::hyperliquid_default();
        assert_eq!(margin_health(&s, MarkPrice(50), &p), MarginHealth::Underwater);
    }

    #[test]
    fn health_boundary_at_maintenance() {
        // Ratio exactly == maintenance_bps → AtRisk (strict \`<\` for Liquidatable)
        let p = LiquidationParams {
            initial_margin_bps: 1_000,
            maintenance_margin_bps: 200,
            liquidation_fee_bps: 0,
        };
        // notional = 1_000, equity = 20 → ratio = 200 bps exactly
        let s = snapshot(10, 100, 20);
        assert_eq!(margin_health(&s, MarkPrice(100), &p), MarginHealth::AtRisk);
    }
\`\`\`

Four things to notice:

1. **Each test names the arithmetic that produces the test's \`MarginHealth\`.** "*Ratio 1_500 bps (= 15%)*" tells the reader (and a future-you reading a failure) exactly what range the test exercises. A test with the comment but the wrong setup is easier to spot than a bare assertion.

2. **Four tests for the four variants, one for the boundary.** Each cascade branch gets a positive test; \`health_boundary_at_maintenance\` proves the strict-less-than convention. Without that fifth test, a future refactor that flipped \`<\` to \`≤\` would pass the other four but silently change behavior at the exact threshold — which is the most common margin level for production positions (accounts get *to* maintenance before they get *below*).

3. **\`health_boundary_at_maintenance\` constructs its own params, not \`hyperliquid_default()\`.** The hyperliquid default has \`liquidation_fee_bps = 150\`, irrelevant to this test, and the explicit struct construction documents which fields the test *actually* depends on. Other tests use the default because the fee field isn't load-bearing for them.

4. **\`MarginHealth::Underwater\` is exercised via the L5 underwater case** (\`mark = 50\` against a long position with thin collateral). Same setup as \`ratio_can_be_negative\` from L5 — the negative-ratio test proved the math; the variant test proves the classification.

### Step 3: Update \`src/lib.rs\`

Open \`crates/liquidation/src/lib.rs\`. Extend the compute re-export. Was:

\`\`\`rust
pub use compute::{account_equity, margin_ratio, notional_value, unrealized_pnl};
\`\`\`

Becomes:

\`\`\`rust
pub use compute::{
    account_equity, margin_health, margin_ratio, notional_value, unrealized_pnl,
};
\`\`\`

One new name — \`margin_health\` — alphabetically inserted between \`account_equity\` and \`margin_ratio\`. The line now wraps once it crosses ~5 items.

### Step 4: Run the tests

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

Expected output:

\`\`\`
running 21 tests
test compute::tests::equity_can_go_negative ... ok
test compute::tests::equity_collateral_plus_pnl ... ok
test compute::tests::health_at_risk ... ok
test compute::tests::health_boundary_at_maintenance ... ok
test compute::tests::health_liquidatable ... ok
test compute::tests::health_safe ... ok
test compute::tests::health_underwater ... ok
test compute::tests::notional_flat_is_zero ... ok
test compute::tests::notional_long ... ok
test compute::tests::notional_short_uses_abs ... ok
test compute::tests::pnl_flat_is_zero ... ok
test compute::tests::pnl_long_loss ... ok
test compute::tests::pnl_long_profit ... ok
test compute::tests::pnl_short_loss ... ok
test compute::tests::pnl_short_profit ... ok
test compute::tests::ratio_can_be_negative ... ok
test compute::tests::ratio_exactly_ten_percent ... ok
test compute::tests::ratio_flat_returns_max ... ok
test compute::tests::long_ratio_monotonic_in_mark_when_levered ... ok
test compute::tests::margin_ratio_deterministic ... ok
test compute::tests::short_ratio_monotonic_in_mark ... ok

test result: ok. 21 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

Common errors:

- **\`health_boundary_at_maintenance\` fails with \`Liquidatable\` instead of \`AtRisk\`** — you accidentally used \`≤\` instead of \`<\` somewhere in the cascade. The boundary test exists to catch exactly this.
- **\`health_underwater\` fails with \`Liquidatable\`** — you put the \`Underwater\` check *after* the \`Liquidatable\` check. Reorder; the most extreme state goes first.

## Design reflection

Three load-bearing decisions in this lesson:

1. **Cascade order: check the most extreme state first.** \`Underwater\` before \`Liquidatable\` before \`AtRisk\` before \`Safe\`. The narrowing direction means each branch's condition excludes everything earlier branches caught; reversing the order silently routes severe cases through milder branches. **When cascade conditions overlap, sort from strictest to loosest.**

2. **Strict-less-than at thresholds: the line belongs to the better state.** An account exactly at maintenance is \`AtRisk\`, not \`Liquidatable\`. This is a convention call — production exchanges differ — but consistency *within* a system matters more than which side the threshold belongs to. **Pick a convention, name it in the doc, enforce it with a boundary test.**

3. **No special case for flat positions in \`margin_health\`.** Composition with \`margin_ratio\` (which returns \`i64::MAX\` for flat) makes the property fall out for free. Adding \`if snapshot.position_size.0 == 0 { return Safe; }\` would duplicate the flat-position behavior in two places — and would drift the moment one of them changed. **Encode invariants in one place; let downstream functions inherit them by composition.**

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/src/compute.rs ./crates/liquidation/src/compute.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
\`\`\`

After L6:
- **compute.rs** matches Stage 10a through \`margin_health\` + 18 unit tests + 3 proptests. The last function (\`close_order_spec\`) and its 3 tests are L7.
- **lib.rs** has 5 of 6 compute re-exports. The final one (\`close_order_spec\`) lands in L7.

## Common questions

**Q1: Why not return \`Result<MarginHealth, ...>\` for cases like a misconfigured params (maintenance ≥ initial)?**

The function is total — every input produces a defined output. A misconfigured params (maintenance == initial, or maintenance > initial) still classifies every account into one of the four variants, just with the wrong semantics. Returning \`Result\` would force every call site to handle a \`MisconfiguredParams\` error that *never arises from a bridge that constructed params validly*. **Total functions are easier to compose; validate params at the loading boundary, then trust them everywhere downstream.**

**Q2: Could \`margin_health\` use a sorted-thresholds array and binary-search to be more "data-driven"?**

With four states the explicit cascade is clearer and faster. Binary search wins when the number of thresholds grows past ~10 — at that point you'd refactor. Premature generalization here adds machinery the engine doesn't need. **Optimize for the cardinality you have, not the cardinality you might have someday.**

**Q3: What happens if \`maintenance_bps > initial_bps\` (misconfigured)?**

The cascade still produces a defined classification: at \`ratio >= maintenance_bps\`, the next branch is \`ratio < initial_bps\` (which is false, since maintenance > initial means ratio also ≥ initial), so we fall through to \`Safe\`. At \`ratio ∈ [0, maintenance_bps)\`, we land on \`Liquidatable\`. AtRisk becomes unreachable. **Misconfigured params produce a coherent but unintended classification scheme; the validation belongs at param construction, not in the classifier.**

**Q4: Why doesn't \`margin_health\` cache the i64 conversions of params?**

Because callers typically invoke \`margin_health\` once per account in a per-block sweep, and the bridge passes the same \`&LiquidationParams\` to every call. The two \`i64::from(u32)\` casts are zero-cost — the compiler emits a \`mov\` instruction at most. **Cache only when you've measured the cost; don't reach for it as a reflex.**

**Q5: Could the cascade use \`match\` with range patterns (\`0..maintenance_bps => Liquidatable\`)?**

Rust's \`match\` does support exclusive-range patterns (since 1.26), so syntactically yes. But the patterns would be \`i64::MIN..0\`, \`0..maintenance_bps\`, \`maintenance_bps..initial_bps\`, \`initial_bps..=i64::MAX\`. The need for *named* boundaries (referring to variables, not literals) means each pattern requires a guard clause anyway. The if/else cascade reads cleaner here. **Use \`match\` for structural cases; use \`if/else\` for inequality cascades on the same value.**

## Next lesson (L7)

L7 closes Stage 10a with \`close_order_spec\` — the function that turns a snapshot into the \`CloseOrderSpec\` the bridge consumes. Three unit tests for long-closes-with-Sell, short-closes-with-Buy, and the flat-position edge case (qty = 0). Shorter than L6 — by L7 you have the full compute module behind you, and the lesson is mostly the bridge between L4's \`unsigned_abs\` discipline and the engine's outward-facing interface.
`,
                },
                {
                  title: "Lesson 7 — close_order_spec — Stage 10a's last function",
                  slug: "openhl-liquidation-close-order-spec-en",
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 20,
                  xpReward: 40,
                  content: `# Lesson 7 — \`close_order_spec\` — Stage 10a's last function

## Goal

Concepts you'll grasp in this lesson:

- **The elementary close-the-position rule** — long is closed by *selling*, short is closed by *buying*. Side is always the opposite of the position direction; the engine doesn't decide a side, it inverts one.
- **\`unsigned_abs\` at the public boundary** — the discipline from L4 (use \`unsigned_abs\` over \`abs\` for \`i64\`) shows up at the function that talks to the bridge. The output \`Qty(u64)\` is the type the CLOB matching engine expects; the engine pushes the sign-conversion to its own boundary.
- **Why \`close_order_spec\` doesn't filter flat positions** — a flat position generates a spec with \`qty == 0\`. The bridge filters before submitting. Keeping \`close_order_spec\` total and side-effect-free makes it composable with the Stage 10c multi-account scanner.
- **Single-responsibility scoping** — \`close_order_spec\` doesn't take \`MarkPrice\` (market orders carry no price) or \`LiquidationParams\` (the decision-to-liquidate happens in \`margin_health\`). One snapshot in, one spec out.

Verification:

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

…passes 24 tests (21 from L4–L6 + 3 new tests for the three close-side cases). **Stage 10a is now byte-for-byte complete against \`22eedf9\`.**

Specific changes:

- **\`src/compute.rs\`** — appends \`close_order_spec\` after \`margin_health\` + 3 unit tests inside the existing test module.
- **\`src/lib.rs\`** — extends the compute re-export to include \`close_order_spec\`.

L7 is the shortest lesson in Stage 10a. The function itself is 11 lines; the lesson exists to lock in the side-inversion rule and to mark the completion of the pure-compute module.

## Recap

After L6:
- \`compute.rs\` has \`notional_value\`, \`unrealized_pnl\`, \`account_equity\`, \`margin_ratio\`, \`margin_health\`, plus the \`saturate_i128_to_i64\` helper and 18 unit tests + 3 proptests.
- \`lib.rs\` re-exports 5 of 6 compute functions (everything except \`close_order_spec\`).
- \`cargo test\` runs 21 tests, all green.

L7 closes Stage 10a. After this lesson, the answer-key diff against \`22eedf9\` is fully clean for both \`compute.rs\` and \`lib.rs\`.

## Plan

Three edits:

1. **Append \`close_order_spec\` to \`crates/liquidation/src/compute.rs\`** — 11 lines plus the doc comment.
2. **Add 3 unit tests** in the existing test module — long-closes-with-Sell, short-closes-with-Buy, flat-position-has-zero-qty.
3. **Update \`crates/liquidation/src/lib.rs\`** — extend the compute re-export.

> 🛑 **Predict.** Before scrolling: a long position with \`position_size = 10\` needs to be force-closed. **What \`Side\` does the engine emit, and what \`Qty\`?** Then: a short with \`position_size = −10\` — same questions.

(Answer: **Long: \`Side::Sell\`, \`Qty(10)\`. Short: \`Side::Buy\`, \`Qty(10)\`.** Long is closed by selling: the trader holds 10 units long, so they need to sell 10 to flatten. Short is closed by buying: the trader has 10 units short, so they need to buy 10 to flatten. Quantity is always the magnitude of the position; the sign lives in the side, not in qty. **\`Qty\` is \`u64\` precisely because magnitude is sign-free.**)

## Walk-through

### Step 1: Append \`close_order_spec\` to \`src/compute.rs\`

Open \`crates/liquidation/src/compute.rs\`. After \`margin_health\`, before the \`#[cfg(test)]\` block, append:

\`\`\`rust
/// Generate the close-order spec for a liquidatable position.
///
/// Side is the opposite of the position direction (long → SELL, short →
/// BUY), quantity is the absolute position size. Always a market order
/// at the bridge layer — liquidation accepts any available price.
///
/// Flat positions produce a spec with \`qty == 0\`; callers should filter
/// these out before submitting, since the CLOB will reject a zero-qty
/// order. We don't filter here because liquidation engines typically scan
/// many accounts and a side-effect-free \`close_order_spec\` is easier to
/// compose.
#[must_use]
pub fn close_order_spec(snapshot: &AccountSnapshot) -> CloseOrderSpec {
    let abs_size = snapshot.position_size.0.unsigned_abs();
    let side = if snapshot.position_size.0 > 0 {
        Side::Sell
    } else {
        Side::Buy
    };
    CloseOrderSpec {
        account: snapshot.account,
        side,
        qty: Qty(abs_size),
    }
}
\`\`\`

Five things to notice about this 11-line function:

1. **Side is *always the opposite* of position direction.** The trader holds \`size\` units (positive = long, negative = short). To close, the engine submits an order on the other side: a long unwinds by selling, a short unwinds by buying. **The matching engine doesn't care about the close's *intent*; it only sees an order on a side. The "opposite side" rule is the entire bridge between position direction and order side.**

2. **\`unsigned_abs()\` returns the magnitude as \`u64\`.** Same L4 discipline applied to the public boundary. \`Qty\` wraps a \`u64\`, so the magnitude flows directly into \`Qty(abs_size)\` without an intermediate \`as u64\` cast. **The function does sign conversion exactly once, at the boundary where signed position-size meets unsigned order-quantity.**

3. **\`if snapshot.position_size.0 > 0\` — strict greater-than.** A flat position (\`size == 0\`) falls into the \`else\` branch and gets \`Side::Buy\`. That's harmless because qty will also be 0 — the spec exists but it's meaningless. **We don't special-case the flat path inside the function**; the bridge filters specs with \`qty == 0\` before submitting.

4. **No \`mark\`, no \`params\`.** \`close_order_spec\` only needs the snapshot. The "decision to close" lives in \`margin_health\`; the price discovery happens at the matching engine. **Each function owns exactly one concern. The bridge composes them: scan → classify → generate close spec → submit.**

5. **Returns \`CloseOrderSpec\` by value, not \`Option<CloseOrderSpec>\`.** The function is total — it always returns a spec, even for flat positions (with \`qty == 0\`). The alternative — \`Option\` — would force the caller to handle \`None\` for every flat account in a scan, even though those accounts are already pre-filtered by the time we reach the close step. **Total functions compose; optional functions force every caller to handle the empty case.**

> 🛑 **Anti-fluency.** "Why not \`if size >= 0 { Sell } else { Buy }\` — wouldn't that handle flat as Sell, which is what some test exchanges do?" **Three problems.** (1) Flat-as-Sell is a behavior choice that belongs at the bridge, not in pure compute. (2) The current \`> 0\` correctly reflects that flat positions are neither longs nor shorts. (3) Production semantics for \`qty == 0 + Side::Sell\` are undefined at the matching engine; the bridge has to filter regardless. **Pick the convention that produces the cleanest contract for callers, not the one that hides edge cases.**

### Step 2: Add 3 unit tests

Inside the existing \`#[cfg(test)] mod tests { ... }\`, after the \`margin_health\` tests, add:

\`\`\`rust
    // ─── close_order_spec ──────────────────────────────────────────

    #[test]
    fn close_long_with_sell() {
        let s = snapshot(10, 100, 0);
        let order = close_order_spec(&s);
        assert_eq!(order.side, Side::Sell);
        assert_eq!(order.qty, Qty(10));
        assert_eq!(order.account, AccountId(42));
    }

    #[test]
    fn close_short_with_buy() {
        let s = snapshot(-10, 100, 0);
        let order = close_order_spec(&s);
        assert_eq!(order.side, Side::Buy);
        assert_eq!(order.qty, Qty(10));
    }

    #[test]
    fn close_flat_has_zero_qty() {
        // Flat position generates a zero-qty spec; callers must filter.
        let s = snapshot(0, 100, 1_000);
        let order = close_order_spec(&s);
        assert_eq!(order.qty, Qty(0));
    }
\`\`\`

Things to notice:

1. **\`close_long_with_sell\` asserts all three output fields.** Side, qty, and account — every output field gets locked in. The bridge depends on all three; testing all three protects against a partial refactor that fixes one and breaks another. **For output-type tests, assert every field the caller will read.**

2. **\`close_short_with_buy\` skips the account assertion.** The account field comes from the same input source as \`close_long_with_sell\`; if it worked for long, it works for short. **Cover the orthogonal axes once; don't repeat what previous tests already locked in.**

3. **\`close_flat_has_zero_qty\` exists *despite* the function not filtering the flat case.** The test documents the contract: "we promise that flat positions produce zero-qty specs, callers must filter." If a future refactor accidentally added a filter inside \`close_order_spec\` (returning \`Default::default()\` or panicking on flat), this test would fail. **Tests preserve documented contracts, including ones that say "we don't do this; the caller does."**

### Step 3: Update \`src/lib.rs\`

Open \`crates/liquidation/src/lib.rs\`. Extend the compute re-export. Was:

\`\`\`rust
pub use compute::{
    account_equity, margin_health, margin_ratio, notional_value, unrealized_pnl,
};
\`\`\`

Becomes:

\`\`\`rust
pub use compute::{
    account_equity, close_order_spec, margin_health, margin_ratio, notional_value, unrealized_pnl,
};
\`\`\`

One new name — \`close_order_spec\` — alphabetically inserted after \`account_equity\`. All six compute functions are now re-exported.

### Step 4: Run the tests

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

Expected output:

\`\`\`
running 24 tests
test compute::tests::close_flat_has_zero_qty ... ok
test compute::tests::close_long_with_sell ... ok
test compute::tests::close_short_with_buy ... ok
test compute::tests::equity_can_go_negative ... ok
test compute::tests::equity_collateral_plus_pnl ... ok
test compute::tests::health_at_risk ... ok
test compute::tests::health_boundary_at_maintenance ... ok
test compute::tests::health_liquidatable ... ok
test compute::tests::health_safe ... ok
test compute::tests::health_underwater ... ok
test compute::tests::notional_flat_is_zero ... ok
test compute::tests::notional_long ... ok
test compute::tests::notional_short_uses_abs ... ok
test compute::tests::pnl_flat_is_zero ... ok
test compute::tests::pnl_long_loss ... ok
test compute::tests::pnl_long_profit ... ok
test compute::tests::pnl_short_loss ... ok
test compute::tests::pnl_short_profit ... ok
test compute::tests::ratio_can_be_negative ... ok
test compute::tests::ratio_exactly_ten_percent ... ok
test compute::tests::ratio_flat_returns_max ... ok
test compute::tests::long_ratio_monotonic_in_mark_when_levered ... ok
test compute::tests::margin_ratio_deterministic ... ok
test compute::tests::short_ratio_monotonic_in_mark ... ok

test result: ok. 24 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

**24 tests passing. Stage 10a content is complete.** The liquidation crate's pure-compute module — margin math + classification + close-order generation — is now in your workspace and the answer-key diff against \`22eedf9\` is fully clean.

Common errors:

- **\`close_short_with_buy\` fails with \`Side::Sell\`** — you accidentally wrote \`if snapshot.position_size.0 >= 0\`. Flat positions don't matter here, but using \`>=\` makes shorts of \`0\` (which don't exist) flip to Sell — and the test for \`size = -10\` would still see \`size > 0\` as false. Re-check the direction.
- **\`close_flat_has_zero_qty\` fails because the function panics** — you might have added \`.abs()\` instead of \`.unsigned_abs()\`. \`i64(0).abs()\` is fine, but if you wrote \`i64(-10).abs() as u64\` you'd risk the i64::MIN footgun from L4. Stick with \`unsigned_abs\`.

## Design reflection

Three load-bearing decisions in this lesson:

1. **Side is the opposite of position direction — no other case.** Long → Sell, Short → Buy. The function doesn't need a third case for "ambiguous" or a fallback for "unknown." The position has a sign or it's flat; the spec inverts the sign or carries zero. **Elementary inversion is the right shape for "close this position."**

2. **\`close_order_spec\` is side-effect-free even for flat positions.** Returning a zero-qty spec instead of filtering inside the function keeps \`close_order_spec\` total and easy to compose. The Stage 10c scanner can \`for snapshot in snapshots { specs.push(close_order_spec(snapshot)); }\` without branching; the bridge filters at submit time. **Pure functions return; impure boundary layers filter.**

3. **The function takes no \`mark\`, no \`params\`.** Each compute function owns exactly one concern: \`margin_health\` decides *whether* to close; \`close_order_spec\` decides *how*. Mixing them — e.g., taking \`params\` to apply the liquidation fee to qty — would couple two responsibilities. The fee belongs to Stage 10b (insurance fund), where collateral and fee math live together. **Single responsibility makes the bridge's composition path obvious.**

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/src/compute.rs ./crates/liquidation/src/compute.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
\`\`\`

After L7:
- **compute.rs** matches Stage 10a's \`compute.rs\` **byte-for-byte**.
- **lib.rs** matches Stage 10a's \`lib.rs\` **byte-for-byte**.
- **Cargo.toml** has matched since L1.

The full Stage 10a crate is now in your workspace.

## Common questions

**Q1: Should \`close_order_spec\` return \`Option<CloseOrderSpec>\` for flat positions?**

Could, but adds friction. Every caller that doesn't care about the flat case (most of them) would need to \`.expect("non-flat position")\` or \`if let Some(spec) = ...\`. Returning a total \`CloseOrderSpec\` with \`qty == 0\` and pushing the filter to the bridge is cheaper for the common case. **The \`Option\` discipline is great when the empty case is the *most common* and you want callers forced to handle it; here it's the rare case and forcing handling is overhead.**

**Q2: Why \`size > 0\` (strict) and not \`size >= 0\` (non-strict) for the \`Side::Sell\` branch?**

Because flat (\`size == 0\`) is *neither* long *nor* short — it's outside the long/short dichotomy. The convention "flat is a long" or "flat is a short" is both arbitrary; we picked the convention where flat falls into the \`else\` branch silently and qty is 0 anyway. Either choice works; the discipline is **be consistent and document the choice**. The doc says "flat → qty 0, callers filter," which is what readers can verify against the code.

**Q3: Could \`close_order_spec\` be a method on \`AccountSnapshot\` (\`snapshot.close_order_spec()\`)?**

Syntactically yes — \`impl AccountSnapshot { pub fn close_order_spec(&self) -> CloseOrderSpec { ... } }\`. We don't do it because the \`close_order_spec\` function lives in \`compute.rs\` alongside the other margin-math functions; co-locating with the related code beats co-locating with the receiver type. **\`AccountSnapshot\` is a data carrier (in \`types.rs\`); compute lives in \`compute.rs\`. The free-function form keeps that separation.**

**Q4: What if \`position_size = i64::MIN\`? Does \`unsigned_abs\` handle it?**

Yes, by design. \`i64::MIN.unsigned_abs() == 9_223_372_036_854_775_808u64\` (\`u64::MAX / 2 + 1\`). The signed \`i64::MIN.abs()\` would overflow (it has no positive counterpart in i64); \`unsigned_abs\` returns the magnitude as \`u64\`, which always has room. **This is exactly the L4 discipline: \`unsigned_abs\` for magnitudes, \`abs\` only when you're sure the value isn't \`MIN\`.**

**Q5: Why does the test fixture's \`snapshot\` function take \`(size, entry, collateral)\` rather than \`(size, entry, mark, collateral)\` — the function under test takes a snapshot and we typically also need a mark?**

\`close_order_spec\` takes only the snapshot — no mark. The shared \`snapshot\` fixture from L4 takes the snapshot's three meaningful fields (account is hardcoded) and doesn't carry mark. Mark gets passed as a separate \`MarkPrice(...)\` argument to the function under test. **The fixture builds what the *type* needs; the test supplies what the *call* needs.**

## Next lesson (L8) — Stage 10b begins

L8 starts Stage 10b — the insurance fund. The pure-compute module you finished in L7 is the *what should happen* layer. Stage 10b adds *the bookkeeping that records what happened* — the \`InsuranceFund\` state machine that tracks the fund's balance, absorbs deficits from underwater liquidations, and credits liquidation fees from solvent closes. After Stage 10b, the engine knows not just "this account is Liquidatable" but "this close credited 1.5% to the fund" or "this close drained $400 from the fund."

**Stage 10b is not yet shipped in openhl** as of this lesson's draft — L8 lands in rethlab when the openhl-side implementation does.
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
