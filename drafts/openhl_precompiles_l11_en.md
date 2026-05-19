# Building OpenHL Precompiles — L11 draft (EN) — build-along

> Capstone lesson. No new code. Synthesizes Stages 9a-9d and names the deferred work.
> Course: `building-openhl-precompiles-en` (track: `reth-l1-architect`).

---

## L11 — `openhl-precompiles-capstone-en`

- **Module:** 5 (Capstone), sortOrder 0 within module
- **Course-level sortOrder:** 10 (lesson 12 of 12)
- **Duration:** 20 min
- **XP reward:** 40
- **Type:** CONTENT
- **Milestone:** Course completion

### Content

````markdown
# Lesson 11 — Capstone — what you built, what's deferred, what comes next

## Goal

By the end of this lesson:

- You can sketch the EVM ↔ CLOB architecture on a whiteboard from memory.
- You can name the four deferred items in v0 (RPC roundtrip, multi-validator OrderIds, transaction-scoped rollback, staticcall mutation refusal) and explain why each is out of scope.
- You can sketch where four extensions would land (best_ask precompile, depth precompile, clob_cancel_order, fills-as-EVM-events).
- You're ready to ship custom precompiles in your own Reth-based L1.

**No code in this lesson.** Just the mental model.

## The architecture, in one diagram

```
                ┌─────────────────────────────────────────────┐
                │           LiveRethEvmBridge                  │
                │                                              │
                │  clob: Arc<Mutex<Book>>                      │
                │  pending_fills: Arc<Mutex<Vec<Fill>>>        │
                └──────┬───────────────┬───────────────────────┘
                       │               │
            install_   │               │ install_
            clob       │               │ fill_sink
                       ▼               ▼
              ┌─────────────────────────────────────┐
              │  precompiles module (process-global) │
              │                                     │
              │  CLOB_STATE: RwLock<Option<…>>      │
              │  FILL_SINK:  RwLock<Option<…>>      │
              └──────┬───────────────┬──────────────┘
                     │               │
        read_best_   │               │ place_order
        bid          │               │
                     ▼               ▼
              ┌─────────────────────────────────────┐
              │  Reth EVM (via OpenHlEvmFactory)    │
              │                                     │
              │  Precompile registry:               │
              │    0x...0c1b → read_best_bid        │
              │    0x...0c1c → place_order          │
              └──────┬──────────────────────────────┘
                     │
                     ▼
              ┌─────────────────────────────────────┐
              │  Solidity contracts                 │
              │                                     │
              │  staticcall(0x...0c1b, "")          │
              │  call(0x...0c1c, abi.encode(...))   │
              └─────────────────────────────────────┘
```

Read top-to-bottom: the bridge owns the data, the precompile module exposes it via process-global handles, the EVM dispatches calls to the precompiles, and Solidity contracts hit those addresses just like they'd hit `ecrecover`.

Read bottom-to-top: a smart contract issues `STATICCALL(0x...0c1b)`. The Reth EVM looks up the address in its precompile registry → dispatches to `read_best_bid` → which reads from `CLOB_STATE` → which is the same `Arc<Mutex<Book>>` the bridge's `submit_order` writes to. **No translation layer. No serialization round-trip. Just memory.**

## What each module delivered

**Module 1 (Custom EVM bootstrap, L1-L3)** — The pluggable seam:

- `OpenHlEvmFactory` implements `alloy_evm::EvmFactory` — Reth's "swap one slot" interface for custom EVMs.
- `OpenHlExecutorBuilder` implements `reth_node_builder::ExecutorBuilder` — the NodeBuilder plug-in shape.
- `openhl_precompiles(base)` extends Reth's standard precompile set with our custom addresses, per hardfork (`OnceLock` cached).
- Reth boots with our EVM via `.with_components(EthereumNode::components().executor(OpenHlExecutorBuilder))`.

**Module 2 (Read precompile, L4-L6)** — Smart contracts read live CLOB state:

- `CLOB_READ_BEST_BID` at `0x...0c1b` — empty calldata, returns 64-byte ABI-encoded `(price, qty)`.
- `CLOB_STATE` global: `RwLock<Option<Arc<Mutex<Book>>>>` — process-global handle to the bridge's Book.
- `install_clob` / `uninstall_clob` / `current_best_bid` — the lifecycle and read primitives.
- Tests prove: zero output when uninstalled, live values when installed, registry-callable through dispatch.

**Module 3 (Write precompile, L7-L8)** — Smart contracts write to the CLOB:

- `CLOB_PLACE_ORDER` at `0x...0c1c` — 128-byte ABI-aligned calldata `(account, side, price, qty)`, returns 32-byte `(order_id)`.
- `NEXT_ORDER_ID: AtomicU64` — wait-free ID allocation, starts at 1 so `0` = rejected sentinel.
- Rejection paths: short input, invalid side byte, zero qty, no CLOB installed.
- Tests prove: rejections leave book untouched, valid input crosses correctly, two-precompile round-trip works.

**Module 4 (Bridge integration, L9-L10)** — Fills flow back to the bridge:

- `FILL_SINK` global: `RwLock<Option<Arc<Mutex<Vec<Fill>>>>>` — parallel structure to `CLOB_STATE`.
- `LiveRethEvmBridge::new()` installs both globals from its owned Arcs.
- `place_order` pushes fills into the sink (if installed) — they reach the next `build_payload` via the same drain as bridge-side `submit_order`.
- Integration test proves the full chain in a real Reth process: 48 tests total (47 unit + 1 integration).

## The honest deferred

Four things v0 doesn't do. Each is a real production gap. Each was deferred *deliberately* with documentation in the code.

### 1. RPC `eth_call` roundtrip

**What we proved**: direct Rust calls to `place_order(...)` and `current_best_bid()` work, and the precompiles are registered into Reth's EVM via `openhl_precompiles()`.

**What we didn't prove**: a Solidity contract calling `staticcall(0x...0c1b, "")` via JSON-RPC actually reaches our function. That path involves Reth's RPC server, its transaction simulation, its EVM dispatch — plumbing we trust Reth to handle correctly.

**Why deferred**: testing this would primarily validate Reth, not openhl. The integration boundary between our crate and Reth is `openhl_precompiles()` — once that's correct, the rest is Reth's responsibility.

**When to revisit**: if you fork Reth significantly or upgrade across a major version boundary where the precompile registry interface changes.

### 2. Multi-validator deterministic OrderIds

**What we have**: `NEXT_ORDER_ID: AtomicU64`, a process-global counter starting at 1.

**The problem**: with two validators running this code, each maintains its own counter. Validator A allocates `OrderId(5)` for some EVM call; validator B allocates `OrderId(11)` for the *same* call. **Books diverge silently.** No error, no crash — just inconsistent state across the network until a read returns different values.

**Why deferred**: openhl v0 is single-validator. Multi-validator consensus on OrderIds requires either (a) deterministic ID derivation from the EVM call itself (e.g., `keccak(tx_hash, call_index)`) or (b) reading IDs from a block-scoped shared state.

**When to revisit**: before any multi-validator deployment. **This is a network-divergence bug waiting to happen.** The doc comment on `NEXT_ORDER_ID` calls this out at the static's definition site so future code-readers see the constraint.

### 3. Transaction-scoped state shadowing (revert rollback)

**What we have**: `place_order` mutates the Book *immediately* during precompile execution.

**The problem**: if the EVM transaction reverts later (after `place_order` succeeded), the book mutation isn't rolled back. The EVM's normal storage semantics revert with the transaction — but our Book lives outside EVM storage in a process-global Arc.

**Why deferred**: storage shadowing would require either (a) journaling Book mutations so they can be replayed on revert, or (b) running the matching engine in a "virtual" mode during EVM execution and committing on transaction success. Both are non-trivial; openhl v0 punts on this.

**When to revisit**: when production traffic includes contracts that can fail mid-transaction after placing orders. **In single-actor scenarios (one matching contract, no external composability), it doesn't matter; in DeFi composability scenarios, it absolutely does.**

### 4. `staticcall` mutation refusal

**What we have**: `place_order` writes to the Book regardless of how it's called.

**The problem**: Solidity's `staticcall` is supposed to enforce read-only access — but the EVM doesn't pass the static-call flag into our precompile. A contract could `STATICCALL(0x...0c1c, ...)` and we'd happily mutate the book, breaking the contract's expectation of read-only semantics.

**Why deferred**: REVM's `PrecompileFn` signature is `fn(&[u8], u64, u64) -> PrecompileResult`. The "is this a staticcall?" flag isn't in the third argument (that's the gas reservoir). We'd need to plumb additional context through, which means either modifying REVM (a fork) or waiting for an upstream API.

**When to revisit**: when a security audit flags this as a real attack vector. **The attack scenario is contrived** — most contracts won't `STATICCALL` a known write precompile — but a careful auditor will name it.

## What comes next

Four extensions you could ship after this course, in order of complexity.

### Extension 1: `best_ask` precompile (1 day)

Mirror of `read_best_bid` for the sell side. Same shape, opposite direction. New address (`0x...0c1d`?), one new function, ~30 lines of test code. **The structural parallel to `read_best_bid` makes this nearly mechanical.**

### Extension 2: `clob_depth_at_price` precompile (2-3 days)

Takes a `(side, price)` calldata, returns the total qty resting at that price level. Useful for contracts that want to estimate slippage before placing market orders. Adds a `Book::depth_at_price()` method and a new precompile. **Conceptually similar but extends the calldata layout to include an input parameter.**

### Extension 3: `clob_cancel_order` precompile (1 week)

Takes an `(order_id, account)` calldata, removes the order from the book if it belongs to the caller. Returns success/failure. **Adds an authorization concern** — how do we verify the caller is the account that placed the order? The EVM call's `msg.sender` is the precompile-calling contract, not the original account. **You need a `keccak(account_id, signature)` scheme or a pre-registered authorization mapping.** Defer the authorization design until you've decided on your account model.

### Extension 4: Fills as EVM events (2 weeks)

Currently fills land in `bridge.pending_fills` and get attached to payload-built blocks. **Smart contracts can't observe them.** Emitting fills as EVM events would let downstream contracts subscribe via `eth_getLogs` / event filters — the same way they'd subscribe to ERC-20 transfers.

**The mechanism**: at the end of `place_order`, encode each fill as a Solidity-ABI-encoded event and call `revm::interpreter::Interpreter::add_log(...)` (or whatever the equivalent for our EVM version is). The contract emitting the event is the precompile itself (address `0x...0c1c`).

**The complexity**: precompiles aren't typically event-emitting. The revm API for this is awkward — you may need to extend the `PrecompileFn` signature, which means a small revm fork. **High-impact, high-friction.** Defer until there's clear product demand.

## Course completion — what you've internalized

The skills you've practiced through this course generalize beyond CLOB precompiles:

1. **The custom-EVM "swap one slot" pattern.** Any time you want to plug in your own dispatch into Reth's EVM — for custom opcodes, custom transaction validation, custom gas pricing — the path is the same: `EvmFactory` + `ExecutorBuilder` + `.with_components(...)`.

2. **The process-global-Arc pattern for precompile state.** REVM's function-pointer signature means closures aren't an option; process-global storage is. **The pattern compounds**: once you have one shared state (the CLOB), adding more (the fill sink) is mechanical.

3. **Schema-first protocol design.** Locking the calldata layout (L7) before the implementation (L8) means contracts built against the schema don't break when the implementation evolves. **The contract is the schema, not the function body.**

4. **Adversarial test data.** Two orders @ different prices to prove "best = highest price, not largest qty." Maker + taker to prove fills flow. Every test value should distinguish correctness from coincidence.

5. **Honest scoping with documentation.** Every deferred item is named in a doc comment at the relevant code site. **Future readers see the gap and the reason in one place.** Undocumented gaps become invisible debt.

## Where this course sits in the L1 Architect track

**Courses 1-5** (Reth internals): Reth's pipeline, payload building, NodeBuilder, evm crate, RPC.

**Courses 6-7** (consensus + CLOB): the openhl-specific machinery — Malachite consensus integration, then the CLOB matching engine.

**Course 8 (this one)**: bridging EVM ↔ CLOB via custom precompiles. **The first course that touches Reth's pluggable EVM seams.**

**Course 9 (funding state machine)**: perpetuals-specific — the funding rate machinery that turns the CLOB into a perp DEX. Will build on the precompile patterns from course 8.

**Course 10 (capstone — a full openhl deployment)**: takes everything from 1-9 and ships a runnable openhl node + a sample trading contract.

You're now 80% of the way through the L1 Architect track. **The patterns you've learned here are the foundation for everything that comes after.**

## Final answer key

```bash
cd ~/code/openhl-reference
git checkout d19ba1b
diff -u ~/code/my-openhl/crates/evm/ ./crates/evm/ --recursive
```

After L11, **the entire `crates/evm/` directory should be byte-identical** to openhl's Stage 9c+ HEAD. You've reproduced 5 commits (9a, 9b, 9c, 9c+, 9d) by hand, with full understanding of why each line is there.

Return:

```bash
git checkout main
```

## You shipped this

47 unit tests. 1 integration test. 2 custom precompiles. 2 process-globals. 1 EvmFactory. 1 ExecutorBuilder. ~600 lines of production Rust code. Smart contracts can read and write to a matching engine running on the same node — through the same EVM dispatch that handles `ecrecover` and BLS12-381.

**That's a custom L1 trading primitive built on Reth.** Go ship.
````

---

## Seed-file slot

L11 lands in a new Module 5 (Capstone) at sortOrder 0:

```typescript
{
  title: 'Lesson 11 — Capstone — what you built, what's deferred, what comes next',
  slug: 'openhl-precompiles-capstone-en',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 20,
  xpReward: 40,
  content: `# Lesson 11 — Capstone — what you built, what's deferred, what comes next\n\n...`
},
```

Add a new module entry:

```typescript
5: { title: 'Capstone', sortOrder: 5 },
```

## SHA pinning discipline

L11 doesn't introduce code changes. The cumulative answer-key check (`diff -u crates/evm/ -r`) is against `d19ba1b` — the same HEAD as L10.

## Style review notes (self-critique before paste)

- **§Goal frames L11 as mental-model lesson** — explicitly no code, just synthesis.
- **§The architecture diagram** is the centerpiece — readers can come back to this whenever they need to recall the structure.
- **§Module-by-module breakdown** condenses each module into 3-4 bullets — useful for review.
- **§Honest deferred** names 4 production gaps with **why deferred** and **when to revisit** for each. The "when to revisit" framing is action-oriented; readers can recognize the trigger conditions.
- **§What comes next** sketches 4 extensions in increasing complexity — gives readers a roadmap for their own next steps.
- **§Skills you've internalized** lifts 5 generalizable patterns out of the course content. **These are the takeaways that survive course-specific details.**
- **§Where this course sits** anchors L11 in the broader L1 Architect track.
- **§You shipped this** is the celebration paragraph — concrete numbers (47 + 1 tests, 2 precompiles, etc.) make the accomplishment tangible.
