# Building Perp DEX Primer — L2 draft (EN) — concept course

> DIY Perp track prerequisite. Concept-only, no Rust code.

## L2 — `perp-primer-margin-model-en`

**Title**: Margin model — collateral, leverage, equity, and the four states

**Duration**: 40 min · **XP**: 70

---

````markdown
# Margin model — collateral, leverage, equity, and the four states

## Goal

Concepts you'll grasp in this lesson:

- **The five quantities** that describe every perp position: collateral, position size, notional, unrealized PnL, equity. How each is computed, what each tells you, and which the venue actually tracks.
- **Initial vs maintenance margin** — the two thresholds the venue uses, and what each threshold authorizes the trader to do.
- **The four states of margin health** — Safe, AtRisk, Liquidatable, Underwater. Each one corresponds to a specific allowed/forced action by the engine.
- **Cross-margin vs isolated margin** — same math, different scope. Why Hyperliquid defaults to cross.
- **A concrete position from open to liquidation** — walk the same position through five mark prices and watch margin ratio degrade across the state boundaries.

After this lesson you can answer:

- "If I deposit $10k and open 5× leverage on BTC, what's my notional?"
- "What's the difference between being AtRisk and being Liquidatable?"
- "Why does Hyperliquid use 10% initial / 2% maintenance and not some other numbers?"

## Recap

L0 established what a perp is. L1 established how funding keeps mark anchored to index. Both treated the trader as a single entity holding "a position" — abstractly.

L2 zooms into that abstraction. What is "a position" *concretely*, in dollars and ratios? When is the venue allowed to force-close it? That's the margin model.

## The five quantities

A perp position is fully described by five numbers:

| Quantity | Formula | Meaning |
| :--- | :--- | :--- |
| `collateral` | (deposited by trader) | USDC the trader put up to back the position |
| `position_size` | (signed: + long, − short) | How many BTC the trader is long or short |
| `notional` | `\|position_size\| × mark` | Current dollar exposure at the mark price |
| `unrealized_pnl` | `(mark − entry) × position_size` | Profit/loss if closed at mark, *not yet realized* |
| `equity` | `collateral + unrealized_pnl` | The trader's current effective net worth at the venue |

The trader controls `collateral` (deposit/withdraw) and `position_size` (open/close trades). The venue computes the other three each block from mark price.

A worked example with concrete numbers:

```
collateral     = $10,000
position_size  = +0.5 BTC   (long)
entry          = $100,000
mark           = $100,000
notional       = 0.5 × 100,000 = $50,000
unrealized_pnl = (100,000 − 100,000) × 0.5 = $0
equity         = 10,000 + 0 = $10,000
```

Equity equals collateral at open because PnL is zero. As mark moves, equity moves with it.

## Leverage

**Leverage** is the multiplier between collateral and notional:

```
leverage = notional / collateral
```

At our example position: `leverage = 50,000 / 10,000 = 5×`. The trader has 5× exposure to BTC for every dollar of collateral.

Leverage is informational. The engine doesn't enforce a "leverage limit" directly — it enforces *margin ratio* thresholds (next section), which translate to effective leverage caps but more flexibly.

## The two thresholds: initial vs maintenance margin

**Initial margin** is the ratio the trader must have to *open or increase* a position. Hyperliquid sets this at ~10%, so the max leverage at open is roughly 10×.

**Maintenance margin** is the ratio the trader must have to *continue holding* a position. Below this, the engine force-closes. Hyperliquid sets it at ~2% (varies by tier — large positions have higher maintenance).

The two thresholds are different on purpose:

- Initial > maintenance: a trader who barely passes initial margin has room to take a small adverse mark move before they hit liquidation
- Without the gap, every position opened at the limit would liquidate immediately on any unfavorable tick
- The gap is the *buffer* the venue gives traders to make decisions (add collateral, partial-close, etc.) before forced liquidation
- **It's also a defense line for the system itself.** Maintenance isn't a "you die instantly" line — the gap buys the liquidation engine **enough slippage room + startup latency** to submit force-close orders into the market and have them fill. The L3 force-close flow burns through this room as its budget — the thinner the room, the more the insurance fund has to absorb the shortfall.
- **Why this is non-negotiable (Initial = Maintenance counterexample)**: if initial and maintenance were both 2%, a position opened at 2.01% would become Liquidatable after a tiny adverse tick. In fast markets, the account can cross from maintenance breach to negative equity during the short delay before force-close fills. **So the initial/maintenance gap is not only trader UX buffer; it is the system's slippage cushion for preserving venue-wide solvency.**

**Margin ratio** is the central quantity:

```
margin_ratio = equity / notional
```

At our example position: `margin_ratio = 10,000 / 50,000 = 20% = 2,000 bps`.

20% is well above Hyperliquid's 10% initial and 2% maintenance. The position is **Safe**.

## The four states

The engine classifies each non-flat position into one of four states based on its margin ratio:

| State | Condition | Engine's action |
| :--- | :--- | :--- |
| **Safe** | `ratio ≥ initial_margin_bps` (≥ 10%) | Allow trader to open/increase positions |
| **AtRisk** | `ratio ∈ [maintenance, initial)` (2% ≤ x < 10%) | Allow holding; prohibit new risk |
| **Liquidatable** | `ratio < maintenance, equity ≥ 0` (< 2% but not underwater) | Force-close at market; remaining collateral returned |
| **Underwater** | `equity < 0` (loss exceeds collateral) | Force-close + insurance fund absorbs deficit (L3 topic) |

The Liquidatable / Underwater distinction matters because it determines *who covers the residual*. In Liquidatable, the trader's remaining collateral covers the close + fee. In Underwater, the close still happens but the venue's insurance fund covers what the trader can't.

This is the four-state classification the Build OpenHL — Liquidation course implements as the `MarginHealth` enum. Same four states, same boundary conditions.

### The four states on one axis

Lay `margin_ratio` out as a single number line from high to low, and the four states map to four adjacent intervals:

```
   high ◄────────────── margin_ratio = equity / notional ────────────► low / negative
        20%             10%                   2%                0%
   ─────┼──────────────┼─────────────────────┼─────────────────┼─────────►
        │              │                     │                 │
        │  ┌────────┐  │   ┌──────────┐      │ ┌────────────┐  │ ┌──────────┐
        │  │  Safe  │  │   │  AtRisk  │      │ │Liquidatable│  │ │Underwater│
        │  │        │  │   │          │      │ │            │  │ │          │
        │  │ open + │  │   │ hold     │      │ │ engine     │  │ │ engine   │
        │  │  add   │  │   │ only, no │      │ │ force-     │  │ │ close +  │
        │  │ allowed│  │   │ new risk │      │ │ closes     │  │ │ insurance│
        │  └────────┘  │   └──────────┘      │ └────────────┘  │ │   fund   │
        │              ▲                     ▲                 ▲ └──────────┘
        │     initial margin (10%)   maintenance margin (2%)  equity = 0
        │              │                     │                 │
        │   ratio ≥    │  maintenance ≤      │  0 ≤ ratio <    │  equity < 0
        │   initial    │  ratio < initial    │  maintenance    │  (notional still > 0)
        │              │                     │                 │
        │  branch:     │  branch:            │  branch:        │  branch:
        │  if ratio    │  else if ratio      │  else if equity │  else
        │   ≥ initial  │   ≥ maintenance     │   ≥ 0           │   { Underwater }
        │   {Safe}     │   {AtRisk}          │   {Liquidatable}│
        │                                                      │
        └─ Numbers in the example below ($10k coll, 0.5 BTC long, entry $100k) ──┐
                                                                                  │
              Safe → AtRisk        boundary: mark = $88,889  (−11.1% from entry)  │
              AtRisk → Liquidatable boundary: mark = $81,633  (−18.4% from entry) │
              Liquidatable → Underwater boundary: mark = $80,000  (−20.0%)        │
                                                                                  │
        ───────────────────────────────────────────────────────────────────────────┘
```

This is the picture: the `MarginHealth` decision reduces to **a 4-interval classification on a single scalar** (margin_ratio, plus the sign of equity). L3 walks through what the engine actually does in each interval — `Safe` and `AtRisk` do nothing (the trader is in control), `Liquidatable` triggers a market force-close, `Underwater` adds an insurance-fund draw on top. **Each code branch maps 1-to-1 to one interval on the number line** — which is why `match MarginHealth { Safe => …, AtRisk => …, Liquidatable => …, Underwater => … }` reads so cleanly in Rust.

## Worked example — same position, five mark prices

Trader: $10k collateral, 0.5 BTC long, entry $100,000. Hyperliquid params (initial 10%, maintenance 2%).

| Mark | Notional | PnL | Equity | Ratio | State |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **$100,000** | $50,000 | $0 | $10,000 | **20.0%** | Safe (initial state) |
| **$95,000** | $47,500 | −$2,500 | $7,500 | **15.8%** | Safe |
| **$88,889** | $44,444 | −$5,556 | $4,444 | **10.0%** | **Safe ↔ AtRisk boundary (exact)** |
| **$85,000** | $42,500 | −$7,500 | $2,500 | **5.9%** | AtRisk |
| **$82,000** | $41,000 | −$9,000 | $1,000 | **2.4%** | AtRisk (barely) |
| **$81,633** | $40,816 | −$9,184 | $816 | **2.0%** | **AtRisk ↔ Liquidatable boundary (exact)** |
| **$81,500** | $40,750 | −$9,250 | $750 | **1.8%** | Liquidatable |
| **$80,000** | $40,000 | −$10,000 | $0 | **0.0%** | Liquidatable (zero equity — next tick risks Underwater) |
| **$78,000** | $39,000 | −$11,000 | −$1,000 | **−2.6%** | **Underwater** |

Two boundary crossings to notice:

1. **Safe → AtRisk (boundary at mark $88,889, −11.1% from entry)**: between the $95,000 and $85,000 rows. Below $88,889 the trader can still hold but can no longer add to the position or open new ones. The UI typically warns the user at this point.
2. **AtRisk → Liquidatable (boundary at mark $81,633, −18.4% from entry)**: between the $82,000 and $81,500 rows. Below $81,633 the engine triggers force-close. Below maintenance, the trader's collateral can no longer cover the trade plus liquidation fee.

In the same example, mark would need to drop only **about 18.4% from entry** ($81,633 / $100,000) to hit Liquidatable. That's the inverse of leverage: at 5× leverage (notional/equity = $50k/$10k), an 18.4% adverse move (≈ 1/5 × maintenance gap) cleans out the position. At 10× leverage, it would be ~9%. At 50× leverage, ~1.8% (a routine intraday move).

**Leverage at the engine is risk-symmetric**: high leverage = high upside on favorable moves, *but a small adverse move is enough to liquidate*. The math doesn't favor either side; the trader chose the risk profile when they opened the position.

## Cross-margin vs isolated margin

So far we've talked as if a trader holds one position. In practice, a trader can hold many simultaneously (BTC, ETH, HYPE, SOL, ...). The venue has two ways to share collateral across positions:

**Cross-margin** (Hyperliquid default): all positions share a single collateral pool. Margin ratio is computed against the *sum* of notionals using the *total* equity. A profitable BTC long can buffer a losing ETH short. Simpler for the trader, simpler for the engine.

**Isolated margin** (Hyperliquid optional, per-asset toggle): each position has its own dedicated collateral subset. A losing position can liquidate without affecting other positions. Useful for "high-conviction bets" the trader doesn't want to risk in case of an unrelated loss elsewhere.

The math is the same — `margin_ratio = equity / notional` — only the *scope* differs. Cross uses total; isolated uses per-position.

Hyperliquid defaults to cross because most traders want the buffering. Isolated is opt-in.

## Hyperliquid specifics

- **Initial margin tiers**: Hyperliquid actually uses tiered initial margin. The "~10%" baseline applies to small positions. As position size grows past per-asset thresholds, initial margin requirements scale up (large BTC positions might require 20% or 30%). This caps systemic exposure to a single trader.
- **Maintenance margin tiers**: same idea — maintenance is higher for larger positions. The DIY Perp track simplifies to flat thresholds for pedagogical clarity, but production deployments are tiered.
- **Cross-margin default**: traders deposit USDC once and trade any market.
- **Margin calculation is in-consensus**: every validator computes the same margin ratio from the same snapshot. This is the determinism property that L1 of the Build OpenHL — Liquidation course teaches.

## Common misconceptions

**"Liquidation happens when my position drops to zero."** No — liquidation happens at the maintenance threshold, which is *above* zero equity. The buffer between maintenance and zero (~2% of notional) covers the liquidation fee and slippage on the close order. If liquidation waited until zero, the trader's residual would already be insufficient to pay the fee.

**"Higher leverage = higher profits."** Higher leverage = larger *position size* per unit of collateral. The percentage returns on collateral are larger, both on gains and losses. The expected value doesn't change just because of leverage — only the variance.

**"Cross-margin is always better than isolated."** Wrong. Cross is better if all your positions are correlated favorably (e.g., a portfolio of longs). Cross is *worse* if one position blows up disproportionately — it can liquidate the entire portfolio. Isolated quarantines that risk. Choosing cross vs isolated is a real risk-management decision, not a default.

## Next lesson (L3)

L3 — **Liquidation, insurance fund, and ADL**. We've classified states. Now we walk through what *actually happens* when a position crosses into Liquidatable or Underwater. The engine submits a close order, the matching engine settles it, fees flow into the insurance fund, deficits drain it, and (rarely) ADL kicks in when the insurance fund is depleted.

After L3, you'll have a complete model of perp mechanics — and the Build OpenHL — Liquidation course's L4-L7 (margin math + classification + close order generation) will read as the Rust implementation of what you already understand.

````
