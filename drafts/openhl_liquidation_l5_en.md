# Building OpenHL Liquidation — L5 draft (EN) — build-along

> openhl SHA `22eedf9` (Stage 10a — liquidation margin math).

## L5 — `openhl-liquidation-equity-ratio-en`

**Stage**: Stage 10a — `22eedf9`

**Title**: Lesson 5 — `account_equity` + `margin_ratio` — and the proptest that breaks your first mental model

**Duration**: 60 min · **XP**: 100

---

````markdown
# Lesson 5 — `account_equity` + `margin_ratio` — and the proptest that breaks your first mental model

## Goal

Concepts you'll grasp in this lesson:

- **Why `account_equity` returns `i64` and can be negative** — equity is `collateral + unrealized_pnl`. The PnL leg can blow through deposited collateral and produce a deficit; the engine has to can *measure* that deficit so liquidation can pull the right lever.
- **Why `margin_ratio` guards `notional == 0` with `MarginRatio(i64::MAX)`** — flat positions have no exposure, so no margin requirement applies. Returning the maximum representable ratio signals "infinitely safe" and lets every downstream classifier short-circuit naturally.
- **The i128-scaling discipline for `equity × MARGIN_SCALE / notional`** — order of operations matters: multiply first in `i128` so the high-precision numerator survives the divide. Doing the divide first in `i64` loses precision for small ratios.
- **The leveraged-regime non-monotonicity of `margin_ratio`** — your first intuition ("as mark increases for a long, margin_ratio increases") is **wrong in the cash-heavy regime** where `collateral > entry × size`. The proptest will catch this — and the fix isn't "patch the function," it's "refine the invariant statement."
- **`prop_assume!` as the right way to express conditional invariants** — when an invariant holds only inside a subset of the input space, `prop_assume!` filters proptest inputs to that subset rather than weakening the assertion.
- **Short vs long monotonicity asymmetry** — short positions have *unconditional* monotonicity in mark; longs only have it under the leveraged condition. The math derivative explains why.

Verification:

```bash
cargo test -p openhl-liquidation
```

…passes 16 tests (8 from L4 + 5 new unit tests + 3 proptests, each at the default 256 cases).

Specific changes:

- **`src/compute.rs`** — appends `account_equity`, `margin_ratio`, 5 unit tests, and 3 proptests below the existing L4 content.
- **`src/lib.rs`** — extends the `pub use compute::{...}` re-export to include `account_equity` and `margin_ratio`.

L5 is the pedagogical center of Stage 10a. Don't rush it. The proptest discovery loop — write, fail, trace, refine — is the load-bearing skill the lesson exists to teach.

## Recap

After L4:
- The compute module exists with `notional_value` and `unrealized_pnl` plus the private `saturate_i128_to_i64` helper.
- 8 unit tests cover the four sign combinations of PnL plus the three notional cases (long, short, flat).
- `cargo test` runs 8 tests, all green.

L5 builds the next layer: convert PnL into account equity (adds collateral), then divide equity by notional to get a margin ratio. Then we write the first proptest — and meet the surprise that defines this stage.

## Plan

Three phases:

1. **Append `account_equity`** — one-line function, one happy-path unit test, one "equity goes negative" unit test.
2. **Append `margin_ratio`** — the i128-scaled division with a flat-position guard, three unit tests (flat returns max, ratio at exactly 10%, ratio can be negative).
3. **Add a proptest block** — write the long-monotonicity proptest in its naïve form, watch it fail at a specific input, trace why, refine with `prop_assume!`, then add the short-monotonicity (no precondition) and determinism proptests. Final state: three proptests, all green.

Then update `lib.rs`.

> 🛑 **Predict.** Before scrolling: a long position with `collateral = 100`, `size = 1`, `entry = 100` has `notional = 100` and `equity = 100` at mark = 100 (zero PnL). **What is the margin_ratio at mark = 100?** And what does it become at mark = 110, mark = 50? Think through the formula `equity × MARGIN_SCALE / notional` for each case before reading on.

(Walk-through:
- **mark = 100**: notional = 1 × 100 = 100, pnl = (100 − 100) × 1 = 0, equity = 100 + 0 = 100, ratio = 100 × 10_000 / 100 = **10_000 bps = 100%**.
- **mark = 110**: notional = 110, pnl = 10, equity = 110, ratio = 110 × 10_000 / 110 = **10_000 bps = 100%**.
- **mark = 50**: notional = 50, pnl = −50, equity = 50, ratio = 50 × 10_000 / 50 = **10_000 bps = 100%**.

**Margin ratio doesn't move!** The collateral exactly offsets the PnL movement at every mark because `collateral = notional_at_entry`. The position is unlevered: every dollar of exposure has a dollar of collateral behind it. **That's the regime where the naïve monotonicity intuition breaks** — a position with `collateral ≥ notional_at_entry` is "cash-funded" and the margin ratio can move in either direction as mark moves. We'll see this in the proptest in a minute.)

## Walk-through

### Step 1: Append `account_equity`

Open `crates/liquidation/src/compute.rs`. After the `saturate_i128_to_i64` helper, add (above the `#[cfg(test)]` block):

```rust
/// Account equity = `collateral + unrealized_pnl`. Can be negative.
///
/// A negative equity means losses have exceeded deposited collateral —
/// the account is underwater. The liquidation engine still attempts to
/// close the position; any residual deficit falls to the insurance fund
/// (Stage 10b).
#[must_use]
pub fn account_equity(snapshot: &AccountSnapshot, mark: MarkPrice) -> i64 {
    snapshot
        .collateral
        .0
        .saturating_add(unrealized_pnl(snapshot, mark))
}
```

Three things to notice about this 6-line function:

1. **Returns `i64`, not `u64`.** The doc says "can be negative" and the type makes it real. A caller that downstreams this into a margin computation can use signed arithmetic without surprise. **Match the type to the value's actual range.**

2. **`saturating_add` over `+` or `checked_add`.** Adding two `i64` values can overflow at the extremes. `saturating_add` returns `i64::MAX` or `i64::MIN` at overflow; the engine will classify either as a definitive health state without needing to handle an `Option`. Same pattern as the `i128 → i64` saturation.

3. **No tests yet — they come in Step 2 below.** This keeps the function definitions visually contiguous before the test block. Many lessons interleave; we don't.

### Step 2: Append `margin_ratio`

After `account_equity`, append:

```rust
/// Margin ratio = `equity / notional`, scaled by [`MARGIN_SCALE`].
///
/// Returns `MarginRatio(i64::MAX)` for a flat position — no notional
/// exposure means the margin requirement is irrelevant, and we report the
/// healthiest possible ratio.
///
/// Returns a negative ratio when equity < 0 (the underwater case).
#[must_use]
pub fn margin_ratio(snapshot: &AccountSnapshot, mark: MarkPrice) -> MarginRatio {
    let notional = notional_value(snapshot, mark);
    if notional == 0 {
        return MarginRatio(i64::MAX);
    }
    let equity = account_equity(snapshot, mark);
    // ratio = equity × MARGIN_SCALE / notional, in i128 to avoid overflow
    // before the divide.
    let scaled = i128::from(equity).saturating_mul(i128::from(MARGIN_SCALE));
    let ratio = scaled / i128::from(notional);
    MarginRatio(saturate_i128_to_i64(ratio))
}
```

Five things to notice:

1. **`notional == 0` early return with `i64::MAX`.** Flat positions have no exposure → no margin requirement to fall short of. Returning the maximum representable ratio signals "infinitely safe" and lets every downstream `margin_health` comparison short-circuit naturally (no special-case in `margin_health`). **Concretely, the one-directional comparison we'll write in L6 — `if ratio >= params.initial_margin_bps { Safe } else { ... }` — works for a flat account without any extra branch, because `i64::MAX >= initial_margin_bps` is always true and the account lands in `Safe` automatically.** That is, `i64::MAX` is acting as a **"magic boundary that lets the downstream comparison short-circuit straight through."** The alternative — `Option<MarginRatio>` or `Result<MarginRatio>` — would force every caller to handle the flat case explicitly. **Encode the "no constraint" case as the system's safest possible upper bound — that's the design discipline at work here.**

2. **The multiplication happens *before* the division.** `equity × MARGIN_SCALE / notional` in i128 preserves precision for small ratios (e.g., a 1% margin = 100 bps survives the divide). Doing the divide first (`equity / notional × MARGIN_SCALE` in i64) would truncate to integer percentages before scaling, losing precision. **Order of operations matters when integer division is in the mix.**

3. **i128 for the scaled product.** `equity` is i64; `MARGIN_SCALE` is 10⁴. Their i64 product can overflow when `|equity| > i64::MAX / 10_000 ≈ 9.2e14`. At realistic exchange scales that's $920 trillion — well above plausible — but the i128 multiplication is the second line of defense. Same discipline as `unrealized_pnl`.

4. **The `i128::from(notional)` cast for the divide.** Once `scaled` is i128, dividing by an i128 keeps the result in i128. Casting `notional` (u64) to i128 is free; mixing i128 and u64 in division isn't directly possible. **Stay in one wide type for the whole chain; cast once at the boundary.**

5. **Final `saturate_i128_to_i64(ratio)`.** Even after the divide, an extreme i128 value can exceed i64 range (e.g., huge equity vs tiny notional). Saturation preserves the sign of the answer and clips the magnitude.

### Step 3: Add 5 unit tests

Inside the existing `#[cfg(test)] mod tests { ... }` block, after the PnL tests from L4, add:

```rust
    // ─── account_equity ────────────────────────────────────────────

    #[test]
    fn equity_collateral_plus_pnl() {
        // Long 10 @ 100, collateral 1_000, mark 120 → equity = 1_000 + 200 = 1_200
        let s = snapshot(10, 100, 1_000);
        assert_eq!(account_equity(&s, MarkPrice(120)), 1_200);
    }

    #[test]
    fn equity_can_go_negative() {
        // Long 10 @ 100, collateral 100, mark 50 → pnl = −500, equity = −400
        let s = snapshot(10, 100, 100);
        assert_eq!(account_equity(&s, MarkPrice(50)), -400);
    }

    // ─── margin_ratio ──────────────────────────────────────────────

    #[test]
    fn ratio_flat_returns_max() {
        let s = snapshot(0, 100, 1_000);
        assert_eq!(margin_ratio(&s, MarkPrice(100)), MarginRatio(i64::MAX));
    }

    #[test]
    fn ratio_exactly_ten_percent() {
        // Notional = 10 × 100 = 1_000; equity = 100 (collateral only, pnl = 0).
        // ratio = 100 × 10_000 / 1_000 = 1_000 bps = 10%.
        let s = snapshot(10, 100, 100);
        assert_eq!(margin_ratio(&s, MarkPrice(100)), MarginRatio(1_000));
    }

    #[test]
    fn ratio_can_be_negative() {
        // Underwater: equity = −400, notional = 500 → ratio = −8_000 bps
        let s = snapshot(10, 100, 100);
        let r = margin_ratio(&s, MarkPrice(50));
        assert!(r.0 < 0, "expected negative ratio, got {:?}", r);
    }
```

Things to notice:

1. **Each ratio test names the exact arithmetic in the comment.** "`ratio = 100 × 10_000 / 1_000 = 1_000 bps = 10%`" — the reader (and future-you, debugging a regression) can verify the test's expected value without re-running the calculation. **Tests are code that also explains.**

2. **`ratio_can_be_negative` uses `assert!(r.0 < 0)` instead of `assert_eq!(r, MarginRatio(-8000))`.** The exact ratio value depends on i64 rounding of the divide; pinning the exact bps locks in arithmetic that doesn't have a single canonical answer (different rounding modes give different LSBs). Asserting just the *sign* tests the load-bearing property — equity-negative-implies-ratio-negative — without testing the rounding accident. **Test the property, not the artifact.**

3. **`ratio_flat_returns_max` uses `MarginRatio(i64::MAX)` directly.** The sentinel value is part of the contract — `margin_health` (in L6) will rely on it.

### Step 4: Write the proptest — initial naïve form

Below the unit tests (still inside `mod tests`), open a `proptest!` block. Start with the long-position monotonicity invariant *without* `prop_assume!`:

```rust
    proptest! {
        /// For a long position, as mark increases (price moves in the
        /// long's favor), margin_ratio should monotonically increase.
        /// If it ever moved the other way, an account could pass from
        /// "safe" to "liquidatable" without a single adverse price move,
        /// which would be a soundness bug.
        #[test]
        fn long_ratio_monotonic_in_mark(
            size in 1_i64..1_000,
            entry in 100_u64..10_000,
            collateral in 1_i64..1_000_000,
            mark_a in 1_u64..50_000,
            mark_b in 1_u64..50_000,
        ) {
            prop_assume!(mark_a < mark_b);
            let s = snapshot(size, entry, collateral);
            let r_low  = margin_ratio(&s, MarkPrice(mark_a));
            let r_high = margin_ratio(&s, MarkPrice(mark_b));
            prop_assert!(
                r_low.0 <= r_high.0,
                "long ratio not monotonic: mark_a={} → r={}; mark_b={} → r={}",
                mark_a, r_low.0, mark_b, r_high.0
            );
        }
    }
```

Run the test:

```bash
cargo test -p openhl-liquidation
```

It **fails** with a minimal counterexample like:

```
thread 'compute::tests::long_ratio_monotonic_in_mark' panicked:
Test failed: long ratio not monotonic: mark_a=1 → r=40000; mark_b=2 → r=25000
minimal failing input: size = 1, entry = 100, collateral = 103, mark_a = 1, mark_b = 2
```

**Stop here. Don't fix the function. Hand-trace the failure.**

### Step 5: Trace the failure

Plug the minimal failing input through `margin_ratio` step by step:

**At mark = 1:**
- `notional = |1| × 1 = 1`
- `pnl = (1 − 100) × 1 = −99`
- `equity = 103 + (−99) = 4`
- `ratio = 4 × 10_000 / 1 = 40_000 bps` (= 400%)

**At mark = 2:**
- `notional = |1| × 2 = 2`
- `pnl = (2 − 100) × 1 = −98`
- `equity = 103 + (−98) = 5`
- `ratio = 5 × 10_000 / 2 = 25_000 bps` (= 250%)

Margin ratio went from 400% to 250% as mark went up. Equity rose (from 4 to 5), but notional *also* rose (from 1 to 2). The notional grew faster than the equity recovered.

The general formula:

> `margin_ratio = (collateral + (mark − entry) × size) × MARGIN_SCALE / (|size| × mark)`
>
> = `MARGIN_SCALE × (collateral/notional + (1 − entry/mark))`

Differentiate with respect to mark (for a long, holding size and entry and collateral fixed):

> `d(margin_ratio)/d(mark) = MARGIN_SCALE × (entry / mark² − collateral / (size × mark²))`
>
> = `MARGIN_SCALE / mark² × (entry − collateral / size)`

The sign of this derivative is the sign of `entry − collateral / size`. So:

- If `entry × size > collateral`: derivative is positive → ratio **increases** with mark (the levered regime, where the naïve intuition is correct).
- If `entry × size < collateral`: derivative is negative → ratio **decreases** with mark (the cash-heavy regime, where the naïve intuition is wrong).
- If `entry × size = collateral`: derivative is zero → ratio is constant in mark (the "exactly funded" knife edge).

Lining up the three regimes and how `margin_ratio` behaves in each shows visually why the naïve intuition breaks, and where the "singular boundary" actually runs:

```
                         margin_ratio (Long position; collateral and size fixed, sweep mark)
                         ▲
                         │     🔴 Cash-heavy regime
                         │        (collateral > entry × size)
                         │        ratio ↘ decreases as mark rises
                         │        ※ The zone where "ratio goes up with mark" breaks
                         │     ──────────────────────────────────
                         │
                         │     ◆ Singular boundary: collateral = entry × size
                         │        (= exactly 1x leverage; just-barely cash-funded)
                         │        ratio is flat in mark (derivative = 0)
                         │     ──────────────────────────────────
                         │
                         │     🟢 Levered regime
                         │        (collateral < entry × size)
                         │        ratio ↗ increases as mark rises
                         │        ※ Naïve intuition holds; 99% of real perp positions
                         │
                         └─────────────────────────────────────►  mark

  Things to read off:
    - The boundary position depends only on **the relation between collateral and entry × size**;
      it does not depend on mark.
    - The moment collateral exceeds entry × size (notional at entry), the slope of margin_ratio
      flips sign.
    - On real exchanges, traders are almost always in the levered regime, so this flip is a rare
      corner case in production. But the proptest feeds random inputs and will mercilessly step
      into the corner.
    - The "naïve monotonicity intuition" isn't fundamentally wrong — it is correct **under the
      implicit precondition "you are in the levered regime."** The proptest is the device that
      forces that hidden precondition to become visible.
```

This figure also matters in L6 / L7 when we write the classifier and liquidation discipline: healthy traders live in the levered region, but an extremely over-collateralized "pseudo-long" account can wander into the cash-heavy region at any time, and the engine has to behave correctly in both.

The failing input has `entry × size = 100 × 1 = 100` and `collateral = 103`. Since `collateral > entry × size`, we're in the cash-heavy regime where the ratio decreases as mark rises.

**This is not a bug in `margin_ratio`. The function is correct. The bug is in the proptest's invariant statement — it's claiming monotonicity in a regime where monotonicity doesn't hold.**

### Step 6: Refine the proptest with `prop_assume!`

Replace the long-monotonicity proptest with a version that asserts monotonicity only inside the regime where it actually holds:

```rust
    proptest! {
        /// For a *levered* long position (entry × size > collateral), as
        /// mark increases, margin_ratio monotonically increases.
        ///
        /// The leverage condition is load-bearing: when collateral exceeds
        /// position notional at entry (effectively cash + tiny exposure),
        /// the ratio is dominated by `collateral / notional`, which
        /// *decreases* as mark grows — so monotonicity fails. That
        /// regime is uninteresting for liquidation (the account can
        /// never be liquidated), so we exclude it via `prop_assume!`.
        #[test]
        fn long_ratio_monotonic_in_mark_when_levered(
            size in 1_i64..1_000,
            entry in 100_u64..10_000,
            collateral in 1_i64..1_000_000,
            mark_a in 1_u64..50_000,
            mark_b in 1_u64..50_000,
        ) {
            prop_assume!(mark_a < mark_b);
            // Levered regime: notional at entry strictly exceeds collateral.
            prop_assume!(
                i128::from(entry) * i128::from(size) > i128::from(collateral)
            );
            let s = snapshot(size, entry, collateral);
            let r_low  = margin_ratio(&s, MarkPrice(mark_a));
            let r_high = margin_ratio(&s, MarkPrice(mark_b));
            prop_assert!(
                r_low.0 <= r_high.0,
                "long ratio not monotonic: mark_a={} → r={}; mark_b={} → r={}",
                mark_a, r_low.0, mark_b, r_high.0
            );
        }
```

Three things to notice about the refinement:

1. **The test name now ends in `_when_levered`.** The name carries the precondition. A future reader who jumps to a failure of this test knows the precondition without reading the body.

2. **The doc comment names *why* the assumption matters.** "*That regime is uninteresting for liquidation*" — readers see this is a deliberate scoping choice, not an oversight.

3. **`prop_assume!` over restricting the input ranges.** We *could* generate `collateral` in `0..(entry × size)` to enforce the leverage condition by construction. But proptest input strategies are often hard to compose for inter-parameter constraints, and `prop_assume!` reads naturally as "skip cases that violate this precondition." The proptest counter (`successes: 8, rejects: ~`) tells you how many cases got filtered — if rejects climb above ~10× successes, *then* refine the strategies.

### Step 7: Add the short-monotonicity proptest (no precondition)

Add inside the same `proptest!` block:

```rust
        /// Symmetric invariant for shorts: as mark increases, the short's
        /// margin_ratio always decreases. Unlike the long case, this holds
        /// for *any* collateral level — the math derivative is uniformly
        /// negative in mark (every term either decreases or stays flat).
        #[test]
        fn short_ratio_monotonic_in_mark(
            size in 1_i64..1_000,
            entry in 100_u64..10_000,
            collateral in 1_i64..1_000_000,
            mark_a in 1_u64..50_000,
            mark_b in 1_u64..50_000,
        ) {
            prop_assume!(mark_a < mark_b);
            let s = snapshot(-size, entry, collateral);
            let r_low  = margin_ratio(&s, MarkPrice(mark_a));
            let r_high = margin_ratio(&s, MarkPrice(mark_b));
            prop_assert!(
                r_low.0 >= r_high.0,
                "short ratio not monotonic: mark_a={} → r={}; mark_b={} → r={}",
                mark_a, r_low.0, mark_b, r_high.0
            );
        }
```

Two things to notice:

1. **No `prop_assume!` for the leverage condition.** Short monotonicity holds *unconditionally*. Walk through the derivative: for `size < 0`, the formula becomes `margin_ratio = MARGIN_SCALE × (collateral / notional + entry / mark − 1)`. Differentiating: `d/d(mark) = MARGIN_SCALE / mark² × (−collateral / |size| − entry)`. Both terms inside the parens are non-positive (collateral and entry are non-negative; `|size|` is positive). The derivative is uniformly negative or zero. **The asymmetry is a real mathematical fact, not a notation choice.**

2. **`-size` in the snapshot setup.** We feed positive `size` to the strategy generator (so it stays > 0) and negate it before constructing the snapshot. This avoids generating `size = 0` (which would test the flat case, covered by `ratio_flat_returns_max`).

### Step 8: Add the determinism proptest

Add inside the same `proptest!` block:

```rust
        /// Determinism: the same inputs always produce the same MarginRatio.
        /// Trivially true for pure functions, but the proptest catches
        /// accidental non-determinism (e.g., if a future refactor introduces
        /// HashMap iteration or float arithmetic).
        #[test]
        fn margin_ratio_deterministic(
            size in -1_000_i64..1_000,
            entry in 1_u64..10_000,
            collateral in -1_000_000_i64..1_000_000,
            mark in 1_u64..50_000,
        ) {
            let s = snapshot(size, entry, collateral);
            let r1 = margin_ratio(&s, MarkPrice(mark));
            let r2 = margin_ratio(&s, MarkPrice(mark));
            prop_assert_eq!(r1, r2);
        }
    }
```

Things to notice:

1. **The assertion is trivial for pure functions.** Two calls with identical inputs must return identical outputs. **The test catches *future* regressions** — a refactor that accidentally introduces `HashMap` iteration order, `SystemTime::now`, or float arithmetic into the margin computation would fail this proptest before it could fork a chain in production.

2. **Wide input ranges include negatives and zero.** The other two proptests carved out specific regimes; determinism holds *everywhere*, so the strategies are generous. We're not trying to test specific properties of the value; we're testing the *property of the function* (deterministic dispatch).

3. **This is the cheapest invariant to maintain and the cheapest to discover violations of.** Every pure function in the engine should have a determinism proptest. **A 5-line proptest is a guard against an entire class of consensus-fork bugs.**

### Step 9: Update `lib.rs`

Open `crates/liquidation/src/lib.rs`. Extend the compute re-export. Was:

```rust
pub use compute::{notional_value, unrealized_pnl};
```

Becomes:

```rust
pub use compute::{account_equity, margin_ratio, notional_value, unrealized_pnl};
```

Two new names, alphabetically inserted.

### Step 10: Run the tests

```bash
cargo test -p openhl-liquidation
```

Expected output:

```
running 16 tests
test compute::tests::equity_can_go_negative ... ok
test compute::tests::equity_collateral_plus_pnl ... ok
test compute::tests::notional_flat_is_zero ... ok
test compute::tests::notional_long ... ok
test compute::tests::notional_short_uses_abs ... ok
test compute::tests::pnl_flat_is_zero ... ok
test compute::tests::pnl_long_loss ... ok
test compute::tests::pnl_long_profit ... ok
test compute::tests::pnl_short_loss ... ok
test compute::tests::pnl_short_profit ... ok
test compute::tests::ratio_can_be_negative ... ok
test compute::tests::ratio_exactly_ten_percent ... ok
test compute::tests::ratio_flat_returns_max ... ok
test compute::tests::long_ratio_monotonic_in_mark_when_levered ... ok
test compute::tests::short_ratio_monotonic_in_mark ... ok
test compute::tests::margin_ratio_deterministic ... ok

test result: ok. 16 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

**All 16 tests pass.** The three proptests each run 256 cases by default — that's ~768 randomly-generated input combinations checked.

Common errors / surprises:

- **`successes: 220, rejects: 36`** in proptest output — perfectly fine. The `prop_assume!` filters caused some cases to be discarded. As long as successes is the bulk of cases, the proptest is doing real work.
- **Proptest takes longer than expected** — increase the timeout in `cargo test` flags or just be patient. 3 proptests × 256 cases × the speed of pure arithmetic is fast in practice.

## Design reflection

Three load-bearing decisions in this lesson:

1. **`MarginRatio(i64::MAX)` for flat positions, not `Option` or `Result`.** The "no constraint" case is the *safest* possible state. Encoding it as the max representable ratio lets every downstream classifier short-circuit naturally without special-case branching. **Encode "no information" as the safest value, not as an absence of information.**

2. **The proptest's failure is the lesson.** If the proptest had passed on the first try, the reader would have learned "margin_ratio is monotonic in mark." With the failure-and-trace step, the reader reaches a deeper domain fact: "**margin_ratio is monotonic in mark *only in the levered regime*, and its singular boundary is the point where the deposited collateral equals the notional at entry (= entry × size)."** That deeper fact survives because the reader walked through the derivative themselves.

3. **`prop_assume!` for conditional invariants.** When an invariant holds only over a subset of inputs, the right tool is `prop_assume!` — not a stronger function postcondition, not a weaker assertion, not a hand-restricted strategy. **The invariant is what's true *under what condition*; encode both.**

## Answer key

```bash
cd ~/code/openhl-reference
git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/src/compute.rs ./crates/liquidation/src/compute.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
```

After L5:
- **compute.rs** now matches Stage 10a through `margin_ratio` + the first 13 unit tests + all 3 proptests. The next two functions (`margin_health` at L6, `close_order_spec` at L7) and their tests are still pending.
- **lib.rs** has 4 of 6 compute re-exports — `notional_value`, `unrealized_pnl`, `account_equity`, `margin_ratio`. The last two arrive in L6/L7.

## Common questions

**Q1: Why does a flat position return `MarginRatio(i64::MAX)` and not `MarginRatio(0)` or `Option::None`?**

`MarginRatio(0)` would classify the flat account as the *worst* possible margin state — which then forces every consumer of margin_ratio to special-case "but is it really zero, or is it flat?" `Option::None` is honest but pushes the special case to every call site. `MarginRatio(i64::MAX)` makes the flat case look identical to "infinitely safe" — which is what it *is* for liquidation purposes — and lets margin_health classify it as `Safe` without a single special-case branch. **Three options, one of them composes naturally.**

**Q2: Why is `collateral` allowed to push margin_ratio above 100%?**

Margin ratio is `equity / notional`, scaled. There's no upper bound at 100% mathematically — a position with $1,000 collateral and $100 notional has 1,000% margin ratio. Real exchanges report this as "10× collateralized." The engine doesn't care about the value of ratios above the initial-margin threshold; everything above is `Safe`. **The ceiling is a UI concern, not an engine concern.**

**Q3: Could we simplify `margin_ratio` by always computing in i128 without the flat guard?**

Division by zero in Rust panics in both debug and release for integers. The flat guard prevents that panic. Removing it would require either a `try_div` (which i128 doesn't have built-in) or a branchless approach (multiplying notional by a constant before the divide, with extra rounding noise). The two-line guard is the cleanest. **An explicit one-branch conditional is far cheaper — in terms of readability and maintainability — than escaping into a tricky branchless implementation.**

**Q4: Why `prop_assume!` instead of restricting the input strategy to `collateral in 1..(entry × size)`?**

Two reasons. (1) Proptest strategies are independent per-parameter; expressing inter-parameter constraints requires `(entry, size, collateral).prop_filter(...)` or composing with `flat_map`, both of which are noisier than `prop_assume!`. (2) `prop_assume!` makes the precondition visible inline in the test body — a reader can see "we skip cases where collateral ≥ notional-at-entry" right next to the assertion, not buried in the input strategies. **Express preconditions where the assertion lives, not in the data generator.**

**Q5: When does the long-monotonicity invariant *not* hold, and is that a problem?**

It doesn't hold when `collateral ≥ entry × size` — the cash-heavy regime where the position is so over-collateralized that it can't be liquidated. In that regime, mark moves push the margin ratio around but never below maintenance, so the engine never has to act. **The cases where monotonicity fails are exactly the cases the engine doesn't care about — that's why excluding them with `prop_assume!` is the right move, not a workaround.**

## Next lesson (L6)

L6 adds `margin_health` — the function that turns a `MarginRatio` into one of the four `MarginHealth` variants by comparing against the params. Five unit tests at the boundaries (Safe / AtRisk / Liquidatable / Underwater / exact-maintenance-edge) plus a discussion of why the boundaries use strict-less-than at every threshold. The lesson is shorter than L5 — by L6 you've internalized the discipline; L6 is application.

````

---

## Seed-file slot

L5 lands in Module 2 at sortOrder 1:

```typescript
{
  title: 'Lesson 5 — account_equity + margin_ratio — and the proptest that breaks your first mental model',
  slug: 'openhl-liquidation-equity-ratio-en',
  type: 'CONTENT',
  sortOrder: 1,
  duration: 60,
  xpReward: 100,
  content: `# Lesson 5 — account_equity + margin_ratio — and the proptest that breaks your first mental model\n\n...`
},
```

## SHA pinning discipline

L5 cites `22eedf9` (Stage 10a). The answer-key diff after L5 covers the second ~half of `compute.rs` through `margin_ratio` + all 3 proptests; the final two functions land in L6/L7.

## Style review notes (self-critique before paste)

- **The "predict the cash-funded case" callout in §Plan** primes the reader for the failure they're about to see. The numerical walk-through ("ratio doesn't move!") is the moment the naïve intuition gets explicitly disconfirmed before the proptest even runs.
- **Step 5's hand-trace is the load-bearing payoff.** Without it, the reader sees the proptest fail and gets a fix; with it, they understand *why* the fix is correct. That difference compounds across the rest of Stage 10a — when L6 sets boundaries at strict-less-than, the reader is primed to ask "in which regime does that decision matter?"
- **The derivative computation is unavoidable.** A learner who doesn't follow it gets a hand-wave; a learner who does walks away with a real model. The lesson commits to teaching the math because the alternative — "trust me, monotonicity is conditional" — is the exact intellectual pattern this course was designed to avoid.
- **L5 is the longest lesson in Stage 10a.** That's intentional. The pedagogical density here justifies a single deep session; splitting into "L5a unit tests + L5b proptests" would fragment the discovery loop into two pieces neither of which has the full payoff.
- **The "encode 'no information' as the safest value" reflection** in §Design generalizes beyond this crate — it's a Rust API design principle that shows up wherever you'd otherwise reach for `Option`. Stating it here gives the reader a transferable rule.
