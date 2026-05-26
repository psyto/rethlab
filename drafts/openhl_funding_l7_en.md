# Building OpenHL Funding — L7 draft (EN) — build-along

> Drafted against openhl SHA `cd94137` (Stage 8b — funding state machine).
> Course: `building-openhl-funding-en` (track: `reth-l1-architect`).

---

## L7 — `openhl-funding-apply-funding-en`

- **Module:** 2 (Pure compute), sortOrder 3
- **Course-level sortOrder:** 7 (lesson 8 of 12)
- **Duration:** 40 min
- **XP reward:** 80
- **Type:** CONTENT
- **Milestone:** Module 2 complete — all pure compute done

### Content

````markdown
# Lesson 7 — `apply_funding` — sign convention + zero-sum proptest

## Goal

Concepts you'll grasp in this lesson:

- **One unary minus carries the sign convention** — `-delta_unscaled` flips from market-centric ("longs pay") to account-centric (`Notional` positive = receives). Two sign-flip points would double the surface area for bugs; one is the contract.
- **Conservation law as a proptest** — balanced books sum to zero exactly within the no-saturation regime, because integer division preserves `-x/d = -(x/d)` for positive `d`. Funding redistributes; it doesn't create or destroy quote currency.
- **Filter, don't error, for flat positions** — `size == 0` accounts are silently dropped; returning a `Result<Vec<Settlement>, FlatPositionError>` would force callers to handle a non-condition. Flat positions are *expected*, not exceptional.
- **Accept the least-restrictive type** — `positions: &[Position]` (slice borrow) lets callers retain ownership and re-use the list across ticks; `Vec<Position>` would force a clone per call.
- **Pick proptest ranges so the property holds *exactly*** — bounding `size in 1..1M` keeps the i128 products below `saturating_mul`'s clamp threshold. A wider range would force weakening "sum == 0" to "sum.abs() < epsilon" — an aspirational property instead of an invariant.

Verification:

```bash
cargo test -p openhl-funding
```

…passes 15 tests (10 from L4-L6 + 5 new).

Specific changes:

`compute.rs` gains the final pure function:

- **`apply_funding(positions, mark, rate) -> Vec<Settlement>`** — applies the rate to every non-flat position and produces a settlement per match. ~25 lines.
- **4 hand-traced unit tests**:
  - `apply_funding_skips_flat_positions`
  - `apply_funding_longs_pay_shorts_when_rate_positive`
  - `apply_funding_shorts_pay_longs_when_rate_negative`
  - `apply_funding_returns_empty_on_zero_rate`
- **1 proptest** — `balanced_book_settlements_sum_to_zero` — for any equal-and-opposite pair of positions, the settlements sum to zero. **The fundamental conservation law for funding: it redistributes, it doesn't create or destroy.**

**Module 2 closes** after this lesson. All three pure functions (`compute_premium`, `compute_rate`, `apply_funding`) are in place. Module 3 (the clock state machine) starts at L8.

The teaching focus is the **sign convention** (longs-pay-shorts), specifically *how* the code expresses it: a single `-` in front of `delta_unscaled`. One character carries the entire sign contract.

## Recap

After L6:
- `compute_premium` → `Premium`
- `compute_rate` → `FundingRate`
- 10 tests passing, 1 proptest passing
- `saturate_i128_to_i64` has one user (`compute_premium`)

L7 wires the final stage of the pipeline — turning a rate into per-account settlements — and adds the second user of the saturate helper.

## Plan

Three edits:

1. **Append `apply_funding` to `compute.rs`** — after `compute_rate`, before `saturate_i128_to_i64`.
2. **Append 4 unit tests + 1 proptest** to the existing `mod tests` block.
3. **Update `lib.rs`** — add `apply_funding` to the re-exports.

> 🛑 **Predict.** Before scrolling: we have `size: PositionSize(i64)` (positive = long, negative = short) and `rate: FundingRate(i64)` (positive = longs pay shorts). The naive product `size × rate` is positive when a long is in a positive-rate world. **But the settlement delta for a long should be *negative* (longs pay).** What's the cleanest way to encode the sign flip?

(Answer: **A single `-` in front of the product.** `delta = -(size × mark × rate / RATE_SCALE)`. The product `size × rate` naturally encodes "magnitude × direction-of-payment-flow," but the sign convention for `Notional` is "account-centric" (positive = receives, negative = pays). The `-` flips from market-centric to account-centric. **One unary minus carries the entire convention.** Anyone reading the code sees the `-` and knows the convention was deliberately inverted at that point.)

## Walk-through

### Step 1: Add `apply_funding`

Open `crates/funding/src/compute.rs`. After `compute_rate`, before `saturate_i128_to_i64`, add:

```rust
/// Apply `rate` to each position, producing one [`Settlement`] per non-flat
/// position. Flat positions (`size == 0`) are dropped — there's no settlement
/// to record. Order of input positions is preserved in the output.
///
/// Sign convention: with positive `rate`, longs (positive size) pay; shorts
/// (negative size) receive. The product `size * mark * rate / RATE_SCALE`
/// is the quote-currency delta; long pays → delta is negative for longs.
#[must_use]
pub fn apply_funding(
    positions: &[Position],
    mark: MarkPrice,
    rate: FundingRate,
) -> Vec<Settlement> {
    if rate.0 == 0 {
        return Vec::new();
    }

    let mut out = Vec::with_capacity(positions.len());
    for pos in positions {
        if pos.size.0 == 0 {
            continue;
        }
        // notional = size * mark, in i128 to absorb the product's full range.
        let notional = i128::from(pos.size.0).saturating_mul(i128::from(mark.0));
        // delta_unscaled = notional * rate; still i128.
        let delta_unscaled = notional.saturating_mul(i128::from(rate.0));
        // Sign convention: longs PAY when rate > 0. The product above is
        // positive (long size * positive rate) — we flip its sign so the
        // resulting delta is negative for longs and positive for shorts.
        let delta_scaled = -delta_unscaled / i128::from(RATE_SCALE);
        out.push(Settlement {
            account: pos.account,
            delta: Notional(saturate_i128_to_i64(delta_scaled)),
        });
    }
    out
}
```

~25 lines. Six moving parts:

1. **`if rate.0 == 0 { return Vec::new(); }`** — the zero-rate fast path. No allocation, no work. Reflects the contract: a zero rate means "no funding to apply." Common case during boot or oracle outages.

2. **`Vec::with_capacity(positions.len())`** — pre-allocate the output capacity. Even though we may filter some out (flat positions), the input length is a good upper bound. **Avoids re-allocation as we push.** Tiny optimization; matters in a hot path.

3. **`if pos.size.0 == 0 { continue; }`** — skip flat positions. They have no economic exposure; settling them produces a zero delta that pollutes the output. **The contract says output length differs from input length precisely when flat positions are present.**

4. **`i128::from(pos.size.0).saturating_mul(i128::from(mark.0))`** — the notional product. `size * mark` can exceed `i64::MAX` for big positions and big marks (e.g., a position of `1e18` units × mark of `1e10` = `1e28`, way past i64). **i128 + saturating_mul: same defensive recipe as `compute_premium`.**

5. **`notional.saturating_mul(i128::from(rate.0))`** — the next product. Now we have `size × mark × rate`, all in i128. Even at this stage, i128 can saturate at pathological inputs.

6. **`-delta_unscaled / i128::from(RATE_SCALE)`** — the final scaling + sign flip. The division by `RATE_SCALE` undoes the rate's per-billion scaling. **The leading `-` is the sign convention.**

Then `saturate_i128_to_i64(delta_scaled)` clips back to i64 (Notional's inner type), and we push a `Settlement`.

> 🛑 **Predict.** Why does the function take `positions: &[Position]` (a slice) instead of `positions: Vec<Position>` (an owned vec)?

(Answer: **The caller owns the position list and re-uses it across ticks.** Taking ownership would force the caller to clone before each call. A slice borrow is zero-cost; the caller retains ownership. **Accept the least-restrictive type the function can use** — slice over Vec when iteration is all you need.)

> 🛑 **Anti-fluency.** "Could we use `positions.iter().filter(...).map(...).collect()` instead of the loop?" **Yes, and it would be more idiomatic Rust.** Stage 8b uses the imperative loop because the intermediate calculations are easier to follow when they're separate `let` bindings. The functional chain `positions.iter().filter(|p| p.size.0 != 0).map(|pos| { let notional = ...; Settlement { ... } }).collect()` works identically. **Readability over idiom — pick whichever shape the team finds easier to debug.**

### Step 2: Walk through the sign convention

The sign flip is the most subtle part of the function. Across the four regimes (Long/Short × Positive/Negative rate), the leading unary `-` is what collapses every case onto `Notional`'s account-centric convention. Lining them up as a matrix shows the whole sign contract sitting on one character:

```
【 Positive rate (rate > 0): longs pay 】
  Long  (+size) × (+rate) ──► (+ product) ──► [ - ] ──► Notional(negative) ──► pays    ⭕
  Short (-size) × (+rate) ──► (- product) ──► [ - ] ──► Notional(positive) ──► receives ⭕

【 Negative rate (rate < 0): shorts pay 】
  Long  (+size) × (-rate) ──► (- product) ──► [ - ] ──► Notional(positive) ──► receives ⭕
  Short (-size) × (-rate) ──► (+ product) ──► [ - ] ──► Notional(negative) ──► pays    ⭕
```

No matter the sign of the raw `size × rate` product (market-centric: "longs pay → positive product"), one pass through the leading `-` lands all four regimes squarely on `Notional`'s convention (positive = the account receives, negative = the account pays). **"One character carries one design decision" — this is what that means in practice.** Below we trace the four cases with concrete numbers.

**Positive rate, long position:**
- `size.0 = +100`, `mark.0 = 100`, `rate.0 = 1_000_000` (0.1%)
- `notional = 100 × 100 = 10_000` (i128)
- `delta_unscaled = 10_000 × 1_000_000 = 10_000_000_000` (positive i128)
- `delta_scaled = -10_000_000_000 / 1_000_000_000 = -10`
- `Notional(-10)` → "long pays 10"

**Positive rate, short position:**
- `size.0 = -50`, `mark.0 = 100`, `rate.0 = 1_000_000`
- `notional = -50 × 100 = -5_000` (negative i128)
- `delta_unscaled = -5_000 × 1_000_000 = -5_000_000_000`
- `delta_scaled = -(-5_000_000_000) / 1_000_000_000 = 5`
- `Notional(+5)` → "short receives 5"

**Negative rate, long position:**
- `size.0 = +100`, `mark.0 = 100`, `rate.0 = -1_000_000`
- `notional = 10_000`
- `delta_unscaled = 10_000 × -1_000_000 = -10_000_000_000`
- `delta_scaled = -(-10_000_000_000) / 1_000_000_000 = 10`
- `Notional(+10)` → "long receives 10" ✓

**Negative rate, short position:**
- `size.0 = -50`, `mark.0 = 100`, `rate.0 = -1_000_000`
- `notional = -50 × 100 = -5_000`
- `delta_unscaled = -5_000 × -1_000_000 = 5_000_000_000` (positive i128)
- `delta_scaled = -5_000_000_000 / 1_000_000_000 = -5`
- `Notional(-5)` → "short pays 5" ✓

**The single `-` in front of `delta_unscaled` handles all four cases.** Without it, longs would receive when they should pay, and vice versa. **One character; one design decision.**

> 🛑 **Anti-fluency.** "Why not compute the delta without the `-` and call it 'market delta', then flip at the storage layer?" **Two sign-flip points double the chance of bugs.** Encoding "account-centric" once at the math layer means everyone downstream (bridge, balances, telemetry) reads `Notional` with the consistent convention. **A single conversion point is half the surface area to test.**

### Step 3: Add the 4 unit tests

After the existing rate tests (and before the proptest block — we'll add the new proptest to the existing `proptest! { ... }` block in Step 4), add:

```rust
    #[test]
    fn apply_funding_skips_flat_positions() {
        let positions = vec![pos(1, 0), pos(2, 100), pos(3, 0)];
        let settlements = apply_funding(&positions, MarkPrice(100), FundingRate(1_000_000));
        assert_eq!(settlements.len(), 1);
        assert_eq!(settlements[0].account, AccountId(2));
    }

    #[test]
    fn apply_funding_longs_pay_shorts_when_rate_positive() {
        // size 100 (long), mark 100, rate 0.001 (1_000_000 ppb)
        // delta = -(100 * 100 * 1_000_000 / 1_000_000_000) = -10
        let positions = vec![pos(1, 100), pos(2, -50)];
        let s = apply_funding(&positions, MarkPrice(100), FundingRate(1_000_000));
        assert_eq!(s[0].account, AccountId(1));
        assert_eq!(s[0].delta, Notional(-10), "long pays");
        assert_eq!(s[1].account, AccountId(2));
        assert_eq!(s[1].delta, Notional(5), "short receives, half size");
    }

    #[test]
    fn apply_funding_shorts_pay_longs_when_rate_negative() {
        let positions = vec![pos(1, 100), pos(2, -50)];
        let s = apply_funding(&positions, MarkPrice(100), FundingRate(-1_000_000));
        assert_eq!(s[0].delta, Notional(10), "long receives");
        assert_eq!(s[1].delta, Notional(-5), "short pays");
    }

    #[test]
    fn apply_funding_returns_empty_on_zero_rate() {
        let positions = vec![pos(1, 100), pos(2, -50)];
        let s = apply_funding(&positions, MarkPrice(100), FundingRate(0));
        assert!(s.is_empty());
    }
```

4 tests, each pinning a behavior:

1. **`apply_funding_skips_flat_positions`** — input has 3 positions but 2 are flat. Output has 1. Filter semantics confirmed. **Also confirms the account in the surviving settlement matches the non-flat input position.**

2. **`apply_funding_longs_pay_shorts_when_rate_positive`** — the canonical scenario. Long position 100 at mark 100 with rate 0.1% → delta -10 (long pays). Short position -50 → delta +5 (short receives, half magnitude because position is half size). **The asymmetric magnitudes prove that delta scales with `|size|`, not just sign.**

3. **`apply_funding_shorts_pay_longs_when_rate_negative`** — same positions, opposite rate. Long now receives +10, short pays -5. **Confirms the sign convention is symmetric.**

4. **`apply_funding_returns_empty_on_zero_rate`** — the fast-path. Non-empty positions, zero rate → empty output. **Confirms the early return runs before any per-position work.**

The `pos(account, size)` helper was added in L5's test-module setup; we use it freely here.

### Step 4: Add the balanced-book zero-sum proptest

In the existing `proptest! { ... }` block (which currently holds only `premium_is_antisymmetric_in_mark_index`), add a second test:

```rust
        /// Sum of all settlement deltas is zero (or exactly the negation of
        /// itself with saturation tolerance) when the population is balanced.
        /// Equivalently: funding redistributes between longs and shorts —
        /// it doesn't create or destroy quote currency.
        ///
        /// We test the property by constructing equal-and-opposite long/short
        /// pairs and asserting their settlements sum to zero exactly.
        #[test]
        fn balanced_book_settlements_sum_to_zero(
            size in 1i64..1_000_000,
            mark in 1u64..1_000_000,
            rate in -10_000_000i64..10_000_000,
        ) {
            let positions = vec![
                pos(1, size),
                pos(2, -size),
            ];
            let s = apply_funding(&positions, MarkPrice(mark), FundingRate(rate));
            if rate == 0 {
                prop_assert!(s.is_empty());
            } else {
                prop_assert_eq!(s.len(), 2);
                prop_assert_eq!(s[0].delta.0 + s[1].delta.0, 0);
            }
        }
```

**The zero-sum property is the fundamental conservation law for funding.** A balanced book — one long for every short of equal size — should redistribute exactly. The shorts collectively receive what the longs collectively pay; quote currency is neither created nor destroyed.

Key algebra behind this exactness: for mirrored pairs `(+P, -P)` and positive divisor `d`, integer division still preserves `(-P) / d == -(P / d)`. So when inputs are strictly symmetric, truncation does not introduce residual drift and the sum lands on exactly zero without tolerance.

The proptest exercises this:
- **Generate** a random `size` (1 to 1M), `mark` (1 to 1M), and `rate` (-10M to +10M ppb, i.e., -1% to +1%).
- **Construct** a balanced book: account 1 long `size`, account 2 short `size`.
- **Apply funding**. If rate is 0, the output is empty (no settlements at all). Otherwise, exactly 2 settlements.
- **Assert** the deltas sum to 0.

> 🛑 **Predict.** Why bound `size` to `1i64..1_000_000` rather than the full i64 range?

(Answer: **At very large `size` or `mark`, the i128 intermediate can saturate.** When `i128::saturating_mul` clips, the round-trip computation `(size * mark * rate / RATE_SCALE)` loses information — the long's saturated value won't be exactly the negative of the short's saturated value, breaking the zero-sum property. **The 1M bound keeps inputs in the regime where saturation doesn't kick in.** A real production proptest could be wider but would need to add tolerance for saturation; we chose the simpler "no saturation regime" approach.)

> 🛑 **Anti-fluency.** "Couldn't we test `sum.abs() < 1` to allow for integer-division rounding instead of `== 0`?" **Within the input range we chose, the property holds exactly.** Because `size_long == -size_short`, the i128 products are exact negatives of each other before the divide; the divide by `RATE_SCALE` doesn't change that (integer division rounds toward zero, and `-x / d == -(x / d)` for any signed `x` and positive `d`). **We get exact zero-sum within range; no tolerance needed.**
>
> "But integer division truncates the remainder — wouldn't the sum drift by `+1` or `-1`?" — no, because the long-side and short-side `i128` products form a **perfectly mirrored pair `(P, -P)`**, identical in magnitude and opposite in sign. For example, if the products are `(12_345, -12_345)`, then `12_345 / 1_000_000_000 = 0` remainder `12_345`, and `-12_345 / 1_000_000_000 = 0` remainder `-12_345`. Both quotients are `0`, and the truncated remainders are also **equal in magnitude and opposite in sign** — they cancel exactly. As long as the long-side and short-side inputs are strictly symmetric, the identity `-x / d == -(x / d)` holds pointwise, and the sum's zero-sum survives without tolerance.

### Step 5: Update `lib.rs`

Current re-export:

```rust
pub use compute::{compute_premium, compute_rate};
```

Becomes:

```rust
pub use compute::{apply_funding, compute_premium, compute_rate};
```

Alphabetical order. **Module 2's three pure functions are now all re-exported at the crate root.** Callers can use them without going through `compute::`.

### Step 6: Run tests

```bash
cargo test -p openhl-funding
```

Expected:

```
   Compiling openhl-funding v0.1.0 (/Users/.../my-openhl/crates/funding)
warning: unresolved link to `FundingClock`
    Finished `test` profile [unoptimized + debuginfo] in 0.7s

running 15 tests
test compute::tests::apply_funding_longs_pay_shorts_when_rate_positive ... ok
test compute::tests::apply_funding_returns_empty_on_zero_rate ... ok
test compute::tests::apply_funding_shorts_pay_longs_when_rate_negative ... ok
test compute::tests::apply_funding_skips_flat_positions ... ok
test compute::tests::balanced_book_settlements_sum_to_zero ... ok
test compute::tests::premium_is_antisymmetric_in_mark_index ... ok
... (rest of L4-L6 tests)

test result: ok. 15 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

**15 tests, all green.** Only one rustdoc warning left (`FundingClock` — resolves at L8). **Module 2 closes.**

Common errors:

- **`delta == 0` everywhere** — you forgot the `-` in front of `delta_unscaled`. Without the sign flip, longs and shorts get the same-sign delta (because `pos.size` carries the sign already), so longs and shorts both pay/both receive instead of opposing. The unit tests catch this immediately.
- **Long pays, short pays** (both negative deltas) — you missed that `pos.size` is signed. The naive `size * mark * rate` (no upcast) might work but the sign tracking is fragile. Use `i128::from(pos.size.0)` to preserve the sign through the multiplication.
- **Proptest fails at `size = 100_000, mark = 100_000`** — `size * mark = 1e10`, then `× rate = 1e16` — still within i128 range. Property should still hold. If it fails, check the sign flip: the long and short must produce equal-magnitude deltas with opposite signs.
- **`assertion failed: s[0].delta == Notional(-10)` got `Notional(10)`** — you set `delta_unscaled` correctly but forgot the leading `-`. The "longs pay = negative delta" convention requires the flip.

## Design reflection

Four load-bearing decisions in this lesson:

1. **Single unary minus carries the entire sign convention.** Encoding "longs pay" via `-delta_unscaled` keeps the convention in one place, at the boundary between market-centric and account-centric semantics. **Two sign-flip points would double the surface area for bugs.**

2. **Filter, don't error.** Flat positions are filtered out silently. We don't return `Result<Vec<Settlement>, FlatPositionError>` — flat positions are *expected* (any account that closed out before this tick). **The "no flat positions" property is a precondition the caller can verify if they care; we just drop them.**

3. **Slice input, owned output.** `&[Position]` lets the caller retain ownership; `Vec<Settlement>` returns owned data the caller didn't have before. **The function consumes references and produces values; it's a pure transformation.**

4. **Proptest range avoids saturation regime.** Bounding `size in 1..1M` keeps the i128 products below `saturating_mul`'s clamp threshold. The property holds *exactly* in this range; broadening would force us to weaken the property. **Choose proptest ranges to make the property exactly true, not approximately.**

## Answer key

```bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/compute.rs ./crates/funding/src/compute.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
```

After L7:
- **compute.rs** matches Stage 8b **exactly**. All three pure functions, all helpers, all tests, all proptests.
- **lib.rs** re-exports `apply_funding`, `compute_premium`, `compute_rate`. The remaining gap is `pub mod clock;` and its re-exports — L8.

**Module 2 is complete.** Module 3 starts at L8.

Return:

```bash
git checkout main
```

## Common questions

**Q: Why does the output preserve input order rather than sorting by account?**
Determinism. Sorting would impose an ordering choice; preserving input order makes the function's behavior trivially predictable from the input. **Callers that need sorted output can sort the result; callers that don't, don't pay the cost.** The cheapest behavior wins by default.

**Q: What's the order of magnitude for `notional × rate` at realistic inputs?**
With `size = 1M`, `mark = 1M`, `rate = 1e7` (1% of RATE_SCALE = 1% per interval): `notional = 1e12`, `delta_unscaled = 1e19`. This is right around `i64::MAX` (~9.2e18), so we're in the saturation regime already with these "reasonable" inputs. **i128 intermediates are not optional for realistic deployments.**

**Q: Why no tests for the saturation behavior of `apply_funding`?**
The saturation cases are tested *via the helper* (`saturate_i128_to_i64`'s boundary behavior is explored in L5). Testing the same boundary again at this function call would be redundant. **Test the helper once; trust it everywhere else.** A composition test (`size = u64::MAX, mark = u64::MAX, rate = i64::MAX`) might be worth adding for completeness, but Stage 8b chose not to — the saturation guarantees come from the helper, and the helper is tested.

**Q: Could `apply_funding` be a `parallel_iter` for huge position lists?**
Yes, with `rayon`. At v0 the position list is at most a few thousand accounts (HL's actual user count for any single market). Parallelization overhead exceeds the work. **At 10K+ positions per tick, rayon would pay off.** Defer until production traffic demands it.

## Module 2 milestone — what you've built

After L7:
- **3 pure functions**: `compute_premium`, `compute_rate`, `apply_funding`.
- **1 private helper**: `saturate_i128_to_i64`.
- **15 tests**: 9 hand-traced + 2 proptests (antisymmetry, zero-sum).
- **~150 lines** of `compute.rs` (excluding tests).
- Module 2 is **byte-identical to Stage 8b** for everything outside the clock.

The crate now produces a fully-determined `Vec<Settlement>` from a `(positions, mark, index, params)` tuple. **The math is done.** Module 3 wraps this in tick-gating state — when to compute, when to skip, when to settle.

## Next lesson (L8)

L8 creates `crates/funding/src/clock.rs` — a new module — with the `FundingClock` struct + the `FundingTick` output type. The first version of `tick()` is added: a function that combines `compute_premium` + `compute_rate` + `apply_funding` behind a "has enough time elapsed?" guard. **The clock is the discrete event loop that calls the pure math on the right cadence.** Tests in L8 are simple sanity tests; the *invariants* (at-most-one-per-interval, no-catch-up) get their own lessons in L9 and L10.
````

---

## Seed-file slot

L7 lands in Module 2 at sortOrder 3 (closes the module):

```typescript
{
  title: 'Lesson 7 — apply_funding — sign convention + zero-sum proptest',
  slug: 'openhl-funding-apply-funding-en',
  type: 'CONTENT',
  sortOrder: 3,
  duration: 40,
  xpReward: 80,
  content: `# Lesson 7 — \`apply_funding\` — sign convention + zero-sum proptest\n\n...`
},
```

## SHA pinning discipline

L7 cites `cd94137` (Stage 8b). After L7, `compute.rs` is byte-identical to Stage 8b. lib.rs has all three function re-exports.

## Style review notes (self-critique before paste)

- **§Goal frames L7 as Module 2 closer** — all pure compute done.
- **§Predict on sign flip** earns the design choice — readers reason through why an unary minus is the cleanest encoding.
- **§Step 1 has 6 named moving parts**.
- **§Step 2 walks through 4 sign combinations** with explicit arithmetic.
- **§Anti-fluency on two sign-flip points** preempts the "but I want symmetric semantics" reflex.
- **§Step 3 explains what each test catches**.
- **§Step 4 has a predict on the proptest range** — why bound to 1M, not full i64.
- **§Anti-fluency on saturation tolerance** preempts "shouldn't proptest tolerate rounding?" reflex.
- **§Design reflection 1-4** name distinct generalizable patterns.
- **§Common questions** address order preservation, magnitude analysis, saturation tests, parallelization.
- **§Module 2 milestone summary** celebrates the closure.
- **L8 preview** is concrete: new module, FundingClock struct, tick combines all three pure functions.
