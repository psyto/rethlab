# Building OpenHL Liquidation — L0 draft (EN) — build-along

> openhl SHA `22eedf9` (Stage 10a — liquidation margin math) and onward.
> This course is **course 10 of the DIY Perp series**, the 5th build-along
> after consensus, clob, precompiles, and funding.

````markdown
## L0 — `openhl-liquidation-orientation-en`

**Stage**: Stage 10a (margin math, pure compute) — `22eedf9`

**Title**: Build OpenHL Liquidation — perpetual position liquidation engine

**Duration**: 15 min · **XP**: 50

---

# Build OpenHL Liquidation — perpetual position liquidation engine

## What you'll build

The previous course (`building-openhl-funding`) added the funding-rate state machine — perpetual contracts now have a mechanism that keeps the mark price anchored to the index. This course builds the next openhl primitive: the **liquidation engine** that force-closes positions when an account's losses exceed its deposited collateral.

By the end of this course, you'll have shipped:

- **3 source files / ~600 LOC** in a new `openhl-liquidation` crate.
- **24+ tests passing** at the Stage 10a milestone, more by capstone: hand-traced unit tests for each compute function + proptests for margin-ratio monotonicity and determinism + insurance-fund conservation invariants.
- **3 building blocks**: a fixed-point types module, a pure compute module (margin math), and a state machine (insurance fund, Stage 10b) plus a multi-account scanner (Stage 10c).
- **A four-state margin classification** (`Safe`, `AtRisk`, `Liquidatable`, `Underwater`) that every validator computes identically.

You'll understand:

- Why a perp DEX cannot outsource liquidations to an off-chain process and still claim consensus solvency.
- The Hyperliquid-shape margin model: cross-margin, mark-vs-entry, initial-vs-maintenance.
- The four states of margin health and what each state authorizes the engine to do.
- The **non-monotonic edge case** in `margin_ratio` — when collateral dominates notional, the ratio can move against the direction of mark, and why that doesn't break liquidations.
- Why the insurance fund is a state machine, not a balance entry.
- How auto-deleveraging (ADL) lives at the edge of this design — and why we leave it out of Stage 10.

## Why liquidations matter (1-paragraph perp recap)

Perpetual contracts are levered positions. A trader deposits `collateral` (USDC) and opens a position of `size` (signed: positive = long, negative = short) at an `entry` price. The position's *unrealized PnL* moves with the mark price: a long profits when mark > entry, loses when mark < entry. When the loss eats into collateral far enough that `equity / notional` drops below the **maintenance margin** requirement, the account can no longer cover its losses — the engine force-closes the position at market (opposite side, full size), debits a **liquidation fee** to the insurance fund, and (if equity remained positive) returns the remainder to the account. If equity went *negative* before the close — the "underwater" case — the insurance fund absorbs the deficit. That's the entire mechanism.

## Why an L1 perp DEX runs liquidations in consensus

Some derivatives venues outsource liquidations to off-chain liquidator processes — bots that scan account state and call a `liquidate(account)` endpoint when they find a target. This works for low-frequency settlement systems (think credit default swaps) but breaks at perp speed: a 50× levered HYPE position can flip from healthy to underwater in seconds during a news cascade, and any RPC-round-trip delay between detection and close is loss the chain absorbs.

Hyperliquid runs liquidations **in consensus**. Every validator, every block, computes which accounts are below maintenance — independently, from the same data, with the same code. The engine's output (close orders + insurance-fund movements) becomes part of the block. **That's the only way the chain stays solvent in adversarial market moves.**

The price you pay for this guarantee is the determinism discipline: float arithmetic is forbidden, every classification must be byte-identical across validators, every overflow must saturate rather than panic. The funding course (`openhl-funding`) was your first deep encounter with this discipline; this course is the second.

## Why liquidations can't use floats

Same answer as funding: consensus determinism. A validator that classifies an account as `Liquidatable` while a peer validator classifies the same account as `AtRisk` will produce a different block — different close orders, different fees, different insurance-fund deltas. Block proposals diverge, the chain forks.

The fix: signed integers + saturating arithmetic + i128 intermediate products for any multiplication that can overflow i64. We use `MARGIN_SCALE = 10_000` (basis points) as the fixed-point unit for `MarginRatio`. Bps is the conventional unit for margin in TradFi *and* in crypto perp venues — Hyperliquid, Binance, Drift all express margin requirements in bps. `MarginRatio(1_000)` is exactly 10%; `MarginRatio(MARGIN_SCALE)` is exactly 100%.

(Funding used `RATE_SCALE = 1_000_000_000` because it needed parts-per-billion precision for tiny per-interval rates. Liquidation needs less precision but the same discipline.)

## The 12 lessons

### Module 0 — Orientation
- **L0** (this lesson) — Why liquidations, why margin model, three-sub-stage roadmap.

### Module 1 — Types (L1-L3)
- **L1** — `MARGIN_SCALE = 1e4` (bps) + `LiquidationParams` + `hyperliquid_default()` (10% / 2% / 1.5%). Why bps, why these defaults.
- **L2** — `MarginRatio` newtype + `MarginHealth` enum (`Safe` / `AtRisk` / `Liquidatable` / `Underwater`). Why four states, what each authorizes.
- **L3** — `AccountSnapshot` + `CloseOrderSpec`. Why a new snapshot type (not `funding::Position`), and how the bridge layer assembles it.

### Module 2 — Pure compute (L4-L7) — Stage 10a
- **L4** — `notional_value` + `unrealized_pnl`. The signed-multiplication trick that gets the sign right for both longs and shorts.
- **L5** — `account_equity` + `margin_ratio`. The proptest that uncovers the **non-monotonic edge case** when collateral dominates notional, and why `prop_assume!` is the right fix.
- **L6** — `margin_health` classification. Strict-less-than at every boundary and what that buys you.
- **L7** — `close_order_spec`. The market-order discipline: liquidation takes any available price. Stage 10a complete.

### Module 3 — Insurance fund (L8-L10) — Stage 10b
- **L8** — `InsuranceFund` struct + `deposit` / `withdraw`. The single-balance state machine.
- **L9** — `absorb_deficit`: how an Underwater liquidation drains the fund.
- **L10** — `credit_fee`: liquidation fee flows from collateral into the fund. Composition test: a single liquidation can both credit a fee *and* absorb a deficit when the position is severely underwater.

### Module 4 — Scanner + Capstone (L11-L12) — Stage 10c
- **L11** — `LiquidationScanner`: iterate `&[AccountSnapshot]`, classify each, emit close orders for `Liquidatable` and `Underwater`, return insurance-fund deltas. The composition layer.
- **L12** — Capstone. Synthesis, bridge integration preview, market structure context: how on-chain CLOB liquidations differ from CEX liquidations and from ADL.

## SHA pinning per module

Every lesson cites the openhl commit it builds against. For this course, lessons span three commits across Stage 10a → 10c:

| Module | Lessons | openhl SHA |
|---|---|---|
| 0 | L0 | `22eedf9` (Stage 10a) |
| 1 | L1-L3 | `22eedf9` (Stage 10a) |
| 2 | L4-L7 | `22eedf9` (Stage 10a) |
| 3 | L8-L10 | *Stage 10b — TBD* |
| 4 | L11-L12 | *Stage 10c — TBD* |

The TBD rows update as Stage 10b and 10c ship. Until then, modules 3 and 4 are skeleton — the modules 1-2 content (the entire pure-compute side) is fully built against `22eedf9` and ready to take you through Stage 10a end-to-end.

## Prerequisites

To get the most from this course you should have:

- **Course 9 (openhl-funding)** in your head. You don't need to remember every lesson, but the fixed-point / saturating-arithmetic / pure-state-machine pattern from funding is the same pattern here. If funding was hard, this will be hard.
- **Course 7 (openhl-clob)** for `AccountId`, `Side`, `Qty`. We reuse these directly. You don't need the matching engine internals.
- **Familiarity with margin math at the basic level.** If you've ever seen "initial margin = 10%, maintenance = 2%" and not been confused, you're set. If you haven't, the perp recap above plus the Hyperliquid help center is enough.
- **No EVM, no precompile knowledge needed.** Liquidation is pure state-machine math, just like funding.

You do NOT need:
- A running openhl node — the crate has zero I/O.
- Experience with risk engines at exchanges — the model here is small.
- Quantitative finance background — basic algebra is enough.

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
git checkout 22eedf9
```

(Or use the same workspace and `git stash` between lookups. Either works.)

## Course style

Each lesson follows the build-along format established in courses 6-9:
- **Goal** — what passes / what's built by the end.
- **Recap** — where the previous lesson left off.
- **Plan** — the specific edits, numbered.
- **Predict** callouts (🛑 with "Before scrolling...") — questions before answers.
- **Anti-fluency** callouts (🛑 with common misconceptions named explicitly) — preempt the "couldn't we just...?" reflex.
- **Walk-through** — step-by-step code edits.
- **Test** — the `cargo test` command + expected output.
- **Design reflection** — 3-5 load-bearing decisions encoded in this lesson's code.
- **Answer key** — `git diff` against the openhl reference SHA.
- **Common questions** — 3-5 grounded answers.

Module 2 (pure compute) is more proof-heavy than code-heavy compared to the matching engine in course 7. **Plan to slow down at the edge cases** — the leveraged-regime non-monotonicity in L5 is where most readers' first mental model breaks. We rebuild it.

## Ready

Onward to L1, where we set up `MARGIN_SCALE` and the `LiquidationParams` struct that the network's risk parameters live in.

````

---

## Seed-file slot

L0 lands in Module 0 (Orientation) at sortOrder 0:

```typescript
{
  title: 'Build OpenHL Liquidation — perpetual position liquidation engine',
  slug: 'openhl-liquidation-orientation-en',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 15,
  xpReward: 50,
  content: `# Build OpenHL Liquidation — perpetual position liquidation engine\n\n...`
},
```

## SHA pinning discipline

L0 cites `22eedf9` (Stage 10a). The course title and orientation will update as 10b and 10c ship; the L0 lesson body never re-pins because orientation is stable across sub-stages.

## Style review notes (self-critique before paste)

- **The "in-consensus liquidations" section** is the load-bearing motivation paragraph. It explains *why* this course exists, separate from the build-along of how. Without it, the course reads as "more pure-compute exercises after funding" — with it, the reader knows the stakes (chain solvency under adversarial market moves).
- **The non-monotonic edge case** is teased in §"What you'll build" *and* in the Module 2 lesson map. That repetition is intentional — the edge case is the most pedagogically valuable surprise in Stage 10a, and L0 should plant it so the reader is primed by the time they meet it in L5.
- **The TBD rows in the SHA table** are honest scoping. The reader should know they're starting a course that isn't fully written yet — the alternative (hide it) violates the "honest scoping" discipline the consensus + clob courses set up.
- **The recap of funding** is short on purpose — readers who took course 9 don't need a long recap, readers who skipped it need to be told they should go back.
