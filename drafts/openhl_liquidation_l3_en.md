# Building OpenHL Liquidation — L3 draft (EN) — build-along

> openhl SHA `22eedf9` (Stage 10a — liquidation margin math).

## L3 — `openhl-liquidation-snapshot-spec-en`

**Stage**: Stage 10a — `22eedf9`

**Title**: Lesson 3 — `AccountSnapshot` + `CloseOrderSpec` — the engine's input and output types

**Duration**: 25 min · **XP**: 50

---

````markdown
# Lesson 3 — `AccountSnapshot` + `CloseOrderSpec` — the engine's input and output types

## Goal

Concepts you'll grasp in this lesson:

- **Why liquidation defines its own `AccountSnapshot` instead of reusing `funding::Position`** — `Position` carries `(account, size)`; liquidation needs `(account, size, avg_entry, collateral)`. Two crates, two snapshot types, no cross-coupling. The bridge layer assembles each from its own ledger.
- **The "snapshot" discipline shared with funding** — the engine consumes a snapshot the caller built; it never owns mutable account state. Same I/O-free purity that lets the proptest catch determinism bugs.
- **Why `CloseOrderSpec` carries no price field** — liquidation always closes at market. The engine doesn't pick prices; the bridge encodes this as `clob::Action::SubmitMarket` and the book settles at whatever the next available price is.
- **Why `Side` and `Qty` come from `openhl_clob`, not a new liquidation-local type** — they're the same concepts the matching engine speaks. Two parallel `Side` enums in two crates would be a translation surface waiting to drift.

Verification:

```bash
cargo build -p openhl-liquidation
```

…compiles. After this lesson, the `types` module is complete.

Specific changes:

- **`src/types.rs`** — appends `AccountSnapshot` and `CloseOrderSpec` structs below the existing `MarginHealth` enum. No changes to anything from L1 or L2.
- **`src/lib.rs`** — adds `AccountSnapshot` and `CloseOrderSpec` to the `pub use types::{...}` re-export.

L3 still has no tests — both new structs are passive data containers. L4 begins the `compute` module and earns the first behavior test (`notional_value`).

## Recap

After L2:
- `types.rs` has `MARGIN_SCALE` + `LiquidationParams` (L1) + `MarginRatio` + `MarginHealth` (L2).
- `lib.rs` re-exports four names: `LiquidationParams`, `MarginHealth`, `MarginRatio`, `MARGIN_SCALE`.
- `cargo build -p openhl-liquidation` passes with zero warnings.

L3 adds the two **I/O types**: the input every margin function consumes (`AccountSnapshot`) and the output the engine hands the bridge (`CloseOrderSpec`). After L3, the types module is finished — Module 1 of Course 10 is closed.

## Plan

Two edits, both append-only:

1. **Append `AccountSnapshot` to `crates/liquidation/src/types.rs`** — 4 fields, `Copy`-friendly, doc comment that names the caller's responsibility for maintaining `avg_entry` across fills.
2. **Append `CloseOrderSpec`** below that — 3 fields, no price, doc comment that names the bridge as the consumer.
3. **Update `crates/liquidation/src/lib.rs`** — extend the `pub use types::{...}` line.

> 🛑 **Predict.** Before scrolling: liquidation needs to compute unrealized PnL per account. That formula is `(mark - entry) * size`. **Which inputs does `funding::Position` *not* give you, and why didn't funding need them?** Hint: funding's formula is `size * mark * rate` — see what's missing.

(Answer: **`avg_entry` (to compute the PnL leg) and `collateral` (to compute equity).** Funding's formula has no `entry` factor — it scales by the current mark times the rate, regardless of where the position was opened. Funding also doesn't read collateral; the settlement deltas it emits get applied to balances at the bridge layer, which keeps its own balance ledger. Liquidation's job is to *measure* whether collateral + unrealized PnL has fallen below the threshold, so it needs both. Different jobs, different snapshots.)

Drawing what the `types` module — completed in L3 — receives as input and produces as output makes the joint between Module 1 (types) and Module 2 (pure compute) immediately legible:

```
                    [ Upstream: bridge / clearing layer (the ledger owner) ]
                              │
                              │ builds a snapshot per account, per tick,
                              │ pulled from its own ledger
                              ▼
   ┌────────────────────────────────────────────────────────────────────┐
   │ Input: AccountSnapshot { account, position_size, avg_entry,         │
   │                          collateral }                               │
   │   ※ Immutable, read-only, Copy. Finalized in L3.                    │
   └────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
   ┌────────────────────────────────────────────────────────────────────┐
   │ ★ The liquidation engine (everything Module 2-4 builds)             │
   │                                                                     │
   │   L4: notional_value / unrealized_pnl   (pure compute)               │
   │   L5: account_equity / margin_ratio     (pure compute)               │
   │   L6: margin_health                      (classification: 4-state)   │
   │   L7: close_order_spec                   (Liquidatable / Underwater) │
   │   ↑↑ The constants and types from L1-L2 (MARGIN_SCALE,              │
   │      LiquidationParams, MarginRatio, MarginHealth) flow through      │
   │      every layer.                                                    │
   └────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
   ┌────────────────────────────────────────────────────────────────────┐
   │ Output: CloseOrderSpec { account, side, qty }                       │
   │   ※ No price (market order). Only emitted for Liquidatable /        │
   │     Underwater accounts. Finalized in L3.                            │
   │   Module 3-4 emits InsuranceFundDelta alongside.                     │
   └────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    [ Downstream: bridge → matching engine (CLOB) ]
                              ・convert close orders into `SubmitMarket` actions
                              ・credit/debit the insurance fund on Underwater paths
```

Two things this picture pins down: (a) **The two types finalized in L3 — `AccountSnapshot` (input) and `CloseOrderSpec` (output) — are the engine's only contact surface with the outside world.** All the engine body lives in L4 onward, but every function signature lands on "consume an `AccountSnapshot`" or "emit a `CloseOrderSpec`." (b) **Both the input (snapshot) and the output (spec) are immutable** — the engine never mutates the ledger; full ownership of the ledger stays on the bridge side. This is the concrete shape of what L0 previewed as "**a read-only snapshot type that keeps the risk-calculation core decoupled from upstream state.**"

## Walk-through

### Step 1: Append `AccountSnapshot` to `src/types.rs`

Open `crates/liquidation/src/types.rs`. After the closing `}` of the `MarginHealth` enum, append:

```rust
/// Snapshot of one account's perpetual-market state, assembled by the
/// bridge layer before invoking the liquidation engine. Same "snapshot"
/// model as `openhl_funding::Position`: the engine treats this as a
/// per-tick read-only view, never mutates it.
///
/// `avg_entry` is the volume-weighted average price at which the account
/// opened its current net position. The owning layer (vault / clearing)
/// is responsible for maintaining this across fills.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct AccountSnapshot {
    pub account: AccountId,
    pub position_size: PositionSize,
    pub avg_entry: MarkPrice,
    pub collateral: Notional,
}
```

Things to notice about this 10-line block:

1. **Four fields, all `Copy`.** `AccountId` (`u64`), `PositionSize` (`i64`), `MarkPrice` (`u64`), `Notional` (`i64`). Total stack size: 32 bytes. The engine passes snapshots by reference (`&AccountSnapshot`) in most calls but the `Copy` derive means a caller that accidentally drops a `&` reference doesn't get a borrow-checker fight.

2. **`avg_entry: MarkPrice`, not a new `EntryPrice` type.** The price at which a position was opened lives in the same unit-of-account as the mark price the position is currently measured against. Defining a separate `EntryPrice` newtype would force conversions at every PnL computation site for no semantic gain. **When two fields measure the same physical thing, share the type.**

3. **`collateral: Notional` — signed.** Collateral is *deposited* funds, conventionally non-negative, but the type is `Notional` (signed) because `account_equity = collateral + unrealized_pnl` needs to flow as a signed sum. Making `collateral` unsigned would force an `as i64` cast in every equity computation. **Convert at the boundary, keep the math in one signed type — that way, silent runtime bugs caused by missed casts or mixing signed and unsigned (underflows, an `as` cast that flips the top bit, a subtraction that should have produced a negative number turning into a large positive one) get eliminated at the compile-level as type mismatches.** L4's sign trick — computing `(mark − entry) × size` branchlessly for all four quadrants — only works because every step on that path is uniformly signed.

4. **`pub` fields, no constructor function.** Same convention as `LiquidationParams` from L1: transparent struct, no encapsulation invariant. The bridge layer builds `AccountSnapshot { account: …, position_size: …, … }` directly. There's no `AccountSnapshot::new()` because there's nothing for a constructor to enforce.

5. **Doc comment names the caller's contract.** "*The owning layer (vault / clearing) is responsible for maintaining this across fills.*" That single sentence is the entire `avg_entry` invariant: liquidation doesn't track fills, doesn't recompute entry, doesn't reconcile partial closes. Those responsibilities live one layer up. **The crate doc says what *this* crate guarantees; what it requires from the caller goes in the type's doc comment.**

> 🛑 **Anti-fluency.** "Why not put `AccountSnapshot` in `openhl-funding` so both crates can use the same type?" **Because funding doesn't need `avg_entry` or `collateral` — adding them to `funding::Position` would bloat the funding snapshot for no benefit, and bridge would have to populate fields funding ignores.** Two crates, two snapshot types is the right shape. The bridge holds the canonical account ledger; producing two different snapshot views per tick is cheap.

### Step 2: Append `CloseOrderSpec` to `src/types.rs`

Continue in `src/types.rs`. After the closing `}` of `AccountSnapshot`, append:

```rust
/// Specification for a single liquidation close order, generated by the
/// engine and consumed by the bridge layer. The bridge encodes this as
/// `openhl_clob::Action::SubmitMarket` and routes it through the matching
/// engine.
///
/// Always a market order — liquidation accepts any available price.
/// Always the opposite side of the position: a long position closes via
/// `Side::Sell`, a short via `Side::Buy`. Quantity is the absolute value
/// of the position size.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct CloseOrderSpec {
    pub account: AccountId,
    pub side: Side,
    pub qty: Qty,
}
```

Three things to notice:

1. **No `price` field.** Liquidation never picks a price; the engine produces a market order spec and the matching engine fills it at whatever depth exists in the book. Stage 10c will iterate `AccountSnapshot` slices and emit one `CloseOrderSpec` per `Liquidatable` or `Underwater` account; none of them will carry a limit.

2. **`side: Side` reuses `openhl_clob::Side`.** The matching engine speaks in `Side::{Buy, Sell}`. If we defined a new `liquidation::Side` enum and converted at the bridge, we'd be **introducing an unnecessary translation layer (an `impl From` and its inverse) that becomes a source of future type drift** — someone adds a third variant (`Closing`, say) to one crate but not the other, or quietly inverts the `Buy ↔ Sell` mapping in one spot. **One enum, one source of truth.** Vocabulary that crosses crate boundaries (`Side`, `Qty`) should be shared across the boundary so you don't end up paying a permanent type-conversion cost (an "adjustment tax") forever.

3. **`qty: Qty` reuses `openhl_clob::Qty(u64)`.** The doc comment says "absolute value of the position size" — `PositionSize` is `i64` (signed) but the close quantity is always positive. The conversion (`Qty(position_size.0.unsigned_abs())`) happens in `compute::close_order_spec` at L7; here we just commit to the *output type* being unsigned.

> 🛑 **Predict.** Before scrolling: `CloseOrderSpec` doesn't carry a `Reason` field saying *why* the close happened (Liquidatable vs Underwater). Should it? Hint: think about who consumes the spec and what information they need.

(Answer: **No.** The bridge consumes the spec and needs to do two things: submit the close order, and (for Underwater accounts) credit the insurance fund. The engine signals both — Stage 10c's scanner emits the `CloseOrderSpec` *plus* an `InsuranceFundDelta` for accounts that were Underwater. Adding a `Reason` field to the close spec would duplicate signal between the spec and the insurance-fund delta, and a future refactor could let them drift apart. **Don't encode the same fact in two places — let the upstream output be the source of truth, and let downstream consumers carry only what they need.**)

### Step 3: Update `src/lib.rs`

Open `crates/liquidation/src/lib.rs`. Extend the `pub use types::{...}` line. Was:

```rust
pub use types::{LiquidationParams, MarginHealth, MarginRatio, MARGIN_SCALE};
```

Becomes:

```rust
pub use types::{
    AccountSnapshot, CloseOrderSpec, LiquidationParams, MarginHealth, MarginRatio, MARGIN_SCALE,
};
```

Two new names added — `AccountSnapshot` and `CloseOrderSpec` — alphabetically inserted (so `AccountSnapshot` lands at the start, `CloseOrderSpec` after it, and the rest follows in the same order). The line breaks across multiple lines once the list grows past ~5 items; rustfmt will reformat to a one-name-per-line block on the next save if you keep adding.

### Step 4: Compile

```bash
cargo build -p openhl-liquidation
```

Expected output:

```
   Compiling openhl-liquidation v0.1.0 (/Users/.../my-openhl/crates/liquidation)
    Finished `dev` profile [unoptimized + debuginfo] in 0.4s
```

Zero warnings, zero errors. The `types` module of the liquidation crate is now complete.

Common errors:

- **`error[E0432]: unresolved import 'openhl_clob::Qty'`** — the import line at the top of `types.rs` already names `Qty` (added back in L1's types.rs scaffold), so this fires only if you stripped imports. If it does, the L1-era top of the file should still read `use openhl_clob::{AccountId, Qty, Side};` and `use openhl_funding::{MarkPrice, Notional, PositionSize};` — the same imports cover both L2 and L3.
- **`error: cannot find type 'Notional'`** — same root cause; check the `use openhl_funding::{…}` line includes `Notional`.

## Design reflection

Three load-bearing decisions in this lesson:

1. **`AccountSnapshot` is liquidation-local, not a shared type in `openhl-funding`.** The two crates have different jobs — funding settles continuous rate-driven deltas, liquidation classifies discrete margin events — and forcing them to share a snapshot type would couple the bridge's data plumbing on both sides. **Two crates with related-but-different needs deserve two snapshot types.**

2. **`CloseOrderSpec` carries no price.** The engine's responsibility is to decide *whether* to close, not at *what* price. The bridge layer translates the spec into a market order and the matching engine takes whatever depth exists. **Mechanisms that pick prices belong below the policy layer that decides actions.**

3. **`Side` and `Qty` come from `openhl_clob`, not a parallel liquidation-local type.** When two crates exchange messages, they should speak in the same vocabulary types. Two `Side` enums means two `impl From` blocks at the boundary plus a coordination tax forever. **Share the boundary types; specialize the internal types.**

## Answer key

```bash
cd ~/code/openhl-reference
git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/src/types.rs ./crates/liquidation/src/types.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
```

After L3:
- **types.rs** matches **the full Stage 10a types.rs byte-for-byte**. Module 1 of Course 10 ships exactly this types module.
- **lib.rs** still misses `pub mod compute;` + the compute re-exports. Those land in L4–L7.

## Common questions

**Q1: Could `AccountSnapshot` be generic over a position-type trait so funding and liquidation share an abstract snapshot?**

Could, but premature. Both crates each fit on one page of fields they need; an abstract `Snapshot<P: PositionLike>` trait would add types-machinery the bridge doesn't need to manipulate. **A concrete type per crate, with the bridge translating, is cheaper to read and cheaper to refactor.**

**Q2: Why does `avg_entry` use `MarkPrice` instead of a dedicated `EntryPrice` newtype?**

Because the price at which a position was opened and the price the position is being measured against are in the same units — same scale, same source-of-truth (the matching engine's last fill price, conventionally). Defining `EntryPrice(u64)` parallel to `MarkPrice(u64)` would force conversions at every PnL site. **When two values share units, share the type.**

**Q3: Is `collateral` allowed to be negative?**

In the engine's eyes: no, the *deposited* collateral is always non-negative. But `Notional` is signed because (a) it's the type funding uses for settlement deltas, which *can* be negative, and (b) intermediate equity computations `collateral + unrealized_pnl` produce signed results. Making `collateral` itself unsigned would force casts at every equity site. **Signed arithmetic upstream, range-check at the boundary.**

**Q4: Should `CloseOrderSpec` carry a `bridge_metadata: Bytes` field for upstream context?**

No — Stage 10c will pass `CloseOrderSpec` directly to the bridge with no envelope. If you need to correlate a close back to its trigger (audit logs, telemetry), the bridge can do that with `(snapshot.account, current_block_height)` from outside the spec. **Don't let downstream features balloon the upstream type.**

**Q5: Why are both structs `Copy`?**

Cheap and convenient. `AccountSnapshot` is 32 bytes, `CloseOrderSpec` is 24 bytes — Copy is essentially free at these sizes. Without it, callers have to clone every time they want a second reference. **Make small Plain-Old-Data types `Copy`; reach for `Clone` only when ownership semantics actually matter.**

## Next lesson (L4)

L4 starts the `compute` module. The first two functions — `notional_value` and `unrealized_pnl` — earn the first behavior tests for the liquidation crate. You'll see the signed-multiplication trick that makes the same code path produce the right sign for both long and short positions, and the i128-intermediate discipline that keeps multiplications safe from i64 overflow at network-pathological inputs.

````

---

## Seed-file slot

L3 lands in Module 1 at sortOrder 2:

```typescript
{
  title: 'Lesson 3 — AccountSnapshot + CloseOrderSpec — the engine's input and output types',
  slug: 'openhl-liquidation-snapshot-spec-en',
  type: 'CONTENT',
  sortOrder: 2,
  duration: 25,
  xpReward: 50,
  content: `# Lesson 3 — AccountSnapshot + CloseOrderSpec — the engine's input and output types\n\n...`
},
```

## SHA pinning discipline

L3 cites `22eedf9` (Stage 10a). After L3 the types.rs answer-key diff is fully clean — Stage 10a's types module is exactly what L1+L2+L3 produced.

## Style review notes (self-critique before paste)

- **The "avg_entry and collateral, not in funding::Position" predict callout** anchors the lesson. Without it the reader takes the 4-field shape on faith; with it, the shape is derived from the difference between funding's job (settle rate × notional) and liquidation's job (classify equity / notional).
- **The "no Reason field" predict callout** preempts a real PR comment. Engineers reflexively add fields when they think downstream might want context; the lesson teaches the opposite — let the upstream output structure encode the case distinction (`InsuranceFundDelta` for Underwater accounts) and keep the close-order spec lean.
- **L3 is the lesson that closes the types module.** The reader has now seen every type the engine speaks in. L4 onward is computation over those types — the conceptual load shifts from "what shape" to "what behavior." Worth pointing out at the L3/L4 boundary so the reader feels the transition.
- **Three design hills across L1, L2, L3.** L1: `hyperliquid_default()` over `Default` impl. L2: no `PartialOrd` on `MarginHealth`. L3: own snapshot type, not shared with funding. Each lesson ends with a "the obvious Rust idiom isn't always right" reflection.
