# Building OpenHL Liquidation — L7 draft (EN) — build-along

> openhl SHA `22eedf9` (Stage 10a — liquidation margin math).

## L7 — `openhl-liquidation-close-order-spec-en`

**Stage**: Stage 10a — `22eedf9`

**Title**: Lesson 7 — `close_order_spec` — Stage 10a's last function

**Duration**: 20 min · **XP**: 40

---

````markdown
# Lesson 7 — `close_order_spec` — Stage 10a's last function

## Goal

Concepts you'll grasp in this lesson:

- **The elementary close-the-position rule** — long is closed by *selling*, short is closed by *buying*. Side is always the opposite of the position direction; the engine doesn't decide a side, it inverts one.
- **`unsigned_abs` at the public boundary** — the discipline from L4 (use `unsigned_abs` over `abs` for `i64`) shows up at the function that talks to the bridge. The output `Qty(u64)` is the type the CLOB matching engine expects; the engine pushes the sign-conversion to its own boundary.
- **Why `close_order_spec` doesn't filter flat positions** — a flat position generates a spec with `qty == 0`. The bridge filters before submitting. Keeping `close_order_spec` total and side-effect-free makes it composable with the Stage 10c multi-account scanner.
- **Single-responsibility scoping** — `close_order_spec` doesn't take `MarkPrice` (market orders carry no price) or `LiquidationParams` (the decision-to-liquidate happens in `margin_health`). One snapshot in, one spec out.

Verification:

```bash
cargo test -p openhl-liquidation
```

…passes 24 tests (21 from L4–L6 + 3 new tests for the three close-side cases). **Stage 10a is now byte-for-byte complete against `22eedf9`.**

Specific changes:

- **`src/compute.rs`** — appends `close_order_spec` after `margin_health` + 3 unit tests inside the existing test module.
- **`src/lib.rs`** — extends the compute re-export to include `close_order_spec`.

L7 is the shortest lesson in Stage 10a. The function itself is 11 lines; the lesson exists to lock in the side-inversion rule and to mark the completion of the pure-compute module.

## Recap

After L6:
- `compute.rs` has `notional_value`, `unrealized_pnl`, `account_equity`, `margin_ratio`, `margin_health`, plus the `saturate_i128_to_i64` helper and 18 unit tests + 3 proptests.
- `lib.rs` re-exports 5 of 6 compute functions (everything except `close_order_spec`).
- `cargo test` runs 21 tests, all green.

L7 closes Stage 10a. After this lesson, the answer-key diff against `22eedf9` is fully clean for both `compute.rs` and `lib.rs`.

## Plan

Three edits:

1. **Append `close_order_spec` to `crates/liquidation/src/compute.rs`** — 11 lines plus the doc comment.
2. **Add 3 unit tests** in the existing test module — long-closes-with-Sell, short-closes-with-Buy, flat-position-has-zero-qty.
3. **Update `crates/liquidation/src/lib.rs`** — extend the compute re-export.

> 🛑 **Predict.** Before scrolling: a long position with `position_size = 10` needs to be force-closed. **What `Side` does the engine emit, and what `Qty`?** Then: a short with `position_size = −10` — same questions.

(Answer: **Long: `Side::Sell`, `Qty(10)`. Short: `Side::Buy`, `Qty(10)`.** Long is closed by selling: the trader holds 10 units long, so they need to sell 10 to flatten. Short is closed by buying: the trader has 10 units short, so they need to buy 10 to flatten. Quantity is always the magnitude of the position; the sign lives in the side, not in qty. **`Qty` is `u64` precisely because magnitude is sign-free.**)

## Walk-through

### Step 1: Append `close_order_spec` to `src/compute.rs`

Open `crates/liquidation/src/compute.rs`. After `margin_health`, before the `#[cfg(test)]` block, append:

```rust
/// Generate the close-order spec for a liquidatable position.
///
/// Side is the opposite of the position direction (long → SELL, short →
/// BUY), quantity is the absolute position size. Always a market order
/// at the bridge layer — liquidation accepts any available price.
///
/// Flat positions produce a spec with `qty == 0`; callers should filter
/// these out before submitting, since the CLOB will reject a zero-qty
/// order. We don't filter here because liquidation engines typically scan
/// many accounts and a side-effect-free `close_order_spec` is easier to
/// compose.
#[must_use]
pub fn close_order_spec(snapshot: &AccountSnapshot) -> CloseOrderSpec {
    let abs_size = snapshot.position_size.0.unsigned_abs();
    let side = if snapshot.position_size.0 > 0 {
        Side::Sell
    } else {
        Side::Buy
    };
    CloseOrderSpec {
        account: snapshot.account,
        side,
        qty: Qty(abs_size),
    }
}
```

Five things to notice about this 11-line function:

1. **Side is *always the opposite* of position direction.** The trader holds `size` units (positive = long, negative = short). To close, the engine submits an order on the other side: a long unwinds by selling, a short unwinds by buying. **The matching engine doesn't care about the close's *intent*; it only sees an order on a side. The "opposite side" rule is the entire bridge between position direction and order side.**

2. **`unsigned_abs()` returns the magnitude as `u64`.** Same L4 discipline applied to the public boundary. `Qty` wraps a `u64`, so the magnitude flows directly into `Qty(abs_size)` without an intermediate `as u64` cast. **The function does sign conversion exactly once, at the boundary where signed position-size meets unsigned order-quantity.**

3. **`if snapshot.position_size.0 > 0` — strict greater-than.** A flat position (`size == 0`) falls into the `else` branch and gets `Side::Buy`. That's harmless because qty will also be 0 — the spec exists but it's meaningless. **We don't special-case the flat path inside the function**; the bridge filters specs with `qty == 0` before submitting.

4. **No `mark`, no `params`.** `close_order_spec` only needs the snapshot. The "decision to close" lives in `margin_health`; the price discovery happens at the matching engine. **Each function owns exactly one concern. The bridge composes them: scan → classify → generate close spec → submit.**

5. **Returns `CloseOrderSpec` by value, not `Option<CloseOrderSpec>`.** The function is total — it always returns a spec, even for flat positions (with `qty == 0`). The alternative — `Option` — would force the caller to handle `None` for every flat account in a scan, even though those accounts are already pre-filtered by the time we reach the close step. **Total functions compose; optional functions force every caller to handle the empty case.**

> 🛑 **Anti-fluency.** "Why not `if size >= 0 { Sell } else { Buy }` — wouldn't that handle flat as Sell, which is what some test exchanges do?" **Three problems.** (1) Flat-as-Sell is a behavior choice that belongs at the bridge, not in pure compute. (2) The current `> 0` correctly reflects that flat positions are neither longs nor shorts. (3) Production semantics for `qty == 0 + Side::Sell` are undefined at the matching engine; the bridge has to filter regardless. **Pick the convention that produces the cleanest contract for callers, not the one that hides edge cases.**

### Step 2: Add 3 unit tests

Inside the existing `#[cfg(test)] mod tests { ... }`, after the `margin_health` tests, add:

```rust
    // ─── close_order_spec ──────────────────────────────────────────

    #[test]
    fn close_long_with_sell() {
        let s = snapshot(10, 100, 0);
        let order = close_order_spec(&s);
        assert_eq!(order.side, Side::Sell);
        assert_eq!(order.qty, Qty(10));
        assert_eq!(order.account, AccountId(42));
    }

    #[test]
    fn close_short_with_buy() {
        let s = snapshot(-10, 100, 0);
        let order = close_order_spec(&s);
        assert_eq!(order.side, Side::Buy);
        assert_eq!(order.qty, Qty(10));
    }

    #[test]
    fn close_flat_has_zero_qty() {
        // Flat position generates a zero-qty spec; callers must filter.
        let s = snapshot(0, 100, 1_000);
        let order = close_order_spec(&s);
        assert_eq!(order.qty, Qty(0));
    }
```

Things to notice:

1. **`close_long_with_sell` asserts all three output fields.** Side, qty, and account — every output field gets locked in. The bridge depends on all three; testing all three protects against a partial refactor that fixes one and breaks another. **For output-type tests, assert every field the caller will read.**

2. **`close_short_with_buy` skips the account assertion.** The account field comes from the same input source as `close_long_with_sell`; if it worked for long, it works for short. **Cover the orthogonal axes once; don't repeat what previous tests already locked in.**

3. **`close_flat_has_zero_qty` exists *despite* the function not filtering the flat case.** The test documents the contract: "we promise that flat positions produce zero-qty specs, callers must filter." If a future refactor accidentally added a filter inside `close_order_spec` (returning `Default::default()` or panicking on flat), this test would fail. **Tests preserve documented contracts, including ones that say "we don't do this; the caller does."**

### Step 3: Update `src/lib.rs`

Open `crates/liquidation/src/lib.rs`. Extend the compute re-export. Was:

```rust
pub use compute::{
    account_equity, margin_health, margin_ratio, notional_value, unrealized_pnl,
};
```

Becomes:

```rust
pub use compute::{
    account_equity, close_order_spec, margin_health, margin_ratio, notional_value, unrealized_pnl,
};
```

One new name — `close_order_spec` — alphabetically inserted after `account_equity`. All six compute functions are now re-exported.

### Step 4: Run the tests

```bash
cargo test -p openhl-liquidation
```

Expected output:

```
running 24 tests
test compute::tests::close_flat_has_zero_qty ... ok
test compute::tests::close_long_with_sell ... ok
test compute::tests::close_short_with_buy ... ok
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

test result: ok. 24 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

**24 tests passing. Stage 10a content is complete.** The liquidation crate's pure-compute module — margin math + classification + close-order generation — is now in your workspace and the answer-key diff against `22eedf9` is fully clean.

Common errors:

- **`close_short_with_buy` fails with `Side::Sell`** — you accidentally wrote `if snapshot.position_size.0 >= 0`. Flat positions don't matter here, but using `>=` makes shorts of `0` (which don't exist) flip to Sell — and the test for `size = -10` would still see `size > 0` as false. Re-check the direction.
- **`close_flat_has_zero_qty` fails because the function panics** — you might have added `.abs()` instead of `.unsigned_abs()`. `i64(0).abs()` is fine, but if you wrote `i64(-10).abs() as u64` you'd risk the i64::MIN footgun from L4. Stick with `unsigned_abs`.

## Design reflection

Three load-bearing decisions in this lesson:

1. **Side is the opposite of position direction — no other case.** Long → Sell, Short → Buy. The function doesn't need a third case for "ambiguous" or a fallback for "unknown." The position has a sign or it's flat; the spec inverts the sign or carries zero. **Elementary inversion is the right shape for "close this position."**

2. **`close_order_spec` is side-effect-free even for flat positions.** Returning a zero-qty spec instead of filtering inside the function keeps `close_order_spec` total and easy to compose. The Stage 10c scanner can `for snapshot in snapshots { specs.push(close_order_spec(snapshot)); }` without branching; the bridge filters at submit time. **Pure functions return; impure boundary layers filter.**

3. **The function takes no `mark`, no `params`.** Each compute function owns exactly one concern: `margin_health` decides *whether* to close; `close_order_spec` decides *how*. Mixing them — e.g., taking `params` to apply the liquidation fee to qty — would couple two responsibilities. The fee belongs to Stage 10b (insurance fund), where collateral and fee math live together. **Single responsibility makes the bridge's composition path obvious.**

## Answer key

```bash
cd ~/code/openhl-reference
git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/src/compute.rs ./crates/liquidation/src/compute.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
```

After L7:
- **compute.rs** matches Stage 10a's `compute.rs` **byte-for-byte**.
- **lib.rs** matches Stage 10a's `lib.rs` **byte-for-byte**.
- **Cargo.toml** has matched since L1.

The full Stage 10a crate is now in your workspace.

## Common questions

**Q1: Should `close_order_spec` return `Option<CloseOrderSpec>` for flat positions?**

Could, but adds friction. Every caller that doesn't care about the flat case (most of them) would need to `.expect("non-flat position")` or `if let Some(spec) = ...`. Returning a total `CloseOrderSpec` with `qty == 0` and pushing the filter to the bridge is cheaper for the common case. **The `Option` discipline is great when the empty case is the *most common* and you want callers forced to handle it; here it's the rare case and forcing handling is overhead.**

**Q2: Why `size > 0` (strict) and not `size >= 0` (non-strict) for the `Side::Sell` branch?**

Because flat (`size == 0`) is *neither* long *nor* short — it's outside the long/short dichotomy. The convention "flat is a long" or "flat is a short" is both arbitrary; we picked the convention where flat falls into the `else` branch silently and qty is 0 anyway. Either choice works; the discipline is **be consistent and document the choice**. The doc says "flat → qty 0, callers filter," which is what readers can verify against the code.

**Q3: Could `close_order_spec` be a method on `AccountSnapshot` (`snapshot.close_order_spec()`)?**

Syntactically yes — `impl AccountSnapshot { pub fn close_order_spec(&self) -> CloseOrderSpec { ... } }`. We don't do it because the `close_order_spec` function lives in `compute.rs` alongside the other margin-math functions; co-locating with the related code beats co-locating with the receiver type. **`AccountSnapshot` is a data carrier (in `types.rs`); compute lives in `compute.rs`. The free-function form keeps that separation.**

**Q4: What if `position_size = i64::MIN`? Does `unsigned_abs` handle it?**

Yes, by design. `i64::MIN.unsigned_abs() == 9_223_372_036_854_775_808u64` (`u64::MAX / 2 + 1`). The signed `i64::MIN.abs()` would overflow (it has no positive counterpart in i64); `unsigned_abs` returns the magnitude as `u64`, which always has room. **This is exactly the L4 discipline: `unsigned_abs` for magnitudes, `abs` only when you're sure the value isn't `MIN`.**

**Q5: Why does the test fixture's `snapshot` function take `(size, entry, collateral)` rather than `(size, entry, mark, collateral)` — the function under test takes a snapshot and we typically also need a mark?**

`close_order_spec` takes only the snapshot — no mark. The shared `snapshot` fixture from L4 takes the snapshot's three meaningful fields (account is hardcoded) and doesn't carry mark. Mark gets passed as a separate `MarkPrice(...)` argument to the function under test. **The fixture builds what the *type* needs; the test supplies what the *call* needs.**

## Next lesson (L8) — Stage 10b begins

L8 starts Stage 10b — the insurance fund. The pure-compute module you finished in L7 is the *what should happen* layer. Stage 10b adds *the bookkeeping that records what happened* — the `InsuranceFund` state machine that tracks the fund's balance, absorbs deficits from underwater liquidations, and credits liquidation fees from solvent closes. After Stage 10b, the engine knows not just "this account is Liquidatable" but "this close credited 1.5% to the fund" or "this close drained $400 from the fund."

**Stage 10b is not yet shipped in openhl** as of this lesson's draft — L8 lands in rethlab when the openhl-side implementation does.

````

---

## Seed-file slot

L7 lands in Module 2 at sortOrder 3:

```typescript
{
  title: 'Lesson 7 — close_order_spec — Stage 10a\'s last function',
  slug: 'openhl-liquidation-close-order-spec-en',
  type: 'CONTENT',
  sortOrder: 3,
  duration: 20,
  xpReward: 40,
  content: `# Lesson 7 — close_order_spec — Stage 10a's last function\n\n...`
},
```

## SHA pinning discipline

L7 cites `22eedf9` (Stage 10a). After L7, the answer-key diff against `22eedf9` is fully clean for both files in `crates/liquidation/src/`.

## Style review notes (self-critique before paste)

- **L7 is intentionally short.** By L7 the reader has internalized the disciplines (i128 intermediates, saturating arithmetic, unsigned_abs, proptests, prop_assume, single-responsibility composition). The function is small; the lesson exists to apply L4's `unsigned_abs` to the public boundary and to close out the module.
- **The "Stage 10a is complete" marker** at the end of Step 4 is load-bearing. The reader needs to know they've reached a milestone — both for the satisfaction and for the fact that subsequent lessons (L8+) depend on openhl side-stages that aren't shipped yet. The course is in a "complete what's complete; pause for the next openhl stage" state.
- **L7's Q5 about the fixture shape** is the kind of small UX detail that reads as nitpicky in isolation but compounds: a reader who notices it has the framing for similar fixture decisions elsewhere.
- **The "Next lesson" preview names that L8 doesn't exist yet.** Honest scoping — the same discipline as L0's "what you won't have at the end." The reader sees the course shape and knows when to expect the next batch.
