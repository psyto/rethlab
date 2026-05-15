import { PrismaClient } from '@prisma/client';

export async function seedRethBuildingEN(prisma: PrismaClient) {
  const tags = ['reth', 'revm', 'alloy', 'rust', 'mev', 'building', 'application', 'capstone'];

  await prisma.course.create({
    data: {
      slug: 'reth-building-en',
      title: 'Building with the Stack — Real-World Rust EVM Apps',
      description:
        "Reading the source is the prerequisite. This tier is the payoff — ten working apps in Rust + Alloy + Revm: minimal MEV searcher, reorg-aware Postgres indexer (ExEx), custom RPC endpoint, wallet backend, EIP-7702 sponsor service, Foundry-style cheatcode, swap aggregator, a frontrun-resistant order router capstone that integrates them all, a cross-client validation harness, and an HTTP 402 / MPP machine-payments endpoint.",
      difficulty: 'EXPERT',
      duration: 420,
      xpReward: 100,
      track: 'reth-building',
      tags,
      isPublished: true,
      sortOrder: 410,
      locale: 'en',
      instructorName: 'RethLab',
      modules: {
        create: [
          {
            title: 'Application Patterns',
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: 'Build a Minimal MEV Searcher in Rust',
                  slug: 'build-mev-searcher-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 45,
                  xpReward: 80,
                  content: `# Build a Minimal MEV Searcher in Rust

A greenfield "you'd structure your bot like this" walkthrough lies about the shape of production. Real searchers don't start from \`main.rs\`. They start from a **framework** — and the one to read is Paradigm's [\`artemis\`](https://github.com/paradigmxyz/artemis), the Rust MEV-bot framework Paradigm open-sourced and continues to dogfood.

Open the repo. Read it. This lesson walks you through it.

> 📌 **Why this is the right starting point.** Watching the public mempool, decoding a swap, fork-simulating in Revm, building a Flashbots bundle — every searcher does these things. The interesting question isn't "can you write them once?" It's "how do you organize them so the next strategy you ship isn't a rewrite?" That's exactly the question artemis answers. The MEV logic is yours; the orchestration is borrowed.

## The artemis architecture, in one sentence

A searcher is an **event-processing pipeline**: external signals come in, MEV logic decides what to do, actions go out. Artemis splits that pipeline into three traits and an engine that wires them together.

| Component | Trait | What it does |
| :--- | :--- | :--- |
| **Collector** | \`Collector<E>\` | External world → internal event \`E\`. Pending tx, new block, marketplace order, MEV-Share hint — each gets its own collector. |
| **Strategy** | \`Strategy<E, A>\` | Event \`E\` → zero or more actions \`A\`. This is the MEV brain. The only file you actually write per opportunity. |
| **Executor** | \`Executor<A>\` | Action \`A\` → side effect. Flashbots bundle submit, public-mempool send, off-chain order post. |

> 🛑 **Predict before scrolling.** Why is the Executor trait separate from the Strategy trait? Form a one-sentence answer about *what changes break if you fuse them*. Hold your guess until Step 5.

## Step 1: Open the traits

The whole core abstraction is one file, ~120 lines: [\`crates/artemis-core/src/types.rs\`](https://github.com/paradigmxyz/artemis/blob/main/crates/artemis-core/src/types.rs). Open it now.

\`\`\`rust
#[async_trait]
pub trait Collector<E>: Send + Sync {
    async fn get_event_stream(&self) -> Result<CollectorStream<'_, E>>;
}

#[async_trait]
pub trait Strategy<E, A>: Send + Sync {
    async fn sync_state(&mut self) -> Result<()>;
    async fn process_event(&mut self, event: E) -> Vec<A>;
}

#[async_trait]
pub trait Executor<A>: Send + Sync {
    async fn execute(&self, action: A) -> Result<()>;
}
\`\`\`

That's the entire contract. Three methods. Two generic params (\`E\` for events, \`A\` for actions). Everything else in the framework — engine, channels, mappers — is plumbing around these three.

> 🔍 **Find in repo.** In that same file, find \`CollectorMap\` and \`ExecutorMap\`. Read 30 seconds. **In your own words:** what does \`CollectorMap\` solve that you'd otherwise have to solve by writing a new Collector?

## Step 2: How events flow — read the engine

Open [\`crates/artemis-core/src/engine.rs\`](https://github.com/paradigmxyz/artemis/blob/main/crates/artemis-core/src/engine.rs). The \`Engine<E, A>\` struct holds three \`Vec<Box<dyn …>>\` — one each for collectors, strategies, executors. The \`run\` method spawns one Tokio task per component and connects them with two \`tokio::sync::broadcast\` channels:

\`\`\`
collectors -- events --> [event channel] -- events --> strategies
                                                          |
                                                         actions
                                                          v
executors <-- actions <-- [action channel] <-- actions <--+
\`\`\`

Broadcast — so every strategy sees every event; every executor sees every action. Strategies that don't care for a given event return \`vec![]\`. Executors that don't care for a given action filter via \`ExecutorMap\`.

**The whole point:** you ship a new strategy by writing one \`impl Strategy\` and calling \`engine.add_strategy(...)\`. Collectors and executors are reused.

> 🛑 **Recall checkpoint.** Without scrolling: where is the cross-strategy coordination logic? (Answer: there isn't any. The engine doesn't coordinate strategies — they're independent consumers of the same event stream. Coordination, if you need it, lives inside a single strategy by composing collectors.)

## Step 3: Find the real Collectors and Executors

Don't trust the abstraction until you've seen concrete implementors. Open these and skim:

- [\`crates/artemis-core/src/collectors/\`](https://github.com/paradigmxyz/artemis/tree/main/crates/artemis-core/src/collectors): \`mempool_collector.rs\` (subscribe to pending txs), \`block_collector.rs\` (new heads), \`mevshare_collector.rs\` (private hint stream), \`opensea_order_collector.rs\` (NFT marketplace), \`log_collector.rs\` (filtered log subscription).
- [\`crates/artemis-core/src/executors/\`](https://github.com/paradigmxyz/artemis/tree/main/crates/artemis-core/src/executors): \`mempool_executor.rs\` (public submit), \`flashbots_executor.rs\` (bundle to Flashbots relay), \`mev_share_executor.rs\` (MEV-Share submission).

Each file is small — ~50-100 lines. Open \`mempool_collector.rs\` specifically:

\`\`\`rust
#[async_trait]
impl<M> Collector<Transaction> for MempoolCollector<M>
where
    M: Middleware,
    M::Provider: PubsubClient,
{
    async fn get_event_stream(&self) -> Result<CollectorStream<'_, Transaction>> {
        let stream = self.provider.subscribe_pending_txs().await?;
        let stream = stream.transactions_unordered(256);
        let stream = stream.filter_map(|res| async move { res.ok() });
        Ok(Box::pin(stream))
    }
}
\`\`\`

That's the entire mempool collector. The \`subscribe_pending_txs().transactions_unordered(256)\` pattern materializes tx bodies in parallel — concurrency 256 — instead of one-by-one. Note what's **not** in this file: no MEV logic, no decoding, no strategy concerns. A collector's job is to push a typed stream upstream and shut up.

## Step 4: A real Strategy — opensea-sudo-arb

Now the payoff. Open [\`crates/strategies/opensea-sudo-arb/\`](https://github.com/paradigmxyz/artemis/tree/main/crates/strategies/opensea-sudo-arb). This is the one strategy shipped in the artemis tree — atomic cross-market NFT arb between OpenSea (Seaport) and Sudoswap (LSSVM pools).

Two files matter:

- [\`src/types.rs\`](https://github.com/paradigmxyz/artemis/blob/main/crates/strategies/opensea-sudo-arb/src/types.rs) — defines this strategy's \`Event\` and \`Action\` enums.
- [\`src/strategy.rs\`](https://github.com/paradigmxyz/artemis/blob/main/crates/strategies/opensea-sudo-arb/src/strategy.rs) — the \`impl Strategy<Event, Action> for OpenseaSudoArb\`.

The \`Event\` is just:

\`\`\`rust
pub enum Event {
    NewBlock(NewBlock),
    OpenseaOrder(Box<OpenseaOrder>),
}
\`\`\`

Two collectors feed this strategy: a block collector and an OpenSea order collector. That's it.

The \`process_event\` body is the **whole MEV decision**:

\`\`\`rust
async fn process_event(&mut self, event: Event) -> Vec<Action> {
    match event {
        Event::OpenseaOrder(order) => self
            .process_order_event(*order).await
            .map_or(vec![], |a| vec![a]),
        Event::NewBlock(block) => match self.process_new_block_event(block).await {
            Ok(_) => vec![],
            Err(e) => { panic!("Strategy is out of sync {}", e); }
        },
    }
}
\`\`\`

\`process_order_event\`: a new NFT listing arrived on OpenSea — is there a Sudoswap pool willing to pay more than the listing price for that NFT? If yes, return an \`Action::SubmitTx\` for an atomic arb contract that buys on OpenSea and sells into the Sudo pool in one tx.

\`process_new_block_event\`: scan the new block's logs for Sudo pool state changes (buys/sells/spot-price updates) and refresh the internal \`pool_bids\` map. No actions; just state hygiene.

> 🔍 **Find in repo.** In the same \`strategy.rs\` file, find \`sync_state\`. Read it. **Predict:** why does it need to enumerate every Sudo pool ever deployed before the strategy can start? What breaks if you skip it?

The arb contract itself is a separate piece of Solidity ([\`contracts/src/SudoOpenseaArb.sol\`](https://github.com/paradigmxyz/artemis/blob/main/crates/strategies/opensea-sudo-arb/contracts/src/SudoOpenseaArb.sol)) — the strategy's job is to detect the opportunity and shape the calldata; the on-chain contract does the atomic buy-sell.

## Step 5: Now answer the Step 1 predict

**Why is Executor separate from Strategy?** Because the same MEV opportunity can be submitted three different ways depending on chain conditions: public mempool (cheap, exposed), Flashbots bundle (private, atomic), MEV-Share (semi-private, partial-reveal). A strategy that emits a typed \`Action\` and lets the engine route to whichever executor is healthy today is **resilient**. A strategy that hardcodes \`flashbots_relay.send_bundle(...)\` dies the day Flashbots is degraded.

The trait split isn't theoretical cleanliness — it's about **swapping submission paths without touching MEV logic**.

> 🛑 **Predict.** Where would you add a private-mempool collector (e.g., Chainbound's Fiber, bloXroute) for the opensea-sudo-arb strategy? *Specifically:* which trait do you implement, what does it emit, and what (if anything) in \`strategy.rs\` has to change?

(Answer: implement \`Collector<OpenseaOrder>\` — or \`Collector<Event>\` directly via \`CollectorMap\` — and register it on the engine. Zero changes to \`strategy.rs\`. That's the architecture working.)

## Step 6: From reading to shipping — your own bot

If you wanted to ship a 2-hop Uniswap arb searcher (the classic) on Tempo or MegaETH using artemis:

1. **Reuse:** \`MempoolCollector\` for pending swaps, \`BlockCollector\` for new heads, \`FlashbotsExecutor\` (or your L1's equivalent bundle endpoint). All as-is.
2. **Write:** a single \`UniArbStrategy\` with \`Event = { NewBlock, PendingTx }\` and \`Action = { SubmitBundle }\`. Inside \`process_event\` on \`PendingTx\`: decode the swap, fork-simulate in Revm, detect the cross-pool spread, build the bundle. Inside \`process_event\` on \`NewBlock\`: refresh reserves cache, drop stale opportunities.
3. **Plumb:** \`engine.add_collector(...)\` × 2, \`engine.add_strategy(UniArbStrategy::new(...))\`, \`engine.add_executor(...)\`, \`engine.run().await\`.

The MEV-logic surface is one file. Everything else is borrowed.

## The honest comparison — artemis vs subway

Artemis acknowledges its lineage. Read the README's [Acknowledgements](https://github.com/paradigmxyz/artemis/blob/main/README.md#acknowledgements): [\`subway\`](https://github.com/libevm/subway), \`subway-rs\`, \`rusty-sando\`. These are **fully-baked** MEV bots — subway specifically is a TypeScript sandwich bot, shipped end to end, opinionated about *what MEV you're doing*.

Artemis is the opposite: a **framework** with one example strategy. Subway tells you what to run. Artemis tells you how to organize whatever you choose to run.

| | subway | artemis |
| :--- | :--- | :--- |
| **Shape** | Turnkey sandwich bot | Framework + one example strategy |
| **Language** | TypeScript | Rust |
| **Customization** | Fork and rewrite | Implement traits |
| **What you supply** | API keys, capital | MEV logic, capital |
| **Right choice when** | You want sandwiching, today, as a learning artifact | You're shipping a strategy that doesn't exist yet |

If you're reading this lesson, you're shipping the latter. Artemis is your scaffolding.

## Recall checklist

Before moving on, confirm you can answer each of these without scrolling back:

1. Name the three artemis traits and what each consumes/produces.
2. Where in the codebase does cross-strategy coordination live? (Trap question — see Step 2.)
3. Why is the Action enum strategy-local rather than framework-wide?
4. In \`opensea-sudo-arb\`, what does \`process_new_block_event\` do that \`process_order_event\` doesn't?
5. To swap submission from public mempool to Flashbots, what changes in the Strategy implementation? (Answer: nothing — you change the registered Executor.)

If you stumbled on 2 or 4, re-read Steps 2 and 4 before the next lesson.

## Drill

1. **Map out a new strategy.** Pick a real MEV opportunity (Uniswap V3 JIT liquidity, Curve cross-pool arb, perp-funding-rate arb). On paper: what \`Event\` variants does it need? What \`Action\` variants? Which existing collectors/executors can you reuse? (30 min)
2. **Trace one event end-to-end.** From a mainnet pending tx hitting \`MempoolCollector::get_event_stream\` to a hypothetical \`SubmitTxToMempool\` action being executed, list every \`.await\` point in the artemis codebase. There are fewer than you think. (45 min)
3. **Backport a collector.** Pick one collector in [\`crates/artemis-core/src/collectors/\`](https://github.com/paradigmxyz/artemis/tree/main/crates/artemis-core/src/collectors) and translate it from \`ethers-rs\` to Alloy 1.x. The trait signature doesn't change; only the underlying provider does. (2 hours)
4. **Read the run loop.** Open \`engine.rs\` again. The \`run\` method spawns \`collectors.len() + strategies.len() + executors.len()\` tasks. Walk the message-flow: how does an event from collector \`A\` reach strategy \`B\`'s \`process_event\`? Name the channel type and the receiver. (30 min)
5. **Build a stub strategy on top.** Clone artemis, add a new module under \`crates/strategies/\` that implements \`Strategy<Event, Action>\` where \`process_event\` just logs the event. Wire it into a minimal binary that runs \`MempoolCollector\` + your stub + a no-op executor. \`cargo run\` it against a free WS endpoint. (3 hours)

Finish drill 5 and you have a working artemis-based searcher skeleton ready for whatever MEV logic you want to ship into it.

> 🛑 **Final check.** In one sentence: what does artemis give you that writing a one-off \`main.rs\` doesn't? If your answer doesn't mention *reuse across strategies* or *swappable submission paths*, re-read Step 5 — that's the whole reason the abstraction exists.

## 📺 Further watching

\`\`\`youtube
vCCYFSAdCFo | Understanding MEV — Georgios Konstantopoulos, Dan Robinson, Hasu (Paradigm)
\`\`\`


---

## What comes next in this tier

The full **Building with the Stack** tier ships ten lessons end to end. From here:

- **L2** — Reorg-aware Postgres indexer (ExEx-driven, in-process)
- **L3** — Custom RPC endpoint via \`extend_rpc_modules\`
- **L4** — Wallet backend (signer pool + nonce manager + replace-on-stuck)
- **L5** — EIP-7702 sponsor service (Type 4 tx + paymaster pattern)
- **L6** — Foundry-style cheatcode (custom precompile + minimal harness)
- **L7** — Swap aggregator (Revm fork + cross-venue quotes)
- **L8 (Capstone)** — Frontrun-resistant order router that integrates everything above
- **L9** — Validate-revm cross-client harness (compare your sim against a production provider)
- **L10** — HTTP 402 / MPP machine-payments endpoint (Tempo's payments stack)

Each is a self-contained ~200–300 line build with the same predict / find-in-repo / anti-fluency style. Pick the one that maps to your target use case.
`,
                },
                {
                  title: "Read a Real Production Indexer — Tempo's tidx",
                  slug: 'build-exex-indexer-en',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 45,
                  xpReward: 80,
                  content: `# Read a Real Production Indexer — Tempo's tidx

Etherscan and Dune are indexers. Their architectures are not public. [\`tidx\`](https://github.com/tempoxyz/tidx) is — Tempo's production indexer for its EVM L1, open source, in active use. This lesson walks you through it. You'll see what they had to choose, what they got right, and what trade-offs are visible only by reading the source.

Open the repo. Read it. We'll go through it together.

> 📌 **Why this is the right starting point.** Every "build an indexer" tutorial pretends one database is enough. Real production hits a wall the moment two query shapes coexist: *"show me the last 10 transfers from address X"* (point lookup — PostgreSQL wins) and *"show me daily transfer volume for the past year"* (range scan — ClickHouse wins). tidx writes to both backends in parallel and routes queries to whichever fits. That dual-storage decision is the whole lesson.

## The OLTP vs OLAP design tension, concretely

A row store like PostgreSQL keeps each transfer's columns adjacent on disk. To answer *"last 10 transfers from 0xAlice,"* the planner uses an index on \`from\`, jumps to ~10 disk pages, returns. Microseconds.

A column store like ClickHouse keeps each *column* contiguous. To answer *"daily volume for the past year,"* it scans the \`value\` and \`block_timestamp\` columns — only those two — across millions of rows, then aggregates. Also microseconds, because it never touched the other twelve columns of each row.

Ask each store the other's question and you die:

- *"Daily volume for the past year"* on PostgreSQL: read every row of every page that contains a Transfer in that range. Disk-bound. Tens of seconds to minutes on a real dataset.
- *"Last 10 transfers from 0xAlice"* on ClickHouse: ClickHouse has no point-lookup index; it scans. Wasted IO when the answer is 10 rows.

> 🛑 **Predict before scrolling.** If you only had PostgreSQL, name one query class that would kill your indexer. If only ClickHouse, name one query class that would kill it. Hold both answers in mind — the rest of the lesson is how tidx avoids both deaths.

tidx's resolution: **write to both, route on read.** Same chain data lands in both engines; the HTTP API picks the engine based on the query (or an explicit \`?engine=\` override).

## Step 1: The Dual Sink — one chain reader, two writes

Open [\`src/sync/sink.rs\`](https://github.com/tempoxyz/tidx/blob/main/src/sync/sink.rs). The whole "write twice" abstraction is here in ~120 lines:

\`\`\`rust
#[derive(Clone)]
pub struct SinkSet {
    pool: Pool,                 // PostgreSQL (always present)
    ch: Option<ClickHouseSink>, // ClickHouse (optional)
}

impl SinkSet {
    pub async fn write_all(
        &self,
        blocks: &[BlockRow], txs: &[TxRow],
        logs: &[LogRow], receipts: &[ReceiptRow],
    ) -> Result<()> {
        if let Some(ch) = &self.ch {
            tokio::try_join!(
                writer::write_batch(&self.pool, blocks, txs, logs, receipts),
                ch.write_blocks(blocks),
                ch.write_txs(txs),
                ch.write_logs(logs),
                ch.write_receipts(receipts),
            )?;
        } else {
            writer::write_batch(&self.pool, blocks, txs, logs, receipts).await?;
        }
        Ok(())
    }
}
\`\`\`

Walk:

- **\`tokio::try_join!\`** — PG and CH writes are concurrent, not sequential. Wall-clock cost is \`max(pg, ch)\`, not \`pg + ch\`. On a healthy node, both finish in single-digit ms.
- **PG is a single transaction; CH is four direct inserts.** PostgreSQL's \`write_batch\` puts all four tables (blocks/txs/logs/receipts) in one transaction so a crash leaves nothing partial. ClickHouse doesn't do multi-table transactions — it's append-only, so partial-batch on crash is the chunk-retry path's job ([\`src/sync/ch_sink.rs\`](https://github.com/tempoxyz/tidx/blob/main/src/sync/ch_sink.rs), the \`CH_MAX_RETRIES\` loop).
- **CH is \`Option\`-al.** If you don't configure ClickHouse, tidx degrades cleanly to PG-only. The OLAP queries just stop being available.

> 🛑 **Predict.** A naive dual-sink would mean every chain read becomes two writes. What ordering guarantee does \`write_all\` give a reader? Specifically: can you query CH for block N and find it missing while PG already has it? Read the \`try_join!\` semantics and answer.

(Answer: yes, briefly — \`try_join!\` returns when both succeed, but between the two completing, a reader hitting CH first will see stale state. tidx accepts this; the ClickHouse backfill cursor — \`ch_backfill_block\` in \`sync_state\` — exists precisely to repair these gaps after the fact.)

## Step 2: The Sync Engine — one fetcher, fanned out

Open [\`src/sync/engine.rs\`](https://github.com/tempoxyz/tidx/blob/main/src/sync/engine.rs). The engine reads the chain *once* and hands the result to \`SinkSet::write_all\`. Read the struct fields:

\`\`\`rust
pub struct SyncEngine {
    throttled_pool: ThrottledPool,
    sinks: SinkSet,             // ← fan-out lives here
    realtime_rpc: RpcClient,    // ← separate RPC client for tip-following
    backfill_rpc: RpcClient,    // ← separate RPC client for gap-filling
    chain_id: u64,
    ...
}
\`\`\`

Two RPC clients, not one. Why? Realtime sync (following the chain head) has tight latency budgets; backfill (filling old gaps) is bandwidth-greedy. If they shared one connection-limited pool, a slow backfill would starve realtime and the node would visibly lag. **Separate clients = separate concurrency budgets.** The constants at the top of the file: \`REALTIME_RPC_CONCURRENCY = 4\`, \`BACKFILL_RPC_CONCURRENCY = 8\`.

> 🔍 **Find in repo.** Same file, find \`backfill_first\` and \`trust_rpc\`. Read 30 seconds each. **In your own words:** what does \`backfill_first\` change about node startup behavior, and what does \`trust_rpc\` opt out of?

## Step 3: Schemas — same data, two shapes

This is where the OLTP/OLAP duality stops being an abstraction. Open both side by side:

- PostgreSQL: [\`db/blocks.sql\`](https://github.com/tempoxyz/tidx/blob/main/db/blocks.sql), [\`txs.sql\`](https://github.com/tempoxyz/tidx/blob/main/db/txs.sql), [\`logs.sql\`](https://github.com/tempoxyz/tidx/blob/main/db/logs.sql), [\`receipts.sql\`](https://github.com/tempoxyz/tidx/blob/main/db/receipts.sql)
- ClickHouse: [\`db/clickhouse/blocks.sql\`](https://github.com/tempoxyz/tidx/blob/main/db/clickhouse/blocks.sql), [\`txs.sql\`](https://github.com/tempoxyz/tidx/blob/main/db/clickhouse/txs.sql), [\`logs.sql\`](https://github.com/tempoxyz/tidx/blob/main/db/clickhouse/logs.sql), [\`receipts.sql\`](https://github.com/tempoxyz/tidx/blob/main/db/clickhouse/receipts.sql)

Same columns. Different table engines, different ordering keys, different indexes. PG uses btree indexes on \`(tx_hash)\`, \`(block_num)\`, \`(from)\`, \`(to)\` — every column you'd point-lookup on. CH uses MergeTree-family engines sorted by \`(block_num, ...)\` — the natural physical layout for time-range scans.

The columns themselves are picked to be **JOIN-free for the common questions**. The \`txs\` table carries \`block_timestamp\` denormalized. So does \`logs\`. So does \`receipts\`. A relational purist would normalize that; a real production indexer learns it always needs a timestamp for any analytics query and pays the bytes.

> 🔍 **Find in repo.** Open both [\`db/logs.sql\`](https://github.com/tempoxyz/tidx/blob/main/db/logs.sql) and [\`db/clickhouse/logs.sql\`](https://github.com/tempoxyz/tidx/blob/main/db/clickhouse/logs.sql). Identify one column or index that exists in one and not the other. **In your own words:** what query class does each version optimize for?

## Step 4: Lazy event decoding — the killer design choice

Most indexers (Subgraph, Goldsky, OpenZeppelin Defender) demand you **pre-register** every event you want to index. You declare your ABI up front, the indexer creates a typed table per event, and only those events are decoded at write time.

tidx doesn't. Look at the \`logs\` schema — it stores **raw bytes**: \`selector BYTEA, topics BYTEA[], data BYTEA\`. No per-event tables. No pre-registration. Decoding happens at **query time**, by passing the ABI signature as a CTE generator.

Open [\`src/query/parser.rs\`](https://github.com/tempoxyz/tidx/blob/main/src/query/parser.rs). \`EventSignature::parse\` takes a string like \`Transfer(address indexed from, address indexed to, uint256 value)\` and:

1. Parses ABI param types
2. Computes \`topic0 = keccak256("Transfer(address,address,uint256)")\`
3. Returns an \`EventSignature\` the router uses to **synthesize a CTE** that filters \`logs\` by \`selector = topic0\` and projects decoded fields as named columns

The user's SQL then references the event name as a table:

\`\`\`bash
tidx query \\
  --signature "Transfer(address indexed from, address indexed to, uint256 value)" \\
  "SELECT * FROM Transfer WHERE from = '\\\\xAlice...' LIMIT 10"
\`\`\`

What this costs: storing every log on every contract, ever, even ones you'll never query. ~5–10× more raw bytes than a Subgraph-style "only index these contracts" approach.

What this buys: **a question you didn't pre-register is answerable.** A new token launches; you query it from minute one. A new event signature shows up; you decode it without backfilling. The trade-off is "spend disk to keep the question space open" — and disk is cheap.

> 🛑 **Anti-fluency check.** Without scrolling: in your own words, why can tidx skip pre-registration that Subgraph requires? What's different about *where* the decoding happens? Hint: think about where the ABI lives in the two systems.

## Step 5: Query routing — engine selection

Open [\`src/query/router.rs\`](https://github.com/tempoxyz/tidx/blob/main/src/query/router.rs). The whole engine-selection contract:

\`\`\`rust
pub enum QueryEngine {
    ClickHouse,  // OLAP
    Postgres,    // OLTP
}
\`\`\`

Two engines. The HTTP API ([\`/query\`](https://github.com/tempoxyz/tidx/tree/main/src/api)) takes an optional \`?engine=\` parameter; if omitted, the router picks. Examples from the README:

- \`SELECT * FROM blocks WHERE num = 12345\` → point lookup → PG.
- \`SELECT type, COUNT(*) FROM txs GROUP BY type\` → aggregation → CH.

The honest version: the routing rules are heuristics, not magic. Production users override with \`?engine=clickhouse\` when they know what they want. The engine separation is the architectural commitment; the auto-routing is convenience on top.

## Step 6: Materialized views — pre-computed analytics on CH

Open [\`src/api/views.rs\`](https://github.com/tempoxyz/tidx/blob/main/src/api/views.rs). ClickHouse exposes "materialized views" — auto-updated aggregations that compute on insert, not on read. tidx ships an HTTP API to manage them:

\`\`\`bash
curl -X POST "https://tidx.example.com/views" -d '{
  "chainId": 4217,
  "name": "top_holders",
  "sql": "SELECT token, holder, sum(balance) AS balance
          FROM token_balances GROUP BY token, holder HAVING balance > 0",
  "orderBy": ["token", "holder"]
}'
\`\`\`

What CH does on \`POST /views\`: creates a target table \`analytics_4217.top_holders\` with an inferred schema, creates a materialized view \`top_holders_mv\` that auto-populates on inserts to the source, then **backfills existing data** from the source query. From then on, every new insert into the source incrementally updates the view. \`SELECT * FROM top_holders\` is now an indexed lookup, not a scan.

Note the authorization: \`POST\` and \`DELETE\` require connection from a **trusted IP** (configured via \`trusted_cidrs\`, typically Tailscale). The pattern: read APIs are public; write/admin APIs are CIDR-gated.

> 🔍 **Find in repo.** In [\`views.rs\`](https://github.com/tempoxyz/tidx/blob/main/src/api/views.rs), find \`require_admin_mutation\`. Note that it requires *both* a trusted IP *and* an \`x-tidx-admin: 1\` header. **Why both?** (Defense in depth — IP can be spoofed inside a misconfigured network; the header is a cheap second check.)

## Step 7: Sync architecture — Realtime + Gap Sync

The README's [Sync Architecture](https://github.com/tempoxyz/tidx/blob/main/README.md#sync-architecture) section diagrams two concurrent loops:

- **Realtime** follows the chain head, maintains ~0 lag.
- **Gap Sync** detects discontinuities, fills them from most recent to earliest.

Gap sync is recent-first by design: users querying recent data should see it land first; old history backfills underneath. The \`sync_state\` table tracks four block numbers — \`head_num\`, \`tip_num\`, \`synced_num\`, \`backfill_num\` — and they each move under different conditions. Open [\`db/sync_state.sql\`](https://github.com/tempoxyz/tidx/blob/main/db/sync_state.sql) and read the column comments; the four-cursor design is what lets the two loops coexist without stepping on each other.

## Step 8: From reading to writing — your own indexer

If you wanted to ship an indexer for MegaETH, a custom OP-stack rollup, or your own chain, what does adopting tidx look like? Two paths:

**Adopt as-is.** If your chain speaks Ethereum JSON-RPC, change one field — \`rpc_url\` — in \`config.toml\` and run \`tidx up\`. tidx's tables are chain-agnostic; \`chain_id\` is a column, not a schema decision.

**Fork.** If your chain has features tidx's schema doesn't model — Tempo-style fee payers, custom precompile traces, sponsored-tx fields — fork three things:

1. \`db/*.sql\` and \`db/clickhouse/*.sql\` — add columns for your chain's extras.
2. \`src/sync/decoder.rs\` — extract the extra fields from each block / tx / receipt.
3. \`src/types.rs\` — extend the \`*Row\` structs that flow from decoder to sinks.

What you almost never fork: the sync engine, the dual sink, the query router, the views API. Those are the architecture; everything else is data definition.

## tidx vs Subgraph / Goldsky — the honest comparison

| | tidx | Subgraph / Goldsky |
| :--- | :--- | :--- |
| **Hosting** | Self-hosted (you run PG + CH) | Managed service |
| **Definition** | SQL schemas + on-the-fly ABI | Subgraph manifest + AssemblyScript handlers |
| **Pre-registration** | None — query any event by signature | Required — declare every event in manifest |
| **Storage cost** | Higher (raw logs kept forever) | Lower (only declared events) |
| **Query interface** | SQL + REST | GraphQL |
| **OLAP queries** | Native (ClickHouse) | Generally weak / requires export |
| **Right choice when** | You own your data, want SQL, run hot OLAP queries | You want zero-ops, GraphQL-native, declared event scope |

Neither is strictly better. tidx is the choice when you treat indexed chain data as **your database** (and the OLAP scans matter); managed services are the choice when "an API on top of chain data" is sufficient and ops capacity is the constraint.

## Recall checklist

Before moving on, confirm without scrolling:

1. Name a query class PostgreSQL kills on; name a query class ClickHouse kills on.
2. Where in the codebase do PG and CH writes fan out from a single sync step? (File + function.)
3. Why does tidx use two separate RPC clients in the sync engine?
4. Why can tidx skip event pre-registration that Subgraph requires? (Where does ABI decoding happen?)
5. What does a materialized view buy you that an ad-hoc \`GROUP BY\` query doesn't?
6. If you forked tidx for a new chain's custom tx field, name the three files you'd touch.

If you stumbled on 3, 4, or 6, re-read Steps 2, 4, and 8 before the next lesson.

## Drill

1. **Map the dual sink.** Open [\`sink.rs\`](https://github.com/tempoxyz/tidx/blob/main/src/sync/sink.rs). Trace what happens if \`writer::write_batch\` (PG) succeeds but \`ch.write_blocks\` fails inside \`try_join!\`. Does the PG transaction roll back? What does the next sync iteration do? (30 min)
2. **Find the routing rule.** Open [\`src/query/router.rs\`](https://github.com/tempoxyz/tidx/blob/main/src/query/router.rs) and the surrounding \`mod.rs\`. Identify exactly how a query with no \`?engine=\` parameter gets routed. Is it always PG? Always CH? Heuristic? Write the rule in one sentence. (45 min)
3. **Add a column to both schemas.** Pick one — say, a per-tx \`l1_origin\` field for an L2 use case. Add it to \`db/txs.sql\`, \`db/clickhouse/txs.sql\`, the \`TxRow\` struct in \`src/types.rs\`, and the decoder. \`cargo build\` it. (2 hours)
4. **Define a materialized view.** Pick a real analytics question (top 100 senders by tx count, daily-active-addresses, top-volume tokens). Write the \`POST /views\` body. Confirm the schema CH infers. (1 hour)
5. **Run it against a public chain.** \`tidx init\`, point \`rpc_url\` at a free Tempo or testnet endpoint, \`tidx up\`, watch \`tidx status --watch\` until realtime catches up. Query it. (1 hour)

Finish drill 5 and you have a running tidx instance indexing a real chain with both engines online.

> 🛑 **Final check.** In one sentence: what does tidx's dual-storage design buy you that a single-database indexer can't? If your answer doesn't mention *both* "point lookup latency" and "analytics scan throughput," re-read the opening — that tension is the whole architecture.

## 📺 Further watching

\`\`\`youtube
GhEhzE9SFqY | Alexey Shekhirin — Using Reth Execution Extensions for next generation indexing (Devcon 2024)
\`\`\`
`,
                },
                {
                  title: 'Build a Custom RPC Endpoint on Reth',
                  slug: 'build-custom-rpc-en',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 40,
                  xpReward: 70,
                  content: `# Build a Custom RPC Endpoint on Reth

You need a single API call that returns a histogram of pending tx gas prices for your fee-bidding bot. The standard \`txpool_content\` returns *every pending tx in full* — hundreds of KB you'd reduce to 10 numbers anyway. The right move: add a server-side method that does the aggregation **inside the node** and ships back the histogram. ~50 lines of Rust. No Reth fork. Live on the same HTTP / WebSocket / IPC endpoints as the native namespaces (\`eth_*\`, \`net_*\`, \`debug_*\`, \`txpool_*\`, …).

> 📌 **Scope honesty.** We add one read-only method (\`txpoolPlus_pendingByGasBucket\`) that aggregates the local mempool into 10 gas-price buckets. We don't cover authentication, rate-limiting, or write methods — those are the same patterns layered on top. The architecture lesson is "how does the trait get wired in?"

> 📚 **See also.** [QuickNode's *How to Build Custom RPC Methods with Reth*](https://www.quicknode.com/guides/infrastructure/build-custom-rpc-methods-with-reth) covers the foundation of registering a custom RPC trait. We build on top of it here with server-side aggregation, a subscription variant, and the production gaps a real custom RPC has to close.

## What you'll build

A new RPC method, callable like any other:

\`\`\`bash
$ cast rpc txpoolPlus_pendingByGasBucket
[
  {"min_gwei": 0,   "max_gwei": 1,   "count": 12},
  {"min_gwei": 1,   "max_gwei": 5,   "count": 47},
  {"min_gwei": 5,   "max_gwei": 10,  "count": 89},
  {"min_gwei": 10,  "max_gwei": 20,  "count": 134},
  {"min_gwei": 20,  "max_gwei": 30,  "count": 56},
  {"min_gwei": 30,  "max_gwei": 50,  "count": 21},
  {"min_gwei": 50,  "max_gwei": 100, "count": 8},
  {"min_gwei": 100, "max_gwei": 250, "count": 2},
  {"min_gwei": 250, "max_gwei": 500, "count": 0},
  {"min_gwei": 500, "max_gwei": 0,   "count": 1}
]
\`\`\`

Useful for: gas-price oracles, dashboard widgets, fee-bidding strategies, MEV searchers (bid above the 90th percentile of pending priority fees).

\`\`\`mermaid
flowchart LR
    Client["RPC client<br/>(cast / dapp / dashboard)"] -->|JSON-RPC POST| Handler["jsonrpsee handler"]
    Handler -->|read snapshot| Pool["TransactionPool<br/>(in-process)"]
    Pool -->|all_transactions| Bucket["Bucket math<br/>(10 ranges)"]
    Bucket -->|JSON| Client
\`\`\`

> 🛑 **Predict before scrolling.** Why is *server-side aggregation* the win here? Form a one-sentence answer about payload sizes — what does \`txpool_content\` return vs. what your dashboard actually needs? Hold your guess.

## Why a custom RPC, not a workaround

| Approach | Latency | Payload | Effort |
| :--- | :--- | :--- | :--- |
| **Call \`txpool_content\` and aggregate client-side** | RPC roundtrip + transfer all txs | hundreds of KB | trivial |
| **Run an external indexer subscribed to mempool** | µs per query (in-mem) | small | days of glue + ops |
| **Custom RPC method** | µs (in-process snapshot) | bytes | ~50 lines once |

The custom RPC sits in the sweet spot: latency of an indexer, payload of an aggregation, effort of a couple of pages of Rust. **And it ships as part of the node** — no extra service, no separate deployment, no port to expose.

## Cargo.toml

\`\`\`toml
[package]
name = "txpool-plus"
version = "0.1.0"
edition = "2021"

[dependencies]
# Reth — pin to a tag in production
reth                = { git = "https://github.com/paradigmxyz/reth", tag = "v1.5.0" }
reth-ethereum       = { git = "https://github.com/paradigmxyz/reth", tag = "v1.5.0" }

# jsonrpsee — Reth uses this RPC framework end-to-end
jsonrpsee           = { version = "0.24", features = ["server", "macros"] }

# CLI flag wiring
clap                = { version = "4", features = ["derive"] }

# Plumbing
serde               = { version = "1", features = ["derive"] }
tokio               = { version = "1", features = ["macros", "rt-multi-thread"] }
\`\`\`

> Reth's RPC stack is built on \`jsonrpsee\`. Your custom methods live in the same process, share the same listeners, and use the same auth as the natives. Don't try to start a parallel \`jsonrpsee\` server — let \`extend_rpc_modules\` register into Reth's existing one.

## Step 1: Define the RPC trait

\`jsonrpsee\` uses a procedural macro to generate the RPC plumbing from a trait. You write the trait shape; it derives the server stub, the client stub, and the JSON serialization:

\`\`\`rust
use jsonrpsee::{core::RpcResult, proc_macros::rpc};
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct GasBucket {
    pub min_gwei: u64,
    pub max_gwei: u64,  // 0 means "open-ended" for the top bucket
    pub count: usize,
}

#[rpc(server, namespace = "txpoolPlus")]
pub trait TxpoolPlusApi {
    #[method(name = "pendingByGasBucket")]
    fn pending_by_gas_bucket(&self) -> RpcResult<Vec<GasBucket>>;
}
\`\`\`

Walk:

- **\`#[rpc(server, namespace = "txpoolPlus")]\`** — the macro generates a \`TxpoolPlusApiServer\` trait you implement. The \`namespace\` becomes the JSON-RPC method prefix; combined with \`#[method(name = "pendingByGasBucket")]\`, the wire-level method name is \`txpoolPlus_pendingByGasBucket\`.
- **\`RpcResult<T>\`** — \`jsonrpsee\`'s alias for \`Result<T, ErrorObjectOwned>\`. Errors flow back to the client as proper JSON-RPC error objects with codes; you don't write the serialization yourself.
- **\`Serialize\` on the return type** — that's all that's needed. \`GasBucket\` becomes a JSON object with \`min_gwei\`, \`max_gwei\`, \`count\` fields. Snake-case → camel-case mapping is configurable; we keep snake here for clarity.

> 🔍 **Find in repo.** Open [\`reth-rpc-api\`](https://github.com/paradigmxyz/reth/tree/main/crates/rpc/rpc-api) — every native namespace (\`EthApi\`, \`DebugApi\`, \`TraceApi\`, \`TxpoolApi\`, …) is a trait declared with this exact \`#[rpc(...)]\` pattern. **Your custom trait is structurally identical to the natives. That's not a coincidence; it's the contract.**

## Step 2: Implement with pool access

The trait derived a \`TxpoolPlusApiServer\` for us. We implement it on a struct that holds a handle to the transaction pool:

\`\`\`rust
use reth_ethereum::pool::{PoolTransaction, TransactionPool};

pub struct TxpoolPlus<Pool> {
    pool: Pool,
}

const BUCKETS: &[(u64, u64)] = &[
    (0, 1), (1, 5), (5, 10), (10, 20), (20, 30),
    (30, 50), (50, 100), (100, 250), (250, 500), (500, 0),
];

impl<Pool> TxpoolPlusApiServer for TxpoolPlus<Pool>
where
    Pool: TransactionPool + Clone + 'static,
{
    fn pending_by_gas_bucket(&self) -> RpcResult<Vec<GasBucket>> {
        let mut counts = vec![0usize; BUCKETS.len()];

        // pending() returns a snapshot iterator; cheap to call.
        for tx in self.pool.pending() {
            let max_priority_fee_wei = tx.max_priority_fee_per_gas().unwrap_or(0);
            let gwei = (max_priority_fee_wei / 1_000_000_000) as u64;

            for (i, &(min, max)) in BUCKETS.iter().enumerate() {
                let upper_match = max == 0 || gwei < max;
                if gwei >= min && upper_match {
                    counts[i] += 1;
                    break;
                }
            }
        }

        Ok(BUCKETS
            .iter()
            .zip(counts)
            .map(|(&(min, max), count)| GasBucket { min_gwei: min, max_gwei: max, count })
            .collect())
    }
}
\`\`\`

Walk:

- **\`Pool: TransactionPool\`** — the trait bound. \`TransactionPool\` is the abstraction Reth uses everywhere; the concrete type is decided by the node builder. **We don't hardcode \`EthPool\` or \`BasicPool\`** — generic so this same code works on a vanilla mainnet node, an op-reth L2 node, or a custom App-chain.
- **\`pool.pending()\`** — returns a snapshot of currently-pending txs without locking the pool against new inserts. Production-grade.
- **\`max_priority_fee_per_gas\`** — what we bucket on. (Real searchers also factor in base fee; for clarity we use just the priority fee.)
- **The inner loop is \`O(buckets * pending)\`** — fine for typical pool sizes (~10K). For 100K+ pending pools, switch to binary search on the bucket array.

> 🛑 **Anti-fluency check.** Without scrolling: why is \`pool.pending()\` cheap to call here, but a real \`txpool_content\` RPC is heavy? Hint: think about what \`pending()\` returns vs. what \`txpool_content\` materializes for the wire.

## Step 3: Wire into NodeBuilder

This is the integration point. The node builder exposes \`extend_rpc_modules\` which gives you a context (pool, provider, network handle, …) and a mutable handle to the modules registry:

\`\`\`rust
use clap::Parser;
use reth_ethereum::{
    cli::{chainspec::EthereumChainSpecParser, interface::Cli},
    node::EthereumNode,
};

#[derive(Debug, Clone, Copy, Default, clap::Args)]
struct Args {
    /// Enable the txpoolPlus extension
    #[arg(long)]
    enable_txpool_plus: bool,
}

fn main() {
    Cli::<EthereumChainSpecParser, Args>::parse()
        .run(async move |builder, args| {
            let handle = builder
                .node(EthereumNode::default())
                .extend_rpc_modules(move |ctx| {
                    if !args.enable_txpool_plus {
                        return Ok(());
                    }
                    let ext = TxpoolPlus { pool: ctx.pool().clone() };
                    ctx.modules.merge_configured(ext.into_rpc())?;
                    println!("txpoolPlus_pendingByGasBucket enabled");
                    Ok(())
                })
                .launch_with_debug_capabilities()
                .await?;
            handle.wait_for_node_exit().await
        })
        .unwrap();
}
\`\`\`

Walk:

- **\`Cli<...>::parse()\`** — Reth's CLI machinery. The second generic parameter is your custom args struct, merged into the standard Reth CLI flags. \`reth node --enable-txpool-plus --http\` works.
- **\`extend_rpc_modules(|ctx| { ... })\`** — the closure runs once at startup, after the node is built but before the RPC server starts. \`ctx\` exposes \`pool()\`, \`provider()\`, \`network()\`, \`tasks()\` — every component the RPC handler might need.
- **\`ctx.modules.merge_configured(ext.into_rpc())\`** — \`into_rpc()\` is the method the \`#[rpc]\` macro generated; it produces an \`RpcModule\`. \`merge_configured\` slots it into Reth's existing dispatch table for **all configured transports** (HTTP if \`--http\`, WS if \`--ws\`, IPC if \`--ipc\`). One line, three transports.

> 🔍 **Find in repo.** Open [\`reth/examples/node-custom-rpc\`](https://github.com/paradigmxyz/reth/tree/main/examples/node-custom-rpc) — the official Paradigm example. It uses the exact same shape. **Compare it side by side to what we wrote.** The structural skeleton is identical; the only differences are namespace, method names, and what we do inside the handler.

## Step 4: Test with cast

Build, run, query:

\`\`\`bash
# In one terminal: run the node
$ cargo run --release -- node --http --enable-txpool-plus

# In another: hit the new method
$ cast rpc txpoolPlus_pendingByGasBucket --rpc-url http://localhost:8545
[{"min_gwei":0,"max_gwei":1,"count":12}, ...]

# Or via raw curl
$ curl -X POST http://localhost:8545 \\
    -H "Content-Type: application/json" \\
    -d '{"jsonrpc":"2.0","method":"txpoolPlus_pendingByGasBucket","params":[],"id":1}'
{"jsonrpc":"2.0","result":[{"min_gwei":0,"max_gwei":1,"count":12}, ...],"id":1}
\`\`\`

The method is now indistinguishable from a native one to any RPC client. **Same auth, same rate-limit (if you've configured one), same logging.** That's the contract \`extend_rpc_modules\` gives you.

## Step 5 (bonus): Add a subscription variant

WebSocket subscriptions follow the same pattern, just with a \`#[subscription(...)]\` attribute:

\`\`\`rust
use jsonrpsee::{core::SubscriptionResult, PendingSubscriptionSink, SubscriptionMessage};
use std::time::Duration;
use tokio::time::sleep;

#[rpc(server, namespace = "txpoolPlus")]
pub trait TxpoolPlusApi {
    #[method(name = "pendingByGasBucket")]
    fn pending_by_gas_bucket(&self) -> RpcResult<Vec<GasBucket>>;

    #[subscription(name = "subscribeBuckets", item = Vec<GasBucket>)]
    fn subscribe_buckets(&self, interval_secs: Option<u64>) -> SubscriptionResult;
}

// In the impl:
fn subscribe_buckets(
    &self,
    pending: PendingSubscriptionSink,
    interval_secs: Option<u64>,
) -> SubscriptionResult {
    let pool = self.pool.clone();
    let interval = Duration::from_secs(interval_secs.unwrap_or(5));

    tokio::spawn(async move {
        let Ok(sink) = pending.accept().await else { return };
        loop {
            sleep(interval).await;
            let buckets = compute_buckets(&pool); // factored out from Step 2
            let Ok(raw) = serde_json::value::to_raw_value(&buckets) else { continue };
            if sink.send(SubscriptionMessage::from(raw)).await.is_err() { return; }
        }
    });
    Ok(())
}
\`\`\`

Walk:

- **\`PendingSubscriptionSink\` → \`accept().await\` → \`sink.send(...)\`** — the standard \`jsonrpsee\` subscription handshake.
- **The closure runs in a \`tokio::spawn\`** — the RPC handler returns immediately; the actual streaming happens in a background task. **If you blocked here, the RPC server thread would stall.**
- **\`sink.send(...).is_err()\`** — the client disconnected or the channel is full; we return cleanly and the task exits. **No subscription leak.**

Now your dashboard can \`eth_subscribe("txpoolPlus_subscribeBuckets", [10])\` and get a live histogram every 10 seconds, server-side aggregated.

## What's missing for production

| Gap | What real custom RPCs do |
| :--- | :--- |
| **Auth** | The same \`AUTH_SECRET\` mechanism as the engine API; Reth wires this through automatically when you \`extend_rpc_modules\`, but you should verify your method respects it (most \`ctx\` accessors do). |
| **Rate limiting** | Reth doesn't ship a per-method rate limiter; production wraps the handler in \`tower\` middleware or rejects above a threshold inside the impl. |
| **Per-client state** | Subscriptions are per-connection by default. Cross-client coordination (e.g., shared cache invalidation) requires \`Arc<RwLock<...>>\` inside the impl struct. |
| **Self-hosted Reth ops** | If you don't want to run Reth yourself, [QuickNode Dedicated Clusters](https://www.quicknode.com/guides/infrastructure/node-setup/how-to-run-a-reth-node) let you pick Reth as the execution client and ship your custom-RPC binary as the value-add. |
| **Versioning** | Bump the namespace (\`txpoolPlus_v2_*\`) when the response shape changes; old clients should keep working. |
| **Metrics** | Reth's RPC layer exposes per-method latency / count via the metrics endpoint, but only for natives. Add your own \`metrics::counter!(...)\` calls inside your handler. |
| **Argument validation** | \`RpcResult\` lets you return \`ErrorObjectOwned::owned(code, message, data)\` cleanly. Pick stable codes; don't reuse standard JSON-RPC error codes (-32603 is "internal error", reserved). |

The architecture you wrote — define trait, impl with component access, register via \`extend_rpc_modules\` — **is what every custom Reth RPC in production looks like**. The 50-line skeleton is the same; the impl body is where each project's value lives.

## Drill

1. **Add \`pendingByNonce(address)\`.** A second method that returns the count of currently-pending txs from a given address grouped by nonce. Pattern: same trait, second \`#[method]\`, second handler. (15 min)
2. **Bucket by gas price (post-EIP-1559).** Replace priority-fee bucketing with effective-gas-price bucketing (\`base_fee + priority_fee\`, capped at \`max_fee_per_gas\`). Need to fetch base fee from the provider. **What does \`ctx\` expose to get it?** (30 min)
3. **Auth-gate the method.** Make \`txpoolPlus_pendingByGasBucket\` reject calls that don't present the engine \`AUTH_SECRET\`. (Hint: look at how Reth's debug methods do this.) (45 min)
4. **Snapshot freshness.** Add a per-snapshot timestamp + monotonic block height to the response. \`ctx.provider().best_block_number()\` is the second source of truth. (30 min)
5. **Cross-tier integration.** The MEV searcher in [lesson 1](/courses/reth-building-en/lessons/build-mev-searcher-en) of this tier could query \`txpoolPlus_pendingByGasBucket\` to set its own bid above the 90th percentile. Add a Rust client that does exactly that, using \`jsonrpsee::http_client\`. (2 hours)

Finish drill 5 and you've closed the loop: a node that exposes node-only insight as a typed RPC, consumed by a separate Rust process that uses that insight to compete in the mempool. **That round trip — observability via custom RPC, behavior via a separate consumer — is how real searcher / market-maker stacks are organized.**

> 🛑 **Final check.** In one sentence: why is \`extend_rpc_modules\` strictly more powerful than running a sidecar service that calls Reth's standard RPC? If your answer doesn't mention "in-process access to node components", re-read Step 3 — that access is the leverage.

`,
                },
                {
                  title: 'Build a Wallet Backend in Rust',
                  slug: 'build-wallet-backend-en',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 45,
                  xpReward: 80,
                  content: `# Build a Wallet Backend in Rust

A user clicks "Send" fifty times in a minute. Your wallet has to: pick the next *nonce* (the per-account counter Ethereum uses to order transactions) without colliding, sign with the right key, broadcast, watch the mempool, and — when gas spikes from 5 gwei to 80 gwei mid-flight — **bump the fee on stuck txs and replace them** so the user's session doesn't deadlock behind a single dust-priced transaction. Wallet UIs are the famous part. The send service behind them is the part teams actually wrestle with. ~250 lines of Rust below — signer pool, nonce manager, send queue, replace-on-stuck, confirm watcher.

> 📌 **Scope honesty.** We build the **service** — signer pool + nonce manager + send queue + replace-on-stuck + confirm watcher — exposed over a tiny HTTP API. We don't cover key custody (HSM, MPC, KMS), fiat onramps, or the JS SDK. Those layers all sit *on top of* a send service that works; this lesson builds the part that has to work.

## What you'll build

A backend service that exposes:

\`\`\`bash
$ curl -X POST http://localhost:7000/send \\
    -H "Content-Type: application/json" \\
    -d '{
      "from":  "0xAlice...",
      "to":    "0xBob...",
      "value": "0x16345785d8a0000",
      "data":  "0x"
    }'
{ "tx_hash": "0xabc...", "queued_at": "2026-05-04T12:34:56Z" }
\`\`\`

Behind that one POST: signer lookup by from-address, nonce reservation, gas-price computation, tx signing, broadcast via Alloy, **and a background watcher that bumps the fee if the tx hasn't landed within 30 seconds**.

\`\`\`mermaid
flowchart TB
    Client["HTTP client"] -->|POST /send| API["axum handler"]
    API -->|reserve nonce| NM["NonceManager<br/>(per-address)"]
    API -->|build & sign| Signer["PrivateKeySigner<br/>(loaded from env)"]
    API -->|broadcast| Provider["Alloy Provider"]
    API -->|track| Q["pending queue<br/>(tx_hash, deadline, fee)"]
    Q -->|every 5s| Watcher["confirm watcher"]
    Watcher -->|landed?| Provider
    Watcher -->|stuck > 30s| Bump["bump fee 1.25x<br/>+ resubmit"]
    Bump --> Q
\`\`\`

> 🛑 **Predict before scrolling.** The naive way is "fetch nonce from RPC, sign, send". Walk through what breaks if you POST /send twice within 100 ms for the same from-address. **Form a one-sentence answer about what specifically goes wrong.** Hold your guess.

## Why this is hard

| Problem | Naive approach | What goes wrong |
| :--- | :--- | :--- |
| **Nonce racing** | \`provider.get_transaction_count(from).await\` per send | Two concurrent sends both read nonce N, both sign with N, only one lands. The other is rejected by the mempool. |
| **Stuck txs** | Hope the gas price was high enough | Mainnet gas spikes from 5 → 80 gwei in seconds. Your tx sits in mempool for hours. |
| **Replace logic** | "Just resubmit with the same nonce" | Most nodes reject replacements that don't bump fee by ≥10%. Naive resubmit silently fails. |
| **Confirmation loss** | Trust \`eth_sendRawTransaction\`'s return | The tx hash is "I accepted it"; not "it landed". Network reorgs and dropped peers happen. |

A real wallet backend solves each. We'll do all four.

## Cargo.toml

\`\`\`toml
[package]
name = "wallet-backend"
version = "0.1.0"
edition = "2021"

[dependencies]
# Alloy
alloy-primitives    = "1.5"
alloy-provider      = "1.0"
alloy-rpc-types     = "1.0"
alloy-network       = "1.0"
alloy-signer        = "1.0"
alloy-signer-local  = "1.0"
alloy-consensus     = "2.0"
alloy-eips          = "1.0"

# HTTP server
axum                = "0.7"

# Plumbing
tokio               = { version = "1", features = ["full"] }
serde               = { version = "1", features = ["derive"] }
serde_json          = "1"
eyre                = "0.6"
tracing             = "0.1"
tracing-subscriber  = "0.3"
\`\`\`

## Step 1: Signer pool + nonce manager

The core invariant: **every address has exactly one source of truth for its next nonce**, and that source is in-process state, not a fresh RPC call:

\`\`\`rust
use alloy_primitives::Address;
use alloy_signer_local::PrivateKeySigner;
use std::{collections::HashMap, sync::Arc};
use tokio::sync::Mutex;

pub struct SignerPool {
    inner: HashMap<Address, PrivateKeySigner>,
}

impl SignerPool {
    pub fn from_env() -> eyre::Result<Self> {
        // SIGNERS env var: comma-separated 0x-prefixed private keys
        let mut inner = HashMap::new();
        for hex in std::env::var("SIGNERS")?.split(',') {
            let signer: PrivateKeySigner = hex.trim().parse()?;
            inner.insert(signer.address(), signer);
        }
        Ok(Self { inner })
    }

    pub fn get(&self, addr: &Address) -> Option<&PrivateKeySigner> {
        self.inner.get(addr)
    }
}

#[derive(Clone)]
pub struct NonceManager {
    state: Arc<Mutex<HashMap<Address, u64>>>,
}

impl NonceManager {
    pub fn new() -> Self {
        Self { state: Arc::new(Mutex::new(HashMap::new())) }
    }

    /// Reserve the next nonce for \`addr\`, initializing from RPC on first use.
    pub async fn reserve<P: alloy_provider::Provider>(
        &self,
        addr: Address,
        provider: &P,
    ) -> eyre::Result<u64> {
        let mut state = self.state.lock().await;
        let nonce = match state.get(&addr) {
            Some(&n) => n,
            None => provider.get_transaction_count(addr).pending().await?,
        };
        state.insert(addr, nonce + 1);
        Ok(nonce)
    }

    /// Reset cached nonce for \`addr\` (call after a non-recoverable submission failure).
    pub async fn forget(&self, addr: Address) {
        self.state.lock().await.remove(&addr);
    }
}
\`\`\`

Walk:

- **\`Arc<Mutex<HashMap>>\` for the nonce state** — yes, a single global mutex. Send throughput is bounded by *signing speed*, not by lock contention; the critical section here is microseconds. Don't pre-optimize with sharded locks until you've measured.
- **\`provider.get_transaction_count(addr).pending()\`** — \`pending\` is the key word. The default \`get_transaction_count\` returns confirmed-only count; \`pending\` includes txs sitting in the mempool. **You want pending** — confirmed-only would re-use a nonce that's already in flight.
- **\`reserve\` is \`async\` because the *first* call hits RPC.** Subsequent calls are pure local state. This means the slow path (cold start) is one RPC; the hot path (sustained sends) is zero.
- **\`forget\` is the safety valve.** If a submission fails for "nonce too low" or similar, the in-memory state has drifted from the chain — drop it and let the next call re-initialize from RPC.

> 🔍 **Find in repo.** Open [\`alloy-signer-local\`](https://github.com/alloy-rs/alloy/tree/main/crates/signer-local). The \`PrivateKeySigner\` you parsed from a hex string is the same type you'd get from a keystore file (\`PrivateKeySigner::decrypt_keystore\`) or a mnemonic. **The send service doesn't care which.**

## Step 2: Gas estimation (EIP-1559)

EIP-1559 gas: \`max_priority_fee_per_gas\` (your tip to the validator) + \`base_fee\` (burned, set by the protocol per block). Your \`max_fee_per_gas\` is the cap on the sum.

\`\`\`rust
use alloy_eips::eip1559::Eip1559Estimation;

#[derive(Clone, Copy, Debug)]
pub struct GasParams {
    pub max_fee_per_gas: u128,
    pub max_priority_fee_per_gas: u128,
}

pub async fn estimate_gas<P: alloy_provider::Provider>(provider: &P) -> eyre::Result<GasParams> {
    let est: Eip1559Estimation = provider.estimate_eip1559_fees().await?;
    Ok(GasParams {
        max_fee_per_gas: est.max_fee_per_gas,
        max_priority_fee_per_gas: est.max_priority_fee_per_gas,
    })
}

pub fn bump(params: GasParams) -> GasParams {
    // 25% bump — comfortably above the 10% mempool minimum on most clients
    GasParams {
        max_fee_per_gas: params.max_fee_per_gas * 125 / 100,
        max_priority_fee_per_gas: params.max_priority_fee_per_gas * 125 / 100,
    }
}
\`\`\`

Walk:

- **\`provider.estimate_eip1559_fees()\`** — Alloy's helper that calls \`eth_feeHistory\` under the hood and gives you a sane \`(max_fee, priority_fee)\` based on the last few blocks. **Don't hand-roll fee math** for the simple case; use the helper.
- **\`bump\` is 25%, not 10%.** The mempool's minimum replacement bump is 10% on most clients (geth, Reth, Erigon). Submit at exactly 10% and you're betting the float won't trip a node's \`>\` vs \`>=\` check. **25% is the cheap safety margin** that always works.
- **No retry on the *estimate*.** If \`estimate_eip1559_fees\` fails, your provider is having a bad time and any send right now is unsafe.

## Step 3: Send + queue for confirmation

\`\`\`rust
use alloy_consensus::{TxEip1559, SignableTransaction};
use alloy_network::{TxSignerSync, TransactionBuilder};
use alloy_primitives::{Bytes, U256};
use alloy_rpc_types::TransactionRequest;
use std::time::{Duration, Instant};

#[derive(Clone)]
pub struct PendingTx {
    pub from: Address,
    pub nonce: u64,
    pub current_hash: alloy_primitives::B256,
    pub gas_params: GasParams,
    pub deadline: Instant,
    pub original_request: TransactionRequest,
}

pub async fn send_one<P: alloy_provider::Provider>(
    provider: &P,
    pool: &SignerPool,
    nm: &NonceManager,
    req: TransactionRequest,
) -> eyre::Result<PendingTx> {
    let from = req.from.ok_or_else(|| eyre::eyre!("from required"))?;
    let signer = pool.get(&from).ok_or_else(|| eyre::eyre!("unknown signer: {from}"))?;

    let nonce = nm.reserve(from, provider).await?;
    let gas = estimate_gas(provider).await?;
    let chain_id = provider.get_chain_id().await?;

    let req = req
        .with_nonce(nonce)
        .with_chain_id(chain_id)
        .with_gas_limit(req.gas.unwrap_or(100_000))
        .with_max_fee_per_gas(gas.max_fee_per_gas)
        .with_max_priority_fee_per_gas(gas.max_priority_fee_per_gas);

    let tx = req.clone().build(&signer.clone().into()).await?;
    let raw = tx.encoded_2718();
    let pending = provider.send_raw_transaction(&raw).await?;

    Ok(PendingTx {
        from,
        nonce,
        current_hash: *pending.tx_hash(),
        gas_params: gas,
        deadline: Instant::now() + Duration::from_secs(30),
        original_request: req,
    })
}
\`\`\`

Walk:

- **Reserve nonce before signing, not after** — ordering matters under concurrency. If you signed first and then reserved, two parallel sends could sign with the same nonce and only one would win.
- **\`build(&signer.clone().into())\`** — Alloy's \`TransactionBuilder\` calls \`sign_transaction_sync\` under the hood. \`PrivateKeySigner\` is sync; if you swap to a remote signer (KMS, HSM), this becomes async and the signature changes — but the rest of the function stays.
- **\`send_raw_transaction\` returns a \`PendingTransactionBuilder\`.** We don't \`.await.confirmations(N)\` on it here; the **watcher** in Step 4 owns confirmation. The send path returns immediately so the API can respond fast.

## Step 4: Confirm watcher with replace-on-stuck

The background loop. One tokio task that watches every queued tx; bumps the fee on anything older than its deadline:

\`\`\`rust
use std::collections::HashMap;
use tokio::sync::RwLock;
use tokio::time::sleep;

#[derive(Clone)]
pub struct PendingQueue {
    inner: Arc<RwLock<HashMap<alloy_primitives::B256, PendingTx>>>,
}

impl PendingQueue {
    pub fn new() -> Self { Self { inner: Arc::new(RwLock::new(HashMap::new())) } }

    pub async fn insert(&self, ptx: PendingTx) {
        self.inner.write().await.insert(ptx.current_hash, ptx);
    }
}

pub async fn watcher<P: alloy_provider::Provider + Clone>(
    provider: P,
    pool: SignerPool,
    queue: PendingQueue,
) {
    loop {
        sleep(Duration::from_secs(5)).await;

        // Snapshot to avoid holding the read lock during RPC.
        let snapshot: Vec<PendingTx> = queue.inner.read().await.values().cloned().collect();

        for mut ptx in snapshot {
            // Check inclusion
            if let Ok(Some(_receipt)) = provider.get_transaction_receipt(ptx.current_hash).await {
                queue.inner.write().await.remove(&ptx.current_hash);
                tracing::info!(hash = ?ptx.current_hash, "landed");
                continue;
            }

            // Stuck? Bump and resubmit
            if Instant::now() >= ptx.deadline {
                let bumped = bump(ptx.gas_params);
                let signer = pool.get(&ptx.from).expect("signer missing");
                let req = ptx.original_request
                    .clone()
                    .with_max_fee_per_gas(bumped.max_fee_per_gas)
                    .with_max_priority_fee_per_gas(bumped.max_priority_fee_per_gas);

                match req.build(&signer.clone().into()).await {
                    Ok(tx) => {
                        let raw = tx.encoded_2718();
                        if let Ok(p) = provider.send_raw_transaction(&raw).await {
                            let new_hash = *p.tx_hash();
                            let mut w = queue.inner.write().await;
                            w.remove(&ptx.current_hash);
                            ptx.current_hash = new_hash;
                            ptx.gas_params = bumped;
                            ptx.deadline = Instant::now() + Duration::from_secs(30);
                            w.insert(new_hash, ptx);
                            tracing::warn!("bumped + resubmitted");
                        }
                    }
                    Err(e) => tracing::error!(?e, "rebuild failed"),
                }
            }
        }
    }
}
\`\`\`

Walk:

- **Snapshot, then iterate.** Holding the lock during \`get_transaction_receipt\` would serialize the whole queue behind a single RPC. Snapshotting trades a Vec allocation for parallelism.
- **\`get_transaction_receipt\` returning \`Some\` is the inclusion signal.** Note this is *eventual* consistency — a tx can be included in block N and the receipt visible at block N+1 due to RPC caching. The 5-second poll absorbs that lag.
- **Bump strategy is 25%, repeated.** Each cycle that misses the deadline triples down. After 3 bumps a tx that started at 5 gwei is at \`5 × 1.25³ ≈ 9.77\` gwei. Real production caps at a configurable max to avoid blowing budget on a network-wide spike.
- **The \`expect("signer missing")\`** — by construction, anything in the queue was signed by a key in the pool. Panicking here means our invariant is broken; better than silently dropping.

> 🛑 **Anti-fluency check.** Without scrolling: why does the watcher *replace* a stuck tx with a same-nonce, higher-fee version, instead of just *waiting longer*? Hint: think about **what blocks the next nonce** when the previous one is stuck.

## Step 5: HTTP API skeleton (axum)

\`\`\`rust
use axum::{extract::State, routing::post, Json, Router};
use serde::{Deserialize, Serialize};

#[derive(Clone)]
pub struct AppState<P: alloy_provider::Provider + Clone + 'static> {
    pub provider: P,
    pub signers: Arc<SignerPool>,
    pub nonces: NonceManager,
    pub queue: PendingQueue,
}

#[derive(Deserialize)]
pub struct SendRequest {
    from: Address,
    to: Address,
    value: U256,
    data: Option<Bytes>,
    gas: Option<u64>,
}

#[derive(Serialize)]
pub struct SendResponse {
    tx_hash: alloy_primitives::B256,
}

async fn handle_send<P: alloy_provider::Provider + Clone + 'static>(
    State(state): State<AppState<P>>,
    Json(req): Json<SendRequest>,
) -> Result<Json<SendResponse>, (axum::http::StatusCode, String)> {
    let tx_req = TransactionRequest::default()
        .with_from(req.from)
        .with_to(req.to)
        .with_value(req.value)
        .with_input(req.data.unwrap_or_default())
        .with_gas_limit(req.gas.unwrap_or(100_000));

    let pending = send_one(&state.provider, &state.signers, &state.nonces, tx_req)
        .await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let hash = pending.current_hash;
    state.queue.insert(pending).await;
    Ok(Json(SendResponse { tx_hash: hash }))
}

#[tokio::main]
async fn main() -> eyre::Result<()> {
    tracing_subscriber::fmt::init();

    let provider = alloy_provider::ProviderBuilder::new()
            // Provider examples: QuickNode, Alchemy, Infura, or your own Reth node.
.connect(&std::env::var("RPC_URL")?)
        .await?;

    let state = AppState {
        provider: provider.clone(),
        signers: Arc::new(SignerPool::from_env()?),
        nonces: NonceManager::new(),
        queue: PendingQueue::new(),
    };

    // Spawn the watcher
    {
        let p = provider.clone();
        let s = (*state.signers).clone();  // Note: SignerPool needs Clone
        let q = state.queue.clone();
        tokio::spawn(async move { watcher(p, s, q).await });
    }

    let app = Router::new()
        .route("/send", post(handle_send))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:7000").await?;
    axum::serve(listener, app).await?;
    Ok(())
}
\`\`\`

That's the whole service. ~250 lines including imports.

> 🔍 **Find in repo.** Open [\`alloy-rpc-types\`](https://github.com/alloy-rs/alloy/tree/main/crates/rpc-types-eth). Find \`TransactionRequest\`. Note that it's the *same* type that all the \`with_*\` builder methods extend. **Your wallet backend, an arb bot, a deployment script — they all build txs through this same type.** That's the leverage Alloy gives you.

## What's missing for production

| Gap | What real wallet backends do |
| :--- | :--- |
| **Key custody** | KMS / HSM / MPC (e.g., Fireblocks, ZenGo, Privy). \`PrivateKeySigner\` is fine for self-custody / hot ops; not for user funds. |
| **Idempotency** | The \`/send\` endpoint should accept a \`request_id\` and dedupe. Naive POST/retry can double-spend a user. |
| **Per-key rate limiting** | One bad actor with API access can drain a key's nonce range. Cap concurrent sends per from-address. |
| **Persistent queue** | A process restart drops everything in memory. Production persists \`PendingTx\` to Postgres / Redis and rehydrates on boot. |
| **Multi-RPC fanout** | Submit to 2–3 providers simultaneously so a single dead provider doesn't strand txs. The same signed bytes work everywhere. |
| **Nonce gap detection** | If you reserved nonces 5, 6, 7 and only 5 + 7 land, nonce 6 is *missing* — chain stalls until you fill it. Detect this and inject a no-op tx. |
| **Observability** | Per-from \`pending_count\`, \`oldest_pending_age\`, \`bumps_per_hour\`. Page when oldest_pending exceeds a threshold. |

The architecture you wrote — signer pool, nonce manager, send path, background watcher with replace-on-stuck — **is the spine of every production wallet backend**. Pick any commercial wallet's docs and you'll see this same shape under the marketing.

## Drill

1. **Idempotency.** Add a \`request_id: String\` field to \`SendRequest\`; cache \`request_id → tx_hash\` for 1 hour. Returning the cached hash on duplicate POST. (30 min)
2. **Per-key rate limit.** Wrap \`/send\` in a per-from semaphore (max 4 concurrent). Reject with 429 if exceeded. (30 min)
3. **Persistent queue.** Write \`PendingTx\` to Redis on insert, delete on land. Rehydrate on startup. (1.5 hours)
4. **Multi-RPC fanout.** Build a \`MultiProvider\` that wraps two providers and broadcasts \`send_raw_transaction\` to both, returning the first \`Ok\`. (1 hour)
5. **Cancel endpoint.** Add \`POST /cancel { from, nonce }\` that submits a 0-value self-transfer at the same nonce with a 50% bump — a confirmed cancel of a stuck tx. (1 hour)

Finish drill 5 and you have a wallet backend that real users could rely on, modulo key custody. Wire in HSM-backed signing and you're at parity with what wallet teams ship.

> 🛑 **Final check.** In one sentence: why is **local nonce state** the load-bearing piece of this design, even though every other layer (signing, gas, watcher) gets more attention? If your answer doesn't mention "concurrent sends without RPC roundtrip per nonce", re-read Step 1 — that's why nonce management is the part that's hard.

## 📺 Further watching

\`\`\`youtube
wJnywGB33O4 | Georgios Konstantopoulos — Foundry, a portable, fast and modular toolkit (the same Alloy + Rust signer machinery, used inside Foundry's tx pipeline)
\`\`\`
`,
                },
                {
                  title: 'Build a Minimal EIP-7702 Sponsor Service in Rust',
                  slug: 'build-7702-sponsor-en',
                  type: 'CONTENT',
                  sortOrder: 4,
                  duration: 45,
                  xpReward: 80,
                  content: `# Build a Minimal EIP-7702 Sponsor Service in Rust

Alice has an EOA (Externally Owned Account — a regular wallet keypair, not a smart contract). She wants to swap two tokens in one click without first holding ETH for gas, and without migrating to a smart-contract account. EIP-7702 (live on mainnet since the Pectra fork, March 2025) is how: she signs an off-chain *authorization* that says "for this transaction, treat my EOA as if it had this contract's code." A **sponsor** — your service — wraps that authorization in a transaction it pays gas for. Alice gets atomic batched calls, custom validation, session keys. Same address, same keys, no migration. ~200 lines of Rust below.

> 📌 **Scope honesty.** We sponsor **single-user** EIP-7702 transactions: the user signs an authorization off-chain, posts it + their intended calls to our service, the service wraps it in a Type 4 transaction it pays for, submits, returns the hash. **Multi-user batching** (the "bundler" pattern, where you pack N users into one chain tx) is a one-loop extension covered in the drill. Account-abstraction policy logic — spending limits, session keys, recovery — is what your delegate contract decides; the sponsor just relays.

## EIP-7702 in 90 seconds

\`\`\`
Without 7702: Alice's EOA → CALL → Contract
With 7702:    Alice's EOA = (delegated to) → Contract code → executes AS Alice's address
\`\`\`

The mechanics:

- **Tx type 4** carries a new field: \`authorization_list: Vec<SignedAuthorization>\`.
- An \`Authorization { chain_id, address (delegate), nonce }\` is signed by the EOA whose code should be set.
- When the tx executes, each authorization in the list **rewrites that EOA's account code** to a 23-byte delegation pointer (\`0xef0100 || delegate_address\`) for **the rest of that transaction**.
- All the EOA's storage, balance, and address stay intact. The delegated code runs as if it were the EOA's own code.

That's it. Three sentences of protocol; the rest is plumbing.

## What you'll build

\`\`\`bash
$ curl -X POST http://localhost:8080/sponsor \\
    -H "Content-Type: application/json" \\
    -d '{
      "user":              "0xAlice...",
      "delegate":          "0xMyAccountImpl...",
      "user_authorization": "0x04f8...",
      "calls": [
        { "target": "0xToken...", "value": "0x0", "data": "0xa9059cbb..." },
        { "target": "0xRouter...", "value": "0x0", "data": "0x38ed1739..." }
      ]
    }'
{ "tx_hash": "0xabc..." }
\`\`\`

\`\`\`mermaid
flowchart TB
    User["Alice (EOA)"] -->|sign Authorization off-chain| AuthPayload["Authorization<br/>chain_id, delegate, nonce"]
    User -->|POST /sponsor| API
    AuthPayload -->|HTTP body| API["axum handler"]
    API -->|build Type 4 tx with user_auth| Sponsor["Sponsor signer<br/>(pays gas)"]
    Sponsor -->|broadcast| Chain
    Chain -->|delegated code runs<br/>AS Alice's address| Effects["Token transfer +<br/>Router swap atomically"]
\`\`\`

> 🛑 **Predict before scrolling.** Why does the sponsor (Bob) need to be the \`from\` of the Type 4 tx, not Alice? Form a one-sentence answer about **what \`from\` means** in EIP-1559 vs. who the *authorization* is on behalf of. Hold your guess.

## Why a sponsor service vs. native smart-account

| Approach | User experience | Cost | Migration |
| :--- | :--- | :--- | :--- |
| **Native smart account (4337)** | Best — full custom validation | High — every tx pays bundler markup | User funds → new account |
| **Pure 7702 (user pays own gas)** | OK — gets batching but still needs ETH | Low — single tx | None — same EOA |
| **7702 + sponsor (this lesson)** | Best for onboarding — no ETH needed | Sponsor eats gas (charge via app subscription, fees, etc.) | None — same EOA |

The sweet spot for app-team product work: existing EOA, smart-account features, your backend covers gas as a UX investment.

## Cargo.toml

\`\`\`toml
[package]
name = "eip7702-sponsor"
version = "0.1.0"
edition = "2021"

[dependencies]
alloy = { version = "1.0", features = [
  "providers", "signer-local", "rpc-types", "network",
  "consensus", "eips", "sol-types"
] }
axum                = "0.7"
serde               = { version = "1", features = ["derive"] }
serde_json          = "1"
tokio               = { version = "1", features = ["full"] }
hex                 = "0.4"
eyre                = "0.6"
\`\`\`

## Step 1: The authorization payload (what the user signs)

The user (Alice) signs an \`Authorization\` off-chain — your frontend or wallet does this. The bytes she sends to your service are the result. Reproducing the signing logic here so you can see what the service expects:

\`\`\`rust
// FRONTEND / wallet code — runs in the user's browser / MetaMask, NOT on the server.
use alloy::{
    eips::eip7702::Authorization,
    primitives::{Address, U256},
    signers::{local::PrivateKeySigner, SignerSync},
};

fn sign_authorization_for_user(
    user: &PrivateKeySigner,
    delegate: Address,
    chain_id: u64,
    user_nonce: u64,
) -> eyre::Result<alloy::eips::eip7702::SignedAuthorization> {
    let auth = Authorization {
        chain_id: U256::from(chain_id),
        address: delegate,
        nonce: user_nonce,
    };
    let sig = user.sign_hash_sync(&auth.signature_hash())?;
    Ok(auth.into_signed(sig))
}
\`\`\`

Walk:

- **\`Authorization { chain_id, address, nonce }\`** — three fields. \`address\` is the **delegate** contract whose code Alice is authorizing for her EOA.
- **\`auth.signature_hash()\`** — the hash that gets signed. Per spec: \`keccak256(MAGIC || rlp([chain_id, address, nonce]))\` where \`MAGIC\` is \`0x05\`. **Don't hand-compute this** — Alloy does it; if you reach for keccak yourself you've already made a mistake.
- **\`user_nonce\`** — Alice's *current EOA nonce*. The authorization is consumed exactly when the tx that includes it is mined; replaying it requires Alice's nonce to still match. **One-shot replay protection** built in.

The serialized \`SignedAuthorization\` is what hits your service. EIP-2718 envelope encoding is the canonical wire format:

\`\`\`rust
let bytes = signed_auth.encoded_2718();
let hex = format!("0x{}", hex::encode(bytes));
// Send this hex string in the JSON body
\`\`\`

> 🔍 **Find in repo.** Open [\`alloy-eips/src/eip7702\`](https://github.com/alloy-rs/eips/tree/main/crates/eip7702/src). Find \`Authorization::signature_hash\`. Note the \`MAGIC\` constant — that's the EIP-7702 prefix that prevents the same RLP being misread as some other signed message. **Domain separation, in one byte.**

## Step 2: Service receives + builds the Type 4 tx

\`\`\`rust
use alloy::{
    consensus::SignableTransaction,
    eips::eip2718::Decodable2718,
    eips::eip7702::SignedAuthorization,
    network::{TransactionBuilder, TransactionBuilder7702},
    primitives::{Address, B256, Bytes, U256},
    providers::{Provider, ProviderBuilder},
    rpc::types::TransactionRequest,
    signers::local::PrivateKeySigner,
    sol,
};

sol! {
    // Standard "execute multiple calls" interface — the delegate must implement this
    function executeBatch(
        (address target, uint256 value, bytes data)[] calls
    ) external;
}

#[derive(Clone, serde::Deserialize)]
pub struct CallSpec {
    pub target: Address,
    pub value: U256,
    pub data: Bytes,
}

pub async fn build_sponsored_tx<P: Provider>(
    provider: &P,
    sponsor: &PrivateKeySigner,
    user: Address,
    user_authorization_hex: &str,
    calls: Vec<CallSpec>,
) -> eyre::Result<TransactionRequest> {
    // 1. Parse the user's signed authorization from the wire format.
    let auth_bytes = hex::decode(user_authorization_hex.trim_start_matches("0x"))?;
    let signed_auth = SignedAuthorization::decode_2718(&mut auth_bytes.as_slice())?;

    // 2. ABI-encode the batched call.
    let batch = executeBatchCall {
        calls: calls.into_iter().map(|c| (c.target, c.value, c.data)).collect(),
    };
    let calldata = batch.abi_encode();

    // 3. Build the Type 4 tx: from = sponsor, to = user (the EOA being delegated),
    //    auth_list contains the user's signed auth, calldata invokes the delegate.
    let chain_id = provider.get_chain_id().await?;
    let nonce = provider.get_transaction_count(sponsor.address()).await?;
    let fee = provider.estimate_eip1559_fees().await?;

    let req = TransactionRequest::default()
        .with_from(sponsor.address())
        .with_to(user)
        .with_chain_id(chain_id)
        .with_nonce(nonce)
        .with_max_fee_per_gas(fee.max_fee_per_gas)
        .with_max_priority_fee_per_gas(fee.max_priority_fee_per_gas)
        .with_gas_limit(500_000)  // batch txs need headroom; estimate for prod
        .with_input(Bytes::from(calldata))
        .with_authorization_list(vec![signed_auth]);

    Ok(req)
}
\`\`\`

Walk:

- **\`SignedAuthorization::decode_2718\`** — the inverse of the \`encoded_2718\` the user sent. **One round-trip, no manual byte fiddling.**
- **\`from = sponsor, to = user\`** — this is the heart of the design. The tx is *from the sponsor* (paying gas, signing the outer envelope) but *to the user's EOA* (which now executes as if it were the delegate). Anyone watching the tx sees Bob as initiator and Alice's address as the call target — and the **logs come from Alice's address** because that's the address running the delegate's code.
- **\`with_authorization_list(vec![signed_auth])\`** — the line that makes this a Type 4. Add multiple \`SignedAuthorization\`s here and you're now batching multiple users into one tx (drill 3).
- **The delegate's \`executeBatch\` is a convention, not a protocol mandate.** Most EIP-7702 delegate contracts in the wild expose a similar method (see [Soneium](https://github.com/coinbase/sponsored-erc20)'s pattern, OpenZeppelin's reference impl). Pick the convention your delegate uses.

> 🛑 **Anti-fluency check.** Without scrolling: when Bob (sponsor) submits this tx, **whose nonce increments**? Bob's, Alice's, both? Hint: think about which nonce is in the outer tx envelope vs. what the authorization's \`nonce\` field is for.

## Step 3: Submit + wait for inclusion

\`\`\`rust
use alloy::providers::WalletProvider;

pub async fn submit_and_track<P: WalletProvider + Provider>(
    provider: P,
    req: TransactionRequest,
) -> eyre::Result<B256> {
    let pending = provider.send_transaction(req).await?;
    let hash = *pending.tx_hash();

    // For a sponsor service, returning the hash immediately is usually right —
    // the user's UI can poll. If you want server-side confirmation:
    // let receipt = pending.with_required_confirmations(1).get_receipt().await?;

    Ok(hash)
}
\`\`\`

Walk:

- **\`provider.send_transaction(req)\`** — Alloy signs with the wallet attached to the provider (your sponsor key) and broadcasts. \`req\` already has \`from = sponsor.address()\`, so the wallet machinery picks the right key.
- **The watcher pattern from the wallet-backend lesson applies here too.** A 30-second deadline + bumped fee on stuck txs would make this production-grade. We omit it for clarity; copy/paste the watcher from [lesson 4](/courses/reth-building-en/lessons/build-wallet-backend-en) if you want it.

## Step 4: Wire it together as an HTTP service

\`\`\`rust
use axum::{extract::State, routing::post, Json, Router};
use std::sync::Arc;

#[derive(serde::Deserialize)]
struct SponsorRequest {
    user: Address,
    user_authorization: String,
    calls: Vec<CallSpec>,
}

#[derive(serde::Serialize)]
struct SponsorResponse {
    tx_hash: B256,
}

#[derive(Clone)]
struct AppState<P: Provider + WalletProvider + Clone + 'static> {
    provider: P,
    sponsor: Arc<PrivateKeySigner>,
}

async fn sponsor_handler<P: Provider + WalletProvider + Clone + 'static>(
    State(state): State<AppState<P>>,
    Json(body): Json<SponsorRequest>,
) -> Result<Json<SponsorResponse>, (axum::http::StatusCode, String)> {
    let req = build_sponsored_tx(
        &state.provider,
        &state.sponsor,
        body.user,
        &body.user_authorization,
        body.calls,
    )
    .await
    .map_err(|e| (axum::http::StatusCode::BAD_REQUEST, e.to_string()))?;

    let hash = submit_and_track(state.provider.clone(), req)
        .await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(SponsorResponse { tx_hash: hash }))
}

#[tokio::main]
async fn main() -> eyre::Result<()> {
    let sponsor: PrivateKeySigner = std::env::var("SPONSOR_KEY")?.parse()?;
    let provider = ProviderBuilder::new()
        .wallet(sponsor.clone())
            // Provider examples: QuickNode, Alchemy, Infura, or your own Reth node.
.connect(&std::env::var("RPC_URL")?)
        .await?;

    let state = AppState {
        provider,
        sponsor: Arc::new(sponsor),
    };

    let app = Router::new()
        .route("/sponsor", post(sponsor_handler))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await?;
    axum::serve(listener, app).await?;
    Ok(())
}
\`\`\`

Whole service: ~200 LOC including the imports and the helper module. The frontend produces the \`user_authorization\` hex (Step 1 code, but in the user's wallet); the service handles everything else.

> 🔍 **Find in repo.** Open [\`alloy/examples/transactions/send_eip7702_transaction.rs\`](https://github.com/alloy-rs/examples/blob/main/examples/transactions/examples/send_eip7702_transaction.rs). Note that the official example has Bob send + Alice authorize — the **same separation we built**. The official example just hardcodes everything in main(); we wrapped it as a service. **Same pattern, productionized.**

## What's missing for production

| Gap | What real sponsor services do |
| :--- | :--- |
| **Authorization validation** | Decode + verify \`signed_auth.recover_authority()\` matches the claimed user before paying. We trust the input; production checks. |
| **Replay protection** | The user's nonce changes after this tx; check the authorization's nonce equals the current EOA nonce *before* submitting. Stale authorizations should be rejected synchronously. |
| **Spending limits** | Per-user daily caps. Per-call value caps. Allowlist of delegate addresses. (You pay the gas; you decide who you'll sponsor for.) |
| **Watcher** | [Lesson 4](/courses/reth-building-en/lessons/build-wallet-backend-en)'s replace-on-stuck logic. EIP-7702 txs go through the same mempool; the bumping pattern is identical. |
| **Multi-user batching** | One tx with \`auth_list = [Alice's auth, Bob's auth, Carol's auth]\` and a \`multicall\` style delegate call. Lower per-user gas amortization. |
| **Gas sponsorship accounting** | Track how much you've spent per user; expose a \`/balance\` endpoint; refill via Stripe / on-chain top-ups / app subscription. |
| **Delegate version pinning** | Allow only specific delegate addresses (your audited set). Reject authorizations to unknown delegates — they could be malicious. |
| **Frontend SDK** | A TypeScript / Swift / Kotlin client that takes \`(provider, calls)\` and returns the \`user_authorization\` hex, abstracting the signing flow from app developers. |

The architecture you wrote — accept signed authorization + intent, wrap in Type 4, sponsor the gas, submit — **is what every production EIP-7702 paymaster does**. Companies like Privy, Dynamic, and Coinbase Smart Wallet are running variations of this exact code path.

## Drill

1. **Validate authority.** Add a sanity check: \`signed_auth.recover_authority()? == body.user\`. Reject mismatches with 400. (15 min)
2. **Check nonce freshness.** Before submitting, fetch the user's current nonce and verify it equals the authorization's \`nonce\`. (15 min)
3. **Multi-user batching.** Change \`/sponsor\` to accept a list of \`(user, user_authorization, calls)\` triples. Build one tx with all authorizations and a multicall delegate call. **What's the worst case if one user's auth is invalid mid-batch?** (1.5 hours)
4. **Spending cap.** Track per-user gas spent in a \`HashMap<Address, U256>\`. Reject sponsoring requests that would exceed a configurable per-day limit. (45 min)
5. **Replace-on-stuck.** Lift the watcher from [lesson 4](/courses/reth-building-en/lessons/build-wallet-backend-en) and integrate it. (30 min — mostly copy/paste once you understand the pattern.)

Finish drill 5 and you have a sponsor service ready for an internal app. Add SDK + spending policy + observability and you're shipping the Privy-style developer experience.

> 🛑 **Final check.** In one sentence: why does EIP-7702 specifically (vs. EIP-4337) make sponsorship so much *cheaper* to operate? If your answer doesn't mention "no entry-point contract overhead" and "single tx vs. UserOp wrapping", re-read the 90-second refresher — that's the whole reason 7702 exists.

## 📺 Further watching

\`\`\`youtube
_k5fKlKBWV4 | EIP-7702: a technical deep dive — lightclient (Devcon SEA 2024)
\`\`\`

\`\`\`youtube
K2Tm1f8MIwg | Full code walkthrough of EIP-7702 in Revm — the engine running your sponsored txs
\`\`\`
`,
                },
                {
                  title: 'Build Your Own Foundry-Style Cheatcode in Rust',
                  slug: 'build-foundry-cheatcode-en',
                  type: 'CONTENT',
                  sortOrder: 5,
                  duration: 45,
                  xpReward: 80,
                  content: `# Build Your Own Foundry-Style Cheatcode in Rust

When you write \`vm.deal(alice, 100 ether)\` in a Foundry test, **that's not an EVM opcode**. It's a Rust function — a *precompile* (a built-in contract whose code lives in the EVM engine, not on chain) — that Foundry installs at the magic address \`0x7109709E...\` and exposes to Solidity via the \`Vm.sol\` interface. Same for \`vm.warp()\`, \`vm.expectRevert()\`, the whole cheatcode surface. **You can ship your own.** This lesson builds \`cheats.measureGas(target, data)\` — a precompile that lets test authors measure sub-call gas without manual wrapping — using the exact pattern Foundry uses internally.

> 📌 **Scope honesty.** We **don't** fork Foundry. We build the precompile + a minimal Revm-based test harness that loads it. The pattern (high-address precompile + Solidity ABI surface + test runner that wires it in) **is identical** to how Foundry adds cheatcodes — you just see all of it instead of inheriting an opaque framework.

## What you'll build

A new Solidity-callable cheatcode:

\`\`\`solidity
interface Cheats {
    function measureGas(address target, bytes calldata data) external returns (uint256 gasUsed);
}

contract MyTest {
    Cheats constant cheats = Cheats(0x7110000000000000000000000000000000000000);

    function test_swap_gas() public {
        uint256 gas = cheats.measureGas(
            address(uniswapRouter),
            abi.encodeWithSignature("swapExactTokensForTokens(...)", ...)
        );
        assertLt(gas, 200_000, "swap exceeded gas budget");
    }
}
\`\`\`

\`\`\`mermaid
flowchart TB
    Test["Solidity test"] -->|call| Cheats["0x7110... precompile"]
    Cheats -->|nested EVM call| Inner["Revm sub-EVM<br/>executes target.data"]
    Inner -->|gas_used| Cheats
    Cheats -->|abi-encoded uint256| Test
\`\`\`

> 🛑 **Predict before scrolling.** Why is implementing this as a **precompile** the right call, instead of a regular Solidity contract? Form a one-sentence answer about **what a precompile can do that a regular contract can't**. Hold your guess.

## Why precompile (not contract, not opcode)

| Approach | Can call into Revm internals? | Consensus impact | Effort |
| :--- | :--- | :--- | :--- |
| **Regular Solidity contract** | No — only EVM ops | None | trivial |
| **New EVM opcode** | Yes — full control | **Forks consensus immediately** (Advanced lesson) | massive |
| **Precompile (Foundry's choice)** | Yes — full Rust access | Only present in **your** Revm build, not mainnet | ~50 lines |

A precompile sits in the *executor*, not the protocol. Mainnet Revm doesn't have your precompile; your test runner Revm does. **No consensus break, full Rust power.** That's why Foundry's cheatcodes are precompiles, not opcodes.

## Cargo.toml

\`\`\`toml
[package]
name = "rust-cheatcode"
version = "0.1.0"
edition = "2021"

[dependencies]
revm                = { version = "38" }
revm-precompile     = { version = "34" }
alloy-primitives    = "1.5"
alloy-sol-types     = "1.5"
eyre                = "0.6"
\`\`\`

## Step 1: The precompile function

A Revm precompile is a Rust function with the signature \`fn(input: &[u8], gas_limit: u64) -> PrecompileResult\`. We layer the cheatcode dispatch inside:

\`\`\`rust
use alloy_primitives::{Address, U256};
use alloy_sol_types::{sol, SolValue};
use revm::{
    context::TxEnv,
    context_interface::result::ExecutionResult,
    primitives::TxKind,
    Context, ExecuteEvm, MainBuilder, MainContext,
};
use revm_precompile::{
    EthPrecompileOutput, EthPrecompileResult, Precompile, PrecompileHalt, PrecompileId,
};

pub const CHEATS_ADDRESS: Address = alloy_primitives::address!("7110000000000000000000000000000000000000");

sol! {
    function measureGas(address target, bytes calldata data) external returns (uint256 gasUsed);
}

/// The precompile entry point.
pub fn cheats_run(input: &[u8], gas_limit: u64) -> EthPrecompileResult {
    // The first 4 bytes are the function selector — same dispatch model as a Solidity contract.
    if input.len() < 4 {
        return Err(PrecompileHalt::OutOfGas); // really "bad input"; map to a real error in prod
    }

    let selector = &input[..4];
    let calldata = &input[4..];

    if selector == measureGasCall::SELECTOR {
        let decoded = measureGasCall::abi_decode_raw(calldata, true)
            .map_err(|_| PrecompileHalt::OutOfGas)?;

        let gas_used = run_measure_gas(decoded.target, decoded.data, gas_limit)?;
        return Ok(EthPrecompileOutput::new(
            21_000, // flat cost for the cheatcode call itself
            U256::from(gas_used).abi_encode().into(),
        ));
    }

    Err(PrecompileHalt::OutOfGas)
}
\`\`\`

Walk:

- **\`CHEATS_ADDRESS\`** — \`0x7110...\` deliberately just above Foundry's \`0x7109\` so we don't collide. **Cheatcode addresses are convention; pick anything that doesn't conflict with mainnet precompiles or other dev tools.**
- **Selector dispatch** — same 4-byte ABI selector machinery as a Solidity contract. The \`sol!\` macro generates \`measureGasCall::SELECTOR\` (a constant \`[u8; 4]\`) and \`abi_decode_raw\`. **Type-safe end to end** — no manual byte slicing.
- **Two return paths** — \`Ok(EthPrecompileOutput)\` carries gas-used + abi-encoded result bytes; \`Err(PrecompileHalt::*)\` halts the calling frame. Production cheatcodes use specific halt variants (Foundry has its own); we keep it simple.

## Step 2: The cheatcode logic

The interesting part: \`measureGas\` runs a *nested* EVM execution against the same world state, measures gas, and returns the number. The key API: spin up a fresh \`Context\` over the existing journal (so state is shared) and run a one-off transaction:

\`\`\`rust
fn run_measure_gas(target: Address, data: Vec<u8>, gas_limit: u64) -> Result<u64, PrecompileHalt> {
    // In a real cheatcode, we'd be handed access to the parent EVM's state via
    // a custom Inspector. For lesson clarity, we spin up an isolated EVM
    // against an empty in-memory DB — enough to demonstrate the gas math.
    let mut db = revm::database::CacheDB::new(revm::database::EmptyDB::default());

    let mut evm = Context::mainnet().with_db(&mut db).build_mainnet();

    let tx = TxEnv::builder()
        .caller(Address::ZERO)
        .kind(TxKind::Call(target))
        .data(data.into())
        .gas_limit(gas_limit)
        .build()
        .map_err(|_| PrecompileHalt::OutOfGas)?;

    let result = evm.transact_one(tx).map_err(|_| PrecompileHalt::OutOfGas)?;

    match result.result {
        ExecutionResult::Success { gas_used, .. } => Ok(gas_used),
        ExecutionResult::Revert { gas_used, .. } => Ok(gas_used),
        ExecutionResult::Halt { gas_used, .. } => Ok(gas_used),
    }
}
\`\`\`

Walk:

- **\`Context::mainnet().with_db(&mut db).build_mainnet()\`** — same builder you used in [Lesson 1 (MEV searcher)](/courses/reth-building-en/lessons/build-mev-searcher-en). The cheatcode is a tiny EVM-on-EVM. **Once you've run one Revm, you've run them all.**
- **All three result variants return \`gas_used\`** — Success, Revert, Halt. Even reverted txs consumed gas. We return the real number; the test author can decide what counts.
- **\`db = EmptyDB\` in this lesson is a simplification.** Real Foundry cheatcodes share state with the parent test EVM via a custom Inspector hook (because \`vm.deal()\` needs to mutate balances the parent test will see). Drill 3 explores that.

> 🛑 **Anti-fluency check.** Without scrolling: in your own words, why does the **\`gas_used\`** returned here include the gas the *target contract* consumed but **not** the gas the cheatcode call itself paid? Hint: the precompile's \`21_000\` flat cost is on the *outer* frame, not the inner one.

## Step 3: Wire into a Revm test harness

Now we need a test runner that registers our precompile + executes Solidity test contracts against it. The minimum viable harness:

\`\`\`rust
use revm::Context;
use revm_precompile::{Precompiles, PrecompileSpecId};

// (from the standard precompile interface)
revm_precompile::eth_precompile_fn!(cheats_precompile_fn, cheats_run);

const CHEATS_PRECOMPILE: Precompile = Precompile::new(
    PrecompileId::Custom(std::borrow::Cow::Borrowed("cheats")),
    CHEATS_ADDRESS,
    cheats_precompile_fn,
);

fn build_test_evm_context<'db, DB>(db: &'db mut DB) -> impl ExecuteEvm + 'db
where
    DB: revm::Database<Error: std::fmt::Debug>,
{
    // Start from mainnet precompiles, extend with ours
    let mut precompiles = Precompiles::new(PrecompileSpecId::OSAKA).clone();
    precompiles.extend([CHEATS_PRECOMPILE]);

    Context::mainnet()
        .with_db(db)
        .with_precompiles(precompiles)
        .build_mainnet()
}

fn run_test_contract<DB>(db: &mut DB, test_contract_bytecode: Vec<u8>, test_calldata: Vec<u8>)
    -> eyre::Result<bool>
where
    DB: revm::Database<Error: std::fmt::Debug>,
{
    // 1. Deploy the test contract
    let mut evm = build_test_evm_context(db);
    let deploy_tx = TxEnv::builder()
        .caller(Address::from([0xAB; 20]))
        .kind(TxKind::Create)
        .data(test_contract_bytecode.into())
        .gas_limit(10_000_000)
        .build()?;
    let deploy_result = evm.transact_one(deploy_tx)?;

    let test_addr = match deploy_result.result {
        ExecutionResult::Success { output: revm::context_interface::result::Output::Create(_, Some(a)), .. } => a,
        _ => eyre::bail!("test contract deploy failed"),
    };

    // 2. Call the test method
    let test_tx = TxEnv::builder()
        .caller(Address::from([0xAB; 20]))
        .kind(TxKind::Call(test_addr))
        .data(test_calldata.into())
        .gas_limit(10_000_000)
        .build()?;
    let test_result = evm.transact_one(test_tx)?;

    Ok(matches!(test_result.result, ExecutionResult::Success { .. }))
}
\`\`\`

Walk:

- **\`Precompiles::new(PrecompileSpecId::OSAKA).clone()\`** — start from the standard mainnet set (ECRECOVER, SHA256, RIPEMD160, IDENTITY, modexp, BN254, KZG, BLS) and extend with ours. The standard precompiles are still available; your new one is *additive*.
- **\`with_precompiles(...)\`** — Revm 38's API for installing a custom precompile registry. **Same line wires in any number of cheatcodes.**
- **The harness is ~30 lines.** Foundry adds: a Solidity compiler integration (\`forge\` does this via solc), test discovery (find functions starting with \`test_\`), structured failure reporting, parallel execution. **The kernel is what you wrote.**

> 🔍 **Find in repo.** Open [\`forge-std/src/Vm.sol\`](https://github.com/foundry-rs/forge-std/blob/master/src/Vm.sol) and skim the cheatcode interface. Every function in there is a Solidity ABI surface for a Rust precompile in [Foundry's cheatcode crate](https://github.com/foundry-rs/foundry/tree/master/crates/cheatcodes). **Scroll until you can name 3 cheatcodes you didn't realize were Rust.**

## Step 4: Write a test

Now from the Solidity side, calling our cheatcode is identical to calling \`vm.deal\` or any other:

\`\`\`solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface Cheats {
    function measureGas(address target, bytes calldata data) external returns (uint256);
}

contract Counter {
    uint256 public count;
    function increment() public { count++; }
}

contract CounterTest {
    Cheats constant cheats = Cheats(0x7110000000000000000000000000000000000000);

    function test_increment_gas_under_25k() public {
        Counter c = new Counter();
        bytes memory data = abi.encodeWithSignature("increment()");
        uint256 gas = cheats.measureGas(address(c), data);
        require(gas < 25_000, "increment too expensive");
    }
}
\`\`\`

Compile with \`solc\`, hand the bytecode + the \`test_increment_gas_under_25k()\` selector to \`run_test_contract\`, and you've executed a Solidity test that called your custom Rust cheatcode end to end.

## What's missing for production-grade test framework

| Gap | What Foundry does |
| :--- | :--- |
| **Solidity compilation** | \`forge\` shells out to solc, caches artifacts, handles imports. Reproduce only if you really need it; otherwise let users pre-compile. |
| **Shared parent state** | \`vm.deal()\` mutates balances the *test* sees. That requires a custom Inspector hook into the parent EVM — a non-trivial extension to our isolated harness. |
| **Parallelism** | Foundry runs tests across threads with isolated DBs per test. Trivial to add (one tokio task per test contract). |
| **Better failure reporting** | Stack traces, decoded revert reasons, fuzz shrink. All polish on top of the kernel above. |
| **Cheatcode persistence between calls** | E.g., \`vm.expectRevert\` sets state for the *next* call only. Stored in inspector state, not in the precompile itself. |
| **Permissionless cheatcode discovery** | A real plugin system would let cheatcodes be loaded as dynamic libraries. Foundry doesn't do this — they're compiled in. We won't either. |

The architecture you wrote — high-address precompile + selector dispatch + ABI-decoded args + nested EVM execution + harness that registers it — **is the kernel of how Foundry's cheatcode system works**. Foundry adds Rust-level glue and Solidity-level ergonomics; the foundation is identical.

## Drill

1. **Add \`balanceOf(address)\`.** A second selector that returns the balance of any address using \`evm.db.basic(addr).balance\`. (15 min)
2. **Make the call \`payable\`.** Add a \`value\` argument to \`measureGas\` and pass it through to the inner tx. **What changes about the Solidity side when the cheatcode becomes payable?** (30 min)
3. **Shared state cheatcode.** Implement \`cheats.deal(address, uint256)\` that *mutates* the parent test's state. Hint: you'll need a custom Revm \`Inspector\` rather than an isolated nested EVM. (3 hours)
4. **Solidity test discovery.** Build a minimal test runner that takes a directory, compiles all \`.sol\` files via \`solc\`, finds every function starting with \`test_\`, runs each, and prints pass/fail. (4 hours)
5. **Performance comparison.** Run the same test (Counter increment × 1000) under (a) your custom harness, (b) \`forge test\`. **What's the latency gap, and where does it come from?** (1 hour profiling)

Finish drill 4 and you have, structurally, a fork of Foundry. Add fuzz testing + invariant testing on top and you're at parity with what's in the wild.

> 🛑 **Final check.** In one sentence: why is **selector-dispatched ABI-decoded args** the thing that makes a precompile feel like a Solidity contract from the test author's side? If your answer doesn't mention "Solidity already knows how to encode calls to addresses", re-read Step 1 — that ABI compatibility is what makes the deception possible.

## 📺 Further watching

\`\`\`youtube
sJpL21yJpgs | Horsefacts — Invariant Testing WETH with Foundry (the cheatcode patterns this lesson reverse-engineers)
\`\`\`
`,
                },
                {
                  title: 'Build a Swap Aggregator: DEX State, Forked, in Rust',
                  slug: 'build-swap-aggregator-en',
                  type: 'CONTENT',
                  sortOrder: 6,
                  duration: 45,
                  xpReward: 80,
                  content: `# Build a Swap Aggregator: DEX State, Forked, in Rust

A user wants to swap 10,000 USDC for ETH. Uniswap V2 will give them 2.948 WETH. Sushi gives 2.946. Uniswap V3 gives 2.951. The aggregator's job: **fan out the same quote to every venue at the same instant, compare, pick the winner.** That's what 1inch, Paraswap, and 0x do under the hood. ~250 lines of Rust below: fork mainnet locally with Revm (so every quote reads the *same* atomic state), pull reserves from Uniswap V2 + Sushi + Uniswap V3, compute the output, pick the best.

> 📌 **Scope honesty.** We compute quotes across **two V2-style pools (Uniswap V2 + Sushi) and one V3 pool (Uniswap V3)** for a single hop. Real aggregators add: split routing (send 30% through Uniswap, 70% through Curve), multi-hop (A → WETH → B), CFMMs with custom math (Curve's stableswap, Balancer's weighted pools), gas-aware routing. Each is a one-loop extension of the kernel here.

## What you'll build

\`\`\`bash
$ cargo run -- quote \\
    --in-token  0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48 \\  # USDC
    --out-token 0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2 \\  # WETH
    --amount-in 10000000000                                       # 10,000 USDC

Quotes (10000 USDC -> WETH):
  Uniswap V2:    2.94821 WETH  (price 3393.08 USDC/WETH)
  Sushi V2:      2.94619 WETH  (price 3395.41 USDC/WETH)
  Uniswap V3:    2.95104 WETH  (price 3389.84 USDC/WETH)  ← BEST
\`\`\`

\`\`\`mermaid
flowchart TB
    User["CLI: in/out token, amount"] --> Fork["Revm fork<br/>at latest block"]
    Fork -->|getReserves| V2A["Uniswap V2 pool"]
    Fork -->|getReserves| V2B["Sushi V2 pool"]
    Fork -->|simulate swap| V3["Uniswap V3 pool<br/>(more complex math)"]
    V2A --> Quote["Quote calculator"]
    V2B --> Quote
    V3 --> Quote
    Quote --> Pick["Pick best (post-fee, post-gas)"]
\`\`\`

> 🛑 **Predict before scrolling.** Why **fork** and read on-chain state, instead of using the **chain's RPC** directly to call \`getReserves\` on each pool? Form a one-sentence answer about *what fork buys you that direct RPC doesn't*. Hold your guess.

## Why fork (vs direct RPC)

| Approach | Latency for N quotes | Gas-cost simulation? | Multi-pool atomic view? |
| :--- | :--- | :--- | :--- |
| **N \`eth_call\`s over RPC** | N × ~50 ms = seconds for 10 pools | No (you'd need separate \`eth_estimateGas\`) | No — each call is a separate state read; pool A and pool B might be from slightly different blocks |
| **Fork once, read N times** | first ~50 ms (block fetch), then ~200 µs/pool | **Yes — same Revm fork lets you measure gas of a hypothetical swap** | **Yes** — every read is from the same atomic snapshot |

For aggregation specifically, atomicity matters: if pool A's reserves moved between your read of pool A and pool B, your "best route" math is comparing apples and oranges. **Fork gives you a single view of the world.**

## Cargo.toml

\`\`\`toml
[package]
name = "swap-aggregator"
version = "0.1.0"
edition = "2021"

[dependencies]
alloy-eips         = "1.0"
alloy-primitives   = "1.5"
alloy-provider     = "1.0"
alloy-network      = "1.0"
alloy-sol-types    = "1.5"
revm               = { version = "38", features = ["alloydb"] }
clap               = { version = "4", features = ["derive"] }
tokio              = { version = "1", features = ["full"] }
eyre               = "0.6"
\`\`\`

## Step 1: Fork mainnet (same pattern as Lesson 1)

\`\`\`rust
use alloy_eips::BlockId;
use alloy_provider::{network::Ethereum, DynProvider, ProviderBuilder};
use revm::{
    context::TxEnv,
    context_interface::result::{ExecutionResult, Output},
    database::{AlloyDB, CacheDB},
    database_interface::WrapDatabaseAsync,
    primitives::{Address, TxKind, U256},
    Context, ExecuteEvm, MainBuilder, MainContext,
};

type ForkedDB = CacheDB<WrapDatabaseAsync<AlloyDB<Ethereum, DynProvider>>>;

async fn build_fork() -> eyre::Result<ForkedDB> {
    let provider = ProviderBuilder::new()
            // Provider examples: QuickNode, Alchemy, Infura, or your own Reth node.
.connect(&std::env::var("ETH_RPC_URL")?)
        .await?
        .erased();
    let alloy_db = WrapDatabaseAsync::new(AlloyDB::new(provider, BlockId::latest()))
        .ok_or_else(|| eyre::eyre!("AlloyDB init failed"))?;
    Ok(CacheDB::new(alloy_db))
}
\`\`\`

Identical to [Lesson 1 (MEV searcher)](/courses/reth-building-en/lessons/build-mev-searcher-en) — and that's the point. **The same fork pattern shows up everywhere; if you can build one, you can build them all.**

## Step 2: Read V2 pool reserves

Uniswap V2 / Sushi / any V2 fork: same ABI, same constant-product math.

\`\`\`rust
use alloy_sol_types::{sol, SolCall};

sol! {
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function token0() external view returns (address);
    function token1() external view returns (address);
}

#[derive(Debug, Clone, Copy)]
pub struct V2Pool {
    pub address: Address,
    pub reserve_in: U256,
    pub reserve_out: U256,
    pub fee_bps: u32, // Uniswap V2: 30 (= 0.3%)
}

async fn read_v2_pool(
    db: &mut ForkedDB,
    pool: Address,
    in_token: Address,
    fee_bps: u32,
) -> eyre::Result<V2Pool> {
    let mut evm = Context::mainnet().with_db(db).build_mainnet();

    // 1. Find which side of the pool is in_token (token0 or token1)
    let token0 = call_view::<token0Call>(&mut evm, pool, token0Call {})?;
    let in_is_zero = token0._0 == in_token;

    // 2. Read reserves
    let r = call_view::<getReservesCall>(&mut evm, pool, getReservesCall {})?;

    let (reserve_in, reserve_out) = if in_is_zero {
        (U256::from(r.reserve0), U256::from(r.reserve1))
    } else {
        (U256::from(r.reserve1), U256::from(r.reserve0))
    };

    Ok(V2Pool { address: pool, reserve_in, reserve_out, fee_bps })
}

fn call_view<C: SolCall>(
    evm: &mut impl ExecuteEvm<Tx = TxEnv>,
    target: Address,
    call: C,
) -> eyre::Result<C::Return> {
    let result = evm.transact_one(
        TxEnv::builder()
            .caller(Address::ZERO)
            .kind(TxKind::Call(target))
            .data(call.abi_encode().into())
            .gas_limit(1_000_000)
            .build()?,
    )?;

    match result.result {
        ExecutionResult::Success { output: Output::Call(out), .. } => {
            Ok(C::abi_decode_returns(&out, true)?)
        }
        _ => eyre::bail!("view call failed"),
    }
}
\`\`\`

Walk:

- **The same EVM call we made in [Lesson 1 (MEV searcher)](/courses/reth-building-en/lessons/build-mev-searcher-en)'s \`read_reserves\`** — generalized into a \`call_view\` helper that works for any \`SolCall\`. **Re-use accumulates** as you build.
- **\`token0\` lookup is necessary because we don't know which side is which.** Pools are sorted by address; depending on which token is which, "reserve_in" maps to reserve0 or reserve1. **Skip this and your quote math is upside-down half the time.**
- **\`fee_bps\` parameterizes the V2 family.** Uniswap V2: 30 bps (0.3%). Sushi: also 30 bps. Older Mooniswap, custom forks: anywhere from 5 to 100 bps. **Same code, different parameter.**

> 🔍 **Find in repo.** Open the [Uniswap V2 router source](https://github.com/Uniswap/v2-periphery/blob/master/contracts/libraries/UniswapV2Library.sol). Find \`getAmountOut\`. That's the math the next step implements. **Compare your Rust to the reference Solidity, line by line.**

## Step 3: V2 quote math (constant product)

\`\`\`rust
fn quote_v2(pool: V2Pool, amount_in: U256) -> U256 {
    // Uniswap V2 formula: amount_in_with_fee = amount_in * (10000 - fee_bps)
    //                     numerator   = amount_in_with_fee * reserve_out
    //                     denominator = reserve_in * 10000 + amount_in_with_fee
    //                     amount_out  = numerator / denominator
    let amount_in_with_fee = amount_in * U256::from(10_000 - pool.fee_bps);
    let numerator   = amount_in_with_fee * pool.reserve_out;
    let denominator = pool.reserve_in * U256::from(10_000) + amount_in_with_fee;
    numerator / denominator
}
\`\`\`

Walk:

- **9 lines of math = the entire AMM** for V2-style pools. Constant product (\`x · y = k\`), held under a fee discount.
- **Integer-only** — no floats, no panics. \`U256\` arithmetic carries the precision the EVM uses on-chain. **Your quote will match the on-chain swap to the wei.**
- **Fee in basis points lets you support Uniswap, Sushi, custom-fee forks** with the same code.

> 🛑 **Anti-fluency check.** Without scrolling: why does \`amount_in_with_fee * pool.reserve_out\` go in the **numerator** and not the denominator? Hint: think about what it means dimensionally — \`[in_with_fee] * [reserve_out]\` produces what units?

## Step 4: V3 quote (more complex math, simpler approach)

Uniswap V3 prices liquidity in *ticks* and *concentrated ranges*. The quote formula is non-trivial. The **shortcut**: don't reimplement V3 math; ask the on-chain Quoter to give you the answer, but do it via Revm so you don't pay an RPC roundtrip:

\`\`\`rust
sol! {
    interface IQuoterV2 {
        function quoteExactInputSingle(
            address tokenIn,
            address tokenOut,
            uint24  fee,
            uint256 amountIn,
            uint160 sqrtPriceLimitX96
        ) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate);
    }
}

const UNI_V3_QUOTER: Address = alloy_primitives::address!("61fFE014bA17989E743c5F6cB21bF9697530B21e");

fn quote_v3(
    db: &mut ForkedDB,
    in_token: Address,
    out_token: Address,
    fee: u32,  // 100 / 500 / 3000 / 10000
    amount_in: U256,
) -> eyre::Result<U256> {
    let mut evm = Context::mainnet().with_db(db).build_mainnet();
    let call = IQuoterV2::quoteExactInputSingleCall {
        tokenIn:               in_token,
        tokenOut:              out_token,
        fee:                   fee.into(),
        amountIn:              amount_in,
        sqrtPriceLimitX96:     U256::ZERO,
    };

    let result = evm.transact_one(
        TxEnv::builder()
            .caller(Address::ZERO)
            .kind(TxKind::Call(UNI_V3_QUOTER))
            .data(call.abi_encode().into())
            .gas_limit(10_000_000)
            .build()?,
    )?;

    match result.result {
        ExecutionResult::Success { output: Output::Call(out), .. } => {
            let decoded = IQuoterV2::quoteExactInputSingleCall::abi_decode_returns(&out, true)?;
            Ok(decoded.amountOut)
        }
        _ => eyre::bail!("V3 quote failed"),
    }
}
\`\`\`

Walk:

- **\`UNI_V3_QUOTER\` is a deployed contract.** Its job is exactly this — answer "how much would I get out?" without doing an actual swap. **Free for us to call** because we're calling it in-Revm, not on-chain.
- **\`sqrtPriceLimitX96 = 0\`** disables price limit (i.e., "any price is fine"). For real routing you'd set it to bound slippage.
- **The fee parameter selects the pool tier.** V3 has 1bp (stable pairs), 5bp (stable pools), 30bp (most pairs), 100bp (exotic pairs). Production aggregators query all four and pick the best.

The same \`call_view\` pattern would also work — we wrote it inline here so the V3 call's specifics are visible.

## Step 5: Aggregate and pick

\`\`\`rust
#[derive(Debug)]
struct Quote {
    venue: &'static str,
    amount_out: U256,
}

async fn aggregate(
    db: &mut ForkedDB,
    in_token: Address,
    out_token: Address,
    amount_in: U256,
) -> eyre::Result<Vec<Quote>> {
    let uni_v2_pool   = address!("0d4a11d5EEaaC28EC3F61d100daF4d40471f1852"); // USDC/WETH on Uniswap V2 (example)
    let sushi_pool    = address!("397FF1542f962076d0BFE58eA045FfA2d347ACa0"); // USDC/WETH on Sushi (example)

    let v2 = read_v2_pool(db, uni_v2_pool, in_token, 30).await?;
    let sushi = read_v2_pool(db, sushi_pool, in_token, 30).await?;
    let v3 = quote_v3(db, in_token, out_token, 500, amount_in)?;

    Ok(vec![
        Quote { venue: "Uniswap V2", amount_out: quote_v2(v2, amount_in) },
        Quote { venue: "Sushi V2",   amount_out: quote_v2(sushi, amount_in) },
        Quote { venue: "Uniswap V3", amount_out: v3 },
    ])
}

fn pick_best(quotes: &[Quote]) -> &Quote {
    quotes.iter().max_by_key(|q| q.amount_out).expect("non-empty quotes")
}

#[tokio::main]
async fn main() -> eyre::Result<()> {
    let args = Args::parse();
    let mut db = build_fork().await?;
    let quotes = aggregate(&mut db, args.in_token, args.out_token, args.amount_in).await?;
    let best = pick_best(&quotes);

    println!("Quotes ({} {} -> {}):", args.amount_in, args.in_token, args.out_token);
    for q in &quotes {
        let marker = if std::ptr::eq(q, best) { "  ← BEST" } else { "" };
        println!("  {:<14} {:>20}{}", q.venue, q.amount_out, marker);
    }
    Ok(())
}
\`\`\`

Whole binary: ~250 LOC including imports + CLI parsing.

## What's missing for production

| Gap | What real aggregators do |
| :--- | :--- |
| **Multi-hop routing** | A → WETH → B routing across pools. Build a graph, run Bellman-Ford weighted by output amount. |
| **Split routing** | Send 40% through V3, 60% through V2 if the combined output exceeds either alone. Convex optimization on the weights. |
| **Curve / Balancer / etc.** | Each CFMM has its own quote function. Curve uses stableswap (Newton's method); Balancer uses weighted pools. **Same fork, different math per venue.** |
| **Gas-aware** | Subtract estimated gas cost (in out-token terms) from each quote. A 0.1% better price isn't worth 50¢ extra gas on a $100 swap. |
| **Price-impact thresholds** | Reject routes that move the pool >X% — protects against MEV sandwich attacks on low-liquidity venues. |
| **Re-quote at submission** | The fork was at block N; the swap lands at block N+k. Re-quote right before submission to catch state drift. |
| **MEV protection** | Submit through Flashbots Protect / MEV-Share so frontrunners don't see the route ahead of time. ([Lesson 8 — Capstone](/courses/reth-building-en/lessons/build-capstone-router-en) does this.) |

The architecture you wrote — fork once, read reserves atomically, compute quotes per venue, pick the winner — **is exactly how 1inch and Paraswap shape their internal pricing layer**. They add scale, more venues, better routing optimization. The kernel is identical.

## Drill

1. **Add Curve.** Pick a Curve pool (e.g., 3pool). Read its state, implement its quote (stableswap) using \`get_dy(int128 i, int128 j, uint256 dx)\` via the same \`call_view\` pattern. (1.5 hours)
2. **Add gas accounting.** Subtract estimated gas cost from each quote (use \`evm.estimate_gas\` on a hypothetical swap). The "best" route should now be the one that maximizes \`amount_out − gas_cost_in_out_token\`. (2 hours)
3. **Multi-hop search.** Build a 2-hop search: A → WETH → B. For each candidate via WETH, compute the chained quote and compare to the direct route. (3 hours)
4. **Split routing.** Implement a 50/50 split between the top two venues; check whether the combined output beats either alone. (2 hours)
5. **Cross-tier:** Wire the aggregator into the wallet backend ([Lesson 4](/courses/reth-building-en/lessons/build-wallet-backend-en)) as a \`POST /quote-and-swap\` that returns a signed tx ready for submission. (3 hours)

Finish drill 5 and you have, structurally, an aggregator-as-a-service. Plug in MEV protection ([Lesson 8](/courses/reth-building-en/lessons/build-capstone-router-en)) and you're at parity with what shipped in 2023.

> 🛑 **Final check.** In one sentence: why is **forking** strictly better than **N parallel \`eth_call\`s** for an aggregator? If your answer doesn't mention "atomic state across all reads", re-read Step 1 — that atomicity is what makes the comparison sound.

`,
                },
                {
                  title: 'Capstone — Build a Frontrun-Resistant Order Router',
                  slug: 'build-capstone-router-en',
                  type: 'CONTENT',
                  sortOrder: 7,
                  duration: 60,
                  xpReward: 100,
                  content: `# Capstone — Build a Frontrun-Resistant Order Router

The capstone. Patterns from across the tier, integrated into one service. A user posts a swap intent (JSON). The router: quotes across DEXes (Lesson 7), watches the mempool for adversarial txs that would sandwich the swap (Lesson 1, inverted), simulates the threat in Revm to **measure** how much output the user would lose, sponsors gas via EIP-7702 (Lesson 5), and — when the threat score is high — submits through Flashbots Protect so the order never appears in the public mempool. When threat is low, public submission is fine and saves the bundler markup. **One service, four earlier lessons stitched in (L1, L4, L5, L7), one new piece: the decision layer.**

> 📌 **Scope honesty.** This capstone integrates patterns from L1 / L4 / L5 / L7 of this tier. The novel build is the **frontrun-detection logic** + the **submission path that bypasses public mempool**. We use Flashbots Protect as the private RPC; the same shape works with MEV-Share, Beaverbuild's private endpoint, or any other private orderflow auction.

## What you'll build

\`\`\`bash
$ curl -X POST http://localhost:9000/route \\
    -d '{
      "user":      "0xAlice...",
      "in_token":  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      "out_token": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
      "amount_in": "10000000000",
      "min_out":   "2900000000000000000",
      "user_authorization": "0x04f8..."
    }'

{
  "decision": "EXECUTE_PRIVATE",
  "venue": "Uniswap V3",
  "expected_out": "2951042818093142817",
  "frontrun_risk": "LOW",
  "tx_hash": "0xabc...",
  "submission": "flashbots-protect"
}
\`\`\`

\`\`\`mermaid
flowchart TB
    User["POST /route"] --> Router["Router service"]
    Router -->|fork mainnet| Aggregator["Aggregator (L7)<br/>quotes + best venue"]
    Router -->|scan pending txs| Detector["Frontrun detector<br/>(L1 mempool watch +<br/>L7 simulation)"]
    Detector -->|adversarial tx found?| Decide{"Risk?"}
    Aggregator --> Decide
    Decide -->|HIGH| PrivPath["Private mempool<br/>(Flashbots Protect)"]
    Decide -->|LOW| PubPath["Public mempool"]
    PrivPath --> Sponsor["EIP-7702 sponsor (L5)"]
    PubPath --> Sponsor
    Sponsor --> Wallet["Wallet backend (L4)<br/>nonce/gas/replace"]
    Wallet --> Chain
\`\`\`

> 🛑 **Predict before scrolling.** The MEV searcher in Lesson 1 is *the threat* this router defends against. **In one sentence**: what does that searcher do that this router needs to defeat? Hold your guess until Step 3.

## What lessons feed in (and what's new)

| Component | From | What's new here |
| :--- | :--- | :--- |
| **Quote across DEXes** | [L7](/courses/reth-building-en/lessons/build-swap-aggregator-en) | Reused as-is |
| **Mempool watching** | [L1](/courses/reth-building-en/lessons/build-mev-searcher-en) (the searcher's input!) | Repurposed as defense — find candidate adversaries instead of opportunities |
| **Revm fork simulation** | [L1](/courses/reth-building-en/lessons/build-mev-searcher-en) | Used here to score "would this adversary tx hurt my user?" |
| **EIP-7702 sponsorship** | [L5](/courses/reth-building-en/lessons/build-7702-sponsor-en) | Lifted into the path so the user pays no gas |
| **Wallet backend submission + replace** | [L4](/courses/reth-building-en/lessons/build-wallet-backend-en) | Used for the public-mempool path |
| **Private orderflow submission** | NEW | Flashbots Protect / MEV-Share integration |
| **Decision logic (route + risk → submission path)** | NEW | The capstone's contribution |

The novelty is the **decision layer**. Everything below it is patterns you've already built.

## Cargo.toml

\`\`\`toml
[package]
name = "frontrun-resistant-router"
version = "0.1.0"
edition = "2021"

[dependencies]
alloy = { version = "1.0", features = [
  "providers", "signer-local", "rpc-types", "network",
  "consensus", "eips", "sol-types"
] }
revm     = { version = "38", features = ["alloydb"] }
axum     = "0.7"
tokio    = { version = "1", features = ["full"] }
serde    = { version = "1", features = ["derive"] }
serde_json = "1"
futures  = "0.3"
eyre     = "0.6"
\`\`\`

## Step 1: The decision struct (the architecture in one type)

The whole router is a function from \`RouteRequest\` to \`RouteDecision\`. Sketch the types first; the rest writes itself.

\`\`\`rust
use alloy::primitives::{Address, B256, U256};

#[derive(serde::Deserialize)]
pub struct RouteRequest {
    pub user: Address,
    pub in_token: Address,
    pub out_token: Address,
    pub amount_in: U256,
    pub min_out: U256,
    pub user_authorization: String,  // EIP-7702 SignedAuthorization, hex-encoded
}

#[derive(Debug, Clone, Copy)]
pub enum FrontrunRisk { Low, Medium, High }

#[derive(serde::Serialize)]
pub struct RouteDecision {
    pub decision:        &'static str,    // "EXECUTE_PRIVATE" | "EXECUTE_PUBLIC" | "REJECT_TOO_RISKY"
    pub venue:           Option<&'static str>,
    pub expected_out:    Option<U256>,
    pub frontrun_risk:   String,          // serializable FrontrunRisk
    pub tx_hash:         Option<B256>,
    pub submission:      Option<&'static str>,  // "flashbots-protect" | "public" | null
    pub reason:          Option<String>,
}
\`\`\`

Walk:

- **Three terminal states.** Either we send privately, send publicly, or refuse. Refusal is a feature: if the slippage on the best public venue exceeds what we can offer privately, the right answer is to tell the user.
- **\`expected_out\` is from the aggregator** (Lesson 7). Compared against \`min_out\` to decide if the user's slippage tolerance is met *before* we submit anything.
- **\`submission\` field tells the user where their tx went.** Useful for transparency — they can verify the Flashbots Protect endpoint received their bundle.

## Step 2: Get the best quote (Lesson 7, reused)

\`\`\`rust
// Pulled in directly from Lesson 7 — same code, no changes.
use crate::aggregator::{aggregate, pick_best, Quote};

async fn best_quote(
    db: &mut ForkedDB,
    req: &RouteRequest,
) -> eyre::Result<(Quote, &'static str)> {
    let quotes = aggregate(db, req.in_token, req.out_token, req.amount_in).await?;
    let best   = pick_best(&quotes).clone();
    Ok((best.clone(), best.venue))
}
\`\`\`

We don't even glance at the implementation — it's lesson 7. **Importing your earlier lesson code is part of the capstone reading too.** Keep things modular.

## Step 3: Frontrun detection — the new bit

The MEV searcher in Lesson 1 watches mempool for *opportunities*. Inverted, the same scan finds *threats* against our user. Specifically: any pending tx that targets the same pool the router is about to use, in the same direction the router will move price.

\`\`\`rust
use alloy::providers::{Provider, ProviderBuilder, WsConnect};
use futures::StreamExt;
use std::time::Duration;

async fn scan_for_adversaries(
    provider: &(impl Provider + Clone),
    target_pool: Address,  // The pool our user is about to use
    in_token:    Address,  // Direction matters: same direction = sandwich risk
    duration:    Duration,
) -> eyre::Result<Vec<alloy::rpc::types::Transaction>> {
    let mut sub = provider.subscribe_pending_transactions().await?.into_stream();
    let mut findings = Vec::new();
    let deadline = tokio::time::Instant::now() + duration;

    loop {
        tokio::select! {
            _ = tokio::time::sleep_until(deadline) => break,
            tx_hash = sub.next() => {
                let Some(tx_hash) = tx_hash else { break; };
                let Ok(Some(tx)) = provider.get_transaction_by_hash(tx_hash).await else { continue };

                if !looks_like_swap_on(&tx, target_pool, in_token) { continue }
                findings.push(tx);
                if findings.len() >= 5 { break }  // 5 candidates is enough to score
            }
        }
    }
    Ok(findings)
}

fn looks_like_swap_on(tx: &alloy::rpc::types::Transaction, pool: Address, in_token: Address) -> bool {
    // Heuristic: tx targets a known router AND its calldata mentions our pool's tokens.
    // Production routers would decode against router ABIs (UniV2 / V3 / Curve / Sushi)
    // and check the path. We keep the heuristic for clarity.
    use alloy::primitives::address;
    const KNOWN_ROUTERS: &[Address] = &[
        address!("7a250d5630B4cF539739dF2C5dAcb4c659F2488D"), // UniV2
        address!("d9e1cE17f2641f24aE83637ab66a2cca9C378B9F"), // Sushi V2
        address!("E592427A0AEce92De3Edee1F18E0157C05861564"), // UniV3
    ];
    if !KNOWN_ROUTERS.contains(&tx.to().unwrap_or_default()) { return false; }
    let input = tx.input();
    let pool_bytes = pool.as_slice();
    let in_token_bytes = in_token.as_slice();
    // Quick substring checks — cheap, false positives OK at this layer
    has_subseq(input, pool_bytes) || has_subseq(input, in_token_bytes)
}

fn has_subseq(haystack: &[u8], needle: &[u8]) -> bool {
    haystack.windows(needle.len()).any(|w| w == needle)
}
\`\`\`

Walk:

- **\`subscribe_pending_transactions\`** — the same Alloy subscription from Lesson 1. **Verbatim re-use of the searcher's mempool input.**
- **The heuristic is deliberately loose.** Real production decodes router ABIs and reasons about the swap *path*. Loose heuristics over-flag (false positives = users routed privately when they didn't need to be), which is the safe failure mode.
- **\`duration\` is the look-ahead window.** ~2 seconds is a sensible default — long enough to catch a slow human, short enough not to delay the user noticeably.

> 🛑 **Anti-fluency check.** Without scrolling: why does the **direction** of the candidate swap matter for whether it's a sandwich threat? Hint: think about what a frontrunner gains by trading the *same* direction as the victim vs. the *opposite* direction.

## Step 4: Score the threat with Revm simulation

A list of suspicious txs isn't enough. We need to know: **if these landed before our user, how much would the user's expected output drop?**

\`\`\`rust
async fn score_risk(
    db: &mut ForkedDB,                            // fresh fork, will mutate
    adversary_txs: &[alloy::rpc::types::Transaction],
    quote_before: U256,                           // Output the user would get with no adversary
    req: &RouteRequest,
) -> eyre::Result<FrontrunRisk> {
    if adversary_txs.is_empty() { return Ok(FrontrunRisk::Low); }

    // Apply each adversary tx to the fork.
    // (In a real router, we'd snapshot+rollback per scenario. Here, sequential.)
    for adv in adversary_txs {
        apply_tx_to_fork(db, adv).await?;
    }

    // Re-quote in the post-adversary state.
    let quote_after = aggregate(db, req.in_token, req.out_token, req.amount_in).await?;
    let after_amount = pick_best(&quote_after).amount_out;

    // What fraction of expected output would the user lose?
    let lost_bps = if quote_before > after_amount {
        ((quote_before - after_amount) * U256::from(10_000) / quote_before)
            .to_string().parse::<u64>().unwrap_or(0)
    } else { 0 };

    Ok(match lost_bps {
        0..=10   => FrontrunRisk::Low,    // <0.10% drop — noise
        11..=50  => FrontrunRisk::Medium, // 0.10%–0.50% drop — worth defending
        _        => FrontrunRisk::High,   // >0.50% drop — definitely route private
    })
}

async fn apply_tx_to_fork(
    db: &mut ForkedDB,
    tx: &alloy::rpc::types::Transaction,
) -> eyre::Result<()> {
    use revm::context::TxEnv;
    use revm::primitives::TxKind;
    let mut evm = revm::Context::mainnet().with_db(db).build_mainnet();
    let tx_env = TxEnv::builder()
        .caller(tx.from())
        .kind(if let Some(to) = tx.to() { TxKind::Call(to) } else { TxKind::Create })
        .data(tx.input().clone())
        .value(tx.value())
        .gas_limit(tx.gas_limit())
        .build()?;
    let _ = evm.transact_one(tx_env)?;
    Ok(())
}
\`\`\`

Walk:

- **Quote-before vs. quote-after is the actual measure.** Heuristic detection (Step 3) finds *candidates*; simulation tells us *whether they hurt*. Only the latter justifies routing privately.
- **Sequential application** is a simplification. A real implementation would simulate each adversary independently, take the worst case, and combine them. Drill 2.
- **Thresholds in basis points** are tunable per protocol. A USDC/USDT stable swap might tolerate 1bp; an exotic-pair swap might call 50bp acceptable.

## Step 5: Submit

The decision tree:

\`\`\`rust
async fn execute_decision(
    state: &AppState,
    req: &RouteRequest,
    venue: &'static str,
    expected_out: U256,
    risk: FrontrunRisk,
) -> eyre::Result<RouteDecision> {
    if expected_out < req.min_out {
        return Ok(RouteDecision {
            decision:      "REJECT_TOO_RISKY",
            venue:         Some(venue),
            expected_out:  Some(expected_out),
            frontrun_risk: format!("{risk:?}"),
            tx_hash:       None,
            submission:    None,
            reason:        Some(format!("expected_out {} < min_out {}", expected_out, req.min_out)),
        });
    }

    // Build the EIP-7702 sponsored tx (Lesson 5, lifted directly)
    let tx_request = build_sponsored_tx(
        &state.public_provider,
        &state.sponsor,
        req.user,
        &req.user_authorization,
        vec![/* the swap call against the chosen venue's router */],
    ).await?;

    let (submission, hash) = match risk {
        FrontrunRisk::High | FrontrunRisk::Medium => {
            // Submit through Flashbots Protect (or any private RPC)
            let private = &state.private_provider;
            let h = private.send_transaction(tx_request).await?;
            ("flashbots-protect", *h.tx_hash())
        }
        FrontrunRisk::Low => {
            // Public mempool is fine — save the bundler markup
            let h = state.public_provider.send_transaction(tx_request).await?;
            ("public", *h.tx_hash())
        }
    };

    Ok(RouteDecision {
        decision:      if submission == "flashbots-protect" { "EXECUTE_PRIVATE" } else { "EXECUTE_PUBLIC" },
        venue:         Some(venue),
        expected_out:  Some(expected_out),
        frontrun_risk: format!("{risk:?}"),
        tx_hash:       Some(hash),
        submission:    Some(submission),
        reason:        None,
    })
}
\`\`\`

The **two providers** are the load-bearing piece. \`public_provider\` connects to a normal RPC (Infura, your own Reth); \`private_provider\` connects to https://rpc.flashbots.net/protect. **Same Alloy code, different endpoint** — that's the asymmetry that defeats sandwich attacks.

## Step 6: Wire it together

\`\`\`rust
async fn route_handler(
    State(state): State<Arc<AppState>>,
    Json(req): Json<RouteRequest>,
) -> Result<Json<RouteDecision>, (axum::http::StatusCode, String)> {
    // 1. Quote across venues (L7 lifted)
    let mut db = build_fork().await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let (best, venue) = best_quote(&mut db, &req).await
        .map_err(|e| (axum::http::StatusCode::BAD_GATEWAY, e.to_string()))?;

    // 2. Watch mempool for ~2s for adversarial txs (L1 inverted)
    let pool_for_route = address_for_venue(venue, req.in_token, req.out_token);
    let adversaries = scan_for_adversaries(&state.public_provider, pool_for_route, req.in_token, Duration::from_secs(2)).await
        .unwrap_or_default();

    // 3. Score risk via simulation (L1 + L7 combined)
    let mut risk_db = build_fork().await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let risk = score_risk(&mut risk_db, &adversaries, best.amount_out, &req).await
        .unwrap_or(FrontrunRisk::Low);

    // 4. Execute on the matching submission path (L4 + L5 lifted)
    let decision = execute_decision(&state, &req, venue, best.amount_out, risk).await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(decision))
}
\`\`\`

Total new code in this lesson: ~250 LOC. Total **router** code: this 250 + the lessons it lifts — a working frontrun-resistant order router that fits in one repo.

## What's missing for production

| Gap | What real production routers do |
| :--- | :--- |
| **MEV-Share / OFA integration** | Privately auction your orderflow to the highest searcher bid; share rebates back to users. (Flashbots Protect is the simple version.) |
| **Slippage budget per user** | Don't quote past 5% slippage; tell the user to reduce \`amount_in\`. |
| **Cancel + refund flow** | If a private bundle doesn't land in 2 blocks, the EIP-7702 authorization is wasted. Need user-facing UI + refund logic. |
| **Multi-region private RPCs** | Submit to Flashbots, Beaverbuild, Titan, Rsync simultaneously; the first to land wins. |
| **Per-user rate limiting** | A bad actor with API access can spam quotes (cheap) but each quote consumes a fork; cap. |
| **Observability** | Log every (venue, risk, submission) decision. After 1000 routes, evaluate: when we routed private, was the simulated drop the actual on-chain outcome? Tune thresholds with real data. |

The architecture you wrote — quote → detect adversaries → score with sim → decide private vs public → submit via the right path — **is the spine of every defensive routing service**. CowSwap, MEV-Share consumers, retail wallet backends — they all do variations of this. **You've now built one.**

## Drill (the longest in the curriculum, on purpose)

1. **Real router ABI decoding.** Replace the loose substring heuristic in \`looks_like_swap_on\` with proper \`sol!\` decoding for UniV2 / V3 / Sushi router calldata. Check whether the path includes \`(in_token, out_token)\` in either direction. (3 hours)
2. **Independent simulation.** Score each adversary independently (snapshot + rollback the fork between each). Take the worst-case drop. (2 hours)
3. **Cancel flow.** Add \`POST /cancel { tx_hash }\` that refunds the user's authorization (i.e., signs a no-op tx at the same nonce to invalidate the original). Wire to UI. (3 hours)
4. **Multi-RPC private submission.** Submit to two private endpoints (Flashbots Protect + Beaverbuild) simultaneously. Return the hash from whichever lands first. (1.5 hours)
5. **Threshold autotuning.** Log every router decision + the actual on-chain outcome (was the drop bigger or smaller than predicted?). Build a small offline script that fits the bps thresholds to your historical data. (5 hours)

After drill 5 you have a tuned, observably-correct frontrun-resistant router. **This is what you'd ship to production for a wallet team that takes user trust seriously.**

> 🛑 **Final check (this lesson's final check).** In one sentence: of the lessons in this tier, why does the *capstone* depend on **simulation** (L1) more than any other component? If your answer doesn't mention "you can't decide whether to defend without first measuring the threat in the same units as the user's loss", the capstone hasn't quite landed yet — re-read Step 4.


---

## Capstone complete — two lessons remain

Recap of what you've built up to this capstone:

1. Minimal MEV searcher (mempool → fork-sim → arb)
2. Reorg-aware Postgres indexer (ExEx + reorg dispatch)
3. Custom RPC endpoint (jsonrpsee + extend_rpc_modules)
4. Wallet backend (signer pool + nonce mgr + replace-on-stuck)
5. EIP-7702 sponsor (Type 4 tx + paymaster pattern)
6. Foundry-style cheatcode (custom precompile + harness)
7. Swap aggregator (Revm fork + cross-venue quotes)
8. **Frontrun-resistant order router (this lesson)** — L1 / L4 / L5 / L7 integrated

Still ahead: L9 (validate-revm cross-client harness) and L10 (HTTP 402 / MPP machine-payments endpoint). They sit outside the swap-router arc but ship in the same tier.

Pick the one that interests your target employer / project most. Open the production gaps. Ship it as a small public repo. **That's the artifact you bring to a Paradigm / Tempo / serious-team conversation.**
`,
                },
                {
                  title: 'Validate Your Revm Simulation Against a Production Provider',
                  slug: 'build-validate-revm-en',
                  type: 'CONTENT',
                  sortOrder: 8,
                  duration: 50,
                  xpReward: 90,
                  content: `# Validate Your Revm Simulation Against a Production Provider

Your arb bot's Revm fork says the swap nets 2.95 WETH. The chain — running mostly Geth and Nethermind, since Reth is still only ~7-12% of execution-client share — actually delivers 2.93. **The bot just lost money to a bug in your simulation.** Every Revm-based system you built in this tier has the same exposure: the MEV searcher in L1 predicts arbs on Revm, the aggregator in L7 quotes on Revm, the capstone in L8 scores frontrun risk on Revm. If Revm disagrees with the Geth/Nethermind majority that actually runs mainnet, every one of those systems silently ships wrong answers. ~200 lines below build the cross-check.

> 📌 **Scope honesty.** We diff Revm against a JSON-RPC provider for a single transaction's gas + return data. Production validation harnesses extend this to: full state-diff comparison via \`debug_traceTransaction\` prestate, statistical sampling across thousands of historical txs, hardfork-boundary regression tests, and CI integration. The kernel — *what does "they match" actually mean, and how do you check it cheaply?* — is the same.

## Why this matters (the real reason)

The discipline is cheap. The cost of skipping it is your bot's P&L, your aggregator's user-facing quote, your router's threat score — all silently off. From the [Reth team's benchmarking philosophy](https://www.paradigm.xyz/2024/04/reth-perf): "any divergence from mainnet behavior is a bug." That's the bar.

\`\`\`mermaid
flowchart LR
    Tx["Test transaction<br/>(real mainnet tx hash<br/>or fabricated call)"] --> Revm["Revm fork<br/>at parent block"]
    Tx --> Prov["Provider<br/>(Infura / QuickNode<br/>= Geth or Reth backend)"]
    Revm --> R1["gas_used + output"]
    Prov --> R2["gas_used + output"]
    R1 --> Diff["Diff"]
    R2 --> Diff
    Diff --> Pass["✅ identical"]
    Diff --> Fail["❌ debug<br/>(hardfork? precompile?<br/>RPC caching?)"]
\`\`\`

> 🛑 **Predict before scrolling.** A custom Revm setup runs an opcode added by a non-mainnet hardfork (e.g., a chain still running Cancun rules while mainnet is Osaka). It computes a result that's **technically correct for the spec it's running** but disagrees with mainnet. Walk through how this disagreement would show up in your validation harness. Hold your guess.

## Cargo.toml

\`\`\`toml
[package]
name = "revm-cross-validation"
version = "0.1.0"
edition = "2021"

[dependencies]
alloy-eips         = "1.0"
alloy-primitives   = "1.5"
alloy-provider     = "1.0"
alloy-network      = "1.0"
alloy-rpc-types    = "1.0"
alloy-sol-types    = "1.5"
revm               = { version = "38", features = ["alloydb"] }
tokio              = { version = "1", features = ["full"] }
eyre               = "0.6"
\`\`\`

## Step 1: Pick a test case

Two flavors of test target. Use both:

1. **A historical mainnet transaction** — replay an already-mined tx at its parent block. The receipt gives you ground-truth gas_used; the provider's \`eth_call\` at the parent block gives you ground-truth return data.
2. **A fabricated call against current state** — pick a contract + method (e.g., \`USDC.balanceOf(some_holder)\`), run it both via provider \`eth_call\` and via Revm fork at the same block. The provider's response is ground truth.

Flavor 2 is simpler to start with (no historical RPC needed), so we'll build that one. Flavor 1 is in the drill.

\`\`\`rust
use alloy_primitives::{address, Address, Bytes, U256};
use alloy_sol_types::{sol, SolCall};

sol! {
    function balanceOf(address account) external view returns (uint256);
}

const USDC: Address = address!("a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
const HOLDER: Address = address!("47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503"); // a known whale

fn build_calldata() -> Bytes {
    balanceOfCall { account: HOLDER }.abi_encode().into()
}
\`\`\`

## Step 2: Get the production provider's answer

\`\`\`rust
use alloy_eips::BlockId;
use alloy_provider::{Provider, ProviderBuilder};
use alloy_rpc_types::TransactionRequest;
use alloy_network::TransactionBuilder;

async fn provider_answer(
    rpc_url: &str,
    block: u64,
    to: Address,
    data: Bytes,
) -> eyre::Result<(u64, Bytes)> {
    let provider = ProviderBuilder::new().connect(rpc_url).await?;

    let tx = TransactionRequest::default()
        .with_to(to)
        .with_input(data);

    // Ground truth output via eth_call at the chosen block
    let output = provider.call(&tx).block(BlockId::number(block)).await?;

    // Ground truth gas via eth_estimateGas at the same block
    let gas = provider.estimate_gas(&tx).block(BlockId::number(block)).await?;

    Ok((gas, output))
}
\`\`\`

Walk:

- **\`eth_call\` returns the function's return bytes** without sending a transaction — exact same execution path the contract would use, just without persisting state changes.
- **\`eth_estimateGas\` returns the gas units the call would consume.** Slightly higher than the actual minimum on-chain gas because it includes a safety buffer; for view calls (like \`balanceOf\`) the buffer is small.
- **Both pinned to a specific \`block\`** — so when we run Revm against the same block's state, we're comparing apples to apples.

> 🔍 **Find in repo.** Open [\`alloy_provider::Provider\`](https://github.com/alloy-rs/alloy/blob/main/crates/provider/src/provider/trait.rs). Note that \`call\` and \`estimate_gas\` are part of the same trait — when you swap providers (Infura → QuickNode → your own Reth node), nothing about your validation code changes. **That's the abstraction earning its keep.**

## Step 3: Run the same call locally via Revm

Same fork pattern as L1 / L7. Pin to the same block as Step 2:

\`\`\`rust
use alloy_provider::{network::Ethereum, DynProvider};
use revm::{
    context::TxEnv,
    context_interface::result::{ExecutionResult, Output},
    database::{AlloyDB, CacheDB},
    database_interface::WrapDatabaseAsync,
    primitives::TxKind,
    Context, ExecuteEvm, MainBuilder, MainContext,
};

type ForkedDB = CacheDB<WrapDatabaseAsync<AlloyDB<Ethereum, DynProvider>>>;

async fn revm_answer(
    rpc_url: &str,
    block: u64,
    to: Address,
    data: Bytes,
) -> eyre::Result<(u64, Bytes)> {
    let provider = ProviderBuilder::new().connect(rpc_url).await?.erased();
    let alloy_db = WrapDatabaseAsync::new(AlloyDB::new(provider, BlockId::number(block)))
        .ok_or_else(|| eyre::eyre!("AlloyDB init"))?;
    let mut db = CacheDB::new(alloy_db);

    let mut evm = Context::mainnet().with_db(&mut db).build_mainnet();

    let tx = TxEnv::builder()
        .caller(Address::ZERO)
        .kind(TxKind::Call(to))
        .data(data)
        .gas_limit(10_000_000)
        .build()?;

    let result = evm.transact_one(tx)?;
    match result.result {
        ExecutionResult::Success { gas_used, output: Output::Call(out), .. } => {
            Ok((gas_used, out.into()))
        }
        other => eyre::bail!("Revm execution did not succeed: {other:?}"),
    }
}
\`\`\`

Walk:

- **\`AlloyDB::new(provider, BlockId::number(block))\`** pins the fork to the exact block the provider answered against. **Same input, same world.**
- **\`Context::mainnet()\`** uses the mainnet hardfork rules. If the chain you're validating against is *not* mainnet (e.g., a custom L2), use the matching spec — Revm's \`Context\` builder lets you pick.
- **\`Address::ZERO\` as caller** for view-style calls — no signature needed, just like an \`eth_call\` from a generic address.

## Step 4: Diff

\`\`\`rust
async fn validate(rpc_url: &str, block: u64, to: Address, data: Bytes) -> eyre::Result<()> {
    let (prod_gas, prod_out) = provider_answer(rpc_url, block, to, data.clone()).await?;
    let (revm_gas, revm_out) = revm_answer(rpc_url, block, to, data).await?;

    println!("== Output bytes ==");
    println!("  provider: 0x{}", hex::encode(&prod_out));
    println!("  revm:     0x{}", hex::encode(&revm_out));
    if prod_out != revm_out {
        eyre::bail!("OUTPUT MISMATCH");
    }
    println!("  ✅ match");

    println!("== Gas ==");
    println!("  provider: {prod_gas}");
    println!("  revm:     {revm_gas}");
    // Allow a small spread because eth_estimateGas includes a buffer (~10%).
    let diff = prod_gas.abs_diff(revm_gas);
    let allowance = (prod_gas / 10).max(5_000);
    if diff > allowance {
        eyre::bail!("GAS MISMATCH: diff {diff} > allowance {allowance}");
    }
    println!("  ✅ within allowance");

    Ok(())
}
\`\`\`

Walk:

- **Output bytes are compared exactly.** A byte-level diff is the right contract — if your Revm version returns even a single byte different from the provider, downstream code that decodes the response will produce different values.
- **Gas comparison allows a spread** because \`eth_estimateGas\` includes a buffer (often 10-20%) that Revm's exact gas accounting won't add. Compare order of magnitude, not exact equality.
- **\`println!\` instead of fancy reporting** is fine for the kernel. Production wrappers use \`tracing::error!\` + a structured diff so failures are queryable in logs.

> 🛑 **Anti-fluency check.** Without scrolling: explain in one sentence why the **byte-level output comparison is exact** but the **gas comparison is approximate**. Hint: think about what \`eth_estimateGas\` is *supposed* to do beyond what \`evm.transact_one\` measures.

## Step 5: When they don't match — debug taxonomy

Real validation runs find mismatches. Here's the diagnosis tree:

| Symptom | Likely cause | Fix |
| :--- | :--- | :--- |
| **Output is consistently 0x or empty when it shouldn't be** | Revm spec mismatch (e.g., you built with \`Context::mainnet()\` but the chain is op-mainnet). | Match the chain spec: \`OpEvm\`, \`Context::op_mainnet()\`, etc. |
| **Output differs only at a hardfork boundary** | Revm's hardfork-activation block disagrees with the chain. | Pin Revm's spec to the actual hardfork active at that block — see \`SpecId\` |
| **Output differs only when the contract calls a precompile** | Custom precompile your Revm doesn't have (e.g., RIP-7212 secp256r1 active on some L2s). | Add the precompile to your Revm precompile registry (see L6). |
| **Output flickers — sometimes match, sometimes don't, same input** | RPC caching. The provider returned a stale state from a different block. | Pin to a finalized block (subtract ~32 from latest), and re-run. |
| **Gas mismatches by a constant offset** | Different intrinsic gas accounting (you skipped 21,000 base, or vice versa). | Reconcile: are you measuring just the call's gas or the full tx's gas? |
| **Gas spreads with random variance** | Hot vs cold storage access. The provider may have warmer state due to recent calls. | Re-run after a clean cycle, or fork at a synthetic state where you control warm/cold. |

Most divergences land in the top 3 rows in practice — chain-spec / hardfork / precompile mismatches.

## What's missing for production-grade validation

| Gap | What real validation harnesses do |
| :--- | :--- |
| **Sampling strategy** | Pick 1000 random historical txs over the last 7 days; validate all. Look for systematic drift. |
| **State-diff comparison** | \`debug_traceTransaction\` with prestate + statediff modes gives byte-level state changes. Compare to Revm's journal entries. (Costly RPC; sample sparingly.) |
| **Hardfork regression** | After upgrading Revm, re-validate around the last 5 hardfork blocks. New Revm versions sometimes change spec activations. |
| **Custom-precompile awareness** | Your Revm setup must include every precompile the target chain has. RIP-7212, EIP-2537, custom op-stack precompiles, MEV-Share helper precompiles, etc. |
| **CI integration** | Run validation as part of your CI pipeline. Fail merges if the diff allowance is exceeded. |
| **Multi-provider cross-check** | Run the same validation against 2-3 providers (QuickNode, Infura, Alchemy). If providers disagree with each other, your validation is moot — pick one as source of truth. |
| **Performance** | Caching the provider's answer + only re-validating changed lessons. Reduces RPC bill. |

Build the kernel above, add the production-grade habits as your needs grow. Most teams start with a few hand-picked test cases and grow from there.

## Drill

1. **Historical tx replay.** Pick a real mainnet tx hash. Fetch its receipt → use the parent block as fork point → diff its receipt.gas_used against your Revm replay's gas_used. (1 hour)
2. **Custom precompile case.** Pick an op-stack chain (Base, Optimism). Try to validate a tx that uses a precompile present on op-stack but not on mainnet (e.g., L1 block info precompile). Watch the failure mode. **What does the diff show?** (1 hour)
3. **Sampling harness.** Wrap the validate function in a loop that walks the last 100 successful txs from a single contract (Uniswap V3 router is dense). Track pass/fail. **What's the failure rate? Is the failure pattern systematic or random?** (2 hours)
4. **Multi-provider cross-check.** Run the same validation against QuickNode + Alchemy. If the two providers disagree on the same call at the same block, what does that say about your validation harness's underlying assumption? (1.5 hours)
5. **CI wire-up.** Make the validation script exit-code 1 on any failure. Wire it into a GitHub Action that runs nightly against mainnet. Fail PRs that introduce >0.1% mismatch rate vs the baseline. (3 hours)

Finish drill 5 and you have, structurally, the same continuous-validation discipline shipped at every serious Revm-based searcher / wallet / aggregator team. **The discipline is what separates "Revm code that works on my laptop" from "Revm code I trust in production."**

> 🛑 **Final check.** In one sentence: why does building L1-L8 in this tier require **also** building this validation lesson? If your answer doesn't connect "Reth is ~7-12% of clients" to "your sim's correctness depends on agreeing with the 88-93% that aren't Reth," re-read the opening — that's the entire reason this lesson sits last in the tier.

## 📺 Further watching

\`\`\`youtube
Nh19f_2fWLc | Dragan Rakita — EVM Technical walkthrough — the spec your Revm needs to follow exactly to match production
\`\`\`

---

## You've finished the Building tier (now for real)

Ten lessons covering everything from "I have an arbitrage idea" to "I can guarantee my Revm matches Geth in production" and "I can monetize any of it per request":

1. Minimal MEV searcher (mempool → fork-sim → arb)
2. Reorg-aware Postgres indexer (ExEx + reorg dispatch)
3. Custom RPC endpoint (jsonrpsee + extend_rpc_modules)
4. Wallet backend (signer pool + nonce mgr + replace-on-stuck)
5. EIP-7702 sponsor (Type 4 tx + paymaster pattern)
6. Foundry-style cheatcode (custom precompile + harness)
7. Swap aggregator (Revm fork + cross-venue quotes)
8. Frontrun-resistant order router (capstone — integrates 1-7)
9. **Cross-client validation harness (this lesson)** — turns the previous eight from "demos" into "production-trusted"
10. Machine-payments endpoint (HTTP 402 + MPP) — the monetization layer on top of any of the above

Pick the build that maps to your target employer / project most closely. Open the production gaps. Ship as a small public repo. **That's the artifact you bring to the conversation.**
`,
                },
                {
                  title: 'Machine payments — HTTP 402 and the Tempo MPP stack',
                  slug: 'build-mpp-payments-en',
                  type: 'CONTENT',
                  sortOrder: 9,
                  duration: 16,
                  xpReward: 40,
                  content: `# Machine payments — HTTP 402 and the Tempo MPP stack

Every paid API in 2026 forces the same dance. Sign up. Verify email. Provision an API key. Wire a billing account. Pre-commit to a plan. *Then* you can fetch one paid resource. For a human shipping a SaaS, fine. For an autonomous agent that needed *one* flight-status lookup *once*, the friction is the product — and the product is broken.

The **Machine Payments Protocol (MPP)** — IETF draft, jointly developed by Tempo Labs and Stripe — changes the contract. The client makes the HTTP request. The server replies \`402 Payment Required\` with a challenge. The client pays. The client retries with proof. The server returns \`200 OK\`. No account. No key. No checkout flow. Pay-per-request, in the same roundtrip, against any payment rail the server accepts — Tempo, Stripe, ACH, Lightning, card, custom.

This lesson reads the source: the spec ([\`tempoxyz/mpp-specs\`](https://github.com/tempoxyz/mpp-specs)), the Rust SDK ([\`tempoxyz/mpp-rs\`](https://github.com/tempoxyz/mpp-rs)), and a working end-to-end CLI ([\`tempoxyz/wallet\`](https://github.com/tempoxyz/wallet)).

> 📌 **Spec status — hedge appropriately.** MPP is an *IETF draft* ([draft-ryan-httpauth-payment-00](https://datatracker.ietf.org/doc/draft-ryan-httpauth-payment/)), not a ratified standard. The wire format may still evolve. What's stable enough to build on right now is the *shape* — HTTP 402 + a \`Payment\` auth scheme — and the Tempo/Stripe reference implementations. Treat the bytes as draft; treat the architecture as the lesson.

## The status code that nobody used

HTTP 402 was reserved 30 years ago "for future use." It sat unused while the web grew around API keys, OAuth, Stripe Checkout, and every other workaround for *not* having a native payment status code. MPP is the first serious specification to claim it.

The full flow — reproduced straight from [\`mpp-specs/README.md\`](https://github.com/tempoxyz/mpp-specs/blob/main/README.md):

\`\`\`mermaid
sequenceDiagram
    participant Client
    participant Server

    Client->>Server: GET /resource
    Server-->>Client: 402 Payment Required<br/>WWW-Authenticate: Payment ...

    Note over Client: Client fulfills payment challenge

    Client->>Server: GET /resource<br/>Authorization: Payment credential
    Server-->>Client: 200 OK
\`\`\`

Five steps. Read the boundaries:

1. Client \`GET /resource\` — same request shape as any uncached, unauthenticated GET.
2. Server \`402 Payment Required\` + \`WWW-Authenticate: Payment <challenge>\` — the challenge encodes *what* payment is needed and *which rails* the server accepts.
3. Client fulfills the payment **off-band** — a Tempo on-chain charge, a Stripe Shared Payment Token, a Lightning invoice. The protocol does not care which.
4. Client retries \`GET /resource\` with \`Authorization: Payment <credential>\` — the credential proves the payment happened.
5. Server validates, returns \`200 OK\`.

The piece that earns the design its agnosticism: step 3 is *not in the HTTP roundtrip*. The protocol specifies the *handshake* (steps 1, 2, 4, 5) and delegates the *settlement* to whatever rail the challenge advertised. That separation is the whole game.

> 🛑 **Predict before scrolling.** The \`WWW-Authenticate: Payment\` challenge format is extensible — any rail can plug in. Why is that the right choice, instead of baking in (say) Tempo specifically? Form a one-sentence answer about *what changes break if you fuse the protocol with one rail*. Hold your guess until the architecture section.

## Three layers — Core / Intents / Methods

The spec repo is modular for a reason. Open [\`tempoxyz/mpp-specs/specs/\`](https://github.com/tempoxyz/mpp-specs/tree/main/specs). Three subdirectories matter:

| Layer | Path | What it pins down |
| :--- | :--- | :--- |
| **Core** | [\`specs/core/\`](https://github.com/tempoxyz/mpp-specs/tree/main/specs/core) | HTTP 402 semantics, the \`Payment\` auth scheme, header grammar, IANA registries. Payment-rail agnostic. |
| **Intents** | [\`specs/intents/\`](https://github.com/tempoxyz/mpp-specs/tree/main/specs/intents) | Abstract patterns: charge, authorize, subscription. Define *what kind* of payment without specifying *how*. |
| **Methods** | [\`specs/methods/\`](https://github.com/tempoxyz/mpp-specs/tree/main/specs/methods) | Concrete per-rail implementations: \`tempo/\`, \`stripe/\`, \`evm/\`, \`solana/\`, \`stellar/\`, \`lightning/\`, \`card/\`. |

The design problem the split solves: **how do you write one client library that works against Tempo and Stripe and ACH and Lightning?** Answer — the same shape as the Collector/Strategy/Executor split you read in [the artemis lesson](./build-mev-searcher-en). Separate the HTTP mechanics (Core) from the payment intent (Intents) from the rail-specific bytes (Methods). The Core layer doesn't know what a blockchain is. The Methods layer doesn't know what HTTP 402 looks like. The Intents layer is the contract between them.

If you forced Tempo-specific assumptions into Core, the moment Stripe joined as a co-maintainer — *which happened* — every piece of Core would need re-litigating. The modular split made adding Stripe a matter of dropping a new directory under \`specs/methods/stripe/\` without touching the protocol itself.

> 🔍 **Find in repo.** Open [\`specs/core/draft-httpauth-payment-00.md\`](https://github.com/tempoxyz/mpp-specs/blob/main/specs/core/draft-httpauth-payment-00.md). Skim the IANA registry section. **In your own words:** what does adding a new payment method actually require? Is the answer "a PR against Core" or "a PR adding one file under \`specs/methods/\`"? (The answer is what makes this protocol future-proof — and what makes \`WWW-Authenticate: Payment\` extensible by design.)

## The Rust SDK in 30 seconds

Open [\`tempoxyz/mpp-rs\`](https://github.com/tempoxyz/mpp-rs). The SDK splits along the same fault line as the protocol — [\`src/server/\`](https://github.com/tempoxyz/mpp-rs/tree/main/src/server) for the merchant side, [\`src/client/\`](https://github.com/tempoxyz/mpp-rs/tree/main/src/client) for the buyer side.

**Server side** — produce challenges, verify credentials:

\`\`\`rust
use mpp::server::{Mpp, tempo, TempoConfig};

let mpp = Mpp::create(tempo(TempoConfig {
    recipient: "0x742d35Cc6634C0532925a3b844Bc9e7595f1B0F2",
}))?;

let challenge = mpp.charge("1")?;             // returns WWW-Authenticate value
let receipt = mpp.verify_credential(&credential).await?;
\`\`\`

\`Mpp::create\` takes a *payment provider* — \`tempo(...)\`, \`stripe(...)\`, your own. The returned \`Mpp\` produces challenges and validates credentials *generically*. Swap the provider; the rest of your server doesn't move.

**Client side** — make 402s transparent:

\`\`\`rust
use mpp::client::{PaymentMiddleware, TempoProvider};
use reqwest_middleware::ClientBuilder;

let provider = TempoProvider::new(signer, "https://rpc.moderato.tempo.xyz")?;
let client = ClientBuilder::new(reqwest::Client::new())
    .with(PaymentMiddleware::new(provider))
    .build();

// Requests now handle 402 automatically
let resp = client.get("https://mpp.dev/api/ping/paid").send().await?;
\`\`\`

\`PaymentMiddleware\` wraps a reqwest client. The middleware intercepts 402 responses, parses the challenge, calls the provider to fulfill the payment, retries with the \`Authorization: Payment\` header. From the caller's perspective, \`.get(...).send()\` Just Works against any MPP-compatible endpoint.

> 🔍 **Find in repo.** Open [\`src/client/middleware.rs\`](https://github.com/tempoxyz/mpp-rs/blob/main/src/client/middleware.rs) and find the function that handles the retry. Then open [\`src/server/mpp.rs\`](https://github.com/tempoxyz/mpp-rs/blob/main/src/server/mpp.rs) and find where the challenge is emitted. **Predict:** what's the smallest change you'd make to add a new payment provider — say, a custom L2's native asset? (Answer: implement the \`PaymentProvider\` trait on the client side and the \`ChargeMethod\` trait on the server. Zero changes to middleware or the protocol parser.)

## Why Intents matter — the agent-at-scale problem

> 🛑 **Predict.** An agent makes 1000 paid API requests per minute. What's broken about doing that as 1000 on-chain Tempo transactions? What does the protocol's *Intents* layer give you to fix it?

(Answer: 1000 on-chain charges are slow, expensive in fees, and serialize the agent against block time. The Intents layer separates *charge* — settle each request individually — from *authorize* and *subscription* patterns — open a channel or session once, settle later. The wallet's "Session Payment (Channel)" mode below is exactly this — an on-chain channel opens once, off-chain vouchers settle per request, the channel closes when you're done. The Core layer doesn't know about channels. It knows about challenges and credentials. The Intents layer is where "1000 cheap requests per session" gets a name.)

The relevant directories: [\`specs/intents/draft-payment-intent-charge-00.md\`](https://github.com/tempoxyz/mpp-specs/blob/main/specs/intents/draft-payment-intent-charge-00.md) is the one ratified intent at draft stage. Authorize and subscription are on the roadmap per the README.

## From protocol to production — \`tempo wallet\`

[\`tempoxyz/wallet\`](https://github.com/tempoxyz/wallet) is the canonical working integration. A CLI wallet with MPP built in. Three commands carry the whole flow:

\`\`\`bash
tempo wallet login                        # passkey login, opens browser
tempo wallet fund                         # top up
tempo request https://aviationstack.mpp.tempo.xyz/v1/flights?flight_iata=AA100
\`\`\`

The third command is the lesson. \`tempo request <url>\` performs the full 402 dance — challenge, sign, pay, retry — and prints the response body. No API key. No billing account. Just *the wallet exists and is funded*.

Two payment shapes the wallet supports, lifted straight from the [README](https://github.com/tempoxyz/wallet/blob/main/README.md):

| Shape | Trade-off | Use when |
| :--- | :--- | :--- |
| **One-shot (charge)** | Every request independently settles on-chain. No session state. | Sporadic paid calls, low frequency. |
| **Session (channel)** | On-chain channel opens once. Off-chain vouchers exchanged per request. Settles when you close. | Streaming (SSE token-by-token), repeated calls to the same endpoint. |

Session mode is the Intents-layer answer to the 1000-requests-per-minute predict above, made concrete.

A subtler design point worth pausing on: the login flow uses a **passkey** (Touch ID / Face ID / hardware key) to authorize a **scoped session key** — time-limited, spending-capped, chain-bound — that the CLI then uses for signing. Your passkey never leaves the browser. The CLI holds a restricted credential, not your root key. This is the same pattern an agent should use: don't give it the keys to the kingdom; give it a scoped key that expires.

> 🔍 **Find in repo.** Open the wallet's [\`ARCHITECTURE.md\`](https://github.com/tempoxyz/wallet/blob/main/ARCHITECTURE.md) (or skim the top-level Rust crates). **In your own words:** at what layer does the wallet hold the passkey-derived session key, and at what layer does it hand a \`PaymentProvider\` to the MPP middleware? The answer tells you the deployment shape for any agent you build on top of this.

## Now answer the earlier predict

**Why is \`WWW-Authenticate: Payment\` extensible rather than Tempo-specific?** Because the moment you bake in one rail, you've forked the protocol from anyone who wants to use a different one. Stripe co-maintaining MPP is only possible because Core is rail-agnostic — Stripe contributes the \`methods/stripe/\` directory, not edits to Core. Same shape Lightning, ACH, and any future rail will follow.

This is the same trait-split discipline you saw in [artemis](./build-mev-searcher-en) (Collector / Strategy / Executor) and in the [validate-revm](./build-validate-revm-en) cross-check (provider-agnostic via the Alloy \`Provider\` trait). The pattern repeats in every serious protocol or framework: separate *mechanics* from *policy* from *concrete implementation*, and the future stays cheap.

## Why this matters for what you build

Two angles, both real:

- **You ship a paid service.** Wrap your endpoint with \`Mpp::create(tempo(...))\` (or Stripe, or both). Agents and apps can pay per-request. No billing infrastructure, no API-key issuance, no rate-limit dashboards, no Stripe-portal integration. You charge what each request is worth and the protocol handles settlement. The aggregator from L7, the RPC endpoint from L3, the cheatcode harness from L6 — any of them could expose a paid surface this way.

- **You ship a paid consumer.** Bolt \`PaymentMiddleware\` onto a reqwest client. Now your agent — or your indexer, or your validator's observability stack — can pay any MPP-compatible endpoint without per-vendor integration. The MEV searcher from L1 wants paid mempool feeds? Plug in MPP. The wallet backend from L4 wants paid data oracles? Plug in MPP. The capstone router from L8 wants paid private order flow? Plug in MPP.

The genuine product idea worth chasing: a paid service that *only an agent would want at this granularity* — single-shot flight-status lookups, single-shot pricing oracles, single-shot LLM completions billed per token. Human-grade APIs don't price small enough; agent-grade APIs do because MPP makes per-request settlement cheap.

## Recall checklist

Before moving on, confirm you can answer each of these without scrolling back:

1. What HTTP status code does MPP claim, and what does the server's \`WWW-Authenticate\` header look like?
2. Name the three layers of the spec and what each one pins down.
3. On the SDK server side, what does \`Mpp::create(tempo(...))\` give you? On the client side, what does \`PaymentMiddleware\` do?
4. Why is the Intents layer separate from Core? Give a concrete scenario where it matters.
5. What's the trade-off between a one-shot \`tempo request\` and a session-mode \`tempo request\`?

If you stumbled on 2 or 4, re-read the Core/Intents/Methods section before the next lesson.

## Drill

1. **Read the IETF draft.** Open [\`specs/core/draft-httpauth-payment-00.md\`](https://github.com/tempoxyz/mpp-specs/blob/main/specs/core/draft-httpauth-payment-00.md). Skim until you can name three header fields the \`Payment\` scheme defines and what each one carries. (45 min)
2. **Stand up a paid endpoint.** Clone [\`mpp-rs\`](https://github.com/tempoxyz/mpp-rs), look at [\`examples/\`](https://github.com/tempoxyz/mpp-rs/tree/main/examples), and run an axum server that charges 0.01 for one route. Hit it with curl, observe the 402. Hit it with \`tempo request\`, observe the 200. (2 hours)
3. **Wrap an existing service.** Pick one of your earlier-tier builds — say, the custom RPC endpoint from L3. Add \`mpp\`'s axum integration. Charge per call. Verify with the wallet. (3 hours)
4. **Trace a session.** With session-mode \`tempo request\` against a paid SSE endpoint, walk the network: when does the channel open? when do vouchers exchange? when does it settle? Use \`tempo wallet sessions list\` and \`close\` to inspect state. (1.5 hours)
5. **Implement a custom provider.** Pick a payment rail not in the SDK (your favorite L2's native asset). Implement \`PaymentProvider\` (client) and \`ChargeMethod\` (server). Test against your own paid endpoint. *This is the test of whether the abstraction earns its keep.* (4 hours)

Finish drill 3 and you have a paid endpoint deployable on real infrastructure. Finish drill 5 and you've internalized the protocol well enough to extend it.

> 🛑 **Final check.** In one sentence: what does MPP give an agent that API keys + Stripe Checkout don't? If your answer doesn't mention *per-request settlement, no account, no rail lock-in*, re-read the opening — that's the entire reason the protocol exists.
`,
                },
              ],
            },
          },
        ],
      },
    },
  });

  console.log('  Building (EN) seeded');
}
