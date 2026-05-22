# Building Perp DEX Primer — L1 draft (EN) — concept course

> DIY Perp track prerequisite. Concept-only, no Rust code.

## L1 — `perp-primer-mark-index-funding-en`

**Title**: Mark, index, and funding — how perps stay anchored without expiry

**Duration**: 35 min · **XP**: 60

---

````markdown
# Mark, index, and funding — how perps stay anchored without expiry

## Goal

Concepts you'll grasp in this lesson:

- **Mark vs index** — two different prices for the same underlying asset, computed differently, used differently, and the source of the entire funding mechanism.
- **The premium formula** `(mark − index) / index` — a signed fraction that captures how far the perp has drifted from its anchor.
- **From premium to funding rate** — why we divide by a `divisor` (smaller per-interval rate, paid more often), and why we `cap` the result (bounded worst-case payments).
- **Who pays whom, and why** — the sign of the rate determines the direction, and the *economic incentive* is what actually pulls mark back toward index.
- **Hyperliquid's actual parameters** — interval 1 hour, divisor 8, cap ±4%. Worked numerical examples at these values.

After this lesson you can answer:

- "Why does my long position pay funding when mark is above index?"
- "What happens to funding when mark and index match exactly?"
- "If the premium is 1%, what's the per-hour funding rate at Hyperliquid?"

## Recap

L0 set up the problem: perps have no expiry, so traditional futures' built-in convergence force doesn't apply. Something else has to keep the perp's price tracking the underlying.

L1 introduces that something else.

## Two prices, two markets

**Mark price** is what the perpetual venue says BTC costs right now. It's set by orderbook supply and demand on the perp itself — last fill, mid of bid/ask, or a smoothed average over recent fills, depending on the venue. The mark price moves whenever someone hits a bid or lifts an ask on the perp orderbook.

**Index price** is what BTC costs in the underlying spot markets. It's a composite — typically a weighted average of spot prices from major exchanges (Binance, Coinbase, Kraken, ...) with outlier filtering. The index price moves slowly relative to the perp orderbook because spot volume is much larger.

In normal markets, mark and index track each other closely — a basis point or two of drift, no more. Under stress, they diverge:

- **Squeeze**: shorts forced to buy back → mark spikes 5%, 10% above index briefly
- **Crash**: longs forced to sell → mark drops below index
- **Persistent bias**: a retail-heavy venue in a bull market sees mark consistently above index for hours

Without a corrective force, those divergences would persist. Funding is that force.

## The premium

The **premium** is how far mark has drifted from index, as a signed fraction:

```
premium = (mark − index) / index
```

A few worked values at BTC ≈ $100k:

| Mark | Index | Premium | Reading |
| :--- | :--- | :--- | :--- |
| $100,000 | $100,000 | 0% | No drift — funding will be zero |
| $100,500 | $100,000 | +0.5% | Mark slightly above — longs will pay |
| $99,500 | $100,000 | −0.5% | Mark slightly below — shorts will pay |
| $105,000 | $100,000 | +5% | Significant squeeze; funding will hit the cap |

The sign matters: positive means mark above index (longs are "overpaying"), negative means mark below (shorts are "overpaying"). Funding flows in the opposite direction of the imbalance.

## From premium to funding rate

The premium is the *gap*. The funding rate is the *per-interval fee* applied to convert that gap into actual payments. Three knobs:

```
rate_per_interval = clamp(premium / divisor, ±rate_cap)
```

- **`divisor`** spreads the convergence force over multiple intervals. Hyperliquid uses **8**: at a 1% premium, each hourly rate is 0.125%. Across 24 hours that's 3% per day of pressure applied as small increments rather than one big payment.
- **`rate_cap`** bounds the worst-case fee. Hyperliquid sets it at **±4% per interval**. Without the cap, a 100% premium (mark double the index — pathological) would imply a 12.5% per-hour rate. The cap clips it at 4%.
- **`interval`** is how often the payment happens. Hyperliquid: **1 hour**. CEX perps vary (Binance is every 8 hours; dYdX hourly).

These three together produce the actual per-interval rate. At Hyperliquid's parameters with a 1% premium: `rate = clamp(0.01 / 8, ±0.04) = 0.00125 = 0.125%`.

## Who pays whom

Sign convention: **positive rate → longs pay shorts**. Negative rate → shorts pay longs.

Intuitively: the side that's contributing to the imbalance pays the side that's offsetting it. Longs drove mark above index → longs pay. Shorts drove mark below → shorts pay. The payment makes the offending side a bit less profitable to hold, which creates the economic incentive to exit (or to take the other side), which pulls mark back toward index.

The payment isn't paid by the venue. It moves directly between traders: the longs collectively transfer to the shorts collectively, scaled by each position's notional. Zero-sum at the venue level — Hyperliquid is just the bookkeeper.

> 💡 **Engineer's view — one signed-size equation collapses every branch:**
> In code, track each position's direction as a signed size (Long = `+size`, Short = `-size`). Every trader's balance update then collapses to one branch-free expression:
>
> ```
> collateral -= size_with_sign × mark × rate
> ```
>
> - `rate > 0` and `size > 0` (Long) → `collateral` decreases = long pays ✓
> - `rate > 0` and `size < 0` (Short) → double-negative makes `collateral` increase = short receives ✓
> - `rate < 0` wires the symmetric case through the same single expression
>
> If the matching engine stores each position as one signed `i64`/`i128` size, the funding tick becomes a branch-free linear scan. **Combining Rust's type system with a deliberate sign convention makes the state transition "symmetric by construction"** — for consensus determinism, eliminating this kind of branching is load-bearing.

## Worked example — Hyperliquid parameters

A trader holds **10 BTC long** on Hyperliquid. Current state:

- Mark price: $100,000
- Index price: $99,000
- Premium: (100,000 − 99,000) / 99,000 = +1.01%

Funding rate this interval:
```
rate = clamp(0.0101 / 8, ±0.04) = 0.00126 = 0.126% per hour
```

The trader's notional exposure:
```
notional = |size| × mark = 10 × $100,000 = $1,000,000
```

Funding payment this hour (long pays):
```
funding = notional × rate = $1,000,000 × 0.00126 = $1,260
```

Over 24 hours, with the same premium sustained, the long pays **$30,240 in funding** while holding the same 10 BTC of exposure. That's the price of holding a long when mark is consistently above index — the funding is essentially a "rent" for the lopsided exposure.

Symmetrically, every short on the venue receives a slice of that $1,260 (× hours), scaled by their notional.

## Why this actually anchors mark to index

The funding payment doesn't directly move mark. It moves *traders' balances*. The anchoring is indirect, via incentive:

1. Mark above index → longs bleed funding to shorts each hour
2. Long traders see the cost, reduce their position size or exit
3. Their selling pushes mark down on the orderbook
4. As mark approaches index, the premium shrinks → funding shrinks → the pressure eases
5. Equilibrium: mark stays close to index, with small oscillations and small funding payments

This is also why funding is *continuous* (every interval, small amounts) rather than *terminal* (one big payment at a fixed date). Traders adjust their behavior in response to the ongoing cost, not in anticipation of a future event.

### Mark / index / funding — the pull-back loop

The three actors compressed into one feedback loop:

```
       ┌────────────────────────────────────────────┐
       │  index price (CEX spot weighted feed)       │ ← true reference price (exogenous)
       └────────────────────┬───────────────────────┘
                            │
                            │ (mark − index) / index
                            ▼
       ┌────────────────────────────────────────────┐
       │  premium                                   │ ← how far apart they are
       │    ÷ 8 (divisor) → clamp(±4%) (cap)         │
       └────────────────────┬───────────────────────┘
                            │ = funding rate (per interval)
                            ▼
       ┌────────────────────────────────────────────┐
       │  funding payment (at each interval boundary)│ ← rate > 0 → long pays short
       │    = size_with_sign × mark × rate           │   rate < 0 → short pays long
       └────────────────────┬───────────────────────┘
                            │ the imbalanced side "pays rent"
                            ▼
       ┌────────────────────────────────────────────┐
       │  imbalanced side reduces or flips position │ ← economic incentive
       └────────────────────┬───────────────────────┘
                            │ selling (or buying) hits the orderbook
                            ▼
       ┌────────────────────────────────────────────┐
       │  mark price moves back toward index         │ ← pull-back pressure (endogenous)
       └────────────────────┬───────────────────────┘
                            │
                            └──► premium shrinks → funding shrinks → loop relaxes
                                 (equilibrium: mark ≈ index, small oscillations,
                                  small funding payments)
```

**The three actors in one line:**

- **index** = the true reference price (the anchor target)
- **mark** = the market price driven by orderbook supply/demand (the thing being anchored)
- **funding** = the control signal that pulls them back together *through incentive*

It's not "funding moves mark directly." It's "funding moves trader balances, traders move the orderbook, the orderbook moves mark" — a **three-step indirection** is what anchoring actually is. Where expiry-style futures force convergence at a single moment, perps replace that with a continuous control signal that nudges every interval.

## Hyperliquid specifics worth knowing

- **Index composition**: weighted from multiple CEX spot feeds. A deviation circuit breaker pauses the index if one feed is too far from the others — protects against single-venue spot manipulation.
- **Settlement at tick**: every funding interval, the engine iterates over non-flat positions and adjusts each trader's collateral balance by `position_size × mark × rate`. No batch payment — each position settles individually.
- **Saturating arithmetic**: the funding computation uses signed integers scaled by `RATE_SCALE = 1e9` (parts per billion). All multiplications use `i128` intermediates and saturate on overflow rather than wrapping. This is consensus-determinism discipline — every validator must compute the same rate from the same inputs.
- **No funding accrual between ticks (snapshot-based state machine)**: positions opened and closed mid-interval owe no funding. Hyperliquid's payment is decided purely by **whether you hold the position at the exact interval boundary** (e.g. on the hour) — the engine snapshots positions at that instant and applies `size × mark × rate` in one pass. Readers coming from dYdX-style continuous funding (time-integrated charging) should recalibrate: this is a discrete event-driven state machine where "did you hold at the snapshot tick?" matters far more than "for how long did you hold?" **When you design a bug-free state machine here, nail this boundary condition first.**

## Common misconceptions

**"Funding is paid to the exchange."** No — funding moves between traders directly. Hyperliquid doesn't earn from funding payments (it earns from trading fees + builder code commissions, which are separate).

**"A high funding rate means perps are expensive to hold."** Partially right. Holding *the lopsided side* is expensive. Holding the offsetting side actually earns. "Long-funding-rate trades" — strategically taking the receiving side when funding is high — are an entire category of yield strategy in crypto.

**"Funding always pulls mark back to index."** Eventually, yes. But during sustained imbalances (months of bull market with retail longs), funding can stay positive for a long time, transferring wealth from longs to shorts while mark stays above index. The mechanism creates *pressure*, not an instant correction.

## Next lesson (L2)

L2 — **Margin model**. We've established mark and funding. Now we tackle what it means for a trader to "be long 10 BTC with $10k collateral" — the leverage and margin math that determines who can hold a position and for how long. You'll see initial vs maintenance margin, cross vs isolated, and walk a concrete position from "Safe" through "AtRisk" toward "Liquidatable" as mark moves against it.

After L2, the Build OpenHL — Liquidation course's L1 — `MARGIN_SCALE` + `LiquidationParams` — will read as "implementing the parameters you already understand" instead of "what's a `LiquidationParams`?".

````
