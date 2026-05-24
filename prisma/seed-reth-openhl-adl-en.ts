// AUTO-GENERATED from drafts/openhl_adl_*_en.md by .github/scripts/build-openhl-adl-seed.ts
// Do not hand-edit. Re-run the build script when drafts change.

import { PrismaClient } from '@prisma/client';

export async function seedRethOpenHlAdlEN(prisma: PrismaClient) {
  const tags = ["reth","evm","liquidation","adl","perpetual","l1","openhl","expert"];

  await prisma.course.create({
    data: {
      slug: "building-openhl-adl-en",
      title: "Build OpenHL ADL — auto-deleveraging, Layer 3 of the safety-net cascade",
      description:
        "Build auto-deleveraging (ADL) — the cascade's last line of defense when the insurance fund couldn't absorb everything. Ranks profitable counter-positions by (pnl_pct × leverage) using Hyperliquid's convention, force-closes them via bookkeeping mutation rather than orderbook submission, and applies a haircut that absorbs the unfilled deficit. Includes the feedback-loop crash explanation (why ADL bypasses the orderbook entirely), the layered conservation law that closes the Stage 10 cascade math, and 4 invariant proptests proving determinism. 5 lessons across 2 modules, byte-for-byte against openhl Stage 10d (d66b44a). Course 6 of the DIY Perp series.",
      difficulty: "EXPERT",
      duration: 50,
      xpReward: 110,
      track: "diy-perp",
      tags,
      isPublished: true,
      sortOrder: 1010,
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
                  title: "Build OpenHL ADL — auto-deleveraging, Layer 3 of the safety-net cascade",
                  slug: "openhl-adl-orientation-en",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 15,
                  xpReward: 50,
                  content: `# Build OpenHL ADL — auto-deleveraging, Layer 3 of the safety-net cascade

## What you'll build

The previous course (\`building-openhl-liquidation\`) shipped the multi-account scanner — the orchestration loop that batches every Liquidatable / Underwater account into one \`ScanReport\`. At the end of L13 we noted that \`ScanReport.unfilled_deficit > 0\` is *the* signal the insurance fund couldn't absorb everything, and that Stage 10d (this course) would consume it.

This course implements that consumer. By the end you'll have shipped:

- **1 new source file / ~530 LOC** in \`crates/liquidation/src/adl.rs\`.
- **21 tests passing** at SHA \`d66b44a\`: 12 unit tests covering score / no-candidate / single-winner / multi-winner / tiebreaker cases, plus 4 invariant proptests; total crate test count **69 → 90** after this course.
- **3 new types** (\`AdlScore\`, \`AdlRecord\`, \`AdlReport\`) and **2 new functions** (\`adl_score\`, \`execute_adl\`) — a clean, small module compared to the scanner.
- **A complete 4-layer safety cascade**: margin requirement (Layer 0) → force-close fee (Layer 1) → insurance fund (Layer 2) → **ADL (Layer 3)** → **socialized loss / protocol insolvency (Layer 4)**. Layer 4 is the regime that 0–3 are designed to make unreachable; if \`AdlReport.deficit_remaining > 0\` at the end of L4 of this course, the chain has formally entered Layer 4 — every depositor takes a haircut, or the protocol halts.

You'll understand:

- **Why ADL bypasses the orderbook entirely** — not as an optimization, but because submitting market orders against profitable positions while the mark is already cascading would create a feedback loop that crashes the chain. Bookkeeping-layer mutation is the only safe path.
- **The Hyperliquid score convention**: \`(pnl_pct × leverage)\` ranks the "luckiest" winners — those who both made the highest relative gain *and* took the most leveraged risk to get there. They take the haircut first.
- **How the haircut works**: each ADL'd winner had unrealized PnL of \`P\`; in a normal close they'd receive \`P\` in full; with ADL they receive \`P - haircut\`, where \`haircut = min(remaining_deficit, P)\`. The system absorbs the difference toward the unfilled deficit.
- **Deterministic ranking**: stable-sort by score descending, tiebreak by \`AccountId\` ascending — so two equally-lucky winners produce a byte-identical order across every validator.
- **The fourth-layer exit**: when the candidate pool exhausts before the deficit is absorbed, \`AdlReport.deficit_remaining > 0\` and the protocol has run out of mechanisms. That value going non-zero is the moment a chain admits it's insolvent.

## Why ADL bypasses the orderbook (the feedback-loop reason)

This is the most important conceptual leap in the course, and it's worth stopping on it before any code.

Stage 10c's scanner submits close orders to the **CLOB** (matching engine). A Liquidatable account's position gets unwound by a market order that consumes the existing bid/ask stack. That's fine when there are a few liquidations in a quiet market.

But consider the case ADL is designed for: **a violent move triggered enough underwater closes that the insurance fund drained**. Now imagine we kept the same mechanism for ADL — submit market orders against the profitable counter-positions through the matching engine.

The order book has finite depth. Every additional market sell punches through the bid stack and drops the mark further. The mark dropping further pushes *more* accounts underwater. Those new underwater accounts also need ADL. The matching engine sees more aggressive sells. Mark drops more. The cycle runs away.

This is **exactly** the failure mode that killed Mt. Gox in slow-motion, that almost killed Robinhood during GameStop, and that has caused every major perp DEX outage in the last 5 years. The fix is structural: **ADL must not touch the orderbook**.

Concretely, what we do instead:

- ADL ranks winners by score, in pure Rust, on every validator independently.
- The "force-close" is a bookkeeping mutation: credit the trader's collateral by \`pnl - haircut\`, set position size to zero, remove from the open-positions table.
- The matching engine never sees an ADL close. The bid/ask stack is untouched. The mark moves only if someone *else* trades.

The \`CloseOrderSpec\` we still emit in each \`AdlRecord\` is purely telemetry — kept for shape parity with Stage 10a's other close paths and for downstream auditing. **The bridge** (the openhl integration layer that calls \`LiquidationScanner::scan\` and now \`execute_adl\` once per block — same component you've been hearing about since L10 of the Liquidation course) **applies it as an account-state mutation, not as a CLOB submission.**

## The Stage 10c → 10d handoff in one diagram

\`\`\`
   ┌──────────────────────────────────────────────────────────────┐
   │  Stage 10c scanner (last block)                                │
   ├──────────────────────────────────────────────────────────────┤
   │  ScanReport {                                                  │
   │      records:          Vec<LiquidationRecord>,                 │
   │      fund_deposits:    i64,                                    │
   │      fund_withdrawals: i64,                                    │
   │      unfilled_deficit: i64,   ←─── if > 0, ADL fires           │
   │  }                                                             │
   └──────────────────────────────────────────────────────────────┘
                            │
                            ▼ if unfilled_deficit > 0
   ┌──────────────────────────────────────────────────────────────┐
   │  Stage 10d execute_adl                                         │
   ├──────────────────────────────────────────────────────────────┤
   │  Input:  candidates  &[AccountSnapshot]   ← all open positions │
   │          mark         MarkPrice                                │
   │          deficit      i64    (= unfilled_deficit from scanner) │
   │                                                                │
   │  Body:   1. Score each candidate (None if not a winner)        │
   │          2. Stable-sort by score desc, account_id asc          │
   │          3. Iterate descending; haircut each winner            │
   │             until deficit absorbed                             │
   │                                                                │
   │  Output: AdlReport {                                           │
   │              records:           Vec<AdlRecord>,                │
   │              deficit_absorbed:  i64,                           │
   │              deficit_remaining: i64,  ←─ chain insolvent if >0 │
   │          }                                                     │
   └──────────────────────────────────────────────────────────────┘
\`\`\`

The contract is **one i64 in, one i64 out**. The bridge wires:
- L13 proved \`unfilled_deficit > 0 ⇒ fund_balance == 0\` (proptest #2).
- L0 (this lesson) tells you that L13's contract is exactly what triggers \`execute_adl\`.

## The score: "luckiest winners take the haircut"

You'll implement this in L2. For now: the score is

$$\\text{pnl\\_pct\\_bps} = \\frac{\\text{pnl} \\times \\text{MARGIN\\_SCALE}}{\\text{collateral}}$$

$$\\text{leverage\\_bps} = \\frac{\\text{notional} \\times \\text{MARGIN\\_SCALE}}{\\text{equity}}$$

$$\\text{score} = \\frac{\\text{pnl\\_pct\\_bps} \\times \\text{leverage\\_bps}}{\\text{MARGIN\\_SCALE}}$$

(Reminder from Stage 10a: \`equity = collateral + unrealized_pnl\` at the current mark; \`notional = |position_size| × mark\`. So \`collateral\` is the deposited base, \`equity\` is what the position is worth right now, and \`notional\` is the gross exposure.)

Both factors are in bps (10000 = 100%). The product is renormalized once. A trader who is up 50% on a 10× position scores **higher** than one who is up 100% on a 1× position — Hyperliquid's choice, because high-leverage winners are seen as more "structurally" lucky (they took the most risk to win the most).

This is Hyperliquid's actual convention. Other venues use different scores (some use raw \`pnl_pct\`, some use absolute \`pnl\`); the choice matters for fairness but the *mechanism* is the same. We follow HL.

## The conservation law (the load-bearing invariant)

Same discipline as L9/L10/L13:

$$\\text{deficit\\_absorbed} + \\text{deficit\\_remaining} = \\text{input\\_deficit}$$

\`execute_adl\` either absorbs the full deficit (\`deficit_remaining = 0\`) or absorbs as much as it can and surfaces the remainder. **No deficit is created or destroyed by ADL itself.** The proptests in L4 lock this invariant in across every random \`(candidates, mark, deficit)\` triple.

This closes the cascade math — four layers, four conservation identities:

$$\\text{L9  (per fund call):} \\quad \\text{amount} + \\text{unfilled} = \\text{shortfall}$$

$$\\text{L10 (per position close):} \\quad \\text{fee\\_to\\_fund} + \\text{residual\\_to\\_account} = \\text{post\\_close\\_equity}$$

$$\\text{L13 (per scan batch):} \\quad \\text{balance\\_before} + \\sum \\text{deposits} - \\sum \\text{withdrawals} = \\text{balance\\_after}$$

$$\\text{L4  (per ADL pass):} \\quad \\text{deficit\\_absorbed} + \\text{deficit\\_remaining} = \\text{input\\_deficit}$$

Four layers, four identities. After this course, the openhl-liquidation crate's math is **closed under every operation**.

## The 5 lessons

### Module 0 — Orientation
- **L0** (this lesson) — Why ADL, why bypass orderbook, Stage 10c → 10d handoff, score preview, conservation law preview.

### Module 1 — ADL implementation
- **L1** — \`AdlScore\` newtype + \`AdlRecord\` + \`AdlReport\` types + the \`adl_score(snapshot, mark) -> Option<AdlScore>\` function. The pure-compute scoring with \`None\` for flat / losing / zero-collateral cases. 5 score tests.
- **L2** — \`execute_adl(candidates, mark, deficit) -> AdlReport\` — the orchestration: filter by \`Option<AdlScore>\`, stable-sort descending with \`AccountId\` tiebreaker, haircut loop. Phase-by-phase walkthrough of the 50-line body + 5 simple unit tests (zero / no-candidate / no-profitable / single-winner-full / single-winner-partial).
- **L3** — Nuanced absorption tests: multi-winner in score order, drain-first-then-partial, tiebreaker by AccountId ascending, "doesn't touch losers or flats" defense. 6 unit tests.
- **L4** — 4 invariant proptests + Stage 10 quartet retrospective. The conservation law from per-pass to per-block, the 4-layer cascade closed end-to-end.

## What's next after this course

The Stage 10 cascade is complete. The openhl roadmap continues:

- **Stage 11 — Oracle** (\`6495ffd\`, already shipped in openhl): the median-aggregating index-price feed with signed observation verify. Future rethlab course.
- **Stage 12 — Vault** (\`1e63e0b\`, already shipped): the share-based collateral pooling primitive. Future rethlab course.
- **Stages 13a-13k — bin/openhl** (multiple SHAs, already shipped): the actual runnable single-validator node. Future rethlab course.

After L4 of this course, you'll be one course ahead of the published curriculum and at the openhl Stage 10 endpoint. From there, openhl is your reference for the rest of the build.

## License / SHA discipline

L0–L4 cite Stage 10d at SHA \`d66b44a\`. The single-file diff lives at \`crates/liquidation/src/adl.rs\`. No other crate files change between Stage 10c (\`0a8464e\`) and Stage 10d — ADL is a pure additive module.
`,
                },
              ],
            },
          },
          {
            title: "ADL implementation",
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: "Lesson 1 — AdlScore, AdlRecord, AdlReport + adl_score — the ranking function",
                  slug: "openhl-adl-score-en",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 35,
                  xpReward: 60,
                  content: `# Lesson 1 — \`AdlScore\`, \`AdlRecord\`, \`AdlReport\` + \`adl_score\` — the ranking function

## Goal

Concepts you'll grasp in this lesson:

- **\`AdlScore\` is a newtype because the score's *meaning* is ordering, not arithmetic.** Wrapping \`i64\` in a tuple struct (\`pub struct AdlScore(pub i64)\`) lets us derive \`PartialOrd + Ord\` and treat scores as a totally-ordered type at the type level. The bare \`i64\` would let you accidentally *add* two scores, *multiply* scores, *use a score where a balance is expected* — none of which makes sense. **Newtypes encode the operations you want and forbid the ones you don't.**
- **\`Option<AdlScore>\` for the four "not a candidate" cases.** Flat positions, losing positions, zero-equity positions, and zero-collateral positions are all "ineligible." Rather than returning a sentinel score (\`AdlScore(0)\` or \`AdlScore(-1)\`) and forcing the caller to check, \`adl_score\` returns \`None\`. The L2 orchestration then writes \`candidates.iter().filter_map(...)\` and ineligibility is encoded as filter-out. **\`Option\` is how you say "this input didn't produce a value of this type" at the type level.**
- **The score is \`pnl_pct × leverage\`, normalized by \`MARGIN_SCALE\` to fit in i64.** Both factors are basis points (10000 = 100%). Their product is bps² and would overflow i64 in pathological inputs, so we (a) compute in i128, (b) saturate-multiply, (c) divide by \`MARGIN_SCALE\` to renormalize back to bps, (d) saturate the final i128 → i64 conversion. Same discipline as Stage 10a's \`notional_value\` / \`unrealized_pnl\` and Stage 10b's \`liquidation_fee\`.
- **The "higher leverage same pnl_pct → higher score" axiom is the test that locks Hyperliquid's convention.** L1's \`score_higher_for_higher_leverage_winner\` test constructs two winners with identical \`pnl_pct\` but different leverage and asserts score ordering. Any future refactor that flips the score formula to favor lower-leverage winners (some venues do this) would fail this single test. **One test fixes the convention; the rest of the cascade can rely on it.**

Verification:

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

…passes 74 tests (69 from the Liquidation course + 5 new ADL score tests). Test count climbs to 90 by L4 (5 + 6 + 5 unit tests across L1/L2/L3 + 4 proptests in L4).

Specific changes:

- **\`src/adl.rs\`** — new module file. Adds module-level doc, imports, \`AdlScore\` newtype, \`AdlRecord\` struct, \`AdlReport\` struct, \`adl_score()\` function, and a 5-test scaffolding (4 None-case tests + 1 ordering test).
- **\`src/lib.rs\`** — adds \`pub mod adl;\` and re-exports the four new public names (\`AdlScore\`, \`AdlRecord\`, \`AdlReport\`, \`adl_score\`).

L1 ships the type vocabulary + the pure scoring function. L2 implements the orchestration (\`execute_adl\`) that consumes both.

## Recap

After the previous course (L13 of \`building-openhl-liquidation\`):
- \`crates/liquidation/src/\` has 4 source files: \`compute.rs\`, \`insurance.rs\`, \`scanner.rs\`, \`types.rs\`, plus \`lib.rs\`.
- 69 tests passing (34 compute + 21 insurance + 14 scanner).
- The scanner produces \`ScanReport.unfilled_deficit: i64\` — the trigger for ADL.
- No file in \`crates/liquidation/src/\` has changed since \`0a8464e\`.

L1 starts the ADL module. The crate's diff against Stage 10d will be a single new file (\`adl.rs\`) plus the four-line \`lib.rs\` edit.

## Plan

Three edits:

1. **Create \`crates/liquidation/src/adl.rs\`** — new module file with the doc preamble (cite the module-level doc from L0's "why ADL bypasses orderbook"), imports, \`AdlScore\` newtype, \`AdlRecord\` struct, \`AdlReport\` struct, and \`adl_score\` function. No \`execute_adl\` yet (lands in L2).
2. **Add the 5 \`adl_score\` unit tests** in \`#[cfg(test)] mod tests { ... }\` at the bottom of \`adl.rs\`. Four None-case tests (flat / losing / zero collateral / short-at-entry) + one leverage-ordering test.
3. **Add \`pub mod adl;\`** and the re-exports to \`crates/liquidation/src/lib.rs\`.

> 🛑 **Predict.** Before reading further: rank these four traders by ADL score (highest = first to be haircut). All long 1 BTC, all profitable. Use Hyperliquid's \`pnl_pct × leverage\` convention.
> 
> - **A**: collateral $200, entry $100k, mark $200k (200% gain on $200 = 100% of equity; 1× leverage)
> - **B**: collateral $20, entry $100k, mark $200k (same notional but 10× leverage; 100% gain on collateral)
> - **C**: collateral $200, entry $100k, mark $150k (50% gain, 1× leverage)
> - **D**: collateral $200, entry $100k, mark $250k (75% gain on collateral, but 0.8× leverage post-PnL)

(Answer: **B → A → D → C.** B is the highest-leverage profitable winner (10× leverage * 500% pnl_pct). A has 50% pnl_pct × 1× leverage. D has 75% × ~0.8× = lower than A. C has 50% × ~0.6× leverage = lowest. The exact numbers depend on equity-vs-collateral framing; the key intuition is **leverage is a multiplier on PnL ranking**, which is why Hyperliquid uses the product convention.)

## The score formula in one diagram

\`\`\`
   ┌─────────────────────────────────────────────────────────────┐
   │  adl_score(snapshot, mark) → Option<AdlScore>                │
   ├─────────────────────────────────────────────────────────────┤
   │                                                             │
   │  Eligibility (returns None if ANY of these holds):           │
   │  ─────────────                                              │
   │    position_size == 0      ←─── flat                         │
   │    pnl ≤ 0                  ←─── losing or at entry           │
   │    collateral ≤ 0          ←─── degenerate (divide by zero)  │
   │    equity ≤ 0              ←─── degenerate (divide by zero)  │
   │                                                             │
   │  Computation (i128 intermediates, saturating, renormalize):  │
   │  ─────────────                                              │
   │    pnl_pct  = pnl × MARGIN_SCALE / collateral      (bps)     │
   │    leverage = notional × MARGIN_SCALE / equity      (bps)    │
   │    raw      = pnl_pct × leverage / MARGIN_SCALE     (bps×bps→bps²/10000) │
   │    score    = saturate_i128_to_i64(raw)                      │
   │                                                             │
   │  Returns: Some(AdlScore(score))                              │
   │                                                             │
   └─────────────────────────────────────────────────────────────┘
\`\`\`

Three things to notice:

1. **The four eligibility predicates are in early-return order, cheapest first.** \`position_size == 0\` is an instant rejection (one i64 compare). The PnL / collateral / equity checks each require a function call to compute, so they fire only after the cheapest predicate has passed. **Filter cascades evaluate cheapest test first; expensive tests come after.**
2. **\`pnl_pct\` and \`leverage\` are *both* in bps**, then multiplied (= bps²), then renormalized back to bps by dividing once. The renormalization is what keeps the final score in a range that fits cleanly in i64 for sane inputs. Without it, two 10000-bps factors would give \`10000 × 10000 = 100,000,000\` — fine for i64, but combined with leverage = 50_000 bps (5×) it would explode. **Bps × bps × renormalize is the consensus-arithmetic idiom for percent × percent.**
3. **The final \`saturate_i128_to_i64\` is for *pathological* inputs**, not normal ones. A 100× leveraged winner with 1000% pnl_pct produces \`1000_0000 × 100_0000 / 10000 = 1_000_000_000\` — that's \`10^9\` bps, well within i64. The saturation only fires when something is fundamentally wrong upstream. **Saturating conversion is the belt-and-suspenders for upstream bugs you didn't catch.**

## Walk-through

### Step 1: Create \`src/adl.rs\` — doc preamble + imports

Create \`crates/liquidation/src/adl.rs\`. The module doc preamble carries the most important conceptual content from L0 (the "why ADL bypasses orderbook" framing) — \`cargo doc\` readers see it first:

\`\`\`rust
//! Auto-deleveraging (ADL) — Layer 3 of the safety-net cascade (Stage 10d).
//!
//! When [\`crate::scanner::LiquidationScanner\`] finishes a scan with
//! \`ScanReport::unfilled_deficit > 0\`, the insurance fund couldn't
//! absorb everything. ADL is the last-resort mechanism: rank the
//! profitable counter-positions in the market by a "how much did they
//! win" score, force-close them in descending order, and haircut their
//! unrealized \`PnL\` until the deficit is absorbed.
//!
//! ### Why ADL bypasses the orderbook
//!
//! If we kept submitting market orders against profitable positions
//! through the matching engine, every order would punch through the
//! bid/ask stack and crash the mark further — which would push more
//! positions underwater. The feedback loop runs away. ADL is designed
//! to **close positions directly in the bookkeeping layer**, never
//! touching the orderbook. The records this module produces carry the
//! [\`CloseOrderSpec\`] for parity with Stage 10a's other paths, but the
//! bridge is expected to apply them as account-state mutations rather
//! than CLOB orders.
//!
//! ### How the haircut works
//!
//! Each ADL'd winner had unrealized \`PnL\` of \`P\` at the current mark.
//! In a normal close they'd receive \`P\` in full. With ADL they receive
//! \`P - haircut\`, where \`haircut = min(remaining_deficit, P)\`. The
//! system absorbs the \`haircut\` amount toward the unfilled deficit.
//! Winners with the highest score get the first cut; if the cumulative
//! haircuts reach the deficit before the candidate pool is exhausted,
//! later winners are untouched. If the candidate pool runs out first,
//! \`AdlReport::deficit_remaining > 0\` and the chain is in genuine
//! unresolved trouble.
//!
//! ### Score
//!
//! Following the Hyperliquid convention, score is
//! \`unrealized_pnl_pct × leverage\`, expressed in bps²/\`MARGIN_SCALE\`:
//!
//! \`\`\`text
//!   pnl_pct_bps  = pnl × MARGIN_SCALE / collateral
//!   leverage_bps = notional × MARGIN_SCALE / equity
//!   score        = pnl_pct_bps × leverage_bps / MARGIN_SCALE
//! \`\`\`
//!
//! The intuition: the "luckiest" winners are those who both made the
//! highest relative gain AND took the most leveraged risk to get
//! there. They take the haircut first. Stable-sort ties break by
//! \`AccountId\` ascending so two equally-lucky winners produce a
//! deterministic order across validators.
//!
//! ### Determinism
//!
//! - All arithmetic uses i128 intermediates with saturating-to-i64
//!   conversions.
//! - The ranking is a stable sort with a fully-defined tiebreaker.
//! - No clock reads, no \`HashMap\` iteration.
//!
//! Given the same \`(candidates, mark, deficit)\`, every validator
//! produces a byte-identical [\`AdlReport\`].

use crate::compute::{
    account_equity, close_order_spec, notional_value, saturate_i128_to_i64, unrealized_pnl,
};
use crate::types::{AccountSnapshot, CloseOrderSpec, MARGIN_SCALE};
use openhl_clob::AccountId;
use openhl_funding::MarkPrice;
\`\`\`

Five things to notice about this preamble:

1. **The first sentence names the *trigger* and the *response*.** "When \`ScanReport::unfilled_deficit > 0\`, the insurance fund couldn't absorb everything. ADL is the last-resort mechanism." A reader who reads only the first sentence knows where ADL sits in the cascade. **Module docs lead with cascade position, not implementation detail.**
2. **The \`Why ADL bypasses the orderbook\` section is *the* load-bearing concept** from L0, repeated in the module doc. Anyone who lands here without reading L0 needs the feedback-loop reason or they'll wonder why we're not just submitting market orders. **Module docs duplicate the conceptual essentials from course-level orientation; readers shouldn't need to chase context.**
3. **The score formula is in a \`text\` code block, not \`rust\`.** Because the formula isn't Rust — it's algebra. Naming it \`text\` signals the rendering style we want: monospace, no syntax highlighting, math notation. **Use \`text\` for math, \`rust\` for code; the distinction matters in \`cargo doc\` HTML.**
4. **The \`Determinism\` section names three negatives**: no float arithmetic, no \`HashMap\` iteration, no clock reads. **Documenting what a module *doesn't* do is how you signal what consensus determinism requires.** Future contributors who add a \`chrono::Utc::now()\` call somewhere will see this and reconsider.
5. **\`close_order_spec\` is imported** even though L1 doesn't use it (L2's \`execute_adl\` does). This is the same staging discipline as L11's \`account_equity\` import. **Import what the file's full set of code uses, not what the current lesson's code uses.** Unused-import warnings appear in L1 and disappear in L2.

### Step 2: Add \`AdlScore\`

Below the imports, add the score newtype:

\`\`\`rust
/// ADL ranking score. Higher means earlier force-close.
///
/// Computed as \`pnl_pct × leverage\`, both expressed in \`MARGIN_SCALE\`
/// units; the product is renormalized once. Saturates at \`i64::MAX\`
/// for pathological inputs.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct AdlScore(pub i64);
\`\`\`

Six things to notice:

1. **\`pub struct AdlScore(pub i64)\`** — tuple struct, public inner. The \`pub\` on the inner means callers can write \`AdlScore(42)\` and \`score.0\` directly. We *could* make the inner private and add \`pub fn new(v: i64) -> Self\` + \`pub fn value(&self) -> i64\`, but L1's primary user is the L2 \`execute_adl\` and the test module — both want direct access. **Public-inner tuple structs are right when consumers are in-crate and the type is purely a "label" wrapper.**
2. **Derives \`PartialOrd + Ord\`** — this is *why the newtype exists*. \`Ord\` on \`i64\` would let any caller order any i64 by any other i64; \`Ord\` on \`AdlScore\` only orders scores against scores. Stage 10c's \`LiquidationRecord\` was a struct of *unrelated* \`i64\`s — it never derived \`Ord\` because ordering records makes no semantic sense. Here, ordering scores *is* the operation we want. **Derive \`Ord\` precisely when comparison is the type's purpose, not just because it's i64-shaped.**
3. **Also derives \`Hash\`** — because \`BTreeMap<AdlScore, _>\` and \`HashMap<AdlScore, _>\` should both work if a future ADL extension needs them. \`Hash\` is cheap to derive and the cost is zero. **Defensively derive \`Hash\` for value types that consumers might use as keys.**
4. **\`Default\` is derived** — \`AdlScore::default()\` returns \`AdlScore(0)\`. This is meaningful: zero is the "nothing won, nothing lost" sentinel value. The L2 record initialization can rely on this default. **\`Default\` for newtypes follows the default of the wrapped type when zero is a meaningful sentinel.**
5. **No \`Add\` / \`Mul\` / \`Sub\` derives.** Scores aren't summable or differenceable — there's no domain meaning for "score A plus score B." The newtype *forbids* these by not implementing them. The bare \`i64\` would silently allow \`score_a + score_b\`; the newtype refuses to compile such an attempt. **Newtypes are subtractive: they take the operations off the table, not add new ones.**
6. **The doc comment names the saturation behavior**, even though the saturation is in \`adl_score\`'s body. Consumers of \`AdlScore\` will read the doc, not the function; documenting the *value range* at the type level prevents bugs. **Document a type's invariants on the type itself, not just on its constructor.**

### Step 3: Add \`AdlRecord\`

Below \`AdlScore\`:

\`\`\`rust
/// Per-account record of one ADL force-close.
///
/// The bridge applies these as bookkeeping mutations: credit the
/// trader's collateral by \`pnl_paid\`, set their position size to zero,
/// remove the account from the open-positions table. \`close_order\`
/// carries the spec for parity with Stage 10a's other paths and for
/// telemetry; the matching engine is **not** consulted.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct AdlRecord {
    pub account: AccountId,
    /// The (notional) close-order spec; emitted for telemetry and shape
    /// consistency with [\`crate::scanner::LiquidationRecord\`]. The
    /// bridge does NOT submit this to the CLOB.
    pub close_order: CloseOrderSpec,
    /// Unrealized \`PnL\` at the current mark — what the trader would
    /// have received in a normal close.
    pub pnl_gross: i64,
    /// Amount the system kept toward absorbing the deficit
    /// (\`min(remaining_deficit, pnl_gross)\` at the time this record
    /// was generated).
    pub haircut: i64,
    /// What the trader actually receives. Always \`pnl_gross - haircut\`,
    /// always \`≥ 0\`.
    pub pnl_paid: i64,
    /// The ranking score at the moment of selection.
    pub score: AdlScore,
}
\`\`\`

Five things to notice:

1. **Six fields, all \`pub\`** — same data-carrier pattern as \`LiquidationRecord\` from Stage 10c. The bridge reads every field directly; no accessors needed. **All-public record types are right when consumers are in-crate or downstream auditors; accessors add friction without protecting any invariant.**
2. **\`pnl_paid = pnl_gross - haircut\` is the conservation invariant for one record.** Three fields encode the same information twice (gross, haircut, paid); the redundancy is *deliberate* — readers don't have to do arithmetic to know what the trader got. **For audit-trail records, redundant fields are clearer than minimal fields.**
3. **\`close_order\` is present even though we don't submit it to the CLOB.** Carrying it makes the \`AdlRecord\` shape-compatible with \`LiquidationRecord\` — a future "all closes in one log" merge can union the two types without re-running the close_order_spec calculation. **Shape consistency across related records pays off in downstream merging code.**
4. **\`score: AdlScore\` (not \`i64\`).** The record carries the *score type*, not the raw number. Consumers of records compare scores against other scores; the newtype prevents comparing a score to a balance or to a deficit. **Records hold values in their domain type, not in primitive types.**
5. **No \`notional\` or \`mark\` field.** The record represents *the outcome of ADL on one account at one moment*; the bridge already knows the mark (it called \`execute_adl(_, mark, _)\`) and can compute notional from the snapshot if needed. **Don't duplicate caller-known context in records; store the result, not the inputs.**

### Step 4: Add \`AdlReport\`

Below \`AdlRecord\`:

\`\`\`rust
/// Summary of one ADL pass.
#[derive(Clone, Debug, PartialEq, Eq, Default)]
pub struct AdlReport {
    /// One record per ADL'd account, in execution (rank) order.
    pub records: Vec<AdlRecord>,
    /// Total haircuts applied — how much of the input deficit was
    /// absorbed.
    pub deficit_absorbed: i64,
    /// What the candidate pool couldn't cover. If \`> 0\`, the chain
    /// must halt or the operator must accept the residual as protocol
    /// loss.
    pub deficit_remaining: i64,
}
\`\`\`

Four things to notice:

1. **Three fields: vec + two i64 aggregates.** Same shape as \`ScanReport\` (vec + three i64 aggregates). The pattern is established: orchestration outputs carry both the audit trail and the aggregate. **Match the report shape of prior modules in the same crate; predictability is its own virtue.**
2. **\`Default\` derive is meaningful** — empty \`Vec<AdlRecord>\`, zero deficit_absorbed, zero deficit_remaining. The L2 orchestration's "zero deficit input" early-return uses \`AdlReport::default()\`. **Default-derived report types let happy-path early returns be one-liners.**
3. **The \`Clone + Debug + PartialEq + Eq + Default\` set, but NOT \`Copy\`.** Same reason as \`ScanReport\` — the \`Vec\` is heap-allocated. **Vec-containing reports are \`Clone\`; Vec-free reports are \`Copy\`.**
4. **\`deficit_remaining > 0\` is the chain-insolvent signal.** The doc says it. The L4 retrospective will name this as the "fourth layer" exit. **Document the operational meaning of edge values, not just their type.**

### Step 5: Add \`adl_score\`

Below \`AdlReport\`:

\`\`\`rust
/// Compute the ADL score for one account at \`mark\`.
///
/// Returns \`None\` for accounts that are not eligible for ADL:
///   - Non-profitable positions (\`unrealized_pnl ≤ 0\`).
///   - Flat positions (\`position_size == 0\`).
///   - Accounts whose collateral or equity is zero (degenerate;
///     score's divisor would be zero or negative).
#[must_use]
pub fn adl_score(snapshot: &AccountSnapshot, mark: MarkPrice) -> Option<AdlScore> {
    if snapshot.position_size.0 == 0 {
        return None;
    }
    let pnl = unrealized_pnl(snapshot, mark);
    if pnl <= 0 {
        return None;
    }
    let collateral = snapshot.collateral.0;
    if collateral <= 0 {
        return None;
    }
    let equity = account_equity(snapshot, mark);
    if equity <= 0 {
        return None;
    }
    let notional = notional_value(snapshot, mark);

    // pnl_pct_bps = pnl × MARGIN_SCALE / collateral
    let pnl_pct = i128::from(pnl).saturating_mul(i128::from(MARGIN_SCALE))
        / i128::from(collateral);
    // leverage_bps = notional × MARGIN_SCALE / equity
    let leverage = i128::from(notional).saturating_mul(i128::from(MARGIN_SCALE))
        / i128::from(equity);
    // score = pnl_pct × leverage / MARGIN_SCALE (renormalize)
    let raw = pnl_pct.saturating_mul(leverage) / i128::from(MARGIN_SCALE);
    Some(AdlScore(saturate_i128_to_i64(raw)))
}
\`\`\`

Eight things to notice:

1. **Four early-return guards, in cost-ascending order.** Flat check (one compare) → pnl (function call, one compare) → collateral (one read, one compare) → equity (function call, one compare). Cheapest predicate first; expensive predicates after. **The exit-fast-on-rejection pattern from L12's scanner reappears.**
2. **\`unrealized_pnl\` and \`account_equity\` are called *separately*, not collapsed into one snapshot-derive helper.** Each takes \`(snapshot, mark)\` and returns one \`i64\`. Calling them separately means the function reads top-to-bottom as algebra. **Linear function calls beat a one-shot bundle when the reader needs to follow the math.**
3. **\`pnl <= 0\` rejects both losing AND at-entry positions.** At entry, \`pnl == 0\` → not a winner → not an ADL candidate. The unified check covers both. **The "non-positive" predicate is the right boundary for "winner" semantics, not the "strictly negative" predicate.**
4. **\`collateral <= 0\` and \`equity <= 0\` are *defensive*** — they protect against divide-by-zero (and divide-by-negative, which would flip the score's sign nonsensically). Stage 10b's \`liquidation_fee\` doesn't have these guards because it doesn't divide by collateral or equity. **Divisions need pre-checks; multiplications don't.**
5. **All arithmetic uses i128 intermediates.** \`pnl × MARGIN_SCALE\` can overflow i64 for large pnl (since \`MARGIN_SCALE = 10000\`). The product becomes i128, the division by collateral keeps it in i128, the next multiplication keeps it in i128, the final renormalize keeps it in i128, only at \`saturate_i128_to_i64\` does it narrow. **i128 intermediates are the consensus-arithmetic idiom for any multiplication that might overflow.**
6. **\`saturating_mul\` on i128 products even though i128 has 128 bits.** Belt-and-suspenders: for inputs at the boundary of "sane" (e.g., 1000% pnl × 1000× leverage at $1B notional), the products approach i128's range. Saturating once at each multiplication step costs nothing. **Saturate every multiplication; the cost is zero and you eliminate one whole class of bugs.**
7. **Plain \`/\` division, not \`saturating_div\`.** Integer division of two positive i128 values cannot overflow (only \`i128::MIN / -1\` can overflow division, and our values are all positive). **Saturating operations are for arithmetic that *can* overflow; positive-positive division cannot.**
8. **The final \`saturate_i128_to_i64\` is the cast that *can* lose information.** If the raw i128 score is \`2^70\`, we lose bits when narrowing. The saturating conversion clamps to \`i64::MAX\` instead of wrapping. **Width-narrowing conversions need explicit saturation in consensus code.**

> 🛑 **Anti-fluency.** "Why doesn't \`adl_score\` take \`LiquidationParams\` like \`liquidation_fee\` does in Stage 10b?" Because ADL doesn't have a tunable knob. Stage 10b's \`liquidation_fee_bps\` is a network parameter that governance can change; the score formula is a fixed convention (Hyperliquid's). If a future protocol upgrade lets governance tune the score weights, the parameter goes in then. **Don't pre-add unused parameters; the type signature is the API surface, and adding a param is a breaking change.**

### Step 6: Add the 5 unit tests

Inside the existing \`#[cfg(test)] mod tests\` block (which you'll create at the bottom of \`adl.rs\` with the standard scaffolding), add:

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

    // ─── adl_score: None cases ─────────────────────────────────────

    #[test]
    fn score_none_for_flat_position() {
        let s = snapshot(1, 0, 100, 1_000);
        assert_eq!(adl_score(&s, MarkPrice(100)), None);
    }

    #[test]
    fn score_none_for_losing_long() {
        // Long 1 @ 100, mark 80 → pnl = -20 → not eligible
        let s = snapshot(1, 1, 100, 1_000);
        assert_eq!(adl_score(&s, MarkPrice(80)), None);
    }

    #[test]
    fn score_none_for_short_at_entry() {
        // pnl = 0, not profitable.
        let s = snapshot(1, -1, 100, 1_000);
        assert_eq!(adl_score(&s, MarkPrice(100)), None);
    }

    #[test]
    fn score_none_for_zero_collateral() {
        let s = snapshot(1, 1, 100, 0);
        // Even if profitable at mark 120, collateral = 0 makes pnl_pct
        // undefined (divide by zero) → ineligible.
        assert_eq!(adl_score(&s, MarkPrice(120)), None);
    }

    // ─── adl_score: ordering ───────────────────────────────────────

    #[test]
    fn score_higher_for_higher_leverage_winner() {
        // Two profitable longs with the same pnl_pct but different
        // leverage. Higher leverage → higher score.
        // Long 1 @ entry 100, mark 200 → pnl = 100.
        // A: collateral 100, equity = 100 + 100 = 200, notional = 200, leverage = 1×
        //    pnl_pct_bps = 100 × 10_000 / 100 = 10_000
        //    leverage_bps = 200 × 10_000 / 200 = 10_000
        //    score = 10_000 × 10_000 / 10_000 = 10_000
        // B: collateral 50, equity = 50 + 100 = 150, notional = 200, leverage = ~1.33×
        //    pnl_pct_bps = 100 × 10_000 / 50 = 20_000
        //    leverage_bps = 200 × 10_000 / 150 = 13_333
        //    score = 20_000 × 13_333 / 10_000 = 26_666
        let a = snapshot(1, 1, 100, 100);
        let b = snapshot(2, 1, 100, 50);
        let sa = adl_score(&a, MarkPrice(200)).unwrap();
        let sb = adl_score(&b, MarkPrice(200)).unwrap();
        assert!(sb > sa, "higher leverage winner should rank above lower");
    }
}
\`\`\`

Seven things to notice:

1. **Test module reuses the \`snapshot\` helper pattern** from L4/L8/L11 of the Liquidation course — same signature \`(account, size, entry, collateral)\`, same return type. A reader who learned \`snapshot\` once recognizes it across modules. **Test helpers should look the same across the crate.**
2. **Four None tests + one ordering test.** The None tests exercise each branch of the eligibility filter; the ordering test exercises the score's *only* meaningful property (relative magnitudes). Together they cover what \`adl_score\` promises. **For pure functions returning \`Option<T>\`, test each None branch + one happy-path property.**
3. **The ordering test uses \`assert!(sb > sa, "…")\` not \`assert_eq!\`.** Because the exact score values are fragile (sensitive to fixed-point rounding), but the relative ordering is the load-bearing property. **Property-style assertions (\`>\`, \`<\`, \`>=\`) beat value-style assertions (\`==\`) for tests whose intent is ordering rather than exact computation.**
4. **The ordering test's comment walks the math.** Reader sees \`pnl_pct_bps = 100 × 10_000 / 50 = 20_000\` and can re-derive. Same \`math-walk in comments\` discipline as L13's test comments. **Math comments inside tests turn tests into worked examples.**
5. **\`score_none_for_short_at_entry\` is the most subtle None case.** A short position at entry has \`pnl = 0\` (not negative — exactly at entry). The test confirms that the \`pnl <= 0\` predicate correctly catches zero, not just negatives. **Boundary tests on signed predicates catch the missing-equals bug.**
6. **\`score_none_for_zero_collateral\` is at mark 120 (profitable!).** The test's setup is *deliberately* misleading — the position is winning. But the divide-by-zero protection catches it. **Test the defensive guards on inputs that *would otherwise* succeed.**
7. **\`proptest::prelude::*;\` is imported, but no proptest in L1.** Staged for L4 (the proptest lesson). **Forward-staged imports keep L4 a purely additive lesson.**

### Step 7: Wire \`lib.rs\`

Open \`crates/liquidation/src/lib.rs\`. Three edits:

First, add \`pub mod adl;\` to the existing \`pub mod ...;\` block. Insert alphabetically:

\`\`\`rust
pub mod adl;
pub mod compute;
pub mod insurance;
pub mod scanner;
pub mod types;
\`\`\`

Second, add an \`adl\` re-export line alongside the existing module re-exports:

\`\`\`rust
pub use adl::{adl_score, AdlRecord, AdlReport, AdlScore};
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

Four new public names in one line: \`adl_score, AdlRecord, AdlReport, AdlScore\` — alphabetical inside the \`{ }\`.

Third, optionally update the \`lib.rs\` top-of-file roadmap comment if it tracks per-stage shipped state. The exact update depends on what your \`lib.rs\` preamble currently says; the answer key marks Stage 10d as in-progress for this commit and complete for the L4 capstone.

### Step 8: Run the tests

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

Expected output (abbreviated):

\`\`\`
running 74 tests
test adl::tests::score_higher_for_higher_leverage_winner ... ok
test adl::tests::score_none_for_flat_position ... ok
test adl::tests::score_none_for_losing_long ... ok
test adl::tests::score_none_for_short_at_entry ... ok
test adl::tests::score_none_for_zero_collateral ... ok
... (69 tests from the Liquidation course)

test result: ok. 74 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

**74 tests passing.** The ADL module exists with its type vocabulary and scoring function; L2 adds \`execute_adl\` (the orchestration verb) + 5 more unit tests, taking the count to 79.

Common errors:

- **\`cannot find function \\\`account_equity\\\` in this scope\`** — the \`use crate::compute::{ ... }\` import is missing one of the six names. Re-check the import block: \`account_equity, close_order_spec, notional_value, saturate_i128_to_i64, unrealized_pnl\`.
- **\`type \\\`Option<AdlScore>\\\` does not implement \\\`PartialEq\\\`**\` — the test failure says you forgot a derive. Add \`#[derive(PartialEq, Eq)]\` to \`AdlScore\`. The \`Option<T>: PartialEq\` blanket impl needs \`T: PartialEq\`.
- **\`score_higher_for_higher_leverage_winner\` fails with \`score_a >= score_b\`** — your \`adl_score\` is dividing in the wrong order. Re-read the formula: \`pnl_pct = pnl × MARGIN_SCALE / collateral\` (numerator first, then divide). If you wrote \`pnl × (MARGIN_SCALE / collateral)\`, integer truncation kills precision and the relative ordering flips for some inputs.
- **\`score_none_for_short_at_entry\` fails (returns \`Some(...)\` not \`None\`)** — your \`pnl <= 0\` is \`pnl < 0\` (strict). Zero is profitable in the strict version; the unified \`<= 0\` is what L1 specifies.

## Design reflection

Three load-bearing decisions in this lesson:

1. **\`AdlScore\` is a newtype expressly *to enable* ordering and *to forbid* arithmetic.** The bare \`i64\` would let you add two scores (no semantic meaning) or subtract them (also no meaning) or compare them to a balance (a real bug class). The newtype encodes the *exact* operations the domain supports — comparison, equality — and nothing else. **Newtypes are subtractive: they take operations off the table.**

2. **\`Option<AdlScore>\` for ineligibility, not a sentinel value.** Returning \`AdlScore(0)\` for "not eligible" would force every caller to check the value and decide whether 0 means "ineligible" or "eligible but unlucky." \`Option\` lets the L2 orchestration use \`filter_map\` and never see the ineligible cases at all. **\`Option<T>\` is the type-level encoding of "ineligibility"; sentinel values force every caller to re-implement the predicate.**

3. **All four eligibility predicates use \`<=\`, not \`<\`.** Zero is *not* a candidate state — flat positions, zero PnL, zero collateral, zero equity are all edge cases that should not produce a score. The unified \`<=\` boundary catches the zero case without an additional \`== 0\` check. **Boundary predicates on signed values usually want \`<=\` / \`>=\`; the strict-less-than form misses zero.**

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout d66b44a
diff -u ~/code/my-openhl/crates/liquidation/src/adl.rs ./crates/liquidation/src/adl.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
\`\`\`

After L1:
- **adl.rs** matches Stage 10d's \`adl.rs\` **through the \`score_higher_for_higher_leverage_winner\` test**. The \`execute_adl\` function and the remaining 16 tests + 4 proptests land in L2 / L3 / L4.
- **lib.rs** matches Stage 10d's \`lib.rs\` **byte-for-byte** for the \`pub mod adl;\` line and the \`pub use adl::{...}\` re-export.

## Common questions

**Q1: Why is \`AdlScore\` a tuple struct (\`AdlScore(i64)\`) and not a record struct (\`AdlScore { value: i64 }\`)?**

Tuple structs are the Rust idiom for *single-value wrappers* where the wrapping is the only purpose. Record structs are right when the type carries *named* state. \`AdlScore\` is a wrapper, not a state container; tuple is the right shape. **Single-field newtypes are tuple structs; multi-field types are record structs.**

**Q2: Why does \`AdlRecord\` store both \`pnl_gross\` and \`pnl_paid\` and \`haircut\`?**

Conservation: \`pnl_gross - haircut = pnl_paid\` holds for every record. Carrying all three lets the bridge log "paid out X, kept Y for the fund" without doing arithmetic. The redundancy is the readability win. **Audit-trail records carry redundant fields; minimal records make callers do math.**

**Q3: Why does \`adl_score\` not also reject accounts with \`pnl_gross < some_minimum\` (e.g., positions where the gain is so small that haircut isn't worth the operational cost)?**

Because the protocol doesn't have an "operational cost" — every ADL is a bookkeeping mutation, no orderbook touched, no fee charged. Skipping tiny gains would be a fairness choice (which haircut tiny winners vs huge winners), not a cost optimization. Hyperliquid doesn't do this; we follow the convention. **If you'd add a threshold for "operational cost," verify the cost exists first.**

**Q4: Could the score use \`unrealized_pnl × position_size\` instead of \`pnl_pct × leverage\`?**

Yes — that's the score Drift uses for its insurance fund draws (under a different name). It penalizes raw position size rather than leverage relative to collateral. Hyperliquid chose the leverage-based form because it's *position-size-independent* — a $1M position with 100% pnl_pct scores the same as a $100 position with 100% pnl_pct at the same leverage. The intuition: penalize *risk-taking lucky winners*, not just *big winners*. **Score conventions encode the protocol's fairness model.**

**Q5: Why does the \`Cargo.toml\` not appear in this lesson?**

Because no new dependencies are needed — \`adl.rs\` uses only \`crate::compute\`, \`crate::types\`, \`openhl_clob\`, and \`openhl_funding\`, all of which the liquidation crate already depends on. **A new module file requires \`Cargo.toml\` changes only when it introduces new external dependencies.**

**Q6: Could \`adl_score\` be parameterized by a \`score_fn: F\` closure so future protocols could swap conventions?**

You could, but the cost is real: every call site would need to pass the closure, and the L2 orchestration would carry a generic parameter through every signature. With one production score (\`pnl_pct × leverage\`), the concrete function is cleaner. If a future governance feature lets validators tune the score weights, the parameterization comes then — *and it would be a \`LiquidationParams\`-style struct, not a closure*. **Closures parameterize functions; structs parameterize protocols. Pick the one that matches what's actually configurable.**

## Next lesson (L2) — \`execute_adl\` — the orchestration heart

L2 implements \`execute_adl(candidates, mark, deficit) -> AdlReport\` — the function that takes the 5-test-validated \`adl_score\`, applies it to a slice of candidates, sorts the results, and runs the haircut loop until the deficit is absorbed or the candidates exhaust.

The phase structure (5 phases): early-return on non-positive deficit → score and filter → stable-sort with tiebreaker → iterate and haircut → build report. Plus 5 simple unit tests: zero deficit, negative deficit, no candidates, no profitable candidates, single winner full absorb.

After L2, the scanner is *runnable for ADL* — 79 tests pass (74 from L1 + 5 new in L2). L3 adds the 6 nuanced absorption tests, L4 adds the 4 invariant proptests and the Stage 10 quartet retrospective.
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
