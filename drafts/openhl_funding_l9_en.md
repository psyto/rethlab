# Building OpenHL Funding — L9 draft (EN) — build-along

> Drafted against openhl SHA `cd94137` (Stage 8b — funding state machine).
> Course: `building-openhl-funding-en` (track: `reth-l1-architect`).

---

## L9 — `openhl-funding-interval-invariant-en`

- **Module:** 3 (Clock state machine), sortOrder 1
- **Course-level sortOrder:** 9 (lesson 10 of 12)
- **Duration:** 30 min
- **XP reward:** 60
- **Type:** CONTENT

### Content

````markdown
# Lesson 9 — Interval-gating invariant — three deeper tests

## Goal

Concepts you'll grasp in this lesson:

- **Single-call tests verify behavior; multi-call tests verify state machines** — L8 confirmed the guard can return `Some` once. L9's `second_tick_requires_another_full_interval` confirms the guard *re-engages* after firing. A buggy implementation could fire once and never gate again; you need three sequential calls to catch that.
- **Composition tests catch wiring errors** — even when every step is unit-tested, the wiring between steps is a separate concern. `tick()` could call `apply_funding` before `compute_rate`, or pass `index` where `mark` is expected. A full math composition test (`premium_drives_settlement_signs`) catches what unit tests can't.
- **Invariants must be re-verified at every layer they traverse** — `compute_rate`'s cap is unit-tested in L6, but `capped_rate_when_premium_extreme` re-verifies it through `tick()`. A wiring bug (e.g., overwriting `params.rate_cap` mid-call) would slip past lower-layer tests.
- **Boundary tests as pairs: just-before and exactly-at** — `now == last_settled_at + interval - 1` (none) and `now == last_settled_at + interval` (fires) is the standard pair. Both directions catch off-by-one in the guard condition. Adding `+1` doesn't catch a different class of bug.
- **Failure leaves state unchanged** — when `tick()` returns `None`, `last_settled_at` stays put. Three sequential calls (fire, gated, fire) reveal this sub-invariant by the success time of the third call.

Verification:

```bash
cargo test -p openhl-funding
```

…passes 21 tests (18 from L4-L8 + 3 new).

Specific changes:

**No new production code.** The three new tests deepen our coverage of clock semantics across multiple operations:

- **`premium_drives_settlement_signs`** — full math composition flows through the clock. mark > index → positive premium → settlement signs match.
- **`second_tick_requires_another_full_interval`** — interval-gating is persistent across ticks. A successful tick doesn't permanently unlock the clock.
- **`capped_rate_when_premium_extreme`** — `compute_rate`'s cap behavior surfaces correctly through `tick()`. Layers compose without losing semantics.

The teaching focus is **invariants across multiple operations**, not just one. L8's tests verified the guard works *once*; L9's tests verify it works *across ticks* and that the layered composition doesn't introduce subtle bugs.

## Recap

After L8:
- `FundingClock` exists with `tick()` returning `Option<FundingTick>`.
- 3 sanity tests confirm: guard works, boundary fires, empty positions still advance.
- All 3 Module 2 functions compose through `tick()`.

L8's tests run the clock at most *once*. L9 exercises the clock across multiple calls, with non-trivial inputs, to validate the **invariant holds beyond a single operation**.

## Plan

One file edit:

1. **Append 3 tests to `crates/funding/src/clock.rs`** — inside the existing `#[cfg(test)] mod tests` block, after the 3 sanity tests from L8.

No production code, no `lib.rs` changes, no imports beyond what L8 already added.

> 🛑 **Predict.** Before scrolling: L8's `first_tick_at_exact_interval_fires` test fires `tick(1_003_600, ...)` once and asserts it returned `Some`. Why isn't that enough to verify the interval-gating invariant?

(Answer: **One successful tick says the guard *can* return `Some`. It doesn't say the guard *re-engages* afterward.** A buggy implementation could fire on the first interval boundary, then never gate again — every subsequent `tick()` would return `Some` regardless of time. The invariant "at most one settlement per interval" requires testing that the second tick is rejected unless another full interval has passed. **Single-operation tests verify behavior; multi-operation tests verify state machines.**)

## Walk-through

### Step 1: Add `premium_drives_settlement_signs`

After the L8 tests in `mod tests`, add:

```rust
    #[test]
    fn premium_drives_settlement_signs() {
        let params = FundingParams::hyperliquid_default();
        let mut clock = FundingClock::new(params, 1_000_000);

        // mark 101, index 100 → premium = 0.01 = 10_000_000 ppb
        // rate = 10_000_000 / 8 = 1_250_000 ppb
        // long size 100 * mark 101 * rate / RATE_SCALE = 100*101*1.25e6 / 1e9
        // = 1.2625e10 / 1e9 = 12 (floor)
        // long pays → -12; short receives → +12.
        let out = clock
            .tick(1_003_600, MarkPrice(101), IndexPrice(100), &balanced_book())
            .expect("tick should fire");

        assert_eq!(out.premium, Premium(10_000_000));
        assert_eq!(out.rate, FundingRate(1_250_000));
        assert_eq!(out.settlements.len(), 2);
        assert_eq!(out.settlements[0].delta, Notional(-12));
        assert_eq!(out.settlements[1].delta, Notional(12));
    }
```

This is **the full math composition test** for the clock. Every Module 2 function gets exercised in sequence:

1. `compute_premium(MarkPrice(101), IndexPrice(100))` → `Premium(10_000_000)` (1% premium).
2. `compute_rate(Premium(10_000_000), hyperliquid_default)` → `FundingRate(1_250_000)` (0.125%, after divisor 8).
3. `apply_funding(&[Pos(1, 100), Pos(2, -100)], MarkPrice(101), FundingRate(1_250_000))` → `[Settlement(-12), Settlement(+12)]`.

**The 5-line block comment is the paper math.** Anyone debugging this test can verify the arithmetic by hand: `100 × 101 × 1_250_000 = 12_625_000_000`. Divided by `RATE_SCALE = 1_000_000_000` (with integer rounding toward zero), that's `12`. With the sign flip from `apply_funding`, long gets `-12`, short gets `+12`. **The comment is documentation; tests are the spec.**

**Why does this test exist if every step is already tested individually?** Because composition is its own concern. `tick()` could conceivably call the wrong function in the wrong order — e.g., `apply_funding` before `compute_rate`, or pass `index` where `mark` is expected. **Composition tests catch wiring errors that unit tests miss.**

> 🛑 **Anti-fluency.** "This test duplicates `apply_funding`'s tests. Should we drop the per-account assertions and just check `out.rate`?" **No.** The point of this test is the *composition*. If `apply_funding`'s tests pass but `premium_drives_settlement_signs` fails, the bug is in how `tick()` wires the calls — not in `apply_funding`. **Each layer needs its own composition tests.** Three layers deep, that's three composition tests at minimum.

### Step 2: Add `second_tick_requires_another_full_interval`

After `premium_drives_settlement_signs`:

```rust
    #[test]
    fn second_tick_requires_another_full_interval() {
        let params = FundingParams::hyperliquid_default();
        let mut clock = FundingClock::new(params, 1_000_000);

        // First tick at +3600.
        clock
            .tick(1_003_600, MarkPrice(101), IndexPrice(100), &balanced_book())
            .expect("first tick fires");

        // +3599 from first tick → not enough.
        let early = clock.tick(1_007_199, MarkPrice(101), IndexPrice(100), &balanced_book());
        assert!(early.is_none());

        // +3600 from first tick → fires.
        let on_time = clock.tick(1_007_200, MarkPrice(101), IndexPrice(100), &balanced_book());
        assert!(on_time.is_some());
    }
```

**Three tick calls, three assertions.** The structure tells the story:

1. **First tick at `1_003_600`** — fires (boundary case from L8). After this, `last_settled_at = 1_003_600`.
2. **Second tick at `1_007_199`** — `1_007_199 - 1_003_600 = 3599`. One second short of an interval. Returns `None`.
3. **Third tick at `1_007_200`** — `1_007_200 - 1_003_600 = 3600`. Exactly an interval. Returns `Some`.

**The invariant being tested**: "the interval guard re-engages after every successful tick." A naive implementation that only checks against `genesis_time` (instead of `last_settled_at`) would fire on every tick after `1_003_600` — and this test catches it.

**The minimal counterexample**: between L8's `first_tick_at_exact_interval_fires` and L9's `second_tick_requires_another_full_interval`, the only thing being verified is that `last_settled_at` is the *gating reference*, not `genesis_time`. **Three calls is the minimum to test state-machine persistence.**

> 🛑 **Predict.** What's `clock.last_settled_at()` after each of the three ticks above?

(Answer:
- After tick 1 (success): `1_003_600`.
- After tick 2 (None — gated): unchanged, still `1_003_600`.
- After tick 3 (success): `1_007_200`.

**The clock doesn't advance on a gated call.** That's the second part of the interval-gating invariant: failure leaves state unchanged. The test doesn't explicitly assert `last_settled_at` after tick 2, but the success of tick 3 at exactly `1_003_600 + 3600` implies it.)

### Step 3: Add `capped_rate_when_premium_extreme`

After `second_tick_requires_another_full_interval`:

```rust
    #[test]
    fn capped_rate_when_premium_extreme() {
        let params = FundingParams::hyperliquid_default();
        let mut clock = FundingClock::new(params, 1_000_000);

        // mark 200, index 100 → premium = 1.0 = 1e9 ppb
        // raw rate = 1e9 / 8 = 1.25e8; cap = 4e7 → clamps to 4e7.
        let out = clock
            .tick(1_003_600, MarkPrice(200), IndexPrice(100), &balanced_book())
            .unwrap();
        assert_eq!(out.rate, FundingRate(40_000_000));
    }
```

**Tests that `compute_rate`'s cap clamps correctly when called through `tick()`.** The math:

1. `compute_premium(MarkPrice(200), IndexPrice(100))` → `Premium(1_000_000_000)` (100% premium).
2. `compute_rate(Premium(1_000_000_000), {divisor=8, cap=40M})` → raw = `1_000_000_000 / 8 = 125_000_000`. After clamp to `±40_000_000` → `FundingRate(40_000_000)`.

**Why does this test exist if `compute_rate`'s tests already cover clamping?** Because we need to know `tick()` doesn't unwrap, fiddle with, or bypass the rate before applying it. **The cap surfaces through the clock unchanged.**

A subtle wiring bug — say, `compute_rate(premium, FundingParams { rate_cap: FundingRate(0), ..params })` — would break this test (zero cap → zero rate → no settlements at all). **The composition test catches what unit tests can't.**

### Step 4: Run tests

```bash
cargo test -p openhl-funding
```

Expected:

```
running 21 tests
test clock::tests::capped_rate_when_premium_extreme ... ok
test clock::tests::empty_positions_yield_empty_settlements_but_still_advance_clock ... ok
test clock::tests::first_tick_at_exact_interval_fires ... ok
test clock::tests::first_tick_before_interval_returns_none ... ok
test clock::tests::premium_drives_settlement_signs ... ok
test clock::tests::second_tick_requires_another_full_interval ... ok
... (15 tests from L4-L7 compute.rs)

test result: ok. 21 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

**21 tests, all green.** 6 of them now live in `clock::tests` (3 from L8 + 3 from L9).

Common errors:

- **`premium_drives_settlement_signs` fails with `Notional(-13)` or `Notional(-11)`** — off-by-one from rounding. Re-check the math: `100 × 101 × 1_250_000 = 12_625_000_000`. Divided by `1_000_000_000` is `12.625`. Integer division truncates toward zero → `12`. The sign flip → `-12`. If your number is different, check whether you're using `*` (which panics on debug overflow), `saturating_mul`, or `wrapping_mul`.
- **`second_tick_requires_another_full_interval` fails on the second tick** — your guard is comparing to `genesis_time` instead of `last_settled_at`. Re-read the L8 code: the guard is `now < self.last_settled_at.saturating_add(...)`, *not* `now < self.params.genesis_time + ...`.
- **`capped_rate_when_premium_extreme` returns `FundingRate(125_000_000)`** — your `compute_rate` isn't clamping. Re-check L6: the `raw.clamp(-cap, cap)` line should be present.

## Design reflection

Four load-bearing decisions in this lesson:

1. **Composition tests catch wiring errors.** Even when every step is unit-tested, the wiring between steps is a separate concern. **A 3-step pipeline needs at least 3 composition tests (one for each step's correct placement) plus a multi-step composition test.** `premium_drives_settlement_signs` is the latter.

2. **State machines need multi-call tests.** A single operation can satisfy an invariant by accident; only multiple operations confirm the state machine enforces it consistently. **`second_tick_requires_another_full_interval` exists because `first_tick_at_exact_interval_fires` alone is insufficient.**

3. **Boundary tests at every gate.** Both the inclusive boundary (`now == last_settled_at + interval`) and the exclusive boundary (`now == last_settled_at + interval - 1`) need to be tested. **One-second-short and one-second-after are the standard pair.**

4. **Each layer's invariants need their own surface tests.** `compute_rate` tests prove the cap clamps. `tick` tests prove the cap *survives* the composition. **Composition can lose semantics; verify each invariant at every layer it traverses.**

## Answer key

```bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/clock.rs ./crates/funding/src/clock.rs
```

After L9:
- **clock.rs** matches Stage 8b through 6 of 7 tests. Only `no_catchup_after_long_gap` remains — that's L10's milestone test.

Return:

```bash
git checkout main
```

## Common questions

**Q: Why does `second_tick_requires_another_full_interval` not also test `+3601`?**
Because `+3600` exactly *and* `+3599` together pin both sides of the boundary. `+3601` would just be slightly more than `+3600` — same direction. **Two boundary cases (just-before and exactly-at) suffice.** Adding more cases doesn't catch a different class of bug.

**Q: Could we have caught the "genesis vs last_settled_at" bug with a proptest?**
You could — random `(t1, t2)` pairs with `t2 < t1 + interval` should produce `None` on the second tick. But the hand-traced test makes the intent clearer: "after a tick at `t1`, the next tick at `t1 + 3599` is gated." Proptests excel at properties; hand-traced tests excel at named scenarios. **State-machine behaviors are usually scenarios.**

**Q: Why does the test not include a third tick at, say, +7200 (two intervals after first)?**
Because that wouldn't add information. The second tick at `+3600` already establishes that the clock fires at the correct cadence; a third tick is just more of the same. **Tests should distinguish themselves by what they verify**, not by adding repetition.

**Q: What if the test author had `genesis_time = 0` instead of `1_000_000`?**
The math would be identical, but the test would be less helpful. Using `1_000_000` (and the corresponding `1_003_600`, etc.) makes the "clock advanced by 3600 seconds" pattern visible at every assertion. **Test data should be readable, not just correct.**

## Next lesson (L10)

L10 closes Module 3 with the **no-catch-up invariant**: the milestone test `no_catchup_after_long_gap`. The scenario: validator reboots after 10 hours of downtime, so `now - last_settled_at = 36000` (10 intervals). The naive expectation might be "catch up by replaying 10 ticks," but the design choice is to **settle once and advance to `now`**. The lesson explains why catch-up would be worse than skipping ticks, and the test confirms the design choice is enforced. **One test, one invariant, the design philosophy in action.**
````

---

## Seed-file slot

L9 lands in Module 3 at sortOrder 1:

```typescript
{
  title: 'Lesson 9 — Interval-gating invariant — three deeper tests',
  slug: 'openhl-funding-interval-invariant-en',
  type: 'CONTENT',
  sortOrder: 1,
  duration: 30,
  xpReward: 60,
  content: `# Lesson 9 — Interval-gating invariant — three deeper tests\n\n...`
},
```

## SHA pinning discipline

L9 cites `cd94137` (Stage 8b). After L9, clock.rs matches Stage 8b through 6 of 7 tests. The remaining test (`no_catchup_after_long_gap`) is L10's milestone.

## Style review notes (self-critique before paste)

- **§Goal frames L9 as "no new production code"** — readers know to focus on testing patterns rather than implementation.
- **§Predict on why L8's single-tick test isn't enough** earns the multi-call testing principle.
- **§Step 1 explains the paper math in the test block comment** — readers can verify by hand.
- **§Anti-fluency on "this duplicates apply_funding's tests"** preempts the test-redundancy reflex with the composition-tests argument.
- **§Step 2 narrates the test in three numbered tick calls** — readers see the temporal structure.
- **§Predict on `clock.last_settled_at()` after each tick** earns the "failure leaves state unchanged" sub-invariant.
- **§Step 3 explains the math and the wiring concern** — readers see why composition tests catch what unit tests miss.
- **§Design reflection 1-4** name distinct patterns (composition-tests-catch-wiring, multi-call-for-state-machines, boundary-at-every-gate, invariants-at-every-layer).
- **§Common questions** address boundary symmetry, proptest applicability, repetition value, test data readability.
- **L10 preview** is concrete: 1 milestone test, no-catch-up design philosophy.
