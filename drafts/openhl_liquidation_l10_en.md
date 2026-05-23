# Building OpenHL Liquidation — L10 draft (EN) — build-along

> openhl SHA `260883b` (Stage 10b — insurance fund state machine + close-outcome decomposition).

## L10 — `openhl-liquidation-close-outcome-decomposition-en`

**Stage**: Stage 10b — `260883b`

**Title**: Lesson 10 — `liquidation_fee` + close-outcome decomposition — the bridge between `compute` and `insurance`

**Duration**: 35 min · **XP**: 70

---

````markdown
# Lesson 10 — `liquidation_fee` + close-outcome decomposition — the bridge between `compute` and `insurance`

## Goal

Concepts you'll grasp in this lesson:

- **Every liquidation event decomposes into a `(fund movement, account residual)` pair.** A solvent close credits the fund and returns positive residual to the trader. An underwater close debits the fund and (sometimes) collects a partial fee. The two functions in this lesson encode that decomposition once, so Stage 10c's scanner can call `InsuranceFund::deposit` and `InsuranceFund::withdraw_shortfall` against the *exact* numbers the math produces. **Pure compute produces credit/debit; state machine accumulates them.**
- **`debug_assert!` as a routing contract.** `solvent_close_outcome` and `underwater_close_outcome` are *non-overlapping*: each one debug-asserts that the *other* one wasn't the right call. The pair is a discriminated dispatch where the caller has the routing obligation; the functions are total only within their precondition window. **Debug-asserts document the contract that the type system can't.**
- **`fee.saturating_sub(post_close_equity)` when `post_close_equity` is negative.** This is the cleanest piece of arithmetic in the lesson: `i64 − (negative i64) = i64 + |negative i64|`. The "already-underwater" sub-case reuses the same expression as the "partial fee" sub-case because subtraction of a negative value adds the magnitude. **One expression covers both branches of an `if` ladder when the operands are signed.**
- **Two distinct return types, not `Result` or one enum.** `SolventClose { fee_to_fund, residual_to_account }` and `UnderwaterClose { fee_to_fund, shortfall_to_fund }` have the same `fee_to_fund` field but completely different second fields. The semantic difference (residual flows *out* to trader, shortfall flows *in* from fund) is heavy enough that one enum with `Option<i64>` shoving these through one slot would obscure the dispatch. **When two paths produce categorically different field semantics, two struct types beat one enum.**

Verification:

```bash
cargo test -p openhl-liquidation
```

…passes 55 tests (34 compute + 21 insurance). The full Stage 10b crate is byte-for-byte against `260883b` after L10.

Specific changes:

- **`src/types.rs`** — adds `SolventClose` and `UnderwaterClose` structs with their doc comments.
- **`src/compute.rs`** — adds `liquidation_fee`, `solvent_close_outcome`, `underwater_close_outcome`, plus 10 new unit tests (4 fee + 3 solvent + 3 underwater).
- **`src/lib.rs`** — extends the compute re-export to include the three new functions; extends the types re-export to include `SolventClose` + `UnderwaterClose`.

L10 closes Stage 10b. After this lesson the answer-key diff against `260883b` is fully clean across all three liquidation crate files.

## Recap

After L9:
- `insurance.rs` is byte-for-byte against `260883b` — the `InsuranceFund` state machine + `WithdrawOutcome` enum + all 12 unit tests + 4 proptests are in place.
- `lib.rs` re-exports `InsuranceFund` and `WithdrawOutcome`.
- `cargo test` runs 45 tests, all green.
- The fund *can* receive deposits and surface drains, but **nothing yet computes how much to deposit or drain on a given close.**

L10 closes that gap. The three new compute functions are the numeric source-of-truth that Stage 10c's scanner will feed into the state machine.

## Plan

Four edits:

1. **Add `SolventClose` + `UnderwaterClose` structs to `crates/liquidation/src/types.rs`** — two simple two-field structs, both `#[derive(Clone, Copy, Debug, PartialEq, Eq)]`.
2. **Add three functions to `crates/liquidation/src/compute.rs`**:
   - `liquidation_fee(closed_notional, params)` — pure fee math with i128 intermediate.
   - `solvent_close_outcome(snapshot, mark, params)` — `SolventClose` for accounts where post-close equity covers the fee.
   - `underwater_close_outcome(snapshot, mark, params)` — `UnderwaterClose` for accounts where it doesn't.
3. **Add 10 unit tests to the existing `#[cfg(test)] mod tests`** in compute.rs.
4. **Extend `crates/liquidation/src/lib.rs`** — re-export the three new functions and the two new types.

> 🛑 **Predict.** Before reading further: a trader holds 1 BTC long, entry $100k, $10k collateral. The position is force-closed at $80,500 (a $19,500 loss). The Hyperliquid-default `liquidation_fee_bps` is 150 (1.5%). Question: **does the insurance fund credit or debit on this close, and by how much?**

(Answer: **The fund debits — it must absorb a $10,707 shortfall.** Walk through: notional at close is $80,500. Fee = $80,500 × 150 / 10,000 = $1,207.50, rounded to $1,207 (integer math). The trader's realized PnL is −$19,500, so post-close equity = $10,000 collateral + (−$19,500 PnL) = −$9,500 — already underwater *before* the fee. No fee is collected (you can't bill a negative balance), and the fund must cover both the desired fee *and* the negative equity: $1,207 + $9,500 = $10,707. This is the `underwater_close_outcome` "already underwater" sub-case, and it's identical to the scenario from the Perp Primer L3 lesson — the same numbers reappear in code form here.)

The decomposition picture for L10:

```
   ┌────────────────────────────────────────────────────────────┐
   │  Per-close decomposition produced by Stage 10b compute     │
   ├────────────────────────────────────────────────────────────┤
   │                                                            │
   │  SOLVENT path                                              │
   │  ───────────                                               │
   │  post_close_equity ≥ fee  →  SolventClose {                │
   │                                fee_to_fund:           +X   │  ──→ flows INTO Fund
   │                                residual_to_account:   +Y   │  ←── flows back to Trader
   │                              }                             │
   │                                                            │
   │  Stage 10c scanner uses:                                   │
   │    fund.deposit(fee_to_fund)                ← Layer 2 grow  │
   │    trader_balance += residual_to_account    ← refund        │
   │                                                            │
   ├────────────────────────────────────────────────────────────┤
   │                                                            │
   │  UNDERWATER path (two sub-cases under one shape)           │
   │  ────────────────                                          │
   │  0 < post_close_equity < fee  →  UnderwaterClose {         │
   │      (partial fee)                 fee_to_fund:       +X   │  ──→ flows INTO Fund
   │                                    shortfall_to_fund: +Y   │  ←── pulled FROM Fund
   │                                  }                         │
   │                                                            │
   │  post_close_equity ≤ 0       →  UnderwaterClose {          │
   │      (already underwater)          fee_to_fund:        0   │
   │                                    shortfall_to_fund: +Z   │  ←── pulled FROM Fund
   │                                  }                         │
   │                                                            │
   │  Stage 10c scanner uses:                                   │
   │    fund.deposit(fee_to_fund)            ← may be 0          │
   │    fund.withdraw_shortfall(shortfall_to_fund)               │
   │      ↑ returns WithdrawOutcome (L9)                         │
   │      ↑ Depleted/PartiallyDrained variants escalate to ADL   │
   │                                                            │
   └────────────────────────────────────────────────────────────┘
```

Three things to notice about the diagram:

1. **`SolventClose` outputs flow *out* of the system; `UnderwaterClose` outputs flow *in* from the system.** Residual returns to the trader (positive flow toward the account); shortfall pulls from the fund (positive flow toward the close). Same magnitude shape (`i64 ≥ 0`), opposite direction. **The *direction* of money flow lives in the field name, not in the sign.**
2. **`UnderwaterClose` has two sub-cases that compile to one shape.** A single struct with two `i64` fields covers both "partial fee, partial shortfall" and "zero fee, full shortfall." The struct doesn't need an internal `kind` discriminator because the *value* of `fee_to_fund` (zero or positive) carries the distinction. **Don't tag a sub-case if a field value already tells you which one fired.**
3. **The decomposition is what makes Stage 10c possible.** The scanner doesn't need to know *why* a close is solvent or underwater — only that it gets back two i64s with named semantics. **A clean decomposition between math and state lets the state-machine layer stay dumb.**

## Walk-through

### Step 1: Add `SolventClose` + `UnderwaterClose` to `src/types.rs`

Open `crates/liquidation/src/types.rs`. After the existing `CloseOrderSpec` definition, add:

```rust
/// Solvent-close outcome (Stage 10b).
///
/// Produced by [`crate::compute::solvent_close_outcome`] for a Liquidatable
/// account whose post-close equity covers the liquidation fee in full.
/// Both fields are non-negative.
///
/// `fee_to_fund` is credited to the insurance fund; `residual_to_account`
/// is returned to the trader's collateral balance.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct SolventClose {
    /// Fee deducted from collateral and credited to the insurance fund.
    pub fee_to_fund: i64,
    /// What's returned to the trader's collateral after the close + fee.
    pub residual_to_account: i64,
}

/// Underwater-close outcome (Stage 10b).
///
/// Produced by [`crate::compute::underwater_close_outcome`] when the
/// account's post-close equity cannot cover the full liquidation fee.
///
/// Covers two sub-cases under one shape:
///   - Post-close equity is positive but smaller than the desired fee
///     (Liquidatable account whose close + fee turned underwater): the
///     remaining equity is paid as a partial fee, the uncollected portion
///     becomes the shortfall.
///   - Post-close equity is already negative (Underwater account): no fee
///     is collected, the full desired fee plus the negative equity becomes
///     the shortfall.
///
/// Both fields are non-negative; `fee_to_fund` may be `0` in the
/// negative-equity case.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct UnderwaterClose {
    /// Partial fee collected from any positive post-close equity, credited
    /// to the insurance fund. May be `0`.
    pub fee_to_fund: i64,
    /// What the insurance fund must absorb so the close completes. The
    /// caller hands this to [`crate::insurance::InsuranceFund::withdraw_shortfall`].
    pub shortfall_to_fund: i64,
}
```

Four things to notice about these types:

1. **Both fields in both structs are `i64`, not `u64`** — same type-uniformity reasoning as L8's `InsuranceFund::balance`. The whole crate computes in `i64`; the structs document non-negativity in their doc comments instead. **Type uniformity inside a crate compounds over time; per-field unsignedness is local convenience that costs casts at every boundary.**
2. **Same derive set on both: `Clone + Copy + Debug + PartialEq + Eq`** — same set as `WithdrawOutcome` and `InsuranceFund`. These are 16-byte POD types; values are cheaper than references. **Pure-value types in this crate use one consistent derive list. Predictability is its own virtue.**
3. **Doc comments name the *destination* of each field, not the *source*.** `fee_to_fund` says where it goes (insurance fund), not where it came from (trader's collateral). `shortfall_to_fund` says where it goes (paid *to* the close from the fund), not the negative-equity arithmetic that produced it. **Name fields by what the caller does with them, not by how the producer computed them.**
4. **`UnderwaterClose` carries `shortfall_to_fund` even though `fee_to_fund` is sometimes zero.** The field is always present in the struct regardless of which sub-case fired. The caller pattern-matches on the *value* (`if shortfall_to_fund > 0 { fund.withdraw_shortfall(...) }`), not on the struct shape. **Total field presence > sub-case-specific shape; the caller does one match against zero.**

### Step 2: Add `liquidation_fee` to `src/compute.rs`

Open `crates/liquidation/src/compute.rs`. After the `saturate_i128_to_i64` helper (at the bottom of the helper section, before any tests), add:

```rust
/// Liquidation fee on a closed notional, in quote units.
///
/// `fee = notional × fee_bps / MARGIN_SCALE`, saturating on overflow.
/// Pure math — the caller (Stage 10c scanner / bridge) supplies the
/// actual fill notional from the matching engine.
///
/// Returns `0` for a zero notional (flat positions; should never reach
/// the engine but symbol-completeness pays off in proptest).
#[must_use]
pub fn liquidation_fee(closed_notional: u64, params: &LiquidationParams) -> i64 {
    if closed_notional == 0 {
        return 0;
    }
    let bps = i128::from(params.liquidation_fee_bps);
    let n = i128::from(closed_notional);
    let scaled = n.saturating_mul(bps);
    let fee = scaled / i128::from(MARGIN_SCALE);
    saturate_i128_to_i64(fee)
}
```

Five things to notice:

1. **`closed_notional: u64` (input), `-> i64` (output).** Notional is always non-negative — it's a magnitude (price × |size|). The output is signed because the rest of the crate's arithmetic is signed; the fee will be subtracted from the trader's equity via `i64` subtraction, and forcing a `u64 → i64` cast at the call site would clutter the scanner. **Unsignedness at the input boundary captures the domain fact; signedness at the output matches the surrounding arithmetic.**
2. **The fast-path return for `closed_notional == 0`.** Skips three `i128` conversions and a saturating multiply for a value that's almost always going to be zero (flat positions don't reach the close path, but the scanner can still call this defensively). **Cheap predicates that handle the dominant zero case earn their keep.**
3. **`i128::from(...)` instead of `as i128`.** `From` is infallible by construction — `u64 → i128` and `u32 → i128` are both widening conversions that can never lose data. Using `From` makes the intent explicit and prevents accidental `as` from sneaking into narrowing positions later. **In code that talks to consensus arithmetic, `From` for widening is the default; reserve `as` for narrowing where you control the bit-width.**
4. **`saturating_mul` on the i128 product.** Even `i128` can overflow on `u64::MAX × u32::MAX` (the pathological case the `fee_saturates_on_pathological_input` test fires); saturating-mul caps at `i128::MAX`, which then gets saturated again to `i64::MAX` by the helper. **Two layers of saturation in series is fine — each one defends against the next.**
5. **No `saturating_div`.** Integer division on i128 doesn't overflow (except `i128::MIN / -1`, which is unreachable here because numerator and denominator are both non-negative). Using plain `/` is correct and the alternative would just be ceremony. **Saturating operations are for arithmetic that *can* overflow; division of two non-negative operands cannot, so don't decorate it.**

### Step 3: Add `solvent_close_outcome` to `src/compute.rs`

Append below `liquidation_fee`:

```rust
/// Solvent-close outcome — the trader's collateral plus realized `PnL`
/// covers the liquidation fee in full, with positive residual returning
/// to the account.
///
/// **Precondition** (debug-asserted): the account is Liquidatable AND the
/// post-close equity (= collateral + realized `PnL` at `close_price`)
/// covers the desired fee. If the precondition is violated, the result
/// has `residual_to_account ≤ 0` — caller should have routed to
/// [`underwater_close_outcome`] instead.
///
/// Stage 10b never mutates state — this is pure compute that produces
/// the credit/debit pair for the caller (Stage 10c scanner) to apply
/// against [`crate::insurance::InsuranceFund`] and the trader's balance.
#[must_use]
pub fn solvent_close_outcome(
    snapshot: &AccountSnapshot,
    close_price: MarkPrice,
    params: &LiquidationParams,
) -> SolventClose {
    let notional = notional_value(snapshot, close_price);
    let fee = liquidation_fee(notional, params);
    let post_close_equity = account_equity(snapshot, close_price);
    debug_assert!(
        post_close_equity >= fee,
        "solvent_close_outcome called with post_close_equity={post_close_equity} < fee={fee}; \
         caller should route to underwater_close_outcome instead",
    );
    SolventClose {
        fee_to_fund: fee,
        residual_to_account: post_close_equity.saturating_sub(fee),
    }
}
```

Six things to notice:

1. **The function *composes three pre-existing functions* from Stage 10a.** `notional_value`, `liquidation_fee` (added in Step 2), and `account_equity` are all called inline. There's no new math; the function is a *routing* function that produces a packaged outcome from three existing primitives. **High-level outcome functions should compose low-level math, not duplicate it.**
2. **`debug_assert!` is the contract.** The precondition (`post_close_equity >= fee`) is the *routing decision* the caller already made: "this is a solvent close." Calling `solvent_close_outcome` when the close is underwater is a *caller bug*, not a runtime branch — and `debug_assert!` fires in debug builds while compiling out in release. **The `debug_assert!` doesn't change runtime behaviour; it catches caller bugs during development and disappears in production.**
3. **The error message in `debug_assert!` includes the *named values*.** A developer who triggers this assertion sees `post_close_equity=-500 < fee=1207`, not just a line number. With format-string captures (`{post_close_equity}`), the message has zero string-allocation overhead in the success path. **Format-string captures in assertion messages cost nothing when the assertion passes; they pay back enormously when it fails.**
4. **`post_close_equity.saturating_sub(fee)` even though the assertion guarantees `equity ≥ fee`.** Why? Because release builds don't fire `debug_assert!`. If a caller bug skips the assertion in release, plain `-` would still complete the subtraction, but a different bug elsewhere (e.g., `equity` being `i64::MIN` due to upstream overflow) could underflow `equity - fee`. Saturation gives us a clamped i64 in every case. **Saturating arithmetic is the belt-and-braces complement to `debug_assert!`; together they cover dev *and* prod.**
5. **The function takes `params: &LiquidationParams` by reference, not by value.** `LiquidationParams` is `Copy + 12 bytes`; passing by value would be marginally cheaper, but every other compute function in the crate takes it by reference, so consistency wins. **Match the calling convention of sibling functions.**
6. **No return-by-tuple.** We could return `(i64, i64)` and let the caller decide which is which. Returning `SolventClose` with named fields makes the dispatch at the call site self-documenting and prevents a future mistake where someone swaps the field order. **Named-field structs beat tuples whenever the call site has to remember "what was the second one again?"**

### Step 4: Add `underwater_close_outcome` to `src/compute.rs`

Append below `solvent_close_outcome`:

```rust
/// Underwater-close outcome — the account's post-close equity cannot
/// cover the liquidation fee, so the insurance fund must absorb the
/// shortfall.
///
/// Handles both sub-cases under one shape:
///   - Positive but insufficient post-close equity (Liquidatable account
///     whose close + fee turned underwater): the equity is paid as a
///     partial fee, the rest becomes the shortfall.
///   - Negative post-close equity (Underwater account before fee): no
///     fee is collected, the entire fee plus `|equity|` becomes the
///     shortfall.
///
/// **Precondition** (debug-asserted): `post_close_equity < fee_desired` —
/// otherwise the close is solvent and the caller should have routed to
/// [`solvent_close_outcome`].
#[must_use]
pub fn underwater_close_outcome(
    snapshot: &AccountSnapshot,
    close_price: MarkPrice,
    params: &LiquidationParams,
) -> UnderwaterClose {
    let notional = notional_value(snapshot, close_price);
    let fee = liquidation_fee(notional, params);
    let post_close_equity = account_equity(snapshot, close_price);
    debug_assert!(
        post_close_equity < fee,
        "underwater_close_outcome called with post_close_equity={post_close_equity} ≥ fee={fee}; \
         caller should route to solvent_close_outcome instead",
    );

    if post_close_equity > 0 {
        // Partial fee: equity covers some but not all of the desired fee.
        UnderwaterClose {
            fee_to_fund: post_close_equity,
            shortfall_to_fund: fee.saturating_sub(post_close_equity),
        }
    } else {
        // Already underwater (equity ≤ 0). No fee collected; fund covers
        // the full fee plus the negative equity. `fee - negative_equity`
        // is `fee + |equity|` via saturating_sub semantics.
        UnderwaterClose {
            fee_to_fund: 0,
            shortfall_to_fund: fee.saturating_sub(post_close_equity),
        }
    }
}
```

Seven things to notice:

1. **The two sub-case branches share the same `shortfall_to_fund` expression: `fee.saturating_sub(post_close_equity)`.** In the partial-fee case, `equity` is positive and the subtraction yields the uncollected portion. In the already-underwater case, `equity` is negative or zero and the subtraction becomes `fee - negative = fee + |equity|`. Concretely, with `fee = 1207` and `post_close_equity = -9500`:

   ```
   1207 - (-9500) = 1207 + 9500 = 10707
   ```

   — and the code reaches this answer without `.abs()`, an explicit `+`, or a branch on the sign. **One expression covers both branches because integer subtraction of a negative value is addition of its magnitude.** This is the cleanest piece of arithmetic in the lesson — a junior reader will see it twice and *think* it's a bug; a senior reader will see it and understand why the function works. (The code comment in Step 4 uses `negative_equity` as a *concept name* for `post_close_equity` when it's negative — it's not a separate variable.)
2. **The `if post_close_equity > 0` branch is *strict greater-than*.** A post-close equity of exactly zero falls into the `else` (already-underwater) branch, where `fee_to_fund = 0`. That matches the semantics: there's nothing to *collect* if collateral is exhausted. **Strict greater-than at boundary predicates routes zero into the "no work" branch.**
3. **`fee_to_fund` differs between branches; `shortfall_to_fund` does not.** This asymmetry is intentional: the *fee collection* depends on whether equity is positive, but the *shortfall* is always `fee - equity` (where negative equity adds to the shortfall). **When two branches share part of their work, factor the shared expression out only if the saving is greater than the readability cost.** Here, an early `let shortfall = fee.saturating_sub(post_close_equity);` would save 12 characters and lose the inline visual symmetry; we keep the duplication.
4. **The `else` branch doesn't `match` on equity = 0 vs equity < 0 separately.** Both cases produce identical outputs (`fee_to_fund = 0, shortfall = fee - equity`), so they share a branch. **Code paths whose outputs collapse to one expression share one branch.**
5. **The doc comment is *the* user-facing summary** of when each sub-case fires. The walked-through reader will jump from this function back to the doc comment when they later use the function elsewhere; the doc has to stand alone without the body for context. **Doc comments are read by the *consumer* of the function, who doesn't have your body open.**
6. **`debug_assert!` flips its predicate from `solvent_close_outcome`.** That's deliberate: the assertions form a *non-overlapping cover* of the input space. Together, `solvent ⇔ equity ≥ fee` and `underwater ⇔ equity < fee` exhaustively partition the input space. The pair is a discriminated dispatch, and the assertions prove it. **Pairing two pure functions with opposite preconditions is a discriminated dispatch by convention — the type system can't help here, but the pair of asserts does.**
7. **No early return on `post_close_equity == 0`.** A reader might think we should add a fast path for "exactly at zero" since it's a common boundary. We don't — because the `else` branch already produces the correct answer, and the branch evaluation cost is one comparison. **Don't add boundary fast-paths unless the math actually differs at the boundary.**

> 🛑 **Anti-fluency.** "Why not collapse `solvent_close_outcome` and `underwater_close_outcome` into one function returning `Result<SolventClose, UnderwaterClose>`?" Three problems. (1) Neither outcome is an error — both are *successful* closes that route to different state-machine operations. (2) Stage 10c's scanner calls the *appropriate one* based on a margin-health check the scanner *already did*; routing the dispatch through `Result` re-does the work the scanner already did. (3) The `debug_assert!` pair is more meaningful with two separate functions because each function declares its own contract — a single function with one return type can't express "this side of the partition is correct only here." **Two functions with opposite preconditions express discriminated dispatch better than one function returning a tagged union.**

### Step 5: Add the 10 unit tests to compute.rs

Inside the existing `#[cfg(test)] mod tests` block, add three test sections after the existing L7 close-order-spec tests:

```rust
    // ─── Stage 10b: liquidation_fee ────────────────────────────────

    #[test]
    fn fee_basic() {
        // 1.5% of $80,400 = $1,206 — matches the Perp Primer L3 example.
        let params = LiquidationParams::hyperliquid_default();
        assert_eq!(liquidation_fee(80_400, &params), 1_206);
    }

    #[test]
    fn fee_zero_notional() {
        let params = LiquidationParams::hyperliquid_default();
        assert_eq!(liquidation_fee(0, &params), 0);
    }

    #[test]
    fn fee_zero_bps() {
        // No fee if the network params zero it out.
        let params = LiquidationParams {
            initial_margin_bps: 1_000,
            maintenance_margin_bps: 200,
            liquidation_fee_bps: 0,
        };
        assert_eq!(liquidation_fee(1_000_000, &params), 0);
    }

    #[test]
    fn fee_saturates_on_pathological_input() {
        // notional × bps would overflow i64 but saturates inside i128.
        let params = LiquidationParams {
            initial_margin_bps: 1_000,
            maintenance_margin_bps: 200,
            liquidation_fee_bps: u32::MAX,
        };
        let fee = liquidation_fee(u64::MAX, &params);
        assert_eq!(fee, i64::MAX);
    }

    // ─── Stage 10b: solvent_close_outcome ──────────────────────────

    #[test]
    fn solvent_close_typical_liquidatable() {
        // 1 BTC long, entry $100k, $10k collateral, close at $95k.
        //   notional = 95_000; fee = 95_000 × 150 / 10_000 = 1_425
        //   realized_pnl = (95_000 − 100_000) × 1 = −5_000
        //   post_close_equity = 10_000 − 5_000 = 5_000
        //   residual = 5_000 − 1_425 = 3_575
        let s = snapshot(1, 100_000, 10_000);
        let params = LiquidationParams::hyperliquid_default();
        let outcome = solvent_close_outcome(&s, MarkPrice(95_000), &params);
        assert_eq!(outcome.fee_to_fund, 1_425);
        assert_eq!(outcome.residual_to_account, 3_575);
    }

    #[test]
    fn solvent_close_short_profit() {
        // Short −1, entry $100k, $10k collateral, close at $90k (favorable!).
        //   notional = 1 × 90_000 = 90_000; fee = 1_350
        //   realized_pnl = (90_000 − 100_000) × (−1) = +10_000
        //   post_close_equity = 10_000 + 10_000 = 20_000
        //   residual = 20_000 − 1_350 = 18_650
        let s = snapshot(-1, 100_000, 10_000);
        let params = LiquidationParams::hyperliquid_default();
        let outcome = solvent_close_outcome(&s, MarkPrice(90_000), &params);
        assert_eq!(outcome.fee_to_fund, 1_350);
        assert_eq!(outcome.residual_to_account, 18_650);
    }

    #[test]
    fn solvent_close_fee_consumes_all_residual() {
        // Edge: post_close_equity exactly equals fee. residual = 0.
        // Construct: size=1, entry=10_000, collateral=10, mark=10_000.
        //   notional = 10_000; fee = 150
        //   pnl = 0; post_close_equity = 10 (collateral only)
        // For fee == equity exactly: need fee = collateral when pnl = 0.
        //   fee = notional × 150 / 10_000 = notional × 0.015
        //   notional = collateral / 0.015
        // Pick collateral=150, then notional must be 10_000.
        let s = snapshot(1, 10_000, 150);
        let params = LiquidationParams::hyperliquid_default();
        let outcome = solvent_close_outcome(&s, MarkPrice(10_000), &params);
        assert_eq!(outcome.fee_to_fund, 150);
        assert_eq!(outcome.residual_to_account, 0);
    }

    // ─── Stage 10b: underwater_close_outcome ────────────────────────

    #[test]
    fn underwater_close_already_underwater_pre_fee() {
        // Perp Primer L3 scenario: 1 BTC long, entry $100k, $10k collateral,
        // close at $80,500. Realized PnL = −$19,500, post_close_equity = −$9,500.
        // Notional = $80,500; fee = 1_207 (80_500 × 150 / 10_000)
        // shortfall = fee − post_close_equity = 1_207 − (−9_500) = $10,707
        let s = snapshot(1, 100_000, 10_000);
        let params = LiquidationParams::hyperliquid_default();
        let outcome = underwater_close_outcome(&s, MarkPrice(80_500), &params);
        assert_eq!(outcome.fee_to_fund, 0);
        assert_eq!(outcome.shortfall_to_fund, 1_207 + 9_500);
    }

    #[test]
    fn underwater_close_partial_fee_collection() {
        // Liquidatable account whose close + fee just barely turns underwater.
        // 1 BTC long, entry $100k, $10k collateral, close at $90,500.
        //   notional = $90,500; fee = 1_357 (90_500 × 150 / 10_000)
        //   realized_pnl = −$9,500; post_close_equity = $500
        //   post_close_equity (500) < fee (1357) → underwater branch
        //   fee_to_fund = 500 (partial fee from positive equity)
        //   shortfall = 1_357 − 500 = 857
        let s = snapshot(1, 100_000, 10_000);
        let params = LiquidationParams::hyperliquid_default();
        let outcome = underwater_close_outcome(&s, MarkPrice(90_500), &params);
        assert_eq!(outcome.fee_to_fund, 500);
        assert_eq!(outcome.shortfall_to_fund, 1_357 - 500);
    }

    #[test]
    fn underwater_close_zero_equity_at_fee() {
        // Edge: post_close_equity exactly 0 (collateral fully eaten by losses).
        // 1 BTC long, entry $100k, $10k collateral, close at $90k → pnl = −10k,
        // equity = 0. fee = 1_350. shortfall = full fee.
        let s = snapshot(1, 100_000, 10_000);
        let params = LiquidationParams::hyperliquid_default();
        let outcome = underwater_close_outcome(&s, MarkPrice(90_000), &params);
        assert_eq!(outcome.fee_to_fund, 0);
        assert_eq!(outcome.shortfall_to_fund, 1_350);
    }
```

Seven things to notice about the test design:

1. **Section dividers match the function names** — `liquidation_fee`, `solvent_close_outcome`, `underwater_close_outcome`. Same grep-friendly grouping discipline as L9. **Group tests by the function they exercise; let the file structure document the API.**
2. **`fee_basic` uses Perp Primer L3 numbers.** $80,400 × 1.5% = $1,206 is the same calculation the Perp Primer L3 lesson walked through conceptually. Seeing the same numbers in concrete code is **curriculum-to-implementation reinforcement** — the reader who came in through the Primer feels the abstraction landing on real arithmetic.
3. **`fee_zero_bps` constructs `LiquidationParams` inline** instead of using the `hyperliquid_default()`. Why? Because the default has `liquidation_fee_bps = 150`, and the test needs `bps = 0`. **When a parameter under test diverges from the default, construct the params inline rather than mutating the default.** It makes the test's intent visible at the top.
4. **`fee_saturates_on_pathological_input` uses both `u64::MAX` and `u32::MAX`.** That's the only test that exercises the i128 saturation path. The math: `u64::MAX × u32::MAX ≈ 2^96`, which fits in i128 but would catastrophically overflow `i64`. The saturating-mul caps at `i128::MAX`, then the final saturate-to-i64 yields `i64::MAX`. **The pathological input test is the *only* place this code path runs; without it, the saturation is dead-code-equivalent.**
5. **`solvent_close_short_profit` exists as a complement to the long-loss case.** Long → loss → solvent close is the expected scenario; short → profit → solvent close ("favorable" liquidation) is the case where a trader gets *more* back than they put in. Both produce a `SolventClose` with the same struct shape, but the residual numbers are wildly different (3,575 vs 18,650). **Tests must cover both signs of every signed-input function.**
6. **`solvent_close_fee_consumes_all_residual` has *the comment that explains the construction*.** The math to find inputs where `post_close_equity == fee` requires solving `fee = notional × 150 / 10_000`. The comment in the test walks the reader through the construction. **A test whose values look magic deserves a comment explaining why they're those values.**
7. **`underwater_close_already_underwater_pre_fee` reuses the Perp Primer L3 numbers.** Same $100k entry, $10k collateral, close at $80,500, same $19,500 PnL — the conceptual scenario from the Primer now produces a `UnderwaterClose` with `fee_to_fund: 0, shortfall_to_fund: 10_707` against the answer-key code. **Curriculum reinforcement compounds across the course; reusing the Primer's numbers in L10 closes the loop.**

### Step 6: Update `src/lib.rs`

Extend the existing re-exports. Find the `pub use compute::{ ... };` block and extend it. Was (after L7):

```rust
pub use compute::{
    account_equity, close_order_spec, margin_health, margin_ratio, notional_value, unrealized_pnl,
};
```

Becomes:

```rust
pub use compute::{
    account_equity, close_order_spec, liquidation_fee, margin_health, margin_ratio,
    notional_value, solvent_close_outcome, underwater_close_outcome, unrealized_pnl,
};
```

Then extend the `pub use types::{ ... };` block. Was:

```rust
pub use types::{
    AccountSnapshot, CloseOrderSpec, LiquidationParams, MarginHealth, MarginRatio, MARGIN_SCALE,
};
```

Becomes:

```rust
pub use types::{
    AccountSnapshot, CloseOrderSpec, LiquidationParams, MarginHealth, MarginRatio, SolventClose,
    UnderwaterClose, MARGIN_SCALE,
};
```

Three new function names (`liquidation_fee`, `solvent_close_outcome`, `underwater_close_outcome`) and two new type names (`SolventClose`, `UnderwaterClose`), all inserted alphabetically. After L10, the crate's public surface includes 9 compute functions and 8 types.

### Step 7: Run the tests

```bash
cargo test -p openhl-liquidation
```

Expected output (abbreviated):

```
running 55 tests
test compute::tests::close_flat_has_zero_qty ... ok
test compute::tests::close_long_with_sell ... ok
... (8 Stage 10a tests)
test compute::tests::fee_basic ... ok
test compute::tests::fee_saturates_on_pathological_input ... ok
test compute::tests::fee_zero_bps ... ok
test compute::tests::fee_zero_notional ... ok
... (more compute)
test compute::tests::solvent_close_fee_consumes_all_residual ... ok
test compute::tests::solvent_close_short_profit ... ok
test compute::tests::solvent_close_typical_liquidatable ... ok
test compute::tests::underwater_close_already_underwater_pre_fee ... ok
test compute::tests::underwater_close_partial_fee_collection ... ok
test compute::tests::underwater_close_zero_equity_at_fee ... ok
... (insurance tests from L8 + L9)

test result: ok. 55 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

**55 tests passing. Stage 10b is complete.** The full crate — `compute.rs`, `insurance.rs`, `types.rs`, `lib.rs` — is byte-for-byte against `260883b`. Pure math, stateful fund, and decomposition outcomes all sit alongside each other.

Common errors:

- **`underwater_close_already_underwater_pre_fee` fails with `shortfall_to_fund: 1_207 - 9_500` (i.e. negative).** You wrote `fee - post_close_equity` with a plain `i64 - i64`, which works arithmetically, but you got the sign of the subtraction wrong: it should be `fee.saturating_sub(post_close_equity)` = `1_207 - (-9_500)` = `+10_707`. Re-read the doc comment on `fee.saturating_sub(post_close_equity)`: the trick is that subtracting a negative adds the magnitude.
- **`underwater_close_partial_fee_collection` fails with `fee_to_fund: 0, shortfall_to_fund: 1_357`** — you wrote the `if` branch as `>=` instead of `>`. With `>=`, equity = 0 routes into the partial-fee branch (still produces correct math: `fee_to_fund = 0, shortfall = fee - 0 = fee`), but with the wrong intent. The doc says "positive but insufficient" — strictly positive.
- **`solvent_close_typical_liquidatable` panics with the debug-assert message.** Your `account_equity` or `notional_value` from L4/L5 is returning a wrong sign. The expected `post_close_equity` is +$5,000; if you're getting something else, walk through the Stage 10a math and fix the upstream function first.
- **`fee_saturates_on_pathological_input` fails with overflow panic.** You wrote `n * bps` (plain `*`) instead of `n.saturating_mul(bps)`. `i128` overflow on multiplication still panics in debug.

## Design reflection

Three load-bearing decisions in this lesson:

1. **The `(fund movement, account outcome)` decomposition is what makes the cascade composable.** Stage 10c's scanner is fundamentally a loop: for each Liquidatable account, decide solvent vs. underwater, call the right outcome function, route the credits/debits to the fund and trader. That loop is trivial *because* L10 packaged the math into two functions with named-field outputs. **A clean decomposition between math and state lets the state-machine layer stay dumb.**

2. **`debug_assert!` is the contract; `saturating_sub` is the seatbelt.** The assertion documents the precondition and catches caller bugs in development. The saturation catches the same bug in production (where assertions compile out) and clamps it to a sane value. **Neither is sufficient alone** — and that's the whole point of the pairing: `debug_assert!` alone would, in release, let an upstream bug (a bad oracle, a corrupted snapshot) underflow into a silent wrap; `saturating_sub` alone would silently absorb a *routing* bug (the caller invoked the wrong function entirely), masking the symptom and leaving the cause un-debugged. Two layers, two failure modes: **dev-time assertions explode where the bug lives so it gets fixed; prod-time saturation guarantees the chain doesn't fork if a bug slips through to mainnet anyway.** **Defensive coding in pure compute uses dev-time assertions + prod-time saturation as a pair.**

3. **Two functions with opposite preconditions > one function returning a tagged union.** `solvent_close_outcome` and `underwater_close_outcome` are a discriminated dispatch *by convention*: the caller routes based on a margin-health check, and the functions' debug-asserts enforce the routing decision. The alternative — one function returning `enum CloseOutcome { Solvent(SolventClose), Underwater(UnderwaterClose) }` — would re-do the routing work inside the function. **When the caller has already made the routing decision, the right interface is two functions, not one with a tagged-union return.**

## Answer key

```bash
cd ~/code/openhl-reference
git checkout 260883b
diff -u ~/code/my-openhl/crates/liquidation/src/compute.rs ./crates/liquidation/src/compute.rs
diff -u ~/code/my-openhl/crates/liquidation/src/types.rs ./crates/liquidation/src/types.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
```

After L10:
- **compute.rs** matches Stage 10b's `compute.rs` **byte-for-byte**.
- **types.rs** matches Stage 10b's `types.rs` **byte-for-byte**.
- **lib.rs** matches Stage 10b's `lib.rs` **byte-for-byte**.
- **insurance.rs** has been byte-for-byte since L9.

**Stage 10b is complete.** The whole `openhl-liquidation` crate at commit `260883b` is in your workspace. Module 3 (insurance fund) of the rethlab Liquidation course wraps here.

## Common questions

**Q1: Why does `liquidation_fee` truncate (integer division) instead of round-half-up?**

Consensus determinism requires every validator to compute the same number, and Rust's `/` operator on integers is **truncation toward zero** — the unambiguous default for integer division in every language ABI. Rounding semantics differ between languages (banker's rounding vs. half-away-from-zero) and even between processor families; truncation is the *only* operation that's portably the same. The same discipline is why the *whole crate* refuses `f64` arithmetic: IEEE 754 rounding modes can differ by FPU, by compiler flags, by ordering of operations — every one of those is a chain-fork risk. Integers + saturation + truncation is the only path that gives validators byte-identical state transitions, full stop. **For consensus arithmetic, pick the operation with the simplest determinism story, even if it sacrifices a fraction of a basis point in fee accuracy.**

**Q2: Should `solvent_close_outcome` and `underwater_close_outcome` be methods on `AccountSnapshot`?**

Same answer as L7's Q3 for `close_order_spec`: they live in `compute.rs` alongside the other margin math functions because that's the architectural home. `AccountSnapshot` is a data carrier (in `types.rs`); compute lives in `compute.rs`. **Co-locate by concept, not by receiver.**

**Q3: Why does `underwater_close_outcome` not return zero `shortfall_to_fund` for the trivially-not-underwater boundary case (equity exactly equal to fee)?**

Because the `debug_assert!` precondition is `equity < fee` (strict). If a caller calls `underwater_close_outcome` with `equity == fee`, the assertion fires in debug and the function still runs (in release), producing `fee_to_fund = post_close_equity = fee, shortfall_to_fund = 0` — which is *actually correct* (the close is exactly solvent), but it's not the function's job to fix the caller's routing mistake. **Use `debug_assert!` to enforce contracts; use saturation to make the unenforced case still produce a sane answer.**

**Q4: The `fee_saturates_on_pathological_input` test sets `liquidation_fee_bps = u32::MAX`. That's `4,294,967,295` — over 42 *million* percent. Is this test realistic?**

No, it's not realistic — and that's the point. The test exists to verify the saturation path *fires correctly* in the one input regime where it can fire. A realistic test would test fees of 50 to 500 bps; this test is a *consensus determinism guard* — it proves that even a maliciously-crafted `LiquidationParams` produces a deterministic, non-panicking output. **Saturation tests live at the boundary, not in the operating range.**

**Q5: Could `solvent_close_outcome` return `Option<SolventClose>` where `None` means "actually this is underwater, retry with the other function"?**

You could, but it conflates two questions: "did the function complete?" and "did the caller route correctly?" The current design separates these — the function always completes (returning a value, even when the assertion would fire), and the assertion catches the routing error during development. **Mixing completion semantics with routing semantics is a design smell; keep them in different mechanisms.**

**Q6: Why is `fee_to_fund` in `UnderwaterClose` named the same as in `SolventClose` if the semantics are different?**

The semantics are *the same*: both fields say "this much of the close's fee flowed to the insurance fund." In `SolventClose`, that's the full fee (collected from positive collateral residual). In `UnderwaterClose`, that's a partial fee (collected from positive-but-insufficient equity) or zero (collected from negative equity). The *amount* differs; the *destination* doesn't. **Name fields by destination, not by the math that produced them.**

## Next lesson (L11) — `LiquidationScanner` introduction (Stage 10c)

L11 begins Stage 10c — the multi-account scanner. The scanner is the state-machine consumer of everything L4–L10 produced. It takes a slice of `&[AccountSnapshot]`, classifies each one (Liquidatable, Underwater, Safe, At-Risk) using `margin_health` from L6, calls either `solvent_close_outcome` or `underwater_close_outcome` per Liquidatable account, threads the credits/debits into an owned `InsuranceFund`, and returns a `ScanReport` summarizing the batch: which accounts were closed, which ADL trigger amounts surfaced, and where the fund stands afterwards.

After L11, the cascade has its first *runnable* layer: not just math + state, but math + state + orchestration loop. The SHA pin advances from `260883b` to `0a8464e` (Stage 10c).

````

---

## Seed-file slot

L10 lands in Module 3 at sortOrder 2:

```typescript
{
  title: 'Lesson 10 — liquidation_fee + close-outcome decomposition — the bridge between compute and insurance',
  slug: 'openhl-liquidation-close-outcome-decomposition-en',
  type: 'CONTENT',
  sortOrder: 2,
  duration: 35,
  xpReward: 70,
  content: `# Lesson 10 — liquidation_fee + close-outcome decomposition — the bridge between compute and insurance\n\n...`
},
```

## SHA pinning discipline

L10 cites `260883b` (Stage 10b). After L10, all three liquidation-crate files — `compute.rs`, `insurance.rs`, `types.rs`, plus `lib.rs` — match the answer key byte-for-byte. Stage 10b is closed. L11 advances the SHA pin to `0a8464e` (Stage 10c, scanner).

## Style review notes (self-critique before paste)

- **L10 is the longest lesson in the Liquidation course** (35 min / 70 XP). It's the *Stage 10b capstone* — the function that ties `compute` and `insurance` together — and the natural place to walk through three functions, two new types, and 10 tests in one sitting. The reader who finishes L10 has a fully working Stage 10b crate.
- **The "discriminated dispatch by convention" framing** is the load-bearing teaching point. It reappears in the goal, the design reflection, and the anti-fluency callout. The reader needs to internalize *why* the pair `solvent_close_outcome + underwater_close_outcome` is the right design — and *not* refactor it into one function in a later contribution.
- **`fee.saturating_sub(post_close_equity)` for negative equity** is the single cleverest piece of arithmetic in Stage 10b. Step 4's "things to notice" #1 spends two sentences on it because a reader who internalizes it has the framing for signed-arithmetic tricks throughout the crate.
- **The Perp Primer numbers reappear** in `fee_basic`, `underwater_close_already_underwater_pre_fee`, and `solvent_close_typical_liquidatable`. The reader who came in through the Primer feels the conceptual math hardening into integer assertions. Curriculum reinforcement is a long-game tool; L10 is where it pays back.
- **The next-lesson preview names Stage 10c, the scanner.** Honest scoping: L11 advances the SHA pin to `0a8464e` for the first time since L8. The reader knows the orchestration loop is the next mountain to climb.
- **`debug_assert!` discipline named explicitly** for the first time in the course. Earlier lessons used implicit precondition narratives ("flat positions reach this function but produce qty 0"). L10 elevates the discipline into a load-bearing concept ("contract that the type system can't enforce, caught in dev, saturated in prod"). This framing will recur in Stage 11 oracle and Stage 12 vault crates.
