# Building OpenHL ADL — L0 draft (EN) — build-along

> openhl SHA `d66b44a` (Stage 10d — auto-deleveraging).
> This course is **course 11 of the DIY Perp series**, the 6th build-along
> after Consensus, CLOB, Precompiles, Funding, and Liquidation. It closes
> the **Stage 10 quartet** (margin math + insurance fund + scanner + ADL)
> — the full 4-layer safety-net cascade.

## L0 — `openhl-adl-orientation-en`

**Stage**: Stage 10d (auto-deleveraging — the cascade's last line) — `d66b44a`

**Title**: Build OpenHL ADL — auto-deleveraging, Layer 3 of the safety-net cascade

**Duration**: 15 min · **XP**: 50

---

````markdown
# Build OpenHL ADL — auto-deleveraging, Layer 3 of the safety-net cascade

## What you'll build

The previous course (`building-openhl-liquidation`) shipped the multi-account scanner — the orchestration loop that batches every Liquidatable / Underwater account into one `ScanReport`. At the end of L13 we noted that `ScanReport.unfilled_deficit > 0` is *the* signal the insurance fund couldn't absorb everything, and that Stage 10d (this course) would consume it.

This course implements that consumer. By the end you'll have shipped:

- **1 new source file / ~530 LOC** in `crates/liquidation/src/adl.rs`.
- **21 tests passing** at SHA `d66b44a`: 12 unit tests covering score / no-candidate / single-winner / multi-winner / tiebreaker cases, plus 4 invariant proptests; total crate test count **69 → 90** after this course.
- **3 new types** (`AdlScore`, `AdlRecord`, `AdlReport`) and **2 new functions** (`adl_score`, `execute_adl`) — a clean, small module compared to the scanner.
- **A complete 4-layer safety cascade**: margin requirement (Layer 0) → force-close fee (Layer 1) → insurance fund (Layer 2) → **ADL (Layer 3)** → **socialized loss / protocol insolvency (Layer 4)**. Layer 4 is the regime that 0–3 are designed to make unreachable; if `AdlReport.deficit_remaining > 0` at the end of L4 of this course, the chain has formally entered Layer 4 — every depositor takes a haircut, or the protocol halts.

You'll understand:

- **Why ADL bypasses the orderbook entirely** — not as an optimization, but because submitting market orders against profitable positions while the mark is already cascading would create a feedback loop that crashes the chain. Bookkeeping-layer mutation is the only safe path.
- **The Hyperliquid score convention**: `(pnl_pct × leverage)` ranks the "luckiest" winners — those who both made the highest relative gain *and* took the most leveraged risk to get there. They take the haircut first.
- **How the haircut works**: each ADL'd winner had unrealized PnL of `P`; in a normal close they'd receive `P` in full; with ADL they receive `P - haircut`, where `haircut = min(remaining_deficit, P)`. The system absorbs the difference toward the unfilled deficit.
- **Deterministic ranking**: stable-sort by score descending, tiebreak by `AccountId` ascending — so two equally-lucky winners produce a byte-identical order across every validator.
- **The fourth-layer exit**: when the candidate pool exhausts before the deficit is absorbed, `AdlReport.deficit_remaining > 0` and the protocol has run out of mechanisms. That value going non-zero is the moment a chain admits it's insolvent.

## Why ADL bypasses the orderbook (the feedback-loop reason)

This is the most important conceptual leap in the course, and it's worth stopping on it before any code.

Stage 10c's scanner submits close orders to the **CLOB** (matching engine). A Liquidatable account's position gets unwound by a market order that consumes the existing bid/ask stack. That's fine when there are a few liquidations in a quiet market.

But consider the case ADL is designed for: **a violent move triggered enough underwater closes that the insurance fund drained**. Now imagine we kept the same mechanism for ADL — submit market orders against the profitable counter-positions through the matching engine.

The order book has finite depth. Every additional market sell punches through the bid stack and drops the mark further. The mark dropping further pushes *more* accounts underwater. Those new underwater accounts also need ADL. The matching engine sees more aggressive sells. Mark drops more. The cycle runs away.

This is **exactly** the failure mode that killed Mt. Gox in slow-motion, that almost killed Robinhood during GameStop, and that has caused every major perp DEX outage in the last 5 years. The fix is structural: **ADL must not touch the orderbook**.

Concretely, what we do instead:

- ADL ranks winners by score, in pure Rust, on every validator independently.
- The "force-close" is a bookkeeping mutation: credit the trader's collateral by `pnl - haircut`, set position size to zero, remove from the open-positions table.
- The matching engine never sees an ADL close. The bid/ask stack is untouched. The mark moves only if someone *else* trades.

The `CloseOrderSpec` we still emit in each `AdlRecord` is purely telemetry — kept for shape parity with Stage 10a's other close paths and for downstream auditing. **The bridge** (the openhl integration layer that calls `LiquidationScanner::scan` and now `execute_adl` once per block — same component you've been hearing about since L10 of the Liquidation course) **applies it as an account-state mutation, not as a CLOB submission.**

## The Stage 10c → 10d handoff in one diagram

```
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
```

The contract is **one i64 in, one i64 out**. The bridge wires:
- L13 proved `unfilled_deficit > 0 ⇒ fund_balance == 0` (proptest #2).
- L0 (this lesson) tells you that L13's contract is exactly what triggers `execute_adl`.

## The score: "luckiest winners take the haircut"

You'll implement this in L2. For now: the score is

$$\text{pnl\_pct\_bps} = \frac{\text{pnl} \times \text{MARGIN\_SCALE}}{\text{collateral}}$$

$$\text{leverage\_bps} = \frac{\text{notional} \times \text{MARGIN\_SCALE}}{\text{equity}}$$

$$\text{score} = \frac{\text{pnl\_pct\_bps} \times \text{leverage\_bps}}{\text{MARGIN\_SCALE}}$$

(Reminder from Stage 10a: `equity = collateral + unrealized_pnl` at the current mark; `notional = |position_size| × mark`. So `collateral` is the deposited base, `equity` is what the position is worth right now, and `notional` is the gross exposure.)

Both factors are in bps (10000 = 100%). The product is renormalized once. A trader who is up 50% on a 10× position scores **higher** than one who is up 100% on a 1× position — Hyperliquid's choice, because high-leverage winners are seen as more "structurally" lucky (they took the most risk to win the most).

This is Hyperliquid's actual convention. Other venues use different scores (some use raw `pnl_pct`, some use absolute `pnl`); the choice matters for fairness but the *mechanism* is the same. We follow HL.

## The conservation law (the load-bearing invariant)

Same discipline as L9/L10/L13:

$$\text{deficit\_absorbed} + \text{deficit\_remaining} = \text{input\_deficit}$$

`execute_adl` either absorbs the full deficit (`deficit_remaining = 0`) or absorbs as much as it can and surfaces the remainder. **No deficit is created or destroyed by ADL itself.** The proptests in L4 lock this invariant in across every random `(candidates, mark, deficit)` triple.

This closes the cascade math — four layers, four conservation identities:

$$\text{L9  (per fund call):} \quad \text{amount} + \text{unfilled} = \text{shortfall}$$

$$\text{L10 (per position close):} \quad \text{fee\_to\_fund} + \text{residual\_to\_account} = \text{post\_close\_equity}$$

$$\text{L13 (per scan batch):} \quad \text{balance\_before} + \sum \text{deposits} - \sum \text{withdrawals} = \text{balance\_after}$$

$$\text{L4  (per ADL pass):} \quad \text{deficit\_absorbed} + \text{deficit\_remaining} = \text{input\_deficit}$$

Four layers, four identities. After this course, the openhl-liquidation crate's math is **closed under every operation**.

## The 5 lessons

### Module 0 — Orientation
- **L0** (this lesson) — Why ADL, why bypass orderbook, Stage 10c → 10d handoff, score preview, conservation law preview.

### Module 1 — ADL implementation
- **L1** — `AdlScore` newtype + `AdlRecord` + `AdlReport` types + the `adl_score(snapshot, mark) -> Option<AdlScore>` function. The pure-compute scoring with `None` for flat / losing / zero-collateral cases. 5 score tests.
- **L2** — `execute_adl(candidates, mark, deficit) -> AdlReport` — the orchestration: filter by `Option<AdlScore>`, stable-sort descending with `AccountId` tiebreaker, haircut loop. Phase-by-phase walkthrough of the 50-line body + 5 simple unit tests (zero / no-candidate / no-profitable / single-winner-full / single-winner-partial).
- **L3** — Nuanced absorption tests: multi-winner in score order, drain-first-then-partial, tiebreaker by AccountId ascending, "doesn't touch losers or flats" defense. 6 unit tests.
- **L4** — 4 invariant proptests + Stage 10 quartet retrospective. The conservation law from per-pass to per-block, the 4-layer cascade closed end-to-end.

## What's next after this course

The Stage 10 cascade is complete. The openhl roadmap continues:

- **Stage 11 — Oracle** (`6495ffd`, already shipped in openhl): the median-aggregating index-price feed with signed observation verify. Future rethlab course.
- **Stage 12 — Vault** (`1e63e0b`, already shipped): the share-based collateral pooling primitive. Future rethlab course.
- **Stages 13a-13k — bin/openhl** (multiple SHAs, already shipped): the actual runnable single-validator node. Future rethlab course.

After L4 of this course, you'll be one course ahead of the published curriculum and at the openhl Stage 10 endpoint. From there, openhl is your reference for the rest of the build.

## License / SHA discipline

L0–L4 cite Stage 10d at SHA `d66b44a`. The single-file diff lives at `crates/liquidation/src/adl.rs`. No other crate files change between Stage 10c (`0a8464e`) and Stage 10d — ADL is a pure additive module.

````

---

## Seed-file slot

L0 is the first lesson of the new course at module 0 / sortOrder 0:

```typescript
{
  title: 'Build OpenHL ADL — auto-deleveraging, Layer 3 of the safety-net cascade',
  slug: 'openhl-adl-orientation-en',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 15,
  xpReward: 50,
  content: `# Build OpenHL ADL — auto-deleveraging, Layer 3 of the safety-net cascade\n\n...`
},
```

Course-level metadata (new):

```typescript
{
  slug: 'building-openhl-adl-en',
  title: 'Build OpenHL ADL — auto-deleveraging, Layer 3 of the safety-net cascade',
  description: '...',
  difficulty: 'EXPERT',
  duration: 160,  // L0..L4 total: 15+35+40+35+35
  xpReward: 245,  // L0..L4 total: 50+60+70+50+70 (TBD final per-lesson XP)
  tags: ['reth', 'evm', 'liquidation', 'adl', 'perpetual', 'l1', 'openhl', 'expert'],
  sortOrder: 1010,  // immediately after Liquidation (1000)
  track: 'diy-perp',
  isPublished: true,
},
```

## SHA pinning discipline

L0 cites `d66b44a` (Stage 10d). After L4, the answer-key diff is byte-for-byte against `d66b44a`. ADL is a pure additive module — no other crate file changes between Stage 10c and Stage 10d.

## Style review notes (self-critique before paste)

- **L0 is the shortest lesson in the course** (15 min). Justified — orientation lessons set context for the verb lessons; trying to teach mechanism here distracts from the cascade-level framing the reader needs.
- **The "feedback loop bypasses orderbook" framing** is the most pedagogically valuable part of L0. Naming Mt. Gox, Robinhood/GME, and "every perp DEX outage" puts the discipline in the reader's hand as a real engineering lesson, not theoretical. This pattern (call out historical failures by name to anchor the design choice) is new to the rethlab corpus.
- **The Stage 10c → 10d handoff ASCII diagram** makes the L13-to-L0 transition concrete. The reader's last lesson (L13) ended with `unfilled_deficit` as the signal; L0 opens by showing exactly where that signal becomes an input to a new function.
- **The score preview is deliberately partial** — formula given, intuition explained, but no code yet. Saves the "why this expression and not the alternatives" reasoning for L1.
- **The four-layer conservation law diagram** is the cascade-math closer. After L0, the reader sees that the four lessons of L9 / L10 / L13 / L4 are *the same theorem at different scales*. This is the unique structural beauty of the openhl-liquidation crate; making it visible at L0 of the ADL course is the highest-leverage pedagogical move.
- **The 5-lesson structure** is tighter than the Liquidation course's 14-lesson sprawl. Reflects ADL being a single openhl stage rather than a trilogy.
