# Building OpenHL — L6 draft (EN) — C2 build-along rewrite

> Drafted against openhl SHA `784785b` (Stage 6 prep: Implement Malachite Context for OpenHlContext). This lesson is the **biggest one in the course** — 8 new files implementing all 10 Malachite Context sub-traits + the central Context binding.
> Course: `building-openhl-consensus-en` (track: `reth-l1-architect`, course #6 of 10).

---

## L6 — `openhl-malachite-context-en`

- **Module:** 4 (CL types), sortOrder 0 within module
- **Course-level sortOrder:** 5 (lesson 6 of 15)
- **Duration:** 50 min
- **XP reward:** 90
- **Type:** CONTENT

### Content

````markdown
# Lesson 6 — `OpenHlContext` and the 10 Malachite sub-types

## Goal

Concepts you'll grasp in this lesson:

- **The two-sided trait contract** — L3's `ConsensusBridge` is the trait *you own*, implemented by execution. Malachite's `Context` is the trait *Malachite owns*, implemented by you. Both directions of the interface are now type-level.
- **The Context associated-type pattern** — how a single `OpenHlContext;` empty struct names 10 sub-types (`Address`, `Height`, `Value`, `Validator`, `Vote`, …) without holding any state. This is the type-family idiom that lets Malachite be chain-generic.
- **Type-system-enforced invariants** — `OpenHlValidatorSet::new()` sorts at construction so an unsorted set is unrepresentable. Every method downstream can assume sorted order without re-checking. The compiler does the policing.
- **Deterministic proposer election** — `(height + round) % count` against a stake-sorted set. The simplest deterministic algorithm that every validator can verify identically; sophistication (random beacons, rotation rules) lives behind the same trait surface.
- **`PartialOrd / Ord` on signing keys** — why `OpenHlValidator` must be totally ordered for Malachite's internal collections, and how Ed25519 public keys give you that ordering for free.

Verification:

```bash
cargo test -p openhl-consensus
```

…passes **5 tests** covering: validator-set sort order, deterministic proposer election, proposal field round-trip, vote-type distinction (prevote vs precommit), and height arithmetic. Your chain now satisfies Malachite's `Context` trait — the type-level API surface Malachite needs to drive consensus over your chain's blocks.

This is the **largest lesson in the course** — 8 new files, ~330 lines. Each file is small but the count is high. Plan for two sittings if needed.

Specific changes:

- 2 Malachite deps + 1 dev-dep added to `crates/consensus/Cargo.toml`: `informalsystems-malachitebft-core-types`, `informalsystems-malachitebft-signing-ed25519`, `rand` (dev).
- `crates/consensus/src/types/` — 7 type files (`address.rs`, `height.rs`, `value.rs`, `validator.rs`, `proposal.rs`, `proposal_part.rs`, `vote.rs`) plus `mod.rs`.
- `crates/consensus/src/context.rs` — `OpenHlContext` empty struct + `impl Context for OpenHlContext` with the 4 factory methods.
- `crates/consensus/src/lib.rs` — wires `pub mod context; pub mod types;`.

## Recap

After L5 your workspace has both `ConsensusBridge` impls, but the consensus crate itself still only contains the trait (from L3). No Malachite integration yet:

```
crates/consensus/src/lib.rs:
  pub mod bridge;
crates/consensus/Cargo.toml:
  [dependencies]
  openhl-types, async-trait, thiserror, eyre
```

We need to wire Malachite in next.

## Plan

You'll build (in this order):

1. **Cargo.toml updates** — 2 Malachite deps (`-core-types` for the trait, `-signing-ed25519` for the crypto), 1 dev-dep (`rand 0.8` for keypair generation in tests).
2. **`crates/consensus/src/types/` directory** with `mod.rs` (module index) and 7 type files:
   - `address.rs` — `OpenHlAddress([u8; 20])`
   - `height.rs` — `OpenHlHeight(u64)` with monotonic arithmetic
   - `value.rs` — `OpenHlValue(BlockHash)` — what consensus agrees on
   - `validator.rs` — `OpenHlValidator` + `OpenHlValidatorSet` (with the **canonical sort order**)
   - `proposal.rs` — `OpenHlProposal` — a block proposal message
   - `proposal_part.rs` — `OpenHlProposalPart` (unit struct — we don't stream)
   - `vote.rs` — `OpenHlVote` — a prevote or precommit
3. **`crates/consensus/src/context.rs`** — `OpenHlContext` impl with 10 type associations + 4 factory methods including the **proposer-election algorithm**.
4. **`crates/consensus/src/lib.rs`** — wire `pub mod types; pub mod context; pub use context::OpenHlContext;`.
5. **5 unit tests** in `context.rs`.
6. **Run** `cargo test -p openhl-consensus` — 5 pass.

The shape of these types **propagates everywhere downstream**. L7 (SigningProvider) signs `OpenHlVote` and `OpenHlProposal`. L8 (Codec) encodes them. L9 (run_engine_app) handles AppMsg variants parameterized over `OpenHlContext`. **The design decisions you encode here propagate through 8 more lessons.**

> 🛑 **Predict.** Look at the type list above. Two of the 10 types deserve special attention because they encode load-bearing decisions:
> - `OpenHlValidatorSet` has a **specific sort order** that every validator must agree on
> - `OpenHlContext::select_proposer` uses a **specific algorithm**
>
> **Why must these two agree across validators?** Hint: what happens to the chain if validators pick different proposers for the same (height, round)?

## Walk-through

### Step 1: Update `crates/consensus/Cargo.toml`

Add to `[dependencies]`:

```toml
[dependencies]
openhl-types = { workspace = true }
async-trait  = { workspace = true }
thiserror    = { workspace = true }
eyre         = { workspace = true }

informalsystems-malachitebft-core-types      = { workspace = true }
informalsystems-malachitebft-signing-ed25519 = { workspace = true, features = ["rand"] }

[dev-dependencies]
rand = "0.8"
```

What each new dep is:

- **`informalsystems-malachitebft-core-types`** — defines the `Context` trait and all 10 sub-traits (`Address`, `Height`, `Value`, `Validator`, `ValidatorSet`, `Proposal`, `ProposalPart`, `Vote`, `Extension`, `SigningScheme`). This is the API surface we'll implement.
- **`informalsystems-malachitebft-signing-ed25519`** with `features = ["rand"]` — Malachite's Ed25519 implementation. `rand` feature enables `PrivateKey::generate(OsRng)` for tests (otherwise you'd have to supply a pre-built keypair).
- **`rand 0.8` (dev-dep)** — for `OsRng` used in test code only.

Verify deps resolve:

```bash
cargo check -p openhl-consensus
```

First check after this triggers Malachite fetch — couple of minutes.

### Step 2: Create the `types/` directory and `mod.rs`

```bash
mkdir crates/consensus/src/types
```

Create `crates/consensus/src/types/mod.rs`:

```rust
//! Concrete implementations of Malachite's `Context` sub-traits.

pub mod address;
pub mod height;
pub mod proposal;
pub mod proposal_part;
pub mod validator;
pub mod value;
pub mod vote;

pub use address::OpenHlAddress;
pub use height::OpenHlHeight;
pub use proposal::OpenHlProposal;
pub use proposal_part::OpenHlProposalPart;
pub use validator::{OpenHlValidator, OpenHlValidatorSet};
pub use value::OpenHlValue;
pub use vote::OpenHlVote;
```

This is the module index. Each `pub mod X;` line declares a submodule (with file `types/X.rs`); each `pub use` re-exports the main type so callers can write `crate::types::OpenHlAddress` instead of `crate::types::address::OpenHlAddress`.

**Why one file per type instead of one big types.rs?** Each type's impl is short (10-40 lines), but the design decisions in each are distinct. A separate file per type means lessons (this one) can walk one type at a time and code reviews can focus on one type's changes without scrolling past unrelated code.

### Step 3: Write the three "simple" types — `address.rs`, `height.rs`, `value.rs`

Each is ~20 lines. Walk them in order.

**`crates/consensus/src/types/address.rs`:**

```rust
use core::fmt;

use informalsystems_malachitebft_core_types::Address;

/// A 20-byte validator address, Ethereum convention.
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct OpenHlAddress(pub [u8; 20]);

impl fmt::Display for OpenHlAddress {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("0x")?;
        for b in &self.0 {
            write!(f, "{b:02x}")?;
        }
        Ok(())
    }
}

impl Address for OpenHlAddress {}
```

Notice the pattern: newtype over `[u8; 20]`, all the standard derives, hex Display for logs, then **an empty `impl Address`**. The `Address` trait has no methods of its own — it just *requires* the derives. We satisfy it by being `Clone + Copy + Debug + Display + PartialEq + Eq + PartialOrd + Ord + Hash`.

**`crates/consensus/src/types/height.rs`:**

```rust
use core::fmt;

use informalsystems_malachitebft_core_types::Height;

/// Block height — a monotonic u64 counter.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct OpenHlHeight(pub u64);

impl fmt::Display for OpenHlHeight {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl Height for OpenHlHeight {
    const ZERO: Self = OpenHlHeight(0);
    const INITIAL: Self = OpenHlHeight(1);

    fn increment_by(&self, n: u64) -> Self {
        OpenHlHeight(self.0.saturating_add(n))
    }

    fn decrement_by(&self, n: u64) -> Option<Self> {
        self.0.checked_sub(n).map(OpenHlHeight)
    }

    fn as_u64(&self) -> u64 {
        self.0
    }
}
```

Three constants + three methods. `ZERO` is the absolute zero; `INITIAL` is the first valid block height (1, not 0 — genesis is block 0 but isn't "produced" by consensus, so consensus rounds start at 1). `increment_by` uses `saturating_add` to avoid panic on overflow. `decrement_by` returns `Option` because going below zero is invalid; `checked_sub` returns `None` instead of panicking.

**`crates/consensus/src/types/value.rs`:**

```rust
use informalsystems_malachitebft_core_types::Value;
use openhl_types::BlockHash;

/// The value consensus agrees on: an EVM block, identified by its block hash.
///
/// For v0 we store only the hash since the EVM bridge is the source of truth
/// for block contents. Module 2 will extend this to carry the full block once
/// the CLOB starts producing fills that need to be ordered alongside EVM txs.
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct OpenHlValue(pub BlockHash);

impl Value for OpenHlValue {
    type Id = BlockHash;

    fn id(&self) -> Self::Id {
        self.0
    }
}
```

`OpenHlValue` wraps `BlockHash` (from L2). The `Value::Id` associated type is what gets put in votes — consensus doesn't vote on the full value, it votes on the value's *identifier* (the hash). Here `Id = BlockHash`, so the value and its ID happen to be the same data.

> 🛑 **Anti-fluency.** "Why isn't `Value` just `BlockHash` directly — why wrap it?" **Because the `Value` trait has its own bounds**. Specifically `Value: Clone + Debug + Eq + Ord + Send + Sync`, and the `Value::Id` associated type adds its own bounds. By having `OpenHlValue` as a wrapper, we can independently evolve what "value" means without changing `BlockHash`. Module 2 (CLOB) will likely add fields here that aren't in `BlockHash` (e.g., a list of off-EVM fills).

Run `cargo check -p openhl-consensus` after typing these three. Should pass.

### Step 4: Write `validator.rs` — the canonical sort order

This is the longest type file. ~75 lines.

```rust
use informalsystems_malachitebft_core_types::{Validator, ValidatorSet, VotingPower};
use informalsystems_malachitebft_signing_ed25519::PublicKey;

use crate::context::OpenHlContext;
use crate::types::OpenHlAddress;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct OpenHlValidator {
    pub address: OpenHlAddress,
    pub public_key: PublicKey,
    pub voting_power: VotingPower,
}

impl OpenHlValidator {
    #[must_use]
    pub const fn new(address: OpenHlAddress, public_key: PublicKey, voting_power: VotingPower) -> Self {
        Self { address, public_key, voting_power }
    }
}

impl Validator<OpenHlContext> for OpenHlValidator {
    fn address(&self) -> &OpenHlAddress {
        &self.address
    }

    fn public_key(&self) -> &PublicKey {
        &self.public_key
    }

    fn voting_power(&self) -> VotingPower {
        self.voting_power
    }
}

/// A validator set, kept sorted by (`voting_power` desc, address asc).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct OpenHlValidatorSet(Vec<OpenHlValidator>);

impl OpenHlValidatorSet {
    /// Construct a validator set and enforce the canonical sort order.
    #[must_use]
    pub fn new(mut validators: Vec<OpenHlValidator>) -> Self {
        validators.sort_by(|a, b| {
            b.voting_power
                .cmp(&a.voting_power)
                .then_with(|| a.address.cmp(&b.address))
        });
        Self(validators)
    }

    #[must_use]
    pub fn validators(&self) -> &[OpenHlValidator] {
        &self.0
    }
}

impl ValidatorSet<OpenHlContext> for OpenHlValidatorSet {
    fn count(&self) -> usize {
        self.0.len()
    }

    fn total_voting_power(&self) -> VotingPower {
        self.0.iter().map(|v| v.voting_power).sum()
    }

    fn get_by_address(&self, address: &OpenHlAddress) -> Option<&OpenHlValidator> {
        self.0.iter().find(|v| &v.address == address)
    }

    fn get_by_index(&self, index: usize) -> Option<&OpenHlValidator> {
        self.0.get(index)
    }
}
```

**This is the single most load-bearing file in the lesson.**

`OpenHlValidator` is straightforward: address + public_key + voting_power, exposed via 3 accessor methods on the `Validator` trait. The interesting work is in `OpenHlValidatorSet::new`:

```rust
validators.sort_by(|a, b| {
    b.voting_power.cmp(&a.voting_power)         // primary: power desc
        .then_with(|| a.address.cmp(&b.address)) // tiebreaker: address asc
});
```

This is the **canonical CometBFT validator-set sort order**: voting power descending, then address ascending as tiebreaker. **Every validator must apply this same sort to the same input set**. Why?

Because `OpenHlContext::select_proposer` (which we write in Step 8) does `validator_set.get_by_index((height + round) % count)`. If validator A sorts the set one way and validator B sorts it differently, they pick different proposers for the same `(height, round)`. **The chain forks at the first round.** The sort order *is* the proposer-election protocol.

Other BFT chains (CometBFT, every Cosmos chain) use the exact same sort. Following the convention isn't just convenience — it makes our chain *behave identically* to the BFT canon on the same input set.

> 🛑 **Anti-fluency.** "Why descend by power, ascend by address? Why not both ascending?" **Because higher-stake validators should propose proportionally more often** — `(height + round) % count` is uniform across indices, so higher-power validators at lower indices proposing more is a property of the sort. Address as tiebreaker (ascending) is just a stable deterministic choice; any total ordering would work, but address-ascending is what CometBFT picked.

### Step 5: Write the message types — `proposal.rs`, `proposal_part.rs`, `vote.rs`

Three files, each implementing one message-type trait.

**`crates/consensus/src/types/proposal.rs`:**

```rust
use informalsystems_malachitebft_core_types::{Proposal, Round};

use crate::context::OpenHlContext;
use crate::types::{OpenHlAddress, OpenHlHeight, OpenHlValue};

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct OpenHlProposal {
    pub height: OpenHlHeight,
    pub round: Round,
    pub value: OpenHlValue,
    pub pol_round: Round,
    pub address: OpenHlAddress,
}

impl Proposal<OpenHlContext> for OpenHlProposal {
    fn height(&self) -> OpenHlHeight {
        self.height
    }

    fn round(&self) -> Round {
        self.round
    }

    fn value(&self) -> &OpenHlValue {
        &self.value
    }

    fn take_value(self) -> OpenHlValue {
        self.value
    }

    fn pol_round(&self) -> Round {
        self.pol_round
    }

    fn validator_address(&self) -> &OpenHlAddress {
        &self.address
    }
}
```

`OpenHlProposal` is a typed message: "validator X proposes value Y at (height, round) with proof-of-lock-on-round Z." The `Proposal` trait has 6 accessor methods we satisfy by reading fields from `self`.

`pol_round` (Proof of Lock Round) is a Tendermint concept: if you proposed this value because you locked on it in round Z, that's `pol_round`. For first-time proposals it's `Round::Nil`.

**`crates/consensus/src/types/proposal_part.rs`:**

```rust
use informalsystems_malachitebft_core_types::ProposalPart;

use crate::context::OpenHlContext;

/// Unit proposal part — `OpenHL` runs in `ValuePayload::ProposalOnly` mode, so
/// the entire value ships in the `Proposal` message and parts are unused.
/// The type is required by the `Context` trait surface anyway.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct OpenHlProposalPart;

impl ProposalPart<OpenHlContext> for OpenHlProposalPart {
    fn is_first(&self) -> bool {
        true
    }

    fn is_last(&self) -> bool {
        true
    }
}
```

A unit struct — the smallest possible type. **Why?** Because Malachite has two modes for proposing large values:

- **`ValuePayload::ProposalOnly`** (what we use) — entire value ships in the `Proposal` message
- **`ValuePayload::ProposalAndParts`** — proposal references parts; parts ship separately

We run ProposalOnly because our `OpenHlValue` is just a `BlockHash` (32 bytes). No streaming needed. But the `Context` trait still requires us to *associate* a `ProposalPart` type — we satisfy this with a unit struct that's never instantiated in our chain. The `is_first` and `is_last` return `true` so any code that does check them produces consistent results.

**`crates/consensus/src/types/vote.rs`:**

```rust
use informalsystems_malachitebft_core_types::{
    NilOrVal, Round, SignedExtension, VoteType, Vote as VoteTrait,
};
use openhl_types::BlockHash;

use crate::context::OpenHlContext;
use crate::types::{OpenHlAddress, OpenHlHeight};

#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct OpenHlVote {
    pub height: OpenHlHeight,
    pub round: Round,
    pub value_id: NilOrVal<BlockHash>,
    pub vote_type: VoteType,
    pub address: OpenHlAddress,
}

impl VoteTrait<OpenHlContext> for OpenHlVote {
    fn height(&self) -> OpenHlHeight {
        self.height
    }

    fn round(&self) -> Round {
        self.round
    }

    fn value(&self) -> &NilOrVal<BlockHash> {
        &self.value_id
    }

    fn take_value(self) -> NilOrVal<BlockHash> {
        self.value_id
    }

    fn vote_type(&self) -> VoteType {
        self.vote_type
    }

    fn validator_address(&self) -> &OpenHlAddress {
        &self.address
    }

    fn extension(&self) -> Option<&SignedExtension<OpenHlContext>> {
        None
    }

    fn take_extension(&mut self) -> Option<SignedExtension<OpenHlContext>> {
        None
    }

    fn extend(self, _extension: SignedExtension<OpenHlContext>) -> Self {
        self
    }
}
```

`OpenHlVote` is the message type for both **prevotes** and **precommits**. The `vote_type` field distinguishes which; otherwise the structure is identical. Same with the field set: validator address, the height and round being voted on, and the value being voted for (or `Nil` for "I vote against any value at this round").

The three extension methods return `None` / no-op. **Vote extensions** are a Malachite feature: validators can attach extra data to their precommits (e.g., light-client state). We don't use them at v0 — `Extension = ()` in the Context impl (Step 6), and these methods are stubbed.

**Why `NilOrVal<BlockHash>` instead of `Option<BlockHash>`?** Both are essentially "maybe a value." But `NilOrVal` is Malachite's BFT-specific concept: `Nil` means "I'm voting against any value at this round" (different from "I don't have an opinion"). `Option` would lose that nuance.

### Step 6: Write `context.rs` — the binding

This file ties all 10 types together into the `Context` impl. It's the longest file (~185 lines including tests). Let's break it into pieces.

Top of `crates/consensus/src/context.rs`:

```rust
//! `OpenHlContext` — the central abstraction Malachite uses to know about our chain.
//!
//! Once this trait is implemented, the entire `malachitebft-core-consensus` and
//! `malachitebft-engine` machinery can drive consensus over our types.

use informalsystems_malachitebft_core_types::{
    Context, NilOrVal, Round, ValidatorSet as _, ValueId, VoteType,
};
use informalsystems_malachitebft_signing_ed25519::Ed25519;

use crate::types::{
    OpenHlAddress, OpenHlHeight, OpenHlProposal, OpenHlProposalPart, OpenHlValidator,
    OpenHlValidatorSet, OpenHlValue, OpenHlVote,
};

#[derive(Clone, Debug, Default)]
pub struct OpenHlContext;
```

`OpenHlContext` is a **unit struct** — no fields. It doesn't carry state; it's just a marker that holds the type associations. Many BFT chains' Context types are also stateless.

Then the `impl Context for OpenHlContext` block. The 10 type associations:

```rust
impl Context for OpenHlContext {
    type Address = OpenHlAddress;
    type Height = OpenHlHeight;
    type ProposalPart = OpenHlProposalPart;
    type Proposal = OpenHlProposal;
    type Validator = OpenHlValidator;
    type ValidatorSet = OpenHlValidatorSet;
    type Value = OpenHlValue;
    type Vote = OpenHlVote;
    type Extension = ();
    type SigningScheme = Ed25519;
    // ...continued below
```

10 type bindings — one for each `Context` sub-trait. The 8 we just wrote, plus:

- **`Extension = ()`** — no vote extensions. The unit type satisfies the trait's bounds without us writing a real extension type.
- **`SigningScheme = Ed25519`** — use Malachite's Ed25519 implementation directly. Most BFT chains use Ed25519; some use BLS for signature aggregation. We pick Ed25519 because Malachite ships an implementation and it's simpler.

Then the 4 factory methods. **`select_proposer`** is the most important:

```rust
    fn select_proposer<'a>(
        &self,
        validator_set: &'a Self::ValidatorSet,
        height: Self::Height,
        round: Round,
    ) -> &'a Self::Validator {
        let count = validator_set.count();
        assert!(count > 0, "validator set is empty");
        let round_u64 = u64::try_from(round.as_i64().max(0)).unwrap_or(0);
        let index_u64 = height.0.wrapping_add(round_u64);
        let index = usize::try_from(index_u64).unwrap_or(usize::MAX) % count;
        validator_set
            .get_by_index(index)
            .expect("index < count by construction")
    }
```

The proposer-election algorithm. **`(height + round) % count`** picks an index into the sorted validator set. Because:

1. The validator set was sorted canonically in `OpenHlValidatorSet::new` (Step 4), every validator has the same indexing.
2. Given the same `(height, round)`, every validator computes the same `index`.
3. Therefore every validator picks the same proposer.

The arithmetic is careful: `wrapping_add` on `u64` avoids overflow; `% count` then yields a valid index. The `.expect` is provable: `index < count` because we just computed it as `... % count`.

Then `new_proposal`, `new_prevote`, `new_precommit` — three factory methods that construct typed messages:

```rust
    fn new_proposal(
        &self,
        height: Self::Height,
        round: Round,
        value: Self::Value,
        pol_round: Round,
        address: Self::Address,
    ) -> Self::Proposal {
        OpenHlProposal { height, round, value, pol_round, address }
    }

    fn new_prevote(
        &self,
        height: Self::Height,
        round: Round,
        value_id: NilOrVal<ValueId<Self>>,
        address: Self::Address,
    ) -> Self::Vote {
        OpenHlVote {
            height,
            round,
            value_id,
            vote_type: VoteType::Prevote,
            address,
        }
    }

    fn new_precommit(
        &self,
        height: Self::Height,
        round: Round,
        value_id: NilOrVal<ValueId<Self>>,
        address: Self::Address,
    ) -> Self::Vote {
        OpenHlVote {
            height,
            round,
            value_id,
            vote_type: VoteType::Precommit,
            address,
        }
    }
}
```

These are short because all the work is field assignment. The interesting thing is that `new_prevote` and `new_precommit` produce the same struct (`OpenHlVote`) but with different `vote_type` values — the type system enforces the distinction at construction.

### Step 7: Wire into `lib.rs`

Open `crates/consensus/src/lib.rs`. Current state:

```rust
//! Consensus layer — Malachite BFT.

pub mod bridge;
```

Change to:

```rust
//! Consensus layer — Malachite BFT.

pub mod bridge;
pub mod context;
pub mod types;

pub use context::OpenHlContext;
```

`pub mod` declarations expose the modules. `pub use context::OpenHlContext;` re-exports the central type so downstream crates write `use openhl_consensus::OpenHlContext;` (cleaner than `use openhl_consensus::context::OpenHlContext;`).

### Step 8: Add 5 unit tests

Append to `crates/consensus/src/context.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use informalsystems_malachitebft_core_types::{
        Height as HeightTrait, Proposal as ProposalTrait, Validator, ValidatorSet,
        Vote as VoteTrait,
    };
    use informalsystems_malachitebft_signing_ed25519::PrivateKey;
    use openhl_types::BlockHash;
    use rand::rngs::OsRng;

    fn validator(addr_byte: u8, power: u64) -> OpenHlValidator {
        let private = PrivateKey::generate(OsRng);
        let public = private.public_key();
        OpenHlValidator::new(OpenHlAddress([addr_byte; 20]), public, power)
    }

    #[test]
    fn validator_set_is_sorted_by_power_then_address() {
        let set = OpenHlValidatorSet::new(vec![
            validator(0x01, 100),
            validator(0x02, 300),
            validator(0x03, 200),
        ]);
        let powers: Vec<u64> = set
            .validators()
            .iter()
            .map(Validator::voting_power)
            .collect();
        assert_eq!(powers, vec![300, 200, 100]);
        assert_eq!(set.total_voting_power(), 600);
        assert_eq!(set.count(), 3);
    }

    #[test]
    fn select_proposer_round_robins_deterministically() {
        let ctx = OpenHlContext;
        let set = OpenHlValidatorSet::new(vec![
            validator(0x01, 100),
            validator(0x02, 100),
            validator(0x03, 100),
        ]);
        let h = OpenHlHeight(7);
        let p1 = ctx.select_proposer(&set, h, Round::new(0)).address;
        let p2 = ctx.select_proposer(&set, h, Round::new(0)).address;
        assert_eq!(p1, p2);

        let p3 = ctx.select_proposer(&set, h.increment(), Round::new(0)).address;
        assert_ne!(p1, p3);
    }

    #[test]
    fn new_proposal_round_trips_fields() {
        let ctx = OpenHlContext;
        let addr = OpenHlAddress([0xaa; 20]);
        let value = OpenHlValue(BlockHash([0xbb; 32]));
        let proposal = ctx.new_proposal(
            OpenHlHeight(5),
            Round::new(1),
            value,
            Round::Nil,
            addr,
        );
        assert_eq!(ProposalTrait::height(&proposal), OpenHlHeight(5));
        assert_eq!(*ProposalTrait::value(&proposal), value);
        assert_eq!(*ProposalTrait::validator_address(&proposal), addr);
    }

    #[test]
    fn new_prevote_and_precommit_have_distinct_types() {
        let ctx = OpenHlContext;
        let addr = OpenHlAddress([0xaa; 20]);
        let vid: NilOrVal<BlockHash> = NilOrVal::Val(BlockHash([0xbb; 32]));
        let prevote = ctx.new_prevote(OpenHlHeight(5), Round::new(0), vid, addr);
        let precommit = ctx.new_precommit(OpenHlHeight(5), Round::new(0), vid, addr);
        assert_eq!(VoteTrait::vote_type(&prevote), VoteType::Prevote);
        assert_eq!(VoteTrait::vote_type(&precommit), VoteType::Precommit);
    }

    #[test]
    fn height_increment_and_decrement() {
        let h = OpenHlHeight::INITIAL;
        assert_eq!(h.as_u64(), 1);
        assert_eq!(h.increment().as_u64(), 2);
        assert_eq!(OpenHlHeight::ZERO.decrement(), None);
        assert_eq!(OpenHlHeight(5).decrement().unwrap().as_u64(), 4);
    }
}
```

Five tests covering:

1. **`validator_set_is_sorted_by_power_then_address`** — Construct a 3-validator set with shuffled powers (100, 300, 200), verify the output is [300, 200, 100]. Proves the canonical sort order from Step 4 works.
2. **`select_proposer_round_robins_deterministically`** — Same height + same round → same proposer (determinism). Different height → different proposer (rotation).
3. **`new_proposal_round_trips_fields`** — Construct via `new_proposal`, read back via `Proposal` trait methods. Verifies the factory ↔ accessor pair.
4. **`new_prevote_and_precommit_have_distinct_types`** — Same arguments, but `new_prevote` produces `VoteType::Prevote` and `new_precommit` produces `VoteType::Precommit`. Proves the factory does its job.
5. **`height_increment_and_decrement`** — `INITIAL.increment() == 2`, `ZERO.decrement() == None`, `5.decrement() == Some(4)`. Verifies the arithmetic methods.

Note: `h.increment()` (not `h.increment_by(1)`) — `increment` is a default method on the `Height` trait that calls `increment_by(1)`. Similar for `decrement`.

## Test

```bash
cargo test -p openhl-consensus
```

Expected:

```
running 5 tests
test context::tests::height_increment_and_decrement ... ok
test context::tests::new_prevote_and_precommit_have_distinct_types ... ok
test context::tests::new_proposal_round_trips_fields ... ok
test context::tests::select_proposer_round_robins_deterministically ... ok
test context::tests::validator_set_is_sorted_by_power_then_address ... ok

test result: ok. 5 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

Common errors and fixes:

- **`cannot find trait 'Address' in scope`** — `use informalsystems_malachitebft_core_types::Address;` is missing from `address.rs`.
- **`expected struct 'OpenHlContext', found ...`** — One of the type files has `crate::context::OpenHlContext` imported but the file doesn't exist yet. Make sure you wrote `context.rs` before you wrote the type files (or write the types first with `crate::OpenHlContext` placeholders, fill `context.rs` next).
- **`method 'increment' not found`** — Malachite's `Height` trait provides `increment()` as a default method that calls `increment_by(1)`. Make sure your impl provides `increment_by`, not `increment`.
- **`first_validator_set sort produces a different order`** — The sort comparator must be `b.voting_power.cmp(&a.voting_power)` (note: `b` first for descending), not `a.voting_power.cmp(&b.voting_power)`.

## Design reflection

Three load-bearing decisions encoded:

1. **One file per Context sub-type.** Could have been one big `context.rs` with all 10 types defined inline. The split makes lessons (this one, and future ones citing individual types) more focused, but the cost is 8 files for what could be 1. We chose the split because the **trait surfaces are independently load-bearing** — `Validator` decisions are different from `Vote` decisions, and code reviews are easier when changes are localized.

2. **`OpenHlValidatorSet` sorts in `new()`, not in a separate `sort()` method.** Means you can't construct an unsorted set. The type system encodes "this set is always sorted" — there's no API path that produces an unsorted set. This propagates: every method on the set assumes sorted order, which is now an invariant the compiler helps enforce.

3. **`select_proposer = (height + round) % count`** — the dead simplest possible algorithm. Malachite supports more sophisticated proposer selection (weighted by stake, with rotation that prevents same-validator-twice, etc.). We pick the simplest because:
   - It's deterministic
   - It's verifiable by every validator
   - The complexity of "fair stake-weighted rotation" lives in `OpenHlValidatorSet::new`'s sort, not in `select_proposer` itself
   - Higher-stake validators are at lower indices and naturally proposer-elected more often via the modulo
   
   This is the same approach CometBFT uses. If we needed sophisticated rotation (e.g., random beacon-based proposer selection), this method body changes — but the trait surface stays identical.

## Answer key

```bash
cd ~/code/openhl-reference
git checkout 784785b
diff -ur ~/code/my-openhl/crates/consensus/src/types ./crates/consensus/src/types
diff -u ~/code/my-openhl/crates/consensus/src/context.rs ./crates/consensus/src/context.rs
diff -u ~/code/my-openhl/crates/consensus/Cargo.toml ./crates/consensus/Cargo.toml
diff -u ~/code/my-openhl/crates/consensus/src/lib.rs ./crates/consensus/src/lib.rs
```

Variations OK in doc comments and test ordering. The shapes of each type, the sort comparator in `OpenHlValidatorSet::new`, and the `select_proposer` body should match closely.

Return:

```bash
git checkout main
```

## Common questions

**Q: My validator set sort produces (100, 200, 300) instead of (300, 200, 100). What's wrong?**
You wrote `a.voting_power.cmp(&b.voting_power)` (ascending). The correct comparator is `b.voting_power.cmp(&a.voting_power)` (descending) — note `b.cmp(&a)` not `a.cmp(&b)`. Higher-stake validators should sort *earlier* (lower index).

**Q: `select_proposer` panics with "validator set is empty." Why?**
Your test created an empty `OpenHlValidatorSet`. Real chains have at least one validator (single-validator devnet) or 4+ (multi-validator with byzantine tolerance). The assertion catches the malformed-config case before it causes a modulo-by-zero. If you see it in unit tests, your test setup is wrong; if you see it in production, your config loader is wrong.

**Q: Can `OpenHlContext` have state (e.g., chain config)?**
Yes — change `pub struct OpenHlContext;` to `pub struct OpenHlContext { chain_id: u64 }` or similar. The Context trait doesn't forbid state. But most BFT chains' Context types are stateless because the context's job is to *associate types*, not to *hold runtime config*. Runtime config lives in `OpenHlConfig` (which we'll see in L8).

**Q: Why are `Extension` set to `()` and the vote-extension methods stubbed to `None`?**
Because openhl v0 doesn't use vote extensions. Production BFT chains use them for things like submitting light-client snapshots alongside precommits. Implementing them requires choosing what data to attach, how to serialize it, and how to verify it on the other end. We deliberately scope that out until there's a concrete use case.

## Next lesson (L7)

You have all 10 Context sub-types and the 4 factory methods. Malachite knows what your chain's addresses, heights, values, validators, and messages look like. But **nothing is signed yet**. L7 implements `OpenHlSigningProvider` — the trait that produces Ed25519 signatures over `OpenHlVote` and `OpenHlProposal` messages. This is the **other half** of the bidirectional Context surface — Context says "here are my types," SigningProvider says "here's how to sign them."
````

---

## Seed-file slot

L6 lands in Module 4 (CL types) at sortOrder 0:

```typescript
{
  title: 'Lesson 6 — OpenHlContext and the 10 Malachite sub-types',
  slug: 'openhl-malachite-context-en',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 50,
  xpReward: 90,
  content: `# Lesson 6 — \`OpenHlContext\` and the 10 Malachite sub-types\n\n...`
},
```

## SHA pinning discipline

L6 references one openhl commit (§Answer key):
- `784785b` (Stage 6 prep: Implement Malachite Context for OpenHlContext)

## Style review notes (self-critique before paste)

- **L6 is 50 min — the longest lesson in the course.** 8 new files, ~330 lines. Each file is small individually; the count is what drives the duration.
- **The "predict" callout in §Plan** focuses readers on the two load-bearing decisions before they encounter the code: ValidatorSet sort + select_proposer algorithm. These two are the only places where divergence forks the chain.
- **Step 4's "this is the single most load-bearing file" claim** is the lesson's most important framing. Without it, readers might skim the sort comparator as boilerplate.
- **The "Anti-fluency" in Step 3 (why wrap BlockHash in OpenHlValue)** is the test-double-vs-real-type pattern from L4/L5 in a different guise — the wrapper lets evolution happen independently.
- **The walk-through is split into many sub-files** (3 simple + 1 complex + 3 message types + 1 context). This is deliberate: each file has its own design rationale, and grouping them by complexity gives readers a natural breath between sittings.
- **The 5 tests are minimal but cover the load-bearing decisions**: sort order, deterministic proposer election, message round-trip, vote-type distinction, height arithmetic. Each test is a regression guard for one design decision.
