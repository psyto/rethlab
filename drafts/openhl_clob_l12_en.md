# Building OpenHL CLOB — L12 draft (EN) — build-along

> No openhl SHA cited — this lesson is a recap and roadmap, not new code.
> Course: `building-openhl-clob-en` (track: `reth-l1-architect`).
> Closing lesson of Course 7.

---

## L12 — `openhl-clob-capstone-en`

- **Module:** 5 (Capstone), sortOrder 0 within module
- **Course-level sortOrder:** 11 (lesson 12 of 12)
- **Duration:** 15 min
- **XP reward:** 50
- **Type:** CONTENT

### Content

````markdown
# Lesson 12 — What you built, what's still stub, where to go next

## The system you built

Over 11 lessons you added a **CLOB matching engine** to the substrate you built in course 6, and wired its fills into committed payloads. Your workspace now looks like this:

```
~/code/my-openhl/
├── Cargo.toml                          ← +1 workspace dep (openhl-clob path)
├── crates/
│   ├── clob/                           ← NEW crate (course 7 created it)
│   │   ├── Cargo.toml                  L1: package + dev-dep on proptest (L8)
│   │   └── src/
│   │       ├── lib.rs                  L1: pub mod types, pub mod book, re-exports
│   │       ├── types.rs                L1 + L2: newtypes + records (~109 LOC)
│   │       └── book.rs                 L3-L8: Book + matching + cancel + tests
│   └── evm/
│       └── src/live_node.rs            L9-L11: bridge gains CLOB, drains on build
└── ... rest unchanged from course 6 ...
```

About **15 new tests** total: 9 hand-traced unit tests (L7) + 3 proptest invariants (L8, 768 random scenarios) + 1 integration test (L11). Workspace test count: 39 tests (38 from course 6 + L11's `clob_fills_flow_into_payload`).

## What the matching engine does

A price-time priority CLOB. **Two operations**: submit (new orders take or rest) and cancel (resting orders disappear). **One observable result**: each `submit` returns a `FillResult` listing matched fills.

| Operation | Public method | What changes inside |
| - | - | - |
| Submit Limit order | `Book::submit(order)` (via `OrderType::Limit`) | walks opposite side at-or-better than price, matches resting orders, rests unfilled remainder |
| Submit Market order | `Book::submit(order)` (via `OrderType::Market`) | walks opposite side at any price, matches, discards unfilled remainder |
| Cancel resting order | `Book::cancel(order_id)` | linear scan both sides, remove order, drop level if empty |
| Inspect | `best_bid`, `best_ask`, `depth_bid`, `depth_ask` | read-only |

The matching is **deterministic by construction**. Every submit produces the same fills given the same inputs and same prior book state — that's the L8 proptest invariant (`determinism`) that 256 random sequences exercise.

## The bridge integration

`LiveRethEvmBridge` from course 6 gained **two fields** (`clob`, `pending_fills`) and **three methods** (`submit_order`, `payload_fills`, `pending_fill_count`). The data flow:

```
submit_order(order)              build_payload(parent, attrs)
       │                                    │
       ▼                                    ▼
  clob.submit                       drain pending_fills
       │                                    │
       ▼                                    ▼
  pending_fills.push                  attach to payload
       │                                    │
       │                                    ▼
       │                              payload_fills(id) returns them
       ▼
  return FillResult to caller
```

Submit pushes; build drains. The drain is **forward-only**: each payload owns the fill snapshot taken at its build time; earlier payloads aren't retroactively filled. **L11's integration test proves this end-to-end** against a real Reth node.

## What you can now do that you couldn't 11 lessons ago

- **Build a price-time priority matching engine from scratch in Rust** — and understand why `BTreeMap<Reverse<Price>, ...>` is the right shape for bids, why `VecDeque` is the right per-level queue, and what trade-offs cancel's O(n) scan has versus an O(1) index.
- **Reason about pure-state-machine determinism** — the `determinism` proptest is the kind of invariant chains rely on, and you've encoded it.
- **Integrate a sub-system into an existing async-shared bridge** — interior mutability via `Mutex<T>` and `&self` methods is the idiomatic Rust pattern for shared state under async tasks. You've applied it.
- **Read openhl Stage 8a + 8d source** and explain every line of `book.rs` + the bridge's CLOB-related code.
- **Modify the matching engine** — add a new order type (Stop, Iceberg, Post-Only) and know where in `submit_limit`/`submit_market` it'd land.

## What's still placeholder

This course shipped a working matching engine integrated into the bridge. Honest scoping — here's what isn't there:

### 1. EVM-executable transaction encoding

**Status**: not started.

The fills attached to a payload are still a parallel `Vec<Fill>`, not transactions in the block body. Reth's `BlockExecutor` won't see them. To progress: encode each `Fill` as an EVM transaction (likely calling a custom precompile that updates state). That's Module 3 territory — **course 8**'s domain.

### 2. Custom EVM precompiles

**Status**: not started.

For smart contracts to **read** CLOB state (e.g., "what's the best bid?") they need a precompile. For external accounts to **place orders via on-chain transactions** they need another precompile. openhl Stage 9 has both (`clob_read_best_bid`, `clob_place_order`). **Course 8** builds these.

### 3. Funding rate state machine

**Status**: not started.

A perp DEX needs funding rate calculations (mark vs. index, periodic rebalancing). openhl Stage 8b has the state machine. **Course 9** builds it.

### 4. Multiple markets

**Status**: implicit single market.

The current `Book` is one orderbook. Real perp exchanges have many (HYPE/USDC, BTC/USDC, ETH/USDC, etc.). To extend: `HashMap<MarketId, Book>` at the bridge. Mechanical change; not yet done in openhl Stage 8.

### 5. Persistent CLOB state

**Status**: in-memory only.

Restart the bridge and all resting orders are gone. Production needs snapshot/load (or full event-sourcing from chain state). Not addressed in any current openhl stage; eventual hardening work.

### 6. Cancel-by-id index

**Status**: O(n) linear scan.

L6 explicitly chose simplicity over an O(1) index. When openhl scales past ~10k orders per book, the cancel scan becomes meaningful. Adding `HashMap<OrderId, (Side, Price)>` would make cancel O(1) — small mechanical change, deferred until profiling demands it.

## Production-readiness checklist

If you wanted to take this matching engine + bridge to a real testnet:

- [ ] **EVM-encoded fills** — wrap each `Fill` as a transaction, route to BlockExecutor for state execution + state-root computation.
- [ ] **Custom EVM precompiles** — `clob_read_best_bid` for contract reads, `clob_place_order` for chain-driven submits.
- [ ] **Multi-market support** — `HashMap<MarketId, Book>` and per-market submit/cancel paths.
- [ ] **Persistent state** — snapshot the Book to disk + replay on restart, OR fully reconstruct from chain history.
- [ ] **Cancel index** — add `HashMap<OrderId, (Side, Price)>` to make cancel O(1).
- [ ] **Order-id collision check** — `submit` currently trusts callers to allocate unique OrderIds. Production needs to detect + reject duplicates.
- [ ] **Pre-trade risk checks** — orders that would put an account below maintenance margin should be rejected before matching.
- [ ] **Telemetry** — counters for order throughput, fill latency, depth-of-book metrics.
- [ ] **Multi-validator agreement** — single-validator devnet hides the case where two validators produce different fill orderings. Proptest's `determinism` is the local proof; a multi-validator integration test is the network proof.
- [ ] **Liquidation engine** — when an account's margin falls below maintenance, force-close their positions. Course 9 territory.

This list is intentionally longer than the matching engine itself. **A working matching engine is the foundation, not the product.**

## Market structure: what you actually built

You spent 11 lessons building a **price-time-priority CLOB**. Before moving on, it's worth situating that choice in the broader landscape of perp DEX designs — because CLOB is one of three real options, and the recent RWA-perps debate makes the tradeoffs unusually concrete.

**The three models.**

- **CLOB (what you built)**: market makers post resting orders, takers cross them. Price is set by the meeting of supply and demand on this venue. Per-market MM economics: every name needs continuous quoting by someone who's willing to absorb inventory risk. Works when there's enough retail flow to make per-name quoting profitable.
- **RFQ (Variational, Paradigm)**: takers request quotes, dealers respond just-in-time, dealers hedge on a primary venue (CME, NYSE, or another CLOB). Price is *taken* from the source venue plus hedging cost plus dealer margin. Unit economics work for the long tail because dealers don't have to maintain quotes 24/7 — they quote only when asked.
- **AMM (GMX, dYdX v3 vAMM-era)**: liquidity pooled into a curve, traders move against the curve. Capital-efficient at the start, brutal at the tails. Less relevant now for perps but worth knowing as a design point.

**Where CLOB wins, where it doesn't.**

A CLOB is a price-discovery venue *when there is local supply and demand to discover*. For BTC, ETH, SOL, HYPE — assets without a "primary venue" in the TradFi sense — the CLOB on Hyperliquid genuinely sets price. For WTI, NVDA, SPY perps during NYSE/NYMEX trading hours, the CLOB is just an arbitrage shadow of the primary market. So is RFQ. Neither model does real price discovery for RWAs during primary hours — they're both downstream consumers of CME and the NYSE order book.

The cold-start asymmetry is structural. A CLOB needs a market maker willing to quote continuously on each name. If you have 200 RWA tickers and 10 of them have retail flow, the other 190 either get no quoting or get heavily subsidized quoting that produces thin books that blow out on news. RFQ avoids this — dealers quote only on demand, so there's no idle quoting cost per name.

**The "last look" question.**

A common claim is that RFQ has "last look" (dealer can reject a quote request) while CLOB doesn't. This is half true. In a CLOB, market makers can cancel quotes faster than takers can hit them — what HL calls **cancel prioritization** in the matching docs. An MM who sees an adverse taker can pull the quote before the cross commits. The form differs, the economics don't.

The CLOB you built does not implement cancel prioritization — `submit_limit` and `cancel` are first-come-first-served in `pending_actions`. Production HL is not so generous to takers; cancels can be reordered ahead of conflicting submits to give MMs effective last look. **If you wanted to add it, the change is in the BFT engine's ordering rules, not in your matching engine.**

**What you built, where it sits.**

You built the engine HL uses to price the **top tier of crypto-native names**. That's a real and economically significant slice of the market. It is not the engine that will price the long tail of RWA perps — that flow is structurally better served by RFQ, where dealers can mainline CME and NYSE depth without bootstrapping per-name books.

The interesting builder question isn't "CLOB or RFQ" — it's "which slice of which asset class, with which liquidity source." A CLOB built on top of HyperBFT, with custom precompiles that let smart contracts route into the book, is exactly the right architecture for the top tier of crypto-native perps. For everything else, the design space is open.

## Where to go next

**Within rethlab**:
- **Course 8 — Custom EVM precompiles** — `clob_read_best_bid` + `clob_place_order` from openhl Stage 9.
- **Course 9 — Funding state machine** — openhl Stage 8b.

**Outside rethlab**:
- **`psyto/openhl` Stage 9 source** — the full custom-EVM build is in the public repo. Read `crates/evm/src/precompiles.rs` once you understand the bridge.
- **Production matching engines for reference** — Project Serum (Solana CLOB, archived but public), dYdX v4 (Cosmos-based perp DEX, public). Compare data structures.
- **Property-based testing literature** — proptest's docs + Hughes/Claessen QuickCheck papers. The L8 invariants are conservative; you can do much more.

## Closing note

You wrote roughly **800 lines of Rust** across 5 source files (`types.rs` + `book.rs` + bridge additions). That code is a *working CLOB matching engine wired into a real Reth-backed bridge*. It's not production-ready; it doesn't need to be.

The hardest part wasn't writing the matching logic — L4's submit_limit is 60 lines once you understand the structure. **The hardest part is the determinism property** — making sure that across all possible orderings of submits, the engine produces the same answer. The L8 proptest is what catches the bugs you didn't think to write tests for, and it's why the engine you built is safe to plug into consensus.

A correct-but-non-deterministic matching engine breaks consensus. A deterministic one is the kind of code that survives migration from devnet to mainnet.

Now go build something that uses this.
````

---

## Seed-file slot

L12 lands in **new Module 5 (Capstone)** at sortOrder 0:

```typescript
modules: {
  0: { title: 'Orientation', sortOrder: 0 },
  1: { title: 'CLOB types', sortOrder: 1 },
  2: { title: 'Matching engine', sortOrder: 2 },
  3: { title: 'Testing', sortOrder: 3 },
  4: { title: 'Bridge integration', sortOrder: 4 },
  5: { title: 'Capstone', sortOrder: 5 },  // NEW
},
```

```typescript
{
  title: "Lesson 12 — What you built, what's still stub, where to go next",
  slug: 'openhl-clob-capstone-en',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 15,
  xpReward: 50,
  content: `# Lesson 12 — What you built, what's still stub, where to go next\n\n...`
},
```

## SHA pinning discipline

L12 does not cite a specific openhl SHA — it summarizes the journey across Stage 8a (`55a9dff`) + Stage 8d (`428cc26`). The lesson's primary artifacts are conceptual (system map, production checklist, roadmap), not code.

## Style review notes (self-critique before paste)

- **Mirrors course 6's L15 in structure**, adapted for the matching-engine subdomain.
- **§What the matching engine does** — the 4-row table is the artifact readers will reference back to. The table maps L1-L8 onto Public-API operations.
- **§Bridge integration's ASCII diagram** is recycled from L9-L10's content but worth repeating in the capstone for the visual summary.
- **§What's still placeholder is honest** — 6 items, each labeled, each named what it'd take. Course 8 and 9 are explicitly named.
- **§Production-readiness checklist's 10 items** are CLOB-specific (not consensus-specific like course 6's checklist). Most realistic priority would be EVM-encoded fills + multi-validator agreement testing.
- **§Closing note** is short and warm. The "determinism is the load-bearing property" callback ties L8 to the closing reflection.
