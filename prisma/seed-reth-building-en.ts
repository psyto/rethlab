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

## 📺 Further watching

\`\`\`youtube
GhEhzE9SFqY | Alexey Shekhirin — Using Reth Execution Extensions for next generation indexing (Devcon 2024) — different extension point (ExEx), same node-extension philosophy
\`\`\`
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
              ],
            },
          },
        ],
      },
    },
  });

  console.log('  Building (EN) seeded');
}
