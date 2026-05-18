# Building OpenHL — L11 draft (EN)

> Drafted against openhl SHA `0844d58` (Stage 7c). Closes Module 4 alongside L9 (designing the trait) and L10 (Decided handler).
> Course: `building-openhl-consensus-en` (track: `reth-l1-architect`, course #6 of 10).
> Original outline cited `crates/consensus/src/proposer.rs` — that file never landed; the proposer logic lives in `crates/consensus/src/engine_app.rs:65@0844d58` (the `AppMsg::GetValue` arm). Lesson updated to match actual code.

---

## L11 — `openhl-proposer-en`

- **Module:** 4 (Wiring it up — the consensus crate), sortOrder 2 within module
- **Course-level sortOrder:** 10 (lesson 11 of 13)
- **Duration:** 15 min
- **XP reward:** 40
- **Type:** CONTENT

### Content

````markdown
# Producing blocks — Malachite proposer → Reth payload → broadcast

It's 3am. Malachite's leader-election function just picked you as proposer for height 47, round 0. You have **400 milliseconds** to produce a block, broadcast it to peers, and start gathering prevotes. The clock is already running.

Where do those milliseconds go? Which 200µs of the budget is your own code, which 50ms is Reth, and which 100ms is network propagation that the proposer can't shrink no matter how hard they try? This lesson traces the proposer hot path through openhl's actual code and names the moments that matter.

> 🛑 **Predict before scrolling.** You're proposer for height N. From the moment your code learns this until you've broadcast the proposal, name every action that has to happen — in order. Hint: there are at least five, and one of them is "doesn't have to happen synchronously."

## 1. The hot path, named

When openhl's `run_engine_app` loop sees an `AppMsg::GetValue` from the consensus engine, that's the engine saying: "It's your slot. Build me a block to propose."

Trace from above-the-bridge:

| Step | Owner | What runs | Typical budget |
| :--- | :--- | :--- | :--- |
| 1 | Malachite Consensus actor | Round-robin selects us as proposer | <1µs |
| 2 | Malachite Engine actor | Sends `AppMsg::GetValue { height, round, timeout, reply }` | <5µs |
| 3 | **openhl `run_engine_app`** | Calls `bridge.build_payload(parent, attrs)` | varies — see §3 |
| 4 | **openhl `run_engine_app`** | Calls `bridge.payload_ready(id)` | varies |
| 5 | **openhl `run_engine_app`** | Wraps in `LocallyProposedValue`, sends via `reply` | <10µs |
| 6 | Malachite Consensus actor | Receives the value, calls `OpenHlContext::new_proposal` | <100µs (signing) |
| 7 | Malachite Network actor | Gossips proposal via libp2p | network-bound |

Steps 3–5 are ours. Steps 1–2 and 6–7 are Malachite. **The entire proposer hot path that we control is twelve lines of code.**

## 2. Where the milliseconds go

The `AppMsg::GetValue` payload includes a `timeout: Duration` — Malachite telling us how long we have. Our code currently ignores it (`timeout: _`), which is fine in test mode where bridge calls are synchronous. **In production it's not fine** — if `build_payload` takes longer than the timeout, Malachite stops waiting and the round times out without a proposal.

The timeout in Malachite's default `ConsensusConfig` is the **propose timeout**, typically 1–3 seconds for safety, but tunable down to 300–500ms for chains like HL or Tempo chasing sub-second slots.

| Budget consumer | Test-mode (today) | Production-mode |
| :--- | :--- | :--- |
| `bridge.build_payload` body | microseconds (in-memory) | 100–400ms (real Reth payload assembly) |
| `bridge.payload_ready` body | microseconds | <5ms (cached result) |
| `reply.send(...)` channel write | nanoseconds | nanoseconds |
| `OpenHlContext::new_proposal` + sign | microseconds | microseconds |
| Network gossip propagation | n/a (single validator) | 50–200ms (peer-count dependent) |

The expensive line in production is **assembling the actual payload from the mempool** — Reth's payload builder picks transactions, executes them, computes state. That's where the 100–400ms lives. Everything else is overhead.

> 🛑 **Anti-fluency.** "Just build the payload synchronously when it's your turn — that's the simplest design." **Wrong for production.** Synchronous build wastes most of your propose budget on work that could have happened earlier. The 4-method `ConsensusBridge` trait (L9) exists specifically to enable the async optimization. We'll see how in §5.

## 3. The proposer's code, walked

Open `crates/consensus/src/engine_app.rs:65@0844d58`:

```rust
AppMsg::GetValue {
    height,
    round,
    timeout: _,
    reply,
} => {
    let attrs = default_attrs();
    let id = bridge.build_payload(current_parent, attrs).await?;
    let block = bridge.payload_ready(id).await?;
    let value = OpenHlValue(block.hash);
    let lpv = informalsystems_malachitebft_app_channel::app::types
        ::LocallyProposedValue::new(height, round, value);
    if reply.send(lpv).is_err() {
        tracing::warn!("{APP_REPLY_WAIT_LOG} (GetValue)");
    }
}
```

Twelve lines. Five logical steps:

1. **Build payload attributes.** `default_attrs()` returns a `PayloadAttrs { timestamp: 0, fee_recipient: [0u8; 20], prev_randao: [0u8; 32] }`. In production these would come from somewhere — chain config, validator settings, the previous block's randao reveal. At v0 they're constants because no part of the chain logic depends on them yet.

2. **Start payload build.** `bridge.build_payload(current_parent, attrs).await` — returns a `PayloadId` immediately in test mode (sync impls), or starts an async job in production (with `LiveRethEvmBridge`, this would dispatch to Reth's payload-builder service).

3. **Wait for the block.** `bridge.payload_ready(id).await` — returns the assembled `ExecutedBlock`. In test mode this returns instantly; in production it blocks until the payload-builder service signals readiness (or the propose timeout fires, in which case we'd lose the round — see §5 for how to avoid).

4. **Wrap in `LocallyProposedValue`.** Malachite's app-channel uses this type as the contract handoff for proposals built locally. It's a struct of `(height, round, value)`. We don't construct a `Proposal` directly — that's the consensus actor's job.

5. **Send via the reply oneshot.** `reply.send(lpv)` is a `tokio::sync::oneshot` channel. The Engine actor is blocked waiting on the other end of that oneshot. **If we never send, Malachite stalls** (same halt pattern as L10's `Decided` reply). We send a warning if `is_err()` because the only way `send` fails is if the receiver was already dropped — meaning the engine timed out and moved on.

> 🛑 **Predict.** What happens if step 5's `reply.send(...)` happens *after* the engine's propose timeout fires?

The `send` returns `Err(_)` because the engine already gave up on the oneshot. We log a warning and continue. **Malachite advances to the next round without a proposal from us** — the round times out, prevotes go to nil, the next proposer (round-robin) gets a turn. The chain doesn't halt; it just loses a round.

This is correct behavior: a slow proposer shouldn't block the chain forever. The 1/3+ byzantine fault assumption protects against this — even with one slow validator per round, the chain advances at the speed of the average validator.

## 4. `LocallyProposedValue` — what consensus actually gets

We don't construct a Malachite `Proposal` directly. We construct `LocallyProposedValue::new(height, round, value)`. Malachite's Consensus actor takes our value, builds a `Proposal` via `OpenHlContext::new_proposal` (L4 territory), signs it via the `SigningProvider` (Stage 6a), and hands the signed Proposal to the Network actor for gossip.

We don't do any of those four operations. The trait split is deliberate: we own *value selection* (which block to propose), Malachite owns *proposal construction* (how to format it on the wire), *signing*, and *broadcast*.

| Operation | Owner | Why this owner |
| :--- | :--- | :--- |
| Pick the value | **openhl app loop** | Application-specific — the chain decides what counts as a block |
| Wrap in `Proposal` struct | Malachite | Consensus-protocol concern — the on-wire format is fixed by the BFT spec |
| Sign | `OpenHlSigningProvider` (Stage 6a) | Validator-key-specific — only we hold our key |
| Broadcast | Malachite Network actor | Network-layer concern — gossipsub topic management |

This is the same separation-of-concerns L1 §5 named for the four-message contract: the bridge owns "what the EVM does"; Malachite owns "what consensus does"; the SigningProvider owns "what our validator's key does." Each piece is small enough to be debuggable in isolation.

## 5. The async trick we're not using (yet)

Look at steps 2 and 3 of §3 again. `build_payload` and `payload_ready` are *separate calls* — that's not an accident. The split lets us do this in production:

```
Time:  t=0       t=200ms        t=400ms                   t=propose
       │           │               │                          │
       ▼           ▼               ▼                          ▼
       │       round N-1            │            our slot starts (round N)
       │   voting in progress       │
       │           │               │                          │
       └─ build_payload(...)─async─┴─ payload_ready(id) ─────┘
          (kicked off while         (just fetches the
           round N-1 still votes)    already-built block)
```

`build_payload` is called early — as soon as the previous round's decided block is known — so the EL can spend the round's voting time assembling the next block in parallel. By the time `payload_ready` is called, the block is sitting there. The propose-time critical path is reduced to "fetch the prepared payload + send the reply" — measured in microseconds, not milliseconds.

This is the **build-during-voting** optimization from L7 §4. **Today's openhl code doesn't do this** — the `AppMsg::GetValue` arm calls `build_payload` and `payload_ready` back-to-back inside the same handler. That's fine in test mode (everything is microseconds anyway). For production it needs to change to "kick off build_payload at round-decided, await payload_ready at propose time."

The trait surface already supports this — the 4-method split is the API. Implementation work for the async optimization lives outside the bridge: it's the AppMsg loop that needs to learn to call `build_payload` earlier than `GetValue` arrives.

> 🛑 **Anti-fluency.** "We can collapse `build_payload` and `payload_ready` into one method since they're always called together today." **No.** The fact that they're called together today is the bug we'll eventually fix — the trait is shaped right *to enable* the fix. Collapsing the methods would lock in the synchronous design forever.

## 6. After the reply — what Malachite does with it

Once `reply.send(lpv)` returns, our code is done. Malachite's Consensus actor receives the value and does the rest:

1. Looks up the proposer's address for (height, round) via `OpenHlContext::select_proposer` (verifies it's us)
2. Calls `OpenHlContext::new_proposal(height, round, value, pol_round, address)` to construct a `Proposal`
3. Hands the proposal to `OpenHlSigningProvider::sign_proposal` for an Ed25519 signature
4. Wraps in `SignedProposal`, hands to the Network actor
5. Network actor broadcasts via libp2p gossipsub
6. Each peer receives the proposal, validates the signature, hands it to *their* Consensus actor as an external input

We're done at step 1 of that list. From the proposer's perspective, the entire downstream pipeline is opaque — the actor framework handles it.

This is the L11 lesson made concrete: **the proposer's code is small because the contract is well-designed.** Malachite handles the consensus protocol; we handle the application-specific "what value to propose"; the bridge handles the EL-specific "how to build it."

## 7. Practice

1. **Trace the budget.** A production openhl deployment uses a 1-second propose timeout. Reth's payload builder typically takes 200ms. Network propagation to peers is ~80ms. **How much of the 1-second budget is left for the rest of consensus operations?** What does the proposer use that buffer for? (Hint: gathering prevotes from peers happens in parallel with proposal broadcast, but the proposer waits for 2/3+ prevotes before precommitting.)

2. **Find the timeout-ignored line.** In `engine_app.rs:65@0844d58`, the `AppMsg::GetValue` destructure has `timeout: _`. Find every other AppMsg variant that discards `timeout` or another field with `_`. Are any of them load-bearing? (Hint: most are fine — we don't need every field — but one or two might be production gaps.)

3. **Sketch the async optimization.** Today's `AppMsg::GetValue` handler is sync (build + ready back-to-back). Sketch the diff to call `build_payload` immediately after every `AppMsg::Decided` instead, storing the resulting `PayloadId` keyed by `(next_height, round=0)`. Then `GetValue` becomes just `payload_ready` + `reply.send`. How does this change interact with `Next::Restart` from L10 §5?

> **Final check.** In one sentence, why doesn't openhl's proposer code construct a `Proposal` directly — instead handing back a `LocallyProposedValue` and letting Malachite build the `Proposal`? If your answer doesn't include "separation of concerns: application owns value selection, consensus owns proposal construction" or "the on-wire `Proposal` format is fixed by the consensus protocol, not the application," re-read §4.
````

---

## Seed-file slot

L11 lands in `prisma/seed-reth-openhl-consensus-en.ts` (course `building-openhl-consensus-en`), as the third lesson of Module 4 (after L9 and L10, both already drafted):

```typescript
// Course.modules.create array:
{
  title: 'Wiring it up — the consensus crate',
  sortOrder: 3,
  lessons: { create: [
    {
      title: 'Designing the contract — the ConsensusBridge trait',
      slug: 'openhl-bridge-trait-en',
      type: 'CONTENT',
      sortOrder: 0,
      duration: 20,
      xpReward: 60,
      content: `# Designing the contract ...`  // L9 markdown
    },
    {
      title: 'From Malachite Decided to Reth forkchoice_updated',
      slug: 'openhl-decided-to-fcu-en',
      type: 'CONTENT',
      sortOrder: 1,
      duration: 15,
      xpReward: 40,
      content: `# From Malachite Decided ...`  // L10 markdown
    },
    {
      title: 'Producing blocks — Malachite proposer → Reth payload → broadcast',
      slug: 'openhl-proposer-en',
      type: 'CONTENT',
      sortOrder: 2,
      duration: 15,
      xpReward: 40,
      content: `# Producing blocks — Malachite proposer → Reth payload → broadcast\n\n...`  // L11 markdown
    },
  ]}
}
```

**Module 4 is now complete in the drafts directory:** L9 + L10 + L11 = 3 of 3 lessons drafted. ~50 min of teaching, ~140 XP.

## SHA pinning discipline

All cites pin SHA `0844d58`. L11 has fewer line-anchored cites than L9 because the lesson focuses on one twelve-line block of code (`engine_app.rs:65–82@0844d58`); most of the lesson is about the *budget* and *separation of concerns* around that block, not about other code.

The one cite that needs vigilance: `engine_app.rs:65@0844d58` (the GetValue arm). When the async optimization from §5 lands (likely a Module 5 or Stage 8 change), this lesson's §3 and §5 both need updates — §3 to reflect the new structure, §5 to remove "we're not using this yet."

## Style review notes (self-critique before paste)

- **§5 is the lesson's strongest pedagogical move.** It shows learners that the current code is *deliberately* incomplete in a way the trait was designed to support. That's a teaching technique worth repeating: design for the future, but ship the simpler thing now, and make the gap visible to the reader.
- **§2's budget table** has typical-mainnet numbers (Reth payload assembly 100–400ms). These are estimates from public Reth benchmarks; should be sanity-checked before the lesson goes live. If the numbers are off by a factor of 2x, the section's argument still works (the *relative* cost dominates regardless), but accuracy matters for credibility.
- **Exercise 3 references `Next::Restart`** — this is forward-reference to L10 §5. If L10 changes its treatment of Restart, this exercise needs updating in parallel.
- **No JA mirror yet.** `openhl-proposer-ja` slot reserved. The proposer-hot-path framing translates cleanly to Japanese — the "where do the milliseconds go" angle works in either language.

## Curriculum status

Five lessons drafted as durable files:

| Lesson | Module | File | Status |
| --- | --- | --- | --- |
| L1 — Contract between BFT and the EVM | 1 | `drafts/openhl_l1_en.md` | ✓ drafted |
| L7 — Engine API | 3 | `drafts/openhl_l7_l10_en.md` | ✓ drafted |
| L9 — Designing the ConsensusBridge | 4 | `drafts/openhl_l9_en.md` | ✓ drafted |
| L10 — Decided → forkchoice | 4 | `drafts/openhl_l7_l10_en.md` | ✓ drafted |
| L11 — Producing blocks (proposer) | 4 | `drafts/openhl_l11_en.md` | ✓ drafted |

**Module 4 is now complete in draft form** — all three lessons (L9 + L10 + L11) form a coherent unit: design the contract, walk the commit side, walk the propose side. Together they're ~50 min of teaching.

Remaining outlines (L2, L3, L4, L5, L6, L8, L12, L13): code exists for all at `0844d58`. Natural next pairs:
- **L12 + L13** — single-validator devnet bootstrap + first block via engine. Closes Module 5 (the final module). Both anchored in `crates/consensus/src/node.rs` + `engine_app.rs`'s integration test.
- **L4 + L5** — Context types + the actor model. Middle of arc; substantial because Context has 9 sub-types.
- **L2 + L3** — earliest in arc; the convergence lesson + Context introduction.

Two clear next moves:
- **Finish the arc start-to-end** by drafting L12 + L13 (closes the course narratively, since L13 is the "first block by the actor pipeline" test we already have)
- **Backfill the middle** by drafting L4 + L5 (these are the consensus-side counterparts to Module 3's Reth lessons)
