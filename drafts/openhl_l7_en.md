# Building OpenHL — L7 draft (EN) — C2 build-along rewrite

> Drafted against openhl SHAs `23c2ba4` (signing.rs canonical encoding) and `9e810a7` (Stage 6a: OpenHlSigningProvider). The build-along course combines these two pieces in one lesson since they belong together pedagogically.
> Course: `building-openhl-consensus-en` (track: `reth-l1-architect`, course #6 of 10).

---

## L7 — `openhl-signing-provider-en`

- **Module:** 4 (CL types), sortOrder 1 within module
- **Course-level sortOrder:** 6 (lesson 7 of 15)
- **Duration:** 40 min
- **XP reward:** 80
- **Type:** CONTENT

### Content

````markdown
# Lesson 7 — `OpenHlSigningProvider` and canonical encoding

## Goal

Concepts you'll grasp in this lesson:

- **Canonical encoding is consensus-critical** — why the byte layout that goes into a signature is *part of the chain's spec*, not derived from `serde::Serialize`. Two validators with different serde versions would produce different bytes for the same vote, sign different things, and fork.
- **Pure functions wrapped by a stateful provider** — `sign_vote(vote, &sk)` is a free function (tests call it directly); `OpenHlSigningProvider` holds the key and exposes `sp.sign_vote(vote)` for Malachite. One logic, two call sites.
- **Tamper detection via signature failure** — Ed25519 doesn't *know* what's tampered; it just fails to verify. The test that flips a byte in a vote then expects verification to fail is how you prove canonical encoding covers every consensus-relevant field.
- **Type-system separation of public/private keys** — Ed25519 puts `sign` on `PrivateKey` only, never on `PublicKey`. The compiler refuses to let you sign with the public key.
- **Empty-bytes signatures for unused features** — when the trait surface requires sign methods for features you don't use (vote extensions, proposal parts), signing deterministic empty data honors the contract without committing to data you don't have.

Verification:

```bash
cargo test -p openhl-consensus
```

…passes **14 tests** (5 from L6's Context impl + 9 new ones for signing and the SigningProvider). The 9 new tests cover: round-trip sign/verify for each of the 4 signable types (vote, proposal, proposal_part, vote_extension), tamper detection on votes and proposals, and cross-provider verification rejection.

Specific changes:

- `crates/consensus/src/signing.rs` — canonical byte encoding for `OpenHlVote` and `OpenHlProposal`, low-level `sign_vote / sign_proposal / verify_vote` functions, `VerifierLike` shim, 2 unit tests.
- `crates/consensus/src/signing_provider.rs` — `OpenHlSigningProvider` struct holding a `PrivateKey`, `impl SigningProvider<OpenHlContext>` with 8 methods (4 sign/verify pairs), 7 unit tests.
- `crates/consensus/src/lib.rs` — wires `pub mod signing; pub mod signing_provider;`.
- No Cargo.toml changes (the `informalsystems-malachitebft-signing-ed25519` dep came in at L6).

## Recap

After L6 your `openhl-consensus` crate has:

```
crates/consensus/src/lib.rs   — pub mod bridge, context, types
crates/consensus/src/types/   — 7 type files + mod.rs
crates/consensus/src/context.rs — OpenHlContext + Context impl + 5 tests
```

`cargo test -p openhl-consensus` passes 5 tests. **No signing exists yet** — votes and proposals are constructable, but nothing in the codebase produces or verifies signatures over them.

## Plan

Five things:

1. **Create `crates/consensus/src/signing.rs`** with: canonical byte encoding functions for `OpenHlVote` and `OpenHlProposal`, low-level `sign_vote` / `sign_proposal` / `verify_vote` functions, and a `VerifierLike` trait shim with 2 unit tests.
2. **Create `crates/consensus/src/signing_provider.rs`** with: `OpenHlSigningProvider` struct holding a `PrivateKey`, an `impl SigningProvider<OpenHlContext>` block with 8 methods (4 sign/verify pairs), and 7 unit tests.
3. **Wire both modules into `lib.rs`** via `pub mod signing; pub mod signing_provider;`.
4. **No Cargo.toml changes** — `informalsystems-malachitebft-signing-ed25519` was added in L6 with the `rand` feature, which is all we need.
5. **Run** `cargo test -p openhl-consensus` — 14 tests pass.

This lesson teaches **two patterns** that propagate:

- **Canonical encoding** — turning a typed message into a deterministic byte sequence that every validator computes identically. The signature commits to *the bytes*, not *the struct*; if any field's encoding changes, the signature stops verifying.
- **Trait-trait wiring** — Malachite's `SigningProvider` is a trait that **wraps** the lower-level signing logic in `signing.rs`. The provider holds runtime state (the key), and delegates to pure functions that don't. This is the same separation as `ConsensusBridge` (trait) vs `InMemoryEvmBridge` (struct that impls it).

> 🛑 **Predict.** Before scrolling: the canonical encoding for a `Vote` needs to capture which fields? Hint: think about what a signature is committing to. If two votes differ in any way that consensus cares about, their signing bytes must differ — otherwise a valid signature for one verifies against the other, and an attacker can replay or swap votes.

## Walk-through

### Step 1: Create `crates/consensus/src/signing.rs`

Start with the module doc and imports:

```rust
//! Canonical encoding + signing for proposals and votes.
//!
//! v0 uses a simple length-prefixed concatenation rather than Protobuf/SSZ.
//! Real production validators will want a stable serialization format
//! (Module 2's `openhl-codec` crate is the natural home for that).

use informalsystems_malachitebft_core_types::{NilOrVal, Round, SignedMessage, VoteType};
use informalsystems_malachitebft_signing_ed25519::{PrivateKey, Signature};

use crate::types::{OpenHlProposal, OpenHlVote};
```

What each import is for:
- `NilOrVal, Round, VoteType` — Malachite types that appear inside our `OpenHlVote` / `OpenHlProposal`
- `SignedMessage` — Malachite's wrapper that pairs a message with its signature
- `PrivateKey, Signature` — Ed25519 key and signature types from Malachite
- Our `OpenHlProposal, OpenHlVote` — the message types we'll be encoding

### Step 2: Write the canonical encoding for `OpenHlVote`

This is the load-bearing function. Add it next:

```rust
/// Canonical bytes that a vote signature commits to.
#[must_use]
pub fn vote_signing_bytes(v: &OpenHlVote) -> Vec<u8> {
    let mut buf = Vec::with_capacity(128);
    buf.extend_from_slice(&v.height.0.to_le_bytes());
    buf.extend_from_slice(&round_to_i64(v.round).to_le_bytes());
    buf.push(match v.vote_type {
        VoteType::Prevote => 0,
        VoteType::Precommit => 1,
    });
    match v.value_id {
        NilOrVal::Nil => buf.push(0),
        NilOrVal::Val(h) => {
            buf.push(1);
            buf.extend_from_slice(&h.0);
        }
    }
    buf.extend_from_slice(&v.address.0);
    buf
}
```

This function turns an `OpenHlVote` into a sequence of bytes. **The bytes are what the signature commits to.** If a malicious actor mutates any field of a `Vote`, the signing bytes change, the signature fails to verify, and the tampered vote is rejected by every validator.

Walk through the byte layout:

| Bytes | Field | Encoding |
| - | - | - |
| 0..8 | `height` | u64 little-endian |
| 8..16 | `round` | i64 little-endian (rounds can be -1 for "no round") |
| 16 | `vote_type` | 0 = Prevote, 1 = Precommit |
| 17 | `value_id` tag | 0 = Nil, 1 = Val |
| 18..50 (if Val) | `value_id` data | 32 bytes of BlockHash |
| 18..38 OR 50..70 | `address` | 20 bytes |

Drawing the 70-byte layout for the `value_id = Val(...)` case as a memory diagram makes the bytes that go into the signature visible in one image:

```
【 Vote (Val case) canonical signing-bytes — 70 bytes total 】

┌────────────────┬────────────────┬───┬───┬───────────────────────────────┬─────────────────────────┐
│   Height (8B)  │   Round (8B)   │Typ│Tag│      Value ID  (32B / hash)    │ Validator Address (20B) │
└────────────────┴────────────────┴───┴───┴───────────────────────────────┴─────────────────────────┘
 0              8               16  17  18                              50                         70  (offset / bytes)
 [── u64 LE ──] [── i64 LE ──]   │   │   [─────── BlockHash payload ────] [─────── 20-byte Eth addr ─]
                                 │   │
                                 │   └── 0 = Nil  /  1 = Val            (if Nil, the 32B payload is omitted and addr lands at 18..38)
                                 └────── 0 = Prevote  /  1 = Precommit

  Every validator, on any host (x86 / ARM / RISC-V / …), produces the **exact same**
  70 bytes when this function is run — not a single byte may drift. This bytestring
  is the message Ed25519 actually signs.
```

**Why little-endian?** Convention for x86 / ARM hosts. **Why length-byte tags?** Because `NilOrVal::Nil` produces 1 byte (tag 0) while `NilOrVal::Val` produces 33 bytes (tag 1 + 32-byte hash). The tag tells the parser which it is. **Why include the validator address?** Because a vote is *whose* vote, not just *which* vote — the same proposal can be voted on by 100 different validators, and each produces a different signing-bytes string.

> 🛑 **Anti-fluency.** "Can I just `bincode::serialize(v)` and sign the result?" **No.** Off-the-shelf serialization formats can change between library versions — what you sign today might not be what you sign tomorrow even though the struct is identical. A **canonical** encoding is one you control byte-by-byte. Production chains define their encoding in a protobuf schema or write it manually like this; either way, the encoding becomes part of the chain's wire format spec.

### Step 3: Write the canonical encoding for `OpenHlProposal`

Next, the proposal encoding:

```rust
/// Canonical bytes that a proposal signature commits to.
#[must_use]
pub fn proposal_signing_bytes(p: &OpenHlProposal) -> Vec<u8> {
    let mut buf = Vec::with_capacity(128);
    buf.extend_from_slice(&p.height.0.to_le_bytes());
    buf.extend_from_slice(&round_to_i64(p.round).to_le_bytes());
    buf.extend_from_slice(&p.value.0.0);
    buf.extend_from_slice(&round_to_i64(p.pol_round).to_le_bytes());
    buf.extend_from_slice(&p.address.0);
    buf
}
```

The proposal layout:

| Bytes | Field | Encoding |
| - | - | - |
| 0..8 | `height` | u64 LE |
| 8..16 | `round` | i64 LE |
| 16..48 | `value.0.0` | 32 bytes of BlockHash |
| 48..56 | `pol_round` | i64 LE (proof-of-lock round) |
| 56..76 | `address` | 20 bytes |

**Note the difference from `vote_signing_bytes`:** the proposal value is unconditional (`BlockHash`), not wrapped in `NilOrVal`. A proposal always carries a value; you don't propose Nil.

**`p.value.0.0` looks weird.** It chains two `.0` accesses: first to unwrap `OpenHlValue(BlockHash)` to `BlockHash`, then to unwrap `BlockHash([u8; 32])` to `[u8; 32]`. Each newtype layer requires a `.0`. Annoying but explicit.

### Step 4: Add the `sign_vote` and `sign_proposal` functions

```rust
#[must_use]
pub fn sign_vote(v: OpenHlVote, sk: &PrivateKey) -> SignedMessage<crate::OpenHlContext, OpenHlVote> {
    let sig = sk.sign(&vote_signing_bytes(&v));
    SignedMessage::new(v, sig)
}

#[must_use]
pub fn sign_proposal(
    p: OpenHlProposal,
    sk: &PrivateKey,
) -> SignedMessage<crate::OpenHlContext, OpenHlProposal> {
    let sig = sk.sign(&proposal_signing_bytes(&p));
    SignedMessage::new(p, sig)
}
```

Each takes ownership of the message (since the typical caller hands it off and never needs it again), produces the canonical bytes, signs them with Ed25519, and wraps in `SignedMessage`. `SignedMessage::new(msg, sig)` is Malachite's standard pairing — every signed thing flows around the engine as a `SignedMessage`.

`crate::OpenHlContext` is the `OpenHlContext` we built in L6. Malachite's `SignedMessage` is generic over the context type and the inner message type.

### Step 5: Add the `verify_vote` function and `VerifierLike` trait

```rust
/// Verify a vote signature against the public key recorded for `vote.address`.
/// Returns false on bad signature.
#[must_use]
pub fn verify_vote(v: &OpenHlVote, sig: &Signature, public_key: &impl VerifierLike) -> bool {
    public_key.verify_msg(&vote_signing_bytes(v), sig).is_ok()
}

/// Trait shim so consumers can pass `&malachitebft_signing_ed25519::PublicKey`
/// without depending on the underlying `signature` crate's trait surface.
pub trait VerifierLike {
    fn verify_msg(&self, msg: &[u8], sig: &Signature) -> Result<(), VerifyError>;
}

#[derive(Debug)]
pub struct VerifyError;

impl VerifierLike for informalsystems_malachitebft_signing_ed25519::PublicKey {
    fn verify_msg(&self, msg: &[u8], sig: &Signature) -> Result<(), VerifyError> {
        self.verify(msg, sig).map_err(|_| VerifyError)
    }
}

fn round_to_i64(r: Round) -> i64 {
    r.as_i64()
}
```

Three pieces:

- **`verify_vote`** — the inverse of `sign_vote`. Recompute the canonical bytes, call the public key's verify method, return true/false.
- **`VerifierLike` trait** — a tiny abstraction over "something that can verify Ed25519 signatures." The reason: `PublicKey` from Malachite implements verification via the `signature::Verifier` trait, but we don't want our public API to require callers to import that. `VerifierLike` is our own trait, and we provide a single impl bridging to `signature::Verifier`. **Callers see one trait; under the hood we delegate to the canonical one.**
- **`round_to_i64`** — a one-line helper. `Round` is Malachite's wrapper over `i64`; the `.as_i64()` method exposes it. Wrapping in this helper makes the call sites read better.

### Step 6: Add 2 tests for `signing.rs`

Append:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{OpenHlAddress, OpenHlHeight};
    use openhl_types::BlockHash;
    use rand::rngs::OsRng;

    #[test]
    fn vote_signature_round_trips() {
        let sk = PrivateKey::generate(OsRng);
        let pk = sk.public_key();
        let vote = OpenHlVote {
            height: OpenHlHeight(7),
            round: Round::new(0),
            value_id: NilOrVal::Val(BlockHash([0x42; 32])),
            vote_type: VoteType::Prevote,
            address: OpenHlAddress([0xaa; 20]),
        };
        let signed = sign_vote(vote.clone(), &sk);
        assert!(verify_vote(&vote, &signed.signature, &pk));
    }

    #[test]
    fn vote_signature_is_field_sensitive() {
        let sk = PrivateKey::generate(OsRng);
        let pk = sk.public_key();
        let vote = OpenHlVote {
            height: OpenHlHeight(7),
            round: Round::new(0),
            value_id: NilOrVal::Val(BlockHash([0x42; 32])),
            vote_type: VoteType::Prevote,
            address: OpenHlAddress([0xaa; 20]),
        };
        let signed = sign_vote(vote.clone(), &sk);
        // Mutate value_id; signature should no longer verify.
        let mut tampered = vote;
        tampered.value_id = NilOrVal::Val(BlockHash([0x43; 32]));
        assert!(!verify_vote(&tampered, &signed.signature, &pk));
    }
}
```

Two tests:

- **`vote_signature_round_trips`** — Sign a vote, verify it. Pass.
- **`vote_signature_is_field_sensitive`** — Sign a vote, mutate one field of a clone, verify against the mutated copy. Must fail.

The second test is the **load-bearing** one. It proves that **the canonical encoding is sensitive to every field that matters.** If you broke the encoding (forgot to include `value_id` in the bytes, for example), tampered.value_id would be different but signing bytes would be the same, and the test would fail with "tampered vote verifies."

### Step 7: Create `crates/consensus/src/signing_provider.rs`

Start with:

```rust
//! `SigningProvider` implementation — the trait the Malachite engine plugs in.
//!
//! Holds our private key as state; delegates the actual signing to
//! [`crate::signing`]'s canonical encoding so the wire format and the engine
//! interface stay consistent.

use informalsystems_malachitebft_core_types::{SignedMessage, SigningProvider};
use informalsystems_malachitebft_signing_ed25519::{PrivateKey, PublicKey, Signature};

use crate::context::OpenHlContext;
use crate::signing::{
    proposal_signing_bytes, sign_proposal as sign_proposal_with,
    sign_vote as sign_vote_with, vote_signing_bytes,
};
use crate::types::{OpenHlProposal, OpenHlProposalPart, OpenHlVote};

#[derive(Debug)]
pub struct OpenHlSigningProvider {
    private_key: PrivateKey,
}

impl OpenHlSigningProvider {
    #[must_use]
    pub const fn new(private_key: PrivateKey) -> Self {
        Self { private_key }
    }

    #[must_use]
    pub fn public_key(&self) -> PublicKey {
        self.private_key.public_key()
    }
}
```

The struct holds a `PrivateKey`. The constructor takes one in (typically from disk or environment). `public_key()` derives the corresponding public key on demand — Ed25519 public keys are derivable from private keys via scalar multiplication, ~milliseconds.

The `use` block imports the lower-level functions from `signing.rs` with **`_with`-suffixed renames** (`sign_vote as sign_vote_with`, `sign_proposal as sign_proposal_with`). **Why renames?** Because the `SigningProvider` trait has methods named `sign_vote` and `sign_proposal`, and we want to call our own helpers without name collision. The `_with` suffix is a local convention for "this is the implementation function I delegate to from the trait method" — it's not a special macro or language feature; the `as ...` in the code above is just minting a new identifier.

### Step 8: Implement the `SigningProvider` trait — 4 sign/verify pairs

```rust
impl SigningProvider<OpenHlContext> for OpenHlSigningProvider {
    fn sign_vote(&self, vote: OpenHlVote) -> SignedMessage<OpenHlContext, OpenHlVote> {
        sign_vote_with(vote, &self.private_key)
    }

    fn verify_signed_vote(
        &self,
        vote: &OpenHlVote,
        signature: &Signature,
        public_key: &PublicKey,
    ) -> bool {
        public_key.verify(&vote_signing_bytes(vote), signature).is_ok()
    }

    fn sign_proposal(
        &self,
        proposal: OpenHlProposal,
    ) -> SignedMessage<OpenHlContext, OpenHlProposal> {
        sign_proposal_with(proposal, &self.private_key)
    }

    fn verify_signed_proposal(
        &self,
        proposal: &OpenHlProposal,
        signature: &Signature,
        public_key: &PublicKey,
    ) -> bool {
        public_key
            .verify(&proposal_signing_bytes(proposal), signature)
            .is_ok()
    }

    fn sign_proposal_part(
        &self,
        part: OpenHlProposalPart,
    ) -> SignedMessage<OpenHlContext, OpenHlProposalPart> {
        // ProposalPart is a unit struct in OpenHL (ValuePayload::ProposalOnly mode);
        // sign empty bytes so the type-level contract is honored but no extra
        // information is committed.
        let sig = self.private_key.sign(&[]);
        SignedMessage::new(part, sig)
    }

    fn verify_signed_proposal_part(
        &self,
        _part: &OpenHlProposalPart,
        signature: &Signature,
        public_key: &PublicKey,
    ) -> bool {
        public_key.verify(&[], signature).is_ok()
    }

    fn sign_vote_extension(&self, ext: ()) -> SignedMessage<OpenHlContext, ()> {
        // Vote extensions are unused at v0 (Context::Extension = ()).
        let sig = self.private_key.sign(&[]);
        SignedMessage::new(ext, sig)
    }

    fn verify_signed_vote_extension(
        &self,
        _ext: &(),
        signature: &Signature,
        public_key: &PublicKey,
    ) -> bool {
        public_key.verify(&[], signature).is_ok()
    }
}
```

Eight methods, four pairs:

- **`sign_vote` / `verify_signed_vote`** — delegate to `signing::sign_vote` / call `verify` on the public key with `vote_signing_bytes`. Standard.
- **`sign_proposal` / `verify_signed_proposal`** — same pattern.
- **`sign_proposal_part` / `verify_signed_proposal_part`** — **sign empty bytes.** Why? Because `OpenHlProposalPart` is a unit struct — there's no data to commit to. Signing an empty payload still produces a valid Ed25519 signature (it's deterministic from the private key alone), and verifying it confirms "yes, this provider produced this signature." The signature has no informational content but the trait surface is satisfied.
- **`sign_vote_extension` / `verify_signed_vote_extension`** — same as proposal_part. Vote extensions are `()` (unused at v0), so we sign empty bytes.

> 🛑 **Anti-fluency.** "Signing empty bytes feels wrong — what's the point?" **The point is honoring the trait surface without committing to data we don't have.** Malachite's engine will call these methods at runtime; if we panicked or returned errors, the engine would crash. By signing empty bytes and returning a valid signature, we say "yes, this is a real signature from us, but it commits to nothing additional beyond what's already in the rest of the message." Production chains that use these features fill them with real bytes; we don't, but the trait surface stays intact.

### Step 9: Add 7 tests for `signing_provider.rs`

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{OpenHlAddress, OpenHlHeight, OpenHlValue};
    use informalsystems_malachitebft_core_types::{NilOrVal, Round, VoteType};
    use openhl_types::BlockHash;
    use rand::rngs::OsRng;

    fn provider() -> (OpenHlSigningProvider, PublicKey) {
        let sk = PrivateKey::generate(OsRng);
        let pk = sk.public_key();
        (OpenHlSigningProvider::new(sk), pk)
    }

    fn sample_vote() -> OpenHlVote {
        OpenHlVote {
            height: OpenHlHeight(1),
            round: Round::new(0),
            value_id: NilOrVal::Val(BlockHash([0x42; 32])),
            vote_type: VoteType::Prevote,
            address: OpenHlAddress([0xaa; 20]),
        }
    }

    fn sample_proposal() -> OpenHlProposal {
        OpenHlProposal {
            height: OpenHlHeight(1),
            round: Round::new(0),
            value: OpenHlValue(BlockHash([0x42; 32])),
            pol_round: Round::Nil,
            address: OpenHlAddress([0xaa; 20]),
        }
    }

    #[test]
    fn vote_sign_verify_round_trips() {
        let (sp, pk) = provider();
        let vote = sample_vote();
        let signed = sp.sign_vote(vote.clone());
        assert!(sp.verify_signed_vote(&vote, &signed.signature, &pk));
    }

    #[test]
    fn vote_tamper_detected() {
        let (sp, pk) = provider();
        let vote = sample_vote();
        let signed = sp.sign_vote(vote.clone());
        let mut tampered = vote;
        tampered.value_id = NilOrVal::Val(BlockHash([0x43; 32]));
        assert!(!sp.verify_signed_vote(&tampered, &signed.signature, &pk));
    }

    #[test]
    fn proposal_sign_verify_round_trips() {
        let (sp, pk) = provider();
        let proposal = sample_proposal();
        let signed = sp.sign_proposal(proposal.clone());
        assert!(sp.verify_signed_proposal(&proposal, &signed.signature, &pk));
    }

    #[test]
    fn proposal_tamper_detected() {
        let (sp, pk) = provider();
        let proposal = sample_proposal();
        let signed = sp.sign_proposal(proposal.clone());
        let mut tampered = proposal;
        tampered.value = OpenHlValue(BlockHash([0x99; 32]));
        assert!(!sp.verify_signed_proposal(&tampered, &signed.signature, &pk));
    }

    #[test]
    fn proposal_part_sign_verify_round_trips() {
        let (sp, pk) = provider();
        let part = OpenHlProposalPart;
        let signed = sp.sign_proposal_part(part);
        assert!(sp.verify_signed_proposal_part(&part, &signed.signature, &pk));
    }

    #[test]
    fn vote_extension_sign_verify_round_trips() {
        let (sp, pk) = provider();
        let signed = sp.sign_vote_extension(());
        assert!(sp.verify_signed_vote_extension(&(), &signed.signature, &pk));
    }

    #[test]
    fn signature_from_one_provider_does_not_verify_under_another() {
        let (sp1, _pk1) = provider();
        let (_sp2, pk2) = provider();
        let vote = sample_vote();
        let signed = sp1.sign_vote(vote.clone());
        // Signed by provider 1, verified against provider 2's public key — must fail.
        assert!(!sp1.verify_signed_vote(&vote, &signed.signature, &pk2));
    }
}
```

Seven tests cover the surface:

| Test | What it proves |
| - | - |
| `vote_sign_verify_round_trips` | The vote sign/verify pair works. |
| `vote_tamper_detected` | Mutating a vote field after signing makes verify fail. |
| `proposal_sign_verify_round_trips` | Same for proposals. |
| `proposal_tamper_detected` | Same for proposals. |
| `proposal_part_sign_verify_round_trips` | Empty-bytes signing still round-trips through the unit-struct type. |
| `vote_extension_sign_verify_round_trips` | Same for vote_extension. |
| `signature_from_one_provider_does_not_verify_under_another` | Cryptographic security — different keys produce non-interchangeable signatures. |

The last test is the **load-bearing security guarantee**: a signature is bound to a specific key. Without this, anyone could forge signatures by reusing valid signatures across different validators.

### Step 10: Wire both modules into `lib.rs`

Open `crates/consensus/src/lib.rs`. Currently:

```rust
//! Consensus layer — Malachite BFT.

pub mod bridge;
pub mod context;
pub mod types;

pub use context::OpenHlContext;
```

Add 2 lines:

```rust
//! Consensus layer — Malachite BFT.

pub mod bridge;
pub mod context;
pub mod signing;
pub mod signing_provider;
pub mod types;

pub use context::OpenHlContext;
```

`pub mod signing;` and `pub mod signing_provider;` expose the modules. No re-exports needed at this layer — callers will import via the fully-qualified paths.

## Test

```bash
cargo test -p openhl-consensus
```

Expected:

```
running 14 tests
test context::tests::height_increment_and_decrement ... ok
test context::tests::new_prevote_and_precommit_have_distinct_types ... ok
test context::tests::new_proposal_round_trips_fields ... ok
test context::tests::select_proposer_round_robins_deterministically ... ok
test context::tests::validator_set_is_sorted_by_power_then_address ... ok
test signing::tests::vote_signature_is_field_sensitive ... ok
test signing::tests::vote_signature_round_trips ... ok
test signing_provider::tests::proposal_part_sign_verify_round_trips ... ok
test signing_provider::tests::proposal_sign_verify_round_trips ... ok
test signing_provider::tests::proposal_tamper_detected ... ok
test signing_provider::tests::signature_from_one_provider_does_not_verify_under_another ... ok
test signing_provider::tests::vote_extension_sign_verify_round_trips ... ok
test signing_provider::tests::vote_sign_verify_round_trips ... ok
test signing_provider::tests::vote_tamper_detected ... ok

test result: ok. 14 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

Common errors and fixes:

- **`cannot find function 'sign_vote' in module 'super::signing'`** — Forgot to add `pub mod signing;` to `lib.rs`. Re-check Step 10.
- **`error: trait 'SigningProvider' not implemented for 'OpenHlSigningProvider' — missing method 'sign_vote_extension'`** — All 8 methods (4 sign + 4 verify) are required. If you only implemented some, the trait isn't satisfied. Add the missing ones.
- **`error: type alias 'Extension' is `()` so methods take `ext: ()`** — Verify your impl uses `ext: ()` (or `_ext: &()` for verify) as the type, not some `Extension` placeholder.
- **`vote_tamper_detected` test fails (assertion does the opposite)** — Your canonical encoding might not include `value_id` (or another field) in the bytes. Re-check Step 2 — every field of the struct that matters must contribute to the bytes.

## Design reflection

Four load-bearing decisions encoded:

1. **Canonical encoding is in `signing.rs`, not derived from `serde::Serialize`.** `signing.rs` defines a byte-level layout that we control. Why? Because `serde` versions can change between Rust edition bumps or library upgrades, but our signed messages have to round-trip across validators running potentially-different binary versions. Locking the encoding in code (not a library) means the wire format is part of the chain's spec, not a library detail.

2. **`SigningProvider` wraps the pure `sign_vote` functions, holding the key as state.** Could have made `sign_vote` a method on `OpenHlSigningProvider`. The split lets *tests* and *internal code* call `sign_vote(vote, &sk)` directly (passing the key as a parameter), while *Malachite's engine* uses the trait method `sp.sign_vote(vote)` (binding to the provider's stored key). **The same logic serves both use cases without duplication.**

3. **Empty-bytes signatures for ProposalPart and Extension.** When the trait surface requires methods but our chain doesn't use the feature, we provide deterministic, verifiable signatures over empty data. This honors the trait without committing to data we don't have. Production chains that use these features fill them with real bytes; we don't, but the engine doesn't crash either way.

4. **The `VerifierLike` shim that walls off "leaky abstraction" from dependencies.** The one-method trait introduced in Step 5 exists for a single purpose: keeping the dependency graph clean. Concretely: Malachite's `PublicKey` provides verification through the external `signature` crate's `Verifier` trait. If `verify_vote(v, sig, pk)` called `signature::Verifier::verify(...)` directly, **the responsibility to import the `signature` crate's trait would leak into our consensus crate's public API surface**. The moment Malachite swaps `signature` for a different crypto library (new crate, different trait name), **every downstream consumer of this crate (including the L8+ lessons) eats a breaking change**. By interposing one tiny first-party trait (`VerifierLike`), the existence of `signature` is sealed behind the five lines of `impl VerifierLike for PublicKey` in `signing.rs`, and any future upstream churn is absorbed by editing exactly one line there. **The discipline is: "never let someone else's traits show up in your crate's public API."** This is the eight-line, minimum-cost implementation of it.

## Answer key

```bash
cd ~/code/openhl-reference
git checkout 9e810a7
diff -u ~/code/my-openhl/crates/consensus/src/signing.rs ./crates/consensus/src/signing.rs
diff -u ~/code/my-openhl/crates/consensus/src/signing_provider.rs ./crates/consensus/src/signing_provider.rs
diff -u ~/code/my-openhl/crates/consensus/src/lib.rs ./crates/consensus/src/lib.rs
```

Doc-comment wording can vary. The canonical encoding byte order, the SigningProvider trait impls (especially what they delegate to), and the test patterns should match closely.

The reference at `9e810a7` has extra files (`runner.rs` modifications) we'll add in later lessons. Diff against just the signing files for this lesson.

Return:

```bash
git checkout main
```

## Common questions

**Q: Why does `vote_signing_bytes` not include `vote_type` for Nil votes?**
It does — `vote_type` is always 1 byte (0 or 1), independent of whether `value_id` is Nil or Val. The branch is for `value_id` only (Nil writes 1 byte tag, Val writes 1 byte tag + 32 bytes).

**Q: Can I sign with the public key by mistake?**
No — Ed25519 separates them: `PrivateKey::sign(&[u8]) -> Signature` exists, but `PublicKey::sign` does not. The type system prevents the swap.

**Q: What happens if a validator's vote_signing_bytes diverges from another validator's?**
The chain forks at the first round where they vote on the same proposal. Validator A's signature verifies under its own encoding; Validator B reading the same vote with its different encoding sees the signature fail and rejects the vote. The vote tallying produces different counts for the same election, leading to different decided values. **This is why the encoding is part of the spec, not an implementation detail.**

**Q: Why does `OpenHlSigningProvider` not impl `Clone`?**
Because cloning a private key is something we want to be explicit about — `let sp_copy = sp.clone();` is too easy to write accidentally. Use `OpenHlSigningProvider::new(self.private_key.clone())` if you really need a copy. Keeping `Clone` off means private-key duplication is rare and visible.

## Next lesson (L8)

You have the signing surface complete. Malachite can ask your provider to sign messages, and verification round-trips work. But **Malachite doesn't know how to talk over the wire yet** — sending votes between validators requires encoding/decoding. L8 implements `OpenHlCodec`: the trait that translates between in-memory types and bytes for network transport, write-ahead logging, and state sync. After L8, the engine has everything it needs to spawn (codec + signing + context + node config); we'll wire `OpenHlNode` and prove `start_engine` works in the same lesson.
````

---

## Seed-file slot

L7 lands in Module 4 (CL types) at sortOrder 1:

```typescript
{
  title: 'Lesson 7 — OpenHlSigningProvider and canonical encoding',
  slug: 'openhl-signing-provider-en',
  type: 'CONTENT',
  sortOrder: 1,
  duration: 40,
  xpReward: 80,
  content: `# Lesson 7 — \`OpenHlSigningProvider\` and canonical encoding\n\n...`
},
```

## SHA pinning discipline

L7 references two openhl commits (§Answer key):
- `23c2ba4` (multi-validator runner — first introduces signing.rs canonical encoding)
- `9e810a7` (Stage 6a: OpenHlSigningProvider trait impl)

These two commits are combined into one build-along lesson because they're conceptually inseparable — canonical encoding without the SigningProvider trait is incomplete, and the trait without the encoding is empty.

## Style review notes (self-critique before paste)

- **L7 is 40 min.** Smaller than L6 but security-critical. Reader must understand canonical encoding's load-bearing role.
- **§Plan's "two patterns that propagate" callout** names what's pedagogically generalizable from this lesson: canonical encoding + trait-wraps-pure-functions. Both reappear in L8 (codec) and L9 (engine).
- **Step 2's "byte layout table"** is the load-bearing artifact. Without it, readers might write the encoding from copy-paste and not understand the field-tagging logic.
- **The Anti-fluency in Step 2** ("can I just `bincode::serialize`?") names the actual production trap — devs reach for off-the-shelf serialization and lose the spec-control property.
- **The Anti-fluency in Step 8** ("signing empty bytes feels wrong") addresses the "trait surface vs. real use" tension — production chains might fill these with real bytes; we don't, but the engine doesn't break either way.
- **The chain-fork explanation in Common Questions** is the highest-stakes consequence of a canonical-encoding bug. Worth keeping concrete.
