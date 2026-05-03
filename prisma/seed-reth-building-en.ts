import { PrismaClient } from '@prisma/client';

export async function seedRethBuildingEN(prisma: PrismaClient) {
  const tags = ['reth', 'revm', 'alloy', 'rust', 'mev', 'building', 'application', 'capstone'];

  await prisma.course.create({
    data: {
      slug: 'reth-building-en',
      title: 'Building with the Stack — Real-World Rust EVM Apps',
      description:
        "Reading the source is the prerequisite. This tier is the payoff: ship working applications with Rust + Alloy + Revm. The first lesson is a complete minimal MEV searcher (mempool → fork-simulate → arb-detect → bundle) in ~200 lines. More builds coming: indexer, custom RPC, wallet backend, EIP-7702 bundler.",
      difficulty: 'ADVANCED',
      duration: 60,
      xpReward: 100,
      track: 'reth-building',
      tags,
      isPublished: true,
      sortOrder: 500,
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

You've read \`add\`, you've read the \`Stage\` trait, you've read \`identity_run\`. Now build something. This lesson walks the **complete code** of a minimal MEV searcher — ~200 lines of Rust that watches the public mempool, simulates candidate transactions in a forked Revm, detects a 2-hop arbitrage opportunity, and constructs a Flashbots-style bundle.

> 📌 **Scope honesty.** This lesson stops at "bundle constructed". Actually submitting to a relay involves authentication, gas auctions, MEV-Boost integration, and ~~your money~~ real risk management — all production complexity orthogonal to the question this lesson answers: *"can I, on my laptop, see an arb opportunity at the same time the rest of the network does?"*

## What you'll build

\`\`\`mermaid
flowchart LR
    Mempool["WS mempool subscribe"] -->|tx hash| Decode["Decode<br/>swapExactTokensForTokens"]
    Decode -->|valid swap| Fork["Revm fork<br/>at latest block"]
    Fork -->|apply tx| Sim["Simulate<br/>observe state delta"]
    Sim -->|new pool reserves| Detect["Detect 2-hop<br/>arb opportunity"]
    Detect -->|profitable| Bundle["Build bundle:<br/>frontrun + tx + backrun"]
\`\`\`

A single \`main.rs\`. No frameworks. Direct calls into Alloy and Revm. The whole point is that you can see every byte of what's happening.

> 🛑 **Predict before scrolling.** Why fork-and-simulate locally instead of just calling \`eth_call\` against your provider? Form a one-sentence answer about *what \`eth_call\` returns vs. what you need*. Hold your guess.

## Why Rust + Alloy + Revm here

- **Rust** — deterministic latency. No GC pauses. When your edge is the difference between landing in this block vs. the next, this matters.
- **Revm** — local simulation **without an RPC roundtrip**. \`eth_call\` against Infura is ~30–80 ms over the wire. Revm against an in-memory cache is **~200 µs**. Two orders of magnitude. (And \`eth_call\` only returns the *result* — Revm gives you the **state delta**, which is what arb detection needs.)
- **Alloy** — typed contract bindings via \`sol!\`, typed Provider, no manual ABI encoding. The plumbing tax that pure-Solidity devs pay disappears.

Same stack Flashbots / Frontier / your-favorite-block-builder runs in production. You're not learning a toy.

## Cargo.toml

\`\`\`toml
[package]
name = "minimal-searcher"
version = "0.1.0"
edition = "2021"

[dependencies]
alloy-eips         = "1.0"
alloy-primitives   = "1.5"
alloy-provider     = { version = "1.0", features = ["ws"] }
alloy-rpc-types    = "1.0"
alloy-sol-types    = "1.5"
alloy-network      = "1.0"
alloy-signer       = "1.0"
alloy-signer-local = "1.0"
revm               = { version = "38", features = ["alloydb"] }
tokio              = { version = "1", features = ["rt-multi-thread", "macros", "sync"] }
futures            = "0.3"
eyre               = "0.6"
\`\`\`

> Versions pinned for May 2026. Alloy 1.x and Revm 38 are the relevant majors at the time of writing — both move fast, so when you copy this code, run \`cargo update\` and skim the release notes for breaking renames.

## Step 1: Subscribe to the mempool

\`\`\`rust
use alloy_provider::{Provider, ProviderBuilder, WsConnect};
use futures::StreamExt;

#[tokio::main]
async fn main() -> eyre::Result<()> {
    let ws_url = std::env::var("ETH_WS_URL")?;
    let provider = ProviderBuilder::new()
        .connect_ws(WsConnect::new(ws_url))
        .await?;

    let mut sub = provider
        .subscribe_pending_transactions()
        .await?
        .into_stream();

    while let Some(tx_hash) = sub.next().await {
        let Some(tx) = provider.get_transaction_by_hash(tx_hash).await? else {
            continue;
        };
        // ... handle tx
    }
    Ok(())
}
\`\`\`

Walk:

- \`WsConnect\` — WebSocket transport. **Why not HTTP polling?** HTTP costs you a roundtrip per poll, ~50 ms each. WS pushes hashes the moment your provider sees them. At this layer, polling is conceding.
- \`subscribe_pending_transactions()\` returns a stream of **tx hashes**, not full txs. Why? Mempool traffic is high — your provider doesn't want to push 500 KB of raw tx data per second to every subscriber. You fetch the body for ones you care about.
- \`get_transaction_by_hash\` — second roundtrip to materialize the body. **This is your first latency budget item.** A real searcher uses a private mempool stream that pushes the full body inline. We're using the public path because it's free and educational.

> 🔍 **Find in repo.** In Alloy, \`subscribe_pending_transactions\` is on the [\`Provider\`](https://github.com/alloy-rs/alloy/blob/main/crates/provider/src/provider/trait.rs) trait. Open it. Note that this method requires the \`pubsub\` feature on your provider — your HTTP-only Infura key won't work. WS endpoint required.

## Step 2: Decode the swap call

We're filtering for Uniswap V2 router swaps. The router lives at \`0x7a25...488D\` on mainnet:

\`\`\`rust
use alloy_primitives::{address, Address, U256};
use alloy_sol_types::{sol, SolCall};

const UNI_V2_ROUTER: Address = address!("7a250d5630B4cF539739dF2C5dAcb4c659F2488D");

sol! {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}
\`\`\`

In the main loop:

\`\`\`rust
if tx.to() != Some(UNI_V2_ROUTER) { continue; }

let Ok(call) = swapExactTokensForTokensCall::abi_decode(tx.input(), true) else {
    continue; // wrong selector or malformed input
};

// We only care about 2-hop swaps for the simple version
if call.path.len() != 2 { continue; }
let token_in  = call.path[0];
let token_out = call.path[1];
let amount_in = call.amountIn;
\`\`\`

Walk:

- The \`sol!\` macro expands the Solidity signature into a typed Rust struct \`swapExactTokensForTokensCall\` plus an \`abi_decode\` method. **No hand-written ABI plumbing.** This is the same machinery Foundry uses for cheatcode dispatch (you saw \`Vm.sol\` in Fundamentals).
- \`abi_decode(input, true)\` — the \`true\` validates the selector matches. Returns \`Err\` cleanly if the call is to a different function on the router.
- \`call.path.len() != 2\` — production would handle longer routes. We're scoping for clarity.

> 🛑 **Anti-fluency check.** Without scrolling back: why is \`sol!\` better than typing out the function selector manually? Don't say "convenience" — name two specific failure modes \`sol!\` prevents. (Hint: think about Solidity ABI changes upstream and about getting selector hashing wrong.)

## Step 3: Fork mainnet with Revm + AlloyDB

The fork setup is the most "production-shaped" code in the lesson. Read carefully:

\`\`\`rust
use alloy_eips::BlockId;
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

async fn build_fork(provider: DynProvider) -> eyre::Result<ForkedDB> {
    let alloy_db = WrapDatabaseAsync::new(
        AlloyDB::new(provider, BlockId::latest())
    ).ok_or_else(|| eyre::eyre!("AlloyDB init failed"))?;
    Ok(CacheDB::new(alloy_db))
}
\`\`\`

Three layers:

| Layer | Job |
| :--- | :--- |
| \`AlloyDB\` | Lazy state loader. When Revm asks for slot \`X\` of address \`Y\`, AlloyDB issues an \`eth_getStorageAt\` to your provider behind the scenes. |
| \`WrapDatabaseAsync\` | Bridges AlloyDB's async API to Revm's sync \`Database\` trait. Revm wants sync; the wrapper does the \`block_on\` for you. |
| \`CacheDB\` | In-memory cache that sits in front. **First** access to a slot hits the provider; **subsequent** accesses are instant. This is the magic that makes simulation cheap. |

> 🔍 **Find in repo.** \`AlloyDB\` and \`WrapDatabaseAsync\` live in [\`revm/crates/database\`](https://github.com/bluealloy/revm/tree/main/crates/database). Open them. Compare them to the bare \`Database\` trait you read in **Advanced**. The same trait powers both an in-memory test DB and this live-fork DB. **That's the payoff of the trait abstraction you read about line by line.**

## Step 4: Apply the candidate tx and observe state

\`\`\`rust
async fn simulate_candidate(
    provider: DynProvider,
    tx: &alloy_rpc_types::Transaction,
) -> eyre::Result<Option<ForkedDB>> {
    let mut db = build_fork(provider).await?;

    let mut evm = Context::mainnet().with_db(&mut db).build_mainnet();

    let tx_env = TxEnv::builder()
        .caller(tx.from())
        .kind(TxKind::Call(UNI_V2_ROUTER))
        .data(tx.input().clone())
        .value(tx.value())
        .gas_limit(tx.gas_limit())
        .build()?;

    let result = evm.transact_one(tx_env)?;

    match result.result {
        ExecutionResult::Success { .. } => Ok(Some(db)),
        _ => Ok(None), // tx would revert — no arb edge here
    }
}
\`\`\`

Walk:

- \`Context::mainnet().with_db(&mut db).build_mainnet()\` — assembles the **mainnet** EVM (current hardfork rules, mainnet precompiles) with our forked DB as state source.
- \`TxEnv::builder()\` — the immutable per-transaction environment. \`caller\`, \`kind\` (Call vs Create), \`data\`, \`value\`, \`gas_limit\`. Every field that affects execution.
- \`evm.transact_one(tx_env)?\` — runs the tx **against the cache**. State changes are written back into \`db\`. **Critical:** you now have a DB representing "the world if this candidate tx had executed." That's what we needed.
- The \`Ok(None)\` branch is the searcher's first cull: txs that revert have no arb edge for us — they didn't move any pool reserves.

> 🛑 **Predict.** A user submits a swap that consumes 100% of the pool reserves (drain attack). After \`transact_one\`, what is the pool's reserve state in our DB? Answer in your head, then think through what that means for our 2-hop arb math in Step 5.

## Step 5: Detect the arbitrage

We need to know: did the candidate tx move pool A's prices enough that a different pool (pool B with the same pair) now has an exploitable spread?

\`\`\`rust
sol! {
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
}

fn read_reserves(db: &mut ForkedDB, pool: Address) -> eyre::Result<(U256, U256)> {
    let mut evm = Context::mainnet().with_db(db).build_mainnet();
    let call = getReservesCall {}.abi_encode();

    let result = evm.transact_one(
        TxEnv::builder()
            .caller(address!("0000000000000000000000000000000000000001"))
            .kind(TxKind::Call(pool))
            .data(call.into())
            .gas_limit(1_000_000)
            .build()?,
    )?;

    let ExecutionResult::Success { output: Output::Call(out), .. } = result.result else {
        eyre::bail!("getReserves failed");
    };

    let decoded = getReservesCall::abi_decode_returns(&out, true)?;
    Ok((U256::from(decoded.reserve0), U256::from(decoded.reserve1)))
}

fn detect_arb(
    pool_a: (U256, U256),  // post-candidate reserves on the pool the user touched
    pool_b: (U256, U256),  // current reserves on a parallel pool (different DEX, same pair)
) -> Option<U256> {
    // Constant-product invariant: x * y = k. If pool A is now at (xA, yA)
    // and pool B sits at (xB, yB), the price gap is exploitable when
    // (yA / xA) != (yB / xB). The optimal in-amount is the closed-form
    // solution from Angeris et al. (2020): we want to push the cheaper
    // pool's price up until it equals the expensive pool's price.
    //
    // Simplified for the lesson: we just check if the spread exceeds a
    // 30 bps threshold (covers 2x 0.3% Uniswap fees + headroom).
    let price_a = pool_a.1 * U256::from(10_000) / pool_a.0;
    let price_b = pool_b.1 * U256::from(10_000) / pool_b.0;
    let spread = if price_a > price_b { price_a - price_b } else { price_b - price_a };

    if spread < U256::from(30) { return None; }

    // Production code computes optimal arb size here. We return a fixed
    // 1 ETH probe — enough to demonstrate; not enough to capture the edge.
    Some(U256::from(10).pow(U256::from(18)))
}
\`\`\`

Walk:

- We re-build a Revm Context with the **same** \`db\` so reserves come from the post-candidate state. \`getReserves\` is a pure view — it doesn't write — so we're not corrupting the simulation.
- Spread math: scaled to basis points (10,000 = 100%). 30 bps ≈ 0.30% — the round-trip Uniswap fee. Smaller spread = no real edge after fees.
- The fixed 1 ETH return is **deliberately wrong** for production. The closed-form optimal size from Angeris–Chitra–Evans is ~30 lines of math; we're skipping it because the lesson is about the *shape* of the build, not arb optimization. Drill 5 below makes you implement it.

> 🔍 **Find in repo.** Open the [Uniswap V2 pair](https://github.com/Uniswap/v2-core/blob/master/contracts/UniswapV2Pair.sol) source. Find \`getReserves\`. Note it returns three values, but we only use two — the timestamp is for TWAPs (Uniswap V2's price-oracle hack). **You'll see this exact pattern in dozens of forks.**

## Step 6: Build the bundle (without submitting)

\`\`\`rust
use alloy_signer_local::PrivateKeySigner;
use alloy_network::TransactionBuilder;
use alloy_rpc_types::TransactionRequest;
use serde_json::json;

async fn build_bundle(
    signer: &PrivateKeySigner,
    nonce: u64,
    base_fee: u128,
    candidate_tx_raw: &[u8],
    arb_amount: U256,
) -> eyre::Result<serde_json::Value> {
    // Backrun: a swap on the cheaper pool, in the opposite direction
    let backrun_request = TransactionRequest::default()
        .with_from(signer.address())
        .with_to(UNI_V2_ROUTER)
        .with_value(arb_amount)
        .with_nonce(nonce)
        .with_gas_limit(300_000)
        .with_max_fee_per_gas(base_fee * 3)
        .with_max_priority_fee_per_gas(base_fee);
    // (input data for the backrun swap call elided — see drill 1)

    let backrun_signed = backrun_request
        .build(&signer.clone().into())
        .await?
        .encoded_2718();

    Ok(json!({
        "txs": [
            format!("0x{}", hex::encode(candidate_tx_raw)),
            format!("0x{}", hex::encode(backrun_signed)),
        ],
        "blockNumber": "pending",
    }))
}
\`\`\`

Walk:

- \`PrivateKeySigner\` — Alloy's local signer. Loads from a hex string or a keystore file. Don't commit your real key.
- \`TransactionBuilder\` extension methods (\`with_from\`, \`with_to\`, etc.) — fluent API on \`TransactionRequest\`. The \`build()\` call is what hashes + signs.
- \`encoded_2718()\` — EIP-2718 envelope encoding. Required by every Flashbots-style relay.
- The bundle JSON shape is **exactly** what \`eth_sendBundle\` accepts. Submitting is a one-line POST. We don't, because: (a) you'd need a relay endpoint and \`X-Flashbots-Signature\` auth; (b) the searcher world has real money in it and we want you to think before you submit.

## What's missing for production

Be honest with yourself about the gap between this lesson and what actually wins MEV games:

| Gap | What real searchers do |
| :--- | :--- |
| **Multi-DEX coverage** | V3, Curve, Balancer, custom AMMs, CEX/DEX legs |
| **Optimal sizing** | Closed-form Angeris–Chitra–Evans; fall back to ternary search for non-CFMMs |
| **Bundle submission** | \`eth_sendBundle\` to Flashbots, Beaverbuild, Titan, Rsync — and watch the inclusion rate per relay |
| **Gas auction** | Coinbase tip escalation; conditional bundles; private orderflow auctions (PBS) |
| **Latency** | Private mempool subscriptions; colocation with builders; FPGA / kernel-bypass networking at the top of the stack |
| **Risk management** | Sim accuracy vs. on-chain reality; revert protection (failed inclusion still costs you the inclusion fee on conditional builders); position limits |

The architecture you built — mempool → fork-sim → detect → bundle — **is exactly the architecture used at the top**. Real searchers add scale, optimization, and edge — they don't restructure.

## Drill

1. **Add Sushi.** Sushiswap V2 uses the same router ABI as Uniswap V2, just at address \`0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F\`. Extend the candidate filter to accept either router. (5 min)
2. **Filter dust.** Add a \`if amount_in < parse_units("1", "ether") { continue; }\` so the searcher ignores swaps below 1 ETH. Profile your CPU usage before vs. after — how much computation were you spending on dust? (15 min)
3. **Profit threshold.** Compute expected profit (in ETH) for each detected opportunity. Only "would submit" when expected profit > 0.01 ETH after gas. (30 min)
4. **Latency budget.** Wrap each step in \`Instant::now()\`. Log \`tx_received_at → simulation_done_at → bundle_built_at\`. What's your end-to-end latency? Where's the biggest bite? (1 hour)
5. **Optimal sizing.** Replace the fixed 1 ETH probe with the closed-form optimal arb size from [Angeris–Chitra–Evans 2020](https://arxiv.org/abs/2003.10001). The math is ~20 lines of Rust if you keep U256 throughout. (3–6 hours)

Finish drill 5 and you have the algorithmic core of a real searcher. Add submission + multi-DEX and you're at parity with what shipped in 2022.

> 🛑 **Final check.** In one sentence: why is the *fork* in this design (Step 3) the part that makes the searcher possible at all? If your answer doesn't mention "observing the world *as if* the candidate had landed", re-read Step 3 — that re-anchoring is the whole game.

## 📺 Further watching

\`\`\`youtube
vCCYFSAdCFo | Understanding MEV — Georgios Konstantopoulos, Dan Robinson, Hasu (Paradigm)
\`\`\`


---

## Coming in this tier

The next lesson in **Building with the Stack** picks up where this one stops: an in-process indexer that turns the chain into a queryable Postgres dataset, with full reorg correctness, in another ~250 lines. Planned after that: a custom RPC endpoint on Reth, a Rust wallet backend, and a minimal EIP-7702 bundler.

Subscribe to the [GitHub repo](https://github.com/psyto/rethlab) for new lessons.
`,
                },
                {
                  title: 'Build a Reorg-Aware Indexer with ExEx',
                  slug: 'build-exex-indexer-en',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 45,
                  xpReward: 80,
                  content: `# Build a Reorg-Aware Indexer with ExEx

Every block explorer, every analytics pipeline, every liquidation monitor needs the same primitive: **read the chain into your own datastore, and don't corrupt it when a reorg happens.** ExEx is the part of Reth that turns this from a 2,000-line side-project into a 250-line single file. This lesson walks the complete code.

> 📌 **Scope honesty.** We index ERC-20 Transfer events into Postgres with full reorg handling — commit on \`ChainCommitted\`, undo on \`ChainReverted\`, swap on \`ChainReorged\`. We don't build a public API on top of the data; that's the second half of any indexer and orthogonal to the question this lesson answers: *"how do I get correct chain data into a datastore at node speed?"*

## What you'll build

\`\`\`mermaid
flowchart LR
    Reth["Reth node<br/>(in-process)"] -->|ExExNotification| Loop["ExEx loop"]
    Loop -->|ChainCommitted| Decode["Decode Transfer logs<br/>from receipts"]
    Decode -->|rows| Insert["INSERT into Postgres"]
    Loop -->|ChainReverted| Delete["DELETE WHERE<br/>block IN range"]
    Loop -->|ChainReorged| Swap["DELETE old +<br/>INSERT new"]
    Insert --> Signal["Send FinishedHeight<br/>(let Reth prune)"]
    Delete --> Signal
    Swap --> Signal
\`\`\`

A single \`main.rs\` that runs **inside Reth's process**. No JSON-RPC roundtrips, no separate node, no websocket reconnection logic. The ExEx receives a typed stream of chain events as Reth itself produces them.

> 🛑 **Predict before scrolling.** Why is "in-process" the architectural win here? Form a one-sentence answer about what running outside the node forces an indexer to do that you skip when you live inside it. Hold your guess until Step 2.

## Why ExEx (vs \`eth_getLogs\` polling, vs direct DB reads)

| Approach | Latency | Reorg correctness | Reth coupling |
| :--- | :--- | :--- | :--- |
| **\`eth_getLogs\` polling** | seconds (poll interval + RPC) | manual — you re-fetch and reconcile yourself | none, but you pay it in latency + load |
| **Direct MDBX read** | µs | none — MDBX shows committed state, not chain history | tight, but no reorg signal at all |
| **ExEx** | µs (in-process channel) | **typed reorg events delivered to you** | Cargo dependency on Reth crates |

ExEx is the only one of the three that gives you both **correctness** (reorg events) and **latency** (in-process). The cost is that your indexer ships **as part of the Reth binary** — your code lives in the same process. For a single-purpose indexer, that's a feature: one binary, one datastore, no glue.

## Cargo.toml

\`\`\`toml
[package]
name = "transfer-indexer"
version = "0.1.0"
edition = "2021"

[dependencies]
# Reth crates — pin to a specific tag in production
reth                = { git = "https://github.com/paradigmxyz/reth", tag = "v1.5.0" }
reth-exex           = { git = "https://github.com/paradigmxyz/reth", tag = "v1.5.0" }
reth-node-ethereum  = { git = "https://github.com/paradigmxyz/reth", tag = "v1.5.0" }
reth-tracing        = { git = "https://github.com/paradigmxyz/reth", tag = "v1.5.0" }
reth-primitives     = { git = "https://github.com/paradigmxyz/reth", tag = "v1.5.0" }

# Alloy for event decoding
alloy-primitives    = "1.5"
alloy-sol-types     = "1.5"

# Postgres
sqlx                = { version = "0.8", features = ["runtime-tokio", "postgres", "macros", "migrate"] }

# Plumbing
futures-util        = "0.3"
tokio               = { version = "1", features = ["macros", "rt-multi-thread"] }
eyre                = "0.6"
\`\`\`

> Reth doesn't publish its ExEx crates to crates.io as a stable cadence — pulling from a Git tag is the canonical pattern. Pin a specific tag (here \`v1.5.0\`) and bump it deliberately when you're ready to test against a new Reth.

## Step 1: The ExEx skeleton

The shape of every ExEx is the same. Read it and you've read 80% of every ExEx that will ever exist:

\`\`\`rust
use futures_util::TryStreamExt;
use reth::{api::FullNodeComponents, builder::NodeTypes, primitives::EthPrimitives};
use reth_exex::{ExExContext, ExExEvent, ExExNotification};
use reth_node_ethereum::EthereumNode;
use reth_tracing::tracing::info;

async fn indexer<Node>(mut ctx: ExExContext<Node>, db: sqlx::PgPool) -> eyre::Result<()>
where
    Node: FullNodeComponents<Types: NodeTypes<Primitives = EthPrimitives>>,
{
    while let Some(notification) = ctx.notifications.try_next().await? {
        match &notification {
            ExExNotification::ChainCommitted { new } => {
                handle_commit(&db, new).await?;
            }
            ExExNotification::ChainReverted { old } => {
                handle_revert(&db, old).await?;
            }
            ExExNotification::ChainReorged { old, new } => {
                handle_revert(&db, old).await?;
                handle_commit(&db, new).await?;
            }
        }

        if let Some(committed) = notification.committed_chain() {
            ctx.events.send(ExExEvent::FinishedHeight(committed.tip().num_hash()))?;
        }
    }
    Ok(())
}

fn main() -> eyre::Result<()> {
    reth::cli::Cli::parse_args().run(async move |builder, _| {
        let db = sqlx::PgPool::connect(&std::env::var("DATABASE_URL")?).await?;
        sqlx::migrate!().run(&db).await?;

        let handle = builder
            .node(EthereumNode::default())
            .install_exex("transfer-indexer", async move |ctx| Ok(indexer(ctx, db.clone())))
            .launch_with_debug_capabilities()
            .await?;

        handle.wait_for_node_exit().await
    })
}
\`\`\`

Walk:

- **\`ctx.notifications\`** — a typed stream of \`ExExNotification\`. Three variants: \`ChainCommitted\` (new blocks added), \`ChainReverted\` (blocks removed because the local chain forked behind us), \`ChainReorged\` (one chain swapped out for another). **Reorgs are first-class.** You don't poll, you don't infer — Reth tells you.
- **\`ctx.events.send(FinishedHeight(...))\`** — you tell Reth "I've written everything up to block N to my datastore." Reth uses this to know how far back it can prune state without breaking your pipeline. **Skip it and Reth retains state forever** to be safe; emit it and disk usage stays bounded.
- **\`install_exex\`** in \`main\` — registers your ExEx by name. The builder takes care of the channel wiring and process integration.

> 🔍 **Find in repo.** Open [\`reth-exex-examples\`](https://github.com/paradigmxyz/reth-exex-examples) and pick any project. Find the \`install_exex\` call. Compare its \`indexer\` (or whatever it's named) function to the one above — **they all have this exact shape.** That's the pattern. Once you see it, you can read every ExEx in the wild.

## Step 2: Decode Transfer events from receipts

Now we fill in \`handle_commit\`. We walk every block in the committed chain, every transaction in those blocks, every log in those transactions' receipts, and decode the ERC-20 Transfer event:

\`\`\`rust
use alloy_primitives::{Address, B256, U256};
use alloy_sol_types::{sol, SolEvent};
use reth::providers::Chain;

sol! {
    event Transfer(address indexed from, address indexed to, uint256 value);
}

#[derive(Debug)]
struct TransferRow {
    block_number: u64,
    tx_hash: B256,
    log_index: u32,
    token: Address,
    from_addr: Address,
    to_addr: Address,
    value: U256,
}

fn extract_transfers(chain: &Chain) -> Vec<TransferRow> {
    let mut rows = Vec::new();

    for (block, receipts) in chain.blocks_and_receipts() {
        let block_number = block.number;

        for (tx, receipt) in block.body.transactions.iter().zip(receipts.iter()) {
            let tx_hash = tx.hash();

            for (log_index, log) in receipt.logs.iter().enumerate() {
                // Topic[0] is the event signature; abi_decode_log validates it
                let Ok(decoded) = Transfer::decode_log(log, true) else { continue };

                rows.push(TransferRow {
                    block_number,
                    tx_hash,
                    log_index: log_index as u32,
                    token: log.address,
                    from_addr: decoded.from,
                    to_addr: decoded.to,
                    value: decoded.value,
                });
            }
        }
    }
    rows
}
\`\`\`

Walk:

- **\`chain.blocks_and_receipts()\`** — the Chain type pairs blocks with their receipts already aligned. **This is what running in-process buys you.** A polling indexer has to reconstruct this alignment from two separate RPC calls and reconcile race conditions.
- **\`Transfer::decode_log\`** — the \`sol!\` macro generates this. The \`true\` validates that \`topic[0]\` matches the Transfer signature; non-Transfer logs return \`Err\` cleanly and we skip.
- **We don't filter by token here.** Every ERC-20 emits this exact event. The indexer captures all of them and lets the consumer query whichever token they care about. (Filtering by \`token\` address would be a one-line WHERE clause downstream.)

> 🛑 **Predict.** A token contract emits a malformed Transfer event (wrong number of topics, weird ABI). Walk through what \`decode_log\` does. **Why is silently skipping (\`Err → continue\`) the right choice for an indexer?** Hint: think about what the alternative — panicking — would do to your pipeline.

## Step 3: Postgres schema and insert

Schema (in \`migrations/0001_init.sql\`):

\`\`\`sql
CREATE TABLE IF NOT EXISTS transfers (
    block_number   BIGINT       NOT NULL,
    tx_hash        BYTEA        NOT NULL,
    log_index      INTEGER      NOT NULL,
    token          BYTEA        NOT NULL,
    from_addr      BYTEA        NOT NULL,
    to_addr        BYTEA        NOT NULL,
    value          NUMERIC(78)  NOT NULL,  -- big enough for U256
    PRIMARY KEY (tx_hash, log_index)
);

CREATE INDEX transfers_block_number_idx ON transfers (block_number);
CREATE INDEX transfers_token_idx        ON transfers (token);
CREATE INDEX transfers_from_addr_idx    ON transfers (from_addr);
CREATE INDEX transfers_to_addr_idx      ON transfers (to_addr);
\`\`\`

Insert (one row per Transfer):

\`\`\`rust
async fn handle_commit(db: &sqlx::PgPool, chain: &Chain) -> eyre::Result<()> {
    let rows = extract_transfers(chain);
    if rows.is_empty() { return Ok(()); }

    let mut tx = db.begin().await?;
    for r in &rows {
        sqlx::query!(
            "INSERT INTO transfers (block_number, tx_hash, log_index, token, from_addr, to_addr, value)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (tx_hash, log_index) DO NOTHING",
            r.block_number as i64,
            r.tx_hash.as_slice(),
            r.log_index as i32,
            r.token.as_slice(),
            r.from_addr.as_slice(),
            r.to_addr.as_slice(),
            r.value.to_string().parse::<sqlx::types::BigDecimal>()?,
        )
        .execute(&mut *tx)
        .await?;
    }
    tx.commit().await?;
    Ok(())
}
\`\`\`

Walk:

- **\`(tx_hash, log_index)\` as primary key** — the canonical Ethereum log identifier. Survives reorgs cleanly: a re-included tx keeps the same hash, so the \`ON CONFLICT DO NOTHING\` no-ops correctly.
- **One transaction per chain commit, not per row.** Reth typically delivers chains of 1–8 blocks per notification; batching the writes into one Postgres transaction is the difference between 50ms and 5s for a busy committer.
- **\`NUMERIC(78)\`** — U256 max is 2²⁵⁶ ≈ 1.16 × 10⁷⁷, which fits in 78 decimal digits. \`BigDecimal\` is the sqlx Rust mapping.

## Step 4: Reorg handling

The whole point of ExEx for indexing. When the canonical chain changes underneath us, we need to undo what we wrote for the now-orphaned blocks:

\`\`\`rust
async fn handle_revert(db: &sqlx::PgPool, chain: &Chain) -> eyre::Result<()> {
    let range = chain.range();
    let from = *range.start() as i64;
    let to   = *range.end() as i64;

    sqlx::query!(
        "DELETE FROM transfers WHERE block_number BETWEEN $1 AND $2",
        from,
        to,
    )
    .execute(db)
    .await?;

    Ok(())
}
\`\`\`

That's it. Three lines for the part everyone gets wrong on their first try. Why so simple?

- **Idempotent schema.** Because \`(tx_hash, log_index)\` is the primary key, the same row can't exist twice. Deleting by block range removes exactly the rows we wrote on commit.
- **Reth tells us the exact range.** No "did the reorg start at block N or N-1?" guessing. The reverted Chain's range *is* the answer.
- **\`ChainReorged\` is just revert + commit.** We handle it as such in the dispatch in Step 1. **One pattern, three notification types.**

> 🔍 **Find in repo.** Open [\`Chain\` in reth-execution-types\`](https://github.com/paradigmxyz/reth/blob/main/crates/evm/execution-types/src/chain.rs). Find the \`range()\` method. Note that it returns a \`RangeInclusive<BlockNumber>\` — both endpoints are valid blocks. Use \`*range.start()\` and \`*range.end()\` to extract them; using \`.first()\` from an iterator is wrong (iterates the whole range materializing nothing useful).

## Step 5: FinishedHeight — let Reth prune

We already wrote this line in Step 1:

\`\`\`rust
ctx.events.send(ExExEvent::FinishedHeight(committed.tip().num_hash()))?;
\`\`\`

But it's worth pausing on. The signal you send tells Reth: *"I've durably written everything up to this block. You can prune state and history before it without breaking me."* Without this:

- Reth has to assume your ExEx might still need to read state from any historical block
- Disk usage grows linearly forever
- A node that runs your ExEx for 6 months has 6× the storage of a vanilla node

With it:

- Reth's pruner advances as fast as your slowest ExEx
- Disk usage stays bounded by Reth's normal pruning policy
- Multiple ExExes coexist; Reth tracks the lowest \`FinishedHeight\` across all of them

> 🛑 **Anti-fluency check.** Without scrolling: in your own words, why would Reth refuse to prune blocks ahead of your slowest ExEx's \`FinishedHeight\`? Hint: think about what would happen on a node restart if Reth had pruned a block your ExEx hadn't yet processed. (Spoiler: your indexer skips that block forever, your data is wrong, and you don't notice until someone queries.)

## What's missing for production

| Gap | What real indexers do |
| :--- | :--- |
| **Backpressure** | If Postgres is slow, your ExEx stalls and Reth's notification channel backs up. Production wraps the writer in a bounded queue + drops to disk-buffer when full. |
| **Schema migrations** | Use sqlx migrations (we did, minimally). Production runs them on startup with a lock to prevent racing replicas. |
| **Replicas / sharding** | One ExEx writes to one Postgres. Read replicas, partitioning by \`block_number\`, archive-vs-hot tiers — all the standard DBA work. |
| **Decoding more events** | We only decode \`Transfer\`. Add \`Approval\`, \`Swap\`, \`Sync\`, custom protocol events. The pattern (one \`sol! { event ... }\` block per event, one \`decode_log\` per filter) scales. |
| **Per-token enrichment** | Joining Transfer rows to token metadata (name, symbol, decimals) at write time vs. query time. Trade-off: write-time costs RPC, query-time costs JOIN. |
| **Liveness monitoring** | Compare your indexer's \`FinishedHeight\` to Reth's tip every minute. Page when the gap exceeds a threshold. |

The architecture you wrote — ExEx loop, dispatch on notification type, Postgres write, FinishedHeight signal — is **what every production indexer above this layer does**. They add features and operations; the spine is identical.

## Drill

1. **Add Approval.** ERC-20 \`Approval(address,address,uint256)\` has the same shape as Transfer. Add a second \`sol!\` event, second \`extract_*\` helper, second table. Note how nothing about the ExEx loop changes. (15 min)
2. **Filter to a single token.** Add \`if log.address != USDC { continue; }\`. Run for a minute on a synced node — what's your row count vs. without the filter? **Why does filtering help so much?** (20 min)
3. **Latency probe.** Wrap each \`handle_commit\` in \`Instant::now()\` and log: *received chain → wrote N rows → emitted FinishedHeight*. What's the budget? Where's the bite? (30 min)
4. **Reorg test.** Use Reth in Hoodi or Holesky testnet mode (where reorgs happen more often than mainnet). Run for an hour. Check the database for the \`ChainReorged\` path firing — by querying for blocks where \`max(block_number) > committed_chain_max\` historically. (1 hour)
5. **Add backpressure.** Wrap the Postgres pool in a bounded \`mpsc::channel\` with a separate writer task. Drop or buffer-to-disk on overflow rather than blocking the ExEx. **What changes about Reth's behavior when your indexer stops emitting FinishedHeight?** (3 hours)

Finish drill 5 and you have an indexer that survives Postgres outages without taking down Reth. Add a query API and you have something resembling Etherscan's data layer in a ~500-line single binary.

> 🛑 **Final check.** In one sentence: why is \`FinishedHeight\` the most important line in this lesson, even though it's just one method call? If your answer doesn't connect "Reth's pruning" to "your indexer's correctness on restart", re-read Step 5 — that interplay is what makes ExEx production-grade.

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

Reth ships with the standard JSON-RPC namespaces (\`eth_*\`, \`net_*\`, \`web3_*\`, \`debug_*\`, \`trace_*\`, \`txpool_*\`). When you want something *not* in that list — a domain-specific aggregation, a custom debug helper, a real-time subscription tailored to your protocol — you don't fork Reth. You add a trait, implement it, hand it to the node builder. ~50 lines of Rust and your method is live on the same HTTP / WebSocket / IPC endpoints as the natives.

> 📌 **Scope honesty.** We add one read-only method (\`txpoolPlus_pendingByGasBucket\`) that aggregates the local mempool into 10 gas-price buckets. We don't cover authentication, rate-limiting, or write methods — those are the same patterns layered on top. The architecture lesson is "how does the trait get wired in?"

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
| **Versioning** | Bump the namespace (\`txpoolPlus_v2_*\`) when the response shape changes; old clients should keep working. |
| **Metrics** | Reth's RPC layer exposes per-method latency / count via the metrics endpoint, but only for natives. Add your own \`metrics::counter!(...)\` calls inside your handler. |
| **Argument validation** | \`RpcResult\` lets you return \`ErrorObjectOwned::owned(code, message, data)\` cleanly. Pick stable codes; don't reuse standard JSON-RPC error codes (-32603 is "internal error", reserved). |

The architecture you wrote — define trait, impl with component access, register via \`extend_rpc_modules\` — **is what every custom Reth RPC in production looks like**. The 50-line skeleton is the same; the impl body is where each project's value lives.

## Drill

1. **Add \`pendingByNonce(address)\`.** A second method that returns the count of currently-pending txs from a given address grouped by nonce. Pattern: same trait, second \`#[method]\`, second handler. (15 min)
2. **Bucket by gas price (post-EIP-1559).** Replace priority-fee bucketing with effective-gas-price bucketing (\`base_fee + priority_fee\`, capped at \`max_fee_per_gas\`). Need to fetch base fee from the provider. **What does \`ctx\` expose to get it?** (30 min)
3. **Auth-gate the method.** Make \`txpoolPlus_pendingByGasBucket\` reject calls that don't present the engine \`AUTH_SECRET\`. (Hint: look at how Reth's debug methods do this.) (45 min)
4. **Snapshot freshness.** Add a per-snapshot timestamp + monotonic block height to the response. \`ctx.provider().best_block_number()\` is the second source of truth. (30 min)
5. **Cross-tier integration.** The MEV searcher in lesson 1 of this tier could query \`txpoolPlus_pendingByGasBucket\` to set its own bid above the 90th percentile. Add a Rust client that does exactly that, using \`jsonrpsee::http_client\`. (2 hours)

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

Wallet UIs are the famous part. The boring part — the **send service** behind them — is what teams actually wrestle with: keep nonces straight when sending 50 txs in a row, don't strand a tx in the mempool when gas spikes, replace it with a higher fee, watch for inclusion, retry intelligently. This lesson walks the complete code of a minimal send service in ~250 lines that does all of that.

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

EIP-7702 (live on mainnet since Pectra, March 2025) is the cheap path to smart-account features for EOAs: a user signs an *authorization* that says "for this transaction, treat my EOA as if it had this contract's code." A sponsor — your service — pays the gas. The user gets atomic batched calls, custom validation, session keys, all without migrating to a new account. This lesson builds the sponsor in ~200 lines.

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
- **The watcher pattern from the wallet-backend lesson applies here too.** A 30-second deadline + bumped fee on stuck txs would make this production-grade. We omit it for clarity; copy/paste the watcher from lesson 4 if you want it.

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
| **Watcher** | Lesson 4's replace-on-stuck logic. EIP-7702 txs go through the same mempool; the bumping pattern is identical. |
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
5. **Replace-on-stuck.** Lift the watcher from lesson 4 and integrate it. (30 min — mostly copy/paste once you understand the pattern.)

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

Foundry's \`vm.deal()\`, \`vm.warp()\`, \`vm.expectRevert()\` — those aren't built-in EVM ops. They're **Rust precompiles** Foundry installs at address \`0x7109709E...\`, callable from Solidity test code via the \`Vm.sol\` interface. This lesson shows you how that machinery works by **building your own**: a custom \`cheats.measureGas(target, data)\` precompile that gives test authors a clean way to measure sub-call gas without manual wrapping.

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

- **\`Context::mainnet().with_db(&mut db).build_mainnet()\`** — same builder you used in Lesson 1 (MEV searcher). The cheatcode is a tiny EVM-on-EVM. **Once you've run one Revm, you've run them all.**
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

1inch, Paraswap, 0x — they all answer one question for the user: *"given X token A, what's the most token B I can get right now?"* Behind that question is a fan-out across every liquidity venue, a quote at the live state of each, and a routing decision. This lesson builds a minimal aggregator in ~250 lines: fork mainnet locally, read reserves from Uniswap V2 + Sushi + Uniswap V3, compute quotes, pick the winner.

> 📌 **Scope honesty.** We compute quotes across **three V2-style pools and one V3 pool** for a single hop. Real aggregators add: split routing (send 30% through Uniswap, 70% through Curve), multi-hop (A → WETH → B), CFMMs with custom math (Curve's stableswap, Balancer's weighted pools), gas-aware routing. Each is a one-loop extension of the kernel here.

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
        .connect(&std::env::var("ETH_RPC_URL")?)
        .await?
        .erased();
    let alloy_db = WrapDatabaseAsync::new(AlloyDB::new(provider, BlockId::latest()))
        .ok_or_else(|| eyre::eyre!("AlloyDB init failed"))?;
    Ok(CacheDB::new(alloy_db))
}
\`\`\`

Identical to Lesson 1 (MEV searcher) — and that's the point. **The same fork pattern shows up everywhere; if you can build one, you can build them all.**

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

- **The same EVM call we made in Lesson 5's \`read_reserves\`** — generalized into a \`call_view\` helper that works for any \`SolCall\`. **Re-use accumulates** as you build.
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
| **MEV protection** | Submit through Flashbots Protect / MEV-Share so frontrunners don't see the route ahead of time. (Lesson 8 — Capstone — does this.) |

The architecture you wrote — fork once, read reserves atomically, compute quotes per venue, pick the winner — **is exactly how 1inch and Paraswap shape their internal pricing layer**. They add scale, more venues, better routing optimization. The kernel is identical.

## Drill

1. **Add Curve.** Pick a Curve pool (e.g., 3pool). Read its state, implement its quote (stableswap) using \`get_dy(int128 i, int128 j, uint256 dx)\` via the same \`call_view\` pattern. (1.5 hours)
2. **Add gas accounting.** Subtract estimated gas cost from each quote (use \`evm.estimate_gas\` on a hypothetical swap). The "best" route should now be the one that maximizes \`amount_out − gas_cost_in_out_token\`. (2 hours)
3. **Multi-hop search.** Build a 2-hop search: A → WETH → B. For each candidate via WETH, compute the chained quote and compare to the direct route. (3 hours)
4. **Split routing.** Implement a 50/50 split between the top two venues; check whether the combined output beats either alone. (2 hours)
5. **Cross-tier:** Wire the aggregator into the wallet backend (Lesson 4) as a \`POST /quote-and-swap\` that returns a signed tx ready for submission. (3 hours)

Finish drill 5 and you have, structurally, an aggregator-as-a-service. Plug in MEV protection (Lesson 8) and you're at parity with what shipped in 2023.

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

This is the build that ties **everything in this tier** together. A router that takes a user's swap intent, checks the mempool for adversarial txs that could frontrun it, picks the best venue using the aggregator, sponsors gas via EIP-7702, and submits through a private orderflow channel so the route itself never appears in public mempool. The user posts JSON; the router does the seven things real production routing services do.

> 📌 **Scope honesty.** This capstone integrates patterns from lessons 1–7 of this tier. The novel build is the **frontrun-detection logic** + the **submission path that bypasses public mempool**. We use Flashbots Protect as the private RPC; the same shape works with MEV-Share, Beaverbuild's private endpoint, or any other private orderflow auction.

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
| **Quote across DEXes** | L7 | Reused as-is |
| **Mempool watching** | L1 (the searcher's input!) | Repurposed as defense — find candidate adversaries instead of opportunities |
| **Revm fork simulation** | L1 | Used here to score "would this adversary tx hurt my user?" |
| **EIP-7702 sponsorship** | L5 | Lifted into the path so the user pays no gas |
| **Wallet backend submission + replace** | L4 | Used for the public-mempool path |
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

> 🛑 **Final check (the curriculum's final check).** In one sentence: of the 8 lessons in this tier, why does the *capstone* depend on **simulation** (L1) more than any other component? If your answer doesn't mention "you can't decide whether to defend without first measuring the threat in the same units as the user's loss", the capstone hasn't quite landed yet — re-read Step 4.


---

## You've finished the Building tier

Recap of what you've built across 8 lessons:

1. Minimal MEV searcher (mempool → fork-sim → arb)
2. Reorg-aware Postgres indexer (ExEx + reorg dispatch)
3. Custom RPC endpoint (jsonrpsee + extend_rpc_modules)
4. Wallet backend (signer pool + nonce mgr + replace-on-stuck)
5. EIP-7702 sponsor (Type 4 tx + paymaster pattern)
6. Foundry-style cheatcode (custom precompile + harness)
7. Swap aggregator (Revm fork + cross-venue quotes)
8. **Frontrun-resistant order router (this lesson)** — all of the above, integrated

Pick the one that interests your target employer / project most. Open the production gaps. Ship it as a small public repo. **That's the artifact you bring to a Paradigm / Tempo / serious-team conversation.**
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
