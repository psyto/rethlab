# Building OpenHL Funding — L0 draft (EN) — build-along

> Drafted against openhl SHA `cd94137` (Stage 8b — funding state machine).
> Course: `building-openhl-funding-en` (track: `reth-l1-architect`).

---

## L0 — `openhl-funding-orientation-en`

- **Module:** 0 (Orientation), sortOrder 0
- **Course-level sortOrder:** 0 (lesson 1 of 12)
- **Duration:** 15 min
- **XP reward:** 50
- **Type:** CONTENT

### Content

````markdown
# Build OpenHL Funding — perpetual funding state machine

## What you'll build

The previous course (`building-openhl-precompiles`) plugged custom EVM precompiles into Reth so smart contracts can read and write a live CLOB. This course builds the next openhl primitive: the **funding state machine** that drives perpetual-contract funding payments.

By the end of this course, you'll have shipped:

- **3 source files / ~635 lines of code (LOC)** in a new `openhl-funding` crate.
- **22 tests passing**: 20 hand-traced + 2 proptest (premium antisymmetry + balanced-book zero-sum).
- **3 building blocks**: a fixed-point types module, a pure compute module (premium / rate / settlement), and a tick-gating clock state machine.
- **Two enforced invariants on the clock**: at most one settlement per interval; no catch-up after long gaps.

You'll understand:

- Why floating-point arithmetic is a network-fork hazard in consensus systems.
- The Hyperliquid funding-rate shape: premium → rate → settlement, with divisor + cap.
- How fixed-point integers scaled by `RATE_SCALE = 1_000_000_000` (parts-per-billion) get you 9 decimal digits of precision without consensus risk.
- Why pure state machines + saturating arithmetic (operations that clamp to min/max on overflow instead of panicking — `saturating_add` / `saturating_mul` in Rust) are the right shape for consensus-critical math.
- Why the clock advances to `now` (not to `last_settled + interval`) — and the design trade-off that encodes.

## Why funding matters (1-paragraph perp recap)

Perpetual futures don't expire. So how does the mark price stay anchored to the spot/index price? Funding payments. When mark > index (longs are overpaying relative to spot), longs pay shorts on a fixed cadence — typically every interval (HL: 1 hour). When mark < index, shorts pay longs.

Funding rate is assembled in stages:

```
1. Premium    = (mark - index) / index               ← still a raw, dimensionless ratio at this point
2. Rate       = Premium / divisor                    ← divisor = 8 (HL)
3. Capped     = clamp(Rate, -4%/interval, +4%/interval)   ← network-set absolute cap
4. Settlement = size × mark × Capped                 ← quote-currency amount each non-zero position settles per tick
```

The `(mark - index) / index` premium introduced here is a **raw ratio**, and this course never implements it as `f64`. Module 1 (L1) bridges it to a signed integer scaled by `RATE_SCALE = 1_000_000_000` (parts-per-billion), and every Premium / Rate / Capped / Settlement computation downstream lives entirely in that fixed-point representation, deterministically. Longs pay, shorts receive — or vice versa, depending on the sign of the premium.

## Why funding can't use floats

A consensus L1 validator must compute *exactly the same* funding rate as every other validator. If two validators disagree on the last bit — the least-significant bit (LSB) — of a rate, they fork the chain.

Float arithmetic gives different bit patterns across:
- **Compilers** — LLVM may emit FMA (fused multiply-add) on one CPU and split it on another.
- **CPUs** — different rounding modes, different denormal handling.
- **Operations** — `(a * b) + c` and `a * b + c` can compile to identical-looking IR but produce different LSBs after optimization.

The cost of a one-LSB disagreement on a funding rate is **chain divergence**. Validators on different sides of the fork settle different deltas, balances diverge, the next block won't validate against either chain.

The fix: never use floats. Compute everything in signed integers scaled by `RATE_SCALE = 1_000_000_000` (parts-per-billion). `0.04` (4%) is `40_000_000`. `0.001` (0.1%) is `1_000_000`. Multiplication needs `i128` intermediate to avoid overflow; division comes after.

This is the same constraint Solana's compute budget, Ethereum's EVM, and every other consensus system imposes. **Determinism is the whole game.**

## The 12 lessons

### Module 0 — Orientation
- **L0** (this lesson) — Why funding, why fixed-point, why state machine.

### Module 1 — Determinism + types (L1-L3)
- **L1** — `RATE_SCALE = 1e9`: fixed-point scheme, why integers, what 9 decimal digits buys you.
- **L2** — Money types: `MarkPrice`, `IndexPrice`, `Premium`, `Notional`. Why each is its own newtype, not just `i64`.
- **L3** — Position types: `PositionSize`, `Position`, `Settlement`, `FundingParams`. The HL defaults and what each parameter encodes.

### Module 2 — Pure compute (L4-L7)
- **L4** — `compute_premium`: the `(mark - index) / index` derivation. Tests for sign symmetry.
- **L5** — `saturate_i128_to_i64` + overflow philosophy. Why saturate, why not panic.
- **L6** — `compute_rate`: divisor, cap, HL-style defaults. The clamp behavior.
- **L7** — `apply_funding`: longs-pay-shorts sign convention. Balanced-book zero-sum invariant.

### Module 3 — Clock state machine (L8-L10)
- **L8** — `FundingClock` structure + `tick()` interface.
- **L9** — Interval-gating invariant: at most one settlement per interval. Tests at the boundary.
- **L10** — No-catch-up invariant: 10-interval gap settles ONCE, not ten times. Why.

### Module 4 — Capstone (L11)
- **L11** — Synthesis. Bridge integration preview (where funding plugs into `LiveRethEvmBridge`). Honest deferred: oracle, liquidations, basis-vs-fixed funding.

## SHA pinning per module

Every lesson cites the openhl commit it builds against. For this course, all 12 lessons cite **Stage 8b `cd94137`** — funding is a single self-contained commit. (Compare to Course 8, which spanned 5 commits across Stage 9a-9d.) The clean SHA mapping means the answer-key diff at the end of L11 is `crates/funding/` byte-identical against `cd94137`.

| Module | Lessons | SHA |
|---|---|---|
| 0 | L0 | `cd94137` |
| 1 | L1-L3 | `cd94137` |
| 2 | L4-L7 | `cd94137` |
| 3 | L8-L10 | `cd94137` |
| 4 | L11 | `cd94137` |

## Prerequisites

To get the most from this course you should have:

- **Course 6 (openhl-consensus) and Course 7 (openhl-clob)** in your head as conceptual background — the funding state machine consumes `AccountId` (Course 7) and is targeted at the bridge built in Courses 6 and 7. **You can skip Course 8 (precompiles) and still follow this course** — funding is pure state-machine math, not EVM-side wiring.
- **Comfort with i128 arithmetic in Rust** — at least one prior `as i128` upcast for overflow avoidance in your bag.
- **A passing familiarity with perpetual-futures funding mechanics.** If you've never traded a perp, the 1-paragraph recap above is enough. If you've traded a perp on Hyperliquid, you're set.
- **No EVM-specific knowledge.** This course doesn't touch precompiles, contracts, or RPC.

You do NOT need:
- A running openhl node (the funding crate has zero I/O).
- Solana or any other L1 experience.
- Quantitative finance background — the math here is straightforward fixed-point arithmetic.

## Setup

```bash
# In your openhl workspace root:
cd ~/code/my-openhl
git checkout main
cargo build --workspace  # baseline — should pass before L1
```

Reference checkout (for the answer-key diff at the end of each lesson):

```bash
cd ~/code/openhl-reference  # separate checkout from your work tree
git checkout cd94137
```

(Or use the same workspace and `git stash` between lookups. Either works.)

## Course style

Each lesson follows the build-along format established in Courses 6-8:
- **Goal** — what passes / what's built by the end.
- **Recap** — where the previous lesson left off.
- **Plan** — the specific edits, numbered.
- **Predict** callouts (🛑 with "Before scrolling...") — questions before answers, so the answers stick.
- **Anti-fluency** callouts (🛑 with common misconceptions named explicitly) — preempt the "couldn't we just...?" reflex.
- **Walk-through** — step-by-step code edits with explanation per change.
- **Test** — the `cargo test` command to run + expected output.
- **Design reflection** — 3-5 load-bearing decisions encoded in this lesson's code.
- **Answer key** — `git diff` against the openhl reference SHA.
- **Common questions** — 3-5 questions with grounded answers.

The math content (especially Modules 2-3) is more concept-heavy than code-heavy compared to Course 8. Plan to **slow down at the formulas** — they're short, but they need to compute the right thing for every input you can imagine. **A perp funding bug doesn't crash; it silently shifts wealth.**

## Ready

Onward to L1, where we set up the `RATE_SCALE` constant and the fixed-point scheme that everything else builds on.
````

---

## Seed-file slot

L0 lands in Module 0 (Orientation) at sortOrder 0:

```typescript
{
  title: 'Build OpenHL Funding — perpetual funding state machine',
  slug: 'openhl-funding-orientation-en',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 15,
  xpReward: 50,
  content: `# Build OpenHL Funding — perpetual funding state machine\n\n...`
},
```

## SHA pinning discipline

L0 cites `cd94137` (Stage 8b). The whole course pins to this single SHA — funding shipped as one self-contained commit.

## Style review notes (self-critique before paste)

- **§Why floats can't be used** earns the determinism framing — readers from non-consensus backgrounds need the chain-fork explanation up front.
- **§12 lessons** maps the structure with one line per lesson — readers can see the path before starting L1.
- **§Prerequisites** flags that Course 8 is skippable. Anyone who skipped precompiles can still follow funding.
- **§Course style** sets reader expectations for the math-heavy modules — "slow down at the formulas" is the key heuristic.
- **§Setup** is minimal — no node bootstrap, no integration tests yet. Pure crate work.
