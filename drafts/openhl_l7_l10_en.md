# Building OpenHL — L7 + L10 draft (EN)

> Drafted against openhl SHA `0844d58` (Stage 7c — validate_payload runs Reth's `EthBeaconConsensus`).
> Both lessons follow the validated rethlab chapter format (3am hook → 🛑 Predict/Anti-fluency callouts → numbered sections → practice + final check).
> Course: `building-openhl-consensus-en` (track: `reth-l1-architect`, course #6 of 10).

---

## L7 — `openhl-engine-api-en`

- **Module:** 3 (Reth as a library), sortOrder 1 within module
- **Course-level sortOrder:** 6 (lesson 7 of 13)
- **Duration:** 15 min
- **XP reward:** 40
- **Type:** CONTENT

### Content

````markdown
# The Engine API — what `forkchoice_updated` and `new_payload` actually do

It's 3am. Two services on the same machine — a Reth process and a Lighthouse process — are exchanging exactly **two RPC methods**. That's the whole conversation between Ethereum's consensus layer and execution layer. Once you've named those two methods, traced them through openhl's actual code, and watched a real validator force them to be implemented honestly, you'll understand why a chain like HL or Tempo can offer sub-second finality where Ethereum offers 12 seconds.

> 🛑 **Predict before scrolling.** Two methods, three forkchoice pointers (head/safe/finalized), one payload-build hint, one validation result. Sketch on paper what each method carries in and returns out. We'll trace your sketch against the real spec, and against `crates/evm/src/live_node.rs:68@0844d58`.

## 1. The conversation, named

The Ethereum Engine API — used everywhere CL talks to EL — has three calls in active use:

- `engine_forkchoiceUpdatedV3` — "here is the new head/safe/finalized state. Optionally, build a payload from this head."
- `engine_getPayloadV3` — "the payload you started building earlier — give it to me."
- `engine_newPayloadV3` — "execute this block and tell me if it's valid."

Three calls, but conceptually two operations: `forkchoiceUpdated` + `getPayload` together form one operation (build a block). Hence the "two methods" framing.

Notice what's NOT in there. There is **no** "send me the next decision" call. The CL never asks the EL "what should we decide?" The decision is made on the CL side; the EL is told what was decided.

## 2. `forkchoice_updated` — two purposes in one method

```
forkchoiceUpdated(ForkchoiceState, Option<PayloadAttributes>) → ForkchoiceUpdatedResponse
```

`ForkchoiceState`:
- `headBlockHash` — what the EL should consider the canonical head
- `safeBlockHash` — what's reasonably finalized (justified, in PoS terms)
- `finalizedBlockHash` — what's irreversibly finalized

`PayloadAttributes`:
- `timestamp`, `prevRandao`, `suggestedFeeRecipient`, plus optional fields

What it does:
- **Always**: updates the EL's view of head/safe/finalized.
- **If attrs is Some**: also starts a payload-build job and returns a `PayloadId` to fetch the result later.

> 🛑 **Predict.** Why does `forkchoice_updated` take an optional payload-attribute argument? Why not have a separate `start_build_payload` call? Hint: count the round-trips between CL and EL for the proposer's hot path.

The answer: **amortization**. The proposer's most latency-sensitive moment is the start of their slot. If "advance fork-choice" and "start building" are two separate calls, you pay two RTTs. By bundling them, you pay one. For a CL like HyperBFT shooting for sub-second slots, that's the difference between viable and not.

## 3. `new_payload` — "execute this and tell me if it's valid"

```
newPayload(ExecutionPayload) → PayloadStatus
```

When a CL receives a peer's proposal, it asks the EL to validate it before voting. The EL:
- Re-executes the transactions
- Computes the resulting state root
- Compares to the proposed state root
- Returns `Valid` if they match, `Invalid` if not, `Syncing` if the EL is behind

> 🛑 **Anti-fluency.** "The CL validates the block." **Wrong.** The CL validates the *consensus rules* — signatures, fork-choice, justification. The EL validates *the block contents* — execution, state, receipts. Confuse the two and you'll wire validation in the wrong place.

## 4. The async asymmetry — `getPayload`

`forkchoice_updated(parent, Some(attrs))` returns immediately with a `PayloadId`. The block isn't built yet — the EL has started a background job, pulling transactions from its mempool and computing state.

When the CL needs the block (its propose deadline arrives), it calls `getPayload(id)` to retrieve it.

Why decouple? **Build during voting.** The previous block is still being voted on. The EL can start building the next one before the previous one is finalized. By the time it's the CL's turn to propose, the new block is already assembled.

| When | Operation | Latency budget |
| :--- | :--- | :--- |
| Previous round in progress | EL building next payload in background | 100–400ms |
| Our slot starts | CL calls `getPayload(id)` | < 5ms |
| Got payload | CL gossips proposal | network-bound |

Without the async split, propose would have to wait for build. That single design choice is why fast L1s are possible.

## 5. openhl: in-process, named differently, same shape

openhl runs CL and EL in one binary. So our "Engine API" is a Rust trait surface, not JSON-RPC. But the *shape* is identical.

The `ConsensusBridge` trait at `crates/consensus/src/bridge.rs:11@0844d58` is the openhl Engine API:

```rust
async fn build_payload(&self, parent: BlockHash, attrs: PayloadAttrs)
    -> Result<PayloadId, BridgeError>;
async fn payload_ready(&self, id: PayloadId)
    -> Result<ExecutedBlock, BridgeError>;
async fn validate_payload(&self, block: &ExecutedBlock)
    -> Result<PayloadStatus, BridgeError>;
async fn commit(&self, block_hash: BlockHash)
    -> Result<(), BridgeError>;
```

Map each onto Ethereum:

| openhl | Ethereum equivalent |
| :--- | :--- |
| `build_payload(parent, attrs)` | `forkchoiceUpdated(state{head=parent}, Some(attrs))` returning `PayloadId` |
| `payload_ready(id)` | `getPayload(id)` |
| `validate_payload(block)` | `newPayload(block)` |
| `commit(block_hash)` | `forkchoiceUpdated(state{head=hash, finalized=hash}, None)` |

Same four messages, different names. The semantic mapping is **exact**.

What we save by going in-process:
- No JSON-RPC encoding overhead (~1–5ms per call)
- No HTTP/TCP round-trip
- No serialization of typed Rust values into JSON-of-hex-strings
- Strong typing at the boundary — the compiler catches mismatches

What we give up:
- Client diversity (Ethereum can mix-and-match CLs/ELs; we can't)
- A network-debuggable transport (JSON-RPC is human-readable)

For openhl's design point (single-team L1, sub-second finality), the trade is obviously right. **And if we ever want client diversity, the trait is small enough to expose over JSON-RPC later — the contract already exists.**

## 6. The validator forces honesty

The most pedagogically valuable moment in openhl's history was when we wired `validate_payload` to Reth's real `EthBeaconConsensus::validate_header_against_parent` at `crates/evm/src/live_node.rs:139@0844d58`.

The test went red. Reth's validator immediately rejected our previously-fine `build_payload` output because:
- We had `gas_limit: 0` (default Header value)
- We had `base_fee_per_gas: None` (default)
- We hadn't even bothered with `difficulty: 0` for post-merge

Reth's validator caught all of it. The fix wasn't to weaken the validator — it was to make `build_payload` produce a real production-shape header:

```rust
let next_base_fee = self
    .chain_spec
    .next_block_base_fee(parent_header, our_timestamp);

let header = Header {
    parent_hash: parent_b256,
    number: parent_header.number + 1,
    timestamp: our_timestamp,
    gas_limit: parent_header.gas_limit,        // no drift
    difficulty: U256::ZERO,                    // post-merge
    base_fee_per_gas: next_base_fee,           // EIP-1559 math
    ..Default::default()
};
```

The base-fee calculation calls the same helper (`ChainSpec::next_block_base_fee`) that Reth's validator uses to *verify* the base-fee. By construction, they agree — not by coincidence.

> 🛑 **Anti-fluency.** "I'll implement `validate_payload` later." **Wrong order.** Validation comes first, because real validation is what forces real construction. If you implement `build_payload` against a permissive validator (or no validator), you'll ship a header that looks fine and fails three layers down when a real node tries to validate it.

This is the L7 lesson made concrete: the Engine API isn't a passive shape. It's an **active discipline**. Reth's validator IS the spec; everything upstream has to play by its rules.

## 7. Practice

1. **Map the methods.** Without looking, write down the four openhl `ConsensusBridge` methods and their Ethereum Engine API equivalents.
2. **Find the build-while-voting moment.** In `crates/consensus/src/engine_app.rs`, find the `AppMsg::GetValue` arm. What's the equivalent Ethereum sequence? (Cheat sheet: a CL `engine_forkchoiceUpdated(state, Some(attrs))` followed by a `getPayload`.)
3. **Validator-forcing.** Read `LiveRethEvmBridge::build_payload` at `crates/evm/src/live_node.rs:68@0844d58`. Identify which fields are set non-trivially (not from `Default`). For each, name which `EthBeaconConsensus` sub-check would have failed if you'd left it at default.

> **Final check.** In one sentence, why does openhl need TWO functions (`build_payload` + `payload_ready`) where you might naively expect one? If your answer doesn't include "build-during-voting parallelism" or "the proposer's hot-path latency," re-read §4.
````

---

## L10 — `openhl-decided-to-fcu-en`

- **Module:** 4 (Wiring it up — the consensus crate), sortOrder 1 within module
- **Course-level sortOrder:** 9 (lesson 10 of 13)
- **Duration:** 15 min
- **XP reward:** 40
- **Type:** CONTENT

### Content

````markdown
# From Malachite `Decided` to Reth `forkchoice_updated`

It's 3am. Your validator just signed the deciding precommit on block 17. Malachite emits `Decided`. Your EL is sitting there. **What needs to happen, in what order, before the chain advances to block 18?**

If your answer is "we call `bridge.commit(hash)`" — keep reading. The order matters more than the call.

> 🛑 **Predict before scrolling.** List, in order, the state changes that need to happen between Malachite saying `Decided` and the next round starting. Hint: there are more than three, and skipping any one of them halts the chain.

## 1. What `Decided` means in BFT

When Malachite emits `Decided` for value V at height H, three things are simultaneously true:

1. **≥ 2/3+1 of voting power** signed a precommit for V at H.
2. **No other value can ever be decided** for height H — the signatures are recorded, and any equivocation by a validator is slashable evidence.
3. **No reorg is possible** at H. Block H is now an immutable fact of the chain.

This is the BFT promise. In Nakamoto-shape chains (PoW, ETH 1.0 longest-chain), "decided" is probabilistic — you wait k confirmations and hope no fork catches up. In BFT, **decided is decided. Forever.**

This single property changes how the EL must respond. In Ethereum, the EL applies blocks under fork-choice and is told *afterwards* which ones became finalized (via Casper FFG, ~13 minutes later). In BFT, the head and the finalized block are the same block, decided in the same operation.

## 2. What `forkchoice_updated` needs from us

The Engine API call shape:

```
forkchoiceUpdated(ForkchoiceState {
    headBlockHash:      B256,
    safeBlockHash:      B256,
    finalizedBlockHash: B256,
}, payload_attrs: None)
```

Three hashes. Reth (and any compliant EL) updates its internal pointers and immediately starts treating the named blocks as canonical.

In Ethereum, these are three potentially-different blocks:
- `head`: latest block validators are building on (might still get reorged)
- `safe`: justified, won't be reorged barring 1/3+ malicious stake
- `finalized`: irreversibly committed, can be archived

In BFT, **they collapse**. After a Malachite Decision:
- `head = decided block`
- `safe = decided block`
- `finalized = decided block`

> 🛑 **Anti-fluency.** "BFT and PoS finality are the same thing." Not quite. Ethereum's Casper FFG is a BFT *gadget* layered on a Nakamoto chain — it can finalize blocks behind the head. Pure BFT (Tendermint, HyperBFT, openhl) doesn't have this gap because the head IS finalized at every step.

## 3. The collapse, concretely

This collapse simplifies our Decided handler. We don't need to track three separate forkchoice pointers — they're always identical. The forkchoice update degenerates to:

```
forkchoiceUpdated(ForkchoiceState {
    headBlockHash:      decided_hash,
    safeBlockHash:      decided_hash,
    finalizedBlockHash: decided_hash,
}, None)
```

That's the Reth side. In openhl's in-process variant, it's just `bridge.commit(decided_hash)` — the trait we mapped in L7.

## 4. The Decided handler, walked

Here's the actual Decided arm of openhl's app loop at `crates/consensus/src/engine_app.rs:119@0844d58`:

```rust
AppMsg::Decided {
    certificate, reply, ..
} => {
    let hash = certificate.value_id;
    bridge.commit(hash).await?;
    decided.push(hash);
    current_parent = hash;

    if decided.len() >= stop_after_decisions {
        let next_height = certificate.height.increment();
        let _ = reply.send(Next::Start(next_height, validator_set.clone()));
        return Ok(decided);
    }

    let next_height = certificate.height.increment();
    current_height = next_height;
    if reply.send(Next::Start(next_height, validator_set.clone())).is_err() {
        tracing::warn!("{APP_REPLY_WAIT_LOG} (Decided)");
    }
}
```

Five steps. In order:

1. **Extract the decided hash.** `certificate.value_id` is the `BlockHash` BFT just irreversibly committed to. We have nothing to do with the decision — it's already made.

2. **Commit through the bridge.** `bridge.commit(hash).await?` propagates the decision to the EL. In the current Stage 7c code this is a stub; in Stage 7d it becomes a real `forkchoiceUpdated` call. **If this returns an error, we propagate it — the chain halts.** That's the correct behavior; we just had a decision and our EL refused to apply it. **Better to halt than to silently fork.**

3. **Update our tracking.** `decided.push(hash)` for the caller's view; `current_parent = hash` so the next `build_payload` knows what to build on.

4. **Tell consensus what's next.** `reply.send(Next::Start(...))` instructs Malachite to begin the next height. If we send `Next::Restart` instead, Malachite redoes the current height.

5. **(Test-only) early termination.** If `stop_after_decisions` was reached, return so tests can exit cleanly.

> 🛑 **Predict.** What happens if we skip step 4 — don't send any reply?

Malachite stalls. The Consensus actor blocks waiting for our response before advancing to the next height. The chain freezes. **This is by design** — Malachite refuses to advance without explicit application confirmation. It's how the EL stops the CL from getting ahead.

## 5. `Next::Start` vs `Next::Restart`

| Variant | Used when |
| :--- | :--- |
| `Next::Start(height+1, validator_set)` | Commit succeeded; advance to the next height. |
| `Next::Restart(current_height, validator_set)` | Commit failed; redo the current height (different proposer rotation may help). |

In openhl's current implementation we only use `Next::Start`. If `bridge.commit` fails, we propagate the error up the stack — by the time we'd consider `Restart`, the chain is already halted. **There's no automatic restart loop.** That's intentional: a failed commit means our state is corrupt or the EL is broken; quietly retrying would compound the problem.

Production-shape `Restart` use would be paired with infrastructure-level recovery (state restoration, WAL replay) before re-attempting. The WAL integration in Stage 7d's commit path is where that pattern would land.

## 6. The path forward — what 7d does

Stage 7c gave us a working `commit` stub. Stage 7d will turn it into a real `forkchoiceUpdated` call against Reth's in-process Engine API handle. The shape of the call doesn't change:

```rust
async fn commit(&self, block_hash: BlockHash) -> Result<(), BridgeError> {
    let hash = B256::from(block_hash.0);
    let state = ForkchoiceState {
        head_block_hash: hash,
        safe_block_hash: hash,
        finalized_block_hash: hash,
    };
    self.engine_handle
        .fork_choice_updated(state, None)
        .await
        .map_err(|e| BridgeError::Internal(eyre!("forkchoice: {e}")))?;
    Ok(())
}
```

That's the entire 7d delta. The three-hashes-collapse is preserved (because BFT). The async asymmetry from L7 is gone here (no payload attrs — we're just advancing fork-choice, not starting a new build).

> 🛑 **Anti-fluency.** "Decided and committed are the same thing." **No.** *Decided* is BFT's claim that 2/3+1 of validators agreed. *Committed* is the EL's confirmation that it actually applied the block. Both must happen for the chain to advance. Collapse them into one concept and you'll skip the bridge call entirely, ending up with consensus that decides on blocks the EL refuses to apply.

## 7. Practice

1. **Trace the three pointers.** After block 5 is decided in openhl, what are the three Forkchoice hashes openhl sends to Reth? Compare to what Ethereum mainnet would send if block 5 was its head but block 3 was its latest finalized.
2. **Find the halt condition.** What error from `bridge.commit` would prevent step 4 from running? In `crates/evm/src/live_node.rs:181@0844d58`, identify which conditions return `Ok(())` and which return `Err`.
3. **Sketch the Restart use.** If `bridge.commit` returned an error meaning "the proposer's value won't apply cleanly, but the next try should work", how would the Decided handler change? Sketch the diff to switch to `Next::Restart`.

> **Final check.** In one sentence, why does openhl wait for the application's reply (step 4) before advancing to the next height, instead of advancing immediately on `Decided`? If your answer doesn't mention "the EL might refuse" or "preventing the CL from getting ahead," re-read §4 step 2.
````

---

## Seed-file slot

Both lessons land in `prisma/seed-reth-openhl-consensus-en.ts` (course `building-openhl-consensus-en`), inside the existing module structure:

```typescript
// Course.modules.create array:

{
  title: 'Reth as a library',
  sortOrder: 2,
  lessons: { create: [
    // L6: Reth without the geth-shape (TBD)
    {
      title: 'The Engine API — forkchoice_updated and new_payload',
      slug: 'openhl-engine-api-en',
      type: 'CONTENT',
      sortOrder: 1,
      duration: 15,
      xpReward: 40,
      content: `# The Engine API — what \`forkchoice_updated\` ...`  // L7 markdown
    },
    // L8: Payload building inside Reth (TBD)
  ]}
},
{
  title: 'Wiring it up — the consensus crate',
  sortOrder: 3,
  lessons: { create: [
    // L9: Designing the ConsensusBridge trait (TBD)
    {
      title: 'From Malachite Decided to Reth forkchoice_updated',
      slug: 'openhl-decided-to-fcu-en',
      type: 'CONTENT',
      sortOrder: 1,
      duration: 15,
      xpReward: 40,
      content: `# From Malachite \`Decided\` to Reth \`forkchoice_updated\` ...`  // L10 markdown
    },
    // L11: Proposer hot loop (TBD)
  ]}
}
```

## SHA pinning discipline

Every `file:line@SHA` cite in both lessons pins SHA `0844d58` (Stage 7c HEAD on `psyto/openhl` main).

When Stage 7d lands and `bridge.commit` becomes a real `forkchoice_updated` call:
- L7 §6 (validator-forces-honesty) — no change needed, the moment lives at this SHA
- L10 §6 (path-forward / what 7d does) — bump the SHA and update the code snippet to match the real implementation; the rest of the lesson stays valid

That's the dual-repo discipline (openhl code ↔ rethlab lessons by `file:line@SHA`) working as designed. CI link-check (planned) will validate cited paths/lines resolve at the pinned SHA.

## Style review notes (self-critique before paste)

- **L7 is at the upper end of the 15-min lesson budget.** Section 6 (validator-forces-honesty) could be split into its own follow-on lesson if word count testing shows it pushes past 16 min. Currently bundled because the moment is most powerful as a Section, not a standalone reveal.
- **L10's diff between Start/Restart (§5)** is a forward-reference to recovery infrastructure that doesn't yet exist in openhl. If that bothers a reviewer, soften to "production-shape would..." rather than "the WAL integration would..."
- **No JA mirror yet.** Per rethlab's bilingual policy, JA versions (`openhl-engine-api-ja`, `openhl-decided-to-fcu-ja`) need separate seed entries before publish. Translation pass is a separate task.
