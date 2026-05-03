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

This lesson is the first in **Building with the Stack**. Planned follow-ups (free, source-first, same active-learning style):

- **Build a Reorg-Aware Indexer with ExEx** — the same kind of thing that powers etherscan.io, but in 300 lines and running in-process with Reth
- **Build a Custom RPC Endpoint on Reth** — \`eth_myThing\` shipped as a Rust extension
- **Build a Wallet Backend in Rust** — Alloy signer + nonce/gas management, the part wallet teams actually wrestle with
- **Build a Minimal EIP-7702 Bundler** — the Pectra-era equivalent of an EIP-4337 bundler, simpler than you'd expect

Subscribe to the [GitHub repo](https://github.com/psyto/rethlab) for new lessons.
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
