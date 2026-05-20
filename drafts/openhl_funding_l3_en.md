# Building OpenHL Funding — L3 draft (EN) — build-along

> Drafted against openhl SHA `cd94137` (Stage 8b — funding state machine).
> Course: `building-openhl-funding-en` (track: `reth-l1-architect`).

---

## L3 — `openhl-funding-position-types-en`

- **Module:** 1 (Determinism + types), sortOrder 2
- **Course-level sortOrder:** 3 (lesson 4 of 12)
- **Duration:** 35 min
- **XP reward:** 70
- **Type:** CONTENT
- **Milestone:** Module 1 complete — full type roster in place

### Content

````markdown
# Lesson 3 — Position types — finishing the roster + HL defaults

## Goal

By the end of this lesson:

```bash
cargo build -p openhl-funding
```

…still compiles, with zero rustdoc warnings. `types.rs` is **complete** — all nine types from Stage 8b's roster are in place:

- **`FundingRate(pub i64)`** — per-interval rate after divisor + cap. Same scale as `Premium`.
- **`PositionSize(pub i64)`** — signed: positive = long, negative = short, zero = flat.
- **`Position { account, size }`** — per-account snapshot. Activates the `openhl_clob::AccountId` dependency.
- **`Settlement { account, delta }`** — output of `apply_funding`: who pays/receives, how much.
- **`FundingParams { interval_secs, rate_cap, divisor }`** + `hyperliquid_default()` — network-level configuration with HL-shape defaults.

This closes **Module 1**. After L3:
- All types defined; no behavior yet.
- Cross-references resolve in rustdoc (no more "unresolved link" warnings).
- The crate is a pure data-types library — useful as documentation, not yet doing math.

**Module 2 (L4-L7) starts the pure compute** — `compute_premium`, `compute_rate`, `apply_funding`. The first tests live there.

The teaching focus this lesson is the **parameter-object pattern** and the HL-default rationale. Why bundle three parameters into a `FundingParams` struct instead of passing them as positional args? Why 1-hour interval, why 4% cap, why divisor of 8?

## Recap

After L2:
- 4 money newtypes (`MarkPrice`, `IndexPrice`, `Premium`, `Notional`) defined.
- `types.rs` has module doc + `RATE_SCALE` + 4 types.
- `lib.rs` re-exports 5 names (the constant + 4 types).
- 2 unresolved rustdoc warnings remain (`FundingRate`, `FundingClock`).

L3 adds 5 more types (closing the type roster) + the `openhl_clob::AccountId` import.

## Plan

Three edits:

1. **`crates/funding/src/types.rs`** — add the `openhl_clob::AccountId` import at the top, then append 5 type definitions (`FundingRate`, `PositionSize`, `Position`, `Settlement`, `FundingParams` + `hyperliquid_default`).
2. **`crates/funding/src/lib.rs`** — extend the re-export to include all 9 names.
3. **Verify**: `cargo build -p openhl-funding` compiles with **zero warnings**.

> 🛑 **Predict.** Before scrolling: we're about to define `FundingParams { interval_secs: u64, rate_cap: FundingRate, divisor: u32 }` instead of having `compute_rate(premium, interval_secs, rate_cap, divisor)`. **Why bundle these three values into a struct?** Hint: think about how many call sites for `compute_rate` exist, and what happens when we add a fourth parameter later.

(Answer: **Parameter-object pattern preserves call-site stability across config evolution.** `compute_rate(premium, params)` is one positional arg + one struct. If we later add `min_settlement_threshold` to the funding config, the function signature stays `compute_rate(premium, params)` — only the `FundingParams` struct grows. Positional-arg variants `compute_rate(premium, interval, cap, divisor)` would break every call site at every new parameter. With <5 call sites today (clock + tests) the cost is modest; with 50+ in a mature codebase, the parameter object is essential. **Bundle stable groupings of values together when the grouping itself is a domain concept** — "the funding configuration" is one such concept.)

## Walk-through

### Step 1: Add the `AccountId` import

At the top of `crates/funding/src/types.rs`, after the module doc but before `pub const RATE_SCALE`, add:

```rust
use openhl_clob::AccountId;
```

This import was set up in L1's Cargo.toml (the `openhl-clob = { path = "../clob" }` dep). It activates here because `Position` and `Settlement` will reference `AccountId` as a struct field type.

> 🛑 **Anti-fluency.** "Should we re-export `AccountId` from `openhl-funding` so callers don't need to import from `openhl-clob`?" **No — it's not ours.** `AccountId` is `openhl-clob`'s type, and callers should import it from where it's defined. Re-exporting it through `openhl-funding` would create two import paths for the same thing (`openhl_clob::AccountId` vs `openhl_funding::AccountId`) and obscure the dependency. **Re-export your own types; let callers import their dependencies' types directly.**

### Step 2: Append `FundingRate` after `Premium`

After the existing `Premium` definition, add:

```rust
/// Per-interval funding rate. Same scale as [`Premium`]; positive means
/// longs pay shorts. A rate of `RATE_SCALE / 100` = 1% per interval.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct FundingRate(pub i64);
```

`FundingRate` is structurally identical to `Premium` — same `i64`, same derives. **The reason it's a separate type, not an alias, is that they represent different concepts in the funding pipeline.** A premium is the *raw* mark/index dislocation; a rate is what gets *applied* to positions after divisor + clamp. Code that consumes a premium (`compute_rate`) shouldn't accept a rate (which is post-processed); code that consumes a rate (`apply_funding`) shouldn't accept a premium (which hasn't been clamped).

**Same shape, different roles, separate types.** This is the newtype pattern doing exactly what it does for `MarkPrice` vs `IndexPrice`.

### Step 3: Append `PositionSize`

After `FundingRate`:

```rust
/// Signed position size in base units. Positive = long, negative = short,
/// zero = flat. Accounts with zero size aren't included in settlement
/// snapshots — see [`Position`].
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct PositionSize(pub i64);
```

One signed integer carries three states: long (`> 0`), short (`< 0`), flat (`== 0`). Compare to a 2-field representation:

```rust
// Verbose alternative — NOT what we use:
pub struct PositionSize {
    pub direction: Direction,  // Long, Short, Flat
    pub magnitude: u64,
}
```

The signed-integer representation is **smaller** (8 bytes vs ~16+), **faster** (no enum dispatch in the hot path), and **simpler at the math layer** (just multiply by `size.0`; the sign carries through naturally). The tradeoff: the inner value's sign is implicit. The doc comment names it explicitly: *"Positive = long, negative = short, zero = flat."*

**The note "Accounts with zero size aren't included in settlement snapshots"** is load-bearing. `apply_funding` will filter zero-size positions out — they have no economic exposure, so settling them produces a zero delta that adds noise. We'll see that filter in L7.

### Step 4: Append `Position`

```rust
/// A single account's net position on the market. The funding state machine
/// treats positions as a per-tick *snapshot* — it never owns or mutates
/// them. The owning layer (vault / clearing) is responsible for tracking
/// `Position` over time and producing snapshots at each tick.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Position {
    pub account: AccountId,
    pub size: PositionSize,
}
```

Two fields, both public. `account` lets the settlement output know whose balance to credit/debit. `size` lets the rate-application math compute the delta.

**Crucially: no `entry_price`, no `realized_pnl`, no `unrealized_pnl`.** The funding state machine doesn't need to know how the position was opened or what its P&L looks like — it just needs the *current size* to multiply against the current rate. **The simpler the snapshot, the easier it is to produce one upstream.**

> 🛑 **Anti-fluency.** "Shouldn't `Position` also carry the entry price, for futures-PnL accounting?" **No — that's the owning layer's job.** The vault or clearing layer tracks entry prices, computes unrealized PnL, etc. The funding crate is downstream of that: it gets a snapshot of *current* positions and applies *current* funding. **Keep the snapshot type narrow; the owning layer can have a wider type that includes everything.**

The doc comment makes the ownership boundary explicit: *"never owns or mutates them. The owning layer is responsible..."* — this is the contract between the funding crate and its callers.

No `Default` on `Position` — `AccountId::default()` would be `AccountId(0)`, which is reserved/sentinel in most account systems. **Don't accidentally allow default-construction of an entity-identity-bearing struct.**

### Step 5: Append `Settlement`

```rust
/// Output of applying a funding rate to one position. The bridge layer
/// translates these into balance updates against each account's quote
/// balance.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Settlement {
    pub account: AccountId,
    pub delta: Notional,
}
```

`Settlement` is the output type of `apply_funding`: one per non-flat position. It carries the account ID (so the bridge knows who) and the delta (so the bridge knows how much).

**Why does `Settlement` carry `account` again instead of being indexed by position order?** Because `apply_funding` filters zero-size positions out, the input position list and the output settlement list have *different lengths*. Indexing by position would require the caller to remember which positions had nonzero size; carrying the account ID in the output decouples them.

**This is the parallel-array vs struct-array tradeoff** — and Stage 8b chose struct-array. The cost is one redundant `AccountId` per settlement; the benefit is callers don't need to maintain index correspondence.

### Step 6: Append `FundingParams` + `hyperliquid_default`

```rust
/// Network parameters that govern funding cadence and magnitude.
///
/// `divisor` represents "settlements per day": HL settles 8 times per day,
/// so `premium / 8` is the per-interval rate. Higher divisor → smaller rate
/// per tick (and inverse: lower divisor concentrates the same daily target
/// rate into fewer payments).
///
/// `rate_cap` is the absolute maximum |rate| per interval. Production
/// networks set this to bound the worst-case payment an extreme oracle
/// dislocation can produce. Zero `rate_cap` disables funding entirely.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct FundingParams {
    pub interval_secs: u64,
    pub rate_cap: FundingRate,
    pub divisor: u32,
}

impl FundingParams {
    /// Hyperliquid-style defaults: 1-hour interval, ±4%/hour cap, 8× divisor.
    /// 8× divisor with a 1-hour interval means the *target* daily premium
    /// would be applied across 24 hours' worth of ticks at 1/8 of the premium
    /// each — i.e., 24/8 = 3× the premium per day. That asymmetry is
    /// intentional: HL caps more aggressively than the divisor alone implies.
    #[must_use]
    pub const fn hyperliquid_default() -> Self {
        Self {
            interval_secs: 3600,
            // 4% per interval = 40_000_000 ppb (since 0.04 × 1e9 = 4e7).
            rate_cap: FundingRate(40_000_000),
            divisor: 8,
        }
    }
}
```

Three fields, all `pub` for the same reason as the newtypes — `compute_rate` needs them all directly.

#### Why each HL default

- **`interval_secs: 3600`** — 1 hour. HL settles every hour; Binance Futures settles every 8 hours. The 1-hour cadence is short enough that traders feel funding pressure quickly when basis dislocates, long enough that block-time noise doesn't dominate.
- **`rate_cap: FundingRate(40_000_000)`** — 4%/interval. With 24 intervals/day this is `±96%/day` worst case; with the divisor below, effective worst is much lower. The cap is the *insurance policy* against oracle hijinks: an attacker who can move the index 50% transiently can't extract 50% from the longs in one tick.
- **`divisor: 8`** — 8 settlements per day (per HL's spec), but applied across **24** 1-hour intervals. The arithmetic in the doc comment is the load-bearing nuance: `(premium / 8) × 24 hours = 3 × premium/day`. **HL's caps are stricter than the divisor alone implies** — the divisor sets the cadence, but the cap binds the worst-case payment.

> 🛑 **Predict.** What's the effective worst-case daily payment with the HL defaults? Hint: `rate_cap = 4%/hour`, intervals per day = 24, but the divisor is 8.

(Answer: **`±96%/day` if every interval hits the cap.** The cap of 4% per *interval* applies regardless of the divisor. The divisor only affects the per-interval rate *before* clamping. So if the premium is so large that the post-divisor rate exceeds 4%, every hour clamps to 4%, and 24 hourly clamps × 4% = 96% per day. In practice, premiums that drive sustained 4%/interval clamping are pathological — HL has historically seen them only during oracle outages. **The cap is the floor on insurance cost, not the typical funding magnitude.**)

#### Why `const fn` on `hyperliquid_default`

`const fn` lets us write `static DEFAULT: FundingParams = FundingParams::hyperliquid_default();` if we ever want a compile-time constant. The cost is zero (it's a no-arg constructor of constants); the benefit is preserving the option.

#### Why `#[must_use]`

`#[must_use]` triggers a warning if a caller invokes `hyperliquid_default()` and discards the result. **For a function whose entire purpose is to produce a value, discarding the result is always a bug** — the warning catches a class of "I forgot to assign" mistakes.

### Step 7: Update `lib.rs` re-exports

The current re-export:

```rust
pub use types::{IndexPrice, MarkPrice, Notional, Premium, RATE_SCALE};
```

Replace with the complete list:

```rust
pub use types::{
    FundingParams, FundingRate, IndexPrice, MarkPrice, Notional, Position, PositionSize,
    Premium, Settlement, RATE_SCALE,
};
```

Alphabetical order maintained. 10 names total (9 types + `RATE_SCALE`). Callers can now write `use openhl_funding::{FundingParams, Position};` etc. without going through the `types` module.

### Step 8: Compile

```bash
cargo build -p openhl-funding
```

Expected output:

```
   Compiling openhl-funding v0.1.0 (/Users/.../my-openhl/crates/funding)
warning: unresolved link to `FundingClock`
    Finished `dev` profile [unoptimized + debuginfo] in 0.4s
```

**One rustdoc warning remaining** (from L0 we had 3; L1 still 3; L2 had 2; L3 has 1). The last unresolved link is `FundingClock` — resolved by L8.

Actually — depending on rustdoc's link-resolution behavior, the `[FundingRate]` and `[Premium]` cross-refs in the various doc comments may all resolve now (those types now exist). Verify with `cargo doc -p openhl-funding --no-deps`. The exact warning count may differ.

Common errors:

- **`error[E0432]: unresolved import 'openhl_clob::AccountId'`** — Cargo.toml dep not in place. Re-check L1's `[dependencies]` block has `openhl-clob = { path = "../clob" }`.
- **`error: cannot find type 'Notional' in this scope`** in `Settlement` — you didn't import the local type. `Notional` is in the same module, no `use` needed, but the type name must be spelled exactly.
- **`error: function calls are not allowed in const fn`** on `hyperliquid_default` — you wrote `FundingRate::from(40_000_000)` or similar. Use the tuple-struct literal `FundingRate(40_000_000)` directly.

## Design reflection

Four load-bearing decisions in this lesson:

1. **`FundingRate` is a separate type from `Premium` despite identical shape.** The newtype pattern enforces the pipeline stages — a premium can't be applied to positions without going through `compute_rate` first. **Same-shape-but-different-role is the canonical newtype use case.**

2. **`PositionSize` is a single signed integer, not direction + magnitude.** Smaller, faster, simpler math — and the doc comment is the contract for the sign convention. **Choose the densest representation that the math will use anyway.**

3. **`Position` is a snapshot type, not a stateful entity.** No entry price, no PnL, no history — just `(account, size)`. The owning layer tracks state; the funding crate processes snapshots. **Narrow downstream types; wide upstream types.**

4. **`FundingParams` bundles config that varies as a unit.** Three values that always travel together; expanding the bundle later doesn't break call sites. **Parameter object whenever the grouping is itself a domain concept.**

## Answer key

```bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/types.rs ./crates/funding/src/types.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
```

After L3:
- **types.rs** matches Stage 8b **completely** — all 9 types + `RATE_SCALE` + `hyperliquid_default`.
- **lib.rs** has the full type re-export; only the `compute` / `clock` re-exports are missing.

**Module 1 is complete.** From L4 onward we shift to `compute.rs` — pure functions over these types, with tests.

Return:

```bash
git checkout main
```

## Common questions

**Q: Why is `FundingParams::divisor` a `u32` and not `u64`?**
HL's divisor is 8. Other configurations might go to 24 (once-per-hour-as-the-divisor) or 1 (single daily settlement). Even pathological values stay well under `u32::MAX` (~4 billion). **`u32` is "more than enough" with half the bit cost of `u64`** — and `compute_rate` will widen to `i64` for the division anyway. Tiny optimization, but `Copy` types benefit.

**Q: Should `FundingParams` validate its fields in a constructor?**
Tempting — reject `interval_secs == 0` (would cause division-by-zero or perpetual gating)? Reject `divisor == 0`? Stage 8b chose not to: validation in a constructor means there's *another* validation point besides the caller's input handling, and divergence between the two becomes a bug source. **Single point of truth for input validation: the caller.** That said, `compute_rate` does handle `divisor == 0` as "funding disabled" — a defensive default, not a validation.

**Q: Why does `Position` derive `Eq` but not `Default`?**
`Eq` because positions are compared in tests (and possibly in some upstream dedup logic). `Default` would give `Position { account: AccountId(0), size: PositionSize(0) }`, which is nonsensical (`AccountId(0)` is typically a sentinel). **Defaults should produce sensible values; if they can't, omit the derive.**

**Q: Are the `Position` and `Settlement` types redundant — they both have `account` + a value field?**
They look similar but they're at different lifecycle stages. `Position` is an *input* to `apply_funding`; `Settlement` is its *output*. The owning layer hands you `Position`s and receives `Settlement`s back. **Type-level distinction prevents accidentally re-applying settlements as if they were positions.**

## Module 1 milestone — what you've built

After L3 you have:
- 9 newtypes + 1 struct-with-method (`FundingParams`).
- ~110 lines of `types.rs` matching Stage 8b exactly.
- A full vocabulary for talking about funding — every value in the math pipeline (premium, rate, settlement, position) has a type.
- Zero behavior yet. **Modules 2-3 add the behavior.**

## Next lesson (L4)

L4 starts `compute.rs`. We create the file with the module doc + `compute_premium` function — the first math in the crate. The function is 8 lines but encodes 3 design decisions: (a) handle `index == 0` by returning `Premium(0)` instead of erroring; (b) use `i128` intermediates to avoid overflow on the subtraction-times-scale; (c) saturate back to `i64` rather than wrapping. The lesson also adds the first 4 unit tests — premium-zero-when-equal, premium-positive/negative cases, and the `index == 0` saturation test. **First tests in the crate.**
````

---

## Seed-file slot

L3 lands in Module 1 at sortOrder 2 (closes the module):

```typescript
{
  title: 'Lesson 3 — Position types — finishing the roster + HL defaults',
  slug: 'openhl-funding-position-types-en',
  type: 'CONTENT',
  sortOrder: 2,
  duration: 35,
  xpReward: 70,
  content: `# Lesson 3 — Position types — finishing the roster + HL defaults\n\n...`
},
```

## SHA pinning discipline

L3 cites `cd94137` (Stage 8b). After L3, `types.rs` is byte-identical to Stage 8b. `lib.rs` has the full type re-export but no `compute` / `clock` re-exports yet (those come in L4 / L8).

## Style review notes (self-critique before paste)

- **§Goal frames L3 as the Module 1 milestone** — full type roster, zero behavior, transition to compute next.
- **§Predict on parameter-object pattern** earns the choice — readers who'd default to positional args will see the call-site stability argument.
- **§Step 1 anti-fluency on re-exporting `AccountId`** preempts the convenience-import temptation.
- **§Step 4 anti-fluency on entry_price** preempts the "shouldn't Position carry more?" reflex.
- **§Step 5 explanation of "why account again"** unpacks the parallel-array vs struct-array choice.
- **§Step 6 has named subsections for each HL default** — keeps the per-value rationale near the value.
- **§Step 6 predict on worst-case daily** is a useful arithmetic exercise that builds intuition for the cap semantics.
- **§Design reflection 1-4** each name a distinct generalizable pattern (separate-types-for-pipeline-stages, dense-representation, snapshot-vs-stateful, parameter-object).
- **§Common questions** address the "shouldn't we validate?" reflex with the single-point-of-truth argument.
- **§Module 1 milestone summary** celebrates the complete type roster.
- **L4 preview** is concrete: 8-line function, 3 design decisions, first 4 unit tests.
