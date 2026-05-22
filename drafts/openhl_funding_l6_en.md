# Building OpenHL Funding — L6 draft (EN) — build-along

> Drafted against openhl SHA `cd94137` (Stage 8b — funding state machine).
> Course: `building-openhl-funding-en` (track: `reth-l1-architect`).

---

## L6 — `openhl-funding-compute-rate-en`

- **Module:** 2 (Pure compute), sortOrder 2
- **Course-level sortOrder:** 6 (lesson 7 of 12)
- **Duration:** 30 min
- **XP reward:** 60
- **Type:** CONTENT

### Content

````markdown
# Lesson 6 — `compute_rate` — divisor + cap

## Goal

Concepts you'll grasp in this lesson:

- **Order of operations preserves units** — divide first, *then* clamp. The cap is `4%/interval` so it must bind at the rate level. Clamp-then-divide would silently turn the cap into `cap/divisor` (e.g., `0.5%/interval` with HL defaults), invisibly weakening the spec.
- **Symmetric clamp via `.clamp(-cap, cap)`** — Rust's built-in `i64::clamp` reads top-to-bottom and applies both sides at once; the common bug pattern is `min(raw, cap)` (positive only) leaving the negative side unclamped.
- **Defensive `.abs()` at the API boundary** — accepting `FundingRate(-40_000_000)` as a cap and treating it as magnitude is one less footgun for callers who reasonably expect either sign to work. ~1 ns cost, real safety.
- **Edge cases that fall out naturally beat explicit branches** — `cap == 0` produces `FundingRate(0)` without a special-case because `clamp(0, 0) = 0`. No extra code path means no extra path to test.
- **No proptest where there's no property** — `compute_rate` is "divide and clamp"; there's no algebraic invariant for proptest to shine on. Hand-traced tests cover the distinct input regions; resist forcing a proptest where there isn't one.

Verification:

```bash
cargo test -p openhl-funding
```

…passes 10 tests (5 from L4-L5 + 5 new).

Specific changes:

`compute.rs` gains:

- **`compute_rate(premium, params) -> FundingRate`** — turns a raw premium into a per-interval rate by dividing by `params.divisor` and clamping to `±params.rate_cap`.
- **5 unit tests** covering: the divisor effect, the positive cap clamp, the negative cap clamp, the disabled-when-divisor-zero case, the disabled-when-cap-zero case.

After L6, two of `compute.rs`'s three pure functions are done. **`apply_funding` is the only one left** — L7.

The teaching focus is the **order of operations**: divide *then* clamp. Reversing that order would change the rate cap's meaning entirely — and it's the kind of off-by-one design bug that's easy to introduce and hard to detect.

## Recap

After L5:
- `compute_premium` produces a signed premium from mark/index.
- The antisymmetry proptest exercises 256 random pairs.
- `saturate_i128_to_i64` is in place but only used by `compute_premium` so far.

L6 adds the second pure function. `compute_rate` is shorter than `compute_premium` (no overflow gymnastics — the values it processes already fit in i64) but encodes its own set of design decisions.

## Plan

Two edits:

1. **Append `compute_rate` to `compute.rs`** — 10 lines of body, after `compute_premium` (before `saturate_i128_to_i64`).
2. **Append 5 unit tests** to the existing `mod tests` block.
3. **Update `lib.rs`** — add `compute_rate` to the `pub use compute::{...}` re-export.

> 🛑 **Predict.** Before scrolling: we'll compute `raw_rate = premium / divisor`, then clamp to `±cap`. **What changes if we clamp first and then divide?** Hint: think about what unit the cap is in.

(Answer: **Clamping first would make the cap mean "the maximum premium," not "the maximum rate."** With `cap = 4%/interval` and `divisor = 8`, clamping the premium to `±4%` and then dividing produces a maximum *rate* of `0.5%/interval`. With our approach (divide first, then clamp at the rate level), the cap genuinely binds at `4%/interval`. **The cap's unit must match the output's unit.** Premium and rate are both scaled by `RATE_SCALE`, so they look numerically similar — but they're semantically different. The divisor changes which one you're capping.)

## Walk-through

### Step 1: Add `compute_rate`

Open `crates/funding/src/compute.rs`. After `compute_premium`, before `saturate_i128_to_i64`, add:

```rust
/// Divide the premium by `params.divisor` and clamp to ±`params.rate_cap`.
///
/// `divisor == 0` is treated as "funding disabled" → returns `FundingRate(0)`,
/// which causes `apply_funding` to produce zero-delta settlements for every
/// position (or none, by the filter inside `apply_funding`).
#[must_use]
pub fn compute_rate(premium: Premium, params: FundingParams) -> FundingRate {
    if params.divisor == 0 {
        return FundingRate(0);
    }
    let raw = premium.0 / i64::from(params.divisor);
    let cap = params.rate_cap.0.abs();
    let capped = raw.clamp(-cap, cap);
    FundingRate(capped)
}
```

10 lines of body. Four moving parts:

1. **`if params.divisor == 0 { return FundingRate(0); }`** — the funding-disabled early exit. Without this, the `premium.0 / i64::from(params.divisor)` line would panic (division by zero). **A guard is the only safe response to a divisor of zero.**

2. **`premium.0 / i64::from(params.divisor)`** — the division. `premium.0` is `i64`; `divisor` is `u32`. `i64::from(u32)` widens losslessly (any u32 value fits in i64). Then `i64 / i64` produces an i64 quotient. **The result is the "raw" per-interval rate before any clamping.**

3. **`let cap = params.rate_cap.0.abs();`** — extract the cap as an absolute value. `params.rate_cap` is a `FundingRate(i64)`, and the user *might* have provided a negative value. We don't care about the sign of the cap — we care about the magnitude. **The cap is a width, not a position.**

4. **`raw.clamp(-cap, cap)`** — the symmetric clamp. `i64::clamp(min, max)` returns `min` if `raw < min`, `max` if `raw > max`, else `raw`. **Built-in Rust API; no manual `if/else` chain needed.**

> 🛑 **Anti-fluency.** "Why bother with `.abs()` on the cap? Couldn't we just require the user to pass a positive cap?" **We could, but defensive abs is cheaper than runtime validation.** A user who passes `FundingRate(-40_000_000)` thinking "negative cap" or "absolute cap, allow either sign" gets the same behavior as `FundingRate(40_000_000)`. The cost is one `.abs()` call (~1ns); the benefit is one less footgun. **`.abs()` is the API equivalent of saying "I accept either sign for the cap; I'll interpret it as a magnitude."**

> 🛑 **Anti-fluency.** "Why not also handle `params.rate_cap == 0` as a special case?" **We don't need to — it falls out naturally.** When `cap == 0`, `clamp(-0, 0)` produces `0` for any input. The result is `FundingRate(0)`, which is the disabled-funding semantics we want. **Code that works naturally for the edge case beats code with explicit edge-case branches.**

### Step 2: Why divide first

The order matters. Two alternatives:

**A) Our approach: divide, then clamp**

```rust
let raw = premium / divisor;
let capped = raw.clamp(-cap, cap);
```

- Cap binds at the *rate* level.
- `cap = 4%/interval` means "no single interval can pay more than 4%."
- Premium of `100%` with divisor `8` → raw `12.5%`, clamped to `4%`.

**B) Reverse: clamp, then divide**

```rust
let capped_premium = premium.clamp(-cap, cap);
let raw = capped_premium / divisor;
```

- Cap binds at the *premium* level.
- `cap = 4%` means "no single premium reading can exceed 4%."
- Premium of `100%` clamped to `4%`, then divided by `8` → final rate `0.5%`.

**Approach A is what we want.** Approach B would make the cap effectively `0.5%/interval` (rate_cap divided by divisor), which isn't what the docstring promises.

**With a 100% premium (= `RATE_SCALE` ppb)**, the two approaches diverge dramatically from the same input — the data flow makes the gap obvious:

```
HL defaults: divisor = 8, cap = ±4%

🟢 Approach A (the implementation) — divide → clamp
   ┌─ Premium: 100% (1_000_000_000 ppb) ─┐
   │                                      │
   │            ┌─ / divisor 8 ──► raw rate: 12.5% (125_000_000 ppb)
   │            │                                    │
   │            │                                    ▼
   │            │                      ┌─ clamp(-4%, +4%) ─► 4% (40_000_000 ppb)  ✨ correct
   │            ▼                      │                          │
   └────────────┴──────────────────────┘                          ▼
                                                           [FundingRate: 4%/interval]
                                                            = spec ceiling binds correctly

🔴 Approach B (order reversed, wrong) — clamp → divide
   ┌─ Premium: 100% (1_000_000_000 ppb) ─┐
   │                                      │
   │            ┌─ clamp(-4%, +4%) ──► clamped premium: 4% (40_000_000 ppb)
   │            │                              │
   │            │                              ▼
   │            │              ┌─ / divisor 8 ──► 0.5% (5_000_000 ppb)  ❌ 1/8 of spec
   │            ▼              │                       │
   └────────────┴──────────────┘                       ▼
                                                [FundingRate: 0.5%/interval]
                                                 = cap silently mutates from "rate ceiling"
                                                   into "premium ceiling", and the effective
                                                   ceiling shrinks to spec/divisor
```

Same `premium` / `divisor` / `cap` go in, but flipping two lines inside the function yields `4%` vs `0.5%` — an 8x semantic discrepancy that no compiler warning and no unit-test type signature will surface. The discipline that prevents it compresses into one sentence: **the cap's unit must match the output's unit (rate)**.

> 🛑 **Predict.** With `params.hyperliquid_default()` (divisor=8, cap=4%), what's the maximum rate produced from a premium of `RATE_SCALE` (100% dislocation)?

(Answer: **`FundingRate(40_000_000)` = 4%/interval.** Walk through: premium.0 = 1_000_000_000 (RATE_SCALE). raw = 1_000_000_000 / 8 = 125_000_000 (12.5%/interval). cap = 40_000_000 (4%). clamp(-40_000_000, 40_000_000) on 125_000_000 → 40_000_000. **The cap does its job.** Compare to approach B: clamped_premium = clamp(1_000_000_000) at cap 40_000_000 → 40_000_000. raw = 40_000_000 / 8 = 5_000_000 (0.5%). Way under the spec.)

### Step 3: Add 5 unit tests

In the `#[cfg(test)] mod tests` block, after the existing premium tests (and before the proptest block), add:

```rust
    #[test]
    fn rate_divides_premium_by_divisor() {
        let params = FundingParams::hyperliquid_default();
        // premium = 0.01 (10_000_000 ppb), divisor = 8 → rate = 1_250_000
        let r = compute_rate(Premium(10_000_000), params);
        assert_eq!(r, FundingRate(1_250_000));
    }

    #[test]
    fn rate_clamps_at_positive_cap() {
        let params = FundingParams::hyperliquid_default();
        // premium = 1.0 (RATE_SCALE), divisor = 8 → raw = 125_000_000
        // cap is 40_000_000 → clamps to 40_000_000.
        let r = compute_rate(Premium(RATE_SCALE), params);
        assert_eq!(r, FundingRate(40_000_000));
    }

    #[test]
    fn rate_clamps_at_negative_cap() {
        let params = FundingParams::hyperliquid_default();
        let r = compute_rate(Premium(-RATE_SCALE), params);
        assert_eq!(r, FundingRate(-40_000_000));
    }

    #[test]
    fn rate_zero_when_divisor_is_zero() {
        let mut params = FundingParams::hyperliquid_default();
        params.divisor = 0;
        let r = compute_rate(Premium(RATE_SCALE), params);
        assert_eq!(r, FundingRate(0));
    }

    #[test]
    fn rate_zero_when_cap_is_zero_funding_disabled() {
        let mut params = FundingParams::hyperliquid_default();
        params.rate_cap = FundingRate(0);
        let r = compute_rate(Premium(10_000_000), params);
        assert_eq!(r, FundingRate(0));
    }
```

5 tests, each pinning a specific behavior:

1. **`rate_divides_premium_by_divisor`** — the normal case. Premium 1% (10_000_000 ppb), divisor 8 → rate 0.125% (1_250_000 ppb). The expected value is the paper math `10_000_000 / 8 = 1_250_000`. Catches off-by-one in the division.

2. **`rate_clamps_at_positive_cap`** — clamping kicks in when the premium would produce a raw rate above the cap. Premium 100% → raw 12.5% → clamped to 4%. **Catches: "I forgot to clamp" bugs.**

3. **`rate_clamps_at_negative_cap`** — symmetric to #2 on the negative side. Premium -100% → raw -12.5% → clamped to -4%. **Catches: "I clamped only the positive side" bugs.** This is a real bug pattern; people write `min(raw, cap)` instead of `raw.clamp(-cap, cap)` and miss the negative side.

4. **`rate_zero_when_divisor_is_zero`** — the disabled-funding case via divisor. Even with a non-zero premium, `divisor = 0` makes the function return zero. **Catches: forgot to guard against division-by-zero.** Without the guard, this test would panic in debug mode.

5. **`rate_zero_when_cap_is_zero_funding_disabled`** — the disabled-funding case via cap. With `rate_cap = 0`, the clamp is `[0, 0]`, so any raw rate clamps to 0. **Catches: assuming clamp(0, 0) does something other than return 0.** Also confirms our "no special case for cap == 0" approach works.

> 🛑 **Predict.** What happens if you set `params.rate_cap = FundingRate(-40_000_000)` (a negative cap) and run test 2?

(Answer: **Same result — `FundingRate(40_000_000)`.** Because `.abs()` extracts the magnitude. Negative caps and positive caps with the same absolute value produce identical behavior. **The "negative cap" is silently accepted.** This is the defensive abs at work — the user gets reasonable behavior either way.)

### Step 4: Update `lib.rs`

The current re-export line:

```rust
pub use compute::compute_premium;
```

Becomes:

```rust
pub use compute::{compute_premium, compute_rate};
```

Two functions now in the public API. **Alphabetical order maintained** — `compute_premium` before `compute_rate`. The pattern continues with L7 when `apply_funding` arrives.

### Step 5: Run tests

```bash
cargo test -p openhl-funding
```

Expected output:

```
running 10 tests
test compute::tests::premium_is_antisymmetric_in_mark_index ... ok
test compute::tests::premium_negative_when_mark_below_index ... ok
test compute::tests::premium_positive_when_mark_above_index ... ok
test compute::tests::premium_saturates_to_zero_when_index_is_zero ... ok
test compute::tests::premium_zero_when_mark_equals_index ... ok
test compute::tests::rate_clamps_at_negative_cap ... ok
test compute::tests::rate_clamps_at_positive_cap ... ok
test compute::tests::rate_divides_premium_by_divisor ... ok
test compute::tests::rate_zero_when_cap_is_zero_funding_disabled ... ok
test compute::tests::rate_zero_when_divisor_is_zero ... ok

test result: ok. 10 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

10 tests, all green. Rate tests + premium tests + proptest.

Common errors:

- **Panic in `rate_zero_when_divisor_is_zero`** — you forgot the early-return guard. `premium.0 / 0` is an arithmetic panic in Rust. Add `if params.divisor == 0 { return FundingRate(0); }` at the top of the function.
- **`assertion failed: left=-125000000 right=-40000000` in `rate_clamps_at_negative_cap`** — you wrote `raw.min(cap).max(-cap)` instead of `raw.clamp(-cap, cap)`, and got the min/max order wrong. `.clamp(min, max)` is the canonical Rust idiom; use it.
- **`assertion failed: left=0 right=1_250_000` in `rate_divides_premium_by_divisor`** — you wrote `premium.0 / params.divisor` (mixed types) instead of `premium.0 / i64::from(params.divisor)`. The error is actually a compile error (`u32 vs i64` mismatch); if you typo'd `as i64` it might compile but truncate. Use `i64::from(...)`.
- **`error: cannot find function 'compute_rate'`** in `lib.rs` re-export — you added `compute_rate` to the re-export but didn't define the function. Check that you actually added the function body to `compute.rs`.

## Design reflection

Four load-bearing decisions in this lesson:

1. **Divide first, then clamp.** The cap binds at the *rate* level (the output), not the *premium* level (the input). Reversing the order would effectively divide the cap by the divisor, silently weakening it. **Order-of-operations matters when units differ.**

2. **`.abs()` on the cap.** Defensive against users passing negative caps; cheap (~1ns) and removes a footgun. **Defensive idioms at the API boundary are worth their cost.**

3. **`clamp(-cap, cap)` instead of explicit min/max.** Rust's built-in `.clamp` is shorter, more idiomatic, and less error-prone than `raw.max(-cap).min(cap)`. **Use stdlib APIs when they fit; reach for custom code only when they don't.**

4. **No special case for `cap == 0`.** It falls out of the clamp naturally: `clamp(-0, 0)` returns `0`. **Edge cases handled naturally are better than edge cases with explicit branches.** Explicit branches add code paths to test; natural handling is automatically covered.

## Answer key

```bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/compute.rs ./crates/funding/src/compute.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
```

After L6:
- **compute.rs** matches Stage 8b through `compute_premium` + `compute_rate` + `saturate_i128_to_i64` + the 4 premium tests + 5 rate tests + 1 proptest. The only remaining gap is `apply_funding` and the balanced-book proptest (L7).
- **lib.rs** re-exports `compute_premium` and `compute_rate`. `apply_funding` is L7's addition.

Return:

```bash
git checkout main
```

## Common questions

**Q: Why is `params.divisor` a `u32` if we have to widen it to `i64` anyway?**
The widening is a single `i64::from(u32)` call — a no-op cost in machine code. The benefit of `u32` storage is bit cost (`FundingParams` is `Copy`, smaller is better) and semantic clarity (a divisor of `-1` or `u64::MAX` makes no sense; `u32::MAX` is still ~4 billion, plenty of headroom). **`u32` documents intent: "this is a small positive count."**

**Q: Could `compute_rate` ever overflow?**
The division `premium / divisor` cannot grow the value — division by a positive integer produces a smaller magnitude. `clamp(-cap, cap)` cannot grow beyond `cap`'s i64 value. **No overflow possible inside `compute_rate`.** Unlike `compute_premium`, no i128 intermediate is needed.

**Q: What if `rate_cap > i64::MAX / 2`? Does the symmetric clamp still work?**
`.abs()` on `i64::MIN` panics, and the reason is **two's-complement asymmetry**: a signed 64-bit integer packs one more negative value than positive (negatives go down to `i64::MIN = -2^63`, positives only up to `i64::MAX = 2^63 - 1`), so `|i64::MIN| = 2^63` is one bit past the largest representable positive `i64`. The `.abs()` call therefore overflows — panic in debug, wrap in release. With `rate_cap.0 == i64::MIN`, that's the path we'd hit. Stage 8b doesn't guard against this — it's a user-supplied `FundingParams` issue. Realistic deployments use values like `40_000_000` (way below `i64::MAX / 2`), so the edge isn't reachable in practice. **A defensive `saturating_abs()` (which folds `i64::MIN` to `i64::MAX`) would handle this, but Stage 8b doesn't bother.**

**Q: Why no proptest for `compute_rate`?**
There's no obvious algebraic property to test. "Divide and clamp" doesn't have an antisymmetry, commutativity, or other invariant that proptest would shine on. The 5 hand-traced tests cover the input regions (normal divide, positive clamp, negative clamp, divisor zero, cap zero) well. **Proptest is great for properties; hand-traced tests are great for distinct input regions.** Don't force a proptest where there's no property to test.

## Next lesson (L7)

L7 adds `apply_funding` — the third and final pure function. It takes a slice of `Position`s, a `MarkPrice`, and a `FundingRate`, and returns a `Vec<Settlement>` (one per non-flat position). The function is ~25 lines but encodes the *longs-pay-shorts* sign convention and includes the **balanced-book zero-sum** proptest — for every set of equal-and-opposite positions, the settlement deltas sum to zero (funding redistributes; it doesn't create or destroy quote currency). This is the second proptest in the crate and closes Module 2.
````

---

## Seed-file slot

L6 lands in Module 2 at sortOrder 2:

```typescript
{
  title: 'Lesson 6 — compute_rate — divisor + cap',
  slug: 'openhl-funding-compute-rate-en',
  type: 'CONTENT',
  sortOrder: 2,
  duration: 30,
  xpReward: 60,
  content: `# Lesson 6 — \`compute_rate\` — divisor + cap\n\n...`
},
```

## SHA pinning discipline

L6 cites `cd94137` (Stage 8b). After L6, compute.rs is missing only `apply_funding` and the balanced-book proptest (L7). lib.rs re-exports both `compute_premium` and `compute_rate`.

## Style review notes (self-critique before paste)

- **§Goal frames the "order of operations" focus** — readers know to look for the divide-then-clamp argument.
- **§Predict on clamp-first vs divide-first** earns the design choice — readers will reason through what unit the cap is in.
- **§Step 1 has 4 named moving parts** for the function body.
- **§Anti-fluency on `.abs()` defensive** preempts the "let the user handle it" reflex.
- **§Anti-fluency on `cap == 0`** preempts the over-validation reflex (same as L4's `MarkPrice(0)` discussion).
- **§Step 2's table comparing approach A/B** shows the difference concretely.
- **§Predict on hyperliquid_default + premium=RATE_SCALE** walks through the math step by step.
- **§Step 3 explanation of what each test catches** names the specific bug pattern.
- **§Predict on negative cap** confirms the `.abs()` behavior.
- **§Design reflection 1-4** name distinct generalizable patterns.
- **§Common questions** address u32-vs-i64 storage, overflow analysis, the `i64::MIN` edge, and proptest applicability.
- **L7 preview** is concrete: 25-line function, sign convention, balanced-book proptest, Module 2 closure.
