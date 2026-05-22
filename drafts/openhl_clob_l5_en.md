# Building OpenHL CLOB — L5 draft (EN) — build-along

> Drafted against openhl SHA `55a9dff` (Stage 8a — CLOB pure state machine).
> Course: `building-openhl-clob-en` (track: `reth-l1-architect`).

---

## L5 — `openhl-clob-submit-market-en`

- **Module:** 2 (Matching engine), sortOrder 2 within module
- **Course-level sortOrder:** 4 (lesson 5 of 12)
- **Duration:** 25 min
- **XP reward:** 60
- **Type:** CONTENT

### Content

````markdown
# Lesson 5 — `submit_market` — orders that take any price

## Goal

Concepts you'll grasp in this lesson:

- **Market = Limit minus the price check minus the rest step** — same walk-while-crossing loop from L4, but without the `price <= limit` guard and without `rest_unfilled_remainder()`. The semantic difference is in the *missing* code, which is why parameterizing the two with boolean flags would make both bodies harder to read.
- **Fill price is always the maker's price** — Market orders don't supply a price; they accept what the book offers. "Price discovery" *is* the rule that the spread between best bid and best ask sets the price, not the taker's demand.
- **One return type, two contracts** — `FillResult::remaining_qty` means "rested" for Limit (always `Qty(0)`) and "discarded" for Market (the actual leftover). The type is identical; the doc on `FillResult` names both interpretations.
- **"Nothing happened" is a valid result, not an error** — Market buy against an empty asks book returns `FillResult { fills: vec![], remaining_qty: order.qty }`. The caller decides what to do with the leftover; the engine doesn't surface a `Result`.
- **Same `match_at_level` helper, reused unchanged** — L4's helper handles "maker partially filled" and "maker fully consumed" as one general path; L5 needed no fast paths, no special cases.

Verification:

```bash
cargo check -p openhl-clob
```

…still compiles, and the `submit()` dispatcher no longer panics on Market orders.

Specific changes:

- **`submit_market()`** — the Market-order matcher. Structurally similar to `submit_limit` from L4, but with **two key differences**:
  1. **No price check** — Market orders take whatever's available at any price.
  2. **No rest-the-remainder** — Market orders discard unmatched quantity; the leftover comes back in `FillResult::remaining_qty`.
- **Updated `submit()` dispatcher** — replace L4's `todo!("Market orders land in L5")` with `self.submit_market(order)`.

After L5 the matching engine is **complete**. Both Limit and Market orders produce real fills. L6 adds `cancel`; L7-L8 add the test suite that proves the engine's invariants hold.

## Recap

After L4, `book.rs` has:

```rust
pub fn submit(&mut self, order: Order) -> FillResult {
    match order.order_type {
        OrderType::Limit { price } => self.submit_limit(order, price),
        OrderType::Market => todo!("Market orders land in L5"),
    }
}

fn submit_limit(&mut self, order: Order, limit_price: Price) -> FillResult {
    // ~60 lines: walk opposite side, match at-or-better, rest remainder
}

fn match_at_level(taker: &Order, price: Price, ...) -> Fill { ... }
```

If you call `book.submit(market_order)`, it panics with `todo!`. L5 fixes that.

## Plan

Two changes, both in `crates/clob/src/book.rs`:

1. **Add `submit_market()`** below `submit_limit()`. Two branches (Buy/Sell), each a loop almost identical to `submit_limit`'s loop — but **without** the limit-price comparison.
2. **Edit `submit()`** to dispatch to `submit_market` instead of panicking.

No new types, no new helpers. We reuse `match_at_level` from L4 unchanged.

The lesson is short because **L5 is what's left over after L4 did most of the work**. The structural pattern is the same; the differences are what makes "market order" different from "limit order" semantically.

> 🛑 **Predict.** Before scrolling: suppose the asks are `{ Price(100): [O_a (30 units)] }` and a Market buy for 50 units arrives. What's the fill, and what's in `FillResult::remaining_qty`? Now contrast: the same starting book, but a Limit buy at price 100 for 50 units. **Where does the leftover 20 units go in each case?**

(Answer: Market case → fill `[30 @ 100]`, `remaining_qty = 20` (the unfilled portion is discarded — the caller sees it but it's not on the book). Limit case → fill `[30 @ 100]`, `remaining_qty = 0` (the 20 units rest on the book as a new bid at 100). **Same fill, different fate for the leftover.**)

Laid out as board state transitions:

```
START — asks: {100: [O_a(30)]}, bids: empty
        taker: Buy qty=50

   MARKET case (discard leftover)         LIMIT @ 100 case (rest leftover)
   ────────────────────────────           ──────────────────────────────
   walk asks (no price guard)              walk asks while ask_price ≤ 100
     100: consume O_a fully → Fill(30)       100: consume O_a fully → Fill(30)
     asks empty, remaining = 20              asks empty, remaining = 20
   leftover handling:                       leftover handling:
     DISCARD (not added to book)             REST as new bid @ 100

   AFTER:                                  AFTER:
     asks: empty                             asks: empty
     bids: empty   ← 20 vanished            bids: {100: [new(20)]}   ← 20 rests

   returned:                               returned:
     FillResult {                            FillResult {
       fills: [F1],                            fills: [F1],
       remaining_qty: Qty(20)  ← caller       remaining_qty: Qty(0)  ← rested
     }                                       }
```

Same matching loop, same fill. The only difference is the one step *after* the loop — Market just carries the remaining qty into `remaining_qty` and never touches the book; Limit inserts the remainder as a new resting order. In code, the difference is the **presence or absence of the rest-the-remainder block**.

## Walk-through

### Step 1: Add `submit_market()` to `impl Book`

In `crates/clob/src/book.rs`, inside the existing `impl Book { ... }` block (right after `submit_limit`), add:

```rust
    fn submit_market(&mut self, order: Order) -> FillResult {
        let mut remaining = order.qty;
        let mut fills = Vec::new();

        match order.side {
            Side::Buy => loop {
                if remaining.0 == 0 {
                    break;
                }
                let Some(best_price) = self.asks.keys().next().copied() else {
                    break;
                };
                let queue = self
                    .asks
                    .get_mut(&best_price)
                    .expect("price level exists by construction");
                fills.push(match_at_level(&order, best_price, queue, &mut remaining));
                if queue.is_empty() {
                    self.asks.remove(&best_price);
                }
            },
            Side::Sell => loop {
                if remaining.0 == 0 {
                    break;
                }
                let Some(best_rev) = self.bids.keys().next().copied() else {
                    break;
                };
                let queue = self
                    .bids
                    .get_mut(&best_rev)
                    .expect("price level exists by construction");
                fills.push(match_at_level(&order, best_rev.0, queue, &mut remaining));
                if queue.is_empty() {
                    self.bids.remove(&best_rev);
                }
            },
        }

        FillResult {
            fills,
            remaining_qty: remaining,
        }
    }
```

Compare side-by-side with `submit_limit`. The differences:

| What | `submit_limit` | `submit_market` |
| - | - | - |
| Price check inside loop | `if best_price > limit_price { break }` (Buy) | **None** — takes any price |
| Price check inside loop | `if best_price < limit_price { break }` (Sell) | **None** — takes any price |
| Rest-the-remainder after loop | `if remaining.0 > 0 { ... push_back(resting) ... }` | **None** — leftover is discarded |
| `remaining_qty` in return | Always `Qty(0)` (rested or fully filled) | `remaining` (whatever's left over after matching) |

That's the entire delta. **Same loop shape, two checks removed, one return value changed.**

> 🛑 **Anti-fluency.** "Couldn't I just call `submit_limit` with `limit_price = Price(u64::MAX)` for Market Buy and `Price(0)` for Market Sell?" **It works for the price-check elimination, but it doesn't eliminate the rest-the-remainder logic.** A Market order with `u64::MAX` limit would still try to rest unfilled qty at `u64::MAX` — creating a phantom resting bid at the highest possible price. The behavior would be wrong: a Market buy that doesn't fully fill would put a `u64::MAX`-priced bid on the book, which would then immediately match any incoming sell. **Two functions, two semantics, kept separate.**

### Step 2: Update `submit()` dispatcher

Find the dispatcher you wrote in L4:

```rust
pub fn submit(&mut self, order: Order) -> FillResult {
    match order.order_type {
        OrderType::Limit { price } => self.submit_limit(order, price),
        OrderType::Market => todo!("Market orders land in L5"),
    }
}
```

Replace the `todo!` with a real call:

```rust
pub fn submit(&mut self, order: Order) -> FillResult {
    match order.order_type {
        OrderType::Limit { price } => self.submit_limit(order, price),
        OrderType::Market => self.submit_market(order),
    }
}
```

One line changed. The dispatcher's role hasn't expanded — it's still "type-driven routing, one line per arm." The implementations live in the dedicated methods.

## Test

```bash
cargo check -p openhl-clob
```

Clean. No warnings about unused functions (every function declared in `book.rs` now has at least one caller — `submit_market` is called by `submit`, the `submit_*` private methods are called from inside `Book`, `match_at_level` is called by both submits).

Smoke test (delete after, as in L4):

```rust
#[cfg(test)]
mod smoke {
    use super::*;

    #[test]
    fn market_buy_takes_what_it_can_then_discards() {
        let mut book = Book::new();
        // Place a single resting sell at 100 for 30 units.
        book.submit(Order {
            id: OrderId(1),
            account: AccountId(1),
            side: Side::Sell,
            qty: Qty(30),
            order_type: OrderType::Limit { price: Price(100) },
        });
        // Market buy for 50 — should match 30 at 100, leave 20 unfilled.
        let result = book.submit(Order {
            id: OrderId(2),
            account: AccountId(2),
            side: Side::Buy,
            qty: Qty(50),
            order_type: OrderType::Market,
        });
        assert_eq!(result.fills.len(), 1);
        assert_eq!(result.fills[0].qty, Qty(30));
        assert_eq!(result.fills[0].price, Price(100));
        // The 20 unfilled units are DISCARDED, not rested.
        assert_eq!(result.remaining_qty, Qty(20));
        assert_eq!(book.best_bid(), None); // no resting bid created
        assert_eq!(book.best_ask(), None); // ask was consumed
    }

    #[test]
    fn market_buy_against_empty_book_returns_full_remainder() {
        let mut book = Book::new();
        let result = book.submit(Order {
            id: OrderId(1),
            account: AccountId(1),
            side: Side::Buy,
            qty: Qty(50),
            order_type: OrderType::Market,
        });
        assert_eq!(result.fills.len(), 0);
        assert_eq!(result.remaining_qty, Qty(50));
        assert_eq!(book.best_bid(), None);
        assert_eq!(book.best_ask(), None);
    }
}
```

Run with `cargo test -p openhl-clob smoke`. Both should pass. **Then delete the smoke module** — L7-L8 has the real test suite.

The contrast between the two smoke tests is the L5 lesson in miniature: **whatever's left over after matching is discarded**, regardless of whether the matching engine produced any fills or not. The book state after a Market order is exactly the book state minus the consumed liquidity — no resting orders added.

Common errors and fixes:

- **Smoke test reports `result.remaining_qty == Qty(0)` instead of `Qty(20)`** — your `submit_market`'s final `FillResult` has `remaining_qty: Qty(0)` (probably copy-pasted from `submit_limit`). It should be `remaining_qty: remaining` — the actual leftover quantity.
- **`book.best_bid()` returns `Some(price)` after Market Buy** — your `submit_market` is hitting `submit_limit`'s rest-the-remainder branch. That's because the loop fell through into shared code. Check that `submit_market` is its own function with its own final `FillResult` — no shared "rest" logic.
- **`error: cannot find function 'submit_market' in '&mut Book'`** — typo in `submit()` dispatcher. The method should be `self.submit_market(order)`, called against `self`.
- **`warning: unused variable: remaining`** in a wrong path — you might have written `let remaining_qty = ...` instead of `remaining: remaining,` in the FillResult. The field name is `remaining_qty`, the local variable is `remaining` (`FillResult { fills, remaining_qty: remaining }`).

## Design reflection

Three load-bearing decisions encoded here:

1. **`submit_limit` and `submit_market` are separate functions, not parameterized.** Even though the loops are 80% identical, the semantic difference (does the leftover rest or get discarded?) is in the *missing* code, not the code that's there. Parameterizing would require boolean flags like `rest_remainder: bool` and `enforce_price: bool` — turning the function bodies into branchy puzzles. **The clear separation makes the two semantics easy to read independently.**

2. **`FillResult::remaining_qty` carries different meaning across order types.** For Limit, it's always `Qty(0)` (rested or fully matched). For Market, it's the actual unfilled remainder. **The type is the same; the contract differs.** This is OK because the field doc on `FillResult` (L2) explicitly names both interpretations.

3. **Empty-book Market orders return cleanly, not via error.** A Market buy against an empty asks book returns `FillResult { fills: vec![], remaining_qty: order.qty }`. No error. This is the right default: the caller asked us to match, we matched as much as we could (zero), and we reported the leftover. **"No liquidity available" isn't a runtime error (`Result::Err`) — it's a valid "zero-fill state transition."** This matters especially in a consensus chain: making `submit_market` return `Result` forces every caller (EVM precompiles, the bridge, the upper transaction execution layer) to branch between "empty book" and "other errors," complicating gas accounting and state rollback. Keeping the function total (always returns a `FillResult`, for any input) means the upper layer only has to check "is `fills` empty?" once — purely functional, predictable. **Total + side-effect-free is the consensus state-machine discipline.**

## Answer key

```bash
cd ~/code/openhl-reference
git checkout 55a9dff
diff -u ~/code/my-openhl/crates/clob/src/book.rs ./crates/clob/src/book.rs
```

After L5, your `book.rs` is approximately **the first ~190 lines** of the reference. The remaining ~25 lines are `cancel()` (L6) and module exports.

Return:

```bash
git checkout main
```

## Common questions

**Q: What's the use case for an empty-book Market order to return cleanly instead of erroring?**
Production matching engines see this often: a thin market opens, the orderbook is empty briefly between fills, and a Market order arrives. The right behavior is "produce zero fills, report full remainder, let the caller decide what to do." The caller might retry later, switch to a Limit order, or surface an error to the user — but the matching engine itself doesn't decide.

**Q: Why is the maker's resting price used, even though Market doesn't have its own price?**
The fill price is always the *resting* order's price (the maker's). Market orders don't supply a price; they accept whatever the book offers. **The "price discovery" is what makes a market a market** — the buyer doesn't dictate price; the spread between best bid and best ask does.

**Q: Could a Market order produce a Fill with zero quantity?**
No. `match_at_level` computes `fill_qty = min(maker.qty, remaining)`. For this to be zero, either `maker.qty` or `remaining` would have to be zero. Both invariants are maintained: `submit_market` breaks out of the loop the moment `remaining == 0`, and a maker queue never has a zero-qty resting order (the matching code shrinks qty and pops the maker when it hits zero). So `match_at_level` is never called with either being zero.

**Q: What about partial fills against multiple price levels?**
Market orders handle this naturally. A 100-unit Market buy facing asks `{99: [30 units], 100: [30 units], 101: [50 units]}` produces three fills (30 @ 99, 30 @ 100, 40 @ 101). Each iteration of the loop calls `match_at_level` against the front of the next-best level; the loop continues until `remaining == 0` or the book runs out. **The walk-multiple-levels behavior is the same as for crossing Limit orders.**

## Next lesson (L6)

The matching engine handles **submit**. It can't handle **cancel** yet — a user who wants to remove their resting order before it gets filled has no way to do so. L6 adds `cancel(order_id) -> bool`:

- Linear scan through both bids and asks until the order is found.
- O(n) for now, where n is total resting orders. We'll address whether to add an O(1) index in a later openhl stage.
- Critically: drops the price level if cancellation leaves it empty (the same invariant `submit` maintains via `if queue.is_empty() { self.asks.remove(...) }`).
````

---

## Seed-file slot

L5 lands in Module 2 (Matching engine) at sortOrder 2:

```typescript
{
  title: 'Lesson 5 — submit_market — orders that take any price',
  slug: 'openhl-clob-submit-market-en',
  type: 'CONTENT',
  sortOrder: 2,
  duration: 25,
  xpReward: 60,
  content: `# Lesson 5 — \`submit_market\` — orders that take any price\n\n...`
},
```

## SHA pinning discipline

Same as L1-L4 — `55a9dff` (Stage 8a). After L5, the reader's `book.rs` is approximately the first ~190 lines of the reference (matching engine complete, only `cancel()` remains for L6).

## Style review notes (self-critique before paste)

- **§Plan's table comparing submit_limit and submit_market** lays out the delta in 4 rows. Reader can scan and see the structural similarity vs. the semantic differences.
- **§Predict's two-scenario contrast** (Market vs Limit, same starting book) is the load-bearing teaching moment for the lesson. It earns the "remaining_qty has different contracts" callout.
- **§Step 1's "same loop shape, two checks removed, one return value changed"** is the one-sentence summary of L5. Worth repeating.
- **§Anti-fluency on the parameterized version** anticipates the natural urge to deduplicate. Specifically names what would break (phantom `u64::MAX` resting bid).
- **Two smoke tests** illustrate Market in two states: against a partially-filling book and against an empty book. Both are common production cases.
- **§Common questions on partial-fill against multiple levels** preempts the "what about more than one level?" question without making it part of the main walk-through (which would have bloated L5).
