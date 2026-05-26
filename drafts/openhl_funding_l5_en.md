# Building OpenHL Funding — L5 draft (EN) — build-along

> Drafted against openhl SHA `cd94137` (Stage 8b — funding state machine).
> Course: `building-openhl-funding-en` (track: `reth-l1-architect`).

---

## L5 — `openhl-funding-overflow-proptest-en`

- **Module:** 2 (Pure compute), sortOrder 1
- **Course-level sortOrder:** 5 (lesson 6 of 12)
- **Duration:** 30 min
- **XP reward:** 60
- **Type:** CONTENT

### Content

````markdown
# Lesson 5 — Overflow philosophy + the first proptest

## Goal

Concepts you'll grasp in this lesson:

- **Saturate-not-panic-not-wrap as the only consensus-safe overflow** — panic halts the validator and forks it off the network; wrap can differ across compiler versions and produce divergent-but-defined values; saturate gives every validator the same bounded value. There are no other options that preserve consensus liveness.
- **Sign-aware saturation override** — `i64::try_from` reports failure but not direction. The inline fallback expression `unwrap_or(if v > 0 { i64::MAX } else { i64::MIN })` recovers the direction; a fixed `i64::MAX` override would flip `i128::MIN` to positive and silently corrupt sign. (`unwrap_or` is eagerly evaluated, but this immediate expression is trivial and optimized away in practice.)
- **Hand-traced tests vs proptests are complementary, not redundant** — proptest random sampling will never hit `i128::MAX` (one point out of 2^129); boundary cases must be hand-traced. Proptest excels at interior properties; hand-traced tests pin the corners.
- **Test the property that's actually invariant, not the aspirational one** — naive antisymmetry would require equal magnitudes both ways, but integer division breaks that. We test the weaker "signs are opposite" property and document the rounding caveat in the test comment.
- **Why `checked_mul` + `Result` doesn't actually solve it** — the error has to propagate to the bridge, whose only real options are "revert (fork)", "skip (silent inconsistency)", or "settle at the cap" — and the last is exactly what saturate produces without propagation.

No new function. ~5 lines of new test code. **The mental model is the lesson.**

Verification:

```bash
cargo test -p openhl-funding
```

…passes 5 tests (4 from L4 + 1 new proptest).

Specific changes:

- **The first proptest in the codebase** — `premium_is_antisymmetric_in_mark_index`. Swapping `mark` and `index` flips the sign of the premium (or both are zero when they're equal). 256 random inputs per test run.

But the larger payload of this lesson is **conceptual, not code**. We walk through:

1. **Why panic = chain fork.** A validator that panics halts; remaining validators advance without it. State diverges.
2. **Why wrap = chain fork.** Two validators with different compiler versions or build flags can wrap *differently* at the same overflow point. Wrong values diverge from correct values.
3. **Why saturate is bounded behavior.** All validators agree on the saturated value at the same input. No fork.
4. **`saturate_i128_to_i64` boundary cases.** `i128::MAX → i64::MAX`, `i128::MIN → i64::MIN`. Why the `unwrap_or` closure depends on sign, not just `i64::MAX`.

## Recap

After L4:
- `compute_premium` computes a signed premium with `i128` intermediates.
- `saturate_i128_to_i64` clamps overflow to i64 boundaries.
- 4 hand-traced tests pin the function's behavior at normal inputs.

L4's tests don't exercise pathological inputs (e.g., `MarkPrice(u64::MAX)`), and they don't exercise the saturate helper at its boundaries. L5 explores both gaps via philosophy + a proptest.

## Plan

Two edits:

1. **Add a `use proptest::prelude::*;` import** to `compute.rs`'s test module.
2. **Append a `proptest! { ... }` block** with the antisymmetry property.

No production code changes.

> 🛑 **Predict.** Before scrolling: a panic in `compute_premium` halts the validator. **Why is this a chain fork, not just a single-node failure?** Hint: think about what the other validators are doing when one halts.

(Answer: **The other validators advance without the halted one.** A funding tick produces deterministic state updates on every validator; if one halts, the network's quorum (typically 2/3+) continues. By the time the halted validator reboots, the chain head is many blocks ahead. The halted validator can't sync — its local state at the halt block disagrees with the network's view of that block. **The halt creates two versions of history: "with the panicking input" and "with the network's advanced state." The validator effectively forked itself off the network.** Saturate, in contrast, lets the validator stay in lockstep.)

## Walk-through

### Step 1: The overflow taxonomy

Lining the three failure modes up by their **final consequence** at the validator/network level makes it obvious why only one option survives:

| Mode | Rust behavior | Validator / network impact | Verdict |
| --- | --- | --- | --- |
| **Panic** (`*` in debug) | thread halts | one validator falls off consensus permanently; network advances without it | ❌ self-inflicted **fork-off** — liveness lost |
| **Wrap** (`*` in release) | silent modulo wrap | compiler-optimization-dependent → either **different wrong values across validators** *or* **all validators agree on a wrong value** | ❌ undetectable **chain fork** or silent corruption |
| **Saturate** (`saturating_mul`) | clamps to type boundary (`i128::MAX` / `MIN`) | every validator agrees on the same **bounded value** and advances; economically, the system settles at a capped rate | ⭕ **liveness preserved** — the only consensus-safe option |

Each row is expanded below.

Three failure modes for "the integer didn't fit":

#### Panic (debug builds with `*`)

```rust
let scaled = diff * i128::from(RATE_SCALE);  // panics on overflow in debug
```

In debug builds, integer overflow panics. The thread that hits the panic halts; if it's the funding tick on a validator, the validator's state machine stops advancing. **The rest of the network doesn't notice and continues.** When the halted validator restarts, its world-view at the panic block doesn't match the network's. From that point forward, it can't validate further blocks — it sees them as referencing state it never computed.

Effectively: **one validator is gone, but its absence corrupts only itself, not the network.** The chain forks not by producing two valid histories, but by the panicking validator falling permanently off the consensus.

#### Wrap (release builds with `*`)

```rust
let scaled = diff * i128::from(RATE_SCALE);  // silently wraps in release
```

In release builds, `*` wraps without panicking. The result is `(diff * RATE_SCALE).wrapping_rem(2^128)` — a *defined* value, but not the mathematically correct one.

**The hazard**: two validators with different compiler optimizations might wrap *differently*. Compilers can re-order operations under associativity rules; `(a * b) * c` and `a * (b * c)` can produce different wrapped results when intermediate overflows differ. Even if both validators wrap identically by chance, the *wrong* value still propagates to every account that gets settled this tick. **All validators agree on the wrong answer.** Then a downstream client that recomputes the funding from raw inputs disagrees. The chain forks via inconsistency between layers.

In *release builds* the wrap is silent — no log, no warning, no event. **The hardest class of bug to detect: wrong but consistent.**

#### Saturate (our chosen behavior)

```rust
let scaled = diff.saturating_mul(i128::from(RATE_SCALE));  // clamps to i128::MAX/MIN
```

Saturation produces a defined value at the type boundary: `i128::MAX` on positive overflow, `i128::MIN` on negative. **Every validator with `saturating_mul` produces the same value.** No fork.

The *funding rate* at saturation is effectively the cap (after `saturate_i128_to_i64` further clamps to i64). The economic consequence: an extreme oracle dislocation that pushes premium past the saturation point produces a payment at the maximum rate, not a panic and not a wrap. **The behavior degrades gracefully.**

> 🛑 **Anti-fluency.** "Couldn't we use `checked_mul` and return an error?" **Yes, but it pushes the problem to the caller.** `Result<Premium, OverflowError>` would propagate up through `compute_rate`, `apply_funding`, the clock — and eventually to the bridge, which would have to decide what to do. The bridge's options would be (a) revert the block (chain fork), (b) skip the funding tick (silent state inconsistency), (c) settle at the cap anyway. **The "settle at the cap" outcome is what saturation achieves directly, without propagating the error.**

### Step 2: `saturate_i128_to_i64` boundary cases

Recall the helper from L4:

```rust
fn saturate_i128_to_i64(v: i128) -> i64 {
    i64::try_from(v).unwrap_or(if v > 0 { i64::MAX } else { i64::MIN })
}
```

Three input regimes:

| Input | `try_from` result | `unwrap_or` produces |
|---|---|---|
| `v` fits in i64 | `Ok(v as i64)` | `v as i64` (no override) |
| `v > i64::MAX` | `Err(...)` | `i64::MAX` (since `v > 0`) |
| `v < i64::MIN` | `Err(...)` | `i64::MIN` (since `v ≤ 0`) |

**Why the sign check inside `unwrap_or`?** Because `try_from` doesn't tell us which direction the overflow went — it just says "doesn't fit." If we returned a fixed value (say `i64::MAX`) on every overflow, then `i128::MIN` would saturate to `i64::MAX` instead of `i64::MIN` — the sign would flip. The `if v > 0` test recovers the direction.

The key observation is that **`try_from`'s `Err` drops the direction information, but the original argument `v` (i128) is still in scope and readable from the closure**. The data flow:

```
                     ┌──── Ok(value)  ─────────────────────┐
                     │     (v fits in i64)                 │
[input] v: i128 ──► try_from(v)                             │
                     │     doesn't fit → direction discarded │
                     └──── Err(_)                           │
                              │                             │
                              │  ★ inside unwrap_or's closure, the original   │
                              │     v (i128) is still visible — peek at it    │
                              ▼                             │
                       if v > 0  ──► i64::MAX  ─────────────┤
                       else      ──► i64::MIN  ─────────────┤
                                                            ▼
                                                       [output] i64 (sign preserved)

example:  v = i128::MAX  → try_from = Err → v > 0 is true  → i64::MAX  ✅
          v = i128::MIN  → try_from = Err → v > 0 is false → i64::MIN  ✅ (a fixed fallback would flip this to MAX — disaster)
          v = 0          → try_from = Ok(0) → closure doesn't fire    → 0
```

"`Err` drops the value but the original argument is still in scope" is the whole point of `unwrap_or` taking a closure. A naive `unwrap_or(i64::MAX)` would map `i128::MIN` — the most-negative possible intermediate — to a **positive** `i64::MAX`, silently flipping the premium's sign onto consensus. The closure version inserts one line — "peek at `v` to recover direction" — that physically closes that hole.

> 🛑 **Predict.** What does `saturate_i128_to_i64(0)` return?

(Answer: **`0`.** `i64::try_from(0_i128)` returns `Ok(0)`. The `unwrap_or` branch never fires. **Saturation is a no-op for in-range values.** This is important for the proptest below — most random `(mark, index)` pairs produce premiums that fit comfortably in i64, and the saturate helper is invisible for those.)

> 🛑 **Anti-fluency.** "We test the boundaries explicitly — wouldn't a property-based test cover those?" **Probably not by random sampling.** Proptest's default strategy generates values uniformly across the input space. `i128::MAX` is a single point out of 2^129 values; the chance of randomly hitting it is effectively zero. **Boundary tests need to be hand-traced** because they target specific values the generator won't reach by random walk.

### Step 3: Add proptest support to the test module

Open `crates/funding/src/compute.rs`. The current test module starts:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    // ... 4 unit tests from L4 ...
}
```

Add the proptest prelude import. The test module becomes:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use openhl_clob::AccountId;
    use proptest::prelude::*;

    fn pos(account: u64, size: i64) -> Position {
        Position {
            account: AccountId(account),
            size: crate::types::PositionSize(size),
        }
    }

    // ... 4 unit tests from L4 ...
}
```

Three things to notice:

1. **`use openhl_clob::AccountId;`** — needed for the `pos` helper. Not used by L4's tests, but used by L5's proptest (we won't need it in this exact proptest, but L7's apply_funding tests will, and we add it now to stabilize the test module imports).
2. **`use proptest::prelude::*;`** — brings `proptest!`, `prop_assert_eq!`, `prop_assert!`, and the strategy combinators (`1u64..1_000_000`) into scope.
3. **`fn pos(account: u64, size: i64) -> Position`** — a tiny helper that constructs a `Position`. Used by L7. Adding now to stabilize the imports/helpers section.

**Stabilize boilerplate; iterate on tests.** Same logic as L1's deps and L4's `use` block — we add now what we'll need later, so the per-lesson diff stays focused on what's actually new.

### Step 4: Add the antisymmetry proptest

After the 4 unit tests, before the closing `}` of the test module, add:

```rust
    proptest! {
        /// Premium symmetry: swapping mark and index flips the sign.
        /// (Up to integer division rounding, the magnitude is the same — we
        /// allow off-by-one to absorb the rounding-toward-zero asymmetry.)
        #[test]
        fn premium_is_antisymmetric_in_mark_index(
            mark in 1u64..1_000_000,
            index in 1u64..1_000_000,
        ) {
            let a = compute_premium(MarkPrice(mark), IndexPrice(index));
            let b = compute_premium(MarkPrice(index), IndexPrice(mark));
            // Cross-multiplied magnitudes must be equal: |a| / mark == |b| / index
            // (i.e., the proportional dislocation is the same both ways).
            // We test the weaker property that the signs are opposite (or both zero).
            if mark == index {
                prop_assert_eq!(a, Premium(0));
                prop_assert_eq!(b, Premium(0));
            } else {
                prop_assert!(a.0.signum() == -b.0.signum());
            }
        }
    }
```

Several proptest-specific elements:

- **About `signum()` (first appearance):** `i64::signum()` is the standard-library method that reports the sign of a value as `-1` / `0` / `+1`. Negative → `-1`, zero → `0`, positive → `+1`. The assertion `a.0.signum() == -b.0.signum()` therefore reads "the signs of `a` and `b` are opposite (one is `+1`, the other `-1`)" — the magnitude can drift under integer-division rounding, but the **sign must be strictly antisymmetric**. That's the invariant the proptest is locking in.
- **`proptest! { ... }`** — the macro that wraps the test function. Inside this block, `#[test]` functions get treated as property tests with generators.
- **`mark in 1u64..1_000_000`** — the **strategy**. `mark` will be sampled from values in `[1, 1_000_000)`. Default is 256 cases per test run (~256 random `(mark, index)` pairs).
- **`prop_assert_eq!` and `prop_assert!`** — proptest's assertion macros. Same effect as `assert_eq!` / `assert!` on a single case, but proptest needs its own macros to shrink the input on failure (find the *minimal* failing case).

Why this property?

The naive version of "antisymmetry" would be: `compute_premium(MarkPrice(M), IndexPrice(I))` and `compute_premium(MarkPrice(I), IndexPrice(M))` should have **equal-magnitude, opposite-sign** results. But integer division rounds toward zero, so the cross-comparison `|a| / M == |b| / I` doesn't hold exactly — there's an off-by-one rounding asymmetry.

**The proptest tests the weaker property: signs are opposite (or both zero).** When mark = index, both premiums are zero. When mark ≠ index, one is positive and one is negative.

**The comment explains why we weakened it.** A future reader looking at this property and thinking "shouldn't the magnitudes also be equal?" will see the rounding caveat documented in place. **Aspirational properties that don't actually hold under integer arithmetic are testing failures waiting to happen.** Test the property that's actually invariant.

> 🛑 **Anti-fluency.** "Why not use `f64` in the test fixture to compute the expected magnitude exactly?" **Because the test would assert a `f64`-computed expectation against the `i64`-computed actual — and the two would disagree in the LSB.** Tests that compare deterministic-integer code against non-deterministic-float expectations are unreliable. **Keep the test arithmetic in the same domain as the production arithmetic.**

> 🛑 **Predict.** Why does the strategy use `1u64..1_000_000` (excluding zero) instead of `0u64..1_000_000`?

(Answer: **Because `index == 0` is the `Premium(0)` early-return case, already tested as a hand-traced unit test in L4.** Including 0 in the proptest would either: (a) cause the proptest to assert `signs are opposite` when they're both zero, breaking the property, or (b) require special-casing zero inside the proptest, complicating the test. Excluding zero keeps the property clean. **Proptests should exercise the interesting range, not the trivial-or-already-tested range.**)

### Step 5: Run the test

```bash
cargo test -p openhl-funding
```

Expected output:

```
   Compiling openhl-funding v0.1.0 (/Users/.../my-openhl/crates/funding)
warning: unresolved link to `compute_rate`
warning: unresolved link to `apply_funding`
warning: unresolved link to `FundingClock`
    Finished `test` profile [unoptimized + debuginfo] in 0.6s
     Running unittests src/lib.rs

running 5 tests
test compute::tests::premium_is_antisymmetric_in_mark_index ... ok
test compute::tests::premium_negative_when_mark_below_index ... ok
test compute::tests::premium_positive_when_mark_above_index ... ok
test compute::tests::premium_saturates_to_zero_when_index_is_zero ... ok
test compute::tests::premium_zero_when_mark_equals_index ... ok

test result: ok. 5 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

5 tests, all green. The proptest ran 256 random `(mark, index)` pairs; all 256 satisfied the antisymmetry property.

If you want to see proptest's verbosity, set the env var:

```bash
PROPTEST_VERBOSE=1 cargo test -p openhl-funding premium_is_antisymmetric
```

You'll see logs like "passed 256 cases" or, on failure, "shrunk to mark=X index=Y" — the minimal counterexample.

Common errors:

- **`error: macro 'proptest' is not used`** — you imported `use proptest::*` instead of `use proptest::prelude::*`. The macro lives in `prelude`.
- **`prop_assert_eq!` typo to `assert_eq!`** — works in a regular function but inside `proptest!` you need the prop_* variants for proper shrinking. The test will pass but on failure won't shrink to a minimal example.
- **`signs are opposite` fails** — usually means the proptest accidentally included `mark == index` in the else branch. Verify the if/else split: `if mark == index { both zero } else { opposite signs }`.
- **proptest panics on `signum() == -b.0.signum()` when `b.0 == 0`** — happens if compute_premium produces zero for non-equal mark/index (e.g., very small inputs where the integer math rounds to zero). The `1u64..1_000_000` range avoids this; tighter ranges would hit it.

## Design reflection

Five load-bearing decisions in this lesson:

1. **Saturate is the only bounded-behavior overflow option for consensus.** Panic = chain fork via halt. Wrap = chain fork via wrong-but-consistent value. Saturate = same value across all validators, gracefully degraded. **There are no other options that preserve consensus liveness.**

2. **Test the property that's actually invariant, not the aspirational one.** Naive antisymmetry would require equal magnitudes; integer rounding breaks that. We test the weaker property (opposite signs) and document the rounding caveat in the test comment. **Aspirational tests fail in production; invariant tests fail in development.**

3. **Stabilize test-module boilerplate early.** Adding `use proptest::prelude::*`, `use openhl_clob::AccountId`, and the `pos` helper now means the test module's imports stay stable for L6 / L7. **Boilerplate churn obscures the actual diff per lesson.**

4. **The `unwrap_or` sign-aware fallback expression in `saturate_i128_to_i64` is required.** A fixed override would flip negative overflows to positive. Reading the saturate helper carefully reveals why this branch is *necessary*, not just defensive.

5. **Exclude zero from the proptest range** — the zero case is already a hand-traced unit test, and including it in the proptest would require complicating the property. **Hand-traced tests pin boundary cases; proptests pin properties on the interior.** They're complementary, not redundant.

## Answer key

```bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/compute.rs ./crates/funding/src/compute.rs
```

After L5:
- **compute.rs** matches Stage 8b through `compute_premium` + `saturate_i128_to_i64` + the 4 hand-traced premium tests + the antisymmetry proptest + the test-module imports/helpers. `compute_rate`, `apply_funding`, and the rest of the proptests are L6/L7.

Return:

```bash
git checkout main
```

## Common questions

**Q: How many cases does the proptest actually run?**
Default is 256 per test invocation. Configurable via `PROPTEST_CASES=N cargo test`. The shrinker can run additional cases after finding a failure to minimize the counterexample. **At 256 random pairs, the antisymmetry property is exercised against a meaningful sample of the input space without making CI slow.**

**Q: Could we increase to 10,000 cases for stronger coverage?**
You could, but the marginal benefit drops fast for properties with a clean closed form. Antisymmetry isn't a probabilistic property — it either holds or it doesn't. 256 cases provides high confidence that the implementation is correct on the tested range. **For properties with adversarial inputs (e.g., crypto), you'd want more cases; for pure math properties, 256 is plenty.**

**Q: Why not use `quickcheck` instead of `proptest`?**
Both are property-testing crates for Rust; both work fine. `proptest` has stronger shrinking (finds smaller counterexamples) and better strategy composition (the `in` syntax for ranges). The openhl workspace already pulls in proptest via the consensus crate's tests, so the marginal cost is zero. **Pick one and stick with it; switching mid-codebase is more cost than choosing differently upfront.**

**Q: What's the relationship between `saturating_mul` and `saturate_i128_to_i64`?**
`saturating_mul` is a built-in method on `i128` (and other integers) that produces the saturated product within the type's own range. `saturate_i128_to_i64` is our user-defined helper that clamps an `i128` to the `i64` range. They serve different boundaries: `saturating_mul` defends against in-type overflow, `saturate_i128_to_i64` defends against the cross-type narrowing. **Both are needed because the math uses both i128 (for products) and i64 (for storage).**

## Next lesson (L6)

L6 adds `compute_rate` — the function that takes a `Premium` and `FundingParams` and produces a `FundingRate`. The function is ~10 lines but encodes 3 decisions: (a) `divisor == 0` returns `FundingRate(0)` (funding disabled), (b) the divisor reduces the premium before clamping, (c) the `rate_cap` clamps absolute value (so negative caps and positive caps share the same `params.rate_cap`). The lesson also adds 4 unit tests covering the divisor, the cap on both sides, and the disabled-funding case. After L6, two of the three pure-compute functions are done.
````

---

## Seed-file slot

L5 lands in Module 2 at sortOrder 1:

```typescript
{
  title: 'Lesson 5 — Overflow philosophy + the first proptest',
  slug: 'openhl-funding-overflow-proptest-en',
  type: 'CONTENT',
  sortOrder: 1,
  duration: 30,
  xpReward: 60,
  content: `# Lesson 5 — Overflow philosophy + the first proptest\n\n...`
},
```

## SHA pinning discipline

L5 cites `cd94137` (Stage 8b). After L5, compute.rs matches Stage 8b through `compute_premium` + saturate helper + 4 premium tests + 1 proptest + the test-module imports & helper.

## Style review notes (self-critique before paste)

- **§Goal frames L5 as "conceptual, not code"** — readers know to slow down on philosophy rather than rushing to compile.
- **§Predict on chain-fork-via-panic** earns the philosophy framing — readers reason through why a single-node halt is actually a network-level problem.
- **§Overflow taxonomy table** unpacks the 3 failure modes (panic / wrap / saturate) with concrete code examples.
- **§Anti-fluency on `checked_mul` + Result** explains why error-propagation doesn't actually solve the problem.
- **§Step 2's table for boundary cases** makes the 3 input regimes scannable.
- **§Predict on `saturate_i128_to_i64(0)`** earns the "saturation is a no-op for in-range" insight.
- **§Step 4 has named subsections for the proptest macro, strategy syntax, and the prop_assert macros** — readers new to proptest get a primer in place.
- **§The "why we weakened the property"** is reusable property-testing wisdom.
- **§Anti-fluency on `f64` in tests** preempts the "but I want exact magnitudes" reflex.
- **§Predict on excluding zero from the range** earns the design choice (interior vs boundary).
- **§Design reflection 1-5** name distinct generalizable lessons (saturate-or-fork, invariant-tests-over-aspirational, stabilize-boilerplate, sign-aware-overrides, hand-traced-vs-proptest-complementarity).
- **§Common questions** address proptest mechanics (case count, library choice, relationship to built-in `saturating_*`).
- **L6 preview** is concrete: 10-line function, 3 decisions, 4 unit tests.
