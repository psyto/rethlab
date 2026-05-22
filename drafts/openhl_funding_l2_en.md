# Building OpenHL Funding — L2 draft (EN) — build-along

> Drafted against openhl SHA `cd94137` (Stage 8b — funding state machine).
> Course: `building-openhl-funding-en` (track: `reth-l1-architect`).

---

## L2 — `openhl-funding-money-types-en`

- **Module:** 1 (Determinism + types), sortOrder 1
- **Course-level sortOrder:** 2 (lesson 3 of 12)
- **Duration:** 30 min
- **XP reward:** 60
- **Type:** CONTENT

### Content

````markdown
# Lesson 2 — Money types — newtypes for prices, premiums, and notional

## Goal

Concepts you'll grasp in this lesson:

- **Newtype pattern as argument-order bug prevention** — wrapping `u64` in `MarkPrice` and `IndexPrice` makes `compute_premium(index, mark)` a compile error rather than a silently inverted premium in production.
- **Type aliases are not types** — `type MarkPrice = u64` is documentation, not safety; the compiler still accepts swapped args. Use `struct MarkPrice(pub u64)` when you need distinct identities.
- **Why the inner field is `pub`** — newtypes here exist to prevent cross-feeding, not to validate values. Public field keeps arithmetic ergonomic (`mark.0` over `mark.value()`); validation isn't this crate's job.
- **Signed vs unsigned by domain meaning** — `MarkPrice` / `IndexPrice` are `u64` (negative price = upstream invariant violation); `Premium` / `Notional` are `i64` (direction is part of the data).
- **Sign conventions belong in doc comments at the type definition** — "positive when mark > index, longs pay shorts" pinned at `Premium`'s definition is the single point of truth for every downstream consumer.

Verification:

```bash
cargo build -p openhl-funding
```

…still compiles.

Specific changes:

`types.rs` grows from `RATE_SCALE` alone to `RATE_SCALE` + four newtypes:

- **`MarkPrice(pub u64)`** — perpetual mark price in minor units. Unsigned because prices can't be negative.
- **`IndexPrice(pub u64)`** — off-chain oracle reference price. Same shape, different *meaning*.
- **`Premium(pub i64)`** — signed `(mark - index) / index`, scaled by `RATE_SCALE`. Positive when longs are overpaying.
- **`Notional(pub i64)`** — signed quote-currency delta. Positive = account receives, negative = pays.

Each is `Copy + Default + PartialEq + Eq + PartialOrd + Ord + Hash + Debug`. No tests yet — these types have no behavior beyond the wrapper. **L4's `compute_premium` is the first lesson where these types get exercised in code that can have bugs.**

The teaching point of this lesson isn't the math — it's the **newtype pattern**. Why wrap a `u64` instead of using `u64` directly? L2 is the answer to that question, demonstrated on 4 concrete types.

## Recap

After L1:
- `RATE_SCALE = 1_000_000_000` is the load-bearing constant.
- `types.rs` exists with module doc + `RATE_SCALE`.
- `lib.rs` re-exports `RATE_SCALE` at the crate root.

L2 fills `types.rs` with the first half of the actual types (the "money" half). L3 fills the second half (positions, settlement, params).

## Plan

Two edits:

1. **`crates/funding/src/types.rs`** — append 4 newtypes after `RATE_SCALE`. Doc comments explain each type's role + the invariant it encodes.
2. **`crates/funding/src/lib.rs`** — extend the `pub use types::{...}` line to re-export the 4 new types.

That's it. No `compute.rs`, no `clock.rs`, no tests. **Pure type definitions.**

> 🛑 **Predict.** Before scrolling: we're about to define `pub struct MarkPrice(pub u64);`. Why is the inner field `pub`? What if it were private with a `#[must_use] pub fn new(v: u64) -> Self` constructor? Hint: think about what callers in `compute.rs` will need.

(Answer: **Callers in `compute.rs` need to do arithmetic on the raw value** — `i128::from(mark.0) - i128::from(index.0)`. Making the field private + a `.value()` getter would require `mark.value()` instead of `mark.0` everywhere. **`pub` on the inner field is the openhl convention for newtypes that exist purely to prevent cross-feeding** — no validation, no invariants beyond the type system. Compare to `clob::Price(pub u64)` and `clob::Qty(pub u64)` — same shape, same reasoning. **The newtype's job is to make `compute_premium(index, mark)` a type error, not to validate the values.**)

## Walk-through

### Step 1: Append the 4 newtypes to `types.rs`

Open `crates/funding/src/types.rs`. After the existing `RATE_SCALE` constant, add:

```rust
/// Mark price in minor units. Same scale convention as `clob::Price`, but a
/// distinct type so callers can't accidentally feed an orderbook price into
/// the funding math where an index/oracle price is expected.
///
/// `MarkPrice` is a single u64 not a signed-fixed-point, because prices are
/// always positive (zero or negative price would be a system invariant
/// violation handled upstream, not here).
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct MarkPrice(pub u64);

/// Index price (off-chain oracle reference). Same scale as `MarkPrice`.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct IndexPrice(pub u64);

/// Premium = `(mark - index) / index`, scaled by [`RATE_SCALE`].
///
/// Sign convention: positive when mark > index (longs are overpaying,
/// funding will be positive → longs pay shorts).
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Premium(pub i64);

/// Signed quote-currency delta. Positive = account receives, negative =
/// account pays. Funding settlement produces one [`Notional`] per non-flat
/// position per tick.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Notional(pub i64);
```

Four types, each ~5 lines. Let me walk through what's encoded in each.

#### `MarkPrice(pub u64)` — and the case against signed prices

Why `u64`, not `i64`? Because a *negative price* doesn't have a meaning in the funding math. A spot or perp price below zero is a system invariant violation that should never reach the funding crate — and if it did, the right response is "the upstream layer is broken, halt and investigate," not "compute funding against a negative price."

The doc says it explicitly: *"zero or negative price would be a system invariant violation handled upstream, not here."* That's the right place to draw the line. **The funding crate trusts that its inputs are well-formed; it doesn't re-validate them.** Re-validation everywhere is a common over-engineering mistake; the funding crate's job is the math, not the input sanitization.

> 🛑 **Anti-fluency.** "Shouldn't we at least return an error on `MarkPrice(0)`?" **No.** `MarkPrice(0)` could mean "an asset that genuinely has zero spot price" (extreme tail, rare but real) or "the oracle hasn't delivered a price yet" (boot state). Compute_premium handles the second case explicitly (returns `Premium(0)` when `index == 0`). The first case is rare enough that the right action is to settle zero funding, which `compute_premium` produces naturally. **No error path needed.**

#### `IndexPrice(pub u64)` — same shape, different *meaning*

`IndexPrice` is structurally identical to `MarkPrice`. Same field, same derives, same range. **The difference is purely in the type system.** A function signature `compute_premium(mark: MarkPrice, index: IndexPrice) -> Premium` rejects `compute_premium(IndexPrice(100), MarkPrice(100))` at compile time. Without the newtypes, both arguments would be `u64`, and an argument-order bug would silently produce an inverted premium.

Side-by-side, the difference between raw `u64` and newtype is exactly the difference between "production bug" and "compile error":

```rust
// 🔴 With raw u64 — the signature is "two u64s in some order"
fn compute_premium(mark: u64, index: u64) -> i64 { /* ... */ }

let mark  = 100_u64;
let index = 105_u64;

compute_premium(mark, index);   // ✨ correct order
compute_premium(index, mark);   // 🔴 swapped: COMPILE OK
                                //    Premium's sign flips, ships to production
                                //    → every long pays when they should receive

// 🟢 With newtypes — the type system remembers the intent
fn compute_premium(mark: MarkPrice, index: IndexPrice) -> Premium { /* ... */ }

let mark  = MarkPrice(100);
let index = IndexPrice(105);

compute_premium(mark, index);   // ✨ OK
compute_premium(index, mark);   // ❌ COMPILE ERROR:
                                //    expected `MarkPrice`, found `IndexPrice`
                                //    ↑ caught at the keyboard
```

The difference isn't runtime behavior — it's whether the build passes. The `u64` version's bug isn't visible until production; the newtype version's bug is visible in the seconds between typing it and the next save. **This is the entire point of the newtype pattern.** It costs ~5 lines per type and prevents a class of bugs that *would otherwise be invisible until production*.

> 🛑 **Anti-fluency.** "Couldn't we use type aliases instead? `type MarkPrice = u64; type IndexPrice = u64;`" **No — type aliases don't create new types**, they just rename existing ones. `type MarkPrice = u64` and `type IndexPrice = u64` are both `u64`, and `compute_premium(some_index, some_mark)` would compile silently. **Type aliases are documentation, not safety.** Use them for long generic types where readability suffers (`type FillSink = Arc<Mutex<Vec<Fill>>>`) — not for distinguishing semantically different values.

#### `Premium(pub i64)` — and why it's signed

A premium can be negative when mark < index (shorts are overpaying). The signed representation lets the rest of the math flow without explicit sign handling: `compute_premium` returns a signed number, `compute_rate` divides + clamps it, `apply_funding` multiplies it into a settlement. **At no point does anyone need to check "which direction is this?"** — the sign carries the answer.

The doc says: *"Sign convention: positive when mark > index (longs are overpaying, funding will be positive → longs pay shorts)."* That's a load-bearing line. Anyone reading downstream code will need to remember this convention. **A doc comment that names the sign convention is what separates "correct math" from "math you have to re-derive every time."**

#### `Notional(pub i64)` — quote-currency delta, signed from the *account's* perspective

`Notional` represents the change to a single account's quote balance from a single settlement. Sign convention: *positive = account receives, negative = account pays.* So a long position with a positive funding rate produces `Notional(negative)`; a short position with a positive funding rate produces `Notional(positive)`.

**The sign is from the account's viewpoint**, not from the market's. This matters at the bridge integration layer (course 10) where a `Notional(-12)` becomes "subtract 12 from this account's quote balance." If the sign were market-centric, the bridge would need to flip it before applying.

The matrix of (Premium sign) × (position direction) → which account gets which `Notional` sign:

```
┌──────────────────────────────┬─────────────────────┬─────────────────────┐
│ Market state                 │ Long position       │ Short position      │
├──────────────────────────────┼─────────────────────┼─────────────────────┤
│ Mark > Index                 │ Notional(negative)  │ Notional(positive)  │
│ (Premium positive,           │ → pays              │ → receives          │
│  longs are overpaying)       │                     │                     │
├──────────────────────────────┼─────────────────────┼─────────────────────┤
│ Mark < Index                 │ Notional(positive)  │ Notional(negative)  │
│ (Premium negative,           │ → receives          │ → pays              │
│  shorts are overpaying)      │                     │                     │
└──────────────────────────────┴─────────────────────┴─────────────────────┘
```

Read it as: **`Notional`'s sign = the delta to add to that account's quote balance**. The choice of viewpoint isn't market direction; it's whatever lets the bridge apply the value with one line, `balance += notional.0`, with no conditional flipping. L7's `apply_funding` implements exactly these four cells in four lines of code.

### Step 2: Update `lib.rs` re-exports

Open `crates/funding/src/lib.rs`. The current `pub use` line is:

```rust
pub use types::RATE_SCALE;
```

Change to:

```rust
pub use types::{IndexPrice, MarkPrice, Notional, Premium, RATE_SCALE};
```

Alphabetical order for the imports — same as Stage 8b's lib.rs. Callers can now write:

```rust
use openhl_funding::{MarkPrice, IndexPrice};
```

instead of:

```rust
use openhl_funding::types::{MarkPrice, IndexPrice};
```

**Crate-root re-export for everything callers actually use.** Module paths are internal.

> 🛑 **Anti-fluency.** "Couldn't we use `pub use types::*` to re-export everything?" **You could, but it leaks the internal types list to the public API surface.** Today we have 4 types in `types.rs`; if we ever add a private helper like `internal_FillSinkCachedView` and forget the `pub` modifier, `pub use types::*` would silently expose it. **Explicit re-exports are a public-API checklist.** Each re-exported name is a deliberate decision.

### Step 3: Compile

```bash
cargo build -p openhl-funding
```

Expected output:

```
   Compiling openhl-funding v0.1.0 (/Users/.../my-openhl/crates/funding)
warning: unresolved link to `FundingRate`
warning: unresolved link to `FundingClock`
    Finished `dev` profile [unoptimized + debuginfo] in 0.4s
```

Two rustdoc warnings now (down from three at L1). The `[Premium]` link in `RATE_SCALE`'s doc resolves; the `[FundingRate]` and `[FundingClock]` links still don't. **Expected progress** — L3 will add `FundingRate` and clear the second warning.

Common errors:

- **`error[E0381]: missing field 'value' in initializer of MarkPrice`** — you forgot `pub` on the inner field and wrote `MarkPrice { value: u64 }` instead of `MarkPrice(pub u64)`. Use the tuple-struct form per the openhl convention.
- **`error[E0277]: 'i64' is not 'u64'`** — you wrote `Premium(pub u64)` instead of `Premium(pub i64)`. Premium is signed; check the inner type.
- **Missing derive** — you forgot one of the derives. The full set is `Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash`. `Default` is needed because tests will use `MarkPrice::default()` in some L4 fixture builders.

## Design reflection

Three load-bearing decisions in this lesson:

1. **Newtype pattern over type aliases or raw primitives.** The ~5-line cost per type buys compile-time prevention of argument-order bugs that would otherwise be invisible. **Cheap insurance for a high-cost class of bugs.**

2. **Public inner field (`pub u64`).** Validation isn't this crate's job; preventing cross-feeding is. The inner field is `pub` to keep arithmetic ergonomic in `compute.rs`. **The newtype defends against type confusion, not bad values.**

3. **Sign conventions live in doc comments at the type definition.** "Positive when mark > index, longs pay shorts" — that sentence in `Premium`'s doc is the single point of truth for the sign convention. Every consumer relies on it. **Sign conventions are the most-misremembered piece of any numerical type; pin them in the doc at definition site.**

## Answer key

```bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/types.rs ./crates/funding/src/types.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
```

After L2:
- **types.rs** matches Stage 8b through `Notional` (the first 4 newtypes). The next types — `FundingRate`, `PositionSize`, `Position`, `Settlement`, `FundingParams` — are L3.
- **lib.rs** has the 4-type re-export. The full Stage 8b re-export adds 5 more names (`FundingParams`, `FundingRate`, `Notional` is already there, `Position`, `PositionSize`, `Settlement`). All come in L3.

Return:

```bash
git checkout main
```

## Common questions

**Q: Why are `MarkPrice` and `IndexPrice` `u64` but `Premium` and `Notional` are `i64`?**
Because prices are always positive (negative price would be a system invariant violation), but **premiums and notionals can be negative**. A premium is negative when mark < index. A notional delta is negative when the account pays (vs. receives). Signed integers represent both directions naturally; unsigned would require a separate "direction" field or pair of types.

**Q: Why `Default` on these types? When would default values be useful?**
`Default::default()` returns `MarkPrice(0)`, `Premium(0)`, etc. Useful in test fixtures: `let mark: MarkPrice = Default::default();` is shorter than `MarkPrice(0)`. Also enables `#[derive(Default)]` on containing structs that use these types. **Cheap derive; no behavioral cost.**

**Q: Why eagerly derive `Hash` / `Ord` / `PartialOrd` on every newtype?**
To unlock the future moments where these types want to be keys or sort keys without having to revisit every type definition. L3's `Position { account, size }`, L7's settlements `Vec`, any later `HashMap<AccountId, MarkPrice>` (snapshot map), `BTreeMap<Premium, Vec<Settlement>>` (bucketing), or `settlements.sort_by_key(|s| s.delta)` (deterministic test ordering) — each of those needs one of these trait bounds the moment it appears. **For newtypes over primitives, deriving the full `Copy + Default + PartialEq + Eq + PartialOrd + Ord + Hash + Debug` set is free at the derive site (the behavior is inherited verbatim from the inner `i64`/`u64`), so the convention is to paste the same one-line attribute on every newtype up front.** You're buying out the future cost of editing N type definitions to add `#[derive(Hash)]` later — one line, now.

**Q: Should `Premium` and `Notional` implement `Add` / `Sub` / `Mul`?**
Tempting — `Premium(5) + Premium(3) == Premium(8)` reads nicely. But Stage 8b chose not to: the math operations in `compute.rs` need to upcast to `i128` for overflow safety, and providing `Add` for `Premium` would tempt callers to use it without the i128 dance. **The crate's API contract is: do arithmetic on the inner field with explicit i128 upcasting.** That contract is easier to enforce when the types don't have arithmetic ops.

**Q: Why aren't there tests for these types?**
What would the test assert? `assert_eq!(MarkPrice(100), MarkPrice(100))` tests `PartialEq` (a derive). `assert_eq!(MarkPrice(100).0, 100)` tests the pub field (a language feature). **Newtypes that only wrap a primitive have no behavior to test.** L4's `compute_premium` is where these types start participating in code that could have bugs.

## Next lesson (L3)

L3 finishes the type roster: `FundingRate(i64)`, `PositionSize(i64)`, `Position { account, size }`, `Settlement { account, delta }`, `FundingParams { interval_secs, rate_cap, divisor }`. The teaching focus shifts from "newtype pattern" to "the parameter object pattern" (`FundingParams`) and the **HL-style defaults** — why 8 settlements per day, why 4% cap. The `Position` struct introduces the `AccountId` dependency from `openhl_clob` that we set up in L1's Cargo.toml.
````

---

## Seed-file slot

L2 lands in Module 1 (Determinism + types) at sortOrder 1:

```typescript
{
  title: 'Lesson 2 — Money types — newtypes for prices, premiums, and notional',
  slug: 'openhl-funding-money-types-en',
  type: 'CONTENT',
  sortOrder: 1,
  duration: 30,
  xpReward: 60,
  content: `# Lesson 2 — Money types — newtypes for prices, premiums, and notional\n\n...`
},
```

## SHA pinning discipline

L2 cites `cd94137` (Stage 8b). After L2, types.rs matches Stage 8b through `Notional`. The remaining 5 types (FundingRate, PositionSize, Position, Settlement, FundingParams) are L3.

## Style review notes (self-critique before paste)

- **§Goal frames L2 as "newtype pattern as the teaching point"** — readers know to look beyond the math for what the lesson actually teaches.
- **§Predict on `pub u64`** earns the visibility choice — readers who'd default to private fields will see the arithmetic-ergonomic reason.
- **§Step 1 walkthrough has 4 named subsections** — one per type — keeping the per-type rationale near the type's definition.
- **§Anti-fluency on type aliases** is a high-value clarification — many Rust-newcomers reach for type aliases for this exact use case.
- **§Anti-fluency on `pub use types::*`** preempts the convenience-import temptation.
- **§Anti-fluency on `MarkPrice(0)` error path** preempts over-validation reflex.
- **§Design reflection 1 ("cheap insurance")** ties together the "why newtypes" rationale.
- **§Common question on no tests** explicitly handles the "everything should have tests" reflex — same shape as L1's RATE_SCALE question.
- **L3 preview** sets up the parameter object pattern + HL defaults conversation.
