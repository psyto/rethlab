# Building OpenHL Funding — L11 draft (EN) — build-along

> Capstone lesson. No new code. Synthesizes Stage 8b and names the deferred work.
> Course: `building-openhl-funding-en` (track: `reth-l1-architect`).

---

## L11 — `openhl-funding-capstone-en`

- **Module:** 4 (Capstone), sortOrder 0
- **Course-level sortOrder:** 11 (lesson 12 of 12)
- **Duration:** 20 min
- **XP reward:** 40
- **Type:** CONTENT
- **Milestone:** Course completion

### Content

````markdown
# Lesson 11 — Capstone — what you built, what's deferred, what comes next

## Goal

By the end of this lesson:

- You can sketch the funding pipeline on a whiteboard from memory: `(mark, index)` → premium → rate → settlements, gated by the clock.
- You can name the five deferred items (oracle integration, balance updates, liquidations, multi-market funding, funding-as-EVM-event) and explain why each is out of scope for `crates/funding/`.
- You can sketch where four extensions would land in a future course.
- You're ready to wire this state machine into a perpetual DEX.

**No code in this lesson.** Just the mental model.

## The pipeline, in one diagram

```
   ┌────────────┐   ┌─────────────┐
   │ MarkPrice  │   │ IndexPrice  │     (raw u64, upstream oracle price, off-chain)
   └─────┬──────┘   └──────┬──────┘
         │                 │
         ▼                 ▼
       ┌─────────────────────┐
       │   compute_premium    │  →  Premium       (i64, RATE_SCALE = 1e9 scale)
       └──────────┬───────────┘
                  │
                  ▼
       ┌─────────────────────┐
       │    compute_rate      │  ←  FundingParams (divisor: u32, rate_cap: FundingRate, …)
       └──────────┬───────────┘
                  │
                  ▼  FundingRate (i64, RATE_SCALE = 1e9 scale, clamped to ±rate_cap)
                  │
            ┌─────┴─────┐
            │           │
            ▼           ▼
       ┌──────────────────────┐
       │   apply_funding      │  ←  &[Position] (account snapshots), MarkPrice
       └──────────┬───────────┘
                  │
                  ▼
              Vec<Settlement>  →  each element = { account: AccountId, delta: Notional }
                                   Notional is i64, raw quote-currency amount (1 unit = 1)
                                   bridge → balance updates (future)


   ╔═══════════════════════════════════════════════════════╗
   ║                  FundingClock::tick                    ║
   ║                                                        ║
   ║  guard: now ≥ last_settled_at + interval_secs?         ║
   ║    no  → return None                                   ║
   ║    yes → execute pipeline above, advance to `now`      ║
   ╚═══════════════════════════════════════════════════════╝
```

Read top-to-bottom: prices in, settlements out. The clock wraps the whole pipeline behind a "has enough time elapsed?" gate.

## What each module delivered

**Module 1 (Determinism + types, L1-L3)** — Fixed-point vocabulary:

- `RATE_SCALE = 1_000_000_000` (ppb): the load-bearing constant.
- 9 newtypes: `MarkPrice`, `IndexPrice`, `Premium`, `FundingRate`, `Notional`, `PositionSize`, `Position`, `Settlement`, `FundingParams`.
- `hyperliquid_default()`: 3600s interval, ±4% cap, divisor 8.
- **Lesson learned**: newtypes prevent argument-order bugs at compile time; sign conventions live in doc comments at definition site.

**Module 2 (Pure compute, L4-L7)** — Stateless math:

- `compute_premium(mark, index) → Premium` — graceful on `index == 0`, i128 intermediates, saturate.
- `compute_rate(premium, params) → FundingRate` — divide-then-clamp, defensive `.abs()` on cap.
- `apply_funding(positions, mark, rate) → Vec<Settlement>` — longs-pay-shorts via unary minus, filters flat positions.
- `saturate_i128_to_i64`: 3-line private helper, the only safety net at type boundaries.
- **15 tests**: 13 hand-traced + 2 proptests (antisymmetry, balanced-book zero-sum).
- **Lesson learned**: panic-vs-wrap-vs-saturate as a 3-way design tension; saturation is the only consensus-safe choice.

**Module 3 (Clock state machine, L8-L10)** — Discrete event loop:

- `FundingClock` + `FundingTick` + `tick()`.
- 7 tests covering: guard semantics, boundary cases, interval persistence, no-catch-up.
- **Lesson learned**: composition tests catch wiring errors; state machines need multi-call tests; design philosophy belongs in doc comments + tests + lesson prose, never in just one place.

## The honest deferred

Five things `crates/funding/` doesn't do. Each is a real production gap, *deliberately deferred* to keep this crate a pure state machine.

### 1. Oracle integration

**What we have**: `compute_premium` takes `mark: MarkPrice, index: IndexPrice` as inputs.

**What we don't have**: a way to *get* those prices. The caller must source mark from the CLOB (via something like `clob.best_bid_with_qty()` mid-price) and index from an external oracle (Pyth, Chainlink, a validator-attested feed).

**Why deferred**: oracle plumbing is its own discipline — staleness checks, deviation circuit breakers, multi-source aggregation, validator-set sign-off. Bundling it into the funding crate would couple two unrelated concerns. **The bridge layer (future course) wires the oracle to `tick()`.**

**When to revisit**: when wiring the funding crate into `LiveRethEvmBridge`. The bridge's payload-building code will read the latest mark/index *just before* calling `clock.tick(...)`.

### 2. Balance updates

**What we have**: `tick()` returns `Vec<Settlement>` — a list of `(account, delta)` pairs.

**What we don't have**: any mechanism to *apply* those deltas to account balances.

**Why deferred**: balance state lives in EVM storage (or another store maintained by the bridge). The funding crate is intentionally storage-free — it computes, it doesn't persist. **The bridge takes the `Vec<Settlement>` and emits balance-update transactions or direct state mutations.**

**When to revisit**: same as oracle integration. The bridge layer is where settlements meet balances.

### 3. Liquidations

**What we have**: settlements that can push an account's balance arbitrarily negative.

**What we don't have**: any check that an account has *capacity* to absorb the funding payment, or any logic for what happens when it doesn't.

**Why deferred**: liquidation is a separate state machine with its own invariants (insurance fund, ADL waterfalls, mark-price triggers). Tying it to funding would conflate two cadences (funding is hourly; liquidation is per-block). **Liquidation should be its own crate.**

**When to revisit**: after balance updates. The bridge sees a balance go negative; *then* the liquidation engine kicks in.

### 4. Multi-market funding

**What we have**: a single `FundingClock` for a single market.

**What we don't have**: a way to manage funding across multiple perpetual markets (BTC-USD, ETH-USD, SOL-USD, etc.) with potentially different intervals or caps.

**Why deferred**: the multi-market design is straightforward — one `FundingClock` per market, all managed by a `HashMap<MarketId, FundingClock>` at the bridge layer. The crate doesn't need to know about market multiplicity; it just needs to be correct for *one*.

**When to revisit**: when openhl adds a second market. **Probably never as part of this crate** — the multiplexing belongs above.

### 5. Funding as EVM events

**What we have**: settlements as `Vec<Settlement>` returned from `tick()`.

**What we don't have**: a way for smart contracts to *observe* a funding tick. A contract that wants to react to funding (e.g., "auto-deleverage when funding exceeds X%") can't subscribe to it as an event.

**Why deferred**: emitting EVM events from non-EVM code requires plumbing — the bridge would have to convert each `Settlement` into an `EvmLog` and inject it into the next block. **It's a bridge-layer concern, not a state-machine concern.**

**When to revisit**: when there's a concrete contract use case that demands event-based funding observation. **Until then, telemetry can be done at the bridge layer.**

## What comes next

Four extensions you could ship after this course:

### Extension 1: Oracle adapter (2-3 days)

A small `crates/oracle/` that pulls index prices from one or more sources (Pyth, Chainlink, validator-signed), aggregates with staleness checks, and exposes `fn current_index_price() -> Option<IndexPrice>`. The bridge calls this just before `clock.tick(...)`. **The hard part is choosing the staleness threshold; the code is straightforward.**

### Extension 2: Bridge-side funding tick (1 week)

Wire `FundingClock` into `LiveRethEvmBridge`. The bridge owns the clock instance, reads mark from the CLOB, reads index from the oracle, gets positions from the perpetuals position store, calls `tick()`, and applies the resulting settlements to balances. **Most of the work is plumbing; the funding crate is self-contained.**

### Extension 3: Liquidation engine (3-4 weeks)

A separate `crates/liquidation/` that monitors balances post-funding-tick, identifies under-margined accounts, and routes them through the insurance fund / ADL waterfall. **Big design discussions: insurance fund sizing, partial liquidation, MEV protection.** This is its own course.

### Extension 4: Multi-market manager (1 week)

A `crates/markets/` that maintains `HashMap<MarketId, FundingClock>` plus per-market position stores. The bridge dispatches funding ticks per market at the right cadences. **Conceptually simple; the value is in the per-market isolation.**

## Course completion — what you've internalized

Five skills that generalize beyond perpetual funding:

1. **Fixed-point arithmetic for consensus systems.** Any time you need to share numerical state across validators — funding, fees, oracle prices, vesting schedules — you'll use signed integers + a scale constant. Stated as the general pattern: real-valued `x` and `y` are encoded with a scale factor `S` as `X = x × S` and `Y = y × S`; multiplications widen the intermediate into a larger integer type, then divide by `S` at the end to land back in the original scale:

```
                          (S = scale factor; this course uses S = RATE_SCALE = 1e9)

   real-number space:    x  ·  y                    ──►   x × y
                          │       │                              │
                          ▼       ▼                              ▼
   fixed-point space:    X = x·S  Y = y·S         X × Y = (x × y) × S²
                                                              │
                                                              ▼  (received by a wider type, e.g. i128)
                                                       (x × y) × S²
                                                              │
                                                              ▼  ÷ S
                                                       (x × y) × S       ◄── final representation
                                                                              (back to the original fixed-point scale)
```

That one identity is the spine of every wrestling-with-intermediates moment in Module 2: the product carries an extra factor of `S`, so we let `i128` hold it, then divide by `RATE_SCALE` to cancel it back out. **`RATE_SCALE = 1e9` is the pattern; the constant value is the variable.** A fee calculator might use `S = 10_000` (basis-points scale) and reach for the same identity; a vesting schedule might use `S = 86_400` (seconds-per-day) to build a fixed-point representation along the time axis.

2. **Saturation as the consensus-safe overflow strategy.** Panic = chain fork via halt. Wrap = chain fork via wrong value. Saturate = bounded, consistent across validators. **For any consensus-critical math, saturate is the only choice.**

3. **Newtype pattern for semantic distinction.** `MarkPrice` and `IndexPrice` both wrap `u64`, but they're different concepts. The newtype prevents arg-order bugs at compile time, and the doc comment carries the sign convention. **5 lines per newtype; entire bug classes prevented.**

4. **Composition tests for layered code.** Each layer (`compute_premium`, `compute_rate`, `apply_funding`) is tested individually, but the layering itself is a separate concern. **`tick()` tests verify the composition; unit tests verify the pieces. You need both.**

5. **Design philosophy lives in code + doc + tests + prose.** The no-catch-up invariant is named in `clock.rs`'s module doc, enforced by `tick()`'s implementation, verified by `no_catchup_after_long_gap`, and explained in this course. **Four places to find the rationale; rationale survives even when individual pieces change.**

## Where this course sits in the L1 Architect track

**Courses 1-5** (Reth internals): pipeline, payload building, NodeBuilder, evm crate, RPC.

**Course 6** (openhl-consensus): Malachite integration.

**Course 7** (openhl-clob): matching engine.

**Course 8** (openhl-precompiles): EVM ↔ CLOB bridge via custom precompiles.

**Course 9 (this one)**: funding state machine. **Pure state, no I/O — the contrast to course 8's bridge plumbing.**

**Course 10** (openhl-bridge-integration — future): wires funding + oracle + liquidation into `LiveRethEvmBridge`. This is where everything from courses 6-9 composes into a runnable perp DEX.

You're now 90% of the way through the L1 Architect track. **The patterns from this course (fixed-point, saturation, composition tests) apply across the remaining work.**

## Final answer key

```bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/ ./crates/funding/ --recursive
```

After L11, **the entire `crates/funding/` directory should be byte-identical** to Stage 8b. You've reproduced 1 commit (~635 LOC across 3 files) by hand, with full understanding of why each line is there. **The crate compiles standalone, tests pass standalone, no external dependencies beyond `openhl-clob` (for `AccountId`).**

Return:

```bash
git checkout main
```

## You shipped this

22 tests passing. 3 source files. ~635 LOC of production Rust. A funding state machine that:
- computes deterministic premium/rate/settlement math at signed fixed-point precision;
- saturates rather than panics on pathological inputs;
- gates settlements on a configurable interval;
- refuses to catch up after long gaps (philosophical choice that aligns math with fairness).

**That's the entire HL-shape perpetual funding mechanism, in a crate you can drop into any Rust trading system.** The next time someone asks "how does perpetual funding work?" — show them this crate.

Go build perpetuals.
````

---

## Seed-file slot

L11 lands in new Module 4 (Capstone) at sortOrder 0:

```typescript
{
  title: "Lesson 11 — Capstone — what you built, what's deferred, what comes next",
  slug: 'openhl-funding-capstone-en',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 20,
  xpReward: 40,
  content: `# Lesson 11 — Capstone — what you built, what's deferred, what comes next\n\n...`
},
```

## SHA pinning discipline

L11 doesn't introduce code changes. The cumulative answer-key check (`diff -u crates/funding/ -r`) is against `cd94137` — the same SHA cited by every lesson in the course.

## Style review notes (self-critique before paste)

- **§Goal frames L11 as mental-model lesson** — explicitly no code.
- **§The pipeline diagram** is the centerpiece — readers can come back to this whenever they need to recall the shape.
- **§Module-by-module breakdown** condenses each module into 3-4 bullets + "lesson learned."
- **§Honest deferred** names 5 production gaps with **why deferred** and **when to revisit** — action-oriented.
- **§What comes next** sketches 4 extensions in increasing complexity.
- **§Skills internalized** lifts 5 generalizable patterns out of the course content.
- **§Where this course sits** anchors L11 in the broader L1 Architect track.
- **§You shipped this** is the celebration paragraph with concrete numbers.
- Style parallels course 8's L11 (same structure, different specifics) — consistent across the track.
