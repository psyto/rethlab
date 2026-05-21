# Building Perp DEX Primer — L3 draft (EN) — concept course

> DIY Perp track prerequisite. Concept-only, no Rust code.

## L3 — `perp-primer-liquidation-insurance-adl-en`

**Title**: Liquidation, insurance fund, and ADL — the safety net mechanics

**Duration**: 35 min · **XP**: 60

---

````markdown
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

L0 established what perps are. L1 made mark anchor to index via funding. L2 classified positions into the four states. L3 walks through what *actually happens* at the boundary between AtRisk and Liquidatable, and between Liquidatable and Underwater.

This is the lesson where the perp model becomes load-bearing for the entire chain: every other trader's safety depends on liquidation working correctly.

## The trigger

Recap from L2: an account is **Liquidatable** when `margin_ratio < maintenance_margin_bps` AND `equity ≥ 0`. **Underwater** when `equity < 0` (PnL has exceeded collateral).

The engine evaluates margin ratio every block for every non-flat account. The moment an account crosses below the maintenance threshold, the engine fires the liquidation pipeline for that account in the current block. No human in the loop, no waiting, no second chances — every validator, every block, on the same data.

## The force-close mechanism

When the engine decides to liquidate, it generates a **close order spec** with three fields:

| Field | Value |
| :--- | :--- |
| `side` | Opposite of the position direction (long → SELL, short → BUY) |
| `qty` | Full absolute position size (`\|size\|`) |
| `account` | The liquidated trader's account ID |

No price — it's always a **market order**. The engine doesn't pick prices; it accepts whatever the orderbook offers right now. The matching engine settles the close against resting liquidity (other traders' limit orders).

This is mechanically the same as a normal trade. The trader's position closes. The counterparty (whoever's resting order fills the close) opens or increases their position. Mark moves to reflect the new top-of-book.

A worked example:

```
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
```

The trader started with $10k in collateral and lost $19.6k on the close. They're $9.6k underwater after the trade but *before* fees. Let's add the fee.

## The liquidation fee

Hyperliquid takes **~1.5% of closed notional** as a liquidation fee. The fee is debited from the trader's collateral and credited to the insurance fund.

In the example:
```
fee = closed_notional × 0.015
    = $80,400 × 0.015
    = $1,206
```

Adding it to the realized PnL: trader's total loss = $19,600 + $1,206 = $20,806.

Against $10k collateral, the trader's *net* position after liquidation is:
```
collateral_remaining = 10,000 − 20,806 = −$10,806
```

Negative. **The trader was Underwater before the close even completed.**

What happens to that $10,806 deficit? The insurance fund covers it.

## Solvent close vs underwater close — two paths

To make the distinction concrete, contrast our underwater example with a less-severe scenario:

**Scenario A: Solvent close (Liquidatable)**

```
Trader's position before liquidation:
  collateral:    $10,000
  size:          1 BTC long
  entry:         $100,000
  mark at close: $89,000   (PnL = −$11,000, equity = −$1,000 wait that's negative)
```

Let me pick a better number. Mark $90,500 → PnL = −$9,500 → equity = $500. Ratio = $500 / $90,500 ≈ 0.55% — below maintenance, equity positive. Liquidatable, not Underwater.

```
Engine closes at $90,400 (slippage):
  realized PnL = (90,400 − 100,000) × 1 = −$9,600
  fee = $90,400 × 0.015 = $1,356
  total trader loss = $10,956
  collateral_remaining = 10,000 − 10,956 = −$956
```

Wait, that's negative too. The Liquidatable boundary needs to leave enough buffer to cover the fee. In practice with 2% maintenance and 1.5% fee, the maintenance threshold *includes* the fee margin — the engine triggers liquidation when there's still enough collateral for the close + fee, not exactly at zero.

Let me reset the example with realistic numbers:

```
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
```

**Solvent close: trader gets ~$89 back, insurance fund gains $611.**

Now the underwater case (a faster price drop, smaller buffer):

```
Underwater case:
  Same starting position, but mark gaps from $82,000 → $76,000 in one block (no chance to trigger at $81,500).
  
  realized PnL = (76,000 - 100,000) × 0.5 = -$12,000
  fee = 76,000 × 0.5 × 0.015 = $570
  total loss = $12,570
  collateral_remaining = 10,000 - 12,570 = -$2,570 (insurance fund covers)
  insurance_fund_credit = +$570 (fee) - $2,570 (deficit) = -$2,000 (net drain)
```

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

ADL is **deeply unpopular**. A trader who correctly predicted a market crash and is profitably short doesn't want to be force-closed; they'd prefer to ride the win further. But when the insurance fund can't cover the underwater loss, *someone has to lose money* — the math is conservation of cash. ADL distributes that loss to the side that "won" the most from the move.

Hyperliquid's design is to make ADL **very rare**:

- High liquidation fees keep the insurance fund well-capitalized in normal conditions
- Cross-margin (the default) makes most accounts more resilient — losses in one position can be buffered by others
- The DIY Perp track's Stage 10c (multi-account scanner) will implement ADL as a fallback path. It's intentionally the last lesson because the goal is to never reach it.

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

- **What a perp is** (L0)
- **How funding anchors mark to index** (L1)
- **How margin and the four states work** (L2)
- **How liquidation, insurance fund, and ADL handle the worst cases** (L3)

That's the complete model the DIY Perp track assumes. Every formula in `compute_premium`, every variant of `MarginHealth`, every line of `close_order_spec` — they all implement a piece of what this primer covered.

**You're ready for the DIY Perp track.** Start with:

→ **Build OpenHL — Consensus Substrate** (Module 1: build the BFT + Reth substrate)

Or, if you've already covered the consensus and orderbook material and want to start with the perp-specific layers:

→ **Build OpenHL — Funding** (implements what you saw in L1)

→ **Build OpenHL — Liquidation** (implements what you saw in L2 + L3)

````
