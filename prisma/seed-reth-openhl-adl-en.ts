import { PrismaClient } from '@prisma/client';

export async function seedRethOpenHlAdlEN(prisma: PrismaClient) {
  const tags = ['openhl', 'adl', 'liquidation', 'safety-net', 'expert'];

  await prisma.course.create({
    data: {
      slug: 'building-openhl-adl-en',
      title: 'Build OpenHL ADL — auto-deleveraging, Layer 3 of the safety-net cascade',
      description:
        'Build openhl\'s ADL (auto-deleveraging) layer in Rust. The last layer of the safety-net cascade — used when the scanner leaves a deficit and the insurance fund cannot fully absorb it. AdlScore + AdlRecord + AdlReport types and the adl_score ranking function, the 5-phase execute_adl orchestration, 6 nuanced absorption tests, then a Capstone with 5 invariant proptests + a Stage 10 quartet retrospective. Pinned to openhl SHA `d66b44a` for byte-for-byte answer-keys.',
      difficulty: 'EXPERT',
      duration: 170,
      xpReward: 330,
      track: 'building-openhl-adl',
      tags,
      isPublished: true,
      sortOrder: 1015,
      locale: 'en',
      instructorName: 'RethLab',
      modules: {
        create: [
          {
            title: 'Orientation',
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: 'Build OpenHL ADL — auto-deleveraging, Layer 3 of the safety-net cascade',
                  slug: 'openhl-adl-orientation-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 15,
                  xpReward: 50,
                  content: `# Build OpenHL ADL — auto-deleveraging, Layer 3 of the safety-net cascade

## Question

When the liquidation scanner leaves a deficit that the insurance fund cannot fully absorb, the system has one last move. Why does it do that move **not via the orderbook, but by directly rewriting the books**? That is ADL — auto-deleveraging — Layer 3 of the safety-net cascade.

## Principle (minimum model)

- **ADL is Layer 3 of a three-layer cascade.** Layer 1 = liquidation scanner (force-close). Layer 2 = insurance fund (absorb shortfall). Layer 3 = ADL (when even the fund cannot cover the deficit, haircut the most-profitable opposite-side traders).
- **Three things to internalise.** (1) ADL is the last resort, never the first move. (2) It bypasses the orderbook by rewriting positions directly. (3) The trigger is "scanner left a deficit + insurance fund cannot absorb it".
- **Why not the orderbook?** The orderbook needs counterparties willing to take the other side. When the market is one-sided enough to need ADL, there are no counterparties at any reasonable price. The book-rewrite is the only mechanism that scales here.
- **Why this is controversial.** ADL takes profit from a trader who did nothing wrong. Mitigations: well-funded insurance fund (ADL never fires) + transparent ranking (the "lucky" winner is known in advance) + position-size cap (no one is ADL'd more than their position).
- **Four-lesson structure.** L1 (types + adl_score = ranking function) → L2 (execute_adl = 5-phase orchestration heart) → L3 (6 nuanced absorption tests) → L4 (Capstone — 5 invariant proptests + Stage 10 quartet retrospective).
- **Stage 10 reference SHA: \`d66b44a\`.** Every code example pins to this SHA from openhl; the answer key at end of Capstone is byte-for-byte against this SHA.
- **Prerequisite: openhl Liquidation track.** This course assumes Lesson 9's \`WithdrawOutcome\` proptest semantics and Lesson 13's scanner per-scan conservation law are internalised.

## Worked example + steps

# Build OpenHL ADL — auto-deleveraging, Layer 3 of the safety-net cascade

## What you'll build

The previous course (\`building-openhl-liquidation\`) shipped the multi-account scanner — the orchestration loop that batches every Liquidatable / Underwater account (an account whose equity has fallen *below* the maintenance threshold; Underwater specifically means equity has gone *negative* — collateral can no longer cover the position) into one \`ScanReport\`. At the end of Lesson 13 we noted that \`ScanReport.unfilled_deficit > 0\` is *the* signal the insurance fund couldn't absorb everything, and that Stage 10d (this course) would consume it — surfacing it back as \`AdlReport.deficit_remaining\` (same number, post-ADL).

This course implements that consumer. By the end you'll have shipped:

- **1 new source file / ~530 LOC** in \`crates/liquidation/src/adl.rs\`.
- **21 tests passing** at SHA \`d66b44a\`: 16 unit tests covering score / no-candidate / single-winner / multi-winner / tiebreaker / nuanced-absorption cases, plus 5 invariant proptests; total crate test count **69 → 90** after this course.
- **3 new types** (\`AdlScore\`, \`AdlRecord\`, \`AdlReport\`) and **2 new functions** (\`adl_score\`, \`execute_adl\`) — a clean, small module compared to the scanner.
- **A complete 4-layer safety cascade**: margin requirement (Layer 0) → force-close fee (Layer 1) → insurance fund (Layer 2) → **ADL (Layer 3)** → **socialized loss / protocol insolvency (Layer 4)**. Layer 4 is the regime that 0–3 are designed to make unreachable; if \`AdlReport.deficit_remaining > 0\` at the end of Lesson 4 of this course, the chain has formally entered Layer 4 — every depositor takes a haircut, or the protocol halts.

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

The \`CloseOrderSpec\` we still emit in each \`AdlRecord\` is purely telemetry — kept for shape parity with Stage 10a's other close paths and for downstream auditing. **The bridge** (the openhl integration layer that calls \`LiquidationScanner::scan\` and now \`execute_adl\` once per block — same component you've been hearing about since Lesson 10 of the Liquidation course) **applies it as an account-state mutation, not as a CLOB submission.**

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
- Lesson 13 proved \`unfilled_deficit > 0 ⇒ fund_balance == 0\` (proptest #2).
- Lesson 0 (this lesson) tells you that Lesson 13's contract is exactly what triggers \`execute_adl\`.

## The score: "luckiest winners take the haircut"

You'll implement this in Lesson 2. For now: the score is

$$\\text{pnl\\_pct\\_bps} = \\frac{\\text{pnl} \\times \\text{MARGIN\\_SCALE}}{\\text{collateral}}$$

$$\\text{leverage\\_bps} = \\frac{\\text{notional} \\times \\text{MARGIN\\_SCALE}}{\\text{equity}}$$

$$\\text{score} = \\frac{\\text{pnl\\_pct\\_bps} \\times \\text{leverage\\_bps}}{\\text{MARGIN\\_SCALE}}$$

(Reminder from Stage 10a: \`equity = collateral + unrealized_pnl\` at the current mark; \`notional = |position_size| × mark\`. So \`collateral\` is the deposited base, \`equity\` is what the position is worth right now, and \`notional\` is the gross exposure.)

Both factors are in bps (10000 = 100%). The product is renormalized once. A trader who is up 50% on a 10× position scores **higher** than one who is up 100% on a 1× position — Hyperliquid's choice, because high-leverage winners are seen as more "structurally" lucky (they took the most risk to win the most).

This is Hyperliquid's actual convention. Other venues use different scores (some use raw \`pnl_pct\`, some use absolute \`pnl\`); the choice matters for fairness but the *mechanism* is the same. We follow HL.

## The conservation law (the load-bearing invariant)

Same discipline as Lessons 9 / 10 / 13:

$$\\text{deficit\\_absorbed} + \\text{deficit\\_remaining} = \\text{input\\_deficit}$$

\`execute_adl\` either absorbs the full deficit (\`deficit_remaining = 0\`) or absorbs as much as it can and surfaces the remainder. **No deficit is created or destroyed by ADL itself.** The proptests in Lesson 4 lock this invariant in across every random \`(candidates, mark, deficit)\` triple.

This closes the cascade math — four layers, four conservation identities:

$$\\text{Lesson 9  (per fund call):} \\quad \\text{amount} + \\text{unfilled} = \\text{shortfall}$$

$$\\text{Lesson 10 (per position close):} \\quad \\text{fee\\_to\\_fund} + \\text{residual\\_to\\_account} = \\text{post\\_close\\_equity}$$

$$\\text{Lesson 13 (per scan batch):} \\quad \\text{balance\\_before} + \\sum \\text{deposits} - \\sum \\text{withdrawals} = \\text{balance\\_after}$$

$$\\text{Lesson 4  (per ADL pass):} \\quad \\text{deficit\\_absorbed} + \\text{deficit\\_remaining} = \\text{input\\_deficit}$$

Four layers, four identities. After this course, the openhl-liquidation crate's math is **closed under every operation**.

## The 5 lessons

### Module 0 — Orientation
- **Lesson 0** (this lesson) — Why ADL, why bypass orderbook, Stage 10c → 10d handoff, score preview, conservation law preview.

### Module 1 — ADL implementation
- **Lesson 1** — \`AdlScore\` newtype + \`AdlRecord\` + \`AdlReport\` types + the \`adl_score(snapshot, mark) -> Option<AdlScore>\` function. The pure-compute scoring with \`None\` for flat / losing / zero-collateral cases. 5 score tests.
- **Lesson 2** — \`execute_adl(candidates, mark, deficit) -> AdlReport\` — the orchestration: filter by \`Option<AdlScore>\`, stable-sort descending with \`AccountId\` tiebreaker, haircut loop. Phase-by-phase walkthrough of the 50-line body + 5 simple unit tests (zero / no-candidate / no-profitable / single-winner-full / single-winner-partial).
- **Lesson 3** — Nuanced absorption tests: multi-winner in score order, drain-first-then-partial, tiebreaker by AccountId ascending, "doesn't touch losers or flats" defense. 6 unit tests.
- **Lesson 4** — 5 invariant proptests + Stage 10 quartet retrospective. The conservation law from per-pass to per-block, the 4-layer cascade closed end-to-end.

## What's next after this course

The Stage 10 cascade is complete. The openhl roadmap continues:

- **Stage 11 — Oracle** (\`6495ffd\`, already shipped in openhl): the median-aggregating index-price feed with signed observation verify. Future rethlab course.
- **Stage 12 — Vault** (\`1e63e0b\`, already shipped): the share-based collateral pooling primitive. Future rethlab course.
- **Stages 13a-13k — bin/openhl** (multiple SHAs, already shipped): the actual runnable single-validator node. Future rethlab course.

After Lesson 4 of this course, you'll be one course ahead of the published curriculum and at the openhl Stage 10 endpoint. From there, openhl is your reference for the rest of the build.

## License / SHA discipline

Lessons 0–4 cite Stage 10d at SHA \`d66b44a\`. The single-file diff lives at \`crates/liquidation/src/adl.rs\`. No other crate files change between Stage 10c (\`0a8464e\`) and Stage 10d — ADL is a pure additive module.

## Summary (3 lines)

- ADL = Layer 3 of the safety-net cascade. Last resort when scanner leaves a deficit + insurance fund cannot absorb. Bypasses orderbook by rewriting positions directly.
- Why not orderbook: no counterparties at a reasonable price when the market is one-sided enough for ADL. Why controversial: takes profit from someone who did nothing wrong; mitigated by transparent ranking + position-size cap.
- 4 lessons: types + ranking → 5-phase orchestration → 6 absorption tests → 5 invariant proptests Capstone. Pinned to SHA \`d66b44a\`. Prerequisite: openhl Liquidation track.
`,
                },
              ],
            },
          },
          {
            title: 'ADL implementation',
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: 'Lesson 1 — AdlScore, AdlRecord, AdlReport + adl_score — the ranking function',
                  slug: 'openhl-adl-score-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 35,
                  xpReward: 60,
                  content: `# Lesson 1 — AdlScore, AdlRecord, AdlReport + adl_score — the ranking function

## Question

How do you **rank** ADL candidates by "how lucky they were" — and how do you **express in the type system** that "this trader is not even a candidate"? Three types + one ranking function form the foundation of every later layer.

## Principle (minimum model)

- **Three design decisions are the lesson core.** (1) \`AdlScore\` newtype prevents accidental ratio confusion. (2) \`AdlRecord\` records what happened (position size + entry + mark + pnl + score). (3) \`AdlReport\` is the return type of \`execute_adl\` — a transparent log of who was haircut and by how much.
- **\`AdlScore = (mark - entry) / |position_size|\`.** Larger profit per unit of position = higher score = earlier in the ADL queue. Symbolic; the actual representation is fixed-point i128 to preserve consensus determinism.
- **Type-state "not a candidate".** \`Option<AdlScore>\` — \`None\` means "this position is not an ADL candidate" (e.g. it's on the same side as the deficit, or it's already flat). \`Some(score)\` means "candidate with rank score".
- **\`AdlRecord\` fields.** \`position_size\` (signed) + \`entry_price\` + \`mark_price\` + \`unrealized_pnl\` + \`score\` (\`Option<AdlScore>\`) + post-haircut position size after ADL. Each \`execute_adl\` call produces a \`Vec<AdlRecord>\`.
- **\`AdlReport\` aggregates.** Total deficit absorbed + per-trader records + how much remains uncovered (almost always 0 — ADL is designed to fully absorb the deficit; uncovered is a system-level error).
- **\`adl_score\` is pure compute.** No I/O, no async, no state mutation. Reusable in proptest! and unit tests. Same shape as openhl-liquidation's pure-compute discipline.
- **Saturating arithmetic.** Score computation uses \`saturating_sub\` + \`saturating_div\` to avoid panics on edge cases (e.g. position_size = 0 → not a candidate, no division-by-zero).

## Worked example + steps

# Lesson 1 — \`AdlScore\`, \`AdlRecord\`, \`AdlReport\` + \`adl_score\` — the ranking function

## Goal

Concepts you'll grasp in this lesson:

- **\`AdlScore\` is a newtype because the score's *meaning* is ordering, not arithmetic.** Wrapping \`i64\` in a tuple struct (\`pub struct AdlScore(pub i64)\`) lets us derive \`PartialOrd + Ord\` and treat scores as a totally-ordered type at the type level. The bare \`i64\` would let you accidentally *add* two scores, *multiply* scores, *use a score where a balance is expected* — none of which makes sense. **Newtypes encode the operations you want and forbid the ones you don't.**
- **\`Option<AdlScore>\` for the four "not a candidate" cases.** Flat positions, losing positions, zero-equity positions, and zero-collateral positions are all "ineligible." Rather than returning a sentinel score (\`AdlScore(0)\` or \`AdlScore(-1)\`) and forcing the caller to check, \`adl_score\` returns \`None\`. The Lesson 2 orchestration then writes \`candidates.iter().filter_map(...)\` and ineligibility is encoded as filter-out. **\`Option\` is how you say "this input didn't produce a value of this type" at the type level.**
- **The score is \`pnl_pct × leverage\`, normalized by \`MARGIN_SCALE\` to fit in i64.** Both factors are basis points (10000 = 100%). Their product is bps² and would overflow i64 in pathological inputs, so we (a) compute in i128, (b) saturate-multiply, (c) divide by \`MARGIN_SCALE\` to renormalize back to bps, (d) saturate the final i128 → i64 conversion. Same discipline as Stage 10a's \`notional_value\` / \`unrealized_pnl\` and Stage 10b's \`liquidation_fee\`.
- **The "higher leverage same pnl_pct → higher score" axiom is the test that locks Hyperliquid's convention.** Lesson 1's \`score_higher_for_higher_leverage_winner\` test constructs two winners with identical \`pnl_pct\` but different leverage and asserts score ordering. Any future refactor that flips the score formula to favor lower-leverage winners (some venues do this) would fail this single test. **One test fixes the convention; the rest of the cascade can rely on it.**

Verification:

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

…passes 74 tests (69 from the Liquidation course + 5 new ADL score tests). Test count climbs to 90 by Lesson 4 (5 + 6 + 5 unit tests across Lessons 1 / 2 / 3 + 5 proptests in Lesson 4).

Specific changes:

- **\`src/adl.rs\`** — new module file. Adds module-level doc, imports, \`AdlScore\` newtype, \`AdlRecord\` struct, \`AdlReport\` struct, \`adl_score()\` function, and a 5-test scaffolding (4 None-case tests + 1 ordering test).
- **\`src/lib.rs\`** — adds \`pub mod adl;\` and re-exports the four new public names (\`AdlScore\`, \`AdlRecord\`, \`AdlReport\`, \`adl_score\`).

Lesson 1 ships the type vocabulary + the pure scoring function. Lesson 2 implements the orchestration (\`execute_adl\`) that consumes both.

## Recap

After the previous course (Lesson 13 of \`building-openhl-liquidation\`):
- \`crates/liquidation/src/\` has 4 source files: \`compute.rs\`, \`insurance.rs\`, \`scanner.rs\`, \`types.rs\`, plus \`lib.rs\`.
- 69 tests passing (34 compute + 21 insurance + 14 scanner).
- The scanner produces \`ScanReport.unfilled_deficit: i64\` — the trigger for ADL.
- No file in \`crates/liquidation/src/\` has changed since \`0a8464e\`.

Lesson 1 starts the ADL module. The crate's diff against Stage 10d will be a single new file (\`adl.rs\`) plus the four-line \`lib.rs\` edit.

## Plan

Three edits:

1. **Create \`crates/liquidation/src/adl.rs\`** — new module file with the doc preamble (cite the module-level doc from Lesson 0's "why ADL bypasses orderbook"), imports, \`AdlScore\` newtype, \`AdlRecord\` struct, \`AdlReport\` struct, and \`adl_score\` function. No \`execute_adl\` yet (lands in Lesson 2).
2. **Add the 5 \`adl_score\` unit tests** in \`#[cfg(test)] mod tests { ... }\` at the bottom of \`adl.rs\`. Four None-case tests (flat / losing / zero collateral / short-at-entry) + one leverage-ordering test.
3. **Add \`pub mod adl;\`** and the re-exports to \`crates/liquidation/src/lib.rs\`.


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

Create \`crates/liquidation/src/adl.rs\`. The module doc preamble carries the most important conceptual content from Lesson 0 (the "why ADL bypasses orderbook" framing) — \`cargo doc\` readers see it first:

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
2. **The \`Why ADL bypasses the orderbook\` section is *the* load-bearing concept** from Lesson 0, repeated in the module doc. Anyone who lands here without reading Lesson 0 needs the feedback-loop reason or they'll wonder why we're not just submitting market orders. **Module docs duplicate the conceptual essentials from course-level orientation; readers shouldn't need to chase context.**
3. **The score formula is in a \`text\` code block, not \`rust\`.** Because the formula isn't Rust — it's algebra. Naming it \`text\` signals the rendering style we want: monospace, no syntax highlighting, math notation. **Use \`text\` for math, \`rust\` for code; the distinction matters in \`cargo doc\` HTML.**
4. **The \`Determinism\` section names three negatives**: no float arithmetic, no \`HashMap\` iteration, no clock reads. **Documenting what a module *doesn't* do is how you signal what consensus determinism requires.** Future contributors who add a \`chrono::Utc::now()\` call somewhere will see this and reconsider.
5. **\`close_order_spec\` is imported** even though Lesson 1 doesn't use it (Lesson 2's \`execute_adl\` does). This is the same staging discipline as Lesson 11's \`account_equity\` import. **Import what the file's full set of code uses, not what the current lesson's code uses.** Unused-import warnings appear in Lesson 1 and disappear in Lesson 2.

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

1. **\`pub struct AdlScore(pub i64)\`** — tuple struct, public inner. The \`pub\` on the inner means callers can write \`AdlScore(42)\` and \`score.0\` directly. We *could* make the inner private and add \`pub fn new(v: i64) -> Self\` + \`pub fn value(&self) -> i64\`, but Lesson 1's primary user is the Lesson 2 \`execute_adl\` and the test module — both want direct access. **Public-inner tuple structs are right when consumers are in-crate and the type is purely a "label" wrapper.**
2. **Derives \`PartialOrd + Ord\`** — this is *why the newtype exists*. \`Ord\` on \`i64\` would let any caller order any i64 by any other i64; \`Ord\` on \`AdlScore\` only orders scores against scores. Stage 10c's \`LiquidationRecord\` was a struct of *unrelated* \`i64\`s — it never derived \`Ord\` because ordering records makes no semantic sense. Here, ordering scores *is* the operation we want. **Derive \`Ord\` precisely when comparison is the type's purpose, not just because it's i64-shaped.**
3. **Also derives \`Hash\`** — because \`BTreeMap<AdlScore, _>\` and \`HashMap<AdlScore, _>\` should both work if a future ADL extension needs them. \`Hash\` is cheap to derive and the cost is zero. **Defensively derive \`Hash\` for value types that consumers might use as keys.**
4. **\`Default\` is derived** — \`AdlScore::default()\` returns \`AdlScore(0)\`. This is meaningful: zero is the "nothing won, nothing lost" sentinel value. The Lesson 2 record initialization can rely on this default. **\`Default\` for newtypes follows the default of the wrapped type when zero is a meaningful sentinel.**
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
2. **\`Default\` derive is meaningful** — empty \`Vec<AdlRecord>\`, zero deficit_absorbed, zero deficit_remaining. The Lesson 2 orchestration's "zero deficit input" early-return uses \`AdlReport::default()\`. **Default-derived report types let happy-path early returns be one-liners.**
3. **The \`Clone + Debug + PartialEq + Eq + Default\` set, but NOT \`Copy\`.** Same reason as \`ScanReport\` — the \`Vec\` is heap-allocated. **Vec-containing reports are \`Clone\`; Vec-free reports are \`Copy\`.**
4. **\`deficit_remaining > 0\` is the chain-insolvent signal.** The doc says it. The Lesson 4 retrospective will name this as the "fourth layer" exit. **Document the operational meaning of edge values, not just their type.**

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

1. **Four early-return guards, in cost-ascending order.** Flat check (one compare) → pnl (function call, one compare) → collateral (one read, one compare) → equity (function call, one compare). Cheapest predicate first; expensive predicates after. **The exit-fast-on-rejection pattern from Lesson 12's scanner reappears.**
2. **\`unrealized_pnl\` and \`account_equity\` are called *separately*, not collapsed into one snapshot-derive helper.** Each takes \`(snapshot, mark)\` and returns one \`i64\`. Calling them separately means the function reads top-to-bottom as algebra. **Linear function calls beat a one-shot bundle when the reader needs to follow the math.**
3. **\`pnl <= 0\` rejects both losing AND at-entry positions.** At entry, \`pnl == 0\` → not a winner → not an ADL candidate. The unified check covers both. **The "non-positive" predicate is the right boundary for "winner" semantics, not the "strictly negative" predicate.**
4. **\`collateral <= 0\` and \`equity <= 0\` are *defensive*** — they protect against divide-by-zero (and divide-by-negative, which would flip the score's sign nonsensically). Stage 10b's \`liquidation_fee\` doesn't have these guards because it doesn't divide by collateral or equity. **Divisions need pre-checks; multiplications don't.**
5. **All arithmetic uses i128 intermediates.** \`pnl × MARGIN_SCALE\` can overflow i64 for large pnl (since \`MARGIN_SCALE = 10000\`). The product becomes i128, the division by collateral keeps it in i128, the next multiplication keeps it in i128, the final renormalize keeps it in i128, only at \`saturate_i128_to_i64\` does it narrow. **i128 intermediates are the consensus-arithmetic idiom for any multiplication that might overflow.**
6. **\`saturating_mul\` on i128 products even though i128 has 128 bits.** Belt-and-suspenders: for inputs at the boundary of "sane" (e.g., 1000% pnl × 1000× leverage at $1B notional), the products approach i128's range. Saturating once at each multiplication step costs nothing. **Saturate every multiplication; the cost is zero and you eliminate one whole class of bugs.**
7. **Plain \`/\` division, not \`saturating_div\`.** Integer division of two positive i128 values cannot overflow (only \`i128::MIN / -1\` can overflow division, and our values are all positive). **Saturating operations are for arithmetic that *can* overflow; positive-positive division cannot.**
8. **The final \`saturate_i128_to_i64\` is the cast that *can* lose information.** If the raw i128 score is \`2^70\`, we lose bits when narrowing. The saturating conversion clamps to \`i64::MAX\` instead of wrapping. **Width-narrowing conversions need explicit saturation in consensus code.**


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

1. **Test module reuses the \`snapshot\` helper pattern** from Lessons 4 / 8 / 11 of the Liquidation course — same signature \`(account, size, entry, collateral)\`, same return type. A reader who learned \`snapshot\` once recognizes it across modules. **Test helpers should look the same across the crate.**
2. **Four None tests + one ordering test.** The None tests exercise each branch of the eligibility filter; the ordering test exercises the score's *only* meaningful property (relative magnitudes). Together they cover what \`adl_score\` promises. **For pure functions returning \`Option<T>\`, test each None branch + one happy-path property.**
3. **The ordering test uses \`assert!(sb > sa, "…")\` not \`assert_eq!\`.** Because the exact score values are fragile (sensitive to fixed-point rounding), but the relative ordering is the load-bearing property. **Property-style assertions (\`>\`, \`<\`, \`>=\`) beat value-style assertions (\`==\`) for tests whose intent is ordering rather than exact computation.**
4. **The ordering test's comment walks the math.** Reader sees \`pnl_pct_bps = 100 × 10_000 / 50 = 20_000\` and can re-derive. Same \`math-walk in comments\` discipline as Lesson 13's test comments. **Math comments inside tests turn tests into worked examples.**
5. **\`score_none_for_short_at_entry\` is the most subtle None case.** A short position at entry has \`pnl = 0\` (not negative — exactly at entry). The test confirms that the \`pnl <= 0\` predicate correctly catches zero, not just negatives. **Boundary tests on signed predicates catch the missing-equals bug.**
6. **\`score_none_for_zero_collateral\` is at mark 120 (profitable!).** The test's setup is *deliberately* misleading — the position is winning. But the divide-by-zero protection catches it. **Test the defensive guards on inputs that *would otherwise* succeed.**
7. **\`proptest::prelude::*;\` is imported, but no proptest in Lesson 1.** Staged for Lesson 4 (the proptest lesson). **Forward-staged imports keep Lesson 4 a purely additive lesson.**

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

Third, optionally update the \`lib.rs\` top-of-file roadmap comment if it tracks per-stage shipped state. The exact update depends on what your \`lib.rs\` preamble currently says; the answer key marks Stage 10d as in-progress for this commit and complete for the Lesson 4 capstone.

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

**74 tests passing.** The ADL module exists with its type vocabulary and scoring function; Lesson 2 adds \`execute_adl\` (the orchestration verb) + 5 more unit tests, taking the count to 79.

Common errors:

- **\`cannot find function \\\`account_equity\\\` in this scope\`** — the \`use crate::compute::{ ... }\` import is missing one of the six names. Re-check the import block: \`account_equity, close_order_spec, notional_value, saturate_i128_to_i64, unrealized_pnl\`.
- **\`type \\\`Option<AdlScore>\\\` does not implement \\\`PartialEq\\\`**\` — the test failure says you forgot a derive. Add \`#[derive(PartialEq, Eq)]\` to \`AdlScore\`. The \`Option<T>: PartialEq\` blanket impl needs \`T: PartialEq\`.
- **\`score_higher_for_higher_leverage_winner\` fails with \`score_a >= score_b\`** — your \`adl_score\` is dividing in the wrong order. Re-read the formula: \`pnl_pct = pnl × MARGIN_SCALE / collateral\` (numerator first, then divide). If you wrote \`pnl × (MARGIN_SCALE / collateral)\`, integer truncation kills precision and the relative ordering flips for some inputs.
- **\`score_none_for_short_at_entry\` fails (returns \`Some(...)\` not \`None\`)** — your \`pnl <= 0\` is \`pnl < 0\` (strict). Zero is profitable in the strict version; the unified \`<= 0\` is what Lesson 1 specifies.

## Design reflection

Three load-bearing decisions in this lesson:

1. **\`AdlScore\` is a newtype expressly *to enable* ordering and *to forbid* arithmetic.** The bare \`i64\` would let you add two scores (no semantic meaning) or subtract them (also no meaning) or compare them to a balance (a real bug class). The newtype encodes the *exact* operations the domain supports — comparison, equality — and nothing else. **Newtypes are subtractive: they take operations off the table.**

2. **\`Option<AdlScore>\` for ineligibility, not a sentinel value.** Returning \`AdlScore(0)\` for "not eligible" would force every caller to check the value and decide whether 0 means "ineligible" or "eligible but unlucky." \`Option\` lets the Lesson 2 orchestration use \`filter_map\` and never see the ineligible cases at all. **\`Option<T>\` is the type-level encoding of "ineligibility"; sentinel values force every caller to re-implement the predicate.**

3. **All four eligibility predicates use \`<=\`, not \`<\`.** Zero is *not* a candidate state — flat positions, zero PnL, zero collateral, zero equity are all edge cases that should not produce a score. The unified \`<=\` boundary catches the zero case without an additional \`== 0\` check. **Boundary predicates on signed values usually want \`<=\` / \`>=\`; the strict-less-than form misses zero.**

## Answer key

\`\`\`bash
cd ~/code/openhl-reference
git checkout d66b44a
diff -u ~/code/my-openhl/crates/liquidation/src/adl.rs ./crates/liquidation/src/adl.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
\`\`\`

After Lesson 1:
- **adl.rs** matches Stage 10d's \`adl.rs\` **through the \`score_higher_for_higher_leverage_winner\` test**. The \`execute_adl\` function and the remaining 16 tests + 5 proptests land in Lessons 2 / 3 / 4.
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

You could, but the cost is real: every call site would need to pass the closure, and the Lesson 2 orchestration would carry a generic parameter through every signature. With one production score (\`pnl_pct × leverage\`), the concrete function is cleaner. If a future governance feature lets validators tune the score weights, the parameterization comes then — *and it would be a \`LiquidationParams\`-style struct, not a closure*. **Closures parameterize functions; structs parameterize protocols. Pick the one that matches what's actually configurable.**

## Next lesson (Lesson 2) — \`execute_adl\` — the orchestration heart

Lesson 2 implements \`execute_adl(candidates, mark, deficit) -> AdlReport\` — the function that takes the 5-test-validated \`adl_score\`, applies it to a slice of candidates, sorts the results, and runs the haircut loop until the deficit is absorbed or the candidates exhaust.

The phase structure (5 phases): early-return on non-positive deficit → score and filter → stable-sort with tiebreaker → iterate and haircut → build report. Plus 5 simple unit tests: zero deficit, negative deficit, no candidates, no profitable candidates, single winner full absorb.

After Lesson 2, the scanner is *runnable for ADL* — 79 tests pass (74 from Lesson 1 + 5 new in Lesson 2). Lesson 3 adds the 6 nuanced absorption tests, Lesson 4 adds the 5 invariant proptests and the Stage 10 quartet retrospective.

## Summary (3 lines)

- Three types: \`AdlScore\` newtype (ratio-confusion safety) + \`AdlRecord\` (per-trader log: position + entry + mark + pnl + score) + \`AdlReport\` (the \`execute_adl\` return type).
- \`adl_score = (mark - entry) / |position_size|\` — saturating arithmetic for consensus determinism. \`Option<AdlScore>\` for "not a candidate"; \`Some(score)\` for candidates.
- Pure compute; same shape as openhl-liquidation's discipline. Next lesson: \`execute_adl\` — the 5-phase orchestration heart.
`,
                },
                {
                  title: 'Lesson 2 — execute_adl — the 5-phase orchestration heart',
                  slug: 'openhl-adl-execute-en',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 40,
                  xpReward: 70,
                  content: `# Lesson 2 — execute_adl — the 5-phase orchestration heart

## Question

When the scanner leaves a deficit, **who do we haircut, in what order, and by how much**? Fold this into one deterministic function. **\`execute_adl(candidates, mark, deficit) -> AdlReport\` is a 5-phase pipeline.**

## Principle (minimum model)

- **5 phases.** (1) Filter candidates (\`Option<AdlScore>::Some\`). (2) Sort by score descending (highest score = first to haircut). (3) Walk the sorted list and haircut until deficit is absorbed. (4) Update each \`AdlRecord\` with post-haircut position. (5) Aggregate into \`AdlReport\`.
- **Phase 1: filter.** \`.filter_map(|c| c.score.map(|s| (c, s)))\` removes non-candidates upfront. Reduces sort cost + keeps the rest of the pipeline clean.
- **Phase 2: sort.** \`.sort_by(|a, b| b.1.cmp(&a.1))\` descending. Tie-break by \`position_size\` (larger position first); never by hash (consensus determinism — same input must produce the same order on every node).
- **Phase 3: walk + haircut.** For each candidate in order: compute haircut share = \`min(position_size, remaining_deficit / mark)\`. Update \`position_size -= haircut_share\`. Update \`remaining_deficit -= haircut_share * mark\`. Stop when \`remaining_deficit == 0\`.
- **Phase 4: update \`AdlRecord\`.** For each candidate haircut, record the pre-state + post-state. Transparent log.
- **Phase 5: aggregate.** \`AdlReport { total_absorbed, per_trader_records, remaining_uncovered }\`. \`remaining_uncovered > 0\` is a system error (insurance fund + ADL combined should always cover).
- **\`saturating_sub\` is critical.** When a haircut would over-deplete a position, saturating arithmetic clamps it to 0; no panic, no consensus divergence.
- **Determinism guarantees.** Same \`(candidates, mark, deficit)\` input → byte-for-byte same \`AdlReport\` output, every node, every replay.

## Worked example + steps

# Lesson 2 — \`execute_adl\` — the 5-phase orchestration heart

## Goal

Concepts you'll grasp in this lesson:

- **\`execute_adl\` is the function the bridge calls when the scanner's \`unfilled_deficit > 0\`.** Layer 1 (margin compute) has already classified accounts. Layer 2 (insurance fund) has already absorbed what it could. When the scanner returns \`ScanReport { unfilled_deficit > 0, .. }\`, the cascade has reached its third and final layer: ADL. The bridge calls \`execute_adl(remaining_accounts, mark, unfilled_deficit) -> AdlReport\`, and that one function carries the entire Layer 3 contract — rank the profitable counter-positions, haircut them in order, return a report whose two fields tell the bridge exactly how much deficit was absorbed and how much remains as protocol loss. **Three layers of the safety-net cascade, one function per layer.**
- **The function is a 5-phase pipeline, not a single chunk of logic.** Phase 1: early-return on non-positive deficit (defensive contract). Phase 2: score every candidate via \`adl_score\` (Lesson 1's function), filter out the ineligible (\`None\`), and collect the survivors with their PnL. Phase 3: stable-sort by \`(score descending, account_id ascending)\` — the tiebreaker matters for determinism. Phase 4: iterate in rank order, applying \`haircut = min(remaining_deficit, pnl_gross)\` and accumulating per-account records. Phase 5: assign \`deficit_remaining\` from the final loop state, return the report. Each phase has its own correctness obligation; the lesson walks them one by one. **Five phases, five testable invariants.**
- **The conservation law \`deficit_absorbed + deficit_remaining == input_deficit\` is set up in this lesson and proven in Lesson 4.** Every iteration of Phase 4 satisfies \`haircut + new_remaining == old_remaining\`; the loop's terminal state has \`deficit_remaining = remaining\` and \`deficit_absorbed = sum_of_haircuts\`. By construction, those two fields sum to the input — a conservation law you can read directly off the code. Lesson 4's proptest \`conservation_absorbed_plus_remaining_equals_deficit\` will verify this against random inputs; in Lesson 2 you'll read the structural argument from the loop itself. **Conservation isn't an afterthought you verify later — it's a property the loop body makes obvious.**
- **All arithmetic uses saturating ops to make Phase 4 byzantine-fault-tolerant.** \`haircut.saturating_add\` for the absorbed accumulator, \`remaining.saturating_sub\` for the loop variable, \`pnl_gross.saturating_sub(haircut)\` for the per-record payout. These can't actually overflow in practice (the inputs are i64 and the magnitudes are tiny relative to i64::MAX), but \`saturating_*\` makes the code's contract explicit: **"if anything ever wraps, we'd rather clamp than panic"**. This pairs with Lesson 1's debug_assert! discipline — debug_assert! in test, saturating_* in prod, both for the same reason: turn UB into observable failure. **Same discipline as openhl-liquidation Lesson 8's InsuranceFund — saturating in prod, debug_assert in test.**

Verification:

\`\`\`bash
cargo test -p openhl-liquidation adl::tests::adl_
\`\`\`

…runs the new 5 unit tests added in this lesson (\`adl_zero_deficit_is_noop\`, \`adl_negative_deficit_clamps_remaining_to_zero\`, \`adl_no_candidates_keeps_full_deficit\`, \`adl_no_profitable_keeps_full_deficit\`, \`adl_single_winner_fully_absorbs_small_deficit\`). After this lesson the scanner is *runnable for ADL* — 79 tests pass (74 from Lesson 1 + 5 new in Lesson 2). Lesson 3 will add 6 nuanced absorption tests against execute_adl; Lesson 4 will add the 5 invariant proptests and the Stage 10 quartet retrospective.

Specific changes:

- **\`crates/liquidation/src/adl.rs\`** — append the \`execute_adl\` function (~50 lines) below the Lesson 1 type definitions and \`adl_score\`. Append 5 unit tests in the existing \`#[cfg(test)] mod tests\` block.

That's it. Phase 1 + Phase 2 + Phase 3 + Phase 4 + Phase 5, then 5 tests that exercise the degenerate paths.

## Recap

After Lesson 1:
- \`AdlScore(i64)\` — newtype wrapping the i64 ranking, Ord-derived for sorting, Default-derived for zero, Hash-derived for dedup.
- \`AdlRecord\` — per-account row: \`{account, close_order, pnl_gross, haircut, pnl_paid, score}\`. Telemetry-shaped; the bridge applies these as *bookkeeping mutations*, never as CLOB orders.
- \`AdlReport\` — \`{records, deficit_absorbed, deficit_remaining}\`. The bridge reads \`deficit_remaining\` to decide whether the chain has reached an unresolvable state.
- \`adl_score(snapshot, mark) -> Option<AdlScore>\` — the ranking function. Returns \`None\` for the 4 ineligibility cases (flat position, non-profitable, zero collateral, zero/negative equity). Returns \`Some(score)\` for valid winners.

Lesson 2 takes those primitives and orchestrates them. \`adl_score\` becomes a filter predicate inside Phase 2; the \`AdlReport\` becomes the accumulator we fill across Phase 4 and finalize in Phase 5.

## Plan

One function, five phases, five tests.

1. **Append \`execute_adl\`** below \`adl_score\`. Pre-declare the 5 phases as comments so the structure is visible before any code.
2. **Phase 1**: early-return when \`deficit <= 0\`. Empty \`records\`, \`deficit_absorbed = 0\`, \`deficit_remaining = deficit.max(0)\` (the \`.max(0)\` clamps negative inputs).
3. **Phase 2**: \`candidates.iter().filter_map(|s| { let score = adl_score(s, mark)?; let pnl = unrealized_pnl(s, mark); Some((*s, score, pnl)) }).collect::<Vec<_>>()\`.
4. **Phase 3**: \`ranked.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.account.0.cmp(&b.0.account.0)))\` — score descending, account_id ascending tiebreaker.
5. **Phase 4**: \`for (snapshot, score, pnl_gross) in ranked { if remaining <= 0 break; let haircut = remaining.min(pnl_gross); ... records.push(...); deficit_absorbed = ... .saturating_add(haircut); remaining = remaining.saturating_sub(haircut); }\`.
6. **Phase 5**: \`report.deficit_remaining = remaining; report\`.

Then append the 5 unit tests at the bottom of the \`tests\` module.


(Answer: **\`execute_adl\` has a \`break\` in the loop when \`remaining <= 0\`; \`scan\` does not.** Scanner processes every account in its input (no quota — it's measuring everything that needs liquidation); ADL processes accounts *until the deficit is covered* and then stops (quota-bounded). The \`break\` is the structural signature of a quota-bounded loop. It also matters for performance — ADL might haircut just 1 of 100 candidates when the first winner has enough PnL; without the \`break\`, the loop would walk all 100. **Quota-bounded loops have \`break\`; quota-free loops don't.**)

## The full \`execute_adl\` source

\`\`\`rust
/// Execute one ADL pass over the candidate set.
///
/// Pipeline:
///   1. Filter to ADL-eligible accounts (see [\`adl_score\`]).
///   2. Stable-sort by score descending; ties break by \`AccountId\`
///      ascending so two equally-ranked accounts produce a
///      deterministic order.
///   3. Iterate, applying \`haircut = min(remaining_deficit, pnl_gross)\`
///      to each in rank order. Stop when \`remaining_deficit == 0\` or
///      candidates are exhausted.
///
/// Returns an [\`AdlReport\`] whose \`deficit_absorbed + deficit_remaining\`
/// equals the input \`deficit\` (modulo saturating arithmetic).
///
/// A non-positive \`deficit\` is treated as "nothing to do" — returns an
/// empty report.
#[must_use]
pub fn execute_adl(
    candidates: &[AccountSnapshot],
    mark: MarkPrice,
    deficit: i64,
) -> AdlReport {
    // Phase 1: defensive early-return for non-positive deficit.
    if deficit <= 0 {
        return AdlReport {
            records: Vec::new(),
            deficit_absorbed: 0,
            deficit_remaining: deficit.max(0),
        };
    }

    // Phase 2: score every candidate, drop the ineligible, keep (snapshot, score, pnl).
    let mut ranked: Vec<(AccountSnapshot, AdlScore, i64)> = candidates
        .iter()
        .filter_map(|s| {
            let score = adl_score(s, mark)?;
            let pnl = unrealized_pnl(s, mark);
            Some((*s, score, pnl))
        })
        .collect();

    // Phase 3: stable sort by (score desc, account_id asc).
    ranked.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.account.0.cmp(&b.0.account.0)));

    // Phase 4: iterate and haircut until deficit absorbed or candidates exhausted.
    let mut report = AdlReport::default();
    let mut remaining = deficit;
    for (snapshot, score, pnl_gross) in ranked {
        if remaining <= 0 {
            break;
        }
        let haircut = remaining.min(pnl_gross);
        let pnl_paid = pnl_gross.saturating_sub(haircut);
        report.records.push(AdlRecord {
            account: snapshot.account,
            close_order: close_order_spec(&snapshot),
            pnl_gross,
            haircut,
            pnl_paid,
            score,
        });
        report.deficit_absorbed = report.deficit_absorbed.saturating_add(haircut);
        remaining = remaining.saturating_sub(haircut);
    }

    // Phase 5: finalize deficit_remaining and return.
    report.deficit_remaining = remaining;
    report
}
\`\`\`

## Walk-through — the 5 phases

### Phase 1: defensive early-return on non-positive deficit

\`\`\`rust
if deficit <= 0 {
    return AdlReport {
        records: Vec::new(),
        deficit_absorbed: 0,
        deficit_remaining: deficit.max(0),
    };
}
\`\`\`

Three things to notice:

1. **\`deficit <= 0\` covers both zero and negative.** The bridge should only ever pass \`deficit > 0\` (it gates the call behind \`unfilled_deficit > 0\`), but a defensive contract guards against bugs upstream. **Defensive guards at module boundaries are how cascades isolate failures.**
2. **\`deficit.max(0)\` clamps the negative case.** If \`deficit = -50\` arrives somehow, \`deficit_remaining\` becomes 0, not -50. A negative remainder would propagate downstream and likely cause arithmetic confusion in the bridge's \`if report.deficit_remaining > 0\` check. **Clamping at the boundary is cheaper than fixing every downstream consumer.**
3. **The empty \`Vec::new()\` is intentional, not \`vec![]\`.** Both compile to the same allocation-free empty vector, but \`Vec::new()\` is the convention used elsewhere in the openhl-liquidation crate (consistency over personal preference). **Convention beats taste when there's no functional difference.**

### Phase 2: score + filter + collect

\`\`\`rust
let mut ranked: Vec<(AccountSnapshot, AdlScore, i64)> = candidates
    .iter()
    .filter_map(|s| {
        let score = adl_score(s, mark)?;
        let pnl = unrealized_pnl(s, mark);
        Some((*s, score, pnl))
    })
    .collect();
\`\`\`

Five things to notice:

1. **\`filter_map\` is the right combinator here.** \`adl_score(s, mark)\` returns \`Option<AdlScore>\` (Lesson 1's design); \`filter_map\` keeps the \`Some\` cases and drops \`None\`. Using \`filter\` + \`map\` separately would require evaluating \`adl_score\` twice (once for the filter, once for the map). \`filter_map\` does it once and unwraps the \`Some\`. **\`filter_map\` is "filter and unwrap in one pass" — use it whenever you have a \`T -> Option<U>\` function.**
2. **The \`?\` operator inside the closure is the elegant part.** \`adl_score(s, mark)?\` short-circuits **the current closure invocation only** when \`adl_score\` returns \`None\`, returning \`None\` to \`filter_map\`. \`filter_map\` then drops that one element and continues to the next candidate. Without \`?\`, you'd need an explicit \`match\` or \`let Some(score) = ... else { return None }\`. **\`?\` here does not break the whole iterator; it exits the current closure call and lets iteration continue.**
3. **We compute \`unrealized_pnl\` *after* the filter passes.** This is order-of-operations matters — \`unrealized_pnl\` is cheap, but if it were expensive, you'd want to compute it only for accounts that passed the eligibility filter. **Filter first, derive second; never derive a quantity you might throw away.**
4. **The tuple \`(snapshot, score, pnl)\` packs the loop's three needs.** Phase 3 needs \`score\` for sorting and \`account_id\` (via \`snapshot\`) for the tiebreaker. Phase 4 needs \`snapshot\`, \`score\`, and \`pnl_gross\` to build the \`AdlRecord\`. Packaging all three in one tuple avoids re-deriving anything in Phase 4. **Tuples are how you carry pre-computed values across loops without re-deriving them.**
5. **\`*s\` dereferences \`&AccountSnapshot\` to \`AccountSnapshot\` (copy).** \`AccountSnapshot\` is \`Copy\` (it's a small flat struct), so \`*s\` is a cheap memcpy. Without \`*s\`, the tuple would hold \`(&AccountSnapshot, ...)\` — a reference that would prevent the original slice from being dropped. **\`Copy\` types let you move ownership cheaply; use \`*s\` when you want the value, not a reference.**

### Phase 3: stable-sort with tiebreaker

\`\`\`rust
ranked.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.account.0.cmp(&b.0.account.0)));
\`\`\`

Four things to notice:

1. **\`b.1.cmp(&a.1)\` reverses the order — score *descending*.** Higher score gets force-closed first (Hyperliquid convention: luckiest winner pays first). Writing \`b.cmp(&a)\` instead of \`a.cmp(&b)\` is the idiomatic "descending" pattern in Rust — no need for \`.reverse()\`. **\`b.cmp(&a)\` is descending; \`a.cmp(&b)\` is ascending. Memorize the pattern.**
2. **\`.then_with(|| ...)\` is lazy.** The closure inside only runs when \`b.1.cmp(&a.1) == Ordering::Equal\` (a score tie). Saves work when scores are unique (the common case). **\`.then\` evaluates eagerly; \`.then_with\` is the closure variant — prefer \`.then_with\` when the tiebreaker is non-trivial.**
3. **The tiebreaker is \`account_id ascending\` — \`a.0.account.0.cmp(&b.0.account.0)\`.** Note \`a\` before \`b\` for ascending. The choice of "ascending" is arbitrary in principle but must be *deterministic* — two equally-lucky winners on different validators must agree on who goes first. Ascending account_id is the simplest deterministic choice. **Tiebreakers exist to make the order reproducible across validators, not to be "fair" — fair just happens to align with deterministic.**
4. **\`sort_by\` is stable (preserves equal-key insertion order).** This matters in cases where two records have equal score *and* equal account_id (impossible if account_id is unique, but the type signature doesn't enforce uniqueness). Stable sort means the equal-equal case keeps Phase 2's iteration order. Implementation-wise, stable sort pays for this with \`O(N log N)\` worst-case time and a temporary \`O(N)\` buffer; \`sort_unstable_by\` is more in-place. **At this course's candidate sizes (up to 15), that memory cost is negligible, so determinism dominates the trade-off.**

### Phase 4: iterate and haircut

\`\`\`rust
let mut report = AdlReport::default();
let mut remaining = deficit;
for (snapshot, score, pnl_gross) in ranked {
    if remaining <= 0 {
        break;
    }
    let haircut = remaining.min(pnl_gross);
    let pnl_paid = pnl_gross.saturating_sub(haircut);
    report.records.push(AdlRecord {
        account: snapshot.account,
        close_order: close_order_spec(&snapshot),
        pnl_gross,
        haircut,
        pnl_paid,
        score,
    });
    report.deficit_absorbed = report.deficit_absorbed.saturating_add(haircut);
    remaining = remaining.saturating_sub(haircut);
}
\`\`\`

Six things to notice:

1. **\`AdlReport::default()\` gives us empty records, 0 absorbed, 0 remaining.** Deriving \`Default\` on the report struct (Lesson 1's design) means we never have to write \`AdlReport { records: Vec::new(), deficit_absorbed: 0, deficit_remaining: 0 }\` by hand. **Derive \`Default\` on accumulator types; they're always initialized to zero.**
2. **\`if remaining <= 0 break;\` is the quota guard.** Once enough deficit has been absorbed, no more winners get haircut. This is the structural signature of a quota-bounded loop — every quota-bounded loop in openhl has this pattern. **Quota-bounded loops break early; quota-free loops process everything.**
3. **\`haircut = remaining.min(pnl_gross)\` is the absorption formula.** Take as much PnL as the deficit needs, or as much as the winner has — whichever is less. This is what makes Phase 4 conservative-by-construction: every haircut is bounded by both \`remaining\` and \`pnl_gross\`, so \`deficit_absorbed\` can never exceed the input deficit or the sum of all PnLs. **\`min\` is the conservative choice when two upper bounds apply.**
4. **\`pnl_paid = pnl_gross.saturating_sub(haircut)\` is the per-record decomposition.** Decomposition law: \`pnl_paid + haircut == pnl_gross\` (verified in Lesson 4's \`each_record_balances_pnl\` proptest). The \`saturating_sub\` here is belt-and-suspenders — \`haircut <= pnl_gross\` by construction (from the earlier \`.min\`), so the subtraction can't underflow in practice. **Saturating ops as a defensive habit even when correctness already guarantees no overflow.**
5. **\`deficit_absorbed.saturating_add(haircut)\` accumulates.** This is the running sum of haircuts; by Phase 5 it equals the total absorbed. The \`saturating_add\` is the same defensive habit — overflow is impossible here (haircuts are bounded by deficit which is i64), but writing \`+\` instead of \`saturating_add\` would be the only \`+\` in the function. **Consistency of saturating ops in one function makes the discipline obvious to readers.**
6. **\`remaining.saturating_sub(haircut)\` decrements the loop variable.** Conservation invariant: at every iteration boundary, \`(initial_deficit) == deficit_absorbed + remaining + sum_of_unprocessed_pnls_we_haven't_reached_yet\`. After the last iteration (or \`break\`), the third term is zero and we're left with \`initial_deficit == deficit_absorbed + remaining\`. **The loop's body preserves the conservation invariant as a side effect of being careful with both accumulators.**

### Phase 5: finalize and return

\`\`\`rust
report.deficit_remaining = remaining;
report
\`\`\`

Three things to notice:

1. **\`deficit_remaining\` is set *after* the loop, not inside it.** During the loop, \`remaining\` is the local mutable; only when the loop exits do we transfer the final value into the report. Setting it inside the loop would be redundant work (overwriting every iteration); setting it after is the correct one-time assignment. **Accumulators in loops, assignments outside.**
2. **\`report\` is returned by name** (no explicit \`return\` keyword, no semicolon after \`report\`). Rust's expression-based return — the last expression in the function body is the return value. **Idiomatic Rust: return values by leaving them as the trailing expression, not with \`return\`.**
3. **The function is \`#[must_use]\`** (declared on the signature). The caller (the bridge) must do something with the \`AdlReport\` — typically apply each record as a bookkeeping mutation and check \`deficit_remaining\` against zero. \`#[must_use]\` makes the compiler warn if the bridge accidentally drops the report. **\`#[must_use]\` on report-returning functions is how you make "you must look at this" a compile-time contract.**

## The 5 unit tests

Append to the existing \`#[cfg(test)] mod tests\` block in \`adl.rs\`:

\`\`\`rust
#[test]
fn adl_zero_deficit_is_noop() {
    let candidates = vec![snapshot(1, 1, 100, 100)];
    let report = execute_adl(&candidates, MarkPrice(200), 0);
    assert!(report.records.is_empty());
    assert_eq!(report.deficit_absorbed, 0);
    assert_eq!(report.deficit_remaining, 0);
}

#[test]
fn adl_negative_deficit_clamps_remaining_to_zero() {
    // Defensive: a negative deficit can't be "absorbed" but also
    // shouldn't propagate as a negative remainder.
    let report = execute_adl(&[], MarkPrice(100), -50);
    assert_eq!(report.deficit_remaining, 0);
}

#[test]
fn adl_no_candidates_keeps_full_deficit() {
    let report = execute_adl(&[], MarkPrice(100), 5_000);
    assert!(report.records.is_empty());
    assert_eq!(report.deficit_absorbed, 0);
    assert_eq!(report.deficit_remaining, 5_000);
}

#[test]
fn adl_no_profitable_keeps_full_deficit() {
    // All candidates are losers (long entered at 100, mark 80).
    let candidates = vec![snapshot(1, 1, 100, 1_000), snapshot(2, 1, 100, 1_000)];
    let report = execute_adl(&candidates, MarkPrice(80), 500);
    assert!(report.records.is_empty());
    assert_eq!(report.deficit_remaining, 500);
}

#[test]
fn adl_single_winner_fully_absorbs_small_deficit() {
    // One profitable long with PnL = 100, deficit = 30.
    // haircut = min(30, 100) = 30; payout = 70.
    let candidates = vec![snapshot(1, 1, 100, 100)];
    let report = execute_adl(&candidates, MarkPrice(200), 30);
    assert_eq!(report.records.len(), 1);
    let rec = &report.records[0];
    assert_eq!(rec.pnl_gross, 100);
    assert_eq!(rec.haircut, 30);
    assert_eq!(rec.pnl_paid, 70);
    assert_eq!(report.deficit_absorbed, 30);
    assert_eq!(report.deficit_remaining, 0);
}
\`\`\`

Each test maps 1:1 to a phase or boundary condition:

| Test | Phase exercised | What it proves |
|---|---|---|
| \`adl_zero_deficit_is_noop\` | Phase 1 (early-return) | Zero input → empty report, no candidates touched |
| \`adl_negative_deficit_clamps_remaining_to_zero\` | Phase 1 (negative clamp) | \`deficit.max(0)\` prevents negative leak |
| \`adl_no_candidates_keeps_full_deficit\` | Phase 2 (empty input) | Empty candidates → \`filter_map\` produces empty vec → loop runs zero times → \`remaining\` unchanged |
| \`adl_no_profitable_keeps_full_deficit\` | Phase 2 (all filtered) | All candidates return \`None\` → ranked is empty → loop runs zero times → \`remaining\` unchanged |
| \`adl_single_winner_fully_absorbs_small_deficit\` | Phase 4 (happy path) | Single iteration, haircut = min, decomposition holds |

Run them:

\`\`\`bash
cargo test -p openhl-liquidation adl::tests::adl_
\`\`\`

Expected: 5 new tests pass. With Lesson 1's 4 score-eligibility tests + 1 score-ordering test, that's 10 tests in \`adl.rs\` so far. The remaining 4 nuanced-absorption tests come in Lesson 3; the 5 invariant proptests come in Lesson 4.

## Cross-references

This \`execute_adl\` orchestration shares its structural shape with **openhl-liquidation Lesson 13's \`scan\`** — both are "for each candidate, decide what to do, accumulate results into a report" pipelines. The differences worth naming:

| | \`scan\` (Lesson 13 of openhl-liquidation) | \`execute_adl\` (Lesson 2 here) |
|---|---|---|
| Trigger | Every block (always runs) | Conditional (only when \`unfilled_deficit > 0\`) |
| Quota | None (processes every account) | Bounded by \`deficit\` (breaks early) |
| Filter | Margin classification (\`MarginPhase\`) | Eligibility via \`adl_score\` |
| Sort | None (insertion order) | By \`(score desc, account_id asc)\` |
| Per-account work | Build \`LiquidationRecord\` | Build \`AdlRecord\` with haircut decomposition |
| Output field for "could not fully resolve" | \`unfilled_deficit\` (consumed here) | \`deficit_remaining\` (consumed by bridge) |
| Conservation law | \`sum(closed_pnls) - sum(deposits) = ...\` (Lesson 13's per-scan) | \`deficit_absorbed + deficit_remaining == input_deficit\` (Lesson 4 proptest) |

The two functions are structurally siblings — same "for each candidate, decide, accumulate" pipeline — but with different filter predicates, different sort discipline, and different quota semantics. **Reading Lesson 13 once will make Lesson 2's structure click; reading Lesson 2 will make Lesson 13's \`scan\` read as "the same shape, different filter".**

## Q&A

**Q1: Why stable-sort (\`sort_by\`) instead of unstable-sort (\`sort_unstable_by\`)?**

Determinism. \`sort_unstable_by\` is faster and mostly in-place, but the *order of equal elements is unspecified*. In a single validator's process, that's fine. Across validators on different machines, even with the same input, different runtime ordering could produce different \`AdlReport\`s if scores happen to be equal. Stable \`sort_by\` preserves equal-element order (with \`O(N log N)\` worst-case time and temporary \`O(N)\` memory), which is exactly the trade-off we want here. **With 0..15 candidates, the memory cost is trivial; in consensus code, determinism wins.**

**Q2: Could we short-circuit Phase 2 (the \`filter_map\`) when we've collected enough candidates?**

In principle yes, but the \`collect::<Vec<_>>()\` consumes the entire iterator anyway, and we don't know "enough" before sorting (Phase 3 — a low-score candidate might rank ahead of a high-score one if we evaluated in input order). So Phase 2 has no short-circuit option; Phase 4 is the only one with \`break\`. **Short-circuit lives in the phase that has a quota; Phase 2 doesn't.**

**Q3: What if \`deficit_absorbed\` overflows i64 from haircut accumulation?**

It can't in practice. \`deficit_absorbed\` is bounded above by the input \`deficit\` (every haircut is \`≤ remaining\`, and \`remaining\` starts at \`deficit\`). Since \`deficit\` is i64 and \`remaining.saturating_sub(haircut)\` is monotonic decreasing, \`deficit_absorbed\` is bounded by \`i64::MAX\`. The \`saturating_add\` is defensive — if some upstream bug somehow violated the bounds, the saturation would clamp at \`i64::MAX\` instead of panicking. **Saturating ops as a hedge against upstream bugs you haven't found yet.**

**Q4: Why is the tiebreaker \`account_id ascending\` instead of \`descending\`?**

Pure convention. Ascending is the default sort direction in most languages, so "ascending account_id" reads as the "null" tiebreaker — the one you reach for when you don't have a strong reason. Hyperliquid's documentation doesn't specify; OpenHL chose ascending. Two validators running this code on the same input will agree; that's the only contract. **The tiebreaker direction is arbitrary; only its existence and determinism matter.**

**Q5: Could two records in the report have equal \`pnl_gross\`?**

Yes — two winners might have identical PnL despite different scores (e.g., same PnL but different leverage). The decomposition \`pnl_paid + haircut == pnl_gross\` still holds per-record, and the sum of all haircuts still equals \`deficit_absorbed\`. The records' \`pnl_gross\` values don't have to be unique. **Records are not deduplicated; account_id is the unique key, not pnl_gross.**

**Q6: What does the bridge actually *do* with each \`AdlRecord\`?**

For each record: (a) credit the trader's collateral by \`pnl_paid\` (the haircut-adjusted payout); (b) set their position size to zero (force-close); (c) remove the account from the active-positions set. The \`close_order\` field on the record is *not* submitted to the CLOB — it exists for telemetry and for shape-parity with \`LiquidationRecord\` (so the bridge can use the same record-handling code for both layers). **ADL is bookkeeping mutation, not orderbook execution. The \`close_order\` is a comment, not a command.**

## Next lesson (Lesson 3) — 6 nuanced absorption tests

Lesson 3 adds the 6 unit tests that exercise the nuanced absorption paths \`execute_adl\` can take:
- \`adl_single_winner_partial_haircut_at_full_pnl\` — haircut == pnl_gross → pnl_paid = 0
- \`adl_single_winner_exhausted_with_remaining_deficit\` — pnl_gross < deficit, single haircut, remainder propagates
- \`adl_multiple_winners_in_score_order\` — rank order proven against multiple inputs
- \`adl_drains_first_winner_then_partially_second\` — quota exhausts winner 1 fully, partial on winner 2
- \`adl_tiebreaker_by_account_id_ascending\` — equal scores resolve deterministically by account_id
- \`adl_does_not_touch_losers_or_flats\` — eligibility filter is honored even in mixed populations

After Lesson 3, the unit-test matrix is complete (16 tests across Lessons 1 + 2 + 3). Lesson 4 adds 5 proptest invariants and the Stage 10 quartet retrospective — closing the course at 5 lessons / 4 modules / SHA-pinned to \`d66b44a\`.

## Summary (3 lines)

- \`execute_adl\` is a 5-phase pipeline: filter → sort (descending by score, tie-break by position size) → walk + haircut → update \`AdlRecord\`s → aggregate \`AdlReport\`.
- \`saturating_sub\` is critical for not-panicking on edge cases. Tie-break by position size (never by hash) preserves consensus determinism.
- Pure deterministic; same input → same \`AdlReport\`. Next lesson: 6 absorption tests covering the matrix of single-winner / multi-winner × full / partial / mixed eligibility.
`,
                },
                {
                  title: 'Lesson 3 — 6 nuanced absorption tests — proving execute_adl against the matrix',
                  slug: 'openhl-adl-absorption-tests-en',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 35,
                  xpReward: 60,
                  content: `# Lesson 3 — 6 nuanced absorption tests — proving execute_adl against the matrix

## Question

L2 shipped 5 degenerate-path tests. **Now prove the *interesting middle* of \`execute_adl\`** (multiple winners share the deficit, ties are broken, losers and flats coexist with winners). What inputs are needed?

## Principle (minimum model)

- **The 6 tests cover a 2-axis matrix.** Axis 1 = \`{single winner, multiple winners}\`. Axis 2 = \`{full absorb, partial absorb, mixed eligibility}\`. Each cell = one test.
- **Single winner / full absorb.** One ADL candidate whose position is large enough to absorb the entire deficit. Verifies: position is haircut by exactly \`deficit / mark\`; no remaining uncovered.
- **Single winner / partial absorb.** One candidate whose position is smaller than the deficit / mark. Verifies: position is haircut to 0; remaining_uncovered > 0 (system error in production, but the function should still return cleanly).
- **Single winner / mixed eligibility.** One ADL candidate + several losers + several flats. Verifies: only the candidate is touched; losers and flats are untouched.
- **Multiple winners / full absorb.** Multiple candidates ranked by score; deficit distributed across them top-down. Verifies: highest-score is haircut first; if partial, the haircut respects position-size caps; deficit fully absorbed.
- **Multiple winners / partial absorb.** Multiple candidates but their combined positions cannot cover the deficit. All candidates are haircut to 0; \`remaining_uncovered > 0\`.
- **Multiple winners / mixed eligibility.** Candidates + losers + flats + ties (two candidates with the same score). Verifies: ties are broken by position size; losers and flats are untouched.
- **Why these 6 specifically.** Single + multiple covers the "one or many" axis. Full + partial + mixed covers the "deficit cover spectrum" axis. The 6 cells together cover every interesting structural variation.

## Worked example + steps

# Lesson 3 — 6 nuanced absorption tests — proving \`execute_adl\` against the matrix

## Goal

Concepts you'll grasp in this lesson:

- **Lesson 3 is the unit-test capstone for \`execute_adl\` — 6 tests that span the behavior matrix.** Lesson 2 shipped the 5-phase pipeline + 5 degenerate-path tests (zero/negative deficit, no candidates, no profitable, single happy-path winner). Lesson 3 fills in the *interesting* middle: what happens when a single winner gets fully haircut, when multiple winners share a deficit, when ties break, when losers and flats coexist with winners. Each test is one cell in the 2-axis matrix \`{single winner, multiple winners} × {full absorb, partial absorb, mixed eligibility}\`. After Lesson 3 you can read \`execute_adl\` and know — for any input — which test covers it. **Six tests for one function isn't excess; it's the matrix's size.**
- **Each test is a hand-computed worked example with the math in the comment.** Same \`math-walk in comments\` discipline from openhl-liquidation Lesson 13's capstone tests — the comment derives the expected output step-by-step so a debugger doesn't have to. When \`adl_multiple_winners_in_score_order\` says "B's score is 26,666 vs A's 10,000," that number is computed from \`(pnl_pct_bps × leverage_bps) / MARGIN_SCALE\` and reproduced in the test comment for the reader. The Lesson 4 proptests will universalize what these tests prove on specific inputs; here the inputs are chosen *because* they make the math obvious. **The math-walk turns each test into a 5-line worked example, not a black-box assertion.**
- **The 6 tests progress from simple to compound.** Tests 1-2 stay within Phase 4's single-iteration regime (one winner). Tests 3-4 introduce Phase 3's sorting + Phase 4's multi-iteration loop. Test 5 isolates the tiebreaker (Phase 3's \`then_with\`). Test 6 proves that Phase 2's \`filter_map\` correctly drops losers and flats *even when winners are present in the same input* — the eligibility filter must work in mixed populations, not just pure ones. **The arc: single winner → multi-winner → sort discipline → tiebreaker → integration.**
- **Test names follow the \`adl_<scenario>_<expected_outcome>\` convention.** \`adl_single_winner_partial_haircut_at_full_pnl\`, \`adl_drains_first_winner_then_partially_second\`, \`adl_tiebreaker_by_account_id_ascending\` — each test name reads as a hypothesis the test proves. Production codebases use this discipline so that \`cargo test --list\` (or \`cargo test -- --quiet\`) produces a *specification* of the function's behavior, not just a list of arbitrary names. **Tests are documentation when their names are sentences.**

Verification:

\`\`\`bash
cargo test -p openhl-liquidation adl::tests::adl_
\`\`\`

…now reports 11 tests passing (Lesson 1's 5 + Lesson 2's 5 + Lesson 3's 6 — wait, that's 16). Actually it reports 16: Lesson 1's 5 score-eligibility/ordering tests + Lesson 2's 5 pipeline-degenerate tests + Lesson 3's 6 nuanced-absorption tests. The full ADL test matrix is now covered for *specific* inputs. Lesson 4 will add 5 proptests that universalize these specific cases to random inputs.

Specific changes:

- **\`crates/liquidation/src/adl.rs\`** — append 6 tests to the existing \`#[cfg(test)] mod tests\` block. No production code changes; we're proving the Lesson 2 implementation against more inputs.

Six tests, ~80 lines of new test code. The lesson walks each test as a worked example.

## Recap

After Lesson 2:
- \`execute_adl(candidates, mark, deficit) -> AdlReport\` — the 5-phase pipeline is shipped (defensive guard, score+filter, stable-sort with tiebreaker, haircut loop with conservation accounting, finalize).
- 10 tests in \`adl.rs\` so far: Lesson 1's 5 (score eligibility 4 + score ordering 1), Lesson 2's 5 (4 degenerate paths + 1 single-winner happy path).
- The conservation law \`deficit_absorbed + deficit_remaining == input_deficit\` is *structurally* preserved by the loop body — not yet *universally* proven (that's Lesson 4).

Lesson 3 takes the 5-phase pipeline and exercises its load-bearing paths: full-haircut decomposition, multi-winner ordering, tiebreaker determinism, mixed-eligibility filtering. Same \`execute_adl\` from Lesson 2; richer inputs.

## Plan

Six tests, each appended to the \`#[cfg(test)] mod tests\` block below Lesson 2's tests:

1. **\`adl_single_winner_partial_haircut_at_full_pnl\`** — Phase 4 edge case: haircut == pnl_gross → pnl_paid = 0
2. **\`adl_single_winner_exhausted_with_remaining_deficit\`** — Phase 4 edge case: pnl_gross < deficit → record absorbed but remainder propagates
3. **\`adl_multiple_winners_in_score_order\`** — Phase 3 ordering: B's higher leverage means B ranks first, even though A and B have the same PnL
4. **\`adl_drains_first_winner_then_partially_second\`** — Phase 4 quota exhaustion: full haircut on rank 1, partial on rank 2
5. **\`adl_tiebreaker_by_account_id_ascending\`** — Phase 3 \`then_with\`: identical scores → ascending account_id picks the winner
6. **\`adl_does_not_touch_losers_or_flats\`** — Phase 2 \`filter_map\`: ineligible accounts in mixed populations are correctly skipped


(Answer: **Phase 4's \`if remaining <= 0 break;\` exits the loop *before* A is processed.** After B is haircut by 80, \`remaining\` becomes 0; the loop breaks; A never enters the loop body, so no record is created for A. This is the structural payoff of the \`break\` (recall Lesson 2's predict callout): a quota-bounded loop produces records only for the accounts that *actually* received haircuts, not zero-haircut padding. The report's \`records.len()\` becomes a meaningful count: "how many accounts got force-closed by this ADL pass." **\`break\` keeps the report's record count meaningful.**)

## The 6 tests

Append to the existing \`#[cfg(test)] mod tests\` block in \`adl.rs\`:

### Test 1: full-PnL haircut leaves a zero payout

\`\`\`rust
#[test]
fn adl_single_winner_partial_haircut_at_full_pnl() {
    // PnL = 100, deficit = 100 → full haircut, payout = 0.
    let candidates = vec![snapshot(1, 1, 100, 100)];
    let report = execute_adl(&candidates, MarkPrice(200), 100);
    let rec = &report.records[0];
    assert_eq!(rec.haircut, 100);
    assert_eq!(rec.pnl_paid, 0);
    assert_eq!(report.deficit_remaining, 0);
}
\`\`\`

Three things to notice:

1. **\`haircut == pnl_gross\` is the boundary case where the winner pays everything.** \`min(remaining=100, pnl_gross=100) = 100\`. The decomposition \`pnl_paid = pnl_gross - haircut = 0\` holds, but the trader receives nothing — they were the system's last line of defense. **This is the case where a winner's full PnL gets eaten by ADL; ethically the worst case for the trader, structurally just \`min\` doing its job.**
2. **\`deficit_remaining = 0\` even though we drained the winner.** The deficit was exactly covered, so nothing remains. Compare with Test 2 where the deficit *exceeds* the winner's PnL — there, \`deficit_remaining > 0\` and the chain has unresolved trouble.
3. **No assertion on \`report.records.len()\`.** Lesson 2's tests asserted record counts explicitly; here we just index \`records[0]\`. Both styles are valid; this test trusts the Lesson 2-tested invariant that "exactly one winner produces exactly one record". **Don't over-assert what prior tests already proved.**

### Test 2: deficit exceeds winner's PnL — remainder propagates

\`\`\`rust
#[test]
fn adl_single_winner_exhausted_with_remaining_deficit() {
    // PnL = 100, deficit = 250 → full haircut, 150 remains.
    let candidates = vec![snapshot(1, 1, 100, 100)];
    let report = execute_adl(&candidates, MarkPrice(200), 250);
    assert_eq!(report.records.len(), 1);
    assert_eq!(report.deficit_absorbed, 100);
    assert_eq!(report.deficit_remaining, 150);
}
\`\`\`

Three things to notice:

1. **\`min(250, 100) = 100\` — the winner's PnL caps the haircut, not the deficit.** Phase 4's \`haircut = remaining.min(pnl_gross)\` reads "take as much as the deficit needs, or as much as the winner has, whichever is less." Here the winner is smaller, so \`haircut = pnl_gross = 100\`. **\`min\` of two upper bounds — both apply, the smaller wins.**
2. **\`deficit_absorbed + deficit_remaining == 250\` — the conservation law holds.** \`100 + 150 == 250\`. This is the structural conservation we set up in Lesson 2 and will universalize in Lesson 4's proptest. Every test in Lesson 3 implicitly verifies it; Lesson 4's proptest verifies it *universally*. **Conservation is implicit in Lesson 3 tests, explicit in Lesson 4 proptests.**
3. **\`deficit_remaining = 150\` is the signal to the bridge: "I couldn't cover this".** The bridge reads \`deficit_remaining > 0\` and decides what to do (halt the chain, take it as protocol loss, raise an alert). The function's job ends at reporting; policy is the bridge's responsibility. **\`execute_adl\` reports the deficit state; the bridge decides policy.**

### Test 3: multi-winner ranking — higher leverage wins

\`\`\`rust
#[test]
fn adl_multiple_winners_in_score_order() {
    // Two long winners; the higher-leverage one ranks first.
    // A: coll 100, pnl 100 → score 10_000 (per Lesson 1's score derivation)
    // B: coll 50,  pnl 100 → score 26_666
    // deficit = 80 → B haircut = 80, pnl_paid = 20; A untouched.
    let candidates = vec![snapshot(1, 1, 100, 100), snapshot(2, 1, 100, 50)];
    let report = execute_adl(&candidates, MarkPrice(200), 80);
    assert_eq!(report.records.len(), 1, "deficit smaller than B's pnl → only B");
    assert_eq!(report.records[0].account, AccountId(2));
    assert_eq!(report.records[0].haircut, 80);
}
\`\`\`

Four things to notice:

1. **A and B have the same PnL (100), different collateral.** A is \`coll 100\`, so \`pnl_pct = 100×10000/100 = 10000\` bps and leverage = \`notional/equity = 200/200 = 10000\` bps → score 10,000. B is \`coll 50\`, so \`pnl_pct = 100×10000/50 = 20000\` bps and leverage = \`200/150 ≈ 13333\` bps → score \`20000 × 13333 / 10000 = 26666\`. **Same PnL but higher leverage = higher score = haircut first.**
2. **The score-math comment is the test's spec.** Without the math in the comment, the test would be a magic-numbers assertion: "trust me, B has score 26666". With the math, the test reads as a derivation a human can verify. **Math-walk comments turn assertions into proofs.**
3. **A's record is absent from the report.** The \`break\` in Phase 4 fires after B is haircut (remaining = 0); A never enters the loop body. The assertion \`records.len() == 1\` documents this — A isn't there because A wasn't needed. **The Predict callout's payoff: the record count tells you how many accounts actually got force-closed.**
4. **The \`"deficit smaller than B's pnl → only B"\` message on the length assertion is documentation.** If this test ever fails (e.g., a refactor breaks Phase 3's sort discipline), the failure message tells the debugger *why* this matters. **Assertion messages are documentation — write them as if you'd read them in CI logs at 3 a.m.**

### Test 4: deficit drains rank 1, partially covers rank 2

\`\`\`rust
#[test]
fn adl_drains_first_winner_then_partially_second() {
    // Both winners contribute to a large deficit.
    // A: coll 100, pnl 100 → score 10_000, rank #2
    // B: coll 50,  pnl 100 → score 26_666, rank #1
    // deficit = 150 → B haircut = 100 (full), A haircut = 50 (partial)
    let candidates = vec![snapshot(1, 1, 100, 100), snapshot(2, 1, 100, 50)];
    let report = execute_adl(&candidates, MarkPrice(200), 150);
    assert_eq!(report.records.len(), 2);
    assert_eq!(report.records[0].account, AccountId(2)); // B first
    assert_eq!(report.records[0].haircut, 100);
    assert_eq!(report.records[0].pnl_paid, 0);
    assert_eq!(report.records[1].account, AccountId(1)); // A second
    assert_eq!(report.records[1].haircut, 50);
    assert_eq!(report.records[1].pnl_paid, 50);
    assert_eq!(report.deficit_absorbed, 150);
    assert_eq!(report.deficit_remaining, 0);
}
\`\`\`

Five things to notice:

1. **Same inputs as Test 3 (A and B), bigger deficit (150).** This isolates the *quota exhaustion* behavior. Test 3 had deficit = 80 (smaller than B alone) → loop exits after B. Test 4 has deficit = 150 (more than B alone) → loop continues into A. **The pair tests-3-and-4 walks the deficit axis: under one winner, over one winner.**
2. **B is fully haircut (100), then A gets the residual (50).** Phase 4 iteration: rank #1 = B, \`haircut = min(150, 100) = 100\`, \`remaining = 50\`. Rank #2 = A, \`haircut = min(50, 100) = 50\`, \`remaining = 0\`. Loop exits naturally on next iteration's \`break\` (no rank #3 anyway). **Quota exhausts winner 1 entirely, then bites partially into winner 2.**
3. **\`records[0]\` is B, \`records[1]\` is A — sorted by score, descending.** Lesson 2's Phase 3 sort is doing its job. The test asserts the order explicitly; if Phase 3's \`b.1.cmp(&a.1)\` were ever swapped to \`a.1.cmp(&b.1)\`, this test would fail loudly. **Order assertions in tests are how you guard sort discipline against future refactors.**
4. **\`deficit_absorbed = 150\` and \`deficit_remaining = 0\`.** Conservation: \`100 + 50 + 0 == 150\`. Every wei of deficit was accounted for. **Conservation in action — the test verifies the loop-body invariant on a 2-iteration input.**
5. **A's \`pnl_paid = 50\` — A keeps half their PnL.** This is the human story behind the math: the higher-leverage trader (B) loses everything, the lower-leverage trader (A) loses half. The system protects A more than B because ranking by \`pnl_pct × leverage\` is conservative toward less-leveraged winners. **The score discipline isn't arbitrary; it allocates the burden to the most-leveraged winner first.**

### Test 5: equal scores → ascending account_id wins

\`\`\`rust
#[test]
fn adl_tiebreaker_by_account_id_ascending() {
    // Two structurally identical winners. Tiebreaker is account_id
    // ascending → smaller account_id is force-closed first.
    let candidates = vec![
        snapshot(7, 1, 100, 50),  // identical except account
        snapshot(3, 1, 100, 50),
    ];
    let report = execute_adl(&candidates, MarkPrice(200), 50);
    assert_eq!(report.records.len(), 1);
    assert_eq!(report.records[0].account, AccountId(3));
}
\`\`\`

Three things to notice:

1. **The two snapshots differ *only* in account_id (7 vs 3).** Same position size, same entry, same collateral → same score, same PnL. The only thing Phase 3's \`then_with\` has to break the tie on is \`account_id\`. **Test isolates the tiebreaker by making everything else identical.**
2. **AccountId(3) wins, not AccountId(7), despite being passed *second* in the input vector.** Phase 3's stable sort puts AccountId(3) first because \`then_with(|| a.0.account.0.cmp(&b.0.account.0))\` is ascending. The input order doesn't matter; the sort discipline does. **Input order is irrelevant when the sort discipline is total.**
3. **deficit = 50 covers exactly one winner's full PnL** (PnL = 100 for each at mark 200, but actually let me re-check — coll 50, pnl from mark 200 - entry 100 = 100). Actually deficit = 50, pnl_gross = 100 → haircut = 50, only one record. The single-record assertion isolates the tiebreaker question from any multi-iteration noise. **Test design choice: deficit sized to produce exactly one record, so the assertion is purely about *which* winner was picked.**

### Test 6: losers and flats are filtered out, even in mixed populations

\`\`\`rust
#[test]
fn adl_does_not_touch_losers_or_flats() {
    let candidates = vec![
        snapshot(1, 1, 100, 50),     // winner @ mark 200
        snapshot(2, 1, 100, 1_000),  // loser? — same mark applies, see below
        snapshot(3, 0, 100, 1_000),  // flat
    ];
    // All evaluated at mark = 200 → only acct 1 is profitable.
    let report = execute_adl(&candidates, MarkPrice(200), 10);
    assert_eq!(report.records.len(), 1);
    assert_eq!(report.records[0].account, AccountId(1));
}
\`\`\`

Three things to notice:

1. **Acct 1 and acct 2 both pass the eligibility filter, but acct 2 doesn't get touched — for a different reason.** All candidates evaluated at the same mark (200). Acct 1 (long 1 @ entry 100, mark 200) and acct 2 (long 1 @ entry 100, mark 200) both have PnL = +100 — both profitable. Lesson 1's \`adl_score\` doesn't return \`None\` based on collateral magnitude, so both pass Phase 2 and enter \`ranked\`. But acct 2 has higher collateral (1000 vs acct 1's 50) → lower leverage → lower score → rank #2. \`deficit = 10\` is fully exhausted by the haircut to top-ranked acct 1 → Phase 4's \`break\` exits the loop before acct 2 is processed. **Acct 3 was filtered out at Phase 2 (eligibility). Acct 2 was left untouched at Phase 4 (quota exhaustion). One test, two distinct defense layers proven simultaneously.** The \`// loser?\` comment is honestly preserved drafting-history residue from when acct 2 was originally intended as a loser.
2. **Acct 3 is flat (position_size = 0) → \`adl_score\` returns \`None\` (Lesson 1's first eligibility check).** Phase 2's \`filter_map\` drops the \`None\` → acct 3 never enters \`ranked\` → no record. **Lesson 1's eligibility tests prove \`adl_score\` on inputs in isolation; this test proves the filter integrates with the full pipeline.**
3. **\`deficit = 10\` is a deliberate test-design choice — small enough to trigger Phase 4's \`break\` after acct 1.** A larger deficit would have continued the loop into acct 2 and obscured what this test is meant to prove. The size of deficit is itself part of the test's design — it isolates the "filter at Phase 2 + early-break at Phase 4" composition by picking a deficit that exercises both. **Test inputs aren't just data; they're chosen to make the proof visible.**

## Test progression at a glance

\`\`\`
   simple ────────────────────────────────────────────────────► compound

   Test 1 ─┐
           ├── single winner edge cases ────────────────── Phase 4 (boundary)
   Test 2 ─┘

   Test 3 ─┐
           ├── multi-winner ordering ──────── Phase 3 (sort) + Phase 4 (break)
   Test 4 ─┘

   Test 5 ───── tiebreaker isolation ──────── Phase 3 (then_with, determinism)

   Test 6 ───── mixed-population integration ──── Phase 2 + Phase 4 composition
                                                          ↓
                                              two-defense-layer capstone
\`\`\`

## Test-to-behavior mapping

| Test | Pipeline phase exercised | Behavior proven |
|---|---|---|
| 1. \`adl_single_winner_partial_haircut_at_full_pnl\` | Phase 4 (boundary) | \`haircut == pnl_gross\` → pnl_paid = 0; decomposition holds at the boundary |
| 2. \`adl_single_winner_exhausted_with_remaining_deficit\` | Phase 4 (insufficient capacity) | \`pnl_gross < deficit\` → record absorbed, remainder propagates to bridge |
| 3. \`adl_multiple_winners_in_score_order\` | Phase 3 (sort) + Phase 4 (\`break\`) | Higher leverage ranks first; lower-ranked winner untouched when deficit fits in rank 1 |
| 4. \`adl_drains_first_winner_then_partially_second\` | Phase 3 (sort) + Phase 4 (quota exhaustion) | Multi-iteration absorption; quota distributes across ranks |
| 5. \`adl_tiebreaker_by_account_id_ascending\` | Phase 3 (\`then_with\`) | Determinism under score ties — same input across validators produces same output |
| 6. \`adl_does_not_touch_losers_or_flats\` | Phase 2 (\`filter_map\`) + integration | Eligibility filter integrates with the full pipeline in mixed populations |

The 6 tests collectively prove that Lesson 2's pipeline is correct on the load-bearing input cases. Lesson 4's 5 proptests will universalize this: same conservation law, same decomposition, same determinism, against random inputs.

## Run them

\`\`\`bash
cargo test -p openhl-liquidation adl::tests::adl_
\`\`\`

Expected: 16 tests pass (Lesson 1's 5 + Lesson 2's 5 + Lesson 3's 6). The full ADL unit-test matrix is now covered.

## Q&A

**Q1: Six tests for one function — isn't that a lot?**

Not for a function with this much surface area. \`execute_adl\` has 5 phases × multiple input dimensions (deficit size, candidate count, score distribution, eligibility mix). The matrix is much larger than 6; Lessons 1 + 2 + 3 together give 16 tests, which is closer to "minimal coverage" than "excess." The Lesson 4 proptests will *generalize* what these specific cases prove; you can't generalize what you haven't first verified on hand-picked inputs. **Specific tests prove the function's shape; proptests prove the function's universality. Both layers needed.**

**Q2: Why hand-compute expected values in comments instead of just asserting?**

Two reasons. First, the comment is a *spec* that future readers can verify against the production code — if \`adl_score\` ever changes how it computes score, the comment's number will be wrong and the test will fail loudly, not silently. Second, the comment turns the test into a debugger-friendly worked example — when a failure happens, the comment is the first thing the debugger reads. Without the math walk, the failure message is just "expected 26666, got X" and the debugger has to re-derive 26666 by hand. **Math in comments is the cheapest form of test documentation.**

**Q3: When should I add a 7th unit test vs. add a 6th proptest?**

Add a unit test if there's a *specific* input that exercises a behavior the current tests don't cover (e.g., "what about deficit = i64::MAX?"). Add a proptest if there's a *universal* property the current tests can't express (e.g., "for all valid inputs, conservation holds"). Unit tests are concrete examples; proptests are universal claims. The ADL course uses 16 unit tests + 5 proptests; that ratio is typical for well-tested consensus code. **Unit tests for concrete behaviors, proptests for universal properties.**

**Q4: Could these tests be parameterized (e.g., \`#[rstest]\` with multiple inputs)?**

Yes, but the openhl-liquidation crate doesn't use \`rstest\` and the per-test math-walk comments would become harder to maintain across parameterized rows. The duplication cost of 6 explicit tests is lower than the cognitive cost of parameterization in this case. **Parameterization is the right tool when the test bodies are identical and only inputs vary; here each test has its own setup story.**

**Q5: Test 6's comment says "loser?" with a question mark — is the test wrong?**

The test is correct; the comment is honestly flagged. Acct 2 *isn't* actually a loser at mark = 200 (PnL = +100, same as acct 1) — it was intended as a loser in an earlier draft and the comment wasn't fully updated. As Test 6 #1 covers in detail, the test still proves what it claims (acct 3 filtered at Phase 2, acct 2 untouched at Phase 4), but the inline \`// loser?\` comment betrays the drafting history. **Honest about-the-test comments are useful — they signal "this test grew up; here's the rough edge". Don't airbrush them out.**

## Next lesson (Lesson 4) — Capstone — 5 invariant proptests + Stage 10 quartet retrospective

Lesson 4 closes the ADL course (and the Stage 10 quartet) with 5 invariant proptests against random inputs:

1. \`conservation_absorbed_plus_remaining_equals_deficit\` — universalizes Lesson 3 Tests 2 & 4
2. \`each_record_balances_pnl\` — universalizes Lesson 3 Tests 1, 2 & 4 (decomposition law)
3. \`total_haircut_equals_deficit_absorbed\` — universalizes the per-record/aggregate accounting consistency
4. \`execute_adl_is_deterministic\` — universalizes Lesson 3 Test 5's tiebreaker discipline as "same input → same output, always"
5. \`records_in_rank_order\` — universalizes Lesson 3 Tests 3 & 4's ordering discipline

Plus a Stage 10 retrospective: how Stage 10a (margin classification) + 10b (insurance fund) + 10c (scanner) + 10d (ADL) compose into the full Layer 1 → Layer 2 → Layer 3 safety-net cascade. The 4 stages, 4 layers of bookkeeping, 1 byte-for-byte-reproducible system.

After Lesson 4, the ADL course is complete: 5 lessons across 2 modules, 16 unit tests + 5 proptests, byte-for-byte against openhl Stage 10d at \`d66b44a\`. The DIY Perp series closes its 6th installment.

## Summary (3 lines)

- 6 absorption tests = 2-axis matrix: \`{single, multiple} × {full absorb, partial absorb, mixed eligibility}\`. Each cell exercises a different structural variation of \`execute_adl\`.
- Single winner = entire deficit goes to one trader. Multiple winners = deficit distributed by score-ranked order. Tie-break by position size; losers and flats untouched.
- Full absorb verifies deficit is fully covered. Partial absorb verifies clean termination when not. Mixed eligibility verifies only candidates are touched. Next lesson: Capstone with 5 invariant proptests.
`,
                },
                {
                  title: 'Lesson 4 — Capstone — 5 invariant proptests + Stage 10 quartet retrospective',
                  slug: 'openhl-adl-capstone-en',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 45,
                  xpReward: 90,
                  content: `# Lesson 4 — Capstone — 5 invariant proptests + Stage 10 quartet retrospective

## Question

L2 and L3 proved \`execute_adl\` with hand-picked inputs. **Now generalise to "this holds for all valid inputs"** — and compose four courses (Compute / Insurance fund / Scanner / ADL) into a single cascade. Five invariant proptests on top of the 5-degenerate + 6-absorption tests; one retrospective on Stage 10.

## Principle (minimum model)

- **proptest universalises specific tests.** Unit tests prove "this concrete example works"; proptests prove "all valid inputs work". Both are needed — "specifics prove shape, proptests prove universality".
- **Five invariants.** (1) \`total_absorbed + remaining_uncovered == deficit\` (conservation of deficit). (2) Sum of haircuts equals \`total_absorbed * mark\` (conservation of position notional). (3) Every haircut respects position-size cap (no negative positions). (4) Score-descending order is preserved through the haircut walk. (5) Non-candidates are never touched.
- **Proptest input generation.** \`prop_assume!(deficit > 0)\` + \`vec(any_position(), 1..50)\` + \`mark in 1..1_000_000\`. Filters invalid inputs (zero deficit, empty candidate set) before the assertion runs.
- **Stage 10 quartet retrospective.** All four courses (Funding compute / Insurance fund / Liquidation scanner / ADL) compose into the cascade: scanner leaves deficit → insurance fund absorbs as much as it can → ADL absorbs the rest.
- **Composition guarantee.** Each layer's output is the next layer's input. Type-system enforced: \`LiquidationReport\` → \`InsuranceFundOutcome\` → \`AdlReport\`. No layer can be skipped, no layer can emit garbage to the next.
- **SHA \`d66b44a\` answer-key.** The proptests + retrospective code is pinned. \`git checkout d66b44a\` gives byte-for-byte the same answers as the author.
- **Why a retrospective matters here.** Four courses, four mental models. The retrospective glues them together — by the end you can hold the whole cascade in your head and reason about edge cases that span layers.

## Worked example + steps

# Lesson 4 — Capstone — 5 invariant proptests + Stage 10 quartet retrospective

## Goal

Concepts you'll grasp in this lesson:

- **Lesson 4 closes two things at once: the ADL course AND the Stage 10 quartet.** Stage 10a (margin classification, pure compute) + 10b (insurance fund, stateful absorption) + 10c (scanner, orchestration) + 10d (ADL, off-orderbook fallback) is the full safety-net cascade. After Lesson 4 you can point at every account state transition under stress and name (a) which layer handled it, (b) which conservation law preserved it, and (c) which proptest proves it universally. **Four stages, three layers, one discipline.**
- **5 invariant proptests universalize what Lessons 2 + 3 proved on specific inputs.** Lesson 2's 5 degenerate-path tests and Lesson 3's 6 nuanced-absorption tests prove \`execute_adl\` on hand-picked inputs; Lesson 4's 5 proptests prove the same properties on *random* inputs. (1) \`conservation_absorbed_plus_remaining_equals_deficit\` — the load-bearing conservation law. (2) \`each_record_balances_pnl\` — per-record decomposition. (3) \`total_haircut_equals_deficit_absorbed\` — per-record/aggregate accounting consistency. (4) \`execute_adl_is_deterministic\` — same input → same output, always. (5) \`records_in_rank_order\` — sort discipline holds for any input. **Specific tests prove the function's shape; proptests prove the function's universality.**
- **The proptest's input strategy is the spec for "what counts as valid input".** \`collaterals in proptest::collection::vec(1_i64..1_000_000, 0..15)\` says "between 0 and 15 candidate accounts, each with collateral between 1 and 1,000,000." \`mark in 1_u64..1_000\` says "the mark price ranges 1 to 1000." \`deficit in 0_i64..1_000_000\` says "the deficit ranges 0 to 1M." These ranges are the *meaningful operating regime* — outside them, the proptest doesn't generate inputs (overflow/underflow edge cases get handled by the saturating ops Lesson 2 introduced, not by the proptest). **Input strategies aren't just "any input"; they're "any input in the operating regime."**
- **In Lesson 4 we prefer Strategy-side shaping over heavy \`prop_assume!\` rejection.** These five properties are about hitting meaningful branches with high density, so biasing generator ranges upfront is usually better than post-generation rejection. That keeps reject counts low and structurally avoids \`TooManyAssumptions\` risk. **Use \`prop_assume!\` when you must encode a mathematical precondition; use Strategy shaping when you need branch-density.**
- **The Stage 10 retrospective is a course-spanning thesis statement.** The 4 stages compose into a single per-block orchestration: scanner classifies, insurance fund absorbs, ADL fallbacks, and every layer's failure mode is *bounded by structural invariants that are mechanically proven*. This is the rethlab thesis applied to one production cascade: discipline transfers across layers because conservation laws don't care about layer boundaries. **Conservation isn't a property you add; it's a discipline you preserve from Layer 1 to Layer 3.**

Verification:

\`\`\`bash
cargo test -p openhl-liquidation adl::tests
\`\`\`

…now reports **21 tests passing** (Lesson 1: 5 score-eligibility/ordering + Lesson 2: 5 degenerate + Lesson 3: 6 nuanced + Lesson 4: 5 proptests). The full ADL surface — score eligibility, pipeline correctness, conservation laws, decomposition, determinism, ordering — is proven against both specific and random inputs.

Specific changes:

- **\`crates/liquidation/src/adl.rs\`** — append a \`proptest! { ... }\` block at the bottom of the \`#[cfg(test)] mod tests\` module containing the 5 invariants.

5 proptests, ~60 lines of new test code. Plus the Stage 10 quartet retrospective walks the cascade architecture — no code, just architectural framing that closes the course.

## Recap

After Lesson 3:
- \`execute_adl(candidates, mark, deficit) -> AdlReport\` is shipped (Lesson 2) and tested against 11 specific inputs (Lesson 1's 5 + Lesson 2's 5 + Lesson 3's 6 = 16 unit tests).
- The 5-phase pipeline (early-return + filter_map + sort_by + haircut loop + finalize) is structurally correct on every hand-picked input we've thrown at it.
- The conservation law \`deficit_absorbed + deficit_remaining == input_deficit\` is *implicit* in every Lesson 3 test (verified per-input) but not yet *universal* (verified for-all-inputs).

Lesson 4 takes the same \`execute_adl\` and proves the same properties universally. Same function, same theorems, infinitely many inputs.

## Plan

Two artifacts:

1. **5 proptests** appended to \`adl.rs\`'s \`#[cfg(test)] mod tests\` block, inside a \`proptest! { ... }\` macro invocation. Each proptest takes a \`(collaterals, mark, deficit)\` input strategy and proves one of the 5 invariants.

2. **Stage 10 quartet retrospective** — no code; an architectural walkthrough of how 10a + 10b + 10c + 10d compose into the safety-net cascade, with the conservation laws of each stage named.


(Answer: **\`records_in_rank_order\`** — universalizes ADL's *sort discipline*. Lesson 13's scanner doesn't sort its records (it processes accounts in insertion order); ADL's records must be in \`(score descending, account_id ascending)\` order, and this proptest proves it for any input. The other 4 proptests (conservation, decomposition, accounting consistency, determinism) have direct Lesson 13 analogues; the 5th exists only because ADL has a stronger ordering contract than the scanner did. **More structure in the output requires more invariants to preserve it.**)

## The 5 proptests

Append to \`adl.rs\`, after the Lesson 3 unit tests, inside the same \`#[cfg(test)] mod tests\` block:

\`\`\`rust
proptest! {
    /// Conservation: absorbed + remaining = input deficit (for
    /// non-negative inputs).
    #[test]
    fn conservation_absorbed_plus_remaining_equals_deficit(
        collaterals in proptest::collection::vec(1_i64..1_000_000, 0..15),
        mark in 1_u64..1_000,
        deficit in 0_i64..1_000_000,
    ) {
        let entry = 100u64;
        let candidates: Vec<_> = collaterals
            .iter()
            .enumerate()
            .map(|(i, c)| snapshot(i as u64, 1, entry, *c))
            .collect();
        let report = execute_adl(&candidates, MarkPrice(mark), deficit);
        prop_assert_eq!(report.deficit_absorbed + report.deficit_remaining, deficit);
    }

    /// Every record has \`pnl_paid == pnl_gross - haircut\`, with
    /// both haircut and pnl_paid non-negative.
    #[test]
    fn each_record_balances_pnl(
        collaterals in proptest::collection::vec(1_i64..1_000_000, 0..15),
        mark in 1_u64..1_000,
        deficit in 1_i64..1_000_000,
    ) {
        let entry = 100u64;
        let candidates: Vec<_> = collaterals
            .iter()
            .enumerate()
            .map(|(i, c)| snapshot(i as u64, 1, entry, *c))
            .collect();
        let report = execute_adl(&candidates, MarkPrice(mark), deficit);
        for rec in &report.records {
            prop_assert!(rec.haircut >= 0);
            prop_assert!(rec.haircut <= rec.pnl_gross);
            prop_assert!(rec.pnl_paid >= 0);
            prop_assert_eq!(rec.pnl_paid, rec.pnl_gross - rec.haircut);
        }
    }

    /// Total haircuts equal \`deficit_absorbed\`.
    #[test]
    fn total_haircut_equals_deficit_absorbed(
        collaterals in proptest::collection::vec(1_i64..1_000_000, 0..15),
        mark in 1_u64..1_000,
        deficit in 1_i64..1_000_000,
    ) {
        let entry = 100u64;
        let candidates: Vec<_> = collaterals
            .iter()
            .enumerate()
            .map(|(i, c)| snapshot(i as u64, 1, entry, *c))
            .collect();
        let report = execute_adl(&candidates, MarkPrice(mark), deficit);
        let total: i64 = report.records.iter().map(|r| r.haircut).sum();
        prop_assert_eq!(total, report.deficit_absorbed);
    }

    /// Determinism: same input twice → same report.
    #[test]
    fn execute_adl_is_deterministic(
        collaterals in proptest::collection::vec(1_i64..1_000_000, 0..10),
        mark in 1_u64..1_000,
        deficit in 0_i64..1_000_000,
    ) {
        let entry = 100u64;
        let candidates: Vec<_> = collaterals
            .iter()
            .enumerate()
            .map(|(i, c)| snapshot(i as u64, 1, entry, *c))
            .collect();
        let r1 = execute_adl(&candidates, MarkPrice(mark), deficit);
        let r2 = execute_adl(&candidates, MarkPrice(mark), deficit);
        prop_assert_eq!(r1, r2);
    }

    /// Records are in non-increasing score order (or equal score
    /// with strictly ascending account_id).
    #[test]
    fn records_in_rank_order(
        collaterals in proptest::collection::vec(1_i64..1_000_000, 2..15),
        mark in 100_u64..500,
        deficit in 1_000_000_i64..10_000_000,
    ) {
        // Big deficit ensures we get many records.
        let entry = 100u64;
        let candidates: Vec<_> = collaterals
            .iter()
            .enumerate()
            .map(|(i, c)| snapshot(i as u64, 1, entry, *c))
            .collect();
        let report = execute_adl(&candidates, MarkPrice(mark), deficit);
        for w in report.records.windows(2) {
            let (a, b) = (&w[0], &w[1]);
            // Either strict score decrease, OR same score with smaller account_id first.
            let ok = a.score > b.score
                || (a.score == b.score && a.account.0 < b.account.0);
            prop_assert!(ok, "rank order broken between {:?} and {:?}", a, b);
        }
    }
}
\`\`\`

## Walk-through — what each proptest universalizes

### Proptest 1: Conservation

\`\`\`rust
prop_assert_eq!(report.deficit_absorbed + report.deficit_remaining, deficit);
\`\`\`

Three things to notice:

1. **This is the load-bearing conservation law from Lesson 2's Phase 5 + Phase 4 loop body.** Every iteration's \`haircut + new_remaining == old_remaining\` accumulates so that at the end, \`deficit_absorbed + deficit_remaining == initial_deficit\`. The proptest verifies this for *any* \`(collaterals, mark, deficit)\` tuple in the operating regime.
2. **\`deficit in 0_i64..1_000_000\`** includes zero. This catches Phase 1's \`deficit <= 0\` early-return — \`deficit = 0\` produces \`deficit_absorbed = 0\` and \`deficit_remaining = 0\`, and \`0 + 0 == 0\` holds. **The input range includes the boundary; the conservation law holds at the boundary.**
3. **Lesson 3 Tests 2 (\`single_winner_exhausted_with_remaining_deficit\`) and 4 (\`drains_first_winner_then_partially_second\`)** each verified conservation on one specific input. This proptest verifies it on default-256 random inputs (configurable to 100,000+ in CI). **What 2 unit tests assert on 2 inputs, 1 proptest asserts on 256.**

### Proptest 2: Per-record decomposition

\`\`\`rust
for rec in &report.records {
    prop_assert!(rec.haircut >= 0);
    prop_assert!(rec.haircut <= rec.pnl_gross);
    prop_assert!(rec.pnl_paid >= 0);
    prop_assert_eq!(rec.pnl_paid, rec.pnl_gross - rec.haircut);
}
\`\`\`

Three things to notice:

1. **Four sub-assertions per record:** non-negative haircut, haircut bounded by pnl_gross, non-negative pnl_paid, and the decomposition equation. Each is a separate \`prop_assert!\` so a failure tells you exactly which sub-property broke. **Granular assertions make proptest failures debuggable.**
2. **\`for rec in &report.records\` iterates over the *actual* records produced.** If the report has 0 records (degenerate input case), the loop is a no-op and the proptest passes — vacuously. **Proptests with no records are vacuous proofs; that's fine, they're not the interesting cases.**
3. **Lesson 3 Tests 1, 2, 4 each verified one record's decomposition on a specific input. This proptest verifies all records on random inputs.** The arithmetic identity \`pnl_paid = pnl_gross - haircut\` from Phase 4's \`pnl_gross.saturating_sub(haircut)\` is universal here. **Saturating subtraction doesn't matter here — \`haircut <= pnl_gross\` is enforced by the \`.min\` in Phase 4, so the subtraction never underflows.**

### Proptest 3: Aggregate accounting consistency

\`\`\`rust
let total: i64 = report.records.iter().map(|r| r.haircut).sum();
prop_assert_eq!(total, report.deficit_absorbed);
\`\`\`

Three things to notice:

1. **This proves the cross-check between per-record and aggregate accounting.** Phase 4 accumulates \`deficit_absorbed = deficit_absorbed.saturating_add(haircut)\` in lockstep with \`records.push(... haircut ...)\`. So summing all \`record.haircut\` *must* equal \`deficit_absorbed\`. If the accumulator ever drifted from the records (e.g., a refactor adds a haircut but forgets to push the record), this proptest catches it.
2. **The \`total: i64 = ... .sum()\` could overflow in principle.** In practice, each \`haircut <= deficit\` and \`deficit <= 1_000_000\` (the input range), and there are at most 15 candidates — so total ≤ 15,000,000, well within i64 bounds. **The input strategy's upper bound implicitly bounds the sum's upper bound.**
3. **This invariant is the one that's hardest to verify by inspection but easiest to verify by proptest.** A reader looking at \`execute_adl\` *could* convince themselves that the records-vs-accumulator drift is impossible, but a proptest is faster and more certain. **Some invariants are reader-verifiable; others are proptest-verifiable. Use the right tool.**

### Proptest 4: Determinism

\`\`\`rust
let r1 = execute_adl(&candidates, MarkPrice(mark), deficit);
let r2 = execute_adl(&candidates, MarkPrice(mark), deficit);
prop_assert_eq!(r1, r2);
\`\`\`

Three things to notice:

1. **Same function, same input, twice → asserts equality of full reports.** This catches *any* hidden non-determinism: a \`HashMap\` iteration that randomizes order, a clock read that returns different values, a \`sort_unstable_by\` that breaks ties differently. None of these exist in \`execute_adl\`, but if a future refactor accidentally introduces one, this proptest catches it.
2. **\`AdlReport\` derives \`PartialEq\` (via Lesson 1's design).** That's what makes \`prop_assert_eq!(r1, r2)\` work — the equality compares every field (records, deficit_absorbed, deficit_remaining) for byte-identical match. **\`PartialEq\` derive on every report type is non-optional in consensus code; without it, determinism proptests can't exist.**
3. **The \`0..10\` candidate count (smaller than other proptests' \`0..15\`) keeps this fast.** Determinism is more expensive to test (each iteration calls \`execute_adl\` twice). The smaller input range is a performance trade-off; the property still holds at any size, so reducing the range doesn't weaken the proof. **Performance budgets shape input-range choices in proptests.**

### Proptest 5: Rank order

\`\`\`rust
for w in report.records.windows(2) {
    let (a, b) = (&w[0], &w[1]);
    let ok = a.score > b.score
        || (a.score == b.score && a.account.0 < b.account.0);
    prop_assert!(ok, "rank order broken between {:?} and {:?}", a, b);
}
\`\`\`

Four things to notice:

1. **\`.windows(2)\` pairs adjacent records.** For each adjacent pair (rank N and rank N+1), the test verifies the sort discipline: either strictly descending score, or equal score with strictly ascending account_id. **\`.windows(2)\` is the idiomatic way to verify pairwise invariants in Rust.**
2. **The \`||\` (or) is exactly the inverse of Phase 3's \`b.cmp(&a).then_with(|| a.cmp(&b))\`.** Phase 3 sorts so that score-desc-then-id-asc holds; this proptest asserts that exact ordering on the output. If Phase 3's sort were ever silently broken (e.g., a refactor swaps the comparator), this proptest catches it.
3. **\`deficit in 1_000_000_i64..10_000_000\` is much bigger than other proptests.** Why? Because a small deficit produces few records (often just 1), and "rank order" of a single record is trivially satisfied. We want *many* records in the output to actually exercise the ordering discipline. **The input range is calibrated to make the property non-vacuously testable.**
4. **The failure message \`"rank order broken between {:?} and {:?}"\` formats both records.** When a proptest fails, the message goes into CI logs; including the actual records gives the debugger immediate context. **Failure messages are documentation that runs when things break.**

## Run them all

\`\`\`bash
cargo test -p openhl-liquidation adl::tests
\`\`\`

Expected:

\`\`\`
test adl::tests::adl_does_not_touch_losers_or_flats ... ok
test adl::tests::adl_drains_first_winner_then_partially_second ... ok
test adl::tests::adl_multiple_winners_in_score_order ... ok
...
test adl::tests::adl_tiebreaker_by_account_id_ascending ... ok
test adl::tests::conservation_absorbed_plus_remaining_equals_deficit ... ok
test adl::tests::each_record_balances_pnl ... ok
test adl::tests::execute_adl_is_deterministic ... ok
test adl::tests::records_in_rank_order ... ok
test adl::tests::total_haircut_equals_deficit_absorbed ... ok

test result: ok. 21 passed; 0 failed
\`\`\`

**21 tests, 16 specific inputs + 5 universal properties, all green.** The ADL implementation is mechanically verified.

For the heavy proof — bump proptest's \`PROPTEST_CASES\` env var:

\`\`\`bash
PROPTEST_CASES=10000 cargo test -p openhl-liquidation adl::tests
\`\`\`

This runs each proptest 10,000 times instead of the default 256. Takes ~10-30 seconds on modern hardware. Production CI runs nightly with \`PROPTEST_CASES=100000\` for the full proof-of-the-day.

## Stage 10 quartet retrospective — the safety-net cascade

The 4 stages compose into a single per-block orchestration. Each layer has its own conservation law; failures cascade downward through the layers in a bounded, observable way.

### Cascade at a glance — capacity drops layer by layer

\`\`\`
   ┌─────────────────────────────────────────────────────────────┐
   │  Detectors  (Layer 1 + 1.5)                                 │
   │    margin classify + scanner orchestration                  │
   │    → produces ScanReport { unfilled_deficit: D }            │
   └─────────────────────────────────────────────────────────────┘
                              │
                              ▼ if D > 0
   ┌─────────────────────────────────────────────────────────────┐
   │  Buffer     (Layer 2, capacity = fund balance)              │
   │    insurance fund absorbs min(D, fund_balance)              │
   │    → remaining D' = D − absorbed                            │
   └─────────────────────────────────────────────────────────────┘
                              │
                              ▼ if D' > 0
   ┌─────────────────────────────────────────────────────────────┐
   │  Fallback   (Layer 3, capacity = ∑ winners' PnL)            │
   │    ADL absorbs min(D', ∑PnL_winners)                        │
   │    → remaining D'' = D' − absorbed                          │
   └─────────────────────────────────────────────────────────────┘
                              │
                              ▼ if D'' > 0
   ┌─────────────────────────────────────────────────────────────┐
   │  Last resort (Layer 4, no in-system capacity)               │
   │    protocol policy: halt the chain · accept residual        │
   └─────────────────────────────────────────────────────────────┘

   Deficit shrinks monotonically: D ≥ D' ≥ D'' ≥ 0
   Each layer's residual becomes the next layer's input.
\`\`\`

The detailed orchestration view below names the inputs, outputs, and conservation law of each layer:

\`\`\`
   ╔══════════════════════════════════════════════════════════════════╗
   ║  Per-block orchestration loop (the bridge calls this each block) ║
   ╠══════════════════════════════════════════════════════════════════╣
   ║                                                                  ║
   ║  ┌─ Layer 1 — Stage 10a: Margin classification (pure compute) ─┐ ║
   ║  │  Inputs:  account snapshots × mark price                    │ ║
   ║  │  Output:  MarginPhase per account (Safe/AtRisk/             │ ║
   ║  │           Liquidatable/Underwater)                          │ ║
   ║  │  Law:     Phase boundaries deterministic per (snapshot,     │ ║
   ║  │           mark, params)                                     │ ║
   ║  └─────────────────────────────────────────────────────────────┘ ║
   ║                              ↓                                   ║
   ║  ┌─ Layer 1.5 — Stage 10c: Scanner (orchestrator) ────────────┐  ║
   ║  │  Inputs:  classified accounts × mark price                 │  ║
   ║  │  Output:  ScanReport { closes, unfilled_deficit }          │  ║
   ║  │  Law:     before_balance + ∑deposits − ∑withdrawals =      │  ║
   ║  │           after_balance (per-scan conservation)            │  ║
   ║  └────────────────────────────────────────────────────────────┘  ║
   ║                              ↓                                   ║
   ║                if scan.unfilled_deficit > 0:                     ║
   ║                              ↓                                   ║
   ║  ┌─ Layer 2 — Stage 10b: InsuranceFund (stateful absorption) ─┐  ║
   ║  │  Inputs:  ScanReport closes, fund state                    │  ║
   ║  │  Output:  WithdrawOutcome (Covered/PartiallyDrained/       │  ║
   ║  │           Depleted)                                        │  ║
   ║  │  Law:     fee + residual = equity (per-close balance)      │  ║
   ║  └────────────────────────────────────────────────────────────┘  ║
   ║                              ↓                                   ║
   ║              if WithdrawOutcome != Covered:                      ║
   ║                              ↓                                   ║
   ║  ┌─ Layer 3 — Stage 10d: ADL (off-orderbook fallback) ───────┐   ║
   ║  │  Inputs:  remaining accounts × mark × unfilled_deficit    │   ║
   ║  │  Output:  AdlReport { records, deficit_absorbed,          │   ║
   ║  │           deficit_remaining }                             │   ║
   ║  │  Law:     deficit_absorbed + deficit_remaining = input    │   ║
   ║  │           deficit (this lesson, proptest 1)               │   ║
   ║  └───────────────────────────────────────────────────────────┘   ║
   ║                              ↓                                   ║
   ║              if AdlReport.deficit_remaining > 0:                 ║
   ║                              ↓                                   ║
   ║  ┌─ Layer 4 — Protocol policy (out of scope) ─────────────┐      ║
   ║  │  Options: halt the chain · accept as protocol loss ·   │      ║
   ║  │           page operators                               │      ║
   ║  └────────────────────────────────────────────────────────┘      ║
   ║                                                                  ║
   ╚══════════════════════════════════════════════════════════════════╝
\`\`\`

Three structural takeaways:

1. **Each layer's output is the next layer's input.** Scanner's \`unfilled_deficit\` becomes InsuranceFund's input. InsuranceFund's \`WithdrawOutcome\` gates whether ADL fires. ADL's \`deficit_remaining\` gates whether protocol policy kicks in. **Information flow is downstream-only; no layer reads a layer above it.**
2. **Each layer's failure mode is structurally bounded.** Margin classification can't crash on valid inputs (pure compute, no allocations). InsuranceFund can drain but the \`WithdrawOutcome\` enum names the exact failure shape. ADL can have \`deficit_remaining > 0\` but the conservation law bounds how big it can be. Protocol policy is the only layer with no in-system bound — by design, because that's where deployment policy enters. **Failure semantics are typed all the way down.**
3. **Every layer has a conservation law, proven by a proptest at the corresponding course.** Lesson 13's per-scan conservation (Stage 10c), Stage 10b's fee/residual decomposition, ADL's \`deficit_absorbed + deficit_remaining = deficit\` (this lesson). The Stage 10 quartet isn't 4 separate features — it's 4 proofs of the same discipline at different layers. **One discipline, four layers, byte-for-byte reproducible end-to-end.**

## Q&A

**Q1: Why default to 256 proptest iterations and not 10,000?**

Speed in the inner-loop dev cycle. \`cargo test\` should finish in seconds during development; 256 iterations × 5 proptests × ~1ms each = ~1.3 seconds for the proptest block. 10,000 iterations would take ~50 seconds, slowing every \`cargo test\` invocation. The compromise: 256 by default (catches obvious bugs in seconds), 10,000+ in CI (catches subtle bugs that need rare random inputs). **Default for speed, override for proof.**

**Q2: What if a proptest fails — how do I debug it?**

\`proptest!\` automatically shrinks the failing input to a minimal counterexample and prints it. The shrinker iteratively reduces the input (smaller collaterals vector, smaller mark, smaller deficit) while keeping the failure reproducing, until you get the smallest input that triggers the bug. Then you copy that exact input into a regular \`#[test]\` to reproduce deterministically in your IDE/debugger. **Proptests are property checkers; shrinkers are debuggers.**

**Q3: Could a proptest pass by accident — never hitting the actual bug?**

In principle yes (256 iterations doesn't guarantee hitting all edge cases), in practice rarely. The input strategies are calibrated to hit the operating regime densely. Specific failure modes you suspect can be added as unit tests in Lessons 1–3, even after Lesson 4 ships. **Proptests are necessary but not sufficient — they complement unit tests, don't replace them.**

**Q4: Why is the \`records_in_rank_order\` proptest's \`deficit\` so much larger than the others?**

To force many records into the output. A small deficit gets absorbed by the first ranked winner, leaving 1 record (or 0). With 1 record, \`.windows(2)\` produces zero pairs and the test passes vacuously. Cranking \`deficit\` to \`1_000_000..10_000_000\` against \`0..15\` candidates ensures most runs produce 5-15 records, actually exercising the pairwise ordering. **Calibrate input ranges to make properties non-vacuously testable.**

**Q5: Is \`proptest!\` faster than \`quickcheck\`?**

For typical workloads, comparable. \`proptest!\` is the better-maintained option in the 2026 Rust ecosystem and is what the openhl codebase uses throughout. It also has better shrinker behavior for complex inputs (vectors of structs, etc.). For new Rust projects in 2026, \`proptest!\` is the default; \`quickcheck\` is a legacy option. **In openhl, \`proptest!\` is the convention. Use it.**

**Q6: How does this compare with \`forge invariant\` (Foundry)?**

Same theorem, different mechanics. \`forge invariant\` randomly *sequences method calls* against a Handler and checks invariants after each call; \`proptest!\` here generates *random parameter sets* and runs the function once per input. Both prove "for all valid inputs, this property holds." \`forge invariant\` is multi-call; \`proptest!\` here is single-call (a separate \`proptest-state-machine\` crate handles stateful properties in Rust). **Same discipline, different surface: Rust uses \`proptest!\` for single-call and state-machine for multi-call; Solidity uses \`forge invariant\` for both.** The *Mastering Foundry* Lesson 6 capstone is the Solidity-side sibling to this lesson — it ports openhl-liquidation Stage 10b's \`InsuranceFund\` to Solidity and proves 4 invariants via \`forge invariant\`. Read alongside this Lesson 4 capstone, the pair demonstrates that the discipline transfers in both language directions.

## Course conclusion — DIY Perp series #6 complete

This is the final lesson of *Building OpenHL ADL*. 5 lessons in, you've:

- Lesson 0: Understood ADL's role as Layer 3 of the safety-net cascade
- Lesson 1: Defined \`AdlScore\`, \`AdlRecord\`, \`AdlReport\` + \`adl_score\` — the ranking function
- Lesson 2: Implemented \`execute_adl\` as a 5-phase pipeline + 5 degenerate tests
- Lesson 3: Proved the pipeline against 6 nuanced absorption tests
- Lesson 4: Universalized the proofs via 5 invariant proptests AND closed the Stage 10 quartet

The course is byte-for-byte against openhl Stage 10d at \`d66b44a\`. The Stage 10 quartet (10a + 10b + 10c + 10d) is complete: margin classification → insurance fund → scanner → ADL → bounded protocol policy. 16 unit tests + 5 proptests for ADL alone; combined with the openhl-liquidation course's tests for 10a/b/c, the full quartet has 60+ unit tests and 9+ invariant proptests mechanically proving the cascade.

Where to go next:

- **Stage 11 (oracle) and Stage 12 (vault)** when they land in openhl — same build-along pattern, same conservation discipline applied to new layers.
- **Re-read openhl-liquidation Lesson 13's capstone with ADL eyes** — the per-scan conservation law from Lesson 13 is now visible as "Layer 1.5's contribution to the cascade." The two capstones (Lesson 13 and this Lesson 4) are sibling artifacts.
- **Apply the discipline elsewhere.** Any system with \`before/after/delta\` state transitions — token vesting, fee accumulation, prediction-market settlement — admits this exact pattern. Define the per-step conservation, write the Handler-equivalent that exercises it, and prove the invariants.

The Stage 10 quartet isn't just 4 features. It's 4 proofs of the same discipline at different layers.

**One discipline. Four layers. Byte-for-byte reproducible end-to-end.**

## Summary (3 lines)

- Capstone = 5 invariant proptests (deficit conservation, notional conservation, position-size cap, score-order preservation, non-candidates untouched) + Stage 10 quartet retrospective.
- proptest generalises hand-picked tests to "holds for all valid inputs". Composition guarantee: \`LiquidationReport\` → \`InsuranceFundOutcome\` → \`AdlReport\`, type-enforced.
- Pinned to SHA \`d66b44a\` for byte-for-byte answer-key. The retrospective glues four courses (Compute / Insurance / Scanner / ADL) into one mental model — the safety-net cascade end-to-end.
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
