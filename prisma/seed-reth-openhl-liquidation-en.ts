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
        "Build the perpetual-position liquidation engine end-to-end: the pure-compute layer that classifies accounts (Safe / AtRisk / Liquidatable / Underwater) from margin ratios and generates close-order specs, the insurance-fund state machine that absorbs deficits via a three-variant outcome enum (Covered / PartiallyDrained / Depleted), and the multi-account scanner that ties them into a single orchestration loop the bridge calls once per block. Includes the leveraged-regime non-monotonicity discovery, three layers of conservation-law proptests that compose vertically, the credit/debit decomposition that bridges pure compute and stateful book-keeping, and the discriminated-dispatch pattern via debug_assert! pairs. 14 lessons (L0–L13) across 5 modules, byte-for-byte against openhl's full Stage 10 trilogy (margin math + insurance fund + scanner). The fifth course in the DIY Perp series.",
      difficulty: "EXPERT",
      duration: 440,
      xpReward: 870,
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
- Why the insurance fund is **a pure state machine (with its own transition rules — \`deposit\` / \`withdraw\` / \`absorb_deficit\` invariants), not just a plain \`u64\` balance entry**.
- How auto-deleveraging (ADL) lives at the edge of this design — and why we leave it out of Stage 10.

## Why liquidations matter (1-paragraph perp recap)

Perpetual contracts are levered positions. A trader deposits \`collateral\` (USDC) and opens a position of \`size\` (signed: positive = long, negative = short) at an \`entry\` price. The position's *unrealized PnL* moves with the mark price: a long profits when mark > entry, loses when mark < entry. When the loss eats into collateral far enough that \`equity / notional\` drops below the **maintenance margin** requirement, the account can no longer cover its losses — the engine force-closes the position at market (opposite side, full size), debits a **liquidation fee** to the insurance fund, and (if equity remained positive) returns the remainder to the account. If equity went *negative* before the close — the "underwater" case — the insurance fund absorbs the deficit. That's the entire mechanism.

## Why an L1 perp DEX runs liquidations in consensus

Some derivatives venues outsource liquidations to off-chain liquidator processes — bots that scan account state and call a \`liquidate(account)\` endpoint when they find a target. This works for low-frequency settlement systems (think credit default swaps) but breaks at perp speed: a 50× levered HYPE position can flip from healthy to underwater in seconds during a news cascade, and any RPC-round-trip delay between detection and close is loss the chain absorbs.

Hyperliquid runs liquidations **in consensus**. Every validator, every block, computes which accounts are below maintenance — independently, from the same data, with the same code. The engine's output (close orders + insurance-fund movements) becomes part of the block. **That's the only way the chain stays solvent in adversarial market moves.**

The price you pay for this guarantee is the determinism discipline: float arithmetic is forbidden, every classification must be byte-identical across validators, every overflow must saturate rather than panic. The funding course (\`openhl-funding\`) was your first deep encounter with this discipline; this course is the second.

## Why liquidations can't use floats

Same answer as funding: consensus determinism. A validator that classifies an account as \`Liquidatable\` while a peer validator classifies the same account as \`AtRisk\` will produce a different block — different close orders, different fees, different insurance-fund deltas. Block proposals diverge, the chain forks.

The fix: signed integers + **saturating arithmetic (operations that, on overflow, neither panic nor wrap but clamp to the type boundary — \`i64::MAX\` / \`i64::MIN\` — via Rust's \`saturating_add\` / \`saturating_mul\` etc.)** + i128 intermediate products for any multiplication that can overflow i64. We use \`MARGIN_SCALE = 10_000\` (basis points) as the fixed-point unit for \`MarginRatio\`. Bps is the conventional unit for margin in TradFi *and* in crypto perp venues — Hyperliquid, Binance, Drift all express margin requirements in bps. \`MarginRatio(1_000)\` is exactly 10%; \`MarginRatio(MARGIN_SCALE)\` is exactly 100%.

(Funding used \`RATE_SCALE = 1_000_000_000\` because it needed parts-per-billion precision for tiny per-interval rates. Liquidation needs less precision but the same discipline.)

## The 14 lessons

### Module 0 — Orientation
- **L0** (this lesson) — Why liquidations, why margin model, three-sub-stage roadmap.

### Module 1 — Types (L1-L3)
- **L1** — \`MARGIN_SCALE = 1e4\` (bps) + \`LiquidationParams\` + \`hyperliquid_default()\` (10% / 2% / 1.5%). Why bps, why these defaults.
- **L2** — \`MarginRatio\` newtype + \`MarginHealth\` enum (\`Safe\` / \`AtRisk\` / \`Liquidatable\` / \`Underwater\`). Why four states, what each authorizes.
- **L3** — \`AccountSnapshot\` + \`CloseOrderSpec\`. Why a new snapshot type (not \`funding::Position\`) — **separating the read-only, immutable snapshot type keeps the risk-calculation core decoupled from whatever mutable state shape the upstream layers (bridge / clearing) carry** — and how the bridge layer assembles it.

### Module 2 — Pure compute (L4-L7) — Stage 10a
- **L4** — \`notional_value\` + \`unrealized_pnl\`. The signed-multiplication trick that gets the sign right for both longs and shorts.
- **L5** — \`account_equity\` + \`margin_ratio\`. The proptest that uncovers the **non-monotonic edge case (= the surprising regime where the price seems to move favorably, yet under certain conditions the margin ratio appears to *worsen* in the opposite direction)** when collateral dominates notional, and why \`prop_assume!\` is the right fix.
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

Laying \`RATE_SCALE\` and \`MARGIN_SCALE\` side by side makes it obvious why each one is "just right" for its own domain:

\`\`\`
                       Course 9 (funding)              Course 10 (liquidation)
                       ─────────────────────           ────────────────────────
Scale constant         RATE_SCALE = 1_000_000_000      MARGIN_SCALE = 10_000
                       (parts-per-billion, 10⁹)        (basis points, 10⁴)
Precision              9 decimal digits                4 decimal digits
Typical range          0.0001% — 4% / interval         2% — 10% (maintenance)
                                                       10% — 50% (initial)
Smallest meaningful    0.0001% (= 10 ppb)              1 bp = 0.01%
step in production
Raw value for 1.0      1_000_000_000                   10_000
Raw value for 4%       40_000_000                      400
                       ↑ ppb: 1 step = 0.0000001%       ↑ bps: 1 step = 0.01%
                       For a world where traders         For a world where operators
                       feel sub-basis-point diffs        run with whole-bps boundaries
\`\`\`

The discipline: **pick the resolution that matches the domain's conventional unit.** Funding lives in per-billion sub-bp deltas, margin lives in whole-bp operator settings. The two scales don't need to match because the two domains are independent; if they did match, you'd waste i64 headroom on precision the system never uses.

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

5. **\`#[must_use]\` on the constructor and getters.** Constructed-but-dropped \`LiquidationParams\` is almost certainly a bug — you computed the defaults and threw them away. Same logic for accessor: reading \`initial_margin_bps()\` and ignoring the result is almost always wrong. \`#[must_use]\` makes the compiler ask the reader to confirm. **This isn't just a hint — it's a defensive-programming technique that **promotes logic bugs that human reviewers typically miss** (discarded return values) into compiler warnings — or, with \`#![deny(unused_must_use)]\`, into outright compile errors.** The discipline behind it is **"drive the compiler as far as it'll go as a static-analysis tool, so review cost trends toward zero"** — a Rust-native pattern worth internalizing.

> 🛑 **Anti-fluency.** "Why three separate \`u32\` fields instead of one \`LiquidationParams\` newtype wrapping a \`(u32, u32, u32)\` tuple?" **Because the three values mean different things.** Tuple ordering is positional and fragile — a refactor that swaps \`initial\` and \`maintenance\` produces a silent semantic bug. Named fields force the call site to be explicit: \`LiquidationParams { initial_margin_bps: 1000, ... }\`. **Named fields cost nothing at runtime and buy overwhelming safety; positional tuples sacrifice safety and earn nothing at runtime.**

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

\`margin_ratio = equity * MARGIN_SCALE / notional\`. With \`MARGIN_SCALE = 10_000\` and \`equity\` and \`notional\` bounded by \`i64::MAX\`, the product \`equity * MARGIN_SCALE\` can overflow i64 when \`equity > i64::MAX / 10_000 ≈ 9.2e14\`. At realistic exchange scales that's $920 trillion of equity — far above plausible inputs, but L5 still does the multiplication in \`i128\` and saturates back. **The discipline is the same as funding: any product that *can* exceed i64 *will* exceed i64 at some adversarial input — assume that as the default.**

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

Laying the four variants × the three actions they authorize into one matrix makes it immediately clear why four is the right number, and how each variant carries a "downstream decision" at the type level:

\`\`\`
                    │ (a) Open new       │ (b) Force-close   │ (c) Does closing    │
                    │     positions?      │     the position?  │     alone cover the │
                    │                    │                   │     deficit?        │
   ─────────────────┼────────────────────┼───────────────────┼─────────────────────┤
   Safe              │ ✅ yes              │ ❌ no              │ N/A (no close)      │
   AtRisk            │ ❌ no               │ ❌ no              │ N/A (no close)      │
   Liquidatable      │ ❌ no               │ ✅ yes             │ ✅ yes (equity left) │
   Underwater        │ ❌ no               │ ✅ yes             │ ❌ no → insurance    │
                    │                    │                   │   fund absorbs      │
   ─────────────────┴────────────────────┴───────────────────┴─────────────────────┘

Downstream engine behavior (implemented in L7 / Module 3):
   Safe         ─► trader keeps operating
   AtRisk       ─► warn in UI, refuse new positions, let trader close voluntarily
   Liquidatable ─► emit auto close order, deduct fee, return remaining equity
   Underwater   ─► emit auto close order, draw the deficit from the insurance fund
\`\`\`

The point: **each variant maps directly to its own set of authorized actions.** Collapse \`Liquidatable\` and \`Underwater\` together and the "should we call the insurance fund?" signal disappears from the type — the engine then has to recompute equity to decide. Add more variants and no row produces a new column either (= these four are the minimal unique set of action profiles). **"A state machine has exactly as many variants as the distinct downstream actions it triggers"** — that's the principle this design embodies.

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

1. **\`MarginRatio(pub i64)\` is a newtype.** Not a \`type MarginRatio = i64\` alias. The newtype gives the type checker a handle: a function that takes \`MarginRatio\` cannot be accidentally called with a raw \`i64\` value that's actually a balance, an account ID, or a \`MarkPrice\`. The \`pub i64\` field means callers can construct one with \`MarginRatio(1000)\` and read it with \`ratio.0\` — **the type can't hold an invalid state in the first place (i.e., no \`i64\` value would be malformed), so there's no encapsulation invariant to defend, and we keep it as a transparent data container instead of hiding behind getters/setters.** The "wrap a \`Vec\` inside \`MyVec\` to re-expose \`len()\`" pattern is a cost paid to defend an invariant; don't pay it where no invariant exists.

2. **\`MarginRatio\` derives a lot of traits — \`Default\`, \`PartialOrd\`, \`Ord\`, \`Hash\`.** The defaults aren't required by the engine, but they let downstream code (telemetry, sorted-by-worst-health scanners in Stage 10c, dashboards) use \`MarginRatio\` like any other comparable value type. \`MarginRatio::default()\` is \`MarginRatio(0)\` — 0 bps, semantically "no ratio computed" or "freshly zeroed." The engine itself never reads \`default()\`; it always computes from a snapshot.

3. **\`MarginHealth\` does NOT derive \`PartialOrd\` / \`Ord\`.** Even though the variants naturally order (Safe < AtRisk < Liquidatable < Underwater in worsening direction), ordered comparisons on enums read as code-smell. \`if health > MarginHealth::AtRisk\` is less clear than \`if matches!(health, MarginHealth::Liquidatable | MarginHealth::Underwater)\`. The compiler enforces the explicit pattern; future maintainers see exactly which variants the branch covers. **Sloppy ordered comparisons on enums are a typical breeding ground for bugs (a code smell) — reach for \`matches!\` and explicit pattern matching first as a matter of discipline.** When you really do need an order (sorting by severity in telemetry, for example), grow an explicit \`severity_rank()\` method instead — that surfaces intent.

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

Drawing what the \`types\` module — completed in L3 — receives as input and produces as output makes the joint between Module 1 (types) and Module 2 (pure compute) immediately legible:

\`\`\`
                    [ Upstream: bridge / clearing layer (the ledger owner) ]
                              │
                              │ builds a snapshot per account, per tick,
                              │ pulled from its own ledger
                              ▼
   ┌────────────────────────────────────────────────────────────────────┐
   │ Input: AccountSnapshot { account, position_size, avg_entry,         │
   │                          collateral }                               │
   │   ※ Immutable, read-only, Copy. Finalized in L3.                    │
   └────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
   ┌────────────────────────────────────────────────────────────────────┐
   │ ★ The liquidation engine (everything Module 2-4 builds)             │
   │                                                                     │
   │   L4: notional_value / unrealized_pnl   (pure compute)               │
   │   L5: account_equity / margin_ratio     (pure compute)               │
   │   L6: margin_health                      (classification: 4-state)   │
   │   L7: close_order_spec                   (Liquidatable / Underwater) │
   │   ↑↑ The constants and types from L1-L2 (MARGIN_SCALE,              │
   │      LiquidationParams, MarginRatio, MarginHealth) flow through      │
   │      every layer.                                                    │
   └────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
   ┌────────────────────────────────────────────────────────────────────┐
   │ Output: CloseOrderSpec { account, side, qty }                       │
   │   ※ No price (market order). Only emitted for Liquidatable /        │
   │     Underwater accounts. Finalized in L3.                            │
   │   Module 3-4 emits InsuranceFundDelta alongside.                     │
   └────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    [ Downstream: bridge → matching engine (CLOB) ]
                              - convert close orders into \`SubmitMarket\` actions
                              - credit/debit the insurance fund on Underwater paths
\`\`\`

Two things this picture pins down: (a) **The two types finalized in L3 — \`AccountSnapshot\` (input) and \`CloseOrderSpec\` (output) — are the engine's only contact surface with the outside world.** All the engine body lives in L4 onward, but every function signature lands on "consume an \`AccountSnapshot\`" or "emit a \`CloseOrderSpec\`." (b) **Both the input (snapshot) and the output (spec) are immutable** — the engine never mutates the ledger; full ownership of the ledger stays on the bridge side. This is the concrete shape of what L0 previewed as "**a read-only snapshot type that keeps the risk-calculation core decoupled from upstream state.**"

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

3. **\`collateral: Notional\` — signed.** Collateral is *deposited* funds, conventionally non-negative, but the type is \`Notional\` (signed) because \`account_equity = collateral + unrealized_pnl\` needs to flow as a signed sum. Making \`collateral\` unsigned would force an \`as i64\` cast in every equity computation. **Convert at the boundary, keep the math in one signed type — that way, silent runtime bugs caused by missed casts or mixing signed and unsigned (underflows, an \`as\` cast that flips the top bit, a subtraction that should have produced a negative number turning into a large positive one) get eliminated at the compile-level as type mismatches.** L4's sign trick — computing \`(mark − entry) × size\` branchlessly for all four quadrants — only works because every step on that path is uniformly signed.

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

2. **\`side: Side\` reuses \`openhl_clob::Side\`.** The matching engine speaks in \`Side::{Buy, Sell}\`. If we defined a new \`liquidation::Side\` enum and converted at the bridge, we'd be **introducing an unnecessary translation layer (an \`impl From\` and its inverse) that becomes a source of future type drift** — someone adds a third variant (\`Closing\`, say) to one crate but not the other, or quietly inverts the \`Buy ↔ Sell\` mapping in one spot. **One enum, one source of truth.** Vocabulary that crosses crate boundaries (\`Side\`, \`Qty\`) should be shared across the boundary so you don't end up paying a permanent type-conversion cost (an "adjustment tax") forever.

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

Dropping the four quadrants of \`(mark − entry) × size\` into one matrix makes it visually obvious why this single line replaces four \`if\` branches:

\`\`\`
                          mark > entry              mark < entry
                       (price up → diff +)         (price down → diff −)
                       ────────────────────       ────────────────────
   Long  (size = +)     (+) × (+) = +              (−) × (+) = −
                       ◤ profit ✓                  ◤ loss ✓
                       e.g. (110−100) × +10 = +100 e.g. (90−100) × +10 = −100
   ─────────────────────────────────────────────────────────────────────
   Short (size = −)     (+) × (−) = −              (−) × (−) = +
                       ◤ loss ✓                    ◤ profit ✓
                       e.g. (110−100) × −10 = −100 e.g. (90−100) × −10 = +100
\`\`\`

The mechanic: **\`size\`'s sign carries the long/short direction, \`(mark − entry)\`'s sign carries the price-move direction — multiplying them lets the two pieces of directional information combine, and the correct profit/loss sign falls out mechanically.** In the \`if size > 0 { ... } else { ... }\` branched version, the developer has to mentally reconstruct both cases while writing each branch, and bugs that hit only one side are a common failure mode. The signed-multiplication form **outsources that reconstruction entirely to the type system and arithmetic rules.**

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

3. **\`u64::saturating_mul\` over \`u64::checked_mul\`.** Both detect overflow; \`saturating_mul\` returns \`u64::MAX\` on overflow, \`checked_mul\` returns \`None\`. Returning \`Option<u64>\` would force every caller (margin_ratio in L5, etc.) to handle a \`None\` that *only* arises at network-pathological inputs. Saturating returns a usable value that's mathematically wrong only at the extremes — and at those extremes the margin engine will classify the account as \`Liquidatable\` either way. **Saturation is the right failure mode when "the value is extreme but stays in bounds" beats "the cost of forcing every call site to propagate \`Option\` and write the boilerplate (\`?\` / \`unwrap_or\` / early returns) that comes with it."**

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

> 🛑 **Anti-fluency.** "Why not just do \`(mark.0 as i64 − entry.0 as i64) × size\` directly?" **Three problems.** (1) If \`mark\` or \`entry\` exceeds \`i64::MAX\`, the cast wraps silently — the top bit becomes the sign bit. (2) Even if both fit in i64, the subtraction in i64 can overflow when one is near \`i64::MIN\` and the other is positive. (3) The product \`(mark − entry) × size\` can exceed i64 even when each operand fits — a 1% price move on an \`i64::MAX\`-size position overflows. **Implicit \`as\` casts are one of the canonical bug-breeding footguns in Rust, and this lesson exists to defuse exactly that pattern.**

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

2. **\`i64::try_from(v).unwrap_or(...)\`.** \`try_from\` returns \`Err\` exactly when the value doesn't fit; the \`unwrap_or\` branch picks the saturation target by sign. For \`v > 0\` the value was too positive (saturate at \`i64::MAX\`); for \`v ≤ 0\` it was too negative (saturate at \`i64::MIN\`). **Three lines of arithmetic; one decision point; impossible to typo.** **(Note: when \`v == 0\`, \`try_from\` always succeeds with \`Ok(0)\`, so the \`else\` branch of \`unwrap_or\` (\`i64::MIN\`) is never taken — i.e., the \`else\` effectively only fires "when \`v < 0\` *and* doesn't fit," catching negative-direction saturation. Spelled out so readers don't burn a moment wondering whether \`v == 0\` would somehow take the \`i64::MIN\` path.)**

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

- **Why \`account_equity\` returns \`i64\` and can be negative** — equity is \`collateral + unrealized_pnl\`. The PnL leg can blow through deposited collateral and produce a deficit; the engine has to can *measure* that deficit so liquidation can pull the right lever.
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

1. **\`notional == 0\` early return with \`i64::MAX\`.** Flat positions have no exposure → no margin requirement to fall short of. Returning the maximum representable ratio signals "infinitely safe" and lets every downstream \`margin_health\` comparison short-circuit naturally (no special-case in \`margin_health\`). **Concretely, the one-directional comparison we'll write in L6 — \`if ratio >= params.initial_margin_bps { Safe } else { ... }\` — works for a flat account without any extra branch, because \`i64::MAX >= initial_margin_bps\` is always true and the account lands in \`Safe\` automatically.** That is, \`i64::MAX\` is acting as a **"magic boundary that lets the downstream comparison short-circuit straight through."** The alternative — \`Option<MarginRatio>\` or \`Result<MarginRatio>\` — would force every caller to handle the flat case explicitly. **Encode the "no constraint" case as the system's safest possible upper bound — that's the design discipline at work here.**

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

Lining up the three regimes and how \`margin_ratio\` behaves in each shows visually why the naïve intuition breaks, and where the "singular boundary" actually runs:

\`\`\`
                         margin_ratio (Long position; collateral and size fixed, sweep mark)
                         ▲
                         │     🔴 Cash-heavy regime
                         │        (collateral > entry × size)
                         │        ratio ↘ decreases as mark rises
                         │        ※ The zone where "ratio goes up with mark" breaks
                         │     ──────────────────────────────────
                         │
                         │     ◆ Singular boundary: collateral = entry × size
                         │        (= exactly 1x leverage; just-barely cash-funded)
                         │        ratio is flat in mark (derivative = 0)
                         │     ──────────────────────────────────
                         │
                         │     🟢 Levered regime
                         │        (collateral < entry × size)
                         │        ratio ↗ increases as mark rises
                         │        ※ Naïve intuition holds; 99% of real perp positions
                         │
                         └─────────────────────────────────────►  mark

  Things to read off:
    - The boundary position depends only on **the relation between collateral and entry × size**;
      it does not depend on mark.
    - The moment collateral exceeds entry × size (notional at entry), the slope of margin_ratio
      flips sign.
    - On real exchanges, traders are almost always in the levered regime, so this flip is a rare
      corner case in production. But the proptest feeds random inputs and will mercilessly step
      into the corner.
    - The "naïve monotonicity intuition" isn't fundamentally wrong — it is correct **under the
      implicit precondition "you are in the levered regime."** The proptest is the device that
      forces that hidden precondition to become visible.
\`\`\`

This figure also matters in L6 / L7 when we write the classifier and liquidation discipline: healthy traders live in the levered region, but an extremely over-collateralized "pseudo-long" account can wander into the cash-heavy region at any time, and the engine has to behave correctly in both.

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

2. **The proptest's failure is the lesson.** If the proptest had passed on the first try, the reader would have learned "margin_ratio is monotonic in mark." With the failure-and-trace step, the reader reaches a deeper domain fact: "**margin_ratio is monotonic in mark *only in the levered regime*, and its singular boundary is the point where the deposited collateral equals the notional at entry (= entry × size)."** That deeper fact survives because the reader walked through the derivative themselves.

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

Division by zero in Rust panics in both debug and release for integers. The flat guard prevents that panic. Removing it would require either a \`try_div\` (which i128 doesn't have built-in) or a branchless approach (multiplying notional by a constant before the divide, with extra rounding noise). The two-line guard is the cleanest. **An explicit one-branch conditional is far cheaper — in terms of readability and maintainability — than escaping into a tricky branchless implementation.**

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

Laying the four-state cascade out on the margin-ratio number line makes it visible why this is the only order that works, and why reversing it would let Underwater get "absorbed" into Liquidatable:

\`\`\`
                       (worsening ◄────────────────── value magnitude ──────────────────► improving)

   margin ratio:   ── −∞ ── 0 ─────── maintenance_bps ─────── initial_bps ─────── i64::MAX ──
                       ↑    ↑                    ↑                      ↑                    ↑
                       │    │ (e.g. 200)         │ (e.g. 1000)           │                    │
                       │    │                    │                      │                    │
                       └────┴──┐  ┌──────────────┴──┐  ┌─────────────────┴──┐  ┌──────────────┘
                              ▼  ▼                 ▼  ▼                    ▼  ▼
                          🔴 Underwater       🟠 Liquidatable          🟡 AtRisk            🟢 Safe
                          (ratio < 0)         (0 ≤ ratio                (maint ≤ ratio       (initial ≤ ratio;
                                              < maintenance)            < initial)            flat lands here
                                                                                              via i64::MAX too)


   🟢 Correct cascade order (narrow inward):
      ① if ratio < 0                ──► Underwater     (cut out the most extreme region first)
      ② else if ratio < maintenance ──► Liquidatable   (Underwater already excluded in ①)
      ③ else if ratio < initial     ──► AtRisk         (Liquidatable already excluded in ②)
      ④ else                        ──► Safe           (the whole remaining region)
      ※ Each branch operates only on "what survived being filtered by the branches above."

   🔴 Reversed (check the wide region first):
      ① if ratio < maintenance     ──► Liquidatable   ← ratio = -5_000 (Underwater) also
                                                         satisfies < 200, so it gets
                                                         "absorbed" into Liquidatable
      ② if ratio < 0               ──► Underwater     ← unreachable
      ③ ...
      Result: the insurance-fund signal disappears; the Underwater deficit flows silently
              through the normal close path. The math says the deficit wasn't resolved,
              but the books record it as a solvent close.
\`\`\`

The point: **when the cascade is written as "carve out the most extreme region first, then narrow," each branch's condition naturally operates inside the complement of every prior branch.** Reverse it — check the wide region first — and the more-extreme region (Underwater) gets swallowed by the wider one (Liquidatable), degrading what should be a four-way classification into three. L7's \`close_order_spec\` keys off these four states to decide what to emit, so collapsing the narrowing breaks the downstream behaviour entirely.

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

4. **No special case for flat positions.** \`margin_ratio\` returns \`MarginRatio(i64::MAX)\` for a flat account. \`i64::MAX\` is far above any sane \`initial_margin_bps\`, so the cascade falls through to \`Safe\`. **The flat-as-Safe property is encoded by \`margin_ratio\`'s flat-position guard — \`margin_health\` doesn't need to know about it.** This is **function composition at work: downstream functions inherit invariants established upstream, automatically.** \`margin_ratio\` decides "flat → \`i64::MAX\`" in one spot, and every downstream consumer (this \`margin_health\`, L7's \`close_order_spec\`) gets "flat = always lands in Safe" **for free — zero extra code.** If you have the habit of "adding a flag-branch inside every function for every edge case," this is the paradigm shift worth internalizing: **scope each invariant to a single owner, then trust it downstream.** A future tweak to flat-position semantics happens in *one place* (\`margin_ratio\`), not in two synchronized branches.

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

The function is total — every input produces a defined output. A misconfigured params (maintenance == initial, or maintenance > initial) still classifies every account into one of the four variants, just with the wrong semantics. Returning \`Result\` would force every call site to handle a \`MisconfiguredParams\` error that *never arises from a bridge that constructed params validly*. **Total functions are overwhelmingly easier to compose; complete the parameter-validity check at the system input boundary (config load / config parse), and the downstream domain layer (\`margin_health\` and the other classifiers) treats invariants as fully held** — this is the **"Parse, don't validate"** discipline: concentrate validation logic at the boundary, then build the domain layer out of total functions.

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

At its core, \`close_order_spec\` is just **flipping the side of a position**. Drawing the bridge between the CLOB (matching engine) and the liquidation engine in one picture makes it obvious why this function fits in 11 lines, and why it carries zero responsibility for picking a side or a price:

\`\`\`
   ┌─────────────────────────────┐                  ┌─────────────────────────────┐
   │ Held account position        │                  │ Inverted market order that  │
   │ (account state)              │                  │ close_order_spec emits      │
   ├─────────────────────────────┤                  ├─────────────────────────────┤
   │  Long  size = +10             │   ──[invert]──► │  Side::Sell    qty = 10        │
   │  (holds 10 units long)        │                  │  → submit "sell 10" to CLOB    │
   │                              │                  │  → consume bids until filled    │
   │                              │                  │  → position flattens            │
   ├─────────────────────────────┤                  ├─────────────────────────────┤
   │  Short size = −10             │   ──[invert]──► │  Side::Buy     qty = 10        │
   │  (10 units short)             │                  │  → submit "buy 10" to CLOB     │
   │                              │                  │  → consume asks until filled    │
   │                              │                  │  → position flattens            │
   ├─────────────────────────────┤                  ├─────────────────────────────┤
   │  Flat  size =   0             │   ──[invert]──► │  Side::Buy     qty =  0        │
   │  (no position; shouldn't even │                  │  → bridge filters; not submitted│
   │   normally reach here)        │                  │                                │
   └─────────────────────────────┘                  └─────────────────────────────┘

   ※ \`close_order_spec\` decides only two things: "invert the direction" and
     "extract the magnitude via \`unsigned_abs\`."
     - The "should we liquidate?" decision is already settled by L6's \`margin_health\`.
     - The "at what price?" decision happens in the matching engine (CLOB) against the book.
     - The "don't submit flat specs" filter is the bridge's job before submission.
   Each layer owns exactly one concern; they compose in series.
\`\`\`

The point: **the essence of this function is the side inversion, full stop.** The Long ↔ Sell / Short ↔ Buy mapping is the smallest possible transformation that issues a netting trade through the CLOB; throwing \`MarkPrice\` or \`LiquidationParams\` into the signature would mix in price discovery or threshold decisions that belong elsewhere. **The function expresses "close this position" in its smallest possible form — and that's all \`close_order_spec\` is for.**

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

5. **Returns \`CloseOrderSpec\` by value, not \`Option<CloseOrderSpec>\`.** The function is total — it always returns a spec, even for flat positions (with \`qty == 0\`). The alternative — \`Option\` — would force the caller to handle \`None\` for every flat account in a scan, even though those accounts are already pre-filtered by the time we reach the close step. **Total functions compose; optional functions force every caller to handle the empty case (with the boilerplate that comes with it).** Where this matters concretely is Stage 10c's \`LiquidationScanner\`: it can process every account snapshot uniformly through a plain \`map\` or a flat \`for\` loop, with **no \`filter_map\` and no \`Option\` chaining**. Because \`close_order_spec\` is total, the scanner writes the "is this \`Liquidatable\` or \`Underwater\`?" classification filter in one place, and doesn't need to re-filter at close-spec generation time. **Edge-case filtering (don't submit a flat-qty spec) lives at the outermost shell of the system — the bridge** — which is the discipline that runs across this whole crate.

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

1. **Side is the opposite of position direction — no other case.** Long → Sell, Short → Buy. The function doesn't need a third case for "ambiguous" or a fallback for "unknown." The position has a sign or it's flat; the spec inverts the sign or carries zero. **A plain inversion of position direction — that's the simplest and most accurate expression of "close (liquidate) this position" in code.**

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

Because flat (\`size == 0\`) is *neither* long *nor* short — it's outside the long/short dichotomy. The conventions "flat is a long" and "flat is a short" are both **arbitrary (a matter of taste)**; we picked the convention where flat falls into the \`else\` branch silently and qty is 0 anyway. Either choice works; the discipline is **be consistent and document the choice**. The doc says "flat → qty 0, callers filter," which is what readers can verify against the code.

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
          {
            title: "Insurance fund",
            sortOrder: 3,
            lessons: {
              create: [
                {
                  title: "Lesson 8 — InsuranceFund — where the crate stops being pure",
                  slug: "openhl-liquidation-insurance-fund-intro-en",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 25,
                  xpReward: 50,
                  content: `# Lesson 8 — \`InsuranceFund\` — where the crate stops being pure

## Goal

Concepts you'll grasp in this lesson:

- **The pure → stateful boundary.** Stage 10a's \`compute.rs\` is pure: every function is a deterministic projection of its arguments. Stage 10b introduces the first state in the liquidation crate — the insurance fund's accumulating balance — because the fund is genuinely a fact about *history*, not a fact about a single snapshot. **State appears in code only when the value can't be re-derived from its inputs.**
- **The \`balance ≥ 0\` type invariant.** Every public operation on \`InsuranceFund\` preserves it. The field type is \`i64\` (for arithmetic uniformity with the rest of the crate), but **the invariant is enforced in code, not in the type system**. \`new(-500)\` clamps to 0; \`deposit(-50)\` is a no-op; \`withdraw_shortfall(...)\` saturates at 0 with the unfilled portion surfaced via \`WithdrawOutcome\` (L9). The discipline: **make every public method a transition that preserves the invariant.**
- **Defensive boundaries vs. defensive functions.** The \`compute\` module trusts its inputs; the \`insurance\` module doesn't. Why the difference? \`compute\` is a pure projection — its caller already constructed a valid \`AccountSnapshot\`. \`InsuranceFund\` is *the boundary* — bridges, scanners, and (later) ADL routines all call it from different layers, and any of them can be buggy. **Defensive coding earns its keep at boundaries that aggregate many callers.**
- **Saturating arithmetic in consensus state.** \`deposit\` uses \`saturating_add\` instead of \`+\`. The reason isn't just "to avoid panics in dev." Rust's \`+\` operator has *two* failure modes across build profiles: **debug builds panic on overflow** (one validator crashes, others continue → fork), and **release builds silently wrap** in two's-complement (every validator produces a *different* \`i64\` from its peers → fork). The release wrap is the deceptive one — no crash, no error, just disagreement. \`saturating_add\` clamps to \`i64::MAX\` (or \`MIN\`) under every build profile, so every validator sees the same value regardless of which compiler flags they used. **Saturation is the consensus-safe arithmetic discipline.**

Verification:

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

…passes 33 tests (24 from L0–L7 + 9 new tests for construction + deposit). The 22 additional withdrawal / proptest cases land in L9.

Specific changes:

- **\`src/insurance.rs\`** — new module file. Adds \`InsuranceFund\` struct, three constructors (\`new\` / \`empty\` / \`Default::default\`), \`balance()\` accessor, \`deposit()\` mutator, and 9 unit tests.
- **\`src/lib.rs\`** — adds \`pub mod insurance;\` and re-exports \`InsuranceFund\`.

L8 lands roughly half of \`insurance.rs\`. The withdraw path — including the \`WithdrawOutcome\` enum — is the L9 capstone of the insurance-fund module.

## Recap

After L7:
- \`compute.rs\` is complete for Stage 10a: 6 functions (\`notional_value\`, \`unrealized_pnl\`, \`account_equity\`, \`margin_ratio\`, \`margin_health\`, \`close_order_spec\`) plus the \`saturate_i128_to_i64\` helper.
- \`lib.rs\` re-exports all 6 compute functions and the Stage 10a types.
- \`cargo test\` runs 24 tests, all green.
- The crate is **purely functional**: no \`&mut self\`, no module-level state, every function returns a value derived from its arguments alone.

L8 starts Stage 10b. The first thing that changes is that the crate is no longer purely functional.

## Plan

Three edits:

1. **Create \`crates/liquidation/src/insurance.rs\`** — a new module file with the \`InsuranceFund\` struct, two constructors, the \`balance()\` accessor, the \`deposit()\` mutator, the \`WithdrawOutcome\` enum scaffold (used in L9), and 9 unit tests covering construction + deposit.
2. **Add \`pub mod insurance;\`** and the re-exports to \`crates/liquidation/src/lib.rs\`.
3. **Update \`lib.rs\`'s top-of-file roadmap** to mark Stage 10b in progress.

> 🛑 **Predict.** Before reading further: in a state machine with a single non-negative balance field, what's the smallest defensive surface that preserves \`balance ≥ 0\` across an open set of callers? Specifically: **\`new(initial: i64)\`, \`deposit(fee: i64)\`, \`withdraw(amount: i64)\`** — at which of these three call sites do you need to defend, and against what bad input shape?

(Answer: **All three.** \`new\` defends against a negative initial — clamp to 0. \`deposit\` defends against a negative fee — treat as no-op (a negative fee would silently drain the fund). \`withdraw\` defends against (a) a negative shortfall — treat as a 0-amount Covered, (b) an amount exceeding the balance — drain to 0 and surface the unfilled portion. Each defense exists because the public API is callable from many layers and **any single bad call must not violate the type invariant**. L8 covers \`new\` + \`deposit\`; L9 covers \`withdraw\`.)

The architectural picture of why state appears here:

\`\`\`
   ┌────────────────────────────────────────────────────────────────┐
   │ Stage 10a — pure compute (compute.rs)                          │
   │                                                                │
   │  margin_health(snapshot, mark, params) → MarginHealth          │
   │  margin_ratio(snapshot, mark)          → MarginRatio           │
   │  close_order_spec(snapshot)            → CloseOrderSpec        │
   │                                                                │
   │  Every result is a projection of inputs. Re-evaluable forever. │
   └────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
   ┌────────────────────────────────────────────────────────────────┐
   │ Stage 10b — state machine (insurance.rs)                       │
   │                                                                │
   │  InsuranceFund { balance: i64 }   ← the fund accumulates       │
   │      .deposit(fee)                ← fees CREDIT the fund        │
   │      .withdraw_shortfall(amount)  ← deficits DEBIT the fund     │
   │      .balance()                   ← current accumulated value  │
   │                                                                │
   │  Balance is a fact about *history*, not a fact about an input. │
   │  Two different sequences of (deposit, withdraw) calls produce  │
   │  two different balances — even if the *final* call's arguments │
   │  are identical.                                                │
   └────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
   ┌────────────────────────────────────────────────────────────────┐
   │ Stage 10c — scanner (scanner.rs, L11–L12)                      │
   │                                                                │
   │  Owns an InsuranceFund; calls .deposit / .withdraw_shortfall   │
   │  per liquidation event; threads outcomes back into ScanReport. │
   └────────────────────────────────────────────────────────────────┘
\`\`\`

The point: **pure compute returns; stateful modules accumulate.** Stage 10a told the engine *what* the world looks like for each account. Stage 10b lets the engine remember *what happened* across accounts and across blocks. The scanner (L11–L12) is the layer that orchestrates the two.

## Walk-through

### Step 1: Create \`src/insurance.rs\`

Create a new file \`crates/liquidation/src/insurance.rs\`. The whole-module doc comment comes first; it's the single most-read piece of prose in the module because every doc generator and every \`cargo doc\` reader sees it before any function.

\`\`\`rust
//! Insurance fund state machine (Stage 10b).
//!
//! The insurance fund is the venue's pooled buffer that absorbs the
//! deficit when a Liquidatable account's close turns underwater, or when
//! an Underwater account is liquidated outright. It accumulates the
//! liquidation fees that solvent closes pay in. Stage 10c's scanner will
//! own an [\`InsuranceFund\`] and call its deposit / withdraw operations
//! from the per-account liquidation loop.
//!
//! ### Why stateful here when the rest of the crate is pure
//!
//! Margin classification, fee math, and close-outcome computation
//! ([\`crate::compute\`]) are pure functions over per-account snapshots —
//! they can be re-evaluated lossless at any time. The insurance fund's
//! balance, in contrast, accumulates effects from many liquidation events
//! across many blocks; it is genuinely state. The shape mirrors
//! \`openhl_funding::clock\` — a small state machine, owned by the bridge,
//! mutated only on well-defined boundary events.
//!
//! ### Sign discipline
//!
//! The balance is \`i64\` internally for arithmetic uniformity with
//! [\`crate::compute\`], but the type invariant is **\`balance ≥ 0\`** —
//! every public operation preserves it. Withdrawals that exceed the
//! balance saturate at 0 and surface the unfilled portion via
//! [\`WithdrawOutcome\`]. Stage 10c's scanner reads the unfilled portion
//! as the trigger to escalate to ADL (Stage 10d).
//!
//! ### Deposit semantics
//!
//! \`deposit\` accepts a non-negative fee amount. Negative deposits are
//! treated as zero (saturating semantics, no panic) — defensive coding
//! against accidental misuse from the caller. Saturating-add caps at
//! \`i64::MAX\` for network-pathological accumulated balances.
\`\`\`

Four things to notice about this preamble:

1. **It opens with the *role*, not the *type*.** "The insurance fund is the venue's pooled buffer that absorbs the deficit…" — a reader who skims only the first sentence already knows where this module fits in the safety-net cascade. **Module docs are read by people deciding whether to keep reading. Lead with the role.**
2. **It cites Stage 10c and Stage 10d by name.** Even though those stages don't exist yet in the reader's checkout, the doc anticipates them so the reader knows the module is part of a planned arc — not a one-off addition. **Forward references in docs are a contract with the future: "this is going somewhere."**
3. **The sign-discipline section is *not* about Rust's type system.** It's about a invariant the type *doesn't* enforce. **Document invariants that the compiler can't check; the compiler already documents the ones it can.**
4. **"openhl_funding::clock"** is a cross-module cite to a *pattern* the reader has already seen — small state machine, owned by the bridge, mutated only on boundary events. Anchoring a new module to a familiar one shortens the learning curve. **When introducing a new pattern, point at a previous instance of the same pattern in the codebase.**

### Step 2: Add the \`InsuranceFund\` struct and its constructors

Below the doc comment, add the struct definition and its three constructors:

\`\`\`rust
/// The insurance fund's accumulating balance.
///
/// Owned by the bridge (Stage 10c+), exposed via deposit / withdraw
/// operations that maintain the \`balance ≥ 0\` invariant.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct InsuranceFund {
    balance: i64,
}
\`\`\`

Two things to notice about the struct shape:

1. **The field is private (\`balance: i64\`, no \`pub\`).** That's the entire enforcement mechanism for the \`balance ≥ 0\` invariant. If \`balance\` were public, any caller could write \`fund.balance = -1\` and silently violate the contract. **Private fields are how Rust expresses "this invariant exists, and you must go through my public methods to change it."**
2. **\`Clone + Copy + Debug + PartialEq + Eq\`** — every trait that the compiler can derive for a single-\`i64\` struct, derived. Cheap to pass by value, easy to assert in tests, comparable in proptests. **For pure-value types, derive the standard four (or five, with \`Hash\`) eagerly.**

Now the constructors:

\`\`\`rust
impl InsuranceFund {
    /// Create a fund with the given initial balance.
    ///
    /// Negative initial balances are clamped to zero — defensive against
    /// accidental misuse. A negative initial balance can't represent any
    /// physical state of the fund and would violate the type invariant.
    #[must_use]
    pub const fn new(initial_balance: i64) -> Self {
        Self {
            balance: if initial_balance > 0 {
                initial_balance
            } else {
                0
            },
        }
    }

    /// An empty fund; equivalent to [\`InsuranceFund::new(0)\`].
    #[must_use]
    pub const fn empty() -> Self {
        Self { balance: 0 }
    }

    /// Current balance of the fund. Always \`≥ 0\`.
    #[must_use]
    pub const fn balance(&self) -> i64 {
        self.balance
    }
}

impl Default for InsuranceFund {
    fn default() -> Self {
        Self::empty()
    }
}
\`\`\`

Five things to notice:

1. **\`new\` clamps negatives to 0 silently.** No \`Result<Self, ...>\`, no panic. Why? Because the *physical* meaning of a negative initial balance is undefined — a fund that owes money isn't a fund. **When the only sensible interpretation of a bad input is "make it the nearest valid input," do that without ceremony.** A \`Result\` here would force every caller to handle an error that should never happen in practice; a panic would create a debug-vs-release behaviour split. Clamping is the cheapest correct answer.
2. **\`empty()\` exists despite \`new(0)\` doing the same thing.** Two reasons. First, \`InsuranceFund::empty()\` reads more clearly at call sites than \`InsuranceFund::new(0)\` — intent over numerics. Second, \`empty\` is also what \`Default::default()\` calls, so the two names point at the same construction site. **A named constructor for the canonical zero value is a small clarity win that pays compounding interest.**
3. **\`const fn\` on every method that touches the field.** The struct has one \`i64\` field; everything that doesn't mutate the underlying state is trivially const-evaluable. This lets future code use \`InsuranceFund\` in const contexts (e.g., as a default in a config struct), and signals to readers that these operations are pure. **\`const fn\` is documentation as much as it is capability — it says "this method does nothing fancy."**
4. **\`#[must_use]\` on \`new\` and \`empty\`.** Constructing a fund and throwing it away is almost always a bug — usually a leftover from a refactor. \`#[must_use]\` makes the compiler complain about it. **Marker attributes catch the "obviously wrong, easily missed" cases.**
5. **\`Default::default()\` is implemented manually**, not derived. The derived \`Default\` for a struct with \`balance: i64\` would produce \`balance: 0\` — same result. But pointing the manual impl at \`Self::empty()\` makes the *intent* explicit: "the default fund is the empty fund, by design, not by coincidence." **Manual \`Default\` impls are valuable when the default value has semantic meaning beyond zero-initialization.**

> 🛑 **Anti-fluency.** "Why not \`pub fn new(initial_balance: u64) -> Self\` — \`u64\` makes the invariant impossible to violate, no?" Three problems. (1) The rest of the crate uses \`i64\` for fungible amounts (\`pnl\`, \`equity\`, \`collateral\`); changing the type at a single boundary forces a cast at every call site. (2) Validators that compute fees with i64 arithmetic would need a checked \`u64::try_from\` everywhere — adding panics where saturation suffices. (3) The *invariant* \`balance ≥ 0\` is enforced by code anyway, so the type-level safety is gilt on a lily. **Match the surrounding type discipline; defend the invariant in code where the rest of the crate already does the same.**

### Step 3: Add the \`WithdrawOutcome\` enum scaffold

Even though L8 doesn't implement \`withdraw_shortfall\`, we declare \`WithdrawOutcome\` now so the L9 changes are purely additive in \`impl InsuranceFund\` (no enum-introduction churn). Add this **above the \`impl InsuranceFund\` block**:

\`\`\`rust
/// Outcome of attempting to absorb a shortfall via
/// [\`InsuranceFund::withdraw_shortfall\`].
///
/// The three variants are exactly the three transitions across the
/// "Layer 2 → Layer 3" boundary in the safety-net cascade:
///   - [\`WithdrawOutcome::Covered\`] — the fund had enough; Layer 2
///     fully absorbed the deficit.
///   - [\`WithdrawOutcome::PartiallyDrained\`] — the fund drained to
///     zero and covered part of the shortfall; the remainder must
///     escalate to Layer 3 (ADL).
///   - [\`WithdrawOutcome::Depleted\`] — the fund was already empty
///     before the call; nothing covered, full shortfall escalates.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum WithdrawOutcome {
    /// Fund had enough balance to cover the request in full.
    Covered {
        /// Amount paid out of the fund (= requested shortfall).
        amount: i64,
    },
    /// Fund partially covered the shortfall before draining to zero.
    PartiallyDrained {
        /// Amount actually paid out (= fund's prior balance).
        amount: i64,
        /// Remaining shortfall that the caller must escalate to ADL.
        unfilled: i64,
    },
    /// Fund was already empty; nothing was paid out.
    Depleted {
        /// Full shortfall that must escalate to ADL.
        unfilled: i64,
    },
}
\`\`\`

This enum is **declared now and used in L9**. L8 introduces it because:

1. **The enum's existence is part of the public surface story.** A reader who skims \`insurance.rs\` after L8 should see the full type vocabulary of the module, even if some methods are deferred. **Vocabulary before mechanism.**
2. **Each variant carries its own payload.** \`Covered\` and \`PartiallyDrained\` both carry \`amount\` (what was actually paid out), and \`PartiallyDrained\` and \`Depleted\` both carry \`unfilled\` (what the scanner must escalate). The L9 proptest \`withdraw_amount_plus_unfilled_equals_shortfall\` is the conservation law that ties them together — but you can already see the shape of the law in the variant payloads. **Self-describing variants are documentation that the compiler enforces.**
3. **\`Layer 2 → Layer 3 boundary\`** in the doc comment names the cascade architecture explicitly: margin (Layer 1, Stage 10a) → fund (Layer 2, Stage 10b) → ADL (Layer 3, Stage 10d). The reader gets the map every time they look at this enum. **When a type sits at an architectural seam, say so in its doc.**

### Step 4: Add the \`deposit\` method

Append \`deposit\` to the existing \`impl InsuranceFund\` block:

\`\`\`rust
    /// Credit the fund with a fee. Returns the new balance.
    ///
    /// Negative inputs are treated as a no-op (defensive against the
    /// caller passing a signed value where the contract expects a credit).
    /// Saturates at \`i64::MAX\` for network-pathological accumulated
    /// balances.
    pub fn deposit(&mut self, fee: i64) -> i64 {
        if fee > 0 {
            self.balance = self.balance.saturating_add(fee);
        }
        self.balance
    }
\`\`\`

Five things to notice:

1. **\`fee > 0\` (strict).** A fee of \`0\` is also a no-op, so \`>\` and \`>=\` produce identical behaviour for zero. The strict form makes the branch fire only when there's actual work to do. **For predicates that gate side effects, prefer \`> 0\` (the "is this meaningful?" test) over \`>= 0\` (the "is this non-negative?" test) when zero is a no-op.**
2. **Negative inputs are silently ignored, not panicked or errored on.** Why? Because the alternative is consensus disaster. A panic-on-negative would halt one validator while others continue if a single bridge bug ever pushed a negative fee — and Rust's panic semantics are particularly cruel here (debug vs release, hook differences, etc.). A \`Result<i64, ...>\` would force every caller in the scanner to either \`unwrap\` (panic-by-other-name) or thread an error type through code that has no good error path. **Saturating-no-op semantics give consensus determinism for free.**
3. **\`saturating_add\`, not \`+\`.** Two failure modes if you use \`+\`: in debug, \`100i64 + i64::MAX\` panics with overflow (one validator halts, others continue → fork); in release, it silently wraps to a negative value — *which violates the \`balance ≥ 0\` invariant AND produces a different \`i64\` than every peer that handled the same operation differently → fork*. \`saturating_add\` caps at \`i64::MAX\` under every build profile, so every validator sees the same number. The network can never accumulate more than \`9.2 × 10^18\` of fees anyway, and the cap is invisible in any non-pathological state. **\`saturating_*\` family is the consensus-safe arithmetic family.**
4. **Returns the new balance.** The caller often wants to log it ("fee credited: 150, fund balance now: 2_400_150") and a single chained call is cleaner than a two-step \`let _ = f.deposit(150); let new_balance = f.balance();\`. The method is \`&mut self\`-and-returns; that pattern shows up in Rust's standard library too (e.g., \`HashMap::insert\` returns the old value). **\`&mut self\` methods that return useful state save a follow-up \`balance()\` call.**
5. **The doc string says "non-negative fee amount" then handles negatives anyway.** This isn't a contradiction — it's defensive documentation. The doc says "this is what you should pass"; the implementation says "but if you pass garbage, we won't crash." **Doc the intended contract; implement the merciful failure mode.**

### Step 5: Wire the module into \`lib.rs\`

Open \`crates/liquidation/src/lib.rs\`. Make two changes:

First, add the module declaration. Find the existing \`pub mod compute;\` and \`pub mod types;\` block and insert \`insurance\` between them:

\`\`\`rust
pub mod compute;
pub mod insurance;
pub mod types;
\`\`\`

Second, add the \`InsuranceFund\` re-export. Find the existing \`pub use compute::{ ... };\` block and add an \`insurance\` re-export after it:

\`\`\`rust
pub use compute::{
    account_equity, close_order_spec, margin_health, margin_ratio, notional_value, unrealized_pnl,
};
pub use insurance::{InsuranceFund, WithdrawOutcome};
pub use types::{
    AccountSnapshot, CloseOrderSpec, LiquidationParams, MarginHealth, MarginRatio, MARGIN_SCALE,
};
\`\`\`

Both re-exports — the type and the enum — go on one line. Why both now? Because **users of the crate import what they call**, and the L9 path that calls \`withdraw_shortfall\` will pattern-match on \`WithdrawOutcome\` immediately. Re-exporting the enum at L8 means L9 needs no changes to \`lib.rs\`. **Re-export the public surface once per module, not per method.**

### Step 6: Add the 9 unit tests

Append the test module at the bottom of \`insurance.rs\`:

\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;

    // ─── construction ──────────────────────────────────────────────

    #[test]
    fn new_with_positive_balance() {
        let f = InsuranceFund::new(1_000);
        assert_eq!(f.balance(), 1_000);
    }

    #[test]
    fn new_with_zero_is_empty() {
        let f = InsuranceFund::new(0);
        assert_eq!(f.balance(), 0);
    }

    #[test]
    fn new_with_negative_clamps_to_zero() {
        let f = InsuranceFund::new(-500);
        assert_eq!(f.balance(), 0);
    }

    #[test]
    fn empty_is_zero() {
        let f = InsuranceFund::empty();
        assert_eq!(f.balance(), 0);
    }

    #[test]
    fn default_is_empty() {
        let f = InsuranceFund::default();
        assert_eq!(f.balance(), 0);
    }

    // ─── deposit ───────────────────────────────────────────────────

    #[test]
    fn deposit_accumulates() {
        let mut f = InsuranceFund::empty();
        assert_eq!(f.deposit(100), 100);
        assert_eq!(f.deposit(250), 350);
        assert_eq!(f.balance(), 350);
    }

    #[test]
    fn deposit_zero_is_noop() {
        let mut f = InsuranceFund::new(100);
        assert_eq!(f.deposit(0), 100);
    }

    #[test]
    fn deposit_negative_is_noop() {
        // Defensive: negative deposits must not silently drain the fund.
        let mut f = InsuranceFund::new(100);
        assert_eq!(f.deposit(-50), 100);
        assert_eq!(f.balance(), 100);
    }

    #[test]
    fn deposit_saturates_at_max() {
        let mut f = InsuranceFund::new(i64::MAX - 10);
        assert_eq!(f.deposit(1_000), i64::MAX);
    }
}
\`\`\`

Six things to notice about how this test module is shaped:

1. **\`// ─── construction ───\` section headers.** Box-drawing-character comments mark the four logical groups (construction · deposit · in L9: withdrawal-covered · withdrawal-partial · withdrawal-depleted · sequencing · proptests). The headers exist because the eventual module has ~22 tests; scanning the file by section name beats scrolling by line number. **In a test file with more than ~10 tests, group them.**
2. **\`new_with_zero_is_empty\` exists even though it's trivially derivable from the \`new\` source.** It's not redundant — it locks the behaviour in. A future refactor that accidentally added \`if initial_balance >= 0\` instead of \`> 0\` would still pass this test (because 0 falls through both predicates correctly), but a refactor that flipped to \`if initial_balance < 0\` *with* a typo would break exactly this case. **Boundary tests on small predicates catch typos that bigger tests miss.**
3. **\`new_with_negative_clamps_to_zero\` directly tests the defensive surface.** The test isn't there to verify the *function works*; it's there to verify the *invariant is preserved*. If a future refactor "fixed" the apparent dead code in \`new\` by removing the clamp, this test would catch it. **Tests for defensive code defend the defensive code.**
4. **\`default_is_empty\` is a one-liner that proves the \`Default\` impl points at \`Self::empty()\`** and didn't accidentally get derived (which would also produce \`balance: 0\`, but with different intent). **Tests can lock in *which path* produces a result, not just the result.**
5. **\`deposit_negative_is_noop\` has a \`// Defensive\` comment.** The comment names the failure mode the test guards against: "negative deposits must not silently drain the fund." A reader who removes the test will see the comment and reconsider. **Brief test-level comments are scaffolding for future maintainers who might think a test is unnecessary.**
6. **\`deposit_saturates_at_max\` uses \`i64::MAX - 10\`** as the initial balance. Why not \`i64::MAX\`? Because a deposit of any amount into a max-balance fund saturates at max — the test would also pass even if \`saturating_add\` were *replaced* by \`wrapping_add\`, since \`i64::MAX + anything >= 0\` wraps to a negative value, but \`+1000\` would wrap, and the test would catch it. Starting near max gives the test room to fire the saturation logic. **Boundary tests on saturating arithmetic need a buffer so the boundary actually fires.**

### Step 7: Run the tests

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

Expected output:

\`\`\`
running 33 tests
test compute::tests::close_flat_has_zero_qty ... ok
test compute::tests::close_long_with_sell ... ok
test compute::tests::close_short_with_buy ... ok
test compute::tests::equity_can_go_negative ... ok
... (21 more Stage 10a tests)
test insurance::tests::default_is_empty ... ok
test insurance::tests::deposit_accumulates ... ok
test insurance::tests::deposit_negative_is_noop ... ok
test insurance::tests::deposit_saturates_at_max ... ok
test insurance::tests::deposit_zero_is_noop ... ok
test insurance::tests::empty_is_zero ... ok
test insurance::tests::new_with_negative_clamps_to_zero ... ok
test insurance::tests::new_with_positive_balance ... ok
test insurance::tests::new_with_zero_is_empty ... ok

test result: ok. 33 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

**33 tests passing. The insurance fund module exists, its invariant is enforced, and deposit semantics are locked in.** Withdraw (and the \`WithdrawOutcome\` payload semantics) land in L9.

Common errors:

- **\`new_with_negative_clamps_to_zero\` fails with \`assertion failed: f.balance() == 0 — left: -500, right: 0\`** — you wrote \`if initial_balance >= 0 { initial_balance } else { 0 }\`, which would clamp on negatives but pass \`-500\` through if the comparison were reversed. Or you wrote \`Self { balance: initial_balance }\` without the clamp. Re-check the \`if\` condition: \`> 0\`.
- **\`deposit_saturates_at_max\` fails with overflow panic** — you wrote \`self.balance += fee\` instead of \`self.balance.saturating_add(fee)\`. Debug build panics on overflow; release build silently wraps. \`saturating_*\` is the only consensus-safe choice.
- **\`deposit_negative_is_noop\` fails with \`left: 50, right: 100\`** — you forgot the \`if fee > 0\` guard and let \`saturating_add(-50)\` run, which decremented the balance to 50. Saturating add doesn't preserve the invariant by itself; the predicate is load-bearing.
- **\`new_with_zero_is_empty\` fails with \`left: 1, right: 0\`** — you wrote \`if initial_balance > 0 { initial_balance } else { 1 }\` (or similar typo in the else branch). Re-check the else branch literal: \`0\`.

## Design reflection

Three load-bearing decisions in this lesson:

1. **State appears at the layer where history matters.** The fund's balance is a fact about all the deposits and withdraws that have ever happened to it; the snapshot type can't represent that, because a snapshot is a fact about one account at one moment. **State appears in code only at the boundary where re-derivation from inputs stops being possible.** Stage 10a was that boundary in one direction; Stage 10b crosses it deliberately.

2. **The \`balance ≥ 0\` invariant is enforced in code, not the type system.** We could have used \`balance: u64\` and let the compiler enforce it. We didn't, because the rest of the crate computes in \`i64\` and a u64 field would force casts at every interaction. The decision is a **type-discipline tradeoff**: pick the representation that makes the crate-internal code cleanest, and defend the invariant at the methods that take untyped inputs from outside. **Cross-crate uniformity beats per-field type safety when the per-field invariant is single-line code.**

3. **Defensive code is concentrated at boundaries, not sprinkled throughout.** \`compute.rs\` trusts every input; \`insurance.rs\` checks every input. The difference: \`compute.rs\` is called by other in-crate code that already constructed the inputs correctly, while \`insurance.rs\` is the boundary where the bridge, the scanner, ADL, and (future) governance all converge. **One module pays the defensive cost; the rest of the crate goes fast.**

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout 260883b
diff -u ~/code/my-openhl/crates/liquidation/src/insurance.rs ./crates/liquidation/src/insurance.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
\`\`\`

After L8:
- **insurance.rs** matches Stage 10b's \`insurance.rs\` **up through line 118** (everything except \`withdraw_shortfall\`, the proptest section, and the sequencing test, which land in L9). Specifically: doc comment + struct + \`WithdrawOutcome\` enum + \`impl\` block ending at \`deposit\` + \`impl Default\` + tests up through \`deposit_saturates_at_max\`.
- **lib.rs** matches Stage 10b's \`lib.rs\` **byte-for-byte** for the \`pub mod\` lines and \`InsuranceFund / WithdrawOutcome\` re-exports. (The roadmap comment at the top of \`lib.rs\` is also updated — that's an optional cosmetic edit in this lesson; L9 brings it in line with the answer key anyway.)

## Common questions

**Q1: Why not use \`Option<NonZeroI64>\` or similar to make the invariant a type-level fact?**

Because every consumer in \`compute.rs\` would have to unwrap the option to do arithmetic. The \`compute.rs\` functions are already validated to handle zero correctly; forcing them through an \`Option\` boundary adds dead branches without protecting anything. **Type-level invariants are great when many callers will *read* the value with structurally-aware code; less great when many callers want to *compute* with it.**

**Q2: Should \`deposit\` return \`Result<i64, FundError>\` instead of returning the balance unconditionally?**

No. There's no failure mode worth distinguishing at the call site. Saturation is silent because it's the right behaviour (the fund really does cap at \`i64::MAX\`); negative fees are silent because the caller is buggy (a \`Result\` here would force a thread of error handling through every scanner site, just to ignore the error). **Use \`Result\` when the caller has a meaningful action to take; here they don't.**

**Q3: Why does \`WithdrawOutcome\` get declared in L8 if \`withdraw_shortfall\` is in L9?**

Three reasons. (1) Re-exports — \`lib.rs\` exports the enum at L8 so L9 doesn't touch \`lib.rs\` again. (2) Public-surface vocabulary — a reader who lands on \`insurance.rs\` after L8 sees the full type vocabulary of the module, even if some methods are deferred. (3) The variants document the safety-cascade architecture; their *shapes* tell the reader where the fund sits in Layer 2→3 transitions. **Types are documentation that compile; declare them when you can describe them, not when you call them.**

**Q4: Could \`InsuranceFund\` be a free-standing \`i64\` value with module-level functions that mutate it, like global state?**

Technically yes, mechanically no. The Stage 10c scanner owns the fund as a field of \`LiquidationScanner\`; the bridge owns the scanner. Threading the fund through the call stack (rather than reaching for global state) is what makes the scanner unit-testable in isolation. **State that touches consensus must be owned by a known component; ownership-by-stack-position is the discipline that lets multiple scanners coexist without interference.**

**Q5: Why is \`new\` \`const fn\` but \`deposit\` isn't?**

\`new\` reads only its argument and the \`Self\` constructor; nothing it does involves mutation through \`&mut self\`. \`deposit\` mutates \`self.balance\` — which Rust currently doesn't allow in \`const fn\` for non-trivially-const types. \`new\` being const lets \`static FUND: InsuranceFund = InsuranceFund::new(0);\` compile, which is useful for tests and (later) for default-config constants. **\`const fn\` what you can; the boundary is usually whether the function mutates state.**

## Next lesson (L9) — \`withdraw_shortfall\`

L9 closes out \`insurance.rs\` with the withdrawal path. The \`WithdrawOutcome\` enum we declared in L8 finally gets used: \`withdraw_shortfall(amount)\` returns \`Covered { amount }\` when the fund has enough, \`PartiallyDrained { amount, unfilled }\` when it drains to zero, and \`Depleted { unfilled }\` when it was already empty.

The two interesting parts: (1) the three-variant outcome is **exactly** the three transitions across the Layer 2 → Layer 3 boundary in the safety-net cascade, and (2) four proptests enforce conservation laws — \`balance_never_negative\`, \`deposit_is_additive\`, \`withdraw_amount_matches_balance_delta\`, and \`withdraw_amount_plus_unfilled_equals_shortfall\`. The proptests are where the cascade math becomes a property the type-system-but-not-quite enforces.
`,
                },
                {
                  title: "Lesson 9 — withdraw_shortfall — the Layer 2 → Layer 3 boundary as code",
                  slug: "openhl-liquidation-withdraw-shortfall-en",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 30,
                  xpReward: 60,
                  content: `# Lesson 9 — \`withdraw_shortfall\` — the Layer 2 → Layer 3 boundary as code

## Goal

Concepts you'll grasp in this lesson:

- **The three-variant outcome enum is the cascade boundary in type form.** \`WithdrawOutcome::Covered\` is "Layer 2 absorbed it fully." \`PartiallyDrained\` is "Layer 2 absorbed what it could; the rest escalates." \`Depleted\` is "Layer 2 had nothing; everything escalates." Stage 10d's ADL routine pattern-matches on this enum to decide what work it has to do. **Architecture seams that span multiple stages become enum variants that span multiple call sites.**
- **Early-return ladders for total functions.** \`withdraw_shortfall\` handles four distinct cases (non-positive shortfall, empty fund, sufficient balance, partial drain) and uses four guarded early returns instead of nested \`match\`. The ladder reads top-down as a sequence of "is it *this* case? if yes, return; if no, keep going." **Early returns flatten conditional structure when each case is independent.**
- **Conservation laws encoded as proptests.** Type systems can express "this enum has three variants" but not "regardless of which variant fires, \`amount + unfilled = original_shortfall\`." Proptests over \`(initial_balance, requested_shortfall)\` pairs let us prove the conservation law against thousands of random inputs. **Proptests are how invariants the compiler can't enforce become invariants the test suite *does* enforce.**
- **\`&mut self\` methods that return *outcomes*, not just new state.** Unlike \`deposit\` (returns the new balance), \`withdraw_shortfall\` returns a *categorically different shape* per path. Three variants × different payloads = three different "what just happened" responses for the same method. **When mutations have qualitatively distinct success modes, return the distinction in the type.**

Verification:

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

…passes 45 tests (24 compute + 21 insurance: 9 from L8 + 8 new unit tests + 4 new proptests). The full \`insurance.rs\` module is byte-for-byte against \`260883b\` after L9.

Specific changes:

- **\`src/insurance.rs\`** — adds \`withdraw_shortfall\` to the \`impl InsuranceFund\` block, 7 unit tests covering the three variants and the negative/zero edge cases, 1 sequencing test that combines deposit + withdraw, and 4 proptests.
- **No changes to \`lib.rs\`** — \`WithdrawOutcome\` was already re-exported in L8.

L9 closes the insurance fund module. After this lesson the answer-key diff against \`260883b\` is fully clean for \`insurance.rs\`.

## Recap

After L8:
- \`insurance.rs\` exists, with the \`InsuranceFund\` struct, \`WithdrawOutcome\` enum (declared, unused), three constructors, the \`balance()\` accessor, and the \`deposit()\` mutator.
- \`lib.rs\` re-exports both \`InsuranceFund\` and \`WithdrawOutcome\`.
- \`cargo test\` runs 33 tests, all green.
- The fund **accumulates** deposits (with the \`balance ≥ 0\` invariant defended at every public method), but it doesn't yet **drain**.

L9 wires the drain path. The enum the reader met in L8 finally has a method that returns its variants.

## Plan

Two edits:

1. **Add \`withdraw_shortfall\` to the \`impl InsuranceFund\` block** in \`crates/liquidation/src/insurance.rs\`. The method is ~20 lines plus the doc comment; the implementation is an early-return ladder that handles four input cases.
2. **Add 8 unit tests + 4 proptests** to the existing \`#[cfg(test)] mod tests\` block. The proptests need a small change at the top of the test module — \`use proptest::prelude::*;\` — and a \`proptest! { ... }\` block wrapping the property assertions.

> 🛑 **Predict.** Before reading further: a fund with balance 300 receives a \`withdraw_shortfall(500)\` call. What's the new balance, and which variant of \`WithdrawOutcome\` should the method return — including the payload values? Now imagine the next call on the same fund: \`withdraw_shortfall(100)\`. Same questions.

(Answer: **First call:** balance becomes 0; outcome is \`PartiallyDrained { amount: 300, unfilled: 200 }\`. The fund covered 300 (everything it had) and 200 must escalate to ADL. **Second call:** balance stays 0; outcome is \`Depleted { unfilled: 100 }\`. The fund was already empty before this call started, so we returned the depleted variant — *not* \`PartiallyDrained { amount: 0, unfilled: 100 }\`. The distinction matters: \`PartiallyDrained\` means "we paid out something," \`Depleted\` means "we paid out nothing." Stage 10c's scanner logs them differently because operationally they represent different bridge health states — a fund actively draining vs a fund already exhausted.)

The mental model for the three variants:

\`\`\`
   Initial state              Call                         Outcome variant
   ─────────────              ────                         ────────────────
   balance = 1000        withdraw_shortfall(300)        Covered { amount: 300 }
   balance = 1000        withdraw_shortfall(1000)       Covered { amount: 1000 }     ← exact drain
   balance =  300        withdraw_shortfall(500)        PartiallyDrained {            ← only partial
                                                          amount: 300,
                                                          unfilled: 200
                                                        }
   balance =    0        withdraw_shortfall(500)        Depleted { unfilled: 500 }    ← nothing to give
   balance = 1000        withdraw_shortfall(0)          Covered { amount: 0 }         ← no-op
   balance = 1000        withdraw_shortfall(-100)       Covered { amount: 0 }         ← defensive

   ── after each call ──────────────────────────────────────────────────────
   balance becomes        sum of \`amount\` payouts        ≥ 0 always
   \`unfilled\` payload      escalates to ADL (Stage 10d)   carries Layer 3's input
\`\`\`

Notice three things about the variant assignments:

1. **\`Covered\` covers both "perfect match" and "no-op" cases.** A shortfall of exactly the balance is \`Covered { amount: balance }\`. A shortfall of 0 is \`Covered { amount: 0 }\`. The variant says "the fund had what was asked of it"; the payload says how much that was. **A variant's payload carries the magnitude; the variant itself carries the meaning.**
2. **\`PartiallyDrained\` requires *both* a positive balance and an insufficient-but-not-zero deficit.** It can't fire when \`balance == 0\` (that's \`Depleted\`) or when \`shortfall ≤ balance\` (that's \`Covered\`). The variant has a narrow eligibility window — which is what makes it informationally meaningful at the call site. **Each variant fires under conditions that no other variant fires under.**
3. **\`Depleted\` doesn't change state.** Balance is already 0; the method does nothing except surface the unfilled amount. The variant exists *to be observed*, not to record an action. **Outcome enums that include "no action taken" variants are usually right — they let callers branch on the cascade-position fact, not just on the side effect.**

## Walk-through

### Step 1: Add \`withdraw_shortfall\` to the \`impl InsuranceFund\` block

Open \`crates/liquidation/src/insurance.rs\`. Find the existing \`impl InsuranceFund { ... }\` block. After \`deposit\`, append \`withdraw_shortfall\`:

\`\`\`rust
    /// Attempt to absorb \`shortfall\` from the fund.
    ///
    /// Three outcomes:
    ///   - \`shortfall ≤ balance\` → [\`WithdrawOutcome::Covered\`], balance
    ///     decreases by \`shortfall\`.
    ///   - \`0 < balance < shortfall\` → [\`WithdrawOutcome::PartiallyDrained\`],
    ///     balance drops to 0, unfilled = \`shortfall − prior_balance\`.
    ///   - \`balance == 0\` → [\`WithdrawOutcome::Depleted\`], no state change,
    ///     unfilled = \`shortfall\`.
    ///
    /// Non-positive \`shortfall\` is treated as a successful no-op
    /// (\`Covered { amount: 0 }\`): no balance change, no escalation.
    pub fn withdraw_shortfall(&mut self, shortfall: i64) -> WithdrawOutcome {
        if shortfall <= 0 {
            return WithdrawOutcome::Covered { amount: 0 };
        }
        if self.balance == 0 {
            return WithdrawOutcome::Depleted {
                unfilled: shortfall,
            };
        }
        if self.balance >= shortfall {
            self.balance -= shortfall;
            WithdrawOutcome::Covered { amount: shortfall }
        } else {
            let prior = self.balance;
            self.balance = 0;
            WithdrawOutcome::PartiallyDrained {
                amount: prior,
                unfilled: shortfall - prior,
            }
        }
    }
\`\`\`

Six things to notice about this 20-line method:

1. **The early-return ladder handles four cases in evaluation order.** Non-positive shortfall first (defensive). Empty fund second (no balance can be moved). Sufficient balance third (the happy path). Partial drain fourth (fallthrough). **Each guard is independent — none cascades into the next.** A guarded early-return ladder beats a nested \`match\` here because the cases don't share structure: each one's input shape is different (\`shortfall <= 0\` vs \`balance == 0\` vs \`balance >= shortfall\` vs everything else).
2. **\`shortfall <= 0\` covers both negative and zero in one branch.** Zero shortfall is a meaningful caller call ("the fee was 0; nothing to draw from the fund"); negative shortfall is a caller bug. Both produce the same \`Covered { amount: 0 }\` because the caller-facing semantics are identical: nothing was drawn, nothing escalates. **Group input cases by their *outcome*, not by their *intent*.**
3. **\`self.balance -= shortfall\` is plain \`-\`, not \`saturating_sub\`.** Because the previous guard (\`self.balance >= shortfall\`) has *already proven* — deterministically and identically across every validator — that the \`i64\` subtraction cannot underflow. This isn't a contradiction of L8's "consensus state must never panic" rule: it's the narrow exception where a static control-flow guard makes the panic probability *provably zero*, so the redundant saturation can be dropped. **A type invariant that holds at the precondition of a subtraction makes saturating arithmetic redundant.** This is the inverse pattern to \`deposit\`'s \`saturating_add\` — there we couldn't prove the precondition, so we saturated; here we *did* prove it (the \`if\` is the proof), so we use plain subtraction.
4. **\`PartiallyDrained\` reads \`prior\` into a local first, then sets \`balance = 0\`, then constructs the variant.** The order matters: if you wrote \`WithdrawOutcome::PartiallyDrained { amount: self.balance, unfilled: shortfall - self.balance }\` and then \`self.balance = 0\`, the construction would be fine (it captures \`self.balance\` before any mutation), but the assignment after struct construction looks like an afterthought to readers. Storing \`prior\` first makes the temporal order obvious: read → mutate → construct. **For state-machine transitions, name the prior state explicitly when you'll reference it after the mutation.**
5. **\`Covered { amount: shortfall }\` uses \`shortfall\` directly, not \`self.balance\` before subtraction.** That's fine because we've already checked \`self.balance >= shortfall\`, so \`shortfall\` is exactly what we paid out. **Use the *requested* amount in the payload, not the *available* amount, when they're equal — it matches the caller's mental model better.**
6. **The method takes \`&mut self\` and returns by value.** No reference, no lifetime, no \`Result\`. The variant *is* the success-shape; the borrow checker treats this exactly like \`deposit\`'s \`-> i64\`. **Outcome enums by-value compose smoothly with \`match\` at call sites; they don't force the caller to manage a borrow.**

> 🛑 **Anti-fluency.** "Why not \`Result<i64, FundError>\` where \`FundError::PartiallyDrained(amount, unfilled)\` and \`FundError::Depleted(unfilled)\`?" Three problems. (1) \`PartiallyDrained\` and \`Depleted\` aren't *errors* — they're successful outcomes that surface escalation work to the caller. Tagging them as errors blurs the line between "this method failed" and "this method succeeded with caveat." (2) The \`?\` operator on \`Result\` short-circuits the caller; we don't *want* short-circuit here, we want the caller to *pattern-match* and route. (3) \`WithdrawOutcome\` is also returned from later signed-outcome wrappers (Stage 10c); a \`Result\` would force every consumer to wrap their own helpers in \`Result\` propagation. **\`Result\` is for "should I unwind?" \`Enum\` is for "what kind of success did I just have?"**

### Step 2: Add the 8 unit tests

Inside the existing \`#[cfg(test)] mod tests { ... }\` block in \`insurance.rs\`, add three test sections after the existing L8 deposit tests:

\`\`\`rust
    // ─── withdraw_shortfall: Covered ───────────────────────────────

    #[test]
    fn withdraw_covered_typical() {
        let mut f = InsuranceFund::new(1_000);
        let out = f.withdraw_shortfall(300);
        assert_eq!(out, WithdrawOutcome::Covered { amount: 300 });
        assert_eq!(f.balance(), 700);
    }

    #[test]
    fn withdraw_covered_exact_balance() {
        let mut f = InsuranceFund::new(1_000);
        let out = f.withdraw_shortfall(1_000);
        assert_eq!(out, WithdrawOutcome::Covered { amount: 1_000 });
        assert_eq!(f.balance(), 0);
    }

    #[test]
    fn withdraw_zero_is_covered_noop() {
        let mut f = InsuranceFund::new(1_000);
        let out = f.withdraw_shortfall(0);
        assert_eq!(out, WithdrawOutcome::Covered { amount: 0 });
        assert_eq!(f.balance(), 1_000);
    }

    #[test]
    fn withdraw_negative_is_covered_noop() {
        // Defensive: a negative shortfall is a caller bug, not a deposit.
        let mut f = InsuranceFund::new(1_000);
        let out = f.withdraw_shortfall(-100);
        assert_eq!(out, WithdrawOutcome::Covered { amount: 0 });
        assert_eq!(f.balance(), 1_000);
    }

    // ─── withdraw_shortfall: PartiallyDrained ──────────────────────

    #[test]
    fn withdraw_partial_drains_to_zero() {
        let mut f = InsuranceFund::new(300);
        let out = f.withdraw_shortfall(500);
        assert_eq!(
            out,
            WithdrawOutcome::PartiallyDrained {
                amount: 300,
                unfilled: 200
            }
        );
        assert_eq!(f.balance(), 0);
    }

    // ─── withdraw_shortfall: Depleted ──────────────────────────────

    #[test]
    fn withdraw_depleted_no_change() {
        let mut f = InsuranceFund::empty();
        let out = f.withdraw_shortfall(500);
        assert_eq!(out, WithdrawOutcome::Depleted { unfilled: 500 });
        assert_eq!(f.balance(), 0);
    }

    #[test]
    fn withdraw_after_full_drain_is_depleted() {
        let mut f = InsuranceFund::new(100);
        let _ = f.withdraw_shortfall(100); // Covered, drains to 0
        let out = f.withdraw_shortfall(50);
        assert_eq!(out, WithdrawOutcome::Depleted { unfilled: 50 });
    }

    // ─── deposit + withdraw sequencing ─────────────────────────────

    #[test]
    fn deposit_after_drain_recovers() {
        let mut f = InsuranceFund::new(100);
        let _ = f.withdraw_shortfall(100); // drains
        f.deposit(50);
        let out = f.withdraw_shortfall(30);
        assert_eq!(out, WithdrawOutcome::Covered { amount: 30 });
        assert_eq!(f.balance(), 20);
    }
\`\`\`

Six things to notice about how these tests are grouped:

1. **Three section dividers — Covered, PartiallyDrained, Depleted — match the variant names exactly.** A reader scanning the test file to find the test for a specific \`WithdrawOutcome\` variant can grep on the section header. **For tests that exercise an enum's variants, group by variant.**
2. **\`withdraw_covered_exact_balance\` is the boundary case for the \`balance >= shortfall\` branch.** When \`balance == shortfall\`, the \`>=\` predicate is true and the \`Covered\` path fires. The test makes sure a future "off-by-one" refactor (\`>\` instead of \`>=\`) would be caught. **Boundary tests on inequality predicates catch the most common refactor mistakes.**
3. **\`withdraw_partial_drains_to_zero\` is the *only* test for the \`PartiallyDrained\` variant.** One test is enough because the variant's path is unique: it fires when \`0 < balance < shortfall\`, and the math (\`amount = balance\`, \`unfilled = shortfall - balance\`) is a direct read from the struct construction. **Single-path code needs single-path coverage; the proptest below covers the conservation law across all paths.**
4. **\`withdraw_after_full_drain_is_depleted\` tests the state transition, not just the variant.** A naive "no setup" test (\`withdraw on empty\`) is already covered by \`withdraw_depleted_no_change\`. This second \`Depleted\` test catches a different bug: a future refactor that accidentally cached the balance before mutation (so the *second* call sees the *first* call's pre-drain balance). **Multiple tests for one variant should each catch a *different* class of regression.**
5. **\`deposit_after_drain_recovers\` is the only sequencing test.** It chains four operations (\`new\`, \`withdraw_shortfall\`, \`deposit\`, \`withdraw_shortfall\`) and asserts the final balance and outcome. The test exists because the per-operation tests verify each method in isolation, but a real liquidation event sequence is exactly this kind of multi-operation chain. **Unit tests verify methods; sequencing tests verify state-machine transitions across method boundaries.**
6. **The negative-shortfall test has \`// Defensive\` as a marker comment**, same pattern as L8's \`deposit_negative_is_noop\`. A future maintainer who looks at this test and thinks "we never pass negatives, this is dead code" gets stopped by the one-word comment. **Marker comments are how tests defend defensive code from refactor removal.**

### Step 3: Add the 4 proptests

Proptests are the conservation laws of \`insurance.rs\`. They're not testing one specific input → output relationship; they're testing that *every* valid input pair satisfies a property the type system can't express.

First, add the proptest import at the top of the \`#[cfg(test)] mod tests\` block (between \`use super::*;\` and the first \`#[test]\`):

\`\`\`rust
    use proptest::prelude::*;
\`\`\`

Then, after the unit tests, add the proptest block:

\`\`\`rust
    // ─── proptest: type invariants ─────────────────────────────────

    proptest! {
        /// The fund's balance is never negative after any sequence of
        /// deposits and withdraws.
        #[test]
        fn balance_never_negative(
            ops in proptest::collection::vec(
                proptest::prelude::any::<(bool, i64)>(),
                0..20,
            ),
        ) {
            let mut f = InsuranceFund::empty();
            for (is_deposit, amount) in ops {
                if is_deposit {
                    f.deposit(amount);
                } else {
                    f.withdraw_shortfall(amount);
                }
                prop_assert!(f.balance() >= 0);
            }
        }

        /// \`deposit(x).deposit(y)\` accumulates: balance after two deposits
        /// equals the sum of the two (modulo saturation at i64::MAX).
        #[test]
        fn deposit_is_additive(a in 0_i64..1_000_000, b in 0_i64..1_000_000) {
            let mut f = InsuranceFund::empty();
            f.deposit(a);
            f.deposit(b);
            prop_assert_eq!(f.balance(), a + b);
        }

        /// After a withdraw, the change in balance equals the \`amount\`
        /// reported in the outcome — regardless of which variant fired.
        #[test]
        fn withdraw_amount_matches_balance_delta(
            initial in 0_i64..1_000_000,
            shortfall in 0_i64..1_000_000,
        ) {
            let mut f = InsuranceFund::new(initial);
            let before = f.balance();
            let out = f.withdraw_shortfall(shortfall);
            let after = f.balance();
            let delta = before - after;
            match out {
                WithdrawOutcome::Covered { amount }
                | WithdrawOutcome::PartiallyDrained { amount, .. } => {
                    prop_assert_eq!(delta, amount);
                }
                WithdrawOutcome::Depleted { .. } => {
                    prop_assert_eq!(delta, 0);
                }
            }
        }

        /// Conservation: \`amount + unfilled\` across all outcome shapes
        /// always equals the original (positive) shortfall.
        #[test]
        fn withdraw_amount_plus_unfilled_equals_shortfall(
            initial in 0_i64..1_000_000,
            shortfall in 1_i64..1_000_000,
        ) {
            let mut f = InsuranceFund::new(initial);
            let out = f.withdraw_shortfall(shortfall);
            let total = match out {
                WithdrawOutcome::Covered { amount } => amount,
                WithdrawOutcome::PartiallyDrained { amount, unfilled } => amount + unfilled,
                WithdrawOutcome::Depleted { unfilled } => unfilled,
            };
            prop_assert_eq!(total, shortfall);
        }
    }
\`\`\`

Eight things to notice about these four properties:

1. **\`balance_never_negative\` is *the* type invariant from L8.** This is the proptest that proves the \`balance ≥ 0\` discipline holds across arbitrary sequences. The input — a vector of \`(is_deposit, amount)\` pairs of length 0 to 20 — covers virtually every reachable state-machine trajectory in fewer than a thousand cases. **The proptest of the type invariant is the strongest possible statement that defensive coding works.**
2. **\`deposit_is_additive\` uses bounded ranges (\`0..1_000_000\`)**, not \`i64::MIN..i64::MAX\`. Why? Because we'd otherwise need to encode saturation into the property. With the bounded range, \`a + b ≤ 2_000_000\` never approaches \`i64::MAX\`, so saturation never fires and we can use exact equality. **Bound proptest inputs to the operating range where the property is simply expressible; let unit tests cover the boundary cases.** (The \`deposit_saturates_at_max\` unit test from L8 owns the saturation boundary; proptests own the arithmetic identity.)
3. **\`withdraw_amount_matches_balance_delta\` uses one of Rust's most powerful pattern-matching features — the or-pattern: \`Covered { amount } | PartiallyDrained { amount, .. }\`.** Distinct variants can share a single bind site as long as they expose the same field name and type (\`amount: i64\` here); Rust 1.53+ strengthened this to support nested or-patterns too. Both variants carry an \`amount\` field; the property is the same for both ("delta equals the reported \`amount\`"). The \`..\` skips the \`unfilled\` field on \`PartiallyDrained\` that we don't need. **Or-patterns flatten conditional logic when distinct variants share a payload field.**
4. **The proptest doesn't try to predict *which* variant fires.** Given \`initial=300, shortfall=500\`, the test doesn't compute "this should be \`PartiallyDrained\`"; it lets the method decide and then asserts the property. **Proptests assert properties, not paths.** A test that re-implements the method under test to predict its output isn't testing — it's a mirror.
5. **\`withdraw_amount_plus_unfilled_equals_shortfall\` has \`shortfall in 1..1_000_000\`** (positive only). The boundary at zero is \`Covered { amount: 0 }\` and falls into the conservation as \`0 + 0 = 0\`, but the property is most informative when there's actually a shortfall to conserve. Restricting the range puts the test on the meaningful regime. **Restrict input ranges to where the property *says* something.**
6. **No proptest covers "deposit followed by withdraw."** The \`deposit_after_drain_recovers\` unit test handles the sequenced case manually. Why isn't this a property? Because the property would need to thread \`(deposit_amount, balance_before_withdraw)\` into the assertion in a way that's hard to make readable — and the sequence is short enough that the unit test is more illustrative. **Use proptests for properties over arbitrary inputs; use unit tests for sequenced narratives.**
7. **All four proptests use \`prop_assert!\` / \`prop_assert_eq!\`, not \`assert!\`.** The \`prop_*\` macros emit shrinkage information when a test fails, so when proptest finds a counterexample it can report the *minimal* failing input. **Use the proptest-specific macros inside \`proptest!\` blocks; plain \`assert!\` defeats shrinkage.**
8. **The proptest block is at the *end* of the test module.** Unit tests fail fast and give precise messages; proptests give *distributions* of behavior. By putting proptests after unit tests, the failure stream — if anything goes wrong — leads with the most diagnostically useful information. **Order tests in the file by "highest signal-to-noise first."**

### Step 4: Run the tests

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

Expected output (abbreviated; 24 compute tests at the top, then insurance):

\`\`\`
running 45 tests
test compute::tests::close_flat_has_zero_qty ... ok
test compute::tests::close_long_with_sell ... ok
... (22 more compute tests)
test insurance::tests::balance_never_negative ... ok
test insurance::tests::default_is_empty ... ok
test insurance::tests::deposit_accumulates ... ok
test insurance::tests::deposit_after_drain_recovers ... ok
test insurance::tests::deposit_is_additive ... ok
test insurance::tests::deposit_negative_is_noop ... ok
test insurance::tests::deposit_saturates_at_max ... ok
test insurance::tests::deposit_zero_is_noop ... ok
test insurance::tests::empty_is_zero ... ok
test insurance::tests::new_with_negative_clamps_to_zero ... ok
test insurance::tests::new_with_positive_balance ... ok
test insurance::tests::new_with_zero_is_empty ... ok
test insurance::tests::withdraw_after_full_drain_is_depleted ... ok
test insurance::tests::withdraw_amount_matches_balance_delta ... ok
test insurance::tests::withdraw_amount_plus_unfilled_equals_shortfall ... ok
test insurance::tests::withdraw_covered_exact_balance ... ok
test insurance::tests::withdraw_covered_typical ... ok
test insurance::tests::withdraw_depleted_no_change ... ok
test insurance::tests::withdraw_negative_is_covered_noop ... ok
test insurance::tests::withdraw_partial_drains_to_zero ... ok
test insurance::tests::withdraw_zero_is_covered_noop ... ok

test result: ok. 45 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

**45 tests passing. The insurance fund module is byte-for-byte against \`260883b\`.** Stage 10b's stateful core is complete; only the close-outcome decomposition (\`liquidation_fee\`, \`solvent_close_outcome\`, \`underwater_close_outcome\`) remains for L10.

Common errors:

- **\`balance_never_negative\` fails with a shrunken counterexample like \`[(false, -100)]\`** — your \`withdraw_shortfall\` is treating negative \`shortfall\` as a deposit (subtracting a negative = adding). The defensive guard \`if shortfall <= 0 { return ... }\` must be the first guard, before any state mutation.
- **\`withdraw_amount_plus_unfilled_equals_shortfall\` fails on \`initial=300, shortfall=500\` with \`total=300\`** — your \`PartiallyDrained\` is only carrying \`amount\` and missing \`unfilled\`. Re-read the struct construction: both fields must be populated and their sum must equal \`shortfall\`.
- **\`withdraw_amount_matches_balance_delta\` fails on a Depleted case with \`delta=-N\`** — your \`withdraw_shortfall\` is mutating \`self.balance\` in the Depleted branch when it shouldn't. The branch should return immediately without touching state.
- **\`withdraw_covered_exact_balance\` passes but \`withdraw_partial_drains_to_zero\` fails with \`balance=300, expected 0\`** — your \`if self.balance >= shortfall\` branch is correct but your \`else\` branch forgot to set \`self.balance = 0\`. The partial-drain path always zeroes the balance.

## Design reflection

Three load-bearing decisions in this lesson:

1. **A three-variant outcome enum, not \`Option\` or \`Result\`.** \`Option<i64>\` could express "we paid out N or nothing," but it loses the distinction between "paid out everything we had" and "had nothing to pay." \`Result<i64, FundError>\` could carry both, but it tags the partial-drain case as a *failure*, which it isn't. **The right shape is the enum that matches the actual decision tree of the caller** — and the caller (Stage 10c's scanner) has three distinct routing decisions: log a successful absorb, log a partial absorb + escalate, log a depletion + escalate.

2. **The four-case early-return ladder.** Cases are checked in order of "is this trivially the answer?": negative shortfall (defensive), empty fund (no work possible), sufficient balance (happy path), partial drain (fallthrough). The ordering matters operationally: it's the *cost-ordered* sequence — cheapest check first, structural mutation last. **State-machine methods should evaluate guards in order of cost.**

3. **The proptest suite encodes invariants the type system can't.** \`balance_never_negative\` is the proptest of the L8 type invariant. \`withdraw_amount_plus_unfilled_equals_shortfall\` is the conservation law for the cascade math. \`deposit_is_additive\` proves the abelian-group structure of deposits. \`withdraw_amount_matches_balance_delta\` ties the variant payload to the observable state change. **Together, these four properties make every public method's contract a thing the test suite can *prove*, not just *probe*.**

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout 260883b
diff -u ~/code/my-openhl/crates/liquidation/src/insurance.rs ./crates/liquidation/src/insurance.rs
\`\`\`

After L9:
- **insurance.rs** matches Stage 10b's \`insurance.rs\` **byte-for-byte**. The full state machine — struct, enum, three constructors, accessor, deposit, withdraw_shortfall, Default impl, 12 unit tests, 4 proptests — is in the file.
- **lib.rs** was already byte-for-byte after L8.

If you also re-ran \`lib.rs\`'s \`mod\` ordering or re-export styling differently in L8, fix it now: the answer key lists \`pub mod compute; pub mod insurance; pub mod types;\` and \`pub use insurance::{InsuranceFund, WithdrawOutcome};\` on a single line. Minor whitespace differences are harmless.

## Common questions

**Q1: Why doesn't \`withdraw_shortfall\` take \`&mut self\` and return \`Result<i64, WithdrawOutcome>\` where the success case is the new balance and the "error" case carries escalation info?**

Because the cascade pattern needs the caller to *always* pattern-match. With a \`Result\`, the typical Rust idiom is \`let new_balance = f.withdraw_shortfall(s)?;\` — and \`?\` would short-circuit the scanner's loop on the very first partial drain, exactly when we *don't* want short-circuit (we want to keep scanning and absorb deposits from later events). Returning the variant by value forces the caller to think about each outcome explicitly. **The \`?\` operator is a poor fit for "successful with caveat" semantics.**

**Q2: Should \`Covered\`'s \`amount\` field equal \`shortfall\` (the request) or the previous balance minus the new balance (the delta)?**

They're identical in \`Covered\`'s eligibility window (\`shortfall ≤ balance\`), so both representations are correct. We pick \`shortfall\` because it matches the *caller's mental model* — they asked for X, they got X. The \`withdraw_amount_matches_balance_delta\` proptest verifies this is consistent. **When two representations are mathematically equal, pick the one that matches the caller's framing.**

**Q3: Why is the proptest input range \`0..1_000_000\` instead of \`i64::MIN..i64::MAX\`?**

For two reasons. (1) The interesting properties hold in the *operating* range; the boundary saturation cases are unit-tested separately (L8's \`deposit_saturates_at_max\`). (2) Wider ranges would force the properties to encode saturation logic in their assertions, making them harder to read. **Proptest ranges should match the regime where the property is simply expressible — boundary cases belong to unit tests.**

**Q4: Why no proptest for "if balance > 0, the next withdraw never returns Depleted"?**

Because that property is *trivially* a consequence of the code's structure — the \`if self.balance == 0\` guard fires only when balance is zero, and balance can only be zero after a covering or partial-draining withdraw. A property test for it would be testing the existence of the guard, not its consequences. **Proptests should test the *consequences* of the implementation, not its *structure*.**

**Q5: Could \`WithdrawOutcome\` be \`WithdrawResult\` with \`Covered\` as the \`Ok\` variant and the other two as \`Err\`?**

You could write it that way, but it conflates *categories of success* with *failure*. The cascade math says all three variants are "successful in their layer" — Covered absorbs at Layer 2, the other two correctly delegate to Layer 3. Calling them "errors" leaks Stage 10b's internal regime into Stage 10c's vocabulary. **Naming should reflect the architectural role; error vs success is a 1-bit distinction that this 3-bit decision tree doesn't fit.**

**Q6: The proptest \`balance_never_negative\` uses \`proptest::collection::vec(..., 0..20)\`. Why 20 and not 100?**

Two reasons. (1) 20 operations is enough to exercise every reachable transition in the state machine multiple times; longer sequences don't increase coverage. (2) Proptest's shrinker can shrink a 20-op failure case down to the minimal subsequence in a reasonable time; shrinking a 100-op failure can take seconds and produce a less-readable counterexample. **Pick proptest sizes for shrinkage cost, not for "more is better."**

## Next lesson (L10) — \`liquidation_fee\` + close-outcome decomposition

L10 returns to \`compute.rs\` and adds the three Stage 10b pure-compute functions that bridge \`compute\` and \`insurance\`: \`liquidation_fee(notional, params)\`, \`solvent_close_outcome(snapshot, mark, params)\`, and \`underwater_close_outcome(snapshot, mark, params)\`. Together they decompose every liquidation event into a \`(fund credit, residual to trader)\` or \`(fund debit, partial fee captured)\` tuple — exactly the shape the Stage 10c scanner needs to call \`InsuranceFund::deposit\` / \`InsuranceFund::withdraw_shortfall\` per close.

After L10, the \`compute\` and \`insurance\` modules talk to each other through the cascade math: pure functions produce the credit/debit numbers, the state machine accumulates them. L11 wraps this loop in the \`LiquidationScanner\` and the safety-net cascade has a runnable scanner.
`,
                },
                {
                  title: "Lesson 10 — liquidation_fee + close-outcome decomposition — the bridge between compute and insurance",
                  slug: "openhl-liquidation-close-outcome-decomposition-en",
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 35,
                  xpReward: 70,
                  content: `# Lesson 10 — \`liquidation_fee\` + close-outcome decomposition — the bridge between \`compute\` and \`insurance\`

## Goal

Concepts you'll grasp in this lesson:

- **Every liquidation event decomposes into a \`(fund movement, account residual)\` pair.** A solvent close credits the fund and returns positive residual to the trader. An underwater close debits the fund and (sometimes) collects a partial fee. The two functions in this lesson encode that decomposition once, so Stage 10c's scanner can call \`InsuranceFund::deposit\` and \`InsuranceFund::withdraw_shortfall\` against the *exact* numbers the math produces. **Pure compute produces credit/debit; state machine accumulates them.**
- **\`debug_assert!\` as a routing contract.** \`solvent_close_outcome\` and \`underwater_close_outcome\` are *non-overlapping*: each one debug-asserts that the *other* one wasn't the right call. The pair is a discriminated dispatch where the caller has the routing obligation; the functions are total only within their precondition window. **Debug-asserts document the contract that the type system can't.**
- **\`fee.saturating_sub(post_close_equity)\` when \`post_close_equity\` is negative.** This is the cleanest piece of arithmetic in the lesson: \`i64 − (negative i64) = i64 + |negative i64|\`. The "already-underwater" sub-case reuses the same expression as the "partial fee" sub-case because subtraction of a negative value adds the magnitude. **One expression covers both branches of an \`if\` ladder when the operands are signed.**
- **Two distinct return types, not \`Result\` or one enum.** \`SolventClose { fee_to_fund, residual_to_account }\` and \`UnderwaterClose { fee_to_fund, shortfall_to_fund }\` have the same \`fee_to_fund\` field but completely different second fields. The semantic difference (residual flows *out* to trader, shortfall flows *in* from fund) is heavy enough that one enum with \`Option<i64>\` shoving these through one slot would obscure the dispatch. **When two paths produce categorically different field semantics, two struct types beat one enum.**

Verification:

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

…passes 55 tests (34 compute + 21 insurance). The full Stage 10b crate is byte-for-byte against \`260883b\` after L10.

Specific changes:

- **\`src/types.rs\`** — adds \`SolventClose\` and \`UnderwaterClose\` structs with their doc comments.
- **\`src/compute.rs\`** — adds \`liquidation_fee\`, \`solvent_close_outcome\`, \`underwater_close_outcome\`, plus 10 new unit tests (4 fee + 3 solvent + 3 underwater).
- **\`src/lib.rs\`** — extends the compute re-export to include the three new functions; extends the types re-export to include \`SolventClose\` + \`UnderwaterClose\`.

L10 closes Stage 10b. After this lesson the answer-key diff against \`260883b\` is fully clean across all three liquidation crate files.

## Recap

After L9:
- \`insurance.rs\` is byte-for-byte against \`260883b\` — the \`InsuranceFund\` state machine + \`WithdrawOutcome\` enum + all 12 unit tests + 4 proptests are in place.
- \`lib.rs\` re-exports \`InsuranceFund\` and \`WithdrawOutcome\`.
- \`cargo test\` runs 45 tests, all green.
- The fund *can* receive deposits and surface drains, but **nothing yet computes how much to deposit or drain on a given close.**

L10 closes that gap. The three new compute functions are the numeric source-of-truth that Stage 10c's scanner will feed into the state machine.

## Plan

Four edits:

1. **Add \`SolventClose\` + \`UnderwaterClose\` structs to \`crates/liquidation/src/types.rs\`** — two simple two-field structs, both \`#[derive(Clone, Copy, Debug, PartialEq, Eq)]\`.
2. **Add three functions to \`crates/liquidation/src/compute.rs\`**:
   - \`liquidation_fee(closed_notional, params)\` — pure fee math with i128 intermediate.
   - \`solvent_close_outcome(snapshot, mark, params)\` — \`SolventClose\` for accounts where post-close equity covers the fee.
   - \`underwater_close_outcome(snapshot, mark, params)\` — \`UnderwaterClose\` for accounts where it doesn't.
3. **Add 10 unit tests to the existing \`#[cfg(test)] mod tests\`** in compute.rs.
4. **Extend \`crates/liquidation/src/lib.rs\`** — re-export the three new functions and the two new types.

> 🛑 **Predict.** Before reading further: a trader holds 1 BTC long, entry $100k, $10k collateral. The position is force-closed at $80,500 (a $19,500 loss). The Hyperliquid-default \`liquidation_fee_bps\` is 150 (1.5%). Question: **does the insurance fund credit or debit on this close, and by how much?**

(Answer: **The fund debits — it must absorb a $10,707 shortfall.** Walk through: notional at close is $80,500. Fee = $80,500 × 150 / 10,000 = $1,207.50, rounded to $1,207 (integer math). The trader's realized PnL is −$19,500, so post-close equity = $10,000 collateral + (−$19,500 PnL) = −$9,500 — already underwater *before* the fee. No fee is collected (you can't bill a negative balance), and the fund must cover both the desired fee *and* the negative equity: $1,207 + $9,500 = $10,707. This is the \`underwater_close_outcome\` "already underwater" sub-case, and it's identical to the scenario from the Perp Primer L3 lesson — the same numbers reappear in code form here.)

The decomposition picture for L10:

\`\`\`
   ┌────────────────────────────────────────────────────────────┐
   │  Per-close decomposition produced by Stage 10b compute     │
   ├────────────────────────────────────────────────────────────┤
   │                                                            │
   │  SOLVENT path                                              │
   │  ───────────                                               │
   │  post_close_equity ≥ fee  →  SolventClose {                │
   │                                fee_to_fund:           +X   │  ──→ flows INTO Fund
   │                                residual_to_account:   +Y   │  ←── flows back to Trader
   │                              }                             │
   │                                                            │
   │  Stage 10c scanner uses:                                   │
   │    fund.deposit(fee_to_fund)                ← Layer 2 grow  │
   │    trader_balance += residual_to_account    ← refund        │
   │                                                            │
   ├────────────────────────────────────────────────────────────┤
   │                                                            │
   │  UNDERWATER path (two sub-cases under one shape)           │
   │  ────────────────                                          │
   │  0 < post_close_equity < fee  →  UnderwaterClose {         │
   │      (partial fee)                 fee_to_fund:       +X   │  ──→ flows INTO Fund
   │                                    shortfall_to_fund: +Y   │  ←── pulled FROM Fund
   │                                  }                         │
   │                                                            │
   │  post_close_equity ≤ 0       →  UnderwaterClose {          │
   │      (already underwater)          fee_to_fund:        0   │
   │                                    shortfall_to_fund: +Z   │  ←── pulled FROM Fund
   │                                  }                         │
   │                                                            │
   │  Stage 10c scanner uses:                                   │
   │    fund.deposit(fee_to_fund)            ← may be 0          │
   │    fund.withdraw_shortfall(shortfall_to_fund)               │
   │      ↑ returns WithdrawOutcome (L9)                         │
   │      ↑ Depleted/PartiallyDrained variants escalate to ADL   │
   │                                                            │
   └────────────────────────────────────────────────────────────┘
\`\`\`

Three things to notice about the diagram:

1. **\`SolventClose\` outputs flow *out* of the system; \`UnderwaterClose\` outputs flow *in* from the system.** Residual returns to the trader (positive flow toward the account); shortfall pulls from the fund (positive flow toward the close). Same magnitude shape (\`i64 ≥ 0\`), opposite direction. **The *direction* of money flow lives in the field name, not in the sign.**
2. **\`UnderwaterClose\` has two sub-cases that compile to one shape.** A single struct with two \`i64\` fields covers both "partial fee, partial shortfall" and "zero fee, full shortfall." The struct doesn't need an internal \`kind\` discriminator because the *value* of \`fee_to_fund\` (zero or positive) carries the distinction. **Don't tag a sub-case if a field value already tells you which one fired.**
3. **The decomposition is what makes Stage 10c possible.** The scanner doesn't need to know *why* a close is solvent or underwater — only that it gets back two i64s with named semantics. **A clean decomposition between math and state lets the state-machine layer stay dumb.**

## Walk-through

### Step 1: Add \`SolventClose\` + \`UnderwaterClose\` to \`src/types.rs\`

Open \`crates/liquidation/src/types.rs\`. After the existing \`CloseOrderSpec\` definition, add:

\`\`\`rust
/// Solvent-close outcome (Stage 10b).
///
/// Produced by [\`crate::compute::solvent_close_outcome\`] for a Liquidatable
/// account whose post-close equity covers the liquidation fee in full.
/// Both fields are non-negative.
///
/// \`fee_to_fund\` is credited to the insurance fund; \`residual_to_account\`
/// is returned to the trader's collateral balance.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct SolventClose {
    /// Fee deducted from collateral and credited to the insurance fund.
    pub fee_to_fund: i64,
    /// What's returned to the trader's collateral after the close + fee.
    pub residual_to_account: i64,
}

/// Underwater-close outcome (Stage 10b).
///
/// Produced by [\`crate::compute::underwater_close_outcome\`] when the
/// account's post-close equity cannot cover the full liquidation fee.
///
/// Covers two sub-cases under one shape:
///   - Post-close equity is positive but smaller than the desired fee
///     (Liquidatable account whose close + fee turned underwater): the
///     remaining equity is paid as a partial fee, the uncollected portion
///     becomes the shortfall.
///   - Post-close equity is already negative (Underwater account): no fee
///     is collected, the full desired fee plus the negative equity becomes
///     the shortfall.
///
/// Both fields are non-negative; \`fee_to_fund\` may be \`0\` in the
/// negative-equity case.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct UnderwaterClose {
    /// Partial fee collected from any positive post-close equity, credited
    /// to the insurance fund. May be \`0\`.
    pub fee_to_fund: i64,
    /// What the insurance fund must absorb so the close completes. The
    /// caller hands this to [\`crate::insurance::InsuranceFund::withdraw_shortfall\`].
    pub shortfall_to_fund: i64,
}
\`\`\`

Four things to notice about these types:

1. **Both fields in both structs are \`i64\`, not \`u64\`** — same type-uniformity reasoning as L8's \`InsuranceFund::balance\`. The whole crate computes in \`i64\`; the structs document non-negativity in their doc comments instead. **Type uniformity inside a crate compounds over time; per-field unsignedness is local convenience that costs casts at every boundary.**
2. **Same derive set on both: \`Clone + Copy + Debug + PartialEq + Eq\`** — same set as \`WithdrawOutcome\` and \`InsuranceFund\`. These are 16-byte POD types; values are cheaper than references. **Pure-value types in this crate use one consistent derive list. Predictability is its own virtue.**
3. **Doc comments name the *destination* of each field, not the *source*.** \`fee_to_fund\` says where it goes (insurance fund), not where it came from (trader's collateral). \`shortfall_to_fund\` says where it goes (paid *to* the close from the fund), not the negative-equity arithmetic that produced it. **Name fields by what the caller does with them, not by how the producer computed them.**
4. **\`UnderwaterClose\` carries \`shortfall_to_fund\` even though \`fee_to_fund\` is sometimes zero.** The field is always present in the struct regardless of which sub-case fired. The caller pattern-matches on the *value* (\`if shortfall_to_fund > 0 { fund.withdraw_shortfall(...) }\`), not on the struct shape. **Total field presence > sub-case-specific shape; the caller does one match against zero.**

### Step 2: Add \`liquidation_fee\` to \`src/compute.rs\`

Open \`crates/liquidation/src/compute.rs\`. After the \`saturate_i128_to_i64\` helper (at the bottom of the helper section, before any tests), add:

\`\`\`rust
/// Liquidation fee on a closed notional, in quote units.
///
/// \`fee = notional × fee_bps / MARGIN_SCALE\`, saturating on overflow.
/// Pure math — the caller (Stage 10c scanner / bridge) supplies the
/// actual fill notional from the matching engine.
///
/// Returns \`0\` for a zero notional (flat positions; should never reach
/// the engine but symbol-completeness pays off in proptest).
#[must_use]
pub fn liquidation_fee(closed_notional: u64, params: &LiquidationParams) -> i64 {
    if closed_notional == 0 {
        return 0;
    }
    let bps = i128::from(params.liquidation_fee_bps);
    let n = i128::from(closed_notional);
    let scaled = n.saturating_mul(bps);
    let fee = scaled / i128::from(MARGIN_SCALE);
    saturate_i128_to_i64(fee)
}
\`\`\`

Five things to notice:

1. **\`closed_notional: u64\` (input), \`-> i64\` (output).** Notional is always non-negative — it's a magnitude (price × |size|). The output is signed because the rest of the crate's arithmetic is signed; the fee will be subtracted from the trader's equity via \`i64\` subtraction, and forcing a \`u64 → i64\` cast at the call site would clutter the scanner. **Unsignedness at the input boundary captures the domain fact; signedness at the output matches the surrounding arithmetic.**
2. **The fast-path return for \`closed_notional == 0\`.** Skips three \`i128\` conversions and a saturating multiply for a value that's almost always going to be zero (flat positions don't reach the close path, but the scanner can still call this defensively). **Cheap predicates that handle the dominant zero case earn their keep.**
3. **\`i128::from(...)\` instead of \`as i128\`.** \`From\` is infallible by construction — \`u64 → i128\` and \`u32 → i128\` are both widening conversions that can never lose data. Using \`From\` makes the intent explicit and prevents accidental \`as\` from sneaking into narrowing positions later. **In code that talks to consensus arithmetic, \`From\` for widening is the default; reserve \`as\` for narrowing where you control the bit-width.**
4. **\`saturating_mul\` on the i128 product.** Even \`i128\` can overflow on \`u64::MAX × u32::MAX\` (the pathological case the \`fee_saturates_on_pathological_input\` test fires); saturating-mul caps at \`i128::MAX\`, which then gets saturated again to \`i64::MAX\` by the helper. **Two layers of saturation in series is fine — each one defends against the next.**
5. **No \`saturating_div\`.** Integer division on i128 doesn't overflow (except \`i128::MIN / -1\`, which is unreachable here because numerator and denominator are both non-negative). Using plain \`/\` is correct and the alternative would just be ceremony. **Saturating operations are for arithmetic that *can* overflow; division of two non-negative operands cannot, so don't decorate it.**

### Step 3: Add \`solvent_close_outcome\` to \`src/compute.rs\`

Append below \`liquidation_fee\`:

\`\`\`rust
/// Solvent-close outcome — the trader's collateral plus realized \`PnL\`
/// covers the liquidation fee in full, with positive residual returning
/// to the account.
///
/// **Precondition** (debug-asserted): the account is Liquidatable AND the
/// post-close equity (= collateral + realized \`PnL\` at \`close_price\`)
/// covers the desired fee. If the precondition is violated, the result
/// has \`residual_to_account ≤ 0\` — caller should have routed to
/// [\`underwater_close_outcome\`] instead.
///
/// Stage 10b never mutates state — this is pure compute that produces
/// the credit/debit pair for the caller (Stage 10c scanner) to apply
/// against [\`crate::insurance::InsuranceFund\`] and the trader's balance.
#[must_use]
pub fn solvent_close_outcome(
    snapshot: &AccountSnapshot,
    close_price: MarkPrice,
    params: &LiquidationParams,
) -> SolventClose {
    let notional = notional_value(snapshot, close_price);
    let fee = liquidation_fee(notional, params);
    let post_close_equity = account_equity(snapshot, close_price);
    debug_assert!(
        post_close_equity >= fee,
        "solvent_close_outcome called with post_close_equity={post_close_equity} < fee={fee}; \\
         caller should route to underwater_close_outcome instead",
    );
    SolventClose {
        fee_to_fund: fee,
        residual_to_account: post_close_equity.saturating_sub(fee),
    }
}
\`\`\`

Six things to notice:

1. **The function *composes three pre-existing functions* from Stage 10a.** \`notional_value\`, \`liquidation_fee\` (added in Step 2), and \`account_equity\` are all called inline. There's no new math; the function is a *routing* function that produces a packaged outcome from three existing primitives. **High-level outcome functions should compose low-level math, not duplicate it.**
2. **\`debug_assert!\` is the contract.** The precondition (\`post_close_equity >= fee\`) is the *routing decision* the caller already made: "this is a solvent close." Calling \`solvent_close_outcome\` when the close is underwater is a *caller bug*, not a runtime branch — and \`debug_assert!\` fires in debug builds while compiling out in release. **The \`debug_assert!\` doesn't change runtime behaviour; it catches caller bugs during development and disappears in production.**
3. **The error message in \`debug_assert!\` includes the *named values*.** A developer who triggers this assertion sees \`post_close_equity=-500 < fee=1207\`, not just a line number. With format-string captures (\`{post_close_equity}\`), the message has zero string-allocation overhead in the success path. **Format-string captures in assertion messages cost nothing when the assertion passes; they pay back enormously when it fails.**
4. **\`post_close_equity.saturating_sub(fee)\` even though the assertion guarantees \`equity ≥ fee\`.** Why? Because release builds don't fire \`debug_assert!\`. If a caller bug skips the assertion in release, plain \`-\` would still complete the subtraction, but a different bug elsewhere (e.g., \`equity\` being \`i64::MIN\` due to upstream overflow) could underflow \`equity - fee\`. Saturation gives us a clamped i64 in every case. **Saturating arithmetic is the belt-and-braces complement to \`debug_assert!\`; together they cover dev *and* prod.**
5. **The function takes \`params: &LiquidationParams\` by reference, not by value.** \`LiquidationParams\` is \`Copy + 12 bytes\`; passing by value would be marginally cheaper, but every other compute function in the crate takes it by reference, so consistency wins. **Match the calling convention of sibling functions.**
6. **No return-by-tuple.** We could return \`(i64, i64)\` and let the caller decide which is which. Returning \`SolventClose\` with named fields makes the dispatch at the call site self-documenting and prevents a future mistake where someone swaps the field order. **Named-field structs beat tuples whenever the call site has to remember "what was the second one again?"**

### Step 4: Add \`underwater_close_outcome\` to \`src/compute.rs\`

Append below \`solvent_close_outcome\`:

\`\`\`rust
/// Underwater-close outcome — the account's post-close equity cannot
/// cover the liquidation fee, so the insurance fund must absorb the
/// shortfall.
///
/// Handles both sub-cases under one shape:
///   - Positive but insufficient post-close equity (Liquidatable account
///     whose close + fee turned underwater): the equity is paid as a
///     partial fee, the rest becomes the shortfall.
///   - Negative post-close equity (Underwater account before fee): no
///     fee is collected, the entire fee plus \`|equity|\` becomes the
///     shortfall.
///
/// **Precondition** (debug-asserted): \`post_close_equity < fee_desired\` —
/// otherwise the close is solvent and the caller should have routed to
/// [\`solvent_close_outcome\`].
#[must_use]
pub fn underwater_close_outcome(
    snapshot: &AccountSnapshot,
    close_price: MarkPrice,
    params: &LiquidationParams,
) -> UnderwaterClose {
    let notional = notional_value(snapshot, close_price);
    let fee = liquidation_fee(notional, params);
    let post_close_equity = account_equity(snapshot, close_price);
    debug_assert!(
        post_close_equity < fee,
        "underwater_close_outcome called with post_close_equity={post_close_equity} ≥ fee={fee}; \\
         caller should route to solvent_close_outcome instead",
    );

    if post_close_equity > 0 {
        // Partial fee: equity covers some but not all of the desired fee.
        UnderwaterClose {
            fee_to_fund: post_close_equity,
            shortfall_to_fund: fee.saturating_sub(post_close_equity),
        }
    } else {
        // Already underwater (equity ≤ 0). No fee collected; fund covers
        // the full fee plus the negative equity. \`fee - negative_equity\`
        // is \`fee + |equity|\` via saturating_sub semantics.
        UnderwaterClose {
            fee_to_fund: 0,
            shortfall_to_fund: fee.saturating_sub(post_close_equity),
        }
    }
}
\`\`\`

Seven things to notice:

1. **The two sub-case branches share the same \`shortfall_to_fund\` expression: \`fee.saturating_sub(post_close_equity)\`.** In the partial-fee case, \`equity\` is positive and the subtraction yields the uncollected portion. In the already-underwater case, \`equity\` is negative or zero and the subtraction becomes \`fee - negative = fee + |equity|\`. Concretely, with \`fee = 1207\` and \`post_close_equity = -9500\`:

   \`\`\`
   1207 - (-9500) = 1207 + 9500 = 10707
   \`\`\`

   — and the code reaches this answer without \`.abs()\`, an explicit \`+\`, or a branch on the sign. **One expression covers both branches because integer subtraction of a negative value is addition of its magnitude.** This is the cleanest piece of arithmetic in the lesson — a junior reader will see it twice and *think* it's a bug; a senior reader will see it and understand why the function works. (The code comment in Step 4 uses \`negative_equity\` as a *concept name* for \`post_close_equity\` when it's negative — it's not a separate variable.)
2. **The \`if post_close_equity > 0\` branch is *strict greater-than*.** A post-close equity of exactly zero falls into the \`else\` (already-underwater) branch, where \`fee_to_fund = 0\`. That matches the semantics: there's nothing to *collect* if collateral is exhausted. **Strict greater-than at boundary predicates routes zero into the "no work" branch.**
3. **\`fee_to_fund\` differs between branches; \`shortfall_to_fund\` does not.** This asymmetry is intentional: the *fee collection* depends on whether equity is positive, but the *shortfall* is always \`fee - equity\` (where negative equity adds to the shortfall). **When two branches share part of their work, factor the shared expression out only if the saving is greater than the readability cost.** Here, an early \`let shortfall = fee.saturating_sub(post_close_equity);\` would save 12 characters and lose the inline visual symmetry; we keep the duplication.
4. **The \`else\` branch doesn't \`match\` on equity = 0 vs equity < 0 separately.** Both cases produce identical outputs (\`fee_to_fund = 0, shortfall = fee - equity\`), so they share a branch. **Code paths whose outputs collapse to one expression share one branch.**
5. **The doc comment is *the* user-facing summary** of when each sub-case fires. The walked-through reader will jump from this function back to the doc comment when they later use the function elsewhere; the doc has to stand alone without the body for context. **Doc comments are read by the *consumer* of the function, who doesn't have your body open.**
6. **\`debug_assert!\` flips its predicate from \`solvent_close_outcome\`.** That's deliberate: the assertions form a *non-overlapping cover* of the input space. Together, \`solvent ⇔ equity ≥ fee\` and \`underwater ⇔ equity < fee\` exhaustively partition the input space. The pair is a discriminated dispatch, and the assertions prove it. **Pairing two pure functions with opposite preconditions is a discriminated dispatch by convention — the type system can't help here, but the pair of asserts does.**
7. **No early return on \`post_close_equity == 0\`.** A reader might think we should add a fast path for "exactly at zero" since it's a common boundary. We don't — because the \`else\` branch already produces the correct answer, and the branch evaluation cost is one comparison. **Don't add boundary fast-paths unless the math actually differs at the boundary.**

> 🛑 **Anti-fluency.** "Why not collapse \`solvent_close_outcome\` and \`underwater_close_outcome\` into one function returning \`Result<SolventClose, UnderwaterClose>\`?" Three problems. (1) Neither outcome is an error — both are *successful* closes that route to different state-machine operations. (2) Stage 10c's scanner calls the *appropriate one* based on a margin-health check the scanner *already did*; routing the dispatch through \`Result\` re-does the work the scanner already did. (3) The \`debug_assert!\` pair is more meaningful with two separate functions because each function declares its own contract — a single function with one return type can't express "this side of the partition is correct only here." **Two functions with opposite preconditions express discriminated dispatch better than one function returning a tagged union.**

### Step 5: Add the 10 unit tests to compute.rs

Inside the existing \`#[cfg(test)] mod tests\` block, add three test sections after the existing L7 close-order-spec tests:

\`\`\`rust
    // ─── Stage 10b: liquidation_fee ────────────────────────────────

    #[test]
    fn fee_basic() {
        // 1.5% of $80,400 = $1,206 — matches the Perp Primer L3 example.
        let params = LiquidationParams::hyperliquid_default();
        assert_eq!(liquidation_fee(80_400, &params), 1_206);
    }

    #[test]
    fn fee_zero_notional() {
        let params = LiquidationParams::hyperliquid_default();
        assert_eq!(liquidation_fee(0, &params), 0);
    }

    #[test]
    fn fee_zero_bps() {
        // No fee if the network params zero it out.
        let params = LiquidationParams {
            initial_margin_bps: 1_000,
            maintenance_margin_bps: 200,
            liquidation_fee_bps: 0,
        };
        assert_eq!(liquidation_fee(1_000_000, &params), 0);
    }

    #[test]
    fn fee_saturates_on_pathological_input() {
        // notional × bps would overflow i64 but saturates inside i128.
        let params = LiquidationParams {
            initial_margin_bps: 1_000,
            maintenance_margin_bps: 200,
            liquidation_fee_bps: u32::MAX,
        };
        let fee = liquidation_fee(u64::MAX, &params);
        assert_eq!(fee, i64::MAX);
    }

    // ─── Stage 10b: solvent_close_outcome ──────────────────────────

    #[test]
    fn solvent_close_typical_liquidatable() {
        // 1 BTC long, entry $100k, $10k collateral, close at $95k.
        //   notional = 95_000; fee = 95_000 × 150 / 10_000 = 1_425
        //   realized_pnl = (95_000 − 100_000) × 1 = −5_000
        //   post_close_equity = 10_000 − 5_000 = 5_000
        //   residual = 5_000 − 1_425 = 3_575
        let s = snapshot(1, 100_000, 10_000);
        let params = LiquidationParams::hyperliquid_default();
        let outcome = solvent_close_outcome(&s, MarkPrice(95_000), &params);
        assert_eq!(outcome.fee_to_fund, 1_425);
        assert_eq!(outcome.residual_to_account, 3_575);
    }

    #[test]
    fn solvent_close_short_profit() {
        // Short −1, entry $100k, $10k collateral, close at $90k (favorable!).
        //   notional = 1 × 90_000 = 90_000; fee = 1_350
        //   realized_pnl = (90_000 − 100_000) × (−1) = +10_000
        //   post_close_equity = 10_000 + 10_000 = 20_000
        //   residual = 20_000 − 1_350 = 18_650
        let s = snapshot(-1, 100_000, 10_000);
        let params = LiquidationParams::hyperliquid_default();
        let outcome = solvent_close_outcome(&s, MarkPrice(90_000), &params);
        assert_eq!(outcome.fee_to_fund, 1_350);
        assert_eq!(outcome.residual_to_account, 18_650);
    }

    #[test]
    fn solvent_close_fee_consumes_all_residual() {
        // Edge: post_close_equity exactly equals fee. residual = 0.
        // Construct: size=1, entry=10_000, collateral=10, mark=10_000.
        //   notional = 10_000; fee = 150
        //   pnl = 0; post_close_equity = 10 (collateral only)
        // For fee == equity exactly: need fee = collateral when pnl = 0.
        //   fee = notional × 150 / 10_000 = notional × 0.015
        //   notional = collateral / 0.015
        // Pick collateral=150, then notional must be 10_000.
        let s = snapshot(1, 10_000, 150);
        let params = LiquidationParams::hyperliquid_default();
        let outcome = solvent_close_outcome(&s, MarkPrice(10_000), &params);
        assert_eq!(outcome.fee_to_fund, 150);
        assert_eq!(outcome.residual_to_account, 0);
    }

    // ─── Stage 10b: underwater_close_outcome ────────────────────────

    #[test]
    fn underwater_close_already_underwater_pre_fee() {
        // Perp Primer L3 scenario: 1 BTC long, entry $100k, $10k collateral,
        // close at $80,500. Realized PnL = −$19,500, post_close_equity = −$9,500.
        // Notional = $80,500; fee = 1_207 (80_500 × 150 / 10_000)
        // shortfall = fee − post_close_equity = 1_207 − (−9_500) = $10,707
        let s = snapshot(1, 100_000, 10_000);
        let params = LiquidationParams::hyperliquid_default();
        let outcome = underwater_close_outcome(&s, MarkPrice(80_500), &params);
        assert_eq!(outcome.fee_to_fund, 0);
        assert_eq!(outcome.shortfall_to_fund, 1_207 + 9_500);
    }

    #[test]
    fn underwater_close_partial_fee_collection() {
        // Liquidatable account whose close + fee just barely turns underwater.
        // 1 BTC long, entry $100k, $10k collateral, close at $90,500.
        //   notional = $90,500; fee = 1_357 (90_500 × 150 / 10_000)
        //   realized_pnl = −$9,500; post_close_equity = $500
        //   post_close_equity (500) < fee (1357) → underwater branch
        //   fee_to_fund = 500 (partial fee from positive equity)
        //   shortfall = 1_357 − 500 = 857
        let s = snapshot(1, 100_000, 10_000);
        let params = LiquidationParams::hyperliquid_default();
        let outcome = underwater_close_outcome(&s, MarkPrice(90_500), &params);
        assert_eq!(outcome.fee_to_fund, 500);
        assert_eq!(outcome.shortfall_to_fund, 1_357 - 500);
    }

    #[test]
    fn underwater_close_zero_equity_at_fee() {
        // Edge: post_close_equity exactly 0 (collateral fully eaten by losses).
        // 1 BTC long, entry $100k, $10k collateral, close at $90k → pnl = −10k,
        // equity = 0. fee = 1_350. shortfall = full fee.
        let s = snapshot(1, 100_000, 10_000);
        let params = LiquidationParams::hyperliquid_default();
        let outcome = underwater_close_outcome(&s, MarkPrice(90_000), &params);
        assert_eq!(outcome.fee_to_fund, 0);
        assert_eq!(outcome.shortfall_to_fund, 1_350);
    }
\`\`\`

Seven things to notice about the test design:

1. **Section dividers match the function names** — \`liquidation_fee\`, \`solvent_close_outcome\`, \`underwater_close_outcome\`. Same grep-friendly grouping discipline as L9. **Group tests by the function they exercise; let the file structure document the API.**
2. **\`fee_basic\` uses Perp Primer L3 numbers.** $80,400 × 1.5% = $1,206 is the same calculation the Perp Primer L3 lesson walked through conceptually. Seeing the same numbers in concrete code is **curriculum-to-implementation reinforcement** — the reader who came in through the Primer feels the abstraction landing on real arithmetic.
3. **\`fee_zero_bps\` constructs \`LiquidationParams\` inline** instead of using the \`hyperliquid_default()\`. Why? Because the default has \`liquidation_fee_bps = 150\`, and the test needs \`bps = 0\`. **When a parameter under test diverges from the default, construct the params inline rather than mutating the default.** It makes the test's intent visible at the top.
4. **\`fee_saturates_on_pathological_input\` uses both \`u64::MAX\` and \`u32::MAX\`.** That's the only test that exercises the i128 saturation path. The math: \`u64::MAX × u32::MAX ≈ 2^96\`, which fits in i128 but would catastrophically overflow \`i64\`. The saturating-mul caps at \`i128::MAX\`, then the final saturate-to-i64 yields \`i64::MAX\`. **The pathological input test is the *only* place this code path runs; without it, the saturation is dead-code-equivalent.**
5. **\`solvent_close_short_profit\` exists as a complement to the long-loss case.** Long → loss → solvent close is the expected scenario; short → profit → solvent close ("favorable" liquidation) is the case where a trader gets *more* back than they put in. Both produce a \`SolventClose\` with the same struct shape, but the residual numbers are wildly different (3,575 vs 18,650). **Tests must cover both signs of every signed-input function.**
6. **\`solvent_close_fee_consumes_all_residual\` has *the comment that explains the construction*.** The math to find inputs where \`post_close_equity == fee\` requires solving \`fee = notional × 150 / 10_000\`. The comment in the test walks the reader through the construction. **A test whose values look magic deserves a comment explaining why they're those values.**
7. **\`underwater_close_already_underwater_pre_fee\` reuses the Perp Primer L3 numbers.** Same $100k entry, $10k collateral, close at $80,500, same $19,500 PnL — the conceptual scenario from the Primer now produces a \`UnderwaterClose\` with \`fee_to_fund: 0, shortfall_to_fund: 10_707\` against the answer-key code. **Curriculum reinforcement compounds across the course; reusing the Primer's numbers in L10 closes the loop.**

### Step 6: Update \`src/lib.rs\`

Extend the existing re-exports. Find the \`pub use compute::{ ... };\` block and extend it. Was (after L7):

\`\`\`rust
pub use compute::{
    account_equity, close_order_spec, margin_health, margin_ratio, notional_value, unrealized_pnl,
};
\`\`\`

Becomes:

\`\`\`rust
pub use compute::{
    account_equity, close_order_spec, liquidation_fee, margin_health, margin_ratio,
    notional_value, solvent_close_outcome, underwater_close_outcome, unrealized_pnl,
};
\`\`\`

Then extend the \`pub use types::{ ... };\` block. Was:

\`\`\`rust
pub use types::{
    AccountSnapshot, CloseOrderSpec, LiquidationParams, MarginHealth, MarginRatio, MARGIN_SCALE,
};
\`\`\`

Becomes:

\`\`\`rust
pub use types::{
    AccountSnapshot, CloseOrderSpec, LiquidationParams, MarginHealth, MarginRatio, SolventClose,
    UnderwaterClose, MARGIN_SCALE,
};
\`\`\`

Three new function names (\`liquidation_fee\`, \`solvent_close_outcome\`, \`underwater_close_outcome\`) and two new type names (\`SolventClose\`, \`UnderwaterClose\`), all inserted alphabetically. After L10, the crate's public surface includes 9 compute functions and 8 types.

### Step 7: Run the tests

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

Expected output (abbreviated):

\`\`\`
running 55 tests
test compute::tests::close_flat_has_zero_qty ... ok
test compute::tests::close_long_with_sell ... ok
... (8 Stage 10a tests)
test compute::tests::fee_basic ... ok
test compute::tests::fee_saturates_on_pathological_input ... ok
test compute::tests::fee_zero_bps ... ok
test compute::tests::fee_zero_notional ... ok
... (more compute)
test compute::tests::solvent_close_fee_consumes_all_residual ... ok
test compute::tests::solvent_close_short_profit ... ok
test compute::tests::solvent_close_typical_liquidatable ... ok
test compute::tests::underwater_close_already_underwater_pre_fee ... ok
test compute::tests::underwater_close_partial_fee_collection ... ok
test compute::tests::underwater_close_zero_equity_at_fee ... ok
... (insurance tests from L8 + L9)

test result: ok. 55 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

**55 tests passing. Stage 10b is complete.** The full crate — \`compute.rs\`, \`insurance.rs\`, \`types.rs\`, \`lib.rs\` — is byte-for-byte against \`260883b\`. Pure math, stateful fund, and decomposition outcomes all sit alongside each other.

Common errors:

- **\`underwater_close_already_underwater_pre_fee\` fails with \`shortfall_to_fund: 1_207 - 9_500\` (i.e. negative).** You wrote \`fee - post_close_equity\` with a plain \`i64 - i64\`, which works arithmetically, but you got the sign of the subtraction wrong: it should be \`fee.saturating_sub(post_close_equity)\` = \`1_207 - (-9_500)\` = \`+10_707\`. Re-read the doc comment on \`fee.saturating_sub(post_close_equity)\`: the trick is that subtracting a negative adds the magnitude.
- **\`underwater_close_partial_fee_collection\` fails with \`fee_to_fund: 0, shortfall_to_fund: 1_357\`** — you wrote the \`if\` branch as \`>=\` instead of \`>\`. With \`>=\`, equity = 0 routes into the partial-fee branch (still produces correct math: \`fee_to_fund = 0, shortfall = fee - 0 = fee\`), but with the wrong intent. The doc says "positive but insufficient" — strictly positive.
- **\`solvent_close_typical_liquidatable\` panics with the debug-assert message.** Your \`account_equity\` or \`notional_value\` from L4/L5 is returning a wrong sign. The expected \`post_close_equity\` is +$5,000; if you're getting something else, walk through the Stage 10a math and fix the upstream function first.
- **\`fee_saturates_on_pathological_input\` fails with overflow panic.** You wrote \`n * bps\` (plain \`*\`) instead of \`n.saturating_mul(bps)\`. \`i128\` overflow on multiplication still panics in debug.

## Design reflection

Three load-bearing decisions in this lesson:

1. **The \`(fund movement, account outcome)\` decomposition is what makes the cascade composable.** Stage 10c's scanner is fundamentally a loop: for each Liquidatable account, decide solvent vs. underwater, call the right outcome function, route the credits/debits to the fund and trader. That loop is trivial *because* L10 packaged the math into two functions with named-field outputs. **A clean decomposition between math and state lets the state-machine layer stay dumb.**

2. **\`debug_assert!\` is the contract; \`saturating_sub\` is the seatbelt.** The assertion documents the precondition and catches caller bugs in development. The saturation catches the same bug in production (where assertions compile out) and clamps it to a sane value. **Neither is sufficient alone** — and that's the whole point of the pairing: \`debug_assert!\` alone would, in release, let an upstream bug (a bad oracle, a corrupted snapshot) underflow into a silent wrap; \`saturating_sub\` alone would silently absorb a *routing* bug (the caller invoked the wrong function entirely), masking the symptom and leaving the cause un-debugged. Two layers, two failure modes: **dev-time assertions explode where the bug lives so it gets fixed; prod-time saturation guarantees the chain doesn't fork if a bug slips through to mainnet anyway.** **Defensive coding in pure compute uses dev-time assertions + prod-time saturation as a pair.**

3. **Two functions with opposite preconditions > one function returning a tagged union.** \`solvent_close_outcome\` and \`underwater_close_outcome\` are a discriminated dispatch *by convention*: the caller routes based on a margin-health check, and the functions' debug-asserts enforce the routing decision. The alternative — one function returning \`enum CloseOutcome { Solvent(SolventClose), Underwater(UnderwaterClose) }\` — would re-do the routing work inside the function. **When the caller has already made the routing decision, the right interface is two functions, not one with a tagged-union return.**

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout 260883b
diff -u ~/code/my-openhl/crates/liquidation/src/compute.rs ./crates/liquidation/src/compute.rs
diff -u ~/code/my-openhl/crates/liquidation/src/types.rs ./crates/liquidation/src/types.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
\`\`\`

After L10:
- **compute.rs** matches Stage 10b's \`compute.rs\` **byte-for-byte**.
- **types.rs** matches Stage 10b's \`types.rs\` **byte-for-byte**.
- **lib.rs** matches Stage 10b's \`lib.rs\` **byte-for-byte**.
- **insurance.rs** has been byte-for-byte since L9.

**Stage 10b is complete.** The whole \`openhl-liquidation\` crate at commit \`260883b\` is in your workspace. Module 3 (insurance fund) of the rethlab Liquidation course wraps here.

## Common questions

**Q1: Why does \`liquidation_fee\` truncate (integer division) instead of round-half-up?**

Consensus determinism requires every validator to compute the same number, and Rust's \`/\` operator on integers is **truncation toward zero** — the unambiguous default for integer division in every language ABI. Rounding semantics differ between languages (banker's rounding vs. half-away-from-zero) and even between processor families; truncation is the *only* operation that's portably the same. The same discipline is why the *whole crate* refuses \`f64\` arithmetic: IEEE 754 rounding modes can differ by FPU, by compiler flags, by ordering of operations — every one of those is a chain-fork risk. Integers + saturation + truncation is the only path that gives validators byte-identical state transitions, full stop. **For consensus arithmetic, pick the operation with the simplest determinism story, even if it sacrifices a fraction of a basis point in fee accuracy.**

**Q2: Should \`solvent_close_outcome\` and \`underwater_close_outcome\` be methods on \`AccountSnapshot\`?**

Same answer as L7's Q3 for \`close_order_spec\`: they live in \`compute.rs\` alongside the other margin math functions because that's the architectural home. \`AccountSnapshot\` is a data carrier (in \`types.rs\`); compute lives in \`compute.rs\`. **Co-locate by concept, not by receiver.**

**Q3: Why does \`underwater_close_outcome\` not return zero \`shortfall_to_fund\` for the trivially-not-underwater boundary case (equity exactly equal to fee)?**

Because the \`debug_assert!\` precondition is \`equity < fee\` (strict). If a caller calls \`underwater_close_outcome\` with \`equity == fee\`, the assertion fires in debug and the function still runs (in release), producing \`fee_to_fund = post_close_equity = fee, shortfall_to_fund = 0\` — which is *actually correct* (the close is exactly solvent), but it's not the function's job to fix the caller's routing mistake. **Use \`debug_assert!\` to enforce contracts; use saturation to make the unenforced case still produce a sane answer.**

**Q4: The \`fee_saturates_on_pathological_input\` test sets \`liquidation_fee_bps = u32::MAX\`. That's \`4,294,967,295\` — over 42 *million* percent. Is this test realistic?**

No, it's not realistic — and that's the point. The test exists to verify the saturation path *fires correctly* in the one input regime where it can fire. A realistic test would test fees of 50 to 500 bps; this test is a *consensus determinism guard* — it proves that even a maliciously-crafted \`LiquidationParams\` produces a deterministic, non-panicking output. **Saturation tests live at the boundary, not in the operating range.**

**Q5: Could \`solvent_close_outcome\` return \`Option<SolventClose>\` where \`None\` means "actually this is underwater, retry with the other function"?**

You could, but it conflates two questions: "did the function complete?" and "did the caller route correctly?" The current design separates these — the function always completes (returning a value, even when the assertion would fire), and the assertion catches the routing error during development. **Mixing completion semantics with routing semantics is a design smell; keep them in different mechanisms.**

**Q6: Why is \`fee_to_fund\` in \`UnderwaterClose\` named the same as in \`SolventClose\` if the semantics are different?**

The semantics are *the same*: both fields say "this much of the close's fee flowed to the insurance fund." In \`SolventClose\`, that's the full fee (collected from positive collateral residual). In \`UnderwaterClose\`, that's a partial fee (collected from positive-but-insufficient equity) or zero (collected from negative equity). The *amount* differs; the *destination* doesn't. **Name fields by destination, not by the math that produced them.**

## Next lesson (L11) — \`LiquidationScanner\` introduction (Stage 10c)

L11 begins Stage 10c — the multi-account scanner. The scanner is the state-machine consumer of everything L4–L10 produced. It takes a slice of \`&[AccountSnapshot]\`, classifies each one (Liquidatable, Underwater, Safe, At-Risk) using \`margin_health\` from L6, calls either \`solvent_close_outcome\` or \`underwater_close_outcome\` per Liquidatable account, threads the credits/debits into an owned \`InsuranceFund\`, and returns a \`ScanReport\` summarizing the batch: which accounts were closed, which ADL trigger amounts surfaced, and where the fund stands afterwards.

After L11, the cascade has its first *runnable* layer: not just math + state, but math + state + orchestration loop. The SHA pin advances from \`260883b\` to \`0a8464e\` (Stage 10c).
`,
                },
              ],
            },
          },
          {
            title: "Scanner & capstone",
            sortOrder: 4,
            lessons: {
              create: [
                {
                  title: "Lesson 11 — Scanner type vocabulary — CloseOutcomeKind, LiquidationRecord, ScanReport, LiquidationScanner",
                  slug: "openhl-liquidation-scanner-types-en",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 25,
                  xpReward: 50,
                  content: `# Lesson 11 — Scanner type vocabulary — \`CloseOutcomeKind\`, \`LiquidationRecord\`, \`ScanReport\`, \`LiquidationScanner\`

## Goal

Concepts you'll grasp in this lesson:

- **The orchestration layer has its own type vocabulary, distinct from compute or insurance.** Stage 10a produced \`MarginHealth\` (per-account classification). Stage 10b produced \`SolventClose\` / \`UnderwaterClose\` (per-close decomposition) and \`WithdrawOutcome\` (per-fund-call outcome). Stage 10c introduces *batch-level* types: \`CloseOutcomeKind\` (which kind of close this account had), \`LiquidationRecord\` (one row per liquidated account), and \`ScanReport\` (everything that happened in one scan). **Each architectural layer needs its own type vocabulary because each layer answers different questions.**
- **\`CloseOutcomeKind\` is a discriminated union of \`SolventClose\` and \`UnderwaterClose\` — same shape as L9's \`WithdrawOutcome\`, different vocabulary.** Two variants, each carrying a struct produced by the corresponding Stage 10b function. The scanner pattern-matches on this enum to dispatch the post-close work (fund deposit, fund withdraw, escalation aggregation). **When a higher layer routes between two lower-layer outputs, an enum variant carrying each output is the cleanest mechanical bridge.**
- **\`ScanReport\` includes both per-account records AND aggregate fund-flow totals.** The records vector is the *audit trail* (one row per liquidation, in iteration order). The three aggregate \`i64\`s (\`fund_deposits\`, \`fund_withdrawals\`, \`unfilled_deficit\`) are the *telemetry summary* (sums the bridge can read without iterating the records). Pre-computing them inside the scan loop costs nothing — the bridge wanted them anyway. **Aggregate fields next to a record vector save the caller a fold; they're not redundant, they're convenient.**
- **\`LiquidationScanner\` owns the \`InsuranceFund\` directly, not via \`Arc<Mutex<...>>\`.** The scanner is a per-bridge component, not a shared resource. The bridge holds the scanner, the scanner holds the fund, the fund holds the balance. Mutation flows down the ownership tree without lock contention. **State machines that change exactly once per block don't need synchronization primitives.**

Verification:

\`\`\`bash
cargo check -p openhl-liquidation
\`\`\`

…compiles clean. We don't add new tests in L11 — the type vocabulary doesn't have behavior to test yet. L12 adds the \`scan\` method and its 4 simplest tests; L13 adds the nuanced cases + 4 proptests. After L13, 68 tests total.

Specific changes:

- **\`src/scanner.rs\`** — new module file. Adds the module-level doc, \`CloseOutcomeKind\` enum, \`LiquidationRecord\` struct, \`ScanReport\` struct, \`LiquidationScanner\` struct, plus 5 accessor methods (\`new\`, \`with_empty_fund\`, \`fund_balance\`, \`fund\`, \`into_fund\`). No \`scan\` method yet.
- **\`src/lib.rs\`** — adds \`pub mod scanner;\` and re-exports the four scanner types.

L11 stages the type vocabulary; L12 implements \`scan\`.

## Recap

After L10:
- \`compute.rs\`, \`insurance.rs\`, \`types.rs\`, \`lib.rs\` all match Stage 10b's \`260883b\` byte-for-byte.
- \`cargo test\` runs 55 tests, all green.
- We have *all the parts* for a multi-account orchestration loop: margin classification (\`margin_health\`), close-order generation (\`close_order_spec\`), fee math (\`liquidation_fee\`), close-outcome decomposition (\`solvent_close_outcome\` / \`underwater_close_outcome\`), and the insurance fund state machine (\`InsuranceFund::deposit\` / \`::withdraw_shortfall\`).
- The bridge would have to hand-wire those parts itself for every block.

Stage 10c assembles them once, in a reusable component the bridge owns. The orchestration loop is \`scan\` (L12); the contract — what \`scan\` takes and returns — is L11.

## Plan

Three edits:

1. **Create \`crates/liquidation/src/scanner.rs\`** — new module file with \`CloseOutcomeKind\`, \`LiquidationRecord\`, \`ScanReport\`, \`LiquidationScanner\`, and the 5 accessor methods. No \`scan\` method (lands in L12).
2. **Add \`pub mod scanner;\`** and the re-exports to \`crates/liquidation/src/lib.rs\`. The four types become part of the crate's public surface.
3. **Update \`lib.rs\`'s top-of-file roadmap** to mark Stage 10c in progress.

> 🛑 **Predict.** Before reading further: the scanner's \`scan\` method (L12 territory) will produce a \`ScanReport\` per block. What fields belong in the report? List as many as you can. Then: what fields belong in the *per-account record* inside the report?

(Answer: **Scan report:** (a) one record per liquidated account, (b) aggregate fees deposited to fund, (c) aggregate amount the fund actually paid out, (d) aggregate unfilled deficit the fund couldn't cover. **Per-account record:** (a) the account ID, (b) the close-order spec the bridge will submit, (c) the pre-close classification (for traceability), (d) the post-close outcome decomposition (solvent or underwater). The scanner gives the bridge two views of the same data: per-account records for the CLOB submit step, and aggregate totals for telemetry / ADL escalation in one O(1) read.)

The type layering picture for L11:

\`\`\`
   ┌────────────────────────────────────────────────────────────┐
   │  L11 — orchestration layer types                            │
   ├────────────────────────────────────────────────────────────┤
   │                                                            │
   │  Per-account, post-classification:                         │
   │  ─────────────────────────────                             │
   │  enum CloseOutcomeKind {                                   │
   │      Solvent(SolventClose),       ──→ Fund deposit + refund │
   │      Underwater(UnderwaterClose), ──→ Fund shortfall path   │
   │  }                                                         │
   │                                                            │
   │  struct LiquidationRecord {                                │
   │      account, close_order, classification, outcome         │
   │  }                                                         │
   │                                                            │
   │  Per-batch:                                                │
   │  ──────────                                                │
   │  struct ScanReport {                                       │
   │      records: Vec<LiquidationRecord>,                      │
   │      fund_deposits:     i64,    ← Σ over records           │
   │      fund_withdrawals:  i64,    ← Σ over records           │
   │      unfilled_deficit:  i64,    ← Σ → ADL trigger          │
   │  }                                                         │
   │                                                            │
   │  Owner:                                                    │
   │  ──────                                                    │
   │  struct LiquidationScanner {                               │
   │      params: LiquidationParams,                            │
   │      fund:   InsuranceFund,    ← owned, not shared          │
   │  }                                                         │
   │                                                            │
   └────────────────────────────────────────────────────────────┘
\`\`\`

Three things to notice about the layering:

1. **\`CloseOutcomeKind\` is the *only* new enum in Stage 10c.** Everything else is a struct. Why? Because the routing decision (solvent vs. underwater) was already made by \`compute\`'s \`debug_assert!\` pair (L10); the enum exists to *carry* the decision through the scan loop, not to *re-make* it. **Enums encode irreducible dispatch; struct fields encode parallel data.**
2. **\`LiquidationRecord\` carries \`classification\` (the pre-close \`MarginHealth\`) even though the bridge can derive it.** The bridge submitting the close order doesn't actually need it; what needs it is the *telemetry consumer* — a dashboard that wants to chart "how many Liquidatable vs Underwater closes per hour." Keeping it in the record makes the audit trail self-contained. **Record fields are for downstream consumers, not just the immediate caller.**
3. **\`ScanReport\`'s three aggregate \`i64\` fields are computed by the scanner during the loop, not by a separate fold.** Adding them to the scan loop costs three \`saturating_add\` calls per record — effectively free, since the scanner already touches each record once. **Pre-computing aggregates inside a single-pass loop is free; computing them in a second pass is wasteful.**

## Walk-through

### Step 1: Create \`src/scanner.rs\`

Create a new file \`crates/liquidation/src/scanner.rs\`. The whole-module doc comment goes first; it's the architectural overview that explains the determinism contract and the FIFO-fairness policy:

\`\`\`rust
//! Multi-account liquidation scanner (Stage 10c).
//!
//! The scanner is the orchestration layer that ties Stage 10a (margin
//! classification + close-order generation) and Stage 10b (insurance
//! fund + close-outcome decomposition) together. The bridge owns a
//! [\`LiquidationScanner\`], calls [\`LiquidationScanner::scan\`] once per
//! block (or per market-event tick) with the current accounts and mark,
//! and consumes the returned [\`ScanReport\`] to (a) submit the close
//! orders to the CLOB and (b) escalate any unfilled deficit.
//!
//! ### Determinism
//!
//! Every validator must produce byte-identical [\`ScanReport\`]s from the
//! same \`(accounts, mark, params, fund_state)\`. The scanner only uses
//! \`Vec\`'s ordered iteration and the fully-deterministic Stage 10a/10b
//! primitives, so determinism follows from caller-side ordering of the
//! accounts slice — **the bridge is responsible for handing accounts in
//! a deterministic order** (typically \`account_id\`-sorted).
//!
//! ### Fairness when the fund is partially drained
//!
//! When the insurance fund cannot cover every underwater shortfall in
//! one scan, the v0 policy is **first-come-first-served** in iteration
//! order. Earlier-iterated underwater accounts get covered; later ones
//! contribute to [\`ScanReport::unfilled_deficit\`]. This is the simplest
//! deterministic choice; production fairness designs (pro-rata draw,
//! priority by account leverage) can be layered on later without
//! changing the public type shape.
//!
//! ### ADL handoff (Stage 10d)
//!
//! [\`ScanReport::unfilled_deficit\`] is the load-bearing signal that the
//! fund couldn't absorb everything. Stage 10c records it; a future
//! Stage 10d would consume it to drive ADL ranking and force-close
//! profitable counter-positions. Until Stage 10d ships, the bridge can
//! either panic on \`unfilled_deficit > 0\` (conservative — halt the
//! chain) or log and continue (permissive — accept the deficit as a
//! protocol loss).
\`\`\`

Five things to notice about this preamble:

1. **It defines *who calls what* in the first sentence.** "The bridge owns a \`LiquidationScanner\`, calls \`LiquidationScanner::scan\` once per block, and consumes the returned \`ScanReport\`." A reader who reads only the first sentence already knows the ownership and call-pattern. **For orchestration modules, the first sentence of the module doc is the call-pattern.**
2. **The \`Determinism\` section names *who is responsible for what*.** The scanner is deterministic *given a deterministic ordering of accounts*; the *bridge* is responsible for the ordering. Splitting the determinism contract this way is honest: the scanner can't enforce something it doesn't own. **A module that depends on a caller-provided invariant should name the invariant and credit the caller for upholding it.**
3. **The \`Fairness when the fund is partially drained\` section names the v0 policy AND its successors.** First-come-first-served is the simplest deterministic choice; pro-rata draw and leverage-priority are future designs. Naming both makes the policy *replaceable* without the public-type shape changing. **When picking a policy, name the alternatives the public type leaves room for.**
4. **The \`ADL handoff\` section explains how the scanner integrates with a stage that doesn't exist yet.** Stage 10d is the next stage in the openhl roadmap; L11's scanner already produces the signal Stage 10d needs (\`unfilled_deficit\`). **Forward references in docs aren't speculation — they're integration contracts that the next stage will fulfill.**
5. **The escalation alternatives ("panic vs log and continue")** explicitly name the trade-off until Stage 10d ships. The reader who deploys an early-stage chain knows their options. **Doc the operational decisions a deployer faces, not just the API.**

Below the doc, add the imports the scanner uses:

\`\`\`rust
use crate::compute::{
    account_equity, close_order_spec, liquidation_fee, margin_health, notional_value,
    solvent_close_outcome, underwater_close_outcome,
};
use crate::insurance::{InsuranceFund, WithdrawOutcome};
use crate::types::{
    AccountSnapshot, CloseOrderSpec, LiquidationParams, MarginHealth, SolventClose, UnderwaterClose,
};
use openhl_clob::AccountId;
use openhl_funding::MarkPrice;
\`\`\`

The import block is unusually wide because the scanner *composes everything*. Six compute functions, two insurance types, five type-module types, two cross-crate types. The width is intentional — it's the bill of materials that says "Stage 10c is what happens when everything from 10a + 10b combines." **An import block can serve as documentation when it's the inventory of dependencies.**

### Step 2: Add \`CloseOutcomeKind\`

Below the imports, add the discriminated outcome enum:

\`\`\`rust
/// Discriminated outcome for a single liquidated account in a scan.
///
/// \`Solvent\` carries the [\`SolventClose\`] decomposition (full fee
/// collectable, residual returns to account). \`Underwater\` carries the
/// [\`UnderwaterClose\`] decomposition (partial or zero fee, shortfall the
/// fund must absorb).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum CloseOutcomeKind {
    Solvent(SolventClose),
    Underwater(UnderwaterClose),
}
\`\`\`

Four things to notice:

1. **The enum is a *tuple variant* enum, not a struct-variant enum.** Each variant carries one positional payload. The alternative — \`Solvent { close: SolventClose }\` — would require named-field destructuring (\`CloseOutcomeKind::Solvent { close } => ...\`). Tuple variants give you the cleaner \`CloseOutcomeKind::Solvent(close) => ...\`. **Tuple variants beat struct variants when the variant carries exactly one payload type.**
2. **The enum is \`Copy\`** because both \`SolventClose\` and \`UnderwaterClose\` are \`Copy\` (each is two \`i64\` fields). Pass by value, pattern-match by value, no borrow management. **Composing \`Copy\` types produces a \`Copy\` enum at zero engineering cost.**
3. **The doc comment names the *two payloads* explicitly** — full-fee solvent vs. partial-or-zero underwater. A reader who sees the enum signature without the doc would not know that \`Underwater\` includes the "zero fee, full shortfall" case (which the L10 doc made clear). The cross-reference here saves a hop. **When a higher-layer enum carries a lower-layer struct with subtle internal cases, name those cases in the higher-layer doc.**
4. **No \`match\`-exhaustiveness helper variant.** No \`_ => unreachable!()\`-style catch-all is needed because the enum has exactly two variants and they exhaust the discriminated-dispatch space we set up in L10. **Two-variant enums are the smallest possible discriminated dispatch — nothing to catch.**

### Step 3: Add \`LiquidationRecord\`

Below \`CloseOutcomeKind\`, add the per-account record struct:

\`\`\`rust
/// Per-account record produced by the scanner when an account is
/// liquidated. The bridge submits \`close_order\` to the CLOB; \`outcome\`
/// records the credit/debit decomposition the scanner already applied
/// against the [\`InsuranceFund\`].
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct LiquidationRecord {
    pub account: AccountId,
    pub close_order: CloseOrderSpec,
    /// Pre-close classification from [\`margin_health\`]. \`Liquidatable\`
    /// or \`Underwater\`; \`Safe\`/\`AtRisk\` accounts never appear in a
    /// record.
    pub classification: MarginHealth,
    /// Decomposition of what happened in the close. Note that a
    /// \`Liquidatable\`-classified account can still produce an
    /// \`Underwater\` outcome when the fee tips post-close equity
    /// negative.
    pub outcome: CloseOutcomeKind,
}
\`\`\`

Six things to notice:

1. **Four fields, three of which are \`Copy\` types from earlier modules.** \`AccountId\` (from \`openhl-clob\`), \`CloseOrderSpec\` (Stage 10a), \`MarginHealth\` (Stage 10a), \`CloseOutcomeKind\` (this module). Composing existing types into a record is free. **A record struct that doesn't introduce new fields is purely a vocabulary widening — name it and move on.**
2. **\`classification\` carries \`MarginHealth\`, an enum with four variants** (\`Safe\`, \`AtRisk\`, \`Liquidatable\`, \`Underwater\`). The doc says only two appear in records — the other two would never be in a \`LiquidationRecord\` because the scanner skips them. The type *allows* four values; the contract narrows to two. **A type can carry more cases than the API actually produces; document the contract narrowing in the doc, not in a separate sub-enum.**
3. **The note about \`Liquidatable\`-classified → \`Underwater\`-outcome is the key teaching point.** A reader who reads only the field name would assume \`classification == outcome\` always — but the *classification* uses pre-close equity, while the *outcome* uses post-close equity (which the fee reduces). Stage 10a's \`margin_health\` and Stage 10b's \`solvent_close_outcome\` / \`underwater_close_outcome\` can disagree on which side of the fee-threshold an account lands. The concrete case is L10's \`underwater_close_partial_fee_collection\` test: account is \`Liquidatable\` pre-close (positive equity above the maintenance margin), but the close-plus-fee tips post-close equity below the desired fee — so the *outcome* lands in the \`Underwater\` branch even though the *classification* was \`Liquidatable\`. **Document the cases where two related fields can disagree — readers will assume they always agree otherwise.**
4. **The struct is \`Copy\`** because all four fields are \`Copy\`. Even though \`LiquidationRecord\` will be pushed into a \`Vec\` (which never requires \`Copy\`), keeping it \`Copy\` makes the per-iteration loop body in L12's \`scan\` method ergonomic — no \`.clone()\`, no borrow management. **Make record types \`Copy\` when their fields permit; the cost is zero and the ergonomics compound.**
5. **All four fields are \`pub\`.** A \`LiquidationRecord\` is a *value type* — the bridge reads its fields directly. Hiding them behind accessors would impose \`record.account()\` instead of \`record.account\`, and gain nothing because there are no invariants to defend. **For records that exist purely to carry data, public fields beat methods.**
6. **No \`Default\` derive.** What would a default record even mean? An empty \`AccountId\`, a zero-qty \`CloseOrderSpec\`, a \`Safe\` classification, a \`Solvent(SolventClose::default())\` outcome? Nothing about that has meaning. **Don't derive \`Default\` for records whose meaning is "something specific happened" — there's no neutral state to encode.**

### Step 4: Add \`ScanReport\`

Below \`LiquidationRecord\`, add the batch-level summary:

\`\`\`rust
/// Summary of a single scan pass. Includes per-account records plus
/// aggregate fund-flow totals for telemetry / escalation.
#[derive(Clone, Debug, PartialEq, Eq, Default)]
pub struct ScanReport {
    /// One record per liquidated account, in scan-iteration order. The
    /// bridge submits each record's \`close_order\` to the CLOB.
    pub records: Vec<LiquidationRecord>,
    /// Total fees credited to the insurance fund during this scan.
    pub fund_deposits: i64,
    /// Total amount the insurance fund actually paid out (sum of the
    /// \`amount\` field across \`Covered\` and \`PartiallyDrained\`
    /// withdrawals).
    pub fund_withdrawals: i64,
    /// Total shortfall the fund could NOT cover (sum across
    /// \`PartiallyDrained.unfilled\` and \`Depleted.unfilled\`). Stage 10d
    /// consumes this as the ADL trigger.
    pub unfilled_deficit: i64,
}
\`\`\`

Six things to notice:

1. **\`ScanReport\` is \`Clone + Default\` but **NOT** \`Copy\`.** Because it contains a \`Vec\`, which is heap-allocated and can't be bitwise-copied. The compiler enforces this; you can't accidentally derive \`Copy\` on a \`Vec\`-containing struct. **The presence of a \`Vec\` is the compiler-enforced "I have a heap allocation" signal.**
2. **\`Default\` is derived — and it's meaningful.** An empty scan (no liquidatable accounts) produces \`ScanReport { records: vec![], fund_deposits: 0, fund_withdrawals: 0, unfilled_deficit: 0 }\`. That's exactly what \`Default::default()\` gives, and it's exactly what L12's \`scan\` method initializes with. **\`Default\` is meaningful when the default value represents a real domain state — here, "scan returned nothing."**
3. **Three \`i64\` aggregates next to the \`Vec\`** — \`fund_deposits\`, \`fund_withdrawals\`, \`unfilled_deficit\`. The alternative — computing them via \`report.records.iter().map(|r| r.outcome.fee()).sum()\` — would require iterating the records every time the bridge reads them. Pre-computing inside the scan loop is O(1) extra work per record and saves the bridge an O(n) fold. **Aggregate fields next to a record vector save the caller a fold; they're not redundant.**
4. **\`fund_withdrawals\` is the sum of \`amount\`, not of \`shortfall\`.** Read it twice. The bridge wants to know "how much did the fund actually pay out?", not "how much was requested." The two differ when the fund is partially drained (\`amount < shortfall\`). The field name reflects what was *paid out*, not what was *asked for*. **Aggregate fields measure what *happened*, not what was *requested*.**
5. **\`unfilled_deficit\` is the sum across two \`WithdrawOutcome\` variants.** Specifically \`PartiallyDrained.unfilled\` AND \`Depleted.unfilled\`. The doc names both contributors. A reader who only knew \`PartiallyDrained\` would miss the \`Depleted\` case (where the fund was already empty before the call). **When an aggregate sums across enum variants, name every variant that contributes.**
6. **\`unfilled_deficit\` is *the* signal to Stage 10d.** The doc comment names it. L11's contract is that this field exists and is computed correctly; Stage 10d's contract is that it consumes this field to drive ADL. **The handoff between two stages is an i64 field with a clear name and a documented consumer.**

### Step 5: Add \`LiquidationScanner\` struct + accessors

Below \`ScanReport\`, add the scanner struct and its accessors:

\`\`\`rust
/// Multi-account liquidation scanner.
///
/// Owns an [\`InsuranceFund\`] and a set of [\`LiquidationParams\`]. The
/// bridge calls [\`Self::scan\`] once per block; the scanner classifies
/// every account, generates close orders for the Liquidatable/Underwater
/// ones, mutates the fund accordingly, and returns the resulting
/// [\`ScanReport\`].
#[derive(Clone, Debug)]
pub struct LiquidationScanner {
    params: LiquidationParams,
    fund: InsuranceFund,
}

impl LiquidationScanner {
    /// Construct a scanner with the given params and a starting fund
    /// balance.
    #[must_use]
    pub const fn new(params: LiquidationParams, fund: InsuranceFund) -> Self {
        Self { params, fund }
    }

    /// Construct a scanner with the given params and an empty insurance
    /// fund. Convenience for tests and fresh-chain bootstrap.
    #[must_use]
    pub const fn with_empty_fund(params: LiquidationParams) -> Self {
        Self {
            params,
            fund: InsuranceFund::empty(),
        }
    }

    /// Current insurance fund balance.
    #[must_use]
    pub const fn fund_balance(&self) -> i64 {
        self.fund.balance()
    }

    /// Borrow the underlying insurance fund (read-only).
    #[must_use]
    pub const fn fund(&self) -> &InsuranceFund {
        &self.fund
    }

    /// Consume the scanner and return its fund — useful for handoff to
    /// snapshot/persistence layers at chain shutdown.
    #[must_use]
    pub fn into_fund(self) -> InsuranceFund {
        self.fund
    }
}
\`\`\`

Seven things to notice:

1. **The struct has *two* private fields and no public ones.** Unlike \`LiquidationRecord\` (all-public, data carrier) or \`ScanReport\` (all-public, value type), \`LiquidationScanner\` is a *state machine* — it owns mutable state (the fund) and the bridge is supposed to interact with it through methods. Private fields enforce that contract. **State machines hide their fields; data carriers expose them.**
2. **The struct is \`Clone\` but NOT \`Copy\`** (because it contains the fund, which is technically \`Copy\` here but composed inside a \`#[derive(Clone, Debug)]\` block to allow future evolution). Cloning is for tests and for safe snapshot patterns — production code rarely clones a scanner. **Derive \`Clone\` defensively even when no current caller uses it; the cost is zero and it unblocks future test patterns.**
3. **Five accessor methods, *not* one Builder pattern.** A builder would let you do \`LiquidationScanner::builder().with_params(p).with_fund(f).build()\`. We don't have one because the scanner has exactly two fields and the construction site is small. **Builders earn their keep when there are 5+ optional fields; for 2 fields, two constructors (\`new\`, \`with_empty_fund\`) beat a builder.**
4. **\`fund_balance\` returns \`i64\` directly; \`fund\` returns \`&InsuranceFund\`.** Two access patterns, two methods. The bridge logs the balance often (\`fund_balance\` is one i64 — fast). The bridge occasionally inspects the full fund state (\`fund\` returns a borrow — \`Copy\` would also work, but borrow is more explicit). **Provide both the hot-path scalar and the cold-path full reference; let callers pick.**
5. **\`into_fund\` is the *consume-and-extract* pattern.** At chain shutdown (Stage 13+ in openhl), the bridge calls \`scanner.into_fund()\` to extract the fund state for snapshot/persistence. The method takes \`self\` by value (not \`&self\`), so the scanner is dropped after the call and the fund moves into the caller's hands. **\`into_*\` methods that take \`self\` by value signal "this is a one-shot, the original is gone."**
6. **Four of the five accessors are \`const fn\`.** All but \`into_fund\` can be evaluated at compile time because they don't move out of \`self\`. The \`into_fund\` consume-pattern can't be const because consuming \`self\` of a non-\`Copy\` type and destructuring it to move out an owned field is exactly the kind of ownership operation that current \`const\` contexts forbid (destructive moves of non-\`Copy\` locals and arguments are restricted at compile-time evaluation). **\`const fn\` everything you can; the limit is usually whether the function moves data.**
7. **No \`set_*\` methods.** The bridge mutates fund state via the (future) \`scan\` method, not by directly assigning to \`self.fund\`. A \`set_fund(&mut self, f: InsuranceFund)\` accessor would let the bridge bypass the scan loop, which is exactly the abstraction-breaking surface we want to prevent. **State machines expose mutation only through methods that implement the state-machine transitions — not through field setters.**

> 🛑 **Anti-fluency.** "Why does \`LiquidationScanner\` own an \`InsuranceFund\` by value, rather than taking it by reference (\`fund: &'a mut InsuranceFund\`) or sharing it (\`fund: Arc<Mutex<InsuranceFund>>\`)?" Three problems with the alternatives. (1) \`&'a mut\` introduces a lifetime parameter that propagates through every type the scanner appears in — call sites get noisier and \`LiquidationScanner<'a>\` shows up in every struct that holds one. (2) \`Arc<Mutex<...>>\` is for shared mutable state — the scanner isn't shared, the bridge owns it. Synchronization without contention is just runtime overhead. (3) Owning by value means the scanner's lifetime *is* the fund's lifetime; the \`into_fund\` method gives the caller a clean handoff at shutdown. **Ownership semantics match the lifecycle: per-bridge component, single mutator, persisted at shutdown.**

### Step 6: Wire the module into \`lib.rs\`

Open \`crates/liquidation/src/lib.rs\`. Three changes:

First, add the module declaration. Insert \`scanner\` after \`insurance\`:

\`\`\`rust
pub mod compute;
pub mod insurance;
pub mod scanner;
pub mod types;
\`\`\`

Second, add the scanner re-exports as a new line below the \`insurance\` re-export:

\`\`\`rust
pub use compute::{
    account_equity, close_order_spec, liquidation_fee, margin_health, margin_ratio,
    notional_value, solvent_close_outcome, underwater_close_outcome, unrealized_pnl,
};
pub use insurance::{InsuranceFund, WithdrawOutcome};
pub use scanner::{CloseOutcomeKind, LiquidationRecord, LiquidationScanner, ScanReport};
pub use types::{
    AccountSnapshot, CloseOrderSpec, LiquidationParams, MarginHealth, MarginRatio, SolventClose,
    UnderwaterClose, MARGIN_SCALE,
};
\`\`\`

All four scanner types (the enum + three structs) re-exported in one line, alphabetical inside the \`{ }\`.

Third, update the \`lib.rs\`-top roadmap comment to mark Stage 10c in progress. The exact change here depends on what your \`lib.rs\` preamble currently says — the answer key has Stage 10c marked "scanner shipping in this commit." Match that prose.

### Step 7: Run \`cargo check\`

\`\`\`bash
cargo check -p openhl-liquidation
\`\`\`

Expected output:

\`\`\`
    Checking openhl-liquidation v0.1.0 (/path/to/openhl/crates/liquidation)
    Finished \`dev\` profile [optimized + debuginfo] target(s) in 1.2s
\`\`\`

**Clean compile.** No tests run — we don't have a \`scan\` method yet, so there's nothing testable. The 55 existing tests from L10 still pass (\`cargo test -p openhl-liquidation\` confirms), but L11 doesn't add or modify any of them.

Common errors:

- **\`unresolved import \\\`openhl_clob::AccountId\\\`** — the scanner depends on \`openhl-clob\` and \`openhl-funding\` for \`AccountId\` and \`MarkPrice\`. Make sure \`crates/liquidation/Cargo.toml\` lists both in \`[dependencies]\`. The answer-key crate already has them (L0's lesson set them up).
- **\`unused import: \\\`account_equity\\\`** — clippy / rustc may warn that some imports are unused because L11 doesn't have a \`scan\` method that uses them. **These warnings are intentional at L11** — the imports are *staged* for L12, which consumes every one of them. If you keep a zero-warnings discipline, add \`#[allow(unused_imports)]\` to the top of \`scanner.rs\` for L11 only and delete the attribute when L12 lands; otherwise just leave the warnings — they go away the moment L12's \`scan\` body compiles. The answer-key doesn't \`allow\` because it ships L11 and L12 together. **No warning at L11 indicates a real issue; every unused-import warning here is expected.**
- **\`pub mod scanner;\` placement** — if you put it after \`pub mod types;\`, the alphabetical order breaks. The answer-key has them in alphabetical order inside \`lib.rs\`. Match that order.

## Design reflection

Three load-bearing decisions in this lesson:

1. **Type vocabulary before mechanism, again.** Same pattern as L8 (where \`WithdrawOutcome\` was declared in L8 but used in L9) and L10 (where \`SolventClose\` / \`UnderwaterClose\` were declared and immediately used). L11 declares the orchestration-layer types so L12's \`scan\` method has somewhere to put its return values. **A reader who lands on the file after L11 sees a complete type API surface; L12 fills in the verb.**

2. **The scanner owns the insurance fund by value.** Not \`&'a mut\`, not \`Arc<Mutex<...>>\`, not \`Rc<RefCell<...>>\`. The ownership decision is what makes the scanner usable without lifetime gymnastics or runtime overhead. **State-machine components that have a single mutator and a clear shutdown point should own their state by value.**

3. **Aggregate fields next to record vectors save the caller a fold.** \`ScanReport.fund_deposits\` is mathematically equal to a sum over \`report.records.iter().map(|r| ...)\` — but computing it inside the scan loop costs three \`saturating_add\` calls and saves the bridge an iteration. **Pre-compute aggregates inside single-pass loops; the cost is free and the API contract is cleaner.**

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout 0a8464e
diff -u ~/code/my-openhl/crates/liquidation/src/scanner.rs ./crates/liquidation/src/scanner.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
\`\`\`

After L11:
- **scanner.rs** matches Stage 10c's \`scanner.rs\` **up through the \`impl LiquidationScanner\` block** for the accessors (everything except the \`scan\` method and the tests, which land in L12 + L13). Specifically: doc + imports + \`CloseOutcomeKind\` + \`LiquidationRecord\` + \`ScanReport\` + \`LiquidationScanner\` struct + \`new\` / \`with_empty_fund\` / \`fund_balance\` / \`fund\` / \`into_fund\`.
- **lib.rs** matches Stage 10c's \`lib.rs\` **byte-for-byte** for the \`pub mod scanner;\` line and the \`pub use scanner::{...}\` re-export.

## Common questions

**Q1: Why is \`CloseOutcomeKind\` named with the \`Kind\` suffix? Why not just \`CloseOutcome\`?**

Because \`CloseOutcome\` would clash mentally with the *outcome* fields inside \`SolventClose\` and \`UnderwaterClose\`. The suffix \`Kind\` says "this enum is about *which kind* of outcome happened" — making clear that the enum is the *dispatcher*, not the outcome data itself. **Suffix-naming (Kind, Type, Variant) is the Rust idiom for "this is the discriminator, not the data."**

**Q2: Why doesn't \`LiquidationRecord\` carry the post-close trader balance? The bridge needs it to credit the trader.**

Because that balance lives on the trader's account, not in the liquidation engine. The scanner produces a \`SolventClose { fee_to_fund, residual_to_account }\` — the \`residual_to_account\` is what the bridge adds to the trader's balance. The scanner doesn't *know* the trader's pre-liquidation balance; the bridge does. **Compute components produce deltas; balance owners apply them. Don't store data that lives elsewhere.**

**Q3: \`ScanReport\` has \`Vec<LiquidationRecord>\` — won't this allocate on every scan?**

Yes, and that's fine. The vec is at most one entry per Liquidatable account in the slice; in steady state on a healthy chain, most blocks see zero liquidations and the vec stays empty (which doesn't allocate). On a stressed chain with many liquidations, allocation is a microsecond next to the price of the actual liquidations. If profiling later shows it's hot, the bridge can pool \`ScanReport\` instances. **Don't pre-optimize allocations that are dwarfed by the work they accompany.**

**Q4: Could \`LiquidationScanner\` be generic over the fund type, \`LiquidationScanner<F: Fund>\`?**

You could, but the only existing implementation of \`Fund\` would be \`InsuranceFund\`, and adding the generic adds a type parameter that propagates through every caller. **Generics are for *interchangeable* implementations; with one implementation, concrete types beat generics.** If a future "redundant fund" (two-layered insurance) needs to swap, that's the time to introduce the trait — not before.

**Q5: \`into_fund\` consumes the scanner. What if the bridge wants the fund snapshot AND continued scanner operation?**

Use \`fund()\` (returns \`&InsuranceFund\`) and call \`.balance()\` or read other fields through the borrow. \`into_fund\` is specifically for *handoff at chain shutdown* — the bridge is done with the scanner. For mid-chain inspection, the borrow is the right pattern. **\`into_*\` is for terminal state; \`fn x(&self) -> &T\` is for inspection.**

**Q6: Why does \`LiquidationRecord\` carry \`classification\` (the pre-close \`MarginHealth\`) if the bridge can re-derive it from the snapshot at any point?**

The bridge *could* re-derive it, but only if it kept the pre-close snapshots around — which it usually doesn't. The scanner already has them (it iterated through them); storing the classification in the record is O(1) extra space per record and saves the bridge from having to maintain its own snapshot history. **A record that captures a derivation made earlier saves callers from having to redo the upstream work.**

## Next lesson (L12) — \`scan\` method + first 4 unit tests

L12 implements the orchestration heart — the \`scan\` method. The method takes \`&[AccountSnapshot]\` and \`MarkPrice\`, classifies every account via L6's \`margin_health\`, dispatches Liquidatable/Underwater accounts through L10's \`solvent_close_outcome\` / \`underwater_close_outcome\`, mutates the fund in place via L9's \`InsuranceFund::deposit\` and \`::withdraw_shortfall\`, and builds a \`ScanReport\` along the way.

L12 also adds the four simplest unit tests:
- \`scan_empty_accounts_returns_empty_report\` — sanity check.
- \`scan_all_safe_accounts_does_nothing\` — no liquidations means no records.
- \`scan_atrisk_does_not_liquidate\` — AtRisk is a *warning*, not a trigger.
- \`scan_skips_flat_positions\` — defensive guard for misclassified flats.

After L12, the scanner is *runnable* — 59 tests pass total (34 compute + 21 insurance + 4 new scanner tests). L13 stress-tests it with 5 more nuanced unit tests and 4 conservation-law proptests, bringing the final count to 68.
`,
                },
                {
                  title: "Lesson 12 — scan — the orchestration heart of the safety cascade",
                  slug: "openhl-liquidation-scan-method-en",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 35,
                  xpReward: 70,
                  content: `# Lesson 12 — \`scan\` — the orchestration heart of the safety cascade

## Goal

Concepts you'll grasp in this lesson:

- **The \`scan\` method is the *only verb* in the orchestration layer; everything else is noun.** L11 declared four types that describe state; L12 implements one method that produces state from input. The method takes \`(accounts, mark)\` and returns a \`ScanReport\` — and inside its body, every Stage 10a + 10b primitive you've built across L4–L10 is called exactly once per liquidatable account. **Composition is the architecture; one verb consumes ten nouns.**
- **\`match\` on \`MarginHealth\` with a \`continue\`-guard is the cleanest "skip non-liquidatable accounts" pattern.** The alternative — \`if !matches!(c, MarginHealth::Liquidatable | MarginHealth::Underwater) { continue; }\` — is shorter but loses exhaustiveness. The \`match\` form makes the compiler enforce that *every* \`MarginHealth\` variant has been considered, which is the discipline that catches the future bug where someone adds a fifth variant. **Exhaustive \`match\` over an enum beats predicate-with-\`!\` whenever the enum might grow.**
- **The solvent-vs-underwater dispatch inside the loop directly mirrors L10's \`debug_assert!\` pair.** \`if post_close_equity >= fee_desired\` routes to \`solvent_close_outcome\`; the \`else\` routes to \`underwater_close_outcome\`. The scanner is doing exactly the routing that L10's debug-asserts said the caller would do. **The runtime predicate in the caller is identical to the contract enforced in the callee.**
- **The underwater branch's \`WithdrawOutcome\` pattern-match decomposes the L9 enum into a \`(paid, unfilled)\` tuple — that's the *only* place in the loop where L9's three-variant enum needs more than one line of handling.** Solvent closes never touch \`withdraw_shortfall\`; they only \`deposit\`. Underwater closes call \`withdraw_shortfall\` and pattern-match on the result. The aggregation into \`ScanReport\`'s i64 fields is a \`saturating_add\` per record. **The orchestration layer translates between L9's variants and L11's i64 aggregates in exactly one pattern-match.**

Verification:

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

…passes 59 tests (34 compute + 21 insurance + 4 new scanner tests). The next 5 unit tests and 4 proptests land in L13; after L13, 68 tests total.

Specific changes:

- **\`src/scanner.rs\`** — adds the \`scan\` method to the existing \`impl LiquidationScanner\` block. The L11 imports finally have a consumer; the unused-import warnings go away. Adds the \`#[cfg(test)] mod tests\` scaffolding (helpers + \`use\` block + first section divider) and the 4 simplest unit tests.

L12 makes the scanner *runnable*. L13 stress-tests it.

## Recap

After L11:
- \`scanner.rs\` has the type vocabulary (\`CloseOutcomeKind\`, \`LiquidationRecord\`, \`ScanReport\`, \`LiquidationScanner\`) and 5 accessors (\`new\`, \`with_empty_fund\`, \`fund_balance\`, \`fund\`, \`into_fund\`).
- \`lib.rs\` re-exports all four scanner types.
- \`cargo check\` compiles cleanly, with unused-import warnings on \`account_equity\`, \`close_order_spec\`, \`liquidation_fee\`, \`margin_health\`, \`notional_value\`, \`solvent_close_outcome\`, \`underwater_close_outcome\`, and \`WithdrawOutcome\` — all *staged for L12*.
- \`cargo test\` still runs L0–L10's 55 tests, all green.

L12 cashes in every one of those staged imports.

## Plan

Two edits:

1. **Add the \`scan\` method to the \`impl LiquidationScanner\` block** in \`crates/liquidation/src/scanner.rs\`. The method body is ~50 lines — the orchestration loop that ties Stage 10a margin classification, Stage 10b close-outcome decomposition, and the InsuranceFund state machine into one batch operation.
2. **Add the \`#[cfg(test)] mod tests\` block** with three helper imports, the \`snapshot\` factory, the \`default_params\` helper, and the 4 simplest unit tests.

> 🛑 **Predict.** Before reading further: you're writing a single function that, for each account in a slice, either liquidates it (with the fund moving in some direction) or skips it. List the *six* distinct branches the function body needs — including the two skip cases (Safe/AtRisk continue, flat-position continue) and the four work cases (solvent → fund deposit; underwater positive equity → partial fee + withdraw; underwater zero equity → no fee + full withdraw; underwater negative equity → no fee + extra-large withdraw).

(Answer in the body: the function has exactly two \`continue\` branches and two routing branches (solvent vs underwater), with the underwater branch unifying the three positive/zero/negative equity sub-cases under one \`underwater_close_outcome\` call — the call internally branches but presents one return type. So at the scanner level: **two skips + one solvent + one underwater = four branches**. The "six" you might have predicted collapses to four because L10's \`underwater_close_outcome\` already handled the sub-case unification. **Encapsulating sub-cases inside a callee shrinks the caller's branch count.**)

The scan-method shape:

\`\`\`
   ┌────────────────────────────────────────────────────────────┐
   │  scan(accounts, mark) → ScanReport                         │
   ├────────────────────────────────────────────────────────────┤
   │                                                            │
   │  let mut report = ScanReport::default();                   │
   │  for snapshot in accounts {                                │
   │                                                            │
   │      let classification = margin_health(...);              │
   │      match classification {                                │
   │          Safe | AtRisk => continue,    ←─ skip path 1       │
   │          Liquidatable | Underwater => {} ← work path        │
   │      }                                                     │
   │                                                            │
   │      if snapshot.position_size.0 == 0 { continue; } ← skip 2│
   │                                                            │
   │      let close_order = close_order_spec(snapshot);         │
   │                                                            │
   │      let outcome = if post_close_equity >= fee_desired {   │
   │          // Solvent branch                                 │
   │          let s = solvent_close_outcome(...);               │
   │          self.fund.deposit(s.fee_to_fund);                 │
   │          report.fund_deposits += s.fee_to_fund;            │
   │          CloseOutcomeKind::Solvent(s)                      │
   │      } else {                                              │
   │          // Underwater branch                              │
   │          let u = underwater_close_outcome(...);            │
   │          if u.fee_to_fund > 0 { self.fund.deposit(u.f_t_f);│
   │                                  report.fund_deposits +=  }│
   │          let w = self.fund.withdraw_shortfall(u.shortfall);│
   │          // Pattern-match on WithdrawOutcome → (paid, unfilled)│
   │          report.fund_withdrawals += paid;                  │
   │          report.unfilled_deficit  += unfilled;             │
   │          CloseOutcomeKind::Underwater(u)                   │
   │      };                                                    │
   │                                                            │
   │      report.records.push(LiquidationRecord { ... });       │
   │  }                                                         │
   │                                                            │
   │  report                                                    │
   │                                                            │
   └────────────────────────────────────────────────────────────┘
\`\`\`

Three things to notice about the shape:

1. **The outer iteration is \`for snapshot in accounts\` — a simple ordered loop.** No \`iter().filter().map().collect()\` chain. Why? Because each iteration has *side effects* (fund mutation, report mutation). Iterator chains compose well over pure transformations; for stateful per-iteration work, a plain \`for\` is more readable and easier to debug. **\`for\` loops beat iterator chains when iteration side-effects mutate state outside the closure.**
2. **The two \`continue\` branches are at the *top* of the loop body.** They reject inputs before the function commits to any work — classification first, flat-skip second. The "happy path" code (after the skips) sits inline at the same indent level, not nested inside an \`if\`. **Top-of-loop rejection is the cleanest pattern for skip-conditions; nesting would push the work deeper than it needs to go.**
3. **The aggregation into \`ScanReport\` fields uses \`saturating_add\` per iteration, not a final \`.iter().sum()\`.** L11's design choice (aggregate fields next to record vector) demands per-iteration accumulation. The cost is one \`saturating_add\` per scalar per record — a microsecond next to the work being done. **Single-pass accumulation matches the L11 design contract.**

## Walk-through

### Step 1: Add the \`scan\` method

Open \`crates/liquidation/src/scanner.rs\`. Find the existing \`impl LiquidationScanner { ... }\` block (which currently ends with the \`into_fund\` accessor). After \`into_fund\`, append the \`scan\` method:

\`\`\`rust
    /// Scan every account and produce a [\`ScanReport\`] of the resulting
    /// liquidations.
    ///
    /// All accounts are classified at the given \`mark\`. Liquidatable and
    /// Underwater accounts are converted to close orders + outcomes,
    /// with the insurance fund mutated in place. \`Safe\` and \`AtRisk\`
    /// accounts produce no record and no fund mutation.
    ///
    /// Flat positions (\`position_size == 0\`) that misclassify as
    /// Liquidatable are also skipped — \`close_order_spec\` would emit a
    /// zero-qty spec which the CLOB rejects.
    pub fn scan(
        &mut self,
        accounts: &[AccountSnapshot],
        mark: MarkPrice,
    ) -> ScanReport {
        let mut report = ScanReport::default();

        for snapshot in accounts {
            let classification = margin_health(snapshot, mark, &self.params);
            match classification {
                MarginHealth::Safe | MarginHealth::AtRisk => continue,
                MarginHealth::Liquidatable | MarginHealth::Underwater => {}
            }

            // Skip flat positions defensively — the upstream
            // classification should never put them here, but the math
            // for a zero-size position produces a zero-qty close order
            // which the CLOB rejects.
            if snapshot.position_size.0 == 0 {
                continue;
            }

            let close_order = close_order_spec(snapshot);

            // Decide solvent vs underwater path on post-close-equity vs
            // desired fee, exactly mirroring the compute module's
            // contract.
            let notional = notional_value(snapshot, mark);
            let fee_desired = liquidation_fee(notional, &self.params);
            let post_close_equity = account_equity(snapshot, mark);

            let outcome = if post_close_equity >= fee_desired {
                let solvent = solvent_close_outcome(snapshot, mark, &self.params);
                self.fund.deposit(solvent.fee_to_fund);
                report.fund_deposits =
                    report.fund_deposits.saturating_add(solvent.fee_to_fund);
                CloseOutcomeKind::Solvent(solvent)
            } else {
                let underwater = underwater_close_outcome(snapshot, mark, &self.params);
                if underwater.fee_to_fund > 0 {
                    self.fund.deposit(underwater.fee_to_fund);
                    report.fund_deposits = report
                        .fund_deposits
                        .saturating_add(underwater.fee_to_fund);
                }
                let withdraw = self.fund.withdraw_shortfall(underwater.shortfall_to_fund);
                let (paid, unfilled) = match withdraw {
                    WithdrawOutcome::Covered { amount } => (amount, 0),
                    WithdrawOutcome::PartiallyDrained { amount, unfilled } => {
                        (amount, unfilled)
                    }
                    WithdrawOutcome::Depleted { unfilled } => (0, unfilled),
                };
                report.fund_withdrawals = report.fund_withdrawals.saturating_add(paid);
                report.unfilled_deficit = report.unfilled_deficit.saturating_add(unfilled);
                CloseOutcomeKind::Underwater(underwater)
            };

            report.records.push(LiquidationRecord {
                account: snapshot.account,
                close_order,
                classification,
                outcome,
            });
        }

        report
    }
\`\`\`

Walking the body phase-by-phase:

#### Phase 1: Classify (lines 1-5 inside the loop)

\`\`\`rust
let classification = margin_health(snapshot, mark, &self.params);
match classification {
    MarginHealth::Safe | MarginHealth::AtRisk => continue,
    MarginHealth::Liquidatable | MarginHealth::Underwater => {}
}
\`\`\`

Three things to notice:

1. **The \`match\` is exhaustive — and the compiler enforces it.** L6's \`MarginHealth\` has exactly four variants; the two arms cover all four. If someone adds a fifth variant tomorrow (e.g., \`LiquidatableButOnHold\`), this \`match\` will fail to compile, and the build break tells us we need to decide which side it goes on. **The non-exhaustive alternative — \`if !matches!(c, Liquidatable | Underwater) { continue; }\` — would silently accept the new variant as a skip, hiding the design question.**
2. **The work-path arm is \`{} \`, not a body.** The arm exists *only* to make exhaustiveness work; the actual work happens after the \`match\`. This is the Rust idiom for "filter and fall through to the rest of the function." **Empty arms in \`match\` are how you fall through after exhaustiveness checking.**
3. **Or-patterns (\`Safe | AtRisk\`)** unify the two skip cases under one arm. The same trick L9's proptest used (\`Covered { amount } | PartiallyDrained { amount, .. }\`) reappears here for variant grouping. **Or-patterns are the rhythm of exhaustive-match code in Rust.**

Before Phase 2, the rejection-ladder structure that Phase 1's \`match\` and Phase 2's flat-check form together is worth pausing on. Both guards live at the top of the loop body and *exit the iteration* if they fire; the happy path then runs at the same indent level as the guards themselves, never nested inside an \`if\`:

\`\`\`
   Account slice ─┐
                  │
                  ▼
        [Phase 1: margin_health]
                  │
                  ├─ Safe / AtRisk ──────────→ continue (next iteration)
                  │
                  ▼ Liquidatable / Underwater
        [Phase 2: defensive flat-check]
                  │
                  ├─ size == 0 ──────────────→ continue (next iteration)
                  │
                  ▼ size != 0
        ── happy path (no nesting) ──
        Phase 3-6: close order, routing, fund mutation, push record
\`\`\`

The two rejection branches diverge *out of* the iteration; the happy-path code stays flat at one indent level. **The pattern is "filter at the top, work at the bottom, no nesting in between."**

#### Phase 2: Defensive flat-skip (lines 7-13)

\`\`\`rust
if snapshot.position_size.0 == 0 {
    continue;
}
\`\`\`

This is a defensive guard against a *theoretically-impossible* state: the only way for a flat position to reach this point is for \`margin_health\` to misclassify it as \`Liquidatable\` or \`Underwater\`, which L6's classification rules forbid (flat → ratio MAX → \`Safe\`). But the bridge can submit unsanitized snapshots, and L7's \`close_order_spec\` would produce a zero-qty \`CloseOrderSpec\` that the CLOB rejects. **The skip is cheap defensive coding — *protect downstream consumers from upstream bugs we can't enforce away.***

#### Phase 3: Generate close order (line 15)

\`\`\`rust
let close_order = close_order_spec(snapshot);
\`\`\`

One line. L7's pure function does all the work. **A single-line call to a Stage 10a function is what the orchestration layer's "use the primitives" look like.**

#### Phase 4: Routing decision (lines 17-24)

\`\`\`rust
let notional = notional_value(snapshot, mark);
let fee_desired = liquidation_fee(notional, &self.params);
let post_close_equity = account_equity(snapshot, mark);

let outcome = if post_close_equity >= fee_desired {
    // ... solvent branch
} else {
    // ... underwater branch
};
\`\`\`

Five things to notice:

1. **The predicate is exactly the inverse of L10's \`underwater_close_outcome\` \`debug_assert!\` (\`equity < fee\`).** L10's assertion said "underwater means equity < fee"; here we use \`>=\` for solvent. The scanner's runtime check matches L10's compile-time contract. **The scanner does *no math* L10 didn't already document.**
2. **Three local variables (\`notional\`, \`fee_desired\`, \`post_close_equity\`) before the predicate.** Each is named, each is one line, each is an existing function call. The reader walks down the local-variable cascade and arrives at the predicate knowing exactly what's on each side. **Locally-named intermediate values are the cheapest readability win.**
3. **\`solvent_close_outcome\` and \`underwater_close_outcome\` are called *separately* in each branch — they're not unified into one routed call.** A unified call (\`let outcome = if is_solvent { solvent_close_outcome(...) } else { underwater_close_outcome(...) }\`) would force one of them to be called with a precondition violation in the *other* branch, triggering L10's \`debug_assert!\`. Keeping them in separate branches makes each call self-consistent with its precondition. **Separate the dispatch from the call; each callee gets its precondition met cleanly.**
4. **The local variable \`outcome\` is set inside the \`if\`/\`else\` and used after.** It's a \`let outcome = if ... { ... } else { ... };\` pattern. Rust's if-as-expression returns a value, so this is idiomatic. **\`let x = if y { a } else { b };\` is the Rust way of conditionally computing a value.**
5. **Both branches return a \`CloseOutcomeKind\` variant.** The two variants share a parent type; the \`if\`/\`else\` types out cleanly. **An \`if\`/\`else\` returning two variants of the same enum is the safest pattern for variant-routing.**

#### Phase 5a: Solvent branch (3 lines)

\`\`\`rust
let solvent = solvent_close_outcome(snapshot, mark, &self.params);
self.fund.deposit(solvent.fee_to_fund);
report.fund_deposits = report.fund_deposits.saturating_add(solvent.fee_to_fund);
CloseOutcomeKind::Solvent(solvent)
\`\`\`

Three things to notice:

1. **\`fee_to_fund\` is read three times: once into \`deposit\`, once into the aggregate, once as part of the moved \`solvent\` value into \`CloseOutcomeKind::Solvent\`.** Because \`SolventClose\` is \`Copy\`, this is free — no clones, no borrows. **\`Copy\`-derived types let you spread fields across multiple writes without ownership ceremony.**
2. **No conditional on \`fee_to_fund == 0\`.** Solvent closes always have positive \`fee_to_fund\` (per L10's contract — the precondition was \`equity >= fee\`, and fee is positive). If we wrote \`if solvent.fee_to_fund > 0 { ... }\` here, we'd be checking a condition that's guaranteed false-or-impossible. **Don't defend against conditions the type contract has already ruled out.**
3. **No call to \`withdraw_shortfall\`.** Solvent closes credit the fund and pay residual back to the trader; the fund is *never* drawn from. The bridge does the trader-balance crediting (using \`solvent.residual_to_account\`) — that's outside the scanner's scope. **The scanner only mutates the fund; the bridge handles trader balances.**

#### Phase 5b: Underwater branch (8 lines)

\`\`\`rust
let underwater = underwater_close_outcome(snapshot, mark, &self.params);
if underwater.fee_to_fund > 0 {
    self.fund.deposit(underwater.fee_to_fund);
    report.fund_deposits = report
        .fund_deposits
        .saturating_add(underwater.fee_to_fund);
}
let withdraw = self.fund.withdraw_shortfall(underwater.shortfall_to_fund);
let (paid, unfilled) = match withdraw {
    WithdrawOutcome::Covered { amount } => (amount, 0),
    WithdrawOutcome::PartiallyDrained { amount, unfilled } => (amount, unfilled),
    WithdrawOutcome::Depleted { unfilled } => (0, unfilled),
};
report.fund_withdrawals = report.fund_withdrawals.saturating_add(paid);
report.unfilled_deficit = report.unfilled_deficit.saturating_add(unfilled);
CloseOutcomeKind::Underwater(underwater)
\`\`\`

Six things to notice:

1. **The \`if underwater.fee_to_fund > 0\` guard exists** because L10's \`underwater_close_outcome\` *can* return \`fee_to_fund == 0\` (the "already underwater pre-fee" sub-case). \`deposit(0)\` is a no-op per L8, but the guard saves the \`saturating_add\` and the function-call overhead. **Predicates that gate "do nothing" actions are cheap correctness.**
2. **The pattern-match on \`WithdrawOutcome\` destructures into \`(paid, unfilled)\`.** All three variants collapse to one tuple shape:

   - \`WithdrawOutcome::Covered { amount }\` → \`(amount, 0)\` — fund paid out the full requested shortfall; nothing escalates.
   - \`WithdrawOutcome::PartiallyDrained { amount, unfilled }\` → \`(amount, unfilled)\` — fund paid out everything it had; the remainder is recorded as protocol-level unfilled deficit.
   - \`WithdrawOutcome::Depleted { unfilled }\` → \`(0, unfilled)\` — fund was already empty; nothing paid out, full shortfall escalates.

   The conservation law \`amount + unfilled = requested_shortfall\` holds in all three rows (L9's proptest proved it). L13 will lift that law from the per-call level to the per-scan level via \`report_unfilled_equals_sum_of_unfilled_shortfalls\`. **The tuple is the *normalized form* of L9's variant payloads — three different shapes collapse to one \`(i64, i64)\`, and conservation carries forward.**
3. **The match arms use *or-pattern destructuring* indirectly.** Strictly speaking they're three separate arms, but each arm computes the same tuple shape \`(paid, unfilled)\`. The visual symmetry makes the code easy to scan. **Pattern-match arms that compute a uniform output type are visually parallel — make them line up.**
4. **The \`paid\` and \`unfilled\` are immediately consumed by \`saturating_add\` on the report.** Both per-variant aggregations happen in two lines. The match → tuple → aggregate cascade is the standard "enum-to-scalar" pattern across the crate. **L9's \`WithdrawOutcome\` returns *information*; the scanner converts it to *numbers*.**
5. **\`saturating_add\` on both \`fund_withdrawals\` and \`unfilled_deficit\`.** Even though both running totals are bounded by realistic protocol scale (~$10^15 max), saturation is the consistent discipline. **Saturating arithmetic everywhere costs nothing and consistently respects the determinism contract.**
6. **The final line — \`CloseOutcomeKind::Underwater(underwater)\` — moves \`underwater\` into the enum.** This is the only place \`underwater\` is consumed after its fields are read; \`UnderwaterClose\` is \`Copy\`, so the move is just a value-copy. **\`Copy\` types let "read fields, then move into enum" feel like a free operation.**

#### Phase 6: Push the record (lines 26-30)

\`\`\`rust
report.records.push(LiquidationRecord {
    account: snapshot.account,
    close_order,
    classification,
    outcome,
});
\`\`\`

The struct-construction is direct: four fields, each a local already in scope. **At the end of every iteration, one push.** That's the only allocation \`scan\` does per-record (the \`Vec\` may grow, but the push itself is a tail allocation). **Per-iteration allocation is bounded by record count; no scratch allocations.**

> 🛑 **Anti-fluency.** "Why is the for-loop using indexes or \`iter()\`? Wouldn't \`iter().filter_map(...).collect()\` be more idiomatic?" Two problems. (1) \`filter_map\` over a closure that mutates \`self.fund\` borrows \`self\` exclusively for the entire iterator chain, which collides with the closure capture. Rust's borrow checker rejects this without major refactoring (interior mutability or splitting the fund out). (2) Even if it compiled, the iterator chain hides the per-iteration side effects (deposit, withdraw, aggregate-add) inside a \`map\` closure — readers can't easily see "this iteration mutated the fund." **For loops with \`&mut self\` capture beat iterator chains when the body mutates the enclosing self.**

### Step 2: Add the test module scaffolding

Append the test module at the bottom of \`scanner.rs\`. The scaffolding has three parts: imports, helpers, and the first section divider.

\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;
    use openhl_funding::{Notional, PositionSize};
    use proptest::prelude::*;

    fn snapshot(account: u64, size: i64, entry: u64, collateral: i64) -> AccountSnapshot {
        AccountSnapshot {
            account: AccountId(account),
            position_size: PositionSize(size),
            avg_entry: MarkPrice(entry),
            collateral: Notional(collateral),
        }
    }

    fn default_params() -> LiquidationParams {
        LiquidationParams::hyperliquid_default()
    }

    // ─── empty / non-liquidatable input ────────────────────────────
\`\`\`

Three things to notice:

1. **\`use proptest::prelude::*;\` is imported even though L12 has no proptests.** Staged for L13. Same staging discipline as L11's \`account_equity\` import. **Tests in this course are written *forward-compatibly* — L12's \`use\` block is L13's \`use\` block.**
2. **The \`snapshot\` helper packages 4 fields into the full \`AccountSnapshot\` struct.** Mirroring L4's \`compute::tests::snapshot\` helper (same name, same return type). This keeps every test's first line readable: \`let s = snapshot(1, 1, 100_000, 50_000);\` reads as "account 1, long 1 BTC, entry $100k, $50k collateral." **Test helpers that hide irrelevant construction noise are worth their weight; here, the alternative would be 8 lines per test.**
3. **The section divider \`// ─── empty / non-liquidatable input ───\` matches the style we established in L8/L9.** The Liquidation course's test files use box-drawing dividers consistently. **Consistent test-file structure across modules is a small but compounding readability win.**

### Step 3: Add the 4 simple unit tests

Inside the test module, append:

\`\`\`rust
    #[test]
    fn scan_empty_accounts_returns_empty_report() {
        let mut s = LiquidationScanner::with_empty_fund(default_params());
        let report = s.scan(&[], MarkPrice(100));
        assert!(report.records.is_empty());
        assert_eq!(report.fund_deposits, 0);
        assert_eq!(report.fund_withdrawals, 0);
        assert_eq!(report.unfilled_deficit, 0);
    }

    #[test]
    fn scan_all_safe_accounts_does_nothing() {
        // Long 1 @ $100k, $50k collateral, mark $100k → 50% ratio = Safe.
        let accts = vec![
            snapshot(1, 1, 100_000, 50_000),
            snapshot(2, 1, 100_000, 50_000),
        ];
        let mut s = LiquidationScanner::with_empty_fund(default_params());
        let report = s.scan(&accts, MarkPrice(100_000));
        assert!(report.records.is_empty());
    }

    #[test]
    fn scan_atrisk_does_not_liquidate() {
        // Long 1 @ $100k, $5k collateral, mark $100k → 5% ratio
        // 5% > 2% maintenance, < 10% initial → AtRisk; no liquidation.
        let accts = vec![snapshot(1, 1, 100_000, 5_000)];
        let mut s = LiquidationScanner::with_empty_fund(default_params());
        let report = s.scan(&accts, MarkPrice(100_000));
        assert!(report.records.is_empty());
    }

    #[test]
    fn scan_skips_flat_positions() {
        // Flat (size 0) accounts misclassified somewhere upstream get
        // silently skipped. Default ratio for flat positions is MAX
        // (Safe), so this is also defensive against future
        // classification changes.
        let accts = vec![snapshot(1, 0, 100_000, 1_000)];
        let mut s = LiquidationScanner::with_empty_fund(default_params());
        let report = s.scan(&accts, MarkPrice(100_000));
        assert!(report.records.is_empty());
    }
\`\`\`

Eight things to notice about the test design:

1. **\`scan_empty_accounts_returns_empty_report\` asserts *all four* \`ScanReport\` fields.** Records empty, three aggregates at 0. The four assertions catch a future bug where the \`ScanReport::default()\` initialization stops being all-zero — a regression even smaller than a logic bug. **Default-state tests assert every field of the default.**
2. **\`scan_all_safe_accounts_does_nothing\` uses *two* accounts, not one.** Why two? Because one-account tests can mask a "loop ran for the first iteration but skipped the second" bug. Two accounts force the loop to iterate twice, both times producing nothing. **Multi-account skip tests beat single-account skip tests at catching loop-control bugs.**
3. **The arithmetic comments in \`scan_all_safe_accounts_does_nothing\` document the expected classification.** "50% ratio = Safe" lets a reader follow the L1–L6 logic mentally without re-deriving it. **Test comments that name the classification path are how curriculum reinforcement happens here.**
4. **\`scan_atrisk_does_not_liquidate\` is the *most pedagogically important* of the four.** It establishes that \`AtRisk\` is a *warning state*, not a *trigger state*. If a future maintainer "promotes" AtRisk to trigger liquidation (by adding it to the match arm), this test fails immediately. **Tests for stable architectural boundaries are how the course's design choices survive refactoring.**
5. **The 5% boundary in \`scan_atrisk_does_not_liquidate\` is *deliberately* close to the maintenance margin (2%) and the initial margin (10%).** A value at 1% (< maintenance) would be Liquidatable; a value at 15% (> initial) would be Safe; 5% is the *middle* — both sides of the AtRisk boundary feel testable from here. **Boundary tests pick values that exercise the *interior* of the classification, not just the edges.**
6. **\`scan_skips_flat_positions\` uses \`snapshot(1, 0, 100_000, 1_000)\`.** Notice \`size = 0\` — the flat case. Even though L6's \`margin_ratio\` returns MAX for flat positions (which would classify as Safe and skip via the Phase-1 \`continue\`), the test exercises the Phase-2 defensive guard *in case* an upstream change promotes flats to Liquidatable. **Defense-in-depth tests verify the second layer of protection independent of the first.**
7. **All four tests use \`LiquidationScanner::with_empty_fund(default_params())\`.** No starting fund balance, default Hyperliquid params. Consistency lets the reader scan all four tests and absorb only the *differences* (accounts, mark). **Per-test isolation lets you read the diff between tests at a glance.**
8. **The test names form a 4-step narrative:** empty → all-Safe → all-AtRisk → flat. The reader learning "what scan skips" walks through them in order and builds a complete mental model. **Test ordering can encode pedagogical progression.**

### Step 4: Run the tests

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

Expected output (abbreviated):

\`\`\`
running 59 tests
test compute::tests::close_flat_has_zero_qty ... ok
... (33 more compute tests from L0–L10)
test insurance::tests::balance_never_negative ... ok
... (20 more insurance tests from L8–L9)
test scanner::tests::scan_all_safe_accounts_does_nothing ... ok
test scanner::tests::scan_atrisk_does_not_liquidate ... ok
test scanner::tests::scan_empty_accounts_returns_empty_report ... ok
test scanner::tests::scan_skips_flat_positions ... ok

test result: ok. 59 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

**59 tests passing. The scanner is *runnable*.** L13 stress-tests it with 5 nuanced unit tests (solvent fee deposit, underwater fully/partially/depleted, mixed batch, FIFO fairness) plus 4 proptests (conservation laws across scans). After L13, 68 tests total.

Common errors:

- **Compile error: \`cannot find function \\\`account_equity\\\` in this scope\`** — the L11 imports staged six compute functions; if you forgot one (or removed an unused-import warning by deleting an import you actually need), \`scan\` won't compile. Re-add the missing function from the \`use crate::compute::{...}\` line at the top of \`scanner.rs\`.
- **Test fail: \`assertion failed: report.records.is_empty()\` on \`scan_all_safe_accounts_does_nothing\`** — your \`margin_health\` is misclassifying 50% ratio. L6 said 50% > 10% initial = Safe; if your \`match\` arm reads \`MarginHealth::Safe | MarginHealth::Liquidatable\` (typo), then Safe gets liquidated. Re-read the \`match\`'s arm 1.
- **Test fail: \`report.fund_deposits != 0\` on \`scan_empty_accounts_returns_empty_report\`** — your \`ScanReport::default()\` is mis-derived. The \`derive(Default)\` on \`ScanReport\` is what makes this test green; if you \`impl Default\` manually with non-zero defaults, you break the contract.
- **Compile error: \`the trait bound \\\`SomeType: Copy\\\` is not satisfied\`** — somewhere in the \`outcome = if ... { ... }\` branches you have a type that the compiler thinks is non-\`Copy\`. Check that \`SolventClose\` and \`UnderwaterClose\` both have \`#[derive(Clone, Copy, Debug, PartialEq, Eq)]\` (they do, from L10) — if they don't, the \`if\`/\`else\` returning these variants needs them.

## Design reflection

Three load-bearing decisions in this lesson:

1. **The \`scan\` method is a *thin orchestrator*, not a *fat coordinator*.** Every line in \`scan\` either calls a Stage 10a/10b primitive or applies a \`saturating_add\` to a \`ScanReport\` field. No new math, no new policy, no new data shape. **Orchestration layers should call primitives, not duplicate them.**

2. **Exhaustive \`match\` beats predicate-with-\`!\`.** The \`MarginHealth\` \`match\` in Phase 1 is the discipline that catches future enum-variant additions. If we wrote \`if !matches!(c, Liquidatable | Underwater) { continue; }\`, adding a fifth variant tomorrow would silently classify it as a skip. **Exhaustive \`match\` is how an enum and its consumers stay in sync across refactors.**

3. **The \`WithdrawOutcome → (paid, unfilled)\` tuple destructuring is the *only* place L9's enum needs more than one line of orchestration handling.** Three variants collapse to one \`(i64, i64)\` because the aggregation contract is uniform. **L9's \`WithdrawOutcome\` returns information; the scanner converts it to numbers.**

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout 0a8464e
diff -u ~/code/my-openhl/crates/liquidation/src/scanner.rs ./crates/liquidation/src/scanner.rs
\`\`\`

After L12:
- **scanner.rs** matches Stage 10c's \`scanner.rs\` **through the test module's \`scan_skips_flat_positions\` test**. Specifically: doc + imports + \`CloseOutcomeKind\` + \`LiquidationRecord\` + \`ScanReport\` + \`LiquidationScanner\` struct + 5 accessors + \`scan\` method + test module scaffolding + 4 simple unit tests. The 5 nuanced unit tests and 4 proptests land in L13.

## Common questions

**Q1: Why does \`scan\` take \`&[AccountSnapshot]\` instead of \`&mut [AccountSnapshot]\`? The scanner doesn't need to write to the snapshots.**

The scanner *doesn't* need to write to snapshots — exactly. \`&[T]\` (immutable slice) signals "I read-only consume this slice." \`&mut [T]\` (mutable slice) would imply the scanner *could* mutate the snapshots, which it shouldn't and doesn't. **Choose the borrow that matches the function's needs, not the caller's convenience.** The caller (bridge) can pass \`&accounts[..]\` even if it owns \`accounts\` mutably elsewhere.

**Q2: Why does \`scan\` take \`MarkPrice\` by value but \`&self.params\` by reference inside?**

\`MarkPrice\` is a 1-field \`Copy\` struct — passing by value is free. \`LiquidationParams\` is a 3-field \`Copy\` struct that the scanner already owns, so passing \`&self.params\` to the called functions avoids a struct-copy. Both choices are about cost-of-copy: tiny \`Copy\` types go by value, larger \`Copy\` types go by reference. **Pass \`Copy\` types by value when they're tiny; by reference when they're bigger.**

**Q3: Could the \`for snapshot in accounts\` loop be replaced with \`accounts.iter().enumerate().for_each(|(i, snap)| ...)\` to track the iteration index?**

Yes, but the index isn't needed — \`LiquidationRecord\` carries \`account: AccountId\` from the snapshot, which is the *durable* identifier. The iteration index would be a synthetic ID (positional in the slice) that means nothing to downstream consumers. **Identifiers should be domain-meaningful, not iteration-positional.**

**Q4: Why doesn't \`scan\` early-return after the loop body if the scanner reaches a "fund fully depleted" state?**

Because the L11 design contract says aggregate fields capture *everything* that happens during the scan, including post-depletion underwater closes. An early return would cut off the audit trail; a Liquidatable account in iteration position 50 would never produce a \`LiquidationRecord\`, and the bridge would miss it. **Scan completes the batch even if the fund's been emptied; the aggregate \`unfilled_deficit\` is the bridge's signal that more aggressive policy (ADL) is needed.**

**Q5: What if two snapshots in the slice have the same \`AccountId\`?**

The scanner processes them in iteration order. The first one's \`LiquidationRecord\` and fund-mutations land first; the second's land second. There's no deduplication. This is *by design* — the scanner trusts the bridge to deliver a deterministic, deduplicated slice. Duplicate-account behavior would be a bridge bug, not a scanner bug. **Trust the caller for invariants the caller controls.**

**Q6: The body uses \`report.fund_deposits = report.fund_deposits.saturating_add(...)\`. Could this be \`report.fund_deposits += ...\` instead?**

The \`+=\` operator's behavior changes between build profiles: **panics on overflow in debug, silently *wraps* (two's-complement modular arithmetic) in release**. The release-build wrap is the actual consensus danger — it doesn't crash, so an overflowing add on one validator quietly produces a different \`i64\` than the others. The result is a state disagreement → a chain fork. The debug panic is the easy failure mode; the silent release wrap is the *deceptive* one. \`saturating_add\` clamps to \`i64::MAX\` (or \`i64::MIN\`) under every build profile, so every validator sees the same value regardless of which compiler flags they used. **\`+=\` is fine for non-consensus arithmetic; \`saturating_add\` is the standard for state that validators must agree on byte-for-byte.**

## Next lesson (L13) — Module 4 capstone: 5 nuanced unit tests + 4 proptests

L13 closes Module 4 — and Stage 10c — and Module 10 of openhl entirely. The 5 nuanced unit tests cover:
- \`scan_liquidatable_solvent_deposits_fee\` — happy path: trader's collateral covers everything.
- \`scan_underwater_fully_covered_drains_fund_partially\` — fund drains but covers.
- \`scan_underwater_partial_drain_surfaces_unfilled\` — fund partially drains; some shortfall escalates.
- \`scan_underwater_depleted_fund_escalates_full_shortfall\` — fund already empty.
- \`scan_first_underwater_gets_paid_then_second_unfilled\` — FIFO fairness with multiple underwater accounts.

Plus a \`scan_mixed_batch_processes_only_unhealthy\` to verify the loop handles heterogeneous batches.

The 4 proptests verify conservation laws across scans:
- \`fund_balance_never_negative_across_scans\` — the L8 invariant extends to multi-account scans.
- \`report_unfilled_equals_sum_of_unfilled_shortfalls\` — \`unfilled_deficit\` is consistent with per-account unfilled amounts.
- \`fund_deposits_minus_withdrawals_equals_balance_change\` — fund accounting closes.
- \`scan_preserves_account_order_in_records\` — determinism: records appear in input order.

After L13, the Liquidation crate is *complete* — 68 tests, byte-for-byte against \`0a8464e\`. The reader has built an entire pure-compute + state-machine + orchestration cascade in 13 lessons.
`,
                },
                {
                  title: "Lesson 13 — Scanner capstone — 6 nuanced unit tests + 4 invariant proptests + the Stage 10 retrospective",
                  slug: "openhl-liquidation-scanner-capstone-en",
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 40,
                  xpReward: 80,
                  content: `# Lesson 13 — Scanner capstone — 6 nuanced unit tests + 4 invariant proptests + the Stage 10 retrospective

## Goal

Concepts you'll grasp in this lesson:

- **The 6 nuanced unit tests form a 4×2 matrix.** Four outcomes (solvent-close, fully-covered-underwater, partial-drain-underwater, depleted-underwater) crossed with two batch shapes (single-account-batch, multi-account-batch). The mixed-batch test is the explicit 4-state proof; the FIFO test is the multi-underwater fairness proof. **Together they exercise every reachable interaction between L6 classification, L10 close-outcomes, and L8/L9 fund operations.**
- **The 4 proptests encode invariants the type system can't.** Fund accounting closes (\`before + deposits − withdrawals = after\`). Unfilled deficit implies an empty fund (\`unfilled > 0 ⇒ balance == 0\`). Record count is bounded by input count (\`|records| ≤ |accounts|\`). Determinism holds (\`scan(same inputs) ≡ scan(same inputs)\`). **Each invariant is a contract the scanner must keep across every scan, every block, every validator.**
- **Conservation laws compose vertically across the crate.** Three layers, three identities, one math story:

  \`\`\`
  L9  (single fund call):       amount + unfilled                    = shortfall
  L10 (single position close):  fee_to_fund + residual_to_account    = post_close_equity
  L13 (per-block scan batch):   balance_before + Σ deposits − Σ withdrawals = balance_after
  \`\`\`

  **Each layer's conservation law is consumed by the next layer's invariant; the crate's math closes.**
- **Stage 10 is *three* stages plus *one* trilogy.** Stage 10a (margin math) built the pure-compute classifier. Stage 10b (insurance fund + close-outcome decomposition) introduced state and the credit/debit decomposition. Stage 10c (multi-account scanner) tied them together with one orchestration loop. **L13 closes the trilogy: 69 tests, 4 modules, byte-for-byte against \`0a8464e\`.**

Verification:

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

…passes 69 tests (34 compute + 21 insurance + 14 scanner = 10 unit + 4 proptest). The liquidation crate is *complete* against Stage 10c's answer key.

> **Note on the count:** L11 and L12's next-lesson previews said "68 total" — that was an off-by-one. The actual L13 adds 6 nuanced unit tests, not 5; the FIFO-fairness test is its own test, distinct from the mixed-batch test. The correct total is 69. (The cascade-math reasoning is unaffected.)

Specific changes:

- **\`src/scanner.rs\`** — adds 6 nuanced unit tests after the 4 simple ones from L12, and a \`proptest!\` block with 4 invariant properties.

After L13, the Liquidation course is complete. Stage 10d (ADL) is the next openhl roadmap entry but is a separate course.

## Recap

After L12:
- \`scanner.rs\` has the type vocabulary (L11), the \`scan\` method (L12), and 4 simple unit tests covering the skip paths.
- \`cargo test\` runs 59 tests, all green.
- The scanner *works* — it iterates, classifies, dispatches, mutates, aggregates, returns. But the only tests so far cover the "skip" cases. The four "work" outcomes — solvent, fully-covered, partial-drain, depleted — have no per-scan assertions yet.

L13 fills that gap, then locks the invariants with proptests, then steps back for the Stage 10 retrospective.

## Plan

Three edits:

1. **Append 6 nuanced unit tests** to the existing \`#[cfg(test)] mod tests\` block in \`crates/liquidation/src/scanner.rs\`.
2. **Append a \`proptest!\` block** with 4 invariant properties at the bottom of the test module.
3. **Verify** with \`cargo test\`. After this commit, the Liquidation crate is byte-for-byte against \`0a8464e\`.

> 🛑 **Predict.** Before reading further: name the four "fund state transitions" a single liquidation can cause, and pair each one with the \`WithdrawOutcome\` variant or \`deposit\` call that drives it. Then: which of those transitions can *not* happen if the input is \`Solvent\` (i.e., \`Liquidatable && post_close_equity ≥ fee\`)?

(Answer: **Four transitions** are (a) \`+fee\` only (solvent close — \`deposit\`, no withdraw), (b) \`+fee_partial − shortfall_full\` (underwater with positive equity — \`deposit\` + \`withdraw_shortfall\` returning \`Covered\`), (c) \`0 − shortfall_partial\` (underwater already underwater, fund partially drained — \`withdraw_shortfall\` returning \`PartiallyDrained\`), (d) \`0 − 0_with_unfilled\` (underwater with depleted fund — \`withdraw_shortfall\` returning \`Depleted\`). **Transitions b, c, d cannot happen on a Solvent input** — L10's \`debug_assert!\` would fire. Solvent inputs only drive transition (a). **The 4 nuanced unit tests exercise transitions a, b, c, d. The 5th (mixed batch) and 6th (FIFO) verify that the orchestration loop processes multi-account batches correctly.**)

The scan-coverage matrix:

\`\`\`
   ┌─────────────────────────────────────────────────────────────┐
   │  Test coverage matrix — Stage 10c                             │
   ├─────────────────────────────────────────────────────────────┤
   │                                                              │
   │  4 outcomes × 2 batch shapes:                                │
   │                                                              │
   │                  single account     multi-account            │
   │                  ──────────────     ──────────────           │
   │  Solvent         #1 ✓                (covered by mixed)      │
   │  Covered uw      #2 ✓                                        │
   │  Partial uw      #3 ✓                #6 ✓ (FIFO fairness)    │
   │  Depleted uw     #4 ✓                                        │
   │                                                              │
   │  Mixed-batch     —                   #5 ✓ (4 health states)  │
   │                                                              │
   │  Proptests (cross-cutting):                                  │
   │  ────────────────────────                                    │
   │  #1 fund_balance_delta_matches_report                        │
   │  #2 unfilled_implies_empty_fund                              │
   │  #3 records_count_bounded_by_accounts                        │
   │  #4 scan_is_deterministic                                    │
   │                                                              │
   └─────────────────────────────────────────────────────────────┘
\`\`\`

Two things to notice about the matrix:

1. **The single-account column covers all 4 outcomes; the multi-account column covers the *interesting* compound cases** (mixed health states + FIFO fairness). We don't need a "multi-account Solvent" test because per-account behavior is the same in both columns — the orchestration loop is the same on iteration 2 as on iteration 1. **Test what's *new* when multiplicity is introduced; don't repeat what's already proven.**
2. **The 4 proptests are *cross-cutting* — they apply to every outcome and every batch shape**. They're not in the matrix because they're orthogonal to it. **Unit tests verify specific points; proptests verify the *shape* of all points.**

## Walk-through

### Step 1: Add the 6 nuanced unit tests

Inside the existing \`#[cfg(test)] mod tests\` block in \`scanner.rs\`, after the 4 simple tests from L12, append the 6 nuanced cases. The tests are grouped by single-vs-multi-account and by outcome.

#### Test 1: Solvent close deposits fee

\`\`\`rust
    // ─── single Liquidatable: solvent close ────────────────────────

    #[test]
    fn scan_liquidatable_solvent_deposits_fee() {
        // size=1, entry=1_000, collateral=20, mark=999.
        //   notional=999; fee = 999 × 150 / 10_000 = 14
        //   pnl = -1; post_close_equity = 19
        //   ratio = 19 / 999 × 10_000 = 190 bps < 200 maint → Liquidatable
        //   post_close_equity (19) ≥ fee (14) → solvent close
        //   residual_to_account = 19 - 14 = 5
        let accts = vec![snapshot(7, 1, 1_000, 20)];
        let mut s = LiquidationScanner::with_empty_fund(default_params());
        let report = s.scan(&accts, MarkPrice(999));

        assert_eq!(report.records.len(), 1);
        let rec = &report.records[0];
        assert_eq!(rec.account, AccountId(7));
        assert_eq!(rec.classification, MarginHealth::Liquidatable);
        match rec.outcome {
            CloseOutcomeKind::Solvent(s) => {
                assert_eq!(s.fee_to_fund, 14);
                assert_eq!(s.residual_to_account, 5);
            }
            CloseOutcomeKind::Underwater(_) => panic!("expected Solvent"),
        }
        assert_eq!(report.fund_deposits, 14);
        assert_eq!(report.fund_withdrawals, 0);
        assert_eq!(report.unfilled_deficit, 0);
        assert_eq!(s.fund_balance(), 14);
    }
\`\`\`

Five things to notice:

1. **The comment block walks the math step-by-step from primitives.** notional → fee → pnl → equity → ratio → classification → routing decision → outputs. A reader debugging a failing test reads this comment and re-derives the expected values from the snapshot's 4 inputs. **Math-walk comments turn a single test into a worked example of the full Stage 10a + 10b pipeline.** (A subtle bind-name note: the test introduces \`let mut s = LiquidationScanner::...\` and *also* shadows \`s\` inside the \`match\` arm via \`CloseOutcomeKind::Solvent(s)\`. Inside the arm, \`s\` is the \`SolventClose\` payload; the moment the arm closes, the outer scanner \`s\` is back in scope, which is why \`s.fund_balance()\` two lines later works. This is a deliberate Rust idiom — shadowing inside a match arm is scope-bounded — but new readers should recognize the dual binding for what it is.)
2. **The chosen numbers — entry=1_000, collateral=20, mark=999 — pick a *boundary case*** where ratio (190 bps) is just barely below maintenance (200 bps). A bug that flipped the inequality (\`>\` instead of \`>=\`, etc.) would land 190 in the wrong bucket. **Boundary inputs make tests catch off-by-one in classification predicates.**
3. **The \`match\` on \`outcome\` uses \`panic!("expected Solvent")\` for the wrong variant.** Failure messages name the *expected* variant; a future reader of a failing test log immediately knows which branch they meant to hit. **Panic messages name the expected variant, not the unexpected one.**
4. **All four \`ScanReport\` fields are asserted, plus \`fund_balance()\`.** The aggregate fields are checked even though the per-record \`outcome\` already implies them. Why? Because the L11 design contract said aggregates are first-class — a regression that breaks the aggregation math is a different bug class than one that breaks the per-record decomposition. **Aggregate fields and per-record fields get separate assertions; they're separate invariants.**
5. **\`s.fund_balance() == 14\` proves the fund actually mutated** — not just that the report claims it did. The fund is *state*, not derivation; a separate read confirms the report doesn't lie. **State changes deserve a separate post-call read; reports describing them deserve their own assertions.**

#### Test 2: Underwater account, fully covered by fund

\`\`\`rust
    // ─── single Underwater: fully covered by fund ──────────────────

    #[test]
    fn scan_underwater_fully_covered_drains_fund_partially() {
        // 1 BTC long, entry $100k, $10k collateral, mark $80,500 →
        // pnl = −19_500, equity = −9_500 → Underwater.
        // notional = 80_500, fee = 1_207, shortfall = 1_207 + 9_500 = 10_707.
        // Start fund with $20k — covers in full.
        let accts = vec![snapshot(1, 1, 100_000, 10_000)];
        let fund = InsuranceFund::new(20_000);
        let mut s = LiquidationScanner::new(default_params(), fund);
        let report = s.scan(&accts, MarkPrice(80_500));

        assert_eq!(report.records.len(), 1);
        match report.records[0].outcome {
            CloseOutcomeKind::Underwater(u) => {
                assert_eq!(u.fee_to_fund, 0); // already underwater pre-fee
                assert_eq!(u.shortfall_to_fund, 10_707);
            }
            CloseOutcomeKind::Solvent(_) => panic!("expected Underwater"),
        }
        assert_eq!(report.fund_deposits, 0);
        assert_eq!(report.fund_withdrawals, 10_707);
        assert_eq!(report.unfilled_deficit, 0);
        assert_eq!(s.fund_balance(), 20_000 - 10_707);
    }
\`\`\`

Four things to notice:

1. **The Perp Primer L3 scenario reappears for the fourth time** in this course: $100k entry, $10k collateral, $80,500 close, $19,500 PnL, $9,500 negative equity. The numbers thread through L10's \`fee_basic\`, L10's \`underwater_close_already_underwater_pre_fee\`, and now L13's scanner-level test. **Curriculum reinforcement compounds: by L13 the reader recognizes the numbers without re-deriving them.**
2. **\`fee_to_fund == 0\`** — confirmed at the scanner level. The L10 contract said "negative equity pre-fee → no fee collected"; L13 verifies the contract is preserved through the orchestration layer. **Cross-layer contract tests verify that orchestration doesn't *break* the lower-layer guarantees.**
3. **\`fund_deposits == 0\` AND \`fund_withdrawals == 10_707\`** — the aggregate fields show *zero deposit* (because \`fee_to_fund == 0\`) and *full withdrawal* (because the fund had enough). The two aggregates together describe the full balance-flow story. **Aggregate fields are the bridge's read-once telemetry; they should be precise.**
4. **\`s.fund_balance() == 20_000 - 10_707\`** — the post-scan fund balance is computed from the inputs, not asserted as a literal. This makes the test self-documenting: the reader sees \`20_000 - 10_707\` and knows where each number came from. **Arithmetic expressions in assertions make the test self-explain better than hardcoded literals.**

#### Test 3: Underwater, fund partially drained

\`\`\`rust
    // ─── single Underwater: fund partially drained, deficit escalates ─

    #[test]
    fn scan_underwater_partial_drain_surfaces_unfilled() {
        // Same underwater account, but fund only has $5k — can't cover.
        let accts = vec![snapshot(1, 1, 100_000, 10_000)];
        let fund = InsuranceFund::new(5_000);
        let mut s = LiquidationScanner::new(default_params(), fund);
        let report = s.scan(&accts, MarkPrice(80_500));

        assert_eq!(report.fund_withdrawals, 5_000); // drained to 0
        assert_eq!(report.unfilled_deficit, 10_707 - 5_000);
        assert_eq!(s.fund_balance(), 0);
    }
\`\`\`

Three things to notice:

1. **The test reuses the same snapshot as Test 2.** Only the fund balance changes — $20k vs $5k. The reader can read Test 2 and Test 3 back-to-back and see *exactly* what difference the fund size makes. **Reusing the same input across tests isolates the input-axis that matters.**
2. **Fewer assertions than Test 2.** Only the 3 most-changed values are asserted (\`fund_withdrawals\`, \`unfilled_deficit\`, \`fund_balance\`). The classification, the per-record outcome, the account ID — already proven by Test 2 — are not re-asserted. **Tests that share setup with earlier tests assert only the differential.**
3. **\`unfilled_deficit == 10_707 - 5_000\`** — again an arithmetic expression. The reader sees \`shortfall − available = unfilled\` and instantly grasps the conservation law \`paid + unfilled = shortfall\`. **Algebraic expressions in assertions teach invariants alongside the assertion itself.**

#### Test 4: Underwater, fund already depleted

\`\`\`rust
    #[test]
    fn scan_underwater_depleted_fund_escalates_full_shortfall() {
        // Fund empty from the start.
        let accts = vec![snapshot(1, 1, 100_000, 10_000)];
        let mut s = LiquidationScanner::with_empty_fund(default_params());
        let report = s.scan(&accts, MarkPrice(80_500));

        assert_eq!(report.fund_withdrawals, 0);
        assert_eq!(report.unfilled_deficit, 10_707);
        assert_eq!(s.fund_balance(), 0);
    }
\`\`\`

Three things to notice:

1. **\`with_empty_fund\` instead of \`new(0)\`** — the named constructor at the call site says "empty fund" instead of "0 balance fund." Reading the test, the reader sees the intent immediately. **Named constructors at test call sites are documentation.**
2. **\`fund_withdrawals == 0\`** — *not* the full shortfall. The L8 \`Depleted\` variant returns \`(0, unfilled)\`, meaning the fund pays *zero* (because it had nothing) and escalates the *full* shortfall. The aggregate fields preserve this distinction. **\`Depleted\` and \`Covered { amount: 0 }\` are different outcomes; the aggregates must show different numbers.**
3. **The test is shorter than Test 2 and Test 3** — fewer assertions, simpler setup, cleaner narrative. The depleted state is the "edge of the cliff" of the cascade — the boundary where Stage 10d (ADL) would have to fire. **Edge-case tests should be terse; their *being there* is most of their value.**

#### Test 5: Mixed batch processes only unhealthy accounts

\`\`\`rust
    // ─── mixed batch ───────────────────────────────────────────────

    #[test]
    fn scan_mixed_batch_processes_only_unhealthy() {
        // 4 accounts, all 1 long @ entry $100, mark $80 (−20% adverse).
        // Vary collateral to span the 4 states:
        //   coll 50 → equity 30, ratio 30/80 = 37.5% → Safe
        //   coll 25 → equity 5,  ratio  5/80 = 6.25% → AtRisk
        //   coll 21 → equity 1,  ratio  1/80 = 1.25% → Liquidatable (solvent close)
        //   coll 10 → equity −10 → Underwater
        let accts = vec![
            snapshot(1, 1, 100, 50),
            snapshot(2, 1, 100, 25),
            snapshot(3, 1, 100, 21),
            snapshot(4, 1, 100, 10),
        ];
        let mut s = LiquidationScanner::new(default_params(), InsuranceFund::new(1_000));
        let report = s.scan(&accts, MarkPrice(80));

        assert_eq!(report.records.len(), 2);
        assert_eq!(report.records[0].account, AccountId(3));
        assert_eq!(report.records[1].account, AccountId(4));
        assert_eq!(report.records[0].classification, MarginHealth::Liquidatable);
        assert_eq!(report.records[1].classification, MarginHealth::Underwater);
    }
\`\`\`

Six things to notice:

1. **Four accounts in one slice — each calibrated to land in a different \`MarginHealth\` state.** Account 1 → Safe, 2 → AtRisk, 3 → Liquidatable, 4 → Underwater. The slice exercises *every* arm of L6's classification cascade in a single call. **Mixed-batch tests are the cheapest way to verify the classification cascade is complete.**
2. **\`report.records.len() == 2\`** — *not* 4. Safe and AtRisk produce no records; only Liquidatable and Underwater do. The test catches a future bug where someone misclassifies AtRisk as a liquidation trigger. **Length assertions on filtered outputs catch "wrong filter" bugs at the orchestration level.**
3. **\`report.records[0].account == AccountId(3)\` and \`[1].account == AccountId(4)\`** — the records preserve *input order*. Account 3 came before account 4 in the input slice; the records appear in the same order. This is the FIFO ordering policy from L11's module-level doc. **Ordered iteration → ordered records; the policy is enforced by the test.**
4. **The math comments are *per-account*, not per-test.** Each account gets its own classification math worked out inline. **For mixed-batch tests, math comments belong next to the accounts they describe.**
5. **\`InsuranceFund::new(1_000)\` — non-empty fund.** A fund of $1,000 covers any solvent fee and any small underwater shortfall in this batch. The fund-state mutations are validated but not the primary point of the test; the primary point is the *classification + filtering* behavior. **One test, one primary point; fund state is incidental here.**
6. **No assertion on \`fund_deposits\`/\`fund_withdrawals\`/\`unfilled_deficit\`.** Those are derivative of the per-account outcomes (which the records carry). Asserting them would duplicate test #1-#4's coverage; mixed-batch tests should focus on what's *new* — the orchestration of multiple accounts. **Assert the new behavior; don't re-assert what's already covered.**

#### Test 6: FIFO fairness on multi-underwater partial drain

\`\`\`rust
    // ─── FIFO fairness when fund partially drains ──────────────────

    #[test]
    fn scan_first_underwater_gets_paid_then_second_unfilled() {
        // Two underwater accounts, fund has enough for the first only.
        // Underwater shortfall per account: notional 80_500, fee 1_207,
        // equity -9_500 → shortfall 10_707.
        // Fund starts at 12_000: covers first (10_707), leaves 1_293;
        // second needs 10_707 → partial 1_293 + unfilled 9_414.
        let accts = vec![
            snapshot(1, 1, 100_000, 10_000),
            snapshot(2, 1, 100_000, 10_000),
        ];
        let mut s = LiquidationScanner::new(default_params(), InsuranceFund::new(12_000));
        let report = s.scan(&accts, MarkPrice(80_500));

        assert_eq!(report.records.len(), 2);
        assert_eq!(report.fund_withdrawals, 12_000); // 10_707 + 1_293
        assert_eq!(report.unfilled_deficit, 10_707 - 1_293);
        assert_eq!(s.fund_balance(), 0);
    }
\`\`\`

Five things to notice:

1. **Two *identical* underwater accounts.** Same entry, same collateral, same close mark. The only thing that differs is iteration position. By making them identical, the test isolates the *fairness policy* — FIFO — as the only thing that determines outcome differences. **Identical inputs across iterations isolate the policy variable.**
2. **The fund balance ($12,000) is *exactly* \`first shortfall + partial second payment\`** — $10,707 + $1,293 = $12,000. The reader sees the fund deplete *exactly* through the first underwater account, with the partial remainder going to the second. **Carefully-chosen fund balances make the fairness policy visible in the assertions.**
3. **\`fund_withdrawals == 12_000\`** — the *total* withdrawal, summed across both accounts. The aggregate field doesn't distinguish "first account got 10,707, second got 1,293"; it just shows the sum. **Aggregate fields summarize; per-record fields differentiate.**
4. **The comment includes the arithmetic explicitly**: \`10_707 + 1_293\`. A reader debugging a failure traces the unfilled-deficit number back to the FIFO rule via the comment. **Test comments that show the FIFO arithmetic are how the policy stays auditable.**
5. **The \`unfilled_deficit == 10_707 − 1_293\` assertion is the *only* signal Stage 10d would consume.** The next stage (ADL) would force-close enough profitable counter-positions to cover this \`9_414\` shortfall. L13's test fixes the contract that Stage 10d will read. **Per-stage handoff tests fix the contract the next stage will consume.**

### Step 2: Add the 4 invariant proptests

Append a \`proptest!\` block after the 6 unit tests. The block exercises 4 cross-cutting invariants over random \`(collaterals × mark × initial_fund)\` triples.

\`\`\`rust
    // ─── proptest: invariants ──────────────────────────────────────

    proptest! {
        /// The scanner's \`fund_balance\` after a scan equals the prior
        /// balance plus \`fund_deposits\` minus \`fund_withdrawals\`.
        #[test]
        fn fund_balance_delta_matches_report(
            collaterals in proptest::collection::vec(1_i64..1_000_000, 0..10),
            mark in 50_u64..150,
            initial_fund in 0_i64..10_000_000,
        ) {
            let accts: Vec<_> = collaterals
                .iter()
                .enumerate()
                .map(|(i, c)| snapshot(i as u64, 1, 100, *c))
                .collect();
            let mut s = LiquidationScanner::new(
                default_params(),
                InsuranceFund::new(initial_fund),
            );
            let before = s.fund_balance();
            let report = s.scan(&accts, MarkPrice(mark));
            let after = s.fund_balance();
            // before + deposits - withdrawals = after
            prop_assert_eq!(
                before.saturating_add(report.fund_deposits).saturating_sub(report.fund_withdrawals),
                after,
            );
        }

        /// \`unfilled_deficit > 0\` implies the fund was insufficient at
        /// some point during the scan, which implies \`fund_balance == 0\`
        /// at the end of the scan.
        #[test]
        fn unfilled_implies_empty_fund(
            collaterals in proptest::collection::vec(1_i64..1_000, 1..10),
            mark in 50_u64..70,    // adverse to long positions
            initial_fund in 0_i64..5_000,
        ) {
            let accts: Vec<_> = collaterals
                .iter()
                .enumerate()
                .map(|(i, c)| snapshot(i as u64, 1, 100, *c))
                .collect();
            let mut s = LiquidationScanner::new(
                default_params(),
                InsuranceFund::new(initial_fund),
            );
            let report = s.scan(&accts, MarkPrice(mark));
            if report.unfilled_deficit > 0 {
                prop_assert_eq!(s.fund_balance(), 0);
            }
        }

        /// Number of records ≤ number of input accounts. Safe and AtRisk
        /// accounts never produce records; the inequality is strict
        /// when at least one input is healthy.
        #[test]
        fn records_count_bounded_by_accounts(
            collaterals in proptest::collection::vec(1_i64..1_000_000, 0..20),
            mark in 50_u64..150,
        ) {
            let accts: Vec<_> = collaterals
                .iter()
                .enumerate()
                .map(|(i, c)| snapshot(i as u64, 1, 100, *c))
                .collect();
            let mut s = LiquidationScanner::with_empty_fund(default_params());
            let report = s.scan(&accts, MarkPrice(mark));
            prop_assert!(report.records.len() <= accts.len());
        }

        /// Determinism: scanning the same input twice produces the same
        /// report (fresh fund + fresh scanner each time).
        #[test]
        fn scan_is_deterministic(
            collaterals in proptest::collection::vec(1_i64..1_000_000, 0..10),
            mark in 50_u64..150,
            initial_fund in 0_i64..1_000_000,
        ) {
            let accts: Vec<_> = collaterals
                .iter()
                .enumerate()
                .map(|(i, c)| snapshot(i as u64, 1, 100, *c))
                .collect();

            let mut s1 = LiquidationScanner::new(
                default_params(),
                InsuranceFund::new(initial_fund),
            );
            let mut s2 = LiquidationScanner::new(
                default_params(),
                InsuranceFund::new(initial_fund),
            );
            let r1 = s1.scan(&accts, MarkPrice(mark));
            let r2 = s2.scan(&accts, MarkPrice(mark));
            prop_assert_eq!(r1, r2);
            prop_assert_eq!(s1.fund_balance(), s2.fund_balance());
        }
    }
\`\`\`

The 4 proptests together encode the *invariants of the orchestration layer*. Each one is a contract:

#### Proptest #1: \`fund_balance_delta_matches_report\`

**The conservation law for the fund.** \`before + ∑deposits − ∑withdrawals = after\`. The L8 invariant (\`balance ≥ 0\`) extends per-call; L13 extends it across an entire scan. Every deposit the report claims must show up in the fund balance; every withdrawal must too. **If this proptest passes, the report and the fund agree on what happened.**

Three things to notice:

1. **The math is \`saturating_add\` and \`saturating_sub\`** to match the scanner's own arithmetic. Without saturation, the proptest would have to either bound inputs more tightly or accept overflow as "the property doesn't hold." **The proptest's arithmetic must match the production code's arithmetic.**
2. **Input ranges (\`1..1_000_000\`)** are bounded well below \`i64::MAX\` so the property is *simply expressible* — no saturation actually fires in the operating range. The proptest still works against \`saturating_add\` because saturation in the bounded range is a no-op. **Bound proptest inputs so the property holds in the simplest form, not in the saturated form.**
3. **\`mark in 50..150\`** — a 50-150% range around the assumed entry price of $100, sweeping both Safe and Liquidatable / Underwater conditions. **Mark ranges should sweep across the boundary that classification cares about.**

#### Proptest #2: \`unfilled_implies_empty_fund\`

**The fund-exhaustion contract.** If the report shows \`unfilled_deficit > 0\`, the fund *must* be empty at the end. This catches the bug where the scanner reports "unfilled exists" but the fund still has money — a contradiction. The contract holds because L9's \`withdraw_shortfall\` drains the fund to 0 before reporting any unfilled deficit. **L9's per-call contract scales to a per-scan invariant.**

Three things to notice:

1. **The \`if report.unfilled_deficit > 0 { ... }\` filter inside the proptest body.** Only the cases where unfilled exists trigger the assertion; cases where the fund had enough to cover everything are valid "no assertion fires" cases. **Conditional assertions inside proptests are how you express "when X is true, Y must hold."**
2. **The input range is *adverse* — \`mark in 50..70\`.** Long positions at entry $100 face severe losses at mark $50-70, making underwater outcomes likely. This biases the test toward triggering the \`unfilled > 0\` branch. **Proptest inputs should be biased toward triggering the *interesting* condition; otherwise most cases skip the assertion silently.** This is the *proptest density problem*: with a wide range like \`mark in 50..150\`, the majority of randomly generated inputs would land Safe or Solvent, the conditional assertion would never fire, and across the proptest's default 100-250 iterations *the property could pass without ever being tested* — an invisible dead-code test. Bias inputs toward the regime where the assertion actually fires; otherwise your property test is exercising no property at all.
3. **\`initial_fund in 0..5_000\` — capped at the bottom range.** The fund is sized to be insufficient for the expected aggregate shortfall (which scales with the number of underwater accounts). **Sizing the fund below the expected shortfall maximizes the chance of an unfilled deficit.**
4. **In L13 we prefer Strategy-side pre-biasing over heavy \`prop_assume!\` rejection.** The goal of this property is high-density execution of the \`unfilled > 0\` branch, so pushing the generator directly into the adverse regime is more efficient. That keeps reject counts low and lowers \`TooManyAssumptions\` risk. **Use L5-style \`prop_assume!\` when you need to state a mathematical precondition; use L13-style Strategy shaping when you need branch-density.**

#### Proptest #3: \`records_count_bounded_by_accounts\`

**The cardinality bound.** The scanner can never produce more records than input accounts. Safe and AtRisk accounts contribute zero records; Liquidatable and Underwater each contribute exactly one. **The orchestration loop can't *create* records out of nothing or *amplify* them per account.**

Two things to notice:

1. **The assertion uses \`<=\`, not \`<\` strict.** When all accounts are unhealthy, records count *equals* accounts count. The bound is non-strict because zero-skipped-accounts is a valid case. **Cardinality bounds are usually \`<=\`; strict-\`<\` would falsely reject the all-unhealthy case.**
2. **The proptest covers up to 20 accounts per scan** (\`vec(..., 0..20)\`). Larger than the other proptests, because the cardinality bound is the easiest to violate at scale and the cheapest to test. **Use larger collections in proptests where the invariant scales linearly.**

#### Proptest #4: \`scan_is_deterministic\`

**The validator-consensus contract.** Two scanners with identical state and identical inputs must produce byte-identical outputs. If this proptest fails, the scanner has nondeterminism — and on a consensus chain, nondeterminism means a fork. **This proptest is the single most load-bearing test in the entire course.**

Four things to notice:

1. **The proptest constructs *two* scanners, not one, and scans the same input through both.** A single scanner that scans twice could mask nondeterminism if the second scan's state inherits something from the first. Two fresh scanners catch any state that survives an \`InsuranceFund::new(initial_fund)\` reset. **Determinism tests must use independent state at every run.**
2. **The assertion is on *both* \`report == report\` AND \`fund_balance == fund_balance\`.** A scanner that produces a deterministic report but a nondeterministic fund-balance change would pass a report-only test but be a real bug. The two-way assertion catches both. **Determinism tests assert on every observable side effect.**
3. **\`PartialEq\` on \`ScanReport\` is *what enables this test*.** L11's derive \`#[derive(Clone, Debug, PartialEq, Eq, Default)]\` is what lets \`prop_assert_eq!(r1, r2)\` compile. Without \`PartialEq\`, this proptest couldn't be written. **Standard-derive traits unlock standard-test patterns; derive them eagerly.**
4. **No \`Hash\` derive needed.** The determinism test compares by \`==\`, not by hashing. \`Hash\` would be redundant for this test (and most others). **Derive what tests actually need; resist the urge to derive \`Hash\` defensively.**

### Step 3: Run the tests

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

Expected output (abbreviated):

\`\`\`
running 69 tests
test compute::tests::close_flat_has_zero_qty ... ok
... (33 more compute tests)
test insurance::tests::balance_never_negative ... ok
... (20 more insurance tests)
test scanner::tests::fund_balance_delta_matches_report ... ok
test scanner::tests::records_count_bounded_by_accounts ... ok
test scanner::tests::scan_all_safe_accounts_does_nothing ... ok
test scanner::tests::scan_atrisk_does_not_liquidate ... ok
test scanner::tests::scan_empty_accounts_returns_empty_report ... ok
test scanner::tests::scan_first_underwater_gets_paid_then_second_unfilled ... ok
test scanner::tests::scan_is_deterministic ... ok
test scanner::tests::scan_liquidatable_solvent_deposits_fee ... ok
test scanner::tests::scan_mixed_batch_processes_only_unhealthy ... ok
test scanner::tests::scan_skips_flat_positions ... ok
test scanner::tests::scan_underwater_depleted_fund_escalates_full_shortfall ... ok
test scanner::tests::scan_underwater_fully_covered_drains_fund_partially ... ok
test scanner::tests::scan_underwater_partial_drain_surfaces_unfilled ... ok
test scanner::tests::unfilled_implies_empty_fund ... ok

test result: ok. 69 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

**69 tests passing. The Liquidation crate is byte-for-byte against \`0a8464e\`.** Stage 10c is complete; Stage 10 — the trilogy of margin math + insurance fund + scanner — is *closed*.

Common errors:

- **\`scan_is_deterministic\` flakes on some runs and passes on others** — your scanner has a hidden non-determinism. The most common cause: iterating a \`HashMap\` (whose iteration order varies). Stage 10c never uses \`HashMap\`; if you introduced one, switch to \`BTreeMap\` or \`Vec\`. **Hidden non-determinism is a chain-fork risk; the proptest catches it before mainnet.**
- **\`fund_balance_delta_matches_report\` fails with \`5000 vs 4999\`** — off-by-one in the \`saturating_add\` order. Re-check the production code: \`before + deposits − withdrawals\`, in that order. Reversing to \`before − withdrawals + deposits\` looks arithmetically identical but is actually different: the intermediate \`before − withdrawals\` can go negative in *some* invocations and, *in release builds without saturation*, silently *wraps* to a huge positive number — every validator producing a different \`i64\` than its peers, every chain forking. Saturating arithmetic in the L12 order is the cheap defense; the proptest is what catches the order if you reverse it.
- **\`unfilled_implies_empty_fund\` fails with \`unfilled=500, balance=1000\`** — your \`scan\` exits early when the fund depletes (skipping further underwater accounts). The L11 design contract says the scan continues; you should be aggregating across *every* underwater account in the slice. Re-read the L12 fan-out logic.
- **\`records_count_bounded_by_accounts\` fails with \`records=21, accounts=20\`** — somewhere your loop double-pushed. Most likely cause: you wrote \`report.records.push(...)\` *inside* the \`if\`/\`else\` branches AND once more outside. Re-check the loop body — the push should be exactly once at the bottom.

## Design reflection — the Stage 10 trilogy

Three load-bearing decisions that shaped Stage 10 across all 13 lessons:

1. **Layered conservation laws.** L9's \`amount + unfilled = shortfall\` (per call), L10's \`fee_to_fund + residual_to_account = post_close_equity\` (per close), L13's \`before + ∑deposits − ∑withdrawals = after\` (per scan). Each layer's law is consumed by the next layer's invariant. The crate's math closes from the smallest unit (one \`withdraw_shortfall\` call) to the largest (one \`scan\` batch). **Layered conservation is how consensus state machines stay *provably* correct under composition.**

2. **\`debug_assert!\` pair + \`saturating_arithmetic\` everywhere.** Every function in the crate uses one or both. The L10 dispatch (\`solvent_close_outcome\` / \`underwater_close_outcome\`) is a debug-assert pair; the L8 deposit and L9 withdraw use saturating arithmetic. The L12 scan combines both — debug-asserts via the routing predicates, saturation via the report aggregation. **The dev-assertion + prod-saturation discipline scales from one function to one crate.**

3. **Vocabulary before mechanism, four times in a row.** L1-L3 declared \`LiquidationParams\`, \`MarginRatio\`, \`MarginHealth\`, \`AccountSnapshot\`, \`CloseOrderSpec\` before any \`margin_health\` was implemented. L8 declared \`InsuranceFund\`, \`WithdrawOutcome\` before \`withdraw_shortfall\`. L10 declared \`SolventClose\`, \`UnderwaterClose\` while implementing them. L11 declared \`CloseOutcomeKind\`, \`LiquidationRecord\`, \`ScanReport\`, \`LiquidationScanner\` before \`scan\`. **The pattern is consistent across the course because *vocabulary defines the contract; mechanism implements it*.**

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout 0a8464e
diff -u ~/code/my-openhl/crates/liquidation/src/scanner.rs ./crates/liquidation/src/scanner.rs
\`\`\`

After L13:
- **scanner.rs** matches Stage 10c's \`scanner.rs\` **byte-for-byte**. The full file — module-level doc + imports + 4 types + 5 accessors + \`scan\` method + 10 unit tests + 4 proptests — is in your workspace.
- **All other files** in \`crates/liquidation/src/\` have been byte-for-byte stable since L10.

**The Liquidation course is complete.** Module 0 (Orientation, L0) + Module 1 (Types, L1-L3) + Module 2 (Pure compute, L4-L7) + Module 3 (Insurance fund, L8-L10) + Module 4 (Scanner + capstone, L11-L13) = 13 lessons across 5 modules.

## Common questions

**Q1: Why does L13 add 6 unit tests and not 4 or 8?**

Because the test coverage matrix has 4 outcomes × 2 batch shapes, and the multi-account column collapses 3 of the 4 outcomes into the mixed-batch test. The remaining 4 single-account outcomes (Solvent, FullyCovered, PartialDrain, Depleted) need their own tests, and the multi-account column needs the mixed-batch test plus the FIFO-fairness test (because identical-account-iteration-order is the *only* thing that distinguishes the two underwater iterations). 4 + 1 (mixed) + 1 (FIFO) = 6. **Coverage math, not arbitrary count.**

**Q2: Why doesn't L13 add a "scanner runs after fund depletes mid-batch" test?**

Because that case is already covered by \`unfilled_implies_empty_fund\` proptest #2 (which triggers exactly when the fund depletes mid-scan) and by \`scan_first_underwater_gets_paid_then_second_unfilled\` unit test #6 (which constructs a deterministic version). Adding a dedicated "mid-batch depletion" test would duplicate either of those. **The 6 unit tests + 4 proptests already cover the case; redundant tests are noise.**

**Q3: Could the 4 proptests be reduced to 1 by combining them all into one mega-property?**

You *could* (\`fund_balance_delta_matches_report ∧ unfilled_implies_empty_fund ∧ records_count_bounded_by_accounts ∧ scan_is_deterministic\`), but each property is independently meaningful — proving them separately makes the test failure message tell you *which* invariant broke. A mega-property with \`prop_assert!(A && B && C && D)\` would only report "the mega-property failed" without saying which sub-property. **Property-level granularity gives diagnostic granularity at failure time.**

**Q4: Why does \`scan_is_deterministic\` only run two iterations, not many?**

Because two iterations is what catches the nondeterminism. If two runs differ, *any* number of runs would differ. Three runs would catch the same bug; four runs same. The "many runs" defense is for *flaky* tests where the bug occurs probabilistically (which scanner determinism shouldn't have — it's deterministic by construction). **Test the property at minimum-multiplicity; multiplicity beyond that is wasted iteration.**

**Q5: What's not tested by L13's tests + proptests?**

A few things — deliberately. **Out of scope:** (a) the precise byte-layout of \`ScanReport\` (it's only used in-process, never serialized to disk in Stage 10c); (b) thread-safety (\`LiquidationScanner\` isn't \`Send + Sync\`-tested because Stage 10c uses single-threaded execution by design); (c) panic-safety (the bridge handles panics at a higher level). **In scope:** every classification → routing → aggregation path that affects fund state. **L13's tests cover what consensus actually needs.**

**Q6: What does Stage 10d (ADL) consume from L13's scanner?**

Exactly \`ScanReport.unfilled_deficit\` — the i64 that means "this many quote units of shortfall the fund couldn't absorb." Stage 10d would (a) read this field after every block's scan, (b) if non-zero, walk the *profitable* counter-positions in deterministic order, (c) force-close enough of them to cover the deficit. The L13 proptest \`unfilled_implies_empty_fund\` *guarantees* that this field is the only place the bridge needs to look — there's no second escalation signal hiding elsewhere. **Stage 10d gets one number; it knows what to do with it.**

## Module 4 + Stage 10 retrospective

The 13 lessons of the Liquidation course, in one table:

| # | Module | Lessons | Stage | What was built |
|---|---|---|---|---|
| M0 | Orientation | L0 | — | Course overview, openhl context |
| M1 | Types | L1, L2, L3 | 10a | \`LiquidationParams\`, \`MarginRatio\`, \`MarginHealth\`, \`AccountSnapshot\`, \`CloseOrderSpec\` |
| M2 | Pure compute | L4, L5, L6, L7 | 10a | \`notional_value\`, \`unrealized_pnl\`, \`account_equity\`, \`margin_ratio\`, \`margin_health\`, \`close_order_spec\` |
| M3 | Insurance fund | L8, L9, L10 | 10b | \`InsuranceFund\` state machine, \`WithdrawOutcome\` 3-variant enum, \`liquidation_fee\`, \`solvent_close_outcome\`, \`underwater_close_outcome\`, \`SolventClose\`, \`UnderwaterClose\` |
| M4 | Scanner + capstone | **L11, L12, L13** | 10c | \`CloseOutcomeKind\`, \`LiquidationRecord\`, \`ScanReport\`, \`LiquidationScanner\`, \`scan\` method, 10 unit tests + 4 proptests |

**69 tests. 4 modules. 13 lessons. 3 openhl commit SHAs.** The Liquidation crate is now a complete, deterministic, defensively-coded multi-account orchestration layer that the openhl bridge can call once per block to drive the entire safety-net cascade up to (but not including) ADL.

The next course in the openhl curriculum — Stage 10d, ADL — will consume \`ScanReport.unfilled_deficit\` as its only input, walk profitable counter-positions, and force-close them to absorb whatever the fund couldn't. The contract L13's proptests fix is what Stage 10d will read.

## Next course — Stage 10d, ADL (separate course)

L13 is the *last* lesson in the Liquidation course. The cascade's Layer 3 — ADL (auto-deleveraging) — is its own dedicated future course. The handoff:

1. **The scanner produces \`unfilled_deficit > 0\`** when the fund couldn't absorb all underwater shortfalls (L13 proptest #2 guarantees this is the *only* signal).
2. **Stage 10d's ADL routine** would read this field after each block's scan.
3. **The ADL routine** walks all *profitable* counter-positions in deterministic order (likely \`(pnl_pct × leverage)\` descending, with \`account_id\` as tiebreaker), force-closes them in sequence, and credits the recovered margin back to the insolvent positions.
4. **The ADL outcome** is a separate \`AdlReport\` type, with its own conservation law and its own proptests.

Stage 10d is implemented in openhl at commit \`d66b44a\`; the rethlab ADL course will land when its lessons are drafted.
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
