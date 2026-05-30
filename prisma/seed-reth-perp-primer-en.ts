import { PrismaClient } from '@prisma/client';

export async function seedRethPerpPrimerEN(prisma: PrismaClient) {
  const tags = ['perp', 'hyperliquid', 'derivatives', 'funding', 'liquidation'];

  await prisma.course.create({
    data: {
      slug: 'perp-primer-en',
      title: 'Perp DEX Primer — the perpetual-futures mechanics behind the DIY Perp track',
      description:
        'The conceptual layer that the DIY Perp track (Build OpenHL courses) silently assumes — perp mechanics, in four lessons. No code, no openhl reference, just the perp vocabulary needed to read the subsequent Rust. Spot / futures / perp distinction, funding as the anchoring mechanism, margin model with four states, and the three-tier safety net (liquidation → insurance fund → ADL). After this primer, the Funding/Liquidation courses\' Rust reads as "the implementation of formulas you already understand".',
      difficulty: 'INTERMEDIATE',
      duration: 140,
      xpReward: 240,
      track: 'diy-perp',
      tags,
      isPublished: true,
      sortOrder: 500,
      locale: 'en',
      instructorName: 'RethLab',
      modules: {
        create: [
          {
            title: 'Perp Primer',
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: 'Lesson 0 — What perpetual futures are, and why they have no expiry',
                  slug: 'perp-primer-what-is-a-perp-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 30,
                  xpReward: 50,
                  content: `# Lesson 0 — What perpetual futures are, and why they have no expiry

## Question

The implementation lessons in the DIY Perp track pack six perp terms into fifteen characters: "premium = (mark − index) / index, divisor 8, cap ±4 %". To a Rust-infra engineer it looks like the math is the hard part. **The math is the easy part. The mechanics are the hard part.** What are perps, and why does a contract with no expiry still track the underlying?

## Principle (minimum model)

- **Three markets, three contracts.** Spot (own the asset, instant settlement) / traditional futures (expiry, converge to spot at expiry) / perp (no expiry, convergence is not built in).
- **"No expiry" is a real engineering problem.** Traditional futures get convergence for free at expiry. Perps drop that anchor → the price is set by orderbook supply/demand alone → 5–10 % divergence under squeezes, persistent premium in retail-heavy bull markets.
- **Funding payment is the fix (Lesson 1 detail).** When mark > index, longs pay shorts a small periodic fee proportional to the gap → economic incentive to close longs / open shorts → mark drifts back to index. **Funding plays for perps the role expiry plays for futures — convergence force, applied continuously instead of at one point.**
- **Where perps live.** CEX (Binance / OKX / Bybit / BitMEX — BitMEX invented the modern perp in 2016) / DEX on an existing L1 (dYdX / Drift / Aevo) / **DEX on a purpose-built L1 (Hyperliquid is the largest, $300 B+ /year)**.
- **Why Hyperliquid as the running example.** A purpose-built L1 lets you tune every layer (latency / gas / orderbook depth) for the perp UX. Currently closed-source (HyperBFT / HyperCore / HyperEVM). \`psyto/openhl\` is the open reference; the DIY Perp track teaches how to build it.
- **Hyperliquid parameters used throughout the primer.** Funding interval 1 hour / divisor 8 / cap ±4 % per interval / initial margin ~10 % / maintenance margin ~2 % / liquidation fee ~1.5 % notional / cross-margin default / insurance fund + ADL backstop.
- **Three common misreadings.** (1) "Perps = auto-rolling futures" — no, rolling has basis cost; perps use funding instead. (2) "Perps are riskier than spot" — at 1× leverage they're almost identical; the delta is just funding. (3) "Hyperliquid is an Ethereum smart contract" — no, it's an independent L1.

## Worked example + steps

# What perpetual futures are — and why they have no expiry

## Goal

Concepts you'll grasp in this lesson:

- **What a perpetual future actually is** — a derivative contract with no expiry date, no settlement event, and no convergence-to-spot mechanism baked into time. The whole shape of the rest of this primer follows from that one design choice.
- **Why "no expiry" was a real engineering problem** — and why solving it required inventing a new economic mechanism (which we cover in Lesson 1).
- **How perps differ from spot and from traditional futures** — three markets, three pricing dynamics, three sets of trader incentives.
- **Why Hyperliquid is the canonical example** for this course — closed-source today, the rethlab DIY Perp track teaches you to build the open equivalent.

After this lesson you can answer:

- "What's the difference between buying BTC and going long BTC perp?"
- "If perps have no expiry, what keeps their price from drifting away from the underlying?"
- "What is Hyperliquid, and why does it matter to a Rust EVM engineer?"

## Why this primer exists

The rethlab DIY Perp track teaches you to build an open-source Hyperliquid implementation from scratch — consensus substrate, CLOB matching engine, EVM precompiles, funding state machine, liquidation engine. Each course is byte-identical against the openhl reference codebase.

**But the code only makes sense if you understand what a perp is.** When the funding course says "premium = (mark − index) / index, divisor 8, cap ±4%", that's six pieces of perp jargon in fifteen characters. If you're a Rust engineer coming in from infra work, you'd be forgiven for thinking the math is the hard part. **The math is the easy part. The mechanism is the hard part.**

This primer is the four-lesson conceptual layer the DIY Perp track quietly assumed. No code and no openhl references — just the perp mechanics you need to make sense of the Rust later.

## Three markets, three contracts

Three ways to express a view on the price of BTC:

| Market | What you hold | Settlement | Example |
| :--- | :--- | :--- | :--- |
| **Spot** | The actual BTC | Instant — you own it | Buy 0.1 BTC on Coinbase. You now have 0.1 BTC. |
| **Traditional futures** | A contract to buy/sell BTC at a fixed price on a future date | At expiry — cash-settled (price difference) or physical delivery | CME December 2026 BTC future. You agree to buy at $100k on Dec 31. |
| **Perpetual future** | A contract that mimics BTC price exposure, with no expiry | Never — stays open until you close it (cash-settled) | Hyperliquid BTC-USD perp. You go 10× long, position stays open as long as you keep margin. |

Spot is the simplest. You own the asset; price moves are your gains and losses directly.

Traditional futures add **leverage** (you don't pay the full notional upfront) and **expiry** (the contract terminates on a fixed date, at which point its price converges to spot by arbitrage). Used in commodities since the 1800s — what we have today is centuries of refinement.

Perpetual futures keep the leverage from traditional futures but **drop the expiry**. That sounds innocuous. It is, in fact, the most consequential design choice in modern derivatives.

## Why no expiry was a real problem

Traditional futures have a built-in convergence mechanism: at expiry, the contract price *must* equal the spot price, or arbitrageurs eat the difference. The expiry is the anchor.

Take the expiry away and the anchor is gone. The perp's price is set by orderbook supply and demand on the perp venue. Nothing in the contract itself forces it to track spot.

So perps can drift. A lot.

- Speculative mania: more longs than shorts → mark price runs above index by 5%, 10%
- Panic: more shorts than longs → mark runs below index
- Lopsided positioning: a venue with mostly retail longs (e.g., during a bull market) sees persistent positive premium

Without a corrective mechanism, perps would just be "futures with extra steps" — and the steps would all be in the wrong direction. The contract claims to track BTC, but its price doesn't.

**The solution: funding payments.** This is Lesson 1's topic. The 30-second version: when mark drifts above index, longs pay shorts a small periodic fee proportional to the gap. The fee is the economic incentive that pulls mark back. Symmetrically when mark drifts below.

Funding is to perps what expiry is to traditional futures — the convergence force, just implemented continuously instead of at a single point. **That's the entire innovation.**

## Where perps live today

| Venue type | Examples | Notes |
| :--- | :--- | :--- |
| **CEX** (centralized) | Binance, OKX, Bybit, BitMEX | BitMEX invented the modern perp in 2016. Binance has the most volume globally. |
| **DEX on existing L1s** | dYdX (Cosmos), Drift (Solana), Aevo (Optimism rollup) | Composable, on-chain, but inherit latency and gas of the host chain. |
| **DEX on custom L1s** | **Hyperliquid**, Aevo, Vertex | Purpose-built L1s optimized for perp UX. Hyperliquid is the largest by volume. |

The DEX-on-custom-L1 category is the most interesting from a Rust engineer's perspective. Building a perp DEX as an app on Ethereum L1 is slow and expensive; building it as a roll-up trades centralization for speed; **building it as a purpose-built L1 lets you tune every layer for perp UX.** That's what Hyperliquid did, and that's what the DIY Perp track teaches you to do.

## Why Hyperliquid is the example

Hyperliquid is the largest perpetual DEX by volume, processing over **$300B in 2025**. Its stack is fully closed-source: HyperBFT consensus, HyperCore matching engine, HyperEVM execution. There is no public Rust reference for engineers who want to read how an L1 like that actually works.

\`psyto/openhl\` is the open-source reference implementation. The rethlab DIY Perp track teaches you to build it. After this primer, you'll know enough perp domain to follow the code.

A short list of Hyperliquid-specific design choices worth remembering as you go through the rest of the primer:

- **Funding interval**: 1 hour (Lesson 1 covers this)
- **Funding rate divisor**: 8 (Lesson 1)
- **Funding rate cap**: ±4% per interval (Lesson 1)
- **Initial margin**: ~10% (Lesson 2)
- **Maintenance margin**: ~2% (Lesson 2; varies by tier)
- **Liquidation fee**: ~1.5% of notional (Lesson 3)
- **Cross-margin by default** (Lesson 2)
- **Insurance fund** present, **ADL** as fallback (Lesson 3)

These numbers will reappear in every subsequent primer lesson and in every DIY Perp course's example calculations.

## Common misconceptions

**"A perp is just a futures contract that auto-rolls."** Close but wrong. Auto-rolling futures still has expiries; you just get a new contract each cycle. Each roll has a cost (basis spread). Perps have no rolls — the funding payment replaces the roll cost.

**"Perps are riskier than spot."** Wrong direction of risk-comparison. Perps add **leverage risk** (you can lose more than your collateral if you're underwater — though insurance funds usually cover this on regulated venues). Without leverage, a 1× perp position has roughly the same risk as spot, minus funding cost.

**"Hyperliquid is a smart contract on Ethereum."** No — Hyperliquid is its **own L1**. The whole point of building the DIY Perp track is that an app-chain optimized for perps beats a smart contract on a general-purpose L1 for the user experience perps need (sub-second latency, no gas, deep orderbook).

## Next lesson (Lesson 1)

Lesson 1 — **Mark, index, and funding**. We build the picture of how mark price stays anchored to the index when there's no expiry. You'll see the premium formula \`(mark − index) / index\`, the divisor that converts it to a per-interval rate, the cap that bounds worst-case payments, and worked numerical examples at Hyperliquid's actual parameter values.

After Lesson 1, the Build OpenHL — Funding course's Lesson 4 — \`compute_premium\` — will read as "implementing the formula you already understand" instead of "what is a premium?".

## Summary (3 lines)

- Perp = leveraged futures with no expiry. The single most consequential design choice in modern derivatives. No expiry → no built-in convergence → funding payment provides the convergence force, continuously instead of at a single point.
- Three venue types (CEX / DEX-on-L1 / DEX-on-purpose-built-L1). Hyperliquid is the largest purpose-built L1 perp DEX ($300 B+ /year), closed-source; \`psyto/openhl\` is the open reference.
- Internalise the parameter set (interval 1 h / divisor 8 / cap ±4 % / margins 10–2 % / liquidation fee 1.5 % / cross-margin / insurance + ADL) — Lessons 1–3 use them throughout.
`,
                },
                {
                  title: 'Lesson 1 — Mark, index, and funding — how perps stay anchored without expiry',
                  slug: 'perp-primer-mark-index-funding-en',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 35,
                  xpReward: 60,
                  content: `# Lesson 1 — Mark, index, and funding — how perps stay anchored without expiry

## Question

Lesson 0 set the problem: no expiry → no anchor → divergence persists → funding is the fix. **This lesson builds funding from the inside.** Two prices (mark / index), the premium formula \`(mark − index) / index\`, the divisor that turns it into a per-interval rate, the cap that bounds the worst case — worked through with Hyperliquid's real parameters (interval 1 h / divisor 8 / cap ±4 %).

## Principle (minimum model)

- **Mark and index are different things.** Mark = the perp venue's own orderbook supply/demand (last fill / mid / smoothing). Index = a weighted average of spot prices on real exchanges (Binance / Coinbase / Kraken, outlier-filtered). Spot volume >> perp, so the index moves slowly relative to the perp orderbook.
- **Premium formula.** \`premium = (mark − index) / index\` = the signed fractional gap. Positive when mark > index, negative when mark < index, zero on the anchor.
- **Premium → funding rate.** Per interval (Hyperliquid = 1 hour) \`funding_rate = clamp(premium / divisor, -cap, +cap)\` — divide the premium by the divisor (small rate, paid often) and clamp to the cap (worst-case bounded).
- **Hyperliquid's actual numbers.** Interval = 1 hour, divisor = 8, cap = ±4 % per interval. A 1 % premium → rate = 1 % / 8 = 0.125 % per hour.
- **Payment direction and amount.** \`payment = funding_rate × notional\`. Rate > 0 (mark > index) → longs pay shorts. Rate < 0 → shorts pay longs. Absolute size is \`notional × |rate|\`. **It is not a protocol fee — it is a transfer between traders.**
- **Economic incentive — not direct price action — pulls mark back.** Longs who keep paying funding have an incentive to close (or open shorts) → orderbook bids thin out, asks fatten → mark drifts down. Symmetric on the other side. **Funding doesn't move price; it changes what traders do, and that moves price.**
- **When does the cap bite?** When the premium exceeds \`divisor × cap\` (= 32 %). Beyond that, the rate is pinned at ±4 % per hour and a wider premium produces no extra payment.
- **Why 1-hour intervals?** Shorter (e.g. 5 min) = compute overhead + statistical noise. Longer (e.g. 24 h) = weak anchor. 1 hour is the trade-off Hyperliquid took.

## Worked example + steps

# Mark, index, and funding — how perps stay anchored without expiry

## Goal

Concepts you'll grasp in this lesson:

- **Mark vs index** — two different prices for the same underlying asset, computed differently, used differently, and the source of the entire funding mechanism.
- **The premium formula** \`(mark − index) / index\` — a signed fraction that captures how far the perp has drifted from its anchor.
- **From premium to funding rate** — why we divide by a \`divisor\` (smaller per-interval rate, paid more often), and why we \`cap\` the result (bounded worst-case payments).
- **Who pays whom, and why** — the sign of the rate determines the direction, and the *economic incentive* is what actually pulls mark back toward index.
- **Hyperliquid's actual parameters** — interval 1 hour, divisor 8, cap ±4%. Worked numerical examples at these values.

After this lesson you can answer:

- "Why does my long position pay funding when mark is above index?"
- "What happens to funding when mark and index match exactly?"
- "If the premium is 1%, what's the per-hour funding rate at Hyperliquid?"

## Recap

Lesson 0 set up the problem: perps have no expiry, so traditional futures' built-in convergence force doesn't apply. Something else has to keep the perp's price tracking the underlying.

Lesson 1 introduces that something else.

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

\`\`\`
premium = (mark − index) / index
\`\`\`

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

\`\`\`
rate_per_interval = clamp(premium / divisor, ±rate_cap)
\`\`\`

- **\`divisor\`** spreads the convergence force over multiple intervals. Hyperliquid uses **8**: at a 1% premium, each hourly rate is 0.125%. Across 24 hours that's 3% per day of pressure applied as small increments rather than one big payment.
- **\`rate_cap\`** bounds the worst-case fee. Hyperliquid sets it at **±4% per interval**. Without the cap, a 100% premium (mark double the index — pathological) would imply a 12.5% per-hour rate. The cap clips it at 4%.
- **\`interval\`** is how often the payment happens. Hyperliquid: **1 hour**. CEX perps vary (Binance is every 8 hours; dYdX hourly).

These three together produce the actual per-interval rate. At Hyperliquid's parameters with a 1% premium: \`rate = clamp(0.01 / 8, ±0.04) = 0.00125 = 0.125%\`.

## Who pays whom

Sign convention: **positive rate → longs pay shorts**. Negative rate → shorts pay longs.

Intuitively: the side that's contributing to the imbalance pays the side that's offsetting it. Longs drove mark above index → longs pay. Shorts drove mark below → shorts pay. The payment makes the offending side a bit less profitable to hold, which creates the economic incentive to exit (or to take the other side), which pulls mark back toward index.

The payment isn't paid by the venue. It moves directly between traders: the longs collectively transfer to the shorts collectively, scaled by each position's notional. Zero-sum at the venue level — Hyperliquid is the bookkeeper.

> 💡 **Engineer's view — one signed-size equation collapses every branch:**
> In code, track each position's direction as a signed size (Long = \`+size\`, Short = \`-size\`). Every trader's balance update then collapses to one branch-free expression:
>
> \`\`\`
> collateral -= size_with_sign × mark × rate
> \`\`\`
>
> - \`rate > 0\` and \`size > 0\` (Long) → \`collateral\` decreases = long pays ✓
> - \`rate > 0\` and \`size < 0\` (Short) → double-negative makes \`collateral\` increase = short receives ✓
> - \`rate < 0\` wires the symmetric case through the same single expression
>
> If the matching engine stores each position as one signed \`i64\`/\`i128\` size, the funding tick becomes a branch-free linear scan. **Combining Rust's type system with a deliberate sign convention makes the state transition "symmetric by construction"** — for consensus determinism, eliminating this kind of branching is load-bearing.

## Worked example — Hyperliquid parameters

A trader holds **10 BTC long** on Hyperliquid. Current state:

- Mark price: $100,000
- Index price: $99,000
- Premium: (100,000 − 99,000) / 99,000 = +1.01%

Funding rate this interval:
\`\`\`
rate = clamp(0.0101 / 8, ±0.04) = 0.00126 = 0.126% per hour
\`\`\`

The trader's notional exposure:
\`\`\`
notional = |size| × mark = 10 × $100,000 = $1,000,000
\`\`\`

Funding payment this hour (long pays):
\`\`\`
funding = notional × rate = $1,000,000 × 0.00126 = $1,260
\`\`\`

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

\`\`\`
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
\`\`\`

**The three actors in one line:**

- **index** = the true reference price (the anchor target)
- **mark** = the market price driven by orderbook supply/demand (the thing being anchored)
- **funding** = the control signal that pulls them back together *through incentive*

It's not "funding moves mark directly." It's "funding moves trader balances, traders move the orderbook, the orderbook moves mark" — a **three-step indirection** is what anchoring actually is. Where expiry-style futures force convergence at a single moment, perps replace that with a continuous control signal that nudges every interval.

## Hyperliquid specifics worth knowing

- **Index composition**: weighted from multiple CEX spot feeds. A deviation circuit breaker pauses the index if one feed is too far from the others — protects against single-venue spot manipulation.
- **Settlement at tick**: every funding interval, the engine iterates over non-flat positions and adjusts each trader's collateral balance by \`position_size × mark × rate\`. No batch payment — each position settles individually.
- **Saturating arithmetic**: the funding computation uses signed integers scaled by \`RATE_SCALE = 1e9\` (parts per billion). All multiplications use \`i128\` intermediates and saturate on overflow rather than wrapping. This is consensus-determinism discipline — every validator must compute the same rate from the same inputs.
- **No funding accrual between ticks (snapshot-based state machine)**: positions opened and closed mid-interval owe no funding. Hyperliquid's payment is decided purely by **whether you hold the position at the exact interval boundary** (e.g. on the hour) — the engine snapshots positions at that instant and applies \`size × mark × rate\` in one pass. Readers coming from dYdX-style continuous funding (time-integrated charging) should recalibrate: this is a discrete event-driven state machine where "did you hold at the snapshot tick?" matters far more than "for how long did you hold?" **When you design a bug-free state machine here, nail this boundary condition first.**
- **Architecture trade-off (Boundary Gaming)**: this model is implementation-clean and highly deterministic, but it introduces a visible game-theory edge case: a trader can open near \`HH:59\`, cross the hourly boundary, and close at \`HH:01\`, yet still pay/receive a full interval of funding. That creates incentives to open/close aggressively around boundaries, which can temporarily distort orderbook liquidity (wider spreads near the hour). **You are explicitly trading time-integration complexity for boundary-gaming market structure risk.**

## Common misconceptions

**"Funding is paid to the exchange."** No — funding moves between traders directly. Hyperliquid doesn't earn from funding payments (it earns from trading fees + builder code commissions, which are separate).

**"A high funding rate means perps are expensive to hold."** Partially right. Holding *the lopsided side* is expensive. Holding the offsetting side actually earns. "Long-funding-rate trades" — strategically taking the receiving side when funding is high — are an entire category of yield strategy in crypto.

**"Funding always pulls mark back to index."** Eventually, yes. But during sustained imbalances (months of bull market with retail longs), funding can stay positive for a long time, transferring wealth from longs to shorts while mark stays above index. The mechanism creates *pressure*, not an instant correction.

## Next lesson (Lesson 2)

Lesson 2 — **Margin model**. We've established mark and funding. Now we tackle what it means for a trader to "be long 10 BTC with $10k collateral" — the leverage and margin math that determines who can hold a position and for how long. You'll see initial vs maintenance margin, cross vs isolated, and walk a concrete position from "Safe" through "AtRisk" toward "Liquidatable" as mark moves against it.

After Lesson 2, the Build OpenHL — Liquidation course's Lesson 1 — \`MARGIN_SCALE\` + \`LiquidationParams\` — will read as "implementing the parameters you already understand" instead of "what's a \`LiquidationParams\`?".

## Summary (3 lines)

- Funding machinery: observe mark − index → compute premium → divide by divisor for a per-hour rate → clamp to the cap → settle as \`notional × rate\`. Hyperliquid uses interval 1 h, divisor 8, cap ±4 %.
- Payment is trader-to-trader (not a protocol fee). Rate > 0 means longs pay shorts. The mechanism works because traders change orderbook behaviour in response — funding moves traders, who then move the price.
- Next lesson defines what a "position" actually is — five quantities, four states, cross- vs isolated-margin. The Funding course in the Build track is the Rust implementation of these formulas.
`,
                },
                {
                  title: 'Lesson 2 — Margin model — collateral, leverage, equity, and the four states',
                  slug: 'perp-primer-margin-model-en',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 40,
                  xpReward: 70,
                  content: `# Lesson 2 — Margin model — collateral, leverage, equity, and the four states

## Question

Lessons 0 and 1 treated "a trader with a position" as an abstraction. **This lesson cashes that out.** What is a position, in dollars and ratios? When can the venue force-close it? That's the margin model.

## Principle (minimum model)

- **Five quantities that fully describe a position.** \`collateral\` (deposited USDC) / \`position_size\` (signed: + long, − short, in units of the underlying) / \`notional\` (|position_size| × mark = current dollar exposure) / \`unrealized_pnl\` ((mark − entry) × position_size = mark-to-close PnL, not realised yet) / \`equity\` (collateral + unrealized_pnl = the trader's real net worth on the venue).
- **Traders directly operate two of the five.** \`collateral\` (deposit/withdraw) and \`position_size\` (trade). The other three (notional / unrealized_pnl / equity) the venue computes from mark every block.
- **Initial margin and maintenance margin.** Initial = the collateral ratio required to open a position (Hyperliquid ~10 %, i.e. up to 10× leverage). Maintenance = the floor for an open position (Hyperliquid ~2 %, varies by tier). Falling below initial after open is fine; falling below maintenance triggers force-close.
- **Four states.** Safe (ratio ≥ initial) / AtRisk (initial > ratio ≥ maintenance — new trades blocked, shrinking and deposits OK) / Liquidatable (ratio < maintenance, equity ≥ 0 — venue force-closes) / Underwater (equity < 0 — losses exceed collateral, insurance fund absorbs the rest).
- **Each state corresponds to an engine action.** Safe = everything OK / AtRisk = block new trades / Liquidatable = engine fires force-close (Lesson 3) / Underwater = force-close + insurance fund covers shortfall.
- **Cross-margin vs isolated-margin.** Cross = the whole account's collateral backs every position (one position's gain offsets another's loss). Isolated = collateral is split per position (one liquidation, others unaffected). Hyperliquid defaults to cross (capital-efficient, suits sophisticated users); isolated is opt-in.
- **Funding lands on equity.** Every interval \`equity += -funding_payment\` (paid → goes down, received → goes up) → margin ratio shifts → may cross a state boundary. **Funding is not just a cost; it can also accelerate liquidation.**
- **Trace one position as mark falls.** Entry $100 k → mark $90 k (unrealised loss, near AtRisk) → mark $80 k (Liquidatable, force-close fires) → mark $70 k (Underwater, insurance fund absorbs). Four states, one trajectory.

## Worked example + steps

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

Lesson 0 established what a perp is. Lesson 1 established how funding keeps mark anchored to index. Both treated the trader as a single entity holding "a position" — abstractly.

Lesson 2 zooms into that abstraction. What is "a position" *concretely*, in dollars and ratios? When is the venue allowed to force-close it? That's the margin model.

## The five quantities

A perp position is fully described by five numbers:

| Quantity | Formula | Meaning |
| :--- | :--- | :--- |
| \`collateral\` | (deposited by trader) | USDC the trader put up to back the position |
| \`position_size\` | (signed: + long, − short) | How many BTC the trader is long or short |
| \`notional\` | \`\\|position_size\\| × mark\` | Current dollar exposure at the mark price |
| \`unrealized_pnl\` | \`(mark − entry) × position_size\` | Profit/loss if closed at mark, *not yet realized* |
| \`equity\` | \`collateral + unrealized_pnl\` | The trader's current effective net worth at the venue |

The trader controls \`collateral\` (deposit/withdraw) and \`position_size\` (open/close trades). The venue computes the other three each block from mark price.

A worked example with concrete numbers:

\`\`\`
collateral     = $10,000
position_size  = +0.5 BTC   (long)
entry          = $100,000
mark           = $100,000
notional       = 0.5 × 100,000 = $50,000
unrealized_pnl = (100,000 − 100,000) × 0.5 = $0
equity         = 10,000 + 0 = $10,000
\`\`\`

Equity equals collateral at open because PnL is zero. As mark moves, equity moves with it.

## Leverage

**Leverage** is the multiplier between collateral and notional:

\`\`\`
leverage = notional / collateral
\`\`\`

At our example position: \`leverage = 50,000 / 10,000 = 5×\`. The trader has 5× exposure to BTC for every dollar of collateral.

Leverage is informational. The engine doesn't enforce a "leverage limit" directly — it enforces *margin ratio* thresholds (next section), which translate to effective leverage caps but more flexibly.

## The two thresholds: initial vs maintenance margin

**Initial margin** is the ratio the trader must have to *open or increase* a position. Hyperliquid sets this at ~10%, so the max leverage at open is roughly 10×.

**Maintenance margin** is the ratio the trader must have to *continue holding* a position. Below this, the engine force-closes. Hyperliquid sets it at ~2% (varies by tier — large positions have higher maintenance).

The two thresholds are different on purpose:

- Initial > maintenance: a trader who barely passes initial margin has room to take a small adverse mark move before they hit liquidation
- Without the gap, every position opened at the limit would liquidate immediately on any unfavorable tick
- The gap is the *buffer* the venue gives traders to make decisions (add collateral, partial-close, etc.) before forced liquidation
- **It's also a defense line for the system itself.** Maintenance isn't a "you die instantly" line — the gap buys the liquidation engine **enough slippage room + startup latency** to submit force-close orders into the market and have them fill. The Lesson 3 force-close flow burns through this room as its budget — the thinner the room, the more the insurance fund has to absorb the shortfall.
- **Why this is non-negotiable (Initial = Maintenance counterexample)**: if initial and maintenance were both 2%, a position opened at 2.01% would become Liquidatable after a tiny adverse tick. In fast markets, the account can cross from maintenance breach to negative equity during the short delay before force-close fills. **So the initial/maintenance gap is not only trader UX buffer; it is the system's slippage cushion for preserving venue-wide solvency.**

**Margin ratio** is the central quantity:

\`\`\`
margin_ratio = equity / notional
\`\`\`

At our example position: \`margin_ratio = 10,000 / 50,000 = 20% = 2,000 bps\`.

20% is well above Hyperliquid's 10% initial and 2% maintenance. The position is **Safe**.

## The four states

The engine classifies each non-flat position into one of four states based on its margin ratio:

| State | Condition | Engine's action |
| :--- | :--- | :--- |
| **Safe** | \`ratio ≥ initial_margin_bps\` (≥ 10%) | Allow trader to open/increase positions |
| **AtRisk** | \`ratio ∈ [maintenance, initial)\` (2% ≤ x < 10%) | Allow holding; prohibit new risk |
| **Liquidatable** | \`ratio < maintenance, equity ≥ 0\` (< 2% but not underwater) | Force-close at market; remaining collateral returned |
| **Underwater** | \`equity < 0\` (loss exceeds collateral) | Force-close + insurance fund absorbs deficit (Lesson 3 topic) |

The Liquidatable / Underwater distinction matters because it determines *who covers the residual*. In Liquidatable, the trader's remaining collateral covers the close + fee. In Underwater, the close still happens but the venue's insurance fund covers what the trader can't.

This is the four-state classification the Build OpenHL — Liquidation course implements as the \`MarginHealth\` enum. Same four states, same boundary conditions.

### The four states on one axis

Lay \`margin_ratio\` out as a single number line from high to low, and the four states map to four adjacent intervals:

\`\`\`
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
\`\`\`

This is the picture: the \`MarginHealth\` decision reduces to **a 4-interval classification on a single scalar** (margin_ratio, plus the sign of equity). Lesson 3 walks through what the engine actually does in each interval — \`Safe\` and \`AtRisk\` do nothing (the trader is in control), \`Liquidatable\` triggers a market force-close, \`Underwater\` adds an insurance-fund draw on top. **Each code branch maps 1-to-1 to one interval on the number line** — which is why \`match MarginHealth { Safe => …, AtRisk => …, Liquidatable => …, Underwater => … }\` reads so cleanly in Rust.

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

The math is the same — \`margin_ratio = equity / notional\` — only the *scope* differs. Cross uses total; isolated uses per-position.

Hyperliquid defaults to cross because most traders want the buffering. Isolated is opt-in.

## Hyperliquid specifics

- **Initial margin tiers**: Hyperliquid actually uses tiered initial margin. The "~10%" baseline applies to small positions. As position size grows past per-asset thresholds, initial margin requirements scale up (large BTC positions might require 20% or 30%). This caps systemic exposure to a single trader.
- **Maintenance margin tiers**: same idea — maintenance is higher for larger positions. The DIY Perp track simplifies to flat thresholds for pedagogical clarity, but production deployments are tiered.
- **Cross-margin default**: traders deposit USDC once and trade any market.
- **Margin calculation is in-consensus**: every validator computes the same margin ratio from the same snapshot. This is the determinism property that Lesson 1 of the Build OpenHL — Liquidation course teaches.

## Common misconceptions

**"Liquidation happens when my position drops to zero."** No — liquidation happens at the maintenance threshold, which is *above* zero equity. The buffer between maintenance and zero (~2% of notional) covers the liquidation fee and slippage on the close order. If liquidation waited until zero, the trader's residual would already be insufficient to pay the fee.

**"Higher leverage = higher profits."** Higher leverage = larger *position size* per unit of collateral. The percentage returns on collateral are larger, both on gains and losses. The expected value doesn't change just because of leverage — only the variance.

**"Cross-margin is always better than isolated."** Wrong. Cross is better if all your positions are correlated favorably (e.g., a portfolio of longs). Cross is *worse* if one position blows up disproportionately — it can liquidate the entire portfolio. Isolated quarantines that risk. Choosing cross vs isolated is a real risk-management decision, not a default.

## Next lesson (Lesson 3)

Lesson 3 — **Liquidation, insurance fund, and ADL**. We've classified states. Now we walk through what *actually happens* when a position crosses into Liquidatable or Underwater. The engine submits a close order, the matching engine settles it, fees flow into the insurance fund, deficits drain it, and (rarely) ADL kicks in when the insurance fund is depleted.

After Lesson 3, you'll have a complete model of perp mechanics — and the Build OpenHL — Liquidation course's Lessons 4–7 (margin math + classification + close order generation) will read as the Rust implementation of what you already understand.

## Summary (3 lines)

- Margin model = five quantities + two thresholds (initial ~10 %, maintenance ~2 %) + four states (Safe / AtRisk / Liquidatable / Underwater).
- Cross-margin default (Hyperliquid) shares collateral across positions; isolated is opt-in. Funding lands on equity each interval and can push a position over a state boundary.
- Next lesson follows the AtRisk → Liquidatable → Underwater transitions in detail — what force-close does, how the insurance fund absorbs shortfalls, and when ADL kicks in. The Liquidation course implements this state machine in Rust.
`,
                },
                {
                  title: 'Lesson 3 — Liquidation, insurance fund, and ADL — the safety net mechanics',
                  slug: 'perp-primer-liquidation-insurance-adl-en',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 35,
                  xpReward: 60,
                  content: `# Lesson 3 — Liquidation, insurance fund, and ADL — the safety net mechanics

## Question

Lesson 2 named four states (Safe / AtRisk / Liquidatable / Underwater). **This lesson follows what actually happens at the boundaries** — what fires on AtRisk → Liquidatable, how the insurance fund absorbs the shortfall when equity goes negative, what ADL does when the insurance fund is exhausted, and why ADL is controversial.

## Principle (minimum model)

- **Trigger.** Every block, the engine evaluates margin_ratio for all non-flat accounts. \`margin_ratio < maintenance_margin_bps\` and \`equity ≥ 0\` → **Liquidatable**. \`equity < 0\` → **Underwater**. No human in the loop, no second chance, every validator on the same data.
- **Force-close mechanics.** The engine generates a close-order spec with three fields (\`side\` = opposite of the position, \`qty\` = \`|size|\` full-size, \`type\` = MARKET) → routes it onto the normal orderbook → counterparties on the other side fill it.
- **Liquidation fee.** ~1.5 % of close notional (Hyperliquid) — paid into the insurance fund. **Not a protocol fee — rent for the risk the protocol is absorbing.**
- **Solvent close vs underwater close.** Solvent (equity ≥ close cost + fee) → remaining collateral goes back to the trader. Underwater (equity < close cost + fee) → the **insurance fund absorbs the shortfall**; the trader's liability stops at zero.
- **Insurance fund.** Grows from liquidation fees on solvent closes, shrinks when it covers underwater closes. A protocol-owned buffer that keeps losses from spilling onto other traders.
- **ADL (Auto-Deleveraging) is the last resort.** If the insurance fund is empty and a position is underwater, the engine **takes a position from the most profitable trader on the opposite side** to offset the loss. The profitable trader "loses" the profit — even though they did nothing wrong. Controversial; mitigated by keeping the insurance fund well-funded.
- **Why ADL is controversial.** (1) Unrelated traders lose profit (counterparty risk is socialised). (2) Unpredictable (you can't know in advance who gets ADL'd). (3) Caps the winning trade (the upside is bounded by ADL).
- **Three-tier safety net.** Liquidation fee → insurance fund (normal losses) → ADL (extreme market collapse). A well-funded insurance fund means ADL never fires — that's the whole point of "the fee is rent".

## Worked example + steps

# Liquidation, insurance fund, and ADL — the safety net mechanics

## Goal

Concepts you'll grasp in this lesson:

- **What "force-close" actually means** — the engine generates a market order on the opposite side of the position, full size, and routes it through the same orderbook trades take.
- **The liquidation fee and where it goes** — a percentage of the closed notional flows to the insurance fund as a "rent" for the protocol's risk-bearing service.
- **Solvent close vs underwater close** — when the trader's equity covers the close (Liquidatable), the residual returns to them; when it doesn't (Underwater), the insurance fund eats the deficit.
- **Why an insurance fund needs to exist** — and how it accumulates from solvent closes and drains on underwater ones.
- **ADL (Auto-Deleveraging)** — the venue's last resort when insurance fund is depleted, and why it's controversial.

After this lesson you can answer:

- "When my position gets liquidated, where does my remaining collateral go?"
- "What's the insurance fund, and who funds it?"
- "If the insurance fund runs out, what happens to underwater positions?"

## Recap

Lesson 0 established what perps are. Lesson 1 made mark anchor to index via funding. Lesson 2 classified positions into the four states. Lesson 3 walks through what *actually happens* at the boundary between AtRisk and Liquidatable, and between Liquidatable and Underwater.

This is the lesson where the perp model becomes load-bearing for the entire chain: every other trader's safety depends on liquidation working correctly.

## The trigger

Recap from Lesson 2: an account is **Liquidatable** when \`margin_ratio < maintenance_margin_bps\` AND \`equity ≥ 0\`. **Underwater** when \`equity < 0\` (PnL has exceeded collateral).

The engine evaluates margin ratio every block for every non-flat account. The moment an account crosses below the maintenance threshold, the engine fires the liquidation pipeline for that account in the current block. No human in the loop, no waiting, no second chances — every validator, every block, on the same data.

## The force-close mechanism

When the engine decides to liquidate, it generates a **close order spec** with three fields:

| Field | Value |
| :--- | :--- |
| \`side\` | Opposite of the position direction (long → SELL, short → BUY) |
| \`qty\` | Full absolute position size (\`\\|size\\|\`) |
| \`account\` | The liquidated trader's account ID |

There is no price field — it is always a **market order**. The engine doesn't pick prices; it accepts whatever the orderbook offers right now. The matching engine settles the close against resting liquidity (other traders' limit orders).

This is mechanically the same as a normal trade. The trader's position closes. The counterparty (whoever's resting order fills the close) opens or increases their position. Mark moves to reflect the new top-of-book.

> 💡 **Sidebar: how this differs from a trader-placed stop-loss**
>
> Behaviorally they look similar — when a trigger condition fires, a market order goes out. But the system boundary is in completely different places:
>
> | | Stop-loss (market stop order) | Force-close (liquidation) |
> | :--- | :--- | :--- |
> | Who places it | The trader (client-side) | The state machine all validators agreed on |
> | How it reaches the book | RPC → mempool → block → matching engine | Injected directly into the orderbook from inside \`block_execute\` |
> | Failure modes | Can fail on signature / nonce / gas / RPC outage | Cannot structurally fail — the consensus itself emits the order |
> | Cancelable | Yes, by the trader | No — once the state machine decides to fire, it fills |
>
> Retail-facing copy sometimes describes liquidation as "an automatic stop-loss when margin runs out," but from the engine's point of view they're not the same thing at all. **Force-close is a *privileged order*** — an order written into the orderbook by the engine itself, on a code path no external caller can reach. The \`Liquidatable\` arm of the \`MarginHealth\` enum from Lesson 2 is exactly the trigger for that privileged emission.

A worked example:

\`\`\`
Trader's position before liquidation:
  side:           LONG
  size:           1 BTC
  entry:          $100,000
  collateral:     $10,000
  mark at close:  $80,500   (just dropped from $81,000 — crossed maintenance)

Engine generates:
  side:           SELL    (opposite of LONG)
  qty:            1 BTC   (full position)
  type:           MARKET

Matching engine fills at $80,400 (small slippage as market sell hits the bid stack).

Realized PnL: (80,400 − 100,000) × 1 = −$19,600
\`\`\`

The trader started with $10k in collateral and lost $19.6k on the close. They're $9.6k underwater after the trade but *before* fees. Let's add the fee.

## The liquidation fee

Hyperliquid takes **~1.5% of closed notional** as a liquidation fee. The fee is debited from the trader's collateral and credited to the insurance fund.

In the example:
\`\`\`
fee = closed_notional × 0.015
    = $80,400 × 0.015
    = $1,206
\`\`\`

Adding it to the realized PnL: trader's total loss = $19,600 + $1,206 = $20,806.

Against $10k collateral, the trader's *net* position after liquidation is:
\`\`\`
collateral_remaining = 10,000 − 20,806 = −$10,806
\`\`\`

Negative. **The trader was Underwater before the close even completed.**

What happens to that $10,806 deficit? The insurance fund covers it.

## Solvent close vs underwater close — two paths

To make the distinction concrete, contrast our underwater example with a less-severe scenario:

**Scenario A: Solvent close (Liquidatable)**

\`\`\`
Trader's position before liquidation:
  collateral:    $10,000
  size:          1 BTC long
  entry:         $100,000
  mark at close: $89,000   (PnL = −$11,000, equity = −$1,000 — wait, that's negative)
\`\`\`

Let me pick a better number. Mark $90,500 → PnL = −$9,500 → equity = $500. Ratio = $500 / $90,500 ≈ 0.55% — below maintenance, equity positive. Liquidatable, not Underwater.

\`\`\`
Engine closes at $90,400 (slippage):
  realized PnL = (90,400 − 100,000) × 1 = −$9,600
  fee = $90,400 × 0.015 = $1,356
  total trader loss = $10,956
  collateral_remaining = 10,000 − 10,956 = −$956
\`\`\`

Wait, that's negative too. The Liquidatable boundary needs to leave enough buffer to cover the fee. In practice with 2% maintenance and 1.5% fee, the maintenance threshold *includes* the fee margin — the engine triggers liquidation when there's still enough collateral for the close + fee, not exactly at zero.

Let me reset the example with realistic numbers:

\`\`\`
Liquidatable case:
  collateral:    $10,000
  size:          0.5 BTC long, entry $100,000
  mark at close: $82,000
  notional:      $41,000
  equity:        10,000 + (82,000 - 100,000) × 0.5 = 10,000 - 9,000 = $1,000
  ratio:         $1,000 / $41,000 = 2.4% — barely AtRisk
  
  Mark drops to $81,500 — ratio drops to 1.8%, Liquidatable
  
Engine closes at $81,400:
  realized PnL = (81,400 - 100,000) × 0.5 = -$9,300
  fee = 81,400 × 0.5 × 0.015 = $611  (notional × fee_rate)
  total loss = 9,300 + 611 = $9,911
  collateral_remaining = 10,000 - 9,911 = +$89 returned to trader
  insurance_fund_credit = +$611 (the fee)
\`\`\`

**Solvent close: trader gets ~$89 back, insurance fund gains $611.**

Now the underwater case (a faster price drop, smaller buffer):

\`\`\`
Underwater case:
  Same starting position, but mark gaps from $82,000 → $76,000 in one block (no chance to trigger at $81,500).
  
  realized PnL = (76,000 - 100,000) × 0.5 = -$12,000
  fee = 76,000 × 0.5 × 0.015 = $570
  total loss = $12,570
  collateral_remaining = 10,000 - 12,570 = -$2,570 (insurance fund covers)
  insurance_fund_credit = +$570 (fee) - $2,570 (deficit) = -$2,000 (net drain)
\`\`\`

**Underwater close: trader loses all $10k collateral, insurance fund nets −$2,000 (paid out $2,570, received $570 in fee).**

The insurance fund's balance is the net of fees in (from solvent closes) minus deficits paid out (from underwater closes). In normal markets, fees dominate; the fund grows. In market crashes with many underwater positions, the fund drains.

## The insurance fund

The insurance fund is a single venue-controlled balance that:

- **Receives** liquidation fees from every liquidation (solvent or underwater)
- **Pays out** the deficit when an underwater account can't cover its own losses
- **Provides solvency** for the venue as a whole — every trader's positions are backed by the rest of the venue's collateral pool implicitly

A venue's insurance fund balance is public on Hyperliquid (and most CEXs). Watching it shrink during stress is one of the cleanest indicators of market panic.

Critically: **the insurance fund is not infinite.** When it's depleted, the venue is in trouble. The fallback mechanism is ADL.

## ADL — Auto-Deleveraging

When the insurance fund is empty and another account goes underwater, somebody has to absorb the loss. Hyperliquid (and most CEXs) implements **Auto-Deleveraging (ADL)** as the last-resort mechanism:

1. The venue computes a **ranking** of profitable opposite-side positions (e.g., shorts that profited from the same downward move that liquidated the underwater long).
2. Starting from the top of the ranking (most profitable + highest leverage), the venue **force-closes** those positions to absorb the deficit.
3. The closed positions get their realized PnL — the trader is "paid" their profit but loses the position.

> 💡 **Why doesn't ADL go through the orderbook?**
>
> You might think: "If there's a shortfall, just keep market-selling the underwater positions until they clear." But every one of those market orders would punch through the bid stack and crash mark further — and that crash would push *more* positions underwater. **The feedback loop runs away.**
>
> ADL is designed to break that loop by **bypassing the orderbook entirely**:
>
> - One bankrupt position and one winning position are **matched and cancelled** directly inside the engine's bookkeeping
> - Both positions disappear from the venue's books simultaneously
> - The orderbook's bid/ask is untouched — no extra crash pressure pushed into prices
>
> In other words, ADL isn't "liquidation in the market." It's **netting on the books** — an off-orderbook offset where the engine matches a winner against a loser and erases both positions at once. In the Stage 10c (multi-account scanner) implementation, the ADL path doesn't call \`book.submit()\` at all; it mutates the \`Position\` records directly and deletes them. **"Move the loss to the winners without touching the market"** — this is specifically how venues block the liquidation **death spiral** (forced selling causing more mark collapse causing more forced selling).

ADL is **deeply unpopular**. A trader who correctly predicted a market crash and is profitably short doesn't want to be force-closed; they'd prefer to ride the win further. But when the insurance fund can't cover the underwater loss, *someone has to lose money* — the math is conservation of cash. ADL distributes that loss to the side that "won" the most from the move.

Hyperliquid's design is to make ADL **very rare**:

- High liquidation fees keep the insurance fund well-capitalized in normal conditions
- Cross-margin (the default) makes most accounts more resilient — losses in one position can be buffered by others
- The DIY Perp track's Stage 10c (multi-account scanner) will implement ADL as a fallback path. It's intentionally the last lesson because the goal is to never reach it.

## The safety-net cascade

From Lesson 2's margin requirement down to ADL, four layers cascade through the loss-absorption stack. **The higher in the stack you stop, the less damage everyone takes:**

\`\`\`
   ┌─────────────────────────────────────────────────────────────────┐
   │ Layer 0: Margin requirement (covered in Lesson 2)                      │
   │   Initial 10% / Maintenance 2% cap the risk a trader can take    │
   │   → "The trader's own collateral covers their own losses"        │
   │   Stops here if: ratio ≥ maintenance and the market bounces      │
   └────────────────────────────────┬───────────────────────────────┘
                                    │ Fails: ratio < maintenance
                                    ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │ Layer 1: Force-close at maintenance (solvent close)              │
   │   Engine closes the position in the market, deducts fee          │
   │   → Most cases stop here (insurance fund grows from the fee)     │
   │   Stops here if: close realized PnL + fee ≤ collateral           │
   └────────────────────────────────┬───────────────────────────────┘
                                    │ Fails: equity < 0 after the close
                                    ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │ Layer 2: Insurance fund                                          │
   │   Pays the shortfall out of fees accumulated from past liquidations│
   │   → Absorbs a single underwater account                          │
   │   Stops here if: insurance_fund_balance ≥ shortfall              │
   └────────────────────────────────┬───────────────────────────────┘
                                    │ Fails: insurance fund balance = 0
                                    ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │ Layer 3: ADL (Auto-Deleveraging) — last resort                   │
   │   Engine matches winners against losers on the books, off-market │
   │   → Only reached in large crash conditions                       │
   │   Always stops here (the loss redistribution preserves cash)     │
   └─────────────────────────────────────────────────────────────────┘
\`\`\`

**How to read this cascade:**

- **Damage spreads as you fall further down**: at Layer 1 only the trader pays. At Layer 2 the venue pays from its pooled fee reserve. At Layer 3 unrelated (profitable) traders get pulled in.
- **Each layer is designed to absorb as much as possible before handing off to the next**: the 8% gap between initial and maintenance margin (from Lesson 2) is the room Layer 1 has to absorb, the 1.5% liquidation fee is the rate Layer 2 refills at, cross-margin (offsetting losses with profits within one account) delays the trip into Layer 1 — and so on. **Venue design is essentially a set of numerical choices for "keep work out of the layer below you."**
- **How this maps to code branches**: Stage 10c's \`MarginHealth\` enum transitions are exactly the Layer 1-3 transitions. \`Safe\` / \`AtRisk\` = Layer 0, \`Liquidatable\` = Layer 1, \`Underwater\` with a non-empty insurance fund = Layer 2, \`Underwater\` with a depleted fund = Layer 3. **The four-state enum maps 1-to-1 onto the four defensive layers.**

## Hyperliquid specifics

- **Liquidation fee**: ~1.5% for ETH/BTC, lower for more liquid assets. Charged on closed notional.
- **Insurance fund visibility**: balance is on-chain and queryable.
- **ADL ranking**: combines PnL% and leverage — high-leverage profitable positions get hit first.
- **ADL prevention**: Hyperliquid's market design (cross-margin default, tiered margin, high fees) is built to keep ADL rare. Even during the 2024 crypto crashes, ADL on HL was an order of magnitude rarer than on some competing venues.

## Common misconceptions

**"Liquidation is the venue 'taking' my money."** No — liquidation is the venue *closing your position at market*. You lose money because the market moved against you, not because the venue extracted it. The fee is small (~1.5%) compared to the realized loss. The venue *makes money* on liquidations only in the sense that the insurance fund grows; it has no other claim on your funds.

**"I can avoid liquidation by never closing."** Yes, *by adding collateral*. Never closing AND never adding collateral just guarantees liquidation when mark moves enough. The trader's job during AtRisk is to either add collateral or partial-close before reaching Liquidatable.

**"The insurance fund makes Hyperliquid risk-free."** No. It absorbs **individual trader deficits** when one position can't cover its own losses. It does NOT cover *systemic* failures (the entire orderbook gapping, the matching engine breaking, a smart contract bug). And once depleted, ADL distributes the loss to other traders. The insurance fund is a safety layer, not a guarantee.

## Where the primer ends

You now understand:

- **What a perp is** (Lesson 0)
- **How funding anchors mark to index** (Lesson 1)
- **How margin and the four states work** (Lesson 2)
- **How liquidation, insurance fund, and ADL handle the worst cases** (Lesson 3)

That's the complete model the DIY Perp track assumes. Every formula in \`compute_premium\`, every variant of \`MarginHealth\`, every line of \`close_order_spec\` — they all implement a piece of what this primer covered.

**You're ready for the DIY Perp track.** Start with:

→ **Build OpenHL — Consensus Substrate** (Module 1: build the BFT + Reth substrate)

Or, if you've already covered the consensus and orderbook material and want to start with the perp-specific layers:

→ **Build OpenHL — Funding** (implements what you saw in Lesson 1)

→ **Build OpenHL — Liquidation** (implements what you saw in Lesson 2 + Lesson 3)

## Summary (3 lines)

- Liquidation = block-by-block ratio monitoring → < maintenance → engine fires force-close (three-field close-order spec onto the normal orderbook) → 1.5 % fee → insurance fund.
- Insurance fund = grows from solvent-close fees, shrinks on underwater closes. A protocol-owned buffer that bounds traders' liability at zero.
- ADL = last resort when the insurance fund is empty and a position is still underwater; takes profit from the most-profitable opposite-side trader. Controversial (unrelated loss / unpredictable / bounded upside). Mitigation: keep the insurance fund well-funded. Primer complete — the Build OpenHL Funding/Liquidation courses are the Rust implementations of everything above.
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
