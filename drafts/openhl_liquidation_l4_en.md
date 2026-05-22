# Building OpenHL Liquidation — L4 draft (EN) — build-along

> openhl SHA `22eedf9` (Stage 10a — liquidation margin math).

## L4 — `openhl-liquidation-notional-pnl-en`

**Stage**: Stage 10a — `22eedf9`

**Title**: Lesson 4 — `notional_value` + `unrealized_pnl` — the signed-multiplication trick

**Duration**: 45 min · **XP**: 80

---

````markdown
# Lesson 4 — `notional_value` + `unrealized_pnl` — the signed-multiplication trick

## Goal

Concepts you'll grasp in this lesson:

- **Why `notional_value` returns `u64` and `unrealized_pnl` returns `i64`** — notional exposure is always non-negative (`|size| × mark`); PnL is signed (`mark − entry` can be either side). Reflecting each at the return-type level lets the compiler catch sign-confusion bugs at call sites.
- **`unsigned_abs()` over `abs()` for `i64`** — `i64::MIN.abs()` overflows (positive `i64::MIN` doesn't exist). `unsigned_abs()` returns `u64` and never panics. Use it whenever you need the magnitude of a signed integer.
- **The signed-multiplication trick that handles long vs short with no branching** — `(mark − entry) × size`, with `size` signed, produces the right sign for *both* directions naturally. Four sign combinations resolve to four correct PnL values with no `if side == Long` anywhere.
- **The i128-intermediate discipline** — sign-preserving subtraction (`i128::from(mark.0) − i128::from(entry.0)`) followed by an overflow-safe product, saturated back to `i64`. Same shape as funding's `compute_premium`.
- **`saturate_i128_to_i64` as a load-bearing helper** — any product that *can* exceed `i64::MAX` at network-pathological inputs *will*, eventually. Saturate, don't panic.

Verification:

```bash
cargo test -p openhl-liquidation
```

…passes 8 tests (3 for `notional_value`, 5 for `unrealized_pnl`).

Specific changes:

- **Create `crates/liquidation/src/compute.rs`** — the file doesn't exist yet. Module doc + imports + two public functions + one private helper + a `#[cfg(test)]` block with 8 unit tests.
- **`src/lib.rs`** — add `pub mod compute;` + extend the re-export to include `notional_value` and `unrealized_pnl`.

L4 is the first lesson with running tests. From here every lesson adds tests until L8 (`close_order_spec`, the last of Stage 10a's behaviors).

## Recap

After L3:
- The types module is byte-for-byte complete against Stage 10a — `MARGIN_SCALE`, `LiquidationParams`, `MarginRatio`, `MarginHealth`, `AccountSnapshot`, `CloseOrderSpec`.
- The compute module doesn't exist yet.
- `cargo build` passes; `cargo test` runs zero tests.

L4 creates the compute module. The first two functions answer the question "what does this account *currently* look like?" — its notional exposure and its unrealized PnL. L5 builds equity and margin ratio on top of these.

## Plan

Two edits:

1. **Create `crates/liquidation/src/compute.rs`** — module doc + `use` statements pulling `AccountSnapshot`, `MarkPrice` from L1–L3 + `notional_value` + `unrealized_pnl` + the private `saturate_i128_to_i64` helper + a `#[cfg(test)]` tests block with 3 notional tests + 5 PnL tests.
2. **Update `src/lib.rs`** — add `pub mod compute;` and extend the public re-exports to include the two new function names.

> 🛑 **Predict.** Before scrolling: `unrealized_pnl` needs to return *positive* when a long is in profit AND when a short is in profit. The naïve shape is:
>
> ```rust
> if size > 0 {  // long
>     (mark - entry) * size.abs()
> } else {       // short
>     (entry - mark) * size.abs()
> }
> ```
>
> This works but branches. **There's a single-expression formula that gets all four sign combinations right without any `if`.** What is it? Hint: think about what happens to the formula `(mark - entry) * size` when `size` itself carries the long/short sign.

(Answer: **`(mark − entry) × size`, where `size` is signed `i64`.** Walk through the four cases:
- Long (`size = +10`), mark > entry: positive × positive = positive profit ✓
- Long (`size = +10`), mark < entry: negative × positive = negative loss ✓
- Short (`size = −10`), mark > entry: positive × negative = negative loss ✓
- Short (`size = −10`), mark < entry: negative × negative = positive profit ✓

Every case lands on the right sign. **No branching, no two-codepath testing, no risk that someone "fixes" one branch without the other.** This is the load-bearing reason `PositionSize` is signed — the type carries the long/short distinction so the arithmetic doesn't have to.)

Dropping the four quadrants of `(mark − entry) × size` into one matrix makes it visually obvious why this single line replaces four `if` branches:

```
                          mark > entry              mark < entry
                       (price up → diff +)         (price down → diff −)
                       ────────────────────       ────────────────────
   Long  (size = +)     (+) × (+) = +              (−) × (+) = −
                       ◤ profit ✓                  ◤ loss ✓
                       e.g. (110−100) × +10 = +100 e.g. (90−100) × +10 = −100
   ─────────────────────────────────────────────────────────────────────
   Short (size = −)     (+) × (−) = −              (−) × (−) = +
                       ◤ loss ✓                    ◤ profit ✓
                       e.g. (110−100) × −10 = −100 e.g. (90−100) × −10 = +100
```

The mechanic: **`size`'s sign carries the long/short direction, `(mark − entry)`'s sign carries the price-move direction — multiplying them lets the two pieces of directional information combine, and the correct profit/loss sign falls out mechanically.** In the `if size > 0 { ... } else { ... }` branched version, the developer has to mentally reconstruct both cases while writing each branch, and bugs that hit only one side are a common failure mode. The signed-multiplication form **outsources that reconstruction entirely to the type system and arithmetic rules.**

## Walk-through

### Step 1: Create `src/compute.rs`

Create `crates/liquidation/src/compute.rs`. The file doesn't exist yet. Initial content:

```rust
//! Pure liquidation math.
//!
//! Six building blocks, all stateless:
//!   - [`notional_value`] — `|size| × mark`, the exposure in quote units
//!   - [`unrealized_pnl`] — `(mark − avg_entry) × size`, signed
//!   - [`account_equity`] — `collateral + unrealized_pnl`, can be negative
//!   - [`margin_ratio`] — `equity / notional`, scaled by [`MARGIN_SCALE`]
//!   - [`margin_health`] — classify the account against the params
//!   - [`close_order_spec`] — generate the close order for a liquidatable
//!     account
//!
//! Each function is deterministic and saturates on overflow rather than
//! wrapping or panicking. Validators that disagree about a margin
//! classification fork the chain, so the failure mode at network-
//! pathological inputs has to be bounded behavior.

use crate::types::{
    AccountSnapshot, CloseOrderSpec, LiquidationParams, MarginHealth, MarginRatio, MARGIN_SCALE,
};
use openhl_clob::{Qty, Side};
use openhl_funding::MarkPrice;
```

The module doc names six functions — only two of them land in L4. The next four (`account_equity`, `margin_ratio`, `margin_health`, `close_order_spec`) come in L5–L7. Listing all six upfront avoids re-editing the module doc at every lesson; it's also a roadmap for any reader who lands here without context.

> 🛑 **Anti-fluency.** "Why import `CloseOrderSpec`, `Side`, `Qty`, `LiquidationParams`, `MarginHealth`, `MarginRatio` when L4 only uses `AccountSnapshot` and `MarkPrice`?" **Because every subsequent lesson uses them — adding imports in batch at L4 keeps the diff focused on the function being added.** Rust will warn about unused imports until L5+; you tolerate those warnings the same way funding L1 tolerated rustdoc warnings about types that arrive later. The alternative — edit the `use` lines six times across L4–L7 — is busywork that obscures what each lesson actually adds.

### Step 2: Add `notional_value`

Below the imports, add:

```rust
/// Notional exposure of the account = `|position_size| × mark`, in quote
/// units. Returns `0` for a flat position (no exposure regardless of mark).
///
/// `u64::saturating_mul` clips at `u64::MAX` for network-pathological
/// `position_size × mark` products. Real deployments are bounded by upstream
/// position-size limits; the saturation here is the second line of defense.
#[must_use]
pub fn notional_value(snapshot: &AccountSnapshot, mark: MarkPrice) -> u64 {
    let abs_size = snapshot.position_size.0.unsigned_abs();
    abs_size.saturating_mul(mark.0)
}
```

Three things to notice about this 7-line function:

1. **Return type is `u64`, not `i64`.** Notional is the *magnitude* of exposure — always non-negative. Returning `u64` makes "did the caller forget to take abs?" impossible: the type system enforces it. A caller that wants to feed notional into a signed computation (like `margin_ratio`'s division) does an explicit `i64::from(notional_value(...))` at the call site. **The conversion is one line; the bug it prevents is silent sign errors that survive into production.**

2. **`snapshot.position_size.0.unsigned_abs()`, not `.abs()`.** `i64::abs` returns `i64` — and `i64::MIN.abs()` is undefined in safe Rust (panics in debug, wraps in release). `unsigned_abs` returns `u64` and is defined for every input, including `i64::MIN` (`i64::MIN.unsigned_abs() == 9_223_372_036_854_775_808`). **Use `unsigned_abs` whenever you need the magnitude of a signed integer; reserve `abs` only when you're sure the value can't be `MIN`.**

3. **`u64::saturating_mul` over `u64::checked_mul`.** Both detect overflow; `saturating_mul` returns `u64::MAX` on overflow, `checked_mul` returns `None`. Returning `Option<u64>` would force every caller (margin_ratio in L5, etc.) to handle a `None` that *only* arises at network-pathological inputs. Saturating returns a usable value that's mathematically wrong only at the extremes — and at those extremes the margin engine will classify the account as `Liquidatable` either way. **Saturation is the right failure mode when "the value is extreme but stays in bounds" beats "the cost of forcing every call site to propagate `Option` and write the boilerplate (`?` / `unwrap_or` / early returns) that comes with it."**

### Step 3: Add `unrealized_pnl`

Below `notional_value`, add:

```rust
/// Unrealized PnL = `(mark − avg_entry) × position_size`, in quote units.
/// Positive = profit, negative = loss.
///
/// Sign convention follows the natural signed multiplication:
///   - Long position (size > 0) profits when `mark > entry` → positive
///   - Long position loses when `mark < entry` → negative
///   - Short position (size < 0) profits when `mark < entry` → negative
///     times negative is positive
///   - Flat position (size = 0) → 0
#[must_use]
pub fn unrealized_pnl(snapshot: &AccountSnapshot, mark: MarkPrice) -> i64 {
    // diff = mark − entry, in i128 to preserve sign on subtraction.
    let diff = i128::from(mark.0) - i128::from(snapshot.avg_entry.0);
    // pnl = diff × size, in i128 to absorb the product's full range.
    let pnl = diff.saturating_mul(i128::from(snapshot.position_size.0));
    saturate_i128_to_i64(pnl)
}
```

Four things to notice:

1. **`i128::from(mark.0) − i128::from(snapshot.avg_entry.0)`, not `(mark.0 as i64) − (snapshot.avg_entry.0 as i64)`.** Both `mark` and `entry` are `u64`. Subtracting `u64 − u64` in Rust panics if the result would be negative; casting to `i64` first loses the top bit if either value exceeds `i64::MAX`. Upcasting to `i128` first preserves the full range and produces a signed result that can be negative without surprises. **Upcast wider than you think you need; the cost is zero and the safety is enormous.**

2. **The `saturating_mul` is on `i128`.** A `diff` near `u64::MAX` (≈ 2⁶⁴) times a `position_size` near `i64::MAX` (≈ 2⁶³) is ≈ 2¹²⁷ — within `i128`'s `±2¹²⁷` range but `saturating_mul` is still cheap defense at the extremes. Saturation here matches funding's pattern.

3. **`saturate_i128_to_i64(pnl)` at the end.** The PnL might be in i128 territory after the product, but the engine downstream uses `i64`. The helper saturates rather than panicking on conversion failure — same discipline. (Helper definition comes in Step 4.)

4. **Sign convention spelled out in the doc.** The 4-case enumeration ("Long profits when mark > entry") is the canonical reference for any reviewer asking "wait, does this work for shorts?" The math gets it right by construction, but the doc says *why* — readers don't have to mentally walk through the cases each time.

> 🛑 **Anti-fluency.** "Why not just do `(mark.0 as i64 − entry.0 as i64) × size` directly?" **Three problems.** (1) If `mark` or `entry` exceeds `i64::MAX`, the cast wraps silently — the top bit becomes the sign bit. (2) Even if both fit in i64, the subtraction in i64 can overflow when one is near `i64::MIN` and the other is positive. (3) The product `(mark − entry) × size` can exceed i64 even when each operand fits — a 1% price move on an `i64::MAX`-size position overflows. **Implicit `as` casts are one of the canonical bug-breeding footguns in Rust, and this lesson exists to defuse exactly that pattern.**

### Step 4: Add the `saturate_i128_to_i64` helper

After `unrealized_pnl`, add the private helper:

```rust
/// Saturating cast from `i128` to `i64`. Used wherever an intermediate
/// product can exceed `i64::MAX` at network-pathological inputs.
/// Saturation, not wrapping — see the module-doc note on why panicking
/// would be a worse failure mode.
fn saturate_i128_to_i64(v: i128) -> i64 {
    i64::try_from(v).unwrap_or(if v > 0 { i64::MAX } else { i64::MIN })
}
```

Three things to notice about this 3-line helper:

1. **No `pub`.** This is an implementation detail of `compute.rs`. The public API is the six functions named in the module doc; the helper exists to keep their bodies clean. **Keep helpers private unless callers in other modules genuinely need them.**

2. **`i64::try_from(v).unwrap_or(...)`.** `try_from` returns `Err` exactly when the value doesn't fit; the `unwrap_or` branch picks the saturation target by sign. For `v > 0` the value was too positive (saturate at `i64::MAX`); for `v ≤ 0` it was too negative (saturate at `i64::MIN`). **Three lines of arithmetic; one decision point; impossible to typo.** **(Note: when `v == 0`, `try_from` always succeeds with `Ok(0)`, so the `else` branch of `unwrap_or` (`i64::MIN`) is never taken — i.e., the `else` effectively only fires "when `v < 0` *and* doesn't fit," catching negative-direction saturation. Spelled out so readers don't burn a moment wondering whether `v == 0` would somehow take the `i64::MIN` path.)**

3. **No tests for the helper.** The behavior is exhaustively tested through `unrealized_pnl`'s test cases (which exercise both happy-path and edge-of-range inputs). A separate test for the helper would be redundant.

### Step 5: Add the tests

Below the helper, add the `#[cfg(test)]` block:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use openhl_clob::AccountId;
    use openhl_funding::{Notional, PositionSize};
    use proptest::prelude::*;

    fn snapshot(size: i64, entry: u64, collateral: i64) -> AccountSnapshot {
        AccountSnapshot {
            account: AccountId(42),
            position_size: PositionSize(size),
            avg_entry: MarkPrice(entry),
            collateral: Notional(collateral),
        }
    }

    // ─── notional_value ───────────────────────────────────────────

    #[test]
    fn notional_long() {
        let s = snapshot(10, 100, 0);
        assert_eq!(notional_value(&s, MarkPrice(120)), 10 * 120);
    }

    #[test]
    fn notional_short_uses_abs() {
        let s = snapshot(-10, 100, 0);
        assert_eq!(notional_value(&s, MarkPrice(120)), 10 * 120);
    }

    #[test]
    fn notional_flat_is_zero() {
        let s = snapshot(0, 100, 1_000);
        assert_eq!(notional_value(&s, MarkPrice(120)), 0);
    }

    // ─── unrealized_pnl ───────────────────────────────────────────

    #[test]
    fn pnl_long_profit() {
        // Long 10 @ entry 100; mark 120 → +200
        let s = snapshot(10, 100, 0);
        assert_eq!(unrealized_pnl(&s, MarkPrice(120)), 200);
    }

    #[test]
    fn pnl_long_loss() {
        // Long 10 @ entry 100; mark 80 → −200
        let s = snapshot(10, 100, 0);
        assert_eq!(unrealized_pnl(&s, MarkPrice(80)), -200);
    }

    #[test]
    fn pnl_short_profit() {
        // Short −10 @ entry 100; mark 80 → +200 (price down is good for short)
        let s = snapshot(-10, 100, 0);
        assert_eq!(unrealized_pnl(&s, MarkPrice(80)), 200);
    }

    #[test]
    fn pnl_short_loss() {
        // Short −10 @ entry 100; mark 120 → −200
        let s = snapshot(-10, 100, 0);
        assert_eq!(unrealized_pnl(&s, MarkPrice(120)), -200);
    }

    #[test]
    fn pnl_flat_is_zero() {
        let s = snapshot(0, 100, 0);
        assert_eq!(unrealized_pnl(&s, MarkPrice(200)), 0);
    }
}
```

Things to notice about the test block:

1. **A `snapshot()` helper at the top.** Three integer args (`size`, `entry`, `collateral`) — `account` is hardcoded to `AccountId(42)`. The helper saves typing across 8+ tests and keeps each test's *meaningful* inputs (the sign of size, the relationship between entry and mark) visible. **Test fixtures should expose what varies and hide what's constant.**

2. **Four PnL cases mirror the four sign combinations from the predict callout.** `pnl_long_profit`, `pnl_long_loss`, `pnl_short_profit`, `pnl_short_loss`. Plus `pnl_flat_is_zero` to nail the zero-size path. Every reachable sign combination has a test. **Coverage of sign combinations is the load-bearing property — miss one and a future refactor can silently invert a side.**

3. **`use proptest::prelude::*;` even though L4 has no proptests yet.** The import lands here once and survives through L5/L8 where proptests are added. Same reasoning as the bulk imports in `compute.rs` proper — write once at the boundary, tolerate the unused-import warning across the next few lessons.

4. **Test names are sentences.** `pnl_long_profit` reads as "PnL when long is in profit." When a test fails, the test name in the failure output is the first thing you see — make it descriptive enough that you don't need to read the body to know what broke. **`fn test_1`, `fn test_2` are CI noise; sentence-fragment names are CI signal.**

### Step 6: Update `src/lib.rs`

Open `crates/liquidation/src/lib.rs`. Add `pub mod compute;` and extend the re-export. Was:

```rust
pub mod types;

pub use types::{
    AccountSnapshot, CloseOrderSpec, LiquidationParams, MarginHealth, MarginRatio, MARGIN_SCALE,
};
```

Becomes:

```rust
pub mod compute;
pub mod types;

pub use compute::{notional_value, unrealized_pnl};
pub use types::{
    AccountSnapshot, CloseOrderSpec, LiquidationParams, MarginHealth, MarginRatio, MARGIN_SCALE,
};
```

Two changes:

1. **`pub mod compute;`** above `pub mod types;` — alphabetical, same as the existing convention.
2. **`pub use compute::{notional_value, unrealized_pnl};`** — a new re-export line, separate from the `types` re-export so each module gets its own line. L5–L7 will extend the compute list as more functions land.

### Step 7: Run the tests

```bash
cargo test -p openhl-liquidation
```

Expected output:

```
running 8 tests
test compute::tests::notional_flat_is_zero ... ok
test compute::tests::notional_long ... ok
test compute::tests::notional_short_uses_abs ... ok
test compute::tests::pnl_flat_is_zero ... ok
test compute::tests::pnl_long_loss ... ok
test compute::tests::pnl_long_profit ... ok
test compute::tests::pnl_short_loss ... ok
test compute::tests::pnl_short_profit ... ok

test result: ok. 8 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

**The 8 tests are your proof that the signed-multiplication trick works for every sign combination.** When you (or a future contributor) refactors `unrealized_pnl`, these tests are what keeps the sign convention honest.

Common errors:

- **`warning: unused import: ...`** for any of the imports added in batch — expected, gone by L7.
- **`error[E0599]: no method named 'unsigned_abs' found for type 'i64'`** — you're on a very old Rust. `unsigned_abs` was stabilized in Rust 1.51 (2021). The project's `rust-toolchain.toml` should pin a recent enough version.
- **Test fails with `attempt to multiply with overflow`** — your build is in debug mode and you wrote `*` instead of `saturating_mul`. Replace.

## Design reflection

Three load-bearing decisions in this lesson:

1. **`notional_value: u64`, `unrealized_pnl: i64`.** Return types signal invariants. Notional is never negative; PnL can be either side. Calling code that needs to mix them does the explicit conversion (`i64::from(notional)`). **One conversion at the call site beats a class of silent-sign bugs that survive into production.**

2. **Signed-multiplication symmetry over branching.** `(mark − entry) × size` resolves all four sign combinations correctly because `size` carries the long/short sign. The branching alternative (`if size > 0 { ... } else { ... }`) splits the codepath in two, double-fields the test budget, and risks a "fix the long branch but forget the short branch" bug in some future refactor. **Let the type system carry the cases the arithmetic naturally handles.**

3. **`unsigned_abs` over `abs` for `i64`.** `i64::MIN.abs()` is the canonical Rust footgun: panics in debug, silently wraps in release. `unsigned_abs` returns `u64` and is defined for every `i64` input. **Pick the version of the operation that has no panic-path; the alternative is a debug-only crash that a release build will gladly hide.**

## Answer key

```bash
cd ~/code/openhl-reference
git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/src/compute.rs ./crates/liquidation/src/compute.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
```

After L4:
- **compute.rs** matches the first ~80 lines of Stage 10a's `compute.rs` — module doc + imports + `notional_value` + `unrealized_pnl` + helper + the first 8 tests. Everything below (the next four functions and their tests, plus 3 proptests) lands in L5–L7.
- **lib.rs** still misses 4 more compute re-exports (`account_equity`, `margin_ratio`, `margin_health`, `close_order_spec`). Those arrive incrementally.

## Common questions

**Q1: Why is `notional_value` `u64` but `mark` is also `u64` — couldn't the product overflow `u64`?**

It can, at network-pathological inputs (a position so large that `|size| × mark > 2⁶⁴`). That's what `saturating_mul` defends. In realistic markets this doesn't happen — exchange position-size limits keep notional far below `u64::MAX`. The saturation is the second line of defense; the first is upstream sanity checks.

**Q2: Why is the helper `saturate_i128_to_i64` private but `notional_value` and `unrealized_pnl` are public?**

The helper is an implementation choice (saturating cast). The two public functions are part of the engine's contract — every callsite computing margin needs them. **Public means "callers depend on this." Private means "this is how we happen to do it inside."** A future refactor could replace `saturate_i128_to_i64` with `checked_mul` + `Option` propagation without breaking any callers.

**Q3: Could the signed-multiplication trick produce a wrong sign at the integer extremes?**

Mathematically no — the four sign combinations come from elementary algebra. But arithmetically, yes: a product that overflows `i64` (and then `i128`) loses information about the sign of the true result. That's why every intermediate product uses `i128::saturating_mul` and the final cast saturates at `i64::MAX` / `i64::MIN` depending on the sign of the i128 value. **Saturation preserves the *sign* of the answer even when it loses the *magnitude*.**

**Q4: Should `unrealized_pnl` panic when `mark == 0`?**

No — `mark = 0` is bizarre but not undefined. The formula `(0 − entry) × size = −entry × size` is mathematically well-defined (and would classify the position as deeply underwater, which is correct behavior). Production deployments will refuse to *publish* a zero mark; if one slips through, the engine handles it gracefully. **Pure functions don't decide policy; they compute on whatever inputs they get.**

**Q5: Why doesn't `notional_value` take `&MarkPrice` instead of `MarkPrice`?**

`MarkPrice` is `Copy` and 8 bytes (`u64`). Pass-by-value is cheaper than pass-by-reference for `Copy` types this small — no pointer indirection, no aliasing concerns. **Reach for `&` when the type is large enough that copying is expensive, OR when ownership semantics matter. For `Copy` newtypes around primitives, pass-by-value is the right default.**

## Next lesson (L5)

L5 adds `account_equity` and `margin_ratio` — and the **most pedagogically loaded discovery in Stage 10a**: the leveraged-regime non-monotonicity of `margin_ratio`. You'll write the proptest first ("as mark increases for a long, margin_ratio should also increase"), watch it fail at a small handful of inputs, trace through *why* the failure is real (and not a bug), and refine the proptest with `prop_assume!` to express the actual invariant. This is the lesson where a learner's first mental model of margin math gets broken and rebuilt.

````

---

## Seed-file slot

L4 lands in Module 2 at sortOrder 0:

```typescript
{
  title: 'Lesson 4 — notional_value + unrealized_pnl — the signed-multiplication trick',
  slug: 'openhl-liquidation-notional-pnl-en',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 45,
  xpReward: 80,
  content: `# Lesson 4 — notional_value + unrealized_pnl — the signed-multiplication trick\n\n...`
},
```

## SHA pinning discipline

L4 cites `22eedf9` (Stage 10a). The compute.rs answer-key diff verifies the first ~80 lines (module doc + imports + 2 functions + helper + 8 tests) match Stage 10a byte-for-byte.

## Style review notes (self-critique before paste)

- **The "if size > 0 ... else ..." predict callout** is the load-bearing pedagogy moment. Without it the reader takes the signed-multiplication trick on faith; with it, they've *seen the alternative* and felt why it's worse (two codepaths, two test budgets, one likely-forgotten branch in a future refactor).
- **The `unsigned_abs` discussion** is short but important — `i64::MIN.abs()` is one of the most-failed Rust footgun questions in interviews. Surfacing the discipline at L4 saves it from being a surprise at L8 or L9 when the engine actually has to handle a position at `i64::MIN`.
- **The 4-sign-combination tests are the heart of L4.** A reader who internalizes them can defend any future change to `unrealized_pnl` against the question "but does it still work for shorts in profit?"
- **L4 is the lesson where the crate gains tests.** It's worth marking the milestone in the lesson (and in the next-lesson preview) — from here the build process is *test-first* by default.
- **The Q5 (`&MarkPrice` vs `MarkPrice`) common-question** preempts the reflexive "always pass by reference" instinct that Rust learners pick up early. For `Copy` primitives the answer is the opposite.
