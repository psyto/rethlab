# Building OpenHL — L4 + L5 draft (EN)

> Drafted against openhl SHA `0844d58` (Stage 7c). Closes Module 2 (Malachite as a library). L4 is the heaviest remaining lesson — walks each of the ten Context sub-types in detail. L5 introduces the actor model that turns Malachite's protocol state machine into a runnable engine.
> Course: `building-openhl-consensus-en` (track: `reth-l1-architect`, course #6 of 10).

---

## L4 — `openhl-malachite-impl-en`

- **Module:** 2 (Malachite as a library), sortOrder 1 within module
- **Course-level sortOrder:** 3 (lesson 4 of 13)
- **Duration:** 20 min
- **XP reward:** 60
- **Type:** CONTENT
- The heaviest lesson in the course (matches L9 at 20/60).

### Content

````markdown
# What you implement — proposals, validators, votes, signing

L3 named the ten types. Now we write them. **Forty lines of trait impls and your chain has an identity.** The exercise is mostly mechanical — each sub-trait has a small surface — but the choices encoded in those forty lines are the ones every downstream lesson references.

> 🛑 **Predict before scrolling.** Open `crates/consensus/src/types/` at SHA `0844d58`. Without reading the files, sketch the *trait bounds* you'd expect each of the ten Context sub-types to require. Hint: think about the operations Malachite needs (compare addresses for sorting, hash values for VoteKeeper lookups, display heights in logs).

## 1. The trait-bounds tour

Each Context associated type has its own sub-trait. The bounds are the API surface Malachite expects:

| Sub-trait | Required bounds | Why |
| :--- | :--- | :--- |
| `Address` | `Clone + Debug + Display + Eq + Ord + Send + Sync` | Sorted in validator sets, displayed in logs |
| `Height` | `Copy + Clone + Default + Debug + Display + Eq + Ord + Send + Sync` plus `ZERO`, `INITIAL`, `increment_by`, `decrement_by`, `as_u64` | Monotonic counter math |
| `Value` | `Clone + Debug + Eq + Ord + Send + Sync` plus `type Id: Clone + Debug + Display + Eq + Ord + Send + Sync` and `fn id() -> Self::Id` | Has a compact identifier (vote payload) |
| `Validator<Ctx>` | `Clone + Debug + Eq + Send + Sync` plus `address()`, `public_key()`, `voting_power()` | Identifies a participant with weight |
| `ValidatorSet<Ctx>` | `Clone + Debug + Eq + Send + Sync` plus `count()`, `total_voting_power()`, `get_by_address()`, `get_by_index()` | Iterable, sortable, lookupable collection |
| `Proposal<Ctx>` | `Clone + Debug + Eq + Send + Sync + 'static` plus six accessors | Carries a value plus round metadata |
| `Vote<Ctx>` | `Clone + Debug + Eq + Ord + Send + Sync + 'static` plus nine accessors | Prevote or precommit |
| `ProposalPart<Ctx>` | `Clone + Debug + Eq + Send + Sync + 'static` plus `is_first`, `is_last` | Streamable in `PartsOnly` mode |
| `Extension` | `Clone + Debug + Eq + Send + Sync + 'static` plus `size_bytes()` | Optional precommit attachment |
| `SigningScheme` | `Clone + Debug + Eq` plus `type Signature`, `type PublicKey`, `type PrivateKey`, encode/decode | Wire-format crypto |

**Every type also needs `Send + Sync` because Malachite runs across actor boundaries.** That single requirement rules out non-thread-safe choices (e.g., raw `Rc<_>` fields). The compiler enforces it.

## 2. The trivial three — `Address`, `Height`, `Value`

These are the simplest. Three structs, ~20 lines each. Open `crates/consensus/src/types/address.rs:7@0844d58`:

```rust
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

Three things:
1. **`#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]`** gives us most trait bounds for free. The `[u8; 20]` field derives these naturally.
2. **`fmt::Display` impl** hex-encodes the address. Required by the `Address` super-trait; used in logs and error messages.
3. **`impl Address for OpenHlAddress {}`** — empty impl. The trait has no methods of its own beyond what the bounds require.

`Height` and `Value` follow the same shape. `Height` at `crates/consensus/src/types/height.rs@0844d58` adds `INITIAL = 1`, `ZERO = 0`, and saturating-arithmetic `increment_by`/`decrement_by`. `Value` at `crates/consensus/src/types/value.rs` wraps `BlockHash` and impls `Value::id() -> Self::Id = BlockHash` (the value IS its own id, since the block hash is already 32 bytes — see the prediction below).

> 🛑 **Predict.** Our `Value::Id` is the same type as `Value` itself (both `BlockHash`). In Cosmos chains, `Value` carries the full block and `Value::Id` is the block's hash. **Why doesn't openhl do that — why is `Value` just the hash?**

Because we don't ship transactions over consensus yet. The bridge produces a block, the block's hash is what's voted on, and the EL is the source of truth for the block's contents. Carrying the full block through consensus would mean serializing transactions over libp2p gossipsub — wasteful since every validator already has the EL state to reconstruct the block from its hash. **In Module 2 (CLOB) this calculation may change** — once the consensus value includes CLOB fills that aren't in the EVM mempool, `Value` may need to carry more than a hash.

## 3. `Validator` and `ValidatorSet` — the sort order is load-bearing

Open `crates/consensus/src/types/validator.rs:21@0844d58`:

```rust
impl Validator<OpenHlContext> for OpenHlValidator {
    fn address(&self) -> &OpenHlAddress { &self.address }
    fn public_key(&self) -> &PublicKey { &self.public_key }
    fn voting_power(&self) -> VotingPower { self.voting_power }
}
```

Three accessors. The trait expects them; the struct stores them. Trivial.

`OpenHlValidatorSet`'s `new` is the interesting bit at `crates/consensus/src/types/validator.rs:42@0844d58`:

```rust
pub fn new(mut validators: Vec<OpenHlValidator>) -> Self {
    validators.sort_by(|a, b| {
        b.voting_power
            .cmp(&a.voting_power)
            .then_with(|| a.address.cmp(&b.address))
    });
    Self(validators)
}
```

Sorted by `(voting_power desc, address asc)`. **This sort order is load-bearing for determinism.**

Reason: `OpenHlContext::select_proposer` uses `validator_set.get_by_index((height + round) % count)` to pick proposers (L11 territory). If two validators have different sort orders for the same validator set, they pick different proposers for the same round, and the chain forks.

The CometBFT convention (which openhl inherits) is `voting_power desc, address asc`. Any chain using this sort + the modulo-rotation gets deterministic proposer election as long as the address space is totally ordered — which is why `Address: Ord` is a hard bound (§1).

> 🛑 **Anti-fluency.** "Sort order is an implementation detail." **Wrong for consensus.** In consensus, the sort order *is* the protocol. Two implementations that sort differently are running different consensus protocols, regardless of what their type signatures look like. The CometBFT sort convention is part of the de-facto BFT family standard.

## 4. `Proposal` and `Vote` — message constructors

`Proposal` at `crates/consensus/src/types/proposal.rs@0844d58` is six accessors over a five-field struct:

```rust
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct OpenHlProposal {
    pub height: OpenHlHeight,
    pub round: Round,
    pub value: OpenHlValue,
    pub pol_round: Round,    // "Proof-of-lock round" — Tendermint nuance
    pub address: OpenHlAddress,
}
```

`pol_round` is the round at which the proposed value was locked — used by Tendermint to handle "I prevoted for this value at an earlier round but the round timed out; now I'm proposing it again." For first-round proposals, `pol_round = Round::Nil`.

`Vote` at `crates/consensus/src/types/vote.rs:10@0844d58`:

```rust
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct OpenHlVote {
    pub height: OpenHlHeight,
    pub round: Round,
    pub value_id: NilOrVal<BlockHash>,    // NilOrVal: vote for value, or nil
    pub vote_type: VoteType,              // Prevote | Precommit
    pub address: OpenHlAddress,
}
```

The `value_id: NilOrVal<BlockHash>` is doing real work. A vote can be:
- `NilOrVal::Val(hash)` — "I vote for the value with this id"
- `NilOrVal::Nil` — "I vote against any value at this round" (timed out, no proposal arrived)

Voting nil is how Tendermint handles missing or invalid proposals; the round still has to terminate.

Both types impl their respective sub-traits with simple accessor functions — twenty lines each. We don't write the *protocol* (Malachite owns that); we write the *types the protocol traffics in*.

## 5. `ProposalPart` — the streaming type we don't use

`ProposalPart` at `crates/consensus/src/types/proposal_part.rs@0844d58` is the most boring file in the codebase:

```rust
pub struct OpenHlProposalPart;

impl ProposalPart<OpenHlContext> for OpenHlProposalPart {
    fn is_first(&self) -> bool { true }
    fn is_last(&self) -> bool { true }
}
```

A unit struct. `is_first = is_last = true` (a single part is the only part).

Why does this type even exist? Malachite supports three `ValuePayload` modes (L9 territory):
- `ProposalOnly` — entire value is in the `Proposal` message. **openhl uses this.**
- `PartsOnly` — value is streamed in chunks; `Proposal` references them.
- `ProposalAndParts` — both.

The other two modes exist for chains that propose large values that don't fit in a single gossip message (multi-MB blocks). `ProposalPart` is the streaming chunk. **openhl proposes a 32-byte block hash; we never need streaming.** But the Context trait requires the associated type, so we provide a unit struct that satisfies the bounds and never actually flows over the wire.

## 6. Signing — Ed25519 in 0 lines

Our `SigningScheme` is `Ed25519`, shipped by Malachite at `informalsystems-malachitebft-signing-ed25519`. **We write zero lines for it.** From `crates/consensus/src/context.rs:29@0844d58`:

```rust
type SigningScheme = Ed25519;
```

That's it. Malachite handles signature encoding/decoding, the `Signature` / `PublicKey` / `PrivateKey` types, all of it.

If we wanted BLS aggregation (smaller commit certificates), we'd swap to a different `SigningScheme` impl — Malachite's design is parametric over the scheme. We don't; Ed25519 is simpler and Tempo/HL both use it.

> 🛑 **Predict.** Switching from Ed25519 to BLS would be a one-line change in `OpenHlContext`. **What else in openhl would need to change?** Hint: think about validator-set storage and what gets put on the wire.

The answer: most of it would be unchanged. Validator-set storage stores `PublicKey`; `PublicKey`'s concrete type comes from `SigningScheme`. Switching schemes changes the type, but the storage code (just `Vec<_>`) doesn't care. The wire format of votes / commit certificates would change (BLS gives aggregable signatures), so the `OpenHlCodec` impls might need to update. But the bulk of the code — types, runner, engine_app — is invariant under the scheme choice.

## 7. The `SigningProvider` — where signing actually happens

`SigningScheme` defines what signatures *look like*. `SigningProvider` defines who *makes* them. The two are different traits; the split is intentional.

`OpenHlSigningProvider` at `crates/consensus/src/signing_provider.rs:18@0844d58`:

```rust
pub struct OpenHlSigningProvider {
    private_key: PrivateKey,
}
```

One field. Holds the validator's private key.

```rust
impl SigningProvider<OpenHlContext> for OpenHlSigningProvider {
    fn sign_vote(&self, vote: OpenHlVote) -> SignedMessage<OpenHlContext, OpenHlVote> {
        sign_vote_with(vote, &self.private_key)
    }
    fn verify_signed_vote(&self, vote: &OpenHlVote,
                          signature: &Signature, public_key: &PublicKey) -> bool {
        public_key.verify(&vote_signing_bytes(vote), signature).is_ok()
    }
    // ... sign/verify pairs for proposal, proposal_part, vote_extension
}
```

Eight methods total — sign/verify pairs for the four signable message types (vote, proposal, proposal_part, vote_extension). The signing functions delegate to `crates/consensus/src/signing.rs`'s canonical-encoding helpers; verification is direct `public_key.verify(...)`.

**Why a separate `SigningProvider` trait, rather than a method on `OpenHlContext`?** Because `Context` is purely *type-level* (it picks types, but holds no state); `SigningProvider` holds the private key — runtime state. Putting the private key on `Context` would mean every Context instance has a key, which is wrong (only validators have keys; observers don't).

> 🛑 **Anti-fluency.** "The Context trait is where validators are configured." **No.** The Context picks types; the SigningProvider holds the key; the validator set carries identities. **Three separate concerns, three separate traits.** Mixing them gives you a single godclass that's hard to test and impossible to swap.

## 8. The forty-line claim, validated

L4's hook claimed "forty lines of trait impls and your chain has an identity." Let's add up:

| File | Lines | What it impls |
| :--- | :--- | :--- |
| `address.rs` | 19 | `Address` + `Display` |
| `height.rs` | ~20 | `Height` + `Display` |
| `value.rs` | ~15 | `Value` |
| `validator.rs` | 73 | `Validator` + `ValidatorSet` + constructor |
| `proposal.rs` | ~35 | `Proposal` (six accessors) |
| `vote.rs` | 54 | `Vote` (nine accessors) |
| `proposal_part.rs` | ~10 | `ProposalPart` (unit struct) |
| `context.rs` | ~90 | `Context` (10 type defs + 4 method bodies) |

About 230 LOC of types + 90 LOC of Context impl = ~320 LOC for the entire Module 2 deliverable. The "forty lines" claim was about trait impls specifically (not the structs they wrap); the broader codebase comes in around 8× that.

But the load-bearing decision count is small: **two design choices that propagate everywhere.**

1. **The CometBFT sort convention** (`voting_power desc, address asc`) — forces every validator-set construction to agree on order
2. **The 20-byte Ethereum address format** — fixed at chain genesis; everything downstream assumes it

Change either and the whole consensus implementation has to be reviewed. The other 318 lines are mechanical type definitions following established Rust conventions.

## 9. Practice

1. **Trace the bounds, no peeking.** For each of the ten Context associated types, list the trait bounds Malachite requires (use the §1 table after you've sketched). Compare to your prediction.
2. **The Solana-address experiment.** Suppose `OpenHlAddress` was `[u8; 32]` instead of `[u8; 20]`. Which files at `crates/consensus/src/@0844d58` would compile-error? (Hint: only one if you're disciplined — `address.rs` itself. The propagation should be invisible to other files.)
3. **The signing-scheme swap.** Sketch the diff to switch `type SigningScheme = Ed25519` to a hypothetical `Bls12_381` impl. Which lines change? Which lines stay? (Hint: more lines stay than change.)
4. **The validator-set sort-order leak.** Read `OpenHlContext::select_proposer` at `crates/consensus/src/context.rs:32@0844d58`. **What goes wrong if two validators sort their validator sets differently?** Sketch the chain divergence scenario.

> **Final check.** In one sentence, why are `Context`, `SigningProvider`, and `ValidatorSet` separate traits (not collapsed into one giant trait)? If your answer doesn't include "type-level vs runtime-state vs identity-set are three different concerns," re-read §7.
````

---

## L5 — `openhl-malachite-engine-en`

- **Module:** 2 (Malachite as a library), sortOrder 2 within module
- **Course-level sortOrder:** 4 (lesson 5 of 13)
- **Duration:** 15 min
- **XP reward:** 40
- **Type:** CONTENT

### Content

````markdown
# The actor model behind `malachitebft-engine`

L3 said Malachite is "the abstract Tendermint algorithm with the I/O ripped out." This lesson is about what *adds* the I/O back. **Consensus is a state machine that ignores time; the engine is what gives it a clock.**

Malachite's protocol logic lives in a synchronous `Driver` struct — pure state machine, no timers, no network, no threads. The `malachitebft-engine` crate wraps it in an actor system (via `ractor`) that provides the runtime context — timeouts, network sockets, WAL writes, mempool access — that real consensus needs.

L4's types tell Malachite *what* your chain is. This lesson is about *how* Malachite turns those types into a running node.

> 🛑 **Predict before scrolling.** A consensus protocol needs to schedule timeouts (round-change, propose), receive network messages, write to a WAL, and notify the application of decisions. Sketch a tokio-based architecture for these. We'll compare to what Malachite actually does in §2.

## 1. Why an actor framework

The temptation: just use `tokio::spawn` and channels. Why does Malachite use ractor?

Three reasons:

| Need | tokio | ractor |
| :--- | :--- | :--- |
| Spawn a long-running concurrent task | `tokio::spawn(future)` | `Actor::spawn(name, args)` |
| Send a message to a specific task | `tx.send(msg)` (you wire the channel) | `actor_ref.cast(msg)` (built in) |
| Reply to a sender (request/response) | wrap in `oneshot::channel` | `actor_ref.call(msg)` (built in) |
| Restart a crashed task | DIY (catch_unwind, respawn) | supervision (built in) |
| Pause/resume an actor | DIY | `actor_ref.stop()` / `start()` |
| Pre-stop hooks (clean shutdown) | DIY | trait method `pre_stop` |

You can build all of these on tokio — but the abstractions you'd end up writing are exactly ractor. **For a complex multi-actor system (Consensus, Network, Wal, Sync, Host all coordinating), the boilerplate adds up.** Malachite chose ractor; openhl inherits the choice.

> 🛑 **Anti-fluency.** "ractor is just an indirection over `tokio::spawn`." Mostly wrong. ractor provides supervision, message ordering guarantees, and named actor lookup that you'd otherwise hand-roll. **For a 5-actor system it's load-bearing infrastructure, not syntactic sugar.**

## 2. The actor topology

When `OpenHlNode::start()` calls `start_engine` (Stage 6c → 6d in openhl), the engine spawns five actors:

| Actor | Lives in | Owns |
| :--- | :--- | :--- |
| **Consensus** | `malachitebft-engine::consensus` | The `Driver` (state machine), proposer-timeout timer, vote tallying |
| **Network** | `malachitebft-engine::network` | libp2p socket, gossipsub topic subscriptions, peer discovery |
| **Wal** | `malachitebft-engine::wal` | Append-only log of consensus messages on disk (`get_home_dir()/wal`) |
| **Host** (connector) | `malachitebft-app-channel::connector` | The bridge between the engine and **your** app loop (sends `AppMsg` events) |
| **Sync** | `malachitebft-engine::sync` | Peer catch-up — fetches missing blocks when behind |

Plus our own runtime concern:

| Component | Lives in | Owns |
| :--- | :--- | :--- |
| **`run_engine_app` loop** | `crates/consensus/src/engine_app.rs:29@0844d58` | Receives `AppMsg`, calls `ConsensusBridge` methods, replies |

This isn't an actor — it's an async task we spawn ourselves. But it's the application-side counterpart to the Host actor: the engine asks us questions via `AppMsg`, our loop answers via `oneshot::Reply` channels.

## 3. The `AppMsg` channel — what flows in, what flows out

The `Channels<Ctx>` struct from app-channel:

```rust
pub struct Channels<Ctx: Context> {
    pub consensus: mpsc::Receiver<AppMsg<Ctx>>,    // engine → us
    pub network: mpsc::Sender<NetworkMsg<Ctx>>,    // us → network actor
    pub events: TxEvent<Ctx>,                      // for observers to subscribe
}
```

Three channels:

1. **`consensus`** — the engine asks us things. `AppMsg::GetValue`, `AppMsg::Decided`, all the rest (we walked them in L11 / L13).
2. **`network`** — we tell the network actor things. The two main uses are `PublishProposalPart` (for streaming proposals; openhl doesn't use this) and `BroadcastConsensusMsg` (for forwarding our votes).
3. **`events`** — read-only stream of events for outside observers (metrics, logs, downstream consumers).

Our `run_engine_app` only consumes from `consensus`. It never publishes to `network` — Malachite handles vote broadcast internally via the Consensus actor. **The network channel is for chains that need application-level network injection** (e.g., DA layers that send commitments alongside consensus); openhl doesn't.

## 4. The Consensus actor's role

The Consensus actor at `malachitebft-engine::consensus::Consensus` is where Malachite's protocol Driver actually runs. Its job:

1. Receive consensus messages from the Network actor (peer proposals, peer votes)
2. Feed them as `Driver::Input` to the protocol state machine
3. Process `Driver::Output` — schedule timeouts, broadcast votes via Network, notify Host of `Decide`
4. Manage round transitions, timeouts, view changes

We never see this code in openhl. **Our code can't directly invoke the Driver** — that's intentional. The Driver is shielded behind the actor; the only way to send it input is to send the Consensus actor a message, and the only way to read its output is to receive an `AppMsg` from the Host connector. **Our `run_engine_app` loop is the application side of that conversation.**

Compare to `run_single_validator` at `crates/consensus/src/runner.rs:34@0844d58`, which uses the Driver directly without an actor wrapper. That was Stage 5 (pedagogical); Stage 6 wrapped it in actors. **Both produce the same chain behavior**; the actor version is the production-shape one.

## 5. Network + WAL actors

The Network actor wraps libp2p:

- Manages the gossipsub topic for consensus messages
- Encodes outgoing votes/proposals via the `ConsensusCodec` (Stage 6b → currently stubs, see L9 §4)
- Decodes incoming messages and forwards them to Consensus
- Handles peer discovery

In single-validator mode (no peers), the Network actor still spawns — libp2p starts listening on `/ip4/127.0.0.1/tcp/0` — but receives no inbound messages and broadcasts to nobody. **It's a no-op in single-validator mode**, which is how `OpenHlCodec`'s gossip stubs (Stage 6b) get away with returning errors: nothing is actually encoding them.

The WAL actor writes consensus messages to disk for crash recovery:

- Every `Vote` and `Proposal` we sign gets persisted before it's broadcast
- Every `Decided` value gets persisted before the bridge commits
- On restart, the WAL is replayed before the engine resumes consensus

In single-validator mode the WAL writes happen but are never replayed (tests use tempfile home_dirs that get cleaned up). **In production, the WAL is what makes the chain durable across validator restarts.**

> 🛑 **Predict.** What happens if you restart openhl mid-round (after a vote was cast but before the round decided)?

Without WAL: when you restart, the engine has no memory of your previous votes. If a peer remembers you voted for value X and you now vote for value Y on restart, you've equivocated — a slashable offense in production BFT chains. With WAL: on restart, the engine replays your previous votes, sees that you voted for X, and refuses to vote for Y. **WAL is how single-machine consensus avoids self-equivocation across restarts.**

## 6. The one Malachite gotcha — proposal-part streaming

Malachite supports three `ValuePayload` modes (last seen in L4 §5):
- `ProposalOnly` — value fits in one `Proposal` message. openhl uses this.
- `PartsOnly` — value is streamed in chunks.
- `ProposalAndParts` — both.

When you use `PartsOnly` or `ProposalAndParts`, the network actor maintains a *stream* per proposer per round. The Host actor reassembles parts as they arrive, signals "complete proposal arrived" via `AppMsg::ReceivedProposalPart` with `reply: Option<ProposedValue>`. Our `run_engine_app` loop replies `None` until all parts have arrived; then `Some(full_value)`.

**openhl skips this entirely** (`ProposalOnly`), so `AppMsg::ReceivedProposalPart` never fires for us. But if you fork openhl for a chain with large proposals (e.g., a CLOB chain where the value carries 10MB of pending fills), you'll need to implement the stream-reassembly path.

The gotcha to watch for: **the part-streaming code lives in `malachitebft-engine::util::streaming`**, not in your app loop. You configure it via `ConsensusConfig::value_payload`; the engine handles the rest. **You don't write the streaming code; you write the value-reassembly logic.**

## 7. Practice

1. **Map the actors.** From memory, list the five actors the engine spawns. For each, name one function it owns and one channel/message it produces.
2. **Find the actor seam.** Read `crates/consensus/src/node.rs::OpenHlNode::start@0844d58`. Identify the line where the engine actor system is started (hint: it's a `malachitebft_app_channel::start_engine(...)` call). What does openhl give the engine, and what does it get back?
3. **The actor-vs-Driver comparison.** Compare `run_single_validator` at `crates/consensus/src/runner.rs:34@0844d58` (Driver directly, sync loop) to `run_engine_app` at `crates/consensus/src/engine_app.rs:29@0844d58` (AppMsg loop, async). For each `Output<Ctx>` variant the Driver produces, identify the equivalent AppMsg variant. Is the mapping 1:1?
4. **The single-validator no-op.** When openhl runs single-validator, the Network actor starts but never receives a message. **Why doesn't the consensus halt waiting for peer votes?** Hint: think about what the proposer's own vote contributes.

> **Final check.** In one sentence, what does the actor system give you that calling `Driver::process` directly (as `run_single_validator` does) doesn't? If your answer doesn't include "timers, network, persistence, supervision," re-read §1 + §2.
````

---

## Seed-file slot

L4 and L5 close Module 2 (after L3, already drafted):

```typescript
// Course.modules.create array:
{
  title: 'Malachite as a library',
  sortOrder: 1,
  lessons: { create: [
    // L3: What Malachite gives you (already drafted in openhl_l2_l3_en.md)
    {
      title: 'What you implement — proposals, validators, votes, signing',
      slug: 'openhl-malachite-impl-en',
      type: 'CONTENT',
      sortOrder: 1,
      duration: 20,    // ← matches L9's 20 min (heaviest in arc)
      xpReward: 60,    // ← matches L9's 60 XP
      content: `# What you implement — proposals, validators, votes, signing\n\n...`  // L4 markdown
    },
    {
      title: 'The actor model behind malachitebft-engine',
      slug: 'openhl-malachite-engine-en',
      type: 'CONTENT',
      sortOrder: 2,
      duration: 15,
      xpReward: 40,
      content: `# The actor model behind \`malachitebft-engine\`\n\n...`  // L5 markdown
    },
  ]}
}
```

**Module 2 complete in drafts.** L3 + L4 + L5 = 3 of 3 lessons. ~50 min of teaching, ~140 XP.

## SHA pinning discipline

All cites pin SHA `0844d58`. L4 is cite-dense (it's the per-type walk):

- `crates/consensus/src/types/address.rs:7,9,19` — `OpenHlAddress` struct, Display impl, Address impl
- `crates/consensus/src/types/validator.rs:21,42` — `Validator` impl, `ValidatorSet::new` sort
- `crates/consensus/src/types/vote.rs:10,18` — `OpenHlVote` struct, `Vote` impl
- `crates/consensus/src/signing_provider.rs:18,34` — `OpenHlSigningProvider` struct, `SigningProvider` impl
- `crates/consensus/src/context.rs:29,32` — `type SigningScheme = Ed25519`, `select_proposer`

L5 is structurally lighter on cites (actor topology is more conceptual):

- `crates/consensus/src/engine_app.rs:29` — `run_engine_app` (cross-referenced from L11/L13)
- `crates/consensus/src/runner.rs:34` — `run_single_validator` (Stage 5 sync version, contrasted with actor version)
- `crates/consensus/src/node.rs::OpenHlNode::start` — engine spawn point

## Style review notes (self-critique before paste)

- **L4 is 20 min/60 XP** — same weight class as L9. Together they're the two "this lesson teaches everything you need to actually build, with deep code walks" lessons. The 9-section structure is justified by the per-type walk; collapsing would lose the granularity that makes the lesson useful as a reference.
- **L4 §8 ("the forty-line claim, validated")** is unusual — it reflects on the lesson's own hook. Some reviewers like this self-aware structure; others find it gimmicky. If cut, fold the LOC table into §1 ("the trait-bounds tour").
- **L4 §3's "sort order is load-bearing" anti-fluency** is one of the highest-leverage paragraphs in the entire course. Don't cut. The CometBFT-sort-convention note is also a strong forward reference to anyone reading downstream Cosmos-chain code.
- **L5 §6 (proposal-part streaming gotcha)** could be cut if the lesson runs long — it's about a feature openhl doesn't use. But it's pedagogically valuable for anyone who'll fork openhl for a different chain. Keep unless a reviewer specifically asks.
- **L5 § comparing actor-engine to direct-Driver use** (in §4 and Practice exercise 3) builds explicitly on Module 1's `run_single_validator` lesson (L5 of the synchronous runner, which is conceptually different from this L5 — confusing naming). If a reviewer flags the naming clash, rename either: the lesson L5 to "Module 2 L5" in docs, or the function to `single_validator_demo` in code.

## Curriculum status

Eleven of thirteen lessons drafted as durable files:

| Lesson | Module | File | Status |
| --- | --- | --- | --- |
| L1 — Contract between BFT and the EVM | 1 | `drafts/openhl_l1_en.md` | ✓ |
| L2 — Where chains converge | 1 | `drafts/openhl_l2_l3_en.md` | ✓ |
| L3 — Malachite's Context trait | 2 | `drafts/openhl_l2_l3_en.md` | ✓ |
| **L4 — Implementing Context sub-types** | **2** | **`drafts/openhl_l4_l5_en.md`** | **✓ NEW** |
| **L5 — The actor model** | **2** | **`drafts/openhl_l4_l5_en.md`** | **✓ NEW** |
| L7 — Engine API | 3 | `drafts/openhl_l7_l10_en.md` | ✓ |
| L9 — Designing the ConsensusBridge | 4 | `drafts/openhl_l9_en.md` | ✓ |
| L10 — Decided → forkchoice | 4 | `drafts/openhl_l7_l10_en.md` | ✓ |
| L11 — Producing blocks | 4 | `drafts/openhl_l11_en.md` | ✓ |
| L12 — Devnet bootstrap | 5 | `drafts/openhl_l12_l13_en.md` | ✓ |
| L13 — First block | 5 | `drafts/openhl_l12_l13_en.md` | ✓ |

| Module | Drafted | Total | % |
| --- | --- | --- | --- |
| 1. Execution/consensus split | L1 + L2 | 2 / 2 | ✓ 100% |
| **2. Malachite as a library** | **L3 + L4 + L5** | **3 / 3** | **✓ 100%** |
| 3. Reth as a library | L7 | 1 / 3 | 33% |
| 4. Wiring it up | L9 + L10 + L11 | 3 / 3 | ✓ 100% |
| 5. Single-validator devnet | L12 + L13 | 2 / 2 | ✓ 100% |

**Four modules complete. Only Module 3 (Reth as a library) has gaps: L6 + L8.**

Remaining: **L6** (NodeBuilder pattern / Reth without the geth-shape — Stage 7a territory) and **L8** (payload building inside Reth — the production-shape extension of L11's async-trick framing).

The course is now ~23,500 words across 7 files. A learner reading L1 → L2 → L3 → L4 → L5 → L7 → L9 → L10 → L11 → L12 → L13 gets a complete-feeling 11-lesson tour, with L6 and L8 being the only acknowledged gaps.
