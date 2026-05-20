# Building OpenHL Funding — L4 draft (EN) — build-along

> Drafted against openhl SHA `cd94137` (Stage 8b — funding state machine).
> Course: `building-openhl-funding-en` (track: `reth-l1-architect`).

---

## L4 — `openhl-funding-compute-premium-en`

- **Module:** 2 (Pure compute), sortOrder 0
- **Course-level sortOrder:** 4 (lesson 5 of 12)
- **Duration:** 40 min
- **XP reward:** 80
- **Type:** CONTENT

### Content

````markdown
# Lesson 4 — `compute_premium` — first math, first tests

## Goal

Concepts you'll grasp in this lesson:

- **Pick integer width by the intermediate range, not the inputs** — `mark` and `index` are `u64`, but `(mark - index) * RATE_SCALE` can hit ~1.8e28; i128 intermediates are non-optional, and the upcasts go in *before* the subtraction so signs survive.
- **Multiply before divide preserves precision** — `(mark - index) / index` in integer math rounds to zero for any sub-100% premium; scaling by `RATE_SCALE` first turns the fraction into i128 magnitude, then the divide produces a meaningful integer.
- **Subtraction in `u64` is the canonical sign bug** — `MarkPrice(99) - IndexPrice(100)` wraps to `u64::MAX` and produces a huge positive premium when truth is a small negative one. The `i128::from(...)` upcast is what makes the subtraction algebraically correct.
- **Graceful degradation for missing oracle** — `index == 0` returns `Premium(0)` instead of erroring. Funding propagates through the bridge as balance updates; an `Err` would surface as a transaction failure on unrelated payloads. Zero is the right answer when there's no signal to drive a rate.
- **Test comments as paper math** — `// (101-100) * 1e9 / 100 = 10_000_000` next to the assertion lets any future debugger verify the test against the formula, not against the test author's promise.

Verification:

```bash
cargo test -p openhl-funding
```

…passes 4 unit tests.

Specific changes:

The `openhl-funding` crate goes from "all type definitions" to "type definitions + first piece of math":

- **`crates/funding/src/compute.rs`** — new file with the module doc + 2 functions:
  - `compute_premium(mark, index) -> Premium` — derives `(mark - index) / index`, scaled by `RATE_SCALE`.
  - `saturate_i128_to_i64(v) -> i64` — clamp helper (private). 3 lines.
- **4 hand-traced unit tests** in `compute.rs`'s `#[cfg(test)] mod tests` block:
  - `premium_zero_when_mark_equals_index`
  - `premium_positive_when_mark_above_index`
  - `premium_negative_when_mark_below_index`
  - `premium_saturates_to_zero_when_index_is_zero`
- **`crates/funding/src/lib.rs`** — adds `pub mod compute;` + re-exports `compute_premium`.

This is the first lesson with **actual math**. From now on, every code change has the potential to silently shift wealth between accounts. The hand-traced tests pin the expected output against specific input values you can verify by paper math.

## Recap

After L3:
- 9 types + `RATE_SCALE` in `types.rs` — Stage 8b's complete type roster.
- Zero behavior yet. The crate compiles but does nothing.

L4 introduces the first function. The function is short (~10 lines of body) but encodes 3 design decisions: graceful handling of `index == 0`, `i128` intermediates for overflow safety, and saturation rather than wrap/panic.

## Plan

Three edits:

1. **Create `crates/funding/src/compute.rs`** — module doc + imports + `compute_premium` + private `saturate_i128_to_i64` helper.
2. **Add `#[cfg(test)] mod tests`** to `compute.rs` with 4 hand-traced unit tests.
3. **Update `crates/funding/src/lib.rs`** — add `pub mod compute;` declaration and re-export `compute_premium` at the crate root.

> 🛑 **Predict.** Before scrolling: we're computing `(mark - index) * RATE_SCALE / index`. `mark` and `index` are both `u64` up to ~1.8e19. `RATE_SCALE` is `1e9`. What's the maximum size of the *intermediate* product `(mark - index) * RATE_SCALE`, and what type does it need to fit in?

(Answer: **`u64::MAX * 1e9` overflows `i64` by 10 orders of magnitude.** Worst case `mark = u64::MAX`, `index = 0` (we handle this separately), or `mark = u64::MAX`, `index = 1` → `(u64::MAX - 1) * 1e9 ≈ 1.8e28`. `i64::MAX` is ~9.2e18; we need `i128` for the intermediate. After the divide by `index`, we're back in i64 range — but the divide must happen *after* the multiply, so the intermediate must fit i128. **i128 is mandatory for the product; saturation handles the rare cases where even the final result overflows i64.**)

## Walk-through

### Step 1: Create `compute.rs` with the module doc

Create `crates/funding/src/compute.rs`. Initial content:

```rust
//! Pure funding-rate math.
//!
//! Three building blocks, each stateless:
//!   - [`compute_premium`] derives the mark/index gap as a signed fraction
//!   - [`compute_rate`] divides + caps to produce a per-interval rate
//!   - [`apply_funding`] turns a rate + position snapshot into settlements
//!
//! Each function is deterministic and saturates on overflow rather than
//! wrapping. Validators that disagree about funding fork the chain, so the
//! cost of an unexpected overflow has to be bounded behavior, not panic.

use crate::types::{
    FundingParams, FundingRate, IndexPrice, MarkPrice, Notional, Position, Premium, Settlement,
    RATE_SCALE,
};
```

Two things to notice:

**The module doc previews 3 functions but we only ship 1 in L4.** The cross-references `[compute_rate]` and `[apply_funding]` will be broken until L6 and L7. **Tolerate the warnings** — same as the L1/L2 `[FundingRate]` cross-refs we let resolve incrementally.

**The `use` statement imports types we don't all use yet.** `FundingParams`, `FundingRate`, `Notional`, `Position`, `Settlement` are needed by L6/L7's functions. Importing them now means the import block stabilizes after L4 — same logic as L1's `[dev-dependencies] proptest`. **Stabilize boilerplate early; iterate on logic.**

> 🛑 **Anti-fluency.** "Shouldn't we suppress the unused-import warnings between L4 and L6?" **The unused-import warning fires on items the *compiler* sees as unused, not items rustdoc references.** Since we'll use `FundingRate`, `Notional`, etc. by L7, the compiler doesn't complain — it sees `use` declarations whose items will get used later in the same module. Only the rustdoc cross-refs `[compute_rate]` and `[apply_funding]` produce warnings, and those resolve when L6/L7 land.

### Step 2: Add `compute_premium`

After the `use` block:

```rust
/// Compute the premium `(mark - index) / index`, scaled by [`RATE_SCALE`].
///
/// Returns `Premium(0)` if `index == 0` — the safest behavior, since with no
/// reliable reference price the funding rate should not push capital around.
/// Real deployments should guard upstream (e.g., refuse to tick when the
/// oracle is missing); the saturation here is the second line of defense.
#[must_use]
pub fn compute_premium(mark: MarkPrice, index: IndexPrice) -> Premium {
    if index.0 == 0 {
        return Premium(0);
    }
    // (mark - index) as i128 so we can't lose sign on subtraction; multiply
    // by RATE_SCALE in i128 to avoid overflow before the divide.
    let diff = i128::from(mark.0) - i128::from(index.0);
    let scaled = diff.saturating_mul(i128::from(RATE_SCALE));
    let premium = scaled / i128::from(index.0);
    // Saturate back to i64 — at i64 range with index prices in u64::MAX
    // territory, this only clips at network-pathological inputs.
    Premium(saturate_i128_to_i64(premium))
}
```

10 lines of body. Four moving parts:

1. **Early return on `index == 0`.** A zero index means the oracle hasn't delivered a price (boot state) or the asset has no spot reference. **Either case should produce zero funding** — there's no meaningful (mark - index) to compute when there's no index. Returning `Premium(0)` is graceful degradation; an error would propagate as a transaction-level failure through the bridge, which is the wrong response to a transient oracle issue.

2. **`i128::from(mark.0) - i128::from(index.0)`.** Both operands upcast to `i128` *before* the subtraction. **Subtracting two `u64`s would underflow for `mark < index`** — the result would wrap to near `u64::MAX` instead of producing a negative number. Upcasting to signed i128 makes the subtraction algebraically correct.

3. **`diff.saturating_mul(i128::from(RATE_SCALE))`.** The multiply uses `saturating_mul`, not regular `*`. At worst case (`mark` close to `u64::MAX`, `index` very small), the product can approach `i128::MAX` — and *would* overflow with regular multiplication. `saturating_mul` clamps to `i128::MAX` / `i128::MIN` instead of panicking.

4. **`scaled / i128::from(index.0)`.** The division comes *after* the multiplication. **If we divided first, we'd lose precision** — `(mark - index) / index` in integer math would produce 0 for any premium less than 1.0 (the entire useful range!). Multiplying by `RATE_SCALE` first preserves the fractional digits as integer magnitude, then the divide produces the scaled premium.

Then `saturate_i128_to_i64` clips back to the `Premium`'s i64 range.

> 🛑 **Anti-fluency.** "Couldn't we just compute `(mark - index).saturating_mul(RATE_SCALE) / index` as u64?" **No — the subtraction is the problem.** `MarkPrice(99) - IndexPrice(100)` in `u64` produces underflow → wraps to `u64::MAX - 0`. That's a giant positive number, not a small negative one. The result would be a huge *positive* premium when the truth is a small *negative* one. **The sign matters; signed arithmetic is mandatory.**

### Step 3: Add the `saturate_i128_to_i64` helper

After `compute_premium`:

```rust
/// Clamp an `i128` into the `i64` range. Used wherever an intermediate
/// product can exceed `i64::MAX` at network-pathological inputs (e.g., a
/// `u64::MAX` index price). Saturation, not wrapping — see the module-doc
/// comment on why panicking would be a worse failure mode.
fn saturate_i128_to_i64(v: i128) -> i64 {
    i64::try_from(v).unwrap_or(if v > 0 { i64::MAX } else { i64::MIN })
}
```

Three lines of body. **`i64::try_from(v)` returns `Result`** — `Ok(value)` if `v` fits in i64, `Err` otherwise. `unwrap_or(...)` provides the default for the `Err` case: clamp to `i64::MAX` if the overflow was positive, `i64::MIN` if negative.

This function is **private to the module** (`fn`, not `pub fn`). Callers don't need it — they pass `MarkPrice` / `IndexPrice` in, get `Premium` back, and the saturation happens behind the scenes. Keeping it private prevents accidental misuse and keeps the public surface clean.

L7's `apply_funding` will be the second caller of this helper; that's why it's a helper and not inlined into `compute_premium`.

> 🛑 **Predict.** What would the test `assert_eq!(saturate_i128_to_i64(i128::MAX), ???)` expect?

(Answer: **`i64::MAX`.** `i128::MAX` is ~1.7e38, way beyond `i64::MAX` (~9.2e18). `i64::try_from(i128::MAX)` fails; `unwrap_or(if v > 0 { i64::MAX } else { i64::MIN })` evaluates the closure since `v > 0`, returning `i64::MAX`. Symmetric on the negative side: `i128::MIN` clamps to `i64::MIN`.)

### Step 4: Add the test module + 4 unit tests

At the end of `compute.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn premium_zero_when_mark_equals_index() {
        let p = compute_premium(MarkPrice(100), IndexPrice(100));
        assert_eq!(p, Premium(0));
    }

    #[test]
    fn premium_positive_when_mark_above_index() {
        // mark 101, index 100 → premium = 1/100 = 0.01 → 10_000_000 ppb
        let p = compute_premium(MarkPrice(101), IndexPrice(100));
        assert_eq!(p, Premium(10_000_000));
    }

    #[test]
    fn premium_negative_when_mark_below_index() {
        let p = compute_premium(MarkPrice(99), IndexPrice(100));
        assert_eq!(p, Premium(-10_000_000));
    }

    #[test]
    fn premium_saturates_to_zero_when_index_is_zero() {
        let p = compute_premium(MarkPrice(1_000_000), IndexPrice(0));
        assert_eq!(p, Premium(0));
    }
}
```

Four hand-traced tests. Each is short, but each pins a specific *meaning*:

1. **`premium_zero_when_mark_equals_index`** — the symmetry case. Mark = index means no dislocation. The math is straightforward: `(100 - 100) * 1e9 / 100 = 0`. This test catches an off-by-one or sign-flip in the formula.

2. **`premium_positive_when_mark_above_index`** — the longs-overpaying case. Mark 101 > Index 100 → positive premium. The expected value `10_000_000` is the paper math: `(101-100) * 1e9 / 100 = 1e9 / 100 = 1e7 = 10_000_000`. **In ppb: 1% premium.** This test catches an inverted sign convention.

3. **`premium_negative_when_mark_below_index`** — the shorts-overpaying case. Mark 99 < Index 100 → negative premium. Same magnitude as test 2, opposite sign. **Catches the "subtract as u64 → underflow" bug specifically.**

4. **`premium_saturates_to_zero_when_index_is_zero`** — the graceful-degradation case. `Premium(0)` is the expected output, not a panic or error. **Catches anyone who deletes the early-return guard "for simplicity."**

The comment `// mark 101, index 100 → premium = 1/100 = 0.01 → 10_000_000 ppb` in test 2 is the **paper math, written in the test**. Anyone debugging this in the future can verify by hand that the assertion is correct — no need to trust the test author got it right.

> 🛑 **Anti-fluency.** "Shouldn't we test edge cases like `MarkPrice(u64::MAX)` or `IndexPrice(1)`?" **Yes, but in L5.** Those are the saturation-edge tests — they exercise the `saturate_i128_to_i64` helper at its boundary, which is L5's main pedagogical focus. **L4's tests pin the normal-input semantics; L5 pins the pathological-input behavior.** Both classes of test matter; separating them by lesson keeps the per-lesson scope tight.

### Step 5: Update `lib.rs`

Open `crates/funding/src/lib.rs`. The current state:

```rust
//! `openhl-funding` — funding-rate state machine.
//! ...

pub mod types;

pub use types::{
    FundingParams, FundingRate, IndexPrice, MarkPrice, Notional, Position, PositionSize,
    Premium, Settlement, RATE_SCALE,
};
```

Add the compute module declaration + re-export:

```rust
//! `openhl-funding` — funding-rate state machine.
//! ...

pub mod compute;
pub mod types;

pub use compute::compute_premium;
pub use types::{
    FundingParams, FundingRate, IndexPrice, MarkPrice, Notional, Position, PositionSize,
    Premium, Settlement, RATE_SCALE,
};
```

Two changes:
- `pub mod compute;` — declares the new module.
- `pub use compute::compute_premium;` — re-exports the function at the crate root. Callers can write `use openhl_funding::compute_premium;` instead of `use openhl_funding::compute::compute_premium;`.

**Module declarations stay alphabetical** (`compute` before `types`). Same for the `pub use` ordering. Consistency matters in long re-export blocks.

### Step 6: Run tests

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

running 4 tests
test compute::tests::premium_negative_when_mark_below_index ... ok
test compute::tests::premium_positive_when_mark_above_index ... ok
test compute::tests::premium_saturates_to_zero_when_index_is_zero ... ok
test compute::tests::premium_zero_when_mark_equals_index ... ok

test result: ok. 4 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

**4 tests pass.** First green run in the crate. The 3 rustdoc warnings are still expected (`compute_rate`/`apply_funding`/`FundingClock` — resolved by L6/L7/L8).

Common errors:

- **`assertion failed: left=0 right=10_000_000`** on the positive test — your `compute_premium` is missing the `* RATE_SCALE` step. Without that scaling, integer division `(101 - 100) / 100` rounds to 0.
- **`assertion failed: left=18446744073709541616 right=-10_000_000`** on the negative test — you did the subtraction in `u64` instead of upcasting to `i128`. The huge positive number is `u64::MAX + (99 - 100)` underflow-wrapped. **Add the `i128::from(...)` upcasts on both operands.**
- **Panic in test** — you used regular `*` instead of `saturating_mul`. Regular multiplication panics on overflow in debug builds. Switch to `saturating_mul`.
- **`error: cannot find function 'saturate_i128_to_i64'`** — the helper is defined below `compute_premium` in the same file. Either move it above the caller, or leave it below — Rust doesn't care about declaration order in modules.

## Design reflection

Four load-bearing decisions in this lesson:

1. **`index == 0` returns `Premium(0)`, not an error.** Graceful degradation when the oracle is unavailable. Erroring would propagate as a transaction failure through the bridge, blocking unrelated payload work. Zero is the right answer for "we have no information to drive a rate."

2. **`i128` intermediates, never `u64`.** The subtraction can be negative; the multiplication can exceed `u64::MAX`. Both operations need signed and wider arithmetic. **Choose the integer width by the *intermediate* range, not the input range.**

3. **`saturating_mul`, not `*`.** Overflow during the multiply would either panic (debug) or wrap (release). Both are worse than saturation: panic = chain fork via halt, wrap = chain fork via wrong value. **Saturation is the only bounded-behavior option for consensus-critical math.**

4. **Test comments are the paper math.** `// (101-100) * 1e9 / 100 = 10_000_000` next to the assertion lets any future debugger verify the assertion *against the formula*, not against the test author's promise. **Tests are documentation; their comments are the doc body.**

## Answer key

```bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/compute.rs ./crates/funding/src/compute.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
```

After L4:
- **compute.rs** matches Stage 8b through `compute_premium` + `saturate_i128_to_i64` + the 4 hand-traced premium tests. `compute_rate`, `apply_funding`, the rate tests, and the proptests are L5-L7.
- **lib.rs** has `pub mod compute;` and the `compute_premium` re-export. `apply_funding`, `compute_rate`, and the clock module are L5-L8.

Return:

```bash
git checkout main
```

## Common questions

**Q: Why does `compute_premium` use `i128` everywhere instead of just for the dangerous step?**
The conversion `i128::from(u64)` is free (it's just a zero-extend). Doing the whole calculation in `i128` is one mental model — "this function uses i128 arithmetic" — vs the mixed model "u64 here, i128 there." **Uniform width is a readability win at zero cost.** The final saturation back to i64 is the only conversion that has any semantic weight.

**Q: Why is `RATE_SCALE` upcast via `i128::from(RATE_SCALE)` and not just `RATE_SCALE as i128`?**
`from` is the idiomatic, non-truncating conversion. `as i128` works here (`i64 → i128` doesn't truncate), but `from` documents intent: "this is a widening, not a reinterpretation." **Use `from` for widening, `as` only when you've already verified no truncation can happen.** A future engineer reading `as i128` has to verify safety; `from` documents that the conversion is safe.

**Q: Why is the helper named `saturate_i128_to_i64` and not just `clamp_to_i64`?**
"Saturate" is the established term for "clamp at type boundary" — same word as `u64::saturating_mul`, `i128::saturating_sub`. **Using the standard vocabulary makes the function's behavior obvious to any Rust dev.** "Clamp" can mean any user-defined bounds; "saturate" specifically means type-bound clamping.

**Q: Should `compute_premium` be `pub(crate)` instead of `pub`?**
`pub` because external callers (the bridge integration in course 10, or external observers querying funding state for telemetry) need it. `pub(crate)` would forbid that. **The function is part of the public API.** `saturate_i128_to_i64` is the implementation detail; `compute_premium` is the contract.

## Next lesson (L5)

L5 doesn't add a new function. Instead, it does a deep dive on the overflow philosophy: why saturation is the only acceptable behavior for consensus-critical math, what the alternatives look like and why they fork the chain, and how `saturate_i128_to_i64`'s edges behave under pathological inputs. The lesson also adds 1 proptest (`premium_is_antisymmetric_in_mark_index`) — the property that swapping mark and index flips the premium sign. **First proptest in the crate.**
````

---

## Seed-file slot

L4 lands in Module 2 (Pure compute) at sortOrder 0:

```typescript
{
  title: 'Lesson 4 — compute_premium — first math, first tests',
  slug: 'openhl-funding-compute-premium-en',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 40,
  xpReward: 80,
  content: `# Lesson 4 — \`compute_premium\` — first math, first tests\n\n...`
},
```

## SHA pinning discipline

L4 cites `cd94137` (Stage 8b). After L4, compute.rs matches Stage 8b through `compute_premium` + `saturate_i128_to_i64` + 4 premium tests. lib.rs has the `compute` module + 1 re-export.

## Style review notes (self-critique before paste)

- **§Goal frames L4 as "first math, first tests"** — readers know to slow down.
- **§Predict on intermediate range** earns the i128 choice — readers do the arithmetic and arrive at the answer.
- **§Step 2 has 4 named moving parts** for the function body — each gets its own paragraph.
- **§Anti-fluency on u64 subtraction underflow** preempts the most likely concrete bug.
- **§Step 4 explanation of each test** names what each catches — readers understand why the test exists.
- **§Anti-fluency on edge-case tests** flags L5 explicitly as the place for boundary tests.
- **§Step 6 expected output** is exact — readers know what success looks like.
- **§Design reflection 1-4** name distinct generalizable patterns.
- **§Common questions** address idiomatic conversions (`from` vs `as`), naming (saturate vs clamp), and visibility (pub vs pub(crate)).
- **L5 preview** is concrete: "no new function, philosophy + 1 proptest."
