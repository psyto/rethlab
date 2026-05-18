# Building OpenHL — L6 + L8 draft (EN)

> Drafted against openhl SHA `0844d58` (Stage 7c). Closes Module 3 (Reth as a library), the last module to be completed. L6 sets up "you don't fork Reth, you configure it" — the NodeBuilder pattern that lets openhl reuse Reth as a library. L8 walks the payload-building pipeline that Module 2's CLOB will eventually plug into.
> Course: `building-openhl-consensus-en` (track: `reth-l1-architect`, course #6 of 10).
> **The final two lessons of the course's content arc.** With these, all 13 lessons are drafted.

---

## L6 — `openhl-reth-nodebuilder-en`

- **Module:** 3 (Reth as a library), sortOrder 0 within module
- **Course-level sortOrder:** 5 (lesson 6 of 13)
- **Duration:** 15 min
- **XP reward:** 40
- **Type:** CONTENT

### Content

````markdown
# Reth without the geth-shape — NodeBuilder and components

> **Where you are.** Sub-module 3 of 5: *Reth as a library.* Sub-module 2 was Malachite (the CL side); this sub-module is Reth (the EL side). L6 (this lesson) explains the `NodeBuilder` pattern — why you swap individual components rather than fork the whole repo. L7 is the Engine API surface — the shape of the four messages from the EL's perspective. L8 walks what Reth's `PayloadBuilderService` actually does when it assembles a block.

**You don't fork Reth. You configure it.** Most teams approaching Reth for the first time reach for `git clone paradigmxyz/reth`, edit `bin/reth/src/main.rs`, and immediately accrue technical debt — every upstream bump becomes a merge conflict.

The correct path is `reth-node-builder::NodeBuilder`. It's a fluent API that lets you swap out components (consensus engine, payload builder, block validator) while keeping everything else (DB, mempool, RPC, network) at Reth's default. The result: openhl's `LiveRethEvmBridge` runs against a real Reth node *without* maintaining a fork.

This lesson is about the seam between "what you replace" and "what you keep." By the end you'll know which 5% of Reth needs custom code for a typical L1 chain, and why the other 95% should stay at upstream defaults.

> 🛑 **Predict before scrolling.** You're building an L1 with custom consensus (Malachite/HotStuff-style) but vanilla EVM execution. Of Reth's ~30 components (DB, mempool, payload builder, network, RPC, transaction pool, validator set provider, etc.), **which need replacing and which can stay default?** Sketch your list before reading §3.

## 1. The fork-Reth temptation

The path of least apparent resistance:

```bash
git clone https://github.com/paradigmxyz/reth
cd reth
# edit bin/reth/src/main.rs to plug in your consensus
# edit crates/payload/builder/... to change payload semantics
# ... eventually realize you have 200 lines of patches across 40 files
```

Three months later, Reth releases v2.3.0. You try to rebase your patches. Half of them are over files that were refactored. The merge takes a week. **You've forked**, and now you maintain that fork forever.

The `NodeBuilder` pattern exists precisely to avoid this. Reth's authors are aware that downstream chains want to swap consensus and payload assembly. The trait-based component architecture is the supported answer.

> 🛑 **Anti-fluency.** "We need to fork Reth because our chain is too custom for the trait surface." **Almost always wrong.** If your customization is "different consensus" or "different payload selection" or "different block validation rules", the traits are designed for it. Fork only if you need to change the *storage engine* (MDBX → something else) or the *EVM itself* (custom opcodes) — both of which are extremely rare.

## 2. `NodeBuilder`'s component traits

Reth's `NodeBuilder` exposes a fluent API where you declare which type implements each component. The default `EthereumNode` configuration plugs in Reth's own implementations for everything; you swap individual slots by providing your own types.

The component traits, grouped by what they do:

| Component category | What it does | Replace for openhl? |
| :--- | :--- | :--- |
| **DB** (`Database`) | MDBX-backed storage | **No** — keep Reth's |
| **Provider** (`BlockchainProvider`) | Read API over the DB | **No** — keep Reth's |
| **Network** (`NetworkHandle`) | devp2p / discv5 / RLPx | **Likely no** — keep for compat, may disable peer discovery in single-CL deployments |
| **Pool** (`TransactionPool`) | Mempool | **No** — keep Reth's |
| **EVM** (`ConfigureEvm`) | EVM config, precompiles, hardforks | **Maybe** — replace for custom precompiles (Module 3 of openhl) |
| **Consensus** (`Consensus`) | Block-level validation rules (PoW/PoS gadgets) | **Yes** — we use Malachite, not Reth's gadget |
| **PayloadBuilder** | Assembles blocks from mempool | **Maybe** — keep default for v0; replace when CLOB needs custom ordering |
| **EngineApi** | The CL ↔ EL conversation surface | **Different transport** — openhl uses in-process trait, not JSON-RPC |
| **RPC** (`RpcEthApi`) | eth_* JSON-RPC methods | **No** — keep for compat |

The "no" rows are roughly 80% of Reth's code. The "yes" / "maybe" rows are the customization surface for a typical BFT L1.

## 3. What you keep — five components Reth gets right

Reth's MDBX-backed storage, BlockchainProvider, mempool, networking stack, and RPC server are mature, well-tested, and downstream-compatible (a wallet that talks to mainnet Reth talks to openhl's RPC unchanged). **Replacing any of them is a multi-month project with no upside.**

Specifically:

- **MDBX**: faster than LMDB, battle-tested by Erigon and Reth; replacing it means rewriting the storage engine
- **BlockchainProvider**: the read API every other component depends on; replacing it cascades through ~10 trait impls
- **TransactionPool**: the mempool with EIP-1559 ordering, replacement rules, blob-tx support; ~30k LOC of edge cases you'd reproduce
- **Network**: devp2p compatibility means your node can sync from existing peers; lose this and you can't bootstrap from Ethereum infrastructure
- **RPC**: every wallet, indexer, and explorer expects `eth_getBlockByNumber`, `eth_call`, etc.; reimplementing means everyone in the ecosystem has to special-case your chain

Keep all five. Save your engineering budget for the components you actually need to change.

## 4. What you replace — three components openhl customizes

| Component | Why replace | Where in openhl |
| :--- | :--- | :--- |
| **Consensus** (the `Consensus` trait) | Reth's default uses Ethereum's PoW/PoS gadget; we use Malachite | Implicit — we don't engage Reth's `Consensus` trait; Malachite drives the chain externally |
| **EngineApi transport** | Reth defaults to JSON-RPC; we use in-process Rust traits | `ConsensusBridge` (L1/L7/L9) replaces the JSON-RPC engine API for openhl |
| **PayloadBuilder** | Module 2's CLOB will need custom transaction ordering | Not yet replaced at v0 — see L8 for what changes |

Notice what's NOT replaced: the EVM, the storage engine, the mempool, the RPC. **openhl is 90% stock Reth**, with consensus and the engine transport swapped out. That's the right ratio for a custom-consensus chain on stock EVM semantics.

## 5. The dev-node example from our codebase

Look at `crates/evm/src/reth_node.rs:74@0844d58` — our Stage 7a smoke test:

```rust
async fn launch_and_check() -> Result<()> {
    let runtime = Runtime::test();
    let chain_spec = dev_chain_spec();
    let expected_chain_id = chain_spec.chain.id();

    let node_config = NodeConfig::test().dev().with_chain(chain_spec);

    let NodeHandle {
        node,
        node_exit_future: _,
    } = NodeBuilder::new(node_config)
        .testing_node(runtime)
        .node(EthereumNode::default())
        .launch_with_debug_capabilities()
        .await?;

    let observed_chain_id = node.chain_spec().chain.id();
    assert_eq!(observed_chain_id, expected_chain_id);
    Ok(())
}
```

Read it line by line:

1. **`Runtime::test()`** — a lightweight tokio runtime for tests (real deployments use the long-running tokio runtime)
2. **`dev_chain_spec()`** — chain ID 2600, dev genesis (we walked this in L12)
3. **`NodeConfig::test().dev().with_chain(chain_spec)`** — Reth's "dev mode" presets + our chain spec. `dev()` disables peer discovery and enables some debugging conveniences; not what production uses.
4. **`NodeBuilder::new(node_config).testing_node(runtime).node(EthereumNode::default())`** — the heart of the API. **We're using `EthereumNode::default()`** — Reth's stock configuration with all components at defaults. To customize, we'd swap `.node(EthereumNode::default())` with `.node(OpenHlEthereumNode::new())` or similar.
5. **`.launch_with_debug_capabilities().await?`** — spawns all the actors, starts listening, opens the DB.
6. **`node.chain_spec().chain.id()`** — sanity-check the node's view of the chain matches what we configured.

**This is the whole pattern.** ~10 lines of glue. The complexity is in Reth's `NodeBuilder` internals, not in our code. **A production openhl node would be ~50 lines** — this plus configuring listen ports, data directories, validator keypairs.

## 6. Why this matters for openhl long-term

The NodeBuilder pattern future-proofs openhl against three things:

1. **Reth version bumps** — when Reth releases v2.3.0, we change one SHA in `workspace.dependencies` and run `cargo update`. The trait surface is stable across minor versions; we don't have to merge patches.
2. **Custom precompiles** (Module 3 of openhl) — when we add CLOB-reading precompiles, we replace the `ConfigureEvm` slot. The rest of Reth stays default.
3. **Custom payload builders** (Module 2 of openhl) — when the CLOB needs custom transaction ordering, we replace the `PayloadBuilder` slot. The mempool, EVM execution, state computation stay default.

**Each customization is a slot, not a fork.** That's the value of the NodeBuilder design.

## 7. Practice

1. **Identify the slots.** From the §2 table, name the 9 component categories and whether openhl replaces each. Without looking, write down which 4 we'd ever consider replacing in subsequent modules of the course.
2. **Find the fork temptation.** Search openhl's repo for any code that imports a Reth crate path *deeper* than `reth-*-builder::*`, `reth-storage-api`, `reth-consensus`, `reth-chainspec`, or alloy. **Any deeper imports are signs of "we needed something the trait surface didn't expose."** What does that suggest about our customization?
3. **The custom-EVM experiment.** Suppose openhl wanted custom EVM opcodes (a real Module 3 territory). Sketch the diff to `crates/evm/src/reth_node.rs`: which `EthereumNode` slot would you replace, and what trait would your custom type implement?

> **Final check.** In one sentence, why is `NodeBuilder::new(config).node(EthereumNode::default())` a better pattern than `git clone reth && edit main.rs`? If your answer doesn't include "upstream-trackable" or "swap components without forking the whole codebase," re-read §1.
````

---

## L8 — `openhl-payload-building-en`

- **Module:** 3 (Reth as a library), sortOrder 2 within module
- **Course-level sortOrder:** 7 (lesson 8 of 13)
- **Duration:** 15 min
- **XP reward:** 40
- **Type:** CONTENT
- The final lesson drafted for the course's content arc.

### Content

````markdown
# Where a block comes from — payload building inside Reth

Between `forkchoice_updated(parent, attrs)` (L7's request) and `getPayload(id)` (L7's fetch), **Reth assembles a block**. Knowing what happens in that interval — and where the openhl-specific seam goes — is the difference between a chain that ships and one that mysteriously stalls.

This lesson walks Reth's `PayloadBuilderService` (the production-shape payload assembly that L11's "async trick" section forward-referenced), names what openhl currently does instead (synthesize an empty header), and previews where Module 2's CLOB plugs in.

> 🛑 **Predict before scrolling.** From the moment a CL says "build me a payload" to the moment the EL says "here's a block with state root X," name every operation Reth runs. Hint: there are at least four, and one of them dominates the others in latency.

## 1. The lifecycle, from request to block

The Engine API call from L7:

```
forkchoiceUpdated(state{head=parent}, Some(attrs)) → PayloadId
                                                       │
                                                       ▼ (later)
                          getPayload(id) → ExecutionPayload
```

Between `forkchoiceUpdated` (returns `PayloadId` instantly) and `getPayload` (fetches the assembled block), Reth's `PayloadBuilderService` runs the following pipeline:

| Step | Owner | What runs |
| :--- | :--- | :--- |
| 1 | PayloadBuilderService | Receive build-job request; allocate `PayloadId` |
| 2 | `EthereumPayloadBuilder` | Pull transactions from the mempool (`TransactionPool`) |
| 3 | `EthereumPayloadBuilder` | Apply ordering policy (priority fee, EIP-1559, nonce) |
| 4 | `EthEvm` (BlockExecutor) | Execute transactions against parent state; track gas |
| 5 | `EthEvm` | Compute state root via Merkle Patricia Trie |
| 6 | `EthereumPayloadBuilder` | Assemble Header (with state_root, receipts_root, etc.) |
| 7 | PayloadBuilderService | Cache result, signal `PayloadId` is ready |

Steps 2–5 dominate the wall clock. **Step 4 (real EVM execution) typically takes 50–300ms** for a full block; step 5 (state root) adds 50–150ms more.

`EthereumPayloadBuilder` lives at `reth_ethereum::node::EthereumPayloadBuilder` (from `reth-ethereum-payload-builder` at the Reth v2.2.0 source). It implements the `PayloadBuilder` trait from `reth-payload-builder`. **Every step above is in Reth's code, not ours.**

## 2. Transaction selection — `Pool::best_transactions`

The `TransactionPool` trait (at `reth-transaction-pool::TransactionPool`) exposes a `best_transactions()` method that yields txs in priority order. The default ordering policy:

1. **EIP-1559 effective tip first** — `min(max_priority_fee, max_fee - base_fee)` descending
2. **Nonce-ordered within a sender** — can't include nonce 5 before nonce 4 for the same address
3. **Replacement rules** — newer tx with higher fee replaces older tx with same nonce

The pool excludes:
- Txs whose gas would exceed `block_gas_limit`
- Txs whose sender has insufficient balance after prior txs in the block
- Txs that would revert (in some pool configurations — most use "include and let it revert" semantics)

**The pool is mempool-aware.** It knows about txns broadcast by peers but not yet included; it knows about local txns submitted via RPC; it tracks them all in a priority queue.

> 🛑 **Anti-fluency.** "Payload building is just executing transactions in order." **No.** *Selecting* which transactions to include — and in what order — is half the work. The ordering policy determines fee revenue, transaction fairness, and (importantly) MEV opportunities. **Changing the ordering policy is one of the most consequential customizations a chain can make.**

## 3. State root computation — where execution becomes a number

After step 4 (transactions executed), the EVM has a state diff: accounts modified, storage slots touched, balances updated. Step 5 condenses this into a single 32-byte `state_root` hash:

1. Apply all state changes to the parent's state trie (Merkle Patricia Trie)
2. Recompute the trie root
3. The result is `state_root` — the canonical commitment to post-block state

This is the **expensive bit**. A full mainnet block touching ~1000 accounts can take 100ms+ to compute the new trie root, depending on how cached the parent state is.

The state root is what `validate_header_against_parent` doesn't check (it can't — it doesn't execute), but `validate_block_post_execution` does. **Two validators that compute different state roots for the same block have a determinism bug** (L2 §2 territory). This is why state-root-mismatch is the headline failure mode for chain forks.

Reth's trie computation is highly optimized — it parallelizes hash computation across cores when the state diff is large enough. **One of the reasons not to fork Reth** (L6 §3) is that you'd reproduce all of this for diminishing returns.

## 4. What openhl currently does (vs production-shape)

Now compare to openhl's `LiveRethEvmBridge::build_payload` at `crates/evm/src/live_node.rs:68@0844d58`:

```rust
let parent_sealed = self.provider.sealed_header_by_hash(parent_b256)?
    .ok_or_else(|| BridgeError::Rejected(...))?;
let parent_header = parent_sealed.header();

let next_base_fee = self.chain_spec.next_block_base_fee(parent_header, our_timestamp);

let header = Header {
    parent_hash: parent_b256,
    number: parent_header.number + 1,
    timestamp: our_timestamp,
    gas_limit: parent_header.gas_limit,
    difficulty: U256::ZERO,
    base_fee_per_gas: next_base_fee,
    ..Default::default()
};
let hash = header.hash_slow();
```

Compare to §1's seven-step pipeline:

| Step | Production Reth | openhl at `0844d58` |
| :--- | :--- | :--- |
| 1. Allocate PayloadId | PayloadBuilderService | In-memory counter (`pending` HashMap) |
| 2. Pull transactions | `Pool::best_transactions` | **Skipped** — no transactions yet |
| 3. Apply ordering | EIP-1559 priority fee math | **Skipped** |
| 4. Execute via EVM | EthEvm + receipts | **Skipped** — empty body |
| 5. Compute state root | Merkle Patricia Trie | **Skipped** — state_root = parent_header.state_root (implicit) |
| 6. Assemble Header | `EthereumPayloadBuilder` | Done — but with mostly default fields |
| 7. Cache result | PayloadBuilderService | In-memory HashMap |

**Five of seven steps are skipped.** That's because openhl at SHA `0844d58` doesn't yet produce real transactions — the CLOB (Module 2 of openhl) is the source of those. Until that module ships, the bridge synthesizes empty headers that pass header-level validation (L7 §6 — the validator-forcing-honesty moment) but contain no actual transactions.

The seven-step pipeline matters because **swapping in the production-shape PayloadBuilder is the first stage of Module 2.** When the CLOB starts producing fills, those become transactions, and the bridge starts using the real builder.

## 5. Where openhl will plug in — preview of Module 2

The L8 forward reference to Module 2:

> *"Where OpenHL will later inject CLOB-fill transactions"*

The plan for openhl's CLOB integration:

1. **CLOB engine** (`crates/clob/src/`) produces matched fills as the chain runs
2. **Each fill becomes a transaction** — a transfer between buyer and seller accounts via the EVM
3. **The transaction pool** receives these fills alongside any user-submitted txns
4. **A custom `PayloadBuilder`** (replacing the EthereumPayloadBuilder slot from L6 §4) prioritizes CLOB fills over user txns in the payload-assembly order
5. **The standard Reth state computation runs** — the new state root reflects both user txs and CLOB fills

This is where openhl becomes a *perp DEX* rather than a *generic EVM*. The mechanical part — replacing one Reth component — is small (L6's NodeBuilder pattern in action). The interesting part is the CLOB matching logic itself, which is Module 2 of the rethlab course.

**L8 is a bridge between modules.** It tells the learner: "you've mastered the consensus substrate; the EVM payload pipeline is what Module 2 plugs into."

## 6. The async-trick from L11, made concrete

L11 §5 introduced an "async trick we're not using yet":

> "Kick off `build_payload(...)` at round-decided time so the EL has the whole previous round's voting window to assemble the block."

Now you can see what's being amortized. The expensive operations in §1's table (steps 2–5: pull, order, execute, state root) take 100–400ms cumulatively for a full mainnet-shape block. If those run **during** the previous round's voting (which always takes at least 200–500ms for vote propagation), the propose hot path drops to "fetch the cached payload" — microseconds, not hundreds of milliseconds.

This is **the** performance optimization that lets HL, Tempo, and openhl run sub-second slots while doing real EVM execution. **You cannot get sub-second slots without it.** Either you run an empty EVM (no real txs to execute, like openhl at `0844d58`) or you parallelize the execution against the voting window.

The ConsensusBridge trait's split between `build_payload` (start) and `payload_ready` (fetch) is shaped to support this. **The trait API is ahead of the implementation.** When the production-shape `LiveRethEvmBridge` lands, the loop in `engine_app.rs::run_engine_app` will move the `build_payload` call earlier (right after `AppMsg::Decided`), and `payload_ready` will become a constant-time fetch.

## 7. Practice

1. **The state-root question.** Two validators receive the same proposal (same Header bytes), execute it against their respective copies of parent state, and arrive at *different* state roots. What goes wrong? At which step of §1's pipeline did the divergence occur?
2. **The ordering policy.** Reth's default ordering is EIP-1559 priority fee descending. **What would change** if openhl's CLOB used a different ordering policy — say, "CLOB fills first, then user txs by priority fee"? Which lines of `EthereumPayloadBuilder` would need replacing? (Hint: it's the `Pool::best_transactions` iterator that gets reimplemented, not the executor.)
3. **The async-trick gap.** Read `crates/consensus/src/engine_app.rs:65-82@0844d58` (the `AppMsg::GetValue` arm). Sketch the diff to move the `bridge.build_payload(...)` call to fire at `AppMsg::Decided` instead. What state does the AppMsg loop need to track between these two messages?

> **Final check.** In one sentence, why is the production-shape payload-building pipeline (§1) decoupled into a separate service rather than running inline during `engine_forkchoiceUpdated`? If your answer doesn't include "async / build-during-voting" or "the proposer's hot path needs to fetch, not assemble," re-read §6.

---

**Congratulations** — this is the last lesson of *Building OpenHL — Consensus Substrate*. You've covered the contract (L1), the convergence (L2), Malachite as a library (L3 + L4 + L5), Reth as a library (L6 + L7 + L8), the wiring (L9 + L10 + L11), and the devnet (L12 + L13).

**Module 2 of the rethlab L1 Architect track picks up at openhl's CLOB matching engine** — where the first real transactions enter the chain, and §5's preview becomes Module 2's first lesson.
````

---

## Seed-file slot

L6 and L8 sit on either side of L7 in Module 3:

```typescript
// Course.modules.create array:
{
  title: 'Reth as a library',
  sortOrder: 2,
  lessons: { create: [
    {
      title: 'Reth without the geth-shape — NodeBuilder and components',
      slug: 'openhl-reth-nodebuilder-en',
      type: 'CONTENT',
      sortOrder: 0,
      duration: 15,
      xpReward: 40,
      content: `# Reth without the geth-shape — NodeBuilder and components\n\n...`  // L6 markdown
    },
    {
      title: 'The Engine API — forkchoice_updated and new_payload',
      slug: 'openhl-engine-api-en',
      type: 'CONTENT',
      sortOrder: 1,
      duration: 15,
      xpReward: 40,
      content: `# The Engine API — ...`  // L7 markdown (already drafted in openhl_l7_l10_en.md)
    },
    {
      title: 'Where a block comes from — payload building inside Reth',
      slug: 'openhl-payload-building-en',
      type: 'CONTENT',
      sortOrder: 2,
      duration: 15,
      xpReward: 40,
      content: `# Where a block comes from — payload building inside Reth\n\n...`  // L8 markdown
    },
  ]}
}
```

**Module 3 complete in drafts.** L6 + L7 + L8 = 3 of 3 lessons. ~45 min of teaching, ~120 XP.

## SHA pinning discipline

All cites pin SHA `0844d58`. L6 references:
- `crates/evm/src/reth_node.rs:74@0844d58` — the dev-node bootstrap function we wrote in Stage 7a
- Reth source paths for `NodeBuilder`, `EthereumNode` (cited by name, not line — the trait surface is the spec)

L8 references:
- `crates/evm/src/live_node.rs:68@0844d58` — `LiveRethEvmBridge::build_payload`
- `crates/consensus/src/engine_app.rs:65–82@0844d58` — the `AppMsg::GetValue` arm
- Reth source paths for `EthereumPayloadBuilder`, `PayloadBuilderService` (named, not line-numbered)

L8 is unusual in citing **two** of our own files for a single argument: the seven-step pipeline (§1, Reth source) is compared to our current code (§4, openhl code) to show what's missing and what's coming. The Module 2 preview (§5) is the bridge.

When Module 2 lands (CLOB-side work), L8 §4's "Skipped" rows will become "Done" rows. L8 will need a refresh at that point, marking the table as historical.

## Style review notes (self-critique before paste)

- **L6's anti-fluency callout** ("we need to fork Reth because our chain is too custom") is high-leverage. Most teams approaching Reth ARE on this path. The callout flips it: customization is a slot, not a fork. Don't soften.
- **L6 §2's component-category table** is the most reference-able artifact of the lesson. Reviewers may want to expand to 12+ rows; current 9-row form is the right balance — every row is a real Reth component, no padding.
- **L8 §1's seven-step pipeline** is the load-bearing argument. The "step 4 (real EVM execution) dominates" claim should be sanity-checked against actual Reth benchmarks before publish; if the dominant step is actually state-root computation (§3), reorder.
- **L8 §4's comparison table** ("openhl vs production Reth") is unusually self-critical for a lesson — it shows 5 of 7 steps as "skipped." This is the right framing because it makes the next module's work visible. Don't sand off the bluntness.
- **L8's closing "Congratulations"** treats this as the last lesson of the course. The course has 13 lessons; with all of them drafted, this is now true.
- **L6 and L8 are paired across the L7 centerpiece.** Reading L6 → L7 → L8 in order, a learner gets: (a) the framework that makes Reth pluggable, (b) the specific API that consensus and EVM exchange, (c) the work Reth does behind that API. Each lesson stands alone but they compose.

## Curriculum status — ALL THIRTEEN LESSONS DRAFTED

| Lesson | Module | File | Status |
| --- | --- | --- | --- |
| L1 — Contract between BFT and the EVM | 1 | `drafts/openhl_l1_en.md` | ✓ |
| L2 — Where chains converge | 1 | `drafts/openhl_l2_l3_en.md` | ✓ |
| L3 — Malachite's Context trait | 2 | `drafts/openhl_l2_l3_en.md` | ✓ |
| L4 — Implementing Context sub-types | 2 | `drafts/openhl_l4_l5_en.md` | ✓ |
| L5 — The actor model | 2 | `drafts/openhl_l4_l5_en.md` | ✓ |
| **L6 — Reth without the geth-shape** | **3** | **`drafts/openhl_l6_l8_en.md`** | **✓ NEW** |
| L7 — Engine API | 3 | `drafts/openhl_l7_l10_en.md` | ✓ |
| **L8 — Payload building inside Reth** | **3** | **`drafts/openhl_l6_l8_en.md`** | **✓ NEW** |
| L9 — Designing the ConsensusBridge | 4 | `drafts/openhl_l9_en.md` | ✓ |
| L10 — Decided → forkchoice | 4 | `drafts/openhl_l7_l10_en.md` | ✓ |
| L11 — Producing blocks | 4 | `drafts/openhl_l11_en.md` | ✓ |
| L12 — Devnet bootstrap | 5 | `drafts/openhl_l12_l13_en.md` | ✓ |
| L13 — First block | 5 | `drafts/openhl_l12_l13_en.md` | ✓ |

| Module | Drafted | Total | % |
| --- | --- | --- | --- |
| 1. Execution/consensus split | L1 + L2 | 2 / 2 | ✓ 100% |
| 2. Malachite as a library | L3 + L4 + L5 | 3 / 3 | ✓ 100% |
| **3. Reth as a library** | **L6 + L7 + L8** | **3 / 3** | **✓ 100%** |
| 4. Wiring it up | L9 + L10 + L11 | 3 / 3 | ✓ 100% |
| 5. Single-validator devnet | L12 + L13 | 2 / 2 | ✓ 100% |

**Every module complete.** All 13 lessons drafted. **~195 minutes / ~560 XP / ~28,000 words across 8 files.**

The course `building-openhl-consensus-en` is now fully drafted at EN. Next milestones for the curriculum:

1. **Style + content review pass** — read through all 8 files end-to-end as a single course, flag inconsistencies, harmonize voice
2. **JA translation pass** — every lesson needs an `-ja` variant for rethlab's bilingual policy (a translator's job, ~30–40 hours)
3. **Seed-file integration** — paste each lesson's markdown into the TypeScript seed structure shown in each draft file, validate that the CMS publishes correctly
4. **Code-cite link-check CI** — script to verify every `file:line@SHA` cite resolves at the pinned SHA. Catches drift when openhl evolves.
5. **Course publish** — ship as the next rethlab L1 Architect tier course (#6 of 10)

The course can be productized now. The work above is publishing logistics, not authoring.
