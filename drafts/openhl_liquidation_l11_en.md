# Building OpenHL Liquidation — L11 draft (EN) — build-along

> openhl SHA `0a8464e` (Stage 10c — multi-account liquidation scanner).

## L11 — `openhl-liquidation-scanner-types-en`

**Stage**: Stage 10c — `0a8464e`

**Title**: Lesson 11 — Scanner type vocabulary — `CloseOutcomeKind`, `LiquidationRecord`, `ScanReport`, `LiquidationScanner`

**Duration**: 25 min · **XP**: 50

---

````markdown
# Lesson 11 — Scanner type vocabulary — `CloseOutcomeKind`, `LiquidationRecord`, `ScanReport`, `LiquidationScanner`

## Goal

Concepts you'll grasp in this lesson:

- **The orchestration layer has its own type vocabulary, distinct from compute or insurance.** Stage 10a produced `MarginHealth` (per-account classification). Stage 10b produced `SolventClose` / `UnderwaterClose` (per-close decomposition) and `WithdrawOutcome` (per-fund-call outcome). Stage 10c introduces *batch-level* types: `CloseOutcomeKind` (which kind of close this account had), `LiquidationRecord` (one row per liquidated account), and `ScanReport` (everything that happened in one scan). **Each architectural layer needs its own type vocabulary because each layer answers different questions.**
- **`CloseOutcomeKind` is a discriminated union of `SolventClose` and `UnderwaterClose` — same shape as L9's `WithdrawOutcome`, different vocabulary.** Two variants, each carrying a struct produced by the corresponding Stage 10b function. The scanner pattern-matches on this enum to dispatch the post-close work (fund deposit, fund withdraw, escalation aggregation). **When a higher layer routes between two lower-layer outputs, an enum variant carrying each output is the cleanest mechanical bridge.**
- **`ScanReport` includes both per-account records AND aggregate fund-flow totals.** The records vector is the *audit trail* (one row per liquidation, in iteration order). The three aggregate `i64`s (`fund_deposits`, `fund_withdrawals`, `unfilled_deficit`) are the *telemetry summary* (sums the bridge can read without iterating the records). Pre-computing them inside the scan loop costs nothing — the bridge wanted them anyway. **Aggregate fields next to a record vector save the caller a fold; they're not redundant, they're convenient.**
- **`LiquidationScanner` owns the `InsuranceFund` directly, not via `Arc<Mutex<...>>`.** The scanner is a per-bridge component, not a shared resource. The bridge holds the scanner, the scanner holds the fund, the fund holds the balance. Mutation flows down the ownership tree without lock contention. **State machines that change exactly once per block don't need synchronization primitives.**

Verification:

```bash
cargo check -p openhl-liquidation
```

…compiles clean. We don't add new tests in L11 — the type vocabulary doesn't have behavior to test yet. L12 adds the `scan` method and its 4 simplest tests; L13 adds the nuanced cases + 4 proptests. After L13, 68 tests total.

Specific changes:

- **`src/scanner.rs`** — new module file. Adds the module-level doc, `CloseOutcomeKind` enum, `LiquidationRecord` struct, `ScanReport` struct, `LiquidationScanner` struct, plus 5 accessor methods (`new`, `with_empty_fund`, `fund_balance`, `fund`, `into_fund`). No `scan` method yet.
- **`src/lib.rs`** — adds `pub mod scanner;` and re-exports the four scanner types.

L11 stages the type vocabulary; L12 implements `scan`.

## Recap

After L10:
- `compute.rs`, `insurance.rs`, `types.rs`, `lib.rs` all match Stage 10b's `260883b` byte-for-byte.
- `cargo test` runs 55 tests, all green.
- We have *all the parts* for a multi-account orchestration loop: margin classification (`margin_health`), close-order generation (`close_order_spec`), fee math (`liquidation_fee`), close-outcome decomposition (`solvent_close_outcome` / `underwater_close_outcome`), and the insurance fund state machine (`InsuranceFund::deposit` / `::withdraw_shortfall`).
- The bridge would have to hand-wire those parts itself for every block.

Stage 10c assembles them once, in a reusable component the bridge owns. The orchestration loop is `scan` (L12); the contract — what `scan` takes and returns — is L11.

## Plan

Three edits:

1. **Create `crates/liquidation/src/scanner.rs`** — new module file with `CloseOutcomeKind`, `LiquidationRecord`, `ScanReport`, `LiquidationScanner`, and the 5 accessor methods. No `scan` method (lands in L12).
2. **Add `pub mod scanner;`** and the re-exports to `crates/liquidation/src/lib.rs`. The four types become part of the crate's public surface.
3. **Update `lib.rs`'s top-of-file roadmap** to mark Stage 10c in progress.

> 🛑 **Predict.** Before reading further: the scanner's `scan` method (L12 territory) will produce a `ScanReport` per block. What fields belong in the report? List as many as you can. Then: what fields belong in the *per-account record* inside the report?

(Answer: **Scan report:** (a) one record per liquidated account, (b) aggregate fees deposited to fund, (c) aggregate amount the fund actually paid out, (d) aggregate unfilled deficit the fund couldn't cover. **Per-account record:** (a) the account ID, (b) the close-order spec the bridge will submit, (c) the pre-close classification (for traceability), (d) the post-close outcome decomposition (solvent or underwater). The scanner gives the bridge two views of the same data: per-account records for the CLOB submit step, and aggregate totals for telemetry / ADL escalation in one O(1) read.)

The type layering picture for L11:

```
   ┌────────────────────────────────────────────────────────────┐
   │  L11 — orchestration layer types                            │
   ├────────────────────────────────────────────────────────────┤
   │                                                            │
   │  Per-account, post-classification:                         │
   │  ─────────────────────────────                             │
   │  enum CloseOutcomeKind {                                   │
   │      Solvent(SolventClose),       ──→ Fund deposit + refund │
   │      Underwater(UnderwaterClose), ──→ Fund shortfall path   │
   │  }                                                         │
   │                                                            │
   │  struct LiquidationRecord {                                │
   │      account, close_order, classification, outcome         │
   │  }                                                         │
   │                                                            │
   │  Per-batch:                                                │
   │  ──────────                                                │
   │  struct ScanReport {                                       │
   │      records: Vec<LiquidationRecord>,                      │
   │      fund_deposits:     i64,    ← Σ over records           │
   │      fund_withdrawals:  i64,    ← Σ over records           │
   │      unfilled_deficit:  i64,    ← Σ → ADL trigger          │
   │  }                                                         │
   │                                                            │
   │  Owner:                                                    │
   │  ──────                                                    │
   │  struct LiquidationScanner {                               │
   │      params: LiquidationParams,                            │
   │      fund:   InsuranceFund,    ← owned, not shared          │
   │  }                                                         │
   │                                                            │
   └────────────────────────────────────────────────────────────┘
```

Three things to notice about the layering:

1. **`CloseOutcomeKind` is the *only* new enum in Stage 10c.** Everything else is a struct. Why? Because the routing decision (solvent vs. underwater) was already made by `compute`'s `debug_assert!` pair (L10); the enum exists to *carry* the decision through the scan loop, not to *re-make* it. **Enums encode irreducible dispatch; struct fields encode parallel data.**
2. **`LiquidationRecord` carries `classification` (the pre-close `MarginHealth`) even though the bridge can derive it.** The bridge submitting the close order doesn't actually need it; what needs it is the *telemetry consumer* — a dashboard that wants to chart "how many Liquidatable vs Underwater closes per hour." Keeping it in the record makes the audit trail self-contained. **Record fields are for downstream consumers, not just the immediate caller.**
3. **`ScanReport`'s three aggregate `i64` fields are computed by the scanner during the loop, not by a separate fold.** Adding them to the scan loop costs three `saturating_add` calls per record — effectively free, since the scanner already touches each record once. **Pre-computing aggregates inside a single-pass loop is free; computing them in a second pass is wasteful.**

## Walk-through

### Step 1: Create `src/scanner.rs`

Create a new file `crates/liquidation/src/scanner.rs`. The whole-module doc comment goes first; it's the architectural overview that explains the determinism contract and the FIFO-fairness policy:

```rust
//! Multi-account liquidation scanner (Stage 10c).
//!
//! The scanner is the orchestration layer that ties Stage 10a (margin
//! classification + close-order generation) and Stage 10b (insurance
//! fund + close-outcome decomposition) together. The bridge owns a
//! [`LiquidationScanner`], calls [`LiquidationScanner::scan`] once per
//! block (or per market-event tick) with the current accounts and mark,
//! and consumes the returned [`ScanReport`] to (a) submit the close
//! orders to the CLOB and (b) escalate any unfilled deficit.
//!
//! ### Determinism
//!
//! Every validator must produce byte-identical [`ScanReport`]s from the
//! same `(accounts, mark, params, fund_state)`. The scanner only uses
//! `Vec`'s ordered iteration and the fully-deterministic Stage 10a/10b
//! primitives, so determinism follows from caller-side ordering of the
//! accounts slice — **the bridge is responsible for handing accounts in
//! a deterministic order** (typically `account_id`-sorted).
//!
//! ### Fairness when the fund is partially drained
//!
//! When the insurance fund cannot cover every underwater shortfall in
//! one scan, the v0 policy is **first-come-first-served** in iteration
//! order. Earlier-iterated underwater accounts get covered; later ones
//! contribute to [`ScanReport::unfilled_deficit`]. This is the simplest
//! deterministic choice; production fairness designs (pro-rata draw,
//! priority by account leverage) can be layered on later without
//! changing the public type shape.
//!
//! ### ADL handoff (Stage 10d)
//!
//! [`ScanReport::unfilled_deficit`] is the load-bearing signal that the
//! fund couldn't absorb everything. Stage 10c records it; a future
//! Stage 10d would consume it to drive ADL ranking and force-close
//! profitable counter-positions. Until Stage 10d ships, the bridge can
//! either panic on `unfilled_deficit > 0` (conservative — halt the
//! chain) or log and continue (permissive — accept the deficit as a
//! protocol loss).
```

Five things to notice about this preamble:

1. **It defines *who calls what* in the first sentence.** "The bridge owns a `LiquidationScanner`, calls `LiquidationScanner::scan` once per block, and consumes the returned `ScanReport`." A reader who reads only the first sentence already knows the ownership and call-pattern. **For orchestration modules, the first sentence of the module doc is the call-pattern.**
2. **The `Determinism` section names *who is responsible for what*.** The scanner is deterministic *given a deterministic ordering of accounts*; the *bridge* is responsible for the ordering. Splitting the determinism contract this way is honest: the scanner can't enforce something it doesn't own. **A module that depends on a caller-provided invariant should name the invariant and credit the caller for upholding it.**
3. **The `Fairness when the fund is partially drained` section names the v0 policy AND its successors.** First-come-first-served is the simplest deterministic choice; pro-rata draw and leverage-priority are future designs. Naming both makes the policy *replaceable* without the public-type shape changing. **When picking a policy, name the alternatives the public type leaves room for.**
4. **The `ADL handoff` section explains how the scanner integrates with a stage that doesn't exist yet.** Stage 10d is the next stage in the openhl roadmap; L11's scanner already produces the signal Stage 10d needs (`unfilled_deficit`). **Forward references in docs aren't speculation — they're integration contracts that the next stage will fulfill.**
5. **The escalation alternatives ("panic vs log and continue")** explicitly name the trade-off until Stage 10d ships. The reader who deploys an early-stage chain knows their options. **Doc the operational decisions a deployer faces, not just the API.**

Below the doc, add the imports the scanner uses:

```rust
use crate::compute::{
    account_equity, close_order_spec, liquidation_fee, margin_health, notional_value,
    solvent_close_outcome, underwater_close_outcome,
};
use crate::insurance::{InsuranceFund, WithdrawOutcome};
use crate::types::{
    AccountSnapshot, CloseOrderSpec, LiquidationParams, MarginHealth, SolventClose, UnderwaterClose,
};
use openhl_clob::AccountId;
use openhl_funding::MarkPrice;
```

The import block is unusually wide because the scanner *composes everything*. Six compute functions, two insurance types, five type-module types, two cross-crate types. The width is intentional — it's the bill of materials that says "Stage 10c is what happens when everything from 10a + 10b combines." **An import block can serve as documentation when it's the inventory of dependencies.**

### Step 2: Add `CloseOutcomeKind`

Below the imports, add the discriminated outcome enum:

```rust
/// Discriminated outcome for a single liquidated account in a scan.
///
/// `Solvent` carries the [`SolventClose`] decomposition (full fee
/// collectable, residual returns to account). `Underwater` carries the
/// [`UnderwaterClose`] decomposition (partial or zero fee, shortfall the
/// fund must absorb).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum CloseOutcomeKind {
    Solvent(SolventClose),
    Underwater(UnderwaterClose),
}
```

Four things to notice:

1. **The enum is a *tuple variant* enum, not a struct-variant enum.** Each variant carries one positional payload. The alternative — `Solvent { close: SolventClose }` — would require named-field destructuring (`CloseOutcomeKind::Solvent { close } => ...`). Tuple variants give you the cleaner `CloseOutcomeKind::Solvent(close) => ...`. **Tuple variants beat struct variants when the variant carries exactly one payload type.**
2. **The enum is `Copy`** because both `SolventClose` and `UnderwaterClose` are `Copy` (each is two `i64` fields). Pass by value, pattern-match by value, no borrow management. **Composing `Copy` types produces a `Copy` enum at zero engineering cost.**
3. **The doc comment names the *two payloads* explicitly** — full-fee solvent vs. partial-or-zero underwater. A reader who sees the enum signature without the doc would not know that `Underwater` includes the "zero fee, full shortfall" case (which the L10 doc made clear). The cross-reference here saves a hop. **When a higher-layer enum carries a lower-layer struct with subtle internal cases, name those cases in the higher-layer doc.**
4. **No `match`-exhaustiveness helper variant.** No `_ => unreachable!()`-style catch-all is needed because the enum has exactly two variants and they exhaust the discriminated-dispatch space we set up in L10. **Two-variant enums are the smallest possible discriminated dispatch — nothing to catch.**

### Step 3: Add `LiquidationRecord`

Below `CloseOutcomeKind`, add the per-account record struct:

```rust
/// Per-account record produced by the scanner when an account is
/// liquidated. The bridge submits `close_order` to the CLOB; `outcome`
/// records the credit/debit decomposition the scanner already applied
/// against the [`InsuranceFund`].
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct LiquidationRecord {
    pub account: AccountId,
    pub close_order: CloseOrderSpec,
    /// Pre-close classification from [`margin_health`]. `Liquidatable`
    /// or `Underwater`; `Safe`/`AtRisk` accounts never appear in a
    /// record.
    pub classification: MarginHealth,
    /// Decomposition of what happened in the close. Note that a
    /// `Liquidatable`-classified account can still produce an
    /// `Underwater` outcome when the fee tips post-close equity
    /// negative.
    pub outcome: CloseOutcomeKind,
}
```

Six things to notice:

1. **Four fields, three of which are `Copy` types from earlier modules.** `AccountId` (from `openhl-clob`), `CloseOrderSpec` (Stage 10a), `MarginHealth` (Stage 10a), `CloseOutcomeKind` (this module). Composing existing types into a record is free. **A record struct that doesn't introduce new fields is purely a vocabulary widening — name it and move on.**
2. **`classification` carries `MarginHealth`, an enum with four variants** (`Safe`, `AtRisk`, `Liquidatable`, `Underwater`). The doc says only two appear in records — the other two would never be in a `LiquidationRecord` because the scanner skips them. The type *allows* four values; the contract narrows to two. **A type can carry more cases than the API actually produces; document the contract narrowing in the doc, not in a separate sub-enum.**
3. **The note about `Liquidatable`-classified → `Underwater`-outcome is the key teaching point.** A reader who reads only the field name would assume `classification == outcome` always — but the *classification* uses pre-close equity, while the *outcome* uses post-close equity (which the fee reduces). Stage 10a's `margin_health` and Stage 10b's `solvent_close_outcome` / `underwater_close_outcome` can disagree on which side of the fee-threshold an account lands. The concrete case is L10's `underwater_close_partial_fee_collection` test: account is `Liquidatable` pre-close (positive equity above the maintenance margin), but the close-plus-fee tips post-close equity below the desired fee — so the *outcome* lands in the `Underwater` branch even though the *classification* was `Liquidatable`. **Document the cases where two related fields can disagree — readers will assume they always agree otherwise.**
4. **The struct is `Copy`** because all four fields are `Copy`. Even though `LiquidationRecord` will be pushed into a `Vec` (which never requires `Copy`), keeping it `Copy` makes the per-iteration loop body in L12's `scan` method ergonomic — no `.clone()`, no borrow management. **Make record types `Copy` when their fields permit; the cost is zero and the ergonomics compound.**
5. **All four fields are `pub`.** A `LiquidationRecord` is a *value type* — the bridge reads its fields directly. Hiding them behind accessors would impose `record.account()` instead of `record.account`, and gain nothing because there are no invariants to defend. **For records that exist purely to carry data, public fields beat methods.**
6. **No `Default` derive.** What would a default record even mean? An empty `AccountId`, a zero-qty `CloseOrderSpec`, a `Safe` classification, a `Solvent(SolventClose::default())` outcome? Nothing about that has meaning. **Don't derive `Default` for records whose meaning is "something specific happened" — there's no neutral state to encode.**

### Step 4: Add `ScanReport`

Below `LiquidationRecord`, add the batch-level summary:

```rust
/// Summary of a single scan pass. Includes per-account records plus
/// aggregate fund-flow totals for telemetry / escalation.
#[derive(Clone, Debug, PartialEq, Eq, Default)]
pub struct ScanReport {
    /// One record per liquidated account, in scan-iteration order. The
    /// bridge submits each record's `close_order` to the CLOB.
    pub records: Vec<LiquidationRecord>,
    /// Total fees credited to the insurance fund during this scan.
    pub fund_deposits: i64,
    /// Total amount the insurance fund actually paid out (sum of the
    /// `amount` field across `Covered` and `PartiallyDrained`
    /// withdrawals).
    pub fund_withdrawals: i64,
    /// Total shortfall the fund could NOT cover (sum across
    /// `PartiallyDrained.unfilled` and `Depleted.unfilled`). Stage 10d
    /// consumes this as the ADL trigger.
    pub unfilled_deficit: i64,
}
```

Six things to notice:

1. **`ScanReport` is `Clone + Default` but **NOT** `Copy`.** Because it contains a `Vec`, which is heap-allocated and can't be bitwise-copied. The compiler enforces this; you can't accidentally derive `Copy` on a `Vec`-containing struct. **The presence of a `Vec` is the compiler-enforced "I have a heap allocation" signal.**
2. **`Default` is derived — and it's meaningful.** An empty scan (no liquidatable accounts) produces `ScanReport { records: vec![], fund_deposits: 0, fund_withdrawals: 0, unfilled_deficit: 0 }`. That's exactly what `Default::default()` gives, and it's exactly what L12's `scan` method initializes with. **`Default` is meaningful when the default value represents a real domain state — here, "scan returned nothing."**
3. **Three `i64` aggregates next to the `Vec`** — `fund_deposits`, `fund_withdrawals`, `unfilled_deficit`. The alternative — computing them via `report.records.iter().map(|r| r.outcome.fee()).sum()` — would require iterating the records every time the bridge reads them. Pre-computing inside the scan loop is O(1) extra work per record and saves the bridge an O(n) fold. **Aggregate fields next to a record vector save the caller a fold; they're not redundant.**
4. **`fund_withdrawals` is the sum of `amount`, not of `shortfall`.** Read it twice. The bridge wants to know "how much did the fund actually pay out?", not "how much was requested." The two differ when the fund is partially drained (`amount < shortfall`). The field name reflects what was *paid out*, not what was *asked for*. **Aggregate fields measure what *happened*, not what was *requested*.**
5. **`unfilled_deficit` is the sum across two `WithdrawOutcome` variants.** Specifically `PartiallyDrained.unfilled` AND `Depleted.unfilled`. The doc names both contributors. A reader who only knew `PartiallyDrained` would miss the `Depleted` case (where the fund was already empty before the call). **When an aggregate sums across enum variants, name every variant that contributes.**
6. **`unfilled_deficit` is *the* signal to Stage 10d.** The doc comment names it. L11's contract is that this field exists and is computed correctly; Stage 10d's contract is that it consumes this field to drive ADL. **The handoff between two stages is an i64 field with a clear name and a documented consumer.**

### Step 5: Add `LiquidationScanner` struct + accessors

Below `ScanReport`, add the scanner struct and its accessors:

```rust
/// Multi-account liquidation scanner.
///
/// Owns an [`InsuranceFund`] and a set of [`LiquidationParams`]. The
/// bridge calls [`Self::scan`] once per block; the scanner classifies
/// every account, generates close orders for the Liquidatable/Underwater
/// ones, mutates the fund accordingly, and returns the resulting
/// [`ScanReport`].
#[derive(Clone, Debug)]
pub struct LiquidationScanner {
    params: LiquidationParams,
    fund: InsuranceFund,
}

impl LiquidationScanner {
    /// Construct a scanner with the given params and a starting fund
    /// balance.
    #[must_use]
    pub const fn new(params: LiquidationParams, fund: InsuranceFund) -> Self {
        Self { params, fund }
    }

    /// Construct a scanner with the given params and an empty insurance
    /// fund. Convenience for tests and fresh-chain bootstrap.
    #[must_use]
    pub const fn with_empty_fund(params: LiquidationParams) -> Self {
        Self {
            params,
            fund: InsuranceFund::empty(),
        }
    }

    /// Current insurance fund balance.
    #[must_use]
    pub const fn fund_balance(&self) -> i64 {
        self.fund.balance()
    }

    /// Borrow the underlying insurance fund (read-only).
    #[must_use]
    pub const fn fund(&self) -> &InsuranceFund {
        &self.fund
    }

    /// Consume the scanner and return its fund — useful for handoff to
    /// snapshot/persistence layers at chain shutdown.
    #[must_use]
    pub fn into_fund(self) -> InsuranceFund {
        self.fund
    }
}
```

Seven things to notice:

1. **The struct has *two* private fields and no public ones.** Unlike `LiquidationRecord` (all-public, data carrier) or `ScanReport` (all-public, value type), `LiquidationScanner` is a *state machine* — it owns mutable state (the fund) and the bridge is supposed to interact with it through methods. Private fields enforce that contract. **State machines hide their fields; data carriers expose them.**
2. **The struct is `Clone` but NOT `Copy`** (because it contains the fund, which is technically `Copy` here but composed inside a `#[derive(Clone, Debug)]` block to allow future evolution). Cloning is for tests and for safe snapshot patterns — production code rarely clones a scanner. **Derive `Clone` defensively even when no current caller uses it; the cost is zero and it unblocks future test patterns.**
3. **Five accessor methods, *not* one Builder pattern.** A builder would let you do `LiquidationScanner::builder().with_params(p).with_fund(f).build()`. We don't have one because the scanner has exactly two fields and the construction site is small. **Builders earn their keep when there are 5+ optional fields; for 2 fields, two constructors (`new`, `with_empty_fund`) beat a builder.**
4. **`fund_balance` returns `i64` directly; `fund` returns `&InsuranceFund`.** Two access patterns, two methods. The bridge logs the balance often (`fund_balance` is one i64 — fast). The bridge occasionally inspects the full fund state (`fund` returns a borrow — `Copy` would also work, but borrow is more explicit). **Provide both the hot-path scalar and the cold-path full reference; let callers pick.**
5. **`into_fund` is the *consume-and-extract* pattern.** At chain shutdown (Stage 13+ in openhl), the bridge calls `scanner.into_fund()` to extract the fund state for snapshot/persistence. The method takes `self` by value (not `&self`), so the scanner is dropped after the call and the fund moves into the caller's hands. **`into_*` methods that take `self` by value signal "this is a one-shot, the original is gone."**
6. **Four of the five accessors are `const fn`.** All but `into_fund` can be evaluated at compile time because they don't move out of `self`. The `into_fund` consume-pattern can't be const because consuming `self` of a non-`Copy` type and destructuring it to move out an owned field is exactly the kind of ownership operation that current `const` contexts forbid (destructive moves of non-`Copy` locals and arguments are restricted at compile-time evaluation). **`const fn` everything you can; the limit is usually whether the function moves data.**
7. **No `set_*` methods.** The bridge mutates fund state via the (future) `scan` method, not by directly assigning to `self.fund`. A `set_fund(&mut self, f: InsuranceFund)` accessor would let the bridge bypass the scan loop, which is exactly the abstraction-breaking surface we want to prevent. **State machines expose mutation only through methods that implement the state-machine transitions — not through field setters.**

> 🛑 **Anti-fluency.** "Why does `LiquidationScanner` own an `InsuranceFund` by value, rather than taking it by reference (`fund: &'a mut InsuranceFund`) or sharing it (`fund: Arc<Mutex<InsuranceFund>>`)?" Three problems with the alternatives. (1) `&'a mut` introduces a lifetime parameter that propagates through every type the scanner appears in — call sites get noisier and `LiquidationScanner<'a>` shows up in every struct that holds one. (2) `Arc<Mutex<...>>` is for shared mutable state — the scanner isn't shared, the bridge owns it. Synchronization without contention is just runtime overhead. (3) Owning by value means the scanner's lifetime *is* the fund's lifetime; the `into_fund` method gives the caller a clean handoff at shutdown. **Ownership semantics match the lifecycle: per-bridge component, single mutator, persisted at shutdown.**

### Step 6: Wire the module into `lib.rs`

Open `crates/liquidation/src/lib.rs`. Three changes:

First, add the module declaration. Insert `scanner` after `insurance`:

```rust
pub mod compute;
pub mod insurance;
pub mod scanner;
pub mod types;
```

Second, add the scanner re-exports as a new line below the `insurance` re-export:

```rust
pub use compute::{
    account_equity, close_order_spec, liquidation_fee, margin_health, margin_ratio,
    notional_value, solvent_close_outcome, underwater_close_outcome, unrealized_pnl,
};
pub use insurance::{InsuranceFund, WithdrawOutcome};
pub use scanner::{CloseOutcomeKind, LiquidationRecord, LiquidationScanner, ScanReport};
pub use types::{
    AccountSnapshot, CloseOrderSpec, LiquidationParams, MarginHealth, MarginRatio, SolventClose,
    UnderwaterClose, MARGIN_SCALE,
};
```

All four scanner types (the enum + three structs) re-exported in one line, alphabetical inside the `{ }`.

Third, update the `lib.rs`-top roadmap comment to mark Stage 10c in progress. The exact change here depends on what your `lib.rs` preamble currently says — the answer key has Stage 10c marked "scanner shipping in this commit." Match that prose.

### Step 7: Run `cargo check`

```bash
cargo check -p openhl-liquidation
```

Expected output:

```
    Checking openhl-liquidation v0.1.0 (/path/to/openhl/crates/liquidation)
    Finished `dev` profile [optimized + debuginfo] target(s) in 1.2s
```

**Clean compile.** No tests run — we don't have a `scan` method yet, so there's nothing testable. The 55 existing tests from L10 still pass (`cargo test -p openhl-liquidation` confirms), but L11 doesn't add or modify any of them.

Common errors:

- **`unresolved import \`openhl_clob::AccountId\`** — the scanner depends on `openhl-clob` and `openhl-funding` for `AccountId` and `MarkPrice`. Make sure `crates/liquidation/Cargo.toml` lists both in `[dependencies]`. The answer-key crate already has them (L0's lesson set them up).
- **`unused import: \`account_equity\`** — clippy / rustc may warn that some imports are unused because L11 doesn't have a `scan` method that uses them. **These warnings are intentional at L11** — the imports are *staged* for L12, which consumes every one of them. If you keep a zero-warnings discipline, add `#[allow(unused_imports)]` to the top of `scanner.rs` for L11 only and delete the attribute when L12 lands; otherwise just leave the warnings — they go away the moment L12's `scan` body compiles. The answer-key doesn't `allow` because it ships L11 and L12 together. **No warning at L11 indicates a real issue; every unused-import warning here is expected.**
- **`pub mod scanner;` placement** — if you put it after `pub mod types;`, the alphabetical order breaks. The answer-key has them in alphabetical order inside `lib.rs`. Match that order.

## Design reflection

Three load-bearing decisions in this lesson:

1. **Type vocabulary before mechanism, again.** Same pattern as L8 (where `WithdrawOutcome` was declared in L8 but used in L9) and L10 (where `SolventClose` / `UnderwaterClose` were declared and immediately used). L11 declares the orchestration-layer types so L12's `scan` method has somewhere to put its return values. **A reader who lands on the file after L11 sees a complete type API surface; L12 fills in the verb.**

2. **The scanner owns the insurance fund by value.** Not `&'a mut`, not `Arc<Mutex<...>>`, not `Rc<RefCell<...>>`. The ownership decision is what makes the scanner usable without lifetime gymnastics or runtime overhead. **State-machine components that have a single mutator and a clear shutdown point should own their state by value.**

3. **Aggregate fields next to record vectors save the caller a fold.** `ScanReport.fund_deposits` is mathematically equal to a sum over `report.records.iter().map(|r| ...)` — but computing it inside the scan loop costs three `saturating_add` calls and saves the bridge an iteration. **Pre-compute aggregates inside single-pass loops; the cost is free and the API contract is cleaner.**

## Answer key

```bash
cd ~/code/openhl-reference
git checkout 0a8464e
diff -u ~/code/my-openhl/crates/liquidation/src/scanner.rs ./crates/liquidation/src/scanner.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
```

After L11:
- **scanner.rs** matches Stage 10c's `scanner.rs` **up through the `impl LiquidationScanner` block** for the accessors (everything except the `scan` method and the tests, which land in L12 + L13). Specifically: doc + imports + `CloseOutcomeKind` + `LiquidationRecord` + `ScanReport` + `LiquidationScanner` struct + `new` / `with_empty_fund` / `fund_balance` / `fund` / `into_fund`.
- **lib.rs** matches Stage 10c's `lib.rs` **byte-for-byte** for the `pub mod scanner;` line and the `pub use scanner::{...}` re-export.

## Common questions

**Q1: Why is `CloseOutcomeKind` named with the `Kind` suffix? Why not just `CloseOutcome`?**

Because `CloseOutcome` would clash mentally with the *outcome* fields inside `SolventClose` and `UnderwaterClose`. The suffix `Kind` says "this enum is about *which kind* of outcome happened" — making clear that the enum is the *dispatcher*, not the outcome data itself. **Suffix-naming (Kind, Type, Variant) is the Rust idiom for "this is the discriminator, not the data."**

**Q2: Why doesn't `LiquidationRecord` carry the post-close trader balance? The bridge needs it to credit the trader.**

Because that balance lives on the trader's account, not in the liquidation engine. The scanner produces a `SolventClose { fee_to_fund, residual_to_account }` — the `residual_to_account` is what the bridge adds to the trader's balance. The scanner doesn't *know* the trader's pre-liquidation balance; the bridge does. **Compute components produce deltas; balance owners apply them. Don't store data that lives elsewhere.**

**Q3: `ScanReport` has `Vec<LiquidationRecord>` — won't this allocate on every scan?**

Yes, and that's fine. The vec is at most one entry per Liquidatable account in the slice; in steady state on a healthy chain, most blocks see zero liquidations and the vec stays empty (which doesn't allocate). On a stressed chain with many liquidations, allocation is a microsecond next to the price of the actual liquidations. If profiling later shows it's hot, the bridge can pool `ScanReport` instances. **Don't pre-optimize allocations that are dwarfed by the work they accompany.**

**Q4: Could `LiquidationScanner` be generic over the fund type, `LiquidationScanner<F: Fund>`?**

You could, but the only existing implementation of `Fund` would be `InsuranceFund`, and adding the generic adds a type parameter that propagates through every caller. **Generics are for *interchangeable* implementations; with one implementation, concrete types beat generics.** If a future "redundant fund" (two-layered insurance) needs to swap, that's the time to introduce the trait — not before.

**Q5: `into_fund` consumes the scanner. What if the bridge wants the fund snapshot AND continued scanner operation?**

Use `fund()` (returns `&InsuranceFund`) and call `.balance()` or read other fields through the borrow. `into_fund` is specifically for *handoff at chain shutdown* — the bridge is done with the scanner. For mid-chain inspection, the borrow is the right pattern. **`into_*` is for terminal state; `fn x(&self) -> &T` is for inspection.**

**Q6: Why does `LiquidationRecord` carry `classification` (the pre-close `MarginHealth`) if the bridge can re-derive it from the snapshot at any point?**

The bridge *could* re-derive it, but only if it kept the pre-close snapshots around — which it usually doesn't. The scanner already has them (it iterated through them); storing the classification in the record is O(1) extra space per record and saves the bridge from having to maintain its own snapshot history. **A record that captures a derivation made earlier saves callers from having to redo the upstream work.**

## Next lesson (L12) — `scan` method + first 4 unit tests

L12 implements the orchestration heart — the `scan` method. The method takes `&[AccountSnapshot]` and `MarkPrice`, classifies every account via L6's `margin_health`, dispatches Liquidatable/Underwater accounts through L10's `solvent_close_outcome` / `underwater_close_outcome`, mutates the fund in place via L9's `InsuranceFund::deposit` and `::withdraw_shortfall`, and builds a `ScanReport` along the way.

L12 also adds the four simplest unit tests:
- `scan_empty_accounts_returns_empty_report` — sanity check.
- `scan_all_safe_accounts_does_nothing` — no liquidations means no records.
- `scan_atrisk_does_not_liquidate` — AtRisk is a *warning*, not a trigger.
- `scan_skips_flat_positions` — defensive guard for misclassified flats.

After L12, the scanner is *runnable* — 59 tests pass total (34 compute + 21 insurance + 4 new scanner tests). L13 stress-tests it with 5 more nuanced unit tests and 4 conservation-law proptests, bringing the final count to 68.

````

---

## Seed-file slot

L11 lands in a new Module 4 at sortOrder 0:

```typescript
{
  title: 'Lesson 11 — Scanner type vocabulary — CloseOutcomeKind, LiquidationRecord, ScanReport, LiquidationScanner',
  slug: 'openhl-liquidation-scanner-types-en',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 25,
  xpReward: 50,
  content: `# Lesson 11 — Scanner type vocabulary — CloseOutcomeKind, LiquidationRecord, ScanReport, LiquidationScanner\n\n...`
},
```

Module 4 metadata (new):

```typescript
4: { title: 'Scanner & capstone', sortOrder: 4 },
```

## SHA pinning discipline

L11 advances the SHA pin to `0a8464e` (Stage 10c — multi-account liquidation scanner). After L11, `scanner.rs` matches the answer key for the types + accessors section (everything before the `scan` method). L12 stays on `0a8464e`; L13 stays on `0a8464e` and adds the proptests. Stage 10 closes at L13.

## Style review notes (self-critique before paste)

- **L11 is the shortest Module 4 lesson** (25 min). Justified because the type vocabulary is *immediately* useful for orienting the reader — L12 then implements the verb that consumes these types. The pacing (types-only → verb → stress tests) mirrors L8 → L9 → L10 for the insurance module.
- **The "type vocabulary before mechanism" framing** is the third time this pattern appears in the course. L8 declared `WithdrawOutcome` without a method. L10 declared `SolventClose` / `UnderwaterClose` and used them immediately. L11 declares all four scanner types and uses none of them. The repetition tells the reader this is a *disciplined choice*, not an accident.
- **"Owns the fund by value" is the deepest design framing in L11.** It reappears in the Goal, in Step 5's "things to notice" #5, in the anti-fluency callout, and in Design reflection #2. The reader needs to internalize this so they don't later refactor to `Arc<Mutex<...>>` for a perceived "sharing" need. Hyperliquid's scanner is single-mutator; Solana's vaults are too. The pattern generalizes.
- **The `unfilled_deficit` field gets explicit Stage 10d cross-reference.** Stage 10c is engineered to produce a signal that Stage 10d will consume. Naming this in L11 (and again in the `ScanReport` doc) makes the staging visible — the reader understands that the *next* openhl stage will close the cascade by adding ADL.
- **No new tests in L11.** This is a deliberate choice — types-only lessons don't have behavior to test, and forcing tests onto them would test compilation rather than logic. The reader runs `cargo check` to verify the file parses, and runs `cargo test` to confirm L0-L10's 55 tests still pass. **L11 is the only lesson in the course without new tests; the next-lesson preview names this.**

