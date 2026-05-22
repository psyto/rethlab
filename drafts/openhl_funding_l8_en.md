# Building OpenHL Funding — L8 draft (EN) — build-along

> Drafted against openhl SHA `cd94137` (Stage 8b — funding state machine).
> Course: `building-openhl-funding-en` (track: `reth-l1-architect`).

---

## L8 — `openhl-funding-clock-scaffold-en`

- **Module:** 3 (Clock state machine), sortOrder 0
- **Course-level sortOrder:** 8 (lesson 9 of 12)
- **Duration:** 35 min
- **XP reward:** 70
- **Type:** CONTENT

### Content

````markdown
# Lesson 8 — `FundingClock` — the discrete event loop

## Goal

Concepts you'll grasp in this lesson:

- **Discrete event loop over a pure function** — the clock's job is to call the math at the right times and not call it at the wrong times. The math itself is unchanged from Module 2; the clock adds *when*, not *what*.
- **`Option<FundingTick>` over always-return** — `None` cheaply signals "no state change" without forcing callers to inspect the tick. `if let Some(tick) = clock.tick(...)` is the natural shape; always-return would force `if !tick.settlements.is_empty()` checks that don't even capture the right meaning.
- **Layered composition without reimplementation** — `tick()` chains `compute_premium → compute_rate → apply_funding`; it knows the order, not the contents. Math computes, clock gates — separation of concerns at the file level.
- **Surface intermediates for telemetry** — `FundingTick` carries `premium` and `rate` even though only `settlements` drives state. Observers that want to log "rate at tick 12345 was 0.125%" read them directly; recomputing invites divergence.
- **Promise the contract in the module doc; defend it in code and tests** — both invariants (at-most-one-per-interval, no-catch-up) are named at the top of `clock.rs` before any code appears. L8 establishes structure; L9 + L10 enforce the invariants test-side. Three places to find the rationale: doc, code, test.
- **Single-threaded by contract** — concurrency belongs to the caller, not the data structure. `AtomicU64` for `last_settled_at` would add complexity for a serialization problem that doesn't actually exist at this layer.

Verification:

```bash
cargo test -p openhl-funding
```

…passes 18 tests (15 from L4-L7 + 3 new).

Specific changes:

The crate gains its **third and final module**:

- **`crates/funding/src/clock.rs`** — new file with the module doc + 2 structs + 1 impl block:
  - **`FundingClock`** — owns `params: FundingParams` and `last_settled_at: u64`. The state across funding ticks.
  - **`FundingTick`** — output type carrying `settled_at`, `premium`, `rate`, `settlements`. Returned from `tick()` on success.
  - **`impl FundingClock`** — `new`, `params`, `last_settled_at` accessors, and the `tick(...)` function.
- **3 sanity tests**:
  - `first_tick_before_interval_returns_none`
  - `first_tick_at_exact_interval_fires`
  - `empty_positions_yield_empty_settlements_but_still_advance_clock`
- **`crates/funding/src/lib.rs`** — declares `pub mod clock;` and re-exports `FundingClock` + `FundingTick`. **Last rustdoc warning resolves.**

L8 is the **module opener**. The invariants that make this clock subtle — *at most one settlement per interval*, *no catch-up after long gaps* — get their own dedicated lessons (L9 and L10). This lesson establishes the structure.

The teaching focus is **state machines with discrete event loops**: how a pure function (the math) gets gated by a stateful object (the clock) without losing determinism.

## Recap

After L7:
- 3 pure functions (`compute_premium`, `compute_rate`, `apply_funding`) all green.
- 15 tests passing including 2 proptests.
- `compute.rs` byte-identical to Stage 8b.
- The crate computes funding *math*; it doesn't yet know *when* to apply it.

L8 wires the "when." The clock is a thin layer that calls the math at the right times — and crucially, that *doesn't* call the math at the wrong times.

## Plan

Two file edits:

1. **Create `crates/funding/src/clock.rs`** — module doc + imports + `FundingClock` + `FundingTick` + `impl FundingClock { new, params, last_settled_at, tick }`.
2. **Add `#[cfg(test)] mod tests`** to `clock.rs` with 3 sanity tests.
3. **Update `crates/funding/src/lib.rs`** — `pub mod clock;` + re-export `FundingClock`, `FundingTick`.

> 🛑 **Predict.** Before scrolling: `tick()` will return `Option<FundingTick>` — `Some` if a settlement happened, `None` if not. **Why return `Option` instead of always returning `FundingTick` (with empty `settlements` when no settlement is due)?** Hint: think about what the caller does with the result.

(Answer: **`None` signals "no state change happened" without forcing the caller to inspect the result.** A caller wiring funding ticks into a block production loop wants to know cheaply whether to emit a `FundingApplied` event, log a settlement, etc. With `Option`, `if let Some(tick) = clock.tick(...)` is the natural shape. Always-returning would force the caller to check `if !tick.settlements.is_empty()` or similar — which doesn't even capture the right meaning (an empty settlement list could mean "tick fired but no positions" *or* "tick didn't fire"). **`Option` makes the dichotomy explicit at the type level.**)

## Walk-through

### Step 1: Create `clock.rs`

Create `crates/funding/src/clock.rs`. Initial content (top of file):

```rust
//! Funding clock — the gating state machine that decides *when* to settle.
//!
//! The rate math lives in [`crate::compute`]; this module is the discrete
//! event loop that calls it on the right cadence. Two invariants:
//!
//!   1. **At most one settlement per interval.** Two ticks at the same
//!      timestamp produce one settlement, not two.
//!   2. **No catch-up.** If `now` jumps forward by 10 intervals (validator
//!      reboot, chain pause), we settle *once*. Compounding 10 ticks of
//!      retroactive funding from a single stale snapshot would over-pay
//!      whichever side has been losing without giving the loser a chance
//!      to close. Production deployments that need catch-up logic should
//!      build it on top of repeated ticks with fresh snapshots, not here.

use crate::compute::{apply_funding, compute_premium, compute_rate};
use crate::types::{
    FundingParams, FundingRate, IndexPrice, MarkPrice, Position, Premium, Settlement,
};
```

Two parts to notice:

**The module doc names both invariants up front.** The actual enforcement is in `tick()` (interval guard) and the tests of L9 / L10. But the *contract* is here at the top — anyone reading the module sees both invariants before any code. **Promise the contract; defend it with code and tests below.**

**The imports pull in everything we'll need.** `apply_funding`, `compute_premium`, `compute_rate` (Module 2). `FundingParams`, `FundingRate`, `IndexPrice`, `MarkPrice`, `Position`, `Premium`, `Settlement` (Module 1). **Same logic as L4's compute.rs imports: stabilize boilerplate early.**

### Step 2: Add the `FundingClock` struct

After the imports:

```rust
/// State that persists across funding ticks. The clock is initialized with
/// the timestamp of its last settlement (often the chain's genesis time, or
/// the previous validator-set's last tick).
#[derive(Clone, Debug)]
pub struct FundingClock {
    params: FundingParams,
    last_settled_at: u64,
}
```

Two fields, both *private*:

1. **`params: FundingParams`** — the per-network config (interval_secs, rate_cap, divisor). Set at construction; can be read via `params()` but not mutated. **Immutable post-construction — production deployments don't change funding params mid-run.**

2. **`last_settled_at: u64`** — the timestamp of the most recent successful tick. Updated on every successful tick. **The only mutable state.**

`#[derive(Clone, Debug)]` only. **No `Copy`** because `Clone` is cheap-enough and we don't want to make the clock so easy to duplicate that someone forgets which copy advanced. **No `Eq`/`Hash`/`PartialOrd`** — clocks aren't meaningfully equal-comparable; they're operational state machines.

> 🛑 **Anti-fluency.** "Should we use `AtomicU64` for `last_settled_at` to support concurrent ticks?" **No — the funding crate is single-threaded by contract.** Concurrent funding ticks would race on `last_settled_at` *and* on `CLOB_STATE` *and* on whatever balance store the bridge uses downstream. The right answer is "the caller serializes ticks," not "the clock handles concurrency." **Pushing concurrency into the data structure adds complexity for a problem that shouldn't exist.**

### Step 3: Add `FundingTick`

After `FundingClock`:

```rust
/// The output of a successful tick. Returned by [`FundingClock::tick`] when
/// at least `params.interval_secs` have elapsed since the last settlement.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct FundingTick {
    pub settled_at: u64,
    pub premium: Premium,
    pub rate: FundingRate,
    pub settlements: Vec<Settlement>,
}
```

Four fields, all `pub`. **Output structs typically have all-public fields** because callers consume them directly — they're plain data, not encapsulated state.

What each field carries:

- **`settled_at: u64`** — the timestamp the tick was applied (= `now` argument to `tick()`).
- **`premium: Premium`** — the premium computed at this tick (for telemetry / event emission).
- **`rate: FundingRate`** — the per-interval rate after divisor + cap (also for telemetry).
- **`settlements: Vec<Settlement>`** — what `apply_funding` produced. The actual deltas to apply.

**Why include `premium` and `rate` if `settlements` is what the bridge needs?** Because telemetry needs them. An observer wanting to log "funding rate at tick 12345 was 0.125%" can read `tick.rate` directly. Without these fields, telemetry would have to recompute the rate — duplicate work, and the duplicate could disagree with the actual rate if either side changes. **Surface intermediate values in the output struct when downstream consumers want them.**

`PartialEq, Eq` derives for testability — tests can `assert_eq!(tick, expected)`. **Cheap and useful.**

### Step 4: Add the impl block

After `FundingTick`:

```rust
impl FundingClock {
    /// Construct a clock that thinks its last settlement happened at
    /// `genesis_time`. The first tick after `genesis_time + interval_secs`
    /// will fire.
    #[must_use]
    pub const fn new(params: FundingParams, genesis_time: u64) -> Self {
        Self {
            params,
            last_settled_at: genesis_time,
        }
    }

    #[must_use]
    pub const fn params(&self) -> FundingParams {
        self.params
    }

    #[must_use]
    pub const fn last_settled_at(&self) -> u64 {
        self.last_settled_at
    }

    /// Attempt a settlement. Returns `Some` only if at least one full
    /// `interval_secs` has elapsed since `last_settled_at`.
    ///
    /// On success, the clock advances to `now` (NOT to
    /// `last_settled_at + interval`) — see the "no catch-up" invariant in
    /// the module docs. Production callers wanting strict interval alignment
    /// can advance externally, but openhl's default is "settle on the first
    /// block ≥ interval boundary, then reset the deadline".
    pub fn tick(
        &mut self,
        now: u64,
        mark: MarkPrice,
        index: IndexPrice,
        positions: &[Position],
    ) -> Option<FundingTick> {
        if now < self.last_settled_at.saturating_add(self.params.interval_secs) {
            return None;
        }

        let premium = compute_premium(mark, index);
        let rate = compute_rate(premium, self.params);
        let settlements = apply_funding(positions, mark, rate);

        self.last_settled_at = now;

        Some(FundingTick {
            settled_at: now,
            premium,
            rate,
            settlements,
        })
    }
}
```

Four methods:

#### `new(params, genesis_time)`

Construct the clock. **`const fn`** so `static DEFAULT_CLOCK: FundingClock = FundingClock::new(...)` is possible at compile time. **`#[must_use]`** because constructing a clock and discarding it is always a bug.

The doc explains the timing semantics: "The first tick after `genesis_time + interval_secs` will fire." A caller setting `genesis_time = 1_000_000` and `interval_secs = 3600` knows the first tick fires at or after `1_003_600`. **No surprises.**

#### `params()` and `last_settled_at()` accessors

Read-only access to the private fields. **`const fn`** + **`#[must_use]`** for both. Returning by value (not `&FundingParams`) because `FundingParams: Copy`. **Copy-cheap, no lifetime gymnastics for callers.**

#### `tick(&mut self, now, mark, index, positions)`

The heart of the clock. Three logical phases stack as **temporal guard → stateless compute → state update**, and that ordering *is* the crate's layered composition:

```
【 FundingClock::tick(&mut self, now, mark, index, positions) 】

  1. Guard (temporal-control layer)
     ┌────────────────────────────────────────────────────────────────────┐
     │ if now < last_settled_at + interval_secs                           │
     │     return None     ◄── quiet exit; no state change                │
     └────────────────────────────────────────────────────────────────────┘
              │ (proceed only past the guard)
              ▼

  2. Compute (stateless layer — composition of Module 2's functions)
     ┌────────────────────────────────────────────────────────────────────┐
     │   (mark, index)        ──► compute_premium  ──► Premium             │
     │                                                    │                │
     │   (premium, params)    ──► compute_rate     ──► FundingRate         │
     │                                                    │                │
     │   (positions, mark, rate) ──► apply_funding ──► Vec<Settlement>     │
     │                                                                     │
     │   ※ none of these read or write clock state. All pure.              │
     └────────────────────────────────────────────────────────────────────┘
              │
              ▼

  3. State update + return (output layer)
     ┌────────────────────────────────────────────────────────────────────┐
     │ self.last_settled_at = now;     ◄── reset the next deadline         │
     │ return Some(FundingTick {                                           │
     │     settled_at: now, premium, rate, settlements,                    │
     │ });                                                                 │
     └────────────────────────────────────────────────────────────────────┘
```

"**The clock gates time, Module 2's math computes values, the output layer advances state and returns**" — that separation of concerns reads top-to-bottom in `tick`'s body. Three logical phases:

1. **Guard**: `if now < self.last_settled_at.saturating_add(self.params.interval_secs) { return None; }`. The `saturating_add` defends against `u64` overflow when `last_settled_at` is near `u64::MAX` (pathological, but free to defend).

2. **Compute**: chain the three Module 2 functions. `compute_premium(mark, index)` → `compute_rate(premium, params)` → `apply_funding(positions, mark, rate)`. **The clock composes them; it doesn't reimplement anything.**

3. **Update state + return**: advance `last_settled_at` to `now`, return `Some(FundingTick { ... })`.

**Crucially, the clock advances to `now`, not to `last_settled_at + interval_secs`.** This is the "no catch-up" invariant in action — when ticks fire late, they reset the deadline forward rather than catching up. L10's lesson explains why this matters.

> 🛑 **Predict.** With `last_settled_at = 1_000_000`, `interval_secs = 3600`, and a `tick()` at `now = 1_010_000` (= +10000s, i.e., ~2.8 intervals), what's `last_settled_at` after the tick?

(Answer: **`1_010_000`.** Not `1_003_600` (1 interval after genesis) and not `1_007_200` (2 intervals after genesis). The clock advances to `now` — see the doc comment in `tick()`. The next tick won't fire until `now ≥ 1_010_000 + 3600 = 1_013_600`. **This is the design choice; L10 explains the reasoning.**)

### Step 5: Add 3 sanity tests

After the `impl FundingClock` block:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{Notional, PositionSize};
    use openhl_clob::AccountId;

    fn pos(account: u64, size: i64) -> Position {
        Position {
            account: AccountId(account),
            size: PositionSize(size),
        }
    }

    fn balanced_book() -> Vec<Position> {
        vec![pos(1, 100), pos(2, -100)]
    }

    #[test]
    fn first_tick_before_interval_returns_none() {
        let params = FundingParams::hyperliquid_default(); // 3600s interval
        let mut clock = FundingClock::new(params, 1_000_000);

        // 3599 seconds later — not enough.
        let out = clock.tick(1_003_599, MarkPrice(100), IndexPrice(100), &balanced_book());
        assert!(out.is_none());
        // Clock didn't advance.
        assert_eq!(clock.last_settled_at(), 1_000_000);
    }

    #[test]
    fn first_tick_at_exact_interval_fires() {
        let params = FundingParams::hyperliquid_default();
        let mut clock = FundingClock::new(params, 1_000_000);

        let out = clock
            .tick(1_003_600, MarkPrice(100), IndexPrice(100), &balanced_book())
            .expect("tick should fire at exact interval boundary");
        assert_eq!(out.settled_at, 1_003_600);
        // mark == index → zero rate → empty settlements
        assert_eq!(out.rate, FundingRate(0));
        assert!(out.settlements.is_empty());
        assert_eq!(clock.last_settled_at(), 1_003_600);
    }

    #[test]
    fn empty_positions_yield_empty_settlements_but_still_advance_clock() {
        let params = FundingParams::hyperliquid_default();
        let mut clock = FundingClock::new(params, 1_000_000);

        let out = clock
            .tick(1_003_600, MarkPrice(101), IndexPrice(100), &[])
            .expect("tick fires regardless of position count");
        assert!(out.settlements.is_empty());
        // But the rate was still computed — useful for telemetry.
        assert_eq!(out.rate, FundingRate(1_250_000));
        assert_eq!(clock.last_settled_at(), 1_003_600);
    }
}
```

Three things to notice about the test setup:

**The test module imports `Notional` and `PositionSize`** even though only `PositionSize` is used in this file (`Notional` is used in L9). Same boilerplate-stabilization pattern as L5's test module.

**Two helpers: `pos(account, size)` and `balanced_book()`.** The first echoes L5's helper. The second produces a canonical 2-position book that L8/L9 tests use repeatedly. **Helpers earn their keep when they're used in 3+ tests** — both these helpers are.

**Three tests, three concerns:**

1. **`first_tick_before_interval_returns_none`** — the guard works. Calling tick before the interval has elapsed → `None`. The clock state is unchanged. **Catches: "I forgot to guard" or "I always returned Some."**

2. **`first_tick_at_exact_interval_fires`** — the boundary inclusive. At `genesis + interval_secs` exactly, the tick fires. Catches off-by-one in the guard condition (`<` vs `<=`). The body verifies the math composition: `mark == index` → `Premium(0)` → `FundingRate(0)` → empty settlements.

3. **`empty_positions_yield_empty_settlements_but_still_advance_clock`** — the composition works even with zero positions. `apply_funding(&[])` returns empty; the clock still advances. **Catches: "I gated tick() on having positions"** or any other shortcut that mishandles the empty-input case.

> 🛑 **Anti-fluency.** "Should we test what happens if `mark` or `index` is zero?" **Already covered by L4's premium tests.** The clock just passes inputs through to `compute_premium`. If we didn't trust `compute_premium`, we'd add more tests in `compute.rs`, not duplicate them here. **Don't test the same behavior through two abstraction levels.**

### Step 6: Update `lib.rs`

Current state:

```rust
//! ...

pub mod compute;
pub mod types;

pub use compute::{apply_funding, compute_premium, compute_rate};
pub use types::{ ... };
```

Add the clock module:

```rust
//! ...

pub mod clock;
pub mod compute;
pub mod types;

pub use clock::{FundingClock, FundingTick};
pub use compute::{apply_funding, compute_premium, compute_rate};
pub use types::{ ... };
```

Module declarations stay alphabetical (`clock` before `compute` before `types`). Re-exports likewise. **L8's lib.rs is the final lib.rs shape** — L9 and L10 don't add any new module-level names.

### Step 7: Run tests

```bash
cargo test -p openhl-funding
```

Expected:

```
   Compiling openhl-funding v0.1.0 (/Users/.../my-openhl/crates/funding)
    Finished `test` profile [unoptimized + debuginfo] in 0.6s

running 18 tests
test clock::tests::empty_positions_yield_empty_settlements_but_still_advance_clock ... ok
test clock::tests::first_tick_at_exact_interval_fires ... ok
test clock::tests::first_tick_before_interval_returns_none ... ok
test compute::tests::... (all 15 from L4-L7)

test result: ok. 18 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

**18 tests, no rustdoc warnings.** The crate's documentation is now complete.

Common errors:

- **`tick` fires for `now == last_settled_at + interval - 1`** — you used `<=` instead of `<` in the guard, or `>` instead of `>=` in the inverted form. The intended semantic: "fire if `now >= last_settled_at + interval`," which negated for the guard is `if now < last_settled_at + interval { return None; }`.
- **`tick` doesn't advance `last_settled_at`** — you forgot the `self.last_settled_at = now;` line before `Some(FundingTick { ... })`. The next tick would refire immediately.
- **`out.settlements` is non-empty** in `empty_positions...` test — `apply_funding(&[])` should return empty. Trace: the early-return on `rate.0 == 0` returns an empty vec, *and* an empty positions slice would skip the loop entirely. Either path yields empty.
- **Borrow checker error on `clock.tick(...).expect(...)` followed by `clock.last_settled_at()`** — `tick` takes `&mut self`; the borrow ends when the expression completes. If you assigned the result to a variable and then called `clock.last_settled_at()` *before* dropping the result, the borrow would be live. Solution: `let out = clock.tick(...); assert_eq!(clock.last_settled_at(), ...); ` — the `let` ends the borrow at the end of the call. Concretely, here are the two shapes the trap-and-fix actually take:

  ```rust
  // ❌ Pulling a field straight off the method chain in one statement.
  //    The temporary returned by .expect() lives until the statement's `;`,
  //    and during that whole window `clock` is still mutably borrowed
  //    → the next line collides immediately.
  let settlements = clock
      .tick(now, mark, index, &positions)
      .expect("tick fired")
      .settlements;
  let last = clock.last_settled_at(); // error[E0502]: cannot borrow `clock` as immutable
                                       //               because it is also borrowed as mutable

  // 🟢 Bind the result first → the mutable borrow ends at this statement's `;`
  //    → the next line is free to take an immutable borrow.
  let out = clock
      .tick(now, mark, index, &positions)
      .expect("tick fired");
  assert_eq!(clock.last_settled_at(), now); // OK: the mutable borrow already ended
  let settlements = out.settlements;        // `out` is owned, free to destructure
  ```

  The rule under the hood is "an `&mut self` borrow lives until the statement's `;`." Chaining all the way to a field access keeps the `FundingTick` temporary alive across the whole statement, and with it the mutable borrow on `clock`. Splitting via `let out = ...;` releases that borrow at the `;`, letting the subsequent read of `clock` proceed.

## Design reflection

Five load-bearing decisions in this lesson:

1. **`Option<FundingTick>` instead of always-return.** `None` cheaply signals "no state change." Callers don't need to inspect a `FundingTick` to decide whether anything happened. **Use the type system to encode the "did this fire?" dichotomy.**

2. **Clock advances to `now`, not `last_settled + interval`.** The first big difference from "perfectly periodic" — the clock's deadline resets on every fire, regardless of how much elapsed. **L10 will defend this; here we just note it.**

3. **Module 2 functions composed without reimplementation.** `tick()` chains `compute_premium`, `compute_rate`, `apply_funding`. The clock doesn't know how any of them work — only the order. **Layering: math computes; clock gates.**

4. **`FundingTick` exposes intermediate values for telemetry.** Premium and rate are surfaced in the output, not just the final settlements. Downstream observers don't need to recompute. **Surface useful intermediates; recomputation invites divergence.**

5. **Module doc names both invariants up front.** The actual code that enforces them comes piece by piece (L8 guard, L9 boundary tests, L10 advancement choice). But the *contract* is documented before any of the code. **Documentation as design intent.**

## Answer key

```bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/clock.rs ./crates/funding/src/clock.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
```

After L8:
- **clock.rs** matches Stage 8b through `FundingClock` + `FundingTick` + `impl FundingClock { ... }` + 3 of the 7 tests. The remaining 4 tests are split across L9 (3 tests on interval-gating + premium-driving) and L10 (1 milestone test on no-catch-up).
- **lib.rs** matches Stage 8b **exactly**. Final shape.

Return:

```bash
git checkout main
```

## Common questions

**Q: Why is `tick` `&mut self` instead of consuming `self` and returning `(Self, Option<FundingTick>)`?**
Pragmatism. `&mut self` is the canonical Rust pattern for mutating in-place. Consuming-and-returning would force the caller to reassign: `clock = clock.tick(...)`. That's verbose for no semantic benefit. **`&mut self` for state machines that mutate; consuming for ones that genuinely transform.** A funding clock is the former.

**Q: Should `FundingClock` track the *number* of ticks (e.g., for telemetry)?**
You could add a `ticks_fired: u64` counter. Stage 8b doesn't — the caller can count externally if they care. **Don't add state to a minimal struct without a concrete consumer.** Adding it later is one struct field change; removing unused state is a breaking API change.

**Q: Why does `tick` take `mark`, `index`, `positions` as arguments instead of having them on the clock?**
Because they change every tick. `mark` and `index` come from oracle/orderbook reads at tick time; `positions` is a fresh snapshot. Storing them on the clock would require the caller to update them before calling `tick` — which is the same shape, with more steps. **Inputs that change per call go in the call; inputs that persist go on the receiver.**

**Q: Why no proptest for the clock?**
The clock's properties are mostly *interval semantics* (one settlement per interval, no catch-up) which are easier to express as hand-traced tests. There's no algebraic property like the antisymmetry or zero-sum of Module 2. **The clock is an event loop; event loops are tested with scenarios, not algebra.**

## Next lesson (L9)

L9 adds 3 more tests to `clock.rs`, exercising the **interval-gating invariant** in increasing depth:

- `premium_drives_settlement_signs` — when mark > index, settlements flow long→short (full math composition test).
- `second_tick_requires_another_full_interval` — after a successful tick, the next one needs another `interval_secs`. The interval isn't a one-time check.
- `capped_rate_when_premium_extreme` — at saturation premiums, the rate clamps to the cap. Confirms `compute_rate`'s cap behavior surfaces correctly through the clock.

The lesson is mostly about *testing* and the *interval-gating* invariant. **L10 closes Module 3 with the no-catch-up invariant.**
````

---

## Seed-file slot

L8 lands in Module 3 (Clock state machine) at sortOrder 0:

```typescript
{
  title: 'Lesson 8 — FundingClock — the discrete event loop',
  slug: 'openhl-funding-clock-scaffold-en',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 35,
  xpReward: 70,
  content: `# Lesson 8 — \`FundingClock\` — the discrete event loop\n\n...`
},
```

## SHA pinning discipline

L8 cites `cd94137` (Stage 8b). After L8, clock.rs matches Stage 8b through structures + impl + 3 of 7 tests; the remaining 4 split across L9 (3 tests) and L10 (1 milestone test). lib.rs matches Stage 8b exactly.

## Style review notes (self-critique before paste)

- **§Goal frames L8 as Module 3 opener** + last rustdoc warning resolution.
- **§Predict on `Option` vs always-return** earns the design choice.
- **§Step 1's "Promise the contract; defend it with code below"** is the pedagogical frame for module docs.
- **§Anti-fluency on AtomicU64** preempts the "what about concurrency?" reflex.
- **§Step 3's "why include premium and rate in the output"** explains the telemetry rationale.
- **§Step 4 has 4 named subsections for the 4 methods**.
- **§Predict on clock advancement** previews L10's design choice without giving away the rationale.
- **§Step 5 explains what each test catches**.
- **§Anti-fluency on testing `mark == 0`** preempts the cross-layer-duplication reflex.
- **§Design reflection 1-5** name distinct patterns (option-for-fire, advance-to-now, layered-composition, telemetry-intermediates, doc-as-design).
- **§Common questions** address `&mut self` vs consuming, tick counting, argument placement, proptest absence.
- **L9 preview** is concrete: 3 tests, interval-gating invariant focus.
