# Building OpenHL Liquidation — L2 draft (EN) — build-along

> openhl SHA `22eedf9` (Stage 10a — liquidation margin math).

````markdown
## L2 — `openhl-liquidation-margin-types-en`

**Stage**: Stage 10a — `22eedf9`

**Title**: Lesson 2 — `MarginRatio` + `MarginHealth` — the classification types the engine returns

**Duration**: 25 min · **XP**: 50

---

# Lesson 2 — `MarginRatio` + `MarginHealth` — the classification types the engine returns

## Goal

Concepts you'll grasp in this lesson:

- **Why `MarginRatio` is a newtype, not a `type` alias for `i64`** — the newtype catches accidental "passed a raw i64 where a bps-scaled ratio was expected" bugs at compile time. Same discipline as funding's `MarkPrice(pub u64)` vs `u64`.
- **Why `MarginHealth` has exactly 4 variants** — `Safe`, `AtRisk`, `Liquidatable`, `Underwater`. Each variant authorizes a different engine action; collapsing any pair loses information the rest of the engine needs.
- **What each variant authorizes the rest of the engine to do** — a quick decision matrix you can keep in your head.
- **Why we *don't* derive `PartialOrd` / `Ord` on the enum** — even though the variants form a natural worsening order, ordered comparisons (`health > Safe`) read as code-smell next to explicit `matches!` patterns.

Verification:

```bash
cargo build -p openhl-liquidation
```

…compiles.

Specific changes:

- **`src/types.rs`** — appends `MARGIN_SCALE`-typed `MarginRatio` newtype and `MarginHealth` enum below the existing `MARGIN_SCALE` constant and `LiquidationParams` struct. No changes to anything from L1.
- **`src/lib.rs`** — adds `MarginRatio` and `MarginHealth` to the existing `pub use types::{...}` re-export.

L2 still has no tests — `MarginRatio` and `MarginHealth` are passive data types. L3 finishes the types module with `AccountSnapshot` + `CloseOrderSpec` (also no tests). The first behavior test arrives at L4 with `notional_value`.

## Recap

After L1:
- The crate has `MARGIN_SCALE` (10⁴) and `LiquidationParams` with a `hyperliquid_default()`.
- `lib.rs` re-exports both names from `types`.
- `cargo build -p openhl-liquidation` passes; one rustdoc warning about `MarginHealth` (still unresolved at this point).

L2 adds the two classification types the rest of the engine speaks in. From L4 onward, `margin_ratio` returns a `MarginRatio` and `margin_health` returns a `MarginHealth`.

## Plan

Two edits, both small:

1. **Append to `crates/liquidation/src/types.rs`** — `MarginRatio(pub i64)` newtype with `MARGIN_SCALE`-relative docs, and the `MarginHealth` enum with 4 variants + per-variant doc comments explaining the authorization meaning of each.
2. **Update `crates/liquidation/src/lib.rs`** — extend the `pub use types::{...}` line to include the two new names.

> 🛑 **Predict.** Before scrolling: `MarginHealth` is going to be an enum. How many variants does it need? Hint: the engine needs to decide three things about each account — (a) can the account open new risk? (b) should the engine force-close the position? (c) is closing the position by itself enough to cover the deficit, or does the insurance fund need to step in?

(Answer: **3 questions → 4 variants.** `Safe` = yes to (a). `AtRisk` = no to (a), no to (b). `Liquidatable` = no to (a), yes to (b), yes to (c) (close-only suffices). `Underwater` = no to (a), yes to (b), no to (c) (insurance fund absorbs the deficit). A 3-variant enum (Safe/AtRisk/Liquidatable) would collapse Liquidatable and Underwater, losing the "does the insurance fund get involved?" signal. The engine doesn't have to recompute that — it's already encoded in the variant.)

## Walk-through

### Step 1: Append to `src/types.rs`

Open `crates/liquidation/src/types.rs`. After the closing `}` of the `LiquidationParams` impl block, append:

```rust
/// Account margin ratio = `equity / notional`, scaled by [`MARGIN_SCALE`].
///
/// Sign: usually non-negative; can be negative when the account is
/// "underwater" — accumulated losses have driven equity below zero, and
/// liquidating the position alone cannot cover the deficit. The insurance
/// fund absorbs that shortfall (Stage 10b).
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct MarginRatio(pub i64);

/// Margin health classification given the account's current margin ratio
/// and the network's params. Four states, in decreasing health order.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum MarginHealth {
    /// Margin ratio ≥ initial margin requirement. Healthy: the account
    /// can open new positions or increase existing ones.
    Safe,
    /// Margin ratio ∈ [maintenance, initial). Allowed to hold existing
    /// positions but not to add risk. Production UIs typically warn the
    /// user.
    AtRisk,
    /// Margin ratio < maintenance, equity still ≥ 0. The engine should
    /// liquidate the position at market; the account's remaining equity
    /// (after the liquidation fee) returns to the account.
    Liquidatable,
    /// Margin ratio < 0 (equity is negative). Closing the position at
    /// any price won't fully cover losses. The insurance fund absorbs
    /// the shortfall — handled in Stage 10b.
    Underwater,
}
```

Things to notice about these 25 lines:

1. **`MarginRatio(pub i64)` is a newtype.** Not a `type MarginRatio = i64` alias. The newtype gives the type checker a handle: a function that takes `MarginRatio` cannot be accidentally called with a raw `i64` value that's actually a balance, an account ID, or a `MarkPrice`. The `pub i64` field means callers can construct one with `MarginRatio(1000)` and read it with `ratio.0` — no encapsulation invariant to defend.

2. **`MarginRatio` derives a lot of traits — `Default`, `PartialOrd`, `Ord`, `Hash`.** The defaults aren't required by the engine, but they let downstream code (telemetry, sorted-by-worst-health scanners in Stage 10c, dashboards) use `MarginRatio` like any other comparable value type. `MarginRatio::default()` is `MarginRatio(0)` — 0 bps, semantically "no ratio computed" or "freshly zeroed." The engine itself never reads `default()`; it always computes from a snapshot.

3. **`MarginHealth` does NOT derive `PartialOrd` / `Ord`.** Even though the variants naturally order (Safe < AtRisk < Liquidatable < Underwater in worsening direction), ordered comparisons on enums read as code-smell. `if health > MarginHealth::AtRisk` is less clear than `if matches!(health, MarginHealth::Liquidatable | MarginHealth::Underwater)`. The compiler enforces the explicit pattern; future maintainers see exactly which variants the branch covers.

4. **Per-variant doc comments describe the *authorization*, not the math.** "Margin ratio < maintenance" tells you when the variant fires, but the comment also says what the engine does in response ("should liquidate the position at market"). Doc comments here serve as the canonical reference for "what does Liquidatable actually mean to the rest of the system?"

5. **Variant order matches worsening health.** The variants are listed in the source in the order Safe → AtRisk → Liquidatable → Underwater. This isn't load-bearing for the compiler — Rust enums have no inherent order beyond what you derive — but it matches the order an exhaustive `match` typically reads naturally (best case first, worst case last).

> 🛑 **Anti-fluency.** "Couldn't `MarginHealth` be a `bool` — liquidatable or not?" **No, because the engine needs three downstream decisions, not one.** A `bool` collapses (a) "can open positions?" and (c) "does the insurance fund get involved?" into a single bit. The cost of fixing that later is going through every call site that returned the `bool` and changing the type — the cost of getting it right now is two extra variants.

### Step 2: Update `src/lib.rs`

Open `crates/liquidation/src/lib.rs`. Extend the `pub use types::{...}` line. Was:

```rust
pub use types::{LiquidationParams, MARGIN_SCALE};
```

Becomes:

```rust
pub use types::{LiquidationParams, MarginHealth, MarginRatio, MARGIN_SCALE};
```

That's the entire `lib.rs` change — three new public names at the crate root, in alphabetical order. Constants traditionally sort last so `MARGIN_SCALE` stays at the end.

The rustdoc warning about `[`MarginHealth`]` (unresolved at L1) now resolves — the type exists.

### Step 3: Compile

```bash
cargo build -p openhl-liquidation
```

Expected output:

```
   Compiling openhl-liquidation v0.1.0 (/Users/.../my-openhl/crates/liquidation)
    Finished `dev` profile [unoptimized + debuginfo] in 0.4s
```

Zero warnings. The L1 rustdoc warning about `MarginHealth` is gone.

Common errors:

- **`error[E0432]: unresolved import 'crate::types::MarginRatio'`** — typo in the `pub use` line (e.g., `MarignRatio`). Match the type names character-for-character.
- **`error: ambiguous re-export`** — you accidentally added a second `pub use` line at the bottom instead of extending the existing one. Keep all re-exports on a single `pub use types::{...}` block; the formatter expects this shape.

## Design reflection

Three load-bearing decisions in this lesson:

1. **`MarginRatio(pub i64)` newtype, not `type MarginRatio = i64`.** Aliases are zero-cost but also zero-safety: the compiler treats them as the same type. A newtype is also zero-cost at runtime (single-field structs lay out identical to the field) but creates a real distinction the compiler enforces. **Use newtypes wherever the value carries a meaning beyond "an integer with this bit pattern."**

2. **`MarginHealth` has 4 variants because the engine makes 3 downstream decisions.** Each variant maps cleanly to a unique combination of those 3 decisions. A 5th variant ("ImminentlyLiquidatable"? "RecentlyClosed"?) would require a 4th decision; until we have one, 4 is the right number. **Match the cardinality of your enum to the cardinality of the actions it authorizes.**

3. **No `PartialOrd` on `MarginHealth`.** The variants order naturally, but ordered comparisons on enums lose specificity (`health > AtRisk` doesn't say *which* "worse than AtRisk" — `Liquidatable` or `Underwater`?). Explicit `matches!` patterns force every branch to spell out which variants it handles, and `rustc -W non_exhaustive_omitted_patterns` catches the case you forgot. **Comparable enums are usually a code-smell; reach for `matches!` first.**

## Answer key

```bash
cd ~/code/openhl-reference
git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/src/types.rs ./crates/liquidation/src/types.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
```

After L2:
- **types.rs** matches lines 1 through ~`MarginHealth::Underwater` of Stage 10a's types.rs — the `MARGIN_SCALE` + `LiquidationParams` (from L1) plus the new `MarginRatio` + `MarginHealth`. The next two types (`AccountSnapshot`, `CloseOrderSpec`) are L3.
- **lib.rs** matches Stage 10a's lib.rs except for `compute` module + 6 more re-exports — those come in L4–L7.

## Common questions

**Q1: Why doesn't `MarginRatio` implement `Display`?**

It could; the value is just an i64 in bps. We don't because no production code path formats a `MarginRatio` directly for end-user display — the bridge layer pulls `.0` out and renders it with a known scale ("`{}%`", `ratio.0 / 100`). Adding `Display` invites callers to print `MarginRatio` in logs as a raw integer, which obscures the bps scale. **Implement traits at the layer that needs them.**

**Q2: Could `MarginHealth` be a `u8` and save memory?**

Rust's enum layout for 4 variants without payloads already fits in a `u8` — `size_of::<MarginHealth>() == 1`. The compiler picks the smallest discriminant. Switching to a raw `u8` would lose the named variants, lose exhaustiveness checking in `match`, and gain nothing.

**Q3: Should the variants carry payloads (e.g., `AtRisk { headroom_bps: u32 }`)?**

Tempting but premature. The downstream consumers (Stage 10c scanner, dashboards) re-derive what they need from the underlying margin_ratio. Variant payloads add construction overhead and complicate `match` ergonomics. **Keep enums payload-free unless every consumer benefits from the payload.**

**Q4: Why include `Underwater` as a separate variant when `Liquidatable` could imply both "close + maybe absorb deficit"?**

Because the bridge needs to do *different things* in the two cases. A `Liquidatable` account generates a single close order and the engine settles fee+remainder normally. An `Underwater` account generates a close order AND a credit-to-insurance-fund entry that the bridge must apply atomically. Separating the variants pushes the case distinction up to the type level, where exhaustive `match` catches it; merging them pushes the case distinction into runtime branching inside the bridge, where it's easier to miss. **State machines benefit from variants that mirror the actions they trigger.**

**Q5: Should `margin_health` return `Option<MarginHealth>` for flat positions?**

No — flat positions return `MarginHealth::Safe` (no notional, no margin requirement to fall short of). `Option` would force every caller to handle `None` explicitly, even though "flat = safe" is unambiguous. **Don't add `Option` to encode states the type system already handles.**

## Next lesson (L3)

L3 closes the types module with `AccountSnapshot` (the input to every margin function) and `CloseOrderSpec` (the output the engine hands the bridge). After L3, the `types` module is complete; L4 starts the `compute` module with `notional_value`.

````

---

## Seed-file slot

L2 lands in Module 1 at sortOrder 1:

```typescript
{
  title: 'Lesson 2 — MarginRatio + MarginHealth — the classification types the engine returns',
  slug: 'openhl-liquidation-margin-types-en',
  type: 'CONTENT',
  sortOrder: 1,
  duration: 25,
  xpReward: 50,
  content: `# Lesson 2 — MarginRatio + MarginHealth — the classification types the engine returns\n\n...`
},
```

## SHA pinning discipline

L2 cites `22eedf9` (Stage 10a). The answer-key diff verifies the appended block in types.rs matches the corresponding bytes in Stage 10a.

## Style review notes (self-critique before paste)

- **The "3 questions → 4 variants" predict callout** is the pedagogical anchor. Without it the reader takes the 4-variant decision on faith. With it, the decision is derivable — and if a 5th decision ever shows up in a future stage, the reader knows to add a 5th variant rather than overload an existing one.
- **The Q4 explanation of `Underwater` as a separate variant** is preempting a real PR comment: "isn't Underwater just Liquidatable + extra book-keeping?" The variants-mirror-actions framing is the principled answer.
- **No `PartialOrd` is the L2 design hill** — the L1 design hill was `hyperliquid_default()` (named constructor, not `Default` impl). Both lessons end with a "the obvious Rust idiom isn't always right" reflection; the cumulative effect is that the reader internalizes the discipline.
- **L2 is intentionally lighter than L1.** Adding two types is less code than adding a constant + a struct + an impl block. The reader gets a small win between two harder lessons (L1's `hyperliquid_default()` and L3's `AccountSnapshot`).
