# Building OpenHL ADL — L2 draft (EN) — build-along

> openhl SHA `d66b44a` (Stage 10d — auto-deleveraging).

## L2 — `openhl-adl-execute-en`

**Stage**: Stage 10d — `d66b44a`

**Title**: Lesson 2 — `execute_adl` — the 5-phase orchestration heart

**Duration**: 40 min · **XP**: 70

---

````markdown
# Lesson 2 — `execute_adl` — the 5-phase orchestration heart

## Goal

Concepts you'll grasp in this lesson:

- **`execute_adl` is the function the bridge calls when the scanner's `unfilled_deficit > 0`.** Layer 1 (margin compute) has already classified accounts. Layer 2 (insurance fund) has already absorbed what it could. When the scanner returns `ScanReport { unfilled_deficit > 0, .. }`, the cascade has reached its third and final layer: ADL. The bridge calls `execute_adl(remaining_accounts, mark, unfilled_deficit) -> AdlReport`, and that one function carries the entire Layer 3 contract — rank the profitable counter-positions, haircut them in order, return a report whose two fields tell the bridge exactly how much deficit was absorbed and how much remains as protocol loss. **Three layers of the safety-net cascade, one function per layer.**
- **The function is a 5-phase pipeline, not a single chunk of logic.** Phase 1: early-return on non-positive deficit (defensive contract). Phase 2: score every candidate via `adl_score` (L1's function), filter out the ineligible (`None`), and collect the survivors with their PnL. Phase 3: stable-sort by `(score descending, account_id ascending)` — the tiebreaker matters for determinism. Phase 4: iterate in rank order, applying `haircut = min(remaining_deficit, pnl_gross)` and accumulating per-account records. Phase 5: assign `deficit_remaining` from the final loop state, return the report. Each phase has its own correctness obligation; the lesson walks them one by one. **Five phases, five testable invariants.**
- **The conservation law `deficit_absorbed + deficit_remaining == input_deficit` is set up in this lesson and proven in L4.** Every iteration of Phase 4 satisfies `haircut + new_remaining == old_remaining`; the loop's terminal state has `deficit_remaining = remaining` and `deficit_absorbed = sum_of_haircuts`. By construction, those two fields sum to the input — a conservation law you can read directly off the code. L4's proptest `conservation_absorbed_plus_remaining_equals_deficit` will verify this against random inputs; in L2 you'll read the structural argument from the loop itself. **Conservation isn't an afterthought you verify later — it's a property the loop body makes obvious.**
- **All arithmetic uses saturating ops to make Phase 4 byzantine-fault-tolerant.** `haircut.saturating_add` for the absorbed accumulator, `remaining.saturating_sub` for the loop variable, `pnl_gross.saturating_sub(haircut)` for the per-record payout. These can't actually overflow in practice (the inputs are i64 and the magnitudes are tiny relative to i64::MAX), but `saturating_*` makes the code's contract explicit: **"if anything ever wraps, we'd rather clamp than panic"**. This pairs with L1's debug_assert! discipline — debug_assert! in test, saturating_* in prod, both for the same reason: turn UB into observable failure. **Same discipline as openhl-liquidation L8's InsuranceFund — saturating in prod, debug_assert in test.**

Verification:

```bash
cargo test -p openhl-liquidation adl::tests::adl_
```

…runs the new 5 unit tests added in this lesson (`adl_zero_deficit_is_noop`, `adl_negative_deficit_clamps_remaining_to_zero`, `adl_no_candidates_keeps_full_deficit`, `adl_no_profitable_keeps_full_deficit`, `adl_single_winner_fully_absorbs_small_deficit`). After this lesson the scanner is *runnable for ADL* — 79 tests pass (74 from L1 + 5 new in L2). L3 will add 6 nuanced absorption tests against execute_adl; L4 will add the 4 invariant proptests and the Stage 10 quartet retrospective.

Specific changes:

- **`crates/liquidation/src/adl.rs`** — append the `execute_adl` function (~50 lines) below the L1 type definitions and `adl_score`. Append 5 unit tests in the existing `#[cfg(test)] mod tests` block.

That's it. Phase 1 + Phase 2 + Phase 3 + Phase 4 + Phase 5, then 5 tests that exercise the degenerate paths.

## Recap

After L1:
- `AdlScore(i64)` — newtype wrapping the i64 ranking, Ord-derived for sorting, Default-derived for zero, Hash-derived for dedup.
- `AdlRecord` — per-account row: `{account, close_order, pnl_gross, haircut, pnl_paid, score}`. Telemetry-shaped; the bridge applies these as *bookkeeping mutations*, never as CLOB orders.
- `AdlReport` — `{records, deficit_absorbed, deficit_remaining}`. The bridge reads `deficit_remaining` to decide whether the chain has reached an unresolvable state.
- `adl_score(snapshot, mark) -> Option<AdlScore>` — the ranking function. Returns `None` for the 4 ineligibility cases (flat position, non-profitable, zero collateral, zero/negative equity). Returns `Some(score)` for valid winners.

L2 takes those primitives and orchestrates them. `adl_score` becomes a filter predicate inside Phase 2; the `AdlReport` becomes the accumulator we fill across Phase 4 and finalize in Phase 5.

## Plan

One function, five phases, five tests.

1. **Append `execute_adl`** below `adl_score`. Pre-declare the 5 phases as comments so the structure is visible before any code.
2. **Phase 1**: early-return when `deficit <= 0`. Empty `records`, `deficit_absorbed = 0`, `deficit_remaining = deficit.max(0)` (the `.max(0)` clamps negative inputs).
3. **Phase 2**: `candidates.iter().filter_map(|s| { let score = adl_score(s, mark)?; let pnl = unrealized_pnl(s, mark); Some((*s, score, pnl)) }).collect::<Vec<_>>()`.
4. **Phase 3**: `ranked.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.account.0.cmp(&b.0.account.0)))` — score descending, account_id ascending tiebreaker.
5. **Phase 4**: `for (snapshot, score, pnl_gross) in ranked { if remaining <= 0 break; let haircut = remaining.min(pnl_gross); ... records.push(...); deficit_absorbed = ... .saturating_add(haircut); remaining = remaining.saturating_sub(haircut); }`.
6. **Phase 5**: `report.deficit_remaining = remaining; report`.

Then append the 5 unit tests at the bottom of the `tests` module.

> 🛑 **Predict.** Before reading the code below: openhl-liquidation L13's `scan` had a similar shape — accumulator initialized empty, per-candidate loop, final assignment. What's the one structural difference between `scan` and `execute_adl` you'd expect, given that ADL has a *quota* (the deficit) but the scanner has *no quota* (it processes every account)?

(Answer: **`execute_adl` has a `break` in the loop when `remaining <= 0`; `scan` does not.** Scanner processes every account in its input (no quota — it's measuring everything that needs liquidation); ADL processes accounts *until the deficit is covered* and then stops (quota-bounded). The `break` is the structural signature of a quota-bounded loop. It also matters for performance — ADL might haircut just 1 of 100 candidates when the first winner has enough PnL; without the `break`, the loop would walk all 100. **Quota-bounded loops have `break`; quota-free loops don't.**)

## The full `execute_adl` source

```rust
/// Execute one ADL pass over the candidate set.
///
/// Pipeline:
///   1. Filter to ADL-eligible accounts (see [`adl_score`]).
///   2. Stable-sort by score descending; ties break by `AccountId`
///      ascending so two equally-ranked accounts produce a
///      deterministic order.
///   3. Iterate, applying `haircut = min(remaining_deficit, pnl_gross)`
///      to each in rank order. Stop when `remaining_deficit == 0` or
///      candidates are exhausted.
///
/// Returns an [`AdlReport`] whose `deficit_absorbed + deficit_remaining`
/// equals the input `deficit` (modulo saturating arithmetic).
///
/// A non-positive `deficit` is treated as "nothing to do" — returns an
/// empty report.
#[must_use]
pub fn execute_adl(
    candidates: &[AccountSnapshot],
    mark: MarkPrice,
    deficit: i64,
) -> AdlReport {
    // Phase 1: defensive early-return for non-positive deficit.
    if deficit <= 0 {
        return AdlReport {
            records: Vec::new(),
            deficit_absorbed: 0,
            deficit_remaining: deficit.max(0),
        };
    }

    // Phase 2: score every candidate, drop the ineligible, keep (snapshot, score, pnl).
    let mut ranked: Vec<(AccountSnapshot, AdlScore, i64)> = candidates
        .iter()
        .filter_map(|s| {
            let score = adl_score(s, mark)?;
            let pnl = unrealized_pnl(s, mark);
            Some((*s, score, pnl))
        })
        .collect();

    // Phase 3: stable sort by (score desc, account_id asc).
    ranked.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.account.0.cmp(&b.0.account.0)));

    // Phase 4: iterate and haircut until deficit absorbed or candidates exhausted.
    let mut report = AdlReport::default();
    let mut remaining = deficit;
    for (snapshot, score, pnl_gross) in ranked {
        if remaining <= 0 {
            break;
        }
        let haircut = remaining.min(pnl_gross);
        let pnl_paid = pnl_gross.saturating_sub(haircut);
        report.records.push(AdlRecord {
            account: snapshot.account,
            close_order: close_order_spec(&snapshot),
            pnl_gross,
            haircut,
            pnl_paid,
            score,
        });
        report.deficit_absorbed = report.deficit_absorbed.saturating_add(haircut);
        remaining = remaining.saturating_sub(haircut);
    }

    // Phase 5: finalize deficit_remaining and return.
    report.deficit_remaining = remaining;
    report
}
```

## Walk-through — the 5 phases

### Phase 1: defensive early-return on non-positive deficit

```rust
if deficit <= 0 {
    return AdlReport {
        records: Vec::new(),
        deficit_absorbed: 0,
        deficit_remaining: deficit.max(0),
    };
}
```

Three things to notice:

1. **`deficit <= 0` covers both zero and negative.** The bridge should only ever pass `deficit > 0` (it gates the call behind `unfilled_deficit > 0`), but a defensive contract guards against bugs upstream. **Defensive guards at module boundaries are how cascades isolate failures.**
2. **`deficit.max(0)` clamps the negative case.** If `deficit = -50` arrives somehow, `deficit_remaining` becomes 0, not -50. A negative remainder would propagate downstream and likely cause arithmetic confusion in the bridge's `if report.deficit_remaining > 0` check. **Clamping at the boundary is cheaper than fixing every downstream consumer.**
3. **The empty `Vec::new()` is intentional, not `vec![]`.** Both compile to the same allocation-free empty vector, but `Vec::new()` is the convention used elsewhere in the openhl-liquidation crate (consistency over personal preference). **Convention beats taste when there's no functional difference.**

### Phase 2: score + filter + collect

```rust
let mut ranked: Vec<(AccountSnapshot, AdlScore, i64)> = candidates
    .iter()
    .filter_map(|s| {
        let score = adl_score(s, mark)?;
        let pnl = unrealized_pnl(s, mark);
        Some((*s, score, pnl))
    })
    .collect();
```

Five things to notice:

1. **`filter_map` is the right combinator here.** `adl_score(s, mark)` returns `Option<AdlScore>` (L1's design); `filter_map` keeps the `Some` cases and drops `None`. Using `filter` + `map` separately would require evaluating `adl_score` twice (once for the filter, once for the map). `filter_map` does it once and unwraps the `Some`. **`filter_map` is "filter and unwrap in one pass" — use it whenever you have a `T -> Option<U>` function.**
2. **The `?` operator inside the closure is the elegant part.** `adl_score(s, mark)?` short-circuits **the current closure invocation only** when `adl_score` returns `None`, returning `None` to `filter_map`. `filter_map` then drops that one element and continues to the next candidate. Without `?`, you'd need an explicit `match` or `let Some(score) = ... else { return None }`. **`?` here does not break the whole iterator; it exits the current closure call and lets iteration continue.**
3. **We compute `unrealized_pnl` *after* the filter passes.** This is order-of-operations matters — `unrealized_pnl` is cheap, but if it were expensive, you'd want to compute it only for accounts that passed the eligibility filter. **Filter first, derive second; never derive a quantity you might throw away.**
4. **The tuple `(snapshot, score, pnl)` packs the loop's three needs.** Phase 3 needs `score` for sorting and `account_id` (via `snapshot`) for the tiebreaker. Phase 4 needs `snapshot`, `score`, and `pnl_gross` to build the `AdlRecord`. Packaging all three in one tuple avoids re-deriving anything in Phase 4. **Tuples are how you carry pre-computed values across loops without re-deriving them.**
5. **`*s` dereferences `&AccountSnapshot` to `AccountSnapshot` (copy).** `AccountSnapshot` is `Copy` (it's a small flat struct), so `*s` is a cheap memcpy. Without `*s`, the tuple would hold `(&AccountSnapshot, ...)` — a reference that would prevent the original slice from being dropped. **`Copy` types let you move ownership cheaply; use `*s` when you want the value, not a reference.**

### Phase 3: stable-sort with tiebreaker

```rust
ranked.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.account.0.cmp(&b.0.account.0)));
```

Four things to notice:

1. **`b.1.cmp(&a.1)` reverses the order — score *descending*.** Higher score gets force-closed first (Hyperliquid convention: luckiest winner pays first). Writing `b.cmp(&a)` instead of `a.cmp(&b)` is the idiomatic "descending" pattern in Rust — no need for `.reverse()`. **`b.cmp(&a)` is descending; `a.cmp(&b)` is ascending. Memorize the pattern.**
2. **`.then_with(|| ...)` is lazy.** The closure inside only runs when `b.1.cmp(&a.1) == Ordering::Equal` (a score tie). Saves work when scores are unique (the common case). **`.then` evaluates eagerly; `.then_with` is the closure variant — prefer `.then_with` when the tiebreaker is non-trivial.**
3. **The tiebreaker is `account_id ascending` — `a.0.account.0.cmp(&b.0.account.0)`.** Note `a` before `b` for ascending. The choice of "ascending" is arbitrary in principle but must be *deterministic* — two equally-lucky winners on different validators must agree on who goes first. Ascending account_id is the simplest deterministic choice. **Tiebreakers exist to make the order reproducible across validators, not to be "fair" — fair just happens to align with deterministic.**
4. **`sort_by` is stable (preserves equal-key insertion order).** This matters in cases where two records have equal score *and* equal account_id (impossible if account_id is unique, but the type signature doesn't enforce uniqueness). Stable sort means the equal-equal case keeps Phase 2's iteration order. Implementation-wise, stable sort pays for this with `O(N log N)` worst-case time and a temporary `O(N)` buffer; `sort_unstable_by` is more in-place. **At this course's candidate sizes (up to 15), that memory cost is negligible, so determinism dominates the trade-off.**

### Phase 4: iterate and haircut

```rust
let mut report = AdlReport::default();
let mut remaining = deficit;
for (snapshot, score, pnl_gross) in ranked {
    if remaining <= 0 {
        break;
    }
    let haircut = remaining.min(pnl_gross);
    let pnl_paid = pnl_gross.saturating_sub(haircut);
    report.records.push(AdlRecord {
        account: snapshot.account,
        close_order: close_order_spec(&snapshot),
        pnl_gross,
        haircut,
        pnl_paid,
        score,
    });
    report.deficit_absorbed = report.deficit_absorbed.saturating_add(haircut);
    remaining = remaining.saturating_sub(haircut);
}
```

Six things to notice:

1. **`AdlReport::default()` gives us empty records, 0 absorbed, 0 remaining.** Deriving `Default` on the report struct (L1's design) means we never have to write `AdlReport { records: Vec::new(), deficit_absorbed: 0, deficit_remaining: 0 }` by hand. **Derive `Default` on accumulator types; they're always initialized to zero.**
2. **`if remaining <= 0 break;` is the quota guard.** Once enough deficit has been absorbed, no more winners get haircut. This is the structural signature of a quota-bounded loop — every quota-bounded loop in openhl has this pattern. **Quota-bounded loops break early; quota-free loops process everything.**
3. **`haircut = remaining.min(pnl_gross)` is the absorption formula.** Take as much PnL as the deficit needs, or as much as the winner has — whichever is less. This is what makes Phase 4 conservative-by-construction: every haircut is bounded by both `remaining` and `pnl_gross`, so `deficit_absorbed` can never exceed the input deficit or the sum of all PnLs. **`min` is the conservative choice when two upper bounds apply.**
4. **`pnl_paid = pnl_gross.saturating_sub(haircut)` is the per-record decomposition.** Decomposition law: `pnl_paid + haircut == pnl_gross` (verified in L4's `each_record_balances_pnl` proptest). The `saturating_sub` here is belt-and-suspenders — `haircut <= pnl_gross` by construction (from the earlier `.min`), so the subtraction can't underflow in practice. **Saturating ops as a defensive habit even when correctness already guarantees no overflow.**
5. **`deficit_absorbed.saturating_add(haircut)` accumulates.** This is the running sum of haircuts; by Phase 5 it equals the total absorbed. The `saturating_add` is the same defensive habit — overflow is impossible here (haircuts are bounded by deficit which is i64), but writing `+` instead of `saturating_add` would be the only `+` in the function. **Consistency of saturating ops in one function makes the discipline obvious to readers.**
6. **`remaining.saturating_sub(haircut)` decrements the loop variable.** Conservation invariant: at every iteration boundary, `(initial_deficit) == deficit_absorbed + remaining + sum_of_unprocessed_pnls_we_haven't_reached_yet`. After the last iteration (or `break`), the third term is zero and we're left with `initial_deficit == deficit_absorbed + remaining`. **The loop's body preserves the conservation invariant as a side effect of being careful with both accumulators.**

### Phase 5: finalize and return

```rust
report.deficit_remaining = remaining;
report
```

Three things to notice:

1. **`deficit_remaining` is set *after* the loop, not inside it.** During the loop, `remaining` is the local mutable; only when the loop exits do we transfer the final value into the report. Setting it inside the loop would be redundant work (overwriting every iteration); setting it after is the correct one-time assignment. **Accumulators in loops, assignments outside.**
2. **`report` is returned by name** (no explicit `return` keyword, no semicolon after `report`). Rust's expression-based return — the last expression in the function body is the return value. **Idiomatic Rust: return values by leaving them as the trailing expression, not with `return`.**
3. **The function is `#[must_use]`** (declared on the signature). The caller (the bridge) must do something with the `AdlReport` — typically apply each record as a bookkeeping mutation and check `deficit_remaining` against zero. `#[must_use]` makes the compiler warn if the bridge accidentally drops the report. **`#[must_use]` on report-returning functions is how you make "you must look at this" a compile-time contract.**

## The 5 unit tests

Append to the existing `#[cfg(test)] mod tests` block in `adl.rs`:

```rust
#[test]
fn adl_zero_deficit_is_noop() {
    let candidates = vec![snapshot(1, 1, 100, 100)];
    let report = execute_adl(&candidates, MarkPrice(200), 0);
    assert!(report.records.is_empty());
    assert_eq!(report.deficit_absorbed, 0);
    assert_eq!(report.deficit_remaining, 0);
}

#[test]
fn adl_negative_deficit_clamps_remaining_to_zero() {
    // Defensive: a negative deficit can't be "absorbed" but also
    // shouldn't propagate as a negative remainder.
    let report = execute_adl(&[], MarkPrice(100), -50);
    assert_eq!(report.deficit_remaining, 0);
}

#[test]
fn adl_no_candidates_keeps_full_deficit() {
    let report = execute_adl(&[], MarkPrice(100), 5_000);
    assert!(report.records.is_empty());
    assert_eq!(report.deficit_absorbed, 0);
    assert_eq!(report.deficit_remaining, 5_000);
}

#[test]
fn adl_no_profitable_keeps_full_deficit() {
    // All candidates are losers (long entered at 100, mark 80).
    let candidates = vec![snapshot(1, 1, 100, 1_000), snapshot(2, 1, 100, 1_000)];
    let report = execute_adl(&candidates, MarkPrice(80), 500);
    assert!(report.records.is_empty());
    assert_eq!(report.deficit_remaining, 500);
}

#[test]
fn adl_single_winner_fully_absorbs_small_deficit() {
    // One profitable long with PnL = 100, deficit = 30.
    // haircut = min(30, 100) = 30; payout = 70.
    let candidates = vec![snapshot(1, 1, 100, 100)];
    let report = execute_adl(&candidates, MarkPrice(200), 30);
    assert_eq!(report.records.len(), 1);
    let rec = &report.records[0];
    assert_eq!(rec.pnl_gross, 100);
    assert_eq!(rec.haircut, 30);
    assert_eq!(rec.pnl_paid, 70);
    assert_eq!(report.deficit_absorbed, 30);
    assert_eq!(report.deficit_remaining, 0);
}
```

Each test maps 1:1 to a phase or boundary condition:

| Test | Phase exercised | What it proves |
|---|---|---|
| `adl_zero_deficit_is_noop` | Phase 1 (early-return) | Zero input → empty report, no candidates touched |
| `adl_negative_deficit_clamps_remaining_to_zero` | Phase 1 (negative clamp) | `deficit.max(0)` prevents negative leak |
| `adl_no_candidates_keeps_full_deficit` | Phase 2 (empty input) | Empty candidates → `filter_map` produces empty vec → loop runs zero times → `remaining` unchanged |
| `adl_no_profitable_keeps_full_deficit` | Phase 2 (all filtered) | All candidates return `None` → ranked is empty → loop runs zero times → `remaining` unchanged |
| `adl_single_winner_fully_absorbs_small_deficit` | Phase 4 (happy path) | Single iteration, haircut = min, decomposition holds |

Run them:

```bash
cargo test -p openhl-liquidation adl::tests::adl_
```

Expected: 5 new tests pass. With L1's 4 score-eligibility tests + 1 score-ordering test, that's 10 tests in `adl.rs` so far. The remaining 4 nuanced-absorption tests come in L3; the 5 invariant proptests come in L4.

## Cross-references

This `execute_adl` orchestration shares its structural shape with **openhl-liquidation L13's `scan`** — both are "for each candidate, decide what to do, accumulate results into a report" pipelines. The differences worth naming:

| | `scan` (L13 of openhl-liquidation) | `execute_adl` (L2 here) |
|---|---|---|
| Trigger | Every block (always runs) | Conditional (only when `unfilled_deficit > 0`) |
| Quota | None (processes every account) | Bounded by `deficit` (breaks early) |
| Filter | Margin classification (`MarginPhase`) | Eligibility via `adl_score` |
| Sort | None (insertion order) | By `(score desc, account_id asc)` |
| Per-account work | Build `LiquidationRecord` | Build `AdlRecord` with haircut decomposition |
| Output field for "could not fully resolve" | `unfilled_deficit` (consumed here) | `deficit_remaining` (consumed by bridge) |
| Conservation law | `sum(closed_pnls) - sum(deposits) = ...` (L13's per-scan) | `deficit_absorbed + deficit_remaining == input_deficit` (L4 proptest) |

The two functions are structurally siblings — same "for each candidate, decide, accumulate" pipeline — but with different filter predicates, different sort discipline, and different quota semantics. **Reading L13 once will make L2's structure click; reading L2 will make L13's `scan` read as "the same shape, different filter".**

## Q&A

**Q1: Why stable-sort (`sort_by`) instead of unstable-sort (`sort_unstable_by`)?**

Determinism. `sort_unstable_by` is faster and mostly in-place, but the *order of equal elements is unspecified*. In a single validator's process, that's fine. Across validators on different machines, even with the same input, different runtime ordering could produce different `AdlReport`s if scores happen to be equal. Stable `sort_by` preserves equal-element order (with `O(N log N)` worst-case time and temporary `O(N)` memory), which is exactly the trade-off we want here. **With 0..15 candidates, the memory cost is trivial; in consensus code, determinism wins.**

**Q2: Could we short-circuit Phase 2 (the `filter_map`) when we've collected enough candidates?**

In principle yes, but the `collect::<Vec<_>>()` consumes the entire iterator anyway, and we don't know "enough" before sorting (Phase 3 — a low-score candidate might rank ahead of a high-score one if we evaluated in input order). So Phase 2 has no short-circuit option; Phase 4 is the only one with `break`. **Short-circuit lives in the phase that has a quota; Phase 2 doesn't.**

**Q3: What if `deficit_absorbed` overflows i64 from haircut accumulation?**

It can't in practice. `deficit_absorbed` is bounded above by the input `deficit` (every haircut is `≤ remaining`, and `remaining` starts at `deficit`). Since `deficit` is i64 and `remaining.saturating_sub(haircut)` is monotonic decreasing, `deficit_absorbed` is bounded by `i64::MAX`. The `saturating_add` is defensive — if some upstream bug somehow violated the bounds, the saturation would clamp at `i64::MAX` instead of panicking. **Saturating ops as a hedge against upstream bugs you haven't found yet.**

**Q4: Why is the tiebreaker `account_id ascending` instead of `descending`?**

Pure convention. Ascending is the default sort direction in most languages, so "ascending account_id" reads as the "null" tiebreaker — the one you reach for when you don't have a strong reason. Hyperliquid's documentation doesn't specify; OpenHL chose ascending. Two validators running this code on the same input will agree; that's the only contract. **The tiebreaker direction is arbitrary; only its existence and determinism matter.**

**Q5: Could two records in the report have equal `pnl_gross`?**

Yes — two winners might have identical PnL despite different scores (e.g., same PnL but different leverage). The decomposition `pnl_paid + haircut == pnl_gross` still holds per-record, and the sum of all haircuts still equals `deficit_absorbed`. The records' `pnl_gross` values don't have to be unique. **Records are not deduplicated; account_id is the unique key, not pnl_gross.**

**Q6: What does the bridge actually *do* with each `AdlRecord`?**

For each record: (a) credit the trader's collateral by `pnl_paid` (the haircut-adjusted payout); (b) set their position size to zero (force-close); (c) remove the account from the active-positions set. The `close_order` field on the record is *not* submitted to the CLOB — it exists for telemetry and for shape-parity with `LiquidationRecord` (so the bridge can use the same record-handling code for both layers). **ADL is bookkeeping mutation, not orderbook execution. The `close_order` is a comment, not a command.**

## Next lesson (L3) — 6 nuanced absorption tests

L3 adds the 6 unit tests that exercise the nuanced absorption paths `execute_adl` can take:
- `adl_single_winner_partial_haircut_at_full_pnl` — haircut == pnl_gross → pnl_paid = 0
- `adl_single_winner_exhausted_with_remaining_deficit` — pnl_gross < deficit, single haircut, remainder propagates
- `adl_multiple_winners_in_score_order` — rank order proven against multiple inputs
- `adl_drains_first_winner_then_partially_second` — quota exhausts winner 1 fully, partial on winner 2
- `adl_tiebreaker_by_account_id_ascending` — equal scores resolve deterministically by account_id
- `adl_does_not_touch_losers_or_flats` — eligibility filter is honored even in mixed populations

After L3, the unit-test matrix is complete (16 tests across L1+L2+L3). L4 adds 5 proptest invariants and the Stage 10 quartet retrospective — closing the course at 5 lessons / 4 modules / SHA-pinned to `d66b44a`.

````

---

## Seed-file slot

L2 lands in Module 1 at sortOrder 1 (Module 1 is "ADL implementation"; L1 is sortOrder 0, L2 is sortOrder 1):

```typescript
{
  title: 'Lesson 2 — execute_adl — the 5-phase orchestration heart',
  slug: 'openhl-adl-execute-en',
  type: 'CONTENT',
  sortOrder: 1,
  duration: 40,
  xpReward: 70,
  content: `# Lesson 2 — execute_adl — the 5-phase orchestration heart\n\n...`
},
```

## Drafting self-review (before paste)

- **L2 is the load-bearing implementation lesson** (40 min / 70 XP — bigger than L1's 35/60 because there's a whole pipeline to walk through with 5 phases × ~5 things-to-notice each). The 5 unit tests are the "you can run this and see it work" payoff.
- **The 5-phase structure is the pedagogical scaffolding.** Each phase has its own code block + things-to-notice list, so readers can skim by phase. Phase 1 (defensive) and Phase 5 (finalize) are short; Phase 2 (filter_map), Phase 3 (sort_by), Phase 4 (haircut loop) are the meat.
- **The Predict callout sets up the structural comparison with L13's `scan`.** "quota-bounded loops have `break`" is the takeaway — it primes the cross-reference table later in the lesson.
- **The cross-reference table to L13's `scan`** is the load-bearing pedagogical move. Same shape, different filter/sort/quota. Readers who finished openhl-liquidation L13 will see `execute_adl` as "the sibling function with one structural twist."
- **Q1 (stable vs unstable sort) is the consensus-code lesson.** Q3 (overflow) is the "saturating ops as hedge" framing. Q6 (bridge applies as bookkeeping mutation, NOT CLOB) is the L0 callback — restates the "ADL bypasses the orderbook" architectural decision in operational terms.
- **No Mermaid in L2.** The cross-reference table to L13 + the test-to-phase mapping table are the structured visuals. A Mermaid flow would duplicate what the 5-phase headings already convey.
- **Length: ~480 lines** — bigger than L1 (~350 expected) because L2 walks 5 phases × ~5 notice-points each plus 5 tests. Reasonable for the lesson's role.
