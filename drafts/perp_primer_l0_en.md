# Building Perp DEX Primer — L0 draft (EN) — concept course

> Prerequisite for the DIY Perp track. Concept-only — no Rust code, no openhl reference SHA.

## L0 — `perp-primer-what-is-a-perp-en`

**Title**: What perpetual futures are — and why they have no expiry

**Duration**: 30 min · **XP**: 50

---

````markdown
# What perpetual futures are — and why they have no expiry

## Goal

Concepts you'll grasp in this lesson:

- **What a perpetual future actually is** — a derivative contract with no expiry date, no settlement event, and no convergence-to-spot mechanism baked into time. The whole shape of the rest of this primer follows from that one design choice.
- **Why "no expiry" was a real engineering problem** — and why solving it required inventing a new economic mechanism (which we cover in L1).
- **How perps differ from spot and from traditional futures** — three markets, three pricing dynamics, three sets of trader incentives.
- **Why Hyperliquid is the canonical example** for this course — closed-source today, the rethlab DIY Perp track teaches you to build the open equivalent.

After this lesson you can answer:

- "What's the difference between buying BTC and going long BTC perp?"
- "If perps have no expiry, what keeps their price from drifting away from the underlying?"
- "What is Hyperliquid, and why does it matter to a Rust EVM engineer?"

## Why this primer exists

The rethlab DIY Perp track teaches you to build an open-source Hyperliquid implementation from scratch — consensus substrate, CLOB matching engine, EVM precompiles, funding state machine, liquidation engine. Each course is byte-identical against the openhl reference codebase.

**But the code only makes sense if you understand what a perp is.** When the funding course says "premium = (mark − index) / index, divisor 8, cap ±4%", that's six pieces of perp jargon in fifteen characters. If you're a Rust engineer coming in from infra work, you'd be forgiven for thinking the math is the hard part. **The math is the easy part. The mechanism is the hard part.**

This primer is the 4-lesson concept layer the DIY Perp track quietly assumed. No code, no openhl references — just the perp mechanics you need to make sense of the Rust later.

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

**The solution: funding payments.** This is L1's topic. The 30-second version: when mark drifts above index, longs pay shorts a small periodic fee proportional to the gap. The fee is the economic incentive that pulls mark back. Symmetrically when mark drifts below.

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

`psyto/openhl` is the open-source reference implementation. The rethlab DIY Perp track teaches you to build it. After this primer, you'll know enough perp domain to follow the code.

A short list of Hyperliquid-specific design choices worth remembering as you go through the rest of the primer:

- **Funding interval**: 1 hour (L1 covers this)
- **Funding rate divisor**: 8 (L1)
- **Funding rate cap**: ±4% per interval (L1)
- **Initial margin**: ~10% (L2)
- **Maintenance margin**: ~2% (L2; varies by tier)
- **Liquidation fee**: ~1.5% of notional (L3)
- **Cross-margin by default** (L2)
- **Insurance fund** present, **ADL** as fallback (L3)

These numbers will reappear in every subsequent primer lesson and in every DIY Perp course's example calculations.

## Common misconceptions

**"A perp is just a futures contract that auto-rolls."** Close but wrong. Auto-rolling futures still has expiries; you just get a new contract each cycle. Each roll has a cost (basis spread). Perps have no rolls — the funding payment replaces the roll cost.

**"Perps are riskier than spot."** Wrong direction of risk-comparison. Perps add **leverage risk** (you can lose more than your collateral if you're underwater — though insurance funds usually cover this on regulated venues). Without leverage, a 1× perp position has roughly the same risk as spot, minus funding cost.

**"Hyperliquid is a smart contract on Ethereum."** No — Hyperliquid is its **own L1**. The whole point of building the DIY Perp track is that an app-chain optimized for perps beats a smart contract on a general-purpose L1 for the user experience perps need (sub-second latency, no gas, deep orderbook).

## Next lesson (L1)

L1 — **Mark, index, and funding**. We build the picture of how mark price stays anchored to the index when there's no expiry. You'll see the premium formula `(mark − index) / index`, the divisor that converts it to a per-interval rate, the cap that bounds worst-case payments, and worked numerical examples at Hyperliquid's actual parameter values.

After L1, the Build OpenHL — Funding course's L4 — `compute_premium` — will read as "implementing the formula you already understand" instead of "what is a premium?".

````

---

## Seed-file slot

L0 lands in Module 0 (Foundations) at sortOrder 0:

```typescript
{
  title: 'What perpetual futures are — and why they have no expiry',
  slug: 'perp-primer-what-is-a-perp-en',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 30,
  xpReward: 50,
  content: `# What perpetual futures are — and why they have no expiry\n\n...`
},
```

## Style review notes (self-critique before paste)

- **Concept-only format works** for this audience. The Rust-EVM engineer reading this needs perp mechanics, not yet another "follow the doc comments" exercise. By stripping the build-along furniture (Goal → Recap → Plan → Walk-through → Test → Answer key → Q&A), the lesson can focus on the conceptual scaffold each subsequent lesson builds on.
- **"After this lesson you can answer"** block is the concept-course equivalent of "Verification: `cargo test`" in build-along lessons. Both anchor the reader to the question the lesson exists to answer, before the content begins.
- **"Why this primer exists" section** is load-bearing for course discovery — anyone landing on the course catalog needs to immediately understand why the primer is positioned ahead of DIY Perp. Without this section, the value proposition is implicit.
- **HL number table at the end** serves dual purpose: (1) introduces all the numbers the rest of the primer will use, (2) gives the reader a forward-reference index they can return to as L1/L2/L3 reveal what each number means.
- **No code blocks in this lesson** — deliberate. The concept course distinguishes itself from the build-along courses by the absence of Rust source. If a reader wants code, they're directed forward to the DIY Perp track.
