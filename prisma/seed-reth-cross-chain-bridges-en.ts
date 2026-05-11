import { PrismaClient } from '@prisma/client';

export async function seedRethCrossChainBridgesEN(prisma: PrismaClient) {
  const tags = ['reth', 'bridges', 'ccip', 'optimism', 'wormhole', 'ibc', 'light-client', 'l1', 'expert'];

  await prisma.course.create({
    data: {
      slug: 'reth-cross-chain-bridges-en',
      title: 'Cross-Chain Bridges — From CCIP to Light Clients',
      description:
        'The honest accounting of how value moves between chains: trust models from "trust this multisig" to "trust nothing but the source chain\'s consensus," attack history ($2B+ stolen), reading production bridge code (OP Standard Bridge, Chainlink CCIP, Wormhole, IBC), and building a minimal light-client-verified bridge on Reth. The course that prepares you to architect Tempo↔Solana settlement, OP-stack bridges, and ZK light clients.',
      difficulty: 'ADVANCED',
      duration: 150,
      xpReward: 450,
      track: 'reth-l1-architect',
      tags,
      isPublished: true,
      sortOrder: 310,
      locale: 'en',
      instructorName: 'RethLab',
      modules: {
        create: [
          {
            title: 'Bridge Fundamentals',
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: 'What is a bridge? Trust models and the bridge trilemma',
                  slug: 'bridges-trust-models-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 16,
                  xpReward: 40,
                  content: `# What is a bridge? Trust models and the bridge trilemma

A **bridge** is a system that lets a state change on chain A trigger a state change on chain B. The whole field of cross-chain infrastructure is figuring out **how much you have to trust** to make this work, and **what attacks remain** when you minimize that trust.

> 🛑 **Predict before scrolling.** Three bridges have been hacked for $300M+ each in the last three years (Ronin, Wormhole, Nomad). **What's the common attack pattern?** (Hint: not smart contract bugs.)

## 1. The bridge primitive — value vs. message

Two kinds of "bridges":

| Kind | What moves | Example |
| :--- | :--- | :--- |
| **Asset bridge** | Token balance (canonical or wrapped) | USDC across chains |
| **Message bridge** | Arbitrary calldata | LayerZero, CCIP arbitrary messages |

The asset case is a special case of messaging: an asset bridge is a message bridge plus a token contract on each side. **All cross-chain infrastructure is fundamentally a message bridge** with conventions on top.

For Tempo↔Solana settlement (mppsol): message bridge. The "asset" is a payment receipt, not a token.
For OP↔Ethereum: message bridge with native token convention (ETH deposit/withdrawal).
For BTC↔EVM (wrapped BTC): asset bridge.

## 2. The trust spectrum

Bridges fall on a spectrum of **what you have to trust:**

\`\`\`
External trust (worst)                                  Internal trust (best)
  ↓                                                              ↓
[Multisig] → [Optimistic with challenges] → [PoS bridge] → [Light client] → [ZK light client]
\`\`\`

| Trust model | Who/what you trust | Example | Cost |
| :--- | :--- | :--- | :--- |
| **Multisig** | A committee of M-of-N signers | Wormhole (19 guardians) | Cheap to verify, expensive trust |
| **Optimistic** | Challenge period (~7 days) | Nomad, Across | Fast claim, long finality |
| **PoS bridge** | Validators on a separate chain | LayerZero (DVN model) | Variable |
| **Light client** | The source chain's consensus + your reading of its headers | Helios, native rollup bridges | Cheap to trust, expensive to verify |
| **ZK light client** | Math (zk proof of source consensus) | Sui-bridge (in development), Espresso | Cheap to trust, expensive to prove |

The best bridge from a trust standpoint is **a ZK light client of the source chain on the destination chain**. The worst is **a multisig** — you're trusting humans not to collude.

> 🛑 **Anti-fluency.** A 13-of-19 multisig bridge feels "decentralized" because 19 is many. **Why is it actually fragile?** What concrete attack works against multisigs that doesn't work against light clients?

Multisig keys can be **stolen** (Ronin: $625M, attacker got 5 of 9 keys via spear-phishing). The signers themselves can **collude** (no enforcement). The signing infrastructure can be **compromised** (Wormhole: bug in signature verification, not key theft, but proves how brittle multisig infra is).

A light client doesn't have these failure modes — it verifies headers against the **source chain's consensus rules**. The only way to fool it is to fool the source chain itself.

## 3. The bridge trilemma

You cannot have all three of:

- **Trustlessness** — no external trust assumptions
- **Generality** — supports arbitrary chains
- **Extensibility** — easy to add new chains

**Trustless + general** → expensive to add chains (each pair needs a light client implementation). This is the IBC/Cosmos model.
**Trustless + extensible** → only works for similar chains. This is the OP Stack approach (L2s sharing one bridge interface).
**General + extensible** → not trustless. This is Wormhole/LayerZero — they support many chains and add new ones easily, but trust a multisig or DVN set.

For Tempo (a Paradigm L1) bridging to Ethereum: trustless + bespoke = light client of Tempo on Ethereum, and vice versa. Eventually ZK light client.

For Tempo bridging to Solana: trustless is currently impossible (cross-VM, different consensus, different cryptography). You need a **multisig** or **PoS** model. **Chainlink CCIP** is the production answer here.

## 4. The bridge attack hall of fame

Real attacks, sorted by amount stolen, with the root cause:

| Year | Bridge | Stolen | Root cause |
| :--- | :--- | :--- | :--- |
| 2022 | Ronin | $625M | Multisig key compromise (5 of 9 keys phished) |
| 2022 | Wormhole | $325M | Signature verification bug in guardian set logic |
| 2022 | Nomad | $190M | Initialization bug + replay attacks |
| 2021 | Poly Network | $611M (returned) | Storage layout assumption bug |
| 2024 | Orbit | $80M | Multisig key compromise |

**3 of 5 are key/signing compromises**. Not smart contract logic — operational security failures.

The takeaway: **multisig bridges are operationally dangerous**, not just theoretically suboptimal. Even with audited code, the keys themselves are the attack surface.

> 🛑 **Predict.** You're designing a $1B+ TVL bridge today. **Which trust model do you pick, and what's your fallback?** Think about: speed of integration, cost, attack surface, time horizon.

## 5. What this means for your projects

### Tempo↔Ethereum (Telos, Soltempo)

- Today: **Chainlink CCIP** — best production option, multi-network DON
- 2-3 years: **Light client** of Tempo on Ethereum (and vice versa)
- 5+ years: **ZK light client** if proving costs come down

### Tempo↔Solana (mppsol)

- Today: **CCIP** (since it now supports Solana 2026)
- Future: **ZK light client** — hardest because EVM↔non-EVM with different cryptography
- Workaround: settle through Ethereum as intermediate (longer, but light-client verifiable both legs)

### Hyperliquid↔Ethereum

- Today: **Hyperliquid bridge** (custom multisig)
- Hyperliquid's own roadmap is unclear on trust model improvements; they prioritize speed

## 6. The verification cost tradeoff

For each trust model, the cost split between **prover** (whoever writes the bridge claim) and **verifier** (whoever checks it):

| Model | Prover cost | Verifier cost | When this wins |
| :--- | :--- | :--- | :--- |
| Multisig | Cheap (sign hash) | Cheap (verify signatures) | Speed of integration |
| Light client | Cheap (just relay headers) | Expensive (verify consensus) | High-value, low-frequency |
| ZK light client | Expensive (prove consensus) | Cheap (verify proof) | High-value, high-frequency |

For payment-rail bridges (Tempo): frequency is high (every merchant settlement). **ZK light client** is the right asymptote — high prover cost amortized over many verifications.

> 🛑 **Anti-fluency.** A ZK light client costs $10/proof. Each proof unlocks 1000 messages worth $50K each. **Is the bridge "expensive"?** Show the math. Why is the right cost metric always "$/value-secured" not "$/proof"?

## 7. Reading list

- [a16z bridge taxonomy](https://www.coindesk.com/tech/2023/07/13/the-best-blockchain-bridges-defined-by-trust-models/) — the trust model framework
- [Chainlink CCIP whitepaper](https://chain.link/whitepaper) — DON-based bridge design
- [Helios](https://github.com/a16z/helios) — Rust Ethereum light client (you'll read this next lesson)

## 8. Practice

For each chain pair, identify the realistic trust model today:

1. Ethereum mainnet ↔ Optimism (canonical bridge)
2. Ethereum mainnet ↔ Polygon PoS
3. Solana ↔ Wormhole assets on Ethereum
4. Tempo ↔ Ethereum (per public info)
5. Bitcoin ↔ any EVM chain

> Final check: in one sentence, why is "trust model" the dimension to optimize when designing a bridge — even more than speed or cost? **If your answer doesn't reference attack history or the bridge trilemma, re-read §3 and §4.**`,
                },
                {
                  title: 'Light clients — the gold standard verification primitive',
                  slug: 'bridges-light-clients-en',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 16,
                  xpReward: 40,
                  content: `# Light clients — the gold standard verification primitive

A **light client** is a program that verifies a chain's state without running a full node. It downloads only headers, follows the consensus rules, and trusts only what the consensus protocol itself guarantees. For cross-chain bridges, light clients are **the gold standard of trust minimization** — and Rust is the language of choice for production light clients.

> 🛑 **Predict before scrolling.** An Ethereum full node stores ~1TB of state. A light client stores ~MB. **What can a light client NOT do?** Three things — name them before scrolling. (Hint: think about what state requires.)

## 1. What a light client is — and isn't

A light client **can**:
- Verify block headers chain back to genesis
- Verify a state inclusion proof (Merkle proof against state root)
- Verify a transaction was included (Merkle proof against tx root)
- Follow consensus (track current finalized state)

A light client **cannot**:
- Look up arbitrary state without a proof (no full state)
- Execute arbitrary transactions (no full state to execute against)
- Generate state proofs (only verify them)

So a light client is **a verifier of claims about chain state**, not a producer. Bridges use light clients to **verify claims** that "transaction X happened on chain Y" — the relayer produces the claim + proof, the light client verifies.

## 2. The Ethereum light client protocol

Ethereum's PoS made light clients much cheaper than they were in PoW days. The protocol (in [\`ethereum/consensus-specs\`](https://github.com/ethereum/consensus-specs)):

- Every **sync committee period** (~27 hours), 512 validators are randomly selected as the sync committee
- The sync committee signs every block header for that period
- Light client downloads just the sync committee + their signatures
- Light client verifies signatures against the committee's BLS aggregated public key

So to follow Ethereum, a light client needs:
- **Initial trusted checkpoint** (must be obtained out-of-band, e.g., from a trusted source)
- **Sync committee updates** every period (verifies committee rotation)
- **Header updates** during a period (verified by current committee signatures)

That's it. ~MB per period, vs TB for full state. **Verification cost is 512 BLS signature aggregation + check, ~ms.**

## 3. Reading Helios — Rust Ethereum light client

[\`a16z/helios\`](https://github.com/a16z/helios) is a16z's production-grade Rust light client for Ethereum. Used by wallets, indexers, bridges. ~10k lines of Rust.

The architecture:

\`\`\`mermaid
flowchart LR
    Trusted["Trusted checkpoint<br/>(slot, blockRoot)"] --> Sync["Sync to head"]
    Sync --> Update["Sync committee<br/>updates every period"]
    Update --> Header["Header updates<br/>via current committee"]
    Header --> Verify["Verify claims<br/>(execution payloads,<br/>state proofs)"]
    RPC["RPC server"] --> Verify
    Apps["Bridge / Indexer"] --> RPC
\`\`\`

Key files to read:

- \`consensus/src/consensus.rs\` — the consensus client (verifies sync committee + headers)
- \`execution/src/state.rs\` — verifies state inclusion proofs from execution layer
- \`rpc/src/lib.rs\` — RPC server (so apps can query verified state)

The whole thing runs in a browser via wasm. **That's the point** — a wallet can verify Ethereum without trusting Infura.

> 🔍 **Find in repo.** Open Helios's [\`consensus/src/consensus.rs\`](https://github.com/a16z/helios/blob/master/consensus/src/consensus.rs). Find where the sync committee signature is verified. **What BLS aggregation is happening?** Trace the verification flow.

## 4. Light clients on Reth-based chains

For your custom L1 (Tempo, Hyperliquid, etc.) to be a bridge destination, **someone needs to write a light client of your chain on the target chain**.

Two approaches:

### 4.1 Naive light client (BFT chain)

Your L1 uses BFT consensus (e.g., HotStuff). A light client of your chain needs to:
- Track validator set (and rotation events)
- Verify 2f+1 signed block headers
- Verify state inclusion proofs against state root

In a Solidity contract on Ethereum: ~5000 gas per header verification with BLS aggregate signature. ~$0.50 per header at 50 gwei.

This works! But you need a Solidity contract that knows your BFT rules.

### 4.2 ZK light client

Same flow, but the BFT verification happens **inside a zkVM proof** off-chain. The contract on Ethereum just verifies a ZK proof (constant cost, ~100k gas).

Production examples (in 2026):

- **Succinct's SP1** for Ethereum light client — proves sync committee verification
- **Espresso** — ZK light client for shared sequencer
- **Polyhedra** — ZK light client for various chains

ZK light clients are the **endgame** for bridges. Trust = math.

> 🛑 **Anti-fluency.** "ZK light clients are constant cost." **Sort of.** The verification cost on-chain is constant; the proof generation off-chain is expensive (~$1-10 per proof in 2026). Restate the cost model: when is ZK light client cheaper than naive light client?

When throughput is high. Naive: O(N) cost where N = headers. ZK: O(1) on-chain + O(N) off-chain. ZK wins when you're verifying many headers and on-chain gas is the binding constraint.

## 5. The light client integration with Reth

Two roles a Reth-based chain plays in light client integration:

### 5.1 Reth as the source chain

Your Reth-based L1 produces blocks. To be light-client-friendly:
- Your **header format** must include enough info to verify (state root, validator set commitment, BLS aggregate signature)
- Your **block production** must commit to validator set changes in the header
- Your **state tree** must be Merkle-Patricia (so you can produce state inclusion proofs)

Reth gives you all of this by default. You just need to ensure your consensus impl writes the right fields to headers.

### 5.2 Reth as the destination chain

Your Reth-based L1 receives messages from another chain. A bridge contract on your chain needs to verify the source chain's headers + proofs. This is where light client *contracts* live.

For Ethereum→Tempo: a Solidity contract on Tempo that runs Ethereum's sync committee verification. ~5000 gas per header.

Reth's EVM runs the same as mainnet, so any Solidity light client (Helios's contract, custom ones) works.

## 6. Practice

1. Browse [\`a16z/helios\`](https://github.com/a16z/helios) — clone if you have time
2. Identify the file containing BLS signature verification logic
3. Estimate: if your L1 has 30 validators (vs Ethereum's 512), how much cheaper is light client verification?
4. Sketch: what header fields does your custom L1's block need to expose for light clients?

## 7. Reading list

- [Helios source](https://github.com/a16z/helios) — production Rust light client
- [Ethereum light client spec](https://github.com/ethereum/consensus-specs/blob/dev/specs/altair/light-client/sync-protocol.md) — the formal protocol
- [SP1 light client](https://github.com/succinctlabs/sp1) — ZK light client implementation

> Final check: in one sentence, why is a light client of your L1 the **most trust-minimized** way for other chains to verify your state? **If your answer doesn't reference "trust only the source chain's consensus," re-read §1.**`,
                },
              ],
            },
          },
          {
            title: 'Reading Real Bridges',
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: 'OP Standard Bridge — the canonical L2 deposit/withdrawal pattern',
                  slug: 'bridges-op-standard-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 18,
                  xpReward: 45,
                  content: `# OP Standard Bridge — the canonical L2 deposit/withdrawal pattern

The OP Standard Bridge is the canonical "trustless L1↔L2 bridge" reference. Every OP Stack chain (Optimism, Base, Mode, etc.) uses it. It's the textbook example of how to **use the rollup's own consensus** as the bridge's security model — no separate multisig, no separate validators, just the chain itself.

> 🛑 **Predict before scrolling.** You deposit 1 ETH from Ethereum to Optimism. The same ETH appears on Optimism in ~2 minutes. You withdraw 1 ETH back. **How long until you can spend it on Ethereum?** And why?

## 1. The deposit flow

L1→L2 (deposit) is the easy direction:

\`\`\`mermaid
sequenceDiagram
    participant User
    participant L1Bridge as L1StandardBridge (Ethereum)
    participant Inbox as OptimismPortal (Ethereum)
    participant L2 as L2 chain
    participant L2Bridge as L2StandardBridge (Optimism)

    User->>L1Bridge: depositERC20(token, amount)
    L1Bridge->>Inbox: depositTransaction(...)
    Note over Inbox: Emit DepositInitiated event
    L2->>L2: Sequencer reads L1 events
    L2->>L2Bridge: finalizeBridgeERC20(user, token, amount)
    L2Bridge->>User: Mint wrapped token to user
\`\`\`

Key insight: **deposits are forced inclusions**. The L1 contract emits an event; the L2 sequencer **must** process it within a deadline (e.g., ~1 hour). If not, anyone can force the inclusion via the L2 inbox.

This means deposits are **trustless** — the rollup's own consensus rules enforce inclusion. No multisig.

## 2. The withdrawal flow

L2→L1 (withdrawal) is much harder:

\`\`\`mermaid
sequenceDiagram
    participant User
    participant L2Bridge as L2StandardBridge (Optimism)
    participant Output as L2OutputOracle (Ethereum)
    participant L1Bridge as L1StandardBridge (Ethereum)

    User->>L2Bridge: withdraw(token, amount)
    L2Bridge->>L2Bridge: Burn user's wrapped token
    Note over L2Bridge: Emit WithdrawalInitiated event
    L2->>Output: Submit state root (every ~1 hour)
    Note over Output: Wait 7-day challenge period
    User->>L1Bridge: proveWithdrawal(proof, output)
    L1Bridge->>L1Bridge: Verify Merkle proof of withdrawal
    L1Bridge->>L1Bridge: Wait challenge period
    User->>L1Bridge: finalizeWithdrawal()
    L1Bridge->>User: Transfer L1 tokens
\`\`\`

Three things make this slow:
1. State root submission: every ~1 hour (configurable)
2. Challenge period: 7 days (so fraud proofs can be submitted)
3. Two-phase finalization: prove + finalize (separate transactions)

**Total**: ~7 days from withdrawal initiation to L1 settlement.

> 🛑 **Anti-fluency.** "7 days is unacceptable for users." **Why is it necessary?** What attack does the challenge period prevent? If your answer doesn't reference "rollup's optimistic security model," re-read.

The challenge period exists so anyone can submit a **fraud proof** if the sequencer lies about the L2 state. Without it, the sequencer could submit fraudulent state roots and the L1 contract would trust them.

## 3. Reading the real contracts

The canonical OP bridge code lives in [\`ethereum-optimism/optimism\`](https://github.com/ethereum-optimism/optimism), \`packages/contracts-bedrock/\`. Key files:

| Contract | Role |
| :--- | :--- |
| \`L1StandardBridge.sol\` | L1 entry point for users (deposit) and exit point (withdraw) |
| \`L2StandardBridge.sol\` | L2 mirror — burn wrapped tokens on withdrawal |
| \`OptimismPortal.sol\` | The actual L1 inbox/outbox for cross-domain messages |
| \`L2OutputOracle.sol\` | Stores L2 state root commitments on L1 |
| \`L1CrossDomainMessenger.sol\` | Generic message passing (not just tokens) |

**The bridge is just the asset interface.** Underneath, there's a generic cross-domain messenger that handles any calldata.

> 🔍 **Find in repo.** Open [\`L1StandardBridge.sol\`](https://github.com/ethereum-optimism/optimism/blob/develop/packages/contracts-bedrock/src/L1/L1StandardBridge.sol). Trace what happens when \`depositERC20\` is called. **At what point is the L1 contract certain the deposit is on L2?**

It's certain when the **L1 transaction lands**. The L2 sequencer is forced (by protocol rules) to include the deposit. The trust assumption is: the rollup's consensus enforces sequencer behavior, and if the sequencer cheats, the rollup forks (fraud proof).

## 4. The fast withdrawal market

7-day withdrawal is unusable for many use cases. The market response: **third-party fast withdrawals.**

A liquidity provider:
1. Sees your withdrawal initiated on L2
2. Sends you L1 tokens immediately (minus a fee)
3. Waits 7 days
4. Claims your L1 withdrawal when the period expires

The LP is taking on **withdrawal risk** (in case L1 state proof fails) in exchange for fee income. Markets like Across, Hop, and Connext do this at scale.

This is **not** a bridge in the trust sense — it's a financial product layered on top of the trustless bridge. The trust split:
- Bridge itself: trustless (rollup consensus)
- Fast withdrawal LP: capital risk (no trust on user, just market efficiency)

## 5. The Standard Bridge vs Native Bridge

OP Stack has both:

- **Standard Bridge**: maps ERC20s — for arbitrary tokens
- **Native Bridge**: handles ETH (and OP token) directly

For tokens to be bridged via Standard Bridge, they need to be **registered** — both the L1 and L2 token addresses must be paired. Otherwise the bridge doesn't know what L2 representation to mint.

For Tempo, this matters: if Tempo has a stablecoin native to its chain, and you want it on Ethereum, you'd need a **Standard Bridge equivalent** with the Tempo-Ethereum token pair registered.

## 6. Tempo↔Ethereum via OP Standard Bridge?

Tempo is **not OP Stack** (it's a standalone L1). So OP Standard Bridge doesn't directly apply. But the **pattern** does:

For Tempo↔Ethereum, the equivalent would be:
- Tempo Standard Bridge (Solidity contracts on both sides)
- Light client of Ethereum on Tempo
- Light client of Tempo on Ethereum (the hard one)
- Withdrawal challenge period (longer if no light client yet)

Until ZK light clients ship, this is **CCIP territory** — which we cover next lesson.

## 7. Reading exercise

In \`ethereum-optimism/optimism/packages/contracts-bedrock\`:

1. \`L1StandardBridge.sol\` — read the deposit function in full
2. \`OptimismPortal.sol\` — find where L2 → L1 messages are received
3. \`L2OutputOracle.sol\` — find the function that submits state roots
4. **Calculate**: how many L1 transactions does a withdrawal require? Why?

Three answers: \`proveWithdrawalTransaction\` + wait + \`finalizeWithdrawalTransaction\`. Two L1 txs minimum.

## 8. The op-bridge ExEx pattern

From your Building tier (L2 — Reorg-Aware Indexer), the [op-bridge ExEx example](https://github.com/paradigmxyz/reth-exex-examples/tree/main/op-bridge) is a real-world indexer that watches L1StandardBridge events:

\`\`\`rust
sol!(L1StandardBridge, "l1_standard_bridge_abi.json");
use crate::L1StandardBridge::{
    ETHBridgeFinalized, ETHBridgeInitiated, L1StandardBridgeEvents,
};
\`\`\`

This is **how indexers (and bridges) consume cross-chain events**. The ExEx watches every block, decodes bridge events, and stores them in its own database. A bridge contract on the other side can query this index.

The same pattern works for Tempo: an ExEx on Tempo that watches CCIP bridge events would feed the merchant treasury system.

## 9. Reading list

- [Optimism docs](https://docs.optimism.io/builders/dapp-developers/bridging/messaging) — the developer's view
- [OP Stack contracts-bedrock](https://github.com/ethereum-optimism/optimism/tree/develop/packages/contracts-bedrock) — the real code
- [Across whitepaper](https://docs.across.to/) — fast withdrawal market design

> Final check: in one sentence, why is the OP Standard Bridge "trustless" but requires a 7-day withdrawal delay? **If your answer doesn't reference "optimistic security + fraud proofs," re-read §2.**`,
                },
                {
                  title: 'Chainlink CCIP — the cross-chain rail Tempo uses',
                  slug: 'bridges-ccip-en',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 18,
                  xpReward: 45,
                  content: `# Chainlink CCIP — the cross-chain rail Tempo uses

Chainlink CCIP (Cross-Chain Interoperability Protocol) is the production bridge for **arbitrary chain pairs**. Tempo uses CCIP for Ethereum↔Tempo↔Solana settlement. Hyperliquid does not (they use their own bridge). For mppsol and soltempo, CCIP is the **operational reality**, not a theoretical alternative.

> 🛑 **Predict before scrolling.** CCIP has a "Risk Management Network" with the power to **block** messages. **Why?** What kind of attack does this defend against that pure cryptography can't?

## 1. CCIP's architecture in 60 seconds

\`\`\`mermaid
flowchart LR
    Source["Source chain<br/>(Ethereum)"] -->|user tx| Router["CCIP Router"]
    Router -->|emit| OnRamp["OnRamp contract"]
    OnRamp -->|message| DON["Decentralized Oracle Network<br/>(commit + execute)"]
    DON -->|verify + relay| OffRamp["OffRamp contract"]
    OffRamp -->|deliver| Dest["Destination chain<br/>(Tempo)"]
    RMN["Risk Management<br/>Network"] -.->|cursing| DON
\`\`\`

Two networks of nodes operate the protocol:

| Network | Role | Trust model |
| :--- | :--- | :--- |
| **Committing DON** | Aggregate source-chain events into Merkle commitments | M-of-N PoS validators |
| **Executing DON** | Execute messages on destination chain | Same/different N-of-M |
| **Risk Management Network** | Veto malicious or sanctioned messages | Separate validator set, off-chain monitoring |

So CCIP is **technically a multisig** — but a multisig built specifically for cross-chain messaging, with:
- Larger validator sets than typical multisig
- Separate "cursing" / freeze authority (RMN) for emergency
- Token-pool architecture for asset bridges
- Per-chain configurable risk parameters

> 🛑 **Anti-fluency.** "CCIP is trustless." **Wrong.** It's a multisig with sophisticated safeguards. State the actual trust assumption: who can collude to steal funds, and what stops them?

The committing DON + executing DON could collude to forge messages. The **RMN** is the backup — if the DON misbehaves, RMN can pause specific lanes. This adds a second layer of defense, but it's still trust-based, not cryptographically trustless.

## 2. The message format

A CCIP message contains:

\`\`\`solidity
struct Any2EVMMessage {
    bytes32 messageId;       // Unique ID
    uint64 sourceChainSelector;
    bytes sender;            // ABI-encoded sender on source
    bytes data;              // Arbitrary calldata
    EVMTokenAmount[] destTokenAmounts;  // Tokens to release on destination
}
\`\`\`

Two ways messages are used:

| Use case | What you send | Example |
| :--- | :--- | :--- |
| **Data only** | \`data\` (any calldata) | Generic cross-chain call |
| **Tokens** | \`destTokenAmounts\` | Asset transfer |
| **Programmable** | Both | Cross-chain swap, settle-and-call |

For soltempo, the use case is **tokens + data**: send USDC from Ethereum to Tempo, with metadata identifying the merchant settlement.

## 3. The token pool model

For assets, CCIP uses **token pools** instead of generic wrappers:

- A **pool contract** on each chain holds the asset
- On bridging, source pool locks the asset; destination pool releases
- For **burn-mint** model: source pool burns; destination pool mints

Tempo's USDC connection to Ethereum uses burn-mint via CCIP. The source-chain USDC is burned, the destination USDC is minted from a pool with same total supply.

This is **simpler and more secure than wrapped tokens** — there's no separate "USDC.e" representation, just the same USDC on different chains.

> 🔍 **Find in repo.** [\`smartcontractkit/ccip\`](https://github.com/smartcontractkit/ccip) — the CCIP contracts. Find \`TokenPool.sol\`. **What's the inheritance structure?** The contract has multiple variants for different token types.

## 4. The lane model

CCIP supports **lanes** — directional chain pairs. A lane Ethereum→Tempo is different from Tempo→Ethereum. Each lane has:

- Its own DON committee config
- Its own risk parameters (max throughput, fee)
- Its own token mappings

Lanes are **launched per chain pair**. CCIP currently supports 30+ chains, so ~900 lanes possible. Each lane has its own deployment cost.

For Tempo: lanes exist for Tempo↔Ethereum and Tempo↔Solana. Bidirectional, both with token + data support.

## 5. The fee model

CCIP charges fees in:

- **Native gas token** of source chain (ETH for Ethereum, etc.)
- **LINK** (Chainlink's token, ~20% discount)

The fee covers:
- Source-chain gas to emit message
- Destination-chain gas to execute message
- DON operating costs
- Risk premium

For soltempo: every settlement costs ~$0.50-$2 in CCIP fees (depending on chain pair). Acceptable for $100+ payments.

## 6. CCIP vs alternatives

Comparing for merchant-scale payments (Tempo's use case):

| Bridge | Trust model | Fees per msg | Latency | Why for Tempo? |
| :--- | :--- | :--- | :--- | :--- |
| **CCIP** | PoS DON + RMN | $0.50-$2 | ~10 min | Production-ready, Solana support |
| **LayerZero** | DVN model | $0.30-$1 | ~5 min | Solana support, more flexible |
| **Wormhole** | 19-of-N guardian multisig | $0.20-$1 | ~2 min | Cheapest, but multisig risk |
| **OP Standard** | Rollup consensus | ~$0.10 + L1 gas | 7 days | L2 only, not for Tempo |

CCIP wins for Tempo on **trust + regulatory** — Chainlink is the most established cross-chain infra, has insurance, has institutional integrations. For a payments rail with merchant relationships, this matters.

## 7. The integration pattern

For your contract (e.g., a soltempo settlement contract on Tempo) to receive CCIP messages:

\`\`\`solidity
// Inherit CCIPReceiver
contract SoltempoVault is CCIPReceiver {
    function _ccipReceive(Any2EVMMessage memory message) internal override {
        // Decode the sender (should be authorized soltempo source contract)
        address sourceContract = abi.decode(message.sender, (address));
        require(sourceContract == authorizedSource, "unauthorized");

        // Decode the payment metadata
        PaymentReceipt memory receipt = abi.decode(message.data, (PaymentReceipt));

        // Update merchant state with the received USDC
        _processSettlement(message.destTokenAmounts, receipt);
    }
}
\`\`\`

That's the application interface — inherit, override one function, validate the sender, process the message.

For Tempo↔Solana, the destination chain is non-EVM, so the receiver is in **Anchor (Rust)**:

\`\`\`rust
#[program]
mod soltempo_vault {
    use ccip_solana::CcipReceiver;

    pub fn ccip_receive(ctx: Context<CcipReceive>, message: Any2SVMMessage) -> Result<()> {
        // Verify sender
        require!(message.sender == authorized_source, ErrorCode::Unauthorized);

        // Process settlement
        process_settlement(ctx, message)
    }
}
\`\`\`

Same structure, different language. **This is the actual integration soltempo runs.**

## 8. The mppsol architecture

Recall (from the strategy docs): mppsol is a Reth/REVM↔Solana settlement layer. CCIP is the rail.

\`\`\`
Merchant payment ──[CCIP]── Solana DeFi ──[CCIP]── Tempo merchant balance
       ↑                       ↓                          ↑
  Ethereum USDC            Yield earned              Withdraw on demand
\`\`\`

The whole architecture is **CCIP-mediated cross-VM message passing**. Tempo's bridge layer for merchant ops = CCIP. No alternative was viable at scale.

> 🛑 **Predict.** A merchant settles $1M through soltempo via CCIP, with $0.50 fee. **Is the fee model viable?** What if 1000 merchants settle simultaneously — does CCIP scale?

For settlement-scale: $0.50 on $1M = 0.005% fee. Hugely viable. Throughput: CCIP supports ~10-100 msgs/sec per lane currently, so 1000 simultaneous settlements would queue. Acceptable for non-instant flows; problematic if merchants demand real-time UX.

## 9. Reading list

- [CCIP whitepaper](https://chain.link/whitepaper)
- [CCIP contracts](https://github.com/smartcontractkit/ccip)
- [CCIP developer docs](https://docs.chain.link/ccip) — integration guide

## 10. Practice

1. Browse the CCIP contracts repo
2. Find the \`Router.sol\` — the entry point for users
3. Trace a message from \`ccipSend\` on source to \`ccipReceive\` on destination
4. Identify the 3 trust boundaries (committing DON, executing DON, RMN)

> Final check: in one sentence, why is CCIP the **operational choice** for Tempo↔Solana even though it's not the most trust-minimized option? **If your answer doesn't reference "Solana support + regulatory comfort + production maturity," re-read §6.**`,
                },
                {
                  title: 'Wormhole and IBC — multi-chain message protocols',
                  slug: 'bridges-wormhole-ibc-en',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 14,
                  xpReward: 40,
                  content: `# Wormhole and IBC — multi-chain message protocols

Wormhole and IBC are the two production multi-chain message protocols beyond CCIP. They serve very different audiences. **Wormhole** is the "permissionless multisig bridge connecting everything" — fast, cheap, riskier. **IBC** is the "trust-minimized bridge for Cosmos chains" — slower, more secure, ecosystem-locked.

> 🛑 **Predict before scrolling.** Wormhole connects 30+ chains. IBC connects only Cosmos chains. **Why can't IBC just add Ethereum support and become the dominant bridge?**

## 1. Wormhole — the multisig that scales

[\`wormhole-foundation/wormhole\`](https://github.com/wormhole-foundation/wormhole) is a guardian-based bridge. Architecture:

- **19 Guardian nodes**, each running validators
- Guardians observe source-chain events
- Each guardian signs an attestation: "I saw event X on chain Y"
- **13-of-19** guardian signatures → message is valid
- Destination chain verifies the signature aggregate

Wormhole supports 30+ chains including Solana, Ethereum, Sui, Aptos, Bitcoin (via wrapping). **The 13-of-19 multisig is the single trust assumption.**

### 1.1 Wormhole's attack history

In 2022, Wormhole was exploited for **$325M**. The bug was **not** key compromise — it was a signature verification bug in the Solana contract. An attacker forged a guardian signature by exploiting a missing check.

**Takeaway**: multisig bridges fail at the **verification logic** as often as at the keys. The number of guardians doesn't matter if the contract that checks them has a bug.

> 🛑 **Anti-fluency.** Wormhole has 19 guardians. **What's f?** And why is "more guardians = more secure" the wrong way to think about multisig?

f = ⌊(19-1)/3⌋ = 6 Byzantine tolerance. But the real failure mode isn't Byzantine collusion — it's **operational compromise** (keys stolen) or **verification bugs** (Wormhole 2022). Adding more guardians doesn't help if your contract has a bug.

### 1.2 Wormhole for Tempo

Could Tempo use Wormhole? Yes, technically. But:
- Wormhole's risk profile (multisig + history) is less acceptable for **regulated payments**
- CCIP has better Solana support
- Wormhole's developer focus has been on Solana-Ethereum, less on emerging L1s

For Tempo merchant settlement: CCIP is preferred. Wormhole could be a fallback if CCIP becomes unavailable, but not the primary.

## 2. IBC — the gold standard for Cosmos

[\`cosmos/ibc-go\`](https://github.com/cosmos/ibc-go) is the Inter-Blockchain Communication protocol. It powers all bridges between Cosmos chains (Osmosis, Juno, etc.).

### 2.1 How IBC works

\`\`\`mermaid
flowchart LR
    A["Cosmos Hub<br/>(source)"] -->|1. Send packet| AClient["IBC client<br/>on source"]
    AClient -->|2. Commit + sign| Relayer["IBC Relayer<br/>(off-chain)"]
    Relayer -->|3. Relay headers + proofs| BClient["IBC client<br/>on destination"]
    BClient -->|4. Verify against header| B["Osmosis<br/>(destination)"]
\`\`\`

Each chain runs a **light client of the other chain**. The relayer (anyone — permissionless) submits:
- Source chain headers (verified against destination's light client)
- Proofs of source-chain state changes (verified against the verified headers)

If the proof is valid, the destination chain executes the cross-chain action. **Pure cryptography**, no multisig.

### 2.2 Why IBC is restricted to Cosmos

To run an IBC light client of chain X on chain Y, **chain Y needs to verify chain X's consensus rules**. For Cosmos chains, all use Tendermint, so the same light client code works.

For Ethereum, you'd need a Solidity contract implementing Tendermint verification — expensive and complex. For Solana, you'd need an Anchor program for the same. **Cross-ecosystem IBC is theoretically possible but practically rare** because of the implementation cost.

There's progress: [Polymer](https://www.polymerlabs.org/) is building an IBC hub that connects Cosmos to Ethereum via a rollup. **For Tempo (a Reth-based EVM chain), IBC is not the natural choice** — it would require building a Tempo light client in CosmWasm + Tendermint light client on Tempo (Solidity). Possible but high cost for marginal benefit.

## 3. Wormhole + IBC + CCIP: when each wins

| Use case | Best choice | Why |
| :--- | :--- | :--- |
| Solana ↔ Ethereum | CCIP or Wormhole | Both have mature Solana support |
| Cosmos chains (e.g., Osmosis ↔ Juno) | IBC | Trustless, no other choice |
| EVM L1 ↔ EVM L1 (e.g., Tempo ↔ Polygon) | CCIP, LayerZero | Both general EVM-EVM |
| L2 ↔ L1 (within OP Stack) | OP Standard Bridge | Trustless |
| Bitcoin ↔ EVM | Wormhole (via wrapping) | Few alternatives |
| Permissionless arbitrary chains | Wormhole | Most ecosystem reach |

**For Tempo's needs (merchant settlement)**: CCIP is the answer. For ecosystem expansion (e.g., connecting to Cosmos chains in future), Polymer or similar adapters could bridge Tempo↔IBC.

## 4. The trust spectrum revisited

From Lesson 1, the trust spectrum:

\`\`\`
[Multisig] → [Optimistic] → [PoS bridge] → [Light client] → [ZK light client]
\`\`\`

Where each protocol sits:

| Protocol | Position |
| :--- | :--- |
| Wormhole | Multisig (13-of-19) |
| CCIP | PoS bridge (DON + RMN) |
| OP Standard | Optimistic + rollup consensus |
| IBC | Light client (Tendermint) |
| Future ZK light clients | ZK light client |

**As trust models improve, complexity and cost increase**. IBC requires running a full light client of the source chain on the destination. ZK light clients require proving consensus inside zkVMs.

## 5. For your projects

### mppsol (Reth/REVM ↔ Solana)

- Today: **CCIP** primary, Wormhole as alternate
- Future: **ZK light client** when EVM↔non-EVM zk infrastructure matures

### soltempo (merchant settlement via Tempo→Solana)

- Today: **CCIP exclusively**
- Reason: CCIP has on-chain risk management (RMN can pause), regulatory comfort

### Telos (Tempo↔HL intent matching)

- Tempo↔HL bridge doesn't exist publicly yet
- Likely either: HyperLiquid bridge (custom multisig) or future shared sequencer / ZK proof
- This is **the bridge gap** — neither Wormhole, CCIP, nor IBC currently spans Tempo↔HL with full feature set

## 6. Reading list

- [Wormhole core](https://github.com/wormhole-foundation/wormhole) — multisig bridge
- [Wormhole attack post-mortem](https://web3isgoinggreat.com/?id=wormhole-bridge) — 2022 hack details
- [IBC specification](https://github.com/cosmos/ibc) — the formal IBC spec
- [Polymer](https://github.com/polymerdao) — IBC-on-EVM rollup hub

## 7. Practice

1. Browse Wormhole's Solana program — find the signature aggregation logic
2. Browse \`ibc-go\` — find the light client interface
3. Compare: how many lines of code is "verify a cross-chain message" in each system?

> Final check: in one sentence, why are Wormhole and IBC **complementary** rather than competing? **If your answer doesn't reference "different ecosystems with different trust appetites," re-read §3.**`,
                },
              ],
            },
          },
          {
            title: 'Building a Bridge',
            sortOrder: 2,
            lessons: {
              create: [
                {
                  title: 'Building a minimal bridge on Reth — light-client-verified messaging',
                  slug: 'bridges-build-minimal-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 22,
                  xpReward: 55,
                  content: `# Building a minimal bridge on Reth — light-client-verified messaging

You've read the theory. You've seen the production code. Now you build **the smallest viable trust-minimized bridge**: an Ethereum→Tempo bridge where Tempo runs an Ethereum light client and verifies inclusion proofs of source events.

> 🛑 **Predict before scrolling.** Your bridge has 3 components: a contract on Ethereum, a relayer, and a contract on Tempo. **What does each one do, and what does each one trust?**

## 1. The architecture

\`\`\`mermaid
flowchart LR
    User["User on Ethereum"] -->|1. lock USDC + emit event| L1Contract["L1 Bridge Contract"]
    L1Contract -->|2. observe event| Relayer["Relayer<br/>(off-chain, anyone)"]
    Relayer -->|3. submit proof| L2Contract["Tempo Bridge Contract"]
    L2Contract -->|4. verify against Ethereum light client| LightClient["Ethereum Light Client<br/>on Tempo"]
    LightClient -->|valid| L2Contract
    L2Contract -->|5. mint wrapped USDC| User2["User on Tempo"]
\`\`\`

Each component:

| Component | Trust model | What it trusts |
| :--- | :--- | :--- |
| L1 Contract | Self | Nobody — it's the source of truth |
| Relayer | Permissionless | Anyone can be a relayer; no trust required |
| L2 Contract | Light client | Trusts only Ethereum's consensus via its light client |
| Light client | Ethereum consensus | Trusts only the sync committee signatures |

**The full system is trustless** — you trust Ethereum's PoS to be honest, nothing else.

## 2. The L1 contract

The L1 contract is the simplest part — just emit events:

\`\`\`solidity
contract EthereumBridge {
    mapping(address => mapping(address => uint256)) public locked;

    event Locked(
        address indexed user,
        address indexed token,
        uint256 amount,
        bytes32 indexed destChainId
    );

    function lock(address token, uint256 amount, bytes32 destChainId) external {
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        locked[msg.sender][token] += amount;
        emit Locked(msg.sender, token, amount, destChainId);
    }
}
\`\`\`

That's it. **No relayer needed; the event is on-chain**. Anyone can observe the event and try to claim on Tempo with a proof.

## 3. The relayer

The relayer's job:

1. Watch for \`Locked\` events on Ethereum
2. Generate an inclusion proof: "this event was in block N, here's the Merkle path"
3. Submit the proof to Tempo's bridge contract

Relayer in Rust:

\`\`\`rust
use alloy_provider::{Provider, ProviderBuilder};
use alloy_primitives::Address;

#[tokio::main]
async fn main() -> eyre::Result<()> {
    let l1_provider = ProviderBuilder::new()
        .on_http("https://ethereum-rpc.url".parse()?);
    let l2_provider = ProviderBuilder::new()
        .on_http("https://tempo-rpc.url".parse()?);

    // Get latest finalized block on L1
    let block = l1_provider
        .get_block(BlockId::finalized())
        .full()
        .await?
        .expect("no finalized block");

    // Find Locked events in recent blocks
    let logs = l1_provider
        .get_logs(&Filter::new()
            .from_block(block.header.number - 100)
            .address(L1_BRIDGE)
            .event("Locked(address,address,uint256,bytes32)"))
        .await?;

    for log in logs {
        // Build inclusion proof
        let proof = build_inclusion_proof(&log, &block).await?;

        // Submit to L2
        let tx = l2_provider
            .send_transaction(TransactionRequest::default()
                .with_to(L2_BRIDGE)
                .with_input(encode_claim_call(&log, &proof)))
            .await?;

        let receipt = tx.get_receipt().await?;
        println!("Submitted claim for {:?}, tx: {:?}",
            log.transaction_hash,
            receipt.transaction_hash);
    }

    Ok(())
}
\`\`\`

The relayer is **stateless** — anyone can run it. It just observes Ethereum and submits proofs. If it goes down, others take over.

## 4. The light client on Tempo

The bridge contract on Tempo needs to verify "this event happened on Ethereum block N." For that, it needs to know **what's the latest verified Ethereum block on Tempo**.

The light client contract maintains:

\`\`\`solidity
contract EthereumLightClient {
    struct Header {
        bytes32 blockRoot;
        uint64 slot;
        bytes32 stateRoot;
        bytes32 receiptsRoot;
    }

    mapping(uint64 => Header) public headers;
    bytes32 public currentSyncCommitteeHash;

    function updateSyncCommittee(
        SyncCommitteeUpdate calldata update
    ) external {
        // Verify the update was signed by 2/3+ of the current committee
        verifyCommitteeSignature(update);
        // Update current committee for the next period
        currentSyncCommitteeHash = computeCommitteeHash(update.newCommittee);
    }

    function addHeader(
        Header calldata header,
        bytes calldata signatures
    ) external {
        // Verify the header was signed by 2/3+ of the current committee
        verifyHeaderSignature(header, signatures, currentSyncCommitteeHash);
        headers[header.slot] = header;
    }

    function verifyInclusion(
        uint64 slot,
        bytes32 leaf,
        bytes calldata proof
    ) external view returns (bool) {
        return MerkleProof.verify(headers[slot].receiptsRoot, leaf, proof);
    }
}
\`\`\`

Now the bridge contract on Tempo uses this:

\`\`\`solidity
contract TempoBridge {
    EthereumLightClient public lightClient;

    function claim(
        uint64 slot,
        bytes32 eventHash,
        bytes calldata merkleProof,
        address user,
        address token,
        uint256 amount
    ) external {
        // Verify the event was in Ethereum block N via light client
        require(
            lightClient.verifyInclusion(slot, eventHash, merkleProof),
            "invalid proof"
        );
        // Mint wrapped USDC on Tempo
        IERC20(wrappedToken[token]).mint(user, amount);
    }
}
\`\`\`

That's the entire bridge. **3 contracts**, **1 relayer service**, and **trust only in Ethereum's consensus**.

## 5. The cost breakdown

Per bridge transaction:

| Operation | Cost on chain | When? |
| :--- | :--- | :--- |
| L1 \`lock\` | ~80k gas (~$2) | Per user tx |
| Light client \`updateSyncCommittee\` | ~50k gas (~$1.50) | Per 27 hours (1 sync committee period) |
| Light client \`addHeader\` | ~20k gas (~$0.60) | Per Ethereum block (~12s) |
| L2 \`claim\` | ~150k gas (~$4.50) | Per user tx |

The light client updates run continuously (anyone can pay to update; market keeps it running). **User-facing cost**: ~$6-7 per bridge tx, depending on gas.

For ZK light client variant, replace \`addHeader\` with one constant-cost proof verification per epoch, dropping total cost ~10x.

## 6. The full system you've built

\`\`\`
Source (Ethereum)                 Destination (Tempo)
─────────────────                 ─────────────────────
EthereumBridge.sol                EthereumLightClient.sol
   ↓ Locked event                    ↑ updateSyncCommittee
   ↓                                 ↑ addHeader
Relayer (off-chain)  ──────►       TempoBridge.sol
                                    ↑ claim (uses light client)
                                    ↓ mint wrapped USDC
\`\`\`

**Trust assumption**: Ethereum's PoS works. Nothing else.

This is what **OP Standard Bridge does without the optimistic delay**, what **ZK rollups will do once they're production**, what **Espresso and similar shared sequencers do today**.

## 7. The hard parts (in detail)

This sketch glosses over some real complexity:

### 7.1 Light client trusted setup

The Tempo light client needs an initial trusted checkpoint. How? Two options:

- **Trust the Tempo team** on launch (acceptable for launch)
- **DAO governance** updates the initial checkpoint (used by IBC for new clients)

Both are reasonable for production. The trust assumption is **only at setup**, not ongoing.

### 7.2 Replay protection

Each claim must reference a unique source event. If you bridge the same USDC twice with the same event hash, the L2 contract should reject.

Standard pattern: track claimed event hashes in a mapping:

\`\`\`solidity
mapping(bytes32 => bool) public claimed;
require(!claimed[eventHash], "already claimed");
claimed[eventHash] = true;
\`\`\`

### 7.3 Withdrawal direction (Tempo → Ethereum)

The system above is **deposit-only**. Withdrawal needs the inverse:
- Tempo bridge emits Withdrawn event
- Tempo light client on Ethereum (the hard one)
- L1 bridge accepts proofs against the Tempo light client

For Tempo (Reth-based BFT), the light client on Ethereum is **much simpler than Ethereum's** — bounded validator set, BFT signatures. ~30 validators with BLS aggregation = ~5k gas per header.

## 8. Practice

1. Sketch the EthereumLightClient contract more completely
2. Estimate: at 12s block times, how often does the L1→Tempo light client need to be updated?
3. What if a relayer submits an invalid proof? What does the bridge do?
4. How does the system handle Ethereum reorgs (finality before/after)?

## 9. Reading list

- [Helios source](https://github.com/a16z/helios) — Rust Ethereum light client (reference for the relayer)
- [LayerZero V2](https://docs.layerzero.network) — modular bridge architecture
- [Espresso shared sequencer](https://docs.espressosys.com/sequencer) — production shared bridge

> Final check: in one sentence, what's the **single trust assumption** of a light-client-verified bridge, and what makes it the **gold standard**? **If your answer doesn't reference "the source chain's consensus + nothing else," re-read §1.**`,
                },
                {
                  title: 'Final quiz: cross-chain bridges',
                  slug: 'bridges-final-quiz-en',
                  type: 'QUIZ',
                  sortOrder: 1,
                  duration: 12,
                  xpReward: 50,
                  content: `# Final quiz: cross-chain bridges

The cross-chain final check. You'll need this to architect any bridge that touches Tempo, Hyperliquid, or any Reth-based L1.`,
                  quizQuestions: [
                    {
                      question: 'Why are **3 of 5 top historical bridge hacks** key/operational compromises rather than smart contract bugs?',
                      options: [
                        'Smart contracts are formally verified, so bugs are rare.',
                        'Multisig bridges rely on key holders for security; once a sufficient subset of keys is compromised (phishing, malware, insider), the contract\'s code is irrelevant because the signatures verify correctly. Operational security is the weakest link.',
                        'Hackers prefer easier targets like exchanges.',
                        'Smart contract hacks are not categorized as bridge hacks.',
                      ],
                      correctIndex: 1,
                      explanation: 'Ronin ($625M), Orbit ($80M), Poly Network ($611M returned) — all key compromises. The bridge\'s code did exactly what it was supposed to do: verify signatures. The attack succeeded because the keys themselves were stolen. This is why multisig is a fundamental risk model, not just a feature choice.',
                    },
                    {
                      question: "What's the **bridge trilemma**, and which two corners does Chainlink CCIP pick?",
                      options: [
                        'Speed, cost, security. CCIP picks speed and security.',
                        'Trustlessness, generality, extensibility. You can have any two but not all three. CCIP picks **general** (many chains) + **extensible** (easy to add chains) but sacrifices **trustless** — it relies on a PoS DON + RMN, not pure cryptography.',
                        'Latency, throughput, cost. CCIP picks throughput and cost.',
                        'L1, L2, sidechain. CCIP supports L1 and L2.',
                      ],
                      correctIndex: 1,
                      explanation: 'The trilemma is the architectural constraint: trustless + general + extensible — pick 2. CCIP is general + extensible (multi-chain, easy to add). IBC is trustless + general (Cosmos chains). OP Standard is trustless + extensible (only OP Stack). No system gets all three.',
                    },
                    {
                      question: 'In the OP Standard Bridge, why does **withdrawal take 7 days** while **deposit takes 2 minutes**?',
                      options: [
                        'L2 is slower than L1.',
                        'Deposits are forced inclusions (rollup consensus enforces L2 must process them); withdrawals require a **7-day challenge period** so anyone can submit fraud proofs if the sequencer lies about L2 state. The asymmetry comes from the optimistic security model.',
                        'Engineers chose arbitrary numbers.',
                        'It costs more gas to withdraw than deposit.',
                      ],
                      correctIndex: 1,
                      explanation: 'Deposits: L1 events MUST be processed by the rollup (built into the protocol). Withdrawals: depend on L2 state being honest, which requires waiting for the challenge period. The 7 days is the time needed to detect and submit fraud proofs against a malicious sequencer.',
                    },
                    {
                      question: 'Why is a **light client of chain X on chain Y** considered **trust-minimized** while a **13-of-19 multisig** is not?',
                      options: [
                        'Light clients have more validators than multisigs.',
                        'A light client verifies chain X\'s consensus rules directly — to fool it, you must fool chain X itself. A multisig requires only compromising the keys; you don\'t need to corrupt the source chain. The light client\'s trust assumption equals the source chain\'s security; the multisig\'s trust assumption is much weaker.',
                        'Multisigs are illegal in some jurisdictions.',
                        'Light clients are written in Rust, multisigs in Solidity.',
                      ],
                      correctIndex: 1,
                      explanation: 'Trust minimization is about *what you have to compromise* to attack the bridge. Light client: must break source chain consensus ($billions of stake at risk). Multisig: must compromise ~13 keys (much cheaper, social engineering possible). Bridge security = trust requirement, not validator count.',
                    },
                    {
                      question: 'Tempo uses **Chainlink CCIP** for its merchant settlement layer. **Why CCIP over Wormhole, IBC, or OP Standard?**',
                      options: [
                        'CCIP is the cheapest option.',
                        'CCIP has: (1) production Solana support (Tempo needs ETH ↔ Tempo ↔ Solana flows); (2) Risk Management Network for pause/veto authority; (3) institutional/regulatory comfort from Chainlink\'s established position. Wormhole has multisig risk and Tempo handles regulated payments. IBC doesn\'t span EVM↔Solana. OP Standard only works inside OP Stack.',
                        'CCIP is required by Solana for compatibility.',
                        'CCIP is the only EVM-compatible bridge.',
                      ],
                      correctIndex: 1,
                      explanation: 'For a payments rail handling regulated merchant flows, CCIP\'s positioning matters more than absolute fees. RMN gives Tempo a safety brake (can pause bad messages). Chainlink\'s institutional adoption simplifies compliance conversations. The trust model isn\'t "best" but is "good enough for production payments" — which Wormhole isn\'t for regulated flows.',
                    },
                    {
                      question: 'A light-client-verified bridge requires the destination chain to **verify the source chain\'s consensus rules**. **Why is this expensive for Cosmos\'s IBC but cheap for OP Standard Bridge?**',
                      options: [
                        'OP Standard uses ZK proofs.',
                        "Cosmos IBC verifies the source chain's Tendermint consensus (full BFT signature verification, ~5000 gas per header). OP Standard Bridge uses optimistic security: the destination chain just waits 7 days for fraud proofs to be submitted on-chain, then trusts the state root. Different security models = different verification costs.",
                        'OP Standard is cheaper because it\'s a layer-2.',
                        'IBC requires custom hardware while OP Standard runs on commodity nodes.',
                      ],
                      correctIndex: 1,
                      explanation: "IBC is genuine light client verification — expensive but trustless. OP Standard is optimistic — cheap because verification is deferred (fraud proofs on demand), with a 7-day window as the trust replacement. Both are trust-minimized but in different ways.",
                    },
                    {
                      question: 'Building a minimal trust-minimized bridge requires 3 components: L1 contract, relayer, and L2 contract. **What does the relayer trust, and why is this important?**',
                      options: [
                        'The relayer trusts the L1 and L2 sequencers.',
                        'The relayer is **permissionless and trusts nothing**. Anyone can run a relayer. It observes L1 events, builds Merkle proofs, submits them to L2. If the L2 contract\'s light client verifies the proof, the action executes. The relayer\'s honesty doesn\'t matter — only the cryptographic proof matters.',
                        'The relayer trusts the user, requires KYC.',
                        'The relayer is operated by Chainlink and trusts their oracle network.',
                      ],
                      correctIndex: 1,
                      explanation: 'Relayer permissionlessness is the entire point. The bridge doesn\'t depend on any particular relayer being honest — only on at least one relayer existing. This is censorship-resistant; if all CCIP nodes go offline, anyone can step in to relay.',
                    },
                    {
                      question: 'For **Tempo↔Solana** in soltempo, **why does ZK light client not work today** even though it\'s the trust-minimized endgame?',
                      options: [
                        'Solana doesn\'t support smart contracts.',
                        'EVM↔non-EVM ZK light clients require proving the source chain\'s consensus (Solana\'s Tower BFT) inside a zkVM, then verifying on Solana. The cryptography is unique enough that mature production implementations don\'t exist yet (as of 2026). CCIP fills the gap with its DON+RMN multisig model.',
                        'Solana doesn\'t allow cross-chain bridges.',
                        'ZK proofs are too expensive to produce.',
                      ],
                      correctIndex: 1,
                      explanation: 'EVM↔EVM ZK light clients exist (e.g., for Polyhedra, SP1). EVM↔non-EVM is harder because the source chain\'s consensus structure must be efficient inside a zkVM, AND the destination chain must have ZK proof verification. Solana adds non-EVM cryptography. Mature production cases are emerging in 2026 but not yet table-stakes.',
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
    },
  });
}
