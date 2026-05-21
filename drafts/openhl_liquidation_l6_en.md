# Building OpenHL Liquidation — L6 draft (EN) — build-along

> openhl SHA `22eedf9` (Stage 10a — liquidation margin math).

````markdown
## L6 — `openhl-liquidation-margin-health-en`

**Stage**: Stage 10a — `22eedf9`

**Title**: Lesson 6 — `margin_health` — the classification cascade and boundary semantics

**Duration**: 30 min · **XP**: 60

---

# Lesson 6 — `margin_health` — the classification cascade and boundary semantics

## Goal

Concepts you'll grasp in this lesson:

- **Why the classification cascade checks `Underwater` first** — a negative margin ratio is *also* less than maintenance, so flipping the order would silently reclassify underwater accounts as Liquidatable, losing the insurance-fund signal. Check the most extreme state first; let the cascade narrow inward.
- **Strict-less-than at every boundary** — `ratio < maintenance_bps`, not `≤`. An account at *exactly* maintenance is `AtRisk`, not `Liquidatable`. The line itself belongs to the *better* state; you only fall into the worse state when you're strictly below it.
- **Type widening for the params comparisons** — `i64::from(params.initial_margin_bps)` upcasts u32 to i64 at the boundary, then compares two i64 values. Avoids implicit casts at each comparison site.
- **Flat-as-Safe is free, not coded** — `margin_ratio` returns `MarginRatio(i64::MAX)` for flat positions, which compares ≥ any reasonable `initial_margin_bps`, so `margin_health` returns `Safe` without a special-case branch. The composition handles it.

Verification:

```bash
cargo test -p openhl-liquidation
```

…passes 21 tests (16 from L4–L5 + 5 new boundary tests).

Specific changes:

- **`src/compute.rs`** — appends `margin_health` after `margin_ratio` + 5 unit tests inside the existing test module.
- **`src/lib.rs`** — extends the compute re-export to include `margin_health`.

L6 is application: by now you've internalized the i128 / saturate / proptest discipline. The classification cascade is short — but the design hill (cascade order + strict-less-than) is where most bugs would hide in a careless implementation.

## Recap

After L5:
- `compute.rs` has `notional_value`, `unrealized_pnl`, `account_equity`, `margin_ratio`, the `saturate_i128_to_i64` helper, plus 13 unit tests and 3 proptests.
- The non-monotonic edge case is encoded in `long_ratio_monotonic_in_mark_when_levered` with `prop_assume!`.
- `cargo test` runs 16 tests, all green.

L6 maps `MarginRatio` values to `MarginHealth` variants. The function is short. The decisions are not.

## Plan

Three edits:

1. **Append `margin_health` to `crates/liquidation/src/compute.rs`** — 13 lines plus the doc comment. Sits below `margin_ratio` and uses it.
2. **Add 5 unit tests** in the existing test module — one per `MarginHealth` variant (4 tests) plus one boundary test at the exact maintenance threshold.
3. **Update `crates/liquidation/src/lib.rs`** — extend the `pub use compute::{...}` line.

> 🛑 **Predict.** Before scrolling: the cascade has to check four states (`Underwater`, `Liquidatable`, `AtRisk`, `Safe`). The conditions are: `ratio < 0`, `ratio < maintenance_bps`, `ratio < initial_bps`, otherwise. **What happens if you write the cascade `Liquidatable → Underwater → AtRisk → Safe` instead — checking Liquidatable first?**

(Answer: **Underwater accounts get classified as Liquidatable.** A ratio of `−5_000` is `< maintenance_bps` (= 200), so the Liquidatable branch fires first and the cascade never reaches the Underwater check. Result: the bridge doesn't get the insurance-fund-needed signal, the underwater deficit silently routes through the regular liquidation path, and the position closes solvently in the books even though the math says it didn't. **Cascade order is load-bearing — check the most extreme state first; each step inward narrows the remaining range.**)

## Walk-through

### Step 1: Append `margin_health` to `src/compute.rs`

Open `crates/liquidation/src/compute.rs`. After `margin_ratio`, before the `#[cfg(test)]` block, append:

```rust
/// Classify margin health against the given params.
///
/// Returns one of four states in decreasing health order:
/// `Safe → AtRisk → Liquidatable → Underwater`. The boundaries use strict
/// inequality below the threshold (`<`), so an account at exactly the
/// maintenance ratio is `AtRisk`, not `Liquidatable`. This matches the
/// conventional "you start liquidating when you fall below the line"
/// reading.
#[must_use]
pub fn margin_health(
    snapshot: &AccountSnapshot,
    mark: MarkPrice,
    params: &LiquidationParams,
) -> MarginHealth {
    let ratio = margin_ratio(snapshot, mark);
    let initial_bps = i64::from(params.initial_margin_bps);
    let maintenance_bps = i64::from(params.maintenance_margin_bps);

    if ratio.0 < 0 {
        MarginHealth::Underwater
    } else if ratio.0 < maintenance_bps {
        MarginHealth::Liquidatable
    } else if ratio.0 < initial_bps {
        MarginHealth::AtRisk
    } else {
        MarginHealth::Safe
    }
}
```

Five things to notice about this 18-line function:

1. **The cascade order checks `Underwater` first.** A negative ratio satisfies `< maintenance_bps` too — so if Liquidatable were checked first, every Underwater account would be misclassified as Liquidatable. **The invariant: each branch's condition excludes everything the previous branches caught.** Underwater (`< 0`) is the strictest, narrowing inward through Liquidatable (`< maintenance`), AtRisk (`< initial`), and finally Safe (the residual).

2. **`<`, not `≤`, at every threshold.** An account whose ratio equals `maintenance_bps` is *not* yet Liquidatable — it's AtRisk. The conventional reading: maintenance margin is the line you have to stay *above*; you cross it (strictly) before getting liquidated. The doc spells this out; the test in Step 2 enforces it. **Strict inequality means the threshold value itself belongs to the better-health state.**

3. **`i64::from(params.initial_margin_bps)` widens u32 → i64.** The fields are `u32` (saves memory, plenty of range for bps values up to ~4 billion). The ratio is `i64` (the type forced by signed division in `margin_ratio`). Comparing different integer types is a compile error in Rust; widening at the boundary keeps the comparisons clean. **One cast per param at the top; the cascade body reads as pure i64 < i64.**

4. **No special case for flat positions.** `margin_ratio` returns `MarginRatio(i64::MAX)` for a flat account. `i64::MAX` is far above any sane `initial_margin_bps`, so the cascade falls through to `Safe`. **The flat-as-Safe property is encoded by `margin_ratio`'s flat-position guard — `margin_health` doesn't need to know about it.** A future tweak to flat-position semantics happens in *one place* (`margin_ratio`), not in two synchronized branches.

5. **Function takes `&LiquidationParams`, not `LiquidationParams` by value.** Even though `LiquidationParams` is `Copy` (12 bytes), the reference signature signals "I'm reading these, not consuming them." The bridge passes the same `params` to every `margin_health` call for an entire scan; reference avoids a (technically free) move per call.

> 🛑 **Anti-fluency.** "Why three `if` branches instead of `match (ratio.0, maintenance_bps, initial_bps) { ... }`?" **Because the conditions are inequalities, not pattern matches.** Match patterns are for structural equality on values, not for range checks. Rewriting as a match with guard clauses (`x if x < 0 => ...`) loses readability and gains nothing — the explicit cascade reads exactly as you'd think the decision.

### Step 2: Add 5 boundary tests

Inside the existing `#[cfg(test)] mod tests { ... }`, after the `margin_ratio` unit tests (and before the `proptest!` block), add:

```rust
    // ─── margin_health ─────────────────────────────────────────────

    #[test]
    fn health_safe() {
        // Ratio 1_500 bps (= 15%) with params (initial = 1_000, maintenance = 200) → Safe
        let s = snapshot(10, 100, 150);
        let p = LiquidationParams::hyperliquid_default();
        assert_eq!(margin_health(&s, MarkPrice(100), &p), MarginHealth::Safe);
    }

    #[test]
    fn health_at_risk() {
        // Ratio 500 bps with params (initial = 1_000, maintenance = 200) → AtRisk
        let s = snapshot(10, 100, 50);
        let p = LiquidationParams::hyperliquid_default();
        assert_eq!(margin_health(&s, MarkPrice(100), &p), MarginHealth::AtRisk);
    }

    #[test]
    fn health_liquidatable() {
        // Ratio 100 bps (= 1%) with params (maintenance = 200) → Liquidatable
        let s = snapshot(10, 100, 10);
        let p = LiquidationParams::hyperliquid_default();
        assert_eq!(
            margin_health(&s, MarkPrice(100), &p),
            MarginHealth::Liquidatable
        );
    }

    #[test]
    fn health_underwater() {
        // Equity goes negative (mark moved hard against long): Underwater
        let s = snapshot(10, 100, 100);
        let p = LiquidationParams::hyperliquid_default();
        assert_eq!(margin_health(&s, MarkPrice(50), &p), MarginHealth::Underwater);
    }

    #[test]
    fn health_boundary_at_maintenance() {
        // Ratio exactly == maintenance_bps → AtRisk (strict `<` for Liquidatable)
        let p = LiquidationParams {
            initial_margin_bps: 1_000,
            maintenance_margin_bps: 200,
            liquidation_fee_bps: 0,
        };
        // notional = 1_000, equity = 20 → ratio = 200 bps exactly
        let s = snapshot(10, 100, 20);
        assert_eq!(margin_health(&s, MarkPrice(100), &p), MarginHealth::AtRisk);
    }
```

Four things to notice:

1. **Each test names the arithmetic that produces the test's `MarginHealth`.** "*Ratio 1_500 bps (= 15%)*" tells the reader (and a future-you reading a failure) exactly what range the test exercises. A test with the comment but the wrong setup is easier to spot than a bare assertion.

2. **Four tests for the four variants, one for the boundary.** Each cascade branch gets a positive test; `health_boundary_at_maintenance` proves the strict-less-than convention. Without that fifth test, a future refactor that flipped `<` to `≤` would pass the other four but silently change behavior at the exact threshold — which is the most common margin level for production positions (accounts get *to* maintenance before they get *below*).

3. **`health_boundary_at_maintenance` constructs its own params, not `hyperliquid_default()`.** The hyperliquid default has `liquidation_fee_bps = 150`, irrelevant to this test, and the explicit struct construction documents which fields the test *actually* depends on. Other tests use the default because the fee field isn't load-bearing for them.

4. **`MarginHealth::Underwater` is exercised via the L5 underwater case** (`mark = 50` against a long position with thin collateral). Same setup as `ratio_can_be_negative` from L5 — the negative-ratio test proved the math; the variant test proves the classification.

### Step 3: Update `src/lib.rs`

Open `crates/liquidation/src/lib.rs`. Extend the compute re-export. Was:

```rust
pub use compute::{account_equity, margin_ratio, notional_value, unrealized_pnl};
```

Becomes:

```rust
pub use compute::{
    account_equity, margin_health, margin_ratio, notional_value, unrealized_pnl,
};
```

One new name — `margin_health` — alphabetically inserted between `account_equity` and `margin_ratio`. The line now wraps once it crosses ~5 items.

### Step 4: Run the tests

```bash
cargo test -p openhl-liquidation
```

Expected output:

```
running 21 tests
test compute::tests::equity_can_go_negative ... ok
test compute::tests::equity_collateral_plus_pnl ... ok
test compute::tests::health_at_risk ... ok
test compute::tests::health_boundary_at_maintenance ... ok
test compute::tests::health_liquidatable ... ok
test compute::tests::health_safe ... ok
test compute::tests::health_underwater ... ok
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
test compute::tests::margin_ratio_deterministic ... ok
test compute::tests::short_ratio_monotonic_in_mark ... ok

test result: ok. 21 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

Common errors:

- **`health_boundary_at_maintenance` fails with `Liquidatable` instead of `AtRisk`** — you accidentally used `≤` instead of `<` somewhere in the cascade. The boundary test exists to catch exactly this.
- **`health_underwater` fails with `Liquidatable`** — you put the `Underwater` check *after* the `Liquidatable` check. Reorder; the most extreme state goes first.

## Design reflection

Three load-bearing decisions in this lesson:

1. **Cascade order: check the most extreme state first.** `Underwater` before `Liquidatable` before `AtRisk` before `Safe`. The narrowing direction means each branch's condition excludes everything earlier branches caught; reversing the order silently routes severe cases through milder branches. **When cascade conditions overlap, sort from strictest to loosest.**

2. **Strict-less-than at thresholds: the line belongs to the better state.** An account exactly at maintenance is `AtRisk`, not `Liquidatable`. This is a convention call — production exchanges differ — but consistency *within* a system matters more than which side the threshold belongs to. **Pick a convention, name it in the doc, enforce it with a boundary test.**

3. **No special case for flat positions in `margin_health`.** Composition with `margin_ratio` (which returns `i64::MAX` for flat) makes the property fall out for free. Adding `if snapshot.position_size.0 == 0 { return Safe; }` would duplicate the flat-position behavior in two places — and would drift the moment one of them changed. **Encode invariants in one place; let downstream functions inherit them by composition.**

## Answer key

```bash
cd ~/code/openhl-reference
git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/src/compute.rs ./crates/liquidation/src/compute.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
```

After L6:
- **compute.rs** matches Stage 10a through `margin_health` + 18 unit tests + 3 proptests. The last function (`close_order_spec`) and its 3 tests are L7.
- **lib.rs** has 5 of 6 compute re-exports. The final one (`close_order_spec`) lands in L7.

## Common questions

**Q1: Why not return `Result<MarginHealth, ...>` for cases like a misconfigured params (maintenance ≥ initial)?**

The function is total — every input produces a defined output. A misconfigured params (maintenance == initial, or maintenance > initial) still classifies every account into one of the four variants, just with the wrong semantics. Returning `Result` would force every call site to handle a `MisconfiguredParams` error that *never arises from a bridge that constructed params validly*. **Total functions are easier to compose; validate params at the loading boundary, then trust them everywhere downstream.**

**Q2: Could `margin_health` use a sorted-thresholds array and binary-search to be more "data-driven"?**

With four states the explicit cascade is clearer and faster. Binary search wins when the number of thresholds grows past ~10 — at that point you'd refactor. Premature generalization here adds machinery the engine doesn't need. **Optimize for the cardinality you have, not the cardinality you might have someday.**

**Q3: What happens if `maintenance_bps > initial_bps` (misconfigured)?**

The cascade still produces a defined classification: at `ratio >= maintenance_bps`, the next branch is `ratio < initial_bps` (which is false, since maintenance > initial means ratio also ≥ initial), so we fall through to `Safe`. At `ratio ∈ [0, maintenance_bps)`, we land on `Liquidatable`. AtRisk becomes unreachable. **Misconfigured params produce a coherent but unintended classification scheme; the validation belongs at param construction, not in the classifier.**

**Q4: Why doesn't `margin_health` cache the i64 conversions of params?**

Because callers typically invoke `margin_health` once per account in a per-block sweep, and the bridge passes the same `&LiquidationParams` to every call. The two `i64::from(u32)` casts are zero-cost — the compiler emits a `mov` instruction at most. **Cache only when you've measured the cost; don't reach for it as a reflex.**

**Q5: Could the cascade use `match` with range patterns (`0..maintenance_bps => Liquidatable`)?**

Rust's `match` does support exclusive-range patterns (since 1.26), so syntactically yes. But the patterns would be `i64::MIN..0`, `0..maintenance_bps`, `maintenance_bps..initial_bps`, `initial_bps..=i64::MAX`. The need for *named* boundaries (referring to variables, not literals) means each pattern requires a guard clause anyway. The if/else cascade reads cleaner here. **Use `match` for structural cases; use `if/else` for inequality cascades on the same value.**

## Next lesson (L7)

L7 closes Stage 10a with `close_order_spec` — the function that turns a snapshot into the `CloseOrderSpec` the bridge consumes. Three unit tests for long-closes-with-Sell, short-closes-with-Buy, and the flat-position edge case (qty = 0). Shorter than L6 — by L7 you have the full compute module behind you, and the lesson is mostly the bridge between L4's `unsigned_abs` discipline and the engine's outward-facing interface.

````

---

## Seed-file slot

L6 lands in Module 2 at sortOrder 2:

```typescript
{
  title: 'Lesson 6 — margin_health — the classification cascade and boundary semantics',
  slug: 'openhl-liquidation-margin-health-en',
  type: 'CONTENT',
  sortOrder: 2,
  duration: 30,
  xpReward: 60,
  content: `# Lesson 6 — margin_health — the classification cascade and boundary semantics\n\n...`
},
```

## SHA pinning discipline

L6 cites `22eedf9` (Stage 10a). The answer-key diff after L6 covers compute.rs through `margin_health` and 18 unit tests; only `close_order_spec` + 3 tests remain for L7.

## Style review notes (self-critique before paste)

- **The "Liquidatable first" predict callout** anchors the cascade-order discussion. Without it, the reader takes the order on faith; with it, they've imagined the wrong order failing and seen *why*. The mental model survives the next refactor.
- **The boundary-at-maintenance test is the load-bearing piece of L6.** Without it, a `<` → `≤` typo silently passes the other four tests and ships. With it, the convention is locked in across all future refactors. This is the same kind of "test the boundary, not just the middle" discipline that funding's overflow proptest taught.
- **L6 is application, not new discipline.** The pedagogy has shifted: by here, the reader knows `i128`, `saturating_*`, proptests, the fixed-point scale. L6 just composes those on a small branching function. The design hill (cascade order + strict-less-than) is small enough to internalize in one read.
- **Q5's discussion of `match` with range patterns** is the kind of "we considered this, here's why we didn't" detail that helps the reader trust the author's judgment for the harder calls they'll have to make in their own code.
